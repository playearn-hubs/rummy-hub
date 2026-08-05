import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.cwd());
const SOURCE = path.join(ROOT, "src");
const OUT = path.join(ROOT, "dist");

const SITE_URL = normalizeSiteUrl(
  process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://www.bestrummyhubs.com"
);
const INDEXABLE = process.env.SITE_INDEX !== "false" && process.env.NEXT_PUBLIC_SITE_INDEX !== "false";

const apps = loadJson("data/apps.json");
const faqs = loadJson("data/faqs.json");
const siteConfig = loadJson("data/site-config.json");
const home = loadJson("data/home.json");
const seoPages = [
  ...loadJson("data/seo-pages.json"),
  ...loadOptionalJson("data/seo-pages-extra.json"),
  ...loadOptionalJson("data/featured-apps-pages.json"),
];
const legalPages = loadJson("data/legal-pages.json");
const BUILD_DATE = new Date().toISOString().slice(0, 10);
const SPONSORED_REL = "noopener noreferrer sponsored";
const GA_ID = process.env.GA_MEASUREMENT_ID || siteConfig.analyticsId || "";
let OG_IMAGE_PATH = "/images/main.png";
let HERO_IMAGE_PATH = "/images/main.png";

const PAGE_KEYWORDS = {
  "online-rummy": "online rummy India, play rummy online, rummy app guide 2026, skill rummy India",
  "teen-patti": "teen patti online India, teen patti rules, teen patti app download, 3 patti game India",
  "poker": "online poker India, Texas Holdem India, poker app guide, real money poker India",
  slots: "online slots India, RNG slots guide, casual games India, responsible gaming slots",
  "welcome-bonus": "rummy welcome bonus, first deposit bonus rummy, signup bonus India, rummy promo terms",
  "referral-bonus": "rummy referral code, invite bonus rummy, referral program India, earn referral rummy",
  "cashback-offer": "rummy cashback, loss back offer rummy, gaming cashback India, rummy promotions",
  "download-apk": "download APK India, safe APK install, rummy APK guide, sideload app India",
  "rummy-apk-download": "rummy APK download, download rummy app India, official rummy APK, Android rummy install",
  "how-to-play-rummy": "how to play rummy, rummy for beginners, learn rummy India, 13 card rummy tutorial",
  "rummy-rules": "rummy rules, Indian rummy rules, rummy sequences sets, rummy scoring rules",
  "how-to-win-rummy": "how to win rummy, rummy strategy tips, rummy tricks India, improve rummy skills",
  "poker-rules": "poker hand rankings, poker rules India, Texas Holdem rules, poker guide beginners",
};

const featuredApps = apps.filter((a) => a.featured);
const primaryApp = featuredApps[0] || apps[0];
const secondaryApp = featuredApps[1] || apps[1];
const primaryDownload = primaryApp?.downloadUrl || "#download";
const secondaryDownload = secondaryApp?.downloadUrl || "#download";

const menuSections = [
  {
    title: "Main",
    items: [
      ["/", "Home"],
      ["/y1-game/", "Y1 Game"],
      ["/ie777/", "IE777"],
      ["/y1-vs-ie777/", "Y1 vs IE777"],
      ["/apps/", "All apps"],
      ["/guides/", "Guides"],
    ],
  },
  {
    title: "Download",
    items: [
      ["/download-apk/", "APK install guide"],
      ["/rummy-apk-download/", "Rummy APK"],
      ["/#featured", "Featured apps"],
      ["/best-rummy-apps-india/", "Best rummy apps"],
    ],
  },
  {
    title: "Games & rules",
    items: [
      ["/online-rummy/", "Online rummy"],
      ["/how-to-play-rummy/", "How to play"],
      ["/rummy-rules/", "Rummy rules"],
      ["/13-card-rummy/", "13-card rummy"],
      ["/pool-rummy/", "Pool rummy"],
    ],
  },
  {
    title: "Bonuses",
    items: [
      ["/welcome-bonus/", "Welcome bonus"],
      ["/referral-bonus/", "Referral codes"],
      ["/cashback-offer/", "Cashback offers"],
    ],
  },
  {
    title: "Help & legal",
    items: [
      ["/rummy-withdrawal-guide/", "Withdrawals & KYC"],
      ["/is-rummy-legal-india/", "Legality by state"],
      ["/faqs/", "FAQ"],
      ["/privacy-policy/", "Privacy"],
      ["/about/", "About"],
    ],
  },
];

const CATEGORY_LABELS = {
  games: "Games",
  bonuses: "Bonuses",
  apk: "APK",
  guides: "Guides",
  apps: "Apps",
};

async function runBuild() {
  validateProductionConfig();
  prepareOutput();
  await generateRasterImages();
  writeRuntimeAssets();
  copyStaticAssets();
  applySeoDefaults();
  writeHomePage();
  const builtSeo = writeSeoPages();
  const builtApps = writeMissingAppPages();
  writeGuidesHub();
  writeAppsHub();
  const builtLegal = writeLegalPages();
  writeSeoFiles();
  validateSeoBuild({ builtSeo, builtApps, builtLegal });

  const totalPages = 1 + builtSeo.length + builtApps.length + builtLegal.length + 2;
  console.log(
    `Built ${totalPages} pages (home + ${builtSeo.length + builtApps.length} guides + ${builtLegal.length} legal + hubs) → ${OUT}`
  );
  console.log(`SITE_URL=${SITE_URL} INDEXABLE=${INDEXABLE} OG=${getOgImageUrl()}`);
  console.log(`Featured: ${(featuredApps.map((a) => a.name).join(", ") || "none")}`);
}

runBuild().catch((err) => {
  console.error(err);
  process.exit(1);
});

function getOgImageUrl() {
  return `${SITE_URL}${OG_IMAGE_PATH}`;
}

function validateProductionConfig() {
  const warnings = [];
  if (!INDEXABLE) warnings.push("SITE_INDEX=false, robots will block indexing (use for staging only).");
  if (/localhost|127\.0\.0\.1/i.test(SITE_URL)) {
    warnings.push("SITE_URL points to localhost. Set https://www.bestrummyhubs.com on Vercel for production.");
  }
  if (INDEXABLE && !SITE_URL.startsWith("https://")) {
    warnings.push("Production SITE_URL should use https:// for canonicals and sitemap.");
  }
  warnings.forEach((w) => console.warn("[build]", w));
}

async function generateRasterImages() {
  const template = path.join(SOURCE, "static", "images", "og-template.svg");
  ensure(path.join(OUT, "images"));
  if (!fs.existsSync(template)) {
    console.warn("[build] Missing og-template.svg, hero/OG images skipped.");
    HERO_IMAGE_PATH = "/images/logo.svg";
    OG_IMAGE_PATH = "/images/logo.svg";
    return;
  }
  try {
    const sharp = (await import("sharp")).default;
    const buf = fs.readFileSync(template);
    await sharp(buf).resize(1200, 630).png().toFile(path.join(OUT, "images", "og.png"));
    await sharp(buf).resize(960, 720).png().toFile(path.join(OUT, "images", "main.png"));
    OG_IMAGE_PATH = "/images/og.png";
    HERO_IMAGE_PATH = "/images/main.png";
  } catch (err) {
    fs.copyFileSync(template, path.join(OUT, "images", "hero.svg"));
    HERO_IMAGE_PATH = "/images/hero.svg";
    OG_IMAGE_PATH = "/images/hero.svg";
    console.warn("[build] sharp unavailable, using SVG hero. Run: npm install sharp");
  }
}

function applySeoDefaults() {
  for (const page of seoPages) {
    if (!page.keywords && PAGE_KEYWORDS[page.slug]) {
      page.keywords = PAGE_KEYWORDS[page.slug];
    }
  }
}

function normalizeSiteUrl(raw) {
  const noTrailing = String(raw).trim().replace(/\/$/, "");
  if (/^https?:\/\//i.test(noTrailing)) return noTrailing;
  if (/^localhost\b/i.test(noTrailing) || /^127\.\d+\.\d+\.\d+\b/.test(noTrailing)) return `http://${noTrailing}`;
  return `https://${noTrailing}`;
}

function loadJson(relativeFile) {
  return JSON.parse(fs.readFileSync(path.join(SOURCE, relativeFile), "utf8"));
}

function loadOptionalJson(relativeFile) {
  const file = path.join(SOURCE, relativeFile);
  return fs.existsSync(file) ? loadJson(relativeFile) : [];
}

function sponsoredRel() {
  return SPONSORED_REL;
}

function analyticsSnippet() {
  if (!GA_ID || !INDEXABLE) return "";
  return `
  <script async src="https://www.googletagmanager.com/gtag/js?id=${escapeHtml(GA_ID)}"></script>
  <script>
    window.dataLayer=window.dataLayer||[];
    function gtag(){dataLayer.push(arguments);}
    gtag("js",new Date());
    gtag("config","${escapeHtml(GA_ID)}",{anonymize_ip:true});
  </script>`.trim();
}

function pageDates(page) {
  return {
    published: page?.datePublished || "2026-01-15",
    modified: page?.dateModified || BUILD_DATE,
  };
}

function prepareOutput() {
  fs.rmSync(OUT, { recursive: true, force: true });
  ensure(OUT);
  ensure(path.join(OUT, "assets"));
}

function writeRuntimeAssets() {
  const styles = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
:root{
  --bg:#ffffff;
  --surface:#f6f7f9;
  --panel:#ffffff;
  --line:rgba(15,23,42,.1);
  --text:#111827;
  --muted:#5b6472;
  --brand:#c41e2a;
  --brand-dark:#96151e;
  --ink:#0a0a0a;
  --soft:rgba(196,30,42,.08);
  --shadow:0 10px 30px rgba(15,23,42,.06);
  --header:64px;
  --dock:76px;
  --safe-b:env(safe-area-inset-bottom,0px);
  --radius:16px;
  --radius-sm:10px;
  --pill:999px;
  --font:"Inter",system-ui,-apple-system,sans-serif;
  --wrap:min(100% - 1.5rem,1080px);
}
*,*::before,*::after{box-sizing:border-box}
html{scroll-behavior:smooth;scroll-padding-top:calc(var(--header) + 16px)}
body{
  margin:0;font-family:var(--font);color:var(--text);background:var(--bg);
  line-height:1.7;-webkit-font-smoothing:antialiased;min-height:100dvh;
  padding-bottom:calc(var(--dock) + var(--safe-b));
}
img{max-width:100%;height:auto;display:block}
a{color:inherit;text-decoration:none}
button,input,textarea{font:inherit}
:focus-visible{outline:3px solid rgba(196,30,42,.35);outline-offset:2px}
.wrap{width:var(--wrap);margin-inline:auto}
.block{padding:3.25rem 0}
.block--soft{background:var(--surface);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.block-head{margin-bottom:1.35rem;max-width:62ch}
.eyebrow{
  display:inline-flex;align-items:center;gap:.5rem;margin:0 0 .55rem;
  font-size:.72rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--brand);
}
.block-title{margin:0;font-size:clamp(1.4rem,3vw,1.9rem);line-height:1.2;letter-spacing:-.03em}
.block-desc{margin:.55rem 0 0;color:var(--muted)}
.block-desc a{color:var(--brand);font-weight:600}
.block-desc a:hover{color:var(--brand-dark)}

.shell{
  position:fixed;inset:0 0 auto;z-index:100;height:var(--header);
  background:rgba(255,255,255,.94);backdrop-filter:blur(12px);
  border-bottom:1px solid var(--line);
}
.shell-inner{
  height:100%;width:var(--wrap);margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:.75rem;
}
.brand{display:flex;align-items:center;gap:.6rem;font-weight:800;color:var(--ink)}
.brand-mark{width:36px;height:36px;border-radius:10px;object-fit:contain;background:#111;border:1px solid #222;padding:3px}
.shell-actions{display:flex;align-items:center;gap:.45rem;margin-left:auto}
.shell-link{display:none;font-size:.9rem;font-weight:600;color:var(--muted);padding:.4rem .55rem;border-radius:8px}
.shell-link:hover{color:var(--brand);background:var(--soft)}
.shell-cta{display:none !important}
.nav-toggle{
  width:42px;height:42px;border-radius:12px;border:1px solid var(--line);
  background:#fff;color:var(--text);cursor:pointer;display:grid;place-items:center;
}

.drawer{position:fixed;inset:0;z-index:110;pointer-events:none;display:flex;justify-content:center}
.drawer.is-open{pointer-events:auto}
.drawer-bg{position:absolute;inset:0;background:rgba(15,23,42,.42);opacity:0;transition:opacity .25s}
.drawer.is-open .drawer-bg{opacity:1}
.drawer-panel{
  position:relative;z-index:1;width:min(92vw,440px);max-height:min(80vh,620px);overflow:auto;
  margin-top:calc(var(--header) + .75rem);background:#fff;border:1px solid var(--line);
  border-radius:18px;box-shadow:var(--shadow);padding:1rem 1.1rem 1.2rem;
  transform:translateY(-12px);opacity:0;transition:transform .28s ease,opacity .28s ease;
}
.drawer.is-open .drawer-panel{transform:translateY(0);opacity:1}
.menu-panel-title{margin:0 0 .35rem;text-align:center;font-size:.72rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.menu-group{padding:.45rem 0;border-bottom:1px solid var(--line)}
.menu-group:last-of-type{border-bottom:0}
.menu-group-title{margin:0 0 .4rem;font-size:.68rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--brand)}
.menu-group-links{display:grid;grid-template-columns:1fr 1fr;gap:.3rem .45rem}
.menu-group-links a{padding:.55rem .65rem;border-radius:10px;font-size:.84rem;font-weight:600;border:1px solid transparent}
.menu-group-links a:hover{background:var(--soft);border-color:rgba(196,30,42,.18)}
.drawer-foot{display:grid;gap:.55rem;margin-top:.75rem;padding-top:.75rem;border-top:1px solid var(--line)}

.hero{
  padding:calc(var(--header) + 2rem) 0 2.5rem;
  background:
    radial-gradient(circle at 88% 12%, rgba(196,30,42,.1), transparent 34%),
    linear-gradient(180deg,#fff 0%, #fafafa 100%);
}
.hero-grid{display:grid;gap:1.5rem}
.hero-brand{display:grid;justify-items:center;gap:.85rem;margin:0 0 1.4rem;text-align:center}
.hero-logo{
  width:55%;max-width:300px;aspect-ratio:1;object-fit:cover;border-radius:26px;
  background:#111;border:1px solid #222;box-shadow:0 18px 40px rgba(15,23,42,.18);
}
.hero-brand .btn{width:min(100%,320px)}
.hero-brand-note{margin:0;font-size:.78rem;color:var(--muted)}
.app-brand{
  display:grid;justify-items:center;gap:.85rem;text-align:center;
  margin:1.5rem 0;padding:1.5rem 1.15rem;border-radius:20px;
  background:linear-gradient(180deg,#fff,var(--surface));
  border:1px solid var(--line);box-shadow:var(--shadow);
}
.app-brand-logo{
  width:55%;max-width:280px;aspect-ratio:1;object-fit:cover;border-radius:26px;
  background:#111;border:1px solid #222;box-shadow:0 18px 40px rgba(15,23,42,.18);
}
.app-brand .btn{width:min(100%,320px)}
.app-brand-note{margin:0;font-size:.8rem;color:var(--muted);max-width:44ch}
.pill{
  display:inline-flex;align-items:center;padding:.35rem .8rem;border-radius:var(--pill);
  background:var(--soft);color:var(--brand);border:1px solid rgba(196,30,42,.18);
  font-size:.72rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin:0 0 1rem;
}
.hero h1{
  margin:0 0 .9rem;font-size:clamp(1.9rem,5vw,3rem);line-height:1.12;letter-spacing:-.04em;
}
.hero-highlight{color:var(--brand)}
.lead{margin:0 0 1.1rem;color:var(--muted);font-size:1.02rem;max-width:46ch}
.note-card{
  display:flex;gap:.75rem;padding:1rem 1.05rem;border-radius:14px;background:#fff;
  border:1px solid var(--line);box-shadow:var(--shadow);margin:0 0 1.1rem;
}
.note-dot{width:8px;height:8px;border-radius:50%;background:var(--brand);margin-top:.45rem;flex:0 0 auto}
.note-card strong{display:block;margin-bottom:.15rem}
.hero-actions,.card-actions{display:grid;gap:.55rem}
.disclose{margin:.85rem 0 0;font-size:.8rem;color:var(--muted)}

.btn{
  display:inline-flex;align-items:center;justify-content:center;gap:.45rem;
  min-height:50px;padding:0 1.15rem;border-radius:12px;border:1px solid transparent;
  font-weight:700;font-size:.92rem;cursor:pointer;width:100%;transition:transform .12s,filter .15s,background .15s,border-color .15s;
}
.btn:active{transform:translateY(1px)}
.btn-primary{background:linear-gradient(180deg,#e53945,#c41e2a);color:#fff;border-color:#a81822;box-shadow:0 8px 18px rgba(196,30,42,.22)}
.btn-primary:hover{filter:brightness(1.05)}
.btn-dark{background:linear-gradient(180deg,#222,#0a0a0a);color:#fff;border-color:#111}
.btn-dark:hover{filter:brightness(1.08)}
.btn-ghost{background:#fff;color:var(--brand);border-color:var(--line)}
.btn-ghost:hover{background:var(--soft);border-color:rgba(196,30,42,.25)}

.featured-grid{display:grid;gap:1rem}
.featured-card{
  background:#fff;border:1px solid var(--line);border-radius:18px;padding:1.2rem;box-shadow:var(--shadow);
  display:grid;gap:1rem;
}
.featured-top{display:flex;gap:.9rem;align-items:flex-start}
.featured-logo{
  width:64px;height:64px;border-radius:14px;object-fit:cover;background:#111;border:1px solid #222;flex:0 0 auto;
}
.featured-badge{
  display:inline-flex;margin:0 0 .35rem;padding:.18rem .55rem;border-radius:var(--pill);
  background:var(--soft);color:var(--brand);font-size:.65rem;font-weight:800;letter-spacing:.05em;text-transform:uppercase;
}
.featured-card h3{margin:0 0 .35rem;font-size:1.2rem}
.featured-card p{margin:0;color:var(--muted);font-size:.92rem}
.featured-note{margin:0;font-size:.78rem;color:var(--muted)}

.stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.7rem}
.stat{
  background:#fff;border:1px solid var(--line);border-radius:14px;padding:1rem;text-align:center;box-shadow:var(--shadow);
}
.stat b{display:block;font-size:1.4rem;color:var(--brand);letter-spacing:-.02em}
.stat span{display:block;margin-top:.2rem;font-size:.75rem;color:var(--muted);font-weight:600}

.prose{color:var(--muted)}
.prose p{margin:0 0 .85rem}
.prose p:last-child{margin-bottom:0}
.prose a{color:var(--brand);font-weight:600;text-decoration:underline;text-underline-offset:2px}
.kw{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:1rem}
.kw span{
  font-size:.72rem;font-weight:600;padding:.32rem .7rem;border-radius:var(--pill);
  background:var(--soft);color:var(--brand-dark);border:1px solid rgba(196,30,42,.14);
}

.timeline{display:grid;gap:0;padding-left:1.35rem;position:relative}
.timeline::before{
  content:"";position:absolute;left:.35rem;top:.4rem;bottom:.4rem;width:2px;
  background:linear-gradient(180deg,var(--brand),rgba(196,30,42,.15));
}
.step{position:relative;padding:0 0 1.15rem}
.step::before{
  content:"";position:absolute;left:-1.4rem;top:.45rem;width:10px;height:10px;border-radius:50%;
  background:var(--brand);border:2px solid #fff;box-shadow:0 0 0 2px rgba(196,30,42,.18);
}
.step h3{margin:0 0 .25rem;font-size:1rem}
.step p{margin:0;color:var(--muted);font-size:.9rem}

.grid-2{display:grid;gap:.75rem}
.tile,.mini-card{
  background:#fff;border:1px solid var(--line);border-radius:14px;padding:1rem;box-shadow:var(--shadow);
}
.tile h3,.mini-card h3{margin:0 0 .35rem;font-size:.98rem}
.tile p,.mini-card p{margin:0;color:var(--muted);font-size:.88rem}
.mini-card--link{display:block;transition:transform .15s,border-color .15s}
.mini-card--link:hover{transform:translateY(-2px);border-color:rgba(196,30,42,.28)}

.faq{display:grid;gap:.55rem}
.faq-item{background:#fff;border:1px solid var(--line);border-radius:14px;overflow:hidden;box-shadow:var(--shadow)}
.faq-q{
  width:100%;text-align:left;border:0;background:transparent;cursor:pointer;
  padding:1rem 2.6rem 1rem 1rem;position:relative;font-weight:600;color:var(--text);
}
.faq-q::after{
  content:"";position:absolute;right:1rem;top:50%;width:9px;height:9px;
  border-right:2px solid var(--brand);border-bottom:2px solid var(--brand);
  transform:translateY(-65%) rotate(45deg);transition:transform .2s;
}
.faq-item.is-open .faq-q::after{transform:translateY(-35%) rotate(-135deg)}
.faq-a{max-height:0;overflow:hidden;transition:max-height .3s ease}
.faq-item.is-open .faq-a{max-height:480px}
.faq-a-inner{padding:0 1rem 1rem;color:var(--muted);font-size:.9rem}

.legal-box{
  background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:1.15rem;color:var(--muted);font-size:.88rem;
}
.legal-box strong{display:block;color:var(--brand);margin-bottom:.45rem;font-size:.95rem}

.cta-band{
  margin-top:1rem;padding:1.1rem;border-radius:16px;background:var(--surface);border:1px solid var(--line);text-align:center;
}
.cta-band p{margin:0 0 .8rem;color:var(--muted)}

.crumb{
  display:flex;flex-wrap:wrap;gap:.35rem;align-items:center;width:var(--wrap);margin:0 auto;
  padding:calc(var(--header) + .85rem) 0 .25rem;font-size:.78rem;color:var(--muted);
}
.crumb a{color:var(--brand-dark);font-weight:600}
.page-hero{padding:1.1rem 0 1.6rem}
.page-hero h1{margin:0 0 .7rem;font-size:clamp(1.65rem,4vw,2.2rem);letter-spacing:-.03em;line-height:1.15}
.section{margin:0 0 1.35rem}
.section h2{margin:0 0 .45rem;font-size:1.15rem;color:var(--brand)}
.related{display:flex;flex-wrap:wrap;gap:.45rem;margin-top:1rem}
.related a{
  padding:.4rem .75rem;border-radius:var(--pill);background:var(--soft);border:1px solid rgba(196,30,42,.14);
  color:var(--brand-dark);font-size:.78rem;font-weight:700;
}
.hub-grid{display:grid;gap:.55rem}
.hub-link{display:block;padding:.95rem 1rem;border-radius:14px;background:#fff;border:1px solid var(--line);box-shadow:var(--shadow)}
.hub-link:hover{border-color:rgba(196,30,42,.28)}
.hub-link strong{display:block;margin-bottom:.2rem}
.hub-link span{color:var(--muted);font-size:.84rem}
.app-steps{display:grid;gap:.55rem;margin:1rem 0}
.app-steps li{margin-left:1rem;color:var(--muted)}
.feature-list{display:grid;gap:.4rem;margin:1rem 0;padding:0;list-style:none}
.feature-list li{
  padding:.7rem .85rem;border-radius:12px;background:#fff;border:1px solid var(--line);color:var(--muted);
}

.site-foot{margin-top:2rem;padding:2.4rem 0 1.4rem;background:var(--surface);border-top:1px solid var(--line)}
.site-foot-grid{display:grid;gap:1.5rem}
.site-foot-brand strong{display:block;color:var(--brand);font-size:1.05rem;margin-bottom:.35rem}
.site-foot-brand p{margin:0;color:var(--muted);max-width:34ch}
.site-foot-col h3{margin:0 0 .55rem;font-size:.9rem}
.site-foot-col ul{list-style:none;margin:0;padding:0}
.site-foot-col li{margin:0 0 .35rem}
.site-foot-col a{color:var(--muted);font-size:.86rem}
.site-foot-col a:hover{color:var(--brand)}
.site-foot-all{margin-top:.45rem}
.site-foot-all a{color:var(--brand);font-weight:700}
.site-foot-bottom{margin-top:1.5rem;padding-top:1rem;border-top:1px solid var(--line);text-align:center;color:var(--muted);font-size:.78rem}
.site-foot-bottom a{color:var(--brand)}
.fx-btn{display:inline-flex;align-items:center;justify-content:center;gap:.45rem;min-height:50px;padding:0 1.15rem;border-radius:12px;border:1px solid transparent;font-weight:700;font-size:.92rem;cursor:pointer;width:100%}
.fx-btn--primary{background:linear-gradient(180deg,#e53945,#c41e2a);color:#fff;border-color:#a81822}
.fx-btn--ghost{background:#fff;color:var(--brand);border-color:var(--line)}
.fx-btn--dark{background:linear-gradient(180deg,#222,#0a0a0a);color:#fff}
.fx-hub-grid{display:grid;gap:.55rem}
.fx-hub-link{display:block;padding:.95rem 1rem;border-radius:14px;background:#fff;border:1px solid var(--line);box-shadow:var(--shadow)}
.fx-hub-link strong{display:block;margin-bottom:.2rem}
.fx-hub-link span{color:var(--muted);font-size:.84rem}
.fx-crumb{display:flex;flex-wrap:wrap;gap:.35rem;align-items:center;width:var(--wrap);margin:0 auto;padding:calc(var(--header) + .85rem) 0 .25rem;font-size:.78rem;color:var(--muted)}
.fx-crumb a{color:var(--brand-dark);font-weight:600}
.fx-page-hero{padding:1.1rem 0 1.6rem}
.fx-page-hero h1{margin:0 0 .7rem;font-size:clamp(1.65rem,4vw,2.2rem);letter-spacing:-.03em;line-height:1.15}
.fx-lead{margin:0 0 1.1rem;color:var(--muted);font-size:1.02rem;max-width:46ch}
.fx-pill{display:inline-flex;align-items:center;padding:.35rem .8rem;border-radius:var(--pill);background:var(--soft);color:var(--brand);border:1px solid rgba(196,30,42,.18);font-size:.72rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin:0 0 1rem}
.fx-section{margin:0 0 1.35rem}
.fx-section h2{margin:0 0 .45rem;font-size:1.15rem;color:var(--brand)}
.fx-prose{color:var(--muted)}
.fx-prose a{color:var(--brand);font-weight:600;text-decoration:underline;text-underline-offset:2px}
.fx-related{display:flex;flex-wrap:wrap;gap:.45rem;margin-top:1rem}
.fx-related a{padding:.4rem .75rem;border-radius:var(--pill);background:var(--soft);border:1px solid rgba(196,30,42,.14);color:var(--brand-dark);font-size:.78rem;font-weight:700}
.fx-faq{display:grid;gap:.55rem}
.fx-faq-item{background:#fff;border:1px solid var(--line);border-radius:14px;overflow:hidden;box-shadow:var(--shadow)}
.fx-faq-q{width:100%;text-align:left;border:0;background:transparent;cursor:pointer;padding:1rem 2.6rem 1rem 1rem;position:relative;font-weight:600}
.fx-faq-a{max-height:0;overflow:hidden}
.fx-faq-item.is-open .fx-faq-a{max-height:480px}
.fx-faq-a-inner{padding:0 1rem 1rem;color:var(--muted);font-size:.9rem}
.fx-cta-band{margin-top:1rem;padding:1.1rem;border-radius:16px;background:var(--surface);border:1px solid var(--line);text-align:center}
.fx-mini{display:grid;gap:.75rem}
.fx-mini-card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:1rem;box-shadow:var(--shadow)}
.fx-mini-card--link{display:block}
.section-explore{background:var(--surface);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}

.dock{
  position:fixed;left:0;right:0;bottom:0;z-index:90;
  padding:.55rem 1rem calc(.55rem + var(--safe-b));
  background:rgba(255,255,255,.96);backdrop-filter:blur(10px);border-top:1px solid var(--line);
}
.dock-inner{width:min(100%,440px);margin:0 auto;display:grid;grid-template-columns:1fr 1.4fr;gap:.5rem}
.dock .btn{min-height:46px}
body.page-inner{padding-bottom:1.5rem}

@media(min-width:720px){
  .shell-link{display:inline-flex}
  .shell-cta{display:inline-flex !important;width:auto;min-height:38px;padding:0 .9rem;font-size:.8rem}
  .stats{grid-template-columns:repeat(4,minmax(0,1fr))}
  .grid-2,.hub-grid,.mini-grid{grid-template-columns:1fr 1fr}
  .site-foot-grid{grid-template-columns:1.4fr 1fr 1fr}
  body{padding-bottom:0}
  .dock{display:none}
}
@media(min-width:960px){
  .hero-grid{grid-template-columns:1.05fr .95fr;gap:2rem;align-items:start}
  .hero-actions,.card-actions{grid-template-columns:1fr 1fr}
  .featured-grid{grid-template-columns:1fr}
}
@media(prefers-reduced-motion:reduce){
  html{scroll-behavior:auto}
  .drawer-panel,.drawer-bg,.faq-a,.mini-card--link{transition:none}
}
`;

  const appJs = `(function(){
  var body=document.body;
  var menuBtn=document.getElementById("menuBtn");
  var drawer=document.getElementById("menuSheet");
  var menuClose=document.getElementById("menuClose");
  var drawerBg=document.getElementById("menuBackdrop");
  function closeDrawer(){drawer&&drawer.classList.remove("is-open");body.style.overflow="";}
  if(menuBtn&&drawer){menuBtn.addEventListener("click",function(){drawer.classList.add("is-open");body.style.overflow="hidden";});}
  if(menuClose)menuClose.addEventListener("click",closeDrawer);
  if(drawerBg)drawerBg.addEventListener("click",closeDrawer);
  drawer&&drawer.querySelectorAll("a").forEach(function(a){a.addEventListener("click",closeDrawer);});
  document.querySelectorAll(".faq-q,.fx-faq-q").forEach(function(btn){
    btn.addEventListener("click",function(){
      var item=btn.closest(".faq-item,.fx-faq-item");
      if(!item) return;
      var was=item.classList.contains("is-open");
      document.querySelectorAll(".faq-item.is-open,.fx-faq-item.is-open").forEach(function(el){el.classList.remove("is-open");});
      if(!was)item.classList.add("is-open");
    });
  });
})();`;

  fs.writeFileSync(path.join(OUT, "assets/styles.css"), styles.trim());
  fs.writeFileSync(path.join(OUT, "assets/app.js"), appJs);
}


function copyStaticAssets() {
  copyDir(path.join(SOURCE, "static", "images"), path.join(OUT, "images"));
  copyDir(path.join(SOURCE, "static", "favicon"), path.join(OUT, "favicon"));
  const rootIcon = path.join(SOURCE, "static", "favicon.ico");
  if (fs.existsSync(rootIcon)) fs.copyFileSync(rootIcon, path.join(OUT, "favicon.ico"));
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  ensure(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function writeHomePage() {
  const h = home.hero;
  const title = "Y1 Game Download & IE777 App India 2026 | Invite Guides";
  const description =
    "Y1 Game download and IE777 app India guides: invite registration, APK safety, referral links, and Y1 vs IE777 comparison. Independent site, not the official operator websites.";

  const html = layout({
    pageType: "home",
    title,
    description,
    keywords: (home.keywords || []).join(", "),
    canonicalPath: "/",
    published: "2026-01-01",
    modified: BUILD_DATE,
    body: homeBody(h),
    jsonLd: [
      websiteLd(),
      orgLd(),
      webPageLd({ slug: "", h1: title, metaDescription: description, intro: description }),
      faqLd(faqs),
      appsListLd(featuredApps.length ? featuredApps : apps.slice(0, 2)),
      ...featuredApps.map(softwareAppLd).filter(Boolean),
    ],
  });

  fs.writeFileSync(path.join(OUT, "index.html"), html);
  fs.writeFileSync(
    path.join(OUT, "404.html"),
    layout({
      pageType: "inner",
      title: "Page not found",
      description,
      canonicalPath: "/",
      robotsIndexable: false,
      skipCanonical: true,
      body: `<section class="block"><div class="wrap"><h1 class="block-title">Page not found</h1><p class="block-desc">Browse <a href="/guides/">guides</a>, <a href="/y1-game/">Y1 Game</a>, or <a href="/ie777/">IE777</a>.</p><a class="btn btn-primary" href="/" style="margin-top:1rem;max-width:240px">Go home</a></div></section>`,
    })
  );
}

function featuredAppCard(app, badge) {
  if (!app) return "";
  const logo = app.logo
    ? `<img class="featured-logo" src="${escapeHtml(app.logo)}" alt="${escapeHtml(app.name)} logo" width="64" height="64" loading="eager">`
    : "";
  const keywords = (app.seoKeywords || [])
    .slice(0, 4)
    .map((k) => `<span>${escapeHtml(k)}</span>`)
    .join("");
  return `
    <article class="featured-card">
      <div class="featured-top">
        ${logo}
        <div>
          <span class="featured-badge">${escapeHtml(badge)}</span>
          <h3>${escapeHtml(app.name)}</h3>
          <p>${escapeHtml(app.shortDescription)}</p>
        </div>
      </div>
      <div class="kw" aria-label="${escapeHtml(app.name)} keywords">${keywords}</div>
      <div class="card-actions">
        <a class="btn btn-primary" href="${escapeHtml(app.downloadUrl)}" target="_blank" rel="${sponsoredRel()}">Download ${escapeHtml(app.name)}</a>
        <a class="btn btn-ghost" href="${appGuideHref(app.slug)}">Read ${escapeHtml(app.name)} guide</a>
        <p class="featured-note">Sponsored referral link. Offers change. Verify terms in-app.</p>
      </div>
    </article>`;
}


function homeBody(h) {
  const featureCards = [
    featuredAppCard(primaryApp, "Featured · Y1"),
    featuredAppCard(secondaryApp, "Featured · IE777"),
  ].join("");

  const kw = (home.keywords || []).map((k) => `<span>${escapeHtml(k)}</span>`).join("");
  const seoParas = (home.seoIntro?.paragraphs || []).map((p) => `<p>${escapeHtml(p)}</p>`).join("");
  const gameCards = (home.games || [])
    .map(
      (g) =>
        `<a class="mini-card mini-card--link" href="${pagePath(g.slug)}"><h3>${escapeHtml(g.name)}</h3><p>${escapeHtml(g.desc)}</p></a>`
    )
    .join("");
  const bonusCards = (home.bonuses || [])
    .map(
      (b) =>
        `<a class="mini-card mini-card--link" href="${pagePath(b.slug)}"><h3>${escapeHtml(b.title)}</h3><p>${escapeHtml(b.desc)}</p></a>`
    )
    .join("");
  const apkSteps = (home.apkGuide?.steps || [])
    .map((step) => `<article class="step"><h3>${escapeHtml(step.title)}</h3><p>${escapeHtml(step.body)}</p></article>`)
    .join("");

  return `
  <section class="hero" id="top">
    <div class="wrap hero-grid">
      <div>
        <div class="hero-brand">
          ${
            primaryApp?.logo
              ? `<img class="hero-logo" src="${escapeHtml(primaryApp.logo)}" alt="${escapeHtml(primaryApp.name)} logo" width="300" height="300" fetchpriority="high">`
              : ""
          }
          <a class="btn btn-primary" href="${escapeHtml(primaryDownload)}" target="_blank" rel="${sponsoredRel()}">${escapeHtml(h.ctaPrimary)}</a>
          <p class="hero-brand-note">Sponsored invite link for ${escapeHtml(primaryApp?.name || "Y1 Game")}.</p>
        </div>
        <p class="pill">${escapeHtml(h.badge)}</p>
        <h1>${escapeHtml(h.title)} <span class="hero-highlight">${escapeHtml(h.titleHighlight)}</span></h1>
        <p class="lead">${escapeHtml(h.subtitle)}</p>
        <div class="note-card"><span class="note-dot" aria-hidden="true"></span><div><strong>${escapeHtml(h.bonusLabel)}</strong> ${escapeHtml(h.bonusText)}</div></div>
        <div class="hero-actions">
          <a class="btn btn-dark" href="${escapeHtml(secondaryDownload)}" target="_blank" rel="${sponsoredRel()}">${escapeHtml(secondaryApp?.name || "IE777")} download</a>
          <a class="btn btn-ghost" href="/y1-vs-ie777/">${escapeHtml(h.ctaSecondary)}</a>
        </div>
        <p class="disclose">Independent site. Download buttons are sponsored invite links for ${escapeHtml(primaryApp?.name || "Y1")} and ${escapeHtml(secondaryApp?.name || "IE777")}.</p>
      </div>
      <div id="featured">
        <div class="featured-grid">${featureCards}</div>
      </div>
    </div>
  </section>

  <section class="block" id="trust">
    <div class="wrap">
      <div class="block-head"><p class="eyebrow">At a glance</p><h2 class="block-title">Independent Y1 Game and IE777 guides</h2><p class="block-desc">${escapeHtml(home.featuredNotes?.body || "We are not affiliated with Y1 Game or IE777.")}</p></div>
      <div class="stats">${home.trust.map((t) => `<div class="stat"><b>${escapeHtml(t.value)}</b><span>${escapeHtml(t.label)}</span></div>`).join("")}</div>
    </div>
  </section>

  <section class="block block--soft" id="guide">
    <div class="wrap">
      <div class="block-head"><p class="eyebrow">Overview</p><h2 class="block-title">${escapeHtml(home.seoIntro?.title || "Invite app guides")}</h2><p class="block-desc"><a href="/y1-game/">Y1 Game download</a> · <a href="/ie777/">IE777 registration</a> · <a href="/guides/">${getAllPages().length} pages</a></p></div>
      <div class="prose">${seoParas}</div>
      <div class="kw" aria-label="Homepage topics">${kw}</div>
    </div>
  </section>

  <section class="block" id="how">
    <div class="wrap">
      <div class="block-head"><p class="eyebrow">Registration</p><h2 class="block-title">How Y1 Game and IE777 invite downloads work</h2></div>
      <div class="timeline">${home.howItWorks.map((s) => `<article class="step"><h3>${escapeHtml(s.title)}</h3><p>${escapeHtml(s.body)}</p></article>`).join("")}</div>
    </div>
  </section>

  <section class="block block--soft" id="apk">
    <div class="wrap">
      <div class="block-head"><p class="eyebrow">Safety</p><h2 class="block-title">${escapeHtml(home.apkGuide?.title || "Safe install")}</h2><p class="block-desc"><a href="/download-apk/">Full APK guide</a> · <a href="/safe-rummy-tips/">Security tips</a></p></div>
      <div class="timeline">${apkSteps}</div>
    </div>
  </section>

  <section class="block" id="benefits">
    <div class="wrap">
      <div class="block-head"><p class="eyebrow">Editorial</p><h2 class="block-title">How this site works</h2></div>
      <div class="grid-2">${home.whyChoose.map((w) => `<article class="tile"><h3>${escapeHtml(w.title)}</h3><p>${escapeHtml(w.body)}</p></article>`).join("")}</div>
    </div>
  </section>

  <section class="block block--soft" id="security">
    <div class="wrap">
      <div class="block-head"><p class="eyebrow">Protect yourself</p><h2 class="block-title">KYC, OTP and responsible play</h2></div>
      <div class="grid-2">${(home.securityTips || []).map((w) => `<article class="tile"><h3>${escapeHtml(w.title)}</h3><p>${escapeHtml(w.body)}</p></article>`).join("")}</div>
    </div>
  </section>

  <section class="block" id="games">
    <div class="wrap">
      <div class="block-head"><p class="eyebrow">More guides</p><h2 class="block-title">Related topics</h2></div>
      <div class="grid-2 mini-grid">${gameCards}</div>
    </div>
  </section>

  <section class="block block--soft" id="bonuses">
    <div class="wrap">
      <div class="block-head"><p class="eyebrow">Bonuses</p><h2 class="block-title">Read terms before funding</h2></div>
      <div class="grid-2 mini-grid">${bonusCards}</div>
    </div>
  </section>

  <section class="block" id="faq">
    <div class="wrap">
      <div class="block-head"><p class="eyebrow">FAQ</p><h2 class="block-title">Y1 Game, IE777 and this site</h2><p class="block-desc"><a href="/faqs/">Full FAQ page</a></p></div>
      <div class="faq">${faqs.map((f) => `<div class="faq-item"><button type="button" class="faq-q">${escapeHtml(f.question)}</button><div class="faq-a"><div class="faq-a-inner">${escapeHtml(f.answer)}</div></div></div>`).join("")}</div>
    </div>
  </section>

  <section class="block block--soft" id="legal">
    <div class="wrap">
      <div class="legal-box">
        <strong>Responsible gaming and legality</strong>
        <p>${escapeHtml(home.responsibleGaming)}</p>
        <p style="margin-top:.75rem">${escapeHtml(siteConfig.independentNotice)}</p>
        <p style="margin-top:.75rem">${escapeHtml(siteConfig.disclaimerShort)}</p>
      </div>
    </div>
  </section>

  ${homeExploreSection()}

  <div class="dock">
    <div class="dock-inner">
      <a class="btn btn-ghost" href="${escapeHtml(secondaryDownload)}" target="_blank" rel="${sponsoredRel()}">IE777</a>
      <a class="btn btn-primary" href="${escapeHtml(primaryDownload)}" target="_blank" rel="${sponsoredRel()}">Y1 Download</a>
    </div>
  </div>
  `;
}


function layout({
  pageType = "home",
  title,
  description,
  keywords = "",
  canonicalPath = "/",
  breadcrumbs = [],
  body,
  jsonLd = [],
  robotsIndexable,
  skipCanonical = false,
  published,
  modified,
}) {
  const isHome = pageType === "home";
  const jsonLdMarkup = jsonLd.map((item) => `<script type="application/ld+json">${JSON.stringify(item)}</script>`).join("\n");
  const brandHref = isHome ? "#top" : "/";
  const menuHtml = renderSiteMenu();
  const crumbHtml = breadcrumbs.length ? breadcrumbsHtml(breadcrumbs) : "";
  const bodyClass = isHome ? "" : ' class="page-inner"';
  const indexable = robotsIndexable !== false && INDEXABLE;
  const pub = published || BUILD_DATE;
  const mod = modified || BUILD_DATE;

  return `<!doctype html>
<html lang="en-IN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#ffffff">
  ${pageMeta({ title, description, keywords, canonicalPath, indexable, skipCanonical, published: pub, modified: mod })}
  <link rel="icon" href="/favicon/favicon.ico" sizes="any">
  <link rel="icon" href="/favicon/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/favicon/apple-touch-icon.png">
  <link rel="manifest" href="/favicon/site.webmanifest">
  <link rel="stylesheet" href="/assets/styles.css">
  ${jsonLdMarkup}
  ${analyticsSnippet()}
</head>
<body${bodyClass}>
  <header class="shell">
    <div class="shell-inner">
      <a class="brand" href="${brandHref}">
        <img src="/images/logo.svg" alt="${escapeHtml(siteConfig.name)} logo" width="36" height="36" class="brand-mark">
        <span class="brand-text">${escapeHtml(siteConfig.name)}</span>
      </a>
      <div class="shell-actions">
        <a class="shell-link" href="/y1-game/">Y1 Game</a>
        <a class="shell-link" href="/ie777/">IE777</a>
        <a class="btn btn-dark shell-cta" href="${escapeHtml(primaryDownload)}" target="_blank" rel="${sponsoredRel()}">Y1 Download</a>
        <button type="button" class="nav-toggle" id="menuBtn" aria-label="Open menu">☰</button>
      </div>
    </div>
  </header>
  <div class="drawer" id="menuSheet">
    <div class="drawer-bg" id="menuBackdrop"></div>
    <nav class="drawer-panel" aria-label="Site menu">
      <p class="menu-panel-title">Menu</p>
      ${menuHtml}
      <div class="drawer-foot">
        <a class="btn btn-primary" href="${escapeHtml(primaryDownload)}" target="_blank" rel="${sponsoredRel()}">Y1 Game download</a>
        <a class="btn btn-ghost" href="${escapeHtml(secondaryDownload)}" target="_blank" rel="${sponsoredRel()}">IE777 download</a>
        <button type="button" class="btn btn-ghost" id="menuClose">Close menu</button>
      </div>
    </nav>
  </div>
  <main>${crumbHtml}${body}${siteFooter()}</main>
  <script src="/assets/app.js"></script>
</body>
</html>`;
}


function renderSiteMenu() {
  return menuSections
    .map(
      (section) => `
      <div class="menu-group">
        <p class="menu-group-title">${escapeHtml(section.title)}</p>
        <div class="menu-group-links">
          ${section.items.map(([href, label]) => `<a href="${href}">${escapeHtml(label)}</a>`).join("")}
        </div>
      </div>`
    )
    .join("");
}

function appGuideHref(slug) {
  const page = getAllPages().find((p) => p.slug === slug || p.appSlug === slug);
  return page ? pagePath(page.slug) : pagePath(slug);
}

function getAllPages() {
  const extra = apps
    .filter((a) => !seoPages.some((p) => p.slug === a.slug || p.appSlug === a.slug))
    .map(appToSeoPage);
  return [...seoPages, ...extra, ...legalPages];
}

function appToSeoPage(app) {
  return {
    slug: app.slug,
    category: "apps",
    metaTitle: `${app.name} APK Download India 2026 | Guide & Install`,
    metaDescription: app.shortDescription,
    keywords: (app.seoKeywords || []).slice(0, 5).join(", "),
    h1: `${app.name} app guide`,
    intro: app.overview || app.shortDescription,
    sections: [
      {
        heading: "Features",
        body: (app.features || []).slice(0, 4).join(". ") + ".",
      },
      {
        heading: "Download safely",
        body: `Use the official link below. Read our [APK install guide](/download-apk/) and [best rummy apps](/best-rummy-apps-india/) comparison.`,
      },
    ],
    faqs: [
      {
        question: `How do I download ${app.name}?`,
        answer: "Tap the official download button on this page. Install only from the operator's verified flow. Never random chat APKs.",
      },
      {
        question: "Is this the official website?",
        answer: `No. ${siteConfig.name} is independent and not affiliated with ${app.name}.`,
      },
    ],
    related: ["/best-rummy-apps-india/", "/download-apk/", "/apps/"],
    appSlug: app.slug,
  };
}

function siteFooter() {
  const col = (title, pages, moreHref, moreLabel) => {
    if (!pages.length) return "";
    const items = pages
      .slice(0, 5)
      .map((p) => `<li><a href="${pagePath(p.slug)}">${escapeHtml(p.h1)}</a></li>`)
      .join("");
    const more = moreHref
      ? `<p class="site-foot-all"><a href="${moreHref}">${moreLabel}</a></p>`
      : "";
    return `<div class="site-foot-col"><h3>${escapeHtml(title)}</h3><ul>${items}</ul>${more}</div>`;
  };

  const games = seoPages.filter((p) => p.category === "games");
  const bonuses = seoPages.filter((p) => p.category === "bonuses");
  const apk = seoPages.filter((p) => p.category === "apk");
  const guides = seoPages.filter((p) => p.category === "guides");
  const appPages = seoPages.filter((p) => p.category === "apps");

  return `
  <footer class="site-foot">
    <div class="wrap site-foot-grid">
      <div class="site-foot-brand">
        <strong>${escapeHtml(siteConfig.name)}</strong>
        <p>${escapeHtml(siteConfig.tagline)}</p>
        <p class="site-foot-all" style="margin-top:.75rem"><a href="/guides/">Browse all ${getAllPages().length} pages</a></p>
      </div>
      ${col("Popular", [seoPages.find((p) => p.slug === "y1-game"), seoPages.find((p) => p.slug === "ie777"), seoPages.find((p) => p.slug === "y1-vs-ie777"), seoPages.find((p) => p.slug === "download-apk"), seoPages.find((p) => p.slug === "faqs")].filter(Boolean), "/apps/", "All apps →")}
      ${col("Games", games, "/guides/#games", "More game guides →")}
      ${col("Bonuses & APK", [...bonuses, ...apk], "/guides/", "Bonus & APK guides →")}
    </div>
    <div class="wrap site-foot-bottom">
      <p>© 2026 ${escapeHtml(siteConfig.name)} · <a href="mailto:${escapeHtml(siteConfig.contactEmail)}">${escapeHtml(siteConfig.contactEmail)}</a></p>
      <p><a href="/privacy-policy/">Privacy</a> · <a href="/terms-of-use/">Terms</a> · <a href="/about/">About</a> · <a href="/sitemap.xml">Sitemap</a></p>
      <p>${escapeHtml(siteConfig.disclaimerShort)}</p>
    </div>
  </footer>`;
}

function homeExploreSection() {
  const all = getAllPages();
  const blocks = ["games", "bonuses", "apk", "guides", "apps"]
    .map((cat) => {
      const pages = all.filter((p) => p.category === cat);
      if (!pages.length) return "";
      const links = pages
        .map(
          (p) =>
            `<a class="fx-hub-link" href="${pagePath(p.slug)}"><strong>${escapeHtml(p.h1)}</strong><span>${escapeHtml(p.metaDescription).slice(0, 72)}…</span></a>`
        )
        .join("");
      return `<div class="block-head" style="margin-top:1.5rem"><p class="eyebrow">${escapeHtml(CATEGORY_LABELS[cat])}</p><h2 class="block-title" style="font-size:1.2rem">${escapeHtml(CATEGORY_LABELS[cat])} pages</h2></div><div class="fx-hub-grid">${links}</div>`;
    })
    .join("");

  return `
  <section class="block section-explore" id="all-pages">
    <div class="wrap">
      <div class="block-head">
        <p class="eyebrow">Site map</p>
        <h2 class="block-title">All rummy guides (${all.length} pages)</h2>
        <p class="block-desc"><a href="/guides/">Open full guides index</a> · <a href="/apps/">App guides</a></p>
      </div>
      ${blocks}
    </div>
  </section>`;
}

function breadcrumbsHtml(items) {
  const parts = items.map((item, i) => {
    const isLast = i === items.length - 1;
    if (isLast) return `<span aria-current="page">${escapeHtml(item.label)}</span>`;
    return `<a href="${item.href}">${escapeHtml(item.label)}</a><span aria-hidden="true">/</span>`;
  });
  return `<nav class="fx-crumb wrap" aria-label="Breadcrumb">${parts.join(" ")}</nav>`;
}

function pageMeta({
  title,
  description,
  keywords = "",
  canonicalPath = "/",
  indexable = INDEXABLE,
  skipCanonical = false,
  published,
  modified,
}) {
  const canonical = pageUrl(canonicalPath);
  const img = getOgImageUrl();
  const robots = indexable ? "index,follow,max-image-preview:large" : "noindex,nofollow";
  const kwMeta = keywords ? `<meta name="keywords" content="${escapeHtml(keywords)}">` : "";
  const canonicalTag = skipCanonical ? "" : `<link rel="canonical" href="${canonical}">`;
  const dateMeta =
    published && modified
      ? `<meta property="article:published_time" content="${published}"><meta property="article:modified_time" content="${modified}">`
      : "";
  return `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    ${kwMeta}
    ${canonicalTag}
    <meta name="robots" content="${robots}">
    <meta name="author" content="${escapeHtml(siteConfig.name)}">
    <meta name="geo.region" content="IN">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="${escapeHtml(siteConfig.name)}">
    <meta property="og:locale" content="en_IN">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${img}">
    <meta property="og:image:alt" content="${escapeHtml(siteConfig.name)} rummy app guides India">
    ${dateMeta}
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${img}">
  `.trim();
}

function sitemapEntries() {
  const lastmod = BUILD_DATE;
  const entries = [
    { path: "/", priority: "1.0", changefreq: "weekly" },
    { path: "/guides/", priority: "0.9", changefreq: "weekly" },
    { path: "/apps/", priority: "0.9", changefreq: "weekly" },
    ...getAllPages().map((p) => ({
      path: pagePath(p.slug),
      priority: p.category === "apps" ? "0.85" : p.category === "legal" ? "0.5" : "0.75",
      changefreq: p.category === "legal" ? "yearly" : "monthly",
    })),
  ];
  return { lastmod, entries };
}

function writeSeoFiles() {
  const { lastmod, entries } = sitemapEntries();
  const urlNodes = INDEXABLE
    ? entries
        .map(
          (e) =>
            `<url><loc>${escapeXml(pageUrl(e.path))}</loc><lastmod>${lastmod}</lastmod><changefreq>${e.changefreq}</changefreq><priority>${e.priority}</priority></url>`
        )
        .join("\n")
    : "";
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlNodes}
</urlset>`;
  fs.writeFileSync(path.join(OUT, "sitemap.xml"), sitemap);

  const robots = INDEXABLE
    ? `# ${siteConfig.name}\nUser-agent: *\nAllow: /\nDisallow: /404/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`
    : `# Staging, do not index\nUser-agent: *\nDisallow: /\n`;
  fs.writeFileSync(path.join(OUT, "robots.txt"), robots);

  const allPages = getAllPages();
  const byCat = (cat) =>
    allPages
      .filter((p) => p.category === cat)
      .map((p) => `- ${p.h1}: ${pageUrl(pagePath(p.slug))}`)
      .join("\n");
  const llms = `# ${siteConfig.name}
> ${siteConfig.tagline}

Site: ${SITE_URL}
Contact: ${siteConfig.contactEmail}
Last built: ${lastmod}
Indexable URLs: ${INDEXABLE ? entries.length : 0}

## Main
- Home: ${SITE_URL}/
- Guides hub: ${SITE_URL}/guides/
- Apps hub: ${SITE_URL}/apps/

## Games (${allPages.filter((p) => p.category === "games").length})
${byCat("games") || "(none)"}

## Bonuses (${allPages.filter((p) => p.category === "bonuses").length})
${byCat("bonuses") || "(none)"}

## APK (${allPages.filter((p) => p.category === "apk").length})
${byCat("apk") || "(none)"}

## Guides (${allPages.filter((p) => p.category === "guides").length})
${byCat("guides") || "(none)"}

## Apps (${allPages.filter((p) => p.category === "apps").length})
${byCat("apps") || "(none)"}

## Legal (${legalPages.length})
${legalPages.map((p) => `- ${p.h1}: ${pageUrl(pagePath(p.slug))}`).join("\n")}
`;
  fs.writeFileSync(path.join(OUT, "llms.txt"), llms);
  writeSecurityTxt();
  fs.writeFileSync(path.join(ROOT, "SEO-PENDING.md"), buildSeoPendingMd({ lastmod, urlCount: entries.length }));
}

function writeSecurityTxt() {
  const dir = path.join(OUT, ".well-known");
  ensure(dir);
  const body = `Contact: mailto:${siteConfig.contactEmail}
Preferred-Languages: en
Canonical: ${SITE_URL}/
Policy: ${SITE_URL}/privacy-policy/
`;
  fs.writeFileSync(path.join(dir, "security.txt"), body);
}

function pagePath(slug) {
  return `/${slug}/`;
}

function pageUrl(path) {
  if (!path || path === "/") return `${SITE_URL}/`;
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${clean.endsWith("/") ? clean : `${clean}/`}`;
}

function parseInlineLinks(text) {
  const escaped = escapeHtml(text);
  return escaped.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, href) => {
    const url = href.startsWith("/") ? href : `/${href}`;
    return `<a href="${url.endsWith("/") || url.includes("#") ? url : `${url}/`}">${label}</a>`;
  });
}

function pageBreadcrumbs(page) {
  const crumbs = [{ href: "/", label: "Home" }];
  if (page.category === "legal") {
    crumbs.push({ href: pagePath(page.slug), label: page.h1 });
    return crumbs;
  }
  if (page.category === "apps") {
    crumbs.push({ href: "/apps/", label: "Apps" });
  } else {
    crumbs.push({ href: "/guides/", label: "Guides" });
  }
  crumbs.push({ href: pagePath(page.slug), label: page.h1 });
  return crumbs;
}

function normalizeRelatedHref(href) {
  const slug = href.replace(/^\//, "").replace(/\/$/, "").split("#")[0];
  const aliases = { "best-rummy-apps": "best-rummy-apps-india" };
  const fixed = aliases[slug] || slug;
  if (slug.startsWith("blog/")) return "/guides/";
  const exists = getAllPages().some((p) => p.slug === fixed);
  return exists ? pagePath(fixed) : pagePath(slug);
}

function enrichRelated(page) {
  const seen = new Set([page.slug]);
  const out = [];
  for (const href of page.related || []) {
    const path = normalizeRelatedHref(href);
    const slug = path.replace(/^\//, "").replace(/\/$/, "");
    if (slug && !seen.has(slug)) {
      seen.add(slug);
      out.push(path);
    }
  }
  const siblings = getAllPages().filter((p) => p.category === page.category && p.slug !== page.slug);
  for (const p of siblings) {
    if (out.length >= 6) break;
    if (!seen.has(p.slug)) {
      seen.add(p.slug);
      out.push(pagePath(p.slug));
    }
  }
  return out;
}

function relatedLabel(href) {
  const slug = href.replace(/^\//, "").replace(/\/$/, "");
  const target = getAllPages().find((p) => p.slug === slug);
  return target?.h1 || slug.replace(/-/g, " ");
}

function breadcrumbLd(page) {
  const items = pageBreadcrumbs(page);
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      item: pageUrl(item.href),
    })),
  };
}

function publisherOrg() {
  return {
    "@type": "Organization",
    name: siteConfig.name,
    url: SITE_URL,
    logo: { "@type": "ImageObject", url: `${SITE_URL}/images/logo.svg` },
  };
}

function webPageLd(page) {
  const { published, modified } = pageDates(page);
  const pageUrlPath = page.slug ? pagePath(page.slug) : "/";
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.h1 || page.metaTitle,
    description: page.metaDescription || page.intro,
    url: pageUrl(pageUrlPath),
    datePublished: published,
    dateModified: modified,
    inLanguage: "en-IN",
    isPartOf: { "@type": "WebSite", name: siteConfig.name, url: SITE_URL },
  };
}

function articleLd(page) {
  const { published, modified } = pageDates(page);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: page.h1,
    description: page.metaDescription,
    datePublished: published,
    dateModified: modified,
    author: publisherOrg(),
    publisher: publisherOrg(),
    mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl(pagePath(page.slug)) },
    inLanguage: "en-IN",
  };
}

function seoPageBody(page) {
  const pageFaqs = page.useGlobalFaqs ? faqs : page.faqs || [];
  const app = page.appSlug ? apps.find((a) => a.slug === page.appSlug) : null;
  const sections = (page.sections || [])
    .map(
      (s) => `
      <article class="section">
        <h2>${escapeHtml(s.heading)}</h2>
        <div class="prose"><p>${parseInlineLinks(s.body)}</p></div>
      </article>`
    )
    .join("");

  const faqBlock =
    pageFaqs.length > 0
      ? `
  <section class="block block--soft" id="faq">
    <div class="wrap">
      <div class="block-head"><p class="eyebrow">FAQ</p><h2 class="block-title">Common questions</h2></div>
      <div class="faq">${pageFaqs
        .map(
          (f) =>
            `<div class="faq-item"><button type="button" class="faq-q">${escapeHtml(f.question)}</button><div class="faq-a"><div class="faq-a-inner">${escapeHtml(f.answer)}</div></div></div>`
        )
        .join("")}</div>
    </div>
  </section>`
      : "";

  const related = enrichRelated(page)
    .map((href) => `<a href="${href}">${escapeHtml(relatedLabel(href))}</a>`)
    .join("");

  const keywordChips = (app?.seoKeywords || (page.keywords || "").split(",").map((k) => k.trim()).filter(Boolean))
    .slice(0, 6)
    .map((k) => `<span>${escapeHtml(k)}</span>`)
    .join("");

  const steps = app?.howToDownload?.length
    ? `<ol class="app-steps">${app.howToDownload.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol>`
    : "";

  const features = app?.features?.length
    ? `<ul class="feature-list">${app.features.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul>`
    : "";

  const downloadCta = app
    ? `
      <div class="app-brand">
        ${app.logo ? `<img class="app-brand-logo" src="${escapeHtml(app.logo)}" alt="${escapeHtml(app.name)} logo" width="300" height="300" fetchpriority="high">` : ""}
        <a class="btn btn-primary" href="${escapeHtml(app.downloadUrl)}" target="_blank" rel="${sponsoredRel()}">Download ${escapeHtml(app.name)}</a>
        <p class="app-brand-note">Official ${escapeHtml(app.name)} invite link. Verify terms in-app. Sponsored referral link.</p>
      </div>`
    : "";

  return `
  <section class="page-hero">
    <div class="wrap">
      <p class="pill">${escapeHtml(CATEGORY_LABELS[page.category] || "Guide")}</p>
      <h1>${escapeHtml(page.h1)}</h1>
      <p class="lead">${escapeHtml(page.intro)}</p>
      ${keywordChips ? `<div class="kw" aria-label="Page keywords">${keywordChips}</div>` : ""}
      ${downloadCta}
      ${steps}
      ${features}
    </div>
  </section>
  <section class="block">
    <div class="wrap">${sections}</div>
  </section>
  ${faqBlock}
  <section class="block">
    <div class="wrap">
      <p class="eyebrow">Related</p>
      <div class="related">${related}</div>
      <p class="prose" style="margin-top:1.25rem"><a href="/guides/">All guides</a> · <a href="/apps/">Apps</a> · <a href="/">Homepage</a></p>
    </div>
  </section>`;
}


function writePageHtml(page) {
  const keywords = page.keywords || `${page.h1}, rummy India`;
  const dates = pageDates(page);
  const schemas = [breadcrumbLd(page), webPageLd(page)];
  if (page.category !== "legal") schemas.push(articleLd(page));
  const pageFaqs = page.useGlobalFaqs ? faqs : page.faqs || [];
  if (pageFaqs.length) schemas.push(faqLd(pageFaqs));
  const app = page.appSlug ? apps.find((a) => a.slug === page.appSlug) : null;
  if (app) {
    const soft = softwareAppLd(app);
    if (soft) schemas.push(soft);
  }
  return layout({
    pageType: "inner",
    title: page.metaTitle,
    description: page.metaDescription,
    keywords,
    canonicalPath: pagePath(page.slug),
    breadcrumbs: pageBreadcrumbs(page),
    body: seoPageBody(page),
    published: dates.published,
    modified: dates.modified,
    jsonLd: schemas,
  });
}

function writeSeoPages() {
  const built = [];
  for (const page of seoPages) {
    const dir = path.join(OUT, page.slug);
    ensure(dir);
    fs.writeFileSync(path.join(dir, "index.html"), writePageHtml(page));
    built.push(page);
  }
  return built;
}

function writeMissingAppPages() {
  const built = [];
  for (const app of apps) {
    if (seoPages.some((p) => p.slug === app.slug || p.appSlug === app.slug)) continue;
    const page = appToSeoPage(app);
    const dir = path.join(OUT, page.slug);
    ensure(dir);
    fs.writeFileSync(path.join(dir, "index.html"), writePageHtml(page));
    built.push(page);
  }
  return built;
}

function writeLegalPages() {
  const built = [];
  for (const page of legalPages) {
    const dir = path.join(OUT, page.slug);
    ensure(dir);
    fs.writeFileSync(path.join(dir, "index.html"), writePageHtml(page));
    built.push(page);
  }
  return built;
}

function writeGuidesHub() {
  const groups = {};
  for (const page of seoPages) {
    if (page.category === "apps") continue;
    const key = page.category || "guides";
    if (!groups[key]) groups[key] = [];
    groups[key].push(page);
  }

  const sections = Object.entries(groups)
    .map(([cat, pages]) => {
      const links = pages
        .map(
          (p) =>
            `<a class="fx-hub-link" href="${pagePath(p.slug)}"><strong>${escapeHtml(p.h1)}</strong><span>${escapeHtml(p.metaDescription).slice(0, 90)}…</span></a>`
        )
        .join("");
      return `<section class="block" id="${escapeHtml(cat)}"><div class="wrap"><div class="block-head"><p class="eyebrow">${escapeHtml(CATEGORY_LABELS[cat] || cat)}</p><h2 class="block-title">${escapeHtml(CATEGORY_LABELS[cat] || cat)} guides</h2></div><div class="fx-hub-grid">${links}</div></div></section>`;
    })
    .join("");

  const appSection = getAllPages().filter((p) => p.category === "apps");
  const appLinks = appSection
    .map(
      (p) =>
        `<a class="fx-hub-link" href="${pagePath(p.slug)}"><strong>${escapeHtml(p.h1)}</strong><span>${escapeHtml(p.metaDescription).slice(0, 90)}…</span></a>`
    )
    .join("");
  const appsBlock = appSection.length
    ? `<section class="block" id="apps"><div class="wrap"><div class="block-head"><p class="eyebrow">Apps</p><h2 class="block-title">App guides</h2><p class="block-desc"><a href="/apps/">Apps hub</a></p></div><div class="fx-hub-grid">${appLinks}</div></div></section>`
    : "";

  const body = `
  <section class="fx-page-hero"><div class="wrap"><h1>Rummy guides library</h1><p class="fx-lead">Professional guides for APK install, bonuses, rules, legality, and app comparisons, ${getAllPages().length} pages for India.</p><a class="fx-btn fx-btn--ghost" href="/" style="margin-top:1rem;max-width:200px">← Homepage</a></div></section>
  ${sections}
  ${appsBlock}`;

  ensure(path.join(OUT, "guides"));
  fs.writeFileSync(
    path.join(OUT, "guides", "index.html"),
    layout({
      pageType: "inner",
      title: "Rummy Guides India 2026 | APK, Bonuses, Rules & Apps",
      description: "Browse all rummy guides: best apps, APK download, welcome bonus, rules, pool & deals rummy, legality, and withdrawals.",
      keywords: "rummy guides India, online rummy guides, rummy APK guides, rummy bonus guides 2026",
      canonicalPath: "/guides/",
      breadcrumbs: [
        { href: "/", label: "Home" },
        { href: "/guides/", label: "Guides" },
      ],
      body,
      published: "2026-01-01",
      modified: BUILD_DATE,
      jsonLd: [
        breadcrumbLd({ slug: "guides", h1: "Guides", category: "guides", metaDescription: "" }),
        webPageLd({
          slug: "guides",
          h1: "Rummy guides library",
          metaDescription: "Browse all rummy guides: best apps, APK download, welcome bonus, rules, pool & deals rummy, legality, and withdrawals.",
          intro: "Professional guides for APK install, bonuses, rules, legality, and app comparisons.",
        }),
        collectionLd(
          "Rummy guides",
          seoPages.filter((p) => p.category !== "apps")
        ),
      ],
    })
  );
}

function writeAppsHub() {
  const ordered = [...featuredApps, ...apps.filter((a) => !a.featured)];
  const cards = ordered
    .map((app) => {
      const guideHref = appGuideHref(app.slug);
      const logo = app.logo
        ? `<img src="${escapeHtml(app.logo)}" alt="${escapeHtml(app.name)} logo" width="40" height="40" style="border-radius:10px;margin-bottom:.45rem;background:#111">`
        : "";
      const badge = app.featured ? `<span class="featured-badge">Featured</span>` : "";
      return `<a class="fx-hub-link" href="${guideHref}">${logo}${badge}<strong>${escapeHtml(app.name)}</strong><span>${escapeHtml(app.shortDescription)}</span></a>`;
    })
    .join("");

  const appsHubDesc =
    "Independent guides for Y1 Game, IE777, Junglee Rummy, Mast179, RVIP, 66 Game and HU777 Club, invite links, safety tips, and download notes.";

  const body = `
  <section class="fx-page-hero"><div class="wrap"><h1>Skill app guides</h1><p class="fx-lead">Y1 Game and IE777 lead the homepage. Older rummy brands stay listed below for search and comparison. We are not an official operator site.</p></div></section>
  <section class="block"><div class="wrap"><div class="fx-hub-grid">${cards}</div>
  <div class="fx-cta-band" style="margin-top:1.25rem">
    <p>Start with the two featured invite apps, then expand if you need more options.</p>
    <a class="fx-btn fx-btn--primary" href="/y1-vs-ie777/">Compare Y1 vs IE777</a>
    <a class="fx-btn fx-btn--ghost" href="/#featured" style="margin-top:.5rem">Homepage featured cards</a>
  </div>
  </div></section>`;

  ensure(path.join(OUT, "apps"));
  fs.writeFileSync(
    path.join(OUT, "apps", "index.html"),
    layout({
      pageType: "inner",
      title: "Y1 Game, IE777 & Rummy Apps India 2026 | Guides",
      description: appsHubDesc,
      canonicalPath: "/apps/",
      breadcrumbs: [
        { href: "/", label: "Home" },
        { href: "/apps/", label: "Apps" },
      ],
      keywords: "Y1 Game, IE777 app India, rummy apps India, Junglee Rummy guide, skill app download",
      published: "2026-01-01",
      modified: BUILD_DATE,
      body,
      jsonLd: [
        breadcrumbLd({ slug: "apps", h1: "Apps", category: "apps", metaDescription: "" }),
        webPageLd({
          slug: "apps",
          h1: "Y1 Game, IE777 and rummy app guides",
          metaDescription: appsHubDesc,
          intro: "Independent APK and bonus guides, not official operator sites.",
        }),
        appsListLd(apps),
      ],
    })
  );
}

function collectionLd(name, pages) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    url: `${SITE_URL}/guides/`,
    hasPart: pages.slice(0, 30).map((p) => ({
      "@type": "WebPage",
      name: p.h1,
      url: pageUrl(pagePath(p.slug)),
    })),
  };
}

function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: SITE_URL,
    description: siteConfig.tagline,
    inLanguage: "en-IN",
    publisher: publisherOrg(),
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/guides/`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

function orgLd() {
  const sameAs = Object.values(siteConfig.social || {}).filter(
    (url) => url && !/\/t\.me\/?$|youtube\.com\/?$/i.test(String(url))
  );
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: SITE_URL,
    email: siteConfig.contactEmail,
    logo: { "@type": "ImageObject", url: `${SITE_URL}/images/logo.svg` },
    description: siteConfig.tagline,
    ...(sameAs.length ? { sameAs } : {}),
  };
}

function faqLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

function appsListLd(appList) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Featured skill apps India",
    itemListElement: appList.map((app, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: app.name,
      description: app.shortDescription,
      url: pageUrl(pagePath(app.slug)),
    })),
  };
}

function softwareAppLd(app) {
  if (!app) return null;
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: app.name,
    applicationCategory: "GameApplication",
    operatingSystem: "Android",
    description: app.shortDescription,
    url: pageUrl(pagePath(app.slug)),
    image: app.logo ? `${SITE_URL}${app.logo}` : undefined,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
      url: app.downloadUrl,
    },
  };
}

function buildSeoPendingMd({ lastmod, urlCount }) {
  const all = getAllPages();
  const counts = {
    totalIndexable: urlCount,
    home: 1,
    hubs: 2,
    legal: legalPages.length,
    seoJson: loadJson("data/seo-pages.json").length,
    seoExtra: loadOptionalJson("data/seo-pages-extra.json").length,
    autoAppPages: apps.filter((a) => !seoPages.some((p) => p.slug === a.slug || p.appSlug === a.slug)).length,
    content: all.length,
  };
  return `# SEO audit & pending work: ${siteConfig.name}

> Auto-generated on build (\`${lastmod}\`). Re-run \`npm run build\` to refresh counts.

## Current inventory

| Type | Count | Notes |
|------|------:|-------|
| **Indexable URLs in sitemap** | **${counts.totalIndexable}** | Home + 2 hubs + ${counts.content} pages |
| Homepage | ${counts.home} | WebSite, Organization, FAQPage, ItemList, WebPage schema |
| Hub pages | ${counts.hubs} | \`/guides/\`, \`/apps/\` + CollectionPage / ItemList |
| Core guides (\`seo-pages.json\`) | ${counts.seoJson} | Hand-written |
| Extra guides (\`seo-pages-extra.json\`) | ${counts.seoExtra} | Long-tail topics |
| Legal / trust pages | ${counts.legal} | Privacy, Terms, About |
| Auto app guides | ${counts.autoAppPages} | Non-featured apps without hand-written SEO |
| Featured apps | ${featuredApps.length} | ${featuredApps.map((a) => a.name).join(", ") || "none"} |
| 404 | 1 | \`noindex\`, no canonical |

**Site URL:** \`${SITE_URL}\`  
**Deploy env:** \`SITE_URL\` + \`SITE_INDEX=true\`

### Featured keyword map (no overlap)

| Page | Primary keywords |
|------|------------------|
| \`/y1-game/\` | Y1 Game, Y1 Game download, Y1 app India, Y1 referral link |
| \`/ie777/\` | IE777, IE777 download, IE777 app India, IE777 registration |
| \`/y1-vs-ie777/\` | Y1 vs IE777, Y1 IE777 comparison, game app comparison India |
| \`/\` | Y1 Game download, IE777 app India, Y1 vs IE777 (supporting) |

---

## Implemented in build (code)

- [x] Unique title, description, keywords (where set), canonical, robots
- [x] Open Graph + Twitter + \`article:published_time\` / \`modified_time\`
- [x] \`og:site_name\`, \`og:locale\`, \`og:image:alt\`, author, \`geo.region=IN\`
- [x] JSON-LD: WebSite, Organization, WebPage, Article, FAQPage, BreadcrumbList, CollectionPage, ItemList, SoftwareApplication (featured)
- [x] Homepage focuses on **Y1 Game + IE777** with logos; older apps kept indexable
- [x] \`rel="sponsored noopener noreferrer"\` on affiliate download CTAs
- [x] \`robots.txt\`, \`sitemap.xml\` (${counts.totalIndexable} URLs), \`llms.txt\`, \`.well-known/security.txt\`
- [x] Build-time SEO validation (slugs, H1, canonical, logos, required pages)
- [x] Legal pages in sitemap + footer

---

## Pending: you must do manually (**5** items)

| # | Task | Effort |
|---|------|--------|
| 1 | Re-submit \`${SITE_URL}/sitemap.xml\` in **Google Search Console** (now ${counts.totalIndexable} URLs) | 10 min |
| 2 | Request indexing for \`/y1-game/\`, \`/ie777/\`, \`/y1-vs-ie777/\`, \`/\` | 10 min |
| 3 | Add **GA4** (\`GA_MEASUREMENT_ID\`) if needed | 30 min |
| 4 | **Rich Results Test**, home, \`/y1-game/\`, \`/ie777/\` | 15 min |
| 5 | Review GSC **404** rows from the previous site version | 15 min |

---

## Pending: more content (optional)

| # | Task | Count |
|---|------|------:|
| 6 | Expand auto app stubs (Mast179, RVIP, 66, HU777) | 4 |
| 7 | Wire \`blog-posts.json\` → build | +5-10 |
| 8 | Custom OG images for Y1 / IE777 | 2 |

**Note:** Ranking #1 cannot be guaranteed. This build optimizes structure, uniqueness, and crawlability.

---

## Generated files

| File | Path |
|------|------|
| robots.txt | dist/robots.txt |
| sitemap.xml | dist/sitemap.xml (${counts.totalIndexable} URLs) |
| llms.txt | dist/llms.txt |
| security.txt | dist/.well-known/security.txt |
| This doc | SEO-PENDING.md |

\`\`\`bash
npm run build
\`\`\`
`;
}

function validateSeoBuild({ builtSeo, builtApps, builtLegal }) {
  const errors = [];
  const warnings = [];
  const allContent = [...builtSeo, ...builtApps, ...builtLegal];
  const slugs = allContent.map((p) => p.slug);
  const titles = allContent.map((p) => p.metaTitle);
  const primaryKw = new Map();

  if (new Set(slugs).size !== slugs.length) errors.push("Duplicate page slugs detected.");
  if (new Set(titles).size !== titles.length) warnings.push("Duplicate meta titles detected.");

  for (const page of allContent) {
    if (!page.metaTitle) errors.push(`Missing metaTitle: ${page.slug}`);
    if (!page.metaDescription) errors.push(`Missing metaDescription: ${page.slug}`);
    if (!page.h1) errors.push(`Missing h1: ${page.slug}`);
    const file = path.join(OUT, page.slug, "index.html");
    if (!fs.existsSync(file)) errors.push(`Missing HTML for ${page.slug}`);
    else {
      const html = fs.readFileSync(file, "utf8");
      if (!html.includes('rel="canonical"')) errors.push(`Missing canonical: ${page.slug}`);
      if (html.includes("noindex") && page.category !== "legal") {
        /* legal can be indexed */ 
      }
      if (html.includes('content="noindex')) errors.push(`Unexpected noindex: ${page.slug}`);
      if (!html.includes("<h1")) errors.push(`Missing H1 in HTML: ${page.slug}`);
    }
    const firstKw = (page.keywords || "").split(",")[0]?.trim().toLowerCase();
    if (firstKw) {
      if (primaryKw.has(firstKw)) warnings.push(`Primary keyword overlap: "${firstKw}" on ${primaryKw.get(firstKw)} and ${page.slug}`);
      else primaryKw.set(firstKw, page.slug);
    }
  }

  for (const app of featuredApps) {
    if (!app.logo) warnings.push(`Featured app missing logo: ${app.slug}`);
    else if (!fs.existsSync(path.join(OUT, app.logo.replace(/^\//, "")))) {
      errors.push(`Missing logo file in dist: ${app.logo}`);
    }
    if (!app.downloadUrl?.startsWith("http")) errors.push(`Bad downloadUrl: ${app.slug}`);
  }

  const required = ["y1-game", "ie777", "y1-vs-ie777"];
  for (const slug of required) {
    if (!slugs.includes(slug)) errors.push(`Required page missing: ${slug}`);
  }

  const sitemap = fs.readFileSync(path.join(OUT, "sitemap.xml"), "utf8");
  const locCount = (sitemap.match(/<loc>/g) || []).length;
  const expected = 1 + 2 + allContent.length;
  if (locCount !== expected) warnings.push(`Sitemap URL count ${locCount} != expected ${expected}`);

  const homeHtml = fs.readFileSync(path.join(OUT, "index.html"), "utf8");
  if (!homeHtml.includes("Y1") || !homeHtml.includes("IE777")) errors.push("Homepage missing Y1/IE777 branding.");
  if (homeHtml.includes("winnersTicker") || homeHtml.includes("fx-score")) {
    warnings.push("Homepage still contains decorative social-proof patterns.");
  }

  warnings.forEach((w) => console.warn("[seo]", w));
  if (errors.length) {
    errors.forEach((e) => console.error("[seo]", e));
    throw new Error(`SEO validation failed (${errors.length} errors)`);
  }
  console.log(`[seo] Validation passed (${allContent.length} content pages, ${locCount} sitemap URLs)`);
}

function ensure(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function escapeHtml(input) {
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeXml(input) {
  return escapeHtml(input).replace(/'/g, "&apos;");
}
