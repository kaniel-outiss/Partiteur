/* ═══════════ 🎤 JUSTESSE — le micro écoute, ta voix se dessine sur la portée ═══════════
   Détection de hauteur YIN (≈30 mesures/s), tracé en direct sur la ligne de chant (vert juste · orange ±30-70 cents · rouge),
   écart en cents, erreurs d'octave pardonnées (une basse peut chanter un air de ténor à l'octave),
   bilan par mesure + couleur de chaque note chantée, bouton « travailler ce passage ». */
'use strict';
const PJ={on:false,stream:null,an:null,buf:null,raf:null,last:null,hist:[],q:[],res:new Map(),meas:{},frames:0,good:0,prevPt:null,t0:0};
function pjTarget(){return typeof lyPart==='function'?lyPart():null;}
/* — YIN — */
function yin(x,sr){const N=x.length,W=N>>1,tmin=Math.floor(sr/1100),tmax=Math.min(W-2,Math.floor(sr/60));let rms=0;for(let i=0;i<N;i++)rms+=x[i]*x[i];rms=Math.sqrt(rms/N);if(rms<.012)return null;
  const d=new Float32Array(tmax+2);for(let t=1;t<=tmax+1;t++){let s=0;for(let i=0;i<W;i++){const v=x[i]-x[i+t];s+=v*v;}d[t]=s;}
  let run=0;const c=new Float32Array(tmax+2);c[0]=1;for(let t=1;t<=tmax+1;t++){run+=d[t];c[t]=run?d[t]*t/run:1;}
  let tau=-1;for(let t=tmin;t<=tmax;t++){if(c[t]<.13){while(t+1<=tmax&&c[t+1]<c[t])t++;tau=t;break;}}
  if(tau<0)return null;const a=c[tau-1],b=c[tau],e=c[tau+1],den=a-2*b+e;const tt=den?tau+.5*(a-e)/den:tau;return {f:sr/tt,p:1-b,rms:rms};}
const PJ_DIA=[0,.5,1,1.5,2,3,3.5,4,4.5,5,5.5,6];
function pjStep(m){const o=Math.floor(m/12)-1,pc=((m%12)+12)%12,fl=Math.floor(pc),fr=pc-fl;const a=PJ_DIA[fl],b=fl===11?7:PJ_DIA[fl+1];return o*7+a+(b-a)*fr;}
function pjName(m){const r=Math.round(m);return SH[((r%12)+12)%12].replace('#','♯')+(Math.floor(r/12)-1);}
/* — micro — */
async function pjStart(){try{const A=ac();PJ.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:false,autoGainControl:false}});
    const src=A.createMediaStreamSource(PJ.stream);PJ.an=A.createAnalyser();PJ.an.fftSize=2048;src.connect(PJ.an);PJ.buf=new Float32Array(2048);PJ.on=true;
    $('#bPitch').classList.add('on');$('#pjHud').classList.add('on');document.body.classList.add('pjmode');
    const T=pjTarget();if(T&&ST.sing!==T.id){ST.sing=T.id;LS.set('sing:'+ST.W.id,ST.sing);$('#mixer').innerHTML=mixerHTML();toast('🎤 Micro ouvert — « '+T.name+' » est coupé : c’est toi qui chantes');}else toast('🎤 Micro ouvert — chante !');
    pjLoop();}catch(e){toast('🎤 Micro indisponible : '+(e.message||e.name||e));pjStop();}}
function pjStop(){PJ.on=false;cancelAnimationFrame(PJ.raf);if(PJ.stream)PJ.stream.getTracks().forEach(function(t){t.stop();});PJ.stream=null;
  const b=$('#bPitch');if(b)b.classList.remove('on');$('#pjHud').classList.remove('on');document.body.classList.remove('pjmode');}
/* — la note visée et la position sur la partition à l'instant présent — */
const _su2=scheduleUI;scheduleUI=function(ev,t){_su2(ev,t);const T=pjTarget();if(!PJ.on||!T||ev.P.id!==T.id||!PLAY||!PLAY.btt)return;
  if(ev.e.grace)return;PJ.q.push({e:ev.e,m:ev.m,t:t,t1:PLAY.btt(ev.beat+ev.d)});if(PJ.q.length>64)PJ.q.shift();};
function pjNow(now){const q=PJ.q;let k=-1;for(let i=q.length-1;i>=0;i--)if(q[i].t<=now){k=i;break;}if(k<0)return null;const c=q[k];
  const g=ST.geo&&ST.geo[c.m];if(!g)return null;let nx=null;const n=q[k+1];if(n&&ST.geo[n.m]&&ST.geo[n.m].y0===g.y0&&n.e._x>c.e._x)nx=n.e._x;if(nx==null)nx=Math.max(c.e._x+8,g.x1-6);
  const end=n?Math.min(n.t,c.t1):c.t1;const fr=Math.max(0,Math.min(1,(now-c.t)/Math.max(.05,end-c.t)));
  return {c:c,x:c.e._x+(nx-c.e._x)*fr,g:g,sounding:now<=c.t1+.02};}
function pjTargetMidi(c){const T=pjTarget();if(!c||c.e.rest||!c.e.notes.length)return null;return c.e.notes[c.e.notes.length-1].midi+(T.oct||0)+ST.tr;}
/* — boucle d'analyse — */
function pjLoop(){if(!PJ.on)return;PJ.raf=requestAnimationFrame(pjLoop);const now=AC.currentTime;if(now-PJ.t0<.03)return;PJ.t0=now;
  PJ.an.getFloatTimeDomainData(PJ.buf);const r=yin(PJ.buf,AC.sampleRate);let midi=null;
  if(r&&r.p>.82&&r.f>55&&r.f<1200){midi=69+12*Math.log2(r.f/440);PJ.hist.push(midi);if(PJ.hist.length>3)PJ.hist.shift();const s=PJ.hist.slice().sort(function(a,b){return a-b;});midi=s[s.length>>1];}else PJ.hist=[];
  const at=PLAY?pjNow(now):null;const tgt=at&&at.sounding?pjTargetMidi(at.c):null;let cents=null,cls='pjn';
  if(midi!=null&&tgt!=null){let d=(midi-tgt)*100;d=((d%1200)+1800)%1200-600;cents=d;cls=Math.abs(d)<=30?'pjg':(Math.abs(d)<=70?'pjo':'pjr');
    const key=at.c.e;const o=PJ.res.get(key)||{n:0,sum:0,good:0};o.n++;o.sum+=Math.abs(d);if(Math.abs(d)<=30)o.good++;PJ.res.set(key,o);
    const M=PJ.meas[at.c.m]=PJ.meas[at.c.m]||{n:0,good:0};M.n++;if(Math.abs(d)<=30)M.good++;PJ.frames++;if(Math.abs(d)<=30)PJ.good++;}
  pjHud(midi,tgt,cents,cls);if(at&&midi!=null)pjDraw(at,midi,tgt,cls);else PJ.prevPt=null;}
function pjHud(midi,tgt,cents,cls){const h=$('#pjHud');if(!h)return;
  h.querySelector('.n').textContent=midi!=null?pjName(midi):'—';h.querySelector('.t').textContent=tgt!=null?'visée : '+pjName(tgt):(midi!=null?Math.round((midi-Math.round(midi))*100)+' c':'chante…');
  const c=h.querySelector('.c');c.textContent=cents!=null?(cents>0?'+':'')+Math.round(cents)+' c':'';c.className='c '+cls;
  const k=h.querySelector('.k i');const v=cents!=null?Math.max(-100,Math.min(100,cents)):(midi!=null?(midi-Math.round(midi))*100:0);k.style.left=(50+v/2)+'%';k.className=cls;}
function pjDraw(at,midi,tgt,cls){const T=pjTarget(),sv=$('#sv');if(!sv||!T)return;let g=sv.querySelector('#pjTrace');if(!g){g=document.createElementNS('http://www.w3.org/2000/svg','g');g.id='pjTrace';sv.appendChild(g);}
  const top=at.g.top&&at.g.top[T.id];if(top==null)return;
  /* ramener la voix à l'octave de la note visée (basse sur un air de ténor…) puis vers la hauteur affichée */
  let m=midi;if(tgt!=null){while(m-tgt>6)m-=12;while(tgt-m>6)m+=12;}
  const shown=clefOf(T,null,0)!==(T.clef||'G')?m:m-(T.oct||0);const cl=clefOf(T,null,0),B=cl==='F'?18:30;const y=top+SP*4-(pjStep(shown)-B)*SP/2;
  const p=PJ.prevPt;if(p&&Math.abs(p.x-at.x)<30&&Math.abs(p.y-y)<SP*3){const l=document.createElementNS('http://www.w3.org/2000/svg','line');l.setAttribute('x1',p.x);l.setAttribute('y1',p.y);l.setAttribute('x2',at.x);l.setAttribute('y2',y);l.setAttribute('class','pjl '+cls);g.appendChild(l);}
  PJ.prevPt={x:at.x,y:y};}
/* — résultat sur les notes — */
function pjCls(e,P){const o=PJ.res.get(e);if(!o||o.n<3)return '';const a=o.good/o.n;return a>=.7?' pj-ok':(a>=.4?' pj-mid':' pj-bad');}
/* — démarrage / bilan — */
const _play2=play;play=function(){if(!PLAY&&PJ.on){PJ.q=[];PJ.prevPt=null;if(!PJ.run){PJ.res=new Map();PJ.meas={};PJ.frames=0;PJ.good=0;PJ.run=true;}const g=$('#pjTrace');if(g)g.remove();}_play2();};
const _ope2=onPieceEnd;onPieceEnd=function(){_ope2.apply(this,arguments);if(PJ.on&&PJ.run&&!CONC)pjReport();};
const _ole=onLoopEnd;onLoopEnd=function(){_ole.apply(this,arguments);if(PJ.on){PJ.q=[];PJ.prevPt=null;const g=$('#pjTrace');if(g)g.remove();}};
function pjReport(){PJ.run=false;if(PJ.frames<20)return;const pc=Math.round(PJ.good/PJ.frames*100);drawScore();
  const worst=Object.keys(PJ.meas).map(function(k){const M=PJ.meas[k];return {m:+k,a:M.good/M.n,n:M.n};}).filter(function(x){return x.n>=8&&x.a<.7;}).sort(function(a,b){return a.a-b.a;}).slice(0,6);
  dlg('<h2>🎤 Justesse</h2><div class="big">'+pc+' %</div><div class="hint">du temps à moins de 30 cents de la note (l’octave ne compte pas). Les notes sont colorées sur la partition : <b style="color:#2f8f4e">juste</b> · <b style="color:#c98a12">approximative</b> · <b style="color:#c0392b">fausse</b>.</div>'
    +(worst.length?'<h3>À retravailler</h3>'+worst.map(function(w){return '<button class="pgb" data-pjw="'+w.m+'">🔁 Mesure '+(w.m+1)+' <small>('+Math.round(w.a*100)+' % juste)</small></button>';}).join(''):'<div class="hint">Toutes les mesures sont justes à plus de 70 % — bravo ! 🎉</div>')
    +'<div class="row"><button data-close="1" class="pri">OK</button></div>');
  document.querySelectorAll('[data-pjw]').forEach(function(b){b.onclick=function(){const m=+b.dataset.pjw,a=Math.max(0,m-1),z=Math.min(ST.M.length-1,m+1);ST.loop=[a,z];markLoop();dlgClose();seek(a);toast('🔁 Mesures '+(a+1)+' → '+(z+1)+' en boucle');};});}
document.addEventListener('click',function(e){if(e.target.closest('#bStop')&&PJ.on&&PJ.run)setTimeout(pjReport,60);},true);
document.addEventListener('click',function(e){if(e.target.closest('#bPitch')){if(PJ.on)pjStop();else pjStart();}});
const _bk2=function(){if(PJ.on)pjStop();};document.addEventListener('click',function(e){if(e.target.closest('#bBack'))_bk2();},true);
