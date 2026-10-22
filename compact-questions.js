(function () {
  "use strict";
  // On screen only: past-paper question images carry the paper's blank answer space, wide empty
  // margins and the "(Total for Question n is m marks)" footer, which shrink the question text in a
  // card. In the browser this trims the margins and footer and shortens long blank stretches. The
  // image files are untouched, so printed worksheets and the full-size zoom keep the original page.

  const SELECTOR = ".question-card .thumb img, img.ial-question-image, .e27-dq-img img, .exam-question > img";
  const MIN_RUN = 56; // blank rows longer than this (in image pixels) are shortened...
  const KEEP = 26; // ...to this many rows
  const MIN_COL_RUN = 90; // empty columns wider than this...
  const KEEP_COL = 48; // ...keep this much
  const MIN_SAVING = 0.12; // not worth it below 12% of the area
  const cache = new Map(); // original src -> compact blob URL ("" = leave as is)
  const handled = new WeakSet();
  const idle = window.requestIdleCallback
    ? (task) => window.requestIdleCallback(task, { timeout: 1500 })
    : (task) => window.setTimeout(task, 60);

  // Per row: how many dark pixels, and where the ink starts and ends.
  function scanRows(data, w, h) {
    const count = new Uint32Array(h);
    const left = new Int32Array(h).fill(w);
    const right = new Int32Array(h).fill(-1);
    for (let y = 0; y < h; y += 1) {
      let i = y * w * 4;
      for (let x = 0; x < w; x += 1, i += 4) {
        if (data[i + 3] > 40 && data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11 < 190) {
          count[y] += 1;
          if (x < left[y]) left[y] = x;
          right[y] = x;
        }
      }
    }
    return { count, left, right, width: w };
  }

  // "(Total for Question n is m marks)" and the rule under it: the card already shows the marks.
  function footerTop(rows, w, h) {
    const blank = (y) => rows.count[y] <= 2;
    let y = h - 1;
    while (y > 0 && blank(y)) y -= 1;
    let ruleTop = -1;
    if (rows.count[y] > w * 0.5) { // the closing rule
      while (y > 0 && rows.count[y] > w * 0.5) y -= 1;
      ruleTop = y + 1;
      while (y > 0 && blank(y)) y -= 1;
    }
    const end = y;
    let minX = w;
    let maxX = -1;
    while (y > 0 && !blank(y)) { minX = Math.min(minX, rows.left[y]); maxX = Math.max(maxX, rows.right[y]); y -= 1; }
    const block = end - y;
    const looksLikeTotal = minX > w * 0.4 && maxX - minX > w * 0.09 && block < Math.max(48, h * 0.12);
    if (looksLikeTotal) return y + 1;
    return ruleTop > 0 && ruleTop > h * 0.6 ? ruleTop : h;
  }

  function keptSlices(rows, top, bottom) {
    const blank = (y) => rows.count[y] <= 2;
    let first = top;
    while (first < bottom && blank(first)) first += 1;
    // A thin rule at the very top (the line under the previous question on IAL papers).
    let rule = first;
    while (rule < bottom && rows.count[rule] > rows.width * 0.5) rule += 1;
    if (rule > first && rule - first < 8) {
      first = rule;
      while (first < bottom && blank(first)) first += 1;
    }
    let last = bottom - 1;
    while (last > first && blank(last)) last -= 1;
    const slices = [];
    let start = Math.max(top, first - 10);
    let y = first;
    while (y <= last) {
      if (!blank(y)) { y += 1; continue; }
      let end = y;
      while (end <= last && blank(end)) end += 1;
      if (end - y > MIN_RUN) {
        const half = Math.floor(KEEP / 2);
        slices.push([start, y + half]);
        start = end - (KEEP - half);
      }
      y = end;
    }
    slices.push([start, Math.min(bottom, last + 11)]);
    return slices;
  }

  // Columns empty from top to bottom (the gap between a question and its right-hand answer
  // lines) are shortened too; nothing moves within a line except that gap.
  function columnSlices(data, w, slices, x0, x1) {
    const ink = new Uint32Array(w);
    slices.forEach(([a, b]) => {
      for (let y = a; y < b; y += 1) {
        let i = (y * w + x0) * 4;
        for (let x = x0; x < x1; x += 1, i += 4) {
          if (data[i + 3] > 40 && data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11 < 190) ink[x] += 1;
        }
      }
    });
    const out = [];
    let start = x0;
    let x = x0;
    while (x < x1) {
      if (ink[x]) { x += 1; continue; }
      let end = x;
      while (end < x1 && !ink[end]) end += 1;
      if (end - x > MIN_COL_RUN && x > x0 && end < x1) {
        const half = Math.floor(KEEP_COL / 2);
        out.push([start, x + half]);
        start = end - (KEEP_COL - half);
      }
      x = end;
    }
    out.push([start, x1]);
    return out;
  }

  function compact(img, original) {
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || h < 60) { cache.set(original, ""); return; }
    const source = document.createElement("canvas");
    source.width = w;
    source.height = h;
    const ctx = source.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    let pixels;
    try { pixels = ctx.getImageData(0, 0, w, h).data; } catch (err) { cache.set(original, ""); return; }
    const rows = scanRows(pixels, w, h);
    const bottom = footerTop(rows, w, h);
    const slices = keptSlices(rows, 0, bottom);
    let minX = w;
    let maxX = -1;
    slices.forEach(([a, b]) => { for (let y = a; y < b; y += 1) if (rows.count[y] > 2) { minX = Math.min(minX, rows.left[y]); maxX = Math.max(maxX, rows.right[y]); } });
    if (maxX < 0) { cache.set(original, ""); return; }
    const x0 = Math.max(0, minX - 14);
    const x1 = Math.min(w, maxX + 15);
    const cols = columnSlices(pixels, w, slices, x0, x1);
    const cw = cols.reduce((sum, [a, b]) => sum + (b - a), 0);
    const newH = slices.reduce((sum, [a, b]) => sum + (b - a), 0);
    if (cw * newH > w * h * (1 - MIN_SAVING)) { cache.set(original, ""); return; }
    const out = document.createElement("canvas");
    out.width = cw;
    out.height = newH;
    const octx = out.getContext("2d");
    octx.fillStyle = "#fff";
    octx.fillRect(0, 0, cw, newH);
    let dy = 0;
    slices.forEach(([a, b]) => {
      let dx = 0;
      cols.forEach(([c, d]) => { octx.drawImage(source, c, a, d - c, b - a, dx, dy, d - c, b - a); dx += d - c; });
      dy += b - a;
    });
    out.toBlob((blob) => {
      if (!blob) { cache.set(original, ""); return; }
      const url = URL.createObjectURL(blob);
      cache.set(original, url);
      swap(img, original);
    }, "image/png");
  }

  function swap(img, original) {
    const url = cache.get(original);
    if (!url || img.dataset.fullSrc) return;
    img.dataset.fullSrc = original;
    img.src = url;
    img.classList.add("is-compact");
  }

  function consider(img) {
    if (!(img instanceof HTMLImageElement) || handled.has(img) || !img.matches(SELECTOR)) return;
    const original = img.getAttribute("src") || "";
    if (!original || original.startsWith("blob:")) return;
    if (cache.has(original)) { handled.add(img); swap(img, original); return; }
    if (!img.complete || !img.naturalWidth) return; // the load listener comes back
    handled.add(img);
    // Pixel work waits for an idle moment so scrolling and typing stay smooth on phones.
    idle(() => compact(img, original));
  }

  document.addEventListener("load", (event) => consider(event.target), true);
  // Cards re-render on every filter change: reuse the compact copy straight away.
  new MutationObserver((records) => {
    records.forEach((record) => record.addedNodes.forEach((node) => {
      if (node.nodeType !== 1) return;
      if (node.tagName === "IMG") consider(node);
      else node.querySelectorAll?.("img").forEach(consider);
    }));
  }).observe(document.documentElement, { childList: true, subtree: true });
  const scan = () => document.querySelectorAll(SELECTOR).forEach(consider);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scan);
  else scan();
})();
