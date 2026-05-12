# Elite IGCSE Mathematics — Operator Handbook

The live student website for **Edexcel IGCSE 4MA1 Higher Mathematics** by Dr Eslam Ahmed.

This document is the single source of truth for running and updating the site. Read the **Common Tasks** and **Private answer workflow** sections first — those cover 95% of what you'll do.

> Last updated: 2026-05-07 · Section index: §1 Live URLs · §2 Stack · §3 Directory tree · §4 Common tasks · **§5 Private answer workflow** · §6 Local testing · §7 Deploy · §8 Settings cheat-sheet · §9 Gotchas · §10 Troubleshooting · §11 Credits

## Quick start (the 4 things you'll do most)

| If you want to... | Go to | TL;DR |
|---|---|---|
| **Update private answer review** | §5 | Use the private workflow outside the public site |
| **Change a price** | §4.1 | Search `p-now` in `index.html` and `about.html`, replace |
| **Update a testimonial** | §4.2 | Edit `<article class="testimonial light">` blocks in `about.html` |
| **Replace your photo** | §4.5 | Drop new image at `assets/Mine.png` (overwrite), commit, push |
| **Check saved student progress** | `/progress.html` | Name, target, topic sheet, backup export/import, WhatsApp summary |
| **Activate free Google progress login** | `docs/firebase-free-setup.md` | Firebase Spark plan, Google login, Firestore rules, paste config |
| **Fast Firebase checklist** | `docs/firebase-activation-short.md` | Short click-by-click activation checklist |

**Deploy = `git push`**. GitHub Pages rebuilds in 30–90 seconds. Live URL: **https://eliteigcse.com**.

---

## 1. Live URLs & repo

| Where | URL |
|---|---|
| **Production site** | https://eliteigcse.com (or `https://www.eliteigcse.com`) |
| GitHub Pages mirror | https://eslamahmedgaber.github.io/elite-igcse-math/ |
| GitHub repo | https://github.com/EslamAhmedGaber/elite-igcse-math |
| Domain registrar | Namecheap (auto-renews on **2027-05-05**) |
| Local working copy | `C:\Users\Eslam\Documents\Elite IGCSE v2\website` |

Pages served:

- `/` — Home (sales/landing)
- `/practice.html` — Question bank tool (the daily-use page)
- `/exam.html` — Free mock exam mode with timer, self-marking, and Mistake Box integration
- `/progress.html` — Personal progress sheet, saved profile, topic tracker, backup import/export
- `/checkup.html` — Exam readiness check and next-action recommender
- `/topics.html` — Topic roadmap
- `/notes.html` — Visual notes library
- `/planner.html` — Study plan generator
- `/about.html` — Dr Eslam bio + testimonials + pricing
- `/downloads.html` — Free PDF books

---

## 2. Stack — what runs where

- **Pure static site.** No backend, no build step, no framework. HTML + CSS + vanilla JS only.
- **Hosted on GitHub Pages** from the `main` branch root (`/`).
- **Deploys automatically** on every push to `main`. Pages takes 30–90 seconds to rebuild.
- **HTTPS** is provisioned by GitHub via Let's Encrypt and renews automatically.
- **DNS** at Namecheap → 4 A records (185.199.108–111.153) on `@` and a CNAME on `www` → `eslamahmedgaber.github.io.`
- If the browser says **Not secure**, open GitHub repo → **Settings → Pages**, wait until the custom-domain DNS check passes, then tick **Enforce HTTPS**. DNS is already correct in this repo setup; the final certificate switch is a GitHub Pages setting.

> **Deploy rule:** push to `main` = ship. There's no preview environment. Always test locally first (see §6).

---

## 3. Directory tree

```
website/
├── index.html              # Home page
├── practice.html           # Question bank page
├── exam.html               # Mock exam mode
├── progress.html           # Personal student progress sheet
├── checkup.html            # Exam readiness check
├── topics.html             # Topic roadmap
├── notes.html              # Visual notes library
├── planner.html            # Study plan generator
├── about.html              # About Dr Eslam
├── downloads.html          # PDF library
│
├── styles.css              # All styles for all pages
├── app.js                  # Practice-bank logic (only loaded on practice.html)
├── exam.js                 # Mock exam timer, self-marking, and Mistake Box integration
├── progress.js             # Saved profile, topic sheet, progress backup import/export
├── cloud-progress.js       # Optional free Firebase Google login + cloud progress sync
├── firebase-config.js      # Public Firebase config; disabled until you paste free project keys
├── lead.js                 # Lead-capture dialog + mobile nav (loaded on every page)
├── service-worker.js       # PWA install/offline shell + runtime cache for opened assets
├── manifest.webmanifest    # Installable app metadata
├── questions-data.js       # 1,188 questions metadata (~1 MB) — generated, do not hand-edit
├── private_output/         # Private answer material kept out of the public site
├── offline.html            # Offline fallback page
├── 404.html                # Friendly not-found page
├── robots.txt
├── sitemap.xml
│
├── CNAME                   # Custom-domain marker for GitHub Pages: "eliteigcse.com"
├── .nojekyll               # Tells GitHub Pages: serve files as-is, no Jekyll processing
├── .gitignore
├── README.md               # This file
│
├── assets/
│   ├── Mine.png            # Dr Eslam's headshot (home hero card + about hero portrait)
│   ├── og-image.png        # 1200×630 social-share card (Facebook/WhatsApp/Twitter)
│   ├── og-image.svg        # Vector source for the OG card
│   ├── build_og.py         # Pillow script that regenerates og-image.png from scratch
│   ├── questions_all/      # 974 cropped question PNGs for the full bank
│   └── questions_expertise/  # 214 cropped Q20+ question PNGs
│
└── downloads/
    ├── Classified_Problems_Corrected_Watermarked.pdf      # Full classified bank, corrected + Dr Eslam watermark
    ├── Classified_Expertise_Corrected_Watermarked.pdf     # Q20+ expertise book, corrected + Dr Eslam watermark
    ├── classified_problems.pdf                            # Legacy filename kept for older links
    └── Classified_Expertise.pdf                           # Legacy filename kept for older links
```

Private teacher PDFs with answers are generated outside the public website at:

- `C:\Users\Eslam\Documents\New project 5\classified_exam_problems\private_output\answer_books\classified_problems_with_answers.pdf`
- `C:\Users\Eslam\Documents\New project 5\classified_exam_problems\private_output\answer_books\Classified_Expertise_with_answers.pdf`

Do **not** copy those answer PDFs into `website/downloads/` unless you intentionally want to make them public.

---

## 4. Common tasks

All edits follow the same rhythm: **edit file → preview locally → commit → push → check live in ~1 minute**.

### 4.1 Change a price

**Files:** `index.html` and `about.html` (pricing cards appear on both).

Search for the dollar amount or `EGP / session` and replace. Example: change Group from `$12` to `$14`:

1. Open `index.html`, find `<span class="p-now">$12</span>` in the Group card → change to `$14`.
2. Update the matching strikethrough `<span class="p-old">$18</span>` if you want.
3. Update the EGP line if the rate changed.
4. **Repeat in `about.html`** — same card.
5. Also check `assets/build_og.py` if the headline `$12` price needs to change in the social-share image, then re-run it (see §4.6).

### 4.2 Edit the testimonials

**Files:** `about.html` only. They no longer appear on Home (Home links to About).

Find `<article class="testimonial light">` blocks. Each has:

```html
<article class="testimonial light">
  <span class="t-grade">9</span>
  <blockquote>"…the quote text…"</blockquote>
  <cite>— First name, school/country</cite>
</article>
```

Replace the quote and the cite line. **Always use real student quotes** — never fabricated. If you only have voice-note approval, paraphrase faithfully and confirm with the student that they're OK with the wording.

### 4.3 Update Dr Eslam's bio / credentials

**File:** `about.html`. Edit:
- The intro paragraph in `<section class="about-hero">`
- The `<ul class="credentials-list">` items

If credentials change in a way that affects the home page hero, also edit `index.html` (search for "Cairo University").

### 4.4 Add or replace a PDF download

**Folder:** `downloads/`

1. Drop the new PDF into `downloads/`.
2. If you want existing links to keep working, **rename** the new file to match the existing one (e.g. `classified_problems.pdf`) and overwrite.
3. If it's a brand-new download, also add a `<article class="download-card">` to `downloads.html`.
4. **Hard limit:** GitHub blocks files >100 MB. Soft warning at 50 MB. If a PDF approaches 100 MB, reduce its size (Acrobat → "Reduce File Size") rather than committing it.

### 4.5 Replace the headshot

Drop the new image at `assets/Mine.png` (overwrite). It's referenced as `assets/Mine.png` from:
- `index.html` (home hero card + trust panel)
- `about.html` (about hero portrait)

Square aspect ratio works best (it's displayed in a circle).

### 4.6 Regenerate the social-share image

The social-share PNG (`assets/og-image.png`) is what shows when someone pastes the site link into WhatsApp / Facebook / Twitter. To change the headline price, copy, or design:

```powershell
"C:/Users/Eslam/Documents/New project 5/classified_exam_problems/.venv/Scripts/python.exe" assets/build_og.py
```

The script uses Pillow (already in the existing venv). Edit the constants at the top of `assets/build_og.py` to change colors / text / price hook, then re-run. The script writes `assets/og-image.png` in place.

> **OG cache:** Facebook and WhatsApp aggressively cache OG images. After re-uploading, paste the URL into the [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) → "Scrape Again" to refresh.

### 4.7 Add a new page

1. Copy `about.html` as a starting point — it has the simplest structure.
2. Change `<title>`, `<meta name="description">`, `<body data-page="…">`.
3. Update the `<nav>` block: only the new page's `<a>` should have `aria-current="page"`.
4. Add a link to the new page in the topbar nav of **all four** existing pages and in the footer's "Pages" column.
5. Push.

---

## 5. Private answer workflow

The public site does **not** ship answer files. Any answer-review material should stay in the private project and only be copied into the public site if that is an intentional release.

If you are updating answer review for the private build:

1. Work in the private project that stores the answer sources.
2. Rebuild the private output there.
3. Keep the resulting answer files out of the public website repo.

> **Don't hand-edit `questions-data.js`.** It's regenerated from the upstream classifier and any manual change will be wiped the next time the dataset is rebuilt.

---

## 6. Test locally before pushing

You can just double-click `index.html` and most things work. But some features (like fetching neighbouring pages) behave better over HTTP. To run a real local server:

```powershell
cd "C:\Users\Eslam\Documents\Elite IGCSE v2\website"
python -m http.server 8000
```

Open http://localhost:8000 — every page works, links between pages work, MathJax renders.

**Before every push, click through:**
- Home → click Practice link → grid of questions loads
- On Practice → click a question → image opens in dialog
- On Practice → open a question card and confirm the page layout and image zoom behave cleanly
- Click any "Book Free First Class" / "Enroll" → lead form opens, submit goes to WhatsApp
- Resize browser to phone width → hamburger menu appears and works

---

## 7. Deploying (push to ship)

You can use either GitHub Desktop or the command line.

### GitHub Desktop

1. Open the repo in GitHub Desktop. It already knows about this folder.
2. Bottom-left: write a one-line commit message describing what you changed.
3. Click **Commit to main**.
4. Top: click **Push origin**.
5. Within 90 seconds, https://eliteigcse.com is updated.

### Command line

```powershell
cd "C:\Users\Eslam\Documents\Elite IGCSE v2\website"
git add -A
git commit -m "Update site content and pathway flow"
git push
```

After push, you can verify the build:
- https://github.com/EslamAhmedGaber/elite-igcse-math/actions — green check = deployed.
- Hard-refresh the live page (Ctrl-F5) to bypass the browser cache.

> **Don't push secrets** (API keys, tokens, passwords). Public repo. The token in your Git Credential Manager is fine — that's local-only — but never paste credentials into source files.

---

## 8. Settings cheat-sheet

| Thing | Where to change it | Notes |
|---|---|---|
| Course prices (USD) | `index.html` + `about.html`, search `p-now` | Update the strikethrough `p-old` too |
| Course prices (EGP) | Same files, search `p-egp` | Group 350 / Private 700 / Intensive 850 |
| Class size, frequency, duration | `index.html` + `about.html`, in `<ul class="p-meta">` | Per-card |
| WhatsApp number | All HTML files + `lead.js` (`LEAD_PHONE`) | Currently `201120009622` |
| OG image headline `$12` | `assets/build_og.py` then re-run | See §4.6 |
| Page titles & meta description | Top of each `.html` file | Important for Google |
| Footer copy | All 4 HTML files (duplicated) | Single-source via JS template later if it gets painful |

---

## 9. Common gotchas

1. **GitHub Pages takes 30–90s to rebuild.** A push doesn't show instantly. Wait, then hard-refresh.
2. **Browser caching after pushes.** Use Ctrl-F5 (Windows) or Cmd-Shift-R (Mac).
3. **OG image cache on Facebook/WhatsApp.** Use the [FB Sharing Debugger](https://developers.facebook.com/tools/debug/) "Scrape Again" button.
4. **MathJax silent failure.** If a solution renders raw `\(...\)` instead of math, you forgot to double-escape. JSON strings need `\\(` not `\(`.
5. **Custom domain still showing https warning.** First HTTPS cert provisioning can take up to 30 min after DNS resolves. Be patient.
6. **PDF push fails with "file too large".** GitHub hard-limits 100 MB per file. Reduce the PDF (Acrobat → Reduce File Size) or host it on Google Drive and link out.
7. **Question image missing for a new question.** The `image` field in `questions-data.js` points to `assets/questions_all/all_qNNNN.png` or `assets/questions_expertise/expertise_qNNNN.png`. The PNG must exist at that path with that exact name.

---

## 10. When something breaks — first 5 things to check

1. **Hard-refresh** the page (Ctrl-F5). 80% of "it's broken" is browser cache.
2. **Open browser DevTools → Console** (F12). Any red errors? Read them — they usually name the offending file and line.
3. **GitHub Actions tab** of the repo. Was the latest deploy green? If red, it'll tell you why (rare for static sites).
4. **DNS sanity:** `nslookup eliteigcse.com 8.8.8.8` should return the four 185.199.x.x IPs. If not, DNS is wrong.
5. **Cert sanity:** open https://eliteigcse.com — if browser warns "Not Secure", the cert isn't issued yet. Wait 15 min and refresh.

---

## 11. Credits & contact

**Dr Eslam Ahmed** — Assistant Lecturer, Cairo University Faculty of Engineering.
WhatsApp / phone: +20 112 000 9622 · [`https://wa.me/201120009622`](https://wa.me/201120009622)

Site built with Claude Code as collaborator. All teaching content, classification, and student outcomes belong to Dr Eslam.

