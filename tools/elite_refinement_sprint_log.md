# Elite UI Refinement Sprint — 2026-05-28

Dr Eslam asked for an "elite" feel across the whole site. Started with a token/CSS audit that found 10+ random border radii, 12+ scattered shadows, hardcoded vermilion accents on every primary button, h1 sizes capped at 54px, and inconsistent eyebrow weights. Ran six surgical phases plus several extras until the user said the changes were landing.

## Phase 1 — Design tokens, pathway buttons, typography (commit `66bfaf2`)

- Added canonical scale at `:root` in `styles.css`:
  - Radii: `--r-sm 8` / `--r-md 12` / `--r-lg 20` / `--r-pill 999`
  - Shadows: `--shadow-sm` (0 2px 8px @.06) / `--shadow-md` (0 8px 24px @.08) / `--shadow-lg` (0 16px 40px @.12)
  - Letter spacing: `--letter-display -0.01em` / `--letter-body 0` / `--letter-eyebrow 0.08em`
  - Motion: `--ease-out cubic-bezier(0.16, 1, 0.3, 1)` + `--t-fast 150ms` + `--t-base 220ms`
- `.button.primary` was hardcoding `var(--accent)` (vermilion red). Swapped to `var(--course-signature)` so Linear CTAs read Inkwell, Modular reads Verdigris, Pure 1 reads Indigo. Hover uses `--course-deep`.
- `h1` clamp(30, 4vw, 54) -> clamp(28, 3.2vw, 44) with `--letter-display` and weight 800. `h2` clamp(20, 2.2vw, 26) and new `h3` clamp(17, 1.6vw, 20).
- `.button` font-weight 700 -> 600 default with `.primary` keeping 700 explicit.

## Phase 2 — Icons in tiles + focus/hover polish (commits `ed37e9d` + `5df077a`)

- Added `MODULE_ICONS` dict in `lead.js` — 11 inline SVG icons (Classified=list, Expertise=star, Build Test=lightning, Smart Revision=refresh, Progress=chart, Mistake Box=warning triangle, Saved Tests=bookmark, Books=open book, Answer Books=check shield, Past Papers=document, Unit Choice=2x2 grid + general fallback).
- `renderToolStripLink` prepends `getModuleIcon(moduleKey(link))` before the title and wraps the title/detail in `.module-text`.
- CSS: tiles 2-col grid 40px + 1fr, icon sized 26px tinted with `--module-accent`, scales to 1.08 + flips to currentColor on hover/focus.
- Discovered Pure 1's hardcoded `.ial-builder-links` block bypassed `lead.js` and never got icons. Built `ensureIconsOnTiles()` runtime injector that scans both `.pathway-tool-strip-links a` and `.ial-builder-links a`, derives the module key from `data-module` or title with alias translation, then injects the SVG icon.
- Global `:focus-visible` outline tightened from 3px to 2px with 3px offset, and `<a>` gets a subtle underline on focus.

## Phase 3 — Section rhythm + 4-column footer (commit `91e85f7`)

- `.home-proof-pricing`: border-radius 8 -> --r-lg, vellum gradient + --shadow-md.
- `.feature-tabs`: padding 28 -> 36/40, --shadow-md, softer border tone.
- `.page` gap 28 -> 40 (24 mobile), padding-bottom 60 -> 72.
- Canonical footer applied to all 10 pages via Python regex. 4 columns: Brand+Tagline / Pathways / Modules / Connect.
- Brand column introduces `.footer-brand-line`, `.footer-brand-tagline` (18px white display), `.footer-brand-blurb`.
- Pathways column foreshadows: "Pure 2 / Stats 1 / Mech 1 — coming".
- Footer background: flat #0c1c2c -> layered ochre wash + navy gradient. Top edge gets a 2px brand-rainbow strip (ink -> verdigris -> indigo -> ochre) fading on both sides.
- Footer section heads 14 -> 12px eyebrow weight 800, smooth ochre hover.
- Responsive: 4-col -> 2-col at 960px, 1-col at 560px.

## Phase 4 — Form fields + question card pseudo-rail (commit `84be0fa`)

- Inputs and selects across `.filters`, `.practice-filter-bar`, `.practice-filter-advanced`, `.worksheet-card`, `.sort-label`, `.ial-filters`:
  - min-height 36 -> 40, border-radius 6 -> --r-sm, softer warm rgba border, font-weight 500
  - Hover border -> --course-signature, focus -> outline none + course-signature border + 3px --course-soft ring
  - Selects get a custom inline SVG chevron (consistent across browsers)
  - Placeholder 42% muted with weight 400
- `.question-card`: border-radius 8 -> --r-md, softer border, --shadow-sm at rest -> --shadow-md on hover, 3px left pseudo-rail that animates in on hover taking `--course-signature`. `.selected` gets a 2px gold ring + gold rail; `.solved` keeps cream bg and lights a verdigris rail.

## Phase 5 — Pricing + mobile nav + dropdowns + portrait halo (commit `b1ba51b`)

- `.pricing-card`: border-radius 16 -> --r-md, padding 22 -> 28/26, --shadow-sm at rest -> --shadow-lg on hover with --course-signature border. 3px pseudo top-rail tinted with --course-signature (ochre for `.highlight`).
- `.p-tag`: hardcoded red -> --course-soft bg + --course-signature text + --r-pill.
- Mobile bottom nav: 5-col -> 4-col grid, backdrop-filter blur(14px) -> blur(20px) saturate(140%), triple-layer shadow, active state now --course-signature with --course-soft halo, scale(0.95) on tap.
- `.nav-tab-main` weight 800 -> 700, --letter-display, --r-md radius.
- `.nav-panel` border-radius 18 -> --r-lg, backdrop-filter blur(16px) saturate(140%), shadow --shadow-lg. Entry animation: opacity + 8px translate + scale(0.98) on --t-base.
- `.trust-portrait`: conic-gradient halo behind the portrait (ochre cycle, 2px blur at 55% opacity). Border 4px ochre -> 3px white with triple-layer shadow.

## Phase 6 — Card/eyebrow unification + entrance animations (commit `6199a85`)

- `.feature-card`, `.path-card`, `.feature-tab`, `.pricing-card`, `.pathway-tool-strip-links a` all converge on the same recipe: --r-md radius, 1px soft warm border, --shadow-sm -> --shadow-md hover, translateY(-2px) lift, border -> --course-signature.
- `.feature-card a` color hardcoded red -> --course-signature with --course-deep hover.
- `.feature-kicker` rose -> --course-signature + eyebrow letter-spacing.
- `.eyebrow` base unified: --brand-ochre, 11px (was 12), --letter-eyebrow token, weight 800. Added `.eyebrow-on-dark` and `.eyebrow-course`. Removed bespoke overrides on `.trust-head .eyebrow` and `.pricing-head .eyebrow`.
- Two keyframes at `:root`: `elite-fade-up` (14px lift) and `elite-fade-in`. `.page > section` and `.ial-page > section` animate fade-up 540ms ease-out cubic-bezier, staggered every ~70ms for the first five sections. Wrapped in `prefers-reduced-motion: reduce` -> animation: none.

## Bonus 1 — SITE_TREE hierarchical architecture (commit `28e43ae`)

- Added a `SITE_TREE` at the bottom of `course-modules.js` as the single source of truth for navigation hierarchy. Three top-level pathways (Linear/Modular/IAL). Modular has Unit 1 + Unit 2 children. **IAL becomes a real parent** with four children: Pure 1 (live), Pure 2 (planned), Statistics 1 (planned), Mechanics 1 (planned). Each entry: id, label, code, palette, href, status.
- `ELITE_COURSE_MODULES.siteTree` exports it; registry version bumped to `v7-tree`.
- New page `/ial/index.html` as the IAL Mathematics hub. `data-page="ial-hub"`.
- `lead.js` `renderIalSubjectHub()` reads SITE_TREE and paints one card per subject. Live subjects clickable; planned subjects render `.is-coming` with a "Coming soon" pill, desaturated, pointer-events disabled.
- Each card carries its subject palette (`.is-pure` = Indigo, `.is-mulberry` = Pure 2, `.is-amber` = Stats 1, `.is-teal` = Mech 1) with a top accent rail.
- `buildBreadcrumbCrumbs()` recognises `body[data-page="ial-hub"]` and emits `Home / IAL`. For any Pure 1 page, the breadcrumb now reads `Home / IAL Edexcel / Pure 1 WMA11 / [module]`.

## Bonus 2 — Top nav IAL parent + sticky shrinking header (commit `5547480`)

- `rewriteIalTopNavFromTree()` in `lead.js`: at bootstrap, finds `.nav-group-pure`, switches the tab label from "IAL Pure 1 / WMA11" to "IAL / International A-Level", points the tab href at `/ial/index.html`, and rewrites the nav-panel from SITE_TREE.ial.children. One data change in SITE_TREE updates the dropdown across all 14 pages.
- Pure 1 renders as a live `<a>`, Pure 2 / Stats 1 / Mech 1 render with `.is-coming` + aria-disabled + a small "Soon" pill via CSS `::after`.
- `initShrinkingHeader()` in `lead.js`: passive scroll listener wrapped in requestAnimationFrame; toggles `body.is-scrolled` at scrollY > 24.
- `.site-header` gets smooth --t-base transition. `body.is-scrolled .site-header` -> padding 14/28 to 8/28, brand title 14px, nav tab smalls hide.

## Bonus 3 — Breadcrumb / counters / past papers (commit `4063950`)

- Breadcrumb upgraded:
  - font 12 -> 14px, weight 700 -> 800, current crumb is 900
  - link color rgba(26,24,21,.72), current crumb full --course-signature, hover gains 2px course-signature underline
  - Sub code chip 10 -> 11px weight 800
  - margin-top 14 -> 4 (pulls tight under header), padding 14/0/12, 1px bottom border
  - Separator "/" 16px 32% opacity weight 400
  - body.is-scrolled .elite-breadcrumb compresses to 12px + 8/0/6
- `initAnimatedCounters()` in `lead.js`: IntersectionObserver at 40% threshold, targets `.stats-band strong`, `.hero-stat-strip strong`, `.home-hero strong[data-count]`, `.review-summary strong`, `.pathway-stats strong`. Parses leading integer + suffix, animates 0 -> target over 1.1s on cubic ease-out via requestAnimationFrame. One-shot per element via WeakSet. Skips values under 5.
- Past Paper Solutions rows redesigned:
  - `.pp-year-block h3`: 18px course-signature, 4px course rail, soft border-bottom
  - `.pp-session`: flat chip -> real card (white bg, --r-md, 4px course-signature left rail, --shadow-sm at rest, --shadow-md and 1px lift on hover)
  - `.pp-paper`: --r-sm, course-tinted, "PDF" prefix is a proper 10px chip with bg
  - `.pp-paper.solution`: warm ochre treatment with "SOL" chip

## Bonus 4 — Page heroes pathway-tinted (commit `ce64893`)

- Six page heroes (`.home-hero`, `.practice-hero`, `.exam-hero`, `.checkup-hero`, `.notes-hero`, `.planner-hero`, `.topics-hero`, `.pp-hero`) were each hardcoding the original red-navy gradient. They now all read from --course-signature / --course-deep with a radial ochre top-right glow and a 3px ochre fade strip along the bottom edge via `::after`.
- `.practice-hero` typography refined: eyebrow 12 -> 11px weight 800 + ochre-soft, h1 weight 800 with --letter-display, p line-height 1.55.
- `.exam-hero` / `.exam-builder` eyebrow normalised to 11px + token spacing.

## Bonus 5 — Subtle premium background + smooth scroll (commit `d146f89`)

- html scroll-behavior: smooth + scroll-padding-top: 92px. Disabled under prefers-reduced-motion.
- Body background gets two new radial gradients on top of the existing grid + diagonal:
  1. Ochre glow ~800x480 at top-left
  2. Course-tinted glow ~800x600 at top-right — uses var(--course-soft) so each pathway carries its own wash
- background-attachment: fixed on every layer (depth feel without JS parallax).

## Bonus 6 — Welcome banner + quick stats (commit `9f57258`)

- `.pathway-resume` welcome banner: flat horizontal red wash full-bleed -> centered to 1240px, --r-md, 4px --course-signature left rail, --course-soft + ochre wash, --shadow-sm. Link gets 2px underline -> full course-signature on hover.
- `.quick-stats` cards: center-aligned boxes with gray dividers -> proper card with --r-md, --shadow-sm, --course-soft wash. Each stat: 3px --course-signature left rail, number 21 -> 26px course-signature --letter-display, label 12 -> 10px uppercase --letter-eyebrow.

## Bonus 7 — Bank panel + Tools dialog (commit `d980c09`)

- `.bank-panel`: 4px --course-signature left rail, --course-soft wash, --r-md, --shadow-sm.
- Active bank button: hardcoded --navy -> --course-signature with --course-soft glow ring.
- `.practice-tools-dialog`: border-radius 12 -> --r-lg, 3px --course-signature top stripe, --shadow-lg, 240ms elite-fade-up entry.
- `::backdrop`: flat 38% black -> radial ochre glow + 48% black + 4px blur (frosted glass).

## Bonus 8 — Home pathway picker + features (commit `c20343e`)

- `.home-pathway-choice`: min-height 132 -> 148, padding 18 -> 22/22/24, border-radius 8 -> --r-md, 5px top rail per pathway via --choice-accent / --choice-deep. Added `::after` arrow "->" that slides 4px right on hover. Hover: 3px lift, course-color border, double shadow.
- `.hero-stat-strip`: stat number 22 -> 26px --brand-ochre-soft weight 800 --letter-display. Label 13 -> 11px uppercase --letter-eyebrow.
- `.feature-tab`: radius 14 -> --r-md, padding 15 -> 22/20, min-height 154 -> 168, --shadow-sm -> --shadow-md hover. 3px course-signature left pseudo-rail fades in on hover. Eyebrow chip uses --course-soft / --course-signature.
- `.feature-open-links` pathway chips auto-tint by destination: `[href*=pathway=linear]` hovers Inkwell, `[href*=pathway=modular]` hovers Verdigris, `[href*=wma11]` hovers Indigo.

## Cache versions through the sprint

- styles.css: `20260527g -> h -> i -> j -> 20260528a -> b -> c -> d -> e -> f -> g -> h -> i -> j`
- lead.js: `20260527d -> e -> 20260528a -> b -> c -> d`
- service-worker: `v98 -> v99 -> v100 -> ... -> v115`
- `tools/verify_pipeline.py` pin updated each time lead.js cache moved.

## Verification

- `node --check lead.js` and `node --check course-modules.js` after every change.
- `python tools/verify_pipeline.py` passed at every commit (179 WMA11 + 1413 IGCSE solutions).
- Live verification via curl after each push waited on `kill-v{N}` appearing in `service-worker.js`.

## Files modified across the sprint

- `styles.css` (every commit)
- `lead.js` (icons, breadcrumb, IAL hub renderer, IAL nav rewriter, shrinking header, counters, runtime icon injector)
- `course-modules.js` (SITE_TREE)
- `service-worker.js` (cache bumps)
- `tools/verify_pipeline.py` (lead.js pin updates)
- `ial/index.html` NEW
- 11 HTML pages: about, checkup, downloads, exam, index, pastpapers, practice, progress, topics, ial/wma11/index, ial/index

## Done and verified visible on `eliteigcse.com` at v115

1. Breadcrumb prominent at the top of every pathway page, pathway-tinted, shrinks with header on scroll.
2. Icons in every module tile + Pure 1 hardcoded `.ial-builder-links` block.
3. Animated stat counters on home and other stat strips.
4. Page heroes pathway-tinted on home/practice/exam/checkup/notes/planner/topics/pastpapers.
5. Welcome banner + quick stats cards with course rails + ochre wash.
6. Bank panel + Tools dialog course-aware with frosted backdrop.
7. Home pathway picker cards with arrow indicators + double-shadow hover.
8. Home feature-tab cards with course left rail + course chips by destination.
9. Pricing cards: course top rail + ochre on `.highlight`.
10. Mobile bottom nav: 4-col frosted glass, course active state, scale-on-tap.
11. Site header sticky + shrinking on scroll across all pages.
12. SITE_TREE drives nav structure: Home > Linear / Modular / IAL > drill down.
13. IAL hub at `/ial/` lists Pure 1 live + Pure 2 / Stats 1 / Mech 1 with "Coming soon" pills.
14. Past Paper Solution rows are real cards with PDF / SOL chips.
15. Body background: pathway-tinted radial glow top-right + ochre top-left + grid pattern + fixed attachment.
16. Smooth scroll site-wide with scroll-padding-top.

## Post-Sprint Polish Commits

- `67d8301`: Downloads cards, solution dialog, topic bars, review stats, and About hero polish. CSS moved to `20260528k`; service worker moved to `v116`.
- `4d858dc`: Plan weeks, topic chips, and progress summary card were unified around course colours. CSS moved to `20260528l`; service worker moved to `v117`.
- `63a7219`: Home hero portrait halo, exam mode tabs, and roadmap meter polish. CSS moved to `20260528m`; service worker moved to `v118`.
