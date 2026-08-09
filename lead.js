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
      href: "/notes.html?pathway=linear#linearNotes",
      pathway: "linear",
      panelLabel: "Linear tools",
      links: [
        { title: "Strategy Notes", detail: "Booklet + topic notes", href: "/notes.html?pathway=linear#linearNotes", pathway: "linear" },
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
            { title: "Strategy Notes", detail: "Shared core notes", href: "/notes.html?pathway=modular&unit=Unit+1#linearNotes", pathway: "modular" },
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
            { title: "Strategy Notes", detail: "Shared core notes", href: "/notes.html?pathway=modular&unit=Unit+2#linearNotes", pathway: "modular" },
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
        { title: "Strategy Notes", detail: "Booklet + topic notes", href: "/ial/wma11/index.html#ialNotes" },
        { title: "Classified View", detail: "Topic practice", href: "/ial/wma11/index.html#ialFilters" },
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
        { title: "Teacher Studio", detail: "Planner and certificates", href: "/admin.html" },
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
    "classified practice": "classified",
    "classified books": "books",
    "strategy notes": "notes",
    "notes": "notes",
    "booklet notes": "notes",
    "expertise": "expertise",
    "mock builder": "build-test",
    "mock generator": "build-test",
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
    "past papers": "past-solutions",
    "progress": "progress",
    "mistake box": "mistake-box",
    "interactive lab": "interactive-lab",
    "mechanics lab": "interactive-lab",
    "question visualizer": "question-visualizer",
    "paper question visualizer": "question-visualizer",
  };
  const MODULE_ALIASES = COURSE_SYSTEM.moduleAliases || DEFAULT_MODULE_ALIASES;

  function moduleKey(item) {
    const title = String(item.module || item.title || "").trim().toLowerCase();
    if (MODULE_ALIASES[title]) return MODULE_ALIASES[title];
    return title.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "general";
  }

  const CORE_TOOL_ORDER = ["classified", "books", "past-solutions", "notes", "build-test"];
  const CORE_TOOL_COPY = {
    classified: {
      title: "Classified Practice",
      detail: "Filter by topic and solve online",
      short: "Classified",
    },
    books: {
      title: "Classified Books",
      detail: "Question books + worked solutions",
      short: "Books",
    },
    "past-solutions": {
      title: "Past Papers",
      detail: "Exam papers + matching solutions",
      short: "Papers",
    },
    notes: {
      title: "Strategy Notes",
      detail: "Topic notes + complete booklet",
      short: "Notes",
    },
    "build-test": {
      title: "Mock Generator",
      detail: "Random or custom printable tests",
      short: "Mock",
    },
  };

  function preferredCoreHref(key, link, context = {}) {
    const courseMap = {
      pure: "wma11",
      pure2: "wma12",
      mechanics1: "wme01",
    };
    const course = courseMap[context.groupId || ""];
    if (!course) return link.href;
    if (key === "books") return `/downloads.html?pathway=pure&course=${course}#downloads`;
    if (key === "past-solutions") return `/pastpapers.html?pathway=pure&course=${course}#pure-${course}`;
    return link.href;
  }

  function workspaceTools(links, context = {}) {
    const list = Array.isArray(links) ? links : [];
    const byModule = new Map();
    list.forEach((link) => {
      const key = moduleKey(link);
      if (!byModule.has(key)) byModule.set(key, link);
    });
    const primary = CORE_TOOL_ORDER.map((key) => {
      const link = byModule.get(key);
      if (!link) return null;
      const copy = CORE_TOOL_COPY[key];
      return {
        ...link,
        module: key,
        title: copy.title,
        detail: copy.detail,
        short: copy.short,
        href: preferredCoreHref(key, link, context),
      };
    }).filter(Boolean);
    const primaryKeys = new Set(primary.map((link) => moduleKey(link)));
    const secondary = list.filter((link) => {
      const key = moduleKey(link);
      return !primaryKeys.has(key) && key !== "answers";
    });
    return { primary, secondary };
  }

  function navLink(item, className = "") {
    const key = moduleKey(item);
    const attrs = [
      `href="${item.href}"`,
      `data-module="${key}"`,
      className ? `class="${className}"` : "",
      item.target ? `target="${item.target}" rel="noreferrer"` : "",
      item.pathway ? `data-pathway-choice="${item.pathway}" data-pathway-target="${item.href}"` : "",
      item.lead ? `data-lead-trigger="${item.lead}"` : "",
    ].filter(Boolean).join(" ");
    return `<a ${attrs}>${getModuleIcon(key)}<span class="module-text"><strong>${item.title}</strong><span>${item.detail}</span></span></a>`;
  }

  function navTools(links, context = {}) {
    const tools = workspaceTools(links, context);
    const more = tools.secondary.length
      ? `<details class="nav-more-tools"><summary>More tools <span>${tools.secondary.length}</span></summary><div class="nav-secondary-grid">${tools.secondary.map((link) => navLink(link, "is-secondary")).join("")}</div></details>`
      : "";
    return `<div class="nav-tool-grid">${tools.primary.map((link) => navLink(link, "is-primary")).join("")}</div>${more}`;
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
    const pathname = window.location.pathname.toLowerCase();
    const pathIsWma11 = pathname.includes("/ial/wma11/");
    const pathIsWma12 = pathname.includes("/ial/wma12/");
    const pathIsWme01 = pathname.includes("/ial/wme01/");
    const pathIsIal = pathIsWma11 || pathIsWma12 || pathIsWme01 || pathname === "/ial/" || pathname.endsWith("/ial/index.html");
    const pathway = requested || normalizePathway(boot.pathway) || (pathIsIal ? "pure" : "") || readStoredPathway() || "linear";
    const course = params.get("course") || boot.course || (pathIsWme01 ? "wme01" : pathIsWma12 ? "wma12" : pathIsWma11 ? "wma11" : "");
    const unit = normalizeUnit(params.get("unit") || boot.unit || "");
    return { pathway, course, unit };
  }

  function coursePalette(course, pathway) {
    if (course === "wma12") return "mulberry";
    if (course === "wme01") return "teal";
    if (course === "wma11") return "pure";
    return pathway;
  }

  function applyPathwayContext(context = resolvePathwayContext()) {
    [document.documentElement, document.body].filter(Boolean).forEach((target) => {
      target.dataset.pathway = context.pathway;
      target.dataset.coursePalette = coursePalette(context.course, context.pathway);
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
                  ${navTools(unit.links, { groupId: group.id, unit: unit.title })}
                </section>
              `).join("")}
            </div>
          </div>`
        : `<div class="nav-panel nav-panel-${group.id}" aria-label="${group.label} pathway links">
            <div class="nav-panel-label">${group.panelLabel}</div>
            ${navTools(group.links, { groupId: group.id })}
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
    const requestedCourse = (params.get("course") || context.course || "").toLowerCase();
    if (requestedCourse === "wme01" || page === "ial-wme01" || window.location.pathname.includes("/ial/wme01/")) return "mechanics1";
    if (requestedCourse === "wma12" || page === "ial-wma12" || window.location.pathname.includes("/ial/wma12/")) return "pure2";
    if (requestedCourse === "wma11" || page === "ial-wma11" || window.location.pathname.includes("/ial/wma11/")) return "pure";
    const requestedPathway = params.get("pathway") || context.pathway;
    const requestedGroup = findGroupByPathway(requestedPathway);
    if (requestedGroup) return requestedGroup.id;
    if (requestedPathway === "pure") return "pure";
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
    if (!group.units) return { title: group.label, detail: group.detail, intro: group.intro, links: group.links, groupId };
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
      groupId,
      unit: unit.title,
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

  function isCoreToolActive(link) {
    if (isToolActive(link)) return true;
    if (window.location.hash) return false;
    const pageModule = {
      practice: "classified",
      downloads: "books",
      pastpapers: "past-solutions",
      notes: "notes",
      exam: "build-test",
    }[document.body?.dataset?.page || ""];
    const defaultModule = document.body?.dataset?.ialActiveModule || pageModule || "";
    return moduleKey(link) === defaultModule;
  }

  const MODULE_ICONS = {
    "notes":          '<svg class="module-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h10a4 4 0 0 1 4 4v12H8a3 3 0 0 1-3-3z"/><path d="M8 4v13a3 3 0 0 0 3 3"/><path d="M9 8h6M9 12h5"/></svg>',
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
    "interactive-lab": '<svg class="module-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 17h16"/><path d="M7 17l4-10 4 10"/><path d="M6 7h12"/><circle cx="17" cy="7" r="2"/></svg>',
    "question-visualizer": '<svg class="module-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M7 8h5M7 12h3"/><path d="M14 13l2-2 3 4"/></svg>',
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
      isCoreToolActive(link) ? `aria-current="page"` : "",
    ].filter(Boolean).join(" ");
    const icon = getModuleIcon(moduleKey(link));
    return `<a ${attrs}>${icon}<div class="module-text"><strong>${link.title}</strong><span>${link.detail}</span></div></a>`;
  }

  function renderCompactToolLink(link) {
    const attrs = [
      `href="${link.href}"`,
      `data-module="${moduleKey(link)}"`,
      link.target ? `target="${link.target}" rel="noreferrer"` : "",
      link.pathway ? `data-pathway-choice="${link.pathway}" data-pathway-target="${link.href}"` : "",
      link.lead ? `data-lead-trigger="${link.lead}"` : "",
    ].filter(Boolean).join(" ");
    return `<a ${attrs}>${getModuleIcon(moduleKey(link))}<span>${link.title}</span></a>`;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  const PATHWAY_BREADCRUMB_LABELS = {
    linear: { label: "Linear", code: "4MA1" },
    modular: { label: "Modular", code: "4WM" },
    pure: { label: "IAL Pure 1", code: "WMA11" },
  };

  const MODULE_BREADCRUMB_LABELS = {
    notes: "Strategy Notes",
    classified: "Classified View",
    expertise: "Expertise View",
    "build-test": "Build Test",
    "smart-revision": "Smart Revision",
    progress: "Progress",
    "mistake-box": "Mistake Box",
    "saved-tests": "Saved Tests",
    books: "Books",
    answers: "Answer Books",
    "past-solutions": "Past Papers",
    "interactive-lab": "Interactive Lab",
    "question-visualizer": "Question Visualizer",
    "unit-choice": "Choose Unit",
  };

  function currentModuleLabel() {
    const page = document.body?.dataset?.page || "";
    const params = new URLSearchParams(window.location.search);
    const path = window.location.pathname;
    const hash = window.location.hash;
    if (path.includes("/ial/wme01/lab/")) return "Interactive Lab";
    if (page === "notes" || path.endsWith("/notes.html")) return "Strategy Notes";
    if (path.includes("/ial/wma11/") || path.includes("/ial/wma12/") || path.includes("/ial/wme01/")) {
      if (hash === "#ialNotes") return "Strategy Notes";
      if (!hash && !["topic", "mode", "expertise", "bank"].some((key) => params.has(key))) return "Strategy Notes";
      if (path.includes("/ial/wme01/")) {
        if (hash === "#ialQuestionVisualizer") return "Question Visualizer";
        if (hash === "#ialSimulator") return "Interactive Lab";
        if (hash === "#ialPastPapers") return "Past Papers";
        if (hash === "#ialProgressModule") return "Progress";
        if (hash === "#ialMockBuilder") return "Build Test";
      }
      if (params.get("mode") === "mistakes") return "Mistake Box";
      if (params.get("expertise") === "1") return "Expertise View";
      return "Classified View";
    }
    if (page === "practice" || path.endsWith("/practice.html")) {
      if (params.get("pathway") === "modular" && params.get("choose") === "unit" && !params.get("unit")) return "Choose Unit";
      const mode = params.get("mode");
      if (mode === "review") return "Mistake Box";
      if (params.get("bank") === "expertise" || mode === "q20") return "Expertise View";
      return "Classified View";
    }
    if (page === "exam" || path.endsWith("/exam.html")) {
      const mode = params.get("mode");
      if (mode === "smart") return "Smart Revision";
      if (mode === "saved") return "Saved Tests";
      return "Build Test";
    }
    if (page === "progress" || path.endsWith("/progress.html")) return "Progress";
    if (page === "pastpapers" || path.endsWith("/pastpapers.html")) return "Past Papers";
    if (page === "downloads" || path.endsWith("/downloads.html")) return "Books";
    if (page === "topics" || path.endsWith("/topics.html")) return "Topic Roadmap";
    if (page === "checkup" || path.endsWith("/checkup.html")) return "Readiness Check";
    if (page === "admin" || path.endsWith("/admin.html")) return "Teacher Studio";
    if (page === "about" || path.endsWith("/about.html")) return "About";
    return "";
  }

  function activePathwayId() {
    const id = activeNavGroup();
    if (id === "pure2" || id === "mechanics1") return "pure";
    return (id === "linear" || id === "modular" || id === "pure") ? id : "";
  }

  function buildBreadcrumbCrumbs() {
    const crumbs = [{ label: "Home", href: "/index.html" }];
    const page = document.body?.dataset?.page || "";
    const pathwayId = activePathwayId();
    // IAL hub page (lists Pure 1, Pure 2, ...)
    if (page === "ial-hub") {
      crumbs.push({ label: "IAL", sub: "Edexcel", current: true });
      return crumbs;
    }
    if (!pathwayId) {
      const moduleLabel = currentModuleLabel();
      if (page === "about") crumbs.push({ label: "About", current: true });
      else if (moduleLabel) crumbs.push({ label: moduleLabel, current: true });
      return crumbs;
    }
    // For IAL subjects, insert "IAL" as a parent crumb and keep the course identity explicit.
    if (pathwayId === "pure") {
      crumbs.push({ label: "IAL", sub: "Edexcel", href: "/ial/index.html" });
      const params = new URLSearchParams(window.location.search);
      const pathname = window.location.pathname.toLowerCase();
      const course = (params.get("course") || document.body?.dataset?.course || "").toLowerCase();
      const isWme01 = pathname.includes("/ial/wme01/") || course === "wme01";
      const isWma12 = pathname.includes("/ial/wma12/") || course === "wma12";
      crumbs.push(isWme01
        ? { label: "Mechanics 1", sub: "WME01", href: "/ial/wme01/index.html" }
        : isWma12
        ? { label: "Pure 2", sub: "WMA12", href: "/ial/wma12/index.html" }
        : { label: "Pure 1", sub: "WMA11", href: "/ial/wma11/index.html" });
    } else {
      const meta = PATHWAY_BREADCRUMB_LABELS[pathwayId];
      if (meta) {
        const pathwayHref = pathwayId === "modular"
          ? "/practice.html?pathway=modular&choose=unit"
          : "/notes.html?pathway=linear#linearNotes";
        crumbs.push({ label: meta.label, sub: meta.code, href: pathwayHref });
      }
    }
    if (pathwayId === "modular") {
      const params = new URLSearchParams(window.location.search);
      const unit = params.get("unit");
      if (unit) {
        const unitCode = unit === "Unit 2" ? "4WM2H" : "4WM1H";
        const moduleLabel = currentModuleLabel();
        crumbs.push({
          label: unit,
          sub: unitCode,
          href: moduleLabel
            ? `/practice.html?pathway=modular&unit=${encodeURIComponent(unit)}&bank=all`
            : "",
          current: !moduleLabel,
        });
      }
    }
    const moduleLabel = currentModuleLabel();
    if (moduleLabel) {
      // For Pure course landings with no specific module, the last course crumb is already the page.
      const path = window.location.pathname;
      const isPureLanding = moduleLabel !== "Strategy Notes" && pathwayId === "pure" && (path.endsWith("/ial/wma11/index.html") || path.endsWith("/ial/wma12/index.html") || path.endsWith("/ial/wme01/index.html"))
        && !window.location.search && !window.location.hash;
      if (!isPureLanding) {
        crumbs.push({ label: moduleLabel, current: true });
      } else {
        // mark the Pure course crumb as current
        const last = crumbs[crumbs.length - 1];
        if (last) { delete last.href; last.current = true; }
      }
    }
    return crumbs;
  }

  function initAnimatedCounters() {
    if (!("IntersectionObserver" in window)) return;
    const candidates = document.querySelectorAll(
      ".stats-band strong, .hero-stat-strip strong, .home-hero strong[data-count], .review-summary strong, .pathway-stats strong"
    );
    if (!candidates.length) return;
    const parseTarget = (el) => {
      const raw = (el.textContent || "").trim();
      const num = raw.match(/^\d[\d,.]*\d|^\d+/);
      if (!num) return null;
      const value = parseInt(num[0].replace(/[,.\s]/g, ""), 10);
      if (!Number.isFinite(value)) return null;
      const suffix = raw.slice(num[0].length);
      return { value, suffix, original: raw };
    };
    const animateTo = (el, target, suffix) => {
      const duration = 1100;
      const start = performance.now();
      const startValue = 0;
      const easeOut = (t) => 1 - Math.pow(1 - t, 3);
      const tick = (now) => {
        const elapsed = now - start;
        const progress = Math.min(1, elapsed / duration);
        const eased = easeOut(progress);
        const current = Math.round(startValue + (target - startValue) * eased);
        el.textContent = current.toLocaleString() + suffix;
        if (progress < 1) requestAnimationFrame(tick);
        else el.textContent = target.toLocaleString() + suffix;
      };
      requestAnimationFrame(tick);
    };
    const observed = new WeakSet();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        if (observed.has(el)) return;
        observed.add(el);
        const parsed = parseTarget(el);
        if (!parsed || parsed.value < 5) return;
        el.dataset.original = parsed.original;
        animateTo(el, parsed.value, parsed.suffix);
        observer.unobserve(el);
      });
    }, { threshold: 0.4 });
    candidates.forEach((el) => observer.observe(el));
  }

  function initShrinkingHeader() {
    if (document.body?.dataset?.shrinkingHeader === "ready") return;
    document.body.dataset.shrinkingHeader = "ready";
    let raf = 0;
    const evaluate = () => {
      raf = 0;
      const scrolled = window.scrollY > 24;
      document.body.classList.toggle("is-scrolled", scrolled);
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(evaluate);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    evaluate();
  }

  function rewriteIalTopNavFromTree() {
    const group = document.querySelector(".nav-group-pure[data-nav-group='pure']");
    if (!group) return;
    const tree = (window.ELITE_COURSE_MODULES || {}).siteTree;
    if (!tree || !Array.isArray(tree.children)) return;
    const ial = tree.children.find((node) => node.id === "ial");
    if (!ial) return;
    const tabMain = group.querySelector(".nav-tab-main");
    if (tabMain) {
      tabMain.setAttribute("href", "ial/index.html");
      const spanLabel = tabMain.querySelector("span");
      const smallLabel = tabMain.querySelector("small");
      if (spanLabel) spanLabel.textContent = "IAL";
      if (smallLabel) smallLabel.textContent = "International A-Level";
    }
    const panel = group.querySelector(".nav-panel");
    if (!panel) return;
    const subjects = Array.isArray(ial.children) ? ial.children : [];
    if (!subjects.length) return;
    const itemsHtml = subjects.map((subject) => {
      const isLive = subject.status === "live";
      const href = isLive ? subject.href : "#";
      const cssClasses = isLive ? "" : 'class="is-coming" aria-disabled="true"';
      const label = isLive ? subject.label : `${subject.label} (coming)`;
      const detail = subject.code || "";
      return `<a href="${escapeHtml(href)}" ${cssClasses}><strong>${escapeHtml(label)}</strong><span>${escapeHtml(detail)}</span></a>`;
    }).join("");
    panel.innerHTML = itemsHtml;
    panel.setAttribute("aria-label", "IAL Mathematics units");
  }

  function renderIalSubjectHub() {
    const grid = document.querySelector("[data-ial-subject-grid]");
    if (!grid) return;
    const tree = (window.ELITE_COURSE_MODULES || {}).siteTree;
    if (!tree || !Array.isArray(tree.children)) return;
    const ial = tree.children.find((node) => node.id === "ial");
    if (!ial || !Array.isArray(ial.children)) return;
    const cards = ial.children.map((subject) => {
      const isLive = subject.status === "live";
      const href = isLive ? subject.href : "#";
      const tag = isLive ? "Live" : "Coming soon";
      const tagClass = isLive ? "ial-subject-tag is-live" : "ial-subject-tag is-coming";
      const paletteClass = `is-${subject.palette || "pure"}`;
      const attrs = isLive
        ? `href="${escapeHtml(href)}"`
        : `href="#" aria-disabled="true" role="link"`;
      return `
        <a class="ial-subject-card ${paletteClass} ${isLive ? "" : "is-disabled"}" ${attrs}>
          <span class="${tagClass}">${tag}</span>
          <strong>${escapeHtml(subject.label)}</strong>
          <span class="ial-subject-code">${escapeHtml(subject.code || "")}</span>
          <p>${escapeHtml(subjectBlurb(subject.id))}</p>
        </a>
      `;
    }).join("");
    grid.innerHTML = cards;
  }

  function subjectBlurb(id) {
    switch (id) {
      case "pure1": return "Algebra, coordinate geometry, sequences, differentiation, integration.";
      case "pure2": return "Algebraic functions, trigonometry, exponentials, integration techniques.";
      case "stats1": return "Probability distributions, regression, correlation, hypothesis testing.";
      case "mech1": return "Kinematics, dynamics, statics, vectors in mechanics.";
      default: return "";
    }
  }

  function renderEliteBreadcrumb() {
    if (document.querySelector(".elite-breadcrumb")) return;
    const header = document.querySelector(".site-header");
    if (!header) return;
    const page = document.body?.dataset?.page || "";
    if (page === "home") return;
    const crumbs = buildBreadcrumbCrumbs();
    if (!crumbs || crumbs.length < 2) return;
    const items = crumbs.map((crumb, idx) => {
      const isCurrent = !!crumb.current;
      const subText = crumb.sub ? `<span class="elite-breadcrumb-sub">${escapeHtml(crumb.sub)}</span>` : "";
      const inner = `${escapeHtml(crumb.label)}${subText}`;
      if (isCurrent || !crumb.href) {
        return `<li class="elite-breadcrumb-item is-current" aria-current="${isCurrent ? "page" : "false"}">${inner}</li>`;
      }
      return `<li class="elite-breadcrumb-item"><a href="${crumb.href}">${inner}</a></li>`;
    }).join('<li class="elite-breadcrumb-sep" aria-hidden="true">/</li>');
    header.insertAdjacentHTML("afterend", `
      <nav class="elite-breadcrumb" aria-label="Breadcrumb">
        <ol>${items}</ol>
      </nav>
    `);
  }

  function initPathwayToolStrip() {
    if (document.querySelector(".pathway-tool-strip")) return;
    const header = document.querySelector(".site-header");
    if (!header) return;
    const groupId = activeNavGroup();
    const group = NAV_GROUPS.find((item) => item.id === groupId);
    applyCoursePalette(group);
    document.body?.classList.toggle("pathway-pure", groupId === "pure" || groupId === "pure2" || groupId === "mechanics1");
    const toolData = activeToolLinks(groupId);
    if (!toolData) return;
    document.body?.classList.add("has-pathway-hub");
    document.body?.classList.toggle("pathway-unit-chooser", toolData.kind === "unit-choice");
    const anchor = document.querySelector(".elite-breadcrumb") || header;
    if (toolData.kind === "unit-choice") {
      anchor.insertAdjacentHTML("afterend", `
        <nav class="pathway-tool-strip is-unit-choice" aria-label="${toolData.title} tools">
          <div class="pathway-tool-strip-title">
            <span>Choose course</span>
            <strong>${toolData.title}</strong>
            <small>${toolData.detail}</small>
            ${toolData.intro ? `<p>${toolData.intro}</p>` : ""}
          </div>
          <div class="pathway-tool-strip-links">
            ${toolData.links.map(renderToolStripLink).join("")}
          </div>
        </nav>
      `);
      return;
    }
    const tools = workspaceTools(toolData.links, { groupId: toolData.groupId || groupId, unit: toolData.unit });
    const moreTools = tools.secondary.length
      ? `<details class="pathway-more-tools"><summary>More tools <span>${tools.secondary.length}</span></summary><div class="pathway-more-grid">${tools.secondary.map(renderCompactToolLink).join("")}</div></details>`
      : "";
    anchor.insertAdjacentHTML("afterend", `
      <nav class="pathway-tool-strip is-core-workspace" aria-label="${toolData.title} study workspace">
        <div class="pathway-tool-strip-title">
          <span>Active course</span>
          <strong>${toolData.title}</strong>
          <small>${toolData.detail}</small>
          ${toolData.intro ? `<p>${toolData.intro}</p>` : ""}
        </div>
        <div class="pathway-core-tools">
          <div class="pathway-core-heading">
            <strong>Study workspace</strong>
            <span>Everything students use most, in one place.</span>
          </div>
          <div class="pathway-tool-strip-links">
            ${tools.primary.map(renderToolStripLink).join("")}
          </div>
          ${moreTools}
        </div>
      </nav>
    `);
  }

  function homeCourseOption(courseId) {
    if (courseId === "modular-unit-1" || courseId === "modular-unit-2") {
      const group = NAV_GROUPS.find((item) => item.id === "modular");
      const unitTitle = courseId.endsWith("2") ? "Unit 2" : "Unit 1";
      const unit = group?.units?.find((item) => item.title === unitTitle);
      if (!group || !unit) return null;
      return {
        id: courseId,
        groupId: group.id,
        label: `${group.label} ${unit.title}`,
        detail: unit.detail,
        intro: unit.intro,
        links: unit.links,
        palette: groupPalette(group),
        unit: unit.title,
      };
    }
    const group = NAV_GROUPS.find((item) => item.id === courseId);
    if (!group || group.id === "about" || group.units) return null;
    return {
      id: courseId,
      groupId: group.id,
      label: group.label,
      detail: group.detail,
      intro: group.intro,
      links: group.links,
      palette: groupPalette(group),
    };
  }

  function renderHomeCoreLink(link, index) {
    const key = moduleKey(link);
    const attrs = [
      `class="home-core-action"`,
      `href="${link.href}"`,
      `data-module="${key}"`,
      link.target ? `target="${link.target}" rel="noreferrer"` : "",
      link.pathway ? `data-pathway-choice="${link.pathway}" data-pathway-target="${link.href}"` : "",
    ].filter(Boolean).join(" ");
    return `<a ${attrs}>
      <span class="home-core-action-index">0${index + 1}</span>
      ${getModuleIcon(key)}
      <span class="home-core-action-copy"><strong>${link.title}</strong><span>${link.detail}</span></span>
      <span class="home-core-action-open">Open</span>
    </a>`;
  }

  function renderMobileCoreNav(links, context = {}) {
    const nav = document.querySelector(".mobile-bottom-nav");
    if (!nav) return;
    const tools = workspaceTools(links, context);
    if (!tools.primary.length) return;
    nav.innerHTML = tools.primary.map((link) => {
      const key = moduleKey(link);
      const attrs = [
        `href="${link.href}"`,
        `data-module="${key}"`,
        link.pathway ? `data-pathway-choice="${link.pathway}" data-pathway-target="${link.href}"` : "",
        isCoreToolActive(link) ? `aria-current="page"` : "",
      ].filter(Boolean).join(" ");
      return `<a ${attrs}>${getModuleIcon(key)}<span>${link.short || CORE_TOOL_COPY[key]?.short || link.title}</span></a>`;
    }).join("");
  }

  function syncCoreMobileNav() {
    const workspace = document.querySelector("[data-home-workspace]");
    if (workspace) {
      const option = homeCourseOption(workspace.dataset.homeCourse || "linear");
      if (option) {
        renderMobileCoreNav(option.links, { groupId: option.groupId, unit: option.unit });
      }
      return;
    }
    initCoreMobileNav();
  }

  function initHomeCoreWorkspace() {
    const workspace = document.querySelector("[data-home-workspace]");
    if (!workspace) return;
    const tabs = [...workspace.querySelectorAll("[data-home-course]")];
    const grid = workspace.querySelector("[data-home-core-tools]");
    const moreGrid = workspace.querySelector("[data-home-more-tools]");
    const moreShell = workspace.querySelector("[data-home-more-shell]");
    const label = workspace.querySelector("[data-home-course-label]");
    const code = workspace.querySelector("[data-home-course-code]");
    const intro = workspace.querySelector("[data-home-course-intro]");
    const tabStrip = workspace.querySelector(".home-course-tabs");
    if (!tabs.length || !grid) return;

    const render = (courseId) => {
      const option = homeCourseOption(courseId) || homeCourseOption("linear");
      if (!option) return;
      const tools = workspaceTools(option.links, { groupId: option.groupId, unit: option.unit });
      workspace.dataset.homeCourse = option.id;
      if (option.palette?.accent) {
        workspace.style.setProperty("--home-course-accent", option.palette.accent);
        workspace.style.setProperty("--home-course-deep", option.palette.accentDeep || option.palette.accent);
        workspace.style.setProperty("--home-course-soft", option.palette.soft || "rgba(29, 78, 216, 0.1)");
      }
      tabs.forEach((tab) => {
        const selected = tab.dataset.homeCourse === option.id;
        tab.classList.toggle("is-active", selected);
        tab.setAttribute("aria-selected", String(selected));
        tab.tabIndex = selected ? 0 : -1;
      });
      const selectedTab = tabs.find((tab) => tab.dataset.homeCourse === option.id);
      if (selectedTab && tabStrip) {
        requestAnimationFrame(() => {
          const maxScroll = Math.max(0, tabStrip.scrollWidth - tabStrip.clientWidth);
          const centred = selectedTab.offsetLeft - (tabStrip.clientWidth - selectedTab.offsetWidth) / 2;
          tabStrip.scrollLeft = Math.min(maxScroll, Math.max(0, centred));
        });
      }
      if (label) label.textContent = option.label;
      if (code) code.textContent = option.detail;
      if (intro) intro.textContent = option.intro || "Choose a resource and start studying.";
      grid.innerHTML = tools.primary.map(renderHomeCoreLink).join("");
      if (moreGrid) moreGrid.innerHTML = tools.secondary.map(renderCompactToolLink).join("");
      if (moreShell) moreShell.hidden = !tools.secondary.length;
      renderMobileCoreNav(option.links, { groupId: option.groupId, unit: option.unit });
      try {
        localStorage.setItem("eliteHomeCourse", option.id);
      } catch (err) {
        // The launcher still works when browser storage is unavailable.
      }
    };

    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => render(tab.dataset.homeCourse));
      tab.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
        event.preventDefault();
        const offset = event.key === "ArrowRight" ? 1 : -1;
        const next = tabs[(index + offset + tabs.length) % tabs.length];
        next.focus();
        render(next.dataset.homeCourse);
      });
    });

    let saved = "";
    try {
      saved = localStorage.getItem("eliteHomeCourse") || "";
    } catch (err) {
      saved = "";
    }
    render(tabs.some((tab) => tab.dataset.homeCourse === saved) ? saved : "linear");
  }

  function initCoreMobileNav() {
    if (document.body?.dataset?.page === "home") return;
    const groupId = activeNavGroup();
    const toolData = activeToolLinks(groupId);
    if (!toolData || toolData.kind === "unit-choice") return;
    renderMobileCoreNav(toolData.links, { groupId: toolData.groupId || groupId, unit: toolData.unit });
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
    const requestedCourse = (params.get("course") || context.course || "").toLowerCase();
    const requestedPathway = params.get("pathway") || context.pathway;
    let active = findGroupByPathway(requestedPathway)?.id || "linear";

    if (requestedCourse === "wme01" || page === "ial-wme01" || window.location.pathname.includes("/ial/wme01/")) {
      active = "mechanics1";
    } else if (requestedCourse === "wma12" || page === "ial-wma12" || window.location.pathname.includes("/ial/wma12/")) {
      active = "pure2";
    } else if (requestedCourse === "wma11" || page === "ial-wma11" || window.location.pathname.includes("/ial/wma11/")) {
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

  function loadStudyExperience() {
    if (window.ELITE_STUDY || document.querySelector('script[data-elite-study="compass"]')) return;
    const leadScript = document.querySelector('script[src*="lead.js"]');
    const baseUrl = leadScript?.src || document.baseURI;
    const dataUrl = new URL("study-search-data.js?v=20260713b", baseUrl).href;
    const compassUrl = new URL("study-compass.js?v=20260713b", baseUrl).href;

    function appendScript(src, marker) {
      return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[data-elite-study="${marker}"]`);
        if (existing) {
          if (marker === "data" && window.ELITE_STUDY_SEARCH) resolve();
          else if (marker === "compass" && window.ELITE_STUDY) resolve();
          else existing.addEventListener("load", resolve, { once: true });
          return;
        }
        const script = document.createElement("script");
        script.src = src;
        script.dataset.eliteStudy = marker;
        script.addEventListener("load", resolve, { once: true });
        script.addEventListener("error", reject, { once: true });
        document.head.appendChild(script);
      });
    }

    const dataReady = window.ELITE_STUDY_SEARCH
      ? Promise.resolve()
      : appendScript(dataUrl, "data");
    dataReady
      .then(() => appendScript(compassUrl, "compass"))
      .then(() => syncCoreMobileNav())
      .catch(() => {});
  }

  function bootstrap() {
    applyPathwayContext();
    init();
    rewriteIalTopNavFromTree();
    initNavToggle();
    initStructuredNav();
    renderEliteBreadcrumb();
    renderIalSubjectHub();
    initHomeCoreWorkspace();
    initPathwayToolStrip();
    syncCoreMobileNav();
    ensureIconsOnTiles();
    initShrinkingHeader();
    initAnimatedCounters();
    loadStudyExperience();
    initPwa();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }
})();
