(function () {
  const QUESTIONS = window.WME01_QUESTIONS || [];
  const TOPICS = window.WME01_TOPICS || [];
  const NOTES = (window.ELITE_IAL_NOTES || {}).wme01 || { topics: [] };
  const SOLVED_KEY = "eliteWME01SolvedV1";
  const MISTAKE_KEY = "eliteWME01MistakeBoxV1";
  const TRAINER_KEY = "eliteWME01FinalTrainerV1";
  const state = {
    filtered: [],
    activeIndex: 0,
    showSolution: false,
    mock: [],
    solved: readJSON(SOLVED_KEY, []),
    mistakes: readJSON(MISTAKE_KEY, {}),
    trainer: readJSON(TRAINER_KEY, {})
  };

  const els = {
    filters: document.getElementById("ialFilters"),
    search: document.getElementById("ialSearch"),
    topic: document.getElementById("ialTopic"),
    year: document.getElementById("ialYear"),
    session: document.getElementById("ialSession"),
    marks: document.getElementById("ialMarks"),
    expertise: document.getElementById("ialExpertiseOnly"),
    mistakeOnly: document.getElementById("ialMistakeOnly"),
    reset: document.getElementById("ialReset"),
    numbers: document.getElementById("ialNumbers"),
    stage: document.getElementById("ialQuestionStage"),
    label: document.getElementById("ialResultLabel"),
    prev: document.getElementById("ialPrev"),
    next: document.getElementById("ialNext"),
    total: document.querySelector("[data-ial-total]"),
    filtered: document.querySelector("[data-ial-filtered]"),
    solved: document.querySelector("[data-ial-solved]"),
    mistakes: document.querySelector("[data-ial-mistakes]"),
    progressPercent: document.querySelector("[data-ial-progress-percent]"),
    progressBar: document.querySelector("[data-ial-progress-bar]"),
    progressStarted: document.querySelector("[data-ial-progress-started]"),
    progressWeak: document.querySelector("[data-ial-progress-weak]"),
    progressMistakes: document.querySelector("[data-ial-progress-mistakes]"),
    progressTopics: document.querySelector("[data-ial-progress-topics]"),
    notesBooklet: document.querySelector("[data-ial-notes-booklet]"),
    notesGrid: document.querySelector("[data-ial-notes-grid]"),
    paperList: document.querySelector("[data-ial-paper-list]"),
    mockTopic: document.getElementById("ialMockTopic"),
    mockCount: document.getElementById("ialMockCount"),
    mockExpertise: document.getElementById("ialMockExpertise"),
    mockGenerate: document.getElementById("ialGenerateMock"),
    mockPrint: document.getElementById("ialPrintMock"),
    mockPrintSolutions: document.getElementById("ialPrintMockSolutions"),
    mockSummary: document.getElementById("ialMockSummary"),
    mockList: document.getElementById("ialMockList"),
    visualTopic: document.getElementById("ialVisualizerTopic"),
    visualQuestion: document.getElementById("ialVisualizerQuestion"),
    visualOpenBank: document.getElementById("ialVisualizerOpenBank"),
    visualOpenLab: document.getElementById("ialVisualizerOpenLab"),
    visualImage: document.getElementById("ialVisualizerImage"),
    visualMeta: document.getElementById("ialVisualizerMeta"),
    visualSimTitle: document.getElementById("ialVisualizerSimTitle"),
    visualCanvas: document.getElementById("ialVisualizerCanvas"),
    visualReadouts: document.getElementById("ialVisualizerReadouts"),
    visualSteps: document.getElementById("ialVisualizerSteps"),
    visualFinal: document.getElementById("ialVisualizerFinal")
  };

  const MODULE_HASHES = {
    ialNotes: "notes",
    ialFilters: "classified",
    ialQuestionStage: "classified",
    ialProgressModule: "progress",
    ialMockBuilder: "builder",
    ialPastPapers: "papers",
    ialSimulator: "lab",
    ialQuestionVisualizer: "visualizer"
  };

  const LAB_TOPIC_IDS = {
    "01_QuantitiesUnitsModelling": "modelling",
    "02_WorkingWithVectors": "vectors",
    "03_KinematicsGraphs": "graphs",
    "04_ConstantAcceleration1D": "suvat1d",
    "05_ConstantAcceleration2D": "suvat2d",
    "06_Forces": "forces",
    "07_NewtonsSecondLaw": "newton",
    "08_ResolvingForcesInclinedPlanes": "inclines",
    "09_MomentumImpulseCollisions": "momentum",
    "10_Moments": "moments"
  };

  const VISUALIZER_MODELS = {
    "01_QuantitiesUnitsModelling": { title: "Model assumptions map", focus: "quantity type, idealisation, units" },
    "02_WorkingWithVectors": { title: "Vector component model", focus: "i-j components, bearings, resultants" },
    "03_KinematicsGraphs": { title: "Motion graph model", focus: "gradient, area, displacement" },
    "04_ConstantAcceleration1D": { title: "1D constant-acceleration model", focus: "s, u, v, a, t on one line" },
    "05_ConstantAcceleration2D": { title: "2D projectile/vector-motion model", focus: "horizontal and vertical components" },
    "06_Forces": { title: "Free-body force model", focus: "resultant force and equilibrium" },
    "07_NewtonsSecondLaw": { title: "F = ma dynamics model", focus: "resultant force, mass, acceleration" },
    "08_ResolvingForcesInclinedPlanes": { title: "Inclined-plane resolving model", focus: "parallel and normal components" },
    "09_MomentumImpulseCollisions": { title: "Momentum and impulse model", focus: "before/after velocity and impulse" },
    "10_Moments": { title: "Beam and pivot model", focus: "force x perpendicular distance" }
  };

  function readJSON(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
    } catch (err) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function activeModuleFromLocation() {
    const hash = window.location.hash.replace(/^#/, "");
    if (MODULE_HASHES[hash]) return MODULE_HASHES[hash];
    const params = new URLSearchParams(window.location.search);
    const shouldOpenClassified = ["topic", "mode", "expertise", "bank"].some((key) => params.has(key));
    return shouldOpenClassified ? "classified" : "notes";
  }

  function setActiveModule(module = "notes") {
    const active = ["notes", "classified", "progress", "builder", "papers", "lab", "visualizer"].includes(module) ? module : "notes";
    document.body.dataset.ialActiveModule = active;
    document.querySelectorAll("[href*='#ial']").forEach((link) => {
      const hash = (() => {
        try {
          return new URL(link.getAttribute("href"), window.location.href).hash.replace(/^#/, "");
        } catch (err) {
          return "";
        }
      })();
      const linkModule = MODULE_HASHES[hash] || "";
      if (!linkModule) return;
      if (linkModule === active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  function handleModuleRoute({ scroll = false } = {}) {
    const module = activeModuleFromLocation();
    setActiveModule(module);
    if (!scroll) return;
    const hash = window.location.hash.replace(/^#/, "");
    const target = hash ? document.getElementById(hash) : null;
    target?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));
  }

  function uniqueNumbers(values) {
    return [...new Set(values.map(Number).filter(Number.isFinite))].sort((a, b) => a - b);
  }

  function sessionLabel(session) {
    return session === "MayJune" ? "May/June" : session;
  }

  function sessionOrder(session) {
    return ({ Jan: 1, MayJune: 2, Oct: 3 })[session] || 9;
  }

  function notePracticeHref(slug) {
    return `ial/wme01/index.html?topic=${encodeURIComponent(slug)}#ialFilters`;
  }

  function renderNotes() {
    if (els.notesBooklet && NOTES.booklet) {
      els.notesBooklet.innerHTML = `
        <div>
          <span class="eyebrow">${escapeHtml(NOTES.code || "WME01")} strategy route</span>
          <h2>${escapeHtml(NOTES.booklet.title)}</h2>
          <p>${escapeHtml(NOTES.booklet.detail || NOTES.intro || "")}</p>
        </div>
        <div class="ial-note-feature-actions">
          <a class="button primary" href="${escapeHtml(NOTES.booklet.href)}" target="_blank" rel="noreferrer">Open booklet</a>
          <a class="button light" href="ial/wme01/index.html#ialFilters">Open classified</a>
          <a class="button solution" href="ial/wme01/lab/index.html">Open lab</a>
        </div>
      `;
    }
    if (!els.notesGrid) return;
    els.notesGrid.innerHTML = (NOTES.topics || []).map((note, index) => {
      const topic = TOPICS.find((entry) => entry.slug === note.slug) || {};
      const count = topic.count || topic.primaryCount || 0;
      const number = String(index + 1).padStart(2, "0");
      const labHref = `ial/wme01/lab/index.html?topic=${encodeURIComponent(LAB_TOPIC_IDS[note.slug] || "modelling")}`;
      return `
        <article class="ial-note-card">
          <div class="ial-note-card-head">
            <span>${number}</span>
            <strong>${escapeHtml(note.title)}</strong>
          </div>
          <p>${escapeHtml(note.focus || "Strategy note and matching practice.")}</p>
          <div class="ial-note-meta">
            <span>${count ? `${count} classified questions` : "Topic strategy"}</span>
            <span>PDF note</span>
          </div>
          <div class="ial-note-actions">
            <a class="button primary" href="${escapeHtml(note.href)}" target="_blank" rel="noreferrer">Open notes</a>
            <a class="button light" href="${escapeHtml(notePracticeHref(note.slug))}">Practice</a>
            <a class="button solution light-solution" href="${escapeHtml(labHref)}">Lab</a>
          </div>
        </article>
      `;
    }).join("");
  }

  function paperSlug(item) {
    return `WME01_${item.year}_${item.session}`;
  }

  function courseQuestionIds() {
    return new Set(QUESTIONS.map((item) => item.id));
  }

  function solvedSet() {
    const validIds = courseQuestionIds();
    const saved = Array.isArray(state.solved) ? state.solved : [];
    return new Set(saved.filter((id) => validIds.has(id)));
  }

  function populateSelect(select, label, values, formatter = (value) => value) {
    select.innerHTML = `<option value="">${label}</option>` + values.map((value) => (
      `<option value="${escapeHtml(value)}">${escapeHtml(formatter(value))}</option>`
    )).join("");
  }

  function setupFilters() {
    const years = uniqueNumbers(QUESTIONS.map((item) => item.year)).sort((a, b) => b - a);
    const marks = uniqueNumbers(QUESTIONS.map((item) => item.marks));
    populateSelect(els.topic, "All topics", TOPICS.map((topic) => topic.slug), (slug) => {
      const topic = TOPICS.find((entry) => entry.slug === slug);
      return topic ? `${topic.name} (${topic.count})` : slug;
    });
    if (els.mockTopic) {
      populateSelect(els.mockTopic, "All topics", TOPICS.map((topic) => topic.slug), (slug) => {
        const topic = TOPICS.find((entry) => entry.slug === slug);
        return topic ? `${topic.name} (${topic.count})` : slug;
      });
    }
    populateSelect(els.year, "All years", years);
    populateSelect(els.session, "All sessions", ["Jan", "MayJune", "Oct"], (value) => value === "MayJune" ? "May/June" : value);
    populateSelect(els.marks, "All marks", marks, (value) => `${value} marks`);
  }

  function applyUrlFilters() {
    const params = new URLSearchParams(window.location.search);
    const requestedTopic = params.get("topic");
    const requestedMode = params.get("mode");
    if (els.expertise && (params.get("expertise") === "1" || params.get("bank") === "expertise" || requestedMode === "expertise")) {
      els.expertise.checked = true;
    }
    if (els.mistakeOnly && (requestedMode === "mistakes" || requestedMode === "review" || params.get("mistakes") === "1")) {
      els.mistakeOnly.checked = true;
    }
    if (requestedTopic && els.topic) {
      const match = TOPICS.find((topic) => topic.slug === requestedTopic || topic.name === requestedTopic);
      const value = match?.slug || requestedTopic;
      if ([...els.topic.options].some((option) => option.value === value)) {
        els.topic.value = value;
      }
    }
  }

  function currentFilters() {
    return {
      search: els.search.value.trim().toLowerCase(),
      topic: els.topic.value,
      year: els.year.value,
      session: els.session.value,
      marks: els.marks.value,
      expertise: els.expertise.checked,
      mistakeOnly: Boolean(els.mistakeOnly?.checked)
    };
  }

  function matches(item, filters) {
    const itemTopics = item.topics || [item.topic];
    if (filters.topic && !itemTopics.includes(filters.topic)) return false;
    if (filters.year && String(item.year) !== filters.year) return false;
    if (filters.session && item.session !== filters.session) return false;
    if (filters.marks && String(item.marks) !== filters.marks) return false;
    if (filters.expertise && item.qNo < 6) return false;
    if (filters.mistakeOnly && !state.mistakes[item.id]) return false;
    if (!filters.search) return true;
    const haystack = [
      item.id,
      item.paper,
      item.paperCode,
      item.topic,
      item.topicName,
      ...(item.topicNames || []),
      item.year,
      item.session,
      `q${item.qNo}`
    ].join(" ").toLowerCase();
    return haystack.includes(filters.search);
  }

  function applyFilters(keepCurrent = false) {
    const previousId = state.filtered[state.activeIndex]?.id;
    const filters = currentFilters();
    state.filtered = QUESTIONS.filter((item) => matches(item, filters));
    const nextIndex = keepCurrent && previousId ? state.filtered.findIndex((item) => item.id === previousId) : 0;
    state.activeIndex = Math.max(0, nextIndex);
    state.showSolution = false;
    render();
  }

  function splitFinalAnswer(answer) {
    let text = String(answer || "").trim().replace(/\s+/g, " ");
    text = text.replace(/\s*\$\\q?quad\s*((?:\([^)]+\))+)(\$?)\s*/g, (_match, label, close) => `\n$${label}${close ? "$" : ""} `);
    text = text.replace(/(?<=\.)\s+(?=\$\([a-d]\))/g, "\n");
    return text
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.replace(/^\$((?:\([^)]+\))+)\$\s*(?=\\)/, (_match, label) => `$${label}`))
      .map((line) => `<div class="ial-answer-line">${line}</div>`)
      .join("");
  }

  function saveTrainer() {
    writeJSON(TRAINER_KEY, state.trainer);
  }

  function normaliseAnswerText(value) {
    return String(value ?? "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\\\(|\\\)|\\\[|\\\]/g, "")
      .replace(/\$/g, "")
      .replace(/\\(?:dfrac|frac)\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, "$1/$2")
      .replace(/\\sqrt\s*\{([^{}]+)\}/g, "sqrt($1)")
      .replace(/\\(?:left|right|displaystyle|mathrm|text|quad|qquad|,|;|:|!)/g, "")
      .replace(/[{}]/g, "")
      .replace(/[\u2212\u2013]/g, "-")
      .replace(/\u00d7/g, "x")
      .replace(/\s+/g, "")
      .replace(/[.;,]+$/g, "")
      .toLowerCase();
  }

  function answerLooksMultipart(expected) {
    const raw = String(expected || "");
    return /(\([a-zivx]+\)|\\quad|,|;|\bor\b|\band\b|proven|counterexample|show|draw)/i.test(raw) || raw.length > 44;
  }

  function numericCandidate(value) {
    let text = normaliseAnswerText(value)
      .replace(/^[a-z][a-z0-9_]*=/, "")
      .replace(/^(?:answer|finalanswer|therefore|so)/, "")
      .replace(/(?:cm|mm|m|km|kg|g|n|s|h|hours?|years?|degrees?|degree|rad|%)$/i, "");
    if (/^[-+]?\d+(?:\.\d+)?\/[-+]?\d+(?:\.\d+)?$/.test(text)) {
      const [top, bottom] = text.split("/").map(Number);
      return bottom ? top / bottom : NaN;
    }
    if (/^[-+]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(text)) return Number(text);
    return NaN;
  }

  function compareFinalAnswer(studentAnswer, expectedAnswer) {
    const typed = String(studentAnswer || "").trim();
    const expected = String(expectedAnswer || "").trim();
    if (!typed) return { status: "idle", message: "Type your final answer first, then check or compare." };
    if (normaliseAnswerText(typed) === normaliseAnswerText(expected)) {
      return { status: "correct", message: "Looks right. Mark it as solved when you are happy with the working." };
    }
    if (!answerLooksMultipart(expected)) {
      const typedNumber = numericCandidate(typed);
      const expectedNumber = numericCandidate(expected);
      if (Number.isFinite(typedNumber) && Number.isFinite(expectedNumber) && Math.abs(typedNumber - expectedNumber) <= 1e-9) {
        return { status: "correct", message: "Looks right numerically. Check units/rounding before you mark it solved." };
      }
    }
    return { status: "compare", message: "Compare with the official final answer, then self-mark. Equivalent algebraic forms may still be correct." };
  }

  function trainerMessage(entry) {
    return entry?.message || "Try the final answer before opening the worked solution.";
  }

  function renderAnswerTrainer(item) {
    const entry = state.trainer[item.id] || {};
    const status = ["correct", "review", "compare"].includes(entry.status) ? entry.status : "";
    const inputId = `ial-answer-trainer-${item.id.replace(/[^a-z0-9_-]/gi, "-")}`;
    const showExpected = Boolean(item.finalAnswer && entry.showExpected);
    return `<section class="ial-answer-trainer ${status ? `is-${status}` : ""}" data-trainer-id="${escapeHtml(item.id)}">
      <div class="ial-answer-trainer-head">
        <span>Final answer trainer</span>
        <strong>${entry.status === "correct" ? "Solved check" : "Try first"}</strong>
      </div>
      <label for="${escapeHtml(inputId)}">Your final answer</label>
      <textarea id="${escapeHtml(inputId)}" data-trainer-input="${escapeHtml(item.id)}" rows="4" placeholder="Type the final answer only">${escapeHtml(entry.answer || "")}</textarea>
      <div class="ial-answer-trainer-actions">
        <button type="button" data-action="trainerCheck">Check</button>
        <button type="button" data-action="trainerCompare">Compare</button>
        <button type="button" data-action="trainerCorrect">I got it</button>
        <button type="button" data-action="trainerReview">Review</button>
      </div>
      <p>${escapeHtml(trainerMessage(entry))}</p>
      ${showExpected ? `<div class="ial-answer-trainer-final"><strong>Official final answer</strong><div class="ial-math">${splitFinalAnswer(item.finalAnswer)}</div></div>` : ""}
    </section>`;
  }

  function renderNumbers() {
    els.numbers.innerHTML = state.filtered.map((item, index) => (
      `<button type="button" class="${index === state.activeIndex ? "is-active" : ""}" data-index="${index}" aria-label="Open ${escapeHtml(item.paper)} question ${item.qNo} (item ${index + 1} of ${state.filtered.length})">${index + 1}</button>`
    )).join("");
  }

  function renderQuestion() {
    const item = state.filtered[state.activeIndex];
    if (!item) {
      els.stage.innerHTML = '<div class="ial-empty">No WME01 questions match these filters yet.</div>';
      return;
    }
    const solvedOn = state.solved.includes(item.id);
    const mistakeOn = Boolean(state.mistakes[item.id]);
    const selectedTopic = els.topic.value;
    const activeTopic = selectedTopic && (item.topics || [item.topic]).includes(selectedTopic) ? selectedTopic : item.primaryTopic || item.topic;
    const activeTopicName = topicName(activeTopic, item.topicName);
    const isCrossView = activeTopic !== (item.primaryTopic || item.topic);
    const secondaryNames = item.secondaryTopicNames || [];
    const topicBadges = `
      <span class="ial-pill">${escapeHtml(activeTopicName)}</span>
      ${isCrossView ? `<span class="ial-pill">Primary: ${escapeHtml(item.primaryTopicName || item.topicName)}</span>` : ""}
      ${!isCrossView && secondaryNames.length ? `<span class="ial-pill">Also: ${escapeHtml(secondaryNames.join(", "))}</span>` : ""}
    `;
    const steps = (item.steps || []).map((step, index) => `
      <section class="ial-step">
        <strong>${index + 1}. ${escapeHtml(step.title)}</strong>
        <div class="ial-math">${step.body || ""}</div>
      </section>
    `).join("");
    els.stage.innerHTML = `
      <div class="ial-question-card ${state.showSolution ? "solution-open" : ""}">
        <header class="ial-question-head">
          <div>
            <span class="eyebrow">${escapeHtml(item.paper)}</span>
            <h2>Question ${item.qNo}</h2>
          </div>
          <div class="ial-meta">
            <span class="ial-pill">${item.marks} marks</span>
            ${topicBadges}
            <span class="ial-pill">${sessionLabel(item.session)} ${item.year}</span>
          </div>
        </header>
        <div class="ial-practice-layout">
          <div class="ial-question-image-wrap">
            <img class="ial-question-image" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.id)}" loading="eager">
          </div>
          ${renderAnswerTrainer(item)}
        </div>
        <div class="ial-actions">
          <button class="button light ${solvedOn ? "is-on" : ""}" type="button" data-action="solved" aria-pressed="${solvedOn}">${solvedOn ? "Solved" : "Mark solved"}</button>
          <button class="button light ${mistakeOn ? "is-on" : ""}" type="button" data-action="mistake" aria-pressed="${mistakeOn}">${mistakeOn ? "In Mistake box" : "Mistake box"}</button>
          <button class="button primary" type="button" data-action="solution">${state.showSolution ? "Hide solution" : "Show solution"}</button>
          <a class="button light" href="${escapeHtml(item.image)}" download="${escapeHtml(item.downloadName)}">Download PNG</a>
        </div>
        <section class="ial-solution" aria-label="Worked solution">
          <h3>Worked solution</h3>
          ${steps}
          <div class="ial-final">
            <strong>Final answer</strong>
            <div class="ial-math">${splitFinalAnswer(item.finalAnswer)}</div>
          </div>
        </section>
      </div>
    `;
    if (window.MathJax?.typesetPromise) {
      window.MathJax.typesetPromise([els.stage]).catch(() => {});
    }
  }

  function renderStats() {
    els.total.textContent = QUESTIONS.length;
    els.filtered.textContent = state.filtered.length;
    els.solved.textContent = solvedSet().size;
    els.mistakes.textContent = Object.keys(state.mistakes || {}).filter((id) => QUESTIONS.some((item) => item.id === id)).length;
    const item = state.filtered[state.activeIndex];
    const selectedTopic = els.topic.value;
    const labelTopic = item && selectedTopic && (item.topics || [item.topic]).includes(selectedTopic)
      ? topicName(selectedTopic, item.topicName)
      : item?.topicName;
    els.label.textContent = item
      ? `${state.activeIndex + 1} of ${state.filtered.length} - ${labelTopic}`
      : "No matching questions";
    els.prev.disabled = state.activeIndex <= 0;
    els.next.disabled = state.activeIndex >= state.filtered.length - 1;
  }

  function topicRows() {
    const solved = solvedSet();
    const mistakes = state.mistakes || {};
    return TOPICS.map((topic) => {
      const items = QUESTIONS.filter((item) => (item.topics || [item.topic]).includes(topic.slug));
      const solvedCount = items.filter((item) => solved.has(item.id)).length;
      const mistakeCount = items.filter((item) => Boolean(mistakes[item.id])).length;
      const total = items.length || topic.count || 0;
      const percent = total ? Math.round((solvedCount / total) * 100) : 0;
      return { topic, items, total, solved: solvedCount, mistakes: mistakeCount, percent };
    });
  }

  function renderProgress() {
    if (!els.progressTopics) return;
    const rows = topicRows();
    const solved = solvedSet();
    const mistakeCount = Object.keys(state.mistakes || {}).filter((id) => QUESTIONS.some((item) => item.id === id)).length;
    const overall = QUESTIONS.length ? Math.round((solved.size / QUESTIONS.length) * 100) : 0;
    const started = rows.filter((row) => row.solved > 0).length;
    const weak = rows.filter((row) => row.mistakes > 0 || (row.solved > 0 && row.percent < 45)).length;
    if (els.progressPercent) els.progressPercent.textContent = `${overall}%`;
    if (els.progressBar) els.progressBar.style.width = `${overall}%`;
    if (els.progressStarted) els.progressStarted.textContent = started;
    if (els.progressWeak) els.progressWeak.textContent = weak;
    if (els.progressMistakes) els.progressMistakes.textContent = mistakeCount;
    els.progressTopics.innerHTML = rows.map((row) => `
      <article class="ial-progress-topic" data-progress="${row.percent}">
        <div class="ial-progress-topic-head">
          <div>
            <strong>${escapeHtml(row.topic.name)}</strong>
            <span>${row.solved} of ${row.total} solved${row.mistakes ? ` | ${row.mistakes} in Mistake Box` : ""}</span>
          </div>
          <button class="button light" type="button" data-ial-topic-filter="${escapeHtml(row.topic.slug)}">Practice</button>
        </div>
        <div class="ial-topic-meter" aria-label="${escapeHtml(row.topic.name)} ${row.percent}% solved">
          <i style="width:${row.percent}%"></i>
        </div>
      </article>
    `).join("");
  }

  function paperRows() {
    const groups = new Map();
    QUESTIONS.forEach((item) => {
      const key = `${item.year}_${item.session}`;
      if (!groups.has(key)) {
        groups.set(key, {
          year: Number(item.year),
          session: item.session,
          paper: item.paper,
          questions: 0,
          marks: 0,
          first: item
        });
      }
      const group = groups.get(key);
      group.questions += 1;
      group.marks += Number(item.marks || 0);
    });
    return [...groups.values()].sort((a, b) => (
      b.year - a.year || sessionOrder(b.session) - sessionOrder(a.session)
    ));
  }

  function renderPaperLibrary() {
    if (!els.paperList) return;
    els.paperList.innerHTML = paperRows().map((row) => {
      const slug = paperSlug(row.first);
      return `
        <article class="ial-paper-row">
          <div>
            <span>${sessionLabel(row.session)} ${row.year}</span>
            <strong>${escapeHtml(row.paper)}</strong>
            <small>${row.questions} questions | ${row.marks} marks</small>
          </div>
          <div class="ial-paper-actions">
            <a class="button primary" href="downloads/IAL/WME01/Papers/${slug}_QP.pdf" target="_blank" rel="noreferrer">Question Paper</a>
            <a class="button solution" href="downloads/IAL/WME01/Papers/${slug}_Solutions.pdf?v=wme01-full-20260612" target="_blank" rel="noreferrer">Worked Solution</a>
          </div>
        </article>
      `;
    }).join("");
  }

  function topicName(slug, fallback = "") {
    return TOPICS.find((topic) => topic.slug === slug)?.name || fallback || slug;
  }

  function visualQuestionItems(topicSlug = "") {
    return QUESTIONS
      .filter((item) => !topicSlug || (item.topics || [item.topic]).includes(topicSlug))
      .sort((a, b) => (
        Number(b.year || 0) - Number(a.year || 0) ||
        sessionOrder(b.session) - sessionOrder(a.session) ||
        Number(a.qNo || 0) - Number(b.qNo || 0)
      ));
  }

  function visualQuestionLabel(item) {
    return `${sessionLabel(item.session)} ${item.year} | Q${item.qNo} | ${topicName(item.primaryTopic || item.topic, item.topicName)} | ${item.marks}m`;
  }

  function setupVisualizer() {
    if (!els.visualTopic || !els.visualQuestion) return;
    const params = new URLSearchParams(window.location.search);
    populateSelect(els.visualTopic, "All mechanics topics", TOPICS.map((topic) => topic.slug), (slug) => {
      const topic = TOPICS.find((entry) => entry.slug === slug);
      return topic ? `${topic.name} (${topic.count})` : slug;
    });
    const requestedTopic = params.get("topic");
    if (requestedTopic) {
      const match = TOPICS.find((topic) => topic.slug === requestedTopic || topic.name === requestedTopic);
      if (match) els.visualTopic.value = match.slug;
    }
    syncVisualizerQuestions(params.get("question") || "");
  }

  function syncVisualizerQuestions(preferredId = "") {
    if (!els.visualQuestion) return;
    const items = visualQuestionItems(els.visualTopic?.value || "");
    els.visualQuestion.innerHTML = items.map((item) => (
      `<option value="${escapeHtml(item.id)}">${escapeHtml(visualQuestionLabel(item))}</option>`
    )).join("");
    els.visualQuestion.disabled = !items.length;
    const nextId = preferredId || els.visualQuestion.value;
    if (items.some((item) => item.id === nextId)) {
      els.visualQuestion.value = nextId;
    } else if (items.length) {
      els.visualQuestion.value = items[0].id;
    }
    renderVisualizer();
  }

  function activeVisualizerItem() {
    const id = els.visualQuestion?.value || "";
    return QUESTIONS.find((item) => item.id === id) || visualQuestionItems(els.visualTopic?.value || "")[0] || null;
  }

  function selectedVisualizerTopic(item) {
    const requested = els.visualTopic?.value || "";
    const itemTopics = item ? (item.topics || [item.topic]) : [];
    if (requested && itemTopics.includes(requested)) return requested;
    return item?.primaryTopic || item?.topic || requested || TOPICS[0]?.slug || "";
  }

  function visualizerLabHref(topicSlug) {
    const labTopic = LAB_TOPIC_IDS[topicSlug] || "modelling";
    return `ial/wme01/lab/index.html?topic=${encodeURIComponent(labTopic)}`;
  }

  function visualSeed(item) {
    return String(item?.id || "").split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) + Number(item?.marks || 0) * 13;
  }

  function questionText(item) {
    return [
      item?.topicName,
      item?.primaryTopicName,
      ...(item?.secondaryTopicNames || []),
      item?.finalAnswer,
      ...((item?.steps || []).flatMap((step) => [step.title, step.body]))
    ].join(" ").toLowerCase();
  }

  function drawVisualizerCanvas(item, topicSlug) {
    const canvas = els.visualCanvas;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(480, Math.floor(rect.width || canvas.clientWidth || 960));
    const height = Math.max(300, Math.floor(rect.height || width * 7 / 12 || 560));
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const seed = visualSeed(item);
    const text = questionText(item);
    const model = VISUALIZER_MODELS[topicSlug] || VISUALIZER_MODELS["01_QuantitiesUnitsModelling"];
    const colors = {
      bg: "#0d182c",
      grid: "rgba(255,255,255,0.07)",
      ink: "#eef7f5",
      muted: "#a9b7cc",
      teal: "#2dd4bf",
      gold: "#dcb877",
      blue: "#7aa7ff",
      red: "#fb7185",
      green: "#6ee7b7"
    };

    const label = (content, x, y, color = colors.ink, font = "700 13px Sora, Segoe UI, sans-serif", align = "left") => {
      ctx.fillStyle = color;
      ctx.font = font;
      ctx.textAlign = align;
      ctx.fillText(content, x, y);
    };
    const line = (x1, y1, x2, y2, color = colors.ink, widthLine = 2) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = widthLine;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    };
    const arrow = (x1, y1, x2, y2, color = colors.teal, caption = "", widthLine = 3) => {
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const head = 13;
      line(x1, y1, x2, y2, color, widthLine);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - head * Math.cos(angle - 0.48), y2 - head * Math.sin(angle - 0.48));
      ctx.lineTo(x2 - head * Math.cos(angle + 0.48), y2 - head * Math.sin(angle + 0.48));
      ctx.closePath();
      ctx.fill();
      if (caption) label(caption, (x1 + x2) / 2 + 8, (y1 + y2) / 2 - 8, color, "800 12px Sora, Segoe UI, sans-serif");
    };
    const box = (x, y, w, h, fill, stroke = "rgba(255,255,255,0.24)") => {
      ctx.fillStyle = fill;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 10);
      ctx.fill();
      ctx.stroke();
    };
    const circle = (x, y, r, fill) => {
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    };

    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);
    for (let x = 24; x < width; x += 36) line(x, 0, x, height, colors.grid, 1);
    for (let y = 24; y < height; y += 36) line(0, y, width, y, colors.grid, 1);
    label(model.title, 22, 30, colors.ink, "900 16px Sora, Segoe UI, sans-serif");
    label(`${item.paper} | Q${item.qNo}`, 22, 52, colors.muted, "700 12px Sora, Segoe UI, sans-serif");

    const cx = width * 0.5;
    const cy = height * 0.56;
    const floorY = height - 62;
    const offset = (seed % 7) * 4;

    if (topicSlug === "02_WorkingWithVectors") {
      line(72, floorY - 12, width - 58, floorY - 12, "rgba(255,255,255,0.4)", 2);
      line(88, height - 48, 88, 92, "rgba(255,255,255,0.4)", 2);
      arrow(88, floorY - 12, 210 + offset, 150, colors.teal, "a");
      arrow(88, floorY - 12, 320 + offset, 250, colors.gold, "b");
      arrow(88, floorY - 12, 420 + offset, 122, colors.green, "resultant");
      if (/bearing/.test(text)) {
        ctx.beginPath();
        ctx.arc(88, floorY - 12, 70, -Math.PI / 2, -0.25);
        ctx.strokeStyle = colors.blue;
        ctx.lineWidth = 2;
        ctx.stroke();
        label("bearing", 132, floorY - 86, colors.blue);
      }
      label("resolve into i and j first", width - 240, height - 32, colors.muted);
      return;
    }

    if (topicSlug === "03_KinematicsGraphs") {
      line(70, floorY, width - 54, floorY, colors.muted, 2);
      line(70, floorY, 70, 82, colors.muted, 2);
      label("t", width - 66, floorY + 24, colors.muted);
      label(/displacement|distance/.test(text) ? "s" : "v", 45, 90, colors.muted);
      ctx.fillStyle = "rgba(45,212,191,0.22)";
      ctx.beginPath();
      ctx.moveTo(92, floorY);
      ctx.lineTo(150, 170);
      ctx.lineTo(330, 170 + (seed % 3) * 20);
      ctx.lineTo(490, 285);
      ctx.lineTo(570, floorY);
      ctx.closePath();
      ctx.fill();
      line(92, floorY, 150, 170, colors.teal, 4);
      line(150, 170, 330, 170 + (seed % 3) * 20, colors.gold, 4);
      line(330, 170 + (seed % 3) * 20, 570, floorY, colors.teal, 4);
      label("area = displacement", 180, floorY - 48, colors.gold);
      label("gradient = acceleration", 230, 122, colors.teal);
      return;
    }

    if (topicSlug === "04_ConstantAcceleration1D") {
      line(58, cy, width - 56, cy, colors.muted, 3);
      for (let i = 0; i < 5; i += 1) {
        const x = 100 + i * ((width - 210) / 4);
        circle(x, cy, 6, i === 0 ? colors.gold : colors.teal);
        label(i === 0 ? "start" : `${i}s`, x - 16, cy + 28, colors.muted);
      }
      const start = 118 + offset;
      arrow(start, cy - 42, start + 130, cy - 42, colors.teal, "u");
      arrow(start + 230, cy - 72, start + 410, cy - 72, colors.green, "v");
      arrow(start + 190, cy + 48, start + 310, cy + 48, colors.gold, "a");
      label(/vertical|height|upward|downward/.test(text) ? "choose up/down signs before SUVAT" : "choose one positive direction before SUVAT", 88, 86, colors.ink);
      return;
    }

    if (topicSlug === "05_ConstantAcceleration2D") {
      line(62, floorY, width - 56, floorY, colors.muted, 2);
      line(82, floorY, 82, 78, colors.muted, 2);
      ctx.strokeStyle = colors.teal;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(82, floorY - 4);
      for (let t = 0; t <= 1; t += 0.04) {
        const x = 82 + t * (width - 180);
        const y = floorY - 4 - Math.sin(t * Math.PI) * (160 + (seed % 5) * 14);
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      arrow(82, floorY - 4, 176, floorY - 92, colors.gold, "u");
      arrow(190, floorY - 20, 320, floorY - 20, colors.blue, "u cos theta");
      arrow(190, floorY - 22, 190, floorY - 136, colors.green, "u sin theta");
      arrow(width - 140, 115, width - 140, 205, colors.red, "g");
      label("horizontal and vertical equations run together", 98, 82, colors.ink);
      return;
    }

    if (topicSlug === "06_Forces") {
      circle(cx, cy, 26, "rgba(45,212,191,0.95)");
      arrow(cx, cy, cx, cy - 132, colors.gold, "R");
      arrow(cx, cy, cx, cy + 132, colors.red, "mg");
      arrow(cx, cy, cx + 150, cy, colors.teal, /tension|string/.test(text) ? "T" : "F");
      arrow(cx, cy, cx - 120, cy + 22, colors.blue, /friction|rough/.test(text) ? "friction" : "P");
      label(/equilibrium/.test(text) ? "equilibrium: resultant = 0" : "resultant force sets the motion", 86, 88, colors.ink);
      return;
    }

    if (topicSlug === "07_NewtonsSecondLaw") {
      const pulley = /pulley|string|connected/.test(text);
      if (pulley) {
        line(94, 120, width - 96, 120, colors.muted, 3);
        circle(cx, 120, 34, "rgba(122,167,255,0.9)");
        line(cx, 120, cx, cy + 40, colors.gold, 4);
        box(cx - 44, cy + 40, 88, 56, "rgba(45,212,191,0.72)");
        arrow(cx + 70, cy + 70, cx + 160, cy + 70, colors.teal, "a");
        arrow(cx - 110, cy + 90, cx - 110, cy + 178, colors.red, "mg");
        label("same string: same acceleration magnitude", 84, height - 34, colors.muted);
      } else {
        line(70, floorY, width - 70, floorY, colors.muted, 3);
        box(cx - 70, floorY - 72, 140, 70, "rgba(45,212,191,0.72)");
        circle(cx - 40, floorY + 2, 12, colors.muted);
        circle(cx + 40, floorY + 2, 12, colors.muted);
        arrow(cx - 84, floorY - 38, cx - 190, floorY - 38, colors.blue, "resistance");
        arrow(cx + 78, floorY - 38, cx + 210, floorY - 38, colors.gold, "F");
        arrow(cx + 20, floorY - 104, cx + 138, floorY - 104, colors.teal, "a");
        label("resultant force = mass x acceleration", 92, 88, colors.ink);
      }
      return;
    }

    if (topicSlug === "08_ResolvingForcesInclinedPlanes") {
      const left = width * 0.22;
      const right = width * 0.82;
      const base = floorY;
      const top = floorY - 190;
      line(left, base, right, top, colors.muted, 4);
      line(left, base, right, base, "rgba(255,255,255,0.22)", 2);
      ctx.save();
      ctx.translate(cx, floorY - 104);
      ctx.rotate(-0.35);
      box(-48, -28, 96, 56, "rgba(45,212,191,0.78)");
      ctx.restore();
      arrow(cx, floorY - 104, cx, floorY + 44, colors.red, "mg");
      arrow(cx, floorY - 104, cx - 72, floorY - 232, colors.gold, "R");
      arrow(cx, floorY - 104, cx + 126, floorY - 150, colors.teal, /friction|rough/.test(text) ? "friction" : "component");
      label("resolve parallel and perpendicular to the plane", 78, 82, colors.ink);
      return;
    }

    if (topicSlug === "09_MomentumImpulseCollisions") {
      line(62, floorY, width - 54, floorY, colors.muted, 3);
      box(105, floorY - 58, 96, 54, "rgba(122,167,255,0.8)");
      box(width - 220, floorY - 58, 104, 54, "rgba(45,212,191,0.78)");
      arrow(218, floorY - 32, 330, floorY - 32, colors.gold, "u1");
      arrow(width - 232, floorY - 32, width - 340, floorY - 32, colors.red, "u2");
      arrow(cx - 28, floorY - 128, cx + 94, floorY - 128, colors.teal, "impulse");
      label(/restitution|coefficient/.test(text) ? "use separation speed = e x approach speed" : "total momentum before = total momentum after", 84, 90, colors.ink);
      label("before", 116, floorY + 30, colors.muted);
      label("after", width - 202, floorY + 30, colors.muted);
      return;
    }

    if (topicSlug === "10_Moments") {
      line(74, cy, width - 74, cy, colors.gold, 8);
      const pivotX = /tilt|tilting|point of/.test(text) ? width * 0.68 : cx;
      ctx.fillStyle = colors.blue;
      ctx.beginPath();
      ctx.moveTo(pivotX, cy + 8);
      ctx.lineTo(pivotX - 34, cy + 76);
      ctx.lineTo(pivotX + 34, cy + 76);
      ctx.closePath();
      ctx.fill();
      arrow(width * 0.28, cy - 78, width * 0.28, cy - 8, colors.red, "weight");
      arrow(width * 0.48, cy - 78, width * 0.48, cy - 8, colors.red, "load");
      arrow(width * 0.78, cy + 70, width * 0.78, cy + 8, colors.teal, "reaction");
      ctx.beginPath();
      ctx.arc(pivotX, cy, 72, 0.35, 1.85);
      ctx.strokeStyle = colors.green;
      ctx.lineWidth = 3;
      ctx.stroke();
      label("moment = force x perpendicular distance", 86, 86, colors.ink);
      label("pivot", pivotX - 18, cy + 98, colors.muted);
      return;
    }

    const cards = [
      ["Real situation", /smooth|rough|resistance|particle|rod|string/.test(text) ? "pick the model words" : "read the physical story"],
      ["Simplified model", model.focus],
      ["Equation choice", "units, signs, forces and motion"]
    ];
    cards.forEach(([title, body], index) => {
      const x = 70 + index * ((width - 160) / 3);
      const w = (width - 210) / 3;
      box(x, cy - 86, w, 128, index === 1 ? "rgba(45,212,191,0.24)" : "rgba(255,255,255,0.08)");
      label(title, x + 18, cy - 44, index === 1 ? colors.teal : colors.gold, "900 13px Sora, Segoe UI, sans-serif");
      label(body, x + 18, cy - 14, colors.ink, "700 12px Sora, Segoe UI, sans-serif");
      if (index < 2) arrow(x + w + 6, cy - 20, x + w + 42, cy - 20, colors.muted, "");
    });
  }

  function renderVisualizer() {
    if (!els.visualQuestion || !els.visualImage || !els.visualCanvas) return;
    const item = activeVisualizerItem();
    if (!item) {
      if (els.visualMeta) els.visualMeta.textContent = "No WME01 question selected";
      if (els.visualSteps) els.visualSteps.innerHTML = "";
      if (els.visualFinal) els.visualFinal.innerHTML = "";
      return;
    }
    const topicSlug = selectedVisualizerTopic(item);
    const topicLabel = topicName(topicSlug, item.topicName);
    const model = VISUALIZER_MODELS[topicSlug] || VISUALIZER_MODELS["01_QuantitiesUnitsModelling"];
    const secondary = (item.secondaryTopicNames || []).length ? item.secondaryTopicNames.join(", ") : "single-topic question";
    const labHref = visualizerLabHref(topicSlug);
    if (els.visualOpenLab) els.visualOpenLab.href = labHref;
    if (els.visualMeta) els.visualMeta.textContent = `${item.paper} | Q${item.qNo} | ${item.marks} marks`;
    if (els.visualSimTitle) els.visualSimTitle.textContent = model.title;
    els.visualImage.src = item.image;
    els.visualImage.alt = `${item.paper} question ${item.qNo}`;
    if (els.visualReadouts) {
      const readouts = [
        ["Selected topic", topicLabel],
        ["Paper", `${sessionLabel(item.session)} ${item.year}`],
        ["Marks", `${item.marks} marks`],
        ["Model focus", model.focus],
        ["Also touches", secondary],
        ["Full lab", LAB_TOPIC_IDS[topicSlug] || "modelling"]
      ];
      els.visualReadouts.innerHTML = readouts.map(([label, value]) => (
        `<span><strong>${escapeHtml(label)}</strong>${escapeHtml(value)}</span>`
      )).join("");
    }
    if (els.visualSteps) {
      els.visualSteps.innerHTML = (item.steps || []).map((step, index) => `
        <section class="ial-step">
          <strong>${index + 1}. ${escapeHtml(step.title)}</strong>
          <div class="ial-math">${step.body || ""}</div>
        </section>
      `).join("");
    }
    if (els.visualFinal) els.visualFinal.innerHTML = splitFinalAnswer(item.finalAnswer);
    drawVisualizerCanvas(item, topicSlug);
    if (window.MathJax?.typesetPromise) {
      window.MathJax.typesetPromise([els.visualSteps, els.visualFinal].filter(Boolean)).catch(() => {});
    }
  }

  function openVisualizerQuestionInBank() {
    const item = activeVisualizerItem();
    if (!item) return;
    const topicSlug = selectedVisualizerTopic(item);
    if (els.search) els.search.value = "";
    if (els.topic) els.topic.value = topicSlug;
    if (els.year) els.year.value = "";
    if (els.session) els.session.value = "";
    if (els.marks) els.marks.value = "";
    if (els.expertise) els.expertise.checked = false;
    if (els.mistakeOnly) els.mistakeOnly.checked = false;
    state.filtered = QUESTIONS.filter((question) => matches(question, currentFilters()));
    const index = state.filtered.findIndex((question) => question.id === item.id);
    state.activeIndex = Math.max(0, index);
    state.showSolution = false;
    setActiveModule("classified");
    if (window.location.hash !== "#ialQuestionStage") history.replaceState(null, "", "#ialQuestionStage");
    render();
    els.stage?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  function render() {
    renderStats();
    renderProgress();
    renderPaperLibrary();
    renderNumbers();
    renderQuestion();
    renderMock();
    renderVisualizer();
  }

  function shuffle(items) {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
  }

  function mockPool() {
    const topic = els.mockTopic?.value || "";
    const expertise = Boolean(els.mockExpertise?.checked);
    return QUESTIONS
      .filter((item) => !topic || (item.topics || [item.topic]).includes(topic))
      .filter((item) => !expertise || item.qNo >= 6);
  }

  function generateMock() {
    const count = Number(els.mockCount?.value || 8);
    state.mock = shuffle(mockPool()).slice(0, Math.max(1, count));
    renderMock();
  }

  function renderMock() {
    if (!els.mockSummary || !els.mockList) return;
    if (!state.mock.length) {
      els.mockSummary.textContent = "No mock generated yet.";
      els.mockList.innerHTML = "";
      return;
    }
    const totalMarks = state.mock.reduce((sum, item) => sum + Number(item.marks || 0), 0);
    els.mockSummary.textContent = `${state.mock.length} questions | ${totalMarks} marks`;
    els.mockList.innerHTML = state.mock.map((item, index) => `
      <article class="ial-mock-item">
        <span class="ial-mock-index">${index + 1}</span>
        <div>
          <strong>${escapeHtml(item.paper)} - Question ${item.qNo}</strong>
          <span>${escapeHtml(item.topicName)} | ${item.marks} marks</span>
        </div>
        <a href="#ialQuestionStage" data-ial-mock-open="${escapeHtml(item.id)}">Open</a>
      </article>
    `).join("");
  }

  function solutionHtml(item) {
    const steps = (item.steps || []).map((step, index) => `
      <section class="ial-step">
        <strong>${index + 1}. ${escapeHtml(step.title)}</strong>
        <div class="ial-math">${step.body || ""}</div>
      </section>
    `).join("");
    return `
      <section class="ial-solution" style="display:block">
        <h3>Worked solution</h3>
        ${steps}
        <div class="ial-final">
          <strong>Final answer</strong>
          <div class="ial-math">${splitFinalAnswer(item.finalAnswer)}</div>
        </div>
      </section>
    `;
  }

  function printMock(includeSolutions = false) {
    if (!state.mock.length) generateMock();
    const printArea = document.createElement("section");
    printArea.className = "ial-print-area";
    printArea.innerHTML = state.mock.map((item, index) => `
      <article class="ial-print-page">
        <h2>WME01 Mechanics 1 Mock - Question ${index + 1}</h2>
        <div class="ial-print-meta">${escapeHtml(item.paper)} | Q${item.qNo} | ${escapeHtml(item.topicName)} | ${item.marks} marks</div>
        <img class="ial-print-question" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.id)}">
        ${includeSolutions ? solutionHtml(item) : ""}
      </article>
    `).join("");
    document.body.appendChild(printArea);

    const finish = () => {
      document.body.classList.add("print-ial-mock");
      window.print();
      setTimeout(() => {
        document.body.classList.remove("print-ial-mock");
        printArea.remove();
      }, 600);
    };
    const images = [...printArea.querySelectorAll("img")];
    Promise.all(images.map((image) => image.complete ? true : new Promise((resolve) => {
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", resolve, { once: true });
    })))
      .then(() => window.MathJax?.typesetPromise ? window.MathJax.typesetPromise([printArea]) : undefined)
      .then(finish)
      .catch(finish);
  }

  function openMockQuestion(id) {
    const index = QUESTIONS.findIndex((item) => item.id === id);
    if (index < 0) return;
    state.filtered = QUESTIONS;
    state.activeIndex = index;
    state.showSolution = false;
    render();
    els.stage?.scrollIntoView({ block: "start" });
  }

  function move(delta) {
    if (!state.filtered.length) return;
    state.activeIndex = Math.max(0, Math.min(state.filtered.length - 1, state.activeIndex + delta));
    state.showSolution = false;
    render();
  }

  function toggleSolved(item) {
    const set = new Set(Array.isArray(state.solved) ? state.solved : []);
    if (set.has(item.id)) set.delete(item.id);
    else set.add(item.id);
    state.solved = [...set];
    writeJSON(SOLVED_KEY, state.solved);
  }

  function toggleMistake(item) {
    const mistakes = { ...state.mistakes };
    if (mistakes[item.id]) delete mistakes[item.id];
    else {
      mistakes[item.id] = {
        id: item.id,
        paper: item.paper,
        qNo: item.qNo,
        topic: item.topicName,
        marks: item.marks,
        addedAt: new Date().toISOString()
      };
    }
    state.mistakes = mistakes;
    writeJSON(MISTAKE_KEY, state.mistakes);
  }

  function markSolved(item) {
    const set = new Set(Array.isArray(state.solved) ? state.solved : []);
    set.add(item.id);
    state.solved = [...set];
    writeJSON(SOLVED_KEY, state.solved);
  }

  function addMistake(item) {
    const mistakes = { ...state.mistakes };
    mistakes[item.id] = {
      id: item.id,
      paper: item.paper,
      qNo: item.qNo,
      topic: item.topicName,
      marks: item.marks,
      addedAt: new Date().toISOString()
    };
    state.mistakes = mistakes;
    writeJSON(MISTAKE_KEY, state.mistakes);
  }

  function handleTrainerAction(item, action, container) {
    const input = container?.querySelector("[data-trainer-input]");
    const answer = input ? input.value : state.trainer[item.id]?.answer || "";
    const previous = state.trainer[item.id] || {};
    const next = {
      ...previous,
      answer,
      attempts: action === "trainerCheck" ? Number(previous.attempts || 0) + 1 : Number(previous.attempts || 0),
      updatedAt: new Date().toISOString()
    };
    if (action === "trainerCheck") {
      const result = compareFinalAnswer(answer, item.finalAnswer);
      state.trainer[item.id] = { ...next, status: result.status, message: result.message, showExpected: result.status !== "correct" };
      saveTrainer();
      render();
      return;
    }
    if (action === "trainerCompare") {
      state.trainer[item.id] = { ...next, status: "compare", message: "Compare carefully, then choose I got it or Review.", showExpected: true };
      saveTrainer();
      render();
      return;
    }
    if (action === "trainerCorrect") {
      state.trainer[item.id] = { ...next, status: "correct", message: "Nice. Saved as solved.", showExpected: false };
      markSolved(item);
      saveTrainer();
      render();
      return;
    }
    if (action === "trainerReview") {
      state.trainer[item.id] = { ...next, status: "review", message: "Saved to the Mistake Box for another attempt.", showExpected: true };
      addMistake(item);
      saveTrainer();
      render();
    }
  }

  function bindEvents() {
    els.filters.addEventListener("input", () => applyFilters(true));
    els.filters.addEventListener("change", () => applyFilters(true));
    els.reset.addEventListener("click", () => {
      els.filters.reset();
      applyFilters(false);
    });
    els.prev.addEventListener("click", () => move(-1));
    els.next.addEventListener("click", () => move(1));
    els.numbers.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-index]");
      if (!button) return;
      state.activeIndex = Number(button.dataset.index) || 0;
      state.showSolution = false;
      render();
    });
    els.stage.addEventListener("click", (event) => {
      const button = event.target.closest("[data-action]");
      if (!button) return;
      const item = state.filtered[state.activeIndex];
      if (!item) return;
      if (button.dataset.action.startsWith("trainer")) {
        handleTrainerAction(item, button.dataset.action, button.closest(".ial-answer-trainer"));
        return;
      }
      if (button.dataset.action === "solution") state.showSolution = !state.showSolution;
      if (button.dataset.action === "solved") toggleSolved(item);
      if (button.dataset.action === "mistake") {
        toggleMistake(item);
        if (els.mistakeOnly?.checked) {
          applyFilters(true);
          return;
        }
      }
      render();
    });
    els.stage.addEventListener("input", (event) => {
      const input = event.target.closest("[data-trainer-input]");
      if (!input) return;
      const id = input.dataset.trainerInput;
      state.trainer[id] = {
        ...(state.trainer[id] || {}),
        answer: input.value,
        updatedAt: new Date().toISOString()
      };
      saveTrainer();
    });
    els.mockGenerate?.addEventListener("click", generateMock);
    els.mockPrint?.addEventListener("click", () => printMock(false));
    els.mockPrintSolutions?.addEventListener("click", () => printMock(true));
    els.mockTopic?.addEventListener("change", () => { state.mock = []; renderMock(); });
    els.mockCount?.addEventListener("change", () => { state.mock = []; renderMock(); });
    els.mockExpertise?.addEventListener("change", () => { state.mock = []; renderMock(); });
    els.mockList?.addEventListener("click", (event) => {
      const link = event.target.closest("[data-ial-mock-open]");
      if (!link) return;
      event.preventDefault();
      openMockQuestion(link.dataset.ialMockOpen);
    });
    els.progressTopics?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-ial-topic-filter]");
      if (!button || !els.topic) return;
      els.topic.value = button.dataset.ialTopicFilter || "";
      setActiveModule("classified");
      if (window.location.hash !== "#ialFilters") {
        history.replaceState(null, "", "#ialFilters");
      }
      applyFilters(false);
      els.filters?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
    els.visualTopic?.addEventListener("change", () => syncVisualizerQuestions());
    els.visualQuestion?.addEventListener("change", renderVisualizer);
    els.visualOpenBank?.addEventListener("click", openVisualizerQuestionInBank);
    window.addEventListener("resize", () => renderVisualizer());
    window.addEventListener("hashchange", () => {
      handleModuleRoute({ scroll: true });
      requestAnimationFrame(renderVisualizer);
    });
  }

  function init() {
    setupFilters();
    renderNotes();
    setupVisualizer();
    applyUrlFilters();
    bindEvents();
    handleModuleRoute();
    applyFilters(false);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
