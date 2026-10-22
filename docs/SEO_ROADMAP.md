# Elite Mathematics search roadmap

Baseline review: 22 October 2026. Scope: the seven existing Edexcel courses.
This roadmap does not assert a search ranking, an indexing count, or an improvement in traffic. Search Console account data has not been inspected.

## Foundation release

- [x] Inspect live HTML before and after JavaScript on representative pages.
- [x] Verify robots.txt and sitemap availability.
- [x] Generate 28 static pages: seven course resource hubs, seven notes lists, seven book lists, seven past-paper lists.
- [x] Use existing course-modules.js and library-data.js as the content source. Preserve Modular unit membership and converted-paper labels.
- [x] Add unique titles, descriptions, self-canonical URLs, sharing metadata, CollectionPage and BreadcrumbList markup.
- [x] Connect course resource hubs through the homepage footer; preserve existing dashboard entry links and progress tools.
- [x] Resolve old notes and paper query URLs to their equivalent canonical resource pages without redirecting students or changing stored progress.
- [x] Add real author/organization metadata and Pure 3 to generic descriptions.
- [x] Remove personal results/progress and redundant query variants from the sitemap.
- [x] Verify generated pages with JavaScript disabled, desktop/mobile layouts, source-link existence and PDF signatures.
- [ ] Publish and verify the exact release on eliteigcse.com.
- [ ] Inspect the authenticated Search Console property and submit the sitemap.

The legacy dynamic course dashboard and the public resource hub serve different uses. Existing course launchers remain intact. Notes/papers legacy routes keep working; canonical annotations express the preferred public resource URL without forced redirects.

## Next: measurement and content

1. Search Console baseline: export the previous 28 days of queries/pages/countries/devices, indexing exclusions and selected canonicals. Review weekly against equivalent periods, and account for exam-season demand.
2. Analytics: first inspect existing account configuration and consent requirements. Track non-personal resource opens, mock starts/completions, and WhatsApp clicks. Do not put student names, emails, marks or answer text in analytics events.
3. Topic pilot: select 10-15 topics from real query demand and available reviewed teaching content. Each page needs a useful strategy, an exact worked example, a common error, the relevant notes PDF and topic practice. No placeholder or repeated keyword pages.
4. Expand successful topic pages across Linear, both Modular units, P1, P2, P3 and M1. Shared notes remain one source asset; do not invent different mathematics to make duplicate pages.
5. Book pages: add genuine cover/contents previews, accurate edition/page counts and available download formats to the highest-demand books.
6. Paper pages: add individual session/variant pages only when paired resources are actually public. Distinguish original Modular from Linear-to-Modular practice. Never advertise an unavailable June 2026 file.
7. Performance: measure real field data when available. Target LCP <=2.5s, INP <=200ms and CLS <=0.1 at the 75th percentile; do not report lab timings as field results.
8. Authority: maintain accurate author credentials, editorial notes and correction routes. Link authentic teacher/video resources to the relevant course/topic. No bought links or fabricated reviews.
9. Arabic course-selection guides can be added when useful; use hreflang only for real equivalent translated pages.

Success measures: non-brand search impressions and clicks per course; useful pages indexed; PDF/resource opens; mock usage; and relevant enquiries. Set numeric traffic targets after collecting the baseline. Rankings, rich results and AI citations are not guaranteed.

## Maintaining this release

When course-modules.js or library-data.js changes, rebuild the public directories from those sources:

```powershell
node tools/build_seo_pages.cjs
node tools/build_seo_pages.cjs --check
node tools/test_seo_pages.cjs
```

The browser test accepts --source, --stage and --output for an isolated candidate. ELITE_NODE_MODULES and ELITE_BROWSER can select a local Playwright runtime/browser. It starts and stops its own local test server; it never uses real student storage.

Do not edit generated HTML manually. Do not turn arbitrary filters into indexable pages. The seven route definitions live in seo-routes.js. A changed clean URL needs a hosting-compatible migration plan and preserved old PDF links. The current host is static GitHub Pages; this release does not claim server-level query redirects.

The sitemap uses actual generated changes for lastmod, retains known dates elsewhere, and omits unsupported priority/changefreq claims. robots.txt already allows discovery and points to the sitemap.

## Reference guidance

- https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- https://developers.google.com/search/docs/appearance/core-web-vitals
- https://developers.google.com/search/docs/monitor-debug/search-console-start
