(function () {
  const DEFAULT_ADMIN_EMAIL = "eslamahmedgaberali@gmail.com";
  const ADMIN_EMAILS = (window.ELITE_FIREBASE?.adminEmails || []).map((email) => String(email).toLowerCase());
  const TEACHER_EMAIL = ADMIN_EMAILS[0] || DEFAULT_ADMIN_EMAIL;
  const LOCAL_PREVIEW = ["localhost", "127.0.0.1"].includes(window.location.hostname) || window.location.protocol === "file:";
  const CERTIFICATE_SEQUENCE_KEY = "eliteCertificateNextNumberV1";
  const TEACHER_PLANS_KEY = "eliteTeacherStudentPlansV1";

  const els = {
    statusCard: document.getElementById("adminStatusCard"),
    accessTitle: document.getElementById("adminAccessTitle"),
    accessText: document.getElementById("adminAccessText"),
    loginBtn: document.getElementById("adminLoginBtn"),
    studio: document.getElementById("certificateStudio"),
    form: document.getElementById("certificateForm"),
    printBtn: document.getElementById("printCertificateBtn"),
    pngBtn: document.getElementById("downloadCertificatePngBtn"),
    resetBtn: document.getElementById("resetCertificateBtn"),
    fitNameBtn: document.getElementById("fitNameBtn"),
    nextNumberBtn: document.getElementById("nextCertificateBtn"),
    certificate: document.getElementById("eliteCertificate"),
    fields: {
      studentName: document.getElementById("certStudentName"),
      awardType: document.getElementById("certAwardType"),
      design: document.getElementById("certDesign"),
      achievement: document.getElementById("certAchievement"),
      evidence: document.getElementById("certEvidence"),
      date: document.getElementById("certDate"),
      number: document.getElementById("certNumber"),
      phone: document.getElementById("certPhone"),
      accent: document.getElementById("certAccent"),
      paper: document.getElementById("certPaper"),
      frameColor: document.getElementById("certFrameColor"),
      nameColor: document.getElementById("certNameColor"),
    },
    planner: {
      form: document.getElementById("teacherStudentForm"),
      list: document.getElementById("teacherStudentList"),
      emailPreview: document.getElementById("teacherEmailPreview"),
      emailLink: document.getElementById("teacherEmailDraftLink"),
      copyBtn: document.getElementById("teacherCopyEmailBtn"),
      exportBtn: document.getElementById("teacherExportCsvBtn"),
      newBtn: document.getElementById("teacherPlanNewBtn"),
      deleteBtn: document.getElementById("teacherPlanDeleteBtn"),
      status: document.getElementById("teacherPlannerStatus"),
      fields: {
        id: document.getElementById("teacherStudentId"),
        name: document.getElementById("teacherStudentName"),
        course: document.getElementById("teacherStudentCourse"),
        lessonDay: document.getElementById("teacherLessonDay"),
        reminderDay: document.getElementById("teacherReminderDay"),
        quizDate: document.getElementById("teacherQuizDate"),
        mockDate: document.getElementById("teacherMockDate"),
        focus: document.getElementById("teacherFocus"),
        homework: document.getElementById("teacherHomework"),
        studentEmail: document.getElementById("teacherStudentEmail"),
        parentEmail: document.getElementById("teacherParentEmail"),
        notes: document.getElementById("teacherNotes"),
      },
    },
  };

  const samples = {
    studentName: "Layla Naguib Hassan",
    awardType: "Certificate of Achievement",
    design: "story",
    achievement: "Higher-Tier Mathematics - Edexcel IGCSE 4MA1 - 2025/2026 cohort",
    evidence: "for exceptional consistency, elegant exam technique, and outstanding mathematical discipline",
    number: "EA-2026-0001",
    phone: "+20 112 000 9622",
    accent: "auto",
    paper: "auto",
    frameColor: "auto",
    nameColor: "auto",
  };

  const DESIGN_PRESETS = {
    story: {
      layout: "story",
      accent: "vermilion",
      paper: "blush",
      frame: "vermilion",
      nameColor: "vermilion",
      evidence: "for beautiful effort, brave practice, and a learning journey worth celebrating",
      exportName: "Story-Spark",
    },
    diploma: {
      layout: "diploma",
      accent: "vermilion",
      paper: "inkwell",
      frame: "vermilion",
      nameColor: "vermilion",
      exportName: "Diploma-Inkwell",
      evidence: "for exceptional consistency, elegant exam technique, and outstanding mathematical discipline",
    },
    banner: {
      layout: "banner",
      accent: "vermilion",
      paper: "cream",
      frame: "vermilion",
      nameColor: "inkwell",
      exportName: "Banner-Vermilion",
      evidence: "for strong performance, careful revision habits, and reliable progress under exam conditions",
    },
    elite: {
      layout: "honours",
      accent: "vermilion",
      paper: "cream",
      frame: "inkwell",
      nameColor: "inkwell",
      exportName: "Elite-Signature",
      evidence: "for exceptional consistency, elegant exam technique, and outstanding mathematical discipline",
    },
    academy: {
      layout: "classic",
      accent: "verdigris",
      paper: "cream",
      frame: "verdigris",
      nameColor: "inkwell",
      exportName: "Academy-Frame",
      evidence: "for strong performance, careful revision habits, and reliable progress under exam conditions",
    },
    merit: {
      layout: "split",
      accent: "ochre",
      paper: "cream",
      frame: "inkwell",
      nameColor: "inkwell",
      exportName: "Merit-Editorial",
      evidence: "for determined practice, steady improvement, and a committed Elite IGCSE learning routine",
    },
  };

  function todayValue() {
    return new Date().toISOString().slice(0, 10);
  }

  function prettyDate(value) {
    const date = value ? new Date(`${value}T00:00:00`) : new Date();
    if (Number.isNaN(date.getTime())) return "23 May 2026";
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  }

  function compactDate(value) {
    return value ? prettyDate(value) : "Not set";
  }

  function text(selector, value) {
    const node = document.querySelector(selector);
    if (node) node.textContent = value;
  }

  function textAll(selector, value) {
    document.querySelectorAll(selector).forEach((node) => { node.textContent = value; });
  }

  function selectedOrDefault(field, fallback) {
    return field.value === "auto" ? fallback : (field.value || fallback);
  }

  function slug(value) {
    return String(value || "certificate")
      .trim()
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "certificate";
  }

  function certificateYearPrefix() {
    return `EA-${new Date().getFullYear()}-`;
  }

  function formatCertificateNumber(sequence) {
    const safeSequence = Math.max(1, Number(sequence) || 1);
    return `${certificateYearPrefix()}${String(safeSequence).padStart(4, "0")}`;
  }

  function sequenceFromCertificateNumber(value) {
    const match = String(value || "").match(/(\d+)\s*$/);
    return match ? Math.max(1, Number(match[1]) || 1) : 1;
  }

  function readNextCertificateNumber() {
    try {
      const stored = Number(localStorage.getItem(CERTIFICATE_SEQUENCE_KEY));
      return formatCertificateNumber(stored || 1);
    } catch {
      return samples.number;
    }
  }

  function rememberIssuedCertificateNumber(value) {
    try {
      localStorage.setItem(CERTIFICATE_SEQUENCE_KEY, String(sequenceFromCertificateNumber(value) + 1));
    } catch {}
  }

  function useNextCertificateNumber() {
    rememberIssuedCertificateNumber(els.fields.number.value);
    els.fields.number.value = readNextCertificateNumber();
    updatePreview();
  }

  function currentDesignPreset() {
    return DESIGN_PRESETS[els.fields.design.value] || DESIGN_PRESETS.story;
  }

  function fitStudentName(name) {
    els.certificate.classList.remove("name-long", "name-very-long");
    if (name.length > 34) els.certificate.classList.add("name-very-long");
    else if (name.length > 24) els.certificate.classList.add("name-long");
  }

  function updatePreview() {
    const preset = currentDesignPreset();
    const name = els.fields.studentName.value.trim() || "Student Name";
    const title = els.fields.awardType.value || samples.awardType;
    const achievement = els.fields.achievement.value.trim() || samples.achievement;
    const evidence = els.fields.evidence.value.trim() || preset.evidence;
    const date = prettyDate(els.fields.date.value);
    const number = els.fields.number.value.trim() || samples.number;
    const phone = els.fields.phone.value.trim() || samples.phone;
    const accent = els.fields.accent.value === "auto" ? preset.accent : (els.fields.accent.value || preset.accent);
    const paper = selectedOrDefault(els.fields.paper, preset.paper);
    const frame = selectedOrDefault(els.fields.frameColor, preset.frame);
    const nameColor = selectedOrDefault(els.fields.nameColor, preset.nameColor);

    els.certificate.dataset.accent = accent;
    els.certificate.dataset.design = preset.layout;
    els.certificate.dataset.tier = els.fields.design.value || "story";
    els.certificate.dataset.paper = paper;
    els.certificate.dataset.frame = frame;
    els.certificate.dataset.nameColor = nameColor;
    text("[data-cert-title]", title);
    text("[data-cert-student]", name);
    text("[data-cert-achievement]", achievement);
    text("[data-cert-evidence]", evidence);
    text("[data-cert-date]", date);
    text("[data-cert-date-foot]", date);
    document.querySelectorAll("[data-cert-number]").forEach((node) => { node.textContent = number; });
    textAll("[data-cert-phone]", phone);
    text("[data-cert-verify]", `CERTIFICATE NO. ${number} - ELITEIGCSE.COM/VERIFY`);
    const previewMode = preset.layout === "story" ? "Story portrait preview" : "A4 landscape preview";
    text("#certificateModeLabel", `${previewMode} - ${els.fields.design.options[els.fields.design.selectedIndex]?.text || "certificate"}`);
    fitStudentName(name);
  }

  function resetSample() {
    els.fields.studentName.value = samples.studentName;
    els.fields.awardType.value = samples.awardType;
    els.fields.design.value = samples.design;
    els.fields.achievement.value = samples.achievement;
    els.fields.evidence.value = samples.evidence;
    els.fields.date.value = todayValue();
    els.fields.number.value = readNextCertificateNumber();
    els.fields.phone.value = samples.phone;
    els.fields.accent.value = samples.accent;
    els.fields.paper.value = samples.paper;
    els.fields.frameColor.value = samples.frameColor;
    els.fields.nameColor.value = samples.nameColor;
    updatePreview();
  }

  function applyDesignDefaults() {
    const preset = currentDesignPreset();
    els.fields.evidence.value = preset.evidence;
    if (/^[789]-Star /.test(els.fields.awardType.value)) els.fields.awardType.value = samples.awardType;
    els.fields.accent.value = "auto";
    els.fields.paper.value = "auto";
    els.fields.frameColor.value = "auto";
    els.fields.nameColor.value = "auto";
    updatePreview();
  }

  async function downloadCertificatePng() {
    updatePreview();
    if (!window.htmlToImage?.toPng) {
      window.alert("PNG export is still loading. Please wait a few seconds and try again.");
      return;
    }

    els.pngBtn.disabled = true;
    els.pngBtn.textContent = "Preparing PNG...";
    try {
      await document.fonts.ready;
      const preset = currentDesignPreset();
      const exportWidth = els.certificate.offsetWidth;
      const exportHeight = els.certificate.offsetHeight;
      const dataUrl = await window.htmlToImage.toPng(els.certificate, {
        cacheBust: true,
        width: exportWidth,
        height: exportHeight,
        pixelRatio: 2,
        backgroundColor: getComputedStyle(els.certificate).backgroundColor,
        style: {
          transform: "none",
          transformOrigin: "top left",
        },
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${els.fields.number.value.trim() || samples.number}-${preset.exportName || "Certificate"}-${slug(els.fields.studentName.value)}.png`;
      link.click();
    } catch (error) {
      console.error(error);
      window.alert("PNG export could not be prepared. Please try again after the page finishes loading.");
    } finally {
      els.pngBtn.disabled = false;
      els.pngBtn.textContent = "Download PNG";
    }
  }

  function setPrintPageSize() {
    let style = document.getElementById("certificatePrintPageSize");
    if (!style) {
      style = document.createElement("style");
      style.id = "certificatePrintPageSize";
      document.head.appendChild(style);
    }
    const isStory = currentDesignPreset().layout === "story";
    document.body.classList.toggle("is-story-print", isStory);
    style.textContent = isStory
      ? "@page { size: 108mm 192mm; margin: 0; }"
      : "@page { size: A4 landscape; margin: 0; }";
  }

  function readTeacherPlans() {
    try {
      const parsed = JSON.parse(localStorage.getItem(TEACHER_PLANS_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.filter((plan) => plan && typeof plan === "object") : [];
    } catch {
      return [];
    }
  }

  function writeTeacherPlans(plans) {
    try {
      localStorage.setItem(TEACHER_PLANS_KEY, JSON.stringify(plans));
    } catch {}
  }

  function setPlannerStatus(message) {
    if (els.planner.status) els.planner.status.textContent = message;
  }

  function formTeacherPlan() {
    const fields = els.planner.fields;
    return {
      id: fields.id.value || `plan-${Date.now()}`,
      name: fields.name.value.trim(),
      course: fields.course.value,
      lessonDay: fields.lessonDay.value,
      reminderDay: fields.reminderDay.value,
      quizDate: fields.quizDate.value,
      mockDate: fields.mockDate.value,
      focus: fields.focus.value.trim(),
      homework: fields.homework.value.trim(),
      studentEmail: fields.studentEmail.value.trim(),
      parentEmail: fields.parentEmail.value.trim(),
      notes: fields.notes.value.trim(),
      updatedAt: new Date().toISOString(),
    };
  }

  function populateTeacherPlan(plan) {
    const fields = els.planner.fields;
    fields.id.value = plan.id || "";
    fields.name.value = plan.name || "";
    fields.course.value = plan.course || fields.course.options[0]?.value || "";
    fields.lessonDay.value = plan.lessonDay || "Saturday";
    fields.reminderDay.value = plan.reminderDay || "Thursday";
    fields.quizDate.value = plan.quizDate || "";
    fields.mockDate.value = plan.mockDate || "";
    fields.focus.value = plan.focus || "";
    fields.homework.value = plan.homework || "";
    fields.studentEmail.value = plan.studentEmail || "";
    fields.parentEmail.value = plan.parentEmail || "";
    fields.notes.value = plan.notes || "";
  }

  function clearTeacherPlanForm() {
    els.planner.form.reset();
    els.planner.fields.id.value = "";
    els.planner.fields.lessonDay.value = "Saturday";
    els.planner.fields.reminderDay.value = "Thursday";
    setPlannerStatus("Ready for a new student plan.");
    renderTeacherPlans();
    updateTeacherEmailDraft();
  }

  function renderTeacherPlans() {
    const plans = readTeacherPlans();
    const activeId = els.planner.fields.id.value;
    els.planner.list.innerHTML = "";

    if (!plans.length) {
      const empty = document.createElement("p");
      empty.className = "teacher-empty-state";
      empty.textContent = "No student plans saved yet.";
      els.planner.list.appendChild(empty);
      return;
    }

    plans
      .slice()
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
      .forEach((plan) => {
        const card = document.createElement("button");
        card.type = "button";
        card.className = `teacher-student-card${plan.id === activeId ? " is-active" : ""}`;
        card.dataset.planId = plan.id;
        card.innerHTML = `
          <strong>${escapeHtml(plan.name || "Unnamed student")}</strong>
          <span>${escapeHtml(plan.course || "Course not set")}</span>
          <small>Reminder: ${escapeHtml(plan.reminderDay || "Not set")} | Quiz: ${escapeHtml(compactDate(plan.quizDate))}</small>
        `;
        els.planner.list.appendChild(card);
      });
  }

  function saveTeacherPlan(event) {
    event.preventDefault();
    const plan = formTeacherPlan();
    if (!plan.name) {
      setPlannerStatus("Student name is required before saving.");
      els.planner.fields.name.focus();
      return;
    }

    const plans = readTeacherPlans();
    const existingIndex = plans.findIndex((item) => item.id === plan.id);
    if (existingIndex >= 0) plans[existingIndex] = plan;
    else plans.push(plan);
    writeTeacherPlans(plans);
    populateTeacherPlan(plan);
    renderTeacherPlans();
    updateTeacherEmailDraft();
    setPlannerStatus(`${plan.name} was saved in the weekly planner.`);
  }

  function deleteSelectedTeacherPlan() {
    const id = els.planner.fields.id.value;
    if (!id) {
      setPlannerStatus("Select a student plan first.");
      return;
    }
    const plan = readTeacherPlans().find((item) => item.id === id);
    const plans = readTeacherPlans().filter((item) => item.id !== id);
    writeTeacherPlans(plans);
    clearTeacherPlanForm();
    setPlannerStatus(`${plan?.name || "Selected plan"} was deleted.`);
  }

  function selectTeacherPlan(id) {
    const plan = readTeacherPlans().find((item) => item.id === id);
    if (!plan) return;
    populateTeacherPlan(plan);
    renderTeacherPlans();
    updateTeacherEmailDraft();
    setPlannerStatus(`${plan.name || "Student"} is open for editing.`);
  }

  function buildTeacherEmail(plans) {
    const lines = [
      "Elite weekly student plan",
      `Prepared: ${prettyDate(todayValue())}`,
      `Reminder recipient: Dr Eslam Ahmed <${TEACHER_EMAIL}>`,
      "",
    ];

    if (!plans.length) {
      lines.push("No student plans are saved yet.");
      return lines.join("\n");
    }

    plans
      .slice()
      .sort((a, b) => String(a.reminderDay || "").localeCompare(String(b.reminderDay || "")) || String(a.name || "").localeCompare(String(b.name || "")))
      .forEach((plan, index) => {
        lines.push(`${index + 1}. ${plan.name || "Unnamed student"} - ${plan.course || "Course not set"}`);
        lines.push(`   Lesson day: ${plan.lessonDay || "Not set"} | Reminder day: ${plan.reminderDay || "Not set"}`);
        lines.push(`   Next quiz: ${compactDate(plan.quizDate)} | Next mock: ${compactDate(plan.mockDate)}`);
        if (plan.focus) lines.push(`   Focus: ${plan.focus}`);
        if (plan.homework) lines.push(`   Homework: ${plan.homework}`);
        if (plan.studentEmail || plan.parentEmail) {
          lines.push(`   Contacts: student ${plan.studentEmail || "not set"} | parent ${plan.parentEmail || "not set"}`);
        }
        if (plan.notes) lines.push(`   Private notes: ${plan.notes}`);
        lines.push("");
      });

    return lines.join("\n").trim();
  }

  function updateTeacherEmailDraft() {
    const plans = readTeacherPlans();
    const body = buildTeacherEmail(plans);
    const subject = `Elite weekly student plan - ${prettyDate(todayValue())}`;
    els.planner.emailPreview.value = body;
    els.planner.emailLink.href = `mailto:${TEACHER_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  async function copyTeacherEmail() {
    updateTeacherEmailDraft();
    const body = els.planner.emailPreview.value;
    try {
      await navigator.clipboard.writeText(body);
      setPlannerStatus("Weekly email copied.");
    } catch {
      els.planner.emailPreview.focus();
      els.planner.emailPreview.select();
      document.execCommand("copy");
      setPlannerStatus("Weekly email selected and copied.");
    }
  }

  function escapeCsv(value) {
    return `"${String(value || "").replace(/"/g, '""')}"`;
  }

  function exportTeacherCsv() {
    const plans = readTeacherPlans();
    const headers = ["Student", "Course", "Lesson day", "Reminder day", "Quiz date", "Mock date", "Focus", "Homework", "Student email", "Parent email", "Private notes"];
    const rows = plans.map((plan) => [
      plan.name,
      plan.course,
      plan.lessonDay,
      plan.reminderDay,
      plan.quizDate,
      plan.mockDate,
      plan.focus,
      plan.homework,
      plan.studentEmail,
      plan.parentEmail,
      plan.notes,
    ].map(escapeCsv).join(","));
    const csv = [headers.map(escapeCsv).join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `elite-weekly-student-plan-${todayValue()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setPlannerStatus("Student plan CSV exported.");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setAccess(state) {
    const configured = Boolean(state?.configured);
    const user = state?.user || null;
    const email = String(user?.email || "").toLowerCase();
    const allowlistReady = ADMIN_EMAILS.length > 0;
    const allowed = LOCAL_PREVIEW || (Boolean(user) && allowlistReady && ADMIN_EMAILS.includes(email));

    els.statusCard.classList.toggle("is-ready", allowed);
    els.statusCard.classList.toggle("is-blocked", Boolean(user) && !allowed);
    els.loginBtn.hidden = LOCAL_PREVIEW || Boolean(user);
    els.studio.hidden = !allowed;

    if (LOCAL_PREVIEW) {
      els.accessTitle.textContent = "Local teacher preview";
      els.accessText.textContent = "Preview mode is open on this computer. The live site still needs your approved Google email.";
    } else if (!configured) {
      els.accessTitle.textContent = "Firebase is not configured";
      els.accessText.textContent = "The private studio needs the existing Google login config.";
    } else if (!user) {
      els.accessTitle.textContent = "Teacher sign-in required";
      els.accessText.textContent = "Sign in first. The studio stays hidden until a Google account is active.";
    } else if (!allowlistReady) {
      els.accessTitle.textContent = "Admin allowlist needed";
      els.accessText.textContent = "Add your teacher email to firebase-config.js before unlocking this page on the live site.";
    } else if (!allowed) {
      els.accessTitle.textContent = "Signed in, not on admin list";
      els.accessText.textContent = `${user.email || "This account"} is not in the admin allowlist yet.`;
    } else {
      els.accessTitle.textContent = "Teacher studio unlocked";
      els.accessText.textContent = `${user.email || "Teacher account"} is approved for planner and certificate tools.`;
    }
  }

  window.addEventListener("elite-cloud-state", (event) => setAccess(event.detail));

  els.form.addEventListener("submit", (event) => {
    event.preventDefault();
    updatePreview();
  });

  Object.values(els.fields).forEach((field) => {
    field.addEventListener("input", updatePreview);
    field.addEventListener("change", updatePreview);
  });

  Object.values(els.planner.fields).forEach((field) => {
    field.addEventListener("input", updateTeacherEmailDraft);
    field.addEventListener("change", updateTeacherEmailDraft);
  });

  els.fields.design.addEventListener("change", applyDesignDefaults);
  els.pngBtn.addEventListener("click", downloadCertificatePng);

  els.printBtn.addEventListener("click", () => {
    updatePreview();
    rememberIssuedCertificateNumber(els.fields.number.value);
    setPrintPageSize();
    window.print();
  });

  els.nextNumberBtn.addEventListener("click", useNextCertificateNumber);
  els.resetBtn.addEventListener("click", resetSample);
  els.fitNameBtn.addEventListener("click", () => fitStudentName(els.fields.studentName.value.trim()));

  els.planner.form.addEventListener("submit", saveTeacherPlan);
  els.planner.newBtn.addEventListener("click", clearTeacherPlanForm);
  els.planner.deleteBtn.addEventListener("click", deleteSelectedTeacherPlan);
  els.planner.copyBtn.addEventListener("click", copyTeacherEmail);
  els.planner.exportBtn.addEventListener("click", exportTeacherCsv);
  els.planner.list.addEventListener("click", (event) => {
    const card = event.target.closest("[data-plan-id]");
    if (card) selectTeacherPlan(card.dataset.planId);
  });

  document.addEventListener("DOMContentLoaded", () => {
    resetSample();
    clearTeacherPlanForm();
    renderTeacherPlans();
    updateTeacherEmailDraft();
    const cloud = window.EliteCloud?.state ? window.EliteCloud.state() : null;
    if (cloud) setAccess(cloud);
  });

  window.addEventListener("afterprint", () => {
    document.body.classList.remove("is-story-print");
  });
})();
