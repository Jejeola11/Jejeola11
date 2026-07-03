// ============================================================
// GET /.netlify/functions/parse-job?url=<job url>
// Fetches a job post server-side (no browser CORS) and returns its visible text
// so PitchPilot can auto-extract the client's name / company / location.
// Many sites (e.g. Upwork) block bots or require login — in that case we return
// ok:false and the app asks the user to paste the job text instead.
// ============================================================
exports.handler = async (event) => {
  const url = (event.queryStringParameters || {}).url || '';
  if (!/^https?:\/\//i.test(url)) {
    return resp(400, { ok: false, error: 'Bad url' });
  }
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });
    const html = await r.text();
    // Strip scripts/styles/tags to plain visible text.
    let text = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();

    // Detect a login wall / block page.
    const low = text.toLowerCase();
    const blocked = text.length < 400 ||
      /log in to continue|sign in to continue|access denied|are you a human|enable javascript|please verify you are/i.test(low);
    if (blocked) return resp(200, { ok: false, blocked: true });

    return resp(200, { ok: true, text: text.slice(0, 6000) });
  } catch (e) {
    return resp(200, { ok: false, error: (e && e.message) || 'fetch failed' });
  }
};

function resp(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(body) };
}
