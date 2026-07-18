#!/usr/bin/env node
// Regenerates netlify/functions/_lesson-access.js from app/course.js.
// Run this any time course.js changes (new modules, new lessons, a pillar's
// tier changes) so the server-side access-gate map for lesson-video.js
// stays in sync with what the client actually shows. course.js is a plain
// `window.FUSE_COURSE = {...}` JSON literal, not an ES module, so this just
// strips the assignment and JSON.parses the rest -- no bundler needed.
const fs = require('fs');
const path = require('path');

const COURSE_PATH = path.join(__dirname, '..', 'app', 'course.js');
const OUT_PATH = path.join(__dirname, '..', 'netlify', 'functions', '_lesson-access.js');
const TIER_RANK = { starter: 1, creator: 2, empire: 3 };

let src = fs.readFileSync(COURSE_PATH, 'utf8');
const marker = 'window.FUSE_COURSE = ';
const start = src.indexOf(marker);
if (start === -1) throw new Error('Could not find "window.FUSE_COURSE = " in course.js');
src = src.slice(start + marker.length).replace(/;\s*$/, '');
const data = JSON.parse(src);

const map = {};
data.pillars.forEach((p) => {
  // Orientation is deliberately free for everyone regardless of its nominal
  // pillar.tier value -- mirrors the `if (pillarKey === 'orient') return true`
  // special-case in app.js's moduleUnlocked().
  const tier = p.key === 'orient' ? 0 : (TIER_RANK[p.tier] || 1);
  p.modules.forEach((m) => {
    m.lessons.forEach((l) => { map[l.key] = { tier, module: m.key }; });
  });
});

const out = `// AUTO-GENERATED from app/course.js -- do not hand-edit.
// Regenerate with: node scripts/gen-lesson-access.js
// lesson_key -> { tier: 0|1|2|3 (0 = free/orientation), module: moduleKey }
// tier matches app.js TIER_RANK: starter=1, creator=2, empire=3.
module.exports = ${JSON.stringify(map, null, 1)};
`;
fs.writeFileSync(OUT_PATH, out);
console.log(`wrote ${Object.keys(map).length} lesson entries -> ${path.relative(process.cwd(), OUT_PATH)}`);
