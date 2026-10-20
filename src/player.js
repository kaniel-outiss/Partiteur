/* ═══════════ ▶ LECTURE — horloge musicale, portes, décompte, métronome, boucle ═══════════
   Le temps musical est compté en noires (q) sur l'ordre de lecture (reprises dépliées).
   Portes (GATES) : piano maître, points d'orgue, « me suit », respirations — la lecture s'arrête au battement donné
   et repart quand le fournisseur appelle PL.release(). */
'use strict';
const PL={on:false,id:null,EV:[],k:0,clock:null,hold:null,holdBy:null,waiting:false,holdT:0,pa:0,pb:0,qEnd:0,clicks:[],ck:0,loops:0};
function spb(k){const p=ST.SC.perf[k];return 60/((p?p.bpm:60)*ST.tempo/100);}
/* plage jouée (indices dans l'ordre de lecture) */
function perfRange(){const P=ST.SC.perf;if(!P.length)return [0,0];
  if(ST.loop){const a=ST.loop[0],b=ST.loop[1];let pa=P.findIndex(function(p,k){return p.mi===a&&k>=Math.min(ST.pi,P.length-1)-0;});if(pa<0)pa=P.findIndex(function(p){return p.mi===a;});if(pa<0)pa=0;
    let pb=P.length-1;for(let k=pa;k<P.length;k++){if(P[k].mi===b){pb=k;break;}}return [pa,pb];}
  return [Math.max(0,Math.min(ST.pi||0,P.length-1)),P.length-1];}
/* volume d'une partie : mixeur, « je chante », pupitre devant, puis modificateurs des modules */
function partVol(P){const x=ST.mix[P.id]||{};if(x.mute)return 0;const solo=ST.SC.parts.some(function(Q){return (ST.mix[Q.id]||{}).solo;});if(solo&&!x.solo)return 0;
  let v=x.vol==null?1:x.vol;if(ST.sing===P.id&&!x.guide)v=0;
  if(ST.pup&&v){if(P.id===ST.pup)v*=1.45;else v*=P.kind==='voice'?.3:.6;}
  for(let i=0;i<VOLS.length;i++)v=VOLS[i](P,v);return v;}
/* son d'un événement */
function sound(ev,t,A,vol){const dur=Math.max(.06,ev.dt);const P=partById(ev.pid);if(!P)return;
  ev.midi.forEach(function(m,ni){const midi=m+ST.tr;const tt=t+(ev.arp?ni*.04:0);
    if(ev.trem&&P.kind!=='voice'){const st=.11;for(let x=0;x<dur-.03;x+=st)pianoNote(midi,tt+x,st*1.3,vol*.55,A);}
    else if(P.kind==='voice')voiceNote(midi,tt,dur,vol,A);else pianoNote(midi,tt,dur,vol*(ev.grace?.6:1),A);});}
/* horloge : battement → seconde (ralenti progressif dans les mesures « rall. ») — fonction pure, décalable (c.t) */
function makeClock(t0,pa,pb){const SC=ST.SC,T=[],S=[],R=[];let acc=0;
  for(let k=pa;k<=pb;k++){const p=SC.perf[k];T[k]=acc;S[k]=spb(k);R[k]=!!(SC.meas[p.mi]&&SC.meas[p.mi].rall);acc+=p.len*S[k]*(R[k]?1.2:1);}
  const c={t:t0,q0:SC.perf[pa].q0};
  c.at=function(q){if(q<=c.q0)return c.t+(q-c.q0)*S[pa];let lo=pa,hi=pb;while(lo<hi){const m=(lo+hi+1)>>1;if(SC.perf[m].q0<=q+1e-9)lo=m;else hi=m-1;}
    const p=SC.perf[lo],rel=q-p.q0;return c.t+T[lo]+rel*S[lo]*(R[lo]?1+.4*(rel/2)/p.len:1);};
  return c;}
/* prochaine porte (la plus proche parmi les fournisseurs) */
function nextGate(){let best=null;GATES.forEach(function(G){if(G.off&&G.off())return;const q=G.next();if(q!=null&&(!best||q<best.q-1e-9))best={q:q,G:G};});return best;}
function play(){if(PL.on){stop();return;}if(!ST.SC||!ST.SC.ev.length)return;const A=ac();
  const first=!SND.buf.piano[60]&&!Object.keys(SND.buf.piano).length;if(first)toast('🎹 Chargement des sons…',1500);
  sndLoad(A).then(function(){start(PL.loops?false:ST.count);});}
function start(countIn){const A=ac(),SC=ST.SC;const R=perfRange();PL.pa=R[0];PL.pb=R[1];const q0=SC.perf[PL.pa].q0;PL.qEnd=SC.perf[PL.pb].q0+SC.perf[PL.pb].len;
  PL.EV=SC.ev.filter(function(e){return e.pi>=PL.pa&&e.pi<=PL.pb;});PL.k=0;PL.on=true;ST.playing=true;PL.hold=null;PL.waiting=false;
  /* décompte : une mesure de temps (deux en 2/2 ou si la mesure a moins de 3 temps) */
  const m=SC.meas[SC.perf[PL.pa].mi]||{meter:[4,4]};const comp=m.meter[1]===8&&m.meter[0]%3===0;const unit=comp?1.5:4/m.meter[1];const nb=Math.max(2,Math.round((m.meter[0]*4/m.meter[1])/unit));
  const beat=unit*spb(PL.pa);let t0=A.currentTime+.15;
  if(countIn){for(let i=0;i<nb;i++)clickAt(t0+i*beat,i===0,.55);t0+=nb*beat;BUS.emit('countin',nb,beat);}
  PL.clock=makeClock(t0,PL.pa,PL.pb);PL.t0=t0;
  /* métronome : grille de temps sur la plage */
  PL.clicks=[];PL.ck=0;if(ST.metro)for(let k=PL.pa;k<=PL.pb;k++){const p=SC.perf[k],mm=SC.meas[p.mi];const cp=mm.meter[1]===8&&mm.meter[0]%3===0,u=cp?1.5:4/mm.meter[1];for(let q=0;q<p.len-1e-6;q+=u)PL.clicks.push({q:p.q0+q,acc:q<1e-6});}
  GATES.forEach(function(G){if(G.prepare)G.prepare(q0,PL.qEnd,PL.pa,PL.pb);});
  BUS.emit('play',PL.pa,PL.pb);
  $('#bPlay').classList.add('on');$('#bPlay').innerHTML=ICON.pause;
  PL.id=setInterval(tick,30);tick();uiLoop();}
function tick(){if(!PL.on)return;const A=AC,now=A.currentTime,c=PL.clock;if(PL.waiting)return;
  if(PL.hold==null){const g=nextGate();if(g){PL.hold=g.q;PL.holdBy=g.G;}}
  while(PL.ck<PL.clicks.length){const k=PL.clicks[PL.ck];if(PL.hold!=null&&k.q>=PL.hold-1e-6)break;const t=c.at(k.q);if(t>now+.2)break;PL.ck++;clickAt(Math.max(t,now),k.acc,.35);}
  while(PL.k<PL.EV.length){const ev=PL.EV[PL.k];
    if(PL.hold!=null&&ev.q>=PL.hold-1e-6){const ht=c.at(PL.hold);if(now>=ht){PL.waiting=true;PL.holdT=ht;BUS.emit('waiting',PL.holdBy,PL.hold);if(PL.holdBy.wait)PL.holdBy.wait(PL.hold);}break;}
    const t=c.at(ev.q);if(t>now+.22)break;PL.k++;
    ev.dt=Math.max(.06,c.at(ev.q+ev.d)-t);const P=partById(ev.pid);const vol=P?partVol(P):0;
    if(vol>0)sound(ev,Math.max(t,now),AC,vol);UIQ.push({t:t,ev:ev});}
  /* porte posée après le dernier événement (point d'orgue final) */
  if(PL.k>=PL.EV.length&&PL.hold!=null&&!PL.waiting){const ht=c.at(PL.hold);if(PL.hold<=PL.qEnd+1e-6&&now>=ht){PL.waiting=true;PL.holdT=ht;BUS.emit('waiting',PL.holdBy,PL.hold);if(PL.holdBy.wait)PL.holdBy.wait(PL.hold);return;}}
  if(PL.k>=PL.EV.length&&now>c.at(PL.qEnd)+.05){
    /* enchaînement de répétition : passage suivant (ou retour au premier si « en boucle ») */
    if(ST.seq){ST.seqI++;if(ST.seqI>=ST.seq.items.length){if(ST.seq.rep){ST.seqI=0;}else{ST.loop=null;stop();BUS.emit('seqEnd');return;}}
      const it=ST.seq.items[ST.seqI];ST.loop=[it.a,it.b];ST.pi=0;PL.loops++;stop(true);BUS.emit('seqStep',ST.seqI);PL.gapT=setTimeout(function(){start(false);},(ST.seq.gap||0)*1000);return;}
    if(ST.loop){PL.loops++;stop(true);BUS.emit('loopEnd');start(false);}else{stop();BUS.emit('pieceEnd');}}}
/* la porte s'ouvre : l'horloge est décalée du temps passé à attendre */
function release(){if(!PL.on)return;if(PL.waiting){const d=AC.currentTime-PL.holdT;PL.clock.t+=d;}PL.hold=null;PL.holdBy=null;PL.waiting=false;BUS.emit('released');}
function stop(keep){clearInterval(PL.id);if(!keep)clearTimeout(PL.gapT);const was=PL.on;PL.on=false;ST.playing=false;PL.waiting=false;PL.hold=null;UIQ.length=0;if(!keep)PL.loops=0;
  const b=$('#bPlay');if(b){b.classList.remove('on');b.innerHTML=ICON.play;}
  if(was&&AC){try{MASTER.gain.setTargetAtTime(0,AC.currentTime,.03);setTimeout(function(){MASTER.gain.setTargetAtTime(.9,AC.currentTime,.01);},220);}catch(e){}}
  BUS.emit('stop',!!keep);}
/* file d'affichage synchronisée sur l'audio */
const UIQ=[];
function uiLoop(){if(!PL.on&&!UIQ.length)return;const now=AC.currentTime;UIQ.sort(function(a,b){return a.t-b.t;});
  while(UIQ.length&&UIQ[0].t<=now){const u=UIQ.shift();if(u.ev.pi!==ST.pi||u.ev.mi!==ST.cur){ST.pi=u.ev.pi;ST.cur=u.ev.mi;BUS.emit('measure',ST.cur,ST.pi);}BUS.emit('show',u.ev);}
  BUS.emit('frame',now);if(PL.on||UIQ.length)requestAnimationFrame(uiLoop);}
/* position courante du curseur (battement) à l'instant `now` */
function qAt(now){if(!PL.on||!PL.clock)return null;if(PL.waiting)return PL.hold;const c=PL.clock;let lo=c.q0,hi=PL.qEnd;
  if(now<=PL.t0)return ST.SC.perf[PL.pa].q0;for(let i=0;i<30;i++){const mid=(lo+hi)/2;if(c.at(mid)<now)lo=mid;else hi=mid;}return lo;}
function seek(mi,pi){const P=ST.SC.perf;ST.cur=mi;ST.pi=pi!=null?pi:Math.max(0,P.findIndex(function(p){return p.mi===mi;}));BUS.emit('measure',ST.cur,ST.pi);BUS.emit('seek',mi);if(PL.on){stop(true);start(false);}}
/* 🎵 note de départ : la première note à chanter à partir du curseur, tenue, avec l'accord du piano */
function giveNote(withChord){const SC=ST.SC,P=myPart();if(!SC)return;const A=ac();sndLoad(A).then(function(){const q0=SC.perf[Math.max(0,ST.pi||0)].q0;
  const e=P?SC.ev.filter(function(x){return x.pid===P.id&&!x.grace&&x.q>=q0-1e-6;})[0]:null;const t=A.currentTime+.05;
  if(e){voiceNote(e.midi[e.midi.length-1]+ST.tr,t,1.8,.85);toast('🎵 '+P.name+' : '+pNameFr(e.midi[e.midi.length-1]+ST.tr,ksAfter(SC.ks,ST.tr))+' '+(Math.floor((e.midi[e.midi.length-1]+ST.tr)/12)-1)+(e.ly?' — « '+e.ly.replace(/-$/,'')+' »':''));}
  if(withChord||!e){const at=e?e.q:q0;const snd=[];SC.ev.forEach(function(x){if(x.kind!=='voice'&&x.q<=at+1e-6&&x.q+x.d>at+1e-6)x.midi.forEach(function(m){if(snd.indexOf(m)<0)snd.push(m);});});
    snd.forEach(function(m,i){pianoNote(m+ST.tr,t+(e?.0:0)+i*.03,1.8,.5);});}});}
