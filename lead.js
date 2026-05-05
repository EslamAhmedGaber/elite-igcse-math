(function () {
  const LEAD_PHONE = "201120009622";
  const LEAD_KEY = "leadInfoV1";

  const DIALOG_HTML = `
    <dialog id="leadDialog" class="lead-dialog" aria-labelledby="leadDialogTitle">
      <form id="leadForm" method="dialog">
        <header class="lead-head">
          <strong id="leadDialogTitle">Book your free first class</strong>
          <button type="button" id="leadCloseBtn" aria-label="Close">&times;</button>
        </header>
        <p class="lead-sub">Tell Dr Eslam a little about you so he can reply with the right course details on WhatsApp.</p>
        <label>Your name<input id="leadName" name="name" type="text" required autocomplete="name" placeholder="e.g. Yousef Hassan"></label>
        <label>Year / Grade<select id="leadYear" name="year" required>
          <option value="">Select year</option>
          <option>Year 9</option>
          <option>Year 10</option>
          <option>Year 11</option>
          <option>Repeat / Retake</option>
          <option>Other</option>
        </select></label>
        <label>Target exam session<select id="leadExam" name="exam" required>
          <option value="">Select session</option>
          <option>January 2027</option>
          <option>May/June 2027</option>
          <option>January 2028</option>
          <option>Later / Undecided</option>
        </select></label>
        <label>Interested in<select id="leadPackage" name="package">
          <option value="">Any package</option>
          <option value="group">Group Course</option>
          <option value="private">Private 1-to-1</option>
          <option value="intensive">Intensive Sprint</option>
        </select></label>
        <div class="lead-actions">
          <button type="submit" class="button primary">Open WhatsApp</button>
          <button type="button" id="leadSkipBtn" class="button ghost">Skip and chat directly</button>
        </div>
        <p class="lead-privacy">We don't store anything on a server. Your details are saved only in this browser and added to the WhatsApp message you send.</p>
      </form>
    </dialog>
  `;

  function ensureDialog() {
    if (!document.getElementById("leadDialog")) {
      document.body.insertAdjacentHTML("beforeend", DIALOG_HTML);
    }
  }

  function readLead() {
    try {
      return JSON.parse(localStorage.getItem(LEAD_KEY) || "{}");
    } catch (err) {
      return {};
    }
  }

  function buildLeadWhatsAppUrl(info) {
    const pkgLabel = ({
      group: "Group Course",
      private: "Private 1-to-1",
      intensive: "Intensive Sprint",
    })[info.package] || "Any package";
    const lines = [
      "Hello Dr Eslam, I would like to enroll in the IGCSE Math course.",
      `Name: ${info.name}`,
      `Year: ${info.year}`,
      `Target exam: ${info.exam}`,
      `Interested in: ${pkgLabel}`,
    ];
    return `https://wa.me/${LEAD_PHONE}?text=${encodeURIComponent(lines.join("\n"))}`;
  }

  function init() {
    ensureDialog();

    const dialog = document.getElementById("leadDialog");
    const form = document.getElementById("leadForm");
    const closeBtn = document.getElementById("leadCloseBtn");
    const skipBtn = document.getElementById("leadSkipBtn");
    const nameInput = document.getElementById("leadName");
    const yearSelect = document.getElementById("leadYear");
    const examSelect = document.getElementById("leadExam");
    const packageSelect = document.getElementById("leadPackage");
    let pendingPackage = "";

    function prefill() {
      const saved = readLead();
      if (saved.name) nameInput.value = saved.name;
      if (saved.year) yearSelect.value = saved.year;
      if (saved.exam) examSelect.value = saved.exam;
      if (pendingPackage) packageSelect.value = pendingPackage;
      else if (saved.package) packageSelect.value = saved.package;
    }

    function open(pkg) {
      pendingPackage = pkg || "";
      prefill();
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
      setTimeout(() => nameInput.focus(), 30);
    }

    function close() {
      if (dialog.open) dialog.close();
    }

    document.addEventListener("click", (event) => {
      const trigger = event.target.closest("[data-lead-trigger]");
      if (trigger) {
        event.preventDefault();
        open("");
        return;
      }
      const pkgBtn = event.target.closest(".enroll-trigger");
      if (pkgBtn) {
        event.preventDefault();
        open(pkgBtn.dataset.package || "");
      }
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const info = {
        name: nameInput.value.trim(),
        year: yearSelect.value,
        exam: examSelect.value,
        package: packageSelect.value,
      };
      if (!info.name || !info.year || !info.exam) return;
      localStorage.setItem(LEAD_KEY, JSON.stringify(info));
      const url = buildLeadWhatsAppUrl(info);
      close();
      window.open(url, "_blank", "noopener,noreferrer");
    });

    closeBtn.addEventListener("click", close);
    skipBtn.addEventListener("click", () => {
      close();
      const fallback = `https://wa.me/${LEAD_PHONE}?text=${encodeURIComponent("Hello Dr Eslam, I would like to ask about the IGCSE Math course.")}`;
      window.open(fallback, "_blank", "noopener,noreferrer");
    });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) close();
    });
  }

  function initNavToggle() {
    const toggle = document.getElementById("navToggle");
    const header = document.querySelector(".site-header");
    if (!toggle || !header) return;
    toggle.addEventListener("click", () => {
      const open = header.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
  }

  function bootstrap() {
    init();
    initNavToggle();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }
})();
