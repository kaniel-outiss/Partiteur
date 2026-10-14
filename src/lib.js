/* ═══════════ 📚 BIBLIOTHÈQUE · 🎤 MA VOIX · 🎭 PROGRAMMES & CONCERT ═══════════ */
'use strict';
/* — stockage des partitions importées (IndexedDB, secours localStorage) — */
const IDB={db:null,open:function(){return new Promise(function(ok,ko){try{const r=indexedDB.open('partiteur',1);r.onupgradeneeded=function(){r.result.createObjectStore('works',{keyPath:'id'});};r.onsuccess=function(){IDB.db=r.result;ok();};r.onerror=function(){ko(r.error);};}catch(e){ko(e);}});},
  all:function(){return new Promise(function(ok){if(!IDB.db)return ok(LS.get('works',[]));const q=IDB.db.transaction('works').objectStore('works').getAll();q.onsuccess=function(){ok(q.result||[]);};q.onerror=function(){ok([]);};});},
  put:function(W){return new Promise(function(ok){const c=JSON.parse(JSON.stringify(W,function(k,v){return k.charAt(0)==='_'?undefined:v;}));if(!IDB.db){const a=LS.get('works',[]).filter(function(x){return x.id!==W.id;});a.push(c);LS.set('works',a);return ok();}
    const t=IDB.db.transaction('works','readwrite');t.objectStore('works').put(c);t.oncomplete=ok;t.onerror=ok;});},
  del:function(id){return new Promise(function(ok){if(!IDB.db){LS.set('works',LS.get('works',[]).filter(function(x){return x.id!==id;}));return ok();}const t=IDB.db.transaction('works','readwrite');t.objectStore('works').delete(id);t.oncomplete=ok;t.onerror=ok;});}};
function libLoad(){return IDB.open().catch(function(){}).then(IDB.all).then(function(a){a.forEach(function(W){if(!WORKS.some(function(x){return x.id===W.id;}))WORKS.push(W);});});}

/* — ma voix — zones confortables (hauteur réelle) — */
const VPRE=[['S','Soprano',60,81],['Mz','Mezzo',57,77],['A','Alto',53,74],['T','Ténor',48,69],['Bar','Baryton',45,65],['B','Basse',41,62]];
function myVoice(){return LS.get('voice',null);}
function pName(m){return SH[(m%12+12)%12].replace('#','♯')+(Math.floor(m/12)-1);}
function vName(v){const p=VPRE.filter(function(x){return x[0]===v.vt;})[0];return p?p[1]:'Ma voix';}
/* — analyse d'une partie : ambitus, tessiture, meilleure transposition — */
function partNotes(W,P){const M=W._M||(W._M=build(W));const out=[];M.forEach(function(m,i){(m.parts[P.id]||[]).forEach(function(V){V.forEach(function(e,j){if(e.rest||e.grace||!e.notes.length)return;
  const prev=j>0?V[j-1]:null;if(prev&&prev.tie&&!prev.rest)return;out.push({m:e.notes[e.notes.length-1].midi+(P.oct||0),d:Math.max(.25,e.d),i:i});});});});return out;}
function costAt(N,t,lo,hi){let c=0,tot=0,mean=0;N.forEach(function(n){const s=n.m+t;c+=n.d*Math.max(0,lo-s,s-hi)*4;tot+=n.d;mean+=n.d*s;});return c+(tot?Math.abs(mean/tot-(lo+hi)/2)*.15*tot:0)+Math.abs(t)*.01;}
function outAt(N,t,lo,hi){const o=N.filter(function(n){return n.m+t<lo||n.m+t>hi;});const ms=[];o.forEach(function(n){if(ms.indexOf(n.i+1)<0)ms.push(n.i+1);});return {n:o.length,ms:ms,hi:o.filter(function(n){return n.m+t>hi;}).length};}
function anOf(W){const v=myVoice();const VP=W.parts.filter(function(P){return P.kind==='voice';});if(!v||!VP.length)return null;
  const key=v.vt+v.lo+v.hi+'|'+(LS.get('sing:'+W.id,null)||'');if(W._an&&W._ank===key)return W._an;
  const sing=LS.get('sing:'+W.id,null);let cand=VP.filter(function(P){return P.id===sing;});if(!cand.length)cand=VP.filter(function(P){return P.vt&&P.vt===v.vt;});if(!cand.length)cand=VP;
  let best=null;cand.forEach(function(P){const N=partNotes(W,P);if(!N.length)return;let bt=0,bo=0,bc=1e18;[0,-12,12].forEach(function(o){for(let t=-7;t<=7;t++){const c=costAt(N,t+o,v.lo,v.hi)+(o?.5:0);if(c<bc-1e-9){bc=c;bt=t;bo=o;}}});if(!best||bc<best.c)best={P:P,N:N,c:bc,t:bt,o:bo};});
  if(!best)return null;const N=best.N;let lo=999,hi=-999;N.forEach(function(n){lo=Math.min(lo,n.m);hi=Math.max(hi,n.m);});
  const srt=N.slice().sort(function(a,b){return a.m-b.m;}),tot=N.reduce(function(a,n){return a+n.d;},0);let acc=0,tlo=null,thi=null;srt.forEach(function(n){acc+=n.d;if(tlo==null&&acc>=tot*.1)tlo=n.m;if(thi==null&&acc>=tot*.9)thi=n.m;});
  const r={pid:best.P.id,pname:best.P.name,lo:lo,hi:hi,tlo:tlo,thi:thi,best:best.t,oct:best.o,N:N,v:v};W._an=r;W._ank=key;return r;}
function anBadge(an,t){if(!an)return null;const O=an.oct||0,o=outAt(an.N,t+O,an.v.lo,an.v.hi),ob=outAt(an.N,an.best+O,an.v.lo,an.v.hi);const oc=O<0?' · une octave plus bas':(O>0?' · une octave plus haut':'');
  if(!o.n)return {cls:'ok',txt:'✅ confortable'+(t?' (en '+(t>0?'+':'')+t+')':'')+oc};
  if(!ob.n)return {cls:'tr',txt:'↕ confortable en '+(an.best>0?'+':'')+an.best+oc,best:an.best};
  return {cls:'ko',txt:'⚠ '+o.n+' note'+(o.n>1?'s':'')+' hors zone'+oc+(an.best!==t?' · mieux en '+(an.best>0?'+':'')+an.best:''),best:an.best!==t?an.best:null,ms:o.ms};}
function isOut(P,midi){const an=ST.an;if(!an||P.id!==an.pid)return false;const s=midi+(P.oct||0)+ST.tr+(an.oct||0);return s<an.v.lo||s>an.v.hi;}
function lyPart(){const W=ST.W;if(!W)return null;const VP=W.parts.filter(function(P){return P.kind==='voice';});
  return VP.filter(function(P){return P.id===ST.sing;})[0]||(ST.an&&VP.filter(function(P){return P.id===ST.an.pid;})[0])||VP[0]||null;}

/* — écran d'accueil — */
const STYLES=['Air d’opéra','Oratorio','Messe','Motet','Cantique','Negro spiritual','Lied','Mélodie','Chœur','Autre'];
const PERIODS=['Renaissance','Baroque','Classique','Romantique','Post-romantique','XXᵉ siècle','Traditionnel'];
function wkCard(W){const an=anOf(W),b=anBadge(an,LS.get('tr:'+W.id,0));
  return '<div class="wk" data-w="'+W.id+'"><b>'+esc(W.title)+'</b><span>'+esc(W.composer||'?')+(W.work?' — '+esc(W.work):'')+'</span>'
    +'<small>'+[W.style,W.period,W.voice].filter(Boolean).map(esc).join(' · ')+' · '+W.measures.length+' mes.'+(prefTxt(W.id)?' · <b class="pref">'+prefTxt(W.id)+'</b>':'')+'</small>'
    +(an?'<div class="amb">'+esc(an.pname)+' : '+pName(an.lo)+'–'+pName(an.hi)+' <i>(tessiture '+pName(an.tlo)+'–'+pName(an.thi)+')</i> <em class="vb '+b.cls+'">'+b.txt+'</em></div>':'')
    +(W.imported?'<button class="wdel" data-del="'+W.id+'" title="Supprimer">🗑</button>':'')+'</div>';}
library=function(){const v=myVoice();
  $('#vme').innerHTML=v?'🎤 '+vName(v)+' · '+pName(v.lo)+'–'+pName(v.hi):'🎤 Ma voix';
  $('#lib').innerHTML=WORKS.map(wkCard).join('')+'<div class="wk soon"><b>📥 Ajouter une partition</b><span>Fichier MusicXML (.musicxml, .mxl) — exporté de MuseScore, ou téléchargé sur CPDL / IMSLP.</span></div>';
  progList();};
document.addEventListener('click',function(e){const d=e.target.closest('[data-del]');if(d){e.stopPropagation();const W=WORKS.filter(function(x){return x.id===d.dataset.del;})[0];
    if(W&&confirm('Supprimer « '+W.title+' » ?')){IDB.del(W.id).then(function(){WORKS.splice(WORKS.indexOf(W),1);library();});}return;}
  const w=e.target.closest('#lib [data-w]');if(w){open(w.dataset.w);return;}
  if(e.target.closest('#lib .soon'))$('#fimp').click();},true);

/* — ma voix (fenêtre) — */
function voiceDlg(){const v=myVoice()||{vt:'B',lo:41,hi:62};let cur=JSON.parse(JSON.stringify(v));
  const draw=function(){dlg('<h2>🎤 Ma voix</h2><div class="hint">La zone où tu chantes à l’aise (hauteur réelle). Le partiteur s’en sert pour te dire si un air te va, et dans quelle tonalité.</div>'
    +'<div class="chips">'+VPRE.map(function(p){return '<button data-vp="'+p[0]+'" class="'+(cur.vt===p[0]?'on':'')+'">'+p[1]+'</button>';}).join('')+'</div>'
    +'<div class="rng"><span>grave</span><button data-vr="lo-">−</button><output>'+pName(cur.lo)+'</output><button data-vr="lo+">+</button><span>aigu</span><button data-vr="hi-">−</button><output>'+pName(cur.hi)+'</output><button data-vr="hi+">+</button></div>'
    +'<div class="row"><button id="vok" class="pri">Enregistrer</button><button data-close="1">Annuler</button></div>');
    $('#dlg').querySelectorAll('[data-vp]').forEach(function(b){b.onclick=function(){const p=VPRE.filter(function(x){return x[0]===b.dataset.vp;})[0];cur={vt:p[0],lo:p[2],hi:p[3]};draw();};});
    $('#dlg').querySelectorAll('[data-vr]').forEach(function(b){b.onclick=function(){const k=b.dataset.vr;if(k==='lo-')cur.lo--;if(k==='lo+')cur.lo=Math.min(cur.hi-5,cur.lo+1);if(k==='hi-')cur.hi=Math.max(cur.lo+5,cur.hi-1);if(k==='hi+')cur.hi++;draw();};});
    $('#vok').onclick=function(){LS.set('voice',cur);dlgClose();library();if(ST.W&&$('#app').style.display!=='none')render();toast('🎤 '+vName(cur)+' : '+pName(cur.lo)+' – '+pName(cur.hi));};};
  draw();}
function dlg(html){const d=$('#dlg');d.innerHTML='<div class="dbox">'+html+'</div>';d.classList.add('on');d.querySelectorAll('[data-close]').forEach(function(b){b.onclick=dlgClose;});}
function dlgClose(){$('#dlg').classList.remove('on');}

/* — import — */
async function importFile(f){try{toast('📥 Lecture de '+f.name+'…');const xml=await mxmlFromFile(f);const W=mxmlParse(xml,f.name);W._M=null;metaDlg(W,true);}
  catch(err){toast('⚠ Import impossible : '+(err.message||err));console.error(err);}}
function metaDlg(W,isNew){const opt=function(list,v){return '<option value=""></option>'+list.map(function(x){return '<option'+(x===v?' selected':'')+'>'+x+'</option>';}).join('');};
  dlg('<h2>'+(isNew?'📥 Nouvelle partition':'✏️ Fiche')+'</h2>'
    +'<label>Titre<input id="mTitle" value="'+esc(W.title)+'"></label><label>Compositeur<input id="mComp" value="'+esc(W.composer||'')+'"></label>'
    +'<label>Œuvre qui la contient<input id="mWork" placeholder="ex. Les Noces de Figaro, acte I" value="'+esc(W.work||'')+'"></label><label>Rôle<input id="mRole" value="'+esc(W.role||'')+'"></label>'
    +'<div class="two"><label>Style<select id="mStyle">'+opt(STYLES,W.style)+'</select></label><label>Période<select id="mPer">'+opt(PERIODS,W.period)+'</select></label></div>'
    +'<h3>Parties ('+W.measures.length+' mesures, tonalité '+keyName(W.ks)+')</h3>'
    +W.parts.map(function(P,i){return '<div class="pr"><input data-pn="'+i+'" value="'+esc(P.name)+'"><select data-pk="'+i+'"><option value="voice"'+(P.kind==='voice'?' selected':'')+'>🎤 voix</option><option value="piano"'+(P.kind!=='voice'?' selected':'')+'>🎹 instrument</option></select>'
      +'<select data-pv="'+i+'">'+'<option value=""></option>'+VPRE.map(function(p){return '<option value="'+p[0]+'"'+(P.vt===p[0]?' selected':'')+'>'+p[1]+'</option>';}).join('')+'</select></div>';}).join('')
    +'<div class="row"><button id="mok" class="pri">'+(isNew?'Ajouter à la bibliothèque':'Enregistrer')+'</button><button data-close="1">Annuler</button></div>');
  $('#mok').onclick=function(){W.title=$('#mTitle').value.trim()||W.title;W.composer=$('#mComp').value.trim();W.work=$('#mWork').value.trim();W.role=$('#mRole').value.trim();W.style=$('#mStyle').value;W.period=$('#mPer').value;
    W.parts.forEach(function(P,i){P.name=$('[data-pn="'+i+'"]').value.trim()||P.name;P.kind=$('[data-pk="'+i+'"]').value;P.vt=$('[data-pv="'+i+'"]').value;if(P.kind==='voice'&&!P.lyKey)P.lyKey='ly_'+P.id;});
    W.voice=W.parts.filter(function(P){return P.kind==='voice';}).map(function(P){return P.name;}).join(', ')||'instrumental';W._an=null;W._M=null;
    IDB.put(W).then(function(){if(WORKS.indexOf(W)<0)WORKS.push(W);dlgClose();library();toast('✅ « '+W.title+' » ajouté');});};}

/* — badge de voix dans la partition — */
const _render=render;render=function(){ST.an=anOf(ST.W);_render.apply(this,arguments);const el=$('#vbadge');if(!el)return;const an=ST.an,b=anBadge(an,ST.tr);
  if(!an){el.innerHTML=myVoice()?'':'<button data-vme="1">🎤 Indique ta voix</button>';return;}
  el.innerHTML='<span class="vb '+b.cls+'" title="'+esc(an.pname)+' : '+pName(an.lo)+'–'+pName(an.hi)+'">'+esc(vName(an.v))+' · '+b.txt+'</span>'+(b.best!=null&&b.best!==ST.tr?'<button data-adapt="'+b.best+'">Adapter</button>':'');};
document.addEventListener('click',function(e){const a=e.target.closest('[data-adapt]');if(a){ST.tr=+a.dataset.adapt;LS.set('tr:'+ST.W.id,ST.tr);render();toast('↕ Transposé en '+(ST.tr>0?'+':'')+ST.tr+' pour ta voix');}
  if(e.target.closest('[data-vme]'))voiceDlg();});

/* — 🎭 programmes — */
function progs(){return LS.get('progs',[]);}
/* ton et tempo d'une pièce dans un programme : ceux du programme s'ils ont été changés, sinon les préférés de l'œuvre */
function itTr(it){return it.tr!=null?it.tr:LS.get('tr:'+it.w,0);}function itTempo(it){return it.tempo!=null?it.tempo:LS.get('tempo:'+it.w,100);}
function prefTxt(id){const t=LS.get('tr:'+id,0),v=LS.get('tempo:'+id,100);return (t||v!==100)?'★ '+(t?(t>0?'+':'')+t+' ':'')+(v!==100?v+' %':''):'';}
function progSave(a){LS.set('progs',a);}
function wById(id){return WORKS.filter(function(x){return x.id===id;})[0];}
function progList(){const el=$('#progs');if(!el)return;const P=progs();
  el.innerHTML=P.map(function(p,pi){return '<div class="pg"><div><b>'+esc(p.name)+'</b><small>'+p.items.length+' pièce'+(p.items.length>1?'s':'')+' · '+p.items.map(function(it){const W=wById(it.w);return W?esc(W.title):'?';}).join(' · ')+'</small></div>'
    +'<button data-pc="'+pi+'" class="pri"'+(p.items.length?'':' disabled')+'>▶ Concert</button><button data-pe="'+pi+'">✏️</button></div>';}).join('')
    +'<button id="pnew">➕ Nouveau programme</button>';}
function progEdit(pi){const A=progs();const p=A[pi];
  const draw=function(){dlg('<h2>🎭 Programme</h2><label>Nom<input id="pName" value="'+esc(p.name)+'"></label>'
    +'<div class="pil">'+p.items.map(function(it,i){const W=wById(it.w);return '<div class="pit"><span class="pno">'+(i+1)+'</span><b>'+(W?esc(W.title):'?')+'</b>'
      +'<span class="ptr" title="Ton"><button data-it="tr-" data-i="'+i+'">−</button>'+(itTr(it)>0?'+':'')+itTr(it)+'<button data-it="tr+" data-i="'+i+'">+</button></span>'
      +'<span class="ptr" title="Tempo"><button data-it="tp-" data-i="'+i+'">−</button>'+itTempo(it)+'%<button data-it="tp+" data-i="'+i+'">+</button></span>'+((it.tr!=null||it.tempo!=null)?'<button data-it="pref" data-i="'+i+'" title="Revenir aux préférences de l’œuvre">★</button>':'')
      +'<button data-it="up" data-i="'+i+'">↑</button><button data-it="dn" data-i="'+i+'">↓</button><button data-it="x" data-i="'+i+'">✕</button></div>';}).join('')+'</div>'
    +'<label>Ajouter<select id="pAdd"><option value="">— choisir une pièce —</option>'+WORKS.map(function(W){return '<option value="'+W.id+'">'+esc(W.title)+' — '+esc(W.composer||'')+'</option>';}).join('')+'</select></label>'
    +'<div class="row"><button id="pok" class="pri">Enregistrer</button><button id="pdel">Supprimer le programme</button><button data-close="1">Fermer</button></div>');
    $('#pName').oninput=function(){p.name=this.value;};
    $('#pAdd').onchange=function(){if(this.value){p.items.push({w:this.value});draw();}};
    $('#dlg').querySelectorAll('[data-it]').forEach(function(b){b.onclick=function(){const i=+b.dataset.i,k=b.dataset.it,a=p.items;
      if(k==='tr-')a[i].tr=itTr(a[i])-1;if(k==='tr+')a[i].tr=itTr(a[i])+1;if(k==='tp-')a[i].tempo=Math.max(40,itTempo(a[i])-5);if(k==='tp+')a[i].tempo=Math.min(160,itTempo(a[i])+5);if(k==='pref'){delete a[i].tr;delete a[i].tempo;}if(k==='up'&&i>0){const t=a[i];a[i]=a[i-1];a[i-1]=t;}if(k==='dn'&&i<a.length-1){const t=a[i];a[i]=a[i+1];a[i+1]=t;}if(k==='x')a.splice(i,1);draw();};});
    $('#pok').onclick=function(){A[pi]=p;progSave(A);dlgClose();progList();};
    $('#pdel').onclick=function(){if(confirm('Supprimer « '+p.name+' » ?')){A.splice(pi,1);progSave(A);dlgClose();progList();}};};
  draw();}
document.addEventListener('click',function(e){
  if(e.target.closest('#pnew')){const A=progs();A.push({name:'Programme '+(A.length+1),items:[]});progSave(A);progEdit(A.length-1);return;}
  const pe=e.target.closest('[data-pe]');if(pe){progEdit(+pe.dataset.pe);return;}
  const pc=e.target.closest('[data-pc]');if(pc){concertStart(+pc.dataset.pc,0);return;}
  if(e.target.closest('#bProg')){const A=progs();if(!ST.W)return;
    dlg('<h2>➕ Ajouter « '+esc(ST.W.title)+' »</h2><div class="hint">Avec ton ton et ton tempo préférés pour cette œuvre ('+(ST.tr>0?'+':'')+ST.tr+' · '+ST.tempo+' %) — tu pourras les changer pour ce programme seulement.</div>'
      +A.map(function(p,i){return '<button class="pgb" data-pa="'+i+'">🎭 '+esc(p.name)+' <small>('+p.items.length+')</small></button>';}).join('')
      +'<button class="pgb" data-pa="new">➕ Nouveau programme</button><div class="row"><button data-close="1">Annuler</button></div>');
    $('#dlg').querySelectorAll('[data-pa]').forEach(function(b){b.onclick=function(){const A2=progs();let i=b.dataset.pa;if(i==='new'){A2.push({name:'Programme '+(A2.length+1),items:[]});i=A2.length-1;}else i=+i;
      A2[i].items.push({w:ST.W.id});progSave(A2);dlgClose();toast('🎭 Ajouté à « '+A2[i].name+' » ('+A2[i].items.length+'ᵉ pièce)');};});}
  if(e.target.closest('#vme'))voiceDlg();
  if(e.target.closest('#bMeta')&&ST.W){metaDlg(ST.W,false);}
});

/* — mode concert — */
let CONC=null;
function concertStart(pi,i){const p=progs()[pi];if(!p||!p.items[i])return;const it=p.items[i];if(!wById(it.w)){toast('Pièce introuvable');return;}
  CONC={pi:pi,i:i,p:p,pending:false};document.body.classList.add('concert');stop();open(it.w);ST.tr=itTr(it);ST.tempo=itTempo(it);render();seek(0);concBar();
  const ph=$('#scorew');if(ph)ph.scrollTop=0;}
function concBar(){const c=$('#conc');if(!CONC){c.innerHTML='';return;}const p=CONC.p,n=p.items[CONC.i+1],W=n&&wById(n.w);
  c.innerHTML='<b>🎭 '+esc(p.name)+'</b><span>'+(CONC.i+1)+' / '+p.items.length+'</span><button data-cg="-1"'+(CONC.i?'':' disabled')+'>⏮</button><button data-cg="1"'+(n?'':' disabled')+'>⏭</button>'
    +'<span class="nx">'+(W?'ensuite : '+esc(W.title):'dernière pièce')+'</span><button data-cg="x">✕ Quitter</button>';}
function concertEnd(){CONC=null;document.body.classList.remove('concert');$('#wait').classList.remove('on');concBar();}
function onPieceEnd(){if(!CONC)return;const n=CONC.p.items[CONC.i+1];const w=$('#wait');
  if(!n){w.textContent='👏 Fin du programme';w.classList.add('on');CONC.pending='end';return;}
  CONC.pending=true;w.textContent='▶ Suivant : '+(wById(n.w)||{}).title+' — touche quand tu es prêt';w.classList.add('on');}
document.addEventListener('click',function(e){
  const g=e.target.closest('[data-cg]');if(g){const k=g.dataset.cg;if(k==='x'){stop();concertEnd();return;}const j=CONC.i+ +k;$('#wait').classList.remove('on');concertStart(CONC.pi,j);return;}
  if(e.target.closest('#wait')&&CONC&&CONC.pending){e.stopPropagation();const w=$('#wait');w.classList.remove('on');w.textContent='𝄐 Point d’orgue — touche pour continuer';
    if(CONC.pending==='end'){concertEnd();return;}concertStart(CONC.pi,CONC.i+1);setTimeout(play,400);}},true);
const _back=function(){if(CONC)concertEnd();};
document.addEventListener('click',function(e){if(e.target.closest('#bBack')){_back();setTimeout(library,0);}},true);
window.addEventListener('DOMContentLoaded',function(){const f=$('#fimp');f.onchange=function(){if(f.files[0])importFile(f.files[0]);f.value='';};
  $('#bImp').onclick=function(){f.click();};});
