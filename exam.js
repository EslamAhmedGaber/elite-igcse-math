(function () {
  const questions = window.QUESTION_DATA || [];
  const solutions = window.SOLUTION_DATA || {};
  const EXAM_KEY = "eliteMockExamV1";
  const HISTORY_KEY = "eliteMockExamHistoryV1";
  const REVIEW_KEY = "eliteMistakeBoxV1";
  const SOLVED_KEY = "solvedExpertiseQuestions";
  const SELECTED_KEY = "selectedExpertiseQuestions";
  const SAVED_TESTS_KEY = "eliteSavedTestsV1";
  const DRAFT_KEY = "eliteTestBuilderDraftV1";
  const MAX_FILTER_RESULTS = 80;

  const els = {
    modeTabs: [...document.querySelectorAll("[data-exam-mode]")],
    modePanels: [...document.querySelectorAll("[data-mode-panel]")],
    bank: document.getElementById("examBank"),
    unit: document.getElementById("examUnit"),
    topic: document.getElementById("examTopic"),
    duration: document.getElementById("examDuration"),
    count: document.getElementById("examCount"),
    targetMarks: document.getElementById("examTargetMarks"),
    unsolvedOnly: document.getElementById("examUnsolvedOnly"),
    avoidRepeats: document.getElementById("examAvoidRepeats"),
    randomPreset: document.getElementById("randomPreset"),
    start: document.getElementById("startExamBtn"),
    finish: document.getElementById("finishExamBtn"),
    save: document.getElementById("saveExamBtn"),
    saveTest: document.getElementById("saveCurrentTestBtn"),
    reset: document.getElementById("resetExamBtn"),
    print: document.getElementById("printExamBtn"),
    timer: document.getElementById("examTimer"),
    timerLabel: document.getElementById("examTimerLabel"),
    result: document.getElementById("examResultCard"),
    weakness: document.getElementById("examWeaknessGrid"),
    paper: document.getElementById("examPaper"),
    customSearch: document.getElementById("builderSearch"),
    customBank: document.getElementById("builderBank"),
    customUnit: document.getElementById("builderUnit"),
    customTopic: document.getElementById("builderTopic"),
    customPaper: document.getElementById("builderPaper"),
    customDifficulty: document.getElementById("builderDifficulty"),
    customStatus: document.getElementById("builderStatus"),
    customMinMarks: document.getElementById("builderMinMarks"),
    customMaxMarks: document.getElementById("builderMaxMarks"),
    customResults: document.getElementById("builderResults"),
    customSummary: document.getElementById("builderSummary"),
    addVisible: document.getElementById("addVisibleBtn"),
    addPracticeSelected: document.getElementById("addPracticeSelectedBtn"),
    clearDraft: document.getElementById("clearDraftBtn"),
    useDraft: document.getElementById("useDraftBtn"),
    draftList: document.getElementById("draftList"),
    draftSummary: document.getElementById("draftSummary"),
    smartBank: document.getElementById("smartBank"),
    smartUnit: document.getElementById("smartUnit"),
    smartCount: document.getElementById("smartCount"),
    smartDuration: document.getElementById("smartDuration"),
    smartMistakes: document.getElementById("smartMistakes"),
    smartWeakTopics: document.getElementById("smartWeakTopics"),
    smartUnsolved: document.getElementById("smartUnsolved"),
    generateSmart: document.getElementById("generateSmartBtn"),
    savedTests: document.getElementById("savedTestsList"),
    savedSummary: document.getElementById("savedTestsSummary")
  };

  const byId = new Map(questions.map((question) => [question.id, question]));

  let state = readState();
  let activeMode = "random";
  let draftIds = readJson(DRAFT_KEY, []);
  let tickHandle = null;
  let filteredBuilderQuestions = [];

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    }[char]));
  }

  function readJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch (err) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function readState() {
    return readJson(EXAM_KEY, { status: "idle", ids: [], scores: {}, kind: "random" });
  }

  function saveState() {
    writeJson(EXAM_KEY, state);
  }

  function saveDraft() {
    writeJson(DRAFT_KEY, draftIds);
  }

  function savedTests() {
    return readJson(SAVED_TESTS_KEY, []);
  }

  function saveSavedTests(items) {
    writeJson(SAVED_TESTS_KEY, items);
  }

  function sourceKey(question) {
    return question.source_id || question.id;
  }

  function sourceSet(ids) {
    return new Set(ids.map((id) => byId.get(id)).filter(Boolean).map(sourceKey));
  }

  function solvedSet() {
    const solved = new Set(readJson(SOLVED_KEY, []));
    const sources = sourceSet([...solved]);
    return { ids: solved, sources };
  }

  function selectedSet() {
    const selected = new Set(readJson(SELECTED_KEY, []));
    const sources = sourceSet([...selected]);
    return { ids: selected, sources };
  }

  function isSolved(question) {
    const solved = solvedSet();
    return solved.ids.has(question.id) || solved.sources.has(sourceKey(question));
  }

  function isPracticeSelected(question) {
    const selected = selectedSet();
    return selected.ids.has(question.id) || selected.sources.has(sourceKey(question));
  }

  function activePathway() {
    return window.ELITE_PATHWAY?.mode === "modular" ? "modular" : "linear";
  }

  function displayUnit(question) {
    return activePathway() === "modular" ? question.modular_unit : question.linear_unit;
  }

  function unitsForPathway() {
    const catalog = activePathway() === "modular" ? window.MODULAR_TOPIC_CATALOG || [] : window.LINEAR_TOPIC_CATALOG || [];
    return [...new Set(catalog.map((entry) => entry.unit))];
  }

  function topicsForUnit(unit) {
    const catalog = activePathway() === "modular" ? window.MODULAR_TOPIC_CATALOG || [] : window.LINEAR_TOPIC_CATALOG || [];
    return catalog.filter((entry) => !unit || entry.unit === unit).map((entry) => entry.topic);
  }

  function fillSelect(select, values, firstLabel, preserve = "") {
    if (!select) return;
    const current = preserve || select.value;
    select.innerHTML = `<option value="">${escapeHtml(firstLabel)}</option>${values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("")}`;
    if (values.includes(current)) select.value = current;
  }

  function populatePathwayFilters() {
    const units = unitsForPathway();
    fillSelect(els.unit, units, activePathway() === "modular" ? "Both units" : "All chapters");
    fillSelect(els.customUnit, units, activePathway() === "modular" ? "Both units" : "All chapters");
    fillSelect(els.smartUnit, units, activePathway() === "modular" ? "Both units" : "All chapters");
    refreshTopicOptions();
    refreshBuilderTopicOptions();
  }

  function refreshTopicOptions() {
    fillSelect(els.topic, topicsForUnit(els.unit?.value || ""), "All topics");
  }

  function refreshBuilderTopicOptions() {
    fillSelect(els.customTopic, topicsForUnit(els.customUnit?.value || ""), "All topics");
  }

  function uniqueSorted(values) {
    return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  function refreshBuilderPaperOptions() {
    const bank = els.customBank?.value || "all";
    const unit = els.customUnit?.value || "";
    const topic = els.customTopic?.value || "";
    const papers = questions
      .filter((question) => question.bank === bank)
      .filter((question) => !unit || displayUnit(question) === unit)
      .filter((question) => !topic || question.topic === topic)
      .map((question) => question.paper);
    fillSelect(els.customPaper, uniqueSorted(papers), "All papers");
  }

  function questionById(id) {
    return byId.get(id);
  }

  function shuffle(items) {
    const pool = [...items];
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool;
  }

  function difficultyMatch(question, difficulty) {
    if (!difficulty) return true;
    if (difficulty === "quick") return Number(question.marks || 0) <= 3;
    if (difficulty === "standard") return Number(question.marks || 0) >= 4 && Number(question.marks || 0) <= 6;
    if (difficulty === "long") return Number(question.marks || 0) >= 7;
    if (difficulty === "q20") return Number(question.question || 0) >= 20;
    return true;
  }

  function eligiblePool({
    bank = "all",
    unit = "",
    topic = "",
    difficulty = "",
    unsolvedOnly = false,
    avoidSources = new Set(),
    search = "",
    paper = "",
    status = "",
    minMarks = "",
    maxMarks = ""
  } = {}) {
    const needle = search.trim().toLowerCase();
    return questions
      .filter((question) => question.bank === bank)
      .filter((question) => !unit || displayUnit(question) === unit)
      .filter((question) => !topic || question.topic === topic)
      .filter((question) => !paper || question.paper === paper)
      .filter((question) => difficultyMatch(question, difficulty))
      .filter((question) => !unsolvedOnly || !isSolved(question))
      .filter((question) => !avoidSources.has(sourceKey(question)))
      .filter((question) => minMarks === "" || Number(question.marks || 0) >= Number(minMarks))
      .filter((question) => maxMarks === "" || Number(question.marks || 0) <= Number(maxMarks))
      .filter((question) => {
        if (status === "solved") return isSolved(question);
        if (status === "unsolved") return !isSolved(question);
        if (status === "selected") return isPracticeSelected(question);
        return true;
      })
      .filter((question) => {
        if (!needle) return true;
        return [
          question.topic,
          question.paper,
          question.code,
          question.question,
          question.text,
          question.question_text
        ].join(" ").toLowerCase().includes(needle);
      });
  }

  function uniqueBySource(pool) {
    const seen = new Set();
    return pool.filter((question) => {
      const key = sourceKey(question);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function takeUnique(target, pool, targetCount, targetMarks = 0) {
    const used = new Set(target.map(sourceKey));
    shuffle(pool).forEach((question) => {
      if (used.has(sourceKey(question))) return;
      if (targetCount && target.length >= targetCount) return;
      const currentMarks = totalMarksForQuestions(target);
      if (targetMarks && currentMarks >= targetMarks && target.length) return;
      target.push(question);
      used.add(sourceKey(question));
    });
  }

  function totalMarksForQuestions(items) {
    return items.reduce((sum, question) => sum + Number(question.marks || 0), 0);
  }

  function estimatedMinutes(items) {
    return Math.max(5, Math.ceil(totalMarksForQuestions(items) * 1.5));
  }

  function recentMockSources() {
    const history = readJson(HISTORY_KEY, []);
    return new Set(history.flatMap((entry) => entry.ids || []).map((id) => sourceKey(questionById(id) || {})).filter(Boolean));
  }

  function buildBalancedPaper(options) {
    const pool = uniqueBySource(eligiblePool(options));
    const count = Number(options.count || 25);
    const targetMarks = Number(options.targetMarks || 0);
    const quickTarget = Math.max(2, Math.round(count * 0.28));
    const standardTarget = Math.max(3, Math.round(count * 0.4));
    const picked = [];
    takeUnique(picked, pool.filter((question) => Number(question.marks || 0) <= 3), quickTarget, targetMarks);
    takeUnique(picked, pool.filter((question) => Number(question.marks || 0) >= 4 && Number(question.marks || 0) <= 6), quickTarget + standardTarget, targetMarks);
    takeUnique(picked, pool.filter((question) => Number(question.marks || 0) >= 7 || Number(question.question || 0) >= 20), count, targetMarks);
    takeUnique(picked, pool, count, targetMarks);
    return picked.slice(0, count);
  }

  function formatTime(totalSeconds) {
    const seconds = Math.max(0, Math.floor(totalSeconds));
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function remainingSeconds() {
    if (state.status !== "running") return Number(state.durationSeconds || 0);
    const elapsed = Math.floor((Date.now() - Number(state.startedAt || Date.now())) / 1000);
    return Number(state.durationSeconds || 0) - elapsed;
  }

  function updateTimer() {
    const remaining = remainingSeconds();
    els.timer.textContent = formatTime(remaining);
    if (state.status === "running") {
      els.timerLabel.textContent = remaining <= 0 ? "Time is up" : "Exam running";
      if (remaining <= 0) {
        state.status = "marking";
        state.finishedAt = Date.now();
        saveState();
        render();
      }
    } else if (state.status === "marking") {
      els.timerLabel.textContent = "Mark your paper";
    } else if (state.status === "complete") {
      els.timerLabel.textContent = "Result saved";
    } else {
      const duration = Number(state.durationSeconds || Number(els.duration?.value || 90) * 60);
      els.timer.textContent = formatTime(duration);
      els.timerLabel.textContent = state.ids?.length ? "Paper ready" : "Ready to start";
    }
  }

  function startTicker() {
    if (tickHandle) clearInterval(tickHandle);
    tickHandle = setInterval(updateTimer, 1000);
    updateTimer();
  }

  function createPaper(ids, options = {}) {
    state = {
      status: options.startNow ? "running" : "idle",
      kind: options.kind || "random",
      title: options.title || "",
      bank: options.bank || "all",
      unit: options.unit || "",
      durationSeconds: Number(options.durationMinutes || 90) * 60,
      startedAt: options.startNow ? Date.now() : null,
      finishedAt: null,
      ids: [...ids],
      scores: {}
    };
    saveState();
    render();
  }

  function startRandomExam() {
    const avoidSources = els.avoidRepeats?.checked ? recentMockSources() : new Set();
    const picked = buildBalancedPaper({
      bank: els.bank.value,
      unit: els.unit?.value || "",
      topic: els.topic?.value || "",
      count: Number(els.count.value || 25),
      targetMarks: Number(els.targetMarks.value || 0),
      unsolvedOnly: Boolean(els.unsolvedOnly?.checked),
      avoidSources
    });
    if (!picked.length) {
      showBuildMessage("No questions match those mock filters yet. Widen the filters and try again.");
      return;
    }
    createPaper(
      picked.map((question) => question.id),
      {
        startNow: true,
        kind: "random",
        bank: els.bank.value,
        unit: els.unit?.value || "",
        durationMinutes: Number(els.duration.value || 90),
        title: "Random mock"
      }
    );
  }

  function finishExam() {
    if (state.status !== "running") return;
    state.status = "marking";
    state.finishedAt = Date.now();
    saveState();
    render();
  }

  function totalMarks() {
    return state.ids.map(questionById).filter(Boolean).reduce((sum, question) => sum + Number(question.marks || 0), 0);
  }

  function achievedMarks() {
    return state.ids.reduce((sum, id) => sum + Math.max(0, Number(state.scores?.[id] || 0)), 0);
  }

  function readScoreInputs() {
    document.querySelectorAll("[data-score-id]").forEach((input) => {
      const question = questionById(input.dataset.scoreId);
      if (!question) return;
      const value = Math.max(0, Math.min(Number(question.marks || 0), Number(input.value || 0)));
      state.scores[input.dataset.scoreId] = value;
    });
  }

  function addMistakesToReview() {
    const review = readJson(REVIEW_KEY, {});
    const solved = new Set(readJson(SOLVED_KEY, []));
    const now = Date.now();
    state.ids.forEach((id) => {
      const question = questionById(id);
      if (!question) return;
      const score = Number(state.scores?.[id] || 0);
      if (score >= Number(question.marks || 0)) {
        solved.add(id);
        return;
      }
      review[id] = {
        id,
        reason: state.kind === "smart" ? "smart-revision" : state.kind === "custom" ? "custom-test" : "mock-exam",
        level: 0,
        attempts: (review[id]?.attempts || 0) + 1,
        addedAt: review[id]?.addedAt || now,
        updatedAt: now,
        dueAt: now
      };
    });
    writeJson(REVIEW_KEY, review);
    writeJson(SOLVED_KEY, [...solved]);
  }

  function saveMarks() {
    if (state.status !== "marking" && state.status !== "complete") return;
    readScoreInputs();
    state.status = "complete";
    state.savedAt = Date.now();
    saveState();
    addMistakesToReview();
    saveHistory();
    render();
  }

  function saveHistory() {
    const history = readJson(HISTORY_KEY, []);
    const total = totalMarks();
    const score = achievedMarks();
    history.unshift({
      date: new Date().toISOString(),
      bank: state.bank,
      kind: state.kind || "random",
      title: state.title || "",
      ids: state.ids,
      score,
      total,
      percent: total ? Math.round((score / total) * 100) : 0
    });
    writeJson(HISTORY_KEY, history.slice(0, 12));
  }

  function resetExam() {
    state = { status: "idle", ids: [], scores: {}, kind: "random" };
    saveState();
    render();
  }

  function topicBreakdown() {
    const map = new Map();
    state.ids.map(questionById).filter(Boolean).forEach((question) => {
      const score = Math.max(0, Number(state.scores?.[question.id] || 0));
      const row = map.get(question.topic) || { topic: question.topic, unit: displayUnit(question), score: 0, total: 0, lost: 0 };
      row.score += score;
      row.total += Number(question.marks || 0);
      row.lost += Math.max(0, Number(question.marks || 0) - score);
      map.set(question.topic, row);
    });
    return [...map.values()].sort((a, b) => b.lost - a.lost || b.total - a.total);
  }

  function topicLink(row) {
    const params = new URLSearchParams({ bank: state.bank || "all", unit: row.unit, topic: row.topic, mode: "weak" });
    return `practice.html?${params.toString()}`;
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

  function renderResult() {
    if (state.status === "idle" && !state.ids.length) {
      const last = readJson(HISTORY_KEY, [])[0];
      els.result.innerHTML = last
        ? `<strong>Last test: ${last.score}/${last.total} (${last.percent}%).</strong><p>Build a fresh mock, custom test, or smart revision set when you are ready.</p>`
        : `<strong>No active paper yet.</strong><p>Build a paper above, then start it or print it.</p>`;
      els.weakness.innerHTML = "";
      return;
    }
    const total = totalMarks();
    const score = achievedMarks();
    const percent = total ? Math.round((score / total) * 100) : 0;
    const ready = state.status === "idle";
    const label = ready
      ? "Paper ready"
      : state.status === "running"
        ? "Exam in progress"
        : state.status === "marking"
          ? "Self-marking mode"
          : "Result saved";
    const copy = ready
      ? `${state.ids.length} questions, ${total} marks, about ${estimatedMinutes(state.ids.map(questionById).filter(Boolean))} minutes.`
      : state.status === "running"
        ? "Answers stay private until you finish."
        : "Enter your marks, then save to update the Mistake Box.";
    els.result.innerHTML = `<div class="exam-score-ring" style="--score:${percent}%"><strong>${ready ? total : percent + "%"}</strong><span>${ready ? "marks" : `${score}/${total}`}</span></div>
      <div><strong>${label}</strong><p>${copy}</p></div>`;
    if (state.status === "running" || ready) {
      els.weakness.innerHTML = "";
      return;
    }
    els.weakness.innerHTML = topicBreakdown().slice(0, 4).map((row) => `<article>
      <strong>${escapeHtml(row.topic)}</strong>
      <p>${row.score}/${row.total} marks. Lost ${row.lost} mark${row.lost === 1 ? "" : "s"}.</p>
      <a class="button primary" href="${topicLink(row)}">Revise topic</a>
    </article>`).join("");
  }

  function showBuildMessage(message) {
    els.result.innerHTML = `<strong>Paper not built yet.</strong><p>${escapeHtml(message)}</p>`;
  }

  function renderPaper() {
    if (!state.ids.length) {
      els.paper.innerHTML = `<div class="empty-roadmap">Your built paper will appear here.</div>`;
      return;
    }
    const canMark = state.status !== "running" && state.status !== "idle";
    els.paper.innerHTML = state.ids.map((id, index) => {
      const question = questionById(id);
      if (!question) return "";
      const solution = solutions[id]?.source || "";
      const hasSolution = Boolean(solution);
      const savedScore = state.scores?.[id] ?? "";
      return `<article class="exam-question" data-id="${escapeHtml(id)}">
        <div class="print-paper-brand">
          <strong>Elite IGCSE Mathematics - Dr Eslam Ahmed</strong>
          <span>Assistant Lecturer, Cairo University Faculty of Engineering | WhatsApp: 01120009622 | eliteigcse.com</span>
        </div>
        <header>
          <div>
            <span>Question ${index + 1}</span>
            <strong>${escapeHtml(question.paper)} Q${question.question}</strong>
          </div>
          <em>${question.marks} marks</em>
        </header>
        <img src="${question.image}" alt="${escapeHtml(question.paper)} Q${question.question}" loading="lazy">
        <footer>
          <span>${escapeHtml(question.topic)}</span>
          ${canMark ? `<label>Score <input data-score-id="${escapeHtml(id)}" type="number" min="0" max="${question.marks}" value="${savedScore}"> / ${question.marks}</label>` : `<span>${state.status === "running" ? "Answers stay private during the exam" : "Ready to start or print"}</span>`}
        </footer>
        ${canMark && hasSolution ? `<details class="exam-solution"><summary>Show worked solution</summary>${formatSolutionText(solution)}</details>` : ""}
        <div class="print-paper-footer">Prepared by Dr Eslam Ahmed | Assistant Lecturer, Cairo University Faculty of Engineering | 01120009622</div>
      </article>`;
    }).join("");
    if (window.MathJax?.typesetPromise && canMark) {
      window.MathJax.typesetPromise([els.paper]).catch(() => {});
    }
  }

  function renderButtons() {
    els.finish.disabled = state.status !== "running";
    els.save.disabled = state.status !== "marking" && state.status !== "complete";
    els.print.disabled = !state.ids.length;
    els.saveTest.disabled = !state.ids.length;
    els.start.disabled = state.status === "running";
    els.start.textContent = state.ids.length && state.status === "idle" ? "Start current paper" : "Generate and start";
  }

  function switchMode(mode) {
    activeMode = mode;
    els.modeTabs.forEach((button) => button.classList.toggle("active", button.dataset.examMode === mode));
    els.modePanels.forEach((panel) => {
      panel.hidden = panel.dataset.modePanel !== mode;
    });
  }

  function buildOrStartRandom() {
    if (state.ids.length && state.status === "idle") {
      state.status = "running";
      state.startedAt = Date.now();
      state.finishedAt = null;
      saveState();
      render();
      return;
    }
    startRandomExam();
  }

  function renderBuilderResults() {
    filteredBuilderQuestions = uniqueBySource(eligiblePool({
      bank: els.customBank.value,
      unit: els.customUnit.value,
      topic: els.customTopic.value,
      paper: els.customPaper.value,
      difficulty: els.customDifficulty.value,
      status: els.customStatus.value,
      minMarks: els.customMinMarks.value,
      maxMarks: els.customMaxMarks.value,
      search: els.customSearch.value
    }));
    const shown = filteredBuilderQuestions.slice(0, MAX_FILTER_RESULTS);
    els.customSummary.textContent = `${filteredBuilderQuestions.length} matching question${filteredBuilderQuestions.length === 1 ? "" : "s"}${filteredBuilderQuestions.length > MAX_FILTER_RESULTS ? `, showing first ${MAX_FILTER_RESULTS}` : ""}`;
    els.customResults.innerHTML = shown.map((question) => {
      const inDraft = draftIds.includes(question.id);
      return `<article class="builder-result ${inDraft ? "selected" : ""}">
        <div>
          <strong>${escapeHtml(question.topic)}</strong>
          <span>${escapeHtml(question.paper)} Q${question.question} | ${question.marks} marks | ${escapeHtml(displayUnit(question) || "")}</span>
        </div>
        <button type="button" data-builder-toggle="${escapeHtml(question.id)}">${inDraft ? "Remove" : "Add"}</button>
      </article>`;
    }).join("") || `<div class="empty-roadmap">No questions match these filters.</div>`;
  }

  function draftQuestions() {
    return draftIds.map(questionById).filter(Boolean);
  }

  function renderDraft() {
    const items = draftQuestions();
    const marks = totalMarksForQuestions(items);
    els.draftSummary.textContent = `${items.length} question${items.length === 1 ? "" : "s"} | ${marks} marks | about ${items.length ? estimatedMinutes(items) : 0} min`;
    els.draftList.innerHTML = items.map((question, index) => `<article class="draft-item">
      <div>
        <strong>${index + 1}. ${escapeHtml(question.topic)}</strong>
        <span>${escapeHtml(question.paper)} Q${question.question} | ${question.marks} marks</span>
      </div>
      <div class="draft-actions">
        <button type="button" data-draft-move="up" data-id="${escapeHtml(question.id)}" ${index === 0 ? "disabled" : ""}>Up</button>
        <button type="button" data-draft-move="down" data-id="${escapeHtml(question.id)}" ${index === items.length - 1 ? "disabled" : ""}>Down</button>
        <button type="button" data-draft-remove="${escapeHtml(question.id)}">Remove</button>
      </div>
    </article>`).join("") || `<div class="empty-roadmap">Your selected questions will appear here.</div>`;
  }

  function toggleDraft(id) {
    if (draftIds.includes(id)) draftIds = draftIds.filter((item) => item !== id);
    else draftIds.push(id);
    saveDraft();
    renderBuilderResults();
    renderDraft();
  }

  function addVisibleToDraft() {
    const ids = filteredBuilderQuestions.slice(0, MAX_FILTER_RESULTS).map((question) => question.id);
    ids.forEach((id) => {
      if (!draftIds.includes(id)) draftIds.push(id);
    });
    saveDraft();
    renderBuilderResults();
    renderDraft();
  }

  function addPracticeSelectedToDraft() {
    uniqueBySource(eligiblePool({ bank: els.customBank.value || "all", status: "selected" })).forEach((question) => {
      if (!draftIds.includes(question.id)) draftIds.push(question.id);
    });
    saveDraft();
    renderBuilderResults();
    renderDraft();
  }

  function moveDraft(id, direction) {
    const index = draftIds.indexOf(id);
    if (index < 0) return;
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= draftIds.length) return;
    [draftIds[index], draftIds[nextIndex]] = [draftIds[nextIndex], draftIds[index]];
    saveDraft();
    renderDraft();
  }

  function useDraftAsPaper() {
    const items = draftQuestions();
    if (!items.length) return;
    createPaper([...draftIds], {
      kind: "custom",
      bank: els.customBank.value || "all",
      unit: els.customUnit.value || "",
      durationMinutes: estimatedMinutes(items),
      title: "Custom test"
    });
  }

  function weakTopicPool(bank, unit) {
    const pool = uniqueBySource(eligiblePool({ bank, unit }));
    const rows = new Map();
    pool.forEach((question) => {
      const row = rows.get(question.topic) || { topic: question.topic, total: 0, solved: 0 };
      row.total += 1;
      if (isSolved(question)) row.solved += 1;
      rows.set(question.topic, row);
    });
    const weakest = [...rows.values()]
      .filter((row) => row.total >= 2)
      .sort((a, b) => (a.solved / a.total) - (b.solved / b.total) || b.total - a.total)
      .slice(0, 4)
      .map((row) => row.topic);
    return pool.filter((question) => weakest.includes(question.topic) && !isSolved(question));
  }

  function mistakePool(bank, unit) {
    const review = readJson(REVIEW_KEY, {});
    const dueIds = Object.values(review)
      .filter((item) => Number(item.dueAt || 0) <= Date.now())
      .map((item) => item.id);
    const dueSources = sourceSet(dueIds);
    return uniqueBySource(eligiblePool({ bank, unit })).filter((question) => dueSources.has(sourceKey(question)));
  }

  function unsolvedPool(bank, unit) {
    return uniqueBySource(eligiblePool({ bank, unit, unsolvedOnly: true }));
  }

  function buildSmartRevision() {
    const bank = els.smartBank.value || "all";
    const unit = els.smartUnit.value || "";
    const count = Number(els.smartCount.value || 12);
    const target = [];
    if (els.smartMistakes.checked) takeUnique(target, mistakePool(bank, unit), count);
    if (els.smartWeakTopics.checked) takeUnique(target, weakTopicPool(bank, unit), count);
    if (els.smartUnsolved.checked) takeUnique(target, unsolvedPool(bank, unit), count);
    takeUnique(target, uniqueBySource(eligiblePool({ bank, unit })), count);
    if (!target.length) {
      showBuildMessage("There are no matching questions for this smart revision setup yet.");
      return;
    }
    createPaper(target.slice(0, count).map((question) => question.id), {
      kind: "smart",
      bank,
      unit,
      durationMinutes: Number(els.smartDuration.value || estimatedMinutes(target)),
      title: "Smart revision"
    });
  }

  function saveCurrentTest() {
    if (!state.ids.length) return;
    const fallback = state.title || `${state.kind || "Custom"} test`;
    const name = window.prompt("Name this saved test", fallback);
    if (!name) return;
    const items = savedTests();
    items.unshift({
      id: `test-${Date.now()}`,
      name: name.trim(),
      bank: state.bank || "all",
      unit: state.unit || "",
      kind: state.kind || "custom",
      durationSeconds: state.durationSeconds || 0,
      ids: state.ids,
      createdAt: Date.now()
    });
    saveSavedTests(items.slice(0, 24));
    renderSavedTests();
  }

  function renderSavedTests() {
    const items = savedTests();
    els.savedSummary.textContent = `${items.length} saved test${items.length === 1 ? "" : "s"}`;
    els.savedTests.innerHTML = items.map((item) => {
      const qs = item.ids.map(questionById).filter(Boolean);
      return `<article class="saved-test">
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <span>${qs.length} questions | ${totalMarksForQuestions(qs)} marks | ${escapeHtml(item.unit || "Mixed")}</span>
        </div>
        <div>
          <button type="button" data-load-test="${escapeHtml(item.id)}">Load</button>
          <button type="button" data-print-test="${escapeHtml(item.id)}">Print</button>
          <button type="button" data-delete-test="${escapeHtml(item.id)}">Delete</button>
        </div>
      </article>`;
    }).join("") || `<div class="empty-roadmap">Saved tests will appear here.</div>`;
  }

  function savedTestById(id) {
    return savedTests().find((item) => item.id === id);
  }

  function loadSavedTest(id, printAfter = false) {
    const test = savedTestById(id);
    if (!test) return;
    state = {
      status: "idle",
      kind: test.kind || "custom",
      title: test.name,
      bank: test.bank || "all",
      unit: test.unit || "",
      durationSeconds: test.durationSeconds || estimatedMinutes(test.ids.map(questionById).filter(Boolean)) * 60,
      startedAt: null,
      finishedAt: null,
      ids: test.ids,
      scores: {}
    };
    saveState();
    render();
    if (printAfter) window.print();
  }

  function deleteSavedTest(id) {
    saveSavedTests(savedTests().filter((item) => item.id !== id));
    renderSavedTests();
  }

  function applyPreset(value) {
    if (value === "quiz") {
      els.bank.value = "all";
      els.count.value = "8";
      els.targetMarks.value = "20";
      els.duration.value = "30";
    } else if (value === "topic") {
      els.bank.value = "all";
      els.count.value = "12";
      els.targetMarks.value = "25";
      els.duration.value = "45";
    } else if (value === "full") {
      els.bank.value = "all";
      els.count.value = "25";
      els.targetMarks.value = "0";
      els.duration.value = "90";
    } else if (value === "hard") {
      els.bank.value = "expertise";
      els.count.value = "12";
      els.targetMarks.value = "0";
      els.duration.value = "60";
    }
  }

  function render() {
    renderButtons();
    renderResult();
    renderPaper();
    renderBuilderResults();
    renderDraft();
    renderSavedTests();
    updateTimer();
  }

  els.modeTabs.forEach((button) => button.addEventListener("click", () => switchMode(button.dataset.examMode)));
  els.start.addEventListener("click", buildOrStartRandom);
  els.finish.addEventListener("click", finishExam);
  els.save.addEventListener("click", saveMarks);
  els.saveTest.addEventListener("click", saveCurrentTest);
  els.reset.addEventListener("click", resetExam);
  els.print.addEventListener("click", () => window.print());
  els.randomPreset?.addEventListener("change", () => applyPreset(els.randomPreset.value));
  els.unit?.addEventListener("change", refreshTopicOptions);
  els.customUnit?.addEventListener("change", () => {
    refreshBuilderTopicOptions();
    refreshBuilderPaperOptions();
    renderBuilderResults();
  });
  [els.customSearch, els.customBank, els.customTopic, els.customPaper, els.customDifficulty, els.customStatus, els.customMinMarks, els.customMaxMarks]
    .filter(Boolean)
    .forEach((input) => input.addEventListener("input", () => {
      if (input === els.customBank || input === els.customTopic) refreshBuilderPaperOptions();
      renderBuilderResults();
    }));
  els.addVisible?.addEventListener("click", addVisibleToDraft);
  els.addPracticeSelected?.addEventListener("click", addPracticeSelectedToDraft);
  els.clearDraft?.addEventListener("click", () => {
    draftIds = [];
    saveDraft();
    renderBuilderResults();
    renderDraft();
  });
  els.useDraft?.addEventListener("click", useDraftAsPaper);
  els.generateSmart?.addEventListener("click", buildSmartRevision);
  els.customResults?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-builder-toggle]");
    if (button) toggleDraft(button.dataset.builderToggle);
  });
  els.draftList?.addEventListener("click", (event) => {
    const remove = event.target.closest("[data-draft-remove]");
    if (remove) {
      draftIds = draftIds.filter((id) => id !== remove.dataset.draftRemove);
      saveDraft();
      renderBuilderResults();
      renderDraft();
      return;
    }
    const move = event.target.closest("[data-draft-move]");
    if (move) moveDraft(move.dataset.id, move.dataset.draftMove);
  });
  els.savedTests?.addEventListener("click", (event) => {
    const load = event.target.closest("[data-load-test]");
    const print = event.target.closest("[data-print-test]");
    const remove = event.target.closest("[data-delete-test]");
    if (load) loadSavedTest(load.dataset.loadTest);
    if (print) loadSavedTest(print.dataset.printTest, true);
    if (remove) deleteSavedTest(remove.dataset.deleteTest);
  });
  els.paper.addEventListener("input", (event) => {
    if (!event.target.matches("[data-score-id]")) return;
    readScoreInputs();
    saveState();
    renderResult();
  });
  els.duration.addEventListener("change", () => {
    if (state.status === "idle" && !state.ids.length) updateTimer();
  });

  populatePathwayFilters();
  refreshBuilderPaperOptions();
  render();
  startTicker();
  switchMode(activeMode);
})();
