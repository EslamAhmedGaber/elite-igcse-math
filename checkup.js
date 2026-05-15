(function () {
  const questions = window.QUESTION_DATA || [];
  const solved = new Set(JSON.parse(localStorage.getItem("solvedExpertiseQuestions") || "[]"));
  const selected = new Set(JSON.parse(localStorage.getItem("selectedExpertiseQuestions") || "[]"));
  const saved = JSON.parse(localStorage.getItem("eliteReadinessCheck") || "{}");

  const els = {
    target: document.getElementById("checkTarget"),
    mock: document.getElementById("checkMock"),
    confidence: document.getElementById("checkConfidence"),
    time: document.getElementById("checkTime"),
    weakUnits: document.getElementById("weakUnits"),
    run: document.getElementById("runCheckBtn"),
    save: document.getElementById("saveCheckBtn"),
    card: document.getElementById("readinessCard"),
    recommendations: document.getElementById("recommendations")
  };

  const notesByUnit = {
    "Chapter 2: Equations, Formulae & Identities": "downloads/notes/chapter-2-algebra-notes.pdf",
    "Chapter 3: Sequences, Functions & Graphs": "downloads/notes/chapter-3-functions-graphs-notes.pdf"
  };

  function escapeHtml(value) {
    return String(value | "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    }[char]));
  }

  function unitStats() {
    const map = new Map();
    questions.forEach((question) => {
      const unit = question.unit || "Mixed";
      const row = map.get(unit) || { unit, total: 0, expertise: 0, solved: 0, topics: new Map() };
      row.total += 1;
      if (question.bank === "expertise") row.expertise += 1;
      if (solved.has(question.id)) row.solved += 1;
      const topic = question.topic || "Mixed";
      const topicRow = row.topics.get(topic) || { topic, total: 0, expertise: 0, solved: 0 };
      topicRow.total += 1;
      if (question.bank === "expertise") topicRow.expertise += 1;
      if (solved.has(question.id)) topicRow.solved += 1;
      row.topics.set(topic, topicRow);
      map.set(unit, row);
    });
    return [...map.values()].sort((a, b) => a.unit.localeCompare(b.unit));
  }

  function topicLink(unit, topic, bank = "all", mode = "") {
    const params = new URLSearchParams({ unit, topic, bank });
    if (mode) params.set("mode", mode);
    return `practice.html?${params.toString()}`;
  }

  function populateWeakUnits() {
    const unitLabel = window.ELITE_PATHWAY?.label("unitLowerPlural") || "units";
    els.weakUnits.innerHTML = unitStats().map((row) => {
      const checked = saved.weakUnits?.includes(row.unit) ? "checked" : "";
      return `<label><input type="checkbox" value="${escapeHtml(row.unit)}" ${checked}>${escapeHtml(row.unit)}</label>`;
    }).join("");
  }

  function loadSaved() {
    if (!saved.target) return;
    els.target.value = saved.target;
    els.mock.value = saved.mock;
    els.confidence.value = saved.confidence;
    els.time.value = saved.time;
  }

  function currentSettings() {
    return {
      target: els.target.value,
      mock: els.mock.value,
      confidence: els.confidence.value,
      time: els.time.value,
      weakUnits: [...els.weakUnits.querySelectorAll("input:checked")].map((input) => input.value)
    };
  }

  function score(settings) {
    const targetPenalty = { "9": 12, "8": 8, "7": 4, "6": 0 }[settings.target] || 0;
    const mockScore = settings.mock === "unknown" ? 58 : Number(settings.mock);
    const confidenceScore = { low: 45, medium: 65, high: 82 }[settings.confidence] || 65;
    const timeScore = Math.min(90, Number(settings.time) * 8);
    const solvedScore = Math.min(92, Math.round((solved.size / Math.max(1, questions.length)) * 220));
    const selectedScore = Math.min(20, selected.size);
    const weakPenalty = Math.min(20, settings.weakUnits.length * 5);
    return Math.max(12, Math.min(98, Math.round(mockScore * 0.34 + confidenceScore * 0.24 + timeScore * 0.18 + solvedScore * 0.18 + selectedScore * 0.06 - targetPenalty - weakPenalty)));
  }

  function readinessLabel(value) {
    if (value >= 78) return "Strong - polish exam technique";
    if (value >= 58) return "Building - practise weak topics";
    if (value >= 38) return "Needs structure - use notes and guided practice";
    return "Start gently - rebuild core topics first";
  }

  function weakestTopics(unit) {
    const row = unitStats().find((item) => item.unit === unit) || unitStats()[0];
    return [...row.topics.values()]
      .sort((a, b) => (a.solved / Math.max(1, a.total)) - (b.solved / Math.max(1, b.total)) || b.expertise - a.expertise)
      .slice(0, 3)
      .map((topic) => ({ ...topic, unit: row.unit }));
  }

  function actionCard(title, text, href, button) {
    return `<article class="recommendation-card">
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(text)}</p>
      <a class="button primary" href="${href}">${escapeHtml(button)}</a>
    </article>`;
  }

  function runCheck() {
    const settings = currentSettings();
    const value = score(settings);
    const units = settings.weakUnits.length ? settings.weakUnits : unitStats().sort((a, b) => (a.solved / Math.max(1, a.total)) - (b.solved / Math.max(1, b.total))).slice(0, 2).map((row) => row.unit);
    const topic = weakestTopics(units[0])[0];
    const noteUnit = units.find((unit) => notesByUnit[unit]);

    els.card.innerHTML = `<div class="readiness-score" style="--score:${value}%"><strong>${value}</strong><span>/100</span></div>
      <div><strong>${readinessLabel(value)}</strong><p>First focus: <b>${escapeHtml(units[0])}</b>. You have marked <b>${solved.size}</b> solved questions and selected <b>${selected.size}</b> questions in this browser.</p></div>`;

    const cards = [
      actionCard("Fix one weak topic first", `Start with ${topic.topic}. Solve a small set before checking solutions.`, topicLink(topic.unit, topic.topic), "Open practice"),
      noteUnit
        ? actionCard("Read the matching notes", `${noteUnit} has visual notes ready. Use them before the question set.`, notesByUnit[noteUnit], "Read notes")
        : actionCard("Use the roadmap", "Choose one topic from your weakest chapter or unit and work through it in order.", "topics.html", "Open roadmap"),
      actionCard("Train the hard questions", "Do one Q20+ set each week so long questions stop feeling scary.", "practice.html?bank=expertise&mode=q20", "Train Q20+"),
      actionCard("Turn this into a plan", "Build a weekly route using your exam date, target grade, and weak chapter or unit.", `planner.html?focus=${encodeURIComponent(units[0])}`, "Build plan")
    ];
    els.recommendations.innerHTML = cards.join("");
    return settings;
  }

  function saveCheck() {
    const settings = runCheck();
    localStorage.setItem("eliteReadinessCheck", JSON.stringify(settings));
    els.save.textContent = "Saved";
    setTimeout(() => { els.save.textContent = "Save result"; }, 1400);
  }

  populateWeakUnits();
  loadSaved();
  runCheck();
  els.run.addEventListener("click", runCheck);
  els.save.addEventListener("click", saveCheck);
})();
