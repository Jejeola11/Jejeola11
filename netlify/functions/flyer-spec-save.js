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
  return null;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const user = await getUser(event);
  if (!user) return json(401, { error: 'Please sign in again.' });

  let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
  const projectId = body.project_id;
  if (!projectId) return json(400, { error: 'Missing project_id' });

  const parsed = body.spec && typeof body.spec === 'object' ? body.spec : extractJson(body.raw);
  if (!parsed) return json(422, { error: 'The design spec came back unreadable. Try generating it again.', code: 'SPEC_UNPARSEABLE' });

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
  if (error) return json(500, { error: 'Could not save the design spec.' });

  return json(200, { ok: true, spec, rev, problems });
};
