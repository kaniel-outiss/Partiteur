/* ═══════════ 🖼 PARTITION — gravure Verovio, géométrie, curseur, surlignage, zoom, sélection ═══════════
   Les modules dessinent leurs aides dans la couche #ovl (un <g> chacun) à l'événement BUS « drawn ». */
'use strict';
const VW={geo:[],sys:[],TL:[],noteXY:{},lit:[],sysCur:-1,sel:null,w:0};
function vwScale(){const w=$('#score').clientWidth||800;return Math.round((w<480?33:(w<820?38:44))*ST.zoom);}
function drawScore(){if(!ST.SC)return;const box=$('#score');const w=Math.max(300,box.clientWidth);VW.w=w;
  let svg='';try{svg=engineRender(w,vwScale());}catch(e){console.error(e);box.innerHTML='<div class="hint pad">⚠ Gravure impossible : '+esc(e.message||e)+'</div>';return;}
  /* la feuille de style de Verovio vise l'id de la racine : on la redirige vers #sv */
  const rid=(/<svg[^>]*?\sid="([^"]+)"/.exec(svg)||[])[1];if(rid)svg=svg.split('#'+rid+' ').join('#sv ');
  box.innerHTML=svg+'<svg id="ovl" xmlns="http://www.w3.org/2000/svg"></svg><div id="cursor"></div>';
  const sv=box.querySelector('svg');sv.id='sv';
  vwIndex();BUS.emit('drawn');vwMarkLoop();vwPlaceCursorAtMeasure(ST.cur<0?0:ST.cur);}
/* index : mesures, systèmes, notes (coordonnées en pixels dans #score) */
function vwIndex(){const box=$('#score'),R=box.getBoundingClientRect();const SC=ST.SC;const ov=$('#ovl');
  const sv=$('#sv');ov.setAttribute('width',sv.getAttribute('width')||sv.clientWidth);ov.setAttribute('height',sv.getAttribute('height')||sv.clientHeight);
  ov.setAttribute('viewBox','0 0 '+(parseFloat(ov.getAttribute('width'))||box.clientWidth)+' '+(parseFloat(ov.getAttribute('height'))||box.clientHeight));
  const rel=function(r){return {x0:r.left-R.left,x1:r.right-R.left,y0:r.top-R.top,y1:r.bottom-R.top};};
  VW.sys=$$('#sv g.system').map(function(g){return rel(g.getBoundingClientRect());});
  const sysEls=$$('#sv g.system');VW.geo=[];const mid={};SC.meas.forEach(function(m){mid[m.id]=m.i;});
  $$('#sv g.measure').forEach(function(g){const i=mid[g.id];if(i==null)return;const r=rel(g.getBoundingClientRect());const s=sysEls.indexOf(g.closest('g.system'));const S=VW.sys[s]||r;
    /* portées de la mesure : y de la ligne du haut et du bas, par numéro */
    const st={};$$(':scope > g.staff',g).forEach(function(sg,k){const n=visStaves()[k];const ls=$$(':scope > path',sg);if(ls.length>=5){const a=rel(ls[0].getBoundingClientRect()),b=rel(ls[ls.length-1].getBoundingClientRect());st[n]={top:a.y0,bot:b.y1,ext:Math.max(b.y1,rel(sg.getBoundingClientRect()).y1)};}});
    VW.geo[i]={x0:r.x0,x1:r.x1,y0:S.y0,y1:S.y1,sys:s,st:st,el:g};});
  /* position x des événements (tête de note la plus à gauche) → ligne de temps du curseur */
  VW.noteXY={};const seen={};VW.TL=[];
  SC.ev.forEach(function(e){if(e.grace)return;const el=document.getElementById(e.base);if(!el)return;let xy=VW.noteXY[e.base];
    if(!xy){const h=el.querySelector('.notehead')||el;const r=rel(h.getBoundingClientRect());xy=VW.noteXY[e.base]={x:(r.x0+r.x1)/2,y:(r.y0+r.y1)/2,x0:r.x0};}
    const k=e.q.toFixed(4);const g=VW.geo[e.mi];/* q dépliée : chaque passe d'une reprise a ses entrées */if(!g)return;if(!seen[k]||xy.x0<seen[k].x){seen[k]={q:e.q,x:xy.x0,sys:g.sys,mi:e.mi,pi:e.pi};}});
  VW.TL=Object.keys(seen).map(function(k){return seen[k];}).sort(function(a,b){return a.q-b.q;});}
/* ── curseur : glisse entre les attaques, saute de système en système ── */
function vwPlaceCursor(x,s){const c=$('#cursor');if(!c)return;const S=VW.sys[s];if(!S)return;c.style.transform='translate('+(x-1.5)+'px,'+S.y0+'px)';c.style.height=(S.y1-S.y0)+'px';c.classList.add('on');
  if(s!==VW.sysCur){VW.sysCur=s;if(ST.follow)vwScrollTo(S);}}
function vwScrollTo(S){const w=$('#scorew');const top=S.y0-Math.min(60,w.clientHeight*.12);if(S.y0<w.scrollTop+8||S.y1>w.scrollTop+w.clientHeight-8||PL.on)w.scrollTo({top:Math.max(0,top),behavior:'smooth'});}
function vwPlaceCursorAtMeasure(mi){const g=VW.geo[mi];if(!g)return;const tl=VW.TL.filter(function(x){return x.mi===mi;})[0];vwPlaceCursor(tl?tl.x-6:g.x0+8,g.sys);}
BUS.on('frame',function(now){if(!PL.on||!VW.TL.length)return;const q=qAt(now);if(q==null)return;const TL=VW.TL;let lo=0,hi=TL.length-1;
  if(q<TL[0].q){return;}while(lo<hi){const m=(lo+hi+1)>>1;if(TL[m].q<=q+1e-9)lo=m;else hi=m-1;}
  const a=TL[lo],b=TL[lo+1];let x=a.x-6;if(b&&b.sys===a.sys&&b.q>a.q)x=a.x-6+(b.x-a.x)*Math.min(1,(q-a.q)/(b.q-a.q));
  else if(VW.geo[a.mi]){const g=VW.geo[a.mi],p=ST.SC.perf[a.pi];const end=p?p.q0+p.len:a.q+1;x=a.x-6+(g.x1-4-a.x)*Math.min(1,(q-a.q)/Math.max(.1,end-a.q));}
  vwPlaceCursor(x,a.sys);
  /* notes allumées : on éteint celles qui sont finies */
  VW.lit=VW.lit.filter(function(L){if(L.end<=now){L.els.forEach(function(e){e.classList.remove('play');});return false;}return true;});});
BUS.on('play',function(){VW.sysCur=-1;});
BUS.on('show',function(ev){if(ev.grace)return;const els=ev.ids.map(function(id){return document.getElementById(id.replace(/-rend\d+$/,''));}).filter(Boolean);
  els.forEach(function(e){e.classList.add('play');});VW.lit.push({els:els,end:AC.currentTime+Math.max(.08,ev.dt-.03)});});
BUS.on('stop',function(keep){VW.lit.forEach(function(L){L.els.forEach(function(e){e.classList.remove('play');});});VW.lit=[];if(!keep)vwPlaceCursorAtMeasure(ST.cur<0?0:ST.cur);});
BUS.on('seek',function(mi){vwPlaceCursorAtMeasure(mi);const g=VW.geo[mi];if(g)vwScrollTo(VW.sys[g.sys]);});
/* ── boucle : zone dorée sur les mesures ── */
function vwMarkLoop(){const ov=$('#ovl');if(!ov)return;let g=$('#ovLoop');if(!g){g=document.createElementNS('http://www.w3.org/2000/svg','g');g.id='ovLoop';ov.insertBefore(g,ov.firstChild);}
  let h='';const L=ST.loop||(VW.sel!=null?[VW.sel,VW.sel]:null);if(L)for(let i=L[0];i<=L[1];i++){const G=VW.geo[i];if(G)h+='<rect x="'+G.x0+'" y="'+G.y0+'" width="'+(G.x1-G.x0)+'" height="'+(G.y1-G.y0)+'" class="lp'+(ST.loop?'':' sel')+'"/>';}
  g.innerHTML=h;const b=$('#bLoop');if(b)b.classList.toggle('on',!!ST.loop||VW.sel!=null);}
/* toucher une mesure : aller / choisir la boucle */
document.addEventListener('click',function(e){const sv=e.target.closest&&e.target.closest('#score');if(!sv||!ST.SC)return;if(document.body.classList.contains('bredit')||document.body.classList.contains('annmode'))return;
  const R=$('#score').getBoundingClientRect(),x=e.clientX-R.left,y=e.clientY-R.top;let mi=-1;VW.geo.forEach(function(g,i){if(g&&x>=g.x0&&x<=g.x1&&y>=g.y0&&y<=g.y1)mi=i;});if(mi<0)return;
  if(VW.loopPick){if(VW.sel==null){VW.sel=mi;vwMarkLoop();toast('🔁 Début : mesure '+ST.SC.meas[mi].n+' — touche la dernière mesure');return;}
    const a=Math.min(VW.sel,mi),b=Math.max(VW.sel,mi);ST.loop=[a,b];VW.sel=null;VW.loopPick=false;vwMarkLoop();toast('🔁 Boucle mesures '+ST.SC.meas[a].n+' → '+ST.SC.meas[b].n);seek(a);return;}
  seek(mi);});
function loopToggle(){if(ST.loop||VW.loopPick){ST.loop=null;VW.sel=null;VW.loopPick=false;vwMarkLoop();toast('Boucle supprimée');return;}VW.loopPick=true;VW.sel=null;vwMarkLoop();$('#bLoop').classList.add('on');toast('🔁 Touche la première mesure de la boucle');}
function loopSet(a,b){ST.loop=[Math.max(0,a),Math.min(ST.SC.meas.length-1,b)];VW.sel=null;VW.loopPick=false;vwMarkLoop();}
/* zoom */
function zoomBy(f){ST.zoom=Math.max(.55,Math.min(2.2,Math.round(ST.zoom*f*100)/100));LS.set('zoom',ST.zoom);const w=$('#scorew'),r=w.scrollTop/Math.max(1,w.scrollHeight);drawScore();w.scrollTop=r*w.scrollHeight;toast('🔍 '+Math.round(ST.zoom*100)+' %',900);}
let _rsz=null;window.addEventListener('resize',function(){if(!ST.SC||$('#app').hidden)return;clearTimeout(_rsz);_rsz=setTimeout(function(){if(Math.abs(($('#score').clientWidth||0)-VW.w)>8)drawScore();},180);});
/* pincer pour zoomer */
(function(){let d0=0,z0=1;document.addEventListener('touchstart',function(e){if(e.touches.length===2&&e.target.closest('#scorew')){d0=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);z0=ST.zoom;}},{passive:true});
  document.addEventListener('touchend',function(e){if(d0&&e.touches.length<2){const el=$('#score');el.style.transform='';if(VW.pz){zoomBy(VW.pz/ST.zoom);}d0=0;VW.pz=null;}},{passive:true});
  document.addEventListener('touchmove',function(e){if(d0&&e.touches.length===2){const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);const z=Math.max(.55,Math.min(2.2,z0*d/d0));VW.pz=z;$('#score').style.transform='scale('+(z/ST.zoom)+')';$('#score').style.transformOrigin='top left';}},{passive:true});})();
/* numéros des portées affichées (dans l'ordre) */
function visStaves(){const H=ST.hidden||[];return ST.SC.staves.map(function(S){return S.n;}).filter(function(n){return H.indexOf(n)<0;});}
/* couche d'aides : un groupe par module */
function ovGroup(id){const ov=$('#ovl');if(!ov)return null;let g=ov.querySelector('#'+id);if(!g){g=document.createElementNS('http://www.w3.org/2000/svg','g');g.id=id;ov.appendChild(g);}return g;}
/* classes sur les notes d'une partie (couleurs) */
function noteEls(pid){const out=[];Object.keys(ST.SC.notes).forEach(function(id){if(ST.SC.notes[id].pid===pid){const e=document.getElementById(id);if(e)out.push(e);}});return out;}
