/* ==========================================================================
   lesson-tracker.js - Elite IGCSE Teacher Lesson Tracker data layer.
   Spec: tracker-plan/PLAN_FINAL.md (PLAN v2 + Audit 2 fixes N1-N8).

   Firestore layout (rules pinned to the teacher email - see PLAN §0.5/§6):
     teacher_students/{studentId}            name, phone, note, archived,
                                              createdAt, editedAt (client ms)
     teacher_students/_meta                  rosterTombstones {id: {updatedAt}}
     teacher_students/{id}/courses/{courseId}
                                              courseId, ticks{}, tombstones{}

   Sync: per-key last-writer-wins with tombstones, for tick keys AND for
   roster-level data (student docs + deletions) - PLAN §2.2 (fix N2).
   A localStorage mirror keeps the page fully working when Firestore is
   unreachable or the rules are not published yet (with a visible banner).

   Demo mode (?demo=1): identical API, localStorage only, separate key,
   simulated gate (fix N8). Demo never reads or writes the real mirror key.

   This file contains no DOM code. The pure merge/data functions are
   exported as window.EliteTrackerCore so they can be unit-tested headless.
   ========================================================================== */
(function (root) {
  "use strict";

  const SDK_VERSION = "10.12.5";
  const APP_NAME = "elite-tracker";
  const REAL_KEY = "eliteLessonTrackerV1";
  const DEMO_KEY = "eliteLessonTrackerDemoV1";
  const DEMO_USER_KEY = "eliteLessonTrackerDemoUserV1";
  const META_DOC_ID = "_meta";
  const NOTE_CAP = 500;

  const params = new URLSearchParams(root.location ? root.location.search : "");
  const firebaseCfg = root.ELITE_FIREBASE || {};
  const demoMode = params.get("demo") === "1" || !firebaseCfg.enabled;

  /* ------------------------------------------------------------ storage */

  function storage() {
    try {
      return root.localStorage || null;
    } catch (error) {
      return null;
    }
  }

  function lsGet(key) {
    try {
      const raw = storage() && storage().getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function lsSet(key, value) {
    try {
      if (storage()) storage().setItem(key, JSON.stringify(value));
    } catch (error) { /* storage full/blocked: in-memory state still works */ }
  }

  function lsRemove(key) {
    try {
      if (storage()) storage().removeItem(key);
    } catch (error) { /* ignore */ }
  }

  /* ------------------------------------------------------- pure helpers */

  function normEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function teacherEmails() {
    return (firebaseCfg.adminEmails || []).map(normEmail);
  }

  function isTeacherEmail(email) {
    return Boolean(email && teacherEmails().includes(normEmail(email)));
  }

  function normName(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  }

  /* wa.me needs full international digits (PLAN fix N6):
     strip non-digits; Egyptian local 01xxxxxxxxx -> 201xxxxxxxxx. */
  function normalisePhone(raw) {
    let digits = String(raw || "").replace(/\D/g, "");
    if (!digits) return "";
    if (digits.startsWith("00")) digits = digits.slice(2);
    if (digits.startsWith("0")) digits = "20" + digits.slice(1);
    return digits;
  }

  function cairoToday(now = new Date()) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit"
    }).format(now);
  }

  function genId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  }

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function capNote(value) {
    return String(value || "").slice(0, NOTE_CAP);
  }

  /* --------------------------------------------------------- data shape */
  /* One dataset shape everywhere (cloud snapshot, mirror, demo store):
     { students: {id: student}, courses: {studentId: {courseId: doc}},
       rosterTombstones: {studentId: {updatedAt}}, lastFullSync: ms }   */

  function emptyDataset() {
    return { students: {}, courses: {}, rosterTombstones: {}, lastFullSync: 0 };
  }

  function emptyCourseDoc(courseId) {
    return { courseId, ticks: {}, tombstones: {}, updatedAt: 0 };
  }

  function createStudent(fields, now) {
    return {
      id: genId("stu"),
      name: String(fields.name || "").trim(),
      phone: String(fields.phone || "").trim(),
      note: capNote(fields.note || ""),
      archived: false,
      createdAt: now,
      editedAt: now
    };
  }

  /* ------------------------------------------------------- tick editing */

  function applyTick(courseDoc, topic, data, now) {
    const doc = clone(courseDoc) || emptyCourseDoc("");
    doc.ticks = doc.ticks || {};
    doc.tombstones = doc.tombstones || {};
    doc.ticks[topic] = {
      date: data.date,
      hw: Boolean(data.hw),
      note: capNote(data.note || ""),
      at: now,
      updatedAt: now
    };
    delete doc.tombstones[topic];
    doc.updatedAt = now;
    return doc;
  }

  function applyUntick(courseDoc, topic, now) {
    const doc = clone(courseDoc) || emptyCourseDoc("");
    doc.ticks = doc.ticks || {};
    doc.tombstones = doc.tombstones || {};
    delete doc.ticks[topic];
    doc.tombstones[topic] = { updatedAt: now };
    doc.updatedAt = now;
    return doc;
  }

  /* ------------------------------------------------------------ merging */
  /* Per-key last-writer-wins. For each topic key the candidates are
     {cloud tick, cloud tombstone, mirror tick, mirror tombstone}; the
     greatest updatedAt wins (tombstone wins an exact tie - deletion is
     the safer default). Whole-document overwrites never happen.        */

  function mergeCourseDoc(cloudDoc, mirrorDoc) {
    if (!cloudDoc) return clone(mirrorDoc) || null;
    if (!mirrorDoc) return clone(cloudDoc) || null;
    const merged = {
      courseId: cloudDoc.courseId || mirrorDoc.courseId,
      ticks: {},
      tombstones: {},
      updatedAt: Math.max(cloudDoc.updatedAt || 0, mirrorDoc.updatedAt || 0)
    };
    const keys = new Set([
      ...Object.keys(cloudDoc.ticks || {}),
      ...Object.keys(cloudDoc.tombstones || {}),
      ...Object.keys(mirrorDoc.ticks || {}),
      ...Object.keys(mirrorDoc.tombstones || {})
    ]);
    keys.forEach((topic) => {
      const candidates = [];
      if (cloudDoc.ticks && cloudDoc.ticks[topic]) candidates.push({ kind: "tick", at: cloudDoc.ticks[topic].updatedAt || 0, value: cloudDoc.ticks[topic] });
      if (mirrorDoc.ticks && mirrorDoc.ticks[topic]) candidates.push({ kind: "tick", at: mirrorDoc.ticks[topic].updatedAt || 0, value: mirrorDoc.ticks[topic] });
      if (cloudDoc.tombstones && cloudDoc.tombstones[topic]) candidates.push({ kind: "tomb", at: cloudDoc.tombstones[topic].updatedAt || 0, value: cloudDoc.tombstones[topic] });
      if (mirrorDoc.tombstones && mirrorDoc.tombstones[topic]) candidates.push({ kind: "tomb", at: mirrorDoc.tombstones[topic].updatedAt || 0, value: mirrorDoc.tombstones[topic] });
      candidates.sort((a, b) => (b.at - a.at) || (a.kind === "tomb" ? -1 : 1));
      const winner = candidates[0];
      if (!winner) return;
      if (winner.kind === "tick") merged.ticks[topic] = clone(winner.value);
      else merged.tombstones[topic] = clone(winner.value);
    });
    return merged;
  }

  /* Roster merge (fix N2): student docs carry editedAt; deletions carry
     roster tombstones in BOTH mirror and cloud (_meta doc). A tombstone
     at or after the doc's editedAt deletes the student on both sides;
     the mirror can never re-create a tombstoned student.               */
  function mergeDatasets(cloudData, mirrorData, lastFullSync = 0) {
    const cloud = cloudData || emptyDataset();
    const mirror = mirrorData || emptyDataset();
    const merged = emptyDataset();
    merged.lastFullSync = Math.max(cloud.lastFullSync || 0, mirror.lastFullSync || 0);

    // Roster tombstones: union, greatest updatedAt per student id.
    const tombIds = new Set([...Object.keys(cloud.rosterTombstones || {}), ...Object.keys(mirror.rosterTombstones || {})]);
    tombIds.forEach((id) => {
      const c = cloud.rosterTombstones && cloud.rosterTombstones[id];
      const m = mirror.rosterTombstones && mirror.rosterTombstones[id];
      const winner = (c && m) ? (c.updatedAt >= m.updatedAt ? c : m) : (c || m);
      // Prune ONLY under the single safe rule (fix N5): both sides agree
      // the student is deleted AND the tombstone predates the last
      // successful full sync.
      if (c && m && winner.updatedAt < (lastFullSync || 0)) return;
      merged.rosterTombstones[id] = clone(winner);
    });

    // Students: per-id last-writer-wins on editedAt (cloud wins ties),
    // unless a roster tombstone at/after editedAt deletes the student.
    const studentIds = new Set([...Object.keys(cloud.students || {}), ...Object.keys(mirror.students || {})]);
    studentIds.forEach((id) => {
      const c = cloud.students && cloud.students[id];
      const m = mirror.students && mirror.students[id];
      const doc = (c && m) ? ((m.editedAt || 0) > (c.editedAt || 0) ? m : c) : (c || m);
      if (!doc) return;
      const tomb = merged.rosterTombstones[id];
      if (tomb && (tomb.updatedAt || 0) >= (doc.editedAt || 0)) return; // deleted
      merged.students[id] = clone(doc);
    });

    // Course docs: only for surviving students; per-key tick merge.
    Object.keys(merged.students).forEach((studentId) => {
      const cloudCourses = (cloud.courses && cloud.courses[studentId]) || {};
      const mirrorCourses = (mirror.courses && mirror.courses[studentId]) || {};
      const courseIds = new Set([...Object.keys(cloudCourses), ...Object.keys(mirrorCourses)]);
      if (!courseIds.size) return;
      merged.courses[studentId] = {};
      courseIds.forEach((courseId) => {
        let doc = mergeCourseDoc(cloudCourses[courseId] || null, mirrorCourses[courseId] || null);
        if (!doc) return;
        doc = pruneCourseTombstones(doc, cloudCourses[courseId], mirrorCourses[courseId], lastFullSync);
        merged.courses[studentId][courseId] = doc;
      });
    });

    return merged;
  }

  /* Tick-tombstone pruning - the same single safe rule (fix N5): prune
     only when cloud AND mirror both hold the tombstone for the key and
     it is older than the last successful full sync. */
  function pruneCourseTombstones(doc, cloudDoc, mirrorDoc, lastFullSync) {
    if (!lastFullSync) return doc;
    Object.keys(doc.tombstones || {}).forEach((topic) => {
      const inCloud = cloudDoc && cloudDoc.tombstones && cloudDoc.tombstones[topic];
      const inMirror = mirrorDoc && mirrorDoc.tombstones && mirrorDoc.tombstones[topic];
      if (inCloud && inMirror && (doc.tombstones[topic].updatedAt || 0) < lastFullSync) {
        delete doc.tombstones[topic];
      }
    });
    return doc;
  }

  /* --------------------------------------------------------- analytics */

  function nextTopic(topics, ticks) {
    const done = ticks || {};
    for (const topic of topics) {
      if (!done[topic.name]) return topic.name;
    }
    return null;
  }

  function progressFor(topics, ticks) {
    const total = topics.length;
    const done = topics.filter((topic) => (ticks || {})[topic.name]).length;
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  }

  function latestTickDate(courseDoc) {
    let latest = "";
    Object.values((courseDoc && courseDoc.ticks) || {}).forEach((tick) => {
      if (tick.date && tick.date > latest) latest = tick.date;
    });
    return latest;
  }

  function flattenLog(dataset, { includeArchived = false } = {}) {
    const rows = [];
    Object.values(dataset.students || {}).forEach((student) => {
      if (student.archived && !includeArchived) return;
      const byCourse = (dataset.courses && dataset.courses[student.id]) || {};
      Object.values(byCourse).forEach((doc) => {
        Object.entries(doc.ticks || {}).forEach(([topic, tick]) => {
          rows.push({
            date: tick.date || "",
            studentId: student.id,
            student: student.name,
            courseId: doc.courseId,
            topic,
            hw: Boolean(tick.hw),
            note: tick.note || ""
          });
        });
      });
    });
    return rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : String(a.student).localeCompare(String(b.student))));
  }

  function weekRange(todayStr) {
    const base = new Date(`${todayStr}T12:00:00`);
    if (Number.isNaN(base.getTime())) return { start: todayStr, end: todayStr };
    const day = (base.getDay() + 6) % 7; // Monday = 0
    const start = new Date(base); start.setDate(base.getDate() - day);
    const end = new Date(start); end.setDate(start.getDate() + 6);
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { start: fmt(start), end: fmt(end) };
  }

  function buildDigest(dataset, todayStr) {
    const rows = flattenLog(dataset);
    const todayRows = rows.filter((row) => row.date === todayStr);
    const { start, end } = weekRange(todayStr);
    const weekRows = rows.filter((row) => row.date >= start && row.date <= end);
    const byStudent = {};
    todayRows.forEach((row) => {
      (byStudent[row.student] = byStudent[row.student] || []).push(row);
    });
    return { today: todayRows, byStudent, weekCount: weekRows.length, weekStart: start, weekEnd: end };
  }

  function unmatchedTicks(courseDoc, topics) {
    const known = new Set(topics.map((topic) => topic.name));
    return Object.keys((courseDoc && courseDoc.ticks) || {}).filter((name) => !known.has(name));
  }

  const Core = {
    normEmail, isTeacherEmail, teacherEmails, normName, normalisePhone,
    cairoToday, genId, capNote, emptyDataset, emptyCourseDoc, createStudent,
    applyTick, applyUntick, mergeCourseDoc, mergeDatasets,
    nextTopic, progressFor, latestTickDate, flattenLog, weekRange,
    buildDigest, unmatchedTicks, NOTE_CAP
  };
  root.EliteTrackerCore = Core;

  /* ============================================================== store */

  const listeners = new Set();
  const state = {
    ready: false,
    user: null,
    error: "",
    cloudOk: false,     // last cloud load/push succeeded
    syncIssue: false,   // a change is saved in this browser only
    dataset: null,      // merged dataset (teacher only)
    modules: null,
    auth: null,
    db: null
  };

  function isTeacher(user = state.user) {
    return Boolean(user && isTeacherEmail(user.email));
  }

  function snapshot() {
    return {
      ready: state.ready,
      user: state.user,
      isTeacher: isTeacher(),
      demo: demoMode,
      cloudOk: state.cloudOk,
      syncIssue: state.syncIssue,
      error: state.error
    };
  }

  function emit() {
    const snap = snapshot();
    listeners.forEach((listener) => listener(snap));
  }

  function onChange(listener) {
    listeners.add(listener);
    listener(snapshot());
    return () => listeners.delete(listener);
  }

  function assertTeacher() {
    if (!isTeacher()) {
      const error = new Error("Teacher account only.");
      error.code = "tracker/teacher-only";
      throw error;
    }
  }

  /* ----------------------------------------------------- mirror (real) */

  function readMirror() {
    const raw = lsGet(REAL_KEY);
    if (!raw) return emptyDataset();
    return { ...emptyDataset(), ...raw };
  }

  function writeMirror() {
    if (!state.dataset) return;
    lsSet(REAL_KEY, state.dataset);
  }

  function clearLocalCopies() {
    lsRemove(REAL_KEY);
    lsRemove(DEMO_KEY);
    lsRemove(DEMO_USER_KEY);
  }

  /* ------------------------------------------------------------ demo io */

  function seedDemoDataset() {
    const now = Date.now();
    const today = cairoToday();
    const yesterday = cairoToday(new Date(Date.now() - 86400000));
    const a = { id: "stu-demo-a", name: "Demo Student A", phone: "0100 123 4567", note: "Demo data - Year 11, exam June", archived: false, createdAt: now - 7 * 86400000, editedAt: now - 86400000 };
    const b = { id: "stu-demo-b", name: "Demo Student B", phone: "", note: "Demo data", archived: false, createdAt: now - 3 * 86400000, editedAt: now - 3 * 86400000 };
    const dataset = emptyDataset();
    dataset.students[a.id] = a;
    dataset.students[b.id] = b;
    const docA = emptyCourseDoc("modular-2");
    docA.ticks["Prime Factors, HCF & LCM"] = { date: yesterday, hw: true, note: "Confident.", at: now - 86400000, updatedAt: now - 86400000 };
    docA.ticks["Fractions"] = { date: today, hw: false, note: "", at: now, updatedAt: now };
    docA.updatedAt = now;
    dataset.courses[a.id] = { "modular-2": docA };
    dataset.courses[b.id] = { linear: emptyCourseDoc("linear") };
    return dataset;
  }

  function readDemoDataset() {
    const raw = lsGet(DEMO_KEY);
    if (!raw) {
      const seeded = seedDemoDataset();
      lsSet(DEMO_KEY, seeded);
      return seeded;
    }
    return { ...emptyDataset(), ...raw };
  }

  function writeDemoDataset() {
    if (state.dataset) lsSet(DEMO_KEY, state.dataset);
  }

  function demoUser() {
    const email = lsGet(DEMO_USER_KEY);
    return email ? { uid: `demo-${email}`, email, displayName: email.split("@")[0] } : null;
  }

  /* --------------------------------------------------------- firestore */

  const fire = {
    async load() {
      if (state.modules) return state.modules;
      const [app, auth, firestore] = await Promise.all([
        import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-app.js`),
        import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-auth.js`),
        import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-firestore.js`)
      ]);
      state.modules = { app, auth, firestore };
      return state.modules;
    },
    f() { return state.modules.firestore; },
    ref(...path) { return fire.f().doc(state.db, ...path); },
    col(...path) { return fire.f().collection(state.db, ...path); }
  };

  async function loadCloudDataset() {
    const dataset = emptyDataset();
    const snap = await fire.f().getDocs(fire.col("teacher_students"));
    const jobs = [];
    snap.docs.forEach((docSnap) => {
      const data = docSnap.data() || {};
      if (docSnap.id === META_DOC_ID) {
        dataset.rosterTombstones = data.rosterTombstones || {};
        return;
      }
      dataset.students[docSnap.id] = { id: docSnap.id, ...data };
      jobs.push((async () => {
        const coursesSnap = await fire.f().getDocs(fire.col("teacher_students", docSnap.id, "courses"));
        if (!coursesSnap.docs.length) return;
        dataset.courses[docSnap.id] = {};
        coursesSnap.docs.forEach((courseSnap) => {
          dataset.courses[docSnap.id][courseSnap.id] = { courseId: courseSnap.id, ticks: {}, tombstones: {}, updatedAt: 0, ...(courseSnap.data() || {}) };
        });
      })());
    });
    await Promise.all(jobs);
    return dataset;
  }

  async function pushStudent(student) {
    const { id, ...data } = student;
    await fire.f().setDoc(fire.ref("teacher_students", id), { ...data, updatedAt: fire.f().serverTimestamp() }, { merge: true });
  }

  async function pushCourseDoc(studentId, doc) {
    await fire.f().setDoc(
      fire.ref("teacher_students", studentId, "courses", doc.courseId),
      { courseId: doc.courseId, ticks: doc.ticks || {}, tombstones: doc.tombstones || {}, updatedAt: fire.f().serverTimestamp() },
      { merge: true }
    );
  }

  async function pushMeta() {
    await fire.f().setDoc(fire.ref("teacher_students", META_DOC_ID), { rosterTombstones: state.dataset.rosterTombstones || {} }, { merge: true });
  }

  /* Push one mutation to the cloud; failure keeps the mirror copy and
     raises the sync banner instead of losing the change (PLAN §2.2). */
  async function cloudPush(job) {
    if (demoMode) return true;
    try {
      await job();
      if (state.syncIssue) { state.syncIssue = false; emit(); }
      state.cloudOk = true;
      return true;
    } catch (error) {
      console.warn("[lesson-tracker] cloud push failed; kept in this browser only.", error);
      state.syncIssue = true;
      emit();
      return false;
    }
  }

  function persistLocal() {
    if (demoMode) writeDemoDataset();
    else writeMirror();
  }

  /* ------------------------------------------------------------ loading */

  async function loadRealData() {
    const mirror = readMirror();
    let cloud = null;
    try {
      cloud = await loadCloudDataset();
      state.cloudOk = true;
      state.syncIssue = false;
    } catch (error) {
      console.warn("[lesson-tracker] cloud load failed; opening from this browser's copy.", error);
      state.cloudOk = false;
      state.syncIssue = true;
    }
    if (cloud) {
      state.dataset = mergeDatasets(cloud, mirror, mirror.lastFullSync || 0);
      writeMirror();
      // Push merged winners back so both sides converge (PLAN §2.2).
      const jobs = [];
      Object.values(state.dataset.students).forEach((student) => jobs.push(() => pushStudent(student)));
      Object.entries(state.dataset.courses).forEach(([studentId, byCourse]) => {
        Object.values(byCourse).forEach((doc) => jobs.push(() => pushCourseDoc(studentId, doc)));
      });
      jobs.push(() => pushMeta());
      let allOk = true;
      for (const job of jobs) {
        try { await job(); } catch (error) { allOk = false; }
      }
      if (allOk) {
        state.dataset.lastFullSync = Date.now();
        state.syncIssue = false;
        writeMirror();
      } else {
        state.syncIssue = true;
      }
    } else {
      state.dataset = mirror;
    }
    emit();
  }

  /* --------------------------------------------------------- mutations */
  /* Every mutation: apply to the merged in-memory dataset, persist the
     local copy, then push the affected docs to the cloud.             */

  function datasetOrThrow() {
    assertTeacher();
    if (!state.dataset) {
      const error = new Error("Tracker data is not loaded yet.");
      error.code = "tracker/not-loaded";
      throw error;
    }
    return state.dataset;
  }

  function getStudent(studentId) {
    const dataset = datasetOrThrow();
    const student = dataset.students[studentId];
    if (!student) throw new Error("Student not found.");
    return student;
  }

  function getCourseDoc(studentId, courseId, create = false) {
    const dataset = datasetOrThrow();
    dataset.courses[studentId] = dataset.courses[studentId] || {};
    if (!dataset.courses[studentId][courseId] && create) {
      dataset.courses[studentId][courseId] = emptyCourseDoc(courseId);
    }
    return dataset.courses[studentId][courseId] || null;
  }

  const api = {
    async getDataset() {
      return clone(datasetOrThrow());
    },

    async listStudents() {
      const dataset = datasetOrThrow();
      return Object.values(dataset.students).map((student) => {
        const byCourse = dataset.courses[student.id] || {};
        const enrolments = Object.keys(byCourse);
        const latestTickByCourse = {};
        enrolments.forEach((courseId) => { latestTickByCourse[courseId] = latestTickDate(byCourse[courseId]); });
        let latestTick = "";
        Object.values(latestTickByCourse).forEach((date) => { if (date > latestTick) latestTick = date; });
        return { ...clone(student), enrolments, latestTickByCourse, latestTick };
      });
    },

    async getCourseDoc(studentId, courseId) {
      datasetOrThrow();
      return clone(getCourseDoc(studentId, courseId, false));
    },

    async findDuplicates(name) {
      const dataset = datasetOrThrow();
      const wanted = normName(name);
      if (!wanted) return [];
      return Object.values(dataset.students).filter((student) => normName(student.name) === wanted).map((s) => ({ ...clone(s), enrolments: Object.keys(dataset.courses[s.id] || {}) }));
    },

    async addStudent(fields) {
      const dataset = datasetOrThrow();
      const now = Date.now();
      const student = createStudent(fields, now);
      if (!student.name) throw new Error("A student name is required.");
      dataset.students[student.id] = student;
      if (fields.courseId) {
        dataset.courses[student.id] = { [fields.courseId]: emptyCourseDoc(fields.courseId) };
      }
      persistLocal();
      await cloudPush(async () => {
        await pushStudent(student);
        if (fields.courseId) await pushCourseDoc(student.id, dataset.courses[student.id][fields.courseId]);
      });
      return clone(student);
    },

    async updateStudent(studentId, fields) {
      const dataset = datasetOrThrow();
      const student = getStudent(studentId);
      if (fields.name !== undefined) student.name = String(fields.name || "").trim();
      if (fields.phone !== undefined) student.phone = String(fields.phone || "").trim();
      if (fields.note !== undefined) student.note = capNote(fields.note || "");
      if (!student.name) throw new Error("A student name is required.");
      student.editedAt = Date.now();
      persistLocal();
      await cloudPush(() => pushStudent(student));
      return clone(student);
    },

    async setArchived(studentId, archived) {
      const dataset = datasetOrThrow();
      const student = getStudent(studentId);
      student.archived = Boolean(archived);
      student.editedAt = Date.now();
      persistLocal();
      await cloudPush(() => pushStudent(student));
      return clone(student);
    },

    async deleteStudent(studentId) {
      const dataset = datasetOrThrow();
      const student = getStudent(studentId);
      const now = Date.now();
      const courseIds = Object.keys(dataset.courses[studentId] || {});
      delete dataset.students[studentId];
      delete dataset.courses[studentId];
      dataset.rosterTombstones[studentId] = { updatedAt: now };
      persistLocal();
      await cloudPush(async () => {
        // Real deletion: course docs one by one, then the student doc
        // (the deleteExam precedent), with the tombstone kept in _meta.
        for (const courseId of courseIds) {
          await fire.f().deleteDoc(fire.ref("teacher_students", studentId, "courses", courseId));
        }
        await fire.f().deleteDoc(fire.ref("teacher_students", studentId));
        await pushMeta();
      });
      return { id: studentId, name: student.name };
    },

    async enrolCourse(studentId, courseId) {
      const dataset = datasetOrThrow();
      getStudent(studentId);
      const doc = getCourseDoc(studentId, courseId, true);
      persistLocal();
      await cloudPush(() => pushCourseDoc(studentId, doc));
      return clone(doc);
    },

    async removeCourse(studentId, courseId) {
      const dataset = datasetOrThrow();
      getStudent(studentId);
      const doc = getCourseDoc(studentId, courseId, false);
      if (!doc) return false;
      if (Object.keys(doc.ticks || {}).length || Object.keys(doc.tombstones || {}).length) {
        throw new Error("Only a course with no lesson records can be removed.");
      }
      delete dataset.courses[studentId][courseId];
      persistLocal();
      await cloudPush(() => fire.f().deleteDoc(fire.ref("teacher_students", studentId, "courses", courseId)));
      return true;
    },

    async setTick(studentId, courseId, topic, data) {
      const dataset = datasetOrThrow();
      getStudent(studentId);
      const current = getCourseDoc(studentId, courseId, true);
      const existing = (current.ticks || {})[topic] || {};
      const next = applyTick(current, topic, {
        date: data.date || existing.date || cairoToday(),
        hw: data.hw !== undefined ? data.hw : Boolean(existing.hw),
        note: data.note !== undefined ? data.note : (existing.note || "")
      }, Date.now());
      next.courseId = courseId;
      dataset.courses[studentId][courseId] = next;
      persistLocal();
      await cloudPush(() => pushCourseDoc(studentId, next));
      return clone(next);
    },

    async clearTick(studentId, courseId, topic) {
      const dataset = datasetOrThrow();
      getStudent(studentId);
      const current = getCourseDoc(studentId, courseId, true);
      const next = applyUntick(current, topic, Date.now());
      next.courseId = courseId;
      dataset.courses[studentId][courseId] = next;
      persistLocal();
      await cloudPush(() => pushCourseDoc(studentId, next));
      return clone(next);
    }
  };

  /* --------------------------------------------------------------- auth */

  const demoStore = {
    async init() {
      state.user = demoUser();
      state.ready = true;
      if (isTeacher()) {
        state.dataset = readDemoDataset();
        state.cloudOk = false;
      }
      emit();
    },
    async signIn(email) {
      const address = normEmail(email || (root.prompt ? root.prompt("Demo mode: sign in as which email?", teacherEmails()[0] || "") : ""));
      if (!address) return;
      lsSet(DEMO_USER_KEY, address);
      state.user = demoUser();
      if (isTeacher()) state.dataset = readDemoDataset();
      else state.dataset = null;
      emit();
    },
    async signOut() {
      lsRemove(DEMO_USER_KEY);
      state.user = null;
      state.dataset = null;
      emit();
    }
  };

  const fireStoreAuth = {
    async init() {
      try {
        const modules = await fire.load();
        const existing = modules.app.getApps().find((app) => app.name === APP_NAME);
        const firebaseApp = existing || modules.app.initializeApp(firebaseCfg.config, APP_NAME);
        state.auth = modules.auth.getAuth(firebaseApp);
        state.db = modules.firestore.getFirestore(firebaseApp);
        await modules.auth.getRedirectResult(state.auth).catch(() => null);
        modules.auth.onAuthStateChanged(state.auth, async (user) => {
          state.user = user;
          state.ready = true;
          if (isTeacher(user)) {
            await loadRealData();
          } else {
            // PLAN §2.3: the mirror is written only after the gate
            // passes; any observed non-teacher / signed-out state
            // clears both local keys before anything renders.
            state.dataset = null;
            clearLocalCopies();
          }
          emit();
        });
      } catch (error) {
        // Sign-in could not start (e.g. no network for the SDK). This is
        // NOT an observed sign-out, so the mirror is left untouched -
        // it is simply never read or rendered while the gate has not
        // passed (PLAN §2.3 covers observed auth changes and loads
        // where the gate fails, both handled in the callback above).
        state.error = error.message || "Sign-in could not start. Check the connection.";
        state.ready = true;
        state.dataset = null;
        emit();
      }
    },
    async signIn() {
      const provider = new state.modules.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      try {
        await state.modules.auth.signInWithPopup(state.auth, provider);
      } catch (error) {
        if (String(error.code || "").includes("popup")) {
          await state.modules.auth.signInWithRedirect(state.auth, provider);
          return;
        }
        throw error;
      }
    },
    async signOut() {
      await state.modules.auth.signOut(state.auth);
    }
  };

  const auth = demoMode ? demoStore : fireStoreAuth;

  function friendlyError(error) {
    const code = String((error && error.code) || "");
    if (code.includes("permission-denied")) {
      return "The database refused this action. The tracker keeps working in this browser; for cloud sync, the Firestore rules step in the setup notes must be published.";
    }
    if (code.includes("teacher-only")) return "This page is for the teacher account only.";
    if (code.includes("unavailable") || code.includes("network")) return "No connection. Changes are kept in this browser and will sync later.";
    return (error && error.message) || "Something went wrong. Try again.";
  }

  root.EliteLessonTracker = {
    demo: demoMode,
    core: Core,
    init: () => auth.init(),
    onChange,
    isTeacher: () => isTeacher(),
    user: () => state.user,
    signIn: (...args) => auth.signIn(...args),
    signOut: () => auth.signOut(),
    clearLocalCopies,
    friendlyError,
    api
  };
})(window);
