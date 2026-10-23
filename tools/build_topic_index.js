#!/usr/bin/env node
// Builds data/topic-index/<course>.js: for every topic NOTE on the course page, the question ids
// of the classified bank that belong to it, so course.js can show "solved x of y" per topic.
// IAL: note numbers match the data topic numbers. IGCSE: the bank uses its own topic names,
// mapped to the note titles by BANK_TO_NOTE below. Run after any change to the question data.
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "data", "topic-index");
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");

function sandbox(extra = {}) {
  const ctx = { console, localStorage: { getItem: () => null, setItem() {} }, ...extra };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  return ctx;
}

const library = sandbox();
vm.runInContext(read("library-data.js"), library);

function noteTopics(id) {
  const notes = library.ELITE_LIBRARY.courses[id].notes;
  const groups = Array.isArray(notes.chapters) && notes.chapters.length ? notes.chapters : [{ topics: notes.topics || [] }];
  return groups.flatMap((g) => g.topics || []);
}

const key = (text) => String(text).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim();

// Bank topic -> note title (any course; only notes that exist in the course are used).
const BANK_TO_NOTE = {
  "Number Toolkit": "Number Toolkit",
  "Set Notation & Venn Diagrams": "Set Notation and Venn Diagrams",
  "Prime Factors, HCF & LCM": "Prime Factors, HCF and LCM",
  "Standard Form": "Powers, Roots and Standard Form",
  "Fractions": "Fractions",
  "Percentages": "Percentages",
  "Reverse Percentages": "Percentages",
  "Compound Interest & Depreciation": "Compound Interest and Depreciation",
  "Recurring Decimals": "Fractions, Decimals and Percentages",
  "Rounding, Estimation & Bounds": "Rounding, Estimation and Bounds",
  "Surds": "Surds",
  "Ratio Toolkit": "Ratio Toolkit",
  "Direct & Inverse Proportion": "Direct & Inverse Proportion",
  "Algebraic Roots & Indices": "Algebraic Roots & Indices",
  "Expanding Brackets": "Expanding Brackets",
  "Factorising": "Factorisation",
  "Completing the Square": "Completing the Square",
  "Algebraic Fractions": "Algebraic Fractions",
  "Rearranging Formulae": "Rearranging Formulas",
  "Algebraic Proof": "Algebraic Proof",
  "Linear Equations": "Solving Linear Equations",
  "Quadratic Equations": "Solving Quadratics",
  "Inequalities (Solving & Graphing)": "Solving Inequalities",
  "Simultaneous Equations": "Simultaneous Equations",
  "Forming & Solving Equations": "Forming and Solving Equations",
  "Sequences": "Sequences",
  "Functions": "Functions",
  "Linear Graphs": "Linear Graphs y = mx + c",
  "Graphs of Functions": "Graphs of Functions",
  "Transformations of Graphs": "Transformations of Graphs",
  "Differentiation & Turning Points": "Differentiation",
  "Standard & Compound Units": "Standard and Compound Units",
  "Angles in Polygons & Parallel Lines": "Angles in Polygons and Parallel Lines",
  "Bearings": "Bearings, Scale Drawing and Constructions",
  "Constructions & Loci": "Bearings, Scale Drawing and Constructions",
  "Circle Theorems": "Circle Theorems",
  "Perimeter & Area": "Area and Perimeter",
  "Circles, Arcs & Sectors": "Circles, Arcs and Sectors",
  "Volume & Surface Area": "Volume and Surface Area",
  "Congruent Shapes": "Congruence, Similarity and Geometrical Proof",
  "Similar Shapes": "Congruence, Similarity and Geometrical Proof",
  "Area & Volume of Similar Shapes": "Area and Volume of Similar Shapes",
  "Right-Angled Triangles - Pythagoras & Trigonometry": "Right-Angled Triangles: Pythagoras and Trigonometry",
  "Sine & Cosine Rules": "Sine Rule, Cosine Rule and Area of a Triangle",
  "3D Pythagoras & Trigonometry": "3D Pythagoras and Trigonometry",
  "Vectors": "Vectors",
  "Transformations": "Transformations",
  "Statistics Toolkit": "Statistics",
  "Averages from Frequency Tables": "Statistics",
  "Histograms": "Histograms",
  "Cumulative Frequency Diagrams": "Cumulative Frequency",
  "Probability Toolkit": "Probability Toolkit",
  "Tree Diagrams & Conditional Probability": "Combined and Conditional Probability",
  "Powers & Roots": "Powers, Roots and Standard Form",
  "Quadratic Formula": "Solving Quadratics",
  "Fractions, Decimals & Percentages": "Fractions, Decimals and Percentages",
  "Using a Calculator": "Using a Calculator",
  "Algebra Toolkit": "Algebra Toolkit",
  "Kinematic Graphs": "Real-Life Graphs",
};

const IGCSE = {
  linear: { mode: "linear", unit: "", practice: "practice.html?pathway=linear" },
  unit1: { mode: "modular", unit: "Unit 1", practice: "practice.html?pathway=modular&unit=Unit+1" },
  unit2: { mode: "modular", unit: "Unit 2", practice: "practice.html?pathway=modular&unit=Unit+2" },
};

function igcseQuestions({ mode, unit }) {
  const ctx = sandbox({ ELITE_PATHWAY: { mode, isModular: mode === "modular", label: () => (mode === "modular" ? "Unit" : "Chapter") } });
  vm.runInContext(read("questions-data.js"), ctx);
  vm.runInContext(read("topic-normalizer.js"), ctx);
  return (ctx.QUESTION_DATA || []).filter((q) => q.bank === "all" && (!unit || q.unit === unit));
}

function buildIgcse(id) {
  const cfg = IGCSE[id];
  const notes = noteTopics(id);
  const byKey = new Map(notes.map((t) => [key(t.title), t]));
  const topics = {};
  const missed = {};
  const bankCount = {};
  igcseQuestions(cfg).forEach((q) => {
    const note = byKey.get(key(BANK_TO_NOTE[q.topic] || q.topic));
    if (!note) { missed[q.topic] = (missed[q.topic] || 0) + 1; return; }
    const entry = topics[note.num] || (topics[note.num] = { ids: [] });
    entry.ids.push(q.id.replace(/^all::/, ""));
    bankCount[note.num] = bankCount[note.num] || {};
    bankCount[note.num][q.topic] = (bankCount[note.num][q.topic] || 0) + 1;
  });
  Object.entries(topics).forEach(([num, entry]) => {
    // Practise link: the bank topic that holds most of this note's questions.
    const main = Object.entries(bankCount[num]).sort((a, b) => b[1] - a[1])[0][0];
    entry.practice = `${cfg.practice}&topic=${encodeURIComponent(main)}#questions`;
  });
  return { prefix: "all::", topics, missed };
}

function buildIal(id) {
  const code = id.toUpperCase();
  const ctx = sandbox();
  vm.runInContext(read(`ial/${id}/${id}-data.js`), ctx);
  const notes = new Set(noteTopics(id).map((t) => t.num));
  const topics = {};
  const missed = {};
  (ctx[`${code}_QUESTIONS`] || []).forEach((q) => {
    const slug = q.primaryTopic || q.topic;
    const num = String(slug).slice(0, 2);
    if (!notes.has(num)) { missed[slug] = (missed[slug] || 0) + 1; return; }
    const entry = topics[num] || (topics[num] = { ids: [], practice: `ial/${id}/index.html?topic=${encodeURIComponent(slug)}#ialFilters` });
    entry.ids.push(q.id);
  });
  return { prefix: "", topics, missed };
}

fs.mkdirSync(OUT, { recursive: true });
let problems = 0;
for (const id of ["linear", "unit1", "unit2", "wma11", "wma12", "wma13", "wme01"]) {
  const built = IGCSE[id] ? buildIgcse(id) : buildIal(id);
  const total = Object.values(built.topics).reduce((sum, t) => sum + t.ids.length, 0);
  const missed = Object.entries(built.missed);
  const body = `window.ELITE_TOPIC_INDEX = window.ELITE_TOPIC_INDEX || {};\nwindow.ELITE_TOPIC_INDEX[${JSON.stringify(id)}] = ${JSON.stringify({ prefix: built.prefix, topics: built.topics })};\n`;
  fs.writeFileSync(path.join(OUT, `${id}.js`), body);
  console.log(`${id}: ${total} questions in ${Object.keys(built.topics).length} topics${missed.length ? `; not on a note: ${missed.map(([t, n]) => `${t} (${n})`).join(", ")}` : ""}`);
  // A topic name the map does not know is a real gap; small leftovers from other units are expected.
  missed.forEach(([topic]) => { if (!(topic in BANK_TO_NOTE) && IGCSE[id]) problems += 1; });
}
if (problems) {
  console.error(`FAIL: ${problems} bank topic(s) have no note mapping. Add them to BANK_TO_NOTE.`);
  process.exit(1);
}
