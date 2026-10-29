/* BomBomBa · escolhe o servidor de salas (window.BOMBOMBA_CONFIG.provider, vindo de /api/config)
   e carrega a biblioteca dele e o adaptador correspondente, com versões fixas.
   O jogo espera window.BOMBOMBA_NET_READY, que resolve com o adaptador ou null. */
(function(){
  'use strict';
  const cfg=window.BOMBOMBA_CONFIG||{};
  const LIBS={
    firebase:['https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js','https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js','https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js','/net-firebase.js'],
    supabase:['https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4','/net-supabase.js']
  };
  const list=LIBS[cfg.provider]||LIBS.firebase;
  const load=src=>new Promise((ok,fail)=>{const s=document.createElement('script');s.src=src;s.async=false;s.onload=ok;s.onerror=fail;document.head.append(s);});
  window.BOMBOMBA_NET_READY=(async()=>{
    try{
      for(const src of list)await load(src);
      return window.BOMBOMBA_NET&&typeof window.BOMBOMBA_NET.connect==='function'?window.BOMBOMBA_NET:null;
    }catch(e){return null;}
  })();
})();
