"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");

function scriptPath(relativePath) {
  return path.join(ROOT, ...relativePath.split("/"));
}

function runScripts(relativePaths, windowSeed = {}) {
  const localStore = new Map();
  const sandbox = {
    window: { ...windowSeed },
    localStorage: {
      getItem(key) {
        return localStore.has(key) ? localStore.get(key) : null;
      },
      setItem(key, value) {
        localStore.set(key, String(value));
      },
      removeItem(key) {
        localStore.delete(key);
      },
    },
    console,
    URL,
    URLSearchParams,
    Map,
    Set,
  };
  sandbox.window.window = sandbox.window;
  const context = vm.createContext(sandbox);
  relativePaths.forEach((relativePath) => {
    const filename = scriptPath(relativePath);
    vm.runInContext(fs.readFileSync(filename, "utf8"), context, { filename });
  });
  return sandbox.window;
}

function clean(value) {
  return String(value || "").trim();
}

function slug(value) {
  return clean(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function searchKey(value) {
  return clean(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/formulae/g, "formulas")
    .replace(/equations/g, "equation")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function absoluteRoute(href) {
  const value = clean(href);
  if (!value || value === "#") return value;
  if (/^(?:https?:|tel:|mailto:)/i.test(value)) return value;
  return value.startsWith("/") ? value : `/${value}`;
}

function addItem(items, seen, item) {
  const normalized = {
    id: item.id || `${item.courseId || "global"}:${slug(item.type)}:${slug(item.title)}:${items.length}`,
    courseId: item.courseId || "all",
    type: item.type || "Resource",
    title: clean(item.title),
    detail: clean(item.detail),
    href: absoluteRoute(item.href),
    secondaryHref: item.secondaryHref ? absoluteRoute(item.secondaryHref) : "",
    secondaryLabel: clean(item.secondaryLabel),
    keywords: Array.isArray(item.keywords) ? item.keywords.map(clean).filter(Boolean) : [],
  };
  if (!normalized.title || !normalized.href) return;
  const key = `${normalized.courseId}|${normalized.type}|${normalized.title}|${normalized.href}`;
  if (seen.has(key)) return;
  seen.add(key);
  items.push(normalized);
}

const registryWindow = runScripts(["course-modules.js"]);
const registry = registryWindow.ELITE_COURSE_MODULES;
if (!registry || !Array.isArray(registry.navGroups)) {
  throw new Error("course-modules.js did not expose navGroups");
}

const questionWindow = runScripts(
  ["questions-data.js", "topic-normalizer.js"],
  {
    ELITE_PATHWAY: {
      mode: "linear",
      label() {
        return "Chapter";
      },
    },
  }
);
const questions = (questionWindow.QUESTION_DATA || []).filter((item) => item.bank === "all");

const notesWindow = runScripts(["linear-notes-data.js", "ial/ial-notes-data.js"]);
const linearNotes = notesWindow.ELITE_LINEAR_NOTES;
const ialNotes = notesWindow.ELITE_IAL_NOTES;
if (!linearNotes || !ialNotes) {
  throw new Error("Notes data did not load");
}

const groups = new Map(registry.navGroups.map((group) => [group.id, group]));

function courseFromGroup(id, options = {}) {
  const group = groups.get(id);
  if (!group) throw new Error(`Missing course group: ${id}`);
  const links = options.links || group.links || [];
  const byModule = new Map(links.map((link) => [link.module || slug(link.title), link]));
  const route = (module, fallback) => absoluteRoute(byModule.get(module)?.href || fallback);
  return {
    id: options.id || id,
    label: options.label || group.label,
    code: options.code || group.detail,
    shortLabel: options.shortLabel || group.label,
    pathway: group.pathway || id,
    unit: options.unit || "",
    palette: group.palette || id,
    links: {
      learn: route("notes", options.notesHref || group.href),
      practise: route("classified", group.href),
      expertise: route("expertise", group.href),
      test: route("build-test", "/exam.html"),
      revise: route("revision-book", route("smart-revision", "/exam.html")),
      repair: route("mistake-box", group.href),
      progress: route("progress", "/progress.html"),
      books: route("books", "/downloads.html"),
      papers: route("past-solutions", "/pastpapers.html"),
      lab: route("interactive-lab", ""),
    },
    storage: options.storage,
    modules: links.map((link) => ({
      module: link.module || slug(link.title),
      title: link.title,
      detail: link.detail,
      href: absoluteRoute(link.href),
    })),
  };
}

const modular = groups.get("modular");
const modularUnit1 = modular.units.find((unit) => unit.title === "Unit 1");
const modularUnit2 = modular.units.find((unit) => unit.title === "Unit 2");

const courses = [
  courseFromGroup("linear", {
    shortLabel: "Linear",
    storage: { solved: "solvedExpertiseQuestions", mistakes: "eliteMistakeBoxV1" },
  }),
  courseFromGroup("modular", {
    id: "modular1",
    label: "Modular Unit 1",
    shortLabel: "Modular 1",
    code: "4WM1",
    unit: "Unit 1",
    links: modularUnit1.links,
    notesHref: "/notes.html?pathway=modular&unit=Unit+1#linearNotes",
    storage: { solved: "solvedExpertiseQuestions", mistakes: "eliteMistakeBoxV1" },
  }),
  courseFromGroup("modular", {
    id: "modular2",
    label: "Modular Unit 2",
    shortLabel: "Modular 2",
    code: "4WM2",
    unit: "Unit 2",
    links: modularUnit2.links,
    notesHref: "/notes.html?pathway=modular&unit=Unit+2#linearNotes",
    storage: { solved: "solvedExpertiseQuestions", mistakes: "eliteMistakeBoxV1" },
  }),
  courseFromGroup("pure", {
    id: "wma11",
    label: "IAL Pure 1",
    shortLabel: "Pure 1",
    code: "WMA11",
    storage: { solved: "eliteWMA11SolvedV1", mistakes: "eliteWMA11MistakeBoxV1" },
  }),
  courseFromGroup("pure2", {
    id: "wma12",
    label: "IAL Pure 2",
    shortLabel: "Pure 2",
    code: "WMA12",
    storage: { solved: "eliteWMA12SolvedV1", mistakes: "eliteWMA12MistakeBoxV1" },
  }),
  courseFromGroup("mechanics1", {
    id: "wme01",
    label: "IAL Mechanics 1",
    shortLabel: "Mechanics 1",
    code: "WME01",
    storage: { solved: "eliteWME01SolvedV1", mistakes: "eliteWME01MistakeBoxV1" },
  }),
];

const items = [];
const seen = new Set();

courses.forEach((course) => {
  course.modules.forEach((module) => {
    addItem(items, seen, {
      id: `${course.id}:module:${module.module}`,
      courseId: course.id,
      type: "Module",
      title: module.title,
      detail: module.detail,
      href: module.href,
      keywords: [course.label, course.code, module.module, "tool"],
    });
  });
});

const topicGroups = new Map();
questions.forEach((question) => {
  const title = clean(question.canonical_topic || question.linear_topic || question.topic);
  if (!title) return;
  if (!topicGroups.has(title)) {
    topicGroups.set(title, {
      title,
      linearUnit: clean(question.linear_unit || question.original_unit || question.unit),
      modularUnits: new Set(),
      count: 0,
    });
  }
  const group = topicGroups.get(title);
  group.count += 1;
  if (question.modular_unit) group.modularUnits.add(question.modular_unit);
});

topicGroups.forEach((topic) => {
  const linearParams = new URLSearchParams({
    pathway: "linear",
    bank: "all",
    unit: topic.linearUnit,
    topic: topic.title,
  });
  addItem(items, seen, {
    id: `linear:topic:${slug(topic.title)}`,
    courseId: "linear",
    type: "Topic",
    title: topic.title,
    detail: `${topic.linearUnit.replace(/^Chapter\s+\d+:\s*/i, "")} | ${topic.count} questions`,
    href: `/practice.html?${linearParams.toString()}`,
    keywords: [topic.linearUnit, "classified", "practice"],
  });

  ["Unit 1", "Unit 2"].forEach((unit) => {
    if (!topic.modularUnits.has(unit)) return;
    const courseId = unit === "Unit 1" ? "modular1" : "modular2";
    const params = new URLSearchParams({ pathway: "modular", unit, bank: "all", topic: topic.title });
    addItem(items, seen, {
      id: `${courseId}:topic:${slug(topic.title)}`,
      courseId,
      type: "Topic",
      title: topic.title,
      detail: `${unit} classified practice`,
      href: `/practice.html?${params.toString()}`,
      keywords: [unit, "4WM", "classified", "practice"],
    });
  });
});

const topicBySearchKey = new Map([...topicGroups.values()].map((topic) => [searchKey(topic.title), topic]));
const noteTopicMatch = (title) => {
  const key = searchKey(title);
  if (topicBySearchKey.has(key)) return topicBySearchKey.get(key);
  return [...topicGroups.values()].find((topic) => {
    const candidate = searchKey(topic.title);
    return candidate.includes(key) || key.includes(candidate);
  });
};

linearNotes.chapters.forEach((chapter) => {
  chapter.topics.forEach((note) => {
    const topic = noteTopicMatch(note.title);
    addItem(items, seen, {
      id: `linear:note:${slug(note.title)}`,
      courseId: "linear",
      type: "Note",
      title: note.title,
      detail: `Chapter ${chapter.number}: ${chapter.short} | ${note.pages} pages`,
      href: note.href,
      secondaryHref: note.practiceHref,
      secondaryLabel: "Practice",
      keywords: [note.focus, chapter.title, "strategy", "booklet"],
    });

    if (!topic) return;
    ["Unit 1", "Unit 2"].forEach((unit) => {
      if (!topic.modularUnits.has(unit)) return;
      const courseId = unit === "Unit 1" ? "modular1" : "modular2";
      const params = new URLSearchParams({ pathway: "modular", unit, bank: "all", topic: topic.title });
      addItem(items, seen, {
        id: `${courseId}:note:${slug(note.title)}`,
        courseId,
        type: "Note",
        title: note.title,
        detail: `Shared strategy note | ${unit}`,
        href: note.href,
        secondaryHref: `/practice.html?${params.toString()}`,
        secondaryLabel: "Practice",
        keywords: [note.focus, chapter.title, unit, "strategy", "shared notes"],
      });
    });
  });
});

Object.entries(ialNotes).forEach(([courseId, notePack]) => {
  notePack.topics.forEach((note) => {
    const topicHref = `/${courseId === "wme01" ? "ial/wme01" : courseId === "wma12" ? "ial/wma12" : "ial/wma11"}/index.html?topic=${encodeURIComponent(note.slug)}#ialFilters`;
    addItem(items, seen, {
      id: `${courseId}:note:${slug(note.title)}`,
      courseId,
      type: "Note",
      title: note.title,
      detail: `${notePack.code} strategy note`,
      href: note.href,
      secondaryHref: topicHref,
      secondaryLabel: "Practice",
      keywords: [note.focus, notePack.course, notePack.code, "strategy", "booklet"],
    });
    addItem(items, seen, {
      id: `${courseId}:topic:${slug(note.title)}`,
      courseId,
      type: "Topic",
      title: note.title,
      detail: `${notePack.code} classified practice`,
      href: topicHref,
      keywords: [note.focus, notePack.course, notePack.code, "classified", "practice"],
    });
  });
});

[
  { title: "Teacher Studio & Certificates", detail: "Student planning and certificate builder", href: "/admin.html", keywords: ["teacher", "certificate", "planner", "achievement"] },
  { title: "Readiness Check", detail: "Exam readiness diagnosis", href: "/checkup.html", keywords: ["checkup", "diagnosis", "exam"] },
  { title: "Download Centre", detail: "All public books and answer books", href: "/downloads.html", keywords: ["pdf", "book", "answers"] },
  { title: "Past Papers", detail: "Original papers beside worked solutions", href: "/pastpapers.html", keywords: ["exam", "paper", "solution"] },
  { title: "Topic Roadmap", detail: "Course topic map", href: "/topics.html", keywords: ["syllabus", "map", "topics"] },
  { title: "About Dr Eslam", detail: "Teacher profile and contact", href: "/about.html", keywords: ["Cairo University", "teacher", "contact"] },
].forEach((item) => addItem(items, seen, { ...item, courseId: "all", type: "Resource" }));

const output = {
  version: "20260713b",
  generatedAt: new Date().toISOString(),
  courses,
  items,
  stats: {
    courses: courses.length,
    modules: items.filter((item) => item.type === "Module").length,
    topics: items.filter((item) => item.type === "Topic").length,
    notes: items.filter((item) => item.type === "Note").length,
    resources: items.filter((item) => item.type === "Resource").length,
  },
};

const destination = path.join(ROOT, "study-search-data.js");
const source = `(function () {\n  window.ELITE_STUDY_SEARCH = ${JSON.stringify(output, null, 2)};\n})();\n`;
fs.writeFileSync(destination, source, "utf8");
console.log(`Wrote ${path.relative(ROOT, destination)} with ${items.length} searchable items.`);
console.log(JSON.stringify(output.stats));
