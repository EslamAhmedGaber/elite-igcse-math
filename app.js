if (!document.getElementById("questionGrid")) {
  // Not the practice page - bail. lead.js handles the enrollment dialog globally.
  console.info("[app.js] questionGrid not found; skipping bank initialisation.");
  throw new Error("__app_js_no_bank__");
}

const allQuestions = window.QUESTION_DATA || [];
const meta = window.SITE_META || {};
const solutionData = window.SOLUTION_DATA || {};
const selected = new Set(JSON.parse(localStorage.getItem("selectedExpertiseQuestions") || "[]"));
const solved = new Set(JSON.parse(localStorage.getItem("solvedExpertiseQuestions") || "[]"));
const REVIEW_KEY = "eliteMistakeBoxV1";
const ACTIVITY_KEY = "eliteStudyActivityV1";
const REVIEW_INTERVALS = [1, 3, 7, 14];
const FOCUS_DEFAULT_KEY = "eliteFocusDefaultV1";
let reviewItems = readReviewItems();
let activeBank = localStorage.getItem("activeQuestionBank") || "all";
if (localStorage.getItem(FOCUS_DEFAULT_KEY) !== "done") {
  localStorage.setItem("questionLayout", "focus");
  localStorage.setItem(FOCUS_DEFAULT_KEY, "done");
}
let currentLayout = localStorage.getItem("questionLayout") || "focus";
let questions = [];
let visible = [];
let reviewMode = "";
let focusQuestionId = localStorage.getItem("focusQuestionId") || "";
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
  focusFilterBar: document.getElementById("focusFilterBar"),
  focusSearchBox: document.getElementById("focusSearchBox"),
  focusUnitFilter: document.getElementById("focusUnitFilter"),
  focusTopicFilter: document.getElementById("focusTopicFilter"),
  focusPaperFilter: document.getElementById("focusPaperFilter"),
  focusViewFilter: document.getElementById("focusViewFilter"),
  focusMoreFiltersBtn: document.getElementById("focusMoreFiltersBtn"),
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
  selectionSummary: document.getElementById("selectionSummary"),
  visibleSummary: document.getElementById("visibleSummary"),
  selectVisibleBtn: document.getElementById("selectVisibleBtn"),
  clearVisibleBtn: document.getElementById("clearVisibleBtn"),
  printVisibleBtn: document.getElementById("printVisibleBtn"),
  printSelectedInlineBtn: document.getElementById("printSelectedInlineBtn"),
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
  reviewDueCount: document.getElementById("reviewDueCount"),
  reviewBoxCount: document.getElementById("reviewBoxCount"),
  reviewMasteredCount: document.getElementById("reviewMasteredCount"),
  dueReviewBtn: document.getElementById("dueReviewBtn"),
  allReviewBtn: document.getElementById("allReviewBtn"),
  timerRing: document.getElementById("timerRing"),
  timerDisplay: document.getElementById("timerDisplay"),
  timerToggleBtn: document.getElementById("timerToggleBtn"),
  timerResetBtn: document.getElementById("timerResetBtn"),
  timerPresets: document.querySelectorAll("[data-minutes]"),
  gridLayoutBtn: document.getElementById("gridLayoutBtn"),
  listLayoutBtn: document.getElementById("listLayoutBtn"),
  focusLayoutBtn: document.getElementById("focusLayoutBtn"),
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
  heroModeEyebrow: document.querySelector(".practice-hero .eyebrow"),
  heroTitle: document.getElementById("practiceTitle"),
  fixTopicDialog: document.getElementById("fixTopicDialog"),
  fixTopicTitle: document.getElementById("fixTopicTitle"),
  fixTopicMeta: document.getElementById("fixTopicMeta"),
  closeFixTopicBtn: document.getElementById("closeFixTopicBtn"),
  fixTopicSelect: document.getElementById("fixTopicSelect"),
  saveFixTopicBtn: document.getElementById("saveFixTopicBtn"),
  advancedFiltersToggle: document.getElementById("advancedFiltersToggle"),
  advancedFilters: document.getElementById("advancedFilters"),
  mobileToolsToggle: document.getElementById("mobileToolsToggle"),
  mobileToolsBackdrop: document.getElementById("mobileToolsBackdrop"),
  practiceSidebar: document.getElementById("practiceSidebar"),
  practiceToolsPalette: document.getElementById("practiceToolsPalette"),
  practiceToolsCloseBtn: document.getElementById("practiceToolsCloseBtn"),
  practiceToolsTabs: document.querySelectorAll("[data-tools-tab]"),
  practiceToolsPanels: document.querySelectorAll("[data-tools-panel]"),
};

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function fillSelect(select, values, label) {
  select.innerHTML = "";
  select.append(new Option(label, ""));
  values.forEach((value) => select.append(new Option(value, value)));
}

function copySelectOptions(source, target) {
  if (!source || !target) return;
  const value = source.value;
  target.innerHTML = source.innerHTML;
  target.value = [...target.options].some((option) => option.value === value) ? value : "";
}

function syncFocusFilterOptions() {
  copySelectOptions(els.unitFilter, els.focusUnitFilter);
  copySelectOptions(els.topicFilter, els.focusTopicFilter);
  copySelectOptions(els.paperFilter, els.focusPaperFilter);
  copySelectOptions(els.viewFilter, els.focusViewFilter);
  syncFocusFiltersFromSidebar();
}

function syncFocusSelectValue(target, value) {
  if (!target) return;
  target.value = [...target.options].some((option) => option.value === value) ? value : "";
}

function syncFocusFiltersFromSidebar() {
  if (els.focusSearchBox) els.focusSearchBox.value = els.searchBox.value;
  syncFocusSelectValue(els.focusUnitFilter, els.unitFilter.value);
  syncFocusSelectValue(els.focusTopicFilter, els.topicFilter.value);
  syncFocusSelectValue(els.focusPaperFilter, els.paperFilter.value);
  syncFocusSelectValue(els.focusViewFilter, els.viewFilter.value);
}

function applyFocusQuickFilter(source, target) {
  if (!source || !target) return;
  reviewMode = "";
  target.value = source.value;
  if (target === els.unitFilter && window.ELITE_PATHWAY?.isModular && target.value) {
    localStorage.setItem("modularUnit", target.value);
    configureBank();
    showPathwayResumeBanner();
  }
  if (target === els.topicFilter) {
    setTopicChip(target.value);
    if (!els.worksheetTopic.value) els.worksheetTopic.value = target.value;
  }
  redraw();
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

function readReviewItems() {
  try {
    return JSON.parse(localStorage.getItem(REVIEW_KEY) || "{}");
  } catch (err) {
    return {};
  }
}

function saveReviewItems() {
  localStorage.setItem(REVIEW_KEY, JSON.stringify(reviewItems));
}

function recordStudyActivity(amount = 1) {
  const today = new Date().toISOString().slice(0, 10);
  let activity = {};
  try {
    const raw = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "{}");
    activity = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  } catch (err) {
    activity = {};
  }
  activity[today] = Number(activity[today] || 0) + amount;
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity));
}

function reviewState(id) {
  return reviewItems[id] || null;
}

function reviewLabel(id) {
  const item = reviewState(id);
  if (!item) return "";
  if (item.masteredAt) return "Mastered";
  return Number(item.dueAt || 0) <= Date.now() ? "Due Today" : "Review Later";
}

function isReviewDue(id) {
  const item = reviewState(id);
  return Boolean(item && !item.masteredAt && Number(item.dueAt || 0) <= Date.now());
}

function addToReview(id, reason = "manual") {
  const now = Date.now();
  reviewItems[id] = {
    id,
    reason,
    level: 0,
    attempts: (reviewItems[id]?.attempts || 0) + 1,
    addedAt: reviewItems[id]?.addedAt || now,
    updatedAt: now,
    dueAt: now
  };
  saveReviewItems();
}

function advanceReview(id) {
  const item = reviewState(id);
  if (!item) return;
  const level = Math.min(3, Number(item.level || 0) + 1);
  const now = Date.now();
  reviewItems[id] = {
    ...item,
    level,
    updatedAt: now,
    masteredAt: level >= 3 ? now : null,
    dueAt: level >= 3 ? now + 365 * 86400000 : now + REVIEW_INTERVALS[level] * 86400000
  };
  saveReviewItems();
}

function removeReview(id) {
  delete reviewItems[id];
  saveReviewItems();
}

function init() {
  if (!meta.banks?.[activeBank]) activeBank = "all";
  configureBank();
  applyInitialParams();
  setPracticeTab(reviewMode ? "review" : "all");
  setLayout(currentLayout);
  updateTimerDisplay();
  redraw();
  showPathwayResumeBanner();
}

function showPathwayResumeBanner() {
  const banner = document.getElementById("pathwayResumeBanner");
  const textEl = document.getElementById("pathwayResumeText");
  if (!banner || !textEl) return;
  const mode = (localStorage.getItem("pathway") || window.ELITE_PATHWAY?.mode || "").toLowerCase();
  if (mode !== "linear" && mode !== "modular") return;
  const pathwayLabel = mode === "modular" ? "Modular Pathway" : "Linear Pathway";
  const unit = mode === "modular" ? (localStorage.getItem("modularUnit") || "Unit 1") : "";
  textEl.textContent = mode === "modular"
    ? `Welcome back - practising the ${pathwayLabel}, ${unit}.`
    : `Welcome back - practising the ${pathwayLabel}.`;
  banner.hidden = false;
}

function getBankInfo(bank) {
  return meta.banks?.[bank] || {};
}

function configureBank() {
  const unitLabel = window.ELITE_PATHWAY?.label("unitLowerPlural") || "units";
  questions = allQuestions.filter((question) => question.bank === activeBank);

  // Fill and sync the unit filter BEFORE any count computation,
  // so getScopedQuestions() reads the correct unit on first render.
  fillSelect(els.unitFilter, uniqueSorted(questions.map((q) => q.unit)), `All ${unitLabel}`);
  syncModeUI();
  syncModularUnitSelection();

  const scopedQuestions = window.ELITE_PATHWAY?.isModular ? getScopedQuestions() : questions;
  els.totalQuestions.textContent = scopedQuestions.length;
  const scopedAll = window.ELITE_PATHWAY?.mode === "modular" ? getScopedQuestions(allQuestions).filter((q) => q.bank === "all") : allQuestions.filter((q) => q.bank === "all");
  const scopedExpertise = window.ELITE_PATHWAY?.mode === "modular" ? getScopedQuestions(allQuestions).filter((q) => q.bank === "expertise") : allQuestions.filter((q) => q.bank === "expertise");

  const allCount = scopedAll.length;
  const expertiseCount = scopedExpertise.length;
  els.allBankCount.textContent = `${allCount} questions`;
  els.expertiseBankCount.textContent = `${expertiseCount} Q20+ questions`;
  els.heroQuestionCount.textContent = `${allCount} full questions + ${expertiseCount} Q20+ questions`;
  const info = getBankInfo(activeBank);
  els.bankTitle.textContent = info.title || "Question Bank";
  els.bankDescription.textContent = info.description || "";
  els.bankSubtitle.textContent = info.subtitle || "Search, filter, zoom, select, solve, and print questions from the active bank.";
  els.bankButtons.forEach((button) => button.classList.toggle("active", button.dataset.bank === activeBank));
  const topicSource = window.ELITE_PATHWAY?.isModular ? scopedQuestions : questions;
  fillSelect(els.topicFilter, info.topics || uniqueSorted(topicSource.map((q) => q.topic)), "All topics");
  fillSelect(els.paperFilter, uniqueSorted(questions.map((q) => q.paper)), "All papers");
  fillSelect(els.worksheetTopic, info.topics || uniqueSorted(topicSource.map((q) => q.topic)), "Use current filters");
  renderHeroPreview(window.ELITE_PATHWAY?.mode === "modular" ? getScopedQuestions(questions) : questions);
  renderTopicStrip(window.ELITE_PATHWAY?.mode === "modular" ? getScopedQuestions(questions) : questions);
  syncFocusFilterOptions();
}

function syncModularUnitSelection() {
  if (!window.ELITE_PATHWAY?.isModular) return;
  const storedUnit = localStorage.getItem("modularUnit");
  const availableUnits = [...els.unitFilter.options].map((option) => option.value).filter(Boolean);
  const preferredUnit = [els.unitFilter.value, storedUnit, "Unit 1"].find((unit) => unit && availableUnits.includes(unit))
    || availableUnits[0]
    || "Unit 1";
  els.unitFilter.value = preferredUnit;
  localStorage.setItem("modularUnit", preferredUnit);
}

function syncModeUI() {
  const isMod = window.ELITE_PATHWAY?.mode === "modular";
  if (els.heroModeEyebrow) els.heroModeEyebrow.textContent = isMod ? "IGCSE Mathematics | Modular Pathway" : "IGCSE Mathematics | Linear Pathway";
  if (els.heroTitle) els.heroTitle.textContent = isMod ? "Choose Unit 1 or Unit 2, then practice only those topics." : "All your IGCSE 4MA1 practice in one place.";
  if (els.bankTitle) els.bankTitle.textContent = isMod ? "Modular Classified Questions" : "All Classified Questions";
  if (els.bankDescription) els.bankDescription.textContent = isMod ? "Choose a unit to see only its matching topics and questions." : "All cropped classified questions from the full output folder.";
  if (els.bankSubtitle) els.bankSubtitle.textContent = isMod ? "Search, filter, zoom, select, solve, and print questions from the selected modular unit." : "Search, filter, zoom, select, solve, and print questions from the active bank.";
}

function getScopedQuestions(source = questions) {
  if (!window.ELITE_PATHWAY?.isModular) return source;
  const unit = els.unitFilter.value || localStorage.getItem("modularUnit") || "Unit 1";
  return source.filter((question) => question.unit === unit || question.modular_unit === unit || question.modular_force_unit === unit);
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
  let unitChangedAfterConfigure = false;
  if (unit && [...els.unitFilter.options].some((option) => option.value === unit)) {
    unitChangedAfterConfigure = els.unitFilter.value !== unit;
    els.unitFilter.value = unit;
    if (window.ELITE_PATHWAY?.isModular) localStorage.setItem("modularUnit", unit);
  }
  if (window.ELITE_PATHWAY?.isModular) {
    const unitBeforeSync = els.unitFilter.value;
    const storedUnit = localStorage.getItem("modularUnit");
    if (!unit && storedUnit && [...els.unitFilter.options].some((option) => option.value === storedUnit)) {
      els.unitFilter.value = storedUnit;
    }
    syncModularUnitSelection();
    unitChangedAfterConfigure = unitChangedAfterConfigure || unitBeforeSync !== els.unitFilter.value;
    if (unitChangedAfterConfigure) configureBank();
  }
  if (topic && [...els.topicFilter.options].some((option) => option.value === topic)) {
    els.topicFilter.value = topic;
    els.worksheetTopic.value = topic;
    setTopicChip(topic);
  }
  if (mode === "q20") els.difficultyFilter.value = "q20";
  if (mode === "long") els.difficultyFilter.value = "long";
  if (mode === "review") reviewMode = "due";
}

function resetFilters() {
  reviewMode = "";
  els.searchBox.value = "";
  if (window.ELITE_PATHWAY?.isModular) {
    syncModularUnitSelection();
  } else {
    els.unitFilter.value = "";
  }
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

function renderHeroPreview(scope = getScopedQuestions()) {
  const examples = scope.slice(0, 3);
  els.heroPreview.innerHTML = examples.map((question) => `<article class="preview-item">
    <img loading="lazy" src="${question.image}" alt="${escapeHtml(question.paper)} Q${question.question}">
    <div>
      <strong>${escapeHtml(question.paper)} Q${question.question} | ${question.marks}m</strong>
      <span>${escapeHtml(question.topic)}</span>
    </div>
  </article>`).join("");
}

function renderTopicStrip(scope = questions) {
  const counts = new Map();
  const info = getBankInfo(activeBank);
  getScopedQuestions().forEach((question) => counts.set(question.topic, (counts.get(question.topic) || 0) + 1));
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
  const pool = getScopedQuestions();
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
  visible = pool.filter((question) => {
    const review = reviewState(question.id);
    if (reviewMode === "due" && !isReviewDue(question.id)) return false;
    if (reviewMode === "box" && !review) return false;
    if (reviewMode === "mastered" && !review?.masteredAt) return false;
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
  const activeIds = new Set(getScopedQuestions().map((question) => question.id));
  const selectedActive = [...selected].filter((id) => activeIds.has(id)).length;
  const solvedActive = [...solved].filter((id) => activeIds.has(id)).length;
  els.selectedCount.textContent = selectedActive;
  if (els.selectionSummary) els.selectionSummary.textContent = `${selectedActive} selected`;
  if (els.visibleSummary) els.visibleSummary.textContent = `${visible.length} visible`;
  els.solvedCount.textContent = solvedActive;
  localStorage.setItem("selectedExpertiseQuestions", JSON.stringify([...selected]));
  localStorage.setItem("solvedExpertiseQuestions", JSON.stringify([...solved]));
  saveReviewItems();
  if (window.EliteCloud?.queueSync) window.EliteCloud.queueSync();
  updateProgressSnapshot(selectedActive, solvedActive);
  updateReviewSnapshot(activeIds);
  updateHelper(selectedActive, solvedActive);
  syncFocusFiltersFromSidebar();
  renderCards();
}

function updateReviewSnapshot(activeIds) {
  const activeReview = Object.values(reviewItems).filter((item) => activeIds.has(item.id));
  const due = activeReview.filter((item) => !item.masteredAt && Number(item.dueAt || 0) <= Date.now()).length;
  const mastered = activeReview.filter((item) => item.masteredAt).length;
  if (els.reviewDueCount) els.reviewDueCount.textContent = due;
  if (els.reviewBoxCount) els.reviewBoxCount.textContent = activeReview.length;
  if (els.reviewMasteredCount) els.reviewMasteredCount.textContent = mastered;
}

function updateHelper(selectedActive, solvedActive) {
  const topic = els.topicFilter.value;
  const difficulty = els.difficultyFilter.value;
  const dueCount = Object.values(reviewItems).filter((item) => !item.masteredAt && Number(item.dueAt || 0) <= Date.now()).length;
  if (reviewMode === "due" || reviewMode === "box") {
    els.helperTitle.textContent = dueCount ? "Mistakes due today." : "Mistake Box is calm.";
    els.helperText.textContent = dueCount
      ? "Redo these questions without opening the solution first. If you solve one correctly, press Review Done so it comes back later."
      : "Add difficult questions to the Mistake Box while practising. They will reappear until you master them.";
    return;
  }
  if (selectedActive) {
    els.helperTitle.textContent = "Worksheet ready.";
    els.helperText.textContent = `${selectedActive} selected question${selectedActive === 1 ? "" : "s"} can be printed now. Try them before opening the answer review card or marking them solved.`;
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
    : "Pick a topic, solve 5 questions, then check the answers only after you try.";
}

function renderCards() {
  if (!visible.length) {
    els.questionGrid.innerHTML = `<p>No questions match.</p>`;
    return;
  }
  if (currentLayout === "focus") {
    renderFocusQuestion();
    return;
  }
  els.questionGrid.innerHTML = visible.map((question) => {
    const isSelected = selected.has(question.id);
    const isSolved = solved.has(question.id);
    const hasSolution = hasSolutionContent(solutionData[question.id]);
    const review = reviewState(question.id);
    const reviewText = reviewLabel(question.id);
    const difficulty = question.marks >= 7 ? "Long" : question.marks >= 4 ? "Standard" : "Quick";
    const difficultyClass = difficulty.toLowerCase();
    return `<article class="question-card ${isSelected ? "selected" : ""} ${isSolved ? "solved" : ""}" data-id="${question.id}">
      <div>
        <div class="card-title"><span class="question-ref">${escapeHtml(question.paper)} Q${question.question}</span><span class="marks-badge">${question.marks} marks</span></div>
        <div class="topic-name">${escapeHtml(question.topic)}</div>
        <div class="meta-line">${escapeHtml(question.unit)}</div>
        <div class="question-tags">
          <span class="tag-question">Q${question.question}</span>
          <span class="tag-difficulty ${difficultyClass}">${difficulty}</span>
          ${question.question >= 20 ? `<span class="tag-q20">Q20+</span>` : ""}
          ${hasSolution ? `<span class="tag-solution">Solution</span>` : ""}
          ${reviewText ? `<span class="tag-review">${escapeHtml(reviewText)}</span>` : ""}
        </div>
        <div class="status-line">
          ${isSelected ? `<span class="pill">Selected</span>` : ""}
          ${isSolved ? `<span class="pill done">Solved</span>` : ""}
          ${reviewText ? `<span class="pill review">${escapeHtml(reviewText)}</span>` : ""}
        </div>
      </div>
      <button class="thumb" type="button" data-action="zoom"><img loading="lazy" src="${question.image}" alt="${escapeHtml(question.paper)} Q${question.question}"></button>
      <div class="card-actions">
        <button type="button" data-action="select">${isSelected ? "Remove" : "Select"}</button>
        <button type="button" data-action="solve">${isSolved ? "Unsolve" : "Solved"}</button>
        <button type="button" data-action="${review ? "reviewDone" : "reviewAdd"}">${review ? "Review Done" : "Mistake Box"}</button>
        ${review ? `<button type="button" data-action="reviewRemove">Remove Review</button>` : ""}
        ${hasSolution ? `<button type="button" data-action="solution">Show Solution</button>` : ""}
        ${window.CLOUD_SYNC?.state?.user?.email?.toLowerCase().includes('eslam') ? `<button type="button" data-action="fixTopic">Fix Topic</button>` : ""}
      </div>
    </article>`;
  }).join("");
}

function renderQuestionActions(question, { compact = false } = {}) {
  const isSelected = selected.has(question.id);
  const isSolved = solved.has(question.id);
  const hasSolution = hasSolutionContent(solutionData[question.id]);
  const review = reviewState(question.id);
  return `<div class="card-actions ${compact ? "compact" : ""}">
    <button type="button" data-action="select">${isSelected ? "Remove" : "Select"}</button>
    <button type="button" data-action="solve">${isSolved ? "Unsolve" : "Solved"}</button>
    <button type="button" data-action="${review ? "reviewDone" : "reviewAdd"}">${review ? "Review Done" : "Mistake Box"}</button>
    ${review ? `<button type="button" data-action="reviewRemove">Remove Review</button>` : ""}
    ${hasSolution ? `<button type="button" data-action="solution">Show Solution</button>` : ""}
    ${window.CLOUD_SYNC?.state?.user?.email?.toLowerCase().includes("eslam") ? `<button type="button" data-action="fixTopic">Fix Topic</button>` : ""}
  </div>`;
}

function focusIndex() {
  const index = visible.findIndex((question) => question.id === focusQuestionId);
  return index >= 0 ? index : 0;
}

function setFocusQuestion(id) {
  if (!id || !visible.some((question) => question.id === id)) return;
  focusQuestionId = id;
  localStorage.setItem("focusQuestionId", id);
  renderCards();
}

function moveFocusQuestion(direction) {
  if (!visible.length) return;
  const nextIndex = Math.min(visible.length - 1, Math.max(0, focusIndex() + direction));
  setFocusQuestion(visible[nextIndex].id);
}

function renderFocusQuestion() {
  const index = focusIndex();
  const question = visible[index];
  focusQuestionId = question.id;
  localStorage.setItem("focusQuestionId", question.id);
  const isSelected = selected.has(question.id);
  const isSolved = solved.has(question.id);
  const reviewText = reviewLabel(question.id);
  const nav = visible.map((item, itemIndex) => {
    const active = item.id === question.id ? "is-active" : "";
    const solvedClass = solved.has(item.id) ? "is-solved" : "";
    const selectedClass = selected.has(item.id) ? "is-selected" : "";
    return `<button class="${active} ${solvedClass} ${selectedClass}" type="button" data-action="focusNav" data-id="${item.id}" title="${escapeHtml(item.paper)} Q${item.question} | ${escapeHtml(item.topic)}">${itemIndex + 1}</button>`;
  }).join("");

  els.questionGrid.innerHTML = `<section class="focus-viewer" aria-label="Focused question viewer">
    <div class="focus-topline">
      <div>
        <span class="mini-eyebrow">Focus Mode</span>
        <strong>${index + 1} of ${visible.length}</strong>
      </div>
      <div class="focus-stepper" aria-label="Focused question navigation">
        <button type="button" data-action="focusPrev" ${index === 0 ? "disabled" : ""}>Previous</button>
        <button type="button" data-action="focusNext" ${index === visible.length - 1 ? "disabled" : ""}>Next</button>
      </div>
    </div>
    <div class="focus-number-strip" aria-label="Question numbers">${nav}</div>
    <article class="question-card focus-question-card ${isSelected ? "selected" : ""} ${isSolved ? "solved" : ""}" data-id="${question.id}">
      <header class="focus-question-head">
        <div>
          <span>${escapeHtml(question.paper)}</span>
          <h3>Question ${question.question}</h3>
          <p>${escapeHtml(question.topic)} | ${escapeHtml(question.unit)}</p>
        </div>
        <div class="focus-marks">
          <strong>${question.marks}</strong>
          <span>marks</span>
        </div>
      </header>
      <div class="focus-status-row">
        <span>Q${question.question}</span>
        <span>${question.marks >= 7 ? "Long" : question.marks >= 4 ? "Standard" : "Quick"}</span>
        ${question.question >= 20 ? "<span>Q20+</span>" : ""}
        ${isSelected ? `<span class="pill">Selected</span>` : ""}
        ${isSolved ? `<span class="pill done">Solved</span>` : ""}
        ${reviewText ? `<span class="pill review">${escapeHtml(reviewText)}</span>` : ""}
      </div>
      <button class="thumb focus-thumb" type="button" data-action="zoom">
        <img loading="eager" src="${question.image}" alt="${escapeHtml(question.paper)} Q${question.question}">
      </button>
      ${renderQuestionActions(question)}
    </article>
  </section>`;
  const activeNumber = els.questionGrid.querySelector(".focus-number-strip .is-active");
  if (activeNumber?.parentElement) {
    const strip = activeNumber.parentElement;
    strip.scrollLeft = activeNumber.offsetLeft - (strip.clientWidth - activeNumber.clientWidth) / 2;
  }
}

function updateProgressSnapshot(selectedActive, solvedActive) {
  const pool = getScopedQuestions();
  const total = pool.length || 1;
  const unsolved = pool.length - solvedActive;
  const percent = Math.round((solvedActive / total) * 100);
  els.progressSolved.textContent = solvedActive;
  els.progressUnsolved.textContent = unsolved;
  els.progressSelected.textContent = selectedActive;
  els.progressPercent.textContent = `${percent}%`;
  els.progressLabel.textContent = `${percent}% complete in this bank`;
  els.progressBar.style.width = `${percent}%`;

  if (!els.topicProgress) return;

  const byTopic = new Map();
  pool.forEach((question) => {
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
  currentLayout = ["grid", "list", "focus"].includes(layout) ? layout : "grid";
  localStorage.setItem("questionLayout", currentLayout);
  els.questionGrid.classList.toggle("list-view", currentLayout === "list");
  els.questionGrid.classList.toggle("focus-view", currentLayout === "focus");
  document.body.classList.toggle("practice-focus-mode", currentLayout === "focus");
  els.gridLayoutBtn.classList.toggle("active", currentLayout === "grid");
  els.listLayoutBtn.classList.toggle("active", currentLayout === "list");
  els.focusLayoutBtn.classList.toggle("active", currentLayout === "focus");
  renderCards();
  if (currentLayout === "focus" && visible.length) {
    window.setTimeout(() => els.questionGrid.scrollIntoView({ block: "start" }), 0);
  }
}

function questionById(id) {
  return allQuestions.find((question) => question.id === id);
}

function toggleSelect(id) {
  if (selected.has(id)) selected.delete(id);
  else selected.add(id);
  redraw();
}

function activateToolsTab(tab = "filter") {
  const nextTab = [...els.practiceToolsTabs].some((button) => button.dataset.toolsTab === tab) ? tab : "filter";
  els.practiceToolsTabs.forEach((button) => {
    const active = button.dataset.toolsTab === nextTab;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });
  els.practiceToolsPanels.forEach((panel) => {
    const active = panel.dataset.toolsPanel === nextTab;
    panel.classList.toggle("active", active);
    panel.hidden = !active;
  });
}

function setMobileToolsOpen(open, tab = "") {
  if (!els.practiceSidebar || !els.mobileToolsToggle) return;
  if (tab) activateToolsTab(tab);
  els.practiceSidebar.classList.toggle("open", open);
  els.mobileToolsToggle.setAttribute("aria-expanded", String(open));
  if (els.mobileToolsBackdrop) els.mobileToolsBackdrop.hidden = !open;
  document.body.classList.toggle("practice-tools-open", open);
  if (!els.practiceToolsPalette) return;
  if (open && !els.practiceToolsPalette.open) {
    if (typeof els.practiceToolsPalette.showModal === "function") els.practiceToolsPalette.showModal();
    else els.practiceToolsPalette.setAttribute("open", "");
  } else if (!open && els.practiceToolsPalette.open) {
    els.practiceToolsPalette.close();
  }
}

function setAdvancedFiltersOpen(open) {
  if (!els.advancedFilters || !els.advancedFiltersToggle) return;
  els.advancedFilters.hidden = !open;
  els.advancedFiltersToggle.setAttribute("aria-expanded", String(open));
  els.advancedFiltersToggle.textContent = open ? "Hide filters" : "More filters";
}

function selectVisible() {
  visible.forEach((question) => selected.add(question.id));
  redraw();
}

function clearVisible() {
  visible.forEach((question) => selected.delete(question.id));
  redraw();
}

function toggleSolved(id) {
  if (solved.has(id)) {
    solved.delete(id);
  } else {
    solved.add(id);
    recordStudyActivity();
    advanceReview(id);
  }
  redraw();
}

function reviewDone(id) {
  solved.add(id);
  recordStudyActivity();
  advanceReview(id);
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

function hasSolutionContent(solution) {
  if (!solution) return false;
  if (solution.source) return true;
  if (Array.isArray(solution.steps) && solution.steps.some((step) => step?.body || step?.title)) return true;
  return Boolean(solution.finalAnswer);
}

function formatStructuredSolution(solution) {
  if (!solution || !hasSolutionContent(solution)) {
    return `<p class="solution-empty">Solution has not been written yet.</p>`;
  }
  if (!Array.isArray(solution.steps)) {
    return formatSolutionText(solution.source || "");
  }
  const steps = solution.steps
    .filter((step) => step && (step.body || step.title))
    .map((step, index) => `
      <section class="solution-step">
        <strong>${escapeHtml(step.title || `Step ${index + 1}`)}</strong>
        <div>${formatSolutionText(step.body || "")}</div>
      </section>
    `)
    .join("");
  const answer = solution.finalAnswer
    ? `<section class="solution-final"><strong>Final Answer</strong><div>${formatSolutionText(solution.finalAnswer)}</div></section>`
    : "";
  return `${steps}${answer}` || `<p class="solution-empty">Solution has not been written yet.</p>`;
}

function showSolution(id) {
  const question = questionById(id);
  const solution = solutionData[id];
  if (!question || !solution) return;
  els.solutionTitle.textContent = `${question.paper} Q${question.question} | Solution`;
  els.solutionMeta.textContent = `${question.topic} | ${question.marks} marks`;
  els.solutionBody.innerHTML = formatStructuredSolution(solution);
  els.solutionDialog.showModal();
  if (window.MathJax?.typesetPromise) {
    window.MathJax.typesetPromise([els.solutionBody]).catch(() => {});
  }
}

let activeFixId = null;
function openFixTopic(id) {
  const question = questionById(id);
  if (!question) return;
  activeFixId = id;
  els.fixTopicTitle.textContent = `${question.paper} Q${question.question}`;
  els.fixTopicMeta.textContent = `Current: ${question.topic} | ${question.unit}`;
  fillSelect(els.fixTopicSelect, [...els.topicFilter.options].map(o => o.value).filter(Boolean), "Select correct topic");
  els.fixTopicSelect.value = question.topic;
  els.fixTopicDialog.showModal();
}

function saveFixTopic() {
  const topic = els.fixTopicSelect.value;
  if (!topic || !activeFixId) return;
  const question = questionById(activeFixId);
  const override = { topic: topic };
  localStorage.setItem(`elite_topic_override_${activeFixId}`, JSON.stringify(override));
  question.topic = topic;
  els.fixTopicDialog.close();
  location.reload();
}

function randomTen() {
  const pool = [...visible];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  getScopedQuestions().forEach((question) => selected.delete(question.id));
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
  const basePool = mode === "current" ? visible : getScopedQuestions();
  const pool = basePool.filter((question) => {
    if (topic && question.topic !== topic) return false;
    return matchesWorksheetMode(question, mode);
  });
  if (!pool.length) {
    els.helperTitle.textContent = "No worksheet questions found.";
    els.helperText.textContent = "Relax the filters or choose another topic, then build again.";
    return;
  }
  getScopedQuestions().forEach((question) => selected.delete(question.id));
  shuffled(pool).slice(0, count).forEach((question) => selected.add(question.id));
  els.viewFilter.value = "selected";
  if (topic && [...els.topicFilter.options].some((option) => option.value === topic)) {
    els.topicFilter.value = topic;
    setTopicChip(topic);
  }
  redraw();
  if (printAfter) printSelected(els.printWorksheetBtn);
}

function practiceMode(mode) {
  setPracticeTab(mode);
  if (mode === "all") {
    reviewMode = "";
    els.viewFilter.value = "";
    els.topicFilter.value = "";
    setTopicChip("");
    redraw();
  }
  if (mode === "topic") {
    els.topicFilter.focus();
  }
  if (mode === "mixed") {
    reviewMode = "";
    els.viewFilter.value = "";
    els.topicFilter.value = "";
    setTopicChip("");
    redraw();
    randomTen();
  }
  if (mode === "unsolved") {
    reviewMode = "";
    els.viewFilter.value = "unsolved";
    redraw();
  }
  if (mode === "weak") {
    reviewMode = "";
    const byTopic = new Map();
    getScopedQuestions().forEach((question) => {
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
  if (mode === "review") {
    reviewMode = "due";
    els.viewFilter.value = "";
    redraw();
  }
}

function setPracticeTab(mode) {
  if (!els.practicePanel) return;
  els.practicePanel.querySelectorAll("[data-practice]").forEach((item) => {
    item.classList.toggle("active", item.dataset.practice === mode);
  });
}

function renderPrintArea(items) {
  const printable = items.length ? items : visible;
  els.printArea.innerHTML = printable.map((question, index) => `<section class="print-question">
    <div class="print-paper-brand">
      <div class="print-brand-lockup">
        <span class="print-brand-mark">EA</span>
      <div>
        <strong>Elite IGCSE Academy</strong>
        <small>Student Download - Dr Eslam Ahmed</small>
      </div>
    </div>
      <span class="print-brand-contact">Cairo University Faculty of Engineering<br>WhatsApp 01120009622 | eliteigcse.com</span>
    </div>
    <h2>${index + 1}. ${escapeHtml(question.paper)} Q${question.question} | ${escapeHtml(question.topic)} | ${question.marks} marks</h2>
    <img src="${question.image}" alt="${escapeHtml(question.paper)} Q${question.question}">
    <div class="print-paper-footer">Downloaded from eliteigcse.com | Dr Eslam Ahmed | 01120009622</div>
  </section>`).join("");
}

async function printQuestions(items, trigger) {
  renderPrintArea(items);
  await window.ElitePrint.printWhenReady(els.printArea, trigger);
}

function selectedQuestions() {
  const activeIds = new Set(questions.map((question) => question.id));
  return [...selected].filter((id) => activeIds.has(id)).map(questionById).filter(Boolean);
}

function printSelected(trigger) {
  printQuestions(selectedQuestions(), trigger);
}

function printVisible(trigger) {
  printQuestions(visible, trigger);
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
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (action === "focusNav") {
    setFocusQuestion(event.target.closest("[data-id]")?.dataset.id);
    return;
  }
  if (action === "focusPrev") {
    moveFocusQuestion(-1);
    return;
  }
  if (action === "focusNext") {
    moveFocusQuestion(1);
    return;
  }
  const card = event.target.closest(".question-card");
  if (!card || !action) return;
  if (action === "select") toggleSelect(card.dataset.id);
  if (action === "solve") toggleSolved(card.dataset.id);
  if (action === "reviewAdd") {
    addToReview(card.dataset.id);
    redraw();
  }
  if (action === "reviewDone") reviewDone(card.dataset.id);
  if (action === "reviewRemove") {
    removeReview(card.dataset.id);
    redraw();
  }
  if (action === "zoom") zoom(card.dataset.id);
  if (action === "solution") showSolution(card.dataset.id);
  if (action === "fixTopic") openFixTopic(card.dataset.id);
});

els.topicStrip.addEventListener("click", (event) => {
  const button = event.target.closest("[data-topic]");
  if (!button) return;
  els.topicFilter.value = button.dataset.topic;
  setTopicChip(button.dataset.topic);
  redraw();
});

[els.searchBox, els.unitFilter, els.topicFilter, els.paperFilter, els.viewFilter, els.difficultyFilter, els.minMarks, els.maxMarks, els.minQuestion, els.maxQuestion, els.sortMode].forEach((control) => {
  control.addEventListener("input", () => {
    if (control !== els.sortMode) reviewMode = "";
    if (control === els.unitFilter && window.ELITE_PATHWAY?.isModular && control.value) {
      localStorage.setItem("modularUnit", control.value);
      configureBank();
      showPathwayResumeBanner();
    }
    redraw();
  });
});
els.topicFilter.addEventListener("input", () => {
  setTopicChip(els.topicFilter.value);
  if (!els.worksheetTopic.value) els.worksheetTopic.value = els.topicFilter.value;
});

[
  [els.focusSearchBox, els.searchBox],
  [els.focusUnitFilter, els.unitFilter],
  [els.focusTopicFilter, els.topicFilter],
  [els.focusPaperFilter, els.paperFilter],
  [els.focusViewFilter, els.viewFilter],
].forEach(([source, target]) => {
  source?.addEventListener("input", () => applyFocusQuickFilter(source, target));
});

els.resetBtn.addEventListener("click", () => {
  resetFilters();
  redraw();
});
els.randomBtn.addEventListener("click", randomTen);
els.dueReviewBtn?.addEventListener("click", () => {
  reviewMode = "due";
  redraw();
});
els.allReviewBtn?.addEventListener("click", () => {
  reviewMode = "box";
  redraw();
});
els.buildWorksheetBtn.addEventListener("click", () => buildWorksheet());
els.printWorksheetBtn.addEventListener("click", () => buildWorksheet({ printAfter: true }));
els.clearSelectedBtn.addEventListener("click", () => {
  getScopedQuestions().forEach((question) => selected.delete(question.id));
  redraw();
});
els.selectVisibleBtn.addEventListener("click", selectVisible);
els.clearVisibleBtn.addEventListener("click", clearVisible);
els.printVisibleBtn.addEventListener("click", () => printVisible(els.printVisibleBtn));
els.printSelectedInlineBtn.addEventListener("click", printSelected);
els.printSelectedBtn.addEventListener("click", () => printSelected(els.printSelectedBtn));
els.printSelectedBtnHero.addEventListener("click", () => printSelected(els.printSelectedBtnHero));
els.closeViewerBtn.addEventListener("click", () => els.viewerDialog.close());
els.closeSolutionBtn.addEventListener("click", () => els.solutionDialog.close());
els.closeFixTopicBtn.addEventListener("click", () => els.fixTopicDialog.close());
els.saveFixTopicBtn.addEventListener("click", saveFixTopic);
document.addEventListener("click", (event) => {
  const toolsTab = event.target.closest("[data-tools-tab]");
  if (toolsTab) activateToolsTab(toolsTab.dataset.toolsTab);
  if (event.target.closest("#advancedFiltersToggle")) {
    setAdvancedFiltersOpen(els.advancedFilters?.hidden !== false);
  }
  if (event.target.closest("#mobileToolsToggle")) {
    setMobileToolsOpen(!els.practiceToolsPalette?.open, "filter");
  }
  if (event.target.closest("#mobileToolsBackdrop")) {
    setMobileToolsOpen(false);
  }
});
document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    setMobileToolsOpen(true, "filter");
  }
  if (event.key === "Escape") setMobileToolsOpen(false);
  if (currentLayout === "focus" && !["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName || "")) {
    if (els.viewerDialog.open || els.solutionDialog.open || els.fixTopicDialog.open) return;
    if (event.key === "ArrowLeft") moveFocusQuestion(-1);
    if (event.key === "ArrowRight") moveFocusQuestion(1);
  }
});
els.gridLayoutBtn.addEventListener("click", () => setLayout("grid"));
els.listLayoutBtn.addEventListener("click", () => setLayout("list"));
els.focusLayoutBtn.addEventListener("click", () => setLayout("focus"));
els.focusMoreFiltersBtn?.addEventListener("click", () => {
  setMobileToolsOpen(true, "filter");
  setAdvancedFiltersOpen(true);
  els.searchBox?.scrollIntoView({ block: "center", behavior: "smooth" });
  els.searchBox?.focus();
});
els.practiceToolsCloseBtn?.addEventListener("click", () => setMobileToolsOpen(false));
els.practiceToolsPalette?.addEventListener("click", (event) => {
  if (event.target === els.practiceToolsPalette) setMobileToolsOpen(false);
});
els.practiceToolsPalette?.addEventListener("close", () => {
  els.practiceSidebar?.classList.remove("open");
  els.mobileToolsToggle?.setAttribute("aria-expanded", "false");
  if (els.mobileToolsBackdrop) els.mobileToolsBackdrop.hidden = true;
  document.body.classList.remove("practice-tools-open");
});
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
