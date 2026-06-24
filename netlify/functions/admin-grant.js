// ============================================================
// POST /.netlify/functions/admin-grant   (owner/admin only)
// Body: { email, pack }. Manually unlocks a buyer who paid by transfer:
// adds the pack's credits (with the first-50 2x bonus) and sets their plan.
// ============================================================
const { admin, getUser, json } = require('./_supabase');
const { PACKS } = require('./_packs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const user = await getUser(event);
  if (!user) return json(401, { error: 'Please sign in again.' });

  const db = admin();
  const { data: me } = await db.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  if (!me || !me.is_admin) return json(403, { error: 'Admins only.' });

  let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
  const email = (body.email || '').trim();
  const pack = PACKS[body.pack];
  if (!email || !pack) return json(400, { error: 'Enter an email and pick a pack.' });

  // Find the buyer's account by email.
  const { data: rows } = await db.from('profiles').select('id, email').ilike('email', email).limit(1);
  const target = rows && rows[0];
  if (!target) return json(404, { error: 'No account with that email yet — ask them to sign up first, then grant.' });

  // First-50 founding 2x bonus (one-time) applies to manual grants too.
  let credits = pack.credits, founding = false;
  try { const { data } = await db.rpc('claim_founding', { uid: target.id }); founding = !!data; } catch (e) {}
  if (founding) credits *= 2;

  await db.rpc('add_credits', { uid: target.id, amount: credits, why: 'manual_grant' });

  if (pack.kind === 'sub' || pack.kind === 'course') {
    const plan = pack.plan || 'pro';
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await db.from('profiles').update({ plan, plan_expires_at: expires }).eq('id', target.id);
  }

  await db.from('payments').insert({
    user_id: target.id, reference: 'manual-' + Date.now() + '-' + email,
    amount_naira: pack.amount_naira, pack: body.pack, credits_added: credits, status: 'manual',
  });

  return json(200, { ok: true, email: target.email, credits, founding, plan: pack.plan || pack.kind });
};
