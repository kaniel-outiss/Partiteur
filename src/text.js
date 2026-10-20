/* ═══════════ 📖 TEXTE & DICTION — livret, mot à mot, traduction, API, contexte, texte scandé ═══════════
   W.text = {lang, ctx, diction[], lines:[{m, it, ipa, w:[[mot,glose]], fr}], doubts[]}  (m = indice de mesure) */
'use strict';
const TXS={scan:false,sub:LS.get('tx_sub',true)};
function txLines(){return ST.W&&ST.W.text&&ST.W.text.lines||null;}
function txLineAt(i){const L=txLines();if(!L)return null;let r=null;L.forEach(function(l){if(l.m<=i)r=l;});return r;}
TABS.texte={title:'📖 Texte',render:function(){const W=ST.W,T=W.text;
  /* sans livret préparé : les paroles de la partition, ligne par ligne */
  if(!T){const P=myPart();const L=P?ST.SC.ev.filter(function(e){return e.pid===P.id&&e.ly&&e.pass===1;}):[];if(!L.length)return '<div class="hint">Pas de paroles dans cette pièce.</div>';
    let out='',line='',m0=L[0].mi;L.forEach(function(e,k){line+=e.ly.replace(/_$/,'').replace(/‿/g,' ')+(/-$/.test(e.ly)?'':' ');const nx=L[k+1];if(!nx||/[.,;:!?…]$/.test(e.ly.trim())||nx.q-e.q-e.d>=1){out+='<div class="txl" data-txm="'+m0+'"><div class="it">'+esc(line.replace(/-/g,'').trim())+'<small>mes. '+esc(ST.SC.meas[m0].n)+' ▶</small></div></div>';line='';if(nx)m0=nx.mi;}});
    return '<div class="hint">Livret non préparé : voici les paroles de la partition. Envoie-moi le titre, je prépare le mot à mot, la traduction et la prononciation (API).</div>'+sw('scan',TXS.scan,'🗣 Scander','un clic par syllabe : dis le texte en rythme')+out;}
  return sw('scan',TXS.scan,'🗣 Scander','un clic par syllabe : dis le texte en rythme, sans chanter')+sw('sub',TXS.sub,'💬 Sous-titres','prononciation et traduction pendant la lecture')
    +'<details class="ctx" open><summary>🎭 La scène</summary><p>'+esc(T.ctx||'')+'</p></details>'
    +(T.diction&&T.diction.length?'<details class="ctx"><summary>🗣 Diction</summary><ul>'+T.diction.map(function(d){return '<li>'+esc(d)+'</li>';}).join('')+'</ul></details>':'')
    +T.lines.map(function(l,k){return '<div class="txl" data-txl="'+k+'"><div class="it">'+esc(l.it)+'<small>mes. '+(l.m+1)+' ▶</small></div><div class="ipa">['+esc(l.ipa)+']</div>'
      +'<div class="wb">'+l.w.map(function(p){return '<span><b>'+esc(p[0])+'</b><i>'+esc(p[1])+'</i></span>';}).join('')+'</div><div class="fr">« '+esc(l.fr)+' »</div></div>';}).join('')
    +(T.doubts&&T.doubts.length?'<div class="hint" style="margin-top:12px">⚠ '+T.doubts.map(esc).join('<br>⚠ ')+'</div>':'');}};
BUS.on('sw',function(k,on){if(k==='scan'){TXS.scan=on;toast(on?'🗣 Texte scandé : un clic par syllabe':'🗣 Scander : arrêt');if(PL.on){stop(true);start(false);}}if(k==='sub'){TXS.sub=on;LS.set('tx_sub',on);$('#lyr2').innerHTML='';}});
document.addEventListener('click',function(e){const l=e.target.closest('[data-txl],[data-txm]');if(!l)return;let a,z;
  if(l.dataset.txl!=null){const L=txLines(),k=+l.dataset.txl;a=L[k].m;z=Math.min(ST.SC.meas.length-1,L[k+1]?Math.max(a,L[k+1].m):a+2);}else{a=+l.dataset.txm;z=Math.min(ST.SC.meas.length-1,a+2);}
  $$('.txl.cur').forEach(function(x){x.classList.remove('cur');});l.classList.add('cur');stop();loopSet(a,z);seek(a);play();toast('🔁 Phrase en boucle (mes. '+ST.SC.meas[a].n+'–'+ST.SC.meas[z].n+')');});
/* sous-titres : API + traduction de la ligne en cours */
BUS.on('measure',function(mi){if(!TXS.sub||!txLines())return;const l=txLineAt(mi);const el=$('#lyr2');if(!l){el.innerHTML='';return;}
  if(el.dataset.m!==String(l.m)){el.dataset.m=l.m;el.innerHTML='<span class="ipa">['+esc(l.ipa)+']</span> <span class="fr">'+esc(l.fr)+'</span>';
    $$('.txl[data-txl]').forEach(function(x){x.classList.toggle('cur',txLines()[+x.dataset.txl]===l);});const c=$('.txl.cur');if(c&&TAB==='texte')c.scrollIntoView({block:'nearest',behavior:'smooth'});}});
BUS.on('open',function(){const el=$('#lyr2');el.innerHTML='';el.dataset.m='';TXS.scan=false;});
/* texte scandé : tout se tait, un clic boisé par syllabe */
VOLS.push(function(P,v){return TXS.scan?0:v;});
BUS.on('show',function(ev){if(!TXS.scan)return;const P=myPart();if(!P||ev.pid!==P.id||ev.grace||!ev.ly)return;const A=AC,n=Math.floor(A.sampleRate*.03),b=A.createBuffer(1,n,A.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,4);
  const s=A.createBufferSource();s.buffer=b;const f=A.createBiquadFilter();f.type='bandpass';f.frequency.value=ev.t<1e-6?2400:1700;f.Q.value=6;const g=A.createGain();g.gain.value=ev.t<1e-6?1.6:1.1;s.connect(f);f.connect(g);g.connect(BUS_DRY);s.start(A.currentTime);});
