# Best Rummy Hubs

Static site generator for independent rummy app guides (India). Builds to `dist/` for Vercel or any static host.

## Quick start

```bash
npm install
npm run build
npm run dev      # http://localhost:3000
npm run preview  # production build + serve
```

## Production deploy (Vercel)

1. Import this repo in [Vercel](https://vercel.com).
2. **Environment variables** (Production):

   | Variable | Value |
   |----------|--------|
   | `SITE_URL` | `https://www.bestrummyhubs.com` |
   | `SITE_INDEX` | `true` |
   | `GA_MEASUREMENT_ID` | *(optional)* your GA4 ID |

3. Deploy, build command `npm run build`, output directory `dist`.
4. After deploy:
   - Open `https://your-domain/sitemap.xml`
   - Submit sitemap in [Google Search Console](https://search.google.com/search-console)
   - Test rich results: [Rich Results Test](https://search.google.com/test/rich-results)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Generate `dist/` (HTML, CSS, JS, sitemap, robots) |
| `npm run dev` | Serve `dist/` locally |
| `npm run preview` | Build then serve (smoke test) |

## Content

| Path | Purpose |
|------|---------|
| `src/data/home.json` | Homepage copy |
| `src/data/seo-pages.json` | Main guide pages |
| `src/data/seo-pages-extra.json` | Extra SEO pages (merged at build) |
| `src/data/legal-pages.json` | Privacy, Terms, About |
| `src/data/apps.json` | Apps + download URLs |
| `src/data/site-config.json` | Site name, email, disclaimers |
| `build.mjs` | Build pipeline |

## SEO outputs

- `dist/sitemap.xml`, all indexable URLs
- `dist/robots.txt`
- `dist/llms.txt`
- `dist/.well-known/security.txt`
- `SEO-PENDING.md`, regenerated each build

## License

Private, all rights reserved unless stated otherwise.
