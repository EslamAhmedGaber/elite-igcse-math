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
    if (!validModes.has(nextMode)) return;
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

  function applyDom() {
    const body = document.body;
    if (!body) return;
    body.classList.toggle("pathway-modular", mode === "modular");
    body.classList.toggle("pathway-linear", mode === "linear");
    body.classList.toggle("pathway-unset", body.dataset.page === "home" && !hasChosen);

    const cta = document.querySelector(".site-cta");
    if (cta && !cta.querySelector("[data-pathway-switch-wrap]")) {
      const wrap = document.createElement("label");
      wrap.className = "pathway-switch";
      wrap.dataset.pathwaySwitchWrap = "true";
      wrap.innerHTML = `
        <span>Pathway</span>
        <select data-pathway-switch>
          <option value="linear">Linear</option>
          <option value="modular">Modular</option>
        </select>
      `;
      cta.prepend(wrap);
    }

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
    document.querySelectorAll("[data-pathway-switch]").forEach((node) => {
      node.hidden = false;
      node.value = mode;
      node.addEventListener("change", () => setMode(node.value));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyDom);
  } else {
    applyDom();
  }
})();
