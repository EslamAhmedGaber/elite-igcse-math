(function () {
  const VALID_PATHWAYS = new Set(["linear", "modular", "pure"]);
  const CHOICE_KEYS = ["elitePathwayChoice", "elitePathwayMode"];

  function safeLocalStorageGet(key) {
    try {
      return window.localStorage ? window.localStorage.getItem(key) : "";
    } catch (err) {
      return "";
    }
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

  function storedPathway() {
    for (const key of CHOICE_KEYS) {
      const saved = normalizePathway(safeLocalStorageGet(key));
      if (saved) return saved;
    }
    return "";
  }

  function resolveContext() {
    const url = new URL(window.location.href);
    const requested = normalizePathway(url.searchParams.get("pathway"));
    const pathname = window.location.pathname.toLowerCase();
    const pathIsWma11 = pathname.includes("/ial/wma11/");
    const pathIsWma12 = pathname.includes("/ial/wma12/");
    const pathIsIal = pathIsWma11 || pathIsWma12 || pathname === "/ial/" || pathname.endsWith("/ial/index.html");
    const course = url.searchParams.get("course") || (pathIsWma12 ? "wma12" : pathIsWma11 ? "wma11" : "");
    const pathway = requested || (pathIsIal ? "pure" : "") || storedPathway() || "linear";
    return {
      pathway,
      course,
      unit: normalizeUnit(url.searchParams.get("unit")),
    };
  }

  function applyContext(target, context) {
    if (!target) return;
    target.dataset.pathway = context.pathway;
    target.dataset.coursePalette = context.pathway;
    if (context.course) target.dataset.course = context.course;
    else delete target.dataset.course;
    if (context.unit) target.dataset.unit = context.unit;
    else delete target.dataset.unit;
  }

  const context = resolveContext();
  window.ELITE_PATHWAY_BOOTSTRAP = context;
  applyContext(document.documentElement, context);

  function applyBody() {
    applyContext(document.body, context);
  }

  if (document.body) {
    applyBody();
  } else {
    document.addEventListener("DOMContentLoaded", applyBody, { once: true });
  }
})();
