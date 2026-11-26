/* ==========================================================================
   assignment-generator.js - "Generate assignment" for the Teacher Lesson
   Tracker (ASSIGNMENT_PLAN.md, final binding spec §5).

   From a student's ticked (completed) topics in one enrolment, build a
   printable mock assignment from the site's own question bank:
   student copy (questions only) + teacher copy (worked solutions).
   Selection is purely random from the completed topics; the saved
   history record (kept in the course doc's `assignments` map) exists
   for re-open/re-print only and never excludes questions.

   Two layers:
   - window.EliteAssignmentCore: pure, headless-testable. Pool indexing,
     selection (a faithful port of exam.js's batch-6-fixed selectBalanced
     contract: topic x level cells, natural level quotas, fitsTarget
     marks predicate, exam ordering), records.
   - window.EliteAssignments: browser layer. Two-pass bank loading
     (ASSIGNMENT_PLAN audit F2/F3), settings modal, paper preview and
     print. Mounted by teacher-tracker-ui.js inside the post-gate app;
     saving goes through EliteLessonTracker.api.saveAssignment, which
     asserts the teacher account like every other mutation.

   Course membership is the site's own definition (batch-13 topic
   pages): bank "all" only; Linear = canonical topic in the Linear
   catalog; Modular U = the question's modular_unit; IAL = the
   question's primaryTopicName in that course's own data file.
   ========================================================================== */
(function (root) {
  "use strict";

  /* ------------------------------------------------------------ pure core */

  const LEVELS = ["easy", "medium", "hard"];
  const LEVEL_RANK = { easy: 0, medium: 1, hard: 2 };
  /* exam.js levelBands(): IGCSE easy <=2 / medium <=4; Pure (IAL) 6 / 8. */
  const BANDS = { igcse: { easy: 2, medium: 4 }, ial: { easy: 6, medium: 8 } };
  const MINUTES_PER_MARK = 1.5; // owner's spec for assignments
  const MAX_COUNT = 40;

  /* Print layouts - a faithful port of paper-print.js's LAYOUTS table
     (the site's exam paper engine): same keys, same labels, same
     millimetre semantics. ElitePaperPrint itself is NOT reused: it is
     a singleton studio overlay whose pagination runs on pixel
     analysis of past-paper crops (it needs per-question OCR text and
     source numbers the tracker bank index does not capture), renders
     into an isolated iframe under its own print discipline, and its
     cover/formulae machinery is exam-paper furniture. The layout
     contract is four small entries, so it is ported exactly instead
     (see CHANGELOG_ASSIGNMENT.md). `fill` (the paginator redistributes
     a page's leftover room into its working spaces) has no equivalent
     in a browser-printed flow document and is carried for parity
     only; the space/gap/newPage semantics are exact. */
  const clampMm = (value, min, max) => Math.min(max, Math.max(min, value));
  const LAYOUTS = {
    standard: { label: "Standard", space: (marks) => clampMm(8 + 6 * marks, 18, 56), fill: true, gap: 5 },
    economy: { label: "Economy (fewer pages)", space: (marks) => clampMm(3 + 3 * marks, 8, 26), fill: true, gap: 3.4 },
    single: { label: "One question per page", space: () => 40, fill: true, gap: 0, newPage: true },
    compact: { label: "Questions only (answer on separate paper)", space: () => 0, fill: false, gap: 3.4 }
  };
  const LAYOUT_KEYS = Object.keys(LAYOUTS);
  /* The mock generator's printer defaults to "standard"; assignments
     default to "single" - the owner's stated usual preference
     (2026-11-26). Deliberate divergence, recorded in the changelog. */
  const DEFAULT_LAYOUT = "single";

  function layoutFor(key) {
    const found = LAYOUTS[key];
    return found ? { key, ...found } : { key: DEFAULT_LAYOUT, ...LAYOUTS[DEFAULT_LAYOUT] };
  }

  function layoutOptions() {
    return LAYOUT_KEYS.map((key) => ({ key, label: LAYOUTS[key].label }));
  }

  /* Working space (mm) a layout gives a question of `marks` marks. */
  function spaceMm(key, marks) {
    return layoutFor(key).space(Number(marks || 0));
  }

  /* The layout a saved record prints with: its own saved layout when
     present and known, else the current default. Records saved by v1
     of this feature have no layout field and land on the default. */
  function recordLayout(record) {
    return layoutFor(record && record.layout).key;
  }

  function questionLevel(marks, bands) {
    const value = Number(marks || 0);
    if (value <= bands.easy) return "easy";
    if (value <= bands.medium) return "medium";
    return "hard";
  }

  /* Deterministic RNG (mulberry32) so selection is testable; the UI
     seeds it from Date.now(). */
  function mulberry32(seed) {
    let a = Number(seed || 0) >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(list, rng) {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  /* Largest-remainder apportionment with per-key caps (water-filling):
     quotas sum to `total` (or to the sum of caps when the pool is
     smaller), no quota exceeds its cap, and when total >= number of
     keys every key gets at least 1 (taken from the largest quota).
     `weights` drive the shares; `caps` default to the weights. Topic
     quotas pass equal weights (even coverage per completed topic -
     ASSIGNMENT_PLAN §1.4) with caps = pool sizes; level quotas pass
     the pool's own level counts as both (natural mix). */
  function apportion(weights, total, caps) {
    const quota = {};
    const keys = Object.keys(weights).filter((key) => weights[key] > 0);
    const capOf = (key) => (caps && caps[key] !== undefined ? caps[key] : weights[key]);
    keys.forEach((key) => { quota[key] = 0; });
    if (!keys.length || total <= 0) return quota;
    let remaining = Math.min(total, keys.reduce((sum, key) => sum + capOf(key), 0));
    let open = [...keys];
    while (remaining > 0 && open.length) {
      const openSum = open.reduce((sum, key) => sum + weights[key], 0);
      const capped = [];
      open.forEach((key) => {
        const raw = (remaining * weights[key]) / openSum;
        if (Math.floor(raw) >= capOf(key) - quota[key]) capped.push(key);
      });
      if (!capped.length) {
        // Largest remainder over the open keys.
        const raw = Object.fromEntries(open.map((key) => [key, (remaining * weights[key]) / openSum]));
        open.forEach((key) => { quota[key] += Math.floor(raw[key]); });
        let left = remaining - open.reduce((sum, key) => sum + Math.floor(raw[key]), 0);
        const byFrac = [...open].sort((a, b) => (raw[b] - Math.floor(raw[b])) - (raw[a] - Math.floor(raw[a])));
        for (let i = 0; left > 0; i = (i + 1) % byFrac.length) {
          if (quota[byFrac[i]] < capOf(byFrac[i])) { quota[byFrac[i]]++; left--; }
          else if (byFrac.every((key) => quota[key] >= capOf(key))) break;
        }
        remaining = 0;
      } else {
        capped.forEach((key) => {
          const add = capOf(key) - quota[key];
          quota[key] = capOf(key);
          remaining -= add;
        });
        open = open.filter((key) => !capped.includes(key));
      }
    }
    if (total >= keys.length) {
      keys.forEach((key) => {
        if (quota[key] === 0) {
          const donor = keys.reduce((a, b) => (quota[a] >= quota[b] ? a : b));
          if (quota[donor] > 1) { quota[donor]--; quota[key] = 1; }
        }
      });
    }
    return quota;
  }

  /* One plain question record shape everywhere:
     { id, topic, marks, paper, qno, image, ep }                    */
  function buildCourseIndex(records) {
    const byTopic = {};
    const byId = {};
    (records || []).forEach((record) => {
      if (!record || !record.id || byId[record.id]) return;
      byId[record.id] = record;
      (byTopic[record.topic] = byTopic[record.topic] || []).push(record);
    });
    return { byTopic, byId };
  }

  /* IGCSE pools from the two normalizer passes (audit F2). Rows are
     plain snapshots: { id, bank, canonical, modularUnit, marks, paper,
     qno, image, paperCode }. linearTopics = Set of Linear catalog
     topic names. Returns { linear, 'modular-1', 'modular-2' } indexes. */
  function indexFromPasses(linearRows, modularRows, linearTopics) {
    const toRecord = (row) => ({
      id: row.id,
      topic: row.canonical,
      marks: Number(row.marks || 0),
      paper: row.paper || "",
      qno: Number(row.qno || 0),
      image: row.image || "",
      ep: row.paperCode === "EP"
    });
    const linear = (linearRows || [])
      .filter((row) => row.bank === "all" && linearTopics.has(row.canonical))
      .map(toRecord);
    const modular = { "Unit 1": [], "Unit 2": [] };
    (modularRows || []).forEach((row) => {
      if (row.bank !== "all") return;
      const bucket = modular[row.modularUnit];
      if (bucket) bucket.push(toRecord(row));
    });
    return {
      linear: buildCourseIndex(linear),
      "modular-1": buildCourseIndex(modular["Unit 1"]),
      "modular-2": buildCourseIndex(modular["Unit 2"])
    };
  }

  /* IAL pools: the course data file's own questions, primary topic
     only (the site's settled IAL counts are primary-topic sums). */
  function ialIndex(questions) {
    const records = (questions || []).map((q) => ({
      id: q.id,
      topic: q.primaryTopicName || q.topicName || "",
      marks: Number(q.marks || 0),
      paper: q.paper || "",
      qno: Number(q.qNo || 0),
      image: q.image || "",
      ep: false
    }));
    const index = buildCourseIndex(records);
    index.solutions = {};
    (questions || []).forEach((q) => {
      index.solutions[q.id] = { steps: Array.isArray(q.steps) ? q.steps : [], finalAnswer: q.finalAnswer || "" };
    });
    return index;
  }

  function defaultCount(completedTopics) {
    const n = Math.max(0, Number(completedTopics || 0));
    if (!n) return 0;
    return Math.min(30, Math.max(4, 2 * n));
  }

  function estimateMinutes(totalMarks) {
    return Math.round(Number(totalMarks || 0) * MINUTES_PER_MARK);
  }

  /* Greedy topic x level picker - the batch-6 selectBalanced contract:
     quotas guide via score; when a marks target is set, only questions
     that FIT the remaining marks are eligible, so the total can never
     overshoot. `state.total` carries the running marks across phases. */
  function greedyPick(poolByTopic, topicQuota, levelQuota, want, targetMarks, state, bands, rng) {
    const topics = Object.keys(poolByTopic);
    const groups = {};
    topics.forEach((topic) => {
      groups[topic] = { easy: [], medium: [], hard: [] };
      shuffle(poolByTopic[topic], rng).forEach((q) => groups[topic][questionLevel(q.marks, bands)].push(q));
    });
    const pickedTopic = Object.fromEntries(topics.map((topic) => [topic, 0]));
    const pickedLevel = { easy: 0, medium: 0, hard: 0 };
    const tieBreak = Object.fromEntries(topics.map((topic) => [topic, rng()]));
    const picked = [];
    while (picked.length < want) {
      if (targetMarks && picked.length && state.total >= targetMarks) break;
      const remaining = targetMarks ? targetMarks - state.total : Infinity;
      const fits = (q) => !targetMarks || Number(q.marks || 0) <= remaining;
      let best = null;
      topics.forEach((topic) => {
        LEVELS.forEach((level) => {
          const cell = groups[topic][level];
          if (!cell.some(fits)) return;
          const topicNeed = (topicQuota[topic] || 0) - pickedTopic[topic];
          const levelNeed = (levelQuota[level] || 0) - pickedLevel[level];
          const score = topicNeed * 100 + levelNeed * 10 + tieBreak[topic];
          if (!best || score > best.score) best = { topic, level, score };
        });
      });
      if (!best) break;
      const cell = groups[best.topic][best.level];
      const question = targetMarks ? cell.splice(cell.findIndex(fits), 1)[0] : cell.shift();
      picked.push(question);
      state.total += Number(question.marks || 0);
      pickedTopic[best.topic] += 1;
      pickedLevel[best.level] += 1;
      tieBreak[best.topic] = rng();
    }
    return picked;
  }

  /* Exam order (exam.js orderPaper): easier first, then by original
     question number, with a jitter tie-break. */
  function examOrder(questions, bands, rng) {
    const jitter = new Map(questions.map((q) => [q.id, rng()]));
    return [...questions].sort((a, b) =>
      LEVEL_RANK[questionLevel(a.marks, bands)] - LEVEL_RANK[questionLevel(b.marks, bands)] ||
      Number(a.qno || 0) - Number(b.qno || 0) ||
      jitter.get(a.id) - jitter.get(b.id)
    );
  }

  /* The selection itself. byTopic: { topic: [records] } for ONE course.
     topics: the student's completed topic names for that course.
     Selection is purely random from those topics (owner's design:
     repetition ACROSS assignments is fine - assignments are random by
     nature, and the history record is kept for re-open/re-print only,
     never to exclude questions). Within ONE assignment a question
     never repeats: the greedy picker splices each picked question out
     of its cell. Topic quotas are EVEN across the completed topics
     (each taught topic gets equal practice weight), capped by pool
     size with the leftover redistributed; level quotas follow the
     pool's natural mix. Returns { picked, totalMarks, warnings,
     perTopic }. */
  function selectAssignment({ byTopic, topics, count, targetMarks = 0, includeEP = true, bands = BANDS.igcse, rng = Math.random }) {
    const wanted = Math.max(0, Math.min(MAX_COUNT, Math.floor(Number(count || 0))));
    const target = Math.max(0, Math.floor(Number(targetMarks || 0)));
    const warnings = [];
    const pool = {};
    (topics || []).forEach((topic) => {
      const all = (byTopic && byTopic[topic]) || [];
      const eligible = includeEP ? all : all.filter((q) => !q.ep);
      if (!all.length) {
        warnings.push({ type: "empty-topic", topic, message: `No bank questions for "${topic}" yet - it contributes nothing this time.` });
        return;
      }
      if (!eligible.length) {
        warnings.push({ type: "ep-only-topic", topic, message: `"${topic}" only has Elite Practice questions, which are switched off.` });
        return;
      }
      pool[topic] = eligible;
    });

    const present = Object.keys(pool);
    const poolSizes = Object.fromEntries(present.map((topic) => [topic, pool[topic].length]));
    const poolTotal = present.reduce((sum, topic) => sum + pool[topic].length, 0);

    // Even topic quotas: equal weight per completed topic, capped by
    // that topic's pool; topics that cannot reach their share are
    // flagged so the teacher is never surprised by a lopsided paper.
    const evenWeights = Object.fromEntries(present.map((topic) => [topic, 1]));
    const topicQuota = present.length ? apportion(evenWeights, wanted, poolSizes) : {};
    present.forEach((topic) => {
      const fairShare = present.length ? Math.floor(wanted / present.length) : 0;
      if (fairShare >= 2 && pool[topic].length < fairShare) {
        warnings.push({ type: "tiny-pool", topic, message: `Only ${pool[topic].length} bank question${pool[topic].length === 1 ? "" : "s"} for "${topic}" - fewer than an even share, so it contributes all of them.` });
      }
    });

    const levelSizes = { easy: 0, medium: 0, hard: 0 };
    Object.values(pool).forEach((list) => list.forEach((q) => { levelSizes[questionLevel(q.marks, bands)]++; }));
    const levelQuota = apportion(levelSizes, Math.min(wanted, poolTotal));

    const state = { total: 0 };
    const picked = wanted && poolTotal
      ? greedyPick(pool, topicQuota, levelQuota, wanted, target, state, bands, rng)
      : [];

    if (wanted && picked.length < wanted) {
      warnings.push({ type: "shortfall", message: `Only ${picked.length} of the ${wanted} requested questions could be picked from the completed topics (the topics hold ${poolTotal} questions in total).` });
    }
    if (target && picked.length && state.total < target) {
      warnings.push({ type: "marks-shortfall", message: `The paper totals ${state.total} of the ${target}-mark target - no more questions fit without going over.` });
    }

    const perTopic = {};
    picked.forEach((q) => { perTopic[q.topic] = (perTopic[q.topic] || 0) + 1; });
    return {
      picked: examOrder(picked, bands, rng),
      totalMarks: state.total,
      warnings,
      perTopic
    };
  }

  function makeRecord({ topics, picked, count, targetMarks, includeEP, layout, now, date }) {
    const totalMarks = (picked || []).reduce((sum, q) => sum + Number(q.marks || 0), 0);
    return {
      id: `asg-${Number(now || Date.now()).toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Number(now || Date.now()),
      date: date || "",
      topics: [...(topics || [])],
      questionIds: (picked || []).map((q) => q.id),
      count: Number(count || (picked || []).length),
      targetMarks: Number(targetMarks || 0),
      totalMarks,
      estMinutes: estimateMinutes(totalMarks),
      includeEP: Boolean(includeEP),
      layout: layoutFor(layout).key
    };
  }

  const Core = {
    LEVELS, BANDS, MINUTES_PER_MARK, MAX_COUNT,
    LAYOUTS, LAYOUT_KEYS, DEFAULT_LAYOUT, layoutFor, layoutOptions,
    spaceMm, recordLayout,
    questionLevel, mulberry32, shuffle, apportion, buildCourseIndex,
    indexFromPasses, ialIndex, defaultCount, estimateMinutes,
    selectAssignment, makeRecord
  };
  root.EliteAssignmentCore = Core;

  /* ------------------------------------------------------- browser layer */
  /* Everything below needs the DOM / network; headless tests use Core. */
  if (!root.document || !root.EliteRuntime) return;

  const ACore = (root.EliteLessonTracker && root.EliteLessonTracker.core) || null;
  const COURSE_META = {
    linear: { label: "IGCSE Linear 4MA1", family: "igcse" },
    "modular-1": { label: "IGCSE Modular Unit 1", family: "igcse" },
    "modular-2": { label: "IGCSE Modular Unit 2", family: "igcse" },
    wma11: { label: "IAL Pure 1 WMA11", family: "ial", global: "WMA11_QUESTIONS", script: "ial/wma11/wma11-data.js?v=20261020fig" },
    wma12: { label: "IAL Pure 2 WMA12", family: "ial", global: "WMA12_QUESTIONS", script: "ial/wma12/wma12-data.js?v=20261020fig" },
    wma13: { label: "IAL Pure 3 WMA13", family: "ial", global: "WMA13_QUESTIONS", script: "ial/wma13/wma13-data.js?v=wma13-20261020" },
    wme01: { label: "IAL Mechanics 1 WME01", family: "ial", global: "WME01_QUESTIONS", script: "ial/wme01/wme01-data.js?v=20261020fig" }
  };

  const bankCache = new Map();   // courseId -> index (buildCourseIndex + solutions?)
  let igcseIndexes = null;       // { linear, modular-1, modular-2 }
  let solutionsCache = null;     // window.SOLUTION_DATA (IGCSE)
  let answersCache = null;       // window.ELITE_ANSWER_INDEX (fallback)
  const contexts = new Map();    // "studentId|courseId" -> section ctx
  let modalState = null;         // { ctx, index, availability }
  let previewState = null;       // { ctx, record, variant }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  function loadScript(src, id) {
    return root.EliteRuntime.loadScript(src, { id });
  }

  function snapshotRows() {
    return (root.QUESTION_DATA || []).map((q) => ({
      id: q.id,
      bank: q.bank,
      canonical: q.canonical_topic || q.topic,
      modularUnit: q.modular_unit || "",
      marks: q.marks,
      paper: q.paper,
      qno: q.question,
      image: q.image,
      paperCode: q.paper_code
    }));
  }

  /* Two-pass bank load (plan audit F2/F3/G1): the normalizer filters
     and stamps by the ACTIVE pathway, so Linear and Modular pools must
     be captured in separate passes over fresh data, with unique script
     ids (loadScript dedupes by id) and the page globals restored
     afterwards. Whole-or-nothing: any failure rejects, nothing partial
     is cached. */
  async function loadIgcseIndexes() {
    if (igcseIndexes) return igcseIndexes;
    const saved = {
      QUESTION_DATA: root.QUESTION_DATA,
      SITE_META: root.SITE_META,
      TOPIC_CATALOG: root.TOPIC_CATALOG,
      TOPIC_ORDER_MAP: root.TOPIC_ORDER_MAP,
      TOPIC_UNIT_MAP: root.TOPIC_UNIT_MAP,
      ELITE_PATHWAY: root.ELITE_PATHWAY
    };
    try {
      delete root.ELITE_PATHWAY;
      await loadScript("questions-data.js?v=asg-q1", "asg-qdata-1");
      await loadScript("topic-normalizer.js?v=asg-n1", "asg-norm-1");
      const linearRows = snapshotRows();
      root.ELITE_PATHWAY = { mode: "modular", label: () => "Unit" };
      await loadScript("questions-data.js?v=asg-q2", "asg-qdata-2");
      await loadScript("topic-normalizer.js?v=asg-n2", "asg-norm-2");
      const modularRows = snapshotRows();
      const linearTopics = new Set((root.LINEAR_TOPIC_CATALOG || []).map((entry) => entry.topic));
      const indexes = Core.indexFromPasses(linearRows, modularRows, linearTopics);
      const u1 = Object.values(indexes["modular-1"].byTopic).reduce((n, list) => n + list.length, 0);
      const u2 = Object.values(indexes["modular-2"].byTopic).reduce((n, list) => n + list.length, 0);
      if (!u1 || !u2) throw new Error("The question bank loaded without its Modular questions.");
      igcseIndexes = indexes;
      return indexes;
    } finally {
      Object.entries(saved).forEach(([key, value]) => {
        if (value === undefined) delete root[key];
        else root[key] = value;
      });
    }
  }

  async function loadBank(courseId) {
    if (bankCache.has(courseId)) return bankCache.get(courseId);
    const meta = COURSE_META[courseId];
    if (!meta) throw new Error("Unknown course.");
    let index;
    if (meta.family === "igcse") {
      index = (await loadIgcseIndexes())[courseId];
    } else {
      if (!Array.isArray(root[meta.global])) {
        await loadScript(meta.script, `asg-ial-${courseId}`);
      }
      index = Core.ialIndex(root[meta.global] || []);
    }
    if (!index) throw new Error("The question bank could not be loaded for this course.");
    bankCache.set(courseId, index);
    return index;
  }

  async function loadSolutions() {
    if (solutionsCache) return solutionsCache;
    if (root.SOLUTION_DATA) { solutionsCache = root.SOLUTION_DATA; return solutionsCache; }
    await loadScript("solutions-data.js?v=asg-s1", "asg-solutions");
    solutionsCache = root.SOLUTION_DATA || {};
    return solutionsCache;
  }

  async function loadAnswers() {
    if (answersCache) return answersCache;
    if (root.ELITE_ANSWER_INDEX) { answersCache = root.ELITE_ANSWER_INDEX; return answersCache; }
    try {
      await loadScript("answer-index.js?v=asg-a1", "asg-answers");
      answersCache = root.ELITE_ANSWER_INDEX || {};
    } catch (error) {
      answersCache = {};
    }
    return answersCache;
  }

  async function ensureSolutionView() {
    if (root.EliteSolutionView && root.EliteSolutionView.render) return true;
    try {
      await loadScript("worked-solution.js?v=asg-w1", "asg-worked-solution");
      return Boolean(root.EliteSolutionView && root.EliteSolutionView.render);
    } catch (error) {
      return false;
    }
  }

  /* Availability summary for the settings modal: how many bank
     questions the completed topics offer in total (selection is random
     across assignments, so earlier assignments do not reduce this). */
  function availability(index, topics, includeEP) {
    let total = 0;
    (topics || []).forEach((topic) => {
      total += (index.byTopic[topic] || []).filter((q) => includeEP || !q.ep).length;
    });
    return { total };
  }

  /* ------------------------------------------------------------ section */

  function renderSection(container, ctx) {
    if (!container || !ctx) return;
    const key = `${ctx.studentId}|${ctx.courseId}`;
    contexts.set(key, ctx);
    const records = Object.values((ctx.doc && ctx.doc.assignments) || {})
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const completed = (ctx.completedTopics || []).length;
    container.innerHTML = `
      <div class="lt-assign-head">
        <h3>Assignments</h3>
        <button type="button" class="lt-btn is-gold" data-asg-generate="${escapeHtml(key)}" ${completed ? "" : "disabled"}>
          Generate assignment
        </button>
      </div>
      <p class="lt-muted">${completed
        ? `Random questions from the ${completed} completed topic${completed === 1 ? "" : "s"} above, in the site's exam style - student copy and worked-solutions teacher copy.`
        : "Tick at least one lesson above, then generate a practice assignment from the completed topics."}</p>
      ${records.length ? `<ul class="lt-assign-list">
        ${records.map((record) => `
        <li class="lt-assign-item">
          <div class="lt-assign-meta">
            <b>${escapeHtml(formatDate(record.date))}</b>
            <span>${record.questionIds.length} questions &middot; ${record.totalMarks} marks &middot; about ${record.estMinutes} min &middot; ${escapeHtml(Core.LAYOUTS[Core.recordLayout(record)].label)}</span>
            <span class="lt-muted">${escapeHtml((record.topics || []).join(", "))}</span>
          </div>
          <div class="lt-assign-actions">
            <button type="button" class="lt-btn is-small" data-asg-open="${escapeHtml(key)}|${escapeHtml(record.id)}|student">Student copy</button>
            <button type="button" class="lt-btn is-small" data-asg-open="${escapeHtml(key)}|${escapeHtml(record.id)}|teacher">Teacher copy</button>
          </div>
        </li>`).join("")}
      </ul>` : `<p class="lt-muted">No assignments generated yet for this course.</p>`}`;
  }

  /* -------------------------------------------------------------- modal */

  function ensureChrome() {
    if (!document.getElementById("asgModal")) {
      const modal = document.createElement("div");
      modal.className = "lt-modal-backdrop asg-modal-backdrop";
      modal.id = "asgModal";
      modal.hidden = true;
      modal.innerHTML = `
        <div class="lt-modal asg-modal" role="dialog" aria-modal="true" aria-labelledby="asgModalTitle">
          <h3 id="asgModalTitle">Generate assignment</h3>
          <div id="asgModalBody"></div>
        </div>`;
      document.body.appendChild(modal);
      modal.addEventListener("click", (event) => { if (event.target === modal) closeModal(); });
    }
    if (!document.getElementById("asgPrintRoot")) {
      const rootEl = document.createElement("div");
      rootEl.id = "asgPrintRoot";
      rootEl.hidden = true;
      document.body.appendChild(rootEl);
    }
  }

  function closeModal() {
    const modal = document.getElementById("asgModal");
    if (modal) modal.hidden = true;
    modalState = null;
  }

  async function openGenerator(ctx, button) {
    ensureChrome();
    const original = button ? button.textContent : "";
    if (button) { button.disabled = true; button.textContent = "Loading the question bank..."; }
    let index;
    try {
      index = await loadBank(ctx.courseId);
    } catch (error) {
      if (button) { button.disabled = false; button.textContent = original; }
      if (ctx.toast) ctx.toast("The question bank could not be loaded. Check the connection and try again.", "error");
      return;
    }
    if (button) { button.disabled = false; button.textContent = original; }
    const topics = [...(ctx.completedTopics || [])];
    modalState = { ctx, index, topics };
    const bands = COURSE_META[ctx.courseId] && COURSE_META[ctx.courseId].family === "ial" ? Core.BANDS.ial : Core.BANDS.igcse;
    modalState.bands = bands;
    const avail = availability(index, topics, true);
    const modal = document.getElementById("asgModal");
    document.getElementById("asgModalTitle").textContent = `Generate assignment - ${ctx.name}`;
    document.getElementById("asgModalBody").innerHTML = `
      <p class="lt-muted">${escapeHtml(COURSE_META[ctx.courseId] ? COURSE_META[ctx.courseId].label : ctx.courseId)} &middot; from the completed topics: ${escapeHtml(topics.join(", "))}</p>
      <p class="lt-muted" id="asgAvail">${avail.total} bank questions across these topics.</p>
      <label class="lt-field"><span>Number of questions</span>
        <input type="number" id="asgCount" min="1" max="${Core.MAX_COUNT}" step="1" value="${Core.defaultCount(topics.length)}">
      </label>
      <label class="lt-field"><span>Target total marks (optional - the paper never goes over it)</span>
        <input type="number" id="asgTarget" min="0" step="1" placeholder="No target">
      </label>
      <label class="lt-checkline"><input type="checkbox" id="asgEP" checked> Include Elite Practice questions</label>
      <label class="lt-field"><span>Print layout (same options as the mock exam printer)</span>
        <select id="asgLayout">
          ${Core.layoutOptions().map((option) => `<option value="${option.key}"${option.key === Core.DEFAULT_LAYOUT ? " selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
        </select>
      </label>
      <p class="lt-muted">Up to the chosen number of questions; estimated time is worked out at ${Core.MINUTES_PER_MARK} minutes per mark. Questions are picked at random - a question may appear again in a later assignment, never twice in the same one.</p>
      <div class="lt-warn" id="asgError" hidden></div>
      <div class="lt-form-actions">
        <button type="button" class="lt-btn is-gold" id="asgDoGenerate">Generate</button>
        <button type="button" class="lt-btn" id="asgCancel">Cancel</button>
      </div>`;
    modal.hidden = false;
    document.getElementById("asgEP").addEventListener("change", (event) => {
      const next = availability(index, topics, event.target.checked);
      document.getElementById("asgAvail").textContent = `${next.total} bank questions across these topics.`;
    });
    document.getElementById("asgCancel").addEventListener("click", closeModal);
    document.getElementById("asgDoGenerate").addEventListener("click", () => doGenerate());
  }

  async function doGenerate() {
    if (!modalState) return;
    const { ctx, index, topics, bands } = modalState;
    const count = Number(document.getElementById("asgCount").value || 0);
    const targetMarks = Number(document.getElementById("asgTarget").value || 0);
    const includeEP = document.getElementById("asgEP").checked;
    const layout = document.getElementById("asgLayout").value;
    const errorBox = document.getElementById("asgError");
    const rng = Core.mulberry32(Date.now() % 2147483647);
    const result = Core.selectAssignment({
      byTopic: index.byTopic, topics, count, targetMarks, includeEP, bands, rng
    });
    if (!result.picked.length) {
      errorBox.hidden = false;
      errorBox.innerHTML = `<strong>Nothing could be picked.</strong> ${result.warnings.map((w) => escapeHtml(w.message)).join(" ")}`;
      return;
    }
    const now = Date.now();
    const record = Core.makeRecord({
      topics, picked: result.picked, count, targetMarks, includeEP, layout,
      now, date: ACore ? ACore.cairoToday() : new Date(now).toISOString().slice(0, 10)
    });
    const button = document.getElementById("asgDoGenerate");
    button.disabled = true;
    button.textContent = "Saving...";
    try {
      await ctx.saveRecord(record);
    } catch (error) {
      button.disabled = false;
      button.textContent = "Generate";
      errorBox.hidden = false;
      errorBox.textContent = "The assignment could not be saved. Your tracker data is unchanged - try again.";
      return;
    }
    closeModal();
    if (ctx.toast) ctx.toast(`Assignment saved: ${record.questionIds.length} questions, ${record.totalMarks} marks`);
    if (result.warnings.length && ctx.toast) {
      ctx.toast(result.warnings[0].message, "error");
    }
    // The saved record replaces the in-memory one (the store returns
    // the sanitised copy); re-open from the refreshed section context.
    const freshCtx = contexts.get(`${ctx.studentId}|${ctx.courseId}`) || ctx;
    const freshRecord = freshCtx.doc && freshCtx.doc.assignments ? freshCtx.doc.assignments[record.id] : null;
    openPreview(freshCtx, freshRecord || record, "student");
  }

  /* ------------------------------------------------------------- preview */

  function questionById(index, id) {
    return index.byId[id] || null;
  }

  async function solutionFor(courseId, index, questionId) {
    const meta = COURSE_META[courseId];
    if (meta && meta.family === "ial") {
      return (index.solutions && index.solutions[questionId]) || null;
    }
    const solutions = await loadSolutions();
    if (solutions[questionId]) return solutions[questionId];
    const answers = await loadAnswers();
    if (answers[questionId] && answers[questionId].finalAnswer) {
      return { steps: [], finalAnswer: answers[questionId].finalAnswer };
    }
    return null;
  }

  function fallbackSolutionHtml(solution) {
    if (!solution || (!solution.steps || !solution.steps.length) && !solution.finalAnswer) {
      return `<p class="asg-sol-empty">No worked solution in the bank for this question yet.</p>`;
    }
    const steps = (solution.steps || []).map((step) => `
      <div class="asg-step">
        ${step.title ? `<h4>${escapeHtml(step.title)}</h4>` : ""}
        <p>${escapeHtml(step.body || "").replace(/\n/g, "<br>")}</p>
      </div>`).join("");
    const final = solution.finalAnswer ? `<p class="asg-final"><strong>Final answer:</strong> ${escapeHtml(solution.finalAnswer)}</p>` : "";
    return `${steps}${final}`;
  }

  async function solutionHtml(courseId, index, questionId) {
    const solution = await solutionFor(courseId, index, questionId);
    if (!solution) return `<p class="asg-sol-empty">No worked solution in the bank for this question yet.</p>`;
    if (root.EliteSolutionView && root.EliteSolutionView.render) {
      try {
        return root.EliteSolutionView.render(solution, { variant: "print" });
      } catch (error) { /* fall through to the local renderer */ }
    }
    return fallbackSolutionHtml(solution);
  }

  /* The paper renders in the record's saved layout (v1 records have
     no layout field -> the current default, "single"). Student copy:
     the layout's working space follows each question (nothing at all
     in compact). Teacher copy: worked solutions replace the working
     space, but the layout still drives the spacing - the same gap
     between questions, and in "single" each question + solution
     starts on its own printed page (teacher-tracker.css). */
  async function renderPaper(ctx, record, variant, index) {
    const layout = Core.layoutFor(record.layout);
    const questions = record.questionIds.map((id) => questionById(index, id)).filter(Boolean);
    const missing = record.questionIds.length - questions.length;
    const parts = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const sol = variant === "teacher" ? await solutionHtml(ctx.courseId, index, q.id) : "";
      const space = variant === "student" ? Core.spaceMm(layout.key, q.marks) : 0;
      parts.push(`
      <article class="asg-q">
        <header class="asg-q-head">
          <span class="asg-qno">${i + 1}.</span>
          <span class="asg-qmeta">${escapeHtml(q.paper || "")}${q.qno ? ` &middot; Question ${q.qno}` : ""} &middot; ${escapeHtml(q.topic || "")}</span>
          <span class="asg-qmarks">(${q.marks} mark${q.marks === 1 ? "" : "s"})</span>
        </header>
        ${q.image ? `<img class="asg-qimg" src="${escapeHtml(q.image)}" alt="Question ${i + 1} from ${escapeHtml(q.paper || "a past paper")}">` : ""}
        ${variant === "student" ? (space > 0 ? `<div class="asg-space" style="height:${space}mm" aria-hidden="true"></div>` : "") : `
        <div class="asg-sol">
          <h3 class="asg-sol-title">Worked solution</h3>
          ${sol}
        </div>`}
      </article>`);
    }
    const gap = layout.gap > 0 && parts.length > 1
      ? `<div class="asg-gap" style="height:${layout.gap}mm" aria-hidden="true"></div>`
      : "";
    return `
      <div class="asg-sheet is-${variant} is-layout-${layout.key}">
        <header class="asg-paper-head">
          <p class="asg-brand">Elite IGCSE <span>Maths, mastered step by step.</span></p>
          <h1>${variant === "teacher" ? "Assignment - Teacher copy (with worked solutions)" : "Assignment"}</h1>
          <div class="asg-paper-meta">
            <p><b>Student:</b> ${escapeHtml(ctx.name)}</p>
            <p><b>Course:</b> ${escapeHtml(COURSE_META[ctx.courseId] ? COURSE_META[ctx.courseId].label : ctx.courseId)}</p>
            <p><b>Date:</b> ${escapeHtml(formatDate(record.date))}</p>
            <p><b>Topics:</b> ${escapeHtml((record.topics || []).join(", "))}</p>
            <p><b>Total:</b> ${record.totalMarks} marks &middot; <b>Time:</b> about ${record.estMinutes} minutes (${Core.MINUTES_PER_MARK} min per mark)</p>
          </div>
          ${variant === "student" ? `<p class="asg-instructions">${layout.key === "compact" ? "Answer all questions on separate paper. Show your working clearly." : "Answer all questions. Show your working clearly in the spaces provided."}</p>` : ""}
          ${missing ? `<p class="asg-missing">${missing} question${missing === 1 ? "" : "s"} from this saved assignment could not be found in the current question bank and ${missing === 1 ? "is" : "are"} not shown.</p>` : ""}
        </header>
        ${parts.join(gap)}
        <footer class="asg-paper-foot">Elite IGCSE Mathematics - Dr Eslam Ahmed &middot; eliteigcse.com</footer>
      </div>`;
  }

  async function openPreview(ctx, record, variant) {
    ensureChrome();
    let index;
    try {
      index = await loadBank(ctx.courseId);
    } catch (error) {
      if (ctx.toast) ctx.toast("The question bank could not be loaded, so this assignment cannot be shown right now.", "error");
      return;
    }
    if (variant === "teacher") await ensureSolutionView();
    previewState = { ctx, record, variant, index };
    const rootEl = document.getElementById("asgPrintRoot");
    rootEl.innerHTML = `
      <div class="asg-toolbar">
        <div class="asg-toolbar-group" role="group" aria-label="Copy">
          <button type="button" class="lt-btn is-small ${variant === "student" ? "is-primary" : ""}" data-asg-variant="student">Student copy</button>
          <button type="button" class="lt-btn is-small ${variant === "teacher" ? "is-primary" : ""}" data-asg-variant="teacher">Teacher copy</button>
        </div>
        <div class="asg-toolbar-group">
          <button type="button" class="lt-btn is-small is-gold" data-asg-print>Print / save PDF</button>
          <button type="button" class="lt-btn is-small" data-asg-close-preview>Close</button>
        </div>
      </div>
      <div class="asg-paper-wrap">${await renderPaper(ctx, record, variant, index)}</div>`;
    rootEl.hidden = false;
    rootEl.scrollTop = 0;
  }

  function closePreview() {
    const rootEl = document.getElementById("asgPrintRoot");
    if (rootEl) { rootEl.hidden = true; rootEl.innerHTML = ""; }
    previewState = null;
  }

  /* Print: typeset maths first, wait for question images to settle,
     then print with only the paper visible (teacher-tracker.css
     @media print + body.asg-printing). */
  async function printPreview() {
    if (!previewState) return;
    const rootEl = document.getElementById("asgPrintRoot");
    if (previewState.variant === "teacher" && root.EliteRuntime && root.EliteRuntime.ensureMathJax) {
      try {
        const mathJax = await root.EliteRuntime.ensureMathJax();
        if (mathJax && mathJax.typesetPromise) await mathJax.typesetPromise([rootEl]);
      } catch (error) { /* print anyway - final answers are plain text */ }
    }
    const images = [...rootEl.querySelectorAll("img")].filter((img) => !img.complete);
    if (images.length) {
      await Promise.race([
        Promise.all(images.map((img) => new Promise((resolve) => {
          img.addEventListener("load", resolve, { once: true });
          img.addEventListener("error", resolve, { once: true });
        }))),
        new Promise((resolve) => setTimeout(resolve, 4000))
      ]);
    }
    document.body.classList.add("asg-printing");
    const cleanup = () => {
      document.body.classList.remove("asg-printing");
      root.removeEventListener("afterprint", cleanup);
    };
    root.addEventListener("afterprint", cleanup);
    setTimeout(cleanup, 60000);
    root.print();
  }

  /* -------------------------------------------------------------- events */

  document.addEventListener("click", async (event) => {
    const generate = event.target.closest("[data-asg-generate]");
    if (generate) {
      const ctx = contexts.get(generate.dataset.asgGenerate);
      if (ctx) await openGenerator(ctx, generate);
      return;
    }
    const open = event.target.closest("[data-asg-open]");
    if (open) {
      const [studentId, courseId, recordId, variant] = String(open.dataset.asgOpen || "").split("|");
      const ctx = contexts.get(`${studentId}|${courseId}`);
      const record = ctx && ctx.doc && ctx.doc.assignments ? ctx.doc.assignments[recordId] : null;
      if (ctx && record) await openPreview(ctx, record, variant === "teacher" ? "teacher" : "student");
      return;
    }
    const variantBtn = event.target.closest("[data-asg-variant]");
    if (variantBtn && previewState) {
      await openPreview(previewState.ctx, previewState.record, variantBtn.dataset.asgVariant);
      return;
    }
    if (event.target.closest("[data-asg-print]")) { await printPreview(); return; }
    if (event.target.closest("[data-asg-close-preview]")) { closePreview(); }
  });

  root.EliteAssignments = { renderSection, openPreview, closePreview };
})(window);
