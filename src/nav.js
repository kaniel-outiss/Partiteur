/* ═══════════ 🧭 NAVIGATION (filtres, regroupements) · 👥 MODE PUPITRE + PISTES DE TRAVAIL ═══════════ */
'use strict';
const VTN={S:'Soprano',Mz:'Mezzo',A:'Alto',T:'Ténor',Bar:'Baryton',B:'Basse'};
function repOf(W){const VP=W.parts.filter(function(P){return P.kind==='voice';}),pn=W.parts.some(function(P){return P.kind!=='voice';});
  if(!VP.length)return 'Instrumental';if(VP.length===1)return pn?'Voix + piano':'Voix seule';
  const L=VP.map(function(P){return P.vt==='Mz'?'S':(P.vt==='Bar'?'B':(P.vt||'?'));});const lab=L.indexOf('?')<0?L.join(''):VP.length+' voix';
  return (VP.length===2?'Duo '+lab:lab)+(pn?' + piano':' a cappella');}
function voicesOf(W){const o=[];W.parts.forEach(function(P){if(P.kind==='voice'&&P.vt&&o.indexOf(VTN[P.vt])<0)o.push(VTN[P.vt]);});return o;}
const FLT=Object.assign({q:'',style:'',period:'',composer:'',work:'',rep:'',voice:'',mine:false,grp:''},LS.get('flt',{}));
const FDEF=[['style','Style',function(W){return W.style?[W.style]:[];}],['period','Période',function(W){return W.period?[W.period]:[];}],['composer','Compositeur',function(W){return W.composer?[W.composer]:[];}],
  ['work','Œuvre',function(W){return W.work?[W.work.replace(/,.*$/,'')]:[];}],['rep','Répartition',function(W){return [repOf(W)];}],['voice','Voix',voicesOf]];
function fltPass(W,skip){const q=FLT.q.trim().toLowerCase();if(q&&[W.title,W.composer,W.work,W.role,W.style,W.period].join(' ').toLowerCase().indexOf(q)<0)return false;
  for(let i=0;i<FDEF.length;i++){const k=FDEF[i][0];if(k===skip||!FLT[k])continue;if(FDEF[i][2](W).indexOf(FLT[k])<0)return false;}
  if(FLT.mine&&skip!=='mine'){const an=anOf(W);if(!an)return false;const b=anBadge(an,LS.get('tr:'+W.id,0));if(b.cls==='ko')return false;}return true;}
function navBar(){const el=$('#nav');if(!el)return;
  el.innerHTML='<input id="fq" type="search" placeholder="🔎 Titre, compositeur, œuvre, rôle…" value="'+esc(FLT.q)+'">'
    +'<div class="fl">'+FDEF.map(function(F){const k=F[0],vals={};WORKS.forEach(function(W){if(!fltPass(W,k))return;F[2](W).forEach(function(v){vals[v]=(vals[v]||0)+1;});});
      const ks=Object.keys(vals).sort(function(a,b){return a.localeCompare(b,'fr');});if(FLT[k]&&!vals[FLT[k]])ks.unshift(FLT[k]);
      return '<select data-f="'+k+'" class="'+(FLT[k]?'on':'')+'"><option value="">'+F[1]+'</option>'+ks.map(function(v){return '<option'+(v===FLT[k]?' selected':'')+' value="'+esc(v)+'">'+esc(v)+(vals[v]?' ('+vals[v]+')':'')+'</option>';}).join('')+'</select>';}).join('')
    +'<button data-fm="1" class="'+(FLT.mine?'on':'')+'" title="Seulement ce qui va à ma voix (au besoin transposé)">🎤 pour ma voix</button>'
    +'<select data-f="grp" class="'+(FLT.grp?'on':'')+'"><option value="">Grouper…</option>'+[['work','par œuvre'],['composer','par compositeur'],['period','par période'],['style','par style'],['rep','par répartition']].map(function(g){return '<option value="'+g[0]+'"'+(FLT.grp===g[0]?' selected':'')+'>'+g[1]+'</option>';}).join('')+'</select>'
    +(['q','style','period','composer','work','rep','voice'].some(function(k){return FLT[k];})||FLT.mine?'<button data-fx="1">✕ tout</button>':'')+'</div>';
  const q=$('#fq');q.oninput=function(){FLT.q=q.value;LS.set('flt',FLT);libList();};}
function libList(){const L=WORKS.filter(function(W){return fltPass(W);});const add='<div class="wk soon"><b>📥 Ajouter une partition</b><span>Fichier MusicXML (.musicxml, .mxl) — exporté de MuseScore, ou téléchargé sur CPDL / IMSLP.</span></div>';
  if(!L.length){$('#lib').innerHTML='<div class="hint">Aucune pièce ne correspond.</div>'+add;return;}
  if(!FLT.grp){$('#lib').innerHTML=L.map(wkCard).join('')+add;return;}
  const key=function(W){if(FLT.grp==='rep')return repOf(W);if(FLT.grp==='work')return W.work?W.work.replace(/,.*$/,''):'— hors œuvre —';return W[FLT.grp]||'— non classé —';};
  const G={};L.forEach(function(W){(G[key(W)]=G[key(W)]||[]).push(W);});
  $('#lib').innerHTML=Object.keys(G).sort(function(a,b){return a.localeCompare(b,'fr');}).map(function(k){return '<h3 class="gh">'+esc(k)+' <small>'+G[k].length+'</small></h3>'+G[k].map(wkCard).join('');}).join('')+add;}
library=function(){const v=myVoice();$('#vme').innerHTML=v?'🎤 '+vName(v)+' · '+pName(v.lo)+'–'+pName(v.hi):'🎤 Ma voix';navBar();libList();progList();};
document.addEventListener('change',function(e){const s=e.target.closest('#nav [data-f]');if(!s)return;FLT[s.dataset.f]=s.value;LS.set('flt',FLT);navBar();libList();});
document.addEventListener('click',function(e){if(e.target.closest('#nav [data-fm]')){FLT.mine=!FLT.mine;LS.set('flt',FLT);navBar();libList();}
  if(e.target.closest('#nav [data-fx]')){['q','style','period','composer','work','rep','voice'].forEach(function(k){FLT[k]='';});FLT.mine=false;LS.set('flt',FLT);navBar();libList();}});

/* — 👥 mode pupitre : ta voix devant, les autres derrière — */
const _pv2=partVol;partVol=function(P){const v=_pv2(P);const pu=ST.pup;if(!pu||!v)return v;if(P.id===pu)return v*1.5;return v*(P.kind==='voice'?.28:.55);};
const _mx=mixerHTML;mixerHTML=function(){const VP=ST.W.parts.filter(function(P){return P.kind==='voice';});let h=_mx();
  if(VP.length>1||VP.length&&ST.W.parts.length>1)h+='<div class="mx pup"><span class="mxn">👥 Pupitre</span><select id="pupSel"><option value="">— équilibre normal —</option>'+VP.map(function(P){return '<option value="'+P.id+'"'+(ST.pup===P.id?' selected':'')+'>'+esc(P.name)+' devant</option>';}).join('')+'</select>'
    +'<button id="bTrack" title="Fabriquer la piste audio (WAV) avec cet équilibre, ce ton et ce tempo">⬇ piste</button>'+(VP.length>1?'<button id="bTracks" title="Une piste par pupitre, à envoyer aux choristes">⬇ tous les pupitres</button>':'')+'</div>';
  return h;};
document.addEventListener('change',function(e){if(e.target.id==='pupSel'){ST.pup=e.target.value||null;LS.set('pup:'+ST.W.id,ST.pup);toast(ST.pup?'👥 '+ST.W.parts.filter(function(P){return P.id===ST.pup;})[0].name+' devant, les autres derrière':'Équilibre normal');}});
const _open=open;open=function(id){_open(id);ST.pup=LS.get('pup:'+id,null);$('#mixer').innerHTML=mixerHTML();};

/* — fabrication hors-ligne des pistes (WAV mono 22 kHz) — */
function trackTimes(){const M=ST.M,T=[];let t=0;M.forEach(function(m,i){T[i]=t;const s=60/(m.bpm*ST.tempo/100);t+=m.rall?m.len*s*(1+.35*.5):m.len*s;});
  return {T:T,end:t,at:function(b){let i=0;while(i<M.length-1&&M[i+1].t0<=b+1e-9)i++;const m=M[i],s=60/(m.bpm*ST.tempo/100),rel=b-m.t0;return T[i]+rel*s*(m.rall?1+.35*(rel/2)/m.len:1);}};}
async function renderTrack(pup){const TT=trackTimes(),SR=22050,len=Math.ceil((TT.end+2.5)*SR);const OAC=new OfflineAudioContext(1,len,SR);
  const sAC=AC,sM=MASTER,sP=ST.pup,sSing=ST.sing;ac();AC=OAC;MASTER=OAC.createGain();MASTER.gain.value=.8;const comp=OAC.createDynamicsCompressor();MASTER.connect(comp);comp.connect(OAC.destination);ST.pup=pup;ST.sing=null;
  try{evList(0,ST.M.length-1).forEach(function(ev){const vol=partVol(ev.P);if(vol<=0)return;const t=TT.at(ev.beat)+.3,dur=Math.max(.08,TT.at(ev.beat+ev.d)+.3-t);
      ev.e.notes.forEach(function(n,ni){let midi=n.midi+ST.tr;if(ev.P.kind==='voice'&&ev.P.oct)midi+=ev.P.oct;const tt=t+(ev.e.arp?ni*.035:0);
        if(ev.e.trem&&ev.P.kind==='piano'){for(let x=0;x<dur-.02;x+=.09)pianoNote(midi,tt+x,.108,vol*.55);}else if(ev.P.kind==='voice')voiceNote(midi,tt,dur,vol,true);else pianoNote(midi,tt,dur,vol*(ev.e.grace?.6:1));});});}
  finally{AC=sAC;MASTER=sM;ST.pup=sP;ST.sing=sSing;}
  const buf=await OAC.startRendering();return wavOf(buf.getChannelData(0),SR);}
function wavOf(d,SR){const n=d.length,b=new ArrayBuffer(44+n*2),v=new DataView(b);const w=function(o,s){for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
  w(0,'RIFF');v.setUint32(4,36+n*2,true);w(8,'WAVE');w(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,SR,true);v.setUint32(28,SR*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,n*2,true);
  let pk=0;for(let i=0;i<n;i++)pk=Math.max(pk,Math.abs(d[i]));const g=pk>0?.95/pk:1;for(let i=0;i<n;i++){const s=Math.max(-1,Math.min(1,d[i]*g));v.setInt16(44+i*2,s*32767,true);}return new Blob([b],{type:'audio/wav'});}
function fname(s){return s.replace(/[\\/:*?"<>|]+/g,'').replace(/\s+/g,' ').trim();}
async function shareFiles(files){try{if(navigator.canShare&&navigator.canShare({files:files})){await navigator.share({files:files,title:ST.W.title});return;}}catch(e){if(e&&e.name==='AbortError')return;}
  files.forEach(function(f,i){setTimeout(function(){const a=document.createElement('a');a.href=URL.createObjectURL(f);a.download=f.name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},4000);},i*600);});}
async function makeTracks(ids){stop();const W=ST.W,out=[];const tag=(ST.tr?' ('+(ST.tr>0?'+':'')+ST.tr+')':'')+(ST.tempo!==100?' '+ST.tempo+'%':'');
  for(let i=0;i<ids.length;i++){const P=W.parts.filter(function(x){return x.id===ids[i];})[0];toast('⏳ Piste '+(i+1)+'/'+ids.length+(P?' — '+P.name:'')+'…');
    const blob=await renderTrack(ids[i]);out.push(new File([blob],fname(W.title+' — '+(P?P.name:'tutti')+tag)+'.wav',{type:'audio/wav'}));}
  toast('✅ '+out.length+' piste'+(out.length>1?'s':'')+' prête'+(out.length>1?'s':''));await shareFiles(out);}
document.addEventListener('click',function(e){if(e.target.closest('#bTrack'))makeTracks([ST.pup||'']);
  if(e.target.closest('#bTracks'))makeTracks(ST.W.parts.filter(function(P){return P.kind==='voice';}).map(function(P){return P.id;}));});
