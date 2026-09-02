(function () {
  "use strict";

  const manifestUrl = "downloads/EgyptianBaccalaureate/2026/English/manifest.json?v=egyptian-bacc-20260902";
  const content = document.querySelector("[data-bacc-content]");
  const search = document.querySelector("[data-bacc-search]");
  const edition = document.querySelector("[data-bacc-edition]");
  const result = document.querySelector("[data-bacc-result]");
  let files = [];

  const esc = (value) => String(value ?? "").replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
  const label = (scope) => ({ cover: "Covers", complete: "Complete books", part: "Parts", chapter: "Chapters", concept: "Concepts" }[scope] || scope);
  const editionLabel = (value) => value === "student" ? "Student Edition" : "Teacher Edition";
  const sectionOrder = ["complete", "part", "chapter", "concept", "cover"];

  function card(file) {
    const title = file.title || file.id || "Public PDF";
    const detail = [editionLabel(file.edition), file.pages ? `${file.pages} pages` : "PDF"].join(" · ");
    const href = `${file.path}?v=egyptian-bacc-20260902`;
    return `<article class="bacc-card" data-edition="${esc(file.edition)}" data-search="${esc(`${title} ${file.id} ${file.scope} ${file.edition}`.toLowerCase())}"><span class="kicker">${esc(label(file.scope))}</span><strong>${esc(title)}</strong><p>${esc(detail)}</p><span class="meta">Open in a new tab for reading or download.</span><a href="${esc(href)}" target="_blank" rel="noreferrer">Open PDF →</a></article>`;
  }

  function render() {
    const query = String(search?.value || "").trim().toLowerCase();
    const selectedEdition = edition?.value || "";
    const filtered = files.filter((file) => (!selectedEdition || file.edition === selectedEdition) && (!query || `${file.title} ${file.id} ${file.scope} ${file.edition}`.toLowerCase().includes(query)));
    const groups = new Map();
    filtered.forEach((file) => { if (!groups.has(file.scope)) groups.set(file.scope, []); groups.get(file.scope).push(file); });
    content.innerHTML = sectionOrder.filter((scope) => groups.has(scope)).map((scope) => `<section class="bacc-section"><h2>${esc(label(scope))} <small>${groups.get(scope).length} files</small></h2><div class="bacc-grid">${groups.get(scope).map(card).join("")}</div></section>`).join("") || `<div class="bacc-empty">No public books match this filter.</div>`;
    if (result) result.textContent = `${filtered.length} public PDF${filtered.length === 1 ? "" : "s"} shown`;
  }

  async function load() {
    try {
      const response = await fetch(manifestUrl, { cache: "no-store" });
      if (!response.ok) throw new Error(`Manifest request failed (${response.status})`);
      const manifest = await response.json();
      files = Array.isArray(manifest.files) ? manifest.files : [];
      const concepts = new Set(files.filter((file) => file.scope === "concept").map((file) => file.id));
      document.querySelector('[data-stat="pdfs"]').textContent = String(files.length);
      document.querySelector('[data-stat="concepts"]').textContent = String(concepts.size);
      const questionCount = manifest.question_bank?.record_count;
      document.querySelector('[data-stat="questions"]').textContent = questionCount ? String(questionCount) : "—";
      render();
    } catch (error) {
      console.error("[baccalaureate-downloads]", error);
      if (result) result.textContent = "The public book map could not load.";
      content.innerHTML = '<div class="bacc-empty"><strong>Book map unavailable.</strong><br>Refresh the page and try again.</div>';
    }
  }

  search?.addEventListener("input", render);
  edition?.addEventListener("change", render);
  load();
})();
