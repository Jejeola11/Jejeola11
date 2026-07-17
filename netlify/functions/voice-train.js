// ============================================================
// POST /.netlify/functions/voice-train   (Audio Studio — save a reusable voice)
// Body: { name, sample_url }
// WaveSpeed's Omnivoice has no separate "train a voice" step of its own —
// every generation call just re-supplies a short reference sample. So
// "training" here means exactly one thing: saving that sample under a name
// so it can be picked again later, independent of any specific avatar,
// instead of being re-uploaded (or lost on reload) every single time.
// Synchronous — this is a database write, not a generation, no credit
// charge and nothing to poll.
// ============================================================
const { admin, getUser, json } = require('./_supabase');

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    const user = await getUser(event);
    if (!user) return json(401, { error: 'Please sign in again.' });

    let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
    const name = (body.name || '').trim();
    const sampleUrl = (body.sample_url || '').trim();
    if (!name) return json(400, { error: 'Give this voice a name.' });
    if (!sampleUrl) return json(400, { error: 'Missing the voice sample.' });

    const db = admin();
    const { data, error } = await db.from('voices').insert({ user_id: user.id, name, sample_url: sampleUrl }).select().single();
    if (error) throw new Error(error.message);
    return json(200, { voice: data });
  } catch (e) {
    return json(502, { error: (e && e.message) || 'Could not save this voice.' });
  }
};
