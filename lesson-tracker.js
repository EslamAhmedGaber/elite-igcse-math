/* ==========================================================================
   lesson-tracker.js - Elite IGCSE Teacher Lesson Tracker data layer.
   Spec: tracker-plan/PLAN_FINAL.md (PLAN v2 + Audit 2 fixes N1-N8).

   Firestore layout (rules pinned to the teacher email - see PLAN §0.5/§6):
     teacher_students/{studentId}            name, phone (mirror of
                                              phones[0]), phones[{number,
                                              label}] (max 3), groupName,
                                              groupWhatsApp, note, archived,
                                              createdAt, editedAt (client ms)
     teacher_students/_meta                  rosterTombstones {id: {updatedAt}},
                                              settings {ownerPhone,
                                              studentTemplate, forwardTemplate,
                                              reminderTemplate + LWW clocks},
                                              groupAssignments
                                              {groupKey: {courseId: {id: record}}}
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
  /* Demo seed versioning (ASSIGNMENT_PLAN §24): the demo dataset
     stored under DEMO_KEY carries its seed version as a top-level
     `seedVersion` field. The unversioned original seed is implicitly
     v1. BUMP THIS CONSTANT whenever seedDemoDataset's content
     changes; a stored demo dataset whose version is missing or
     different is discarded and re-seeded on the next demo load
     (demo data is disposable by design, so re-seeding preserves
     nothing). Real datasets never carry the field (emptyDataset
     is unchanged) and the migration only ever reads/writes
     DEMO_KEY. */
  const DEMO_SEED_VERSION = 3;
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

  const CAIRO_DATE_FMT = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit"
  });

  function cairoToday(now = new Date()) {
    return CAIRO_DATE_FMT.format(now);
  }

  /* The Cairo YYYY-MM-DD of an arbitrary instant (an ISO string or
     ms). Follow-up stamps are ISO instants in UTC and Cairo is
     UTC+2/+3, so the ISO string's own date part is the wrong day
     for early-morning events - always go through the formatter.
     Unparseable input yields "" rather than throwing. */
  function cairoDateOf(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return CAIRO_DATE_FMT.format(date);
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

  function emptySettings() {
    return { ownerPhone: "", ownerUpdatedAt: 0, studentTemplate: "", forwardTemplate: "", reminderTemplate: "", templatesUpdatedAt: 0 };
  }

  function emptyDataset() {
    return { students: {}, courses: {}, rosterTombstones: {}, settings: emptySettings(), groupAssignments: {}, lastFullSync: 0 };
  }

  function emptyCourseDoc(courseId) {
    return { courseId, ticks: {}, tombstones: {}, assignments: {}, updatedAt: 0 };
  }

  function createStudent(fields, now) {
    const phones = sanitizePhones(fields.phones, fields.phone);
    return {
      id: genId("stu"),
      name: String(fields.name || "").trim(),
      phone: phoneMirror(phones),
      phones,
      groupName: cleanGroupName(fields.groupName || ""),
      groupWhatsApp: cleanGroupLink(fields.groupWhatsApp || ""),
      note: capNote(fields.note || ""),
      nextSession: cleanSessionDate(fields.nextSession || ""),
      archived: false,
      createdAt: now,
      editedAt: now
    };
  }

  /* WhatsApp group invite links become href/window.open targets from
     stored data, so they are a security boundary (audit W6): only the
     real invite shape is accepted. cleanGroupLink throws (form/API
     boundary, like cleanSessionDate); safeGroupLink is the sanitizer
     wrapper that drops a bad value to "" instead of killing an import. */
  function cleanGroupLink(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    if (!/^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9_-]{6,}$/.test(text)) {
      throw new Error("That does not look like a WhatsApp group invite link (https://chat.whatsapp.com/...).");
    }
    return text;
  }

  function safeGroupLink(value) {
    try { return cleanGroupLink(value); } catch (error) { return ""; }
  }

  function cleanGroupName(value) {
    return String(value || "").trim().slice(0, 80);
  }

  /* Up to 3 labelled numbers per student (owner decision 2026-11-26).
     `phones` is the source of truth; the legacy single `phone` string
     is kept as a mirror of the first entry so every existing reader
     (parent report, homework follow-ups, dashboard) keeps working,
     and old data or backups carrying only `phone` migrate to a
     single "Student" entry. Labels are Student / Mother / Father or
     free text, capped at 24 chars. */
  const PHONE_CAP = 3;
  const PHONE_LABELS = ["Student", "Mother", "Father", "Other"];

  function sanitizePhones(rawPhones, legacyPhone) {
    const out = [];
    if (Array.isArray(rawPhones)) {
      rawPhones.forEach((entry) => {
        if (!entry || typeof entry !== "object") return;
        const number = String(entry.number || "").trim().slice(0, 32);
        if (!number) return;
        const label = String(entry.label || "").trim().slice(0, 24) || "Student";
        out.push({ number, label });
      });
    }
    if (!out.length) {
      const legacy = String(legacyPhone || "").trim().slice(0, 32);
      if (legacy) out.push({ number: legacy, label: "Student" });
    }
    return out.slice(0, PHONE_CAP);
  }

  function phoneMirror(phones) {
    return phones && phones.length ? phones[0].number : "";
  }

  /* Next-session dates are stored as "" or a real YYYY-MM-DD date.
     Anything else is rejected so overdue comparisons can trust the
     value (TRACKER_V2_PLAN audit A3). */
  function cleanSessionDate(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      throw new Error("Next-session date must look like 2026-12-01.");
    }
    const parsed = new Date(`${text}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) throw new Error("That is not a real calendar date.");
    const back = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
    if (back !== text) throw new Error("That is not a real calendar date.");
    return text;
  }

  /* ------------------------------------------------------- tick editing */

  function applyTick(courseDoc, topic, data, now) {
    const doc = clone(courseDoc) || emptyCourseDoc((courseDoc && courseDoc.courseId) || "");
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

  /* ------------------------------------- assignments (Generate assignment) */
  /* Assignment records live inside the course doc (ASSIGNMENT_PLAN §3.1).
     They are IMMUTABLE once saved (v1: re-open/re-print only), so their
     merge is a union by id - no tombstones. Forward constraint (audit
     G3): a future edit/delete must add a deletedAt/LWW field; plain
     removal would resurrect via this union. The history is capped so
     the shared Firestore doc stays far under its 1 MiB bound (F5).   */
  const ASSIGNMENT_CAP = 50;
  const ASSIGNMENT_MAX_QUESTIONS = 40;
  const ASSIGNMENT_MAX_TOPICS = 70;
  /* The print-layout keys assignment records may carry - mirrors
     paper-print.js's LAYOUTS (via assignment-generator.js's port). */
  const ASSIGNMENT_LAYOUT_KEYS = ["standard", "economy", "single", "compact"];

  /* --------------------- assignment follow-up ----------------------- */
  /* The last leg of the loop (ASSIGNMENT_PLAN §28-§32): after an
     assignment is generated and sent, the teacher tracks whether it
     came back and whether he checked it. Every record may carry
       followUp: { status, sentAt, returnedAt, checkedAt }
       followUpdatedAt: <ms>   (sibling LWW clock for the object)
     Timestamps are ISO instants (or null); the clock is a ms number
     like every other LWW clock in the tracker. An ABSENT followUp
     means open + never sent - every pre-feature record reads
     correctly with no migration. The status is DERIVED from the
     timestamps everywhere (checkedAt -> checked, returnedAt ->
     returned, else open), never trusted from storage, so imported
     or hand-edited data self-heals. */
  const FOLLOWUP_ACTIONS = ["sent", "returned", "checked"];
  const FOLLOWUP_RANK = { open: 0, returned: 1, checked: 2 };
  const ISO_INSTANT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:?\d{2})$/;

  function cleanInstant(value) {
    if (typeof value !== "string" || !ISO_INSTANT_RE.test(value)) return null;
    return Number.isNaN(Date.parse(value)) ? null : value;
  }

  function deriveFollowStatus(followUp) {
    if (followUp && followUp.checkedAt) return "checked";
    if (followUp && followUp.returnedAt) return "returned";
    return "open";
  }

  /* Sanitise a raw followUp value. Returns null when there is no
     object to keep (the field then stays ABSENT, like a
     pre-feature record). An object whose timestamps are all null
     SURVIVES: un-marking back to open is meaningful data that must
     be able to win a merge (§28.2). */
  function sanitizeFollowUp(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const followUp = {
      status: "open",
      sentAt: cleanInstant(raw.sentAt),
      returnedAt: cleanInstant(raw.returnedAt),
      checkedAt: cleanInstant(raw.checkedAt)
    };
    followUp.status = deriveFollowStatus(followUp);
    return followUp;
  }

  /* The record's normalized followUp: the sanitized stored object,
     or the open/unsent default when the field is absent. */
  function followUpOf(record) {
    const clean = sanitizeFollowUp(record && record.followUp);
    return clean || { status: "open", sentAt: null, returnedAt: null, checkedAt: null };
  }

  /* The follow-up state machine (§28.3). Pure: returns a NEW record
     (the input is never mutated) with followUpdatedAt = now.
       "sent"     - stamp sentAt; FIRST CLICK ONLY: an already-sent
                    record is returned unchanged (same object, no
                    clock bump, so a re-click can never win a merge
                    over a real state change). The return ladder is
                    untouched - sent is orthogonal to it.
       "returned" - toggle: open -> returned (stamp returnedAt),
                    returned -> open (clear returnedAt),
                    checked -> returned (clear checkedAt, keep
                    returnedAt). Backwards is one step at a time.
       "checked"  - toggle: checked -> returned (clear checkedAt),
                    returned -> checked (stamp checkedAt),
                    open -> checked (stamp returnedAt if missing,
                    stamp checkedAt). Checked implies returned.
     Unknown actions throw - the API boundary is strict, like
     saveAssignment. */
  function applyFollowUp(record, action, now) {
    if (!FOLLOWUP_ACTIONS.includes(action)) throw new Error(`Unknown follow-up action: ${action}`);
    const stamp = new Date(now).toISOString();
    const current = followUpOf(record);
    if (action === "sent") {
      if (current.sentAt) return record;
      const next = clone(record);
      next.followUp = { ...current, sentAt: stamp };
      next.followUpdatedAt = now;
      return next;
    }
    const next = clone(record);
    const followUp = { ...current };
    if (action === "returned") {
      if (followUp.status === "open") { followUp.status = "returned"; followUp.returnedAt = stamp; }
      else if (followUp.status === "returned") { followUp.status = "open"; followUp.returnedAt = null; }
      else { followUp.status = "returned"; followUp.checkedAt = null; }
    } else { // "checked"
      if (followUp.status === "checked") { followUp.status = "returned"; followUp.checkedAt = null; }
      else if (followUp.status === "returned") { followUp.status = "checked"; followUp.checkedAt = stamp; }
      else { followUp.status = "checked"; followUp.returnedAt = followUp.returnedAt || stamp; followUp.checkedAt = stamp; }
    }
    next.followUp = followUp;
    next.followUpdatedAt = now;
    return next;
  }

  /* Merge two copies of one record's follow-up (§28.4). The ladder
     state (status/returnedAt/checkedAt + the clock) comes from the
     side with the greater followUpdatedAt; an absent followUp
     counts as -1, so any explicit state beats none; ties go to the
     more advanced derived status. EXCEPTION: sentAt is the
     earliest non-null across both copies, always - it is
     append-only in the whole design (never cleared, never
     overwritten), so earliest-non-null is correct even when the
     clock winner is a stale copy that never saw the send.
     Returns { followUp, followUpdatedAt } or null when neither
     side carries a followUp. */
  function mergeFollowUp(cloudRecord, mirrorRecord) {
    const cHas = Boolean(sanitizeFollowUp(cloudRecord && cloudRecord.followUp));
    const mHas = Boolean(sanitizeFollowUp(mirrorRecord && mirrorRecord.followUp));
    if (!cHas && !mHas) return null;
    const cClock = cHas ? Math.max(0, Math.floor(Number(cloudRecord.followUpdatedAt) || 0)) : -1;
    const mClock = mHas ? Math.max(0, Math.floor(Number(mirrorRecord.followUpdatedAt) || 0)) : -1;
    const cFu = cHas ? followUpOf(cloudRecord) : null;
    const mFu = mHas ? followUpOf(mirrorRecord) : null;
    let winner;
    if (cClock !== mClock) winner = cClock > mClock ? cFu : mFu;
    else {
      const cRank = cFu ? FOLLOWUP_RANK[cFu.status] : -1;
      const mRank = mFu ? FOLLOWUP_RANK[mFu.status] : -1;
      winner = mRank > cRank ? mFu : cFu; // cloud wins an exact tie
    }
    const followUp = { ...winner };
    const sentStamps = [cFu && cFu.sentAt, mFu && mFu.sentAt].filter(Boolean);
    if (sentStamps.length) {
      followUp.sentAt = sentStamps.reduce((earliest, s) => (Date.parse(s) < Date.parse(earliest) ? s : earliest));
    }
    return { followUp, followUpdatedAt: Math.max(cClock, mClock, 0) };
  }

  /* Display state for the history chip (§28.7/§30.4): the key plus
     the stamps' CAIRO dates (YYYY-MM-DD or ""). "awaiting" is the
     open-but-sent state; a plain open record was never sent. */
  function followUpState(record) {
    const followUp = followUpOf(record);
    const key = followUp.status !== "open" ? followUp.status : (followUp.sentAt ? "awaiting" : "open");
    return {
      key,
      sentDate: followUp.sentAt ? cairoDateOf(followUp.sentAt) : "",
      returnedDate: followUp.returnedAt ? cairoDateOf(followUp.returnedAt) : "",
      checkedDate: followUp.checkedAt ? cairoDateOf(followUp.checkedAt) : ""
    };
  }

  /* Dashboard model (§28.8): assignments that were SENT and have
     not come back - normalized status open AND sentAt set. Scans
     ACTIVE students' course docs (the dashboard's standing rule)
     plus every group bucket. Oldest sent first. Rows carry the
     sanitized record clone so the UI can rebuild the share link
     and the reminder text without touching the dataset. */
  function awaitingReturn(dataset, todayStr) {
    const rows = [];
    const pushRow = (base, record) => {
      const followUp = followUpOf(record);
      if (followUp.status !== "open" || !followUp.sentAt) return;
      const sentDate = cairoDateOf(followUp.sentAt);
      const waiting = daysBetween(sentDate, todayStr);
      rows.push({
        ...base,
        recordId: record.id,
        record: clone(record),
        date: record.date || "",
        sentAt: followUp.sentAt,
        sentDate,
        daysWaiting: waiting === null ? 0 : Math.max(0, waiting),
        count: (record.questionIds || []).length
      });
    };
    Object.values((dataset && dataset.students) || {}).forEach((student) => {
      if (student.archived) return;
      const byCourse = (dataset.courses && dataset.courses[student.id]) || {};
      Object.entries(byCourse).forEach(([courseId, doc]) => {
        Object.values((doc && doc.assignments) || {}).forEach((record) => {
          pushRow({
            kind: "student",
            studentId: student.id,
            name: student.name,
            groupName: student.groupName || "",
            courseId,
            phone: student.phone || ""
          }, record);
        });
      });
    });
    Object.entries((dataset && dataset.groupAssignments) || {}).forEach(([groupKey, byCourse]) => {
      Object.entries(byCourse || {}).forEach(([courseId, map]) => {
        Object.values(map || {}).forEach((record) => {
          pushRow({
            kind: "group",
            name: (record.audience && record.audience.groupName) || groupKey,
            groupName: (record.audience && record.audience.groupName) || groupKey,
            courseId,
            phone: ""
          }, record);
        });
      });
    });
    rows.sort((a, b) => (Date.parse(a.sentAt) - Date.parse(b.sentAt)) || String(a.name).localeCompare(String(b.name)));
    return rows;
  }

  function sanitizeAssignmentRecord(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const id = typeof raw.id === "string" ? raw.id.slice(0, 80) : "";
    if (!id) return null;
    if (!Array.isArray(raw.questionIds)) return null;
    const questionIds = raw.questionIds
      .filter((value) => typeof value === "string" && value.length > 0)
      .map((value) => value.slice(0, 200))
      .slice(0, ASSIGNMENT_MAX_QUESTIONS);
    if (!questionIds.length) return null;
    const topics = Array.isArray(raw.topics)
      ? raw.topics.filter((value) => typeof value === "string" && value.length > 0).map((value) => value.slice(0, 120)).slice(0, ASSIGNMENT_MAX_TOPICS)
      : [];
    const date = typeof raw.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : "";
    const nonNeg = (value) => Math.max(0, Math.floor(Number(value) || 0));
    /* Print layout (assignment-generator's port of paper-print.js's
       LAYOUTS keys). Only a known key is kept; anything else leaves
       the field ABSENT, exactly like a v1 record that predates the
       field - re-printing resolves a missing layout to the current
       default ("single") in assignment-generator.js. */
    const layout = ASSIGNMENT_LAYOUT_KEYS.includes(raw.layout) ? raw.layout : null;
    /* Audience (WhatsApp distribution): absent = a student record. A
       group record carries { type: "group", groupName } and lives in
       dataset.groupAssignments, never in a course doc (audit W1).
       Anything that is not exactly that shape is dropped. */
    const audience = (raw.audience && typeof raw.audience === "object" && !Array.isArray(raw.audience)
      && raw.audience.type === "group" && typeof raw.audience.groupName === "string" && raw.audience.groupName.trim())
      ? { type: "group", groupName: raw.audience.groupName.trim().slice(0, 80) }
      : null;
    /* Origin (Finish & send homework): "session" marks a record
       generated from today's ticked topics at the end of a session;
       sessionDate is that session's Cairo date. Only the exact
       "session" value is kept, and sessionDate only alongside it -
       anything else leaves both fields ABSENT, exactly like a
       record that predates the feature. */
    const origin = raw.origin === "session" ? "session" : null;
    const sessionDate = origin && typeof raw.sessionDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.sessionDate)
      ? raw.sessionDate
      : null;
    /* Follow-up (assignment follow-up, §28.2): kept only when a
       followUp object survives sanitizeFollowUp; the sibling LWW
       clock rides with it and is dropped without it. */
    const followUp = sanitizeFollowUp(raw.followUp);
    const followUpdatedAt = followUp ? Math.max(0, Math.floor(Number(raw.followUpdatedAt) || 0)) : null;
    /* Recency plan (2026-11-27): questions per topic as generated,
       and the weighting used. Absent on older records. */
    let plan = null;
    if (raw.plan && typeof raw.plan === "object" && !Array.isArray(raw.plan)) {
      plan = {};
      Object.entries(raw.plan).slice(0, ASSIGNMENT_MAX_TOPICS).forEach(([topic, value]) => {
        const n = Math.floor(Number(value) || 0);
        if (topic && n > 0) plan[String(topic).slice(0, 120)] = Math.min(ASSIGNMENT_MAX_QUESTIONS, n);
      });
      if (!Object.keys(plan).length) plan = null;
    }
    const weighting = raw.weighting === "recent" || raw.weighting === "even" ? raw.weighting : null;
    return {
      id,
      createdAt: nonNeg(raw.createdAt),
      date,
      topics,
      ...(plan ? { plan } : {}),
      ...(weighting ? { weighting } : {}),
      questionIds,
      count: nonNeg(raw.count) || questionIds.length,
      targetMarks: nonNeg(raw.targetMarks),
      totalMarks: nonNeg(raw.totalMarks),
      estMinutes: nonNeg(raw.estMinutes),
      includeEP: Boolean(raw.includeEP),
      ...(layout ? { layout } : {}),
      ...(audience ? { audience } : {}),
      ...(origin ? { origin, sessionDate: sessionDate || "" } : {}),
      ...(followUp ? { followUp, followUpdatedAt } : {})
    };
  }

  /* Sanitise a whole assignments map; malformed records are DROPPED
     (imports never throw on one bad record - audit G5). */
  function sanitizeAssignmentMap(raw) {
    const out = {};
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
    Object.values(raw).forEach((value) => {
      const record = sanitizeAssignmentRecord(value);
      if (record) out[record.id] = record;
    });
    return out;
  }

  function mergeAssignments(cloudMap, mirrorMap) {
    const merged = {};
    const ids = new Set([...Object.keys(cloudMap || {}), ...Object.keys(mirrorMap || {})]);
    ids.forEach((id) => {
      const c = cloudMap && cloudMap[id];
      const m = mirrorMap && mirrorMap[id];
      const winner = (c && m) ? ((m.createdAt || 0) > (c.createdAt || 0) ? m : c) : (c || m);
      if (!winner) return;
      const record = clone(winner);
      /* Follow-up is the one mutable part of an otherwise immutable
         record, so it merges on its own clock (mergeFollowUp) and
         overlays the content winner - a createdAt pick alone would
         lose whichever side marked/sent most recently. */
      if (c && m) {
        const follow = mergeFollowUp(c, m);
        if (follow) {
          record.followUp = follow.followUp;
          record.followUpdatedAt = follow.followUpdatedAt;
        } else {
          delete record.followUp;
          delete record.followUpdatedAt;
        }
      }
      merged[id] = record;
    });
    return merged;
  }

  /* Add a record to a course doc (returns a new doc), pruning the
     history to the newest ASSIGNMENT_CAP records by createdAt. */
  function applyAssignment(courseDoc, record, now) {
    const doc = clone(courseDoc) || emptyCourseDoc("");
    doc.assignments = { ...(doc.assignments || {}) };
    doc.assignments[record.id] = clone(record);
    const ids = Object.keys(doc.assignments);
    if (ids.length > ASSIGNMENT_CAP) {
      ids.sort((a, b) => (doc.assignments[a].createdAt || 0) - (doc.assignments[b].createdAt || 0));
      ids.slice(0, ids.length - ASSIGNMENT_CAP).forEach((id) => { delete doc.assignments[id]; });
    }
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
      // Assignments ride the same doc (F1): union-merged here too, or
      // a cloud+mirror merge would silently drop the history.
      assignments: mergeAssignments(sanitizeAssignmentMap(cloudDoc.assignments), sanitizeAssignmentMap(mirrorDoc.assignments)),
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

    // Sharing settings: per-field-group LWW (audit W8); group
    // assignments: union per (group, course) bucket (audit W1).
    merged.settings = mergeSettings(cloud.settings, mirror.settings);
    merged.groupAssignments = mergeGroupAssignments(cloud.groupAssignments, mirror.groupAssignments);

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

  /* --------------------- sharing: settings + message templates ------ */
  /* Tracker settings live at the dataset root and sync through the
     _meta Firestore doc beside rosterTombstones. Two independent LWW
     clocks (audit W8): the owner's own WhatsApp number (edited inline
     from the share panel) and the message templates (edited together
     in the settings form) must never roll each other back. An empty
     stored template means "use the built-in default" - the defaults
     live in code, so Reset is just saving empty strings. There is NO
     assistant setting (owner decision 2026-11-26): he forwards group
     assignments himself from his own number. */
  const TEMPLATE_CAP = 1000;
  const DEFAULT_STUDENT_TEMPLATE = "أهلاً {student}، ده الـ assignment بتاعك لمادة {course} — المواضيع: {topics}. افتحه من هنا: {link}";
  const DEFAULT_FORWARD_TEMPLATE = "الـ assignment بتاع {student} — جروب {group} — {course} — المواضيع: {topics} — {link}";
  const DEFAULT_REMINDER_TEMPLATE = "أهلاً {student}، بفكّرك بالـ assignment بتاع {course} ({topics}) اللي بعتّه لك يوم {date} — لسه ما وصلنيش الحل بتاعه. لما تخلّصه ابعته لي على طول. اللينك: {link}";
  const TEMPLATE_KEYS = ["student", "group", "course", "topics", "link", "date"];
  /* The site's published contact number is the out-of-the-box value
     for "WhatsApp to me"; an empty stored ownerPhone means this. */
  const OWNER_PHONE_DEFAULT = "201120009622";

  function sanitizeSettings(raw) {
    const out = emptySettings();
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
    out.ownerPhone = String(raw.ownerPhone || "").trim().slice(0, 32);
    out.ownerUpdatedAt = Number(raw.ownerUpdatedAt) || 0;
    out.studentTemplate = typeof raw.studentTemplate === "string" ? raw.studentTemplate.slice(0, TEMPLATE_CAP) : "";
    out.forwardTemplate = typeof raw.forwardTemplate === "string" ? raw.forwardTemplate.slice(0, TEMPLATE_CAP) : "";
    out.reminderTemplate = typeof raw.reminderTemplate === "string" ? raw.reminderTemplate.slice(0, TEMPLATE_CAP) : "";
    out.templatesUpdatedAt = Number(raw.templatesUpdatedAt) || 0;
    return out;
  }

  function mergeSettings(cloudRaw, mirrorRaw) {
    const c = sanitizeSettings(cloudRaw);
    const m = sanitizeSettings(mirrorRaw);
    const out = emptySettings();
    const phoneWin = (m.ownerUpdatedAt || 0) > (c.ownerUpdatedAt || 0) ? m : c;
    out.ownerPhone = phoneWin.ownerPhone;
    out.ownerUpdatedAt = Math.max(c.ownerUpdatedAt || 0, m.ownerUpdatedAt || 0);
    const tplWin = (m.templatesUpdatedAt || 0) > (c.templatesUpdatedAt || 0) ? m : c;
    out.studentTemplate = tplWin.studentTemplate;
    out.forwardTemplate = tplWin.forwardTemplate;
    out.reminderTemplate = tplWin.reminderTemplate;
    out.templatesUpdatedAt = Math.max(c.templatesUpdatedAt || 0, m.templatesUpdatedAt || 0);
    return out;
  }

  /* The number "WhatsApp to me" sends to: the saved one, else the
     site's published contact number. */
  function effectiveOwnerPhone(settings) {
    const s = sanitizeSettings(settings);
    return s.ownerPhone || OWNER_PHONE_DEFAULT;
  }

  /* The effective template for a kind ("student" | "forward" |
     "reminder"): the stored text when non-empty after trim, else
     the code default. Unknown kinds fall through to "student",
     exactly as the two-kind version behaved. */
  function templateOrDefault(settings, kind) {
    const s = sanitizeSettings(settings);
    const stored = kind === "forward" ? s.forwardTemplate
      : kind === "reminder" ? s.reminderTemplate
      : s.studentTemplate;
    if (stored.trim()) return stored;
    return kind === "forward" ? DEFAULT_FORWARD_TEMPLATE
      : kind === "reminder" ? DEFAULT_REMINDER_TEMPLATE
      : DEFAULT_STUDENT_TEMPLATE;
  }

  /* Dumb and safe by design (audit W7): only the six known {keys} are
     substituted; unknown placeholders pass through literally. Values
     are plain text destined for a wa.me text param or the clipboard. */
  function renderTemplate(template, values) {
    const vals = values || {};
    return String(template || "").replace(/\{([a-z]+)\}/g, (match, key) => {
      if (!TEMPLATE_KEYS.includes(key)) return match;
      const value = vals[key];
      return value === undefined || value === null ? "" : String(value);
    });
  }

  function templateHasLink(template) {
    return String(template || "").includes("{link}");
  }

  /* --------------------------- group assignments -------------------- */
  /* Group records cannot live in a course doc: mergeDatasets only
     merges docs of surviving students, so a group pseudo-enrolment
     would be silently dropped (audit W1, the F1 lesson). They sit at
     the dataset root keyed by normName(groupName) then courseId,
     union-merged exactly like per-enrolment assignments, and sync
     through the _meta doc. */
  function sanitizeGroupAssignments(raw) {
    const out = {};
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
    Object.entries(raw).forEach(([groupKey, byCourse]) => {
      const key = String(groupKey || "").slice(0, 120);
      if (!key || !byCourse || typeof byCourse !== "object" || Array.isArray(byCourse)) return;
      const courses = {};
      Object.entries(byCourse).forEach(([courseId, rawMap]) => {
        const map = sanitizeAssignmentMap(rawMap);
        if (Object.keys(map).length) courses[String(courseId).slice(0, 40)] = map;
      });
      if (Object.keys(courses).length) out[key] = courses;
    });
    return out;
  }

  function mergeGroupAssignments(cloudRaw, mirrorRaw) {
    const cloud = sanitizeGroupAssignments(cloudRaw);
    const mirror = sanitizeGroupAssignments(mirrorRaw);
    const out = clone(cloud);
    Object.entries(mirror).forEach(([groupKey, byCourse]) => {
      out[groupKey] = out[groupKey] || {};
      Object.entries(byCourse).forEach(([courseId, map]) => {
        out[groupKey][courseId] = mergeAssignments(out[groupKey][courseId] || {}, map);
      });
    });
    return out;
  }

  /* Add a group record, pruning the bucket through the same tested
     cap logic as per-enrolment assignments (applyAssignment on a
     wrapper doc). Returns a new groupAssignments structure. */
  function applyGroupAssignment(groupAssignments, groupName, courseId, record) {
    const out = clone(groupAssignments) || {};
    const key = normName(groupName || "");
    if (!key) return out;
    out[key] = out[key] || {};
    const wrapper = { courseId, ticks: {}, tombstones: {}, assignments: out[key][courseId] || {}, updatedAt: 0 };
    out[key][courseId] = applyAssignment(wrapper, record, record.createdAt || 0).assignments;
    return out;
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

  /* Topics whose LESSON date is `dateStr` (Finish & send homework,
     ASSIGNMENT_PLAN §14-§16). A tick's `date` is the session's Cairo
     date - set explicitly by every tick path and editable per row -
     so this is lesson-date semantics; the `at`/`updatedAt` edit
     timestamps are deliberately NOT used (a lesson backfilled today
     was still taught on its own date). */
  function topicsTickedOn(ticks, dateStr) {
    if (!dateStr) return [];
    return Object.keys(ticks || {}).filter((topic) => ticks[topic] && ticks[topic].date === dateStr);
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
            at: tick.at || tick.updatedAt || 0,
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

  /* ------------------------------------------- V2: dashboard analytics */
  /* All V2 aggregations cover ACTIVE students only (audit A6) and are
     derived from existing ticks - no new stored counters. topicsByCourse
     maps courseId -> [{name, chapter}] (the UI's catalog shape).        */

  function parseDay(dateStr) {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
    const parsed = new Date(`${dateStr}T12:00:00`); // local noon: DST-proof
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function daysBetween(fromStr, toStr) {
    const from = parseDay(fromStr);
    const to = parseDay(toStr);
    if (!from || !to) return null;
    return Math.round((to.getTime() - from.getTime()) / 86400000);
  }

  /* Whole days from a tick date to today; null when there is no date. */
  function daysSince(dateStr, todayStr) {
    if (!dateStr) return null;
    return daysBetween(dateStr, todayStr);
  }

  function shiftDate(dateStr, deltaDays) {
    const base = parseDay(dateStr);
    if (!base) return dateStr;
    base.setDate(base.getDate() + deltaDays);
    return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(base.getDate()).padStart(2, "0")}`;
  }

  function enrolmentCards(dataset, topicsByCourse, todayStr) {
    const cards = [];
    Object.values(dataset.students || {}).forEach((student) => {
      if (student.archived) return;
      const byCourse = (dataset.courses && dataset.courses[student.id]) || {};
      Object.keys(byCourse).forEach((courseId) => {
        const doc = byCourse[courseId];
        const topics = topicsByCourse[courseId] || [];
        const ticks = (doc && doc.ticks) || {};
        const progress = topics.length ? progressFor(topics, ticks) : null;
        const lastDate = latestTickDate(doc);
        const since = daysSince(lastDate, todayStr);
        cards.push({
          studentId: student.id,
          name: student.name,
          phone: student.phone || "",
          courseId,
          progress,
          lastDate,
          daysSince: since,
          nextTopic: topics.length ? nextTopic(topics, ticks) : null,
          todayTopics: topicsTickedOn(ticks, todayStr),
          nextSession: student.nextSession || "",
          session: nextSessionInfo(student, todayStr),
          // Needs-attention badge: amber 7-13 days, red 14+ (plan §1.1.1)
          badge: since === null ? "new" : since >= 14 ? "red" : since >= 7 ? "amber" : ""
        });
      });
    });
    return cards;
  }

  /* Dashboard cards sorted "needs attention" first: longest since the
     last session (never taught = longest of all), then lowest progress,
     then name. */
  function dashboardCards(dataset, topicsByCourse, todayStr) {
    const cards = enrolmentCards(dataset, topicsByCourse, todayStr);
    cards.sort((a, b) => {
      const aSince = a.daysSince === null ? Infinity : a.daysSince;
      const bSince = b.daysSince === null ? Infinity : b.daysSince;
      if (aSince !== bSince) return bSince - aSince;
      const aPct = a.progress ? a.progress.pct : 0;
      const bPct = b.progress ? b.progress.pct : 0;
      if (aPct !== bPct) return aPct - bPct;
      return String(a.name).localeCompare(String(b.name));
    });
    return cards;
  }

  function dashboardStats(dataset, topicsByCourse, todayStr) {
    const students = Object.values(dataset.students || {}).filter((s) => !s.archived);
    const rows = flattenLog(dataset); // active students only, by default
    const windowStart = shiftDate(todayStr, -6);
    const sessions = new Set();
    let last7 = 0;
    rows.forEach((row) => {
      if (row.date >= windowStart && row.date <= todayStr) {
        sessions.add(`${row.studentId}|${row.date}`);
        last7++;
      }
    });
    const monthPrefix = String(todayStr || "").slice(0, 7);
    const lessonsThisMonth = rows.filter((row) => row.date && row.date.slice(0, 7) === monthPrefix).length;
    const cards = enrolmentCards(dataset, topicsByCourse, todayStr).filter((card) => card.progress);
    const avgProgress = cards.length
      ? Math.round(cards.reduce((sum, card) => sum + card.progress.pct, 0) / cards.length)
      : 0;
    return {
      activeStudents: students.length,
      sessionsLast7Days: sessions.size,
      lessonsLast7Days: last7,
      lessonsThisMonth,
      avgProgress
    };
  }

  /* Newest first: date desc, then the tick's write time, then name. */
  function activityFeed(dataset, limit = 15) {
    return flattenLog(dataset)
      .sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
        if ((b.at || 0) !== (a.at || 0)) return (b.at || 0) - (a.at || 0);
        return String(a.student).localeCompare(String(b.student));
      })
      .slice(0, limit);
  }

  /* A student is "HW pending" when their single latest tick overall
     (by date, then write time) has homework set. */
  function homeworkPending(dataset) {
    const latestByStudent = {};
    flattenLog(dataset).forEach((row) => { // active students only
      const current = latestByStudent[row.studentId];
      if (!current || row.date > current.date || (row.date === current.date && (row.at || 0) > (current.at || 0))) {
        latestByStudent[row.studentId] = row;
      }
    });
    return Object.values(latestByStudent)
      .filter((row) => row.hw)
      .map((row) => {
        const student = dataset.students[row.studentId];
        return {
          studentId: row.studentId,
          name: row.student,
          phone: (student && student.phone) || "",
          courseId: row.courseId,
          topic: row.topic,
          date: row.date
        };
      })
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : String(a.name).localeCompare(String(b.name))));
  }

  function nextSessionInfo(student, todayStr) {
    const date = (student && student.nextSession) || "";
    if (!date) return { date: "", overdue: false, daysUntil: null };
    const daysUntil = daysBetween(todayStr, date);
    return { date, overdue: daysUntil !== null && daysUntil < 0, daysUntil };
  }

  /* Parent progress report text (plan §1.1.6 + audit A9: the optional
     note is typed per report - the stored student note is never
     auto-included). */
  function buildParentReport({ student, courseLabel, topics, doc, teacherNote = "" }) {
    const ticks = (doc && doc.ticks) || {};
    const progress = progressFor(topics || [], ticks);
    const next = nextTopic(topics || [], ticks);
    const recent = Object.entries(ticks)
      .map(([topic, tick]) => ({ topic, date: tick.date || "", at: tick.at || tick.updatedAt || 0 }))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.at - a.at)))
      .slice(0, 3);
    const lines = [
      `Progress update for ${student.name}`,
      `Course: ${courseLabel}`,
      `Lessons completed: ${progress.done} of ${progress.total} (${progress.pct}%)`
    ];
    if (recent.length) {
      lines.push(`Most recent lessons: ${recent.map((row) => row.topic).join(", ")}`);
    }
    if (next) lines.push(`Next lesson: ${next}`);
    else lines.push("Course complete - every lesson has been covered.");
    if (student.nextSession) lines.push(`Next session: ${student.nextSession}`);
    const note = String(teacherNote || "").trim();
    if (note) lines.push(`Teacher note: ${note}`);
    lines.push("Elite IGCSE Mathematics - Dr Eslam Ahmed");
    return lines.join("\n");
  }

  /* ----------------------------------------- V2: backup export/import */
  /* Import is untrusted input (audit A2): rebuild the dataset field by
     field, keep only known shapes, cap notes, coerce types. Anything
     that is not an object with students/courses objects is rejected.  */

  function sanitizeTick(raw) {
    if (!raw || typeof raw !== "object") return null;
    const date = typeof raw.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : "";
    return {
      date,
      hw: Boolean(raw.hw),
      note: capNote(typeof raw.note === "string" ? raw.note : ""),
      at: Number(raw.at) || 0,
      updatedAt: Number(raw.updatedAt) || 0
    };
  }

  function sanitizeDataset(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    if (!raw.students || typeof raw.students !== "object" || Array.isArray(raw.students)) return null;
    if (raw.courses !== undefined && (typeof raw.courses !== "object" || raw.courses === null || Array.isArray(raw.courses))) return null;
    const clean = emptyDataset();
    clean.lastFullSync = Number(raw.lastFullSync) || 0;
    clean.settings = sanitizeSettings(raw.settings);
    clean.groupAssignments = sanitizeGroupAssignments(raw.groupAssignments);
    Object.entries(raw.rosterTombstones || {}).forEach(([id, tomb]) => {
      if (tomb && typeof tomb === "object") clean.rosterTombstones[id] = { updatedAt: Number(tomb.updatedAt) || 0 };
    });
    Object.entries(raw.students).forEach(([id, rawStudent]) => {
      if (!rawStudent || typeof rawStudent !== "object") return;
      const name = String(rawStudent.name || "").trim();
      if (!name) return;
      let nextSession = "";
      try { nextSession = cleanSessionDate(rawStudent.nextSession || ""); } catch (error) { nextSession = ""; }
      const phones = sanitizePhones(rawStudent.phones, rawStudent.phone);
      clean.students[id] = {
        id,
        name,
        phone: phoneMirror(phones),
        phones,
        groupName: cleanGroupName(rawStudent.groupName || ""),
        groupWhatsApp: safeGroupLink(rawStudent.groupWhatsApp || ""),
        note: capNote(typeof rawStudent.note === "string" ? rawStudent.note : ""),
        nextSession,
        archived: Boolean(rawStudent.archived),
        createdAt: Number(rawStudent.createdAt) || 0,
        editedAt: Number(rawStudent.editedAt) || 0
      };
    });
    Object.entries(raw.courses || {}).forEach(([studentId, byCourse]) => {
      if (!clean.students[studentId] || !byCourse || typeof byCourse !== "object") return;
      clean.courses[studentId] = {};
      Object.entries(byCourse).forEach(([courseId, rawDoc]) => {
        if (!rawDoc || typeof rawDoc !== "object") return;
        const doc = emptyCourseDoc(courseId);
        doc.updatedAt = Number(rawDoc.updatedAt) || 0;
        Object.entries(rawDoc.ticks || {}).forEach(([topic, rawTick]) => {
          const tick = sanitizeTick(rawTick);
          if (tick) doc.ticks[topic] = tick;
        });
        Object.entries(rawDoc.tombstones || {}).forEach(([topic, tomb]) => {
          if (tomb && typeof tomb === "object") doc.tombstones[topic] = { updatedAt: Number(tomb.updatedAt) || 0 };
        });
        doc.assignments = sanitizeAssignmentMap(rawDoc.assignments);
        clean.courses[studentId][courseId] = doc;
      });
    });
    return clean;
  }

  function exportEnvelope(dataset, exportedAt) {
    return {
      app: "elite-lesson-tracker",
      version: 1,
      exportedAt: exportedAt || new Date().toISOString(),
      dataset: clone(dataset)
    };
  }

  /* Accepts the export envelope or a bare dataset object. Returns a
     sanitised dataset, or null when the text is not a tracker backup. */
  function parseImport(text) {
    let parsed;
    try { parsed = JSON.parse(text); } catch (error) { return null; }
    if (!parsed || typeof parsed !== "object") return null;
    const raw = parsed.dataset && typeof parsed.dataset === "object" ? parsed.dataset : parsed;
    return sanitizeDataset(raw);
  }

  const Core = {
    normEmail, isTeacherEmail, teacherEmails, normName, normalisePhone,
    cairoToday, genId, capNote, emptyDataset, emptySettings, emptyCourseDoc, createStudent,
    applyTick, applyUntick, mergeCourseDoc, mergeDatasets,
    sanitizeAssignmentRecord, sanitizeAssignmentMap, mergeAssignments,
    applyAssignment, ASSIGNMENT_CAP, ASSIGNMENT_LAYOUT_KEYS,
    sanitizeFollowUp, followUpOf, applyFollowUp, mergeFollowUp,
    followUpState, awaitingReturn, FOLLOWUP_ACTIONS,
    cleanGroupLink, safeGroupLink, cleanGroupName,
    sanitizePhones, phoneMirror, PHONE_CAP, PHONE_LABELS,
    sanitizeSettings, mergeSettings, TEMPLATE_CAP, DEFAULT_STUDENT_TEMPLATE,
    DEFAULT_FORWARD_TEMPLATE, DEFAULT_REMINDER_TEMPLATE, TEMPLATE_KEYS, templateOrDefault,
    renderTemplate, templateHasLink, OWNER_PHONE_DEFAULT, effectiveOwnerPhone,
    sanitizeGroupAssignments, mergeGroupAssignments, applyGroupAssignment,
    nextTopic, progressFor, latestTickDate, topicsTickedOn, flattenLog, weekRange,
    buildDigest, unmatchedTicks, NOTE_CAP,
    cairoDateOf, cleanSessionDate, daysBetween, daysSince, dashboardCards, dashboardStats,
    activityFeed, homeworkPending, nextSessionInfo, buildParentReport,
    sanitizeDataset, exportEnvelope, parseImport
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
    syncing: false,     // a cloud load/push is in flight right now (V2)
    dataset: null,      // merged dataset (teacher only)
    dataVersion: 0,     // bumped on EVERY dataset assignment (load fix)
    initialLoad: false, // the first cloud load for this sign-in is running
    modules: null,
    auth: null,
    db: null
  };

  function isTeacher(user = state.user) {
    return Boolean(user && isTeacherEmail(user.email));
  }

  function syncState() {
    if (demoMode) return "demo";
    if (state.syncing) return "syncing";
    if (state.cloudOk && !state.syncIssue) return "cloud";
    return "local";
  }

  function snapshot() {
    return {
      ready: state.ready,
      user: state.user,
      isTeacher: isTeacher(),
      demo: demoMode,
      cloudOk: state.cloudOk,
      syncIssue: state.syncIssue,
      syncState: syncState(),
      // Load-sequence contract for the UI: `dataReady` says a dataset
      // object exists to render; `dataVersion` changes on every dataset
      // assignment, so a late-arriving dataset (mirror first, then the
      // merged cloud copy) always re-triggers a render; `loading` is
      // true while the initial cloud load is still in flight, so the UI
      // can show a loading state instead of a misleading empty one.
      dataReady: state.dataset != null,
      dataVersion: state.dataVersion,
      loading: !demoMode && state.initialLoad,
      error: state.error
    };
  }

  /* Every dataset assignment goes through here so the version bump -
     and therefore the UI re-render - can never be forgotten. */
  function assignDataset(dataset) {
    state.dataset = dataset;
    state.dataVersion += 1;
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
    const a = { id: "stu-demo-a", name: "Demo Student A", phone: "0100 123 4567", phones: [{ number: "0100 123 4567", label: "Student" }, { number: "0100 765 4321", label: "Mother" }], groupName: "Nasser Group", groupWhatsApp: "https://chat.whatsapp.com/DEMO-PLACEHOLDER", note: "Demo data - Year 11, exam June", nextSession: "", archived: false, createdAt: now - 7 * 86400000, editedAt: now - 86400000 };
    const b = { id: "stu-demo-b", name: "Demo Student B", phone: "0102 345 6789", phones: [{ number: "0102 345 6789", label: "Student" }], groupName: "Nasser Group", groupWhatsApp: "", note: "Demo data", nextSession: cairoToday(new Date(Date.now() + 86400000)), archived: false, createdAt: now - 3 * 86400000, editedAt: now - 3 * 86400000 };
    const dataset = emptyDataset();
    dataset.seedVersion = DEMO_SEED_VERSION;
    dataset.students[a.id] = a;
    dataset.students[b.id] = b;
    const docA = emptyCourseDoc("modular-2");
    docA.ticks["Prime Factors, HCF & LCM"] = { date: yesterday, hw: true, note: "Confident.", at: now - 86400000, updatedAt: now - 86400000 };
    /* Today's tick is "Percentages": the Unit 2 catalogue's
       number-work topic (the fractions/decimals/percentages strand
       itself is a Unit 1 topic in this taxonomy - a "Fractions"
       tick here would be unmatched and its Unit 2 bank pool is 0,
       which dead-ended the demo's Finish & send flow; live-test
       fix, ASSIGNMENT_PLAN §20.2). Percentages has a real Unit 2
       pool, so the session flow succeeds end-to-end in demo. */
    docA.ticks["Percentages"] = { date: today, hw: false, note: "", at: now, updatedAt: now };
    // One past assignment so the Generate-assignment history is visible
    // in demo mode. These are real bank ids from the Unit 2 "Prime
    // Factors, HCF & LCM" pool (2 marks each). It was generated and
    // SENT 3 days ago and has not come back, so the dashboard's
    // "Awaiting return" list (§28.8) has exactly one row in demo.
    const threeDaysAgo = cairoToday(new Date(Date.now() - 3 * 86400000));
    docA.assignments["asg-demo-1"] = {
      id: "asg-demo-1",
      createdAt: now - 3 * 86400000,
      date: threeDaysAgo,
      topics: ["Prime Factors, HCF & LCM"],
      questionIds: [
        "all::Jan2020_P1H__Q02__p04-04__m02__Prime-Factors-HCF-and-LCM",
        "all::Jan2021_P2H__Q09__p11-11__m02__Prime-Factors-HCF-and-LCM",
        "all::Jun2025_P1HR__Q01__p03-03__m02__Prime-Factors-HCF-and-LCM",
        "all::Jun2026_P2H__Q11-U2"
      ],
      count: 4,
      targetMarks: 0,
      totalMarks: 8,
      estMinutes: 12,
      includeEP: true,
      followUp: {
        status: "open",
        sentAt: new Date(now - 3 * 86400000).toISOString(),
        returnedAt: null,
        checkedAt: null
      },
      followUpdatedAt: now - 3 * 86400000
    };
    docA.updatedAt = now;
    dataset.courses[a.id] = { "modular-2": docA };
    // Demo B: one older lesson with homework set, so the V2 dashboard
    // shows a homework-pending entry and a next-session date.
    const docB = emptyCourseDoc("linear");
    const twoDaysAgo = cairoToday(new Date(Date.now() - 2 * 86400000));
    docB.ticks["Number Toolkit"] = { date: twoDaysAgo, hw: true, note: "", at: now - 2 * 86400000, updatedAt: now - 2 * 86400000 };
    docB.updatedAt = now - 2 * 86400000;
    dataset.courses[b.id] = { linear: docB };
    // Demo B is also enrolled in the demo group on modular-2, ticked on
    // exactly one of A's topics, so the group intersection (that one
    // topic) is visible in demo mode.
    const docB2 = emptyCourseDoc("modular-2");
    docB2.ticks["Prime Factors, HCF & LCM"] = { date: yesterday, hw: false, note: "", at: now - 2 * 86400000, updatedAt: now - 2 * 86400000 };
    docB2.updatedAt = now - 2 * 86400000;
    dataset.courses[b.id]["modular-2"] = docB2;
    // One past group assignment (same real question ids as asg-demo-1).
    // Settings stay at defaults in demo: the owner number falls back
    // to the site's published number, templates to the built-ins.
    dataset.groupAssignments = {
      "nasser group": {
        "modular-2": {
          "asg-demo-g1": {
            id: "asg-demo-g1",
            createdAt: now - 86400000,
            date: yesterday,
            topics: ["Prime Factors, HCF & LCM"],
            questionIds: [
              "all::Jan2020_P1H__Q02__p04-04__m02__Prime-Factors-HCF-and-LCM",
              "all::Jan2021_P2H__Q09__p11-11__m02__Prime-Factors-HCF-and-LCM",
              "all::Jun2025_P1HR__Q01__p03-03__m02__Prime-Factors-HCF-and-LCM",
              "all::Jun2026_P2H__Q11-U2"
            ],
            count: 4,
            targetMarks: 0,
            totalMarks: 8,
            estMinutes: 12,
            includeEP: true,
            audience: { type: "group", groupName: "Nasser Group" }
          }
        }
      }
    };
    return dataset;
  }

  function readDemoDataset() {
    const raw = lsGet(DEMO_KEY);
    /* A stored demo dataset from an older seed — or from before
       seed versioning, when seedVersion is absent — is discarded
       and re-seeded: the seed's content changed under it and the
       stored copy can never refresh itself. Demo data is
       disposable, so nothing is preserved. This runs inside
       demoStore.init()/signIn() before assignDataset/emit, so the
       UI never renders the stale copy. */
    if (!raw || raw.seedVersion !== DEMO_SEED_VERSION) {
      const seeded = seedDemoDataset();
      lsSet(DEMO_KEY, seeded);
      return seeded;
    }
    return { ...emptyDataset(), ...raw };
  }

  function writeDemoDataset() {
    if (!state.dataset) return;
    /* Stamp the current seed version on every demo write: an
       imported backup passes through sanitizeDataset /
       mergeDatasets, which rebuild from emptyDataset() and drop
       the field — without the stamp the import would be re-seeded
       away on the next load. Stamping here is safe because every
       dataset reaching this function has already passed
       readDemoDataset, which discards stale seeds, so it can never
       preserve one. */
    state.dataset.seedVersion = DEMO_SEED_VERSION;
    lsSet(DEMO_KEY, state.dataset);
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
        dataset.settings = sanitizeSettings(data.settings);
        dataset.groupAssignments = sanitizeGroupAssignments(data.groupAssignments);
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
      { courseId: doc.courseId, ticks: doc.ticks || {}, tombstones: doc.tombstones || {}, assignments: doc.assignments || {}, updatedAt: fire.f().serverTimestamp() },
      { merge: true }
    );
  }

  async function pushMeta() {
    await fire.f().setDoc(fire.ref("teacher_students", META_DOC_ID), {
      rosterTombstones: state.dataset.rosterTombstones || {},
      settings: state.dataset.settings || emptySettings(),
      groupAssignments: state.dataset.groupAssignments || {}
    }, { merge: true });
  }

  /* Push one mutation to the cloud; failure keeps the mirror copy and
     raises the sync banner instead of losing the change (PLAN §2.2). */
  async function cloudPush(job) {
    if (demoMode) return true;
    state.syncing = true;
    emit();
    try {
      await job();
      if (state.syncIssue) { state.syncIssue = false; }
      state.cloudOk = true;
      return true;
    } catch (error) {
      console.warn("[lesson-tracker] cloud push failed; kept in this browser only.", error);
      state.syncIssue = true;
      return false;
    } finally {
      state.syncing = false;
      emit();
    }
  }

  /* Push the entire merged dataset (used after an import). */
  async function pushAllDataset() {
    const jobs = [];
    Object.values(state.dataset.students).forEach((student) => jobs.push(() => pushStudent(student)));
    Object.entries(state.dataset.courses).forEach(([studentId, byCourse]) => {
      Object.values(byCourse).forEach((doc) => jobs.push(() => pushCourseDoc(studentId, doc)));
    });
    jobs.push(() => pushMeta());
    for (const job of jobs) await job();
  }

  function persistLocal() {
    if (demoMode) writeDemoDataset();
    else writeMirror();
  }

  /* ------------------------------------------------------------ loading */

  async function loadRealData() {
    const mirror = readMirror();
    // Publish the local copy FIRST (the gate has already passed - this
    // only runs for the signed-in teacher): the UI renders the mirror
    // immediately, then re-renders when the merged cloud dataset lands
    // (assignDataset bumps dataVersion on every assignment).
    assignDataset(mirror);
    state.initialLoad = true;
    let cloud = null;
    state.syncing = true;
    emit();
    try {
      cloud = await loadCloudDataset();
      state.cloudOk = true;
      state.syncIssue = false;
    } catch (error) {
      console.warn("[lesson-tracker] cloud load failed; opening from this browser's copy.", error);
      state.cloudOk = false;
      state.syncIssue = true;
    } finally {
      state.syncing = false;
    }
    if (cloud) {
      assignDataset(mergeDatasets(cloud, mirror, mirror.lastFullSync || 0));
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
    }
    // No else branch: when the cloud load failed, the mirror copy
    // assigned at the top of this function is already the dataset.
    state.initialLoad = false;
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
      if (fields.phones !== undefined) {
        student.phones = sanitizePhones(fields.phones, "");
        student.phone = phoneMirror(student.phones);
      } else if (fields.phone !== undefined) {
        student.phones = sanitizePhones(null, fields.phone);
        student.phone = phoneMirror(student.phones);
      }
      if (fields.groupName !== undefined) student.groupName = cleanGroupName(fields.groupName || "");
      if (fields.groupWhatsApp !== undefined) student.groupWhatsApp = cleanGroupLink(fields.groupWhatsApp || "");
      if (fields.note !== undefined) student.note = capNote(fields.note || "");
      if (fields.nextSession !== undefined) student.nextSession = cleanSessionDate(fields.nextSession);
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

    /* V2: optional next-session date on the student record. Rides the
       existing roster LWW merge (editedAt) and pushStudent path - no
       schema or rules change (TRACKER_V2_PLAN §1.2, audit A3). */
    async setNextSession(studentId, date) {
      const dataset = datasetOrThrow();
      const student = getStudent(studentId);
      student.nextSession = cleanSessionDate(date);
      student.editedAt = Date.now();
      persistLocal();
      await cloudPush(() => pushStudent(student));
      return clone(student);
    },

    /* V2: full backup export (teacher-only - datasetOrThrow asserts). */
    async exportAll() {
      const dataset = datasetOrThrow();
      return JSON.stringify(exportEnvelope(dataset), null, 2);
    },

    /* V2: restore a backup by MERGING it through the same per-key
       tombstone/LWW machinery as cloud<->mirror sync (audit A1). An
       older backup can never clobber a newer tick or resurrect a
       deleted student; a genuinely newer edit in the backup wins.
       `imported` must already be sanitised (Core.parseImport). */
    async importAll(imported) {
      const dataset = datasetOrThrow();
      if (!imported || typeof imported !== "object" || !imported.students) {
        throw new Error("That file is not a valid tracker backup.");
      }
      const merged = mergeDatasets(dataset, imported, dataset.lastFullSync || 0);
      assignDataset(merged);
      persistLocal();
      await cloudPush(() => pushAllDataset());
      return {
        students: Object.keys(merged.students).length,
        courses: Object.values(merged.courses).reduce((sum, byCourse) => sum + Object.keys(byCourse).length, 0)
      };
    },

    /* Save a generated assignment on the enrolment. The record is
       sanitised strictly: an invalid record THROWS (audit G5) so a
       broken generator can never write garbage into the shared doc. */
    async saveAssignment(studentId, courseId, rawRecord) {
      const dataset = datasetOrThrow();
      const record = sanitizeAssignmentRecord(rawRecord);
      if (!record) throw new Error("Invalid assignment record.");
      getStudent(studentId);
      const current = getCourseDoc(studentId, courseId, true);
      const next = applyAssignment(current, record, Date.now());
      next.courseId = courseId;
      dataset.courses[studentId][courseId] = next;
      persistLocal();
      await cloudPush(() => pushCourseDoc(studentId, next));
      return clone(next);
    },

    /* WhatsApp distribution: the owner's own number for the
       "WhatsApp to me" send option (he forwards to groups himself).
       Settings sync through the _meta doc (pushMeta) with their own
       LWW clock, independent of the templates (audit W8). An empty
       value falls back to the site's published number. */
    async setOwnerPhone(phone) {
      const dataset = datasetOrThrow();
      dataset.settings = sanitizeSettings(dataset.settings);
      dataset.settings.ownerPhone = String(phone || "").trim().slice(0, 32);
      dataset.settings.ownerUpdatedAt = Date.now();
      persistLocal();
      await cloudPush(() => pushMeta());
      return clone(dataset.settings);
    },

    /* WhatsApp distribution: editable message templates (student +
       forward-to-me + the follow-up reminder). Saving "" restores
       the built-in default (templateOrDefault). */
    async setShareTemplates(templates) {
      const dataset = datasetOrThrow();
      dataset.settings = sanitizeSettings(dataset.settings);
      if (templates && templates.student !== undefined) dataset.settings.studentTemplate = String(templates.student || "").slice(0, TEMPLATE_CAP);
      if (templates && templates.forward !== undefined) dataset.settings.forwardTemplate = String(templates.forward || "").slice(0, TEMPLATE_CAP);
      if (templates && templates.reminder !== undefined) dataset.settings.reminderTemplate = String(templates.reminder || "").slice(0, TEMPLATE_CAP);
      dataset.settings.templatesUpdatedAt = Date.now();
      persistLocal();
      await cloudPush(() => pushMeta());
      return clone(dataset.settings);
    },

    /* WhatsApp distribution: save a group assignment record. The
       record must carry a group audience; storage is the root-level
       groupAssignments map synced via _meta (audit W1). */
    async saveGroupAssignment(groupName, courseId, rawRecord) {
      const dataset = datasetOrThrow();
      const record = sanitizeAssignmentRecord(rawRecord);
      if (!record) throw new Error("Invalid assignment record.");
      if (!record.audience || record.audience.type !== "group") throw new Error("Group assignments must carry a group audience.");
      if (!normName(groupName || "")) throw new Error("A group name is required.");
      dataset.groupAssignments = applyGroupAssignment(dataset.groupAssignments, groupName, courseId, record);
      persistLocal();
      await cloudPush(() => pushMeta());
      return clone(record);
    },

    /* Assignment follow-up (§28.5): advance one record's follow-up
       state machine ("sent" | "returned" | "checked"). Strict like
       saveAssignment - an unknown record or action throws. A no-op
       transition (re-clicking a send button on an already-sent
       record) returns the record WITHOUT writing or pushing. */
    async setAssignmentFollowUp(studentId, courseId, assignmentId, action) {
      const dataset = datasetOrThrow();
      getStudent(studentId);
      const current = getCourseDoc(studentId, courseId, false);
      const existing = current && current.assignments ? current.assignments[assignmentId] : null;
      if (!existing) throw new Error("Assignment not found.");
      const updated = applyFollowUp(existing, action, Date.now());
      if (updated === existing) return clone(existing);
      const next = applyAssignment(current, updated, Date.now());
      next.courseId = courseId;
      dataset.courses[studentId][courseId] = next;
      persistLocal();
      await cloudPush(() => pushCourseDoc(studentId, next));
      return clone(updated);
    },

    /* Assignment follow-up for a group record: same state machine,
       storage is the root-level groupAssignments map via _meta. */
    async setGroupAssignmentFollowUp(groupName, courseId, assignmentId, action) {
      const dataset = datasetOrThrow();
      const key = normName(groupName || "");
      const bucket = ((dataset.groupAssignments || {})[key] || {})[courseId] || {};
      const existing = bucket[assignmentId] || null;
      if (!existing) throw new Error("Group assignment not found.");
      const updated = applyFollowUp(existing, action, Date.now());
      if (updated === existing) return clone(existing);
      dataset.groupAssignments[key][courseId][assignmentId] = updated;
      persistLocal();
      await cloudPush(() => pushMeta());
      return clone(updated);
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
      if (Object.keys(doc.ticks || {}).length || Object.keys(doc.tombstones || {}).length || Object.keys(doc.assignments || {}).length) {
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
        assignDataset(readDemoDataset());
        state.cloudOk = false;
      }
      emit();
    },
    async signIn(email) {
      const address = normEmail(email || (root.prompt ? root.prompt("Demo mode: sign in as which email?", teacherEmails()[0] || "") : ""));
      if (!address) return;
      lsSet(DEMO_USER_KEY, address);
      state.user = demoUser();
      if (isTeacher()) assignDataset(readDemoDataset());
      else assignDataset(null);
      emit();
    },
    async signOut() {
      lsRemove(DEMO_USER_KEY);
      state.user = null;
      assignDataset(null);
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
            assignDataset(null);
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
        assignDataset(null);
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
