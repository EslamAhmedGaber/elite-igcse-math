(function () {
  const QUESTIONS = window.WMA11_QUESTIONS || [];
  const TOPICS = window.WMA11_TOPICS || [];
  const SOLVED_KEY = "eliteWMA11SolvedV1";
  const MISTAKE_KEY = "eliteWMA11MistakeBoxV1";
  const state = {
    filtered: [],
    activeIndex: 0,
    showSolution: false,
    mock: [],
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
    mistakes: document.querySelector("[data-ial-mistakes]"),
    mockTopic: document.getElementById("ialMockTopic"),
    mockCount: document.getElementById("ialMockCount"),
    mockExpertise: document.getElementById("ialMockExpertise"),
    mockGenerate: document.getElementById("ialGenerateMock"),
    mockPrint: document.getElementById("ialPrintMock"),
    mockPrintSolutions: document.getElementById("ialPrintMockSolutions"),
    mockSummary: document.getElementById("ialMockSummary"),
    mockList: document.getElementById("ialMockList")
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
    if (!requestedTopic || !els.topic) return;
    const match = TOPICS.find((topic) => topic.slug === requestedTopic || topic.name === requestedTopic);
    const value = match?.slug || requestedTopic;
    if ([...els.topic.options].some((option) => option.value === value)) {
      els.topic.value = value;
    }
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
    renderMock();
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
        <h2>WMA11 Pure 1 Mock - Question ${index + 1}</h2>
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
  }

  function init() {
    setupFilters();
    applyUrlFilters();
    bindEvents();
    applyFilters(false);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
