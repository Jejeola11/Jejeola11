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
let activeStudio = cfg.STUDIOS[0];
let lastPrompt = '';
let refUrls = [];   // optional image reference(s) for the main generator (multi)

const naira = (n) => '₦' + Number(n).toLocaleString();
const usd = (n) => '$' + Math.round(n / cfg.USD_RATE);
const price = (n) => (showUsd ? usd(n) : naira(n));

async function authHeader() {
  const { data } = await sb.auth.getSession();
  const t = data.session && data.session.access_token;
  return t ? { Authorization: `Bearer ${t}` } : {};
}
function note(id, msg, kind) { const e = $(id); e.textContent = msg || ''; e.className = 'note' + (kind ? ' ' + kind : ''); }

// ---------------- view routing ----------------
function showView(name, opts = {}) {
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  const el = $('view-' + name);
  if (el) el.classList.add('active');
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.view === name));
  window.scrollTo(0, 0);
  if (name === 'library') loadLibrary();
  if (name === 'profile') loadProfile();
  if (name === 'community') loadChallenges();
  if (name === 'reactor') buildReactor();
  if (name === 'models') buildModels(modelKind);
}

// ---------------- model gallery (Image / Video / Reactor) ----------------
let modelKind = 'image';
function buildModels(kind) {
  modelKind = kind || 'image';
  document.querySelectorAll('.mtab').forEach((t) => t.classList.toggle('active', t.dataset.kind === modelKind));
  if (modelKind === 'reactor') { showView('reactor'); return; }
  const list = modelKind === 'video' ? cfg.VIDEO_MODELS : modelKind === 'tools' ? cfg.TOOL_MODELS : cfg.IMAGE_MODELS;
  const q = ($('modelSearch').value || '').toLowerCase();
  const shown = list.filter((m) => m.name.toLowerCase().includes(q) || m.badge.toLowerCase().includes(q));
  $('modelGrid').innerHTML = shown.map((m) => {
    const media = m.sample
      ? (modelKind === 'video' ? `<video src="${m.sample}" muted loop playsinline></video>` : `<img src="${m.sample}">`)
      : '＋ add sample';
    return `<div class="mcard" data-slug="${m.slug}"><div class="msample">${media}</div>
      <div class="minfo"><div class="mn">${m.name}</div><div class="mb">${m.badge}</div><div class="mc">${m.credits} cr</div></div></div>`;
  }).join('');
  $('modelGrid').querySelectorAll('.mcard').forEach((el) => el.onclick = () => {
    if (modelKind === 'video') openVideo(el.dataset.slug);
    else if (modelKind === 'tools') openTool(el.dataset.slug);
    else openImageModel(el.dataset.slug);
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

// ---------------- video studio ----------------
let vModel = null, vRefUrl = '';
function openVideo(slug) {
  vModel = cfg.VIDEO_MODELS.find((m) => m.slug === slug) || cfg.VIDEO_MODELS[0];
  $('vModelName').textContent = vModel.name + ' · ' + vModel.credits + ' cr';
  $('vResult').innerHTML = '<div class="muted">Your video appears here. Video takes a little longer ⏳</div>';
  $('vGen').textContent = `🎬 Generate video (${vModel.credits} credits)`;
  vRefUrl = ''; $('vRefPreview').style.display = 'none'; $('vRefBtn').style.display = 'flex';
  note('vNote', '');
  showView('video');
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
  const btn = $('vGen'); btn.disabled = true; btn.textContent = 'Generating…';
  $('vResult').innerHTML = '<div><span class="spin"></span><div style="margin-top:12px">Rendering your video… this can take 1–3 min</div></div>';
  note('vNote', '');
  let t = 0; const iv = setInterval(() => { t += 3; const d = $('vResult').querySelector('div div'); if (d) d.textContent = `Rendering… (${t}s)`; }, 3000);
  try {
    const res = await fetch('/.netlify/functions/video-generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ model: vModel.slug, prompt, aspect: $('vAspect').value, duration: $('vDuration').value, resolution: $('vRes').value, image_url: vRefUrl || undefined }),
    });
    const data = await res.json(); clearInterval(iv);
    if (res.status === 402) { note('vNote', 'Out of credits — top up.', 'err'); openBuy(); $('vResult').innerHTML = '<div>Out of credits.</div>'; }
    else if (!res.ok) throw new Error(data.error || 'Failed');
    else {
      $('creditCount').textContent = data.credits;
      $('vResult').innerHTML = `<div><video src="${data.url}" controls autoplay loop muted playsinline></video><div style="margin-top:12px"><a class="btn gold sm" href="${data.url}" target="_blank" download>⬇ Download</a></div></div>`;
      note('vNote', 'Done ✅', 'ok');
    }
  } catch (e) { clearInterval(iv); $('vResult').innerHTML = '<div>⚠ ' + (e.message || 'Failed') + '</div>'; note('vNote', e.message || 'Failed — credits not charged.', 'err'); }
  btn.disabled = false; btn.textContent = `🎬 Generate video (${vModel.credits} credits)`;
}

function openStudio(key) {
  if (key === 'reactor') { showView('reactor'); return; }
  if (key === 'market') { showView('market'); loadMarket(); return; }
  if (key === 'learn') { showView('learn'); buildLessons(); return; }
  if (key === 'avatar') { showView('avatar'); loadAvatars(); return; }
  activeStudio = cfg.STUDIOS.find((s) => s.key === key) || cfg.STUDIOS[0];
  $('studioIcon').textContent = activeStudio.icon;
  $('studioName').textContent = activeStudio.name;
  $('studioDesc').textContent = activeStudio.desc + (activeStudio.advanced ? ' · Beta' : '');
  $('result').innerHTML = '<div>Your creation appears here.<br><span class="muted">Write a prompt and hit Generate ✨</span></div>';
  note('genNote', '');
  showView('studio');
}

// ---------------- home builders ----------------
function buildHome() {
  // tool cards (studios + reactor + marketplace + academy)
  const cards = cfg.STUDIOS.filter((s) => s.key !== 'generate').concat([
    { key: 'reactor', name: cfg.REACTOR_NAME, icon: '⚛️', tag: 'NEW', desc: 'Claude · Gemini · ChatGPT & more' },
    { key: 'market',  name: 'Marketplace',     icon: '🛒', tag: '',    desc: 'Use & sell community presets' },
    { key: 'learn',   name: 'Fuse Academy',    icon: '🎓', tag: '',    desc: 'Learn & earn 20 credits' },
  ]);
  $('toolGrid').innerHTML = cards.map((s) => {
    const cls = s.tag === 'BETA' ? 'beta' : s.tag === 'TRENDING' ? 'trend' : '';
    return `<div class="tool" data-studio="${s.key}">
      ${s.tag ? `<span class="bdg ${cls}">${s.tag}</span>` : ''}
      <div class="ic">${s.icon}</div><div class="tn">${s.name}</div><div class="td">${s.desc}</div></div>`;
  }).join('');
  $('toolGrid').querySelectorAll('.tool').forEach((el) => el.onclick = () => openStudio(el.dataset.studio));

  // preset chips
  $('presetChips').innerHTML = cfg.PRESETS.map((p) => `<div class="chip">${p}</div>`).join('');
  $('presetChips').querySelectorAll('.chip').forEach((el) => el.onclick = () => {
    openStudio('generate'); $('prompt').value = el.textContent;
  });

  // Naija packs
  $('naijaChips').innerHTML = cfg.NAIJA_PACKS.map((p, i) => `<div class="chip" data-i="${i}">${p.name}</div>`).join('');
  $('naijaChips').querySelectorAll('.chip').forEach((el) => el.onclick = () => {
    openStudio('generate'); $('prompt').value = cfg.NAIJA_PACKS[+el.dataset.i].prompt;
  });

  refreshStreak();

  // promo banner
  const pr = cfg.PROMO;
  $('homePromo').innerHTML =
    `<div class="lab">⏳ ${pr.title}</div><h3>${pr.body}</h3>
     <button class="btn gold sm" id="promoBannerCta">${pr.cta}</button>
     <span class="countdown" id="bannerCountdown"></span>`;
  $('promoBannerCta').onclick = () => buy(pr.pack);
  startCountdown('bannerCountdown', pr.hours);
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
  const model = $('model').value, aspect = $('aspect').value;

  const btn = $('genBtn'); btn.disabled = true; btn.textContent = 'Generating…';
  $('result').innerHTML = '<div><span class="spin"></span><div style="margin-top:12px">Sending to the engine…</div></div>';
  note('genNote', '');
  let t = 0; const iv = setInterval(() => { t += 2.5; const d = $('result').querySelector('div div'); if (d) d.textContent = `Creating… (${Math.round(t)}s)`; }, 2500);

  try {
    const res = await fetch('/.netlify/functions/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ prompt, model, aspect, reference_image_urls: refUrls.length ? refUrls : undefined }),
    });
    const data = await res.json(); clearInterval(iv);
    if (res.status === 402) { note('genNote', 'Out of credits — top up to keep creating.', 'err'); openBuy(); $('result').innerHTML = '<div>Out of credits.</div>'; }
    else if (!res.ok) throw new Error(data.error || 'Generation failed');
    else {
      $('creditCount').textContent = data.credits;
      $('result').innerHTML = `<div><img src="${data.url}" alt="result"><div style="margin-top:12px"><a class="btn gold sm" href="${data.url}" target="_blank" download>⬇ Download</a></div></div>`;
      note('genNote', 'Done ✅', 'ok');
    }
  } catch (e) { clearInterval(iv); $('result').innerHTML = '<div>⚠ ' + (e.message || 'Failed') + '</div>'; note('genNote', e.message || 'Failed — credits not charged.', 'err'); }
  btn.disabled = false; btn.textContent = '✨ Generate';
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
async function loadLibrary() {
  if (preview) return demoGrid('libGrid');
  const { data } = await sb.from('generations').select('output_url').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30);
  const g = $('libGrid');
  g.innerHTML = (data && data.length) ? data.map((x) => `<img src="${x.output_url}" onclick="window.open('${x.output_url}','_blank')">`).join('')
    : '<div class="empty">No creations yet — make your first ✨</div>';
}
async function loadRecent() {
  if (preview) return demoGrid('homeRecent');
  const { data } = await sb.from('generations').select('output_url').eq('user_id', user.id).order('created_at', { ascending: false }).limit(6);
  $('homeRecent').innerHTML = (data && data.length) ? data.map((x) => `<img src="${x.output_url}" onclick="window.open('${x.output_url}','_blank')">`).join('') : '<div class="empty" style="grid-column:1/-1">Your recent creations show here.</div>';
}
function demoGrid(id) { $(id).innerHTML = Array(6).fill('<div class="empty" style="aspect-ratio:1;display:grid;place-items:center;padding:0">🖼️</div>').join(''); }

// ---------------- profile ----------------
async function loadProfile() {
  $('creditCount').textContent;
  if (preview) {
    $('pfEmail').textContent = 'preview@fuse'; $('pfPlan').textContent = 'Preview'; $('pfCredits').textContent = '—';
    $('refLink').value = location.origin + '/?ref=YOURCODE'; $('pfAffiliate').textContent = '₦0'; return;
  }
  const { data } = await sb.from('profiles').select('credits, plan, plan_expires_at, referral_code, affiliate_naira').eq('id', user.id).maybeSingle();
  if (!data) return;
  $('pfEmail').textContent = user.email;
  $('pfPlan').textContent = data.plan === 'free' ? 'Free trial' : 'Studio ' + data.plan;
  $('pfCredits').textContent = data.credits;
  $('creditCount').textContent = data.credits;
  $('planBadge').textContent = data.plan === 'free' ? 'Trial' : data.plan;
  $('refLink').value = `${location.origin}/?ref=${data.referral_code}`;
  $('pfAffiliate').textContent = naira(data.affiliate_naira || 0);
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
function openBuy() { renderPacks(); note('buyNote', ''); $('buyOverlay').style.display = 'grid'; }
function renderPacks() {
  $('packList').innerHTML = cfg.PACKS.map((p) =>
    `<div class="pk" data-pack="${p.key}"><div><div class="pkn">${p.name}${p.featured ? ' ⭐' : ''}</div>
      <div class="pkc">${p.credits} credits · ${p.note}${p.kind === 'sub' ? ' /mo' : ''}</div></div>
      <div class="pka">${price(p.naira)}</div></div>`).join('');
  $('packList').querySelectorAll('.pk').forEach((el) => el.onclick = () => buy(el.dataset.pack, el));
  $('curToggle').textContent = showUsd ? 'Show ₦' : 'Show $';
}
async function buy(pack, el) {
  if (preview) { showAuth('signup'); return; }
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

// ---------------- daily streak ----------------
async function refreshStreak() {
  if (preview) { $('streakText').textContent = 'Sign up to start your streak'; return; }
  const { data } = await sb.from('profiles').select('last_claim_at, streak_days').eq('id', user.id).maybeSingle();
  if (!data) return;
  const can = !data.last_claim_at || (Date.now() - new Date(data.last_claim_at).getTime()) > 20 * 3600 * 1000;
  $('streakText').textContent = `🔥 ${data.streak_days || 0}-day streak` + (can ? ' · claim today!' : ' · come back tomorrow');
  $('streakBtn').style.display = can ? 'inline-flex' : 'none';
}
async function claimDaily() {
  if (preview) { showAuth('signup'); return; }
  $('streakBtn').disabled = true;
  try {
    const res = await fetch('/.netlify/functions/daily-claim', { method: 'POST', headers: { ...(await authHeader()) } });
    const d = await res.json();
    if (d.claimed) { $('creditCount').textContent = d.credits; $('streakText').textContent = `🔥 ${d.streak}-day streak · +${d.award} credit${d.award > 1 ? 's' : ''}! 🎉`; $('streakBtn').style.display = 'none'; }
    else $('streakText').textContent = `🔥 ${d.streak}-day streak · come back tomorrow`;
  } catch (e) {}
  $('streakBtn').disabled = false;
}

// ---------------- AI Avatar Studio (consistent faces) ----------------
let selectedAvatar = null;
async function loadAvatars() {
  if (preview) { $('avatarList').innerHTML = '<div class="empty" style="grid-column:1/-1">Sign up to create your avatar</div>'; return; }
  const { data } = await sb.from('avatars').select('id,name,image_url,status').order('created_at', { ascending: false });
  $('avatarList').innerHTML = (data && data.length)
    ? data.map((a) => `<div style="text-align:center"><img src="${a.image_url}" data-id="${a.id}" data-name="${a.name}" class="avThumb" style="aspect-ratio:1;object-fit:cover;border-radius:12px;border:1px solid var(--line);cursor:pointer"><div style="font-size:11px;margin-top:4px" class="muted">${a.name}</div></div>`).join('')
    : '<div class="empty" style="grid-column:1/-1">No avatars yet — create one below 👇</div>';
  $('avatarList').querySelectorAll('.avThumb').forEach((el) => el.onclick = () => selectAvatar(el.dataset.id, el.dataset.name));
}
function selectAvatar(id, name) {
  selectedAvatar = id;
  $('avSelName').textContent = name;
  $('avGenWrap').style.display = 'block';
  $('avResult').innerHTML = '<div class="muted">Your consistent-face image appears here.</div>';
  $('avGenWrap').scrollIntoView({ behavior: 'smooth' });
}
async function createAvatar() {
  if (preview) { showAuth('signup'); return; }
  const name = $('avNewName').value.trim();
  const file = $('avFile').files[0];
  if (!name || !file) return note('avNote', 'Add a name and choose a selfie.', 'err');
  $('avCreate').disabled = true; note('avNote', 'Uploading…', 'ok');
  try {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await sb.storage.from('avatars').upload(path, file, { upsert: false });
    if (upErr) throw upErr;
    const { data: pub } = sb.storage.from('avatars').getPublicUrl(path);
    const { error: insErr } = await sb.from('avatars').insert({ user_id: user.id, name, image_url: pub.publicUrl });
    if (insErr) throw insErr;
    note('avNote', '✅ Avatar created! Tap it above to generate.', 'ok');
    $('avNewName').value = ''; $('avFile').value = '';
    loadAvatars();
  } catch (e) { note('avNote', e.message || 'Could not create avatar.', 'err'); }
  $('avCreate').disabled = false;
}
async function avatarGenerate() {
  if (preview) { showAuth('signup'); return; }
  if (!selectedAvatar) return note('avGenNote', 'Pick an avatar first.', 'err');
  const prompt = $('avPrompt').value.trim();
  if (!prompt) return note('avGenNote', 'Describe the scene.', 'err');
  const aspect = $('avAspect').value;
  const btn = $('avGen'); btn.disabled = true; btn.textContent = 'Generating…';
  $('avResult').innerHTML = '<div><span class="spin"></span><div style="margin-top:12px">Locking your face into the scene…</div></div>';
  note('avGenNote', '');
  try {
    const res = await fetch('/.netlify/functions/avatar-generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ avatar_id: selectedAvatar, prompt, aspect }),
    });
    const data = await res.json();
    if (res.status === 503) { $('avResult').innerHTML = '<div class="muted">Avatar Studio is being connected.</div>'; note('avGenNote', data.error, 'err'); }
    else if (res.status === 402) { note('avGenNote', 'Out of credits — top up.', 'err'); openBuy(); }
    else if (!res.ok) throw new Error(data.error || 'Failed');
    else {
      $('creditCount').textContent = data.credits;
      $('avResult').innerHTML = `<div><img src="${data.url}" alt="avatar"><div style="margin-top:12px"><a class="btn gold sm" href="${data.url}" target="_blank" download>⬇ Download</a></div></div>`;
      note('avGenNote', 'Done ✅', 'ok');
    }
  } catch (e) { $('avResult').innerHTML = '<div>⚠ ' + (e.message || 'Failed') + '</div>'; note('avGenNote', e.message || 'Failed — credits not charged.', 'err'); }
  btn.disabled = false; btn.textContent = '✨ Generate (12 credits)';
}

// ---------------- marketplace ----------------
async function loadMarket() {
  $('mpPrompt').value = lastPrompt || '';
  const { data } = await sb.from('marketplace_presets').select('id,title,uses,prompt,model,aspect').eq('active', true).order('uses', { ascending: false }).limit(40);
  $('mpList').innerHTML = (data && data.length) ? data.map((p) =>
    `<div class="mp"><div><div class="mt">${p.title}</div><div class="mu">🔥 ${p.uses} uses</div></div>
      <button class="btn gold sm" data-id="${p.id}" data-prompt="${encodeURIComponent(p.prompt)}" data-model="${p.model}" data-aspect="${p.aspect}">Use</button></div>`).join('')
    : '<div class="empty">No presets yet — be the first to publish one ✨</div>';
  $('mpList').querySelectorAll('button').forEach((b) => b.onclick = () => usePreset(b.dataset));
}
async function publishPreset() {
  if (preview) { showAuth('signup'); return; }
  const title = $('mpTitle').value.trim(), prompt = $('mpPrompt').value.trim();
  if (!title || !prompt) return note('mpNote', 'Add a title and a prompt.', 'err');
  const { error } = await sb.from('marketplace_presets').insert({ owner_id: user.id, title, prompt });
  note('mpNote', error ? error.message : '✅ Published! You earn a credit each time someone uses it.', error ? 'err' : 'ok');
  if (!error) { $('mpTitle').value = ''; loadMarket(); }
}
async function usePreset(d) {
  openStudio('generate');
  $('prompt').value = decodeURIComponent(d.prompt);
  if (d.model) $('model').value = d.model;
  if (d.aspect) $('aspect').value = d.aspect;
  if (!preview) fetch('/.netlify/functions/use-preset', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) }, body: JSON.stringify({ id: d.id }) }).catch(() => {});
}

// ---------------- academy (earn while you learn) ----------------
function buildLessons() {
  $('lessonList').innerHTML = cfg.LESSONS.map((l, i) =>
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

// ---------------- avatar prompt builder ----------------
function buildAvatarPrompt() {
  const parts = ['professional consistent-character portrait'];
  ['bSetting', 'bOutfit', 'bLight', 'bShot'].forEach((id) => { const v = $(id).value; if (v) parts.push(v); });
  parts.push('sharp detail, same face, high quality');
  $('avPrompt').value = parts.join(', ');
}

// ---------------- image reference upload (main generator, multi) ----------------
async function pickReferences(files) {
  if (preview) { showAuth('signup'); return; }
  if (!files || !files.length) return;
  note('genNote', 'Uploading reference(s)…', 'ok');
  try {
    for (const file of Array.from(files)) {
      if (refUrls.length >= 3) break;
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
  $('refBtn').style.display = refUrls.length >= 3 ? 'none' : 'flex';
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
  const btn = $('toolRun'); btn.disabled = true; btn.textContent = 'Working…';
  $('toolResult').innerHTML = '<div><span class="spin"></span><div style="margin-top:12px">Processing…</div></div>';
  try {
    const res = await fetch('/.netlify/functions/tool-generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ slug: toolSlug, image_url: toolImg, prompt: $('toolPrompt').value.trim() || undefined }),
    });
    const data = await res.json();
    if (res.status === 402) { note('toolNote', 'Out of credits — top up.', 'err'); openBuy(); }
    else if (!res.ok) throw new Error(data.error || 'Failed');
    else {
      $('creditCount').textContent = data.credits;
      $('toolResult').innerHTML = `<div><img src="${data.url}"><div style="margin-top:12px"><a class="btn gold sm" href="${data.url}" target="_blank" download>⬇ Download</a></div></div>`;
      note('toolNote', 'Done ✅', 'ok');
    }
  } catch (e) { $('toolResult').innerHTML = '<div>⚠ ' + (e.message || 'Failed') + '</div>'; note('toolNote', e.message || 'Failed — credits not charged.', 'err'); }
  btn.disabled = false; btn.textContent = 'Run tool';
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
  buildHome(); loadRecent();
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
  await loadRecent();
  await claimReferral();
  maybePromo();
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
  $('reactorBack').onclick = () => showView('home');
  $('marketBack').onclick = () => showView('home');
  $('learnBack').onclick = () => showView('home');
  $('avatarBack').onclick = () => showView('home');
  $('avCreate').onclick = createAvatar;
  $('avGen').onclick = avatarGenerate;
  $('bBuild').onclick = buildAvatarPrompt;
  $('qSkip').onclick = skipQuiz;
  $('refBtn').onclick = () => $('refFile').click();
  $('refFile').onchange = (e) => pickReferences(e.target.files);
  $('refRemove').onclick = removeReference;
  $('toolBack').onclick = () => showView('models');
  $('toolPick').onclick = () => $('toolFile').click();
  $('toolFile').onchange = (e) => pickToolImage(e.target.files[0]);
  $('toolRun').onclick = runTool;
  // model gallery + video studio
  document.querySelectorAll('.mtab').forEach((t) => t.onclick = () => buildModels(t.dataset.kind));
  $('modelSearch').oninput = () => buildModels(modelKind);
  $('videoBack').onclick = () => showView('models');
  $('vGen').onclick = videoGenerate;
  $('vRefBtn').onclick = () => $('vRefFile').click();
  $('vRefFile').onchange = (e) => pickVideoRef(e.target.files[0]);
  $('vRefRemove').onclick = () => { vRefUrl = ''; $('vRefPreview').style.display = 'none'; $('vRefBtn').style.display = 'flex'; $('vRefFile').value = ''; };
  buildModelSelect();
  $('seeLib').onclick = () => showView('library');
  $('streakBtn').onclick = claimDaily;
  $('mpPublish').onclick = publishPreset;
  $('learnClaim').onclick = claimLearn;
  $('learnCourse').onclick = () => buy('course');
  $('waLink').onclick = linkWhatsapp;
  $('genBtn').onclick = generate;
  $('rcSend').onclick = reactorSend;
  $('buyBtn').onclick = openBuy; $('creditPill').onclick = openBuy;
  $('buyClose').onclick = () => $('buyOverlay').style.display = 'none';
  $('curToggle').onclick = () => { showUsd = !showUsd; renderPacks(); };
  $('promoClose').onclick = () => $('promoOverlay').style.display = 'none';
  $('promoCta').onclick = () => { $('promoOverlay').style.display = 'none'; buy(cfg.PROMO.pack); };
  $('contentSubmit').onclick = submitContent;
  $('payoutBtn').onclick = requestPayout;
  $('copyRef').onclick = () => { navigator.clipboard.writeText($('refLink').value); $('copyRef').textContent = 'Copied!'; setTimeout(() => $('copyRef').textContent = 'Copy', 1500); };
  $('logoutBtn').onclick = logout;
  $('authBtn').onclick = doAuth;
  $('authSwitchLink').onclick = () => setAuthMode(authMode === 'signup' ? 'login' : 'signup');
  $('authPass').addEventListener('keydown', (e) => { if (e.key === 'Enter') doAuth(); });
  $('previewLink').onclick = enterPreview;

  if (new URLSearchParams(location.search).get('paid')) setTimeout(() => user && loadProfile(), 2500);
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/app/sw.js').catch(() => {});

  boot();
});
