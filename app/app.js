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
// Download via our proxy so it saves the file directly (no new browser tab).
const dlHref = (u) => `/.netlify/functions/download?url=${encodeURIComponent(u)}&name=fuse-${Date.now()}`;
async function downloadFile(url) {
  try {
    const res = await fetch(dlHref(url));
    if (!res.ok) throw new Error('proxy');
    const blob = await res.blob();
    const a = document.createElement('a');
    const o = URL.createObjectURL(blob);
    a.href = o;
    a.download = `fuse-${Date.now()}.${blob.type.includes('video') ? 'mp4' : blob.type.includes('png') ? 'png' : 'jpg'}`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(o), 5000);
  } catch (e) { window.location.href = dlHref(url); }
}
window.fuseDownload = downloadFile;

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
    s += 4;
    try {
      const r = await fetch(`/.netlify/functions/job-status?id=${requestId}`, { headers: { ...(await authHeader()) } });
      const d = await r.json();
      if (d.status === 'completed') {
        clearInterval(timer); clearPending();
        lastOutput = d.url;
        const media = mediaType === 'image'
          ? `<img src="${d.url}" onclick="fuseLightbox('${d.url}','image')" style="cursor:pointer">`
          : `<video src="${d.url}" controls autoplay loop muted playsinline></video>`;
        resultEl.innerHTML = `<div>${media}<div style="margin-top:12px"><button class="btn gold sm" onclick="fuseDownload('${d.url}')">⬇ Download</button></div></div>`;
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
  }, 4000);
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
  ids.forEach((id, i) => {
    let s = 0;
    const t = setInterval(async () => {
      s += 4;
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
    }, 4000);
  });
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
  const safe = ['library', 'profile', 'community', 'models', 'studio', 'video', 'market', 'learn', 'avatar', 'promptgen', 'reactor', 'preset', 'course'];
  if (!safe.includes(r.view)) return;
  try {
    if (r.view === 'studio') { openStudio(r.studio || 'generate'); if (r.video) setStudioMode(true); }
    else if (r.view === 'video') { if (r.vSlug) openVideo(r.vSlug); else showView('video'); }
    else if (r.view === 'models') { showView('models'); buildModels(r.kind || 'all'); }
    else if (r.view === 'course') { openCourse(); }
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
// Free-plan model whitelist (matches _packs.js FREE_* lists).
const FREE_SLUGS = new Set(['flux-schnell-image', 'qwen-image', 'grok-imagine-text-to-video', 'grok-imagine-image-to-video', 'gpt-5-2', 'gemini-2-5-flash']);
function isLocked(slug) { return userPlan === 'free' && !userIsAdmin && !FREE_SLUGS.has(slug); }

function buildModels(kind) {
  modelKind = kind || 'all';
  document.querySelectorAll('#view-models .mtab').forEach((t) => t.classList.toggle('active', t.dataset.kind === modelKind));
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
  const btn = $('genBtn'); const label = '🎬 Generate video'; btn.disabled = true; btn.textContent = 'Submitting…';
  $('result').innerHTML = '<div><span class="spin"></span><div style="margin-top:12px">Sending to the engine…</div></div>';
  note('genNote', '');
  try {
    const res = await fetch('/.netlify/functions/video-generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ model, prompt, aspect, duration: $('studioDuration').value, image_url: refUrls[0] || undefined }),
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
  if (key === 'promptgen') { buildPromptFields(); showView('promptgen'); loadPromptHistory(); return; }
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

  // promo banner
  const pr = cfg.PROMO;
  $('homePromo').innerHTML =
    `<div class="lab">⏳ ${pr.title}</div><h3>${pr.body}</h3>
     <button class="btn gold sm" id="promoBannerCta">${pr.cta}</button>
     <span class="countdown" id="bannerCountdown"></span>`;
  $('promoBannerCta').onclick = () => openBuy();
  startCountdown('bannerCountdown', pr.hours);

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
function courseHasFull() { return userIsAdmin || userPlan === 'pro' || userPlan === 'agency'; }
function moduleUnlocked(mKey, pillarKey) {
  if (pillarKey === 'orient') return true;       // orientation is free
  if (courseHasFull()) return true;
  return courseUnlocks.has(mKey);
}
function ytId(u) { const m = u.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{6,})/); return m ? m[1] : ''; }
function lessonEmbed(url) {
  if (!url) return '<div class="lp-empty">🎬 Video coming soon</div>';
  if (/youtube|youtu\.be/.test(url)) return `<iframe src="https://www.youtube.com/embed/${ytId(url)}" allow="autoplay; fullscreen; encrypted-media" allowfullscreen></iframe>`;
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
  $('courseLockMsg').innerHTML = courseHasFull()
    ? '<div class="course-badge ok">✓ Full access unlocked</div>'
    : '<div class="course-badge">🔒 Unlock modules with credits, or get the full course for ₦60,000 <button class="btn gold sm" id="courseBuy" style="margin-left:8px">Get full access</button></div>';
  const cb = $('courseBuy'); if (cb) cb.onclick = () => buy('course');
  // pillar tabs
  $('pillarTabs').innerHTML = COURSE.map((p) => `<button class="ptab${p.key === coursePillar ? ' active' : ''}" data-p="${p.key}">${p.name}</button>`).join('');
  $('pillarTabs').querySelectorAll('.ptab').forEach((b) => b.onclick = () => { coursePillar = b.dataset.p; openCourse(); });
  // progress
  const totalLessons = COURSE.reduce((a, p) => a + p.modules.reduce((b, m) => b + m.lessons.length, 0), 0);
  const done = courseProgress.size;
  $('cpFill').style.width = totalLessons ? Math.round((done / totalLessons) * 100) + '%' : '0%';
  $('cpText').textContent = `${done}/${totalLessons} lessons complete`;
  buildCourseBody();
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
  // find lesson
  let found = null, modOf = null;
  COURSE.forEach((p) => p.modules.forEach((m) => m.lessons.forEach((l) => { if (l.key === key) { found = l; modOf = m; } })));
  if (!found) return;
  curLesson = found;
  $('lessonPlayer').innerHTML = lessonEmbed(courseVideos[key]);
  $('lessonTitle').textContent = found.n + ' · ' + found.title;
  $('lessonMeta').innerHTML = `<span class="muted">${modOf.title}${found.dur ? ' · ' + found.dur : ''}</span>`;
  $('lessonBody').innerHTML = '';
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
  if (go === 'reactor' || go === 'avatar' || go === 'promptgen' || go === 'market') return openStudio(go);
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

// ---------------- reactor (multi-AI) ----------------
let rcModel = null;
function buildReactor() {
  $('reactorTitle').textContent = cfg.REACTOR_NAME;
  $('reactorList').innerHTML = cfg.REACTOR_MODELS.map((m) =>
    `<div class="rcard ${m.live ? '' : 'soon'}" data-id="${m.id}">
       <div class="rn">${m.name}</div><div class="rb">${m.badge}</div>
       <div class="rc">${m.live ? m.credits + ' cr / msg' : 'Coming soon'}</div></div>`).join('');
  $('reactorList').querySelectorAll('.rcard').forEach((el) => el.onclick = () => {
    const m = cfg.REACTOR_MODELS.find((x) => x.id === el.dataset.id);
    if (!m.live) { note('rcNote', `${m.name} comes online soon — video AIs are being connected.`, 'err'); $('reactorChat').style.display = 'block'; $('rcName').textContent = m.name; $('rcCost').textContent = 'Coming soon'; $('rcOut').textContent=''; return; }
    rcModel = m; $('reactorChat').style.display = 'block';
    $('rcName').textContent = m.name; $('rcCost').textContent = m.credits + ' credits per message'; $('rcOut').textContent = ''; note('rcNote', '');
  });
}
async function reactorSend() {
  if (preview) { showAuth('signup'); return; }
  if (!rcModel) return;
  const prompt = $('rcInput').value.trim(); if (!prompt) return note('rcNote', 'Type a message.', 'err');
  const btn = $('rcSend'); btn.disabled = true; btn.textContent = 'Thinking…'; note('rcNote', '');
  try {
    const res = await fetch('/.netlify/functions/ai-chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ model: rcModel.id, prompt }),
    });
    const data = await res.json();
    if (res.status === 503) note('rcNote', data.error, 'err');
    else if (res.status === 402) { note('rcNote', 'Out of credits.', 'err'); openBuy(); }
    else if (!res.ok) throw new Error(data.error || 'AI error');
    else { $('rcOut').textContent = data.text; $('creditCount').textContent = data.credits; }
  } catch (e) { note('rcNote', e.message, 'err'); }
  btn.disabled = false; btn.textContent = 'Send';
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
  const meta = `<div class="projmeta">
      <div class="pm-row"><span>Model</span><b>${modelName}</b></div>
      ${x.aspect ? `<div class="pm-row"><span>Aspect</span><b>${x.aspect}</b></div>` : ''}
      ${when ? `<div class="pm-row"><span>Created</span><b>${when}</b></div>` : ''}
      ${x.prompt ? `<div class="pm-prompt"><span>Prompt used</span><p>${(x.prompt || '').replace(/</g, '&lt;')}</p>
        <button class="btn ghost sm" onclick="window.fuseReuse(${i})">↺ Use this prompt again</button></div>` : ''}
    </div>`;
  $('lbContent').innerHTML = media + meta;
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
      // Show the doubled credits so it's clear founding members get 2×.
      $('adminPack').innerHTML = cfg.PACKS.map((p) => `<option value="${p.key}">${p.name} — ${naira(p.naira)} → ${p.credits * 2} cr</option>`).join('');
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
    btn = $('adminGrant'); label = 'Grant access (2× founding)';
  }
  btn.disabled = true; btn.textContent = 'Granting…';
  try {
    const res = await fetch('/.netlify/functions/admin-grant', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify(payload),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || 'Failed');
    note('adminNote', `✅ Added ${d.credits} credits to ${d.email}${d.founding ? ' (2× founding)' : ''}.`, 'ok');
    $('adminEmail').value = ''; $('adminCredits').value = '';
  } catch (e) { note('adminNote', e.message || 'Failed', 'err'); }
  btn.disabled = false; btn.textContent = label;
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
function renderPacks() {
  // Free users see only subscription plans (no credit top-ups). Subscribers see everything.
  const isFree = userPlan === 'free' && !userIsAdmin;
  const packs = isFree ? cfg.PACKS.filter((p) => p.kind === 'sub' || p.kind === 'course') : cfg.PACKS;
  $('packList').innerHTML = packs.map((p) =>
    `<div class="pk founding" data-pack="${p.key}"><div><div class="pkn">${p.name}${p.featured ? ' ⭐' : ''}</div>
      <div class="pkc">${p.credits} <s style="opacity:.6">→</s> <b class="gold">${p.credits * 2} credits</b> · ${p.note}${p.kind === 'sub' ? ' /mo' : ''}</div></div>
      <div class="pka">${price(p.naira)}</div></div>`).join('');
  if (isFree) $('packList').insertAdjacentHTML('afterbegin', '<div class="muted" style="font-size:12px;margin-bottom:8px;text-align:center">Subscribe to unlock all models + credit top-ups</div>');
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
    <div class="pm-prompt" style="border:0;padding:0;margin:6px 0 12px"><p style="color:var(--gold)">You get ${p.credits * 2} credits (2× founding bonus)</p></div>
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
  const { data } = await sb.from('avatars').select('id,name,image_url,model_sheet_url,status').order('created_at', { ascending: false });
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
  $('avResult').innerHTML = '<div class="muted">Your consistent-face image appears here.</div>';
  renderSheet();
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
    s += 4;
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
  }, 4000);
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
      if (!data.session) { note('authNote', '✅ Account created — check your email to confirm, then log in.', 'ok'); setAuthMode('login'); $('authBtn').disabled = false; return; }
      await claimReferral();
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
    }
    await boot();
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
  if (new URLSearchParams(location.search).get('buy') === 'course') setTimeout(() => buy('course'), 600);
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
