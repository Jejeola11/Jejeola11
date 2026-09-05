// ============================================================
// POST /.netlify/functions/uvid-frames   (AI Video & UGC Studio)
// Body: { source_url, project_id? }
//
// Step one of the studio: take the reference video the user wants to rebuild,
// pull evenly-spaced frames out of it, and store them. Those frames are what
// the analysis step actually reads — a model cannot watch a video, but it can
// read a strip of stills and infer the structure behind them.
//
// Sampling is deliberately even rather than scene-detected. Scene detection
// sounds better and is worse here: it returns a variable number of frames, so
// a 12-cut video floods the analysis and a slow product film returns three.
// An even strip always describes the whole runtime at a predictable cost, and
// the cut rhythm is still visible in it.
//
// Synchronous, and free. It is ffmpeg on a file we already have — no model is
// called, so charging for it would be charging for a download.
// ============================================================
const { admin, getUser, json } = require('./_supabase');
const { workDir, ensureWorkDir, cleanupTmp, downloadToFile, ffmpeg, probeDuration, probeDimensions, uploadToStorage } = require('./_ffmpeg');

// Enough to read structure, few enough to stay inside a function timeout and
// inside the analysis model's image budget. A 12-frame strip reliably shows
// the hook, every major cut and the end card.
const FRAME_COUNT = 12;
const MAX_DURATION = 180; // a reference longer than 3 minutes is not a UGC ad

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const user = await getUser(event);
  if (!user) return json(401, { error: 'Please sign in again.' });

  let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
  const sourceUrl = (body.source_url || '').trim();
  if (!sourceUrl) return json(400, { error: 'Upload a reference video first.' });

  const db = admin();
  const dir = workDir('uvid');
  try {
    await ensureWorkDir(dir);
    const src = `${dir}/source.mp4`;
    await downloadToFile(sourceUrl, src);

    const duration = await probeDuration(src);
    if (!duration || duration < 1) return json(422, { error: 'Could not read that video. Try re-uploading it.' });
    if (duration > MAX_DURATION) {
      return json(422, { error: `That video is ${Math.round(duration)}s. Use a reference under ${MAX_DURATION}s — this is built for short-form ads, and a long video produces a plan nobody can follow.` });
    }

    let dims = null;
    try { dims = await probeDimensions(src); } catch (e) {}
    const aspect = dims && dims.width && dims.height ? simplifyAspect(dims.width, dims.height) : '9:16';

    // Offsets sit slightly inside the ends: a frame at exactly 0 is often
    // black before the first key frame, and one at exactly `duration` can
    // land past the last frame and fail outright.
    const first = Math.min(0.25, duration * 0.02);
    const last = Math.max(first, duration - Math.min(0.25, duration * 0.02));
    const step = FRAME_COUNT > 1 ? (last - first) / (FRAME_COUNT - 1) : 0;

    const frames = [];
    for (let i = 0; i < FRAME_COUNT; i++) {
      const t = +(first + step * i).toFixed(2);
      const out = `${dir}/f${String(i).padStart(2, '0')}.jpg`;
      try {
        // -ss before -i seeks by key frame and is far faster on a long file;
        // scale keeps each frame small because twelve of them get uploaded
        // and then read by a model, where size costs real money.
        await ffmpeg(['-ss', String(t), '-i', src, '-frames:v', '1', '-vf', 'scale=640:-2', '-q:v', '4', '-y', out]);
        const url = await uploadToStorage(db, user.id, out, 'uvid-frame', 'image/jpeg');
        frames.push({ t, url });
      } catch (e) {
        // One unreadable timestamp should not lose the other eleven.
        continue;
      }
    }
    if (frames.length < 3) return json(422, { error: 'Could not read enough frames from that video. Try a different file.' });

    let projectId = body.project_id || null;
    const row = {
      user_id: user.id, source_url: sourceUrl, duration_sec: duration,
      aspect, frames, updated_at: new Date().toISOString(),
    };
    if (projectId) {
      const { data: existing } = await db.from('uvid_projects').select('id,user_id').eq('id', projectId).maybeSingle();
      if (!existing || existing.user_id !== user.id) return json(404, { error: 'Project not found' });
      await db.from('uvid_projects').update(row).eq('id', projectId);
    } else {
      const { data: created } = await db.from('uvid_projects').insert(row).select().single();
      projectId = created && created.id;
    }

    return json(200, { ok: true, project_id: projectId, frames, duration_sec: duration, aspect });
  } catch (e) {
    return json(500, { error: (e && e.message) || 'Could not read that video.' });
  } finally {
    try { await cleanupTmp(dir); } catch (e) {}
  }
};

/** 1080x1920 -> "9:16". Reduced by GCD so odd encodes still land on a
 *  recognisable ratio rather than "135:240". */
function simplifyAspect(w, h) {
  const g = gcd(w, h);
  const a = w / g, b = h / g;
  // Snap near-misses (1078x1920 and similar) onto the common ratios, since
  // downstream generation only accepts a short list of them.
  const known = [[9, 16], [16, 9], [4, 5], [5, 4], [1, 1], [3, 4], [4, 3]];
  const r = w / h;
  const near = known.find(([x, y]) => Math.abs(x / y - r) < 0.03);
  return near ? `${near[0]}:${near[1]}` : `${a}:${b}`;
}
function gcd(a, b) { return b ? gcd(b, a % b) : a; }
