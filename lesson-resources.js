/* lesson-resources.js - "send the notes + classified" for one lesson.
   Teacher Lesson Tracker only. Finds the topic's own PDFs in the site's
   book catalogues and sends them as FILES on WhatsApp (system share
   sheet), falling back to download + open the chat when the browser
   cannot share files.

   Catalogues (loaded on first use, never on the public pages):
     modular-v7-data.js       Modular V7 per-topic Student (classified
                               practice) + Notes + worked answers
     classified-books-data.js Linear 2026 classified per topic
     library-data.js          Linear visual notes per topic; IAL notes
                               with answers per topic (same order as the
                               tracker's topic list)
   Pure resolver (resolve) is exported for node tests. */
(function (root) {
  "use strict";

  const STOP = new Set(["and", "of", "the", "a", "an", "with", "to", "in", "y", "mx", "c", "using", "from"]);

  function norm(value) {
    return String(value || "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
  }

  function words(value) {
    return norm(value).split(" ").filter((w) => w && !STOP.has(w)).map((w) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w));
  }

  /* Tracker names that have no word overlap (or a misleading one) with
     the book title that actually teaches them. Keys and values are
     normalised titles. */
  const ALIASES = {
    "recurring decimals": ["fractions decimals and percentages"],
    "reverse percentages": ["percentage change and reverse percentages", "percentages"],
    "powers and roots": ["numerical indices and roots", "powers roots and standard form"],
    "standard form": ["standard form", "powers roots and standard form"],
    "linear equations": ["solving linear equations"],
    "inequalities solving and graphing": ["solving inequalities"],
    "quadratic formula": ["solving quadratic equations", "solving quadratics"],
    "quadratic equations": ["solving quadratic equations", "solving quadratics"],
    "linear graphs": ["linear graphs", "linear graphs y mx c"],
    "kinematic graphs": ["real life graphs"],
    "constructions and loci": ["bearings scale drawing and constructions"],
    "bearings": ["bearings scale drawing and constructions"],
    "congruent shapes": ["congruence similarity and geometrical proof"],
    "similar shapes": ["congruence similarity and geometrical proof"],
    "averages from frequency tables": ["statistical diagrams averages and spread", "statistics toolkit"],
    "statistics toolkit": ["statistical diagrams averages and spread", "statistics toolkit"],
    "tree diagrams and conditional probability": ["probability diagrams venn and tree diagrams", "venn and tree diagrams"],
    "algebra toolkit": ["algebraic notation and simplifying expressions", "algebra toolkit"],
    "standard and compound units": ["speed density and pressure", "measures time and conversions", "standard and compound units"],
    "graphs of functions": ["drawing and recognising function graphs", "graphical roots and intersections", "graphs of functions"],
    "perimeter and area": ["area and perimeter", "perimeter and area"],
    "circles arcs and sectors": ["circumference area arcs and sectors", "circles arcs and sectors"],
    "right angled triangles pythagoras and trigonometry": ["right angled triangles"],
    "sine and cosine rules": ["sine rule cosine rule and triangle area", "sine and cosine rules"],
    "angles in polygons and parallel lines": ["polygon angle sums and regular polygons", "angles lines triangles and quadrilaterals"],
    "differentiation and turning points": ["differentiation", "differentiation and turning points"],
    "prime factors hcf and lcm": ["prime factorisation hcf and lcm", "prime factors hcf and lcm"],
    "percentages": ["percentage change and reverse percentages", "percentage meaning and conversions", "percentages"],
    "forming and solving equations": ["forming and solving equations"],
    "rearranging formulae": ["rearranging formulas", "rearranging formulae"],
    "algebraic roots and indices": ["algebraic roots and indices"],
    "algebraic fractions": ["algebraic fractions"]
  };

  /* Best catalogue entry for a tracker topic name: alias first, then
     exact normalised title, then word overlap (>= 60% of the tracker
     name's words, and at least one shared word that is not generic). */
  function bestMatch(name, entries) {
    if (!entries || !entries.length) return null;
    const key = norm(name);
    const byNorm = new Map(entries.map((e) => [norm(e.title), e]));
    for (const alias of ALIASES[key] || []) {
      if (byNorm.has(alias)) return byNorm.get(alias);
    }
    if (byNorm.has(key)) return byNorm.get(key);
    const want = words(name);
    if (!want.length) return null;
    let best = null;
    let bestScore = 0;
    entries.forEach((entry) => {
      const have = new Set(words(entry.title));
      const shared = want.filter((w) => have.has(w)).length;
      const score = shared / want.length - have.size * 0.001;
      if (shared && score > bestScore) { best = entry; bestScore = score; }
    });
    return bestScore >= 0.6 ? best : null;
  }

  function fileFrom(entry, kind, label) {
    if (!entry || !entry.href) return null;
    return {
      kind,
      label,
      title: entry.title || "",
      href: entry.href,
      mb: Number(entry.mb || (entry.bytes ? entry.bytes / 1048576 : 0)) || 0,
      pages: Number(entry.pages || 0) || 0
    };
  }

  function v7Topics(catalogs, unit) {
    const course = catalogs.v7 && catalogs.v7[`unit${unit}`];
    return course ? course.chapters.flatMap((ch) => ch.topics || []) : [];
  }

  function linearNotes(catalogs) {
    const course = catalogs.library && catalogs.library.courses && catalogs.library.courses.linear;
    return course ? (course.notes.chapters || []).flatMap((ch) => ch.topics || []) : [];
  }

  function linearClassified(catalogs) {
    const course = catalogs.classified && catalogs.classified.courses && catalogs.classified.courses.linear;
    return course ? course.chapters.flatMap((ch) => ch.topics || []) : [];
  }

  function v7Files(entry) {
    if (!entry) return [];
    const notes = { ...entry, href: entry.href.replace(/_Student\.pdf$/, "_Notes.pdf"), mb: 0, bytes: 0, pages: 0 };
    return [
      fileFrom(notes, "notes", "Notes"),
      fileFrom(entry, "classified", "Classified practice"),
      entry.solutions ? fileFrom({ ...entry.solutions, title: entry.title }, "answers", "Worked answers") : null
    ].filter(Boolean);
  }

  /* resolve(courseId, topicName, catalogs, courseTopicNames)
     -> { matched: "title", files: [{kind,label,title,href,mb,pages}] } */
  function resolve(courseId, topicName, catalogs, courseTopicNames) {
    const name = String(topicName || "");
    const out = { matched: "", files: [] };
    const v7Id = /^V7\s+([A-Z0-9-]+)\s*·/.exec(name);
    const modular = /^modular-([12])$/.exec(courseId || "");
    if (modular) {
      const pool = v7Topics(catalogs, modular[1]);
      const entry = v7Id ? pool.find((t) => t.id === v7Id[1] || String(t.href || "").endsWith(`/${v7Id[1]}_Student.pdf`)) : bestMatch(name, pool);
      if (entry) {
        out.matched = entry.title;
        out.files = v7Files(entry);
        return out;
      }
    }
    if (courseId === "linear" || modular) {
      const notes = bestMatch(name, linearNotes(catalogs));
      const classified = bestMatch(name, linearClassified(catalogs));
      out.matched = (notes || classified || {}).title || "";
      out.files = [fileFrom(notes, "notes", "Notes"), fileFrom(classified, "classified", "Classified practice")].filter(Boolean);
      return out;
    }
    const ial = catalogs.library && catalogs.library.courses && catalogs.library.courses[courseId];
    if (ial && ial.notes && Array.isArray(ial.notes.topics)) {
      const list = (courseTopicNames || []).filter((t) => !/^V7\s/.test(t));
      const index = list.indexOf(name);
      const entry = index >= 0 && index < ial.notes.topics.length ? ial.notes.topics[index] : bestMatch(name, ial.notes.topics);
      if (entry) {
        out.matched = entry.title;
        out.files = [fileFrom(entry, "notes", "Notes with answers")].filter(Boolean);
      }
    }
    return out;
  }

  const api = { resolve, bestMatch, norm };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (!root.document) return;

  /* ============================================================ browser */

  const CATALOG_SCRIPTS = [
    ["v7", "modular-v7-data.js?v=20261128", () => root.ELITE_MODULAR_V7],
    ["classified", "classified-books-data.js?v=20261010a", () => root.ELITE_CLASSIFIED_2026],
    ["library", "library-data.js?v=20261127v7", () => root.ELITE_LIBRARY]
  ];
  let catalogPromise = null;

  function loadScript(src) {
    return new Promise((resolveLoad, reject) => {
      const el = document.createElement("script");
      el.src = src;
      el.onload = resolveLoad;
      el.onerror = () => reject(new Error(`Could not load ${src}`));
      document.head.appendChild(el);
    });
  }

  function loadCatalogs() {
    if (!catalogPromise) {
      catalogPromise = Promise.all(CATALOG_SCRIPTS.map(async ([key, src, get]) => {
        if (!get()) await loadScript(src).catch(() => {});
        return [key, get() || null];
      })).then((pairs) => Object.fromEntries(pairs));
    }
    return catalogPromise;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  }

  function absolute(href) {
    return new URL(href, root.location.href).href;
  }

  function fileName(file) {
    const clean = (value) => String(value || "").replace(/&/g, "and").replace(/[^A-Za-z0-9 _-]+/g, " ").trim().replace(/\s+/g, "_");
    return `Elite_${clean(file.title) || "Lesson"}_${clean(file.label)}.pdf`;
  }

  /* Fetch a catalogue PDF as a File. Cross-origin books (GitHub release
     assets) may refuse - those go in the message as links instead. */
  async function fetchFile(file) {
    const response = await fetch(absolute(file.href), { mode: "cors", credentials: "omit" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    return new File([blob], fileName(file), { type: "application/pdf" });
  }

  let modal = null;
  let state = null;

  function ensureModal() {
    if (modal) return modal;
    modal = document.createElement("div");
    modal.className = "lt-modal-backdrop lr-backdrop";
    modal.hidden = true;
    modal.innerHTML = `<div class="lt-modal lr-modal" role="dialog" aria-modal="true" aria-labelledby="lrTitle"><h3 id="lrTitle"></h3><div id="lrBody"></div></div>`;
    document.body.appendChild(modal);
    modal.addEventListener("click", (event) => {
      if (event.target === modal || event.target.closest("[data-lr-close]")) close();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && modal && !modal.hidden) close();
    });
    return modal;
  }

  function close() {
    if (modal) modal.hidden = true;
    state = null;
  }

  function selectedFiles() {
    return state ? state.files.filter((f) => state.chosen.has(f.kind)) : [];
  }

  function captionFor(targetLabel) {
    const files = selectedFiles();
    const names = files.map((f) => f.label).join(" + ");
    const links = files.filter((f) => !state.ready.get(f.kind)).map((f) => `${f.label}: ${absolute(f.href)}`);
    const who = state.ctx.studentName || "";
    const lines = [
      `📘 ${state.matched || state.topic}${who && targetLabel !== "group" ? ` — ${who}` : ""}`,
      `${names} (Elite IGCSE)`,
      ...links
    ];
    return lines.join("\n");
  }

  function prepare() {
    const token = Symbol("prep");
    state.token = token;
    selectedFiles().forEach((file) => {
      if (state.ready.has(file.kind) || state.pending.has(file.kind)) return;
      state.pending.add(file.kind);
      fetchFile(file).then((blob) => {
        if (!state) return;
        state.ready.set(file.kind, blob);
      }).catch(() => {
        if (!state) return;
        state.ready.set(file.kind, null); // null = send as a link
      }).finally(() => {
        if (!state) return;
        state.pending.delete(file.kind);
        renderBody();
      });
    });
    renderBody();
  }

  function renderBody() {
    if (!state || !modal) return;
    const { ctx, files } = state;
    const body = modal.querySelector("#lrBody");
    const chosen = selectedFiles();
    const waiting = chosen.some((f) => !state.ready.has(f.kind));
    const Wa = root.EliteWaSend;
    const shareable = chosen.map((f) => state.ready.get(f.kind)).filter(Boolean);
    const sheet = Wa && Wa.canShareFiles(shareable);
    if (!files.length) {
      body.innerHTML = `<p class="lt-muted">No notes or classified book was found for <b>${escapeHtml(state.topic)}</b> in the site library.</p>
        <div class="lt-form-actions"><button type="button" class="lt-btn" data-lr-close>Close</button></div>`;
      return;
    }
    const targets = Wa ? Wa.targets(ctx) : [];
    body.innerHTML = `
      <p class="lt-muted">${state.matched && norm(state.matched) !== norm(state.topic) ? `Books for <b>${escapeHtml(state.matched)}</b>. ` : ""}Tick what to send:</p>
      <div class="lr-files">
        ${files.map((f) => {
          const st = state.chosen.has(f.kind) ? (state.pending.has(f.kind) || !state.ready.has(f.kind) ? "Preparing…" : state.ready.get(f.kind) ? `PDF ready · ${Math.max(1, Math.round(state.ready.get(f.kind).size / 1024))} KB` : "Sent as a link") : "";
          return `<label class="lt-checkline lr-file"><input type="checkbox" data-lr-kind="${f.kind}" ${state.chosen.has(f.kind) ? "checked" : ""}>
            <span><b>${escapeHtml(f.label)}</b>${f.pages ? ` <small>${f.pages} pages</small>` : ""} <a href="${escapeHtml(absolute(f.href))}" target="_blank" rel="noopener">open</a></span>
            <small class="lr-state">${escapeHtml(st)}</small></label>`;
        }).join("")}
      </div>
      <div class="asg-share-actions lr-targets">
        ${targets.map((t) => `<button type="button" class="lt-btn ${t.kind === "group" ? "is-gold" : t.kind === "phone" ? "is-primary" : ""}" data-lr-send="${escapeHtml(t.key)}" ${waiting || !chosen.length ? "disabled" : ""}>${waiting ? "Preparing PDFs…" : escapeHtml(t.label)}</button>`).join("")}
        <button type="button" class="lt-btn" data-lr-close>Close</button>
      </div>
      <p class="lt-muted lr-how">${sheet && !state.forceFallback
        ? "Your device's share window opens with the PDFs attached - choose WhatsApp, then the chat. The message is attached too."
        : "The PDFs download, the message is copied, and the WhatsApp chat opens (the group link when saved) - drag the PDFs in and paste."}</p>
      ${sheet ? `<label class="lt-checkline lr-alt"><input type="checkbox" data-lr-fallback ${state.forceFallback ? "checked" : ""}> WhatsApp is not in the share window - download the PDFs and open the chat instead</label>` : ""}
      <p class="lt-muted" id="lrHint" aria-live="polite"></p>`;
  }

  async function send(key) {
    const Wa = root.EliteWaSend;
    if (!state || !Wa) return;
    const target = Wa.targets(state.ctx).find((t) => t.key === key);
    if (!target) return;
    const files = selectedFiles().map((f) => state.ready.get(f.kind)).filter(Boolean);
    const text = captionFor(target.kind);
    const result = await Wa.send({ files, text, target, title: state.matched || state.topic, forceFallback: Boolean(state.forceFallback) });
    const hint = modal.querySelector("#lrHint");
    if (hint) hint.textContent = Wa.resultMessage(result, target);
    if (result.mode !== "cancelled" && state.ctx.toast) state.ctx.toast(`Sent: ${state.matched || state.topic}`);
  }

  async function open(ctx) {
    ensureModal();
    state = { ctx, topic: ctx.topic, matched: "", files: [], chosen: new Set(), ready: new Map(), pending: new Set() };
    modal.querySelector("#lrTitle").textContent = `Send notes + classified · ${ctx.topic}`;
    modal.querySelector("#lrBody").innerHTML = `<p class="lt-muted">Finding the books…</p>`;
    modal.hidden = false;
    const catalogs = await loadCatalogs();
    if (!state) return;
    const found = resolve(ctx.courseId, ctx.topic, catalogs, ctx.courseTopics || []);
    state.matched = found.matched;
    state.files = found.files;
    modal.querySelector("#lrTitle").textContent = `Send notes + classified · ${found.matched || String(ctx.topic).replace(/^V7\s+\S+\s*·\s*/, "")}`;
    found.files.forEach((f) => { if (f.kind !== "answers") state.chosen.add(f.kind); });
    prepare();
  }

  document.addEventListener("change", (event) => {
    if (event.target.closest("[data-lr-fallback]") && state) {
      state.forceFallback = event.target.checked;
      renderBody();
      return;
    }
    const box = event.target.closest("[data-lr-kind]");
    if (!box || !state) return;
    if (box.checked) state.chosen.add(box.dataset.lrKind);
    else state.chosen.delete(box.dataset.lrKind);
    prepare();
  });

  document.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-lr-send]");
    if (btn && state) send(btn.dataset.lrSend);
  });

  root.EliteLessonResources = { ...api, open, loadCatalogs };
})(typeof window !== "undefined" ? window : globalThis);
