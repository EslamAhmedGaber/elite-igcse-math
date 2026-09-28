/* Exam selection + A4 print regression test.
 *
 * Serves the site over http (pixel analysis of question images needs a real
 * origin), drives exam.html in headless Chrome or Edge, and checks:
 *   - seeded builds are reproducible and never repeat a source question
 *   - strict level mixes are met exactly or refused with an explanation
 *   - "avoid recent repeats", swap-one-question and shared test links
 *   - every course prints to true A4 pages (210 x 297 mm) with no overflow,
 *     no blank pages, no raw LaTeX/HTML, identical numbering in both copies
 *
 * Usage: node tools/test_exam_print_a4.js [chrome|edge] [--pdf-dir DIR]
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");

const ROOT = path.resolve(process.env.ELITE_SITE_ROOT || path.resolve(__dirname, ".."));
const STAGE = process.env.ELITE_PRINT_STAGE ? path.resolve(process.env.ELITE_PRINT_STAGE) : null;
const args = process.argv.slice(2);
const BROWSER = args.find((arg) => arg === "chrome" || arg === "edge") || "chrome";
const PDF_DIR = args.includes("--pdf-dir") ? path.resolve(args[args.indexOf("--pdf-dir") + 1]) : null;
const QUICK = args.includes("--quick");
const SKIP_NATIVE = args.includes("--skip-native");
const COURSE = args.includes("--course") ? args[args.indexOf("--course") + 1] : null;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain"
};

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function startServer() {
  const port = await freePort();
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    let file = path.join(ROOT, decodeURIComponent(url.pathname));
    if (!file.startsWith(ROOT)) {
      res.writeHead(403).end();
      return;
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    const staged = STAGE && path.join(STAGE, path.relative(ROOT, file));
    if (staged && fs.existsSync(staged)) file = staged;
    fs.readFile(file, (error, data) => {
      if (error) {
        res.writeHead(404).end("not found");
        return;
      }
      res.writeHead(200, { "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream" });
      res.end(data);
    });
  });
  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
  return { base: `http://127.0.0.1:${port}`, close: () => new Promise((resolve) => server.close(resolve)) };
}

function browserExecutable() {
  const candidates = BROWSER === "edge"
    ? ["C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"]
    : [process.env.CHROME_BIN, "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"];
  const found = candidates.filter(Boolean).find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error(`${BROWSER} was not found`);
  return found;
}

async function launch() {
  const port = await freePort();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "elite-a4-"));
  const proc = spawn(browserExecutable(), [
    "--headless=new", "--disable-gpu", "--no-first-run", "--disable-extensions", "--disable-default-apps", "--disable-component-update",
    `--remote-debugging-port=${port}`, `--user-data-dir=${userDataDir}`, "about:blank"
  ], { stdio: "ignore" });
  let version = null;
  for (let attempt = 0; attempt < 100 && !version; attempt += 1) {
    try {
      version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
    } catch (error) {
      await delay(100);
    }
  }
  if (!version) throw new Error("DevTools endpoint did not start");
  const socket = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let nextId = 1;
  const pending = new Map();
  const errors = [];
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result || {});
    } else if (message.method === "Runtime.exceptionThrown") {
      errors.push(message.params.exceptionDetails?.exception?.description || message.params.exceptionDetails?.text);
    }
  });
  const send = (method, params = {}, sessionId) => {
    const id = nextId;
    nextId += 1;
    socket.send(JSON.stringify({ id, method, params, sessionId }));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 180000);
      pending.set(id, {
        resolve: value => { clearTimeout(timer); resolve(value); },
        reject: error => { clearTimeout(timer); reject(error); }
      });
    });
  };
  async function openTab() {
    const { targetId } = await send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
    const tab = {
      errors,
      send: (method, params) => send(method, params, sessionId),
      async eval(expression) {
        const result = await tab.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true });
        if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
        return result.result?.value;
      },
      async waitFor(expression, label, tries = 600) {
        for (let attempt = 0; attempt < tries; attempt += 1) {
          if (await tab.eval(expression).catch(() => false)) return;
          await delay(100);
        }
        throw new Error(`Timed out waiting for ${label}`);
      },
      async goto(url, ready = "document.readyState === 'complete'") {
        await tab.send("Page.navigate", { url });
        await delay(250);
        await tab.waitFor(ready, url);
      }
    };
    await tab.send("Page.enable");
    await tab.send("Runtime.enable");
    return tab;
  }
  return {
    openTab,
    async close() {
      socket.close();
      if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(proc.pid), "/T", "/F"], { stdio: "ignore" });
      else proc.kill();
      await delay(400);
      try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (error) { /* locked temp dir */ }
    }
  };
}

const READY = "document.querySelector('#eliteExamApp')?.dataset.eliteLoaded === 'true' && document.body.getAttribute('aria-busy') === 'false' && Boolean(window.ElitePaperPrint)";

const COURSES = [
  { key: "linear", label: "Linear 4MA1", query: "?pathway=linear", stateKey: "eliteMockExamV1" },
  { key: "modular-u1", label: "Modular Unit 1", query: "?pathway=modular&unit=Unit+1", stateKey: "eliteMockExamV1" },
  { key: "modular-u2", label: "Modular Unit 2", query: "?pathway=modular&unit=Unit+2", stateKey: "eliteMockExamV1" },
  { key: "wma11", label: "Pure 1 WMA11", query: "?pathway=pure&course=wma11", stateKey: "eliteMockExamV1:wma11" },
  { key: "wma12", label: "Pure 2 WMA12", query: "?pathway=pure&course=wma12", stateKey: "eliteMockExamV1:wma12" },
  { key: "wme01", label: "Mechanics 1 WME01", query: "?pathway=pure&course=wme01", stateKey: "eliteMockExamV1:wme01" }
];

function uiScript(stateKey, body) {
  return `(async () => {
    const frame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const set = async (id, value) => {
      const el = document.getElementById(id);
      if (el.type === "checkbox") el.checked = Boolean(value); else el.value = String(value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      await frame();
    };
    const state = () => JSON.parse(localStorage.getItem(${JSON.stringify(stateKey)}) || "{}");
    const build = async () => { document.getElementById("resetExamBtn").click(); await frame(); document.getElementById("printExamBtn").click(); await frame(); window.ElitePaperPrint.close(); await frame(); return state(); };
    ${body}
  })()`;
}

async function openCourse(tab, base, course, { clear = true } = {}) {
  await tab.goto(`${base}/exam.html${course.query}`, READY);
  if (clear) {
    await tab.eval("localStorage.clear(); true");
    await tab.goto(`${base}/exam.html${course.query}`, READY);
  }
}

async function selectionChecks(tab, base, course) {
  await openCourse(tab, base, course);
  const result = await tab.eval(uiScript(course.stateKey, `
    const bank = window.QUESTION_DATA || window.WMA11_QUESTIONS || window.WMA12_QUESTIONS || window.WME01_QUESTIONS || [];
    await set("examCount", 10);
    await set("examSeed", "SEED234");
    const first = await build();
    const second = await build();
    await set("examSeed", "OTHER789");
    const third = await build();
    await set("examSeed", "");
    await set("examAvoidRepeats", false);
    const fresh = await build();
    await set("examAvoidRepeats", true);
    const avoiding = await build();
    return { first, second, third, fresh, avoiding, plan: document.getElementById("examPlanSummary").innerText };
  `));
  const label = course.label;
  assert.equal(result.first.ids.length, 10, `${label}: seeded build should hold 10 questions`);
  assert.deepEqual(result.second.ids, result.first.ids, `${label}: same test code + settings must rebuild the same questions in the same order`);
  assert.equal(result.first.seed, "SEED234", `${label}: typed test code should be stored`);
  assert.ok(result.first.bankVersion, `${label}: bank version should be stored`);
  assert.notDeepEqual(result.third.ids, result.first.ids, `${label}: a different test code should give a different paper`);
  [result.first, result.third, result.fresh, result.avoiding].forEach((paper) => {
    assert.equal(new Set(paper.ids).size, paper.ids.length, `${label}: no repeated question IDs`);
  });
  const overlap = result.avoiding.ids.filter((id) => result.fresh.ids.includes(id) || result.first.ids.includes(id) || result.third.ids.includes(id));
  assert.equal(overlap.length, 0, `${label}: Avoid recent repeats must skip questions from recent papers (${overlap.length} overlap)`);
  assert.match(result.plan, /eligible questions/, `${label}: the pre-build summary should be visible`);
  return result;
}

async function levelMixChecks(tab, base) {
  const linear = COURSES[0];
  await openCourse(tab, base, linear);
  const strict = await tab.eval(uiScript(linear.stateKey, `
    await set("examCount", 20);
    await set("examLevelMix", "balanced");
    const paper = await build();
    const bank = new Map((window.QUESTION_DATA || []).map((q) => [q.id, q]));
    const levels = { easy: 0, medium: 0, hard: 0 };
    paper.ids.forEach((id) => { const m = Number(bank.get(id).marks); levels[m < 3 ? "easy" : m <= 4 ? "medium" : "hard"] += 1; });
    const sources = new Set(paper.ids.map((id) => bank.get(id).source_id || id));
    return { levels, count: paper.ids.length, sources: sources.size };
  `));
  assert.deepEqual(strict.levels, { easy: 6, medium: 8, hard: 6 }, "Linear: Balanced 30/40/30 should give exactly 6/8/6 of 20");
  assert.equal(strict.sources, 20, "Linear: strict mix must not repeat source questions");

  const wme01 = COURSES[5];
  await openCourse(tab, base, wme01);
  const refused = await tab.eval(uiScript(wme01.stateKey, `
    await set("examCount", 10);
    const before = await build();
    await set("examLevelMix", "foundation");
    document.getElementById("printExamBtn").click();
    await frame();
    const opened = window.ElitePaperPrint.isOpen();
    window.ElitePaperPrint.close();
    return { beforeIds: before.ids, afterIds: state().ids, message: document.getElementById("examResultCard").innerText, opened };
  `));
  assert.deepEqual(refused.afterIds, refused.beforeIds, "WME01: an impossible level mix must not silently change the paper");
  assert.match(refused.message, /cannot be met/i, "WME01: an impossible level mix must explain why");
  assert.equal(refused.opened, false, "WME01: the print preview must not open for a paper that could not be built");
}

async function swapAndLinkChecks(tab, base) {
  const course = COURSES[1];
  await openCourse(tab, base, course);
  const swapped = await tab.eval(uiScript(course.stateKey, `
    await set("examCount", 12);
    const before = await build();
    const button = document.querySelector('[data-swap-id="' + before.ids[2] + '"]');
    if (!button) throw new Error("swap button missing");
    button.click();
    await frame();
    const after = state();
    let link = "";
    navigator.clipboard.writeText = async (text) => { link = text; };
    document.querySelector("[data-copy-link]").click();
    await new Promise((r) => setTimeout(r, 100));
    return { before: before.ids, after: after.ids, swaps: after.swaps, code: document.getElementById("examResultCard").innerText, link };
  `));
  assert.equal(swapped.after.length, swapped.before.length, "Swap should keep the question count");
  assert.notEqual(swapped.after[2], swapped.before[2], "Swap should replace the chosen question");
  swapped.before.forEach((id, index) => {
    if (index !== 2) assert.equal(swapped.after[index], id, "Swap must keep every other question in place");
  });
  assert.equal(new Set(swapped.after).size, swapped.after.length, "Swap must not create a duplicate");
  assert.equal(swapped.swaps, 1, "Swap count should be recorded in the test code");
  assert.match(swapped.code, /-S1/, "Test code should show the swap");
  assert.match(swapped.link, /[?&]paper=/, "Copy test link should produce a paper link");

  await tab.eval("localStorage.clear(); true");
  await tab.goto(swapped.link, READY);
  const shared = await tab.eval(uiScript(course.stateKey, `return { ids: state().ids, label: document.getElementById("startExamBtn").textContent, url: location.href, notice: document.getElementById("examResultCard").innerText };`));
  assert.deepEqual(shared.ids, swapped.after, "Shared link should reopen exactly the same questions in the same order");
  assert.match(shared.label, /shared test/i, "Shared link should offer to start the shared test");
  assert.ok(!/[?&]paper=/.test(shared.url), "Shared link parameter should be removed after loading");
}

/* ---- A4 print ----------------------------------------------------------- */

function pdfPages(buffer) {
  const text = buffer.toString("latin1");
  const boxes = [...text.matchAll(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/g)].map((match) => [Number(match[1]), Number(match[2])]);
  const pageCount = (text.match(/\/Type\s*\/Page(?!s)/g) || []).length;
  return { pageCount, boxes };
}

async function printChecks(tab, twin, base, course, { count, variants }) {
  await openCourse(tab, base, course);
  await tab.eval(uiScript(course.stateKey, `
    await set("examCount", ${count});
    await set("examSeed", "PRINT${count}");
    document.getElementById("printExamBtn").click();
    return true;
  `));
  await tab.waitFor("ElitePaperPrint.isOpen()", `${course.label} studio`);
  const rows = [];
  const numbering = {};
  for (const variant of variants) {
    await tab.eval(`ElitePaperPrint.setOptions(${JSON.stringify(variant.options)}); true`);
    await tab.waitFor("ElitePaperPrint.isReady()", `${course.label} ${variant.name} ready`, 900);
    const report = await tab.eval("JSON.parse(JSON.stringify(ElitePaperPrint.lastReport))");
    const details = await tab.eval(`(() => {
      const doc = ElitePaperPrint.frame().contentDocument;
      return {
        html: "<!doctype html>" + doc.documentElement.outerHTML,
        numbers: [...doc.querySelectorAll(".q-head:not(.is-continued) .q-num")].map((node) => node.textContent.trim()),
        marks: [...doc.querySelectorAll(".q-head:not(.is-continued) .q-marks")].map((node) => node.textContent.trim()),
        solutions: [...doc.querySelectorAll(".s-head strong")].map((node) => node.textContent.trim()),
        footers: [...doc.querySelectorAll(".foot-page")].map((node) => node.textContent.trim())
      };
    })()`);
    const label = `${course.label} ${variant.name}`;
    assert.equal(report.blankPages, 0, `${label}: no blank pages`);
    assert.deepEqual(report.overflowPages, [], `${label}: no page overflows its A4 sheet`);
    assert.deepEqual(report.overflowUnits, [], `${label}: no solution step is taller than a page`);
    assert.deepEqual(report.problems, [], `${label}: no raw LaTeX, raw HTML or pixel-analysis failures`);
    assert.deepEqual(report.missingImages, [], `${label}: every question image loads`);
    assert.deepEqual(report.sheetSizeMm, { width: 210, height: 297 }, `${label}: sheets are 210 x 297 mm`);
    assert.equal(details.numbers.length, count, `${label}: every question appears once`);
    assert.deepEqual(details.numbers, Array.from({ length: count }, (_, index) => String(index + 1)), `${label}: questions numbered 1..n in order`);
    assert.equal(details.footers.at(-1), `Page ${report.pages} of ${report.pages}`, `${label}: page numbering`);
    if (variant.options.version === "solutions") {
      assert.deepEqual(details.solutions, details.numbers.map((n) => `Solution ${n}`), `${label}: solutions match question numbering`);
    }
    numbering[variant.name] = { numbers: details.numbers, marks: details.marks };

    // Exercise the browser print service separately from the direct download.
    if (!SKIP_NATIVE) {
    await twin.goto(`${base}/robots.txt`);
    await twin.eval(`document.open(); document.write(${JSON.stringify(details.html)}); document.close(); true`);
    await twin.waitFor("document.readyState === 'complete' && [...document.images].every((img) => img.complete) && document.fonts.status === 'loaded'", `${label} pdf twin`);
    await delay(250);
    const pdf = await twin.send("Page.printToPDF", { preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false });
    const buffer = Buffer.from(pdf.data, "base64");
    const parsed = pdfPages(buffer);
    assert.equal(parsed.pageCount, report.pages, `${label}: PDF page count matches the preview`);
    parsed.boxes.forEach(([width, height]) => {
      assert.ok(Math.abs(width - 595.28) < 1.5 && Math.abs(height - 841.89) < 1.5, `${label}: PDF page is A4 (got ${width} x ${height} pt)`);
    });
    if (PDF_DIR) {
      fs.mkdirSync(PDF_DIR, { recursive: true });
      fs.writeFileSync(path.join(PDF_DIR, `${BROWSER}-${course.key}-${variant.name}.pdf`), buffer);
    }
    }

    // Save and inspect the actual Download PDF output, including solution maths.
    const built = await tab.eval(String.raw`(async () => {
      const started = performance.now();
      const blob = await window.ElitePaperPrint.buildPdfBlob();
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      return {data, bytes: blob.size, ms: Math.round(performance.now() - started),
        downloadVisible: !document.querySelector('.eps-overlay [data-act=download]').hidden,
        exportFrames: document.querySelectorAll('.eps-export-frame').length,
        controlsEnabled: !document.querySelector('.eps-overlay [data-act=download]').disabled};
    })()`);
    const direct = Buffer.from(built.data, "base64");
    const directPages = pdfPages(direct);
    assert.equal(directPages.pageCount, report.pages, `${label}: downloaded PDF page count matches preview`);
    assert.equal(directPages.boxes.length, report.pages, `${label}: every downloaded page declares a size`);
    directPages.boxes.forEach(([w,h]) => assert.ok(Math.abs(w-595.28)<1.5 && Math.abs(h-841.89)<1.5, `${label}: direct download is A4`));
    assert.ok(built.bytes > 50000 && built.downloadVisible && built.controlsEnabled, `${label}: complete downloadable content and enabled controls`);
    assert.equal(built.exportFrames, 0, `${label}: export frames are cleaned up`);
    if (PDF_DIR) {
      fs.mkdirSync(PDF_DIR, {recursive:true});
      fs.writeFileSync(path.join(PDF_DIR, `${BROWSER}-${course.key}-${variant.name}-download.pdf`), direct);
    }
    console.log(`[${BROWSER}] direct PDF: ${course.key} ${variant.name} ${report.pages}p ${built.bytes} bytes ${built.ms}ms`);
    rows.push({ variant: variant.name, pages: report.pages, split: report.splitQuestions.length, hardCuts: report.hardCuts.length });
  }
  if (numbering.student && numbering["solutions-end"]) {
    assert.deepEqual(numbering["solutions-end"], numbering.student, `${course.label}: student and solutions copies share numbering and marks`);
  }
  // Print prints the preview frame itself (a blob: tab broke print preview in Edge/Chrome).
  const printCall = await tab.eval(`(() => {
    const frameWin = window.ElitePaperPrint.frame().contentWindow;
    let calls = 0;
    const realPrint = frameWin.print;
    frameWin.print = () => { calls += 1; };
    const realOpen = window.open;
    let opened = 0;
    window.open = () => { opened += 1; return null; };
    try {
      document.querySelector(".eps-overlay [data-act=print]").click();
      return { calls, opened, method: window.ElitePaperPrint.lastPrint.method, title: frameWin.document.title };
    } finally {
      frameWin.print = realPrint;
      window.open = realOpen;
    }
  })()`);
  assert.equal(printCall.calls, 1, `${course.label}: Print calls print on the preview frame once`);
  assert.equal(printCall.opened, 0, `${course.label}: Print must not open a new tab`);
  assert.equal(printCall.method, "frame", `${course.label}: Print uses the frame method`);
  assert.match(printCall.title, /^Elite-/, `${course.label}: the PDF gets a meaningful file name`);

  // Closing the preview must leave the exam and its buttons untouched.
  const after = await tab.eval(uiScript(course.stateKey, `
    const before = state().ids.join("|");
    window.ElitePaperPrint.close();
    await frame();
    return { same: state().ids.join("|") === before, printEnabled: !document.getElementById("printExamBtn").disabled, open: window.ElitePaperPrint.isOpen() };
  `));
  assert.ok(after.same && after.printEnabled && !after.open, `${course.label}: closing the preview keeps the paper and buttons`);
  return rows;
}

const VARIANTS = [
  { name: "student", options: { version: "student", layout: "standard", placement: "end", ink: "colour" } },
  { name: "solutions-end", options: { version: "solutions", layout: "standard", placement: "end", ink: "colour" } },
  { name: "solutions-inline", options: { version: "solutions", layout: "standard", placement: "inline", ink: "mono" } },
  { name: "economy", options: { version: "student", layout: "economy", placement: "end", ink: "mono" } },
  { name: "single", options: { version: "student", layout: "single", placement: "end", ink: "colour" } },
  { name: "compact", options: { version: "student", layout: "compact", placement: "end", ink: "colour" } }
];

async function main() {
  if (SKIP_NATIVE) console.log(`[${BROWSER}] Native print service checks explicitly skipped; direct PDF downloads are still tested.`);
  const server = await startServer();
  // Separate processes: a background tab gets no animation frames in headless mode.
  const browser = await launch();
  const twinBrowser = await launch();
  const tab = await browser.openTab();
  const twin = await twinBrowser.openTab();
  try {
    const courses = COURSES.filter(course => !COURSE || course.key === COURSE);
    assert.ok(courses.length, "Requested course exists");
    for (const course of courses) {
      await selectionChecks(tab, server.base, course);
      console.log(`[${BROWSER}] selection ok: ${course.label}`);
    }
    await levelMixChecks(tab, server.base);
    console.log(`[${BROWSER}] level mix ok`);
    await swapAndLinkChecks(tab, server.base);
    console.log(`[${BROWSER}] swap + shared link ok`);
    for (const course of courses) {
      const variants = QUICK ? VARIANTS.slice(0, 2) : VARIANTS;
      const rows = await printChecks(tab, twin, server.base, course, { count: 10, variants });
      console.log(`[${BROWSER}] A4 print ok: ${course.label} ${rows.map((row) => `${row.variant}=${row.pages}p`).join(" ")}`);
    }
    if (!QUICK) {
      const rows = await printChecks(tab, twin, server.base, COURSES[0], { count: 40, variants: VARIANTS.slice(0, 2) });
      console.log(`[${BROWSER}] A4 print ok: Linear 40-question paper ${rows.map((row) => `${row.variant}=${row.pages}p`).join(" ")}`);
    }
    assert.deepEqual(tab.errors, [], "pages should not throw runtime errors");
  } finally {
    await browser.close();
    await twinBrowser.close();
    await server.close();
  }
}

module.exports = { launch, startServer, pdfPages, COURSES, READY, openCourse, uiScript };
if (require.main === module) main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
