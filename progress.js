(function () {
  const questions = window.QUESTION_DATA || [];
  const PROFILE_KEY = "eliteStudentProfileV1";
  const SOLVED_KEY = "solvedExpertiseQuestions";
  const SELECTED_KEY = "selectedExpertiseQuestions";
  const REVIEW_KEY = "eliteMistakeBoxV1";
  const READINESS_KEY = "eliteReadinessCheck";
  const ACTIVITY_KEY = "eliteStudyActivityV1";

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

  function renderSummary() {
    const all = bankQuestions("all");
    const expertise = bankQuestions("expertise");
    const allSolved = all.filter(isSolved).length;
    const expertiseSolved = expertise.filter(isSolved).length;
    const selectedAll = all.filter(isSelected).length;
    const dueMistakes = Object.values(reviewItems).filter((item) => !item.masteredAt && Number(item.dueAt || 0) <= Date.now()).length;
    const activity = readActivity();

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
      activity: readActivity()
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
    const weak = topicRows().sort((a, b) => pct(a.solved, a.total) - pct(b.solved, b.total))[0];
    const message = [
      "Hello Dr Eslam, this is my website progress summary.",
      profile.name ? `Name: ${profile.name}` : "",
      profile.targetGrade ? `Target grade: ${profile.targetGrade}` : "",
      profile.examSession ? `Exam session: ${profile.examSession}` : "",
      `Full classified solved: ${allSolved}/${all.length}`,
      `Q20+ solved: ${expertiseSolved}/${expertise.length}`,
      weak ? `Weak topic: ${weak.topic}` : "",
      "Can you tell me what to focus on next?"
    ].filter(Boolean).join("\n");
    els.sendBtn.href = `https://wa.me/201120009622?text=${encodeURIComponent(message)}`;
  }

  function render() {
    renderSummary();
    renderNextMoves();
    renderRows();
    updateSendLink();
  }

  recordVisit();
  loadProfileForm();
  renderUnitFilter();
  render();

  els.form.addEventListener("submit", saveProfile);
  els.unitFilter.addEventListener("change", renderRows);
  els.statusFilter.addEventListener("change", renderRows);
  els.search.addEventListener("input", renderRows);
  els.exportBtn.addEventListener("click", exportProgress);
  els.importInput.addEventListener("change", () => importProgress(els.importInput.files?.[0]));
})();
