const { admin, getUser, json } = require('./_supabase');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed.' });
  const user = await getUser(event);
  if (!user) return json(401, { error: 'Sign in to access your library.' });
  let id;
  try { id = JSON.parse(event.body || '{}').id; } catch (_) { return json(400, { error: 'Invalid request.' }); }
  id = typeof id === 'number' && Number.isSafeInteger(id) ? String(id) : id;
  if (typeof id !== 'string' || !/^[1-9][0-9]{0,18}$/.test(id)) return json(400, { error: 'Invalid creation ID.' });
  const { data, error } = await admin().from('generations').select('output_url').eq('id', id).eq('user_id', user.id).maybeSingle();
  if (error) return json(500, { error: 'Could not check this creation.' });
  if (!data) return json(404, { error: 'Creation not found.' });
  let url;
  try { url = new URL(data.output_url); } catch (_) { return json(200, { unavailable: true }); }
  if (url.protocol !== 'https:' || !['d2h7xmz5gqybh9.cloudfront.net', 'rgbweaimkcndjznlazho.supabase.co'].includes(url.hostname)) return json(200, { unavailable: null });
  try {
    const response = await fetch(url, { method: 'HEAD', redirect: 'error', signal: AbortSignal.timeout(10000) });
    return json(200, { unavailable: [403,404,410].includes(response.status), status: response.status });
  } catch (_) { return json(200, { unavailable: null }); }
};
