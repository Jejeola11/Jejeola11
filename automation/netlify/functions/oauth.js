// ============================================================
// Fuse Auto — one-tap "Connect Instagram" (no token copying).
//   GET ?start=1   -> sends the user to Instagram's login/consent screen
//   GET ?code=...  -> Instagram redirects back here; we swap the code for a
//                     long-lived token + the IG user id and store them, then
//                     bounce back to the dashboard. ManyChat-style.
//
// One-time env vars on this Netlify site:
//   APP_ID      - your Meta app's Instagram app id
//   APP_SECRET  - your Meta app's Instagram app secret
// (Also add this exact URL to the app's "Valid OAuth Redirect URIs":
//   https://YOUR-SITE/.netlify/functions/oauth )
// ============================================================
const { store } = require('./_lib');
const SCOPE = 'instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments';
function siteUrl(event) {
  if (process.env.URL) return process.env.URL;
  const h = (event.headers && (event.headers['x-forwarded-host'] || event.headers.host)) || '';
  return 'https://' + h;
}
function redirect(to) { return { statusCode: 302, headers: { Location: to, 'Cache-Control': 'no-store' }, body: '' }; }
function page(msg) { return { statusCode: 200, headers: { 'Content-Type': 'text/html' }, body: `<meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:sans-serif;background:#031A16;color:#F6F2E8;padding:40px;text-align:center">${msg}<p><a style="color:#F5C518" href="/">← back to Fuse Auto</a></p></body>` }; }

exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  const appId = process.env.APP_ID;
  const appSecret = process.env.APP_SECRET;
  const redirectUri = siteUrl(event) + '/.netlify/functions/oauth';

  if (!appId || !appSecret) {
    return page('<h2>Almost there</h2><p>Add <b>APP_ID</b> and <b>APP_SECRET</b> in this site\'s Netlify environment variables, then redeploy.</p>');
  }

  // Step 1 — send to Instagram consent
  if (q.start || (!q.code && !q.error)) {
    const url = 'https://www.instagram.com/oauth/authorize'
      + '?client_id=' + encodeURIComponent(appId)
      + '&redirect_uri=' + encodeURIComponent(redirectUri)
      + '&response_type=code&scope=' + encodeURIComponent(SCOPE);
    return redirect(url);
  }

  if (q.error) return page('<h2>Connection cancelled</h2><p>' + (q.error_description || q.error) + '</p>');

  // Step 2 — exchange the code for a token
  try {
    const form = new URLSearchParams({
      client_id: appId, client_secret: appSecret, grant_type: 'authorization_code',
      redirect_uri: redirectUri, code: q.code,
    });
    const r1 = await fetch('https://api.instagram.com/oauth/access_token', { method: 'POST', body: form });
    const d1 = await r1.json();
    if (!d1.access_token) return page('<h2>Could not connect</h2><p>' + JSON.stringify(d1) + '</p>');

    // swap the short token for a 60-day long-lived token
    const r2 = await fetch('https://graph.instagram.com/access_token?grant_type=ig_exchange_token'
      + '&client_secret=' + encodeURIComponent(appSecret)
      + '&access_token=' + encodeURIComponent(d1.access_token));
    const d2 = await r2.json();
    const token = d2.access_token || d1.access_token;

    // who is this?
    let username = '', userId = String(d1.user_id || '');
    try {
      const r3 = await fetch('https://graph.instagram.com/me?fields=user_id,username&access_token=' + encodeURIComponent(token));
      const d3 = await r3.json();
      username = d3.username || ''; userId = String(d3.user_id || userId);
    } catch (e) {}

    // Crucial step that's easy to miss: getting a token only lets us CALL the API.
    // The account also has to be explicitly subscribed, or Instagram never sends
    // comment/message events to our webhook at all (verification still passes either way).
    let subscribed = false, subscribeError = '';
    try {
      const r4 = await fetch(`https://graph.instagram.com/v21.0/${userId}/subscribed_apps?subscribed_fields=comments,messaging_postbacks&access_token=${encodeURIComponent(token)}`, { method: 'POST' });
      const d4 = await r4.json();
      subscribed = !!d4.success;
      if (!subscribed) subscribeError = JSON.stringify(d4);
    } catch (e) { subscribeError = String(e); }

    const s = await store();
    await s.setJSON('conn', { token, userId, username, subscribed, subscribeError, ts: Date.now() });
    if (!subscribed) return page(`<h2>Connected, but one step failed</h2><p>Your Instagram is linked, but the webhook subscription call didn't succeed:</p><p style="color:#ff6b6b;font-size:13px">${subscribeError}</p><p>Try the <b>"Check my setup"</b> button on the dashboard — it can retry just this step without reconnecting.</p>`);
    return redirect('/?connected=1');
  } catch (e) {
    if (String(e).includes('MissingBlobsEnvironmentError')) {
      return page('<h2>One more env var needed</h2><p>Add <b>NETLIFY_BLOBS_TOKEN</b> in this site\'s Netlify environment variables (a Personal Access Token from <b>app.netlify.com → your avatar → User settings → Applications → New access token</b>), then redeploy and tap Connect Instagram again.</p>');
    }
    return page('<h2>Something went wrong</h2><p>' + String(e) + '</p>');
  }
};
