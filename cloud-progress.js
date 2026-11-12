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
    "eliteWMA13SolvedV1", "eliteWMA13MistakeBoxV1",
    "eliteWME01SolvedV1", "eliteWME01MistakeBoxV1",
    "eliteWMA11FinalTrainerV1", "eliteWMA12FinalTrainerV1", "eliteWMA13FinalTrainerV1", "eliteWME01FinalTrainerV1",
    "eliteFinalAnswerTrainerV1", "eliteNotesStudiedV1", "eliteSavedTestsV1",
    "eliteMockExamV1:wma11", "eliteMockExamV1:wma12", "eliteMockExamV1:wma13", "eliteMockExamV1:wme01",
    "eliteDailyV1", "eliteExamSessionV1"
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
    error: "",
    authKnown: false,
    pulledFor: ""
  };
  // The untouched localStorage writer: used when saved progress is loaded from the account,
  // so that loading is not counted as new work and does not start another upload.
  const originalSetItem = window.__eliteOriginalSetItem || Storage.prototype.setItem;
  window.__eliteOriginalSetItem = originalSetItem;

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

  // ---------- Pull before push ----------
  // Signing in on a second device must add to the saved progress, never replace it with an empty
  // browser. Once per browser session the account copy is read and joined with this device:
  // lists join (union), maps join by key, and this device wins a tie. Only then is anything uploaded.
  const PULL_SESSION_KEY = "eliteCloudPulledV1";
  const SIGNED_IN_FLAG_KEY = "eliteSignedInV1";
  const CLOUD_FIELDS = [
    ["profile", PROFILE_KEY], ["solved", SOLVED_KEY], ["selected", SELECTED_KEY], ["reviewItems", REVIEW_KEY],
    ["readiness", READINESS_KEY], ["activity", ACTIVITY_KEY], ["paperAttempts", PAPER_ATTEMPTS_KEY],
    ["studyTasks", STUDY_TASKS_KEY], ["assignmentsV2", ASSIGNMENTS_KEY], ["quizzesV2", QUIZZES_KEY],
    ["wma11Solved", WMA11_SOLVED_KEY], ["wma11Mistakes", WMA11_MISTAKE_KEY], ["mockHistory", MOCK_HISTORY_KEY],
    ["activeMock", EXAM_KEY], ["studyPlan", PLAN_KEY], ["leadInfo", LEAD_KEY]
  ];
  // A test in progress is one object: keep this device's copy, or take the saved one if there is none here.
  const WHOLE_VALUE_KEYS = /^eliteMockExamV1(:|$)/;

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function isEmptyValue(value) {
    if (value == null || value === "") return true;
    if (Array.isArray(value)) return value.length === 0;
    if (isPlainObject(value)) return Object.keys(value).length === 0;
    return false;
  }

  function itemKey(item) {
    if (item && typeof item === "object") return item.id != null ? `id:${item.id}` : JSON.stringify(item);
    return `${typeof item}:${item}`;
  }

  // Returns `local` itself when the account copy adds nothing, so callers can tell whether anything changed.
  function mergeValue(local, cloud, key) {
    if (isEmptyValue(cloud)) return local;
    if (isEmptyValue(local)) return cloud;
    if (WHOLE_VALUE_KEYS.test(key)) return local;
    if (Array.isArray(local) && Array.isArray(cloud)) {
      const seen = new Set(local.map(itemKey));
      const extra = cloud.filter((item) => {
        const id = itemKey(item);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
      return extra.length ? local.concat(extra) : local;
    }
    if (isPlainObject(local) && isPlainObject(cloud)) {
      let merged = local;
      Object.keys(cloud).forEach((name) => {
        if (Object.prototype.hasOwnProperty.call(local, name) || cloud[name] == null) return;
        if (merged === local) merged = { ...local };
        merged[name] = cloud[name];
      });
      return merged;
    }
    return local;
  }

  function mergeCloudIntoLocal(data) {
    if (!data || typeof data !== "object") return false;
    let changed = false;
    const mergeKey = (key, cloudValue) => {
      if (cloudValue == null) return;
      let localValue = null;
      try {
        const raw = localStorage.getItem(key);
        localValue = raw === null ? null : JSON.parse(raw);
      } catch (err) {
        localValue = null;
      }
      const merged = mergeValue(localValue, cloudValue, key);
      if (merged === localValue || isEmptyValue(merged)) return;
      try {
        originalSetItem.call(localStorage, key, JSON.stringify(merged));
        changed = true;
      } catch (err) {
        // Storage full or blocked: keep what this device has.
      }
    };
    CLOUD_FIELDS.forEach(([field, key]) => mergeKey(key, data[field]));
    if (data.extra && typeof data.extra === "object") {
      EXTRA_SYNC_KEYS.forEach((key) => mergeKey(key, data.extra[key]));
    }
    return changed;
  }

  // true = the account copy has been read (and joined) for this student, so uploading is safe.
  async function pullCloud(user) {
    if (!state.ready || !user) return false;
    if (state.pulledFor === user.uid) return true;
    try {
      if (sessionStorage.getItem(PULL_SESSION_KEY) === user.uid) {
        state.pulledFor = user.uid;
        return true;
      }
    } catch (err) {
      // sessionStorage blocked: read the account copy on every page instead.
    }
    const fs = state.modules.firestore;
    try {
      const snap = await fs.getDoc(fs.doc(state.db, COLLECTION, user.uid));
      const changed = snap.exists() ? mergeCloudIntoLocal(snap.data()) : false;
      state.pulledFor = user.uid;
      try { sessionStorage.setItem(PULL_SESSION_KEY, user.uid); } catch (err) { /* private mode */ }
      if (changed) progressLoaded();
      return true;
    } catch (err) {
      return false; // offline: nothing is uploaded until the account copy can be read
    }
  }

  // Saved progress arrived after the page had already drawn itself: show it.
  function progressLoaded() {
    window.dispatchEvent(new CustomEvent("elite-cloud-restored"));
    const page = document.body?.dataset.page || "";
    if (page === "exam" || document.body?.classList.contains("exam-sitting")) return; // never interrupt a test
    toast("Your saved progress was loaded from your account.");
    setTimeout(() => window.location.reload(), 1100);
  }

  function toast(text) {
    if (!document.body) return;
    document.querySelector(".e27-toast")?.remove();
    const note = document.createElement("div");
    note.className = "e27-toast";
    note.setAttribute("role", "status");
    note.textContent = text;
    document.body.append(note);
    void note.offsetHeight;
    note.classList.add("is-visible");
    setTimeout(() => {
      note.classList.remove("is-visible");
      setTimeout(() => note.remove(), 300);
    }, 4200);
  }

  // Static pages (topic pages) have no Firebase: this flag tells them the student already has an account.
  function markSignedIn(user) {
    try {
      if (user) originalSetItem.call(localStorage, SIGNED_IN_FLAG_KEY, "1");
      else localStorage.removeItem(SIGNED_IN_FLAG_KEY);
    } catch (err) {
      // private mode
    }
  }

  // ---------- Anonymous site statistics ----------
  // One small Firestore document per day (site_stats/YYYY-MM-DD, Cairo time) of plain counters.
  // No names, no emails, no cookies: only "how many" and "what was used". Teacher-only view: stats.html.
  // Every key must also be listed in docs/firestore.rules (tools/test_site_stats.js checks this).
  const STATS_KEYS = [
    "v", "u", "n", "dm", "dd",
    "pv_home", "pv_course", "pv_practice", "pv_notes", "pv_papers", "pv_books", "pv_exam", "pv_progress", "pv_ial", "pv_about", "pv_bacc", "pv_daily", "pv_other", "pv_topic", "pv_resource", "pv_guide",
    "c_linear", "c_unit1", "c_unit2", "c_wma11", "c_wma12", "c_wma13", "c_wme01",
    "t_notes", "t_books", "t_past_solutions", "t_build_test", "t_progress", "t_classified", "t_expertise", "t_revision_book", "t_mistake_box", "t_saved_tests", "t_interactive_lab", "t_question_visualizer", "t_daily",
    "e_pdf", "e_print", "e_solved", "e_mistake", "e_saved", "e_signin", "e_invite", "e_invite_click", "e_whatsapp", "e_daily_done", "e_solution_open",
    "g_eg", "g_qa", "g_ae", "g_sa", "g_kw", "g_om", "g_bh", "g_jo", "g_gb", "g_other",
    // Added 2026-11-12 (need the rules in docs/firestore.rules published; until then only these are skipped):
    // us = visitors who were signed in, m = minutes of real study time, r_ = where the visit came from,
    // cu_ = visitors per course (one per device per day), h_ = page views by hour of the day (Cairo).
    "us", "m", "t_final_revision", "e_mock_finish", "e_search", "e_invite_dismiss",
    "r_google", "r_search", "r_social", "r_whatsapp", "r_lab", "r_direct", "r_other",
    "cu_linear", "cu_unit1", "cu_unit2", "cu_wma11", "cu_wma12", "cu_wma13", "cu_wme01",
    "h_00", "h_01", "h_02", "h_03", "h_04", "h_05", "h_06", "h_07", "h_08", "h_09", "h_10", "h_11",
    "h_12", "h_13", "h_14", "h_15", "h_16", "h_17", "h_18", "h_19", "h_20", "h_21", "h_22", "h_23"
  ];
  const STATS_KEY_SET = new Set(STATS_KEYS);
  const STATS_V2_KEYS = new Set(STATS_KEYS.slice(STATS_KEYS.indexOf("us")));
  const STATS_V2_DENIED_KEY = "eliteStatsV2DeniedAt";
  const USER_V2_DENIED_KEY = "eliteUserV2DeniedAt";
  const DENIED_RETRY_MS = 6 * 3600000;
  const STATS_SIGNED_DAY_KEY = "eliteStatsSignedDayV1";
  const STATS_COURSE_DAY_KEY = "eliteStatsCourseDayV1";
  const ENGAGE_CARRY_KEY = "eliteEngageSecondsV1";
  const USER_MINUTES_KEY = "eliteUserMinutesV1";

  function isDenied(err) {
    return /permission|insufficient/i.test(String(err && (err.code || err.message)));
  }

  // The new fields are refused until the latest rules are published. Remember that for a few hours
  // so every write is still one request, and the old fields keep recording meanwhile.
  function recentlyDenied(key) {
    try {
      const at = Number(localStorage.getItem(key) || 0);
      return at > 0 && Date.now() - at < DENIED_RETRY_MS;
    } catch (err) {
      return false;
    }
  }

  function markDenied(key) {
    try { originalSetItem.call(localStorage, key, String(Date.now())); } catch (err) { /* private mode */ }
  }
  const STATS_DAY_KEY = "eliteStatsDayV1";
  const STATS_FIRST_KEY = "eliteStatsFirstV1";
  const STATS_IGNORE_KEY = "eliteStatsIgnoreV1";
  const STATS_MAX_STEP = 5;
  const STATS_STORAGE_RULES = [
    [/^solvedExpertiseQuestions$|Solved/, "e_solved"],
    [/MistakeBox/, "e_mistake"],
    [/^eliteSavedTestsV1/, "e_saved"],
    [/^eliteMockExamHistoryV1/, "e_mock_finish"]
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
    const counts = stats.pending;
    stats.pending = {};
    const build = (filter) => {
      const update = {};
      keys.filter(filter).forEach((key) => { update[key] = fs.increment(counts[key]); });
      return update;
    };
    const ref = fs.doc(state.db, "site_stats", statsDay());
    if (keys.some((key) => STATS_V2_KEYS.has(key)) && !recentlyDenied(STATS_V2_DENIED_KEY)) {
      try {
        await fs.setDoc(ref, build(() => true), { merge: true });
        return;
      } catch (err) {
        if (!isDenied(err)) return; // offline: drop silently, never disturb the student
        markDenied(STATS_V2_DENIED_KEY);
      }
    }
    const legacy = build((key) => !STATS_V2_KEYS.has(key));
    if (!Object.keys(legacy).length) return;
    try {
      await fs.setDoc(ref, legacy, { merge: true });
    } catch (err) {
      // Rules not published yet or offline: drop silently, never disturb the student.
    }
  }

  // Larger steps than countStat allows (minutes of study time). Rides along with the next write.
  function bumpStat(key, by) {
    if (!STATS_KEY_SET.has(key) || !statsEnabled() || !(by > 0)) return;
    stats.pending[key] = (stats.pending[key] || 0) + Math.min(60, Math.round(by));
    clearTimeout(stats.timer);
    stats.timer = setTimeout(flushStats, 3000);
  }

  // ---------- Study time ----------
  // A minute counts only while the page is on screen and the student touched it in the last two minutes.
  // Seconds are carried from page to page (sessionStorage) and written with the next page view,
  // so measuring time costs no extra requests.
  const engage = { seconds: 0, lastInput: Date.now(), hiddenTimer: null };

  function readSessionNumber(key) {
    try { return Number(sessionStorage.getItem(key) || 0) || 0; } catch (err) { return 0; }
  }

  function writeSessionNumber(key, value) {
    try { sessionStorage.setItem(key, String(value)); } catch (err) { /* private mode */ }
  }

  function parkEngagement() {
    if (!engage.seconds) return;
    writeSessionNumber(ENGAGE_CARRY_KEY, readSessionNumber(ENGAGE_CARRY_KEY) + engage.seconds);
    engage.seconds = 0;
  }

  function settleEngagement() {
    parkEngagement();
    const total = readSessionNumber(ENGAGE_CARRY_KEY);
    const minutes = Math.floor(total / 60);
    if (!minutes) return;
    writeSessionNumber(ENGAGE_CARRY_KEY, total % 60);
    writeSessionNumber(USER_MINUTES_KEY, readSessionNumber(USER_MINUTES_KEY) + minutes);
    bumpStat("m", minutes);
  }

  function initEngagement() {
    const touch = () => { engage.lastInput = Date.now(); };
    ["pointerdown", "keydown", "scroll", "touchstart"].forEach((type) => {
      window.addEventListener(type, touch, { passive: true, capture: true });
    });
    setInterval(() => {
      if (document.visibilityState === "visible" && Date.now() - engage.lastInput < 120000) engage.seconds += 15;
    }, 15000);
    document.addEventListener("visibilitychange", () => {
      clearTimeout(engage.hiddenTimer);
      if (document.visibilityState !== "hidden") return;
      parkEngagement();
      // Still in the background after 20 s (not a move to the next page): write what has been earned.
      engage.hiddenTimer = setTimeout(() => {
        settleEngagement();
        flushStats();
        heartbeat();
      }, 20000);
    });
    window.addEventListener("pagehide", parkEngagement);
  }

  function statsHour() {
    try {
      const hour = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Cairo", hour: "2-digit", hour12: false }).format(new Date());
      const value = Number(String(hour).replace(/\D/g, "")) % 24;
      return `h_${String(value).padStart(2, "0")}`;
    } catch (err) {
      return "";
    }
  }

  // Where today's first visit came from. Only the kind of site is kept, never the address.
  function statsSource() {
    const params = new URLSearchParams(window.location.search);
    const tagged = String(params.get("utm_source") || params.get("src") || "").toLowerCase();
    let host = "";
    try { host = document.referrer ? new URL(document.referrer).hostname.toLowerCase() : ""; } catch (err) { host = ""; }
    const from = `${tagged} ${host}`;
    if (/whatsapp|wa\.me/.test(from)) return "r_whatsapp";
    if (/eliteiglab\.com/.test(host)) return "r_lab";
    if (/(^|\.)eliteigcse\.com$/.test(host)) return "r_direct";
    if (/google\./.test(host) || /googlequicksearchbox/.test(document.referrer || "")) return "r_google";
    if (/bing\.|yahoo\.|duckduckgo\.|yandex\.|baidu\.|ecosia\./.test(host)) return "r_search";
    if (/facebook|fb\.|instagram|tiktok|youtube|youtu\.be|twitter|(^|\.)x\.com$|t\.co$|linkedin|telegram|t\.me$|snapchat/.test(from)) return "r_social";
    if (!host && !tagged) return "r_direct";
    return "r_other";
  }

  // One visitor per course per device per day (c_ counts every page opened; cu_ counts people).
  function countCourseVisitor(courseKey, today) {
    const id = courseKey.replace(/^c_/, "");
    try {
      const saved = JSON.parse(localStorage.getItem(STATS_COURSE_DAY_KEY) || "null");
      const seen = saved && saved.day === today && Array.isArray(saved.ids) ? saved.ids : [];
      if (seen.includes(id)) return;
      originalSetItem.call(localStorage, STATS_COURSE_DAY_KEY, JSON.stringify({ day: today, ids: seen.concat(id) }));
      countStat(`cu_${id}`);
    } catch (err) {
      // Storage blocked: the page view is still counted.
    }
  }

  // Counted once per device per day, when Google confirms the student is signed in.
  function countSignedInVisitor() {
    if (!statsEnabled()) return;
    const today = statsDay();
    try {
      if (localStorage.getItem(STATS_SIGNED_DAY_KEY) === today) return;
      originalSetItem.call(localStorage, STATS_SIGNED_DAY_KEY, today);
      countStat("us");
    } catch (err) {
      // Storage blocked: skip, otherwise every page would count again.
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
    if (added <= 0) return;
    countStat(rule[1], added);
    // The student now has something worth keeping: a good moment to offer the free account.
    studyMoment({ e_solved: "solved", e_mistake: "mistake", e_mock_finish: "mock" }[rule[1]]);
  }

  function statsSection() {
    const path = window.location.pathname.toLowerCase();
    if (path === "/" || path === "/index.html") return "pv_home";
    if (path.includes("/ial/")) return "pv_ial";
    const page = path.split("/").pop().replace(/\.html$/, "");
    return {
      course: "pv_course", practice: "pv_practice", library: "pv_notes", notes: "pv_notes", topics: "pv_notes",
      pastpapers: "pv_papers", downloads: "pv_books", "classified-books": "pv_books", "modular-books": "pv_books",
      exam: "pv_exam", progress: "pv_progress", about: "pv_about", "egyptian-baccalaureate": "pv_bacc", daily: "pv_daily"
    }[page] || "pv_other";
  }

  function statsCourse() {
    const params = new URLSearchParams(window.location.search);
    const path = window.location.pathname.toLowerCase();
    const named = String(params.get("c") || params.get("course") || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const aliases = { p1: "wma11", pure1: "wma11", p2: "wma12", pure2: "wma12", p3: "wma13", pure3: "wma13", m1: "wme01", mech1: "wme01", mechanics1: "wme01", "4ma1": "linear", "4wm1": "unit1", "4wm2": "unit2" };
    const fromName = aliases[named] || named;
    if (["linear", "unit1", "unit2", "wma11", "wma12", "wma13", "wme01"].includes(fromName)) return `c_${fromName}`;
    const ial = path.match(/\/ial\/(wma11|wma12|wma13|wme01)\//);
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
    countStat(statsHour());
    const course = statsCourse();
    const today = statsDay();
    if (course) {
      countStat(course);
      countCourseVisitor(course, today);
    }
    try {
      if (localStorage.getItem(STATS_DAY_KEY) !== today) {
        localStorage.setItem(STATS_DAY_KEY, today);
        countStat("u");
        countStat(statsSource());
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
    // The sign-in reminders below run everywhere; the counters only on the live site.
    document.addEventListener("click", (event) => {
      const link = event.target.closest("a");
      if (!link) return;
      const module = link.dataset.module;
      if (module) countStat(`t_${module.replace(/-/g, "_")}`);
      const href = link.getAttribute("href") || "";
      if (/\.pdf(\?|#|$)/i.test(href)) {
        countStat("e_pdf");
        studyMoment("pdf");
      }
      if (/wa\.me\//.test(href) || link.hasAttribute("data-lead-trigger")) countStat("e_whatsapp");
    }, true);
    window.addEventListener("elite:daily-complete", () => {
      countStat("e_daily_done");
      studyMoment("daily");
    });
    if (!statsEnabled()) return;
    settleEngagement();
    countPageView();
    initEngagement();
    let searched = false;
    document.addEventListener("input", (event) => {
      if (searched || !event.target.matches?.('input[type="search"]') || String(event.target.value || "").trim().length < 2) return;
      searched = true;
      countStat("e_search");
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

  // ---------- Free sign-in reminder ----------
  // Signing in stays free and optional, and every card has "Not now". But the reminder comes back:
  // after a few more pages, on the next day, and at the moments the student has something to lose
  // (questions solved, the Mistake Box, a finished Daily Challenge or mock, a book download).
  // The first card on arrival is a small corner card: a full-screen pop-up on a landing page pushes
  // students away and is penalised by Google on phones. Every later reminder is a centred pop-up.
  const INVITE_STATE_KEY = "eliteSignInReminderV2";
  const INVITE_FIRST_DELAY_MS = 5000;
  const INVITE_RETURN_DELAY_MS = 9000;
  const INVITE_MOMENT_DELAY_MS = 1200;
  const INVITE_EVERY_PAGES = 3;
  const INVITE_MIN_GAP_MS = 90000;
  const INVITE_SOLVED_STEPS = [3, 10, 25, 50];
  const INVITE_SKIP_PAGES = new Set(["admin", "members", "stats", "exam"]);
  const IAL_CODES = ["WMA11", "WMA12", "WMA13", "WME01"];
  const GOOGLE_ICON = '<svg class="e27-g" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
  let inviteTimer = null;
  let inviteReturnFocus = null;

  // null = storage is blocked (private mode): then no timed reminders, or every page would nag.
  function readInviteState() {
    try {
      const saved = JSON.parse(localStorage.getItem(INVITE_STATE_KEY) || "null");
      return saved && typeof saved === "object" ? saved : {};
    } catch (err) {
      return null;
    }
  }

  function saveInviteState(next) {
    try { originalSetItem.call(localStorage, INVITE_STATE_KEY, JSON.stringify(next)); } catch (err) { /* private mode */ }
  }

  function storedCount(key) {
    try { return storageSize(localStorage.getItem(key)); } catch (err) { return 0; }
  }

  // What this device holds: shown in the reminder ("12 questions solved") and sent with the student record.
  function deviceSnapshot() {
    const total = (name) => IAL_CODES.reduce((sum, code) => sum + storedCount(name(code)), 0);
    return {
      solved: storedCount(SOLVED_KEY) + total((code) => `elite${code}SolvedV1`),
      mistakes: storedCount(REVIEW_KEY) + total((code) => `elite${code}MistakeBoxV1`),
      mocks: storedCount(MOCK_HISTORY_KEY) + total((code) => `${MOCK_HISTORY_KEY}:${code.toLowerCase()}`),
      streak: Number(readJSON("eliteDailyV1", {})?.streak?.count || 0) || 0
    };
  }

  function inviteCopy(reason) {
    const { solved } = deviceSnapshot();
    const many = `${solved.toLocaleString("en-GB")} question${solved === 1 ? "" : "s"}`;
    switch (reason) {
      case "solved":
        return { title: `${many} solved. Don't lose them.`, text: "They are saved only in this browser. Sign in free with Google and they stay with you on every device." };
      case "mistake":
        return { title: "Keep your Mistake Box safe", text: "Your questions to redo are saved only in this browser. Sign in free with Google and they follow you to every device." };
      case "daily":
        return { title: "Keep your streak on every device", text: "Today's Daily Challenge is done. Sign in free with Google so your streak and results are never lost." };
      case "mock":
        return { title: "Keep your mock results", text: "Your marks and exam history are saved only in this browser. Sign in free with Google and keep them safe." };
      case "pdf":
        return { title: "Studying from the books?", text: "Sign in free with Google to mark what you finish online and keep your progress on every device." };
      case "return":
        return {
          title: "Still studying without an account?",
          text: solved
            ? `You have ${many} solved on this device only. Sign in free with Google and keep them on every device.`
            : "Sign in free with Google and your solved questions, Mistake Box and mocks follow you to any phone or laptop."
        };
      default:
        return { title: "Sign in with Google, free forever", text: "Save your solved questions, Mistake Box and mocks on every device. No password, no payment." };
    }
  }

  function hideInvite(remember = false) {
    clearTimeout(inviteTimer);
    const card = document.querySelector(".e27-invite");
    if (remember && card) {
      const saved = readInviteState();
      if (saved) saveInviteState({ ...saved, dismissed: Number(saved.dismissed || 0) + 1 });
      countStat("e_invite_dismiss");
    }
    if (!card) return;
    const shade = document.querySelector(".e27-invite-shade");
    card.classList.remove("is-visible");
    shade?.classList.remove("is-visible");
    setTimeout(() => {
      card.remove();
      shade?.remove();
    }, 260);
    if (inviteReturnFocus && document.contains(inviteReturnFocus)) inviteReturnFocus.focus({ preventScroll: true });
    inviteReturnFocus = null;
  }

  function canInvite(force) {
    if (!state.configured || !state.authKnown || state.user || !document.body) return false;
    if (!force && INVITE_SKIP_PAGES.has(document.body.dataset.page || "")) return false;
    if (document.body.classList.contains("exam-sitting")) return false; // never during a timed test
    if (document.querySelector(".e27-invite") || window.matchMedia("print").matches) return false;
    return true;
  }

  function showInvite(reason, { force = false } = {}) {
    if (!canInvite(force)) return;
    const saved = readInviteState() || {};
    if (!force && Date.now() - Number(saved.lastAt || 0) < INVITE_MIN_GAP_MS) return;
    const modal = force || reason !== "welcome";
    const copy = inviteCopy(reason);
    const card = document.createElement("aside");
    card.className = `e27-invite${modal ? " is-modal" : ""}`;
    card.dataset.reason = reason;
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-labelledby", "e27InviteTitle");
    if (modal) card.setAttribute("aria-modal", "true");
    card.innerHTML = `
      <button class="e27-invite-close" type="button" aria-label="Close" data-e27-invite-later>&times;</button>
      <span class="e27-kicker">Free student account</span>
      <h2 id="e27InviteTitle"></h2>
      <p data-e27-invite-text></p>
      ${modal ? `<ul class="e27-invite-perks">
        <li>Solved questions and Mistake Box on every device</li>
        <li>Mock results and saved tests kept safely</li>
        <li>Free forever. No password, no payment</li>
      </ul>` : ""}
      <div class="e27-invite-actions">
        <button class="e27-btn e27-btn-google" type="button" data-cloud-login data-cloud-label="Continue with Google">${GOOGLE_ICON}Continue with Google</button>
        <button class="e27-btn e27-invite-later" type="button" data-e27-invite-later>Not now</button>
      </div>
      <small class="e27-invite-note">Free and optional. We keep your name, email and progress; Dr Eslam can see who signed in and how much they study.</small>`;
    card.querySelector("h2").textContent = copy.title;
    card.querySelector("[data-e27-invite-text]").textContent = copy.text;
    let shade = null;
    if (modal) {
      shade = document.createElement("div");
      shade.className = "e27-invite-shade";
      shade.addEventListener("click", () => hideInvite(true));
      document.body.append(shade);
    }
    document.body.append(card);
    saveInviteState({ ...saved, shown: Number(saved.shown || 0) + 1, lastAt: Date.now(), lastDay: statsDay(), pages: 0 });
    countStat("e_invite");
    card.querySelector("[data-cloud-login]").addEventListener("click", () => countStat("e_invite_click"));
    card.querySelectorAll("[data-e27-invite-later]").forEach((button) => {
      button.addEventListener("click", () => hideInvite(true));
    });
    card.addEventListener("keydown", (event) => {
      if (event.key === "Escape") hideInvite(true);
    });
    // Force a layout so the fade-in transition runs (rAF would stall in background tabs).
    void card.offsetHeight;
    card.classList.add("is-visible");
    shade?.classList.add("is-visible");
    if (modal) {
      inviteReturnFocus = document.activeElement;
      card.querySelector("[data-cloud-login]").focus({ preventScroll: true });
    }
  }

  // Runs on every page once Google says nobody is signed in.
  function scheduleInvite() {
    clearTimeout(inviteTimer);
    // ?signin=1 (the "Sign in free" button on static pages) opens the card at once.
    if (/[?&]signin=1\b/.test(window.location.search)) {
      inviteTimer = setTimeout(() => showInvite("welcome", { force: true }), 300);
      return;
    }
    const saved = readInviteState();
    if (!saved) return;
    const pages = Number(saved.pages || 0) + 1;
    saveInviteState({ ...saved, pages });
    const first = !saved.shown;
    if (!first && pages < INVITE_EVERY_PAGES && saved.lastDay === statsDay()) return;
    inviteTimer = setTimeout(() => showInvite(first ? "welcome" : "return"), first ? INVITE_FIRST_DELAY_MS : INVITE_RETURN_DELAY_MS);
  }

  // The student just did something worth keeping while signed out.
  function studyMoment(reason) {
    if (!reason || !state.authKnown || state.user) return;
    const saved = readInviteState();
    if (!saved || Date.now() - Number(saved.lastAt || 0) < INVITE_MIN_GAP_MS) return;
    const today = statsDay();
    if (reason === "solved") {
      const { solved } = deviceSnapshot();
      const step = solved >= 100 ? Math.floor(solved / 50) * 50 : INVITE_SOLVED_STEPS.filter((n) => n <= solved).pop() || 0;
      if (!step || step <= Number(saved.solvedStep || 0)) return;
      saveInviteState({ ...saved, solvedStep: step });
    } else if (reason === "mistake" || reason === "pdf") {
      if (saved[`${reason}Day`] === today) return;
      saveInviteState({ ...saved, [`${reason}Day`]: today });
    }
    clearTimeout(inviteTimer);
    inviteTimer = setTimeout(() => showInvite(reason), INVITE_MOMENT_DELAY_MS);
  }

  // "Sign in free" on a static page opens /?signin=1&next=/that/page. Only a path on this site is accepted.
  function signInReturnPath() {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next") || "";
    return params.has("signin") && /^\/(?!\/)[\w\-./?=&%+#~]*$/.test(next) ? next : "";
  }

  // ---------- Who uses the site: one small record per signed-in student ----------
  // site_users/{uid}: name, email, first/last visit, visit count, last page and course, plus a summary
  // of the student's work (days active, questions solved, Mistake Box, mocks, streak, minutes, device).
  // One write per browser session, then at most one every few minutes while the student is working.
  const VISIT_SESSION_KEY = "eliteVisitRecordedV1";
  const HEARTBEAT_AT_KEY = "eliteUserHeartbeatAtV1";
  const HEARTBEAT_SNAP_KEY = "eliteUserSnapV1";
  const HEARTBEAT_GAP_MS = 180000;

  function lastCourseId() {
    try { return String(localStorage.getItem("eliteLastCourse") || "").slice(0, 20); } catch (err) { return ""; }
  }

  function userBase(user, fs) {
    return {
      uid: user.uid,
      name: String(user.displayName || "").slice(0, 120),
      email: String(user.email || "").toLowerCase().slice(0, 200),
      lastSeen: fs.serverTimestamp(),
      lastPage: String(window.location.pathname || "/").slice(0, 200),
      lastCourse: lastCourseId()
    };
  }

  function userActivity(fs) {
    const course = lastCourseId();
    let zone = "";
    try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (err) { zone = ""; }
    const activity = {
      ...deviceSnapshot(),
      days: fs.arrayUnion(statsDay()),
      device: window.matchMedia("(max-width: 760px), (pointer: coarse)").matches ? "phone" : "computer",
      zone: zone.slice(0, 40),
      exam: String(readJSON("eliteExamSessionV1", {})?.[course]?.label || "").slice(0, 40)
    };
    if (course) activity.courses = fs.arrayUnion(course);
    return activity;
  }

  async function writeUserRecord(user, base) {
    const fs = state.modules.firestore;
    const ref = fs.doc(state.db, "site_users", user.uid);
    if (!recentlyDenied(USER_V2_DENIED_KEY)) {
      const activity = userActivity(fs);
      const minutes = readSessionNumber(USER_MINUTES_KEY);
      if (minutes > 0) activity.minutes = fs.increment(minutes);
      try {
        await fs.setDoc(ref, { ...base, ...activity }, { merge: true });
        if (minutes > 0) writeSessionNumber(USER_MINUTES_KEY, Math.max(0, readSessionNumber(USER_MINUTES_KEY) - minutes));
        writeSessionNumber(HEARTBEAT_AT_KEY, Date.now());
        try { sessionStorage.setItem(HEARTBEAT_SNAP_KEY, JSON.stringify(deviceSnapshot())); } catch (err) { /* private mode */ }
        return;
      } catch (err) {
        if (!isDenied(err)) return; // offline: never disturb the student
        markDenied(USER_V2_DENIED_KEY);
      }
    }
    if (!("visits" in base)) return; // the rules published before 2026-11-12 accept only the visit record
    try {
      await fs.setDoc(ref, base, { merge: true });
    } catch (err) {
      // Rules not published yet or offline: never disturb the student.
    }
  }

  async function recordVisit(user) {
    if (!state.ready || !user) return;
    try {
      if (sessionStorage.getItem(VISIT_SESSION_KEY) === user.uid) {
        heartbeat();
        return;
      }
      sessionStorage.setItem(VISIT_SESSION_KEY, user.uid);
    } catch (err) {
      // sessionStorage blocked: still record once for this page load.
    }
    const fs = state.modules.firestore;
    const base = { ...userBase(user, fs), visits: fs.increment(1) };
    try {
      const snap = await fs.getDoc(fs.doc(state.db, "site_users", user.uid));
      if (!snap.exists()) base.firstSeen = fs.serverTimestamp();
    } catch (err) {
      return; // rules not published yet or offline
    }
    await writeUserRecord(user, base);
  }

  // Later in the same session: refresh the summary when the student has studied or solved more.
  function heartbeat() {
    const user = state.user;
    if (!state.ready || !user || recentlyDenied(USER_V2_DENIED_KEY)) return;
    let last = "";
    try {
      if (sessionStorage.getItem(VISIT_SESSION_KEY) !== user.uid) return;
      last = sessionStorage.getItem(HEARTBEAT_SNAP_KEY) || "";
    } catch (err) {
      return;
    }
    if (readSessionNumber(USER_MINUTES_KEY) < 1 && JSON.stringify(deviceSnapshot()) === last) return;
    if (Date.now() - readSessionNumber(HEARTBEAT_AT_KEY) < HEARTBEAT_GAP_MS) return;
    writeUserRecord(user, userBase(user, state.modules.firestore));
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
        state.authKnown = true;
        updateUi();
        emitState();
        markSignedIn(user);
        if (user) {
          if (isTeacherEmail(user.email)) ignoreMyStats();
          countSignedInVisitor();
          const back = signInReturnPath();
          pullCloud(user)
            .then((pulled) => { if (pulled) queueSync(); })
            .then(() => recordVisit(user))
            .then(() => {
              if (!back) return;
              // Came from "Sign in free" on a topic page: go back to it.
              flushStats();
              setTimeout(() => window.location.replace(back), 700);
            });
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
    state.pulledFor = "";
    try { sessionStorage.removeItem(PULL_SESSION_KEY); } catch (err) { /* private mode */ }
    markSignedIn(null);
    updateUi("Signed out. Local progress still remains on this device.");
    emitState();
  }

  async function syncNow(source = "manual") {
    if (!state.ready || !state.user) {
      updateUi("Sign in with Google first.");
      return false;
    }
    if (!(await pullCloud(state.user))) {
      // Never upload over an account copy that has not been read: that is how progress gets lost.
      if (source === "manual") updateUi("Could not reach your saved progress. Check your connection and try again.");
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
    if (state.pulledFor !== state.user.uid) {
      // Read the account copy first; the upload follows once it has been joined with this device.
      pullCloud(state.user).then((pulled) => { if (pulled && state.user) queueSync(); });
      return;
    }
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
        lastCourse: data.lastCourse || "",
        // Activity summary (recorded from 2026-11-12, after the new rules are published).
        tracked: Array.isArray(data.days),
        days: Array.isArray(data.days) ? data.days.filter((day) => typeof day === "string").sort() : [],
        solved: Number(data.solved || 0),
        mistakes: Number(data.mistakes || 0),
        mocks: Number(data.mocks || 0),
        streak: Number(data.streak || 0),
        minutes: Number(data.minutes || 0),
        device: data.device || "",
        zone: data.zone || "",
        exam: data.exam || "",
        courses: Array.isArray(data.courses) ? data.courses : []
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
