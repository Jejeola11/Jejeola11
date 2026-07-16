// ============================================================
// POST /.netlify/functions/flyer-composite   (Flyer Studio — final typography)
// Body: { project_id, text_spec }
//   text_spec: { headline, accent_word?, subhead?, bullets?: string[],
//                badge?, footer?, accent_color, script_accent? }
// Bakes real typography onto the project's current hero visual — headline,
// subhead, info card, badge, footer — via _canvas.js (native rendering, no
// browser). This is the step that turns "AI background image" into an
// actual finished flyer, and it's exactly why the image-generation prompts
// upstream are always told to leave the AI model out of rendering any text:
// every word here is drawn with real font/color/size control, not gambled
// on the image model getting letters right.
// Synchronous (compositing takes well under a second) — no credit charge,
// no polling; iterate on the copy/colors as many times as you like once the
// visual itself is paid for.
// ============================================================
const { admin, getUser, json } = require('./_supabase');
const { createCanvas, loadImage, drawHeadline, drawSubhead, drawInfoCard, drawBadge, drawFooterBar } = require('./_canvas');

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    const user = await getUser(event);
    if (!user) return json(401, { error: 'Please sign in again.' });

    let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
    const projectId = body.project_id;
    const spec = (body.text_spec && typeof body.text_spec === 'object') ? body.text_spec : {};
    if (!projectId) return json(400, { error: 'Missing project_id' });
    if (!spec.headline) return json(400, { error: 'Add a headline first.' });

    const db = admin();
    const { data: project } = await db.from('flyer_projects').select('*').eq('id', projectId).maybeSingle();
    if (!project || project.user_id !== user.id) return json(404, { error: 'Project not found.' });
    if (!project.hero_image_url) return json(400, { error: 'Generate the hero visual first.' });

    const accent = spec.accent_color || '#00e0c6';
    const res = await fetch(project.hero_image_url);
    if (!res.ok) return json(502, { error: 'Could not load the current visual.' });
    const buf = Buffer.from(await res.arrayBuffer());
    const img = await loadImage(buf);

    const W = img.width, H = img.height;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, W, H);

    const margin = Math.round(W * 0.065);
    const headlineSize = Math.round(W * 0.092);
    let y = Math.round(H * 0.16);
    y += drawHeadline(ctx, {
      text: spec.headline, x: margin, y, maxWidth: W - margin * 2, fontSize: headlineSize,
      accentColor: accent, accentWord: spec.accent_word, scriptAccent: !!spec.script_accent,
    }) + headlineSize * 0.35;

    if (spec.subhead) {
      y += drawSubhead(ctx, { text: spec.subhead, x: margin, y, maxWidth: W - margin * 2, fontSize: Math.round(W * 0.026) }) + headlineSize * 0.2;
    }

    if (spec.badge) {
      const b = drawBadge(ctx, { text: spec.badge, x: margin, y, accentColor: accent, fontSize: Math.round(W * 0.017) });
      y += b.h + Math.round(H * 0.02);
    }

    if (Array.isArray(spec.bullets) && spec.bullets.length) {
      drawInfoCard(ctx, { x: margin, y, w: W - margin * 2, bullets: spec.bullets.slice(0, 6), accentColor: accent, glass: !!spec.glass, fontSize: Math.round(W * 0.02) });
    }

    if (spec.footer) {
      const footerH = Math.round(H * 0.067);
      drawFooterBar(ctx, { text: spec.footer, width: W, y: H - footerH, height: footerH, accentColor: accent });
    }

    const outBuf = canvas.toBuffer('image/png');
    const storagePath = `${user.id}/flyer-${projectId}-${Date.now()}.png`;
    const { error: upErr } = await db.storage.from('avatars').upload(storagePath, outBuf, { contentType: 'image/png', upsert: true });
    if (upErr) throw new Error('Storage upload failed: ' + upErr.message);
    const finalUrl = db.storage.from('avatars').getPublicUrl(storagePath).data.publicUrl;

    await db.from('flyer_projects').update({ final_url: finalUrl, text_spec: spec, updated_at: new Date().toISOString() }).eq('id', projectId);
    return json(200, { url: finalUrl });
  } catch (e) {
    return json(502, { error: (e && e.message) || 'Could not composite the flyer.' });
  }
};
