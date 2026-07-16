// ============================================================
// Fuse Studio — app shell logic (Phase 2–5)
// Auth + view routing + studios + reactor + library + profile +
// referrals + challenges + content rewards + promos + preview mode.
// ============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const cfg = window.FUSE;
const sb = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
const $ = (id) => document.getElementById(id);

let user = null;
let preview = false;
let showUsd = false;
let userPlan = 'free';   // updated on loadProfile
let userIsAdmin = false;
let activeStudio = cfg.STUDIOS[0];
let lastPrompt = '';
let lastOutput = '';   // last generated image/video URL (for publishing to marketplace)
let refUrls = [];   // optional image reference(s) for the main generator (multi)
let studioVideo = false;  // studio generator mode: image (false) or video (true)

const naira = (n) => '₦' + Number(n).toLocaleString();
const usd = (n) => '$' + Math.round(n / cfg.USD_RATE);
const price = (n) => (showUsd ? usd(n) : naira(n));
// Download straight from the CDN (the old proxy buffered the whole file and
// crashed on videos > 6MB — Netlify's function response cap). Fall back to
// opening the file in a new tab if the CDN blocks a cross-origin fetch.
async function downloadFile(url) {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error('fetch');
    const blob = await res.blob();
    const a = document.createElement('a');
    const o = URL.createObjectURL(blob);
    a.href = o;
    a.download = `fuse-${Date.now()}.${blob.type.includes('video') ? 'mp4' : blob.type.includes('png') ? 'png' : 'jpg'}`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(o), 5000);
  } catch (e) { window.open(url, '_blank'); }
}
window.fuseDownload = downloadFile;

// ---- Extract a frame (start/end) from a generated video ----
// Load the video DIRECTLY from the CDN (crossOrigin) — no proxy, so no size cap.
// Try blob-from-CDN first (cleanest), then a direct crossOrigin <video>.
async function frameFromVideoEl(src, which, revoke) {
  const v = document.createElement('video');
  v.muted = true; v.playsInline = true; v.preload = 'auto'; v.crossOrigin = 'anonymous'; v.src = src;
  try {
    await new Promise((ok, no) => { v.onloadeddata = ok; v.onerror = () => no(new Error('Video could not load')); setTimeout(() => no(new Error('Video load timed out')), 30000); });
    const t = which === 'start' ? 0.04 : Math.max(0, (v.duration || 1) - 0.06);
    await new Promise((ok) => { v.onseeked = ok; try { v.currentTime = t; } catch (e) { ok(); } setTimeout(ok, 4000); });
    const c = document.createElement('canvas');
    c.width = v.videoWidth || 720; c.height = v.videoHeight || 1280;
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    return await new Promise((ok, no) => { try { c.toBlob((b) => b ? ok(b) : no(new Error('toBlob failed')), 'image/jpeg', 0.92); } catch (e) { no(e); } });
  } finally { if (revoke) URL.revokeObjectURL(src); }
}
async function videoFrameBlob(url, which) {
  // 1) Fetch the file from the CDN as a same-origin blob (works if CDN allows CORS).
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (res.ok) {
      const objUrl = URL.createObjectURL(await res.blob());
      return await frameFromVideoEl(objUrl, which, true);
    }
  } catch (e) { /* fall through */ }
  // 2) Direct crossOrigin video element.
  return await frameFromVideoEl(url, which, false);
}
function ftStatus(msg) { try { toast(msg); } catch (e) {} const n = document.getElementById('ftNote'); if (n) { n.textContent = msg; n.className = 'note ok'; } }
window.fuseSaveFrame = async (url, which) => {
  ftStatus(`Extracting ${which} frame…`);
  try {
    const blob = await videoFrameBlob(url, which);
    const o = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = o; a.download = `fuse-${which}-frame-${Date.now()}.jpg`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(o), 5000);
    ftStatus(`✅ ${which.charAt(0).toUpperCase() + which.slice(1)} frame saved to your downloads.`);
  } catch (e) { ftStatus(e.message || 'Could not extract frame.'); }
};
// Extract the end frame, upload it, and load it as the next clip's starting image.
window.fuseUseEndAsStart = async (url) => {
  if (preview) { showAuth('signup'); return; }
  if ($('lightbox')) $('lightbox').style.display = 'none';
  ftStatus('Grabbing end frame…');
  try {
    const blob = await videoFrameBlob(url, 'end');
    const path = `${user.id}/endframe-${Date.now()}.jpg`;
    const { error } = await sb.storage.from('avatars').upload(path, blob, { contentType: 'image/jpeg' });
    if (error) throw error;
    const pub = sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
    // Attach it as the video studio's starting image, ready for the next clip.
    if (!vModel) vModel = cfg.VIDEO_MODELS.find((m) => m.slug === 'kling-v3-turbo-pro-text-to-video') || cfg.VIDEO_MODELS[0];
    vRefUrl = pub;
    showView('video');
    $('vRefThumb').src = pub; $('vRefPreview').style.display = 'flex'; $('vRefBtn').style.display = 'none';
    $('vPrompt').value = ''; $('vResult').innerHTML = '<div class="muted">End frame attached as your starting image — describe the next motion and generate to continue the scene. 🎬</div>';
    note('vNote', '✅ End frame attached — your next clip will continue seamlessly.', 'ok');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (e) { ftStatus(e.message || 'Could not use end frame.'); }
};

// In-app lightbox preview (no new browser tab).
let lbUrl = '';
window.fuseLightbox = (url, type) => {
  lbUrl = url;
  document.getElementById('lbContent').innerHTML = (type === 'video')
    ? `<video src="${url}" controls autoplay loop playsinline style="max-width:92vw;max-height:74vh;border-radius:14px"></video>`
    : `<img src="${url}" style="max-width:92vw;max-height:74vh;border-radius:14px">`;
  document.getElementById('lightbox').style.display = 'grid';
};

// Poll an async render job until it completes. mediaType 'image' or 'video'.
function pollJob(requestId, resultEl, noteId, btn, btnLabel, mediaType = 'video') {
  let s = 0;
  const timer = setInterval(async () => {
    s += 8;
    try {
      const r = await fetch(`/.netlify/functions/job-status?id=${requestId}`, { headers: { ...(await authHeader()) } });
      const d = await r.json();
      if (d.status === 'completed') {
        clearInterval(timer); clearPending();
        lastOutput = d.url;
        const media = mediaType === 'image'
          ? `<img src="${d.url}" onclick="fuseLightbox('${d.url}','image')" style="cursor:pointer">`
          : `<video src="${d.url}" controls autoplay loop muted playsinline></video>`;
        const frameTools = mediaType === 'video'
          ? `<div class="frame-tools"><div class="ft-h">🎞 Extract frames (chain your next clip)</div>
              <div class="ft-row">
                <button class="btn ghost sm" onclick="fuseSaveFrame('${d.url}','start')">⬇ Start frame</button>
                <button class="btn ghost sm" onclick="fuseSaveFrame('${d.url}','end')">⬇ End frame</button>
                <button class="btn gold sm" onclick="fuseUseEndAsStart('${d.url}')">➡ Use end frame as next start</button>
              </div><div class="note" id="ftNote"></div></div>`
          : '';
        resultEl.innerHTML = `<div>${media}<div style="margin-top:12px"><button class="btn gold sm" onclick="fuseDownload('${d.url}')">⬇ Download</button></div>${frameTools}</div>`;
        note(noteId, 'Done ✅', 'ok');
        if (user) loadProfile();
        if (btn) { btn.disabled = false; btn.textContent = btnLabel; }
      } else if (d.status === 'failed') {
        clearInterval(timer); clearPending();
        resultEl.innerHTML = '<div>⚠ ' + (d.error || 'Failed') + '</div>';
        note(noteId, (d.error || 'Failed') + ' — credits refunded.', 'err');
        if (user) loadProfile();
        if (btn) { btn.disabled = false; btn.textContent = btnLabel; }
      } else {
        const dd = resultEl.querySelector('div div'); if (dd) dd.textContent = `Rendering… (${s}s)`;
      }
    } catch (e) {}
    if (s >= 360) { clearInterval(timer); note(noteId, 'Still rendering — check Projects in a minute.', 'err'); if (btn) { btn.disabled = false; btn.textContent = btnLabel; } }
  }, 8000);
}

// Poll several image jobs at once, filling a grid as each completes.
function pollGrid(ids, resultEl, noteId, btn, label, watermark) {
  const done = new Array(ids.length).fill(null);
  let finished = 0;
  resultEl.innerHTML = `<div><div class="${ids.length > 1 ? 'libgrid' : ''}" style="${ids.length > 1 ? 'gap:8px' : ''}">${ids.map((_, i) => `<div class="gen-slot" id="slot${i}"><span class="spin"></span></div>`).join('')}</div><div id="gridFooter" class="muted" style="margin-top:10px">Creating… ⏳</div></div>`;
  const finish = () => {
    finished++;
    if (finished < ids.length) return;
    clearPending();
    const urls = done.filter((u) => u && u !== 'failed');
    const footer = document.getElementById('gridFooter');
    if (urls.length) {
      if (footer) footer.outerHTML = `<div style="margin-top:12px"><button class="btn gold sm" onclick="fuseDownload('${urls[0]}')">⬇ Download</button></div>${watermark ? '<div class="muted" style="font-size:11px;margin-top:6px">Watermark removed on paid plans</div>' : ''}`;
      note(noteId, `Done ✅${urls.length > 1 ? ` · ${urls.length} variations` : ''}`, 'ok');
    } else {
      if (footer) footer.textContent = '';
      note(noteId, 'Generation failed — credits refunded.', 'err');
    }
    if (user) loadProfile();
    if (btn) { btn.disabled = false; btn.textContent = label; }
  };
  // Poll every 8s (not 4) — each poll is a billed Netlify function invocation,
  // and this loop was one of the biggest credit burners on the free plan.
  ids.forEach((id, i) => {
    let s = 0;
    const t = setInterval(async () => {
      s += 8;
      try {
        const r = await fetch(`/.netlify/functions/job-status?id=${id}`, { headers: { ...(await authHeader()) } });
        const d = await r.json();
        if (d.status === 'completed') {
          clearInterval(t); done[i] = d.url; lastOutput = d.url;
          const slot = document.getElementById('slot' + i);
          if (slot) slot.innerHTML = `${watermark ? '<div class="fuse-wm">Fuse Studio</div>' : ''}<img src="${d.url}" onclick="fuseLightbox('${d.url}','image')" style="cursor:pointer">`;
          finish();
        } else if (d.status === 'failed') {
          clearInterval(t); done[i] = 'failed';
          const slot = document.getElementById('slot' + i); if (slot) slot.innerHTML = '<div class="muted" style="font-size:12px">⚠ failed</div>';
          finish();
        }
      } catch (e) {}
      if (s >= 360 && done[i] === null) { clearInterval(t); done[i] = 'failed'; finish(); }
    }, 8000);
  });
}

function pollChat(id, outEl, noteId, btn, label) {
  let s = 0;
  const t = setInterval(async () => {
    s += 4;
    try {
      const r = await fetch(`/.netlify/functions/job-status?id=${id}`, { headers: { ...(await authHeader()) } });
      const d = await r.json();
      if (d.status === 'completed') {
        clearInterval(t); outEl.textContent = d.text || ''; note(noteId, '');
        if (user) loadProfile();
        if (btn) { btn.disabled = false; btn.textContent = label; }
      } else if (d.status === 'failed') {
        clearInterval(t); note(noteId, (d.error || 'AI failed') + ' — credits refunded.', 'err');
        if (user) loadProfile();
        if (btn) { btn.disabled = false; btn.textContent = label; }
      }
    } catch (e) {}
    if (s >= 180 && outEl.textContent === '') { clearInterval(t); note(noteId, 'Taking too long — try again.', 'err'); if (btn) { btn.disabled = false; btn.textContent = label; } }
  }, 4000);
}

async function authHeader() {
  const { data } = await sb.auth.getSession();
  const t = data.session && data.session.access_token;
  return t ? { Authorization: `Bearer ${t}` } : {};
}
function note(id, msg, kind) { const e = $(id); e.textContent = msg || ''; e.className = 'note' + (kind ? ' ' + kind : ''); }

// ---------------- view routing ----------------
let curView = 'home';
const scrollMem = {};
// Keeps the top sub-nav strip (Explore/Image/Video/Audio/Reactor/Courses)
// highlighted correctly no matter which path got you there (tap it directly,
// the bottom tab bar, a chip, a menu link…). A `go` with no matching tab
// (e.g. 'profile') simply clears the highlight, which is the right look.
function syncSubnav(go) {
  document.querySelectorAll('.subnav-tab').forEach((t) => t.classList.toggle('active', t.dataset.go === go));
}
function showView(name, opts = {}) {
  scrollMem[curView] = window.scrollY;          // remember where we were
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  const el = $('view-' + name);
  if (el) el.classList.add('active');
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.view === name));
  curView = name;
  if (name === 'library') loadLibrary();
  if (name === 'profile') loadProfile();
  if (name === 'community') { loadChallenges(); loadCommunity(); }
  if (name === 'reactor') buildReactor();
  if (name === 'models') { if (modelKind === 'reactor') modelKind = 'all'; buildModels(modelKind); }
  if (name === 'home') syncSubnav('explore');
  else if (name === 'reactor') syncSubnav('tab-reactor');
  else if (name === 'all-courses' || name === 'mini') syncSubnav('tab-courses');
  else if (name !== 'models') syncSubnav('');
  // Restore previous scroll for this view (top for first visit).
  window.scrollTo(0, scrollMem[name] || 0);
  saveRoute();
}

// ---- reload persistence: remember the open view so a refresh doesn't dump you home ----
function saveRoute() {
  try {
    const r = { view: curView };
    if (curView === 'studio') { r.studio = activeStudio && activeStudio.key; r.video = studioVideo; }
    else if (curView === 'video') { r.vSlug = vModel && vModel.slug; }
    else if (curView === 'models') { r.kind = modelKind; }
    localStorage.setItem('fuse_route', JSON.stringify(r));
  } catch (e) {}
}
function restoreRoute() {
  let r; try { r = JSON.parse(localStorage.getItem('fuse_route') || 'null'); } catch (e) {}
  if (!r || !r.view || r.view === 'home') return;
  const safe = ['library', 'profile', 'community', 'models', 'studio', 'video', 'market', 'learn', 'avatar', 'promptgen', 'reactor', 'preset', 'course', 'week', 'omni', 'mini', 'all-courses'];
  if (!safe.includes(r.view)) return;
  try {
    if (r.view === 'studio') { openStudio(r.studio || 'generate'); if (r.video) setStudioMode(true); }
    else if (r.view === 'video') { if (r.vSlug) openVideo(r.vSlug); else showView('video'); }
    else if (r.view === 'models') { showView('models'); buildModels(r.kind || 'all'); }
    else if (r.view === 'course') { openCourse(); }
    else if (r.view === 'week') { openWeek(); }
    else if (r.view === 'mini') { openMiniHub(); }
    else if (r.view === 'all-courses') { openAllCourses(); }
    else if (['market', 'learn', 'avatar', 'promptgen', 'reactor'].includes(r.view)) { openStudio(r.view); }
    else showView(r.view);
  } catch (e) {}
}
// In-progress video survives a refresh: remember the job and re-attach the poller.
function savePending(id, where) { try { localStorage.setItem('fuse_pendingVideo', JSON.stringify({ id, where })); } catch (e) {} }
function clearPending() { try { localStorage.removeItem('fuse_pendingVideo'); } catch (e) {} }
function resumePending() {
  let p; try { p = JSON.parse(localStorage.getItem('fuse_pendingVideo') || 'null'); } catch (e) {}
  if (!p || !p.id) return;
  // Map the pending job back to its view + result element + media type.
  const map = {
    video:  { view: 'video',  resultId: 'vResult',  noteId: 'vNote',     media: 'video' },
    avatar: { view: 'avatar', resultId: 'avResult', noteId: 'avGenNote', media: 'image' },
    studio: { view: 'studio', resultId: 'result',   noteId: 'genNote',   media: 'image' },
  };
  const m = map[p.where] || map.studio;
  if (p.where === 'avatar') { showView('avatar'); } else { showView(m.view); }
  const resultEl = $(m.resultId); if (!resultEl) return;
  resultEl.innerHTML = '<div><span class="spin"></span><div style="margin-top:12px">Resuming your render…</div></div>';
  note(m.noteId, 'Reconnected to your render — still working ⏳', 'ok');
  pollJob(p.id, resultEl, m.noteId, null, null, m.media);
}

// ---------------- model gallery (Create — Higgsfield-style picker) ----------------
let modelKind = 'all';
// Free plan can generate with ANY image or video model — credits are the only
// limiter (matches _packs.js canUseFree). Only tools stay subscription-gated.
function isLocked(slug) {
  if (userPlan !== 'free' || userIsAdmin) return false;
  return (cfg.TOOL_MODELS || []).some((m) => m.slug === slug);
}

function buildModels(kind) {
  modelKind = kind || 'all';
  document.querySelectorAll('#view-models .mtab').forEach((t) => t.classList.toggle('active', t.dataset.kind === modelKind));
  syncSubnav(modelKind === 'image' ? 'tab-image' : modelKind === 'video' ? 'tab-video' : '');
  if (modelKind === 'reactor') { showView('reactor'); return; }

  const tagOf = (s) => (cfg.MODEL_TAGS || {})[s] || '';
  const cat = (arr, c) => arr.map((m) => Object.assign({ cat: c }, m));
  const ALL = cat(cfg.IMAGE_MODELS, 'image').concat(cat(cfg.VIDEO_MODELS, 'video'), cat(cfg.TOOL_MODELS, 'tools'));
  let list;
  if (modelKind === 'all') list = ALL;
  else if (modelKind === 'new') list = ALL.filter((m) => tagOf(m.slug));
  else if (modelKind === 'video') list = cat(cfg.VIDEO_MODELS, 'video');
  else if (modelKind === 'tools') list = cat(cfg.TOOL_MODELS, 'tools');
  else list = cat(cfg.IMAGE_MODELS, 'image');

  const q = ($('modelSearch').value || '').toLowerCase();
  const shown = list.filter((m) => m.name.toLowerCase().includes(q) || (m.badge || '').toLowerCase().includes(q));
  const catLabel = { image: '🖼 Image', video: '🎬 Video', tools: '✦ Edit' };
  $('modelGrid').innerHTML = shown.map((m) => {
    const locked = isLocked(m.slug);
    const t = tagOf(m.slug);
    const media = m.sample
      ? (m.cat === 'video' ? `<video src="${m.sample}" autoplay muted loop playsinline preload="auto"></video>` : `<img src="${m.sample}">`)
      : '＋';
    return `<div class="ccard${locked ? ' locked' : ''}" data-slug="${m.slug}" data-cat="${m.cat}">
      <div class="cc-media">${media}
        ${t ? `<span class="cc-tag t-${t.toLowerCase()}">${t}</span>` : ''}
        <span class="cc-cat">${catLabel[m.cat] || ''}</span>
        ${locked ? '<span class="lock-badge">🔒 Pro</span>' : ''}</div>
      <div class="cc-info"><div class="cc-name">${m.name}</div><div class="cc-meta">${m.badge || ''} · ${m.credits} cr</div></div>
    </div>`;
  }).join('');
  $('modelGrid').querySelectorAll('.ccard').forEach((el) => el.onclick = () => {
    const slug = el.dataset.slug, c = el.dataset.cat;
    if (isLocked(slug)) { toast('🔒 Subscribe to unlock this model'); openBuy(); return; }
    if (c === 'video') openVideo(slug);
    else if (c === 'tools') openTool(slug);
    else openImageModel(slug);
  });
}
function openImageModel(slug) {
  openStudio('generate');
  buildModelSelect();
  $('model').value = slug;
}
function buildModelSelect() {
  $('model').innerHTML = cfg.IMAGE_MODELS.map((m) => `<option value="${m.slug}">${m.name} (${m.credits})</option>`).join('');
}
function buildVideoSelect() {
  $('model').innerHTML = cfg.VIDEO_MODELS.map((m) => `<option value="${m.slug}">${m.name} (${m.credits})</option>`).join('');
}
// Studio mode: every studio can make an image OR a video.
function setStudioMode(video) {
  studioVideo = video;
  $('smImg').classList.toggle('active', !video);
  $('smVid').classList.toggle('active', video);
  $('imgOpts').style.display = video ? 'none' : 'grid';
  $('vidOpts').style.display = video ? 'block' : 'none';
  if (video) { buildVideoSelect(); $('genBtn').textContent = '🎬 Generate video'; }
  else { buildModelSelect(); $('genBtn').textContent = '✨ Generate'; }
}
async function generateStudioVideo(prompt) {
  const model = $('model').value, aspect = $('aspect').value;
  const cameraMotion = $('cameraMotion').value.trim();
  const fullPrompt = cameraMotion ? `${prompt}. Camera: ${cameraMotion}` : prompt;
  const btn = $('genBtn'); const label = '🎬 Generate video'; btn.disabled = true; btn.textContent = 'Submitting…';
  $('result').innerHTML = '<div><span class="spin"></span><div style="margin-top:12px">Sending to the engine…</div></div>';
  note('genNote', '');
  try {
    const res = await fetch('/.netlify/functions/video-generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ model, prompt: fullPrompt, aspect, duration: $('studioDuration').value, image_url: refUrls[0] || undefined }),
    });
    const data = await res.json();
    if (res.status === 402) { note('genNote', 'Out of credits — top up.', 'err'); openBuy(); $('result').innerHTML = '<div>Out of credits.</div>'; btn.disabled = false; btn.textContent = label; return; }
    if (!res.ok) throw new Error(data.error || 'Failed');
    $('creditCount').textContent = data.credits;
    note('genNote', 'Rendering… this can take 1–3 min ⏳', 'ok'); btn.textContent = 'Rendering…';
    savePending(data.request_id, 'studio');
    pollJob(data.request_id, $('result'), 'genNote', btn, label);
  } catch (e) { $('result').innerHTML = '<div>⚠ ' + (e.message || 'Failed') + '</div>'; note('genNote', e.message || 'Failed — credits not charged.', 'err'); btn.disabled = false; btn.textContent = label; }
}

// ---------------- video studio ----------------
let vModel = null, vRefUrl = '', vMoreRefs = [];
function openVideo(slug) {
  vModel = cfg.VIDEO_MODELS.find((m) => m.slug === slug) || cfg.VIDEO_MODELS[0];
  $('vModelName').textContent = vModel.name + ' · ' + vModel.credits + ' cr';
  $('vResult').innerHTML = '<div class="muted">Your video appears here. Video takes a little longer ⏳</div>';
  $('vGen').textContent = `🎬 Generate video (${vModel.credits} credits)`;
  vRefUrl = ''; $('vRefPreview').style.display = 'none'; $('vRefBtn').style.display = 'flex';
  vMoreRefs = []; renderVideoRefs();
  note('vNote', '');
  showView('video');
}
function renderVideoRefs() {
  const wrap = $('vMoreRefPreviews'); if (!wrap) return;
  wrap.innerHTML = vMoreRefs.map((u, i) => `<div class="av-th"><img src="${u}"><span class="av-th-x" onclick="window.fuseRmVRef(${i})">✕</span></div>`).join('');
}
window.fuseRmVRef = (i) => { vMoreRefs.splice(i, 1); renderVideoRefs(); };
async function pickVideoMoreRefs(files) {
  if (preview) { showAuth('signup'); return; }
  const limit = 4 - vMoreRefs.length;
  if (limit <= 0) return note('vNote', 'Max 4 reference images.', 'err');
  note('vNote', 'Uploading reference(s)…', 'ok');
  for (let i = 0; i < Math.min(files.length, limit); i++) {
    const file = files[i];
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${user.id}/vref-${Date.now()}-${i}.${ext}`;
      const { error } = await sb.storage.from('avatars').upload(path, file);
      if (error) throw error;
      vMoreRefs.push(sb.storage.from('avatars').getPublicUrl(path).data.publicUrl);
    } catch (e) { note('vNote', e.message || 'Upload failed.', 'err'); }
  }
  renderVideoRefs();
  note('vNote', `✅ ${vMoreRefs.length} reference(s) attached.`, 'ok');
}
async function pickVideoRef(file) {
  if (preview) { showAuth('signup'); return; }
  if (!file) return;
  note('vNote', 'Uploading image…', 'ok');
  try {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${user.id}/v-${Date.now()}.${ext}`;
    const { error } = await sb.storage.from('avatars').upload(path, file);
    if (error) throw error;
    vRefUrl = sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
    $('vRefThumb').src = vRefUrl; $('vRefPreview').style.display = 'flex'; $('vRefBtn').style.display = 'none';
    note('vNote', '✅ Starting image attached.', 'ok');
  } catch (e) { note('vNote', e.message || 'Upload failed.', 'err'); }
}
async function videoGenerate() {
  if (preview) { showAuth('signup'); return; }
  if (!vModel) return;
  const prompt = $('vPrompt').value.trim();
  if (!prompt && !vRefUrl) return note('vNote', 'Add a prompt or a starting image.', 'err');
  const btn = $('vGen'); const label = `🎬 Generate video (${vModel.credits} credits)`; btn.disabled = true; btn.textContent = 'Submitting…';
  $('vResult').innerHTML = '<div><span class="spin"></span><div style="margin-top:12px">Sending to the engine…</div></div>';
  note('vNote', '');
  try {
    const res = await fetch('/.netlify/functions/video-generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ model: vModel.slug, prompt, aspect: $('vAspect').value, duration: $('vDuration').value, resolution: $('vRes').value, image_url: vRefUrl || undefined, reference_image_urls: vMoreRefs.length ? vMoreRefs : undefined }),
    });
    const data = await res.json();
    if (res.status === 402) { note('vNote', 'Out of credits — top up.', 'err'); openBuy(); $('vResult').innerHTML = '<div>Out of credits.</div>'; btn.disabled = false; btn.textContent = label; return; }
    if (!res.ok) throw new Error(data.error || 'Failed');
    $('creditCount').textContent = data.credits;
    note('vNote', 'Rendering… this can take 1–3 min ⏳', 'ok'); btn.textContent = 'Rendering…';
    savePending(data.request_id, 'video');
    pollJob(data.request_id, $('vResult'), 'vNote', btn, label);
  } catch (e) { $('vResult').innerHTML = '<div>⚠ ' + (e.message || 'Failed') + '</div>'; note('vNote', e.message || 'Failed — credits not charged.', 'err'); btn.disabled = false; btn.textContent = label; }
}

function openStudio(key) {
  if (key === 'reactor') { showView('reactor'); return; }
  if (key === 'market') { showView('market'); loadMarket(); return; }
  if (key === 'learn') { showView('learn'); buildLessons(); return; }
  if (key === 'avatar') { showView('avatar'); loadAvatars(); return; }
  if (key === 'flyer') { showView('flyer'); loadFlyerHistory(); return; }
  if (key === 'audio') { showView('audio'); loadAudioVoices(); return; }
  if (key === 'editstudio') { showView('editstudio'); return; }
  if (key === 'promptgen') { buildPromptFields(); showView('promptgen'); loadPromptHistory(); return; }
  if (key === 'omni') { showView('omni'); return; }
  activeStudio = cfg.STUDIOS.find((s) => s.key === key) || cfg.STUDIOS[0];
  $('studioIcon').textContent = activeStudio.icon;
  $('studioName').textContent = activeStudio.name;
  $('studioDesc').textContent = activeStudio.desc + (activeStudio.advanced ? ' · Beta' : '');
  $('result').innerHTML = '<div>Your creation appears here.<br><span class="muted">Write a prompt and hit Generate ✨</span></div>';
  note('genNote', '');
  setStudioMode(false);
  showView('studio');
}

// ---------------- home builders ----------------
function buildHome() {
  // Viral presets — tap any to see the full recipe.
  const vp = $('vpGrid');
  if (vp) {
    vp.innerHTML = (cfg.VIRAL_PRESETS || []).map((p) =>
      `<div class="vp-card" data-id="${p.id}">
        <div class="vp-media">
          ${p.kind === 'video'
            ? `<video src="${p.sample}" autoplay muted loop playsinline preload="auto"></video>`
            : `<img src="${p.sample}">`}
          <span class="vp-tag">🔥 VIRAL</span>
        </div>
        <div class="vp-info"><div class="vp-name">${p.title}</div><div class="vp-hook">${p.hook}</div>
          <div class="vp-cta">▶ Build it →</div></div>
       </div>`).join('');
    vp.querySelectorAll('.vp-card').forEach((el) => el.onclick = () => openPreset(el.dataset.id));
  }
  // Explore more AI features — chip cloud routing to every studio/model/tool.
  $('featChips').innerHTML = (cfg.FEATURES || []).map((f, i) => `<div class="feat-chip" data-i="${i}">${f.label}</div>`).join('');
  $('featChips').querySelectorAll('.feat-chip').forEach((el) => el.onclick = () => routeFeature(cfg.FEATURES[+el.dataset.i].go));
  // Footer links
  document.querySelectorAll('.home-foot a[data-go]').forEach((el) => el.onclick = (e) => { e.preventDefault(); routeFeature(el.dataset.go); });
  document.querySelectorAll('.home-foot a[data-buy]').forEach((el) => el.onclick = (e) => { e.preventDefault(); openBuy(); });

  refreshStreak();

  // promo banner — the launch promo takes over this banner while it's live,
  // falls back to the evergreen "build your face" promo otherwise.
  if (promoActive()) {
    const hoursLeft = Math.max(0, (Date.parse(cfg.LAUNCH_PROMO.endsAt) - Date.now()) / 3600000);
    $('homePromo').innerHTML =
      `<div class="lab">🎉 FULL LAUNCH PROMO — 2 DAYS ONLY</div><h3>Creator 2x · Pro 3x · Agency 4x credits. Fuse Atelier buyers get 2,500 bonus credits.</h3>
       <button class="btn gold sm" id="promoBannerCta">See the deal</button>
       <span class="countdown" id="bannerCountdown"></span>`;
    $('promoBannerCta').onclick = () => openBuy();
    startCountdown('bannerCountdown', hoursLeft);
  } else {
    const pr = cfg.PROMO;
    $('homePromo').innerHTML =
      `<div class="lab">⏳ ${pr.title}</div><h3>${pr.body}</h3>
       <button class="btn gold sm" id="promoBannerCta">${pr.cta}</button>
       <span class="countdown" id="bannerCountdown"></span>`;
    $('promoBannerCta').onclick = () => openBuy();
    startCountdown('bannerCountdown', pr.hours);
  }

  // Hero feature boxes + Seedance 4K → route to the right studio.
  document.querySelectorAll('#view-home [data-go]').forEach((el) => el.onclick = () => routeFeature(el.dataset.go));
}

// ---------------- account menu (slide-down) ----------------
function openMenu() {
  const nm = (user && user.email) ? user.email.split('@')[0] : 'You';
  $('menuName').textContent = nm;
  $('menuAvatar').textContent = nm[0] ? nm[0].toUpperCase() : 'F';
  $('menuOverlay').style.display = 'block';
  requestAnimationFrame(() => $('menuCard').classList.add('open'));
}
function closeMenu() { $('menuCard').classList.remove('open'); setTimeout(() => { $('menuOverlay').style.display = 'none'; }, 200); }

// ---------------- viral preset detail ----------------
function openPreset(id) {
  const p = (cfg.VIRAL_PRESETS || []).find((x) => x.id === id);
  if (!p) return;
  const safe = (s) => (s || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const promptBlock = (label, key, text) => `
    <div class="preset-prompt"><div class="pp-h">${label}</div>
      <pre>${safe(text)}</pre>
      <button class="btn ghost sm" onclick="window.fusePresetCopy(this,'${id}','${key}')">⧉ Copy prompt</button></div>`;
  $('presetBody').innerHTML = `
    <div class="preset-hero">
      ${p.kind === 'video' ? `<video src="${p.sample}" autoplay muted loop playsinline controls></video>` : `<img src="${p.sample}">`}
    </div>
    <h2 class="preset-title">${p.title}</h2>
    <p class="muted" style="margin:4px 0 18px">${p.hook}</p>

    <div class="shead"><h2>The recipe</h2></div>
    <div class="preset-steps">
      ${p.steps.map((s) => `<div class="preset-step"><div class="ps-n">${s.num}</div>
        <div class="ps-body"><div class="ps-t">${s.title}</div><div class="ps-d muted">${s.detail}</div></div></div>`).join('')}
    </div>

    <div class="shead"><h2>Copy-paste prompts</h2></div>
    ${p.prompts.bottle ? promptBlock('Product / bottle prompt', 'bottle', p.prompts.bottle) : ''}
    ${p.prompts.startFrame ? promptBlock('Start-frame prompt (avatar)', 'startFrame', p.prompts.startFrame) : ''}
    ${p.prompts.motion ? promptBlock('Motion prompt (image → video)', 'motion', p.prompts.motion) : ''}

    <div class="shead"><h2>Start now</h2></div>
    <div class="preset-jumps">
      <button class="btn gold" onclick="window.fusePresetGo('avatar')">🧑‍🎨 Open Avatar Studio</button>
      <button class="btn ghost" onclick="window.fusePresetGo('image:${p.models.product}')">🖼 Open Image (with logo)</button>
      <button class="btn ghost" onclick="window.fusePresetGo('video:${p.models.video}')">🎬 Open Kling i2v</button>
    </div>`;
  showView('preset');
}
window.fusePresetCopy = (btn, id, key) => {
  const p = (cfg.VIRAL_PRESETS || []).find((x) => x.id === id);
  if (!p || !p.prompts[key]) return;
  navigator.clipboard.writeText(p.prompts[key]);
  const orig = btn.textContent; btn.textContent = '✓ Copied!';
  setTimeout(() => { btn.textContent = orig; }, 1500);
};
window.fusePresetGo = (go) => routeFeature(go);

// ---------------- community showcase ----------------
async function loadCommunity() {
  if (preview) { $('commGrid').innerHTML = ''; return; }
  const { data } = await sb.from('public_showcase').select('output_url, type').limit(30);
  const items = data || [];
  const strip = items.slice(0, 4);
  $('commStrip').innerHTML = strip.length
    ? strip.map((x) => x.type === 'video'
        ? `<video src="${x.output_url}" muted loop autoplay playsinline></video>`
        : `<img src="${x.output_url}">`).join('')
    : '<div class="cs-ph">🖼️</div><div class="cs-ph">🎬</div><div class="cs-ph">✨</div><div class="cs-ph">🎨</div>';
  const grid = items.slice(4);
  $('commGrid').innerHTML = grid.length
    ? grid.map((x) => {
        const m = x.type === 'video' ? `<video src="${x.output_url}" muted loop playsinline></video>` : `<img src="${x.output_url}">`;
        return `<div class="projitem" onclick="fuseLightbox('${x.output_url}','${x.type}')">${m}</div>`;
      }).join('')
    : '<div class="empty" style="grid-column:1/-1">Be the first to share your creation ✨</div>';
}

// ---------------- Fuse Atelier course (Whop-style) ----------------
const COURSE = (window.FUSE_COURSE && window.FUSE_COURSE.pillars) ? window.FUSE_COURSE.pillars : [];
let courseVideos = {};       // lesson_key -> url
let courseUnlocks = new Set(); // module_key the user unlocked
let courseProgress = new Set(); // lesson_key completed
let coursePillar = COURSE[0] ? COURSE[0].key : 'orient';
// Courses are purchase-only now — a Pro/Agency image-credits plan does NOT
// grant course access on its own. Only admin (for testing) or an explicit
// module_unlocks row (real payment) unlocks a course.
function courseHasFull() { return userIsAdmin || courseUnlocks.has('atelier-full') || courseUnlocks.has('atelier-empire'); }
// Tier rank owned by this user: 0 none · 1 Starter · 2 Creator · 3 Empire.
// Legacy 'atelier-full' buyers (old ₦60k course) count as Empire.
function atelierTier() {
  if (userIsAdmin || courseUnlocks.has('atelier-empire') || courseUnlocks.has('atelier-full')) return 3;
  if (courseUnlocks.has('atelier-creator')) return 2;
  if (courseUnlocks.has('atelier-starter')) return 1;
  return 0;
}
const TIER_RANK = { starter: 1, creator: 2, empire: 3 };
function moduleUnlocked(mKey, pillarKey) {
  if (pillarKey === 'orient') return true;       // orientation is free
  const pillar = COURSE.find((p) => p.key === pillarKey);
  const need = TIER_RANK[(pillar && pillar.tier) || 'starter'];
  if (atelierTier() >= need) return true;
  return courseUnlocks.has(mKey);                // legacy per-module unlocks still honoured
}
function ytId(u) { const m = u.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{6,})/); return m ? m[1] : ''; }
function lessonEmbed(url) {
  if (!url) return '<div class="lp-empty">🎬 Video coming soon</div>';
  if (/youtube|youtu\.be/.test(url)) return `<iframe src="https://www.youtube-nocookie.com/embed/${ytId(url)}?rel=0&modestbranding=1" allow="autoplay; fullscreen; encrypted-media" allowfullscreen></iframe>`;
  if (/vimeo\.com/.test(url)) { const id = (url.match(/vimeo\.com\/(\d+)/) || [])[1] || ''; return `<iframe src="https://player.vimeo.com/video/${id}" allow="autoplay; fullscreen" allowfullscreen></iframe>`; }
  return `<video src="${url}" controls playsinline></video>`;
}

async function openCourse() {
  showView('course');
  // Load videos (public), plus unlocks + progress for logged-in users.
  try {
    const { data: v } = await sb.from('course_videos').select('lesson_key, url');
    courseVideos = {}; (v || []).forEach((r) => { courseVideos[r.lesson_key] = r.url; });
  } catch (e) {}
  if (user && !preview) {
    try { const { data: u } = await sb.from('module_unlocks').select('module_key').eq('user_id', user.id); courseUnlocks = new Set((u || []).map((r) => r.module_key)); } catch (e) {}
    try { const { data: p } = await sb.from('course_progress').select('lesson_key').eq('user_id', user.id); courseProgress = new Set((p || []).map((r) => r.lesson_key)); } catch (e) {}
  }
  // Tier-aware banner: show what they own and the next tier up (money-only upgrade).
  const tier = atelierTier();
  const TIER_LABEL = ['', 'Starter', 'Creator', 'Empire'];
  const NEXT = { 0: ['atelier_starter', 'Start with Starter — ₦10,000'], 1: ['atelier_creator', 'Upgrade to Creator — ₦25,000'], 2: ['atelier_empire', 'Upgrade to Empire — ₦70,000'] };
  $('courseLockMsg').innerHTML = tier >= 3
    ? '<div class="course-badge ok">✓ Empire — full access unlocked</div>'
    : (tier > 0
      ? `<div class="course-badge ok">✓ ${TIER_LABEL[tier]} tier active <button class="btn gold sm" id="courseBuy" style="margin-left:8px">${NEXT[tier][1]}</button></div>`
      : `<div class="course-badge">🔒 Enroll to unlock your skills <button class="btn gold sm" id="courseBuy" style="margin-left:8px">${NEXT[0][1]}</button></div>`);
  const cb = $('courseBuy'); if (cb) cb.onclick = () => buy(NEXT[Math.min(tier, 2)][0]);
  // pillar tabs
  $('pillarTabs').innerHTML = COURSE.map((p) => `<button class="ptab${p.key === coursePillar ? ' active' : ''}" data-p="${p.key}">${p.name}</button>`).join('');
  $('pillarTabs').querySelectorAll('.ptab').forEach((b) => b.onclick = () => { coursePillar = b.dataset.p; openCourse(); });
  // progress
  const totalLessons = COURSE.reduce((a, p) => a + p.modules.reduce((b, m) => b + m.lessons.length, 0), 0);
  const done = courseProgress.size;
  $('cpFill').style.width = totalLessons ? Math.round((done / totalLessons) * 100) + '%' : '0%';
  $('cpText').textContent = `${done}/${totalLessons} lessons complete`;
  buildCourseBody();
  loadAtelierFeed();
}
function buildCourseBody() {
  const p = COURSE.find((x) => x.key === coursePillar); if (!p) return;
  $('courseSub') && (void 0);
  $('courseBody').innerHTML = p.modules.map((m, mi) => {
    const unlocked = moduleUnlocked(m.key, p.key);
    const lessons = m.lessons.map((l) => {
      const hasVid = !!courseVideos[l.key];
      const doneCls = courseProgress.has(l.key) ? ' done' : '';
      return `<div class="lrow${doneCls}" data-l="${l.key}" data-locked="${unlocked ? '' : '1'}">
        <span class="lr-ic">${courseProgress.has(l.key) ? '✓' : (unlocked ? '▶' : '🔒')}</span>
        <span class="lr-t">${l.n} ${l.title}</span>
        <span class="lr-d">${hasVid ? '' : '<i>soon</i> '}${l.dur || ''}</span>
      </div>`;
    }).join('');
    return `<div class="cmod">
      <div class="cmod-h" data-acc="${mi}">
        <div><div class="cmod-t">${m.title}</div><div class="cmod-s">${m.lessons.length} lessons${unlocked ? '' : ' · 🔒 locked'}</div></div>
        <span class="cmod-x">${unlocked ? '▾' : `<button class="btn gold sm" data-unlock="${m.key}">Unlock · 100 cr</button>`}</span>
      </div>
      <div class="cmod-body" id="acc${mi}" style="display:none">${lessons}</div>
    </div>`;
  }).join('');
  // accordion
  $('courseBody').querySelectorAll('.cmod-h').forEach((h) => h.onclick = (e) => {
    if (e.target.closest('[data-unlock]')) return;
    const b = document.getElementById('acc' + h.dataset.acc);
    if (b) b.style.display = b.style.display === 'none' ? 'block' : 'none';
  });
  $('courseBody').querySelectorAll('[data-unlock]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); unlockModule(b.dataset.unlock); });
  $('courseBody').querySelectorAll('.lrow').forEach((r) => r.onclick = () => {
    if (r.dataset.locked) { toast('🔒 Unlock this module first'); return; }
    openLesson(r.dataset.l);
  });
}
async function unlockModule(mKey) {
  if (preview) { showAuth('signup'); return; }
  if (!courseHasFull() && !confirm('Unlock this module for 100 credits?')) return;
  try {
    const res = await fetch('/.netlify/functions/unlock-module', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ module_key: mKey }),
    });
    const d = await res.json();
    if (res.status === 402) { toast('Out of credits'); openBuy(); return; }
    if (!res.ok) throw new Error(d.error || 'Failed');
    courseUnlocks.add(mKey);
    if (d.credits != null) $('creditCount').textContent = d.credits;
    toast('✅ Module unlocked!');
    buildCourseBody();
  } catch (e) { toast(e.message || 'Could not unlock'); }
}
let curLesson = null;
function openLesson(key) {
  // find lesson (and its module + pillar, so the lock check can't be skipped
  // by calling this directly — the row click handler isn't the only gate)
  let found = null, modOf = null, pillarOf = null;
  COURSE.forEach((p) => p.modules.forEach((m) => m.lessons.forEach((l) => { if (l.key === key) { found = l; modOf = m; pillarOf = p; } })));
  if (!found) return;
  if (!moduleUnlocked(modOf.key, pillarOf.key)) { toast('🔒 Unlock this module first'); return; }
  curLesson = found;
  // Shield over the video's top strip: blocks the YouTube title/logo link so
  // students can't tap through and copy the raw URL. Controls stay usable.
  $('lessonPlayer').innerHTML = lessonEmbed(courseVideos[key]) + '<div oncontextmenu="return false" style="position:absolute;top:0;left:0;right:0;height:56px;z-index:5"></div>';
  $('lessonPlayer').style.position = 'relative';
  $('lessonPlayer').classList.toggle('wide', found.aspect === '16:9');
  $('lessonTitle').textContent = found.n + ' · ' + found.title;
  $('lessonMeta').innerHTML = `<span class="muted">${modOf.title}${found.dur ? ' · ' + found.dur : ''}</span>`;
  const hasTask = /vault-action/.test(found.notes || '');
  $('lessonBody').innerHTML = (found.notes
    ? `<div class="vault-note"><div class="vault-h">📚 The Vault — read the lesson</div>${found.notes}</div>`
    : '') + (hasTask
    ? `<a class="btn gold block" href="${ATELIER_WHATSAPP}" target="_blank" style="margin:4px 0 18px">💬 Submit this task in the discussion group</a>`
    : '');
  // admin video setter
  if (userIsAdmin) {
    $('lessonAdmin').innerHTML = `<div class="lesson-admin">
      <label class="fld">👑 Video URL (YouTube / Vimeo / MP4) — loads for everyone</label>
      <input id="lvUrl" placeholder="https://youtu.be/… or https://…/video.mp4" value="${(courseVideos[key] || '').replace(/"/g, '&quot;')}">
      <button class="btn gold sm" id="lvSave" style="margin-top:8px">Save video</button>
      <span class="note" id="lvNote"></span></div>`;
    $('lvSave').onclick = async () => {
      const url = $('lvUrl').value.trim();
      $('lvSave').disabled = true; $('lvSave').textContent = 'Saving…';
      try {
        const res = await fetch('/.netlify/functions/course-set-video', {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
          body: JSON.stringify({ lesson_key: key, url }),
        });
        const d = await res.json(); if (!res.ok) throw new Error(d.error || 'Failed');
        courseVideos[key] = url; $('lessonPlayer').innerHTML = lessonEmbed(url);
        note('lvNote', '✅ Saved & live', 'ok');
      } catch (e) { note('lvNote', e.message || 'Failed', 'err'); }
      $('lvSave').disabled = false; $('lvSave').textContent = 'Save video';
    };
  } else { $('lessonAdmin').innerHTML = ''; }
  // mark complete
  const dn = $('lessonDone');
  const isDone = courseProgress.has(key);
  dn.textContent = isDone ? '✓ Completed' : '✅ Mark complete';
  dn.onclick = async () => {
    if (preview || !user) { showAuth('signup'); return; }
    if (courseProgress.has(key)) return;
    try { await sb.from('course_progress').insert({ user_id: user.id, lesson_key: key }); courseProgress.add(key); dn.textContent = '✓ Completed'; } catch (e) {}
  };
  showView('lesson');
}

// ---------------- The Arena (Ria posts challenges; everyone participates in the WhatsApp group) ----------------
const ATELIER_WHATSAPP = 'https://chat.whatsapp.com/Fv4cRzOoWUi6m0tRF7vBka';
async function loadAtelierFeed() {
  const { data } = await sb.from('challenges').select('*').eq('active', true).order('created_at', { ascending: false });
  $('challengeList').innerHTML = (data && data.length) ? data.map((c) =>
    `<div class="chal"><h3>${c.title}</h3><p class="muted" style="margin:0 0 6px;font-size:14px">${c.brief || ''}</p>
      <div class="prize">🏆 ${c.prize || ''}</div></div>`).join('')
    : '<div class="empty">No active challenge right now — check back soon.</div>';
  if (!userIsAdmin) { $('atelierAdmin').style.display = 'none'; return; }
  $('atelierAdmin').style.display = 'block';
  $('atelierAdmin').innerHTML = `<div class="shead"><h2>👑 Post a challenge</h2></div>
    <div class="panel">
      <input id="chalTitle" placeholder="Challenge title">
      <input id="chalBrief" placeholder="What should they do?" style="margin-top:8px">
      <input id="chalPrize" placeholder="Prize (e.g. ₦20,000 + 500 credits)" style="margin-top:8px">
      <button class="btn gold block" id="chalPost" style="margin-top:10px">Post challenge</button>
      <div class="note" id="chalNote"></div>
    </div>`;
  $('chalPost').onclick = async () => {
    const title = $('chalTitle').value.trim(); if (!title) return note('chalNote', 'Add a title.', 'err');
    const brief = $('chalBrief').value.trim(); const prize = $('chalPrize').value.trim();
    $('chalPost').disabled = true;
    const { error } = await sb.from('challenges').insert({ title, brief, prize, active: true });
    note('chalNote', error ? error.message : '✅ Posted!', error ? 'err' : 'ok');
    if (!error) { $('chalTitle').value = ''; $('chalBrief').value = ''; $('chalPrize').value = ''; loadAtelierFeed(); }
    $('chalPost').disabled = false;
  };
}

// ---------------- Mini Masterclasses (₦1,000 one-video courses) ----------------
const MINI = cfg.MINI_COURSES || [];
let miniVideos = {};        // 'mini-<key>' -> video url
let miniUnlocks = new Set(); // 'mini-<key>' unlocked for this user
let curMini = null;
function miniUnlocked(key) { return userIsAdmin || miniUnlocks.has('mini-' + key); }
// Resolve a mini-course's video: an explicit course_videos row wins; otherwise,
// courses flagged hostedVideo fall back to the conventional public Storage URL
// (course-videos/mini-<key>.mp4), so dropping a correctly-named file into that
// bucket is enough to make the lesson play — no DB row or admin step required.
function miniVideoUrl(key) {
  const mkey = 'mini-' + key;
  if (miniVideos[mkey]) return miniVideos[mkey];
  const m = MINI.find((x) => x.key === key);
  if (m && m.hostedVideo && cfg.SUPABASE_URL) {
    return cfg.SUPABASE_URL.replace(/\/$/, '') + '/storage/v1/object/public/course-videos/' + mkey + '.mp4';
  }
  return '';
}
async function openMiniHub() {
  showView('mini');
  try { const { data: v } = await sb.from('course_videos').select('lesson_key, url').like('lesson_key', 'mini-%'); miniVideos = {}; (v || []).forEach((r) => { miniVideos[r.lesson_key] = r.url; }); } catch (e) {}
  if (user && !preview) {
    try { const { data: u } = await sb.from('module_unlocks').select('module_key').eq('user_id', user.id).like('module_key', 'mini-%'); miniUnlocks = new Set((u || []).map((r) => r.module_key)); } catch (e) {}
  }
  $('miniGrid').innerHTML = MINI.map((m) => `
    <div class="mini-card" data-mk="${m.key}">
      <div class="mini-ic">${m.emo}</div>
      <div class="mini-t">${m.title}</div>
      <div class="mini-d">${m.teaser}</div>
      <div class="mini-f">${miniUnlocked(m.key) ? '<span class="mini-owned">✓ Unlocked</span>' : `<b>₦${(cfg.MINI_PRICE_NAIRA || 1000).toLocaleString()}</b>`}</div>
    </div>`).join('');
  $('miniGrid').querySelectorAll('.mini-card').forEach((c) => c.onclick = () => openMiniCourse(c.dataset.mk));
}
function openMiniCourse(key) {
  const m = MINI.find((x) => x.key === key); if (!m) return;
  curMini = m;
  const mkey = 'mini-' + key;
  const unlocked = miniUnlocked(key);
  $('miniTitle').textContent = m.emo + ' ' + m.title;
  $('miniMeta').textContent = m.teaser;
  if (unlocked) {
    const content = (cfg.MINI_CONTENT || {})[key];
    const steps = content && content.steps ? `
      <div class="mini-steps">
        <div class="mini-steps-h">📋 The steps — follow along with the video</div>
        ${content.steps.map((s, i) => `<div class="mini-step"><span class="mini-step-n">${i + 1}</span><div><b>${s[0]}</b><p>${s[1]}</p></div></div>`).join('')}
      </div>` : '';
    const charlab = content && content.charlab ? `
      <div class="mini-tool">
        <div class="mini-tool-h"><span class="mini-tool-ic">🧬</span><div><b>Fuse Character Lab</b><span>The prompt-builder for your avatar scenes</span></div></div>
        <div class="mini-tool-btns">
          <a class="btn gold sm" style="flex:1" href="${cfg.CHARLAB_BUY_URL || '#'}" target="_blank" rel="noopener">🛒 Get access</a>
          <a class="btn ghost sm" style="flex:1" href="${cfg.CHARLAB_TOOL_URL || '#'}" target="_blank" rel="noopener">🔑 Already purchased? Open it</a>
        </div>
      </div>` : '';
    $('miniBody').innerHTML = `<div id="miniPlayer" class="lesson-player" style="position:relative">${lessonEmbed(miniVideoUrl(key))}<div style="position:absolute;top:0;left:0;right:0;height:56px;z-index:5"></div></div>
      ${steps}
      ${charlab}
      <div class="mini-upsell">
        <div class="mini-upsell-t">🎬 Want the full system, not just one video?</div>
        <p>Fuse Atelier is the complete AI Creative Income System — every skill like this one, all in one place, plus 500 Fuse Studio credits.</p>
        <a class="btn gold block" href="https://fuse-atelier.netlify.app" target="_blank" rel="noopener">See Fuse Atelier — join at the founding price →</a>
      </div>
      ${userIsAdmin ? adminMiniVideoBox(mkey) : ''}`;
    wireMiniAdminSave(mkey);
  } else {
    $('miniBody').innerHTML = `<div class="mini-lock">
      <div style="font-size:32px">🔒</div>
      <p>Unlock this masterclass for <b>₦${(cfg.MINI_PRICE_NAIRA || 1000).toLocaleString()}</b>. Already paid on Selar? Enter the code you were given.</p>
      <input id="miniCode" placeholder="Enter your code">
      <button class="btn gold block" id="miniRedeem" style="margin-top:8px">Unlock with code</button>
      <div class="note" id="miniNote"></div>
      <button class="btn ghost block" id="miniCredits" style="margin-top:14px">Or unlock with 30 credits</button>
    </div>
    ${userIsAdmin ? adminMiniVideoBox(mkey) : ''}`;
    $('miniRedeem').onclick = () => redeemMini(mkey, $('miniCode').value.trim());
    $('miniCredits').onclick = () => redeemMini(mkey, '');
    wireMiniAdminSave(mkey);
  }
  showView('mini-lesson');
}
function adminMiniVideoBox(mkey) {
  return `<div class="lesson-admin">
    <label class="fld">👑 Video URL (YouTube / Vimeo / MP4) — loads for everyone</label>
    <input id="mvUrl" placeholder="https://youtu.be/… or https://…/video.mp4" value="${(miniVideos[mkey] || '').replace(/"/g, '&quot;')}">
    <button class="btn gold sm" id="mvSave" style="margin-top:8px">Save video</button>
    <span class="note" id="mvNote"></span></div>`;
}
function wireMiniAdminSave(mkey) {
  const btn = $('mvSave'); if (!btn) return;
  btn.onclick = async () => {
    const url = $('mvUrl').value.trim();
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      const res = await fetch('/.netlify/functions/course-set-video', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ lesson_key: mkey, url }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      miniVideos[mkey] = url; note('mvNote', '✅ Saved — live now.', 'ok');
    } catch (e) { note('mvNote', e.message || 'Could not save', 'err'); }
    btn.disabled = false; btn.textContent = 'Save video';
  };
}
async function redeemMini(mkey, code) {
  if (preview || !user) { showAuth('signup'); return; }
  const btn = $('miniRedeem') || $('miniCredits');
  if (btn) { btn.disabled = true; btn.textContent = 'Checking…'; }
  try {
    const res = await fetch('/.netlify/functions/unlock-module', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ module_key: mkey, code }),
    });
    const d = await res.json();
    if (res.status === 402) { note('miniNote', 'Out of credits.', 'err'); openBuy(); if (btn) { btn.disabled = false; btn.textContent = code ? 'Unlock with code' : 'Or unlock with 30 credits'; } return; }
    if (res.status === 403) { note('miniNote', d.error || 'That code is not valid.', 'err'); if (btn) { btn.disabled = false; btn.textContent = 'Unlock with code'; } return; }
    if (!res.ok) throw new Error(d.error || 'Failed');
    miniUnlocks.add(mkey);
    toast('✅ Unlocked!');
    openMiniCourse(mkey.replace(/^mini-/, ''));
  } catch (e) {
    note('miniNote', e.message || 'Could not unlock', 'err');
    if (btn) { btn.disabled = false; btn.textContent = code ? 'Unlock with code' : 'Or unlock with 30 credits'; }
  }
}
// .../?view=mini&mkey=avatar&code=AVATAR1K — auto-redeem straight from the
// Selar "thank you" redirect, so buyers land unlocked with no manual step.
async function maybeAutoRedeemMini() {
  const qs = new URLSearchParams(location.search);
  const mkey = qs.get('mkey'), code = qs.get('code');
  if (qs.get('view') === 'mini' && mkey && user) {
    openMiniCourse(mkey);
    if (code && !miniUnlocked(mkey)) await redeemMini('mini-' + mkey, code);
  }
}

// ---------------- All Courses hub ----------------
async function openAllCourses() {
  showView('all-courses');
  let unlocks = new Set();
  if (user && !preview) {
    try { const { data: u } = await sb.from('module_unlocks').select('module_key').eq('user_id', user.id); unlocks = new Set((u || []).map((r) => r.module_key)); } catch (e) {}
  }
  const rows = [];
  rows.push({
    title: '🏛️ Fuse Atelier', sub: 'The AI Creative Income System — 70 lessons, 4 pillars.',
    owned: courseHasFull(), price: '₦60,000', go: () => routeFeature('learn'),
  });
  rows.push({
    title: '💵 The $500 Week', sub: 'AI UGC & influencer income — 7-day course.',
    owned: userIsAdmin || unlocks.has('wk-course'),
    partial: !userIsAdmin && !unlocks.has('wk-course') && [...unlocks].some((k) => k.startsWith('wk-')),
    price: '₦5,000', go: () => routeFeature('week'),
  });
  MINI.forEach((m) => {
    rows.push({
      title: m.emo + ' ' + m.title, sub: m.teaser, owned: userIsAdmin || unlocks.has('mini-' + m.key),
      price: '₦' + (cfg.MINI_PRICE_NAIRA || 1000).toLocaleString(), go: () => openMiniCourse(m.key),
    });
  });
  $('allCoursesBody').innerHTML = rows.map((r) => `
    <div class="ac-row" data-go="${rows.indexOf(r)}">
      <div class="ac-main"><div class="ac-t">${r.title}</div><div class="ac-s">${r.sub}</div></div>
      <div class="ac-state">${r.owned ? '<span class="ac-owned">✓ Owned</span>' : r.partial ? '<span class="ac-partial">◐ Some days</span>' : `<span class="ac-price">${r.price}</span>`}</div>
    </div>`).join('');
  $('allCoursesBody').querySelectorAll('.ac-row').forEach((el, i) => el.onclick = () => rows[i].go());
}

// Route a home feature box / explore chip to its destination.
function routeFeature(go) {
  if (!go) return;
  // prefixed forms: image:slug, video:slug, tool:slug, studio:key, view:name
  const ci = go.indexOf(':');
  if (ci > -1) {
    const kind = go.slice(0, ci), val = go.slice(ci + 1);
    if (kind === 'image') { openImageModel(val); return; }
    if (kind === 'video') { showView('models'); buildModels('video'); openVideo(val); return; }
    if (kind === 'tool') { showView('models'); buildModels('tools'); openTool(val); return; }
    if (kind === 'studio') { openStudio(val); return; }
    if (kind === 'view') { showView(val); return; }
  }
  if (go === 'learn') return openCourse();
  if (go === 'week' || go === '500week') return openWeek();
  if (go === 'mini') return openMiniHub();
  if (go === 'reactor' || go === 'avatar' || go === 'promptgen' || go === 'market' || go === 'flyer' || go === 'audio' || go === 'editstudio') return openStudio(go);
  if (go === 'community') return showView('community');
  if (go === 'streak') return claimDaily();
  if (go === 'image-nano') { openImageModel('nano-banana'); return; }
  if (go === 'video-seedance') { showView('models'); buildModels('video'); openVideo('seedance-2-text-to-video'); return; }
  if (go === 'video-seedance4k') { showView('models'); buildModels('video'); openVideo('seedance-2-vip-text-to-video'); return; }
  if (go === 'naija') { openStudio('generate'); if (cfg.NAIJA_PACKS && cfg.NAIJA_PACKS[0]) $('prompt').value = cfg.NAIJA_PACKS[0].prompt; return; }
}

// ---------------- countdown ----------------
function startCountdown(id, hours) {
  const end = Date.now() + hours * 3600 * 1000;
  const tick = () => {
    const el = $(id); if (!el) return;
    let s = Math.max(0, Math.floor((end - Date.now()) / 1000));
    const h = String(Math.floor(s / 3600)).padStart(2, '0');
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    el.textContent = `${h}:${m}:${ss}`;
  };
  tick(); setInterval(tick, 1000);
}

// ---------------- generate ----------------
async function generate() {
  if (preview) { showAuth('signup'); return; }
  const raw = $('prompt').value.trim();
  if (!raw) return note('genNote', 'Describe what you want to create.', 'err');
  lastPrompt = raw;
  const prompt = activeStudio.template.replace('{input}', raw);
  if (studioVideo) return generateStudioVideo(prompt);
  const model = $('model').value, aspect = $('aspect').value;

  const btn = $('genBtn'); btn.disabled = true; btn.textContent = 'Generating…';
  $('result').innerHTML = '<div><span class="spin"></span><div style="margin-top:12px">Sending to the engine…</div></div>';
  note('genNote', '');
  let t = 0; const iv = setInterval(() => { t += 2.5; const d = $('result').querySelector('div div'); if (d) d.textContent = `Creating… (${Math.round(t)}s)`; }, 2500);

  try {
    const res = await fetch('/.netlify/functions/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ prompt, model, aspect, count: +$('imgCount').value, res: +$('imgRes').value, reference_image_urls: refUrls.length ? refUrls : undefined }),
    });
    const data = await res.json(); clearInterval(iv);
    if (res.status === 402) { note('genNote', 'Out of credits — top up to keep creating.', 'err'); openBuy(); $('result').innerHTML = '<div>Out of credits.</div>'; btn.disabled = false; btn.textContent = '✨ Generate'; return; }
    else if (res.status === 403) { note('genNote', data.error || 'Upgrade to unlock this model.', 'err'); openBuy(); $('result').innerHTML = '<div>🔒 This model needs a subscription.</div>'; btn.disabled = false; btn.textContent = '✨ Generate'; return; }
    else if (!res.ok) throw new Error(data.error || 'Generation failed');
    else {
      // Async: every image is a job we poll. Fills the grid as results arrive.
      const ids = data.request_ids && data.request_ids.length ? data.request_ids : [data.request_id];
      $('creditCount').textContent = data.credits;
      note('genNote', 'Creating… this can take up to a minute ⏳', 'ok'); btn.textContent = 'Rendering…';
      if (ids.length === 1) savePending(ids[0], 'studio');
      pollGrid(ids, $('result'), 'genNote', btn, '✨ Generate', data.watermark);
      return;
    }
  } catch (e) { clearInterval(iv); $('result').innerHTML = '<div>⚠ ' + (e.message || 'Failed') + '</div>'; note('genNote', e.message || 'Failed — credits not charged.', 'err'); btn.disabled = false; btn.textContent = '✨ Generate'; }
}

// ---------------- The $500 Week — AI UGC course ----------------
const WK = (window.FUSE_5WEEK) ? window.FUSE_5WEEK : { days: [] };
let weekVideos = {};          // wk-key -> video url
let weekUnlocked = false;     // paid / plan / code (whole course)
let weekDayUnlocks = new Set(); // single days bought with credits ('wk-1'..'wk-7')
const WK_JOIN_KEY = 'fuse_wk_joined';
const WK_DONE_KEY = 'fuse_wk_done';
function weekJoined() { try { return localStorage.getItem(WK_JOIN_KEY) === '1'; } catch (e) { return false; } }
function weekDoneSet() { try { return new Set(JSON.parse(localStorage.getItem(WK_DONE_KEY) || '[]')); } catch (e) { return new Set(); } }
function fmtN(n) { return '₦' + Number(n || 0).toLocaleString('en-NG'); }
function weekCanOpen(key) { return weekUnlocked || weekDayUnlocks.has(key); }

async function openWeek() {
  showView('week');
  weekUnlocked = courseHasFull();
  weekDayUnlocks = new Set();
  if (!preview && user) {
    try { const { data: v } = await sb.from('course_videos').select('lesson_key, url'); weekVideos = Object.assign({}, WK.dayVideos || {}); (v || []).forEach((r) => { if (String(r.lesson_key).startsWith('wk-')) weekVideos[r.lesson_key] = r.url; }); } catch (e) {}
    try {
      const { data: u } = await sb.from('module_unlocks').select('module_key').eq('user_id', user.id).like('module_key', 'wk-%');
      (u || []).forEach((r) => { if (r.module_key === 'wk-course') weekUnlocked = true; else weekDayUnlocks.add(r.module_key); });
    } catch (e) {}
  }
  // Selar's post-purchase redirect can send buyers straight back here as
  // .../?view=week&wkcode=UGC500 — auto-redeem so they land unlocked, no manual step.
  if (!weekUnlocked && !preview && user) {
    const qCode = new URLSearchParams(location.search).get('wkcode');
    if (qCode) { const ok = await redeemWeekCode(qCode); if (ok) toast('Payment confirmed — welcome in! 🎉'); }
  }
  renderWeek();
}

function renderWeek() {
  const done = weekDoneSet();
  const total = WK.days.length || 1;
  $('wkFill') && ($('wkFill').style.width = Math.round((done.size / total) * 100) + '%');
  $('wkText') && ($('wkText').textContent = weekUnlocked ? `${done.size}/${total} days done` : '');
  $('weekLockMsg').innerHTML = weekUnlocked
    ? '<div class="course-badge ok">✓ You have full access to The $500 Week</div>'
    : '<div class="course-badge">🔒 Paid course — unlock below to start</div>';

  // ----- access gate -----
  if (!weekUnlocked) {
    $('weekGate').innerHTML = `
      <div class="wk-pay">
        <h3>Get instant access</h3>
        <div class="price">${fmtN(WK.price)}</div>
        <button class="btn gold block" id="wkBuy">💬 Message me on WhatsApp to pay →</button>
        <p class="muted" style="font-size:12px;margin-top:8px">I'll send you account details. Once you've paid, send me your email and I'll unlock the course for you — <b class="gold">plus 100 bonus credits</b> to create with.</p>
        <a class="btn ghost block" id="wkLanding" href="${WK.landingUrl || '#'}" target="_blank" rel="noopener" style="margin-top:8px">👀 See everything inside the course →</a>
        <div class="wk-or">— or —</div>
        <button class="btn ghost block" id="wkCredits">Unlock the full course with ${WK.creditsCost} credits</button>
        <p class="muted" style="font-size:12px;margin-top:8px">Not ready for the full course? Tap any day below to unlock just that day for ${WK.dayCredits || 50} credits.</p>
        <div class="wk-code">
          <input id="wkCode" placeholder="Already have an access code?">
          <button class="btn gold sm" id="wkRedeem">Unlock</button>
        </div>
        <div class="note" id="wkPayNote"></div>
      </div>`;
    $('wkBuy').onclick = () => { if (WK.buyWhatsapp) window.open(WK.buyWhatsapp, '_blank'); else note('wkPayNote', 'WhatsApp link not set yet — add it in fiveweek.js.', 'err'); };
    $('wkCredits').onclick = weekUnlockCredits;
    $('wkRedeem').onclick = weekRedeemCode;
    $('weekBody').innerHTML = weekLockedPreview();
    $('weekBody').querySelectorAll('.wk-day').forEach((el) => el.onclick = () => {
      const k = el.dataset.wk;
      if (weekDayUnlocks.has(k)) openWeekLesson(k);
      else weekUnlockDay(k);
    });
    return;
  }

  // ----- WhatsApp join gate -----
  if (!weekJoined()) {
    $('weekGate').innerHTML = `
      <div class="wk-join">
        <h3>One quick step first 👋</h3>
        <p class="muted" style="font-size:14px;margin:0 0 12px">Join the private WhatsApp discussion group — that's where you get feedback, resources and support all week. The lessons unlock the moment you're in.</p>
        <button class="btn gold block" id="wkJoin">💬 Join the WhatsApp group</button>
        <button class="btn ghost block" id="wkJoined" style="margin-top:8px">✓ I've joined — open my course</button>
      </div>`;
    $('wkJoin').onclick = () => { if (WK.whatsapp) window.open(WK.whatsapp, '_blank'); else toast('WhatsApp link not set yet'); };
    $('wkJoined').onclick = () => { try { localStorage.setItem(WK_JOIN_KEY, '1'); } catch (e) {} toast('Welcome in! 🎉'); renderWeek(); };
    $('weekBody').innerHTML = weekLockedPreview();
    return;
  }

  // ----- full access + joined: the 7 days -----
  $('weekGate').innerHTML = '';
  $('weekBody').innerHTML = WK.days.map((d) => {
    const isDone = done.has(d.key);
    return `<div class="wk-day" data-wk="${d.key}">
      <div class="wk-day-top">
        <div class="wk-day-n">DAY<br>${d.day}</div>
        <div style="flex:1">
          <div class="wk-day-t">${isDone ? '✅ ' : ''}${d.title}</div>
          <div class="wk-day-m"><span>${d.dur}</span>${d.video ? '<span class="wk-vid-tag">🎥 VIDEO</span>' : ''}</div>
        </div>
        <div style="color:var(--gold);font-weight:800">›</div>
      </div>
    </div>`;
  }).join('');
  $('weekBody').querySelectorAll('.wk-day').forEach((el) => el.onclick = () => openWeekLesson(el.dataset.wk));
}

function weekLockedPreview() {
  // Locked-course day list. Days stay TAPPABLE: an unlocked single day opens,
  // a locked one offers a per-day credit unlock (wired by the caller).
  return WK.days.map((d) => {
    const owned = weekDayUnlocks.has(d.key);
    return `<div class="wk-day ${owned ? '' : 'locked'}" data-wk="${d.key}" style="${owned ? '' : 'opacity:.75'};cursor:pointer">
      <div class="wk-day-top"><div class="wk-day-n">DAY<br>${d.day}</div>
      <div style="flex:1"><div class="wk-day-t">${owned ? '✓ ' : ''}${d.title}</div>
        <div class="wk-day-m"><span>${d.dur}</span>${d.video ? '<span class="wk-vid-tag">🎥 VIDEO</span>' : ''}${owned ? '<span class="wk-vid-tag" style="background:rgba(61,214,140,.15);color:#3DD68C">UNLOCKED</span>' : `<span class="wk-vid-tag">🔓 ${WK.dayCredits || 50} cr</span>`}</div></div>
      <div>${owned ? '<span style="color:var(--gold);font-weight:800">›</span>' : '🔒'}</div></div></div>`;
  }).join('');
}

async function weekUnlockDay(key) {
  if (preview) { showAuth('signup'); return; }
  const d = WK.days.find((x) => x.key === key); if (!d) return;
  const cost = WK.dayCredits || 50;
  if (!confirm(`Unlock Day ${d.day} — "${d.title}" — for ${cost} credits?\n\n(Tip: the full course is ${WK.creditsCost} credits for all 7 days + 100 bonus credits.)`)) return;
  try {
    const res = await fetch('/.netlify/functions/unlock-module', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) }, body: JSON.stringify({ module_key: key }) });
    const data = await res.json();
    if (res.status === 402) { note('wkPayNote', `Not enough credits (need ${cost}) — top up, or message me on WhatsApp to get the full course.`, 'err'); openBuy(); return; }
    if (!res.ok) throw new Error(data.error || 'Failed');
    if (data.credits != null) $('creditCount').textContent = data.credits;
    weekDayUnlocks.add(key); toast(`Day ${d.day} unlocked! 🎉`);
    openWeekLesson(key);
  } catch (e) { note('wkPayNote', e.message || 'Could not unlock', 'err'); }
}

function openWeekLesson(key) {
  const d = WK.days.find((x) => x.key === key); if (!d) return;
  if (!weekCanOpen(key)) { weekUnlockDay(key); return; }
  const done = weekDoneSet();
  // The shield div sits over the video's top strip so students can't tap the
  // YouTube title/logo link and copy the raw video URL. Playback controls at
  // the bottom stay fully usable.
  const vid = d.video
    ? `<div class="wk-vid-slot" style="position:relative">${weekVideos[key] ? lessonEmbed(weekVideos[key]) + '<div style="position:absolute;top:0;left:0;right:0;height:56px;z-index:5"></div>' : '🎥 Video lesson — uploading soon. The written lesson below is ready now.'}</div>`
    : '';
  const labBanner = key === 'wk-2' ? `
    <div class="wk-lab-banner" style="display:block;padding:13px 15px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
        <div class="wk-lab-ic">🧬</div>
        <div class="wk-lab-txt"><b>Fuse Character Lab</b><span>The prompt-generator for your scene</span></div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <a href="${WK.charLabBuyUrl || '#'}" target="_blank" class="btn gold sm" style="flex:1">🛒 Get access</a>
        <a href="${WK.charLabLoginUrl || '#'}" target="_blank" class="btn ghost sm" style="flex:1">🔑 Already purchased? Log in</a>
      </div>
    </div>` : (key === 'wk-5' || key === 'wk-6') ? `
    <div class="wk-lab-banner" style="display:block;padding:13px 15px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
        <div class="wk-lab-ic">✈️</div>
        <div class="wk-lab-txt"><b>Fuse PitchPilot</b><span>Writes your email, WhatsApp, Instagram & LinkedIn pitch in one tap</span></div>
      </div>
      <a href="${WK.pitchPilotUrl || '#'}" target="_blank" class="btn gold sm block">🚀 Open PitchPilot — 3 free pitches</a>
    </div>` : '';
  const adminSet = userIsAdmin && d.video ? `<div class="lesson-admin" style="margin:8px 0">
      <label class="fld">👑 Video URL for Day ${d.day} (YouTube unlisted / MP4)</label>
      <input id="wkvUrl" placeholder="https://youtu.be/…" value="${(weekVideos[key] || '').replace(/"/g, '&quot;')}">
      <button class="btn gold sm" id="wkvSave" style="margin-top:8px">Save video</button><span class="note" id="wkvNote"></span></div>` : '';
  $('weekGate').innerHTML = '';
  $('weekBody').innerHTML = `
    <div class="backlink" id="wkLessonBack" style="cursor:pointer">← All lessons</div>
    <div class="course-kick" style="margin-top:6px">DAY ${d.day}</div>
    <h2 class="course-title" style="font-size:22px">${d.title}</h2>
    <div class="wk-day-m" style="margin:2px 0 12px"><span>${d.dur}</span></div>
    ${vid}${labBanner}${adminSet}
    <div class="wk-lesson-body">${d.notes}</div>
    <button class="btn ${done.has(key) ? 'ghost' : 'gold'} block" id="wkDone" style="margin-top:18px">${done.has(key) ? '✓ Completed — tap to undo' : '✅ Mark Day ' + d.day + ' complete'}</button>
    <a class="btn ghost block" href="${WK.whatsapp || '#'}" target="_blank" rel="noopener" style="margin-top:8px">📤 Submit today's task in the discussion group →</a>`;
  $('wkLessonBack').onclick = () => renderWeek();
  $('wkDone').onclick = () => {
    const s = weekDoneSet(); if (s.has(key)) s.delete(key); else s.add(key);
    try { localStorage.setItem(WK_DONE_KEY, JSON.stringify([...s])); } catch (e) {}
    openWeekLesson(key);
  };
  if (adminSet) {
    $('wkvSave').onclick = async () => {
      const url = $('wkvUrl').value.trim(); $('wkvSave').disabled = true; $('wkvSave').textContent = 'Saving…';
      try {
        const res = await fetch('/.netlify/functions/course-set-video', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) }, body: JSON.stringify({ lesson_key: key, url }) });
        if (!res.ok) throw new Error('Save failed');
        weekVideos[key] = url; note('wkvNote', 'Saved ✓', 'ok');
      } catch (e) { note('wkvNote', e.message, 'err'); }
      $('wkvSave').disabled = false; $('wkvSave').textContent = 'Save video';
    };
  }
  window.scrollTo(0, 0);
}

// Core redeem call — reused by the manual "Unlock" button and by the
// automatic Selar-redirect flow in openWeek(). Returns true/false, no DOM assumptions.
async function redeemWeekCode(code) {
  if (!code) return false;
  try {
    const res = await fetch('/.netlify/functions/unlock-module', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) }, body: JSON.stringify({ module_key: 'wk-course', code }) });
    if (!res.ok) return false;
    weekUnlocked = true;
    return true;
  } catch (e) { return false; }
}
async function weekRedeemCode() {
  if (preview) { showAuth('signup'); return; }
  const code = $('wkCode').value.trim(); if (!code) return note('wkPayNote', 'Enter the code you got after paying.', 'err');
  $('wkRedeem').disabled = true;
  const ok = await redeemWeekCode(code);
  if (ok) { toast('Unlocked! 🎉'); renderWeek(); }
  else { note('wkPayNote', 'That code is not valid.', 'err'); $('wkRedeem').disabled = false; }
}

async function weekUnlockCredits() {
  if (preview) { showAuth('signup'); return; }
  if (!confirm(`Unlock The $500 Week for ${WK.creditsCost} credits?`)) return;
  $('wkCredits').disabled = true;
  try {
    const res = await fetch('/.netlify/functions/unlock-module', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) }, body: JSON.stringify({ module_key: 'wk-course' }) });
    const d = await res.json();
    if (res.status === 402) { note('wkPayNote', 'Not enough credits — top up, or message me on WhatsApp to pay directly.', 'err'); openBuy(); $('wkCredits').disabled = false; return; }
    if (!res.ok) throw new Error(d.error || 'Failed');
    if (d.credits != null) $('creditCount').textContent = d.credits;
    weekUnlocked = true; toast('Unlocked! 🎉'); renderWeek();
  } catch (e) { note('wkPayNote', e.message || 'Could not unlock', 'err'); $('wkCredits').disabled = false; }
}

// ---------------- reactor (multi-AI) ----------------
let rcModel = null;
let rcRefs = [];   // attached image URLs (vision for text models, reference for image models)
function buildReactor() {
  $('reactorTitle').textContent = cfg.REACTOR_NAME;
  $('reactorList').innerHTML = cfg.REACTOR_MODELS.map((m) =>
    `<div class="rcard ${m.live ? '' : 'soon'}" data-id="${m.id}">
       <div class="rn">${m.name}</div><div class="rb">${m.badge}</div>
       <div class="rc">${m.live ? m.credits + (m.kind === 'image' ? ' cr / image' : ' cr / msg') : 'Coming soon'}</div></div>`).join('');
  $('reactorList').querySelectorAll('.rcard').forEach((el) => el.onclick = () => {
    const m = cfg.REACTOR_MODELS.find((x) => x.id === el.dataset.id);
    $('reactorChat').style.display = 'block'; rcRefs = []; renderRcThumbs(); $('rcOut').innerHTML = ''; note('rcNote', '');
    if (!m.live) { note('rcNote', `${m.name} comes online soon — video AIs are being connected.`, 'err'); $('rcName').textContent = m.name; $('rcCost').textContent = 'Coming soon'; return; }
    rcModel = m;
    const isImg = m.kind === 'image';
    $('rcName').textContent = m.name;
    $('rcCost').textContent = isImg ? (m.credits + ' credits per image · attach a photo to edit it') : (m.credits + ' credits per message');
    $('rcInput').placeholder = isImg ? 'Describe the image to create — or attach a photo and say how to change it…' : 'Ask anything — captions, scripts, product names, ad copy… (attach an image to ask about it)';
    $('rcAspect').style.display = isImg ? 'inline-block' : 'none';
    $('rcAttachBtn').textContent = isImg ? '📎 Add reference photo' : '📎 Add image (1 max)';
  });
}
function renderRcThumbs() {
  const box = $('rcThumbs'); if (!box) return;
  box.innerHTML = rcRefs.map((u, i) =>
    `<div style="position:relative"><img src="${u}" style="width:54px;height:54px;object-fit:cover;border-radius:10px;border:1px solid var(--line)">
       <button onclick="window.rcDropRef(${i})" style="position:absolute;top:-6px;right:-6px;background:#b3261e;color:#fff;border:0;border-radius:50%;width:20px;height:20px;font-weight:800;cursor:pointer">×</button></div>`).join('');
}
window.rcDropRef = (i) => { rcRefs.splice(i, 1); renderRcThumbs(); };
async function rcAttach(files) {
  if (preview) { showAuth('signup'); return; }
  // Text models only support ONE image per message (MuAPI's image_url field is
  // singular) — image-gen models take several reference photos. Cap accordingly.
  const isImg = rcModel && rcModel.kind === 'image';
  const room = isImg ? Infinity : Math.max(0, 1 - rcRefs.length);
  for (const file of Array.from(files).slice(0, room)) {
    try {
      const path = `${user.id}/rc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
      const { error } = await sb.storage.from('avatars').upload(path, file, { contentType: file.type || 'image/jpeg' });
      if (error) throw error;
      rcRefs.push(sb.storage.from('avatars').getPublicUrl(path).data.publicUrl);
      renderRcThumbs();
    } catch (e) { note('rcNote', 'Upload failed: ' + (e.message || e), 'err'); }
  }
  if (!isImg && files.length > room) note('rcNote', 'This AI can only read one image per message — using your latest photo.', '');
}
async function reactorSend() {
  if (preview) { showAuth('signup'); return; }
  if (!rcModel) return;
  const prompt = $('rcInput').value.trim(); if (!prompt) return note('rcNote', 'Type a message.', 'err');
  const btn = $('rcSend');

  // ----- Image models: generate / edit a picture right here (reuses the proven engine) -----
  if (rcModel.kind === 'image') {
    btn.disabled = true; btn.textContent = 'Creating…'; note('rcNote', 'Sending to the engine…', 'ok');
    $('rcOut').innerHTML = '<div><span class="spin"></span></div>';
    try {
      const res = await fetch('/.netlify/functions/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ prompt, model: rcModel.slug, aspect: $('rcAspect').value || '9:16', count: 1, res: 1, reference_image_urls: rcRefs.length ? rcRefs : undefined }),
      });
      const data = await res.json();
      if (res.status === 402) { note('rcNote', 'Out of credits.', 'err'); openBuy(); $('rcOut').innerHTML = ''; btn.disabled = false; btn.textContent = 'Send'; return; }
      if (res.status === 403) { note('rcNote', data.error || 'Upgrade to unlock this model.', 'err'); openBuy(); $('rcOut').innerHTML = ''; btn.disabled = false; btn.textContent = 'Send'; return; }
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      const ids = data.request_ids && data.request_ids.length ? data.request_ids : [data.request_id];
      $('creditCount').textContent = data.credits;
      pollGrid(ids, $('rcOut'), 'rcNote', btn, 'Send', data.watermark);
    } catch (e) { $('rcOut').innerHTML = ''; note('rcNote', e.message || 'Failed — credits not charged.', 'err'); btn.disabled = false; btn.textContent = 'Send'; }
    return;
  }

  // ----- Text models: chat (and read any attached images) -----
  // Submits and returns fast — a long Claude/GPT/Gemini reply (especially with
  // an image attached) can outlast a serverless function's execution limit, so
  // the actual answer is fetched by polling job-status.js, same as video does.
  btn.disabled = true; btn.textContent = 'Thinking…'; note('rcNote', '');
  $('rcOut').innerHTML = '<span class="spin"></span>';
  try {
    const res = await fetch('/.netlify/functions/ai-chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ model: rcModel.id, prompt, images: rcRefs.length ? rcRefs : undefined }),
    });
    const data = await res.json();
    if (res.status === 503) { note('rcNote', data.error, 'err'); $('rcOut').innerHTML = ''; }
    else if (res.status === 402) { note('rcNote', 'Out of credits.', 'err'); openBuy(); $('rcOut').innerHTML = ''; }
    else if (res.status === 403) { note('rcNote', data.error || 'Upgrade to unlock this model.', 'err'); openBuy(); $('rcOut').innerHTML = ''; }
    else if (!res.ok) throw new Error(data.error || 'AI error');
    else {
      $('rcOut').textContent = ''; $('creditCount').textContent = data.credits;
      pollChat(data.request_id, $('rcOut'), 'rcNote', btn, 'Send');
      return; // pollChat re-enables the button when it finishes
    }
  } catch (e) { note('rcNote', e.message, 'err'); $('rcOut').innerHTML = ''; }
  btn.disabled = false; btn.textContent = 'Send';
}

// ---------------- Omni Studio (Gemini Omni Edit · Seedance 2 Omni · Talking Avatar) ----------------
let omniEditClips = [];   // uploaded video clip URLs (up to 10)
let omniEditAudio = '';   // optional audio URL
let omniRefImages = [];   // up to 9
let omniRefAudios = [];   // up to 3
let omniAvatarImg = '';
let omniAvatarAudio = '';

function omniSwitch(tab) {
  document.querySelectorAll('[data-omni]').forEach((b) => b.classList.toggle('active', b.dataset.omni === tab));
  $('omniEditPane').style.display = tab === 'edit' ? 'block' : 'none';
  $('omniRefPane').style.display = tab === 'ref' ? 'block' : 'none';
  $('omniAvatarPane').style.display = tab === 'avatar' ? 'block' : 'none';
}

async function omniUpload(file, kind) {
  const ext = (file.name.split('.').pop() || (kind === 'audio' ? 'mp3' : kind === 'video' ? 'mp4' : 'jpg')).toLowerCase();
  const path = `${user.id}/omni-${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error } = await sb.storage.from('avatars').upload(path, file);
  if (error) throw error;
  return sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}

async function omniEditPickClips(files) {
  if (preview) { showAuth('signup'); return; }
  const limit = 10 - omniEditClips.length;
  if (limit <= 0) return note('omniEditNote', 'Max 10 clips.', 'err');
  note('omniEditNote', 'Uploading…', 'ok');
  for (let i = 0; i < Math.min(files.length, limit); i++) {
    try { omniEditClips.push(await omniUpload(files[i], 'video')); } catch (e) { note('omniEditNote', e.message || 'Upload failed', 'err'); }
  }
  $('omniEditCount').textContent = `${omniEditClips.length}/10 clips added`;
  $('omniEditThumbs').innerHTML = omniEditClips.map((u, i) => `<video src="${u}" muted style="width:64px;height:64px;object-fit:cover;border-radius:10px;border:1px solid var(--line)"></video>`).join('');
  note('omniEditNote', '');
}
async function omniEditPickAudio(files) {
  if (!files || !files[0]) return;
  note('omniEditNote', 'Uploading audio…', 'ok');
  try { omniEditAudio = await omniUpload(files[0], 'audio'); $('omniEditAudioName').textContent = '🎵 ' + files[0].name; note('omniEditNote', ''); }
  catch (e) { note('omniEditNote', e.message || 'Upload failed', 'err'); }
}
async function omniEditGenerate() {
  if (preview) { showAuth('signup'); return; }
  const instructions = $('omniEditPrompt').value.trim();
  if (!instructions) return note('omniEditNote', 'Describe the edit you want.', 'err');
  if (!omniEditClips.length) return note('omniEditNote', 'Add at least one clip.', 'err');
  const btn = $('omniEditGen'); btn.disabled = true; btn.textContent = 'Starting…'; note('omniEditNote', '');
  try {
    const res = await fetch('/.netlify/functions/omni-video-edit', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ instructions, video_urls: omniEditClips, audio_url: omniEditAudio || undefined }),
    });
    const data = await res.json();
    if (res.status === 402) { note('omniEditNote', 'Out of credits.', 'err'); openBuy(); }
    else if (res.status === 403) { note('omniEditNote', data.error || 'Upgrade to unlock this model.', 'err'); openBuy(); }
    else if (!res.ok) throw new Error(data.error || 'Could not start the edit');
    else { $('creditCount').textContent = data.credits; pollGrid([data.request_id], $('omniEditResult'), 'omniEditNote', btn, '✨ Edit videos'); return; }
  } catch (e) { note('omniEditNote', e.message || 'Failed', 'err'); }
  btn.disabled = false; btn.textContent = '✨ Edit videos';
}

async function omniRefPickImages(files) {
  if (preview) { showAuth('signup'); return; }
  const limit = 9 - omniRefImages.length;
  if (limit <= 0) return note('omniRefNote', 'Max 9 image references.', 'err');
  note('omniRefNote', 'Uploading…', 'ok');
  for (let i = 0; i < Math.min(files.length, limit); i++) {
    try { omniRefImages.push(await omniUpload(files[i], 'image')); } catch (e) { note('omniRefNote', e.message || 'Upload failed', 'err'); }
  }
  $('omniRefImgThumbs').innerHTML = omniRefImages.map((u) => `<img src="${u}" style="width:64px;height:64px;object-fit:cover;border-radius:10px;border:1px solid var(--line)">`).join('');
  note('omniRefNote', '');
}
async function omniRefPickAudios(files) {
  if (preview) { showAuth('signup'); return; }
  const limit = 3 - omniRefAudios.length;
  if (limit <= 0) return note('omniRefNote', 'Max 3 audio references.', 'err');
  note('omniRefNote', 'Uploading…', 'ok');
  for (let i = 0; i < Math.min(files.length, limit); i++) {
    try { omniRefAudios.push(await omniUpload(files[i], 'audio')); } catch (e) { note('omniRefNote', e.message || 'Upload failed', 'err'); }
  }
  $('omniRefAudioNames').textContent = omniRefAudios.length ? `🎵 ${omniRefAudios.length} audio file(s) added` : '';
  note('omniRefNote', '');
}
async function omniRefGenerate() {
  if (preview) { showAuth('signup'); return; }
  const prompt = $('omniRefPrompt').value.trim();
  if (!prompt) return note('omniRefNote', 'Describe the video you want.', 'err');
  const btn = $('omniRefGen'); btn.disabled = true; btn.textContent = 'Starting…'; note('omniRefNote', '');
  try {
    const res = await fetch('/.netlify/functions/omni-reference', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ prompt, image_urls: omniRefImages, audio_urls: omniRefAudios, aspect: $('omniRefAspect').value }),
    });
    const data = await res.json();
    if (res.status === 402) { note('omniRefNote', 'Out of credits.', 'err'); openBuy(); }
    else if (res.status === 403) { note('omniRefNote', data.error || 'Upgrade to unlock this model.', 'err'); openBuy(); }
    else if (!res.ok) throw new Error(data.error || 'Could not start the generation');
    else { $('creditCount').textContent = data.credits; pollGrid([data.request_id], $('omniRefResult'), 'omniRefNote', btn, '✨ Generate'); return; }
  } catch (e) { note('omniRefNote', e.message || 'Failed', 'err'); }
  btn.disabled = false; btn.textContent = '✨ Generate';
}

async function omniAvatarPickImg(files) {
  if (!files || !files[0]) return;
  note('omniAvatarNote', 'Uploading…', 'ok');
  try { omniAvatarImg = await omniUpload(files[0], 'image'); $('omniAvatarImgPreview').innerHTML = `<img src="${omniAvatarImg}" style="width:80px;height:80px;object-fit:cover;border-radius:10px;border:1px solid var(--line)">`; note('omniAvatarNote', ''); }
  catch (e) { note('omniAvatarNote', e.message || 'Upload failed', 'err'); }
}
async function omniAvatarPickAudio(files) {
  if (!files || !files[0]) return;
  note('omniAvatarNote', 'Uploading…', 'ok');
  try { omniAvatarAudio = await omniUpload(files[0], 'audio'); $('omniAvatarAudioName').textContent = '🎵 ' + files[0].name; note('omniAvatarNote', ''); }
  catch (e) { note('omniAvatarNote', e.message || 'Upload failed', 'err'); }
}
async function omniAvatarGenerate() {
  if (preview) { showAuth('signup'); return; }
  if (!omniAvatarImg) return note('omniAvatarNote', 'Add a portrait image.', 'err');
  if (!omniAvatarAudio) return note('omniAvatarNote', 'Add an audio clip.', 'err');
  const btn = $('omniAvatarGen'); btn.disabled = true; btn.textContent = 'Starting…'; note('omniAvatarNote', '');
  try {
    const res = await fetch('/.netlify/functions/talking-avatar', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ model: $('omniAvatarModel').value, image_url: omniAvatarImg, audio_url: omniAvatarAudio }),
    });
    const data = await res.json();
    if (res.status === 402) { note('omniAvatarNote', 'Out of credits.', 'err'); openBuy(); }
    else if (res.status === 403) { note('omniAvatarNote', data.error || 'Upgrade to unlock this model.', 'err'); openBuy(); }
    else if (!res.ok) throw new Error(data.error || 'Could not start the video');
    else { $('creditCount').textContent = data.credits; pollGrid([data.request_id], $('omniAvatarResult'), 'omniAvatarNote', btn, '✨ Generate talking video'); return; }
  } catch (e) { note('omniAvatarNote', e.message || 'Failed', 'err'); }
  btn.disabled = false; btn.textContent = '✨ Generate talking video';
}

// ---------------- library / recent ----------------
let libFilter = 'all';
let libItems = [];   // cached so the project preview can show prompt + settings
async function loadLibrary() {
  if (preview) return demoGrid('libGrid');
  let q = sb.from('generations').select('output_url, type, prompt, model, aspect, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(40);
  if (libFilter !== 'all') q = q.eq('type', libFilter === 'image' ? 'image' : libFilter);
  const { data } = await q;
  libItems = data || [];
  const g = $('libGrid');
  if (!libItems.length) { g.innerHTML = '<div class="empty" style="grid-column:1/-1">Nothing here yet — create something ✨</div>'; return; }
  g.innerHTML = libItems.map((x, i) => {
    const media = x.type === 'video'
      ? `<video src="${x.output_url}" muted loop playsinline></video>`
      : `<img src="${x.output_url}">`;
    return `<div class="projitem" onclick="window.fuseProject(${i})">${media}</div>`;
  }).join('');
}
// Project preview — shows the creation plus the prompt + settings used to make it.
window.fuseProject = (i) => {
  const x = libItems[i]; if (!x) return;
  lbUrl = x.output_url;
  const media = (x.type === 'video')
    ? `<video src="${x.output_url}" controls autoplay loop muted playsinline style="max-width:92vw;max-height:56vh;border-radius:14px"></video>`
    : `<img src="${x.output_url}" style="max-width:92vw;max-height:56vh;border-radius:14px">`;
  const modelName = (cfg.IMAGE_MODELS.concat(cfg.VIDEO_MODELS, cfg.TOOL_MODELS).find((m) => m.slug === x.model) || {}).name || x.model || '—';
  const when = x.created_at ? new Date(x.created_at).toLocaleDateString() : '';
  const frameTools = (x.type === 'video')
    ? `<div class="frame-tools"><div class="ft-h">🎞 Extract frames (chain your next clip)</div>
        <div class="ft-row">
          <button class="btn ghost sm" onclick="fuseSaveFrame('${x.output_url}','start')">⬇ Start frame</button>
          <button class="btn ghost sm" onclick="fuseSaveFrame('${x.output_url}','end')">⬇ End frame</button>
          <button class="btn gold sm" onclick="fuseUseEndAsStart('${x.output_url}')">➡ Use end frame as next start</button>
        </div><div class="note" id="ftNote"></div></div>`
    : '';
  const meta = `<div class="projmeta">
      <div class="pm-row"><span>Model</span><b>${modelName}</b></div>
      ${x.aspect ? `<div class="pm-row"><span>Aspect</span><b>${x.aspect}</b></div>` : ''}
      ${when ? `<div class="pm-row"><span>Created</span><b>${when}</b></div>` : ''}
      ${x.prompt ? `<div class="pm-prompt"><span>Prompt used</span><p>${(x.prompt || '').replace(/</g, '&lt;')}</p>
        <button class="btn ghost sm" onclick="window.fuseReuse(${i})">↺ Use this prompt again</button></div>` : ''}
    </div>`;
  $('lbContent').innerHTML = media + frameTools + meta;
  $('lightbox').style.display = 'grid';
};
// Re-open the studio with this project's prompt prefilled.
window.fuseReuse = (i) => {
  const x = libItems[i]; if (!x) return;
  $('lightbox').style.display = 'none';
  openStudio('generate');
  if (x.prompt) $('prompt').value = x.prompt;
};
async function loadRecent() {
  if (preview) return demoGrid('homeRecent');
  // Community showcase — everything made with Fuse Studio (images + videos).
  const { data } = await sb.from('public_showcase').select('output_url, type').limit(12);
  $('homeRecent').innerHTML = (data && data.length)
    ? data.map((x) => x.type === 'video'
        ? `<video src="${x.output_url}" muted loop playsinline onmouseover="this.play()" onmouseout="this.pause()" onclick="window.open('${x.output_url}','_blank')"></video>`
        : `<img src="${x.output_url}" onclick="window.open('${x.output_url}','_blank')">`).join('')
    : '<div class="empty" style="grid-column:1/-1">Community creations will show here ✨</div>';
}
function demoGrid(id) { $(id).innerHTML = Array(6).fill('<div class="empty" style="aspect-ratio:1;display:grid;place-items:center;padding:0">🖼️</div>').join(''); }

// ---------------- profile ----------------
async function loadProfile() {
  $('creditCount').textContent;
  if (preview) {
    $('pfEmail').textContent = 'preview@fuse'; $('pfPlan').textContent = 'Preview'; $('pfCredits').textContent = '—';
    $('refLink').value = location.origin + '/?ref=YOURCODE'; $('pfAffiliate').textContent = '₦0'; return;
  }
  const { data } = await sb.from('profiles').select('credits, plan, plan_expires_at, referral_code, affiliate_naira, is_admin').eq('id', user.id).maybeSingle();
  if (!data) return;
  userPlan = data.plan || 'free';
  userIsAdmin = !!data.is_admin;
  $('pfEmail').textContent = user.email;
  $('pfPlan').textContent = data.plan === 'free' ? 'Free trial' : 'Studio ' + data.plan;
  $('pfCredits').textContent = data.credits;
  $('creditCount').textContent = data.credits;
  $('planBadge').textContent = data.plan === 'free' ? 'Trial' : data.plan;
  // Account menu fields.
  $('menuPlan').textContent = data.plan === 'free' ? 'Free trial' : 'Studio ' + data.plan;
  $('menuCredits').textContent = data.credits;
  const bar = $('menuCreditBar'); if (bar) bar.style.width = Math.max(4, Math.min(100, (data.credits / 800) * 100)) + '%';
  $('refLink').value = `${location.origin}/?ref=${data.referral_code}`;
  $('pfAffiliate').textContent = naira(data.affiliate_naira || 0);
  // Admin grant panel — only for the owner.
  if (data.is_admin) {
    $('adminPanel').style.display = 'block';
    if (!$('adminPack').children.length) {
      $('adminPack').innerHTML = cfg.PACKS.map((p) => `<option value="${p.key}">${p.name} — ${naira(p.naira)} → ${p.credits} cr</option>`).join('');
    }
  } else { $('adminPanel').style.display = 'none'; }
}
async function adminGrant(custom) {
  const email = $('adminEmail').value.trim();
  if (!email) return note('adminNote', 'Enter the buyer\'s email.', 'err');
  const payload = { email };
  let btn, label;
  if (custom) {
    const credits = parseInt($('adminCredits').value, 10) || 0;
    if (credits <= 0) return note('adminNote', 'Enter a credit amount.', 'err');
    payload.credits = credits;
    btn = $('adminGrantCredits'); label = 'Add custom credits';
  } else {
    payload.pack = $('adminPack').value;
    btn = $('adminGrant'); label = 'Grant access';
  }
  btn.disabled = true; btn.textContent = 'Granting…';
  try {
    const res = await fetch('/.netlify/functions/admin-grant', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify(payload),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || 'Failed');
    note('adminNote', `✅ Added ${d.credits} credits to ${d.email}.`, 'ok');
    $('adminEmail').value = ''; $('adminCredits').value = '';
  } catch (e) { note('adminNote', e.message || 'Failed', 'err'); }
  btn.disabled = false; btn.textContent = label;
}
async function adminGrantCourse() {
  const email = $('adminEmail').value.trim();
  if (!email) return note('adminNote', 'Enter the buyer\'s email.', 'err');
  const course = $('adminCourse').value;
  const bonus_credits = $('adminCourseBonus').checked ? 500 : 0;
  const btn = $('adminGrantCourse'); btn.disabled = true; btn.textContent = 'Unlocking…';
  try {
    const res = await fetch('/.netlify/functions/admin-grant', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ email, course, bonus_credits }),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || 'Failed');
    note('adminNote', `✅ Course unlocked for ${d.email}${d.credits ? ` (+${d.credits} credits)` : ''}.`, 'ok');
    $('adminEmail').value = ''; $('adminCourseBonus').checked = false;
  } catch (e) { note('adminNote', e.message || 'Failed', 'err'); }
  btn.disabled = false; btn.textContent = 'Unlock course for this email';
}

// ---------------- community ----------------
async function loadChallenges() {
  const { data } = await sb.from('challenges').select('*').eq('active', true).order('created_at', { ascending: false });
  $('challengeList').innerHTML = (data && data.length) ? data.map((c) =>
    `<div class="chal"><h3>${c.title}</h3><p class="muted" style="margin:0 0 6px;font-size:14px">${c.brief || ''}</p>
      <div class="prize">🏆 ${c.prize || ''}</div></div>`).join('')
    : '<div class="empty">No active challenges right now — check back soon.</div>';
}
async function submitContent() {
  if (preview) { showAuth('signup'); return; }
  const url = $('contentUrl').value.trim(); if (!url) return note('contentNote', 'Paste your post link.', 'err');
  const { error } = await sb.from('content_submissions').insert({ user_id: user.id, url });
  note('contentNote', error ? error.message : '✅ Submitted! We review and credit approved posts.', error ? 'err' : 'ok');
  if (!error) $('contentUrl').value = '';
}
async function requestPayout() {
  if (preview) { showAuth('signup'); return; }
  const { error } = await sb.from('payout_requests').insert({ user_id: user.id, amount_naira: 0, status: 'requested' });
  note('payoutNote', error ? error.message : '✅ Request received. Verified affiliates are paid by transfer.', error ? 'err' : 'ok');
}

// ---------------- buy / Paystack ----------------
function openBuy() { renderPacks(); note('buyNote', ''); showPackList(); $('buyOverlay').style.display = 'grid'; }
function showPackList() { $('payManual').style.display = 'none'; $('packList').style.display = ''; const t = $('curToggle'); if (t) t.style.display = ''; }
// Launch promo — same window/multipliers as _packs.js. Purely a display
// helper; the server always decides the real amount granted.
function promoActive() {
  const p = cfg.LAUNCH_PROMO; if (!p) return false;
  const now = Date.now();
  return now >= Date.parse(p.startsAt) && now < Date.parse(p.endsAt);
}
function promoMultFor(pack) {
  if (!promoActive()) return 0;
  if (pack.key === 'course') return 0; // flat override, not a multiplier — handled separately
  return cfg.LAUNCH_PROMO.subMultiplier[pack.key] || 0;
}
function promoCreditsFor(pack) {
  if (!promoActive()) return pack.credits;
  if (pack.key === 'course') return cfg.LAUNCH_PROMO.courseCredits;
  const mult = cfg.LAUNCH_PROMO.subMultiplier[pack.key];
  return mult ? pack.credits * mult : pack.credits;
}
function renderPacks() {
  // Free users see only subscription plans (no credit top-ups). Subscribers see everything.
  const isFree = userPlan === 'free' && !userIsAdmin;
  const packs = isFree ? cfg.PACKS.filter((p) => p.kind === 'sub' || p.kind === 'course') : cfg.PACKS;
  const promo = promoActive();
  $('packList').innerHTML = packs.map((p) => {
    const credits = promoCreditsFor(p);
    const boosted = promo && credits !== p.credits;
    const mult = promoMultFor(p);
    return `<div class="pk${boosted ? ' pk-promo' : ''}" data-pack="${p.key}">
      ${boosted ? `<span class="pk-badge">${mult ? mult + 'x' : '🎉'} LAUNCH</span>` : ''}
      <div><div class="pkn">${p.name}${p.featured ? ' ⭐' : ''}</div>
      <div class="pkc">${boosted
          ? `<span class="pk-was">${p.credits} credits</span> <span class="pk-arrow">→</span> <b class="gold pk-now">${credits} credits</b>`
          : `<b class="gold">${credits} credits</b>`} · ${p.note}${p.kind === 'sub' ? ' /mo' : ''}</div></div>
      <div class="pka">${price(p.naira)}</div></div>`;
  }).join('');
  if (promo) $('packList').insertAdjacentHTML('afterbegin', '<div class="pk-promo-strip">🎉 FULL LAUNCH PROMO — boosted credits, 2 days only</div>');
  else if (isFree) $('packList').insertAdjacentHTML('afterbegin', '<div class="muted" style="font-size:12px;margin-bottom:8px;text-align:center">Subscribe to unlock all models + credit top-ups</div>');
  $('packList').querySelectorAll('.pk').forEach((el) => el.onclick = () => buy(el.dataset.pack, el));
  $('curToggle').textContent = showUsd ? 'Show ₦' : 'Show $';
}
async function buy(pack, el) {
  if (preview) { showAuth('signup'); return; }
  const pay = cfg.PAYMENT || { mode: 'paystack' };
  // While Paystack is pending, show bank-transfer / Selar instructions instead.
  if (pay.mode === 'manual') return showManualPay(pack);
  note('buyNote', 'Opening secure checkout…', 'ok'); if (el) el.style.opacity = '.5';
  try {
    const res = await fetch('/.netlify/functions/paystack-init', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ pack }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not start payment');
    window.location.href = data.authorization_url;
  } catch (e) { note('buyNote', e.message, 'err'); if (el) el.style.opacity = '1'; }
}
// Bank-transfer / Selar stopgap. Buyer pays, messages proof on WhatsApp,
// you unlock them with Profile → Admin → Grant access.
function showManualPay(packKey) {
  const p = cfg.PACKS.find((x) => x.key === packKey) || cfg.PACKS[0];
  const pay = cfg.PAYMENT || {};
  const amount = naira(p.naira);
  const email = (user && user.email) || '';
  const msg = encodeURIComponent(`Hi! I want to pay for the ${p.name} plan (${amount}) on Fuse Studio.\nMy account email: ${email}\nI'm sending the transfer now and will attach my receipt.`);
  const wa = pay.whatsapp ? `https://wa.me/${pay.whatsapp}?text=${msg}` : '';
  const bank = pay.bank || {};
  const rows = [];
  if (bank.number) rows.push(`<div class="pm-row"><span>Bank</span><b>${bank.name || ''}</b></div>
    <div class="pm-row"><span>Account no.</span><b>${bank.number} <a class="gold" style="cursor:pointer" onclick="navigator.clipboard.writeText('${bank.number}');this.textContent='✓'">copy</a></b></div>
    <div class="pm-row"><span>Account name</span><b>${bank.holder || ''}</b></div>`);
  $('payDetails').innerHTML = `
    <div class="pay-amt">${p.name} · <b class="gold">${amount}</b></div>
    <div class="pm-prompt" style="border:0;padding:0;margin:6px 0 12px"><p style="color:var(--gold)">You get ${p.credits} credits</p></div>
    ${rows.length ? `<div class="projmeta" style="margin-bottom:12px">${rows.join('')}</div>` : ''}
    ${pay.selar ? `<a class="btn gold block" href="${pay.selar}" target="_blank" rel="noopener" style="margin-bottom:8px">💳 Pay with card / Selar</a>` : ''}
    ${wa ? `<a class="btn ${pay.selar ? 'ghost' : 'gold'} block" href="${wa}" target="_blank" rel="noopener">📲 Send payment proof on WhatsApp</a>` : ''}
    <p class="muted" style="font-size:12px;margin-top:10px">After you pay, send your receipt + this email (<b>${email}</b>) on WhatsApp. Your credits are added within minutes. ⚡</p>`;
  $('packList').style.display = 'none';
  const t = $('curToggle'); if (t) t.style.display = 'none';
  $('payManual').style.display = 'block';
}

// ---------------- daily streak ----------------
async function refreshStreak() {
  if (preview) { $('streakText').textContent = '0'; return; }
  const { data } = await sb.from('profiles').select('last_claim_at, streak_days').eq('id', user.id).maybeSingle();
  if (!data) return;
  const can = !data.last_claim_at || (Date.now() - new Date(data.last_claim_at).getTime()) > 20 * 3600 * 1000;
  $('streakText').textContent = data.streak_days || 0;
  const msn = $('menuStreakN'); if (msn) msn.textContent = data.streak_days || 0;
  $('streakBtn').classList.toggle('claimable', can);
  $('streakBtn').title = can ? 'Tap to claim today\'s free credit 🎁' : `${data.streak_days || 0}-day streak · come back tomorrow`;
}
async function claimDaily() {
  if (preview) { showAuth('signup'); return; }
  $('streakBtn').disabled = true;
  try {
    const res = await fetch('/.netlify/functions/daily-claim', { method: 'POST', headers: { ...(await authHeader()) } });
    const d = await res.json();
    if (d.claimed) {
      $('creditCount').textContent = d.credits;
      $('streakText').textContent = d.streak;
      $('streakBtn').classList.remove('claimable');
      note('genNote', '', '');
      toast(`🔥 ${d.streak}-day streak · +${d.award} credit${d.award > 1 ? 's' : ''}!`);
    } else { $('streakBtn').classList.remove('claimable'); toast(`🔥 ${d.streak}-day streak · come back tomorrow`); }
  } catch (e) {}
  $('streakBtn').disabled = false;
}
function toast(msg) {
  let el = document.getElementById('fuseToast');
  if (!el) { el = document.createElement('div'); el.id = 'fuseToast'; el.className = 'fuse-toast'; document.body.appendChild(el); }
  el.textContent = msg; el.classList.add('show');
  clearTimeout(window.__toastT); window.__toastT = setTimeout(() => el.classList.remove('show'), 2600);
}

// ---------------- AI Avatar Studio (consistent faces) ----------------
let selectedAvatar = null;
let avatarMap = {};   // id -> avatar row (incl. model_sheet_url)
async function loadAvatars() {
  if (preview) { $('avatarList').innerHTML = '<div class="empty" style="grid-column:1/-1">Sign up to create your avatar</div>'; return; }
  const { data } = await sb.from('avatars').select('id,name,image_url,model_sheet_url,status,voice_sample_url,source_video_url,trained_frame_url').order('created_at', { ascending: false });
  avatarMap = {}; (data || []).forEach((a) => { avatarMap[a.id] = a; });
  $('avatarList').innerHTML = (data && data.length)
    ? data.map((a) => `<div style="text-align:center;position:relative"><img src="${a.image_url}" data-id="${a.id}" data-name="${a.name}" class="avThumb" style="aspect-ratio:1;object-fit:cover;border-radius:12px;border:1px solid var(--line);cursor:pointer">${a.model_sheet_url ? '<span class="av-sheet-badge">📐</span>' : ''}<div style="font-size:11px;margin-top:4px" class="muted">${a.name}</div></div>`).join('')
    : '<div class="empty" style="grid-column:1/-1">No avatars yet — create one below 👇</div>';
  $('avatarList').querySelectorAll('.avThumb').forEach((el) => el.onclick = () => selectAvatar(el.dataset.id, el.dataset.name));
}
function selectAvatar(id, name) {
  selectedAvatar = id;
  $('avSelName').textContent = name;
  $('avGenWrap').style.display = 'block';
  $('avVideoWrap').style.display = 'block';
  $('avResult').innerHTML = '<div class="muted">Your consistent-face image appears here.</div>';
  renderSheet();
  renderAvatarVideoStatus();
  $('avGenWrap').scrollIntoView({ behavior: 'smooth' });
}
function renderSheet() {
  const a = avatarMap[selectedAvatar] || {};
  const btn = $('avSheetBtn'), view = $('avSheetView');
  note('avSheetNote', '');
  if (a.model_sheet_url) {
    view.innerHTML = `<img src="${a.model_sheet_url}" style="width:100%;border-radius:12px;border:1px solid var(--gold-deep);margin-bottom:8px"><div class="muted" style="font-size:12px">✅ Active — every generation now uses this sheet for consistency.</div>`;
    btn.textContent = '🔄 Regenerate model sheet';
  } else {
    view.innerHTML = '';
    btn.textContent = '📐 Generate model sheet';
  }
  btn.disabled = false;
}
async function generateModelSheet() {
  if (preview) { showAuth('signup'); return; }
  if (!selectedAvatar) return note('avSheetNote', 'Pick an avatar first.', 'err');
  const btn = $('avSheetBtn'); btn.disabled = true; btn.textContent = 'Submitting…';
  $('avSheetView').innerHTML = '<div style="padding:14px;text-align:center"><span class="spin"></span><div style="margin-top:8px" class="muted">Building your model sheet… up to a minute</div></div>';
  note('avSheetNote', '', '');
  try {
    const res = await fetch('/.netlify/functions/avatar-modelsheet', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ avatar_id: selectedAvatar }),
    });
    const d = await res.json();
    if (res.status === 402) { note('avSheetNote', 'Out of credits — top up.', 'err'); openBuy(); renderSheet(); return; }
    if (!res.ok) throw new Error(d.error || 'Failed');
    if (d.credits != null) $('creditCount').textContent = d.credits;
    note('avSheetNote', 'Generating… ⏳', 'ok');
    pollSheet(d.request_id);
  } catch (e) { note('avSheetNote', e.message || 'Failed', 'err'); renderSheet(); }
}
function pollSheet(reqId) {
  let s = 0;
  const timer = setInterval(async () => {
    s += 8;
    try {
      const r = await fetch(`/.netlify/functions/job-status?id=${reqId}`, { headers: { ...(await authHeader()) } });
      const d = await r.json();
      if (d.status === 'completed') {
        clearInterval(timer);
        if (avatarMap[selectedAvatar]) avatarMap[selectedAvatar].model_sheet_url = d.url;
        renderSheet(); note('avSheetNote', '✅ Model sheet ready!', 'ok'); loadAvatars();
      } else if (d.status === 'failed') {
        clearInterval(timer); note('avSheetNote', (d.error || 'Failed') + ' — credits refunded.', 'err'); renderSheet(); if (user) loadProfile();
      }
    } catch (e) {}
    if (s >= 240) { clearInterval(timer); note('avSheetNote', 'Still working — check back shortly.', 'err'); renderSheet(); }
  }, 8000);
}
// ---------------- AI Avatar Creator (long-form talking video) ----------------
function renderAvatarVideoStatus() {
  const a = avatarMap[selectedAvatar] || {};
  $('avVoiceStatus').textContent = a.voice_sample_url ? '✅ Voice sample attached.' : 'No voice sample yet.';
  $('avFaceVideoStatus').textContent = a.trained_frame_url
    ? '✅ Trained from your uploaded video.'
    : 'No training video yet — your model sheet / photos will be used instead.';
}
async function uploadAvatarVoice(file) {
  if (!selectedAvatar) return note('avVoiceNote', 'Pick an avatar first.', 'err');
  note('avVoiceNote', 'Uploading…', 'ok');
  try {
    const ext = (file.name.split('.').pop() || 'mp3').toLowerCase();
    const path = `${user.id}/voice-${selectedAvatar}-${Date.now()}.${ext}`;
    const { error: upErr } = await sb.storage.from('avatars').upload(path, file);
    if (upErr) throw upErr;
    const url = sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
    const res = await fetch('/.netlify/functions/avatar-train', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ avatar_id: selectedAvatar, voice_sample_url: url }),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || 'Failed');
    if (avatarMap[selectedAvatar]) avatarMap[selectedAvatar].voice_sample_url = url;
    renderAvatarVideoStatus();
    note('avVoiceNote', '✅ Voice sample saved.', 'ok');
  } catch (e) { note('avVoiceNote', e.message || 'Upload failed.', 'err'); }
}
async function uploadAvatarTrainingVideo(file) {
  if (!selectedAvatar) return note('avFaceVideoNote', 'Pick an avatar first.', 'err');
  note('avFaceVideoNote', 'Uploading…', 'ok');
  try {
    const ext = (file.name.split('.').pop() || 'mp4').toLowerCase();
    const path = `${user.id}/facevid-${selectedAvatar}-${Date.now()}.${ext}`;
    const { error: upErr } = await sb.storage.from('avatars').upload(path, file);
    if (upErr) throw upErr;
    const url = sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
    note('avFaceVideoNote', 'Training… this can take a moment ⏳', 'ok');
    const res = await fetch('/.netlify/functions/avatar-train', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ avatar_id: selectedAvatar, source_video_url: url }),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || 'Failed');
    if (avatarMap[selectedAvatar]) { avatarMap[selectedAvatar].source_video_url = d.source_video_url; avatarMap[selectedAvatar].trained_frame_url = d.trained_frame_url; }
    renderAvatarVideoStatus();
    note('avFaceVideoNote', '✅ Trained from your video.', 'ok');
  } catch (e) { note('avFaceVideoNote', e.message || 'Training failed.', 'err'); }
}
let avvOwnAudioUrl = null;
let avvLastUrl = null;
async function uploadAvatarOwnAudio(file) {
  if (!selectedAvatar) return note('avVoiceNote', 'Pick an avatar first.', 'err');
  note('avVoiceNote', 'Uploading your audio…', 'ok');
  try {
    const ext = (file.name.split('.').pop() || 'mp3').toLowerCase();
    const path = `${user.id}/ownaudio-${selectedAvatar}-${Date.now()}.${ext}`;
    const { error } = await sb.storage.from('avatars').upload(path, file);
    if (error) throw error;
    avvOwnAudioUrl = sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
    $('avOwnAudioStatus').textContent = '✅ Using your own audio — voice cloning will be skipped for this video.';
    note('avVoiceNote', '', '');
  } catch (e) { note('avVoiceNote', e.message || 'Upload failed.', 'err'); }
}
function avvToggleMode() {
  $('avvMotionWrap').style.display = $('avvMode').value === 'motion' ? 'block' : 'none';
}
async function avvGenerate() {
  if (preview) { showAuth('signup'); return; }
  if (!selectedAvatar) return note('avvNote', 'Pick an avatar first.', 'err');
  const script = $('avvScript').value.trim();
  if (!script) return note('avvNote', 'Write or paste the script first.', 'err');
  const a = avatarMap[selectedAvatar] || {};
  if (!avvOwnAudioUrl && !a.voice_sample_url) return note('avvNote', 'Upload a voice sample (or your own audio) above first.', 'err');
  const mode = $('avvMode').value;
  const cameraMotion = $('avvCameraMotion').value.trim();
  if (mode === 'motion' && !cameraMotion) return note('avvNote', 'Describe the camera motion / action for a motion video.', 'err');
  const btn = $('avvGen'); const label = '🎬 Generate video'; btn.disabled = true; btn.textContent = 'Submitting…';
  $('avvResult').innerHTML = '<div><span class="spin"></span><div style="margin-top:12px">Starting your video…</div></div>';
  $('avvCtaWrap').style.display = 'none';
  note('avvNote', '');
  try {
    const res = await fetch('/.netlify/functions/avatar-video-create', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({
        avatar_id: selectedAvatar, script, mode, camera_motion: mode === 'motion' ? cameraMotion : undefined,
        audio_url: avvOwnAudioUrl || undefined,
        settings: { resolution: $('avvResolution').value, prompt: $('avvPrompt').value.trim(), aspect: $('avvAspect').value },
      }),
    });
    const d = await res.json();
    if (res.status === 503) { $('avvResult').innerHTML = '<div class="muted">Avatar Creator is being connected.</div>'; note('avvNote', d.error, 'err'); btn.disabled = false; btn.textContent = label; }
    else if (res.status === 402) { note('avvNote', 'Out of credits — top up.', 'err'); openBuy(); btn.disabled = false; btn.textContent = label; }
    else if (!res.ok) throw new Error(d.error || 'Failed');
    else {
      $('creditCount').textContent = d.credits;
      note('avvNote', `Working… (~${d.estimated_minutes} min of video) this can take a while ⏳`, 'ok');
      btn.textContent = 'Rendering…';
      pollAvatarVideo(d.id, btn, label);
    }
  } catch (e) { $('avvResult').innerHTML = '<div>⚠ ' + (e.message || 'Failed') + '</div>'; note('avvNote', e.message || 'Failed — credits not charged.', 'err'); btn.disabled = false; btn.textContent = label; }
}
const AVV_STAGE_LABEL = { speech: 'Cloning your voice…', slicing: 'Preparing chunks…', video: 'Generating video', stitching: 'Combining the final video…' };
function pollAvatarVideo(id, btn, label) {
  let s = 0;
  const timer = setInterval(async () => {
    s += 10;
    try {
      const r = await fetch(`/.netlify/functions/avatar-video-status?id=${id}`, { headers: { ...(await authHeader()) } });
      const d = await r.json();
      if (d.stage === 'complete') {
        clearInterval(timer);
        avvLastUrl = d.url;
        $('avvResult').innerHTML = `<div><video src="${d.url}" controls autoplay loop muted playsinline></video><div style="margin-top:12px"><button class="btn gold sm" onclick="fuseDownload('${d.url}')">⬇ Download</button></div></div>`;
        note('avvNote', 'Done ✅', 'ok');
        $('avvCtaWrap').style.display = 'block';
        if (user) loadProfile();
        btn.disabled = false; btn.textContent = label;
      } else if (d.stage === 'failed') {
        clearInterval(timer);
        $('avvResult').innerHTML = '<div>⚠ ' + (d.error || 'Failed') + '</div>';
        note('avvNote', (d.error || 'Failed') + ' — credits refunded.', 'err');
        if (user) loadProfile();
        btn.disabled = false; btn.textContent = label;
      } else {
        const txt = (AVV_STAGE_LABEL[d.stage] || 'Working…') + (d.progress ? ` (${d.progress})` : '');
        note('avvNote', txt + ` — ${s}s elapsed ⏳`, 'ok');
      }
    } catch (e) {}
    if (s >= 3600) { clearInterval(timer); note('avvNote', 'Still rendering — check back shortly.', 'err'); btn.disabled = false; btn.textContent = label; }
  }, 10000);
}
async function avvAddCta() {
  if (!avvLastUrl) return;
  const ctaText = $('avvCtaText').value.trim();
  if (!ctaText) return note('avvCtaNote', 'Write the CTA text first.', 'err');
  const btn = $('avvAddCta'); btn.disabled = true; btn.textContent = 'Adding…';
  note('avvCtaNote', '');
  try {
    const res = await fetch('/.netlify/functions/video-cta', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ video_url: avvLastUrl, cta_text: ctaText }),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || 'Failed');
    avvLastUrl = d.url;
    $('avvResult').innerHTML = `<div><video src="${d.url}" controls autoplay loop muted playsinline></video><div style="margin-top:12px"><button class="btn gold sm" onclick="fuseDownload('${d.url}')">⬇ Download</button></div></div>`;
    note('avvCtaNote', '✅ Ad-ready — CTA burned in.', 'ok');
  } catch (e) { note('avvCtaNote', e.message || 'Failed', 'err'); }
  btn.disabled = false; btn.textContent = '💬 Add CTA to video';
}
let avTrainFiles = [];   // accumulates across multiple "Add photos" picks
function renderTrainThumbs() {
  const n = avTrainFiles.length;
  $('avCount').textContent = n ? `${n} photo${n > 1 ? 's' : ''} added${n >= 15 ? ' (max)' : ''}` : '';
  const wrap = $('avThumbs'); if (!wrap) return;
  wrap.innerHTML = avTrainFiles.map((f, i) => `<div class="av-th"><img src="${URL.createObjectURL(f)}"><span class="av-th-x" onclick="window.fuseRmTrain(${i})">✕</span></div>`).join('');
}
window.fuseRmTrain = (i) => { avTrainFiles.splice(i, 1); renderTrainThumbs(); };
function addTrainFiles(list) {
  Array.from(list || []).forEach((f) => {
    if (avTrainFiles.length >= 15) return;
    if (!avTrainFiles.some((x) => x.name === f.name && x.size === f.size)) avTrainFiles.push(f);
  });
  renderTrainThumbs();
}
async function createAvatar() {
  if (preview) { showAuth('signup'); return; }
  const name = $('avNewName').value.trim();
  const files = avTrainFiles.slice(0, 15);
  if (!name || !files.length) return note('avNote', 'Add a name and choose your photos.', 'err');
  $('avCreate').disabled = true; note('avNote', `Uploading ${files.length} photo(s)…`, 'ok');
  try {
    const urls = [];
    for (const file of files) {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${user.id}/av-${Date.now()}-${urls.length}.${ext}`;
      const { error: upErr } = await sb.storage.from('avatars').upload(path, file);
      if (upErr) throw upErr;
      urls.push(sb.storage.from('avatars').getPublicUrl(path).data.publicUrl);
    }
    const { error: insErr } = await sb.from('avatars').insert({ user_id: user.id, name, image_url: urls[0], image_urls: urls });
    if (insErr) throw insErr;
    note('avNote', `✅ Avatar trained on ${urls.length} photo(s)! Tap it above to generate.`, 'ok');
    $('avNewName').value = ''; $('avFile').value = ''; avTrainFiles = []; renderTrainThumbs();
    loadAvatars();
  } catch (e) { note('avNote', e.message || 'Could not create avatar.', 'err'); }
  $('avCreate').disabled = false;
}
let avExtraRefs = [];   // extra reference image URLs for avatar generation (e.g. products, props)
async function pickAvatarRefs(files) {
  if (!files || !files.length) return;
  const limit = 3 - avExtraRefs.length;
  if (limit <= 0) return note('avGenNote', 'Max 3 extra references.', 'err');
  note('avGenNote', 'Uploading reference(s)…', 'ok');
  for (let i = 0; i < Math.min(files.length, limit); i++) {
    const file = files[i];
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${user.id}/avref-${Date.now()}-${i}.${ext}`;
    const { error } = await sb.storage.from('avatars').upload(path, file);
    if (error) { note('avGenNote', error.message || 'Upload failed.', 'err'); continue; }
    avExtraRefs.push(sb.storage.from('avatars').getPublicUrl(path).data.publicUrl);
  }
  renderAvatarRefs();
  note('avGenNote', `✅ ${avExtraRefs.length} reference(s) attached.`, 'ok');
}
function renderAvatarRefs() {
  $('avRefPreviews').innerHTML = avExtraRefs.map((u, i) =>
    `<div style="position:relative"><img src="${u}" style="width:48px;height:48px;object-fit:cover;border-radius:8px;border:1px solid var(--line)">
      <span class="ref-x" onclick="window.fuseRemoveAvRef(${i})">✕</span></div>`).join('');
}
window.fuseRemoveAvRef = (i) => { avExtraRefs.splice(i, 1); renderAvatarRefs(); };

async function avatarGenerate() {
  if (preview) { showAuth('signup'); return; }
  if (!selectedAvatar) return note('avGenNote', 'Pick an avatar first.', 'err');
  const prompt = $('avPrompt').value.trim();
  if (!prompt) return note('avGenNote', 'Describe the scene.', 'err');
  const aspect = $('avAspect').value;
  const btn = $('avGen'); const label = '✨ Generate (10 credits)'; btn.disabled = true; btn.textContent = 'Submitting…';
  $('avResult').innerHTML = '<div><span class="spin"></span><div style="margin-top:12px">Locking your face into the scene…</div></div>';
  note('avGenNote', '');
  try {
    const res = await fetch('/.netlify/functions/avatar-generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ avatar_id: selectedAvatar, prompt, aspect, extra_refs: avExtraRefs.length ? avExtraRefs : undefined }),
    });
    const data = await res.json();
    if (res.status === 503) { $('avResult').innerHTML = '<div class="muted">Avatar Studio is being connected.</div>'; note('avGenNote', data.error, 'err'); btn.disabled = false; btn.textContent = label; }
    else if (res.status === 402) { note('avGenNote', 'Out of credits — top up.', 'err'); openBuy(); btn.disabled = false; btn.textContent = label; }
    else if (!res.ok) throw new Error(data.error || 'Failed');
    else {
      $('creditCount').textContent = data.credits;
      note('avGenNote', 'Rendering your avatar… this can take up to a minute ⏳', 'ok'); btn.textContent = 'Rendering…';
      savePending(data.request_id, 'avatar');
      pollJob(data.request_id, $('avResult'), 'avGenNote', btn, label, 'image');
    }
  } catch (e) { $('avResult').innerHTML = '<div>⚠ ' + (e.message || 'Failed') + '</div>'; note('avGenNote', e.message || 'Failed — credits not charged.', 'err'); btn.disabled = false; btn.textContent = label; }
}

// ---------------- Flyer Studio (conversational AI flyer designer) ----------------
let flyerProjectId = null;
let flyerHistory = [];       // [{role:'user'|'assistant', text}]
let flyerLayers = [];        // display log of applied visual layers

async function loadFlyerHistory() {
  if (preview) return;
  const { data } = await sb.from('flyer_projects').select('id,brief,hero_prompt,hero_image_url,final_url,layers,reference_image_urls').order('created_at', { ascending: false }).limit(20);
  const grid = $('flyerHistoryGrid');
  if (!data || !data.length) { $('flyerHistoryPanel').style.display = 'none'; return; }
  $('flyerHistoryPanel').style.display = 'block';
  grid.innerHTML = data.map((p) => {
    const thumb = p.final_url || p.hero_image_url;
    const media = thumb ? `<img src="${thumb}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px">` : `<div style="width:100%;aspect-ratio:1;border-radius:8px;background:var(--card);display:flex;align-items:center;justify-content:center;font-size:11px" class="muted">No visual yet</div>`;
    return `<div style="cursor:pointer" data-id="${p.id}">${media}<div class="muted" style="font-size:11px;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${(p.brief || '').replace(/</g, '&lt;')}</div></div>`;
  }).join('');
  grid.querySelectorAll('[data-id]').forEach((el) => el.onclick = () => flyerLoadProject(data.find((p) => String(p.id) === el.dataset.id)));
}
function flyerLoadProject(p) {
  if (!p) return;
  flyerProjectId = p.id;
  flyerHistory = [];
  flyerLayers = (Array.isArray(p.layers) ? p.layers : []).map((l) => l.instruction);
  $('flyerLog').innerHTML = '';
  flyerAppendLog('assistant', `Loaded: ${p.brief || '(untitled)'}`);
  $('flyerImgPrompt').value = p.hero_prompt || '';
  if (p.hero_image_url) {
    $('flyerHeroResult').innerHTML = `<img src="${p.hero_image_url}" style="width:100%;border-radius:12px">`;
    $('flyerLayerPanel').style.display = 'block';
    $('flyerTextPanel').style.display = 'block';
  }
  $('flyerLayerLog').innerHTML = flyerLayers.map((l) => `<div class="muted" style="font-size:12px">✓ ${l}</div>`).join('');
  if (p.final_url) $('flyerFinalResult').innerHTML = `<div><img src="${p.final_url}" style="width:100%;border-radius:12px"><div style="margin-top:12px"><button class="btn gold sm" onclick="fuseDownload('${p.final_url}')">⬇ Download</button></div></div>`;
  $('flyerVisualPanel').scrollIntoView({ behavior: 'smooth' });
}

let flyerRefUrls = [];
async function flyerPickRefs(files) {
  if (preview) { showAuth('signup'); return; }
  if (!files || !files.length) return;
  const limit = 20 - flyerRefUrls.length;
  if (limit <= 0) return note('flyerRefNote', 'Max 20 reference images.', 'err');
  note('flyerRefNote', 'Uploading…', 'ok');
  for (let i = 0; i < Math.min(files.length, limit); i++) {
    const file = files[i];
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${user.id}/flyerref-${Date.now()}-${i}.${ext}`;
    const { error } = await sb.storage.from('avatars').upload(path, file);
    if (error) { note('flyerRefNote', error.message || 'Upload failed.', 'err'); continue; }
    flyerRefUrls.push(sb.storage.from('avatars').getPublicUrl(path).data.publicUrl);
  }
  renderFlyerRefs();
  note('flyerRefNote', `✅ ${flyerRefUrls.length} reference(s) attached.`, 'ok');
}
function renderFlyerRefs() {
  $('flyerRefThumbs').innerHTML = flyerRefUrls.map((u, i) =>
    `<div style="position:relative"><img src="${u}" style="width:56px;height:56px;object-fit:cover;border-radius:8px;border:1px solid var(--line)">
      <span class="ref-x" onclick="window.fuseFlyerRmRef(${i})">✕</span></div>`).join('');
}
window.fuseFlyerRmRef = (i) => { flyerRefUrls.splice(i, 1); renderFlyerRefs(); };

function flyerAppendLog(role, text) {
  const log = $('flyerLog');
  const bubble = document.createElement('div');
  bubble.style.cssText = role === 'user'
    ? 'align-self:flex-end;background:var(--gold);color:#1a1200;padding:10px 14px;border-radius:14px 14px 2px 14px;max-width:85%;white-space:pre-wrap;font-size:14px'
    : 'align-self:flex-start;background:var(--card);border:1px solid var(--line);padding:10px 14px;border-radius:14px 14px 14px 2px;max-width:85%;white-space:pre-wrap;font-size:14px';
  bubble.textContent = text;
  log.appendChild(bubble);
  log.scrollTop = log.scrollHeight;
}

async function flyerSend() {
  if (preview) { showAuth('signup'); return; }
  const msg = $('flyerMsg').value.trim();
  if (!msg) return;
  flyerAppendLog('user', msg);
  $('flyerMsg').value = '';
  const btn = $('flyerSend'); btn.disabled = true; btn.textContent = 'Thinking…';
  note('flyerNote', '');
  try {
    const res = await fetch('/.netlify/functions/flyer-brief', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ message: msg, history: flyerHistory, project_id: flyerProjectId, reference_image_urls: flyerRefUrls }),
    });
    const d = await res.json();
    if (res.status === 402) { note('flyerNote', 'Out of credits — top up.', 'err'); openBuy(); btn.disabled = false; btn.textContent = 'Send'; return; }
    if (!res.ok) throw new Error(d.error || 'Failed');
    if (d.credits != null) $('creditCount').textContent = d.credits;
    if (d.project_id) flyerProjectId = d.project_id;
    flyerHistory.push({ role: 'user', text: msg });
    flyerPollBrief(d.request_id, btn);
  } catch (e) { note('flyerNote', e.message || 'Failed', 'err'); btn.disabled = false; btn.textContent = 'Send'; }
}
function flyerPollBrief(reqId, btn) {
  let s = 0;
  const timer = setInterval(async () => {
    s += 4;
    try {
      const r = await fetch(`/.netlify/functions/job-status?id=${reqId}`, { headers: { ...(await authHeader()) } });
      const d = await r.json();
      if (d.status === 'completed') {
        clearInterval(timer);
        let parsed;
        try { parsed = JSON.parse(d.text); } catch (e) { parsed = { reply: d.text, image_prompt: '' }; }
        flyerHistory.push({ role: 'assistant', text: parsed.reply || d.text });
        flyerAppendLog('assistant', parsed.reply || d.text);
        if (parsed.suggested_next_steps && parsed.suggested_next_steps.length) {
          flyerAppendLog('assistant', '💡 ' + parsed.suggested_next_steps.join('  ·  '));
        }
        if (parsed.image_prompt) {
          $('flyerImgPrompt').value = parsed.image_prompt;
          $('flyerVisualPanel').scrollIntoView({ behavior: 'smooth' });
          flyerGenHero(true); // auto-generate — no separate manual step needed
        }
        btn.disabled = false; btn.textContent = 'Send';
      } else if (d.status === 'failed') {
        clearInterval(timer);
        note('flyerNote', (d.error || 'Failed') + ' — credits refunded.', 'err');
        btn.disabled = false; btn.textContent = 'Send';
      }
    } catch (e) {}
    if (s >= 180) { clearInterval(timer); note('flyerNote', 'Still thinking — try again shortly.', 'err'); btn.disabled = false; btn.textContent = 'Send'; }
  }, 4000);
}

async function flyerGenHero(auto) {
  if (preview) { showAuth('signup'); return; }
  const prompt = $('flyerImgPrompt').value.trim();
  if (!prompt) return note('flyerHeroNote', 'Add an image prompt first.', 'err');
  const btn = $('flyerGenHero'); const label = '✨ Generate visual'; btn.disabled = true; btn.textContent = 'Submitting…';
  $('flyerHeroResult').innerHTML = '<div><span class="spin"></span><div style="margin-top:12px">Generating the hero visual…</div></div>';
  note('flyerHeroNote', '');
  try {
    const res = await fetch('/.netlify/functions/flyer-hero', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ project_id: flyerProjectId || undefined, prompt, aspect: $('flyerAspect').value, reference_image_urls: flyerProjectId ? undefined : flyerRefUrls }),
    });
    const d = await res.json();
    if (res.status === 402) { note('flyerHeroNote', 'Out of credits — top up.', 'err'); openBuy(); btn.disabled = false; btn.textContent = label; return; }
    if (!res.ok) throw new Error(d.error || 'Failed');
    if (d.credits != null) $('creditCount').textContent = d.credits;
    if (d.project_id) flyerProjectId = d.project_id;
    note('flyerHeroNote', 'Rendering… ⏳', 'ok'); btn.textContent = 'Rendering…';
    pollJob(d.request_id, $('flyerHeroResult'), 'flyerHeroNote', btn, label, 'image');
    $('flyerLayerPanel').style.display = 'block';
    $('flyerTextPanel').style.display = 'block';
  } catch (e) { $('flyerHeroResult').innerHTML = '<div>⚠ ' + (e.message || 'Failed') + '</div>'; note('flyerHeroNote', e.message || 'Failed', 'err'); btn.disabled = false; btn.textContent = label; }
}

async function flyerAddLayer() {
  if (preview) { showAuth('signup'); return; }
  const instruction = $('flyerLayerInput').value.trim();
  if (!instruction) return;
  if (!flyerProjectId) return note('flyerLayerNote', 'Generate the hero visual first.', 'err');
  const btn = $('flyerAddLayer'); btn.disabled = true; btn.textContent = 'Adding…';
  note('flyerLayerNote', '');
  try {
    const res = await fetch('/.netlify/functions/flyer-layer', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ project_id: flyerProjectId, instruction }),
    });
    const d = await res.json();
    if (res.status === 402) { note('flyerLayerNote', 'Out of credits — top up.', 'err'); openBuy(); btn.disabled = false; btn.textContent = 'Add layer'; return; }
    if (!res.ok) throw new Error(d.error || 'Failed');
    if (d.credits != null) $('creditCount').textContent = d.credits;
    flyerLayers.push(instruction);
    $('flyerLayerLog').innerHTML = flyerLayers.map((l) => `<div class="muted" style="font-size:12px">✓ ${l}</div>`).join('');
    $('flyerLayerInput').value = '';
    note('flyerLayerNote', 'Applying… ⏳', 'ok');
    let s = 0;
    const timer = setInterval(async () => {
      s += 5;
      try {
        const r = await fetch(`/.netlify/functions/job-status?id=${d.request_id}`, { headers: { ...(await authHeader()) } });
        const jd = await r.json();
        if (jd.status === 'completed') {
          clearInterval(timer);
          $('flyerHeroResult').innerHTML = `<img src="${jd.url}" style="width:100%;border-radius:12px">`;
          note('flyerLayerNote', '✅ Layer added.', 'ok');
          btn.disabled = false; btn.textContent = 'Add layer';
        } else if (jd.status === 'failed') {
          clearInterval(timer);
          note('flyerLayerNote', (jd.error || 'Failed') + ' — credits refunded.', 'err');
          btn.disabled = false; btn.textContent = 'Add layer';
        }
      } catch (e) {}
      if (s >= 180) { clearInterval(timer); note('flyerLayerNote', 'Still working — check back shortly.', 'err'); btn.disabled = false; btn.textContent = 'Add layer'; }
    }, 5000);
  } catch (e) { note('flyerLayerNote', e.message || 'Failed', 'err'); btn.disabled = false; btn.textContent = 'Add layer'; }
}

async function flyerComposite() {
  if (preview) { showAuth('signup'); return; }
  if (!flyerProjectId) return note('flyerCompositeNote', 'Generate the hero visual first.', 'err');
  const headline = $('flyerHeadline').value.trim();
  if (!headline) return note('flyerCompositeNote', 'Add a headline first.', 'err');
  const bullets = $('flyerBullets').value.split('\n').map((b) => b.trim()).filter(Boolean);
  const spec = {
    headline, accent_word: $('flyerAccentWord').value.trim() || undefined,
    subhead: $('flyerSubhead').value.trim() || undefined,
    bullets: bullets.length ? bullets : undefined,
    badge: $('flyerBadge').value.trim() || undefined,
    footer: $('flyerFooter').value.trim() || undefined,
    accent_color: $('flyerAccentColor').value,
  };
  const btn = $('flyerComposite'); btn.disabled = true; btn.textContent = 'Compositing…';
  $('flyerFinalResult').innerHTML = '<div><span class="spin"></span><div style="margin-top:12px">Laying out the typography…</div></div>';
  note('flyerCompositeNote', '');
  try {
    const res = await fetch('/.netlify/functions/flyer-composite', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ project_id: flyerProjectId, text_spec: spec }),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || 'Failed');
    $('flyerFinalResult').innerHTML = `<div><img src="${d.url}" style="width:100%;border-radius:12px"><div style="margin-top:12px"><button class="btn gold sm" onclick="fuseDownload('${d.url}')">⬇ Download</button></div></div>`;
    note('flyerCompositeNote', '✅ Done — tweak the copy/colors and composite again anytime.', 'ok');
  } catch (e) { $('flyerFinalResult').innerHTML = '<div>⚠ ' + (e.message || 'Failed') + '</div>'; note('flyerCompositeNote', e.message || 'Failed', 'err'); }
  btn.disabled = false; btn.textContent = '🖋 Composite final flyer';
}

// ---------------- Audio Studio (standalone voiceover/narration) ----------------
let adUploadedVoiceUrl = null;
async function loadAudioVoices() {
  if (preview) return;
  const { data } = await sb.from('avatars').select('id,name,voice_sample_url').not('voice_sample_url', 'is', null);
  const sel = $('adVoicePicker');
  if (data && data.length) {
    sel.innerHTML = '<option value="">Use uploaded sample instead…</option>' + data.map((a) => `<option value="${a.voice_sample_url}">${a.name}'s voice</option>`).join('');
    sel.style.display = 'block';
  } else {
    sel.style.display = 'none';
  }
}
async function uploadAudioVoiceSample(file) {
  if (preview) { showAuth('signup'); return; }
  note('adVoiceNote', 'Uploading…', 'ok');
  try {
    const ext = (file.name.split('.').pop() || 'mp3').toLowerCase();
    const path = `${user.id}/adv-${Date.now()}.${ext}`;
    const { error } = await sb.storage.from('avatars').upload(path, file);
    if (error) throw error;
    adUploadedVoiceUrl = sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
    $('adVoicePicker').value = '';
    note('adVoiceNote', '✅ Voice sample ready.', 'ok');
  } catch (e) { note('adVoiceNote', e.message || 'Upload failed.', 'err'); }
}
async function adGenerate() {
  if (preview) { showAuth('signup'); return; }
  const text = $('adScript').value.trim();
  if (!text) return note('adNote', 'Write the script first.', 'err');
  const voiceUrl = $('adVoicePicker').value || adUploadedVoiceUrl;
  if (!voiceUrl) return note('adNote', 'Add a voice sample first.', 'err');
  const btn = $('adGen'); const label = '🎙 Generate voiceover'; btn.disabled = true; btn.textContent = 'Submitting…';
  $('adResult').innerHTML = '<div><span class="spin"></span><div style="margin-top:12px">Generating…</div></div>';
  note('adNote', '');
  try {
    const res = await fetch('/.netlify/functions/audio-generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ text, voice_sample_url: voiceUrl, speed: parseFloat($('adSpeed').value) }),
    });
    const d = await res.json();
    if (res.status === 503) { $('adResult').innerHTML = '<div class="muted">Audio Studio is being connected.</div>'; note('adNote', d.error, 'err'); btn.disabled = false; btn.textContent = label; return; }
    if (res.status === 402) { note('adNote', 'Out of credits — top up.', 'err'); openBuy(); btn.disabled = false; btn.textContent = label; return; }
    if (!res.ok) throw new Error(d.error || 'Failed');
    $('creditCount').textContent = d.credits;
    note('adNote', 'Rendering… ⏳', 'ok'); btn.textContent = 'Rendering…';
    pollAudioJob(d.request_id, btn, label);
  } catch (e) { $('adResult').innerHTML = '<div>⚠ ' + (e.message || 'Failed') + '</div>'; note('adNote', e.message || 'Failed', 'err'); btn.disabled = false; btn.textContent = label; }
}
function pollAudioJob(reqId, btn, label) {
  let s = 0;
  const timer = setInterval(async () => {
    s += 5;
    try {
      const r = await fetch(`/.netlify/functions/job-status?id=${reqId}`, { headers: { ...(await authHeader()) } });
      const d = await r.json();
      if (d.status === 'completed') {
        clearInterval(timer);
        $('adResult').innerHTML = `<div><audio src="${d.url}" controls style="width:100%"></audio><div style="margin-top:12px"><button class="btn gold sm" onclick="fuseDownload('${d.url}')">⬇ Download</button></div></div>`;
        note('adNote', 'Done ✅', 'ok');
        if (user) loadProfile();
        btn.disabled = false; btn.textContent = label;
      } else if (d.status === 'failed') {
        clearInterval(timer);
        $('adResult').innerHTML = '<div>⚠ ' + (d.error || 'Failed') + '</div>';
        note('adNote', (d.error || 'Failed') + ' — credits refunded.', 'err');
        if (user) loadProfile();
        btn.disabled = false; btn.textContent = label;
      }
    } catch (e) {}
    if (s >= 240) { clearInterval(timer); note('adNote', 'Still rendering — check back shortly.', 'err'); btn.disabled = false; btn.textContent = label; }
  }, 5000);
}

// ---------------- Video Editing Studio ----------------
let editProjectId = null;
let editHistory = [];
async function uploadEditVideo(file) {
  if (preview) { showAuth('signup'); return; }
  note('editVideoNote', 'Uploading…', 'ok');
  try {
    const ext = (file.name.split('.').pop() || 'mp4').toLowerCase();
    const path = `${user.id}/editsrc-${Date.now()}.${ext}`;
    const { error } = await sb.storage.from('avatars').upload(path, file);
    if (error) throw error;
    const url = sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
    $('editVideoPreview').src = url; $('editVideoPreview').style.display = 'block';
    note('editVideoNote', 'Transcribing… this can take a moment ⏳', 'ok');
    const res = await fetch('/.netlify/functions/video-transcribe', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ video_url: url }),
    });
    const d = await res.json();
    if (res.status === 402) { note('editVideoNote', 'Out of credits — top up.', 'err'); openBuy(); return; }
    if (!res.ok) throw new Error(d.error || 'Failed');
    if (d.credits != null) $('creditCount').textContent = d.credits;
    editProjectId = d.project_id;
    editHistory = [];
    $('editLog').innerHTML = '';
    pollEditTranscribe(d.request_id);
  } catch (e) { note('editVideoNote', e.message || 'Upload failed.', 'err'); }
}
function pollEditTranscribe(reqId) {
  let s = 0;
  const timer = setInterval(async () => {
    s += 5;
    try {
      const r = await fetch(`/.netlify/functions/job-status?id=${reqId}`, { headers: { ...(await authHeader()) } });
      const d = await r.json();
      if (d.status === 'completed') {
        clearInterval(timer);
        note('editVideoNote', '✅ Transcribed — describe the edit below.', 'ok');
        $('editBriefPanel').style.display = 'block';
      } else if (d.status === 'failed') {
        clearInterval(timer);
        note('editVideoNote', (d.error || 'Failed') + ' — credits refunded.', 'err');
      }
    } catch (e) {}
    if (s >= 300) { clearInterval(timer); note('editVideoNote', 'Still working — check back shortly.', 'err'); }
  }, 5000);
}
function editAppendLog(role, text) {
  const log = $('editLog');
  const bubble = document.createElement('div');
  bubble.style.cssText = role === 'user'
    ? 'align-self:flex-end;background:var(--gold);color:#1a1200;padding:10px 14px;border-radius:14px 14px 2px 14px;max-width:85%;white-space:pre-wrap;font-size:14px'
    : 'align-self:flex-start;background:var(--card);border:1px solid var(--line);padding:10px 14px;border-radius:14px 14px 14px 2px;max-width:85%;white-space:pre-wrap;font-size:14px';
  bubble.textContent = text;
  log.appendChild(bubble);
  log.scrollTop = log.scrollHeight;
}
async function editSend() {
  if (preview) { showAuth('signup'); return; }
  if (!editProjectId) return note('editNote', 'Upload a video first.', 'err');
  const msg = $('editMsg').value.trim();
  if (!msg) return;
  editAppendLog('user', msg);
  $('editMsg').value = '';
  const btn = $('editSend'); btn.disabled = true; btn.textContent = 'Thinking…';
  note('editNote', '');
  try {
    const res = await fetch('/.netlify/functions/video-edit-brief', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ message: msg, history: editHistory, project_id: editProjectId }),
    });
    const d = await res.json();
    if (res.status === 402) { note('editNote', 'Out of credits — top up.', 'err'); openBuy(); btn.disabled = false; btn.textContent = 'Send'; return; }
    if (!res.ok) throw new Error(d.error || 'Failed');
    if (d.credits != null) $('creditCount').textContent = d.credits;
    editHistory.push({ role: 'user', text: msg });
    let s = 0;
    const timer = setInterval(async () => {
      s += 4;
      try {
        const r = await fetch(`/.netlify/functions/job-status?id=${d.request_id}`, { headers: { ...(await authHeader()) } });
        const jd = await r.json();
        if (jd.status === 'completed') {
          clearInterval(timer);
          let parsed; try { parsed = JSON.parse(jd.text); } catch (e) { parsed = { reply: jd.text }; }
          editHistory.push({ role: 'assistant', text: parsed.reply || jd.text });
          editAppendLog('assistant', parsed.reply || jd.text);
          if (parsed.broll_suggestions && parsed.broll_suggestions.length) editAppendLog('assistant', '💡 B-roll ideas: ' + parsed.broll_suggestions.join('  ·  '));
          if (parsed.notes) editAppendLog('assistant', '📝 ' + parsed.notes);
          if (parsed.caption_style && parsed.caption_style.accent_color) { $('editAccentColor').value = parsed.caption_style.accent_color; $('editCaptionPanel').style.display = 'block'; }
          if (parsed.caption_style && parsed.caption_style.position) $('editCaptionPos').value = parsed.caption_style.position;
          if (parsed.cta_text) $('editCtaText').value = parsed.cta_text;
          $('editCaptionPanel').style.display = 'block';
          btn.disabled = false; btn.textContent = 'Send';
        } else if (jd.status === 'failed') {
          clearInterval(timer);
          note('editNote', (jd.error || 'Failed') + ' — credits refunded.', 'err');
          btn.disabled = false; btn.textContent = 'Send';
        }
      } catch (e) {}
      if (s >= 180) { clearInterval(timer); note('editNote', 'Still thinking — try again shortly.', 'err'); btn.disabled = false; btn.textContent = 'Send'; }
    }, 4000);
  } catch (e) { note('editNote', e.message || 'Failed', 'err'); btn.disabled = false; btn.textContent = 'Send'; }
}
async function editApplyCaptions() {
  if (!editProjectId) return;
  const btn = $('editApplyCaptions'); btn.disabled = true; btn.textContent = 'Burning in…';
  $('editResult').innerHTML = '<div><span class="spin"></span><div style="margin-top:12px">Applying captions…</div></div>';
  note('editCaptionNote', '');
  try {
    const res = await fetch('/.netlify/functions/video-caption-apply', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ project_id: editProjectId, accent_color: $('editAccentColor').value, position: $('editCaptionPos').value }),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || 'Failed');
    $('editResult').innerHTML = `<video src="${d.url}" controls style="width:100%;border-radius:12px"></video>`;
    note('editCaptionNote', '✅ Captions applied.', 'ok');
    $('editElementPanel').style.display = 'block';
    $('editCtaPanel').style.display = 'block';
  } catch (e) { note('editCaptionNote', e.message || 'Failed', 'err'); }
  btn.disabled = false; btn.textContent = '💬 Burn in captions';
}
let editElementFile = null;
async function editAddElement() {
  if (!editProjectId) return;
  if (!editElementFile) return note('editElementNote', 'Pick an image first.', 'err');
  const btn = $('editAddElement'); btn.disabled = true; btn.textContent = 'Adding…';
  note('editElementNote', 'Uploading…', 'ok');
  try {
    const ext = (editElementFile.name.split('.').pop() || 'png').toLowerCase();
    const path = `${user.id}/editel-${Date.now()}.${ext}`;
    const { error } = await sb.storage.from('avatars').upload(path, editElementFile);
    if (error) throw error;
    const imgUrl = sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
    note('editElementNote', 'Compositing…', 'ok');
    const res = await fetch('/.netlify/functions/video-element', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ project_id: editProjectId, image_url: imgUrl, start_sec: parseFloat($('editElStart').value), duration_sec: parseFloat($('editElDur').value), position: $('editElPos').value }),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || 'Failed');
    $('editResult').innerHTML = `<video src="${d.url}" controls style="width:100%;border-radius:12px"></video>`;
    note('editElementNote', '✅ Element added.', 'ok');
  } catch (e) { note('editElementNote', e.message || 'Failed', 'err'); }
  btn.disabled = false; btn.textContent = '➕ Add element';
}
async function editApplyCta() {
  if (!editProjectId) return;
  const ctaText = $('editCtaText').value.trim();
  if (!ctaText) return note('editCtaNote', 'Write the CTA text first.', 'err');
  const btn = $('editApplyCta'); btn.disabled = true; btn.textContent = 'Finishing…';
  note('editCtaNote', '');
  try {
    const res = await fetch('/.netlify/functions/video-cta', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ project_id: editProjectId, cta_text: ctaText, accent_color: $('editAccentColor').value }),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || 'Failed');
    $('editResult').innerHTML = `<div><video src="${d.url}" controls autoplay loop muted playsinline style="width:100%;border-radius:12px"></video><div style="margin-top:12px"><button class="btn gold sm" onclick="fuseDownload('${d.url}')">⬇ Download</button></div></div>`;
    note('editCtaNote', '✅ Done — post-ready.', 'ok');
  } catch (e) { note('editCtaNote', e.message || 'Failed', 'err'); }
  btn.disabled = false; btn.textContent = '📣 Add CTA — finish';
}

// ---------------- prompt generator (charged, 1 credit) ----------------
function buildPromptFields() {
  if ($('pgFields').children.length) return;
  $('pgFields').innerHTML = cfg.PROMPT_ORDER.map((k) => {
    const f = cfg.PROMPT_LIB[k];
    const opts = f.opts.map((o, i) => `<option value="${i}">${o[0]}</option>`).join('');
    return `<select data-k="${k}"><option value="">${f.label}…</option>${opts}</select>`;
  }).join('');
}
async function pgGenerate() {
  if (preview) { showAuth('signup'); return; }
  const fields = {};
  $('pgFields').querySelectorAll('select').forEach((s) => { if (s.value !== '') fields[s.dataset.k] = cfg.PROMPT_LIB[s.dataset.k].opts[+s.value][1]; });
  const btn = $('pgGen'); btn.disabled = true; btn.textContent = 'Writing…';
  try {
    const res = await fetch('/.netlify/functions/prompt-gen', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ subject: $('pgSubject').value.trim(), extra: $('pgExtra').value.trim(), fields }),
    });
    const d = await res.json();
    if (res.status === 402) { note('pgNote', 'Out of credits — top up.', 'err'); openBuy(); }
    else if (!res.ok) throw new Error(d.error || 'Failed');
    else { $('pgResult').value = d.prompt; if (d.credits != null) $('creditCount').textContent = d.credits; note('pgNote', '✨ Prompt ready — edit it or use it below.', 'ok'); loadPromptHistory(); }
  } catch (e) { note('pgNote', e.message || 'Failed', 'err'); }
  btn.disabled = false; btn.textContent = '✨ Generate prompt (1 credit)';
}
async function loadPromptHistory() {
  const wrap = $('pgHistory'); if (!wrap) return;
  if (preview) { wrap.innerHTML = '<div class="muted" style="font-size:13px">Sign up to save your prompt history.</div>'; return; }
  const { data } = await sb.from('prompt_history').select('prompt, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20);
  if (!data || !data.length) { wrap.innerHTML = '<div class="muted" style="font-size:13px">Prompts you generate will be saved here.</div>'; return; }
  wrap.innerHTML = data.map((h) => {
    const safe = (h.prompt || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    return `<div class="ph-item"><p>${safe}</p>
      <div class="ph-actions">
        <button class="btn ghost sm" onclick="window.fusePhUse(this.dataset.p)" data-p="${safe}">↺ Use</button>
        <button class="btn ghost sm" onclick="navigator.clipboard.writeText(this.dataset.p);this.textContent='Copied!'" data-p="${safe}">⧉ Copy</button>
      </div></div>`;
  }).join('');
}
window.fusePhUse = (p) => { $('pgResult').value = p; note('pgNote', 'Loaded from history — tap “Use this prompt” below.', 'ok'); $('pgResult').scrollIntoView({ behavior: 'smooth' }); };
function pgUse() {
  const p = $('pgResult').value.trim();
  if (!p) return note('pgNote', 'Generate a prompt first.', 'err');
  openStudio('generate');
  $('prompt').value = p;
}

// ---------------- marketplace ----------------
async function loadMarket() {
  $('mpPrompt').value = lastPrompt || '';
  if (lastOutput) { $('mpHasMedia').textContent = '🖼 Your last creation will be attached as the preview.'; }
  else { $('mpHasMedia').textContent = 'Generate something first to attach it as the preview.'; }
  const { data } = await sb.from('marketplace_presets').select('id,title,uses,output_url,kind,price_credits').eq('active', true).order('uses', { ascending: false }).limit(40);
  $('mpList').innerHTML = (data && data.length) ? data.map((p) => {
    const media = p.output_url
      ? (p.kind === 'video' ? `<video src="${p.output_url}" muted loop playsinline></video>` : `<img src="${p.output_url}">`)
      : '🎨';
    return `<div class="mp"><div class="msample" style="width:64px;height:64px;border-radius:10px;flex:0 0 auto;overflow:hidden">${media}</div>
      <div style="flex:1"><div class="mt">${p.title}</div><div class="mu">🔥 ${p.uses} sold</div></div>
      <button class="btn gold sm" data-id="${p.id}">Buy · ${p.price_credits} cr</button></div>`;
  }).join('') : '<div class="empty">No presets yet — be the first to publish one ✨</div>';
  $('mpList').querySelectorAll('button').forEach((b) => b.onclick = () => buyPreset(b.dataset.id, b));
}
async function publishPreset() {
  if (preview) { showAuth('signup'); return; }
  const title = $('mpTitle').value.trim(), prompt = $('mpPrompt').value.trim();
  const price = Math.max(2, parseInt($('mpPrice').value, 10) || 10);
  if (!title || !prompt) return note('mpNote', 'Add a title and a prompt.', 'err');

  // Use the uploaded preview if provided, else the last creation.
  let mediaUrl = lastOutput || null, kind = 'image';
  const file = $('mpFile').files[0];
  if (file) {
    note('mpNote', 'Uploading preview…', 'ok');
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${user.id}/mp-${Date.now()}.${ext}`;
      const { error: upErr } = await sb.storage.from('avatars').upload(path, file);
      if (upErr) throw upErr;
      mediaUrl = sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
      kind = file.type.startsWith('video') ? 'video' : 'image';
    } catch (e) { return note('mpNote', e.message || 'Upload failed.', 'err'); }
  } else if (lastOutput) {
    kind = /\.(mp4|webm|mov)(\?|$)/i.test(lastOutput) ? 'video' : 'image';
  }
  if (!mediaUrl) return note('mpNote', 'Add a preview image/video so buyers can see it.', 'err');

  const { error } = await sb.from('marketplace_presets').insert({
    owner_id: user.id, title, prompt, price_credits: price, output_url: mediaUrl, kind,
  });
  note('mpNote', error ? error.message : `✅ Published at ${price} credits! You earn ${Math.floor(price / 2)} credits per sale.`, error ? 'err' : 'ok');
  if (!error) { $('mpTitle').value = ''; $('mpFile').value = ''; loadMarket(); }
}
async function buyPreset(id, btn) {
  if (preview) { showAuth('signup'); return; }
  if (btn) { btn.disabled = true; btn.textContent = 'Buying…'; }
  try {
    const res = await fetch('/.netlify/functions/buy-preset', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) }, body: JSON.stringify({ id }),
    });
    const d = await res.json();
    if (res.status === 402) { note('mpNote', 'Not enough credits — top up.', 'err'); openBuy(); }
    else if (!res.ok) throw new Error(d.error || 'Failed');
    else {
      if (d.credits != null) $('creditCount').textContent = d.credits;
      note('mpNote', d.owned ? '✅ You own this — loading it…' : '✅ Purchased! Loading it into the studio…', 'ok');
      openStudio('generate');
      $('prompt').value = d.prompt || '';
      if (d.model) buildModelSelect(), $('model').value = d.model;
      if (d.aspect) $('aspect').value = d.aspect;
    }
  } catch (e) { note('mpNote', e.message || 'Failed', 'err'); }
  if (btn) { btn.disabled = false; btn.textContent = 'Buy'; }
}

// ---------------- academy (earn while you learn) ----------------
function buildLessons() {
  const note0 = cfg.LESSONS_NOTE ? `<p class="muted" style="font-size:13px;margin:0 0 12px">${cfg.LESSONS_NOTE}</p>` : '';
  $('lessonList').innerHTML = note0 + cfg.LESSONS.map((l, i) =>
    `<div class="lesson"><h3>${i + 1}. ${l.t}</h3><p>${l.b}</p></div>`).join('');
  note('learnNote', '');
}
async function claimLearn() {
  if (preview) { showAuth('signup'); return; }
  $('learnClaim').disabled = true;
  try {
    const res = await fetch('/.netlify/functions/claim-learn-bonus', { method: 'POST', headers: { ...(await authHeader()) } });
    const d = await res.json();
    if (d.claimed) { $('creditCount').textContent = d.credits; note('learnNote', `🎉 +${cfg.LEARN_BONUS} credits! You're ready to earn.`, 'ok'); }
    else note('learnNote', 'You already claimed your learning bonus 💛', 'ok');
  } catch (e) { note('learnNote', 'Could not claim — try again.', 'err'); }
  $('learnClaim').disabled = false;
}

// ---------------- link WhatsApp ----------------
async function linkWhatsapp() {
  if (preview) { showAuth('signup'); return; }
  const phone = $('waPhone').value.trim();
  try {
    const res = await fetch('/.netlify/functions/link-whatsapp', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) }, body: JSON.stringify({ phone }) });
    const d = await res.json();
    note('waNote', res.ok ? '✅ Linked! Text our WhatsApp bot a prompt to generate.' : d.error, res.ok ? 'ok' : 'err');
  } catch (e) { note('waNote', 'Could not link.', 'err'); }
}

// ---------------- promo popup ----------------
function maybePromo() {
  if (sessionStorage.getItem('fuse_promo_seen')) return;
  setTimeout(() => {
    const pr = cfg.PROMO;
    $('promoTitle').textContent = pr.title; $('promoBody').textContent = pr.body;
    startCountdown('promoCountdown', pr.hours);
    $('promoOverlay').style.display = 'grid';
    sessionStorage.setItem('fuse_promo_seen', '1');
  }, 9000);
}

// ---------------- onboarding quiz (short, before signup) ----------------
const QUIZ = [
  { title: 'What do you want to create?', sub: "We'll tailor your studio.",
    options: [
      { i: '🎯', t: 'Brand & product visuals', v: 'brand' },
      { i: '🎬', t: 'UGC & ad content', v: 'ugc' },
      { i: '🧑‍🎨', t: 'A consistent avatar of me', v: 'avatar' },
      { i: '🎥', t: 'Movie / cinematic scenes', v: 'movie' },
    ] },
  { title: 'What frustrates you most about AI tools?', sub: 'Fuse fixes these.',
    options: [
      { i: '😵', t: 'Inconsistent faces', v: 'consistency' },
      { i: '✍️', t: 'Prompting is too hard', v: 'prompting' },
      { i: '💸', t: 'Too expensive', v: 'cost' },
      { i: '🐌', t: 'Too slow', v: 'speed' },
    ] },
];
let quizStep = 0; const quizAns = [];
function showQuiz() { quizStep = 0; renderQuiz(); $('quizOverlay').style.display = 'grid'; }
function renderQuiz() {
  const q = QUIZ[quizStep];
  $('qTitle').textContent = q.title; $('qSub').textContent = q.sub;
  $('qProg').innerHTML = QUIZ.map((_, i) => `<i class="${i <= quizStep ? 'on' : ''}"></i>`).join('');
  $('qOptions').innerHTML = q.options.map((o) =>
    `<div class="quizopt" data-v="${o.v}"><span><span class="qi">${o.i}</span> ${o.t}</span><span class="dot"></span></div>`).join('');
  $('qOptions').querySelectorAll('.quizopt').forEach((el) => el.onclick = () => {
    quizAns[quizStep] = el.dataset.v;
    el.classList.add('sel');
    setTimeout(nextQuiz, 220);
  });
}
function nextQuiz() {
  if (quizStep < QUIZ.length - 1) { quizStep++; renderQuiz(); return; }
  localStorage.setItem('fuse_quiz', JSON.stringify(quizAns));
  $('quizOverlay').style.display = 'none';
  showAuth('signup');
}
function skipQuiz() { localStorage.setItem('fuse_quiz', 'skip'); $('quizOverlay').style.display = 'none'; showAuth('signup'); }

// ---------------- avatar prompt generator (charged, 1 credit) ----------------
async function buildAvatarPrompt() {
  if (preview) { showAuth('signup'); return; }
  const btn = $('bBuild'); btn.disabled = true; btn.textContent = 'Writing…';
  try {
    const res = await fetch('/.netlify/functions/prompt-gen', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ subject: ($('avSelName').textContent || 'my avatar'), fields: { setting: $('bSetting').value, outfit: $('bOutfit').value, lighting: $('bLight').value, shot: $('bShot').value } }),
    });
    const d = await res.json();
    if (res.status === 402) { note('avGenNote', 'Out of credits — top up.', 'err'); openBuy(); }
    else if (!res.ok) throw new Error(d.error || 'Failed');
    else { $('avPrompt').value = d.prompt; if (d.credits != null) $('creditCount').textContent = d.credits; note('avGenNote', '✨ Prompt ready', 'ok'); }
  } catch (e) { note('avGenNote', e.message || 'Failed', 'err'); }
  btn.disabled = false; btn.textContent = 'Write my prompt ✍️ (1 cr)';
}

// ---------------- image reference upload (main generator, multi) ----------------
async function pickReferences(files) {
  if (preview) { showAuth('signup'); return; }
  if (!files || !files.length) return;
  note('genNote', 'Uploading reference(s)…', 'ok');
  try {
    for (const file of Array.from(files)) {
      if (refUrls.length >= 5) break;
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${user.id}/ref-${Date.now()}-${refUrls.length}.${ext}`;
      const { error } = await sb.storage.from('avatars').upload(path, file);
      if (error) throw error;
      refUrls.push(sb.storage.from('avatars').getPublicUrl(path).data.publicUrl);
    }
    renderRefThumbs();
    note('genNote', `✅ ${refUrls.length} reference${refUrls.length > 1 ? 's' : ''} attached — they'll guide your generation.`, 'ok');
  } catch (e) { note('genNote', e.message || 'Upload failed.', 'err'); }
}
function renderRefThumbs() {
  $('refThumbs').innerHTML = refUrls.map((u) => `<img src="${u}" class="refthumb">`).join('');
  $('refPreview').style.display = refUrls.length ? 'flex' : 'none';
  $('refBtn').style.display = refUrls.length >= 5 ? 'none' : 'flex';
}
function removeReference() { refUrls = []; renderRefThumbs(); $('refFile').value = ''; }

// ---------------- utility tools (upscale / bg-remove / object-erase) ----------------
let toolSlug = null, toolImg = '';
function openTool(slug) {
  const t = cfg.TOOL_MODELS.find((x) => x.slug === slug) || cfg.TOOL_MODELS[0];
  toolSlug = t.slug;
  $('toolName').textContent = t.name + ' · ' + t.credits + ' cr';
  $('toolDesc').textContent = t.badge;
  $('toolPrompt').style.display = slug === 'ai-object-eraser' ? 'block' : 'none';
  toolImg = ''; $('toolPreview').style.display = 'none'; $('toolPick').style.display = 'flex';
  $('toolResult').innerHTML = '<div class="muted">Result appears here.</div>';
  note('toolNote', '');
  showView('tool');
}
async function pickToolImage(file) {
  if (preview) { showAuth('signup'); return; }
  if (!file) return;
  note('toolNote', 'Uploading…', 'ok');
  try {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${user.id}/tool-${Date.now()}.${ext}`;
    const { error } = await sb.storage.from('avatars').upload(path, file);
    if (error) throw error;
    toolImg = sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
    $('toolThumb').src = toolImg; $('toolPreview').style.display = 'flex'; $('toolPick').style.display = 'none';
    note('toolNote', '✅ Image ready.', 'ok');
  } catch (e) { note('toolNote', e.message || 'Upload failed.', 'err'); }
}
async function runTool() {
  if (preview) { showAuth('signup'); return; }
  if (!toolImg) return note('toolNote', 'Upload an image first.', 'err');
  const btn = $('toolRun'); const label = 'Run tool'; btn.disabled = true; btn.textContent = 'Submitting…';
  $('toolResult').innerHTML = '<div><span class="spin"></span><div style="margin-top:12px">Processing…</div></div>';
  try {
    const res = await fetch('/.netlify/functions/tool-generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ slug: toolSlug, image_url: toolImg, prompt: $('toolPrompt').value.trim() || undefined }),
    });
    const data = await res.json();
    if (res.status === 402) { note('toolNote', 'Out of credits — top up.', 'err'); openBuy(); btn.disabled = false; btn.textContent = label; }
    else if (!res.ok) throw new Error(data.error || 'Failed');
    else {
      $('creditCount').textContent = data.credits;
      note('toolNote', 'Processing… ⏳', 'ok'); btn.textContent = 'Processing…';
      pollJob(data.request_id, $('toolResult'), 'toolNote', btn, label, 'image');
    }
  } catch (e) { $('toolResult').innerHTML = '<div>⚠ ' + (e.message || 'Failed') + '</div>'; note('toolNote', e.message || 'Failed — credits not charged.', 'err'); btn.disabled = false; btn.textContent = label; }
}

// ---------------- auth ----------------
let authMode = 'signup';
function showAuth(mode) { setAuthMode(mode || 'signup'); $('authOverlay').style.display = 'grid'; }
function hideAuth() { $('authOverlay').style.display = 'none'; }
function setAuthMode(m) {
  authMode = m;
  $('authTitle').textContent = m === 'signup' ? 'Create your account' : 'Welcome back';
  $('authBtn').textContent = m === 'signup' ? 'Start free →' : 'Log in →';
  $('authSwitchText').textContent = m === 'signup' ? 'Already have an account?' : 'New here?';
  $('authSwitchLink').textContent = m === 'signup' ? 'Log in' : 'Create one';
  $('authTrial').style.display = m === 'signup' ? 'block' : 'none';
  note('authNote', '');
}
async function doAuth() {
  const email = $('authEmail').value.trim(), pass = $('authPass').value;
  if (!email || !pass) return note('authNote', 'Enter email and password.', 'err');
  $('authBtn').disabled = true;
  try {
    if (authMode === 'signup') {
      const { error } = await sb.auth.signUp({ email, password: pass });
      if (error) throw error;
      const { data } = await sb.auth.getSession();
      // No session yet (email confirmation required) — the referral code stays
      // in localStorage and gets claimed the moment they actually log in below.
      if (!data.session) { note('authNote', '✅ Account created — check your email to confirm, then log in.', 'ok'); setAuthMode('login'); $('authBtn').disabled = false; return; }
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
    }
    await claimReferral();
    await boot();
    // If they arrived from the sales page with ?buy=<pack>, continue straight
    // into checkout after signup/login instead of dropping them on the home view.
    const pendingBuy = new URLSearchParams(location.search).get('buy');
    if (pendingBuy && (cfg.PACKS.some((p) => p.key === pendingBuy) || pendingBuy === 'course')) setTimeout(() => buy(pendingBuy), 800);
  } catch (e) { note('authNote', e.message || 'Something went wrong.', 'err'); }
  $('authBtn').disabled = false;
}
async function claimReferral() {
  const code = localStorage.getItem('fuse_ref'); if (!code) return;
  try { await fetch('/.netlify/functions/claim-referral', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) }, body: JSON.stringify({ code }) }); localStorage.removeItem('fuse_ref'); } catch (e) {}
}
async function logout() { await sb.auth.signOut(); location.reload(); }

// ---------------- preview mode ----------------
function enterPreview() {
  const code = prompt0('Enter preview password:');
  if (code === null) return;
  if (code.trim() !== cfg.PREVIEW_CODE) { note('authNote', 'Wrong password.', 'err'); return; }
  preview = true; hideAuth(); $('previewRibbon').style.display = 'block';
  $('creditCount').textContent = '∞'; $('planBadge').textContent = 'Preview';
  buildHome();
}
function prompt0(m) { return window.prompt(m); }

// ---------------- boot ----------------
async function boot() {
  const { data } = await sb.auth.getSession();
  user = data.session ? data.session.user : null;
  if (!user) { if (localStorage.getItem('fuse_quiz')) showAuth('signup'); else showQuiz(); return; }
  hideAuth(); preview = false; $('previewRibbon').style.display = 'none';
  buildHome();
  await loadProfile();

  await claimReferral();
  // Restore the view you were on before a refresh, and re-attach any in-progress render.
  restoreRoute();
  resumePending();
  maybePromo();
  // Came from the Atelier page "Get instant access" -> start the course purchase.
  // Deep-link checkout: /studio?buy=<pack> opens the buy flow for that pack
  // (used by the Atelier sales page tier buttons — course, atelier_starter, …).
  const qBuy = new URLSearchParams(location.search).get('buy');
  if (qBuy && (cfg.PACKS.some((p) => p.key === qBuy) || qBuy === 'course')) setTimeout(() => buy(qBuy), 600);
  // Came from an external link (e.g. Selar's post-purchase redirect) with ?view=week —
  // open straight to that view. wkcode (if present) is picked up inside openWeek().
  const qView = new URLSearchParams(location.search).get('view');
  if (qView === 'week') setTimeout(() => routeFeature('week'), 400);
  // Same pattern for the ₦1,000 Mini Masterclasses: .../?view=mini&mkey=avatar&code=AVATAR1K
  if (qView === 'mini') setTimeout(() => { openMiniHub(); maybeAutoRedeemMini(); }, 400);
}

// ---------------- wire up ----------------
window.addEventListener('DOMContentLoaded', () => {
  // capture referral code from URL (?ref=)
  const ref = new URLSearchParams(location.search).get('ref');
  if (ref) localStorage.setItem('fuse_ref', ref);

  document.querySelectorAll('.tab').forEach((t) => t.onclick = () => {
    if (t.dataset.studio) openStudio(t.dataset.studio); else showView(t.dataset.view);
  });
  $('studioBack').onclick = () => showView('home');
  $('reactorBack').onclick = () => showView('models');
  $('presetBack').onclick = () => showView('home');
  $('courseBack').onclick = () => showView('home');
  $('lessonBack').onclick = () => openCourse();
  { const wb = $('weekBack'); if (wb) wb.onclick = () => showView('home'); }
  { const mb = $('miniBack'); if (mb) mb.onclick = () => showView('home'); }
  { const mlb = $('miniLessonBack'); if (mlb) mlb.onclick = () => openMiniHub(); }
  { const acb = $('allCoursesBack'); if (acb) acb.onclick = () => showView('home'); }
  $('marketBack').onclick = () => showView('home');
  $('learnBack').onclick = () => showView('home');
  $('avatarBack').onclick = () => showView('home');
  $('pgBack').onclick = () => showView('home');
  $('pgGen').onclick = pgGenerate;
  $('pgCopy').onclick = () => { const t = $('pgResult').value.trim(); if (!t) return note('pgNote', 'Generate a prompt first.', 'err'); navigator.clipboard.writeText(t); $('pgCopy').textContent = '✓ Copied!'; setTimeout(() => $('pgCopy').textContent = '⧉ Copy prompt', 1500); };
  $('pgUse').onclick = pgUse;
  $('avCreate').onclick = createAvatar;
  $('avPick').onclick = () => $('avFile').click();
  $('avFile').onchange = (e) => { addTrainFiles(e.target.files); e.target.value = ''; };
  $('avGen').onclick = avatarGenerate;
  $('avSheetBtn').onclick = generateModelSheet;
  $('avRefBtn').onclick = () => $('avRefFile').click();
  $('avRefFile').onchange = (e) => pickAvatarRefs(Array.from(e.target.files).slice(0, 3));
  $('bBuild').onclick = buildAvatarPrompt;
  $('avVoicePick').onclick = () => $('avVoiceFile').click();
  $('avVoiceFile').onchange = (e) => { const f = e.target.files[0]; if (f) uploadAvatarVoice(f); e.target.value = ''; };
  $('avFaceVideoPick').onclick = () => $('avFaceVideoFile').click();
  $('avFaceVideoFile').onchange = (e) => { const f = e.target.files[0]; if (f) uploadAvatarTrainingVideo(f); e.target.value = ''; };
  $('avvGen').onclick = avvGenerate;
  $('avvMode').onchange = avvToggleMode;
  $('avOwnAudioPick').onclick = () => $('avOwnAudioFile').click();
  $('avOwnAudioFile').onchange = (e) => { const f = e.target.files[0]; if (f) uploadAvatarOwnAudio(f); e.target.value = ''; };
  $('avvAddCta').onclick = avvAddCta;
  $('audioBack').onclick = () => showView('home');
  $('adVoicePick').onclick = () => $('adVoiceFile').click();
  $('adVoiceFile').onchange = (e) => { const f = e.target.files[0]; if (f) uploadAudioVoiceSample(f); e.target.value = ''; };
  $('adGen').onclick = adGenerate;
  $('editBack').onclick = () => showView('home');
  $('editVideoPick').onclick = () => $('editVideoFile').click();
  $('editVideoFile').onchange = (e) => { const f = e.target.files[0]; if (f) uploadEditVideo(f); e.target.value = ''; };
  $('editSend').onclick = editSend;
  $('editMsg').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); editSend(); } });
  $('editApplyCaptions').onclick = editApplyCaptions;
  $('editElementPick').onclick = () => $('editElementFile').click();
  $('editElementFile').onchange = (e) => { editElementFile = e.target.files[0] || null; note('editElementNote', editElementFile ? `Selected: ${editElementFile.name}` : '', 'ok'); };
  $('editAddElement').onclick = editAddElement;
  $('editApplyCta').onclick = editApplyCta;
  $('flyerBack').onclick = () => showView('home');
  $('flyerRefPick').onclick = () => $('flyerRefFile').click();
  $('flyerRefFile').onchange = (e) => { flyerPickRefs(Array.from(e.target.files)); e.target.value = ''; };
  $('flyerSend').onclick = flyerSend;
  $('flyerMsg').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); flyerSend(); } });
  $('flyerGenHero').onclick = flyerGenHero;
  $('flyerAddLayer').onclick = flyerAddLayer;
  $('flyerComposite').onclick = flyerComposite;
  // Omni Studio
  { const ob = $('omniBack'); if (ob) ob.onclick = () => showView('home'); }
  document.querySelectorAll('[data-omni]').forEach((b) => b.onclick = () => omniSwitch(b.dataset.omni));
  { const p = $('omniEditPick'); if (p) p.onclick = () => $('omniEditFile').click(); }
  { const f = $('omniEditFile'); if (f) f.onchange = (e) => { omniEditPickClips(e.target.files); e.target.value = ''; }; }
  { const p = $('omniEditAudioPick'); if (p) p.onclick = () => $('omniEditAudioFile').click(); }
  { const f = $('omniEditAudioFile'); if (f) f.onchange = (e) => { omniEditPickAudio(e.target.files); e.target.value = ''; }; }
  { const g = $('omniEditGen'); if (g) g.onclick = omniEditGenerate; }
  { const p = $('omniRefImgPick'); if (p) p.onclick = () => $('omniRefImgFile').click(); }
  { const f = $('omniRefImgFile'); if (f) f.onchange = (e) => { omniRefPickImages(e.target.files); e.target.value = ''; }; }
  { const p = $('omniRefAudioPick'); if (p) p.onclick = () => $('omniRefAudioFile').click(); }
  { const f = $('omniRefAudioFile'); if (f) f.onchange = (e) => { omniRefPickAudios(e.target.files); e.target.value = ''; }; }
  { const g = $('omniRefGen'); if (g) g.onclick = omniRefGenerate; }
  { const p = $('omniAvatarImgPick'); if (p) p.onclick = () => $('omniAvatarImgFile').click(); }
  { const f = $('omniAvatarImgFile'); if (f) f.onchange = (e) => { omniAvatarPickImg(e.target.files); e.target.value = ''; }; }
  { const p = $('omniAvatarAudioPick'); if (p) p.onclick = () => $('omniAvatarAudioFile').click(); }
  { const f = $('omniAvatarAudioFile'); if (f) f.onchange = (e) => { omniAvatarPickAudio(e.target.files); e.target.value = ''; }; }
  { const g = $('omniAvatarGen'); if (g) g.onclick = omniAvatarGenerate; }
  $('qSkip').onclick = skipQuiz;
  $('refBtn').onclick = () => $('refFile').click();
  $('refFile').onchange = (e) => pickReferences(e.target.files);
  $('refRemove').onclick = removeReference;
  $('smImg').onclick = () => setStudioMode(false);
  $('smVid').onclick = () => setStudioMode(true);
  $('toolBack').onclick = () => showView('models');
  $('toolPick').onclick = () => $('toolFile').click();
  $('toolFile').onchange = (e) => pickToolImage(e.target.files[0]);
  $('toolRun').onclick = runTool;
  // model gallery + video studio
  document.querySelectorAll('#view-models .mtab').forEach((t) => t.onclick = () => buildModels(t.dataset.kind));
  $('modelSearch').oninput = () => buildModels(modelKind);
  $('videoBack').onclick = () => showView('models');
  $('vGen').onclick = videoGenerate;
  $('vRefBtn').onclick = () => $('vRefFile').click();
  $('vRefFile').onchange = (e) => pickVideoRef(e.target.files[0]);
  $('vRefRemove').onclick = () => { vRefUrl = ''; $('vRefPreview').style.display = 'none'; $('vRefBtn').style.display = 'flex'; $('vRefFile').value = ''; };
  $('vMoreRefBtn').onclick = () => $('vMoreRefFile').click();
  $('vMoreRefFile').onchange = (e) => { pickVideoMoreRefs(Array.from(e.target.files)); e.target.value = ''; };
  buildModelSelect();
  $('streakBtn').onclick = claimDaily;
  // Header icons + account menu
  $('searchBtn').onclick = () => { showView('models'); setTimeout(() => { const s = $('modelSearch'); if (s) s.focus(); }, 50); };
  $('menuBtn').onclick = openMenu;
  $('menuOverlay').onclick = (e) => { if (e.target === $('menuOverlay')) closeMenu(); };
  $('menuTopup').onclick = () => { closeMenu(); openBuy(); };
  $('menuStreak').onclick = () => { closeMenu(); claimDaily(); };
  $('menuCourses').onclick = () => { closeMenu(); openAllCourses(); };
  document.querySelectorAll('.subnav-tab').forEach((t) => t.onclick = () => {
    const go = t.dataset.go;
    if (go === 'tab-image') { showView('models'); buildModels('image'); }
    else if (go === 'tab-video') { showView('models'); buildModels('video'); }
    else if (go === 'tab-audio') { openStudio('audio'); }
    else if (go === 'tab-reactor') { openStudio('reactor'); }
    else if (go === 'tab-courses') { openAllCourses(); }
    else { showView('home'); }
    syncSubnav(go);
  });
  $('menuProfile').onclick = () => { closeMenu(); showView('profile'); };
  $('menuProjects').onclick = () => { closeMenu(); showView('library'); };
  $('menuCommunity').onclick = () => { closeMenu(); showView('community'); };
  $('menuLogout').onclick = () => { closeMenu(); logout(); };
  $('shareGen').onclick = () => openStudio('market');
  $('mpPublish').onclick = publishPreset;
  $('learnClaim').onclick = claimLearn;
  $('learnCourse').onclick = () => { location.href = '/atelier'; };
  document.querySelectorAll('#libTabs .mtab').forEach((t) => t.onclick = () => {
    libFilter = t.dataset.t;
    document.querySelectorAll('#libTabs .mtab').forEach((x) => x.classList.toggle('active', x === t));
    loadLibrary();
  });
  $('genBtn').onclick = generate;
  $('rcSend').onclick = reactorSend;
  { const ab = $('rcAttachBtn'), rf = $('rcFile');
    if (ab && rf) { ab.onclick = () => rf.click(); rf.onchange = (e) => { rcAttach(Array.from(e.target.files || [])); e.target.value = ''; }; } }
  { const bb = $('buyBtn'); if (bb) bb.onclick = openBuy; } $('creditPill').onclick = openBuy;
  $('buyClose').onclick = () => $('buyOverlay').style.display = 'none';
  $('payBack').onclick = showPackList;
  $('curToggle').onclick = () => { showUsd = !showUsd; renderPacks(); };
  $('promoClose').onclick = () => $('promoOverlay').style.display = 'none';
  $('promoCta').onclick = () => { $('promoOverlay').style.display = 'none'; openBuy(); };
  $('contentSubmit').onclick = submitContent;
  $('payoutBtn').onclick = requestPayout;
  $('copyRef').onclick = () => { navigator.clipboard.writeText($('refLink').value); $('copyRef').textContent = 'Copied!'; setTimeout(() => $('copyRef').textContent = 'Copy', 1500); };
  $('logoutBtn').onclick = logout;
  $('adminGrant').onclick = () => adminGrant(false);
  $('adminGrantCredits').onclick = () => adminGrant(true);
  { const gc = $('adminGrantCourse'); if (gc) gc.onclick = adminGrantCourse; }
  $('lbClose').onclick = () => $('lightbox').style.display = 'none';
  $('lbDl').onclick = () => downloadFile(lbUrl);
  $('authBtn').onclick = doAuth;
  $('authSwitchLink').onclick = () => setAuthMode(authMode === 'signup' ? 'login' : 'signup');
  $('authPass').addEventListener('keydown', (e) => { if (e.key === 'Enter') doAuth(); });
  $('previewLink').onclick = enterPreview;

  if (new URLSearchParams(location.search).get('paid')) setTimeout(() => user && loadProfile(), 2500);
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/app/sw.js').catch(() => {});

  boot();
});
