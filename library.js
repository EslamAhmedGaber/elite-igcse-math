(function () {
  const root = document.querySelector("[data-library-root]");
  const data = window.ELITE_LIBRARY;
  if (!root || !data) return;

  const ORDER = ["linear", "unit1", "unit2", "wma11", "wma12", "wme01"];
  const LINKS = {
    linear: "pathway=linear",
    unit1: "pathway=modular&unit=Unit+1",
    unit2: "pathway=modular&unit=Unit+2",
    wma11: "pathway=pure&course=wma11",
    wma12: "pathway=pure&course=wma12",
    wme01: "pathway=pure&course=wme01",
  };
  const CLASSIFIED = {
    linear: "downloads.html?pathway=linear",
    unit1: "downloads.html?pathway=modular&unit=Unit+1",
    unit2: "downloads.html?pathway=modular&unit=Unit+2",
    wma11: "ial/wma11/index.html",
    wma12: "ial/wma12/index.html",
    wme01: "ial/wme01/index.html",
  };

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function currentCourse() {
    const url = new URL(window.location.href);
    const course = (url.searchParams.get("course") || "").toLowerCase();
    if (data.courses[course]) return course;
    const unit = (url.searchParams.get("unit") || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (unit === "unit1" || unit === "4wm1") return "unit1";
    if (unit === "unit2" || unit === "4wm2") return "unit2";
    return "linear";
  }

  function fileName(href) {
    return decodeURIComponent(String(href).split("?")[0].split("/").pop());
  }

  function actions(file, label) {
    if (!file) return `<span class="lib-missing">Not available</span>`;
    const tag = label ? `<span class="lib-kind">${esc(label)}</span>` : "";
    return `<span class="lib-actions">${tag}
      <a class="lib-btn" href="${esc(file.href)}" target="_blank" rel="noreferrer">Preview</a>
      <a class="lib-btn lib-btn-dl" href="${esc(file.href)}" download="${esc(fileName(file.href))}">Download</a>
    </span>`;
  }

  function size(file) {
    return file ? `${esc(file.pages)} pages · ${esc(file.mb)} MB` : "";
  }

  function partRows(parts, label) {
    return parts.map((p, i) => `
      <li class="lib-row">
        <span class="lib-row-title"><strong>${parts.length > 1 ? `Part ${i + 1} of ${parts.length}` : "Complete book"}</strong>
        <small>${esc(p.range || "")}${p.range ? " · " : ""}${size(p)}</small></span>
        ${actions(p, label)}
      </li>`).join("");
  }

  function notesSection(c) {
    const n = c.notes;
    const complete = `
      <article class="lib-block">
        <h3>Complete Book</h3>
        <p class="lib-note">All ${c.id === "linear" ? "58" : esc((n.topics || []).length)} topics: notes, worked examples and practice, with the answers at the end of each topic.${n.complete.length > 1 ? " Split into parts so each file opens quickly." : ""}</p>
        <ul class="lib-list">${partRows(n.complete, "With Answers")}</ul>
      </article>`;
    let chapters = "";
    let topics = "";
    if (n.chapters) {
      chapters = `
      <article class="lib-block">
        <h3>By Chapter</h3>
        <ul class="lib-list">${n.chapters.map((ch) => `
          <li class="lib-row">
            <span class="lib-row-title"><b class="lib-num">${esc(ch.number)}</b><strong>${esc(ch.title)}</strong>
            <small>${esc(ch.topics.length)} topics · ${size(ch.booklet)}</small></span>
            ${actions(ch.booklet, "With Answers")}
          </li>`).join("")}</ul>
      </article>`;
      topics = n.chapters.map((ch) => topicList(`Chapter ${ch.number} · ${ch.title}`, ch.topics)).join("");
      topics = `<article class="lib-block"><h3>By Topic</h3>${topics}</article>`;
    } else {
      topics = `<article class="lib-block"><h3>By Topic</h3>${topicList("", n.topics)}</article>`;
    }
    return `
      <section class="lib-section" id="notes" aria-labelledby="notesTitle">
        <div class="lib-section-head">
          <span class="lib-eyebrow">Notes</span>
          <h2 id="notesTitle">${esc(c.name)} Notes</h2>
          <p>Every file includes the answers.</p>
        </div>
        ${complete}${chapters}${topics}
      </section>`;
  }

  function topicList(heading, list) {
    return `${heading ? `<h4 class="lib-subhead">${esc(heading)}</h4>` : ""}
      <ul class="lib-list">${list.map((t) => `
        <li class="lib-row">
          <span class="lib-row-title"><b class="lib-num">${esc(t.num)}</b><strong>${esc(t.title)}</strong>
          <small>${size(t)}</small></span>
          ${actions(t, "")}
        </li>`).join("")}</ul>`;
  }

  function adaptiveSection(c) {
    const a = c.adaptive;
    const unitWord = c.unit === "Chapter" ? "Chapter" : "Topic";
    const pair = (q, ans) => `<div class="lib-pair">${actions(q, "Questions")}${actions(ans, "With Answers")}</div>`;
    const comp = a.complete;
    const nParts = Math.max(comp.questions.length, comp.answers.length);
    const compRows = [];
    for (let i = 0; i < nParts; i += 1) {
      const q = comp.questions[i];
      const ans = comp.answers[i];
      compRows.push(`<li class="lib-row lib-row-pair">
        <span class="lib-row-title"><strong>${nParts > 1 ? `Part ${i + 1} of ${nParts}` : "Complete book"}</strong>
        <small>${esc((q || ans || {}).range || `All ${a.items.length} ${unitWord.toLowerCase()}s`)}${q ? ` · questions ${esc(q.pages)} pages` : ""}${ans ? ` · answers ${esc(ans.pages)} pages` : ""}</small></span>
        ${pair(q, ans)}
      </li>`);
    }
    // the Questions and With Answers books may be split differently; list each side's parts if so
    let compList = compRows.join("");
    if (comp.questions.length !== comp.answers.length) {
      compList = `<li class="lib-row"><span class="lib-row-title"><strong>Questions</strong></span></li>${partRows(comp.questions, "Questions")}
        <li class="lib-row"><span class="lib-row-title"><strong>With Answers</strong></span></li>${partRows(comp.answers, "With Answers")}`;
    }
    return `
      <section class="lib-section lib-adaptive" id="adaptive" aria-labelledby="adaptiveTitle">
        <div class="lib-section-head">
          <span class="lib-eyebrow">Adaptive Classified</span>
          <h2 id="adaptiveTitle">${esc(c.name)} Adaptive Classified</h2>
          <p>Past-paper questions grouped by idea, easier to harder. <strong>Questions</strong> = student book with writing space.
          <strong>With Answers</strong> = every question with its full worked solution.${c.coverage ? ` <span class="lib-coverage">${esc(c.coverage)}.</span>` : ""}</p>
        </div>
        <article class="lib-block">
          <h3>Complete Book</h3>
          <ul class="lib-list">${compList}</ul>
        </article>
        <article class="lib-block">
          <h3>By ${unitWord}</h3>
          <ul class="lib-list">${a.items.map((it) => `
            <li class="lib-row lib-row-pair">
              <span class="lib-row-title"><b class="lib-num">${esc(it.num)}</b><strong>${esc(it.title)}</strong>
              <small>${it.questions ? esc(it.questions.pages) + " pages" : ""}${it.answers ? " · answers " + esc(it.answers.pages) + " pages" : ""}</small></span>
              ${pair(it.questions, it.answers)}
            </li>`).join("")}</ul>
        </article>
        <p class="lib-foot">The regular Classified and Expertise books are still in <a href="${esc(CLASSIFIED[c.id])}">${esc(c.name)} Books</a>.</p>
      </section>`;
  }

  const id = currentCourse();
  const c = data.courses[id];
  document.title = `${c.name} Notes & Adaptive Classified - Elite IGCSE Mathematics`;

  const switcher = ORDER.map((key) => {
    const k = data.courses[key];
    const active = key === id ? ' aria-current="page" class="is-active"' : "";
    return `<a href="library.html?${LINKS[key]}${window.location.hash || ""}"${active}><strong>${esc(k.name)}</strong><small>${esc(k.code)}</small></a>`;
  }).join("");

  root.innerHTML = `
    <section class="lib-hero">
      <div>
        <span class="lib-eyebrow">${esc(c.family)} · ${esc(c.code)}</span>
        <h1>${esc(c.name)}</h1>
        <p>Choose a book, then Preview or Download.</p>
      </div>
      <nav class="lib-jump" aria-label="Sections">
        <a href="#notes">Notes</a>
        <a href="#adaptive">Adaptive Classified</a>
      </nav>
    </section>
    <nav class="lib-courses" aria-label="Change course">${switcher}</nav>
    ${notesSection(c)}
    ${adaptiveSection(c)}
  `;
  // the shared course bar is inserted above this page after load, so jump to #notes / #adaptive once it has settled
  function jumpToHash() {
    const target = window.location.hash && document.querySelector(window.location.hash);
    if (target) target.scrollIntoView();
  }
  jumpToHash();
  window.addEventListener("load", () => setTimeout(jumpToHash, 350), { once: true });
})();
