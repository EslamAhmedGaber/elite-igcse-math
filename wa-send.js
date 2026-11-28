/* wa-send.js - send PDF files to WhatsApp from the Teacher Lesson Tracker.
   No web page can drop a file into a chosen WhatsApp chat by itself
   (wa.me links carry text only), so two send modes, remembered per
   device:
   - "direct" (default on computers): the chosen chat opens straight
     away in the WhatsApp app - the saved group link or the student's
     number - while the PDFs download and the message is copied; the
     teacher drags the PDFs in and pastes. Works for every PDF, also
     books hosted on GitHub Releases (a plain download needs no CORS).
   - "sheet" (default on phones): the system share window opens with
     the PDFs attached and the message as caption; the teacher picks
     WhatsApp, then the chat (recent chats show at the top).
   Targets: { key, kind: "group"|"phone"|"any", label, url, digits } */
(function (root) {
  "use strict";

  const MODE_KEY = "eliteWaSendModeV1";

  function canShareFiles(files) {
    try {
      return Boolean(files && files.length && root.navigator && root.navigator.canShare && root.navigator.share && root.navigator.canShare({ files }));
    } catch (error) {
      return false;
    }
  }

  function sheetSupported() {
    try {
      const probe = new File(["%PDF-1.4"], "probe.pdf", { type: "application/pdf" });
      return canShareFiles([probe]);
    } catch (error) {
      return false;
    }
  }

  function isMobile() {
    const nav = root.navigator || {};
    if (nav.userAgentData && typeof nav.userAgentData.mobile === "boolean") return nav.userAgentData.mobile;
    return /Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent || "");
  }

  function getMode() {
    let saved = "";
    try { saved = root.localStorage.getItem(MODE_KEY) || ""; } catch (error) { /* private mode */ }
    if (saved === "sheet" && !sheetSupported()) return "direct";
    if (saved === "direct" || saved === "sheet") return saved;
    return isMobile() && sheetSupported() ? "sheet" : "direct";
  }

  function setMode(mode) {
    try { root.localStorage.setItem(MODE_KEY, mode === "sheet" ? "sheet" : "direct"); } catch (error) { /* private mode */ }
  }

  function digitsOf(value) {
    return String(value || "").replace(/\D+/g, "");
  }

  function inviteCode(link) {
    const match = /^https:\/\/chat\.whatsapp\.com\/(?:invite\/)?([A-Za-z0-9_-]{6,})/.exec(String(link || ""));
    return match ? match[1] : "";
  }

  /* ctx: { groupName, groupLink, phones: [{ number (digits), label }], studentName } */
  function targets(ctx) {
    const out = [];
    if (ctx && ctx.groupLink) {
      const name = String(ctx.groupName || "").trim();
      out.push({ key: "group", kind: "group", label: `Send to ${name ? (name.toLowerCase().endsWith("group") ? name : `${name} group`) : "the WhatsApp group"}`, url: ctx.groupLink });
    }
    ((ctx && ctx.phones) || []).forEach((entry, index) => {
      const digits = digitsOf(entry.number);
      if (!digits) return;
      out.push({ key: `phone-${index}`, kind: "phone", label: `Send to ${entry.label || "student"}${ctx.studentName && (entry.label || "Student") === "Student" ? ` (${ctx.studentName})` : ""}`, digits, url: `https://wa.me/${digits}` });
    });
    out.push({ key: "any", kind: "any", label: out.length ? "Other chat…" : "Send on WhatsApp…", url: "https://wa.me/" });
    return out;
  }

  /* Web link for the chat (works everywhere; on a computer it shows a
     WhatsApp page first). */
  function chatUrl(target, text) {
    if (target.kind === "group") return target.url;
    if (target.kind === "phone") return `https://wa.me/${target.digits}?text=${encodeURIComponent(text || "")}`;
    return `https://wa.me/?text=${encodeURIComponent(text || "")}`;
  }

  /* App link: on a computer this opens the chat straight in WhatsApp
     Desktop, skipping the web page. Phones use the web link (the OS
     hands it to the app anyway). */
  function appUrl(target, text) {
    if (isMobile()) return "";
    if (target.kind === "group") {
      const code = inviteCode(target.url);
      return code ? `whatsapp://chat/?code=${code}` : "";
    }
    if (target.kind === "phone") return `whatsapp://send?phone=${target.digits}&text=${encodeURIComponent(text || "")}`;
    return `whatsapp://send?text=${encodeURIComponent(text || "")}`;
  }

  function clickLink(href, opts = {}) {
    const link = document.createElement("a");
    link.href = href;
    if (opts.download) link.download = opts.download;
    if (opts.blank) { link.target = "_blank"; link.rel = "noopener"; }
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function download(file) {
    const url = URL.createObjectURL(file);
    clickLink(url, { download: file.name || "Elite.pdf" });
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  /* Cross-origin book (served as an attachment): a hidden frame lets
     the browser download it without leaving the tracker page and
     without a popup. */
  function downloadUrl(href) {
    const frame = document.createElement("iframe");
    frame.style.display = "none";
    frame.setAttribute("aria-hidden", "true");
    frame.src = href;
    document.body.appendChild(frame);
    setTimeout(() => frame.remove(), 120000);
  }

  async function copy(text) {
    try {
      await root.navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      return false;
    }
  }

  function openChat(target, text) {
    const app = appUrl(target, text);
    if (app) clickLink(app);
    else root.open(chatUrl(target, text), "_blank", "noopener");
    return { app: Boolean(app), web: chatUrl(target, text) };
  }

  /* Direct mode. The chat opens FIRST, while the click still counts as
     a user gesture. links = [{ href, name }] for books the page cannot
     read (GitHub Releases): the browser downloads them itself. */
  async function direct({ files = [], links = [], text, target }) {
    const opened = openChat(target, text);
    const all = [...files.map((file) => () => download(file)), ...links.map((link) => () => downloadUrl(link.href))];
    all.forEach((run, index) => setTimeout(run, 400 + index * 450));
    const copied = text ? await copy(text) : false;
    return { mode: "direct", files: all.length, copied, app: opened.app, url: opened.web };
  }

  /* send: mode "sheet" shares files (links stay in the text);
     mode "direct" opens the chat and downloads everything. */
  async function send({ files = [], links = [], text = "", sheetText = "", target, title = "", mode }) {
    if (!target) throw new Error("No WhatsApp target.");
    const useMode = mode || getMode();
    if (useMode === "sheet" && canShareFiles(files)) {
      try {
        await root.navigator.share({ files, text: sheetText || text, title });
        return { mode: "shared", files: files.length, linked: links.length };
      } catch (error) {
        if (error && error.name === "AbortError") return { mode: "cancelled" };
        if (error && error.name === "NotAllowedError") return { mode: "needs-tap" };
        /* any other share failure: fall through to direct mode */
      }
    }
    return direct({ files, links, text, target });
  }

  function resultMessage(result, target) {
    if (!result) return "";
    if (result.mode === "shared") return `Shared ${result.files} PDF${result.files === 1 ? "" : "s"}${result.linked ? ` (+${result.linked} as a link)` : ""}. In WhatsApp choose ${target && target.kind === "group" ? "the group" : target && target.kind === "phone" ? "the student's chat" : "the chat"} and press send.`;
    if (result.mode === "cancelled") return "Share cancelled - nothing was sent.";
    if (result.mode === "needs-tap") return "The PDF is ready - press the send button once more.";
    const parts = [];
    parts.push(target && target.kind === "group" ? "The group is opening in WhatsApp" : target && target.kind === "phone" ? "The student's chat is opening in WhatsApp" : "WhatsApp is opening");
    if (result.files) parts.push(`${result.files} PDF${result.files === 1 ? "" : "s"} downloading - drag ${result.files === 1 ? "it" : "them"} from the download bar into the chat`);
    if (result.copied) parts.push("the message is copied - paste it with Ctrl+V");
    return `${parts.join("; ")}.`;
  }

  /* Small shared control: the two modes as radio buttons. */
  function modeControlHtml(name) {
    const mode = getMode();
    const sheet = sheetSupported();
    return `<fieldset class="wa-mode" data-wa-mode-wrap>
      <legend>How to send</legend>
      <label><input type="radio" name="${name}" value="direct" data-wa-mode ${mode === "direct" ? "checked" : ""}> <span><b>Open the chat directly</b> &mdash; the group opens in WhatsApp, the PDFs download: drag them in and paste the message</span></label>
      <label${sheet ? "" : ' class="is-off"'}><input type="radio" name="${name}" value="sheet" data-wa-mode ${mode === "sheet" ? "checked" : ""} ${sheet ? "" : "disabled"}> <span><b>Share window</b> &mdash; PDFs attached; choose WhatsApp, then the chat${sheet ? "" : " (not available in this browser)"}</span></label>
    </fieldset>`;
  }

  root.EliteWaSend = { canShareFiles, sheetSupported, isMobile, getMode, setMode, targets, send, chatUrl, appUrl, inviteCode, resultMessage, download, modeControlHtml };
})(window);
