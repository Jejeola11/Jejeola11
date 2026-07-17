// ============================================================
// GET /.netlify/functions/resemble-voices   (Audio Studio — Resemble picker)
// Lists this Resemble account's own trained voices (not the 150+ built-in
// stock voices every account starts with) so the picker only ever shows
// real options. See listResembleVoices() in _providers.js.
// ============================================================
const { getUser, json } = require('./_supabase');
const { listResembleVoices, hasResemble } = require('./_providers');

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });
    const user = await getUser(event);
    if (!user) return json(401, { error: 'Please sign in again.' });
    if (!hasResemble()) return json(200, { voices: [] });

    const voices = await listResembleVoices();
    return json(200, { voices });
  } catch (e) {
    return json(502, { error: (e && e.message) || 'Could not load Resemble voices.' });
  }
};
