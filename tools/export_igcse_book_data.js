// Export the IGCSE book data (Linear, Modular Unit 1, Modular Unit 2) exactly as the practice page scopes it:
// questions-data.js + solutions-data.js + topic-normalizer.js (run once per pathway).
// Output: private_output/igcse_books_<linear|unit1|unit2>.json, read by tools/igcse_books_2027.py.
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");

function pathwayQuestions(mode) {
  // localStorage holds a student's own topic overrides in the browser; books ignore them.
  const localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  const context = { localStorage, window: { localStorage, ELITE_PATHWAY: { mode, label: () => (mode === "modular" ? "Unit" : "Chapter") } } };
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(read("questions-data.js"), context);
  vm.runInContext(read("solutions-data.js"), context);
  vm.runInContext(read("topic-normalizer.js"), context);
  return { questions: context.window.QUESTION_DATA, solutions: context.window.SOLUTION_DATA };
}

const MONTH = { Jan: 1, Jun: 2, May: 2, Oct: 3, Nov: 4 };

function record(q, solutions) {
  const solution = solutions[q.id] || solutions[`all::${q.source_id}`] || {};
  // "Jan 2020 P1H", "May-Nov 2020 P1H", "Specimen 4WM1H"  ->  file slugs Jan2020_P1H, MayNov2020_P1H, Specimen_4WM1H
  const parts = String(q.paper).split(" ");
  const specimen = parts[0] === "Specimen";
  const month = specimen ? "Specimen" : parts[0].replace("-", "");
  const year = specimen ? 0 : Number(parts[1]);
  const code = specimen ? parts[1] : parts[2];
  return {
    id: q.id,
    bank: q.bank,
    paper: q.paper,
    paperCode: q.paper_code,
    paperSlug: specimen ? `Specimen_${code}` : `${month}${year}_${code}`,
    year,
    session: month,
    sessionOrder: MONTH[month] || 9,
    qNo: Number(q.question),
    marks: Number(q.marks),
    chapter: q.unit,
    topic: q.topic,
    topicOrder: Number(q.topic_order || 999),
    image: q.image,
    questionText: q.question_text || "",
    steps: Array.isArray(solution.steps) ? solution.steps : [],
    finalAnswer: solution.finalAnswer || "",
    status: solution.status || "",
  };
}

const outDir = path.join(ROOT, "private_output");
fs.mkdirSync(outDir, { recursive: true });
const linear = pathwayQuestions("linear");
const modular = pathwayQuestions("modular");
const sets = {
  linear: linear.questions.map((q) => record(q, linear.solutions)),
  unit1: modular.questions.filter((q) => q.unit === "Unit 1").map((q) => record(q, modular.solutions)),
  unit2: modular.questions.filter((q) => q.unit === "Unit 2").map((q) => record(q, modular.solutions)),
};
for (const [name, items] of Object.entries(sets)) {
  const all = items.filter((q) => q.bank === "all");
  const missing = items.filter((q) => !q.steps.length).length;
  fs.writeFileSync(path.join(outDir, `igcse_books_${name}.json`), JSON.stringify(items));
  console.log(`${name}: ${all.length} classified + ${items.length - all.length} expertise, ${new Set(all.map((q) => q.paper)).size} papers, ${missing} without steps`);
}
