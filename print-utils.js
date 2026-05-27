(function () {
  const IMAGE_TIMEOUT_MS = 12000;
  const PRINT_PALETTE_STYLE_ID = "elite-print-palette-style";
  const FINAL_ANSWER = "#c0392b";
  const FINAL_ANSWER_DEEP = "#8d2820";
  const FALLBACK_PALETTES = {
    linear: {
      label: "Linear",
      accent: "#161b2e",
      accentDeep: "#0e1220",
      soft: "rgba(22, 27, 46, 0.08)",
      highlight: "#dcb877"
    },
    modular: {
      label: "Modular",
      accent: "#5a8074",
      accentDeep: "#41645b",
      soft: "rgba(90, 128, 116, 0.11)",
      highlight: "#dcb877"
    },
    pure: {
      label: "IAL Pure 1",
      accent: "#36304a",
      accentDeep: "#241f33",
      soft: "rgba(54, 48, 74, 0.1)",
      highlight: "#dcb877"
    }
  };

  function waitForImage(image) {
    image.loading = "eager";
    image.decoding = "sync";
    if ("fetchPriority" in image) image.fetchPriority = "high";

    if (image.complete) {
      return image.decode ? image.decode().catch(() => {}) : Promise.resolve();
    }

    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        image.removeEventListener("load", finish);
        image.removeEventListener("error", finish);
        resolve();
      };

      image.addEventListener("load", finish, { once: true });
      image.addEventListener("error", finish, { once: true });
      window.setTimeout(finish, IMAGE_TIMEOUT_MS);
    }).then(() => (image.decode ? image.decode().catch(() => {}) : undefined));
  }

  async function waitForPrintableAssets(root) {
    if (!root) return;
    const images = [...root.querySelectorAll("img")];
    await Promise.all(images.map(waitForImage));
    if (document.fonts?.ready) {
      await document.fonts.ready.catch(() => {});
    }
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }

  function inferPrintPaletteKey() {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("pathway");
    if (requested === "pure" || params.get("course") === "wma11") return "pure";
    if (requested === "modular") return "modular";
    if (requested === "linear") return "linear";
    const bodyPalette = document.body?.dataset.coursePalette || document.body?.dataset.pathway;
    if (FALLBACK_PALETTES[bodyPalette]) return bodyPalette;
    if (window.ELITE_PATHWAY?.mode === "modular") return "modular";
    return "linear";
  }

  function resolvePrintPalette() {
    const key = inferPrintPaletteKey();
    const registered = window.ELITE_COURSE_MODULES?.palettes?.[key] || {};
    const fallback = FALLBACK_PALETTES[key] || FALLBACK_PALETTES.linear;
    return {
      key,
      label: registered.label || fallback.label,
      accent: registered.accent || fallback.accent,
      accentDeep: registered.accentDeep || fallback.accentDeep || registered.accent || fallback.accent,
      soft: registered.soft || fallback.soft,
      highlight: registered.highlight || fallback.highlight,
      finalAnswer: FINAL_ANSWER,
      finalAnswerDeep: FINAL_ANSWER_DEEP
    };
  }

  function setPaletteVariables(node, palette) {
    if (!node) return;
    node.style.setProperty("--course-signature", palette.accent);
    node.style.setProperty("--course-deep", palette.accentDeep);
    node.style.setProperty("--course-soft", palette.soft);
    node.style.setProperty("--course-highlight", palette.highlight);
    node.style.setProperty("--final-answer", palette.finalAnswer);
    node.style.setProperty("--final-answer-deep", palette.finalAnswerDeep);
  }

  function ensurePrintPaletteStyle(targetDocument) {
    if (!targetDocument?.head) return;
    let style = targetDocument.getElementById(PRINT_PALETTE_STYLE_ID);
    if (!style) {
      style = targetDocument.createElement("style");
      style.id = PRINT_PALETTE_STYLE_ID;
      targetDocument.head.appendChild(style);
    }
    style.textContent = `
@media print {
  body[data-print-palette] .print-paper-brand {
    background: var(--course-deep, #161b2e) !important;
    border-bottom-color: var(--course-signature, #161b2e) !important;
  }
  body[data-print-palette] .print-brand-mark,
  body[data-print-palette] .print-paper-brand small {
    color: var(--course-highlight, #dcb877) !important;
  }
  body[data-print-palette] .exam-question header strong,
  body[data-print-palette] .print-question h2 {
    color: var(--course-deep, #161b2e) !important;
  }
  body[data-print-palette] .exam-question header em,
  body[data-print-palette] .print-question img {
    border-color: var(--course-signature, #161b2e) !important;
  }
  body[data-print-palette] .exam-question header em {
    background: var(--course-soft, rgba(22, 27, 46, 0.08)) !important;
    color: var(--course-deep, #161b2e) !important;
  }
  body[data-print-palette].print-solutions .solution-final {
    border-left-color: var(--final-answer, #c0392b) !important;
    background: linear-gradient(135deg, rgba(192, 57, 43, 0.12), #fff 62%) !important;
  }
  body[data-print-palette].print-solutions .solution-final > strong {
    color: var(--final-answer-deep, #8d2820) !important;
  }
}
`;
  }

  function applyPrintPalette(targetDocument = document) {
    const body = targetDocument.body;
    if (!body) return;
    const palette = resolvePrintPalette();
    body.dataset.coursePalette = palette.key;
    body.dataset.pathway = palette.key;
    body.dataset.printPalette = palette.key;
    body.dataset.printPaletteLabel = palette.label;
    setPaletteVariables(targetDocument.documentElement, palette);
    setPaletteVariables(body, palette);
    ensurePrintPaletteStyle(targetDocument);
    return palette;
  }

  async function printWhenReady(root, trigger) {
    const originalLabel = trigger?.textContent;
    if (trigger) {
      trigger.disabled = true;
      trigger.textContent = "Preparing print...";
    }
    applyPrintPalette();
    await waitForPrintableAssets(root);
    window.print();
    if (trigger) {
      trigger.disabled = false;
      trigger.textContent = originalLabel;
    }
  }

  window.ElitePrint = {
    applyPrintPalette,
    resolvePrintPalette,
    printWhenReady,
    waitForPrintableAssets
  };
})();
