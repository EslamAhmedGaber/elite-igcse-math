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
      papers: document.getElementById("certPapers"),
      average: document.getElementById("certAverage")
    }
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
    papers: "12",
    average: "84"
  };

  const DESIGN_PRESETS = {
    story: {
      layout: "story",
      accent: "vermilion",
      paper: "blush",
      frame: "vermilion",
      nameColor: "vermilion",
      evidence: "for beautiful effort, brave practice, and a learning journey worth celebrating",
      exportName: "Story-Spark"
    },
    diploma: {
      layout: "diploma",
      accent: "vermilion",
      paper: "inkwell",
      frame: "vermilion",
      nameColor: "vermilion",
      exportName: "Diploma-Inkwell",
      evidence: "for exceptional consistency, elegant exam technique, and outstanding mathematical discipline"
    },
    banner: {
      layout: "banner",
      accent: "vermilion",
      paper: "cream",
      frame: "vermilion",
      nameColor: "inkwell",
      exportName: "Banner-Vermilion",
      evidence: "for strong performance, careful revision habits, and reliable progress under exam conditions"
    },
    elite: {
      layout: "honours",
      accent: "vermilion",
      paper: "cream",
      frame: "inkwell",
      nameColor: "inkwell",
      exportName: "Elite-Signature",
      evidence: "for exceptional consistency, elegant exam technique, and outstanding mathematical discipline"
    },
    academy: {
      layout: "classic",
      accent: "verdigris",
      paper: "cream",
      frame: "verdigris",
      nameColor: "inkwell",
      exportName: "Academy-Frame",
      evidence: "for strong performance, careful revision habits, and reliable progress under exam conditions"
    },
    merit: {
      layout: "split",
      accent: "ochre",
      paper: "cream",
      frame: "inkwell",
      nameColor: "inkwell",
      exportName: "Merit-Editorial",
      evidence: "for determined practice, steady improvement, and a committed Elite IGCSE learning routine"
    }
  };

  const CERTIFICATE_SEQUENCE_KEY = "eliteCertificateNextNumberV1";

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
    const papers = Math.max(0, Number(els.fields.papers.value || 0));
    const average = Math.max(0, Math.min(100, Number(els.fields.average.value || 0)));
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
    text("[data-cert-papers]", String(papers));
    text("[data-cert-average]", `${Math.round(average)}%`);
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
    els.fields.papers.value = samples.papers;
    els.fields.average.value = samples.average;
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
          transformOrigin: "top left"
        }
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

  document.addEventListener("DOMContentLoaded", () => {
    resetSample();
    const cloud = window.EliteCloud?.state ? window.EliteCloud.state() : null;
    if (cloud) setAccess(cloud);
  });

  window.addEventListener("afterprint", () => {
    document.body.classList.remove("is-story-print");
  });
})();
