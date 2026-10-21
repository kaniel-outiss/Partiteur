/* ═══════════ 📦 RÉPERTOIRE .fab — un seul fichier sur le disque, l'appli est un lecteur ═══════════
   Un chant .fab = JSON compressé (gzip) : fiche, partition (jetons ou MusicXML), parties, livret (mot à mot, API,
   traduction, scène, diction), tessiture, réglages perso en option.
   Le RÉPERTOIRE = un seul fichier Documents/Partiteur/repertoire.fab qui contient tous les chants :
   une archive ZIP (« stockée ») avec index.json (fiches légères) + w/<id>.fab (un chant par entrée).
   Tout autre .fab déposé dans le dossier (chant seul, ou mise à jour du répertoire) y est rangé puis effacé.
   L'appli garde le répertoire en mémoire (≈ 6 Ko par chant) et ne décompresse un chant qu'à son ouverture. */
'use strict';
const FAB={DIR:'DOCUMENTS',PATH:'Partiteur',OUT:'Partiteur-partages',MAIN:'repertoire.fab',VER:1,names:null,err:'',packs:{}};
const FAB_META=['title','composer','work','role','voice','style','period','lang','ks','mode','bpm','src','tags','created'];
const FAB_HEAVY=['xml','measures','text'];
const FAB_PERSO=['tr','tempo','mix','sing','pup','vclef','hide','br','ver','mk','seq','ann'];
function fabFS(){const C=window.Capacitor;try{return C&&C.isNativePlatform&&C.isNativePlatform()&&C.Plugins&&C.Plugins.Filesystem||null;}catch(e){return null;}}
/* — octets ↔ base64 (par paquets : les gros fichiers ne font pas sauter la pile) — */
function u8b64(u8){let s='';for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(s);}
function b64u8(b){const s=atob(b);const u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u;}
async function fabZip(str){if(typeof CompressionStream==='undefined')return new TextEncoder().encode(str);
  return new Uint8Array(await new Response(new Blob([str]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());}
async function fabUnzip(u8){if(u8[0]===0x1f&&u8[1]===0x8b)return new TextDecoder().decode(await new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
  return new TextDecoder().decode(u8);}
async function fabParse(u8){let o=null;try{o=JSON.parse(await fabUnzip(u8));}catch(e){throw new Error('chant .fab illisible');}
  if(!o||!o.fab||!o.score)throw new Error('ce n’est pas un chant .fab du partiteur');if(o.fab>FAB.VER)throw new Error('.fab plus récent que l’appli : mets le partiteur à jour');return o;}
function isPack(u8){return u8[0]===0x50&&u8[1]===0x4b;}
/* — ZIP minimal : écriture « stockée » (les chants sont déjà compressés), lecture stockée ou deflate — */
const CRCT=(function(){const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
function crc32(u){let c=0xFFFFFFFF;for(let i=0;i<u.length;i++)c=CRCT[(c^u[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
function zipMake(entries){const enc=new TextEncoder(),parts=[],cen=[];let off=0;
  entries.forEach(function(e){const nm=enc.encode(e.name),d=e.data,crc=crc32(d);
    const h=new Uint8Array(30+nm.length),v=new DataView(h.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x0800,true);v.setUint16(12,0x21,true);
    v.setUint32(14,crc,true);v.setUint32(18,d.length,true);v.setUint32(22,d.length,true);v.setUint16(26,nm.length,true);h.set(nm,30);parts.push(h,d);
    const c=new Uint8Array(46+nm.length),w=new DataView(c.buffer);w.setUint32(0,0x02014b50,true);w.setUint16(4,20,true);w.setUint16(6,20,true);w.setUint16(8,0x0800,true);w.setUint16(14,0x21,true);
    w.setUint32(16,crc,true);w.setUint32(20,d.length,true);w.setUint32(24,d.length,true);w.setUint16(28,nm.length,true);w.setUint32(42,off,true);c.set(nm,46);cen.push(c);off+=h.length+d.length;});
  const cs=cen.reduce(function(a,c){return a+c.length;},0),end=new Uint8Array(22),z=new DataView(end.buffer);
  z.setUint32(0,0x06054b50,true);z.setUint16(8,entries.length,true);z.setUint16(10,entries.length,true);z.setUint32(12,cs,true);z.setUint32(16,off,true);
  const out=new Uint8Array(off+cs+22);let p=0;parts.concat(cen,[end]).forEach(function(a){out.set(a,p);p+=a.length;});return out;}
function zipRead(u8){const dv=new DataView(u8.buffer,u8.byteOffset,u8.byteLength);let e=-1;
  for(let i=u8.length-22;i>=Math.max(0,u8.length-66000);i--)if(dv.getUint32(i,true)===0x06054b50){e=i;break;}if(e<0)throw new Error('répertoire .fab illisible');
  const n=dv.getUint16(e+10,true);let p=dv.getUint32(e+16,true);const F={};const dec=new TextDecoder();
  for(let k=0;k<n;k++){const meth=dv.getUint16(p+10,true),csz=dv.getUint32(p+20,true),nl=dv.getUint16(p+28,true),xl=dv.getUint16(p+30,true),cl=dv.getUint16(p+32,true),off=dv.getUint32(p+42,true);
    const name=dec.decode(u8.subarray(p+46,p+46+nl));const st=off+30+dv.getUint16(off+26,true)+dv.getUint16(off+28,true);F[name]={meth:meth,st:st,sz:csz};p+=46+nl+xl+cl;}
  return {names:Object.keys(F),has:function(nm){return !!F[nm];},
    get:async function(nm){const f=F[nm];if(!f)throw new Error('chant absent du répertoire : '+nm);const d=u8.subarray(f.st,f.st+f.sz);if(f.meth===0)return d;
      return new Uint8Array(await new Response(new Blob([d]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());}};}
/* — œuvre ↔ chant .fab — */
function fabOf(W,perso){const o={fab:FAB.VER,app:'Le partiteur',id:W.id,modified:new Date().toISOString()};
  FAB_META.forEach(function(k){if(W[k]!=null&&W[k]!=='')o[k]=W[k];});
  o.score=W.xml?{type:'musicxml',xml:W.xml,partMeta:W.partMeta||{}}:{type:'tokens',parts:W.parts,measures:W.measures,partMeta:W.partMeta||{}};
  if(W.text)o.text=W.text;const H=wHist(W);if(H)o.hist=H;if(W.instr!=null)o.instr=W.instr;
  const p=perso===true?fabPerso(W.id):(perso===false?null:W._perso);if(p)o.perso=p;return o;}
function fabWork(o,file){const W={id:o.id||('fab-'+Date.now().toString(36)),file:file||null,fab:true};
  FAB_META.forEach(function(k){if(o[k]!=null)W[k]=o[k];});if(!W.title)W.title=String(file||'Sans titre').replace(/\.fab$/i,'');
  const s=o.score||{};if(s.type==='musicxml')W.xml=s.xml;else{W.parts=s.parts||[];W.measures=s.measures||[];}
  W.partMeta=s.partMeta||{};W.text=o.text||null;if(o.hist)W.hist=o.hist;if(o.instr!=null)W.instr=o.instr;if(o.perso)W._perso=o.perso;return W;}
/* fiche légère (index) : sans partition ni livret */
function fabLite(W){const o={};Object.keys(W).forEach(function(k){if(FAB_HEAVY.indexOf(k)<0&&k.charAt(0)!=='_')o[k]=W[k];});return o;}
/* — réglages perso : exportables avec le chant, semés une seule fois à la première ouverture — */
function fabPerso(id){const o={};FAB_PERSO.forEach(function(k){const v=LS.get(k+':'+id,null);if(v!=null)o[k]=v;});return Object.keys(o).length?o:null;}
function fabSeed(W){if(!W._perso||LS.get('seeded:'+W.id,false))return;FAB_PERSO.forEach(function(k){if(W._perso[k]!=null&&LS.get(k+':'+W.id,null)==null)LS.set(k+':'+W.id,W._perso[k]);});LS.set('seeded:'+W.id,true);}
/* — stockage : dossier du téléphone, ou IndexedDB dans un navigateur — */
const FST={
  list:async function(){const fs=fabFS();FAB.err='';
    if(fs){try{await fs.mkdir({path:FAB.PATH,directory:FAB.DIR,recursive:true});}catch(e){}
      try{const r=await fs.readdir({path:FAB.PATH,directory:FAB.DIR});return (r.files||[]).map(function(f){return typeof f==='string'?{name:f}:f;})
          .filter(function(f){return /\.fab$/i.test(f.name)&&f.type!=='directory';}).map(function(f){return {name:f.name,size:f.size||0,mtime:Math.round(f.mtime||0)};});}
      catch(e){FAB.err=e.message||String(e);return [];}}
    return (await IDB.all('fab')).map(function(r){return {name:r.id,size:r.size,mtime:r.mtime};});},
  read:async function(name){const fs=fabFS();if(fs){const r=await fs.readFile({path:FAB.PATH+'/'+name,directory:FAB.DIR});return typeof r.data==='string'?b64u8(r.data):new Uint8Array(await r.data.arrayBuffer());}
    const r=await IDB.get(name,'fab');if(!r)throw new Error('fichier absent : '+name);return r.data;},
  write:async function(name,u8,dir){const fs=fabFS();if(fs){await fs.writeFile({path:(dir||FAB.PATH)+'/'+name,data:u8b64(u8),directory:FAB.DIR,recursive:true});
      try{const s=await fs.stat({path:(dir||FAB.PATH)+'/'+name,directory:FAB.DIR});return {size:s.size||u8.length,mtime:Math.round(s.mtime||Date.now())};}catch(e){return {size:u8.length,mtime:Date.now()};}}
    const st={size:u8.length,mtime:Date.now()};await IDB.put({id:name,data:u8,size:st.size,mtime:st.mtime},'fab');return st;},
  del:async function(name){const fs=fabFS();if(fs){await fs.deleteFile({path:FAB.PATH+'/'+name,directory:FAB.DIR});return;}await IDB.del(name,'fab');}};
function fabSlug(s){return String(s||'chant').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60)||'chant';}
async function fabNames(){if(!FAB.names)FAB.names=(await FST.list()).map(function(f){return f.name;});return FAB.names;}
/* — répertoire : lecture — */
async function packParse(u8){const z=zipRead(u8);let works=null;
  if(z.has('index.json')){try{works=JSON.parse(new TextDecoder().decode(await z.get('index.json'))).works;}catch(e){works=null;}}
  if(!works){works=[];for(const nm of z.names){if(!/^w\/.+\.fab$/.test(nm))continue;try{const W=fabLite(fabWork(await fabParse(await z.get(nm))));W.entry=nm;works.push(W);}catch(e){}}}
  works=works.filter(function(W){return W&&W.id&&W.entry&&z.has(W.entry);});return {u8:u8,z:z,works:works};}
async function packLoad(file){if(FAB.packs[file])return FAB.packs[file];const u8=await FST.read(file);if(!isPack(u8))throw new Error(file+' n’est pas un répertoire');const P=await packParse(u8);FAB.packs[file]=P;return P;}
/* — répertoire : écriture. items = [{W, bytes?}] (bytes = chant .fab déjà prêt, sinon fabriqué depuis W complet) ; remove = ids à retirer — */
async function packPut(file,items,remove){await fabNames();let P=null;if(FAB.names.indexOf(file)>=0){try{P=await packLoad(file);}catch(e){throw new Error('répertoire illisible, rien n’a été écrit : '+(e.message||e));}}
  const rm={};(remove||[]).forEach(function(id){rm[id]=1;});items.forEach(function(it){rm[it.W.id]=1;});
  const keep=P?P.works.filter(function(W){return !rm[W.id];}):[];const ent=[],works=[],used={};
  for(const W of keep){ent.push({name:W.entry,data:await P.z.get(W.entry)});works.push(W);used[W.entry]=1;}
  for(const it of items){const W=it.W;const bytes=it.bytes||await fabZip(JSON.stringify(fabOf(W)));let nm='w/'+fabSlug(W.id)+'.fab',k=2;while(used[nm])nm='w/'+fabSlug(W.id)+'-'+(k++)+'.fab';used[nm]=1;
    W.file=file;W.entry=nm;W.fab=true;const L=fabLite(W);delete L.file;ent.push({name:nm,data:bytes});works.push(L);}
  const index={fabr:1,app:'Le partiteur',modified:new Date().toISOString(),count:works.length,works:works.map(function(W){const o=Object.assign({},W);delete o.file;return o;})};
  ent.unshift({name:'index.json',data:new TextEncoder().encode(JSON.stringify(index))});
  const u8=zipMake(ent);const st=await FST.write(file,u8);
  /* relecture : le répertoire écrit doit s'ouvrir avant qu'on efface quoi que ce soit */
  const back=await FST.read(file);const Q=await packParse(back);if(Q.works.length!==works.length)throw new Error('vérification du répertoire échouée');
  Q.works.forEach(function(W){W.file=file;});FAB.packs[file]=Q;if(FAB.names.indexOf(file)<0)FAB.names.push(file);
  await IDB.put({id:file,size:st.size,mtime:st.mtime,works:Q.works},'idx');return Q;}
/* range des chants dans le répertoire (celui où ils vivent déjà, sinon le principal) ; efface les fichiers isolés absorbés */
async function fabPutMany(items,remove){await fabNames();const G={},loose={};
  items.forEach(function(it){const ex=wById(it.W.id);const t=(it.W.entry&&it.W.file)||(ex&&ex.entry&&ex.file)||FAB.MAIN;(G[t]=G[t]||[]).push(it);
    [it.W,ex].forEach(function(x){if(x&&x.file&&!x.entry&&x.file!==t)loose[x.file]=1;});});
  for(const t in G)await packPut(t,G[t],remove);
  for(const f in loose){try{await FST.del(f);await IDB.del(f,'idx');}catch(e){}FAB.names=FAB.names.filter(function(n){return n!==f;});}}
/* écrit un chant complet ; perso : true = joindre mes réglages, false = sans, rien = garder ceux du fichier */
async function fabSaveWork(W,perso){const bytes=await fabZip(JSON.stringify(fabOf(W,perso)));await fabPutMany([{W:W,bytes:bytes}]);return bytes;}
/* index en cache : met à jour une fiche (tessiture calculée…) sans réécrire le fichier */
async function fabIdx(W){if(!W.file)return;const r=await IDB.get(W.file,'idx');if(!r)return;
  if(r.works){const L=fabLite(W);delete L.file;r.works=r.works.map(function(x){return x.id===W.id?L:x;});const P=FAB.packs[W.file];if(P)P.works=P.works.map(function(x){return x.id===W.id?Object.assign(L,{file:W.file}):x;});}
  else r.W=fabLite(W);await IDB.put(r,'idx');}
/* la partition complète, lue au moment d'ouvrir ; libérée en refermant */
async function wFull(W){if(W.xml||W.measures)return W;if(!W.file)throw new Error('« '+W.title+' » : chant introuvable');
  const u8=W.entry?await (await packLoad(W.file)).z.get(W.entry):await FST.read(W.file);
  const F=fabWork(await fabParse(u8),W.file);['xml','measures','parts','text','partMeta','_perso'].forEach(function(k){if(F[k]!=null)W[k]=F[k];});return W;}
function wLite(W){if(!W||!W.file)return;FAB_HEAVY.forEach(function(k){delete W[k];});delete W._perso;}
/* — lecture du dossier : fiches en cache (taille + date du fichier) — */
async function fabScan(progress){const files=await FST.list();FAB.names=files.map(function(f){return f.name;});
  const idx={};(await IDB.all('idx')).forEach(function(r){idx[r.id]=r;});const out=[],extra=[],seen={};let dup=[],bad=[];
  files.sort(function(a,b){return (a.name===FAB.MAIN?0:1)-(b.name===FAB.MAIN?0:1);});
  for(let i=0;i<files.length;i++){const f=files[i],r=idx[f.name];let L=null;
    if(r&&r.size===f.size&&r.mtime===f.mtime&&(r.works||r.W))L=r.works||[r.W];
    else{try{if(progress)progress(f.name);const u8=await FST.read(f.name);
        if(isPack(u8)){const P=await packParse(u8);FAB.packs[f.name]=P;L=P.works;await IDB.put({id:f.name,size:f.size,mtime:f.mtime,works:L},'idx');}
        else{const W=fabLite(fabWork(await fabParse(u8),f.name));L=[W];await IDB.put({id:f.name,size:f.size,mtime:f.mtime,W:W},'idx');}}
      catch(e){bad.push(f.name);continue;}}
    L.forEach(function(W){W.file=f.name;W.fab=true;if(f.name!==FAB.MAIN){extra.push(W);return;}if(seen[W.id]){dup.push(W.id);return;}seen[W.id]=1;out.push(W);});}
  /* hors répertoire principal : comptés à part (fabTidy les y range) ; ceux qui arrivent après écrasent les doublons */
  extra.forEach(function(W){if(seen[W.id]){const k=out.findIndex(function(x){return x.id===W.id;});out[k]=W;}else{seen[W.id]=1;out.push(W);}});
  Object.keys(idx).forEach(function(k){if(FAB.names.indexOf(k)<0)IDB.del(k,'idx');});
  return {works:out,dup:dup,bad:bad,extra:files.filter(function(f){return f.name!==FAB.MAIN&&bad.indexOf(f.name)<0;}).map(function(f){return f.name;})};}
/* rangement : tout .fab du dossier autre que repertoire.fab (chant seul, mise à jour de répertoire) est absorbé puis effacé */
async function fabTidy(files){let nNew=0,nUpd=0;const items=[];const have={};(FAB.packs[FAB.MAIN]?FAB.packs[FAB.MAIN].works:[]).forEach(function(W){have[W.id]=1;});
  if(!FAB.packs[FAB.MAIN]&&FAB.names.indexOf(FAB.MAIN)>=0){try{(await packLoad(FAB.MAIN)).works.forEach(function(W){have[W.id]=1;});}catch(e){return {err:e.message};}}
  for(const f of files){try{const u8=await FST.read(f);
      if(isPack(u8)){const P=await packParse(u8);for(const W of P.works){items.push({W:Object.assign({},W,{file:null,entry:null}),bytes:await P.z.get(W.entry),src:f});}}
      else{const o=await fabParse(u8);items.push({W:fabLite(fabWork(o,null)),bytes:u8,src:f});}}catch(e){}}
  if(!items.length)return {n:0};
  const last={};items.forEach(function(it){last[it.W.id]=it;});const L=Object.keys(last).map(function(k){return last[k];});
  L.forEach(function(it){if(have[it.W.id])nUpd++;else nNew++;});
  await packPut(FAB.MAIN,L);
  for(const f of files){try{await FST.del(f);await IDB.del(f,'idx');delete FAB.packs[f];}catch(e){}}FAB.names=FAB.names.filter(function(n){return files.indexOf(n)<0;});
  return {n:nNew+nUpd,nNew:nNew,nUpd:nUpd};}
/* migration (une fois) : partitions importées avant la 0.24 (gardées dans l'appli) → répertoire */
async function fabMigrate(){if(LS.get('fabmig',0)>=1)return;const old=await IDB.all();
  if(old.length){const items=[];for(const W of old){if(!W.hist)W.hist=LS.get('hist:'+W.id,null);delete W.imported;items.push({W:W,bytes:await fabZip(JSON.stringify(fabOf(W,false)))});}
    try{await packPut(FAB.MAIN,items);for(const W of old)await IDB.del(W.id);}catch(e){console.error('migration',e);return;}}
  LS.set('fabmig',1);}
async function fabDelete(W){if(W.entry){await packPut(W.file,[],[W.id]);return;}if(W.file){await FST.del(W.file);await IDB.del(W.file,'idx');FAB.names=(FAB.names||[]).filter(function(n){return n!==W.file;});}else await IDB.del(W.id);}
/* 📥 un .fab choisi dans le téléphone (chant seul ou répertoire entier) : rangé dans le répertoire */
async function fabAddFile(f){const u8=new Uint8Array(await f.arrayBuffer());const items=[];
  if(isPack(u8)){const P=await packParse(u8);for(const W of P.works)items.push({W:Object.assign({},W,{file:null,entry:null}),bytes:await P.z.get(W.entry)});}
  else{const o=await fabParse(u8);items.push({W:fabLite(fabWork(o,null)),bytes:u8});if(o.perso)LS.del('seeded:'+o.id);}
  if(!items.length)throw new Error('aucun chant dans ce fichier');let upd=0;items.forEach(function(it){if(wById(it.W.id))upd++;});
  await fabPutMany(items.map(function(it){const ex=wById(it.W.id);if(ex&&ex.entry){it.W.file=ex.file;it.W.entry=ex.entry;}return it;}));return {n:items.length,upd:upd};}
/* partager un chant (avec ou sans mes réglages), ou le répertoire entier */
async function fabExport(W,perso){await wFull(W);const u8=await fabZip(JSON.stringify(fabOf(W,perso)));const name=fabSlug(((W.composer||'').split(/\s+/).pop()||'')+'-'+W.title)+(perso?'-perso':'')+'.fab';
  const fs=fabFS();if(fs){try{await FST.write(name,u8,FAB.OUT);}catch(e){}}
  await shareFiles([new File([u8],name,{type:'application/octet-stream'})],W.title);if(fs)toast('📤 Copie écrite dans Documents/'+FAB.OUT+'/'+name,5200);}
async function fabExportPack(){const u8=await FST.read(FAB.MAIN);const name='repertoire-'+new Date().toISOString().slice(0,10)+'.fab';const fs=fabFS();
  if(fs){try{await FST.write(name,u8,FAB.OUT);}catch(e){}}await shareFiles([new File([u8],name,{type:'application/octet-stream'})],'Répertoire');if(fs)toast('📤 Copie écrite dans Documents/'+FAB.OUT+'/'+name,5200);}
/* ── 🗂 fenêtre « répertoire » ── */
function fabDirDlg(){const fs=fabFS();const n=WORKS.filter(function(W){return W.file;}).length;const P=FAB.packs[FAB.MAIN];
  dlg('<h2>🗂 Mon répertoire</h2>'
    +'<div class="hint">'+(fs?'Tous tes chants tiennent dans <b>un seul fichier</b> : <b>Documents/'+FAB.PATH+'/'+FAB.MAIN+'</b>. Le partiteur le lit, il ne garde aucun chant en lui.':'Dans un navigateur, le répertoire est gardé dans ce navigateur.')+'</div>'
    +'<div class="big" style="font-size:34px">'+n+' <small style="font:14px sans-serif;color:var(--dim)">chant'+(n>1?'s':'')+(P?' · '+Math.round(P.u8.length/1024)+' Ko':'')+'</small></div>'
    +(FAB.err?'<div class="hint" style="color:var(--rouge)">⚠ Lecture du dossier : '+esc(FAB.err)+'</div>':'')
    +'<div class="row"><button id="fdScan" class="pri">🔄 Relire</button><button id="fdAdd">📥 Ajouter / mettre à jour</button>'+(P?'<button id="fdExp">📤 Partager le répertoire</button>':'')+'</div>'
    +'<h3>Mises à jour</h3><div class="hint">Quand un nouvel air est transcrit, le répertoire mis à jour sort avec l’APK (page des versions). Ajoute-le avec 📥, ou dépose-le dans Documents/'+FAB.PATH+' : il est <b>fusionné</b> dans ton répertoire (tes conversions restent, les airs mis à jour sont remplacés) puis le fichier déposé est effacé. Ne remplace pas '+FAB.MAIN+' à la main.</div>'
    +(fs?'<h3>Un fichier déposé n’est pas vu ?</h3><div class="hint">Android 11+ : <b>Paramètres → Applis → Le partiteur → Autorisations → Fichiers et contenus multimédias → Autoriser la gestion de tous les fichiers</b>, puis « Relire ». Sans cet accès, 📥 marche toujours.</div>':'')
    +'<h3>Convertir</h3><div class="hint">📥 accepte aussi le MusicXML (.musicxml, .xml, .mxl) et le MEI : la fiche remplie, le chant entre dans le répertoire. Un PDF doit être transcrit.</div>'
    +'<div class="row"><button data-close="1">Fermer</button></div>');
  $('#fdScan').onclick=function(){dlgClose();libReload(true);};$('#fdAdd').onclick=function(){dlgClose();$('#fimp').click();};
  if($('#fdExp'))$('#fdExp').onclick=function(){fabExportPack().catch(function(e){toast('⚠ '+(e.message||e));});};}
