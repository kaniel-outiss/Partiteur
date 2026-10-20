/* ═══════════ 🎚 PUPITRES — mixeur, « je chante », pupitre devant, pistes de travail (WAV) ═══════════ */
'use strict';
TABS.mix={title:'🎚 Pupitres',render:function(){const SC=ST.SC,VP=voiceParts();
  return SC.parts.map(function(P){const x=ST.mix[P.id]||{};const me=ST.sing===P.id;
    return '<div class="mx'+(me?' me':'')+'"><div class="nm">'+(P.kind==='voice'?'🎤 ':'🎹 ')+esc(P.name)+'<small>'+(P.vt?esc(VTNAME[P.vt]||P.vt):(P.hand==='rh'?'main droite':(P.hand==='lh'?'main gauche':'')))+'</small></div>'
      +(P.kind==='voice'?'<button data-mx="sing" data-p="'+P.id+'" class="'+(me?'on':'')+'" title="C’est toi qui chantes : la partie se tait">🙋 moi</button>':'<span></span>')
      +'<button data-mx="solo" data-p="'+P.id+'" class="'+(x.solo?'on':'')+'">S</button><button data-mx="mute" data-p="'+P.id+'" class="'+(x.mute?'on':'')+'">'+(x.mute?'🔇':'🔊')+'</button>'
      +'<input type="range" min="0" max="1.6" step=".05" value="'+(x.vol==null?1:x.vol)+'" data-mx="vol" data-p="'+P.id+'"></div>';}).join('')
    +(ST.sing?'<div class="sw"><span>Garder ma partie en guide<small>tu l’entends doucement pendant que tu chantes</small></span><button class="tg'+((ST.mix[ST.sing]||{}).guide?' on':'')+'" data-sw="guide"></button></div>':'')
    +(VP.length>1||(VP.length&&SC.parts.length>1)?'<h4>Travail de pupitre</h4><div class="row"><label>Devant</label><select id="pupSel" style="flex:1"><option value="">— équilibre normal —</option>'+VP.map(function(P){return '<option value="'+P.id+'"'+(ST.pup===P.id?' selected':'')+'>'+esc(P.name)+' devant, les autres derrière</option>';}).join('')+'</select></div>':'')
    +'<h4>Pistes audio</h4><div class="hint">Avec l’équilibre, le ton ('+(ST.tr>0?'+':'')+ST.tr+') et le tempo ('+ST.tempo+' %) actuels — à envoyer aux choristes.</div>'
    +'<div class="row"><button id="bTrack">⬇ Piste actuelle</button>'+(VP.length>1?'<button id="bTracks">⬇ Une piste par pupitre</button>':'')+'</div>'
    +'<div class="row"><button id="bProg">🎭 Ajouter au programme</button></div>';}};
document.addEventListener('click',function(e){const b=e.target.closest('[data-mx]');if(!b||b.tagName!=='BUTTON')return;const id=b.dataset.p,k=b.dataset.mx;const x=ST.mix[id]=ST.mix[id]||{};
  if(k==='sing'){ST.sing=ST.sing===id?null:id;LS.set('sing:'+ST.W.id,ST.sing);ST.W._an=null;ST.an=anOf(ST.W);info();markMine();}else x[k]=!x[k];LS.set('mix:'+ST.W.id,ST.mix);tabRender();});
document.addEventListener('input',function(e){const b=e.target;if(b.dataset&&b.dataset.mx==='vol'){const x=ST.mix[b.dataset.p]=ST.mix[b.dataset.p]||{};x.vol=+b.value;LS.set('mix:'+ST.W.id,ST.mix);}});
document.addEventListener('change',function(e){if(e.target.id==='pupSel'){ST.pup=e.target.value||null;LS.set('pup:'+ST.W.id,ST.pup);markMine();toast(ST.pup?'👥 '+partById(ST.pup).name+' devant':'Équilibre normal');}});
BUS.on('sw',function(k,on){if(k==='guide'&&ST.sing){const x=ST.mix[ST.sing]=ST.mix[ST.sing]||{};x.guide=on;if(on)x.vol=Math.min(x.vol==null?1:x.vol,.45);LS.set('mix:'+ST.W.id,ST.mix);}});
/* — pistes hors-ligne : même horloge que la lecture (tempo, rall.), reprises dépliées — */
function timeline(){const SC=ST.SC,T=[];let t=0;SC.perf.forEach(function(p,k){T[k]=t;const s=spb(k);t+=SC.meas[p.mi].rall?p.len*s*1.2:p.len*s;});
  return {end:t,at:function(q){let k=0;while(k<SC.perf.length-1&&SC.perf[k+1].q0<=q+1e-9)k++;const p=SC.perf[k],s=spb(k),rel=q-p.q0;return T[k]+rel*s*(SC.meas[p.mi].rall?1+.4*(rel/2)/p.len:1);}};}
async function renderTrack(pup){await sndLoad(ac());const TL=timeline(),SR=24000;const O=offlineCtx(TL.end+3,SR);
  const sP=ST.pup,sS=ST.sing;ST.pup=pup||null;ST.sing=null;
  try{ST.SC.ev.forEach(function(ev){const P=partById(ev.pid);const vol=P?partVol(P):0;if(vol<=0)return;const t=TL.at(ev.q)+.4;ev.dt=Math.max(.06,TL.at(ev.q+ev.d)+.4-t);sound(ev,t,O,vol);});}
  finally{ST.pup=sP;ST.sing=sS;}
  const buf=await O.startRendering();return wavOf(buf,SR);}
function wavOf(buf,SR){const L=buf.getChannelData(0),R=buf.numberOfChannels>1?buf.getChannelData(1):L,n=L.length,b=new ArrayBuffer(44+n*4),v=new DataView(b);const w=function(o,s){for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
  w(0,'RIFF');v.setUint32(4,36+n*4,true);w(8,'WAVE');w(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,2,true);v.setUint32(24,SR,true);v.setUint32(28,SR*4,true);v.setUint16(32,4,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,n*4,true);
  let pk=0;for(let i=0;i<n;i++)pk=Math.max(pk,Math.abs(L[i]),Math.abs(R[i]));const g=pk>0?.95/pk:1;
  for(let i=0;i<n;i++){v.setInt16(44+i*4,Math.max(-1,Math.min(1,L[i]*g))*32767,true);v.setInt16(46+i*4,Math.max(-1,Math.min(1,R[i]*g))*32767,true);}return new Blob([b],{type:'audio/wav'});}
async function makeTracks(ids){stop();const W=ST.W,out=[];const tag=(ST.tr?' ('+(ST.tr>0?'+':'')+ST.tr+')':'')+(ST.tempo!==100?' '+ST.tempo+'%':'');
  for(let i=0;i<ids.length;i++){const P=partById(ids[i]);toast('⏳ Piste '+(i+1)+'/'+ids.length+(P?' — '+P.name:'')+'…',20000);
    const blob=await renderTrack(ids[i]);out.push(new File([blob],fname(W.title+' — '+(P?P.name:'tutti')+tag)+'.wav',{type:'audio/wav'}));}
  toast('✅ '+out.length+' piste'+(out.length>1?'s':'')+' prête'+(out.length>1?'s':''));await shareFiles(out,W.title);}
document.addEventListener('click',function(e){if(e.target.closest('#bTrack'))makeTracks([ST.pup||'']);if(e.target.closest('#bTracks'))makeTracks(voiceParts().map(function(P){return P.id;}));});
