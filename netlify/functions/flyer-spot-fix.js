// ============================================================
// POST /.netlify/functions/flyer-spot-fix   (Flyer Studio — targeted edit)
// Body: { project_id, region: { x, y, w, h }, instruction }
//   region: the marked area as FRACTIONS (0-1) of the current final
//   flyer's width/height — resolution-independent, computed client-side
//   from wherever the user drew on screen.
//
// "Circle a part, say what's wrong with it, fix just that" — instead of
// sending the whole flyer + a text description of WHERE the problem is
// (which an image-editing model can't reliably bind to actual pixels, the
// exact failure mode already fixed elsewhere in Flyer Studio this
// session), this crops the marked region out at full resolution, sends
// ONLY that crop to GPT Image 2 for a small, focused edit, and pastes the
// result back into the original at the same position with a soft
// feathered edge (job-status.js does the paste-back once the async result
// is ready — see its 'flyer-spot-fix' branch). The crop gets real padding
// around the marked area so the model has surrounding context to actually
// match against (e.g. "match the headline's accent gradient" needs the
// headline visible in the crop to copy from).
//
// GPT Image 2's edit endpoint has no mask/inpainting parameter (checked
// live against WaveSpeed's own schema) — crop-edit-paste-back is what
// gets the same "only touch this part" result without one.
// ============================================================
const { admin, getUser, json, getPlan } = require('./_supabase');
const { IMAGE_MODELS, canUseFree } = require('./_packs');
const { muapiHostImage } = require('./_muapi');
const { submitFlyerImage, hasWaveSpeed } = require('./_providers');
const { createCanvas, loadImage } = require('./_canvas');

const MUAPI_BASE = 'https://api.muapi.ai/api/v1';
const MODEL = 'gpt-image-2-ws-edit';
const FALLBACK_MODEL = 'nano-banana-edit';
// Extra room around the marked box so the model can see (and match)
// what's actually around it, not just the isolated marked pixels.
const PAD_FRACTION = 0.35;

// GPT Image 2's edit endpoint would auto-detect aspect from the input
// image if aspect_ratio were omitted entirely -- but submitFlyerImage
// (shared with flyer-hero.js/flyer-layer.js/flyer-composite.js, which all
// DO want an explicit aspect) always sends one, defaulting to 4:5 if none
// is given. A CTA-button crop is nothing like 4:5, so instead of changing
// shared behavior, just pick whichever of the model's own supported
// aspect values is closest to the actual crop's shape.
const ASPECT_ENUM = ['1:1', '1:2', '2:1', '1:3', '3:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '9:21', '21:9'];
function closestAspect(w, h) {
  const target = w / h;
  let best = '1:1', bestDiff = Infinity;
  for (const a of ASPECT_ENUM) {
    const [aw, ah] = a.split(':').map(Number);
    const diff = Math.abs(aw / ah - target);
    if (diff < bestDiff) { bestDiff = diff; best = a; }
  }
  return best;
}

async function fetchBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Could not download image (' + res.status + ')');
  return Buffer.from(await res.arrayBuffer());
}

async function uploadBufferToStorage(db, buf, storagePath, contentType) {
  const { error } = await db.storage.from('avatars').upload(storagePath, buf, { contentType, upsert: true });
  if (error) throw new Error('Storage upload failed: ' + error.message);
  return db.storage.from('avatars').getPublicUrl(storagePath).data.publicUrl;
}

exports.handler = async (event) => {
  let db, user, cost = 0;
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    if (!process.env.MUAPI_KEY) return json(503, { error: 'Flyer Studio is being connected (MUAPI_KEY missing).' });

    user = await getUser(event);
    if (!user) return json(401, { error: 'Please sign in again.' });

    let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
    const projectId = body.project_id;
    const instruction = (body.instruction || '').trim();
    const region = body.region && typeof body.region === 'object' ? body.region : null;
    if (!projectId) return json(400, { error: 'Missing project_id' });
    if (!instruction) return json(400, { error: 'Say what needs fixing there first.' });
    if (!region || [region.x, region.y, region.w, region.h].some((v) => typeof v !== 'number' || !isFinite(v))) {
      return json(400, { error: 'Circle a spot on the flyer first.' });
    }

    db = admin();
    const { data: project } = await db.from('flyer_projects').select('*').eq('id', projectId).maybeSingle();
    if (!project || project.user_id !== user.id) return json(404, { error: 'This project could not be found.' });
    if (!project.final_url) return json(400, { error: 'Composite the final flyer first — there\'s nothing to fix a spot on yet.' });

    const wantsWS = hasWaveSpeed();
    const model = wantsWS ? MODEL : FALLBACK_MODEL;

    let plan = 'pro', isAdmin = false;
    try { const p = await getPlan(user.id); plan = p.plan; isAdmin = p.isAdmin; } catch (e) {}
    if (plan === 'free' && !isAdmin && !canUseFree(model)) {
      return json(403, { error: 'This requires a subscription. Upgrade to unlock all models.', code: 'PLAN_REQUIRED' });
    }

    cost = IMAGE_MODELS[model];
    const { data: balance } = await db.rpc('spend_credits', { uid: user.id, amount: cost });
    if (balance === null) return json(402, { error: 'Not enough credits.', need: cost, code: 'NO_CREDITS' });

    const originalUrl = project.final_url;
    const srcBuf = await fetchBuffer(originalUrl);
    const img = await loadImage(srcBuf);
    const W = img.width, H = img.height;

    // Marked box in real pixels, clamped to the image.
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const rawX = clamp(Math.round(region.x * W), 0, W);
    const rawY = clamp(Math.round(region.y * H), 0, H);
    const rawW = clamp(Math.round(region.w * W), 1, W - rawX);
    const rawH = clamp(Math.round(region.h * H), 1, H - rawY);

    // Pad outward for context, still clamped to the image bounds.
    const padX = Math.round(rawW * PAD_FRACTION), padY = Math.round(rawH * PAD_FRACTION);
    const cx = clamp(rawX - padX, 0, W), cy = clamp(rawY - padY, 0, H);
    const cw = clamp(rawX + rawW + padX, 0, W) - cx;
    const ch = clamp(rawY + rawH + padY, 0, H) - cy;

    const cropCanvas = createCanvas(cw, ch);
    cropCanvas.getContext('2d').drawImage(img, cx, cy, cw, ch, 0, 0, cw, ch);
    const cropBuf = cropCanvas.toBuffer('image/png');
    const cropStoragePath = `${user.id}/spotfix-crop-${projectId}-${Date.now()}.png`;
    const cropUrl = await uploadBufferToStorage(db, cropBuf, cropStoragePath, 'image/png');
    const hostedCrop = await muapiHostImage(cropUrl);

    const prompt = `Edit this image: ${instruction}. This is a small cropped detail from a larger finished design — make ONLY the specific change described, keep everything else in this crop exactly as it is (same subject, same composition, same colors elsewhere, unless the instruction itself says to change them). Do not add any new text, words, logos, or watermarks unless explicitly asked to.`;
    const aspect = closestAspect(cw, ch);

    let id;
    if (wantsWS) {
      const r = await submitFlyerImage(model, { prompt, aspect, images: [hostedCrop] });
      if (!r) throw new Error('WaveSpeed did not start the job');
      id = r.requestId;
    } else {
      const sub = await fetch(`${MUAPI_BASE}/${model}`, {
        method: 'POST', headers: { 'x-api-key': process.env.MUAPI_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, images_list: [hostedCrop], aspect_ratio: 'Auto' }),
      });
      const txt = await sub.text();
      let j; try { j = JSON.parse(txt); } catch (e) { throw new Error('Engine error: ' + txt.slice(0, 140)); }
      if (!sub.ok) {
        let m = 'Engine HTTP ' + sub.status;
        if (j && j.detail) m = Array.isArray(j.detail) ? j.detail.map((d) => (d && d.msg) || JSON.stringify(d)).join('; ') : (typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail));
        else if (j && (j.error || j.message)) m = (j.error && j.error.message) || j.error || j.message;
        throw new Error(m);
      }
      id = j.request_id || j.id;
    }
    if (!id) throw new Error('Engine did not start the job');

    // job-status.js's 'flyer-spot-fix' branch reads this back to paste the
    // edited crop into the original at the exact same pixel position.
    const meta = { original_url: originalUrl, x: cx, y: cy, w: cw, h: ch };

    await db.from('jobs').insert({ request_id: id, user_id: user.id, kind: 'flyer-spot-fix', model, prompt: instruction, credits: cost, status: 'processing', project_id: projectId, meta });
    return json(200, { request_id: id, credits: balance, project_id: projectId });
  } catch (e) {
    try { if (db && user && cost) await db.rpc('add_credits', { uid: user.id, amount: cost, why: 'refund' }); } catch (_) {}
    return json(502, { error: (e && e.message) || 'Could not start the fix', refunded: cost });
  }
};
