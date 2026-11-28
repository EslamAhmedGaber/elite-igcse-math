/* Public assignment page (assignment.html).
   Renders the STUDENT copy of a Teacher Lesson Tracker assignment
   from the share link's URL parameters alone - no login, no
   Firestore, and NO solutions: this file never loads the bank's
   solutions data or any worked solution code. The render model
   (EliteAssignmentCore.studentPaperModel) carries display fields
   only, so there is no solution data on this page to leak.
   URL parameters are untrusted input (plan audit W5): everything
   interpolated is escaped, and the codec validates strictly. */
(function () {
  "use strict";

  const Core = window.EliteAssignmentCore;
  const stateEl = document.getElementById("asgPageState");
  const paperEl = document.getElementById("asgPagePaper");
  const printBtn = document.getElementById("asgPagePrint");

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
  }

  function formatDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return "";
    const date = new Date(`${value}T12:00:00Z`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  }

  function showError(title, message) {
    stateEl.innerHTML = `
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(message)}</p>
      <p>Ask your teacher to send the assignment link again.</p>`;
    stateEl.hidden = false;
    paperEl.hidden = true;
    printBtn.disabled = true;
  }

  function render(model) {
    const meta = window.EliteAssignments.COURSE_META[model.courseId] || {};
    const layout = Core.layoutFor(model.layout);
    const parts = model.questions.map((q, i) => {
      const space = Core.spaceMm(layout.key, q.marks);
      return `
      <article class="asg-q">
        <header class="asg-q-head">
          <span class="asg-qno">${i + 1}.</span>
          <span class="asg-qmeta">${escapeHtml(q.paper || "")}${q.qno ? ` &middot; Question ${q.qno}` : ""} &middot; ${escapeHtml(q.topic || "")}</span>
          <span class="asg-qmarks">(${q.marks} mark${q.marks === 1 ? "" : "s"})</span>
        </header>
        ${q.image ? `<img class="asg-qimg" src="${escapeHtml(q.image)}" alt="Question ${i + 1} from ${escapeHtml(q.paper || "a past paper")}">` : ""}
        ${space > 0 ? `<div class="asg-space" style="height:${space}mm" aria-hidden="true"></div>` : ""}
      </article>`;
    });
    const gap = layout.gap > 0 && parts.length > 1
      ? `<div class="asg-gap" style="height:${layout.gap}mm" aria-hidden="true"></div>`
      : "";
    paperEl.innerHTML = `
      <div class="asg-sheet is-student is-layout-${layout.key}">
        <header class="asg-paper-head">
          <p class="asg-brand">Elite IGCSE <span>Maths, mastered step by step.</span></p>
          <h1>Assignment</h1>
          <div class="asg-paper-meta">
            ${model.name ? `<p><b>Name:</b> ${escapeHtml(model.name)}</p>` : ""}
            <p><b>Course:</b> ${escapeHtml(meta.label || model.courseId)}</p>
            ${model.date ? `<p><b>Date:</b> ${escapeHtml(formatDate(model.date))}</p>` : ""}
            <p><b>Topics:</b> ${escapeHtml(model.topics.join(", "))}</p>
            <p><b>Total:</b> ${model.totalMarks} marks &middot; <b>Time:</b> about ${model.estMinutes} minutes (${Core.MINUTES_PER_MARK} min per mark)</p>
          </div>
          <p class="asg-instructions">${layout.key === "compact" ? "Answer all questions on separate paper. Show your working clearly." : "Answer all questions. Show your working clearly in the spaces provided."}</p>
          ${model.missing ? `<p class="asg-missing">${model.missing} question${model.missing === 1 ? "" : "s"} from this assignment could not be found in the current question bank and ${model.missing === 1 ? "is" : "are"} not shown - tell your teacher.</p>` : ""}
        </header>
        ${parts.join(gap)}
        <footer class="asg-paper-foot">Elite IGCSE Mathematics - Dr Eslam Ahmed &middot; eliteigcse.com</footer>
      </div>`;
    stateEl.hidden = true;
    paperEl.hidden = false;
    printBtn.disabled = false;
    printBtn.textContent = "Open the exam paper · Download PDF";
    document.title = `Assignment${model.name ? ` for ${model.name}` : ""} | Elite IGCSE`;
  }

  async function init() {
    if (!Core || !window.EliteAssignments) {
      showError("The assignment could not be opened", "The page did not load completely. Check your connection and refresh.");
      return;
    }
    const decoded = Core.parseShareQuery(window.location.search, Object.keys(window.EliteAssignments.COURSE_META));
    if (decoded.error) {
      showError("This assignment link is not complete", decoded.error);
      return;
    }
    let index;
    try {
      index = await window.EliteAssignments.loadBank(decoded.courseId);
    } catch (error) {
      showError("The assignment could not be loaded", "The question bank did not load. Check your connection and refresh the page.");
      return;
    }
    const model = Core.studentPaperModel(index, decoded);
    if (!model.questions.length) {
      showError("None of the questions in this link could be found", "The link may be out of date.");
      return;
    }
    current = { model, index, decoded };
    render(model);
    /* Open straight in the mock-exam paper design (same A4 engine,
       cover and Download PDF as the mocks). The plain copy below stays
       as the fallback and behind the paper when it is closed. */
    openPaperEngine().catch(() => {});
  }

  /* Print once question images have settled, like the tracker
     preview, so the PDF never misses a diagram. */
  let current = null; // { model, index, decoded }

  /* Same A4 exam-paper engine as the mock exams (student copy only:
     the public page never offers solutions). Falls back to the
     browser print of the on-page copy if the engine cannot load. */
  async function openPaperEngine() {
    if (!current || !window.EliteAssignments.ensurePaperEngine) return false;
    if (!(await window.EliteAssignments.ensurePaperEngine())) return false;
    const { model, index } = current;
    let hash = 0;
    model.questions.map((q) => q.id).join(",").split("").forEach((ch) => { hash = (hash * 31 + ch.charCodeAt(0)) >>> 0; });
    const record = {
      id: `asg-${hash.toString(36)}`,
      date: model.date,
      questionIds: model.questions.map((q) => q.id),
      estMinutes: model.estMinutes,
      layout: model.layout
    };
    const ctx = { courseId: model.courseId, name: model.name };
    const bands = (window.EliteAssignments.COURSE_META[model.courseId] || {}).family === "ial" ? Core.BANDS.ial : Core.BANDS.igcse;
    const spec = window.EliteAssignments.assignmentPaperSpec(ctx, record, index, bands, { allowSolutions: false });
    window.ElitePaperPrint.open(spec, { version: "student", layout: Core.layoutFor(model.layout).key });
    return true;
  }

  printBtn.addEventListener("click", async () => {
    if (await openPaperEngine()) return;
    const images = [...paperEl.querySelectorAll("img")].filter((img) => !img.complete);
    if (images.length) {
      await Promise.race([
        Promise.all(images.map((img) => new Promise((resolve) => {
          img.addEventListener("load", resolve, { once: true });
          img.addEventListener("error", resolve, { once: true });
        }))),
        new Promise((resolve) => setTimeout(resolve, 4000))
      ]);
    }
    window.print();
  });

  init();
})();
