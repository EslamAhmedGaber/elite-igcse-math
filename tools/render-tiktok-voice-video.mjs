import { mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import puppeteer from "puppeteer-core";
import ffmpegPath from "ffmpeg-static";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const pageName = process.argv[2] || "promo-voice.html";
const outputName = process.argv[3] || "assets/elite-igcse-tiktok-voice-silent.mp4";
const durationSeconds = Number(process.argv[4] || 32.25);
const promoUrl = `http://127.0.0.1:8766/${pageName}?video=1`;
const output = resolve(root, outputName);
const framesDir = resolve(root, ".tiktok-voice-frames");

function run(command, args) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("exit", (code) => {
      if (code === 0) resolveRun();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

if (!existsSync(edgePath)) throw new Error(`Microsoft Edge was not found at ${edgePath}`);
if (!ffmpegPath) throw new Error("ffmpeg-static did not provide an FFmpeg binary.");

await rm(framesDir, { recursive: true, force: true });
await mkdir(framesDir, { recursive: true });
await mkdir(dirname(output), { recursive: true });

const browser = await puppeteer.launch({
  executablePath: edgePath,
  headless: "new",
  defaultViewport: { width: 1080, height: 1920, deviceScaleFactor: 1 },
  args: [
    "--disable-gpu",
    "--hide-scrollbars",
    "--mute-audio",
    "--no-first-run",
    "--disable-extensions",
  ],
});

const page = await browser.newPage();
const client = await page.createCDPSession();
let frame = 0;

client.on("Page.screencastFrame", async (event) => {
  frame += 1;
  const name = join(framesDir, `frame-${String(frame).padStart(5, "0")}.jpg`);
  await writeFile(name, Buffer.from(event.data, "base64"));
  await client.send("Page.screencastFrameAck", { sessionId: event.sessionId });
});

await page.goto(promoUrl, { waitUntil: "networkidle0" });
await page.evaluate(async () => {
  await document.fonts.ready;
});

await client.send("Page.startScreencast", {
  format: "jpeg",
  quality: 92,
  everyNthFrame: 1,
});

await page.reload({ waitUntil: "networkidle0" });
await new Promise((resolveDelay) => setTimeout(resolveDelay, durationSeconds * 1000));
await client.send("Page.stopScreencast");
await browser.close();

if (frame < 30) throw new Error(`Only captured ${frame} frames.`);

const inputFps = frame / durationSeconds;
await run(ffmpegPath, [
  "-y",
  "-framerate", String(inputFps),
  "-i", join(framesDir, "frame-%05d.jpg"),
  "-vf", "fps=30,scale=1080:1920:flags=lanczos,format=yuv420p",
  "-c:v", "libx264",
  "-preset", "medium",
  "-crf", "17",
  "-movflags", "+faststart",
  output,
]);

await rm(framesDir, { recursive: true, force: true });
console.log(`Captured ${frame} frames`);
console.log(output);
