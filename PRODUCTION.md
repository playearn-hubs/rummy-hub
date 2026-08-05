# Production checklist: Best Rummy Hubs

## Before first deploy

- [ ] Set Vercel env: `SITE_URL=https://www.bestrummyhubs.com`
- [ ] Set Vercel env: `SITE_INDEX=true`
- [ ] Optional: `GA_MEASUREMENT_ID=G-XXXXXXXX`
- [ ] Run `npm install && npm run build` locally (no errors)
- [ ] Run `npm run preview` and click home, `/y1-game/`, `/ie777/`, `/y1-vs-ie777/`, legal pages

## After deploy

- [ ] `https://www.bestrummyhubs.com/robots.txt` shows sitemap URL
- [ ] `https://www.bestrummyhubs.com/sitemap.xml` lists **42** URLs
- [ ] Submit / re-submit sitemap in Google Search Console
- [ ] Request indexing for `/`, `/y1-game/`, `/ie777/`, `/y1-vs-ie777/`
- [ ] Rich Results Test on home + `/y1-game/` + `/ie777/`
- [ ] Replace placeholder social URLs in `src/data/site-config.json` when ready

## Staging / preview

Use `SITE_INDEX=false` so preview deployments are not indexed.

## Build outputs

| File | Purpose |
|------|---------|
| `dist/` | Static site (deploy this folder) |
| `dist/images/main.png` | Hero (generated from `og-template.svg`) |
| `dist/images/og.png` | Social share image |
| `SEO-PENDING.md` | Auto SEO audit |
