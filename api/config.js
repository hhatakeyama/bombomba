// Entrega ao navegador qual servidor de salas usar e as chaves públicas dele, lidas das
// variáveis de ambiente da Vercel. Só valores públicos por natureza: nunca coloque aqui a
// service_role do Supabase nem credenciais de administrador do Firebase.
//   NET_PROVIDER = firebase (padrão) | supabase: servidor padrão do site. Os dois servidores configurados
//   aparecem em Opções, onde o jogador escolhe um ou deixa no Automático (o que responder mais rápido).
//   Firebase: FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_DATABASE_URL, FIREBASE_PROJECT_ID, FIREBASE_APP_ID
//   Supabase: SUPABASE_URL, SUPABASE_ANON_KEY
const env = k => String(process.env[k] || '').trim();
const ok = (v, re) => (re.test(v) ? v : '');
module.exports = (req, res) => {
  const provider = env('NET_PROVIDER').toLowerCase() === 'supabase' ? 'supabase' : 'firebase';
  const cfg = {
    provider,
    firebase: {
      apiKey: ok(env('FIREBASE_API_KEY'), /^[A-Za-z0-9_-]{20,80}$/),
      authDomain: ok(env('FIREBASE_AUTH_DOMAIN'), /^[a-z0-9-]+\.(firebaseapp\.com|web\.app)$/i),
      databaseURL: ok(env('FIREBASE_DATABASE_URL'), /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)?\.(firebaseio\.com|firebasedatabase\.app)$/i),
      projectId: ok(env('FIREBASE_PROJECT_ID'), /^[a-z0-9-]{4,40}$/),
      appId: ok(env('FIREBASE_APP_ID'), /^[0-9]:[0-9]{6,20}:web:[a-f0-9]{6,40}$/i)
    },
    supabase: {
      url: ok(env('SUPABASE_URL'), /^https:\/\/[a-z0-9-]+\.supabase\.co$/i),
      key: ok(env('SUPABASE_ANON_KEY'), /^[A-Za-z0-9._-]{20,2000}$/)
    }
  };
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.status(200).send('window.BOMBOMBA_CONFIG=' + JSON.stringify(cfg) + ';');
};
