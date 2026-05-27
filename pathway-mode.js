(function () {
  const STORAGE_KEY = "elitePathwayMode";
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("pathway");
  const validModes = new Set(["linear", "modular"]);

  if (validModes.has(requested)) {
    localStorage.setItem(STORAGE_KEY, requested);
  }

  const saved = localStorage.getItem(STORAGE_KEY);
  const mode = validModes.has(requested) ? requested : validModes.has(saved) ? saved : "linear";
  const hasChosen = validModes.has(requested) || validModes.has(saved);

  function setMode(nextMode, targetUrl = "") {
    if (!validModes.has(nextMode)) {
      if (targetUrl) {
        const url = new URL(targetUrl, window.location.href);
        window.location.href = url.pathname + url.search + url.hash;
      }
      return;
    }
    localStorage.setItem(STORAGE_KEY, nextMode);
    if (targetUrl) {
      const url = new URL(targetUrl, window.location.href);
      url.searchParams.set("pathway", nextMode);
      window.location.href = url.pathname + url.search + url.hash;
      return;
    }
    window.location.reload();
  }

  function label(kind = "unit") {
    if (kind === "unitPlural") return mode === "modular" ? "Units" : "Chapters";
    if (kind === "unitLower") return mode === "modular" ? "unit" : "chapter";
    if (kind === "unitLowerPlural") return mode === "modular" ? "units" : "chapters";
    return mode === "modular" ? "Unit" : "Chapter";
  }

  window.ELITE_PATHWAY = {
    mode,
    hasChosen,
    isModular: mode === "modular",
    setMode,
    label,
  };

  function activateExplainerRoute(nextRoute) {
    document.querySelectorAll("[data-route-toggle]").forEach((button) => {
      const isActive = button.dataset.routeToggle === nextRoute;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    document.querySelectorAll("[data-route-panel]").forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.routePanel === nextRoute);
    });

    const stage = document.querySelector("[data-route-stage]");
    if (stage) stage.dataset.routeStage = nextRoute;

    const facts = {
      modular: {
        best: "The student wants smaller official steps and flexible resits.",
        risk: "The student may feel she is always close to an exam.",
        code: "4WM1H + 4WM2H, with Higher cash-in 4XMAH."
      },
      linear: {
        best: "The student wants one full course rhythm and fewer official exam moments.",
        risk: "A weak final exam series can affect the whole subject result.",
        code: "4MA1/1H + 4MA1/2H."
      }
    };
    const copy = facts[nextRoute] || facts.modular;
    Object.entries(copy).forEach(([key, value]) => {
      const node = document.querySelector(`[data-route-fact="${key}"]`);
      if (node) node.textContent = value;
    });
  }

  function showModularUnitGate() {
    const mainGate = document.querySelector("[data-pathway-main-gate]");
    const modularGate = document.getElementById("modularUnitGate");
    if (mainGate) mainGate.hidden = true;
    if (modularGate) {
      modularGate.hidden = false;
      modularGate.scrollIntoView({ block: "start" });
    }
  }

  function setupPathwayGateFlow() {
    if (document.body?.dataset.pathwayGateReady === "true") return;
    if (document.body) document.body.dataset.pathwayGateReady = "true";

    document.querySelectorAll("[data-show-modular-units]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        showModularUnitGate();
      });
    });

    document.querySelectorAll("[data-route-toggle]").forEach((button) => {
      button.addEventListener("click", () => activateExplainerRoute(button.dataset.routeToggle));
    });

    document.querySelectorAll("[data-advice-choice]").forEach((button) => {
      button.addEventListener("click", () => {
        const route = button.dataset.route || "modular";
        const title = document.querySelector("[data-advice-result-title]");
        const text = document.querySelector("[data-advice-result-text]");
        const result = document.querySelector("[data-advice-result]");
        activateExplainerRoute(route);
        document.querySelectorAll("[data-advice-choice]").forEach((choice) => {
          choice.classList.toggle("is-active", choice === button);
        });
        if (title) title.textContent = button.dataset.adviceTitle || "";
        if (text) text.textContent = button.dataset.adviceText || "";
        if (result) result.dataset.route = route;
      });
    });
  }

  function applyDom() {
    const body = document.body;
    if (!body) return;
    body.classList.toggle("pathway-modular", mode === "modular");
    body.classList.toggle("pathway-linear", mode === "linear");
    body.classList.toggle("pathway-unset", body.dataset.page === "home" && !hasChosen);

    document.querySelectorAll("[data-pathway-label]").forEach((node) => {
      node.textContent = label(node.dataset.pathwayLabel);
    });
    document.querySelectorAll("[data-pathway-choice]").forEach((button) => {
      button.addEventListener("click", (event) => {
        const nextMode = button.dataset.pathwayChoice;
        const target = button.dataset.pathwayTarget || button.getAttribute("href") || "";
        if (!validModes.has(nextMode)) return;
        event.preventDefault();
        setMode(nextMode, target);
      });
    });
    document.querySelectorAll("[data-pathway-current]").forEach((node) => {
      node.textContent = mode === "modular" ? "Modular pathway" : "Linear pathway";
    });
    setupPathwayGateFlow();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyDom);
  } else {
    applyDom();
  }
})();
