(() => {
  const root = document.querySelector("[data-classified-root]");
  const catalog = window.ELITE_CLASSIFIED_2026;
  if (!root || !catalog) return;
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
  const query = new URLSearchParams(location.search);
  const unit = (query.get("unit") || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const selected = catalog.courses[query.get("course")] ? query.get("course")
    : ["unit1", "4wm1"].includes(unit) ? "unit1" : ["unit2", "4wm2"].includes(unit) ? "unit2" : "linear";
  const course = catalog.courses[selected];
  const params = (id) => id === "linear" ? "pathway=linear" : `pathway=modular&unit=Unit+${id === "unit1" ? "1" : "2"}`;
  const size = (book) => `${book.pages.toLocaleString("en-GB")} pages &middot; ${book.mb} MB`;
  const download = (book, title) => `<a class="lib-btn lib-btn-dl" href="${esc(book.href)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(`Download ${title} PDF`)}">Download PDF</a>`;
  const row = (book, title, num = "", attrs = "") => `<li class="lib-row" ${attrs}>
    <span class="lib-row-title">${num ? `<b class="lib-num">${esc(num)}</b>` : ""}<strong>${esc(title)}</strong><small>${size(book)}</small></span>
    <span class="lib-actions">${download(book, title)}</span></li>`;
  document.title = `${course.name} | 2026 Classified + Practice | Elite Mathematics`;
  root.innerHTML = `
    <section class="lib-hero"><div><span class="lib-eyebrow">${esc(course.code)} &middot; Student edition &middot; 2026</span>
    <h1>${esc(course.name)} Classified + Practice</h1><p>Practice questions, past-paper questions and topic answer keys.</p></div></section>
    <nav class="lib-courses" aria-label="Choose course">${Object.values(catalog.courses).map((c) => `<a href="classified-books.html?${params(c.id)}" ${c.id === selected ? 'class="is-active" aria-current="page"' : ""}><strong>${esc(c.name)}</strong><small>${esc(c.code)}</small></a>`).join("")}</nav>
    <p class="lib-foot"><a href="downloads.html?${params(selected)}">All book editions</a> &middot; <a href="library.html?${params(selected)}#notes">Notes</a></p>
    ${selected !== "linear" ? '<p class="lib-note">Linear topic books matched to this Modular unit.</p>' : ""}
    <section class="lib-section" id="complete"><div class="lib-section-head"><h2>Complete book</h2></div>
      <ul class="lib-list">${row(course.complete, `${course.name} - all ${course.topics.length} topics`)}</ul></section>
    <section class="lib-section" id="chapters"><div class="lib-section-head"><h2>By chapter</h2></div>
      <ul class="lib-list">${course.chapters.map((ch) => row(ch.book, ch.title, ch.number)).join("")}</ul></section>
    <section class="lib-section" id="topics"><div class="lib-section-head"><h2>By topic</h2></div>
      <div class="classified-filters"><label>Search topics<input type="search" data-topic-search placeholder="Topic name or OL-T code" autocomplete="off"></label>
      <label>Chapter<select data-chapter-filter><option value="">All chapters</option>${course.chapters.map((ch) => `<option value="${ch.number}">${ch.number}. ${esc(ch.title)}</option>`).join("")}</select></label></div>
      <p class="classified-count" data-topic-count aria-live="polite"></p>
      ${course.chapters.map((ch) => `<details open data-topic-group="${ch.number}"><summary>Chapter ${ch.number} &middot; ${esc(ch.title)}</summary>
      <ul class="lib-list">${ch.topics.map((t) => row(t, t.title, t.num, `data-topic-row data-chapter="${ch.number}" data-search="${esc(`${t.id} ${t.title}`.toLowerCase())}"`)).join("")}</ul></details>`).join("")}
      <p data-topic-empty hidden>No matching topics.</p>
    </section>`;
  const search = root.querySelector("[data-topic-search]");
  const chapter = root.querySelector("[data-chapter-filter]");
  const filter = () => {
    const terms = search.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
    let count = 0;
    root.querySelectorAll("[data-topic-row]").forEach((item) => {
      item.hidden = !terms.every((term) => item.dataset.search.includes(term)) || (chapter.value && item.dataset.chapter !== chapter.value);
      if (!item.hidden) count++;
    });
    root.querySelectorAll("[data-topic-group]").forEach((group) => {
      group.hidden = ![...group.querySelectorAll("[data-topic-row]")].some((item) => !item.hidden);
    });
    root.querySelector("[data-topic-count]").textContent = `${count} of ${course.topics.length} topics`;
    root.querySelector("[data-topic-empty]").hidden = count !== 0;
  };
  search.addEventListener("input", filter);
  chapter.addEventListener("change", filter);
  filter();
})();
