// ============================================================
// POST /.netlify/functions/flyer-spec-save   (Flyer Studio)
// Body: { project_id, raw }  — raw is the text job's output from flyer-spec
//   or { project_id, spec } — an already-parsed spec (used when the editor
//   saves a user's manual layer edits back).
//
// Parses, validates and stores the layer graph. Validation lives here rather
// than in the browser so a spec can never reach the renderer un-checked: an
// off-palette hex or an unknown font id renders as a silent visual bug, not
// an error, and the design just quietly comes out wrong.
//
// Returns the REPAIRED spec plus the list of what was wrong with it, so drift
// is visible in logs instead of shipping invisibly.
// ============================================================
const { admin, getUser, json } = require('./_supabase');
const { validateSpec } = require('./_flyer-spec');

/**
 * Models are told to return bare JSON and mostly do, but "mostly" is not a
 * contract — a stray markdown fence or a sentence of preamble would otherwise
 * throw away a spec that was perfectly good. So: try strict parse first, then
 * strip a fence, then fall back to the outermost balanced {...}.
 */
function extractJson(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;

  try { return JSON.parse(text); } catch (e) {}

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) { try { return JSON.parse(fenced[1].trim()); } catch (e) {} }

  // Outermost balanced object. Brace-counting rather than a greedy regex so a
  // JSON string containing "}" (a text layer's content, easily) can't truncate it.
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) { try { return JSON.parse(text.slice(start, i + 1)); } catch (e) { return null; } }
    }
  }
  // Never closed — the response was cut off mid-object, which is what a
  // token limit looks like. A spec is a long document and this is the most
  // likely way it fails, so rather than throwing the whole thing away we
  // salvage it: drop the half-written trailing element and close what's open.
  // A spec missing its last layer is recoverable; a spec that refuses to load
  // is not.
  return repairTruncated(text.slice(start));
}

function repairTruncated(src) {
  // Walk to the last position where the document was structurally sound, i.e.
  // just after a completed element at any depth, then close every open bracket.
  let inStr = false, esc = false, lastGood = -1;
  const stack = [];
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{' || c === '[') stack.push(c === '{' ? '}' : ']');
    else if (c === '}' || c === ']') { stack.pop(); lastGood = i; }
    else if (c === ',') lastGood = i - 1;      // a comma means what came before it was whole
  }
  if (lastGood < 0 || !stack.length) return null;

  // Re-derive what is still open at the cut point, then close it.
  let head = src.slice(0, lastGood + 1);
  const open = [];
  inStr = false; esc = false;
  for (let i = 0; i < head.length; i++) {
    const c = head[i];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === '{') open.push('}');
    else if (c === '[') open.push(']');
    else if (c === '}' || c === ']') open.pop();
  }
  const candidate = head + open.reverse().join('');
  try { return JSON.parse(candidate); } catch (e) { return null; }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const user = await getUser(event);
  if (!user) return json(401, { error: 'Please sign in again.' });

  let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
  const projectId = body.project_id;
  if (!projectId) return json(400, { error: 'Missing project_id' });

  const parsed = body.spec && typeof body.spec === 'object' ? body.spec : extractJson(body.raw);
  if (!parsed) {
    const raw = String(body.raw || '');
    return json(422, {
      error: `The design spec came back unreadable (${raw.length} chars). Try again.`,
      code: 'SPEC_UNPARSEABLE',
      preview: raw.slice(0, 300),
    });
  }

  const db = admin();
  const { data: project } = await db.from('flyer_projects').select('id,user_id,design_spec_rev').eq('id', projectId).maybeSingle();
  if (!project || project.user_id !== user.id) return json(404, { error: 'Project not found' });

  const { spec, problems } = validateSpec(parsed);
  if (!spec.layers.length) {
    return json(422, { error: 'The design spec had no layers. Try generating it again.', code: 'SPEC_EMPTY', problems });
  }

  const rev = (project.design_spec_rev || 0) + 1;
  const { error } = await db.from('flyer_projects')
    .update({ design_spec: spec, design_spec_rev: rev, aspect: spec.aspect })
    .eq('id', projectId);
  if (error) {
    // Surface the real reason. The likeliest one by far is that
    // schema-phase36.sql has not been applied, in which case Postgres says
    // the column does not exist — and "Could not save the design spec" would
    // send someone hunting through the model output instead of the migration.
    const detail = (error.message || '').slice(0, 200);
    return json(500, { error: `Could not save the design spec: ${detail || 'unknown database error'}` });
  }

  return json(200, { ok: true, spec, rev, problems });
};
