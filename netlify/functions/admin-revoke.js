// ============================================================
// POST /.netlify/functions/admin-revoke   (owner/admin only)
// Body: { email, credits?, revoke_plan? }
//   - credits: how many credits to take back (capped at whatever the
//     buyer's current balance actually is, so this can never push them
//     negative even if they've already spent some of a mistaken grant)
//   - revoke_plan: true to drop them back to the 'free' plan and clear
//     plan_expires_at
// The undo counterpart to admin-grant.js, for correcting an accidental
// manual grant.
// ============================================================
const { admin, getUser, json } = require('./_supabase');

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

    const user = await getUser(event);
    if (!user) return json(401, { error: 'Please sign in again.' });

    const db = admin();
    const { data: me } = await db.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
    if (!me || !me.is_admin) return json(403, { error: 'Admins only.' });

    let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
    const email = (body.email || '').trim();
    const requestedCredits = parseInt(body.credits, 10) || 0;
    const revokePlan = !!body.revoke_plan;
    if (!email) return json(400, { error: 'Enter the buyer\'s email.' });
    if (requestedCredits <= 0 && !revokePlan) return json(400, { error: 'Enter a credit amount to remove, or check revoke plan.' });

    const { data: rows } = await db.from('profiles').select('id, email, credits, plan').ilike('email', email).limit(1);
    const target = rows && rows[0];
    if (!target) return json(404, { error: 'No account with that email.' });

    let removed = 0;
    if (requestedCredits > 0) {
      // Cap at their actual current balance — they may have already spent
      // some of the mistaken grant, and spend_credits refuses (returns
      // null) rather than going negative.
      removed = Math.min(requestedCredits, target.credits || 0);
      if (removed > 0) {
        const { data: newBalance } = await db.rpc('spend_credits', { uid: target.id, amount: removed });
        if (newBalance === null) removed = 0;
      }
    }

    if (revokePlan) {
      await db.from('profiles').update({ plan: 'free', plan_expires_at: null }).eq('id', target.id);
    }

    try {
      await db.from('payments').insert({
        user_id: target.id, reference: 'revoke-' + Date.now() + '-' + email,
        amount_naira: 0, pack: 'admin-revoke', credits_added: -removed, status: 'manual',
      });
    } catch (e) {}

    return json(200, {
      ok: true, email: target.email, credits_removed: removed,
      short_of_requested: requestedCredits - removed,
      plan_revoked: revokePlan,
    });
  } catch (e) {
    return json(500, { error: (e && e.message) || 'Revoke failed — try again.' });
  }
};
