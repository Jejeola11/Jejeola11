// GET /.netlify/functions/debug-env
// Temporary diagnostic — confirms whether VERIFY_TOKEN / APP_ID / APP_SECRET are
// actually set on THIS deploy, without ever printing the real secret values.
// Safe to leave deployed (no secrets exposed), but delete once setup is confirmed.
function probe(name) {
  const v = process.env[name];
  if (v === undefined) return { set: false };
  return {
    set: true,
    length: v.length,
    trimmedLength: v.trim().length,
    hasWhitespace: v.trim().length !== v.length,
    preview: v.length > 4 ? v.slice(0, 2) + '…' + v.slice(-2) : '(too short to preview)',
  };
}

exports.handler = async () => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify({
      VERIFY_TOKEN: probe('VERIFY_TOKEN'),
      APP_ID: probe('APP_ID'),
      APP_SECRET: probe('APP_SECRET'),
      IG_USER_ID: probe('IG_USER_ID'),
      IG_ACCESS_TOKEN: probe('IG_ACCESS_TOKEN'),
      NETLIFY_BLOBS_TOKEN: probe('NETLIFY_BLOBS_TOKEN'),
      SITE_ID_auto_injected: probe('SITE_ID'),
      deployedAt: process.env.DEPLOY_ID || 'unknown',
    }, null, 2),
  };
};
