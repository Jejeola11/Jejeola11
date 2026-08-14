// ============================================================
// Fuse Studio — the home surface (rebuild).
//
// Owns #fs-home inside #view-home: a full-bleed hero, feature rails of
// autoplaying work, the studio grid, and the announcement modal.
//
// Self-contained like flyer-studio.js and academy.js — it renders into one
// container and talks to app.js only through window.FuseHome, so the look can
// change without touching the app shell.
//
// VIDEO POLICY. Every tile is real work, and it MOVES — a still grid of
// screenshots is the thing that made the old home feel dead. But thirty
// autoplaying files would be brutal on Nigerian mobile data, so each tile
// carries only its poster until it scrolls into view; the source is attached
// and played then, and released when it leaves. Same approach as the atelier
// marquee, which is where these assets come from.
// ============================================================
(function () {
  const W = '/atelier-site/assets/work/';
  const S = '/atelier-site/assets/showcase/';
  const vid = (n) => ({ src: W + n + '.mp4', poster: W + n + '-poster.jpg' });

  // The hero rotates through a few pieces so the first screen is never the
  // same twice — cheap, and it makes the app feel alive on every visit.
  const HERO = [vid('work-11'), vid('work-21'), vid('work-16'), vid('work-09')];

  const FEATURES = [
    { title: 'Flyer Studio', tag: 'Rebuilt', desc: 'Describe it, and get a real layered design you can edit.', go: 'flyer', media: vid('work-02') },
    { title: 'AI Videos & UGC', tag: 'Popular', desc: 'Ads and product films with no camera and no studio.', go: 'video', media: { src: S + 'vid-ugc-skincare.mp4', poster: '/atelier-site/assets/showcase/lamer-underwater.jpg' } },
    { title: 'Avatar Studio', tag: null, desc: 'Clone a face once, then create with it forever.', go: 'avatar', media: vid('work-01') },
  ];

  const RAIL = ['work-12', 'work-16', 'work-05', 'work-19', 'work-23', 'work-06', 'work-14', 'work-24', 'work-20', 'work-26'].map(vid);

  const STUDIOS = [
    { k: 'generate', n: 'Image', d: 'Every model, one place' },
    { k: 'flyer', n: 'Flyer Studio', d: 'Layered designs' },
    { k: 'video', n: 'Video', d: 'Motion from a still' },
    { k: 'avatar', n: 'Avatar Studio', d: 'Your digital twin' },
    { k: 'audio', n: 'Audio', d: 'Voice and narration' },
    { k: 'editstudio', n: 'Edit Studio', d: 'Fix and finish' },
    { k: 'reactor', n: 'Fuse Reactor', d: 'Write with AI' },
    { k: 'academy', n: 'Academy', d: 'Learn and get paid' },
  ];

  const el = (t, c, h) => { const n = document.createElement(t); if (c) n.className = c; if (h != null) n.innerHTML = h; return n; };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const go = (k) => { if (window.fuseOpenStudio) window.fuseOpenStudio(k); };

  /** A video that stays a poster until it is on screen. */
  function tile(media, cls) {
    const v = document.createElement('video');
    v.className = cls || '';
    v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'none';
    v.setAttribute('poster', media.poster);
    v.dataset.src = media.src;
    return v;
  }

  let io = null;
  function observe(root) {
    if (!('IntersectionObserver' in window)) {
      root.querySelectorAll('video[data-src]').forEach((v) => { v.src = v.dataset.src; v.autoplay = true; });
      return;
    }
    if (io) io.disconnect();
    io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const v = e.target;
        if (e.isIntersecting) {
          if (!v.src && v.dataset.src) v.src = v.dataset.src;
          const p = v.play(); if (p && p.catch) p.catch(() => {}); // refused: poster stays
        } else if (!v.paused) v.pause();
      });
    }, { rootMargin: '200px 0px' });
    root.querySelectorAll('video[data-src]').forEach((v) => io.observe(v));
  }

  function render() {
    const root = document.getElementById('fs-home');
    if (!root) return;
    root.innerHTML = '';

    // ---- HERO
    const hero = el('section', 'fh-hero');
    const heroMedia = el('div', 'fh-hero-media');
    const pick = HERO[Math.floor(Math.random() * HERO.length)];
    heroMedia.appendChild(tile(pick, 'fh-hero-v'));
    heroMedia.appendChild(el('div', 'fh-hero-scrim'));
    hero.appendChild(heroMedia);

    const hc = el('div', 'fh-hero-copy');
    hc.appendChild(el('div', 'fh-chips', '<span class="fh-chip live"><i></i>Live now</span><span class="fh-chip">Works on your phone</span>'));
    hc.appendChild(el('h1', 'fh-h1', 'Make the work <span class="fh-grad">before</span><br>they hire you.'));
    hc.appendChild(el('p', 'fh-lede', 'Flyers, product films, AI avatars and full campaigns — generated, edited and exported in one place. No camera. No studio.'));
    const cta = el('div', 'fh-cta-row');
    const b1 = el('button', 'fh-btn', 'Start creating'); b1.onclick = () => go('generate');
    const b2 = el('button', 'fh-btn ghost', 'Open Flyer Studio'); b2.onclick = () => go('flyer');
    cta.appendChild(b1); cta.appendChild(b2);
    hc.appendChild(cta);
    hero.appendChild(hc);
    root.appendChild(hero);

    // ---- FEATURE CARDS
    const fWrap = el('section', 'fh-sec');
    fWrap.appendChild(el('h2', 'fh-h2', 'Start here'));
    const fGrid = el('div', 'fh-features');
    FEATURES.forEach((f) => {
      const c = el('article', 'fh-feature');
      const m = el('div', 'fh-feature-m');
      m.appendChild(tile(f.media));
      if (f.tag) m.appendChild(el('span', 'fh-tag', esc(f.tag)));
      c.appendChild(m);
      const b = el('div', 'fh-feature-b');
      b.appendChild(el('h3', null, esc(f.title)));
      b.appendChild(el('p', null, esc(f.desc)));
      c.appendChild(b);
      c.onclick = () => go(f.go);
      fGrid.appendChild(c);
    });
    fWrap.appendChild(fGrid);
    root.appendChild(fWrap);

    // ---- STUDIO GRID
    const sWrap = el('section', 'fh-sec');
    sWrap.appendChild(el('h2', 'fh-h2', 'Every studio'));
    const sGrid = el('div', 'fh-studios');
    STUDIOS.forEach((s) => {
      const c = el('button', 'fh-studio', `<span class="fh-studio-n">${esc(s.n)}</span><span class="fh-studio-d">${esc(s.d)}</span>`);
      c.onclick = () => go(s.k);
      sGrid.appendChild(c);
    });
    sWrap.appendChild(sGrid);
    root.appendChild(sWrap);

    // ---- WORK RAIL
    const rWrap = el('section', 'fh-sec');
    rWrap.appendChild(el('h2', 'fh-h2', 'Made with Fuse Studio'));
    const rail = el('div', 'fh-rail');
    RAIL.forEach((m) => { const c = el('div', 'fh-rail-item'); c.appendChild(tile(m)); rail.appendChild(c); });
    rWrap.appendChild(rail);
    root.appendChild(rWrap);

    observe(root);
  }

  // ---------------------------------------------------------------
  // ANNOUNCEMENT MODAL — media left, copy right, exactly the reference
  // shape. Shown once per `id`; bump the id to announce something new.
  // ---------------------------------------------------------------
  const ANNOUNCE = {
    id: 'flyer-rebuild-2026-08',
    tag: 'NEW',
    title: 'ORGANISE, EDIT,\nCREATE TOGETHER',
    body: 'Flyer Studio is rebuilt. Every element of a design is now its own layer — tap any of them and change it on its own.',
    bullets: [
      'Real layers, not a flat picture',
      'Tap any text to retype, recolour or move it',
      'Regenerate one element without redoing the rest',
      'Type a change and only that layer is remade',
    ],
    cta: 'Open Flyer Studio', go: 'flyer',
    media: vid('work-21'),
  };

  function showModal(force) {
    const key = 'fuse_seen_' + ANNOUNCE.id;
    if (!force) { try { if (localStorage.getItem(key)) return; } catch (e) {} }
    try { localStorage.setItem(key, '1'); } catch (e) {}

    const back = el('div', 'fh-modal-back');
    const box = el('div', 'fh-modal');

    const m = el('div', 'fh-modal-m');
    const v = tile(ANNOUNCE.media);
    v.src = ANNOUNCE.media.src; v.autoplay = true;
    m.appendChild(v);
    box.appendChild(m);

    const c = el('div', 'fh-modal-c');
    const x = el('button', 'fh-modal-x', '✕');
    const close = () => { back.remove(); document.body.style.overflow = ''; };
    x.onclick = close;
    c.appendChild(x);
    c.appendChild(el('span', 'fh-modal-tag', esc(ANNOUNCE.tag)));
    c.appendChild(el('h3', 'fh-modal-t', esc(ANNOUNCE.title).replace(/\n/g, '<br>')));
    c.appendChild(el('p', 'fh-modal-b', esc(ANNOUNCE.body)));
    const ul = el('ul', 'fh-modal-l');
    ANNOUNCE.bullets.forEach((b) => ul.appendChild(el('li', null, esc(b))));
    c.appendChild(ul);
    const go2 = el('button', 'fh-modal-cta', esc(ANNOUNCE.cta) + ' <span>↗</span>');
    go2.onclick = () => { close(); go(ANNOUNCE.go); };
    c.appendChild(go2);
    box.appendChild(c);

    back.appendChild(box);
    back.onclick = (e) => { if (e.target === back) close(); };
    document.addEventListener('keydown', function esckey(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esckey); }
    });
    document.body.appendChild(back);
    document.body.style.overflow = 'hidden';
  }

  function init() { render(); }
  window.FuseHome = { init, render, showModal, ANNOUNCE };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
