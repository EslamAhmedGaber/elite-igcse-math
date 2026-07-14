const path = require("path");

require(path.resolve(__dirname, "..", "worked-solution.js"));

const view = globalThis.EliteSolutionView;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(view, "EliteSolutionView was not registered");

const currency = view.normalizeNotation("\\(\\pounds2920\\). \\pounds 36");
assert(currency.includes("\\text{£}2920"), "Compact pound notation was not repaired");
assert(currency.includes("\\text{£} 36"), "Spaced pound notation was not repaired");
assert(!currency.includes("\\pounds"), "Raw pound command remains in rendered notation");

const legacyMath = view.normalizeNotation("$$\\\\frac{3}{4} \\\\times 100$$");
assert(legacyMath === "\\[\\frac{3}{4} \\times 100\\]", "Double-escaped dollar math was not normalized");

const safeMarkup = view.formatText("Volume = 2268 cm<sup>3</sup> and *x*<sub>n</sub>.");
assert(safeMarkup.includes("<sup>3</sup>"), "Safe superscript markup was not retained");
assert(safeMarkup.includes("<em>x</em><sub>n</sub>"), "Legacy emphasis/subscript markup was not retained");
assert(!safeMarkup.includes("&lt;sup&gt;"), "Superscript markup is visible as raw text");

const malformed = view.formatText('(a) x = 1</div><div class="answer-line">(b) x = 2');
assert(malformed.includes("(a) x = 1"), "First multipart answer was lost");
assert(malformed.includes("(b) x = 2"), "Second multipart answer was lost");
assert(!malformed.includes("answer-line"), "Legacy answer-line markup leaked into output");

const hostile = view.formatText('<img src=x onerror="alert(1)"><script>alert(2)</script>Safe');
assert(!hostile.includes("<img"), "Unsafe image markup was retained");
assert(!hostile.includes("<script"), "Unsafe script markup was retained");

const rendered = view.render({
  status: "checked",
  checkedBy: "private",
  steps: [
    { title: "Form the equation", body: "\\[2x+3=9\\]" },
    { title: "Solve", body: "\\(x=3\\)" }
  ],
  finalAnswer: "\\(x=3\\)"
}, { key: "sample", topic: "Algebra", marks: 3 });

assert(rendered.includes("worked-solution-step"), "Shared step presentation is missing");
assert(rendered.includes(">01<") && rendered.includes(">02<"), "Numbered solution route is missing");
assert(rendered.includes("worked-solution-final"), "Final-answer presentation is missing");
assert(!rendered.includes("private") && !rendered.includes("checkedBy"), "Private solution metadata leaked");

console.log("Worked solution checks passed");
console.log("- Currency, MathJax, Markdown, superscript, and legacy markup normalized");
console.log("- Unsafe markup stripped and private metadata withheld");
console.log("- Numbered shared solution route rendered");
