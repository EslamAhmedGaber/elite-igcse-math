(function () {
  // Teacher-only dashboard for the anonymous daily counters in Firestore site_stats (see cloud-progress.js).
  const root = document.querySelector("[data-stats-root]");
  if (!root) return;

  const TEACHERS = (window.ELITE_FIREBASE?.adminEmails || []).map((email) => String(email).toLowerCase());
  const LABELS = {
    courses: [["c_linear", "Linear"], ["c_unit1", "Modular Unit 1"], ["c_unit2", "Modular Unit 2"], ["c_wma11", "Pure 1"], ["c_wma12", "Pure 2"], ["c_wma13", "Pure 3"], ["c_wme01", "Mechanics 1"]],
    tools: [["t_notes", "Notes"], ["t_classified", "Practise online"], ["t_books", "Classified books"], ["t_past_solutions", "Past papers & solutions"], ["t_build_test", "Mock generator"], ["t_expertise", "Expertise"], ["t_mistake_box", "Mistake Box"], ["t_revision_book", "Revision book"], ["t_saved_tests", "Saved tests"], ["t_progress", "Progress"], ["t_interactive_lab", "Visual / Mechanics Lab"], ["t_question_visualizer", "Question Visualizer"], ["t_daily", "Daily Challenge"]],
    pages: [["pv_home", "Home"], ["pv_course", "Course pages"], ["pv_practice", "Practice (IGCSE)"], ["pv_ial", "Practice (IAL)"], ["pv_notes", "Notes & library"], ["pv_papers", "Past papers"], ["pv_books", "Books & downloads"], ["pv_exam", "Mock generator"], ["pv_progress", "Progress"], ["pv_about", "About"], ["pv_bacc", "Egyptian Baccalaureate"], ["pv_daily", "Daily Challenge"], ["pv_topic", "Topic pages (from search)"], ["pv_resource", "Course resource pages"], ["pv_guide", "Arabic guides"], ["pv_other", "Other pages"]],
    countries: [["g_eg", "Egypt"], ["g_qa", "Qatar"], ["g_ae", "UAE"], ["g_sa", "Saudi Arabia"], ["g_kw", "Kuwait"], ["g_om", "Oman"], ["g_bh", "Bahrain"], ["g_jo", "Jordan"], ["g_gb", "United Kingdom"], ["g_other", "Other"]],
    actions: [["e_solved", "Questions marked solved"], ["e_mistake", "Added to Mistake Box"], ["e_pdf", "PDFs opened"], ["e_print", "Pages printed"], ["e_saved", "Tests saved"], ["e_daily_done", "Daily Challenges finished"], ["e_solution_open", "Solutions opened on topic pages"], ["e_whatsapp", "WhatsApp clicks"]],
    devices: [["dm", "Phone or tablet"], ["dd", "Computer"], ["n", "First-time visitors"], ["e_invite", "Saw the free sign-in card"], ["e_invite_click", "Clicked it"], ["e_signin", "Signed in with Google"]],
  };
  const els = {
    status: root.querySelector("[data-stats-status]"),
    body: root.querySelector("[data-stats-body]"),
    range: root.querySelector("[data-stats-range]"),
    kpis: root.querySelector("[data-stats-kpis]"),
    chart: root.querySelector("[data-stats-chart]"),
  };
  let allDays = [];
  let users = [];
  let days = 7;
  let loaded = false;

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function cairoDay(offset = 0) {
    const date = new Date(Date.now() - offset * 86400000);
    try {
      return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
    } catch (err) {
      return date.toISOString().slice(0, 10);
    }
  }

  function fmt(value) {
    return Number(value || 0).toLocaleString("en-GB");
  }

  function setStatus(text) {
    els.status.textContent = text;
    els.status.hidden = !text;
  }

  function rangeDays() {
    const list = [];
    for (let i = days - 1; i >= 0; i -= 1) list.push(cairoDay(i));
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

  function renderKpis(sum, list) {
    const start = new Date(`${list[0]}T00:00:00`).getTime();
    const newStudents = users.filter((u) => u.firstSeen && u.firstSeen.getTime() >= start).length;
    const cards = [
      [sum.v, "page views"],
      [sum.u, "visitors (one per device per day)"],
      [sum.n, "first-time visitors"],
      [users.length, `signed-in students (${fmt(newStudents)} new)`],
      [sum.e_solved, "questions marked solved"],
    ];
    els.kpis.innerHTML = cards.map(([value, label]) => `<div><b class="e27-num">${fmt(value)}</b><span>${esc(label)}</span></div>`).join("");
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

  function renderList(name, sum) {
    const host = root.querySelector(`[data-stats-list="${name}"]`);
    const rows = LABELS[name].map(([key, label]) => ({ label, value: sum[key] || 0 }));
    const sorted = ["actions", "devices"].includes(name) ? rows : rows.slice().sort((a, b) => b.value - a.value);
    const max = Math.max(1, ...sorted.map((r) => r.value));
    host.innerHTML = `<ul class="e27-stats-list">${sorted.map((r) => `
      <li><span class="l">${esc(r.label)}</span><span class="b"><i style="width:${(r.value / max) * 100}%"></i></span><b class="e27-num">${fmt(r.value)}</b></li>`).join("")}</ul>`;
  }

  function render() {
    const list = rangeDays();
    const sum = totals(list);
    renderKpis(sum, list);
    renderChart(list);
    Object.keys(LABELS).forEach((name) => renderList(name, sum));
    els.range.querySelectorAll("button").forEach((button) => {
      button.setAttribute("aria-pressed", String(Number(button.dataset.days) === days));
    });
  }

  async function load() {
    if (loaded) return;
    loaded = true;
    setStatus("Loading statistics…");
    try {
      const [stats, people] = await Promise.all([
        window.EliteCloud.listSiteStats(cairoDay(89)),
        window.EliteCloud.listSiteUsers().catch(() => []),
      ]);
      allDays = stats;
      users = people;
    } catch (err) {
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

  els.range.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-days]");
    if (!button) return;
    days = Number(button.dataset.days) || 7;
    render();
  });

  window.addEventListener("elite-cloud-state", (event) => {
    const detail = event.detail || {};
    if (!detail.configured) { setStatus("Google sign-in is not configured on this site."); return; }
    if (!detail.ready) return;
    const user = detail.user;
    if (!user) { setStatus("Sign in with the teacher Google account to see the statistics."); return; }
    if (!TEACHERS.includes(String(user.email || "").toLowerCase())) {
      setStatus("This page is for Dr Eslam only.");
      return;
    }
    load();
  });
})();
