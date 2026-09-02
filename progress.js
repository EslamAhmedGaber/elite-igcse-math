(function () {
  const params = new URLSearchParams(window.location.search);
  const DEFAULT_TRACKER_EXTRA_YEARS = ["2026"];
  const DEFAULT_TRACKER_EXTRA_PAPER_CODES = ["Unit 1", "Unit 2"];
  const PAPER_CODE_ORDER = [
    "Unit 1",
    "Unit 2",
    "WMA11",
    "WMA12",
    "WME01",
    "4WM1H",
    "4WM1HR",
    "4WM2H",
    "4WM2HR",
    "P1H",
    "P1HR",
    "P2H",
    "P2HR"
  ];

  function sessionLabel(session) {
    return session === "MayJune" ? "May/June" : session;
  }

  function resolveProgressCoursePack() {
    const pathway = (params.get("pathway") || window.ELITE_PATHWAY?.mode || "linear").toLowerCase();
    const course = (params.get("course") || "").toLowerCase();
    const ialDefinitions = {
      wma11: {
        id: "wma11",
        code: "WMA11",
        unitName: "Pure 1",
        label: "IAL Pure 1",
        pageHref: "ial/wma11/index.html",
        topics: window.WMA11_TOPICS || [],
        questions: window.WMA11_QUESTIONS || [],
        storagePrefix: "eliteWMA11"
      },
      wma12: {
        id: "wma12",
        code: "WMA12",
        unitName: "Pure 2",
        label: "IAL Pure 2",
        pageHref: "ial/wma12/index.html",
        topics: window.WMA12_TOPICS || [],
        questions: window.WMA12_QUESTIONS || [],
        storagePrefix: "eliteWMA12"
      },
      wme01: {
        id: "wme01",
        code: "WME01",
        unitName: "Mechanics 1",
        label: "IAL Mechanics 1",
        pageHref: "ial/wme01/index.html",
        topics: window.WME01_TOPICS || [],
        questions: window.WME01_QUESTIONS || [],
        storagePrefix: "eliteWME01"
      }
    };
    if (pathway === "baccalaureate" || course === "baccalaureate" || course === "egyptian-baccalaureate") {
      const rawQuestions = Array.isArray(window.EGYPTIAN_BACCALAUREATE_QUESTIONS)
        ? window.EGYPTIAN_BACCALAUREATE_QUESTIONS
        : [];
      const chapterMap = new Map();
      rawQuestions.forEach((item) => {
        if (!item?.chapter_id) return;
        if (!chapterMap.has(item.chapter_id)) chapterMap.set(item.chapter_id, {
          id: item.chapter_id,
          title: item.chapter_title || item.chapter_id
        });
      });
      const chapters = [...chapterMap.values()].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
      const chapterOrder = new Map(chapters.map((chapter, index) => [chapter.id, index + 1]));
      const topicMap = new Map();
      rawQuestions.forEach((item) => {
        if (!item?.topic_id) return;
        if (!topicMap.has(item.topic_id)) topicMap.set(item.topic_id, {
          id: item.topic_id,
          title: item.concept_title || item.topic_id,
          chapterId: item.chapter_id || ""
        });
      });
      const topics = [...topicMap.values()].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
      const topicOrder = new Map(topics.map((topic, index) => [topic.id, index + 1]));
      const chapterById = new Map(chapters.map((chapter) => [chapter.id, chapter]));
      const questions = rawQuestions.map((item) => ({
        ...item,
        id: item.id,
        source_id: item.source_id || item.id,
        bank: "all",
        unit: item.chapter_id ? `${item.chapter_id} — ${item.chapter_title || item.chapter_id}` : "Mixed",
        unit_id: item.chapter_id || "",
        modular_force_unit: item.chapter_id || "",
        topic: item.topic_id ? `${item.topic_id} — ${item.concept_title || item.topic_id}` : "Mixed",
        topic_slug: item.topic_id || item.concept_id || item.id,
        topic_order: topicOrder.get(item.topic_id) || 999,
        question: item.id,
        marks: item.marks || (item.format === "mcq" ? 1 : 2),
        is_expertise: item.level === "L3" || item.level === "L4" || Boolean(item.combined)
      }));
      return {
        pathway: "baccalaureate",
        course: "egyptian-baccalaureate",
        label: "Egyptian Baccalaureate Mathematics 2026",
        unitLowerPlural: "chapters",
        questions,
        solvedKey: "eliteEgyptianBaccalaureateSolvedV1",
        selectedKey: "eliteEgyptianBaccalaureateSelectedV1",
        reviewKey: "eliteEgyptianBaccalaureateMistakeBoxV1",
        readinessKey: "eliteEgyptianBaccalaureateReadinessCheck",
        activityKey: "eliteEgyptianBaccalaureateStudyActivityV1",
        paperAttemptsKey: "eliteEgyptianBaccalaureateTestAttemptsV1",
        studyTasksKey: "eliteEgyptianBaccalaureateStudyTasksV1",
        mockHistoryKey: "eliteEgyptianBaccalaureateMockExamHistoryV1",
        examKey: "eliteEgyptianBaccalaureateMockExamV1",
        planKey: "eliteEgyptianBaccalaureateStudyPlanV1",
        profileKey: "eliteEgyptianBaccalaureateStudentProfileV1",
        assignmentsKey: "eliteEgyptianBaccalaureateTrackerAssignmentsV1",
        quizzesKey: "eliteEgyptianBaccalaureateTrackerQuizzesV1",
        trackerExtraYears: ["2026"],
        trackerExtraPaperCodes: [],
        expertiseLabel: "Challenge",
        expertiseName: "Challenge",
        expertiseFilter: (question) => Boolean(question.is_expertise),
        practiceLink(row, bank = "all") {
          const linkParams = new URLSearchParams({ pathway: "baccalaureate", mode: "custom" });
          if (row?.unit_id) linkParams.set("unit", row.unit_id);
          const topicLabel = String(row?.topic || "").replace(/^[A-Z]\d{2}-T\d{2}\s+—\s+/, "").trim();
          if (topicLabel) linkParams.set("topics", topicLabel);
          if (bank === "expertise") linkParams.set("bank", "expertise");
          return `exam.html?${linkParams.toString()}`;
        },
        paperOptions() {
          return chapters.map((chapter) => ({
            year: "2026",
            session: "Chapter",
            paperCode: chapter.id,
            chapterTitle: chapter.title
          }));
        },
        paperLabel(item) {
          const chapter = chapterById.get(item?.paperCode);
          return chapter ? `${chapter.id} — ${chapter.title}` : `${item?.session || "Test"} ${item?.year || ""} ${item?.paperCode || ""}`.trim();
        }
      };
    }
    const ialCourse = pathway === "pure" ? (ialDefinitions[course] || ialDefinitions.wma11) : null;
    if (ialCourse) {
      const topics = ialCourse.topics;
      const topicOrder = new Map(topics.map((topic, index) => [topic.slug, index + 1]));
      const topicNames = new Map(topics.map((topic) => [topic.slug, topic.name]));
      const rawQuestions = ialCourse.questions;
      const questions = rawQuestions.map((item) => {
        const topicSlug = item.primaryTopic || item.topic;
        const topicName = item.primaryTopicName || item.topicName || topicNames.get(topicSlug) || topicSlug;
        return {
          ...item,
          id: item.id,
          source_id: item.id,
          bank: "all",
          unit: ialCourse.unitName,
          modular_force_unit: ialCourse.unitName,
          topic: topicName,
          topic_slug: topicSlug,
          topic_order: topicOrder.get(topicSlug) || 999,
          question: item.qNo,
          paper: `${sessionLabel(item.session)} ${item.year} ${ialCourse.code}`,
          paperCode: item.paperCode || ialCourse.code,
          paper_code: item.paperCode || ialCourse.code,
          image: item.image,
          marks: item.marks
        };
      });
      return {
        pathway: "pure",
        course: ialCourse.id,
        label: ialCourse.label,
        unitLowerPlural: "courses",
        questions,
        solvedKey: `${ialCourse.storagePrefix}SolvedV1`,
        selectedKey: `${ialCourse.storagePrefix}SelectedV1`,
        reviewKey: `${ialCourse.storagePrefix}MistakeBoxV1`,
        readinessKey: `${ialCourse.storagePrefix}ReadinessCheck`,
        activityKey: `${ialCourse.storagePrefix}StudyActivityV1`,
        paperAttemptsKey: `${ialCourse.storagePrefix}PaperAttemptsV1`,
        studyTasksKey: `${ialCourse.storagePrefix}StudyTasksV1`,
        mockHistoryKey: `${ialCourse.storagePrefix}MockExamHistoryV1`,
        examKey: `${ialCourse.storagePrefix}MockExamV1`,
        planKey: `${ialCourse.storagePrefix}StudyPlanV1`,
        profileKey: `${ialCourse.storagePrefix}StudentProfileV1`,
        assignmentsKey: `${ialCourse.storagePrefix}TrackerAssignmentsV1`,
        quizzesKey: `${ialCourse.storagePrefix}TrackerQuizzesV1`,
        trackerExtraYears: DEFAULT_TRACKER_EXTRA_YEARS,
        trackerExtraPaperCodes: [ialCourse.code],
        expertiseLabel: "Q6+",
        expertiseName: "Expertise",
        expertiseFilter: (question) => Number(question.qNo || question.question || 0) >= 6,
        practiceLink(row, bank = "all") {
          const linkParams = new URLSearchParams();
          linkParams.set("course", ialCourse.id);
          if (row?.topicSlug || row?.topic_slug) linkParams.set("topic", row.topicSlug || row.topic_slug);
          if (bank === "expertise") linkParams.set("expertise", "1");
          return `${ialCourse.pageHref}?${linkParams.toString()}#ialFilters`;
        },
        paperOptions() {
          const groups = new Map();
          rawQuestions.forEach((item) => {
            const key = `${item.year}|${item.session}|${ialCourse.code}`;
            if (!groups.has(key)) {
              groups.set(key, {
                year: String(item.year),
                session: item.session,
                paperCode: ialCourse.code
              });
            }
          });
          return [...groups.values()];
        }
      };
    }
    const mode = pathway === "modular" ? "modular" : "linear";
    return {
      pathway: mode,
      course: "4ma1",
      label: mode === "modular" ? "Modular" : "Linear",
      unitLowerPlural: window.ELITE_PATHWAY?.label("unitLowerPlural") || (mode === "modular" ? "units" : "chapters"),
      questions: window.QUESTION_DATA || [],
      solvedKey: "solvedExpertiseQuestions",
      selectedKey: "selectedExpertiseQuestions",
      reviewKey: "eliteMistakeBoxV1",
      readinessKey: "eliteReadinessCheck",
      activityKey: "eliteStudyActivityV1",
      paperAttemptsKey: "elitePaperAttemptsV1",
      studyTasksKey: "eliteStudyTasksV1",
      mockHistoryKey: "eliteMockExamHistoryV1",
      examKey: "eliteMockExamV1",
      planKey: "eliteStudyPlanSettings",
      profileKey: "eliteStudentProfileV1",
      assignmentsKey: "eliteTrackerAssignmentsV2",
      quizzesKey: "eliteTrackerQuizzesV2",
      trackerExtraYears: DEFAULT_TRACKER_EXTRA_YEARS,
      trackerExtraPaperCodes: DEFAULT_TRACKER_EXTRA_PAPER_CODES,
      expertiseLabel: "Q20+",
      expertiseName: "Q20+",
      practiceLink(row, bank = "all") {
        const linkParams = new URLSearchParams({ pathway: mode, bank, unit: row.unit, topic: row.topic });
        if (bank === "expertise") linkParams.set("mode", "q20");
        return `practice.html?${linkParams.toString()}`;
      }
    };
  }

  const coursePack = resolveProgressCoursePack();
  window.EliteProgressCoursePack = coursePack;
  const questions = coursePack.questions || [];
  const PROFILE_KEY = coursePack.profileKey;
  const SOLVED_KEY = coursePack.solvedKey;
  const SELECTED_KEY = coursePack.selectedKey;
  const REVIEW_KEY = coursePack.reviewKey;
  const READINESS_KEY = coursePack.readinessKey;
  const ACTIVITY_KEY = coursePack.activityKey;
  const PAPER_ATTEMPTS_KEY = coursePack.paperAttemptsKey;
  const STUDY_TASKS_KEY = coursePack.studyTasksKey;
  const MOCK_HISTORY_KEY = coursePack.mockHistoryKey;
  const EXAM_KEY = coursePack.examKey;
  const PLAN_KEY = coursePack.planKey;
  const LEAD_KEY = "leadInfoV1";
  const ASSIGNMENTS_KEY = coursePack.assignmentsKey;
  const QUIZZES_KEY = coursePack.quizzesKey;

  const els = {
    previewName: document.getElementById("profilePreviewName"),
    previewTarget: document.getElementById("profilePreviewTarget"),
    saveStatus: document.getElementById("saveStatus"),
    fullSolved: document.getElementById("fullSolved"),
    fullPercent: document.getElementById("fullPercent"),
    expertiseSolved: document.getElementById("expertiseSolved"),
    expertisePercent: document.getElementById("expertisePercent"),
    selectedCount: document.getElementById("selectedCountProgress"),
    mistakeDue: document.getElementById("mistakeDue"),
    studyStreak: document.getElementById("studyStreak"),
    paperDoneCount: document.getElementById("paperDoneCount"),
    paperAverage: document.getElementById("paperAverage"),
    gradeForecast: document.getElementById("gradeForecast"),
    urgentTopicCount: document.getElementById("urgentTopicCount"),
    overdueTaskCount: document.getElementById("overdueTaskCount"),
    form: document.getElementById("progressProfileForm"),
    studentName: document.getElementById("studentName"),
    targetGrade: document.getElementById("targetGrade"),
    examSession: document.getElementById("examSession"),
    weeklyTarget: document.getElementById("weeklyTarget"),
    nextMoveCards: document.getElementById("nextMoveCards"),
    unitFilter: document.getElementById("progressUnitFilter"),
    statusFilter: document.getElementById("progressStatusFilter"),
    search: document.getElementById("progressSearch"),
    rows: document.getElementById("topicProgressRows"),
    selectedTopicSummary: document.getElementById("selectedTopicSummary"),
    visibleTopicSummary: document.getElementById("visibleTopicSummary"),
    selectVisibleTopicsBtn: document.getElementById("selectVisibleTopicsBtn"),
    clearVisibleTopicsBtn: document.getElementById("clearVisibleTopicsBtn"),
    printVisibleTopicsBtn: document.getElementById("printVisibleTopicsBtn"),
    printSelectedTopicsBtn: document.getElementById("printSelectedTopicsBtn"),
    printArea: document.getElementById("progressPrintArea"),
    priorityRows: document.getElementById("priorityRows"),
    paperAttemptForm: document.getElementById("paperAttemptForm"),
    paperYear: document.getElementById("paperYear"),
    paperSession: document.getElementById("paperSession"),
    paperCode: document.getElementById("paperCode"),
    paperDate: document.getElementById("paperDate"),
    paperRawScore: document.getElementById("paperRawScore"),
    paperTime: document.getElementById("paperTime"),
    paperWrongQuestions: document.getElementById("paperWrongQuestions"),
    paperNotes: document.getElementById("paperNotes"),
    paperAttemptRows: document.getElementById("paperAttemptRows"),
    allPapersRows: document.getElementById("allPapersRows"),
    paperStatusFilter: document.getElementById("paperStatusFilter"),
    paperSearch: document.getElementById("paperSearch"),
    bestPaperScore: document.getElementById("bestPaperScore"),
    lowestPaperScore: document.getElementById("lowestPaperScore"),
    averagePaperTime: document.getElementById("averagePaperTime"),
    studyTaskForm: document.getElementById("studyTaskForm"),
    taskKind: document.getElementById("taskKind"),
    taskUnit: document.getElementById("taskUnit"),
    taskTopic: document.getElementById("taskTopic"),
    taskTitle: document.getElementById("taskTitle"),
    taskDifficulty: document.getElementById("taskDifficulty"),
    taskDueDate: document.getElementById("taskDueDate"),
    taskRawScore: document.getElementById("taskRawScore"),
    taskMaxScore: document.getElementById("taskMaxScore"),
    taskStatus: document.getElementById("taskStatus"),
    studyTaskRows: document.getElementById("studyTaskRows"),
    loggedTaskCount: document.getElementById("loggedTaskCount"),
    taskAverage: document.getElementById("taskAverage"),
    tasksDueWeek: document.getElementById("tasksDueWeek"),
    exportBtn: document.getElementById("exportProgressBtn"),
    importInput: document.getElementById("importProgressInput"),
    sendBtn: document.getElementById("sendProgressBtn")
  };

  function readJSON(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value ?? fallback;
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
      "\"": "&quot;",
      "'": "&#39;"
    }[char]));
  }

  function todayKey(date = new Date()) {
    return date.toISOString().slice(0, 10);
  }

  function readActivity() {
    const raw = readJSON(ACTIVITY_KEY, {});
    if (Array.isArray(raw)) {
      return raw.reduce((map, day) => ({ ...map, [day]: 1 }), {});
    }
    return raw && typeof raw === "object" ? raw : {};
  }

  function recordVisit() {
    const activity = readActivity();
    const today = todayKey();
    activity[today] = Math.max(1, Number(activity[today] || 0));
    writeJSON(ACTIVITY_KEY, activity);
  }

  function streakCount(activity) {
    let count = 0;
    const date = new Date();
    while (count < 365) {
      if (!activity[todayKey(date)]) break;
      count += 1;
      date.setDate(date.getDate() - 1);
    }
    return count;
  }

  const byId = new Map(questions.map((question) => [question.id, question]));
  let profile = {
    name: "",
    targetGrade: "",
    examSession: "",
    weeklyTarget: 30,
    ...readJSON(PROFILE_KEY, {})
  };
  let solved = new Set(readJSON(SOLVED_KEY, []));
  let selected = new Set(readJSON(SELECTED_KEY, []));
  let reviewItems = readJSON(REVIEW_KEY, {});
  let readiness = readJSON(READINESS_KEY, {});
  let paperAttempts = Array.isArray(readJSON(PAPER_ATTEMPTS_KEY, [])) ? readJSON(PAPER_ATTEMPTS_KEY, []) : [];
  let studyTasks = Array.isArray(readJSON(STUDY_TASKS_KEY, [])) ? readJSON(STUDY_TASKS_KEY, []) : [];
  let mockHistory = Array.isArray(readJSON(MOCK_HISTORY_KEY, [])) ? readJSON(MOCK_HISTORY_KEY, []) : [];
  let visibleTopicRows = [];
  const selectedTopics = new Set();

  function sourceSet(ids) {
    return new Set([...ids].map((id) => byId.get(id)?.source_id).filter(Boolean));
  }

  const solvedSources = sourceSet(solved);
  const selectedSources = sourceSet(selected);

  function isSolved(question) {
    return solved.has(question.id) || solvedSources.has(question.source_id);
  }

  function isSelected(question) {
    return selected.has(question.id) || selectedSources.has(question.source_id);
  }

  function bankQuestions(bank) {
    if (bank === "expertise" && typeof coursePack.expertiseFilter === "function") {
      return questions.filter(coursePack.expertiseFilter);
    }
    return questions.filter((question) => question.bank === bank);
  }

  function uniqueSorted(values) {
    return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  function topicRows() {
    const expertiseByTopic = new Map();
    bankQuestions("expertise").forEach((question) => {
      const key = `${question.unit}|||${question.topic_slug || question.topic}`;
      const row = expertiseByTopic.get(key) || { total: 0, solved: 0 };
      row.total += 1;
      if (isSolved(question)) row.solved += 1;
      expertiseByTopic.set(key, row);
    });

    const rows = new Map();
    bankQuestions("all").forEach((question) => {
      const key = `${question.unit}|||${question.topic_slug || question.topic}`;
      const row = rows.get(key) || {
        unit: question.unit || "Mixed",
        unit_id: question.unit_id || "",
        topic: question.topic || "Mixed",
        topicSlug: question.topic_slug || question.topic,
        topicOrder: Number(question.topic_order || 999),
        total: 0,
        solved: 0,
        selected: 0,
        marks: 0,
        expertiseTotal: 0,
        expertiseSolved: 0
      };
      row.total += 1;
      row.marks += Number(question.marks || 0);
      if (isSolved(question)) row.solved += 1;
      if (isSelected(question)) row.selected += 1;
      const expertise = expertiseByTopic.get(key);
      if (expertise) {
        row.expertiseTotal = expertise.total;
        row.expertiseSolved = expertise.solved;
      }
      rows.set(key, row);
    });

    return [...rows.values()].sort((a, b) => a.topicOrder - b.topicOrder || a.topic.localeCompare(b.topic));
  }

  function statusFor(row) {
    const pct = row.total ? row.solved / row.total : 0;
    if (pct >= 0.75) return "strong";
    if (row.solved > 0) return "started";
    return "not-started";
  }

  function pct(value, total) {
    return total ? Math.round((value / total) * 100) : 0;
  }

  function topicKey(row) {
    return `${row.unit}|||${row.topicSlug || row.topic}`;
  }

  function questionsForTopicRows(rows) {
    const keys = new Set(rows.map(topicKey));
    return bankQuestions("all").filter((question) => keys.has(`${question.unit}|||${question.topic_slug || question.topic}`));
  }

  function average(values) {
    const nums = values.map(Number).filter((value) => Number.isFinite(value));
    return nums.length ? nums.reduce((sum, value) => sum + value, 0) / nums.length : 0;
  }

  function scorePercent(raw, max = 100) {
    const score = Number(raw);
    const total = Number(max);
    if (!Number.isFinite(score) || !Number.isFinite(total) || total <= 0) return null;
    return Math.max(0, Math.min(100, Math.round((score / total) * 100)));
  }

  function gradeFromPercent(value) {
    const percent = Number(value);
    if (!Number.isFinite(percent) || percent <= 0) return "grade forecast pending";
    if (percent >= 90) return "Grade 9 / A* pace";
    if (percent >= 80) return "Grade 8 pace";
    if (percent >= 70) return "Grade 7 pace";
    if (percent >= 60) return "Grade 6 pace";
    if (percent >= 50) return "Grade 5 pace";
    return "needs urgent revision";
  }

  function uid(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  }

  function parsePaperName(name) {
    const match = String(name || "").match(/^([A-Za-z]+)\s+(\d{4})\s+((?:P?\dH[R]?)|(?:4WM[12]H[R]?))$/i);
    if (!match) return null;
    return {
      session: match[1],
      year: match[2],
      paperCode: match[3].toUpperCase()
    };
  }

  function paperKey(item) {
    return `${item.year || ""}|${item.session || ""}|${item.paperCode || ""}`;
  }

  function paperLabel(item) {
    if (typeof coursePack.paperLabel === "function") return coursePack.paperLabel(item);
    return `${item.session || ""} ${item.year || ""} ${item.paperCode || ""}`.trim();
  }

  function sortPaperCodes(codes) {
    return [...new Set(codes.filter(Boolean))].sort((a, b) => {
      const aOrder = PAPER_CODE_ORDER.indexOf(a);
      const bOrder = PAPER_CODE_ORDER.indexOf(b);
      if (aOrder !== -1 || bOrder !== -1) {
        return (aOrder === -1 ? 999 : aOrder) - (bOrder === -1 ? 999 : bOrder);
      }
      return String(a).localeCompare(String(b), undefined, { numeric: true });
    });
  }

  function allPaperOptions() {
    const map = new Map();
    const rememberPaper = (paper) => {
      if (!paper?.year || !paper?.session || !paper?.paperCode) return;
      const key = paperKey(paper);
      if (!map.has(key)) map.set(key, paper);
    };
    if (typeof coursePack.paperOptions === "function") {
      coursePack.paperOptions().forEach(rememberPaper);
    } else {
      bankQuestions("all").forEach((question) => {
        const parsed = parsePaperName(question.paper);
        if (!parsed) return;
        if (question.paper_code) parsed.paperCode = String(question.paper_code).toUpperCase();
        rememberPaper(parsed);
      });
    }
    paperAttempts.forEach(rememberPaper);
    const sessionOrder = { Jan: 1, May: 2, MayJune: 2, Jun: 3, Oct: 4, Nov: 5 };
    return [...map.values()].sort((a, b) => {
      const yearDiff = Number(b.year) - Number(a.year);
      if (yearDiff) return yearDiff;
      const sessionDiff = (sessionOrder[a.session] || 99) - (sessionOrder[b.session] || 99);
      if (sessionDiff) return sessionDiff;
      return a.paperCode.localeCompare(b.paperCode);
    });
  }

  function taskScore(task) {
    return scorePercent(task.rawScore, task.maxScore);
  }

  function daysUntil(dateValue) {
    if (!dateValue) return null;
    const today = new Date(todayKey());
    const due = new Date(dateValue);
    if (Number.isNaN(due.getTime())) return null;
    return Math.ceil((due - today) / 86400000);
  }

  function normalizedStatus(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function practiceLink(row, bank = "all") {
    return coursePack.practiceLink(row, bank);
  }

  function loadProfileForm() {
    els.studentName.value = profile.name || "";
    els.targetGrade.value = profile.targetGrade || "";
    els.examSession.value = profile.examSession || "";
    els.weeklyTarget.value = profile.weeklyTarget || 30;
  }

  function paperStats() {
    const percents = paperAttempts.map((attempt) => scorePercent(attempt.rawScore, 100)).filter((value) => value !== null);
    const times = paperAttempts.map((attempt) => Number(attempt.timeMinutes)).filter((value) => Number.isFinite(value) && value > 0);
    return {
      count: paperAttempts.length,
      uniqueCount: new Set(paperAttempts.map(paperKey)).size,
      average: percents.length ? Math.round(average(percents)) : 0,
      best: percents.length ? Math.max(...percents) : null,
      lowest: percents.length ? Math.min(...percents) : null,
      averageTime: times.length ? Math.round(average(times)) : null
    };
  }

  function taskStats() {
    const scored = studyTasks.map(taskScore).filter((value) => value !== null);
    const overdue = studyTasks.filter((task) => {
      const status = normalizedStatus(task.status);
      const days = daysUntil(task.dueDate);
      return status === "missing" || status === "late" || (status === "pending" && days !== null && days < 0);
    }).length;
    const dueWeek = studyTasks.filter((task) => {
      const status = normalizedStatus(task.status);
      const days = daysUntil(task.dueDate);
      return status === "pending" && days !== null && days >= 0 && days <= 7;
    }).length;
    return {
      count: studyTasks.length,
      average: scored.length ? Math.round(average(scored)) : null,
      overdue,
      dueWeek
    };
  }

  function reviewCountsByTopic() {
    const map = new Map();
    Object.values(reviewItems || {}).forEach((item) => {
      const question = byId.get(item.id);
      if (!question) return;
      const key = question.topic_slug || question.topic;
      const row = map.get(key) || { total: 0, due: 0 };
      row.total += 1;
      if (!item.masteredAt && Number(item.dueAt || 0) <= Date.now()) row.due += 1;
      map.set(key, row);
    });
    return map;
  }

  function priorityRowsData() {
    const reviewCounts = reviewCountsByTopic();
    return topicRows().map((row) => {
      const fullPct = pct(row.solved, row.total);
      const expertisePct = pct(row.expertiseSolved, row.expertiseTotal);
      const review = reviewCounts.get(row.topicSlug || row.topic) || { total: 0, due: 0 };
      const gap = Math.max(0, 100 - fullPct);
      const expertiseGap = row.expertiseTotal ? Math.max(0, 100 - expertisePct) : 25;
      let score = Math.round(gap * 0.55 + expertiseGap * 0.20 + Math.min(4, review.total) * 9 + Math.min(3, review.due) * 7 + Math.min(4, row.selected) * 2);
      if (!row.solved && !row.selected && !review.total) score = Math.min(score, 44);
      let verdict = "Strong";
      let className = "strong";
      if (score >= 70) {
        verdict = "Urgent";
        className = "urgent";
      } else if (score >= 45) {
        verdict = "Needs work";
        className = "needs";
      } else if (score >= 20) {
        verdict = "On track";
        className = "steady";
      }
      return { ...row, fullPct, expertisePct, review, score, verdict, className };
    }).sort((a, b) => b.score - a.score || a.topicOrder - b.topicOrder);
  }

  function renderSummary() {
    const all = bankQuestions("all");
    const expertise = bankQuestions("expertise");
    const allSolved = all.filter(isSolved).length;
    const expertiseSolved = expertise.filter(isSolved).length;
    const selectedAll = all.filter(isSelected).length;
    const dueMistakes = Object.values(reviewItems).filter((item) => !item.masteredAt && Number(item.dueAt || 0) <= Date.now()).length;
    const activity = readActivity();
    const papers = paperStats();
    const tasks = taskStats();
    const urgentTopics = priorityRowsData().filter((row) => row.className === "urgent").length;

    els.previewName.textContent = profile.name?.trim() || "Student";
    els.previewTarget.textContent = [
      profile.targetGrade ? `Target grade ${profile.targetGrade}` : "Target not set yet",
      profile.examSession ? profile.examSession : ""
    ].filter(Boolean).join(" | ");
    els.fullSolved.textContent = `${allSolved}/${all.length}`;
    els.fullPercent.textContent = `${pct(allSolved, all.length)}% solved`;
    els.expertiseSolved.textContent = `${expertiseSolved}/${expertise.length}`;
    els.expertisePercent.textContent = `${pct(expertiseSolved, expertise.length)}% solved`;
    els.selectedCount.textContent = selectedAll;
    els.mistakeDue.textContent = dueMistakes;
    els.studyStreak.textContent = streakCount(activity);
    els.paperDoneCount.textContent = papers.count;
    els.paperAverage.textContent = papers.average ? `${papers.average}%` : "0%";
    els.gradeForecast.textContent = gradeFromPercent(papers.average);
    els.urgentTopicCount.textContent = urgentTopics;
    els.overdueTaskCount.textContent = tasks.overdue;
  }

  function renderUnitFilter() {
    const unitLabel = coursePack.unitLowerPlural || window.ELITE_PATHWAY?.label("unitLowerPlural") || "units";
    const units = uniqueSorted(topicRows().map((row) => row.unit));
    els.unitFilter.innerHTML = `<option value="">All ${escapeHtml(unitLabel)}</option>${units.map((unit) => `<option>${escapeHtml(unit)}</option>`).join("")}`;
  }

  function applyCourseCopy() {
    document.body.dataset.progressPathway = coursePack.pathway;
    const title = document.getElementById("progressTitle");
    if (title) title.textContent = `${coursePack.label} progress dashboard.`;
    document.querySelectorAll("[data-pathway-label='unit']").forEach((node) => {
      node.textContent = coursePack.pathway === "pure" ? "Course" : (window.ELITE_PATHWAY?.label("unit") || "Unit");
    });
    document.querySelectorAll("[data-progress-expertise-label]").forEach((node) => {
      node.textContent = coursePack.expertiseLabel || "Q20+";
    });
    if (coursePack.pathway === "baccalaureate") {
      const paperTab = document.querySelector("[data-tab-target='papers']");
      if (paperTab) paperTab.textContent = "Test Attempts";
      const paperMetric = document.getElementById("paperDoneCount")?.closest("article")?.querySelector("span");
      if (paperMetric) paperMetric.textContent = "Tests attempted";
      const recentTrendMeta = document.querySelector("#recentTrendCard .rt-head span");
      if (recentTrendMeta) recentTrendMeta.textContent = "last 8 tests";
      const paperTitle = document.getElementById("paperTrackerTitle");
      if (paperTitle) paperTitle.textContent = "Log each chapter or mock attempt.";
      const allPapersTitle = document.getElementById("allPapersTitle");
      if (allPapersTitle) allPapersTitle.textContent = "Chapter and test completion status.";
      const paperSearch = document.getElementById("paperSearch");
      if (paperSearch) paperSearch.placeholder = "Chapter 1, C01, Algebraic Proofs";
    }
  }

  function applyUrlDefaults() {
    const params = new URLSearchParams(window.location.search);
    const unit = params.get("unit");
    if (unit && [...els.unitFilter.options].some((option) => option.value === unit)) {
      els.unitFilter.value = unit;
    }
  }

  function renderNextMoves() {
    const rows = topicRows();
    const weak = rows
      .filter((row) => row.total > 0)
      .sort((a, b) => pct(a.solved, a.total) - pct(b.solved, b.total) || b.expertiseTotal - a.expertiseTotal)
      .slice(0, 3);
    const weekly = Math.max(5, Number(profile.weeklyTarget || 30));
    const first = weak[0] || rows[0];
    const all = bankQuestions("all");
    const solvedCount = all.filter(isSolved).length;
    const remaining = Math.max(0, all.length - solvedCount);
    const weeksLeft = Math.max(1, Math.ceil(remaining / weekly));
    const expertiseLabel = coursePack.expertiseLabel || "Q20+";
    const expertiseName = coursePack.expertiseName || expertiseLabel;

    els.nextMoveCards.innerHTML = [
      `<article>
        <span>Priority topic</span>
        <strong>${escapeHtml(first?.topic || "Choose a topic")}</strong>
        <p>${first ? `${first.solved}/${first.total} solved in ${escapeHtml(first.unit)}.` : "Start with the classified bank."}</p>
        <a class="button primary" href="${first ? practiceLink(first) : "practice.html"}">Practise now</a>
      </article>`,
      `<article>
        <span>Weekly target</span>
        <strong>${weekly} questions</strong>
        <p>At this pace, the remaining full bank is about ${weeksLeft} week${weeksLeft === 1 ? "" : "s"} of work.</p>
        <a class="button light" href="#planBuilder">Build weekly plan</a>
      </article>`,
      `<article>
        <span>Exam finishers</span>
        <strong>${escapeHtml(expertiseName)} training</strong>
        <p>Use harder questions when a topic is started but not yet strong.</p>
        <a class="button light" href="${first ? practiceLink(first, "expertise") : practiceLink({ unit: "", topic: "" }, "expertise")}">Open ${escapeHtml(expertiseLabel)}</a>
      </article>`
    ].join("");
  }

  function renderRows() {
    const unit = els.unitFilter.value;
    const status = els.statusFilter.value;
    const search = els.search.value.trim().toLowerCase();
    const expertiseLabel = coursePack.expertiseLabel || "Q20+";
    const rows = topicRows().filter((row) => {
      if (unit && row.unit !== unit) return false;
      if (status && statusFor(row) !== status) return false;
      if (search && !`${row.topic} ${row.unit}`.toLowerCase().includes(search)) return false;
      return true;
    });
    visibleTopicRows = rows;
    updateTopicSelectionSummary();

    if (!rows.length) {
      els.rows.innerHTML = `<tr><td colspan="6">No topics match these filters.</td></tr>`;
      return;
    }

    els.rows.innerHTML = rows.map((row) => {
      const fullPct = pct(row.solved, row.total);
      const status = statusFor(row).replace("-", " ");
      const key = topicKey(row);
      return `<tr>
        <td>
          <label class="topic-select">
            <input type="checkbox" data-topic-select="${escapeHtml(key)}"${selectedTopics.has(key) ? " checked" : ""}>
            <span>Select</span>
          </label>
        </td>
        <td>
          <strong>${escapeHtml(row.topic)}</strong>
          <span>${escapeHtml(row.unit)}</span>
        </td>
        <td>${row.solved}/${row.total}</td>
        <td>${row.expertiseSolved}/${row.expertiseTotal}</td>
        <td>
          <div class="sheet-progress-label"><span>${fullPct}%</span><span>${escapeHtml(status)}</span></div>
          <div class="topic-bar"><i style="width:${fullPct}%"></i></div>
        </td>
        <td>
          <div class="sheet-actions">
            <a href="${practiceLink(row)}">Practice</a>
            ${row.expertiseTotal ? `<a href="${practiceLink(row, "expertise")}">${escapeHtml(expertiseLabel)}</a>` : ""}
          </div>
        </td>
      </tr>`;
    }).join("");
  }

  function updateTopicSelectionSummary() {
    if (els.selectedTopicSummary) {
      els.selectedTopicSummary.textContent = `${selectedTopics.size} topic${selectedTopics.size === 1 ? "" : "s"} selected`;
    }
    if (els.visibleTopicSummary) {
      els.visibleTopicSummary.textContent = `${visibleTopicRows.length} visible`;
    }
  }

  function selectedTopicRows() {
    const keys = new Set(selectedTopics);
    return topicRows().filter((row) => keys.has(topicKey(row)));
  }

  function renderPrintQuestions(items) {
    if (!els.printArea) return;
    els.printArea.innerHTML = items.map((question, index) => `<section class="print-question">
      <div class="print-paper-brand">
        <strong>Elite IGCSE Mathematics - Dr Eslam Ahmed</strong>
        <span>Assistant Lecturer, Cairo University Faculty of Engineering | WhatsApp: 01120009622 | eliteigcse.com</span>
      </div>
      <h2>${index + 1}. ${escapeHtml(question.paper)} Q${question.question} | ${escapeHtml(question.topic)} | ${question.marks} marks</h2>
      <img src="${question.image}" alt="${escapeHtml(question.paper)} Q${question.question}">
      <div class="print-paper-footer">Prepared by Dr Eslam Ahmed | Assistant Lecturer, Cairo University Faculty of Engineering | 01120009622</div>
    </section>`).join("");
  }

  async function printTopicRows(rows, trigger) {
    const items = questionsForTopicRows(rows);
    if (!items.length) {
      els.saveStatus.textContent = "Choose at least one topic with questions before printing.";
      return;
    }
    renderPrintQuestions(items);
    await window.ElitePrint.printWhenReady(els.printArea, trigger);
  }

  function renderPriorityRows() {
    const rows = priorityRowsData().slice(0, 10);
    const expertiseLabel = coursePack.expertiseLabel || "Q20+";
    if (!rows.length) {
      els.priorityRows.innerHTML = `<tr><td colspan="6">Start solving questions to build your revision priorities.</td></tr>`;
      return;
    }
    els.priorityRows.innerHTML = rows.map((row, index) => `<tr class="priority-${row.className}">
      <td><strong>${index + 1}</strong></td>
      <td>
        <strong>${escapeHtml(row.topic)}</strong>
        <span>${escapeHtml(row.unit)}</span>
      </td>
      <td>
        <div class="sheet-progress-label"><span>${row.fullPct}% full</span><span>${row.expertisePct}% ${escapeHtml(expertiseLabel)}</span></div>
        <div class="topic-bar"><i style="width:${row.fullPct}%"></i></div>
      </td>
      <td>${row.review.total} saved <span class="muted-cell">(${row.review.due} due)</span></td>
      <td><span class="status-pill ${row.className}">${escapeHtml(row.verdict)}</span></td>
      <td><div class="sheet-actions"><a href="${practiceLink(row)}">Practice</a>${row.expertiseTotal ? `<a href="${practiceLink(row, "expertise")}">${escapeHtml(expertiseLabel)}</a>` : ""}</div></td>
    </tr>`).join("");
  }

  function renderPaperControls() {
    const papers = allPaperOptions();
    const currentYear = String(new Date().getFullYear());
    const extraYears = coursePack.trackerExtraYears || DEFAULT_TRACKER_EXTRA_YEARS;
    const extraPaperCodes = coursePack.trackerExtraPaperCodes || DEFAULT_TRACKER_EXTRA_PAPER_CODES;
    const years = uniqueSorted([...papers.map((paper) => paper.year), ...extraYears, currentYear]).sort((a, b) => Number(b) - Number(a));
    const sessionOrder = ["Jan", "May", "MayJune", "Jun", "Oct", "Nov"];
    const sessions = uniqueSorted(papers.map((paper) => paper.session)).sort((a, b) => sessionOrder.indexOf(a) - sessionOrder.indexOf(b));
    const modularUnits = uniqueSorted(bankQuestions("all").map((question) => question.modular_force_unit));
    const codes = sortPaperCodes([...papers.map((paper) => paper.paperCode), ...modularUnits, ...extraPaperCodes]);
    els.paperYear.innerHTML = years.map((year) => `<option>${escapeHtml(year)}</option>`).join("");
    els.paperSession.innerHTML = sessions.map((session) => `<option>${escapeHtml(session)}</option>`).join("");
    els.paperCode.innerHTML = codes.map((code) => `<option>${escapeHtml(code)}</option>`).join("");
    if (!els.paperDate.value) els.paperDate.value = todayKey();
  }

  function savePaperAttempt(event) {
    event.preventDefault();
    const rawScore = Number(els.paperRawScore.value);
    if (!Number.isFinite(rawScore)) {
      els.saveStatus.textContent = "Add a raw score before saving the paper.";
      return;
    }
    const revisionStatusEl = document.getElementById("paperRevisionStatus");
    paperAttempts.unshift({
      id: uid("paper"),
      year: els.paperYear.value,
      session: els.paperSession.value,
      paperCode: els.paperCode.value,
      date: els.paperDate.value || todayKey(),
      rawScore: Math.max(0, Math.min(100, rawScore)),
      timeMinutes: Number(els.paperTime.value || 0),
      wrongQuestions: els.paperWrongQuestions.value.trim(),
      notes: els.paperNotes.value.trim(),
      revisionStatus: (revisionStatusEl && revisionStatusEl.value) || "In progress",
      createdAt: new Date().toISOString()
    });
    writeJSON(PAPER_ATTEMPTS_KEY, paperAttempts);
    if (window.EliteCloud?.queueSync) window.EliteCloud.queueSync();
    els.paperRawScore.value = "";
    els.paperTime.value = "";
    els.paperWrongQuestions.value = "";
    els.paperNotes.value = "";
    els.saveStatus.textContent = "Past paper attempt saved.";
    render();
    if (window.EliteTrackerV2?.refresh) window.EliteTrackerV2.refresh();
  }

  function deletePaperAttempt(id) {
    paperAttempts = paperAttempts.filter((attempt) => attempt.id !== id);
    writeJSON(PAPER_ATTEMPTS_KEY, paperAttempts);
    if (window.EliteCloud?.queueSync) window.EliteCloud.queueSync();
    render();
    if (window.EliteTrackerV2?.refresh) window.EliteTrackerV2.refresh();
  }

  function renderPaperDashboard() {
    const stats = paperStats();
    els.bestPaperScore.textContent = stats.best === null ? "-" : `${stats.best}%`;
    els.lowestPaperScore.textContent = stats.lowest === null ? "-" : `${stats.lowest}%`;
    els.averagePaperTime.textContent = stats.averageTime === null ? "-" : `${stats.averageTime} min`;
    if (!paperAttempts.length) {
      els.paperAttemptRows.innerHTML = `<tr><td colspan="4">No paper attempts saved yet.</td></tr>`;
      return;
    }
    els.paperAttemptRows.innerHTML = paperAttempts.slice(0, 8).map((attempt) => {
      const percent = scorePercent(attempt.rawScore, 100);
      return `<tr>
        <td>
          <strong>${escapeHtml(paperLabel(attempt))}</strong>
          <span>${escapeHtml(attempt.date || "")}${attempt.wrongQuestions ? ` | wrong: ${escapeHtml(attempt.wrongQuestions)}` : ""}</span>
        </td>
        <td>${percent}%</td>
        <td>${Number(attempt.timeMinutes || 0) ? `${Number(attempt.timeMinutes)} min` : "-"}</td>
        <td><button type="button" class="table-delete" data-delete-paper="${escapeHtml(attempt.id)}">Delete</button></td>
      </tr>`;
    }).join("");
  }

  function renderAllPapers() {
    const status = els.paperStatusFilter.value;
    const search = els.paperSearch.value.trim().toLowerCase();
    const attemptsByPaper = new Map();
    paperAttempts.forEach((attempt) => {
      const key = paperKey(attempt);
      const row = attemptsByPaper.get(key) || { attempts: 0, best: null };
      const percent = scorePercent(attempt.rawScore, 100);
      row.attempts += 1;
      row.best = percent === null ? row.best : Math.max(row.best | 0, percent);
      attemptsByPaper.set(key, row);
    });
    const rows = allPaperOptions().filter((paper) => {
      const saved = attemptsByPaper.has(paperKey(paper));
      if (status === "done" && !saved) return false;
      if (status === "not-done" && saved) return false;
      if (search && !paperLabel(paper).toLowerCase().includes(search)) return false;
      return true;
    });
    if (!rows.length) {
      els.allPapersRows.innerHTML = `<tr><td colspan="4">No papers match these filters.</td></tr>`;
      return;
    }
    els.allPapersRows.innerHTML = rows.map((paper) => {
      const saved = attemptsByPaper.get(paperKey(paper));
      return `<tr>
        <td><strong>${escapeHtml(paperLabel(paper))}</strong></td>
        <td>${saved?.attempts || 0}</td>
        <td>${saved?.best === undefined || saved?.best === null ? "-" : `${saved.best}%`}</td>
        <td><span class="status-pill ${saved ? "done" : "not-done"}">${saved ? "Done" : "Not done"}</span></td>
      </tr>`;
    }).join("");
  }

  function renderTaskControls() {
    const rows = topicRows();
    const units = uniqueSorted(rows.map((row) => row.unit));
    const currentUnit = els.taskUnit.value || units[0] || "";
    els.taskUnit.innerHTML = units.map((unit) => `<option${unit === currentUnit ? " selected" : ""}>${escapeHtml(unit)}</option>`).join("");
    renderTaskTopics();
  }

  function renderTaskTopics() {
    const rows = topicRows();
    const unit = els.taskUnit.value;
    const topics = uniqueSorted(rows.filter((row) => !unit || row.unit === unit).map((row) => row.topic));
    const current = els.taskTopic.value;
    els.taskTopic.innerHTML = topics.map((topic) => `<option${topic === current ? " selected" : ""}>${escapeHtml(topic)}</option>`).join("");
    if (!els.taskDueDate.value) els.taskDueDate.value = todayKey();
  }

  function saveStudyTask(event) {
    event.preventDefault();
    const title = els.taskTitle.value.trim();
    if (!title) {
      els.saveStatus.textContent = "Add a title before saving the assignment or quiz.";
      return;
    }
    studyTasks.unshift({
      id: uid("task"),
      kind: els.taskKind.value,
      unit: els.taskUnit.value,
      topic: els.taskTopic.value,
      title,
      difficulty: els.taskDifficulty.value,
      dueDate: els.taskDueDate.value,
      rawScore: els.taskRawScore.value === "" ? "" : Number(els.taskRawScore.value),
      maxScore: els.taskMaxScore.value === "" ? "" : Number(els.taskMaxScore.value),
      status: els.taskStatus.value,
      createdAt: new Date().toISOString()
    });
    writeJSON(STUDY_TASKS_KEY, studyTasks);
    if (window.EliteCloud?.queueSync) window.EliteCloud.queueSync();
    els.taskTitle.value = "";
    els.taskRawScore.value = "";
    els.taskMaxScore.value = "";
    els.saveStatus.textContent = "Assignment or quiz saved.";
    render();
  }

  function deleteStudyTask(id) {
    studyTasks = studyTasks.filter((task) => task.id !== id);
    writeJSON(STUDY_TASKS_KEY, studyTasks);
    if (window.EliteCloud?.queueSync) window.EliteCloud.queueSync();
    render();
  }

  function renderStudyTasks() {
    const stats = taskStats();
    els.loggedTaskCount.textContent = stats.count;
    els.taskAverage.textContent = stats.average === null ? "-" : `${stats.average}%`;
    els.tasksDueWeek.textContent = stats.dueWeek;
    if (!studyTasks.length) {
      els.studyTaskRows.innerHTML = `<tr><td colspan="5">No assignments or quizzes saved yet.</td></tr>`;
      return;
    }
    const sorted = [...studyTasks].sort((a, b) => {
      const aDays = daysUntil(a.dueDate);
      const bDays = daysUntil(b.dueDate);
      return (aDays | 9999) - (bDays | 9999);
    });
    els.studyTaskRows.innerHTML = sorted.slice(0, 10).map((task) => {
      const percent = taskScore(task);
      const days = daysUntil(task.dueDate);
      const status = normalizedStatus(task.status);
      const overdue = status === "pending" && days !== null && days < 0;
      const dueText = days === null ? "-" : days < 0 ? `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} late` : days === 0 ? "Today" : `${days} day${days === 1 ? "" : "s"}`;
      return `<tr>
        <td>
          <strong>${escapeHtml(task.title)}</strong>
          <span>${escapeHtml(task.kind)} | ${escapeHtml(task.difficulty)}${percent === null ? "" : ` | ${percent}%`}</span>
        </td>
        <td>${escapeHtml(task.topic || "-")}</td>
        <td>${escapeHtml(dueText)}</td>
        <td><span class="status-pill ${overdue ? "overdue" : status}">${escapeHtml(overdue ? "Overdue" : task.status)}</span></td>
        <td><button type="button" class="table-delete" data-delete-task="${escapeHtml(task.id)}">Delete</button></td>
      </tr>`;
    }).join("");
  }

  function saveProfile(event) {
    event.preventDefault();
    profile = {
      name: els.studentName.value.trim(),
      targetGrade: els.targetGrade.value,
      examSession: els.examSession.value.trim(),
      weeklyTarget: Number(els.weeklyTarget.value || 30),
      updatedAt: new Date().toISOString()
    };
    writeJSON(PROFILE_KEY, profile);
    if (window.EliteCloud?.queueSync) window.EliteCloud.queueSync();
    els.saveStatus.textContent = "Saved. Your progress sheet is ready.";
    setTimeout(() => {
      els.saveStatus.textContent = "Progress saves automatically in this browser.";
    }, 2200);
    render();
  }

  function progressPayload() {
    return {
      exportedAt: new Date().toISOString(),
      version: 2,
      profile,
      solved: [...solved],
      selected: [...selected],
      reviewItems,
      readiness,
      activity: readActivity(),
      paperAttempts,
      studyTasks,
      assignmentsV2: readJSON(ASSIGNMENTS_KEY, []),
      quizzesV2: readJSON(QUIZZES_KEY, []),
      mockHistory,
      activeMock: readJSON(EXAM_KEY, {}),
      studyPlan: readJSON(PLAN_KEY, {}),
      leadInfo: readJSON(LEAD_KEY, {})
    };
  }

  function exportProgress() {
    const safeName = (profile.name || "student").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "student";
    const blob = new Blob([JSON.stringify(progressPayload(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `elite-igcse-progress-${safeName}-${todayKey()}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function importProgress(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result || "{}"));
        if (data.profile) writeJSON(PROFILE_KEY, data.profile);
        if (Array.isArray(data.solved)) writeJSON(SOLVED_KEY, data.solved);
        if (Array.isArray(data.selected)) writeJSON(SELECTED_KEY, data.selected);
        if (data.reviewItems) writeJSON(REVIEW_KEY, data.reviewItems);
        if (data.readiness) writeJSON(READINESS_KEY, data.readiness);
        if (data.activity) writeJSON(ACTIVITY_KEY, data.activity);
        if (Array.isArray(data.paperAttempts)) writeJSON(PAPER_ATTEMPTS_KEY, data.paperAttempts);
        if (Array.isArray(data.studyTasks)) writeJSON(STUDY_TASKS_KEY, data.studyTasks);
        if (Array.isArray(data.assignmentsV2)) writeJSON(ASSIGNMENTS_KEY, data.assignmentsV2);
        if (Array.isArray(data.quizzesV2)) writeJSON(QUIZZES_KEY, data.quizzesV2);
        if (Array.isArray(data.mockHistory)) writeJSON(MOCK_HISTORY_KEY, data.mockHistory);
        if (data.activeMock) writeJSON(EXAM_KEY, data.activeMock);
        if (data.studyPlan) writeJSON(PLAN_KEY, data.studyPlan);
        if (data.leadInfo) writeJSON(LEAD_KEY, data.leadInfo);
        els.saveStatus.textContent = "Progress imported. Reloading the sheet.";
        setTimeout(() => window.location.reload(), 600);
      } catch (err) {
        els.saveStatus.textContent = "This file could not be imported.";
      }
    };
    reader.readAsText(file);
  }

  function updateSendLink() {
    const all = bankQuestions("all");
    const expertise = bankQuestions("expertise");
    const allSolved = all.filter(isSolved).length;
    const expertiseSolved = expertise.filter(isSolved).length;
    const weak = priorityRowsData()[0];
    const papers = paperStats();
    const tasks = taskStats();
    const message = [
      "Hello Dr Eslam, this is my website progress summary.",
      profile.name ? `Name: ${profile.name}` : "",
      profile.targetGrade ? `Target grade: ${profile.targetGrade}` : "",
      profile.examSession ? `Exam session: ${profile.examSession}` : "",
      `${coursePack.label} classified solved: ${allSolved}/${all.length}`,
      `${coursePack.expertiseLabel || "Q20+"} solved: ${expertiseSolved}/${expertise.length}`,
      `Past paper average: ${papers.average || 0}%`,
      `Assignments/quizzes logged: ${tasks.count}`,
      weak ? `Top revision priority: ${weak.topic} (${weak.verdict})` : "",
      "Can you tell me what to focus on next?"
    ].filter(Boolean).join("\n");
    els.sendBtn.href = `https://wa.me/201120009622?text=${encodeURIComponent(message)}`;
  }

  function render() {
    renderSummary();
    renderNextMoves();
    renderPriorityRows();
    renderRows();
    renderPaperDashboard();
    renderAllPapers();
    renderStudyTasks();
    updateSendLink();
  }

  recordVisit();
  applyCourseCopy();
  loadProfileForm();
  renderUnitFilter();
  applyUrlDefaults();
  renderPaperControls();
  renderTaskControls();
  render();

  els.form.addEventListener("submit", saveProfile);
  els.unitFilter.addEventListener("change", renderRows);
  els.statusFilter.addEventListener("change", renderRows);
  els.search.addEventListener("input", renderRows);
  els.rows.addEventListener("change", (event) => {
    const checkbox = event.target.closest("[data-topic-select]");
    if (!checkbox) return;
    if (checkbox.checked) selectedTopics.add(checkbox.dataset.topicSelect);
    else selectedTopics.delete(checkbox.dataset.topicSelect);
    updateTopicSelectionSummary();
  });
  els.selectVisibleTopicsBtn?.addEventListener("click", () => {
    visibleTopicRows.forEach((row) => selectedTopics.add(topicKey(row)));
    renderRows();
  });
  els.clearVisibleTopicsBtn?.addEventListener("click", () => {
    visibleTopicRows.forEach((row) => selectedTopics.delete(topicKey(row)));
    renderRows();
  });
  els.printVisibleTopicsBtn?.addEventListener("click", () => printTopicRows(visibleTopicRows, els.printVisibleTopicsBtn));
  els.printSelectedTopicsBtn?.addEventListener("click", () => printTopicRows(selectedTopicRows(), els.printSelectedTopicsBtn));
  els.paperAttemptForm.addEventListener("submit", savePaperAttempt);
  els.paperStatusFilter.addEventListener("change", renderAllPapers);
  els.paperSearch.addEventListener("input", renderAllPapers);
  els.paperAttemptRows.addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-paper]");
    if (button) deletePaperAttempt(button.dataset.deletePaper);
  });
  els.taskUnit.addEventListener("change", renderTaskTopics);
  els.studyTaskForm.addEventListener("submit", saveStudyTask);
  els.studyTaskRows.addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-task]");
    if (button) deleteStudyTask(button.dataset.deleteTask);
  });
  els.exportBtn.addEventListener("click", exportProgress);
  els.importInput.addEventListener("change", () => importProgress(els.importInput.files?.[0]));
})();
