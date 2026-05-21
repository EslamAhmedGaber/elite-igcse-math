(function () {
  const triggers = window.TRIGGER_NOTES_DATA || [];
  const questions = window.QUESTION_DATA || [];
  const els = {
    categorySelect: document.getElementById("triggerCategorySelect"),
    keywordSelect: document.getElementById("triggerKeywordSelect"),
    triggerDetails: document.getElementById("triggerDetails"),
    triggerGallery: document.getElementById("triggerGallery"),
    triggerCount: document.getElementById("triggerCount"),
    categoryCount: document.getElementById("triggerCategoryCount"),
    topicCount: document.getElementById("triggerTopicCount")
  };

  if (!els.categorySelect || !els.keywordSelect || !els.triggerDetails) return;

  const topicCounts = questions.reduce((map, question) => {
    if (!question.topic) return map;
    map.set(question.topic, (map.get(question.topic) || 0) + 1);
    return map;
  }, new Map());

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));
  }

  function unique(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function practiceUrl(topic, extra = {}) {
    const params = new URLSearchParams({ topic });
    Object.entries(extra).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return `practice.html?${params.toString()}`;
  }

  function selectedCategory() {
    return els.categorySelect.value || "All";
  }

  function triggersForCategory(category = selectedCategory()) {
    return category === "All" ? triggers : triggers.filter((trigger) => trigger.category === category);
  }

  function populateCategories() {
    const categories = ["All", ...unique(triggers.map((trigger) => trigger.category)).sort()];
    els.categorySelect.innerHTML = categories.map((category) =>
      `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`
    ).join("");
  }

  function populateKeywords(preferredId = "") {
    const current = triggersForCategory();
    els.keywordSelect.innerHTML = current.map((trigger) =>
      `<option value="${escapeHtml(trigger.id)}">${escapeHtml(trigger.keyword)}</option>`
    ).join("");
    const preferred = current.find((trigger) => trigger.id === preferredId) || current[0];
    if (preferred) els.keywordSelect.value = preferred.id;
  }

  function statLabel(topic) {
    const count = topicCounts.get(topic) || 0;
    return count ? `${count} questions` : "Practice set";
  }

  function renderTrigger(trigger) {
    if (!trigger) {
      els.triggerDetails.innerHTML = `<p>No trigger selected.</p>`;
      return;
    }

    const aliases = trigger.aliases?.length
      ? `<div class="trigger-tags">${trigger.aliases.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>`
      : "";

    const topicLinks = trigger.topics.map((topic) => `
      <a class="trigger-topic-link" href="${practiceUrl(topic)}">
        <strong>${escapeHtml(topic)}</strong>
        <span>${escapeHtml(statLabel(topic))}</span>
      </a>
    `).join("");

    const primaryTopic = trigger.topics[0] || "";
    const q20Link = primaryTopic ? practiceUrl(primaryTopic, { bank: "expertise", mode: "q20" }) : "practice.html?bank=expertise";

    els.triggerDetails.innerHTML = `
      <article class="trigger-card-main">
        <div class="trigger-card-head">
          <div>
            <span class="eyebrow">${escapeHtml(trigger.category)}</span>
            <h2>${escapeHtml(trigger.keyword)}</h2>
            <p>${escapeHtml(trigger.hint)}</p>
          </div>
          <div class="trigger-mini-stat">
            <strong>${trigger.topics.reduce((sum, topic) => sum + (topicCounts.get(topic) || 0), 0) || "Ready"}</strong>
            <span>linked questions</span>
          </div>
        </div>
        ${aliases}
        <div class="trigger-columns">
          <section>
            <h3>Immediate move</h3>
            <ol>${trigger.moves.map((move) => `<li>${escapeHtml(move)}</li>`).join("")}</ol>
          </section>
          <section>
            <h3>Common traps</h3>
            <ul>${trigger.traps.map((trap) => `<li>${escapeHtml(trap)}</li>`).join("")}</ul>
          </section>
        </div>
        <section class="trigger-phrases">
          <h3>Typical exam wording</h3>
          <div>${trigger.phrases.map((phrase) => `<span>${escapeHtml(phrase)}</span>`).join("")}</div>
        </section>
        <section class="trigger-practice">
          <div>
            <h3>Practise this trigger</h3>
            <p>Open a linked topic, solve a short set, then check the worked solutions only after trying.</p>
          </div>
          <div class="trigger-topic-grid">${topicLinks}</div>
        </section>
        <div class="trigger-actions">
          <a class="button primary" href="${primaryTopic ? practiceUrl(primaryTopic) : "practice.html"}">Start practice</a>
          <a class="button light" href="${q20Link}">Try Q20+ version</a>
          <a class="button light" href="notes.html">Open visual notes</a>
        </div>
      </article>
    `;
  }

  function renderGallery() {
    const current = triggersForCategory();
    els.triggerGallery.innerHTML = current.map((trigger) => `
      <button type="button" class="trigger-chip" data-trigger-id="${escapeHtml(trigger.id)}">
        <span>${escapeHtml(trigger.category)}</span>
        <strong>${escapeHtml(trigger.keyword)}</strong>
      </button>
    `).join("");
  }

  function updateStats() {
    const categories = unique(triggers.map((trigger) => trigger.category));
    const linkedTopics = unique(triggers.flatMap((trigger) => trigger.topics));
    els.triggerCount.textContent = triggers.length;
    els.categoryCount.textContent = categories.length;
    els.topicCount.textContent = linkedTopics.length;
  }

  function selectTrigger(id, pushState = true) {
    const trigger = triggers.find((item) => item.id === id) || triggersForCategory()[0];
    if (!trigger) return;
    els.keywordSelect.value = trigger.id;
    renderTrigger(trigger);
    document.querySelectorAll(".trigger-chip").forEach((chip) => {
      chip.classList.toggle("active", chip.dataset.triggerId === trigger.id);
    });
    if (pushState) {
      const params = new URLSearchParams(window.location.search);
      params.set("trigger", trigger.id);
      params.set("category", selectedCategory());
      history.replaceState(null, "", `${location.pathname}?${params.toString()}`);
    }
  }

  function initialise() {
    populateCategories();
    updateStats();
    const params = new URLSearchParams(window.location.search);
    const category = params.get("category");
    if (category && [...els.categorySelect.options].some((option) => option.value === category)) {
      els.categorySelect.value = category;
    }
    populateKeywords(params.get("trigger") || "");
    renderGallery();
    selectTrigger(els.keywordSelect.value, false);
  }

  els.categorySelect.addEventListener("change", () => {
    populateKeywords();
    renderGallery();
    selectTrigger(els.keywordSelect.value);
  });

  els.keywordSelect.addEventListener("change", () => {
    selectTrigger(els.keywordSelect.value);
  });

  els.triggerGallery.addEventListener("click", (event) => {
    const button = event.target.closest("[data-trigger-id]");
    if (!button) return;
    selectTrigger(button.dataset.triggerId);
    els.triggerDetails.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  initialise();
})();
