// Fuse Atelier Paystack callback.
// Verifies the transaction server-side, creates/locates the buyer by purchase
// email, grants full Atelier course access + starter credits, records payment,
// then sends the buyer to the email+name login screen.
const { admin } = require('../server/functions/_supabase');

const PLANS = {
  atelier_core:       { label: 'Fuse Core', amount_naira: 25000, starter_credits: 10 },
  atelier_fast_track: { label: 'Fuse Fast Track', amount_naira: 119000, starter_credits: 10 },
  atelier_vip:        { label: 'Fuse VIP — First Client Intensive', amount_naira: 499000, starter_credits: 10 },
};

function redirect(res, url) {
  res.statusCode = 302;
  res.setHeader('location', url);
  res.setHeader('cache-control', 'no-store');
  res.end();
}

async function findAuthUserByEmail(db, email) {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const users = data?.users || [];
    const found = users.find(u => String(u.email || '').trim().toLowerCase() === email);
    if (found) return found;
    if (users.length < 1000) break;
  }
  return null;
}

async function ensureBuyer(db, email, name) {
  const { data: rows, error: profileError } = await db
    .from('profiles')
    .select('id,email')
    .ilike('email', email)
    .limit(1);
  if (profileError) throw profileError;
  if (rows?.[0]) return rows[0];

  let authUser = await findAuthUserByEmail(db, email);
  if (!authUser) {
    const { data, error } = await db.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { source: 'paystack-fuse-atelier', display_name: name || '' },
    });
    if (error) throw error;
    authUser = data?.user;
  }
  if (!authUser) throw new Error('Could not prepare buyer account.');

  // The auth trigger normally creates this row. Upsert makes the checkout
  // resilient if the trigger is delayed or missing.
  const { error: upsertError } = await db
    .from('profiles')
    .upsert({ id: authUser.id, email }, { onConflict: 'id' });
  if (upsertError) throw upsertError;

  return { id: authUser.id, email };
}

module.exports = async function handler(req, res) {
  const secret = (process.env.PAYSTACK_SECRET_KEY || '').trim();
  const ref = String((req.query && (req.query.reference || req.query.trxref)) || '').trim();

  if (!secret || !ref) {
    return redirect(res, 'https://fuse-atelier.vercel.app/atelier?payment=not_verified');
  }

  try {
    const response = await fetch(
      'https://api.paystack.co/transaction/verify/' + encodeURIComponent(ref),
      { headers: { Authorization: 'Bearer ' + secret } }
    );
    const body = await response.json();
    const tx = body?.data;
    const meta = tx?.metadata || {};
    const packKey = String(meta.pack || '').trim();
    const plan = PLANS[packKey];

    if (!response.ok || !body.status || !tx || tx.status !== 'success' || !plan) {
      return redirect(res, 'https://fuse-atelier.vercel.app/atelier?payment=failed');
    }

    const validAmount = tx.currency === 'NGN' && Number(tx.amount) === plan.amount_naira * 100;
    if (!validAmount) {
      console.error('[atelier-paystack-callback] amount mismatch', ref, tx.amount, tx.currency, packKey);
      return redirect(res, 'https://fuse-atelier.vercel.app/atelier?payment=amount_mismatch');
    }

    const email = String(tx.customer?.email || meta.guest_email || '').trim().toLowerCase();
    const name = String(meta.name || '').trim().slice(0, 120);
    if (!email) return redirect(res, 'https://fuse-atelier.vercel.app/atelier?payment=email_missing');

    const db = admin();
    const buyer = await ensureBuyer(db, email, name);

    // Idempotency: reserve this reference before granting anything.
    const { data: existing } = await db
      .from('payments')
      .select('id,status')
      .eq('reference', ref)
      .maybeSingle();

    if (!existing) {
      const { error: reserveError } = await db.from('payments').insert({
        user_id: buyer.id,
        reference: ref,
        amount_naira: plan.amount_naira,
        pack: packKey,
        credits_added: 0,
        status: 'processing',
        raw: tx,
      });

      // Another handler/request may have won the race. Never double-grant.
      if (reserveError) {
        const { data: raced } = await db.from('payments').select('id,status').eq('reference', ref).maybeSingle();
        if (!raced) throw reserveError;
      } else {
        // All three plans include the complete current Atelier curriculum.
        const { data: unlock } = await db
          .from('module_unlocks')
          .select('module_key')
          .eq('user_id', buyer.id)
          .eq('module_key', 'atelier-full')
          .maybeSingle();
        if (!unlock) {
          const { error: unlockError } = await db
            .from('module_unlocks')
            .insert({ user_id: buyer.id, module_key: 'atelier-full' });
          if (unlockError) throw unlockError;
        }

        // Every plan inherits Core's small starter pack immediately.
        // Fast Track / VIP receive their additional execution allocation later,
        // after the student's chosen skill / agreed plan is known.
        if (plan.starter_credits > 0) {
          const { error: creditError } = await db.rpc('add_credits', {
            uid: buyer.id,
            amount: plan.starter_credits,
            why: packKey + '-purchase',
          });
          if (creditError) throw creditError;
        }

        const { error: finishError } = await db
          .from('payments')
          .update({
            status: 'success',
            credits_added: plan.starter_credits,
            raw: tx,
          })
          .eq('reference', ref);
        if (finishError) throw finishError;
      }
    }

    return redirect(
      res,
      'https://fuse-atelier.vercel.app/atelier-v2/login.html?paid=1&plan=' +
        encodeURIComponent(packKey)
    );
  } catch (err) {
    console.error('[atelier-paystack-callback]', err);
    return redirect(res, 'https://fuse-atelier.vercel.app/atelier?payment=verify_error');
  }
};
