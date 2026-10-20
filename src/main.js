/* ═══════════ 🚀 DÉMARRAGE ═══════════ */
'use strict';
window.addEventListener('DOMContentLoaded',function(){
  libLoad().then(function(){library();$('#boot').hidden=true;
    VRV.init().then(function(){const last=LS.get('last',null);if(last&&wById(last)&&LS.get('reopen',true))openWork(last);setTimeout(libWarm,1500);},
      function(e){toast('⚠ Graveur indisponible : '+(e.message||e));});},
    function(){library();$('#boot').hidden=true;});
  /* le bouton « retour » d'Android ferme le panneau puis la pièce */
  window.addEventListener('popstate',function(){if(!$('#dlg').classList.contains('on')&&TAB){tabClose();history.pushState({a:1},'');}else if(!$('#app').hidden){closeWork();}});
  try{history.pushState({a:1},'');}catch(e){}
});
