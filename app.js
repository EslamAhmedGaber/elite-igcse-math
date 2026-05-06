if (!document.getElementById("questionGrid")) {
  // Not the practice page — bail. lead.js handles the enrollment dialog globally.
  console.info("[app.js] questionGrid not found; skipping bank initialisation.");
  throw new Error("__app_js_no_bank__");
}

const allQuestions = window.QUESTION_DATA || [];
const meta = window.SITE_META || {};
const solutionData = window.SOLUTION_DATA || {};
const selected = new Set(JSON.parse(localStorage.getItem("selectedExpertiseQuestions") || "[]"));
const solved = new Set(JSON.parse(localStorage.getItem("solvedExpertiseQuestions") || "[]"));
let activeBank = localStorage.getItem("activeQuestionBank") || "all";
let currentLayout = localStorage.getItem("questionLayout") || "grid";
let questions = [];
let visible = [];
let timerDuration = 25 * 60;
let timerRemaining = timerDuration;
let timerInterval = null;

const els = {
  totalQuestions: document.getElementById("totalQuestions"),
  selectedCount: document.getElementById("selectedCount"),
  solvedCount: document.getElementById("solvedCount"),
  visibleCount: document.getElementById("visibleCount"),
  searchBox: document.getElementById("searchBox"),
  unitFilter: document.getElementById("unitFilter"),
  topicFilter: document.getElementById("topicFilter"),
  paperFilter: document.getElementById("paperFilter"),
  viewFilter: document.getElementById("viewFilter"),
  difficultyFilter: document.getElementById("difficultyFilter"),
  minMarks: document.getElementById("minMarks"),
  maxMarks: document.getElementById("maxMarks"),
  minQuestion: document.getElementById("minQuestion"),
  maxQuestion: document.getElementById("maxQuestion"),
  resetBtn: document.getElementById("resetBtn"),
  randomBtn: document.getElementById("randomBtn"),
  clearSelectedBtn: document.getElementById("clearSelectedBtn"),
  worksheetTopic: document.getElementById("worksheetTopic"),
  worksheetCount: document.getElementById("worksheetCount"),
  worksheetMode: document.getElementById("worksheetMode"),
  buildWorksheetBtn: document.getElementById("buildWorksheetBtn"),
  printWorksheetBtn: document.getElementById("printWorksheetBtn"),
  helperTitle: document.getElementById("helperTitle"),
  helperText: document.getElementById("helperText"),
  printSelectedBtn: document.getElementById("printSelectedBtn"),
  printSelectedBtnHero: document.getElementById("printSelectedBtnHero"),
  heroQuestionCount: document.getElementById("heroQuestionCount"),
  heroPreview: document.getElementById("heroPreview"),
  bankButtons: document.querySelectorAll("[data-bank]"),
  bankTitle: document.getElementById("bankTitle"),
  bankDescription: document.getElementById("bankDescription"),
  bankSubtitle: document.getElementById("bankSubtitle"),
  allBankCount: document.getElementById("allBankCount"),
  expertiseBankCount: document.getElementById("expertiseBankCount"),
  progressSolved: document.getElementById("progressSolved"),
  progressUnsolved: document.getElementById("progressUnsolved"),
  progressSelected: document.getElementById("progressSelected"),
  progressPercent: document.getElementById("progressPercent"),
  progressLabel: document.getElementById("progressLabel"),
  progressBar: document.getElementById("progressBar"),
  topicProgress: document.getElementById("topicProgress"),
  timerRing: document.getElementById("timerRing"),
  timerDisplay: document.getElementById("timerDisplay"),
  timerToggleBtn: document.getElementById("timerToggleBtn"),
  timerResetBtn: document.getElementById("timerResetBtn"),
  timerPresets: document.querySelectorAll("[data-minutes]"),
  gridLayoutBtn: document.getElementById("gridLayoutBtn"),
  listLayoutBtn: document.getElementById("listLayoutBtn"),
  sortMode: document.getElementById("sortMode"),
  topicStrip: document.getElementById("topicStrip"),
  questionGrid: document.getElementById("questionGrid"),
  viewerDialog: document.getElementById("viewerDialog"),
  viewerTitle: document.getElementById("viewerTitle"),
  viewerMeta: document.getElementById("viewerMeta"),
  viewerImage: document.getElementById("viewerImage"),
  closeViewerBtn: document.getElementById("closeViewerBtn"),
  solutionDialog: document.getElementById("solutionDialog"),
  solutionTitle: document.getElementById("solutionTitle"),
  solutionMeta: document.getElementById("solutionMeta"),
  solutionBody: document.getElementById("solutionBody"),
  closeSolutionBtn: document.getElementById("closeSolutionBtn"),
  printArea: document.getElementById("printArea"),
  practicePanel: document.querySelector(".practice-panel"),
};

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function fillSelect(select, values, label) {
  select.innerHTML = "";
  select.append(new Option(label, ""));
  values.forEach((value) => select.append(new Option(value, value)));
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

function init() {
  if (!meta.banks?.[activeBank]) activeBank = "all";
  configureBank();
  applyInitialParams();
  setLayout(currentLayout);
  updateTimerDisplay();
  redraw();
}

function getBankInfo(bank) {
  return meta.banks?.[bank] || {};
}

function configureBank() {
  questions = allQuestions.filter((question) => question.bank === activeBank);
  els.totalQuestions.textContent = questions.length;
  const allCount = getBankInfo("all").count || allQuestions.filter((question) => question.bank === "all").length;
  const expertiseCount = getBankInfo("expertise").count || allQuestions.filter((question) => question.bank === "expertise").length;
  els.allBankCount.textContent = `${allCount} questions`;
  els.expertiseBankCount.textContent = `${expertiseCount} Q20+ questions`;
  els.heroQuestionCount.textContent = `${allCount} full questions + ${expertiseCount} Q20+ questions`;
  const info = getBankInfo(activeBank);
  els.bankTitle.textContent = info.title || "Question Bank";
  els.bankDescription.textContent = info.description || "";
  els.bankSubtitle.textContent = info.subtitle || "Search, filter, zoom, select, solve, and print questions from the active bank.";
  els.bankButtons.forEach((button) => button.classList.toggle("active", button.dataset.bank === activeBank));
  fillSelect(els.unitFilter, uniqueSorted(questions.map((q) => q.unit)), "All units");
  fillSelect(els.topicFilter, info.topics || uniqueSorted(questions.map((q) => q.topic)), "All topics");
  fillSelect(els.paperFilter, uniqueSorted(questions.map((q) => q.paper)), "All papers");
  fillSelect(els.worksheetTopic, info.topics || uniqueSorted(questions.map((q) => q.topic)), "Use current filters");
  renderHeroPreview();
  renderTopicStrip();
}

function applyInitialParams() {
  const params = new URLSearchParams(window.location.search);
  const requestedBank = params.get("bank");
  if (requestedBank && meta.banks?.[requestedBank] && requestedBank !== activeBank) {
    activeBank = requestedBank;
    localStorage.setItem("activeQuestionBank", activeBank);
    configureBank();
  }
  const topic = params.get("topic");
  const unit = params.get("unit");
  const mode = params.get("mode");
  if (unit && [...els.unitFilter.options].some((option) => option.value === unit)) els.unitFilter.value = unit;
  if (topic && [...els.topicFilter.options].some((option) => option.value === topic)) {
    els.topicFilter.value = topic;
    els.worksheetTopic.value = topic;
    setTopicChip(topic);
  }
  if (mode === "q20") els.difficultyFilter.value = "q20";
  if (mode === "long") els.difficultyFilter.value = "long";
}

function resetFilters() {
  els.searchBox.value = "";
  els.unitFilter.value = "";
  els.topicFilter.value = "";
  els.paperFilter.value = "";
  els.viewFilter.value = "";
  els.difficultyFilter.value = "";
  els.minMarks.value = "";
  els.maxMarks.value = "";
  els.minQuestion.value = "";
  els.maxQuestion.value = "";
  els.worksheetTopic.value = "";
  els.worksheetMode.value = "current";
  setTopicChip("");
}

function renderHeroPreview() {
  const examples = questions.slice(0, 3);
  els.heroPreview.innerHTML = examples.map((question) => `<article class="preview-item">
    <img loading="lazy" src="${question.image}" alt="${escapeHtml(question.paper)} Q${question.question}">
    <div>
      <strong>${escapeHtml(question.paper)} Q${question.question} | ${question.marks}m</strong>
      <span>${escapeHtml(question.topic)}</span>
    </div>
  </article>`).join("");
}

function renderTopicStrip() {
  const counts = new Map();
  const info = getBankInfo(activeBank);
  questions.forEach((question) => counts.set(question.topic, (counts.get(question.topic) || 0) + 1));
  els.topicStrip.innerHTML = [
    `<button class="topic-chip active" type="button" data-topic="">All</button>`,
    ...(info.topics || uniqueSorted([...counts.keys()])).filter((topic) => counts.has(topic)).map((topic) =>
      `<button class="topic-chip" type="button" data-topic="${escapeHtml(topic)}">${escapeHtml(topic)} (${counts.get(topic)})</button>`
    ),
  ].join("");
}

function setTopicChip(topic) {
  document.querySelectorAll(".topic-chip").forEach((chip) => chip.classList.toggle("active", chip.dataset.topic === topic));
}

function applyFilters() {
  const search = els.searchBox.value.trim().toLowerCase();
  const unit = els.unitFilter.value;
  const topic = els.topicFilter.value;
  const paper = els.paperFilter.value;
  const viewMode = els.viewFilter.value;
  const difficulty = els.difficultyFilter.value;
  const minMarks = Number(els.minMarks.value || 0);
  const maxMarks = Number(els.maxMarks.value || 0);
  const minQuestion = Number(els.minQuestion.value || 0);
  const maxQuestion = Number(els.maxQuestion.value || 0);
  visible = questions.filter((question) => {
    if (unit && question.unit !== unit) return false;
    if (topic && question.topic !== topic) return false;
    if (paper && question.paper !== paper) return false;
    if (viewMode === "selected" && !selected.has(question.id)) return false;
    if (viewMode === "solved" && !solved.has(question.id)) return false;
    if (viewMode === "unsolved" && solved.has(question.id)) return false;
    if (minMarks && question.marks < minMarks) return false;
    if (maxMarks && question.marks > maxMarks) return false;
    if (minQuestion && question.question < minQuestion) return false;
    if (maxQuestion && question.question > maxQuestion) return false;
    if (difficulty === "quick" && question.marks > 3) return false;
    if (difficulty === "standard" && (question.marks < 4 || question.marks > 6)) return false;
    if (difficulty === "long" && question.marks < 7) return false;
    if (difficulty === "q20" && question.question < 20) return false;
    if (search) {
      const text = `${question.paper} ${question.topic} ${question.unit} ${question.question_text}`.toLowerCase();
      if (!text.includes(search)) return false;
    }
    return true;
  });
  const mode = els.sortMode.value;
  visible.sort((a, b) => {
    if (mode === "paper") return a.paper.localeCompare(b.paper) || a.question - b.question;
    if (mode === "marks_desc") return b.marks - a.marks || a.topic_order - b.topic_order;
    if (mode === "marks_asc") return a.marks - b.marks || a.topic_order - b.topic_order;
    if (mode === "question_desc") return b.question - a.question || b.marks - a.marks;
    return a.topic_order - b.topic_order || a.paper.localeCompare(b.paper) || a.question - b.question;
  });
}

function redraw() {
  applyFilters();
  els.visibleCount.textContent = visible.length;
  const activeIds = new Set(questions.map((question) => question.id));
  const selectedActive = [...selected].filter((id) => activeIds.has(id)).length;
  const solvedActive = [...solved].filter((id) => activeIds.has(id)).length;
  els.selectedCount.textContent = selectedActive;
  els.solvedCount.textContent = solvedActive;
  localStorage.setItem("selectedExpertiseQuestions", JSON.stringify([...selected]));
  localStorage.setItem("solvedExpertiseQuestions", JSON.stringify([...solved]));
  updateProgressSnapshot(selectedActive, solvedActive);
  updateHelper(selectedActive, solvedActive);
  renderCards();
}

function updateHelper(selectedActive, solvedActive) {
  const topic = els.topicFilter.value;
  const difficulty = els.difficultyFilter.value;
  if (selectedActive) {
    els.helperTitle.textContent = "Worksheet ready.";
    els.helperText.textContent = `${selectedActive} selected question${selectedActive === 1 ? "" : "s"} can be printed now. Try them before opening solutions.`;
    return;
  }
  if (topic) {
    els.helperTitle.textContent = `Focus: ${topic}`;
    els.helperText.textContent = `Solve a small set from this topic, mark them solved, then open the roadmap to see your progress grow.`;
    return;
  }
  if (difficulty === "q20" || activeBank === "expertise") {
    els.helperTitle.textContent = "Expertise mode.";
    els.helperText.textContent = "Use this when you want long end-of-paper questions. Build a 6-10 question worksheet and time yourself.";
    return;
  }
  els.helperTitle.textContent = solvedActive ? "Keep the streak moving." : "Start simple.";
  els.helperText.textContent = solvedActive
    ? "Use Continue Unsolved or Weak Topics to avoid repeating only the questions you already know."
    : "Pick a topic, solve 5 questions, then open the solutions only after you try.";
}

function renderCards() {
  if (!visible.length) {
    els.questionGrid.innerHTML = `<p>No questions match.</p>`;
    return;
  }
  els.questionGrid.innerHTML = visible.map((question) => {
    const isSelected = selected.has(question.id);
    const isSolved = solved.has(question.id);
    const hasSolution = Boolean(solutionData[question.id]?.source);
    return `<article class="question-card ${isSelected ? "selected" : ""} ${isSolved ? "solved" : ""}" data-id="${question.id}">
      <div>
        <div class="card-title"><span>${escapeHtml(question.paper)} Q${question.question}</span><span>${question.marks}m</span></div>
        <div class="topic-name">${escapeHtml(question.topic)}</div>
        <div class="meta-line">${escapeHtml(question.unit)}</div>
        <div class="question-tags">
          <span>Q${question.question}</span>
          <span>${question.marks >= 7 ? "Long" : question.marks >= 4 ? "Standard" : "Quick"}</span>
          ${question.question >= 20 ? "<span>Q20+</span>" : ""}
          ${hasSolution ? "<span>Solution</span>" : ""}
        </div>
        <div class="status-line">
          ${isSelected ? `<span class="pill">Selected</span>` : ""}
          ${isSolved ? `<span class="pill done">Solved</span>` : ""}
        </div>
      </div>
      <button class="thumb" type="button" data-action="zoom"><img loading="lazy" src="${question.image}" alt="${escapeHtml(question.paper)} Q${question.question}"></button>
      <div class="card-actions">
        <button type="button" data-action="select">${isSelected ? "Remove" : "Select"}</button>
        <button type="button" data-action="solve">${isSolved ? "Unsolve" : "Solved"}</button>
        ${hasSolution ? `<button type="button" data-action="solution">Show Solution</button>` : ""}
      </div>
    </article>`;
  }).join("");
}

function updateProgressSnapshot(selectedActive, solvedActive) {
  const total = questions.length || 1;
  const unsolved = questions.length - solvedActive;
  const percent = Math.round((solvedActive / total) * 100);
  els.progressSolved.textContent = solvedActive;
  els.progressUnsolved.textContent = unsolved;
  els.progressSelected.textContent = selectedActive;
  els.progressPercent.textContent = `${percent}%`;
  els.progressLabel.textContent = `${percent}% complete in this bank`;
  els.progressBar.style.width = `${percent}%`;

  const byTopic = new Map();
  questions.forEach((question) => {
    const current = byTopic.get(question.topic) || { total: 0, solved: 0 };
    current.total += 1;
    if (solved.has(question.id)) current.solved += 1;
    byTopic.set(question.topic, current);
  });
  const rows = [...byTopic.entries()]
    .sort((a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0]))
    .slice(0, 8);
  els.topicProgress.innerHTML = rows.map(([topic, counts]) => {
    const pct = counts.total ? Math.round((counts.solved / counts.total) * 100) : 0;
    return `<div class="topic-progress-row">
      <div class="topic-progress-head"><strong>${escapeHtml(topic)}</strong><span>${counts.solved}/${counts.total}</span></div>
      <div class="topic-bar"><i style="width:${pct}%"></i></div>
    </div>`;
  }).join("");
}

function setLayout(layout) {
  currentLayout = layout === "list" ? "list" : "grid";
  localStorage.setItem("questionLayout", currentLayout);
  els.questionGrid.classList.toggle("list-view", currentLayout === "list");
  els.gridLayoutBtn.classList.toggle("active", currentLayout === "grid");
  els.listLayoutBtn.classList.toggle("active", currentLayout === "list");
}

function questionById(id) {
  return allQuestions.find((question) => question.id === id);
}

function toggleSelect(id) {
  if (selected.has(id)) selected.delete(id);
  else selected.add(id);
  redraw();
}

function toggleSolved(id) {
  if (solved.has(id)) solved.delete(id);
  else solved.add(id);
  redraw();
}

function zoom(id) {
  const question = questionById(id);
  if (!question) return;
  els.viewerTitle.textContent = `${question.paper} Q${question.question} | ${question.marks} marks`;
  els.viewerMeta.textContent = `${question.topic} | ${question.unit}`;
  els.viewerImage.src = question.image;
  els.viewerImage.alt = `${question.paper} Q${question.question}`;
  els.viewerDialog.showModal();
}

function formatInlineMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function formatSolutionText(text) {
  const escaped = escapeHtml(text).trim();
  if (!escaped) return `<p class="solution-empty">Solution has not been written yet.</p>`;
  return escaped
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split(/\n/);
      if (lines.length > 1 && lines.every((line) => /^[-*]\s+/.test(line.trim()))) {
        return `<ul>${lines.map((line) => `<li>${formatInlineMarkdown(line.trim().replace(/^[-*]\s+/, ""))}</li>`).join("")}</ul>`;
      }
      return `<p>${formatInlineMarkdown(block).replace(/\n/g, "<br>")}</p>`;
    })
    .join("");
}

function showSolution(id) {
  const question = questionById(id);
  const solution = solutionData[id];
  if (!question || !solution) return;
  els.solutionTitle.textContent = `${question.paper} Q${question.question} | Solution`;
  els.solutionMeta.textContent = `${question.topic} | ${question.marks} marks`;
  const status = solution.status ? `<span class="solution-status">${escapeHtml(solution.status)}</span>` : "";
  els.solutionBody.innerHTML = `${status}${formatSolutionText(solution.source)}`;
  els.solutionDialog.showModal();
  if (window.MathJax?.typesetPromise) {
    window.MathJax.typesetPromise([els.solutionBody]).catch(() => {});
  }
}

function randomTen() {
  const pool = [...visible];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  questions.forEach((question) => selected.delete(question.id));
  pool.slice(0, 10).forEach((question) => selected.add(question.id));
  redraw();
}

function matchesWorksheetMode(question, mode) {
  if (mode === "quick") return question.marks <= 3;
  if (mode === "standard") return question.marks >= 4 && question.marks <= 6;
  if (mode === "long") return question.marks >= 7;
  if (mode === "q20") return question.question >= 20;
  return true;
}

function shuffled(items) {
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

function buildWorksheet({ printAfter = false } = {}) {
  const topic = els.worksheetTopic.value;
  const mode = els.worksheetMode.value || "current";
  const count = Math.max(1, Math.min(40, Number(els.worksheetCount.value || 12)));
  const basePool = mode === "current" ? visible : questions;
  const pool = basePool.filter((question) => {
    if (topic && question.topic !== topic) return false;
    return matchesWorksheetMode(question, mode);
  });
  if (!pool.length) {
    els.helperTitle.textContent = "No worksheet questions found.";
    els.helperText.textContent = "Relax the filters or choose another topic, then build again.";
    return;
  }
  questions.forEach((question) => selected.delete(question.id));
  shuffled(pool).slice(0, count).forEach((question) => selected.add(question.id));
  els.viewFilter.value = "selected";
  if (topic && [...els.topicFilter.options].some((option) => option.value === topic)) {
    els.topicFilter.value = topic;
    setTopicChip(topic);
  }
  redraw();
  if (printAfter) printSelected();
}

function practiceMode(mode) {
  if (mode === "all") {
    els.viewFilter.value = "";
    els.topicFilter.value = "";
    setTopicChip("");
    redraw();
  }
  if (mode === "topic") {
    els.topicFilter.focus();
  }
  if (mode === "mixed") {
    els.viewFilter.value = "";
    els.topicFilter.value = "";
    setTopicChip("");
    redraw();
    randomTen();
  }
  if (mode === "unsolved") {
    els.viewFilter.value = "unsolved";
    redraw();
  }
  if (mode === "weak") {
    const byTopic = new Map();
    questions.forEach((question) => {
      const current = byTopic.get(question.topic) || { total: 0, solved: 0 };
      current.total += 1;
      if (solved.has(question.id)) current.solved += 1;
      byTopic.set(question.topic, current);
    });
    const weakest = [...byTopic.entries()]
      .filter(([, counts]) => counts.solved < counts.total)
      .sort((a, b) => (a[1].solved / a[1].total) - (b[1].solved / b[1].total))[0]?.[0];
    if (weakest) {
      els.topicFilter.value = weakest;
      els.viewFilter.value = "unsolved";
      els.worksheetTopic.value = weakest;
      setTopicChip(weakest);
      redraw();
    }
  }
}

function printSelected() {
  const activeIds = new Set(questions.map((question) => question.id));
  const items = [...selected].filter((id) => activeIds.has(id)).map(questionById).filter(Boolean);
  const printable = items.length ? items : visible;
  els.printArea.innerHTML = printable.map((question, index) => `<section class="print-question">
    <h2>${index + 1}. ${escapeHtml(question.paper)} Q${question.question} | ${escapeHtml(question.topic)} | ${question.marks} marks</h2>
    <img src="${question.image}" alt="${escapeHtml(question.paper)} Q${question.question}">
  </section>`).join("");
  window.print();
}

function updateTimerDisplay() {
  const minutes = Math.floor(timerRemaining / 60);
  const seconds = timerRemaining % 60;
  els.timerDisplay.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const circumference = 326.73;
  const progress = timerDuration ? timerRemaining / timerDuration : 0;
  els.timerRing.style.strokeDashoffset = `${circumference * (1 - progress)}`;
}

function stopTimer(label = "Start") {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
  els.timerToggleBtn.textContent = label;
}

function toggleTimer() {
  if (timerInterval) {
    stopTimer("Resume");
    return;
  }
  els.timerToggleBtn.textContent = "Pause";
  timerInterval = setInterval(() => {
    timerRemaining -= 1;
    if (timerRemaining <= 0) {
      timerRemaining = 0;
      updateTimerDisplay();
      stopTimer("Done");
      return;
    }
    updateTimerDisplay();
  }, 1000);
}

function resetTimer() {
  timerRemaining = timerDuration;
  stopTimer("Start");
  updateTimerDisplay();
}

function setTimerMinutes(minutes) {
  timerDuration = Math.max(1, Number(minutes || 25)) * 60;
  resetTimer();
}

els.questionGrid.addEventListener("click", (event) => {
  const card = event.target.closest(".question-card");
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (!card || !action) return;
  if (action === "select") toggleSelect(card.dataset.id);
  if (action === "solve") toggleSolved(card.dataset.id);
  if (action === "zoom") zoom(card.dataset.id);
  if (action === "solution") showSolution(card.dataset.id);
});

els.topicStrip.addEventListener("click", (event) => {
  const button = event.target.closest("[data-topic]");
  if (!button) return;
  els.topicFilter.value = button.dataset.topic;
  setTopicChip(button.dataset.topic);
  redraw();
});

[els.searchBox, els.unitFilter, els.topicFilter, els.paperFilter, els.viewFilter, els.difficultyFilter, els.minMarks, els.maxMarks, els.minQuestion, els.maxQuestion, els.sortMode].forEach((control) => {
  control.addEventListener("input", redraw);
});
els.topicFilter.addEventListener("input", () => {
  setTopicChip(els.topicFilter.value);
  if (!els.worksheetTopic.value) els.worksheetTopic.value = els.topicFilter.value;
});

els.resetBtn.addEventListener("click", () => {
  resetFilters();
  redraw();
});
els.randomBtn.addEventListener("click", randomTen);
els.buildWorksheetBtn.addEventListener("click", () => buildWorksheet());
els.printWorksheetBtn.addEventListener("click", () => buildWorksheet({ printAfter: true }));
els.clearSelectedBtn.addEventListener("click", () => {
  questions.forEach((question) => selected.delete(question.id));
  redraw();
});
els.printSelectedBtn.addEventListener("click", printSelected);
els.printSelectedBtnHero.addEventListener("click", printSelected);
els.closeViewerBtn.addEventListener("click", () => els.viewerDialog.close());
els.closeSolutionBtn.addEventListener("click", () => els.solutionDialog.close());
els.gridLayoutBtn.addEventListener("click", () => setLayout("grid"));
els.listLayoutBtn.addEventListener("click", () => setLayout("list"));
els.timerToggleBtn.addEventListener("click", toggleTimer);
els.timerResetBtn.addEventListener("click", resetTimer);
els.timerPresets.forEach((button) => {
  button.addEventListener("click", () => setTimerMinutes(button.dataset.minutes));
});
els.bankButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeBank = button.dataset.bank;
    localStorage.setItem("activeQuestionBank", activeBank);
    resetFilters();
    configureBank();
    redraw();
  });
});
els.practicePanel.addEventListener("click", (event) => {
  const button = event.target.closest("[data-practice]");
  if (button) practiceMode(button.dataset.practice);
});

init();
