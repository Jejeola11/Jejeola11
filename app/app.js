// ============================================================
// Fuse Studio — studio app logic
// Auth (Supabase) + credit display + generation (via secure function)
// + Paystack checkout. Loaded only on studio.html.
// ============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const cfg = window.FUSE;
const sb = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

const $ = (id) => document.getElementById(id);
let currentUser = null;

// ---------- helpers ----------
async function authHeader() {
  const { data } = await sb.auth.getSession();
  const token = data.session && data.session.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
function naira(n) { return '₦' + Number(n).toLocaleString(); }

// ---------- auth ----------
async function refreshSession() {
  const { data } = await sb.auth.getSession();
  currentUser = data.session ? data.session.user : null;
  if (currentUser) { hideAuth(); await loadProfile(); await loadGallery(); }
  else { showAuth(); }
}

function showAuth() { $('authOverlay').style.display = 'grid'; $('appMain').style.opacity = '.15'; }
function hideAuth() { $('authOverlay').style.display = 'none'; $('appMain').style.opacity = '1'; }

let authMode = 'signup'; // 'signup' | 'login'
function setAuthMode(m) {
  authMode = m;
  $('authTitle').textContent = m === 'signup' ? 'Create your account' : 'Welcome back';
  $('authBtn').textContent = m === 'signup' ? 'Start free →' : 'Log in →';
  $('authSwitchText').textContent = m === 'signup' ? 'Already have an account?' : "New here?";
  $('authSwitchLink').textContent = m === 'signup' ? 'Log in' : 'Create one';
  $('authTrial').style.display = m === 'signup' ? 'block' : 'none';
  setNote('authNote', '');
}
function setNote(id, msg, kind) {
  const el = $(id); el.textContent = msg || '';
  el.className = 'note' + (kind ? ' ' + kind : '');
}

async function doAuth() {
  const email = $('authEmail').value.trim();
  const pass = $('authPass').value;
  if (!email || !pass) return setNote('authNote', 'Enter your email and password.', 'err');
  $('authBtn').disabled = true;
  try {
    if (authMode === 'signup') {
      const { error } = await sb.auth.signUp({ email, password: pass });
      if (error) throw error;
      const { data } = await sb.auth.getSession();
      if (!data.session) {
        setNote('authNote', '✅ Account created — check your email to confirm, then log in.', 'ok');
        $('authBtn').disabled = false; setAuthMode('login'); return;
      }
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
    }
    await refreshSession();
  } catch (e) {
    setNote('authNote', e.message || 'Something went wrong.', 'err');
  }
  $('authBtn').disabled = false;
}

async function logout() { await sb.auth.signOut(); location.reload(); }

// ---------- profile / credits ----------
async function loadProfile() {
  const { data, error } = await sb.from('profiles')
    .select('credits, plan, plan_expires_at').eq('id', currentUser.id).maybeSingle();
  if (error || !data) { $('creditCount').textContent = '…'; return; }
  $('creditCount').textContent = data.credits;
  $('planBadge').textContent = data.plan === 'free' ? 'Free trial' : 'Studio ' + data.plan;
}

// ---------- generate ----------
async function generate() {
  const prompt = $('prompt').value.trim();
  if (!prompt) { setNote('genNote', 'Describe what you want to create.', 'err'); return; }
  const model = $('model').value;
  const aspect = $('aspect').value;

  const btn = $('genBtn'); btn.disabled = true; btn.innerHTML = 'Generating…';
  $('result').innerHTML = '<div><span class="spin"></span><div style="margin-top:12px">Sending to the engine…</div></div>';
  setNote('genNote', '');

  let elapsed = 0;
  const tick = setInterval(() => { elapsed += 2.5;
    const r = $('result').querySelector('div div'); if (r) r.textContent = `Creating… (${Math.round(elapsed)}s)`;
  }, 2500);

  try {
    const res = await fetch('/.netlify/functions/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ prompt, model, aspect }),
    });
    const data = await res.json();
    clearInterval(tick);

    if (res.status === 402) {
      $('result').innerHTML = '<div>You’re out of credits.</div>';
      setNote('genNote', 'Out of credits — top up to keep creating.', 'err');
      openBuy(); return;
    }
    if (!res.ok) throw new Error(data.error || 'Generation failed');

    $('creditCount').textContent = data.credits;
    $('result').innerHTML =
      `<div><img src="${data.url}" alt="result"><div style="margin-top:12px">` +
      `<a class="btn gold sm" href="${data.url}" target="_blank" download>⬇ Download</a></div></div>`;
    setNote('genNote', 'Done ✅', 'ok');
    loadGallery();
  } catch (e) {
    clearInterval(tick);
    $('result').innerHTML = '<div>⚠ ' + (e.message || 'Failed') + '</div>';
    setNote('genNote', e.message || 'Failed — your credits were not charged.', 'err');
  }
  btn.disabled = false; btn.innerHTML = '✨ Generate';
}

// ---------- recent gallery ----------
async function loadGallery() {
  const { data } = await sb.from('generations')
    .select('output_url').eq('user_id', currentUser.id)
    .order('created_at', { ascending: false }).limit(8);
  const g = $('gallery');
  if (!data || !data.length) { g.innerHTML = ''; return; }
  g.innerHTML = data.map((x) => `<img src="${x.output_url}" onclick="window.open('${x.output_url}','_blank')">`).join('');
}

// ---------- buy / Paystack ----------
function openBuy() {
  const list = cfg.PACKS.map((p) => `
    <div class="pk" data-pack="${p.key}">
      <div><div class="pkn">${p.name}${p.featured ? ' ⭐' : ''}</div>
        <div class="pkc">${p.credits} credits · ${p.note}${p.kind === 'sub' ? ' · /mo' : ''}</div></div>
      <div class="pka">${naira(p.naira)}</div>
    </div>`).join('');
  $('packList').innerHTML = list;
  $('packList').querySelectorAll('.pk').forEach((el) => {
    el.onclick = () => buy(el.getAttribute('data-pack'), el);
  });
  setNote('buyNote', '');
  $('buyOverlay').style.display = 'grid';
}
function closeBuy() { $('buyOverlay').style.display = 'none'; }

async function buy(pack, el) {
  setNote('buyNote', 'Opening secure checkout…', 'ok');
  if (el) el.style.opacity = '.5';
  try {
    const res = await fetch('/.netlify/functions/paystack-init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ pack }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not start payment');
    window.location.href = data.authorization_url; // Paystack page (offers Pay with Transfer)
  } catch (e) {
    setNote('buyNote', e.message || 'Failed to start payment', 'err');
    if (el) el.style.opacity = '1';
  }
}

// ---------- wire up ----------
window.addEventListener('DOMContentLoaded', () => {
  $('authBtn').onclick = doAuth;
  $('authSwitchLink').onclick = () => setAuthMode(authMode === 'signup' ? 'login' : 'signup');
  $('authPass').addEventListener('keydown', (e) => { if (e.key === 'Enter') doAuth(); });
  $('logoutBtn').onclick = logout;
  $('genBtn').onclick = generate;
  $('buyBtn').onclick = openBuy;
  $('buyClose').onclick = closeBuy;
  $('creditPill').onclick = openBuy;

  setAuthMode('signup');
  refreshSession();

  // If we just came back from Paystack, refresh the balance shortly after
  // (webhook credits arrive server-side within a second or two).
  if (new URLSearchParams(location.search).get('paid')) {
    setTimeout(() => currentUser && loadProfile(), 2500);
  }

  // Register the service worker so the app is installable.
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/app/sw.js').catch(() => {});
});
