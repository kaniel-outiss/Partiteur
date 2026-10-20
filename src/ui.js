/* ═══════════ 🧭 POSTE DE TRAVAIL — ouverture d'une pièce, barre de transport, panneaux d'outils ═══════════ */
'use strict';
const ICON={play:'<svg viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg>',pause:'<svg viewBox="0 0 24 24"><rect x="6" y="4.5" width="4.2" height="15" rx="1"/><rect x="13.8" y="4.5" width="4.2" height="15" rx="1"/></svg>'};
/* panneaux : chaque module déclare le sien */
const TABS={};let TAB=null;
function tabOpen(k){if(TAB===k){tabClose();return;}TAB=k;$('#sheet').hidden=false;document.body.classList.add('sheeton');$$('.tp .tab').forEach(function(b){b.classList.toggle('cur',b.dataset.tab===k);});tabRender();BUS.emit('tab',k);setTimeout(function(){if(window.innerWidth>=1000&&ST.SC)drawScore();},30);}
function tabClose(){const was=TAB;TAB=null;$('#sheet').hidden=true;document.body.classList.remove('sheeton');$$('.tp .tab').forEach(function(b){b.classList.remove('cur');});BUS.emit('tab',null,was);if(window.innerWidth>=1000&&ST.SC)setTimeout(drawScore,30);}
function tabRender(){if(!TAB||!TABS[TAB]||!ST.SC)return;$('#shTitle').textContent=TABS[TAB].title;$('#shBody').innerHTML=TABS[TAB].render();if(TABS[TAB].after)TABS[TAB].after();}
BUS.on('render',function(){tabRender();});
/* interrupteur */
function sw(key,on,label,sub){return '<div class="sw"><span>'+label+(sub?'<small>'+sub+'</small>':'')+'</span><button class="tg'+(on?' on':'')+'" data-sw="'+key+'"></button></div>';}
/* ── ouverture ── */
async function openWork(id){const W=wById(id);if(!W)return;stop();BUS.emit('close');
  ST.W=W;ST.SC=null;ST.loop=null;ST.cur=0;ST.pi=0;LS.set('last',id);
  ST.tr=LS.get('tr:'+id,0);ST.tempo=LS.get('tempo:'+id,100);ST.mix=LS.get('mix:'+id,{});ST.sing=LS.get('sing:'+id,null);ST.pup=LS.get('pup:'+id,null);ST.voiceClef=LS.get('vclef:'+id,{});
  $('#home').hidden=true;$('#app').hidden=false;$('#score').innerHTML='<div class="hint pad">⏳ Gravure de « '+esc(W.title)+' »…</div>';header();
  try{ST.SC=await engineLoad(W);}catch(e){console.error(e);$('#score').innerHTML='<div class="hint pad">⚠ '+esc(e.message||e)+'</div>';return;}
  /* histogramme des voix (pour la bibliothèque) */
  const H=partHist(ST.SC);if(!W.imported)LS.set('hist:'+W.id,H);else if(JSON.stringify(W.hist||{})!==JSON.stringify(H)){W.hist=H;IDB.put(W);}W.hist=H;
  ST.an=anOf(W);BUS.emit('open',W);render();}
function closeWork(){stop();BUS.emit('close');tabClose();ST.SC=null;$('#app').hidden=true;$('#home').hidden=false;document.body.classList.remove('concert');library();}
/* tout redessiner après un changement de ton, de clé… */
function render(){if(!ST.SC)return;header();info();transportVals();const P=myPart();$('#lyrbox').classList.toggle('on',!!(P&&ST.SC.ev.some(function(e){return e.pid===P.id&&e.ly;})));drawScore();BUS.emit('render');}
function header(){const W=ST.W;$('#title').innerHTML='<b>'+esc(W.title)+'</b><span>'+esc([W.composer,W.work,W.role].filter(Boolean).join(' · '))+'</span>';mnum();}
function mnum(){if(!ST.SC)return;const m=ST.SC.meas[ST.cur<0?0:ST.cur];$('#mnum').innerHTML=m?'mes. '+esc(m.n)+'<br>/ '+ST.SC.meas.length:'';}
BUS.on('measure',mnum);
function transportVals(){$('#tmp').innerHTML=ST.tempo+' %<small>'+Math.round((ST.SC.meas[Math.max(0,ST.cur)]||{bpm:60}).bpm*ST.tempo/100)+' ♩</small>';
  $('#trv').innerHTML=(ST.tr>0?'+':'')+ST.tr+'<small>'+esc(keyName(ksAfter(ST.SC.ks,ST.tr),ST.SC.minor).replace(' majeur',' M').replace(' mineur',' m'))+'</small>';}
/* bandeau : ta voix, l'adaptation proposée */
function info(){const el=$('#info');const an=ST.an;if(!an){el.innerHTML=myVoice()||!voiceParts().length?'':'<button data-vme="1">🎤 Indique ta voix : je te dirai si l’air te va</button>';return;}
  const b=anBadge(an,ST.tr);el.innerHTML='<span class="vb '+b.cls+'" title="'+esc(an.pname)+' : '+pName(an.lo)+'–'+pName(an.hi)+'">'+esc(vName(an.v))+' · '+esc(an.pname)+' · '+b.txt+'</span>'+(b.best!=null&&b.best!==ST.tr?'<button data-adapt="'+b.best+'">↕ Adapter</button>':'');}
/* ── paroles : la phrase en cours, la syllabe chantée en or ── */
BUS.on('show',function(ev){const P=myPart();if(!P||ev.pid!==P.id||!ev.ly)return;const SC=ST.SC;
  const L=SC.ev.filter(function(e){return e.pid===P.id&&e.ly&&e.pi>=ev.pi-1&&e.pi<=ev.pi+2;});
  $('#lyr').innerHTML=L.map(function(e){const s=esc(e.ly.replace(/_$/,'').replace(/‿/g,' '));return e===ev?'<b>'+s+'</b>':s;}).join(' ').replace(/-\s/g,'').replace(/-<\/b>\s/g,'</b>');});
/* hors lecture : la phrase de la mesure où se trouve le curseur */
function lyrAt(mi){const P=myPart();if(!P||PL.on)return;const SC=ST.SC;const L=SC.ev.filter(function(e){return e.pid===P.id&&e.ly&&e.pass===1&&e.mi>=mi&&e.mi<=mi+3;});
  $('#lyr').innerHTML=L.slice(0,14).map(function(e){return esc(e.ly.replace(/_$/,'').replace(/‿/g,' '));}).join(' ').replace(/-\s/g,'')||'<span style="opacity:.5">…</span>';}
BUS.on('open',function(){$('#lyr').innerHTML='';$('#lyr2').innerHTML='';});BUS.on('render',function(){lyrAt(Math.max(0,ST.cur));});BUS.on('seek',lyrAt);
/* ── décompte, attente ── */
BUS.on('countin',function(nb,beat){const c=$('#count'),b=c.querySelector('b');c.classList.add('on');for(let i=0;i<nb;i++)setTimeout(function(){b.textContent=nb-i;},i*beat*1000+150);setTimeout(function(){c.classList.remove('on');},nb*beat*1000+150);});
BUS.on('stop',function(){$('#count').classList.remove('on');$('#wait').classList.remove('on');});
/* point d'orgue « de base » : la lecture attend ton toucher (si « me suit » n'est pas actif) */
const FERM={k:0,list:[],name:'ferm',off:function(){return !ST.wait||(typeof VF!=='undefined'&&((VF.follow&&PJ.on)||VF.ver));},
  prepare:function(q0,q1){const L=[];ST.SC.ev.forEach(function(e){if(e.ferm&&!e.grace&&e.q>=q0-1e-6&&e.q<q1)L.push(e.fermEnd!=null?e.fermEnd:e.q+e.d);});
    ST.SC.fermRests.forEach(function(r){if(r.q>q0&&r.q<=q1+1e-6)L.push(r.q);});this.list=L.filter(function(q,i){return L.indexOf(q)===i;}).sort(function(a,b){return a-b;});this.k=0;},
  next:function(){return this.list[this.k]==null?null:this.list[this.k];},
  wait:function(){$('#wait').textContent='𝄐 Point d’orgue — touche pour continuer';$('#wait').classList.add('on');}};
GATES.push(FERM);
$('#wait').addEventListener('click',function(){if(PL.waiting&&PL.holdBy===FERM){FERM.k++;$('#wait').classList.remove('on');release();}});
BUS.on('released',function(){$('#wait').classList.remove('on');});
/* ── transport ── */
document.addEventListener('DOMContentLoaded',function(){$('#bPlay').innerHTML=ICON.play;});
document.addEventListener('click',function(e){const t=e.target.closest('button');if(!t)return;const id=t.id;
  if(id==='bPlay'){if(PL.waiting&&PL.holdBy===FERM){$('#wait').click();return;}play();return;}
  if(id==='bStart'){stop();seek(0);$('#scorew').scrollTo({top:0,behavior:'smooth'});return;}
  if(id==='bLoop'){loopToggle();return;}
  if(id==='tm'||id==='tp+'){ST.tempo=Math.max(30,Math.min(180,ST.tempo+(id==='tm'?-5:5)));LS.set('tempo:'+ST.W.id,ST.tempo);transportVals();if(PL.on){stop(true);start(false);}return;}
  if(id==='trm'||id==='trp'){ST.tr=Math.max(-12,Math.min(12,ST.tr+(id==='trm'?-1:1)));LS.set('tr:'+ST.W.id,ST.tr);const was=PL.on;stop();render();if(was)play();return;}
  if(id==='bBack'){if(typeof CONC!=='undefined'&&CONC)concertEnd();closeWork();return;}
  if(id==='shClose'){tabClose();return;}
  if(t.classList.contains('tab')){tabOpen(t.dataset.tab);return;}
  if(t.dataset.adapt!=null){ST.tr=+t.dataset.adapt;LS.set('tr:'+ST.W.id,ST.tr);stop();render();toast('↕ Transposé en '+(ST.tr>0?'+':'')+ST.tr+' pour ta voix');return;}
  if(t.dataset.vme)voiceDlg();});
$('#tmp').addEventListener('click',function(){ST.tempo=100;LS.set('tempo:'+ST.W.id,100);transportVals();});
$('#trv').addEventListener('click',function(){if(!ST.tr)return;ST.tr=0;LS.set('tr:'+ST.W.id,0);stop();render();});
/* 🎵 : appui court = ta note, appui long = avec l'accord */
(function(){let t0=0,tm=null;const b=$('#bNote');b.addEventListener('pointerdown',function(){t0=Date.now();tm=setTimeout(function(){giveNote(true);tm=null;},450);});
  b.addEventListener('pointerup',function(){if(tm){clearTimeout(tm);tm=null;giveNote(false);}});b.addEventListener('pointerleave',function(){if(tm){clearTimeout(tm);tm=null;}});})();
document.addEventListener('keydown',function(e){if(!ST.SC||$('#app').hidden||/INPUT|TEXTAREA|SELECT/.test((e.target.tagName||'')))return;
  if(e.code==='Space'){e.preventDefault();$('#bPlay').click();}
  else if(e.code==='ArrowRight'){seek(Math.min(ST.SC.meas.length-1,ST.cur+1));}else if(e.code==='ArrowLeft'){seek(Math.max(0,ST.cur-1));}
  else if(e.key==='+'||e.key==='='){zoomBy(1.12);}else if(e.key==='-'){zoomBy(1/1.12);}else if(e.key==='l'){loopToggle();}else if(e.key==='n'){giveNote(false);}});
/* interrupteurs des panneaux */
document.addEventListener('click',function(e){const b=e.target.closest('[data-sw]');if(!b)return;const k=b.dataset.sw;const on=!b.classList.contains('on');b.classList.toggle('on',on);BUS.emit('sw',k,on);});
/* ── panneau ⚙ réglages ── */
TABS.regl={title:'⚙ Réglages',render:function(){const VP=voiceParts();
  return '<h4>Lecture</h4>'+sw('count',ST.count,'Décompte','une mesure de clics avant de démarrer')+sw('metro',ST.metro,'Métronome','clic sur chaque temps')+sw('wait',ST.wait,'Attendre aux points d’orgue','la lecture reprend quand tu touches l’écran')+sw('follow',ST.follow,'Suivre la lecture','la partition défile toute seule')
   +'<h4>Son</h4><div class="row"><label>Voix chantées</label><div class="chips"><button data-timbre="oh" class="'+(ST.timbre!=='ah'?'on':'')+'">« oh »</button><button data-timbre="ah" class="'+(ST.timbre==='ah'?'on':'')+'">« ah » (chœur)</button></div></div>'
   +'<div class="row"><label>Salle</label><input type="range" id="rvb" min="0" max=".6" step=".02" value="'+LS.get('reverb',.22)+'" style="flex:1"></div>'
   +'<h4>Affichage</h4><div class="row"><label>Taille</label><button data-zoom="-">−</button><b>'+Math.round(ST.zoom*100)+' %</b><button data-zoom="+">+</button></div>'
   +sw('dim',LS.get('dim',false),'Ma portée en relief','les autres portées s’estompent')
   +VP.map(function(P){const c=ST.voiceClef[P.id]||'';return '<div class="row"><label>Clé · '+esc(P.name)+'</label><div class="chips"><button data-vclef="'+P.id+'|" class="'+(!c?'on':'')+'">d’origine</button><button data-vclef="'+P.id+'|G" class="'+(c==='G'?'on':'')+'">𝄞</button><button data-vclef="'+P.id+'|G8" class="'+(c==='G8'?'on':'')+'">𝄞₈</button><button data-vclef="'+P.id+'|F" class="'+(c==='F'?'on':'')+'">𝄢</button></div></div>';}).join('')
   +(ST.SC.verses>1?'<div class="hint">'+ST.SC.verses+' couplets : à la lecture, chaque reprise prend le couplet suivant.</div>':'');},
  after:function(){const r=$('#rvb');if(r)r.oninput=function(){if(!AC)ac();setReverb(+r.value);};}};
BUS.on('sw',function(k,on){if(k==='count'){ST.count=on;LS.set('count',on);}if(k==='metro'){ST.metro=on;LS.set('metro',on);}if(k==='wait'){ST.wait=on;LS.set('wait',on);}if(k==='follow')ST.follow=on;
  if(k==='dim'){LS.set('dim',on);markMine();}});
document.addEventListener('click',function(e){const b=e.target.closest('[data-timbre],[data-zoom],[data-vclef]');if(!b)return;
  if(b.dataset.timbre){ST.timbre=b.dataset.timbre;LS.set('timbre',ST.timbre);tabRender();ac();sndLoad().then(function(){voiceNote(57+(ST.timbre==='ah'?3:0),AC.currentTime+.05,1,.7);});}
  if(b.dataset.zoom){zoomBy(b.dataset.zoom==='+'?1.12:1/1.12);tabRender();}
  if(b.dataset.vclef){const a=b.dataset.vclef.split('|');if(a[1])ST.voiceClef[a[0]]=a[1];else delete ST.voiceClef[a[0]];LS.set('vclef:'+ST.W.id,ST.voiceClef);stop();render();}});
/* ma portée : marque et estompe les autres */
function markMine(){const sv=$('#sv');if(!sv)return;const P=myPart();sv.classList.toggle('dimothers',!!(LS.get('dim',false)&&P));if(!P)return;
  $$('#sv g.measure').forEach(function(m){$$(':scope > g.staff',m).forEach(function(s,i){s.classList.toggle('mystaff',i+1===P.staff);});});}
BUS.on('drawn',markMine);
