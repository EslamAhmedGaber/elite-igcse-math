(function () {
  const PROFILE_KEY = "eliteStudentProfileV1";
  const SOLVED_KEY = "solvedExpertiseQuestions";
  const SELECTED_KEY = "selectedExpertiseQuestions";
  const REVIEW_KEY = "eliteMistakeBoxV1";
  const READINESS_KEY = "eliteReadinessCheck";
  const ACTIVITY_KEY = "eliteStudyActivityV1";
  const PAPER_ATTEMPTS_KEY = "elitePaperAttemptsV1";
  const STUDY_TASKS_KEY = "eliteStudyTasksV1";
  const MOCK_HISTORY_KEY = "eliteMockExamHistoryV1";
  const EXAM_KEY = "eliteMockExamV1";
  const PLAN_KEY = "eliteStudyPlanSettings";
  const LEAD_KEY = "leadInfoV1";
  const ASSIGNMENTS_KEY = "eliteTrackerAssignmentsV2";
  const QUIZZES_KEY = "eliteTrackerQuizzesV2";
  const WMA11_SOLVED_KEY = "eliteWMA11SolvedV1";
  const WMA11_MISTAKE_KEY = "eliteWMA11MistakeBoxV1";
  const COLLECTION = "student_progress";
  const SDK_VERSION = "10.12.5";
  const SYNC_KEYS = new Set([
    PROFILE_KEY,
    SOLVED_KEY,
    SELECTED_KEY,
    REVIEW_KEY,
    READINESS_KEY,
    ACTIVITY_KEY,
    PAPER_ATTEMPTS_KEY,
    STUDY_TASKS_KEY,
    MOCK_HISTORY_KEY,
    EXAM_KEY,
    PLAN_KEY,
    LEAD_KEY,
    ASSIGNMENTS_KEY,
    QUIZZES_KEY,
    WMA11_SOLVED_KEY,
    WMA11_MISTAKE_KEY
  ]);
  // Course and tool keys synced generically (stored under payload.extra[key]).
  // Add a new course or tool here and it syncs everywhere: no other change needed.
  const EXTRA_SYNC_KEYS = [
    "eliteWMA12SolvedV1", "eliteWMA12MistakeBoxV1",
    "eliteWME01SolvedV1", "eliteWME01MistakeBoxV1",
    "eliteWMA11FinalTrainerV1", "eliteWMA12FinalTrainerV1", "eliteWME01FinalTrainerV1",
    "eliteFinalAnswerTrainerV1", "eliteNotesStudiedV1", "eliteSavedTestsV1",
    "eliteMockExamV1:wma11", "eliteMockExamV1:wma12", "eliteMockExamV1:wme01"
  ];
  // Firestore documents are limited to 1 MiB; leave room for the core payload.
  const EXTRA_BUDGET_BYTES = 600000;
  EXTRA_SYNC_KEYS.forEach((key) => SYNC_KEYS.add(key));

  const state = {
    configured: false,
    ready: false,
    user: null,
    auth: null,
    db: null,
    modules: null,
    syncTimer: null,
    lastSyncAt: null,
    error: ""
  };

  const els = {
    panel: document.getElementById("cloudSyncPanel"),
    status: document.getElementById("cloudStatus"),
    user: document.getElementById("cloudUser"),
    login: document.getElementById("googleLoginBtn"),
    logout: document.getElementById("googleLogoutBtn"),
    sync: document.getElementById("syncCloudBtn"),
    restore: document.getElementById("restoreCloudBtn")
  };

  function all(selector) {
    return [...document.querySelectorAll(selector)];
  }

  function firstName() {
    return (state.user?.displayName || "My").split(/\s+/).filter(Boolean)[0] || "My";
  }

  function ensureFloatingWidget() {
    if (!document.body || document.body.dataset.page === "progress" || document.querySelector(".cloud-floating-widget")) return;
    const widget = document.createElement("aside");
    widget.className = "cloud-floating-widget";
    widget.setAttribute("aria-label", "Google progress sync");
    widget.innerHTML = `
      <span data-cloud-mini-status>Save progress across devices</span>
      <button class="cloud-floating-login" type="button" data-cloud-login>Continue with Google</button>
      <a class="cloud-floating-account" href="progress.html" data-cloud-account hidden>My progress</a>
      <button class="cloud-floating-sync" type="button" data-cloud-sync hidden>Sync</button>
    `;
    document.body.append(widget);
  }

  function readJSON(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value ?? fallback;
    } catch (err) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function configured() {
    const setup = window.ELITE_FIREBASE || {};
    const config = setup.config || {};
    return Boolean(setup.enabled && config.apiKey && config.authDomain && config.projectId && config.appId);
  }

  function profile() {
    return readJSON(PROFILE_KEY, {});
  }

  function payload() {
    const currentProfile = profile();
    const displayName = state.user?.displayName || "";
    const email = state.user?.email || "";
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      student: {
        uid: state.user?.uid || "",
        name: currentProfile.name || displayName,
        email,
        targetGrade: currentProfile.targetGrade || "",
        examSession: currentProfile.examSession || "",
        weeklyTarget: Number(currentProfile.weeklyTarget || 30)
      },
      profile: currentProfile,
      solved: readJSON(SOLVED_KEY, []),
      selected: readJSON(SELECTED_KEY, []),
      reviewItems: readJSON(REVIEW_KEY, {}),
      readiness: readJSON(READINESS_KEY, {}),
      activity: readJSON(ACTIVITY_KEY, {}),
      paperAttempts: readJSON(PAPER_ATTEMPTS_KEY, []),
      studyTasks: readJSON(STUDY_TASKS_KEY, []),
      assignmentsV2: readJSON(ASSIGNMENTS_KEY, []),
      quizzesV2: readJSON(QUIZZES_KEY, []),
      wma11Solved: readJSON(WMA11_SOLVED_KEY, []),
      wma11Mistakes: readJSON(WMA11_MISTAKE_KEY, {}),
      mockHistory: readJSON(MOCK_HISTORY_KEY, []),
      activeMock: readJSON(EXAM_KEY, {}),
      studyPlan: readJSON(PLAN_KEY, {}),
      leadInfo: readJSON(LEAD_KEY, {}),
      extra: extraPayload()
    };
  }

  function extraPayload() {
    const extra = {};
    let used = 0;
    EXTRA_SYNC_KEYS.forEach((key) => {
      const raw = localStorage.getItem(key);
      if (raw === null) return;
      // Skip a single key rather than fail the whole sync if it is unusually large.
      if (used + raw.length > EXTRA_BUDGET_BYTES) return;
      try {
        extra[key] = JSON.parse(raw);
        used += raw.length;
      } catch (err) {
        // Ignore unreadable local values.
      }
    });
    return extra;
  }

  function applyPayload(data) {
    if (!data || typeof data !== "object") return;
    if (data.profile) writeJSON(PROFILE_KEY, data.profile);
    if (Array.isArray(data.solved)) writeJSON(SOLVED_KEY, data.solved);
    if (Array.isArray(data.selected)) writeJSON(SELECTED_KEY, data.selected);
    if (data.reviewItems) writeJSON(REVIEW_KEY, data.reviewItems);
    if (data.readiness) writeJSON(READINESS_KEY, data.readiness);
    if (data.activity) writeJSON(ACTIVITY_KEY, data.activity);
    if (Array.isArray(data.paperAttempts)) writeJSON(PAPER_ATTEMPTS_KEY, data.paperAttempts);
    if (Array.isArray(data.studyTasks)) writeJSON(STUDY_TASKS_KEY, data.studyTasks);
    if (Array.isArray(data.assignmentsV2)) writeJSON(ASSIGNMENTS_KEY, data.assignmentsV2);
    if (Array.isArray(data.quizzesV2)) writeJSON(QUIZZES_KEY, data.quizzesV2);
    if (Array.isArray(data.wma11Solved)) writeJSON(WMA11_SOLVED_KEY, data.wma11Solved);
    if (data.wma11Mistakes) writeJSON(WMA11_MISTAKE_KEY, data.wma11Mistakes);
    if (Array.isArray(data.mockHistory)) writeJSON(MOCK_HISTORY_KEY, data.mockHistory);
    if (data.activeMock) writeJSON(EXAM_KEY, data.activeMock);
    if (data.studyPlan) writeJSON(PLAN_KEY, data.studyPlan);
    if (data.leadInfo) writeJSON(LEAD_KEY, data.leadInfo);
    if (data.extra && typeof data.extra === "object") {
      EXTRA_SYNC_KEYS.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(data.extra, key) && data.extra[key] !== null) {
          writeJSON(key, data.extra[key]);
        }
      });
    }
  }

  // ---------- Anonymous site statistics ----------
  // One small Firestore document per day (site_stats/YYYY-MM-DD, Cairo time) of plain counters.
  // No names, no emails, no cookies: only "how many" and "what was used". Teacher-only view: stats.html.
  // Every key must also be listed in docs/firestore.rules (tools/test_site_stats.js checks this).
  const STATS_KEYS = [
    "v", "u", "n", "dm", "dd",
    "pv_home", "pv_course", "pv_practice", "pv_notes", "pv_papers", "pv_books", "pv_exam", "pv_progress", "pv_ial", "pv_about", "pv_bacc", "pv_other",
    "c_linear", "c_unit1", "c_unit2", "c_wma11", "c_wma12", "c_wme01",
    "t_notes", "t_books", "t_past_solutions", "t_build_test", "t_progress", "t_classified", "t_expertise", "t_revision_book", "t_mistake_box", "t_saved_tests", "t_interactive_lab", "t_question_visualizer",
    "e_pdf", "e_print", "e_solved", "e_mistake", "e_saved", "e_signin", "e_invite", "e_invite_click", "e_whatsapp",
    "g_eg", "g_qa", "g_ae", "g_sa", "g_kw", "g_om", "g_bh", "g_jo", "g_gb", "g_other"
  ];
  const STATS_KEY_SET = new Set(STATS_KEYS);
  const STATS_DAY_KEY = "eliteStatsDayV1";
  const STATS_FIRST_KEY = "eliteStatsFirstV1";
  const STATS_IGNORE_KEY = "eliteStatsIgnoreV1";
  const STATS_MAX_STEP = 5;
  const STATS_STORAGE_RULES = [
    [/^solvedExpertiseQuestions$|Solved/, "e_solved"],
    [/MistakeBox/, "e_mistake"],
    [/^eliteSavedTestsV1/, "e_saved"]
  ];
  const TIMEZONE_COUNTRY = {
    "Africa/Cairo": "g_eg", "Asia/Qatar": "g_qa", "Asia/Dubai": "g_ae", "Asia/Riyadh": "g_sa", "Asia/Kuwait": "g_kw",
    "Asia/Muscat": "g_om", "Asia/Bahrain": "g_bh", "Asia/Amman": "g_jo", "Europe/London": "g_gb"
  };
  const stats = { pending: {}, timer: null, printed: false };

  function isTeacherEmail(email) {
    const teachers = (window.ELITE_FIREBASE?.adminEmails || []).map((item) => String(item).toLowerCase());
    return teachers.includes(String(email || "").toLowerCase());
  }

  // Dr Eslam's own browsing should not inflate the numbers.
  function ignoreMyStats() {
    try { localStorage.setItem(STATS_IGNORE_KEY, "1"); } catch (err) { /* private mode */ }
    stats.pending = {};
    clearTimeout(stats.timer);
  }

  function statsEnabled() {
    if (navigator.webdriver) return false;
    const liveHost = /(^|\.)eliteigcse\.com$/.test(window.location.hostname);
    if (!liveHost && !/[?&]stats=test\b/.test(window.location.search)) return false;
    try {
      if (localStorage.getItem(STATS_IGNORE_KEY) === "1") return false;
    } catch (err) {
      // Storage blocked: still count the visit.
    }
    return true;
  }

  function statsDay() {
    try {
      return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    } catch (err) {
      return new Date().toISOString().slice(0, 10);
    }
  }

  function countStat(key, by = 1) {
    if (!STATS_KEY_SET.has(key) || !statsEnabled()) return;
    const step = Math.max(1, Math.min(STATS_MAX_STEP, Math.round(by)));
    stats.pending[key] = (stats.pending[key] || 0) + step;
    clearTimeout(stats.timer);
    stats.timer = setTimeout(flushStats, 3000);
  }

  async function flushStats() {
    const keys = Object.keys(stats.pending);
    if (!keys.length) return;
    if (!state.ready) {
      stats.timer = setTimeout(flushStats, 3000);
      return;
    }
    if (/[?&]stats=test\b/.test(window.location.search)) {
      // Dry run for local checks: show what would be counted, never write.
      window.__eliteStatsDryRun = { ...(window.__eliteStatsDryRun || {}) };
      keys.forEach((key) => { window.__eliteStatsDryRun[key] = (window.__eliteStatsDryRun[key] || 0) + stats.pending[key]; });
      stats.pending = {};
      return;
    }
    const fs = state.modules.firestore;
    const update = {};
    keys.forEach((key) => { update[key] = fs.increment(stats.pending[key]); });
    stats.pending = {};
    try {
      await fs.setDoc(fs.doc(state.db, "site_stats", statsDay()), update, { merge: true });
    } catch (err) {
      // Rules not published yet or offline: drop silently, never disturb the student.
    }
  }

  function storageSize(raw) {
    try {
      const value = JSON.parse(raw || "null");
      if (Array.isArray(value)) return value.length;
      if (value && typeof value === "object") return Object.keys(value).length;
    } catch (err) {
      return 0;
    }
    return 0;
  }

  function statsFromStorage(key, before, after) {
    const rule = STATS_STORAGE_RULES.find(([pattern]) => pattern.test(key));
    if (!rule) return;
    const added = storageSize(after) - storageSize(before);
    if (added > 0) countStat(rule[1], added);
  }

  function statsSection() {
    const path = window.location.pathname.toLowerCase();
    if (path === "/" || path === "/index.html") return "pv_home";
    if (path.includes("/ial/")) return "pv_ial";
    const page = path.split("/").pop().replace(/\.html$/, "");
    return {
      course: "pv_course", practice: "pv_practice", library: "pv_notes", notes: "pv_notes", topics: "pv_notes",
      pastpapers: "pv_papers", downloads: "pv_books", "classified-books": "pv_books", "modular-books": "pv_books",
      exam: "pv_exam", progress: "pv_progress", about: "pv_about", "egyptian-baccalaureate": "pv_bacc"
    }[page] || "pv_other";
  }

  function statsCourse() {
    const params = new URLSearchParams(window.location.search);
    const path = window.location.pathname.toLowerCase();
    const named = String(params.get("c") || params.get("course") || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const aliases = { p1: "wma11", pure1: "wma11", p2: "wma12", pure2: "wma12", m1: "wme01", mech1: "wme01", mechanics1: "wme01", "4ma1": "linear", "4wm1": "unit1", "4wm2": "unit2" };
    const fromName = aliases[named] || named;
    if (["linear", "unit1", "unit2", "wma11", "wma12", "wme01"].includes(fromName)) return `c_${fromName}`;
    const ial = path.match(/\/ial\/(wma11|wma12|wme01)\//);
    if (ial) return `c_${ial[1]}`;
    const unit = String(params.get("unit") || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (unit === "unit1" || unit === "unit2") return `c_${unit}`;
    if (String(params.get("pathway") || "").toLowerCase() === "linear") return "c_linear";
    return "";
  }

  function countPageView() {
    if (!statsEnabled()) return;
    countStat("v");
    countStat(statsSection());
    const course = statsCourse();
    if (course) countStat(course);
    const today = statsDay();
    try {
      if (localStorage.getItem(STATS_DAY_KEY) !== today) {
        localStorage.setItem(STATS_DAY_KEY, today);
        countStat("u");
        let zone = "";
        try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (err) { zone = ""; }
        countStat(TIMEZONE_COUNTRY[zone] || "g_other");
        countStat(window.matchMedia("(max-width: 760px), (pointer: coarse)").matches ? "dm" : "dd");
        if (!localStorage.getItem(STATS_FIRST_KEY)) {
          localStorage.setItem(STATS_FIRST_KEY, today);
          countStat("n");
        }
      }
    } catch (err) {
      // Storage blocked: page view is still counted above.
    }
  }

  function initStats() {
    if (!statsEnabled()) return;
    countPageView();
    document.addEventListener("click", (event) => {
      const link = event.target.closest("a");
      if (!link) return;
      const module = link.dataset.module;
      if (module) countStat(`t_${module.replace(/-/g, "_")}`);
      const href = link.getAttribute("href") || "";
      if (/\.pdf(\?|#|$)/i.test(href)) countStat("e_pdf");
      if (/wa\.me\//.test(href) || link.hasAttribute("data-lead-trigger")) countStat("e_whatsapp");
    }, true);
    window.addEventListener("beforeprint", () => {
      if (stats.printed) return;
      stats.printed = true;
      countStat("e_print");
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flushStats();
    });
  }

  function patchLocalStorageSync() {
    if (window.__eliteCloudStoragePatched) return;
    window.__eliteCloudStoragePatched = true;
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function patchedSetItem(key, value) {
      let before = null;
      try {
        if (this === localStorage && STATS_STORAGE_RULES.some(([pattern]) => pattern.test(String(key)))) {
          before = this.getItem(key);
        }
      } catch (err) {
        before = null;
      }
      const result = originalSetItem.apply(this, arguments);
      try {
        if (this === localStorage) statsFromStorage(String(key), before, value);
      } catch (err) {
        // Statistics must never interfere with saving.
      }
      try {
        if (this === localStorage && SYNC_KEYS.has(String(key)) && window.EliteCloud?.queueSync) {
          window.EliteCloud.queueSync();
        }
      } catch (err) {
        // Local storage writes should never be blocked by cloud sync.
      }
      return result;
    };
  }

  function updateGlobalUi(message = "") {
    ensureFloatingWidget();
    const signedIn = Boolean(state.user);
    const miniStatus = message
      || (!state.configured ? "Local progress only"
        : !signedIn ? "Save progress across devices"
          : state.lastSyncAt ? `Synced ${state.lastSyncAt}` : "Cloud sync active");

    all("[data-cloud-login]").forEach((button) => {
      button.hidden = signedIn;
      button.disabled = !state.configured;
      // Buttons with their own markup (icons) keep it; plain buttons get the shared label.
      if (!button.children.length) button.textContent = button.dataset.cloudLabel || "Sign in free";
    });

    all("[data-e27-account]").forEach((band) => {
      band.dataset.signedIn = String(signedIn);
      band.querySelectorAll("[data-e27-first-name]").forEach((node) => {
        node.textContent = signedIn && state.user?.displayName ? `, ${firstName()}` : "";
      });
    });
    if (signedIn) hideInvite();

    all("[data-cloud-account]").forEach((link) => {
      link.hidden = !signedIn;
      link.textContent = `${firstName()} progress`;
      link.setAttribute("title", state.user?.email || "Open progress");
    });

    all("[data-cloud-sync]").forEach((button) => {
      button.hidden = !signedIn;
      button.disabled = !signedIn || !state.ready;
    });

    all("[data-cloud-mini-status]").forEach((status) => {
      status.textContent = miniStatus;
    });

    all(".cloud-floating-widget").forEach((widget) => {
      widget.classList.toggle("is-signed-in", signedIn);
      widget.classList.toggle("is-disabled", !state.configured);
    });
  }

  // ---------- Free sign-in invite: friendly, optional, never blocks the page ----------
  const INVITE_DISMISS_KEY = "eliteSignInInviteDismissedAt";
  const INVITE_SNOOZE_DAYS = 7;
  const INVITE_DELAY_MS = 5000;
  const INVITE_SKIP_PAGES = new Set(["admin", "members", "stats", "exam", "progress"]);
  let inviteTimer = null;

  function inviteSnoozed() {
    try {
      const at = Number(localStorage.getItem(INVITE_DISMISS_KEY) || 0);
      return at > 0 && Date.now() - at < INVITE_SNOOZE_DAYS * 86400000;
    } catch (err) {
      return true; // storage blocked: do not nag on every page
    }
  }

  function hideInvite(remember = false) {
    clearTimeout(inviteTimer);
    if (remember) {
      try { localStorage.setItem(INVITE_DISMISS_KEY, String(Date.now())); } catch (err) { /* private mode */ }
    }
    const card = document.querySelector(".e27-invite");
    if (!card) return;
    card.classList.remove("is-visible");
    setTimeout(() => card.remove(), 260);
  }

  function scheduleInvite() {
    const page = document.body?.dataset.page || "";
    if (!state.configured || state.user || INVITE_SKIP_PAGES.has(page) || inviteSnoozed()) return;
    if (document.querySelector(".e27-invite") || window.matchMedia("print").matches) return;
    clearTimeout(inviteTimer);
    inviteTimer = setTimeout(() => {
      if (state.user || document.querySelector(".e27-invite")) return;
      const card = document.createElement("aside");
      card.className = "e27-invite";
      card.setAttribute("role", "dialog");
      card.setAttribute("aria-labelledby", "e27InviteTitle");
      card.innerHTML = `
        <button class="e27-invite-close" type="button" aria-label="Close" data-e27-invite-later>&times;</button>
        <span class="e27-kicker">Free student account</span>
        <h2 id="e27InviteTitle">Sign in with Google, free forever</h2>
        <p>Save your solved questions, Mistake Box and mocks on every device. No password, no payment. Optional: everything works without it.</p>
        <div class="e27-invite-actions">
          <button class="e27-btn e27-btn-gold" type="button" data-cloud-login data-cloud-label="Continue with Google">Continue with Google</button>
          <button class="e27-btn e27-invite-later" type="button" data-e27-invite-later>Not now</button>
        </div>
        <small class="e27-invite-note">We keep your name, email and progress. Dr Eslam can see who has signed in.</small>`;
      document.body.append(card);
      countStat("e_invite");
      card.querySelector("[data-cloud-login]")?.addEventListener("click", () => countStat("e_invite_click"));
      card.querySelectorAll("[data-e27-invite-later]").forEach((button) => {
        button.addEventListener("click", () => hideInvite(true));
      });
      card.addEventListener("keydown", (event) => {
        if (event.key === "Escape") hideInvite(true);
      });
      // Force a layout so the fade-in transition runs (rAF would stall in background tabs).
      void card.offsetHeight;
      card.classList.add("is-visible");
    }, INVITE_DELAY_MS);
  }

  // ---------- Who uses the site: one small record per signed-in student ----------
  // site_users/{uid}: name, email, first/last visit, visit count, last page and course.
  // Written at most once per browser session, so it costs almost nothing.
  const VISIT_SESSION_KEY = "eliteVisitRecordedV1";

  async function recordVisit(user) {
    if (!state.ready || !user) return;
    try {
      if (sessionStorage.getItem(VISIT_SESSION_KEY) === user.uid) return;
      sessionStorage.setItem(VISIT_SESSION_KEY, user.uid);
    } catch (err) {
      // sessionStorage blocked: still record once for this page load.
    }
    const fs = state.modules.firestore;
    const ref = fs.doc(state.db, "site_users", user.uid);
    let lastCourse = "";
    try { lastCourse = localStorage.getItem("eliteLastCourse") || ""; } catch (err) { /* private mode */ }
    const record = {
      uid: user.uid,
      name: String(user.displayName || "").slice(0, 120),
      email: String(user.email || "").toLowerCase().slice(0, 200),
      lastSeen: fs.serverTimestamp(),
      lastPage: String(window.location.pathname || "/").slice(0, 200),
      lastCourse: lastCourse.slice(0, 20),
      visits: fs.increment(1)
    };
    try {
      const snap = await fs.getDoc(ref);
      if (!snap.exists()) record.firstSeen = fs.serverTimestamp();
      await fs.setDoc(ref, record, { merge: true });
    } catch (err) {
      // Rules not published yet or offline: never disturb the student.
    }
  }

  function updateUi(message = "") {
    updateGlobalUi(message);
    if (!els.panel) return;
    els.panel.classList.toggle("cloud-disabled", !state.configured);
    if (!state.configured) {
      if (els.status) els.status.textContent = "Cloud login is ready in the code. Add the free Firebase config to activate it.";
      if (els.user) els.user.textContent = "Local progress is still saving on this device.";
      [els.logout, els.sync, els.restore].forEach((button) => { if (button) button.disabled = true; });
      if (els.login) els.login.disabled = true;
      return;
    }

    const signedIn = Boolean(state.user);
    if (els.login) els.login.hidden = signedIn;
    if (els.logout) els.logout.hidden = !signedIn;
    [els.sync, els.restore].forEach((button) => { if (button) button.disabled = !signedIn; });
    if (els.user) {
      els.user.textContent = signedIn
        ? `${state.user.displayName || "Student"} - ${state.user.email || "Google account"}`
        : "Not signed in yet.";
    }
    if (els.status) {
      if (message) els.status.textContent = message;
      else if (!signedIn) els.status.textContent = "Sign in with Google to sync this progress across devices.";
      else if (state.lastSyncAt) els.status.textContent = `Cloud sync active. Last saved ${state.lastSyncAt}.`;
      else els.status.textContent = "Signed in. Press Sync now or keep solving; progress will save automatically.";
    }
  }

  function emitState() {
    window.dispatchEvent(new CustomEvent("elite-cloud-state", {
      detail: {
        configured: state.configured,
        ready: state.ready,
        user: state.user ? {
          uid: state.user.uid,
          name: state.user.displayName,
          email: state.user.email
        } : null,
        lastSyncAt: state.lastSyncAt,
        error: state.error
      }
    }));
  }

  async function loadModules() {
    if (state.modules) return state.modules;
    const [app, auth, firestore] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-firestore.js`)
    ]);
    state.modules = { app, auth, firestore };
    return state.modules;
  }

  async function init() {
    state.configured = configured();
    updateUi();
    emitState();
    if (!state.configured) return;

    try {
      const modules = await loadModules();
      const firebaseApp = modules.app.initializeApp(window.ELITE_FIREBASE.config);
      state.auth = modules.auth.getAuth(firebaseApp);
      state.db = modules.firestore.getFirestore(firebaseApp);
      state.ready = true;
      await modules.auth.getRedirectResult(state.auth).catch(() => null);
      modules.auth.onAuthStateChanged(state.auth, (user) => {
        state.user = user;
        updateUi();
        emitState();
        if (user) {
          if (isTeacherEmail(user.email)) ignoreMyStats();
          queueSync();
          recordVisit(user);
        } else {
          scheduleInvite();
        }
      });
    } catch (err) {
      state.error = err.message || "Firebase could not start.";
      updateUi(state.error);
      emitState();
    }
  }

  async function signIn() {
    if (!state.ready) {
      updateUi("Google login is loading. Try again in a moment.");
      return;
    }
    const provider = new state.modules.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      await state.modules.auth.signInWithPopup(state.auth, provider);
      countStat("e_signin");
    } catch (err) {
      if (String(err.code || "").includes("popup")) {
        await state.modules.auth.signInWithRedirect(state.auth, provider);
        return;
      }
      state.error = err.message || "Google login failed.";
      updateUi(state.error);
      emitState();
    }
  }

  async function signOut() {
    if (!state.ready) return;
    await state.modules.auth.signOut(state.auth);
    state.user = null;
    updateUi("Signed out. Local progress still remains on this device.");
    emitState();
  }

  async function syncNow(source = "manual") {
    if (!state.ready || !state.user) {
      updateUi("Sign in with Google first.");
      return false;
    }
    const originalSyncText = els.sync?.textContent || "Sync now";
    const globalSyncButtons = all("[data-cloud-sync]");
    if (els.sync && source === "manual") {
      els.sync.disabled = true;
      els.sync.textContent = "Saving...";
    }
    if (source === "manual") {
      globalSyncButtons.forEach((button) => {
        button.disabled = true;
        button.textContent = "Saving";
      });
    }
    try {
      const data = payload();
      await state.modules.firestore.setDoc(
        state.modules.firestore.doc(state.db, COLLECTION, state.user.uid),
        {
          ...data,
          syncSource: source,
          serverUpdatedAt: state.modules.firestore.serverTimestamp()
        },
        { merge: true }
      );
      state.lastSyncAt = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      if (els.sync && source === "manual") {
        els.sync.textContent = "Saved";
        setTimeout(() => { els.sync.textContent = originalSyncText; }, 1600);
      }
      if (source === "manual") {
        globalSyncButtons.forEach((button) => {
          button.textContent = "Saved";
          setTimeout(() => { button.textContent = "Sync"; }, 1600);
        });
      }
      updateUi(source === "manual" ? `Saved to cloud at ${state.lastSyncAt}.` : "");
      emitState();
      return true;
    } catch (err) {
      state.error = err.message || "Cloud save failed.";
      updateUi(state.error);
      emitState();
      return false;
    } finally {
      if (els.sync) els.sync.disabled = !state.user;
      globalSyncButtons.forEach((button) => { button.disabled = !state.user; });
    }
  }

  async function restoreNow() {
    if (!state.ready || !state.user) {
      updateUi("Sign in with Google first.");
      return false;
    }
    try {
      const snap = await state.modules.firestore.getDoc(
        state.modules.firestore.doc(state.db, COLLECTION, state.user.uid)
      );
      if (!snap.exists()) {
        updateUi("No cloud progress found yet. Press Sync now first.");
        return false;
      }
      applyPayload(snap.data());
      updateUi("Cloud progress restored. Reloading...");
      setTimeout(() => window.location.reload(), 700);
      return true;
    } catch (err) {
      state.error = err.message || "Cloud restore failed.";
      updateUi(state.error);
      emitState();
      return false;
    }
  }

  function queueSync() {
    if (!state.ready || !state.user) return;
    clearTimeout(state.syncTimer);
    state.syncTimer = setTimeout(() => syncNow("auto"), 1600);
  }

  if (els.login) els.login.addEventListener("click", signIn);
  if (els.logout) els.logout.addEventListener("click", signOut);
  if (els.sync) els.sync.addEventListener("click", () => syncNow("manual"));
  if (els.restore) els.restore.addEventListener("click", restoreNow);
  document.addEventListener("click", (event) => {
    const login = event.target.closest("[data-cloud-login]");
    const sync = event.target.closest("[data-cloud-sync]");
    const logout = event.target.closest("[data-cloud-logout]");
    if (login) {
      event.preventDefault();
      signIn();
    } else if (sync) {
      event.preventDefault();
      syncNow("manual");
    } else if (logout) {
      event.preventDefault();
      signOut();
    }
  });

  // Teacher view (members.html). Firestore rules allow the list only to the teacher email.
  async function listSiteUsers(max = 5000) {
    if (!state.ready || !state.user) throw new Error("Sign in first.");
    const fs = state.modules.firestore;
    const snap = await fs.getDocs(fs.query(fs.collection(state.db, "site_users"), fs.orderBy("lastSeen", "desc"), fs.limit(max)));
    return snap.docs.map((doc) => {
      const data = doc.data() || {};
      const when = (value) => (value && typeof value.toDate === "function" ? value.toDate() : null);
      return {
        uid: doc.id,
        name: data.name || "",
        email: data.email || "",
        firstSeen: when(data.firstSeen),
        lastSeen: when(data.lastSeen),
        visits: Number(data.visits || 0),
        lastPage: data.lastPage || "",
        lastCourse: data.lastCourse || ""
      };
    });
  }

  // Teacher view (stats.html): daily counters from fromDay (YYYY-MM-DD) up to today.
  async function listSiteStats(fromDay) {
    if (!state.ready || !state.user) throw new Error("Sign in first.");
    const fs = state.modules.firestore;
    const snap = await fs.getDocs(fs.query(
      fs.collection(state.db, "site_stats"),
      fs.where(fs.documentId(), ">=", String(fromDay)),
      fs.orderBy(fs.documentId())
    ));
    return snap.docs.map((doc) => ({ day: doc.id, ...(doc.data() || {}) }));
  }

  window.EliteCloud = {
    init,
    listSiteUsers,
    listSiteStats,
    statsKeys: STATS_KEYS.slice(),
    signIn,
    signOut,
    syncNow,
    restoreNow,
    queueSync,
    state: () => ({ ...state, auth: null, db: null, modules: null })
  };

  patchLocalStorageSync();
  initStats();
  init();
})();
