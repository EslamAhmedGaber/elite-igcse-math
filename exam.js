(function () {
  const params = new URLSearchParams(window.location.search);
  const requestedPathway = params.get("pathway");
  const requestedCourse = (params.get("course") || "").toLowerCase();
  const pathname = window.location.pathname.toLowerCase();
  const IAL_COURSES = {
    wma11: {
      id: "wma11",
      code: "WMA11",
      unitName: "Pure 1",
      label: "IAL Pure 1",
      title: "IAL Pure 1 Revision Book & Test Builder",
      heroTitle: "Build a full Pure 1 test.",
      heroCopy: "Use the same builder engine for WMA11: random mocks, hand-built tests, quick revision quizzes, full prediction booklets, saved tests, marking, and printable worked solutions.",
      unitAllLabel: "All Pure 1",
      pageHref: "ial/wma11/index.html",
      topics: () => window.WMA11_TOPICS || [],
      questions: () => window.WMA11_QUESTIONS || [],
      storagePrefix: "eliteWMA11"
    },
    wma12: {
      id: "wma12",
      code: "WMA12",
      unitName: "Pure 2",
      label: "IAL Pure 2",
      title: "IAL Pure 2 Revision Book & Test Builder",
      heroTitle: "Build a full Pure 2 test.",
      heroCopy: "Use the same builder engine for WMA12: random mocks, hand-built tests, revision books, saved tests, marking, and printable worked solutions.",
      unitAllLabel: "All Pure 2",
      pageHref: "ial/wma12/index.html",
      topics: () => window.WMA12_TOPICS || [],
      questions: () => window.WMA12_QUESTIONS || [],
      storagePrefix: "eliteWMA12"
    },
    wme01: {
      id: "wme01",
      code: "WME01",
      unitName: "Mechanics 1",
      label: "IAL Mechanics 1",
      title: "IAL Mechanics 1 Revision Book & Test Builder",
      heroTitle: "Build a full Mechanics 1 test.",
      heroCopy: "Use the same builder engine for WME01: random mocks, hand-built tests, revision books, saved tests, marking, and printable worked solutions.",
      unitAllLabel: "All Mechanics 1",
      pageHref: "ial/wme01/index.html",
      topics: () => window.WME01_TOPICS || [],
      questions: () => window.WME01_QUESTIONS || [],
      storagePrefix: "eliteWME01"
    }
  };
  const requestedIalCourse = requestedCourse
    || (pathname.includes("/ial/wme01/") ? "wme01" : pathname.includes("/ial/wma12/") ? "wma12" : pathname.includes("/ial/wma11/") ? "wma11" : "");
  const ialCourse = requestedPathway === "pure" || requestedIalCourse
    ? IAL_COURSES[requestedIalCourse] || IAL_COURSES.wma11
    : null;

  const BACCALAUREATE_CONCEPT_TITLES = Object.freeze({
    "C01-K01": "Binomial & Multinomial",
    "C01-K02": "Polynomial Division",
    "C01-K03": "Rational Expressions",
    "C01-K04": "Identities & Proofs",
    "C01-K05": "Inequalities",
    "C02-K01": "Arithmetic Sequences",
    "C02-K02": "Geometric Sequences",
    "C02-K03": "Summation",
    "C02-K04": "Advanced Sequences",
    "C02-K05": "Recurrence & Induction",
    "C03-K01": "Complex Numbers",
    "C03-K02": "Quadratic Equations",
    "C03-K03": "Polynomial Theorems",
    "C03-K04": "Higher-Degree Equations",
    "C04-K01": "Coordinate Geometry",
    "C04-K02": "Triangles & Lines",
    "C04-K03": "Circles",
    "C05-K01": "Angles & Basic Trigonometry",
    "C05-K02": "Trig Identities & Evaluation",
    "C05-K03": "Trigonometric Graphs",
    "C05-K04": "Trig Equations & Inequalities",
    "C05-K05": "Advanced Theorems & Applications",
    "C06-K01": "Exponents & Roots",
    "C06-K02": "Exponential Functions & Applications",
    "C06-K03": "Logarithms & Properties",
    "C06-K04": "Applications of Logarithms",
    "C07-K01": "Limits & Derivatives",
    "C07-K02": "Differentiation & Tangents",
    "C07-K03": "Polynomial Differentiation Applications",
    "C07-K04": "Definite Integrals & Applications",
    "C07-K05": "Geometric Integration Applications",
    "C08-K01": "Random Variables",
    "C08-K02": "Expected Value & Variance"
  });

  function baccalaureateTopicParts(item = {}) {
    const chapterMatch = String(item.chapter_id || "").match(/C0*(\d+)/i);
    const conceptMatch = String(item.concept_id || item.topic_id || "").match(/K0*(\d+)/i);
    const chapterNumber = chapterMatch ? Number(chapterMatch[1]) : null;
    const explicitConcept = Number(item.concept_number);
    const conceptNumber = Number.isFinite(explicitConcept) && explicitConcept > 0
      ? explicitConcept
      : conceptMatch ? Number(conceptMatch[1]) : null;
    const title = BACCALAUREATE_CONCEPT_TITLES[item.concept_id]
      || item.concept_title
      || item.concept_id
      || item.topic_id
      || "Concept";
    return { chapterNumber, conceptNumber, title };
  }

  function baccalaureateTopicLabel(item = {}) {
    const { chapterNumber, conceptNumber, title } = baccalaureateTopicParts(item);
    const codes = [chapterNumber ? `CH${chapterNumber}` : "", conceptNumber ? `C${conceptNumber}` : ""].filter(Boolean).join(" · ");
    return codes ? `${codes} — ${title}` : title;
  }

  const baccalaureateCourse = requestedPathway === "baccalaureate" || requestedCourse === "baccalaureate" || requestedCourse === "egyptian-baccalaureate"
    ? {
        id: "egyptian-baccalaureate",
        mode: "baccalaureate",
        label: "Egyptian Baccalaureate Mathematics 2026",
        title: "Egyptian Baccalaureate Test Builder",
        heroTitle: "Build a Baccalaureate test.",
        heroCopy: "Choose a chapter or concept, build a random test, print it, and open the matching worked solutions.",
        unitLabel: "Chapter",
        unitAllLabel: "All chapters",
        units: [...new Set((window.EGYPTIAN_BACCALAUREATE_QUESTIONS || []).map((item) => item.chapter_id).filter(Boolean))],
        courseCode: "EB-MATH-2026",
        questions: (window.EGYPTIAN_BACCALAUREATE_QUESTIONS || []).map((item) => ({
          id: item.id,
          source_id: item.source_id || item.id,
          bank: "all",
          course: "egyptian-baccalaureate",
          is_expertise: item.level === "L3" || item.level === "L4" || Boolean(item.combined),
          unit: item.chapter_id,
          part: ["C01", "C02", "C03", "C04"].includes(item.chapter_id) ? "part-1" : "part-2",
          linear_unit: item.chapter_id,
          modular_unit: item.chapter_id,
          topic: item.concept_title || item.concept_id || item.topic_id,
          topic_label: baccalaureateTopicLabel(item),
          topics: [item.concept_title || item.concept_id || item.topic_id].filter(Boolean),
          topic_slug: item.concept_id || item.topic_id,
          topic_slugs: [item.concept_id || item.topic_id].filter(Boolean),
          paper: item.chapter_id,
          code: item.family_id,
          question: item.id,
          marks: item.marks || (item.format === "mcq" ? 1 : 2),
          image: item.image,
          question_text: item.stem || item.prompt || item.id,
          finalAnswer: item.final_answer,
          steps: item.solution || [],
          question_format: item.format,
          options: item.options || [],
          correct_option: item.correct_option,
          family_id: item.family_id,
          variant_id: item.variant_id,
          concept_id: item.concept_id,
          concept_number: item.concept_number,
          visual_asset: item.visual_asset || null
        })),
        topics: [...new Set((window.EGYPTIAN_BACCALAUREATE_QUESTIONS || []).map((item) => JSON.stringify({
          topic: item.concept_title || item.concept_id || item.topic_id,
          label: baccalaureateTopicLabel(item),
          unit: item.chapter_id
        })))].map((item) => JSON.parse(item)),
        solutions: Object.fromEntries((window.EGYPTIAN_BACCALAUREATE_QUESTIONS || []).map((item) => [item.id, {
          status: "checked",
          checkedBy: "Dr Eslam Ahmed",
          steps: (item.solution || []).map((body, index) => ({ title: `Step ${index + 1}`, body: normalizeMathDelimiters(body) })),
          finalAnswer: normalizeMathDelimiters(item.final_answer || ""),
          correctOption: item.correct_option
        }])),
        reviewKey: "eliteEgyptianBaccalaureateMistakeBoxV1",
        solvedKey: "eliteEgyptianBaccalaureateSolvedV1",
        selectedKey: "eliteEgyptianBaccalaureateSelectedV1"
      }
    : null;

  function normalizeMathDelimiters(value) {
    return String(value || "")
      .replace(/\$\$([\s\S]+?)\$\$/g, "\\[$1\\]")
      .replace(/\$([^$\n]+?)\$/g, "\\($1\\)");
  }

  function ialTopicName(def, slug, fallback = "") {
    return (def.topics() || []).find((topic) => topic.slug === slug)?.name || fallback || slug;
  }

  function normalizeIalQuestion(def, item) {
    const primarySlug = item.primaryTopic || item.topic;
    const primaryName = item.primaryTopicName || item.topicName || ialTopicName(def, primarySlug);
    const topicNames = item.topicNames?.length
      ? item.topicNames
      : (item.topics || [primarySlug]).map((slug) => ialTopicName(def, slug, primaryName));
    return {
      id: item.id,
      source_id: item.id,
      bank: "all",
      course: def.id,
      is_expertise: Number(item.qNo || 0) >= 6,
      unit: def.code,
      linear_unit: def.code,
      modular_unit: def.code,
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

  function ialSolution(def, item) {
    return {
      status: "checked",
      checkedBy: "Dr Eslam Ahmed",
      updated: item.updated || "",
      topicNote: item.topicName || ialTopicName(def, item.topic),
      steps: (item.steps || []).map((step) => ({
        title: step.title || "Step",
        body: normalizeMathDelimiters(step.body || "")
      })),
      finalAnswer: normalizeMathDelimiters(item.finalAnswer || "")
    };
  }

  const course = ialCourse
    ? {
        id: ialCourse.id,
        mode: "pure",
        title: ialCourse.title,
        heroTitle: ialCourse.heroTitle,
        heroCopy: ialCourse.heroCopy,
        unitLabel: "Course",
        unitAllLabel: ialCourse.unitAllLabel,
        units: [ialCourse.code],
        courseCode: ialCourse.code,
        coursePageHref: ialCourse.pageHref,
        topics: ialCourse.topics().map((topic) => ({ topic: topic.name, unit: ialCourse.code })),
        questions: ialCourse.questions().map((item) => normalizeIalQuestion(ialCourse, item)),
        solutions: Object.fromEntries(ialCourse.questions().map((item) => [item.id, ialSolution(ialCourse, item)])),
        reviewKey: `${ialCourse.storagePrefix}MistakeBoxV1`,
        solvedKey: `${ialCourse.storagePrefix}SolvedV1`,
        selectedKey: `${ialCourse.storagePrefix}SelectedV1`
      }
    : baccalaureateCourse
    ? baccalaureateCourse
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
  let solutions = course.solutions;
  let fullSolutionsPromise = null;
  const ialPrintPalettes = { wma11: "pure", wma12: "mulberry", wme01: "teal" };
  const activePrintPalette = course.mode === "baccalaureate"
    ? "baccalaureate"
    : course.mode === "pure"
    ? ialPrintPalettes[course.id] || "pure"
    : requestedPathway === "modular" || window.ELITE_PATHWAY?.mode === "modular"
      ? "modular"
      : "linear";
  if (document.body) {
    document.body.dataset.pathway = course.mode === "pure" ? "pure" : activePrintPalette;
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
  const RANDOM_BUILD_VERSION = "random-topic-split-v2";
  const REVISION_BUILD_VERSION = "revision-book-v2";
  const CUSTOM_BUILD_VERSION = "custom-test-v2";

  function hasFullSolutionBundle(bundle = solutions) {
    return Object.values(bundle || {}).some((solution) => Boolean(
      solution?.source || (Array.isArray(solution?.steps) && solution.steps.length)
    ));
  }

  function setRuntimeBusy(control, busy) {
    if (!control) return;
    control.setAttribute("aria-busy", String(busy));
    control.classList.toggle("is-loading", busy);
    control.disabled = busy;
    if (!busy) renderButtons();
  }

  async function ensureExamSolutions(control) {
    if (course.mode === "pure" || hasFullSolutionBundle()) return solutions;
    if (fullSolutionsPromise) return fullSolutionsPromise;
    if (!window.EliteRuntime?.loadScript) throw new Error("Solution loader is unavailable");

    setRuntimeBusy(control, true);
    fullSolutionsPromise = window.EliteRuntime.loadScript("solutions-data.js?v=20260528a", {
      id: "eliteExamSolutions",
      test: () => hasFullSolutionBundle(window.SOLUTION_DATA)
    }).then(() => {
      if (!hasFullSolutionBundle(window.SOLUTION_DATA)) {
        throw new Error("The worked-solution bundle is incomplete");
      }
      solutions = window.SOLUTION_DATA;
      course.solutions = solutions;
      return solutions;
    }).catch((error) => {
      fullSolutionsPromise = null;
      throw error;
    }).finally(() => setRuntimeBusy(control, false));
    return fullSolutionsPromise;
  }

  const els = {
    modeTabs: [...document.querySelectorAll("[data-exam-mode]")],
    modePanels: [...document.querySelectorAll("[data-mode-panel]")],
    bank: document.getElementById("examBank"),
    part: document.getElementById("examPart"),
    partLabel: document.getElementById("examPartLabel"),
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
    customPart: document.getElementById("builderPart"),
    customPartLabel: document.getElementById("builderPartLabel"),
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
    smartPart: document.getElementById("smartPart"),
    smartPartLabel: document.getElementById("smartPartLabel"),
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
    if (course.mode === "baccalaureate") return "baccalaureate";
    if (course.mode === "pure") return "pure";
    return window.ELITE_PATHWAY?.mode === "modular" ? "modular" : "linear";
  }

  function displayUnit(question) {
    if (activePathway() === "pure" || activePathway() === "baccalaureate") return question.unit || course.courseCode || "";
    return activePathway() === "modular" ? question.modular_unit : question.linear_unit;
  }

  function unitsForPathway() {
    if (activePathway() === "pure" || activePathway() === "baccalaureate") return course.units || [course.courseCode || ""];
    const catalog = activePathway() === "modular" ? window.MODULAR_TOPIC_CATALOG || [] : window.LINEAR_TOPIC_CATALOG || [];
    return [...new Set(catalog.map((entry) => entry.unit))];
  }

  function topicsForUnit(unit, part = "") {
    if (activePathway() === "pure" || activePathway() === "baccalaureate") {
      if (activePathway() === "baccalaureate" && part) {
        const allowed = new Set(questions.filter((question) => questionMatchesPart(question, part)).map((question) => question.topic));
        return (course.topics || []).filter((entry) => (!unit || entry.unit === unit) && allowed.has(entry.topic)).map((entry) => entry.topic);
      }
      return (course.topics || []).filter((entry) => !unit || entry.unit === unit).map((entry) => entry.topic);
    }
    const catalog = activePathway() === "modular" ? window.MODULAR_TOPIC_CATALOG || [] : window.LINEAR_TOPIC_CATALOG || [];
    return catalog.filter((entry) => !unit || entry.unit === unit).map((entry) => entry.topic);
  }

  function topicDisplayLabel(topic, unit = "") {
    if (course.mode !== "baccalaureate") return topic;
    return (course.topics || []).find((entry) => entry.topic === topic && (!unit || entry.unit === unit))?.label || topic;
  }

  function questionTopicLabel(question) {
    return question?.topic_label || topicDisplayLabel(question?.topic || "", question?.unit || "");
  }

  function fillSelect(select, values, firstLabel, preserve = "", labelForValue = (value) => value) {
    if (!select) return;
    const current = preserve || select.value;
    select.innerHTML = `<option value="">${escapeHtml(firstLabel)}</option>${values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(labelForValue(value))}</option>`).join("")}`;
    if (values.includes(current)) select.value = current;
  }

  function selectedTopicMix(container) {
    if (!container) return [];
    return [...container.querySelectorAll("input[type='checkbox']:checked")].map((input) => input.value);
  }

  function combinedTopicSelection(singleTopic, container) {
    return normaliseTopicList([singleTopic || "", ...selectedTopicMix(container)]);
  }

  function randomTopicSelection() {
    return combinedTopicSelection(els.topic?.value || "", els.topicMix);
  }

  function setTopicMix(container, topics = []) {
    if (!container) return;
    const wanted = new Set(topics.filter(Boolean));
    container.querySelectorAll("input[type='checkbox']").forEach((input) => {
      input.checked = wanted.has(input.value);
    });
  }

  function setTopicMixByMode(container, mode = "clear") {
    if (!container) return;
    container.querySelectorAll("input[type='checkbox']").forEach((input) => {
      const row = input.closest("label");
      const available = Number(row?.querySelector("em")?.textContent || 0) > 0;
      input.checked = mode === "all" || (mode === "available" && available);
    });
    container.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function topicPoolCount(topic, bank, unit, part = "") {
    return questions
      .filter((question) => questionMatchesBank(question, bank))
      .filter((question) => questionMatchesPart(question, part))
      .filter((question) => questionMatchesUnit(question, unit))
      .filter((question) => questionMatchesTopic(question, topic)).length;
  }

  function renderTopicMix(container, summary, unit = "", bank = "all", part = "") {
    if (!container) return;
    const previous = new Set(selectedTopicMix(container));
    const topics = topicsForUnit(unit, part);
    container.innerHTML = topics.map((topic) => {
      const count = topicPoolCount(topic, bank, unit, part);
      const checked = previous.has(topic) ? " checked" : "";
      return `<label><input type="checkbox" value="${escapeHtml(topic)}"${checked}> <span>${escapeHtml(topicDisplayLabel(topic, unit))}</span><em>${count}</em></label>`;
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
    const part = params.get("part");
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
    setSelectIfPresent(els.part, part);
    setSelectIfPresent(els.customBank, bank);
    setSelectIfPresent(els.customPart, part);
    setSelectIfPresent(els.smartBank, bank);
    setSelectIfPresent(els.smartPart, part);
    setSelectIfPresent(els.smartProfile, profile);
    if (mode && els.modeTabs.some((button) => button.dataset.examMode === mode)) {
      activeMode = mode;
    }
    refreshTopicOptions();
    refreshBuilderTopicOptions();
    refreshSmartTopicOptions();
    const singleTopic = urlTopics.length === 1 ? urlTopics[0] : "";
    setSelectIfPresent(els.topic, singleTopic);
    setSelectIfPresent(els.customTopic, singleTopic);
    setTopicMix(els.topicMix, urlTopics);
    setTopicMix(els.smartTopicMix, urlTopics);
    updateTopicMixSummary(els.topicMix, els.topicMixSummary);
    updateTopicMixSummary(els.smartTopicMix, els.smartTopicMixSummary);
    resetStaleStateForUrl({ unit, part, topics: urlTopics, mode });
  }

  function resetStaleStateForUrl({ unit = "", part = "", topics = [], mode = "" } = {}) {
    if (!state.ids?.length) return;
    const kindForMode = { random: "random", custom: "custom", smart: "revision-book" };
    const expectedKind = kindForMode[activeMode];
    const explicitKindMismatch = Boolean(mode && expectedKind && state.kind !== expectedKind);
    const selectedTopics = Array.isArray(topics) ? topics.filter(Boolean) : [];
    const selectionMismatch = state.ids.some((id) => {
      const question = questionById(id);
      if (!question) return true;
      if (part && !questionMatchesPart(question, part)) return true;
      if (unit && !questionMatchesUnit(question, unit)) return true;
      return selectedTopics.length > 0 && !questionMatchesAnyTopic(question, selectedTopics);
    });
    if (!explicitKindMismatch && !selectionMismatch) return;
    state = { status: "idle", ids: [], scores: {}, kind: activeMode === "smart" ? "revision-book" : activeMode };
    draftIds = [];
    saveState();
    saveDraft();
  }

  function setOptionText(select, value, text) {
    const option = select ? [...select.options].find((item) => item.value === value) : null;
    if (option) option.textContent = text;
  }

  function applyCourseDom() {
    if (course.mode !== "pure" && course.mode !== "baccalaureate") return;
    document.body?.classList.remove("pathway-linear", "pathway-modular", "pathway-pure");
    document.body?.classList.add(course.mode === "baccalaureate" ? "pathway-baccalaureate" : "pathway-pure", "exam-course-pure");
    if (course.mode === "baccalaureate") {
      [els.partLabel, els.customPartLabel, els.smartPartLabel].forEach((node) => { if (node) node.hidden = false; });
    }
    document.title = `${course.title} - Elite IGCSE Mathematics`;
    const title = document.getElementById("examTitle");
    if (title) title.textContent = course.heroTitle;
    const heroCopy = document.querySelector(".exam-hero p");
    if (heroCopy) heroCopy.textContent = course.heroCopy;
    document.querySelectorAll("[data-pathway-label='unit']").forEach((node) => {
      node.textContent = course.unitLabel;
    });
    [els.bank, els.customBank, els.smartBank].forEach((select) => {
      setOptionText(select, "all", course.mode === "baccalaureate" ? "Full Baccalaureate bank" : `Full ${course.courseCode || "IAL"} bank`);
      setOptionText(select, "expertise", course.mode === "baccalaureate" ? "Challenge questions" : "Q6+ expertise only");
    });
    const difficulty = [...(els.customDifficulty?.options || [])].find((option) => option.value === "q20");
    if (difficulty) difficulty.textContent = course.mode === "baccalaureate" ? "Challenge questions" : "Q6+ expertise";
    const preset = [...(els.randomPreset?.options || [])].find((option) => option.value === "hard");
    if (preset) preset.textContent = course.mode === "baccalaureate" ? "Challenge questions" : "Q6+ challenge";
  }

  function refreshTopicOptions() {
    fillSelect(els.topic, topicsForUnit(els.unit?.value || "", els.part?.value || ""), "All topics", "", (topic) => topicDisplayLabel(topic, els.unit?.value || ""));
    renderTopicMix(els.topicMix, els.topicMixSummary, els.unit?.value || "", els.bank?.value || "all", els.part?.value || "");
  }

  function refreshBuilderTopicOptions() {
    fillSelect(els.customTopic, topicsForUnit(els.customUnit?.value || "", els.customPart?.value || ""), "All topics", "", (topic) => topicDisplayLabel(topic, els.customUnit?.value || ""));
  }

  function refreshSmartTopicOptions() {
    renderTopicMix(els.smartTopicMix, els.smartTopicMixSummary, els.smartUnit?.value || "", els.smartBank?.value || "all", els.smartPart?.value || "");
  }

  function uniqueSorted(values) {
    return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  function refreshBuilderPaperOptions() {
    const bank = els.customBank?.value || "all";
    const part = els.customPart?.value || "";
    const unit = els.customUnit?.value || "";
    const topic = els.customTopic?.value || "";
    const papers = questions
      .filter((question) => questionMatchesBank(question, bank))
      .filter((question) => questionMatchesPart(question, part))
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
    if (difficulty === "q20") return activePathway() === "pure" ? Number(question.question || 0) >= 6 : activePathway() === "baccalaureate" ? Boolean(question.is_expertise) : Number(question.question || 0) >= 20;
    return true;
  }

  function questionMatchesBank(question, bank = "all") {
    if (activePathway() === "pure" || activePathway() === "baccalaureate") {
      if (bank === "expertise") return Boolean(question.is_expertise);
      return true;
    }
    return question.bank === bank;
  }

  function questionMatchesUnit(question, unit = "") {
    return !unit || displayUnit(question) === unit;
  }

  function questionMatchesPart(question, part = "") {
    return !part || question.part === part;
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
    part = "",
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
      .filter((question) => questionMatchesPart(question, part))
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
      buildVersion: RANDOM_BUILD_VERSION,
      course: course.id,
      pathway: activePathway(),
      bank: els.bank?.value || "all",
      part: els.part?.value || "",
      unit: els.unit?.value || "",
      topics: randomTopicSelection(),
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
      part: config.part,
      unit: config.unit,
      topic: "",
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

  async function finishExam() {
    if (state.status !== "running") return;
    state.status = "marking";
    state.finishedAt = Date.now();
    saveState();
    render();
    try {
      await ensureExamSolutions(els.finish);
      renderPaper();
    } catch (error) {
      console.error("[exam-solutions]", error);
      els.result.innerHTML = `<strong>Marking mode is ready.</strong><p>The worked solutions need a connection. Try Print with solutions again when the connection returns.</p>`;
    }
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
      const row = map.get(question.topic) || { topic: question.topic, label: questionTopicLabel(question), unit: displayUnit(question), score: 0, total: 0, lost: 0 };
      row.score += score;
      row.total += Number(question.marks || 0);
      row.lost += Math.max(0, Number(question.marks || 0) - score);
      map.set(question.topic, row);
    });
    return [...map.values()].sort((a, b) => b.lost - a.lost || b.total - a.total);
  }

  function topicLink(row) {
    if (activePathway() === "baccalaureate") {
      const params = new URLSearchParams({ pathway: "baccalaureate", bank: state.bank || "all", unit: row.unit || "", topic: row.topic || "", mode: "custom" });
      return `exam.html?${params.toString()}`;
    }
    if (activePathway() === "pure") {
      const topic = questions.find((question) => question.topic === row.topic)?.topic_slug || row.topic;
      return `${course.coursePageHref || "ial/wma11/index.html"}?topic=${encodeURIComponent(topic)}`;
    }
    const params = new URLSearchParams({ bank: state.bank || "all", unit: row.unit, topic: row.topic, mode: "weak" });
    return `practice.html?${params.toString()}`;
  }

  function formatInlineMarkdown(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");
  }

  function normalizeSolutionNotation(text) {
    return String(text || "").replace(/\\pounds?\b/g, "£");
  }

  function formatSolutionText(text) {
    if (window.EliteSolutionView?.formatText) return window.EliteSolutionView.formatText(text);
    const escaped = escapeHtml(normalizeSolutionNotation(text)).trim();
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
    if (window.EliteSolutionView?.hasContent) return window.EliteSolutionView.hasContent(solution);
    if (!solution) return false;
    if (solution.source) return true;
    if (Array.isArray(solution.steps) && solution.steps.some((step) => step?.body || step?.title)) return true;
    return Boolean(solution.finalAnswer);
  }

  function formatPrintableSolution(solution) {
    if (!solution || !hasSolutionContent(solution)) {
      return `<p class="solution-empty">Solution has not been written yet.</p>`;
    }
    const steps = Array.isArray(solution.steps)
      ? solution.steps.filter((step) => step && (step.body || step.title))
      : solution.source ? [{ title: "Working", body: solution.source }] : [];
    const stepsHtml = steps.map((step, index) => `
      <section class="print-worked-step">
        <span class="print-worked-index" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>
        <div class="print-worked-step-content">
          <h4>${escapeHtml(step.title || `Step ${index + 1}`)}</h4>
          <div class="print-worked-copy">${formatSolutionText(step.body || "")}</div>
        </div>
      </section>
    `).join("");
    const finalHtml = solution.finalAnswer ? `
      <section class="print-worked-final" aria-label="Final answer">
        <strong>Final answer</strong>
        <div>${formatSolutionText(solution.finalAnswer)}</div>
      </section>
    ` : "";
    return `<article class="print-worked-solution" aria-label="Worked solution">
      <div class="print-worked-steps">${stepsHtml}</div>
      ${finalHtml}
    </article>`;
  }

  function formatStructuredSolution(solution, options = {}) {
    if (options.variant === "print") return formatPrintableSolution(solution);
    if (window.EliteSolutionView?.render) return window.EliteSolutionView.render(solution, options);
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
      <strong>${escapeHtml(row.label || row.topic)}</strong>
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
    if (canMark && course.id === "igcse" && !hasFullSolutionBundle() && !fullSolutionsPromise) {
      ensureExamSolutions().then(renderPaper).catch((error) => console.warn("[exam-solutions]", error));
    }
    els.paper.innerHTML = state.ids.map((id, index) => {
      const question = questionById(id);
      if (!question) return "";
      const solution = solutions[id] || null;
      const hasSolution = hasSolutionContent(solution);
      const solutionOptions = { key: id, topic: questionTopicLabel(question), marks: question.marks };
      const solutionHtml = formatStructuredSolution(solution, solutionOptions);
      const printSolutionHtml = formatStructuredSolution(solution, { ...solutionOptions, variant: "print" });
      const printStepCount = Array.isArray(solution?.steps)
        ? solution.steps.filter((step) => step && (step.title || step.body)).length
        : solution?.source ? 1 : 0;
      const printDensityClass = printStepCount >= 6 ? " is-dense" : "";
      const savedScore = state.scores?.[id] ?? "";
      return `<article class="exam-question" data-id="${escapeHtml(id)}">
        <div class="print-paper-brand">
          <div class="print-brand-lockup">
            <span class="print-brand-mark">E</span>
            <div>
              <strong>eliteigcse.com</strong>
              <small>${course.label} | ${paperKindLabel()}</small>
            </div>
          </div>
          <span class="print-brand-contact">Dr Eslam Ahmed | Mathematics Department<br>Faculty of Engineering, Cairo University</span>
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
          <span>${escapeHtml(questionTopicLabel(question))}</span>
          ${canMark ? `<label>Score <input data-score-id="${escapeHtml(id)}" type="number" min="0" max="${question.marks}" value="${savedScore}"> / ${question.marks}</label>` : `<span>${state.status === "running" ? "Answers stay private during the exam" : "Ready to start or print"}</span>`}
        </footer>
        ${canMark && hasSolution ? `<details class="exam-solution"><summary>Show worked solution</summary>${solutionHtml}</details>` : ""}
        <div class="print-paper-footer">Question ${index + 1} | eliteigcse.com | Dr Eslam Ahmed | +20 112 000 9622</div>
      </article>
        <section class="exam-print-solution${printDensityClass}" data-solution-for="${escapeHtml(id)}" data-print-step-count="${printStepCount}" aria-label="Printable worked solution for question ${index + 1}">
          <div class="print-solution-heading">
            <div>
              <span>Solution ${index + 1}</span>
              <strong>${escapeHtml(question.paper)} Q${question.question}</strong>
            </div>
            <em>${question.marks} marks</em>
          </div>
          <h3>Worked Solution</h3>
          ${printSolutionHtml}
          <div class="print-paper-footer print-solution-footer">Solution ${index + 1} | eliteigcse.com | Dr Eslam Ahmed | +20 112 000 9622</div>
        </section>
      `;
    }).join("");
    if (canMark) {
      typesetPaperMath();
    }
  }

  function renderButtons() {
    const canPrint = canPrintCurrentMode();
    const primary = primaryActionState();
    els.finish.disabled = state.status !== "running";
    els.save.disabled = state.status !== "marking" && state.status !== "complete";
    els.print.disabled = !canPrint;
    if (els.printSolution) els.printSolution.disabled = !canPrint;
    els.saveTest.disabled = !state.ids.length;
    els.start.disabled = primary.disabled || state.status === "running";
    els.start.textContent = primary.label;
  }

  function switchMode(mode) {
    activeMode = mode;
    els.modeTabs.forEach((button) => {
      const selected = button.dataset.examMode === mode;
      const panelId = `examModePanel-${button.dataset.examMode}`;
      if (!button.id) button.id = `examModeTab-${button.dataset.examMode}`;
      button.classList.toggle("active", selected);
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", String(selected));
      button.setAttribute("aria-controls", panelId);
      button.tabIndex = selected ? 0 : -1;
    });
    els.modePanels.forEach((panel) => {
      const selected = panel.dataset.modePanel === mode;
      panel.id = `examModePanel-${panel.dataset.modePanel}`;
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", `examModeTab-${panel.dataset.modePanel}`);
      panel.hidden = !selected;
    });
    renderButtons();
  }

  function buildOrStartRandom() {
    const config = randomBuildConfig();
    if (state.ids.length && state.status === "idle" && currentPaperMatches("random", config)) {
      startCurrentPaper();
      return;
    }
    startRandomExam();
  }

  function startCurrentPaper() {
    if (!state.ids?.length || state.status !== "idle") return false;
    state.status = "running";
    state.startedAt = Date.now();
    state.finishedAt = null;
    saveState();
    render();
    return true;
  }

  function renderBuilderResults() {
    filteredBuilderQuestions = uniqueBySource(eligiblePool(builderFilterConfig()));
    const shown = filteredBuilderQuestions.slice(0, MAX_FILTER_RESULTS);
    els.customSummary.textContent = `${filteredBuilderQuestions.length} matching question${filteredBuilderQuestions.length === 1 ? "" : "s"}${filteredBuilderQuestions.length > MAX_FILTER_RESULTS ? `, showing first ${MAX_FILTER_RESULTS}` : ""}`;
    els.customResults.innerHTML = shown.map((question) => {
      const exactDraft = draftIds.includes(question.id);
      const sourceInDraft = draftSourceSet().has(sourceKey(question));
      const inDraft = exactDraft || sourceInDraft;
      return `<article class="builder-result ${inDraft ? "selected" : ""}">
        <div class="builder-result-copy">
          <strong>${escapeHtml(questionTopicLabel(question))}</strong>
          <span>${escapeHtml(question.paper)} Q${question.question} | ${escapeHtml(displayUnit(question) || "")}</span>
        </div>
        <div class="builder-result-actions">
          <em>${question.marks} marks</em>
          <button type="button" data-builder-toggle="${escapeHtml(question.id)}" ${!exactDraft && sourceInDraft ? "disabled" : ""}>${exactDraft ? "Remove" : sourceInDraft ? "Added" : "Add"}</button>
        </div>
      </article>`;
    }).join("") || `<div class="empty-roadmap">No questions match these filters.</div>`;
  }

  function builderFilterConfig(overrides = {}) {
    return {
      bank: els.customBank.value,
      part: els.customPart?.value || "",
      unit: els.customUnit.value,
      topic: els.customTopic.value,
      paper: els.customPaper.value,
      difficulty: els.customDifficulty.value,
      status: els.customStatus.value,
      minMarks: els.customMinMarks.value,
      maxMarks: els.customMaxMarks.value,
      search: els.customSearch.value,
      ...overrides
    };
  }

  function draftQuestions() {
    return draftIds.map(questionById).filter(Boolean);
  }

  function draftBuildConfig() {
    return {
      mode: "custom",
      buildVersion: CUSTOM_BUILD_VERSION,
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
        <strong>${index + 1}. ${escapeHtml(questionTopicLabel(question))}</strong>
        <span>${escapeHtml(question.paper)} Q${question.question} | ${question.marks} marks</span>
      </div>
      <div class="draft-actions">
        <button type="button" data-draft-move="up" data-id="${escapeHtml(question.id)}" ${index === 0 ? "disabled" : ""}>Up</button>
        <button type="button" data-draft-move="down" data-id="${escapeHtml(question.id)}" ${index === items.length - 1 ? "disabled" : ""}>Down</button>
        <button type="button" data-draft-remove="${escapeHtml(question.id)}">Remove</button>
      </div>
    </article>`).join("") || `<div class="empty-roadmap">Your selected questions will appear here.</div>`;
    renderButtons();
  }

  function draftSourceSet(excludeId = "") {
    return new Set(
      draftIds
        .filter((id) => id !== excludeId)
        .map(questionById)
        .filter(Boolean)
        .map(sourceKey)
    );
  }

  function addQuestionToDraft(id) {
    const question = questionById(id);
    if (!question || draftIds.includes(id)) return false;
    if (draftSourceSet().has(sourceKey(question))) return false;
    draftIds.push(id);
    return true;
  }

  function toggleDraft(id) {
    if (draftIds.includes(id)) draftIds = draftIds.filter((item) => item !== id);
    else addQuestionToDraft(id);
    saveDraft();
    renderBuilderResults();
    renderDraft();
  }

  function addVisibleToDraft() {
    const ids = filteredBuilderQuestions.slice(0, MAX_FILTER_RESULTS).map((question) => question.id);
    ids.forEach(addQuestionToDraft);
    saveDraft();
    renderBuilderResults();
    renderDraft();
  }

  function addPracticeSelectedToDraft() {
    uniqueBySource(eligiblePool(builderFilterConfig({ status: "selected" }))).forEach((question) => {
      addQuestionToDraft(question.id);
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

  function createDraftPaperFromCurrentDraft({ startNow = false } = {}) {
    const items = draftQuestions();
    if (!items.length) return false;
    const config = draftBuildConfig();
    createPaper([...draftIds], {
      startNow,
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

  function waitFor(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  async function waitForMathJaxReady(timeoutMs = 7000) {
    if (window.EliteRuntime?.ensureMathJax) {
      try {
        await window.EliteRuntime.ensureMathJax();
      } catch (error) {
        console.warn("[exam-math]", error);
        return false;
      }
    }
    const started = Date.now();
    while (!window.MathJax?.typesetPromise && Date.now() - started < timeoutMs) {
      await waitFor(80);
    }
    const mathJax = window.MathJax;
    if (!mathJax?.typesetPromise) return false;
    if (mathJax.startup?.promise) {
      await Promise.race([
        mathJax.startup.promise,
        waitFor(timeoutMs)
      ]).catch(() => {});
    }
    return true;
  }

  async function typesetPaperMath() {
    if (!(await waitForMathJaxReady())) return;
    if (window.EliteSolutionView?.typeset) await window.EliteSolutionView.typeset(els.paper);
    else await window.MathJax.typesetPromise([els.paper]).catch(() => {});
  }

  async function printCurrentSolutions(trigger = els.printSolution) {
    if (!ensurePaperForCurrentMode()) return;
    if (!state.ids.length) return;
    try {
      await ensureExamSolutions(trigger);
      renderPaper();
    } catch (error) {
      console.error("[exam-solutions]", error);
      els.result.innerHTML = `<strong>Solutions could not load.</strong><p>Check the connection, then press Print with solutions again.</p>`;
      return;
    }
    document.body.classList.add("print-solutions");
    try {
      await typesetPaperMath();
      await window.ElitePrint.printWhenReady(els.paper, trigger);
    } finally {
      document.body.classList.remove("print-solutions");
    }
  }

  async function printDraftSolutionsAsPaper() {
    if (!createDraftPaperFromCurrentDraft()) return;
    await printCurrentSolutions(els.printDraftSolution);
  }

  function weakTopicPool(bank, unit, topics = [], part = "") {
    const pool = uniqueBySource(eligiblePool({ bank, unit, part, topics }));
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

  function mistakePool(bank, unit, topics = [], part = "") {
    const review = readJson(REVIEW_KEY, {});
    const dueIds = Object.values(review)
      .filter((item) => Number(item.dueAt || 0) <= Date.now())
      .map((item) => item.id);
    const dueSources = sourceSet(dueIds);
    return uniqueBySource(eligiblePool({ bank, unit, part, topics })).filter((question) => dueSources.has(sourceKey(question)));
  }

  function unsolvedPool(bank, unit, topics = [], part = "") {
    return uniqueBySource(eligiblePool({ bank, unit, part, topics, unsolvedOnly: true }));
  }

  function smartProgressContext(bank, unit, topics = [], part = "") {
    const solved = solvedSet();
    return {
      solvedIds: solved.ids,
      solvedSources: solved.sources,
      dueSources: new Set(mistakePool(bank, unit, topics, part).map(sourceKey)),
      weakTopics: new Set(weakTopicPool(bank, unit, topics, part).map((question) => question.topic))
    };
  }

  function revisionEngine() {
    return window.EliteRevisionEngine || null;
  }

  function buildRevisionBook(bank, unit, count, seed = "") {
    const engine = revisionEngine();
    const config = smartBuildConfig();
    const topics = config.topics;
    const pool = uniqueBySource(eligiblePool({ bank, unit, part: config.part, topics }));
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
      progress: smartProgressContext(bank, unit, topics, config.part)
    });
  }

  function renderSmartAnalysis(book = null) {
    if (!els.smartAnalysisSummary || !els.smartTopicPlan) return;
    const bank = els.smartBank?.value || "all";
    const unit = els.smartUnit?.value || "";
    const count = Number(els.smartCount?.value || 50);
    const topics = selectedTopicMix(els.smartTopicMix);
    const engine = revisionEngine();
    const part = els.smartPart?.value || "";
    const pool = uniqueBySource(eligiblePool({ bank, unit, part, topics }));
    const analysis = book?.analysis || (engine
      ? engine.analyseTopics(pool, {
          profile: els.smartProfile?.value || "prediction",
          pathway: activePathway(),
          course: course.id,
          progress: smartProgressContext(bank, unit, topics, part)
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
      buildVersion: REVISION_BUILD_VERSION,
      course: course.id,
      pathway: activePathway(),
      bank: els.smartBank?.value || "all",
      part: els.smartPart?.value || "",
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

  function buildSmartRevision({ startNow = false } = {}) {
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
      startNow,
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

  function primaryActionState() {
    if (activeMode === "random") {
      const canStartCurrent = state.status === "idle" && currentPaperMatches("random", randomBuildConfig());
      return { disabled: false, label: canStartCurrent ? "Start current paper" : "Generate and start" };
    }
    if (activeMode === "smart") {
      const canStartCurrent = state.status === "idle" && currentPaperMatches("revision-book", smartBuildConfig());
      return { disabled: state.status === "running", label: canStartCurrent ? "Start revision book" : "Build revision book" };
    }
    if (activeMode === "custom") {
      const canStartCurrent = state.status === "idle" && (
        (draftIds.length && currentPaperMatches("custom", draftBuildConfig())) ||
        (!draftIds.length && state.kind === "custom" && state.ids?.length)
      );
      if (canStartCurrent) return { disabled: false, label: "Start current test" };
      return { disabled: !draftIds.length || state.status === "running", label: draftIds.length ? "Use current test" : "Add questions first" };
    }
    if (activeMode === "saved") {
      return { disabled: true, label: "Choose saved test" };
    }
    return { disabled: true, label: "Generate and start" };
  }

  function handlePrimaryAction() {
    if (activeMode === "random") {
      buildOrStartRandom();
      return;
    }
    if (activeMode === "smart") {
      const config = smartBuildConfig();
      if (currentPaperMatches("revision-book", config) && state.status === "idle") {
        startCurrentPaper();
        return;
      }
      buildSmartRevision();
      return;
    }
    if (activeMode === "custom") {
      if (draftIds.length) {
        const config = draftBuildConfig();
        if (currentPaperMatches("custom", config) && state.status === "idle") {
          startCurrentPaper();
          return;
        }
        createDraftPaperFromCurrentDraft();
        return;
      }
      if (state.kind === "custom" && state.ids?.length && state.status === "idle") {
        startCurrentPaper();
        return;
      }
      showBuildMessage("Add questions to the current test first.");
    }
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
      course: course.id,
      pathway: activePathway(),
      bank: state.bank || "all",
      unit: state.unit || "",
      kind: state.kind || "custom",
      durationSeconds: state.durationSeconds || 0,
      ids: [...state.ids],
      revisionMeta: state.revisionMeta || null,
      buildConfig: state.buildConfig || null,
      createdAt: Date.now()
    });
    saveSavedTests(items.slice(0, 24));
    renderSavedTests();
  }

  function savedUnitContext() {
    return els.unit?.value || els.customUnit?.value || els.smartUnit?.value || "";
  }

  function savedTestCompatible(item) {
    if (!item || (item.course && item.course !== course.id)) return false;
    if (item.pathway && item.pathway !== activePathway()) return false;
    const ids = Array.isArray(item.ids) ? item.ids : [];
    const qs = ids.map(questionById).filter(Boolean);
    if (!ids.length || qs.length !== ids.length) return false;
    const unit = savedUnitContext();
    return !unit || qs.every((question) => displayUnit(question) === unit);
  }

  function visibleSavedTests() {
    return savedTests().filter(savedTestCompatible);
  }

  function renderSavedTests() {
    const allItems = savedTests();
    const items = visibleSavedTests();
    const hiddenCount = Math.max(0, allItems.length - items.length);
    els.savedSummary.textContent = `${items.length} saved test${items.length === 1 ? "" : "s"} for this tab${hiddenCount ? ` | ${hiddenCount} hidden by course/unit` : ""}`;
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
    return visibleSavedTests().find((item) => item.id === id);
  }

  async function loadSavedTest(id, printAfter = false, trigger) {
    const test = savedTestById(id);
    if (!test) {
      showBuildMessage("This saved test belongs to another course or unit.");
      return;
    }
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
      revisionMeta: test.revisionMeta || null,
      buildConfig: test.buildConfig || null
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

  els.modeTabs.forEach((button, index) => {
    button.addEventListener("click", () => switchMode(button.dataset.examMode));
    button.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      let nextIndex = index;
      if (event.key === "Home") nextIndex = 0;
      else if (event.key === "End") nextIndex = els.modeTabs.length - 1;
      else if (event.key === "ArrowRight") nextIndex = (index + 1) % els.modeTabs.length;
      else nextIndex = (index - 1 + els.modeTabs.length) % els.modeTabs.length;
      const next = els.modeTabs[nextIndex];
      switchMode(next.dataset.examMode);
      next.focus();
    });
  });
  els.start.addEventListener("click", handlePrimaryAction);
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
  els.part?.addEventListener("change", refreshTopicOptions);
  els.unit?.addEventListener("change", refreshTopicOptions);
  els.topicMix?.addEventListener("change", () => updateTopicMixSummary(els.topicMix, els.topicMixSummary));
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-topic-mix-action][data-topic-mix-target]");
    if (!button) return;
    const container = document.getElementById(button.dataset.topicMixTarget);
    setTopicMixByMode(container, button.dataset.topicMixAction);
  });
  [els.smartBank, els.smartPart, els.smartUnit, els.smartProfile, els.smartCount, els.smartDuration, els.smartMistakes, els.smartWeakTopics, els.smartUnsolved]
    .filter(Boolean)
    .forEach((input) => {
      const updateSmartAnalysis = () => {
        if (input === els.smartBank || input === els.smartPart || input === els.smartUnit) refreshSmartTopicOptions();
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
  els.customPart?.addEventListener("change", () => {
    refreshBuilderTopicOptions();
    refreshBuilderPaperOptions();
    renderBuilderResults();
  });
  [els.customSearch, els.customBank, els.customPart, els.customTopic, els.customPaper, els.customDifficulty, els.customStatus, els.customMinMarks, els.customMaxMarks]
    .filter(Boolean)
    .forEach((input) => input.addEventListener("input", () => {
      if (input === els.customBank || input === els.customPart || input === els.customTopic) refreshBuilderPaperOptions();
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
  els.generateSmart?.addEventListener("click", () => buildSmartRevision());
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
