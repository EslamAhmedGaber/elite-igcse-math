(function () {
  const LEAD_PHONE = "201120009622";
  const LEAD_KEY = "leadInfoV1";

  const DIALOG_HTML = `
    <dialog id="leadDialog" class="lead-dialog" aria-labelledby="leadDialogTitle">
      <form id="leadForm" method="dialog">
        <header class="lead-head">
          <strong id="leadDialogTitle">Book your free first class</strong>
          <button type="button" id="leadCloseBtn" aria-label="Close">&times;</button>
        </header>
        <p class="lead-sub">Tell Dr Eslam a little about you so he can reply with the right course details on WhatsApp.</p>
        <label>Your name<input id="leadName" name="name" type="text" required autocomplete="name" placeholder="e.g. Yousef Hassan"></label>
        <label>Email (optional)<input id="leadEmail" name="email" type="email" autocomplete="email" placeholder="parent or student email"></label>
        <label>Year / Grade<select id="leadYear" name="year" required>
          <option value="">Select year</option>
          <option>Year 9</option>
          <option>Year 10</option>
          <option>Year 11</option>
          <option>Repeat / Retake</option>
          <option>Other</option>
        </select></label>
        <label>Target exam session<select id="leadExam" name="exam" required>
          <option value="">Select session</option>
          <option>January 2027</option>
          <option>May/June 2027</option>
          <option>January 2028</option>
          <option>Later / Undecided</option>
        </select></label>
        <label>Interested in<select id="leadPackage" name="package">
          <option value="">Any package</option>
          <option value="group">Group Course</option>
          <option value="private">Private 1-to-1</option>
          <option value="intensive">Intensive Sprint</option>
        </select></label>
        <div class="lead-actions">
          <button type="submit" class="button primary">Open WhatsApp</button>
          <button type="button" id="leadSkipBtn" class="button ghost">Skip and chat directly</button>
        </div>
        <p class="lead-privacy">We don't store anything on a server. Your details are saved only in this browser and added to the WhatsApp message you send.</p>
      </form>
    </dialog>
  `;

  const COURSE_SYSTEM = window.ELITE_COURSE_MODULES || {};

  const DEFAULT_NAV_GROUPS = [
    {
      id: "linear",
      label: "Linear",
      detail: "4MA1 route",
      href: "/practice.html?pathway=linear&bank=all",
      pathway: "linear",
      panelLabel: "Linear tools",
      links: [
        { title: "Classified View", detail: "Chapter bank", href: "/practice.html?pathway=linear&bank=all", pathway: "linear" },
        { title: "Expertise", detail: "Q20+ finishers", href: "/practice.html?pathway=linear&bank=expertise&mode=q20", pathway: "linear" },
        { title: "Build Test", detail: "Build tests", href: "/exam.html?pathway=linear&mode=custom", pathway: "linear" },
        { title: "Smart Revision", detail: "Weak topics and mistakes", href: "/exam.html?pathway=linear&mode=smart", pathway: "linear" },
        { title: "Progress", detail: "Track mastery", href: "/progress.html?pathway=linear", pathway: "linear" },
        { title: "Mistake Box", detail: "Due revision set", href: "/practice.html?pathway=linear&bank=all&mode=review", pathway: "linear" },
        { title: "Saved Tests", detail: "Reuse builder tests", href: "/exam.html?pathway=linear&mode=saved", pathway: "linear" },
        { title: "Books", detail: "Questions and answers", href: "/downloads.html?pathway=linear", pathway: "linear" },
        { title: "Past Paper Solutions", detail: "Papers beside answers", href: "/pastpapers.html?pathway=linear", pathway: "linear" },
      ],
    },
    {
      id: "modular",
      label: "Modular",
      detail: "4WM route",
      href: "/practice.html?pathway=modular&choose=unit",
      pathway: "modular",
      units: [
        {
          title: "Unit 1",
          detail: "4WM1",
          links: [
            { title: "Classified View", detail: "Unit 1 topics", href: "/practice.html?pathway=modular&unit=Unit+1&bank=all", pathway: "modular" },
            { title: "Expertise", detail: "Unit 1 harder set", href: "/practice.html?pathway=modular&unit=Unit+1&bank=expertise&mode=q20", pathway: "modular" },
            { title: "Build Test", detail: "Unit 1 tests", href: "/exam.html?pathway=modular&unit=Unit+1&mode=custom", pathway: "modular" },
            { title: "Smart Revision", detail: "Unit 1 weak topics", href: "/exam.html?pathway=modular&unit=Unit+1&mode=smart", pathway: "modular" },
            { title: "Progress", detail: "Unit 1 mastery", href: "/progress.html?pathway=modular&unit=Unit+1", pathway: "modular" },
            { title: "Mistake Box", detail: "Unit 1 saved revision", href: "/practice.html?pathway=modular&unit=Unit+1&bank=all&mode=review", pathway: "modular" },
            { title: "Saved Tests", detail: "Unit 1 reusable tests", href: "/exam.html?pathway=modular&unit=Unit+1&mode=saved", pathway: "modular" },
            { title: "Books", detail: "Unit 1 PDFs", href: "/downloads.html?pathway=modular&unit=Unit+1", pathway: "modular" },
            { title: "Past Paper Solutions", detail: "4WM1 papers", href: "/pastpapers.html?pathway=modular&unit=Unit+1", pathway: "modular" },
          ],
        },
        {
          title: "Unit 2",
          detail: "4WM2",
          links: [
            { title: "Classified View", detail: "Unit 2 topics", href: "/practice.html?pathway=modular&unit=Unit+2&bank=all", pathway: "modular" },
            { title: "Expertise", detail: "Unit 2 harder set", href: "/practice.html?pathway=modular&unit=Unit+2&bank=expertise&mode=q20", pathway: "modular" },
            { title: "Build Test", detail: "Unit 2 tests", href: "/exam.html?pathway=modular&unit=Unit+2&mode=custom", pathway: "modular" },
            { title: "Smart Revision", detail: "Unit 2 weak topics", href: "/exam.html?pathway=modular&unit=Unit+2&mode=smart", pathway: "modular" },
            { title: "Progress", detail: "Unit 2 mastery", href: "/progress.html?pathway=modular&unit=Unit+2", pathway: "modular" },
            { title: "Mistake Box", detail: "Unit 2 saved revision", href: "/practice.html?pathway=modular&unit=Unit+2&bank=all&mode=review", pathway: "modular" },
            { title: "Saved Tests", detail: "Unit 2 reusable tests", href: "/exam.html?pathway=modular&unit=Unit+2&mode=saved", pathway: "modular" },
            { title: "Books", detail: "Unit 2 PDFs", href: "/downloads.html?pathway=modular&unit=Unit+2", pathway: "modular" },
            { title: "Past Paper Solutions", detail: "4WM2 papers", href: "/pastpapers.html?pathway=modular&unit=Unit+2", pathway: "modular" },
          ],
        },
      ],
    },
    {
      id: "pure",
      label: "IAL Pure 1",
      detail: "WMA11",
      href: "/ial/wma11/index.html",
      panelLabel: "WMA11 tools",
      links: [
        { title: "Classified View", detail: "Topic practice", href: "/ial/wma11/index.html" },
        { title: "Expertise View", detail: "Q6+ filtered bank", href: "/ial/wma11/index.html?expertise=1#ialFilters" },
        { title: "Build Test", detail: "Full mock builder", href: "/exam.html?pathway=pure&course=wma11&mode=custom" },
        { title: "Smart Revision", detail: "Mistakes and weak topics", href: "/exam.html?pathway=pure&course=wma11&mode=smart" },
        { title: "Progress", detail: "Topic mastery", href: "/progress.html?pathway=pure&course=wma11" },
        { title: "Mistake Box", detail: "Saved revision", href: "/ial/wma11/index.html?mode=mistakes#ialFilters" },
        { title: "Saved Tests", detail: "Reuse builder tests", href: "/exam.html?pathway=pure&course=wma11&mode=saved" },
        { title: "Books", detail: "Question and answer PDFs", href: "/downloads.html?pathway=pure" },
        { title: "Answer Books", detail: "Worked solution PDFs", href: "/downloads.html?pathway=pure" },
        { title: "Past Papers", detail: "Paper + solution rows", href: "/pastpapers.html?pathway=pure#pure-wma11" },
      ],
    },
    {
      id: "about",
      label: "About",
      detail: "Dr Eslam",
      href: "/about.html",
      panelLabel: "Support",
      links: [
        { title: "About Dr Eslam", detail: "Teacher profile", href: "/about.html" },
        { title: "Download Centre", detail: "All public books", href: "/downloads.html" },
        { title: "Topic Roadmap", detail: "Course map", href: "/topics.html" },
        { title: "Readiness Check", detail: "Quick diagnosis", href: "/checkup.html" },
        { title: "Contact", detail: "WhatsApp booking", href: "https://wa.me/201120009622", lead: "whatsapp" },
      ],
    },
  ];
  const NAV_GROUPS = Array.isArray(COURSE_SYSTEM.navGroups) ? COURSE_SYSTEM.navGroups : DEFAULT_NAV_GROUPS;
  const PALETTES = COURSE_SYSTEM.palettes || {};
  const VALID_PATHWAYS = new Set(["linear", "modular", "pure"]);
  const PATHWAY_CHOICE_KEYS = ["elitePathwayChoice", "elitePathwayMode"];

  const DEFAULT_MODULE_ALIASES = {
    "classified view": "classified",
    "classified bank": "classified",
    "expertise": "expertise",
    "mock builder": "build-test",
    "build test": "build-test",
    "random mock": "build-test",
    "smart revision": "smart-revision",
    "saved tests": "saved-tests",
    "books": "books",
    "question book": "books",
    "answer book": "answers",
    "expertise book": "expertise",
    "expertise answers": "answers",
    "past paper solutions": "past-solutions",
    "progress": "progress",
    "mistake box": "mistake-box",
  };
  const MODULE_ALIASES = COURSE_SYSTEM.moduleAliases || DEFAULT_MODULE_ALIASES;

  function moduleKey(item) {
    const title = String(item.module || item.title || "").trim().toLowerCase();
    if (MODULE_ALIASES[title]) return MODULE_ALIASES[title];
    return title.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "general";
  }

  function navLink(item) {
    const attrs = [
      `href="${item.href}"`,
      `data-module="${moduleKey(item)}"`,
      item.target ? `target="${item.target}" rel="noreferrer"` : "",
      item.pathway ? `data-pathway-choice="${item.pathway}" data-pathway-target="${item.href}"` : "",
      item.lead ? `data-lead-trigger="${item.lead}"` : "",
    ].filter(Boolean).join(" ");
    return `<a ${attrs}><strong>${item.title}</strong><span>${item.detail}</span></a>`;
  }

  function navTools(links) {
    return `<div class="nav-tool-grid">${links.map(navLink).join("")}</div>`;
  }

  function groupPalette(group) {
    return PALETTES[group?.palette] || null;
  }

  function normalizePathway(value) {
    const pathway = String(value || "").trim().toLowerCase();
    return VALID_PATHWAYS.has(pathway) ? pathway : "";
  }

  function normalizeUnit(value) {
    const unit = String(value || "").trim().toLowerCase();
    if (!unit) return "";
    return unit.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function readStoredPathway() {
    for (const key of PATHWAY_CHOICE_KEYS) {
      try {
        const saved = normalizePathway(localStorage.getItem(key));
        if (saved) return saved;
      } catch (err) {
        return "";
      }
    }
    return "";
  }

  function resolvePathwayContext() {
    const params = new URLSearchParams(window.location.search);
    const requested = normalizePathway(params.get("pathway"));
    const boot = window.ELITE_PATHWAY_BOOTSTRAP || {};
    const pathIsPure = window.location.pathname.toLowerCase().includes("/ial/wma11/");
    const pathway = requested || normalizePathway(boot.pathway) || (pathIsPure ? "pure" : "") || readStoredPathway() || "linear";
    const course = params.get("course") || boot.course || (pathIsPure ? "wma11" : "");
    const unit = normalizeUnit(params.get("unit") || boot.unit || "");
    return { pathway, course, unit };
  }

  function applyPathwayContext(context = resolvePathwayContext()) {
    [document.documentElement, document.body].filter(Boolean).forEach((target) => {
      target.dataset.pathway = context.pathway;
      target.dataset.coursePalette = context.pathway;
      if (context.course) target.dataset.course = context.course;
      else delete target.dataset.course;
      if (context.unit) target.dataset.unit = context.unit;
      else delete target.dataset.unit;
    });
    window.ELITE_PATHWAY_BOOTSTRAP = context;
    return context;
  }

  function navGroupStyle(group) {
    const palette = groupPalette(group);
    if (!palette?.accent) return "";
    const active = palette.accentDeep || palette.accent;
    const accent = palette.soft || palette.accent;
    return ` style="--nav-tab-active: ${active}; --nav-tab-accent: ${accent};"`;
  }

  function applyCoursePalette(group) {
    if (!group) return;
    const palette = groupPalette(group);
    const pathway = group.pathway || group.id;
    if (group.palette) {
      [document.documentElement, document.body].filter(Boolean).forEach((target) => {
        target.dataset.coursePalette = group.palette;
        target.dataset.pathway = pathway;
      });
    }
    document.body.dataset.activeCourse = group.id;
    if (!palette?.accent) return;
    const deep = palette.accentDeep || palette.accent;
    const soft = palette.soft || "rgba(22, 27, 46, 0.08)";
    document.body.style.setProperty("--course-signature", palette.accent);
    document.body.style.setProperty("--course-deep", deep);
    document.body.style.setProperty("--course-soft", soft);
    document.body.style.setProperty("--pathway-active", palette.accent);
    document.body.style.setProperty("--pathway-active-deep", deep);
    document.body.style.setProperty("--pathway-soft", soft);
  }

  function findGroupByPathway(pathway) {
    if (!pathway) return null;
    return NAV_GROUPS.find((group) => group.id === pathway || group.pathway === pathway || group.palette === pathway) || null;
  }

  function renderStructuredNav(nav) {
    nav.innerHTML = NAV_GROUPS.map((group) => {
      const tabAttrs = [
        `class="nav-tab-main"`,
        `href="${group.href}"`,
        `aria-expanded="false"`,
        group.pathway ? `data-pathway-choice="${group.pathway}" data-pathway-target="${group.href}"` : "",
      ].filter(Boolean).join(" ");
      const panel = group.units
        ? `<div class="nav-panel nav-panel-${group.id}" aria-label="${group.label} pathway links">
            <div class="nav-panel-label">Choose a unit</div>
            <div class="nav-unit-columns">
              ${group.units.map((unit) => `
                <section class="nav-unit-card">
                  <div class="nav-unit-head"><strong>${unit.title}</strong><span>${unit.detail}</span></div>
                  ${navTools(unit.links)}
                </section>
              `).join("")}
            </div>
          </div>`
        : `<div class="nav-panel nav-panel-${group.id}" aria-label="${group.label} pathway links">
            <div class="nav-panel-label">${group.panelLabel}</div>
            ${navTools(group.links)}
          </div>`;
    return `<div class="nav-group nav-group-${group.id}" data-nav-group="${group.id}"${navGroupStyle(group)}>
        <a ${tabAttrs}><span>${group.label}</span><small>${group.detail}</small></a>
        ${panel}
      </div>`;
    }).join("");
  }

  function activeNavGroup() {
    const page = document.body?.dataset.page || "";
    const params = new URLSearchParams(window.location.search);
    const context = resolvePathwayContext();
    const requestedPathway = params.get("pathway") || context.pathway;
    const requestedGroup = findGroupByPathway(requestedPathway);
    if (requestedGroup) return requestedGroup.id;
    if (page === "ial-wma11" || window.location.pathname.includes("/ial/wma11/") || requestedPathway === "pure") return "pure";
    if (page === "about") return "about";
    if (requestedPathway === "modular" || window.ELITE_PATHWAY?.mode === "modular") return "modular";
    return "linear";
  }

  function activeToolLinks(groupId) {
    const group = NAV_GROUPS.find((item) => item.id === groupId);
    if (!group || groupId === "about") return null;
    const page = document.body?.dataset.page || "";
    if (page === "home") return null;
    const params = new URLSearchParams(window.location.search);
    if (!group.units) return { title: group.label, detail: group.detail, intro: group.intro, links: group.links };
    if (params.get("choose") === "unit" || (!params.get("unit") && page === "practice" && params.get("pathway") === "modular")) {
      return {
        kind: "unit-choice",
        title: group.unitChoiceTitle || "Choose Modular Unit",
        detail: "4WM route",
        intro: group.unitChoiceIntro || "Start by choosing Unit 1 or Unit 2. Each unit opens its own Classified View, Expertise, Mock Builder, Books, Past Paper Solutions, and Progress.",
        links: group.units.map((unit) => ({
          module: "unit-choice",
          title: unit.title,
          detail: `${unit.detail} tools`,
          href: `/practice.html?pathway=modular&unit=${encodeURIComponent(unit.title)}&bank=all`,
          pathway: "modular",
        })),
      };
    }
    const requestedUnit = params.get("unit") || localStorage.getItem("modularUnit") || "Unit 1";
    const unit = group.units.find((item) => item.title === requestedUnit) || group.units[0];
    return {
      title: `${group.label} ${unit.title}`,
      detail: unit.detail,
      intro: unit.intro || "Everything for this unit lives here, so students can move between practice, tests, books, solutions, and progress without hunting.",
      links: unit.links,
    };
  }

  function normalizePath(href) {
    try {
      return new URL(href, window.location.origin).pathname.replace(/\/+$/, "") || "/";
    } catch (err) {
      return "";
    }
  }

  function isToolActive(link) {
    const currentPath = window.location.pathname.replace(/\/+$/, "") || "/";
    const linkPath = normalizePath(link.href);
    const params = new URLSearchParams(window.location.search);
    const linkUrl = new URL(link.href, window.location.origin);
    const linkParams = linkUrl.searchParams;
    if (link.href.includes("#") && window.location.hash && linkUrl.hash === window.location.hash) return true;
    if (currentPath !== linkPath) return false;
    const bank = params.get("bank") || "all";
    const linkBank = linkParams.get("bank") || "all";
    const mode = params.get("mode") || "";
    const linkMode = linkParams.get("mode") || "";
    const unit = params.get("unit") || "";
    const linkUnit = linkParams.get("unit") || "";
    if (linkUnit && unit !== linkUnit) return false;
    if (linkPath.endsWith("/practice.html")) return bank === linkBank && mode === linkMode;
    if (linkPath.endsWith("/exam.html")) return linkMode ? mode === linkMode : true;
    const linkEntries = [...linkParams.entries()];
    if (linkUrl.hash && window.location.hash !== linkUrl.hash) return false;
    if (linkEntries.some(([key, value]) => (params.get(key) || "") !== value)) return false;
    if (!linkUrl.hash && !linkEntries.length) return !window.location.search && !window.location.hash;
    return true;
  }

  const MODULE_ICONS = {
    "classified":     '<svg class="module-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h9"/><circle cx="3.2" cy="7" r="0.6" fill="currentColor"/><circle cx="3.2" cy="12" r="0.6" fill="currentColor"/><circle cx="3.2" cy="17" r="0.6" fill="currentColor"/></svg>',
    "expertise":      '<svg class="module-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.6 5.4 5.9.8-4.3 4.2 1 5.8L12 16.6 6.8 19.2l1-5.8L3.5 9.2l5.9-.8z"/></svg>',
    "build-test":     '<svg class="module-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 3L4 14h6l-1 7 9-11h-6z"/></svg>',
    "smart-revision": '<svg class="module-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15.5-6.3M21 4v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.3M3 20v-5h5"/></svg>',
    "progress":       '<svg class="module-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/></svg>',
    "mistake-box":    '<svg class="module-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l9.5 17H2.5z"/><path d="M12 10v4"/><circle cx="12" cy="17" r="0.8" fill="currentColor"/></svg>',
    "saved-tests":    '<svg class="module-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z"/></svg>',
    "books":          '<svg class="module-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3z"/><path d="M4 17a3 3 0 0 1 3-3h11"/></svg>',
    "answers":        '<svg class="module-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2l9 4v6c0 5-3.8 9.4-9 10-5.2-.6-9-5-9-10V6z"/><path d="M9 12l2.2 2.2L15 10.4"/></svg>',
    "past-solutions": '<svg class="module-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4"/><path d="M10 13h6M10 17h6"/></svg>',
    "unit-choice":    '<svg class="module-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h7v7H4zM13 5h7v7h-7zM4 14h7v7H4zM13 14h7v7h-7z"/></svg>',
    "general":        '<svg class="module-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></svg>',
  };

  function getModuleIcon(key) {
    return MODULE_ICONS[key] || MODULE_ICONS.general;
  }

  function deriveModuleKeyFromTile(link) {
    const explicit = link.dataset?.module || "";
    if (explicit) {
      const lower = explicit.trim().toLowerCase();
      if (MODULE_ALIASES[lower]) return MODULE_ALIASES[lower];
      return lower.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    }
    const strong = link.querySelector("strong");
    const title = (strong ? strong.textContent : link.textContent || "").trim().toLowerCase();
    if (MODULE_ALIASES[title]) return MODULE_ALIASES[title];
    return title.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function ensureIconsOnTiles() {
    const tileSelectors = [
      ".pathway-tool-strip-links a",
      ".ial-builder-links a",
    ];
    tileSelectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((link) => {
        if (link.querySelector(".module-icon")) return;
        const key = deriveModuleKeyFromTile(link);
        const icon = getModuleIcon(key);
        const strong = link.querySelector("strong");
        const span = link.querySelector("span");
        if (strong && !link.querySelector(".module-text")) {
          const wrapper = document.createElement("div");
          wrapper.className = "module-text";
          wrapper.appendChild(strong.cloneNode(true));
          if (span) wrapper.appendChild(span.cloneNode(true));
          if (strong.parentElement === link) strong.remove();
          if (span && span.parentElement === link) span.remove();
          link.insertAdjacentHTML("afterbegin", icon);
          link.appendChild(wrapper);
        } else {
          link.insertAdjacentHTML("afterbegin", icon);
        }
      });
    });
  }

  function renderToolStripLink(link) {
    const attrs = [
      `href="${link.href}"`,
      `data-module="${moduleKey(link)}"`,
      link.target ? `target="${link.target}" rel="noreferrer"` : "",
      link.pathway ? `data-pathway-choice="${link.pathway}" data-pathway-target="${link.href}"` : "",
      link.lead ? `data-lead-trigger="${link.lead}"` : "",
      isToolActive(link) ? `aria-current="page"` : "",
    ].filter(Boolean).join(" ");
    const icon = getModuleIcon(moduleKey(link));
    return `<a ${attrs}>${icon}<div class="module-text"><strong>${link.title}</strong><span>${link.detail}</span></div></a>`;
  }

  function initPathwayToolStrip() {
    if (document.querySelector(".pathway-tool-strip")) return;
    const header = document.querySelector(".site-header");
    if (!header) return;
    const groupId = activeNavGroup();
    const group = NAV_GROUPS.find((item) => item.id === groupId);
    applyCoursePalette(group);
    document.body?.classList.toggle("pathway-pure", groupId === "pure");
    const toolData = activeToolLinks(groupId);
    if (!toolData) return;
    document.body?.classList.add("has-pathway-hub");
    document.body?.classList.toggle("pathway-unit-chooser", toolData.kind === "unit-choice");
    header.insertAdjacentHTML("afterend", `
      <nav class="pathway-tool-strip ${toolData.kind === "unit-choice" ? "is-unit-choice" : ""}" aria-label="${toolData.title} tools">
        <div class="pathway-tool-strip-title">
          <span>Course modules</span>
          <strong>${toolData.title}</strong>
          <small>${toolData.detail}</small>
          ${toolData.intro ? `<p>${toolData.intro}</p>` : ""}
        </div>
        <div class="pathway-tool-strip-links">
          ${toolData.links.map(renderToolStripLink).join("")}
        </div>
      </nav>
    `);
  }

  function ensureDialog() {
    if (!document.getElementById("leadDialog")) {
      document.body.insertAdjacentHTML("beforeend", DIALOG_HTML);
    }
  }

  function readLead() {
    try {
      return JSON.parse(localStorage.getItem(LEAD_KEY) || "{}");
    } catch (err) {
      return {};
    }
  }

  function buildLeadWhatsAppUrl(info) {
    const pkgLabel = ({
      group: "Group Course",
      private: "Private 1-to-1",
      intensive: "Intensive Sprint",
    })[info.package] || "Any package";
    const lines = [
      "Hello Dr Eslam, I would like to enroll in the IGCSE Math course.",
      `Name: ${info.name}`,
      info.email ? `Email: ${info.email}` : "",
      `Year: ${info.year}`,
      `Target exam: ${info.exam}`,
      `Interested in: ${pkgLabel}`,
    ].filter(Boolean);
    return `https://wa.me/${LEAD_PHONE}?text=${encodeURIComponent(lines.join("\n"))}`;
  }

  function init() {
    ensureDialog();

    const dialog = document.getElementById("leadDialog");
    const form = document.getElementById("leadForm");
    const closeBtn = document.getElementById("leadCloseBtn");
    const skipBtn = document.getElementById("leadSkipBtn");
    const nameInput = document.getElementById("leadName");
    const emailInput = document.getElementById("leadEmail");
    const yearSelect = document.getElementById("leadYear");
    const examSelect = document.getElementById("leadExam");
    const packageSelect = document.getElementById("leadPackage");
    let pendingPackage = "";

    function prefill() {
      const saved = readLead();
      if (saved.name) nameInput.value = saved.name;
      if (saved.email) emailInput.value = saved.email;
      if (saved.year) yearSelect.value = saved.year;
      if (saved.exam) examSelect.value = saved.exam;
      if (pendingPackage) packageSelect.value = pendingPackage;
      else if (saved.package) packageSelect.value = saved.package;
    }

    function open(pkg) {
      pendingPackage = pkg || "";
      prefill();
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
      setTimeout(() => nameInput.focus(), 30);
    }

    function close() {
      if (dialog.open) dialog.close();
    }

    document.addEventListener("click", (event) => {
      const trigger = event.target.closest("[data-lead-trigger]");
      if (trigger) {
        event.preventDefault();
        open("");
        return;
      }
      const pkgBtn = event.target.closest(".enroll-trigger");
      if (pkgBtn) {
        event.preventDefault();
        open(pkgBtn.dataset.package || "");
      }
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const info = {
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        year: yearSelect.value,
        exam: examSelect.value,
        package: packageSelect.value,
      };
      if (!info.name || !info.year || !info.exam) return;
      localStorage.setItem(LEAD_KEY, JSON.stringify(info));
      const url = buildLeadWhatsAppUrl(info);
      close();
      window.open(url, "_blank", "noopener,noreferrer");
    });

    closeBtn.addEventListener("click", close);
    skipBtn.addEventListener("click", () => {
      close();
      const fallback = `https://wa.me/${LEAD_PHONE}?text=${encodeURIComponent("Hello Dr Eslam, I would like to ask about the IGCSE Math course.")}`;
      window.open(fallback, "_blank", "noopener,noreferrer");
    });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) close();
    });
  }

  function initNavToggle() {
    const toggle = document.getElementById("navToggle");
    const header = document.querySelector(".site-header");
    if (!toggle || !header) return;
    toggle.addEventListener("click", () => {
      const open = header.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
  }

  function initStructuredNav() {
    const nav = document.querySelector(".site-nav");
    if (!nav) return;
    renderStructuredNav(nav);
    const groups = nav.querySelectorAll("[data-nav-group]");
    const page = document.body?.dataset.page || "";
    const params = new URLSearchParams(window.location.search);
    const context = resolvePathwayContext();
    const requestedPathway = params.get("pathway") || context.pathway;
    let active = findGroupByPathway(requestedPathway)?.id || "linear";

    if (page === "ial-wma11" || window.location.pathname.includes("/ial/wma11/")) {
      active = "pure";
    } else if (page === "about") {
      active = "about";
    } else if (!findGroupByPathway(requestedPathway) && (requestedPathway === "modular" || window.ELITE_PATHWAY?.mode === "modular")) {
      active = "modular";
    }

    groups.forEach((group) => {
      const isActive = group.dataset.navGroup === active;
      group.classList.toggle("is-active", isActive);
      const main = group.querySelector(".nav-tab-main");
      if (main) {
        if (isActive) main.setAttribute("aria-current", "page");
        else main.removeAttribute("aria-current");
      }
    });

    nav.addEventListener("click", (event) => {
      const pathwayLink = event.target.closest("[data-pathway-choice]");
      if (pathwayLink && !pathwayLink.classList.contains("nav-tab-main")) {
        const nextMode = pathwayLink.dataset.pathwayChoice;
        const target = pathwayLink.dataset.pathwayTarget || pathwayLink.getAttribute("href") || "";
        if (window.ELITE_PATHWAY?.setMode) {
          event.preventDefault();
          window.ELITE_PATHWAY.setMode(nextMode, target);
        }
        return;
      }

      const mainTab = event.target.closest(".nav-tab-main");
      if (mainTab) {
        const header = document.querySelector(".site-header");
        const toggle = document.getElementById("navToggle");
        if (header) header.classList.remove("nav-open");
        if (toggle) toggle.setAttribute("aria-expanded", "false");
        return;
      }

      const link = event.target.closest("a");
      if (!link || !window.matchMedia("(max-width: 1080px)").matches) return;
      const header = document.querySelector(".site-header");
      const toggle = document.getElementById("navToggle");
      if (header) header.classList.remove("nav-open");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
    });

    document.addEventListener("click", (event) => {
      if (event.target.closest(".site-nav")) return;
      groups.forEach((group) => {
        group.classList.remove("is-open");
        group.querySelector(".nav-tab-main")?.setAttribute("aria-expanded", "false");
      });
    });
  }

  function initPwa() {
    if (!("serviceWorker" in navigator)) return;
    if (!/^https?:$/.test(window.location.protocol)) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .catch(() => {});
      if ("caches" in window) {
        caches.keys()
          .then((keys) => Promise.all(
            keys
              .filter((key) => key.indexOf("elite-igcse") === 0)
              .map((key) => caches.delete(key))
          ))
          .catch(() => {});
      }
    });
  }

  function bootstrap() {
    applyPathwayContext();
    init();
    initNavToggle();
    initStructuredNav();
    initPathwayToolStrip();
    ensureIconsOnTiles();
    initPwa();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }
})();
