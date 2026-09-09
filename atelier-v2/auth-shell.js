(() => {
  'use strict';
  const URL = 'https://rgbweaimkcndjznlazho.supabase.co';
  const KEY = 'sb_publishable_S3IEOR8vkWkXEdGtx8fGjw_nH8c4fV3';

  function deepestDoc() {
    try {
      let d = document;
      for (let i = 0; i < 9; i += 1) {
        const frame = d.getElementById('stage') || d.getElementById('app');
        if (!frame || !frame.contentDocument) break;
        d = frame.contentDocument;
      }
      return d;
    } catch (_) { return document; }
  }

  function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .fuse-auth{position:fixed;inset:0;z-index:9999;display:none;place-items:center;padding:18px;background:radial-gradient(circle at 50% 8%,#174c3b 0,#02110f 48%);color:#f8fff9;font-family:Inter,system-ui,sans-serif}
      .fuse-auth.open{display:grid}.fuse-auth-card{width:min(430px,100%);border:1px solid #315d50;border-radius:26px;background:rgba(7,28,24,.96);padding:26px;box-shadow:0 28px 90px #0009}.fuse-auth-mark{width:48px;height:48px;border-radius:15px;display:grid;place-items:center;background:linear-gradient(120deg,#ffe568,#baff63);color:#07120f;font-size:25px;font-weight:950}.fuse-auth h1{font-size:34px;line-height:1;margin:18px 0 8px;letter-spacing:-.05em}.fuse-auth p{color:#9bb1a8;line-height:1.5;margin:0 0 20px}.fuse-auth label{display:block;margin:12px 0 6px;color:#c8d8d1;font-size:11px;font-weight:900;letter-spacing:.08em}.fuse-auth input{width:100%;height:52px;border:1px solid #315d50;border-radius:14px;background:#031612;color:white;padding:0 14px;font:inherit;outline:none}.fuse-auth input:focus{border-color:#baff63}.fuse-auth button{width:100%;height:52px;border:0;border-radius:14px;margin-top:16px;background:linear-gradient(110deg,#ffe568,#baff63);color:#07120f;font-weight:950;font-size:16px}.fuse-auth button:disabled{opacity:.6}.fuse-auth-msg{min-height:20px;margin-top:12px!important;color:#ff9b83!important;font-size:12px}.fuse-auth-foot{text-align:center!important;font-size:11px!important;margin-top:4px!important}
    `;
    document.head.appendChild(style);
  }

  function addOverlay() {
    const el = document.createElement('section');
    el.className = 'fuse-auth'; el.id = 'fuseAuth';
    el.innerHTML = `<form class="fuse-auth-card" id="fuseAuthForm"><div class="fuse-auth-mark">F</div><h1>Welcome to Fuse Atelier.</h1><p>Sign in once to access your Academy, credits, creation tools and client pipeline.</p><label>EMAIL</label><input id="fuseEmail" type="email" autocomplete="email" required><label>PASSWORD</label><input id="fusePassword" type="password" autocomplete="current-password" required><button id="fuseSignIn" type="submit">Enter Fuse Atelier →</button><p class="fuse-auth-msg" id="fuseAuthMsg"></p><p class="fuse-auth-foot">Use the same email attached to your Fuse Atelier access.</p></form>`;
    document.body.appendChild(el); return el;
  }

  function loadSupabase() {
    return new Promise((resolve, reject) => {
      if (window.supabase) return resolve();
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
      s.onload = resolve; s.onerror = () => reject(new Error('Could not load sign-in. Check your connection and try again.'));
      document.head.appendChild(s);
    });
  }

  async function syncHome(client, session) {
    const { data } = await client.from('profiles').select('credits').eq('id', session.user.id).maybeSingle();
    const d = deepestDoc();
    const credit = [...d.querySelectorAll('button')].find(b => /credits/i.test(b.textContent || ''));
    if (credit && data && Number.isFinite(Number(data.credits))) credit.textContent = `✦ ${Number(data.credits)} credits`;
    const email = session.user.email || 'Fuse student';
    const menu = d.querySelector('.profile-menu .profile-top div:nth-child(2)');
    if (menu) menu.innerHTML = `<b>${email.split('@')[0]}</b><div style="font-size:12px;color:var(--muted)">${email}</div>`;
  }

  async function start() {
    addStyles(); const overlay = addOverlay();
    try {
      await loadSupabase();
      const client = window.supabase.createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
      const { data } = await client.auth.getSession();
      if (data.session) { await syncHome(client, data.session); return; }
      overlay.classList.add('open');
      document.getElementById('fuseAuthForm').addEventListener('submit', async e => {
        e.preventDefault(); const button = document.getElementById('fuseSignIn'); const msg = document.getElementById('fuseAuthMsg');
        button.disabled = true; button.textContent = 'Signing in…'; msg.textContent = '';
        try {
          const { data: signed, error } = await client.auth.signInWithPassword({ email: document.getElementById('fuseEmail').value.trim(), password: document.getElementById('fusePassword').value });
          if (error) throw error; overlay.classList.remove('open'); await syncHome(client, signed.session);
        } catch (err) { msg.textContent = err.message === 'Failed to fetch' ? 'Could not reach Fuse Atelier. Check your internet and try again.' : (err.message || 'Could not sign in.'); }
        finally { button.disabled = false; button.textContent = 'Enter Fuse Atelier →'; }
      });
    } catch (err) { overlay.classList.add('open'); document.getElementById('fuseAuthMsg').textContent = err.message || 'Could not start Fuse Atelier.'; }
  }
  window.addEventListener('load', () => setTimeout(start, 450));
})();
