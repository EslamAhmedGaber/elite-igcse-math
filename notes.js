(function () {
  const root = document.querySelector("[data-linear-notes-root]");
  const data = window.ELITE_LINEAR_NOTES;
  if (!root || !data) return;

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function pdfButton(href, label, extraClass = "primary") {
    return `<a class="button ${extraClass}" href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`;
  }

  function practiceButton(href, label = "Practice") {
    return `<a class="button light" href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
  }

  function topicCard(topic) {
    return `
      <article class="note-card linear-topic-note">
        <div class="linear-note-head">
          <span>${escapeHtml(topic.number)}</span>
          <strong>${escapeHtml(topic.title)}</strong>
        </div>
        <p>${escapeHtml(topic.focus)}</p>
        <ul>
          <li>${escapeHtml(topic.pages)} pages</li>
          <li>${topic.practiceLabel === "Practice topic" ? "matched practice" : "course practice"}</li>
        </ul>
        <div class="note-actions">
          ${pdfButton(topic.href, "Open notes")}
          ${practiceButton(topic.practiceHref, topic.practiceLabel)}
        </div>
      </article>
    `;
  }

  function chapterCard(chapter) {
    return `
      <article class="note-card linear-chapter-card">
        <span class="note-status">Chapter ${escapeHtml(chapter.number)}</span>
        <strong>${escapeHtml(chapter.short)}</strong>
        <p>${escapeHtml(chapter.detail)}.</p>
        <ul>
          <li>${escapeHtml(chapter.topics.length)} topics</li>
          <li>${escapeHtml(chapter.pages)} pages</li>
        </ul>
        <div class="note-actions">
          ${pdfButton(chapter.href, "Chapter book")}
          <a class="button light" href="#${escapeHtml(chapter.id)}">Topic notes</a>
        </div>
      </article>
    `;
  }

  function chapterGroup(chapter) {
    return `
      <section class="notes-chapter-group" id="${escapeHtml(chapter.id)}" aria-labelledby="${escapeHtml(chapter.id)}Title">
        <div class="notes-chapter-heading">
          <div>
            <span class="eyebrow">Chapter ${escapeHtml(chapter.number)}</span>
            <h3 id="${escapeHtml(chapter.id)}Title">${escapeHtml(chapter.title)}</h3>
            <p>${escapeHtml(chapter.detail)}.</p>
          </div>
          ${chapter.href ? pdfButton(chapter.href, "Download chapter", "solution") : ""}
        </div>
        <div class="notes-grid notes-topic-grid">
          ${chapter.topics.map(topicCard).join("")}
        </div>
      </section>
    `;
  }

  const totalTopics = data.chapters.reduce((sum, chapter) => sum + chapter.topics.length, 0);
  const totalChapterPages = data.chapters.reduce((sum, chapter) => sum + Number(chapter.pages || 0), 0);
  const chapterBooks = data.chapters.filter((chapter) => chapter.href);
  const feature = data.booklet ? `
    <article class="linear-notes-feature">
      <div>
        <span class="eyebrow">Complete booklet</span>
        <h3>${escapeHtml(data.booklet.title)}</h3>
        <p>${escapeHtml(data.booklet.detail)}. The full set is ${escapeHtml(data.booklet.pages)} pages, with chapter books below for smaller printing.</p>
        <div class="linear-notes-stats" aria-label="Linear notes summary">
          <span><strong>${escapeHtml(totalTopics)}</strong> topic notes</span>
          <span><strong>${escapeHtml(chapterBooks.length)}</strong> chapter books</span>
          <span><strong>${escapeHtml(totalChapterPages)}</strong> chapter pages</span>
        </div>
      </div>
      <div class="note-actions">
        ${(data.booklet.parts || [{ href: data.booklet.href }]).map((part, index, all) => pdfButton(part.href, all.length > 1 ? `Complete book part ${index + 1}` : "Download full booklet")).join("")}
        ${practiceButton("practice.html?pathway=linear&bank=all", "Open classified bank")}
      </div>
    </article>` : `
    <article class="linear-notes-feature">
      <div>
        <span class="eyebrow">Current release</span>
        <h3>Topic-by-topic visual notes</h3>
        <p>${escapeHtml(data.releaseStatus?.message || "New visual notes are being released by topic.")}</p>
        <div class="linear-notes-stats" aria-label="Linear notes summary">
          <span><strong>${escapeHtml(totalTopics)}</strong> topic notes</span>
          <span><strong>${escapeHtml(chapterBooks.length)}</strong> chapter books</span>
          <span><strong>${escapeHtml(totalChapterPages)}</strong> pages</span>
        </div>
      </div>
    </article>`;

  root.innerHTML = `
    <div class="notes-section-head">
      <span class="eyebrow">${escapeHtml(data.code)} notes with answers</span>
      <h2 id="linearNotesTitle">${escapeHtml(data.title)}</h2>
      <p>${escapeHtml(data.intro)}</p>
    </div>

    ${feature}

    ${chapterBooks.length ? `<div class="notes-grid notes-chapter-grid" aria-label="Linear chapter booklets">${chapterBooks.map(chapterCard).join("")}</div>` : ""}

    <div class="notes-chapter-groups">
      ${data.chapters.map(chapterGroup).join("")}
    </div>
  `;
})();
