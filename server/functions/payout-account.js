// Bank details stay server-side; never trust an account name supplied by a browser.
const { admin, getUser, json } = require('./_supabase');
let bankCache, bankCacheUntil = 0;
const attempts = new Map();
const reply = (status, body) => ({ ...json(status, body), headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
async function paystack(path) {
  if (!process.env.PAYSTACK_SECRET_KEY) throw new Error('unavailable');
  const response = await fetch('https://api.paystack.co' + path, {
    headers: { Authorization: 'Bearer ' + process.env.PAYSTACK_SECRET_KEY },
    signal: AbortSignal.timeout(15000)
  });
  const body = await response.json();
  if (!response.ok || body.status !== true) throw new Error('unavailable');
  return body;
}
async function banks() {
  if (bankCache && Date.now() < bankCacheUntil) return bankCache;
  const found = new Map();
  let next;
  for (let page = 0; page < 20; page++) {
    const query = new URLSearchParams({ country: 'nigeria', currency: 'NGN', perPage: '100', use_cursor: 'true' });
    if (next) query.set('next', next);
    const body = await paystack('/bank?' + query);
    if (!Array.isArray(body.data)) throw new Error('unavailable');
    for (const bank of body.data) {
      if (bank.active !== false && bank.is_deleted !== true && bank.name && /^\d{2,20}$/.test(String(bank.code)))
        found.set(String(bank.code), { code: String(bank.code), name: bank.name });
    }
    const cursor = body.meta?.next;
    if (!cursor || cursor === 'null') break;
    if (cursor === next || page === 19) throw new Error('unavailable');
    next = cursor;
  }
  if (!found.size) throw new Error('unavailable');
  bankCache = [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
  bankCacheUntil = Date.now() + 3600000;
  return bankCache;
}
exports.handler = async event => {
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Method not allowed.' });
  try {
    const user = await getUser(event);
    if (!user) return reply(401, { error: 'Sign in to set your payout account.' });
    let body;
    try { body = JSON.parse(event.body || '{}'); } catch { return reply(400, { error: 'Invalid request.' }); }
    if (!body || !['banks', 'resolve', 'save'].includes(body.action)) return reply(400, { error: 'Invalid request.' });
    if (body.action === 'banks') return reply(200, { banks: await banks() });
    const number = String(body.account_number || '').trim(), code = String(body.bank_code || '').trim();
    if (!/^\d{10}$/.test(number) || !/^\d{2,20}$/.test(code)) return reply(400, { error: 'Choose your bank and enter a 10-digit account number.' });
    // Bound repeated lookups per warm instance, in addition to authenticated access.
    const now = Date.now();
    for (const [id, item] of attempts) if (item.until <= now) attempts.delete(id);
    const count = attempts.get(user.id) || { total: 0, until: now + 60000 };
    if (++count.total > 15) return reply(429, { error: 'Too many checks. Please try again in a minute.' });
    attempts.set(user.id, count);
    const bank = (await banks()).find(bank => bank.code === code);
    if (!bank) return reply(400, { error: 'Please select a supported bank.' });
    let resolved;
    try { resolved = await paystack('/bank/resolve?' + new URLSearchParams({ account_number: number, bank_code: code })); }
    catch { return reply(422, { error: 'We could not verify this account. Check the bank and account number, then try again.' }); }
    const name = String(resolved.data?.account_name || '').trim();
    if (!name || String(resolved.data?.account_number) !== number) return reply(422, { error: 'The bank could not confirm this account. Please check your details.' });
    if (body.action === 'save') {
      const { error } = await admin().from('affiliate_payout_methods').upsert({
        user_id: user.id, bank_name: bank.name, account_number: number,
        account_name: name, full_name: name, country: 'Nigeria', method: 'bank_transfer'
      }, { onConflict: 'user_id' });
      if (error) return reply(500, { error: 'Your account was verified but could not be saved. Please try again.' });
    }
    return reply(200, { account_name: name, bank_name: bank.name, account_number: number });
  } catch {
    return reply(503, { error: 'Bank verification is temporarily unavailable. Please try again shortly.' });
  }
};
