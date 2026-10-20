/* ═══════════ 🖍 ANNOTATIONS — crayon, texte, gomme, sur la partition ═══════════
   Chaque trait est accroché à une mesure (x relatif à sa largeur, y en unités d'échelle depuis le haut du système) :
   il suit la mesure quand la mise en page change (zoom, rotation, transposition). */
'use strict';
const AN={on:false,tool:'pen',col:'#c0392b',cur:null,undo:[]};
const AN_COLS=['#c0392b','#1d6fb8','#2f8f4e','#7a1fa2','#d4790c'];
function annList(){return LS.get('ann:'+ST.W.id,[]);}
function annSave(L){LS.set('ann:'+ST.W.id,L);}
function annU(){return vwScale();}
function annAt(x,y){let best=null;VW.geo.forEach(function(g,i){if(!g)return;if(y<g.y0-10||y>g.y1+10)return;const d=x<g.x0?g.x0-x:(x>g.x1?x-g.x1:0);if(!best||d<best.d)best={i:i,d:d};});return best?best.i:null;}
function annXY(a,fx,fy){const g=VW.geo[a.mi];if(!g)return null;return [g.x0+fx*(g.x1-g.x0),g.y0+fy*annU()];}
function annDraw(){const g=ovGroup('ovAnn');if(!g||!ST.SC)return;const U=annU();let h='';
  annList().forEach(function(a,k){if(a.k==='pen'){const pts=a.p.map(function(p){return annXY(a,p[0],p[1]);}).filter(Boolean);if(pts.length<2)return;
      h+='<path data-an="'+k+'" d="M'+pts.map(function(p){return p[0].toFixed(1)+','+p[1].toFixed(1);}).join(' L')+'" fill="none" stroke="'+a.c+'" stroke-width="'+(U*.07).toFixed(2)+'" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>';}
    else if(a.k==='txt'){const p=annXY(a,a.x,a.y);if(!p)return;h+='<text data-an="'+k+'" x="'+p[0]+'" y="'+p[1]+'" fill="'+a.c+'" class="ann" style="font-size:'+(U*.36).toFixed(1)+'px">'+esc(a.t)+'</text>';}});
  g.innerHTML=h;}
BUS.on('drawn',annDraw);
function annMode(on){AN.on=on;document.body.classList.toggle('annmode',on);$('#annbar').hidden=!on;$('#bAnn').classList.toggle('on',on);if(on){stop();annBar();toast('🖍 Dessine sur la partition — ✓ pour finir');}}
function annBar(){$('#annbar').innerHTML=AN_COLS.map(function(c){return '<button data-anc="'+c+'" class="'+(AN.tool==='pen'&&AN.col===c?'on':'')+'" style="color:'+c+'">●</button>';}).join('')
  +'<button data-ant="txt" class="'+(AN.tool==='txt'?'on':'')+'" title="Texte">🔤</button><button data-ant="era" class="'+(AN.tool==='era'?'on':'')+'" title="Gomme">🧽</button>'
  +'<button data-ana="undo" title="Annuler">↩</button><button data-ana="clr" title="Tout effacer">🗑</button><button data-ana="ok" class="pri">✓</button>';}
document.addEventListener('click',function(e){const b=e.target.closest('[data-anc],[data-ant],[data-ana],#bAnn');if(!b)return;
  if(b.id==='bAnn'){annMode(!AN.on);return;}
  if(b.dataset.anc){AN.tool='pen';AN.col=b.dataset.anc;annBar();return;}
  if(b.dataset.ant){AN.tool=b.dataset.ant;annBar();return;}
  const k=b.dataset.ana;if(k==='ok'){annMode(false);return;}
  if(k==='undo'){const L=annList();if(AN.undo.length){const u=AN.undo.pop();if(u.add)L.pop();else L.splice(u.i,0,u.a);annSave(L);annDraw();}return;}
  if(k==='clr'&&annList().length&&confirm('Effacer toutes les annotations de cette pièce ?')){AN.undo=[];annSave([]);annDraw();}});
/* saisie au doigt / à la souris / au stylet */
function annPt(e){const R=$('#score').getBoundingClientRect();return [e.clientX-R.left,e.clientY-R.top];}
document.addEventListener('pointerdown',function(e){if(!AN.on||!e.target.closest('#score'))return;e.preventDefault();const p=annPt(e);const mi=annAt(p[0],p[1]);if(mi==null)return;const g=VW.geo[mi],U=annU();
  const rel=function(q){return [(q[0]-g.x0)/(g.x1-g.x0),(q[1]-g.y0)/U];};
  if(AN.tool==='era'){const L=annList();let best=null;L.forEach(function(a,k){const pts=a.k==='pen'?a.p.map(function(q){return annXY(a,q[0],q[1]);}):[annXY(a,a.x,a.y)];pts.forEach(function(q){if(!q)return;const d=Math.hypot(q[0]-p[0],q[1]-p[1]);if(d<22&&(!best||d<best.d))best={k:k,d:d};});});
    if(best){AN.undo.push({i:best.k,a:L[best.k]});L.splice(best.k,1);annSave(L);annDraw();}return;}
  if(AN.tool==='txt'){const t=prompt('Texte (ex. « respirer », « piano », « tenir »)','');if(!t)return;const r=rel(p);const L=annList();L.push({k:'txt',mi:mi,x:r[0],y:r[1],t:t.trim(),c:AN.col});annSave(L);AN.undo.push({add:true});annDraw();return;}
  AN.cur={k:'pen',mi:mi,c:AN.col,p:[rel(p)]};const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('fill','none');path.setAttribute('stroke',AN.col);path.setAttribute('stroke-width',(U*.07).toFixed(2));path.setAttribute('stroke-linecap','round');path.setAttribute('stroke-linejoin','round');
  ovGroup('ovAnn').appendChild(path);AN.path=path;AN.pts=[p];try{e.target.setPointerCapture(e.pointerId);}catch(x){}},{passive:false});
document.addEventListener('pointermove',function(e){if(!AN.on||!AN.cur)return;const p=annPt(e),l=AN.pts[AN.pts.length-1];if(Math.hypot(p[0]-l[0],p[1]-l[1])<2)return;AN.pts.push(p);
  const g=VW.geo[AN.cur.mi],U=annU();AN.cur.p.push([(p[0]-g.x0)/(g.x1-g.x0),(p[1]-g.y0)/U]);AN.path.setAttribute('d','M'+AN.pts.map(function(q){return q[0].toFixed(1)+','+q[1].toFixed(1);}).join(' L'));},{passive:true});
document.addEventListener('pointerup',function(){if(!AN.cur)return;if(AN.cur.p.length>1){const L=annList();L.push(AN.cur);annSave(L);AN.undo.push({add:true});}AN.cur=null;AN.path=null;annDraw();});
document.addEventListener('touchmove',function(e){if(AN.on&&e.target.closest&&e.target.closest('#score'))e.preventDefault();},{passive:false});
BUS.on('close',function(){if(AN.on)annMode(false);AN.undo=[];});
