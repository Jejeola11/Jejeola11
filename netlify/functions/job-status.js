// ============================================================
// GET /.netlify/functions/job-status?id=<request_id>
// Auth required. Checks a pending job once: returns processing / completed
// (with the URL, and records the generation) / failed (and refunds credits).
// The browser calls this every few seconds until done.
// ============================================================
const { admin, getUser, json } = require('./_supabase');
const { pollAny } = require('./_providers');

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

  const isTextKind = job.kind === 'chat' || job.kind === 'flyer-brief';
  if (job.status === 'completed') {
    return isTextKind ? json(200, { status: 'completed', text: job.output_text }) : json(200, { status: 'completed', url: job.output_url });
  }
  if (job.status === 'failed') return json(200, { status: 'failed' });

  // Chat jobs (Fuse Reactor) and Flyer Studio's design-assistant calls are
  // always MuAPI text models — poll directly for the raw body extractText()
  // needs. flyer-brief responses are a JSON string; the browser parses it.
  if (isTextKind) {
    let p;
    try {
      p = await (await fetch(`${MUAPI_BASE}/predictions/${id}/result`, { headers: { 'x-api-key': process.env.MUAPI_KEY } })).json();
    } catch (e) { return json(200, { status: 'processing' }); }
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

  // Video / avatar / modelsheet: pollAny routes by the request_id prefix
  // ("ws:" -> WaveSpeed, bare -> MuAPI) so mixed-provider jobs just work.
  let r;
  try { r = await pollAny(id); } catch (e) { return json(200, { status: 'processing' }); }

  if (r.status === 'completed') {
    const url = r.url;
    if (!url) return json(200, { status: 'processing' });
    await db.from('jobs').update({ status: 'completed', output_url: url }).eq('request_id', id);
    // A model sheet isn't a normal gallery item — save it onto the avatar so all
    // future generations use it as the consistent reference. The avatar id is
    // carried in the prompt as "MODELSHEET::<id>" (or in the avatar_id column).
    if (job.kind === 'modelsheet') {
      const avId = job.avatar_id || (job.prompt && job.prompt.indexOf('MODELSHEET::') === 0 ? job.prompt.slice(12) : null);
      if (avId) { try { await db.from('avatars').update({ model_sheet_url: url }).eq('id', avId); } catch (e) {} }
      return json(200, { status: 'completed', url, kind: 'modelsheet' });
    }
    // Flyer Studio's hero/layer visuals are working images inside an
    // in-progress project, not a finished gallery item — save onto the
    // project instead of `generations`. flyer-layer also appends to the
    // project's layer history so the UI can show what's been added so far.
    if (job.kind === 'flyer-hero' || job.kind === 'flyer-layer') {
      if (job.project_id) {
        try {
          const { data: proj } = await db.from('flyer_projects').select('layers, credits').eq('id', job.project_id).maybeSingle();
          const update = { hero_image_url: url, updated_at: new Date().toISOString(), credits: (proj && proj.credits || 0) + job.credits };
          if (job.kind === 'flyer-hero') update.hero_prompt = job.prompt;
          if (job.kind === 'flyer-layer') {
            const layers = (proj && Array.isArray(proj.layers)) ? proj.layers : [];
            layers.push({ instruction: job.prompt, image_url: url, created_at: new Date().toISOString() });
            update.layers = layers;
          }
          await db.from('flyer_projects').update(update).eq('id', job.project_id);
        } catch (e) {}
      }
      return json(200, { status: 'completed', url, kind: job.kind, project_id: job.project_id });
    }
    await db.from('generations').insert({
      user_id: user.id, type: job.kind, model: job.model, prompt: job.prompt, aspect: job.aspect,
      output_url: url, credits_spent: job.credits, cost_usd: r.cost_usd,
    });
    return json(200, { status: 'completed', url });
  }
  if (r.status === 'failed') {
    await db.rpc('add_credits', { uid: user.id, amount: job.credits, why: 'refund' });
    await db.from('jobs').update({ status: 'failed' }).eq('request_id', id);
    return json(200, { status: 'failed', error: 'Generation failed' });
  }
  return json(200, { status: 'processing' });
};
