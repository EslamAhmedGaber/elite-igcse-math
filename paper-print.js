/* ==========================================================================
   paper-print.js - Elite Mathematics A4 paper engine
   One print path for every course (Linear, Modular, WMA11, WMA12, WME01,
   Baccalaureate) and every entry point (Random Mock, Build Test, Revision
   Book, Saved Tests, Classified selection, course hubs).

   How it works
   1. The paper is rendered inside an isolated iframe that loads ONLY
      paper-print.css. Screen stylesheets never reach the printed page.
   2. Every block (question header, question image, working space, solution
      step) is measured at the exact A4 content width, then packed into fixed
      210 x 297 mm sheets. Nothing depends on the browser's page-break guesses.
   3. Question images taller than the space left are cut at a blank row found
      by scanning the pixels, so a line of text, an equation or a diagram is
      never sliced. Leftover space on a sheet becomes extra working space.
   4. Print and Save as PDF call the same iframe print, so both produce the
      same pages. Closing or cancelling never touches the exam on the page.
   ========================================================================== */
(function (root) {
  "use strict";

  const VERSION = "20260927a";
  const MM = 96 / 25.4;
  const SCRIPT_SRC = document.currentScript?.src || "";
  const assetUrl = (name) => new URL(`${name}?v=${VERSION}`, SCRIPT_SRC || document.baseURI).href;
  const DOC_CSS = assetUrl("paper-print.css");
  const STUDIO_CSS = assetUrl("paper-studio.css");
  const FONT_CSS = "https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap";
  const MATHJAX_URL = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js";
  const IMAGE_TIMEOUT_MS = 15000;
  const FONT_TIMEOUT_MS = 5000;
  const MATH_TIMEOUT_MS = 25000;
  const SAFETY_PX = 2 * MM;
  /* Past-paper crops are shown at their original printed size (about 88% of
     the 182 mm content width), not blown up to fill the page. */
  const IMAGE_SCALE = 0.88;
  const RULE_PITCH_MM = 8;

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
    lines: true
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

  function copyLabel(opts) {
    return opts.version === "solutions" ? "With worked solutions" : "Student copy";
  }

  function mastheadHtml(spec, opts) {
    const totalMarks = spec.questions.reduce((sum, item) => sum + Number(item.marks || 0), 0);
    const solutionsCopy = opts.version === "solutions";
    const instructions = solutionsCopy
      ? opts.placement === "inline"
        ? "Each worked solution follows its question. Question numbers, marks and order match the student copy exactly."
        : "The questions match the student copy page for page. Worked solutions follow in a separate section, numbered to match."
      : opts.layout === "compact"
        ? "Answer every question on separate paper. Show clear working; the marks for each question are shown beside it."
        : "Answer every question in the space provided. Show clear working; the marks for each question are shown beside it.";
    return `<header class="masthead">
      <div class="brand-row">
        <div>
          <span class="wordmark">ELITE MATHEMATICS</span>
          <span class="brand-by">Dr Eslam Ahmed</span>
        </div>
        <div class="brand-side">
          <span class="copy-badge${solutionsCopy ? " is-solutions" : ""}">${escapeHtml(copyLabel(opts))}</span>
          <span class="brand-url">eliteigcse.com</span>
        </div>
      </div>
      <p class="paper-course">${escapeHtml(spec.courseLabel || "")}</p>
      <h1 class="paper-title">${escapeHtml(spec.title || "Mathematics Test")}</h1>
      <div class="paper-facts">
        <div><span>Time</span><strong>${spec.durationMinutes ? `${Math.round(spec.durationMinutes)} minutes` : "Untimed"}</strong></div>
        <div><span>Total marks</span><strong>${totalMarks}</strong></div>
        <div><span>Questions</span><strong>${spec.questions.length}</strong></div>
        <div><span>Test code</span><strong>${escapeHtml(spec.testCode || "-")}</strong></div>
      </div>
      <div class="student-row">
        <span>Name</span>
        <span>Date</span>
        <span class="score-slot">Score <em>/ ${totalMarks}</em></span>
      </div>
      <p class="instructions">${escapeHtml(instructions)}</p>
    </header>`;
  }

  function runningHeadHtml(spec) {
    const left = [spec.courseLabel, spec.title].filter(Boolean).map(escapeHtml).join(" &middot; ");
    return `<div class="running-head"><span><strong>ELITE MATHEMATICS</strong> &middot; ${left}</span><span>${spec.testCode ? `Code ${escapeHtml(spec.testCode)}` : ""}</span></div>`;
  }

  function footHtml() {
    return `<div class="sheet-foot"><span>eliteigcse.com &middot; Dr Eslam Ahmed</span><span class="foot-mid"></span><span class="foot-page"></span></div>`;
  }

  function documentHtml(spec, opts) {
    const classes = [opts.ink === "mono" ? "mono" : "", opts.lines ? "" : "plain-space"].filter(Boolean).join(" ");
    const title = spec.fileName || "Elite Mathematics paper";
    return `<!doctype html><html lang="en" class="${classes}"><head><meta charset="utf-8">
<base href="${escapeHtml(spec.baseHref || document.baseURI)}">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="${FONT_CSS}">
<link rel="stylesheet" href="${DOC_CSS}">
</head><body><div class="sheets" id="sheets"></div><div class="measure" id="measure" aria-hidden="true"></div></body></html>`;
  }

  function questionHeadHtml(item, continued = false) {
    const ref = item.sourceRef ? ` &middot; ${escapeHtml(item.sourceRef)}` : "";
    const marks = Number(item.marks || 0);
    return `<div class="blk q-head${continued ? " is-continued" : ""}">
      <span class="q-num">${item.number}</span>
      <div class="q-meta"><strong>${escapeHtml(item.topic || "Question")}</strong>${continued ? "Continued" : `Question ${item.number}`}${ref}</div>
      <span class="q-marks">[${plural(marks, "mark")}]</span>
    </div>`;
  }

  function questionTextHtml(item) {
    const options = Array.isArray(item.options) && item.options.length
      ? `<ol type="A">${item.options.map((option) => `<li>${formatText(String(option))}</li>`).join("")}</ol>`
      : "";
    return `<div class="blk q-text">${formatText(item.text || "")}${options}</div>`;
  }

  function solutionBlocksHtml(item) {
    const parts = solutionParts(item.solution);
    const head = `<div class="blk s-head" data-role="s-head"><strong>Solution ${item.number}</strong><span>${escapeHtml([item.sourceRef, plural(Number(item.marks || 0), "mark")].filter(Boolean).join(" · "))}</span></div>`;
    if (!hasSolution(item.solution)) {
      return `${head}<div class="blk s-empty" data-role="s-unit">A worked solution for this question is not available yet.</div>`;
    }
    const steps = parts.steps.map((step, index) => `<div class="blk s-step" data-role="s-unit">
        <span class="s-index">${String(index + 1).padStart(2, "0")}</span>
        <div class="s-body">${step.title ? `<h4>${escapeHtml(step.title)}</h4>` : ""}<div class="s-copy">${formatText(step.body || "")}</div></div>
      </div>`).join("");
    const final = parts.finalAnswer
      ? `<div class="blk s-final" data-role="s-unit"><strong>Final answer</strong><div class="s-copy">${formatText(parts.finalAnswer)}</div></div>`
      : "";
    return `${head}${steps}${final}`;
  }

  /* ------------------------------------------------------- image analysis */

  function loadFrameImage(doc, src) {
    const img = doc.createElement("img");
    img.decoding = "sync";
    img.loading = "eager";
    img.alt = "";
    const ready = new Promise((resolve) => {
      const done = () => resolve(img);
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
      setTimeout(done, IMAGE_TIMEOUT_MS);
    });
    img.src = src;
    return ready.then(async () => {
      if (img.naturalWidth && img.decode) await img.decode().catch(() => {});
      return img;
    });
  }

  /* Row-by-row ink count. Returns null when pixels cannot be read. */
  function inkProfile(doc, img) {
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
      for (let y = 0; y < height; y += 1) {
        let count = 0;
        const offset = y * width * 4;
        for (let x = 0; x < width; x += 2) {
          const i = offset + x * 4;
          if (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114 < 228) count += 2;
        }
        rows[y] = count;
      }
      // Vertical page rules put a few dark pixels on every row; treat that
      // floor as "blank" but count even pale dotted answer lines as ink.
      const sorted = Array.from(rows).sort((a, b) => a - b);
      const floor = sorted[Math.floor(sorted.length * 0.1)] || 0;
      return { rows, width, height, blankLimit: floor + Math.max(3, Math.round(width * 0.003)) };
    } catch (error) {
      return null;
    }
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

  class Paginator {
    constructor(doc, spec, opts, report) {
      this.doc = doc;
      this.spec = spec;
      this.opts = opts;
      this.report = report;
      this.layout = LAYOUTS[opts.layout] || LAYOUTS.standard;
      this.sheetsEl = doc.getElementById("sheets");
      this.measureEl = doc.getElementById("measure");
      this.sheets = [];
      this.page = null;
      this.section = "questions";
    }

    measure(el) {
      if (el.parentNode !== this.measureEl) this.measureEl.appendChild(el);
      return outerHeight(el);
    }

    makeSheet(first) {
      const sheet = this.doc.createElement("section");
      sheet.className = "sheet";
      sheet.innerHTML = `${first ? mastheadHtml(this.spec, this.opts) : runningHeadHtml(this.spec)}<div class="sheet-body"></div>${footHtml()}`;
      this.sheetsEl.appendChild(sheet);
      const body = sheet.querySelector(".sheet-body");
      return { sheet, body, capacity: body.clientHeight - SAFETY_PX, used: 0, spaces: [], section: this.section };
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
      this.page = this.makeSheet(this.sheets.length === 0);
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
      return el;
    }

    placeQuestion(item, { withSpace }) {
      const head = fragment(this.doc, questionHeadHtml(item));
      const headH = this.measure(head);
      const layout = this.layout;
      const spaceMm = withSpace ? layout.space(Number(item.marks || 0)) : 0;
      const spaceWrapH = spaceMm ? spaceMm * MM + 1.6 * MM : 0;
      let bodyEl = null;
      let bodyH = 0;
      if (!item.imageInfo) {
        bodyEl = item.textBlock || fragment(this.doc, questionTextHtml(item));
        bodyH = this.measure(bodyEl);
      } else {
        bodyH = (item.imageInfo.end - item.imageInfo.start) * item.scale;
      }
      const need = headH + bodyH + spaceWrapH;
      if (layout.newPage && this.page.used > 0) this.newPage();

      if (need <= this.remaining()) {
        this.place(head, headH);
        this.placeBody(item, bodyEl, bodyH);
        if (spaceMm) this.placeSpace(spaceMm * MM, Number(item.marks || 0));
        return;
      }
      const fresh = this.bodyHeight;
      // Never leave the current sheet empty: if nothing is on it yet, split here instead.
      if (this.page.used > 0 && (need <= fresh || (!item.imageInfo && headH + bodyH <= fresh))) {
        this.newPage();
        this.place(head, headH);
        this.placeBody(item, bodyEl, bodyH);
        if (spaceMm) {
          const room = Math.max(0, this.remaining() - 1.6 * MM);
          this.placeSpace(Math.min(spaceMm * MM, room), Number(item.marks || 0));
        }
        return;
      }
      /* Taller than the space available: split the image at blank rows. */
      if (!item.imageInfo) {
        this.place(head, headH);
        this.placeBody(item, bodyEl, bodyH);
        this.report.overflowUnits.push(`question ${item.number}`);
        return;
      }
      if (this.page.used > 0 && (this.remaining() < 0.35 * fresh || this.remaining() < headH + 40 * MM)) this.newPage();
      this.place(head, headH);
      this.placeSplitImage(item);
      if (spaceMm) {
        const room = this.remaining() - 1.6 * MM;
        // Long questions already carry their own answer lines; add space only if it fits.
        if (room >= Math.min(spaceMm * MM, 18 * MM)) {
          this.placeSpace(Math.min(spaceMm * MM, room), Number(item.marks || 0));
        }
      }
    }

    placeBody(item, bodyEl, bodyH) {
      if (bodyEl) {
        this.place(bodyEl, bodyH);
        return;
      }
      const seg = this.imageSegmentHtml(item, item.imageInfo.start, item.imageInfo.end);
      this.place(seg, this.measure(seg));
    }

    placeSplitImage(item) {
      const info = item.imageInfo;
      const note = fragment(this.doc, `<div class="blk q-continues">Question ${item.number} continues on the next page</div>`);
      const noteH = this.measure(note);
      note.remove();
      let from = info.start;
      let guard = 0;
      while (from < info.end && guard < 40) {
        guard += 1;
        const room = this.remaining();
        const needAll = (info.end - from) * item.scale;
        if (needAll <= room) {
          const seg = this.imageSegmentHtml(item, from, info.end);
          this.place(seg, this.measure(seg));
          from = info.end;
          break;
        }
        const limit = Math.floor(from + (room - noteH) / item.scale);
        if (limit - from < 40) {
          this.newPage();
          this.placeMeasured(fragment(this.doc, questionHeadHtml(item, true)));
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
          while (from < info.end && isBlankRow(info.profile, from)) from += 1;
          from = Math.max(from - 4, cut.at);
        }
        if (from >= info.end) break;
        this.placeMeasured(fragment(this.doc, `<div class="blk q-continues">Question ${item.number} continues on the next page</div>`));
        this.newPage();
        this.placeMeasured(fragment(this.doc, questionHeadHtml(item, true)));
      }
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
        page.sheet.querySelector(".foot-page").textContent = `Page ${index + 1} of ${total}`;
        page.sheet.querySelector(".foot-mid").textContent = page.section === "solutions" ? "Worked solutions" : copyLabel(this.opts);
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

  async function renderPaper(frame, spec, opts, isCurrent = () => true) {
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
    await withTimeout(doc.fonts?.ready || Promise.resolve(), FONT_TIMEOUT_MS);

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

    /* Load every question image and read its pixels. */
    const contentWidth = measureEl.clientWidth;
    const segWidth = contentWidth - 2.5 * MM;
    const loaded = await Promise.all(items.map((item) => (item.image ? loadFrameImage(doc, item.image) : Promise.resolve(null))));
    const widths = loaded.filter((img) => img?.naturalWidth).map((img) => img.naturalWidth).sort((a, b) => a - b);
    const refWidth = widths.length ? widths[Math.min(widths.length - 1, Math.floor(widths.length * 0.75))] : 1;
    items.forEach((item, index) => {
      const img = loaded[index];
      if (!item.image) return;
      if (!img?.naturalWidth) {
        report.missingImages.push(item.sourceRef || item.id);
        item.imageInfo = null;
        item.text = item.text || `Question image could not be loaded (${item.sourceRef || item.id}).`;
        return;
      }
      const profile = inkProfile(doc, img);
      const bounds = contentBounds(profile, img.naturalHeight);
      item.displayWidth = segWidth * IMAGE_SCALE * Math.min(1, img.naturalWidth / refWidth);
      item.scale = item.displayWidth / img.naturalWidth;
      let blankTail = 0;
      if (profile) {
        for (let y = bounds.end - 1; y > bounds.start && isBlankRow(profile, y); y -= 1) blankTail += 1;
      }
      item.imageInfo = { ...bounds, profile, hasOwnSpace: blankTail * item.scale > 25 * MM };
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

    const paginator = new Paginator(doc, spec, opts, report);
    paginator.newPage();
    const inline = withSolutions && opts.placement === "inline";
    for (const item of items) {
      paginator.placeQuestion(item, { withSpace: !inline });
      if (inline) {
        paginator.gap("s-gap");
        paginator.placeSolution(item, solutionBlocks.get(item.number));
      }
      paginator.gap(inline ? "s-gap" : "q-gap");
    }
    if (withSolutions && !inline) {
      paginator.section = "solutions";
      paginator.newPage();
      paginator.placeMeasured(fragment(doc, `<div class="blk section-title">Worked solutions<small>${escapeHtml(spec.title || "")} &middot; numbered to match the questions</small></div>`));
      for (const item of items) {
        paginator.placeSolution(item, solutionBlocks.get(item.number));
        paginator.gap("s-gap");
      }
    }
    paginator.finish();
    measureEl.innerHTML = "";
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
    onClose: null
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
          <button type="button" class="eps-primary" data-act="print" disabled>Print</button>
          <button type="button" data-act="pdf" disabled>Save as PDF</button>
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
      studio.opts[control.dataset.opt] = control.type === "checkbox" ? control.checked : control.value;
      syncControls();
      rerender();
    });
    overlay.addEventListener("click", (event) => {
      const button = event.target.closest("[data-act]");
      if (!button || button.disabled) return;
      if (button.dataset.act === "close") close();
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
    studio.overlay.querySelectorAll('[data-act="print"], [data-act="pdf"]').forEach((button) => { button.disabled = true; });
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
    studio.overlay.querySelectorAll('[data-act="print"], [data-act="pdf"]').forEach((button) => { button.disabled = false; });
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
      const report = await renderPaper(studio.frame, studio.spec, { ...studio.opts }, () => token === studio.token);
      if (!report || token !== studio.token) return;
      root.ElitePaperPrint.lastReport = report;
      if (report.problems.includes("raw LaTeX") || report.problems.includes("maths error")) {
        setError("Some mathematics did not render. Check the connection, then change any option to try again.");
        return;
      }
      setReady(report);
    } catch (error) {
      if (token !== studio.token) return;
      console.error("[paper-print]", error);
      setError(`${error.message || "The paper could not be prepared."} Check the connection and try again.`);
    }
  }

  /* The finished paper as a standalone document: static HTML (maths already
     typeset as SVG), no scripts from the site, sheets at 100% zoom. */
  function standalonePaperHtml(title) {
    const doc = studio.frame.contentDocument;
    const clone = doc.documentElement.cloneNode(true);
    clone.querySelectorAll("script, .measure").forEach((node) => node.remove());
    clone.querySelector("#sheets")?.style.removeProperty("zoom");
    const titleNode = clone.querySelector("title");
    if (titleNode) titleNode.textContent = title;
    const autoprint = `<script>
      (function () {
        var printed = false;
        function go() {
          if (printed) return;
          printed = true;
          window.focus();
          window.print();
        }
        window.addEventListener("load", function () {
          var fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
          Promise.race([fonts, new Promise(function (r) { setTimeout(r, 3000); })]).then(function () { setTimeout(go, 250); });
        });
      })();
    <\/script>`;
    return `<!doctype html>${clone.outerHTML.replace("</body>", `${autoprint}</body>`)}`;
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

  /* Print and Save as PDF open the paper in its own tab and call print there.
     A top-level document is the one thing every browser prints and saves
     reliably (printing an inner frame fails on phones and in some dialogs).
     If the new tab is blocked, fall back to printing the preview frame. */
  function printFrame(kind) {
    if (!studio.ready) return;
    const title = fileNameFor(studio.spec.fileName || "Elite-Mathematics-paper", studio.opts);
    root.ElitePaperPrint.lastPrint = { kind, at: Date.now(), options: { ...studio.opts }, method: "tab" };
    let win = null;
    try {
      const url = URL.createObjectURL(new Blob([standalonePaperHtml(title)], { type: "text/html" }));
      win = window.open(url, "_blank");
      window.setTimeout(() => URL.revokeObjectURL(url), 120000);
    } catch (error) {
      win = null;
    }
    if (!win) {
      root.ElitePaperPrint.lastPrint.method = "frame";
      printInFrame(title);
      showHint("Your browser blocked a new tab, so the preview is printed directly. For a PDF choose Destination: Save as PDF.");
    } else {
      showHint(kind === "pdf"
        ? "The paper opened in a new tab. In the print dialog choose Destination: Save as PDF, then Save."
        : "The paper opened in a new tab with the print dialog. Close that tab when you are done to come back here.");
    }
    studio.overlay.querySelector(`[data-act="${kind}"]`)?.focus();
  }

  const DEFAULT_HINT = "A4 portrait, 210 × 297 mm. Print and Save as PDF open the paper in a new tab with the print dialog; keep Scale at Default (100%). For a PDF choose Destination: Save as PDF.";

  function showHint(message) {
    const hint = studio.overlay.querySelector("[data-hint]");
    if (hint) hint.textContent = message;
  }

  function fileNameFor(base, opts) {
    return `${base}${opts.version === "solutions" ? "-Solutions" : "-Student"}`;
  }

  function open(spec, options = {}) {
    if (!spec?.questions?.length) return null;
    if (!studio.overlay) buildStudio();
    studio.spec = {
      ...spec,
      fileName: spec.fileName || slug(["Elite", spec.courseCode, spec.title, spec.testCode].filter(Boolean).join(" ")) || "Elite-Mathematics-paper"
    };
    studio.opts = { ...DEFAULT_OPTIONS, ...(studio.remembered || {}), ...options };
    if (spec.allowSolutions === false) studio.opts.version = "student";
    studio.onClose = options.onClose || spec.onClose || null;
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
    isOpen: () => Boolean(studio.overlay && !studio.overlay.hidden),
    isReady: () => studio.ready,
    frame: () => studio.frame,
    options: () => ({ ...studio.opts }),
    setOptions(next) {
      Object.assign(studio.opts, next);
      syncControls();
      return rerender();
    },
    lastReport: null,
    lastPrint: null,
    _internals: { findCut, contentBounds, LAYOUTS, MM }
  };
})(window);
