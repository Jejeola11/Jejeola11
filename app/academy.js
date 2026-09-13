// Keep the core Fuse Atelier course surfaces on the exact same current curriculum as Academy V2/Admin.
(()=>{
'use strict';
if(window.__FUSE_CURRENT_CURRICULUM__) return;
window.__FUSE_CURRENT_CURRICULUM__=true;

const pillars=(window.FUSE_COURSE&&Array.isArray(window.FUSE_COURSE.pillars))?window.FUSE_COURSE.pillars:[];
const pillar=key=>pillars.find(p=>p&&p.key===key);
const oldLessons=course=>{
  const map=new Map();
  ((course&&course.modules)||[]).forEach(m=>((m&&m.lessons)||[]).forEach(l=>{if(l&&l.key)map.set(l.key,l)}));
  return map;
};
const cloneLesson=(map,key,title)=>Object.assign({},map.get(key)||{}, {key,n:'',title,video:true,aspect:'9:16'});
const simpleLesson=(key,title)=>({key,n:'',title,dur:'',video:true,aspect:'9:16'});

const design=pillar('design');
if(design){
  const old=oldLessons(design);
  design.name='Design & Flyers';
  design.sub='Skill 1 · Design & Flyers';
  design.modules=[
    {key:'flyer-m1',title:'Module 1',lessons:[
      cloneLesson(old,'flyer-1_1','Module 1.1 - The Four Rules That Makes Anything Designed'),
      cloneLesson(old,'flyer-1_2',"Module 1.2 - Color That Doesn't Fight Itself"),
      cloneLesson(old,'flyer-1_3',"Module 1.3 - Typography That Doesn't Look Homemade"),
      cloneLesson(old,'flyer-1_4','Module 1.4 Composition and Layout')
    ]},
    {key:'flyer-m2',title:'Module 2',lessons:[
      cloneLesson(old,'flyer-2_1','Module 2.1 - The 7 Layers Of a Working Flyer'),
      cloneLesson(old,'flyer-2_2','Module 2.2 - Flyer Types and Their Real Conventions'),
      cloneLesson(old,'flyer-2_3','Module 2.3 - Sizing and Platforms'),
      cloneLesson(old,'flyer-2_4','Module 2.4 - The Mistakes That Scream "Beginner"')
    ]},
    {key:'flyer-m3',title:'Module 3',lessons:[
      cloneLesson(old,'flyer-3_1','Module 3.1 - Research First: Building Your Reference Board'),
      cloneLesson(old,'flyer-3_2','Module 3.2 - Use Your References To Create Your First Flyer'),
      cloneLesson(old,'flyer-3_3','Module 3.3 - Create A Course Flyer'),
      cloneLesson(old,'flyer-3_4','Module 3.4 - The Final Polish on Lightroom')
    ]},
    {key:'flyer-m4',title:'Module 4',lessons:[
      cloneLesson(old,'flyer-4_1','Module 4.1 — THE METHOD'),
      cloneLesson(old,'flyer-4_3','Module 4.2 - Building This Instinct For Every New Niche')
    ]},
    {key:'flyer-m5',title:'Module 5',lessons:[
      cloneLesson(old,'flyer-5_1','Module 5.1 - Running The Real Client Conversation'),
      cloneLesson(old,'flyer-5_2','Module 5.2 - Revisions Without Scope Creep'),
      cloneLesson(old,'flyer-5_3','Module 5.3 - Delivery'),
      cloneLesson(old,'flyer-5_4','Module 5.4 - Every Job is a Portfolio Piece')
    ]},
    {key:'flyer-m6',title:'Module 6',lessons:[
      cloneLesson(old,'flyer-6_1','Module 6 - Your 5 Practice Briefs')
    ]}
  ];
}

const video=pillar('video');
if(video){
  video.name='AI UGC & Influencer';
  video.sub='Skill 2 · AI UGC & Influencer';
  video.modules=[
    {key:'aiv-m1',title:'Module 1',lessons:[simpleLesson('aiv-1_1','Module 1 - Start Here (Full Overview)')]},
    {key:'aiv-m2',title:'Module 2',lessons:[simpleLesson('aiv-2_1','Module 2: AI UGC & INFLUENCER')]},
    {key:'aiv-m3',title:'Module 3',lessons:[simpleLesson('aiv-3_1','Module 3 - Choose the Niche & Purpose of your AI Influencer')]},
    {key:'aiv-m4',title:'Module 4',lessons:[simpleLesson('aiv-4_1','Module 4 - Define the Character & Appearance')]},
    {key:'aiv-m5',title:'Module 5',lessons:[simpleLesson('aiv-5_1','Module 5 - Collect Reference Images')]},
    {key:'aiv-m6',title:'Module 6',lessons:[simpleLesson('aiv-6_1','Module 6 - Create the First Sample Imagess')]},
    {key:'aiv-m7',title:'Module 7',lessons:[simpleLesson('aiv-7_1','Module 7 - Choose Your Master Image')]},
    {key:'aiv-m8',title:'Module 8',lessons:[
      simpleLesson('aiv-8_1','Module 8.1 - Create your Model Sheet with Free Tools'),
      simpleLesson('aiv-8_2','Module 8.2 - Create Model Sheet With Fuse Studio')
    ]},
    {key:'aiv-m9',title:'Module 9',lessons:[simpleLesson('aiv-9_1','Module 9 - Build Character Consistency')]},
    {key:'aiv-m10',title:'Module 10',lessons:[simpleLesson('aiv-10_1','Module 10 - Create UGC - Product Images')]},
    {key:'aiv-m11',title:'Module 11',lessons:[simpleLesson('aiv-11_1','Module 11 - Generate Simple Influencer Videos')]},
    {key:'aiv-m12',title:'Module 12',lessons:[simpleLesson('aiv-12_1','Module 12 - Create Product Reveal Videos')]},
    {key:'aiv-m13',title:'Module 13',lessons:[simpleLesson('aiv-13_1','Module 13 - Setup The Instagram Account')]},
    {key:'aiv-m14',title:'Module 14',lessons:[simpleLesson('aiv-14_1','Module 14 - Mark AI Content Correctly')]},
    {key:'aiv-m15',title:'Module 15',lessons:[simpleLesson('aiv-15_1','Module 15 - Final Workflow Overview')]},
    {key:'aiv-m16',title:'Module 16',lessons:[simpleLesson('aiv-16_1','Module 16 - Portfolio Setup')]}
  ];
}

const landing=pillar('landing');
if(landing){
  landing.name='Landing Page Design';
  landing.sub='Skill 3 · Landing Page Design';
  landing.modules=[
    {key:'web-m1',title:'Module 1',lessons:[simpleLesson('web-1_1','Module 1 - Start Here')]},
    {key:'web-m2',title:'Module 2',lessons:[simpleLesson('web-2_1','Module 2 - Anatomy Of A Landing Page That Converts')]},
    {key:'web-m3-current',title:'Module 3',lessons:[simpleLesson('web-3_1-current','Module 3 - Choose Your Niche & Client Type')]},
    {key:'web-m4',title:'Module 4',lessons:[simpleLesson('web-4_1','Module 4 - Gather The Brief Before You Design')]},
    {key:'web-m5',title:'Module 5',lessons:[simpleLesson('web-5_1','Module 5 - Prompting Claude To Design A Landing Page')]},
    {key:'web-m6',title:'Module 6',lessons:[simpleLesson('web-6_1','Module 6 - Build Every Section One At A Time')]},
    {key:'web-m7',title:'Module 7',lessons:[simpleLesson('web-7_1','Module 7 - Design Principles That Make It Look Premium')]},
    {key:'web-m8',title:'Module 8',lessons:[simpleLesson('web-8_1','Module 8 - Copywriting That Actually Converts')]},
    {key:'web-m9',title:'Module 9',lessons:[simpleLesson('web-9_1','Module 9 - Deploy The Page & Hand It Off')]},
    {key:'web-m10',title:'Module 10',lessons:[simpleLesson('web-10_1','Module 10 - Sell This As A Service')]}
  ];
}

window.FUSE_ACADEMY_MONEY={
  key:'money',name:'The Money Engine System',sub:'Turn your skill into clients',
  resources:[{title:'Resources',desc:'Money Engine resources and supporting files.'}],
  modules:[
    {key:'money-start-module',title:'Start Here',lessons:[simpleLesson('money-start','1. Start Here - Understand The System First')]},
    {key:'money-m1-module',title:'Module 1',lessons:[simpleLesson('money-m1','Module 1 - How It Works')]},
    {key:'money-m2-module',title:'Module 2',lessons:[simpleLesson('money-m2','Module 2 - The 50 - Lead Hunt')]},
    {key:'money-m3-module',title:'Module 3',lessons:[simpleLesson('money-m3','Module 3 - Find The Problem')]},
    {key:'money-m4-module',title:'Module 4',lessons:[simpleLesson('money-m4','Module 4 - The Sample Engine')]},
    {key:'money-m5-module',title:'Module 5',lessons:[simpleLesson('money-m5','Module 5 - Pitch & Follow Up')]},
    {key:'money-m6-module',title:'Module 6',lessons:[simpleLesson('money-m6','Module 6 - Close The Deal')]}
  ]
};
})();

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
      id: 'ai-ugc', name: 'AI UGC & Influencer',
      desc: 'AI UGC, influencer content and product visuals with no traditional shoot. Included with The First Client.',
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

  function pillarsFor(p) {
    const all = (window.FUSE_COURSE && window.FUSE_COURSE.pillars) || [];
    if (p.pillars === '*') return all;
    return all.filter((x) => (p.pillars || []).includes(x.key));
  }

  function lessonCount(p) {
    return pillarsFor(p).reduce((n, pil) => n + pil.modules.reduce((m, mod) => m + mod.lessons.length, 0), 0);
  }

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
