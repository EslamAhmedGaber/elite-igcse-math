(function () {
  "use strict";
  // "Today" panel for the course pages and the home page: the Daily Challenge status (daily.js)
  // and an exam countdown the student sets once. Everything stays in localStorage (and syncs
  // through cloud-progress.js when the student is signed in).

  const DAILY_KEY = "eliteDailyV1";
  const EXAM_KEY = "eliteExamSessionV1";
  const COURSES = {
    linear: { name: "Linear", code: "4MA1", family: "igcse", questions: 1280 },
    unit1: { name: "Modular Unit 1", code: "4WM1", family: "igcse", questions: 596 },
    unit2: { name: "Modular Unit 2", code: "4WM2", family: "igcse", questions: 686 },
    wma11: { name: "Pure 1", code: "WMA11", family: "ial", questions: 189 },
    wma12: { name: "Pure 2", code: "WMA12", family: "ial", questions: 190 },
    wma13: { name: "Pure 3", code: "WMA13", family: "ial", questions: 180 },
    wme01: { name: "Mechanics 1", code: "WME01", family: "ial", questions: 138 },
  };
  // Approximate first-paper dates of each Edexcel series; the student can set an exact date instead.
  const SERIES = {
    ial: [[1, 8, "January"], [5, 18, "May/June"], [10, 6, "October"]],
    igcse: [[1, 8, "January"], [5, 20, "May/June"], [11, 3, "November"]],
  };

  const esc = (v) => String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const readJSON = (key, fallback) => { try { const v = JSON.parse(localStorage.getItem(key) || "null"); return v ?? fallback; } catch (e) { return fallback; } };
  const writeJSON = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode */ } };
  const pad = (n) => String(n).padStart(2, "0");
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseDay = (text) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(text || "")); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  const daysUntil = (text) => { const d = parseDay(text); if (!d) return null; const t = parseDay(dayKey()); return Math.round((d - t) / 86400000); };
  const fmtDate = (text) => { const d = parseDay(text); return d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : ""; };

  function dailyStatus(id) {
    const state = readJSON(DAILY_KEY, {});
    const entry = state.courses?.[id];
    const today = dayKey();
    const y = new Date(); y.setDate(y.getDate() - 1);
    const streak = state.streak || { count: 0, last: "" };
    const alive = streak.last === today || streak.last === dayKey(y);
    const done = entry && entry.date === today ? (entry.ids || []).filter((x) => entry.results?.[x]).length : 0;
    const total = entry && entry.date === today ? (entry.ids || []).length || 5 : 5;
    return { done, total, finished: done > 0 && done >= total, streak: alive ? streak.count || 0 : 0, best: streak.best || 0 };
  }

  function upcomingSessions(family) {
    const today = dayKey();
    const year = new Date().getFullYear();
    const list = [];
    for (let y = year; y <= year + 2 && list.length < 4; y += 1) {
      SERIES[family].forEach(([month, day, label]) => {
        const date = `${y}-${pad(month)}-${pad(day)}`;
        if (date >= today && list.length < 4) list.push({ date, label: `${label} ${y}` });
      });
    }
    return list;
  }

  function solvedCount(id) {
    const c = COURSES[id];
    if (c.family !== "ial") return 0; // IGCSE solved lists are shared by Linear and Modular, so we count the whole bank.
    const list = readJSON(`elite${c.code}SolvedV1`, []);
    return Array.isArray(list) ? list.length : 0;
  }

  const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m12 3 2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/></svg>';

  function dailyCard(id, { showCourse = false } = {}) {
    const c = COURSES[id];
    const s = dailyStatus(id);
    const dots = Array.from({ length: s.total }, (_, i) => `<i class="${i < s.done ? "on" : ""}"></i>`).join("");
    const title = s.finished ? "Today's 5 are done" : s.done ? `${s.done} of ${s.total} done today` : "Your 5 questions for today";
    const text = s.finished
      ? "Great work. A new set is picked for you tomorrow, so come back to keep your streak."
      : s.done ? "Finish the set to keep your streak going." : "Picked from questions you haven't solved and the ones in your Mistake Box.";
    return `<article class="e27-today-card e27-today-daily${s.finished ? " is-done" : ""}">
      <div class="e27-today-top">
        <span class="e27-today-kicker">Daily Challenge${showCourse ? ` &middot; ${esc(c.name)}` : ""}</span>
        <span class="e27-today-streak${s.streak ? " is-on" : ""}" title="Best streak: ${s.best} days">${STAR}<b class="e27-num">${s.streak}</b> day${s.streak === 1 ? "" : "s"}</span>
      </div>
      <strong class="e27-today-title">${esc(title)}</strong>
      <p>${esc(text)}</p>
      <div class="e27-today-foot">
        <span class="e27-today-dots" aria-label="${s.done} of ${s.total} done">${dots}</span>
        <a class="e27-btn ${s.finished ? "e27-btn-line" : "e27-btn-gold"}" data-module="daily" href="daily.html?course=${esc(id)}">${s.finished ? "Review today's set" : s.done ? "Continue" : "Start today's 5"} &rarr;</a>
      </div>
    </article>`;
  }

  function examCard(id) {
    const c = COURSES[id];
    const saved = readJSON(EXAM_KEY, {})[id];
    const days = saved ? daysUntil(saved.date) : null;
    if (!saved || days === null || days < 0) {
      const options = upcomingSessions(c.family).map((s) => `<option value="${s.date}|${esc(s.label)}">${esc(s.label)}</option>`).join("");
      return `<article class="e27-today-card e27-today-exam">
        <div class="e27-today-top"><span class="e27-today-kicker">Exam countdown</span></div>
        <strong class="e27-today-title">${saved ? "Your last exam date has passed" : `When is your ${esc(c.code)} exam?`}</strong>
        <p>Choose your exam session and see how many days are left and how much to solve each day.</p>
        <form class="e27-today-form" data-exam-form>
          <label class="sr-only" for="examSession-${id}">Exam session</label>
          <select id="examSession-${id}" data-exam-select>${options}<option value="custom">Another date&hellip;</option></select>
          <input type="date" data-exam-date hidden aria-label="Exam date" min="${dayKey()}">
          <button class="e27-btn e27-btn-gold" type="submit">Start countdown</button>
        </form>
      </article>`;
    }
    const left = Math.max(c.questions - solvedCount(id), 0);
    const perDay = days > 0 ? Math.ceil(left / days) : left;
    const weeks = Math.floor(days / 7);
    const span = days === 0 ? "Exam day" : weeks >= 2 ? `${weeks} weeks${days % 7 ? ` ${days % 7} day${days % 7 === 1 ? "" : "s"}` : ""}` : "";
    const plan = days === 0
      ? "Good luck today. Read every question twice and show your working."
      : left === 0
        ? "You have solved the whole bank. Keep sharp with mock papers and your Mistake Box."
        : `About <b class="e27-num">${perDay}</b> question${perDay === 1 ? "" : "s"} a day covers the ${c.family === "ial" ? `${left.toLocaleString("en-GB")} you haven't solved yet` : `whole bank of ${left.toLocaleString("en-GB")}`}.`;
    return `<article class="e27-today-card e27-today-exam is-set">
      <div class="e27-today-top">
        <span class="e27-today-kicker">Exam countdown &middot; ${esc(saved.label || "")}</span>
        <button class="e27-today-link" type="button" data-exam-change>Change</button>
      </div>
      <div class="e27-today-count"><b class="e27-num">${days}</b><span>day${days === 1 ? "" : "s"} to go${span && days ? `<small>${esc(span)}</small>` : ""}</span></div>
      <p>${plan}</p>
      <p class="e27-today-note">${saved.exact ? fmtDate(saved.date) : `Around ${fmtDate(saved.date)}. Check your exact date on your timetable and set it with Change.`}</p>
    </article>`;
  }

  function bindExam(el, id, rerender) {
    const form = el.querySelector("[data-exam-form]");
    if (form) {
      const select = form.querySelector("[data-exam-select]");
      const input = form.querySelector("[data-exam-date]");
      select.addEventListener("change", () => { input.hidden = select.value !== "custom"; if (!input.hidden) input.focus(); });
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        let record;
        if (select.value === "custom") {
          if (!parseDay(input.value) || daysUntil(input.value) < 0) { input.focus(); return; }
          record = { date: input.value, label: fmtDate(input.value), exact: true };
        } else {
          const [date, label] = select.value.split("|");
          record = { date, label, exact: false };
        }
        const all = readJSON(EXAM_KEY, {});
        all[id] = record;
        writeJSON(EXAM_KEY, all);
        rerender();
      });
    }
    el.querySelector("[data-exam-change]")?.addEventListener("click", () => {
      const all = readJSON(EXAM_KEY, {});
      delete all[id];
      writeJSON(EXAM_KEY, all);
      rerender();
      el.querySelector("[data-exam-select]")?.focus();
    });
  }

  // The progress page has its own course picker (#quickCourse); the panel follows it.
  const PICKER_IDS = { "modular-u1": "unit1", "modular-u2": "unit2" };

  function mount(el) {
    const mode = el.dataset.e27Today || "course";
    const picker = mode === "progress" ? document.getElementById("quickCourse") : null;
    const courseNow = () => {
      if (picker) return PICKER_IDS[picker.value] || picker.value;
      if (mode === "home") {
        try { return localStorage.getItem("eliteLastCourse") || ""; } catch (e) { return ""; }
      }
      return el.dataset.course || "";
    };
    const render = () => {
      const id = courseNow();
      // On the progress page the tracker tabs own the hidden flag; an empty panel hides itself (CSS :empty).
      const ownsHidden = mode !== "progress";
      if (!COURSES[id]) {
        el.innerHTML = "";
        if (ownsHidden) el.hidden = true;
        return;
      }
      el.innerHTML = dailyCard(id, { showCourse: mode !== "course" }) + examCard(id);
      if (ownsHidden) el.hidden = false;
      bindExam(el, id, render);
    };
    render();
    picker?.addEventListener("change", render);
    // Another tab (e.g. the Daily Challenge) changed the progress: show it.
    window.addEventListener("storage", (event) => { if ([DAILY_KEY, EXAM_KEY].includes(event.key)) render(); });
  }

  function start() { document.querySelectorAll("[data-e27-today]").forEach(mount); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
  window.EliteToday = { mount, dailyStatus };
})();
