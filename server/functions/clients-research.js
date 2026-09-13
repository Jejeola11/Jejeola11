// Credit-backed Client Finder research. This intentionally only returns evidence
// supplied by a configured research provider; it never invents founders or contacts.
const { admin, getUser, json } = require('./_supabase');

const COSTS = { 2: 10, 5: 22, 10: 40, 15: 56, 20: 70 };
const SAFE_COUNT = new Set([2, 5, 10, 15, 20]);
const clean = (value, max = 240) => String(value || '').trim().replace(/\s+/g, ' ').slice(0, max);
const domainOf = (url) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch (_) { return ''; } };

function queriesFor({ niche, locations, skill }) {
  const place = locations[0] || 'United States';
  const base = `${niche} ${place}`;
  return [
    `${base} launching new product`,
    `${base} hiring marketing OR creative`,
    `${base} event tickets promotion`,
    `${base} paid ads campaign`,
    `${base} new collection announcement ${skill}`
  ];
}

function inferSignal(result) {
  const text = `${result.title || ''} ${result.description || ''}`.toLowerCase();
  if (/launch|new collection|now available|introducing/.test(text)) return 'Product launch / fresh campaign';
  if (/hiring|join our team|we\'re hiring/.test(text)) return 'Hiring / growth moment';
  if (/event|tickets|rsvp|register now/.test(text)) return 'Event promotion';
  if (/sale|offer|book now|shop now|campaign/.test(text)) return 'Active promotion';
  return 'Active business signal';
}

function gapFor(signal, skill) {
  const gap = {
    'Product launch / fresh campaign': `The launch needs conversion-focused ${skill} creative and a clear path from attention to action.`,
    'Hiring / growth moment': `Growth activity creates a timely chance to tighten the ${skill} journey and capture more qualified leads.`,
    'Event promotion': `The event promotion needs a stronger ${skill} conversion path before the date passes.`,
    'Active promotion': `The promotion is creating attention; the opportunity is improving the ${skill} hand-off so more visitors become enquiries.`,
    'Active business signal': `There is a visible growth signal; verify the best ${skill} opportunity before sending.`
  };
  return gap[signal];
}

function pitchFor(brand, contact, signal, gap, offer, portfolioUrl) {
  const name = contact || 'there';
  const price = offer.price ? ` I would scope it at ${offer.currency || 'USD'} ${offer.price}.` : '';
  const portfolio = portfolioUrl ? ` You can see relevant work here: ${portfolioUrl}` : '';
  const first = `Hi ${name}, I noticed ${brand} is in a ${signal.toLowerCase()} moment. ${gap}`;
  return {
    email: `${first}\n\nI have a focused idea for how I would improve this without changing your whole marketing system. Would you like a short breakdown before I send anything?${price}${portfolio}\n\nBest,`,
    whatsapp: `Hi ${name} — I noticed ${brand} is in a ${signal.toLowerCase()} moment. ${gap} I have one focused idea. Would you like me to send the quick breakdown?`,
    instagram: `Hey ${name}, saw ${brand}'s current push. I spotted one ${offer.skill || 'creative'} opportunity that could help turn more attention into leads. Want me to send it over?`
  };
}

async function firecrawlSearch(query) {
  const key = (process.env.FIRECRAWL_API_KEY || '').trim();
  const res = await fetch('https://api.firecrawl.dev/v2/search', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, limit: 8, sources: [{ type: 'web' }] })
  });
  if (!res.ok) throw new Error('The research provider could not complete this search.');
  const payload = await res.json();
  return Array.isArray(payload.data) ? payload.data : [];
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  const user = await getUser(event);
  if (!user) return json(401, { error: 'Please sign in again.' });
  if (!(process.env.FIRECRAWL_API_KEY || '').trim()) return json(503, { error: 'Client Finder is not connected yet. The owner needs to add the FIRECRAWL_API_KEY before research can run.' });

  let body; try { body = JSON.parse(event.body || '{}'); } catch (_) { return json(400, { error: 'Invalid request.' }); }
  const requestedCount = Number(body.requested_count);
  const skill = clean(body.skill, 120), niche = clean(body.niche, 120);
  const locations = Array.isArray(body.locations) ? body.locations.map(x => clean(x, 80)).filter(Boolean).slice(0, 5) : [];
  const offer = body.offer && typeof body.offer === 'object' ? body.offer : {};
  const portfolioUrl = clean(body.portfolio_url, 500);
  if (!SAFE_COUNT.has(requestedCount) || !skill || !niche || !locations.length) return json(400, { error: 'Choose a skill, niche, location and valid prospect count.' });

  const creditCost = COSTS[requestedCount];
  const db = admin();
  const { data: request, error: requestError } = await db.from('client_research_requests').insert({
    user_id: user.id, requested_count: requestedCount, credit_cost: creditCost, skill, niche, locations,
    offer: { title: clean(offer.title, 160), price: Number(offer.price) || null, currency: clean(offer.currency || 'USD', 8), skill }, status: 'running'
  }).select().single();
  if (requestError) return json(500, { error: 'Could not open a research request.' });

  let charged = false;
  try {
    const { data: balance } = await db.rpc('spend_credits', { uid: user.id, amount: creditCost });
    if (balance === null) { await db.from('client_research_requests').update({ status: 'failed', error_message: 'Not enough credits.' }).eq('id', request.id); return json(402, { error: 'Not enough credits.', need: creditCost, code: 'NO_CREDITS' }); }
    charged = true;
    await db.from('credit_ledger').insert({ user_id: user.id, amount: -creditCost, balance_after: balance, reason: 'client_finder_research', resource_id: request.id });

    const batches = await Promise.all(queriesFor({ niche, locations, skill }).map(firecrawlSearch));
    const seen = new Set(); const candidates = [];
    for (const result of batches.flat()) {
      const url = clean(result.url || result.metadata?.url, 700), domain = domainOf(url);
      const title = clean(result.title || result.metadata?.title, 180);
      if (!url || !domain || seen.has(domain)) continue;
      seen.add(domain);
      const brand = title ? title.replace(/\s*[|–—-]\s*.*/, '').slice(0, 100) : domain.split('.')[0];
      const signal = inferSignal(result), gap = gapFor(signal, skill);
      const evidence = [{ url, title: title || domain, observation: clean(result.description || result.markdown || `Found during research for ${niche}.`, 450), captured_at: new Date().toISOString() }];
      const pitch = pitchFor(brand, '', signal, gap, { ...offer, skill }, portfolioUrl);
      candidates.push({ user_id: user.id, research_request_id: request.id, brand_name: brand, niche, location: locations[0], website: `https://${domain}`, service: skill, offer_price: Number(offer.price) || null, offer_currency: clean(offer.currency || 'USD', 8), portfolio_url: portfolioUrl || null, status: 'research_ready', source: 'Verified web research', visible_problem: gap, research_summary: `Why now: ${signal}. Verify the exact contact and landing page before sending.`, signals: [{ type: signal, confidence: 'observed', source_url: url }], evidence, pitch_email: pitch.email, pitch_whatsapp: pitch.whatsapp, pitch_instagram: pitch.instagram });
      if (candidates.length >= requestedCount) break;
    }
    if (!candidates.length) throw new Error('No evidence-backed prospects were found.');
    const { data: prospects, error: insertError } = await db.from('client_prospects').insert(candidates).select();
    if (insertError) throw insertError;
    await db.from('client_research_requests').update({ status: 'completed', completed_at: new Date().toISOString(), provider_summary: { provider: 'Firecrawl', candidates_found: prospects.length, searches: batches.length } }).eq('id', request.id);
    return json(200, { request_id: request.id, prospects, credits: balance, charged: creditCost });
  } catch (err) {
    if (charged) { try { await db.rpc('add_credits', { uid: user.id, amount: creditCost, why: 'client_finder_refund' }); } catch (_) {} }
    await db.from('client_research_requests').update({ status: 'failed', error_message: clean(err.message, 280) }).eq('id', request.id);
    return json(502, { error: 'Research could not finish. No credits were kept.' });
  }
};
