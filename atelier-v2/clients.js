document.documentElement.classList.add("client-finder-page");
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id),
    sb = window.supabase.createClient(
      "https://rgbweaimkcndjznlazho.supabase.co",
      "sb_publishable_S3IEOR8vkWkXEdGtx8fGjw_nH8c4fV3",
      { auth: { persistSession: true } },
    ),
    state = { rows: [], step: 1, count: 5, active: null };
  const COSTS = { 2: 10, 5: 22, 10: 40, 15: 56, 20: 70 };
  let timer;
  const esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const toast = (m, b = false) => {
      const e = $("toast");
      e.textContent = m;
      e.className = "toast show" + (b ? " bad" : "");
      clearTimeout(timer);
      timer = setTimeout(() => (e.className = "toast"), 3300);
    },
    modal = (id) => $(id).classList.add("open"),
    close = (id) => $(id).classList.remove("open");
  async function boot() {
    const { data } = await sb.auth.getSession();
    if (!data.session) {
      location.href = "/atelier-v2/home.html";
      return;
    }
    await load();
  }
  async function load() {
    const { data, error } = await sb
      .from("client_prospects")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) return toast(error.message, true);
    state.rows = data || [];
    render();
  }
  function render() {
    const r = state.rows,
      n = (k) => r.filter((x) => x.status === k).length;
    $("mReady").textContent = n("research_ready") + n("qualified");
    $("mReplies").textContent = n("replied") + n("brief_ready");
    $("mBriefs").textContent = n("brief_ready");
    $("mWon").textContent = n("won");
    $("count").textContent =
      `${r.length} opportunity${r.length === 1 ? "" : "ies"}`;
    const root = $("prospects");
    if (!r.length) {
      root.innerHTML =
        '<div class="empty"><b>Your board is ready.</b><br>Start a focused research batch instead of adding 50 random names.</div>';
      return;
    }
    root.innerHTML = r
      .map(
        (x) =>
          `<article class="prospect"><div><h3>${esc(x.brand_name)}</h3><div class="sub">${esc([x.niche, x.location, x.service].filter(Boolean).join(" · "))}</div><div class="chips"><span class="chip signal">${esc(x.signals?.[0]?.type || x.source || "Manual prospect")}</span><span class="chip">${esc((x.status || "new").replaceAll("_", " "))}</span></div><div class="problem">${esc(x.visible_problem || "Open the opportunity to add a verified gap.")}</div></div><div class="card-actions"><button class="small" data-open="${x.id}">Open</button>${["research_ready", "qualified", "pitched"].includes(x.status) ? `<button class="small hot" data-reply="${x.id}">Client replied</button>` : ""}</div></article>`,
      )
      .join("");
    root
      .querySelectorAll("[data-open]")
      .forEach((b) => (b.onclick = () => openDetail(b.dataset.open)));
    root.querySelectorAll("[data-reply]").forEach(
      (b) =>
        (b.onclick = () => {
          state.active = state.rows.find((x) => x.id === b.dataset.reply);
          $("replyText").value = "";
          $("replyNotes").value = "";
          modal("replyModal");
        }),
    );
  }
  function recommendation() {
    const s = $("skill").value.toLowerCase(),
      n = $("niche").value.toLowerCase();
    let m =
      "Start with English-speaking markets where your offer is easy to explain.";
    if (/ugc|video|ads/.test(s))
      m =
        "Try United States, United Kingdom, Canada and Australia. Focus on products promoting a launch.";
    if (/landing|web/.test(s))
      m =
        "Try United Kingdom, United States and Canada. Focus on brands driving traffic to a weak or unclear page.";
    if (/design|flyer/.test(s) || /event/.test(n))
      m =
        "Try United Kingdom, United States and Canada. Focus on active events and offer-driven local brands.";
    $("marketSuggestion").textContent = m;
    const offer = $("offerTitle");
    const price = $("offerPrice");
    if (!offer.value.trim()) {
      offer.value = /landing|web/.test(s)
        ? "Conversion landing page refresh"
        : /ugc|video|ads/.test(s)
          ? "3 short-form ad concepts for your next campaign"
          : /design|flyer/.test(s)
            ? "Campaign visual pack for your next promotion"
            : "Client-ready creative growth pack";
    }
    if (!price.value) price.value = /landing|web/.test(s) ? "350" : /ugc|video|ads/.test(s) ? "300" : "200";
  }
  function step(n) {
    state.step = n;
    document
      .querySelectorAll(".step")
      .forEach((e) => e.classList.toggle("active", +e.dataset.step === n));
    $("backStep").style.visibility = n === 1 ? "hidden" : "visible";
    $("nextStep").textContent =
      n === 3
        ? `Find opportunities · ${COSTS[state.count]} credits`
        : "Continue →";
    $("wizardTitle").textContent =
      n === 1
        ? "Set your direction"
        : n === 2
          ? "Price the outcome"
          : "Choose your batch";
  }
  function pitch(label, text) {
    return text
      ? `<div class="detail-label">${label}<button class="small copy" data-copy="${encodeURIComponent(text)}">Copy</button></div><div class="detail-text">${esc(text)}</div>`
      : "";
  }
  function details(x) {
    const evidence =
      (x.evidence || [])
        .map(
          (e) =>
            `<p class="detail-text"><a href="${esc(e.url)}" target="_blank" rel="noopener" style="color:#baff63">Source: ${esc(e.title || e.url)}</a><br>${esc(e.observation || "")}</p>`,
        )
        .join("") || '<p class="detail-text">No source saved yet.</p>';
    const c = Array.isArray(x.contact_details) ? (x.contact_details[0] || {}) : (x.contact_details || {});
    const emails = (c.emails || []).map((e) => `<a href="mailto:${esc(e)}" style="color:#baff63">${esc(e)}</a>`).join(" · ");
    const socials = (c.socials || []).map((s) => `<a href="${esc(s.url || s)}" target="_blank" rel="noopener" style="color:#baff63">${esc(s.platform || "Social profile")}</a>`).join(" · ");
    const contact = emails || socials || c.founder_hint ? `<div class="detail-label">CONTACT EVIDENCE <span class="sub">Verify before sending</span></div><div class="detail-text">${c.founder_hint ? `<b>${esc(c.founder_hint)}</b><br>` : ""}${emails ? `Email: ${emails}<br>` : ""}${socials ? `Socials: ${socials}` : ""}</div>` : "";
    return `${contact}<div class="detail-label">OBSERVED GAP</div><div class="detail-text">${esc(x.visible_problem || "")}</div><div class="detail-label">WHY NOW</div><div class="detail-text">${esc(x.research_summary || "")}</div><div class="detail-label">EVIDENCE</div>${evidence}${pitch("EMAIL PITCH", x.pitch_email)}${pitch("WHATSAPP PITCH", x.pitch_whatsapp)}${pitch("INSTAGRAM DM", x.pitch_instagram)}${x.sample_brief ? `<div class="detail-label">SAMPLE BRIEF</div><div class="detail-text">${esc(JSON.stringify(x.sample_brief, null, 2))}</div>${pitch("OFFER COPY", x.proposal_copy)}` : ""}<div class="wizard-footer"><button class="secondary" data-status="pitched">Mark pitch sent</button><button class="primary" data-reply-now>Client replied</button><button class="secondary" data-review-now>Request personal review</button></div>`;
  }
  function openDetail(id) {
    state.active = state.rows.find((x) => x.id === id);
    if (!state.active) return;
    $("dBrand").textContent = state.active.brand_name;
    $("dMeta").textContent = [
      state.active.niche,
      state.active.location,
      state.active.website,
    ]
      .filter(Boolean)
      .join(" · ");
    $("dBody").innerHTML = details(state.active);
    $("dBody")
      .querySelectorAll("[data-copy]")
      .forEach(
        (b) =>
          (b.onclick = async () => {
            await navigator.clipboard.writeText(
              decodeURIComponent(b.dataset.copy),
            );
            toast("Copied. Personalize the first line before sending.");
          }),
      );
    $("dBody").querySelector("[data-status]").onclick = () =>
      setStatus("pitched");
    $("dBody").querySelector("[data-reply-now]").onclick = () => {
      close("detailModal");
      $("replyText").value = "";
      $("replyNotes").value = "";
      modal("replyModal");
    };
    $("dBody").querySelector("[data-review-now]").onclick = () => {
      close("detailModal");
      $("reviewQuestion").value = "";
      $("reviewContext").value = "";
      modal("reviewModal");
    };
    modal("detailModal");
  }
  async function setStatus(status) {
    const { data, error } = await sb
      .from("client_prospects")
      .update({
        status,
        next_follow_up:
          status === "pitched"
            ? new Date(Date.now() + 3 * 864e5).toISOString()
            : null,
      })
      .eq("id", state.active.id)
      .select()
      .single();
    if (error) return toast(error.message, true);
    state.active = data;
    state.rows = state.rows.map((x) => (x.id === data.id ? data : x));
    render();
    close("detailModal");
    toast("Saved to your pipeline.");
  }
  async function startResearch() {
    const skill = $("skill").value.trim(),
      niche = $("niche").value.trim(),
      locations = $("locations")
        .value.split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      signals = [...document.querySelectorAll('input[name="researchSignal"]:checked')].map((x) => x.value),
      offer = {
        title: $("offerTitle").value.trim(),
        price: $("offerPrice").value,
        currency: $("currency").value,
      };
    if (state.step === 1) {
      if (!skill || !niche || !locations.length)
        return toast("Add your skill, niche and at least one location.", true);
      return step(2);
    }
    if (state.step === 2) {
      if (!offer.title)
        return toast("Name the outcome you want to sell.", true);
      return step(3);
    }
    const b = $("nextStep");
    b.disabled = true;
    b.textContent = "Researching evidence…";
    try {
      const result = await window.Fuse.api("clients-research", {
        requested_count: state.count,
        skill,
        niche,
        locations,
        signals,
        offer,
        portfolio_url: $("portfolio").value.trim(),
      });
      state.rows = [...(result.prospects || []), ...state.rows];
      render();
      close("finderModal");
      window.Fuse.balance().catch(() => {});
      toast(`${result.prospects.length} evidence-backed opportunities added.`);
    } catch (e) {
      toast(e.message || "Research could not start.", true);
    } finally {
      b.disabled = false;
      step(3);
    }
  }
  async function makeBrief() {
    if (!state.active) return;
    const reply = $("replyText").value.trim();
    if (!reply) return toast("Paste what the client said first.", true);
    const b = $("makeBrief");
    b.disabled = true;
    b.textContent = "Building brief…";
    try {
      const result = await window.Fuse.api("client-brief", {
        prospect_id: state.active.id,
        reply,
        notes: $("replyNotes").value.trim(),
      });
      state.active = result.prospect;
      state.rows = state.rows.map((x) =>
        x.id === result.prospect.id ? result.prospect : x,
      );
      render();
      close("replyModal");
      openDetail(result.prospect.id);
      toast("Sample brief is ready. Create it only for this interested lead.");
    } catch (e) {
      toast(e.message || "Could not make brief.", true);
    } finally {
      b.disabled = false;
      b.textContent = "Create sample brief →";
    }
  }
  async function requestReview() {
    if (!state.active) return;
    const question = $("reviewQuestion").value.trim();
    if (!question) return toast("Tell Maryam what you want reviewed first.", true);
    const b = $("requestReview");
    b.disabled = true;
    b.textContent = "Sending request…";
    try {
      const { data: sessionData } = await sb.auth.getSession();
      const { error } = await sb.from("client_review_requests").insert({
        user_id: sessionData.session?.user?.id,
        prospect_id: state.active.id,
        reply_context: state.active.reply_text || "No client reply saved yet.",
        student_notes: `${question}\n\n${$("reviewContext").value.trim()}`,
      });
      if (error) throw error;
      close("reviewModal");
      toast("Personal review requested for this prospect.");
    } catch (e) {
      toast(e.message || "Could not request a review.", true);
    } finally {
      b.disabled = false;
      b.textContent = "Request personal review →";
    }
  }
  $("startFinder").onclick = () => {
    step(1);
    modal("finderModal");
  };
  $("nextStep").onclick = startResearch;
  $("backStep").onclick = () => step(Math.max(1, state.step - 1));
  $("skill").oninput = recommendation;
  $("niche").oninput = recommendation;
  document
    .querySelectorAll("[data-close]")
    .forEach((b) => (b.onclick = () => close(b.dataset.close)));
  $("counts").onclick = (e) => {
    const b = e.target.closest("[data-count]");
    if (!b) return;
    state.count = +b.dataset.count;
    document
      .querySelectorAll("[data-count]")
      .forEach((x) => x.classList.toggle("active", x === b));
    $("costText").textContent = `${COSTS[state.count]} credits`;
    if (state.step === 3)
      $("nextStep").textContent =
        `Find opportunities · ${COSTS[state.count]} credits`;
  };
  $("makeBrief").onclick = makeBrief;
  $("requestReview").onclick = requestReview;
  document.querySelectorAll(".modal").forEach(
    (m) =>
      (m.onclick = (e) => {
        if (e.target === m) close(m.id);
      }),
  );
  boot();
})();
