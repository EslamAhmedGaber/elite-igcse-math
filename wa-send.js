/* wa-send.js - send PDF files to WhatsApp from the Teacher Lesson Tracker.
   wa.me links cannot carry files, so:
   1. Where the browser can share files (phones; Chrome/Edge on Windows
      and Mac), the system share window opens with the PDFs attached and
      the message as caption - the teacher taps WhatsApp, then the chat.
   2. Otherwise (or when the teacher asks for it): the PDFs download, the
      message is copied, and the right chat opens - the saved WhatsApp
      group link, the student's number, or WhatsApp with no chat.
   Targets: { key, kind: "group"|"phone"|"any", label, url } */
(function (root) {
  "use strict";

  function canShareFiles(files) {
    try {
      return Boolean(files && files.length && root.navigator && root.navigator.canShare && root.navigator.share && root.navigator.canShare({ files }));
    } catch (error) {
      return false;
    }
  }

  function digitsOf(value) {
    return String(value || "").replace(/\D+/g, "");
  }

  /* ctx: { groupName, groupLink, phones: [{ number (digits), label }], studentName } */
  function targets(ctx) {
    const out = [];
    if (ctx && ctx.groupLink) {
      out.push({ key: "group", kind: "group", label: `Send to ${ctx.groupName ? (ctx.groupName.trim().toLowerCase().endsWith("group") ? ctx.groupName.trim() : `${ctx.groupName.trim()} group`) : "the WhatsApp group"}`, url: ctx.groupLink });
    }
    ((ctx && ctx.phones) || []).forEach((entry, index) => {
      const digits = digitsOf(entry.number);
      if (!digits) return;
      out.push({ key: `phone-${index}`, kind: "phone", label: `Send to ${entry.label || "student"}${ctx.studentName && (entry.label || "Student") === "Student" ? ` (${ctx.studentName})` : ""}`, digits, url: `https://wa.me/${digits}` });
    });
    out.push({ key: "any", kind: "any", label: out.length ? "Other chat…" : "Send on WhatsApp…", url: "https://wa.me/" });
    return out;
  }

  function chatUrl(target, text) {
    if (target.kind === "group") return target.url;
    if (target.kind === "phone") return `https://wa.me/${target.digits}?text=${encodeURIComponent(text || "")}`;
    return `https://wa.me/?text=${encodeURIComponent(text || "")}`;
  }

  function download(file) {
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name || "Elite.pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  async function copy(text) {
    try {
      await root.navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      return false;
    }
  }

  /* Fallback path. The chat window opens FIRST, while the click still
     counts as a user gesture, so popup blockers let it through. */
  async function fallback({ files, text, target }) {
    root.open(chatUrl(target, text), "_blank", "noopener");
    (files || []).forEach((file, index) => setTimeout(() => download(file), index * 350));
    const copied = text ? await copy(text) : false;
    return { mode: "fallback", files: (files || []).length, copied, url: chatUrl(target, text) };
  }

  async function send({ files = [], text = "", target, title = "", forceFallback = false }) {
    if (!target) throw new Error("No WhatsApp target.");
    if (!forceFallback && canShareFiles(files)) {
      try {
        await root.navigator.share({ files, text, title });
        return { mode: "shared", files: files.length };
      } catch (error) {
        if (error && error.name === "AbortError") return { mode: "cancelled" };
        if (error && error.name === "NotAllowedError") return { mode: "needs-tap" };
        /* any other share failure: fall through to the download path */
      }
    }
    if (!files.length) {
      /* Nothing to attach (links only): a normal WhatsApp message. */
      if (target.kind === "group") {
        const copied = await copy(text);
        root.open(target.url, "_blank", "noopener");
        return { mode: "fallback", files: 0, copied, url: target.url };
      }
      root.open(chatUrl(target, text), "_blank", "noopener");
      return { mode: "text", files: 0 };
    }
    return fallback({ files, text, target });
  }

  function resultMessage(result, target) {
    if (!result) return "";
    if (result.mode === "shared") return `Shared ${result.files} PDF${result.files === 1 ? "" : "s"}. In WhatsApp choose ${target && target.kind === "group" ? "the group" : target && target.kind === "phone" ? "the student's chat" : "the chat"} and press send.`;
    if (result.mode === "cancelled") return "Share cancelled - nothing was sent.";
    if (result.mode === "needs-tap") return "The PDF is ready - press the send button once more.";
    if (result.mode === "text") return "WhatsApp opened with the message.";
    const parts = [];
    if (result.files) parts.push(`${result.files} PDF${result.files === 1 ? "" : "s"} downloaded - drag ${result.files === 1 ? "it" : "them"} into the chat`);
    if (result.copied) parts.push("the message is copied - paste it with Ctrl+V");
    parts.push(target && target.kind === "group" ? "the group chat opened" : "WhatsApp opened");
    return `${parts.join("; ")}.`;
  }

  root.EliteWaSend = { canShareFiles, targets, send, chatUrl, resultMessage, download };
})(window);
