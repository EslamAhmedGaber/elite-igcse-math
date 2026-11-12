(function () {
  // Teacher-only list of signed-in students (Firestore site_users, written by cloud-progress.js):
  // who is studying, who stopped coming, and how much each one has done.
  const root = document.querySelector("[data-members-root]");
  if (!root) return;

  const TEACHERS = (window.ELITE_FIREBASE?.adminEmails || []).map((email) => String(email).toLowerCase());
  const COURSE_NAMES = { linear: "Linear", unit1: "Modular Unit 1", unit2: "Modular Unit 2", wma11: "Pure 1", wma12: "Pure 2", wma13: "Pure 3", wme01: "Mechanics 1" };
  const DAY = 86400000;
  const STRIP_DAYS = 14;
  // Status from the last visit. "once" = signed in on one day and never came back.
  const STATUS = {
    today: ["Here today", "is-today"],
    week: ["This week", "is-week"],
    quiet: ["Quiet 7+ days", "is-quiet"],
    gone: ["Gone 30+ days", "is-gone"],
  };
  const SORTS = {
    last: (a, b) => (b.lastSeen?.getTime() || 0) - (a.lastSeen?.getTime() || 0),
    solved: (a, b) => b.solved - a.solved,
    days: (a, b) => b.days30 - a.days30,
    minutes: (a, b) => b.minutes - a.minutes,
    newest: (a, b) => (b.firstSeen?.getTime() || 0) - (a.firstSeen?.getTime() || 0),
    name: (a, b) => (a.name || a.email).localeCompare(b.name || b.email),
  };
  const els = {
    status: root.querySelector("[data-members-status]"),
    stats: root.querySelector("[data-members-stats]"),
    tools: root.querySelector("[data-members-tools]"),
    table: root.querySelector("[data-members-table]"),
    rows: root.querySelector("[data-members-rows]"),
    search: root.querySelector("[data-members-search]"),
    course: root.querySelector("[data-members-course]"),
    state: root.querySelector("[data-members-state]"),
    sort: root.querySelector("[data-members-sort]"),
    count: root.querySelector("[data-members-count]"),
    csv: root.querySelector("[data-members-csv]"),
    mail: root.querySelector("[data-members-mail]"),
    notice: root.querySelector("[data-members-notice]"),
  };
  let users = [];
  let loadedFor = "";

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function cairoDay(offset = 0) {
    const date = new Date(Date.now() - offset * DAY);
    try {
      return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
    } catch (err) {
      return date.toISOString().slice(0, 10);
    }
  }

  function formatDate(date) {
    if (!date) return "-";
    return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  }

  function ago(date) {
    if (!date) return "-";
    const days = Math.floor((Date.now() - date.getTime()) / DAY);
    if (days <= 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 30) return `${days} days ago`;
    return formatDate(date);
  }

  function duration(minutes) {
    if (!minutes) return "-";
    if (minutes < 60) return `${minutes} min`;
    return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
  }

  function setStatus(text) {
    els.status.textContent = text;
    els.status.hidden = !text;
  }

  // Add what the table needs to each record once, after loading.
  function prepare(list) {
    const since30 = cairoDay(29);
    const strip = Array.from({ length: STRIP_DAYS }, (_, i) => cairoDay(STRIP_DAYS - 1 - i));
    const now = Date.now();
    return list.map((u) => {
      const age = u.lastSeen ? (now - u.lastSeen.getTime()) / DAY : Infinity;
      const dayCount = u.tracked ? u.days.length : 0;
      return {
        ...u,
        status: age < 1 ? "today" : age < 7 ? "week" : age < 30 ? "quiet" : "gone",
        once: u.tracked ? dayCount <= 1 && age >= 2 : u.visits <= 1 && age >= 2,
        dayCount,
        days30: u.tracked ? u.days.filter((day) => day >= since30).length : 0,
        strip: strip.map((day) => u.tracked && u.days.includes(day)),
      };
    });
  }

  function filtered() {
    const term = (els.search.value || "").trim().toLowerCase();
    const course = els.course.value;
    const state = els.state.value;
    const list = users.filter((user) => {
      if (course && user.lastCourse !== course && !user.courses.includes(course)) return false;
      if (state === "once" ? !user.once : state === "away" ? !["quiet", "gone"].includes(user.status) : state && user.status !== state) return false;
      if (!term) return true;
      return user.name.toLowerCase().includes(term) || user.email.includes(term);
    });
    return list.sort(SORTS[els.sort.value] || SORTS.last);
  }

  function renderStats() {
    const count = (test) => users.filter(test).length;
    const new7 = count((u) => u.firstSeen && Date.now() - u.firstSeen.getTime() < 7 * DAY);
    const cards = [
      [users.length, "students signed in", `${new7} new this week`, ""],
      [count((u) => u.status === "today"), "here today", "", "today"],
      [count((u) => ["today", "week"].includes(u.status)), "here in the last 7 days", "", "week"],
      [count((u) => u.status === "quiet"), "quiet for 7 to 29 days", "worth a message", "quiet"],
      [count((u) => u.status === "gone"), "gone for 30 days or more", "", "gone"],
      [count((u) => u.once), "signed in once, never came back", "", "once"],
    ];
    els.stats.innerHTML = cards.map(([value, label, note, state]) => `
      <button type="button" data-members-pick="${esc(state)}"><b class="e27-num">${esc(value)}</b><span>${esc(label)}</span>${note ? `<small>${esc(note)}</small>` : ""}</button>`).join("");
    els.stats.hidden = false;
  }

  function renderRows() {
    const list = filtered();
    els.count.textContent = `${list.length} of ${users.length} students`;
    els.csv.disabled = !list.length;
    els.mail.disabled = !list.length;
    els.stats.querySelectorAll("[data-members-pick]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.membersPick === els.state.value));
    });
    els.rows.innerHTML = list.length ? list.map((u) => {
      const [label, cls] = STATUS[u.status];
      const strip = u.tracked
        ? `<span class="e27-daystrip" role="img" aria-label="${u.strip.filter(Boolean).length} of the last ${STRIP_DAYS} days">${u.strip.map((on) => `<i class="${on ? "on" : ""}"></i>`).join("")}</span>`
        : "";
      return `
      <tr>
        <td><strong>${esc(u.name || "No name")}</strong><small><a href="mailto:${esc(u.email)}">${esc(u.email)}</a></small></td>
        <td><span class="e27-state ${cls}">${esc(label)}</span>${u.once ? '<small>came once</small>' : ""}</td>
        <td>${esc(COURSE_NAMES[u.lastCourse] || "-")}${u.exam ? `<small>${esc(u.exam)}</small>` : ""}</td>
        <td class="e27-num">${u.tracked ? esc(u.solved.toLocaleString("en-GB")) : "-"}${u.tracked && (u.mistakes || u.mocks) ? `<small>${u.mistakes} to redo &middot; ${u.mocks} mocks</small>` : ""}</td>
        <td>${u.tracked ? `<span class="e27-num">${u.days30}</span> of 30${strip}` : "-"}</td>
        <td class="e27-num">${u.tracked ? esc(duration(u.minutes)) : "-"}</td>
        <td class="e27-num">${esc(u.visits)}</td>
        <td>${esc(ago(u.lastSeen))}<small>joined ${esc(formatDate(u.firstSeen))}</small></td>
      </tr>`;
    }).join("") : `<tr><td colspan="8" class="e27-members-empty">No students match.</td></tr>`;
  }

  function csvCell(value) {
    const text = String(value == null ? "" : value);
    // Guard against spreadsheet formula injection from user-supplied names.
    const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  }

  function downloadCsv() {
    const header = ["Name", "Email", "Status", "Last course", "Exam session", "Questions solved", "Mistake Box", "Mocks", "Daily streak", "Days active (all)", "Days active (last 30)", "Study minutes", "Visits", "Device", "Time zone", "First visit", "Last visit", "Last page"];
    const lines = [header.map(csvCell).join(",")].concat(filtered().map((u) => [
      u.name, u.email, STATUS[u.status][0] + (u.once ? " (came once)" : ""), COURSE_NAMES[u.lastCourse] || u.lastCourse, u.exam,
      u.tracked ? u.solved : "", u.tracked ? u.mistakes : "", u.tracked ? u.mocks : "", u.tracked ? u.streak : "",
      u.tracked ? u.dayCount : "", u.tracked ? u.days30 : "", u.tracked ? u.minutes : "", u.visits, u.device, u.zone,
      u.firstSeen ? u.firstSeen.toISOString() : "", u.lastSeen ? u.lastSeen.toISOString() : "", u.lastPage,
    ].map(csvCell).join(",")));
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `elite-signed-in-students-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.append(link);
    link.click();
    setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 500);
  }

  // Copies the e-mail addresses of the students in the list (for one BCC message, e.g. to the quiet ones).
  async function copyEmails() {
    const emails = filtered().map((u) => u.email).filter(Boolean).join(", ");
    const label = els.mail.textContent;
    try {
      await navigator.clipboard.writeText(emails);
      els.mail.textContent = "Copied";
    } catch (err) {
      window.prompt("Copy these e-mail addresses:", emails);
    }
    setTimeout(() => { els.mail.textContent = label; }, 1600);
  }

  function show(list) {
    users = prepare(list);
    setStatus(users.length ? "" : "No student has signed in yet. Records appear here after a student signs in with Google.");
    els.notice.hidden = !users.length || users.some((u) => u.tracked);
    renderStats();
    els.tools.hidden = false;
    els.table.hidden = false;
    renderRows();
  }

  async function load(user) {
    if (loadedFor === user.uid) return;
    loadedFor = user.uid;
    setStatus("Loading students…");
    try {
      show(await window.EliteCloud.listSiteUsers());
    } catch (err) {
      loadedFor = "";
      const denied = /permission|insufficient/i.test(String(err && (err.code || err.message)));
      setStatus(denied
        ? "Firestore refused the list. Publish the latest rules from docs/firestore.rules in the Firebase console, then reload."
        : `Could not load the list: ${err && err.message ? err.message : err}`);
    }
  }

  // Preview with made-up students (members.html?demo=1): lets the layout be checked without the teacher account.
  function demo() {
    const names = ["Omar Hassan", "Salma Adel", "Youssef Tarek", "Mariam Khaled", "Ali Mostafa", "Nour Ehab", "Hana Sherif", "Karim Fathy", "Layla Samir", "Ziad Wael", "Farida Amr", "Mazen Hany"];
    const ids = Object.keys(COURSE_NAMES);
    loadedFor = "demo";
    show(names.map((name, i) => {
      const away = [0, 0, 1, 2, 3, 5, 8, 12, 20, 34, 61, 3][i];
      const tracked = i !== 9;
      const active = Array.from({ length: 60 }, (_, d) => d).filter((d) => d >= away && (d + i) % (i % 4 + 2) !== 0).slice(0, 30 - i * 2);
      return {
        uid: `demo${i}`, name, email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
        firstSeen: new Date(Date.now() - (70 - i * 3) * DAY), lastSeen: new Date(Date.now() - away * DAY - 3600000),
        visits: i === 8 ? 1 : 40 - i * 3, lastPage: "/practice.html", lastCourse: ids[i % ids.length],
        tracked, days: tracked ? (i === 8 ? [cairoDay(away)] : active.map((d) => cairoDay(d)).sort()) : [],
        solved: tracked ? Math.max(0, 420 - i * 37) : 0, mistakes: tracked ? 18 - i : 0, mocks: tracked ? Math.max(0, 6 - i) : 0,
        streak: tracked ? Math.max(0, 9 - i) : 0, minutes: tracked ? Math.max(0, 1340 - i * 115) : 0,
        device: i % 3 ? "phone" : "computer", zone: "Africa/Cairo", exam: i % 2 ? "May/June 2027" : "January 2027", courses: [ids[i % ids.length]],
      };
    }));
    setStatus("Preview with made-up students.");
  }

  els.search.addEventListener("input", renderRows);
  [els.course, els.state, els.sort].forEach((select) => select.addEventListener("change", renderRows));
  els.csv.addEventListener("click", downloadCsv);
  els.mail.addEventListener("click", copyEmails);
  els.stats.addEventListener("click", (event) => {
    const card = event.target.closest("[data-members-pick]");
    if (!card) return;
    els.state.value = els.state.value === card.dataset.membersPick ? "" : card.dataset.membersPick;
    renderRows();
  });

  if (/[?&]demo=1\b/.test(window.location.search)) {
    demo();
    return;
  }

  window.addEventListener("elite-cloud-state", (event) => {
    const detail = event.detail || {};
    if (!detail.configured) { setStatus("Google sign-in is not configured on this site."); return; }
    if (!detail.ready) return;
    const user = detail.user;
    if (!user) { setStatus("Sign in with the teacher Google account to see this page."); return; }
    if (!TEACHERS.includes(String(user.email || "").toLowerCase())) {
      setStatus("This page is for Dr Eslam only.");
      return;
    }
    load(user);
  });
})();
