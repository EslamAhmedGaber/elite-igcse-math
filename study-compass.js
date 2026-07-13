(function () {
  "use strict";

  const DATA = window.ELITE_STUDY_SEARCH;
  if (!DATA || !Array.isArray(DATA.courses) || !Array.isArray(DATA.items)) return;

  const PREFS_KEY = "eliteStudyPreferencesV1";
  const NOTES_KEY = "eliteNotesStudiedV1";
  const HISTORY_KEY = "eliteStudyHistoryV1";
  const LAST_COURSE_KEY = "eliteStudyLastCourseV1";

  const ICONS = {
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>',
    compass: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="m16 8-2.2 5.8L8 16l2.2-5.8z"></path></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"></path></svg>',
    book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H20v17H7.5A3.5 3.5 0 0 0 4 22z"></path><path d="M4 5.5V22"></path></svg>',
    layers: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 9 5-9 5-9-5z"></path><path d="m3 12 9 5 9-5M3 17l9 5 9-5"></path></svg>',
    test: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5h10v16H5V9z"></path><path d="M9 5v4H5M9 13h6M9 17h6"></path></svg>',
    repair: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15.5-6.3M21 4v5h-5"></path><path d="M21 12a9 9 0 0 1-15.5 6.3M3 20v-5h5"></path></svg>',
    chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V9M10 19V5M16 19v-7M22 19H2"></path></svg>',
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"></path></svg>',
    folder: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h6l2 2h10v12H3z"></path></svg>',
    paper: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h9l4 4v16H6z"></path><path d="M14 2v5h5M9 12h7M9 16h7"></path></svg>',
    flask: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 2h6M10 2v6l-6 10a2 2 0 0 0 1.7 3h12.6a2 2 0 0 0 1.7-3L14 8V2"></path><path d="M7.5 15h9"></path></svg>',
    award: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="5"></circle><path d="m8.5 12-1 10 4.5-3 4.5 3-1-10"></path></svg>',
    settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1z"></path></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"></path></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"></path></svg>',
    grid: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect></svg>',
    list: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13"></path><circle cx="4" cy="6" r="1"></circle><circle cx="4" cy="12" r="1"></circle><circle cx="4" cy="18" r="1"></circle></svg>',
  };

  const TYPE_ICONS = {
    Module: "compass",
    Topic: "layers",
    Note: "book",
    Resource: "folder",
  };

  const JOURNEY = [
    { id: "learn", label: "Learn", icon: "book" },
    { id: "practise", label: "Practise", icon: "layers" },
    { id: "test", label: "Test", icon: "test" },
    { id: "repair", label: "Repair", icon: "repair" },
    { id: "progress", label: "Master", icon: "chart" },
  ];

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function icon(name) {
    return `<span class="elite-study-icon">${ICONS[name] || ICONS.compass}</span>`;
  }

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value == null ? fallback : value;
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      // Storage is an enhancement; the core site still works without it.
    }
  }

  function readText(key, fallback = "") {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      try {
        const parsed = JSON.parse(raw);
        return typeof parsed === "string" ? parsed : fallback;
      } catch (error) {
        return raw;
      }
    } catch (error) {
      return fallback;
    }
  }

  function collectionSize(value) {
    if (Array.isArray(value)) return value.length;
    if (value && typeof value === "object") return Object.keys(value).length;
    return 0;
  }

  function slug(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function courseById(id) {
    return DATA.courses.find((course) => course.id === id) || DATA.courses[0];
  }

  function resolveCourseId() {
    const params = new URLSearchParams(window.location.search);
    const path = window.location.pathname.toLowerCase();
    const requestedCourse = String(params.get("course") || "").toLowerCase();
    if (path.includes("/ial/wme01/") || requestedCourse === "wme01") return "wme01";
    if (path.includes("/ial/wma12/") || requestedCourse === "wma12") return "wma12";
    if (path.includes("/ial/wma11/") || requestedCourse === "wma11") return "wma11";
    if (params.get("pathway") === "modular" || document.body.dataset.pathway === "modular") {
      const unit = params.get("unit") || readText("modularUnit", "Unit 1") || "Unit 1";
      return /2/.test(unit) ? "modular2" : "modular1";
    }
    if (params.get("pathway") === "pure") return requestedCourse || "wma11";
    const stored = readJson(LAST_COURSE_KEY, "");
    if (document.body.dataset.page === "home" && DATA.courses.some((course) => course.id === stored)) return stored;
    return "linear";
  }

  function currentStage() {
    const path = window.location.pathname.toLowerCase();
    const page = document.body.dataset.page || "";
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    if (page === "progress" || path.endsWith("/progress.html")) return "progress";
    if (page === "exam" || path.endsWith("/exam.html")) return "test";
    if (params.get("mode") === "review" || params.get("mode") === "mistakes") return "repair";
    const ialLanding = /\/ial\/(wma11|wma12|wme01)\/(?:index\.html)?$/.test(path)
      && !["topic", "mode", "expertise", "bank"].some((key) => params.has(key))
      && (!hash || hash === "#ialNotes");
    if (ialLanding) return "learn";
    if (page === "notes" || path.endsWith("/notes.html") || hash === "#ialNotes") return "learn";
    if (page === "practice" || path.endsWith("/practice.html") || /\/ial\/(wma11|wma12|wme01)\//.test(path)) return "practise";
    return "";
  }

  function meaningfulRoute() {
    const path = window.location.pathname.toLowerCase();
    const page = document.body.dataset.page || "";
    return ["notes", "practice", "exam", "progress", "ial-wma11", "ial-wma12", "ial-wme01"].includes(page)
      || /\/ial\/(wma11|wma12|wme01)\//.test(path);
  }

  function currentRelativeUrl() {
    return `${window.location.pathname}${window.location.search}${window.location.hash}`;
  }

  function readHistory() {
    const history = readJson(HISTORY_KEY, []);
    return Array.isArray(history) ? history.filter((item) => item && item.href && item.label).slice(0, 8) : [];
  }

  function rememberCurrentRoute(course) {
    if (!meaningfulRoute()) return;
    const href = currentRelativeUrl();
    const label = (document.querySelector("h1")?.textContent || document.title || "Continue learning")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 90);
    const history = readHistory().filter((item) => item.href !== href);
    history.unshift({ href, label, courseId: course.id, stage: currentStage(), updatedAt: new Date().toISOString() });
    writeJson(HISTORY_KEY, history.slice(0, 8));
  }

  function continueRoute(course) {
    const current = currentRelativeUrl();
    const history = readHistory();
    const match = history.find((item) => item.courseId === course.id && item.href !== current)
      || history.find((item) => item.courseId === course.id)
      || history.find((item) => item.href !== current);
    return match || { href: course.links.learn, label: `Open ${course.shortLabel} notes`, stage: "learn" };
  }

  function defaultPreferences() {
    return {
      density: "comfortable",
      font: "normal",
      contrast: false,
      reducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || false,
      focus: false,
    };
  }

  function readPreferences() {
    const saved = readJson(PREFS_KEY, {});
    const prefs = { ...defaultPreferences(), ...(saved && typeof saved === "object" ? saved : {}) };
    prefs.density = prefs.density === "compact" ? "compact" : "comfortable";
    prefs.font = prefs.font === "large" ? "large" : "normal";
    prefs.contrast = Boolean(prefs.contrast);
    prefs.reducedMotion = Boolean(prefs.reducedMotion);
    prefs.focus = Boolean(prefs.focus);
    return prefs;
  }

  function isLearningPage() {
    return Boolean(currentStage());
  }

  function applyPreferences(prefs) {
    document.documentElement.dataset.studyDensity = prefs.density;
    document.documentElement.dataset.studyFont = prefs.font;
    document.documentElement.dataset.studyContrast = prefs.contrast ? "high" : "standard";
    document.documentElement.dataset.studyMotion = prefs.reducedMotion ? "reduced" : "standard";
    document.body.classList.toggle("elite-study-focus-mode", prefs.focus && isLearningPage());
  }

  const currentCourse = courseById(resolveCourseId());
  writeJson(LAST_COURSE_KEY, currentCourse.id);
  let preferences = readPreferences();
  applyPreferences(preferences);
  const historyBeforeLoad = readHistory();
  rememberCurrentRoute(currentCourse);

  function notesStudiedSet() {
    const values = readJson(NOTES_KEY, []);
    return new Set(Array.isArray(values) ? values : []);
  }

  function courseNoteIds(courseId) {
    return [...new Set(DATA.items
      .filter((item) => item.courseId === courseId && item.type === "Note")
      .map((item) => item.id))];
  }

  function courseMetrics(course) {
    const noteIds = courseNoteIds(course.id);
    const studied = notesStudiedSet();
    const noteDone = noteIds.filter((id) => studied.has(id)).length;
    const solved = collectionSize(readJson(course.storage?.solved || "", []));
    const mistakes = collectionSize(readJson(course.storage?.mistakes || "", []));
    const percent = noteIds.length ? Math.round((noteDone / noteIds.length) * 100) : 0;
    return { noteDone, noteTotal: noteIds.length, solved, mistakes, percent };
  }

  function createTrigger() {
    const cta = document.querySelector(".site-cta");
    if (!cta || cta.querySelector("[data-study-open]")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "button elite-study-trigger";
    button.dataset.studyOpen = "";
    button.setAttribute("aria-label", "Open study navigator");
    button.setAttribute("aria-keyshortcuts", "Control+K Meta+K");
    button.innerHTML = `${icon("compass")}<span>Study</span>`;
    cta.insertAdjacentElement("afterbegin", button);
  }

  function dialogHtml() {
    const courseButtons = [
      '<button type="button" role="tab" data-study-course="all">All</button>',
      ...DATA.courses.map((course) => (
        `<button type="button" role="tab" data-study-course="${escapeHtml(course.id)}">`
          + `<span>${escapeHtml(course.shortLabel)}</span><small>${escapeHtml(course.code)}</small></button>`
      )),
    ].join("");
    return `
      <dialog class="elite-study-dialog" id="eliteStudyDialog" aria-labelledby="eliteStudyDialogTitle">
        <div class="elite-study-shell">
          <header class="elite-study-head">
            <div class="elite-study-title">
              ${icon("compass")}
              <div><span>Elite workspace</span><strong id="eliteStudyDialogTitle">Study navigator</strong></div>
            </div>
            <button class="elite-study-icon-button" type="button" data-study-close aria-label="Close study navigator">${icon("close")}</button>
          </header>
          <div class="elite-study-search">
            ${icon("search")}
            <label class="sr-only" for="eliteStudySearch">Search notes, topics, and tools</label>
            <input id="eliteStudySearch" type="search" placeholder="Search notes, topics, tools, papers..." autocomplete="off">
            <output data-study-search-count aria-live="polite"></output>
          </div>
          <nav class="elite-study-course-switcher" role="tablist" aria-label="Course filter">${courseButtons}</nav>
          <div class="elite-study-body">
            <main class="elite-study-main">
              <section data-study-default></section>
              <section class="elite-study-results" data-study-results hidden aria-label="Search results"></section>
            </main>
            <aside class="elite-study-options" aria-labelledby="eliteStudyOptionsTitle">
              <div class="elite-study-options-title">${icon("settings")}<strong id="eliteStudyOptionsTitle">Display</strong></div>
              <div class="elite-study-option-group">
                <span>Layout</span>
                <div class="elite-study-segmented" role="group" aria-label="Layout density">
                  <button type="button" data-study-pref="density" data-study-value="comfortable">Comfortable</button>
                  <button type="button" data-study-pref="density" data-study-value="compact">Compact</button>
                </div>
              </div>
              <div class="elite-study-option-group">
                <span>Text</span>
                <div class="elite-study-segmented" role="group" aria-label="Text size">
                  <button type="button" data-study-pref="font" data-study-value="normal">Normal</button>
                  <button type="button" data-study-pref="font" data-study-value="large">Large</button>
                </div>
              </div>
              <label class="elite-study-toggle"><span>High contrast</span><input type="checkbox" data-study-toggle="contrast"><i aria-hidden="true"></i></label>
              <label class="elite-study-toggle"><span>Reduce motion</span><input type="checkbox" data-study-toggle="reducedMotion"><i aria-hidden="true"></i></label>
              <label class="elite-study-toggle"><span>Focus mode</span><input type="checkbox" data-study-toggle="focus"><i aria-hidden="true"></i></label>
              <a class="elite-study-teacher-link" href="/admin.html">${icon("award")}<span><strong>Teacher Studio</strong><small>Certificates</small></span>${icon("arrow")}</a>
              <button class="elite-study-reset" type="button" data-study-reset>Reset display</button>
            </aside>
          </div>
        </div>
      </dialog>
    `;
  }

  function createDialog() {
    if (!document.getElementById("eliteStudyDialog")) {
      document.body.insertAdjacentHTML("beforeend", dialogHtml());
    }
    return document.getElementById("eliteStudyDialog");
  }

  const dialog = createDialog();
  const searchInput = dialog.querySelector("#eliteStudySearch");
  const defaultView = dialog.querySelector("[data-study-default]");
  const resultsView = dialog.querySelector("[data-study-results]");
  const searchCount = dialog.querySelector("[data-study-search-count]");
  let selectedCourseId = currentCourse.id;
  let activeResultIndex = -1;

  function stageHref(course, stage) {
    if (stage === "repair") return course.links.repair;
    return course.links[stage] || course.links.learn;
  }

  function renderCourseTabs() {
    dialog.querySelectorAll("[data-study-course]").forEach((button) => {
      const active = button.dataset.studyCourse === selectedCourseId;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
    });
  }

  function quickLink(iconName, label, href, detail) {
    if (!href) return "";
    return `<a class="elite-study-quick-link" href="${escapeHtml(href)}">${icon(iconName)}<span><strong>${escapeHtml(label)}</strong><small>${escapeHtml(detail || "")}</small></span>${icon("arrow")}</a>`;
  }

  function renderDefaultView() {
    const course = selectedCourseId === "all" ? currentCourse : courseById(selectedCourseId);
    const palette = window.ELITE_COURSE_MODULES?.palettes?.[course.palette] || {};
    dialog.style.setProperty("--elite-study-accent", palette.accent || "#1d4ed8");
    dialog.style.setProperty("--elite-study-accent-deep", palette.accentDeep || "#0b1b34");
    dialog.style.setProperty("--elite-study-accent-soft", palette.soft || "rgba(29, 78, 216, 0.1)");
    const metrics = courseMetrics(course);
    const continuation = continueRoute(course);
    const activeStage = course.id === currentCourse.id ? currentStage() : "";
    const journey = JOURNEY.map((stage, index) => {
      const active = stage.id === activeStage;
      return `
        <a class="elite-study-step ${active ? "is-current" : ""}" href="${escapeHtml(stageHref(course, stage.id))}" ${active ? 'aria-current="step"' : ""}>
          <span class="elite-study-step-index">${index + 1}</span>
          ${icon(stage.icon)}
          <strong>${escapeHtml(stage.label)}</strong>
        </a>
      `;
    }).join("");
    defaultView.innerHTML = `
      <div class="elite-study-course-head">
        <div><span>${escapeHtml(course.code)}</span><h2>${escapeHtml(course.label)}</h2></div>
        <a class="button primary" href="${escapeHtml(continuation.href)}">Continue${icon("arrow")}</a>
      </div>
      <div class="elite-study-snapshot" aria-label="Course snapshot">
        <div class="elite-study-ring" style="--elite-study-progress:${metrics.percent}%" role="img" aria-label="${metrics.percent}% of notes studied">
          <strong>${metrics.percent}%</strong><span>Notes</span>
        </div>
        <div><strong>${metrics.noteDone}/${metrics.noteTotal}</strong><span>notes studied</span></div>
        <div><strong>${metrics.solved}</strong><span>questions solved</span></div>
        <div><strong>${metrics.mistakes}</strong><span>mistakes saved</span></div>
      </div>
      <div class="elite-study-section-title"><strong>Learning path</strong><span>${escapeHtml(course.shortLabel)}</span></div>
      <nav class="elite-study-journey" aria-label="${escapeHtml(course.label)} learning path">${journey}</nav>
      <div class="elite-study-section-title"><strong>Quick access</strong></div>
      <div class="elite-study-quick-grid">
        ${quickLink("star", "Expertise", course.links.expertise, "Harder practice")}
        ${quickLink("folder", "Books", course.links.books, "Questions and answers")}
        ${quickLink("paper", "Past papers", course.links.papers, "Papers and solutions")}
        ${quickLink("flask", "Mechanics lab", course.links.lab, "Interactive cases")}
      </div>
    `;
    resultsView.hidden = true;
    defaultView.hidden = false;
    searchCount.textContent = "";
  }

  function normalizedText(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }

  function scoreItem(item, query, courseId) {
    const title = normalizedText(item.title);
    const detail = normalizedText(item.detail);
    const keywords = normalizedText((item.keywords || []).join(" "));
    let textScore = 0;
    if (title === query) textScore += 140;
    else if (title.startsWith(query)) textScore += 105;
    else if (title.includes(query)) textScore += 85;
    if (detail.includes(query)) textScore += 45;
    if (keywords.includes(query)) textScore += 30;
    query.split(" ").filter(Boolean).forEach((token) => {
      if (title.includes(token)) textScore += 12;
      else if (detail.includes(token) || keywords.includes(token)) textScore += 5;
    });
    if (textScore === 0) return 0;
    let score = textScore;
    if (item.courseId === courseId) score += 18;
    if (item.type === "Note") score += 6;
    if (item.type === "Topic") score += 4;
    return score;
  }

  function searchItems(query) {
    const normalized = normalizedText(query);
    if (!normalized) return [];
    return DATA.items
      .filter((item) => selectedCourseId === "all" || item.courseId === "all" || item.courseId === selectedCourseId)
      .map((item) => ({ item, score: scoreItem(item, normalized, selectedCourseId) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
      .slice(0, 14)
      .map((entry) => entry.item);
  }

  function resultHtml(item, index) {
    const external = /\.pdf(?:\?|$)/i.test(item.href) || /^https?:\/\//i.test(item.href);
    return `
      <article class="elite-study-result ${index === activeResultIndex ? "is-keyboard-active" : ""}">
        <a data-study-search-primary href="${escapeHtml(item.href)}" ${external ? 'target="_blank" rel="noreferrer"' : ""}>
          ${icon(TYPE_ICONS[item.type] || "folder")}
          <span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.type)} &middot; ${escapeHtml(item.detail)}</small></span>
          ${icon("arrow")}
        </a>
        ${item.secondaryHref ? `<a class="elite-study-result-secondary" href="${escapeHtml(item.secondaryHref)}">${escapeHtml(item.secondaryLabel || "Practice")}</a>` : ""}
      </article>
    `;
  }

  function renderSearch() {
    const query = searchInput.value.trim();
    if (!query) {
      activeResultIndex = -1;
      renderDefaultView();
      return;
    }
    const results = searchItems(query);
    if (activeResultIndex >= results.length) activeResultIndex = results.length - 1;
    resultsView.innerHTML = results.length
      ? results.map(resultHtml).join("")
      : '<div class="elite-study-empty"><strong>No matching resource</strong><span>Try a topic, course code, or module name.</span></div>';
    searchCount.textContent = `${results.length} result${results.length === 1 ? "" : "s"}`;
    defaultView.hidden = true;
    resultsView.hidden = false;
  }

  function syncPreferenceControls() {
    dialog.querySelectorAll("[data-study-pref]").forEach((button) => {
      const active = preferences[button.dataset.studyPref] === button.dataset.studyValue;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    dialog.querySelectorAll("[data-study-toggle]").forEach((input) => {
      input.checked = Boolean(preferences[input.dataset.studyToggle]);
    });
  }

  function renderDialog() {
    renderCourseTabs();
    syncPreferenceControls();
    if (searchInput.value.trim()) renderSearch();
    else renderDefaultView();
  }

  function openDialog() {
    selectedCourseId = currentCourse.id;
    searchInput.value = "";
    renderDialog();
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    requestAnimationFrame(() => searchInput.focus());
  }

  function closeDialog() {
    if (dialog.open && typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  function renderMobileNav() {
    let nav = document.querySelector(".mobile-bottom-nav");
    if (!nav) {
      nav = document.createElement("nav");
      document.body.appendChild(nav);
    }
    nav.className = "mobile-bottom-nav elite-study-mobile-nav";
    nav.setAttribute("aria-label", "Student shortcuts");
    document.body.classList.add("has-elite-study-nav");
    const stage = currentStage();
    const links = [
      { id: "learn", label: "Notes", icon: "book", href: currentCourse.links.learn },
      { id: "practise", label: "Practice", icon: "layers", href: currentCourse.links.practise },
      { id: "test", label: "Test", icon: "test", href: currentCourse.links.test },
      { id: "progress", label: "Progress", icon: "chart", href: currentCourse.links.progress },
    ];
    nav.innerHTML = links.map((link) => (
      `<a href="${escapeHtml(link.href)}" ${stage === link.id || (stage === "repair" && link.id === "practise") ? 'aria-current="page"' : ""}>${icon(link.icon)}<span>${escapeHtml(link.label)}</span></a>`
    )).join("") + `<button type="button" data-study-open>${icon("compass")}<span>Study</span></button>`;
  }

  function normalizeFooter() {
    const footer = document.querySelector(".site-footer");
    if (!footer) return;
    footer.dataset.sharedFooter = "20260713b";
    footer.innerHTML = `
      <div class="footer-grid">
        <div>
          <span class="footer-brand-line">Elite IGCSE Mathematics</span>
          <p class="footer-brand-tagline">Learn the method. Practise the exact topic. Master the paper.</p>
          <p class="footer-brand-blurb">Strategy notes, classified questions, worked solutions, test builders, progress tools, and visual Mechanics learning by Dr Eslam Ahmed.</p>
        </div>
        <div>
          <strong>Learn</strong>
          <p><a href="/notes.html?pathway=linear#linearNotes">Strategy Notes</a></p>
          <p><a href="/practice.html?pathway=linear&bank=all">Classified Practice</a></p>
          <p><a href="/exam.html?pathway=linear&mode=custom">Mocks &amp; Tests</a></p>
          <p><a href="/progress.html?pathway=linear">Progress</a></p>
        </div>
        <div>
          <strong>Courses</strong>
          <p><a href="/notes.html?pathway=linear#linearNotes">Linear 4MA1</a></p>
          <p><a href="/practice.html?pathway=modular&choose=unit">Modular 4WM</a></p>
          <p><a href="/ial/wma11/index.html">Pure 1 WMA11</a></p>
          <p><a href="/ial/wma12/index.html">Pure 2 WMA12</a></p>
          <p><a href="/ial/wme01/index.html">Mechanics 1 WME01</a></p>
        </div>
        <div>
          <strong>Teachers &amp; Support</strong>
          <p><a href="/admin.html">Teacher Studio &amp; Certificates</a></p>
          <p><a href="/downloads.html">Books &amp; Answers</a></p>
          <p><a href="/pastpapers.html">Past Papers &amp; Solutions</a></p>
          <p><a href="/about.html">About Dr Eslam</a></p>
          <p><a href="https://wa.me/201120009622" data-lead-trigger="whatsapp">WhatsApp &middot; +20 112 000 9622</a></p>
        </div>
      </div>
      <p class="footer-fineprint">&copy; Dr Eslam Ahmed &middot; Assistant Lecturer, Mathematics Department, Faculty of Engineering, Cairo University &middot; 8 years teaching IG O-Level and AS-Level Mathematics.</p>
    `;
  }

  function renderHomeBand() {
    if (document.body.dataset.page !== "home" || document.querySelector("[data-study-home-band]")) return;
    const hero = document.querySelector(".home-hero");
    if (!hero) return;
    const metrics = courseMetrics(currentCourse);
    const previous = historyBeforeLoad.find((item) => item.courseId === currentCourse.id) || continueRoute(currentCourse);
    const section = document.createElement("section");
    section.className = "elite-study-home-band";
    section.dataset.studyHomeBand = "";
    section.innerHTML = `
      <div class="elite-study-home-inner">
        <div class="elite-study-home-copy">
          <span>${escapeHtml(currentCourse.code)}</span>
          <h2>Continue learning</h2>
          <p>${escapeHtml(previous.label || `${currentCourse.label} notes`)}</p>
        </div>
        <div class="elite-study-home-metrics" aria-label="Current study snapshot">
          <span><strong>${metrics.noteDone}/${metrics.noteTotal}</strong> Notes</span>
          <span><strong>${metrics.solved}</strong> Solved</span>
          <span><strong>${metrics.mistakes}</strong> Mistakes</span>
        </div>
        <div class="elite-study-home-actions">
          <a class="button primary" href="${escapeHtml(previous.href || currentCourse.links.learn)}">Continue${icon("arrow")}</a>
          <button class="button light" type="button" data-study-open>${icon("compass")}Study</button>
        </div>
      </div>
    `;
    hero.insertAdjacentElement("afterend", section);
  }

  function addNoteToolbar(root, cards, course, kind) {
    if (root.querySelector("[data-notes-study-toolbar]")) return;
    const eligibleCards = cards.filter((card) => card.dataset.courseEligible !== "false");
    const toolbar = document.createElement("div");
    toolbar.className = "notes-study-toolbar";
    toolbar.dataset.notesStudyToolbar = "";
    const chapterOptions = kind === "linear"
      ? [...new Set(eligibleCards.map((card) => card.closest(".notes-chapter-group")?.id).filter(Boolean))]
          .map((id) => {
            const group = document.getElementById(id);
            const title = group?.querySelector("h3")?.textContent || id;
            return `<option value="${escapeHtml(id)}">${escapeHtml(title)}</option>`;
          }).join("")
      : "";
    toolbar.innerHTML = `
      <div class="notes-study-progress">
        <div class="notes-study-ring" data-notes-ring><strong>0%</strong><span>Studied</span></div>
        <div><span>${escapeHtml(course.code)} study library</span><strong data-notes-progress-text>0 of ${eligibleCards.length} notes</strong></div>
      </div>
      <div class="notes-study-controls">
        <label class="notes-study-search">${icon("search")}<span class="sr-only">Search notes</span><input type="search" data-notes-search placeholder="Search title or strategy..." autocomplete="off"></label>
        ${chapterOptions ? `<label><span class="sr-only">Chapter</span><select data-notes-chapter><option value="">All chapters</option>${chapterOptions}</select></label>` : ""}
        <label><span class="sr-only">Study status</span><select data-notes-status><option value="all">All notes</option><option value="unread">Not studied</option><option value="studied">Studied</option></select></label>
        <div class="notes-view-switch" role="group" aria-label="Notes view">
          <button type="button" data-notes-view="grid" class="is-active" aria-label="Grid view" aria-pressed="true">${icon("grid")}</button>
          <button type="button" data-notes-view="list" aria-label="List view" aria-pressed="false">${icon("list")}</button>
        </div>
        <button class="button notes-next-button" type="button" data-notes-next>${icon("arrow")}Next note</button>
      </div>
      <output class="notes-study-result" data-notes-result aria-live="polite"></output>
    `;
    const anchor = kind === "linear" ? root.querySelector(".linear-notes-feature") : root;
    if (kind === "linear" && anchor) anchor.insertAdjacentElement("beforebegin", toolbar);
    else root.insertAdjacentElement("beforebegin", toolbar);

    const search = toolbar.querySelector("[data-notes-search]");
    const chapter = toolbar.querySelector("[data-notes-chapter]");
    const status = toolbar.querySelector("[data-notes-status]");
    const result = toolbar.querySelector("[data-notes-result]");
    const ring = toolbar.querySelector("[data-notes-ring]");
    const progressText = toolbar.querySelector("[data-notes-progress-text]");

    function updateProgress() {
      const studied = notesStudiedSet();
      const done = eligibleCards.filter((card) => studied.has(card.dataset.noteStudyId)).length;
      const percent = eligibleCards.length ? Math.round((done / eligibleCards.length) * 100) : 0;
      ring.style.setProperty("--notes-progress", `${percent}%`);
      ring.querySelector("strong").textContent = `${percent}%`;
      progressText.textContent = `${done} of ${eligibleCards.length} notes`;
      eligibleCards.forEach((card) => {
        const active = studied.has(card.dataset.noteStudyId);
        card.classList.toggle("is-studied", active);
        const button = card.querySelector("[data-note-study-toggle]");
        if (button) {
          button.setAttribute("aria-pressed", String(active));
          button.innerHTML = `${icon("check")}<span>${active ? "Studied" : "Mark studied"}</span>`;
        }
      });
    }

    function applyFilters() {
      const query = normalizedText(search.value);
      const selectedChapter = chapter?.value || "";
      const selectedStatus = status.value;
      const studied = notesStudiedSet();
      let visible = 0;
      cards.forEach((card) => {
        const eligible = card.dataset.courseEligible !== "false";
        const matchesSearch = !query || normalizedText(card.dataset.noteSearch).includes(query);
        const cardChapter = card.closest(".notes-chapter-group")?.id || "";
        const matchesChapter = !selectedChapter || selectedChapter === cardChapter;
        const isStudied = studied.has(card.dataset.noteStudyId);
        const matchesStatus = selectedStatus === "all" || (selectedStatus === "studied" ? isStudied : !isStudied);
        const show = eligible && matchesSearch && matchesChapter && matchesStatus;
        card.hidden = !show;
        if (show) visible += 1;
      });
      if (kind === "linear") {
        root.querySelectorAll(".notes-chapter-group").forEach((group) => {
          group.hidden = !Array.from(group.querySelectorAll(".linear-topic-note")).some((card) => !card.hidden);
        });
      }
      result.textContent = `${visible} note${visible === 1 ? "" : "s"}`;
      updateProgress();
    }

    toolbar.addEventListener("input", applyFilters);
    toolbar.addEventListener("change", applyFilters);
    toolbar.addEventListener("click", (event) => {
      const viewButton = event.target.closest("[data-notes-view]");
      if (viewButton) {
        const view = viewButton.dataset.notesView;
        root.dataset.notesView = view;
        toolbar.querySelectorAll("[data-notes-view]").forEach((button) => {
          const active = button.dataset.notesView === view;
          button.classList.toggle("is-active", active);
          button.setAttribute("aria-pressed", String(active));
        });
        return;
      }
      if (event.target.closest("[data-notes-next]")) {
        const studied = notesStudiedSet();
        const next = eligibleCards.find((card) => !studied.has(card.dataset.noteStudyId) && !card.hidden);
        if (next) {
          next.scrollIntoView({ behavior: preferences.reducedMotion ? "auto" : "smooth", block: "center" });
          next.querySelector("a,button")?.focus({ preventScroll: true });
        }
      }
    });
    root.addEventListener("click", (event) => {
      const button = event.target.closest("[data-note-study-toggle]");
      if (!button) return;
      const studied = notesStudiedSet();
      const id = button.dataset.noteStudyToggle;
      if (studied.has(id)) studied.delete(id);
      else studied.add(id);
      writeJson(NOTES_KEY, [...studied]);
      applyFilters();
      renderDefaultView();
      renderHomeBand();
    });
    applyFilters();
  }

  function enhanceNotes() {
    const linearRoot = document.querySelector("[data-linear-notes-root]");
    const ialGrid = document.querySelector("[data-ial-notes-grid]");
    if (!linearRoot && !ialGrid) return;
    const course = currentCourse;
    const targetRoot = linearRoot || ialGrid;
    const selector = linearRoot ? ".linear-topic-note" : ".ial-note-card";

    function apply() {
      const cards = Array.from(targetRoot.querySelectorAll(selector));
      if (!cards.length) return false;
      cards.forEach((card) => {
        if (card.dataset.noteStudyReady === "true") return;
        const title = (card.querySelector(".linear-note-head strong, .ial-note-card-head strong")?.textContent || "").trim();
        const candidates = DATA.items.filter((item) => item.type === "Note" && item.courseId === course.id);
        const item = candidates.find((entry) => normalizedText(entry.title) === normalizedText(title));
        const fallback = DATA.items.find((entry) => entry.type === "Note" && entry.courseId === "linear" && normalizedText(entry.title) === normalizedText(title));
        const resolved = item || fallback;
        const eligible = course.id.startsWith("modular") ? Boolean(item) : true;
        const noteId = item?.id || `${course.id}:note:${slug(title)}`;
        card.dataset.noteStudyReady = "true";
        card.dataset.noteStudyId = noteId;
        card.dataset.noteSearch = `${title} ${card.textContent || ""}`;
        card.dataset.courseEligible = String(eligible);
        const actions = card.querySelector(".note-actions, .ial-note-actions");
        if (actions && !actions.querySelector("[data-note-study-toggle]")) {
          actions.insertAdjacentHTML("beforeend", `<button class="button note-study-toggle" type="button" data-note-study-toggle="${escapeHtml(noteId)}" aria-pressed="false">${icon("check")}<span>Mark studied</span></button>`);
        }
        if (course.id.startsWith("modular") && item?.secondaryHref && actions) {
          const practiceLink = Array.from(actions.querySelectorAll("a")).find((link) => /practice/i.test(link.textContent || ""));
          if (practiceLink) practiceLink.href = item.secondaryHref;
        }
      });
      addNoteToolbar(targetRoot, cards, course, linearRoot ? "linear" : "ial");
      return true;
    }

    if (apply()) return;
    const observer = new MutationObserver(() => {
      if (apply()) observer.disconnect();
    });
    observer.observe(targetRoot, { childList: true, subtree: true });
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-study-open]")) {
        event.preventDefault();
        openDialog();
        return;
      }
      if (event.target.closest("[data-study-close]")) {
        closeDialog();
        return;
      }
      const courseButton = event.target.closest("[data-study-course]");
      if (courseButton) {
        selectedCourseId = courseButton.dataset.studyCourse;
        activeResultIndex = -1;
        renderDialog();
        return;
      }
      const prefButton = event.target.closest("[data-study-pref]");
      if (prefButton) {
        preferences[prefButton.dataset.studyPref] = prefButton.dataset.studyValue;
        writeJson(PREFS_KEY, preferences);
        applyPreferences(preferences);
        syncPreferenceControls();
        return;
      }
      if (event.target.closest("[data-study-reset]")) {
        preferences = defaultPreferences();
        writeJson(PREFS_KEY, preferences);
        applyPreferences(preferences);
        syncPreferenceControls();
      }
    });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) closeDialog();
    });
    dialog.addEventListener("change", (event) => {
      const toggle = event.target.closest("[data-study-toggle]");
      if (!toggle) return;
      preferences[toggle.dataset.studyToggle] = toggle.checked;
      writeJson(PREFS_KEY, preferences);
      applyPreferences(preferences);
      syncPreferenceControls();
    });
    searchInput.addEventListener("input", () => {
      activeResultIndex = -1;
      renderSearch();
    });
    searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && searchInput.value) {
        event.preventDefault();
        searchInput.value = "";
        renderSearch();
        return;
      }
      if (!["ArrowDown", "ArrowUp", "Enter"].includes(event.key)) return;
      const results = Array.from(resultsView.querySelectorAll("[data-study-search-primary]"));
      if (!results.length) return;
      if (event.key === "Enter" && activeResultIndex >= 0) {
        event.preventDefault();
        results[activeResultIndex].click();
        return;
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const delta = event.key === "ArrowDown" ? 1 : -1;
        activeResultIndex = (activeResultIndex + delta + results.length) % results.length;
        renderSearch();
        const active = resultsView.querySelectorAll("[data-study-search-primary]")[activeResultIndex];
        active?.scrollIntoView({ block: "nearest" });
      }
    });
    document.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (dialog.open) closeDialog();
        else openDialog();
      }
    });
  }

  createTrigger();
  renderMobileNav();
  normalizeFooter();
  renderHomeBand();
  enhanceNotes();
  bindEvents();
  renderDialog();

  window.ELITE_STUDY = {
    version: DATA.version,
    currentCourseId: currentCourse.id,
    open: openDialog,
    search(query, courseId = currentCourse.id) {
      selectedCourseId = courseId;
      return searchItems(query);
    },
  };
})();
