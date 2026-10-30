// Mantém o projeto do Supabase ativo: o plano gratuito pausa projetos com pouca atividade, e enquanto ele
// pausa ou volta as salas ficam fora do ar (erros 521 e "terminating connection" nos logs).
// A Vercel chama esta rota uma vez por dia (crons em vercel.json) e ela executa a função keepalive() no banco
// (SQL no README). Só responde a quem manda o CRON_SECRET, que a Vercel envia sozinha nas chamadas agendadas.
const env = k => String(process.env[k] || '').trim();
module.exports = async (req, res) => {
  const secret = env('CRON_SECRET');
  if (!secret || req.headers.authorization !== 'Bearer ' + secret) { res.status(401).json({ ok: false }); return; }
  const url = env('SUPABASE_URL'), key = env('SUPABASE_ANON_KEY');
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url) || !/^[A-Za-z0-9._-]{20,2000}$/.test(key)) { res.status(200).json({ ok: true, skipped: 'supabase_not_configured' }); return; }
  try {
    const r = await fetch(url + '/rest/v1/rpc/keepalive', {
      method: 'POST',
      headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: '{}',
      signal: AbortSignal.timeout(10000)
    });
    res.status(r.ok ? 200 : 502).json({ ok: r.ok, status: r.status });
  } catch (e) {
    res.status(502).json({ ok: false, error: 'unreachable' });
  }
};
