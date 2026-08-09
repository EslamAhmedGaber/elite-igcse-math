(function () {
  const IMAGE_TIMEOUT_MS = 12000;
  const MATH_TIMEOUT_MS = 10000;
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
    },
    mulberry: {
      label: "IAL Pure 2",
      accent: "#6b2f5f",
      accentDeep: "#48203f",
      soft: "rgba(107, 47, 95, 0.1)",
      highlight: "#dcb877"
    },
    teal: {
      label: "IAL Mechanics 1",
      accent: "#31534e",
      accentDeep: "#203936",
      soft: "rgba(49, 83, 78, 0.1)",
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

  async function waitForMathTypesetting(root) {
    const rawText = root?.textContent || "";
    if (!/\\\(|\\\[|\$\$/.test(rawText)) return;

    const deadline = Date.now() + MATH_TIMEOUT_MS;
    while (!window.MathJax?.typesetPromise && Date.now() < deadline) {
      await new Promise((resolve) => window.setTimeout(resolve, 80));
    }
    if (!window.MathJax?.typesetPromise) return;

    await window.MathJax.startup?.promise?.catch?.(() => {});
    await window.MathJax.typesetPromise([root]).catch(() => {});
  }

  async function waitForPrintableAssets(root) {
    if (!root) return;
    const images = [...root.querySelectorAll("img")];
    await Promise.all(images.map(waitForImage));
    await waitForMathTypesetting(root);
    if (document.fonts?.ready) {
      await document.fonts.ready.catch(() => {});
    }
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }

  function inferPrintPaletteKey() {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("pathway");
    const requestedCourse = params.get("course");
    if (requestedCourse === "wme01") return "teal";
    if (requestedCourse === "wma12") return "mulberry";
    if (requestedCourse === "wma11") return "pure";
    if (requested === "modular") return "modular";
    if (requested === "linear") return "linear";
    if (requested === "pure") {
      const bodyCourse = document.body?.dataset.course;
      if (bodyCourse === "wme01") return "teal";
      if (bodyCourse === "wma12") return "mulberry";
      return "pure";
    }
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
@page elite-practice-page {
  size: A4 portrait;
  margin: 10mm;
}

@page elite-exam-page {
  size: A4 portrait;
  margin: 10mm;
}

@media print {
  html,
  body[data-print-palette] {
    width: 210mm !important;
    min-width: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
  }

  body[data-page="exam"][data-print-palette] .site-header,
  body[data-page="exam"][data-print-palette] .site-footer,
  body[data-page="exam"][data-print-palette] .mobile-bottom-nav,
  body[data-page="exam"][data-print-palette] .elite-breadcrumb,
  body[data-page="exam"][data-print-palette] .pathway-tool-strip,
  body[data-page="exam"][data-print-palette] .cloud-floating-widget,
  body[data-page="exam"][data-print-palette] .page > :not(#examPaper) {
    display: none !important;
  }

  body[data-print-palette] .print-paper-brand {
    box-sizing: border-box !important;
    display: flex !important;
    flex: 0 0 auto !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 8mm !important;
    min-height: 18mm !important;
    margin: 0 0 5mm !important;
    padding: 4mm 5mm !important;
    border: 0 !important;
    border-bottom: 1.2mm solid var(--course-signature, #1f5eff) !important;
    border-radius: 0 !important;
    background: var(--course-deep, #06162c) !important;
    color: #fff !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  body[data-print-palette] .print-brand-lockup {
    display: flex !important;
    align-items: center !important;
    gap: 3.5mm !important;
    min-width: 0 !important;
  }

  body[data-print-palette] .print-brand-mark {
    display: inline-grid !important;
    place-items: center !important;
    width: 11mm !important;
    height: 11mm !important;
    flex: 0 0 11mm !important;
    border: 0.25mm solid rgba(226, 184, 79, 0.75) !important;
    border-radius: 1mm !important;
    color: var(--course-highlight, #e2b84f) !important;
    font-family: Georgia, "Times New Roman", serif !important;
    font-size: 14pt !important;
    font-weight: 800 !important;
    line-height: 1 !important;
  }

  body[data-print-palette] .print-paper-brand strong {
    display: block !important;
    color: #fff !important;
    font-size: 12pt !important;
    line-height: 1.15 !important;
  }

  body[data-print-palette] .print-paper-brand small {
    display: block !important;
    margin-top: 1mm !important;
    color: var(--course-highlight, #e2b84f) !important;
    font-size: 7pt !important;
    font-weight: 800 !important;
    letter-spacing: 0.45pt !important;
    text-transform: uppercase !important;
  }

  body[data-print-palette] .print-brand-contact {
    max-width: 82mm !important;
    color: rgba(255, 255, 255, 0.86) !important;
    font-size: 7pt !important;
    line-height: 1.3 !important;
    text-align: right !important;
  }

  body[data-print-palette] .print-paper-footer {
    box-sizing: border-box !important;
    display: block !important;
    margin-top: auto !important;
    padding-top: 2.5mm !important;
    border-top: 0.25mm solid #ced8e5 !important;
    color: #5f6f84 !important;
    font-size: 7.5pt !important;
    line-height: 1.25 !important;
    text-align: center !important;
  }

  body[data-page="practice"][data-print-palette] .print-area {
    display: block !important;
    width: auto !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  body[data-page="practice"][data-print-palette] .print-question {
    page: elite-practice-page;
    box-sizing: border-box !important;
    display: flex !important;
    flex-direction: column !important;
    width: 190mm !important;
    min-height: 277mm !important;
    margin: 0 !important;
    padding: 0 !important;
    break-inside: avoid-page !important;
    page-break-inside: avoid !important;
    break-after: page !important;
    page-break-after: always !important;
    font-family: Arial, Helvetica, sans-serif !important;
  }

  body[data-page="practice"][data-print-palette] .print-question:last-child {
    break-after: auto !important;
    page-break-after: auto !important;
  }

  body[data-page="practice"][data-print-palette] .print-question h2 {
    margin: 0 0 4mm !important;
    padding: 0 0 3mm !important;
    border-bottom: 0.3mm solid #ced8e5 !important;
    color: var(--course-deep, #06162c) !important;
    font-size: 12pt !important;
    line-height: 1.28 !important;
  }

  body[data-page="practice"][data-print-palette] .print-question img {
    display: block !important;
    width: 100% !important;
    max-width: 100% !important;
    max-height: 218mm !important;
    object-fit: contain !important;
    object-position: top center !important;
    margin: 0 !important;
    padding: 4mm !important;
    border: 0.25mm solid #ced8e5 !important;
    border-left: 1mm solid var(--course-signature, #1f5eff) !important;
    background: #fff !important;
  }

  body[data-page="exam"][data-print-palette] .exam-paper {
    display: block !important;
    width: auto !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    box-shadow: none !important;
  }

  body[data-page="exam"][data-print-palette] .exam-question {
    page: elite-exam-page;
    box-sizing: border-box !important;
    display: flex !important;
    flex-direction: column !important;
    width: 190mm !important;
    min-height: 277mm !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    break-inside: avoid-page !important;
    page-break-inside: avoid !important;
    break-after: page !important;
    page-break-after: always !important;
    overflow: visible !important;
  }

  body[data-page="exam"][data-print-palette]:not(.print-solutions) .exam-question:last-of-type {
    break-after: auto !important;
    page-break-after: auto !important;
  }

  body[data-page="exam"][data-print-palette] .exam-question header {
    display: flex !important;
    flex: 0 0 auto !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 8mm !important;
    margin: 0 0 4mm !important;
    padding: 0 0 3mm !important;
    border: 0 !important;
    border-bottom: 0.3mm solid #ced8e5 !important;
    background: #fff !important;
  }

  body[data-page="exam"][data-print-palette] .exam-question header span {
    color: #5f6f84 !important;
    font-size: 8pt !important;
  }

  body[data-page="exam"][data-print-palette] .exam-question header strong {
    color: var(--course-deep, #06162c) !important;
    font-size: 12pt !important;
  }

  body[data-page="exam"][data-print-palette] .exam-question header em {
    padding: 1.5mm 3mm !important;
    border: 0.25mm solid var(--course-signature, #1f5eff) !important;
    border-radius: 1mm !important;
    background: var(--course-soft, #e8f3ff) !important;
    color: var(--course-deep, #06162c) !important;
    font-size: 10pt !important;
    font-style: normal !important;
  }

  body[data-page="exam"][data-print-palette] .exam-question > img {
    display: block !important;
    flex: 0 1 auto !important;
    width: 100% !important;
    max-height: 218mm !important;
    object-fit: contain !important;
    object-position: top center !important;
    margin: 0 !important;
    padding: 4mm 0 4mm 4mm !important;
    border: 0 !important;
    border-left: 1mm solid var(--course-signature, #1f5eff) !important;
    background: #fff !important;
  }

  body[data-page="exam"][data-print-palette] .exam-question footer,
  body[data-page="exam"][data-print-palette] .exam-question .exam-solution,
  body[data-page="exam"][data-print-palette]:not(.print-solutions) .exam-print-solution {
    display: none !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .exam-print-solution {
    page: elite-exam-page;
    box-sizing: border-box !important;
    display: flex !important;
    flex-direction: column !important;
    width: 190mm !important;
    min-height: 277mm !important;
    margin: 0 !important;
    padding: 0 0 4mm !important;
    border: 0 !important;
    border-left: 1mm solid var(--course-signature, #1f5eff) !important;
    break-before: page !important;
    page-break-before: always !important;
    break-after: page !important;
    page-break-after: always !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .exam-print-solution:last-of-type {
    break-after: auto !important;
    page-break-after: auto !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .print-solution-heading {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 8mm !important;
    margin: 0 0 4mm !important;
    padding: 5mm 6mm !important;
    background: var(--course-deep, #06162c) !important;
    color: #fff !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .print-solution-heading span {
    color: var(--course-highlight, #e2b84f) !important;
    font-size: 8pt !important;
    font-weight: 800 !important;
    text-transform: uppercase !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .print-solution-heading strong {
    color: #fff !important;
    font-size: 12pt !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .print-solution-heading em {
    color: #fff !important;
    font-size: 9pt !important;
    font-style: normal !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .exam-print-solution h3 {
    display: none !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .solution-step,
  body[data-page="exam"][data-print-palette].print-solutions .solution-final,
  body[data-page="exam"][data-print-palette].print-solutions .solution-empty {
    margin: 0 5mm 3mm !important;
    padding: 3.5mm 4mm !important;
    border-radius: 1mm !important;
    box-shadow: none !important;
    break-inside: avoid-page !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .solution-step {
    border-left-color: var(--course-signature, #1f5eff) !important;
    background: linear-gradient(90deg, var(--course-soft, #e8f3ff), #fff 44%) !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .solution-final {
    border-left-color: var(--final-answer, #c0392b) !important;
    background: linear-gradient(90deg, rgba(192, 57, 43, 0.12), #fff 48%) !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .solution-final > strong {
    color: var(--final-answer-deep, #8d2820) !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .exam-print-solution p,
  body[data-page="exam"][data-print-palette].print-solutions .exam-print-solution li {
    font-size: 9.5pt !important;
    line-height: 1.42 !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .print-worked-solution {
    margin: 0 5mm !important;
    border-top: 0.35mm solid #ced8e5 !important;
    border-bottom: 0.7mm solid var(--course-highlight, #e2b84f) !important;
    background: #fff !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .print-worked-steps {
    padding: 0 3mm !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .print-worked-step {
    display: grid !important;
    grid-template-columns: 7mm minmax(0, 1fr) !important;
    gap: 2.4mm !important;
    align-items: start !important;
    padding: 2.6mm 0 !important;
    border-bottom: 0.2mm solid #dce3ec !important;
    break-inside: avoid-page !important;
    page-break-inside: avoid !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .print-worked-step:last-child {
    border-bottom: 0 !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .print-worked-index {
    display: grid !important;
    place-items: center !important;
    width: 6.2mm !important;
    height: 6.2mm !important;
    border: 0.35mm solid color-mix(in srgb, var(--course-signature, #1f5eff) 46%, white) !important;
    border-radius: 50% !important;
    background: #fff !important;
    color: var(--course-deep, #06162c) !important;
    font-size: 6.8pt !important;
    font-weight: 900 !important;
    line-height: 1 !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .print-worked-step h4 {
    margin: 0 0 0.7mm !important;
    color: var(--course-deep, #06162c) !important;
    font-size: 8.8pt !important;
    line-height: 1.18 !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .print-worked-copy,
  body[data-page="exam"][data-print-palette].print-solutions .print-worked-final > div {
    min-width: 0 !important;
    color: #172033 !important;
    font-size: 8.7pt !important;
    line-height: 1.25 !important;
    overflow-wrap: anywhere !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .print-worked-copy p,
  body[data-page="exam"][data-print-palette].print-solutions .print-worked-final p {
    margin: 0 0 0.8mm !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .print-worked-copy p:last-child,
  body[data-page="exam"][data-print-palette].print-solutions .print-worked-final p:last-child {
    margin-bottom: 0 !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .print-worked-copy ul,
  body[data-page="exam"][data-print-palette].print-solutions .print-worked-final ul {
    margin: 0.6mm 0 0 !important;
    padding-left: 5mm !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .print-worked-copy .worked-solution-equation,
  body[data-page="exam"][data-print-palette].print-solutions .print-worked-final .worked-solution-equation {
    margin: 0.7mm 0 !important;
    padding: 1mm 1.8mm !important;
    border-left: 0.7mm solid var(--course-signature, #1f5eff) !important;
    background: #f5f8fc !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .print-worked-copy mjx-container[display="true"],
  body[data-page="exam"][data-print-palette].print-solutions .print-worked-final mjx-container[display="true"] {
    margin: 0.16em 0 !important;
    padding: 0 !important;
    overflow: visible !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .print-worked-final {
    display: grid !important;
    grid-template-columns: 28mm minmax(0, 1fr) !important;
    gap: 3mm !important;
    align-items: center !important;
    padding: 2.5mm 3mm !important;
    border-top: 0.3mm solid #e4c98d !important;
    background: linear-gradient(90deg, rgba(226, 184, 79, 0.2), #fff 58%) !important;
    break-inside: avoid-page !important;
    page-break-inside: avoid !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .print-worked-final > strong {
    color: var(--final-answer-deep, #8d2820) !important;
    font-size: 8pt !important;
    font-weight: 900 !important;
    text-transform: uppercase !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .exam-print-solution.is-dense .print-worked-solution {
    margin-inline: 3.5mm !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .exam-print-solution.is-dense .print-worked-steps {
    padding-inline: 2.2mm !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .exam-print-solution.is-dense .print-worked-step {
    grid-template-columns: 5.7mm minmax(0, 1fr) !important;
    gap: 1.7mm !important;
    padding: 1.35mm 0 !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .exam-print-solution.is-dense .print-worked-index {
    width: 5.2mm !important;
    height: 5.2mm !important;
    font-size: 6pt !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .exam-print-solution.is-dense .print-worked-step h4,
  body[data-page="exam"][data-print-palette].print-solutions .exam-print-solution.is-dense .print-worked-copy,
  body[data-page="exam"][data-print-palette].print-solutions .exam-print-solution.is-dense .print-worked-final > div {
    font-size: 8pt !important;
    line-height: 1.18 !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .exam-print-solution.is-dense .print-worked-final {
    padding: 1.6mm 2.2mm !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .exam-print-solution .worked-solution {
    margin: 0 5mm !important;
    border: 0.25mm solid #ced8e5 !important;
    border-radius: 1mm !important;
    box-shadow: none !important;
    overflow: visible !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .exam-print-solution .worked-solution-head {
    min-height: 0 !important;
    padding: 2.4mm 3mm !important;
    border-bottom-width: 0.7mm !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .exam-print-solution .worked-solution-head > div:first-child strong {
    font-size: 10pt !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .exam-print-solution .worked-solution-meta span {
    min-height: 0 !important;
    padding: 0.8mm 1.8mm !important;
    font-size: 7pt !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .exam-print-solution .worked-solution-steps {
    padding: 0 3mm !important;
    background: #fff !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .exam-print-solution .worked-solution-step {
    grid-template-columns: 7mm minmax(0, 1fr) !important;
    gap: 2.2mm !important;
    padding: 2.6mm 0 !important;
    break-inside: avoid-page !important;
    page-break-inside: avoid !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .exam-print-solution .worked-solution-step::before {
    left: 3.2mm !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .exam-print-solution .worked-solution-index {
    width: 6.5mm !important;
    height: 6.5mm !important;
    font-size: 7pt !important;
    box-shadow: none !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .exam-print-solution .worked-solution-step h4 {
    margin: 0 0 1mm !important;
    font-size: 8.8pt !important;
    line-height: 1.18 !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .exam-print-solution .worked-solution-copy,
  body[data-page="exam"][data-print-palette].print-solutions .exam-print-solution .worked-solution-final-copy {
    font-size: 8.8pt !important;
    line-height: 1.28 !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .exam-print-solution .worked-solution-copy p,
  body[data-page="exam"][data-print-palette].print-solutions .exam-print-solution .worked-solution-final-copy p {
    margin: 0 0 1.2mm !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .exam-print-solution .worked-solution-equation {
    margin: 1mm 0 !important;
    padding: 1.5mm 2mm !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .exam-print-solution .worked-solution-copy mjx-container[display="true"],
  body[data-page="exam"][data-print-palette].print-solutions .exam-print-solution .worked-solution-final-copy mjx-container[display="true"] {
    margin: 0.25em 0 !important;
    padding: 0 !important;
    overflow: visible !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .exam-print-solution .worked-solution-final {
    grid-template-columns: 28mm minmax(0, 1fr) !important;
    gap: 2.5mm !important;
    padding: 2.6mm 3mm !important;
    border-bottom-width: 0.7mm !important;
    break-inside: avoid-page !important;
    page-break-inside: avoid !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .exam-print-solution .worked-solution-final-label {
    gap: 1.5mm !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .exam-print-solution .worked-solution-final-label > span {
    width: 6mm !important;
    height: 6mm !important;
    flex-basis: 6mm !important;
    font-size: 8pt !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .exam-print-solution.is-dense .print-solution-heading {
    margin-bottom: 2mm !important;
    padding: 3.2mm 4mm !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .exam-print-solution.is-dense .worked-solution {
    margin-inline: 3.5mm !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .exam-print-solution.is-dense .worked-solution-head {
    padding: 1.8mm 2.5mm !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .exam-print-solution.is-dense .worked-solution-step {
    grid-template-columns: 6mm minmax(0, 1fr) !important;
    gap: 1.8mm !important;
    padding: 1.7mm 0 !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .exam-print-solution.is-dense .worked-solution-step::before {
    left: 2.7mm !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .exam-print-solution.is-dense .worked-solution-index {
    width: 5.5mm !important;
    height: 5.5mm !important;
    font-size: 6.5pt !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .exam-print-solution.is-dense .worked-solution-step h4,
  body[data-page="exam"][data-print-palette].print-solutions .exam-print-solution.is-dense .worked-solution-copy,
  body[data-page="exam"][data-print-palette].print-solutions .exam-print-solution.is-dense .worked-solution-final-copy {
    font-size: 8.1pt !important;
    line-height: 1.2 !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .exam-print-solution.is-dense .worked-solution-final {
    padding: 1.8mm 2.5mm !important;
  }

  body[data-page="exam"][data-print-palette].print-solutions .print-solution-footer {
    margin: auto 5mm 0 !important;
  }
}
`;
  }

  function applyPrintPalette(targetDocument = document) {
    const body = targetDocument.body;
    if (!body) return;
    const palette = resolvePrintPalette();
    body.dataset.coursePalette = palette.key;
    if (["linear", "modular", "pure"].includes(palette.key)) {
      body.dataset.pathway = palette.key;
    } else if (!body.dataset.pathway) {
      body.dataset.pathway = "pure";
    }
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
      trigger.setAttribute("aria-busy", "true");
      trigger.textContent = "Preparing print...";
    }
    document.body?.classList.add("elite-printing");
    try {
      applyPrintPalette();
      await waitForPrintableAssets(root);
      window.print();
    } finally {
      document.body?.classList.remove("elite-printing");
      if (trigger) {
        trigger.disabled = false;
        trigger.removeAttribute("aria-busy");
        trigger.textContent = originalLabel;
      }
    }
  }

  window.ElitePrint = {
    applyPrintPalette,
    resolvePrintPalette,
    printWhenReady,
    waitForMathTypesetting,
    waitForPrintableAssets
  };
})();
