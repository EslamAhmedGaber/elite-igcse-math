/* ==========================================================================
   paper-print.js - Elite Mathematics A4 paper engine
   One print path for every course (Linear, Modular, WMA11, WMA12, WMA13,
   WME01, Baccalaureate) and every entry point (Random Mock, Build Test,
   Revision Book, Saved Tests, Classified selection, course hubs).

   Every paper is printed in the Elite exam-paper design: an International
   GCSE / IAL style cover (candidate boxes, instructions, paper reference),
   the official formulae sheet where the real paper has one, "DO NOT WRITE IN
   THIS AREA" margins, and the paper's test code at the foot of every page.

   How it works
   1. The paper is rendered inside an isolated iframe that loads ONLY
      paper-print.css. Screen stylesheets never reach the printed page.
   2. Every block (question image, working space, total line, solution step)
      is measured at the exact A4 content width, then packed into fixed
      210 x 297 mm sheets. Nothing depends on the browser's page-break guesses.
   3. Question crops come from real papers, so each one still shows its
      original number and "(Total for Question n is m marks)". The pixels are
      read to find both; the old number is covered with the mock's own number
      and the old total line is replaced by a new one, so the paper reads
      1, 2, 3 ... like a real script. Working space goes above the answer line.
   4. Question images taller than the space left are cut at a blank row found
      by scanning the pixels, so a line of text, an equation or a diagram is
      never sliced. Leftover space on a sheet becomes extra working space.
   5. Print uses the prepared frame. Download PDF renders those same sheets
      one at a time, independently of the browser's print-preview service.
   ========================================================================== */
(function (root) {
  "use strict";

  const VERSION = "20261104a";
  const MM = 96 / 25.4;
  const SCRIPT_SRC = document.currentScript?.src || "";
  const assetUrl = (name) => new URL(`${name}?v=${VERSION}`, SCRIPT_SRC || document.baseURI).href;
  const DOC_CSS = assetUrl("paper-print.css");
  const STUDIO_CSS = assetUrl("paper-studio.css");
  const FONT_CSS = "https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap";
  const MATHJAX_URL = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js";
  const IMAGE_TIMEOUT_MS = 45000;
  /* Slow connections: never give up while images are still arriving. The paper
     fails only when no image has finished for this long (after one retry each). */
  const IMAGE_STALL_MS = 30000;
  const FONT_TIMEOUT_MS = 5000;
  const MATH_TIMEOUT_MS = 25000;
  const SAFETY_PX = 2 * MM;
  /* Past-paper crops are shown at about their original printed size (95% of
     the 166 mm column between the "do not write" margins), not blown up. */
  const IMAGE_SCALE = 0.95;
  const RULE_PITCH_MM = 8;
  const FORMULAE_IMAGE = assetUrl("assets/print/igcse-formulae-higher.png");
  const BRAND = { name: "Elite IGCSE Academy", author: "Dr Eslam Ahmed", phone: "01120009622", site: "eliteigcse.com" };

  /* What the cover says for each course (matched on the spec's course code). */
  const COURSES = [
    { test: /^4MA1/i, family: "igcse", level: "International GCSE", subject: "Mathematics A", route: "LINEAR · 4MA1", tier: "Higher Tier", calculator: true, formulae: "igcse" },
    { test: /^4WM/i, family: "igcse", level: "International GCSE", subject: "Mathematics A", route: "MODULAR", tier: "Higher Tier", calculator: true, formulae: "igcse" },
    { test: /^WMA11/i, family: "ial", level: "International Advanced Level", subject: "Pure Mathematics P1", route: "WMA11", calculator: false },
    { test: /^WMA12/i, family: "ial", level: "International Advanced Level", subject: "Pure Mathematics P2", route: "WMA12", calculator: true },
    { test: /^WMA13/i, family: "ial", level: "International Advanced Level", subject: "Pure Mathematics P3", route: "WMA13", calculator: true },
    { test: /^WME01/i, family: "ial", level: "International Advanced Level", subject: "Mechanics M1", route: "WME01", calculator: true },
    { test: /^EB/i, family: "other", level: "Egyptian Baccalaureate", subject: "Mathematics", route: "", calculator: true }
  ];
  const DEFAULT_COURSE = { family: "other", level: "Mathematics", subject: "Mathematics", route: "", calculator: true };
  const DEFAULT_HINT = "A4 portrait, 210 x 297 mm. Download PDF saves directly. For Print, use 100% scale and turn off browser headers and footers.";

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  /* Working-space rules, in millimetres, as a function of question marks. */
  const LAYOUTS = {
    standard: { label: "Standard", space: (marks) => clamp(8 + 6 * marks, 18, 56), fill: true, gap: 5 },
    economy: { label: "Economy (fewer pages)", space: (marks) => clamp(3 + 3 * marks, 8, 26), fill: true, gap: 3.4 },
    single: { label: "One question per page", space: () => 40, fill: true, gap: 0, newPage: true },
    compact: { label: "Questions only (answer on separate paper)", space: () => 0, fill: false, gap: 3.4 }
  };

  const DEFAULT_OPTIONS = Object.freeze({
    version: "student",
    placement: "end",
    layout: "standard",
    ink: "colour",
    lines: false
  });

  /* ---------------------------------------------------------------- utils */

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    }[char]));
  }

  function plural(count, word) {
    return `${count} ${word}${Number(count) === 1 ? "" : "s"}`;
  }

  function slug(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 60);
  }

  function withTimeout(promise, ms, fallback) {
    return Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(fallback), ms))]);
  }

  function fallbackFormat(text) {
    const escaped = escapeHtml(text).trim();
    if (!escaped) return "";
    return escaped.split(/\n{2,}/).map((block) => `<p>${block.replace(/\n/g, "<br>")}</p>`).join("");
  }

  function formatText(text) {
    if (root.EliteSolutionView?.formatText) return root.EliteSolutionView.formatText(text, { empty: "" });
    return fallbackFormat(text);
  }

  function solutionParts(solution) {
    if (!solution) return { steps: [], finalAnswer: "" };
    const steps = Array.isArray(solution.steps)
      ? solution.steps.filter((step) => step && (step.title || step.body))
      : solution.source ? [{ title: "Working", body: solution.source }] : [];
    return { steps, finalAnswer: solution.finalAnswer || "" };
  }

  function hasSolution(solution) {
    const parts = solutionParts(solution);
    return parts.steps.length > 0 || Boolean(parts.finalAnswer);
  }

  function nextFrame(win) {
    return new Promise((resolve) => win.requestAnimationFrame(() => win.requestAnimationFrame(resolve)));
  }

  /* ---------------------------------------------------------- the document */

  // A spec may name its own copy (e.g. "Answer key"); otherwise student or solutions copy.
  function copyLabel(opts, spec = {}) {
    if (spec.copyLabel) return spec.copyLabel;
    return opts.version === "solutions" ? "With worked solutions" : "Student copy";
  }

  function courseFor(spec) {
    const code = String(spec.courseCode || "");
    const found = COURSES.find((course) => course.test.test(code)) || DEFAULT_COURSE;
    const unit = (String(spec.courseLabel || "").match(/Unit\s*\d+/i) || [""])[0].replace(/\s+/, " ");
    return { ...found, unit };
  }

  function hashCode(text) {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36).toUpperCase().padStart(6, "0").slice(-6);
  }

  // Every printed paper carries a code at the foot of each page. Generated
  // tests use their own test code; other prints get one from their questions.
  function paperCode(spec) {
    if (spec.testCode) return String(spec.testCode).toUpperCase();
    const ids = (spec.questions || []).map((item) => item.id || item.image || "").join("|");
    return `${String(spec.courseCode || "ELT").toUpperCase()}-${hashCode(ids)}`;
  }

  function totalMarksOf(spec) {
    return spec.questions.reduce((sum, item) => sum + Number(item.marks || 0), 0);
  }

  function durationText(minutes) {
    const total = Math.round(Number(minutes) || 0);
    if (!total) return "";
    const hours = Math.floor(total / 60);
    const mins = total % 60;
    return [hours ? plural(hours, "hour") : "", mins ? plural(mins, "minute") : ""].filter(Boolean).join(" ");
  }

  const WORDS = ["ZERO", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN", "ELEVEN", "TWELVE",
    "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"];
  const TENS = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];
  function numberWords(n) {
    if (n < 20) return WORDS[n];
    if (n < 100) return `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${WORDS[n % 10]}` : ""}`;
    return String(n);
  }

  function totalLineText(number, marks) {
    return `(Total for Question ${number} is ${plural(marks, "mark")})`;
  }

  function logoHtml(extra = "") {
    return `<span class="ig-logo${extra ? ` ${extra}` : ""}" aria-hidden="true"><b>E</b></span>`;
  }

  // A decorative bar code made from the test code, like the one on a real script.
  function barcodeHtml(code) {
    let seed = parseInt(hashCode(code), 36) || 7;
    const bars = [];
    for (let i = 0; i < 30; i += 1) {
      seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
      const width = [0.22, 0.45, 0.7, 0.22, 0.95][seed % 5];
      const gap = [0.28, 0.45, 0.7][(seed >>> 9) % 3];
      bars.push(`<i style="width:${width}mm;margin-right:${gap}mm"></i>`);
    }
    return `<span class="ig-barcode"><span class="ig-bars">${bars.join("")}</span><em>*${escapeHtml(code)}*</em></span>`;
  }

  function calculatorHtml(allowed) {
    const keys = [];
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 4; col += 1) keys.push(`<rect x="${5 + col * 7.5}" y="${19 + row * 6.2}" width="5.6" height="4.2" rx="0.8"/>`);
    }
    const cross = allowed ? "" : `<path d="M2 2 L38 46 M38 2 L2 46" stroke="#b3261e" stroke-width="3" stroke-linecap="round"/>`;
    return `<div class="cv-calc"><svg viewBox="0 0 40 48" width="40" height="48" aria-hidden="true">
      <rect x="1.5" y="1.5" width="37" height="45" rx="3" fill="#ffffff" stroke="#3c4250" stroke-width="2"/>
      <rect x="5" y="5.5" width="30" height="9" rx="1" fill="#d9dee6" stroke="#3c4250" stroke-width="1.2"/>
      <g fill="#3c4250">${keys.join("")}</g>${cross}</svg>
      <small>${allowed ? "Calculator allowed" : "No calculator"}</small></div>`;
  }

  function coverLists(info, spec, opts, total, withFormulae) {
    const count = spec.questions.length;
    const calc = info.calculator;
    if (info.family === "ial") {
      return {
        mustHave: `Mathematical Formulae and Statistical Tables (Yellow)${calc ? ", calculator" : ""}.`,
        instructions: [
          "Use <b>black</b> ink or ball-point pen.",
          "If pencil is used for diagrams/sketches/graphs it must be dark (HB or B).",
          "<b>Fill in the boxes</b> at the top of this page with your name, group and candidate number.",
          "Answer <b>all</b> questions and ensure that your answers to parts of questions are clearly labelled.",
          "Answer the questions in the spaces provided &ndash; <i>there may be more space than you need.</i>",
          "You should show sufficient working to make your methods clear. Answers without working may not gain full credit.",
          calc ? "Inexact answers should be given to three significant figures unless otherwise stated." : "<b>Calculators must not be used</b> for this paper."
        ],
        information: [
          "A booklet &lsquo;Mathematical Formulae and Statistical Tables&rsquo; is provided.",
          `There are <b>${count}</b> questions in this paper. The total mark for this paper is <b>${total}</b>.`,
          "The marks for <b>each</b> question are shown in brackets &ndash; <i>use this as a guide as to how much time to spend on each question.</i>"
        ],
        advice: ["Read each question carefully before you start to answer it.", "Try to answer every question.", "Check your answers if you have time at the end."]
      };
    }
    return {
      mustHave: info.family === "igcse"
        ? "Ruler graduated in centimetres and millimetres, protractor, pair of compasses, pen, HB pencil, eraser, calculator. Tracing paper may be used."
        : `Pen, pencil, ruler, eraser${calc ? ", calculator" : ""}.`,
      instructions: [
        "Use <b>black</b> ink or ball-point pen.",
        "<b>Fill in the boxes</b> at the top of this page with your name, group and candidate number.",
        "Answer <b>all</b> questions.",
        "Without sufficient working, correct answers may be awarded no marks.",
        "Answer the questions in the spaces provided &ndash; <i>there may be more space than you need.</i>",
        calc ? "<b>Calculators may be used.</b>" : "<b>Calculators must not be used.</b>",
        withFormulae ? "You must <b>NOT</b> write anything on the formulae page. Anything you write on the formulae page will gain <b>NO</b> credit." : ""
      ].filter(Boolean),
      information: [
        `The total mark for this paper is <b>${total}</b>.`,
        `There are <b>${count}</b> questions in this paper.`,
        "The marks for <b>each</b> question are shown in brackets &ndash; <i>use this as a guide as to how much time to spend on each question.</i>"
      ],
      advice: ["Read each question carefully before you start to answer it.", "Check your answers if you have time at the end."]
    };
  }

  function coverHtml(spec, opts, ctx) {
    const { info, code, total, withFormulae } = ctx;
    const lists = coverLists(info, spec, opts, total, withFormulae);
    const listHtml = (items) => `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
    const route = [info.route, info.unit ? info.unit.toUpperCase() : ""].filter(Boolean).join(" · ");
    const time = durationText(spec.durationMinutes);
    const solutionsCopy = opts.version === "solutions";
    const boxes = (n) => `<span class="cv-cells">${"<i></i>".repeat(n)}</span>`;
    return `<section class="sheet is-cover">
      <p class="cv-check">Please check the examination details below before entering your candidate information</p>
      <div class="cv-cand"><div class="cv-field is-wide"><span>Candidate surname</span></div><div class="cv-field"><span>Other names</span></div></div>
      <div class="cv-nums"><div><span>Group</span>${boxes(4)}</div><div><span>Candidate Number</span>${boxes(4)}</div></div>
      <div class="cv-brandline"><strong>${BRAND.name}</strong><i aria-hidden="true"></i><span>${escapeHtml(info.level)}</span></div>
      <div class="cv-title"><strong>${escapeHtml(spec.title || "Mathematics Test")}</strong><span>${escapeHtml(new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" }))}</span></div>
      <div class="cv-timeref">
        <div class="cv-time">${time ? `Time <b>${escapeHtml(time)}</b>` : ""}</div>
        <div class="cv-ref"><span>Paper<br>reference</span><b>${escapeHtml(code)}</b></div>
      </div>
      <div class="cv-main">
        <div><h1>${escapeHtml(info.subject)}</h1>${route ? `<p class="cv-route">${escapeHtml(route)}</p>` : ""}<p class="cv-tier">${[info.tier, `<em>${escapeHtml(spec.title || "")}</em>`].filter(Boolean).join(" · ")}</p></div>
        ${calculatorHtml(info.calculator)}
      </div>
      <div class="cv-have"><div class="cv-must"><b>You must have:</b> ${lists.mustHave}</div><div class="cv-total"><span>Total Marks</span></div></div>
      ${solutionsCopy ? `<div class="cv-copy">${escapeHtml(copyLabel(opts, spec))} &middot; ${opts.placement === "inline" ? "each worked solution follows its question" : "worked solutions follow the questions"}</div>` : ""}
      <div class="cv-lists">
        <h3>Instructions</h3>${listHtml(lists.instructions)}
        <h3>Information</h3>${listHtml(lists.information)}
        <h3>Advice</h3>${listHtml(lists.advice)}
      </div>
      <div class="cv-foot">
        <div class="cv-code"><b>${escapeHtml(code)}</b><small>&copy;${new Date().getFullYear()} ${BRAND.name}</small><small>Written by ${BRAND.author}. All rights reserved.</small></div>
        <div class="cv-contact"><b>${BRAND.author}</b><span>Tel. ${BRAND.phone}</span><b>${BRAND.site}</b></div>
        <div class="cv-mark"><span class="cv-turn">Turn over &#9658;</span>${logoHtml("is-big")}<span>ELITE IGCSE ACADEMY</span></div>
      </div>
    </section>`;
  }

  /* Margins, registration marks, bar code and the code line at the top of every inner page. */
  function furnitureHtml(spec, ctx) {
    const strip = (side) => `<div class="ig-strip is-${side}" aria-hidden="true"><span style="top:20%">DO NOT WRITE IN THIS AREA</span><span style="top:50%">DO NOT WRITE IN THIS AREA</span><span style="top:80%">DO NOT WRITE IN THIS AREA</span></div>`;
    const meta = [ctx.code, [ctx.info.route === "MODULAR" ? "Modular" : ctx.info.route, ctx.info.unit].filter(Boolean).join(" "), spec.title].filter(Boolean).map(escapeHtml).join(" &middot; ");
    return `${strip("left")}${strip("right")}<i class="ig-reg is-top" aria-hidden="true"></i><i class="ig-reg is-bottom" aria-hidden="true"></i>
      <div class="ig-head"><span class="ig-head-meta">${meta}</span>${barcodeHtml(ctx.code)}</div>`;
  }

  function footHtml(ctx) {
    return `<div class="ig-turn">Turn over &#9658;</div>
      <div class="sheet-foot"><span class="foot-code"><b>${escapeHtml(ctx.code)}</b><span class="foot-mid"></span></span><span class="foot-brand">${logoHtml()}<b>${BRAND.name}</b> &middot; ${BRAND.author} &middot; ${BRAND.site}</span><span class="foot-page"></span></div>`;
  }

  /* First page of a print without a cover (practice sheets, answer keys). */
  function slimHeadHtml(spec, opts, ctx) {
    const instructions = spec.instructions || (opts.layout === "compact"
      ? "Answer every question on separate paper. Show clear working."
      : "Answer every question in the space provided. Show clear working.");
    return `<header class="ig-slim">
      <div class="ig-slim-brand">${logoHtml()}<strong>${BRAND.name}</strong><i aria-hidden="true"></i><span>${escapeHtml(ctx.info.level)}</span><em class="ig-copy">${escapeHtml(copyLabel(opts, spec))}</em></div>
      <h1>${escapeHtml(spec.title || "Mathematics")}</h1>
      <p class="ig-slim-course">${escapeHtml(spec.courseLabel || ctx.info.subject)}</p>
      <div class="ig-slim-row"><span>Name</span><span>Date</span><span class="is-score">Score <em>/ ${ctx.total}</em></span></div>
      <p class="ig-slim-note">${escapeHtml(instructions)}</p>
    </header>`;
  }

  function documentHtml(spec, opts) {
    const classes = ["ig-paper", opts.ink === "mono" ? "mono" : "", opts.lines ? "" : "plain-space"].filter(Boolean).join(" ");
    const title = spec.fileName || "Elite Mathematics paper";
    return `<!doctype html><html lang="en" class="${classes}"><head><meta charset="utf-8">
<base href="${escapeHtml(spec.baseHref || document.baseURI)}">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="${FONT_CSS}">
<link rel="stylesheet" href="${DOC_CSS}">
</head><body><div class="sheets" id="sheets"></div><div class="measure" id="measure" aria-hidden="true"></div></body></html>`;
  }

  /* A question without an image (text questions, answer keys). */
  function questionTextHtml(item) {
    const options = Array.isArray(item.options) && item.options.length
      ? `<ol type="A">${item.options.map((option) => `<li>${formatText(String(option))}</li>`).join("")}</ol>`
      : "";
    return `<div class="blk q-text"><span class="q-num ig-num">${item.number}</span><div class="q-text-body">${formatText(item.text || "")}${options}</div></div>`;
  }

  function totalLineHtml(item, style = "") {
    const marks = Number(item.marks || 0);
    return `<div class="blk ig-total" data-number="${item.number}" data-marks="${marks}"${style ? ` style="${style}"` : ""}><span class="q-marks">${escapeHtml(totalLineText(item.number, marks))}</span></div>`;
  }

  function formatSolutionText(text) {
    // Successive equations in legacy solutions are separate working lines.
    return formatText(text).replace(/\\\)\s+\\\(/g, "\\)<br>\\(");
  }

  function solutionBlocksHtml(item) {
    const parts = solutionParts(item.solution);
    const head = `<div class="blk s-head" data-role="s-head"><strong>Solution ${item.number}</strong><span>${escapeHtml([item.sourceRef, plural(Number(item.marks || 0), "mark")].filter(Boolean).join(" · "))}</span></div>`;
    if (!hasSolution(item.solution)) {
      return `${head}<div class="blk s-empty" data-role="s-unit">A worked solution for this question is not available yet.</div>`;
    }
    const steps = parts.steps.map((step, index) => `<div class="blk s-step" data-role="s-unit">
        <span class="s-index">${String(index + 1).padStart(2, "0")}</span>
        <div class="s-body">${step.title ? `<h4>${escapeHtml(step.title)}</h4>` : ""}<div class="s-copy">${formatSolutionText(step.body || "")}${root.EliteSolutionView?.renderFigures?.(step) || ""}</div></div>
      </div>`).join("");
    const final = parts.finalAnswer
      ? `<div class="blk s-final" data-role="s-unit"><strong>Final answer</strong><div class="s-copy">${formatText(parts.finalAnswer)}</div></div>`
      : "";
    return `${head}${steps}${final}`;
  }

  /* ------------------------------------------------------- image analysis */

  function requireWithin(promise, ms, message) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(message)), ms);
      Promise.resolve(promise).then(resolve, reject).finally(() => clearTimeout(timer));
    });
  }

  async function requireImage(img) {
    await new Promise((resolve, reject) => {
      const finish = (error) => {
        clearTimeout(timer);
        img.removeEventListener("load", loaded);
        img.removeEventListener("error", failed);
        if (error) reject(error); else resolve();
      };
      const loaded = () => finish(img.naturalWidth > 0 ? null : new Error("A question image is empty."));
      const failed = () => finish(new Error("A question image could not load. Printing is paused to avoid an incomplete paper."));
      const timer = setTimeout(() => finish(new Error("A question image is still loading. Printing is paused; please retry.")), IMAGE_TIMEOUT_MS);
      img.addEventListener("load", loaded);
      img.addEventListener("error", failed);
      if (img.complete) loaded();
    });
    // Loaded is enough to print; decode() can stall in a background tab, so wait for it briefly only.
    if (img.decode) await Promise.race([img.decode().catch(() => {}), new Promise((resolve) => setTimeout(resolve, 4000))]);
  }

  function fetchImage(doc, src, retry) {
    return new Promise((resolve, reject) => {
      const img = doc.createElement("img");
      img.decoding = "sync";
      img.loading = "eager";
      img.alt = "";
      img.onload = () => (img.naturalWidth > 0 ? resolve(img) : reject(new Error("A question image is empty.")));
      img.onerror = () => reject(new Error("A question image could not load. Check the connection and try again."));
      img.src = retry ? `${src}${src.includes("?") ? "&" : "?"}retry=${Date.now()}` : src;
    });
  }

  /* Loads every question image in parallel, reports progress, retries a failed
     image once, and only gives up when loading has stalled. */
  async function loadQuestionImages(doc, srcs, onProgress = () => {}) {
    const total = srcs.filter(Boolean).length;
    let done = 0;
    let lastProgress = Date.now();
    let stallTimer = 0;
    onProgress(0, total);
    const stalled = new Promise((_, reject) => {
      const check = () => {
        if (Date.now() - lastProgress > IMAGE_STALL_MS) reject(new Error("The question images stopped loading. Check the connection and try again."));
        else stallTimer = setTimeout(check, 1000);
      };
      stallTimer = setTimeout(check, 1000);
    });
    const jobs = srcs.map(async (src) => {
      if (!src) return null;
      const img = await fetchImage(doc, src, false).catch(() => fetchImage(doc, src, true));
      done += 1;
      lastProgress = Date.now();
      onProgress(done, total);
      // A hidden tab may never finish decode(); the pixels are readable once loaded anyway.
      if (img.decode) await Promise.race([img.decode().catch(() => {}), new Promise((resolve) => setTimeout(resolve, 4000))]);
      return img;
    });
    try {
      return await Promise.race([Promise.all(jobs), stalled]);
    } finally {
      clearTimeout(stallTimer);
    }
  }

  /* Warm the browser cache as soon as a paper exists, so the print window opens fast. */
  const prefetched = new Set();
  function prefetch(srcs = []) {
    srcs.filter((src) => src && !prefetched.has(src)).forEach((src) => {
      prefetched.add(src);
      const img = new Image();
      img.decoding = "async";
      img.src = src;
    });
  }

  /* Row-by-row ink count, plus the crop analysis below. Returns null when
     pixels cannot be read. */
  function inkProfile(doc, img, hint = null) {
    const width = img.naturalWidth;
    const height = img.naturalHeight;
    if (!width || !height) return null;
    try {
      const canvas = doc.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.fillStyle = "#fff";
      context.fillRect(0, 0, width, height);
      context.drawImage(img, 0, 0);
      const data = context.getImageData(0, 0, width, height).data;
      const rows = new Uint32Array(height);
      const ink = new Uint8Array(width * height);
      for (let y = 0; y < height; y += 1) {
        let count = 0;
        const offset = y * width;
        for (let x = 0; x < width; x += 1) {
          const i = (offset + x) * 4;
          if (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114 < 228) {
            ink[offset + x] = 1;
            if ((x & 1) === 0) count += 2;
          }
        }
        rows[y] = count;
      }
      canvas.width = canvas.height = 0;
      // Vertical page rules put a few dark pixels on every row; treat that
      // floor as "blank" but count even pale dotted answer lines as ink.
      const sorted = Array.from(rows).sort((a, b) => a - b);
      const floor = sorted[Math.floor(sorted.length * 0.1)] || 0;
      let crop = null;
      try {
        crop = analyseCrop(ink, width, height, hint);
      } catch (error) {
        crop = null;
      }
      return { rows, width, height, blankLimit: floor + Math.max(3, Math.round(width * 0.003)), crop };
    } catch (error) {
      return null;
    }
  }

  /* Runs of true values in 0..length-1; runs closer than minGap are merged. */
  function runsOf(test, length, minGap) {
    const out = [];
    let start = -1;
    let prev = -1;
    for (let i = 0; i < length; i += 1) {
      if (!test(i)) continue;
      if (start < 0) {
        start = i;
      } else if (i - prev > minGap) {
        out.push([start, prev + 1]);
        start = i;
      }
      prev = i;
    }
    if (start >= 0) out.push([start, prev + 1]);
    return out;
  }

  /* What the question text (from the paper's text layer) says about the crop. */
  function cropHint(item) {
    const text = String(item.ocr || "").trim();
    if (!text) return null;
    const lead = /^\s*(\d{1,2})\b/.exec(text);
    const source = Number(item.sourceNumber || 0);
    return {
      // A different leading number vetoes; no leading number means "unknown".
      number: lead ? (!source || Number(lead[1]) === source) : null,
      header: /^\s*(Answer\s+ALL|\(?\s*Total\s+for\s+Question)/i.test(text),
      total: /Total\s+for\s+Question\s+\d+\s+is\s+\d+\s+marks?/i.test(text.slice(-90))
    };
  }

  /* Finds, in a past-paper crop, the original question number (top left),
     the "(Total for Question n is m marks)" line (bottom right, plus a paper
     total under it on a last question), the answer-line block above it, and
     any header or stray total line above the number. Calibrated on all
     1,733 IGCSE crops against their text layer. */
  function analyseCrop(ink, W, H, hint) {
    const colCount = new Uint32Array(W);
    for (let y = 0; y < H; y += 1) {
      const o = y * W;
      for (let x = 0; x < W; x += 1) colCount[x] += ink[o + x];
    }
    const border = new Uint8Array(W);
    for (let x = 0; x < W; x += 1) border[x] = colCount[x] > 0.5 * H ? 1 : 0;
    const rows = new Float64Array(H);
    const full = new Uint32Array(H);
    for (let y = 0; y < H; y += 1) {
      const o = y * W;
      let half = 0;
      let all = 0;
      for (let x = 0; x < W; x += 1) {
        if (ink[o + x] && !border[x]) {
          all += 1;
          if ((x & 1) === 0) half += 1;
        }
      }
      rows[y] = half * 2;
      full[y] = all;
    }
    const sorted = Array.from(rows).sort((a, b) => a - b);
    const blank = sorted[Math.floor(H * 0.1)] + Math.max(3, Math.round(W * 0.003));
    const lines = runsOf((y) => rows[y] > blank && full[y] <= 0.55 * W, H, Math.max(2, Math.round(W * 0.004)));
    const edge = 0.012 * W;
    const thin = Math.max(2, 0.003 * W);
    const band = (y0, y1) => {
      const c = new Uint32Array(W);
      for (let y = y0; y < y1; y += 1) {
        const o = y * W;
        for (let x = 0; x < W; x += 1) if (ink[o + x] && !border[x]) c[x] += 1;
      }
      const clusters = runsOf((x) => c[x] > 0, W, Math.max(3, Math.round(W * 0.012)))
        .filter(([a, b]) => !((a <= 1 || b >= W - 1) && b - a < edge) && b - a > thin);
      if (!clusters.length) return null;
      const x0 = clusters[0][0];
      const x1 = clusters[clusters.length - 1][1];
      let sum = 0;
      for (let x = x0; x < x1; x += 1) sum += c[x];
      return { y0, y1, x0, x1, h: y1 - y0, dens: sum / Math.max(1, (y1 - y0) * (x1 - x0)), c };
    };
    const bands = lines.map(([a, b]) => band(a, b)).filter(Boolean);
    const result = { number: null, totals: [], answerTop: null, topCut: null, first: null, inkRight: 0, inkLeft: W };
    if (!bands.length) return result;
    bands.forEach((b) => {
      result.inkRight = Math.max(result.inkRight, b.x1);
      result.inkLeft = Math.min(result.inkLeft, b.x0);
    });
    const isTotal = (b) => Boolean(b) && b.x0 > 0.40 * W && b.x1 > 0.70 * W && b.x1 - b.x0 > 0.09 * W
      && b.h / W > 0.009 && b.h / W < 0.05 && b.dens > 0.15;

    /* top: stray total / paper header lines, then the number */
    let first = 0;
    if (bands.length > 1 && isTotal(bands[0])) first = 1;
    if (hint?.header) {
      let guard = 0;
      while (first < bands.length - 1 && bands[first].x0 >= 0.15 * W && guard < 4) {
        first += 1;
        guard += 1;
      }
    }
    while (first < bands.length - 1 && bands[first].h < 0.006 * W) first += 1;
    const b0 = bands[first];
    result.first = { x0: b0.x0, x1: b0.x1, y0: b0.y0, y1: b0.y1, h: b0.h };
    if (first > 0) {
      const prev = bands[first - 1];
      result.topCut = Math.max(prev.y1, b0.y0 - Math.round(0.012 * W));
    }
    const words = runsOf((x) => b0.c[x] > 0, W, Math.max(2, Math.round(W * 0.005))).filter(([a, b]) => b - a > thin);
    if (words.length) {
      const [cx0, cx1] = words[0];
      const nx0 = words.length > 1 ? words[1][0] : W;
      let top = -1;
      let bottom = -1;
      for (let y = b0.y0; y < b0.y1; y += 1) {
        const o = y * W;
        for (let x = cx0; x < cx1; x += 1) {
          if (ink[o + x] && !border[x]) {
            if (top < 0) top = y;
            bottom = y;
            break;
          }
        }
      }
      const ch = top < 0 ? 0 : bottom - top + 1;
      const ratio = (cx1 - cx0) / Math.max(1, ch);
      const sure = hint?.number === true;
      const looksLikeNumber = cx0 < 0.07 * W && cx1 < 0.11 * W
        && ratio < (sure ? 2.4 : 1.9)
        && nx0 - cx1 >= (sure ? 0.004 : 0.006) * W
        && ch > 0.008 * W && ch < (sure ? 0.045 : 0.035) * W;
      if (looksLikeNumber && hint?.number !== false) {
        result.number = { x0: cx0, x1: cx1, y0: top, y1: bottom + 1, next: nx0 };
      }
    }

    /* bottom: the total line (and a paper total under it), then the answer block */
    let k = bands.length - 1;
    while (k > first && isTotal(bands[k]) && result.totals.length < 2) {
      const b = bands[k];
      result.totals.push({ x0: b.x0, x1: b.x1, y0: b.y0, y1: b.y1, h: b.h });
      k -= 1;
    }
    if (!result.totals.length && hint?.total && k > first) {
      const b = bands[k];
      if (b.x0 > 0.30 * W && b.h > 0.008 * W && b.h < 0.06 * W) {
        result.totals.push({ x0: b.x0, x1: b.x1, y0: b.y0, y1: b.y1, h: b.h });
        k -= 1;
      }
    }
    if (result.totals.length) {
      let j = k;
      let top = null;
      while (j > first && bands[j].x0 > 0.30 * W && bands[j].h < 0.06 * W) {
        top = bands[j];
        j -= 1;
      }
      if (top) {
        const above = bands[j];
        result.answerTop = Math.max(above ? above.y1 : 0, top.y0 - Math.round(0.01 * W));
        result.gapAbove = above ? Math.max(0, top.y0 - above.y1) : 0;
      }
    }
    return result;
  }

  function isBlankRow(profile, y) {
    return profile.rows[y] <= profile.blankLimit;
  }

  /* Trim fully blank rows at the top and bottom of a crop. */
  function contentBounds(profile, height) {
    if (!profile) return { start: 0, end: height };
    let start = 0;
    let end = profile.height;
    while (start < end && isBlankRow(profile, start)) start += 1;
    while (end > start && isBlankRow(profile, end - 1)) end -= 1;
    if (end - start < 8) return { start: 0, end: height };
    return { start: Math.max(0, start - 6), end: Math.min(profile.height, end + 6) };
  }

  /* Best row to cut between `from` and `limit` (source pixels). */
  function findCut(profile, from, limit) {
    if (!profile) return { at: limit, hard: true };
    const minRun = Math.max(6, Math.round(profile.width * 0.006));
    const scan = (lowFraction) => {
      const low = Math.floor(from + (limit - from) * lowFraction);
      let runEnd = -1;
      let run = 0;
      for (let y = Math.min(limit, profile.height) - 1; y >= low; y -= 1) {
        if (isBlankRow(profile, y)) {
          if (runEnd < 0) runEnd = y;
          run += 1;
          if (run >= minRun) {
            // keep the rest of the blank run on this page (it is answer space)
            return Math.min(runEnd + 1, limit);
          }
        } else {
          runEnd = -1;
          run = 0;
        }
      }
      return -1;
    };
    let at = scan(0.35);
    if (at < 0) at = scan(0.08);
    if (at <= from + 4) return { at: limit, hard: true };
    return { at, hard: false };
  }

  /* ------------------------------------------------------------ pagination */

  function outerHeight(el) {
    const rect = el.getBoundingClientRect();
    const style = el.ownerDocument.defaultView.getComputedStyle(el);
    return rect.height + (parseFloat(style.marginTop) || 0) + (parseFloat(style.marginBottom) || 0);
  }

  function fragment(doc, html) {
    const template = doc.createElement("template");
    template.innerHTML = html.trim();
    return template.content.firstElementChild;
  }

  /* Where to show a crop: rows start..end, working space inserted at `split`
     (just above the answer line), where the mock's number is written, and
     where the new total line sits. */
  function layoutCrop(item, profile, bounds, width) {
    const crop = profile?.crop || null;
    let start = bounds.start;
    let end = bounds.end;
    const result = { start, end, split: end, profile, numberMark: null, totalRight: null, totalFontPx: 0, inkRight: width * 0.92, gapAbove: 0 };
    if (!crop) return result;
    result.inkRight = crop.inkRight || result.inkRight;
    if (crop.topCut != null) start = Math.max(start, crop.topCut);
    if (crop.totals.length) {
      const own = crop.totals[crop.totals.length - 1];
      end = Math.min(end, Math.max(start + 8, own.y0 - 2));
      result.totalRight = own.x1;
      result.totalFontPx = clamp((own.h * item.scale) / 0.95, 10, 18);
    }
    let split = end;
    if (crop.answerTop != null && crop.answerTop > start + 0.02 * width && crop.answerTop < end - 4) {
      split = crop.answerTop;
      result.gapAbove = crop.gapAbove || 0;
    }
    const n = crop.number;
    if (n && n.y0 >= start) {
      const pad = Math.max(2, Math.round(0.004 * width));
      result.numberMark = {
        x0: n.x0,
        y0: n.y0 - pad,
        y1: n.y1 + pad,
        baseline: n.y1,
        fontPx: clamp(((n.y1 - n.y0) * item.scale) / 0.68, 10, 22),
        mask: { x0: Math.max(0, n.x0 - pad), y0: n.y0 - pad, x1: Math.min(n.next - 1, n.x1 + pad), y1: n.y1 + pad }
      };
    } else if (crop.first && crop.first.x0 > 0.05 * width && crop.first.y0 >= start) {
      const h = Math.min(crop.first.h, 0.022 * width);
      result.numberMark = { x0: Math.round(0.012 * width), y0: crop.first.y0, y1: crop.first.y0 + h, baseline: crop.first.y0 + h * 0.8, fontPx: clamp((h * 0.8 * item.scale) / 0.68, 12, 18), mask: null };
    }
    return Object.assign(result, { start, end, split });
  }

  class Paginator {
    constructor(doc, spec, opts, report, ctx) {
      this.doc = doc;
      this.spec = spec;
      this.opts = opts;
      this.report = report;
      this.ctx = ctx;
      this.layout = LAYOUTS[opts.layout] || LAYOUTS.standard;
      this.sheetsEl = doc.getElementById("sheets");
      this.measureEl = doc.getElementById("measure");
      this.sheets = [];
      this.page = null;
      this.section = "questions";
      this.slimPending = !ctx.cover;
    }

    measure(el) {
      if (el.parentNode !== this.measureEl) this.measureEl.appendChild(el);
      return outerHeight(el);
    }

    makeSheet(slim) {
      const sheet = this.doc.createElement("section");
      sheet.className = `sheet ig-sheet${this.section === "solutions" ? " is-solutions" : ""}`;
      sheet.innerHTML = `${furnitureHtml(this.spec, this.ctx)}${slim ? slimHeadHtml(this.spec, this.opts, this.ctx) : ""}<div class="sheet-body"></div>${footHtml(this.ctx)}`;
      this.sheetsEl.appendChild(sheet);
      const body = sheet.querySelector(".sheet-body");
      return { sheet, body, capacity: body.clientHeight - SAFETY_PX, used: 0, spaces: [], section: this.section };
    }

    /* Cover and formulae pages: fixed content, never filled with questions. */
    addCover(html) {
      const sheet = fragment(this.doc, html);
      this.sheetsEl.appendChild(sheet);
      this.sheets.push({ sheet, body: sheet, capacity: 0, used: 0, spaces: [], section: "front", isStatic: true });
    }

    addFormulae() {
      const page = this.makeSheet(false);
      page.sheet.classList.add("is-formulae");
      page.body.innerHTML = `<div class="ig-formulae"><img src="${FORMULAE_IMAGE}" alt="International GCSE Mathematics formulae sheet, Higher Tier"><p>Do not write on this page. Anything written on the formulae page will gain no credit.</p></div>`;
      this.sheets.push({ ...page, isStatic: true, section: "front" });
    }

    get bodyHeight() {
      if (!this._bodyHeight) {
        const probe = this.makeSheet(false);
        this._bodyHeight = probe.capacity;
        probe.sheet.remove();
      }
      return this._bodyHeight;
    }

    newPage() {
      if (this.page) this.closePage(this.page);
      const slim = this.slimPending;
      this.slimPending = false;
      this.page = this.makeSheet(slim);
      this.page.section = this.section;
      this.sheets.push(this.page);
      return this.page;
    }

    remaining() {
      return this.page.capacity - this.page.used;
    }

    place(el, height) {
      this.page.body.appendChild(el);
      this.page.used += height;
    }

    placeMeasured(el) {
      const height = this.measure(el);
      this.place(el, height);
      return height;
    }

    /* Leftover room on a closed page becomes extra working space. */
    closePage(page) {
      if (!this.layout.fill || !page.spaces.length) return;
      const leftover = page.capacity - page.used;
      if (leftover <= 1) return;
      const weight = page.spaces.reduce((sum, item) => sum + item.weight, 0) || 1;
      page.spaces.forEach((item) => {
        const extra = leftover * (item.weight / weight);
        item.height += extra;
        item.box.style.height = `${item.height.toFixed(2)}px`;
      });
      page.used = page.capacity;
    }

    spaceBlock(heightPx, marks) {
      const wrap = fragment(this.doc, `<div class="blk q-space-wrap"><div class="q-space"></div></div>`);
      const box = wrap.firstElementChild;
      box.style.height = `${heightPx.toFixed(2)}px`;
      return { wrap, box, height: heightPx, weight: Math.max(1, marks) };
    }

    placeSpace(heightPx, marks) {
      if (heightPx <= 0) return;
      const block = this.spaceBlock(heightPx, marks);
      const total = this.measure(block.wrap);
      this.place(block.wrap, total);
      this.page.spaces.push(block);
    }

    gap(className = "q-gap") {
      if (!this.page || this.page.used <= 0) return;
      const el = fragment(this.doc, `<div class="blk ${className}${this.opts.layout === "economy" || this.opts.layout === "compact" ? " is-tight" : ""}"></div>`);
      const height = this.measure(el);
      if (height > this.remaining()) {
        el.remove();
        return;
      }
      this.place(el, height);
    }

    /* One slice of a question crop. The original question number is covered
       and the mock's number is written in its place. */
    imageSegmentHtml(item, start, end) {
      const scale = item.scale;
      const height = (end - start) * scale;
      const el = fragment(this.doc, `<div class="blk q-seg-wrap"><div class="q-seg"></div></div>`);
      const seg = el.firstElementChild;
      seg.style.height = `${height.toFixed(2)}px`;
      const img = this.doc.createElement("img");
      img.src = item.image;
      img.alt = item.sourceRef ? `Question ${item.number} (${item.sourceRef})` : `Question ${item.number}`;
      img.style.width = `${item.displayWidth.toFixed(2)}px`;
      img.style.top = `${(-start * scale).toFixed(2)}px`;
      seg.appendChild(img);
      const mark = item.imageInfo?.numberMark;
      if (mark && mark.baseline > start && mark.baseline <= end) {
        const px = (value) => `${(value * scale).toFixed(2)}px`;
        if (mark.mask) {
          const mask = this.doc.createElement("i");
          mask.className = "ig-mask";
          mask.style.cssText = `left:${px(mark.mask.x0)};top:${px(mark.mask.y0 - start)};width:${px(mark.mask.x1 - mark.mask.x0)};height:${px(mark.mask.y1 - mark.mask.y0)}`;
          seg.appendChild(mask);
        }
        const fontPx = mark.fontPx;
        const num = this.doc.createElement("span");
        num.className = "q-num ig-qnum";
        num.textContent = String(item.number);
        num.style.cssText = `left:${px(mark.x0)};top:${((mark.baseline - start) * scale - 0.84 * fontPx).toFixed(2)}px;font-size:${fontPx.toFixed(2)}px`;
        seg.appendChild(num);
      }
      return el;
    }

    totalBlocks(item) {
      if (!this.ctx.totals) return [];
      const info = item.imageInfo;
      let style = "";
      if (info) {
        const right = info.totalRight != null ? info.totalRight : info.inkRight;
        const pad = Math.max(0, this.measureEl.clientWidth - right * item.scale);
        style = `padding-right:${pad.toFixed(2)}px${info.totalFontPx ? `;font-size:${info.totalFontPx.toFixed(2)}px` : ""}`;
      }
      return [fragment(this.doc, totalLineHtml(item, style)), fragment(this.doc, `<div class="blk ig-rule"></div>`)];
    }

    placeQuestion(item, { withSpace }) {
      const layout = this.layout;
      const marks = Number(item.marks || 0);
      const spaceMm = withSpace ? layout.space(marks) : 0;
      if (layout.newPage && this.page.used > 0) this.newPage();
      const tailEls = this.totalBlocks(item);

      if (!item.imageInfo) {
        const bodyEl = item.textBlock || fragment(this.doc, questionTextHtml(item));
        const bodyH = this.measure(bodyEl);
        const tailH = tailEls.reduce((sum, el) => sum + this.measure(el), 0);
        const spaceH = spaceMm * MM;
        if (bodyH + spaceH + tailH > this.remaining() && this.page.used > 0) this.newPage();
        this.place(bodyEl, bodyH);
        if (bodyH > this.page.capacity) this.report.overflowUnits.push(`question ${item.number}`);
        if (spaceH) this.placeSpace(Math.min(spaceH, Math.max(0, this.remaining() - tailH - 1.6 * MM)), marks);
        tailEls.forEach((el) => this.placeMeasured(el));
        return;
      }

      const info = item.imageInfo;
      const lead = info.numberMark ? null : fragment(this.doc, `<div class="blk ig-lead"><span class="q-num ig-num">${item.number}</span></div>`);
      const leadH = lead ? this.measure(lead) : 0;
      const aH = (info.split - info.start) * item.scale;
      const bEl = info.split < info.end ? this.imageSegmentHtml(item, info.split, info.end) : null;
      const tail = [bEl, ...tailEls].filter(Boolean);
      const tailH = tail.reduce((sum, el) => sum + this.measure(el), 0);
      const ownGap = (info.gapAbove || 0) * item.scale;
      const spaceH = spaceMm ? Math.max(spaceMm * MM - ownGap, 6 * MM) : 0;
      const spaceWrapH = spaceH ? spaceH + 1.6 * MM : 0;
      const need = leadH + aH + spaceWrapH + tailH;
      const placeAll = () => {
        if (lead) this.place(lead, leadH);
        const seg = this.imageSegmentHtml(item, info.start, info.split);
        this.place(seg, this.measure(seg));
        if (spaceH) this.placeSpace(spaceH, marks);
        tail.forEach((el) => this.place(el, this.measure(el)));
      };
      if (need <= this.remaining()) {
        placeAll();
        return;
      }
      const fresh = this.bodyHeight;
      if (this.page.used > 0 && need <= fresh) {
        this.newPage();
        placeAll();
        return;
      }
      /* Taller than the space available: split the image at blank rows. */
      if (this.page.used > 0 && (this.remaining() < 0.35 * fresh || this.remaining() < leadH + 40 * MM)) this.newPage();
      if (lead) this.place(lead, leadH);
      this.placeSplitImage(item, info.start, info.split);
      const minSpace = spaceH ? Math.min(spaceH, 18 * MM) + 1.6 * MM : 0;
      if (tailH + minSpace > this.remaining()) {
        this.placeMeasured(fragment(this.doc, `<div class="blk q-continues">Question ${item.number} continues on the next page</div>`));
        this.newPage();
        this.placeMeasured(fragment(this.doc, `<div class="blk ig-cont">Question ${item.number} continued</div>`));
      }
      if (spaceH) this.placeSpace(Math.max(0, Math.min(spaceH, this.remaining() - tailH - 1.6 * MM)), marks);
      tail.forEach((el) => this.place(el, this.measure(el)));
    }

    placeSplitImage(item, start, end) {
      const info = item.imageInfo;
      const note = fragment(this.doc, `<div class="blk q-continues">Question ${item.number} continues on the next page</div>`);
      const noteH = this.measure(note);
      note.remove();
      let from = start;
      let guard = 0;
      while (from < end && guard < 40) {
        guard += 1;
        const room = this.remaining();
        const needAll = (end - from) * item.scale;
        if (needAll <= room) {
          const seg = this.imageSegmentHtml(item, from, end);
          this.place(seg, this.measure(seg));
          from = end;
          break;
        }
        const limit = Math.floor(from + (room - noteH) / item.scale);
        if (limit - from < 40) {
          this.newPage();
          this.placeMeasured(fragment(this.doc, `<div class="blk ig-cont">Question ${item.number} continued</div>`));
          continue;
        }
        const cut = findCut(info.profile, from, limit);
        if (cut.hard) this.report.hardCuts.push(`${item.sourceRef || item.id} @${cut.at}`);
        const seg = this.imageSegmentHtml(item, from, cut.at);
        this.place(seg, this.measure(seg));
        this.report.splitQuestions.add(item.number);
        from = cut.at;
        // skip blank rows at the top of the next segment
        if (info.profile) {
          while (from < end && isBlankRow(info.profile, from)) from += 1;
          from = Math.max(from - 4, cut.at);
        }
        if (from >= end) break;
        this.placeMeasured(fragment(this.doc, `<div class="blk q-continues">Question ${item.number} continues on the next page</div>`));
        this.newPage();
        this.placeMeasured(fragment(this.doc, `<div class="blk ig-cont">Question ${item.number} continued</div>`));
      }
    }

    /* The closing box of the question section, like a real paper. */
    placePaperTotal(total) {
      const el = fragment(this.doc, `<div class="blk ig-paper-total"><span>TOTAL FOR PAPER IS ${total} MARKS</span></div>`);
      const height = this.measure(el);
      if (height > this.remaining()) this.newPage();
      this.place(el, height);
    }

    /* Solutions: header stays with its first unit; units never split mid-line. */
    placeSolution(item, blocks) {
      const [head, ...units] = blocks;
      const headH = this.measure(head);
      const firstH = units.length ? this.measure(units[0]) : 0;
      if (headH + firstH > this.remaining() && this.page.used > 0) this.newPage();
      this.place(head, headH);
      units.forEach((unit, index) => {
        const pieces = this.splitTallUnit(unit);
        pieces.forEach((piece) => {
          const height = this.measure(piece);
          if (height > this.remaining() && this.page.used > 0) {
            this.newPage();
            if (index > 0 || pieces.length > 1) {
              this.placeMeasured(fragment(this.doc, `<div class="blk solution-continued">Solution ${item.number} (continued)</div>`));
            }
          }
          if (height > this.remaining()) this.report.overflowUnits.push(`solution ${item.number}`);
          this.place(piece, height);
        });
      });
    }

    /* A single step taller than a page is divided between its paragraphs. */
    splitTallUnit(unit) {
      const height = this.measure(unit);
      const limit = this.bodyHeight - 12 * MM;
      if (height <= limit) return [unit];
      const copy = unit.querySelector(".s-copy");
      if (!copy || copy.children.length < 2) return [unit];
      const children = [...copy.children];
      const pieces = [];
      let current = null;
      const startPiece = () => {
        const clone = unit.cloneNode(true);
        const cloneCopy = clone.querySelector(".s-copy");
        cloneCopy.innerHTML = "";
        if (pieces.length) clone.querySelector("h4")?.remove();
        this.measureEl.appendChild(clone);
        pieces.push(clone);
        return cloneCopy;
      };
      current = startPiece();
      children.forEach((child) => {
        current.appendChild(child);
        if (outerHeight(pieces[pieces.length - 1]) > limit && current.children.length > 1) {
          current.removeChild(child);
          current = startPiece();
          current.appendChild(child);
        }
      });
      unit.remove();
      return pieces;
    }

    drawRules() {
      if (!this.opts.lines) return;
      const pitch = RULE_PITCH_MM * MM;
      this.sheets.forEach((page) => page.spaces.forEach((item) => {
        item.box.querySelectorAll(".q-rule-line").forEach((line) => line.remove());
        for (let y = pitch + 1.5 * MM; y < item.height - 2 * MM; y += pitch) {
          const line = this.doc.createElement("i");
          line.className = "q-rule-line";
          line.style.top = `${y.toFixed(2)}px`;
          item.box.appendChild(line);
        }
      }));
    }

    finish() {
      if (this.page) this.closePage(this.page);
      this.drawRules();
      const total = this.sheets.length;
      this.sheets.forEach((page, index) => {
        page.sheet.dataset.page = String(index + 1);
        const foot = page.sheet.querySelector(".foot-page");
        if (foot) foot.textContent = String(index + 1);
        const mid = page.sheet.querySelector(".foot-mid");
        if (mid) mid.textContent = `Page ${index + 1} of ${total}`;
        if (index === total - 1) page.sheet.classList.add("is-last");
        if (page.isStatic) return;
        if (!page.body.children.length) this.report.blankPages += 1;
        if (page.body.scrollHeight > page.body.clientHeight + 1) this.report.overflowPages.push(index + 1);
      });
      this.report.pages = total;
    }
  }

  /* ----------------------------------------------------------- rendering */

  async function ensureFrameMath(win, doc) {
    if (win.MathJax?.typesetPromise) return win.MathJax;
    win.MathJax = {
      tex: { inlineMath: [["\\(", "\\)"]], displayMath: [["\\[", "\\]"]] },
      svg: { fontCache: "local" },
      startup: { typeset: false }
    };
    await new Promise((resolve, reject) => {
      const script = doc.createElement("script");
      script.src = MATHJAX_URL;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error("The maths renderer could not load."));
      doc.head.appendChild(script);
      setTimeout(() => reject(new Error("The maths renderer timed out.")), MATH_TIMEOUT_MS);
    });
    await win.MathJax.startup.promise;
    if (!win.MathJax.typesetPromise) throw new Error("The maths renderer did not start.");
    return win.MathJax;
  }

  function rawMarkupProblems(root) {
    const text = root.textContent || "";
    const problems = [];
    if (/\\\(|\\\)|\\\[|\\\]|\$\$/.test(text)) problems.push("raw LaTeX");
    if (/<\/?(?:p|div|span|br|strong|em|sup|sub|li|ul)\b[^>]*>/i.test(text)) problems.push("raw HTML");
    if (root.querySelector("mjx-merror, [data-mjx-error]")) problems.push("maths error");
    return problems;
  }

  async function renderPaper(frame, spec, opts, isCurrent = () => true, onProgress = () => {}) {
    const report = {
      pages: 0,
      blankPages: 0,
      overflowPages: [],
      overflowUnits: [],
      hardCuts: [],
      splitQuestions: new Set(),
      missingImages: [],
      problems: [],
      options: { ...opts }
    };
    await new Promise((resolve) => {
      frame.addEventListener("load", resolve, { once: true });
      frame.srcdoc = documentHtml(spec, opts);
    });
    if (!isCurrent()) return null;
    const win = frame.contentWindow;
    const doc = frame.contentDocument;
    const measureEl = doc.getElementById("measure");
    await requireWithin(doc.fonts?.ready || Promise.resolve(), FONT_TIMEOUT_MS, "The paper fonts are still loading. Please retry.");

    const withSolutions = opts.version === "solutions";
    let solutionMap = null;
    if (withSolutions && typeof spec.resolveSolutions === "function") {
      solutionMap = await spec.resolveSolutions();
      if (!isCurrent()) return null;
    }
    const items = spec.questions.map((question, index) => ({
      ...question,
      number: question.number || index + 1,
      solution: solutionMap && question.id in solutionMap ? solutionMap[question.id] : question.solution
    }));
    const info = courseFor(spec);
    const cover = spec.cover !== false;
    const ctx = {
      info,
      code: paperCode(spec),
      total: totalMarksOf(spec),
      cover,
      withFormulae: cover && info.formulae === "igcse" && spec.formulae !== false,
      totals: spec.questionTotals !== false
    };
    report.paperCode = ctx.code;

    /* Load every question image and read its pixels. */
    const contentWidth = measureEl.clientWidth;
    const segWidth = contentWidth;
    const loaded = await loadQuestionImages(doc, items.map((item) => item.image || ""), (done, total) => {
      if (total) onProgress(`Loading question images ${done}/${total}...`);
    });
    onProgress("Laying out A4 pages...");
    const widths = loaded.filter((img) => img?.naturalWidth).map((img) => img.naturalWidth).sort((a, b) => a - b);
    const refWidth = widths.length ? widths[Math.min(widths.length - 1, Math.floor(widths.length * 0.75))] : 1;
    report.renumbered = 0;
    report.kept = [];
    items.forEach((item, index) => {
      const img = loaded[index];
      if (!item.image) return;
      if (!img?.naturalWidth) {
        report.missingImages.push(item.sourceRef || item.id);
        item.imageInfo = null;
        item.text = item.text || `Question image could not be loaded (${item.sourceRef || item.id}).`;
        return;
      }
      const profile = inkProfile(doc, img, cropHint(item));
      const bounds = contentBounds(profile, img.naturalHeight);
      item.displayWidth = segWidth * IMAGE_SCALE * Math.min(1, img.naturalWidth / refWidth);
      item.scale = item.displayWidth / img.naturalWidth;
      item.imageInfo = layoutCrop(item, profile, bounds, img.naturalWidth);
      if (item.imageInfo.numberMark?.mask) report.renumbered += 1;
      else report.kept.push(item.sourceRef || item.id);
    });
    if (items.some((item) => item.imageInfo && !item.imageInfo.profile)) {
      report.problems.push("pixel analysis unavailable; tall questions cut at page limit");
    }
    if (!isCurrent()) return null;

    /* Pre-build text questions and solution blocks so maths is typeset once, before measuring. */
    items.filter((item) => !item.imageInfo).forEach((item) => {
      item.textBlock = fragment(doc, questionTextHtml(item));
      measureEl.appendChild(item.textBlock);
    });
    const solutionBlocks = new Map();
    if (withSolutions) {
      items.forEach((item) => {
        const holder = doc.createElement("div");
        holder.innerHTML = solutionBlocksHtml(item);
        const blocks = [...holder.children];
        blocks.forEach((block) => measureEl.appendChild(block));
        solutionBlocks.set(item.number, blocks);
      });
    }
    const needsMath = /\\\(|\\\[/.test(measureEl.textContent || "");
    if (needsMath) {
      const mathJax = await ensureFrameMath(win, doc);
      if (!isCurrent()) return null;
      await mathJax.typesetPromise([measureEl]);
    }
    await nextFrame(win);
    if (!isCurrent()) return null;

    const paginator = new Paginator(doc, spec, opts, report, ctx);
    if (ctx.cover) paginator.addCover(coverHtml(spec, opts, ctx));
    if (ctx.withFormulae) paginator.addFormulae();
    paginator.newPage();
    if (ctx.cover) {
      paginator.placeMeasured(fragment(doc, `<div class="blk ig-intro"><b>Answer ALL ${numberWords(items.length)} questions.</b><b>Write your answers in the spaces provided.</b><b>You must write down all the stages in your working.</b></div>`));
    }
    const inline = withSolutions && opts.placement === "inline";
    for (const item of items) {
      paginator.placeQuestion(item, { withSpace: !inline });
      if (inline) {
        paginator.gap("s-gap");
        paginator.placeSolution(item, solutionBlocks.get(item.number));
      }
      paginator.gap(inline ? "s-gap" : "q-gap");
    }
    if (ctx.totals && !inline) paginator.placePaperTotal(ctx.total);
    if (withSolutions && !inline) {
      paginator.section = "solutions";
      paginator.newPage();
      paginator.placeMeasured(fragment(doc, `<div class="blk section-title">Worked solutions<small>${escapeHtml(spec.title || "")} &middot; ${escapeHtml(ctx.code)} &middot; numbered to match the questions</small></div>`));
      for (const item of items) {
        paginator.placeSolution(item, solutionBlocks.get(item.number));
        paginator.gap("s-gap");
      }
    }
    paginator.finish();
    measureEl.innerHTML = "";
    // Preloaded source images are not the same elements as the final page crops.
    // Decode the actual printable elements before enabling either output button.
    await Promise.all([...doc.querySelectorAll("#sheets img")].map(requireImage));
    await requireWithin(doc.fonts?.ready || Promise.resolve(), FONT_TIMEOUT_MS, "The paper fonts are still loading. Please retry.");
    await nextFrame(win);
    await nextFrame(win);
    if (!isCurrent()) return null;
    report.assetsReady = true;
    report.problems.push(...rawMarkupProblems(doc.getElementById("sheets")));
    report.splitQuestions = [...report.splitQuestions];
    report.sheetSizeMm = (() => {
      const sheet = doc.querySelector(".sheet");
      if (!sheet) return null;
      const rect = sheet.getBoundingClientRect();
      const zoom = parseFloat(doc.getElementById("sheets").style.zoom || "1") || 1;
      return { width: +(rect.width / zoom / MM).toFixed(2), height: +(rect.height / zoom / MM).toFixed(2) };
    })();
    doc.documentElement.dataset.paperReady = "true";
    doc.documentElement.dataset.paperPages = String(report.pages);
    return report;
  }

  /* -------------------------------------------------------------- studio */

  const studio = {
    overlay: null,
    frame: null,
    spec: null,
    opts: { ...DEFAULT_OPTIONS },
    token: 0,
    ready: false,
    report: null,
    lastFocus: null,
    onClose: null,
    exportJob: null
  };

  function ensureStudioCss() {
    if (document.getElementById("elitePaperStudioCss")) return;
    const link = document.createElement("link");
    link.id = "elitePaperStudioCss";
    link.rel = "stylesheet";
    link.href = STUDIO_CSS;
    document.head.appendChild(link);
  }

  function selectHtml(name, label, options) {
    return `<label class="eps-field" data-field="${name}"><span>${label}</span><select data-opt="${name}">${options.map(([value, text]) => `<option value="${value}">${escapeHtml(text)}</option>`).join("")}</select></label>`;
  }

  function buildStudio() {
    ensureStudioCss();
    const overlay = document.createElement("div");
    overlay.className = "eps-overlay";
    overlay.hidden = true;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "epsTitle");
    overlay.innerHTML = `
      <div class="eps-bar">
        <div class="eps-heading">
          <strong id="epsTitle">A4 print preview</strong>
          <span class="eps-info" data-info aria-live="polite">Preparing pages...</span>
        </div>
        <div class="eps-controls">
          ${selectHtml("version", "Copy", [["student", "Student copy"], ["solutions", "With worked solutions"]])}
          ${selectHtml("placement", "Solutions", [["end", "Grouped at the end"], ["inline", "After each question"]])}
          ${selectHtml("layout", "Layout", Object.entries(LAYOUTS).map(([key, value]) => [key, value.label]))}
          ${selectHtml("ink", "Ink", [["colour", "Colour accents"], ["mono", "Black & white"]])}
          <label class="eps-check"><input type="checkbox" data-opt="lines" checked> <span>Ruled working space</span></label>
        </div>
        <div class="eps-actions">
          <button type="button" class="eps-primary" data-act="download" disabled>Download PDF</button>
          <button type="button" data-act="print" disabled>Print</button>
          <button type="button" class="eps-close" data-act="close" aria-label="Close print preview">Close</button>
        </div>
      </div>
      <p class="eps-hint" data-hint>A4 portrait, 210 &times; 297 mm. In the print dialog keep <b>Scale: Default (100%)</b>; for a PDF choose <b>Destination: Save as PDF</b>.</p>
      <div class="eps-stage">
        <iframe class="eps-frame" title="A4 paper preview"></iframe>
        <div class="eps-status" data-status role="status">Preparing A4 pages...</div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener("change", (event) => {
      const control = event.target.closest("[data-opt]");
      if (!control) return;
      if (studio.exportJob) return;
      studio.opts[control.dataset.opt] = control.type === "checkbox" ? control.checked : control.value;
      syncControls();
      rerender();
    });
    overlay.addEventListener("click", (event) => {
      const button = event.target.closest("[data-act]");
      if (!button || button.disabled) return;
      if (button.dataset.act === "close") close();
      else if (button.dataset.act === "download") downloadPdf();
      else printFrame(button.dataset.act);
    });
    overlay.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
      if (event.key === "Tab") trapFocus(event);
    });
    studio.overlay = overlay;
    studio.frame = overlay.querySelector("iframe");
    window.addEventListener("resize", fitPreview);
  }

  function trapFocus(event) {
    const focusable = [...studio.overlay.querySelectorAll("select, input, button:not([disabled])")].filter((el) => el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function syncControls() {
    const overlay = studio.overlay;
    overlay.querySelectorAll("[data-opt]").forEach((control) => {
      const value = studio.opts[control.dataset.opt];
      if (control.type === "checkbox") control.checked = Boolean(value);
      else control.value = value;
    });
    overlay.querySelector('[data-field="placement"]').hidden = studio.opts.version !== "solutions";
    const canSolve = studio.spec?.allowSolutions !== false;
    const versionSelect = overlay.querySelector('[data-opt="version"]');
    versionSelect.querySelector('option[value="solutions"]').disabled = !canSolve;
    overlay.querySelector(".eps-check").hidden = studio.opts.layout === "compact" || (studio.opts.version === "solutions" && studio.opts.placement === "inline");
  }

  function setBusy(message) {
    studio.ready = false;
    const status = studio.overlay.querySelector("[data-status]");
    status.hidden = false;
    status.textContent = message;
    status.classList.remove("is-error");
    studio.overlay.querySelectorAll('[data-act="print"], [data-act="download"]').forEach((button) => { button.disabled = true; });
    studio.overlay.querySelector("[data-info]").textContent = message;
  }

  function setError(message) {
    const status = studio.overlay.querySelector("[data-status]");
    status.hidden = false;
    status.classList.add("is-error");
    status.textContent = message;
    studio.overlay.querySelector("[data-info]").textContent = "Not ready to print";
  }

  function setReady(report) {
    studio.ready = true;
    studio.report = report;
    studio.overlay.querySelector("[data-status]").hidden = true;
    studio.overlay.querySelectorAll('[data-act="print"], [data-act="download"]').forEach((button) => { button.disabled = false; });
    const size = report.sheetSizeMm ? `${Math.round(report.sheetSizeMm.width)} × ${Math.round(report.sheetSizeMm.height)} mm` : "A4";
    const splits = report.splitQuestions.length ? ` · ${plural(report.splitQuestions.length, "long question")} split at a blank line` : "";
    studio.overlay.querySelector("[data-info]").textContent = `${plural(report.pages, "A4 page")} · ${size}${splits}`;
    fitPreview();
  }

  function fitPreview() {
    const doc = studio.frame?.contentDocument;
    const sheets = doc?.getElementById("sheets");
    if (!sheets) return;
    const available = studio.frame.clientWidth - 24;
    const zoom = Math.min(1, available / (210 * MM));
    sheets.style.zoom = zoom.toFixed(4);
  }

  async function rerender() {
    const token = ++studio.token;
    setBusy("Preparing A4 pages...");
    try {
      const report = await renderPaper(studio.frame, studio.spec, { ...studio.opts }, () => token === studio.token, (message) => {
        if (token === studio.token) setBusy(message);
      });
      if (!report || token !== studio.token) return;
      root.ElitePaperPrint.lastReport = report;
      if (report.problems.includes("raw LaTeX") || report.problems.includes("maths error")) {
        setError("Some mathematics did not render. Check the connection, then change any option to try again.");
        return;
      }
      setReady(report);
      if (studio.autoDownload) {
        studio.autoDownload = false;
        downloadPdf();
      }
    } catch (error) {
      if (token !== studio.token) return;
      console.error("[paper-print]", error);
      setError(`${error.message || "The paper could not be prepared."} Check the connection and try again.`);
    }
  }

  function printInFrame(title) {
    const win = studio.frame.contentWindow;
    const originalTitle = document.title;
    document.title = title;
    win.document.title = title;
    try {
      win.focus();
      win.print();
    } finally {
      window.setTimeout(() => { document.title = originalTitle; }, 800);
    }
  }

  // Keep the prepared document alive while the native print dialog uses it.
  function printFrame(kind) {
    if (!studio.ready || studio.exportJob) return;
    const images = [...studio.frame.contentDocument.querySelectorAll("#sheets img")];
    if (images.some(img => !img.complete || !img.naturalWidth)) {
      rerender();
      return;
    }
    const title = fileNameFor(studio.spec.fileName || "Elite-Mathematics-paper", studio.opts, studio.spec);
    root.ElitePaperPrint.lastPrint = { kind, at: Date.now(), options: { ...studio.opts }, method: "frame" };
    printInFrame(title);
    studio.overlay.querySelector(`[data-act="${kind}"]`)?.focus();
  }

  /* ---- Download PDF: built in the page, no browser print dialog ---------
     Each finished A4 sheet is rendered to a high-resolution image
     (html2canvas) and placed full-bleed on an A4 page (jsPDF). This works
     even where the browser's print preview fails on a computer. */
  const PDF_LIBS = [
    ["html2canvas", assetUrl("assets/vendor/html2canvas-1.4.1.min.js")],
    ["jspdf", assetUrl("assets/vendor/jspdf-2.5.1.umd.min.js")]
  ];
  const PDF_RENDER_SCALE = 2; // about 190 dpi: sharp printed text, small file
  const PDF_JPEG_QUALITY = 0.82;

  function exportWait(promise, signal, message, ms = 30000) {
    return new Promise((resolve, reject) => {
      const abort = () => finish(reject, new DOMException("PDF export cancelled.", "AbortError"));
      const timer = window.setTimeout(() => finish(reject, new Error(message)), ms);
      function finish(callback, value) {
        window.clearTimeout(timer);
        signal.removeEventListener("abort", abort);
        callback(value);
      }
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) abort();
      Promise.resolve(promise).then(value => finish(resolve, value), error => finish(reject, error));
    });
  }

  function loadLibrary(win, key, src) {
    const ready = key === "jspdf" ? () => win.jspdf?.jsPDF : () => win.html2canvas;
    if (ready()) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = win.document.createElement("script");
      script.src = src;
      script.onload = () => (ready() ? resolve() : reject(new Error("The PDF tools did not start.")));
      script.onerror = () => reject(new Error("The PDF tools could not load. Check the internet connection."));
      win.document.head.appendChild(script);
    });
  }

  // MathJax SVGs contain local glyph definitions. Flatten each complete SVG
  // once; cloning all SVGs in the whole exam for every page is quadratic work.
  async function flattenMath(doc, signal) {
    for (const svg of doc.querySelectorAll(".sheet svg")) {
      const rect = svg.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      const style = doc.defaultView.getComputedStyle(svg);
      const copy = svg.cloneNode(true);
      copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      copy.setAttribute("width", String(rect.width));
      copy.setAttribute("height", String(rect.height));
      copy.style.color = style.color;
      copy.querySelectorAll('[stroke-width="0"]').forEach(node => node.setAttribute("stroke", "none"));
      const image = new doc.defaultView.Image();
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(copy))}`;
      await exportWait(image.decode(), signal, "A maths image could not be rendered.");
      const canvas = doc.createElement("canvas");
      canvas.width = Math.ceil(rect.width * PDF_RENDER_SCALE);
      canvas.height = Math.ceil(rect.height * PDF_RENDER_SCALE);
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      const flat = doc.createElement("img");
      flat.src = canvas.toDataURL("image/png");
      flat.alt = svg.closest("mjx-container")?.getAttribute("aria-label") || "Mathematics";
      flat.style.cssText = `width:${rect.width}px;height:${rect.height}px;max-width:none;vertical-align:${style.verticalAlign};`;
      svg.replaceWith(flat);
      await exportWait(flat.decode(), signal, "A maths image could not be loaded.");
      canvas.width = canvas.height = 0;
    }
  }

  function exportControls(busy) {
    studio.overlay.querySelectorAll('[data-opt], [data-act="print"], [data-act="download"]').forEach(control => {
      control.disabled = busy || !studio.ready;
    });
  }

  async function buildPdfBlob(onProgress = () => {}) {
    if (!studio.ready || studio.overlay.hidden) throw new Error("Prepare the paper before downloading it.");
    if (studio.exportJob) throw new Error("A PDF is already being prepared.");
    const job = new AbortController();
    studio.exportJob = job;
    exportControls(true);
    const source = studio.frame.contentDocument;
    const sheets = [...source.querySelectorAll(".sheet")];
    const spec = { ...studio.spec };
    const opts = { ...studio.opts };
    const frame = document.createElement("iframe");
    frame.className = "eps-export-frame";
    frame.setAttribute("aria-hidden", "true");
    frame.tabIndex = -1;
    frame.style.cssText = "position:fixed;left:-10000px;top:0;width:820px;height:1160px;border:0;pointer-events:none;";
    try {
      const loaded = new Promise(resolve => frame.addEventListener("load", resolve, { once: true }));
      frame.srcdoc = documentHtml(spec, opts);
      document.body.appendChild(frame);
      await exportWait(loaded, job.signal, "The PDF document could not load.");
      const win = frame.contentWindow;
      const doc = frame.contentDocument;
      source.querySelectorAll("head style").forEach(style => doc.head.appendChild(style.cloneNode(true)));
      doc.getElementById("measure").remove();
      const pageHolder = doc.getElementById("sheets");
      pageHolder.style.cssText = "display:block;padding:0;margin:0;zoom:1;";
      for (const [key, src] of PDF_LIBS) {
        await exportWait(loadLibrary(win, key, src), job.signal, "The PDF tools could not load. Please try again.");
      }
      const pdf = new win.jspdf.jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
      for (let index = 0; index < sheets.length; index += 1) {
        onProgress(index + 1, sheets.length);
        const sheet = sheets[index].cloneNode(true);
        // MathJax's screen-reader MathML uses clipping unsupported by html2canvas.
        // The visible SVG already contains the complete equation.
        sheet.querySelectorAll("mjx-assistive-mml").forEach(node => node.remove());
        sheet.style.boxShadow = "none";
        pageHolder.replaceChildren(sheet);
        await exportWait(doc.fonts.ready, job.signal, "The paper fonts could not load.");
        await exportWait(Promise.all([...doc.images].map(img => img.decode())), job.signal, "A question image could not be loaded. Please try again.");
        await flattenMath(doc, job.signal);
        const canvas = await exportWait(win.html2canvas(sheet, {
          scale: PDF_RENDER_SCALE,
          backgroundColor: "#ffffff",
          useCORS: true,
          logging: false,
          windowWidth: 820,
          windowHeight: 1160,
          scrollX: 0,
          scrollY: 0
        }), job.signal, "This PDF page took too long to render. Please try a shorter test.", 60000);
        if (index > 0) pdf.addPage("a4", "portrait");
        pdf.addImage(canvas.toDataURL("image/jpeg", PDF_JPEG_QUALITY), "JPEG", 0, 0, 210, 297, undefined, "FAST");
        canvas.width = 0;
        canvas.height = 0;
        await exportWait(new Promise(resolve => window.setTimeout(resolve, 0)), job.signal, "PDF export paused.");
      }
      pdf.setProperties({ title: spec.title || "Elite Mathematics", author: "Dr Eslam Ahmed", creator: "eliteigcse.com" });
      return pdf.output("blob");
    } finally {
      frame.remove();
      if (studio.exportJob === job) {
        studio.exportJob = null;
        exportControls(false);
      }
    }
  }

  async function downloadPdf() {
    if (!studio.ready || studio.exportJob) return;
    const token = studio.token;
    const button = studio.overlay.querySelector('[data-act="download"]');
    const label = button.textContent;
    const name = `${fileNameFor(studio.spec.fileName || "Elite-Mathematics-paper", studio.opts, studio.spec)}.pdf`;
    button.disabled = true;
    root.ElitePaperPrint.lastPrint = { kind: "download", at: Date.now(), options: { ...studio.opts }, method: "pdf" };
    try {
      const blob = await buildPdfBlob((page, total) => { button.textContent = `Creating PDF ${page}/${total}...`; });
      if (token !== studio.token) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      root.ElitePaperPrint.lastPdf = { name, bytes: blob.size, pages: studio.report?.pages };
      showHint(`Downloaded ${name} (${Math.max(1, Math.round(blob.size / 1024))} KB). Open it from your Downloads to print or share.`);
    } catch (error) {
      if (error.name === "AbortError" || token !== studio.token) return;
      console.error("[paper-print pdf]", error);
      showHint(`${error.message || "The PDF could not be created."} You can still use Print.`);
    } finally {
      button.textContent = label;
      button.disabled = !studio.ready || Boolean(studio.exportJob);
    }
  }

  function showHint(message) {
    const hint = studio.overlay.querySelector("[data-hint]");
    if (hint) hint.textContent = message;
  }

  function fileNameFor(base, opts, spec = {}) {
    if (spec.fileSuffix !== undefined) return `${base}${spec.fileSuffix}`;
    return `${base}${opts.version === "solutions" ? "-Solutions" : "-Student"}`;
  }

  function open(spec, options = {}) {
    if (!spec?.questions?.length) return null;
    studio.exportJob?.abort();
    if (!studio.overlay) buildStudio();
    studio.spec = {
      ...spec,
      fileName: spec.fileName || slug(["Elite", spec.courseCode, spec.title, spec.testCode].filter(Boolean).join(" ")) || "Elite-Mathematics-paper"
    };
    const { autoDownload: _auto, onClose: _onClose, ...chosen } = options;
    studio.opts = { ...DEFAULT_OPTIONS, ...(studio.remembered || {}), ...chosen };
    if (spec.allowSolutions === false) studio.opts.version = "student";
    studio.onClose = options.onClose || spec.onClose || null;
    studio.autoDownload = Boolean(options.autoDownload);
    studio.lastFocus = document.activeElement;
    studio.overlay.hidden = false;
    showHint(DEFAULT_HINT);
    document.documentElement.classList.add("eps-open");
    syncControls();
    studio.overlay.querySelector('[data-opt="version"]').focus();
    rerender();
    return root.ElitePaperPrint;
  }

  function close() {
    if (!studio.overlay || studio.overlay.hidden) return;
    studio.exportJob?.abort();
    studio.ready = false;
    studio.token += 1;
    studio.remembered = { layout: studio.opts.layout, ink: studio.opts.ink, lines: studio.opts.lines, placement: studio.opts.placement };
    studio.overlay.hidden = true;
    document.documentElement.classList.remove("eps-open");
    studio.frame.srcdoc = "<!doctype html><title>closed</title>";
    const callback = studio.onClose;
    studio.onClose = null;
    if (studio.lastFocus?.focus) studio.lastFocus.focus();
    if (callback) callback();
  }

  root.ElitePaperPrint = {
    version: VERSION,
    layouts: Object.keys(LAYOUTS),
    open,
    close,
    renderPaper,
    prefetch,
    buildPdfBlob: (onProgress) => buildPdfBlob(onProgress),
    lastPdf: null,
    isOpen: () => Boolean(studio.overlay && !studio.overlay.hidden),
    isReady: () => studio.ready,
    frame: () => studio.frame,
    options: () => ({ ...studio.opts }),
    setOptions(next) {
      if (studio.exportJob) return Promise.reject(new Error("Wait for the PDF download to finish before changing options."));
      Object.assign(studio.opts, next);
      syncControls();
      return rerender();
    },
    lastReport: null,
    lastPrint: null,
    _internals: { findCut, contentBounds, LAYOUTS, MM, inkProfile, cropHint, analyseCrop, layoutCrop }
  };
})(window);
