// ============================================================
// POST /.netlify/functions/find-leads   (auth required)
// Finds real local businesses on Google Maps that match the freelancer's
// target criteria, using Outscraper's Google Maps Search API (the same
// paid data provider — tryoutscraper.com — shown in the outreach videos
// this feature was modeled on). This is NOT a raw scraper we wrote
// ourselves: Outscraper is a real, ToS-compliant data company that
// already handles Google Maps compliance on their end, so this endpoint
// just calls their documented REST API.
//
// Results are saved straight into pp_leads so they show up in the Lead
// Finder tracker. A lead with no email gets one best-effort attempt at
// finding one by fetching their own public website and looking for a
// mailto: link or an email-shaped string on the homepage/contact page —
// that part is just reading a public webpage, not scraping Google.
//
// Env needed on this site: OUTSCRAPER_API_KEY (get one at outscraper.com —
// pricing is pay-per-result, roughly what's shown in the reference videos).
// If OUTSCRAPER_API_KEY isn't set yet, this returns a clear setup message
// instead of failing silently, so Ria/students know exactly what to add.
// ============================================================
const { admin, getUser, json } = require('./_pp');

const OUTSCRAPER_BASE = 'https://api.outscraper.cloud';

function field(row, ...keys) {
  for (const k of keys) {
    if (row && row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
  }
  return null;
}

// Outscraper's Google Maps Search is async for anything but tiny limits —
// it returns a request id immediately, then you poll a results URL until
// status is "Success". We poll for up to ~45s, which comfortably covers
// the list sizes a single freelancer would pull in one search (dozens to
// a couple hundred, not the 4,000-business runs shown in the video).
async function outscraperSearch(apiKey, queryString, limit) {
  const searchUrl = `${OUTSCRAPER_BASE}/maps/search-v3?query=${encodeURIComponent(queryString)}&limit=${limit}&async=true`;
  const sub = await fetch(searchUrl, { headers: { 'X-API-KEY': apiKey } });
  const subJson = await sub.json().catch(() => null);
  if (!sub.ok) throw new Error((subJson && (subJson.message || subJson.error)) || `Outscraper request failed (HTTP ${sub.status})`);

  // Some accounts/limits return the data inline immediately instead of a
  // request id — handle both shapes.
  if (subJson && Array.isArray(subJson.data)) return subJson.data;

  const resultsUrl = subJson && (subJson.results_location || subJson.resultsLocation);
  const requestId = subJson && (subJson.id || subJson.request_id);
  if (!resultsUrl && !requestId) throw new Error('Outscraper did not return a request id — check your OUTSCRAPER_API_KEY.');

  const pollUrl = resultsUrl || `${OUTSCRAPER_BASE}/requests/${requestId}`;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 15; i++) {
    await sleep(3000);
    const poll = await fetch(pollUrl, { headers: { 'X-API-KEY': apiKey } });
    const pj = await poll.json().catch(() => null);
    if (!pj) continue;
    const status = pj.status || (pj.data ? 'Success' : '');
    if (status === 'Success' || Array.isArray(pj.data)) return pj.data || [];
    if (status === 'Error' || status === 'Failed') throw new Error(pj.message || 'Outscraper search failed');
  }
  throw new Error('Still searching — Outscraper is taking longer than usual. Try again in a moment.');
}

// Best-effort: fetch the business's own public website and look for a
// contact email. This is just reading a public page (like a browser
// would), not scraping a search engine — no ToS concern here.
async function findEmailOnSite(url) {
  if (!url) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const res = await fetch(withProtocol, { redirect: 'follow' });
    if (!res.ok) return null;
    const html = await res.text();
    const mailto = html.match(/mailto:([^"'?\s]+)/i);
    if (mailto) return mailto[1];
    const emailMatch = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    return emailMatch ? emailMatch[0] : null;
  } catch (e) {
    return null;
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const user = await getUser(event);
  if (!user) return json(401, { error: 'Please sign in.' });

  const apiKey = process.env.OUTSCRAPER_API_KEY;
  if (!apiKey) {
    return json(200, {
      ok: false,
      setupNeeded: true,
      error: 'Lead Finder needs an Outscraper API key. Get one at outscraper.com, then add OUTSCRAPER_API_KEY to this site\'s environment variables in Netlify.',
    });
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }

  const niche = (body.niche || '').trim();
  const location = (body.location || '').trim();
  if (!niche || !location) return json(400, { error: 'Enter what kind of business you\'re targeting and a location (city + country).' });

  const wantsNoWebsite = body.noWebsiteOnly === true;
  const mobileOnly = body.mobileOnly !== false; // default true — matches the "sidestep the front desk" technique
  const limit = Math.min(Number(body.limit) || 40, 200);

  const queryString = `${niche}, ${location}`;

  try {
    const raw = await outscraperSearch(apiKey, queryString, limit);
    const flat = Array.isArray(raw[0]) ? raw.flat() : raw; // Outscraper nests one array per query
    let leads = flat.map((r) => {
      const website = field(r, 'site', 'website', 'domain');
      const phone = field(r, 'phone', 'phone_number', 'international_phone_number');
      const rating = field(r, 'rating', 'rating_value');
      const reviewsCount = field(r, 'reviews', 'reviews_count', 'user_ratings_total');
      const respondsToReviews = field(r, 'reviews_management_response_count'); // present only on some Outscraper plans

      // "Map Gap"-style gap detection — the same 3 things the reference
      // videos teach freelancers to spot in under 30 seconds: no website,
      // thin review count for a competitive category, and no owner
      // responses to reviews (reads as "nobody's home" to customers).
      const gaps = [];
      if (!website) gaps.push('No website');
      if (reviewsCount !== null && Number(reviewsCount) < 15) gaps.push(`Only ${reviewsCount} reviews`);
      if (respondsToReviews === 0) gaps.push('Not responding to reviews');

      return {
        business_name: field(r, 'name', 'title') || 'Unknown business',
        phone: phone || null,
        phone_type: field(r, 'phone_type', 'type_of_phone') || null, // present only if your Outscraper plan includes the Phones Enricher add-on
        email: field(r, 'email', 'owner_email') || null,
        website: website || null,
        address: field(r, 'full_address', 'address') || null,
        category: field(r, 'category', 'type') || niche,
        rating,
        reviews_count: reviewsCount !== null ? Number(reviewsCount) : null,
        gap_summary: gaps.length ? gaps.join(' · ') : null,
        has_website: !!website,
        source: 'google_maps',
      };
    });

    if (wantsNoWebsite) leads = leads.filter((l) => !l.has_website);
    if (mobileOnly && leads.some((l) => l.phone_type)) {
      leads = leads.filter((l) => !l.phone_type || /mobile|cell/i.test(l.phone_type));
    }

    // Best-effort email lookup for anyone Outscraper didn't return one for,
    // capped so one search never fires off hundreds of outbound fetches.
    const needsEmail = leads.filter((l) => !l.email && l.website).slice(0, 25);
    await Promise.all(needsEmail.map(async (l) => { l.email = await findEmailOnSite(l.website); }));

    const db = admin();
    const rows = leads.map((l) => ({ ...l, user_id: user.id }));
    const { data: inserted, error } = await db.from('pp_leads').insert(rows).select('*');
    if (error) throw new Error(error.message);

    return json(200, { ok: true, count: inserted.length, leads: inserted });
  } catch (e) {
    return json(500, { error: (e && e.message) || 'Lead search failed' });
  }
};
