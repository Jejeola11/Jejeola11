// ============================================================
// Fuse Academy — the course dashboard and reader.
//
// Owns #view-academy. Two screens:
//   DASHBOARD  — "My Courses" + a card per product, owned or locked.
//   READER     — sidebar of topics on the left, lesson on the right.
//
// Self-contained like flyer-studio.js: it reads window.FUSE_COURSE for
// lesson content and talks to the app only through window.FuseAcademy, so the
// 4,000-line app.js does not have to be touched to change how courses look.
//
// PRODUCTS vs PILLARS — worth understanding before editing CATALOGUE below.
// A pillar (see course.js) is a skill track: Design & Flyers, AI Videos &
// UGC, and so on. A PRODUCT is a thing someone buys. "The First Client" is
// one product that contains every pillar; "AI Videos & UGC" also appears as
// its own card because it is the piece people ask for by name. Both open the
// same underlying lessons — a card is a doorway, not a copy.
// ============================================================
(function () {
  const WA = '2349044558101';

  // The dashboard, as data. Order here is order on screen.
  //   unlockKey : module_unlocks row that grants it (null = always locked/CTA)
  //   pillars   : which course.js tracks this product opens ('*' = all)
  //   price     : shown on the locked CTA
  const CATALOGUE = [
    {
      id: 'first-client', name: 'The First Client',
      desc: 'Learn one AI skill today, make a real sample, and get your first paying client inside 7 days.',
      unlockKey: 'atelier-lane-a', pillars: '*', accent: '#A9FF67', price: 5000,
    },
    {
      id: 'lane-b', name: 'Lane B — The Client Offer Engine',
      desc: 'Turn the skill into one fixed-price offer, put it on a page, and run ads so clients come to you.',
      unlockKey: 'atelier-lane-b', pillars: [], accent: '#F4DB5E', price: 7500,
      note: 'Needs about ₦20,000 of ad budget to run.',
    },
    {
      id: 'openers-50', name: '50 Client Magnet Openers',
      desc: 'Every message that has actually got a reply, sorted by niche — plus PitchPilot to write yours.',
      unlockKey: 'atelier-openers', pillars: [], accent: '#7FD8FF', price: 5000,
    },
    {
      id: 'ai-ugc', name: 'AI Videos & UGC',
      desc: 'Ads and product films with no camera and no studio. Included with The First Client.',
      unlockKey: 'atelier-lane-a', pillars: ['video'], accent: '#FF9BE1', price: 5000,
    },
    {
      id: 'dollar-lane', name: 'The Dollar Lane',
      desc: 'List the same work where foreign buyers already spend, and charge five to ten times more.',
      unlockKey: 'atelier-dollar-lane', pillars: [], accent: '#FFB36B', price: 150000,
      note: 'Opens after Lane B.',
    },
    {
      id: 'install', name: 'The Install',
      desc: 'I build your catalogue, portfolio, sales page and campaigns. You fund the ads and deliver.',
      unlockKey: 'atelier-install', pillars: [], accent: '#C9A0FF', price: 500000,
      note: '3 places a month.',
    },
  ];

  const state = { screen: 'dashboard', productId: null, lessonKey: null, navOpen: false };
  const $ = (id) => document.getElementById(id);
  const el = (t, c, h) => { const n = document.createElement(t); if (c) n.className = c; if (h != null) n.innerHTML = h; return n; };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const naira = (n) => '₦' + Number(n).toLocaleString('en-NG');

  function unlocks() { return (window.fuseCourseUnlocks && window.fuseCourseUnlocks()) || new Set(); }
  function isAdmin() { return !!(window.fuseIsAdmin && window.fuseIsAdmin()); }
  function owns(p) { return isAdmin() || (p.unlockKey && unlocks().has(p.unlockKey)); }
  function firstName() {
    const n = (window.fuseUserName && window.fuseUserName()) || '';
    return (n.split(' ')[0] || n || 'there').trim();
  }

  /** Pillars this product opens, resolved against the live course data. */
  function pillarsFor(p) {
    const all = (window.FUSE_COURSE && window.FUSE_COURSE.pillars) || [];
    if (p.pillars === '*') return all;
    return all.filter((x) => (p.pillars || []).includes(x.key));
  }

  function lessonCount(p) {
    return pillarsFor(p).reduce((n, pil) => n + pil.modules.reduce((m, mod) => m + mod.lessons.length, 0), 0);
  }

  // ---------------------------------------------------------------
  // DASHBOARD
  // ---------------------------------------------------------------
  function renderDashboard() {
    const root = $('ac-root');
    if (!root) return;
    root.innerHTML = '';
    root.className = 'ac-dash';

    const head = el('div', 'ac-head');
    head.appendChild(el('h1', null, 'My Courses'));
    head.appendChild(el('p', 'ac-sub', `Welcome back, ${esc(firstName())}! Select a course to continue.`));
    root.appendChild(head);

    const grid = el('div', 'ac-grid');
    CATALOGUE.forEach((p) => {
      const owned = owns(p);
      const n = lessonCount(p);
      const card = el('article', 'ac-card' + (owned ? '' : ' is-locked'));

      const art = el('div', 'ac-art');
      art.style.background = `linear-gradient(140deg, ${p.accent}33, ${p.accent}0d 60%, transparent)`;
      art.appendChild(el('span', 'ac-art-mark', owned ? '▦' : '🔒'));
      card.appendChild(art);

      const body = el('div', 'ac-body');
      body.appendChild(el('h3', null, esc(p.name)));
      body.appendChild(el('p', 'ac-desc', esc(p.desc)));
      if (owned && n) body.appendChild(el('p', 'ac-meta', `${n} lesson${n === 1 ? '' : 's'}`));
      else if (p.note) body.appendChild(el('p', 'ac-meta', esc(p.note)));

      if (owned && n) {
        const go = el('button', 'ac-go', 'Continue Learning <span>→</span>');
        go.onclick = () => openProduct(p.id);
        body.appendChild(go);
      } else if (owned) {
        // Owned but nothing to read yet — say so rather than opening an
        // empty reader, which reads as a broken product.
        body.appendChild(el('p', 'ac-soon', 'Lessons are being added — you already own this.'));
      } else {
        const buy = el('a', 'ac-buy', `Buy Now — ${naira(p.price)}`);
        const msg = `Hi Ria! I want to buy ${p.name} (${naira(p.price)}). Please send me the account details.`;
        buy.href = `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`;
        buy.target = '_blank'; buy.rel = 'noopener';
        body.appendChild(buy);
      }
      card.appendChild(body);
      grid.appendChild(card);
    });
    root.appendChild(grid);
  }

  // ---------------------------------------------------------------
  // READER — sidebar of topics left, lesson right (mirrors the reference)
  // ---------------------------------------------------------------
  function openProduct(id) {
    const p = CATALOGUE.find((x) => x.id === id);
    if (!p) return;
    state.screen = 'reader'; state.productId = id;
    const first = firstLesson(p);
    state.lessonKey = first && first.key;
    state.navOpen = false;
    renderReader();
    window.scrollTo(0, 0);
  }

  function firstLesson(p) {
    for (const pil of pillarsFor(p)) for (const m of pil.modules) if (m.lessons.length) return m.lessons[0];
    return null;
  }

  function findLesson(p, key) {
    for (const pil of pillarsFor(p)) for (const m of pil.modules) {
      const l = m.lessons.find((x) => x.key === key);
      if (l) return { lesson: l, module: m, pillar: pil };
    }
    return null;
  }

  function renderReader() {
    const root = $('ac-root');
    const p = CATALOGUE.find((x) => x.id === state.productId);
    if (!root || !p) return;
    root.innerHTML = '';
    root.className = 'ac-reader' + (state.navOpen ? ' nav-open' : '');

    // --- sidebar
    const side = el('aside', 'ac-side');
    const brand = el('div', 'ac-brand');
    brand.appendChild(el('span', 'ac-brand-n', esc(p.name)));
    side.appendChild(brand);

    const back = el('button', 'ac-side-link', '⌂ &nbsp;My Courses');
    back.onclick = () => { state.screen = 'dashboard'; renderDashboard(); };
    side.appendChild(back);

    pillarsFor(p).forEach((pil) => {
      side.appendChild(el('div', 'ac-side-h', esc(pil.name)));
      pil.modules.forEach((mod) => {
        side.appendChild(el('div', 'ac-side-mod', esc(mod.title)));
        mod.lessons.forEach((l) => {
          const row = el('button', 'ac-side-lesson' + (l.key === state.lessonKey ? ' is-on' : ''),
            `<span class="ac-n">${esc(l.n)}</span><span>${esc(l.title)}</span>`);
          row.onclick = () => { state.lessonKey = l.key; state.navOpen = false; renderReader(); window.scrollTo(0, 0); };
          side.appendChild(row);
        });
      });
    });
    root.appendChild(side);

    // --- content
    const main = el('main', 'ac-main');
    const bar = el('div', 'ac-bar');
    const burger = el('button', 'ac-burger', '☰ Topics');
    burger.onclick = () => { state.navOpen = !state.navOpen; renderReader(); };
    bar.appendChild(burger);
    bar.appendChild(el('span', 'ac-bar-t', esc(p.name)));
    main.appendChild(bar);

    const found = findLesson(p, state.lessonKey);
    if (!found) {
      main.appendChild(el('p', 'ac-empty', 'Pick a topic from the list to begin.'));
    } else {
      const { lesson, module } = found;
      main.appendChild(el('div', 'ac-crumb', esc(module.title)));
      main.appendChild(el('h1', 'ac-title', `${esc(lesson.n)} · ${esc(lesson.title)}`));

      // Video slot. 16:9 lessons are PC walkthroughs and get a wide frame;
      // everything else keeps the tighter default.
      if (lesson.video) {
        const wrap = el('div', 'ac-video' + (lesson.aspect === '16:9' ? ' wide' : ''));
        wrap.appendChild(el('div', 'ac-video-soon', 'Video coming soon'));
        main.appendChild(wrap);
        if (window.fuseLessonVideo) {
          window.fuseLessonVideo(lesson.key).then((url) => {
            if (!url || state.lessonKey !== lesson.key) return;
            wrap.innerHTML = `<iframe src="${embed(url)}" allow="autoplay; fullscreen; encrypted-media" allowfullscreen></iframe>`;
          }).catch(() => {});
        }
      }

      if (lesson.notes) {
        const notes = el('div', 'ac-notes');
        notes.innerHTML = lesson.notes;
        main.appendChild(notes);
      }
      main.appendChild(navButtons(p, lesson.key));
    }
    root.appendChild(main);

    // Tapping the dimmed content closes the drawer on mobile.
    const scrim = el('div', 'ac-scrim');
    scrim.onclick = () => { state.navOpen = false; renderReader(); };
    root.appendChild(scrim);
  }

  function embed(url) {
    if (/youtube|youtu\.be/.test(url)) {
      const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{6,})/);
      return `https://www.youtube-nocookie.com/embed/${m ? m[1] : ''}?rel=0&modestbranding=1&playsinline=1`;
    }
    if (/vimeo\.com/.test(url)) { const m = url.match(/vimeo\.com\/(\d+)/); return `https://player.vimeo.com/video/${m ? m[1] : ''}`; }
    return url;
  }

  /** Flat lesson order so Previous/Next can cross module and pillar
   *  boundaries — a reader that stops at the end of a module makes people
   *  think the course ended. */
  function flatLessons(p) {
    const out = [];
    pillarsFor(p).forEach((pil) => pil.modules.forEach((m) => m.lessons.forEach((l) => out.push(l))));
    return out;
  }

  function navButtons(p, key) {
    const all = flatLessons(p);
    const i = all.findIndex((l) => l.key === key);
    const row = el('div', 'ac-nav');
    if (i > 0) {
      const b = el('button', 'ac-nav-b', '← Previous');
      b.onclick = () => { state.lessonKey = all[i - 1].key; renderReader(); window.scrollTo(0, 0); };
      row.appendChild(b);
    }
    if (i > -1 && i < all.length - 1) {
      const b = el('button', 'ac-nav-b primary', 'Next lesson →');
      b.onclick = () => { state.lessonKey = all[i + 1].key; renderReader(); window.scrollTo(0, 0); };
      row.appendChild(b);
    }
    return row;
  }

  function render() { state.screen === 'reader' ? renderReader() : renderDashboard(); }
  function init() { if ($('ac-root')) render(); }

  window.FuseAcademy = { init, render, state, CATALOGUE };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
