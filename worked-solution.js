(function initEliteWorkedSolutions(root) {
  "use strict";

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));
  }

  function normalizeMathPayload(value) {
    return String(value || "")
      .replace(/\\\\(?=(?:begin|end|frac|dfrac|tfrac|sqrt|text|mathrm|mathbf|operatorname|times|cdot|left|right|sin|cos|tan|log|ln|pi|theta|alpha|beta|gamma|Delta|Sigma|sum|int|lim|quad|qquad|%|angle|vec)\b)/g, "\\")
      .replace(/\\([\[\]])/g, "$1")
      .trim();
  }

  function normalizeDollarMath(value) {
    let text = String(value || "");
    text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_match, content) => `\\[${normalizeMathPayload(content)}\\]`);
    return text.replace(/\$([^$\n]+?)\$/g, (match, content) => {
      const trimmed = content.trim();
      const looksLikeCurrencyRange = /^\d/.test(trimmed)
        && !/[\\=+*/^_{}()[\]]/.test(trimmed)
        && /\s/.test(trimmed);
      return looksLikeCurrencyRange ? match : `\\(${normalizeMathPayload(content)}\\)`;
    });
  }

  function normalizeNotation(value) {
    let text = Array.isArray(value) ? value.join("\n") : String(value ?? "");
    text = text
      .replace(/\r\n?/g, "\n")
      .replace(/&pound;|&#0*163;/gi, "£")
      .replace(/&times;/gi, "×")
      .replace(/&deg;/gi, "°")
      .replace(/&le;/gi, "≤")
      .replace(/&ge;/gi, "≥")
      .replace(/\\(?:pounds?|textsterling)(?=\s|\d|[.,;:)]|$)/g, "\\text{£}")
      .replace(/\\euro(?=\s|\d|[.,;:)]|$)/g, "\\text{€}")
      .replace(/<br\s*\/?\s*>/gi, "\n")
      .replace(/<\/(?:div|p|section|li)>\s*<(?:div|p|section|li)[^>]*>/gi, "\n\n")
      .replace(/<\/(?:div|p|section)>/gi, "\n\n")
      .replace(/<(?:div|p|section)[^>]*>/gi, "")
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<\/(?:li)>/gi, "\n")
      .replace(/<(?!\/?(?:sup|sub|strong|em|code)\b)[^>]+>/gi, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return normalizeDollarMath(text);
  }

  function formatInlineMarkdown(value) {
    const math = [];
    let html = String(value || "").replace(/\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]/g, (segment) => {
      const token = `ELITEMATHSEGMENT${math.length}TOKEN`;
      math.push(segment);
      return token;
    });
    html = html
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\n]+?)\*/g, "$1<em>$2</em>")
      .replace(/&lt;(\/?)(sup|sub|strong|em|code)&gt;/gi, "<$1$2>");
    math.forEach((segment, index) => {
      html = html.replace(`ELITEMATHSEGMENT${index}TOKEN`, segment);
    });
    return html;
  }

  function formatText(value, { empty = "Solution has not been written yet." } = {}) {
    const normalized = normalizeNotation(value);
    if (!normalized) return `<p class="solution-empty">${escapeHtml(empty)}</p>`;
    const escaped = escapeHtml(normalized);
    return escaped
      .split(/\n{2,}/)
      .map((block) => {
        const trimmed = block.trim();
        if (!trimmed) return "";
        if (/^\\\[[\s\S]*\\\]$/.test(trimmed)) {
          return `<div class="worked-solution-equation">${trimmed}</div>`;
        }
        const lines = trimmed.split(/\n/);
        if (lines.length > 1 && lines.every((line) => /^[-*]\s+/.test(line.trim()))) {
          return `<ul>${lines.map((line) => `<li>${formatInlineMarkdown(line.trim().replace(/^[-*]\s+/, ""))}</li>`).join("")}</ul>`;
        }
        return `<p>${formatInlineMarkdown(trimmed).replace(/\n/g, "<br>")}</p>`;
      })
      .join("");
  }

  function solutionSteps(solution) {
    if (Array.isArray(solution?.steps)) {
      return solution.steps.filter((step) => step && (step.title || step.body));
    }
    if (solution?.source) return [{ title: "Working", body: solution.source }];
    return [];
  }

  function hasContent(solution) {
    return solutionSteps(solution).length > 0 || Boolean(solution?.finalAnswer);
  }

  function render(solution, options = {}) {
    if (!solution || !hasContent(solution)) {
      return `<div class="worked-solution-empty">${formatText("", { empty: options.empty || "Solution has not been written yet." })}</div>`;
    }
    const steps = solutionSteps(solution);
    const meta = [options.topic, options.marks ? `${options.marks} marks` : ""]
      .map((item) => String(item || "").trim())
      .filter(Boolean);
    const id = options.id ? ` id="${escapeHtml(options.id)}"` : "";
    const variant = options.variant === "print" ? " worked-solution--print" : "";
    const stepLabel = steps.length === 1 ? "1 step" : `${steps.length} steps`;
    const stepsHtml = steps.map((step, index) => `
      <section class="worked-solution-step" aria-labelledby="worked-step-${escapeHtml(options.key || "solution")}-${index + 1}">
        <span class="worked-solution-index" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>
        <div class="worked-solution-step-content">
          <h4 id="worked-step-${escapeHtml(options.key || "solution")}-${index + 1}">${escapeHtml(step.title || `Step ${index + 1}`)}</h4>
          <div class="worked-solution-copy">${formatText(step.body || "")}</div>
        </div>
      </section>
    `).join("");
    const finalHtml = solution.finalAnswer ? `
      <section class="worked-solution-final" aria-label="Final answer">
        <div class="worked-solution-final-label"><span aria-hidden="true">✓</span><strong>Final answer</strong></div>
        <div class="worked-solution-final-copy">${formatText(solution.finalAnswer)}</div>
      </section>
    ` : "";
    return `<article${id} class="worked-solution${variant}" aria-label="Worked solution">
      <header class="worked-solution-head">
        <div>
          <span>Worked solution</span>
          <strong>${escapeHtml(stepLabel)}</strong>
        </div>
        ${meta.length ? `<div class="worked-solution-meta">${meta.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>` : ""}
      </header>
      <div class="worked-solution-steps">${stepsHtml}</div>
      ${finalHtml}
    </article>`;
  }

  function markWideEquations(target) {
    if (!target?.querySelectorAll) return;
    target.querySelectorAll(".worked-solution-equation, .worked-solution-copy mjx-container, .worked-solution-final-copy mjx-container").forEach((element) => {
      const wide = element.scrollWidth > element.clientWidth + 2;
      if (wide) {
        element.setAttribute("tabindex", "0");
        element.setAttribute("aria-label", "Scrollable mathematical expression");
      } else if (element.getAttribute("aria-label") === "Scrollable mathematical expression") {
        element.removeAttribute("tabindex");
        element.removeAttribute("aria-label");
      }
    });
  }

  async function typeset(target) {
    const targets = (Array.isArray(target) ? target : [target]).filter(Boolean);
    if (!targets.length) return false;
    if (!root.MathJax?.typesetPromise) {
      targets.forEach(markWideEquations);
      return false;
    }
    await root.MathJax.typesetPromise(targets).catch(() => {});
    targets.forEach(markWideEquations);
    return true;
  }

  root.EliteSolutionView = {
    escapeHtml,
    formatText,
    hasContent,
    normalizeNotation,
    render,
    typeset
  };
}(typeof window !== "undefined" ? window : globalThis));
