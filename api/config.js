// Entrega ao navegador o endereço e a chave pública (anon) do Supabase,
// lidos das variáveis de ambiente da Vercel. A chave anon é pública por natureza:
// nunca coloque aqui a service_role.
module.exports = (req, res) => {
  const url = String(process.env.SUPABASE_URL || '').trim();
  const key = String(process.env.SUPABASE_ANON_KEY || '').trim();
  const okUrl = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url) ? url : '';
  const okKey = /^[A-Za-z0-9._-]{20,2000}$/.test(key) ? key : '';
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.status(200).send('window.ESTOPIM_CONFIG=' + JSON.stringify({ supabaseUrl: okUrl, supabaseKey: okKey }) + ';');
};
