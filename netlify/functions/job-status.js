// ============================================================
// GET /.netlify/functions/job-status?id=<request_id>
// Auth required. Checks a pending job once: returns processing / completed
// (with the URL, and records the generation) / failed (and refunds credits).
// The browser calls this every few seconds until done.
// ============================================================
const { admin, getUser, json } = require('./_supabase');

const MUAPI_BASE = 'https://api.muapi.ai/api/v1';

function extractText(p) {
  if (!p) return '';
  if (typeof p.output === 'string') return p.output;
  if (typeof p.text === 'string') return p.text;
  if (typeof p.result === 'string') return p.result;
  if (Array.isArray(p.outputs) && p.outputs.length) return String(p.outputs[0]);
  if (p.choices && p.choices[0] && p.choices[0].message) return p.choices[0].message.content;
  if (p.output && typeof p.output === 'object') return p.output.text || '';
  return '';
}

exports.handler = async (event) => {
  const user = await getUser(event);
  if (!user) return json(401, { error: 'Please sign in again.' });
  const id = (event.queryStringParameters || {}).id;
  if (!id) return json(400, { error: 'Missing id' });

  const db = admin();
  const { data: job } = await db.from('jobs').select('*').eq('request_id', id).maybeSingle();
  if (!job || job.user_id !== user.id) return json(404, { error: 'Job not found' });

  if (job.status === 'completed') {
    return job.kind === 'chat' ? json(200, { status: 'completed', text: job.output_text }) : json(200, { status: 'completed', url: job.output_url });
  }
  if (job.status === 'failed') return json(200, { status: 'failed' });

  // Ask MuAPI for the result.
  let p;
  try {
    p = await (await fetch(`${MUAPI_BASE}/predictions/${id}/result`, { headers: { 'x-api-key': process.env.MUAPI_KEY } })).json();
  } catch (e) { return json(200, { status: 'processing' }); }

  if (job.kind === 'chat') {
    if (p.status === 'completed') {
      const text = extractText(p);
      if (!text) return json(200, { status: 'processing' });
      await db.from('jobs').update({ status: 'completed', output_text: text }).eq('request_id', id);
      return json(200, { status: 'completed', text });
    }
    if (p.status === 'failed' || p.status === 'cancelled') {
      await db.rpc('add_credits', { uid: user.id, amount: job.credits, why: 'refund' });
      await db.from('jobs').update({ status: 'failed' }).eq('request_id', id);
      return json(200, { status: 'failed', error: 'AI ' + p.status });
    }
    return json(200, { status: 'processing' });
  }

  if (p.status === 'completed') {
    const url = p.outputs && p.outputs[0];
    await db.from('jobs').update({ status: 'completed', output_url: url }).eq('request_id', id);
    // A model sheet isn't a normal gallery item — save it onto the avatar so all
    // future generations use it as the consistent reference. The avatar id is
    // carried in the prompt as "MODELSHEET::<id>" (or in the avatar_id column).
    if (job.kind === 'modelsheet') {
      const avId = job.avatar_id || (job.prompt && job.prompt.indexOf('MODELSHEET::') === 0 ? job.prompt.slice(12) : null);
      if (avId) { try { await db.from('avatars').update({ model_sheet_url: url }).eq('id', avId); } catch (e) {} }
      return json(200, { status: 'completed', url, kind: 'modelsheet' });
    }
    await db.from('generations').insert({
      user_id: user.id, type: job.kind, model: job.model, prompt: job.prompt, aspect: job.aspect,
      output_url: url, credits_spent: job.credits, cost_usd: p.cost && p.cost.amount_usd,
    });
    return json(200, { status: 'completed', url });
  }
  if (p.status === 'failed' || p.status === 'cancelled') {
    await db.rpc('add_credits', { uid: user.id, amount: job.credits, why: 'refund' });
    await db.from('jobs').update({ status: 'failed' }).eq('request_id', id);
    return json(200, { status: 'failed', error: 'Generation ' + p.status });
  }
  return json(200, { status: 'processing' });
};
