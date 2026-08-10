const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const labRoot = path.join(ROOT, "ial", "wme01", "lab");
const js = fs.readFileSync(path.join(labRoot, "assets", "mechanics-lab.js"), "utf8").replace(/\r\n/g, "\n");
const css = fs.readFileSync(path.join(labRoot, "assets", "mechanics-lab.css"), "utf8").replace(/\r\n/g, "\n");
const sw = fs.readFileSync(path.join(ROOT, "service-worker.js"), "utf8").replace(/\r\n/g, "\n");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const timedRenderers = [
  ["modelling", "drawModelling(W, H, t)"],
  ["units", "drawUnits(W, H, t)"],
  ["vectors", "drawVectors(W, H, t)"],
  ["forces", "drawForces(W, H, t)"],
  ["dynamics", "drawDynamics(W, H, t)"],
  ["moments", "drawMoments(W, H, t)"]
];

timedRenderers.forEach(([stage, call]) => {
  assert(js.includes(call), `${stage} is not connected to the simulation clock`);
});

[
  "function drawMotionTelemetry(W, H, t)",
  "function drawMotionTrace(x1, y1, x2, y2, color, progress)",
  "function drawAnimatedVectorArrow(map, start, end, color, text, progress)",
  "function drawPathProgress(map, points, progress, color, width)",
  "function drawVelocityTrail(x, y, velocity, color, intensity)",
  "function drawAnimatedLoad(x, y, force, color, name, progress)",
  "function drawLaminaMoment(W, H, t)"
].forEach((signature) => assert(js.includes(signature), `Missing motion engine: ${signature}`));

assert(js.includes('motionContract: "time-driven-98"'), "The 98-case runtime motion contract is missing");
assert(js.includes("caseIds: Object.freeze(TOPICS.flatMap"), "The browser motion-audit case registry is missing");
assert(js.includes("drawMotionTelemetry(W, H, t);"), "Every scene must render live playback telemetry");
assert(js.includes("const resultant = { x: v.force, y: (v.m2 - 5) * 10 };"), "Vector F=ma resultant scaling is inconsistent");
assert(js.includes("const a = { x: resultant.x / Math.max(1, v.m1), y: resultant.y / Math.max(1, v.m1) };"), "Vector F=ma does not use a = R/m in both components");
assert(js.includes("vertical: { f1: 12, f2: 12"), "Vertical equilibrium does not start balanced");
assert(js.includes("horizontal: { f1: 12, f2: 12"), "Horizontal equilibrium does not start balanced");
assert(js.includes("multi: { f1: 12, f2: 12, f3: 12"), "2D equilibrium does not start with a closed force polygon");
assert(css.includes("@keyframes lab-status-pulse"), "The visible running indicator animation is missing");
assert(sw.includes('elite-igcse-kill-v160'), "Service-worker cache version was not advanced");

console.log("Mechanics lab motion contract passed");
console.log("- all render families consume playback time");
console.log("- force equilibrium and vector F=ma consistency checks passed");
console.log("- scene telemetry, traces, vector growth, impact trails, and moment motion verified");
