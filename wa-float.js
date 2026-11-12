// Floating help buttons, bottom right on every page:
//   "Sign in free" (Google) pill, shown only while signed out, and the WhatsApp button (as on Elite IG Lab).
// Self-contained (injects its own styles) so it works on app pages and the static topic/course pages.
// App pages: the pill is a [data-cloud-login] button, so cloud-progress.js opens Google sign-in.
// Static pages (no Firebase): the pill opens the home page with ?signin=1, which shows the sign-in card at once.
// Sits above the phone shortcut bar, hides while a mock exam is being sat, never prints.
(function () {
  if (document.querySelector('.elite-fabs')) return;
  const PHONE = '201120009622';
  const WA_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4a.5.5 0 0 0 0-.4l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.7a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z"/></svg>';
  const G_SVG = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
  const CSS = `.elite-fabs{position:fixed;right:18px;bottom:calc(18px + var(--wa-lift,0px));z-index:65;display:flex;flex-direction:column;align-items:flex-end;gap:10px;pointer-events:none}
.elite-fabs>*{pointer-events:auto}
.wa-float{width:56px;height:56px;border-radius:50%;background:#25d366;color:#fff;display:grid;place-items:center;box-shadow:0 8px 22px rgba(0,0,0,.22);text-decoration:none;transition:transform .15s ease,box-shadow .15s ease}
.wa-float:hover{transform:scale(1.07);box-shadow:0 10px 28px rgba(0,0,0,.28);color:#fff}
.wa-float svg{width:30px;height:30px}
.signin-float{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:8px 16px 8px 10px;border:1.5px solid #e2c36d;border-radius:999px;background:#0f2140;color:#fff;font:600 14px/1.2 inherit;font-family:inherit;box-shadow:0 8px 22px rgba(15,33,64,.28);cursor:pointer;text-decoration:none;transition:transform .15s ease,box-shadow .15s ease}
.signin-float:hover{transform:translateY(-2px);box-shadow:0 12px 28px rgba(15,33,64,.34);color:#fff}
.signin-float .g{width:26px;height:26px;border-radius:50%;background:#fff;display:grid;place-items:center;flex:none}
.signin-float .g svg{width:17px;height:17px}
.signin-float[hidden]{display:none}
.elite-fabs a:focus-visible,.elite-fabs button:focus-visible{outline:3px solid #e2c36d;outline-offset:3px}
body.exam-sitting .elite-fabs{display:none}
@media (max-width:640px){.elite-fabs{right:14px}.wa-float{width:52px;height:52px}.wa-float svg{width:28px;height:28px}.signin-float{min-height:40px;font-size:13px;padding:6px 14px 6px 8px}}
@media print{.elite-fabs{display:none!important}}
.signin-card{position:fixed;right:18px;bottom:var(--elite-fab-space,150px);z-index:80;width:min(360px,calc(100vw - 32px));box-sizing:border-box;padding:18px 18px 14px;border-radius:16px;background:#0f2140;color:#fff;border:1px solid rgba(226,184,79,.55);box-shadow:0 18px 50px rgba(8,18,38,.4);font-family:inherit;transform:translateY(16px);opacity:0;transition:transform .25s ease,opacity .25s ease}
.signin-card.is-on{transform:none;opacity:1}
.signin-card small{display:block;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#e2b84f}
.signin-card strong{display:block;margin:6px 26px 6px 0;font-size:18px;line-height:1.3;color:#fff}
.signin-card p{margin:0 0 14px;font-size:14px;line-height:1.5;color:#c9d3e3}
.signin-card div{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.signin-card .go{display:inline-flex;align-items:center;gap:9px;min-height:42px;padding:8px 14px;border-radius:10px;background:#fff;color:#1f2937;font-size:14.5px;font-weight:700;text-decoration:none}
.signin-card .go:hover{background:#f1f5f9;color:#1f2937}
.signin-card .go .g{display:grid;place-items:center}
.signin-card .go svg{width:18px;height:18px}
.signin-card .later{min-height:42px;padding:8px 12px;border:0;background:transparent;color:#c9d3e3;font:inherit;font-size:14px;cursor:pointer}
.signin-card .later:hover{color:#fff;text-decoration:underline}
.signin-card .x{position:absolute;top:8px;right:8px;width:32px;height:32px;border:0;border-radius:8px;background:transparent;color:#aebbd0;font-size:20px;line-height:1;cursor:pointer}
.signin-card .x:hover{background:rgba(255,255,255,.1);color:#fff}
.signin-card em{display:block;margin-top:10px;font-style:normal;font-size:12px;line-height:1.4;color:#8ea0ba}
.signin-card a:focus-visible,.signin-card button:focus-visible{outline:3px solid #e2c36d;outline-offset:2px}
@media (max-width:640px){.signin-card{right:16px;left:16px;width:auto}}
@media (prefers-reduced-motion:reduce){.signin-card{transition:none}}
@media print{.signin-card{display:none!important}}`;
  const REMINDER_KEY = 'eliteSignInReminderV2'; // shared with cloud-progress.js
  // After signing in on the home page the student is sent back to the page they were reading.
  const SIGNIN_URL = `/?signin=1&next=${encodeURIComponent(location.pathname)}`;
  function hasAccount() {
    try { return localStorage.getItem('eliteSignedInV1') === '1'; } catch (err) { return false; }
  }

  function add() {
    if (document.querySelector('.elite-fabs')) return;
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    const box = document.createElement('div');
    box.className = 'elite-fabs';

    // Sign-in pill. With cloud-progress.js on the page it signs in directly; otherwise it goes to the home page.
    const hasCloud = Boolean(document.querySelector('script[src*="cloud-progress.js"]'));
    const signin = document.createElement(hasCloud ? 'button' : 'a');
    signin.className = 'signin-float';
    if (hasCloud) { signin.type = 'button'; signin.setAttribute('data-cloud-login', ''); signin.setAttribute('data-cloud-label', 'Sign in free'); }
    else signin.href = SIGNIN_URL;
    signin.innerHTML = `<span class="g">${G_SVG}</span><span>Sign in free</span>`;
    signin.title = 'Sign in free with Google: save your progress on every device';
    // App pages: wait until we know the student is signed out. Static pages: cloud-progress.js leaves a flag.
    signin.hidden = hasCloud || hasAccount();
    box.appendChild(signin);

    const title = document.title.replace(/\s*[|–-]\s*Elite.*$/, '').trim();
    const text = `Hello Dr Eslam, I have a question about Elite Mathematics${title ? ` (${title})` : ''}.`;
    const wa = document.createElement('a');
    wa.className = 'wa-float';
    wa.href = `https://wa.me/${PHONE}?text=${encodeURIComponent(text)}`;
    wa.target = '_blank';
    wa.rel = 'noopener';
    wa.setAttribute('aria-label', 'WhatsApp Dr Eslam');
    wa.title = 'WhatsApp Dr Eslam';
    wa.innerHTML = WA_SVG;
    box.appendChild(wa);
    document.body.appendChild(box);

    const layout = () => {
      // Keep clear of the phone shortcut bar, and tell the sign-in card how much room the buttons take.
      const bar = document.querySelector('.mobile-bottom-nav');
      const visible = bar && getComputedStyle(bar).display !== 'none' && getComputedStyle(bar).position === 'fixed';
      const lift = visible ? bar.getBoundingClientRect().height : 0;
      box.style.setProperty('--wa-lift', `${lift}px`);
      document.documentElement.style.setProperty('--elite-fab-space', `${Math.round(lift + box.getBoundingClientRect().height + 30)}px`);
    };
    const showFor = (user) => { signin.hidden = Boolean(user); layout(); };
    window.addEventListener('elite-cloud-state', (event) => {
      const detail = event.detail || {};
      if (detail.configured && detail.ready !== false) showFor(detail.user);
    });
    if (hasCloud) {
      const now = window.EliteCloud?.state?.();
      if (now?.configured && now.ready) showFor(now.user);
    }
    layout();
    window.addEventListener('resize', layout);
    new MutationObserver(layout).observe(document.body, {childList: true});
    if (!hasCloud) remind();
  }

  // Static pages (topic pages from Google): the same free sign-in reminder as the rest of the site.
  // It shares the reminder memory with cloud-progress.js, so a student is not asked twice in a row.
  function remind() {
    if (hasAccount() || navigator.webdriver) return;
    let saved;
    try { saved = JSON.parse(localStorage.getItem(REMINDER_KEY) || 'null') || {}; } catch (err) { return; } // storage blocked: do not nag
    const today = new Date().toISOString().slice(0, 10);
    const pages = Number(saved.pages || 0) + 1;
    const save = (next) => { try { localStorage.setItem(REMINDER_KEY, JSON.stringify(next)); } catch (err) { /* private mode */ } };
    save({...saved, pages});
    const due = !saved.shown || pages >= 3 || saved.staticDay !== today;
    if (!due || Date.now() - Number(saved.lastAt || 0) < 90000) return;
    setTimeout(() => {
      if (hasAccount() || document.querySelector('.signin-card')) return;
      const card = document.createElement('aside');
      card.className = 'signin-card';
      card.setAttribute('role', 'dialog');
      card.setAttribute('aria-labelledby', 'signinCardTitle');
      card.innerHTML = `<button class="x" type="button" aria-label="Close">&times;</button>
        <small>Free student account</small>
        <strong id="signinCardTitle">Sign in with Google, free forever</strong>
        <p>Mark the questions you solve, build your Mistake Box and keep your progress on every device. No password, no payment.</p>
        <div><a class="go" href="${SIGNIN_URL}"><span class="g">${G_SVG}</span>Continue with Google</a><button class="later" type="button">Not now</button></div>
        <em>Free and optional. We keep your name, email and progress; Dr Eslam can see who signed in and how much they study.</em>`;
      document.body.appendChild(card);
      const now = JSON.parse(localStorage.getItem(REMINDER_KEY) || 'null') || {};
      save({...now, shown: Number(now.shown || 0) + 1, lastAt: Date.now(), staticDay: today, pages: 0});
      const close = () => {
        card.classList.remove('is-on');
        setTimeout(() => card.remove(), 260);
        const then = JSON.parse(localStorage.getItem(REMINDER_KEY) || 'null') || {};
        save({...then, dismissed: Number(then.dismissed || 0) + 1});
      };
      card.querySelector('.x').addEventListener('click', close);
      card.querySelector('.later').addEventListener('click', close);
      card.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
      void card.offsetHeight;
      card.classList.add('is-on');
    }, 8000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add, {once: true});
  else add();
})();
