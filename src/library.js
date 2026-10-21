/* ═══════════ 📚 BIBLIOTHÈQUE · 🎤 MA VOIX · 📥 IMPORT · 🎭 PROGRAMMES & CONCERT ═══════════ */
'use strict';
/* la bibliothèque = les fichiers .fab du dossier (voir fab.js) ; l'appli n'embarque plus aucun chant */
async function libLoad(){try{await IDB.open();}catch(e){}
  try{await fabMigrate();}catch(e){console.error(e);}
  const r=await fabScan(function(n,t){toast('📚 Lecture de la bibliothèque… '+n+' / '+t,1500);});
  WORKS.length=0;r.works.forEach(function(W){WORKS.push(W);});
  /* anciennes partitions importées que la migration n'a pas pu écrire : gardées telles quelles */
  (await IDB.all()).forEach(function(W){if(!WORKS.some(function(x){return x.id===W.id;})){W.legacy=true;WORKS.push(W);}});
  /* fiches modifiées avant la 0.24 (chants qui étaient dans l'appli) */
  WORKS.forEach(function(W){const m=LS.get('meta:'+W.id,null);if(m)Object.assign(W,m);});
  if(r.bad.length||r.dup.length)toast('⚠ '+(r.bad.length?r.bad.length+' fichier'+(r.bad.length>1?'s':'')+' illisible'+(r.bad.length>1?'s':'')+' ':'')+(r.dup.length?r.dup.length+' doublon'+(r.dup.length>1?'s':'')+' ignoré'+(r.dup.length>1?'s':''):''),5000);}
async function libReload(say){await libLoad();library();if(say)toast('📚 '+WORKS.length+' chant'+(WORKS.length>1?'s':'')+' dans la bibliothèque');setTimeout(libWarm,800);}
/* ── ma voix : zone confortable (hauteur réelle) ── */
const VPRE=[['S','Soprano',60,81],['Mz','Mezzo',57,77],['A','Alto',53,74],['T','Ténor',48,69],['Bar','Baryton',45,65],['B','Basse',41,62]];
function myVoice(){return LS.get('voice',null);}
function vName(v){const p=VPRE.filter(function(x){return x[0]===v.vt;})[0];return p?p[1]:'Ma voix';}
function wHist(W){return W.hist||LS.get('hist:'+W.id,null);}
/* meilleure transposition : coût = notes hors zone (pondérées par leur durée) + écart au centre */
function costAt(N,t,lo,hi){let c=0,tot=0,mean=0;N.forEach(function(n){const s=n.m+t;c+=n.d*Math.max(0,lo-s,s-hi)*4;tot+=n.d;mean+=n.d*s;});return c+(tot?Math.abs(mean/tot-(lo+hi)/2)*.15*tot:0)+Math.abs(t)*.01;}
function outAt(N,t,lo,hi){let n=0,h=0;N.forEach(function(x){if(x.m+t<lo||x.m+t>hi){n+=x.c;if(x.m+t>hi)h+=x.c;}});return {n:n,hi:h};}
function anOf(W){const v=myVoice();const H=wHist(W);if(!v||!H)return null;const ids=Object.keys(H).filter(function(id){return H[id].n>0;});if(!ids.length)return null;
  const key=v.vt+v.lo+v.hi+'|'+(LS.get('sing:'+W.id,null)||'');if(W._an&&W._ank===key)return W._an;
  const sing=LS.get('sing:'+W.id,null);let cand=ids.filter(function(id){return id===sing;});if(!cand.length)cand=ids.filter(function(id){return H[id].vt&&H[id].vt===v.vt;});if(!cand.length)cand=ids;
  let best=null;cand.forEach(function(id){const N=Object.keys(H[id].h).map(function(m){return {m:+m,d:H[id].h[m],c:Math.max(1,Math.round(H[id].h[m]))};});
    let bt=0,bo=0,bc=1e18;[0,-12,12].forEach(function(o){for(let t=-7;t<=7;t++){const c=costAt(N,t+o,v.lo,v.hi)+(o?.5:0);if(c<bc-1e-9){bc=c;bt=t;bo=o;}}});if(!best||bc<best.c)best={id:id,N:N,c:bc,t:bt,o:bo};});
  const N=best.N;let lo=999,hi=-999;N.forEach(function(n){lo=Math.min(lo,n.m);hi=Math.max(hi,n.m);});
  const srt=N.slice().sort(function(a,b){return a.m-b.m;}),tot=N.reduce(function(a,n){return a+n.d;},0);let acc=0,tlo=null,thi=null;srt.forEach(function(n){acc+=n.d;if(tlo==null&&acc>=tot*.1)tlo=n.m;if(thi==null&&acc>=tot*.9)thi=n.m;});
  const r={pid:best.id,pname:H[best.id].name,lo:lo,hi:hi,tlo:tlo,thi:thi,best:best.t,oct:best.o,N:N,v:v};W._an=r;W._ank=key;return r;}
function anBadge(an,t){const O=an.oct||0,o=outAt(an.N,t+O,an.v.lo,an.v.hi),ob=outAt(an.N,an.best+O,an.v.lo,an.v.hi);const oc=O<0?' · à l’octave inférieure':(O>0?' · à l’octave supérieure':'');
  if(!o.n)return {cls:'ok',txt:'✅ confortable'+(t?' (en '+(t>0?'+':'')+t+')':'')+oc};
  if(!ob.n)return {cls:'tr',txt:'↕ confortable en '+(an.best>0?'+':'')+an.best+oc,best:an.best};
  return {cls:'ko',txt:'⚠ '+o.n+' note'+(o.n>1?'s':'')+' hors zone'+oc+(an.best!==t?' · mieux en '+(an.best>0?'+':'')+an.best:''),best:an.best!==t?an.best:null};}
/* notes hors zone en rouge dans la partition */
BUS.on('drawn',function(){const an=ST.an;if(!an)return;const SC=ST.SC;SC.ev.forEach(function(e){if(e.pid!==an.pid||!e.midi.length)return;const s=e.midi[e.midi.length-1]+ST.tr+(an.oct||0);
  if(s<an.v.lo||s>an.v.hi)e.ids.forEach(function(id){const el=document.getElementById(id.replace(/-rend\d+$/,''));if(el)el.classList.add('out');});});});
/* ── navigation : recherche, filtres, regroupements ── */
function wParts(W){const H=wHist(W);if(H)return Object.keys(H).map(function(k){return H[k];});if(W.parts)return W.parts.filter(function(P){return P.kind==='voice';}).map(function(P){return {name:P.name,vt:P.vt||''};});return [];}
function wInstr(W){if(W.instr!=null)return W.instr;if(W.parts)return W.parts.some(function(P){return P.kind!=='voice';});return false;}
function repOf(W){const VP=wParts(W),pn=wInstr(W);if(!VP.length)return 'Instrumental';if(VP.length===1)return pn?'Voix + piano':'Voix seule';
  const L=VP.map(function(P){return P.vt==='Mz'?'S':(P.vt==='Bar'?'B':(P.vt||'?'));});const lab=L.indexOf('?')<0?L.join(''):VP.length+' voix';return (VP.length===2?'Duo '+lab:lab)+(pn?' + piano':' a cappella');}
function voicesOf(W){const o=[];wParts(W).forEach(function(P){const n=VTNAME[P.vt];if(n&&o.indexOf(n)<0)o.push(n);});return o;}
const FLT=Object.assign({q:'',style:'',period:'',composer:'',work:'',rep:'',voice:'',mine:false,grp:''},LS.get('flt',{}));
const FDEF=[['style','Style',function(W){return W.style?[W.style]:[];}],['period','Période',function(W){return W.period?[W.period]:[];}],['composer','Compositeur',function(W){return W.composer?[W.composer]:[];}],
  ['work','Œuvre',function(W){return W.work?[W.work.replace(/,.*$/,'')]:[];}],['rep','Répartition',function(W){return [repOf(W)];}],['voice','Voix',voicesOf]];
function fltPass(W,skip){const q=FLT.q.trim().toLowerCase();if(q&&[W.title,W.composer,W.work,W.role,W.style,W.period].join(' ').toLowerCase().indexOf(q)<0)return false;
  for(let i=0;i<FDEF.length;i++){const k=FDEF[i][0];if(k===skip||!FLT[k])continue;if(FDEF[i][2](W).indexOf(FLT[k])<0)return false;}
  if(FLT.mine&&skip!=='mine'){const an=anOf(W);if(!an)return false;if(anBadge(an,LS.get('tr:'+W.id,0)).cls==='ko')return false;}return true;}
function navBar(){const el=$('#nav');
  el.innerHTML='<input id="fq" type="search" placeholder="🔎 Titre, compositeur, œuvre, rôle…" value="'+esc(FLT.q)+'">'
    +'<div class="fl">'+FDEF.map(function(F){const k=F[0],vals={};WORKS.forEach(function(W){if(!fltPass(W,k))return;F[2](W).forEach(function(v){vals[v]=(vals[v]||0)+1;});});
      const ks=Object.keys(vals).sort(function(a,b){return a.localeCompare(b,'fr');});if(FLT[k]&&!vals[FLT[k]])ks.unshift(FLT[k]);
      return '<select data-f="'+k+'" class="'+(FLT[k]?'on':'')+'"><option value="">'+F[1]+'</option>'+ks.map(function(v){return '<option'+(v===FLT[k]?' selected':'')+' value="'+esc(v)+'">'+esc(v)+(vals[v]?' ('+vals[v]+')':'')+'</option>';}).join('')+'</select>';}).join('')
    +'<button data-fm="1" class="'+(FLT.mine?'on':'')+'" title="Seulement ce qui va à ma voix (au besoin transposé)">🎤 pour ma voix</button>'
    +'<select data-f="grp" class="'+(FLT.grp?'on':'')+'"><option value="">Grouper…</option>'+[['work','par œuvre'],['composer','par compositeur'],['period','par période'],['style','par style'],['rep','par répartition']].map(function(g){return '<option value="'+g[0]+'"'+(FLT.grp===g[0]?' selected':'')+'>'+g[1]+'</option>';}).join('')+'</select>'
    +(['q','style','period','composer','work','rep','voice'].some(function(k){return FLT[k];})||FLT.mine?'<button data-fx="1">✕ tout</button>':'')+'</div>';
  const q=$('#fq');q.oninput=function(){FLT.q=q.value;LS.set('flt',FLT);LIBN=150;libList();};}
function prefTxt(id){const t=LS.get('tr:'+id,0),v=LS.get('tempo:'+id,100);return (t||v!==100)?'★ '+(t?(t>0?'+':'')+t+' ':'')+(v!==100?v+' %':''):'';}
function wkCard(W){const an=anOf(W),b=an&&anBadge(an,LS.get('tr:'+W.id,0));const vp=wParts(W);
  return '<div class="wk" data-w="'+W.id+'"><b>'+esc(W.title)+'</b><span>'+esc(W.composer||'?')+(W.work?' — '+esc(W.work):'')+'</span>'
    +'<small>'+[W.style,W.period,repOf(W)].filter(Boolean).map(esc).join(' · ')+(prefTxt(W.id)?' · <b class="pref">'+prefTxt(W.id)+'</b>':'')+'</small>'
    +(an?'<div class="amb">'+esc(an.pname)+' : '+pName(an.lo)+'–'+pName(an.hi)+' <i>(tessiture '+pName(an.tlo)+'–'+pName(an.thi)+')</i> <em class="vb '+b.cls+'">'+b.txt+'</em></div>':(vp.length?'<div class="amb">'+vp.map(function(p){return esc(p.name);}).join(' · ')+'</div>':''))
    +(W.file||W.legacy?'<button class="wdel" data-del="'+W.id+'" title="Supprimer">🗑</button>':'')+'</div>';}
let LIBN=150;  /* des milliers de chants : on n'affiche qu'une page à la fois */
function libList(){const L0=WORKS.filter(function(W){return fltPass(W);});const add='<div class="wk soon" data-add="1"><b>📥 Ajouter des chants</b><span>Fichiers .fab, ou MusicXML (.musicxml, .mxl) / MEI à convertir en .fab.</span></div>';
  if(!WORKS.length){$('#lib').innerHTML='<div class="hint">La bibliothèque est vide. Le partiteur lit les fichiers <b>.fab</b> rangés dans <b>Documents/Partiteur</b> : copie-les là (puis 🗂 → Relire le dossier), ou touche 📥 pour les choisir.</div>'+add;return;}
  if(!L0.length){$('#lib').innerHTML='<div class="hint">Aucune pièce ne correspond.</div>'+add;return;}
  const L=L0.slice(0,LIBN),more=L0.length>L.length?'<button class="pgb" data-more="1" style="grid-column:1/-1;text-align:center">⬇ Voir plus ('+(L0.length-L.length)+' de plus)</button>':'';
  if(!FLT.grp){$('#lib').innerHTML=L.map(wkCard).join('')+more+add;return;}
  const key=function(W){if(FLT.grp==='rep')return repOf(W);if(FLT.grp==='work')return W.work?W.work.replace(/,.*$/,''):'— hors œuvre —';return W[FLT.grp]||'— non classé —';};
  const G={};L.forEach(function(W){(G[key(W)]=G[key(W)]||[]).push(W);});
  $('#lib').innerHTML=Object.keys(G).sort(function(a,b){return a.localeCompare(b,'fr');}).map(function(k){return '<h3 class="gh">'+esc(k)+' <small>'+G[k].length+'</small></h3>'+G[k].map(wkCard).join('');}).join('')+more+add;}
function library(){const v=myVoice();$('#vme').innerHTML=v?'🎤 '+vName(v)+' · '+pName(v.lo)+'–'+pName(v.hi):'🎤 Ma voix';navBar();libList();progList();}
document.addEventListener('change',function(e){const s=e.target.closest('#nav [data-f]');if(!s)return;FLT[s.dataset.f]=s.value;LS.set('flt',FLT);navBar();libList();});
document.addEventListener('click',function(e){if(e.target.closest('#nav [data-fm]')){FLT.mine=!FLT.mine;LS.set('flt',FLT);navBar();libList();return;}
  if(e.target.closest('#nav [data-fx]')){['q','style','period','composer','work','rep','voice'].forEach(function(k){FLT[k]='';});FLT.mine=false;LS.set('flt',FLT);navBar();libList();return;}
  if(e.target.closest('#lib [data-more]')){LIBN+=300;libList();return;}
  const d=e.target.closest('[data-del]');if(d){e.stopPropagation();const W=wById(d.dataset.del);if(W&&confirm('Supprimer « '+W.title+' » ?'+(W.file?'\nLe fichier '+W.file+' sera effacé du téléphone.':'')))fabDelete(W).then(function(){WORKS.splice(WORKS.indexOf(W),1);library();},function(err){toast('⚠ Suppression impossible : '+(err.message||err));});return;}
  if(e.target.closest('#lib [data-add]')){$('#fimp').click();return;}
  const w=e.target.closest('#lib [data-w]');if(w){openWork(w.dataset.w);return;}
  if(e.target.closest('#vme'))voiceDlg();if(e.target.closest('#bImp'))$('#fimp').click();if(e.target.closest('#bDir'))fabDirDlg();
  if(e.target.closest('#bMeta')&&ST.W)metaDlg(ST.W,false,ST.SC);});
/* tessitures des pièces jamais ouvertes : calculées en tâche de fond */
let WARM=false;
async function libWarm(){if(WARM)return;WARM=true;let k=0;for(let i=0;i<WORKS.length;i++){const W=WORKS[i];if(wHist(W))continue;try{if(!$('#app').hidden)await new Promise(function(r){const t=setInterval(function(){if($('#app').hidden){clearInterval(t);r();}},1500);});
    await wFull(W);const SC=await engineLoad(W,true);const H=partHist(SC);W.instr=SC.parts.some(function(P){return P.kind!=='voice';});W.hist=H;W._an=null;
    if(W.file){await fabIdx(W);if(ST.W!==W)wLite(W);}else if(W.legacy)IDB.put(W);if(++k%20===0&&!$('#home').hidden)libList();}catch(e){}}WARM=false;if(!$('#home').hidden)libList();}
/* ── ma voix (fenêtre) ── */
function voiceDlg(){let cur=JSON.parse(JSON.stringify(myVoice()||{vt:'B',lo:41,hi:62}));
  const draw=function(){dlg('<h2>🎤 Ma voix</h2><div class="hint">La zone où tu chantes à l’aise (hauteur réelle). Le partiteur s’en sert pour te dire si un air te va, et dans quel ton.</div>'
    +'<div class="chips">'+VPRE.map(function(p){return '<button data-vp="'+p[0]+'" class="'+(cur.vt===p[0]?'on':'')+'">'+p[1]+'</button>';}).join('')+'</div>'
    +'<div class="rng"><span>grave</span><button data-vr="lo-">−</button><output>'+pName(cur.lo)+'</output><button data-vr="lo+">+</button><span>aigu</span><button data-vr="hi-">−</button><output>'+pName(cur.hi)+'</output><button data-vr="hi+">+</button><button data-vr="hear" title="Écouter les bornes">🔊</button></div>'
    +'<div class="row"><button id="vok" class="pri">Enregistrer</button><button data-close="1">Annuler</button></div>');
    $$('#dlg [data-vp]').forEach(function(b){b.onclick=function(){const p=VPRE.filter(function(x){return x[0]===b.dataset.vp;})[0];cur={vt:p[0],lo:p[2],hi:p[3]};draw();};});
    $$('#dlg [data-vr]').forEach(function(b){b.onclick=function(){const k=b.dataset.vr;if(k==='lo-')cur.lo--;if(k==='lo+')cur.lo=Math.min(cur.hi-5,cur.lo+1);if(k==='hi-')cur.hi=Math.max(cur.lo+5,cur.hi-1);if(k==='hi+')cur.hi++;
      if(k==='hear'){const A=ac();sndLoad(A).then(function(){voiceNote(cur.lo,A.currentTime+.05,.9,.8);voiceNote(cur.hi,A.currentTime+1.1,.9,.8);});return;}draw();};});
    $('#vok').onclick=function(){LS.set('voice',cur);WORKS.forEach(function(W){W._an=null;});dlgClose();library();if(ST.SC){ST.an=anOf(ST.W);render();}toast('🎤 '+vName(cur)+' : '+pName(cur.lo)+' – '+pName(cur.hi));};};
  draw();}
/* ── import ── */
async function mxlUnzip(buf){const dv=new DataView(buf),u8=new Uint8Array(buf);let e=-1;
  for(let i=buf.byteLength-22;i>=Math.max(0,buf.byteLength-66000);i--)if(dv.getUint32(i,true)===0x06054b50){e=i;break;}if(e<0)throw new Error('fichier .mxl illisible');
  const n=dv.getUint16(e+10,true);let p=dv.getUint32(e+16,true);const files={};
  for(let k=0;k<n;k++){const meth=dv.getUint16(p+10,true),csz=dv.getUint32(p+20,true),nl=dv.getUint16(p+28,true),xl=dv.getUint16(p+30,true),cl=dv.getUint16(p+32,true),off=dv.getUint32(p+42,true);
    files[new TextDecoder().decode(u8.subarray(p+46,p+46+nl))]={meth:meth,csz:csz,off:off};p+=46+nl+xl+cl;}
  const read=async function(name){const f=files[name];if(!f)return null;const st=f.off+30+dv.getUint16(f.off+26,true)+dv.getUint16(f.off+28,true);const data=u8.slice(st,st+f.csz);if(f.meth===0)return new TextDecoder().decode(data);
    const out=await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer();return new TextDecoder().decode(out);};
  let root=null;const cont=await read('META-INF/container.xml');if(cont){const m=/full-path="([^"]+)"/.exec(cont);if(m)root=m[1];}
  if(!root)root=Object.keys(files).filter(function(f){return /\.(xml|musicxml)$/i.test(f)&&f.indexOf('META-INF')<0;})[0];return read(root);}
async function readScoreFile(f){const buf=await f.arrayBuffer();const u=new Uint8Array(buf);if(u[0]===0x50&&u[1]===0x4b)return mxlUnzip(buf);return new TextDecoder().decode(buf);}
function xmlMeta(xml,fname){const d=new DOMParser().parseFromString(xml,'application/xml');const t=function(s){const x=d.querySelector(s);return x?x.textContent.trim():'';};
  const title=t('work > work-title')||t('movement-title')||t('titleStmt > title')||(function(){const c=$$('credit credit-words',d);return c.length?c[0].textContent.trim():'';})()||(fname||'Sans titre').replace(/\.[^.]+$/,'');
  const comp=(d.querySelector('creator[type="composer"]')||d.querySelector('persName[role="composer"]')||{textContent:''}).textContent.trim();
  return {title:title,composer:comp};}
/* 📥 ajout / 🔄 conversion : .fab copiés tels quels ; MusicXML, MXL, MEI → fiche → .fab ; PDF → explication */
const IMPQ=[];let IMPN=0;
function addFiles(list){Array.prototype.forEach.call(list,function(f){IMPQ.push(f);});if(IMPQ.length===list.length)impNext();}
async function impNext(){const f=IMPQ[0];if(!f){if(IMPN){library();toast('📚 '+IMPN+' chant'+(IMPN>1?'s':'')+' ajouté'+(IMPN>1?'s':''));IMPN=0;setTimeout(libWarm,800);}return;}
  const done=function(){IMPQ.shift();impNext();};const ext=(f.name.split('.').pop()||'').toLowerCase();
  try{if(ext==='fab'){const W=await fabAddFile(f);if(W)IMPN++;done();return;}
    if(ext==='pdf'||f.type==='application/pdf'){pdfInfo(f.name,done);return;}
    await importFile(f,done);}catch(err){toast('⚠ '+f.name+' : '+(err.message||err),5000);console.error(err);done();}}
function pdfInfo(name,done){dlg('<h2>📄 '+esc(name)+'</h2><div class="hint">Un PDF n’est qu’une <b>image</b> de partition : ni notes, ni rythmes, ni paroles lisibles par l’appli. Pour qu’il devienne un .fab interactif (son, voix, transposition, paroles, livret), il faut le <b>transcrire</b> mesure par mesure.</div>'
  +'<div class="hint" style="margin-top:8px">Envoie-le à Claude avec le titre de l’air : il le transcrit et te rend le .fab, prêt à copier dans Documents/Partiteur. Si tu as le MusicXML (MuseScore, IMSLP, CPDL), ajoute-le directement : il est converti ici.</div>'
  +'<div class="row"><button data-close="1" class="pri">OK</button></div>');dlgClose.cb=done;}
async function importFile(f,done){toast('🔄 Conversion de '+f.name+'…');const xml=await readScoreFile(f);if(!/score-partwise|<mei[\s>]/.test(xml))throw new Error(/score-timewise/.test(xml)?'format « timewise » : réexporte en MusicXML standard':'ce fichier n’est pas une partition MusicXML');
  const M=xmlMeta(xml,f.name);const W={id:'imp-'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),title:M.title,composer:M.composer,work:'',role:'',xml:xml,src:f.name,partMeta:{},created:new Date().toISOString().slice(0,10)};
  const SC=await engineLoad(W,true);W.hist=partHist(SC);W.instr=SC.parts.some(function(P){return P.kind!=='voice';});metaDlg(W,true,SC,done);}
const STYLES=['Air d’opéra','Oratorio','Messe','Motet','Cantique','Negro spiritual','Gospel','Lied','Mélodie','Chœur','Autre'];
const PERIODS=['Renaissance','Baroque','Classique','Romantique','Post-romantique','XXᵉ siècle','Contemporain','Traditionnel'];
function metaDlg(W,isNew,SC,done){let fin=false;const end=function(){if(fin)return;fin=true;if(done)done();};const opt=function(list,v){return '<option value=""></option>'+list.map(function(x){return '<option'+(x===v?' selected':'')+'>'+x+'</option>';}).join('');};
  const parts=SC?SC.parts:[];
  dlg('<h2>'+(isNew?'📥 Nouvelle partition':'✏️ Fiche')+'</h2>'
    +'<label>Titre<input id="mTitle" value="'+esc(W.title)+'"></label><label>Compositeur<input id="mComp" value="'+esc(W.composer||'')+'"></label>'
    +'<label>Œuvre qui la contient<input id="mWork" placeholder="ex. Les Noces de Figaro, acte I" value="'+esc(W.work||'')+'"></label><label>Rôle<input id="mRole" value="'+esc(W.role||'')+'"></label>'
    +'<div class="two"><label>Style<select id="mStyle">'+opt(STYLES,W.style)+'</select></label><label>Période<select id="mPer">'+opt(PERIODS,W.period)+'</select></label></div>'
    +(SC?'<h3>Parties ('+SC.meas.length+' mesures, '+keyName(SC.ks,SC.minor)+')</h3>'+parts.map(function(P,i){return '<div class="pr"><input data-pn="'+i+'" value="'+esc(P.name)+'"><select data-pk="'+i+'"><option value="voice"'+(P.kind==='voice'?' selected':'')+'>🎤 voix</option><option value="piano"'+(P.kind!=='voice'?' selected':'')+'>🎹 instrument</option></select>'
      +'<select data-pv="'+i+'"><option value=""></option>'+VPRE.map(function(p){return '<option value="'+p[0]+'"'+(P.vt===p[0]?' selected':'')+'>'+p[1]+'</option>';}).join('')+'</select></div>';}).join(''):'')
    +(!isNew?'<h3>📦 Fichier .fab'+(W.file?' — '+esc(W.file):'')+'</h3><div class="row"><button id="mExp">📤 Partager le .fab</button><button id="mExpP" title="Avec ton, tempo, respirations, repères, annotations, ma version">📤 … avec mes réglages</button></div>':'')
    +'<div class="row"><button id="mok" class="pri">'+(isNew?'Enregistrer en .fab':'Enregistrer')+'</button><button data-close="1">Annuler</button></div>');
  dlgClose.cb=end;
  if(!isNew){$('#mExp').onclick=function(){fabExport(W,false).catch(function(e){toast('⚠ '+(e.message||e));});};$('#mExpP').onclick=function(){fabExport(W,true).catch(function(e){toast('⚠ '+(e.message||e));});};}
  $('#mok').onclick=function(){const o={title:$('#mTitle').value.trim()||W.title,composer:$('#mComp').value.trim(),work:$('#mWork').value.trim(),role:$('#mRole').value.trim(),style:$('#mStyle').value,period:$('#mPer').value};
    const pm={};parts.forEach(function(P,i){pm[P.id]={name:$('[data-pn="'+i+'"]').value.trim()||P.name,kind:$('[data-pk="'+i+'"]').value,vt:$('[data-pv="'+i+'"]').value};});
    Object.assign(W,o);W._an=null;if(SC){W.partMeta=pm;parts.forEach(function(P){Object.assign(P,pm[P.id]);});W.hist=partHist(SC);}
    $('#mok').disabled=true;
    wFull(W).then(function(){return fabSaveWork(W);}).then(function(){LS.del('meta:'+W.id);if(W.legacy){delete W.legacy;IDB.del(W.id);}
      if(WORKS.indexOf(W)<0){WORKS.push(W);if(isNew)IMPN++;}dlgClose();end();if(ST.W===W)openWork(W.id);else if(!isNew)library();if(!isNew)toast('✅ « '+W.title+' » enregistré ('+W.file+')');},
      function(err){$('#mok').disabled=false;toast('⚠ Enregistrement impossible : '+(err.message||err),5000);});};}
window.addEventListener('DOMContentLoaded',function(){const f=$('#fimp');f.onchange=function(){if(f.files.length)addFiles(Array.prototype.slice.call(f.files));f.value='';};});
/* ── 🎭 programmes ── */
function progs(){return LS.get('progs',[]);}function progSave(a){LS.set('progs',a);}
function itTr(it){return it.tr!=null?it.tr:LS.get('tr:'+it.w,0);}function itTempo(it){return it.tempo!=null?it.tempo:LS.get('tempo:'+it.w,100);}
function progList(){const el=$('#progs');const P=progs();
  el.innerHTML=P.map(function(p,pi){return '<div class="pg"><div><b>'+esc(p.name)+'</b><small>'+p.items.length+' pièce'+(p.items.length>1?'s':'')+' · '+p.items.map(function(it){const W=wById(it.w);return W?esc(W.title):'?';}).join(' · ')+'</small></div>'
    +'<button data-pc="'+pi+'" class="pri"'+(p.items.length?'':' disabled')+'>▶ Concert</button><button data-pe="'+pi+'">✏️</button></div>';}).join('')+'<button id="pnew">➕ Nouveau programme</button>';}
function progEdit(pi){const A=progs();const p=A[pi];
  const draw=function(){dlg('<h2>🎭 Programme</h2><label>Nom<input id="pName" value="'+esc(p.name)+'"></label>'
    +'<div class="pil">'+p.items.map(function(it,i){const W=wById(it.w);return '<div class="pit"><span class="pno">'+(i+1)+'</span><b>'+(W?esc(W.title):'?')+'</b>'
      +'<span class="ptr" title="Ton"><button data-it="tr-" data-i="'+i+'">♭</button>'+(itTr(it)>0?'+':'')+itTr(it)+'<button data-it="tr+" data-i="'+i+'">♯</button></span>'
      +'<span class="ptr" title="Tempo"><button data-it="tp-" data-i="'+i+'">−</button>'+itTempo(it)+'%<button data-it="tp+" data-i="'+i+'">+</button></span>'+((it.tr!=null||it.tempo!=null)?'<button data-it="pref" data-i="'+i+'" title="Revenir aux préférences de l’œuvre">★</button>':'')
      +'<button data-it="up" data-i="'+i+'">↑</button><button data-it="dn" data-i="'+i+'">↓</button><button data-it="x" data-i="'+i+'">✕</button></div>';}).join('')+'</div>'
    +'<label>Ajouter<select id="pAdd"><option value="">— choisir une pièce —</option>'+WORKS.map(function(W){return '<option value="'+W.id+'">'+esc(W.title)+' — '+esc(W.composer||'')+'</option>';}).join('')+'</select></label>'
    +'<div class="row"><button id="pok" class="pri">Enregistrer</button><button id="pdel">Supprimer</button><button data-close="1">Fermer</button></div>');
    $('#pName').oninput=function(){p.name=this.value;};$('#pAdd').onchange=function(){if(this.value){p.items.push({w:this.value});draw();}};
    $$('#dlg [data-it]').forEach(function(b){b.onclick=function(){const i=+b.dataset.i,k=b.dataset.it,a=p.items;
      if(k==='tr-')a[i].tr=itTr(a[i])-1;if(k==='tr+')a[i].tr=itTr(a[i])+1;if(k==='tp-')a[i].tempo=Math.max(40,itTempo(a[i])-5);if(k==='tp+')a[i].tempo=Math.min(160,itTempo(a[i])+5);if(k==='pref'){delete a[i].tr;delete a[i].tempo;}
      if(k==='up'&&i>0){const t=a[i];a[i]=a[i-1];a[i-1]=t;}if(k==='dn'&&i<a.length-1){const t=a[i];a[i]=a[i+1];a[i+1]=t;}if(k==='x')a.splice(i,1);draw();};});
    $('#pok').onclick=function(){A[pi]=p;progSave(A);dlgClose();progList();};
    $('#pdel').onclick=function(){if(confirm('Supprimer « '+p.name+' » ?')){A.splice(pi,1);progSave(A);dlgClose();progList();}};};draw();}
function progAddCurrent(){const A=progs();if(!ST.W)return;
  dlg('<h2>🎭 Ajouter « '+esc(ST.W.title)+' »</h2><div class="hint">Avec ton ton et ton tempo préférés ('+(ST.tr>0?'+':'')+ST.tr+' · '+ST.tempo+' %) — modifiables pour ce programme seulement.</div>'
    +A.map(function(p,i){return '<button class="pgb" data-pa="'+i+'">🎭 '+esc(p.name)+' <small>('+p.items.length+')</small></button>';}).join('')+'<button class="pgb" data-pa="new">➕ Nouveau programme</button><div class="row"><button data-close="1">Annuler</button></div>');
  $$('#dlg [data-pa]').forEach(function(b){b.onclick=function(){const A2=progs();let i=b.dataset.pa;if(i==='new'){A2.push({name:'Programme '+(A2.length+1),items:[]});i=A2.length-1;}else i=+i;
    A2[i].items.push({w:ST.W.id});progSave(A2);dlgClose();toast('🎭 Ajouté à « '+A2[i].name+' » ('+A2[i].items.length+'ᵉ pièce)');};});}
document.addEventListener('click',function(e){
  if(e.target.closest('#pnew')){const A=progs();A.push({name:'Programme '+(A.length+1),items:[]});progSave(A);progEdit(A.length-1);return;}
  const pe=e.target.closest('[data-pe]');if(pe){progEdit(+pe.dataset.pe);return;}
  const pc=e.target.closest('[data-pc]');if(pc){concertStart(+pc.dataset.pc,0);return;}
  if(e.target.closest('#bProg'))progAddCurrent();});
/* ── mode concert : enchaîne les pièces du programme ── */
let CONC=null;
async function concertStart(pi,i){const p=progs()[pi];if(!p||!p.items[i])return;const it=p.items[i];if(!wById(it.w)){toast('Pièce introuvable');return;}
  CONC={pi:pi,i:i,p:p,pending:false};document.body.classList.add('concert');await openWork(it.w);ST.tr=itTr(it);ST.tempo=itTempo(it);render();seek(0);concBar();$('#scorew').scrollTop=0;}
function concBar(){const c=$('#conc');if(!CONC){c.innerHTML='';return;}const p=CONC.p,n=p.items[CONC.i+1],W=n&&wById(n.w);
  c.innerHTML='<b>🎭 '+esc(p.name)+'</b><span>'+(CONC.i+1)+' / '+p.items.length+'</span><button data-cg="-1"'+(CONC.i?'':' disabled')+'>⏮</button><button data-cg="1"'+(n?'':' disabled')+'>⏭</button><span class="nx">'+(W?'ensuite : '+esc(W.title):'dernière pièce')+'</span><button data-cg="x">✕</button>';}
function concertEnd(){CONC=null;document.body.classList.remove('concert');$('#wait').classList.remove('on');concBar();}
BUS.on('pieceEnd',function(){if(!CONC)return;const n=CONC.p.items[CONC.i+1];const w=$('#wait');
  if(!n){w.textContent='👏 Fin du programme';w.classList.add('on');CONC.pending='end';return;}CONC.pending=true;w.textContent='▶ Suivant : '+(wById(n.w)||{}).title+' — touche quand tu es prêt';w.classList.add('on');});
document.addEventListener('click',function(e){const g=e.target.closest('[data-cg]');if(g){const k=g.dataset.cg;if(k==='x'){stop();concertEnd();return;}$('#wait').classList.remove('on');concertStart(CONC.pi,CONC.i+ +k);return;}
  if(e.target.closest('#wait')&&CONC&&CONC.pending){e.stopImmediatePropagation();const w=$('#wait');w.classList.remove('on');if(CONC.pending==='end'){concertEnd();return;}concertStart(CONC.pi,CONC.i+1).then(function(){setTimeout(play,400);});}},true);
