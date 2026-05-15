(function () {
  const questions = window.QUESTION_DATA || [];
  const solutions = window.SOLUTION_DATA || {};
  const EXAM_KEY = "eliteMockExamV1";
  const HISTORY_KEY = "eliteMockExamHistoryV1";
  const REVIEW_KEY = "eliteMistakeBoxV1";
  const SOLVED_KEY = "solvedExpertiseQuestions";

  const els = {
    bank: document.getElementById("examBank"),
    modularUnit: document.getElementById("examModularUnit"),
    duration: document.getElementById("examDuration"),
    count: document.getElementById("examCount"),
    start: document.getElementById("startExamBtn"),
    finish: document.getElementById("finishExamBtn"),
    save: document.getElementById("saveExamBtn"),
    reset: document.getElementById("resetExamBtn"),
    print: document.getElementById("printExamBtn"),
    timer: document.getElementById("examTimer"),
    timerLabel: document.getElementById("examTimerLabel"),
    result: document.getElementById("examResultCard"),
    weakness: document.getElementById("examWeaknessGrid"),
    paper: document.getElementById("examPaper")
  };

  let state = readState();
  let tickHandle = null;

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    }[char]));
  }

  function readJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch (err) {
      return fallback;
    }
  }

  function readState() {
    return readJson(EXAM_KEY, { status: "idle", ids: [], scores: {} });
  }

  function saveState() {
    localStorage.setItem(EXAM_KEY, JSON.stringify(state));
  }

  function questionById(id) {
    return questions.find((question) => question.id === id);
  }

  function shuffle(items) {
    const pool = [...items];
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool;
  }

  function takeUnique(target, pool, count) {
    const used = new Set(target.map((question) => question.id));
    shuffle(pool).forEach((question) => {
      if (target.length >= count || used.has(question.id)) return;
      target.push(question);
      used.add(question.id);
    });
  }

  function buildBalancedPaper(bank, count, unit = "") {
    const pool = questions.filter((question) => question.bank === bank && (!unit || question.unit === unit));
    const quickTarget = Math.max(3, Math.round(count * 0.28));
    const standardTarget = Math.max(5, Math.round(count * 0.4));
    const longTarget = count - quickTarget - standardTarget;
    const picked = [];
    takeUnique(picked, pool.filter((question) => question.marks <= 3), quickTarget);
    takeUnique(picked, pool.filter((question) => question.marks >= 4 && question.marks <= 6), quickTarget + standardTarget);
    takeUnique(picked, pool.filter((question) => question.marks >= 7 || question.question >= 20), quickTarget + standardTarget + longTarget);
    takeUnique(picked, pool, count);
    return picked.slice(0, count);
  }

  function formatTime(totalSeconds) {
    const seconds = Math.max(0, Math.floor(totalSeconds));
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function remainingSeconds() {
    if (state.status !== "running") return Number(state.durationSeconds || 0);
    const elapsed = Math.floor((Date.now() - Number(state.startedAt || Date.now())) / 1000);
    return Number(state.durationSeconds || 0) - elapsed;
  }

  function updateTimer() {
    const remaining = remainingSeconds();
    els.timer.textContent = formatTime(remaining);
    if (state.status === "running") {
      els.timerLabel.textContent = remaining <= 0 ? "Time is up" : "Exam running";
      if (remaining <= 0) {
        state.status = "marking";
        state.finishedAt = Date.now();
        saveState();
        render();
      }
    } else if (state.status === "marking") {
      els.timerLabel.textContent = "Mark your paper";
    } else if (state.status === "complete") {
      els.timerLabel.textContent = "Result saved";
    } else {
      els.timer.textContent = `${els.duration.value}:00`;
      els.timerLabel.textContent = "Ready to start";
    }
  }

  function startTicker() {
    if (tickHandle) clearInterval(tickHandle);
    tickHandle = setInterval(updateTimer, 1000);
    updateTimer();
  }

  function startExam() {
    const count = Number(els.count.value || 25);
    const picked = buildBalancedPaper(els.bank.value, count, els.modularUnit?.value || "");
    state = {
      status: "running",
      bank: els.bank.value,
      modularUnit: els.modularUnit?.value || "",
      durationSeconds: Number(els.duration.value || 90) * 60,
      startedAt: Date.now(),
      finishedAt: null,
      ids: picked.map((question) => question.id),
      scores: {}
    };
    saveState();
    render();
  }

  function finishExam() {
    if (state.status !== "running") return;
    state.status = "marking";
    state.finishedAt = Date.now();
    saveState();
    render();
  }

  function totalMarks() {
    return state.ids.map(questionById).filter(Boolean).reduce((sum, question) => sum + Number(question.marks || 0), 0);
  }

  function achievedMarks() {
    return state.ids.reduce((sum, id) => sum + Math.max(0, Number(state.scores?.[id] || 0)), 0);
  }

  function readScoreInputs() {
    document.querySelectorAll("[data-score-id]").forEach((input) => {
      const question = questionById(input.dataset.scoreId);
      if (!question) return;
      const value = Math.max(0, Math.min(Number(question.marks || 0), Number(input.value || 0)));
      state.scores[input.dataset.scoreId] = value;
    });
  }

  function addMistakesToReview() {
    const review = readJson(REVIEW_KEY, {});
    const solved = new Set(readJson(SOLVED_KEY, []));
    const now = Date.now();
    state.ids.forEach((id) => {
      const question = questionById(id);
      if (!question) return;
      const score = Number(state.scores?.[id] || 0);
      if (score >= Number(question.marks || 0)) {
        solved.add(id);
        return;
      }
      review[id] = {
        id,
        reason: "mock-exam",
        level: 0,
        attempts: (review[id]?.attempts || 0) + 1,
        addedAt: review[id]?.addedAt || now,
        updatedAt: now,
        dueAt: now
      };
    });
    localStorage.setItem(REVIEW_KEY, JSON.stringify(review));
    localStorage.setItem(SOLVED_KEY, JSON.stringify([...solved]));
  }

  function saveMarks() {
    if (state.status !== "marking" && state.status !== "complete") return;
    readScoreInputs();
    state.status = "complete";
    state.savedAt = Date.now();
    saveState();
    addMistakesToReview();
    saveHistory();
    render();
  }

  function saveHistory() {
    const history = readJson(HISTORY_KEY, []);
    const total = totalMarks();
    const score = achievedMarks();
    history.unshift({
      date: new Date().toISOString(),
      bank: state.bank,
      score,
      total,
      percent: total ? Math.round((score / total) * 100) : 0
    });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 10)));
  }

  function resetExam() {
    state = { status: "idle", ids: [], scores: {} };
    saveState();
    render();
  }

  function topicBreakdown() {
    const map = new Map();
    state.ids.map(questionById).filter(Boolean).forEach((question) => {
      const score = Math.max(0, Number(state.scores?.[question.id] || 0));
      const row = map.get(question.topic) || { topic: question.topic, unit: question.unit, score: 0, total: 0, lost: 0 };
      row.score += score;
      row.total += Number(question.marks || 0);
      row.lost += Math.max(0, Number(question.marks || 0) - score);
      map.set(question.topic, row);
    });
    return [...map.values()].sort((a, b) => b.lost - a.lost || b.total - a.total);
  }

  function topicLink(row) {
    const params = new URLSearchParams({ bank: state.bank || "all", unit: row.unit, topic: row.topic, mode: "weak" });
    return `practice.html?${params.toString()}`;
  }

  function formatInlineMarkdown(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");
  }

  function formatSolutionText(text) {
    const escaped = escapeHtml(text).trim();
    if (!escaped) return `<p class="solution-empty">Solution has not been written yet.</p>`;
    return escaped
      .split(/\n{2,}/)
      .map((block) => {
        const lines = block.split(/\n/);
        if (lines.length > 1 && lines.every((line) => /^[-*]\s+/.test(line.trim()))) {
          return `<ul>${lines.map((line) => `<li>${formatInlineMarkdown(line.trim().replace(/^[-*]\s+/, ""))}</li>`).join("")}</ul>`;
        }
        return `<p>${formatInlineMarkdown(block).replace(/\n/g, "<br>")}</p>`;
      })
      .join("");
  }

  function renderResult() {
    if (state.status === "idle") {
      const last = readJson(HISTORY_KEY, [])[0];
      els.result.innerHTML = last
        ? `<strong>Last mock: ${last.score}/${last.total} (${last.percent}%).</strong><p>Generate a fresh paper when you are ready for the next check.</p>`
        : `<strong>No active mock yet.</strong><p>Generate a paper to begin. Answers stay private until you finish.</p>`;
      els.weakness.innerHTML = "";
      return;
    }
    const total = totalMarks();
    const score = achievedMarks();
    const percent = total ? Math.round((score / total) * 100) : 0;
    const label = state.status === "running" ? "Exam in progress" : state.status === "marking" ? "Self-marking mode" : "Mock result saved";
      els.result.innerHTML = `<div class="exam-score-ring" style="--score:${percent}%"><strong>${percent}%</strong><span>${score}/${total}</span></div>
      <div><strong>${label}</strong><p>${state.ids.length} questions. ${state.status === "running" ? "Answers are kept private until you finish." : "Enter your marks, then save to update the Mistake Box."}</p></div>`;
    if (state.status === "running") {
      els.weakness.innerHTML = "";
      return;
    }
    els.weakness.innerHTML = topicBreakdown().slice(0, 4).map((row) => `<article>
      <strong>${escapeHtml(row.topic)}</strong>
      <p>${row.score}/${row.total} marks. Lost ${row.lost} mark${row.lost === 1 ? "" : "s"}.</p>
      <a class="button primary" href="${topicLink(row)}">Revise topic</a>
    </article>`).join("");
  }

  function renderPaper() {
    if (!state.ids.length) {
      els.paper.innerHTML = `<div class="empty-roadmap">Your generated paper will appear here.</div>`;
      return;
    }
    const canMark = state.status !== "running";
    els.paper.innerHTML = state.ids.map((id, index) => {
      const question = questionById(id);
      if (!question) return "";
      const solution = solutions[id]?.source || "";
      const hasSolution = Boolean(solution);
      const savedScore = state.scores?.[id] ?? "";
      return `<article class="exam-question" data-id="${escapeHtml(id)}">
        <div class="print-paper-brand">
          <strong>Elite IGCSE Mathematics - Dr Eslam Ahmed</strong>
          <span>Assistant Lecturer, Cairo University Faculty of Engineering | WhatsApp: 01120009622 | eliteigcse.com</span>
        </div>
        <header>
          <div>
            <span>Question ${index + 1}</span>
            <strong>${escapeHtml(question.paper)} Q${question.question}</strong>
          </div>
          <em>${question.marks} marks</em>
        </header>
        <img src="${question.image}" alt="${escapeHtml(question.paper)} Q${question.question}" loading="lazy">
        <footer>
          <span>${escapeHtml(question.topic)}</span>
          ${canMark ? `<label>Score <input data-score-id="${escapeHtml(id)}" type="number" min="0" max="${question.marks}" value="${savedScore}"> / ${question.marks}</label>` : `<span>Answers stay private during the exam</span>`}
        </footer>
        ${canMark && hasSolution ? `<details class="exam-solution"><summary>Show worked solution</summary>${formatSolutionText(solution)}</details>` : ""}
        <div class="print-paper-footer">Prepared by Dr Eslam Ahmed | Assistant Lecturer, Cairo University Faculty of Engineering | 01120009622</div>
      </article>`;
    }).join("");
    if (window.MathJax?.typesetPromise && canMark) {
      window.MathJax.typesetPromise([els.paper]).catch(() => {});
    }
  }

  function renderButtons() {
    els.finish.disabled = state.status !== "running";
    els.save.disabled = state.status !== "marking" && state.status !== "complete";
    els.print.disabled = !state.ids.length;
    els.start.disabled = state.status === "running";
  }

  function render() {
    renderButtons();
    renderResult();
    renderPaper();
    updateTimer();
  }

  els.start.addEventListener("click", startExam);
  els.finish.addEventListener("click", finishExam);
  els.save.addEventListener("click", saveMarks);
  els.reset.addEventListener("click", resetExam);
  els.print.addEventListener("click", () => window.print());
  els.paper.addEventListener("input", (event) => {
    if (!event.target.matches("[data-score-id]")) return;
    readScoreInputs();
    saveState();
    renderResult();
  });
  els.duration.addEventListener("change", () => {
    if (state.status === "idle") updateTimer();
  });
  els.modularUnit?.addEventListener("change", () => {
    if (state.status === "idle") updateTimer();
  });

  render();
  startTicker();
})();
