(function () {
  const SYSTEM = window.ELITE_COURSE_MODULES || {};
  const GROUPS = Array.isArray(SYSTEM.navGroups) ? SYSTEM.navGroups : [];

  const SUPPORT_DOWNLOAD_CARDS = [
    {
      tag: "Whole papers",
      title: "Past Papers Library",
      description: "Linear, Modular, IAL Pure 1, Pure 2, and Mechanics 1 papers are separated clearly, grouped by session, with worked solutions beside the matching paper.",
      meta: ["Linear 4MA1", "Modular 4WM", "IAL WMA11/WMA12/WME01"],
      actions: [{ label: "Open Past Papers", href: "pastpapers.html", variant: "primary" }],
    },
    {
      className: "download-note",
      tag: "Practice bank",
      title: "Use the Practice page to filter, solve, and track progress.",
      description: "Open the full classified bank or the Q20+ bank, choose a topic, and keep your progress in sync across the website.",
      actions: [{ label: "Open the Practice page ->", href: "practice.html", variant: "primary" }],
    },
    {
      tag: "Study tool",
      title: "Personal Study Plan",
      description: "Choose exam date, target grade, study time, and weakest chapter or unit. The site creates a weekly checklist with practice and review links.",
      meta: ["Saved in browser", "Printable", "Linked to practice"],
      actions: [{ label: "Build Study Plan", href: "progress.html#planBuilder", variant: "primary" }],
    },
  ];

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function safeRichText(value) {
    return String(value ?? "")
      .replace(/<(?!\/?(strong|em)\b)[^>]*>/gi, "")
      .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, "");
  }

  function normalizedText(value) {
    return String(value ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function currentCourseFilter() {
    const params = new URLSearchParams(window.location.search);
    const pathway = normalizedText(params.get("pathway"));
    const course = normalizedText(params.get("course"));
    if (pathway === "linear") return "linear";
    if (pathway === "modular") return "modular";
    if (pathway === "baccalaureate") return "baccalaureate";
    const courseIds = {
      baccalaureate: "baccalaureate",
      "egyptian-baccalaureate": "baccalaureate",
      wma11: "pure",
      pure1: "pure",
      pure: "pure",
      wma12: "pure2",
      pure2: "pure2",
      wme01: "mechanics1",
      mechanics1: "mechanics1",
    };
    if (courseIds[course]) return courseIds[course];
    const hash = normalizedText(window.location.hash);
    if (hash.includes("wma11")) return "pure";
    if (hash.includes("wma12")) return "pure2";
    if (hash.includes("wme01")) return "mechanics1";
    return "";
  }

  function courseGroupsWith(key) {
    return GROUPS.filter((group) => Array.isArray(group[key]));
  }

  function coursePathway(group) {
    return group.pathway || group.id;
  }

  function sectionMeta(group) {
    return group.paperSection || {
      id: group.id,
      tag: `${group.label} | ${group.detail}`,
      title: `${group.label} paper list`,
      heading: `${group.label} papers`,
      eyebrow: `${group.label} | ${group.detail}`,
      intro: "Paper rows render from the shared course registry.",
      explainer: "This course is wired through the shared module registry and can receive paper rows without editing this page.",
    };
  }

  function paperButtonClass(paper) {
    const classes = ["pp-paper"];
    if (paper.kind === "solution") classes.push("solution");
    if (paper.kind === "mark-scheme") classes.push("ms");
    if (paper.converted) classes.push("converted");
    return classes.join(" ");
  }

  function renderPaperLink(paper) {
    const kind = paper.kind || "question";
    const badge = paper.badge ? `<b class="pp-paper-badge" title="Converted from Linear to Modular practice">${escapeHtml(paper.badge)}</b>` : "";
    return `<a class="${paperButtonClass(paper)}" data-paper-kind="${escapeHtml(kind)}" data-paper-search="${escapeHtml(normalizedText(`${paper.title} ${paper.badge || ""} ${kind}`))}" href="${escapeHtml(paper.href)}" target="_blank" rel="noreferrer"><span class="pp-paper-label">${escapeHtml(paper.title)}</span>${badge}</a>`;
  }

  function renderPaperSection(group) {
    const meta = sectionMeta(group);
    const sectionId = meta.id || group.id;
    const pathway = coursePathway(group);
    const className = ["pp-section", meta.className].filter(Boolean).join(" ");
    const groups = group.pastPapers || [];
    const yearBlocks = groups.length
      ? groups.map((paperGroup) => `
        <div class="pp-year-block" data-paper-year="${escapeHtml(paperGroup.heading)}">
          <h3>${escapeHtml(paperGroup.heading)}</h3>
          <div class="pp-papers">
            ${(paperGroup.sessions || []).map((session) => {
              const sessionSearch = normalizedText(`${group.label} ${group.detail} ${paperGroup.heading} ${session.label} ${(session.papers || []).map((paper) => paper.title).join(" ")}`);
              return `
                <div class="pp-session${session.converted ? " pp-session-converted" : ""}" data-paper-session="${escapeHtml(session.label)}" data-paper-search="${escapeHtml(sessionSearch)}"><strong>${escapeHtml(session.label)}</strong>${session.note ? `<span class="pp-session-origin">${escapeHtml(session.note)}</span>` : ""}
                  ${(session.papers || []).map(renderPaperLink).join("")}
                </div>
              `;
            }).join("")}
          </div>
        </div>
      `).join("")
      : `<div class="pp-empty">Paper rows are not published for this course yet.</div>`;

    return `
      <section id="${escapeHtml(sectionId)}" class="${escapeHtml(className)}" data-pathway="${escapeHtml(pathway)}" data-paper-course="${escapeHtml(group.id)}" aria-labelledby="${escapeHtml(sectionId)}Title">
        <div class="pp-section-head">
          <span class="eyebrow">${escapeHtml(meta.eyebrow || meta.tag)}</span>
          <h2 id="${escapeHtml(sectionId)}Title">${escapeHtml(meta.heading || meta.title)}</h2>
          <p>${escapeHtml(meta.intro)}</p>
        </div>
        ${yearBlocks}
      </section>
    `;
  }

  function renderPaperNavigation(container, groups) {
    container.innerHTML = groups.map((group, index) => {
      const meta = sectionMeta(group);
      const variant = index === 0 ? "primary" : "light";
      return `<a class="button ${variant}" href="#${escapeHtml(meta.id || group.id)}">${escapeHtml(meta.tag || group.label)} -></a>`;
    }).join("");
  }

  function renderPaperExplainers(container, groups) {
    container.innerHTML = groups.map((group) => {
      const meta = sectionMeta(group);
      const classes = [meta.className === "pp-section-pure" ? "pp-pure-card" : ""].filter(Boolean).join(" ");
      const tagClass = ["pp-tag", meta.tagTone].filter(Boolean).join(" ");
      return `
        <article class="${escapeHtml(classes)}">
          <span class="${escapeHtml(tagClass)}">${escapeHtml(meta.tag || group.label)}</span>
          <h2>${escapeHtml(meta.title || group.label)}</h2>
          <p>${safeRichText(meta.explainer || meta.intro)}</p>
        </article>
      `;
    }).join("");
  }

  function finderCourseButtons(groups, selectedCourse = "") {
    const unique = [];
    groups.forEach((group) => {
      if (!group?.id || unique.some((item) => item.id === group.id)) return;
      unique.push({ id: group.id, label: group.label });
    });
    return [{ id: "", label: "All courses" }, ...unique].map((item) => `
      <button type="button" data-finder-course="${escapeHtml(item.id)}" aria-pressed="${String(item.id === selectedCourse)}">${escapeHtml(item.label)}</button>
    `).join("");
  }

  function initPastPaperFinder(groups) {
    const finder = document.querySelector("[data-paper-finder]");
    const paperRoot = document.querySelector("[data-course-papers]");
    if (!finder || !paperRoot) return;
    const years = [...new Set(groups.flatMap((group) => (group.pastPapers || []).map((item) => item.heading)))];
    years.sort((a, b) => Number(b) - Number(a) || String(b).localeCompare(String(a)));
    let selectedCourse = currentCourseFilter();
    if (selectedCourse && !groups.some((group) => group.id === selectedCourse)) selectedCourse = "";
    finder.innerHTML = `
      <div class="resource-finder-head">
        <div>
          <span class="resource-finder-kicker">Paper Finder</span>
          <h2>Find the exact session in seconds.</h2>
          <p>Choose a course, year, or file type. Question papers stay paired with their matching solutions.</p>
        </div>
        <div class="resource-finder-result" data-paper-result aria-live="polite"></div>
      </div>
      <div class="resource-course-tabs" role="group" aria-label="Filter papers by course">
        ${finderCourseButtons(groups, selectedCourse)}
      </div>
      <div class="resource-finder-controls">
        <label class="resource-search-control"><span>Search</span><input type="search" data-paper-search placeholder="Session, paper code or year" autocomplete="off"></label>
        <label><span>Year</span><select data-paper-year-filter><option value="">All years</option>${years.map((year) => `<option value="${escapeHtml(year)}">${escapeHtml(year)}</option>`).join("")}</select></label>
        <label><span>Files</span><select data-paper-kind-filter><option value="">Questions + solutions</option><option value="question">Question papers</option><option value="solution">Solutions only</option></select></label>
        <button class="resource-reset" type="button" data-paper-reset>Reset</button>
      </div>
      <div class="resource-finder-empty" data-paper-empty hidden>No paper sessions match these filters.</div>
    `;

    const search = finder.querySelector("[data-paper-search]");
    const yearFilter = finder.querySelector("[data-paper-year-filter]");
    const kindFilter = finder.querySelector("[data-paper-kind-filter]");
    const result = finder.querySelector("[data-paper-result]");
    const empty = finder.querySelector("[data-paper-empty]");
    const courseButtons = [...finder.querySelectorAll("[data-finder-course]")];

    const apply = () => {
      const query = normalizedText(search.value);
      const year = yearFilter.value;
      const requestedKind = kindFilter.value;
      let visibleSessions = 0;
      let visibleFiles = 0;
      [...paperRoot.querySelectorAll("[data-paper-course]")].forEach((section) => {
        const courseMatch = !selectedCourse || section.dataset.paperCourse === selectedCourse;
        let sectionHasResults = false;
        [...section.querySelectorAll("[data-paper-year]")].forEach((yearBlock) => {
          const yearMatch = !year || yearBlock.dataset.paperYear === year;
          let yearHasResults = false;
          [...yearBlock.querySelectorAll("[data-paper-session]")].forEach((session) => {
            const searchMatch = !query || normalizedText(session.dataset.paperSearch).includes(query);
            let sessionFiles = 0;
            [...session.querySelectorAll("[data-paper-kind]")].forEach((link) => {
              const kind = link.dataset.paperKind;
              const kindMatch = !requestedKind
                || (requestedKind === "question" && kind === "question")
                || (requestedKind === "solution" && (kind === "solution" || kind === "mark-scheme"));
              link.hidden = !(courseMatch && yearMatch && searchMatch && kindMatch);
              if (!link.hidden) sessionFiles += 1;
            });
            session.hidden = sessionFiles === 0;
            if (!session.hidden) {
              visibleSessions += 1;
              visibleFiles += sessionFiles;
              yearHasResults = true;
              sectionHasResults = true;
            }
          });
          yearBlock.hidden = !yearHasResults;
        });
        section.hidden = !sectionHasResults;
      });
      courseButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.finderCourse === selectedCourse)));
      result.innerHTML = `<strong>${visibleSessions}</strong><span>sessions</span><i></i><strong>${visibleFiles}</strong><span>files</span>`;
      empty.hidden = visibleSessions > 0;
      finder.dataset.ready = "true";
    };

    courseButtons.forEach((button) => button.addEventListener("click", () => {
      selectedCourse = button.dataset.finderCourse;
      apply();
    }));
    [search, yearFilter, kindFilter].forEach((control) => control.addEventListener("input", apply));
    finder.querySelector("[data-paper-reset]").addEventListener("click", () => {
      selectedCourse = "";
      search.value = "";
      yearFilter.value = "";
      kindFilter.value = "";
      apply();
    });
    apply();
  }

  function renderPastPapers() {
    const groups = courseGroupsWith("pastPapers");
    const nav = document.querySelector("[data-course-paper-nav]");
    const explainers = document.querySelector("[data-course-paper-explainer]");
    const sections = document.querySelector("[data-course-papers]");
    if (nav) renderPaperNavigation(nav, groups);
    if (explainers) renderPaperExplainers(explainers, groups);
    if (sections) sections.innerHTML = groups.map(renderPaperSection).join("");
    initPastPaperFinder(groups);
  }

  function renderDownloadAction(action) {
    const classes = ["button", action.variant || "primary"].join(" ");
    const target = action.target ? ` target="${escapeHtml(action.target)}" rel="noreferrer"` : "";
    return `<a class="${escapeHtml(classes)}" href="${escapeHtml(action.href)}"${target}>${escapeHtml(action.label)}</a>`;
  }

  function downloadResourceType(card) {
    const text = normalizedText(`${card.tag} ${card.title} ${card.description} ${card.className}`);
    if (text.includes("strategy note") || text.includes("topic note")) return "notes";
    if (text.includes("expertise") || text.includes("q20+")) return "expertise";
    if (text.includes("classified")) return "classified";
    return "tools";
  }

  function renderDownloadCard(card) {
    const cardClass = ["download-card", card.className].filter(Boolean).join(" ");
    const tagClass = ["d-tag", card.tagTone].filter(Boolean).join(" ");
    const meta = Array.isArray(card.meta) && card.meta.length
      ? `<ul class="d-meta">${card.meta.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
      : "";
    const actions = Array.isArray(card.actions) && card.actions.length
      ? `<div class="download-pair-actions">${card.actions.map(renderDownloadAction).join("")}</div>`
      : "";
    const resourceType = card.resourceType || downloadResourceType(card);
    const searchText = normalizedText(`${card.courseLabel} ${card.tag} ${card.title} ${card.description} ${(card.meta || []).join(" ")} ${(card.actions || []).map((action) => action.label).join(" ")}`);
    return `
      <article class="${escapeHtml(cardClass)}" data-book-course="${escapeHtml(card.resourceCourse || "support")}" data-book-type="${escapeHtml(resourceType)}" data-book-search="${escapeHtml(searchText)}">
        <span class="${escapeHtml(tagClass)}">${escapeHtml(card.tag)}</span>
        <strong>${escapeHtml(card.title)}</strong>
        <p>${escapeHtml(card.description)}</p>
        ${meta}
        ${actions}
      </article>
    `;
  }

  function initBookFinder(groups) {
    const finder = document.querySelector("[data-book-finder]");
    const grid = document.querySelector("[data-course-downloads]");
    if (!finder || !grid) return;
    let selectedCourse = currentCourseFilter();
    if (selectedCourse && !groups.some((group) => group.id === selectedCourse)) selectedCourse = "";
    finder.innerHTML = `
      <div class="resource-finder-head">
        <div>
          <span class="resource-finder-kicker">Book Finder</span>
          <h2>Questions and solutions, already paired.</h2>
          <p>Filter by course or resource type, then open the exact printable book you need.</p>
        </div>
        <div class="resource-finder-result" data-book-result aria-live="polite"></div>
      </div>
      <div class="resource-course-tabs" role="group" aria-label="Filter books by course">
        ${finderCourseButtons(groups, selectedCourse)}
      </div>
      <div class="resource-finder-controls">
        <label class="resource-search-control"><span>Search</span><input type="search" data-book-search placeholder="Course, book or resource" autocomplete="off"></label>
        <label><span>Resource</span><select data-book-type-filter><option value="">All resources</option><option value="classified">Classified books</option><option value="expertise">Expertise books</option><option value="notes">Strategy notes</option><option value="tools">Study tools</option></select></label>
        <button class="resource-reset" type="button" data-book-reset>Reset</button>
      </div>
      <div class="resource-finder-empty" data-book-empty hidden>No books match these filters.</div>
    `;

    const search = finder.querySelector("[data-book-search]");
    const typeFilter = finder.querySelector("[data-book-type-filter]");
    const result = finder.querySelector("[data-book-result]");
    const empty = finder.querySelector("[data-book-empty]");
    const courseButtons = [...finder.querySelectorAll("[data-finder-course]")];

    const apply = () => {
      const query = normalizedText(search.value);
      const requestedType = typeFilter.value;
      let visibleCards = 0;
      [...grid.querySelectorAll("[data-book-course]")].forEach((card) => {
        const courseMatch = !selectedCourse || card.dataset.bookCourse === selectedCourse || card.dataset.bookCourse === "support";
        const typeMatch = !requestedType || card.dataset.bookType === requestedType;
        const searchMatch = !query || normalizedText(card.dataset.bookSearch).includes(query);
        card.hidden = !(courseMatch && typeMatch && searchMatch);
        if (!card.hidden) visibleCards += 1;
      });
      courseButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.finderCourse === selectedCourse)));
      result.innerHTML = `<strong>${visibleCards}</strong><span>resources ready</span>`;
      empty.hidden = visibleCards > 0;
      finder.dataset.ready = "true";
    };

    courseButtons.forEach((button) => button.addEventListener("click", () => {
      selectedCourse = button.dataset.finderCourse;
      apply();
    }));
    [search, typeFilter].forEach((control) => control.addEventListener("input", apply));
    finder.querySelector("[data-book-reset]").addEventListener("click", () => {
      selectedCourse = "";
      search.value = "";
      typeFilter.value = "";
      apply();
    });
    apply();
  }

  function renderDownloads() {
    const grid = document.querySelector("[data-course-downloads]");
    if (!grid) return;
    const groups = courseGroupsWith("books");
    const courseCards = groups.flatMap((group) => (group.books || []).map((card) => ({
      ...card,
      resourceCourse: group.id,
      courseLabel: `${group.label} ${group.detail || ""}`,
    })));
    const supportCards = SUPPORT_DOWNLOAD_CARDS.map((card) => ({
      ...card,
      resourceCourse: "support",
      courseLabel: "All courses",
      resourceType: "tools",
    }));
    grid.innerHTML = courseCards.concat(supportCards).map(renderDownloadCard).join("");
    initBookFinder(groups);
  }

  renderPastPapers();
  renderDownloads();
})();
