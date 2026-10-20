(function () {
  // Teacher-only list of signed-in students (Firestore site_users, written by cloud-progress.js).
  const root = document.querySelector("[data-members-root]");
  if (!root) return;

  const TEACHERS = (window.ELITE_FIREBASE?.adminEmails || []).map((email) => String(email).toLowerCase());
  const COURSE_NAMES = { linear: "Linear", unit1: "Modular Unit 1", unit2: "Modular Unit 2", wma11: "Pure 1", wma12: "Pure 2", wma13: "Pure 3", wme01: "Mechanics 1" };
  const DAY = 86400000;
  const els = {
    status: root.querySelector("[data-members-status]"),
    stats: root.querySelector("[data-members-stats]"),
    tools: root.querySelector("[data-members-tools]"),
    table: root.querySelector("[data-members-table]"),
    rows: root.querySelector("[data-members-rows]"),
    search: root.querySelector("[data-members-search]"),
    course: root.querySelector("[data-members-course]"),
    csv: root.querySelector("[data-members-csv]"),
  };
  let users = [];
  let loadedFor = "";

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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

  function setStatus(text) {
    els.status.textContent = text;
    els.status.hidden = !text;
  }

  function filtered() {
    const term = (els.search.value || "").trim().toLowerCase();
    const course = els.course.value;
    return users.filter((user) => {
      if (course && user.lastCourse !== course) return false;
      if (!term) return true;
      return user.name.toLowerCase().includes(term) || user.email.includes(term);
    });
  }

  function renderStats() {
    const now = Date.now();
    const active7 = users.filter((u) => u.lastSeen && now - u.lastSeen.getTime() < 7 * DAY).length;
    const new7 = users.filter((u) => u.firstSeen && now - u.firstSeen.getTime() < 7 * DAY).length;
    const active30 = users.filter((u) => u.lastSeen && now - u.lastSeen.getTime() < 30 * DAY).length;
    const byCourse = {};
    users.forEach((u) => { if (u.lastCourse) byCourse[u.lastCourse] = (byCourse[u.lastCourse] || 0) + 1; });
    const top = Object.entries(byCourse).sort((a, b) => b[1] - a[1])[0];
    els.stats.innerHTML = [
      [users.length, "students signed in"],
      [active7, "active in the last 7 days"],
      [active30, "active in the last 30 days"],
      [new7, "new this week"],
      [top ? COURSE_NAMES[top[0]] || top[0] : "-", "most used course"],
    ].map(([value, label]) => `<div><b class="e27-num">${esc(value)}</b><span>${esc(label)}</span></div>`).join("");
    els.stats.hidden = false;
  }

  function renderRows() {
    const list = filtered();
    els.rows.innerHTML = list.length ? list.map((u) => `
      <tr>
        <td><strong>${esc(u.name || "No name")}</strong><small>${esc(u.email)}</small></td>
        <td>${esc(COURSE_NAMES[u.lastCourse] || "-")}</td>
        <td class="e27-num">${esc(u.visits)}</td>
        <td>${esc(formatDate(u.firstSeen))}</td>
        <td>${esc(ago(u.lastSeen))}</td>
      </tr>`).join("") : `<tr><td colspan="5" class="e27-members-empty">No students match.</td></tr>`;
  }

  function csvCell(value) {
    const text = String(value == null ? "" : value);
    // Guard against spreadsheet formula injection from user-supplied names.
    const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  }

  function downloadCsv() {
    const header = ["Name", "Email", "Last course", "Visits", "First visit", "Last visit", "Last page"];
    const lines = [header.map(csvCell).join(",")].concat(filtered().map((u) => [
      u.name, u.email, COURSE_NAMES[u.lastCourse] || u.lastCourse, u.visits,
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

  async function load(user) {
    if (loadedFor === user.uid) return;
    loadedFor = user.uid;
    setStatus("Loading students…");
    try {
      users = await window.EliteCloud.listSiteUsers();
    } catch (err) {
      loadedFor = "";
      const denied = /permission|insufficient/i.test(String(err && (err.code || err.message)));
      setStatus(denied
        ? "Firestore refused the list. Publish the latest rules from docs/firestore.rules in the Firebase console, then reload."
        : `Could not load the list: ${err && err.message ? err.message : err}`);
      return;
    }
    setStatus(users.length ? "" : "No student has signed in yet. Records appear here after a student signs in with Google.");
    renderStats();
    els.tools.hidden = false;
    els.table.hidden = false;
    els.csv.disabled = !users.length;
    renderRows();
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

  els.search.addEventListener("input", renderRows);
  els.course.addEventListener("change", renderRows);
  els.csv.addEventListener("click", downloadCsv);
})();
