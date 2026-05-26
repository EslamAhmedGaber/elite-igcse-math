(function () {
  const SYSTEM = window.ELITE_COURSE_MODULES || {};
  const GROUPS = Array.isArray(SYSTEM.navGroups) ? SYSTEM.navGroups : [];

  const SUPPORT_DOWNLOAD_CARDS = [
    {
      tag: "Whole papers",
      title: "Past Papers Library",
      description: "Linear, Modular, and IAL Pure 1 papers are separated clearly, grouped by session, with worked solutions beside the matching paper.",
      meta: ["Linear 4MA1", "Modular 4WM", "IAL WMA11"],
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
    return classes.join(" ");
  }

  function renderPaperLink(paper) {
    return `<a class="${paperButtonClass(paper)}" href="${escapeHtml(paper.href)}" target="_blank" rel="noreferrer"><span>${escapeHtml(paper.title)}</span></a>`;
  }

  function renderPaperSection(group) {
    const meta = sectionMeta(group);
    const sectionId = meta.id || group.id;
    const pathway = coursePathway(group);
    const className = ["pp-section", meta.className].filter(Boolean).join(" ");
    const groups = group.pastPapers || [];
    const yearBlocks = groups.length
      ? groups.map((paperGroup) => `
        <div class="pp-year-block">
          <h3>${escapeHtml(paperGroup.heading)}</h3>
          <div class="pp-papers">
            ${(paperGroup.sessions || []).map((session) => `
              <div class="pp-session"><strong>${escapeHtml(session.label)}</strong>
                ${(session.papers || []).map(renderPaperLink).join("")}
              </div>
            `).join("")}
          </div>
        </div>
      `).join("")
      : `<div class="pp-empty">Paper rows are not published for this course yet.</div>`;

    return `
      <section id="${escapeHtml(sectionId)}" class="${escapeHtml(className)}" data-pathway="${escapeHtml(pathway)}" aria-labelledby="${escapeHtml(sectionId)}Title">
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

  function renderPastPapers() {
    const groups = courseGroupsWith("pastPapers");
    const nav = document.querySelector("[data-course-paper-nav]");
    const explainers = document.querySelector("[data-course-paper-explainer]");
    const sections = document.querySelector("[data-course-papers]");
    if (nav) renderPaperNavigation(nav, groups);
    if (explainers) renderPaperExplainers(explainers, groups);
    if (sections) sections.innerHTML = groups.map(renderPaperSection).join("");
  }

  function renderDownloadAction(action) {
    const classes = ["button", action.variant || "primary"].join(" ");
    const target = action.target ? ` target="${escapeHtml(action.target)}" rel="noreferrer"` : "";
    return `<a class="${escapeHtml(classes)}" href="${escapeHtml(action.href)}"${target}>${escapeHtml(action.label)}</a>`;
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
    return `
      <article class="${escapeHtml(cardClass)}">
        <span class="${escapeHtml(tagClass)}">${escapeHtml(card.tag)}</span>
        <strong>${escapeHtml(card.title)}</strong>
        <p>${escapeHtml(card.description)}</p>
        ${meta}
        ${actions}
      </article>
    `;
  }

  function renderDownloads() {
    const grid = document.querySelector("[data-course-downloads]");
    if (!grid) return;
    const courseCards = courseGroupsWith("books").flatMap((group) => group.books || []);
    grid.innerHTML = courseCards.concat(SUPPORT_DOWNLOAD_CARDS).map(renderDownloadCard).join("");
  }

  renderPastPapers();
  renderDownloads();
})();
