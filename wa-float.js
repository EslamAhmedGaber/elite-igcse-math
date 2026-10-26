// Floating WhatsApp button (bottom right), the same one Elite IG Lab has.
// Self-contained (injects its own styles) so it works on app pages and the static topic/course pages.
// Sits above the phone shortcut bar when that bar is showing, hides while a mock exam is being sat, never prints.
(function () {
  if (document.querySelector('.wa-float')) return;
  const PHONE = '201120009622';
  const SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4a.5.5 0 0 0 0-.4l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.7a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z"/></svg>';
  const CSS = `.wa-float{position:fixed;right:18px;bottom:calc(18px + var(--wa-lift,0px));width:56px;height:56px;border-radius:50%;background:#25d366;color:#fff;display:grid;place-items:center;box-shadow:0 8px 22px rgba(0,0,0,.22);z-index:65;text-decoration:none;transition:transform .15s ease,box-shadow .15s ease}
.wa-float:hover{transform:scale(1.07);box-shadow:0 10px 28px rgba(0,0,0,.28);color:#fff}
.wa-float:focus-visible{outline:3px solid #0f2140;outline-offset:3px}
.wa-float svg{width:30px;height:30px}
body.exam-sitting .wa-float{display:none}
@media (max-width:640px){.wa-float{right:14px;width:52px;height:52px}.wa-float svg{width:28px;height:28px}}
@media print{.wa-float{display:none!important}}`;

  function add() {
    if (document.querySelector('.wa-float')) return;
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    const title = document.title.replace(/\s*[|–-]\s*Elite.*$/, '').trim();
    const text = `Hello Dr Eslam, I have a question about Elite Mathematics${title ? ` (${title})` : ''}.`;
    const link = document.createElement('a');
    link.className = 'wa-float';
    link.href = `https://wa.me/${PHONE}?text=${encodeURIComponent(text)}`;
    link.target = '_blank';
    link.rel = 'noopener';
    link.setAttribute('aria-label', 'WhatsApp Dr Eslam');
    link.title = 'WhatsApp Dr Eslam';
    link.innerHTML = SVG;
    document.body.appendChild(link);

    // Keep clear of the phone shortcut bar at the bottom of course pages.
    const lift = () => {
      const bar = document.querySelector('.mobile-bottom-nav');
      const visible = bar && getComputedStyle(bar).display !== 'none' && getComputedStyle(bar).position === 'fixed';
      link.style.setProperty('--wa-lift', visible ? `${bar.getBoundingClientRect().height}px` : '0px');
    };
    lift();
    window.addEventListener('resize', lift);
    new MutationObserver(lift).observe(document.body, {childList: true});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add, {once: true});
  else add();
})();
