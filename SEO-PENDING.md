# SEO audit & pending work: Best Rummy Hubs

> Auto-generated on build (`2026-08-05`). Re-run `npm run build` to refresh counts.

## Current inventory

| Type | Count | Notes |
|------|------:|-------|
| **Indexable URLs in sitemap** | **42** | Home + 2 hubs + 39 pages |
| Homepage | 1 | WebSite, Organization, FAQPage, ItemList, WebPage schema |
| Hub pages | 2 | `/guides/`, `/apps/` + CollectionPage / ItemList |
| Core guides (`seo-pages.json`) | 24 | Hand-written |
| Extra guides (`seo-pages-extra.json`) | 5 | Long-tail topics |
| Legal / trust pages | 3 | Privacy, Terms, About |
| Auto app guides | 4 | Non-featured apps without hand-written SEO |
| Featured apps | 2 | Y1 Game, IE777 |
| 404 | 1 | `noindex`, no canonical |

**Site URL:** `https://www.bestrummyhubs.com`  
**Deploy env:** `SITE_URL` + `SITE_INDEX=true`

### Featured keyword map (no overlap)

| Page | Primary keywords |
|------|------------------|
| `/y1-game/` | Y1 Game, Y1 Game download, Y1 app India, Y1 referral link |
| `/ie777/` | IE777, IE777 download, IE777 app India, IE777 registration |
| `/y1-vs-ie777/` | Y1 vs IE777, Y1 IE777 comparison, game app comparison India |
| `/` | Y1 Game download, IE777 app India, Y1 vs IE777 (supporting) |

---

## Implemented in build (code)

- [x] Unique title, description, keywords (where set), canonical, robots
- [x] Open Graph + Twitter + `article:published_time` / `modified_time`
- [x] `og:site_name`, `og:locale`, `og:image:alt`, author, `geo.region=IN`
- [x] JSON-LD: WebSite, Organization, WebPage, Article, FAQPage, BreadcrumbList, CollectionPage, ItemList, SoftwareApplication (featured)
- [x] Homepage focuses on **Y1 Game + IE777** with logos; older apps kept indexable
- [x] `rel="sponsored noopener noreferrer"` on affiliate download CTAs
- [x] `robots.txt`, `sitemap.xml` (42 URLs), `llms.txt`, `.well-known/security.txt`
- [x] Build-time SEO validation (slugs, H1, canonical, logos, required pages)
- [x] Legal pages in sitemap + footer

---

## Pending: you must do manually (**5** items)

| # | Task | Effort |
|---|------|--------|
| 1 | Re-submit `https://www.bestrummyhubs.com/sitemap.xml` in **Google Search Console** (now 42 URLs) | 10 min |
| 2 | Request indexing for `/y1-game/`, `/ie777/`, `/y1-vs-ie777/`, `/` | 10 min |
| 3 | Add **GA4** (`GA_MEASUREMENT_ID`) if needed | 30 min |
| 4 | **Rich Results Test**, home, `/y1-game/`, `/ie777/` | 15 min |
| 5 | Review GSC **404** rows from the previous site version | 15 min |

---

## Pending: more content (optional)

| # | Task | Count |
|---|------|------:|
| 6 | Expand auto app stubs (Mast179, RVIP, 66, HU777) | 4 |
| 7 | Wire `blog-posts.json` → build | +5-10 |
| 8 | Custom OG images for Y1 / IE777 | 2 |

**Note:** Ranking #1 cannot be guaranteed. This build optimizes structure, uniqueness, and crawlability.

---

## Generated files

| File | Path |
|------|------|
| robots.txt | dist/robots.txt |
| sitemap.xml | dist/sitemap.xml (42 URLs) |
| llms.txt | dist/llms.txt |
| security.txt | dist/.well-known/security.txt |
| This doc | SEO-PENDING.md |

```bash
npm run build
```
