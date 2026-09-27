(function () {
  const questions = window.QUESTION_DATA || [];
  const meta = window.SITE_META || {};
  const catalog = Array.isArray(window.TOPIC_CATALOG) ? window.TOPIC_CATALOG : [];
  const catalogByTopic = new Map(catalog.map((entry) => [entry.topic, entry]));
  const selected = new Set(JSON.parse(localStorage.getItem("selectedExpertiseQuestions") || "[]"));
  const solved = new Set(JSON.parse(localStorage.getItem("solvedExpertiseQuestions") || "[]"));

  const els = {
    total: document.getElementById("roadmapTotal"),
    topics: document.getElementById("roadmapTopics"),
    solved: document.getElementById("roadmapSolved"),
    search: document.getElementById("roadmapSearch"),
    unit: document.getElementById("roadmapUnit"),
    bank: document.getElementById("roadmapBank"),
    progress: document.getElementById("roadmapProgress"),
    grid: document.getElementById("roadmapGrid"),
  };

  if (!els.grid) return;

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[char]));
  }

  function uniqueSorted(values) {
    return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  function topicStats() {
    const byTopic = new Map();
    const baseTopics = catalog.length
      ? catalog
      : [...new Set(questions.map((question) => question.topic).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b))
        .map((topic, index) => ({ topic, unit: "Mixed", order: index + 1 }));

    baseTopics.forEach((entry) => {
      const key = `${entry.unit}|||${entry.topic}`;
      byTopic.set(key, {
        unit: entry.unit,
        topic: entry.topic,
        topicOrder: entry.order || 999,
        all: 0,
        expertise: 0,
        marks: 0,
        solvedAll: 0,
        solvedExpertise: 0,
        selected: 0,
        papers: new Set(),
      });
    });

    questions.forEach((question) => {
      const topic = question.canonical_topic || question.topic;
      const catalogEntry = catalogByTopic.get(topic);
      const key = `${(catalogEntry?.unit || question.unit || "Mixed")}|||${topic}`;
      const row = byTopic.get(key) || {
        unit: catalogEntry?.unit || question.unit || "Mixed",
        topic,
        topicOrder: catalogEntry?.order || question.topic_order || 999,
        all: 0,
        expertise: 0,
        marks: 0,
        solvedAll: 0,
        solvedExpertise: 0,
        selected: 0,
        papers: new Set(),
      };
      if (question.bank === "all") row.all += 1;
      if (question.bank === "expertise") row.expertise += 1;
      row.marks += Number(question.marks || 0);
      if (solved.has(question.id) && question.bank === "all") row.solvedAll += 1;
      if (solved.has(question.id) && question.bank === "expertise") row.solvedExpertise += 1;
      if (selected.has(question.id)) row.selected += 1;
      if (question.paper) row.papers.add(question.paper);
      byTopic.set(key, row);
    });
    return [...byTopic.values()].sort((a, b) => a.topicOrder - b.topicOrder || a.topic.localeCompare(b.topic));
  }

  let topics = topicStats();

  function fillUnitFilter() {
    const unitLabel = window.ELITE_PATHWAY?.label("unitLowerPlural") || "units";
    els.unit.innerHTML = "";
    els.unit.append(new Option(`All ${unitLabel}`, ""));
    uniqueSorted(topics.map((row) => row.unit)).forEach((unit) => els.unit.append(new Option(unit, unit)));
  }

  function query(topic, bank) {
    const params = new URLSearchParams();
    params.set("topic", topic);
    params.set("bank", bank || els.bank.value || "all");
    return `practice.html?${params.toString()}`;
  }

  function progressState(row, total, bank) {
    const solvedCount = bank === "expertise" ? row.solvedExpertise : row.solvedAll;
    if (!solvedCount) return "unsolved";
    if (solvedCount >= total) return "complete";
    return "started";
  }

  function render() {
    const bank = els.bank.value || "all";
    const search = els.search.value.trim().toLowerCase();
    const unit = els.unit.value;
    const progress = els.progress.value;

    const rows = topics.filter((row) => {
      const total = bank === "expertise" ? row.expertise : row.all;
      if (unit && row.unit !== unit) return false;
      if (search && !`${row.topic} ${row.unit}`.toLowerCase().includes(search)) return false;
      if (progress && progressState(row, total, bank) !== progress) return false;
      return true;
    });

    els.total.textContent = questions.length;
    els.topics.textContent = rows.length;
    els.solved.textContent = [...solved].length;

    if (!rows.length) {
      els.grid.innerHTML = `<p class="empty-roadmap">No topic matches these filters.</p>`;
      return;
    }

    const card = (row) => {
      const total = bank === "expertise" ? row.expertise : row.all;
      const solvedCount = bank === "expertise" ? row.solvedExpertise : row.solvedAll;
      const pct = total ? Math.min(100, Math.round((solvedCount / total) * 100)) : 0;
      const state = progressState(row, total, bank);
      const practiceUrl = query(row.topic, bank);
      const expertiseUrl = query(row.topic, "expertise");
      const facts = [
        `${row.all} question${row.all === 1 ? "" : "s"}`,
        `${row.papers.size} paper${row.papers.size === 1 ? "" : "s"}`,
        row.expertise ? `${row.expertise} Q20+` : ""
      ].filter(Boolean).join(" &middot; ");
      const empty = !total;
      return `<article class="roadmap-card is-${state}${empty ? " is-empty" : ""}">
        <div class="roadmap-card-head">
          <strong>${escapeHtml(row.topic)}</strong>
          <span class="roadmap-facts">${facts}</span>
        </div>
        <div class="roadmap-meter" role="img" aria-label="${solvedCount} of ${total} solved">
          <i style="width:${pct}%"></i>
        </div>
        <p class="roadmap-status">${solvedCount ? `${solvedCount} of ${total} solved` : "Not started"}<b>${pct}%</b></p>
        <div class="roadmap-actions">
          ${empty
            ? `<span class="roadmap-muted">No questions in this bank yet</span>`
            : `<a class="button primary" href="${practiceUrl}">Practice</a>${row.expertise ? `<a class="button light" href="${expertiseUrl}">Q20+ only</a>` : ""}`}
        </div>
      </article>`;
    };

    const chapters = [];
    rows.forEach((row) => {
      let group = chapters.find((item) => item.unit === row.unit);
      if (!group) {
        group = { unit: row.unit, rows: [] };
        chapters.push(group);
      }
      group.rows.push(row);
    });

    els.grid.innerHTML = chapters.map((group) => {
      const totals = group.rows.reduce((acc, row) => {
        acc.questions += bank === "expertise" ? row.expertise : row.all;
        acc.solved += bank === "expertise" ? row.solvedExpertise : row.solvedAll;
        return acc;
      }, { questions: 0, solved: 0 });
      const pct = totals.questions ? Math.round((totals.solved / totals.questions) * 100) : 0;
      return `<section class="roadmap-chapter" aria-label="${escapeHtml(group.unit)}">
        <header class="roadmap-chapter-head">
          <h2>${escapeHtml(group.unit)}</h2>
          <span>${group.rows.length} topic${group.rows.length === 1 ? "" : "s"} &middot; ${totals.questions} questions &middot; <b>${pct}% solved</b></span>
        </header>
        <div class="roadmap-chapter-grid">${group.rows.map(card).join("")}</div>
      </section>`;
    }).join("");
  }

  [els.search, els.unit, els.bank, els.progress].forEach((control) => {
    control.addEventListener("input", render);
  });

  fillUnitFilter();
  render();
})();
