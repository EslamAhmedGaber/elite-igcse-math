(function () {
  const ADMIN_EMAILS = (window.ELITE_FIREBASE?.adminEmails || []).map((email) => String(email).toLowerCase());
  const LOCAL_PREVIEW = ["localhost", "127.0.0.1"].includes(window.location.hostname) || window.location.protocol === "file:";
  const els = {
    statusCard: document.getElementById("adminStatusCard"),
    accessTitle: document.getElementById("adminAccessTitle"),
    accessText: document.getElementById("adminAccessText"),
    loginBtn: document.getElementById("adminLoginBtn"),
    studio: document.getElementById("certificateStudio"),
    form: document.getElementById("certificateForm"),
    printBtn: document.getElementById("printCertificateBtn"),
    resetBtn: document.getElementById("resetCertificateBtn"),
    fitNameBtn: document.getElementById("fitNameBtn"),
    certificate: document.getElementById("eliteCertificate"),
    fields: {
      studentName: document.getElementById("certStudentName"),
      awardType: document.getElementById("certAwardType"),
      design: document.getElementById("certDesign"),
      achievement: document.getElementById("certAchievement"),
      evidence: document.getElementById("certEvidence"),
      date: document.getElementById("certDate"),
      number: document.getElementById("certNumber"),
      accent: document.getElementById("certAccent"),
      papers: document.getElementById("certPapers"),
      average: document.getElementById("certAverage")
    }
  };

  const samples = {
    studentName: "Layla Naguib Hassan",
    awardType: "Certificate of Achievement",
    design: "split",
    achievement: "Higher-Tier Mathematics - Edexcel IGCSE 4MA1 - 2025/2026 cohort",
    evidence: "for sustained progress, consistent practice, and excellent mathematical discipline",
    number: "EA-2026-DRAFT",
    accent: "vermilion",
    papers: "12",
    average: "84"
  };

  function todayValue() {
    return new Date().toISOString().slice(0, 10);
  }

  function prettyDate(value) {
    const date = value ? new Date(`${value}T00:00:00`) : new Date();
    if (Number.isNaN(date.getTime())) return "23 May 2026";
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  }

  function text(selector, value) {
    const node = document.querySelector(selector);
    if (node) node.textContent = value;
  }

  function fitStudentName(name) {
    els.certificate.classList.remove("name-long", "name-very-long");
    if (name.length > 34) els.certificate.classList.add("name-very-long");
    else if (name.length > 24) els.certificate.classList.add("name-long");
  }

  function updatePreview() {
    const name = els.fields.studentName.value.trim() || "Student Name";
    const title = els.fields.awardType.value || "Certificate of Achievement";
    const design = els.fields.design.value || "split";
    const achievement = els.fields.achievement.value.trim() || samples.achievement;
    const evidence = els.fields.evidence.value.trim() || samples.evidence;
    const date = prettyDate(els.fields.date.value);
    const number = els.fields.number.value.trim() || samples.number;
    const papers = Math.max(0, Number(els.fields.papers.value || 0));
    const average = Math.max(0, Math.min(100, Number(els.fields.average.value || 0)));

    els.certificate.dataset.accent = els.fields.accent.value || "vermilion";
    els.certificate.dataset.design = design;
    text("[data-cert-title]", title);
    text("[data-cert-student]", name);
    text("[data-cert-achievement]", achievement);
    text("[data-cert-evidence]", evidence);
    text("[data-cert-date]", date);
    text("[data-cert-date-foot]", date);
    document.querySelectorAll("[data-cert-number]").forEach((node) => { node.textContent = number; });
    text("[data-cert-papers]", String(papers));
    text("[data-cert-average]", `${Math.round(average)}%`);
    text("[data-cert-verify]", `CERTIFICATE NO. ${number} - ELITEIGCSE.COM/VERIFY`);
    text("#certificateModeLabel", `A4 landscape preview - ${els.fields.design.options[els.fields.design.selectedIndex]?.text || "certificate"}`);
    fitStudentName(name);
  }

  function resetSample() {
    els.fields.studentName.value = samples.studentName;
    els.fields.awardType.value = samples.awardType;
    els.fields.design.value = samples.design;
    els.fields.achievement.value = samples.achievement;
    els.fields.evidence.value = samples.evidence;
    els.fields.date.value = todayValue();
    els.fields.number.value = samples.number;
    els.fields.accent.value = samples.accent;
    els.fields.papers.value = samples.papers;
    els.fields.average.value = samples.average;
    updatePreview();
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
      els.accessTitle.textContent = "Local certificate preview";
      els.accessText.textContent = "Preview mode is open on this computer. The live site still needs an admin email allowlist.";
    } else if (!configured) {
      els.accessTitle.textContent = "Firebase is not configured";
      els.accessText.textContent = "The certificate studio needs the existing Google login config.";
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
      els.accessTitle.textContent = "Certificate studio unlocked";
      els.accessText.textContent = `${user.email || "Teacher account"} is approved for certificate drafting.`;
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

  els.printBtn.addEventListener("click", () => {
    updatePreview();
    window.print();
  });

  els.resetBtn.addEventListener("click", resetSample);
  els.fitNameBtn.addEventListener("click", () => fitStudentName(els.fields.studentName.value.trim()));

  document.addEventListener("DOMContentLoaded", () => {
    resetSample();
    const cloud = window.EliteCloud?.state ? window.EliteCloud.state() : null;
    if (cloud) setAccess(cloud);
  });
})();
