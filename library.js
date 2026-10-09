(function () {
  const root = document.querySelector("[data-library-root]");
  const data = window.ELITE_LIBRARY;
  if (!root || !data) return;

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
    const complete = n.complete && n.complete.length ? `
      <article class="lib-block">
        <h3>Complete Book</h3>
        <p class="lib-note">All ${c.id === "linear" ? "58" : esc((n.topics || []).length)} topics: notes, worked examples and practice, with the answers at the end of each topic.${n.complete.length > 1 ? " Split into parts so each file opens quickly." : ""}</p>
        <ul class="lib-list">${partRows(n.complete, "With Answers")}</ul>
      </article>`
      : n.releaseStatus ? `
      <article class="lib-block">
        <h3>New Visual Notes</h3>
        <p class="lib-note">${esc(n.releaseStatus.message)}</p>
      </article>` : "";
    let chapters = "";
    let topics = "";
    if (n.chapters) {
      const chaptersWithBooks = n.chapters.filter((ch) => ch.booklet);
      chapters = chaptersWithBooks.length ? `
      <article class="lib-block">
        <h3>By Chapter</h3>
        <ul class="lib-list">${chaptersWithBooks.map((ch) => `
          <li class="lib-row">
            <span class="lib-row-title"><b class="lib-num">${esc(ch.number)}</b><strong>${esc(ch.title)}</strong>
            <small>${esc(ch.topics.length)} topics · ${size(ch.booklet)}</small></span>
            ${actions(ch.booklet, "With Answers")}
          </li>`).join("")}</ul>
      </article>` : "";
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
          <small>${t.status ? esc(t.status) : size(t)}</small></span>
          ${t.href ? actions(t, "") : `<span class="lib-missing">${esc(t.status || "In preparation")}</span>`}
        </li>`).join("")}</ul>`;
  }

  function jumpToHash() {
    const target = window.location.hash && document.querySelector(window.location.hash);
    if (target) target.scrollIntoView();
  }

  function renderLibrary() {
    const c = data.courses[currentCourse()];
    document.title = `${c.name} Notes | Elite IGCSE Mathematics`;

    root.innerHTML = `
      <section class="lib-hero">
        <div>
          <span class="lib-eyebrow">${esc(c.family)} · ${esc(c.code)}</span>
          <h1>${esc(c.name)} Notes</h1>
          <p>Topic-by-topic visual notes, worked examples and answers.</p>
        </div>
      </section>
      ${notesSection(c)}
    `;
    jumpToHash();
  }

  renderLibrary();
  window.addEventListener("hashchange", renderLibrary);
  window.addEventListener("load", () => setTimeout(jumpToHash, 350), { once: true });
})();
