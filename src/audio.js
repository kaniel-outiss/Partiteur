/* ═══════════ 🔊 SON — piano et chœur échantillonnés, métronome, salle ═══════════
   Échantillons (un toutes les 3 demi-tons, transposés à la volée), normalisés au décodage.
   Les voix tenues au-delà de l'échantillon se prolongent par fondus enchaînés (pas de boucle audible). */
'use strict';
let AC=null,MASTER=null,BUS_DRY=null,BUS_REV=null;
const SND={buf:{piano:{},aah:{},ooh:{}},ready:null};
function ac(){if(!AC){AC=new (window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});audioGraph(AC);}
  if(AC.state==='suspended')AC.resume();return AC;}
/* chaîne : sources → (sec + salle) → compresseur → sortie */
function audioGraph(A){MASTER=A.createGain();MASTER.gain.value=.9;const comp=A.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=3;comp.attack.value=.01;comp.release.value=.2;
  BUS_DRY=A.createGain();BUS_REV=A.createGain();BUS_REV.gain.value=LS.get('reverb',.22);const cv=A.createConvolver();cv.buffer=roomIR(A,2.1);
  BUS_DRY.connect(MASTER);BUS_REV.connect(cv);cv.connect(MASTER);MASTER.connect(comp);comp.connect(A.destination);sends(A,BUS_REV);}
/* envois vers la salle partagés (un nœud par instrument, pas un par note) */
function sends(A,rev){A._sp=A.createGain();A._sp.gain.value=.5;A._sp.connect(rev);A._sv=A.createGain();A._sv.gain.value=.9;A._sv.connect(rev);}
function roomIR(A,sec){const n=Math.floor(A.sampleRate*sec),b=A.createBuffer(2,n,A.sampleRate);for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<n;i++){const t=i/n;d[i]=(Math.random()*2-1)*Math.pow(1-t,3.2)*(i<A.sampleRate*.012?i/(A.sampleRate*.012):1);}}return b;}
/* décodage paresseux des échantillons */
function sndLoad(A){A=A||ac();if(SND.ready)return SND.ready;
  SND.ready=Promise.all(Object.keys(SONS).map(function(set){return Promise.all(Object.keys(SONS[set]).map(function(m){
      const bin=atob(SONS[set][m]),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
      return new Promise(function(ok){try{A.decodeAudioData(u.buffer,function(b){/* niveau : RMS de la première seconde */const d=b.getChannelData(0),n=Math.min(d.length,b.sampleRate);let s=0;for(let i=0;i<n;i++)s+=d[i]*d[i];
          SND.buf[set][+m]={b:b,g:Math.min(6,.12/Math.max(1e-4,Math.sqrt(s/n)))};ok();},function(){ok();});}catch(e){ok();}});}));}));
  return SND.ready;}
function nearest(set,m){const B=SND.buf[set];let best=null,bd=99;for(const k in B){const d=Math.abs(+k-m);if(d<bd){bd=d;best=+k;}}return best==null?null:{k:best,s:B[best]};}
function out(dest){return dest||BUS_DRY;}
/* piano : attaque de l'échantillon, étouffoir à la fin de la note */
function pianoNote(m,t,dur,vol,A){A=A||AC;const n=nearest('piano',m);if(!n)return;const src=A.createBufferSource();src.buffer=n.s.b;src.playbackRate.value=Math.pow(2,(m-n.k)/12);
  const g=A.createGain();const v=(vol==null?.6:vol)*n.s.g*.55*(m>84?.8:1);g.gain.setValueAtTime(v,t);const rel=Math.max(.08,Math.min(dur,n.s.b.duration-.2));
  g.gain.setValueAtTime(v,t+rel);g.gain.exponentialRampToValueAtTime(.0005,t+rel+.28);src.connect(g);g.connect(A===AC?BUS_DRY:A._dry);g.connect(A._sp);
  src.start(t);src.stop(t+rel+.32);}
/* voix : échantillon de chœur (« ah ») ou de voix (« oh »), prolongé par fondus enchaînés */
function voiceNote(m,t,dur,vol,A,timbre){A=A||AC;const set=(timbre||ST.timbre)==='ah'?'aah':'ooh';const n=nearest(set,m);if(!n)return;const rate=Math.pow(2,(m-n.k)/12),L=n.s.b.duration/rate;
  const outG=A.createGain();outG.connect(A===AC?BUS_DRY:A._dry);outG.connect(A._sv);
  const v=(vol==null?.6:vol)*n.s.g*.5,end=t+dur;outG.gain.setValueAtTime(.0001,t);outG.gain.exponentialRampToValueAtTime(v,t+.05);outG.gain.setValueAtTime(v,Math.max(t+.06,end-.02));outG.gain.exponentialRampToValueAtTime(.0003,end+.16);
  const seg=function(at,off,fadeIn,until){const s=A.createBufferSource();s.buffer=n.s.b;s.playbackRate.value=rate;const g=A.createGain();
    if(fadeIn){g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(1,at+.3);}else g.gain.setValueAtTime(1,at);
    s.connect(g);g.connect(outG);s.start(at,off*rate);return {s:s,g:g};};
  /* première tranche depuis l'attaque, puis des tranches prises au milieu de l'échantillon */
  const mid=Math.min(.7,L*.25);let cur=seg(t,0,false),a=t,o=0,k=0;
  while(a+(L-o)-.1<end+.2&&k<300){const x=a+(L-o)-.45;if(x<=a+.15)break;const s2=seg(x,mid,true);
    cur.g.gain.setValueAtTime(1,x);cur.g.gain.linearRampToValueAtTime(0,x+.3);cur.s.stop(x+.32);cur=s2;a=x;o=mid;k++;}
  cur.s.stop(end+.2);}
/* clic de métronome / décompte (bois) */
function clickAt(t,acc,vol,A){A=A||AC;const o=A.createOscillator(),g=A.createGain();o.type='square';o.frequency.value=acc?1760:1180;const f=A.createBiquadFilter();f.type='bandpass';f.frequency.value=acc?2600:1900;f.Q.value=3;
  const v=(vol==null?.5:vol)*(acc?1:.7);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+.002);g.gain.exponentialRampToValueAtTime(.0001,t+.06);
  o.connect(f);f.connect(g);g.connect(A===AC?BUS_DRY:A._dry);o.start(t);o.stop(t+.08);}
/* salle réglable */
function setReverb(v){LS.set('reverb',v);if(BUS_REV)BUS_REV.gain.setTargetAtTime(v,AC.currentTime,.05);}
/* contexte hors-ligne (pistes) avec la même chaîne */
function offlineCtx(sec,SR){const O=new OfflineAudioContext(2,Math.ceil(sec*SR),SR);const M=O.createGain();M.gain.value=.9;const comp=O.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=3;
  O._dry=O.createGain();O._rev=O.createGain();O._rev.gain.value=LS.get('reverb',.22);const cv=O.createConvolver();cv.buffer=roomIR(O,2.1);O._dry.connect(M);O._rev.connect(cv);cv.connect(M);M.connect(comp);comp.connect(O.destination);sends(O,O._rev);return O;}
