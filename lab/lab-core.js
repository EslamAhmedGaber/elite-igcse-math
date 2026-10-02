// Elite Visual Lab — shared helpers: drawing marks, tabs, Predict-first, Play loop, dragging, live panel.
(function () {
  const colors = { navy: "#14254a", royal: "#2456c9", gold: "#e2b84f", red: "#c2410c", green: "#0e7c66", purple: "#6d4bd1", grey: "#9fb2d4" };

  function tag(ctx, p, text, color) {
    ctx.font = "700 14px Sora, sans-serif";
    const w = ctx.measureText(text).width + 12;
    ctx.fillStyle = "rgba(255,255,255,.92)"; ctx.beginPath(); ctx.roundRect(p[0] - w / 2, p[1] - 11, w, 22, 6); ctx.fill();
    ctx.fillStyle = color; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, p[0], p[1]);
  }
  function label(ctx, p, text) {
    if (!text) return;
    ctx.font = "800 17px Sora, sans-serif"; ctx.fillStyle = colors.navy; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(text, p[0], p[1]);
  }
  function dot(ctx, p, r = 4.5, color = colors.navy) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, Math.PI * 2); ctx.fill(); }
  function handle(ctx, p) {
    ctx.fillStyle = colors.royal; ctx.beginPath(); ctx.arc(p[0], p[1], 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.5; ctx.stroke();
  }

  function renderLive(id, rows) {
    document.getElementById(id).innerHTML = rows.map(([a, b]) => (a === "ok" ? `<div class="ok">${b}</div>` : `<div><span>${a}</span><b>${b}</b></div>`)).join("");
  }
  function setQuiz([q, a]) {
    const qe = document.getElementById("quizQ"), ae = document.getElementById("quizA");
    if (qe.dataset.q !== q) { qe.textContent = q; qe.dataset.q = q; ae.classList.remove("show"); }
    ae.textContent = a;
  }
  function slider(key, name, value, min, max, step) {
    return `<label>${name}<input type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-k="${key}"><output>${value}</output></label>`;
  }

  function tabs(id, names, onSelect) {
    const el = document.getElementById(id);
    el.innerHTML = names.map((n, i) => `<button type="button" aria-pressed="false"><span>${i + 1}</span>${n}</button>`).join("");
    el.querySelectorAll("button").forEach((b, i) => b.addEventListener("click", () => onSelect(i)));
  }
  function selectTab(id, i) { document.querySelectorAll(`#${id} button`).forEach((b, j) => b.setAttribute("aria-pressed", String(i === j))); }

  function predict(pq, onAnswer) {
    document.getElementById("predictQ").textContent = pq.q;
    const fb = document.getElementById("predictFb"); fb.hidden = true;
    const box = document.getElementById("predictOpts");
    box.innerHTML = pq.o.map((o, j) => `<button type="button" data-j="${j}">${o}</button>`).join("");
    box.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
      const j = Number(b.dataset.j);
      box.querySelectorAll("button").forEach((x) => { x.disabled = true; if (Number(x.dataset.j) === pq.a) x.classList.add("right"); });
      if (j !== pq.a) b.classList.add("wrong");
      fb.textContent = (j === pq.a ? "Correct! " : "Not quite. ") + pq.why + " Watch it move.";
      fb.hidden = false; onAnswer();
    }));
  }

  // Play: calls frame(seconds since start) every animation frame until stopped
  const play = { on: false, t0: 0, frame: null, onStop: null, btn: null };
  function setBtn(on) { if (play.btn) { play.btn.setAttribute("aria-pressed", String(on)); play.btn.innerHTML = on ? "&#10073;&#10073; Pause" : "&#9654; Play"; } }
  function startPlay(frame) {
    play.frame = frame; play.on = true; play.t0 = performance.now(); setBtn(true);
    const tick = (now) => { if (!play.on) return; play.frame((now - play.t0) / 1000); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }
  function stopPlay() { const was = play.on; play.on = false; setBtn(false); if (was && play.onStop) play.onStop(); }
  function bindPlay(id, start, onStop) {
    play.btn = document.getElementById(id); play.onStop = onStop;
    play.btn.addEventListener("click", () => (play.on ? stopPlay() : start()));
  }

  // dragging: handles() -> [[key, [x, y]] ...] in canvas pixels; move(key, [x, y])
  function drag(cv, handles, move) {
    let active = null;
    const local = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const nearest = (m) => { let best = null, bd = 24; handles().forEach(([k, p]) => { const d = Math.hypot(p[0] - m[0], p[1] - m[1]); if (d < bd) { bd = d; best = k; } }); return best; };
    cv.addEventListener("pointerdown", (e) => { const k = nearest(local(e)); if (k) { stopPlay(); active = k; cv.setPointerCapture(e.pointerId); } });
    cv.addEventListener("pointermove", (e) => {
      const m = local(e);
      if (!active) { cv.style.cursor = nearest(m) ? "grab" : "default"; return; }
      move(active, m);
    });
    cv.addEventListener("pointerup", () => { active = null; });
  }

  function resize(cv, cb) {
    const ctx = cv.getContext("2d");
    const run = () => { const r = cv.getBoundingClientRect(), d = window.devicePixelRatio || 1; cv.width = r.width * d; cv.height = r.height * d; ctx.setTransform(d, 0, 0, d, 0, 0); cb(r.width, r.height); };
    window.addEventListener("resize", run); run();
  }

  document.addEventListener("click", (e) => { if (e.target.id === "quizBtn") document.getElementById("quizA").classList.toggle("show"); });
  window.EliteLab = { colors, tag, label, dot, handle, renderLive, setQuiz, slider, tabs, selectTab, predict, startPlay, stopPlay, bindPlay, drag, resize };
})();
