/* BomBomBa · servidores de salas disponíveis no site (Firebase e/ou Supabase, conforme /api/config).
   window.BOMBOMBA_SERVERS = { def, list, load(p), ping(p) }:
   - def: servidor padrão do site (NET_PROVIDER), list: servidores configurados;
   - load(p): carrega a biblioteca do servidor (versão fixa) e o adaptador, e devolve o adaptador (ou null);
   - ping(p): mede o tempo de resposta do servidor em ms (melhor de 3), sem carregar a biblioteca.
   O jogador escolhe o servidor em Opções (Automático usa o que responder mais rápido). */
(function(){
  'use strict';
  const cfg=window.BOMBOMBA_CONFIG||{},fb=cfg.firebase||{},sb=cfg.supabase||{};
  const ok={firebase:!!(fb.apiKey&&fb.databaseURL&&fb.projectId),supabase:!!(sb.url&&sb.key)};
  const LIBS={
    firebase:{lib:()=>window.firebase,src:['https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js','https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js','https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js'],adapter:'/net-firebase.js'},
    supabase:{lib:()=>window.supabase,src:['https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4'],adapter:'/net-supabase.js'}
  };
  window.BOMBOMBA_NETS=window.BOMBOMBA_NETS||{};
  const script=src=>new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.async=false;s.onload=res;s.onerror=rej;document.head.append(s);});
  const loading={};
  function load(p){
    if(!ok[p])return Promise.resolve(null);
    if(!loading[p])loading[p]=(async()=>{
      const L=LIBS[p];
      if(!L.lib())for(const src of L.src)await script(src); // biblioteca já presente (ex.: testes) não é baixada de novo
      if(!window.BOMBOMBA_NETS[p])await script(L.adapter);
      const n=window.BOMBOMBA_NETS[p];
      return n&&typeof n.connect==='function'?n:null;
    })().catch(()=>{loading[p]=null;return null;});
    return loading[p];
  }
  async function ping(p){
    if(!ok[p])return null;
    const url=p==='firebase'?fb.databaseURL+'/.json?shallow=true':sb.url+'/auth/v1/health';
    const opt=p==='supabase'?{headers:{apikey:sb.key},cache:'no-store'}:{cache:'no-store'};
    let best=Infinity;
    for(let i=0;i<3;i++){const t=performance.now();try{await fetch(url,opt);}catch(e){return null;}best=Math.min(best,performance.now()-t);}
    return Math.round(best);
  }
  const list=['firebase','supabase'].filter(p=>ok[p]);
  window.BOMBOMBA_SERVERS={def:ok[cfg.provider]?cfg.provider:(list[0]||null),list,load,ping};
})();
