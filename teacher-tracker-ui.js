/* ==========================================================================
   teacher-tracker-ui.js - Teacher Lesson Tracker page logic.
   Data layer: lesson-tracker.js (window.EliteLessonTracker).
   Spec: tracker-plan/PLAN_FINAL.md §1.3 / §1.5.
   ========================================================================== */
(function () {
  "use strict";

  const T = window.EliteLessonTracker;
  const Core = T.core;
  const $ = (selector, rootNode = document) => rootNode.querySelector(selector);
  const $$ = (selector, rootNode = document) => [...rootNode.querySelectorAll(selector)];

  /* Canonical course map - copied from teacher-groups.js (PLAN §0.4).
     Stored ids are these keys and no others. No "other": a course with
     no catalog has no checklist. */
  const COURSES = {
    linear: { label: "IGCSE Linear 4MA1", script: "topic-normalizer.js", topics: () => (window.LINEAR_TOPIC_CATALOG || []).map((entry) => ({ name: entry.topic, chapter: entry.unit })) },
    "modular-1": { label: "IGCSE Modular Unit 1", script: "topic-normalizer.js", topics: () => (window.MODULAR_TOPIC_CATALOG || []).filter((entry) => entry.unit === "Unit 1").map((entry) => ({ name: entry.topic, chapter: "Unit 1" })) },
    "modular-2": { label: "IGCSE Modular Unit 2", script: "topic-normalizer.js", topics: () => (window.MODULAR_TOPIC_CATALOG || []).filter((entry) => entry.unit === "Unit 2").map((entry) => ({ name: entry.topic, chapter: "Unit 2" })) },
    wma11: { label: "IAL Pure 1 WMA11", script: "ial/wma11/wma11-data.js?v=20261020fig", topics: () => (window.WMA11_TOPICS || []).map((topic) => ({ name: topic.name, chapter: "Pure 1" })) },
    wma12: { label: "IAL Pure 2 WMA12", script: "ial/wma12/wma12-data.js?v=20261020fig", topics: () => (window.WMA12_TOPICS || []).map((topic) => ({ name: topic.name, chapter: "Pure 2" })) },
    wma13: { label: "IAL Pure 3 WMA13", script: "ial/wma13/wma13-data.js?v=wma13-20261020", topics: () => (window.WMA13_TOPICS || []).map((topic) => ({ name: topic.name, chapter: "Pure 3" })) },
    wme01: { label: "IAL Mechanics 1 WME01", script: "ial/wme01/wme01-data.js?v=20261020fig", topics: () => (window.WME01_TOPICS || []).map((topic) => ({ name: topic.name, chapter: "Mechanics 1" })) }
  };
  const COURSE_IDS = Object.keys(COURSES);
  const DEFAULT_COURSE = "modular-2"; // PLAN §1.2: always the first-run default
  const COURSE_PREF_KEY = "eliteLessonTrackerCourseV1";

  const view = {
    snapshot: null,
    renderedVersion: -1, // dataVersion of the last completed render (-1 = none)
    refreshing: false,
    refreshQueued: false,
    dataset: null,
    students: [],
    course: DEFAULT_COURSE,
    studentId: null,
    search: "",
    showArchived: false,
    tab: "overview",
    topics: [],
    topicsByCourse: {},
    dashCourse: "",
    report: null,
    editing: false,
    noteOpen: new Set(),
    logStudent: "",
    logCourse: "",
    dupCheckedFor: null
  };

  try {
    const saved = localStorage.getItem(COURSE_PREF_KEY);
    if (saved && COURSES[saved]) view.course = saved;
  } catch (error) { /* first run: Modular Unit 2 */ }

  /* ------------------------------------------------------------- helpers */

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  function toast(message, tone = "ok") {
    const node = $("#ltToast");
    node.textContent = message;
    node.dataset.tone = tone;
    node.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { node.hidden = true; }, 3800);
  }

  async function guard(action, success) {
    try {
      const result = await action();
      if (success) toast(success);
      return result;
    } catch (error) {
      console.error("[teacher-tracker]", error);
      toast(T.friendlyError(error), "error");
      return undefined;
    }
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  function disambiguator(student) {
    if (student.note) return student.note;
    const digits = Core.normalisePhone(student.phone);
    if (digits) return `...${digits.slice(-4)}`;
    return "";
  }

  async function courseTopics(courseKey) {
    const course = COURSES[courseKey] || COURSES[DEFAULT_COURSE];
    if (course.script && !course.topics().length && window.EliteRuntime && window.EliteRuntime.loadScript) {
      await window.EliteRuntime.loadScript(course.script, { id: `ltTopics-${courseKey}` }).catch(() => {});
    }
    return course.topics();
  }

  function selectedStudent() {
    return view.students.find((student) => student.id === view.studentId) || null;
  }

  function currentDoc() {
    const student = selectedStudent();
    if (!student || !view.dataset) return null;
    return (view.dataset.courses[student.id] || {})[view.course] || null;
  }

  /* --------------------------------------------------------------- gate */

  function renderGate(snapshot) {
    const gate = $("#ltGate");
    const app = $("#ltApp");
    $("#ltDemoBanner").hidden = !snapshot.demo;
    if (!snapshot.ready) {
      gate.hidden = false;
      app.hidden = true;
      gate.innerHTML = `<p class="lt-muted">Connecting...</p>`;
      return false;
    }
    if (!snapshot.user) {
      gate.hidden = false;
      app.hidden = true;
      gate.innerHTML = `
        <h2>Teacher sign in</h2>
        <p>Sign in with the teacher Google account to open the lesson tracker.</p>
        <button type="button" class="lt-btn is-primary" data-sign-in>Sign in with Google</button>
        ${snapshot.error ? `<p class="lt-error">${escapeHtml(snapshot.error)}</p>` : ""}`;
      return false;
    }
    if (!snapshot.isTeacher) {
      gate.hidden = false;
      app.hidden = true;
      gate.innerHTML = `
        <h2>Teacher area</h2>
        <p>You are signed in as <b>${escapeHtml(snapshot.user.email)}</b>. This page is for the teacher account only.</p>
        <p>Students can use the <a href="index.html">main site</a> as usual.</p>
        <button type="button" class="lt-btn" data-sign-out>Sign out</button>`;
      return false;
    }
    gate.hidden = true;
    app.hidden = false;
    $("#ltWho").textContent = snapshot.user.email;
    return true;
  }

  function renderSyncBanner() {
    const snap = view.snapshot;
    $("#ltSyncBanner").hidden = !(snap && !snap.demo && snap.syncIssue);
    // V2 sync status pill (feature 9): driven by the data layer's
    // connection state; the red banner above keeps its old behaviour.
    const pill = $("#ltSyncPill");
    if (pill && snap) {
      const labels = {
        cloud: "Cloud synced",
        local: "Local only",
        syncing: "Syncing...",
        demo: "Demo - this browser only"
      };
      pill.textContent = labels[snap.syncState] || "Local only";
      pill.dataset.state = snap.syncState || "local";
    }
  }

  /* ----------------------------------------------------- loading state */
  /* Shown while the teacher is signed in but the dataset has not
     landed yet (or is still empty while the cloud copy is in flight).
     The true empty states ("No students yet...") may only appear after
     a load has COMPLETED with zero students - never before it. */

  function loadingHtml() {
    return `<div class="lt-empty lt-empty-big"><h2>Loading your students&hellip;</h2><p>Your saved records are on their way - this only takes a moment.</p></div>`;
  }

  function renderLoadingState() {
    $("#ltStudentList").innerHTML = `<div class="lt-empty"><p><b>Loading your students&hellip;</b></p><p class="lt-muted">Fetching your saved records.</p></div>`;
    $("#ltOverviewView").innerHTML = loadingHtml();
    $("#ltChecklistView").innerHTML = loadingHtml();
    $("#ltLogView").innerHTML = loadingHtml();
    $("#ltDigest").innerHTML = "";
  }

  /* -------------------------------------------------------------- digest */

  function digestLines() {
    const today = Core.cairoToday();
    const digest = Core.buildDigest(view.dataset, today);
    const lines = [`Lesson tracker - ${formatDate(today)}`, ""];
    const names = Object.keys(digest.byStudent);
    if (!names.length) {
      lines.push("Today: no lessons ticked yet.");
    } else {
      lines.push("Today:");
      names.sort().forEach((name) => {
        const topics = digest.byStudent[name].map((row) => row.topic).join(", ");
        lines.push(`- ${name}: ${topics}`);
      });
    }
    lines.push("", `This week (${formatDate(digest.weekStart)} - ${formatDate(digest.weekEnd)}): ${digest.weekCount} lesson${digest.weekCount === 1 ? "" : "s"} ticked.`);
    return { text: lines.join("\n"), digest, today };
  }

  function renderDigest() {
    const panel = $("#ltDigest");
    if (!view.dataset) { panel.innerHTML = ""; return; }
    const { text, digest, today } = digestLines();
    const names = Object.keys(digest.byStudent).sort();
    const teacherEmail = (Core.teacherEmails()[0] || "");
    panel.innerHTML = `
      <div class="lt-digest-head">
        <div>
          <span class="lt-kicker">Today &middot; ${escapeHtml(formatDate(today))}</span>
          <h2>${names.length ? names.map((name) => `<span class="lt-digest-name">${escapeHtml(name)}</span>`).join("") : "No lessons ticked yet today"}</h2>
          ${names.length ? `<p class="lt-digest-topics">${names.map((name) => `<span><b>${escapeHtml(name)}:</b> ${digest.byStudent[name].map((row) => escapeHtml(row.topic)).join(", ")}</span>`).join("")}</p>` : `<p class="lt-muted">Tick a lesson below and it will appear here.</p>`}
          <p class="lt-muted">This week: ${digest.weekCount} lesson${digest.weekCount === 1 ? "" : "s"} ticked.</p>
        </div>
        <div class="lt-digest-actions">
          <a class="lt-btn" href="mailto:${escapeHtml(teacherEmail)}?subject=${encodeURIComponent(`Lesson tracker - ${formatDate(today)}`)}&body=${encodeURIComponent(text)}">Email me this summary</a>
          <a class="lt-btn" target="_blank" rel="noreferrer" href="https://wa.me/?text=${encodeURIComponent(text)}">WhatsApp it to myself</a>
        </div>
      </div>`;
  }

  /* ---------------------------------------------------------- student list */

  function studentsForCourse() {
    const query = Core.normName(view.search);
    return view.students
      .filter((student) => student.enrolments.includes(view.course))
      .filter((student) => view.showArchived || !student.archived)
      .filter((student) => !query || Core.normName(student.name).includes(query))
      .sort((a, b) => {
        const aDate = a.latestTickByCourse[view.course] || "";
        const bDate = b.latestTickByCourse[view.course] || "";
        if (aDate !== bDate) return aDate < bDate ? 1 : -1;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
  }

  async function renderStudentList() {
    const list = $("#ltStudentList");
    const rows = studentsForCourse();
    if (!rows.length) {
      list.innerHTML = `<div class="lt-empty"><p><b>No students yet for ${escapeHtml(COURSES[view.course].label)}.</b></p><p class="lt-muted">${view.search ? "No one matches that search." : "Add your first student with the button below."}</p></div>`;
      return;
    }
    const docs = view.dataset.courses;
    list.innerHTML = rows.map((student) => {
      const doc = (docs[student.id] || {})[view.course];
      const progress = Core.progressFor(view.topics, (doc && doc.ticks) || {});
      const hint = disambiguator(student);
      return `
      <button type="button" class="lt-student-row${student.id === view.studentId ? " is-active" : ""}${student.archived ? " is-archived" : ""}" data-student="${escapeHtml(student.id)}">
        <span class="lt-student-main">
          <strong>${escapeHtml(student.name)}</strong>
          ${hint ? `<small>${escapeHtml(hint)}</small>` : ""}
        </span>
        <span class="lt-student-meta">
          <b>${progress.pct}%</b>
          <small>${student.latestTickByCourse[view.course] ? `Last: ${escapeHtml(formatDate(student.latestTickByCourse[view.course]))}` : "No lessons yet"}</small>
        </span>
      </button>`;
    }).join("");
  }

  /* ------------------------------------------------------------ checklist */

  function renderChecklist() {
    const panel = $("#ltChecklistView");
    const student = selectedStudent();
    if (!student) {
      panel.innerHTML = `<div class="lt-empty lt-empty-big"><h2>Select a student</h2><p>Choose a student from the list, or add a new one. Their lessons for ${escapeHtml(COURSES[view.course].label)} will appear here.</p></div>`;
      return;
    }
    const doc = currentDoc();
    if (!doc) {
      panel.innerHTML = `
        <div class="lt-student-head">${studentHeaderHtml(student, null)}</div>
        <div class="lt-empty lt-empty-big">
          <h2>${escapeHtml(student.name)} is not enrolled in ${escapeHtml(COURSES[view.course].label)} yet</h2>
          <p>Add this course to their tracker to start ticking lessons.</p>
          <button type="button" class="lt-btn is-primary" data-enrol>Enrol in ${escapeHtml(COURSES[view.course].label)}</button>
        </div>`;
      return;
    }
    const ticks = doc.ticks || {};
    const progress = Core.progressFor(view.topics, ticks);
    const next = Core.nextTopic(view.topics, ticks);
    const unmatched = Core.unmatchedTicks(doc, view.topics);
    const chapters = [];
    view.topics.forEach((topic) => {
      let chapter = chapters.find((item) => item.name === topic.chapter);
      if (!chapter) chapters.push(chapter = { name: topic.chapter, topics: [] });
      chapter.topics.push(topic);
    });

    panel.innerHTML = `
      <div class="lt-student-head">${studentHeaderHtml(student, { progress, next })}</div>
      ${view.editing ? editFormHtml(student) : ""}
      ${unmatched.length ? `<div class="lt-warn"><strong>Unmatched ticks:</strong> ${unmatched.map((name) => escapeHtml(name)).join(", ")} &mdash; these saved lessons no longer match the ${escapeHtml(COURSES[view.course].label)} topic list, so they are kept safe but not shown as rows. Nothing was deleted.</div>` : ""}
      ${next ? `<div class="lt-nextbar"><span>Next lesson: <b>${escapeHtml(next)}</b></span><button type="button" class="lt-btn is-small" data-jump-next>Jump to it</button></div>` : `<div class="lt-nextbar is-done"><span><b>Course complete.</b> Every lesson in ${escapeHtml(COURSES[view.course].label)} is ticked for ${escapeHtml(student.name)}.</span></div>`}
      ${chapters.map((chapter) => {
        const doneCount = chapter.topics.filter((topic) => ticks[topic.name]).length;
        return `
        <fieldset class="lt-chapter">
          <legend>${escapeHtml(chapter.name)} <span class="lt-chapter-count">${doneCount}/${chapter.topics.length}</span></legend>
          ${chapter.topics.map((topic) => rowHtml(topic, ticks[topic.name])).join("")}
        </fieldset>`;
      }).join("")}`;
  }

  function studentHeaderHtml(student, info) {
    const progress = info && info.progress;
    const next = info && info.next;
    const phone = Core.normalisePhone(student.phone);
    const hint = disambiguator(student);
    const lastDate = student.latestTickByCourse[view.course];
    const segments = 20;
    const filled = progress ? Math.round((progress.pct / 100) * segments) : 0;
    return `
      <div class="lt-student-title">
        <div>
          <h2>${escapeHtml(student.name)}${student.archived ? ` <span class="lt-archived-tag">Archived</span>` : ""}</h2>
          <p class="lt-muted">${escapeHtml(COURSES[view.course].label)}${hint ? ` &middot; ${escapeHtml(hint)}` : ""}${lastDate ? ` &middot; Last session ${escapeHtml(formatDate(lastDate))}` : ""}</p>
        </div>
        ${progress ? `<div class="lt-progress">
          <div class="lt-steps" role="img" aria-label="${progress.pct}% complete">${Array.from({ length: segments }, (_, i) => `<i class="${i < filled ? "is-on" : ""}"></i>`).join("")}</div>
          <p><b>${progress.done} of ${progress.total}</b> lessons &middot; ${progress.pct}%</p>
        </div>` : ""}
      </div>
      <div class="lt-student-actions">
        ${next ? `<button type="button" class="lt-btn is-gold is-large lt-done-btn" data-done>&#10003; Done: ${escapeHtml(next)} &mdash; today</button>` : ""}
        ${phone && next ? `<a class="lt-btn" target="_blank" rel="noreferrer" href="https://wa.me/${phone}?text=${encodeURIComponent(`Hi ${student.name}, your next lesson is ${next}.${student.nextSession ? ` Next session: ${formatDate(student.nextSession)}.` : ""}`)}">WhatsApp: next lesson</a>` : ""}
        <button type="button" class="lt-btn" data-edit>${view.editing ? "Close edit" : "Edit student"}</button>
        <button type="button" class="lt-btn" data-archive>${student.archived ? "Unarchive" : "Archive"}</button>
        <button type="button" class="lt-btn is-danger" data-delete>Delete</button>
      </div>
      ${next ? `<p class="lt-next-line">Next lesson: <b>${escapeHtml(next)}</b></p>` : ""}`;
  }

  function editFormHtml(student) {
    const enrolled = new Set(student.enrolments);
    return `
    <form class="lt-form lt-edit-form" id="ltEditForm">
      <h3>Edit student</h3>
      <label class="lt-field"><span>Name</span><input type="text" id="ltEditName" value="${escapeHtml(student.name)}" maxlength="80" required></label>
      <label class="lt-field"><span>WhatsApp number (optional)</span><input type="tel" id="ltEditPhone" value="${escapeHtml(student.phone)}" maxlength="24" placeholder="e.g. 01x xxxx xxxx"></label>
      <label class="lt-field"><span>Note (optional)</span><input type="text" id="ltEditNote" value="${escapeHtml(student.note)}" maxlength="500"></label>
      <fieldset class="lt-enrol">
        <legend>Courses</legend>
        ${COURSE_IDS.map((id) => {
          const doc = (view.dataset.courses[student.id] || {})[id];
          const hasRecords = doc && (Object.keys(doc.ticks || {}).length || Object.keys(doc.tombstones || {}).length);
          return `<label class="lt-checkline"><input type="checkbox" data-enrol-course="${id}" ${enrolled.has(id) ? "checked" : ""} ${enrolled.has(id) && hasRecords ? "disabled" : ""}> ${escapeHtml(COURSES[id].label)}${enrolled.has(id) ? ` <small>(${hasRecords ? "has lesson records" : "no records yet"})</small>` : ""}</label>`;
        }).join("")}
        <p class="lt-muted">Unticking a course with no lesson records removes it. Courses with records stay, so no history is lost.</p>
      </fieldset>
      <div class="lt-form-actions">
        <button type="submit" class="lt-btn is-primary">Save changes</button>
        <button type="button" class="lt-btn" data-edit-cancel>Cancel</button>
      </div>
    </form>`;
  }

  function rowHtml(topic, tick) {
    const ticked = Boolean(tick);
    const noteOpen = view.noteOpen.has(topic.name);
    return `
    <div class="lt-row${ticked ? " is-ticked" : ""}" data-row="${escapeHtml(topic.name)}">
      <label class="lt-tick" title="${ticked ? "Untick" : "Tick as taken"}">
        <input type="checkbox" data-tick="${escapeHtml(topic.name)}" ${ticked ? "checked" : ""}>
        <span class="lt-box" aria-hidden="true">&#10003;</span>
      </label>
      <div class="lt-row-main">
        <span class="lt-topic">${escapeHtml(topic.name)}</span>
        ${ticked ? `<span class="lt-date-wrap">Taken <input type="date" class="lt-date" data-date="${escapeHtml(topic.name)}" value="${escapeHtml(tick.date || "")}"></span>` : `<span class="lt-notyet">Not taken yet</span>`}
        ${noteOpen && ticked ? `
        <div class="lt-note-editor">
          <textarea data-note-text="${escapeHtml(topic.name)}" maxlength="500" rows="2" placeholder="Session note (max 500 characters)">${escapeHtml(tick.note || "")}</textarea>
          <button type="button" class="lt-btn is-small is-primary" data-note-save="${escapeHtml(topic.name)}">Save note</button>
        </div>` : (ticked && tick.note ? `<span class="lt-note-preview">${escapeHtml(tick.note)}</span>` : "")}
      </div>
      ${ticked ? `
      <div class="lt-row-actions">
        <button type="button" class="lt-chip${tick.hw ? " is-on" : ""}" data-hw="${escapeHtml(topic.name)}" title="Homework set">${tick.hw ? "HW set" : "Set HW"}</button>
        <button type="button" class="lt-chip" data-note-toggle="${escapeHtml(topic.name)}">${noteOpen ? "Close" : "Note"}</button>
      </div>` : ""}
    </div>`;
  }

  /* ----------------------------------------------------------------- log */

  function filteredLogRows() {
    let rows = Core.flattenLog(view.dataset);
    if (view.logStudent) rows = rows.filter((row) => row.studentId === view.logStudent);
    if (view.logCourse) rows = rows.filter((row) => row.courseId === view.logCourse);
    return rows;
  }

  function renderLog() {
    const panel = $("#ltLogView");
    const rows = filteredLogRows();
    const studentOptions = [`<option value="">All students</option>`]
      .concat(view.students.filter((s) => !s.archived).map((s) => `<option value="${escapeHtml(s.id)}"${s.id === view.logStudent ? " selected" : ""}>${escapeHtml(s.name)}</option>`)).join("");
    const courseOptions = [`<option value="">All courses</option>`]
      .concat(COURSE_IDS.map((id) => `<option value="${id}"${id === view.logCourse ? " selected" : ""}>${escapeHtml(COURSES[id].label)}</option>`)).join("");
    panel.innerHTML = `
      <div class="lt-log-tools">
        <label class="lt-field"><span>Student</span><select id="ltLogStudent">${studentOptions}</select></label>
        <label class="lt-field"><span>Course</span><select id="ltLogCourse">${courseOptions}</select></label>
        <button type="button" class="lt-btn" data-export ${rows.length ? "" : "disabled"}>Export CSV</button>
      </div>
      <p class="lt-muted">Recorded lessons from current ticks (un-ticking a lesson removes it here). ${rows.length} row${rows.length === 1 ? "" : "s"}.</p>
      ${rows.length ? `<div class="lt-table-wrap"><table class="lt-table">
        <thead><tr><th>Date</th><th>Student</th><th>Course</th><th>Lesson</th><th>HW</th><th>Note</th></tr></thead>
        <tbody>${rows.map((row) => `<tr><td>${escapeHtml(formatDate(row.date))}</td><td>${escapeHtml(row.student)}</td><td>${escapeHtml(COURSES[row.courseId] ? COURSES[row.courseId].label : row.courseId)}</td><td>${escapeHtml(row.topic)}</td><td>${row.hw ? "Yes" : ""}</td><td>${escapeHtml(row.note)}</td></tr>`).join("")}</tbody>
      </table></div>` : `<div class="lt-empty"><p>No recorded lessons match these filters.</p></div>`}`;
  }

  function exportCsv() {
    const rows = filteredLogRows();
    const cell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [["Date", "Student", "Course", "Lesson", "Homework set", "Note"].join(",")]
      .concat(rows.map((row) => [row.date, row.student, COURSES[row.courseId] ? COURSES[row.courseId].label : row.courseId, row.topic, row.hw ? "Yes" : "No", row.note].map(cell).join(",")))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "lessons-log.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  /* ------------------------------------------------------------ overview */
  /* V2 dashboard (TRACKER_V2_PLAN §1.4): stats strip, needs-attention
     cards, recent activity, homework pending. Everything derives from
     Core aggregations over the already-loaded dataset - no new fetch. */

  function stepsBar(progress) {
    const segments = 20;
    const filled = progress ? Math.round((progress.pct / 100) * segments) : 0;
    return `<div class="lt-steps" role="img" aria-label="${progress ? progress.pct : 0}% complete">${Array.from({ length: segments }, (_, i) => `<i class="${i < filled ? "is-on" : ""}"></i>`).join("")}</div>`;
  }

  function cardBadgeHtml(card) {
    const badges = [];
    if (card.badge === "red") badges.push(`<span class="lt-badge is-red">No session for ${card.daysSince} days</span>`);
    else if (card.badge === "amber") badges.push(`<span class="lt-badge is-amber">${card.daysSince} days since last session</span>`);
    else if (card.badge === "new") badges.push(`<span class="lt-badge">No sessions yet</span>`);
    if (card.session.overdue) badges.push(`<span class="lt-badge is-red">Next session overdue</span>`);
    return badges.join("");
  }

  function dashCardHtml(card) {
    const courseLabel = COURSES[card.courseId] ? COURSES[card.courseId].label : card.courseId;
    const phone = Core.normalisePhone(card.phone);
    const key = `${card.studentId}|${card.courseId}`;
    const lastLine = card.lastDate
      ? `Last session ${escapeHtml(formatDate(card.lastDate))}${card.daysSince !== null ? ` &middot; ${card.daysSince === 0 ? "today" : card.daysSince === 1 ? "yesterday" : `${card.daysSince} days ago`}` : ""}`
      : "No sessions recorded yet";
    const waText = card.nextTopic
      ? `Hi ${card.name}, your next lesson is ${card.nextTopic}.${card.nextSession ? ` Next session: ${formatDate(card.nextSession)}.` : ""}`
      : "";
    return `
    <article class="lt-card">
      <div class="lt-card-head">
        <div>
          <h3><button type="button" class="lt-card-name" data-open-student="${escapeHtml(key)}">${escapeHtml(card.name)}</button></h3>
          <p class="lt-muted">${escapeHtml(courseLabel)}</p>
        </div>
        <div class="lt-card-badges">${cardBadgeHtml(card)}</div>
      </div>
      ${card.progress ? `
      ${stepsBar(card.progress)}
      <p class="lt-card-progress"><b>${card.progress.done} of ${card.progress.total}</b> lessons &middot; ${card.progress.pct}%</p>` : `<p class="lt-card-progress lt-muted">Topic list unavailable for this course.</p>`}
      <p class="lt-card-line">${lastLine}</p>
      ${card.nextTopic ? `<p class="lt-card-line">Next lesson: <b>${escapeHtml(card.nextTopic)}</b></p>` : `<p class="lt-card-line"><b>Course complete</b></p>`}
      ${card.nextSession ? `<p class="lt-card-line">Next session: <b>${escapeHtml(formatDate(card.nextSession))}</b>${card.session.overdue ? ` <span class="lt-badge is-red">Overdue</span>` : ""}</p>` : ""}
      <div class="lt-card-actions">
        ${card.nextTopic ? `<button type="button" class="lt-btn is-gold is-small" data-dash-tick="${escapeHtml(key)}">&#10003; ${escapeHtml(card.nextTopic)}</button>` : ""}
        ${phone && card.nextTopic ? `<a class="lt-btn is-small" target="_blank" rel="noreferrer" href="https://wa.me/${phone}?text=${encodeURIComponent(waText)}">WhatsApp</a>` : ""}
        <button type="button" class="lt-btn is-small" data-report="${escapeHtml(key)}">Parent report</button>
      </div>
      <div class="lt-card-session">
        <label class="lt-field"><span>Next session</span><input type="date" data-session-date="${escapeHtml(card.studentId)}" value="${escapeHtml(card.nextSession)}"></label>
        <button type="button" class="lt-btn is-small" data-session-save="${escapeHtml(card.studentId)}">Save</button>
        ${card.nextSession ? `<button type="button" class="lt-btn is-small" data-session-clear="${escapeHtml(card.studentId)}">Clear</button>` : ""}
      </div>
    </article>`;
  }

  function renderOverview() {
    const panel = $("#ltOverviewView");
    if (!view.dataset) { panel.innerHTML = loadingHtml(); return; }
    const today = Core.cairoToday();
    const stats = Core.dashboardStats(view.dataset, view.topicsByCourse, today);
    const query = Core.normName(view.search);
    let cards = Core.dashboardCards(view.dataset, view.topicsByCourse, today);
    if (view.dashCourse) cards = cards.filter((card) => card.courseId === view.dashCourse);
    if (query) cards = cards.filter((card) => Core.normName(card.name).includes(query));
    const feed = Core.activityFeed(view.dataset, 15);
    const pending = Core.homeworkPending(view.dataset);
    const courseOptions = [`<option value="">All courses</option>`]
      .concat(COURSE_IDS.map((id) => `<option value="${id}"${id === view.dashCourse ? " selected" : ""}>${escapeHtml(COURSES[id].label)}</option>`)).join("");

    panel.innerHTML = `
      <div class="lt-stats">
        <div class="lt-stat"><b>${stats.activeStudents}</b><span>Active students</span></div>
        <div class="lt-stat"><b>${stats.sessionsLast7Days}</b><span>Sessions in last 7 days</span></div>
        <div class="lt-stat"><b>${stats.lessonsThisMonth}</b><span>Lessons this month</span></div>
        <div class="lt-stat"><b>${stats.avgProgress}%</b><span>Average progress</span></div>
      </div>
      <div class="lt-dash-tools">
        <label class="lt-field"><span>Show course</span><select id="ltDashCourse">${courseOptions}</select></label>
        <p class="lt-muted">Cards are sorted by who needs attention first - longest since their last session on top. The gold button ticks the next lesson for today; undo it any time from the checklist.</p>
      </div>
      ${cards.length ? `<div class="lt-cards">${cards.map(dashCardHtml).join("")}</div>` : `<div class="lt-empty"><p><b>No student cards to show.</b></p><p class="lt-muted">${query || view.dashCourse ? "Nothing matches the current search/filter." : "Add a student and enrol them in a course to see their card here."}</p></div>`}
      <div class="lt-dash-cols">
        <section class="lt-dash-block" aria-label="Recent activity">
          <h3>Recent activity</h3>
          ${feed.length ? `<ul class="lt-feed">${feed.map((row) => `
            <li>
              <span class="lt-feed-date">${escapeHtml(formatDate(row.date))}</span>
              <span class="lt-feed-main"><b>${escapeHtml(row.student)}</b> &middot; ${escapeHtml(row.topic)} <small>(${escapeHtml(COURSES[row.courseId] ? COURSES[row.courseId].label : row.courseId)})</small></span>
              ${row.hw ? `<span class="lt-chip is-on">HW set</span>` : ""}
            </li>`).join("")}</ul>` : `<p class="lt-muted">No lessons recorded yet.</p>`}
        </section>
        <section class="lt-dash-block" aria-label="Homework pending">
          <h3>Homework pending</h3>
          ${pending.length ? `<ul class="lt-feed">${pending.map((item) => {
            const phone = Core.normalisePhone(item.phone);
            return `
            <li>
              <span class="lt-feed-main"><b>${escapeHtml(item.name)}</b> &middot; ${escapeHtml(item.topic)} <small>(${escapeHtml(formatDate(item.date))})</small></span>
              ${phone ? `<a class="lt-btn is-small" target="_blank" rel="noreferrer" href="https://wa.me/${phone}?text=${encodeURIComponent(`Hi ${item.name}, did you do the homework for ${item.topic}?`)}">Ask on WhatsApp</a>` : `<span class="lt-muted">No phone saved</span>`}
            </li>`;
          }).join("")}</ul>` : `<p class="lt-muted">No homework outstanding - the latest lesson for every student had no homework set.</p>`}
        </section>
      </div>`;
  }

  /* -------------------------------------------------------- parent report */

  function reportContext() {
    if (!view.report) return null;
    const student = (view.dataset.students || {})[view.report.studentId];
    if (!student) return null;
    const courseId = view.report.courseId;
    const doc = ((view.dataset.courses || {})[student.id] || {})[courseId] || null;
    return {
      student,
      courseId,
      courseLabel: COURSES[courseId] ? COURSES[courseId].label : courseId,
      topics: view.topicsByCourse[courseId] || [],
      doc
    };
  }

  function buildReportText() {
    const ctx = reportContext();
    if (!ctx) return "";
    return Core.buildParentReport({
      student: ctx.student,
      courseLabel: ctx.courseLabel,
      topics: ctx.topics,
      doc: ctx.doc,
      teacherNote: $("#ltReportNote").value
    });
  }

  function syncReportModal() {
    const ctx = reportContext();
    if (!ctx) return;
    const text = buildReportText();
    $("#ltReportText").textContent = text;
    $("#ltReportTitle").textContent = `Parent progress report - ${ctx.student.name}`;
    const phone = Core.normalisePhone(ctx.student.phone);
    const link = $("#ltReportWhats");
    link.href = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
  }

  function openReport(studentId, courseId) {
    view.report = { studentId, courseId };
    $("#ltReportNote").value = "";
    syncReportModal();
    $("#ltReportModal").hidden = false;
  }

  function printReport() {
    const ctx = reportContext();
    if (!ctx) return;
    const win = window.open("", "_blank");
    if (!win) {
      toast("Popups are blocked - allow popups to open the print view.", "error");
      return;
    }
    const text = escapeHtml(buildReportText()).replace(/\n/g, "<br>");
    win.document.write(`<!doctype html><html><head><title>Progress report - ${escapeHtml(ctx.student.name)}</title>
      <style>body{font-family:Georgia,serif;color:#0e1b2e;max-width:640px;margin:40px auto;padding:0 20px;line-height:1.7}
      h1{font-size:20px;border-bottom:3px solid #e2b84f;padding-bottom:8px}p{font-size:15px}</style></head>
      <body><h1>Progress report - ${escapeHtml(ctx.student.name)}</h1><p>${text}</p>
      <script>window.onload=function(){window.print()}<\/script></body></html>`);
    win.document.close();
  }

  /* -------------------------------------------------------------- render */

  /* Returns true when a real render happened. When the dataset is
     still empty AND the initial cloud load is in flight, the honest
     loading state is kept instead of a misleading "no students" one,
     and false is returned so the caller does not mark this version as
     rendered - the load-completion snapshot re-runs the render. */
  async function refresh() {
    if (!view.snapshot || !view.snapshot.isTeacher) return false;
    const [students, dataset] = await Promise.all([T.api.listStudents(), T.api.getDataset()]);
    view.students = students;
    view.dataset = dataset;
    if (!students.length && view.snapshot.loading) {
      renderLoadingState();
      return false;
    }
    if (view.studentId && !students.some((s) => s.id === view.studentId)) view.studentId = null;
    if (!view.studentId) {
      const first = studentsForCourse()[0];
      if (first) view.studentId = first.id;
    }
    view.topics = await courseTopics(view.course);
    // V2: the dashboard needs catalogs for every enrolled course.
    const enrolledCourses = new Set();
    students.forEach((student) => student.enrolments.forEach((courseId) => enrolledCourses.add(courseId)));
    for (const courseId of enrolledCourses) {
      if (!view.topicsByCourse[courseId]) view.topicsByCourse[courseId] = await courseTopics(courseId);
    }
    view.topicsByCourse[view.course] = view.topics;
    renderDigest();
    await renderStudentList();
    renderDetail();
    renderSyncBanner();
    return true;
  }

  /* Coalescing render driver: at most one refresh runs at a time, and
     a dataset that lands mid-refresh queues exactly one more run, so a
     late-arriving dataset always ends up rendered. renderedVersion is
     set ONLY after a real render, so a failed or deferred (still
     loading) pass is retried by the next snapshot instead of being
     latched away - the original empty-on-open bug. */
  async function runRefresh(version) {
    if (view.refreshing) { view.refreshQueued = true; return; }
    view.refreshing = true;
    try {
      const rendered = await refresh();
      if (rendered) view.renderedVersion = version;
    } catch (error) {
      console.error("[teacher-tracker] refresh failed; will retry on the next update.", error);
    } finally {
      view.refreshing = false;
      if (view.refreshQueued) {
        view.refreshQueued = false;
        const snap = view.snapshot;
        if (snap && snap.isTeacher && snap.dataReady && snap.dataVersion !== view.renderedVersion) {
          await runRefresh(snap.dataVersion);
        }
      }
    }
  }

  function renderDetail() {
    $$(".lt-tab").forEach((tab) => tab.classList.toggle("is-active", tab.dataset.tab === view.tab));
    $("#ltOverviewView").hidden = view.tab !== "overview";
    $("#ltChecklistView").hidden = view.tab !== "checklist";
    $("#ltLogView").hidden = view.tab !== "log";
    if (view.tab === "overview") renderOverview();
    else if (view.tab === "checklist") renderChecklist();
    else renderLog();
  }

  /* -------------------------------------------------------------- events */

  function bindEvents() {
    document.addEventListener("click", async (event) => {
      const signIn = event.target.closest("[data-sign-in]");
      if (signIn) { await guard(() => T.signIn()); return; }
      const signOut = event.target.closest("[data-sign-out]");
      if (signOut) { await guard(() => T.signOut()); return; }
    });

    $("#ltCourse").addEventListener("change", async (event) => {
      view.course = event.target.value;
      try { localStorage.setItem(COURSE_PREF_KEY, view.course); } catch (error) { /* ignore */ }
      view.studentId = null;
      view.editing = false;
      view.topics = await courseTopics(view.course);
      const first = studentsForCourse()[0];
      if (first) view.studentId = first.id;
      await renderStudentList();
      renderDetail();
    });

    $("#ltSearch").addEventListener("input", (event) => {
      view.search = event.target.value;
      renderStudentList();
      if (view.tab === "overview") renderOverview();
    });

    $("#ltShowArchived").addEventListener("change", (event) => {
      view.showArchived = event.target.checked;
      renderStudentList();
    });

    $("#ltStudentList").addEventListener("click", (event) => {
      const row = event.target.closest("[data-student]");
      if (!row) return;
      view.studentId = row.dataset.student;
      view.editing = false;
      view.tab = "checklist"; // picking a student goes straight to their checklist (audit A12)
      renderStudentList();
      renderDetail();
    });

    /* add student */
    $("#ltAddToggle").addEventListener("click", () => {
      const form = $("#ltAddForm");
      form.hidden = !form.hidden;
      if (!form.hidden) $("#ltAddName").focus();
    });
    $("#ltAddCancel").addEventListener("click", () => {
      $("#ltAddForm").hidden = true;
      $("#ltDupWarning").hidden = true;
    });
    $("#ltAddName").addEventListener("input", () => { view.dupCheckedFor = null; $("#ltDupWarning").hidden = true; });

    $("#ltAddForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const fields = {
        name: $("#ltAddName").value.trim(),
        phone: $("#ltAddPhone").value.trim(),
        note: $("#ltAddNote").value.trim(),
        courseId: view.course
      };
      if (!fields.name) return;
      if (view.dupCheckedFor !== Core.normName(fields.name)) {
        const duplicates = await guard(() => T.api.findDuplicates(fields.name));
        if (duplicates && duplicates.length) {
          view.dupCheckedFor = Core.normName(fields.name);
          const dup = duplicates[0];
          const hint = disambiguator(dup);
          $("#ltDupWarning").innerHTML = `
            <p><b>A student called ${escapeHtml(dup.name)} already exists</b>${hint ? ` (${escapeHtml(hint)})` : ""}${dup.archived ? " - currently archived" : ""}. Open them instead of adding a duplicate?</p>
            <div class="lt-form-actions">
              <button type="button" class="lt-btn is-primary" data-open-existing="${escapeHtml(dup.id)}">Open existing</button>
              <button type="button" class="lt-btn" data-add-anyway>Add anyway</button>
            </div>`;
          $("#ltDupWarning").hidden = false;
          return;
        }
      }
      const student = await guard(() => T.api.addStudent(fields), `Added ${fields.name}`);
      if (!student) return;
      $("#ltAddForm").reset();
      $("#ltAddForm").hidden = true;
      $("#ltDupWarning").hidden = true;
      view.dupCheckedFor = null;
      view.studentId = student.id;
      await refresh();
    });

    $("#ltDupWarning").addEventListener("click", async (event) => {
      const open = event.target.closest("[data-open-existing]");
      if (open) {
        view.studentId = open.dataset.openExisting;
        $("#ltAddForm").hidden = true;
        $("#ltDupWarning").hidden = true;
        view.dupCheckedFor = null;
        await renderStudentList();
        renderDetail();
        return;
      }
      if (event.target.closest("[data-add-anyway]")) {
        view.dupCheckedFor = Core.normName($("#ltAddName").value);
        $("#ltAddForm").requestSubmit();
      }
    });

    /* tabs */
    $$(".lt-tab").forEach((tab) => tab.addEventListener("click", () => {
      view.tab = tab.dataset.tab;
      renderDetail();
    }));

    /* checklist actions (delegated) */
    const detail = $("#ltDetail");
    detail.addEventListener("click", async (event) => {
      const student = selectedStudent();
      const doneBtn = event.target.closest("[data-done]");
      if (doneBtn && student) {
        const doc = currentDoc();
        const next = Core.nextTopic(view.topics, (doc && doc.ticks) || {});
        if (!next) return;
        const ok = await guard(() => T.api.setTick(student.id, view.course, next, { date: Core.cairoToday() }), `Ticked: ${next}`);
        if (ok !== undefined) await refresh();
        return;
      }
      if (event.target.closest("[data-jump-next]") && student) {
        const doc = currentDoc();
        const next = Core.nextTopic(view.topics, (doc && doc.ticks) || {});
        const row = next && detail.querySelector(`[data-row="${CSS.escape(next)}"]`);
        if (row) {
          row.scrollIntoView({ block: "center", behavior: "smooth" });
          row.classList.add("is-flash");
          setTimeout(() => row.classList.remove("is-flash"), 1600);
        }
        return;
      }
      if (event.target.closest("[data-enrol]") && student) {
        const ok = await guard(() => T.api.enrolCourse(student.id, view.course), `Enrolled in ${COURSES[view.course].label}`);
        if (ok !== undefined) await refresh();
        return;
      }
      if (event.target.closest("[data-edit]")) {
        view.editing = !view.editing;
        renderChecklist();
        return;
      }
      if (event.target.closest("[data-edit-cancel]")) {
        view.editing = false;
        renderChecklist();
        return;
      }
      if (event.target.closest("[data-archive]") && student) {
        const ok = await guard(() => T.api.setArchived(student.id, !student.archived), student.archived ? "Student unarchived" : "Student archived");
        if (ok !== undefined) await refresh();
        return;
      }
      if (event.target.closest("[data-delete]") && student) {
        if (!window.confirm(`Delete ${student.name}? All of their lesson records will be permanently deleted. This cannot be undone.`)) return;
        const ok = await guard(() => T.api.deleteStudent(student.id), `Deleted ${student.name}`);
        if (ok !== undefined) {
          view.studentId = null;
          view.editing = false;
          await refresh();
        }
        return;
      }
      const hwBtn = event.target.closest("[data-hw]");
      if (hwBtn && student) {
        const topic = hwBtn.dataset.hw;
        const tick = ((currentDoc() || {}).ticks || {})[topic];
        if (!tick) return;
        const ok = await guard(() => T.api.setTick(student.id, view.course, topic, { hw: !tick.hw }));
        if (ok !== undefined) await refresh();
        return;
      }
      const noteToggle = event.target.closest("[data-note-toggle]");
      if (noteToggle) {
        const topic = noteToggle.dataset.noteToggle;
        if (view.noteOpen.has(topic)) view.noteOpen.delete(topic);
        else view.noteOpen.add(topic);
        renderChecklist();
        return;
      }
      const noteSave = event.target.closest("[data-note-save]");
      if (noteSave && student) {
        const topic = noteSave.dataset.noteSave;
        const textarea = detail.querySelector(`[data-note-text="${CSS.escape(topic)}"]`);
        const ok = await guard(() => T.api.setTick(student.id, view.course, topic, { note: textarea ? textarea.value : "" }), "Note saved");
        if (ok !== undefined) await refresh();
        return;
      }
      if (event.target.closest("[data-export]")) {
        exportCsv();
      }
    });

    detail.addEventListener("change", async (event) => {
      const student = selectedStudent();
      if (!student) return;
      const tickBox = event.target.closest("[data-tick]");
      if (tickBox) {
        const topic = tickBox.dataset.tick;
        if (tickBox.checked) {
          const ok = await guard(() => T.api.setTick(student.id, view.course, topic, { date: Core.cairoToday() }), `Ticked: ${topic}`);
          if (ok !== undefined) await refresh();
        } else {
          const tick = ((currentDoc() || {}).ticks || {})[topic] || {};
          if ((tick.note || tick.hw) && !window.confirm("This lesson has a note or homework flag saved. Remove the tick anyway?")) {
            tickBox.checked = true;
            return;
          }
          const ok = await guard(() => T.api.clearTick(student.id, view.course, topic), `Unticked: ${topic}`);
          if (ok !== undefined) await refresh();
        }
        return;
      }
      const dateInput = event.target.closest("[data-date]");
      if (dateInput && dateInput.value) {
        const ok = await guard(() => T.api.setTick(student.id, view.course, dateInput.dataset.date, { date: dateInput.value }), "Date updated");
        if (ok !== undefined) await refresh();
      }
    });

    detail.addEventListener("submit", async (event) => {
      if (event.target.id !== "ltEditForm") return;
      event.preventDefault();
      const student = selectedStudent();
      if (!student) return;
      const fields = {
        name: $("#ltEditName").value.trim(),
        phone: $("#ltEditPhone").value.trim(),
        note: $("#ltEditNote").value.trim()
      };
      const ok = await guard(() => T.api.updateStudent(student.id, fields));
      if (ok === undefined) return;
      const checks = $$("[data-enrol-course]", event.target);
      for (const check of checks) {
        const courseId = check.dataset.enrolCourse;
        const isEnrolled = student.enrolments.includes(courseId);
        if (check.checked && !isEnrolled) await guard(() => T.api.enrolCourse(student.id, courseId));
        if (!check.checked && isEnrolled && !check.disabled) await guard(() => T.api.removeCourse(student.id, courseId));
      }
      view.editing = false;
      toast("Student updated");
      await refresh();
    });

    detail.addEventListener("change", (event) => {
      if (event.target.id === "ltLogStudent") { view.logStudent = event.target.value; renderLog(); }
      if (event.target.id === "ltLogCourse") { view.logCourse = event.target.value; renderLog(); }
    });

    $("#ltClearLocal").addEventListener("click", () => {
      if (!window.confirm("Clear the local copy of tracker data on this device? Cloud data (if synced) is not affected. You will need to sign in again to reload it.")) return;
      T.clearLocalCopies();
      toast("Local copy cleared. Reloading...");
      setTimeout(() => window.location.reload(), 600);
    });

    /* V2: overview dashboard actions (delegated) */
    const overview = $("#ltOverviewView");
    overview.addEventListener("click", async (event) => {
      const splitKey = (value) => String(value || "").split("|");
      const tickBtn = event.target.closest("[data-dash-tick]");
      if (tickBtn) {
        const [studentId, courseId] = splitKey(tickBtn.dataset.dashTick);
        const topics = view.topicsByCourse[courseId] || [];
        const doc = ((view.dataset.courses[studentId] || {})[courseId]) || null;
        const next = Core.nextTopic(topics, (doc && doc.ticks) || {});
        if (!next) return;
        const ok = await guard(() => T.api.setTick(studentId, courseId, next, { date: Core.cairoToday() }), `Ticked: ${next} (undo from the checklist)`);
        if (ok !== undefined) await refresh();
        return;
      }
      const openBtn = event.target.closest("[data-open-student]");
      if (openBtn) {
        const [studentId, courseId] = splitKey(openBtn.dataset.openStudent);
        view.studentId = studentId;
        view.editing = false;
        if (courseId && COURSES[courseId] && courseId !== view.course) {
          view.course = courseId;
          $("#ltCourse").value = courseId;
          try { localStorage.setItem(COURSE_PREF_KEY, courseId); } catch (error) { /* ignore */ }
          view.topics = await courseTopics(courseId);
        }
        view.tab = "checklist";
        await renderStudentList();
        renderDetail();
        return;
      }
      const reportBtn = event.target.closest("[data-report]");
      if (reportBtn) {
        const [studentId, courseId] = splitKey(reportBtn.dataset.report);
        openReport(studentId, courseId);
        return;
      }
      const saveBtn = event.target.closest("[data-session-save]");
      if (saveBtn) {
        const studentId = saveBtn.dataset.sessionSave;
        const input = overview.querySelector(`[data-session-date="${CSS.escape(studentId)}"]`);
        const ok = await guard(() => T.api.setNextSession(studentId, input ? input.value : ""), "Next session saved");
        if (ok !== undefined) await refresh();
        return;
      }
      const clearBtn = event.target.closest("[data-session-clear]");
      if (clearBtn) {
        const ok = await guard(() => T.api.setNextSession(clearBtn.dataset.sessionClear, ""), "Next session cleared");
        if (ok !== undefined) await refresh();
      }
    });
    overview.addEventListener("change", (event) => {
      if (event.target.id === "ltDashCourse") {
        view.dashCourse = event.target.value;
        renderOverview();
      }
    });

    /* V2: parent report modal */
    $("#ltReportNote").addEventListener("input", syncReportModal);
    $("#ltReportClose").addEventListener("click", () => { $("#ltReportModal").hidden = true; });
    $("#ltReportModal").addEventListener("click", (event) => {
      if (event.target.id === "ltReportModal") event.target.hidden = true;
    });
    $("#ltReportCopy").addEventListener("click", async () => {
      const text = buildReportText();
      try {
        await navigator.clipboard.writeText(text);
        toast("Report copied - paste it anywhere");
      } catch (error) {
        toast("Copy was blocked by the browser - select the text and copy it manually.", "error");
      }
    });
    $("#ltReportPrint").addEventListener("click", printReport);

    /* V2: backup export / import (merge, never blind-overwrite) */
    $("#ltExportBackup").addEventListener("click", async () => {
      const json = await guard(() => T.api.exportAll());
      if (json === undefined) return;
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `lesson-tracker-backup-${Core.cairoToday()}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast("Backup downloaded");
    });
    $("#ltImportBackup").addEventListener("click", () => $("#ltImportFile").click());
    $("#ltImportFile").addEventListener("change", async (event) => {
      const file = event.target.files && event.target.files[0];
      event.target.value = "";
      if (!file) return;
      let text = "";
      try { text = await file.text(); } catch (error) { /* handled below */ }
      const imported = text ? Core.parseImport(text) : null;
      if (!imported) {
        toast("That file is not a valid tracker backup.", "error");
        return;
      }
      const studentCount = Object.keys(imported.students).length;
      const tickCount = Object.values(imported.courses || {}).reduce(
        (sum, byCourse) => sum + Object.values(byCourse).reduce((s, doc) => s + Object.keys(doc.ticks || {}).length, 0), 0);
      if (!window.confirm(`Import this backup (${studentCount} student${studentCount === 1 ? "" : "s"}, ${tickCount} ticked lessons)?\n\nIt is MERGED with your current records: for every entry the newer version wins, deleted students stay deleted, and nothing newer is overwritten.`)) return;
      const result = await guard(() => T.api.importAll(imported), "Backup imported and merged");
      if (result !== undefined) await refresh();
    });
  }

  /* ---------------------------------------------------------------- init */

  function init() {
    const select = $("#ltCourse");
    select.innerHTML = COURSE_IDS.map((id) => `<option value="${id}"${id === view.course ? " selected" : ""}>${escapeHtml(COURSES[id].label)}</option>`).join("");
    bindEvents();
    T.onChange(async (snapshot) => {
      view.snapshot = snapshot;
      const passed = renderGate(snapshot);
      renderSyncBanner();
      if (!passed) {
        view.renderedVersion = -1;
        return;
      }
      if (!snapshot.dataReady) {
        // Teacher signed in, but no dataset has landed yet (the cloud
        // load emits a "syncing" snapshot before it assigns one). Show
        // the honest loading state and consume NOTHING: when the load
        // completes, its snapshot carries dataReady + a new
        // dataVersion and the render below runs then.
        renderLoadingState();
        return;
      }
      // Render whenever the dataset is newer than the last completed
      // render: first load, mirror-then-cloud merge, re-sign-in, an
      // import - any late-arriving dataset re-renders everything.
      if (snapshot.dataVersion !== view.renderedVersion) {
        await runRefresh(snapshot.dataVersion);
      }
    });
    T.init();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
