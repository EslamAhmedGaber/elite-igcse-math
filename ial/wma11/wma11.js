(function () {
  const QUESTIONS = window.WMA11_QUESTIONS || [];
  const TOPICS = window.WMA11_TOPICS || [];
  const SOLVED_KEY = "eliteWMA11SolvedV1";
  const MISTAKE_KEY = "eliteWMA11MistakeBoxV1";
  const state = {
    filtered: [],
    activeIndex: 0,
    showSolution: false,
    solved: readJSON(SOLVED_KEY, []),
    mistakes: readJSON(MISTAKE_KEY, {})
  };

  const els = {
    filters: document.getElementById("ialFilters"),
    search: document.getElementById("ialSearch"),
    topic: document.getElementById("ialTopic"),
    year: document.getElementById("ialYear"),
    session: document.getElementById("ialSession"),
    marks: document.getElementById("ialMarks"),
    expertise: document.getElementById("ialExpertiseOnly"),
    reset: document.getElementById("ialReset"),
    numbers: document.getElementById("ialNumbers"),
    stage: document.getElementById("ialQuestionStage"),
    label: document.getElementById("ialResultLabel"),
    prev: document.getElementById("ialPrev"),
    next: document.getElementById("ialNext"),
    total: document.querySelector("[data-ial-total]"),
    filtered: document.querySelector("[data-ial-filtered]"),
    solved: document.querySelector("[data-ial-solved]"),
    mistakes: document.querySelector("[data-ial-mistakes]")
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
    populateSelect(els.year, "All years", years);
    populateSelect(els.session, "All sessions", ["Jan", "MayJune", "Oct"], (value) => value === "MayJune" ? "May/June" : value);
    populateSelect(els.marks, "All marks", marks, (value) => `${value} marks`);
  }

  function currentFilters() {
    return {
      search: els.search.value.trim().toLowerCase(),
      topic: els.topic.value,
      year: els.year.value,
      session: els.session.value,
      marks: els.marks.value,
      expertise: els.expertise.checked
    };
  }

  function matches(item, filters) {
    const itemTopics = item.topics || [item.topic];
    if (filters.topic && !itemTopics.includes(filters.topic)) return false;
    if (filters.year && String(item.year) !== filters.year) return false;
    if (filters.session && item.session !== filters.session) return false;
    if (filters.marks && String(item.marks) !== filters.marks) return false;
    if (filters.expertise && item.qNo < 6) return false;
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
    let html = String(answer || "").trim();
    html = html.replace(/(?<=\.)\s+(?=\$\([a-d]\))/g, '</div><div class="ial-answer-line">');
    html = html.replace(/\\q?quad\s+(\([b-d]\))/g, (_match, label) => '$</div><div class="ial-answer-line">$' + label);
    return `<div class="ial-answer-line">${html}</div>`;
  }

  function renderNumbers() {
    els.numbers.innerHTML = state.filtered.map((item, index) => (
      `<button type="button" class="${index === state.activeIndex ? "is-active" : ""}" data-index="${index}" aria-label="Open ${escapeHtml(item.paper)} question ${item.qNo}">${item.qNo}</button>`
    )).join("");
  }

  function renderQuestion() {
    const item = state.filtered[state.activeIndex];
    if (!item) {
      els.stage.innerHTML = '<div class="ial-empty">No WMA11 questions match these filters yet.</div>';
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
            <span class="ial-pill">${item.session === "MayJune" ? "May/June" : item.session} ${item.year}</span>
          </div>
        </header>
        <div class="ial-question-image-wrap">
          <img class="ial-question-image" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.id)}" loading="eager">
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
    els.solved.textContent = state.solved.length;
    els.mistakes.textContent = Object.keys(state.mistakes).length;
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

  function topicName(slug, fallback = "") {
    return TOPICS.find((topic) => topic.slug === slug)?.name || fallback || slug;
  }

  function render() {
    renderStats();
    renderNumbers();
    renderQuestion();
  }

  function move(delta) {
    if (!state.filtered.length) return;
    state.activeIndex = Math.max(0, Math.min(state.filtered.length - 1, state.activeIndex + delta));
    state.showSolution = false;
    render();
  }

  function toggleSolved(item) {
    const set = new Set(state.solved);
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
      if (button.dataset.action === "solution") state.showSolution = !state.showSolution;
      if (button.dataset.action === "solved") toggleSolved(item);
      if (button.dataset.action === "mistake") toggleMistake(item);
      render();
    });
  }

  function init() {
    setupFilters();
    bindEvents();
    applyFilters(false);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
