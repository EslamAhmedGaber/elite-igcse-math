(function () {
  // Daily Challenge: five past-paper questions a day for one course, the same five all day.
  // Up to two come from the student's Mistake Box (when due), the rest are unsolved questions from different topics.
  // "I got it" marks the question solved and "Needs review" puts it in the Mistake Box, using each course's own
  // storage, so Progress, the Mistake Box and cloud sync all see the result. Finishing all five extends the streak.
  const root = document.querySelector("[data-daily-root]");
  if (!root) return;

  const STATE_KEY = "eliteDailyV1";
  const COUNT = 5;
  const REVIEW_INTERVALS = [1, 3, 7, 14];
  const IGCSE_SOLVED = "solvedExpertiseQuestions";
  const IGCSE_REVIEW = "eliteMistakeBoxV1";
  const COURSES = {
    linear: { name: "Linear", code: "4MA1", kind: "igcse", mode: "linear" },
    unit1: { name: "Modular Unit 1", code: "4WM1", kind: "igcse", mode: "modular", unit: "Unit 1" },
    unit2: { name: "Modular Unit 2", code: "4WM2", kind: "igcse", mode: "modular", unit: "Unit 2" },
    wma11: { name: "Pure 1", code: "WMA11", kind: "ial", data: "ial/wma11/wma11-data.js?v=20261020fig" },
    wma12: { name: "Pure 2", code: "WMA12", kind: "ial", data: "ial/wma12/wma12-data.js?v=20261020fig" },
    wma13: { name: "Pure 3", code: "WMA13", kind: "ial", data: "ial/wma13/wma13-data.js?v=wma13-20261020" },
    wme01: { name: "Mechanics 1", code: "WME01", kind: "ial", data: "ial/wme01/wme01-data.js?v=20261020fig" },
  };
  const ALIASES = { "4ma1": "linear", "4wm1": "unit1", "4wm2": "unit2", p1: "wma11", pure1: "wma11", p2: "wma12", pure2: "wma12", p3: "wma13", pure3: "wma13", m1: "wme01", mechanics1: "wme01" };

  // ---------------------------------------------------------------- small helpers
  const esc = (v) => String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const readJSON = (key, fallback) => { try { const v = JSON.parse(localStorage.getItem(key) || "null"); return v ?? fallback; } catch (e) { return fallback; } };
  const writeJSON = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode */ } };
  const pad = (n) => String(n).padStart(2, "0");
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const yesterdayKey = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d); };

  function rng(seedText) {
    let h = 2166136261;
    for (const ch of seedText) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
    return () => { h += 0x6d2b79f5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function shuffle(list, random) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  function courseId() {
    const params = new URLSearchParams(location.search);
    const asked = String(params.get("course") || params.get("c") || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const id = ALIASES[asked] || asked;
    if (COURSES[id]) return id;
    try { const last = localStorage.getItem("eliteLastCourse"); if (COURSES[last]) return last; } catch (e) { /* ignore */ }
    return "";
  }

  // ---------------------------------------------------------------- data
  async function loadCourse(id) {
    const course = COURSES[id];
    const load = (src) => window.EliteRuntime.loadScript(src);
    if (course.kind === "ial") {
      await load(course.data);
      const items = window[`${course.code}_QUESTIONS`] || [];
      return items.map((q) => ({ id: q.id, image: q.image, topic: q.topicName, marks: q.marks, label: `${q.paper} · Q${q.qNo}`, steps: q.steps, finalAnswer: q.finalAnswer }));
    }
    window.ELITE_PATHWAY = { mode: course.mode, isModular: course.mode === "modular", label: () => (course.mode === "modular" ? "Unit" : "Chapter") };
    await load("questions-data.js?v=20261024a");
    await load("topic-normalizer.js?v=20261023a");
    return (window.QUESTION_DATA || [])
      .filter((q) => q.bank === "all" && (!course.unit || q.unit === course.unit))
      .map((q) => ({ id: q.id, image: q.image, topic: q.topic, marks: q.marks, label: `${q.paper} · Q${q.question}` }));
  }

  async function solutionFor(item) {
    if (item.steps) return { steps: item.steps, finalAnswer: item.finalAnswer };
    await window.EliteRuntime.loadScript("solutions-data.js?v=20261024a", { test: () => Boolean(window.SOLUTION_DATA) });
    return (window.SOLUTION_DATA || {})[item.id] || null;
  }

  // ---------------------------------------------------------------- progress stores
  function stores(id) {
    const course = COURSES[id];
    if (course.kind === "igcse") return { solved: IGCSE_SOLVED, mistakes: IGCSE_REVIEW, igcse: true };
    return { solved: `elite${course.code}SolvedV1`, mistakes: `elite${course.code}MistakeBoxV1`, igcse: false };
  }

  function mistakePool(id, byId) {
    const s = stores(id);
    const box = readJSON(s.mistakes, {});
    const now = Date.now();
    return Object.values(box)
      .filter((entry) => entry && byId.has(entry.id) && (!s.igcse || (!entry.masteredAt && Number(entry.dueAt || 0) <= now)))
      .map((entry) => entry.id);
  }

  function pickToday(id, items) {
    const state = readJSON(STATE_KEY, {});
    const today = dayKey();
    const saved = state.courses?.[id];
    const byId = new Map(items.map((i) => [i.id, i]));
    if (saved && saved.date === today && saved.ids.every((x) => byId.has(x))) return saved;
    const random = rng(`${id}|${today}`);
    const solved = new Set(readJSON(stores(id).solved, []));
    const picked = [];
    const topics = new Set();
    for (const qid of shuffle(mistakePool(id, byId), random)) {
      if (picked.length >= 2) break;
      picked.push(qid);
      topics.add(byId.get(qid).topic);
    }
    const fresh = shuffle(items.filter((i) => !solved.has(i.id) && !picked.includes(i.id)), random);
    for (const item of fresh) {
      if (picked.length >= COUNT) break;
      if (topics.has(item.topic) && fresh.length > COUNT * 3) continue;
      picked.push(item.id);
      topics.add(item.topic);
    }
    for (const item of shuffle(items, random)) {   // everything solved already: revisit old questions
      if (picked.length >= COUNT) break;
      if (!picked.includes(item.id)) picked.push(item.id);
    }
    const entry = { date: today, ids: picked, results: {} };
    state.courses = { ...(state.courses || {}), [id]: entry };
    writeJSON(STATE_KEY, state);
    return entry;
  }

  function record(id, item, result) {
    const s = stores(id);
    const solved = new Set(readJSON(s.solved, []));
    const box = readJSON(s.mistakes, {});
    const now = Date.now();
    if (result === "got") {
      solved.add(item.id);
      if (box[item.id]) {
        if (s.igcse) {
          const level = Math.min(3, Number(box[item.id].level || 0) + 1);
          box[item.id] = { ...box[item.id], level, updatedAt: now, masteredAt: level >= 3 ? now : null,
            dueAt: level >= 3 ? now + 365 * 86400000 : now + REVIEW_INTERVALS[level] * 86400000 };
        } else {
          delete box[item.id];
        }
      }
    } else if (s.igcse) {
      box[item.id] = { id: item.id, reason: "daily", level: 0, attempts: (box[item.id]?.attempts || 0) + 1,
        addedAt: box[item.id]?.addedAt || now, updatedAt: now, dueAt: now + 86400000 };
    } else {
      const [paper, q] = item.label.split(" · Q");
      box[item.id] = { id: item.id, paper, qNo: Number(q), topic: item.topic, marks: item.marks, addedAt: new Date().toISOString() };
    }
    writeJSON(s.solved, [...solved]);
    writeJSON(s.mistakes, box);
    const state = readJSON(STATE_KEY, {});
    const entry = state.courses?.[id];
    if (!entry) return state;
    entry.results[item.id] = result;
    if (entry.ids.every((x) => entry.results[x]) && !entry.completed) {
      entry.completed = true;
      const streak = state.streak || { count: 0, last: "", best: 0 };
      const today = dayKey();
      if (streak.last !== today) {
        streak.count = streak.last === yesterdayKey() ? streak.count + 1 : 1;
        streak.last = today;
        streak.best = Math.max(streak.best || 0, streak.count);
      }
      state.streak = streak;
      window.dispatchEvent(new CustomEvent("elite:daily-complete", { detail: { course: id, streak: streak.count } }));
    }
    writeJSON(STATE_KEY, state);
    return state;
  }

  function streakNow() {
    const streak = readJSON(STATE_KEY, {}).streak || { count: 0, last: "", best: 0 };
    const alive = streak.last === dayKey() || streak.last === yesterdayKey();
    return { count: alive ? streak.count : 0, best: streak.best || 0, doneToday: streak.last === dayKey() };
  }

  // ---------------------------------------------------------------- view
  function chooser() {
    root.innerHTML = `<section class="e27-chero e27-daily-hero" data-course="linear"><div class="e27-wrap">
      <span class="e27-kicker">Daily Challenge</span><h1>Five questions a day</h1>
      <p>Pick your course. Every day you get five past-paper questions chosen for you.</p></div></section>
      <div class="e27-wrap"><div class="e27-courses e27-daily-pick">${Object.entries(COURSES).map(([key, c]) => `
        <a class="e27-course" data-course="${key}" href="daily.html?course=${key}"><span class="e27-chip">${esc(c.code)}</span>
        <strong>${esc(c.name)}</strong><small>Today's five questions</small><span class="e27-meta"><span>Start</span><span class="e27-go">&rarr;</span></span></a>`).join("")}</div></div>`;
  }

  function header(id, entry) {
    const c = COURSES[id];
    const done = entry.ids.filter((x) => entry.results[x]).length;
    const s = streakNow();
    const date = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
    return `<section class="e27-chero e27-daily-hero" data-course="${esc(id)}"><div class="e27-wrap">
      <nav class="e27-crumb" aria-label="Breadcrumb"><a href="course.html?c=${esc(id)}">${esc(c.name)}</a> &nbsp;/&nbsp; Daily Challenge</nav>
      <div class="e27-ctop"><div>
        <span class="e27-chip">${esc(c.code)} &middot; ${esc(date)}</span>
        <h1>Daily Challenge</h1>
        <p>Five questions picked for you today. Try each one on paper first, then check the solution.</p>
        <a class="e27-change" href="daily.html">Change course</a>
      </div>
      <div class="e27-cstats">
        <div><b class="e27-num" data-daily-done>${done}/${entry.ids.length}</b><span>done today</span></div>
        <div class="e27-streak${s.count ? " is-on" : ""}"><b class="e27-num" data-daily-streak>${s.count}</b><span>day streak${s.best > 1 ? ` &middot; best ${s.best}` : ""}</span></div>
      </div></div>
    </div></section>`;
  }

  function card(item, index, entry) {
    const result = entry.results[item.id];
    return `<article class="e27-dq${result ? ` is-${result}` : ""}" data-qid="${esc(item.id)}">
      <header><span class="e27-dq-n">${index + 1}</span><div><strong>${esc(item.topic)}</strong><small>${esc(item.label)} &middot; ${esc(item.marks)} marks</small></div>
        <span class="e27-dq-status">${result === "got" ? "Got it" : result === "review" ? "In your Mistake Box" : ""}</span></header>
      <div class="e27-dq-img"><img src="${esc(item.image)}" alt="Question ${index + 1}" loading="lazy"></div>
      <div class="e27-dq-actions">
        <button class="e27-btn e27-btn-line" type="button" data-show>Show solution</button>
        <span class="e27-dq-spacer"></span>
        <button class="e27-btn e27-btn-got" type="button" data-mark="got"${result === "got" ? " aria-pressed=\"true\"" : ""}>I got it</button>
        <button class="e27-btn e27-btn-review" type="button" data-mark="review"${result === "review" ? " aria-pressed=\"true\"" : ""}>Needs review</button>
      </div>
      <div class="e27-dq-solution" data-solution hidden></div>
    </article>`;
  }

  function finishPanel(id) {
    const s = streakNow();
    return `<section class="e27-daily-done" data-daily-finish>
      <span class="e27-kicker">Challenge complete</span>
      <h2>${s.count > 1 ? `${s.count} days in a row. Keep it going!` : "Well done. See you tomorrow!"}</h2>
      <p>Tomorrow brings five new questions. Questions you marked "Needs review" come back to you in the Mistake Box.</p>
      <div class="e27-ctas"><a class="e27-btn e27-btn-gold" href="course.html?c=${esc(id)}">Back to the course</a>
      <a class="e27-btn e27-btn-ghost" href="progress.html?${COURSES[id].kind === "ial" ? `pathway=pure&course=${id}` : COURSES[id].mode === "modular" ? `pathway=modular&unit=${encodeURIComponent(COURSES[id].unit)}` : "pathway=linear"}">See my progress</a></div>
    </section>`;
  }

  async function start() {
    const id = courseId();
    if (!id) { chooser(); return; }
    root.innerHTML = `<div class="e27-wrap"><p class="e27-members-status">Picking today's questions&hellip;</p></div>`;
    let items;
    try { items = await loadCourse(id); } catch (err) { root.innerHTML = `<div class="e27-wrap"><p class="e27-members-status">Could not load the questions. Please refresh.</p></div>`; return; }
    try { localStorage.setItem("eliteLastCourse", id); } catch (e) { /* ignore */ }
    const byId = new Map(items.map((i) => [i.id, i]));
    let entry = pickToday(id, items);
    const render = () => {
      entry = readJSON(STATE_KEY, {}).courses?.[id] || entry;
      const all = entry.ids.every((x) => entry.results[x]);
      root.innerHTML = header(id, entry) + `<div class="e27-wrap e27-daily-list">${entry.ids.map((qid, i) => card(byId.get(qid), i, entry)).join("")}${all ? finishPanel(id) : ""}</div>`;
    };
    render();
    root.addEventListener("click", async (event) => {
      const art = event.target.closest(".e27-dq");
      if (!art) return;
      const item = byId.get(art.dataset.qid);
      const show = event.target.closest("[data-show]");
      const mark = event.target.closest("[data-mark]");
      if (show) {
        const box = art.querySelector("[data-solution]");
        if (!box.hidden) { box.hidden = true; show.textContent = "Show solution"; return; }
        show.textContent = "Loading…";
        const sol = await solutionFor(item);
        box.innerHTML = window.EliteSolutionView.render(sol, { key: item.id, topic: item.topic, marks: item.marks });
        box.hidden = false;
        show.textContent = "Hide solution";
        await window.EliteRuntime.ensureMathJax?.();
        if (window.EliteSolutionView.typeset) window.EliteSolutionView.typeset(box);
      } else if (mark) {
        const wasComplete = entry.ids.every((x) => entry.results[x]);
        record(id, item, mark.dataset.mark);
        const openIds = [...root.querySelectorAll(".e27-dq")].filter((a) => !a.querySelector("[data-solution]").hidden).map((a) => a.dataset.qid);
        render();
        for (const qid of openIds) root.querySelector(`.e27-dq[data-qid="${CSS.escape(qid)}"] [data-show]`)?.click();
        if (!wasComplete && entry.ids.every((x) => entry.results[x])) root.querySelector("[data-daily-finish]")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }

  window.EliteDaily = { streakNow, readState: () => readJSON(STATE_KEY, {}), dayKey };
  start();
})();
