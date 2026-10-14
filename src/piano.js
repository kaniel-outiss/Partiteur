/* ═══════════ 🎹 MODE PIANO — clavier, MIDI, piano maître, mains séparées, aides de lecture ═══════════
   Repris de Garden / Garden Kids : couleurs par main, nom des notes dans les têtes, chiffrage des accords,
   attente des bonnes notes (accords compris), boucle + tempo progressif, bilan des mesures ratées. */
'use strict';
const PN={open:false,hand:LS.get('pn_hand','rh'),master:LS.get('pn_master',true),names:LS.get('pn_names','off'),chords:LS.get('pn_chords',false),accel:LS.get('pn_accel',false),hcol:LS.get('pn_hcol',true),
  steps:[],k:0,struck:new Set(),held:new Set(),err:{},ok:0,bad:0,passErr:0,midi:null,kb:null};
function pnHandOf(P){if(P.kind!=='piano')return null;if(P.hand)return P.hand;if(P.id==='rh'||/ MD$/.test(P.name))return 'rh';if(P.id==='lh'||/ MG$/.test(P.name))return 'lh';return (P.clef||'G')==='F'?'lh':'rh';}
function pnMine(P){const h=pnHandOf(P);return !!h&&(PN.hand==='both'||PN.hand===h);}
/* — aides dans la partition — */
function pnHandCls(P){if(!PN.open||!PN.hcol)return '';const h=pnHandOf(P);return h?(' h'+h+(pnMine(P)?' mine':'')):'';}
const FRN={C:'do',D:'ré',E:'mi',F:'fa',G:'so',A:'la',B:'si'};
function pnNameSVG(sp,x,y,hol){if(PN.names==='off')return '';const t=PN.names==='fr'?FRN[sp.L]:sp.L;return '<text x="'+x+'" y="'+(y+2.3)+'" class="nhn'+(hol?' ho':'')+'" text-anchor="middle">'+t+'</text>';}
function pnFingSVG(e,P,ex,ey0,N,up){const h=pnHandOf(P)||'rh';const f=e.fg.split(',');const pairs=e.notes.map(function(n,i){return {m:n.midi,f:f[i]||''};}).filter(function(x){return x.f&&x.f!=='0';}).sort(function(a,b){return b.m-a.m;});
  if(!pairs.length)return '';const hi=N[N.length-1],lo=N[0];let out='';
  pairs.forEach(function(q,i){const y=h==='rh'?ey0-hi.s*SP/2-(up?SP*4.1:SP*1.3)-(pairs.length-1-i)*SP*1.05:ey0-lo.s*SP/2+(up?SP*1.9:SP*4.6)+i*SP*1.05;out+='<text x="'+ex+'" y="'+y+'" class="fng" text-anchor="middle">'+q.f+'</text>';});return out;}
/* — chiffrage des accords (identification compacte, façon Garden) — */
const PN_TPL=[[[0,4,7],''],[[0,3,7],'m'],[[0,4,7,10],'7'],[[0,4,7,11],'maj7'],[[0,3,7,10],'m7'],[[0,3,6,10],'ø7'],[[0,3,6,9],'°7'],[[0,3,6],'°'],[[0,4,8],'+'],[[0,5,7],'sus4'],[[0,2,7],'sus2'],
  [[0,4,7,9],'6'],[[0,3,7,9],'m6'],[[0,2,4,7,10],'9'],[[0,2,4,7,11],'maj9'],[[0,2,3,7,10],'m9'],[[0,2,4,7],'add9'],[[0,5,7,10],'7sus4'],[[0,3,7,11],'m(maj7)'],[[0,1,4,7,10],'7♭9'],[[0,4,8,10],'7♯5'],
  [[0,4,10],'7'],[[0,4,11],'maj7'],[[0,3,10],'m7'],[[0,2,4,7,9],'6/9']];
function pnChordName(ms,ks){if(ms.length<3)return null;const bass=Math.min.apply(null,ms)%12;const pcs=[];ms.forEach(function(m){const p=m%12;if(pcs.indexOf(p)<0)pcs.push(p);});if(pcs.length<3&&!(pcs.length===2))return null;
  let best=null;pcs.forEach(function(r){const iv=pcs.map(function(p){return (p-r+12)%12;}).sort(function(a,b){return a-b;}).join(',');
    PN_TPL.forEach(function(t,ti){if(t[0].slice().sort(function(a,b){return a-b;}).join(',')!==iv)return;const sc=(r===bass?100:0)-ti;if(!best||sc>best.sc)best={sc:sc,r:r,s:t[1]};});});
  if(!best)return null;const nm=function(pc){const s=spell(60+pc,ks);return s.L+(s.acc===1?'♯':(s.acc===-1?'♭':''));};const rn=nm(best.r);const bn=function(){const iv=(bass-best.r+12)%12,L='CDEFGAB',li=(L.indexOf(rn[0])+[0,1,1,2,2,3,3,4,5,5,6,6][iv])%7;let d=((bass-[0,2,4,5,7,9,11][li])%12+12)%12;if(d>6)d-=12;return Math.abs(d)>1?nm(bass):L[li]+(d===1?'♯':(d===-1?'♭':''));};
  const r=new String(rn+best.s+(bass!==best.r?'/'+bn():''));r.key=best.r+'/'+bass+(/m|°|ø/.test(best.s)?'m':'');return r;}
function pnChordSVG(m,i,xs,xe,top,rows,ks){if(!PN.chords)return '';const PP=ST.W.parts.filter(function(P){return P.kind==='piano';});if(!PP.length)return '';
  const R0=rows.filter(function(R){return R.P.kind==='piano';})[0];if(!R0)return '';const y=top[R0.P.id]-R0.top+SP*1.3;
  const all=[];PP.forEach(function(P){(m.parts[P.id]||[]).forEach(function(V){V.forEach(function(e){if(!e.rest&&!e.grace)all.push(e);});});});
  const on=[];all.forEach(function(e){if(on.indexOf(e.t)<0)on.push(e.t);});on.sort(function(a,b){return a-b;});
  let out='',lastEnd=-99,prev=ST._lastCh&&ST._lastCh.i===i-1?ST._lastCh.n:null;
  const bassOn=on.filter(function(t){if(t<1e-6)return true;let lo=999,att=999;all.forEach(function(e){if(e.t<=t+1e-6&&e.t+e.d>t+1e-6)e.notes.forEach(function(n){lo=Math.min(lo,n.midi);if(Math.abs(e.t-t)<1e-6)att=Math.min(att,n.midi);});});return att===lo;});
  bassOn.forEach(function(t){const snd=[];all.forEach(function(e){if(e.t<=t+1e-6&&e.t+e.d>t+1e-6)e.notes.forEach(function(n){snd.push(n.midi+ST.tr);});});
    const n=pnChordName(snd,ks);const x=xs+(t/m.len)*(xe-xs);if(n&&n.key!==prev&&x>=lastEnd+4){out+='<text x="'+x+'" y="'+y+'" class="chs">'+esc(String(n))+'</text>';prev=n.key;lastEnd=x+String(n).length*7.2;}});
  ST._lastCh={i:i,n:prev};return out;}
/* — clavier à l'écran — */
function pnRange(){let lo=127,hi=0;ST.W.parts.forEach(function(P){if(P.kind!=='piano')return;ST.M.forEach(function(m){(m.parts[P.id]||[]).forEach(function(V){V.forEach(function(e){e.notes.forEach(function(n){lo=Math.min(lo,n.midi+ST.tr);hi=Math.max(hi,n.midi+ST.tr);});});});});});
  if(lo>hi){lo=48;hi=84;}lo=Math.max(21,lo-lo%12-(lo%12<3?12:0));hi=Math.min(108,hi+(11-hi%12));if(hi-lo<35)hi=lo+35;return [lo,hi];}
function pnKbDraw(){const el=$('#pkb');if(!el||!ST.W)return;const r=pnRange();PN.kb=r;const WH=[0,2,4,5,7,9,11];let wn=0;for(let m=r[0];m<=r[1];m++)if(WH.indexOf(m%12)>=0)wn++;
  const ww=Math.max(16,Math.min(34,(el.clientWidth||600)/wn)),H=86;let x=0,w='',b='';
  for(let m=r[0];m<=r[1];m++){if(WH.indexOf(m%12)>=0){w+='<rect class="kw" data-k="'+m+'" x="'+x+'" y="0" width="'+(ww-1)+'" height="'+H+'" rx="3"/>'+(m%12===0?'<text x="'+(x+ww/2)+'" y="'+(H-6)+'" class="kc" text-anchor="middle">'+(PN.names==='fr'?'do':'C')+(Math.floor(m/12)-1)+'</text>':'');x+=ww;}
    else b+='<rect class="kb" data-k="'+m+'" x="'+(x-ww*.32)+'" y="0" width="'+(ww*.64)+'" height="'+(H*.6)+'" rx="2"/>';}
  el.innerHTML='<svg width="'+x+'" height="'+H+'" id="pksv">'+w+b+'</svg>';pnLightSteps();}
function pnKey(m){return document.querySelector('#pksv [data-k="'+m+'"]');}
function pnLight(m,cls,on){const k=pnKey(m);if(k)k.classList.toggle(cls,on);}
function pnClearCls(cls){document.querySelectorAll('#pksv .'+cls).forEach(function(k){k.classList.remove(cls);});}
function pnFlash(m,cls,ms){pnLight(m,cls,true);setTimeout(function(){pnLight(m,cls,false);},ms||350);}
/* — piano maître : les étapes à jouer — */
function pnBuildSteps(from,to){const M=ST.M,map={};ST.W.parts.forEach(function(P){if(!pnMine(P))return;const h=pnHandOf(P);
  for(let i=from;i<=to;i++)(M[i].parts[P.id]||[]).forEach(function(V){V.forEach(function(e,j){if(e.rest||e.grace||!e.notes.length)return;
    const prev=j>0?V[j-1]:(i>from?lastOf(M[i-1].parts[P.id][0]):null);
    const notes=e.notes.filter(function(n){return !(prev&&prev.tie&&!prev.rest&&prev.notes.some(function(q){return q.midi===n.midi;}));});if(!notes.length)return;
    const b=Math.round((M[i].t0+e.t)*1e4)/1e4;const S=map[b]=map[b]||{beat:b,m:i,e:e,need:{},hands:{}};notes.forEach(function(n){S.need[n.midi+ST.tr]=h;});});});});
  PN.steps=Object.keys(map).map(function(k){return map[k];}).sort(function(a,b){return a.beat-b.beat;});PN.k=0;PN.struck.clear();}
function pnGate(){if(!PN.open||!PN.master||!PLAY)return null;const S=PN.steps[PN.k];return S?S.beat:null;}
function pnWaiting(){const S=PN.steps[PN.k];if(!S)return;show({m:S.m,e:S.e,P:{kind:'piano'}});pnLightSteps();}
function pnLightSteps(){pnClearCls('trh');pnClearCls('tlh');pnClearCls('nx');if(!PN.open||!PN.master)return;const S=PN.steps[PN.k],N=PN.steps[PN.k+1];
  if(S)Object.keys(S.need).forEach(function(m){pnLight(+m,'t'+S.need[m],true);});
  if(S){const k=pnKey(+Object.keys(S.need)[0]),box=$('#pkb');if(k&&box&&box.scrollWidth>box.clientWidth){const x=+k.getAttribute('x');if(x<box.scrollLeft+20||x>box.scrollLeft+box.clientWidth-40)box.scrollTo({left:x-box.clientWidth/2,behavior:'smooth'});}}if(N)Object.keys(N.need).forEach(function(m){if(!S||!S.need[m])pnLight(+m,'nx',true);});}
function pnCheck(){const S=PN.steps[PN.k];if(!S)return;const ok=Object.keys(S.need).every(function(m){return PN.struck.has(+m)||PN.held.has(+m);});if(!ok)return;
  PN.ok++;PN.k++;PN.struck.clear();
  if(PLAY&&PLAY.holdMaster){if(PLAY.waiting)resume();else{PLAY.hold=null;PLAY.holdMaster=false;}}
  pnLightSteps();}
/* — notes jouées (MIDI ou clavier à l'écran) — */
function pnOn(m,vel,screen){PN.held.add(m);pnLight(m,'dn',true);if(screen)pianoNote(m,ac().currentTime,.9,.9*(vel||.8));
  if(PN.master&&PLAY){const S=PN.steps[PN.k];if(S){if(S.need[m]){PN.struck.add(m);pnCheck();}
      else{const P=PN.steps[PN.k-1];if(!(P&&P.need[m])){PN.bad++;PN.passErr++;PN.err[S.m]=(PN.err[S.m]||0)+1;pnFlash(m,'bad');}}}}}
function pnOff(m){PN.held.delete(m);pnLight(m,'dn',false);}
function pnMidi(quiet){if(!navigator.requestMIDIAccess){if(!quiet)toast('MIDI non disponible sur cet appareil — utilise le clavier à l’écran');return;}
  navigator.requestMIDIAccess().then(function(acc){PN.midi=acc;const hook=function(){let n=0;acc.inputs.forEach(function(inp){n++;inp.onmidimessage=function(e){const d=e.data,c=d[0]&0xf0;if(c===0x90&&d[2]>0)pnOn(d[1],d[2]/127);else if(c===0x80||(c===0x90&&d[2]===0))pnOff(d[1]);};});
      $('#pMidi').textContent=n?'🎹 MIDI ✓':'🎹 MIDI : aucun';$('#pMidi').classList.toggle('on',!!n);};hook();acc.onstatechange=hook;},function(){if(!quiet)toast('Accès MIDI refusé');});}
/* — volume : la main que je joue se tait en piano maître — */
const _pv=partVol;partVol=function(P){const v=_pv(P);if(PN.open&&pnMine(P)&&(PN.master||PN.muteMine))return 0;return v;};
/* — lecture : préparer les étapes / bilan / tempo progressif — */
const _play=play;play=function(){if(PLAY){_play();return;}if(PN.open&&PN.master){const from=ST.loop?ST.loop[0]:Math.max(0,ST.cur<0?0:ST.cur),to=ST.loop?ST.loop[1]:ST.M.length-1;pnBuildSteps(from,to);PN.passErr=0;if(!PN.runOn){PN.err={};PN.ok=0;PN.bad=0;PN.runOn=true;}}
  _play();pnLightSteps();};
function onLoopEnd(){if(!PN.open)return;if(PN.accel){if(!PN.master||PN.passErr===0){const t=Math.min(PN.master?100:100,ST.tempo+5);if(t!==ST.tempo){ST.tempo=t;LS.set('tempo:'+ST.W.id,t);$('#tmp').textContent=t+' %';toast('⏫ '+(PN.master?'Sans faute ! ':'')+'tempo '+t+' %');}}else toast('🔁 '+PN.passErr+' faute'+(PN.passErr>1?'s':'')+' — on garde le tempo');}}
const _ope=onPieceEnd;onPieceEnd=function(){_ope.apply(this,arguments);if(PN.open&&PN.master&&!CONC)pnReport();};
function pnReport(){PN.runOn=false;const tot=PN.ok+PN.bad;if(!tot)return;const pc=Math.round(PN.ok/tot*100);
  const worst=Object.keys(PN.err).map(function(k){return {m:+k,n:PN.err[k]};}).sort(function(a,b){return b.n-a.n;}).slice(0,6);
  dlg('<h2>🎹 Bilan</h2><div class="big">'+pc+' %</div><div class="hint">'+PN.ok+' accords/notes justes · '+PN.bad+' fausse'+(PN.bad>1?'s':'')+' note'+(PN.bad>1?'s':'')+' · '+({rh:'main droite',lh:'main gauche',both:'deux mains'}[PN.hand])+'</div>'
    +(worst.length?'<h3>À retravailler</h3>'+worst.map(function(w){return '<button class="pgb" data-work="'+w.m+'">🔁 Mesure '+(w.m+1)+' <small>('+w.n+' faute'+(w.n>1?'s':'')+')</small></button>';}).join(''):'<div class="hint">Aucune faute — bravo ! 🎉</div>')
    +'<div class="row"><button data-close="1" class="pri">OK</button></div>');
  document.querySelectorAll('[data-work]').forEach(function(b){b.onclick=function(){const m=+b.dataset.work,a=Math.max(0,m-1),z=Math.min(ST.M.length-1,m+1);ST.loop=[a,z];markLoop();PN.accel=true;LS.set('pn_accel',true);ST.tempo=Math.min(ST.tempo,70);LS.set('tempo:'+ST.W.id,ST.tempo);$('#tmp').textContent=ST.tempo+' %';pnBar();dlgClose();seek(a);toast('🔁 Mesures '+(a+1)+' → '+(z+1)+' à 70 %, le tempo monte à chaque passage sans faute');};});}
const _stop=stop;stop=function(keep){const was=!!PLAY;_stop.apply(this,arguments);if(!keep){pnClearCls('trh');pnClearCls('tlh');pnClearCls('nx');}};
/* — accompagnement : les touches s'allument (hors piano maître) — */
const _su=scheduleUI;scheduleUI=function(ev,t){_su(ev,t);if(!PN.open||PN.master||ev.P.kind!=='piano'||!PLAY||!PLAY.btt)return;const h=pnHandOf(ev.P);const t1=PLAY.btt(ev.beat+ev.d);const now=AC.currentTime;
  ev.e.notes.forEach(function(n){const m=n.midi+ST.tr;setTimeout(function(){pnLight(m,'p'+h,true);},Math.max(0,(t-now)*1000));setTimeout(function(){pnLight(m,'p'+h,false);},Math.max(0,(t1-now)*1000-30));});};
/* — panneau — */
function pnBar(){const b=$('#pbar');if(!b)return;const hs=ST.W&&ST.W.parts.some(function(P){return P.kind==='piano';});
  b.innerHTML=(hs?'<div class="grp"><button data-ph="rh" class="'+(PN.hand==='rh'?'on':'')+'">MD 👉</button><button data-ph="lh" class="'+(PN.hand==='lh'?'on':'')+'">👈 MG</button><button data-ph="both" class="'+(PN.hand==='both'?'on':'')+'">🙌 2 mains</button></div>':'<span class="hint">Pas de partie de piano dans cette pièce</span>')
    +'<button data-po="master" class="'+(PN.master?'on':'')+'" title="La partition attend tes bonnes notes">👨‍🏫 Piano maître</button>'
    +(PN.master?'':'<button data-po="muteMine" class="'+(PN.muteMine?'on':'')+'" title="Couper la main que tu joues">🔇 ma main</button>')
    +'<button data-po="accel" class="'+(PN.accel?'on':'')+'" title="En boucle : +5 % à chaque passage sans faute">⏫ tempo</button>'
    +'<button data-po="names" class="'+(PN.names!=='off'?'on':'')+'">'+({off:'🔤 noms',fr:'🔤 do ré mi',en:'🔤 C D E'}[PN.names])+'</button>'
    +'<button data-po="chords" class="'+(PN.chords?'on':'')+'">🎼 accords</button><button data-po="hcol" class="'+(PN.hcol?'on':'')+'">🎨 mains</button>'
    +'<button id="pMidi" class="'+(PN.midi?'on':'')+'">🎹 MIDI</button>';}
document.addEventListener('click',function(e){
  const h=e.target.closest('[data-ph]');if(h){PN.hand=h.dataset.ph;LS.set('pn_hand',PN.hand);pnBar();drawScore();if(PLAY){stop();play();}return;}
  const o=e.target.closest('[data-po]');if(o){const k=o.dataset.po;if(k==='names'){PN.names={off:'fr',fr:'en',en:'off'}[PN.names];LS.set('pn_names',PN.names);pnKbDraw();}else{PN[k]=!PN[k];LS.set('pn_'+k,PN[k]);}
    pnBar();if(k==='names'||k==='chords'||k==='hcol')drawScore();if(k==='master'){pnLightSteps();if(PLAY){stop(true);play();}}return;}
  if(e.target.closest('#pMidi')){pnMidi();return;}
  if(e.target.closest('#bPiano')){PN.open=!PN.open;document.body.classList.toggle('pmode',PN.open);$('#bPiano').classList.toggle('on',PN.open);if(PN.open){pnBar();setTimeout(pnKbDraw,30);if(!PN.midi&&navigator.requestMIDIAccess)pnMidi(true);}drawScore();return;}});
/* clavier à l'écran : toucher = jouer */
document.addEventListener('pointerdown',function(e){const k=e.target.closest&&e.target.closest('#pksv [data-k]');if(!k)return;e.preventDefault();const m=+k.dataset.k;pnOn(m,.8,true);const up=function(){pnOff(m);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up);};window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);});
/* le clavier suit la pièce et la transposition */
const _rd=render;render=function(){_rd.apply(this,arguments);if(PN.open){pnBar();pnKbDraw();}};
window.addEventListener('resize',function(){if(PN.open)pnKbDraw();});
