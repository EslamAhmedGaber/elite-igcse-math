/* ==========================================================================
   results.js - Student results: join a group with its code, then see own
   marks for published exams, the group average, the top three, a progress
   chart, badges and the topics the group has covered.
   ========================================================================== */
(function () {
  "use strict";

  const C = window.EliteClassroom;
  const $ = (selector, rootNode = document) => rootNode.querySelector(selector);
  const params = new URLSearchParams(window.location.search);
  const view = { codes: [], active: "", group: null, exams: [], scores: {}, membership: null };

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));
  }

  function formatDate(value) {
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? value || "" : date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }

  function pct(score, max) {
    return max ? Math.round((Number(score) / Number(max)) * 1000) / 10 : 0;
  }

  function firstName(name) {
    return String(name || "").trim().split(/\s+/)[0] || "there";
  }

  function setMain(html) {
    $("#rsMain").innerHTML = html;
  }

  function showError(error) {
    const node = $("#rsError");
    if (!node) return;
    node.textContent = C.friendlyError(error);
    node.hidden = false;
  }

  /* -------------------------------------------------------------- screens */

  function signInScreen(snapshot) {
    setMain(`
      <section class="rs-welcome">
        <span class="cls-kicker">My Results</span>
        <h1>See your exam results</h1>
        <p>Sign in with the Google account your teacher knows, then enter your group code once. Your marks stay private: you see your own mark, the group average and the top three.</p>
        <button type="button" class="cls-btn is-primary is-large" data-sign-in>Sign in with Google</button>
        ${snapshot.error ? `<p class="cls-error">${escapeHtml(snapshot.error)}</p>` : ""}
      </section>`);
  }

  function joinScreen(user, prefill = "") {
    setMain(`
      <section class="rs-welcome">
        <span class="cls-kicker">Welcome, ${escapeHtml(firstName(user.displayName))}</span>
        <h1>Join your group</h1>
        <p>Type the code your teacher gave you (for example <b>ORBIT</b>). You only do this once.</p>
        <form id="rsJoin" class="rs-join">
          <label>Group code <input name="code" required maxlength="24" autocomplete="off" value="${escapeHtml(prefill)}" placeholder="ORBIT"></label>
          <label>Your name as your teacher knows it <input name="name" required maxlength="60" value="${escapeHtml(user.displayName || "")}"></label>
          <button type="submit" class="cls-btn is-primary is-large">Join group</button>
        </form>
        <p class="cls-error" id="rsError" hidden></p>
        <p class="cls-muted">Signed in as ${escapeHtml(user.email)} &middot; <button type="button" class="cls-link" data-sign-out>Use another account</button></p>
      </section>`);
    $("#rsJoin input[name=code]")?.focus();
  }

  /* ------------------------------------------------------------- dashboard */

  async function loadGroup(code) {
    view.active = code;
    const [group, membership, exams] = await Promise.all([
      C.api.getGroup(code),
      C.api.myMembership(code),
      C.api.listExams(code, { publishedOnly: true })
    ]);
    view.group = group;
    view.membership = membership;
    view.exams = exams.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const scores = await Promise.all(view.exams.map((exam) => C.api.myScore(code, exam.id).catch(() => null)));
    view.scores = Object.fromEntries(view.exams.map((exam, index) => [exam.id, scores[index]]));
    renderDashboard();
  }

  function myRows() {
    return view.exams.map((exam) => {
      const row = view.scores[exam.id];
      const has = row && row.score !== undefined && row.score !== null;
      return {
        exam,
        score: has ? Number(row.score) : null,
        pct: has ? pct(row.score, exam.maxMarks) : null,
        avgPct: Number(exam.stats?.averagePct || 0),
        inTop: has && (exam.stats?.top || []).some((top) => Number(top.score) === Number(row.score) && top.place <= 3)
      };
    });
  }

  function badges(rows) {
    const taken = rows.filter((row) => row.pct !== null);
    const list = [];
    if (taken.some((row) => row.pct >= 100)) list.push(["Full marks", "Scored 100% in an exam", "star"]);
    if (taken.some((row) => row.inTop)) list.push(["Top three", "Placed in the top three of the group", "podium"]);
    for (let i = 1; i < taken.length; i += 1) {
      if (taken[i].pct - taken[i - 1].pct >= 10) {
        list.push(["Big improver", "Improved by 10% or more from one exam to the next", "up"]);
        break;
      }
    }
    let streak = 0;
    let best = 0;
    taken.forEach((row) => { streak = row.pct >= 80 ? streak + 1 : 0; best = Math.max(best, streak); });
    if (best >= 3) list.push(["On fire", "Three exams in a row at 80% or more", "fire"]);
    if (taken.length >= 5) list.push(["Consistent", "Sat five exams with the group", "check"]);
    if (taken.some((row) => row.pct > row.avgPct)) list.push(["Above average", "Beat the group average", "chart"]);
    return list;
  }

  const ICONS = {
    star: '<path d="M12 3l2.6 5.4 5.9.8-4.3 4.2 1 5.8L12 16.6 6.8 19.2l1-5.8L3.5 9.2l5.9-.8z"/>',
    podium: '<path d="M4 20V13h5v7M9 20V8h6v12M15 20v-5h5v5"/>',
    up: '<path d="M4 17l6-6 4 4 6-7"/><path d="M14 8h6v6"/>',
    fire: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-7 2 1 3 3 3 5"/>',
    check: '<path d="M5 12l4 4 10-10"/>',
    chart: '<path d="M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3"/>'
  };

  function icon(name) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.star}</svg>`;
  }

  /* Line chart: my % against the group average %, one point per exam. */
  function chart(rows) {
    const points = rows.filter((row) => row.pct !== null || row.avgPct);
    if (points.length < 2) return `<p class="cls-muted">Your progress chart appears after two published exams.</p>`;
    const W = 1000;
    const H = 280;
    const pad = { l: 44, r: 44, t: 16, b: 38 };
    const x = (i) => pad.l + (i * (W - pad.l - pad.r)) / (points.length - 1);
    const y = (v) => pad.t + (1 - v / 100) * (H - pad.t - pad.b);
    const line = (key) => points.map((row, i) => row[key] === null ? null : `${x(i).toFixed(1)},${y(row[key]).toFixed(1)}`).filter(Boolean).join(" ");
    const grid = [0, 25, 50, 75, 100].map((v) => `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}" class="rs-grid"/><text x="${pad.l - 8}" y="${y(v) + 4}" class="rs-axis" text-anchor="end">${v}</text>`).join("");
    const labels = points.map((row, i) => `<text x="${x(i)}" y="${H - 12}" class="rs-axis" text-anchor="middle">${escapeHtml(formatDate(row.exam.date))}</text>`).join("");
    const dots = points.map((row, i) => row.pct === null ? "" : `<circle cx="${x(i)}" cy="${y(row.pct)}" r="6" class="rs-dot"><title>${escapeHtml(row.exam.title)}: ${row.pct}%</title></circle>`).join("");
    return `<svg class="rs-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Your percentage in each exam compared with the group average">
      ${grid}${labels}
      <polyline points="${line("avgPct")}" class="rs-line-avg"/>
      <polyline points="${line("pct")}" class="rs-line-me"/>
      ${dots}
    </svg>
    <p class="rs-legend"><span class="is-me">You</span><span class="is-avg">Group average</span></p>`;
  }

  function renderDashboard() {
    const group = view.group;
    const rows = myRows();
    const taken = rows.filter((row) => row.pct !== null);
    const latest = [...rows].reverse().find((row) => row.exam);
    const latestMine = [...taken].reverse()[0];
    const best = taken.length ? Math.max(...taken.map((row) => row.pct)) : null;
    const average = taken.length ? Math.round((taken.reduce((sum, row) => sum + row.pct, 0) / taken.length) * 10) / 10 : null;
    const covered = group?.topicsCovered || [];
    const myBadges = badges(rows);
    const tabs = view.codes.length > 1
      ? `<nav class="cls-tabs">${view.codes.map((code) => `<button type="button" data-switch-group="${escapeHtml(code)}" aria-selected="${code === view.active}">${escapeHtml(code)}</button>`).join("")}<button type="button" data-join-another>+ Join another group</button></nav>`
      : `<p class="rs-join-more"><button type="button" class="cls-link" data-join-another>+ Join another group</button></p>`;

    setMain(`
      <section class="rs-hero">
        <div>
          <span class="rs-hero-kicker">${escapeHtml(group?.name || view.active)} &middot; code ${escapeHtml(view.active)}</span>
          <h1>Hi ${escapeHtml(firstName(view.membership?.name || C.user()?.displayName))}, here are your results</h1>
          <p>${taken.length ? `You have ${taken.length} marked exam${taken.length === 1 ? "" : "s"} in this group.` : "Your teacher has not published a result for you yet. Check again after your next exam."}</p>
        </div>
        <div class="rs-hero-stats">
          <div><strong>${latestMine ? `${latestMine.pct}%` : "-"}</strong><span>latest</span></div>
          <div><strong>${average !== null ? `${average}%` : "-"}</strong><span>your average</span></div>
          <div><strong>${best !== null ? `${best}%` : "-"}</strong><span>best</span></div>
        </div>
      </section>
      ${tabs}
      ${latest ? latestCard(latest) : ""}
      <section class="rs-card">
        <h2>Your progress</h2>
        ${chart(rows)}
      </section>
      <div class="rs-two">
        <section class="rs-card">
          <h2>Badges</h2>
          <div class="rs-badges">${myBadges.map(([title, detail, name]) => `<div class="rs-badge">${icon(name)}<strong>${escapeHtml(title)}</strong><span>${escapeHtml(detail)}</span></div>`).join("") || `<p class="cls-muted">Badges appear as you sit exams: full marks, top three, big improver, three in a row at 80%...</p>`}</div>
        </section>
        <section class="rs-card">
          <h2>Topics covered in class</h2>
          <p class="rs-covered-count"><strong>${covered.length}</strong> topics so far</p>
          <ul class="rs-topics">${covered.map((topic) => `<li>${escapeHtml(topic)}</li>`).join("") || `<li class="cls-muted">Your teacher will tick topics here as the group covers them.</li>`}</ul>
          <a class="cls-link" href="practice.html">Practise these topics &rarr;</a>
        </section>
      </div>
      <section class="rs-card">
        <h2>All exams</h2>
        <table class="cls-table">
          <thead><tr><th>Date</th><th>Exam</th><th>Your mark</th><th>You</th><th>Group average</th></tr></thead>
          <tbody>${[...rows].reverse().map((row) => `<tr>
            <td>${escapeHtml(formatDate(row.exam.date))}</td>
            <td><strong>${escapeHtml(row.exam.title)}</strong></td>
            <td>${row.score !== null ? `${row.score} / ${row.exam.maxMarks}` : `<span class="cls-muted">absent</span>`}</td>
            <td>${row.pct !== null ? `<b class="${row.pct >= row.avgPct ? "rs-up" : "rs-down"}">${row.pct}%</b>` : "-"}</td>
            <td>${row.avgPct}%</td>
          </tr>`).join("") || `<tr><td colspan="5" class="cls-muted">No published exams yet.</td></tr>`}</tbody>
        </table>
      </section>
      <p class="cls-muted rs-foot">Signed in as ${escapeHtml(C.user()?.email || "")} &middot; <button type="button" class="cls-link" data-sign-out>Sign out</button></p>`);
  }

  function latestCard(row) {
    const exam = row.exam;
    const top = exam.stats?.top || [];
    const diff = row.pct !== null ? Math.round((row.pct - row.avgPct) * 10) / 10 : null;
    const praise = row.pct === null ? "You were not marked in this exam."
      : row.pct >= 90 ? "Outstanding work. Keep this standard."
      : diff >= 0 ? "Above the group average. Well done."
      : "Every exam is practice. Review the topics and go again.";
    return `<section class="rs-latest">
      <div class="rs-latest-main">
        <span class="cls-kicker">Latest exam &middot; ${escapeHtml(formatDate(exam.date))}</span>
        <h2>${escapeHtml(exam.title)}</h2>
        <div class="rs-score">
          <div class="rs-ring" style="--p:${row.pct ?? 0}"><strong>${row.score !== null ? row.score : "-"}</strong><span>/ ${exam.maxMarks}</span></div>
          <div>
            <p class="rs-score-line">${row.pct !== null ? `<b>${row.pct}%</b>` : ""} ${diff !== null ? `<span class="${diff >= 0 ? "rs-up" : "rs-down"}">${diff >= 0 ? "+" : ""}${diff}% vs group average</span>` : ""}</p>
            <p>Group average: <b>${row.avgPct}%</b> (${exam.stats?.average ?? 0} / ${exam.maxMarks}) &middot; ${exam.stats?.count || 0} students</p>
            <p class="rs-praise">${escapeHtml(praise)}</p>
          </div>
        </div>
      </div>
      <div class="rs-top">
        <h3>Top three</h3>
        <ol class="cls-podium">${top.map((entry) => `<li data-place="${entry.place}"><b>${entry.place}</b><span>${escapeHtml(entry.name)}</span><em>${entry.score}</em></li>`).join("") || `<li class="cls-muted">Not available</li>`}</ol>
      </div>
    </section>`;
  }

  /* --------------------------------------------------------------- flow */

  async function route(snapshot) {
    if (!snapshot.ready) {
      setMain(`<p class="cls-muted rs-loading">Loading...</p>`);
      return;
    }
    $("#rsDemoFlag").hidden = !snapshot.demo;
    if (!snapshot.user) {
      signInScreen(snapshot);
      return;
    }
    try {
      view.codes = await C.api.myGroups();
      const wanted = C.normCode(params.get("code"));
      if (!view.codes.length || (wanted && !view.codes.includes(wanted))) {
        joinScreen(snapshot.user, wanted);
        return;
      }
      await loadGroup(view.codes.includes(view.active) ? view.active : view.codes[0]);
    } catch (error) {
      console.error("[results]", error);
      setMain(`<section class="rs-welcome"><h1>Results could not load</h1><p class="cls-error">${escapeHtml(C.friendlyError(error))}</p><button type="button" class="cls-btn" data-sign-out>Sign out</button></section>`);
    }
  }

  document.addEventListener("click", async (event) => {
    const target = event.target.closest("button");
    if (!target) return;
    try {
      if (target.matches("[data-sign-in]")) await C.signIn();
      else if (target.matches("[data-sign-out]")) await C.signOut();
      else if (target.matches("[data-switch-group]")) await loadGroup(target.dataset.switchGroup);
      else if (target.matches("[data-join-another]")) joinScreen(C.user());
    } catch (error) {
      showError(error);
    }
  });

  document.addEventListener("submit", async (event) => {
    if (event.target.id !== "rsJoin") return;
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target).entries());
    const button = event.target.querySelector("button[type=submit]");
    button.disabled = true;
    button.textContent = "Joining...";
    try {
      const code = await C.api.joinGroup(data.code, data.name.trim());
      view.codes = await C.api.myGroups();
      await loadGroup(code);
    } catch (error) {
      showError(error);
      button.disabled = false;
      button.textContent = "Join group";
    }
  });

  C.onChange(route);
  C.init();
})();
