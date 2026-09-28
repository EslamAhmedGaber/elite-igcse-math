/* ==========================================================================
   teacher-groups.js - Teacher dashboard: groups, students, weekly exams,
   marks entry, publishing results and topics covered.
   Data layer: class-cloud.js (window.EliteClassroom).
   ========================================================================== */
(function () {
  "use strict";

  const C = window.EliteClassroom;
  const $ = (selector, rootNode = document) => rootNode.querySelector(selector);
  const $$ = (selector, rootNode = document) => [...rootNode.querySelectorAll(selector)];

  const COURSES = {
    linear: { label: "IGCSE Linear 4MA1", script: "topic-normalizer.js", topics: () => (window.LINEAR_TOPIC_CATALOG || []).map((entry) => ({ name: entry.topic, chapter: entry.unit })) },
    "modular-1": { label: "IGCSE Modular Unit 1", script: "topic-normalizer.js", topics: () => (window.MODULAR_TOPIC_CATALOG || []).filter((entry) => entry.unit === "Unit 1").map((entry) => ({ name: entry.topic, chapter: "Unit 1" })) },
    "modular-2": { label: "IGCSE Modular Unit 2", script: "topic-normalizer.js", topics: () => (window.MODULAR_TOPIC_CATALOG || []).filter((entry) => entry.unit === "Unit 2").map((entry) => ({ name: entry.topic, chapter: "Unit 2" })) },
    wma11: { label: "IAL Pure 1 WMA11", script: "ial/wma11/wma11-data.js?v=20260817b", topics: () => (window.WMA11_TOPICS || []).map((topic) => ({ name: topic.name, chapter: "Pure 1" })) },
    wma12: { label: "IAL Pure 2 WMA12", script: "ial/wma12/wma12-data.js?v=20260611a", topics: () => (window.WMA12_TOPICS || []).map((topic) => ({ name: topic.name, chapter: "Pure 2" })) },
    wme01: { label: "IAL Mechanics 1 WME01", script: "ial/wme01/wme01-data.js?v=20260613a", topics: () => (window.WME01_TOPICS || []).map((topic) => ({ name: topic.name, chapter: "Mechanics 1" })) },
    other: { label: "Other / mixed", script: "", topics: () => [] }
  };

  const view = {
    groups: [],
    group: null,
    members: [],
    exams: [],
    exam: null,
    tab: "exams"
  };

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));
  }

  function toast(message, tone = "ok") {
    const node = $("#tgToast");
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
      console.error("[teacher-groups]", error);
      toast(C.friendlyError(error), "error");
      return undefined;
    }
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  /* ---------------------------------------------------------------- auth */

  function renderGate(snapshot) {
    const gate = $("#tgGate");
    const app = $("#tgApp");
    $("#tgDemoFlag").hidden = !snapshot.demo;
    if (!snapshot.ready) {
      gate.hidden = false;
      app.hidden = true;
      gate.innerHTML = `<p class="cls-muted">Connecting...</p>`;
      return false;
    }
    if (!snapshot.user) {
      gate.hidden = false;
      app.hidden = true;
      gate.innerHTML = `
        <h2>Teacher sign in</h2>
        <p>Sign in with the teacher Google account to manage groups, exams and results.</p>
        <button type="button" class="cls-btn is-primary" data-sign-in>Sign in with Google</button>
        ${snapshot.error ? `<p class="cls-error">${escapeHtml(snapshot.error)}</p>` : ""}`;
      return false;
    }
    if (!snapshot.isTeacher) {
      gate.hidden = false;
      app.hidden = true;
      gate.innerHTML = `
        <h2>Teacher area</h2>
        <p>You are signed in as <b>${escapeHtml(snapshot.user.email)}</b>. This page is for the teacher account only.</p>
        <p>Students see their results on the <a href="results.html">My Results</a> page.</p>
        <button type="button" class="cls-btn" data-sign-out>Sign out</button>`;
      return false;
    }
    gate.hidden = true;
    app.hidden = false;
    $("#tgWho").textContent = snapshot.user.email;
    return true;
  }

  /* -------------------------------------------------------------- groups */

  async function loadGroups(selectCode) {
    view.groups = (await guard(() => C.api.listGroups())) || [];
    renderGroupList();
    const code = selectCode || view.group?.code || view.groups[0]?.code;
    if (code) await openGroup(code);
    else renderGroupDetail();
  }

  function renderGroupList() {
    $("#tgGroupList").innerHTML = view.groups.map((group) => `
      <button type="button" class="cls-group-chip${view.group?.code === group.code ? " is-active" : ""}" data-open-group="${escapeHtml(group.code)}">
        <strong>${escapeHtml(group.name)}</strong>
        <span>${escapeHtml(COURSES[group.course]?.label || "Group")} &middot; code ${escapeHtml(group.code)}</span>
      </button>`).join("") || `<p class="cls-muted">No groups yet. Create your first group.</p>`;
  }

  async function openGroup(code) {
    const group = await guard(() => C.api.getGroup(code));
    if (!group) return;
    view.group = group;
    view.exam = null;
    [view.members, view.exams] = await Promise.all([
      guard(() => C.api.listMembers(code)).then((rows) => rows || []),
      guard(() => C.api.listExams(code)).then((rows) => rows || [])
    ]);
    renderGroupList();
    renderGroupDetail();
  }

  function renderGroupDetail() {
    const panel = $("#tgDetail");
    if (!view.group) {
      panel.innerHTML = `<div class="cls-empty"><h2>Create a group to begin</h2><p>A group is one class, for example <b>Orbit</b>. Students join it with its code and see their own results.</p></div>`;
      return;
    }
    const group = view.group;
    const published = view.exams.filter((exam) => exam.published);
    const lastPublished = published[0];
    panel.innerHTML = `
      <header class="cls-detail-head">
        <div>
          <span class="cls-kicker">${escapeHtml(COURSES[group.course]?.label || "Group")}</span>
          <h2>${escapeHtml(group.name)}</h2>
          <p>Join code <b class="cls-code">${escapeHtml(group.code)}</b> &middot; ${view.members.length} student${view.members.length === 1 ? "" : "s"} &middot; ${view.exams.length} exam${view.exams.length === 1 ? "" : "s"}</p>
        </div>
        <div class="cls-head-stats">
          <div><strong>${lastPublished ? `${lastPublished.stats?.averagePct ?? 0}%` : "-"}</strong><span>last average</span></div>
          <div><strong>${(group.topicsCovered || []).length}</strong><span>topics covered</span></div>
        </div>
      </header>
      <nav class="cls-tabs" role="tablist">
        ${[["exams", "Exams & marks"], ["students", "Students"], ["topics", "Topics covered"], ["share", "Share with students"], ["settings", "Group settings"]].map(([key, label]) => `<button type="button" role="tab" aria-selected="${view.tab === key}" data-tab="${key}">${label}</button>`).join("")}
      </nav>
      <section class="cls-tab-panel" id="tgTabPanel"></section>`;
    renderTab();
  }

  function renderTab() {
    const panel = $("#tgTabPanel");
    if (!panel) return;
    ({ exams: renderExams, students: renderStudents, topics: renderTopics, share: renderShare, settings: renderSettings })[view.tab](panel);
  }

  /* ------------------------------------------------------------ students */

  function renderStudents(panel) {
    panel.innerHTML = `
      <form class="cls-inline-form" id="tgAddStudent">
        <label>Student name <input name="name" required maxlength="60" placeholder="e.g. Omar Hassan"></label>
        <label>Email <small>(the Google account they sign in with)</small> <input name="email" type="email" maxlength="120" placeholder="student@gmail.com"></label>
        <button type="submit" class="cls-btn is-primary">Add student</button>
      </form>
      <p class="cls-muted">Students can also join by themselves: they sign in on <b>My Results</b> and type the code <b>${escapeHtml(view.group.code)}</b>. A student without an email can still get marks; they just cannot view results online.</p>
      <table class="cls-table">
        <thead><tr><th>Name</th><th>Email</th><th>Status</th><th></th></tr></thead>
        <tbody>${view.members.map((member) => `
          <tr>
            <td><strong>${escapeHtml(member.name)}</strong></td>
            <td>${escapeHtml(member.email || "-")}</td>
            <td>${member.uid ? `<span class="cls-pill is-ok">Joined online</span>` : member.email ? `<span class="cls-pill">Invited</span>` : `<span class="cls-pill is-muted">Offline only</span>`}</td>
            <td class="cls-right"><button type="button" class="cls-link is-danger" data-remove-member="${escapeHtml(member.id)}">Remove</button></td>
          </tr>`).join("") || `<tr><td colspan="4" class="cls-muted">No students yet.</td></tr>`}
        </tbody>
      </table>`;
  }

  /* --------------------------------------------------------------- exams */

  function renderExams(panel) {
    if (view.exam) {
      renderMarks(panel);
      return;
    }
    panel.innerHTML = `
      <form class="cls-inline-form" id="tgAddExam">
        <label>Exam title <input name="title" required maxlength="80" placeholder="e.g. Week 5 quiz: Surds"></label>
        <label>Date <input name="date" type="date" required value="${today()}"></label>
        <label>Out of <input name="maxMarks" type="number" min="1" max="500" required value="40"></label>
        <button type="submit" class="cls-btn is-primary">Create exam</button>
      </form>
      <div class="cls-exam-list">
        ${view.exams.map((exam) => `
          <article class="cls-exam-card">
            <div>
              <strong>${escapeHtml(exam.title)}</strong>
              <span>${formatDate(exam.date)} &middot; out of ${exam.maxMarks}</span>
            </div>
            <div class="cls-exam-meta">
              ${exam.published ? `<span class="cls-pill is-ok">Published</span>` : `<span class="cls-pill">Draft</span>`}
              ${exam.stats?.count ? `<span>${exam.stats.count} marked &middot; avg ${exam.stats.averagePct}%</span>` : `<span class="cls-muted">No marks yet</span>`}
              <button type="button" class="cls-btn" data-open-exam="${escapeHtml(exam.id)}">Enter marks</button>
            </div>
          </article>`).join("") || `<p class="cls-muted">No exams yet. Create this week's exam above.</p>`}
      </div>`;
  }

  async function openExam(examId) {
    const exam = view.exams.find((item) => item.id === examId);
    if (!exam) return;
    const scores = (await guard(() => C.api.listScores(view.group.code, examId))) || [];
    view.exam = { ...exam, scores: Object.fromEntries(scores.map((row) => [row.id, row.score])) };
    renderGroupDetail();
  }

  function marksRows() {
    return view.members.map((member) => {
      const input = $(`[data-mark="${CSS.escape(member.id)}"]`);
      const raw = input ? input.value.trim() : view.exam.scores[member.id];
      return { member, raw: raw === undefined || raw === null ? "" : String(raw) };
    });
  }

  function liveStats() {
    const max = Number(view.exam.maxMarks);
    const rows = marksRows()
      .filter((row) => row.raw !== "" && Number.isFinite(Number(row.raw)))
      .map((row) => ({ name: row.member.name, score: Number(row.raw) }));
    return C.computeStats(rows, max);
  }

  function renderMarks(panel) {
    const exam = view.exam;
    panel.innerHTML = `
      <div class="cls-marks-head">
        <button type="button" class="cls-link" data-back-exams>&larr; All exams</button>
        <div>
          <h3>${escapeHtml(exam.title)}</h3>
          <p>${formatDate(exam.date)} &middot; out of <b>${exam.maxMarks}</b> &middot; ${exam.published ? `<span class="cls-pill is-ok">Published</span>` : `<span class="cls-pill">Draft: students cannot see it yet</span>`}</p>
        </div>
      </div>
      ${view.members.length ? "" : `<p class="cls-error">Add students first (Students tab), then enter marks here.</p>`}
      <div class="cls-marks-layout">
        <table class="cls-table cls-marks">
          <thead><tr><th>Student</th><th>Mark</th><th>%</th></tr></thead>
          <tbody>${view.members.map((member, index) => {
            const value = exam.scores[member.id] ?? "";
            return `<tr>
              <td><strong>${escapeHtml(member.name)}</strong>${member.email ? `<small>${escapeHtml(member.email)}</small>` : ""}</td>
              <td><input class="cls-mark-input" data-mark="${escapeHtml(member.id)}" data-index="${index}" inputmode="decimal" value="${escapeHtml(value)}" placeholder="absent" aria-label="Mark for ${escapeHtml(member.name)}"> <span class="cls-muted">/ ${exam.maxMarks}</span></td>
              <td class="cls-pct" data-pct="${escapeHtml(member.id)}"></td>
            </tr>`;
          }).join("")}</tbody>
        </table>
        <aside class="cls-live" id="tgLive"></aside>
      </div>
      <div class="cls-actions">
        <button type="button" class="cls-btn is-primary" data-save-marks>Save marks</button>
        <button type="button" class="cls-btn ${exam.published ? "" : "is-gold"}" data-toggle-publish>${exam.published ? "Unpublish" : "Save & publish to students"}</button>
        <button type="button" class="cls-link is-danger" data-delete-exam>Delete exam</button>
      </div>
      <p class="cls-muted">Tip: type a mark and press Enter to jump to the next student. Leave a box empty for absent students; they are not counted in the average.</p>`;
    updateLive();
    $(".cls-mark-input", panel)?.focus();
  }

  function updateLive() {
    const node = $("#tgLive");
    if (!node || !view.exam) return;
    const max = Number(view.exam.maxMarks);
    marksRows().forEach(({ member, raw }) => {
      const cell = $(`[data-pct="${CSS.escape(member.id)}"]`);
      const input = $(`[data-mark="${CSS.escape(member.id)}"]`);
      const value = Number(raw);
      const invalid = raw !== "" && (!Number.isFinite(value) || value < 0 || value > max);
      input?.classList.toggle("is-invalid", invalid);
      if (cell) cell.textContent = raw === "" || invalid ? "" : `${Math.round((value / max) * 100)}%`;
    });
    const stats = liveStats();
    node.innerHTML = `
      <h4>Live summary</h4>
      <div class="cls-live-grid">
        <div><strong>${stats.count}</strong><span>marked</span></div>
        <div><strong>${stats.count ? stats.averagePct : 0}%</strong><span>average</span></div>
        <div><strong>${stats.count ? stats.highest : "-"}</strong><span>highest</span></div>
      </div>
      <h4>Top three</h4>
      <ol class="cls-podium">${stats.top.map((row) => `<li data-place="${row.place}"><b>${row.place}</b><span>${escapeHtml(row.name)}</span><em>${row.score}</em></li>`).join("") || `<li class="cls-muted">Enter marks to see the top three.</li>`}</ol>
      <p class="cls-muted">Students see their own mark, this average and the top three. They never see other students' marks.</p>`;
  }

  function collectMarks() {
    const max = Number(view.exam.maxMarks);
    const rows = [];
    for (const { member, raw } of marksRows()) {
      if (raw === "") continue;
      const value = Number(raw);
      if (!Number.isFinite(value) || value < 0 || value > max) {
        throw new Error(`${member.name}: the mark must be between 0 and ${max}.`);
      }
      rows.push({ id: member.id, name: member.name, email: member.email || "", score: value, maxMarks: max });
    }
    return rows;
  }

  async function saveMarks({ publish } = {}) {
    let rows;
    try {
      rows = collectMarks();
    } catch (error) {
      toast(error.message, "error");
      return;
    }
    const exam = view.exam;
    const stats = C.computeStats(rows, exam.maxMarks);
    const published = publish === undefined ? Boolean(exam.published) : publish;
    const ok = await guard(async () => {
      await C.api.saveScores(view.group.code, exam.id, rows);
      await C.api.saveExam(view.group.code, { id: exam.id, title: exam.title, date: exam.date, maxMarks: Number(exam.maxMarks), published, stats, ...(published && !exam.published ? { publishedAt: new Date().toISOString() } : {}) });
      return true;
    }, published && !exam.published ? "Marks saved and published. Students can see their results now." : published === false && exam.published ? "Unpublished. Students no longer see this exam." : "Marks saved.");
    if (!ok) return;
    view.exams = (await guard(() => C.api.listExams(view.group.code))) || view.exams;
    view.exam = { ...view.exams.find((item) => item.id === exam.id), scores: Object.fromEntries(rows.map((row) => [row.id, row.score])) };
    renderGroupDetail();
  }

  /* -------------------------------------------------------------- topics */

  async function courseTopics(courseKey) {
    const course = COURSES[courseKey] || COURSES.other;
    if (course.script && !course.topics().length && window.EliteRuntime?.loadScript) {
      await window.EliteRuntime.loadScript(course.script, { id: `tgTopics-${courseKey}` }).catch(() => {});
    }
    return course.topics();
  }

  async function renderTopics(panel) {
    panel.innerHTML = `<p class="cls-muted">Loading topics...</p>`;
    const topics = await courseTopics(view.group.course);
    const covered = new Set(view.group.topicsCovered || []);
    if (!topics.length) {
      panel.innerHTML = `<p class="cls-muted">This group has no course topic list. Choose a course in Group settings to track topics.</p>`;
      return;
    }
    const chapters = [];
    topics.forEach((topic) => {
      let chapter = chapters.find((item) => item.name === topic.chapter);
      if (!chapter) chapters.push(chapter = { name: topic.chapter, topics: [] });
      chapter.topics.push(topic.name);
    });
    const done = topics.filter((topic) => covered.has(topic.name)).length;
    panel.innerHTML = `
      <div class="cls-progress-line"><strong>${done} of ${topics.length} topics covered</strong><div class="cls-bar"><i style="width:${Math.round((done / topics.length) * 100)}%"></i></div></div>
      <form id="tgTopicsForm">
        ${chapters.map((chapter) => `
          <fieldset class="cls-chapter">
            <legend>${escapeHtml(chapter.name)} <button type="button" class="cls-link" data-check-chapter>Tick all</button></legend>
            ${chapter.topics.map((name) => `<label class="cls-check"><input type="checkbox" value="${escapeHtml(name)}"${covered.has(name) ? " checked" : ""}> <span>${escapeHtml(name)}</span></label>`).join("")}
          </fieldset>`).join("")}
        <div class="cls-actions"><button type="submit" class="cls-btn is-primary">Save topics covered</button></div>
      </form>`;
  }

  /* --------------------------------------------------------------- share */

  function renderShare(panel) {
    const link = new URL("results.html", window.location.href);
    link.search = "";
    link.searchParams.set("code", view.group.code);
    if (C.demo) link.searchParams.set("demo", "1");
    const message = `Hello ${view.group.name}! Your results are on the Elite Mathematics website.\n1) Open ${link.toString()}\n2) Sign in with your Google account\n3) Enter the group code: ${view.group.code}\nGood luck, Dr Eslam`;
    panel.innerHTML = `
      <div class="cls-share">
        <div>
          <h3>How students see their results</h3>
          <ol>
            <li>Open <b>My Results</b> (link below).</li>
            <li>Sign in with their Google account.</li>
            <li>Type the group code <b class="cls-code">${escapeHtml(view.group.code)}</b> once.</li>
          </ol>
          <p class="cls-muted">They see their own mark for every published exam, the group average, the top three, their progress chart, badges and the topics covered.</p>
        </div>
        <label>Link <input readonly value="${escapeHtml(link.toString())}" data-select-all></label>
        <label>Message for the group <textarea readonly rows="6" data-select-all>${escapeHtml(message)}</textarea></label>
        <div class="cls-actions">
          <button type="button" class="cls-btn" data-copy="${escapeHtml(message)}">Copy message</button>
          <a class="cls-btn is-primary" target="_blank" rel="noreferrer" href="https://wa.me/?text=${encodeURIComponent(message)}">Send on WhatsApp</a>
        </div>
      </div>`;
  }

  /* ------------------------------------------------------------ settings */

  function courseOptions(selected) {
    return Object.entries(COURSES).map(([key, course]) => `<option value="${key}"${key === selected ? " selected" : ""}>${escapeHtml(course.label)}</option>`).join("");
  }

  function renderSettings(panel) {
    panel.innerHTML = `
      <form class="cls-inline-form" id="tgGroupSettings">
        <label>Group name <input name="name" required maxlength="60" value="${escapeHtml(view.group.name)}"></label>
        <label>Course <select name="course">${courseOptions(view.group.course)}</select></label>
        <button type="submit" class="cls-btn is-primary">Save</button>
      </form>
      <p class="cls-muted">The join code <b>${escapeHtml(view.group.code)}</b> cannot change, because students already use it.</p>
      <div class="cls-danger-zone">
        <strong>Delete this group</strong>
        <p>Removes the group from your list. Type the code to confirm.</p>
        <input id="tgDeleteConfirm" placeholder="${escapeHtml(view.group.code)}" aria-label="Type the group code to confirm deletion">
        <button type="button" class="cls-btn is-danger" data-delete-group>Delete group</button>
      </div>`;
  }

  /* -------------------------------------------------------------- events */

  document.addEventListener("click", async (event) => {
    const target = event.target.closest("button, a");
    if (!target) return;
    if (target.matches("[data-sign-in]")) {
      await guard(() => C.signIn());
    } else if (target.matches("[data-sign-out]")) {
      await guard(() => C.signOut());
    } else if (target.matches("[data-open-group]")) {
      view.tab = "exams";
      await openGroup(target.dataset.openGroup);
    } else if (target.matches("[data-tab]")) {
      view.tab = target.dataset.tab;
      view.exam = null;
      renderGroupDetail();
    } else if (target.matches("[data-open-exam]")) {
      await openExam(target.dataset.openExam);
    } else if (target.matches("[data-back-exams]")) {
      view.exam = null;
      renderTab();
    } else if (target.matches("[data-save-marks]")) {
      await saveMarks();
    } else if (target.matches("[data-toggle-publish]")) {
      await saveMarks({ publish: !view.exam.published });
    } else if (target.matches("[data-delete-exam]")) {
      if (!window.confirm(`Delete "${view.exam.title}" and all its marks?`)) return;
      await guard(() => C.api.deleteExam(view.group.code, view.exam.id), "Exam deleted.");
      await openGroup(view.group.code);
    } else if (target.matches("[data-remove-member]")) {
      const member = view.members.find((item) => item.id === target.dataset.removeMember);
      if (!member || !window.confirm(`Remove ${member.name} from ${view.group.name}? Their past marks stay in the exams.`)) return;
      await guard(() => C.api.removeMember(view.group.code, member.id), "Student removed.");
      await openGroup(view.group.code);
      view.tab = "students";
      renderGroupDetail();
    } else if (target.matches("[data-check-chapter]")) {
      const boxes = $$("input[type=checkbox]", target.closest("fieldset"));
      const all = boxes.every((box) => box.checked);
      boxes.forEach((box) => { box.checked = !all; });
    } else if (target.matches("[data-copy]")) {
      await navigator.clipboard?.writeText(target.dataset.copy).then(() => toast("Message copied."), () => toast("Select the message and copy it.", "error"));
    } else if (target.matches("[data-delete-group]")) {
      if (C.normCode($("#tgDeleteConfirm").value) !== view.group.code) {
        toast("Type the group code exactly to delete it.", "error");
        return;
      }
      await guard(() => C.api.deleteGroup(view.group.code), "Group deleted.");
      view.group = null;
      await loadGroups();
    } else if (target.matches("[data-new-group]")) {
      $("#tgNewGroup").hidden = !$("#tgNewGroup").hidden;
      $("#tgNewGroup input[name=name]")?.focus();
    }
  });

  document.addEventListener("submit", async (event) => {
    const form = event.target;
    if (!form.matches("form")) return;
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    if (form.id === "tgNewGroup") {
      const code = C.normCode(data.code || data.name);
      if (!code) return toast("Choose a group code (letters and numbers).", "error");
      if (view.groups.some((group) => group.code === code)) return toast(`The code ${code} is already used by another group.`, "error");
      const saved = await guard(() => C.api.saveGroup({ name: data.name.trim(), code, course: data.course, topicsCovered: [] }), `Group ${data.name.trim()} created. Join code: ${code}`);
      if (saved) {
        form.reset();
        form.hidden = true;
        view.tab = "students";
        await loadGroups(saved);
      }
    } else if (form.id === "tgAddStudent") {
      const name = data.name.trim();
      const email = C.normEmail(data.email);
      if (email && view.members.some((member) => member.id === email)) return toast("That email is already in this group.", "error");
      await guard(() => C.api.saveMember(view.group.code, { name, email, addedBy: "teacher" }), `${name} added.`);
      await openGroup(view.group.code);
      view.tab = "students";
      renderGroupDetail();
      $("#tgAddStudent input[name=name]")?.focus();
    } else if (form.id === "tgAddExam") {
      const id = await guard(() => C.api.saveExam(view.group.code, { title: data.title.trim(), date: data.date, maxMarks: Number(data.maxMarks), published: false, stats: { count: 0, average: 0, averagePct: 0, top: [] } }), "Exam created. Enter the marks.");
      if (id) {
        view.exams = (await guard(() => C.api.listExams(view.group.code))) || view.exams;
        await openExam(id);
      }
    } else if (form.id === "tgTopicsForm") {
      const topicsCovered = $$("input[type=checkbox]:checked", form).map((box) => box.value);
      await guard(() => C.api.saveGroup({ ...view.group, topicsCovered }), `${topicsCovered.length} topics saved.`);
      view.group = { ...view.group, topicsCovered };
      renderGroupDetail();
    } else if (form.id === "tgGroupSettings") {
      await guard(() => C.api.saveGroup({ ...view.group, name: data.name.trim(), course: data.course }), "Group saved.");
      await loadGroups(view.group.code);
      view.tab = "settings";
      renderGroupDetail();
    }
  });

  document.addEventListener("input", (event) => {
    if (event.target.matches(".cls-mark-input")) updateLive();
    if (event.target.matches("#tgNewGroup input[name=name]")) {
      const codeInput = $("#tgNewGroup input[name=code]");
      if (codeInput && !codeInput.dataset.touched) codeInput.value = C.normCode(event.target.value);
    }
    if (event.target.matches("#tgNewGroup input[name=code]")) event.target.dataset.touched = "1";
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || !event.target.matches(".cls-mark-input")) return;
    event.preventDefault();
    const inputs = $$(".cls-mark-input");
    const next = inputs[inputs.indexOf(event.target) + 1];
    if (next) {
      next.focus();
      next.select();
    } else {
      $("[data-save-marks]")?.focus();
    }
  });

  document.addEventListener("focusin", (event) => {
    if (event.target.matches("[data-select-all]")) event.target.select();
  });

  /* ---------------------------------------------------------------- boot */

  $("#tgNewGroup").innerHTML = `
    <label>Group name <input name="name" required maxlength="60" placeholder="e.g. Orbit"></label>
    <label>Join code <input name="code" maxlength="24" placeholder="ORBIT"></label>
    <label>Course <select name="course">${courseOptions("modular-1")}</select></label>
    <button type="submit" class="cls-btn is-primary">Create group</button>`;

  let booted = false;
  C.onChange(async (snapshot) => {
    const allowed = renderGate(snapshot);
    if (allowed && !booted) {
      booted = true;
      await loadGroups();
    }
    if (!allowed) booted = false;
  });
  C.init();
})();
