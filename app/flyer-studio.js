// ============================================================
// Flyer Studio — the locked-spec editor front end.
//
// Owns #view-flyer2 completely: the 3-step brief, the layer stage, the
// layers panel, and the per-layer AI actions. Self-contained on purpose —
// it talks to the backend over fetch and to the rest of the app only
// through window.FuseFlyer, so it can be rebuilt without touching app.js.
//
// WHY DOM AND NOT A CANVAS LIBRARY
// Text layers are real DOM text in the real webfont. That means what the
// user drags is literally the thing they will get, editing a headline is
// just editing text, and there is no second text-measuring implementation
// to drift out of sync with the server renderer. The exported PNG is always
// produced server-side from the same spec (flyer-spec-render), so the stage
// is a faithful preview rather than a competing source of truth.
//
// Geometry mirrors _flyer-render.js layoutSpec(): every x/y/w/h is a
// percentage of the canvas, and cap height is a percentage of canvas HEIGHT
// divided by 0.72 to get the em size. Those two constants have to match the
// server or the preview lies.
// ============================================================
(function () {
  const CAP_RATIO = 0.72; // cap height as a fraction of em — matches the renderer
  const ASPECTS = { '4:5': 2560 / 3200, '3:4': 2400 / 3200, '1:1': 1, '9:16': 1800 / 3200, '16:9': 3200 / 1800 };

  const state = {
    step: 'brief',        // brief -> materials -> inspiration -> editing
    projectId: null,
    brief: '',
    materials: [],        // {url,name} — the user's own assets
    inspiration: [],      // {url,name} — reference flyers, max 5
    spec: null,
    layerImages: {},
    selectedId: null,
    busy: false,
  };

  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };

  // fontId -> CSS family. Every id in the library is its Google Fonts name
  // lowercased and hyphenated, so this derivation covers all 117 without
  // shipping a lookup table the server already owns.
  function familyOf(fontId) {
    return String(fontId || 'anton').split('-').map((w) => (/^\d+$/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
  }
  const loadedFonts = new Set();
  function ensureFont(fontId) {
    if (!fontId || loadedFonts.has(fontId)) return;
    loadedFonts.add(fontId);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(familyOf(fontId)).replace(/%20/g, '+')}:wght@400;700;900&display=swap`;
    document.head.appendChild(link);
  }

  async function api(path, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (window.fuseAuthHeader) Object.assign(headers, await window.fuseAuthHeader());
    const res = await fetch('/api/' + path, { method: 'POST', headers, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  /** Poll a job until it finishes. Text jobs return .text, image jobs .url. */
  // 4.5 minutes of polling — just past the server's own 4-minute stall
  // ceiling, so the server always gets to fail the job with a real reason
  // before the client gives up with a generic one.
  async function pollJob(requestId, onTick) {
    for (let i = 0; i < 70; i++) {
      await new Promise((r) => setTimeout(r, i < 5 ? 1500 : 4000));
      // job-status is a GET that reads ?id= — posting a body to it returns
      // 400 "Missing id", which has no .status, which this loop would happily
      // treat as "still processing" and spin on until it timed out. That is
      // exactly what made a spec that had already finished look like it hung.
      const headers = {};
      if (window.fuseAuthHeader) Object.assign(headers, await window.fuseAuthHeader());
      const res = await fetch('/api/job-status?id=' + encodeURIComponent(requestId), { headers });
      const d = await res.json().catch(() => ({}));
      if (d.status === 'completed') return d;
      if (d.status === 'failed') throw new Error(d.error || 'That generation failed.');
      // Anything without a recognised status is an error, not progress —
      // never silently keep polling on a response we do not understand.
      if (!d.status) throw new Error(d.error || 'Lost contact with that job. Try again.');
      if (onTick) onTick(i);
    }
    throw new Error('That took too long. Try again.');
  }

  // app.js's toast() lives in module scope and is not on window, so relying on
  // it meant every error in this studio fell through to console.log and the
  // user just saw the screen quietly reset. Errors now go into the status bar
  // where they stay put until the next action.
  function toast(msg) { if (typeof window.toast === 'function') window.toast(msg); setStatus(msg, true); }

  function showError(e) {
    const msg = (e && e.message) || String(e || 'Something went wrong.');
    console.error('[flyer]', e);
    setStatus(msg, true);
  }

  // ---------------------------------------------------------------
  // STEP FLOW — one question at a time, each skippable except the first.
  // ---------------------------------------------------------------
  function renderSteps() {
    const wrap = $('fs-flow');
    if (!wrap) return;
    wrap.innerHTML = '';

    if (state.step === 'brief') {
      wrap.appendChild(el('div', 'fs-q', 'What do you want to create?'));
      wrap.appendChild(el('p', 'fs-hint', 'Say it the way you would to a designer — what it is for, who it is for, and anything that has to be on it.'));
      const ta = el('textarea', 'fs-input');
      ta.rows = 4;
      ta.placeholder = 'e.g. A flyer for my burger shop, Friday launch, triple patty, ₦4,500, open till late';
      ta.value = state.brief;
      wrap.appendChild(ta);
      const go = el('button', 'fs-btn', 'Next →');
      go.onclick = () => {
        const v = ta.value.trim();
        if (!v) { toast('Tell me what you want to make first.'); return; }
        state.brief = v; state.step = 'materials'; renderSteps();
      };
      wrap.appendChild(go);
      return;
    }

    if (state.step === 'materials') {
      wrap.appendChild(el('div', 'fs-q', 'Anything you want me to use?'));
      wrap.appendChild(el('p', 'fs-hint', 'A product photo, your logo, a headshot — whatever should actually appear on the flyer. If you have nothing, skip.'));
      wrap.appendChild(uploader('materials', 6));
      wrap.appendChild(navRow(() => { state.step = 'brief'; renderSteps(); }, () => { state.step = 'inspiration'; renderSteps(); }, state.materials.length ? 'Next →' : 'Skip →'));
      return;
    }

    if (state.step === 'inspiration') {
      wrap.appendChild(el('div', 'fs-q', 'Any flyers you like the look of?'));
      wrap.appendChild(el('p', 'fs-hint', 'Up to 5. I use these for layout and colour direction only — never to copy their content. Skip if you have none.'));
      wrap.appendChild(uploader('inspiration', 5));
      wrap.appendChild(navRow(() => { state.step = 'materials'; renderSteps(); }, startDesign, 'Design it →'));
      return;
    }
  }

  function navRow(onBack, onNext, nextLabel) {
    const row = el('div', 'fs-row');
    const back = el('button', 'fs-btn ghost', '← Back'); back.onclick = onBack;
    const next = el('button', 'fs-btn', nextLabel); next.onclick = onNext;
    row.appendChild(back); row.appendChild(next);
    return row;
  }

  function uploader(key, max) {
    const box = el('div', 'fs-up');
    const grid = el('div', 'fs-thumbs');
    state[key].forEach((m, i) => {
      const t = el('div', 'fs-thumb');
      t.style.backgroundImage = `url(${m.url})`;
      const x = el('button', 'fs-thumb-x', '×');
      x.onclick = () => { state[key].splice(i, 1); renderSteps(); };
      t.appendChild(x);
      grid.appendChild(t);
    });
    box.appendChild(grid);

    if (state[key].length < max) {
      const label = el('label', 'fs-drop', `<span>+ Add ${key === 'materials' ? 'a photo or logo' : 'an inspiration flyer'}</span>`);
      const input = el('input');
      input.type = 'file'; input.accept = 'image/*'; input.multiple = true; input.hidden = true;
      input.onchange = async () => {
        const files = Array.from(input.files || []).slice(0, max - state[key].length);
        for (const f of files) {
          try {
            const url = window.fuseUploadImage ? await window.fuseUploadImage(f) : await readAsDataUrl(f);
            state[key].push({ url, name: f.name });
          } catch (e) { toast('Could not upload ' + f.name); }
        }
        renderSteps();
      };
      label.appendChild(input);
      box.appendChild(label);
    }
    return box;
  }

  function readAsDataUrl(file) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
  }

  // ---------------------------------------------------------------
  // GENERATE THE SPEC
  // ---------------------------------------------------------------
  async function startDesign() {
    if (state.busy) return;
    state.busy = true;
    setStatus('Writing the design spec…');
    try {
      // Materials first, then inspiration — the order the spec's refIndex
      // counts in, and the order the user added them in each group.
      const refs = state.materials.concat(state.inspiration).map((m) => m.url);
      const sub = await api('flyer-spec', {
        brief: state.brief,
        project_id: state.projectId,
        reference_image_urls: refs,
        notes: state.materials.length
          ? `The first ${state.materials.length} attachment(s) are the user's own material and should appear on the flyer. Anything after that is inspiration for layout and palette only.`
          : '',
      });
      state.projectId = sub.project_id;
      const t0 = Date.now();
      const done = await pollJob(sub.request_id, () => {
        const secs = Math.round((Date.now() - t0) / 1000);
        setStatus(`Writing the design spec… ${secs}s (usually 30-90s)`);
      });

      setStatus('Checking the spec…');
      const saved = await api('flyer-spec-save', { project_id: state.projectId, raw: done.text });
      state.spec = saved.spec;
      state.layerImages = {};
      if (saved.problems && saved.problems.length) console.warn('[flyer-spec] repaired:', saved.problems);

      state.step = 'editing';
      renderAll();
      setStatus('');
      // Kick off every image layer at once — they are independent jobs.
      const imageLayers = state.spec.layers.filter((l) => l.type === 'image');
      if (imageLayers.length) {
        toast(`Generating ${imageLayers.length} image layer${imageLayers.length > 1 ? 's' : ''}…`);
        imageLayers.forEach((l) => generateLayer(l.id));
      }
    } catch (e) {
      showError(e);
    } finally { state.busy = false; renderSteps(); }
  }

  async function generateLayer(layerId, tweak) {
    const layer = state.spec && state.spec.layers.find((l) => l.id === layerId);
    if (!layer) return;
    layer._busy = true; renderStage(); renderLayers();
    try {
      const sub = await api('flyer-layer-image', { project_id: state.projectId, layer_id: layerId, tweak: tweak || '' });
      const done = await pollJob(sub.request_id);
      state.layerImages[layerId] = done.url;
    } catch (e) {
      showError(new Error(`${layer.name}: ${(e && e.message) || 'generation failed'}`));
    } finally {
      layer._busy = false; renderStage(); renderLayers();
    }
  }

  function setStatus(text, isError) {
    const s = $('fs-status');
    if (!s) return;
    s.textContent = text || '';
    s.style.display = text ? '' : 'none';
    s.classList.toggle('is-error', !!isError);
  }

  // ---------------------------------------------------------------
  // THE STAGE — spec rendered as positioned DOM, same geometry as the server
  // ---------------------------------------------------------------
  function renderStage() {
    const stage = $('fs-stage');
    if (!stage || !state.spec) return;
    const spec = state.spec;
    const ratio = ASPECTS[spec.aspect] || 0.8;

    // Height is computed, not left to CSS aspect-ratio. Every text layer is
    // sized from the canvas height (capHeightPct), so if the stage's measured
    // height is wrong — a stale value on first paint, or any inherited height
    // rule further up the page — the whole preview is silently mis-scaled and
    // stops matching the server render. Deriving it from the wrapper width and
    // the spec's own ratio makes the geometry independent of the stylesheet.
    const wrapWidth = (stage.parentElement && stage.parentElement.clientWidth) || stage.clientWidth || 600;
    const W = Math.max(1, wrapWidth - 24); // wrapper padding
    const H = Math.round(W / ratio);
    stage.style.width = W + 'px';
    stage.style.height = H + 'px';
    stage.style.background = (spec.palette && spec.palette[0] && spec.palette[0].hex) || '#111';
    stage.innerHTML = '';
    const fontsByRole = new Map((spec.fonts || []).map((f) => [f.role, f]));

    spec.layers.forEach((layer) => {
      if (layer.hidden) return;
      const node = el('div', 'fs-layer');
      node.dataset.id = layer.id;
      node.style.left = layer.x + '%';
      node.style.top = layer.y + '%';
      node.style.width = layer.w + '%';
      if (layer.h != null) node.style.height = layer.h + '%';

      if (layer.type === 'fill') {
        node.style.background = layer.hex || '#000';
        if (layer.radius) node.style.borderRadius = layer.radius + '%';
      } else if (layer.type === 'image') {
        const url = state.layerImages[layer.id];
        if (url) {
          node.style.backgroundImage = `url(${url})`;
          node.style.backgroundSize = 'contain';
          node.style.backgroundRepeat = 'no-repeat';
          node.style.backgroundPosition = 'center';
        } else {
          node.classList.add('fs-layer-empty');
          node.innerHTML = `<span>${layer._busy ? 'Generating…' : layer.name}</span>`;
        }
      } else if (layer.type === 'text') {
        const font = fontsByRole.get(layer.font) || (spec.fonts || [])[0] || {};
        ensureFont(font.fontId);
        const fontPx = ((layer.capHeightPct / 100) * H) / CAP_RATIO;
        node.style.color = layer.hex || '#fff';
        node.style.fontFamily = `"${familyOf(font.fontId)}", sans-serif`;
        node.style.fontSize = fontPx + 'px';
        node.style.lineHeight = String(font.leading != null ? font.leading : 0.95);
        node.style.letterSpacing = ((font.tracking != null ? font.tracking : -0.02)) + 'em';
        node.style.textAlign = layer.align || 'left';
        node.style.textTransform = font.case === 'upper' ? 'uppercase' : font.case === 'lower' ? 'lowercase' : 'none';
        node.style.fontWeight = String(font.weight || 400);
        if (layer.rotate) node.style.transform = `rotate(${layer.rotate}deg)`;
        node.textContent = layer.text || '';
      }

      if (layer.id === state.selectedId) node.classList.add('is-selected');
      node.onpointerdown = (ev) => beginDrag(ev, layer, stage);
      stage.appendChild(node);
    });
  }

  /** Select on press; drag moves the layer. Percentages in and out, so a
   *  drag on a small preview lands identically on the 3200px export. */
  function beginDrag(ev, layer, stage) {
    ev.preventDefault();
    select(layer.id);
    const rect = stage.getBoundingClientRect();
    const startX = ev.clientX, startY = ev.clientY;
    const ox = layer.x, oy = layer.y;
    let moved = false;

    const move = (e) => {
      const dx = ((e.clientX - startX) / rect.width) * 100;
      const dy = ((e.clientY - startY) / rect.height) * 100;
      if (Math.abs(dx) > 0.2 || Math.abs(dy) > 0.2) moved = true;
      layer.x = Math.round((ox + dx) * 10) / 10;
      layer.y = Math.round((oy + dy) * 10) / 10;
      renderStage();
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (moved) saveSpec();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  function select(id) {
    state.selectedId = id;
    renderStage(); renderLayers(); renderInspector();
  }

  // ---------------------------------------------------------------
  // LAYERS PANEL — topmost layer first, the way a layers panel reads
  // ---------------------------------------------------------------
  function renderLayers() {
    const panel = $('fs-layers');
    if (!panel || !state.spec) return;
    panel.innerHTML = '';
    const ordered = state.spec.layers.slice().reverse();
    ordered.forEach((layer) => {
      const row = el('div', 'fs-lrow' + (layer.id === state.selectedId ? ' is-selected' : ''));
      const icon = layer.type === 'text' ? 'A' : layer.type === 'image' ? '▣' : '■';
      const swatch = layer.type === 'fill' && layer.hex ? `style="background:${layer.hex}"` : '';
      row.innerHTML = `<span class="fs-lic" ${swatch}>${icon}</span><span class="fs-lname">${escapeHtml(layer.name)}</span>`;
      if (layer._busy) row.appendChild(el('span', 'fs-lbusy', '…'));
      const eye = el('button', 'fs-leye' + (layer.hidden ? ' off' : ''), layer.hidden ? '◌' : '◉');
      eye.title = layer.hidden ? 'Show layer' : 'Hide layer';
      eye.onclick = (e) => { e.stopPropagation(); layer.hidden = !layer.hidden; renderStage(); renderLayers(); saveSpec(); };
      row.appendChild(eye);
      row.onclick = () => select(layer.id);
      panel.appendChild(row);
    });
  }

  function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  // ---------------------------------------------------------------
  // INSPECTOR — what you can do to the selected layer
  // ---------------------------------------------------------------
  function renderInspector() {
    const box = $('fs-inspector');
    if (!box) return;
    const layer = state.spec && state.spec.layers.find((l) => l.id === state.selectedId);
    if (!layer) { box.innerHTML = '<p class="fs-hint">Tap any layer to edit it.</p>'; return; }

    box.innerHTML = '';
    box.appendChild(el('div', 'fs-iname', escapeHtml(layer.name)));

    if (layer.type === 'text') {
      const ta = el('textarea', 'fs-input small');
      ta.rows = 2; ta.value = layer.text || '';
      ta.oninput = () => { layer.text = ta.value; renderStage(); };
      ta.onblur = saveSpec;
      box.appendChild(field('Words', ta));

      const fontSel = el('select', 'fs-input small');
      (state.spec.fonts || []).forEach((f) => {
        const o = el('option', null, `${f.role} — ${familyOf(f.fontId)}`);
        o.value = f.role; if (f.role === layer.font) o.selected = true;
        fontSel.appendChild(o);
      });
      fontSel.onchange = () => { layer.font = fontSel.value; renderStage(); saveSpec(); };
      box.appendChild(field('Font', fontSel));

      box.appendChild(field('Size', rangeInput(layer.capHeightPct, 0.5, 25, 0.1, (v) => { layer.capHeightPct = v; renderStage(); }, saveSpec)));
      box.appendChild(field('Colour', paletteRow(layer)));
    }

    if (layer.type === 'fill') {
      box.appendChild(field('Colour', paletteRow(layer)));
      box.appendChild(field('Width', rangeInput(layer.w, 1, 140, 0.5, (v) => { layer.w = v; renderStage(); }, saveSpec)));
      box.appendChild(field('Height', rangeInput(layer.h, 1, 140, 0.5, (v) => { layer.h = v; renderStage(); }, saveSpec)));
    }

    if (layer.type === 'image') {
      const again = el('button', 'fs-btn small', layer._busy ? 'Generating…' : '↻ Regenerate this layer');
      again.disabled = !!layer._busy;
      again.onclick = () => generateLayer(layer.id);
      box.appendChild(again);
      box.appendChild(el('p', 'fs-hint', 'Or describe a change below and only this layer is remade.'));
    }
  }

  function field(label, control) {
    const f = el('div', 'fs-field');
    f.appendChild(el('label', null, label));
    f.appendChild(control);
    return f;
  }

  function rangeInput(value, min, max, step, oninput, onchange) {
    const r = el('input', 'fs-range');
    r.type = 'range'; r.min = min; r.max = max; r.step = step; r.value = value;
    r.oninput = () => oninput(Number(r.value));
    r.onchange = onchange;
    return r;
  }

  function paletteRow(layer) {
    const row = el('div', 'fs-swatches');
    (state.spec.palette || []).forEach((p) => {
      const s = el('button', 'fs-sw' + (layer.hex === p.hex ? ' is-on' : ''));
      s.style.background = p.hex; s.title = `${p.name} ${p.hex}`;
      s.onclick = () => { layer.hex = p.hex; renderStage(); renderLayers(); renderInspector(); saveSpec(); };
      row.appendChild(s);
    });
    return row;
  }

  // ---------------------------------------------------------------
  // THE PROMPT BAR — the interaction from the reference video: a layer is
  // selected, you type a change, only that layer is remade.
  // ---------------------------------------------------------------
  function wirePromptBar() {
    const input = $('fs-prompt');
    const send = $('fs-send');
    if (!input || !send) return;
    const run = () => {
      const text = input.value.trim();
      if (!text) return;
      const layer = state.spec && state.spec.layers.find((l) => l.id === state.selectedId);
      if (!layer) { toast('Pick a layer first, then describe the change.'); return; }
      input.value = '';
      if (layer.type === 'image') {
        generateLayer(layer.id, text);
      } else {
        // For a text layer the fastest honest interpretation of "type a
        // change" is: that IS the new copy. No round trip, no waiting.
        layer.text = text;
        renderStage(); renderInspector(); saveSpec();
      }
    };
    send.onclick = run;
    input.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); run(); } };
  }

  // ---------------------------------------------------------------
  let saveTimer = null;
  function saveSpec() {
    if (!state.projectId || !state.spec) return;
    clearTimeout(saveTimer);
    // Debounced — a drag fires this on every pointerup and a slider on every
    // release; the editor should not post a spec per nudge.
    saveTimer = setTimeout(() => {
      api('flyer-spec-save', { project_id: state.projectId, spec: stripRuntime(state.spec) }).catch(() => {});
    }, 900);
  }
  /** Strip the _busy flags the UI hangs on layers before persisting. */
  function stripRuntime(spec) {
    return Object.assign({}, spec, { layers: spec.layers.map((l) => { const c = Object.assign({}, l); delete c._busy; return c; }) });
  }

  async function exportPng() {
    if (!state.projectId) return;
    setStatus('Rendering full size…');
    try {
      const d = await api('flyer-spec-render', { project_id: state.projectId, spec: stripRuntime(state.spec) });
      setStatus('');
      window.open(d.url, '_blank');
    } catch (e) { setStatus(''); toast(e.message || 'Could not export.'); }
  }

  function renderAll() {
    const flow = $('fs-flow'), editor = $('fs-editor');
    if (flow) flow.style.display = state.step === 'editing' ? 'none' : '';
    if (editor) editor.style.display = state.step === 'editing' ? '' : 'none';
    if (state.step === 'editing') { renderStage(); renderLayers(); renderInspector(); }
    else renderSteps();
  }

  function reset() {
    state.step = 'brief'; state.projectId = null; state.brief = '';
    state.materials = []; state.inspiration = []; state.spec = null;
    state.layerImages = {}; state.selectedId = null;
    renderAll();
  }

  function init() {
    if (!$('fs-flow')) return;
    wirePromptBar();
    const ex = $('fs-export'); if (ex) ex.onclick = exportPng;
    const nw = $('fs-new'); if (nw) nw.onclick = reset;
    renderAll();
    window.addEventListener('resize', () => { if (state.step === 'editing') renderStage(); });
  }

  window.FuseFlyer = { init, reset, state };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
