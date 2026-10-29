/* BomBomBa · salas online via Firebase Realtime Database.
   Imita a interface de sala que o jogo já usa dentro do Claude:
   join(nome) → { peers(), presence(patch), onPeers(fn), connected(), leave() }.
   - Cada participante entra com login anônimo do Firebase; o id dele (uid) é a chave do seu nó.
   - Estado de cada um: rooms/<sala>/peers/<uid> = { p: JSON do estado inteiro, t: hora do servidor }.
     As regras do banco (database.rules.json) só deixam cada um escrever no próprio nó, com até 8 KiB.
   - Quem sai (ou perde a conexão) tem o nó apagado pelo servidor (onDisconnect). */
(function(){
  'use strict';
  const cfg=(window.BOMBOMBA_CONFIG||{}).firebase||{};
  const NAME_RE=/^[a-z0-9][a-z0-9_.-]{0,47}$/;
  const MAX_BYTES=8192;
  let app=null,db=null,uidP=null;
  function init(){
    if(app)return;
    if(!cfg.apiKey||!cfg.databaseURL||!cfg.projectId)throw new Error('config_missing');
    if(!window.firebase||typeof window.firebase.initializeApp!=='function')throw new Error('lib_missing');
    app=window.firebase.initializeApp({apiKey:cfg.apiKey,authDomain:cfg.authDomain||undefined,databaseURL:cfg.databaseURL,projectId:cfg.projectId,appId:cfg.appId||undefined});
    db=window.firebase.database();
  }
  /* Login anônimo, sem guardar sessão no aparelho: cada abertura do jogo é um participante novo */
  function signIn(){
    if(!uidP){
      const auth=window.firebase.auth();
      uidP=auth.setPersistence(window.firebase.auth.Auth.Persistence.NONE)
        .then(()=>auth.signInAnonymously()).then(c=>c.user.uid)
        .catch(e=>{uidP=null;throw e;});
    }
    return uidP;
  }
  /* Estado vindo de outra pessoa: só objeto JSON válido e dentro do limite */
  function parse(v){
    if(!v||typeof v.p!=='string'||v.p.length>MAX_BYTES)return null;
    try{const o=JSON.parse(v.p);return o&&typeof o==='object'&&!Array.isArray(o)?Object.freeze(o):null;}catch(e){return null;}
  }
  function join(name){
    return new Promise((resolve,reject)=>{
      if(typeof name!=='string'||!NAME_RE.test(name)){reject({code:'invalid_argument'});return;}
      signIn().then(me=>{
        const base=db.ref('rooms/'+name+'/peers'),mineRef=base.child(me),connRef=db.ref('.info/connected');
        const states=new Map();
        let mine={},cache=null,cbs=[],conn=false,left=false,settled=false;
        const changed=()=>{cache=null;for(const f of cbs){try{f({});}catch(e){}}};
        /* Sem esperar a confirmação do servidor: o banco envia as escritas em ordem pela mesma conexão */
        const write=()=>{if(!left)mineRef.set({p:JSON.stringify(mine),t:window.firebase.database.ServerValue.TIMESTAMP}).catch(()=>{});};
        const onSet=s=>{if(s.key===me)return;const p=parse(s.val());if(p){states.set(s.key,{presence:p,seen:Date.now()});changed();}};
        const onDel=s=>{if(states.delete(s.key))changed();};
        const onConn=s=>{
          conn=s.val()===true;
          if(conn){mineRef.onDisconnect().remove();write();if(!settled){settled=true;clearTimeout(timer);resolve(room);}}
          changed();
        };
        const timer=setTimeout(()=>{if(!settled){settled=true;cleanup();reject({code:'upstream_error',message:'timeout'});}},10000);
        const cleanup=()=>{base.off('child_added',onSet);base.off('child_changed',onSet);base.off('child_removed',onDel);connRef.off('value',onConn);};
        const room={
          name,
          peers(){
            if(cache)return cache;
            const now=Date.now(),arr=[{peer:me,isMe:true,sameTab:true,kind:'viewer',guest:false,by:null,presence:Object.freeze(Object.assign({},mine)),updatedAt:now}];
            for(const [k,v] of states)arr.push({peer:k,isMe:false,sameTab:false,kind:'viewer',guest:false,by:null,presence:v.presence,updatedAt:v.seen});
            return cache=Object.freeze(arr);
          },
          presence(patch){
            if(!patch||typeof patch!=='object')return Promise.reject({code:'invalid_argument'});
            const next=Object.assign({},mine);
            for(const k in patch){if(patch[k]===null)delete next[k];else next[k]=patch[k];}
            if(JSON.stringify(next).length>MAX_BYTES)return Promise.reject({code:'invalid_argument',message:'too_big'});
            mine=next;cache=null;write();return Promise.resolve();
          },
          onPeers(fn){cbs.push(fn);setTimeout(()=>{try{fn({});}catch(e){}},0);return ()=>{cbs=cbs.filter(f=>f!==fn);};},
          connected(){return conn;},
          async leave(){
            if(left)return;left=true;cleanup();
            try{await mineRef.onDisconnect().cancel();}catch(e){}
            try{await mineRef.remove();}catch(e){}
          }
        };
        base.on('child_added',onSet);base.on('child_changed',onSet);base.on('child_removed',onDel);
        connRef.on('value',onConn);
      },e=>reject({code:'not_granted',message:e&&e.message}));
    });
  }
  /* rateMs: intervalo entre envios do estado da partida pelo anfitrião (≈15 por segundo) */
  window.BOMBOMBA_NET={
    connect:async()=>{init();await signIn();return {join,rateMs:66,external:true};}
  };
})();
