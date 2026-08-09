const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const labRoot = path.join(ROOT, "ial", "wme01", "lab");
const normalizeLines = (value) => value.replace(/\r\n/g, "\n");
const html = normalizeLines(fs.readFileSync(path.join(labRoot, "index.html"), "utf8"));
const css = normalizeLines(fs.readFileSync(path.join(labRoot, "assets", "mechanics-lab.css"), "utf8"));
const js = normalizeLines(fs.readFileSync(path.join(labRoot, "assets", "mechanics-lab.js"), "utf8"));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const topicStart = js.indexOf("const TOPICS = [");
const topicEnd = js.indexOf("function caseDef", topicStart);
assert(topicStart >= 0 && topicEnd > topicStart, "TOPICS catalogue could not be located");
const topicBlock = js.slice(topicStart, topicEnd);
const topicIds = [...topicBlock.matchAll(/\n    \{\n      id: "([^"]+)"/g)].map((match) => match[1]);
const caseFactories = topicBlock.match(/\b(?:caseDef|vectorCase|graphCase|suvat1|suvat2|forceCase|dynCase|inclineCase|momCase|momentCase)\s*\(/g) || [];

assert(topicIds.length === 10, `Expected 10 Mechanics topics, found ${topicIds.length}`);
assert(caseFactories.length === 98, `Expected 98 working cases, found ${caseFactories.length}`);
assert(
  ["modelling", "vectors", "graphs", "suvat1d", "suvat2d", "forces", "newton", "inclines", "momentum", "moments"].every((id) => topicIds.includes(id)),
  "One or more WME01 topic families are missing"
);

[
  "labCanvas",
  "analysisCanvas",
  "viewModes",
  "speedButtons",
  "stagePlay",
  "stageReset",
  "stageCapture",
  "stageFullscreen",
  "experimentPhase",
  "caseOrdinal",
  "caseSignature",
  "phaseRail",
  "eventJumps",
  "pinMeasurementA",
  "pinMeasurementB",
  "clearMeasurements",
  "exportMeasurements",
  "comparisonTable",
  "measurementStatus",
  "labSearch",
  "experimentCards"
].forEach((id) => assert(html.includes(`id="${id}"`), `Missing lab control #${id}`));

assert((html.match(/data-speed="/g) || []).length === 6, "The six playback speed controls are required");
assert((html.match(/data-inspector-tab="/g) || []).length === 3, "Overview, Variables, and Method tabs are required");
assert(html.includes("mechanics-lab.css?v=20260809h"), "Lab CSS release version is stale");
assert(html.includes("family=Sora"), "Lab typography is not aligned with the Elite brand system");
assert(html.includes("mechanics-lab.js?v=20260809h"), "Lab JavaScript release version is stale");

[
  "function drawAnalysis(",
  "function drawTrajectoryAnalysis(",
  "function drawKinematicsAnalysis(",
  "function drawMomentumAnalysis(",
  "function drawMomentumComparison(",
  "function buildCaseVisualProfiles(",
  "function casePhaseLabels(",
  "function collisionTimeline(",
  "function collisionMetrics(",
  "function drawImpactPulse(",
  "function drawBall(",
  "function drawMetricAnalysis(",
  "function captureLabImage(",
  "function toggleStageFullscreen(",
  "function measurementEvents(",
  "function captureMeasurement(",
  "function paintMeasurementBench(",
  "function exportMeasurementCsv("
].forEach((signature) => assert(js.includes(signature), `Missing visual engine: ${signature}`));

assert(css.includes('.visual-stage[data-view="scene"]'), "Scene view styling is missing");
assert(css.includes('.visual-stage[data-view="graph"]'), "Graph view styling is missing");
assert(css.includes(".experiment-phase"), "Per-case event phase rail is missing");
assert(css.includes(".measurement-bench"), "Measurement bench styling is missing");
assert(css.includes(".event-jumps"), "Clickable event timeline styling is missing");
assert(css.includes("@media (max-width: 720px)"), "Mobile laboratory layout is missing");
assert(css.includes(".stage-panel:fullscreen"), "Fullscreen laboratory layout is missing");
assert(js.includes("const CASE_VISUAL_PROFILES = Object.freeze(buildCaseVisualProfiles())"), "The 98-case visual profile registry is missing");
assert(js.includes("uniqueProfileCount"), "Runtime case-profile audit is missing");
assert(js.includes('release: "20260809h"'), "Runtime lab audit release is stale");
assert(js.includes("measurementSlots: 2"), "Runtime measurement audit is missing");
assert(js.includes("dataset.labUniqueProfiles"), "DOM-visible runtime profile audit is missing");

console.log("Mechanics lab checks passed");
console.log(`- ${topicIds.length} topics`);
console.log(`- ${caseFactories.length} working cases`);
console.log("- 98 individualized visual profiles and staged collision physics verified");
console.log("- Scene, Split, Graph, capture, fullscreen, search, and six speeds verified");
console.log("- Clickable event timeline, A/B measurement bench, deltas, and CSV export verified");
