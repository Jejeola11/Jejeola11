const crypto = require('crypto');
const { admin, getUser, json } = require('./_supabase');

async function requireAdmin(event) {
  const user = await getUser(event);
  if (!user) return { error: json(401, { error: 'Please sign in again.' }) };
  const db = admin();
  const { data: profile, error } = await db
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (error || !profile || !profile.is_admin) return { error: json(403, { error: 'Admins only.' }) };
  return { db, user };
}

function parseBody(event) {
  try { return JSON.parse(event.body || '{}'); } catch (_) { return {}; }
}

function clean(value, max = 5000) {
  return String(value || '').trim().slice(0, max);
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}

function token() {
  return crypto.randomBytes(24).toString('base64url');
}

function publicAppUrl() {
  // The custom domain is the safe production fallback. FUSE_PUBLIC_URL can
  // still override this for an intentionally configured environment.
  return clean(process.env.FUSE_PUBLIC_URL || process.env.APP_URL || 'https://fuseatelier.com').replace(/\/$/, '');
}

module.exports = { requireAdmin, parseBody, clean, escapeHtml, token, publicAppUrl };
