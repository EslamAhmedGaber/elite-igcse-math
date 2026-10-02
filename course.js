(function () {
  const root = document.querySelector("[data-course-root]");
  const system = window.ELITE_COURSE_MODULES || {};
  if (!root || !Array.isArray(system.courses)) return;

  const ICONS = {
    notes: '<path d="M7 4h9l3 3v13H7z"/><path d="M16 4v3h3"/><path d="M10 11h6M10 14h6M10 17h4"/>',
    adaptive: '<path d="M5 19V9M10 19V5M15 19v-7M20 19v-4"/><path d="M3 19h19"/>',
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
    "question-visualizer": '<circle cx="12" cy="12" r="3"/><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/>',
  };

  // what each big card says; the link itself comes from the shared course registry
  const SERVICES = [
    ["notes", "Notes", "Topic notes with answers"],
    ["adaptive", "Adaptive Classified", "Questions + With Answers"],
    ["books", "Classified Books", "Classified and Expertise PDFs"],
    ["past-solutions", "Past Papers & Solutions", "Each paper beside its worked solution"],
    ["build-test", "Mock Generator", "Random or custom printable tests"],
    ["progress", "Progress", "Your mastery and next weak topic"],
  ];
  const LAB = ["interactive-lab", "Mechanics Lab", "Interactive simulations"];
  const VISUAL = ["interactive-lab", "Visual Lab", "Hard topics you can move and rotate"];
  const PRACTICE = [
    ["classified", "Classified Practice", "Solve online by topic"],
    ["expertise", "Expertise", "The harder questions"],
    ["revision-book", "Revision Book", "10-100 question mix"],
    ["mistake-box", "Mistake Box", "Questions to redo"],
    ["saved-tests", "Saved Tests", "Reuse your tests"],
    ["question-visualizer", "Question Visualizer", "Paper images + simulations"],
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
    if (["wma11", "wma12", "wme01"].includes(course.id)) {
      byModule.books = `/downloads.html?pathway=pure&course=${course.id}#downloads`;
      byModule["past-solutions"] = `/pastpapers.html?pathway=pure&course=${course.id}#pure-${course.id}`;
    }
    return byModule;
  }

  function card([key, title, detail], href, size) {
    if (!href) return "";
    return `<a class="hub-card${size === "small" ? " hub-card-small" : ""}" data-module="${esc(key)}" href="${esc(href.replace(/^\//, ""))}">
      <span class="hub-card-icon">${icon(key)}</span>
      <span class="hub-card-text"><strong>${esc(title)}</strong><small>${esc(detail)}</small></span>
      <span class="hub-card-go" aria-hidden="true">&rarr;</span>
    </a>`;
  }

  const params = new URLSearchParams(window.location.search);
  const id = (params.get("c") || "").toLowerCase() || system.courseFromContext(params, params.get("pathway") === "modular" ? "modular" : "");
  const course = system.courses.find((item) => item.id === id);

  if (!course) {
    // Modular without a unit: choose the unit first
    const units = system.courses.filter((item) => item.group === "modular");
    document.title = "Choose your Modular unit - Elite IGCSE Mathematics";
    root.innerHTML = `
      <nav class="hub-trail" aria-label="Breadcrumb"><a href="index.html">&larr; All courses</a></nav>
      <section class="hub-head"><h1>Modular</h1><p>Choose your unit.</p></section>
      <div class="hub-grid">${units.map((u) => `<a class="hub-card" href="course.html?${esc(u.query)}">
        <span class="hub-card-code">${esc(u.code)}</span>
        <span class="hub-card-text"><strong>${esc(u.name)}</strong><small>${esc(u.blurb)}</small></span>
        <span class="hub-card-go" aria-hidden="true">&rarr;</span></a>`).join("")}</div>`;
    return;
  }

  const links = linksFor(course);
  const services = SERVICES.slice();
  if (course.id === "wme01") services.push(LAB);
  if (["linear", "unit1", "unit2", "wma11"].includes(course.id)) {
    services.push(VISUAL);
    links["interactive-lab"] = `https://eliteiglab.com/lab/index.html?course=${course.id}`;
  }
  document.title = `${course.name} (${course.code}) - Elite IGCSE Mathematics`;
  root.innerHTML = `
    <nav class="hub-trail" aria-label="Breadcrumb"><a href="index.html">&larr; All courses</a></nav>
    <section class="hub-head">
      <span class="hub-kicker">${esc(course.family)} &middot; ${esc(course.code)}</span>
      <h1>${esc(course.name)}</h1>
      <p>${esc(course.blurb)}</p>
      <a class="hub-change" href="index.html">Change course</a>
    </section>
    <h2 class="hub-section-title">Choose a resource</h2>
    <div class="hub-grid">${services.map((s) => card(s, links[s[0]])).join("")}</div>
    <h2 class="hub-section-title">Practise online</h2>
    <div class="hub-grid hub-grid-small">${PRACTICE.map((s) => card(s, links[s[0]], "small")).join("")}</div>
    <section class="sr-section" data-student-results="course:${esc(course.id)}" aria-label="Student results" hidden></section>
  `;
  try { window.localStorage.setItem("eliteLastCourse", course.id); } catch (err) { /* private mode */ }
})();
