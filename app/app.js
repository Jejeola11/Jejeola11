// ============================================================
// Fuse Studio — app shell logic (Phase 2–5)
// Auth + view routing + studios + reactor + library + profile +
// referrals + challenges + content rewards + promos + preview mode.
// ============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const cfg = window.FUSE;
const sb = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
const $ = (id) => document.getElementById(id);

// Fires when someone lands back on the studio via the link from a "Forgot
// password?" email — Supabase parses the recovery token out of the URL and
// signs them into a temporary session, then tells us via this event so we
// can prompt for a new password instead of dropping them straight into the
// app on an account they were just locked out of.
sb.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') {
    const authOv = document.getElementById('authOverlay');
    if (authOv) authOv.style.display = 'none';
    document.getElementById('recoverOverlay').style.display = 'flex';
  }
});

let user = null;
let preview = false;
let showUsd = false;
let userPlan = 'free'; // updated on loadProfile
let userIsAdmin = false;
// ---------------- Icon library (2D line icons — replaces all emoji glyphs) ----------------
const ICONS = {
  sparkle: '<path d="M11 3l1.6 5 5 1.6-5 1.6-1.6 5-1.6-5-5-1.6 5-1.6z"/>',
  target: '<circle cx="11" cy="11" r="7.2"/><circle cx="11" cy="11" r="3.6"/><circle cx="11" cy="11" r=".6" fill="currentColor" stroke="none"/>',
  package: '<path d="M4 7.5l7-3.5 7 3.5v7L11 18l-7-3.5v-7z"/><path d="M4 7.5L11 11l7-3.5M11 11v7"/>',
  camera: '<rect x="3" y="6.5" width="16" height="11" rx="2.2"/><circle cx="11" cy="12" r="3.4"/><path d="M8 6.5l1.4-2h3.2l1.4 2"/>',
  film: '<rect x="3.5" y="4" width="15" height="14" rx="1.8"/><path d="M3.5 8h15M3.5 14h15M8 4v4M8 14v4M14 4v4M14 14v4"/>',
  avatar: '<circle cx="11" cy="8.2" r="3.4"/><path d="M4.6 18c0-3.6 2.9-6 6.4-6s6.4 2.4 6.4 6"/>',
  flyer: '<rect x="4" y="3" width="14" height="16" rx="1.6"/><path d="M7 7.5h8M7 11h8M7 14.5h5"/>',
  audio: '<path d="M4 12v-1M7.5 15v-7M11 17V5M14.5 15V9M18 12v-1"/>',
  scissors: '<circle cx="6.2" cy="6.2" r="2.1"/><circle cx="6.2" cy="15.8" r="2.1"/><path d="M7.9 7.7L18 18M7.9 14.3L18 4"/>',
  omni: '<circle cx="8.6" cy="11" r="5.4"/><circle cx="13.4" cy="11" r="5.4"/>',
  wand: '<path d="M4 18L14.5 7.5M13 4l.8 2.2L16 7l-2.2.8L13 10l-.8-2.2L10 7l2.2-.8z"/><path d="M17.5 13l.5 1.4L19.4 15l-1.4.5-.5 1.4-.5-1.4L15.6 15l1.4-.6z"/>',
  bag: '<path d="M5.8 8h10.4l.9 9.4a1.4 1.4 0 01-1.4 1.6H6.3a1.4 1.4 0 01-1.4-1.6L5.8 8z"/><path d="M8.2 8V6.2a2.8 2.8 0 015.6 0V8"/>',
  cap: '<path d="M11 4.2L2.5 8.5 11 12.8l8.5-4.3L11 4.2z"/><path d="M6.2 10.4v3.8c0 1.3 2.2 2.4 4.8 2.4s4.8-1.1 4.8-2.4v-3.8"/>',
  play: '<rect x="3.5" y="4" width="15" height="14" rx="2.2"/><path d="M9.3 8.4l4.6 3-4.6 3v-6z" fill="currentColor" stroke="none"/>',
  wrench: '<path d="M14.8 4.6a4 4 0 00-5.5 4.7L4 14.6v3.7h3.7l5.3-5.3a4 4 0 004.7-5.5l-2.8 2.8-2-2z"/>',
  atelier: '<path d="M11 4.2L2.5 8.5 11 12.8l8.5-4.3L11 4.2z"/><path d="M6.2 10.4v3.8c0 1.3 2.2 2.4 4.8 2.4s4.8-1.1 4.8-2.4v-3.8"/>',
  learn: '<path d="M4 5.5h6a2 2 0 012 2v9.5a1.6 1.6 0 00-1.6-1.6H4z"/><path d="M18 5.5h-6a2 2 0 00-2 2v9.5a1.6 1.6 0 011.6-1.6H18z"/>',
  explore: '<circle cx="11" cy="11" r="7.5"/><path d="M13.6 8.4l-1.2 3.8-3.8 1.2 1.2-3.8z"/>',
  brush: '<path d="M12.5 15.5l6-11 3 3-11 6-3-3z"/><path d="M16.5 9l3.5 3M6.5 12.5l3.5 3"/><path d="M6.5 12.5c-2 0-2.4 1.6-2.2 3-1 .3-1.8 1.2-1.8 2.5 2.8 0 5-1 5.4-3-.2-1-.6-2.5-1.4-2.5z"/>',
};
function svgIcon(name, size) {
  const s = size || 22;
  return `<svg viewBox="0 0 22 22" width="${s}" height="${s}" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ICONS.sparkle}</svg>`;
}

let activeStudio = cfg.STUDIOS[0];
let lastPrompt = '';
let lastOutput = ''; // last generated image/video URL (for publishing to marketplace)
let refUrls = []; // optional image reference(s) for the main generator (multi)
let studioVideo = false; // studio generator mode: image (false) or video (true)

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

// ---- Shared image upload helpers (resize + retry) ----
// Phone camera photos are routinely 3-10MB each; uploading 15 of those
// sequentially over mobile data with zero retry is exactly what "Failed to
// fetch" looks like the moment any single request hits a network blip —
// this is why avatar training used to fail partway through a 15-photo
// batch. Resizing client-side before upload cuts payload size drastically
// (identity-lock generation doesn't need more than ~1600px on the long
// edge), and a retry-with-backoff wrapper survives a transient blip instead
// of aborting the whole batch on the first one.
async function resizeImageFile(file, maxDim = 1600, quality = 0.85) {
 if (!file.type || !file.type.startsWith('image/')) return file;
 try {
 const bitmap = await createImageBitmap(file);
 let { width, height } = bitmap;
 if (Math.max(width, height) <= maxDim) { bitmap.close && bitmap.close(); return file; }
 const scale = maxDim / Math.max(width, height);
 width = Math.round(width * scale); height = Math.round(height * scale);
 const canvas = document.createElement('canvas');
 canvas.width = width; canvas.height = height;
 canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
 bitmap.close && bitmap.close();
 const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
 if (!blob) return file;
 return new File([blob], (file.name || 'photo').replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
 } catch (e) { return file; } // decode failed (unsupported format) — upload the original rather than block
}
// Escape a value for safe interpolation into an HTML attribute or text node
// in the many template-literal renderers below. Covers the quote characters
// that would otherwise break out of an attribute, plus < & so a name
// containing markup can't inject elements.
function escAttr(s) {
 return String(s == null ? '' : s)
 .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
 .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
async function uploadWithRetry(bucket, path, file, tries = 3) {
 let lastErr;
 for (let i = 0; i < tries; i++) {
 const { error } = await sb.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type || undefined });
 if (!error) return true;
 lastErr = error;
 if (i < tries - 1) await new Promise((r) => setTimeout(r, 800 * (i + 1)));
 }
 throw lastErr;
}

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
 ftStatus(` ${which.charAt(0).toUpperCase() + which.slice(1)} frame saved to your downloads.`);
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
 $('vPrompt').value = ''; $('vResult').innerHTML = '<div class="muted">End frame attached as your starting image — describe the next motion and generate to continue the scene. </div>';
 note('vNote', ' End frame attached — your next clip will continue seamlessly.', 'ok');
 window.scrollTo({ top: 0, behavior: 'smooth' });
 } catch (e) { ftStatus(e.message || 'Could not use end frame.'); }
};
// Attach a just-generated AI Avatar Studio image as the video studio's
// starting frame — same handoff as fuseUseEndAsStart above, just skipping
// the frame-extraction step since we already have a plain image URL.
window.fuseUseAvatarAsVideoStart = (url) => {
 if (preview) { showAuth('signup'); return; }
 if (!vModel) vModel = cfg.VIDEO_MODELS.find((m) => m.slug === 'kling-v3-turbo-pro-text-to-video') || cfg.VIDEO_MODELS[0];
 vRefUrl = url;
 showView('video');
 $('vRefThumb').src = url; $('vRefPreview').style.display = 'flex'; $('vRefBtn').style.display = 'none';
 $('vPrompt').value = ''; $('vResult').innerHTML = '<div class="muted">Your avatar image is attached as the starting frame — describe the motion and generate.</div>';
 note('vNote', ' Avatar image attached as your starting frame.', 'ok');
 window.scrollTo({ top: 0, behavior: 'smooth' });
};

// In-app lightbox preview (no new browser tab).
let lbUrl = '';
window.fuseLightbox = (url, type) => {
 lbUrl = url;
 document.getElementById('lbContent').innerHTML = (type === 'video')
 ? `<video src="${url}" controls autoplay loop playsinline style="max-width:92vw;max-height:74vh;border-radius:14px"></video>`
 : `<img src="${url}" style="max-width:92vw;max-height:74vh;border-radius:14px">`;
 document.getElementById('lightbox').style.display = 'flex';
};

// Poll an async render job until it completes. mediaType 'image' or 'video'.
// onFail is optional (most callers don't pass it) -- lets a specific caller
// react to a failure (e.g. flyerGenHero escalating to a fallback model on
// the next attempt) without every other pollJob() call site needing to
// know or care that the parameter exists.
//
// queueLabel is also optional, and matters a lot: passing it registers the
// job in the SHARED pending-jobs queue (the same one Image/Video/Audio
// Studio use via queueJob), which polls every 6s indefinitely and survives
// a reload or navigating away. Without it, this function is the job's only
// watcher and hitting maxSeconds abandons it outright -- the user's credits
// are already spent, the provider may well finish seconds later, and the
// result is simply lost with a "this render is stuck" message. That is
// exactly what was happening to every Flyer Studio and Avatar generation
// (they were the only studios never wired into the shared queue), and it
// left dozens of jobs stranded mid-flight. Timing out now hands the job
// over to that poller instead of dropping it.
function pollJob(requestId, resultEl, noteId, btn, btnLabel, mediaType = 'video', maxSeconds = 360, onComplete, onFail, queueLabel) {
 if (queueLabel) {
 queueJob({ request_id: requestId, endpoint: 'job-status', mediaType, label: String(queueLabel).slice(0, 60), model: mediaType });
 startGlobalPoller();
 }
 let s = 0;
 const timer = setInterval(async () => {
 s += 8;
 try {
 const r = await fetch(`/.netlify/functions/job-status?id=${requestId}`, { headers: { ...(await authHeader()) } });
 const d = await r.json();
 if (d.status === 'completed') {
 clearInterval(timer);
 if (queueLabel) dequeueJob(requestId);
 lastOutput = d.url;
 const media = mediaType === 'image'
 ? `<img src="${d.url}" onclick="fuseLightbox('${d.url}','image')" style="cursor:pointer">`
 : `<video src="${d.url}" controls autoplay loop muted playsinline></video>`;
 const frameTools = mediaType === 'video'
 ? `<div class="frame-tools"><div class="ft-h"> Extract frames (chain your next clip)</div>
 <div class="ft-row">
 <button class="btn ghost sm" onclick="fuseSaveFrame('${d.url}','start')">⬇ Start frame</button>
 <button class="btn ghost sm" onclick="fuseSaveFrame('${d.url}','end')">⬇ End frame</button>
 <button class="btn gold sm" onclick="fuseUseEndAsStart('${d.url}')"> Use end frame as next start</button>
 </div><div class="note" id="ftNote"></div></div>`
 : '';
 resultEl.innerHTML = `<div>${media}<div style="margin-top:12px"><button class="btn gold sm" onclick="fuseDownload('${d.url}')">⬇ Download</button></div>${frameTools}</div>`;
 note(noteId, 'Done ', 'ok');
 if (user) loadProfile();
 if (btn) { btn.disabled = false; btn.textContent = btnLabel; }
 if (onComplete) onComplete(d.url);
 } else if (d.status === 'failed') {
 clearInterval(timer);
 if (queueLabel) dequeueJob(requestId);
 resultEl.innerHTML = '<div> ' + (d.error || 'Failed') + '</div>';
 note(noteId, (d.error || 'Failed') + ' — credits refunded.', 'err');
 if (user) loadProfile();
 if (btn) { btn.disabled = false; btn.textContent = btnLabel; }
 if (onFail) onFail(d.error);
 } else {
 const dd = resultEl.querySelector('div div'); if (dd) dd.textContent = `Rendering… (${s}s)`;
 }
 } catch (e) {}
 if (s >= maxSeconds) {
 clearInterval(timer);
 if (btn) { btn.disabled = false; btn.textContent = btnLabel; }
 if (queueLabel) {
 // Handed off, not abandoned -- the shared poller keeps going and will
 // toast + drop it into Projects whenever it lands, even after a
 // reload. Deliberately NOT an error: nothing has gone wrong yet.
 note(noteId, 'Still rendering — taking longer than usual. You can leave this page; it\'ll appear in Projects when it\'s done.', 'ok');
 } else {
 note(noteId, 'Still rendering after ' + maxSeconds + 's — this render is stuck. Try again with fewer reference images.', 'err');
 }
 }
 }, 8000);
}

// Poll several image jobs at once, filling a grid as each completes.
// queueLabel is optional -- same handoff pattern as pollJob (see its
// comment above). Without it, a slot that outlasts 360s used to be marked
// 'failed' PURELY CLIENT-SIDE with no server check at all -- a slow-but-
// fine generation got reported as failed, and the actual result (credits
// already spent) was never seen again. Passing queueLabel registers that
// slot's id in the shared queue instead, so it hands off to the resilient
// poller and gets a toast + a Projects entry whenever it actually resolves.
function pollGrid(ids, resultEl, noteId, btn, label, watermark, queueLabel) {
 const done = new Array(ids.length).fill(null);
 const handedOff = new Array(ids.length).fill(false);
 let finished = 0;
 resultEl.innerHTML = `<div><div class="${ids.length > 1 ? 'libgrid' : ''}" style="${ids.length > 1 ? 'gap:8px' : ''}">${ids.map((_, i) => `<div class="gen-slot" id="slot${i}"><span class="spin"></span></div>`).join('')}</div><div id="gridFooter" class="muted" style="margin-top:10px">Creating… ⏳</div></div>`;
 const finish = () => {
 finished++;
 if (finished < ids.length) return;
 clearPending();
 const urls = done.filter((u) => u && u !== 'failed' && u !== 'handoff');
 const anyHandedOff = handedOff.some(Boolean);
 const footer = document.getElementById('gridFooter');
 if (urls.length) {
 if (footer) footer.outerHTML = `<div style="margin-top:12px"><button class="btn gold sm" onclick="fuseDownload('${urls[0]}')">⬇ Download</button></div>${watermark ? '<div class="muted" style="font-size:11px;margin-top:6px">Watermark removed on paid plans</div>' : ''}`;
 note(noteId, `Done ${urls.length > 1 ? ` · ${urls.length} variations` : ''}`, 'ok');
 } else if (anyHandedOff) {
 if (footer) footer.textContent = '';
 note(noteId, 'Still rendering — taking longer than usual. You can leave this page; it\'ll appear in Projects when it\'s done.', 'ok');
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
 if (handedOff[i]) dequeueJob(id);
 const slot = document.getElementById('slot' + i);
 if (slot) slot.innerHTML = `${watermark ? '<div class="fuse-wm">Fuse Studio</div>' : ''}<img src="${d.url}" onclick="fuseLightbox('${d.url}','image')" style="cursor:pointer">`;
 finish();
 } else if (d.status === 'failed') {
 clearInterval(t); done[i] = 'failed';
 if (handedOff[i]) dequeueJob(id);
 const slot = document.getElementById('slot' + i); if (slot) slot.innerHTML = '<div class="muted" style="font-size:12px"> failed</div>';
 finish();
 }
 } catch (e) {}
 if (s >= 360 && done[i] === null) {
 clearInterval(t);
 if (queueLabel) {
 done[i] = 'handoff'; handedOff[i] = true;
 queueJob({ request_id: id, endpoint: 'job-status', mediaType: 'image', label: String(queueLabel).slice(0, 60), model: 'image' });
 startGlobalPoller();
 const slot = document.getElementById('slot' + i);
 if (slot) slot.innerHTML = '<div class="muted" style="font-size:12px"> still rendering…</div>';
 } else {
 done[i] = 'failed';
 }
 finish();
 }
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
 scrollMem[curView] = window.scrollY; // remember where we were
 document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
 const el = $('view-' + name);
 if (el) el.classList.add('active');
 document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.view === name));
 curView = name;
 if (name === 'library') loadLibrary();
 if (name === 'profile') loadProfile();
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
 // 'flyer'/'audio'/'editstudio' were missing here — each was built after this
 // list was written and never added, so reloading while on any of them
 // silently dumped the user back to Home (restoreRoute just returned early)
 // instead of restoring the view. The Flyer Studio project itself was never
 // actually lost (it lives server-side), but landing on Home made it look
 // exactly like it had been.
 const safe = ['library', 'profile', 'models', 'studio', 'video', 'market', 'learn', 'avatar', 'promptgen', 'reactor', 'preset', 'course', 'week', 'omni', 'mini', 'all-courses', 'flyer', 'audio', 'editstudio'];
 if (!safe.includes(r.view)) return;
 try {
 if (r.view === 'studio') { openStudio(r.studio || 'generate'); if (r.video) setStudioMode(true); }
 else if (r.view === 'video') { if (r.vSlug) openVideo(r.vSlug); else showView('video'); }
 else if (r.view === 'models') { showView('models'); buildModels(r.kind || 'all'); }
 else if (r.view === 'course') { openCourse(); }
 else if (r.view === 'week') { openWeek(); }
 else if (r.view === 'mini') { openMiniHub(); }
 else if (r.view === 'all-courses') { openAllCourses(); }
 else if (['market', 'learn', 'avatar', 'promptgen', 'reactor', 'flyer', 'audio', 'editstudio'].includes(r.view)) { openStudio(r.view); }
 else showView(r.view);
 } catch (e) {}
}
// Legacy single-slot pending-video key — kept as a harmless no-op stub since
// pollGrid (still used by Prompt Gen + Omni Studio, not retrofitted below)
// still calls it; nothing writes to fuse_pendingVideo anymore, superseded by
// the multi-job queue below.
function clearPending() { try { localStorage.removeItem('fuse_pendingVideo'); } catch (e) {} }

// ============================================================
// Global generation queue (Higgsfield-style) — a "Generate" tap submits and
// immediately frees the studio for another one, instead of disabling the
// button and polling inline tied to that view's DOM (which silently died
// the moment you switched views, reloaded, or the tab lost focus long
// enough for the browser to throttle its setInterval). Every job below is
// tracked centrally in localStorage and polled by ONE interval that runs
// for the life of the whole app, independent of whatever view is open —
// so it survives navigation, reload, and backgrounding, and up to
// MAX_CONCURRENT_JOBS can genuinely run side by side.
// ============================================================
const PENDING_JOBS_KEY = 'fuse_pending_jobs';
const MAX_CONCURRENT_JOBS = 10;
let pendingJobs = [];
// A queued job is only ever removed when a poll sees it reach a terminal
// state. If one never does (the provider dropped it, the tab died mid-
// generation, a bug left it hanging), it used to sit in this list forever
// -- and since jobCapReached() blocks new submissions at
// MAX_CONCURRENT_JOBS, ten of those permanently locked the user out of
// generating anything at all, with nothing on screen explaining why.
// Anything older than this is treated as abandoned and swept. Well past
// the slowest real generation (long avatar videos run several minutes), so
// this can only ever catch genuinely dead entries.
const PENDING_JOB_MAX_AGE_MS = 30 * 60 * 1000; // 30 min
function prunePendingJobs(list) {
 const now = Date.now();
 return (list || []).filter((j) => j && (now - (j.started_at || 0)) < PENDING_JOB_MAX_AGE_MS);
}
function loadPendingJobs() {
 try { pendingJobs = JSON.parse(localStorage.getItem(PENDING_JOBS_KEY) || '[]'); } catch (e) { pendingJobs = []; }
 const pruned = prunePendingJobs(pendingJobs);
 if (pruned.length !== pendingJobs.length) { pendingJobs = pruned; savePendingJobs(); }
}
function readSharedPendingJobs() {
 try { return JSON.parse(localStorage.getItem(PENDING_JOBS_KEY) || '[]'); } catch (e) { return []; }
}
function savePendingJobs() { try { localStorage.setItem(PENDING_JOBS_KEY, JSON.stringify(pendingJobs)); } catch (e) {} }
// job: { request_id, endpoint: 'job-status'|'avatar-video-status', mediaType: 'image'|'video', label, model, started_at }
// Multiple tabs share this one localStorage key, so a plain "read once at
// boot, mutate in memory, write" would let a second tab's write silently
// clobber a first tab's still-in-flight job the moment both tabs queue or
// dequeue anything close together. queueJob/dequeueJob instead re-read the
// CURRENT shared list right before merging in this tab's own change and
// writing back — each tab still only actively polls the jobs it itself
// queued (that part genuinely doesn't need cross-tab coordination), this
// just stops one tab's write from silently erasing another tab's entry.
function queueJob(job) {
 const entry = { ...job, started_at: job.started_at || Date.now() };
 pendingJobs.push(entry);
 const shared = readSharedPendingJobs();
 shared.push(entry);
 localStorage.setItem(PENDING_JOBS_KEY, JSON.stringify(shared));
 renderLibraryPending();
}
function dequeueJob(requestId) {
 pendingJobs = pendingJobs.filter((j) => j.request_id !== requestId);
 const shared = readSharedPendingJobs().filter((j) => j.request_id !== requestId);
 localStorage.setItem(PENDING_JOBS_KEY, JSON.stringify(shared));
 renderLibraryPending();
}
function activeJobCount() { return pendingJobs.length; }
// Call this before every retrofitted submit — returns true (and shows the
// note) if the 10-concurrent cap is already hit, so the caller can bail out
// before spending credits on a submission that would just queue forever.
function jobCapReached(noteId) {
 if (pendingJobs.length < MAX_CONCURRENT_JOBS) return false;
 note(noteId, `You've got ${MAX_CONCURRENT_JOBS} generations running already — check Projects, or wait for one to finish before starting another.`, 'err');
 return true;
}

let globalPollTimer = null;
function startGlobalPoller() {
 if (globalPollTimer) return;
 globalPollTimer = setInterval(pollAllPendingJobs, 6000);
 pollAllPendingJobs();
}
async function pollAllPendingJobs() {
 // Sweep abandoned entries here too, not just at boot -- a session left
 // open for hours would otherwise never clear them and would hit the
 // concurrency cap without ever reloading.
 const swept = prunePendingJobs(pendingJobs);
 if (swept.length !== pendingJobs.length) {
 pendingJobs = swept;
 localStorage.setItem(PENDING_JOBS_KEY, JSON.stringify(prunePendingJobs(readSharedPendingJobs())));
 renderLibraryPending();
 }
 if (!pendingJobs.length) return;
 const snapshot = [...pendingJobs];
 for (const job of snapshot) {
 try {
 const path = job.endpoint === 'avatar-video-status' ? `media-pipeline?id=${job.request_id}` : `job-status?id=${job.request_id}`;
 const r = await fetch(`/.netlify/functions/${path}`, { headers: { ...(await authHeader()) } });
 const d = await r.json();
 const done = job.endpoint === 'avatar-video-status' ? d.stage === 'complete' : d.status === 'completed';
 const failed = job.endpoint === 'avatar-video-status' ? d.stage === 'failed' : d.status === 'failed';
 if (done || failed) {
 dequeueJob(job.request_id);
 if (user) loadProfile();
 if (curView === 'library') loadLibrary();
 showJobToast(job, done ? 'done' : 'failed', d);
 }
 } catch (e) {}
 }
}
function showJobToast(job, outcome, data) {
 const el = document.createElement('div');
 el.className = 'fuse-toast' + (outcome === 'failed' ? ' err' : '');
 el.innerHTML = outcome === 'done'
 ? ` ${(job.label || 'Your generation')} is ready — <a onclick="showView('library')">view in Projects</a>`
 : ` ${(job.label || 'A generation')} failed — credits refunded`;
 document.body.appendChild(el);
 requestAnimationFrame(() => el.classList.add('show'));
 setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 6000);
}
// Renders the "processing" cards at the top of the Projects grid — called
// whenever the queue changes AND every time loadLibrary() itself runs, so
// pending jobs are visible immediately even before the first poll tick.
function renderLibraryPending() {
 if (curView !== 'library') return;
 const g = $('libGrid'); if (!g) return;
 const existingPending = g.querySelectorAll('.projitem.processing');
 existingPending.forEach((n) => n.remove());
 if (!pendingJobs.length) return;
 const html = pendingJobs.slice().reverse().map((j) => `
 <div class="projitem processing">
 <div class="proj-spin"><span class="spin"></span></div>
 <div class="proj-pending-label">${(j.label || j.model || 'Generating…').replace(/</g, '&lt;')}</div>
 </div>`).join('');
 g.insertAdjacentHTML('afterbegin', html);
 const empty = g.querySelector('.empty'); if (empty) empty.remove();
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
 const studios = (tab) => (cfg.STUDIO_TILES || []).filter((m) => (m.tabs || []).includes(tab)).map((m) => Object.assign({ cat: 'studio' }, m));
 const ALL = cat(cfg.IMAGE_MODELS, 'image').concat(cat(cfg.VIDEO_MODELS, 'video'), cat(cfg.TOOL_MODELS, 'tools'), studios('all'));
 let list;
 if (modelKind === 'all') list = ALL;
 else if (modelKind === 'new') list = ALL.filter((m) => tagOf(m.slug));
 else if (modelKind === 'video') list = cat(cfg.VIDEO_MODELS, 'video').concat(studios('video'));
 else if (modelKind === 'tools') list = cat(cfg.TOOL_MODELS, 'tools');
 else list = cat(cfg.IMAGE_MODELS, 'image').concat(studios('image'));

 const q = ($('modelSearch').value || '').toLowerCase();
 const shown = list.filter((m) => m.name.toLowerCase().includes(q) || (m.badge || '').toLowerCase().includes(q));
 const catLabel = { image: 'Image', video: 'Video', tools: 'Edit', studio: 'Studio' };
 $('modelGrid').innerHTML = shown.map((m) => {
 const locked = isLocked(m.slug);
 const t = tagOf(m.slug);
 const media = m.sample
 ? (/\.mp4(\?|$)/i.test(m.sample) ? `<video src="${m.sample}" autoplay muted loop playsinline preload="auto"></video>` : `<img src="${m.sample}">`)
 : '＋';
 return `<div class="ccard${locked ? ' locked' : ''}" data-slug="${m.slug}" data-cat="${m.cat}" data-route="${m.route || ''}">
 <div class="cc-media">${media}
 ${t ? `<span class="cc-tag t-${t.toLowerCase()}">${t}</span>` : ''}
 <span class="cc-cat">${catLabel[m.cat] || ''}</span>
 ${locked ? '<span class="lock-badge"> Pro</span>' : ''}</div>
 <div class="cc-info"><div class="cc-name">${m.name}</div><div class="cc-meta">${m.badge || ''}${m.cat === 'studio' ? '' : ' · ' + m.credits + ' cr'}</div></div>
 </div>`;
 }).join('');
 $('modelGrid').querySelectorAll('.ccard').forEach((el) => el.onclick = () => {
 const slug = el.dataset.slug, c = el.dataset.cat;
 if (c === 'studio') { openStudio(el.dataset.route); return; }
 if (isLocked(slug)) { toast(' Subscribe to unlock this model'); openBuy(); return; }
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
 if (video) { buildVideoSelect(); $('genBtn').textContent = ' Generate video'; }
 else { buildModelSelect(); $('genBtn').textContent = ' Generate'; }
}
async function generateStudioVideo(prompt) {
 if (jobCapReached('genNote')) return;
 const model = $('model').value, aspect = $('aspect').value;
 const cameraMotion = $('cameraMotion').value.trim();
 const fullPrompt = cameraMotion ? `${prompt}. Camera: ${cameraMotion}` : prompt;
 const btn = $('genBtn'); const label = ' Generate video'; btn.disabled = true; btn.textContent = 'Submitting…';
 note('genNote', '');
 try {
 const res = await fetch('/.netlify/functions/video-generate', {
 method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
 body: JSON.stringify({ model, prompt: fullPrompt, aspect, duration: $('studioDuration').value, image_url: refUrls[0] || undefined }),
 });
 const data = await res.json();
 if (res.status === 402) { note('genNote', 'Out of credits — top up.', 'err'); openBuy(); btn.disabled = false; btn.textContent = label; return; }
 if (!res.ok) throw new Error(data.error || 'Failed');
 $('creditCount').textContent = data.credits;
 queueJob({ request_id: data.request_id, endpoint: 'job-status', mediaType: 'video', label: prompt.slice(0, 60), model });
 startGlobalPoller();
 note('genNote', ' Started — rolling in Projects now.', 'ok');
 btn.disabled = false; btn.textContent = label;
 showView('library');
 } catch (e) { note('genNote', e.message || 'Failed — credits not charged.', 'err'); btn.disabled = false; btn.textContent = label; }
}

// ---------------- video studio ----------------
let vModel = null, vRefUrl = '', vMoreRefs = [];
// Live credit estimate — mirrors video-generate.js's own durMult exactly
// (10s = 2x the 5s price, server-enforced already; this just shows it
// BEFORE generating instead of only after, and keeps updating if the user
// changes duration). Called on open and on every #vDuration change.
function vCreditsForCurrentDuration() {
 if (!vModel) return 0;
 const dur = $('vDuration') ? $('vDuration').value : '5s';
 const mult = String(dur).startsWith('10') ? 2 : 1;
 return vModel.credits * mult;
}
function vUpdateCostEstimate() {
 if (!vModel) return;
 const credits = vCreditsForCurrentDuration();
 const mult = credits / vModel.credits;
 $('vModelName').textContent = vModel.name + ' · ' + credits + ' cr' + (mult > 1 ? ` (${vModel.credits} × ${mult} for 10s)` : '');
 $('vGen').textContent = ` Generate video (${credits} credits)`;
}
function openVideo(slug) {
 vModel = cfg.VIDEO_MODELS.find((m) => m.slug === slug) || cfg.VIDEO_MODELS[0];
 $('vResult').innerHTML = '<div class="muted">Your video appears here. Video takes a little longer ⏳</div>';
 vUpdateCostEstimate();
 vRefUrl = ''; $('vRefPreview').style.display = 'none'; $('vRefBtn').style.display = 'flex';
 vMoreRefs = []; renderVideoRefs();
 note('vNote', '');
 showView('video');
}
function renderVideoRefs() {
 const wrap = $('vMoreRefPreviews'); if (!wrap) return;
 wrap.innerHTML = vMoreRefs.map((u, i) => `<div class="av-th"><img src="${u}"><span class="av-th-x" onclick="window.fuseRmVRef(${i})"></span></div>`).join('');
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
 note('vNote', ` ${vMoreRefs.length} reference(s) attached.`, 'ok');
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
 note('vNote', ' Starting image attached.', 'ok');
 } catch (e) { note('vNote', e.message || 'Upload failed.', 'err'); }
}
async function videoGenerate() {
 if (preview) { showAuth('signup'); return; }
 if (!vModel) return;
 const prompt = $('vPrompt').value.trim();
 if (!prompt && !vRefUrl) return note('vNote', 'Add a prompt or a starting image.', 'err');
 if (jobCapReached('vNote')) return;
 const btn = $('vGen'); const label = ` Generate video (${vCreditsForCurrentDuration()} credits)`; btn.disabled = true; btn.textContent = 'Submitting…';
 note('vNote', '');
 try {
 const res = await fetch('/.netlify/functions/video-generate', {
 method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
 body: JSON.stringify({ model: vModel.slug, prompt, aspect: $('vAspect').value, duration: $('vDuration').value, resolution: $('vRes').value, image_url: vRefUrl || undefined, reference_image_urls: vMoreRefs.length ? vMoreRefs : undefined }),
 });
 const data = await res.json();
 if (res.status === 402) { note('vNote', 'Out of credits — top up.', 'err'); openBuy(); btn.disabled = false; btn.textContent = label; return; }
 if (!res.ok) throw new Error(data.error || 'Failed');
 $('creditCount').textContent = data.credits;
 queueJob({ request_id: data.request_id, endpoint: 'job-status', mediaType: 'video', label: (prompt || vModel.name).slice(0, 60), model: vModel.slug });
 startGlobalPoller();
 note('vNote', ' Started — rolling in Projects now.', 'ok');
 btn.disabled = false; btn.textContent = label;
 showView('library');
 } catch (e) { note('vNote', e.message || 'Failed — credits not charged.', 'err'); btn.disabled = false; btn.textContent = label; }
}

function openStudio(key) {
 if (key === 'reactor') { showView('reactor'); return; }
 if (key === 'market') { showView('market'); loadMarket(); return; }
 if (key === 'learn') { showView('learn'); buildLessons(); return; }
 if (key === 'avatar') { showView('avatar'); loadAvatars(); return; }
 if (key === 'flyer') { showView('flyer'); loadFlyerHistory(); restoreFlyerProject(); return; }
 if (key === 'audio') { showView('audio'); loadAudioVoices(); return; }
 if (key === 'editstudio') { showView('editstudio'); return; }
 if (key === 'promptgen') { pgInit(); showView('promptgen'); return; }
 if (key === 'omni') { showView('omni'); return; }
 activeStudio = cfg.STUDIOS.find((s) => s.key === key) || cfg.STUDIOS[0];
 $('studioIcon').innerHTML = svgIcon(activeStudio.icon);
 $('studioName').textContent = activeStudio.name;
 $('studioDesc').textContent = activeStudio.desc + (activeStudio.advanced ? ' · Beta' : '');
 $('result').innerHTML = '<div>Your creation appears here.<br><span class="muted">Write a prompt and hit Generate </span></div>';
 note('genNote', '');
 setStudioMode(false);
 showView('studio');
}

// ---------------- home builders ----------------
// -- 1. Hero slideshow (auto-advancing) --
let heroIdx = 0, heroTimer = null;
function buildHeroSlides() {
 const track = $('heroTrack'), dots = $('heroDots');
 if (!track) return;
 const slides = cfg.HERO_SLIDES || [];
 track.innerHTML = slides.map((s) => `
 <div class="hero-slide" data-go="${s.go}" style="--hs-wave:${s.wave};--hs-badge-bg:${s.badgeColor}">
 <span class="hs-badge">${s.badge}</span>
 <h2 class="hs-h">${s.h}</h2>
 <p class="hs-p">${s.p}</p>
 <span class="hs-cta">${s.cta}</span>
 </div>`).join('');
 dots.innerHTML = slides.map((_, i) => `<i data-i="${i}"></i>`).join('');
 dots.querySelectorAll('i').forEach((d) => d.onclick = () => heroGoto(+d.dataset.i));
 heroIdx = 0; heroGoto(0);
 if (heroTimer) clearInterval(heroTimer);
 if (slides.length > 1) heroTimer = setInterval(() => heroGoto((heroIdx + 1) % slides.length), 4500);
}
function heroGoto(i) {
 heroIdx = i;
 $('heroTrack').style.transform = `translateX(-${i * 100}%)`;
 $('heroDots').querySelectorAll('i').forEach((d, j) => d.classList.toggle('on', j === i));
}

// -- 2. Fuse Guide wizard — one question at a time, ends on a studio CTA --
const HG_START = 'start';
const HG_TREE = {
 start: { q: 'What are you doing today?', sub: "We'll point you the right way.",
 opts: [
 { i: 'learn', t: 'Learning', next: 'learning' },
 { i: 'sparkle', t: 'Creating', next: 'creating' },
 { i: 'explore', t: 'Just exploring', next: { result: true, icon: 'explore', name: 'Explore Fuse Studio', desc: "Have a look around — everything's free to browse.", go: 'view:models' } },
 ] },
 learning: { q: 'What kind of income are you going for?', sub: "We'll point you to the right course.",
 opts: [
 { i: 'atelier', t: 'Design & creative skills', next: { result: true, icon: 'atelier', name: 'Fuse Atelier', desc: 'The AI Creative Income System — courses, walkthroughs, real income paths.', go: 'learn' } },
 { i: 'target', t: 'AI UGC & influencer income', next: { result: true, icon: 'target', name: 'The $500 Week', desc: 'AI UGC & influencer income — 7-day course.', go: 'week' } },
 ] },
 creating: { q: 'What do you want to create?', sub: "We'll open the exact studio for it.",
 opts: [
 { i: 'avatar', t: 'A consistent avatar of me', next: { result: true, icon: 'avatar', name: 'Avatar Studio', desc: 'Train your face once — generate yourself in any scene, consistently.', go: 'avatar' } },
 { i: 'play', t: 'A viral video', next: { result: true, icon: 'play', name: 'Video Studio', desc: 'Seedance, Kling, Veo — cinematic video in seconds.', go: 'video-seedance' } },
 { i: 'flyer', t: 'A flyer / design', next: { result: true, icon: 'flyer', name: 'Flyer Studio', desc: 'Describe it — a real design process, start to finish.', go: 'flyer' } },
 { i: 'audio', t: 'A voiceover', next: { result: true, icon: 'audio', name: 'Audio Studio', desc: 'Any script, your voice — instant voiceover.', go: 'audio' } },
 { i: 'scissors', t: 'Edit a video I have', next: { result: true, icon: 'scissors', name: 'Editing Studio', desc: 'Captions, elements, CTA — post-ready in one flow.', go: 'editstudio' } },
 { i: 'wand', t: 'Just a prompt', next: { result: true, icon: 'wand', name: 'Prompt Generator', desc: 'Instant, free, tuned prompts for a character or anything else.', go: 'promptgen' } },
 ] },
};
let hgPath = []; // stack of node keys visited, for the progress dots + restart
function hgRender(nodeKey) {
 const node = HG_TREE[nodeKey];
 // Every branch is exactly 2 questions deep (start, then one second-level
 // node — creating/learning/etc.) — dot 2 lighting up is just "not on the
 // start screen anymore", not tied to any specific second-level node name,
 // so this works the same for every branch without listing them here.
 const depth = nodeKey === HG_START ? 0 : 1;
 $('hgDots').innerHTML = [0, 1].map((i) => `<i class="${i <= depth ? 'on' : ''}"></i>`).join('');
 $('hgQ').textContent = node.q;
 $('hgSub').textContent = node.sub;
 $('hgOpts').innerHTML = node.opts.map((o, i) => `<div class="hg-opt" data-i="${i}"><span class="hg-ic">${svgIcon(o.i)}</span><span class="hg-t">${o.t}</span></div>`).join('');
 $('hgOpts').querySelectorAll('.hg-opt').forEach((el) => el.onclick = () => {
 const o = node.opts[+el.dataset.i];
 if (typeof o.next === 'string') { hgPath.push(nodeKey); hgRender(o.next); return; }
 hgRenderResult(o.next);
 });
}
function hgRenderResult(r) {
 $('hgDots').innerHTML = ['start', 'creating'].map(() => '<i class="on"></i>').join('');
 $('hgQ').textContent = '';
 $('hgSub').textContent = '';
 $('hgOpts').innerHTML = `
 <div class="hg-result" style="grid-column:1/-1">
 <span class="hg-ic">${svgIcon(r.icon)}</span>
 <h4>${r.name}</h4>
 <p>${r.desc}</p>
 <span class="btn gold sm" style="display:inline-block" id="hgGo">Go to studio →</span>
 <span class="hg-restart" id="hgRestart">↺ Start over</span>
 </div>`;
 // Rendered well after buildHome()'s one-time generic [data-go] wiring, so
 // this needs its own explicit handler rather than relying on that.
 $('hgGo').onclick = () => routeFeature(r.go);
 $('hgRestart').onclick = () => { hgPath = []; hgRender(HG_START); };
}
function buildHomeGuide() { hgPath = []; hgRender(HG_START); }

// -- 3. Studio marquee — continuous horizontal auto-scroll --
function buildMarquee() {
 const tiles = cfg.MARQUEE || [];
 const html = tiles.map((t) => `<div class="marq-tile" data-go="${t.go}"><span class="mt-ic">${svgIcon(t.icon, 16)}</span><span class="mt-t">${t.label}</span></div>`).join('');
 $('marqTrack').innerHTML = html + html; // duplicated once so the -50% loop is seamless
}

// -- 4. "Made with Fuse Studio" gallery — curated preview only. -------------
// Was pulling live rows straight from public_showcase and, on click, opening
// the raw output_url in a new tab — meaning any visitor could save/download
// anyone's actual generation straight off the home screen. Replaced with a
// fixed, hand-picked set of real Fuse Studio output (no live user data), and
// dropped the click-to-open handler entirely — preview only, no full-size/
// raw file is ever exposed. The context-menu block + controlsList/download
// removal deter the casual right-click-save; this is presentation, not DRM.
const GALLERY_CURATED = [
 { type: 'image', url: '/app/media/showcase/slamit-beatup.jpg' },
 { type: 'video', url: '/app/media/showcase/vid-fuse-office.mp4' },
 { type: 'image', url: '/app/media/showcase/lamer-underwater.jpg' },
 { type: 'video', url: '/app/media/showcase/vid-ugc-skincare.mp4' },
 { type: 'image', url: '/app/media/showcase/web3-voidkey.jpg' },
 { type: 'video', url: '/app/media/showcase/vid-cgi-explosion.mp4' },
 { type: 'image', url: '/app/media/showcase/slamit-heat.jpg' },
 { type: 'video', url: '/app/media/showcase/vid-ai-avatar-man.mp4' },
 { type: 'image', url: '/app/media/showcase/airpods-feel.jpg' },
 { type: 'image', url: '/app/media/showcase/avatar-pink-boutique.jpg' },
 { type: 'image', url: '/app/media/showcase/bulldog-product.jpg' },
 { type: 'image', url: '/app/media/showcase/avatar-car-night.jpg' },
];
function loadGallery() {
 const row = $('galRow'); if (!row) return;
 row.innerHTML = GALLERY_CURATED.map((x) => `<div class="gal-card" oncontextmenu="return false">${x.type === 'video'
 ? `<video src="${x.url}" muted loop playsinline preload="metadata" disablePictureInPicture controlsList="nodownload noremoteplayback" oncontextmenu="return false" onmouseover="this.play()" onmouseout="this.pause()"></video><span class="gal-tag"> Video</span>`
 : `<img src="${x.url}" draggable="false" oncontextmenu="return false"><span class="gal-tag"> Image</span>`}</div>`).join('');
}

function buildHome() {
 buildHeroSlides();
 buildHomeGuide();
 buildMarquee();
 loadGallery();
 // Viral presets — tap any to see the full recipe.
 const vp = $('vpGrid');
 if (vp) {
 vp.innerHTML = (cfg.VIRAL_PRESETS || []).map((p) =>
 `<div class="vp-card" data-id="${p.id}">
 <div class="vp-media">
 ${p.kind === 'video'
 ? `<video src="${p.sample}" autoplay muted loop playsinline preload="auto"></video>`
 : `<img src="${p.sample}">`}
 <span class="vp-tag"> VIRAL</span>
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
 `<div class="lab"> FULL LAUNCH PROMO — 2 DAYS ONLY</div><h3>Creator 2x · Pro 3x · Agency 4x credits. Fuse Atelier buyers get 2,500 bonus credits.</h3>
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
 <button class="btn gold" onclick="window.fusePresetGo('avatar')">‍ Open Avatar Studio</button>
 <button class="btn ghost" onclick="window.fusePresetGo('image:${p.models.product}')"> Open Image (with logo)</button>
 <button class="btn ghost" onclick="window.fusePresetGo('video:${p.models.video}')"> Open Kling i2v</button>
 </div>`;
 showView('preset');
}
window.fusePresetCopy = (btn, id, key) => {
 const p = (cfg.VIRAL_PRESETS || []).find((x) => x.id === id);
 if (!p || !p.prompts[key]) return;
 navigator.clipboard.writeText(p.prompts[key]);
 const orig = btn.textContent; btn.textContent = ' Copied!';
 setTimeout(() => { btn.textContent = orig; }, 1500);
};
window.fusePresetGo = (go) => routeFeature(go);

// ---------------- Fuse Atelier course (Whop-style) ----------------
const COURSE = (window.FUSE_COURSE && window.FUSE_COURSE.pillars) ? window.FUSE_COURSE.pillars : [];
let courseVideos = {}; // lesson_key -> { hasVideo, duration_sec, url? (only once opened -- see openLesson()) }
let courseUnlocks = new Set(); // module_key the user unlocked
let courseProgress = new Set(); // lesson_key completed
let coursePillar = COURSE[0] ? COURSE[0].key : 'orient';
let expandedModules = new Set(); // module_key -> open in the accordion (persists across re-renders)
// Formats a lesson's duration: the REAL measured length once a video's
// been opened at least once (captured live off the player, see
// openLesson()) takes priority over the hand-typed estimate in course.js
// — "exact minutes" per Ria, not a guess dressed up as fact.
function lessonDurLabel(vid, lesson) {
 const sec = vid && vid.duration_sec;
 if (sec) { const m = Math.floor(sec / 60), s = Math.round(sec % 60); return m > 0 ? `${m}m ${s}s` : `${s}s`; }
 return lesson.dur || '';
}
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
 if (pillarKey === 'orient') return true; // orientation is free
 const pillar = COURSE.find((p) => p.key === pillarKey);
 const need = TIER_RANK[(pillar && pillar.tier) || 'starter'];
 if (atelierTier() >= need) return true;
 return courseUnlocks.has(mKey); // legacy per-module unlocks still honoured
}
function ytId(u) { const m = u.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{6,})/); return m ? m[1] : ''; }
function lessonEmbed(url) {
 if (!url) return '<div class="lp-empty"> Video coming soon</div>';
 // id + enablejsapi=1 let captureLessonDuration() bind a real YT.Player to
 // this exact iframe to read its real length once loaded.
 if (/youtube|youtu\.be/.test(url)) return `<iframe id="ytLessonFrame" src="https://www.youtube-nocookie.com/embed/${ytId(url)}?rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&playsinline=1&enablejsapi=1" allow="autoplay; fullscreen; encrypted-media" allowfullscreen></iframe>`;
 if (/vimeo\.com/.test(url)) { const id = (url.match(/vimeo\.com\/(\d+)/) || [])[1] || ''; return `<iframe src="https://player.vimeo.com/video/${id}" allow="autoplay; fullscreen" allowfullscreen></iframe>`; }
 return `<video src="${url}" controls playsinline></video>`;
}
// Real duration capture -- only bothers admin-side (Ria, the one who sets
// videos), and only once per lesson (skips if we already have a stored
// duration_sec). YouTube needs the real IFrame Player API (postMessage
// under the hood) since a plain <iframe> exposes no metadata directly;
// native <video>/Vimeo can't be read this cheaply either, so only the
// YouTube + plain <video> cases are covered -- Vimeo lessons keep the
// hand-typed estimate until one is actually used.
let ytApiReady = false, ytApiLoading = false;
function ensureYtApi(cb) {
 if (window.YT && window.YT.Player) { cb(); return; }
 const prev = window.onYouTubeIframeAPIReady;
 window.onYouTubeIframeAPIReady = () => { ytApiReady = true; if (prev) prev(); cb(); };
 if (!ytApiLoading) { ytApiLoading = true; const tag = document.createElement('script'); tag.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(tag); }
}
async function saveLessonDuration(key, sec) {
 if (!sec || !isFinite(sec)) return;
 courseVideos[key] = { ...(courseVideos[key] || {}), duration_sec: Math.round(sec) };
 buildCourseBody();
 try {
 const res = await fetch('/.netlify/functions/course-set-video', {
 method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
 body: JSON.stringify({ lesson_key: key, duration_sec: Math.round(sec) }),
 });
 // The on-screen number above updated optimistically the moment this ran --
 // that's a LOCAL preview only, not proof the DB has it. If this save
 // fails, surface it (admin-only path) instead of swallowing it silently,
 // since a silent failure here previously made "it looks saved on my
 // screen" a false signal for whether other users would see it too.
 if (!res.ok) toast(' Duration save failed for ' + key + ' — students may still see "soon"');
 } catch (e) { toast(' Duration save failed for ' + key + ' (network) — students may still see "soon"'); }
}
function captureLessonDuration(key, url) {
 if (!userIsAdmin || !url) return;
 if (courseVideos[key] && courseVideos[key].duration_sec) return; // already have the real one
 if (/youtube|youtu\.be/.test(url)) {
 ensureYtApi(() => {
 try {
 new YT.Player('ytLessonFrame', { events: { onReady: (e) => { const d = e.target.getDuration(); if (d) saveLessonDuration(key, d); } } });
 } catch (err) {}
 });
 } else if (!/vimeo\.com/.test(url)) {
 const v = document.querySelector('#lessonPlayer video');
 if (v) v.addEventListener('loadedmetadata', () => saveLessonDuration(key, v.duration), { once: true });
 }
}

async function openCourse() {
 showView('course');
 // Load the public list (which lessons have a video + how long), plus
 // unlocks + progress for logged-in users. The real playable `url` is
 // deliberately NOT selectable here (see supabase/schema-phase25.sql) --
 // it only ever comes from the tier-gated lesson-video.js function, fetched
 // per-lesson when the student actually opens one (see openLesson()).
 try {
 const { data: v } = await sb.from('course_videos').select('lesson_key, has_video, duration_sec');
 courseVideos = {}; (v || []).forEach((r) => { courseVideos[r.lesson_key] = { hasVideo: r.has_video, duration_sec: r.duration_sec }; });
 } catch (e) {}
 if (user && !preview) {
 try { const { data: u } = await sb.from('module_unlocks').select('module_key').eq('user_id', user.id); courseUnlocks = new Set((u || []).map((r) => r.module_key)); } catch (e) {}
 try { const { data: p } = await sb.from('course_progress').select('lesson_key').eq('user_id', user.id); courseProgress = new Set((p || []).map((r) => r.lesson_key)); } catch (e) {}
 }
 // Tier-aware banner: show what they own and the next tier up (money-only upgrade).
 const tier = atelierTier();
 const TIER_LABEL = ['', 'Starter', 'Creator', 'Empire'];
 // 10 Aug 2026: Atelier Starter/Creator/Empire are paused server-side
 // (netlify/functions/_packs.js) -- these buy/upgrade buttons used to hit
 // that checkout directly (buy('atelier_starter'|...)) and would now fail.
 // Existing owners (tier > 0, via module_unlocks) keep full access to what
 // they already own; only the buy/upgrade CTA is swapped for a paused note.
 $('courseLockMsg').innerHTML = tier >= 3
 ? '<div class="course-badge ok"> Empire — full access unlocked</div>'
 : (tier > 0
 ? `<div class="course-badge ok"> ${TIER_LABEL[tier]} tier active</div>`
 : '<div class="course-badge"> New enrollment is paused for now — check back soon</div>');
 // pillar tabs
 $('pillarTabs').innerHTML = COURSE.map((p) => `<button class="ptab${p.key === coursePillar ? ' active' : ''}" data-p="${p.key}">${p.name}</button>`).join('');
 $('pillarTabs').querySelectorAll('.ptab').forEach((b) => b.onclick = () => { coursePillar = b.dataset.p; openCourse(); });
 // progress
 const totalLessons = COURSE.reduce((a, p) => a + p.modules.reduce((b, m) => b + m.lessons.length, 0), 0);
 const done = courseProgress.size;
 $('cpFill').style.width = totalLessons ? Math.round((done / totalLessons) * 100) + '%' : '0%';
 $('cpText').textContent = `${done}/${totalLessons} lessons complete`;
 buildCourseBody();
 buildCourseResources();
 loadAtelierFeed();
}
function buildCourseResources() {
 const p = COURSE.find((x) => x.key === coursePillar);
 const resources = (p && p.resources) || [];
 const wrap = $('courseResources');
 if (!resources.length) { wrap.style.display = 'none'; return; }
 wrap.style.display = 'block';
 $('courseResourceList').innerHTML = resources.map((r) => `
 <a class="res-card" href="${r.url}" target="_blank" rel="noopener">
 <div class="res-ic">⬇</div>
 <div><div class="res-t">${r.title}</div><div class="res-d">${r.desc || ''}</div></div>
 </a>`).join('');
}
function buildCourseBody() {
 const p = COURSE.find((x) => x.key === coursePillar); if (!p) return;
 $('courseSub') && (void 0);
 $('courseBody').innerHTML = p.modules.map((m, mi) => {
 const unlocked = moduleUnlocked(m.key, p.key);
 const lessons = m.lessons.map((l) => {
 const vid = courseVideos[l.key];
 const hasVid = !!(vid && vid.hasVideo);
 const doneCls = courseProgress.has(l.key) ? ' done' : '';
 return `<div class="lrow${doneCls}" data-l="${l.key}" data-locked="${unlocked ? '' : '1'}">
 <span class="lr-ic">${courseProgress.has(l.key) ? '' : (unlocked ? '▶' : '')}</span>
 <span class="lr-t">${l.n} ${l.title}</span>
 <span class="lr-d">${hasVid ? '' : '<i>soon</i> '}${lessonDurLabel(vid, l)}</span>
 </div>`;
 }).join('');
 // Open/closed state persists in expandedModules (keyed by the module's
 // real key, not this render's array index) — buildCourseBody() re-runs
 // every time openCourse() does (e.g. just switching back to the Create
 // tab), which used to silently reset every accordion to closed since the
 // old code only tracked state as live DOM style with nothing backing it.
 const isOpen = expandedModules.has(m.key);
 return `<div class="cmod">
 <div class="cmod-h" data-acc="${mi}" data-mkey="${m.key}">
 <div><div class="cmod-t">${m.title}</div><div class="cmod-s">${m.lessons.length} lessons${unlocked ? '' : ' · locked'}</div></div>
 <span class="cmod-x">${unlocked ? '▾' : `<button class="btn gold sm" data-unlock="${m.key}">Unlock · 100 cr</button>`}</span>
 </div>
 <div class="cmod-body" id="acc${mi}" style="display:${isOpen ? 'block' : 'none'}">${lessons}</div>
 </div>`;
 }).join('');
 // accordion
 $('courseBody').querySelectorAll('.cmod-h').forEach((h) => h.onclick = (e) => {
 if (e.target.closest('[data-unlock]')) return;
 const b = document.getElementById('acc' + h.dataset.acc);
 if (!b) return;
 const open = b.style.display === 'none';
 b.style.display = open ? 'block' : 'none';
 if (open) expandedModules.add(h.dataset.mkey); else expandedModules.delete(h.dataset.mkey);
 });
 $('courseBody').querySelectorAll('[data-unlock]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); unlockModule(b.dataset.unlock); });
 $('courseBody').querySelectorAll('.lrow').forEach((r) => r.onclick = () => {
 if (r.dataset.locked) { toast(' Unlock this module first'); return; }
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
 toast(' Module unlocked!');
 buildCourseBody();
 } catch (e) { toast(e.message || 'Could not unlock'); }
}
let curLesson = null;
// Fetches the real, playable URL for one lesson from the tier-gated
// endpoint -- course_videos.url is no longer publicly readable (phase 25),
// so this is the only place a real video link ever reaches the client, and
// only once the server has independently re-checked the same tier/module
// access moduleUnlocked() already checked here for the UI.
async function fetchLessonUrl(key) {
 try {
 const res = await fetch('/.netlify/functions/lesson-video', {
 method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
 body: JSON.stringify({ lesson_key: key }),
 });
 const d = await res.json().catch(() => ({}));
 if (!res.ok) return { url: null, error: d.error || 'Could not load video.' };
 return { url: d.url || null, error: null };
 } catch (e) { return { url: null, error: 'Network error loading video.' }; }
}
async function openLesson(key) {
 // find lesson (and its module + pillar, so the lock check can't be skipped
 // by calling this directly — the row click handler isn't the only gate)
 let found = null, modOf = null, pillarOf = null;
 COURSE.forEach((p) => p.modules.forEach((m) => m.lessons.forEach((l) => { if (l.key === key) { found = l; modOf = m; pillarOf = p; } })));
 if (!found) return;
 if (!moduleUnlocked(modOf.key, pillarOf.key)) { toast(' Unlock this module first'); return; }
 curLesson = found;
 showView('lesson');
 // Everything that doesn't need the real video URL renders immediately --
 // only the player itself waits on the network round-trip below.
 $('lessonPlayer').innerHTML = '<div class="lp-empty"> Loading…</div>';
 $('lessonPlayer').style.position = 'relative';
 $('lessonPlayer').classList.toggle('wide', found.aspect === '16:9');
 $('lessonTitle').textContent = found.n + ' · ' + found.title;
 const durLbl = lessonDurLabel(courseVideos[key], found);
 $('lessonMeta').innerHTML = `<span class="muted">${modOf.title}${durLbl ? ' · ' + durLbl : ''}</span>`;
 const hasTask = /vault-action/.test(found.notes || '');
 $('lessonBody').innerHTML = (found.notes
 ? `<div class="vault-note"><div class="vault-h"> The Vault — read the lesson</div>${found.notes}</div>`
 : '') + (hasTask
 ? `<a class="btn gold block" href="${ATELIER_WHATSAPP}" target="_blank" style="margin:4px 0 18px"> Submit this task in the discussion group</a>`
 : '');
 // mark complete
 const dn = $('lessonDone');
 const isDone = courseProgress.has(key);
 dn.textContent = isDone ? ' Completed' : ' Mark complete';
 dn.onclick = async () => {
 if (preview || !user) { showAuth('signup'); return; }
 if (courseProgress.has(key)) return;
 try { await sb.from('course_progress').insert({ user_id: user.id, lesson_key: key }); courseProgress.add(key); dn.textContent = ' Completed'; } catch (e) {}
 };
 const renderPlayer = (vidUrl) => {
 if (curLesson !== found) return; // navigated away while we were fetching
 // Shields over the two spots YouTube always keeps tappable regardless of
 // embed params: the title/channel strip at the top (shown on load/pause)
 // and the small YouTube logo watermark bottom-right (shown during
 // playback) -- YouTube's own embed terms don't allow removing that
 // logo's link, so covering it is the only way to actually block the tap.
 // Controls (play/pause/scrub/volume) stay usable since neither shield
 // covers the center or the control bar.
 const isYt = /youtube|youtu\.be/.test(vidUrl || '');
 $('lessonPlayer').innerHTML = lessonEmbed(vidUrl)
 + (isYt ? '<div oncontextmenu="return false" style="position:absolute;top:0;left:0;right:0;height:56px;z-index:5"></div>'
 + '<div oncontextmenu="return false" style="position:absolute;bottom:0;right:0;width:64px;height:44px;z-index:5"></div>'
 : '');
 captureLessonDuration(key, vidUrl);
 };
 // admin video setter -- pre-fills once the real URL lands below.
 if (userIsAdmin) {
 $('lessonAdmin').innerHTML = `<div class="lesson-admin">
 <label class="fld"> Video URL (YouTube / Vimeo / MP4) — loads for everyone</label>
 <input id="lvUrl" placeholder="https://youtu.be/… or https://…/video.mp4" value="">
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
 courseVideos[key] = { hasVideo: !!url, duration_sec: null }; // new url -> old duration no longer applies
 renderPlayer(url);
 note('lvNote', ' Saved & live', 'ok');
 } catch (e) { note('lvNote', e.message || 'Failed', 'err'); }
 $('lvSave').disabled = false; $('lvSave').textContent = 'Save video';
 };
 } else { $('lessonAdmin').innerHTML = ''; }
 // Real URL only ever comes from the gated endpoint -- never from the
 // public course_videos list fetched in openCourse().
 const { url: vidUrl, error } = await fetchLessonUrl(key);
 if (curLesson !== found) return; // navigated away while we were fetching
 if (vidUrl) {
 const lvUrl = $('lvUrl'); if (lvUrl) lvUrl.value = vidUrl;
 renderPlayer(vidUrl);
 } else {
 $('lessonPlayer').innerHTML = error && /unlock/i.test(error)
 ? `<div class="lp-empty"> ${error}</div>`
 : '<div class="lp-empty"> Video coming soon</div>';
 }
}

// ---------------- The Arena (Ria posts challenges; everyone participates in the WhatsApp group) ----------------
const ATELIER_WHATSAPP = 'https://chat.whatsapp.com/Fv4cRzOoWUi6m0tRF7vBka';
async function loadAtelierFeed() {
 const { data } = await sb.from('challenges').select('*').eq('active', true).order('created_at', { ascending: false });
 $('challengeList').innerHTML = (data && data.length) ? data.map((c) =>
 `<div class="chal"><h3>${c.title}</h3><p class="muted" style="margin:0 0 6px;font-size:14px">${c.brief || ''}</p>
 <div class="prize"> ${c.prize || ''}</div></div>`).join('')
 : '<div class="empty">No active challenge right now — check back soon.</div>';
 if (!userIsAdmin) { $('atelierAdmin').style.display = 'none'; return; }
 $('atelierAdmin').style.display = 'block';
 $('atelierAdmin').innerHTML = `<div class="shead"><h2> Post a challenge</h2></div>
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
 note('chalNote', error ? error.message : ' Posted!', error ? 'err' : 'ok');
 if (!error) { $('chalTitle').value = ''; $('chalBrief').value = ''; $('chalPrize').value = ''; loadAtelierFeed(); }
 $('chalPost').disabled = false;
 };
}

// ---------------- Mini Masterclasses (₦1,000 one-video courses) ----------------
const MINI = cfg.MINI_COURSES || [];
let miniVideos = {}; // 'mini-<key>' -> video url
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
 <div class="mini-f">${miniUnlocked(m.key) ? '<span class="mini-owned"> Unlocked</span>' : `<b>₦${(cfg.MINI_PRICE_NAIRA || 1000).toLocaleString()}</b>`}</div>
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
 <div class="mini-steps-h"> The steps — follow along with the video</div>
 ${content.steps.map((s, i) => `<div class="mini-step"><span class="mini-step-n">${i + 1}</span><div><b>${s[0]}</b><p>${s[1]}</p></div></div>`).join('')}
 </div>` : '';
 const charlab = content && content.charlab ? `
 <div class="mini-tool">
 <div class="mini-tool-h"><span class="mini-tool-ic"></span><div><b>Fuse Character Lab</b><span>The prompt-builder for your avatar scenes</span></div></div>
 <div class="mini-tool-btns">
 <a class="btn gold sm" style="flex:1" href="${cfg.CHARLAB_BUY_URL || '#'}" target="_blank" rel="noopener"> Get access</a>
 <a class="btn ghost sm" style="flex:1" href="${cfg.CHARLAB_TOOL_URL || '#'}" target="_blank" rel="noopener"> Already purchased? Open it</a>
 </div>
 </div>` : '';
 $('miniBody').innerHTML = `<div id="miniPlayer" class="lesson-player" style="position:relative">${lessonEmbed(miniVideoUrl(key))}<div style="position:absolute;top:0;left:0;right:0;height:56px;z-index:5"></div></div>
 ${steps}
 ${charlab}
 <div class="mini-upsell">
 <div class="mini-upsell-t"> Want the full system, not just one video?</div>
 <p>Fuse Atelier is the complete AI Creative Income System — every skill like this one, all in one place, plus 500 Fuse Studio credits.</p>
 <a class="btn gold block" href="https://fuse-atelier.netlify.app" target="_blank" rel="noopener">See Fuse Atelier — join at the founding price →</a>
 </div>
 ${userIsAdmin ? adminMiniVideoBox(mkey) : ''}`;
 wireMiniAdminSave(mkey);
 } else {
 $('miniBody').innerHTML = `<div class="mini-lock">
 <div style="font-size:32px"></div>
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
 <label class="fld"> Video URL (YouTube / Vimeo / MP4) — loads for everyone</label>
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
 miniVideos[mkey] = url; note('mvNote', ' Saved — live now.', 'ok');
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
 toast(' Unlocked!');
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
 title: ' Fuse Atelier', sub: 'The AI Creative Income System — 72 lessons, 20 skills.',
 owned: courseHasFull(), price: '₦60,000', go: () => routeFeature('learn'),
 });
 rows.push({
 title: ' The $500 Week', sub: 'AI UGC & influencer income — 7-day course.',
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
 <div class="ac-state">${r.owned ? '<span class="ac-owned"> Owned</span>' : r.partial ? '<span class="ac-partial">◐ Some days</span>' : `<span class="ac-price">${r.price}</span>`}</div>
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
 if (go === 'design-studio') return openDesignStudioBlank();
 if (go === 'learn') return openCourse();
 if (go === 'week' || go === '500week') return openWeek();
 if (go === 'mini') return openMiniHub();
 if (go === 'reactor' || go === 'avatar' || go === 'promptgen' || go === 'market' || go === 'flyer' || go === 'audio' || go === 'editstudio') return openStudio(go);
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
 if (jobCapReached('genNote')) return;
 lastPrompt = raw;
 const prompt = activeStudio.template.replace('{input}', raw);
 if (studioVideo) return generateStudioVideo(prompt);
 const model = $('model').value, aspect = $('aspect').value;

 const btn = $('genBtn'); btn.disabled = true; btn.textContent = 'Submitting…';
 note('genNote', '');

 try {
 const res = await fetch('/.netlify/functions/generate', {
 method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
 body: JSON.stringify({ prompt, model, aspect, count: +$('imgCount').value, res: +$('imgRes').value, reference_image_urls: refUrls.length ? refUrls : undefined }),
 });
 const data = await res.json();
 if (res.status === 402) { note('genNote', 'Out of credits — top up to keep creating.', 'err'); openBuy(); btn.disabled = false; btn.textContent = ' Generate'; return; }
 else if (res.status === 403) { note('genNote', data.error || 'Upgrade to unlock this model.', 'err'); openBuy(); btn.disabled = false; btn.textContent = ' Generate'; return; }
 else if (!res.ok) throw new Error(data.error || 'Generation failed');
 else {
 // Fire and forget, Higgsfield-style — every image is queued globally
 // and tracked in Projects, so you never have to sit here waiting;
 // reset the form immediately so the next generation can start right away.
 const ids = data.request_ids && data.request_ids.length ? data.request_ids : [data.request_id];
 $('creditCount').textContent = data.credits;
 ids.forEach((id) => queueJob({ request_id: id, endpoint: 'job-status', mediaType: 'image', label: raw.slice(0, 60), model }));
 startGlobalPoller();
 note('genNote', ` Started${ids.length > 1 ? ` (${ids.length})` : ''} — rolling in Projects now.`, 'ok');
 btn.disabled = false; btn.textContent = ' Generate';
 $('prompt').value = '';
 showView('library');
 return;
 }
 } catch (e) { note('genNote', e.message || 'Failed — credits not charged.', 'err'); btn.disabled = false; btn.textContent = ' Generate'; }
}

// ---------------- The $500 Week — AI UGC course ----------------
const WK = (window.FUSE_5WEEK) ? window.FUSE_5WEEK : { days: [] };
let weekVideos = {}; // wk-key -> video url
let weekUnlocked = false; // paid / plan / code (whole course)
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
 if (qCode) { const ok = await redeemWeekCode(qCode); if (ok) toast('Payment confirmed — welcome in! '); }
 }
 renderWeek();
}

function renderWeek() {
 const done = weekDoneSet();
 const total = WK.days.length || 1;
 $('wkFill') && ($('wkFill').style.width = Math.round((done.size / total) * 100) + '%');
 $('wkText') && ($('wkText').textContent = weekUnlocked ? `${done.size}/${total} days done` : '');
 $('weekLockMsg').innerHTML = weekUnlocked
 ? '<div class="course-badge ok"> You have full access to The $500 Week</div>'
 : '<div class="course-badge"> Paid course — unlock below to start</div>';

 // ----- access gate -----
 if (!weekUnlocked) {
 $('weekGate').innerHTML = `
 <div class="wk-pay">
 <h3>Get instant access</h3>
 <div class="price">${fmtN(WK.price)}</div>
 <button class="btn gold block" id="wkBuy"> Pay & unlock instantly →</button>
 <p class="muted" style="font-size:12px;margin-top:8px">Secure checkout via Paystack — card, bank transfer or USSD. You're unlocked the moment payment confirms, <b class="gold">plus 100 bonus credits</b> to create with.</p>
 <a class="btn ghost block" id="wkLanding" href="${WK.landingUrl || '#'}" target="_blank" rel="noopener" style="margin-top:8px"> See everything inside the course →</a>
 <div class="wk-or">— or —</div>
 <button class="btn ghost block" id="wkCredits">Unlock the full course with ${WK.creditsCost} credits</button>
 <p class="muted" style="font-size:12px;margin-top:8px">Not ready for the full course? Tap any day below to unlock just that day for ${WK.dayCredits || 50} credits.</p>
 <div class="wk-code">
 <input id="wkCode" placeholder="Already have an access code?">
 <button class="btn gold sm" id="wkRedeem">Unlock</button>
 </div>
 <div class="note" id="wkPayNote"></div>
 </div>`;
 $('wkBuy').onclick = buyWeekCourse;
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
 <h3>One quick step first </h3>
 <p class="muted" style="font-size:14px;margin:0 0 12px">Join the private WhatsApp discussion group — that's where you get feedback, resources and support all week. The lessons unlock the moment you're in.</p>
 <button class="btn gold block" id="wkJoin"> Join the WhatsApp group</button>
 <button class="btn ghost block" id="wkJoined" style="margin-top:8px"> I've joined — open my course</button>
 </div>`;
 $('wkJoin').onclick = () => { if (WK.whatsapp) window.open(WK.whatsapp, '_blank'); else toast('WhatsApp link not set yet'); };
 $('wkJoined').onclick = () => { try { localStorage.setItem(WK_JOIN_KEY, '1'); } catch (e) {} toast('Welcome in! '); renderWeek(); };
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
 <div class="wk-day-t">${isDone ? ' ' : ''}${d.title}</div>
 <div class="wk-day-m"><span>${d.dur}</span>${d.video ? '<span class="wk-vid-tag"> VIDEO</span>' : ''}</div>
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
 <div style="flex:1"><div class="wk-day-t">${owned ? ' ' : ''}${d.title}</div>
 <div class="wk-day-m"><span>${d.dur}</span>${d.video ? '<span class="wk-vid-tag"> VIDEO</span>' : ''}${owned ? '<span class="wk-vid-tag" style="background:rgba(61,214,140,.15);color:#3DD68C">UNLOCKED</span>' : `<span class="wk-vid-tag"> ${WK.dayCredits || 50} cr</span>`}</div></div>
 <div>${owned ? '<span style="color:var(--gold);font-weight:800">›</span>' : ''}</div></div></div>`;
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
 if (res.status === 402) { note('wkPayNote', `Not enough credits (need ${cost}) — top up, or pay for the full course directly.`, 'err'); openBuy(); return; }
 if (!res.ok) throw new Error(data.error || 'Failed');
 if (data.credits != null) $('creditCount').textContent = data.credits;
 weekDayUnlocks.add(key); toast(`Day ${d.day} unlocked! `);
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
 ? `<div class="wk-vid-slot" style="position:relative">${weekVideos[key] ? lessonEmbed(weekVideos[key]) + '<div style="position:absolute;top:0;left:0;right:0;height:56px;z-index:5"></div>' : ' Video lesson — uploading soon. The written lesson below is ready now.'}</div>`
 : '';
 const labBanner = key === 'wk-2' ? `
 <div class="wk-lab-banner" style="display:block;padding:13px 15px">
 <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
 <div class="wk-lab-ic"></div>
 <div class="wk-lab-txt"><b>Fuse Character Lab</b><span>The prompt-generator for your scene</span></div>
 </div>
 <div style="display:flex;gap:8px;flex-wrap:wrap">
 <a href="${WK.charLabBuyUrl || '#'}" target="_blank" class="btn gold sm" style="flex:1"> Get access</a>
 <a href="${WK.charLabLoginUrl || '#'}" target="_blank" class="btn ghost sm" style="flex:1"> Already purchased? Log in</a>
 </div>
 </div>` : (key === 'wk-5' || key === 'wk-6') ? `
 <div class="wk-lab-banner" style="display:block;padding:13px 15px">
 <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
 <div class="wk-lab-ic"></div>
 <div class="wk-lab-txt"><b>Fuse PitchPilot</b><span>Writes your email, WhatsApp, Instagram & LinkedIn pitch in one tap</span></div>
 </div>
 <a href="${WK.pitchPilotUrl || '#'}" target="_blank" class="btn gold sm block"> Open PitchPilot — 3 free pitches</a>
 </div>` : '';
 const adminSet = userIsAdmin && d.video ? `<div class="lesson-admin" style="margin:8px 0">
 <label class="fld"> Video URL for Day ${d.day} (YouTube unlisted / MP4)</label>
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
 <button class="btn ${done.has(key) ? 'ghost' : 'gold'} block" id="wkDone" style="margin-top:18px">${done.has(key) ? ' Completed — tap to undo' : ' Mark Day ' + d.day + ' complete'}</button>
 <a class="btn ghost block" href="${WK.whatsapp || '#'}" target="_blank" rel="noopener" style="margin-top:8px"> Submit today's task in the discussion group →</a>`;
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
 weekVideos[key] = url; note('wkvNote', 'Saved ', 'ok');
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
 if (ok) { toast('Unlocked! '); renderWeek(); }
 else { note('wkPayNote', 'That code is not valid.', 'err'); $('wkRedeem').disabled = false; }
}

async function weekUnlockCredits() {
 if (preview) { showAuth('signup'); return; }
 if (!confirm(`Unlock The $500 Week for ${WK.creditsCost} credits?`)) return;
 $('wkCredits').disabled = true;
 try {
 const res = await fetch('/.netlify/functions/unlock-module', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) }, body: JSON.stringify({ module_key: 'wk-course' }) });
 const d = await res.json();
 if (res.status === 402) { note('wkPayNote', 'Not enough credits — top up, or pay for the full course directly.', 'err'); openBuy(); $('wkCredits').disabled = false; return; }
 if (!res.ok) throw new Error(d.error || 'Failed');
 if (d.credits != null) $('creditCount').textContent = d.credits;
 weekUnlocked = true; toast('Unlocked! '); renderWeek();
 } catch (e) { note('wkPayNote', e.message || 'Could not unlock', 'err'); $('wkCredits').disabled = false; }
}

// ---------------- reactor (multi-AI) ----------------
let rcModel = null;
let rcRefs = []; // attached image URLs (vision for text models, reference for image models)
function buildReactor() {
 $('reactorTitle').textContent = cfg.REACTOR_NAME;
 $('reactorList').innerHTML = cfg.REACTOR_MODELS.map((m) =>
 `<div class="rcard ${m.live ? '' : 'soon'}" data-id="${m.id}">
 <div class="rn">${m.name}</div><div class="rb">${m.badge}</div>
 <div class="rc">${m.live ? m.credits + (m.kind === 'image' ? ' cr / image' : ' cr / msg') : 'Coming soon'}</div></div>`).join('');
 $('reactorList').querySelectorAll('.rcard').forEach((el) => el.onclick = () => {
 const m = cfg.REACTOR_MODELS.find((x) => x.id === el.dataset.id);
 $('reactorChat').style.display = 'block'; rcRefs = []; renderRcThumbs(); $('rcOut').innerHTML = ''; note('rcNote', '');
 if ($('rcIcon')) $('rcIcon').innerHTML = svgIcon(m.kind === 'image' ? 'camera' : 'sparkle');
 if (!m.live) { note('rcNote', `${m.name} comes online soon — video AIs are being connected.`, 'err'); $('rcName').textContent = m.name; $('rcCost').textContent = 'Coming soon'; return; }
 rcModel = m;
 const isImg = m.kind === 'image';
 $('rcName').textContent = m.name;
 $('rcCost').textContent = isImg ? (m.credits + ' credits per image · attach a photo to edit it') : (m.credits + ' credits per message');
 $('rcInput').placeholder = isImg ? 'Describe the image to create — or attach a photo and say how to change it…' : 'Ask anything — captions, scripts, product names, ad copy… (attach an image to ask about it)';
 $('rcAspect').style.display = isImg ? 'inline-block' : 'none';
 $('rcAttachBtn').textContent = isImg ? ' Add reference photo' : ' Add image (1 max)';
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
 pollGrid(ids, $('rcOut'), 'rcNote', btn, 'Send', data.watermark, 'Fuse Reactor image');
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
let omniEditClips = []; // uploaded video clip URLs (up to 10)
let omniEditAudio = ''; // optional audio URL
let omniRefImages = []; // up to 9
let omniRefAudios = []; // up to 3
let omniAvatarImg = '';
let omniAvatarAudio = '';

function omniSwitch(tab) {
 document.querySelectorAll('[data-omni]').forEach((b) => b.classList.toggle('active', b.dataset.omni === tab));
 $('omniEditPane').style.display = tab === 'edit' ? 'block' : 'none';
 $('omniRefPane').style.display = tab === 'ref' ? 'block' : 'none';
 $('omniAvatarPane').style.display = tab === 'avatar' ? 'block' : 'none';
 $('omniDialoguePane').style.display = tab === 'dialogue' ? 'block' : 'none';
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
 try { omniEditAudio = await omniUpload(files[0], 'audio'); $('omniEditAudioName').textContent = ' ' + files[0].name; note('omniEditNote', ''); }
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
 else { $('creditCount').textContent = data.credits; pollGrid([data.request_id], $('omniEditResult'), 'omniEditNote', btn, ' Edit videos', false, 'Omni video edit'); return; }
 } catch (e) { note('omniEditNote', e.message || 'Failed', 'err'); }
 btn.disabled = false; btn.textContent = ' Edit videos';
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
 $('omniRefAudioNames').textContent = omniRefAudios.length ? ` ${omniRefAudios.length} audio file(s) added` : '';
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
 else { $('creditCount').textContent = data.credits; pollGrid([data.request_id], $('omniRefResult'), 'omniRefNote', btn, ' Generate', false, 'Omni reference edit'); return; }
 } catch (e) { note('omniRefNote', e.message || 'Failed', 'err'); }
 btn.disabled = false; btn.textContent = ' Generate';
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
 try { omniAvatarAudio = await omniUpload(files[0], 'audio'); $('omniAvatarAudioName').textContent = ' ' + files[0].name; note('omniAvatarNote', ''); }
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
 else { $('creditCount').textContent = data.credits; pollGrid([data.request_id], $('omniAvatarResult'), 'omniAvatarNote', btn, ' Generate talking video', false, 'Omni avatar video'); return; }
 } catch (e) { note('omniAvatarNote', e.message || 'Failed', 'err'); }
 btn.disabled = false; btn.textContent = ' Generate talking video';
}

// ---------------- Lip-Sync Dialogue (Omni Studio) ----------------
let dlgVideoUrl = '';
let dlgAudioUrl = '';
let dlgAudioMode = false; // false = type a script (Kling built-in voice), true = upload my own audio

async function dlgPickVideo(files) {
 if (!files || !files[0]) return;
 note('dlgNote', 'Uploading…', 'ok');
 try {
 dlgVideoUrl = await omniUpload(files[0], 'video');
 $('dlgVideoPreview').src = dlgVideoUrl; $('dlgVideoPreview').style.display = 'block';
 note('dlgNote', '');
 } catch (e) { note('dlgNote', e.message || 'Upload failed', 'err'); }
}
async function dlgPickAudio(files) {
 if (!files || !files[0]) return;
 note('dlgNote', 'Uploading…', 'ok');
 try { dlgAudioUrl = await omniUpload(files[0], 'audio'); $('dlgAudioName').textContent = ' ' + files[0].name; note('dlgNote', ''); }
 catch (e) { note('dlgNote', e.message || 'Upload failed', 'err'); }
}
function dlgToggleAudio() {
 dlgAudioMode = !dlgAudioMode;
 const btn = $('dlgAudioToggle');
 btn.setAttribute('aria-pressed', String(dlgAudioMode));
 btn.textContent = dlgAudioMode ? '🎙 Use my own audio: ON' : '🎙 Use my own audio: OFF';
 btn.classList.toggle('gold', dlgAudioMode);
 btn.classList.toggle('ghost', !dlgAudioMode);
 $('dlgTextWrap').style.display = dlgAudioMode ? 'none' : 'block';
 $('dlgAudioWrap').style.display = dlgAudioMode ? 'block' : 'none';
}
async function dlgGenerate() {
 if (preview) { showAuth('signup'); return; }
 if (!dlgVideoUrl) return note('dlgNote', 'Upload the video you want dialogue added to.', 'err');
 if (dlgAudioMode && !dlgAudioUrl) return note('dlgNote', 'Add an audio clip.', 'err');
 if (!dlgAudioMode && !$('dlgScript').value.trim()) return note('dlgNote', 'Write the line you want spoken.', 'err');
 const btn = $('dlgGen'); btn.disabled = true; btn.textContent = 'Starting…'; note('dlgNote', '');
 try {
 const body = { video_url: dlgVideoUrl, mode: dlgAudioMode ? 'audio' : 'text' };
 if (dlgAudioMode) { body.audio_url = dlgAudioUrl; body.duration_sec = $('dlgVideoPreview').duration || undefined; }
 else { body.text = $('dlgScript').value.trim(); body.voice_language = $('dlgLang').value; body.voice_speed = parseFloat($('dlgSpeed').value); }
 const res = await fetch('/.netlify/functions/lipsync-dialogue', {
 method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
 body: JSON.stringify(body),
 });
 const data = await res.json();
 if (res.status === 402) { note('dlgNote', 'Out of credits.', 'err'); openBuy(); }
 else if (!res.ok) throw new Error(data.error || 'Could not start the dialogue pass');
 else { $('creditCount').textContent = data.credits; pollGrid([data.request_id], $('dlgResult'), 'dlgNote', btn, ' Add dialogue', false, 'Dialogue video'); return; }
 } catch (e) { note('dlgNote', e.message || 'Failed', 'err'); }
 btn.disabled = false; btn.textContent = ' Add dialogue';
}

// ---------------- library / recent ----------------
const LIB_PAGE = 40;
let libFilter = 'all';
let libItems = []; // cached so the project preview can show prompt + settings
let libHasMore = false;
async function loadLibrary() {
 if (preview) return demoGrid('libGrid');
 let q = sb.from('generations').select('id, output_url, type, prompt, model, aspect, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).range(0, LIB_PAGE - 1);
 if (libFilter !== 'all') q = q.eq('type', libFilter === 'image' ? 'image' : libFilter);
 const { data } = await q;
 libItems = data || [];
 libHasMore = libItems.length === LIB_PAGE;
 const g = $('libGrid');
 if (!libItems.length && !pendingJobs.length) { g.innerHTML = '<div class="empty" style="grid-column:1/-1">Nothing here yet — create something </div>'; return; }
 g.innerHTML = libItems.map((x, i) => `<div class="projitem" onclick="window.fuseProject(${i})">${libItemMedia(x)}</div>`).join('');
 renderLibLoadMore();
 // Still-processing jobs render as spinner cards ahead of finished work —
 // this is what makes a generation started elsewhere actually visible
 // here the moment you land on Projects, not just after its next poll tick.
 renderLibraryPending();
}
function libItemMedia(x) {
 return x.type === 'video' ? `<video src="${x.output_url}" muted loop playsinline></video>`
 : x.type === 'audio' ? `<div class="projitem-audio"></div>`
 : `<img src="${x.output_url}">`;
}
function renderLibLoadMore() {
 const old = document.getElementById('libLoadMore'); if (old) old.remove();
 if (!libHasMore) return;
 const g = $('libGrid');
 const btn = document.createElement('button');
 btn.id = 'libLoadMore'; btn.className = 'btn ghost block';
 btn.style.gridColumn = '1/-1'; btn.style.marginTop = '10px';
 btn.textContent = 'Load more';
 btn.onclick = loadMoreLibrary;
 g.appendChild(btn);
}
async function loadMoreLibrary() {
 const btn = $('libLoadMore'); if (btn) { btn.disabled = true; btn.textContent = 'Loading…'; }
 let q = sb.from('generations').select('id, output_url, type, prompt, model, aspect, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).range(libItems.length, libItems.length + LIB_PAGE - 1);
 if (libFilter !== 'all') q = q.eq('type', libFilter === 'image' ? 'image' : libFilter);
 const { data } = await q;
 const more = data || [];
 const startIdx = libItems.length;
 libItems = libItems.concat(more);
 libHasMore = more.length === LIB_PAGE;
 const g = $('libGrid');
 g.insertAdjacentHTML('beforeend', more.map((x, j) => `<div class="projitem" onclick="window.fuseProject(${startIdx + j})">${libItemMedia(x)}</div>`).join(''));
 renderLibLoadMore();
}
// Project preview — shows the creation plus the prompt + settings used to make it.
window.fuseProject = (i) => {
 const x = libItems[i]; if (!x) return;
 lbUrl = x.output_url;
 const media = (x.type === 'video')
 ? `<video src="${x.output_url}" controls autoplay loop muted playsinline style="max-width:92vw;max-height:56vh;border-radius:14px"></video>`
 : (x.type === 'audio')
 ? `<audio src="${x.output_url}" controls style="width:92vw;max-width:420px"></audio>`
 : `<img src="${x.output_url}" style="max-width:92vw;max-height:56vh;border-radius:14px">`;
 const modelName = (cfg.IMAGE_MODELS.concat(cfg.VIDEO_MODELS, cfg.TOOL_MODELS).find((m) => m.slug === x.model) || {}).name || x.model || '—';
 const when = x.created_at ? new Date(x.created_at).toLocaleDateString() : '';
 const frameTools = (x.type === 'video')
 ? `<div class="frame-tools"><div class="ft-h"> Extract frames (chain your next clip)</div>
 <div class="ft-row">
 <button class="btn ghost sm" onclick="fuseSaveFrame('${x.output_url}','start')">⬇ Start frame</button>
 <button class="btn ghost sm" onclick="fuseSaveFrame('${x.output_url}','end')">⬇ End frame</button>
 <button class="btn gold sm" onclick="fuseUseEndAsStart('${x.output_url}')"> Use end frame as next start</button>
 </div><div class="note" id="ftNote"></div></div>`
 : '';
 const resyncBox = (x.type === 'video' && x.model === 'avatar-video') ? `<div id="resyncBox" style="margin-top:10px"></div>` : '';
 const meta = `<div class="projmeta">
 <div class="pm-row"><span>Model</span><b>${modelName}</b></div>
 ${x.aspect ? `<div class="pm-row"><span>Aspect</span><b>${x.aspect}</b></div>` : ''}
 ${when ? `<div class="pm-row"><span>Created</span><b>${when}</b></div>` : ''}
 ${x.prompt ? `<div class="pm-prompt"><span>Prompt used</span><p>${(x.prompt || '').replace(/</g, '&lt;')}</p>
 <button class="btn ghost sm" onclick="window.fuseReuse(${i})">↺ Use this prompt again</button></div>` : ''}
 ${resyncBox}
 <button class="btn ghost sm" style="margin-top:10px;color:#ff9a8a;border-color:#ff9a8a" onclick="window.fuseDeleteProject(${i})">Delete this project</button>
 <div class="note" id="lbDeleteNote"></div>
 </div>`;
 $('lbContent').innerHTML = media + frameTools + meta;
 $('lightbox').style.display = 'flex';
 if (resyncBox) loadResyncBox(x.output_url);
};
async function loadResyncBox(outputUrl) {
 const box = $('resyncBox'); if (!box) return;
 box.innerHTML = '<div class="muted" style="font-size:12px">Checking resync status…</div>';
 const { data: av } = await sb.from('avatar_videos').select('id, mode, resynced_url, resync_credits, total_duration_sec').eq('output_url', outputUrl).eq('user_id', user.id).maybeSingle();
 if (!av) { box.innerHTML = ''; return; }
 if (av.resynced_url) {
 box.innerHTML = `<div class="pm-row"><span>Resync</span><b style="color:var(--cyan)">Ready</b></div>
 <video src="${av.resynced_url}" controls playsinline style="width:100%;border-radius:12px;margin-top:6px"></video>
 <div class="muted" style="font-size:11px;margin-top:4px">This is the lipsync-resynced version — the original above is untouched.</div>`;
 return;
 }
 // 10 Aug 2026: was / 0.016 * 1.6 (stale) -- must track RESYNC_PER_SEC_USD's
 // CREDIT_USD/RESYNC_MARGIN in netlify/functions/_packs.js.
 const estCredits = av.total_duration_sec ? Math.max(1, Math.ceil(av.total_duration_sec * 0.08 / 0.11 * 2.0)) : null;
 // Motion-mode videos never had word-accurate lip-sync in the first place —
 // Seedance has no audio input at all, it just animates a scene from a
 // camera-motion prompt. This pass is the ONLY way to get the mouth to
 // actually match the narration on a motion video, so it's surfaced as a
 // clear recommendation here instead of a generic, easy-to-miss button.
 const isMotion = av.mode === 'motion';
 const heading = isMotion
 ? `<div class="muted" style="font-size:12px;margin-bottom:6px"> Motion videos don't lip-sync to the exact words on their own — run this once to snap the mouth to your narration.</div>`
 : '';
 box.innerHTML = `${heading}<button class="btn ${isMotion ? 'gold' : 'ghost'} sm" id="resyncBtn">${isMotion ? 'Get precision lip-sync' : 'Resync lipsync'}${estCredits ? ` (~${estCredits} credits)` : ''}</button><div class="note" id="resyncNote"></div>`;
 $('resyncBtn').onclick = async () => {
 const btn = $('resyncBtn'); btn.disabled = true; btn.textContent = 'Starting…';
 try {
 const res = await fetch('/.netlify/functions/avatar-video-resync', {
 method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
 body: JSON.stringify({ avatar_video_id: av.id }),
 });
 const d = await res.json();
 if (res.status === 402) { note('resyncNote', 'Out of credits — top up.', 'err'); openBuy(); btn.disabled = false; btn.textContent = 'Resync lipsync'; return; }
 if (!res.ok) throw new Error(d.error || 'Failed');
 $('creditCount').textContent = d.credits;
 queueJob({ request_id: d.request_id, endpoint: 'job-status', mediaType: 'video', label: 'Lipsync resync', model: 'resync' });
 startGlobalPoller();
 note('resyncNote', ' Started — this can take a few minutes, check back on this project.', 'ok');
 } catch (e) { note('resyncNote', e.message || 'Failed', 'err'); btn.disabled = false; btn.textContent = 'Resync lipsync'; }
 };
}
// Re-open the studio with this project's prompt prefilled.
window.fuseReuse = (i) => {
 const x = libItems[i]; if (!x) return;
 $('lightbox').style.display = 'none';
 openStudio('generate');
 if (x.prompt) $('prompt').value = x.prompt;
};
window.fuseDeleteProject = async (i) => {
 const x = libItems[i]; if (!x) return;
 if (!confirm('Delete this project? This can\'t be undone.')) return;
 try {
 const res = await fetch('/.netlify/functions/delete-generation', {
 method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
 body: JSON.stringify({ id: x.id }),
 });
 const d = await res.json();
 if (!res.ok) throw new Error(d.error || 'Failed');
 $('lightbox').style.display = 'none';
 loadLibrary();
 } catch (e) { note('lbDeleteNote', e.message || 'Could not delete.', 'err'); }
};
function demoGrid(id) { $(id).innerHTML = Array(6).fill('<div class="empty" style="aspect-ratio:1;display:grid;place-items:center;padding:0"></div>').join(''); }

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
async function adminCreateInvoice() {
 const client_name = $('invClientName').value.trim();
 const amount_naira = parseInt($('invAmount').value, 10) || 0;
 const description = $('invDescription').value.trim();
 if (!client_name) return note('invNote', 'Enter the client\'s name.', 'err');
 if (amount_naira <= 0) return note('invNote', 'Enter a valid amount.', 'err');
 const btn = $('invCreate'); btn.disabled = true; btn.textContent = 'Creating…';
 try {
 const res = await fetch('/.netlify/functions/freelance-invoice', {
 method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
 body: JSON.stringify({ client_name, amount_naira, description }),
 });
 const d = await res.json();
 if (!res.ok) throw new Error(d.error || 'Failed');
 try { await navigator.clipboard.writeText(d.authorization_url); } catch (e) {}
 note('invNote', `Link copied — send it to ${client_name}: <a href="${d.authorization_url}" target="_blank" rel="noopener" class="gold">${d.authorization_url}</a>`, 'ok');
 $('invClientName').value = ''; $('invAmount').value = ''; $('invDescription').value = '';
 } catch (e) { note('invNote', e.message || 'Failed', 'err'); }
 btn.disabled = false; btn.textContent = 'Create invoice link';
}
async function adminLookup() {
 const email = $('lookupEmail').value.trim();
 if (!email) return note('lookupNote', 'Enter an email.', 'err');
 const btn = $('lookupBtn'); btn.disabled = true; btn.textContent = 'Checking…';
 try {
 const res = await fetch('/.netlify/functions/admin-lookup', {
 method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
 body: JSON.stringify({ email }),
 });
 const d = await res.json();
 if (!res.ok) throw new Error(d.error || 'Failed');
 const courseNames = { 'wk-course': 'The $500 Week', 'atelier-full': 'Fuse Atelier (legacy full)', 'atelier-starter': 'Fuse Atelier — Starter', 'atelier-creator': 'Fuse Atelier — Creator', 'atelier-empire': 'Fuse Atelier — Empire' };
 const unlockList = (d.unlocks || []).map((k) => courseNames[k] || k);
 const lines = [
 `Plan: <b>${d.plan}</b>${d.is_admin ? ' (admin)' : ''}`,
 `Credits: <b>${d.credits}</b>`,
 `Courses unlocked: <b>${unlockList.length ? unlockList.join(', ') : 'none'}</b>`,
 ];
 note('lookupNote', lines.join('<br>'), 'ok');
 } catch (e) { note('lookupNote', e.message || 'Failed', 'err'); }
 btn.disabled = false; btn.textContent = 'Check access';
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
 note('adminNote', ` Added ${d.credits} credits to ${d.email}.`, 'ok');
 $('adminEmail').value = ''; $('adminCredits').value = '';
 } catch (e) { note('adminNote', e.message || 'Failed', 'err'); }
 btn.disabled = false; btn.textContent = label;
}
async function adminRevoke() {
 const email = $('revokeEmail').value.trim();
 if (!email) return note('revokeNote', 'Enter the buyer\'s email.', 'err');
 const credits = parseInt($('revokeCredits').value, 10) || 0;
 const revoke_plan = $('revokePlanCheck').checked;
 if (credits <= 0 && !revoke_plan) return note('revokeNote', 'Enter a credit amount, or check "drop to Free plan".', 'err');
 const btn = $('revokeBtn'); btn.disabled = true; btn.textContent = 'Revoking…';
 try {
 const res = await fetch('/.netlify/functions/admin-revoke', {
 method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
 body: JSON.stringify({ email, credits, revoke_plan }),
 });
 const d = await res.json();
 if (!res.ok) throw new Error(d.error || 'Failed');
 const shortfall = d.short_of_requested > 0 ? ` (${d.short_of_requested} short — they'd already spent some of it)` : '';
 note('revokeNote', ` Removed ${d.credits_removed} credits${shortfall}${d.plan_revoked ? ', dropped to Free plan' : ''} for ${d.email}.`, 'ok');
 $('revokeEmail').value = ''; $('revokeCredits').value = ''; $('revokePlanCheck').checked = false;
 } catch (e) { note('revokeNote', e.message || 'Failed', 'err'); }
 btn.disabled = false; btn.textContent = 'Revoke';
}
// Matches each course/tier's real Paystack credit allotment (_packs.js) so a
// manually-granted buyer (paid by transfer, whatsapp, etc.) gets the exact
// same credits as someone who checked out normally for that tier — not a
// flat guessed number.
// 10 Aug 2026 reprice -- must track _packs.js's course bonus credits exactly
// (admin-grant.js still honors manual course grants even while the Atelier
// PACKS entries themselves are paused, so this stays live/updated).
const ADMIN_COURSE_CREDITS = { 'atelier-starter': 17, 'atelier-creator': 67, 'atelier-empire': 200, 'wk-course': 17, 'atelier-full': 83 };
function adminCourseBonusForSelection() { return ADMIN_COURSE_CREDITS[$('adminCourse').value] || 0; }
function updateAdminCourseBonusLabel() {
 const n = adminCourseBonusForSelection();
 $('adminCourseBonusLabel').textContent = n ? `Also give ${n} bonus credits (this tier's normal allotment)` : `Also give bonus credits`;
}
async function adminGrantCourse() {
 const email = $('adminEmail').value.trim();
 if (!email) return note('adminNote', 'Enter the buyer\'s email.', 'err');
 const course = $('adminCourse').value;
 const bonus_credits = $('adminCourseBonus').checked ? adminCourseBonusForSelection() : 0;
 const btn = $('adminGrantCourse'); btn.disabled = true; btn.textContent = 'Unlocking…';
 try {
 const res = await fetch('/.netlify/functions/admin-grant', {
 method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
 body: JSON.stringify({ email, course, bonus_credits }),
 });
 const d = await res.json();
 if (!res.ok) throw new Error(d.error || 'Failed');
 note('adminNote', ` ${course} granted for ${d.email}${d.credits ? ` (+${d.credits} credits)` : ''}.`, 'ok');
 $('adminEmail').value = '';
 } catch (e) { note('adminNote', e.message || 'Failed', 'err'); }
 btn.disabled = false; btn.textContent = 'Grant this tier for this email';
}

// ---------------- affiliate payout ----------------
async function requestPayout() {
 if (preview) { showAuth('signup'); return; }
 const { error } = await sb.from('payout_requests').insert({ user_id: user.id, amount_naira: 0, status: 'requested' });
 note('payoutNote', error ? error.message : ' Request received. Verified affiliates are paid by transfer.', error ? 'err' : 'ok');
}

// ---------------- buy / Paystack ----------------
function openBuy() { renderPacks(); note('buyNote', ''); showPackList(); $('buyOverlay').style.display = 'flex'; }
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
 // Every plan sees every pack, including one-time credit top-ups -- free
 // users used to only see subscription/course tiers here (top-ups were
 // subscriber-only), so a free user who just wanted a few more credits had
 // no way to buy them without subscribing. Tools (upscale, background-
 // remove, object-erase) still need a subscription regardless of credit
 // balance -- that's a separate, unrelated gate, see isLocked().
 const packs = cfg.PACKS;
 const promo = promoActive();
 $('packList').innerHTML = packs.map((p) => {
 const credits = promoCreditsFor(p);
 const boosted = promo && credits !== p.credits;
 const mult = promoMultFor(p);
 return `<div class="pk${boosted ? ' pk-promo' : ''}" data-pack="${p.key}">
 ${boosted ? `<span class="pk-badge">${mult ? mult + 'x' : ''} LAUNCH</span>` : ''}
 <div><div class="pkn">${p.name}${p.featured ? ' ⭐' : ''}</div>
 <div class="pkc">${boosted
 ? `<span class="pk-was">${p.credits} credits</span> <span class="pk-arrow">→</span> <b class="gold pk-now">${credits} credits</b>`
 : `<b class="gold">${credits} credits</b>`} · ${p.note}${p.kind === 'sub' ? ' /mo' : ''}</div></div>
 <div class="pka">${price(p.naira)}</div></div>`;
 }).join('');
 if (promo) $('packList').insertAdjacentHTML('afterbegin', '<div class="pk-promo-strip"> FULL LAUNCH PROMO — boosted credits, 2 days only</div>');
 $('packList').querySelectorAll('.pk').forEach((el) => el.onclick = () => buy(el.dataset.pack, el));
 $('curToggle').textContent = showUsd ? 'Show ₦' : 'Show $';
}
async function buy(pack, el) {
 // No account required to start checkout -- straight to Paystack on your
 // own email, account only gets created (and a password only gets set)
 // AFTER payment actually confirms. See startGuestCheckout() /
 // claim-guest-account.js. This replaced an earlier version that showed
 // the signup modal first: that meant someone who just tapped "pay
 // ₦25,000" landed on a screen asking them to create an account before
 // Paystack ever opened, which is exactly the confusion this fixes.
 if (preview) { startGuestCheckout(pack); return; }
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
// The $500 Week's own buy button -- same paystack-init flow as buy() above,
// just a fixed pack ('wk_course') instead of whatever the user picked from
// the credit-pack list. Replaces the old "message me on WhatsApp to pay"
// flow entirely -- every payment on Fuse Studio goes through Paystack now.
async function buyWeekCourse() {
 const btn = $('wkBuy'); if (btn) { btn.disabled = true; btn.textContent = 'Opening secure checkout…'; }
 note('wkPayNote', '');
 try {
 const res = await fetch('/.netlify/functions/paystack-init', {
 method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
 body: JSON.stringify({ pack: 'wk_course' }),
 });
 const data = await res.json();
 if (!res.ok) throw new Error(data.error || 'Could not start payment');
 window.location.href = data.authorization_url;
 } catch (e) {
 note('wkPayNote', e.message || 'Could not start checkout — try again.', 'err');
 if (btn) { btn.disabled = false; btn.textContent = ' Pay & unlock instantly →'; }
 }
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
 <div class="pm-row"><span>Account no.</span><b>${bank.number} <a class="gold" style="cursor:pointer" onclick="navigator.clipboard.writeText('${bank.number}');this.textContent=''">copy</a></b></div>
 <div class="pm-row"><span>Account name</span><b>${bank.holder || ''}</b></div>`);
 $('payDetails').innerHTML = `
 <div class="pay-amt">${p.name} · <b class="gold">${amount}</b></div>
 <div class="pm-prompt" style="border:0;padding:0;margin:6px 0 12px"><p style="color:var(--gold)">You get ${p.credits} credits</p></div>
 ${rows.length ? `<div class="projmeta" style="margin-bottom:12px">${rows.join('')}</div>` : ''}
 ${pay.selar ? `<a class="btn gold block" href="${pay.selar}" target="_blank" rel="noopener" style="margin-bottom:8px"> Pay with card / Selar</a>` : ''}
 ${wa ? `<a class="btn ${pay.selar ? 'ghost' : 'gold'} block" href="${wa}" target="_blank" rel="noopener"> Send payment proof on WhatsApp</a>` : ''}
 <p class="muted" style="font-size:12px;margin-top:10px">After you pay, send your receipt + this email (<b>${email}</b>) on WhatsApp. Your credits are added within minutes. </p>`;
 $('packList').style.display = 'none';
 const t = $('curToggle'); if (t) t.style.display = 'none';
 $('payManual').style.display = 'block';
}

// ---------------- guest checkout (pay first, account after) ----------------
// The whole point: someone tapping a landing-page tier button never sees a
// signup form. They give an email, go straight to Paystack, and only get
// asked to set a password once a real payment has actually confirmed (see
// the claim-account flow below, triggered off ?paid=1&guest=1).
// Tapping a tier goes straight to Paystack -- no prompt of any kind on our
// side. Paystack's initialize API requires SOME email, but paystack-init-
// guest.js fills in a random placeholder server-side; the buyer's real
// email is only ever collected once, on the claim-account screen right
// after they've actually paid (see startClaimAccount() below).
async function startGuestCheckout(packKey) {
 try {
 const res = await fetch('/.netlify/functions/paystack-init-guest', {
 method: 'POST', headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ pack: packKey }),
 });
 const data = await res.json();
 if (!res.ok) throw new Error(data.error || 'Could not start payment');
 window.location.href = data.authorization_url;
 } catch (e) {
 toast(e.message || 'Could not start payment — try again.');
 }
}
// Landing back from a real guest-checkout payment (?paid=1&guest=1&
// reference=). Collects a real email + password for the first time, hands
// them to claim-guest-account.js (which only accepts it once it finds a
// real, confirmed payment matching that reference), then signs them
// straight in -- this IS the "sign up" step, it just happens to come after
// payment instead of before it.
function startClaimAccount(reference, pack) {
 $('claimNote').textContent = '';
 $('claimEmail').value = '';
 $('claimPass').value = '';
 $('claimOverlay').style.display = 'flex';
 $('claimBtn').onclick = async () => {
 const email = $('claimEmail').value.trim();
 const password = $('claimPass').value;
 if (!email || !email.includes('@')) return note('claimNote', 'Enter a valid email.', 'err');
 if (password.length < 8) return note('claimNote', 'Password must be at least 8 characters.', 'err');
 $('claimBtn').disabled = true; $('claimBtn').textContent = 'Setting up your account…';
 // The webhook can land a beat after Paystack's own redirect does --
 // retry a few times before giving up, same pattern used elsewhere for
 // this exact race.
 for (let attempt = 0; attempt < 5; attempt++) {
 try {
 const res = await fetch('/.netlify/functions/claim-guest-account', {
 method: 'POST', headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ email, password, reference }),
 });
 const data = await res.json();
 if (res.ok && data.ok) {
 const { error } = await sb.auth.signInWithPassword({ email, password });
 if (error) throw error;
 $('claimOverlay').style.display = 'none';
 // claim-guest-account.js only ever succeeds against a payments row it
 // already confirmed is status success/manual -- unlike the logged-in
 // checkout path, there's no separate verify-payment.js round trip
 // needed here, the successful claim itself IS the confirmation.
 const packDef = pack && (cfg.PACKS || []).find((p) => p.key === pack);
 if (packDef && typeof fbq === 'function') fbq('track', 'Purchase', { value: packDef.naira, currency: 'NGN', content_name: pack });
 await boot();
 if (packDef && packDef.kind === 'course') {
 await openCourse();
 if (atelierTier() < 1) setTimeout(openCourse, 3000);
 }
 return;
 }
 if (res.status !== 404) throw new Error(data.error || 'Could not finish setup.');
 } catch (e) {
 if (attempt === 4) { note('claimNote', e.message || 'Something went wrong -- message us on WhatsApp and we\'ll sort it out.', 'err'); $('claimBtn').disabled = false; $('claimBtn').textContent = 'Continue →'; return; }
 }
 await new Promise((r) => setTimeout(r, 2500));
 }
 };
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
 $('streakBtn').title = can ? 'Tap to claim today\'s free credit ' : `${data.streak_days || 0}-day streak · come back tomorrow`;
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
 toast(` ${d.streak}-day streak · +${d.award} credit${d.award > 1 ? 's' : ''}!`);
 } else { $('streakBtn').classList.remove('claimable'); toast(` ${d.streak}-day streak · come back tomorrow`); }
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
let avatarMap = {}; // id -> avatar row (incl. model_sheet_url)
async function loadAvatars() {
 if (preview) { $('avatarList').innerHTML = '<div class="empty" style="grid-column:1/-1">Sign up to create your avatar</div>'; return; }
 let { data, error } = await sb.from('avatars').select('id,name,image_url,image_urls,model_sheet_url,status,voice_sample_url,voice_reference_text,tts_engine,resemble_voice_uuid,source_video_url,trained_frame_url').order('created_at', { ascending: false });
 if (error) {
 // voice_reference_text/tts_engine/resemble_voice_uuid need
 // schema-phase21/23.sql run first — if those migrations haven't happened
 // yet on this database, asking for a column that doesn't exist fails the
 // WHOLE query (not just that field), which would otherwise wipe the
 // entire avatar list. Fall back to the older column set so avatars still
 // show while the migration catches up.
 ({ data, error } = await sb.from('avatars').select('id,name,image_url,model_sheet_url,status,voice_sample_url,source_video_url,trained_frame_url').order('created_at', { ascending: false }));
 }
 avatarMap = {}; (data || []).forEach((a) => { avatarMap[a.id] = a; });
 // An avatar whose thumbnail won't load is still fully usable -- its
 // training photos and model sheet are unaffected, only this one preview
 // image is broken. It used to render as an empty outlined box with no
 // hint anything was wrong (a student reported exactly this), so a failed
 // image now reveals an initial-tile underneath instead of nothing.
 // Selection is bound to the WRAPPER, not the <img>, so hiding a broken
 // image can't take the click target with it.
 $('avatarList').innerHTML = (data && data.length)
 ? data.map((a) => {
 const initial = ((String(a.name || '?').trim()[0]) || '?').toUpperCase();
 return `<div style="text-align:center;position:relative"><div class="avThumb" data-id="${a.id}" data-name="${escAttr(a.name)}" style="position:relative;aspect-ratio:1;border-radius:12px;border:1px solid var(--line);cursor:pointer;overflow:hidden;display:grid;place-items:center;background:linear-gradient(140deg,rgba(169,255,103,.16),rgba(20,40,44,.5))"><span style="color:var(--gold);font-weight:800;font-size:22px">${escAttr(initial)}</span>${a.image_url ? `<img src="${escAttr(a.image_url)}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" onerror="this.style.display='none';this.closest('.avThumb').title='Preview image unavailable — still usable, or re-upload your photos'">` : ''}</div>${a.model_sheet_url ? '<span class="av-sheet-badge"></span>' : ''}<span class="av-th-x" style="top:4px;left:4px;right:auto" title="Delete avatar" onclick="event.stopPropagation();window.fuseDeleteAvatar('${a.id}')"></span><div style="font-size:11px;margin-top:4px" class="muted">${escAttr(a.name)}</div></div>`;
 }).join('')
 : '<div class="empty" style="grid-column:1/-1">No avatars yet — create one below </div>';
 $('avatarList').querySelectorAll('.avThumb').forEach((el) => el.onclick = () => selectAvatar(el.dataset.id, el.dataset.name));
}
window.fuseDeleteAvatar = async (id) => {
 const a = avatarMap[id];
 if (!confirm(`Delete "${(a && a.name) || 'this avatar'}"? This also removes any avatar videos made with it. This can't be undone.`)) return;
 try {
 const res = await fetch('/.netlify/functions/avatar-delete', {
 method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
 body: JSON.stringify({ avatar_id: id }),
 });
 const d = await res.json();
 if (!res.ok) throw new Error(d.error || 'Failed');
 if (selectedAvatar === id) { selectedAvatar = null; $('avGenWrap').style.display = 'none'; $('avVideoWrap').style.display = 'none'; }
 loadAvatars();
 } catch (e) { alert(e.message || 'Could not delete this avatar.'); }
};
function selectAvatar(id, name) {
 selectedAvatar = id;
 $('avSelName').textContent = name;
 $('avGenWrap').style.display = 'block';
 $('avVideoWrap').style.display = 'block';
 $('avResult').innerHTML = '<div class="muted">Your consistent-face image appears here.</div>';
 // A start-frame override is specific to whichever avatar it was picked
 // for — switching avatars shouldn't silently carry someone else's photo
 // (or a stale one) into the next generation.
 avvStartFrameUrl = null; renderAvvStartFrameThumb();
 loadAvvStills(id);
 renderSheet();
 renderAvatarVideoStatus();
 renderAvatarManageThumbs();
 $('avGenWrap').scrollIntoView({ behavior: 'smooth' });
}
function renderAvatarManageThumbs() {
 const wrap = $('avManageThumbs'); if (!wrap) return;
 const a = avatarMap[selectedAvatar] || {};
 const urls = Array.isArray(a.image_urls) ? a.image_urls : (a.image_url ? [a.image_url] : []);
 wrap.innerHTML = urls.map((u) => `<div class="av-th"><img src="${u}"><span class="av-th-x" onclick="window.fuseDeleteAvatarPhoto('${u.replace(/'/g, "\\'")}')"></span></div>`).join('');
}
window.fuseDeleteAvatarPhoto = async (url) => {
 if (!selectedAvatar) return;
 const a = avatarMap[selectedAvatar] || {};
 const count = Array.isArray(a.image_urls) ? a.image_urls.length : 1;
 if (count <= 1) return note('avManageNote', 'An avatar needs at least one training photo.', 'err');
 if (!confirm('Remove this training photo?')) return;
 try {
 const res = await fetch('/.netlify/functions/media-pipeline', {
 method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
 body: JSON.stringify({ action: 'train', avatar_id: selectedAvatar, remove_photo_url: url }),
 });
 const d = await res.json();
 if (!res.ok) throw new Error(d.error || 'Failed');
 if (avatarMap[selectedAvatar]) { avatarMap[selectedAvatar].image_urls = d.image_urls || (a.image_urls || []).filter((u) => u !== url); if (d.image_url) avatarMap[selectedAvatar].image_url = d.image_url; }
 renderAvatarManageThumbs();
 note('avManageNote', ' Photo removed.', 'ok');
 } catch (e) { note('avManageNote', e.message || 'Could not remove photo.', 'err'); }
};
function renderSheet() {
 const a = avatarMap[selectedAvatar] || {};
 const btn = $('avSheetBtn'), view = $('avSheetView');
 note('avSheetNote', '');
 if (a.model_sheet_url) {
 // A model sheet's image can outlive the provider CDN link it was
 // generated from (older ones especially -- see job-status.js's
 // rehostToStorage). Without an explicit height the <img> collapses to
 // the browser's tiny broken-image glyph on a 404, which just looks
 // like a rendering bug rather than what it is: a dead link that needs
 // regenerating. min-height + object-fit keeps the box visible either
 // way, and onerror swaps in a real message instead of silence.
 view.innerHTML = `<img src="${a.model_sheet_url}" style="width:100%;min-height:160px;object-fit:cover;border-radius:12px;border:1px solid var(--gold-deep);margin-bottom:8px;background:rgba(255,255,255,.04)" onerror="this.onerror=null;this.replaceWith(Object.assign(document.createElement('div'),{className:'muted',style:'padding:24px;text-align:center;border:1px dashed var(--gold-deep);border-radius:12px;margin-bottom:8px;font-size:12.5px',textContent:' This model sheet image expired — tap Regenerate below to make a fresh one.'}))"><div class="muted" style="font-size:12px"> Active — every generation now uses this sheet for consistency.</div>`;
 btn.textContent = ' Regenerate model sheet';
 } else {
 view.innerHTML = '';
 btn.textContent = ' Generate model sheet';
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
 queueJob({ request_id: reqId, endpoint: 'job-status', mediaType: 'image', label: 'Avatar model sheet', model: 'modelsheet' });
 startGlobalPoller();
 let s = 0;
 const timer = setInterval(async () => {
 s += 8;
 try {
 const r = await fetch(`/.netlify/functions/job-status?id=${reqId}`, { headers: { ...(await authHeader()) } });
 const d = await r.json();
 if (d.status === 'completed') {
 clearInterval(timer);
 dequeueJob(reqId);
 if (avatarMap[selectedAvatar]) avatarMap[selectedAvatar].model_sheet_url = d.url;
 renderSheet(); note('avSheetNote', ' Model sheet ready!', 'ok'); loadAvatars();
 } else if (d.status === 'failed') {
 clearInterval(timer); dequeueJob(reqId); note('avSheetNote', (d.error || 'Failed') + ' — credits refunded.', 'err'); renderSheet(); if (user) loadProfile();
 }
 } catch (e) {}
 // Handoff, not abandonment -- same reasoning as pollJob/pollGrid/
 // pollEditTranscribe above: the queued entry keeps polling in the
 // background and updates the avatar's model_sheet_url server-side
 // (job-status.js) regardless of whether this specific timer is still
 // running, so a slow render was never actually lost -- it just wasn't
 // reflected back to the user, who saw a false "still working" error.
 if (s >= 240) { clearInterval(timer); note('avSheetNote', 'Still working — you can leave this page; it\'ll be ready next time you open Avatar Studio.', 'ok'); renderSheet(); }
 }, 8000);
}
// ---------------- AI Avatar Creator (long-form talking video) ----------------
function renderAvatarVideoStatus() {
 const a = avatarMap[selectedAvatar] || {};
 $('avVoiceStatus').textContent = a.voice_sample_url ? ' Voice sample attached.' : 'No voice sample yet.';
 if ($('avVoiceRefText')) $('avVoiceRefText').value = a.voice_reference_text || '';
 if ($('avEngine')) { $('avEngine').value = a.tts_engine === 'resemble' ? 'resemble' : 'wavespeed'; avToggleEngine(); }
 loadAvatarResembleVoices(a.resemble_voice_uuid);
 $('avFaceVideoStatus').textContent = a.trained_frame_url
 ? ' Trained from your uploaded video.'
 : 'No training video yet — your model sheet / photos will be used instead.';
}
function avToggleEngine() {
 const isResemble = $('avEngine').value === 'resemble';
 $('avWaveWrap').style.display = isResemble ? 'none' : 'block';
 $('avResembleWrap').style.display = isResemble ? 'block' : 'none';
 if ($('avvRewrite')) $('avvRewrite').style.display = isResemble ? 'inline-block' : 'none';
}
async function avvRewriteScript() {
 const text = $('avvScript').value.trim();
 if (!text) return note('avvRewriteNote', 'Write the script first.', 'err');
 const btn = $('avvRewrite'); btn.disabled = true; btn.textContent = 'Rewriting…';
 note('avvRewriteNote', '');
 try {
 const res = await fetch('/.netlify/functions/audio-rewrite', {
 method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
 body: JSON.stringify({ text }),
 });
 const d = await res.json();
 if (!res.ok) throw new Error(d.error || 'Failed');
 $('avvScript').value = d.text;
 note('avvRewriteNote', ' Rewritten with pacing/emphasis tags — review before generating.', 'ok');
 } catch (e) { note('avvRewriteNote', e.message || 'Could not rewrite.', 'err'); }
 btn.disabled = false; btn.textContent = ' Rewrite for natural delivery (Resemble only)';
}
async function loadAvatarResembleVoices(selectedUuid) {
 const rsel = $('avResemblePicker');
 if (!rsel) return;
 try {
 const res = await fetch('/.netlify/functions/resemble-voices', { headers: { ...(await authHeader()) } });
 const d = await res.json();
 const voices = (d && d.voices) || [];
 rsel.innerHTML = voices.length
 ? voices.map((v) => `<option value="${v.uuid}">${(v.name || 'Voice').replace(/</g, '&lt;')}</option>`).join('')
 : '<option value="">No Resemble voices found on this account yet</option>';
 if (selectedUuid) rsel.value = selectedUuid;
 } catch (e) { rsel.innerHTML = '<option value="">Could not load Resemble voices</option>'; }
}
async function avSaveEngine() {
 if (!selectedAvatar) return;
 const engine = $('avEngine').value;
 const body = { action: 'train', avatar_id: selectedAvatar, tts_engine: engine };
 if (engine === 'resemble') {
 const uuid = $('avResemblePicker').value;
 if (!uuid) return note('avResembleNote', 'Pick a Resemble voice first.', 'err');
 body.resemble_voice_uuid = uuid;
 }
 try {
 const res = await fetch('/.netlify/functions/media-pipeline', {
 method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
 body: JSON.stringify(body),
 });
 const d = await res.json();
 if (!res.ok) throw new Error(d.error || 'Failed');
 if (avatarMap[selectedAvatar]) Object.assign(avatarMap[selectedAvatar], { tts_engine: d.tts_engine, resemble_voice_uuid: d.resemble_voice_uuid });
 note(engine === 'resemble' ? 'avResembleNote' : 'avVoiceNote', ' Voice engine saved.', 'ok');
 } catch (e) { note(engine === 'resemble' ? 'avResembleNote' : 'avVoiceNote', e.message || 'Could not save.', 'err'); }
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
 const refText = ($('avVoiceRefText') && $('avVoiceRefText').value.trim()) || '';
 const res = await fetch('/.netlify/functions/media-pipeline', {
 method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
 body: JSON.stringify({ action: 'train', avatar_id: selectedAvatar, voice_sample_url: url, voice_reference_text: refText }),
 });
 const d = await res.json();
 if (!res.ok) throw new Error(d.error || 'Failed');
 if (avatarMap[selectedAvatar]) { avatarMap[selectedAvatar].voice_sample_url = url; avatarMap[selectedAvatar].voice_reference_text = refText; }
 renderAvatarVideoStatus();
 note('avVoiceNote', ' Voice sample saved.', 'ok');
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
 const res = await fetch('/.netlify/functions/media-pipeline', {
 method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
 body: JSON.stringify({ action: 'train', avatar_id: selectedAvatar, source_video_url: url }),
 });
 const d = await res.json();
 if (!res.ok) throw new Error(d.error || 'Failed');
 if (avatarMap[selectedAvatar]) { avatarMap[selectedAvatar].source_video_url = d.source_video_url; avatarMap[selectedAvatar].trained_frame_url = d.trained_frame_url; }
 renderAvatarVideoStatus();
 note('avFaceVideoNote', ' Trained from your video.', 'ok');
 } catch (e) { note('avFaceVideoNote', e.message || 'Training failed.', 'err'); }
}
let avvOwnAudioUrl = null;
let avvLastUrl = null;
// Lets a user upload their own start frame directly, instead of the video
// always starting from the trained avatar's default photo — useful for a
// specific outfit/setting/pose for just this one video, without retraining
// the whole avatar. Only the very first chunk uses this; every chunk after
// that still chains from the previous chunk's own last frame as usual.
let avvStartFrameUrl = null;
async function avvPickStartFrame(file) {
 if (preview) { showAuth('signup'); return; }
 if (!file) return;
 note('avvStartFrameNote', 'Uploading…', 'ok');
 try {
 const resized = await resizeImageFile(file);
 const ext = (resized.name.split('.').pop() || 'jpg').toLowerCase();
 const path = `${user.id}/avvstartframe-${selectedAvatar}-${Date.now()}.${ext}`;
 await uploadWithRetry('avatars', path, resized);
 avvStartFrameUrl = sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
 note('avvStartFrameNote', ' This video will start from your uploaded image instead of the trained avatar photo.', 'ok');
 renderAvvStartFrameThumb();
 } catch (e) { note('avvStartFrameNote', e.message || 'Upload failed.', 'err'); }
}
function renderAvvStartFrameThumb() {
 const el = $('avvStartFrameThumb');
 if (!el) return;
 el.innerHTML = avvStartFrameUrl
 ? `<div style="position:relative;display:inline-block"><img src="${avvStartFrameUrl}" style="width:72px;height:72px;object-fit:cover;border-radius:8px;border:2px solid var(--gold)"><span class="ref-x" onclick="window.fuseAvvRmStartFrame()"></span></div>`
 : '';
}
window.fuseAvvRmStartFrame = () => { avvStartFrameUrl = null; renderAvvStartFrameThumb(); note('avvStartFrameNote', ''); };

// ---- Avatar Stills Library — save/reuse multiple reference photos per
// avatar, instead of being stuck with the one trained_frame_url forever.
let avvStills = [];
async function loadAvvStills(avatarId) {
 if (!avatarId) { avvStills = []; renderAvvStills(); return; }
 try {
 const res = await fetch(`/.netlify/functions/avatar-stills?avatar_id=${avatarId}`, { headers: await authHeader() });
 const d = await res.json();
 avvStills = (res.ok && d.stills) || [];
 } catch (e) { avvStills = []; }
 renderAvvStills();
}
function renderAvvStills() {
 const el = $('avvStillsGrid'); if (!el) return;
 if (!avvStills.length) { el.innerHTML = '<div class="muted" style="font-size:12px">No saved photos yet — upload a start frame or generate one in Model Sheet, then tap "Save to My Photos".</div>'; return; }
 el.innerHTML = avvStills.map((s) => `
 <div class="av-th" style="position:relative">
 <img src="${s.image_url}" style="width:64px;height:64px;object-fit:cover;border-radius:8px;cursor:pointer" onclick="window.fuseAvvPickStill('${s.image_url.replace(/'/g, "\\'")}')">
 <span class="av-th-x" onclick="window.fuseAvvDeleteStill('${s.id}')"></span>
 </div>`).join('');
}
window.fuseAvvPickStill = (url) => {
 avvStartFrameUrl = url;
 renderAvvStartFrameThumb();
 note('avvStartFrameNote', ' This video will start from the saved photo you picked.', 'ok');
};
window.fuseAvvDeleteStill = async (id) => {
 try {
 await fetch('/.netlify/functions/avatar-stills', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) }, body: JSON.stringify({ action: 'delete', id }) });
 avvStills = avvStills.filter((s) => s.id !== id);
 renderAvvStills();
 } catch (e) {}
};
async function avvSaveStillToLibrary() {
 if (!selectedAvatar) return;
 if (!avvStartFrameUrl) return note('avvStartFrameNote', 'Upload or pick a start frame first, then save it.', 'err');
 try {
 const res = await fetch('/.netlify/functions/avatar-stills', {
 method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
 body: JSON.stringify({ action: 'save', avatar_id: selectedAvatar, image_url: avvStartFrameUrl, source: 'uploaded' }),
 });
 const d = await res.json();
 if (!res.ok) throw new Error(d.error || 'Could not save.');
 avvStills.unshift(d.still);
 renderAvvStills();
 note('avvStartFrameNote', ' Saved to My Photos — pick it any time for a future video.', 'ok');
 } catch (e) { note('avvStartFrameNote', e.message || 'Could not save.', 'err'); }
}
async function uploadAvatarOwnAudio(file) {
 if (!selectedAvatar) return note('avVoiceNote', 'Pick an avatar first.', 'err');
 note('avVoiceNote', 'Uploading your audio…', 'ok');
 try {
 const ext = (file.name.split('.').pop() || 'mp3').toLowerCase();
 const path = `${user.id}/ownaudio-${selectedAvatar}-${Date.now()}.${ext}`;
 const { error } = await sb.storage.from('avatars').upload(path, file);
 if (error) throw error;
 avvOwnAudioUrl = sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
 $('avOwnAudioStatus').textContent = ' Using your own audio — voice cloning will be skipped for this video.';
 note('avVoiceNote', '', '');
 avvUpdateCostEstimate();
 } catch (e) { note('avVoiceNote', e.message || 'Upload failed.', 'err'); }
}
function avvToggleMode() {
 $('avvMotionWrap').style.display = $('avvMode').value === 'motion' ? 'block' : 'none';
 avvUpdateCostEstimate();
}
// Live pre-submission cost preview -- mirrors avatarVideoCredits() in
// netlify/functions/_packs.js exactly (same constants, same formula). Motion
// mode (real Seedance 2.0) costs noticeably more per minute than talking
// mode (InfiniteTalk) -- showing this BEFORE the user commits credits is the
// whole point, since the two modes' real cost gap is large enough that
// picking one by accident should never be a silent surprise. If those
// constants ever change server-side, update them here too.
const AVV_PER_MIN_TALKING = 3.6;
const AVV_PER_MIN_MOTION = { '480p': 7.2, '720p': 14.4 };
const AVV_VOICE_PER_MIN = 0.05;
// 10 Aug 2026 margin/reprice sweep -- was 1.6/0.016, must track
// AVATAR_VIDEO_MARGIN/CREDIT_USD in netlify/functions/_packs.js exactly or
// this estimate silently disagrees with the real charge.
const AVV_MARGIN = 2.0;
const AVV_CREDIT_USD = 0.11;
function avvUpdateCostEstimate() {
 const el = $('avvCostEstimate'); if (!el) return;
 const words = ($('avvScript').value || '').trim().split(/\s+/).filter(Boolean).length;
 if (!words) { el.textContent = ''; return; }
 const mins = Math.max(1, Math.ceil(Math.max(0.2, words / 150)));
 const mode = $('avvMode').value;
 const resolution = $('avvResolution').value;
 const includeVoice = !avvOwnAudioUrl;
 const perMin = mode === 'motion' ? (AVV_PER_MIN_MOTION[resolution] || AVV_PER_MIN_MOTION['480p']) : AVV_PER_MIN_TALKING;
 const costUsd = mins * (perMin + (includeVoice ? AVV_VOICE_PER_MIN : 0));
 const credits = Math.max(1, Math.ceil((costUsd / AVV_CREDIT_USD) * AVV_MARGIN));
 el.textContent = `~${mins} min of video · ${credits} credits` + (mode === 'motion' ? ' (motion mode costs more — full cinematic generation per chunk)' : '');
}
async function avvGenerate() {
 if (preview) { showAuth('signup'); return; }
 if (!selectedAvatar) return note('avvNote', 'Pick an avatar first.', 'err');
 const script = $('avvScript').value.trim();
 if (!script) return note('avvNote', 'Write or paste the script first.', 'err');
 const a = avatarMap[selectedAvatar] || {};
 const hasResembleVoice = a.tts_engine === 'resemble' && a.resemble_voice_uuid;
 if (!avvOwnAudioUrl && !a.voice_sample_url && !hasResembleVoice) return note('avvNote', 'Upload a voice sample (or your own audio), or pick a Resemble voice, above first.', 'err');
 if (jobCapReached('avvNote')) return;
 const mode = $('avvMode').value;
 const cameraMotion = $('avvCameraMotion').value.trim();
 if (mode === 'motion' && !cameraMotion) return note('avvNote', 'Describe the camera motion / action for a motion video.', 'err');
 const btn = $('avvGen'); const label = ' Generate video'; btn.disabled = true; btn.textContent = 'Submitting…';
 $('avvCtaWrap').style.display = 'none';
 note('avvNote', '');
 try {
 const res = await fetch('/.netlify/functions/media-pipeline', {
 method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
 body: JSON.stringify({
 action: 'create', avatar_id: selectedAvatar, script, mode, camera_motion: mode === 'motion' ? cameraMotion : undefined,
 audio_url: avvOwnAudioUrl || undefined,
 settings: { resolution: $('avvResolution').value, prompt: $('avvPrompt').value.trim(), aspect: $('avvAspect').value, start_image: avvStartFrameUrl || undefined },
 }),
 });
 const d = await res.json();
 if (res.status === 503) { note('avvNote', d.error, 'err'); btn.disabled = false; btn.textContent = label; }
 else if (res.status === 402) { note('avvNote', 'Out of credits — top up.', 'err'); openBuy(); btn.disabled = false; btn.textContent = label; }
 else if (!res.ok) throw new Error(d.error || 'Failed');
 else {
 $('creditCount').textContent = d.credits;
 // Long-form avatar videos poll a different endpoint (avatar-video-status,
 // keyed by the avatar_videos row id, not a plain job request_id) — the
 // global queue already knows how to route that via job.endpoint.
 queueJob({ request_id: d.id, endpoint: 'avatar-video-status', mediaType: 'video', label: `${a.name || 'Avatar'} video (~${d.estimated_minutes} min)`, model: 'avatar-video' });
 startGlobalPoller();
 note('avvNote', ` Started — ~${d.estimated_minutes} min of video, rolling in Projects now.`, 'ok');
 btn.disabled = false; btn.textContent = label;
 $('avvScript').value = '';
 showView('library');
 }
 } catch (e) { note('avvNote', e.message || 'Failed — credits not charged.', 'err'); btn.disabled = false; btn.textContent = label; }
}
const AVV_STAGE_LABEL = { speech: 'Cloning your voice…', slicing: 'Preparing chunks…', video: 'Generating video', stitching: 'Combining the final video…' };
function pollAvatarVideo(id, btn, label) {
 let s = 0;
 const timer = setInterval(async () => {
 s += 10;
 try {
 const r = await fetch(`/.netlify/functions/media-pipeline?id=${id}`, { headers: { ...(await authHeader()) } });
 const d = await r.json();
 if (d.stage === 'complete') {
 clearInterval(timer);
 avvLastUrl = d.url;
 $('avvResult').innerHTML = `<div><video src="${d.url}" controls autoplay loop muted playsinline></video><div style="margin-top:12px"><button class="btn gold sm" onclick="fuseDownload('${d.url}')">⬇ Download</button></div></div>`;
 note('avvNote', 'Done ', 'ok');
 $('avvCtaWrap').style.display = 'block';
 if (user) loadProfile();
 btn.disabled = false; btn.textContent = label;
 } else if (d.stage === 'failed') {
 clearInterval(timer);
 $('avvResult').innerHTML = '<div> ' + (d.error || 'Failed') + '</div>';
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
 const res = await fetch('/.netlify/functions/media-pipeline', {
 method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
 body: JSON.stringify({ type: 'cta', video_url: avvLastUrl, cta_text: ctaText }),
 });
 const d = await res.json();
 if (!res.ok) throw new Error(d.error || 'Failed');
 avvLastUrl = d.url;
 $('avvResult').innerHTML = `<div><video src="${d.url}" controls autoplay loop muted playsinline></video><div style="margin-top:12px"><button class="btn gold sm" onclick="fuseDownload('${d.url}')">⬇ Download</button></div></div>`;
 note('avvCtaNote', ' Ad-ready — CTA burned in.', 'ok');
 } catch (e) { note('avvCtaNote', e.message || 'Failed', 'err'); }
 btn.disabled = false; btn.textContent = ' Add CTA to video';
}
let avTrainFiles = []; // accumulates across multiple "Add photos" picks
function renderTrainThumbs() {
 const n = avTrainFiles.length;
 $('avCount').textContent = n ? `${n} photo${n > 1 ? 's' : ''} added${n >= 15 ? ' (max)' : ''}` : '';
 const wrap = $('avThumbs'); if (!wrap) return;
 wrap.innerHTML = avTrainFiles.map((f, i) => `<div class="av-th"><img src="${URL.createObjectURL(f)}"><span class="av-th-x" onclick="window.fuseRmTrain(${i})"></span></div>`).join('');
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
 $('avCreate').disabled = true;
 try {
 const urls = [];
 for (const rawFile of files) {
 note('avNote', `Uploading photo ${urls.length + 1}/${files.length}…`, 'ok');
 const file = await resizeImageFile(rawFile);
 const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
 const path = `${user.id}/av-${Date.now()}-${urls.length}.${ext}`;
 await uploadWithRetry('avatars', path, file);
 urls.push(sb.storage.from('avatars').getPublicUrl(path).data.publicUrl);
 }
 const { error: insErr } = await sb.from('avatars').insert({ user_id: user.id, name, image_url: urls[0], image_urls: urls });
 if (insErr) throw insErr;
 note('avNote', ` Avatar trained on ${urls.length} photo(s)! Tap it above to generate.`, 'ok');
 $('avNewName').value = ''; $('avFile').value = ''; avTrainFiles = []; renderTrainThumbs();
 loadAvatars();
 } catch (e) { note('avNote', e.message || 'Could not create avatar.', 'err'); }
 $('avCreate').disabled = false;
}
let avExtraRefs = []; // extra reference image URLs for avatar generation (e.g. products, props)
async function pickAvatarRefs(files) {
 if (!files || !files.length) return;
 const limit = 3 - avExtraRefs.length;
 if (limit <= 0) return note('avGenNote', 'Max 3 extra references.', 'err');
 note('avGenNote', 'Uploading reference(s)…', 'ok');
 for (let i = 0; i < Math.min(files.length, limit); i++) {
 try {
 const file = await resizeImageFile(files[i]);
 const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
 const path = `${user.id}/avref-${Date.now()}-${i}.${ext}`;
 await uploadWithRetry('avatars', path, file);
 avExtraRefs.push(sb.storage.from('avatars').getPublicUrl(path).data.publicUrl);
 } catch (error) { note('avGenNote', (error && error.message) || 'Upload failed.', 'err'); }
 }
 renderAvatarRefs();
 note('avGenNote', ` ${avExtraRefs.length} reference(s) attached.`, 'ok');
}
function renderAvatarRefs() {
 $('avRefPreviews').innerHTML = avExtraRefs.map((u, i) =>
 `<div style="position:relative"><img src="${u}" style="width:48px;height:48px;object-fit:cover;border-radius:8px;border:1px solid var(--line)">
 <span class="ref-x" onclick="window.fuseRemoveAvRef(${i})"></span></div>`).join('');
}
window.fuseRemoveAvRef = (i) => { avExtraRefs.splice(i, 1); renderAvatarRefs(); };

async function avatarGenerate() {
 if (preview) { showAuth('signup'); return; }
 if (!selectedAvatar) return note('avGenNote', 'Pick an avatar first.', 'err');
 const prompt = $('avPrompt').value.trim();
 if (!prompt) return note('avGenNote', 'Describe the scene.', 'err');
 if (jobCapReached('avGenNote')) return;
 const aspect = $('avAspect').value;
 const btn = $('avGen'); const label = ' Generate (10 credits)'; btn.disabled = true; btn.textContent = 'Submitting…';
 note('avGenNote', '');
 try {
 const res = await fetch('/.netlify/functions/avatar-generate', {
 method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
 body: JSON.stringify({ avatar_id: selectedAvatar, prompt, aspect, extra_refs: avExtraRefs.length ? avExtraRefs : undefined }),
 });
 const data = await res.json();
 if (res.status === 503) { note('avGenNote', data.error, 'err'); btn.disabled = false; btn.textContent = label; }
 else if (res.status === 402) { note('avGenNote', 'Out of credits — top up.', 'err'); openBuy(); btn.disabled = false; btn.textContent = label; }
 else if (!res.ok) throw new Error(data.error || 'Failed');
 else {
 $('creditCount').textContent = data.credits;
 note('avGenNote', '');
 $('avResult').innerHTML = '<div><span class="spin"></span><div style="margin-top:12px">Generating…</div></div>';
 pollJob(data.request_id, $('avResult'), 'avGenNote', btn, label, 'image', 100, (url) => {
 $('avResult').insertAdjacentHTML('beforeend', `<button class="btn ghost sm" style="margin-top:8px" onclick="fuseUseAvatarAsVideoStart('${url}')">🎬 Use as video starting frame →</button>`);
 }, null, 'Avatar image');
 }
 } catch (e) { note('avGenNote', e.message || 'Failed — credits not charged.', 'err'); btn.disabled = false; btn.textContent = label; }
}

// Shared by Flyer Studio and Editing Studio's assistants — the backend
// replies in plain tagged text (<REPLY>...</REPLY> etc.) instead of JSON,
// since asking an LLM for "strict JSON" reliably breaks on long creative
// text full of quotes/apostrophes. Tags need no escaping, so this just
// regex-extracts each one; a genuinely malformed response (no <REPLY> tag
// at all) falls back to a short, honest note instead of raw text.
function extractTag(text, tag) {
 const m = (text || '').match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'));
 return m ? m[1].trim() : '';
}
function extractTagList(text, tag) {
 const raw = extractTag(text, tag);
 if (!raw) return [];
 return raw.split('\n').map((l) => l.replace(/^[-*]\s*/, '').trim()).filter(Boolean);
}
// Parses the plain "KEY: value" lines inside <TYPOGRAPHY> (see
// flyer-brief.js's prompt for the exact format asked of the model) into the
// same field names the Typography panel's inputs use.
function parseTypographyBlock(raw) {
 if (!raw || !raw.trim()) return null;
 const fields = {};
 raw.split('\n').forEach((line) => {
 const m = line.match(/^\s*(HEADLINE|ACCENT_WORD|SUBHEAD|BULLETS|BADGE|FOOTER)\s*:\s*(.*)$/i);
 if (m) fields[m[1].toUpperCase()] = m[2].trim();
 });
 if (!fields.HEADLINE) return null;
 return {
 headline: fields.HEADLINE, accent_word: fields.ACCENT_WORD || '', subhead: fields.SUBHEAD || '',
 bullets: fields.BULLETS ? fields.BULLETS.split('|').map((b) => b.trim()).filter(Boolean) : [],
 badge: fields.BADGE || '', footer: fields.FOOTER || '',
 };
}
function parseFlyerBriefResponse(text, fallbackReply) {
 if (!text || !/<REPLY>/i.test(text)) {
 return { reply: fallbackReply || 'Got a bit tangled there — try rephrasing or send it again.' };
 }
 return {
 reply: extractTag(text, 'REPLY') || 'Got it.',
 brief: extractTag(text, 'BRIEF'),
 ready: /^\s*yes/i.test(extractTag(text, 'READY_TO_GENERATE')),
 image_prompt: extractTag(text, 'IMAGE_PROMPT'),
 typography: parseTypographyBlock(extractTag(text, 'TYPOGRAPHY')),
 niche: extractTag(text, 'NICHE'),
 suggested_next_steps: extractTagList(text, 'NEXT_STEPS'),
 };
}
function parseEditBriefResponse(text, fallbackReply) {
 if (!text || !/<REPLY>/i.test(text)) {
 return { reply: fallbackReply || 'Got a bit tangled there — try rephrasing or send it again.' };
 }
 const accentColor = extractTag(text, 'CAPTION_COLOR');
 const position = extractTag(text, 'CAPTION_POSITION');
 return {
 reply: extractTag(text, 'REPLY') || 'Got it.',
 caption_style: (accentColor || position) ? { accent_color: accentColor || null, position: position || null } : null,
 cta_text: extractTag(text, 'CTA_TEXT'),
 broll_suggestions: extractTagList(text, 'BROLL_SUGGESTIONS'),
 notes: extractTag(text, 'NOTES'),
 };
}

// ---------------- Flyer Studio (conversational AI flyer designer) ----------------
// A page reload wipes every plain JS variable below, but the actual design
// work (hero image, layers, references) lives server-side on the project
// row the whole time — only the in-memory chat transcript is ever lost.
// Persisting just the project id means reopening Flyer Studio can pull that
// work straight back instead of looking blank with a project that's still
// there in the database.
const FLYER_PROJECT_KEY = 'fuse_flyer_project_id';
let flyerProjectId = null;
let flyerHistory = []; // [{role:'user'|'assistant', text}]
let flyerLayers = []; // display log of applied visual layers

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
// Called every time Flyer Studio opens — picks the last project back up
// (if there is one) instead of starting blank. Only runs when nothing's
// already loaded this session, so it never clobbers active work.
async function restoreFlyerProject() {
 if (preview || flyerProjectId) return;
 const savedId = localStorage.getItem(FLYER_PROJECT_KEY);
 if (!savedId) return;
 try {
 const { data } = await sb.from('flyer_projects').select('id,brief,hero_prompt,hero_image_url,final_url,layers,reference_image_urls').eq('id', savedId).maybeSingle();
 if (data) {
 flyerLoadProject(data);
 note('flyerResumeNote', '↺ Picked up right where you left off.', 'ok');
 } else localStorage.removeItem(FLYER_PROJECT_KEY); // project's gone (deleted) — stop trying
 } catch (e) {}
}
// Explicit reset so restoring the last project on reload doesn't trap
// anyone into always continuing the same flyer — clears everything back
// to a blank slate for a genuinely new one.
function flyerNewProject() {
 flyerProjectId = null; flyerHistory = []; flyerLayers = []; flyerRefUrls = []; flyerHeroForceFallback = false;
 flyerCompositeRefs = { headline: null, features: null, cta: null }; ['headline', 'features', 'cta'].forEach(renderFlyerCompositeRef);
 localStorage.removeItem(FLYER_PROJECT_KEY);
 $('flyerLog').innerHTML = ''; $('flyerImgPrompt').value = '';
 $('flyerHeroResult').innerHTML = '<div class="muted">Your background/hero visual appears here.</div>';
 $('flyerLayerLog').innerHTML = ''; $('flyerLayerPanel').style.display = 'none'; $('flyerTextPanel').style.display = 'none';
 $('flyerFinalResult').innerHTML = '<div class="muted">Your finished flyer appears here.</div>';
 $('flyerSpotFixOpen').style.display = 'none';
 renderFlyerRefs();
 note('flyerResumeNote', '');
 note('flyerLayerNote', ''); note('flyerCompositeNote', '');
 note('flyerNote', ' Starting a fresh flyer.', 'ok');
}
function flyerLoadProject(p) {
 if (!p) return;
 flyerProjectId = p.id;
 localStorage.setItem(FLYER_PROJECT_KEY, p.id);
 flyerHeroForceFallback = false;
 flyerHistory = [];
 flyerCompositeRefs = { headline: null, features: null, cta: null }; ['headline', 'features', 'cta'].forEach(renderFlyerCompositeRef);
 flyerLayers = (Array.isArray(p.layers) ? p.layers : []).map((l) => l.instruction);
 flyerRefUrls = Array.isArray(p.reference_image_urls) ? p.reference_image_urls.map((u) => ({ url: u, on: true, role: '' })) : [];
 renderFlyerRefs();
 $('flyerLog').innerHTML = '';
 flyerAppendLog('assistant', `Loaded: ${p.brief || '(untitled)'}`);
 $('flyerImgPrompt').value = p.hero_prompt || '';
 if (p.hero_image_url) {
 $('flyerHeroResult').innerHTML = `<img src="${p.hero_image_url}" style="width:100%;border-radius:12px">`;
 $('flyerLayerPanel').style.display = 'block';
 $('flyerTextPanel').style.display = 'block';
 // Clear any "Generate the hero visual first." left over from before
 // this project (or a prior session) had a hero image.
 note('flyerLayerNote', ''); note('flyerCompositeNote', '');
 }
 $('flyerLayerLog').innerHTML = flyerLayers.map((l) => `<div class="muted" style="font-size:12px"> ${l}</div>`).join('');
 if (p.final_url) { $('flyerFinalResult').innerHTML = `<div><img src="${p.final_url}" style="width:100%;border-radius:12px"><div style="margin-top:12px"><button class="btn gold sm" onclick="fuseDownload('${p.final_url}')">⬇ Download</button></div></div>`; $('flyerSpotFixOpen').style.display = 'block'; }
 else $('flyerSpotFixOpen').style.display = 'none';
 $('flyerVisualPanel').scrollIntoView({ behavior: 'smooth' });
}

// Each entry is {url, on} — "on" is whether THIS reference actually feeds
// the next "Generate visual" call. Everything uploaded still goes into the
// chat's context (so the design brief can talk about all of it), but
// generation only ever uses the ones currently toggled on — tapping a
// thumbnail toggles it, and new uploads default to on.
let flyerRefUrls = [];
async function flyerPickRefs(files) {
 if (preview) { showAuth('signup'); return; }
 if (!files || !files.length) return;
 const limit = 20 - flyerRefUrls.length;
 if (limit <= 0) return note('flyerRefNote', 'Max 20 reference images.', 'err');
 note('flyerRefNote', 'Uploading…', 'ok');
 for (let i = 0; i < Math.min(files.length, limit); i++) {
 try {
 const file = await resizeImageFile(files[i]);
 const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
 const path = `${user.id}/flyerref-${Date.now()}-${i}.${ext}`;
 await uploadWithRetry('avatars', path, file);
 flyerRefUrls.push({ url: sb.storage.from('avatars').getPublicUrl(path).data.publicUrl, on: true, role: '' });
 } catch (error) { note('flyerRefNote', (error && error.message) || 'Upload failed.', 'err'); }
 }
 renderFlyerRefs();
 note('flyerRefNote', ` ${flyerRefUrls.length} reference(s) attached — tap any to include/exclude it from generation.`, 'ok');
}
// Tap-to-tag: each reference can optionally be told exactly what role it
// plays (exact subject, background texture, overall layout, or where the
// headline/features/CTA areas should stay open for later) instead of that
// having to be typed out in the chat -- flyer-hero.js turns whichever are
// tagged into an explicit numbered instruction for the image model.
// Untagged ("General") references still work exactly as before.
const FLYER_REF_ROLES = [
 ['', 'General'], ['hero', 'Hero structure'], ['subject', 'Exact subject'], ['background', 'Background'],
 ['layout', 'Layout'], ['headline', 'Headline area'], ['features', 'Features area'], ['cta', 'CTA area'],
];
function renderFlyerRefs() {
 $('flyerRefThumbs').innerHTML = flyerRefUrls.map((r, i) => `
 <div style="width:74px">
 <div style="position:relative;cursor:pointer" onclick="window.fuseFlyerToggleRef(${i})">
 <img src="${r.url}" style="width:56px;height:56px;object-fit:cover;border-radius:8px;border:2px solid ${r.on ? 'var(--gold)' : 'var(--line)'};opacity:${r.on ? '1' : '.4'}">
 ${r.on ? '<span class="ref-check"><svg viewBox="0 0 22 22" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 11.5l4.5 4.5 9-10"/></svg></span>' : ''}
 <span class="ref-x" onclick="event.stopPropagation();window.fuseFlyerRmRef(${i})"></span>
 </div>
 <select style="width:100%;margin-top:4px;font-size:10.5px;padding:2px" onchange="window.fuseFlyerSetRefRole(${i}, this.value)" onclick="event.stopPropagation()">
 ${FLYER_REF_ROLES.map(([v, label]) => `<option value="${v}" ${(r.role || '') === v ? 'selected' : ''}>${label}</option>`).join('')}
 </select>
 </div>`).join('');
 // Make the connection to generation visible right where it matters — this
 // panel is well above the "Generate visual" button, so it wasn't obvious
 // the references there actually feed into it.
 const heroNote = $('flyerHeroRefNote');
 if (heroNote) {
 const selected = flyerRefUrls.filter((r) => r.on).length;
 heroNote.textContent = flyerRefUrls.length ? ` ${selected} of ${flyerRefUrls.length} selected for this generation — tap a reference to include/exclude it, or tag its role below it.` : '';
 }
}
window.fuseFlyerRmRef = (i) => { flyerRefUrls.splice(i, 1); renderFlyerRefs(); };
window.fuseFlyerToggleRef = (i) => { if (flyerRefUrls[i]) flyerRefUrls[i].on = !flyerRefUrls[i].on; renderFlyerRefs(); };
window.fuseFlyerSetRefRole = (i, role) => { if (flyerRefUrls[i]) flyerRefUrls[i].role = role; };

function flyerAppendLog(role, text) {
 const log = $('flyerLog');
 const bubble = document.createElement('div');
 bubble.style.cssText = role === 'user'
 ? 'align-self:flex-end;background:var(--gold);color:var(--bg);padding:10px 14px;border-radius:14px 14px 2px 14px;max-width:85%;white-space:pre-wrap;font-size:14px'
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
 body: JSON.stringify({ message: msg, history: flyerHistory, project_id: flyerProjectId, reference_image_urls: flyerRefUrls.map((r) => r.url) }),
 });
 const d = await res.json();
 if (res.status === 402) { note('flyerNote', 'Out of credits — top up.', 'err'); openBuy(); btn.disabled = false; btn.textContent = 'Send'; return; }
 if (!res.ok) throw new Error(d.error || 'Failed');
 if (d.credits != null) $('creditCount').textContent = d.credits;
 if (d.project_id) { flyerProjectId = d.project_id; localStorage.setItem(FLYER_PROJECT_KEY, flyerProjectId); }
 flyerHistory.push({ role: 'user', text: msg });
 flyerPollBrief(d.request_id, btn);
 } catch (e) { note('flyerNote', e.message || 'Failed', 'err'); btn.disabled = false; btn.textContent = 'Send'; }
}
function flyerPollBrief(reqId, btn) {
 let s = 0;
 // setInterval doesn't wait for the previous tick's fetch to resolve, so a
 // reply that takes longer than one 4s interval leaves several ticks in
 // flight at once. clearInterval() only stops FUTURE ticks — it doesn't
 // cancel whichever ones already went out — so without this flag, every
 // one of those in-flight ticks would independently see the same
 // now-'completed' job and append its own duplicate copy of the answer.
 let handled = false;
 const timer = setInterval(async () => {
 s += 4;
 try {
 const r = await fetch(`/.netlify/functions/job-status?id=${reqId}`, { headers: { ...(await authHeader()) } });
 const d = await r.json();
 if (handled) return;
 if (d.status === 'completed') {
 handled = true;
 clearInterval(timer);
 const parsed = parseFlyerBriefResponse(d.text);
 // Keep the full brief in the resent conversation history too, not
 // just the short reply — otherwise the assistant loses track of what
 // it actually proposed by the next turn and can't tell "yes" apart
 // from a fresh request.
 flyerHistory.push({ role: 'assistant', text: parsed.brief ? `${parsed.reply}\n\n${parsed.brief}` : parsed.reply });
 flyerAppendLog('assistant', parsed.reply);
 if (parsed.brief) flyerAppendLog('assistant', ' THE BRIEF\n\n' + parsed.brief);
 if (parsed.suggested_next_steps && parsed.suggested_next_steps.length) {
 flyerAppendLog('assistant', ' ' + parsed.suggested_next_steps.join(' · '));
 }
 if (parsed.ready && parsed.image_prompt) {
 // Fills the prompt box but does NOT auto-generate — the user
 // reviews/edits the exact prompt and taps "Generate visual"
 // themselves. Auto-firing right after sign-off meant a slow or
 // stuck render started with no chance to double-check anything
 // first, and no way to tell whether it was even the prompt she
 // wanted.
 $('flyerImgPrompt').value = parsed.image_prompt;
 $('flyerVisualPanel').scrollIntoView({ behavior: 'smooth' });
 note('flyerHeroNote', ' Prompt ready below — review it, then tap Generate visual.', 'ok');
 }
 // The assistant writes real on-flyer copy once a brief is approved —
 // fills the Typography panel the same way the image prompt gets
 // filled, so "Composite final flyer" isn't blocked on typing a
 // headline from scratch that the chat already reasoned through.
 if (parsed.ready && parsed.typography) {
 const t = parsed.typography;
 $('flyerHeadline').value = t.headline || '';
 $('flyerAccentWord').value = t.accent_word || '';
 $('flyerSubhead').value = t.subhead || '';
 $('flyerBullets').value = (t.bullets || []).join('\n');
 $('flyerBadge').value = t.badge || '';
 $('flyerFooter').value = t.footer || '';
 $('flyerTextPanel').style.display = 'block';
 }
 btn.disabled = false; btn.textContent = 'Send';
 } else if (d.status === 'failed') {
 handled = true;
 clearInterval(timer);
 note('flyerNote', (d.error || 'Failed') + ' — credits refunded.', 'err');
 btn.disabled = false; btn.textContent = 'Send';
 }
 } catch (e) {}
 if (s >= 180) { clearInterval(timer); note('flyerNote', 'Still thinking — try again shortly.', 'err'); btn.disabled = false; btn.textContent = 'Send'; }
 }, 4000);
}

// Set once a flyer-hero generation for the current project comes back
// 'failed' (see the onFail callback below), and read on the NEXT call —
// WaveSpeed accepting a submission and rejecting it later, async, isn't
// caught by flyer-hero.js's own synchronous submit-failure fallback, so an
// identical retry was just failing the exact same way every time ("keeps
// getting stuck"). Sticky per project rather than cleared on every
// keystroke: once this project's request has been rejected once, it's
// more useful to skip straight to a genuinely different model on every
// later attempt than to re-guess whether THIS edit will be the one that
// gets through.
let flyerHeroForceFallback = false;
async function flyerGenHero(auto) {
 if (preview) { showAuth('signup'); return; }
 const prompt = $('flyerImgPrompt').value.trim();
 if (!prompt) return note('flyerHeroNote', 'Add an image prompt first.', 'err');
 const btn = $('flyerGenHero'); const label = ' Generate visual'; btn.disabled = true; btn.textContent = 'Submitting…';
 $('flyerHeroResult').innerHTML = '<div><span class="spin"></span><div style="margin-top:12px">Generating the hero visual…</div></div>';
 note('flyerHeroNote', '');
 try {
 // reference_roles is keyed by URL, not array position, so a tag can
 // never mis-bind to the wrong image even if refs get reordered/toggled
 // between renders — only the (usually few) actually-tagged ones are sent.
 const referenceRoles = {};
 flyerRefUrls.filter((r) => r.on && r.role).forEach((r) => { referenceRoles[r.url] = r.role; });
 const res = await fetch('/.netlify/functions/flyer-hero', {
 method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
 body: JSON.stringify({
 project_id: flyerProjectId || undefined, prompt, aspect: $('flyerAspect').value,
 reference_image_urls: flyerRefUrls.filter((r) => r.on).map((r) => r.url),
 reference_roles: Object.keys(referenceRoles).length ? referenceRoles : undefined,
 force_fallback: flyerHeroForceFallback || undefined,
 }),
 });
 const d = await res.json();
 if (res.status === 402) { note('flyerHeroNote', 'Out of credits — top up.', 'err'); openBuy(); btn.disabled = false; btn.textContent = label; return; }
 if (!res.ok) throw new Error(d.error || 'Failed');
 if (d.credits != null) $('creditCount').textContent = d.credits;
 if (d.project_id) { flyerProjectId = d.project_id; localStorage.setItem(FLYER_PROJECT_KEY, flyerProjectId); }
 // A stale "Generate the hero visual first." can be left over from
 // before this project had a hero image (an earlier click, a fresh
 // project) — clear it now since that's no longer true.
 note('flyerLayerNote', ''); note('flyerCompositeNote', '');
 note('flyerHeroNote', 'Rendering… ⏳', 'ok'); btn.textContent = 'Rendering…';
 // Auto-suggests layer ideas the moment the hero image is actually ready
 // — grounded in the real generated image, not the text prompt — so
 // "Add a layer" never opens on a blank box with nothing to react to.
 // Also silently re-confirms the hero onto the project through the same
 // endpoint the manual "upload your own hero" button uses — belt-and-
 // suspenders against Add Layer/Composite ever saying "generate the hero
 // first" for a hero that's plainly sitting on screen: no more needing
 // to download-then-re-upload the very image that was just generated.
 pollJob(d.request_id, $('flyerHeroResult'), 'flyerHeroNote', btn, label, 'image', 100,
 (url) => { flyerHeroForceFallback = false; flyerConfirmHero(url); flyerSuggestLayers(); flyerAutoDetectAccent(url); },
 () => { flyerHeroForceFallback = true; },
 'Flyer hero visual');
 $('flyerLayerPanel').style.display = 'block';
 $('flyerTextPanel').style.display = 'block';
 } catch (e) { $('flyerHeroResult').innerHTML = '<div> ' + (e.message || 'Failed') + '</div>'; note('flyerHeroNote', e.message || 'Failed', 'err'); btn.disabled = false; btn.textContent = label; }
}

// Fire-and-forget: re-asserts the just-generated image as the project's
// hero_image_url via the same reliable endpoint flyerUploadHero() uses, so
// Add Layer/Composite (which read hero_image_url straight from the project
// row) can never end up out of sync with what's actually on screen.
async function flyerConfirmHero(url) {
 if (!url || !flyerProjectId) return;
 try {
 await fetch('/.netlify/functions/flyer-set-hero', {
 method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
 body: JSON.stringify({ project_id: flyerProjectId, image_url: url, aspect: $('flyerAspect').value }),
 });
 } catch (e) {}
}

// Pulls the flyer's own accent color straight from the generated hero
// image instead of making someone hand-pick one every time. Samples the
// image on an offscreen canvas and buckets pixels by hue (24 buckets,
// 15° each) -- hue-only bucketing means different lightness/saturation
// variants of the same color (a gradient, a shadow) still count toward
// the same bucket, which is exactly what "the accent color" means.
// Near-white, near-black, and near-gray pixels are excluded entirely --
// those dominate raw pixel counts (backgrounds, skin, shadow) but are
// never what anyone means by "accent color". The winning bucket's actual
// average RGB becomes the hex value, not just one sample pixel from it.
async function flyerAutoDetectAccent(url) {
 try {
 const img = await new Promise((resolve, reject) => {
 const im = new Image();
 im.crossOrigin = 'anonymous';
 im.onload = () => resolve(im);
 im.onerror = reject;
 im.src = url;
 });
 const SIZE = 80;
 const canvas = document.createElement('canvas');
 canvas.width = SIZE; canvas.height = SIZE;
 const ctx = canvas.getContext('2d');
 ctx.drawImage(img, 0, 0, SIZE, SIZE);
 const { data } = ctx.getImageData(0, 0, SIZE, SIZE); // throws if the image host doesn't allow cross-origin pixel reads

 const BUCKETS = 24;
 const buckets = Array.from({ length: BUCKETS }, () => ({ score: 0, r: 0, g: 0, b: 0, n: 0 }));
 for (let i = 0; i < data.length; i += 4) {
 const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
 if (a < 200) continue; // near-transparent
 const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
 const l = (max + min) / 2 / 255;
 const s = d === 0 ? 0 : d / (255 - Math.abs(max + min - 255));
 if (s < 0.35 || l < 0.12 || l > 0.88) continue; // skip near-white/black/gray
 let h;
 if (d === 0) h = 0;
 else if (max === r) h = ((g - b) / d) % 6;
 else if (max === g) h = (b - r) / d + 2;
 else h = (r - g) / d + 4;
 h = Math.round(h * 60); if (h < 0) h += 360;
 const bucket = buckets[Math.floor(h / (360 / BUCKETS)) % BUCKETS];
 bucket.score += s; bucket.r += r; bucket.g += g; bucket.b += b; bucket.n++;
 }
 let best = null;
 buckets.forEach((b) => { if (b.n >= 6 && (!best || b.score > best.score)) best = b; });
 if (!best) return; // no clearly-saturated color in this image -- leave the manual picker as-is
 const hex = '#' + [best.r, best.g, best.b].map((v) => Math.round(v / best.n).toString(16).padStart(2, '0')).join('');
 $('flyerAccentColor').value = hex;
 note('flyerHeroNote', ` Accent color auto-detected from your hero image (${hex}) — adjust it below if you'd like a different one.`, 'ok');
 } catch (e) {
 // Image host blocked the cross-origin pixel read, or failed to decode
 // -- silently skip. This is a convenience on top of the manual color
 // picker, never a required step, so a quiet no-op is the right failure
 // mode, not an error message about something the user didn't ask for.
 }
}

// Lets a user upload their OWN hero image directly — no generation, no
// waiting, no dependence on the image model at all — and use it exactly
// like a freshly-generated one: Add Layer and Composite only ever read
// project.hero_image_url, so this unblocks both immediately.
async function flyerUploadHero(file) {
 if (preview) { showAuth('signup'); return; }
 if (!file) return;
 note('flyerHeroNote', 'Uploading…', 'ok');
 try {
 const resized = await resizeImageFile(file);
 const ext = (resized.name.split('.').pop() || 'jpg').toLowerCase();
 const path = `${user.id}/flyerhero-${Date.now()}.${ext}`;
 await uploadWithRetry('avatars', path, resized);
 const imageUrl = sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
 const res = await fetch('/.netlify/functions/flyer-set-hero', {
 method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
 body: JSON.stringify({ project_id: flyerProjectId || undefined, image_url: imageUrl, aspect: $('flyerAspect').value }),
 });
 const d = await res.json();
 if (!res.ok) throw new Error(d.error || 'Upload failed');
 if (d.project_id) { flyerProjectId = d.project_id; localStorage.setItem(FLYER_PROJECT_KEY, flyerProjectId); }
 $('flyerHeroResult').innerHTML = `<img src="${imageUrl}" style="width:100%;border-radius:12px">`;
 note('flyerHeroNote', ' Your image is now the working hero visual.', 'ok');
 note('flyerLayerNote', ''); note('flyerCompositeNote', '');
 $('flyerLayerPanel').style.display = 'block';
 $('flyerTextPanel').style.display = 'block';
 flyerSuggestLayers();
 } catch (e) { note('flyerHeroNote', e.message || 'Upload failed', 'err'); }
}

// Each attached layer image carries its OWN optional note ("just the
// logo", "the badge sticker") saying what to take from THAT image
// specifically, instead of one shared instruction trying to describe every
// attached image at once — tap an image, upload it, then say what's in it.
let flyerLayerImgs = [];
async function flyerPickLayerImgs(files) {
 if (preview) { showAuth('signup'); return; }
 if (!files || !files.length) return;
 const limit = 5 - flyerLayerImgs.length;
 if (limit <= 0) return note('flyerLayerNote', 'Max 5 images per layer.', 'err');
 note('flyerLayerNote', 'Uploading…', 'ok');
 for (let i = 0; i < Math.min(files.length, limit); i++) {
 try {
 const file = await resizeImageFile(files[i]);
 const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
 const path = `${user.id}/flyerlayer-${Date.now()}-${i}.${ext}`;
 await uploadWithRetry('avatars', path, file);
 flyerLayerImgs.push({ url: sb.storage.from('avatars').getPublicUrl(path).data.publicUrl, note: '' });
 } catch (error) { note('flyerLayerNote', (error && error.message) || 'Upload failed.', 'err'); }
 }
 renderFlyerLayerImgs();
 note('flyerLayerNote', ` ${flyerLayerImgs.length} image(s) attached — say what to take from each one below it (optional).`, 'ok');
}
function renderFlyerLayerImgs() {
 $('flyerLayerImgThumbs').innerHTML = flyerLayerImgs.map((img, i) =>
 `<div style="width:74px">
 <div style="position:relative"><img src="${img.url}" style="width:56px;height:56px;object-fit:cover;border-radius:8px;border:1px solid var(--line)">
 <span class="ref-x" onclick="window.fuseFlyerRmLayerImg(${i})"></span></div>
 <input placeholder="e.g. just the logo" value="${(img.note || '').replace(/"/g, '&quot;')}" oninput="window.fuseFlyerSetLayerNote(${i}, this.value)" style="width:100%;margin-top:4px;font-size:10.5px;padding:3px 5px">
 </div>`).join('');
}
window.fuseFlyerRmLayerImg = (i) => { flyerLayerImgs.splice(i, 1); renderFlyerLayerImgs(); };
window.fuseFlyerSetLayerNote = (i, val) => { if (flyerLayerImgs[i]) flyerLayerImgs[i].note = val; };

async function flyerSuggestLayers() {
 if (preview) { showAuth('signup'); return; }
 if (!flyerProjectId) await restoreFlyerProject();
 if (!flyerProjectId) return note('flyerLayerNote', 'Generate the hero visual first.', 'err');
 const btn = $('flyerSuggestLayers'); btn.disabled = true; btn.textContent = 'Looking at your hero image…';
 $('flyerLayerSuggestions').innerHTML = '';
 try {
 const res = await fetch('/.netlify/functions/flyer-suggest-layers', {
 method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
 body: JSON.stringify({ project_id: flyerProjectId }),
 });
 const d = await res.json();
 if (res.status === 402) { note('flyerLayerNote', 'Out of credits — top up.', 'err'); openBuy(); btn.disabled = false; btn.textContent = ' Suggest layers (looks at your hero image)'; return; }
 if (!res.ok) throw new Error(d.error || 'Failed');
 if (d.credits != null) $('creditCount').textContent = d.credits;
 let s = 0;
 const timer = setInterval(async () => {
 s += 3;
 try {
 const r = await fetch(`/.netlify/functions/job-status?id=${d.request_id}`, { headers: { ...(await authHeader()) } });
 const jd = await r.json();
 if (jd.status === 'completed') {
 clearInterval(timer);
 const ideas = (jd.text || '').split('\n').map((l) => l.replace(/^\s*-\s*/, '').trim()).filter(Boolean);
 $('flyerLayerSuggestions').innerHTML = ideas.map((idea, i) =>
 `<span class="chip" data-i="${i}">${idea.replace(/</g, '&lt;')}</span>`).join('');
 $('flyerLayerSuggestions').querySelectorAll('.chip').forEach((el, i) => el.onclick = () => { $('flyerLayerInput').value = ideas[i]; $('flyerLayerInput').scrollIntoView({ behavior: 'smooth' }); });
 btn.disabled = false; btn.textContent = ' Suggest layers (looks at your hero image)';
 } else if (jd.status === 'failed') {
 clearInterval(timer);
 note('flyerLayerNote', (jd.error || 'Failed') + ' — credits refunded.', 'err');
 btn.disabled = false; btn.textContent = ' Suggest layers (looks at your hero image)';
 }
 } catch (e) {}
 if (s >= 60) { clearInterval(timer); note('flyerLayerNote', 'Still thinking — try again shortly.', 'err'); btn.disabled = false; btn.textContent = ' Suggest layers (looks at your hero image)'; }
 }, 3000);
 } catch (e) { note('flyerLayerNote', e.message || 'Failed', 'err'); btn.disabled = false; btn.textContent = ' Suggest layers (looks at your hero image)'; }
}
async function flyerAddLayer() {
 if (preview) { showAuth('signup'); return; }
 const instruction = $('flyerLayerInput').value.trim();
 if (!instruction) return;
 // Self-heal before giving up — if something left the in-memory project id
 // empty even though a project genuinely exists (the reload/routing bug
 // that used to strand people here), this recovers it from the same
 // localStorage id restoreFlyerProject() already knows how to use.
 if (!flyerProjectId) await restoreFlyerProject();
 if (!flyerProjectId) return note('flyerLayerNote', 'Generate the hero visual first.', 'err');
 const btn = $('flyerAddLayer'); btn.disabled = true; btn.textContent = 'Adding…';
 note('flyerLayerNote', '');
 try {
 const res = await fetch('/.netlify/functions/flyer-layer', {
 method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
 body: JSON.stringify({ project_id: flyerProjectId, instruction, layer_images: flyerLayerImgs }),
 });
 const d = await res.json();
 if (res.status === 402) { note('flyerLayerNote', 'Out of credits — top up.', 'err'); openBuy(); btn.disabled = false; btn.textContent = 'Add layer'; return; }
 if (!res.ok) throw new Error(d.error || 'Failed');
 if (d.credits != null) $('creditCount').textContent = d.credits;
 flyerLayers.push(instruction);
 $('flyerLayerLog').innerHTML = flyerLayers.map((l) => `<div class="muted" style="font-size:12px"> ${l}</div>`).join('');
 $('flyerLayerInput').value = '';
 flyerLayerImgs = []; renderFlyerLayerImgs();
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
 flyerConfirmHero(jd.url);
 note('flyerLayerNote', ' Layer added.', 'ok');
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

// Flyer Studio font picker — metadata only (id/family/category); the actual
// font BYTES live server-side in _flyer-fonts-library.js and are never sent
// to the browser. This list is just enough to build the <select>.
const FLYER_FONT_META = [{"id":"anton","family":"Anton","category":"display"},{"id":"archivo-black","family":"Archivo Black","category":"display"},{"id":"bebas-neue","family":"Bebas Neue","category":"display"},{"id":"oswald","family":"Oswald","category":"display"},{"id":"poppins","family":"Poppins","category":"display"},{"id":"montserrat","family":"Montserrat","category":"display"},{"id":"raleway","family":"Raleway","category":"display"},{"id":"barlow-condensed","family":"Barlow Condensed","category":"display"},{"id":"fjalla-one","family":"Fjalla One","category":"display"},{"id":"passion-one","family":"Passion One","category":"display"},{"id":"alfa-slab-one","family":"Alfa Slab One","category":"display"},{"id":"bungee","family":"Bungee","category":"display"},{"id":"bungee-inline","family":"Bungee Inline","category":"display"},{"id":"righteous","family":"Righteous","category":"display"},{"id":"titan-one","family":"Titan One","category":"display"},{"id":"luckiest-guy","family":"Luckiest Guy","category":"display"},{"id":"bangers","family":"Bangers","category":"display"},{"id":"rubik-mono-one","family":"Rubik Mono One","category":"display"},{"id":"staatliches","family":"Staatliches","category":"display"},{"id":"teko","family":"Teko","category":"display"},{"id":"big-shoulders-display","family":"Big Shoulders Display","category":"display"},{"id":"chivo","family":"Chivo","category":"display"},{"id":"saira-condensed","family":"Saira Condensed","category":"display"},{"id":"kanit","family":"Kanit","category":"display"},{"id":"exo-2","family":"Exo 2","category":"display"},{"id":"orbitron","family":"Orbitron","category":"display"},{"id":"audiowide","family":"Audiowide","category":"display"},{"id":"russo-one","family":"Russo One","category":"display"},{"id":"black-ops-one","family":"Black Ops One","category":"display"},{"id":"squada-one","family":"Squada One","category":"display"},{"id":"unbounded","family":"Unbounded","category":"display"},{"id":"space-grotesk","family":"Space Grotesk","category":"display"},{"id":"sora","family":"Sora","category":"display"},{"id":"manrope","family":"Manrope","category":"display"},{"id":"plus-jakarta-sans","family":"Plus Jakarta Sans","category":"display"},{"id":"dm-sans","family":"DM Sans","category":"display"},{"id":"lexend","family":"Lexend","category":"display"},{"id":"outfit","family":"Outfit","category":"display"},{"id":"syne","family":"Syne","category":"display"},{"id":"familjen-grotesk","family":"Familjen Grotesk","category":"display"},{"id":"hanken-grotesk","family":"Hanken Grotesk","category":"display"},{"id":"urbanist","family":"Urbanist","category":"display"},{"id":"epilogue","family":"Epilogue","category":"display"},{"id":"instrument-sans","family":"Instrument Sans","category":"display"},{"id":"bricolage-grotesque","family":"Bricolage Grotesque","category":"display"},{"id":"grandstander","family":"Grandstander","category":"display"},{"id":"anybody","family":"Anybody","category":"display"},{"id":"league-gothic","family":"League Gothic","category":"display"},{"id":"khand","family":"Khand","category":"display"},{"id":"yanone-kaffeesatz","family":"Yanone Kaffeesatz","category":"display"},{"id":"prosto-one","family":"Prosto One","category":"display"},{"id":"bowlby-one","family":"Bowlby One","category":"display"},{"id":"bowlby-one-sc","family":"Bowlby One SC","category":"display"},{"id":"baloo-2","family":"Baloo 2","category":"display"},{"id":"boogaloo","family":"Boogaloo","category":"display"},{"id":"fredoka","family":"Fredoka","category":"display"},{"id":"concert-one","family":"Concert One","category":"display"},{"id":"sniglet","family":"Sniglet","category":"display"},{"id":"chewy","family":"Chewy","category":"display"},{"id":"nunito-sans","family":"Nunito Sans","category":"display"},{"id":"jost","family":"Jost","category":"display"},{"id":"josefin-sans","family":"Josefin Sans","category":"display"},{"id":"redacted-script","family":"Redacted Script","category":"display"},{"id":"playfair-display","family":"Playfair Display","category":"serif"},{"id":"abril-fatface","family":"Abril Fatface","category":"serif"},{"id":"fraunces","family":"Fraunces","category":"serif"},{"id":"bodoni-moda","family":"Bodoni Moda","category":"serif"},{"id":"libre-caslon-display","family":"Libre Caslon Display","category":"serif"},{"id":"dm-serif-display","family":"DM Serif Display","category":"serif"},{"id":"bitter","family":"Bitter","category":"serif"},{"id":"cormorant","family":"Cormorant","category":"serif"},{"id":"cormorant-garamond","family":"Cormorant Garamond","category":"serif"},{"id":"prata","family":"Prata","category":"serif"},{"id":"marcellus","family":"Marcellus","category":"serif"},{"id":"cinzel","family":"Cinzel","category":"serif"},{"id":"cinzel-decorative","family":"Cinzel Decorative","category":"serif"},{"id":"italiana","family":"Italiana","category":"serif"},{"id":"petrona","family":"Petrona","category":"serif"},{"id":"spectral","family":"Spectral","category":"serif"},{"id":"domine","family":"Domine","category":"serif"},{"id":"crimson-pro","family":"Crimson Pro","category":"serif"},{"id":"vollkorn","family":"Vollkorn","category":"serif"},{"id":"rozha-one","family":"Rozha One","category":"serif"},{"id":"yeseva-one","family":"Yeseva One","category":"serif"},{"id":"alegreya","family":"Alegreya","category":"serif"},{"id":"alegreya-sc","family":"Alegreya SC","category":"serif"},{"id":"old-standard-tt","family":"Old Standard TT","category":"serif"},{"id":"pacifico","family":"Pacifico","category":"script"},{"id":"caveat","family":"Caveat","category":"script"},{"id":"dancing-script","family":"Dancing Script","category":"script"},{"id":"sacramento","family":"Sacramento","category":"script"},{"id":"great-vibes","family":"Great Vibes","category":"script"},{"id":"satisfy","family":"Satisfy","category":"script"},{"id":"kalam","family":"Kalam","category":"script"},{"id":"shadows-into-light","family":"Shadows Into Light","category":"script"},{"id":"amatic-sc","family":"Amatic SC","category":"script"},{"id":"permanent-marker","family":"Permanent Marker","category":"script"},{"id":"indie-flower","family":"Indie Flower","category":"script"},{"id":"gochi-hand","family":"Gochi Hand","category":"script"},{"id":"reenie-beanie","family":"Reenie Beanie","category":"script"},{"id":"alex-brush","family":"Alex Brush","category":"script"},{"id":"allura","family":"Allura","category":"script"},{"id":"parisienne","family":"Parisienne","category":"script"},{"id":"yellowtail","family":"Yellowtail","category":"script"},{"id":"lobster","family":"Lobster","category":"script"},{"id":"courgette","family":"Courgette","category":"script"},{"id":"space-mono","family":"Space Mono","category":"mono"},{"id":"ibm-plex-mono","family":"IBM Plex Mono","category":"mono"},{"id":"jetbrains-mono","family":"JetBrains Mono","category":"mono"},{"id":"roboto-mono","family":"Roboto Mono","category":"mono"},{"id":"inter","family":"Inter","category":"body"},{"id":"roboto","family":"Roboto","category":"body"},{"id":"open-sans","family":"Open Sans","category":"body"},{"id":"work-sans","family":"Work Sans","category":"body"},{"id":"nunito","family":"Nunito","category":"body"},{"id":"karla","family":"Karla","category":"body"},{"id":"mulish","family":"Mulish","category":"body"}];
const FLYER_FONT_CATEGORY_LABEL = { display: 'Display / Headline', serif: 'Serif', script: 'Script / Handwritten', mono: 'Monospace', body: 'Clean Body' };

function populateFlyerFontPicker() {
 const sel = $('flyerFontPicker');
 if (!sel || sel.options.length) return; // already populated
 const byCat = {};
 FLYER_FONT_META.forEach((f) => { (byCat[f.category] = byCat[f.category] || []).push(f); });
 Object.keys(FLYER_FONT_CATEGORY_LABEL).forEach((cat) => {
 if (!byCat[cat]) return;
 const group = document.createElement('optgroup');
 group.label = FLYER_FONT_CATEGORY_LABEL[cat];
 byCat[cat].forEach((f) => {
 const opt = document.createElement('option');
 opt.value = f.id; opt.textContent = f.family;
 group.appendChild(opt);
 });
 sel.appendChild(group);
 });
}

async function flyerCompositeWithFont() {
 const fontId = $('flyerFontPicker').value;
 const headline = $('flyerHeadline').value.trim();
 if (!headline) return note('flyerCompositeNote', 'Add a headline first.', 'err');
 const bullets = $('flyerBullets').value.split('\n').map((b) => b.trim()).filter(Boolean);
 const callouts = $('flyerCallouts').value.split('\n').map((c) => c.trim()).filter(Boolean);
 const spec = {
 headline, accent_word: $('flyerAccentWord').value.trim() || undefined,
 subhead: $('flyerSubhead').value.trim() || undefined,
 bullets: bullets.length ? bullets : undefined,
 callouts: callouts.length ? callouts : undefined,
 badge: $('flyerBadge').value.trim() || undefined,
 footer: $('flyerFooter').value.trim() || undefined,
 accent_color: $('flyerAccentColor').value,
 style: $('flyerTextStyle').value,
 underline_accent: $('flyerUnderlineAccent').checked,
 gradient_whole: $('flyerGradientWhole').checked,
 headline_position: ($('flyerHeadlinePosition') && $('flyerHeadlinePosition').value) || 'top-center',
 };
 const btn = $('flyerComposite'); const label = ' Composite final flyer';
 btn.disabled = true; btn.textContent = 'Rendering…';
 $('flyerFinalResult').innerHTML = '<div><span class="spin"></span><div style="margin-top:12px">Rendering with ' + (FLYER_FONT_META.find((f) => f.id === fontId) || {}).family + '…</div></div>';
 note('flyerCompositeNote', '');
 try {
 const res = await fetch('/.netlify/functions/flyer-composite-fonts', {
 method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
 body: JSON.stringify({ project_id: flyerProjectId, text_spec: spec, font_id: fontId }),
 });
 const d = await res.json();
 if (!res.ok) throw new Error(d.error || 'Failed');
 $('flyerFinalResult').innerHTML = '<img src="' + d.url + '" style="width:100%;border-radius:12px" alt="">';
 note('flyerCompositeNote', 'Done — rendered in ' + d.font + '.', 'ok');
 $('flyerSpotFixOpen').style.display = 'block';
 } catch (e) {
 $('flyerFinalResult').innerHTML = '<div> ' + (e.message || 'Failed') + '</div>';
 note('flyerCompositeNote', e.message || 'Failed', 'err');
 }
 btn.disabled = false; btn.textContent = label;
}

async function flyerComposite() {
 if (preview) { showAuth('signup'); return; }
 if ($('flyerRenderMode') && $('flyerRenderMode').value === 'font') return flyerCompositeWithFont();
 if (!flyerProjectId) await restoreFlyerProject();
 if (!flyerProjectId) return note('flyerCompositeNote', 'Generate the hero visual first.', 'err');
 const headline = $('flyerHeadline').value.trim();
 if (!headline) return note('flyerCompositeNote', 'Add a headline first.', 'err');
 const bullets = $('flyerBullets').value.split('\n').map((b) => b.trim()).filter(Boolean);
 const callouts = $('flyerCallouts').value.split('\n').map((c) => c.trim()).filter(Boolean);
 const spec = {
 headline, accent_word: $('flyerAccentWord').value.trim() || undefined,
 subhead: $('flyerSubhead').value.trim() || undefined,
 bullets: bullets.length ? bullets : undefined,
 callouts: callouts.length ? callouts : undefined,
 badge: $('flyerBadge').value.trim() || undefined,
 footer: $('flyerFooter').value.trim() || undefined,
 accent_color: $('flyerAccentColor').value,
 style: $('flyerTextStyle').value,
 underline_accent: $('flyerUnderlineAccent').checked,
 gradient_whole: $('flyerGradientWhole').checked,
 headline_position: ($('flyerHeadlinePosition') && $('flyerHeadlinePosition').value) || 'top-center',
 extra_instructions: $('flyerExtraInstructions').value.trim() || undefined,
 };
 const btn = $('flyerComposite'); const label = ' Composite final flyer';
 btn.disabled = true; btn.textContent = 'Submitting…';
 $('flyerFinalResult').innerHTML = '<div><span class="spin"></span><div style="margin-top:12px">Rendering the typography…</div></div>';
 note('flyerCompositeNote', '');
 try {
 const res = await fetch('/.netlify/functions/flyer-composite', {
 method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
 body: JSON.stringify({
 project_id: flyerProjectId, text_spec: spec,
 headline_reference_url: flyerCompositeRefs.headline || undefined,
 features_reference_url: flyerCompositeRefs.features || undefined,
 cta_reference_url: flyerCompositeRefs.cta || undefined,
 }),
 });
 const d = await res.json();
 if (res.status === 402) { note('flyerCompositeNote', 'Out of credits — top up.', 'err'); openBuy(); btn.disabled = false; btn.textContent = label; return; }
 if (!res.ok) throw new Error(d.error || 'Failed');
 if (d.credits != null) $('creditCount').textContent = d.credits;
 note('flyerCompositeNote', 'Rendering… ⏳', 'ok'); btn.textContent = 'Rendering…';
 // 180s not 100 — every attached structure reference adds an image (up
 // to 4 total: hero + headline + features + cta), and GPT Image 2's real
 // inference time grows with image count (confirmed live: ~94s with one
 // extra reference vs ~48s with none) — 180s covers even all three attached.
 pollJob(d.request_id, $('flyerFinalResult'), 'flyerCompositeNote', btn, label, 'image', 180, () => { $('flyerSpotFixOpen').style.display = 'block'; }, null, 'Finished flyer');
 } catch (e) { $('flyerFinalResult').innerHTML = '<div> ' + (e.message || 'Failed') + '</div>'; note('flyerCompositeNote', e.message || 'Failed', 'err'); btn.disabled = false; btn.textContent = label; }
}

// ---------------- Design Studio (Flyer Studio, Phase 1) ----------------
// "Design it yourself" — a real interactive canvas editor (Fabric.js,
// loaded lazily so it never costs anything on page load unless someone
// actually opens it) sitting alongside the AI-drawn and font-picker
// composite modes. Opens with the project's own hero visual as the
// background; text/shapes/images are real Fabric objects, not a fixed
// server-side layout like flyer-composite-fonts.js's deterministic
// stack — the whole point here is the user positions everything by hand.
let dsFabric = null;      // the fabric module, imported once
let dsCanvas = null;      // the live fabric.Canvas instance
let dsProject = null;     // { id, hero_image_url, aspect }
let dsHistory = [];       // undo stack of JSON snapshots
let dsHistoryIndex = -1;
let dsApplyingHistory = false;

const DS_ASPECT_SIZE = { '1:1': [1024, 1024], '4:5': [1024, 1280], '3:4': [1024, 1366], '9:16': [832, 1472], '16:9': [1472, 832] };
function dsIsText(obj) { return !!(obj && dsFabric && obj instanceof dsFabric.Textbox); }
function dsIsImage(obj) { return !!(obj && dsFabric && obj instanceof dsFabric.FabricImage); }
function dsIsCircle(obj) { return !!(obj && dsFabric && obj instanceof dsFabric.Circle); }
function dsIsLine(obj) { return !!(obj && dsFabric && obj instanceof dsFabric.Line); }

async function loadFabric() {
 if (!dsFabric) dsFabric = await import('https://esm.sh/fabric@6.5.1');
 return dsFabric;
}

// Google Fonts, loaded on demand straight in the browser (NOT the same
// base64 library flyer-composite-fonts.js bundles server-side — that one
// exists so a headless Node canvas can register real font bytes with no
// browser involved; here a real browser is already rendering the page, so
// a normal @font-face stylesheet link is simpler and lets the browser's
// own cache do the work across sessions).
const dsLoadedFontCss = new Set();
async function ensureBrowserFont(family) {
 if (dsLoadedFontCss.has(family)) return document.fonts.ready;
 dsLoadedFontCss.add(family);
 const link = document.createElement('link');
 link.rel = 'stylesheet';
 link.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(family).replace(/%20/g, '+') + ':wght@400;700&display=swap';
 document.head.appendChild(link);
 try { await document.fonts.load('700 40px "' + family + '"'); } catch (e) {}
 return document.fonts.ready;
}

function dsPushHistory() {
 if (dsApplyingHistory || !dsCanvas) return;
 const snap = JSON.stringify(dsCanvas.toJSON());
 dsHistory = dsHistory.slice(0, dsHistoryIndex + 1);
 dsHistory.push(snap);
 if (dsHistory.length > 40) dsHistory.shift(); // cap memory — 40 steps is plenty for one session
 dsHistoryIndex = dsHistory.length - 1;
}
async function dsRestoreHistory(index) {
 if (!dsCanvas || index < 0 || index >= dsHistory.length) return;
 dsApplyingHistory = true;
 await dsCanvas.loadFromJSON(JSON.parse(dsHistory[index]));
 dsCanvas.renderAll();
 dsHistoryIndex = index;
 dsApplyingHistory = false;
 dsRefreshLayers();
}

// Launched directly from Home (the Studios marquee / footer link) —
// "just to design," no AI step, no existing flyer project. There's no
// client-side insert policy on flyer_projects (every write goes through a
// server function with the admin client), so a fresh blank one is created
// server-side first via flyer-project-create.js, then the canvas opens
// with nothing but its own solid background — same editor, same Save/
// Export/reopen, just starting from an empty page instead of a hero visual.
async function openDesignStudioBlank() {
 if (preview) { showAuth('signup'); return; }
 $('dsOverlay').style.display = 'flex';
 dsHideDrawer();
 note('dsNote', 'Setting up a new design…');
 try {
 const res = await fetch('/.netlify/functions/flyer-project-create', {
 method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
 body: JSON.stringify({ aspect: '4:5' }),
 });
 const d = await res.json();
 if (!res.ok) throw new Error(d.error || 'Could not start a new design.');
 dsProject = { id: d.project_id, hero_image_url: null, aspect: d.aspect || '4:5', final_url: null, design_state: null, design_state_hero_url: null };
 const fabric = await loadFabric();
 await dsInitCanvas(fabric, null, dsProject.aspect, null);
 dsPopulateFontPicker();
 note('dsNote', '');
 } catch (e) { note('dsNote', e.message || 'Could not open the editor.', 'err'); }
}

async function openDesignStudio() {
 if (preview) { showAuth('signup'); return; }
 if (!flyerProjectId) await restoreFlyerProject();
 if (!flyerProjectId) return note('flyerCompositeNote', 'Generate the hero visual first.', 'err');
 const { data: proj } = await sb.from('flyer_projects').select('id,hero_image_url,aspect,final_url,design_state,design_state_hero_url').eq('id', flyerProjectId).maybeSingle();
 if (!proj || !proj.hero_image_url) return note('flyerCompositeNote', 'Generate the hero visual first.', 'err');
 dsProject = proj;
 $('dsOverlay').style.display = 'flex';
 dsHideDrawer();
 note('dsNote', 'Loading…');
 try {
 const fabric = await loadFabric();
 // The hero image itself is always the background — but if a design was
 // already saved ON TOP OF this exact same hero, reopen it as a live,
 // still-editable canvas (every layer selectable again) instead of just
 // showing the flat picture. If the hero was regenerated since that save
 // (design_state_hero_url no longer matches), that old layout was built
 // for a different image and almost certainly doesn't line up anymore —
 // start clean on the new hero instead of silently reusing stale layers.
 const reopenSaved = proj.design_state && proj.design_state_hero_url === proj.hero_image_url;
 await dsInitCanvas(fabric, proj.hero_image_url, proj.aspect || '4:5', reopenSaved ? proj.design_state : null);
 dsPopulateFontPicker();
 note('dsNote', reopenSaved ? '↺ Picked up your saved design.' : '');
 } catch (e) { note('dsNote', e.message || 'Could not open the editor.', 'err'); }
}

function closeDesignStudio() {
 $('dsOverlay').style.display = 'none';
 if (dsCanvas) { dsCanvas.dispose(); dsCanvas = null; }
 dsHistory = []; dsHistoryIndex = -1;
 dsMode = 'select'; dsPenPoints = []; dsPenTempObjs = [];
}

async function dsInitCanvas(fabric, bgUrl, aspect, savedState) {
 const [w, h] = DS_ASPECT_SIZE[aspect] || DS_ASPECT_SIZE['4:5'];
 const stage = $('dsCanvasStage');
 // Fit the real (often ~1000px+) canvas into the available screen space —
 // Fabric renders at canvasScale, objects still use real coordinates.
 const maxW = Math.min(window.innerWidth - 380, 900), maxH = window.innerHeight - 140;
 const scale = Math.min(maxW / w, maxH / h, 1);
 const dispW = Math.round(w * scale), dispH = Math.round(h * scale);
 stage.style.width = dispW + 'px'; stage.style.height = dispH + 'px';

 const canvasEl = $('dsCanvas');
 if (dsCanvas) { dsCanvas.dispose(); }
 dsCanvas = new fabric.Canvas(canvasEl, { width: w, height: h, backgroundColor: '#0a0a0a', preserveObjectStacking: true });
 dsCanvas.setDimensions({ width: dispW, height: dispH }, { cssOnly: true });
 dsCanvas.setZoom(scale);

 if (savedState) {
 // Reopening a save: the JSON already carries every object AND the
 // background image reference (Fabric's own toJSON/loadFromJSON
 // round-trips backgroundImage automatically) — nothing to load manually.
 try { await dsCanvas.loadFromJSON(savedState); dsCanvas.renderAll(); } catch (e) {}
 } else if (bgUrl) {
 try {
 const img = await fabric.FabricImage.fromURL(bgUrl, { crossOrigin: 'anonymous' });
 img.set({ selectable: false, evented: false });
 const s = Math.max(w / img.width, h / img.height);
 img.set({ scaleX: s, scaleY: s, left: w / 2, top: h / 2, originX: 'center', originY: 'center' });
 dsCanvas.backgroundImage = img;
 dsCanvas.renderAll();
 } catch (e) {}
 } else {
 dsCanvas.renderAll(); // blank canvas — just the solid backgroundColor, nothing to load
 }

 dsCanvas.on('selection:created', dsOnSelectionChange);
 dsCanvas.on('selection:updated', dsOnSelectionChange);
 dsCanvas.on('selection:cleared', dsOnSelectionChange);
 dsCanvas.on('object:modified', dsPushHistory);
 dsCanvas.on('object:added', () => { dsPushHistory(); dsRefreshLayers(); });
 dsCanvas.on('object:removed', () => { dsPushHistory(); dsRefreshLayers(); });
 dsCanvas.on('mouse:down', dsCanvasPenClick);
 dsCanvas.on('mouse:dblclick', dsFinishPenShape);
 dsMode = 'select';
 dsHistory = []; dsHistoryIndex = -1;
 dsPushHistory();
 dsRefreshLayers();
}

function dsPopulateFontPicker() {
 const sel = $('dsTextFont');
 if (sel.options.length) return;
 const byCat = {};
 FLYER_FONT_META.forEach((f) => { (byCat[f.category] = byCat[f.category] || []).push(f); });
 Object.keys(FLYER_FONT_CATEGORY_LABEL).forEach((cat) => {
 if (!byCat[cat]) return;
 const group = document.createElement('optgroup');
 group.label = FLYER_FONT_CATEGORY_LABEL[cat];
 byCat[cat].forEach((f) => { const o = document.createElement('option'); o.value = f.family; o.textContent = f.family; group.appendChild(o); });
 sel.appendChild(group);
 });
}

// ---- Add tools ----
async function dsAddText() {
 if (!dsCanvas) return;
 if (dsMode !== 'select') await dsSetMode('select');
 const fabric = await loadFabric();
 const family = $('dsTextFont').value || 'Poppins';
 await ensureBrowserFont(family);
 const t = new fabric.Textbox('Your text here', {
 left: dsCanvas.getWidth() / (2 * dsCanvas.getZoom()), top: dsCanvas.getHeight() / (2 * dsCanvas.getZoom()),
 originX: 'center', originY: 'center', fontFamily: family, fontSize: 48, fill: '#ffffff', width: 300, textAlign: 'center',
 });
 dsCanvas.add(t); dsCanvas.setActiveObject(t); dsCanvas.renderAll();
}
async function dsAddShape(kind) {
 if (!dsCanvas) return;
 if (dsMode !== 'select') await dsSetMode('select');
 const fabric = await loadFabric();
 const cx = dsCanvas.getWidth() / (2 * dsCanvas.getZoom()), cy = dsCanvas.getHeight() / (2 * dsCanvas.getZoom());
 let obj;
 if (kind === 'rect') obj = new fabric.Rect({ left: cx, top: cy, originX: 'center', originY: 'center', width: 220, height: 150, fill: '#00e0c6' });
 else if (kind === 'circle') obj = new fabric.Circle({ left: cx, top: cy, originX: 'center', originY: 'center', radius: 90, fill: '#00e0c6' });
 else obj = new fabric.Line([cx - 120, cy, cx + 120, cy], { stroke: '#ffffff', strokeWidth: 6 });
 dsCanvas.add(obj); dsCanvas.setActiveObject(obj); dsCanvas.renderAll();
}
async function dsAddImageFromFile(file) {
 if (!dsCanvas || !file) return;
 if (dsMode !== 'select') await dsSetMode('select');
 const fabric = await loadFabric();
 const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
 const img = await fabric.FabricImage.fromURL(dataUrl);
 const maxDim = Math.min(dsCanvas.getWidth(), dsCanvas.getHeight()) / (2 * dsCanvas.getZoom());
 const s = Math.min(1, maxDim / Math.max(img.width, img.height));
 img.set({ left: dsCanvas.getWidth() / (2 * dsCanvas.getZoom()), top: dsCanvas.getHeight() / (2 * dsCanvas.getZoom()), originX: 'center', originY: 'center', scaleX: s, scaleY: s });
 dsCanvas.add(img); dsCanvas.setActiveObject(img); dsCanvas.renderAll();
}

// ---- Selection / properties panel ----
const DS_PROP_BLOCKS = ['dsDrawProps', 'dsPenProps', 'dsTextProps', 'dsShapeProps', 'dsImageProps', 'dsCommonProps'];
function dsHideAllPropPanels() { DS_PROP_BLOCKS.forEach((id) => { $(id).style.display = 'none'; }); }

function dsOnSelectionChange() {
 if (dsMode === 'draw' || dsMode === 'pen') return; // those modes own the props panel while active
 const obj = dsCanvas && dsCanvas.getActiveObject();
 dsHideAllPropPanels();
 $('dsPropsEmpty').style.display = obj ? 'none' : 'block';
 $('dsQuickActions').style.display = obj ? 'flex' : 'none';
 if (!obj) {
 // Only collapse the drawer if Style was what was showing — a manually
 // opened Layers/Canvas/AI drawer shouldn't get yanked away just because
 // the canvas selection cleared.
 const stylePanel = $('dsPanelProps');
 if (stylePanel.style.display === 'block') dsHideDrawer();
 return;
 }
 dsSwitchDrawer('dsPanelProps', true);
 $('dsCommonProps').style.display = 'block';
 $('dsOpacity').value = Math.round((obj.opacity != null ? obj.opacity : 1) * 100);
 if (dsIsText(obj)) {
 $('dsTextProps').style.display = 'block';
 $('dsTextValue').value = obj.text || '';
 $('dsTextFont').value = obj.fontFamily || 'Poppins';
 $('dsTextSize').value = obj.fontSize || 48;
 $('dsTextColor').value = dsToHex(obj.fill) || '#ffffff';
 $('dsTextBold').checked = obj.fontWeight === 'bold' || obj.fontWeight === 700;
 } else if (dsIsImage(obj)) {
 $('dsImageProps').style.display = 'block';
 } else if (obj.fill !== undefined) {
 $('dsShapeProps').style.display = 'block';
 const isGrad = obj.fill && typeof obj.fill === 'object';
 $('dsFillGradient').checked = isGrad;
 $('dsSolidFillWrap').style.display = isGrad ? 'none' : 'block';
 $('dsGradientFillWrap').style.display = isGrad ? 'block' : 'none';
 if (isGrad && obj.fill.colorStops && obj.fill.colorStops[0]) {
 $('dsGradColor1').value = obj.fill.colorStops[0].color || '#00e0c6';
 $('dsGradColor2').value = (obj.fill.colorStops[1] && obj.fill.colorStops[1].color) || '#A9FF67';
 } else {
 $('dsShapeFill').value = dsToHex(obj.fill) || '#00e0c6';
 }
 $('dsShapeStroke').value = dsToHex(obj.stroke) || '#ffffff';
 $('dsShapeStrokeWidth').value = obj.strokeWidth || 0;
 }
}
function dsToHex(c) { return (typeof c === 'string' && /^#/.test(c)) ? c : null; }

// ---- Gradient fill ----
async function dsApplyFillFromPanel() {
 const o = dsCanvas && dsCanvas.getActiveObject();
 if (!o) return;
 if ($('dsFillGradient').checked) {
 const fabric = await loadFabric();
 const angle = Number($('dsGradAngle').value);
 const w = (o.width || 100), h = (o.height || 100);
 const rad = angle * Math.PI / 180;
 const cx = w / 2, cy = h / 2, len = Math.max(w, h) / 2;
 const dx = Math.cos(rad) * len, dy = Math.sin(rad) * len;
 const grad = new fabric.Gradient({
 type: 'linear',
 coords: { x1: cx - dx, y1: cy - dy, x2: cx + dx, y2: cy + dy },
 colorStops: [{ offset: 0, color: $('dsGradColor1').value }, { offset: 1, color: $('dsGradColor2').value }],
 });
 o.set('fill', grad);
 } else {
 o.set('fill', $('dsShapeFill').value);
 }
 dsCanvas.renderAll();
}

// ---- Mode management: select / freehand draw / pen (click-to-place polyline) ----
let dsMode = 'select';
let dsPenPoints = [];
let dsPenTempObjs = [];

// Commits whatever's been placed so far into a real Polyline/Polygon
// object — used both by the explicit "Finish shape" button AND by
// dsSetMode whenever pen mode is exited any OTHER way (tapping a bottom-
// bar icon, selecting a font, anything). That second path is the fix for
// a real bug: switching drawers used to leave pen mode silently active in
// the background, so a later stray tap on the canvas kept adding points
// to an uncommitted shape, and the NEXT cancel/mode-switch wiped it —
// which looked exactly like "I drew something and it disappeared." Now
// leaving pen mode always either finishes what you drew (2+ points) or
// simply has nothing to lose (fewer than 2).
async function dsCommitPenShapeIfAny() {
 if (dsPenPoints.length < 2) { dsClearPenTemp(); dsPenPoints = []; return null; }
 const fabric = await loadFabric();
 const points = dsPenPoints.slice();
 dsClearPenTemp(); dsPenPoints = [];
 const close = $('dsPenClose').checked;
 const Ctor = close ? fabric.Polygon : fabric.Polyline;
 const shape = new Ctor(points, { fill: close ? '#00e0c6' : '', stroke: '#ffffff', strokeWidth: 3, objectCaching: false });
 dsCanvas.add(shape);
 return shape;
}

async function dsSetMode(mode) {
 if (!dsCanvas) return;
 let committed = null;
 if (dsMode === 'pen' && mode !== 'pen') committed = await dsCommitPenShapeIfAny();
 dsCanvas.isDrawingMode = false;
 dsCanvas.selection = true;
 dsCanvas.forEachObject((o) => { o.selectable = true; o.evented = true; });
 dsMode = mode;
 if (mode === 'draw') {
 const fabric = await loadFabric();
 dsCanvas.discardActiveObject();
 dsCanvas.isDrawingMode = true;
 dsCanvas.freeDrawingBrush = new fabric.PencilBrush(dsCanvas);
 dsCanvas.freeDrawingBrush.color = $('dsBrushColor').value;
 dsCanvas.freeDrawingBrush.width = Number($('dsBrushSize').value);
 dsHideAllPropPanels(); $('dsPropsEmpty').style.display = 'none'; $('dsQuickActions').style.display = 'none'; $('dsDrawProps').style.display = 'block';
 dsSwitchDrawer('dsPanelProps', true);
 } else if (mode === 'pen') {
 dsCanvas.discardActiveObject();
 dsCanvas.selection = false;
 dsCanvas.forEachObject((o) => { o.selectable = false; });
 dsPenPoints = []; dsPenTempObjs = [];
 dsHideAllPropPanels(); $('dsPropsEmpty').style.display = 'none'; $('dsQuickActions').style.display = 'none'; $('dsPenProps').style.display = 'block';
 dsSwitchDrawer('dsPanelProps', true);
 } else {
 if (committed) dsCanvas.setActiveObject(committed);
 dsOnSelectionChange();
 }
 dsCanvas.renderAll();
}

async function dsCanvasPenClick(opt) {
 if (dsMode !== 'pen' || !dsCanvas) return;
 const fabric = await loadFabric();
 const p = opt.scenePoint || dsCanvas.getScenePoint(opt.e);
 dsPenPoints.push({ x: p.x, y: p.y });
 const dot = new fabric.Circle({ left: p.x, top: p.y, radius: 4, originX: 'center', originY: 'center', fill: '#A9FF67', selectable: false, evented: false });
 dsCanvas.add(dot); dsPenTempObjs.push(dot);
 if (dsPenPoints.length > 1) {
 const prev = dsPenPoints[dsPenPoints.length - 2];
 const line = new fabric.Line([prev.x, prev.y, p.x, p.y], { stroke: '#A9FF67', strokeWidth: 2, selectable: false, evented: false });
 dsCanvas.add(line); dsPenTempObjs.push(line);
 }
 dsCanvas.renderAll();
}
function dsClearPenTemp() {
 if (dsCanvas) dsPenTempObjs.forEach((o) => dsCanvas.remove(o));
 dsPenTempObjs = [];
}
function dsCancelPenShape() { dsClearPenTemp(); dsPenPoints = []; }
async function dsFinishPenShape() { await dsSetMode('select'); }

// ---- Stickers (emoji — zero assets to load, renders via the system font) ----
const DS_STICKERS = ['⭐','✨','🔥','💯','🎉','🎊','✅','❌','➡️','⬅️','⬆️','⬇️','💬','❤️','💚','💛','👍','👏','🏆','🎯','📍','🔔','⚡','🌟','💎','🎁','📣','🚀','🥇','😀','😍','🤩','👀','💰','✔️'];
function dsPopulateStickers() {
 const grid = $('dsStickerGrid');
 if (grid.children.length) return;
 grid.style.cssText = 'display:grid;grid-template-columns:repeat(5,1fr);gap:8px';
 DS_STICKERS.forEach((emoji) => {
 const btn = document.createElement('button');
 btn.textContent = emoji;
 btn.style.cssText = 'font-size:22px;background:var(--panel-2);border:1px solid var(--line);border-radius:10px;padding:8px 0;cursor:pointer';
 btn.onclick = () => dsAddSticker(emoji);
 grid.appendChild(btn);
 });
}
async function dsAddSticker(emoji) {
 if (!dsCanvas) return;
 const fabric = await loadFabric();
 const t = new fabric.FabricText(emoji, {
 left: dsCanvas.getWidth() / (2 * dsCanvas.getZoom()), top: dsCanvas.getHeight() / (2 * dsCanvas.getZoom()),
 originX: 'center', originY: 'center', fontSize: 100,
 });
 dsCanvas.add(t); dsCanvas.setActiveObject(t); dsCanvas.renderAll();
}

// ---- AI: background removal + sticker generation (Phase 3) ----
async function dsPollJobUrl(requestId, maxTries = 60) {
 for (let i = 0; i < maxTries; i++) {
 await new Promise((r) => setTimeout(r, 3000));
 const res = await fetch('/.netlify/functions/job-status?id=' + encodeURIComponent(requestId), { headers: { ...(await authHeader()) } });
 const d = await res.json();
 if (d.status === 'completed') return d.url;
 if (d.status === 'failed') throw new Error(d.error || 'Generation failed');
 }
 throw new Error('Timed out waiting for the result.');
}
async function dsUploadDataUrlIfNeeded(srcUrl) {
 if (!srcUrl.startsWith('data:')) return srcUrl;
 const blob = await (await fetch(srcUrl)).blob();
 const uid = (await sb.auth.getUser()).data.user.id;
 const path = uid + '/ds-img-' + Date.now() + '.png';
 const { error: upErr } = await sb.storage.from('avatars').upload(path, blob, { contentType: 'image/png', upsert: true });
 if (upErr) throw new Error(upErr.message);
 return sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}
async function dsRemoveBackground() {
 const o = dsCanvas && dsCanvas.getActiveObject();
 if (!o || !dsIsImage(o)) return;
 const btn = $('dsRemoveBg'); const label = btn.textContent;
 btn.disabled = true; btn.textContent = 'Removing…';
 note('dsNote', 'Removing background…');
 try {
 const srcUrl = await dsUploadDataUrlIfNeeded(o.getSrc());
 const res = await fetch('/.netlify/functions/tool-generate', {
 method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
 body: JSON.stringify({ slug: 'ai-background-remover', image_url: srcUrl }),
 });
 const d = await res.json();
 if (res.status === 402) { note('dsNote', 'Out of credits — top up.', 'err'); openBuy(); return; }
 if (!res.ok) throw new Error(d.error || 'Failed');
 const resultUrl = await dsPollJobUrl(d.request_id);
 const fabric = await loadFabric();
 const newImg = await fabric.FabricImage.fromURL(resultUrl, { crossOrigin: 'anonymous' });
 newImg.set({ left: o.left, top: o.top, originX: o.originX, originY: o.originY, scaleX: o.scaleX, scaleY: o.scaleY, angle: o.angle });
 dsCanvas.remove(o);
 dsCanvas.add(newImg);
 dsCanvas.setActiveObject(newImg); dsCanvas.renderAll(); dsRefreshLayers();
 note('dsNote', 'Background removed ✓', 'ok');
 } catch (e) { note('dsNote', e.message || 'Failed', 'err'); }
 btn.disabled = false; btn.textContent = label;
}
async function dsAiGenerateSticker() {
 const prompt = $('dsAiPrompt').value.trim();
 if (!prompt || !dsCanvas) return;
 const btn = $('dsAiGenerate'); const label = btn.textContent;
 btn.disabled = true; btn.textContent = 'Generating…';
 $('dsAiStatus').textContent = 'Generating your sticker…';
 try {
 const fullPrompt = prompt + ', isolated single object on a plain white background, studio product photo, no shadow, centered';
 const res = await fetch('/.netlify/functions/generate', {
 method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
 body: JSON.stringify({ prompt: fullPrompt, aspect: '1:1', model: 'nano-banana' }),
 });
 const d = await res.json();
 if (res.status === 402) { $('dsAiStatus').textContent = ''; note('dsNote', 'Out of credits — top up.', 'err'); openBuy(); return; }
 if (!res.ok) throw new Error(d.error || 'Failed');
 const rawUrl = await dsPollJobUrl(d.request_id);
 $('dsAiStatus').textContent = 'Cutting it out…';
 const cutRes = await fetch('/.netlify/functions/tool-generate', {
 method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
 body: JSON.stringify({ slug: 'ai-background-remover', image_url: rawUrl }),
 });
 const cutData = await cutRes.json();
 if (cutRes.status === 402) { $('dsAiStatus').textContent = ''; note('dsNote', 'Out of credits — top up.', 'err'); openBuy(); return; }
 if (!cutRes.ok) throw new Error(cutData.error || 'Failed to cut out the sticker');
 const finalUrl = await dsPollJobUrl(cutData.request_id);
 const fabric = await loadFabric();
 const img = await fabric.FabricImage.fromURL(finalUrl, { crossOrigin: 'anonymous' });
 const maxDim = Math.min(dsCanvas.getWidth(), dsCanvas.getHeight()) / (2 * dsCanvas.getZoom());
 const s = Math.min(1, maxDim / Math.max(img.width, img.height));
 img.set({ left: dsCanvas.getWidth() / (2 * dsCanvas.getZoom()), top: dsCanvas.getHeight() / (2 * dsCanvas.getZoom()), originX: 'center', originY: 'center', scaleX: s, scaleY: s });
 dsCanvas.add(img); dsCanvas.setActiveObject(img); dsCanvas.renderAll(); dsRefreshLayers();
 $('dsAiStatus').textContent = 'Done ✓';
 $('dsAiPrompt').value = '';
 } catch (e) { $('dsAiStatus').textContent = e.message || 'Failed'; }
 btn.disabled = false; btn.textContent = label;
}

// ---- Drawer system (PixelLab-style): one fixed bottom icon bar, one
// drawer slides up above it showing whichever panel is active. Only the
// 5 bottom-bar destinations get their icon highlighted; panels reached by
// a second tap inside another drawer (Add -> Stickers) just show/hide
// without touching bicon state.
const DS_BICON_PANELS = ['dsPanelCanvas', 'dsPanelAdd', 'dsPanelProps', 'dsPanelLayers', 'dsPanelAI'];
function dsSwitchDrawer(panelId, forceOpen) {
 document.querySelectorAll('.ds-drawer-panel').forEach((p) => { p.style.display = p.id === panelId ? 'block' : 'none'; });
 if (DS_BICON_PANELS.includes(panelId)) {
 document.querySelectorAll('.ds-bicon').forEach((b) => b.classList.toggle('active', b.dataset.drawer === panelId));
 }
 if (forceOpen || panelId !== 'dsPanelProps') $('dsDrawer').style.display = 'block';
 if (panelId === 'dsPanelStickers') dsPopulateStickers();
}
function dsHideDrawer() {
 $('dsDrawer').style.display = 'none';
 document.querySelectorAll('.ds-bicon').forEach((b) => b.classList.remove('active'));
}

// ---- Layers panel ----
function dsLayerIcon(obj) {
 if (dsIsText(obj)) return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 6h14M12 6v14"/></svg>';
 if (dsIsImage(obj)) return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/></svg>';
 return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>';
}
function dsLayerName(obj, i) {
 if (dsIsText(obj)) return (obj.text || 'Text').slice(0, 24);
 if (dsIsImage(obj)) return 'Image ' + (i + 1);
 return (dsIsCircle(obj) ? 'Circle' : dsIsLine(obj) ? 'Line' : 'Rectangle') + ' ' + (i + 1);
}
function dsRefreshLayers() {
 if (!dsCanvas) return;
 const list = $('dsLayersList');
 const objs = dsCanvas.getObjects().slice().reverse(); // top layer first, matches visual stacking
 $('dsLayersEmpty').style.display = objs.length ? 'none' : 'block';
 const active = dsCanvas.getActiveObject();
 list.innerHTML = objs.map((obj, i) => {
 const idx = objs.length - 1 - i;
 return '<div class="ds-layer-row' + (obj === active ? ' active' : '') + '" data-idx="' + idx + '">' +
 '<span class="ds-layer-icon">' + dsLayerIcon(obj) + '</span>' +
 '<span class="ds-layer-name">' + dsLayerName(obj, idx) + '</span>' +
 '<button data-act="hide" title="Show/hide">' + (obj.visible === false ? '🙈' : '👁') + '</button>' +
 '<button data-act="del" title="Delete">🗑</button></div>';
 }).join('');
 list.querySelectorAll('.ds-layer-row').forEach((row) => {
 const idx = Number(row.dataset.idx);
 const obj = dsCanvas.getObjects()[idx];
 row.addEventListener('click', (e) => {
 if (e.target.closest('button')) return;
 dsCanvas.setActiveObject(obj); dsCanvas.renderAll(); dsOnSelectionChange(); dsRefreshLayers();
 });
 row.querySelector('[data-act="hide"]').addEventListener('click', () => { obj.visible = !obj.visible; dsCanvas.renderAll(); dsRefreshLayers(); });
 row.querySelector('[data-act="del"]').addEventListener('click', () => { dsCanvas.remove(obj); dsCanvas.renderAll(); });
 });
}

// ---- Save ----
async function saveDesign() {
 if (!dsCanvas || !dsProject) return;
 if (dsMode !== 'select') await dsSetMode('select'); // clears any in-progress pen points so they never bake into the export
 const btn = $('dsSave'); const label = btn.textContent;
 btn.disabled = true; btn.textContent = 'Saving…';
 note('dsNote', '');
 try {
 dsCanvas.discardActiveObject(); dsCanvas.renderAll();
 const dataUrl = dsCanvas.toDataURL({ format: 'png', multiplier: 1 / dsCanvas.getZoom() });
 const blob = await (await fetch(dataUrl)).blob();
 const path = (await sb.auth.getUser()).data.user.id + '/flyer-design-' + dsProject.id + '-' + Date.now() + '.png';
 const { error: upErr } = await sb.storage.from('avatars').upload(path, blob, { contentType: 'image/png', upsert: true });
 if (upErr) throw new Error(upErr.message);
 const url = sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
 // Save the full editable layout too (not just the flat PNG) so reopening
 // this project's Design Studio picks the layers back up instead of just
 // re-showing a picture. Tagged with which hero it was built on — see
 // openDesignStudio's reopenSaved check.
 const designState = dsCanvas.toJSON();
 const res = await fetch('/.netlify/functions/flyer-design-save', {
 method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
 body: JSON.stringify({ project_id: dsProject.id, url, design_state: designState, design_state_hero_url: dsProject.hero_image_url }),
 });
 const d = await res.json();
 if (!res.ok) throw new Error(d.error || 'Failed to save');
 $('flyerFinalResult').innerHTML = '<img src="' + url + '" style="width:100%;border-radius:12px" alt="">';
 $('flyerSpotFixOpen').style.display = 'block';
 note('dsNote', 'Saved ✓ — you can keep editing, or close and come back to it anytime.', 'ok');
 } catch (e) { note('dsNote', e.message || 'Failed to save', 'err'); }
 btn.disabled = false; btn.textContent = label;
}

// ---- Export: a direct download of exactly what's on the canvas right
// now, straight to the user's device — separate from Save, which persists
// to their Fuse account/project so they can reopen and keep editing.
function exportDesign() {
 if (!dsCanvas) return;
 dsCanvas.discardActiveObject(); dsCanvas.renderAll();
 const dataUrl = dsCanvas.toDataURL({ format: 'png', multiplier: 1 / dsCanvas.getZoom() });
 const a = document.createElement('a');
 a.href = dataUrl;
 a.download = 'fuse-design-' + Date.now() + '.png';
 document.body.appendChild(a); a.click(); a.remove();
}

function initDesignStudio() {
 $('openDesignStudio').onclick = openDesignStudio;
 $('dsClose').onclick = closeDesignStudio;
 $('dsSave').onclick = saveDesign;
 $('dsExport').onclick = exportDesign;
 $('dsUndo').onclick = () => dsRestoreHistory(dsHistoryIndex - 1);
 $('dsRedo').onclick = () => dsRestoreHistory(dsHistoryIndex + 1);
 $('dsAddText').onclick = dsAddText;
 $('dsAddRect').onclick = () => dsAddShape('rect');
 $('dsAddCircle').onclick = () => dsAddShape('circle');
 $('dsAddLine').onclick = () => dsAddShape('line');
 $('dsAddImagePick').onclick = () => $('dsImageFile').click();
 $('dsImageFile').onchange = (e) => { dsAddImageFromFile(e.target.files[0]); e.target.value = ''; };
 $('dsDuplicate').onclick = async () => {
 const obj = dsCanvas && dsCanvas.getActiveObject();
 if (!obj) return;
 const clone = await obj.clone();
 clone.set({ left: (obj.left || 0) + 24, top: (obj.top || 0) + 24 });
 dsCanvas.add(clone); dsCanvas.setActiveObject(clone); dsCanvas.renderAll();
 };
 $('dsBringFwd').onclick = () => { const o = dsCanvas.getActiveObject(); if (o) { dsCanvas.bringForward(o); dsCanvas.renderAll(); dsRefreshLayers(); } };
 $('dsSendBack').onclick = () => { const o = dsCanvas.getActiveObject(); if (o) { dsCanvas.sendBackwards(o); dsCanvas.renderAll(); dsRefreshLayers(); } };
 $('dsDelete').onclick = () => { const o = dsCanvas.getActiveObject(); if (o) { dsCanvas.remove(o); dsCanvas.discardActiveObject(); dsCanvas.renderAll(); } };
 $('dsConfirmDone').onclick = () => { if (dsCanvas) { dsCanvas.discardActiveObject(); dsCanvas.renderAll(); dsOnSelectionChange(); } };

 // Phase 2 — draw + pen tools
 $('dsDrawTool').onclick = () => dsSetMode('draw');
 $('dsPenTool').onclick = () => dsSetMode('pen');
 $('dsStopDraw').onclick = () => dsSetMode('select');
 $('dsFinishPen').onclick = () => dsFinishPenShape();
 $('dsCancelPen').onclick = () => { dsCancelPenShape(); dsSetMode('select'); };
 $('dsBrushColor').oninput = (e) => { if (dsCanvas && dsCanvas.freeDrawingBrush) dsCanvas.freeDrawingBrush.color = e.target.value; };
 $('dsBrushSize').oninput = (e) => { if (dsCanvas && dsCanvas.freeDrawingBrush) dsCanvas.freeDrawingBrush.width = Number(e.target.value); };
 document.getElementById('dsOverlay').addEventListener('keydown', (e) => {
 if (e.key === 'Escape' && (dsMode === 'draw' || dsMode === 'pen')) { dsCancelPenShape(); dsSetMode('select'); }
 });
 $('dsOverlay').tabIndex = -1;

 document.querySelectorAll('.ds-bicon').forEach((b) => b.onclick = async () => {
 // Leaving draw/pen mode via a drawer tap, not just the dedicated Done/
 // Finish buttons, needs to actually exit that mode first — otherwise the
 // canvas keeps capturing taps as new pen points or freehand strokes
 // while a totally different drawer (Layers, Canvas...) is showing.
 if (dsMode === 'draw' || dsMode === 'pen') await dsSetMode('select');
 if (b.dataset.drawer !== 'dsPanelProps') dsSwitchDrawer(b.dataset.drawer, true);
 });
 $('dsOpenStickers').onclick = () => dsSwitchDrawer('dsPanelStickers', true);

 // Text properties
 $('dsTextValue').oninput = (e) => { const o = dsCanvas.getActiveObject(); if (o && dsIsText(o)) { o.set('text', e.target.value); dsCanvas.renderAll(); } };
 $('dsTextFont').onchange = async (e) => { const o = dsCanvas.getActiveObject(); if (o && dsIsText(o)) { await ensureBrowserFont(e.target.value); o.set('fontFamily', e.target.value); dsCanvas.renderAll(); dsPushHistory(); } };
 $('dsTextSize').oninput = (e) => { const o = dsCanvas.getActiveObject(); if (o && dsIsText(o)) { o.set('fontSize', Number(e.target.value)); dsCanvas.renderAll(); } };
 $('dsTextColor').oninput = (e) => { const o = dsCanvas.getActiveObject(); if (o && dsIsText(o)) { o.set('fill', e.target.value); dsCanvas.renderAll(); } };
 $('dsTextBold').onchange = (e) => { const o = dsCanvas.getActiveObject(); if (o && dsIsText(o)) { o.set('fontWeight', e.target.checked ? 'bold' : 'normal'); dsCanvas.renderAll(); dsPushHistory(); } };

 // Shape properties (Phase 2 — gradient toggle added)
 $('dsFillGradient').onchange = (e) => {
 $('dsSolidFillWrap').style.display = e.target.checked ? 'none' : 'block';
 $('dsGradientFillWrap').style.display = e.target.checked ? 'block' : 'none';
 dsApplyFillFromPanel(); dsPushHistory();
 };
 $('dsShapeFill').oninput = () => dsApplyFillFromPanel();
 $('dsGradColor1').oninput = () => dsApplyFillFromPanel();
 $('dsGradColor2').oninput = () => dsApplyFillFromPanel();
 $('dsGradAngle').oninput = () => dsApplyFillFromPanel();
 $('dsShapeStroke').oninput = (e) => { const o = dsCanvas.getActiveObject(); if (o) { o.set('stroke', e.target.value); dsCanvas.renderAll(); } };
 $('dsShapeStrokeWidth').oninput = (e) => { const o = dsCanvas.getActiveObject(); if (o) { o.set('strokeWidth', Number(e.target.value)); dsCanvas.renderAll(); } };

 $('dsOpacity').oninput = (e) => { const o = dsCanvas.getActiveObject(); if (o) { o.set('opacity', Number(e.target.value) / 100); dsCanvas.renderAll(); } };

 // Phase 3 — AI tools
 $('dsRemoveBg').onclick = dsRemoveBackground;
 $('dsAiGenerate').onclick = dsAiGenerateSticker;

 // Canvas tab
 $('dsBgColor').oninput = (e) => { if (dsCanvas) { dsCanvas.backgroundColor = e.target.value; dsCanvas.renderAll(); } };
 $('dsBgTransparent').onclick = () => { if (dsCanvas) { dsCanvas.backgroundColor = null; dsCanvas.renderAll(); } };
 $('dsAspect').onchange = async (e) => {
 if (!dsProject) return;
 dsProject.aspect = e.target.value;
 await dsInitCanvas(dsFabric, dsProject.hero_image_url, e.target.value);
 };
}

// ---------------- Flyer Studio: Spot Fix (circle a part, say what's
// wrong, fix just that) ----------------
// Draws directly on a canvas showing the current final flyer; every
// point the user marks gets recorded in CANVAS-PIXEL space, then
// collapsed to one bounding box and sent as FRACTIONS (0-1) of the
// image's own width/height — resolution-independent, so it doesn't
// matter how big the canvas was displayed at. flyer-spot-fix.js crops
// that exact region (with padding for context) out of the full-res
// original, edits just the crop, and job-status.js pastes it back in.
let flyerSpotFixPoints = [];
let flyerSpotFixCtx = null;
let flyerSpotFixBaseImg = null;
function flyerOpenSpotFix() {
 if (preview) { showAuth('signup'); return; }
 const img = $('flyerFinalResult').querySelector('img');
 if (!img || !img.src) return note('flyerCompositeNote', 'Composite the final flyer first.', 'err');
 note('flyerSpotFixNote', ''); $('flyerSpotFixInput').value = ''; flyerSpotFixPoints = [];
 $('flyerSpotFixOverlay').style.display = 'flex';
 // No crossOrigin needed here -- this canvas is only ever drawn to/
 // displayed, never read back with getImageData (the actual crop happens
 // server-side, fetched fresh in flyer-spot-fix.js), so there's nothing
 // to gain from it except a real risk of the image failing to load at
 // all if the storage host's CORS headers aren't exactly right.
 const source = new Image();
 source.onload = () => {
 flyerSpotFixBaseImg = source;
 const MAXW = 500;
 const scale = Math.min(1, MAXW / source.naturalWidth);
 const canvas = $('flyerSpotFixCanvas');
 canvas.width = Math.round(source.naturalWidth * scale);
 canvas.height = Math.round(source.naturalHeight * scale);
 flyerSpotFixCtx = canvas.getContext('2d');
 flyerSpotFixRedraw();
 };
 source.onerror = () => note('flyerSpotFixNote', 'Could not load the flyer image to draw on.', 'err');
 source.src = img.src;
}
function flyerSpotFixRedraw() {
 const canvas = $('flyerSpotFixCanvas');
 const ctx = flyerSpotFixCtx;
 if (!ctx || !flyerSpotFixBaseImg) return;
 ctx.clearRect(0, 0, canvas.width, canvas.height);
 ctx.drawImage(flyerSpotFixBaseImg, 0, 0, canvas.width, canvas.height);
 if (flyerSpotFixPoints.length) {
 ctx.save();
 ctx.strokeStyle = 'rgba(245,197,24,.7)'; ctx.lineWidth = Math.max(14, canvas.width * 0.045);
 ctx.lineCap = 'round'; ctx.lineJoin = 'round';
 ctx.beginPath();
 flyerSpotFixPoints.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
 ctx.stroke();
 ctx.restore();
 }
}
function flyerSpotFixPos(e, canvas) {
 const rect = canvas.getBoundingClientRect();
 const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
 const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
 const cy = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
 return { x: cx * scaleX, y: cy * scaleY };
}
function flyerSpotFixWire() {
 const canvas = $('flyerSpotFixCanvas');
 let drawing = false;
 const start = (e) => { drawing = true; flyerSpotFixPoints.push(flyerSpotFixPos(e, canvas)); flyerSpotFixRedraw(); e.preventDefault(); };
 const move = (e) => { if (!drawing) return; flyerSpotFixPoints.push(flyerSpotFixPos(e, canvas)); flyerSpotFixRedraw(); e.preventDefault(); };
 const end = () => { drawing = false; };
 canvas.addEventListener('pointerdown', start);
 canvas.addEventListener('pointermove', move);
 window.addEventListener('pointerup', end);
 $('flyerSpotFixClear').onclick = () => { flyerSpotFixPoints = []; flyerSpotFixRedraw(); };
 $('flyerSpotFixClose').onclick = () => { $('flyerSpotFixOverlay').style.display = 'none'; };
 $('flyerSpotFixGo').onclick = flyerSubmitSpotFix;
}
async function flyerSubmitSpotFix() {
 if (!flyerSpotFixPoints.length) return note('flyerSpotFixNote', 'Draw over the part that needs fixing first.', 'err');
 const instruction = $('flyerSpotFixInput').value.trim();
 if (!instruction) return note('flyerSpotFixNote', 'Say what needs fixing there.', 'err');
 const canvas = $('flyerSpotFixCanvas');
 const xs = flyerSpotFixPoints.map((p) => p.x), ys = flyerSpotFixPoints.map((p) => p.y);
 const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
 // A single tap (no drag) leaves min===max — give it a little real area
 // instead of sending a zero-size region.
 const padMin = Math.max(canvas.width, canvas.height) * 0.04;
 const region = {
 x: Math.max(0, minX - padMin) / canvas.width,
 y: Math.max(0, minY - padMin) / canvas.height,
 w: (Math.min(canvas.width, maxX + padMin) - Math.max(0, minX - padMin)) / canvas.width,
 h: (Math.min(canvas.height, maxY + padMin) - Math.max(0, minY - padMin)) / canvas.height,
 };
 const btn = $('flyerSpotFixGo'); btn.disabled = true; btn.textContent = 'Submitting…';
 note('flyerSpotFixNote', '');
 try {
 const res = await fetch('/.netlify/functions/media-pipeline', {
 method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
 body: JSON.stringify({ op: 'flyer-spot-fix', project_id: flyerProjectId, region, instruction }),
 });
 const d = await res.json();
 if (res.status === 402) { note('flyerSpotFixNote', 'Out of credits — top up.', 'err'); openBuy(); btn.disabled = false; btn.textContent = 'Fix this spot →'; return; }
 if (!res.ok) throw new Error(d.error || 'Failed');
 if (d.credits != null) $('creditCount').textContent = d.credits;
 $('flyerSpotFixOverlay').style.display = 'none';
 $('flyerFinalResult').innerHTML = '<div><span class="spin"></span><div style="margin-top:12px">Fixing that spot…</div></div>';
 note('flyerCompositeNote', 'Fixing that spot… ⏳', 'ok');
 pollJob(d.request_id, $('flyerFinalResult'), 'flyerCompositeNote', null, '', 'image', 180, () => { $('flyerSpotFixOpen').style.display = 'block'; }, null, 'Flyer spot fix');
 btn.disabled = false; btn.textContent = 'Fix this spot →';
 } catch (e) { note('flyerSpotFixNote', e.message || 'Failed', 'err'); btn.disabled = false; btn.textContent = 'Fix this spot →'; }
}

// Three INDEPENDENT structure references — each clones only its own part
// of a real flyer (headline position/alignment, bullet/feature placement,
// CTA/badge shape), not the whole layout at once. Attach any, none, or all
// three; flyer-composite.js numbers whichever are present positionally for
// the image model, same pattern as flyer-brief.js's reference mapping.
let flyerCompositeRefs = { headline: null, features: null, cta: null };
const FLYER_COMPOSITE_REF_LABELS = { headline: 'Headline structure', features: 'Feature placement', cta: 'CTA structure' };
async function flyerPickCompositeRef(kind, file) {
 if (preview) { showAuth('signup'); return; }
 if (!file) return;
 note('flyerCompositeNote', 'Uploading reference…', 'ok');
 try {
 const resized = await resizeImageFile(file);
 const ext = (resized.name.split('.').pop() || 'jpg').toLowerCase();
 const path = `${user.id}/flyerstructref-${kind}-${Date.now()}.${ext}`;
 await uploadWithRetry('avatars', path, resized);
 flyerCompositeRefs[kind] = sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
 note('flyerCompositeNote', ` ${FLYER_COMPOSITE_REF_LABELS[kind]} reference attached.`, 'ok');
 renderFlyerCompositeRef(kind);
 } catch (e) { note('flyerCompositeNote', e.message || 'Upload failed', 'err'); }
}
function renderFlyerCompositeRef(kind) {
 const ids = { headline: 'flyerHeadlineRefThumb', features: 'flyerFeaturesRefThumb', cta: 'flyerCtaRefThumb' };
 const el = $(ids[kind]);
 if (!el) return;
 const url = flyerCompositeRefs[kind];
 el.innerHTML = url
 ? `<div style="position:relative;display:inline-block"><img src="${url}" style="width:56px;height:56px;object-fit:cover;border-radius:8px;border:2px solid var(--gold)"><span class="ref-x" onclick="window.fuseFlyerRmCompositeRef('${kind}')"></span></div>`
 : '';
}
window.fuseFlyerRmCompositeRef = (kind) => { flyerCompositeRefs[kind] = null; renderFlyerCompositeRef(kind); };

// ---------------- Audio Studio (standalone voiceover/narration) ----------------
let adUploadedVoiceUrl = null;
async function loadAudioVoices() {
 if (preview) return;
 // Two sources feed the same picker: avatars that happen to have a voice
 // sample attached, and standalone voices trained once here and reused by
 // name — independent of any specific avatar, exactly what "train it once,
 // pick it for any script later" needs.
 let [avatarsRes, voicesRes] = await Promise.all([
 sb.from('avatars').select('id,name,voice_sample_url,voice_reference_text').not('voice_sample_url', 'is', null),
 sb.from('voices').select('id,name,sample_url,reference_text').order('created_at', { ascending: false }),
 ]);
 // Same schema-lag fallback as loadAvatars() — an unrun migration must
 // never take the whole picker down, just the extra reference-text field.
 if (avatarsRes.error) avatarsRes = await sb.from('avatars').select('id,name,voice_sample_url').not('voice_sample_url', 'is', null);
 if (voicesRes.error) voicesRes = await sb.from('voices').select('id,name,sample_url');
 const avatarsWithVoice = avatarsRes.data;
 const savedVoices = (voicesRes && voicesRes.data) || [];
 const sel = $('adVoicePicker');
 const esc = (s) => (s || '').replace(/"/g, '&quot;');
 const options = [
 ...savedVoices.map((v) => `<option value="${v.sample_url}" data-ref="${esc(v.reference_text)}"> ${(v.name || 'Untitled voice').replace(/</g, '&lt;')}</option>`),
 ...((avatarsWithVoice || []).map((a) => `<option value="${a.voice_sample_url}" data-ref="${esc(a.voice_reference_text)}">${(a.name || 'Avatar').replace(/</g, '&lt;')}'s voice</option>`)),
 ];
 if (options.length) {
 sel.innerHTML = '<option value="">Use uploaded sample instead…</option>' + options.join('');
 sel.style.display = 'block';
 } else {
 sel.style.display = 'none';
 }
 loadResembleVoices();
}
async function loadResembleVoices() {
 if (preview) return;
 const rsel = $('adResemblePicker');
 try {
 const res = await fetch('/.netlify/functions/resemble-voices', { headers: { ...(await authHeader()) } });
 const d = await res.json();
 const voices = (d && d.voices) || [];
 rsel.innerHTML = voices.length
 ? voices.map((v) => `<option value="${v.uuid}">${(v.name || 'Voice').replace(/</g, '&lt;')}</option>`).join('')
 : '<option value="">No Resemble voices found on this account yet</option>';
 } catch (e) { rsel.innerHTML = '<option value="">Could not load Resemble voices</option>'; }
}
function adToggleEngine() {
 const isResemble = $('adEngine').value === 'resemble';
 $('adWaveWrap').style.display = isResemble ? 'none' : 'block';
 $('adResembleWrap').style.display = isResemble ? 'block' : 'none';
 $('adRewrite').style.display = isResemble ? 'inline-block' : 'none';
}
async function adRewriteScript() {
 const text = $('adScript').value.trim();
 if (!text) return note('adRewriteNote', 'Write the script first.', 'err');
 const btn = $('adRewrite'); btn.disabled = true; btn.textContent = 'Rewriting…';
 note('adRewriteNote', '');
 try {
 const res = await fetch('/.netlify/functions/audio-rewrite', {
 method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
 body: JSON.stringify({ text }),
 });
 const d = await res.json();
 if (!res.ok) throw new Error(d.error || 'Failed');
 $('adScript').value = d.text;
 note('adRewriteNote', ' Rewritten with pacing/emphasis tags — review before generating.', 'ok');
 } catch (e) { note('adRewriteNote', e.message || 'Could not rewrite.', 'err'); }
 btn.disabled = false; btn.textContent = ' Rewrite for natural delivery (Resemble only)';
}
async function saveTrainedVoice() {
 if (preview) { showAuth('signup'); return; }
 const name = $('adVoiceName').value.trim();
 if (!name) return note('adVoiceNote', 'Give this voice a name first.', 'err');
 if (!adUploadedVoiceUrl) return note('adVoiceNote', 'Upload a voice sample first.', 'err');
 const btn = $('adSaveVoice'); btn.disabled = true; btn.textContent = 'Saving…';
 try {
 const res = await fetch('/.netlify/functions/voice-train', {
 method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
 body: JSON.stringify({ name, sample_url: adUploadedVoiceUrl, reference_text: $('adVoiceRefText').value.trim() }),
 });
 const d = await res.json();
 if (!res.ok) throw new Error(d.error || 'Failed');
 note('adVoiceNote', ` "${name}" saved — pick it from the dropdown any time.`, 'ok');
 $('adVoiceName').value = '';
 loadAudioVoices();
 } catch (e) { note('adVoiceNote', e.message || 'Could not save this voice.', 'err'); }
 btn.disabled = false; btn.textContent = ' Save this voice for reuse';
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
 $('adVoiceRefText').value = '';
 note('adVoiceNote', ' Voice sample ready.', 'ok');
 } catch (e) { note('adVoiceNote', e.message || 'Upload failed.', 'err'); }
}
async function adGenerate() {
 if (preview) { showAuth('signup'); return; }
 const text = $('adScript').value.trim();
 if (!text) return note('adNote', 'Write the script first.', 'err');
 const isResemble = $('adEngine').value === 'resemble';
 const voiceUrl = $('adVoicePicker').value || adUploadedVoiceUrl;
 const resembleVoiceUuid = $('adResemblePicker').value;
 if (isResemble && !resembleVoiceUuid) return note('adNote', 'Pick a Resemble voice first.', 'err');
 if (!isResemble && !voiceUrl) return note('adNote', 'Add a voice sample first.', 'err');
 if (jobCapReached('adNote')) return;
 const btn = $('adGen'); const label = ' Generate voiceover'; btn.disabled = true; btn.textContent = 'Submitting…';
 note('adNote', '');
 try {
 const payload = isResemble
 ? { text, engine: 'resemble', resemble_voice_uuid: resembleVoiceUuid }
 : { text, voice_sample_url: voiceUrl, speed: parseFloat($('adSpeed').value), reference_text: $('adVoiceRefText').value.trim() };
 const res = await fetch('/.netlify/functions/audio-generate', {
 method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
 body: JSON.stringify(payload),
 });
 const d = await res.json();
 if (res.status === 503) { note('adNote', d.error, 'err'); btn.disabled = false; btn.textContent = label; return; }
 if (res.status === 402) { note('adNote', 'Out of credits — top up.', 'err'); openBuy(); btn.disabled = false; btn.textContent = label; return; }
 if (!res.ok) throw new Error(d.error || 'Failed');
 $('creditCount').textContent = d.credits;
 queueJob({ request_id: d.request_id, endpoint: 'job-status', mediaType: 'audio', label: text.slice(0, 60), model: 'audio' });
 startGlobalPoller();
 note('adNote', ' Started — rolling in Projects now.', 'ok');
 showView('library');
 btn.disabled = false; btn.textContent = label;
 $('adScript').value = '';
 } catch (e) { note('adNote', e.message || 'Failed', 'err'); btn.disabled = false; btn.textContent = label; }
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
 note('adNote', 'Done ', 'ok');
 if (user) loadProfile();
 btn.disabled = false; btn.textContent = label;
 } else if (d.status === 'failed') {
 clearInterval(timer);
 $('adResult').innerHTML = '<div> ' + (d.error || 'Failed') + '</div>';
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
 const MAX_VIDEO_MB = 48;
 if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
 note('editVideoNote', `That video is ${(file.size / 1024 / 1024).toFixed(0)}MB — this account's storage caps uploads at ${MAX_VIDEO_MB}MB. Trim the clip shorter or compress it, then try again.`, 'err');
 return;
 }
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
 $('editOmniPanel').style.display = 'block';
 pollEditTranscribe(d.request_id);
 } catch (e) { note('editVideoNote', e.message || 'Upload failed.', 'err'); }
}
async function editOmniSend() {
 if (preview) { showAuth('signup'); return; }
 if (!editProjectId) return note('editOmniNote', 'Upload a video first.', 'err');
 const instructions = $('editOmniMsg').value.trim();
 if (!instructions) return note('editOmniNote', 'Describe the edit first.', 'err');
 // Gemini Omni's video-edit model only accepts clips up to 10 seconds —
 // anything longer submits fine but always fails the actual generation
 // (WaveSpeed confirmed live), burning credits with no useful error back.
 // Catch it here instead so a 1-2 minute reel never even tries.
 const dur = $('editVideoPreview') && $('editVideoPreview').duration;
 if (dur && isFinite(dur) && dur > 10) {
 return note('editOmniNote', `AI Auto-Edit only handles clips up to 10 seconds — this video is ${Math.round(dur)}s. Use the chat box below instead (it's built for full-length videos): describe the edit, then burn in captions and add screenshots with the tools that appear after.`, 'err');
 }
 const btn = $('editOmniSend'); const label = ' Auto-edit this video'; btn.disabled = true; btn.textContent = 'Editing…';
 $('editResult').innerHTML = '<div><span class="spin"></span><div style="margin-top:12px">Applying the AI edit… this can take a while ⏳</div></div>';
 note('editOmniNote', '');
 try {
 const res = await fetch('/.netlify/functions/video-omni-edit', {
 method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
 body: JSON.stringify({ project_id: editProjectId, instructions }),
 });
 const d = await res.json();
 if (res.status === 503) { note('editOmniNote', d.error, 'err'); btn.disabled = false; btn.textContent = label; return; }
 if (res.status === 402) { note('editOmniNote', 'Out of credits — top up.', 'err'); openBuy(); btn.disabled = false; btn.textContent = label; return; }
 if (!res.ok) throw new Error(d.error || 'Failed');
 if (d.credits != null) $('creditCount').textContent = d.credits;
 note('editOmniNote', 'Working… ⏳', 'ok');
 pollJob(d.request_id, $('editResult'), 'editOmniNote', btn, label, 'video', 600, () => {
 $('editElementPanel').style.display = 'block';
 $('editCtaPanel').style.display = 'block';
 }, null, 'AI Auto-Edit video');
 } catch (e) { note('editOmniNote', e.message || 'Failed', 'err'); btn.disabled = false; btn.textContent = label; }
}
function pollEditTranscribe(reqId) {
 queueJob({ request_id: reqId, endpoint: 'job-status', mediaType: 'video', label: 'Video transcription', model: 'transcribe' });
 startGlobalPoller();
 let s = 0;
 const timer = setInterval(async () => {
 s += 5;
 try {
 const r = await fetch(`/.netlify/functions/job-status?id=${reqId}`, { headers: { ...(await authHeader()) } });
 const d = await r.json();
 if (d.status === 'completed') {
 clearInterval(timer);
 dequeueJob(reqId);
 note('editVideoNote', ' Transcribed — describe the edit below.', 'ok');
 $('editBriefPanel').style.display = 'block';
 } else if (d.status === 'failed') {
 clearInterval(timer);
 dequeueJob(reqId);
 note('editVideoNote', (d.error || 'Failed') + ' — credits refunded.', 'err');
 }
 } catch (e) {}
 // Handed off at 300s, not abandoned -- the shared poller (already queued
 // above) keeps going and will flip editBriefPanel open whenever it
 // actually resolves, even after a reload. This mirrors pollJob/pollGrid's
 // handoff behavior (see their comments) for the same reason: a slow
 // transcription isn't a failure, and treating it as one was exactly what
 // stranded jobs and lost credits for other studios.
 if (s >= 300) { clearInterval(timer); note('editVideoNote', 'Still working — you can leave this page; it\'ll continue in the background.', 'ok'); }
 }, 5000);
}
function editAppendLog(role, text) {
 const log = $('editLog');
 const bubble = document.createElement('div');
 bubble.style.cssText = role === 'user'
 ? 'align-self:flex-end;background:var(--gold);color:var(--bg);padding:10px 14px;border-radius:14px 14px 2px 14px;max-width:85%;white-space:pre-wrap;font-size:14px'
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
 const parsed = parseEditBriefResponse(jd.text);
 editHistory.push({ role: 'assistant', text: parsed.reply });
 editAppendLog('assistant', parsed.reply);
 if (parsed.broll_suggestions && parsed.broll_suggestions.length) editAppendLog('assistant', ' B-roll ideas: ' + parsed.broll_suggestions.join(' · '));
 if (parsed.notes) editAppendLog('assistant', ' ' + parsed.notes);
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
 const res = await fetch('/.netlify/functions/media-pipeline', {
 method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
 body: JSON.stringify({
  type: 'caption',
 project_id: editProjectId, effect: $('editCaptionEffect').value,
 color: $('editAccentColor').value, color2: $('editAccentColor2').value, position: $('editCaptionPos').value,
 }),
 });
 const d = await res.json();
 if (!res.ok) throw new Error(d.error || 'Failed');
 $('editResult').innerHTML = `<video src="${d.url}" controls style="width:100%;border-radius:12px"></video>`;
 note('editCaptionNote', ' Captions applied.', 'ok');
 $('editElementPanel').style.display = 'block';
 $('editCtaPanel').style.display = 'block';
 } catch (e) { note('editCaptionNote', e.message || 'Failed', 'err'); }
 btn.disabled = false; btn.textContent = ' Burn in captions';
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
 const res = await fetch('/.netlify/functions/media-pipeline', {
 method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
 body: JSON.stringify({ type: 'element', project_id: editProjectId, image_url: imgUrl, start_sec: parseFloat($('editElStart').value), duration_sec: parseFloat($('editElDur').value), position: $('editElPos').value }),
 });
 const d = await res.json();
 if (!res.ok) throw new Error(d.error || 'Failed');
 $('editResult').innerHTML = `<video src="${d.url}" controls style="width:100%;border-radius:12px"></video>`;
 note('editElementNote', ' Element added.', 'ok');
 } catch (e) { note('editElementNote', e.message || 'Failed', 'err'); }
 btn.disabled = false; btn.textContent = ' Add element';
}
async function editApplyCta() {
 if (!editProjectId) return;
 const ctaText = $('editCtaText').value.trim();
 if (!ctaText) return note('editCtaNote', 'Write the CTA text first.', 'err');
 const btn = $('editApplyCta'); btn.disabled = true; btn.textContent = 'Finishing…';
 note('editCtaNote', '');
 try {
 const res = await fetch('/.netlify/functions/media-pipeline', {
 method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
 body: JSON.stringify({ type: 'cta', project_id: editProjectId, cta_text: ctaText, accent_color: $('editAccentColor').value }),
 });
 const d = await res.json();
 if (!res.ok) throw new Error(d.error || 'Failed');
 $('editResult').innerHTML = `<div><video src="${d.url}" controls autoplay loop muted playsinline style="width:100%;border-radius:12px"></video><div style="margin-top:12px"><button class="btn gold sm" onclick="fuseDownload('${d.url}')">⬇ Download</button></div></div>`;
 note('editCtaNote', ' Done — post-ready.', 'ok');
 } catch (e) { note('editCtaNote', e.message || 'Failed', 'err'); }
 btn.disabled = false; btn.textContent = ' Add CTA — finish';
}

// ---------------- prompt generator (free, instant — ported from Fuse Character Lab) ----------------
// Everything here is deterministic templating, not an LLM call — same as the
// standalone Character Lab tool this was ported from, so it costs nothing and
// never waits on a server. Real credits are only spent later, if/when the
// user taps "Use this prompt to generate" and it turns into an actual image.
let pgState = { mode: 'character', gender: 0, heritage: 0, hair: 0, vibe: 0, outfit: 0, setting: 0, lighting: 0, shot: 0, platform: 'fuse' };
let pgRefs = []; // [{url, tag}] — up to 10, tagged reference images (outfit/setting/product/style/other)
const PG_REF_TAGS = ['Style reference', 'Outfit reference', 'Setting reference', 'Product reference', 'Pose reference', 'Other'];
const PG_POSES = [
 'looking directly at the camera with a calm, confident expression',
 'glancing slightly to the side, relaxed and natural',
 'mid-laugh, warm and candid',
 'chin slightly lifted, poised and powerful',
 'soft genuine smile, approachable energy',
];
const PG_ANGLES = [
 'shot straight-on with clean, symmetrical framing',
 'shot from a slight low angle for presence',
 'shot from just above, a gentle top-down perspective',
 'a tight detail crop on the most important part',
 'wide establishing framing with room to breathe',
];

function pgPick(k) { return cfg.PROMPT_LIB[k].opts[pgState[k]]; } // [label, phrase]
function pgCharToken() {
 return (pgPick('vibe')[0].split(' ')[0] + '_' + pgPick('heritage')[0].split(' ')[0] + '_' + pgPick('gender')[0]).replace(/[^A-Za-z_]/g, '');
}
function pgRefNote() {
 if (!pgRefs.length) return '';
 return ' ' + pgRefs.map((r, i) => `Reference image ${i + 1} is the ${r.tag.toLowerCase()} — copy it exactly.`).join(' ');
}
function pgCorePhrase(poseIdx) {
 const shotP = pgPick('shot')[1]; const [frame, cam] = shotP.split('|');
 const extra = $('pgExtra').value.trim();
 if (pgState.mode === 'general') {
 const subj = $('pgSubject').value.trim() || 'the subject';
 return { frame, cam, body: [subj, pgPick('setting')[1]].join(', '), light: pgPick('lighting')[1], pose: PG_ANGLES[poseIdx % PG_ANGLES.length], extra };
 }
 const subject = $('pgSubject').value.trim() || `${pgPick('vibe')[1]} ${pgPick('heritage')[1]} ${pgPick('gender')[1]}`;
 const parts = [subject, pgPick('hair')[1], 'wearing ' + pgPick('outfit')[1], pgPick('setting')[1]];
 return { frame, cam, body: parts.join(', '), light: pgPick('lighting')[1], pose: PG_POSES[poseIdx % PG_POSES.length], extra };
}
function pgCap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
// Several lighting phrases already end in the word "lighting" (e.g.
// "dramatic chiaroscuro side lighting") while others don't (e.g. "warm
// golden-hour glow") — only append the word when the phrase doesn't already
// have it, so it never reads "...lighting lighting."
function pgLight(c) { return /lighting$/i.test(c.light.trim()) ? c.light : `${c.light} lighting`; }
function pgAssemble(platform, poseIdx) {
 const c = pgCorePhrase(poseIdx);
 const ex = c.extra ? ` ${c.extra}.` : '';
 const refs = pgRefNote();
 const light = pgLight(c);
 if (platform === 'fuse') {
 const idNote = pgRefs.length ? ' Match the attached reference image(s) exactly — same identity/product, do not change it.' : '';
 return `${pgCap(c.frame)}, photorealistic. ${pgCap(c.body)}. ${pgCap(light)}. ${pgCap(c.pose)}. ${c.cam}, high detail, realistic texture.${ex}${idNote}${refs}`;
 }
 if (platform === 'soul') {
 return `${pgCap(c.frame)}, photorealistic. ${pgCap(c.body)}. ${pgCap(light)}. ${pgCap(c.pose)}. ${c.cam}, high detail, realistic skin texture, vertical 9:16.${ex}${refs}`;
 }
 if (platform === 'gpt') {
 return `Create ${c.frame} of ${c.body}. Photorealistic, ${light}. ${pgCap(c.pose)}. ${c.cam}. Keep the exact same face, hairline and identity as the reference image — identical facial features, same person, do not change the face.${ex}${refs}`;
 }
 if (platform === 'mj') {
 return `${c.frame}, ${c.body}, ${light}, ${c.pose}, ${c.cam}, photorealistic, ultra detailed skin${ex} --ar 9:16 --style raw --v 6`;
 }
 return `Animate this character image: ${c.body}. ${pgCap(c.pose)}. Subtle cinematic motion — slow push-in, natural head movement, a slow blink, gentle fabric movement, ${light}. Keep the same face and identity. Smooth, premium, realistic.${ex}${refs}`;
}
function pgConsistencyBlock() {
 const tok = pgCharToken();
 if (pgState.platform === 'fuse') return `Attach the same reference image(s) every time you generate — Fuse Studio's image-to-image mode locks the face/product identical across every result. Handle: "${tok}". Re-attach your best output as the new reference every few generations so the likeness never drifts.`;
 if (pgState.platform === 'soul') return `Soul ID: <paste your trained Soul ID here>\nCharacter handle: "${tok}"\nKeep: same face, same features, identical person across every generation. Quality 2k, Style General.`;
 if (pgState.platform === 'gpt') return `Always upload the SAME reference image of "${tok}".\nAlways add: "same exact face and person as the reference, identical facial features, do not alter identity."\nRe-upload your best result every few images so the likeness never drifts.`;
 if (pgState.platform === 'mj') return `Use the same --cref <reference image URL> and a fixed --sref for style.\nKeep --seed the SAME number across images to lock the look. Character handle: "${tok}".`;
 return `Use the same source character image every time. Character handle: "${tok}". Keep face identical; only motion changes.`;
}
function pgNegPrompt() { return 'deformed face, distorted features, extra fingers, asymmetric eyes, plastic skin, over-smoothed, watermark, text artifacts, changing identity between images, blurry, low detail'; }

function pgSetMode(mode) {
 pgState.mode = mode;
 $('pgModeChar').classList.toggle('active', mode === 'character');
 $('pgModeGeneral').classList.toggle('active', mode === 'general');
 $('pgCharBlock').style.display = mode === 'character' ? 'block' : 'none';
 $('pgSubjectLabel').textContent = mode === 'general' ? 'Describe what you\'re generating' : 'Your own subject (optional — overrides the chips above)';
 $('pgSubject').placeholder = mode === 'general' ? 'e.g. a jollof rice product shot, a skincare bottle, a beach house flyer background' : 'e.g. a jollof rice product, a skincare bottle, a beach house flyer background';
 if ($('pgOut').style.display !== 'none') pgGenerate();
}
function pgBuildPlatTabs() {
 $('pgPlatTabs').innerHTML = cfg.PROMPT_PLATFORMS.map((p) => `<button class="mtab${pgState.platform === p.id ? ' active' : ''}" data-p="${p.id}">${p.label}</button>`).join('');
 $('pgPlatTabs').querySelectorAll('button').forEach((b) => b.onclick = () => {
 pgState.platform = b.dataset.p; pgBuildPlatTabs();
 if ($('pgOut').style.display !== 'none') pgGenerate();
 });
}
const PG_ORDER_CHAR = ['gender', 'heritage', 'hair', 'vibe', 'outfit'];
const PG_ORDER_SHARED = ['setting', 'lighting', 'shot']; // usable in both Character and General mode
function pgRenderFieldGroup(elId, keys) {
 const el = $(elId);
 el.innerHTML = keys.map((k) => {
 const f = cfg.PROMPT_LIB[k];
 const chips = f.opts.map((o, i) => `<span class="chip${pgState[k] === i ? ' sel' : ''}" data-i="${i}">${o[0]}</span>`).join('');
 return `<div class="pg-field"><label>${f.label}</label><div class="chips" data-k="${k}">${chips}</div></div>`;
 }).join('');
 el.querySelectorAll('.chips').forEach((c) => {
 const k = c.dataset.k;
 c.querySelectorAll('.chip').forEach((ch) => ch.onclick = () => {
 pgState[k] = +ch.dataset.i; pgBuildFields();
 if ($('pgOut').style.display !== 'none') pgGenerate();
 });
 });
}
function pgBuildFields() {
 pgRenderFieldGroup('pgFields', PG_ORDER_CHAR);
 pgRenderFieldGroup('pgFieldsShared', PG_ORDER_SHARED);
}
function pgBuildPresets() {
 $('pgPresets').innerHTML = `<label class="fld" style="margin:0 0 8px">Quick presets</label>` + cfg.PROMPT_PRESETS.map((p, i) =>
 `<div class="pcard" data-i="${i}"><div class="nm">${p.nm}</div><div class="ds">${p.ds}</div></div>`).join('');
 $('pgPresets').querySelectorAll('.pcard').forEach((c) => c.onclick = () => {
 Object.assign(pgState, cfg.PROMPT_PRESETS[+c.dataset.i].st);
 pgBuildFields(); pgGenerate();
 });
}
function pgGetSaved() { try { return JSON.parse(localStorage.getItem('fuse_pg_saved') || '[]'); } catch (e) { return []; } }
function pgRenderSaved() {
 const s = pgGetSaved(); const w = $('pgSaved'); if (!w) return;
 if (!s.length) { w.innerHTML = ''; return; }
 w.innerHTML = `<div class="muted" style="font-size:11.5px;text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px">Saved characters</div>` +
 s.map((it, i) => `<span class="stag" data-i="${i}"><b>${(it.name || '').replace(/</g, '&lt;')}</b> · load <span class="x" data-x="${i}"></span></span>`).join('');
 w.querySelectorAll('.stag').forEach((t) => t.onclick = (e) => {
 if (e.target.classList.contains('x')) return;
 Object.assign(pgState, pgGetSaved()[+t.dataset.i].state);
 pgBuildFields(); pgGenerate();
 });
 w.querySelectorAll('.x').forEach((x) => x.onclick = (e) => {
 e.stopPropagation();
 const s2 = pgGetSaved(); s2.splice(+x.dataset.x, 1);
 localStorage.setItem('fuse_pg_saved', JSON.stringify(s2)); pgRenderSaved();
 });
}
function pgSaveChar() {
 const name = prompt0('Name this character (e.g. "Maya — clean girl")');
 if (!name) return;
 const s = pgGetSaved(); s.push({ name, state: Object.assign({}, pgState) });
 localStorage.setItem('fuse_pg_saved', JSON.stringify(s)); pgRenderSaved();
}

async function pgPickRefs(files) {
 if (preview) { showAuth('signup'); return; }
 if (!files || !files.length) return;
 const limit = 10 - pgRefs.length;
 if (limit <= 0) return note('pgRefNote', 'Max 10 reference images.', 'err');
 note('pgRefNote', 'Uploading…', 'ok');
 for (let i = 0; i < Math.min(files.length, limit); i++) {
 try {
 const file = await resizeImageFile(files[i]);
 const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
 const path = `${user.id}/pgref-${Date.now()}-${i}.${ext}`;
 await uploadWithRetry('avatars', path, file);
 pgRefs.push({ url: sb.storage.from('avatars').getPublicUrl(path).data.publicUrl, tag: PG_REF_TAGS[0] });
 } catch (error) { note('pgRefNote', (error && error.message) || 'Upload failed.', 'err'); }
 }
 pgRenderRefs();
 note('pgRefNote', ` ${pgRefs.length} reference(s) attached.`, 'ok');
}
function pgRenderRefs() {
 $('pgRefGrid').innerHTML = pgRefs.map((r, i) => `
 <div class="pg-ref"><img src="${r.url}"><span class="ref-x" onclick="window.fusePgRmRef(${i})"></span>
 <select onchange="window.fusePgTagRef(${i}, this.value)">${PG_REF_TAGS.map((t) => `<option${r.tag === t ? ' selected' : ''}>${t}</option>`).join('')}</select>
 </div>`).join('');
}
window.fusePgRmRef = (i) => { pgRefs.splice(i, 1); pgRenderRefs(); };
window.fusePgTagRef = (i, tag) => { if (pgRefs[i]) pgRefs[i].tag = tag; };

function pgInit() {
 pgBuildPlatTabs(); pgBuildPresets(); pgBuildFields(); pgRenderSaved(); pgRenderRefs();
 loadPromptHistory();
}
function pgGenerate() {
 if (pgState.mode === 'general' && !$('pgSubject').value.trim()) return note('pgNote', 'Describe what you\'re generating first.', 'err');
 $('pgOut').style.display = 'block';
 const main = pgAssemble(pgState.platform, 0);
 $('pgMain').textContent = main;
 $('pgVary').innerHTML = [1, 2, 3].map((i) => `<div class="pg-txt mini">${pgAssemble(pgState.platform, i).replace(/</g, '&lt;')}</div>`).join('');
 $('pgCons').textContent = pgConsistencyBlock();
 const showNeg = pgState.platform === 'mj' || pgState.platform === 'soul';
 $('pgNegWrap').style.display = showNeg ? 'block' : 'none';
 if (showNeg) $('pgNeg').textContent = pgNegPrompt();
 note('pgNote', ' Prompt ready.', 'ok');
 if (!preview && user) { try { sb.from('prompt_history').insert({ user_id: user.id, prompt: main }).then(() => loadPromptHistory()); } catch (e) {} }
 $('pgOut').scrollIntoView({ behavior: 'smooth' });
}
function pgCopy(id) { navigator.clipboard.writeText($(id).textContent || ''); }
function pgCopyJson() {
 const scene = {}; PG_ORDER_SHARED.forEach((k) => { scene[k] = pgPick(k)[0]; });
 const data = {
 mode: pgState.mode,
 character: pgState.mode === 'character' ? Object.fromEntries(PG_ORDER_CHAR.map((k) => [k, pgPick(k)[0]])) : undefined,
 scene,
 subject: $('pgSubject').value.trim(), extra: $('pgExtra').value.trim(), platform: pgState.platform,
 references: pgRefs.map((r) => ({ url: r.url, tag: r.tag })),
 prompts: { main: pgAssemble(pgState.platform, 0), variations: [1, 2, 3].map((i) => pgAssemble(pgState.platform, i)), consistency: pgConsistencyBlock(), negative: pgNegPrompt() },
 };
 navigator.clipboard.writeText(JSON.stringify(data, null, 2));
 note('pgNote', ' Copied everything as JSON.', 'ok');
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
window.fusePhUse = (p) => { $('pgOut').style.display = 'block'; $('pgMain').textContent = p; note('pgNote', 'Loaded from history — tap "Use this prompt" below.', 'ok'); $('pgOut').scrollIntoView({ behavior: 'smooth' }); };
function pgUse() {
 const p = ($('pgMain').textContent || '').trim();
 if (!p) return note('pgNote', 'Generate a prompt first.', 'err');
 openStudio('generate');
 $('prompt').value = p;
 if (pgRefs.length) {
 refUrls = pgRefs.slice(0, 5).map((r) => r.url);
 renderRefThumbs();
 if (pgRefs.length > 5) note('genNote', `Attached the first 5 of your ${pgRefs.length} reference images (the main generator's limit).`, 'ok');
 else note('genNote', ` ${pgRefs.length} reference(s) carried over.`, 'ok');
 }
}

// ---------------- caption + hashtag maker (free, template-based) ----------------
let capState = { platform: 'ig', vibe: 'bold' };
function capBuildChips() {
 $('capPlat').innerHTML = cfg.CAP_PLATFORMS.map((p) => `<span class="chip${capState.platform === p.k ? ' sel' : ''}" data-cp="${p.k}">${p.label}</span>`).join('');
 $('capVibe').innerHTML = cfg.CAP_VIBES.map((v) => `<span class="chip${capState.vibe === v.k ? ' sel' : ''}" data-cv="${v.k}">${v.label}</span>`).join('');
 $('capPlat').querySelectorAll('.chip').forEach((c) => c.onclick = () => { capState.platform = c.dataset.cp; capBuildChips(); });
 $('capVibe').querySelectorAll('.chip').forEach((c) => c.onclick = () => { capState.vibe = c.dataset.cv; capBuildChips(); });
}
function fuseRand(a) { return a[Math.floor(Math.random() * a.length)]; }
function capGenerate() {
 const topic = ($('capTopic').value || 'this').trim();
 const hook = fuseRand(cfg.CAP_HOOKS[capState.vibe]);
 const cta = fuseRand(cfg.CAP_CTA[capState.platform]);
 const bodyOpts = [
 `Made 100% with AI — no camera, no crew, no studio. Just ${topic} and a few prompts.`,
 `This is ${topic}, created entirely with AI on my phone. The future of content is here.`,
 `I turned ${topic} into scroll-stopping content using AI. It took minutes, not days.`,
 `${topic.charAt(0).toUpperCase()}${topic.slice(1)} — but every frame is AI-generated. Wild what's possible now.`,
 ];
 const body = fuseRand(bodyOpts);
 const caption = capState.platform === 'linkedin'
 ? `${hook}\n\n${body}\n\nThe bottleneck is no longer production — it's creative direction.\n\n${cta}`
 : `${hook} \n\n${body}\n\n${cta}`;
 $('capText').textContent = caption;
 $('capTags').textContent = cfg.CAP_TAGS[capState.platform];
 $('capOut').style.display = 'block';
}

// ---------------- marketplace ----------------
async function loadMarket() {
 $('mpPrompt').value = lastPrompt || '';
 if (lastOutput) { $('mpHasMedia').textContent = ' Your last creation will be attached as the preview.'; }
 else { $('mpHasMedia').textContent = 'Generate something first to attach it as the preview.'; }
 const { data } = await sb.from('marketplace_presets').select('id,title,uses,output_url,kind,price_credits').eq('active', true).order('uses', { ascending: false }).limit(40);
 $('mpList').innerHTML = (data && data.length) ? data.map((p) => {
 const media = p.output_url
 ? (p.kind === 'video' ? `<video src="${p.output_url}" muted loop playsinline></video>` : `<img src="${p.output_url}">`)
 : '';
 return `<div class="mp"><div class="msample" style="width:64px;height:64px;border-radius:10px;flex:0 0 auto;overflow:hidden">${media}</div>
 <div style="flex:1"><div class="mt">${p.title}</div><div class="mu"> ${p.uses} sold</div></div>
 <button class="btn gold sm" data-id="${p.id}">Buy · ${p.price_credits} cr</button></div>`;
 }).join('') : '<div class="empty">No presets yet — be the first to publish one </div>';
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
 note('mpNote', error ? error.message : ` Published at ${price} credits! You earn ${Math.floor(price / 2)} credits per sale.`, error ? 'err' : 'ok');
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
 note('mpNote', d.owned ? ' You own this — loading it…' : ' Purchased! Loading it into the studio…', 'ok');
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
 if (d.claimed) { $('creditCount').textContent = d.credits; note('learnNote', ` +${cfg.LEARN_BONUS} credits! You're ready to earn.`, 'ok'); }
 else note('learnNote', 'You already claimed your learning bonus ', 'ok');
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
 note('waNote', res.ok ? ' Linked! Text our WhatsApp bot a prompt to generate.' : d.error, res.ok ? 'ok' : 'err');
 } catch (e) { note('waNote', 'Could not link.', 'err'); }
}

// ---------------- promo popup ----------------
function maybePromo() {
 if (sessionStorage.getItem('fuse_promo_seen')) return;
 setTimeout(() => {
 const pr = cfg.PROMO;
 $('promoTitle').textContent = pr.title; $('promoBody').textContent = pr.body;
 startCountdown('promoCountdown', pr.hours);
 $('promoOverlay').style.display = 'flex';
 sessionStorage.setItem('fuse_promo_seen', '1');
 }, 9000);
}

// ---------------- onboarding quiz (short, before signup) ----------------
const QUIZ = [
 { title: 'What do you want to create?', sub: "We'll tailor your studio.",
 options: [
 { i: '', t: 'Brand & product visuals', v: 'brand' },
 { i: '', t: 'UGC & ad content', v: 'ugc' },
 { i: '‍', t: 'A consistent avatar of me', v: 'avatar' },
 { i: '', t: 'Movie / cinematic scenes', v: 'movie' },
 ] },
 { title: 'What frustrates you most about AI tools?', sub: 'Fuse fixes these.',
 options: [
 { i: '', t: 'Inconsistent faces', v: 'consistency' },
 { i: '', t: 'Prompting is too hard', v: 'prompting' },
 { i: '', t: 'Too expensive', v: 'cost' },
 { i: '', t: 'Too slow', v: 'speed' },
 ] },
];
let quizStep = 0; const quizAns = [];
function showQuiz() { quizStep = 0; renderQuiz(); $('quizOverlay').style.display = 'flex'; }
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
 else { $('avPrompt').value = d.prompt; if (d.credits != null) $('creditCount').textContent = d.credits; note('avGenNote', ' Prompt ready', 'ok'); }
 } catch (e) { note('avGenNote', e.message || 'Failed', 'err'); }
 btn.disabled = false; btn.textContent = 'Write my prompt (1 cr)';
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
 note('genNote', ` ${refUrls.length} reference${refUrls.length > 1 ? 's' : ''} attached — they'll guide your generation.`, 'ok');
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
 note('toolNote', ' Image ready.', 'ok');
 } catch (e) { note('toolNote', e.message || 'Upload failed.', 'err'); }
}
async function runTool() {
 if (preview) { showAuth('signup'); return; }
 if (!toolImg) return note('toolNote', 'Upload an image first.', 'err');
 if (jobCapReached('toolNote')) return;
 const btn = $('toolRun'); const label = 'Run tool'; btn.disabled = true; btn.textContent = 'Submitting…';
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
 queueJob({ request_id: data.request_id, endpoint: 'job-status', mediaType: 'image', label: toolSlug, model: toolSlug });
 startGlobalPoller();
 note('toolNote', ' Started — rolling in Projects now.', 'ok');
 btn.disabled = false; btn.textContent = label;
 showView('library');
 }
 } catch (e) { $('toolResult').innerHTML = '<div> ' + (e.message || 'Failed') + '</div>'; note('toolNote', e.message || 'Failed — credits not charged.', 'err'); btn.disabled = false; btn.textContent = label; }
}

// ---------------- auth ----------------
// This modal is only ever reached now via "Already have an account? Log in
// instead" on the guest-checkout screen (see startGuestCheckout()) -- a
// fresh purchase never shows a signup form before payment anymore. Kept
// pending-buy-aware so someone who arrived via /studio?buy=<pack> and
// chooses to log in first still sees "Log in to finish your purchase"
// instead of generic copy.
let authMode = 'signup';
function pendingBuyPack() {
 const p = new URLSearchParams(location.search).get('buy');
 if (!p) return null;
 return (cfg.PACKS || []).find((x) => x.key === p) || (p === 'course' ? { name: 'Fuse Atelier', naira: 60000 } : null);
}
function showAuth(mode) { setAuthMode(mode || 'signup'); $('authOverlay').style.display = 'flex'; }
function hideAuth() { $('authOverlay').style.display = 'none'; }
function setAuthMode(m) {
 authMode = m;
 const pack = pendingBuyPack();
 if (pack) {
 $('authTitle').textContent = m === 'signup' ? `Complete your ${pack.name} purchase` : 'Log in to finish your purchase';
 $('authBtn').textContent = m === 'signup' ? 'Continue to payment →' : 'Continue to payment →';
 $('authTrial').innerHTML = ` <b class="gold">${naira(pack.naira)}</b> — quick account setup, then straight to secure Paystack checkout.`;
 $('authTrial').style.display = 'block';
 } else {
 $('authTitle').textContent = m === 'signup' ? 'Create your account' : 'Welcome back';
 $('authBtn').textContent = m === 'signup' ? 'Start free →' : 'Log in →';
 $('authTrial').innerHTML = ' Start with <b class="gold">12 free credits</b> — no card needed.';
 $('authTrial').style.display = m === 'signup' ? 'block' : 'none';
 }
 $('authSwitchText').textContent = m === 'signup' ? 'Already have an account?' : 'New here?';
 $('authSwitchLink').textContent = m === 'signup' ? 'Log in' : 'Create one';
 $('forgotRow').style.display = m === 'signup' ? 'none' : 'block';
 note('authNote', '');
}
async function doForgotPassword() {
 const email = $('authEmail').value.trim();
 if (!email) return note('authNote', 'Enter your email above first, then tap "Forgot password?".', 'err');
 $('forgotLink').style.pointerEvents = 'none';
 try {
 const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
 if (error) throw error;
 note('authNote', ` Reset link sent to ${email} — check your inbox (and spam folder).`, 'ok');
 } catch (e) { note('authNote', e.message || 'Could not send reset link.', 'err'); }
 $('forgotLink').style.pointerEvents = '';
}
async function doSetNewPassword() {
 const pass = $('recoverPass').value;
 if (!pass || pass.length < 6) return note('recoverNote', 'Password must be at least 6 characters.', 'err');
 $('recoverBtn').disabled = true;
 try {
 const { error } = await sb.auth.updateUser({ password: pass });
 if (error) throw error;
 $('recoverOverlay').style.display = 'none';
 note('authNote', ' Password updated — you’re logged in.', 'ok');
 await boot();
 } catch (e) { note('recoverNote', e.message || 'Could not update password.', 'err'); }
 $('recoverBtn').disabled = false;
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
 if (!data.session) { note('authNote', ' Account created — check your email to confirm, then log in.', 'ok'); setAuthMode('login'); $('authBtn').disabled = false; return; }
 } else {
 const { error } = await sb.auth.signInWithPassword({ email, password: pass });
 if (error) throw error;
 }
 await claimReferral();
 await boot(); // boot() itself resumes any pending buy (URL param or the localStorage fallback) -- don't duplicate that here.
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
 if (!user) {
 // A pending purchase (arrived via /studio?buy=<pack>, e.g. a landing-page
 // tier button) skips the onboarding quiz and the old signup wall
 // entirely -- straight to guest checkout instead, which is the whole
 // point of this flow. Without this check, every first-time visitor hit
 // the quiz/signup screen BEFORE ?buy= was ever read (that only happened
 // later, deep in the logged-in branch below), so the guest-checkout
 // rewrite in buy() never actually got triggered for the exact people
 // it was built for.
 const qBuy = new URLSearchParams(location.search).get('buy');
 if (qBuy && (cfg.PACKS.some((p) => p.key === qBuy) || qBuy === 'course')) { startGuestCheckout(qBuy); return; }
 if (localStorage.getItem('fuse_quiz')) showAuth('signup'); else showQuiz(); return;
 }
 hideAuth(); preview = false; $('previewRibbon').style.display = 'none';
 // Came from the Atelier page "Get instant access" -> start the course purchase.
 // Deep-link checkout: /studio?buy=<pack> opens the buy flow for that pack
 // (used by the Atelier sales page tier buttons — course, atelier_starter, …).
 // Fires FIRST, before buildHome()/loadProfile()/restoreRoute() below — same
 // fix as the !user branch above. Waiting until after the home page had
 // already rendered (the old setTimeout(...,600) placed way down here) meant
 // anyone already logged in landed on the app shell first and only reached
 // Paystack a beat later, or not at all if anything earlier in this branch
 // threw. An already-logged-in buyer should hit checkout exactly as
 // immediately as a guest does.
 const qBuy = new URLSearchParams(location.search).get('buy');
 if (qBuy && (cfg.PACKS.some((p) => p.key === qBuy) || qBuy === 'course')) {
   // openBuy() first so the note/pack-list overlay is actually visible if
   // buy() hits an error (no credits card, network hiccup) — otherwise a
   // failed redirect would leave the buyer staring at a blank page with no
   // sign anything happened, since buildHome() below never runs in this path.
   openBuy(); buy(qBuy); return;
 }
 buildHome();
 await loadProfile();

 await claimReferral();
 // Restore the view you were on before a refresh, and re-attach any in-progress render.
 restoreRoute();
 loadPendingJobs();
 startGlobalPoller();
 maybePromo();
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
 $('pgModeChar').onclick = () => pgSetMode('character');
 $('pgModeGeneral').onclick = () => pgSetMode('general');
 $('pgGen').onclick = pgGenerate;
 $('pgUse').onclick = pgUse;
 $('pgSaveChar').onclick = pgSaveChar;
 $('pgRefBtn').onclick = () => { if (pgRefs.length >= 10) return note('pgRefNote', 'Max 10 reference images.', 'err'); $('pgRefFile').click(); };
 $('pgRefFile').onchange = (e) => { pgPickRefs(Array.from(e.target.files || [])); e.target.value = ''; };
 $('pgCopyMain').onclick = () => pgCopy('pgMain');
 $('pgCopyVary').onclick = () => navigator.clipboard.writeText(Array.from($('pgVary').querySelectorAll('.pg-txt')).map((d) => d.textContent).join('\n\n'));
 $('pgCopyCons').onclick = () => pgCopy('pgCons');
 $('pgCopyNeg').onclick = () => pgCopy('pgNeg');
 $('pgCopyJson').onclick = pgCopyJson;
 $('capGen').onclick = capGenerate;
 document.querySelectorAll('#view-promptgen [data-cap]').forEach((b) => b.onclick = () => {
 const which = b.dataset.cap;
 const text = which === 'text' ? $('capText').textContent : $('capTags').textContent;
 navigator.clipboard.writeText(text); const o = b.textContent; b.textContent = ' Copied'; setTimeout(() => b.textContent = o, 1300);
 });
 $('capCopyAll').onclick = () => navigator.clipboard.writeText(`${$('capText').textContent}\n\n${$('capTags').textContent}`);
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
 $('avEngine').onchange = () => { avToggleEngine(); avSaveEngine(); };
 $('avResemblePicker').onchange = avSaveEngine;
 $('avFaceVideoPick').onclick = () => $('avFaceVideoFile').click();
 $('avFaceVideoFile').onchange = (e) => { const f = e.target.files[0]; if (f) uploadAvatarTrainingVideo(f); e.target.value = ''; };
 $('avvGen').onclick = avvGenerate;
 $('avvRewrite').onclick = avvRewriteScript;
 $('avvMode').onchange = avvToggleMode;
 $('avvScript').oninput = avvUpdateCostEstimate;
 $('avvResolution').onchange = avvUpdateCostEstimate;
 $('avvSaveStill').onclick = avvSaveStillToLibrary;
 $('avvStartFramePick').onclick = () => $('avvStartFrameFile').click();
 $('avvStartFrameFile').onchange = (e) => { avvPickStartFrame(e.target.files[0]); e.target.value = ''; };
 $('avOwnAudioPick').onclick = () => $('avOwnAudioFile').click();
 $('avOwnAudioFile').onchange = (e) => { const f = e.target.files[0]; if (f) uploadAvatarOwnAudio(f); e.target.value = ''; };
 $('avvAddCta').onclick = avvAddCta;
 $('audioBack').onclick = () => showView('home');
 $('adVoicePick').onclick = () => $('adVoiceFile').click();
 $('adVoiceFile').onchange = (e) => { const f = e.target.files[0]; if (f) uploadAudioVoiceSample(f); e.target.value = ''; };
 $('adVoicePicker').onchange = (e) => { const opt = e.target.selectedOptions[0]; $('adVoiceRefText').value = (opt && opt.dataset.ref) || ''; };
 $('adEngine').onchange = adToggleEngine;
 $('adSaveVoice').onclick = saveTrainedVoice;
 $('adGen').onclick = adGenerate;
 $('adRewrite').onclick = adRewriteScript;
 $('editBack').onclick = () => showView('home');
 $('editVideoPick').onclick = () => $('editVideoFile').click();
 $('editVideoFile').onchange = (e) => { const f = e.target.files[0]; if (f) uploadEditVideo(f); e.target.value = ''; };
 $('editSend').onclick = editSend;
 $('editMsg').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); editSend(); } });
 $('editOmniSend').onclick = editOmniSend;
 $('editApplyCaptions').onclick = editApplyCaptions;
 $('editCaptionEffect').onchange = () => {
 const isGradient = $('editCaptionEffect').value === 'gradient';
 $('editColor2Wrap').style.display = isGradient ? 'block' : 'none';
 $('editColor1Label').textContent = $('editCaptionEffect').value === 'highlight-box' ? 'Box color' : 'Text color';
 };
 $('editElementPick').onclick = () => $('editElementFile').click();
 $('editElementFile').onchange = (e) => { editElementFile = e.target.files[0] || null; note('editElementNote', editElementFile ? `Selected: ${editElementFile.name}` : '', 'ok'); };
 $('editAddElement').onclick = editAddElement;
 $('editApplyCta').onclick = editApplyCta;
 $('flyerBack').onclick = () => showView('home');
 $('flyerNewBtn').onclick = flyerNewProject;
 $('flyerRefPick').onclick = () => $('flyerRefFile').click();
 $('flyerRefFile').onchange = (e) => { flyerPickRefs(Array.from(e.target.files)); e.target.value = ''; };
 $('flyerSend').onclick = flyerSend;
 $('flyerMsg').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); flyerSend(); } });
 $('flyerGenHero').onclick = flyerGenHero;
 // One shared hidden file input, triggered from wherever the user hits
 // it first (Hero visual panel, Add a layer, or Typography) — uploading
 // sets the project's working hero image directly, bypassing generation.
 { const f = $('flyerHeroUploadFile'); if (f) f.onchange = (e) => { flyerUploadHero(e.target.files[0]); e.target.value = ''; }; }
 document.querySelectorAll('[data-flyer-hero-upload]').forEach((b) => b.onclick = () => $('flyerHeroUploadFile').click());
 $('flyerLayerImgPick').onclick = () => $('flyerLayerImgFile').click();
 $('flyerLayerImgFile').onchange = (e) => { flyerPickLayerImgs(Array.from(e.target.files)); e.target.value = ''; };
 $('flyerSuggestLayers').onclick = flyerSuggestLayers;
 $('flyerAddLayer').onclick = flyerAddLayer;
 $('flyerComposite').onclick = flyerComposite;
 populateFlyerFontPicker();
 $('flyerRenderMode').onchange = () => {
 const isFont = $('flyerRenderMode').value === 'font';
 $('flyerFontPickerWrap').style.display = isFont ? 'block' : 'none';
 };
 document.querySelectorAll('#flyerHeadlinePosGrid .hpos-btn').forEach((b) => {
 b.onclick = () => {
 document.querySelectorAll('#flyerHeadlinePosGrid .hpos-btn').forEach((x) => x.classList.toggle('active', x === b));
 $('flyerHeadlinePosition').value = b.dataset.pos;
 };
 });
 initDesignStudio();
 ['headline', 'features', 'cta'].forEach((kind) => {
 const ids = { headline: ['flyerHeadlineRefPick', 'flyerHeadlineRefFile'], features: ['flyerFeaturesRefPick', 'flyerFeaturesRefFile'], cta: ['flyerCtaRefPick', 'flyerCtaRefFile'] }[kind];
 $(ids[0]).onclick = () => $(ids[1]).click();
 $(ids[1]).onchange = (e) => { flyerPickCompositeRef(kind, e.target.files[0]); e.target.value = ''; };
 });
 $('flyerSpotFixOpen').onclick = flyerOpenSpotFix;
 flyerSpotFixWire();
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
 { const p = $('dlgVideoPick'); if (p) p.onclick = () => $('dlgVideoFile').click(); }
 { const f = $('dlgVideoFile'); if (f) f.onchange = (e) => { dlgPickVideo(e.target.files); e.target.value = ''; }; }
 { const p = $('dlgAudioPick'); if (p) p.onclick = () => $('dlgAudioFile').click(); }
 { const f = $('dlgAudioFile'); if (f) f.onchange = (e) => { dlgPickAudio(e.target.files); e.target.value = ''; }; }
 { const t = $('dlgAudioToggle'); if (t) t.onclick = dlgToggleAudio; }
 { const g = $('dlgGen'); if (g) g.onclick = dlgGenerate; }
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
 if ($('vDuration')) $('vDuration').onchange = vUpdateCostEstimate;
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
 $('menuLogout').onclick = () => { closeMenu(); logout(); };
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
 $('payoutBtn').onclick = requestPayout;
 $('copyRef').onclick = () => { navigator.clipboard.writeText($('refLink').value); $('copyRef').textContent = 'Copied!'; setTimeout(() => $('copyRef').textContent = 'Copy', 1500); };
 $('logoutBtn').onclick = logout;
 { const ic = $('invCreate'); if (ic) ic.onclick = adminCreateInvoice; }
 { const lb = $('lookupBtn'); if (lb) lb.onclick = adminLookup; }
 $('adminGrant').onclick = () => adminGrant(false);
 $('adminGrantCredits').onclick = () => adminGrant(true);
 { const rb = $('revokeBtn'); if (rb) rb.onclick = adminRevoke; }
 { const gc = $('adminGrantCourse'); if (gc) gc.onclick = adminGrantCourse; }
 { const ac = $('adminCourse'); if (ac) { ac.onchange = updateAdminCourseBonusLabel; updateAdminCourseBonusLabel(); } }
 $('lbClose').onclick = () => $('lightbox').style.display = 'none';
 $('lbDl').onclick = () => downloadFile(lbUrl);
 $('authBtn').onclick = doAuth;
 $('authSwitchLink').onclick = () => setAuthMode(authMode === 'signup' ? 'login' : 'signup');
 $('authPass').addEventListener('keydown', (e) => { if (e.key === 'Enter') doAuth(); });
 $('previewLink').onclick = enterPreview;
 $('forgotLink').onclick = doForgotPassword;
 $('recoverBtn').onclick = doSetNewPassword;
 $('recoverPass').addEventListener('keydown', (e) => { if (e.key === 'Enter') doSetNewPassword(); });

 if (new URLSearchParams(location.search).get('paid')) {
 const paidQS = new URLSearchParams(location.search);
 const paidPack = paidQS.get('pack');
 // Paystack appends its own reference/trxref to the callback redirect --
 // this is what actually proves a charge happened, not the mere presence
 // of ?paid=1 (Paystack lands here on declined/failed/abandoned attempts
 // too, not just successful ones).
 const paidReference = paidQS.get('reference') || paidQS.get('trxref');
 const isGuest = paidQS.get('guest') === '1';
 const packDef = paidPack && (cfg.PACKS || []).find((p) => p.key === paidPack);
 const isCoursePack = !!(packDef && packDef.kind === 'course');
 history.replaceState({}, '', location.pathname);
 // Guest checkout (no account existed at checkout time -- see
 // startGuestCheckout()): this is where "sign up" actually happens, after
 // payment, not before it. startClaimAccount() calls boot() itself once
 // signed in, which re-renders everything normally from there -- nothing
 // else in this block applies until that's done, so it's skipped here
 // rather than returning out of the whole DOMContentLoaded handler below
 // (which still needs to reach the service-worker registration + boot()
 // fallback for the non-guest path).
 if (isGuest && paidReference) {
 setTimeout(() => startClaimAccount(paidReference, paidPack), 600);
 } else {
 setTimeout(async () => {
 if (!user) return;
 // Meta Pixel Purchase: only fires once verify-payment.js confirms a real
 // payments row with status='success' -- written exclusively by the
 // webhook after checking Paystack's own signature on a genuine
 // charge.success event. The webhook can land a beat after this redirect
 // does, so retry a couple times before giving up (giving up silently is
 // the safe failure mode here -- an undercounted real sale is far less
 // damaging to ad optimization than the false purchases this replaces).
 if (packDef && paidReference && typeof fbq === 'function') {
 for (let attempt = 0; attempt < 4; attempt++) {
 try {
 const res = await fetch('/.netlify/functions/verify-payment', {
 method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
 body: JSON.stringify({ reference: paidReference }),
 });
 const d = await res.json();
 if (d.verified) { fbq('track', 'Purchase', { value: packDef.naira, currency: 'NGN', content_name: paidPack }); break; }
 } catch (e) {}
 await new Promise((r) => setTimeout(r, 2000));
 }
 }
 await loadProfile();
 if (!isCoursePack) return;
 // The Paystack webhook that actually unlocks the module can land a beat
 // after this redirect does — give it one retry before giving up so we
 // don't drop them into a course view that still shows "locked".
 await openCourse();
 if (atelierTier() < 1) setTimeout(openCourse, 3000);
 }, 2500);
 }
 }
 if ('serviceWorker' in navigator) navigator.serviceWorker.register('/app/sw.js').catch(() => {});

 boot();
});

// A tab left open across an admin's video upload never re-fetches
// course_videos on its own -- openCourse() only queries it when that view
// is entered, so a student who was already sitting on the Course tab (or
// just switched back to this browser tab after time away) keeps seeing
// "soon" even after the video is live for everyone else. Re-pull it
// whenever this tab regains focus while the Course view is open, so
// coming back to it is enough to pick up anything the admin just added.
document.addEventListener('visibilitychange', () => {
 if (document.visibilityState === 'visible' && curView === 'course') openCourse();
});
