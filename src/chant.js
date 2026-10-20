/* ═══════════ 🎤 CHANT — justesse (micro), le piano qui te suit, respirations, ma version, prises ═══════════
   Justesse : détection YIN (~30/s), tracé sur ta portée (vert ≤30 c · orange ≤70 c · rouge), l'octave est pardonnée.
   « Me suit » : portes posées sur la lecture — entrée de phrase (attend ton attaque), point d'orgue (tient tant que tu chantes),
   respiration (petite césure ou attente de ta reprise). « Ma version » rejoue ces attentes sans micro. */
'use strict';
const PJ={on:false,stream:null,an:null,buf:null,raf:null,hist:[],res:{},meas:{},frames:0,good:0,prev:null,t0:0,run:false,mine:[]};
/* — YIN — */
function yin(x,sr){const N=x.length,W=N>>1,tmin=Math.floor(sr/1100),tmax=Math.min(W-2,Math.floor(sr/60));let rms=0;for(let i=0;i<N;i++)rms+=x[i]*x[i];rms=Math.sqrt(rms/N);if(rms<.012)return null;
  const d=new Float32Array(tmax+2);for(let t=1;t<=tmax+1;t++){let s=0;for(let i=0;i<W;i++){const v=x[i]-x[i+t];s+=v*v;}d[t]=s;}
  let run=0;const c=new Float32Array(tmax+2);c[0]=1;for(let t=1;t<=tmax+1;t++){run+=d[t];c[t]=run?d[t]*t/run:1;}
  let tau=-1;for(let t=tmin;t<=tmax;t++){if(c[t]<.13){while(t+1<=tmax&&c[t+1]<c[t])t++;tau=t;break;}}
  if(tau<0)return null;const a=c[tau-1],b=c[tau],e=c[tau+1],den=a-2*b+e;const tt=den?tau+.5*(a-e)/den:tau;return {f:sr/tt,p:1-b,rms:rms};}
const PJ_DIA=[0,.5,1,1.5,2,3,3.5,4,4.5,5,5.5,6];
function pjStep(m){const o=Math.floor(m/12)-1,pc=((m%12)+12)%12,fl=Math.floor(pc),fr=pc-fl;const a=PJ_DIA[fl],b=fl===11?7:PJ_DIA[fl+1];return o*7+a+(b-a)*fr;}
function pjName(m){return pName(Math.round(m));}
async function micStream(){return navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:false,autoGainControl:false}});}
async function pjStart(){try{const A=ac();PJ.stream=await micStream();const src=A.createMediaStreamSource(PJ.stream);PJ.an=A.createAnalyser();PJ.an.fftSize=2048;src.connect(PJ.an);PJ.buf=new Float32Array(2048);PJ.on=true;
    $('#pjHud').classList.add('on');const T=myPart();if(T&&ST.sing!==T.id){ST.sing=T.id;LS.set('sing:'+ST.W.id,ST.sing);toast('🎤 Micro ouvert — « '+T.name+' » se tait : c’est toi qui chantes');}else toast('🎤 Micro ouvert — chante !');
    pjLoop();tabRender();}catch(e){toast('🎤 Micro indisponible : '+(e.message||e.name||e));pjStop();}}
function pjStop(){PJ.on=false;cancelAnimationFrame(PJ.raf);if(PJ.stream)PJ.stream.getTracks().forEach(function(t){t.stop();});PJ.stream=null;$('#pjHud').classList.remove('on');tabRender();}
/* la note visée à l'instant présent (ma partie) */
function pjAt(now){const q=qAt(now);if(q==null)return null;const L=PJ.mine;let lo=0,hi=L.length-1,k=-1;while(lo<=hi){const m=(lo+hi)>>1;if(L[m].q<=q+1e-9){k=m;lo=m+1;}else hi=m-1;}
  if(k<0)return null;const e=L[k];const n=L[k+1];return {e:e,q:q,on:q<e.q+e.d+.02,next:n,fr:Math.min(1,(q-e.q)/Math.max(.05,(n&&n.q<e.q+e.d+.5?n.q:e.q+e.d)-e.q))};}
BUS.on('play',function(){const P=myPart();PJ.mine=P?ST.SC.ev.filter(function(e){return e.pid===P.id&&!e.grace&&e.midi.length;}):[];PJ.prev=null;
  if(PJ.on){if(!PJ.run){PJ.res={};PJ.meas={};PJ.frames=0;PJ.good=0;PJ.run=true;$$('#sv g.note').forEach(function(n){n.classList.remove('pj-ok','pj-mid','pj-bad');});}const g=$('#ovPJ');if(g)g.innerHTML='';}});
BUS.on('loopEnd',function(){const g=$('#ovPJ');if(g)g.innerHTML='';PJ.prev=null;});
function pjLoop(){if(!PJ.on)return;PJ.raf=requestAnimationFrame(pjLoop);const now=AC.currentTime;if(now-PJ.t0<.03)return;PJ.t0=now;
  PJ.an.getFloatTimeDomainData(PJ.buf);const r=yin(PJ.buf,AC.sampleRate);let midi=null;
  if(r&&r.p>.82&&r.f>55&&r.f<1200){midi=69+12*Math.log2(r.f/440);PJ.hist.push(midi);if(PJ.hist.length>3)PJ.hist.shift();const s=PJ.hist.slice().sort(function(a,b){return a-b;});midi=s[s.length>>1];}else PJ.hist=[];
  const at=PL.on&&!PL.waiting?pjAt(now):null;const tgt=at&&at.on?at.e.midi[at.e.midi.length-1]+ST.tr:null;let cents=null,cls='pjn';
  if(midi!=null&&tgt!=null){let d=(midi-tgt)*100;d=((d%1200)+1800)%1200-600;cents=d;cls=Math.abs(d)<=30?'pjg':(Math.abs(d)<=70?'pjo':'pjr');
    const o=PJ.res[at.e.base]=PJ.res[at.e.base]||{n:0,good:0};o.n++;if(Math.abs(d)<=30)o.good++;
    const M=PJ.meas[at.e.mi]=PJ.meas[at.e.mi]||{n:0,good:0};M.n++;if(Math.abs(d)<=30)M.good++;PJ.frames++;if(Math.abs(d)<=30)PJ.good++;}
  pjHud(midi,tgt,cents,cls);if(at&&midi!=null&&tgt!=null)pjDraw(at,midi,tgt,cls);else PJ.prev=null;BUS.emit('pitch',midi,now);}
function pjHud(midi,tgt,cents,cls){const h=$('#pjHud');h.querySelector('.n').textContent=midi!=null?pjName(midi):'—';
  h.querySelector('.t').textContent=tgt!=null?'visée : '+pjName(tgt):(midi!=null?Math.round((midi-Math.round(midi))*100)+' c':'chante…');
  const c=h.querySelector('.c');c.textContent=cents!=null?(cents>0?'+':'')+Math.round(cents)+' c':'';c.className='c '+cls;
  const k=h.querySelector('.k i');const v=cents!=null?Math.max(-100,Math.min(100,cents)):(midi!=null?(midi-Math.round(midi))*100:0);k.style.left=(50+v/2)+'%';k.className=cls;}
/* tracé : la voix ramenée à l'octave visée, posée sur la portée d'après la tête de la note visée */
function pjDraw(at,midi,tgt,cls){const xy=VW.noteXY[at.e.base],G=VW.geo[at.e.mi];if(!xy||!G)return;const P=partById(at.e.pid);const st=G.st[P.staff];if(!st)return;
  let m=midi;while(m-tgt>6)m-=12;while(tgt-m>6)m+=12;const sp=(st.bot-st.top)/4;const y=xy.y-(pjStep(m)-pjStep(tgt))*sp/2;
  let x2=xy.x;const n=at.next,nxy=n&&VW.noteXY[n.base];if(nxy&&VW.geo[n.mi]&&VW.geo[n.mi].sys===G.sys&&nxy.x>xy.x)x2=xy.x+(nxy.x-xy.x)*at.fr;else x2=xy.x+(G.x1-xy.x-4)*at.fr;
  const g=ovGroup('ovPJ');const p=PJ.prev;if(g&&p&&Math.abs(p.x-x2)<40&&Math.abs(p.y-y)<sp*3){const l=document.createElementNS('http://www.w3.org/2000/svg','line');l.setAttribute('x1',p.x);l.setAttribute('y1',p.y);l.setAttribute('x2',x2);l.setAttribute('y2',y);l.setAttribute('class','pjl '+cls);g.appendChild(l);}
  PJ.prev={x:x2,y:y};}
function pjPaint(){Object.keys(PJ.res).forEach(function(id){const o=PJ.res[id];if(o.n<3)return;const a=o.good/o.n,el=document.getElementById(id);if(el){el.classList.remove('pj-ok','pj-mid','pj-bad');el.classList.add(a>=.7?'pj-ok':(a>=.4?'pj-mid':'pj-bad'));}});}
BUS.on('drawn',function(){if(Object.keys(PJ.res).length)pjPaint();});
function pjReport(){PJ.run=false;if(PJ.frames<20)return;pjPaint();const pc=Math.round(PJ.good/PJ.frames*100);
  const worst=Object.keys(PJ.meas).map(function(k){const M=PJ.meas[k];return {m:+k,a:M.good/M.n,n:M.n};}).filter(function(x){return x.n>=8&&x.a<.7;}).sort(function(a,b){return a.a-b.a;}).slice(0,6);
  LS.set('pjlast:'+ST.W.id,{pc:pc,date:Date.now()});
  dlg('<h2>🎤 Justesse</h2><div class="big">'+pc+' %</div><div class="hint">du temps à moins de 30 cents de la note (l’octave ne compte pas). Tes notes sont colorées sur la partition : <b style="color:#2f8f4e">juste</b> · <b style="color:#c98a12">approximative</b> · <b style="color:#c0392b">fausse</b>.</div>'
    +(worst.length?'<h3>À retravailler</h3>'+worst.map(function(w){return '<button class="pgb" data-pjw="'+w.m+'">🔁 Mesure '+esc(ST.SC.meas[w.m].n)+' <small>('+Math.round(w.a*100)+' % juste)</small></button>';}).join(''):'<div class="hint">Toutes les mesures sont justes à plus de 70 % — bravo ! 🎉</div>')
    +'<div class="row"><button data-close="1" class="pri">OK</button></div>');
  $$('[data-pjw]').forEach(function(b){b.onclick=function(){const m=+b.dataset.pjw;loopSet(m-1,m+1);dlgClose();seek(Math.max(0,m-1));toast('🔁 Passage en boucle');};});}
BUS.on('pieceEnd',function(){if(PJ.on&&PJ.run&&!CONC)pjReport();});
BUS.on('stop',function(keep){if(!keep&&PJ.on&&PJ.run)setTimeout(pjReport,60);});
BUS.on('close',function(){if(PJ.on)pjStop();if(REC.on)recStop();VF.brEdit=false;document.body.classList.remove('bredit');});
/* ── 🤝 le piano te suit ── */
const VF={follow:false,ver:false,brEdit:false,g:[],k:0,ok:0,lastVoiced:0,sung:false,tm:null,name:'vf'};
function vfMarks(){return LS.get('br:'+ST.W.id,[]);}function vfVer(){return LS.get('ver:'+ST.W.id,{});}
const VFG={name:'vf',off:function(){return false;},
  prepare:function(q0,q1){const P=myPart();VF.g=[];VF.k=0;if(!P)return;const G={};const add=function(q,kind,e){const k=kind+':'+q.toFixed(3);if(!G[k])G[k]={q:q,kind:kind,e:e,key:k};};
    const L=ST.SC.ev.filter(function(e){return e.pid===P.id&&!e.grace&&e.q>=q0-1e-6&&e.q<q1;});let prevEnd=-99;
    L.forEach(function(e){if((VF.follow||VF.ver)&&(e.q-prevEnd>=.74))add(e.q,'entry',e);if(e.ferm&&(VF.follow||VF.ver))add(e.fermEnd!=null?e.fermEnd:e.q+e.d,'ferm',e);prevEnd=e.q+e.d;});
    vfMarks().forEach(function(k){L.forEach(function(e){if(e.mi===k.m&&Math.abs(e.t-k.t)<1e-3)add(e.q,'breath',e);});});
    VF.g=Object.keys(G).map(function(k){return G[k];}).sort(function(a,b){return a.q-b.q;});},
  next:function(){const g=VF.g[VF.k];return g?g.q:null;},
  wait:function(){const g=VF.g[VF.k];if(!g)return;VF.ok=0;VF.sung=false;const rv=vfVer()[g.key];
    if(VF.follow&&PJ.on){$('#lyr2').innerHTML='<b style="color:var(--or)">'+(g.kind==='ferm'?'𝄐 Je tiens… arrête la note quand tu veux':(g.kind==='breath'?'’ Respire… je repars avec toi':'🤝 J’attends ton attaque…'))+'</b>';return;}
    if(VF.ver&&rv!=null){VF.tm=setTimeout(vfPass,rv*1000);return;}
    if(g.kind==='breath'){VF.tm=setTimeout(vfPass,320*100/ST.tempo);return;}vfPass();}};
GATES.push(VFG);
function vfPass(){clearTimeout(VF.tm);const g=VF.g[VF.k];if(!g||!PL.on)return;
  if(PL.waiting&&VF.follow&&PJ.on){const v=vfVer();v[g.key]=Math.round((AC.currentTime-PL.holdT)*100)/100;LS.set('ver:'+ST.W.id,v);$('#lyr2').innerHTML='';}
  VF.k++;if(PL.holdBy===VFG)release();}
/* l'oreille du pianiste */
BUS.on('pitch',function(midi,now){if(!VF.follow||!PL.on||!PL.waiting||PL.holdBy!==VFG)return;const g=VF.g[VF.k];if(!g)return;const voiced=midi!=null;if(voiced){VF.lastVoiced=now;VF.sung=true;}
  if(g.kind==='ferm'){if(VF.sung&&now-VF.lastVoiced>.18)vfPass();else if(!VF.sung&&now-PL.holdT>1.2)vfPass();return;}
  if(!voiced){VF.ok=0;return;}const tgt=g.e.midi[g.e.midi.length-1]+ST.tr;let d=(midi-tgt)*100;d=((d%1200)+1800)%1200-600;if(Math.abs(d)<=90){if(++VF.ok>=2)vfPass();}else VF.ok=0;});
BUS.on('stop',function(){clearTimeout(VF.tm);});
/* — respirations : dessin + édition — */
BUS.on('drawn',function(){const P=myPart(),g=ovGroup('ovBr');if(!g)return;let h='';if(P)vfMarks().forEach(function(k){const e=ST.SC.ev.filter(function(x){return x.pid===P.id&&x.mi===k.m&&x.pass===1&&Math.abs(x.t-k.t)<1e-3;})[0];
    const xy=e&&VW.noteXY[e.base],G=VW.geo[k.m];if(!xy||!G||!G.st[P.staff])return;h+='<text x="'+(xy.x-15)+'" y="'+(G.st[P.staff].top-4)+'" class="brm">’</text>';});g.innerHTML=h;});
document.addEventListener('click',function(e){if(!VF.brEdit)return;const sc=e.target.closest('#score');if(!sc)return;e.stopPropagation();e.preventDefault();const P=myPart();if(!P)return;
  const R=$('#score').getBoundingClientRect(),x=e.clientX-R.left,y=e.clientY-R.top;let best=null;
  ST.SC.ev.forEach(function(ev){if(ev.pid!==P.id||ev.grace||ev.pass!==1)return;const xy=VW.noteXY[ev.base],G=VW.geo[ev.mi];if(!xy||!G||y<G.y0||y>G.y1)return;const d=Math.abs(xy.x-8-x);if(!best||d<best.d)best={d:d,m:ev.mi,t:ev.t};});
  if(!best||best.d>40){toast('Touche juste avant une note de ta partie');return;}
  const L=vfMarks();const k=L.findIndex(function(x){return x.m===best.m&&Math.abs(x.t-best.t)<1e-3;});if(k>=0)L.splice(k,1);else L.push({m:best.m,t:best.t});LS.set('br:'+ST.W.id,L);BUS.emit('drawn');
  toast(k>=0?'’ respiration retirée':'’ respiration posée (mes. '+ST.SC.meas[best.m].n+')');tabRender();},true);
/* ── ⏺ prises : ta voix + l'accompagnement ── */
const REC={on:false,mr:null,chunks:[],dest:null,mic:null,t0:0,tl:[],from:0,own:null};
async function recStart(){try{const A=ac();await sndLoad(A);let stream=PJ.stream;if(!stream){stream=await micStream();REC.own=stream;}
    REC.dest=A.createMediaStreamDestination();MASTER.connect(REC.dest);REC.mic=A.createMediaStreamSource(stream);REC.mg=A.createGain();REC.mg.gain.value=1.3;REC.mic.connect(REC.mg);REC.mg.connect(REC.dest);
    const mt=['audio/webm;codecs=opus','audio/ogg;codecs=opus','audio/mp4',''].filter(function(t){return !t||(window.MediaRecorder&&MediaRecorder.isTypeSupported(t));})[0];
    REC.mr=new MediaRecorder(REC.dest.stream,mt?{mimeType:mt}:undefined);REC.chunks=[];REC.tl=[];REC.from=ST.cur<0?0:ST.cur;
    REC.mr.ondataavailable=function(e){if(e.data&&e.data.size)REC.chunks.push(e.data);};REC.mr.onstop=recSave;REC.mr.start(500);REC.t0=A.currentTime;REC.on=true;
    document.body.classList.add('recording');toast('⏺ Enregistrement — la lecture démarre');tabRender();if(!PL.on)play();}
  catch(err){toast('⏺ Impossible d’enregistrer : '+(err.message||err.name));}}
function recStop(){if(!REC.on)return;REC.on=false;try{REC.mr.stop();}catch(e){}try{MASTER.disconnect(REC.dest);}catch(e){}try{REC.mic.disconnect();REC.mg.disconnect();}catch(e){}
  if(REC.own){REC.own.getTracks().forEach(function(t){t.stop();});REC.own=null;}document.body.classList.remove('recording');tabRender();}
BUS.on('measure',function(mi){if(REC.on){const t=AC.currentTime-REC.t0;const L=REC.tl;if(!L.length||L[L.length-1][1]!==mi)L.push([Math.round(t*100)/100,mi]);}});
BUS.on('pieceEnd',function(){if(REC.on)setTimeout(recStop,700);});BUS.on('stop',function(keep){if(!keep&&REC.on)setTimeout(recStop,100);});
function recSave(){const blob=new Blob(REC.chunks,{type:REC.chunks[0]&&REC.chunks[0].type||'audio/webm'});if(blob.size<2000)return;
  const tk={id:'tk'+Date.now().toString(36),w:ST.W.id,date:new Date().toISOString(),from:REC.from+1,dur:Math.round(AC.currentTime-REC.t0),tr:ST.tr,tempo:ST.tempo,tl:REC.tl,blob:blob,star:false};
  if(!IDB.db){toast('Prise non enregistrée (stockage indisponible)');return;}IDB.put(tk,'takes').then(function(){toast('✅ Prise enregistrée ('+tk.dur+' s)');TAKES=null;tabRender();});}
let TAKES=null,TKA=null;
function takesLoad(){if(!IDB.db)return Promise.resolve([]);return IDB.all('takes').then(function(a){TAKES=a.filter(function(t){return t.w===ST.W.id;}).sort(function(a,b){return b.date.localeCompare(a.date);});return TAKES;});}
function takesHTML(){if(TAKES==null){takesLoad().then(function(){if(TAB==='chant')tabRender();});return '<div class="hint">…</div>';}
  if(!TAKES.length)return '<div class="hint">Aucune prise. ⏺ : l’accompagnement joue et ta voix est enregistrée avec.</div>';
  return TAKES.map(function(t,i){const d=new Date(t.date);return '<div class="tk"><button data-tk="star" data-id="'+t.id+'" class="'+(t.star?'on':'')+'">'+(t.star?'⭐':'☆')+'</button><div><b>Prise '+(TAKES.length-i)+'</b><small>'+d.toLocaleDateString('fr-FR')+' '+d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})+' · mes. '+t.from+' · '+t.dur+' s · '+(t.tr>0?'+':'')+t.tr+' · '+t.tempo+' %</small></div>'
    +'<button data-tk="play" data-id="'+t.id+'">▶</button><button data-tk="share" data-id="'+t.id+'" title="Envoyer à ton coach">📤</button><button data-tk="del" data-id="'+t.id+'">🗑</button></div>';}).join('')+'<audio id="tkAudio" controls style="width:100%;margin-top:8px;display:none"></audio>';}
document.addEventListener('click',function(e){const b=e.target.closest('[data-tk]');if(!b||!TAKES)return;const t=TAKES.filter(function(x){return x.id===b.dataset.id;})[0];if(!t)return;const k=b.dataset.tk;
  if(k==='play'){stop();const a=$('#tkAudio');a.style.display='';if(TKA)URL.revokeObjectURL(TKA);TKA=URL.createObjectURL(t.blob);a.src=TKA;a.play();
    a.ontimeupdate=function(){let m=null;(t.tl||[]).forEach(function(x){if(x[0]<=a.currentTime)m=x[1];});if(m!=null&&m!==ST.cur&&!PL.on){ST.cur=m;ST.pi=Math.max(0,ST.SC.perf.findIndex(function(p){return p.mi===m;}));BUS.emit('measure',m,ST.pi);vwPlaceCursorAtMeasure(m);const G=VW.geo[m];if(G)vwScrollTo(VW.sys[G.sys]);}};}
  if(k==='star'){t.star=!t.star;IDB.put(t,'takes');tabRender();}
  if(k==='del'&&confirm('Supprimer cette prise ?')){IDB.del(t.id,'takes').then(function(){TAKES=null;tabRender();});}
  if(k==='share'){const ext=/ogg/.test(t.blob.type)?'ogg':(/mp4/.test(t.blob.type)?'m4a':'webm');shareFiles([new File([t.blob],fname(ST.W.title+' — prise du '+new Date(t.date).toLocaleDateString('fr-FR').replace(/\//g,'-'))+'.'+ext,{type:t.blob.type})],ST.W.title);}});
BUS.on('open',function(){TAKES=null;});
/* ── panneau 🎤 ── */
TABS.chant={title:'🎤 Chant',render:function(){const P=myPart();if(!P)return '<div class="hint">Pas de partie chantée dans cette pièce.</div>';
  const nb=vfMarks().length,nv=Object.keys(vfVer()).length,last=LS.get('pjlast:'+ST.W.id,null);
  return '<div class="row"><label>Ma partie</label><select id="mySel" style="flex:1">'+voiceParts().map(function(Q){return '<option value="'+Q.id+'"'+(Q.id===P.id?' selected':'')+'>'+esc(Q.name)+'</option>';}).join('')+'</select></div>'
   +sw('mic',PJ.on,'🎤 Justesse au micro','ta voix se dessine sur la portée, bilan à la fin'+(last?' · dernier : '+last.pc+' %':''))
   +sw('vfollow',VF.follow,'🤝 Le piano me suit','il attend tes entrées et tient tes points d’orgue (micro)')
   +sw('ver',VF.ver,'⭐ Ma version','rejoue tes attentes comme tu les as chantées'+(nv?'':' (chante d’abord avec « me suit »)'))
   +sw('brEdit',VF.brEdit,'’ Poser des respirations','touche la partition juste avant une note'+(nb?' · '+nb+' posée'+(nb>1?'s':''):''))
   +(nb||nv?'<div class="row">'+(nb?'<button data-clr="br">Effacer les respirations</button>':'')+(nv?'<button data-clr="ver">Effacer ma version</button>':'')+'</div>':'')
   +'<h4>Prises</h4><div class="row"><button id="bRec" class="'+(REC.on?'on':'')+'">'+(REC.on?'⏹ Arrêter':'⏺ Enregistrer')+'</button></div>'+takesHTML();},
  after:function(){const s=$('#mySel');if(s)s.onchange=function(){ST.sing=s.value;LS.set('sing:'+ST.W.id,ST.sing);ST.W._an=null;ST.an=anOf(ST.W);info();markMine();BUS.emit('drawn');tabRender();};}};
BUS.on('sw',function(k,on){if(k==='mic'){if(on)pjStart();else pjStop();}
  if(k==='vfollow'){VF.follow=on;if(on&&!PJ.on)pjStart();if(on)toast('🤝 Le piano attend tes entrées et tient tes points d’orgue');}
  if(k==='ver'){VF.ver=on;if(on&&!Object.keys(vfVer()).length)toast('⭐ Pas encore de version : chante une fois avec « 🤝 me suit »');}
  if(k==='brEdit'){VF.brEdit=on;document.body.classList.toggle('bredit',on);toast(on?'’ Touche juste avant une note pour poser/retirer une respiration':'’ Respirations enregistrées');}
  if((k==='vfollow'||k==='ver'||k==='brEdit')&&PL.on){stop(true);start(false);}});
document.addEventListener('click',function(e){if(e.target.closest('#bRec')){if(REC.on){stop();recStop();}else recStart();return;}
  const c=e.target.closest('[data-clr]');if(c&&confirm('Effacer ?')){LS.del((c.dataset.clr==='br'?'br:':'ver:')+ST.W.id);BUS.emit('drawn');tabRender();}});
