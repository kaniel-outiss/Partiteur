/* ═══════════ ⚙️ NOYAU — utilitaires, bus d'événements, stockage, état ═══════════
   Plus de chaînage de fonctions : les modules s'abonnent au BUS et déclarent leurs portes (GATES)
   et leurs modificateurs de volume (VOLS). */
'use strict';
const $=function(s,r){return (r||document).querySelector(s);};
const $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));};
const LS={get:function(k,d){try{const v=localStorage.getItem('partiteur_'+k);return v==null?d:JSON.parse(v);}catch(e){return d;}},
  set:function(k,v){try{localStorage.setItem('partiteur_'+k,JSON.stringify(v));}catch(e){}},
  del:function(k){try{localStorage.removeItem('partiteur_'+k);}catch(e){}}};
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function toast(t,ms){const e=$('#toast');e.textContent=t;e.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(function(){e.classList.remove('on');},ms||3800);}
function dlg(html,cls){const d=$('#dlg');d.innerHTML='<div class="dbox '+(cls||'')+'">'+html+'</div>';d.classList.add('on');$$('[data-close]',d).forEach(function(b){b.onclick=dlgClose;});}
function dlgClose(){$('#dlg').classList.remove('on');}
document.addEventListener('click',function(e){if(e.target.id==='dlg')dlgClose();});
/* — bus — */
const BUS={h:{},on:function(k,f){(this.h[k]=this.h[k]||[]).push(f);},emit:function(k){const a=Array.prototype.slice.call(arguments,1);(this.h[k]||[]).forEach(function(f){try{f.apply(null,a);}catch(e){console.error(k,e);}});}};
/* — portes de lecture : chaque fournisseur rend le prochain battement où la lecture doit attendre — */
const GATES=[];  /* {name, next():q|null, wait(q), skip()} */
const VOLS=[];   /* f(part, v) → v */
/* — hauteurs — */
const SH=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'],FL=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const FRN={C:'do',D:'ré',E:'mi',F:'fa',G:'sol',A:'la',B:'si'};
function pName(m){return SH[((m%12)+12)%12].replace('#','♯')+(Math.floor(m/12)-1);}
function pNameFr(m,ks){const n=(ks<0?FL:SH)[((m%12)+12)%12];return FRN[n[0]]+(n[1]==='#'?'♯':(n[1]==='b'?'♭':''));}
function hz(m){return 440*Math.pow(2,(m-69)/12);}
/* — tonalités — */
const KEYS_MAJ={'-7':'Cb','-6':'Gb','-5':'Db','-4':'Ab','-3':'Eb','-2':'Bb','-1':'F','0':'C','1':'G','2':'D','3':'A','4':'E','5':'B','6':'F#','7':'C#'};
function ksAfter(ks,tr){const pc=(([0,7,2,9,4,11,6,1,8,3,10,5][(ks%12+12)%12])+tr+120)%12;const FS={0:0,7:1,2:2,9:3,4:4,11:5,6:-6,5:-1,10:-2,3:-3,8:-4,1:-5};return FS[pc];}
function keyName(ks,minor){const n=KEYS_MAJ[String(ks)]||'C';const fr=function(x){return FRN[x[0]]+(x.length>1?(x[1]==='b'?'♭':'♯'):'');};
  const rel={C:'A',G:'E',D:'B',A:'F#',E:'C#',B:'G#','F#':'D#','C#':'A#',F:'D',Bb:'G',Eb:'C',Ab:'F',Db:'Bb',Gb:'Eb',Cb:'Ab'}[n];
  return minor?fr(rel)+' mineur':fr(n)+' majeur';}
/* intervalle de transposition lisible par Verovio (« +M2 », « -m3 », « +A1 »…) d'après la tonalité visée */
function trInterval(ks,tr){if(!tr)return '';const from=KEYS_MAJ[String(ks)]||'C',to=KEYS_MAJ[String(ksAfter(ks,tr))]||'C';const L='CDEFGAB';
  const up=tr>0,s=Math.abs(tr);let steps=((L.indexOf(to[0])-L.indexOf(from[0]))*(up?1:-1)+70)%7;const oct=Math.floor(s/12);
  if(steps===0&&s%12>6)steps=7;steps+=oct*7;const ref=[0,2,4,5,7,9,11][steps%7]+12*Math.floor(steps/7);const d=s-ref;const perf=[0,3,4].indexOf(steps%7)>=0;
  let q;if(perf)q={'-2':'dd','-1':'d','0':'P','1':'A','2':'AA'}[d];else q={'-3':'dd','-2':'d','-1':'m','0':'M','1':'A','2':'AA'}[d];
  if(!q)return (up?'+':'-')+s;return (up?'+':'-')+q+(steps+1);}
/* — IndexedDB : œuvres importées, prises — */
const IDB={db:null,open:function(){return new Promise(function(ok,ko){try{const r=indexedDB.open('partiteur',3);r.onupgradeneeded=function(){const d=r.result;['works','takes','notes'].forEach(function(s){if(!d.objectStoreNames.contains(s))d.createObjectStore(s,{keyPath:'id'});});};r.onsuccess=function(){IDB.db=r.result;ok();};r.onerror=function(){ko(r.error);};}catch(e){ko(e);}});},
  st:function(s,mode){return IDB.db.transaction(s,mode||'readonly').objectStore(s);},
  all:function(s){s=s||'works';return new Promise(function(ok){if(!IDB.db)return ok(s==='works'?LS.get('works',[]):[]);const q=IDB.st(s).getAll();q.onsuccess=function(){ok(q.result||[]);};q.onerror=function(){ok([]);};});},
  put:function(W,s){s=s||'works';return new Promise(function(ok){const c=s==='takes'?W:JSON.parse(JSON.stringify(W,function(k,v){return k.charAt(0)==='_'?undefined:v;}));
    if(!IDB.db){if(s==='works'){const a=LS.get('works',[]).filter(function(x){return x.id!==W.id;});a.push(c);LS.set('works',a);}return ok();}
    const t=IDB.db.transaction(s,'readwrite');t.objectStore(s).put(c);t.oncomplete=ok;t.onerror=ok;});},
  del:function(id,s){s=s||'works';return new Promise(function(ok){if(!IDB.db){if(s==='works')LS.set('works',LS.get('works',[]).filter(function(x){return x.id!==id;}));return ok();}const t=IDB.db.transaction(s,'readwrite');t.objectStore(s).delete(id);t.oncomplete=ok;t.onerror=ok;});}};
/* — état de la pièce ouverte — */
const ST={W:null,SC:null,tr:0,tempo:100,mix:{},sing:null,pup:null,loop:null,cur:-1,pi:0,zoom:LS.get('zoom',1),wait:LS.get('wait',true),follow:true,
  count:LS.get('count',true),metro:LS.get('metro',false),timbre:LS.get('timbre','oh'),voiceClef:{},playing:false};
function wById(id){return WORKS.filter(function(x){return x.id===id;})[0];}
function partById(id){return ST.SC?ST.SC.parts.filter(function(P){return P.id===id;})[0]:null;}
function voiceParts(){return ST.SC?ST.SC.parts.filter(function(P){return P.kind==='voice';}):[];}
/* la partie chantée « à moi » (paroles, micro, me suit) */
function myPart(){const VP=voiceParts();return VP.filter(function(P){return P.id===ST.sing;})[0]||VP.filter(function(P){return P.id===ST.pup;})[0]||(ST.an&&VP.filter(function(P){return P.id===ST.an.pid;})[0])||VP[0]||null;}
function fname(s){return String(s).replace(/[\\/:*?"<>|]+/g,'').replace(/\s+/g,' ').trim();}
async function shareFiles(files,title){try{if(navigator.canShare&&navigator.canShare({files:files})){await navigator.share({files:files,title:title||''});return;}}catch(e){if(e&&e.name==='AbortError')return;}
  files.forEach(function(f,i){setTimeout(function(){const a=document.createElement('a');a.href=URL.createObjectURL(f);a.download=f.name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},4000);},i*600);});}
