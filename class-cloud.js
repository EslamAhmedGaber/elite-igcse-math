/* ==========================================================================
   class-cloud.js - Elite Mathematics groups, weekly exams and results
   Shared data layer for teacher-groups.html (teacher) and results.html
   (students).

   Firestore layout (rules in docs/firestore.rules):
     groups/{CODE}                       name, code, course, topicsCovered[]
     groups/{CODE}/members/{email}       name, email, uid, addedBy, joinedAt
     groups/{CODE}/exams/{examId}        title, date, maxMarks, published, stats
     groups/{CODE}/exams/{id}/scores/{email}   name, email, score, maxMarks
     student_groups/{uid}                codes[] (groups this student joined)

   Privacy: only the teacher writes marks. A student reads their own score
   and, once an exam is published, its average and top three.

   Demo mode (?demo=1): identical API stored in this browser only, so the
   pages can be tried and tested before Firebase rules are published.
   ========================================================================== */
(function (root) {
  "use strict";

  const SDK_VERSION = "10.12.5";
  const APP_NAME = "elite-classes";
  const DEMO_KEY = "eliteClassroomDemoV1";
  const params = new URLSearchParams(root.location.search);
  const demoMode = params.get("demo") === "1" || !root.ELITE_FIREBASE?.enabled;

  const listeners = new Set();
  const state = { ready: false, user: null, error: "", modules: null, auth: null, db: null };

  function normEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function normCode(value) {
    return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 24);
  }

  function teacherEmails() {
    return (root.ELITE_FIREBASE?.adminEmails || []).map(normEmail);
  }

  function isTeacher(user = state.user) {
    return Boolean(user?.email && teacherEmails().includes(normEmail(user.email)));
  }

  function emit() {
    listeners.forEach((listener) => listener({ ...state, isTeacher: isTeacher(), demo: demoMode }));
  }

  function onChange(listener) {
    listeners.add(listener);
    listener({ ...state, isTeacher: isTeacher(), demo: demoMode });
    return () => listeners.delete(listener);
  }

  function round1(value) {
    return Math.round(Number(value) * 10) / 10;
  }

  /* Stats stored on a published exam: what every group member may see. */
  function computeStats(scoreRows, maxMarks) {
    const rows = scoreRows.filter((row) => row.score !== null && row.score !== "" && Number.isFinite(Number(row.score)));
    const max = Number(maxMarks) || 0;
    if (!rows.length || !max) return { count: 0, average: 0, averagePct: 0, top: [] };
    const scores = rows.map((row) => Number(row.score));
    const average = scores.reduce((sum, value) => sum + value, 0) / scores.length;
    const sorted = [...rows].sort((a, b) => Number(b.score) - Number(a.score) || String(a.name).localeCompare(String(b.name)));
    // Top three places; students sharing a score share the place.
    const top = [];
    let place = 0;
    let lastScore = null;
    sorted.forEach((row, index) => {
      if (Number(row.score) !== lastScore) {
        place = index + 1;
        lastScore = Number(row.score);
      }
      if (place <= 3) top.push({ name: row.name, score: Number(row.score), pct: round1((Number(row.score) / max) * 100), place });
    });
    return {
      count: rows.length,
      average: round1(average),
      averagePct: round1((average / max) * 100),
      highest: Math.max(...scores),
      top
    };
  }

  /* ---------------------------------------------------------------- demo */

  const demo = {
    read() {
      try {
        return JSON.parse(localStorage.getItem(DEMO_KEY) || "{}");
      } catch (error) {
        return {};
      }
    },
    write(data) {
      localStorage.setItem(DEMO_KEY, JSON.stringify(data));
    },
    db() {
      const data = demo.read();
      data.groups = data.groups || {};
      data.studentGroups = data.studentGroups || {};
      return data;
    },
    user() {
      const data = demo.read();
      return data.user || null;
    }
  };

  const demoStore = {
    async init() {
      state.user = demo.user();
      state.ready = true;
      emit();
    },
    async signIn(email, name) {
      const address = normEmail(email || root.prompt("Demo mode: sign in as which email?", teacherEmails()[0] || "student@example.com"));
      if (!address) return;
      const data = demo.db();
      data.user = { uid: `demo-${address}`, email: address, displayName: name || address.split("@")[0] };
      demo.write(data);
      state.user = data.user;
      emit();
    },
    async signOut() {
      const data = demo.db();
      delete data.user;
      demo.write(data);
      state.user = null;
      emit();
    },
    async listGroups() {
      return Object.values(demo.db().groups).map(({ members, exams, ...group }) => group).sort((a, b) => a.name.localeCompare(b.name));
    },
    async getGroup(code) {
      const group = demo.db().groups[normCode(code)];
      if (!group) return null;
      const { members, exams, ...rest } = group;
      return rest;
    },
    async saveGroup(group) {
      const data = demo.db();
      const code = normCode(group.code);
      const existing = data.groups[code] || { members: {}, exams: {} };
      data.groups[code] = { ...existing, ...group, code, updatedAt: Date.now(), createdAt: existing.createdAt || Date.now() };
      demo.write(data);
      return code;
    },
    async deleteGroup(code) {
      const data = demo.db();
      delete data.groups[normCode(code)];
      demo.write(data);
    },
    async listMembers(code) {
      return Object.values(demo.db().groups[normCode(code)]?.members || {}).sort((a, b) => a.name.localeCompare(b.name));
    },
    async saveMember(code, member) {
      const data = demo.db();
      const group = data.groups[normCode(code)];
      if (!group) throw new Error("Group not found");
      const id = member.id || memberId(member);
      group.members[id] = { ...(group.members[id] || {}), ...member, id };
      demo.write(data);
      return id;
    },
    async removeMember(code, id) {
      const data = demo.db();
      delete data.groups[normCode(code)]?.members[id];
      demo.write(data);
    },
    async listExams(code, { publishedOnly = false } = {}) {
      const exams = Object.values(demo.db().groups[normCode(code)]?.exams || {}).map(({ scores, ...exam }) => exam);
      return exams.filter((exam) => !publishedOnly || exam.published).sort((a, b) => String(b.date).localeCompare(String(a.date)));
    },
    async saveExam(code, exam) {
      const data = demo.db();
      const group = data.groups[normCode(code)];
      const id = exam.id || `exam-${Date.now().toString(36)}`;
      const existing = group.exams[id] || { scores: {} };
      group.exams[id] = { ...existing, ...exam, id, updatedAt: Date.now() };
      demo.write(data);
      return id;
    },
    async deleteExam(code, id) {
      const data = demo.db();
      delete data.groups[normCode(code)]?.exams[id];
      demo.write(data);
    },
    async listScores(code, examId) {
      return Object.values(demo.db().groups[normCode(code)]?.exams[examId]?.scores || {});
    },
    async saveScores(code, examId, rows) {
      const data = demo.db();
      const exam = data.groups[normCode(code)].exams[examId];
      exam.scores = {};
      rows.forEach((row) => { exam.scores[row.id] = row; });
      demo.write(data);
    },
    async myScore(code, examId) {
      const email = normEmail(state.user?.email);
      const exam = demo.db().groups[normCode(code)]?.exams[examId];
      if (!exam?.published) return null;
      return exam.scores?.[email] || null;
    },
    async joinGroup(code, name) {
      const data = demo.db();
      const group = data.groups[normCode(code)];
      if (!group) throw new Error("No group uses that code. Check the code with your teacher.");
      const email = normEmail(state.user.email);
      group.members[email] = { ...(group.members[email] || {}), id: email, email, name: name || group.members[email]?.name || state.user.displayName, uid: state.user.uid, addedBy: group.members[email]?.addedBy || "self", joinedAt: Date.now() };
      const mine = data.studentGroups[state.user.uid] || [];
      if (!mine.includes(group.code)) mine.push(group.code);
      data.studentGroups[state.user.uid] = mine;
      demo.write(data);
      return group.code;
    },
    async myGroups() {
      const data = demo.db();
      const email = normEmail(state.user?.email);
      return (data.studentGroups[state.user?.uid] || []).filter((code) => data.groups[code]?.members?.[email]);
    },
    async myMembership(code) {
      return demo.db().groups[normCode(code)]?.members?.[normEmail(state.user?.email)] || null;
    }
  };

  /* ------------------------------------------------------------ firestore */

  function memberId(member) {
    const email = normEmail(member.email);
    if (email) return email;
    const slug = String(member.name || "student").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return `name-${slug}-${Date.now().toString(36).slice(-4)}`;
  }

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
    f() {
      return state.modules.firestore;
    },
    ref(...path) {
      return fire.f().doc(state.db, ...path);
    },
    col(...path) {
      return fire.f().collection(state.db, ...path);
    }
  };

  const fireStore = {
    async init() {
      try {
        const modules = await fire.load();
        const existing = modules.app.getApps().find((app) => app.name === APP_NAME);
        const firebaseApp = existing || modules.app.initializeApp(root.ELITE_FIREBASE.config, APP_NAME);
        state.auth = modules.auth.getAuth(firebaseApp);
        state.db = modules.firestore.getFirestore(firebaseApp);
        await modules.auth.getRedirectResult(state.auth).catch(() => null);
        modules.auth.onAuthStateChanged(state.auth, (user) => {
          state.user = user;
          state.ready = true;
          emit();
        });
      } catch (error) {
        state.error = error.message || "Sign-in could not start. Check the connection.";
        state.ready = true;
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
    },
    async listGroups() {
      const snap = await fire.f().getDocs(fire.col("groups"));
      return snap.docs.map((doc) => doc.data()).sort((a, b) => a.name.localeCompare(b.name));
    },
    async getGroup(code) {
      const snap = await fire.f().getDoc(fire.ref("groups", normCode(code)));
      return snap.exists() ? snap.data() : null;
    },
    async saveGroup(group) {
      const code = normCode(group.code);
      const ref = fire.ref("groups", code);
      const snap = await fire.f().getDoc(ref);
      await fire.f().setDoc(ref, {
        ...group,
        code,
        updatedAt: fire.f().serverTimestamp(),
        ...(snap.exists() ? {} : { createdAt: fire.f().serverTimestamp() })
      }, { merge: true });
      return code;
    },
    async deleteGroup(code) {
      await fire.f().deleteDoc(fire.ref("groups", normCode(code)));
    },
    async listMembers(code) {
      const snap = await fire.f().getDocs(fire.col("groups", normCode(code), "members"));
      return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })).sort((a, b) => String(a.name).localeCompare(String(b.name)));
    },
    async saveMember(code, member) {
      const id = member.id || memberId(member);
      const { id: _drop, ...data } = member;
      await fire.f().setDoc(fire.ref("groups", normCode(code), "members", id), data, { merge: true });
      return id;
    },
    async removeMember(code, id) {
      await fire.f().deleteDoc(fire.ref("groups", normCode(code), "members", id));
    },
    async listExams(code, { publishedOnly = false } = {}) {
      const col = fire.col("groups", normCode(code), "exams");
      const query = publishedOnly ? fire.f().query(col, fire.f().where("published", "==", true)) : col;
      const snap = await fire.f().getDocs(query);
      return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })).sort((a, b) => String(b.date).localeCompare(String(a.date)));
    },
    async saveExam(code, exam) {
      const id = exam.id || `exam-${Date.now().toString(36)}`;
      const { id: _drop, ...data } = exam;
      await fire.f().setDoc(fire.ref("groups", normCode(code), "exams", id), { ...data, updatedAt: fire.f().serverTimestamp() }, { merge: true });
      return id;
    },
    async deleteExam(code, id) {
      const scores = await fire.f().getDocs(fire.col("groups", normCode(code), "exams", id, "scores"));
      await Promise.all(scores.docs.map((doc) => fire.f().deleteDoc(doc.ref)));
      await fire.f().deleteDoc(fire.ref("groups", normCode(code), "exams", id));
    },
    async listScores(code, examId) {
      const snap = await fire.f().getDocs(fire.col("groups", normCode(code), "exams", examId, "scores"));
      return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    },
    async saveScores(code, examId, rows) {
      const existing = await fireStore.listScores(code, examId);
      const keep = new Set(rows.map((row) => row.id));
      const batch = fire.f().writeBatch(state.db);
      rows.forEach((row) => {
        const { id, ...data } = row;
        batch.set(fire.ref("groups", normCode(code), "exams", examId, "scores", id), data);
      });
      existing.filter((row) => !keep.has(row.id)).forEach((row) => {
        batch.delete(fire.ref("groups", normCode(code), "exams", examId, "scores", row.id));
      });
      await batch.commit();
    },
    async myScore(code, examId) {
      const snap = await fire.f().getDoc(fire.ref("groups", normCode(code), "exams", examId, "scores", normEmail(state.user.email)));
      return snap.exists() ? snap.data() : null;
    },
    async joinGroup(code, name) {
      const clean = normCode(code);
      const group = await fireStore.getGroup(clean).catch(() => null);
      if (!group) throw new Error("No group uses that code. Check the code with your teacher.");
      const email = normEmail(state.user.email);
      const ref = fire.ref("groups", clean, "members", email);
      const snap = await fire.f().getDoc(ref).catch(() => null);
      if (snap?.exists()) {
        await fire.f().setDoc(ref, { uid: state.user.uid, joinedAt: fire.f().serverTimestamp(), name: name || snap.data().name }, { merge: true });
      } else {
        await fire.f().setDoc(ref, { name: name || state.user.displayName || email, email, uid: state.user.uid, addedBy: "self", joinedAt: fire.f().serverTimestamp() });
      }
      const mineRef = fire.ref("student_groups", state.user.uid);
      const mine = await fire.f().getDoc(mineRef);
      const codes = new Set(mine.exists() ? mine.data().codes || [] : []);
      codes.add(clean);
      await fire.f().setDoc(mineRef, { codes: [...codes], email });
      return clean;
    },
    async myGroups() {
      const snap = await fire.f().getDoc(fire.ref("student_groups", state.user.uid));
      return snap.exists() ? snap.data().codes || [] : [];
    },
    async myMembership(code) {
      const snap = await fire.f().getDoc(fire.ref("groups", normCode(code), "members", normEmail(state.user.email)));
      return snap.exists() ? snap.data() : null;
    }
  };

  const store = demoMode ? demoStore : fireStore;

  function friendlyError(error) {
    const code = String(error?.code || "");
    if (code.includes("permission-denied")) {
      return "The database refused this action. If you are the teacher, make sure the Firestore rules in docs/firestore.rules are published.";
    }
    if (code.includes("unavailable") || code.includes("network")) return "No connection. Check the internet and try again.";
    return error?.message || "Something went wrong. Try again.";
  }

  root.EliteClassroom = {
    demo: demoMode,
    init: () => store.init(),
    onChange,
    isTeacher: () => isTeacher(),
    user: () => state.user,
    signIn: (...args) => store.signIn(...args),
    signOut: () => store.signOut(),
    normCode,
    normEmail,
    memberId,
    computeStats,
    friendlyError,
    api: store
  };
})(window);
