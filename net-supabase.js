/* Estopim · salas online via Supabase Realtime.
   Imita a interface de sala que o jogo já usa dentro do Claude:
   join(nome) → { peers(), presence(patch), onPeers(fn), connected(), leave() }.
   - Quem está na sala: Presence do Supabase (entra/sai).
   - Estado de cada um (lobby, entrada, estado da partida): mensagens "st" de Broadcast,
     sempre com o estado inteiro (nunca diferenças), reenviadas a cada 1,5 s e
     quando alguém entra, para quem chega depois receber tudo. */
(function(){
  'use strict';
  const cfg=window.ESTOPIM_CONFIG||{};
  const NAME_RE=/^[a-z0-9][a-z0-9_.-]{0,47}$/;
  const MAX_BYTES=8192;
  let client=null;
  function uid(){const a=new Uint8Array(8);crypto.getRandomValues(a);return Array.from(a,b=>b.toString(16).padStart(2,'0')).join('');}
  function getClient(){
    if(client)return client;
    if(!cfg.supabaseUrl||!cfg.supabaseKey)throw new Error('config_missing');
    if(!window.supabase||typeof window.supabase.createClient!=='function')throw new Error('lib_missing');
    client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{auth:{persistSession:false,autoRefreshToken:false},realtime:{params:{eventsPerSecond:40}}});
    return client;
  }
  function join(name){
    return new Promise((resolve,reject)=>{
      if(typeof name!=='string'||!NAME_RE.test(name)){reject({code:'invalid_argument'});return;}
      let c;try{c=getClient();}catch(e){reject({code:'not_granted',message:e.message});return;}
      const me=uid();
      const ch=c.channel('estopim:'+name,{config:{broadcast:{self:false,ack:false},presence:{key:me}}});
      const states=new Map(),members=new Set();
      let mine={},cache=null,cbs=[],conn=false,hb=null,left=false,lastSent=0,settled=false;
      const changed=()=>{cache=null;for(const f of cbs){try{f({});}catch(e){}}};
      const sendMine=()=>{if(!conn||left)return;lastSent=Date.now();ch.send({type:'broadcast',event:'st',payload:{peer:me,p:mine}});};
      ch.on('broadcast',{event:'st'},msg=>{
        const pl=msg&&msg.payload;
        if(!pl||typeof pl.peer!=='string'||pl.peer===me||pl.peer.length>32)return;
        const p=pl.p&&typeof pl.p==='object'&&!Array.isArray(pl.p)?pl.p:{};
        states.set(pl.peer,{presence:Object.freeze(p),seen:Date.now()});changed();
      });
      ch.on('broadcast',{event:'hi'},()=>sendMine());
      ch.on('presence',{event:'sync'},()=>{
        const st=ch.presenceState();members.clear();Object.keys(st).forEach(k=>members.add(k));
        for(const k of [...states.keys()])if(!members.has(k))states.delete(k);
        changed();
      });
      ch.on('presence',{event:'join'},()=>sendMine());
      /* Reanuncia presença e estado sempre que o canal volta (rede caiu, aba em segundo plano) */
      const announce=async()=>{try{await ch.track({j:Date.now()});}catch(e){}if(!conn||left)return;ch.send({type:'broadcast',event:'hi',payload:{}});sendMine();};
      const onVis=()=>{if(document.visibilityState==='visible'&&!left){announce();changed();}};
      document.addEventListener('visibilitychange',onVis);
      const timer=setTimeout(()=>{if(!settled){settled=true;try{c.removeChannel(ch);}catch(e){}reject({code:'upstream_error',message:'timeout'});}},10000);
      const room={
        name,
        peers(){
          if(cache)return cache;
          const now=Date.now(),arr=[{peer:me,isMe:true,sameTab:true,kind:'viewer',guest:false,by:null,presence:Object.freeze(Object.assign({},mine)),updatedAt:now}];
          for(const [k,v] of states)if(members.has(k)||now-v.seen<4000)arr.push({peer:k,isMe:false,sameTab:false,kind:'viewer',guest:false,by:null,presence:v.presence,updatedAt:v.seen});
          return cache=Object.freeze(arr);
        },
        presence(patch){
          if(!patch||typeof patch!=='object')return Promise.reject({code:'invalid_argument'});
          const next=Object.assign({},mine);
          for(const k in patch){if(patch[k]===null)delete next[k];else next[k]=patch[k];}
          if(JSON.stringify(next).length>MAX_BYTES)return Promise.reject({code:'invalid_argument',message:'too_big'});
          mine=next;cache=null;sendMine();return Promise.resolve();
        },
        onPeers(fn){cbs.push(fn);setTimeout(()=>{try{fn({});}catch(e){}},0);return ()=>{cbs=cbs.filter(f=>f!==fn);};},
        connected(){return conn;},
        async leave(){if(left)return;left=true;clearInterval(hb);document.removeEventListener('visibilitychange',onVis);try{await ch.untrack();}catch(e){}try{await c.removeChannel(ch);}catch(e){}}
      };
      ch.subscribe(async status=>{
        if(status==='SUBSCRIBED'){
          conn=true;
          await announce();
          if(!settled){
            settled=true;clearTimeout(timer);
            hb=setInterval(()=>{if(Date.now()-lastSent>1500)sendMine();},500);
            resolve(room);
          }else changed();
        }else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){conn=false;changed();}
      });
    });
  }
  /* rateMs: intervalo entre envios do estado da partida pelo anfitrião (≈15 por segundo) */
  window.ESTOPIM_NET={
    connect:async()=>{getClient();return {join,rateMs:66,external:true};}
  };
})();
