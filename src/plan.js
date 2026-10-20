/* ═══════════ 🧭 PLAN DE RÉPÉTITION — sections, repères, enchaînements ═══════════
   Sections = repères de la partition (lettres, tempos, doubles barres, reprises) + tes repères à toi.
   Enchaînement = une suite de sections jouées l'une après l'autre (ex. A → C → A), éventuellement en boucle. */
'use strict';
function userMarks(){return LS.get('mk:'+ST.W.id,[]);}
function sections(){const SC=ST.SC,U=userMarks(),M={};
  SC.marks.forEach(function(k){M[k.mi]={mi:k.mi,label:k.label,kind:k.kind};});
  U.forEach(function(k){M[k.mi]=Object.assign(M[k.mi]||{mi:k.mi},{label:k.label||(M[k.mi]||{}).label||'',user:true});});
  const L=Object.keys(M).map(function(k){return M[k];}).sort(function(a,b){return a.mi-b.mi;});
  let letter=0;L.forEach(function(s,i){s.a=s.mi;s.b=(L[i+1]?L[i+1].mi:SC.meas.length)-1;s.id=String.fromCharCode(65+(letter++%26))+(letter>26?Math.ceil(letter/26):'');
    s.name=s.label||(s.mi===0?'Début':'Mes. '+SC.meas[s.mi].n);});
  return L.filter(function(s){return s.b>=s.a;});}
function seqLoad(){return LS.get('seq:'+ST.W.id,{items:[],rep:false,gap:0});}
function seqSave(q){LS.set('seq:'+ST.W.id,q);}
TABS.plan={title:'🧭 Plan',render:function(){const S=sections(),q=seqLoad(),cur=Math.max(0,ST.cur);const SC=ST.SC;
  return '<div class="hint">Touche une section pour y aller. 🔁 la met en boucle, ➕ l’ajoute à l’enchaînement.</div>'
   +S.map(function(s){const on=cur>=s.a&&cur<=s.b;return '<div class="mx'+(on?' me':'')+'" style="grid-template-columns:auto 1fr auto auto auto"><b style="color:var(--or);font:600 17px Georgia,serif;min-width:24px">'+s.id+'</b>'
     +'<div class="nm" data-sgo="'+s.a+'" style="cursor:pointer">'+esc(s.name)+'<small>mes. '+esc(SC.meas[s.a].n)+'–'+esc(SC.meas[s.b].n)+(s.user?' · repère perso':'')+'</small></div>'
     +'<button data-sloop="'+s.a+'|'+s.b+'" title="En boucle">🔁</button><button data-sadd="'+s.a+'|'+s.b+'|'+s.id+'" title="Ajouter à l’enchaînement">➕</button>'
     +(s.user?'<button data-sdel="'+s.mi+'" title="Retirer ce repère">🗑</button>':'<span></span>')+'</div>';}).join('')
   +'<div class="row"><button id="mkAdd">📍 Repère à la mesure '+esc(SC.meas[cur].n)+'</button></div>'
   +'<h4>Enchaînement</h4>'
   +(q.items.length?'<div class="chips">'+q.items.map(function(it,i){return '<button data-sqx="'+i+'" title="Retirer">'+esc(it.id)+' <small>'+esc(SC.meas[it.a].n)+'–'+esc(SC.meas[it.b].n)+'</small> ✕</button>'+(i<q.items.length-1?'<span style="align-self:center;color:var(--dim)">→</span>':'');}).join('')+'</div>'
     +sw('seqrep',q.rep,'En boucle','recommence l’enchaînement à la fin')
     +'<div class="row"><label>Pause entre</label><div class="chips">'+[0,2,4].map(function(g){return '<button data-sqgap="'+g+'" class="'+((q.gap||0)===g?'on':'')+'">'+(g?g+' s':'aucune')+'</button>';}).join('')+'</div></div>'
     +'<div class="row"><button id="sqPlay" class="pri">'+(ST.seq?'⏹ Arrêter l’enchaînement':'▶ Enchaîner')+'</button><button id="sqClr">Vider</button></div>'
   :'<div class="hint">Vide. Ajoute des sections avec ➕ (tu peux mettre plusieurs fois la même).</div>');}};
document.addEventListener('click',function(e){const b=e.target.closest('[data-sgo],[data-sloop],[data-sadd],[data-sdel],[data-sqx],[data-sqgap],#mkAdd,#sqPlay,#sqClr');if(!b||!ST.SC)return;const q=seqLoad();
  if(b.dataset.sgo!=null){ST.seq=null;seek(+b.dataset.sgo);tabRender();return;}
  if(b.dataset.sloop){const a=b.dataset.sloop.split('|');ST.seq=null;stop();loopSet(+a[0],+a[1]);seek(+a[0]);play();return;}
  if(b.dataset.sadd){const a=b.dataset.sadd.split('|');q.items.push({a:+a[0],b:+a[1],id:a[2]});seqSave(q);tabRender();return;}
  if(b.dataset.sdel){LS.set('mk:'+ST.W.id,userMarks().filter(function(k){return k.mi!==+b.dataset.sdel;}));BUS.emit('drawn');tabRender();return;}
  if(b.dataset.sqx!=null){q.items.splice(+b.dataset.sqx,1);seqSave(q);tabRender();return;}
  if(b.dataset.sqgap!=null){q.gap=+b.dataset.sqgap;seqSave(q);tabRender();return;}
  if(b.id==='mkAdd'){const mi=Math.max(0,ST.cur);const n=prompt('Nom du repère (mes. '+ST.SC.meas[mi].n+')',['Couplet','Refrain','Pont','Coda','Entrée des basses'][userMarks().length%5]);if(n==null)return;
    const U=userMarks().filter(function(k){return k.mi!==mi;});U.push({mi:mi,label:n.trim()});LS.set('mk:'+ST.W.id,U);BUS.emit('drawn');tabRender();return;}
  if(b.id==='sqClr'){seqSave({items:[],rep:q.rep,gap:q.gap});ST.seq=null;tabRender();return;}
  if(b.id==='sqPlay'){if(ST.seq){ST.seq=null;ST.loop=null;stop();vwMarkLoop();tabRender();return;}if(!q.items.length)return;
    ST.seq={items:q.items.slice(),rep:q.rep,gap:q.gap};ST.seqI=0;stop();ST.loop=[q.items[0].a,q.items[0].b];ST.pi=0;vwMarkLoop();play();toast('▶ Enchaînement : '+q.items.map(function(it){return it.id;}).join(' → '));tabRender();}});
BUS.on('sw',function(k,on){if(k==='seqrep'){const q=seqLoad();q.rep=on;seqSave(q);if(ST.seq)ST.seq.rep=on;}});
BUS.on('seqStep',function(i){vwMarkLoop();const it=ST.seq.items[i];toast('→ '+it.id+' (mes. '+ST.SC.meas[it.a].n+')',1500);});
BUS.on('seqEnd',function(){ST.seq=null;vwMarkLoop();toast('✅ Enchaînement terminé');tabRender();});
BUS.on('measure',function(){if(TAB==='plan'&&!PL.on)tabRender();});
BUS.on('close',function(){ST.seq=null;});
/* repères perso dessinés au-dessus du système */
BUS.on('drawn',function(){const g=ovGroup('ovMk');if(!g||!ST.SC)return;let h='';userMarks().forEach(function(k){const G=VW.geo[k.mi];if(!G)return;
  const w=Math.max(28,(k.label||'').length*7.4+14);h+='<g class="mk"><rect x="'+(G.x0+2)+'" y="'+(G.y0-2)+'" width="'+w+'" height="18" rx="4"/><text x="'+(G.x0+8)+'" y="'+(G.y0+11)+'">'+esc(k.label||'◆')+'</text></g>';});g.innerHTML=h;});
