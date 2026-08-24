(() => {
  const manifestUrl = "downloads/Modular/20260824/manifest.json?v=modular-20260824b";
  const version = "?v=modular-20260824";

  const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  const normalize = (value) => String(value ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  const href = (record) => `${record.path}${version}`;
  const link = (record, label) => `<a class="modular-release-link" href="${escapeHtml(href(record))}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`;

  const unitSlug = (unit) => unit === "Unit 1" ? "Unit1" : "Unit2";
  const baseUnit = (unit) => String(unit || "").replace(/\s+Expertise$/i, "");
  const belongsToUnit = (record, unit) => baseUnit(record?.unit) === unit;
  const groupPairs = (records, keyFn) => {
    const map = new Map();
    records.forEach((record) => {
      const key = keyFn(record);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(record);
    });
    return [...map.values()];
  };
  const byRole = (records) => ({
    student: records.find((record) => /_Student\.pdf$/i.test(record.path)),
    solutions: records.find((record) => /_Solutions\.pdf$/i.test(record.path)),
  });
  const labelFor = (record) => String(record?.title || "").replace(/^\d+_/, "").replace(/_/g, " ");
  const typeOf = (record) => {
    if (record.kind === "classified_topic_book" || record.kind === "classified_exam_book") return "classified";
    if (record.kind === "expertise_topic_book") return "expertise";
    return "papers";
  };

  function renderCore(records) {
    const root = document.querySelector("[data-release-core]");
    const pairs = groupPairs(records.filter((record) => record.kind === "classified_exam_book"), (record) => `${record.unit}|${/Expertise/.test(record.title)}`);
    root.innerHTML = pairs.map((pair) => {
      const roles = byRole(pair);
      const unit = pair[0]?.unit || "";
      const expertise = pair.some((record) => /Expertise/.test(record.title));
      const title = expertise ? `${unit} Expertise Q16+` : `${unit} Total Classified`;
      const search = normalize(`${title} ${unit} Modular 4WM`);
      return `<article class="modular-release-card ${expertise ? "expertise" : ""}" data-release-item data-release-kind="${expertise ? "expertise" : "classified"}" data-release-unit="${escapeHtml(unit)}" data-release-search="${escapeHtml(search)}"><span class="release-pill">${escapeHtml(unit)} · ${expertise ? "Q16+" : "All topics"}</span><h3>${escapeHtml(title)}</h3><p>${expertise ? "Focused challenge collection from the updated cross-session bank." : "Complete topic-classified question bank with synchronized worked solutions."}</p><div class="release-meta"><span class="release-pill">Updated 24 Aug 2026</span><span class="release-pill">${escapeHtml(expertise ? "Student + solutions" : "Student + solutions")}</span></div><div class="release-actions">${roles.student ? link(roles.student, "Questions book") : ""}${roles.solutions ? link(roles.solutions, "Solutions book") : ""}</div></article>`;
    }).join("");
  }

  function renderTopicTable(records, rootSelector, kind, heading) {
    const root = document.querySelector(rootSelector);
    const units = ["Unit 1", "Unit 2"];
    root.innerHTML = units.map((unit) => {
      const unitRecords = records.filter((record) => record.kind === kind && belongsToUnit(record, unit));
      const pairs = groupPairs(unitRecords, (record) => `${record.unit}|${record.title}`);
      const rows = pairs.map((pair) => {
        const roles = byRole(pair);
        const topic = labelFor(pair[0]);
        const search = normalize(`${topic} ${unit} ${heading}`);
        return `<tr data-release-item data-release-kind="${kind === "classified_topic_book" ? "classified" : "expertise"}" data-release-unit="${escapeHtml(unit)}" data-release-search="${escapeHtml(search)}"><td class="topic-name">${escapeHtml(topic)}<small>${escapeHtml(unit)}</small></td><td>${roles.student ? link(roles.student, "Student") : ""}</td><td>${roles.solutions ? link(roles.solutions, "Solutions") : ""}</td></tr>`;
      }).join("");
      return `<div class="modular-release-subsection"><div class="modular-release-section-head"><div><h3>${escapeHtml(unit)} <span class="release-pill">${pairs.length} topic pairs</span></h3></div></div><div class="modular-release-table-wrap"><table class="modular-release-table"><thead><tr><th>Topic</th><th>Student book</th><th>Solutions book</th></tr></thead><tbody>${rows || `<tr><td colspan="3"><div class="modular-release-empty">No books listed.</div></td></tr>`}</tbody></table></div></div>`;
    }).join("");
  }

  function renderPastPapers(records) {
    const root = document.querySelector("[data-release-papers]");
    const pairs = groupPairs(records.filter((record) => record.kind === "reconstructed_past_paper_book"), (record) => `${record.session}|${record.unit}`);
    const sessions = new Map();
    pairs.forEach((pair) => {
      const session = pair[0]?.session || "";
      if (!sessions.has(session)) sessions.set(session, []);
      sessions.get(session).push({ session, unit: pair[0]?.unit || "", roles: byRole(pair), status: pair[0]?.status || "reviewed" });
    });
    const rows = [...sessions.entries()].map(([session, units]) => {
      const provisional = units.some((item) => item.status === "reviewed-provisional");
      const search = normalize(`${session} Modular past paper reviewed provisional L-to-M converted from Linear`);
      const u1 = units.find((item) => item.unit === "Unit 1");
      const u2 = units.find((item) => item.unit === "Unit 2");
      const status = provisional ? `<span class="release-status provisional">Reviewed Provisional</span>` : `<span class="release-status">Reviewed</span>`;
      const origin = `<span class="release-status converted">L→M · Converted from Linear</span>`;
      return `<tr id="${provisional ? "november-2025" : ""}" class="${provisional ? "provisional-row" : ""}" data-release-item data-release-kind="papers" data-release-unit="Unit 1 Unit 2" data-release-search="${escapeHtml(search)}"><td class="topic-name">${escapeHtml(session)}<small>${origin} ${status}</small></td><td>${u1 ? `${u1.roles.student ? link(u1.roles.student, "Student") : ""} ${u1.roles.solutions ? link(u1.roles.solutions, "Solutions") : ""}` : "-"}</td><td>${u2 ? `${u2.roles.student ? link(u2.roles.student, "Student") : ""} ${u2.roles.solutions ? link(u2.roles.solutions, "Solutions") : ""}` : "-"}</td></tr>`;
    }).join("");
    root.innerHTML = `<div class="modular-release-table-wrap"><table class="modular-release-table"><thead><tr><th>Session and origin</th><th>Unit 1</th><th>Unit 2</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function initFilters() {
    const search = document.querySelector("[data-release-search]");
    const unit = document.querySelector("[data-release-unit]");
    const kind = document.querySelector("[data-release-kind]");
    const result = document.querySelector("[data-release-result]");
    const apply = () => {
      const query = normalize(search.value);
      const selectedUnit = unit.value;
      const selectedKind = kind.value;
      let visible = 0;
      document.querySelectorAll("[data-release-item]").forEach((item) => {
        const itemUnits = item.dataset.releaseUnit || "";
        const matchesUnit = !selectedUnit || itemUnits.includes(selectedUnit);
        const matchesKind = !selectedKind || item.dataset.releaseKind === selectedKind;
        const matchesSearch = !query || normalize(item.dataset.releaseSearch).includes(query);
        item.hidden = !(matchesUnit && matchesKind && matchesSearch);
        if (!item.hidden) visible += 1;
      });
      result.textContent = `${visible} book groups or topic rows shown`;
    };
    [search, unit, kind].forEach((control) => control.addEventListener("input", apply));
    document.querySelector("[data-release-reset]").addEventListener("click", () => {
      search.value = "";
      unit.value = new URLSearchParams(window.location.search).get("unit") || "";
      kind.value = "";
      apply();
    });
    const requestedUnit = new URLSearchParams(window.location.search).get("unit");
    if (requestedUnit === "Unit 1" || requestedUnit === "Unit 2") unit.value = requestedUnit;
    apply();
  }

  fetch(manifestUrl)
    .then((response) => {
      if (!response.ok) throw new Error(`Manifest request failed: ${response.status}`);
      return response.json();
    })
    .then((manifest) => {
      const records = Array.isArray(manifest.artifacts) ? manifest.artifacts : [];
      renderCore(records);
      renderTopicTable(records, "[data-release-topics]", "classified_topic_book", "Classified per Topic");
      renderTopicTable(records, "[data-release-expertise-topics]", "expertise_topic_book", "Expertise per Topic");
      renderPastPapers(records);
      initFilters();
    })
    .catch((error) => {
      document.querySelector("[data-release-result]").textContent = "The Modular release manifest could not be loaded.";
      document.querySelector("[data-release-core]").innerHTML = `<div class="modular-release-empty">${escapeHtml(error.message)}</div>`;
    });
})();
