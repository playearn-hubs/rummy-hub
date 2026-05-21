# SEO audit & pending work — Best Rummy Hubs

> Auto-generated on build (`2026-05-21`). Re-run `npm run build` to refresh counts.

## Current inventory

| Type | Count | Notes |
|------|------:|-------|
| **Indexable URLs in sitemap** | **39** | Home + 2 hubs + 36 pages |
| Homepage | 1 | WebSite, Organization, FAQPage, ItemList, WebPage schema |
| Hub pages | 2 | `/guides/`, `/apps/` + CollectionPage / ItemList |
| Core guides (`seo-pages.json`) | 24 | Hand-written |
| Extra guides (`seo-pages-extra.json`) | 5 | Long-tail topics |
| Legal / trust pages | 3 | Privacy, Terms, About |
| Auto app guides | 4 | Mast179, RVIP, 66 Game, HU777 stubs |
| 404 | 1 | `noindex`, no canonical |

**Site URL:** `https://www.bestrummyhubs.com`  
**Deploy env:** `SITE_URL` + `SITE_INDEX=true`

---

## Implemented in build (code)

- [x] Unique title, description, keywords (where set), canonical, robots
- [x] Open Graph + Twitter + `article:published_time` / `modified_time`
- [x] `og:site_name`, `og:locale`, `og:image:alt`, author, `geo.region=IN`
- [x] JSON-LD: WebSite (+ SearchAction), Organization (+ logo), WebPage, Article, FAQPage, BreadcrumbList, CollectionPage, ItemList
- [x] `rel="sponsored noopener noreferrer"` on affiliate download CTAs
- [x] `robots.txt`, `sitemap.xml` (39 URLs), `llms.txt`, `.well-known/security.txt`
- [x] Auto-related links (category siblings, fixed broken slugs)
- [x] Legal pages in sitemap + footer
- [x] Logo alt text, 404 noindex without canonical

---

## Pending — you must do manually (**6** items)

| # | Task | Effort |
|---|------|--------|
| 1 | Submit `https://www.bestrummyhubs.com/sitemap.xml` in **Google Search Console** & Bing | 15 min |
| 2 | Set `SITE_URL` on Vercel to production domain | 5 min |
| 3 | Add **GA4** or Plausible (optional `site-config.json` slot) | 30 min |
| 4 | **Rich Results Test** — home, `/junglee-rummy/`, `/faqs/` | 15 min |
| 5 | Compress `main.png` (WebP), Lighthouse mobile SEO 95+ | 1 hr |
| 6 | Add real `sameAs` social URLs in `site-config.json` (replace placeholders) | 5 min |

---

## Pending — more content (**~10** pages still useful)

| # | Task | Count |
|---|------|------:|
| 7 | Expand auto app stubs (Mast179, RVIP, 66, HU777) in `seo-pages.json` | 4 |
| 8 | Add slugs: `rummy-vs-teen-patti`, `rummy-state-laws`, `play-rummy-online-free`, `junglee-rummy-bonus` | +4 |
| 9 | Wire `blog-posts.json` → build (optional blog hub) | +5–10 |
| 10 | Custom OG images 1200×630 per hub / top apps | 3–5 images |

Add new guides in `src/data/seo-pages-extra.json` (merged at build).

---

## Generated files

| File | Path |
|------|------|
| robots.txt | dist/robots.txt |
| sitemap.xml | dist/sitemap.xml (39 URLs) |
| llms.txt | dist/llms.txt |
| security.txt | dist/.well-known/security.txt |
| This doc | SEO-PENDING.md |

```bash
npm run build
grep -c "<url>" dist/sitemap.xml
```
