(function () {
  // Teacher-only dashboard for the anonymous daily counters in Firestore site_stats (see cloud-progress.js).
  const root = document.querySelector("[data-stats-root]");
  if (!root) return;

  const TEACHERS = (window.ELITE_FIREBASE?.adminEmails || []).map((email) => String(email).toLowerCase());
  const COURSES = [["linear", "Linear"], ["unit1", "Modular Unit 1"], ["unit2", "Modular Unit 2"], ["wma11", "Pure 1"], ["wma12", "Pure 2"], ["wma13", "Pure 3"], ["wme01", "Mechanics 1"]];
  const LABELS = {
    courseVisitors: COURSES.map(([id, name]) => [`cu_${id}`, name]),
    courses: COURSES.map(([id, name]) => [`c_${id}`, name]),
    tools: [["t_notes", "Notes"], ["t_classified", "Practise online"], ["t_books", "Classified books"], ["t_past_solutions", "Past papers & solutions"], ["t_build_test", "Mock generator"], ["t_final_revision", "Final revision pack"], ["t_expertise", "Expertise"], ["t_mistake_box", "Mistake Box"], ["t_revision_book", "Revision book"], ["t_saved_tests", "Saved tests"], ["t_progress", "Progress"], ["t_interactive_lab", "Visual / Mechanics Lab"], ["t_question_visualizer", "Question Visualizer"], ["t_daily", "Daily Challenge"]],
    pages: [["pv_home", "Home"], ["pv_course", "Course pages"], ["pv_practice", "Practice (IGCSE)"], ["pv_ial", "Practice (IAL)"], ["pv_notes", "Notes & library"], ["pv_papers", "Past papers"], ["pv_books", "Books & downloads"], ["pv_exam", "Mock generator"], ["pv_progress", "Progress"], ["pv_about", "About"], ["pv_bacc", "Egyptian Baccalaureate"], ["pv_daily", "Daily Challenge"], ["pv_topic", "Topic pages (from search)"], ["pv_resource", "Course resource pages"], ["pv_other", "Other pages"]],
    sources: [["r_google", "Google search"], ["r_direct", "Direct / saved link"], ["r_whatsapp", "WhatsApp"], ["r_social", "Social media"], ["r_lab", "Elite IG Lab"], ["r_search", "Other search engines"], ["r_other", "Other websites"]],
    countries: [["g_eg", "Egypt"], ["g_qa", "Qatar"], ["g_ae", "UAE"], ["g_sa", "Saudi Arabia"], ["g_kw", "Kuwait"], ["g_om", "Oman"], ["g_bh", "Bahrain"], ["g_jo", "Jordan"], ["g_gb", "United Kingdom"], ["g_other", "Other"]],
    actions: [["e_solved", "Questions marked solved"], ["e_mistake", "Added to Mistake Box"], ["e_mock_finish", "Mock exams finished"], ["e_daily_done", "Daily Challenges finished"], ["e_solution_open", "Solutions opened on topic pages"], ["e_pdf", "PDFs opened"], ["e_print", "Pages printed"], ["e_saved", "Tests saved"], ["e_search", "Topic searches"], ["e_whatsapp", "WhatsApp clicks"]],
    devices: [["dm", "Phone or tablet"], ["dd", "Computer"]],
  };
  const UNSORTED = new Set(["actions", "devices"]);
  // Counters added on 2026-11-12: empty until the updated Firestore rules are published.
  const NEW_KEYS = ["us", "m", "r_google", "r_direct", "cu_linear", "cu_unit1", "cu_unit2", "cu_wma11", "cu_wma12", "cu_wma13", "cu_wme01"];
  const DAY = 86400000;
  const els = {
    status: root.querySelector("[data-stats-status]"),
    body: root.querySelector("[data-stats-body]"),
    range: root.querySelector("[data-stats-range]"),
    kpis: root.querySelector("[data-stats-kpis]"),
    chart: root.querySelector("[data-stats-chart]"),
    hours: root.querySelector("[data-stats-hours]"),
    funnel: root.querySelector("[data-stats-funnel]"),
    students: root.querySelector("[data-stats-students]"),
    notice: root.querySelector("[data-stats-notice]"),
  };
  let allDays = [];
  let users = [];
  let days = 7;
  let loaded = false;
  let accountGeneration = 0;
  let teacherId = '';
  const cairoDate = new Intl.DateTimeFormat('en-CA', {timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit'});

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function cairoDay(offset = 0) {
    const date = new Date(Date.now() - offset * DAY);
    try {
      return cairoDate.format(date);
    } catch (err) {
      return date.toISOString().slice(0, 10);
    }
  }

  function fmt(value) {
    return Number(value || 0).toLocaleString("en-GB");
  }

  function pct(part, whole) {
    return whole > 0 ? `${Math.round((part / whole) * 100)}%` : "-";
  }

  function duration(minutes) {
    const total = Math.round(minutes || 0);
    if (total < 60) return `${total} min`;
    const hours = Math.floor(total / 60);
    return `${fmt(hours)} h ${total % 60} min`;
  }

  function setStatus(text) {
    els.status.textContent = text;
    els.status.hidden = !text;
  }

  // The chosen range, and the same number of days just before it (for the "up / down" arrows).
  function rangeDays(shift = 0) {
    const list = [];
    for (let i = days - 1; i >= 0; i -= 1) list.push(cairoDay(i + shift * days));
    return list;
  }

  function totals(list) {
    const byDay = new Map(allDays.map((d) => [d.day, d]));
    const sum = {};
    list.forEach((day) => {
      const doc = byDay.get(day);
      if (!doc) return;
      Object.entries(doc).forEach(([key, value]) => {
        if (key !== "day" && typeof value === "number") sum[key] = (sum[key] || 0) + value;
      });
    });
    return sum;
  }

  function trend(now, before) {
    if (!before) return now ? '<em class="e27-trend is-new">new</em>' : "";
    const change = Math.round(((now - before) / before) * 100);
    if (!change) return '<em class="e27-trend">same as before</em>';
    return `<em class="e27-trend ${change > 0 ? "is-up" : "is-down"}">${change > 0 ? "&#9650;" : "&#9660;"} ${Math.abs(change)}%</em>`;
  }

  function renderKpis(sum, prev, list) {
    const start = new Date(`${list[0]}T00:00:00`).getTime();
    const prevStart = start - days * DAY;
    const joined = users?.filter((u) => u.firstSeen && u.firstSeen.getTime() >= start).length;
    const joinedBefore = users?.filter((u) => u.firstSeen && u.firstSeen.getTime() >= prevStart && u.firstSeen.getTime() < start).length;
    const v = sum.v || 0;
    const u = sum.u || 0;
    const cards = [
      [fmt(v), "page views", trend(v, prev.v || 0), u ? `${(v / u).toFixed(1)} pages per visitor` : ""],
      [fmt(u), "visitors (one per device per day)", trend(u, prev.u || 0), `${fmt(Math.max(u - (sum.n || 0), 0))} came back, ${fmt(sum.n)} first time`],
      [fmt(sum.us), "visitors who were signed in", trend(sum.us || 0, prev.us || 0), u ? `${pct(sum.us || 0, u)} of all visitors` : ""],
      [users ? fmt(joined) : "—", "new students signed in", users ? trend(joined, joinedBefore) : "", users ? `${fmt(users.length)} accounts in total` : "Account data unavailable"],
      [duration(sum.m), "study time on the site", trend(sum.m || 0, prev.m || 0), u && sum.m ? `${Math.round(sum.m / u)} min per visitor` : ""],
      [fmt(sum.e_solved), "questions marked solved", trend(sum.e_solved || 0, prev.e_solved || 0), u ? `${((sum.e_solved || 0) / u).toFixed(1)} per visitor` : ""],
    ];
    els.kpis.innerHTML = cards.map(([value, label, arrow, note]) => `<div><b class="e27-num">${value}</b><span>${esc(label)}</span>${arrow}${note ? `<small>${esc(note)}</small>` : ""}</div>`).join("");
  }

  function renderChart(list) {
    const byDay = new Map(allDays.map((d) => [d.day, d]));
    const rows = list.map((day) => ({ day, v: byDay.get(day)?.v || 0, u: byDay.get(day)?.u || 0 }));
    const max = Math.max(1, ...rows.map((r) => r.v));
    const width = 960;
    const height = 220;
    const pad = { top: 16, right: 8, bottom: 30, left: 40 };
    const inner = width - pad.left - pad.right;
    const slot = inner / rows.length;
    const bar = Math.max(2, Math.min(28, slot * 0.36));
    const y = (value) => pad.top + (height - pad.top - pad.bottom) * (1 - value / max);
    const ticks = [0, Math.round(max / 2), max];
    const labelEvery = Math.ceil(rows.length / 12);
    const bars = rows.map((r, i) => {
      const x = pad.left + slot * i + slot / 2;
      const label = i % labelEvery === 0 || i === rows.length - 1
        ? `<text x="${x}" y="${height - 10}" text-anchor="middle" class="t">${esc(r.day.slice(5).replace("-", "/"))}</text>` : "";
      return `<g><title>${esc(r.day)}: ${fmt(r.v)} page views, ${fmt(r.u)} visitors</title>
        <rect class="is-v" x="${x - bar - 1}" y="${y(r.v)}" width="${bar}" height="${y(0) - y(r.v)}" rx="3"/>
        <rect class="is-u" x="${x + 1}" y="${y(r.u)}" width="${bar}" height="${y(0) - y(r.u)}" rx="3"/>${label}</g>`;
    }).join("");
    const grid = ticks.map((t) => `<line x1="${pad.left}" x2="${width - pad.right}" y1="${y(t)}" y2="${y(t)}" class="g"/><text x="${pad.left - 8}" y="${y(t) + 4}" text-anchor="end" class="t">${fmt(t)}</text>`).join("");
    els.chart.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Page views and visitors per day">${grid}${bars}</svg>`;
  }

  // When students study: page views in each hour of the day (Cairo time).
  function renderHours(sum) {
    const rows = Array.from({ length: 24 }, (_, hour) => ({ hour, value: sum[`h_${String(hour).padStart(2, "0")}`] || 0 }));
    const total = rows.reduce((all, r) => all + r.value, 0);
    if (!total) {
      els.hours.innerHTML = '<p class="e27-stats-empty">No hourly data in this range yet.</p>';
      return;
    }
    const max = Math.max(...rows.map((r) => r.value));
    const best = rows.reduce((top, r) => (r.value > top.value ? r : top), rows[0]);
    const width = 960;
    const height = 170;
    const pad = { top: 12, right: 8, bottom: 26, left: 8 };
    const slot = (width - pad.left - pad.right) / 24;
    const y = (value) => pad.top + (height - pad.top - pad.bottom) * (1 - value / max);
    const clock = (hour) => `${hour % 12 || 12}${hour < 12 ? "am" : "pm"}`;
    const bars = rows.map((r) => {
      const x = pad.left + slot * r.hour;
      const label = r.hour % 3 === 0 ? `<text x="${x + slot / 2}" y="${height - 8}" text-anchor="middle" class="t">${clock(r.hour)}</text>` : "";
      return `<g><title>${clock(r.hour)} to ${clock((r.hour + 1) % 24)}: ${fmt(r.value)} page views</title>
        <rect class="${r === best ? "is-u" : "is-v"}" x="${x + 3}" y="${y(r.value)}" width="${slot - 6}" height="${Math.max(y(0) - y(r.value), r.value ? 2 : 0)}" rx="3"/>${label}</g>`;
    }).join("");
    els.hours.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Page views by hour of the day">${bars}</svg>
      <p class="e27-stats-foot">Busiest hour: <b>${clock(best.hour)} to ${clock((best.hour + 1) % 24)}</b> (${pct(best.value, total)} of all page views). A good time to post in the groups.</p>`;
  }

  // From visitor to signed-in student: where the free account wins or loses them.
  function renderFunnel(sum) {
    const guests = Math.max((sum.u || 0) - (sum.us || 0), 0);
    const steps = [
      ["Visitors without an account", guests, ""],
      ["Saw the sign-in reminder", sum.e_invite || 0, "times shown"],
      ["Pressed Continue with Google", sum.e_invite_click || 0, `${pct(sum.e_invite_click || 0, sum.e_invite || 0)} of reminders`],
      ["Signed in", sum.e_signin || 0, `${pct(sum.e_signin || 0, guests)} of visitors without an account`],
    ];
    const max = Math.max(1, ...steps.map((s) => s[1]));
    els.funnel.innerHTML = `<ul class="e27-stats-list e27-stats-funnel">${steps.map(([label, value, note]) => `
      <li><span class="l">${esc(label)}${note ? `<small>${esc(note)}</small>` : ""}</span><span class="b"><i style="width:${(value / max) * 100}%"></i></span><b class="e27-num">${fmt(value)}</b></li>`).join("")}</ul>
      <p class="e27-stats-foot">Pressed "Not now": <b>${fmt(sum.e_invite_dismiss)}</b> times.</p>`;
  }

  function renderStudents() {
    if (!users) { els.students.textContent = "Account data could not load. Reload the page to try again."; return; }
    const now = Date.now();
    const seenWithin = (span) => users.filter((u) => u.lastSeen && now - u.lastSeen.getTime() < span).length;
    const quiet = users.filter((u) => u.lastSeen && now - u.lastSeen.getTime() >= 7 * DAY).length;
    const rows = [
      ["Signed-in students", users.length],
      ["Here today", seenWithin(DAY)],
      ["Here in the last week", seenWithin(7 * DAY)],
      ["Here in the last month", seenWithin(30 * DAY)],
      ["Quiet for 7+ days", quiet],
    ];
    const max = Math.max(1, users.length);
    els.students.innerHTML = `<ul class="e27-stats-list">${rows.map(([label, value]) => `
      <li><span class="l">${esc(label)}</span><span class="b"><i style="width:${(value / max) * 100}%"></i></span><b class="e27-num">${fmt(value)}</b></li>`).join("")}</ul>
      <p class="e27-stats-foot"><a href="members.html">Open the student list: who is studying and who stopped &rarr;</a></p>`;
  }

  function renderZones(list) {
    const host = root.querySelector('[data-stats-zones]');
    if (!users) { host.textContent = 'Account data could not load. Reload the page to try again.'; return; }
    const daysInRange = new Set(list);
    const active = users.filter((u) => u.lastSeen && daysInRange.has(cairoDate.format(u.lastSeen)));
    if (!active.length) {
      host.textContent = 'No signed-in accounts were active in this period.';
      return;
    }
    const counts = new Map();
    const aliases = new Map();
    let unknown = 0;
    for (const {zone} of active) {
      if (!aliases.has(zone)) {
        let label = '';
        if (typeof zone === 'string' && zone.length <= 40 && zone.includes('/') && !zone.startsWith('Etc/')) {
          try {
            label = new Intl.DateTimeFormat('en', {timeZone: zone}).resolvedOptions().timeZone;
          } catch { /* Older accounts can have an unrecognised device setting. */ }
        }
        aliases.set(zone, label);
      }
      const label = aliases.get(zone);
      if (label) counts.set(label, (counts.get(label) || 0) + 1);
      else unknown += 1;
    }
    const rows = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    if (unknown) rows.push(['Unknown or fixed offset', unknown]);
    host.innerHTML = '<p class="e27-stats-foot">' + fmt(active.length - unknown) + ' of ' + fmt(active.length) +
      ' active accounts reported a regional time zone.</p><ul class="e27-stats-list">' + rows.map(([label, count]) =>
      '<li><span class="l">' + esc(label.replace(/_/g, ' ')) + '</span><span class="b"><i style="width:' +
      (100 * count / active.length) + '%"></i></span><b class="e27-num">' + fmt(count) +
      '<small>' + pct(count, active.length) + '</small></b></li>').join('') + '</ul>';
  }

  function renderList(name, sum) {
    const host = root.querySelector(`[data-stats-list="${name}"]`);
    if (!host) return;
    const rows = LABELS[name].map(([key, label]) => ({ label, value: sum[key] || 0 }));
    const sorted = UNSORTED.has(name) ? rows : rows.slice().sort((a, b) => b.value - a.value);
    const max = Math.max(1, ...sorted.map((r) => r.value));
    const total = sorted.reduce((all, r) => all + r.value, 0);
    const share = ["sources", "countries", "devices", "courseVisitors"].includes(name);
    host.innerHTML = total || !share
      ? `<ul class="e27-stats-list">${sorted.map((r) => `
      <li><span class="l">${esc(r.label)}</span><span class="b"><i style="width:${(r.value / max) * 100}%"></i></span><b class="e27-num">${fmt(r.value)}${share && total ? `<small>${pct(r.value, total)}</small>` : ""}</b></li>`).join("")}</ul>`
      : '<p class="e27-stats-empty">No data in this range yet.</p>';
  }

  function render() {
    const list = rangeDays();
    const sum = totals(list);
    const prev = totals(rangeDays(1));
    renderKpis(sum, prev, list);
    renderChart(list);
    renderHours(sum);
    renderFunnel(sum);
    renderStudents();
    renderZones(list);
    Object.keys(LABELS).forEach((name) => renderList(name, sum));
    const everything = totals(allDays.map((d) => d.day));
    els.notice.hidden = NEW_KEYS.some((key) => everything[key] > 0);
    els.range.querySelectorAll("button").forEach((button) => {
      button.setAttribute("aria-pressed", String(Number(button.dataset.days) === days));
    });
  }

  async function load() {
    if (loaded) return;
    loaded = true;
    const generation = accountGeneration;
    setStatus("Loading statistics…");
    try {
      const [stats, people] = await Promise.all([
        window.EliteCloud.listSiteStats(cairoDay(179)),
        window.EliteCloud.listSiteUsers().catch(() => null),
      ]);
      if (generation !== accountGeneration) return;
      allDays = stats;
      users = people;
    } catch (err) {
      if (generation !== accountGeneration) return;
      loaded = false;
      const denied = /permission|insufficient/i.test(String(err && (err.code || err.message)));
      setStatus(denied
        ? "Firestore refused the statistics. Publish the latest rules from docs/firestore.rules in the Firebase console, then reload."
        : `Could not load the statistics: ${err && err.message ? err.message : err}`);
      return;
    }
    setStatus(allDays.length ? "" : "No visits recorded yet. Counting starts as soon as the Firestore rules are published.");
    els.range.hidden = false;
    els.body.hidden = false;
    render();
  }

  // Preview with made-up numbers (stats.html?demo=1): lets the layout be checked without the teacher account.
  function demo() {
    const wave = (i, base, swing) => Math.max(0, Math.round(base + swing * Math.sin(i / 2.3) + (i % 7 === 5 ? -base * 0.4 : 0)));
    allDays = Array.from({ length: 180 }, (_, i) => {
      const u = wave(i, 120, 35);
      const doc = { day: cairoDay(179 - i), v: u * 6, u, n: Math.round(u * 0.3), us: Math.round(u * 0.22), m: u * 11, dm: Math.round(u * 0.7), dd: Math.round(u * 0.3),
        e_solved: u * 3, e_mistake: Math.round(u * 0.4), e_pdf: u, e_invite: Math.round(u * 0.8), e_invite_click: Math.round(u * 0.09), e_invite_dismiss: Math.round(u * 0.6), e_signin: Math.round(u * 0.06),
        e_mock_finish: Math.round(u * 0.1), e_search: Math.round(u * 0.2), r_google: Math.round(u * 0.45), r_direct: Math.round(u * 0.3), r_whatsapp: Math.round(u * 0.15), r_social: Math.round(u * 0.07), r_other: Math.round(u * 0.03),
        g_eg: Math.round(u * 0.6), g_qa: Math.round(u * 0.15), g_ae: Math.round(u * 0.1), g_other: Math.round(u * 0.15), pv_home: u, pv_course: u * 2, pv_practice: u * 2, pv_topic: u, t_classified: u, t_notes: Math.round(u * 0.6), t_final_revision: Math.round(u * 0.5) };
      COURSES.forEach(([id], n) => { doc[`cu_${id}`] = Math.round(u / (n + 2)); doc[`c_${id}`] = Math.round((u * 5) / (n + 2)); });
      for (let h = 0; h < 24; h += 1) doc[`h_${String(h).padStart(2, "0")}`] = Math.round(u * 6 * Math.max(0.004, Math.exp(-((h - 20) ** 2) / 18) * 0.12 + Math.exp(-((h - 15) ** 2) / 10) * 0.05));
      return doc;
    });
    users = Array.from({ length: 64 }, (_, i) => ({ zone: ['Africa/Cairo', 'Europe/Madrid', 'Asia/Kuala_Lumpur', '', 'UTC'][i % 5], firstSeen: new Date(Date.now() - i * 2.6 * DAY), lastSeen: new Date(Date.now() - (i % 9) * (i % 4) * DAY) }));
    setStatus("Preview with made-up numbers.");
    els.range.hidden = false;
    els.body.hidden = false;
    loaded = true;
    render();
  }

  els.range.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-days]");
    if (!button) return;
    days = Number(button.dataset.days) || 7;
    render();
  });

  if (/[?&]demo=1\b/.test(window.location.search)) {
    demo();
    return;
  }

  function handleCloudState(detail) {
    const email = String(detail.user?.email || '').toLowerCase();
    const nextId = detail.configured && detail.ready && TEACHERS.includes(email) ? detail.user.uid || email : '';
    if (nextId !== teacherId) {
      teacherId = nextId;
      accountGeneration += 1;
      loaded = false;
      users = [];
      allDays = [];
      els.range.hidden = true;
      els.body.hidden = true;
      root.querySelector('[data-stats-zones]').replaceChildren();
    }
    if (!detail.configured) { setStatus("Google sign-in is not configured on this site."); return; }
    if (!detail.ready) return;
    const user = detail.user;
    if (!user) { setStatus("Sign in with the teacher Google account to see the statistics."); return; }
    if (!nextId) {
      setStatus("This page is for Dr Eslam only.");
      return;
    }
    load();
  }
  window.addEventListener("elite-cloud-state", (event) => handleCloudState(event.detail || {}));
  const initial = window.EliteCloud?.state?.();
  if (initial) handleCloudState(initial);
})();
