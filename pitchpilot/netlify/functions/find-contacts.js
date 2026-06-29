// ============================================================
// POST /.netlify/functions/find-contacts
// Body: { name, company, location }
// Finds the client's LinkedIn / website / Instagram (Serper Google search) and a
// likely email (Hunter.io domain search). Best-effort — returns what it can.
// Requires env: SERPER_API_KEY, HUNTER_API_KEY (set in this site's Netlify env).
// ============================================================
exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return resp(405, { error: 'Method not allowed' });
    let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return resp(400, { error: 'Bad request' }); }
    const name = (body.name || '').trim();
    const company = (body.company || '').trim();
    const location = (body.location || '').trim();
    if (!name && !company) return resp(400, { error: 'Need a name or company.' });

    const out = { linkedin: '', website: '', instagram: '', email: '', emails: [] };

    // 1) Serper search → LinkedIn / website / Instagram
    const serperKey = process.env.SERPER_API_KEY;
    if (serperKey) {
      try {
        const q = [name, 'founder', company, location].filter(Boolean).join(' ');
        const r = await fetch('https://google.serper.dev/search', {
          method: 'POST', headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ q, num: 10 }),
        });
        const j = await r.json();
        const items = [].concat(j.organic || [], j.knowledgeGraph ? [{ link: j.knowledgeGraph.website }] : []);
        for (const it of items) {
          const link = (it && it.link) || '';
          if (!link) continue;
          if (!out.linkedin && /linkedin\.com\/(in|company)\//i.test(link)) out.linkedin = link;
          else if (!out.instagram && /instagram\.com\//i.test(link)) out.instagram = link;
          else if (!out.website && !/(linkedin|instagram|facebook|twitter|x\.com|youtube|tiktok|upwork|google)\./i.test(link)) out.website = link;
        }
        if (!out.website && j.knowledgeGraph && j.knowledgeGraph.website) out.website = j.knowledgeGraph.website;
      } catch (e) { /* best-effort */ }
    }

    // 2) Hunter domain search → email(s)
    const hunterKey = process.env.HUNTER_API_KEY;
    let domain = '';
    if (out.website) { try { domain = new URL(out.website.startsWith('http') ? out.website : 'https://' + out.website).hostname.replace(/^www\./, ''); } catch (e) {} }
    if (!domain && company) domain = company.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
    if (hunterKey && domain) {
      try {
        const r = await fetch(`https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&limit=10&api_key=${hunterKey}`);
        const j = await r.json();
        const emails = (j && j.data && j.data.emails) || [];
        out.emails = emails.map((e) => e.value).filter(Boolean).slice(0, 5);
        // Prefer an email matching the person's first name, else most senior, else first.
        const first = (name.split(' ')[0] || '').toLowerCase();
        const match = emails.find((e) => first && (e.first_name || '').toLowerCase() === first);
        const senior = emails.find((e) => /founder|owner|ceo|director/i.test(e.position || ''));
        out.email = (match && match.value) || (senior && senior.value) || (emails[0] && emails[0].value) || '';
      } catch (e) { /* best-effort */ }
    }

    return resp(200, { ok: true, ...out });
  } catch (e) {
    return resp(500, { error: (e && e.message) || 'find-contacts failed' });
  }
};

function resp(statusCode, b) {
  return { statusCode, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(b) };
}
