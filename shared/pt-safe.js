/* ═══════════ 🛟 PT-SAFE — la mémoire survit aux mises à jour ET à une réinstallation ═══════════
   1. Mise à jour par-dessus (même identifiant, même clé de signature) : Android garde tout, rien à faire.
   2. En plus, filet de sécurité : une copie de la mémoire est écrite automatiquement dans
      Documents/PianoTools/<appli>-sauvegarde.json (hors de l'appli → survit à une désinstallation).
   3. Première ouverture après une réinstallation : l'appli propose de restaurer cette copie.
   Réglage par appli : window.PT_SAFE={app,file,match(clé)->bool,extra?:{dump():Promise<obj>,load(obj):Promise}} */
(function(){'use strict';
  const CFG=window.PT_SAFE;if(!CFG)return;
  const DIR='DOCUMENTS',PATH='PianoTools/'+CFG.file,MARK='ptsafe_'+CFG.file;
  const FS=function(){const C=window.Capacitor;try{return C&&C.isNativePlatform&&C.isNativePlatform()&&C.Plugins&&C.Plugins.Filesystem||null;}catch(e){return null;}};
  const keys=function(){const o=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.indexOf('ptsafe_')!==0&&CFG.match(k))o.push(k);}return o;};
  async function dump(){const d={};keys().forEach(function(k){d[k]=localStorage.getItem(k);});const o={app:CFG.app,date:new Date().toISOString(),data:d};if(CFG.extra)try{o.extra=await CFG.extra.dump();}catch(e){}return o;}
  async function load(o){if(!o||o.app!==CFG.app||!o.data)throw new Error('ce fichier n’est pas une sauvegarde '+CFG.app);
    keys().forEach(function(k){localStorage.removeItem(k);});Object.keys(o.data).forEach(function(k){localStorage.setItem(k,o.data[k]);});
    if(o.extra&&CFG.extra)await CFG.extra.load(o.extra);try{localStorage.setItem(MARK,'1');}catch(e){}}
  let lastSig='',busy=false,permAsked=false;
  /* après une réinstallation, Android (11+) peut refuser de réécrire le fichier de l'installation précédente : on prend alors un autre nom */
  const PK='ptsafe_path_'+CFG.file;const curPath=function(){return localStorage.getItem(PK)||PATH;};
  async function w1(fs,p,s){await fs.writeFile({path:p,data:s,directory:DIR,encoding:'utf8',recursive:true});}
  async function write(fs,s){const p=curPath();try{await w1(fs,p,s);return true;}catch(e){}
    if(!permAsked&&fs.requestPermissions){permAsked=true;try{await fs.requestPermissions();await w1(fs,p,s);return true;}catch(e){}}
    const alt=PATH.replace('.json','-'+Date.now().toString(36)+'.json');try{await w1(fs,alt,s);localStorage.setItem(PK,alt);return true;}catch(e){}return false;}
  async function backup(){const fs=FS();if(!fs||busy)return;busy=true;try{const o=await dump();if(!Object.keys(o.data).length){busy=false;return;}
      const sig=JSON.stringify(o.data).length+':'+JSON.stringify(o.data).slice(-400)+(o.extra?JSON.stringify(o.extra).length:'');if(sig===lastSig){busy=false;return;}
      if(await write(fs,JSON.stringify(o)))lastSig=sig;}catch(e){}busy=false;}
  async function firstRun(){if(localStorage.getItem(MARK))return;const fs=FS();try{localStorage.setItem(MARK,'1');}catch(e){}if(!fs)return;
    try{const r=await fs.readFile({path:PATH,directory:DIR,encoding:'utf8'});const o=JSON.parse(r.data);if(!o||o.app!==CFG.app||!o.data||!Object.keys(o.data).length)return;
      if(confirm('🛟 Une sauvegarde de '+CFG.app+' du '+new Date(o.date).toLocaleString('fr-FR')+' a été trouvée sur le téléphone.\n\nRestaurer ta progression ?')){await load(o);location.reload();}}catch(e){}}
  /* boutons manuels : fichier à garder où tu veux (WhatsApp, e-mail, Drive) */
  async function exportFile(){const o=await dump(),s=JSON.stringify(o),name=CFG.file.replace('.json','')+'-'+new Date().toISOString().slice(0,10)+'.json';const fs=FS();
    if(fs){const ok=await write(fs,s);try{await fs.writeFile({path:'PianoTools/'+name,data:s,directory:DIR,encoding:'utf8',recursive:true});}catch(e){}
      alert(ok?'💾 Sauvegarde écrite dans le dossier Documents/PianoTools du téléphone :\n'+name+'\n\nTu peux l’envoyer par WhatsApp ou e-mail depuis l’application Fichiers.':'Écriture impossible — autorise l’accès aux fichiers pour '+CFG.app+'.');return;}
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([s],{type:'application/json'}));a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},3000);}
  function importFile(){const i=document.createElement('input');i.type='file';i.accept='.json,application/json,text/plain';
    i.onchange=function(){const f=i.files[0];if(!f)return;f.text().then(function(t){let o=null;try{o=JSON.parse(t);}catch(e){}
      if(!o||o.app!==CFG.app){alert('Ce fichier n’est pas une sauvegarde '+CFG.app+'.');return;}
      if(!confirm('Remplacer la progression actuelle par la sauvegarde du '+new Date(o.date).toLocaleString('fr-FR')+' ?'))return;
      load(o).then(function(){location.reload();},function(e){alert(e.message);});});};document.body.appendChild(i);i.click();setTimeout(function(){i.remove();},60000);}
  window.ptSafe={backup:backup,exportFile:exportFile,importFile:importFile,dump:dump,load:load};
  const start=function(){firstRun().then(function(){setTimeout(backup,4000);});setInterval(backup,120000);
    document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')backup();});window.addEventListener('pagehide',backup);};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
