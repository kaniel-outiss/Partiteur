/* ═══════════ 📦 FICHIERS .fab — la bibliothèque vit sur le disque, l'appli est un lecteur ═══════════
   Un .fab = un JSON compressé (gzip) qui porte TOUT ce qu'il faut pour rendre un chant interactif :
   fiche (titre, compositeur, œuvre, rôle, style, période, ton, tempo, source), partition (jetons du partiteur
   ou MusicXML), noms/types des parties, livret (mot à mot, API, traduction, scène, diction), tessiture,
   et, en option, tes réglages perso (ton, tempo, respirations, repères, annotations, ma version).
   Natif : un fichier par chant dans Documents/Partiteur. Navigateur : IndexedDB (magasin « fab »).
   L'appli ne garde en mémoire qu'un index léger ; la partition est lue au moment d'ouvrir le chant. */
'use strict';
const FAB={DIR:'DOCUMENTS',PATH:'Partiteur',OUT:'Partiteur-partages',VER:1,names:null,err:''};
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
async function fabParse(u8){let o=null;try{o=JSON.parse(await fabUnzip(u8));}catch(e){throw new Error('fichier .fab illisible');}
  if(!o||!o.fab||!o.score)throw new Error('ce n’est pas un fichier .fab du partiteur');if(o.fab>FAB.VER)throw new Error('.fab plus récent que l’appli : mets le partiteur à jour');return o;}
/* — œuvre ↔ .fab — */
function fabOf(W,perso){const o={fab:FAB.VER,app:'Le partiteur',id:W.id,modified:new Date().toISOString()};
  FAB_META.forEach(function(k){if(W[k]!=null&&W[k]!=='')o[k]=W[k];});
  o.score=W.xml?{type:'musicxml',xml:W.xml,partMeta:W.partMeta||{}}:{type:'tokens',parts:W.parts,measures:W.measures,partMeta:W.partMeta||{}};
  if(W.text)o.text=W.text;const H=wHist(W);if(H)o.hist=H;if(W.instr!=null)o.instr=W.instr;
  const p=perso===true?fabPerso(W.id):(perso===false?null:W._perso);if(p)o.perso=p;return o;}
function fabWork(o,file){const W={id:o.id||('fab-'+Date.now().toString(36)),file:file||null,fab:true};
  FAB_META.forEach(function(k){if(o[k]!=null)W[k]=o[k];});if(!W.title)W.title=(file||'Sans titre').replace(/\.fab$/i,'');
  const s=o.score||{};if(s.type==='musicxml')W.xml=s.xml;else{W.parts=s.parts||[];W.measures=s.measures||[];}
  W.partMeta=s.partMeta||{};W.text=o.text||null;if(o.hist)W.hist=o.hist;if(o.instr!=null)W.instr=o.instr;if(o.perso)W._perso=o.perso;return W;}
/* index : la fiche sans la partition ni le livret */
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
async function fabReadObj(name){return fabParse(await FST.read(name));}
/* nom de fichier libre, lisible : « mozart-aura-amorosa.fab » */
function fabSlug(s){return String(s||'chant').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60)||'chant';}
function fabName(W,want){const base=want?fabSlug(String(want).replace(/\.fab$/i,'')):fabSlug(((W.composer||'').split(/\s+/).pop()||'')+'-'+(W.title||''));let n=base+'.fab',k=2;
  while(FAB.names.indexOf(n)>=0)n=base+'-'+(k++)+'.fab';return n;}
async function fabIdx(W){if(!W.file)return;await IDB.put({id:W.file,size:W.fsize,mtime:W.fmtime,W:fabLite(W)},'idx');}
/* écrit (ou réécrit) le .fab d'une œuvre complète ; perso : true = joindre mes réglages, false = sans, rien = garder ceux du fichier */
async function fabSaveWork(W,perso){if(!FAB.names)FAB.names=(await FST.list()).map(function(f){return f.name;});
  if(!W.file)W.file=fabName(W);const u8=await fabZip(JSON.stringify(fabOf(W,perso)));const st=await FST.write(W.file,u8);
  if(FAB.names.indexOf(W.file)<0)FAB.names.push(W.file);W.fsize=st.size;W.fmtime=st.mtime;W.fab=true;await fabIdx(W);return u8;}
/* la partition complète, lue au moment d'ouvrir ; libérée en refermant */
async function wFull(W){if(W.xml||W.measures)return W;if(!W.file)throw new Error('« '+W.title+' » : fichier .fab introuvable');
  const F=fabWork(await fabReadObj(W.file),W.file);['xml','measures','parts','text','partMeta','_perso'].forEach(function(k){if(F[k]!=null)W[k]=F[k];});return W;}
function wLite(W){if(!W||!W.file)return;FAB_HEAVY.forEach(function(k){delete W[k];});delete W._perso;}
/* — lecture du dossier : index en cache (taille + date du fichier), seuls les nouveaux .fab sont ouverts — */
async function fabScan(progress){const files=await FST.list();FAB.names=files.map(function(f){return f.name;});
  const idx={};(await IDB.all('idx')).forEach(function(r){idx[r.id]=r;});const out=[],seen={};let n=0,dup=[],bad=[];
  for(let i=0;i<files.length;i++){const f=files[i],r=idx[f.name];let W=null;
    if(r&&r.W&&r.size===f.size&&r.mtime===f.mtime)W=r.W;
    else{try{W=fabLite(fabWork(await fabReadObj(f.name),f.name));W.fsize=f.size;W.fmtime=f.mtime;await IDB.put({id:f.name,size:f.size,mtime:f.mtime,W:W},'idx');
        if(progress&&++n%25===0)progress(n,files.length);}catch(e){bad.push(f.name);continue;}}
    W.file=f.name;W.fab=true;if(seen[W.id]){dup.push(f.name);continue;}seen[W.id]=1;out.push(W);}
  Object.keys(idx).forEach(function(k){if(FAB.names.indexOf(k)<0)IDB.del(k,'idx');});
  return {works:out,dup:dup,bad:bad};}
/* migration (une fois) : les partitions importées avant la 0.24 (dans l'appli) deviennent des .fab sur le disque */
async function fabMigrate(){if(LS.get('fabmig',0)>=1)return;let ok=true;const old=await IDB.all();
  for(let i=0;i<old.length;i++){const W=old[i];try{if(!W.hist)W.hist=LS.get('hist:'+W.id,null);delete W.imported;await fabSaveWork(W,false);
      const back=await fabReadObj(W.file);if(back.id!==W.id)throw new Error('relecture');await IDB.del(W.id);}catch(e){ok=false;console.error('migration',W.id,e);}}
  if(ok)LS.set('fabmig',1);}
async function fabDelete(W){if(W.file){await FST.del(W.file);await IDB.del(W.file,'idx');FAB.names=(FAB.names||[]).filter(function(n){return n!==W.file;});}else await IDB.del(W.id);}
/* ajoute un .fab choisi dans le téléphone (Téléchargements, WhatsApp, Drive…) : copié dans la bibliothèque */
async function fabAddFile(f){const u8=new Uint8Array(await f.arrayBuffer());const o=await fabParse(u8);if(!FAB.names)FAB.names=(await FST.list()).map(function(x){return x.name;});
  const ex=wById(o.id);if(ex&&!confirm('« '+(o.title||o.id)+' » est déjà dans la bibliothèque.\nRemplacer par ce fichier ?'))return null;
  const name=ex&&ex.file?ex.file:fabName(null,f.name);const st=await FST.write(name,u8);if(FAB.names.indexOf(name)<0)FAB.names.push(name);
  const W=fabLite(fabWork(o,name));W.fsize=st.size;W.fmtime=st.mtime;await fabIdx(W);
  if(ex)WORKS.splice(WORKS.indexOf(ex),1,W);else WORKS.push(W);if(o.perso)LS.del('seeded:'+W.id);return W;}
/* partager un chant : le .fab avec (au choix) mes réglages et annotations */
async function fabExport(W,perso){await wFull(W);const u8=await fabZip(JSON.stringify(fabOf(W,perso)));const name=(W.file||fabName(W)).replace(/\.fab$/i,'')+(perso?'-perso':'')+'.fab';
  const fs=fabFS();if(fs){try{await FST.write(name,u8,FAB.OUT);}catch(e){}}
  await shareFiles([new File([u8],name,{type:'application/octet-stream'})],W.title);
  if(fs)toast('📤 Copie écrite dans Documents/'+FAB.OUT+'/'+name,5200);}
/* ── 🗂 fenêtre « dossier » ── */
function fabDirDlg(){const fs=fabFS();const n=WORKS.filter(function(W){return W.file;}).length;
  dlg('<h2>🗂 Ma bibliothèque</h2>'
    +'<div class="hint">'+(fs?'Les chants sont des fichiers <b>.fab</b> rangés dans le dossier <b>Documents/'+FAB.PATH+'</b> du téléphone. Copie-y autant de .fab que tu veux (clé USB, PC, Fichiers) : le partiteur les lit, il ne les garde pas en lui.'
      :'Dans un navigateur, les .fab ajoutés sont gardés dans ce navigateur.')+'</div>'
    +'<div class="big" style="font-size:34px">'+n+' <small style="font:14px sans-serif;color:var(--dim)">chant'+(n>1?'s':'')+'</small></div>'
    +(FAB.err?'<div class="hint" style="color:var(--rouge)">⚠ Lecture du dossier : '+esc(FAB.err)+'</div>':'')
    +'<div class="row"><button id="fdScan" class="pri">🔄 Relire le dossier</button><button id="fdAdd">📥 Ajouter des fichiers</button></div>'
    +(fs?'<h3>Les .fab copiés à la main n’apparaissent pas ?</h3><div class="hint">Android 11 et plus ne laisse une appli lire que ses propres fichiers. Donne l’accès une fois pour toutes : <b>Paramètres → Applis → Le partiteur → Autorisations → Fichiers et contenus multimédias → Autoriser la gestion de tous les fichiers</b>, puis « Relire le dossier ». Sans cet accès, « 📥 Ajouter des fichiers » marche toujours (il copie les .fab dans le dossier).</div>':'')
    +'<h3>Convertir</h3><div class="hint">📥 accepte aussi le MusicXML (.musicxml, .xml, .mxl) et le MEI : la fiche remplie, le chant est enregistré en .fab. Un PDF est une image de partition : il faut le transcrire pour qu’il devienne interactif.</div>'
    +'<div class="row"><button data-close="1">Fermer</button></div>');
  $('#fdScan').onclick=function(){dlgClose();libReload(true);};$('#fdAdd').onclick=function(){dlgClose();$('#fimp').click();};}
