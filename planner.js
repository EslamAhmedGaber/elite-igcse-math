(function () {
  const coursePack = window.EliteProgressCoursePack || {};
  const questions = coursePack.questions || window.QUESTION_DATA || [];
  let solvedIds = [];
  try {
    const rawSolved = JSON.parse(localStorage.getItem(coursePack.solvedKey || "solvedExpertiseQuestions") || "[]");
    solvedIds = Array.isArray(rawSolved) ? rawSolved : [];
  } catch (err) {
    solvedIds = [];
  }
  const solved = new Set(solvedIds);
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(coursePack.planKey || "eliteStudyPlanSettings") || "{}") || {};
  } catch (err) {
    saved = {};
  }
  const pathway = coursePack.pathway || window.ELITE_PATHWAY?.mode || "linear";

  const els = {
    form: document.getElementById("plannerForm"),
    examDate: document.getElementById("examDate"),
    targetGrade: document.getElementById("plannerTargetGrade") || document.getElementById("targetGrade"),
    weeklyHours: document.getElementById("weeklyHours"),
    focusUnit: document.getElementById("focusUnit"),
    planLength: document.getElementById("planLength"),
    confidence: document.getElementById("confidence"),
    build: document.getElementById("buildPlanBtn"),
    print: document.getElementById("printPlanBtn"),
    reset: document.getElementById("resetPlanBtn"),
    summary: document.getElementById("planSummary"),
    weeks: document.getElementById("planWeeks")
  };

  if (!els.form || !els.examDate || !els.targetGrade || !els.weeklyHours || !els.focusUnit || !els.planLength || !els.confidence || !els.build || !els.print || !els.reset || !els.summary || !els.weeks) {
    return;
  }

  const unitOrder = pathway === "modular"
    ? ["Unit 1", "Unit 2"]
    : pathway === "pure"
      ? ["Pure 1"]
    : [
      "Chapter 1: Numbers & the Number System",
      "Chapter 2: Equations, Formulae & Identities",
      "Chapter 3: Sequences, Functions & Graphs",
      "Chapter 4: Geometry & Trigonometry",
      "Chapter 5: Vectors & Transformation Geometry",
      "Chapter 6: Statistics & Probability"
    ];

  function uniqueSorted(items) {
    return [...new Set(items.filter(Boolean))].sort((a, b) => a.localeCompare(b));
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

  function addDays(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  function isoDate(date) {
    return date.toISOString().slice(0, 10);
  }

  function formatDate(date) {
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  function weeksUntil(dateValue) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exam = dateValue ? new Date(dateValue) : addDays(today, 56);
    exam.setHours(0, 0, 0, 0);
    const days = Math.max(7, Math.ceil((exam - today) / 86400000));
    return Math.max(2, Math.min(12, Math.ceil(days / 7)));
  }

  function unitStats() {
    const map = new Map();
    questions.forEach((question) => {
      const unit = question.unit || "Other";
      const topic = question.topic || "Mixed";
      const topicSlug = question.topic_slug || question.topicSlug || topic;
      const isExpertise = question.bank === "expertise" || (typeof coursePack.expertiseFilter === "function" && coursePack.expertiseFilter(question));
      const row = map.get(unit) || { unit, total: 0, expertise: 0, solved: 0, topics: new Map() };
      row.total += 1;
      if (isExpertise) row.expertise += 1;
      if (solved.has(question.id)) row.solved += 1;
      const topicRow = row.topics.get(topicSlug) || { topic, topicSlug, total: 0, expertise: 0, solved: 0 };
      topicRow.total += 1;
      if (isExpertise) topicRow.expertise += 1;
      if (solved.has(question.id)) topicRow.solved += 1;
      row.topics.set(topicSlug, topicRow);
      map.set(unit, row);
    });
    return [...map.values()].sort((a, b) => unitOrder.indexOf(a.unit) - unitOrder.indexOf(b.unit));
  }

  function populateUnits() {
    els.focusUnit.innerHTML = `<option value="">Let the plan balance everything</option>`;
    unitStats().forEach((row) => {
      const option = document.createElement("option");
      option.value = row.unit;
      option.textContent = row.unit;
      els.focusUnit.appendChild(option);
    });
  }

  function loadSettings() {
    const defaultExam = addDays(new Date(), 56);
    const params = new URLSearchParams(window.location.search);
    const focus = params.get("focus");
    els.examDate.value = saved.examDate || isoDate(defaultExam);
    els.targetGrade.value = saved.targetGrade || "9";
    els.weeklyHours.value = saved.weeklyHours || "5";
    els.focusUnit.value = focus || saved.focusUnit || "";
    els.planLength.value = saved.planLength || "auto";
    els.confidence.value = saved.confidence || "medium";
  }

  function saveSettings() {
    const settings = currentSettings();
    localStorage.setItem(coursePack.planKey || "eliteStudyPlanSettings", JSON.stringify(settings));
    if (window.EliteCloud?.queueSync) window.EliteCloud.queueSync();
  }

  function currentSettings() {
    return {
      examDate: els.examDate.value,
      targetGrade: els.targetGrade.value,
      weeklyHours: els.weeklyHours.value,
      focusUnit: els.focusUnit.value,
      planLength: els.planLength.value,
      confidence: els.confidence.value
    };
  }

  function topicPool(settings) {
    const rows = unitStats();
    const focus = settings.focusUnit;
    const focusRows = focus ? rows.filter((row) => row.unit === focus) : [];
    const otherRows = rows.filter((row) => row.unit !== focus);
    const ordered = [...focusRows, ...otherRows];
    return ordered.flatMap((unit) => {
      const topics = [...unit.topics.values()].sort((a, b) => {
        const pa = a.solved / Math.max(1, a.total);
        const pb = b.solved / Math.max(1, b.total);
        return pa - pb || b.expertise - a.expertise || b.total - a.total;
      });
      return topics.map((topic) => ({ ...topic, unit: unit.unit }));
    });
  }

  function topicLink(topic, unit, bank = "all", mode = "") {
    if (typeof coursePack.practiceLink === "function") {
      const match = topicPool(currentSettings()).find((row) => row.topic === topic && row.unit === unit);
      return coursePack.practiceLink(match || { topic, unit }, bank);
    }
    const params = new URLSearchParams();
    params.set("unit", unit);
    params.set("topic", topic);
    params.set("bank", bank);
    if (mode) params.set("mode", mode);
    return `practice.html?${params.toString()}`;
  }

  function buildPlan() {
    const settings = currentSettings();
    saveSettings();
    const autoWeeks = weeksUntil(settings.examDate);
    const weekCount = settings.planLength === "auto" ? autoWeeks : Number(settings.planLength);
    const hours = Number(settings.weeklyHours);
    const target = Number(settings.targetGrade);
    const confidenceBoost = settings.confidence === "high" ? 1 : settings.confidence === "low" ? -1 : 0;
    const tasksPerWeek = Math.max(3, Math.min(6, Math.round(hours / 2) + 2 + confidenceBoost));
    const topics = topicPool(settings);
    const start = new Date();
    const exam = new Date(settings.examDate);
    const totalSolved = [...solved].filter((id) => questions.some((question) => question.id === id)).length;

    if (!topics.length) {
      els.summary.innerHTML = `<strong>Plan needs question data.</strong><p>Reload the page once the question bank has finished loading.</p>`;
      els.weeks.innerHTML = "";
      return;
    }

    const weeks = Array.from({ length: weekCount }, (_, index) => {
      const weekTopics = Array.from({ length: tasksPerWeek }, (_, offset) => topics[(index * tasksPerWeek + offset) % topics.length]).filter(Boolean);
      const isLate = index >= Math.max(1, weekCount - 2);
      return {
        number: index + 1,
        date: addDays(start, index * 7),
        title: isLate ? "Exam-style sprint" : index === 0 ? "Build momentum" : "Close weak gaps",
        topics: weekTopics,
        includeExpertise: target >= 8 || isLate
      };
    });

    els.summary.innerHTML = `<strong>${weekCount}-week plan built for Grade ${settings.targetGrade}.</strong>
      <p>Exam date: <b>${formatDate(exam)}</b>. Weekly time: <b>${hours} hours</b>. ${settings.focusUnit ? `First focus: <b>${escapeHtml(settings.focusUnit)}</b>.` : "Balanced across the full syllabus."} You already marked <b>${totalSolved}</b> questions solved in this browser.</p>`;

    els.weeks.innerHTML = weeks.map(renderWeek).join("");
  }

  function renderWeek(week) {
    const expertiseLabel = coursePack.expertiseLabel || "Q20+";
    const expertiseTask = week.includeExpertise
      ? `<li><span>Hard question training</span><a href="${topicLink(week.topics[0]?.topic || "", week.topics[0]?.unit || "", "expertise")}">Train ${escapeHtml(expertiseLabel)}</a></li>`
      : `<li><span>Confidence set</span><a href="practice.html?mode=unsolved">Continue unsolved</a></li>`;

    return `<article class="plan-week">
      <header>
        <span>Week ${week.number} - ${formatDate(week.date)}</span>
        <strong>${escapeHtml(week.title)}</strong>
      </header>
      <ul>
        ${week.topics.map((topic) => {
          return `<li>
            <span>Practise topic: ${escapeHtml(topic.topic)}</span>
            <a href="${topicLink(topic.topic, topic.unit)}">Open practice</a>
          </li>`;
        }).join("")}
        ${expertiseTask}
        <li><span>After solving, mark solved and review the next step.</span><a href="practice.html">Open bank</a></li>
      </ul>
    </article>`;
  }

  function resetPlan() {
    localStorage.removeItem(coursePack.planKey || "eliteStudyPlanSettings");
    els.weeks.innerHTML = "";
    els.summary.innerHTML = `<strong>Your plan is ready to build.</strong><p>Choose your settings, then build a weekly route. You can print it or keep it saved in this browser.</p>`;
    loadSettings();
  }

  function printPlan() {
    if (!els.weeks.children.length) buildPlan();
    document.body.classList.add("printing-study-plan");
    window.addEventListener("afterprint", () => document.body.classList.remove("printing-study-plan"), { once: true });
    window.print();
  }

  populateUnits();
  loadSettings();
  buildPlan();
  els.build.addEventListener("click", buildPlan);
  els.print.addEventListener("click", printPlan);
  els.reset.addEventListener("click", resetPlan);
})();
