// Elite IGCSE - Tracker V2
// Adds tab navigation, splits assignments/quizzes into separate stores,
// computes grades (IGCSE A*-U), builds a revision tab, and adds CSV export.
// Runs alongside progress.js and reuses cloud-progress.js for Firebase sync.
(function () {
  const PAPER_ATTEMPTS_KEY = "elitePaperAttemptsV1";   // existing
  const STUDY_TASKS_KEY = "eliteStudyTasksV1";         // existing (mixed)
  const ASSIGNMENTS_KEY = "eliteTrackerAssignmentsV2"; // new
  const QUIZZES_KEY = "eliteTrackerQuizzesV2";         // new
  const MIGRATION_FLAG = "eliteTrackerV2MigratedAt";

  const QUIZ_KINDS = new Set([
    "Topic Quiz", "Mock Quiz", "Quiz", "Unit Quiz", "Practice"
  ]);

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
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
    }[c]));
  }
  function todayKey() { return new Date().toISOString().slice(0, 10); }
  function uid(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  }
  function uniqueSorted(arr) {
    return [...new Set(arr.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
  }
  function safePercent(raw, max) {
    const r = Number(raw); const m = Number(max);
    if (!Number.isFinite(r) || !Number.isFinite(m) || m <= 0) return null;
    return Math.max(0, Math.min(100, Math.round((r / m) * 100)));
  }
  function gradeFromPercent(pct) {
    if (pct === null || pct === undefined || !Number.isFinite(pct)) return "-";
    if (pct >= 90) return "A*";
    if (pct >= 80) return "A";
    if (pct >= 70) return "B";
    if (pct >= 60) return "C";
    if (pct >= 50) return "D";
    if (pct >= 40) return "E";
    if (pct >= 30) return "F";
    return "U";
  }
  function gradeClass(pct) {
    if (pct === null || pct === undefined) return "muted";
    if (pct >= 80) return "grade-a";
    if (pct >= 60) return "grade-b";
    if (pct >= 40) return "grade-d";
    return "grade-u";
  }
  function daysUntil(dateValue) {
    if (!dateValue) return null;
    const today = new Date(todayKey());
    const due = new Date(dateValue);
    if (Number.isNaN(due.getTime())) return null;
    return Math.ceil((due - today) / 86400000);
  }
  function autoAssignmentStatus(a) {
    if (a.manualStatus) return a.manualStatus;
    const days = daysUntil(a.dueDate);
    if (a.submitDate) {
      if (a.dueDate && new Date(a.submitDate) > new Date(a.dueDate)) return "Late";
      return "Submitted";
    }
    if (days === null) return "Pending";
    if (days < 0) return "Missing";
    return "Pending";
  }
  function scorePercent(rawScore) {
    const value = Number(rawScore);
    if (!Number.isFinite(value)) return null;
    return Math.max(0, Math.min(100, Math.round(value)));
  }
  function average(values) {
    const clean = values.filter((value) => value !== null && value !== undefined && Number.isFinite(value));
    if (!clean.length) return null;
    return Math.round(clean.reduce((sum, value) => sum + value, 0) / clean.length);
  }
  function paperLabel(paper) {
    return [paper.session, paper.year, paper.paperCode].filter(Boolean).join(" ") || "Past paper";
  }
  function shortDate(value) {
    if (!value) return "-";
    const bits = String(value).split("-");
    if (bits.length === 3) return `${bits[2]}/${bits[1]}`;
    return value;
  }
  function statusClass(status) {
    return String(status || "pending").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  // ---------- Migration ----------
  function runMigration() {
    if (localStorage.getItem(MIGRATION_FLAG)) return;
    const tasks = readJSON(STUDY_TASKS_KEY, []);
    const existingAssignments = readJSON(ASSIGNMENTS_KEY, []);
    const existingQuizzes = readJSON(QUIZZES_KEY, []);
    if (Array.isArray(tasks) && tasks.length && !existingAssignments.length && !existingQuizzes.length) {
      const assignments = []; const quizzes = [];
      tasks.forEach((t) => {
        const isQuiz = QUIZ_KINDS.has(String(t.kind || ""));
        if (isQuiz) {
          quizzes.push({
            id: t.id || uid("quiz"),
            date: t.dueDate || t.createdAt?.slice(0, 10) || todayKey(),
            unit: t.unit || "",
            topic: t.topic || "",
            quizTitle: t.title || "",
            quizType: t.kind === "Mock Homework" ? "Mock Quiz" : (t.kind || "Topic Quiz"),
            difficulty: t.difficulty || "Medium",
            rawMark: t.rawScore === "" ? "" : Number(t.rawScore),
            maxMark: t.maxScore === "" ? "" : Number(t.maxScore),
            durationMinutes: "",
            timeTakenMinutes: "",
            attemptNumber: 1,
            notes: t.notes || "",
            createdAt: t.createdAt || new Date().toISOString()
          });
        } else {
          assignments.push({
            id: t.id || uid("assign"),
            dateAssigned: t.createdAt?.slice(0, 10) || todayKey(),
            dueDate: t.dueDate || "",
            unit: t.unit || "",
            topic: t.topic || "",
            assignmentType: t.kind || "Homework",
            title: t.title || "",
            difficulty: t.difficulty || "Medium",
            submitDate: (t.status && (t.status === "Submitted" || t.status === "Late" || t.status === "Revised")) ? (t.dueDate || todayKey()) : "",
            rawMark: t.rawScore === "" ? "" : Number(t.rawScore),
            maxMark: t.maxScore === "" ? "" : Number(t.maxScore),
            manualStatus: t.status === "Revised" ? "Revised" : "",
            notes: t.notes || "",
            createdAt: t.createdAt || new Date().toISOString()
          });
        }
      });
      writeJSON(ASSIGNMENTS_KEY, assignments);
      writeJSON(QUIZZES_KEY, quizzes);
    }
    if (!Array.isArray(existingAssignments)) {
      writeJSON(ASSIGNMENTS_KEY, []);
    }
    if (!Array.isArray(existingQuizzes)) {
      writeJSON(QUIZZES_KEY, []);
    }
    localStorage.setItem(MIGRATION_FLAG, new Date().toISOString());
  }

  // Backfill revisionStatus on legacy paper attempts.
  function backfillPaperRevisionStatus() {
    const attempts = readJSON(PAPER_ATTEMPTS_KEY, []);
    if (!Array.isArray(attempts) || !attempts.length) return;
    let mutated = false;
    attempts.forEach((a) => {
      if (!a.revisionStatus) { a.revisionStatus = "In progress"; mutated = true; }
    });
    if (mutated) writeJSON(PAPER_ATTEMPTS_KEY, attempts);
  }

  // ---------- Tabs ----------
  function activateTab(target, options = {}) {
    const body = document.body;
    body.dataset.activeTab = target;
    document.querySelectorAll(".tracker-tab").forEach((tab) => {
      const isActive = tab.dataset.tabTarget === target;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    document.querySelectorAll("[data-tab]").forEach((section) => {
      const sectionTab = section.dataset.tab;
      if (sectionTab === "__legacy") { section.hidden = true; return; }
      section.hidden = sectionTab !== target;
    });
    try { history.replaceState(null, "", `#${target}`); } catch (err) { /* noop */ }
    if (options.scroll) {
      const tabs = document.querySelector(".tracker-tabs");
      const headerHeight = document.querySelector(".site-header")?.getBoundingClientRect().height || 80;
      const headerOffset = Math.max(150, headerHeight + 60);
      window.scrollTo({ top: Math.max(0, (tabs?.offsetTop || 0) - headerOffset - 14), behavior: "smooth" });
    }
    refreshAll();
  }
  function setupTabs() {
    const tabs = document.querySelectorAll(".tracker-tab");
    tabs.forEach((tab) => tab.addEventListener("click", () => activateTab(tab.dataset.tabTarget, { scroll: true })));
    const hash = (window.location.hash || "").replace("#", "");
    const valid = ["dashboard", "papers", "assignments", "quizzes", "revision", "backup"];
    activateTab(valid.includes(hash) ? hash : "dashboard");
  }
  function setupTabJumps() {
    document.querySelectorAll("[data-tab-jump]").forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.dataset.tabJump;
        activateTab(target, { scroll: true });
        window.setTimeout(() => {
          if (target === "assignments") document.getElementById("addAssignmentBtn")?.click();
          if (target === "quizzes") document.getElementById("addQuizBtn")?.click();
          if (target === "papers") document.getElementById("paperRawScore")?.focus();
        }, 180);
      });
    });
  }

  // ---------- Unit/Topic options (derived from question data when available) ----------
  function questionUnits() {
    const questions = window.QUESTION_DATA || [];
    return uniqueSorted(questions.map((q) => q.unit));
  }
  function questionTopicsByUnit(unit) {
    const questions = window.QUESTION_DATA || [];
    const list = questions.filter((q) => !unit || q.unit === unit).map((q) => q.topic);
    return uniqueSorted(list);
  }
  function populateUnitSelect(select, includeBlank = false) {
    const units = questionUnits();
    const current = select.value;
    const opts = (includeBlank ? `<option value="">All</option>` : "")
      + units.map((u) => `<option ${u === current ? "selected" : ""}>${escapeHtml(u)}</option>`).join("");
    select.innerHTML = opts;
  }
  function populateTopicSelect(select, unitValue) {
    const topics = questionTopicsByUnit(unitValue);
    const current = select.value;
    select.innerHTML = topics.map((t) => `<option ${t === current ? "selected" : ""}>${escapeHtml(t)}</option>`).join("");
  }

  // ---------- Assignments ----------
  function readAssignments() { return readJSON(ASSIGNMENTS_KEY, []); }
  function writeAssignments(list) { writeJSON(ASSIGNMENTS_KEY, list); }

  function bindAssignmentForm() {
    const shell = document.getElementById("assignmentFormShell");
    const form = document.getElementById("assignmentForm");
    const unitSel = document.getElementById("assignmentUnit");
    const topicSel = document.getElementById("assignmentTopic");
    const addBtn = document.getElementById("addAssignmentBtn");
    const cancelBtn = document.getElementById("assignmentCancelBtn");
    populateUnitSelect(unitSel);
    populateTopicSelect(topicSel, unitSel.value);
    unitSel.addEventListener("change", () => populateTopicSelect(topicSel, unitSel.value));
    addBtn.addEventListener("click", () => {
      form.reset();
      document.getElementById("assignmentEditId").value = "";
      document.getElementById("assignmentDateAssigned").value = todayKey();
      document.getElementById("assignmentSubmitBtn").textContent = "Save assignment";
      populateUnitSelect(unitSel);
      populateTopicSelect(topicSel, unitSel.value);
      shell.open = true;
      shell.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    cancelBtn.addEventListener("click", () => { shell.open = false; form.reset(); document.getElementById("assignmentEditId").value = ""; });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const id = document.getElementById("assignmentEditId").value;
      const item = {
        id: id || uid("assign"),
        dateAssigned: document.getElementById("assignmentDateAssigned").value || todayKey(),
        dueDate: document.getElementById("assignmentDueDate").value || "",
        unit: unitSel.value,
        topic: topicSel.value,
        assignmentType: document.getElementById("assignmentType").value,
        title: document.getElementById("assignmentTitle").value.trim(),
        difficulty: document.getElementById("assignmentDifficulty").value,
        submitDate: document.getElementById("assignmentSubmitDate").value || "",
        rawMark: document.getElementById("assignmentRawMark").value === "" ? "" : Number(document.getElementById("assignmentRawMark").value),
        maxMark: document.getElementById("assignmentMaxMark").value === "" ? "" : Number(document.getElementById("assignmentMaxMark").value),
        manualStatus: document.getElementById("assignmentManualStatus").value || "",
        notes: document.getElementById("assignmentNotes").value.trim(),
        createdAt: new Date().toISOString()
      };
      if (!item.title) { alert("Title is required."); return; }
      const list = readAssignments();
      const index = list.findIndex((x) => x.id === item.id);
      if (index >= 0) list[index] = { ...list[index], ...item };
      else list.unshift(item);
      writeAssignments(list);
      shell.open = false; form.reset();
      document.getElementById("assignmentEditId").value = "";
      renderAssignments(); renderRevision();
    });
    document.getElementById("assignmentFilterUnit")?.addEventListener("change", renderAssignments);
    document.getElementById("assignmentFilterStatus")?.addEventListener("change", renderAssignments);
    document.getElementById("assignmentFilterSearch")?.addEventListener("input", renderAssignments);
    document.getElementById("exportAssignmentsCsvBtn")?.addEventListener("click", () => exportCsv("assignments", readAssignments().map(prepareAssignmentForExport), ["title","unit","topic","assignmentType","dateAssigned","dueDate","submitDate","difficulty","rawMark","maxMark","percentage","grade","status","notes"]));
  }
  function prepareAssignmentForExport(a) {
    const pct = safePercent(a.rawMark, a.maxMark);
    return { ...a, percentage: pct === null ? "" : pct, grade: gradeFromPercent(pct), status: autoAssignmentStatus(a) };
  }

  function renderAssignments() {
    const tbody = document.getElementById("assignmentRows");
    if (!tbody) return;
    const filterUnit = document.getElementById("assignmentFilterUnit");
    const filterStatus = document.getElementById("assignmentFilterStatus");
    const filterSearch = document.getElementById("assignmentFilterSearch");
    const list = readAssignments();
    // populate unit filter
    if (filterUnit) {
      const units = uniqueSorted(list.map((x) => x.unit));
      const current = filterUnit.value;
      filterUnit.innerHTML = `<option value="">All</option>` + units.map((u) => `<option ${u === current ? "selected" : ""}>${escapeHtml(u)}</option>`).join("");
    }
    const uVal = filterUnit?.value || "";
    const sVal = filterStatus?.value || "";
    const q = (filterSearch?.value || "").trim().toLowerCase();
    const filtered = list.filter((a) => {
      if (uVal && a.unit !== uVal) return false;
      const status = autoAssignmentStatus(a);
      if (sVal && status !== sVal) return false;
      if (q && !`${a.title} ${a.topic} ${a.unit}`.toLowerCase().includes(q)) return false;
      return true;
    });
    // KPI
    const scored = list.map((a) => safePercent(a.rawMark, a.maxMark)).filter((p) => p !== null);
    const avg = scored.length ? Math.round(scored.reduce((s, v) => s + v, 0) / scored.length) : null;
    const dueWeek = list.filter((a) => {
      const d = daysUntil(a.dueDate);
      const status = autoAssignmentStatus(a);
      return status === "Pending" && d !== null && d >= 0 && d <= 7;
    }).length;
    const overdue = list.filter((a) => {
      const status = autoAssignmentStatus(a);
      return status === "Missing" || status === "Late";
    }).length;
    document.getElementById("assignmentCount").textContent = list.length;
    document.getElementById("assignmentAverage").textContent = avg === null ? "-" : `${avg}%`;
    document.getElementById("assignmentDueWeek").textContent = dueWeek;
    document.getElementById("assignmentOverdue").textContent = overdue;

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="10" class="empty-state">No assignments saved yet. Click <strong>+ Add assignment</strong> to log your first one.</td></tr>`;
      return;
    }
    tbody.innerHTML = filtered.map((a) => {
      const pct = safePercent(a.rawMark, a.maxMark);
      const grade = gradeFromPercent(pct);
      const status = autoAssignmentStatus(a);
      const marks = (a.rawMark === "" || a.maxMark === "") ? "-" : `${a.rawMark}/${a.maxMark}`;
      return `<tr>
        <td><strong>${escapeHtml(a.title || "(untitled)")}</strong>${a.notes ? `<span class="cell-sub">${escapeHtml(a.notes)}</span>` : ""}</td>
        <td>${escapeHtml(a.unit || "-")}<span class="cell-sub">${escapeHtml(a.topic || "")}</span></td>
        <td>${escapeHtml(a.assignmentType || "-")}<span class="cell-sub">${escapeHtml(a.difficulty || "")}</span></td>
        <td>${escapeHtml(a.dueDate || "-")}</td>
        <td>${escapeHtml(a.submitDate || "-")}</td>
        <td>${marks}</td>
        <td>${pct === null ? "-" : `${pct}%`}</td>
        <td><span class="grade-pill ${gradeClass(pct)}">${grade}</span></td>
        <td><span class="status-pill ${status.toLowerCase()}">${escapeHtml(status)}</span></td>
        <td><button type="button" class="row-action" data-edit-assignment="${escapeHtml(a.id)}">Edit</button> <button type="button" class="row-action danger" data-delete-assignment="${escapeHtml(a.id)}">Delete</button></td>
      </tr>`;
    }).join("");
  }

  function bindAssignmentRowEvents() {
    document.getElementById("assignmentRows")?.addEventListener("click", (event) => {
      const editBtn = event.target.closest("[data-edit-assignment]");
      const delBtn = event.target.closest("[data-delete-assignment]");
      if (editBtn) {
        const a = readAssignments().find((x) => x.id === editBtn.dataset.editAssignment);
        if (!a) return;
        document.getElementById("assignmentEditId").value = a.id;
        document.getElementById("assignmentDateAssigned").value = a.dateAssigned || "";
        document.getElementById("assignmentDueDate").value = a.dueDate || "";
        const unitSel = document.getElementById("assignmentUnit");
        const topicSel = document.getElementById("assignmentTopic");
        populateUnitSelect(unitSel);
        if (a.unit) unitSel.value = a.unit;
        populateTopicSelect(topicSel, unitSel.value);
        if (a.topic) topicSel.value = a.topic;
        document.getElementById("assignmentType").value = a.assignmentType || "Homework";
        document.getElementById("assignmentTitle").value = a.title || "";
        document.getElementById("assignmentDifficulty").value = a.difficulty || "Medium";
        document.getElementById("assignmentSubmitDate").value = a.submitDate || "";
        document.getElementById("assignmentRawMark").value = a.rawMark ?? "";
        document.getElementById("assignmentMaxMark").value = a.maxMark ?? "";
        document.getElementById("assignmentManualStatus").value = a.manualStatus || "";
        document.getElementById("assignmentNotes").value = a.notes || "";
        document.getElementById("assignmentSubmitBtn").textContent = "Update assignment";
        const shell = document.getElementById("assignmentFormShell");
        shell.open = true;
        shell.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      if (delBtn) {
        if (!confirm("Delete this assignment?")) return;
        const list = readAssignments().filter((x) => x.id !== delBtn.dataset.deleteAssignment);
        writeAssignments(list);
        renderAssignments(); renderRevision();
      }
    });
  }

  // ---------- Quizzes ----------
  function readQuizzes() { return readJSON(QUIZZES_KEY, []); }
  function writeQuizzes(list) { writeJSON(QUIZZES_KEY, list); }

  function bindQuizForm() {
    const shell = document.getElementById("quizFormShell");
    const form = document.getElementById("quizForm");
    const unitSel = document.getElementById("quizUnit");
    const topicSel = document.getElementById("quizTopic");
    const addBtn = document.getElementById("addQuizBtn");
    const cancelBtn = document.getElementById("quizCancelBtn");
    populateUnitSelect(unitSel);
    populateTopicSelect(topicSel, unitSel.value);
    unitSel.addEventListener("change", () => populateTopicSelect(topicSel, unitSel.value));
    addBtn.addEventListener("click", () => {
      form.reset();
      document.getElementById("quizEditId").value = "";
      document.getElementById("quizDate").value = todayKey();
      document.getElementById("quizAttemptNumber").value = 1;
      document.getElementById("quizSubmitBtn").textContent = "Save quiz";
      populateUnitSelect(unitSel);
      populateTopicSelect(topicSel, unitSel.value);
      shell.open = true;
      shell.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    cancelBtn.addEventListener("click", () => { shell.open = false; form.reset(); document.getElementById("quizEditId").value = ""; });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const id = document.getElementById("quizEditId").value;
      const item = {
        id: id || uid("quiz"),
        date: document.getElementById("quizDate").value || todayKey(),
        unit: unitSel.value,
        topic: topicSel.value,
        quizTitle: document.getElementById("quizTitle").value.trim(),
        quizType: document.getElementById("quizType").value,
        difficulty: document.getElementById("quizDifficulty").value,
        rawMark: document.getElementById("quizRawMark").value === "" ? "" : Number(document.getElementById("quizRawMark").value),
        maxMark: document.getElementById("quizMaxMark").value === "" ? "" : Number(document.getElementById("quizMaxMark").value),
        durationMinutes: document.getElementById("quizDuration").value === "" ? "" : Number(document.getElementById("quizDuration").value),
        timeTakenMinutes: document.getElementById("quizTimeTaken").value === "" ? "" : Number(document.getElementById("quizTimeTaken").value),
        attemptNumber: Number(document.getElementById("quizAttemptNumber").value || 1),
        notes: document.getElementById("quizNotes").value.trim(),
        createdAt: new Date().toISOString()
      };
      if (!item.quizTitle) { alert("Quiz title is required."); return; }
      const list = readQuizzes();
      const index = list.findIndex((x) => x.id === item.id);
      if (index >= 0) list[index] = { ...list[index], ...item };
      else list.unshift(item);
      writeQuizzes(list);
      shell.open = false; form.reset();
      document.getElementById("quizEditId").value = "";
      renderQuizzes(); renderRevision();
    });
    document.getElementById("quizFilterUnit")?.addEventListener("change", renderQuizzes);
    document.getElementById("quizFilterDifficulty")?.addEventListener("change", renderQuizzes);
    document.getElementById("quizFilterSearch")?.addEventListener("input", renderQuizzes);
    document.getElementById("exportQuizzesCsvBtn")?.addEventListener("click", () => exportCsv("quizzes", readQuizzes().map(prepareQuizForExport), ["quizTitle","unit","topic","quizType","date","difficulty","rawMark","maxMark","percentage","grade","durationMinutes","timeTakenMinutes","attemptNumber","notes"]));
  }
  function prepareQuizForExport(q) {
    const pct = safePercent(q.rawMark, q.maxMark);
    return { ...q, percentage: pct === null ? "" : pct, grade: gradeFromPercent(pct) };
  }

  function renderQuizzes() {
    const tbody = document.getElementById("quizRows");
    if (!tbody) return;
    const filterUnit = document.getElementById("quizFilterUnit");
    const filterDiff = document.getElementById("quizFilterDifficulty");
    const filterSearch = document.getElementById("quizFilterSearch");
    const list = readQuizzes();
    if (filterUnit) {
      const units = uniqueSorted(list.map((x) => x.unit));
      const current = filterUnit.value;
      filterUnit.innerHTML = `<option value="">All</option>` + units.map((u) => `<option ${u === current ? "selected" : ""}>${escapeHtml(u)}</option>`).join("");
    }
    const uVal = filterUnit?.value || "";
    const dVal = filterDiff?.value || "";
    const q = (filterSearch?.value || "").trim().toLowerCase();
    const filtered = list.filter((it) => {
      if (uVal && it.unit !== uVal) return false;
      if (dVal && it.difficulty !== dVal) return false;
      if (q && !`${it.quizTitle} ${it.topic} ${it.unit}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const scored = list.map((it) => safePercent(it.rawMark, it.maxMark)).filter((p) => p !== null);
    const avg = scored.length ? Math.round(scored.reduce((s, v) => s + v, 0) / scored.length) : null;
    const best = scored.length ? Math.max(...scored) : null;
    const thirty = list.filter((it) => {
      const d = daysUntil(it.date);
      return d !== null && d >= -30 && d <= 0;
    }).length;
    document.getElementById("quizCount").textContent = list.length;
    document.getElementById("quizAverage").textContent = avg === null ? "-" : `${avg}%`;
    document.getElementById("quizBest").textContent = best === null ? "-" : `${best}%`;
    document.getElementById("quizRecent").textContent = thirty;

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="10" class="empty-state">No quizzes saved yet. Click <strong>+ Add quiz</strong> to log your first one.</td></tr>`;
      return;
    }
    tbody.innerHTML = filtered.map((it) => {
      const pct = safePercent(it.rawMark, it.maxMark);
      const grade = gradeFromPercent(pct);
      const marks = (it.rawMark === "" || it.maxMark === "") ? "-" : `${it.rawMark}/${it.maxMark}`;
      const time = (it.timeTakenMinutes === "" || it.timeTakenMinutes === undefined) ? "-" : `${it.timeTakenMinutes}m`;
      return `<tr>
        <td><strong>${escapeHtml(it.quizTitle || "(untitled)")}</strong>${it.notes ? `<span class="cell-sub">${escapeHtml(it.notes)}</span>` : ""}</td>
        <td>${escapeHtml(it.unit || "-")}<span class="cell-sub">${escapeHtml(it.topic || "")}</span></td>
        <td>${escapeHtml(it.quizType || "-")}<span class="cell-sub">${escapeHtml(it.difficulty || "")}</span></td>
        <td>${escapeHtml(it.date || "-")}</td>
        <td>${marks}</td>
        <td>${pct === null ? "-" : `${pct}%`}</td>
        <td><span class="grade-pill ${gradeClass(pct)}">${grade}</span></td>
        <td>${escapeHtml(String(it.attemptNumber || 1))}</td>
        <td>${time}</td>
        <td><button type="button" class="row-action" data-edit-quiz="${escapeHtml(it.id)}">Edit</button> <button type="button" class="row-action danger" data-delete-quiz="${escapeHtml(it.id)}">Delete</button></td>
      </tr>`;
    }).join("");
  }
  function bindQuizRowEvents() {
    document.getElementById("quizRows")?.addEventListener("click", (event) => {
      const editBtn = event.target.closest("[data-edit-quiz]");
      const delBtn = event.target.closest("[data-delete-quiz]");
      if (editBtn) {
        const q = readQuizzes().find((x) => x.id === editBtn.dataset.editQuiz);
        if (!q) return;
        document.getElementById("quizEditId").value = q.id;
        document.getElementById("quizDate").value = q.date || "";
        const unitSel = document.getElementById("quizUnit");
        const topicSel = document.getElementById("quizTopic");
        populateUnitSelect(unitSel);
        if (q.unit) unitSel.value = q.unit;
        populateTopicSelect(topicSel, unitSel.value);
        if (q.topic) topicSel.value = q.topic;
        document.getElementById("quizTitle").value = q.quizTitle || "";
        document.getElementById("quizType").value = q.quizType || "Topic Quiz";
        document.getElementById("quizDifficulty").value = q.difficulty || "Medium";
        document.getElementById("quizRawMark").value = q.rawMark ?? "";
        document.getElementById("quizMaxMark").value = q.maxMark ?? "";
        document.getElementById("quizDuration").value = q.durationMinutes ?? "";
        document.getElementById("quizTimeTaken").value = q.timeTakenMinutes ?? "";
        document.getElementById("quizAttemptNumber").value = q.attemptNumber || 1;
        document.getElementById("quizNotes").value = q.notes || "";
        document.getElementById("quizSubmitBtn").textContent = "Update quiz";
        const shell = document.getElementById("quizFormShell");
        shell.open = true;
        shell.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      if (delBtn) {
        if (!confirm("Delete this quiz?")) return;
        const list = readQuizzes().filter((x) => x.id !== delBtn.dataset.deleteQuiz);
        writeQuizzes(list);
        renderQuizzes(); renderRevision();
      }
    });
  }

  // ---------- Revision ----------
  function renderRevision() {
    const wrongRows = document.getElementById("revisionWrongRows");
    const overdueRows = document.getElementById("revisionOverdueRows");
    const weakRows = document.getElementById("revisionWeakRows");
    if (!wrongRows || !overdueRows || !weakRows) return;

    // Wrong questions from past paper attempts
    const papers = readJSON(PAPER_ATTEMPTS_KEY, []);
    const wrongList = (Array.isArray(papers) ? papers : [])
      .filter((p) => String(p.wrongQuestions || "").trim().length > 0)
      .slice(0, 30);
    wrongRows.innerHTML = wrongList.length
      ? wrongList.map((p) => `<tr><td><strong>${escapeHtml(`${p.session || ""} ${p.year || ""} ${p.paperCode || ""}`.trim())}</strong></td><td>${escapeHtml(p.date || "-")}</td><td>${escapeHtml(p.wrongQuestions)}</td><td><span class="status-pill ${String(p.revisionStatus || "in-progress").toLowerCase().replace(/\s/g, "-")}">${escapeHtml(p.revisionStatus || "In progress")}</span></td></tr>`).join("")
      : `<tr><td colspan="4" class="empty-state">No wrong questions logged yet. Add the wrong question numbers when saving a paper attempt.</td></tr>`;

    // Overdue assignments
    const assigns = readAssignments();
    const overdue = assigns.filter((a) => {
      const status = autoAssignmentStatus(a);
      return status === "Missing" || status === "Late";
    });
    overdueRows.innerHTML = overdue.length
      ? overdue.map((a) => `<tr><td><strong>${escapeHtml(a.title || "(untitled)")}</strong></td><td>${escapeHtml(a.unit || "-")}<span class="cell-sub">${escapeHtml(a.topic || "")}</span></td><td>${escapeHtml(a.dueDate || "-")}</td><td><span class="status-pill ${autoAssignmentStatus(a).toLowerCase()}">${autoAssignmentStatus(a)}</span></td></tr>`).join("")
      : `<tr><td colspan="4" class="empty-state">No overdue assignments. Keep it up.</td></tr>`;

    // Weak topics: aggregate percentage across assignments + quizzes per topic
    const buckets = new Map();
    function addToBucket(topic, unit, pct) {
      if (!topic || pct === null) return;
      const key = `${unit}::${topic}`;
      const bucket = buckets.get(key) || { topic, unit, total: 0, count: 0 };
      bucket.total += pct; bucket.count += 1; buckets.set(key, bucket);
    }
    assigns.forEach((a) => addToBucket(a.topic, a.unit, safePercent(a.rawMark, a.maxMark)));
    readQuizzes().forEach((q) => addToBucket(q.topic, q.unit, safePercent(q.rawMark, q.maxMark)));
    const weak = [...buckets.values()]
      .map((b) => ({ ...b, avg: Math.round(b.total / b.count) }))
      .filter((b) => b.avg < 60)
      .sort((a, b) => a.avg - b.avg)
      .slice(0, 15);
    weakRows.innerHTML = weak.length
      ? weak.map((b) => `<tr><td><strong>${escapeHtml(b.topic)}</strong></td><td>${escapeHtml(b.unit || "-")}</td><td><span class="grade-pill ${gradeClass(b.avg)}">${b.avg}%</span></td><td>${b.count}</td></tr>`).join("")
      : `<tr><td colspan="4" class="empty-state">No weak topics yet. Log a few assignments or quizzes to populate this.</td></tr>`;
  }

  // ---------- Dashboard ----------
  function paperBankCount() {
    if (window.SITE_META?.paperCount) return Number(window.SITE_META.paperCount) || 0;
    const questions = window.QUESTION_DATA || [];
    const keys = questions.map((q) => [q.session, q.year, q.paper_code || q.paperCode || q.paper].filter(Boolean).join("::"));
    return uniqueSorted(keys).length;
  }
  function weakTopicRows(limit = 3) {
    const buckets = new Map();
    function add(topic, unit, pct) {
      if (!topic || pct === null) return;
      const key = `${unit || ""}::${topic}`;
      const item = buckets.get(key) || { topic, unit, total: 0, count: 0 };
      item.total += pct;
      item.count += 1;
      buckets.set(key, item);
    }
    readAssignments().forEach((a) => add(a.topic, a.unit, safePercent(a.rawMark, a.maxMark)));
    readQuizzes().forEach((q) => add(q.topic, q.unit, safePercent(q.rawMark, q.maxMark)));
    return [...buckets.values()]
      .map((item) => ({ ...item, avg: Math.round(item.total / item.count) }))
      .sort((a, b) => a.avg - b.avg || a.topic.localeCompare(b.topic))
      .slice(0, limit);
  }
  function scoreItems(papers, assignments, quizzes) {
    const paperItems = papers.map((paper) => ({ type: "paper", score: scorePercent(paper.rawScore), label: paperLabel(paper), date: paper.date || paper.createdAt || "" }));
    const assignmentItems = assignments.map((assignment) => ({ type: "assignment", score: safePercent(assignment.rawMark, assignment.maxMark), label: assignment.title || "Assignment", date: assignment.dueDate || assignment.createdAt || "" }));
    const quizItems = quizzes.map((quiz) => ({ type: "quiz", score: safePercent(quiz.rawMark, quiz.maxMark), label: quiz.quizTitle || "Quiz", date: quiz.date || quiz.createdAt || "" }));
    return [...paperItems, ...assignmentItems, ...quizItems].filter((item) => item.score !== null);
  }
  function readinessLabel(score) {
    if (score === null) return "Needs first score";
    if (score >= 85) return "Exam-ready pace";
    if (score >= 75) return "Strong trajectory";
    if (score >= 60) return "Building steadily";
    if (score >= 45) return "Needs focused repair";
    return "High-risk zone";
  }
  function renderReadinessGauge(score, note) {
    const svg = document.getElementById("dashboardReadinessSvg");
    if (!svg) return;
    const scoreText = document.getElementById("dashboardReadinessScore");
    const label = document.getElementById("dashboardReadinessLabel");
    const noteEl = document.getElementById("dashboardReadinessNote");
    if (scoreText) scoreText.textContent = score === null ? "--" : `${score}%`;
    if (label) label.textContent = readinessLabel(score);
    if (noteEl) noteEl.textContent = note;
    const value = Math.max(0, Math.min(100, score ?? 0));
    const circumference = 251.2;
    const dash = (value / 100) * circumference;
    const color = value >= 80 ? "#0f6e56" : value >= 65 ? "#b7812a" : "#c0392b";
    svg.innerHTML = `
      <circle cx="90" cy="66" r="40" fill="none" stroke="#f0ebe3" stroke-width="14"/>
      <circle cx="90" cy="66" r="40" fill="none" stroke="${color}" stroke-width="14" stroke-linecap="round" stroke-dasharray="${dash.toFixed(1)} ${circumference.toFixed(1)}" transform="rotate(-90 90 66)"/>
      <text x="90" y="62" text-anchor="middle" fill="#161b2e" font-size="24" font-weight="800">${score === null ? "--" : value}</text>
      <text x="90" y="82" text-anchor="middle" fill="#6b6269" font-size="10">${score === null ? "add marks" : "readiness"}</text>
      <text x="32" y="120" fill="#7a7178" font-size="9">0</text>
      <text x="138" y="120" fill="#7a7178" font-size="9">100</text>`;
  }
  function renderScoreBands(items) {
    const svg = document.getElementById("dashboardScoreBandsSvg");
    const meta = document.getElementById("scoreBandMeta");
    if (!svg) return;
    if (meta) meta.textContent = items.length ? `${items.length} marks` : "all marks";
    if (!items.length) {
      svg.innerHTML = `<rect x="12" y="18" width="276" height="86" rx="9" fill="#fbfaf7" stroke="#e1dacd"/><text x="150" y="62" text-anchor="middle" fill="#5a5258" font-size="11">Add marks to see score bands.</text>`;
      return;
    }
    const bands = [
      { label: "<50", min: 0, max: 49, color: "#c0392b" },
      { label: "50-69", min: 50, max: 69, color: "#b7812a" },
      { label: "70-84", min: 70, max: 84, color: "#161b2e" },
      { label: "85+", min: 85, max: 100, color: "#0f6e56" }
    ].map((band) => ({ ...band, count: items.filter((item) => item.score >= band.min && item.score <= band.max).length }));
    let x = 18;
    const total = items.length;
    const stacked = bands.map((band) => {
      const width = total ? Math.max(band.count ? 8 : 0, (band.count / total) * 264) : 0;
      const rect = width ? `<rect x="${x.toFixed(1)}" y="34" width="${width.toFixed(1)}" height="24" rx="8" fill="${band.color}"/>` : "";
      x += width + (width ? 2 : 0);
      return rect;
    }).join("");
    const legend = bands.map((band, index) => {
      const lx = 20 + index * 68;
      return `<g><rect x="${lx}" y="82" width="8" height="8" rx="2" fill="${band.color}"/><text x="${lx + 12}" y="90" fill="#161b2e" font-size="9" font-weight="700">${band.label}</text><text x="${lx + 12}" y="104" fill="#7a7178" font-size="9">${band.count}</text></g>`;
    }).join("");
    const avg = average(items.map((item) => item.score));
    svg.innerHTML = `<text x="18" y="20" fill="#7a7178" font-size="9">distribution</text>${stacked}<text x="280" y="22" text-anchor="end" fill="#161b2e" font-size="12" font-weight="800">${avg}% avg</text>${legend}`;
  }
  function renderWorkBalance(papers, assignments, quizzes) {
    const svg = document.getElementById("dashboardWorkBalanceSvg");
    const meta = document.getElementById("workBalanceMeta");
    if (!svg) return;
    const rows = [
      { label: "Papers", count: papers.length, color: "#161b2e" },
      { label: "Assign", count: assignments.length, color: "#c0392b" },
      { label: "Quizzes", count: quizzes.length, color: "#b7812a" }
    ];
    const total = rows.reduce((sum, row) => sum + row.count, 0);
    if (meta) meta.textContent = total ? `${total} saved` : "saved work";
    if (!total) {
      svg.innerHTML = `<circle cx="66" cy="64" r="34" fill="none" stroke="#f0ebe3" stroke-width="15"/><text x="66" y="66" text-anchor="middle" fill="#7a7178" font-size="10">No work</text><text x="136" y="44" fill="#5a5258" font-size="10">Log work to</text><text x="136" y="58" fill="#5a5258" font-size="10">see balance.</text>`;
      return;
    }
    const circumference = 213.6;
    let offset = 0;
    const arcs = rows.map((row) => {
      const len = (row.count / total) * circumference;
      const arc = len ? `<circle cx="66" cy="64" r="34" fill="none" stroke="${row.color}" stroke-width="15" stroke-dasharray="${len.toFixed(1)} ${(circumference - len).toFixed(1)}" stroke-dashoffset="${(-offset).toFixed(1)}" transform="rotate(-90 66 64)"/>` : "";
      offset += len;
      return arc;
    }).join("");
    const legend = rows.map((row, index) => {
      const y = 36 + index * 27;
      const pct = Math.round((row.count / total) * 100);
      return `<g><rect x="122" y="${y - 9}" width="8" height="8" rx="2" fill="${row.color}"/><text x="136" y="${y}" fill="#161b2e" font-size="10" font-weight="700">${row.label}</text><text x="202" y="${y}" text-anchor="end" fill="#7a7178" font-size="10">${pct}%</text></g>`;
    }).join("");
    svg.innerHTML = `<circle cx="66" cy="64" r="34" fill="none" stroke="#f0ebe3" stroke-width="15"/>${arcs}<text x="66" y="61" text-anchor="middle" fill="#161b2e" font-size="21" font-weight="800">${total}</text><text x="66" y="77" text-anchor="middle" fill="#7a7178" font-size="9">items</text>${legend}`;
  }
  function renderNextAction({ paperList, assignments, quizzes, overdue, weak, avgScore }) {
    const title = document.getElementById("dashboardActionTitle");
    const text = document.getElementById("dashboardActionText");
    const button = document.getElementById("dashboardActionButton");
    if (!title || !text || !button) return;
    let target = "papers";
    let cta = "Add paper attempt";
    let actionTitle = "Add first paper score";
    let actionText = "A paper attempt is the strongest signal for exam readiness. Save one score to unlock better trend analysis.";
    if (overdue.length) {
      target = "assignments";
      cta = "Open assignments";
      actionTitle = "Clear overdue work";
      actionText = `${overdue.length} assignment${overdue.length === 1 ? " needs" : "s need"} action before the tracker can call the week safe.`;
    } else if (!paperList.length && (assignments.length || quizzes.length)) {
      target = "papers";
      cta = "Add paper score";
      actionTitle = "Add exam evidence";
      actionText = "Assignments and quizzes are saved. Add one timed paper so the dashboard can compare class work to exam performance.";
    } else if (weak.length) {
      target = "revision";
      cta = "Open revision";
      actionTitle = `Repair ${weak[0].topic}`;
      actionText = `${weak[0].avg}% is the lowest saved topic average. Do one focused revision set before adding new topics.`;
    } else if (avgScore !== null && avgScore >= 80) {
      target = "papers";
      cta = "Add harder paper";
      actionTitle = "Protect the strong pace";
      actionText = "The average is strong. Add another timed paper or Q20+ set to confirm it under exam pressure.";
    } else if (paperList.length || assignments.length || quizzes.length) {
      target = "papers";
      cta = "Add next result";
      actionTitle = "Build the evidence trail";
      actionText = "Keep logging results. The trend becomes more reliable after 4-5 saved scores.";
    }
    title.textContent = actionTitle;
    text.textContent = actionText;
    button.textContent = cta;
    button.dataset.tabJump = target;
  }
  function renderDashboardOverview() {
    const papers = readJSON(PAPER_ATTEMPTS_KEY, []);
    const paperList = Array.isArray(papers) ? papers : [];
    const assignments = readAssignments();
    const quizzes = readQuizzes();
    const paperScores = paperList.map((paper) => scorePercent(paper.rawScore)).filter((score) => score !== null);
    const avgScore = average(paperScores);
    const bestScore = paperScores.length ? Math.max(...paperScores) : null;
    const overdue = assignments.filter((assignment) => {
      const status = autoAssignmentStatus(assignment);
      return status === "Missing" || status === "Late";
    });
    const assignmentScores = assignments.map((a) => safePercent(a.rawMark, a.maxMark)).filter((score) => score !== null);
    const quizScores = quizzes.map((q) => safePercent(q.rawMark, q.maxMark)).filter((score) => score !== null);
    const bankCount = paperBankCount();
    const items = scoreItems(paperList, assignments, quizzes);
    const assignmentAvg = average(assignmentScores);
    const quizAvg = average(quizScores);
    const readinessInputs = [avgScore, assignmentAvg, quizAvg].filter((score) => score !== null);
    const readinessBase = readinessInputs.length ? average(readinessInputs) : null;
    const readiness = readinessBase === null ? null : Math.max(0, Math.min(100, readinessBase - Math.min(20, overdue.length * 5)));
    const weak = weakTopicRows(4);

    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };
    setText("paperDoneCount", String(paperList.length));
    setText("dashPaperMeta", bankCount ? `of ${bankCount} papers in the bank` : "saved attempts");
    setText("paperAverage", avgScore === null ? "0%" : `${avgScore}%`);
    setText("gradeForecast", avgScore === null ? "no score yet" : `${gradeFromPercent(avgScore)} pace`);
    setText("dashBestScore", bestScore === null ? "-" : `${bestScore}%`);
    setText("dashBestMeta", bestScore === null ? "No best paper yet" : "best saved attempt");
    setText("overdueTaskCount", String(overdue.length));
    setText("dashOverdueMeta", overdue.length === 1 ? "assignment needs action" : "assignments need action");
    setText("dashAssignmentCount", String(assignments.length));
    setText("dashAssignmentMeta", assignmentScores.length ? `${assignmentAvg}% average` : "saved tasks");
    setText("dashQuizCount", String(quizzes.length));
    setText("dashQuizMeta", quizScores.length ? `${quizAvg}% average` : "saved quizzes");

    const readinessNote = readiness === null
      ? "Add a paper, assignment, or quiz mark to start the analysis."
      : overdue.length
        ? `${Math.min(20, overdue.length * 5)} points are held back by overdue work.`
        : `${readinessInputs.length} score source${readinessInputs.length === 1 ? "" : "s"} feeding this estimate.`;
    renderReadinessGauge(readiness, readinessNote);
    renderScoreBands(items);
    renderWorkBalance(paperList, assignments, quizzes);
    renderNextAction({ paperList, assignments, quizzes, overdue, weak, avgScore });

    const weakList = document.getElementById("dashboardWeakTopicList");
    const weakMeta = document.getElementById("dashWeakMeta");
    if (weakMeta) weakMeta.textContent = weak.length ? "lowest averages" : "from marks";
    if (weakList) {
      weakList.innerHTML = weak.length
        ? weak.map((item) => `<div class="weak-topic-row">
          <span><strong>${escapeHtml(item.topic)}</strong>${item.unit ? `<em>${escapeHtml(item.unit)}</em>` : ""}</span>
          <div class="weak-topic-meter" aria-label="${escapeHtml(item.topic)} average ${item.avg}%">
            <i style="width:${item.avg}%"></i>
          </div>
          <b class="${gradeClass(item.avg)}">${item.avg}%</b>
        </div>`).join("")
        : `<div class="dashboard-empty">Save assignments or quizzes with marks to calculate weak topics.</div>`;
    }

    const paperRows = document.getElementById("dashboardPaperRows");
    if (paperRows) {
      const recent = [...paperList].sort((a, b) => String(b.date || b.createdAt || "").localeCompare(String(a.date || a.createdAt || ""))).slice(0, 6);
      paperRows.innerHTML = recent.length
        ? recent.map((paper) => {
          const pct = scorePercent(paper.rawScore);
          return `<tr>
            <td><strong>${escapeHtml(paperLabel(paper))}</strong></td>
            <td>${escapeHtml(shortDate(paper.date))}</td>
            <td>${escapeHtml(paper.rawScore ?? "-")}</td>
            <td><strong>${pct === null ? "-" : `${pct}%`}</strong></td>
            <td>${paper.timeMinutes ? `${escapeHtml(paper.timeMinutes)}m` : "-"}</td>
            <td>${escapeHtml(paper.wrongQuestions || "-")}</td>
            <td><span class="status-pill ${statusClass(paper.revisionStatus || "In progress")}">${escapeHtml(paper.revisionStatus || "In progress")}</span></td>
          </tr>`;
        }).join("")
        : `<tr><td colspan="7" class="empty-state">No paper attempts saved yet. Add a paper attempt to start the dashboard.</td></tr>`;
    }

    const assignmentRows = document.getElementById("dashboardAssignmentRows");
    if (assignmentRows) {
      const recent = [...assignments].sort((a, b) => String(b.dueDate || b.createdAt || "").localeCompare(String(a.dueDate || a.createdAt || ""))).slice(0, 6);
      assignmentRows.innerHTML = recent.length
        ? recent.map((assignment) => {
          const pct = safePercent(assignment.rawMark, assignment.maxMark);
          const grade = gradeFromPercent(pct);
          const status = autoAssignmentStatus(assignment);
          const marks = assignment.rawMark === "" || assignment.maxMark === "" ? "-" : `${assignment.rawMark}/${assignment.maxMark}`;
          return `<tr>
            <td><strong>${escapeHtml(assignment.title || "(untitled)")}</strong><span class="cell-sub">${escapeHtml(assignment.topic || assignment.unit || "")}</span></td>
            <td>${escapeHtml(shortDate(assignment.dueDate))}</td>
            <td>${escapeHtml(marks)}</td>
            <td><strong>${pct === null ? "-" : `${pct}%`}</strong></td>
            <td><span class="grade-pill ${gradeClass(pct)}">${escapeHtml(grade)}</span></td>
            <td><span class="status-pill ${statusClass(status)}">${escapeHtml(status)}</span></td>
          </tr>`;
        }).join("")
        : `<tr><td colspan="6" class="empty-state">No assignments saved yet. Add one and it will appear here with date, mark, grade, and status.</td></tr>`;
    }

    const quizRows = document.getElementById("dashboardQuizRows");
    if (quizRows) {
      const recent = [...quizzes].sort((a, b) => String(b.date || b.createdAt || "").localeCompare(String(a.date || a.createdAt || ""))).slice(0, 6);
      quizRows.innerHTML = recent.length
        ? recent.map((quiz) => {
          const pct = safePercent(quiz.rawMark, quiz.maxMark);
          const grade = gradeFromPercent(pct);
          const marks = quiz.rawMark === "" || quiz.maxMark === "" ? "-" : `${quiz.rawMark}/${quiz.maxMark}`;
          return `<tr>
            <td><strong>${escapeHtml(quiz.quizTitle || "(untitled)")}</strong><span class="cell-sub">${escapeHtml(quiz.topic || quiz.unit || "")}</span></td>
            <td>${escapeHtml(shortDate(quiz.date))}</td>
            <td>${escapeHtml(marks)}</td>
            <td><strong>${pct === null ? "-" : `${pct}%`}</strong></td>
            <td><span class="grade-pill ${gradeClass(pct)}">${escapeHtml(grade)}</span></td>
            <td>${escapeHtml(String(quiz.attemptNumber || 1))}</td>
          </tr>`;
        }).join("")
        : `<tr><td colspan="6" class="empty-state">No quizzes saved yet. Add a quiz to see its mark, grade, and date here.</td></tr>`;
    }
  }

  // ---------- CSV export ----------
  function exportCsv(name, rows, columns) {
    if (!rows.length) { alert("Nothing to export yet."); return; }
    const head = columns.join(",");
    const body = rows.map((row) => columns.map((c) => {
      const v = row[c];
      const s = v === null || v === undefined ? "" : String(v);
      return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(",")).join("\n");
    const blob = new Blob([head + "\n" + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `elite-${name}-${todayKey()}.csv`;
    document.body.appendChild(link); link.click(); link.remove();
    URL.revokeObjectURL(url);
  }
  function bindBackupCsvButtons() {
    document.getElementById("exportPastPapersCsvBtn")?.addEventListener("click", () => {
      const rows = readJSON(PAPER_ATTEMPTS_KEY, []).map((p) => ({
        ...p,
        percentage: safePercent(p.rawScore, 100)
      }));
      exportCsv("past-papers", rows, ["year","session","paperCode","date","rawScore","percentage","timeMinutes","wrongQuestions","notes","revisionStatus"]);
    });
    document.getElementById("exportAssignmentsCsvBtn2")?.addEventListener("click", () => exportCsv("assignments", readAssignments().map(prepareAssignmentForExport), ["title","unit","topic","assignmentType","dateAssigned","dueDate","submitDate","difficulty","rawMark","maxMark","percentage","grade","status","notes"]));
    document.getElementById("exportQuizzesCsvBtn2")?.addEventListener("click", () => exportCsv("quizzes", readQuizzes().map(prepareQuizForExport), ["quizTitle","unit","topic","quizType","date","difficulty","rawMark","maxMark","percentage","grade","durationMinutes","timeTakenMinutes","attemptNumber","notes"]));
  }

  // ---------- Dashboard enhancements ----------
  function renderDashboardTrend() {
    // Older builds injected this card; the current dashboard ships it in the HTML.
    if (document.getElementById("recentTrendSvg")) return; // already rendered by the dashboard markup
    const dashboardKpi = document.querySelector('section.progress-dashboard[data-tab="dashboard"]');
    if (!dashboardKpi) return;
    const card = document.createElement("section");
    card.id = "recentTrendCard";
    card.dataset.tab = "dashboard";
    card.className = "recent-trend-card";
    card.innerHTML = `
      <div class="rt-head">
        <strong>Recent score trend</strong>
        <span>last 8 attempts</span>
      </div>
      <svg id="recentTrendSvg" viewBox="0 0 320 120" xmlns="http://www.w3.org/2000/svg" aria-label="Recent score trend"></svg>`;
    dashboardKpi.insertAdjacentElement("afterend", card);
  }
  function paintRecentTrend() {
    const svg = document.getElementById("recentTrendSvg");
    if (!svg) return;
    const attempts = readJSON(PAPER_ATTEMPTS_KEY, []);
    const last = (Array.isArray(attempts) ? attempts : [])
      .slice()
      .sort((a, b) => String(a.date || a.createdAt || "").localeCompare(String(b.date || b.createdAt || "")))
      .slice(-8);
    if (!last.length) {
      svg.innerHTML = `<rect x="10" y="12" width="300" height="86" rx="8" fill="#fbfaf7" stroke="#e1dacd"/><text x="160" y="60" text-anchor="middle" fill="#5a5258" font-size="11">No paper attempts yet.</text>`;
      return;
    }
    const w = 320; const h = 120; const left = 24; const right = 12; const top = 12; const bottom = 28;
    const plotW = w - left - right; const plotH = h - top - bottom;
    const xs = last.map((_, i) => left + (i * plotW) / Math.max(1, last.length - 1));
    const ys = last.map((a) => {
      const pct = scorePercent(a.rawScore) || 0;
      return top + (100 - pct) / 100 * plotH;
    });
    const grid = [40, 60, 80, 100].map((score) => {
      const y = top + (100 - score) / 100 * plotH;
      return `<line x1="${left}" y1="${y.toFixed(1)}" x2="${w - right}" y2="${y.toFixed(1)}" stroke="#e8e1d7" stroke-width="0.7"/><text x="4" y="${(y + 3).toFixed(1)}" fill="#7a7178" font-size="8">${score}</text>`;
    }).join("");
    const labels = last.map((a, i) => {
      const label = shortDate(a.date || a.createdAt || "");
      return `<text x="${xs[i].toFixed(1)}" y="${h - 9}" text-anchor="middle" fill="#7a7178" font-size="8">${escapeHtml(label)}</text>`;
    }).join("");
    if (last.length === 1) {
      const pct = scorePercent(last[0].rawScore) || 0;
      const barH = Math.max(4, (pct / 100) * plotH);
      const barX = left + plotW / 2 - 18;
      const barY = top + plotH - barH;
      svg.innerHTML = `${grid}<rect x="${barX}" y="${barY.toFixed(1)}" width="36" height="${barH.toFixed(1)}" rx="5" fill="#c0392b"/><circle cx="${(barX + 18).toFixed(1)}" cy="${barY.toFixed(1)}" r="3.5" fill="#161b2e"/><text x="${(barX + 18).toFixed(1)}" y="${(barY - 7).toFixed(1)}" text-anchor="middle" fill="#161b2e" font-size="10" font-weight="700">${pct}%</text>${labels}`;
      return;
    }
    const area = `${left},${top + plotH} ${xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ")} ${w - right},${top + plotH}`;
    const polyline = xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
    const dots = xs.map((x, i) => {
      const pct = scorePercent(last[i].rawScore) || 0;
      return `<g><circle cx="${x.toFixed(1)}" cy="${ys[i].toFixed(1)}" r="3" fill="#c0392b"/><text x="${x.toFixed(1)}" y="${(ys[i] - 7).toFixed(1)}" text-anchor="middle" fill="#161b2e" font-size="8">${pct}</text></g>`;
    }).join("");
    svg.innerHTML = `${grid}<polygon points="${area}" fill="rgba(192,57,43,0.08)"/><polyline points="${polyline}" fill="none" stroke="#161b2e" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>${dots}${labels}`;
  }
  function paintPerformanceGraph() {
    const svg = document.getElementById("dashboardPerformanceSvg");
    if (!svg) return;
    const papers = readJSON(PAPER_ATTEMPTS_KEY, []);
    const paperAvg = average((Array.isArray(papers) ? papers : []).map((paper) => scorePercent(paper.rawScore)).filter((score) => score !== null));
    const assignmentAvg = average(readAssignments().map((a) => safePercent(a.rawMark, a.maxMark)).filter((score) => score !== null));
    const quizAvg = average(readQuizzes().map((q) => safePercent(q.rawMark, q.maxMark)).filter((score) => score !== null));
    const rows = [
      { label: "Papers", value: paperAvg, color: "#161b2e" },
      { label: "Assign", value: assignmentAvg, color: "#c0392b" },
      { label: "Quizzes", value: quizAvg, color: "#b7812a" }
    ];
    if (rows.every((row) => row.value === null)) {
      svg.innerHTML = `<rect x="8" y="10" width="224" height="92" rx="8" fill="#fbfaf7" stroke="#e1dacd"/><text x="120" y="58" text-anchor="middle" fill="#5a5258" font-size="10">Add marks to build the graph.</text>`;
      return;
    }
    const bars = rows.map((row, index) => {
      const y = 22 + index * 30;
      const value = row.value ?? 0;
      const width = Math.max(2, (value / 100) * 132);
      const label = row.value === null ? "-" : `${row.value}%`;
      return `<g>
        <text x="8" y="${y + 12}" fill="#161b2e" font-size="10" font-weight="700">${row.label}</text>
        <rect x="62" y="${y}" width="132" height="14" rx="7" fill="#f1ece3"/>
        <rect x="62" y="${y}" width="${width.toFixed(1)}" height="14" rx="7" fill="${row.color}"/>
        <text x="206" y="${y + 11}" fill="#161b2e" font-size="10" font-weight="700">${label}</text>
      </g>`;
    }).join("");
    svg.innerHTML = `<line x1="62" y1="102" x2="194" y2="102" stroke="#d8d0c3"/><text x="62" y="114" fill="#7a7178" font-size="8">0</text><text x="184" y="114" fill="#7a7178" font-size="8">100</text>${bars}`;
  }

  // ---------- Refresh all ----------
  function refreshAll() {
    renderAssignments();
    renderQuizzes();
    renderRevision();
    renderDashboardOverview();
    paintRecentTrend();
    paintPerformanceGraph();
  }

  // ---------- Init ----------
  function init() {
    runMigration();
    backfillPaperRevisionStatus();
    renderDashboardTrend();
    setupTabs();
    setupTabJumps();
    bindAssignmentForm(); bindAssignmentRowEvents();
    bindQuizForm(); bindQuizRowEvents();
    bindBackupCsvButtons();
    refreshAll();

    window.EliteTrackerV2 = {
      activateTab,
      refresh: refreshAll
    };

    // Listen for storage writes from other modules (progress.js paper save).
    window.addEventListener("storage", refreshAll);
    // Repaint when user switches back to the tab.
    document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshAll(); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
