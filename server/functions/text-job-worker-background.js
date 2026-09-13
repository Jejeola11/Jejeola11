// ============================================================
// BACKGROUND FUNCTION — netlify/functions/text-job-worker-background.js
// Body: { request_id }
// Invoked fire-and-forget by any endpoint that just inserted a pending
// text-kind job (chat, flyer-brief, video-edit-brief, flyer-suggest-layers)
// -- Netlify calls this a "Background Function" because of the filename
// suffix, and immediately returns 202 to the caller while the real work
// keeps running server-side for up to 15 minutes, instead of the ~10-26s
// window every normal function in this app is bound to.
//
// That's not a theoretical concern here: a real WaveSpeed LLM call through
// Claude Sonnet 4.5 with even ONE small image attached measured 27+
// seconds live (confirmed 2026-07-18) -- comfortably past even the
// generous 26s Pro-tier synchronous limit. Doing this call inline inside
// job-status.js's own poll response (the original lazy-completion design)
// meant Netlify killed the function mid-call every time, and because
// that's a process-level kill (not a catchable JS error), the atomic
// claim it had just written ('generating') never got reverted -- the job
// was stuck forever with no retry, no failure, no refund. This worker
// does the actual call here instead, with real room to spare; job-status.js
// now just reads whatever this worker eventually writes.
// ============================================================
const { admin } = require('./_supabase');
const { chatCompletion, decodeModelImage } = require('./_providers');

// Generous but still bounded -- guards against a genuinely hung WaveSpeed
// request eating the whole 15-minute background budget for nothing.
const LLM_TIMEOUT_MS = 120000;

exports.handler = async (event) => {
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return { statusCode: 200 }; }
  const id = body.request_id;
  if (!id) return { statusCode: 200 };

  const db = admin();
  const { data: job } = await db.from('jobs').select('*').eq('request_id', id).maybeSingle();
  if (!job) return { statusCode: 200 };

  // Atomic claim -- same reasoning as everywhere else in this app: a retry
  // path (see flyer-brief.js etc.) can re-trigger this worker for the same
  // job if the first invocation's own fetch is slow to fire, so only the
  // poll/trigger that wins this conditional update actually runs the paid
  // call.
  const { data: claimed } = await db.from('jobs').update({ status: 'generating' }).eq('request_id', id).eq('status', 'processing').select().maybeSingle();
  if (!claimed) return { statusCode: 200 };

  const { model, imageUrl } = decodeModelImage(job.model);
  try {
    const text = await chatCompletion({ prompt: job.prompt, imageUrl, model, timeoutMs: LLM_TIMEOUT_MS });
    await db.from('jobs').update({ status: 'completed', output_text: text }).eq('request_id', id);
  } catch (e) {
    try { await db.rpc('add_credits', { uid: job.user_id, amount: job.credits, why: 'refund' }); } catch (_) {}
    // output_text doubles as the error message on failure (jobs has no
    // dedicated error column) -- job-status.js's failed-branch reads it
    // back so the user sees why, not just a bare "Failed".
    await db.from('jobs').update({ status: 'failed', output_text: (e && e.message) || 'AI failed' }).eq('request_id', id);
  }
  return { statusCode: 200 };
};
