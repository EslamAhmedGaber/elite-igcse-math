(function () {
  const root = document.querySelector("[data-course-root]");
  const system = window.ELITE_COURSE_MODULES || {};
  if (!root || !Array.isArray(system.courses)) return;

  const ICONS = {
    notes: '<path d="M7 4h9l3 3v13H7z"/><path d="M16 4v3h3"/><path d="M10 11h6M10 14h6M10 17h4"/>',
    books: '<path d="M5 5a2 2 0 0 1 2-2h11v16H7a2 2 0 0 0-2 2z"/><path d="M5 19a2 2 0 0 1 2-2h11"/>',
    "past-solutions": '<path d="M8 3h8l4 4v14H8z"/><path d="M4 7v14h12"/><path d="M11 12h6M11 16h6"/>',
    "build-test": '<path d="M13 3 5 14h6l-1 7 8-11h-6z"/>',
    progress: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
    "interactive-lab": '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M7.5 15h9"/>',
    classified: '<path d="M4 6h16M4 12h16M4 18h10"/>',
    expertise: '<path d="m12 3 2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
    "revision-book": '<path d="M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z"/><path d="M20 4h-4a2 2 0 0 0-2 2"/><path d="M20 4v14h-6"/>',
    "mistake-box": '<path d="M4 7h16v13H4z"/><path d="M4 7l2-3h12l2 3"/><path d="M10 12h4"/>',
    "saved-tests": '<path d="M6 3h12v18l-6-4-6 4z"/>',
    daily: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/><path d="m9 15 2 2 4-4"/>',
    "question-visualizer": '<circle cx="12" cy="12" r="3"/><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/>',
  };

  // Real counts (checked 2026-10-24): questions = the course's classified bank as the
  // practice page shows it (with the Elite Practice questions); topics = topic notes; papers = classified past papers.
  const FACTS = {
    linear: { topics: 58, questions: 1317, papers: 60, glyph: "π" },
    unit1: { topics: 29, questions: 635, glyph: "√" },
    unit2: { topics: 32, questions: 684, glyph: "x²" },
    wma11: { topics: 13, questions: 189, papers: 19, glyph: "∫" },
    wma12: { topics: 12, questions: 190, papers: 19, glyph: "Σ" },
    wma13: { topics: 13, questions: 180, papers: 19, glyph: "eˣ" },
    wme01: { topics: 10, questions: 138, papers: 18, glyph: "F" },
  };

  // Three stages, the same in every course. A tile appears only when the course has that resource.
  const STAGES = [
    { id: "learn", title: "1 · Learn", hint: "read first", tiles: [
      ["notes", "Notes", "Topic notes with worked answers"],
      ["interactive-lab", "Visual Lab", "Hard topics you can move and rotate"],
      ["question-visualizer", "Question Visualizer", "Paper images beside simulations"],
    ] },
    { id: "practise", title: "2 · Practise", hint: "by topic", tiles: [
      ["daily", "Daily Challenge", "5 questions picked for you today"],
      ["classified", "Practise online", "Solve by topic, mark and track"],
      ["books", "Classified books", "Printable PDFs with answers"],
      ["expertise", "Expertise", "The harder questions"],
      ["mistake-box", "Mistake Box", "Your questions to redo"],
    ] },
    { id: "test", title: "3 · Test", hint: "exam conditions", tiles: [
      ["past-solutions", "Past papers & solutions", "Each paper beside its worked solution"],
      ["build-test", "Mock generator", "Printable A4 tests, random or by topic"],
      ["revision-book", "Revision book", "A 10-100 question mix"],
      ["saved-tests", "Saved tests", "Reuse your tests"],
      ["progress", "Progress", "Mastery and your next weak topic"],
    ] },
  ];

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function icon(key) {
    return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[key] || ICONS.notes}</svg>`;
  }

  function linksFor(course) {
    const group = (system.navGroups || []).find((item) => item.id === course.group);
    if (!group) return {};
    const list = course.unit ? (group.units || []).find((u) => u.title === course.unit)?.links || [] : group.links || [];
    const byModule = {};
    list.forEach((link) => { if (link.module && !byModule[link.module]) byModule[link.module] = link.href; });
    if (["wma11", "wma12", "wma13", "wme01"].includes(course.id)) {
      byModule.books = `/downloads.html?pathway=pure&course=${course.id}#downloads`;
      byModule["past-solutions"] = `/pastpapers.html?pathway=pure&course=${course.id}#pure-${course.id}`;
    }
    byModule.daily = `/daily.html?course=${course.id}`;
    return byModule;
  }

  function tile([key, title, detail], href) {
    if (!href) return "";
    return `<a class="e27-tile" data-module="${esc(key)}" href="${esc(href.replace(/^\//, ""))}">
      <span class="i">${icon(key)}</span>
      <span><strong>${esc(title)}</strong><small>${esc(detail)}</small></span>
      <span class="arrow" aria-hidden="true">&rarr;</span>
    </a>`;
  }

  function courseCard(c) {
    const facts = FACTS[c.id] || {};
    return `<a class="e27-course" data-course="${esc(c.id)}" href="course.html?${esc(c.query)}">
      <span class="e27-glyph" aria-hidden="true">${esc(facts.glyph || "")}</span>
      <span class="e27-chip">${esc(c.code)}</span>
      <strong>${esc(c.name)}</strong>
      <small>${esc(c.blurb)}</small>
      <span class="e27-meta"><span>${facts.topics ? `<b class="e27-num">${facts.topics}</b> topics` : esc(c.family)}</span><span class="e27-go" aria-hidden="true">&rarr;</span></span>
    </a>`;
  }

  function chooser(title, text, list) {
    root.classList.add("e27-course-page");
    root.innerHTML = `<div class="e27-wrap e27-choose">
      <nav class="e27-backlink" aria-label="Breadcrumb"><a href="index.html">&larr; All courses</a></nav>
      <div class="e27-head"><div><h1>${esc(title)}</h1><p>${esc(text)}</p></div></div>
      <div class="e27-courses">${list.map(courseCard).join("")}</div>
    </div>`;
  }

  function topicRoadmap(course) {
    const notes = window.ELITE_LIBRARY?.courses?.[course.id]?.notes;
    if (!notes) return "";
    const groups = Array.isArray(notes.chapters) && notes.chapters.length
      ? notes.chapters.map((ch) => ({ title: `Chapter ${ch.number}: ${ch.title}`, topics: ch.topics || [] }))
      : [{ title: "", topics: notes.topics || [] }];
    const total = groups.reduce((sum, g) => sum + g.topics.length, 0);
    if (!total) return "";
    const body = groups.map((group) => `
      ${group.title ? `<h3 class="e27-roadmap-chapter">${esc(group.title)}</h3>` : ""}
      <div class="e27-roadmap">${group.topics.map((t) => `
        <div class="e27-topic" data-topic-num="${esc(t.num)}">
          <span class="n">${esc(t.num)}</span>
          <span class="e27-topic-main">
            ${t.href
              ? `<a class="e27-topic-title" data-module="notes" href="${esc(t.href)}" target="_blank" rel="noopener"><strong>${esc(t.title)}</strong></a>`
              : `<strong>${esc(t.title)}</strong>`}
            <small data-topic-meta>${t.href ? (t.pages ? `${esc(t.pages)} pages of notes` : "Notes") : "Notes coming soon"}</small>
            <span class="e27-topic-bar" data-topic-bar hidden><i></i></span>
          </span>
          <span class="e27-topic-acts">
            ${t.href ? `<a class="pdf" data-module="notes" href="${esc(t.href)}" target="_blank" rel="noopener" aria-label="${esc(t.title)} notes PDF">PDF</a>` : ""}
            <a class="go" data-module="classified" data-topic-practice hidden aria-label="Practise ${esc(t.title)}">Practise</a>
          </span>
        </div>`).join("")}
      </div>`).join("");
    return `<section class="e27-block" aria-labelledby="roadmapTitle">
      <div class="e27-head"><div><h2 id="roadmapTitle">Topics</h2><p>All ${total} topics in order: open the notes, then practise the topic's past-paper questions. Your progress shows on each topic.</p></div><div class="e27-roadmap-sum" data-roadmap-sum hidden></div></div>
      ${body}
    </section>`;
  }

  const params = new URLSearchParams(window.location.search);
  // Friendly names people type or share (?c=pure1, ?pathway=wme01, ...).
  const ALIASES = {
    linear: "linear", "4ma1": "linear",
    unit1: "unit1", "4wm1": "unit1", unit2: "unit2", "4wm2": "unit2",
    wma11: "wma11", pure1: "wma11", p1: "wma11",
    wma12: "wma12", pure2: "wma12", p2: "wma12",
    wma13: "wma13", pure3: "wma13", p3: "wma13",
    wme01: "wme01", mechanics1: "wme01", mech1: "wme01", m1: "wme01"
  };
  const KNOWN_PATHWAYS = ["", "linear", "modular", "pure"];
  const norm = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const asked = norm(params.get("c")) || norm(params.get("course"));
  const pathway = norm(params.get("pathway"));
  let id = ALIASES[asked] || ALIASES[pathway] || "";
  const unknownLink = (asked && !ALIASES[asked]) || (!ALIASES[pathway] && !KNOWN_PATHWAYS.includes(pathway));
  if (!id && !unknownLink) {
    id = system.courseFromContext(params, pathway === "modular" ? "modular" : "");
  }
  const course = system.courses.find((item) => item.id === id);

  if (!course && unknownLink) {
    // A mistyped or old link: never guess a course, let the student choose.
    document.title = "Choose your course - Elite IGCSE Mathematics";
    chooser("Choose your course", "We couldn't find the course in this link.", system.courses);
    return;
  }

  if (!course) {
    // Modular without a unit: choose the unit first
    document.title = "Choose your Modular unit - Elite IGCSE Mathematics";
    chooser("Modular", "Choose your unit.", system.courses.filter((item) => item.group === "modular"));
    return;
  }

  const links = linksFor(course);
  const facts = FACTS[course.id] || {};
  const stages = STAGES.map((stage) => ({ ...stage, tiles: stage.tiles.map((t) => t.slice()) }));
  if (course.id === "wme01") stages[0].tiles[1] = ["interactive-lab", "Mechanics Lab", "Interactive simulations, topic by topic"];
  if (["linear", "unit1", "unit2", "wma11"].includes(course.id)) {
    links["interactive-lab"] = `https://eliteiglab.com/lab/index.html?course=${course.id}`;
  }
  const stats = [
    [facts.topics, "topics"],
    [facts.questions, "classified questions"],
    [facts.papers, "past papers"],
  ].filter(([value]) => value);

  document.title = `${course.name} (${course.code}) - Elite IGCSE Mathematics`;
  root.classList.add("e27-course-page");
  root.dataset.course = course.id;
  root.innerHTML = `
    <section class="e27-chero" data-course="${esc(course.id)}">
      <span class="e27-cglyph" aria-hidden="true">${esc(facts.glyph || "")}</span>
      <div class="e27-wrap">
        <nav class="e27-crumb" aria-label="Breadcrumb"><a href="index.html">All courses</a> &nbsp;/&nbsp; ${course.family === "IAL" ? "International A Level" : "International GCSE"} &nbsp;/&nbsp; ${esc(course.name)}</nav>
        <div class="e27-ctop">
          <div>
            <span class="e27-chip">${esc(course.family)} &middot; ${esc(course.code)}</span>
            <h1>${esc(course.name)}</h1>
            <p>${esc(course.blurb)}</p>
            <a class="e27-change" href="index.html#courseLauncher">Change course</a>
          </div>
          <div class="e27-cstats">${stats.map(([value, label]) => `<div><b class="e27-num">${Number(value).toLocaleString("en-GB")}</b><span>${esc(label)}</span></div>`).join("")}</div>
        </div>
        <div class="e27-mine" data-e27-account>
          <span class="e27-mine-txt" data-e27-signed-out><small>Free student account &middot; optional</small><strong>Sign in with Google to save your progress on every device</strong></span>
          <button class="e27-btn e27-btn-gold" type="button" data-cloud-login data-cloud-label="Sign in free with Google" data-e27-signed-out>Sign in free with Google</button>
          <span class="e27-mine-txt" data-e27-signed-in><small>Signed in</small><strong>Your progress in ${esc(course.name)} saves automatically</strong></span>
          <a class="e27-btn e27-btn-ghost" href="progress.html" data-e27-signed-in>My progress &rarr;</a>
        </div>
      </div>
    </section>
    <div class="e27-wrap">
      <div class="e27-today" data-e27-today="course" data-course="${esc(course.id)}" role="region" aria-label="Today"></div>
      <div class="e27-stages">${stages.map((stage) => {
        const tiles = stage.tiles.map((t) => tile(t, links[t[0]])).join("");
        return tiles ? `<section class="e27-stage" aria-labelledby="stage-${stage.id}">
          <header><h2 id="stage-${stage.id}">${esc(stage.title)}</h2><span>${esc(stage.hint)}</span></header>
          ${tiles}
        </section>` : "";
      }).join("")}</div>
      ${topicRoadmap(course)}
    </div>
  `;
  // Per-topic progress: data/topic-index/<course>.js lists the bank questions behind each note.
  const SOLVED_KEYS = { wma11: "eliteWMA11SolvedV1", wma12: "eliteWMA12SolvedV1", wma13: "eliteWMA13SolvedV1", wme01: "eliteWME01SolvedV1" };
  function showTopicProgress() {
    const index = window.ELITE_TOPIC_INDEX?.[course.id];
    if (!index) return;
    let solved;
    try { solved = new Set(JSON.parse(localStorage.getItem(SOLVED_KEYS[course.id] || "solvedExpertiseQuestions") || "[]")); } catch (err) { solved = new Set(); }
    let done = 0;
    let all = 0;
    root.querySelectorAll("[data-topic-num]").forEach((el) => {
      const entry = index.topics[el.dataset.topicNum];
      if (!entry || !entry.ids.length) return;
      const count = entry.ids.filter((id) => solved.has(index.prefix + id) || solved.has(id)).length;
      const total = entry.ids.length;
      done += count;
      all += total;
      const pct = Math.round((count / total) * 100);
      el.classList.toggle("is-started", count > 0);
      el.classList.toggle("is-done", count === total);
      const meta = el.querySelector("[data-topic-meta]");
      if (meta) meta.textContent = count ? `${count} of ${total} questions solved` : `${total} past-paper question${total === 1 ? "" : "s"}`;
      const bar = el.querySelector("[data-topic-bar]");
      if (bar) { bar.hidden = false; bar.querySelector("i").style.width = `${pct}%`; bar.setAttribute("aria-label", `${pct}% solved`); bar.setAttribute("role", "img"); }
      const go = el.querySelector("[data-topic-practice]");
      if (go && entry.practice) { go.href = entry.practice; go.hidden = false; }
    });
    const sum = root.querySelector("[data-roadmap-sum]");
    if (sum && all) {
      sum.hidden = false;
      sum.innerHTML = `<b class="e27-num">${Math.round((done / all) * 100)}%</b><span>${done.toLocaleString("en-GB")} of ${all.toLocaleString("en-GB")} solved</span>`;
    }
  }
  if (root.querySelector("[data-topic-num]")) {
    const script = document.createElement("script");
    script.src = `data/topic-index/${course.id}.js?v=20261024a`;
    script.async = true;
    script.onload = showTopicProgress;
    document.head.appendChild(script);
    window.addEventListener("pageshow", (event) => { if (event.persisted) showTopicProgress(); });
  }
  try { window.localStorage.setItem("eliteLastCourse", course.id); } catch (err) { /* private mode */ }
})();
