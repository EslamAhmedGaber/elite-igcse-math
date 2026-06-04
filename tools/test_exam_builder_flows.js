const assert = require("node:assert/strict");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { pathToFileURL } = require("node:url");

const ROOT = path.resolve(__dirname, "..");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chromeExecutable() {
  const candidates = [
    process.env.CHROME_BIN,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
  ].filter(Boolean);
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error("Chrome or Edge was not found for browser regression tests.");
  return found;
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

class CdpClient {
  constructor(url) {
    this.url = url;
    this.nextId = 1;
    this.pending = new Map();
    this.events = [];
  }

  async open() {
    this.socket = new WebSocket(this.url);
    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => this.handleMessage(event));
  }

  handleMessage(event) {
    const message = JSON.parse(String(event.data));
    if (message.id && this.pending.has(message.id)) {
      const { resolve, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message || JSON.stringify(message.error)));
      else resolve(message.result || {});
      return;
    }
    if (message.method) {
      this.events.forEach((listener) => listener(message));
    }
  }

  onEvent(listener) {
    this.events.push(listener);
  }

  send(method, params = {}, sessionId = null) {
    const id = this.nextId;
    this.nextId += 1;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    const promise = new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
    this.socket.send(JSON.stringify(payload));
    return promise;
  }

  close() {
    this.socket?.close();
  }
}

async function launchChrome() {
  const port = await freePort();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "elite-exam-builder-"));
  const browser = spawn(chromeExecutable(), [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--disable-default-apps",
    "--disable-extensions",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    "about:blank"
  ], { stdio: "ignore" });

  const versionUrl = `http://127.0.0.1:${port}/json/version`;
  let version = null;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(versionUrl);
      version = await response.json();
      break;
    } catch (err) {
      await delay(100);
    }
  }
  if (!version?.webSocketDebuggerUrl) {
    browser.kill();
    throw new Error("Chrome DevTools endpoint did not start.");
  }

  const client = new CdpClient(version.webSocketDebuggerUrl);
  await client.open();
  const { targetId } = await client.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await client.send("Target.attachToTarget", { targetId, flatten: true });
  await client.send("Page.enable", {}, sessionId);
  await client.send("Runtime.enable", {}, sessionId);

  const pageErrors = [];
  client.onEvent((event) => {
    if (event.sessionId !== sessionId) return;
    if (event.method === "Runtime.exceptionThrown") {
      pageErrors.push(event.params.exceptionDetails?.text || "Runtime exception");
    }
  });

  return {
    client,
    sessionId,
    pageErrors,
    async close() {
      client.close();
      browser.kill();
      await delay(100);
      fs.rmSync(userDataDir, { recursive: true, force: true });
    }
  };
}

function examUrl(query) {
  return `${pathToFileURL(path.join(ROOT, "exam.html")).href}${query}`;
}

async function evaluate(page, expression) {
  const result = await page.client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true
  }, page.sessionId);
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || result.exceptionDetails.exception?.description || "Evaluation failed");
  }
  return result.result?.value;
}

async function waitFor(page, expression, label) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const value = await evaluate(page, expression);
    if (value) return;
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function navigate(page, url) {
  page.pageErrors.length = 0;
  await page.client.send("Page.navigate", { url }, page.sessionId);
  await waitFor(page, "document.readyState === 'complete' && Boolean(window.ElitePrint) && Boolean(document.querySelector('#examPaper'))", url);
  await installHarness(page, true);
}

async function reloadKeepingStorage(page) {
  page.pageErrors.length = 0;
  await page.client.send("Page.reload", { ignoreCache: true }, page.sessionId);
  await waitFor(page, "document.readyState === 'complete' && Boolean(window.ElitePrint) && Boolean(document.querySelector('#examPaper'))", "page reload");
  await installHarness(page, false);
}

async function installHarness(page, clearStorage) {
  await evaluate(page, `
    (() => {
      if (${clearStorage ? "true" : "false"}) localStorage.clear();
      window.__eliteTest = { printCalls: [] };
      window.print = () => {};
      window.ElitePrint.printWhenReady = async (root, trigger) => {
        window.ElitePrint.applyPrintPalette();
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        window.__eliteTest.printCalls.push({
          trigger: trigger?.id || "",
          solutions: document.body.classList.contains("print-solutions"),
          ids: [...(root || document).querySelectorAll(".exam-question")].map((node) => node.dataset.id),
          count: (root || document).querySelectorAll(".exam-question").length,
          palette: document.body.dataset.coursePalette || ""
        });
      };
      return true;
    })()
  `);
}

function pageScript(body) {
  return `
    (async () => {
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const frame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const click = async (selector) => {
        const element = document.querySelector(selector);
        if (!element) throw new Error("Missing element " + selector);
        element.click();
        await frame();
      };
      const setValue = async (selector, value) => {
        const element = document.querySelector(selector);
        if (!element) throw new Error("Missing element " + selector);
        element.value = String(value);
        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
        await frame();
      };
      const mode = () => document.body.dataset.pathway || "linear";
      const isPure = () => mode() === "pure" || new URLSearchParams(location.search).get("course") === "wma11";
      const examKey = () => isPure() ? "eliteMockExamV1:wma11" : "eliteMockExamV1";
      const draftKey = () => isPure() ? "eliteTestBuilderDraftV1:wma11" : "eliteTestBuilderDraftV1";
      const savedKey = () => isPure() ? "eliteSavedTestsV1:wma11" : "eliteSavedTestsV1";
      const readJson = (key, fallback) => {
        try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
        catch (err) { return fallback; }
      };
      const writeJson = (key, value) => localStorage.setItem(key, JSON.stringify(value));
      const rawQuestions = () => {
        if (isPure()) {
          return (window.WMA11_QUESTIONS || []).map((question) => ({
            id: question.id,
            source: question.id,
            bank: "all",
            unit: "WMA11",
            topic: question.topicName,
            topics: question.topicNames?.length ? question.topicNames : [question.topicName],
            marks: Number(question.marks || 0)
          }));
        }
        return (window.QUESTION_DATA || []).map((question) => ({
          id: question.id,
          source: question.source_id || question.id,
          bank: question.bank,
          unit: mode() === "modular" ? question.modular_unit : question.linear_unit,
          topic: question.topic,
          topics: [question.topic, ...(question.topics || [])],
          marks: Number(question.marks || 0)
        }));
      };
      const questions = rawQuestions();
      const byId = new Map(questions.map((question) => [question.id, question]));
      const source = (id) => byId.get(id)?.source || id;
      const state = () => readJson(examKey(), {});
      const printCalls = () => window.__eliteTest.printCalls;
      const selectedTopics = (selector) => [...document.querySelectorAll(selector + " input[type='checkbox']:checked")].map((input) => input.value);
      const clickTopicMixAction = async (selector, action) => {
        const id = selector.replace(/^#/, "");
        const button = document.querySelector("[data-topic-mix-target='" + id + "'][data-topic-mix-action='" + action + "']");
        if (!button) throw new Error("Missing topic mix " + action + " button for " + selector);
        button.click();
        await frame();
        return selectedTopics(selector);
      };
      const selectTopics = async (selector, count, targetCount = 10) => {
        const minimum = Math.max(1, Math.floor(targetCount / Math.max(1, count)));
        const boxes = [...document.querySelectorAll(selector + " input[type='checkbox']")]
          .map((input) => ({ input, count: Number(input.closest("label")?.querySelector("em")?.textContent || 0) }))
          .filter((item) => item.count >= minimum);
        if (boxes.length < count) throw new Error("Not enough topic choices in " + selector);
        document.querySelectorAll(selector + " input[type='checkbox']").forEach((input) => { input.checked = false; });
        const picked = boxes.slice(0, count);
        picked.forEach((item) => { item.input.checked = true; });
        document.querySelector(selector).dispatchEvent(new Event("change", { bubbles: true }));
        await frame();
        return picked.map((item) => item.input.value);
      };
      const selectNamedTopics = async (selector, names) => {
        const wanted = new Set(names);
        const boxes = [...document.querySelectorAll(selector + " input[type='checkbox']")];
        const available = new Set(boxes.map((input) => input.value));
        names.forEach((name) => {
          if (!available.has(name)) throw new Error("Topic is not available after reload: " + name);
        });
        boxes.forEach((input) => { input.checked = wanted.has(input.value); });
        document.querySelector(selector).dispatchEvent(new Event("change", { bubbles: true }));
        await frame();
        return selectedTopics(selector);
      };
      const setBuilderTopic = async (index = 0) => {
        const select = document.querySelector("#builderTopic");
        const options = [...select.options].filter((option) => option.value);
        if (!options[index]) throw new Error("No builder topic option");
        await setValue("#builderTopic", options[index].value);
        return options[index].value;
      };
      const waitForPrint = async (length) => {
        for (let index = 0; index < 80; index += 1) {
          if (printCalls().length >= length) return;
          await sleep(100);
        }
        throw new Error("Print was not called");
      };
      const summary = () => {
        const current = state();
        const ids = current.ids || [];
        const rows = ids.map((id) => byId.get(id)).filter(Boolean);
        const sourceCount = new Set(ids.map(source)).size;
        const topicCounts = {};
        rows.forEach((question) => {
          topicCounts[question.topic] = (topicCounts[question.topic] || 0) + 1;
        });
        return {
          mode: mode(),
          state: current,
          ids,
          sourceCount,
          missingIds: ids.filter((id) => !byId.has(id)),
          topicCounts,
          units: [...new Set(rows.map((question) => question.unit))],
          printCalls: printCalls()
        };
      };
      const assertAllMatchTopics = (ids, topics) => {
        const outside = ids.filter((id) => {
          const question = byId.get(id);
          return !question || !topics.some((topic) => question.topics.includes(topic) || question.topic === topic);
        });
        if (outside.length) throw new Error("Questions outside selected topics: " + outside.slice(0, 5).join(", "));
      };
      const assertBalanced = (ids, topics) => {
        const counts = topics.map((topic) => ids.filter((id) => {
          const question = byId.get(id);
          return question && (question.topic === topic || question.topics.includes(topic));
        }).length);
        const max = Math.max(...counts);
        const min = Math.min(...counts);
        if (max - min > 1) throw new Error("Topic split is not balanced: " + counts.join("/"));
      };
      ${body}
    })()
  `;
}

async function runRoute(page, route) {
  await navigate(page, examUrl(route.query));

  const random = await evaluate(page, pageScript(`
    await setValue("#examCount", 10);
    const availableTopics = await clickTopicMixAction("#examTopicMix", "available");
    if (!availableTopics.length) throw new Error("Available topic action selected no topics");
    const clearedTopics = await clickTopicMixAction("#examTopicMix", "clear");
    if (clearedTopics.length) throw new Error("Clear topic action did not clear topics");
    const topics = await selectTopics("#examTopicMix", 3, 10);
    await click("#printExamBtn");
    await waitForPrint(1);
    const data = summary();
    assertAllMatchTopics(data.ids, topics);
    assertBalanced(data.ids, topics);
    return { topics, data };
  `));
  assert.equal(random.data.state.kind, "random", `${route.label}: Random print should build a random paper`);
  assert.equal(random.data.ids.length, 10, `${route.label}: Random print should use the selected question count`);
  assert.equal(random.data.sourceCount, 10, `${route.label}: Random print should not repeat source questions`);
  assert.equal(random.data.state.buildConfig.buildVersion, "random-topic-split-v2", `${route.label}: Random build version should be saved`);
  assert.deepEqual([...random.data.state.buildConfig.topics].sort(), [...random.topics].sort(), `${route.label}: Random build config should capture selected topics`);

  await evaluate(page, pageScript(`
    const config = { ...state().buildConfig };
    writeJson(examKey(), {
      status: "idle",
      kind: "random",
      title: "Old cached random mock",
      bank: config.bank,
      unit: config.unit,
      durationSeconds: 5400,
      ids: ["stale-one", "stale-two", "stale-three"],
      scores: {},
      buildConfig: { ...config, buildVersion: undefined }
    });
    return true;
  `));
  await reloadKeepingStorage(page);
  const stale = await evaluate(page, pageScript(`
    await setValue("#examCount", 10);
    await selectNamedTopics("#examTopicMix", ${JSON.stringify(random.topics)});
    await click("#printExamBtn");
    await waitForPrint(1);
    return summary();
  `));
  assert.equal(stale.ids.length, 10, `${route.label}: stale Random cache should rebuild to the current count`);
  assert.equal(stale.state.buildConfig.buildVersion, "random-topic-split-v2", `${route.label}: stale Random cache should be replaced`);
  assert.equal(stale.missingIds.length, 0, `${route.label}: stale Random cache should not leave fake IDs`);

  const revision = await evaluate(page, pageScript(`
    await click("[data-exam-mode='smart']");
    await setValue("#smartCount", 10);
    const availableTopics = await clickTopicMixAction("#smartTopicMix", "available");
    if (!availableTopics.length) throw new Error("Revision available topic action selected no topics");
    const clearedTopics = await clickTopicMixAction("#smartTopicMix", "clear");
    if (clearedTopics.length) throw new Error("Revision clear topic action did not clear topics");
    const topics = await selectTopics("#smartTopicMix", 3, 10);
    await click("#printSolutionBtn");
    await waitForPrint(2);
    const data = summary();
    assertAllMatchTopics(data.ids, topics);
    return { topics, data, lastPrint: printCalls().at(-1) };
  `));
  assert.equal(revision.data.state.kind, "revision-book", `${route.label}: Revision Book should build its own paper`);
  assert.equal(revision.data.ids.length, 10, `${route.label}: Revision Book should use the selected count`);
  assert.equal(revision.data.sourceCount, 10, `${route.label}: Revision Book should not repeat source questions`);
  assert.equal(revision.data.state.buildConfig.buildVersion, "revision-book-v2", `${route.label}: Revision build version should be saved`);
  assert.equal(revision.lastPrint.solutions, true, `${route.label}: Revision print with solutions should mark solution printing`);

  const custom = await evaluate(page, pageScript(`
    await click("[data-exam-mode='custom']");
    const topic = await setBuilderTopic(0);
    await click("#addVisibleBtn");
    const draftIds = readJson(draftKey(), []);
    if (!draftIds.length) throw new Error("Build Test draft did not receive questions");
    assertAllMatchTopics(draftIds, [topic]);
    await click("#startExamBtn");
    const data = summary();
    await click("#printDraftBtn");
    await waitForPrint(3);
    return { topic, draftIds, data, lastPrint: printCalls().at(-1) };
  `));
  assert.equal(custom.data.state.kind, "custom", `${route.label}: Build Test primary action should not create a Random paper`);
  assert.equal(custom.data.state.buildConfig.buildVersion, "custom-test-v2", `${route.label}: Custom build version should be saved`);
  assert.deepEqual(custom.data.ids, custom.draftIds, `${route.label}: Build Test should print the current draft IDs`);
  assert.equal(custom.data.sourceCount, custom.data.ids.length, `${route.label}: Build Test should not repeat source questions`);

  const saved = await evaluate(page, pageScript(`
    window.prompt = () => "Regression saved test";
    await click("#saveCurrentTestBtn");
    await click("[data-exam-mode='saved']");
    const savedItems = readJson(savedKey(), []);
    const visibleCards = document.querySelectorAll(".saved-test").length;
    if (!visibleCards) throw new Error("Saved Tests tab did not show the current saved test");
    await click("[data-print-test]");
    await waitForPrint(4);
    return { savedItems, visibleCards, data: summary(), lastPrint: printCalls().at(-1) };
  `));
  assert.ok(saved.savedItems.some((item) => item.course === route.course && item.pathway === route.pathway), `${route.label}: Saved test should store course and pathway`);
  assert.equal(saved.data.state.kind, "custom", `${route.label}: Saved test print should load the saved custom paper`);
  assert.ok(saved.lastPrint.count > 0, `${route.label}: Saved test print should render questions`);

  assert.deepEqual(page.pageErrors, [], `${route.label}: page should not throw runtime errors`);
}

async function main() {
  const page = await launchChrome();
  const routes = [
    { label: "Linear", query: "?pathway=linear", course: "igcse", pathway: "linear" },
    { label: "Modular Unit 1", query: "?pathway=modular&unit=Unit+1", course: "igcse", pathway: "modular" },
    { label: "Modular Unit 2", query: "?pathway=modular&unit=Unit+2", course: "igcse", pathway: "modular" },
    { label: "Pure WMA11", query: "?pathway=pure&course=wma11", course: "wma11", pathway: "pure" }
  ];

  try {
    for (const route of routes) {
      await runRoute(page, route);
      console.log(`exam builder flow passed: ${route.label}`);
    }
  } finally {
    await page.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
