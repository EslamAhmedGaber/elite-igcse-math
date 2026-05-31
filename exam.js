(function () {
  const params = new URLSearchParams(window.location.search);
  const requestedPathway = params.get("pathway");
  const requestedCourse = params.get("course");
  const isWma11Course = requestedPathway === "pure" || requestedCourse === "wma11";

  function normalizeMathDelimiters(value) {
    return String(value || "")
      .replace(/\$\$([\s\S]+?)\$\$/g, "\\[$1\\]")
      .replace(/\$([^$\n]+?)\$/g, "\\($1\\)");
  }

  function wma11TopicName(slug, fallback = "") {
    return (window.WMA11_TOPICS || []).find((topic) => topic.slug === slug)?.name || fallback || slug;
  }

  function normalizeWma11Question(item) {
    const primarySlug = item.primaryTopic || item.topic;
    const primaryName = item.primaryTopicName || item.topicName || wma11TopicName(primarySlug);
    const topicNames = item.topicNames?.length
      ? item.topicNames
      : (item.topics || [primarySlug]).map((slug) => wma11TopicName(slug, primaryName));
    return {
      id: item.id,
      source_id: item.id,
      bank: "all",
      course: "wma11",
      is_expertise: Number(item.qNo || 0) >= 6,
      unit: "WMA11",
      linear_unit: "WMA11",
      modular_unit: "WMA11",
      topic: primaryName,
      topics: topicNames,
      topic_slug: primarySlug,
      topic_slugs: item.topics || [primarySlug],
      year: item.year,
      session: item.session,
      paper: item.paper,
      code: item.paperCode,
      paper_code: item.paperCode,
      question: item.qNo,
      marks: item.marks,
      filename: item.downloadName,
      image: item.image,
      question_text: [
        item.id,
        item.paper,
        primaryName,
        ...(topicNames || []),
        `Question ${item.qNo}`,
        `${item.marks} marks`
      ].join(" "),
      finalAnswer: item.finalAnswer,
      steps: item.steps || []
    };
  }

  function wma11Solution(item) {
    return {
      status: "checked",
      checkedBy: "Dr Eslam Ahmed + Codex",
      updated: item.updated || "",
      topicNote: item.topicName || wma11TopicName(item.topic),
      steps: (item.steps || []).map((step) => ({
        title: step.title || "Step",
        body: normalizeMathDelimiters(step.body || "")
      })),
      finalAnswer: normalizeMathDelimiters(item.finalAnswer || "")
    };
  }

  const course = isWma11Course
    ? {
        id: "wma11",
        mode: "pure",
        title: "IAL Pure 1 Revision Book & Test Builder",
        heroTitle: "Build a full Pure 1 test.",
        heroCopy: "Use the same builder engine for WMA11: random mocks, hand-built tests, quick revision quizzes, full prediction booklets, saved tests, marking, and printable worked solutions.",
        unitLabel: "Course",
        unitAllLabel: "All Pure 1",
        units: ["WMA11"],
        topics: (window.WMA11_TOPICS || []).map((topic) => ({ topic: topic.name, unit: "WMA11" })),
        questions: (window.WMA11_QUESTIONS || []).map(normalizeWma11Question),
        solutions: Object.fromEntries((window.WMA11_QUESTIONS || []).map((item) => [item.id, wma11Solution(item)])),
        reviewKey: "eliteWMA11MistakeBoxV1",
        solvedKey: "eliteWMA11SolvedV1",
        selectedKey: "eliteWMA11SelectedV1"
      }
    : {
        id: "igcse",
        mode: "igcse",
        title: "Mocks, Test Builder & Revision Book",
        heroTitle: "Build the exact paper you need.",
        heroCopy: "Generate random mocks, hand-pick topic tests, or build quick revision quizzes and full prediction booklets from past-paper patterns, gaps, mistakes, and weak topics.",
        questions: window.QUESTION_DATA || [],
        solutions: window.SOLUTION_DATA || {},
        reviewKey: "eliteMistakeBoxV1",
        solvedKey: "solvedExpertiseQuestions",
        selectedKey: "selectedExpertiseQuestions"
      };

  const questions = course.questions;
  const solutions = course.solutions;
  const activePrintPalette = course.mode === "pure"
    ? "pure"
    : requestedPathway === "modular" || window.ELITE_PATHWAY?.mode === "modular"
      ? "modular"
      : "linear";
  if (document.body) {
    document.body.dataset.pathway = activePrintPalette;
    document.body.dataset.coursePalette = activePrintPalette;
    window.ElitePrint?.applyPrintPalette?.();
  }
  const keySuffix = course.id === "igcse" ? "" : `:${course.id}`;
  const EXAM_KEY = `eliteMockExamV1${keySuffix}`;
  const HISTORY_KEY = `eliteMockExamHistoryV1${keySuffix}`;
  const REVIEW_KEY = course.reviewKey;
  const SOLVED_KEY = course.solvedKey;
  const SELECTED_KEY = course.selectedKey;
  const SAVED_TESTS_KEY = `eliteSavedTestsV1${keySuffix}`;
  const MIN_REVISION_COUNT = 10;
  const DRAFT_KEY = `eliteTestBuilderDraftV1${keySuffix}`;
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
    topicMix: document.getElementById("examTopicMix"),
    topicMixSummary: document.getElementById("examTopicMixSummary"),
    unsolvedOnly: document.getElementById("examUnsolvedOnly"),
    avoidRepeats: document.getElementById("examAvoidRepeats"),
    randomPreset: document.getElementById("randomPreset"),
    start: document.getElementById("startExamBtn"),
    finish: document.getElementById("finishExamBtn"),
    save: document.getElementById("saveExamBtn"),
    saveTest: document.getElementById("saveCurrentTestBtn"),
    reset: document.getElementById("resetExamBtn"),
    print: document.getElementById("printExamBtn"),
    printSolution: document.getElementById("printSolutionBtn"),
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
    printDraft: document.getElementById("printDraftBtn"),
    printDraftSolution: document.getElementById("printDraftSolutionBtn"),
    draftList: document.getElementById("draftList"),
    draftSummary: document.getElementById("draftSummary"),
    smartBank: document.getElementById("smartBank"),
    smartUnit: document.getElementById("smartUnit"),
    smartProfile: document.getElementById("smartProfile"),
    smartCount: document.getElementById("smartCount"),
    smartDuration: document.getElementById("smartDuration"),
    smartMistakes: document.getElementById("smartMistakes"),
    smartWeakTopics: document.getElementById("smartWeakTopics"),
    smartUnsolved: document.getElementById("smartUnsolved"),
    generateSmart: document.getElementById("generateSmartBtn"),
    smartAnalysisSummary: document.getElementById("smartAnalysisSummary"),
    smartTopicPlan: document.getElementById("smartTopicPlan"),
    smartTopicMix: document.getElementById("smartTopicMix"),
    smartTopicMixSummary: document.getElementById("smartTopicMixSummary"),
    savedTests: document.getElementById("savedTestsList"),
    savedSummary: document.getElementById("savedTestsSummary")
  };

  const byId = new Map(questions.map((question) => [question.id, question]));

  let state = readState();
  let activeMode = "random";
  let draftIds = readJson(DRAFT_KEY, []);
  let tickHandle = null;
  let filteredBuilderQuestions = [];
  let lastRevisionBook = null;

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

  function buildConfigKey(config) {
    return JSON.stringify(config || null);
  }

  function currentPaperMatches(kind, config) {
    return Boolean(
      state.ids?.length &&
      state.kind === kind &&
      buildConfigKey(state.buildConfig) === buildConfigKey(config)
    );
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
    if (course.mode === "pure") return "pure";
    return window.ELITE_PATHWAY?.mode === "modular" ? "modular" : "linear";
  }

  function displayUnit(question) {
    if (activePathway() === "pure") return question.unit || "WMA11";
    return activePathway() === "modular" ? question.modular_unit : question.linear_unit;
  }

  function unitsForPathway() {
    if (activePathway() === "pure") return course.units || ["WMA11"];
    const catalog = activePathway() === "modular" ? window.MODULAR_TOPIC_CATALOG || [] : window.LINEAR_TOPIC_CATALOG || [];
    return [...new Set(catalog.map((entry) => entry.unit))];
  }

  function topicsForUnit(unit) {
    if (activePathway() === "pure") {
      return (course.topics || []).filter((entry) => !unit || entry.unit === unit).map((entry) => entry.topic);
    }
    const catalog = activePathway() === "modular" ? window.MODULAR_TOPIC_CATALOG || [] : window.LINEAR_TOPIC_CATALOG || [];
    return catalog.filter((entry) => !unit || entry.unit === unit).map((entry) => entry.topic);
  }

  function fillSelect(select, values, firstLabel, preserve = "") {
    if (!select) return;
    const current = preserve || select.value;
    select.innerHTML = `<option value="">${escapeHtml(firstLabel)}</option>${values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("")}`;
    if (values.includes(current)) select.value = current;
  }

  function selectedTopicMix(container) {
    if (!container) return [];
    return [...container.querySelectorAll("input[type='checkbox']:checked")].map((input) => input.value);
  }

  function setTopicMix(container, topics = []) {
    if (!container) return;
    const wanted = new Set(topics.filter(Boolean));
    container.querySelectorAll("input[type='checkbox']").forEach((input) => {
      input.checked = wanted.has(input.value);
    });
  }

  function topicPoolCount(topic, bank, unit) {
    return questions
      .filter((question) => questionMatchesBank(question, bank))
      .filter((question) => questionMatchesUnit(question, unit))
      .filter((question) => questionMatchesTopic(question, topic)).length;
  }

  function renderTopicMix(container, summary, unit = "", bank = "all") {
    if (!container) return;
    const previous = new Set(selectedTopicMix(container));
    const topics = topicsForUnit(unit);
    container.innerHTML = topics.map((topic) => {
      const count = topicPoolCount(topic, bank, unit);
      const checked = previous.has(topic) ? " checked" : "";
      return `<label><input type="checkbox" value="${escapeHtml(topic)}"${checked}> <span>${escapeHtml(topic)}</span><em>${count}</em></label>`;
    }).join("") || `<div class="empty-roadmap">No topics match this chapter yet.</div>`;
    updateTopicMixSummary(container, summary);
  }

  function updateTopicMixSummary(container, summary) {
    if (!container || !summary) return;
    const selected = selectedTopicMix(container);
    summary.textContent = selected.length ? `${selected.length} selected` : "All topics";
  }

  function populatePathwayFilters() {
    const units = unitsForPathway();
    const allLabel = course.unitAllLabel || (activePathway() === "modular" ? "Both units" : "All chapters");
    fillSelect(els.unit, units, allLabel);
    fillSelect(els.customUnit, units, allLabel);
    fillSelect(els.smartUnit, units, allLabel);
    refreshTopicOptions();
    refreshBuilderTopicOptions();
    refreshSmartTopicOptions();
  }

  function setSelectIfPresent(select, value) {
    if (!select || !value) return;
    if ([...select.options].some((option) => option.value === value)) {
      select.value = value;
    }
  }

  function applyUrlDefaults() {
    const params = new URLSearchParams(window.location.search);
    const unit = params.get("unit");
    const bank = params.get("bank");
    const mode = params.get("mode");
    const profile = params.get("profile");
    const topicsParam = params.get("topics") || "";
    const urlTopics = topicsParam
      ? topicsParam.split("|").map((item) => item.trim()).filter(Boolean)
      : params.getAll("topic").map((item) => item.trim()).filter(Boolean);
    setSelectIfPresent(els.unit, unit);
    setSelectIfPresent(els.customUnit, unit);
    setSelectIfPresent(els.smartUnit, unit);
    setSelectIfPresent(els.bank, bank);
    setSelectIfPresent(els.customBank, bank);
    setSelectIfPresent(els.smartBank, bank);
    setSelectIfPresent(els.smartProfile, profile);
    if (mode && els.modeTabs.some((button) => button.dataset.examMode === mode)) {
      activeMode = mode;
    }
    refreshTopicOptions();
    refreshBuilderTopicOptions();
    refreshSmartTopicOptions();
    setTopicMix(els.topicMix, urlTopics);
    setTopicMix(els.smartTopicMix, urlTopics);
    updateTopicMixSummary(els.topicMix, els.topicMixSummary);
    updateTopicMixSummary(els.smartTopicMix, els.smartTopicMixSummary);
  }

  function setOptionText(select, value, text) {
    const option = select ? [...select.options].find((item) => item.value === value) : null;
    if (option) option.textContent = text;
  }

  function applyCourseDom() {
    if (course.mode !== "pure") return;
    document.body?.classList.remove("pathway-linear", "pathway-modular");
    document.body?.classList.add("pathway-pure", "exam-course-pure");
    document.title = `${course.title} - Elite IGCSE Mathematics`;
    const title = document.getElementById("examTitle");
    if (title) title.textContent = course.heroTitle;
    const heroCopy = document.querySelector(".exam-hero p");
    if (heroCopy) heroCopy.textContent = course.heroCopy;
    document.querySelectorAll("[data-pathway-label='unit']").forEach((node) => {
      node.textContent = course.unitLabel;
    });
    [els.bank, els.customBank, els.smartBank].forEach((select) => {
      setOptionText(select, "all", "Full WMA11 bank");
      setOptionText(select, "expertise", "Q6+ expertise only");
    });
    const difficulty = [...(els.customDifficulty?.options || [])].find((option) => option.value === "q20");
    if (difficulty) difficulty.textContent = "Q6+ expertise";
    const preset = [...(els.randomPreset?.options || [])].find((option) => option.value === "hard");
    if (preset) preset.textContent = "Q6+ challenge";
  }

  function refreshTopicOptions() {
    fillSelect(els.topic, topicsForUnit(els.unit?.value || ""), "All topics");
    renderTopicMix(els.topicMix, els.topicMixSummary, els.unit?.value || "", els.bank?.value || "all");
  }

  function refreshBuilderTopicOptions() {
    fillSelect(els.customTopic, topicsForUnit(els.customUnit?.value || ""), "All topics");
  }

  function refreshSmartTopicOptions() {
    renderTopicMix(els.smartTopicMix, els.smartTopicMixSummary, els.smartUnit?.value || "", els.smartBank?.value || "all");
  }

  function uniqueSorted(values) {
    return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  function refreshBuilderPaperOptions() {
    const bank = els.customBank?.value || "all";
    const unit = els.customUnit?.value || "";
    const topic = els.customTopic?.value || "";
    const papers = questions
      .filter((question) => questionMatchesBank(question, bank))
      .filter((question) => questionMatchesUnit(question, unit))
      .filter((question) => questionMatchesTopic(question, topic))
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
    if (difficulty === "q20") return activePathway() === "pure" ? Number(question.question || 0) >= 6 : Number(question.question || 0) >= 20;
    return true;
  }

  function questionMatchesBank(question, bank = "all") {
    if (activePathway() === "pure") {
      if (bank === "expertise") return Boolean(question.is_expertise);
      return true;
    }
    return question.bank === bank;
  }

  function questionMatchesUnit(question, unit = "") {
    return !unit || displayUnit(question) === unit;
  }

  function questionMatchesTopic(question, topic = "") {
    return !topic || question.topic === topic || (question.topics || []).includes(topic);
  }

  function questionMatchesAnyTopic(question, topics = []) {
    const list = Array.isArray(topics) ? topics.filter(Boolean) : [];
    return !list.length || list.some((topic) => questionMatchesTopic(question, topic));
  }

  function eligiblePool({
    bank = "all",
    unit = "",
    topic = "",
    topics = [],
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
      .filter((question) => questionMatchesBank(question, bank))
      .filter((question) => questionMatchesUnit(question, unit))
      .filter((question) => questionMatchesTopic(question, topic))
      .filter((question) => questionMatchesAnyTopic(question, topics))
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
          ...(question.topics || []),
          ...(question.topic_slugs || []),
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

  function normaliseTopicList(topics = []) {
    return [...new Set((Array.isArray(topics) ? topics : []).map(String).filter(Boolean))];
  }

  function buildTopicQuotas(topics, count, availableByTopic) {
    const quotas = new Map(topics.map((topic) => [topic, 0]));
    const eligibleTopics = topics.filter((topic) => Number(availableByTopic.get(topic) || 0) > 0);
    if (!eligibleTopics.length || count <= 0) return quotas;

    const base = Math.floor(count / eligibleTopics.length);
    const extraCount = count % eligibleTopics.length;
    const extraTopics = new Set(shuffle(eligibleTopics).slice(0, extraCount));

    eligibleTopics.forEach((topic) => {
      quotas.set(topic, base + (extraTopics.has(topic) ? 1 : 0));
    });

    let deficit = 0;
    eligibleTopics.forEach((topic) => {
      const available = Number(availableByTopic.get(topic) || 0);
      const quota = Number(quotas.get(topic) || 0);
      if (quota > available) {
        deficit += quota - available;
        quotas.set(topic, available);
      }
    });

    while (deficit > 0) {
      const candidates = shuffle(eligibleTopics)
        .filter((topic) => Number(quotas.get(topic) || 0) < Number(availableByTopic.get(topic) || 0))
        .sort((a, b) =>
          Number(quotas.get(a) || 0) - Number(quotas.get(b) || 0) ||
          Number(availableByTopic.get(b) || 0) - Number(availableByTopic.get(a) || 0)
        );
      if (!candidates.length) break;
      const topic = candidates[0];
      quotas.set(topic, Number(quotas.get(topic) || 0) + 1);
      deficit -= 1;
    }

    return quotas;
  }

  function nextUnusedFromTopic(list, usedSources) {
    while (list.length && usedSources.has(sourceKey(list[0]))) {
      list.shift();
    }
    return list.shift() || null;
  }

  function hasUnusedTopicQuestion(list, usedSources) {
    return (list || []).some((question) => !usedSources.has(sourceKey(question)));
  }

  function buildTopicBalancedPaper(pool, options = {}) {
    const topics = normaliseTopicList(options.topics);
    if (topics.length <= 1) return null;

    const count = Math.max(1, Number(options.count || 25));
    const targetMarks = Number(options.targetMarks || 0);
    const byTopic = new Map();
    const availableByTopic = new Map();
    const picked = [];
    const usedSources = new Set();
    const topicCounts = new Map(topics.map((topic) => [topic, 0]));

    topics.forEach((topic) => {
      const topicPool = shuffle(pool.filter((question) => questionMatchesTopic(question, topic)));
      byTopic.set(topic, topicPool);
      availableByTopic.set(topic, topicPool.length);
    });

    const quotas = buildTopicQuotas(topics, count, availableByTopic);
    const targetReached = () =>
      picked.length >= count ||
      (targetMarks && picked.length && totalMarksForQuestions(picked) >= targetMarks);

    function addFromTopic(topic) {
      if (targetReached()) return false;
      const next = nextUnusedFromTopic(byTopic.get(topic) || [], usedSources);
      if (!next) return false;
      picked.push(next);
      usedSources.add(sourceKey(next));
      topicCounts.set(topic, Number(topicCounts.get(topic) || 0) + 1);
      return true;
    }

    let added = true;
    while (!targetReached() && added) {
      added = false;
      const orderedTopics = shuffle(topics).sort((a, b) => {
        const aRemaining = Number(quotas.get(a) || 0) - Number(topicCounts.get(a) || 0);
        const bRemaining = Number(quotas.get(b) || 0) - Number(topicCounts.get(b) || 0);
        return bRemaining - aRemaining;
      });
      orderedTopics.forEach((topic) => {
        if (targetReached()) return;
        if (Number(topicCounts.get(topic) || 0) >= Number(quotas.get(topic) || 0)) return;
        added = addFromTopic(topic) || added;
      });
    }

    while (!targetReached()) {
      const candidates = shuffle(topics)
        .filter((topic) => hasUnusedTopicQuestion(byTopic.get(topic), usedSources))
        .sort((a, b) => Number(topicCounts.get(a) || 0) - Number(topicCounts.get(b) || 0));
      if (!candidates.length || !addFromTopic(candidates[0])) break;
    }

    return picked.slice(0, count);
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
    const topicBalanced = buildTopicBalancedPaper(pool, { ...options, count, targetMarks });
    if (topicBalanced) return topicBalanced;
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
      scores: {},
      revisionMeta: options.revisionMeta || null,
      buildConfig: options.buildConfig || null
    };
    saveState();
    render();
  }

  function randomBuildConfig() {
    return {
      mode: "random",
      course: course.id,
      pathway: activePathway(),
      bank: els.bank?.value || "all",
      unit: els.unit?.value || "",
      topics: selectedTopicMix(els.topicMix),
      count: Math.max(1, Number(els.count?.value || 25)),
      targetMarks: Number(els.targetMarks?.value || 0),
      unsolvedOnly: Boolean(els.unsolvedOnly?.checked),
      avoidRepeats: Boolean(els.avoidRepeats?.checked),
      durationMinutes: Number(els.duration?.value || 90)
    };
  }

  function buildRandomPaper({ startNow = false } = {}) {
    const config = randomBuildConfig();
    const avoidSources = config.avoidRepeats ? recentMockSources() : new Set();
    const picked = buildBalancedPaper({
      bank: config.bank,
      unit: config.unit,
      topic: els.topic?.value || "",
      topics: config.topics,
      count: config.count,
      targetMarks: config.targetMarks,
      unsolvedOnly: config.unsolvedOnly,
      avoidSources
    });
    if (!picked.length) {
      showBuildMessage("No questions match those mock filters yet. Widen the filters and try again.");
      return false;
    }
    if (!config.targetMarks && picked.length < config.count) {
      showBuildMessage(`This filter has ${picked.length} unique questions. Add more topics or lower the question count to avoid repeating questions.`);
      return false;
    }
    createPaper(
      picked.map((question) => question.id),
      {
        startNow,
        kind: "random",
        bank: config.bank,
        unit: config.unit,
        durationMinutes: config.durationMinutes,
        title: config.topics.length ? "Mixed topic mock" : "Random mock",
        buildConfig: config
      }
    );
    return true;
  }

  function startRandomExam() {
    return buildRandomPaper({ startNow: true });
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
    if (activePathway() === "pure") {
      const topic = questions.find((question) => question.topic === row.topic)?.topic_slug || row.topic;
      return `ial/wma11/index.html?topic=${encodeURIComponent(topic)}`;
    }
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

  function renderResult() {
    if (state.status === "idle" && !state.ids.length) {
      const last = readJson(HISTORY_KEY, [])[0];
      els.result.innerHTML = last
        ? `<strong>Last test: ${last.score}/${last.total} (${last.percent}%).</strong><p>Build a fresh mock, custom test, or revision book when you are ready.</p>`
        : `<strong>No active paper yet.</strong><p>Build a paper above, then start it or print it.</p>`;
      els.weakness.innerHTML = "";
      return;
    }
    const total = totalMarks();
    const score = achievedMarks();
    const percent = total ? Math.round((score / total) * 100) : 0;
    const ready = state.status === "idle";
    const label = ready
      ? state.kind === "revision-book" ? "Revision book ready" : "Paper ready"
      : state.status === "running"
        ? "Exam in progress"
        : state.status === "marking"
          ? "Self-marking mode"
          : "Result saved";
    const revisionMeta = state.revisionMeta || null;
    const copy = ready
      ? state.kind === "revision-book" && revisionMeta
        ? `${state.ids.length} questions, ${total} marks, ${revisionMeta.topicCount || 0} priority topics, mix code ${escapeHtml(revisionMeta.seed || "")}.`
        : `${state.ids.length} questions, ${total} marks, about ${estimatedMinutes(state.ids.map(questionById).filter(Boolean))} minutes.`
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

  function paperKindLabel() {
    if (state.kind === "custom") return "Custom Test";
    if (state.kind === "revision-book" || state.kind === "smart") return "Revision Book";
    return "Generated Mock";
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
      const solution = solutions[id] || null;
      const hasSolution = hasSolutionContent(solution);
      const solutionHtml = formatStructuredSolution(solution);
      const savedScore = state.scores?.[id] ?? "";
      return `<article class="exam-question" data-id="${escapeHtml(id)}">
        <div class="print-paper-brand">
          <div class="print-brand-lockup">
            <span class="print-brand-mark">EA</span>
            <div>
              <strong>${course.mode === "pure" ? "Elite IAL Mathematics" : "Elite IGCSE Academy"}</strong>
              <small>${paperKindLabel()} - Dr Eslam Ahmed</small>
            </div>
          </div>
          <span class="print-brand-contact">Cairo University Faculty of Engineering<br>WhatsApp 01120009622 | eliteigcse.com</span>
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
        ${canMark && hasSolution ? `<details class="exam-solution"><summary>Show worked solution</summary>${solutionHtml}</details>` : ""}
        <section class="exam-print-solution" aria-label="Printable worked solution">
          <h3>Worked Solution</h3>
          ${solutionHtml}
        </section>
        <div class="print-paper-footer">Downloaded from eliteigcse.com | Dr Eslam Ahmed | 01120009622</div>
      </article>`;
    }).join("");
    if (window.MathJax?.typesetPromise && canMark) {
      window.MathJax.typesetPromise([els.paper]).catch(() => {});
    }
  }

  function renderButtons() {
    const canPrint = canPrintCurrentMode();
    els.finish.disabled = state.status !== "running";
    els.save.disabled = state.status !== "marking" && state.status !== "complete";
    els.print.disabled = !canPrint;
    if (els.printSolution) els.printSolution.disabled = !canPrint;
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
    renderButtons();
  }

  function buildOrStartRandom() {
    const config = randomBuildConfig();
    if (state.ids.length && state.status === "idle" && currentPaperMatches("random", config)) {
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
        <div class="builder-result-copy">
          <strong>${escapeHtml(question.topic)}</strong>
          <span>${escapeHtml(question.paper)} Q${question.question} | ${escapeHtml(displayUnit(question) || "")}</span>
        </div>
        <div class="builder-result-actions">
          <em>${question.marks} marks</em>
          <button type="button" data-builder-toggle="${escapeHtml(question.id)}">${inDraft ? "Remove" : "Add"}</button>
        </div>
      </article>`;
    }).join("") || `<div class="empty-roadmap">No questions match these filters.</div>`;
  }

  function draftQuestions() {
    return draftIds.map(questionById).filter(Boolean);
  }

  function draftBuildConfig() {
    return {
      mode: "custom",
      course: course.id,
      pathway: activePathway(),
      bank: els.customBank?.value || "all",
      unit: els.customUnit?.value || "",
      ids: [...draftIds]
    };
  }

  function renderDraft() {
    const items = draftQuestions();
    const marks = totalMarksForQuestions(items);
    const minutes = items.length ? estimatedMinutes(items) : 0;
    els.draftSummary.innerHTML = `<span>${items.length} question${items.length === 1 ? "" : "s"}</span><span>${marks} marks</span><span>${minutes} min</span>`;
    if (els.printDraft) els.printDraft.disabled = !items.length;
    if (els.printDraftSolution) els.printDraftSolution.disabled = !items.length;
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

  function createDraftPaperFromCurrentDraft() {
    const items = draftQuestions();
    if (!items.length) return false;
    const config = draftBuildConfig();
    createPaper([...draftIds], {
      kind: "custom",
      bank: config.bank,
      unit: config.unit,
      durationMinutes: estimatedMinutes(items),
      title: "Custom test",
      buildConfig: config
    });
    return true;
  }

  function useDraftAsPaper() {
    createDraftPaperFromCurrentDraft();
  }

  async function printDraftAsPaper() {
    if (!createDraftPaperFromCurrentDraft()) return;
    await window.ElitePrint.printWhenReady(els.paper, els.printDraft);
  }

  async function printCurrentSolutions(trigger = els.printSolution) {
    if (!ensurePaperForCurrentMode()) return;
    if (!state.ids.length) return;
    if (window.MathJax?.typesetPromise) {
      await window.MathJax.typesetPromise([els.paper]).catch(() => {});
    }
    document.body.classList.add("print-solutions");
    try {
      await window.ElitePrint.printWhenReady(els.paper, trigger);
    } finally {
      document.body.classList.remove("print-solutions");
    }
  }

  async function printDraftSolutionsAsPaper() {
    if (!createDraftPaperFromCurrentDraft()) return;
    await printCurrentSolutions(els.printDraftSolution);
  }

  function weakTopicPool(bank, unit, topics = []) {
    const pool = uniqueBySource(eligiblePool({ bank, unit, topics }));
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

  function mistakePool(bank, unit, topics = []) {
    const review = readJson(REVIEW_KEY, {});
    const dueIds = Object.values(review)
      .filter((item) => Number(item.dueAt || 0) <= Date.now())
      .map((item) => item.id);
    const dueSources = sourceSet(dueIds);
    return uniqueBySource(eligiblePool({ bank, unit, topics })).filter((question) => dueSources.has(sourceKey(question)));
  }

  function unsolvedPool(bank, unit, topics = []) {
    return uniqueBySource(eligiblePool({ bank, unit, topics, unsolvedOnly: true }));
  }

  function smartProgressContext(bank, unit, topics = []) {
    const solved = solvedSet();
    return {
      solvedIds: solved.ids,
      solvedSources: solved.sources,
      dueSources: new Set(mistakePool(bank, unit, topics).map(sourceKey)),
      weakTopics: new Set(weakTopicPool(bank, unit, topics).map((question) => question.topic))
    };
  }

  function revisionEngine() {
    return window.EliteRevisionEngine || null;
  }

  function buildRevisionBook(bank, unit, count, seed = "") {
    const engine = revisionEngine();
    const config = smartBuildConfig();
    const topics = config.topics;
    const pool = uniqueBySource(eligiblePool({ bank, unit, topics }));
    if (!engine || !pool.length) {
      return { questions: [], analysis: { topics: [], selectedTopics: [], count: pool.length }, availableCount: pool.length };
    }
    return engine.buildRevisionBook(pool, {
      count,
      minimumCount: count,
      profile: config.profile,
      pathway: config.pathway,
      course: course.id,
      seed,
      includeMistakes: config.includeMistakes,
      includeWeakTopics: config.includeWeakTopics,
      includeUnsolved: config.includeUnsolved,
      progress: smartProgressContext(bank, unit, topics)
    });
  }

  function renderSmartAnalysis(book = null) {
    if (!els.smartAnalysisSummary || !els.smartTopicPlan) return;
    const bank = els.smartBank?.value || "all";
    const unit = els.smartUnit?.value || "";
    const count = Number(els.smartCount?.value || 50);
    const topics = selectedTopicMix(els.smartTopicMix);
    const engine = revisionEngine();
    const pool = uniqueBySource(eligiblePool({ bank, unit, topics }));
    const analysis = book?.analysis || (engine
      ? engine.analyseTopics(pool, {
          profile: els.smartProfile?.value || "prediction",
          pathway: activePathway(),
          course: course.id,
          progress: smartProgressContext(bank, unit, topics)
        })
      : { topics: [], latestYear: 0, count: pool.length, totalMarks: 0 });
    const selected = book?.questions || [];
    const totalMarks = selected.length ? totalMarksForQuestions(selected) : analysis.totalMarks || 0;
    const topicRows = analysis.topics || [];
    const selectedTopicCount = analysis.selectedTopics?.length || 0;
    const latestLabel = analysis.latestYear ? String(analysis.latestYear) : "Current";
    const countLabel = selected.length ? selected.length : Math.min(Math.max(MIN_REVISION_COUNT, count), pool.length || count);
    els.smartAnalysisSummary.innerHTML = `
      <article><strong>${pool.length}</strong><span>eligible questions</span></article>
      <article><strong>${countLabel}</strong><span>booklet target</span></article>
      <article><strong>${selected.length ? selectedTopicCount : topicRows.length}</strong><span>${selected.length ? "topics selected" : "topics analysed"}</span></article>
      <article><strong>${latestLabel}</strong><span>latest paper year</span></article>
      <article><strong>${totalMarks}</strong><span>${selected.length ? "selected marks" : "available marks"}</span></article>
    `;
    els.smartTopicPlan.innerHTML = topicRows.slice(0, 10).map((row) => {
      const selectedRow = (analysis.selectedTopics || []).find((item) => item.topic === row.topic);
      const selectedCopy = selectedRow ? `${selectedRow.count} chosen` : `${row.count} past`;
      const gapCopy = row.gapYears ? `${row.gapYears}y gap` : "recent";
      return `<article>
        <div><strong>${escapeHtml(row.topic)}</strong><span>${selectedCopy} | ${gapCopy}</span></div>
        <em>${row.probability}%</em>
      </article>`;
    }).join("") || `<div class="empty-roadmap">Choose a bank to see the revision topic plan.</div>`;
  }

  function smartBuildConfig() {
    return {
      mode: "revision-book",
      course: course.id,
      pathway: activePathway(),
      bank: els.smartBank?.value || "all",
      unit: els.smartUnit?.value || "",
      profile: els.smartProfile?.value || "prediction",
      count: Math.max(MIN_REVISION_COUNT, Number(els.smartCount?.value || 50)),
      durationMinutes: Number(els.smartDuration?.value || 0),
      topics: selectedTopicMix(els.smartTopicMix),
      includeMistakes: Boolean(els.smartMistakes?.checked),
      includeWeakTopics: Boolean(els.smartWeakTopics?.checked),
      includeUnsolved: Boolean(els.smartUnsolved?.checked)
    };
  }

  function buildSmartRevision() {
    const config = smartBuildConfig();
    const bank = config.bank;
    const unit = config.unit;
    const count = config.count;
    const topics = config.topics;
    const seed = `${course.id}:${activePathway()}:${bank}:${unit}:${topics.join("|")}:${Date.now()}:${Math.random().toString(16).slice(2)}`;
    const book = buildRevisionBook(bank, unit, count, seed);
    const target = book.questions || [];
    lastRevisionBook = book;
    renderSmartAnalysis(book);
    if (!target.length) {
      showBuildMessage("There are no matching questions for this revision book setup yet.");
      return false;
    }
    if (target.length < count) {
      showBuildMessage(`This filter has ${target.length} unique questions. Add more topics or widen the bank to build a ${count}-question revision book without repeating questions.`);
      return false;
    }
    const durationChoice = config.durationMinutes;
    createPaper(target.map((question) => question.id), {
      kind: "revision-book",
      bank,
      unit,
      durationMinutes: durationChoice > 0 ? durationChoice : estimatedMinutes(target),
      title: "Revision book",
      buildConfig: config,
      revisionMeta: {
        seed: String(book.seed || "").slice(-8),
        profile: config.profile,
        topicFilterCount: topics.length,
        topicCount: book.analysis?.selectedTopics?.length || 0,
        availableCount: book.availableCount || target.length
      }
    });
    return true;
  }

  function canPrintCurrentMode() {
    if (activeMode === "random" || activeMode === "smart") return true;
    if (activeMode === "custom") {
      return Boolean(draftIds.length || (state.kind === "custom" && state.ids?.length));
    }
    return Boolean(state.ids?.length);
  }

  function ensurePaperForCurrentMode() {
    if (activeMode === "random") {
      const config = randomBuildConfig();
      if (currentPaperMatches("random", config)) return true;
      return buildRandomPaper({ startNow: false });
    }
    if (activeMode === "smart") {
      const config = smartBuildConfig();
      if (currentPaperMatches("revision-book", config)) return true;
      return buildSmartRevision();
    }
    if (activeMode === "custom") {
      if (draftIds.length) {
        const config = draftBuildConfig();
        if (currentPaperMatches("custom", config)) return true;
        return createDraftPaperFromCurrentDraft();
      }
      if (state.kind === "custom" && state.ids?.length) return true;
      showBuildMessage("Add questions to the current test before printing.");
      return false;
    }
    return Boolean(state.ids?.length);
  }

  async function printCurrentPaper(trigger = els.print) {
    if (!ensurePaperForCurrentMode()) return;
    await window.ElitePrint.printWhenReady(els.paper, trigger);
  }

  function saveCurrentTest() {
    if (!state.ids.length) return;
    const fallback = state.title || paperKindLabel();
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
      revisionMeta: state.revisionMeta || null,
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

  async function loadSavedTest(id, printAfter = false, trigger) {
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
      scores: {},
      revisionMeta: test.revisionMeta || null
    };
    saveState();
    render();
    if (printAfter) await window.ElitePrint.printWhenReady(els.paper, trigger);
  }

  function deleteSavedTest(id) {
    saveSavedTests(savedTests().filter((item) => item.id !== id));
    renderSavedTests();
  }

  function applyPreset(value) {
    if (value === "quiz") {
      els.bank.value = "all";
      els.count.value = "10";
      els.targetMarks.value = "0";
      els.duration.value = "30";
    } else if (value === "topic") {
      els.bank.value = "all";
      els.count.value = "15";
      els.targetMarks.value = "0";
      els.duration.value = "45";
    } else if (value === "full") {
      els.bank.value = "all";
      els.count.value = "25";
      els.targetMarks.value = "0";
      els.duration.value = "90";
    } else if (value === "hard") {
      els.bank.value = "expertise";
      els.count.value = "20";
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
  els.print.addEventListener("click", () => printCurrentPaper(els.print));
  els.printSolution?.addEventListener("click", () => printCurrentSolutions(els.printSolution));
  els.randomPreset?.addEventListener("change", () => {
    applyPreset(els.randomPreset.value);
    refreshTopicOptions();
  });
  els.bank?.addEventListener("change", refreshTopicOptions);
  els.unit?.addEventListener("change", refreshTopicOptions);
  els.topicMix?.addEventListener("change", () => updateTopicMixSummary(els.topicMix, els.topicMixSummary));
  [els.smartBank, els.smartUnit, els.smartProfile, els.smartCount, els.smartDuration, els.smartMistakes, els.smartWeakTopics, els.smartUnsolved]
    .filter(Boolean)
    .forEach((input) => {
      const updateSmartAnalysis = () => {
        if (input === els.smartBank || input === els.smartUnit) refreshSmartTopicOptions();
        lastRevisionBook = null;
        renderSmartAnalysis();
      };
      input.addEventListener("input", updateSmartAnalysis);
      input.addEventListener("change", updateSmartAnalysis);
    });
  els.smartTopicMix?.addEventListener("change", () => {
    lastRevisionBook = null;
    updateTopicMixSummary(els.smartTopicMix, els.smartTopicMixSummary);
    renderSmartAnalysis();
  });
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
  els.printDraft?.addEventListener("click", printDraftAsPaper);
  els.printDraftSolution?.addEventListener("click", printDraftSolutionsAsPaper);
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
    if (print) loadSavedTest(print.dataset.printTest, true, print);
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

  applyCourseDom();
  populatePathwayFilters();
  applyUrlDefaults();
  refreshBuilderPaperOptions();
  renderSmartAnalysis(lastRevisionBook);
  render();
  startTicker();
  switchMode(activeMode);
})();
