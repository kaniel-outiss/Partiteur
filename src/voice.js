/* ═══════════ 🤝 LE PIANISTE QUI TE SUIT · ’ RESPIRATIONS · ⭐ MA VERSION · ⏺ PRISES ═══════════
   Portes (« gates ») posées sur la lecture, comme le piano maître :
   · entrée de phrase (note chantée après un silence)  → le piano attend que tu attaques la note (micro)
   · fin d'un point d'orgue chanté                     → le piano tient tant que tu chantes, repart quand tu t'arrêtes
   · respiration posée par toi                          → petite césure (ou attente de ta reprise si « me suit »)
   « Ma version » retient la durée de chaque attente quand le piano te suit, puis la rejoue sans micro.
   Prises : ta voix + l'accompagnement enregistrés ensemble, réécoute avec la partition qui défile. */
'use strict';
const VF={follow:false,ver:false,brEdit:false,g:[],k:0,ok:0,lastVoiced:0,sung:false,rec:null};
function vfMarks(){return LS.get('br:'+ST.W.id,[]);}
function vfVer(){return LS.get('ver:'+ST.W.id,{});}
function vfBuild(from,to){const P=lyPart();VF.g=[];VF.k=0;if(!P)return;const M=ST.M;const marks=vfMarks();const G={};
  const add=function(beat,kind,e,m){const k=kind+':'+beat.toFixed(3);if(!G[k])G[k]={beat:beat,kind:kind,e:e,m:m,key:k};};
  let prevRest=true;for(let i=from;i<=to;i++)(M[i].parts[P.id][0]||[]).forEach(function(e,j,V){if(e.grace)return;
    if(e.rest){prevRest=prevRest||e.d>=1;if(e.d>=.75)prevRest=true;return;}
    const prev=j>0?V[j-1]:(i>from?lastOf(M[i-1].parts[P.id][0]):null);const tied=prev&&prev.tie&&!prev.rest;const b=M[i].t0+e.t;
    if(prevRest&&!tied&&(VF.follow||VF.ver))add(b,'entry',e,i);
    if(e.ferm&&(VF.follow||VF.ver))add(b+e.d,'ferm',e,i);prevRest=false;});
  marks.forEach(function(k){if(k.m<from||k.m>to)return;const V=M[k.m].parts[P.id][0]||[];const e=V.filter(function(x){return Math.abs(x.t-k.t)<1e-4;})[0];if(e)add(M[k.m].t0+k.t,'breath',e,k.m);});
  VF.g=Object.keys(G).map(function(k){return G[k];}).sort(function(a,b){return a.beat-b.beat;});}
function vfGate(){if(!PLAY)return null;const g=VF.g[VF.k];return g?g.beat:null;}
const _pg=pnGate;pnGate=function(){const a=_pg(),b=vfGate();if(PLAY)PLAY.vfOn=b!=null&&(a==null||b<=a+1e-6);if(a==null)return b;if(b==null)return a;return Math.min(a,b);};
const _pw=pnWaiting;pnWaiting=function(){const g=VF.g[VF.k];if(PLAY&&PLAY.vfOn&&g&&Math.abs(PLAY.hold-g.beat)<1e-6){vfWaiting(g);return;}_pw();};
function vfWaiting(g){VF.ok=0;VF.sung=false;const sp=100/ST.tempo;const rv=vfVer()[g.key];
  if(VF.follow&&PJ.on){$('#vfHint').textContent=g.kind==='ferm'?'𝄐 Je tiens… arrête la note quand tu veux':(g.kind==='breath'?'’ Respire… je repars avec toi':'🤝 J’attends ton attaque…');$('#vfHint').classList.add('on');return;}
  if(VF.ver&&rv!=null){VF.tm=setTimeout(vfPass,rv*1000);return;}
  if(g.kind==='breath'){VF.tm=setTimeout(vfPass,320*sp);return;}vfPass();}
function vfPass(){clearTimeout(VF.tm);$('#vfHint').classList.remove('on');const g=VF.g[VF.k];if(!g||!PLAY)return;
  if(PLAY.waiting&&VF.follow&&PJ.on){const v=vfVer();v[g.key]=Math.round((AC.currentTime-PLAY.holdT)*100)/100;LS.set('ver:'+ST.W.id,v);}
  VF.k++;if(PLAY.waiting&&PLAY.holdMaster)resume();else if(PLAY.holdMaster){PLAY.hold=null;PLAY.holdMaster=false;}}
/* — l'oreille du pianiste : la boucle du micro — */
const _pl=pjLoop;pjLoop=function(){_pl();if(!PJ.on||!VF.follow||!PLAY||!PLAY.waiting||!PLAY.vfOn)return;const g=VF.g[VF.k];if(!g)return;
  const now=AC.currentTime,voiced=PJ.hist.length>0;if(voiced){VF.lastVoiced=now;VF.sung=true;}
  if(g.kind==='ferm'){if(VF.sung&&now-VF.lastVoiced>.18)vfPass();else if(!VF.sung&&now-PLAY.holdT>1.2)vfPass();return;}
  if(!voiced){VF.ok=0;return;}const s=PJ.hist.slice().sort(function(a,b){return a-b;}),m=s[s.length>>1];const T=lyPart();
  const tgt=g.e.notes[g.e.notes.length-1].midi+(T.oct||0)+ST.tr;let d=(m-tgt)*100;d=((d%1200)+1800)%1200-600;
  if(Math.abs(d)<=90){if(++VF.ok>=2)vfPass();}else VF.ok=0;};
const _play3=play;play=function(){if(!PLAY){const from=ST.loop?ST.loop[0]:Math.max(0,ST.cur<0?0:ST.cur),to=ST.loop?ST.loop[1]:ST.M.length-1;vfBuild(from,to);}_play3();};
const _stop3=stop;stop=function(){clearTimeout(VF.tm);const h=$('#vfHint');if(h)h.classList.remove('on');return _stop3.apply(this,arguments);};
/* — respirations : dessin + édition — */
const _ds=drawScore;drawScore=function(){_ds.apply(this,arguments);const P=lyPart(),sv=$('#sv');if(!P||!sv||!ST.geo)return;let h='';
  vfMarks().forEach(function(k){const g=ST.geo[k.m];if(!g||!g.top||g.top[P.id]==null)return;const e=(ST.M[k.m].parts[P.id][0]||[]).filter(function(x){return Math.abs(x.t-k.t)<1e-4;})[0];if(!e||e._x==null)return;
    h+='<text x="'+(e._x-SP*1.5)+'" y="'+(g.top[P.id]-SP*.4)+'" class="brm">’</text>';});
  if(h)sv.insertAdjacentHTML('beforeend','<g id="brg">'+h+'</g>');document.body.classList.toggle('bredit',VF.brEdit);};
document.addEventListener('click',function(e){if(!VF.brEdit)return;const z=e.target.closest('#sv');if(!z)return;e.stopPropagation();e.preventDefault();
  const P=lyPart();if(!P)return;const pt=z.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;const q=pt.matrixTransform(z.getScreenCTM().inverse());
  let best=null;ST.M.forEach(function(m,i){const g=ST.geo[i];if(!g||q.y<g.y0||q.y>g.y1||q.x<g.x0-10||q.x>g.x1+10)return;(m.parts[P.id][0]||[]).forEach(function(ev){if(ev.rest||ev.grace||ev._x==null)return;const d=Math.abs(ev._x-SP*.8-q.x);if(!best||d<best.d)best={d:d,m:i,t:ev.t};});});
  if(!best||best.d>40){toast('Touche juste avant une note du chant');return;}
  const L=vfMarks();const k=L.findIndex(function(x){return x.m===best.m&&Math.abs(x.t-best.t)<1e-4;});if(k>=0)L.splice(k,1);else L.push({m:best.m,t:best.t});LS.set('br:'+ST.W.id,L);drawScore();
  toast(k>=0?'’ respiration retirée':'’ respiration posée (mes. '+(best.m+1)+')');},true);

/* — ⏺ prises : voix + accompagnement — */
const REC={on:false,mr:null,chunks:[],dest:null,mic:null,t0:0,tl:[],from:0};
async function recStart(){try{const A=ac();let stream=PJ.stream;if(!stream){stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:false,autoGainControl:false}});REC.own=stream;}
    REC.dest=A.createMediaStreamDestination();MASTER.connect(REC.dest);REC.mic=A.createMediaStreamSource(stream);const mg=A.createGain();mg.gain.value=1.3;REC.mic.connect(mg);mg.connect(REC.dest);REC.mg=mg;
    const mt=['audio/webm;codecs=opus','audio/ogg;codecs=opus','audio/mp4',''].filter(function(t){return !t||(window.MediaRecorder&&MediaRecorder.isTypeSupported(t));})[0];
    REC.mr=new MediaRecorder(REC.dest.stream,mt?{mimeType:mt}:undefined);REC.chunks=[];REC.tl=[];REC.from=ST.loop?ST.loop[0]:Math.max(0,ST.cur<0?0:ST.cur);
    REC.mr.ondataavailable=function(e){if(e.data&&e.data.size)REC.chunks.push(e.data);};REC.mr.onstop=recSave;REC.mr.start(500);REC.t0=A.currentTime;REC.on=true;
    $('#bRec').classList.add('on');document.body.classList.add('recording');toast('⏺ Enregistrement — la lecture démarre');if(!PLAY)play();}
  catch(err){toast('⏺ Impossible d’enregistrer : '+(err.message||err.name));}}
function recStop(){if(!REC.on)return;REC.on=false;try{REC.mr.stop();}catch(e){}try{MASTER.disconnect(REC.dest);}catch(e){}try{REC.mic.disconnect();REC.mg.disconnect();}catch(e){}
  if(REC.own){REC.own.getTracks().forEach(function(t){t.stop();});REC.own=null;}$('#bRec').classList.remove('on');document.body.classList.remove('recording');}
const _sh2=show;show=function(ev){_sh2(ev);if(REC.on){const t=AC.currentTime-REC.t0;const L=REC.tl;if(!L.length||L[L.length-1][1]!==ev.m)L.push([Math.round(t*100)/100,ev.m]);}};
const _ope3=onPieceEnd;onPieceEnd=function(){_ope3.apply(this,arguments);if(REC.on)setTimeout(recStop,600);};
document.addEventListener('click',function(e){if(e.target.closest('#bStop')&&REC.on)setTimeout(recStop,100);},true);
function takesDB(mode){return IDB.db.transaction('takes',mode).objectStore('takes');}
function recSave(){const blob=new Blob(REC.chunks,{type:REC.chunks[0]&&REC.chunks[0].type||'audio/webm'});if(blob.size<2000)return;
  const tk={id:'tk'+Date.now().toString(36),w:ST.W.id,date:new Date().toISOString(),from:REC.from+1,dur:Math.round(AC.currentTime-REC.t0),tr:ST.tr,tempo:ST.tempo,tl:REC.tl,blob:blob,star:false};
  if(!IDB.db){toast('Prise non enregistrée (stockage indisponible)');return;}const r=takesDB('readwrite').put(tk);r.onsuccess=function(){toast('✅ Prise enregistrée ('+tk.dur+' s) — 🎙 pour réécouter');};}
function takesList(cb){if(!IDB.db)return cb([]);const r=takesDB('readonly').getAll();r.onsuccess=function(){cb((r.result||[]).filter(function(t){return t.w===ST.W.id;}).sort(function(a,b){return b.date.localeCompare(a.date);}));};r.onerror=function(){cb([]);};}
let TKA=null;
function takesDlg(){takesList(function(L){
  dlg('<h2>🎙 Mes prises — '+esc(ST.W.title)+'</h2>'+(L.length?'':'<div class="hint">Aucune prise. Appuie sur ⏺ : l’accompagnement joue et ta voix est enregistrée avec.</div>')
    +L.map(function(t,i){const d=new Date(t.date);return '<div class="tk"><button data-tk="star" data-id="'+t.id+'" class="'+(t.star?'on':'')+'" title="Meilleure prise">'+(t.star?'⭐':'☆')+'</button><div><b>Prise '+(L.length-i)+'</b><small>'+d.toLocaleDateString('fr-FR')+' '+d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})+' · mes. '+t.from+' · '+t.dur+' s · ton '+(t.tr>0?'+':'')+t.tr+' · '+t.tempo+' %</small></div>'
      +'<button data-tk="play" data-id="'+t.id+'">▶</button><button data-tk="share" data-id="'+t.id+'" title="Envoyer à ton coach">📤</button><button data-tk="del" data-id="'+t.id+'">🗑</button></div>';}).join('')
    +'<audio id="tkAudio" controls style="width:100%;margin-top:10px;display:none"></audio><div class="row"><button data-close="1">Fermer</button></div>');
  document.querySelectorAll('[data-tk]').forEach(function(b){b.onclick=function(){const t=L.filter(function(x){return x.id===b.dataset.id;})[0];if(!t)return;const k=b.dataset.tk;
    if(k==='play'){const a=$('#tkAudio');a.style.display='';if(TKA)URL.revokeObjectURL(TKA);TKA=URL.createObjectURL(t.blob);a.src=TKA;a.play();
      a.ontimeupdate=function(){let m=null;(t.tl||[]).forEach(function(x){if(x[0]<=a.currentTime)m=x[1];});if(m!=null&&m!==ST.cur&&!PLAY)seek(m);};}
    if(k==='star'){t.star=!t.star;takesDB('readwrite').put(t);b.textContent=t.star?'⭐':'☆';b.classList.toggle('on',t.star);}
    if(k==='del'&&confirm('Supprimer cette prise ?')){takesDB('readwrite').delete(t.id).onsuccess=takesDlg;}
    if(k==='share'){const ext=/ogg/.test(t.blob.type)?'ogg':(/mp4/.test(t.blob.type)?'m4a':'webm');const f=new File([t.blob],fname(ST.W.title+' — prise du '+new Date(t.date).toLocaleDateString('fr-FR').replace(/\//g,'-'))+'.'+ext,{type:t.blob.type});shareFiles([f]);}};});});}
/* — barre « chant » — */
function vbar(){const b=$('#vbar');if(!b||!ST.W)return;const has=ST.W.parts.some(function(P){return P.kind==='voice';});b.style.display=has?'':'none';if(!has)return;
  b.innerHTML='<button data-vf="follow" class="'+(VF.follow?'on':'')+'" title="Le piano attend tes entrées et tient tes points d’orgue (micro)">🤝 me suit</button>'
    +'<button data-vf="brEdit" class="'+(VF.brEdit?'on':'')+'" title="Touche la partition juste avant une note pour poser ou retirer une respiration">’ respirations'+(vfMarks().length?' ('+vfMarks().length+')':'')+'</button>'
    +'<button data-vf="ver" class="'+(VF.ver?'on':'')+'" title="Rejoue tes attentes et tes points d’orgue tels que tu les as chantés">⭐ ma version'+(Object.keys(vfVer()).length?'':' —')+'</button>'
    +'<button id="bRec" class="'+(REC.on?'on':'')+'" title="Enregistrer ta voix avec l’accompagnement">⏺ enregistrer</button><button id="bTakes" title="Réécouter mes prises">🎙 prises</button><span id="vfHint"></span>';}
document.addEventListener('click',function(e){const v=e.target.closest('[data-vf]');if(v){const k=v.dataset.vf;VF[k]=!VF[k];
    if(k==='follow'&&VF.follow&&!PJ.on)pjStart();if(k==='ver'&&VF.ver&&!Object.keys(vfVer()).length)toast('⭐ Pas encore de version : chante une fois avec « 🤝 me suit », tes attentes seront retenues');
    if(k==='follow'&&VF.follow)toast('🤝 Le piano attend tes entrées et tient tes points d’orgue');if(k==='brEdit')toast(VF.brEdit?'’ Touche juste avant une note pour poser/retirer une respiration':'’ Respirations enregistrées');
    vbar();if(k==='brEdit')drawScore();if(PLAY){stop(true);play();}return;}
  if(e.target.closest('#bRec')){if(REC.on){stop();recStop();}else recStart();return;}if(e.target.closest('#bTakes')){takesDlg();return;}});
const _rd3=render;render=function(){_rd3.apply(this,arguments);vbar();};
document.addEventListener('click',function(e){if(e.target.closest('#bBack')){if(REC.on){stop();recStop();}VF.brEdit=false;}},true);
