/* ═══════════ 📖 TEXTE & DICTION — livret, mot à mot, traduction, API, contexte, texte scandé ═══════════
   W.text = {lang, ctx, diction[], lines:[{m, it, ipa, w:[[mot,glose]], fr}], doubts[]} */
'use strict';
const TX={open:false,scan:LS.get('tx_scan',false),sub:LS.get('tx_sub',true)};
function txLines(){return ST.W&&ST.W.text&&ST.W.text.lines||null;}
function txLineAt(i){const L=txLines();if(!L)return null;let r=null;L.forEach(function(l){if(l.m<=i)r=l;});return r;}
function txPanel(){const W=ST.W,T=W.text,el=$('#txp');if(!T){el.innerHTML='<div class="txh"><b>📖 Texte</b><button data-tx="x">✕</button></div><div class="hint" style="padding:12px">Pas encore de livret préparé pour cette pièce. Envoie-moi le titre : je prépare le mot à mot, la traduction et la prononciation (API).</div>';return;}
  el.innerHTML='<div class="txh"><b>📖 '+esc(W.title)+'</b><button data-tx="scan" class="'+(TX.scan?'on':'')+'" title="L’appli bat chaque syllabe : dis le texte en rythme, sans chanter">🗣 Scander</button><button data-tx="sub" class="'+(TX.sub?'on':'')+'" title="Prononciation et traduction sous les paroles pendant la lecture">💬 sous-titres</button><button data-tx="x">✕</button></div>'
    +'<div class="txb"><details class="ctx" open><summary>🎭 La scène</summary><p>'+esc(T.ctx||'')+'</p></details>'
    +(T.diction&&T.diction.length?'<details class="ctx"><summary>🗣 Diction</summary><ul>'+T.diction.map(function(d){return '<li>'+esc(d)+'</li>';}).join('')+'</ul></details>':'')
    +T.lines.map(function(l,k){return '<div class="txl" data-txl="'+k+'"><div class="it">'+esc(l.it)+'<small>mes. '+(l.m+1)+' ▶</small></div><div class="ipa">['+esc(l.ipa)+']</div>'
      +'<div class="wb">'+l.w.map(function(p){return '<span><b>'+esc(p[0])+'</b><i>'+esc(p[1])+'</i></span>';}).join('')+'</div><div class="fr">« '+esc(l.fr)+' »</div></div>';}).join('')
    +(T.doubts&&T.doubts.length?'<div class="hint dq2">⚠ '+T.doubts.map(esc).join('<br>⚠ ')+'</div>':'')+'</div>';}
document.addEventListener('click',function(e){
  if(e.target.closest('#bText')){TX.open=!TX.open;document.body.classList.toggle('txmode',TX.open);$('#bText').classList.toggle('on',TX.open);if(TX.open)txPanel();return;}
  const b=e.target.closest('[data-tx]');if(b){const k=b.dataset.tx;if(k==='x'){TX.open=false;document.body.classList.remove('txmode');$('#bText').classList.remove('on');return;}
    TX[k]=!TX[k];LS.set('tx_'+k,TX[k]);txPanel();if(k==='scan')toast(TX.scan?'🗣 Texte scandé : un clic par syllabe, dis le texte en rythme':'🗣 Scander : arrêt');if(k==='sub')$('#lyr2').innerHTML='';return;}
  const l=e.target.closest('[data-txl]');if(l){const L=txLines(),k=+l.dataset.txl,a=L[k].m,z=Math.min(ST.M.length-1,L[k+1]?Math.max(a,L[k+1].m):a+2);
    document.querySelectorAll('.txl.cur').forEach(function(x){x.classList.remove('cur');});l.classList.add('cur');stop();ST.loop=[a,z];markLoop();seek(a);play();toast('🔁 « '+L[k].it+' » en boucle (mes. '+(a+1)+'–'+(z+1)+')');}});
/* — sous-titres pendant la lecture : API + traduction de la ligne en cours — */
const _sh=show;show=function(ev){_sh(ev);if(!TX.sub||!txLines())return;const l=txLineAt(ev.m);const el=$('#lyr2');if(!el)return;
  if(!l){el.innerHTML='';return;}if(el.dataset.m!==String(l.m)){el.dataset.m=l.m;el.innerHTML='<span class="ipa">['+esc(l.ipa)+']</span> <span class="fr">'+esc(l.fr)+'</span>';
    document.querySelectorAll('.txl').forEach(function(x){x.classList.toggle('cur',txLines()[+x.dataset.txl]===l);});const c=document.querySelector('.txl.cur');if(c&&TX.open)c.scrollIntoView({block:'nearest',behavior:'smooth'});}};
/* — texte scandé : tout se tait, un clic boisé par syllabe chantée — */
function txClick(t,acc){const A=ac(),n=Math.floor(A.sampleRate*.03),b=A.createBuffer(1,n,A.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,4);
  const s=A.createBufferSource();s.buffer=b;const f=A.createBiquadFilter();f.type='bandpass';f.frequency.value=acc?2400:1700;f.Q.value=6;const g=A.createGain();g.gain.value=acc?1.6:1.1;s.connect(f);f.connect(g);g.connect(MASTER);s.start(t);}
const _pv3=partVol;partVol=function(P){if(TX.scan&&txLines())return 0;return _pv3(P);};
const _su3=scheduleUI;scheduleUI=function(ev,t){_su3(ev,t);if(!TX.scan||!txLines())return;const P=lyPart();if(!P||ev.P.id!==P.id||ev.e.grace||ev.e.ly==null||ev.e.ly===''||ev.e.ly==='_')return;txClick(Math.max(t,AC.currentTime),ev.e.t===0);};
const _rd2=render;render=function(){_rd2.apply(this,arguments);if(TX.open)txPanel();const b=$('#bText');if(b)b.classList.toggle('has',!!(ST.W&&ST.W.text));};
