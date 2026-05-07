(function () {
  const questions = window.QUESTION_DATA || [];
  const PROFILE_KEY = "eliteStudentProfileV1";
  const SOLVED_KEY = "solvedExpertiseQuestions";
  const SELECTED_KEY = "selectedExpertiseQuestions";
  const REVIEW_KEY = "eliteMistakeBoxV1";
  const READINESS_KEY = "eliteReadinessCheck";
  const ACTIVITY_KEY = "eliteStudyActivityV1";
  const PAPER_ATTEMPTS_KEY = "elitePaperAttemptsV1";
  const STUDY_TASKS_KEY = "eliteStudyTasksV1";
  const MOCK_HISTORY_KEY = "eliteMockExamHistoryV1";

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
    return questions.filter((question) => question.bank === bank);
  }

  function uniqueSorted(values) {
    return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  function topicRows() {
    const expertiseByTopic = new Map();
    bankQuestions("expertise").forEach((question) => {
      const key = `${question.unit}|||${question.topic}`;
      const row = expertiseByTopic.get(key) || { total: 0, solved: 0 };
      row.total += 1;
      if (isSolved(question)) row.solved += 1;
      expertiseByTopic.set(key, row);
    });

    const rows = new Map();
    bankQuestions("all").forEach((question) => {
      const key = `${question.unit}|||${question.topic}`;
      const row = rows.get(key) || {
        unit: question.unit || "Mixed",
        topic: question.topic || "Mixed",
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
    const match = String(name || "").match(/^([A-Za-z]+)\s+(\d{4})\s+(P?\dH[R]?)$/i);
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
    return `${item.session || ""} ${item.year || ""} ${item.paperCode || ""}`.trim();
  }

  function allPaperOptions() {
    const map = new Map();
    bankQuestions("all").forEach((question) => {
      const parsed = parsePaperName(question.paper);
      if (!parsed) return;
      const key = paperKey(parsed);
      if (!map.has(key)) map.set(key, parsed);
    });
    const sessionOrder = { Jan: 1, May: 2, Jun: 3, Nov: 4 };
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
    const params = new URLSearchParams({ bank, unit: row.unit, topic: row.topic });
    if (bank === "expertise") params.set("mode", "q20");
    return `practice.html?${params.toString()}`;
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
      const row = map.get(question.topic) || { total: 0, due: 0 };
      row.total += 1;
      if (!item.masteredAt && Number(item.dueAt || 0) <= Date.now()) row.due += 1;
      map.set(question.topic, row);
    });
    return map;
  }

  function priorityRowsData() {
    const reviewCounts = reviewCountsByTopic();
    return topicRows().map((row) => {
      const fullPct = pct(row.solved, row.total);
      const expertisePct = pct(row.expertiseSolved, row.expertiseTotal);
      const review = reviewCounts.get(row.topic) || { total: 0, due: 0 };
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
    const units = uniqueSorted(topicRows().map((row) => row.unit));
    els.unitFilter.innerHTML = `<option value="">All units</option>${units.map((unit) => `<option>${escapeHtml(unit)}</option>`).join("")}`;
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
        <a class="button light" href="planner.html">Build weekly plan</a>
      </article>`,
      `<article>
        <span>Exam finishers</span>
        <strong>Q20+ training</strong>
        <p>Use expertise questions when a topic is started but not yet strong.</p>
        <a class="button light" href="practice.html?bank=expertise&mode=q20">Open Q20+</a>
      </article>`
    ].join("");
  }

  function renderRows() {
    const unit = els.unitFilter.value;
    const status = els.statusFilter.value;
    const search = els.search.value.trim().toLowerCase();
    const rows = topicRows().filter((row) => {
      if (unit && row.unit !== unit) return false;
      if (status && statusFor(row) !== status) return false;
      if (search && !`${row.topic} ${row.unit}`.toLowerCase().includes(search)) return false;
      return true;
    });

    if (!rows.length) {
      els.rows.innerHTML = `<tr><td colspan="5">No topics match these filters.</td></tr>`;
      return;
    }

    els.rows.innerHTML = rows.map((row) => {
      const fullPct = pct(row.solved, row.total);
      const status = statusFor(row).replace("-", " ");
      return `<tr>
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
            ${row.expertiseTotal ? `<a href="${practiceLink(row, "expertise")}">Q20+</a>` : ""}
          </div>
        </td>
      </tr>`;
    }).join("");
  }

  function renderPriorityRows() {
    const rows = priorityRowsData().slice(0, 10);
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
        <div class="sheet-progress-label"><span>${row.fullPct}% full</span><span>${row.expertisePct}% Q20+</span></div>
        <div class="topic-bar"><i style="width:${row.fullPct}%"></i></div>
      </td>
      <td>${row.review.total} saved <span class="muted-cell">(${row.review.due} due)</span></td>
      <td><span class="status-pill ${row.className}">${escapeHtml(row.verdict)}</span></td>
      <td><div class="sheet-actions"><a href="${practiceLink(row)}">Practice</a>${row.expertiseTotal ? `<a href="${practiceLink(row, "expertise")}">Q20+</a>` : ""}</div></td>
    </tr>`).join("");
  }

  function renderPaperControls() {
    const papers = allPaperOptions();
    const years = uniqueSorted(papers.map((paper) => paper.year)).sort((a, b) => Number(b) - Number(a));
    const sessionOrder = ["Jan", "May", "Jun", "Nov"];
    const sessions = uniqueSorted(papers.map((paper) => paper.session)).sort((a, b) => sessionOrder.indexOf(a) - sessionOrder.indexOf(b));
    const codes = uniqueSorted(papers.map((paper) => paper.paperCode));
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
  }

  function deletePaperAttempt(id) {
    paperAttempts = paperAttempts.filter((attempt) => attempt.id !== id);
    writeJSON(PAPER_ATTEMPTS_KEY, paperAttempts);
    if (window.EliteCloud?.queueSync) window.EliteCloud.queueSync();
    render();
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
      row.best = percent === null ? row.best : Math.max(row.best ?? 0, percent);
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
      return (aDays ?? 9999) - (bDays ?? 9999);
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
      version: 1,
      profile,
      solved: [...solved],
      selected: [...selected],
      reviewItems,
      readiness,
      activity: readActivity(),
      paperAttempts,
      studyTasks,
      mockHistory
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
        if (Array.isArray(data.mockHistory)) writeJSON(MOCK_HISTORY_KEY, data.mockHistory);
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
      `Full classified solved: ${allSolved}/${all.length}`,
      `Q20+ solved: ${expertiseSolved}/${expertise.length}`,
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
  loadProfileForm();
  renderUnitFilter();
  renderPaperControls();
  renderTaskControls();
  render();

  els.form.addEventListener("submit", saveProfile);
  els.unitFilter.addEventListener("change", renderRows);
  els.statusFilter.addEventListener("change", renderRows);
  els.search.addEventListener("input", renderRows);
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
