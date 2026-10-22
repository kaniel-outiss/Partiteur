/* ═══════════ 🎹 PIANO — clavier, MIDI, piano maître, mains séparées, aides de lecture ═══════════
   Repris de Garden / Garden Kids : couleurs par main, nom des notes dans les têtes, chiffrage des accords,
   attente des bonnes notes (accords compris), boucle + tempo progressif, bilan des mesures ratées. */
'use strict';
const PN={open:false,hand:LS.get('pn_hand','rh'),master:LS.get('pn_master',true),names:LS.get('pn_names','off'),chords:LS.get('pn_chords',false),accel:LS.get('pn_accel',false),hcol:LS.get('pn_hcol',true),muteMine:false,
  steps:[],k:0,struck:new Set(),held:new Set(),err:{},ok:0,bad:0,passErr:0,midi:null,kb:null,runOn:false};
function pianoParts(){return ST.SC?ST.SC.parts.filter(function(P){return P.kind!=='voice';}):[];}
function pnMine(P){return P.kind!=='voice'&&(PN.hand==='both'||PN.hand===P.hand);}
/* — aides dans la partition — */
BUS.on('drawn',function(){if(!ST.SC)return;const PP=pianoParts();
  if(PN.open&&PN.hcol)PP.forEach(function(P){noteEls(P.id).forEach(function(e){e.classList.add('h'+(P.hand||'rh'));});});
  const g=ovGroup('ovPN');if(!g)return;let h='';
  if(PN.open&&PN.names!=='off'){const tk=VRV.tk;PP.forEach(function(P){noteEls(P.id).forEach(function(el){let a=null;try{a=tk.getElementAttr(el.id);}catch(e){}if(!a||!a.pname)return;const hd=el.querySelector('.notehead');if(!hd)return;
    const R=$('#score').getBoundingClientRect(),r=hd.getBoundingClientRect();const L=a.pname.toUpperCase();const ac=a.accid||a['accid.ges']||'';const sym=ac==='s'?'♯':(ac==='f'?'♭':'');
    const fs=Math.max(6,(r.bottom-r.top)*.78);h+='<text x="'+((r.left+r.right)/2-R.left)+'" y="'+((r.top+r.bottom)/2-R.top)+'" class="nhn" style="font-size:'+fs.toFixed(1)+'px">'+(PN.names==='fr'?FRN[L].replace('sol','so'):L)+'</text>';});});}
  if(PN.chords&&PP.length)h+=pnChordsSVG();
  g.innerHTML=h;});
/* — chiffrage des accords — */
const PN_TPL=[[[0,4,7],''],[[0,3,7],'m'],[[0,4,7,10],'7'],[[0,4,7,11],'maj7'],[[0,3,7,10],'m7'],[[0,3,6,10],'ø7'],[[0,3,6,9],'°7'],[[0,3,6],'°'],[[0,4,8],'+'],[[0,5,7],'sus4'],[[0,2,7],'sus2'],
  [[0,4,7,9],'6'],[[0,3,7,9],'m6'],[[0,2,4,7,10],'9'],[[0,2,4,7,11],'maj9'],[[0,2,3,7,10],'m9'],[[0,2,4,7],'add9'],[[0,5,7,10],'7sus4'],[[0,3,7,11],'m(maj7)'],[[0,1,4,7,10],'7♭9'],[[0,4,8,10],'7♯5'],
  [[0,4,10],'7'],[[0,4,11],'maj7'],[[0,3,10],'m7'],[[0,2,4,7,9],'6/9']];
function pnSpell(pc,ks){const n=(ks<0?FL:SH)[pc];return n[0]+(n[1]==='#'?'♯':(n[1]==='b'?'♭':''));}
function pnChordName(ms,ks){if(ms.length<3)return null;const bass=Math.min.apply(null,ms)%12;const pcs=[];ms.forEach(function(m){const p=m%12;if(pcs.indexOf(p)<0)pcs.push(p);});if(pcs.length<3)return null;
  let best=null;pcs.forEach(function(r){const iv=pcs.map(function(p){return (p-r+12)%12;}).sort(function(a,b){return a-b;}).join(',');
    PN_TPL.forEach(function(t,ti){if(t[0].slice().sort(function(a,b){return a-b;}).join(',')!==iv)return;const sc=(r===bass?100:0)-ti;if(!best||sc>best.sc)best={sc:sc,r:r,s:t[1]};});});
  if(!best)return null;return {txt:pnSpell(best.r,ks)+best.s+(bass!==best.r?'/'+pnSpell(bass,ks):''),key:best.r+'/'+bass+best.s};}
function pnChordsSVG(){const SC=ST.SC,ks=ksAfter(SC.ks,ST.tr);const PP=pianoParts().map(function(P){return P.id;});let out='',prev=null,lastX=-99,lastSys=-1;
  const E=SC.ev.filter(function(e){return e.pass===1&&!e.grace&&PP.indexOf(e.pid)>=0;});const on=[];E.forEach(function(e){if(!on.length||Math.abs(on[on.length-1]-e.q)>1e-6)on.push(e.q);});
  const PPs=pianoParts(),top=PPs[PPs.length-1];/* sous la portée du bas */
  /* plus basse note (lignes supplémentaires comprises) de la portée du bas, par système : les accords passent dessous */
  const low={};VW.geo.forEach(function(G){const t=G&&G.st[top.staff];if(t)low[G.sys]=Math.max(low[G.sys]||0,t.ext||t.bot);});
  on.forEach(function(q){const snd=[];let lo=999,att=999,ev0=null;E.forEach(function(e){if(e.q<=q+1e-6&&e.q+e.d>q+1e-6)e.midi.forEach(function(m){snd.push(m+ST.tr);lo=Math.min(lo,m);if(Math.abs(e.q-q)<1e-6){att=Math.min(att,m);ev0=ev0||e;}});});
    if(!ev0||att!==lo&&q-Math.floor(q)>1e-6)return;const n=pnChordName(snd,ks);if(!n||n.key===prev)return;const xy=VW.noteXY[ev0.base],G=VW.geo[ev0.mi];if(!xy||!G||!G.st[top.staff])return;
    if(G.sys===lastSys&&xy.x<lastX+4)return;out+='<text x="'+(xy.x-6)+'" y="'+(Math.max(G.st[top.staff].bot+SPX()*1.6,(low[G.sys]||0)+SPX()*1.7))+'" class="chs">'+esc(n.txt)+'</text>';prev=n.key;lastX=xy.x+n.txt.length*7.5;lastSys=G.sys;});
  return out;}
function SPX(){return 14*ST.zoom;}
/* — clavier à l'écran — */
function pnRange(){let lo=127,hi=0;ST.SC.ev.forEach(function(e){if(e.kind==='voice')return;e.midi.forEach(function(m){lo=Math.min(lo,m+ST.tr);hi=Math.max(hi,m+ST.tr);});});
  if(lo>hi){lo=48;hi=84;}lo=Math.max(21,lo-lo%12-(lo%12<3?12:0));hi=Math.min(108,hi+(11-hi%12));if(hi-lo<35)hi=lo+35;return [lo,hi];}
function pnKbDraw(){const el=$('#pkb');if(!el||!ST.SC)return;const r=pnRange();PN.kb=r;const WH=[0,2,4,5,7,9,11];let wn=0;for(let m=r[0];m<=r[1];m++)if(WH.indexOf(m%12)>=0)wn++;
  const ww=Math.max(16,Math.min(34,(el.clientWidth||600)/wn)),H=Math.round(ww*3);let x=0,w='',b='';
  for(let m=r[0];m<=r[1];m++){if(WH.indexOf(m%12)>=0){w+='<rect class="kw" data-k="'+m+'" x="'+x+'" y="0" width="'+(ww-1)+'" height="'+H+'" rx="3"/>'+(m%12===0?'<text x="'+(x+ww/2)+'" y="'+(H-6)+'" class="kc" text-anchor="middle">'+(PN.names==='fr'?'do':'C')+(Math.floor(m/12)-1)+'</text>':'');x+=ww;}
    else b+='<rect class="kb" data-k="'+m+'" x="'+(x-ww*.32)+'" y="0" width="'+(ww*.64)+'" height="'+(H*.6)+'" rx="2"/>';}
  el.innerHTML='<svg width="'+x+'" height="'+H+'" id="pksv">'+w+b+'</svg>';pnLightSteps();}
function pnKey(m){return document.querySelector('#pksv [data-k="'+m+'"]');}
function pnLight(m,cls,on){const k=pnKey(m);if(k)k.classList.toggle(cls,on);}
function pnClearCls(cls){$$('#pksv .'+cls).forEach(function(k){k.classList.remove(cls);});}
function pnFlash(m,cls,ms){pnLight(m,cls,true);setTimeout(function(){pnLight(m,cls,false);},ms||350);}
/* — piano maître : étapes à jouer, porte sur la lecture — */
const PNG={name:'pn',off:function(){return !(PN.open&&PN.master);},
  prepare:function(q0,q1){const map={};ST.SC.ev.forEach(function(e){const P=partById(e.pid);if(!P||!pnMine(P)||e.grace||e.q<q0-1e-6||e.q>=q1)return;
      const k=e.q.toFixed(4);const S=map[k]=map[k]||{q:e.q,mi:e.mi,e:e,need:{}};e.midi.forEach(function(m){S.need[m+ST.tr]=P.hand||'rh';});});
    PN.steps=Object.keys(map).map(function(k){return map[k];}).sort(function(a,b){return a.q-b.q;});PN.k=0;PN.struck.clear();PN.passErr=0;if(!PN.runOn){PN.err={};PN.ok=0;PN.bad=0;PN.runOn=true;}pnLightSteps();},
  next:function(){const S=PN.steps[PN.k];return S?S.q:null;},wait:function(){pnLightSteps();}};
GATES.push(PNG);
function pnLightSteps(){pnClearCls('trh');pnClearCls('tlh');pnClearCls('nx');if(!PN.open||!PN.master)return;const S=PN.steps[PN.k],N=PN.steps[PN.k+1];
  if(S){Object.keys(S.need).forEach(function(m){pnLight(+m,'t'+S.need[m],true);});const k=pnKey(+Object.keys(S.need)[0]),box=$('#pkb');if(k&&box&&box.scrollWidth>box.clientWidth){const x=+k.getAttribute('x');if(x<box.scrollLeft+20||x>box.scrollLeft+box.clientWidth-40)box.scrollTo({left:x-box.clientWidth/2,behavior:'smooth'});}}
  if(N)Object.keys(N.need).forEach(function(m){if(!S||!S.need[m])pnLight(+m,'nx',true);});}
function pnCheck(){const S=PN.steps[PN.k];if(!S)return;const ok=Object.keys(S.need).every(function(m){return PN.struck.has(+m)||PN.held.has(+m);});if(!ok)return;
  PN.ok++;PN.k++;PN.struck.clear();if(PL.holdBy===PNG)release();pnLightSteps();}
function pnOn(m,vel,screen){PN.held.add(m);pnLight(m,'dn',true);if(screen){const A=ac();sndLoad(A).then(function(){pianoNote(m,A.currentTime,.9,.9*(vel||.8));});}
  if(PN.open&&PN.master&&PL.on){const S=PN.steps[PN.k];if(S){if(S.need[m]){PN.struck.add(m);pnCheck();}
      else{const P=PN.steps[PN.k-1];if(!(P&&P.need[m])){PN.bad++;PN.passErr++;PN.err[S.mi]=(PN.err[S.mi]||0)+1;pnFlash(m,'bad');}}}}
  BUS.emit('midiNote',m,vel);}
function pnOff(m){PN.held.delete(m);pnLight(m,'dn',false);}
function pnMidi(quiet){if(!navigator.requestMIDIAccess){if(!quiet)toast('MIDI non disponible ici — utilise le clavier à l’écran');return;}
  navigator.requestMIDIAccess().then(function(acc){PN.midi=acc;const hook=function(){let n=0;acc.inputs.forEach(function(inp){n++;inp.onmidimessage=function(e){const d=e.data,c=d[0]&0xf0;if(c===0x90&&d[2]>0)pnOn(d[1],d[2]/127);else if(c===0x80||(c===0x90&&d[2]===0))pnOff(d[1]);};});
      PN.midiN=n;if(TAB==='piano')tabRender();};hook();acc.onstatechange=hook;},function(){if(!quiet)toast('Accès MIDI refusé');});}
/* la main que je joue se tait (piano maître ou « couper ma main ») */
VOLS.push(function(P,v){if(PN.open&&pnMine(P)&&(PN.master||PN.muteMine))return 0;return v;});
/* accompagnement : les touches s'allument */
BUS.on('show',function(ev){if(!PN.open||PN.master||ev.kind==='voice')return;const P=partById(ev.pid);if(!P)return;ev.midi.forEach(function(m){const k=m+ST.tr;pnLight(k,'p'+(P.hand||'rh'),true);setTimeout(function(){pnLight(k,'p'+(P.hand||'rh'),false);},Math.max(80,ev.dt*1000-30));});});
/* la voix chantée s'allume aussi (pour le pianiste accompagnateur) */
BUS.on('show',function(ev){if(!PN.open||ev.kind!=='voice'||ev.grace)return;const P=myPart();if(!P||ev.pid!==P.id)return;const k=ev.midi[ev.midi.length-1]+ST.tr;pnLight(k,'pv',true);setTimeout(function(){pnLight(k,'pv',false);},Math.max(80,ev.dt*1000-30));});
BUS.on('loopEnd',function(){if(!PN.open||!PN.accel)return;if(!PN.master||PN.passErr===0){const t=Math.min(100,ST.tempo+5);if(t!==ST.tempo){ST.tempo=t;LS.set('tempo:'+ST.W.id,t);transportVals();toast('⏫ '+(PN.master?'Sans faute ! ':'')+'tempo '+t+' %');}}else toast('🔁 '+PN.passErr+' faute'+(PN.passErr>1?'s':'')+' — on garde le tempo');});
BUS.on('pieceEnd',function(){if(PN.open&&PN.master&&!CONC)pnReport();});
BUS.on('stop',function(keep){if(!keep){pnClearCls('trh');pnClearCls('tlh');pnClearCls('nx');}});
function pnReport(){PN.runOn=false;const tot=PN.ok+PN.bad;if(!tot)return;const pc=Math.round(PN.ok/tot*100);
  const worst=Object.keys(PN.err).map(function(k){return {m:+k,n:PN.err[k]};}).sort(function(a,b){return b.n-a.n;}).slice(0,6);
  dlg('<h2>🎹 Bilan</h2><div class="big">'+pc+' %</div><div class="hint">'+PN.ok+' accords/notes justes · '+PN.bad+' fausse'+(PN.bad>1?'s':'')+' note'+(PN.bad>1?'s':'')+' · '+({rh:'main droite',lh:'main gauche',both:'deux mains'}[PN.hand])+'</div>'
    +(worst.length?'<h3>À retravailler</h3>'+worst.map(function(w){return '<button class="pgb" data-work="'+w.m+'">🔁 Mesure '+esc(ST.SC.meas[w.m].n)+' <small>('+w.n+' faute'+(w.n>1?'s':'')+')</small></button>';}).join(''):'<div class="hint">Aucune faute — bravo ! 🎉</div>')
    +'<div class="row"><button data-close="1" class="pri">OK</button></div>');
  $$('[data-work]').forEach(function(b){b.onclick=function(){const m=+b.dataset.work;loopSet(m-1,m+1);PN.accel=true;LS.set('pn_accel',true);ST.tempo=Math.min(ST.tempo,70);LS.set('tempo:'+ST.W.id,ST.tempo);transportVals();dlgClose();seek(Math.max(0,m-1));toast('🔁 Passage à 70 % : le tempo monte à chaque passage sans faute');};});}
/* — panneau — */
function pnSetOpen(on){PN.open=on;$('#pno').hidden=!on;if(on){setTimeout(pnKbDraw,30);if(!PN.midi&&navigator.requestMIDIAccess)pnMidi(true);}if(ST.SC)drawScore();if(PL.on){stop(true);start(false);}}
TABS.piano={title:'🎹 Piano',render:function(){const hs=pianoParts().length;
  return sw('pnopen',PN.open,'Mode piano','clavier, aides de lecture, MIDI')
   +(PN.open?(hs?'<div class="row"><label>Je joue</label><div class="chips"><button data-ph="rh" class="'+(PN.hand==='rh'?'on':'')+'">MD 👉</button><button data-ph="lh" class="'+(PN.hand==='lh'?'on':'')+'">👈 MG</button><button data-ph="both" class="'+(PN.hand==='both'?'on':'')+'">🙌 2 mains</button></div></div>':'<div class="hint">Pas de partie de piano : le clavier montre la voix.</div>')
   +sw('master',PN.master,'👨‍🏫 Piano maître','la partition attend tes bonnes notes')+(PN.master?'':sw('muteMine',PN.muteMine,'🔇 Couper ma main','tu joues par-dessus l’accompagnement'))
   +sw('accel',PN.accel,'⏫ Tempo progressif','en boucle : +5 % à chaque passage sans faute')
   +'<div class="row"><label>Noms des notes</label><div class="chips">'+[['off','aucun'],['fr','do ré mi'],['en','C D E']].map(function(x){return '<button data-pnn="'+x[0]+'" class="'+(PN.names===x[0]?'on':'')+'">'+x[1]+'</button>';}).join('')+'</div></div>'
   +sw('chords',PN.chords,'🎼 Chiffrage des accords','sous la portée de la main gauche')+sw('hcol',PN.hcol,'🎨 Couleur des mains','bleu = main droite, orange = main gauche')
   +'<div class="row"><button id="pMidi" class="'+(PN.midiN?'on':'')+'">🎹 MIDI '+(PN.midiN?'✓ connecté':'— brancher')+'</button></div>':'');}};
BUS.on('sw',function(k,on){if(k==='pnopen'){pnSetOpen(on);tabRender();return;}if(['master','muteMine','accel','chords','hcol'].indexOf(k)<0)return;PN[k]=on;LS.set('pn_'+k,on);
  if(k==='chords'||k==='hcol')drawScore();if(k==='master'){pnLightSteps();if(PL.on){stop(true);start(false);}}tabRender();});
document.addEventListener('click',function(e){const h=e.target.closest('[data-ph]');if(h){PN.hand=h.dataset.ph;LS.set('pn_hand',PN.hand);tabRender();drawScore();if(PL.on){stop(true);start(false);}return;}
  const n=e.target.closest('[data-pnn]');if(n){PN.names=n.dataset.pnn;LS.set('pn_names',PN.names);tabRender();pnKbDraw();drawScore();return;}
  if(e.target.closest('#pMidi'))pnMidi();});
document.addEventListener('pointerdown',function(e){const k=e.target.closest&&e.target.closest('#pksv [data-k]');if(!k)return;e.preventDefault();const m=+k.dataset.k;pnOn(m,.8,true);
  const up=function(){pnOff(m);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up);};window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);});
BUS.on('render',function(){if(PN.open)pnKbDraw();});BUS.on('close',function(){if(PN.open){PN.open=false;$('#pno').hidden=true;}});
window.addEventListener('resize',function(){if(PN.open)pnKbDraw();});
