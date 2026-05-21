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
const seoPages = [...loadJson("data/seo-pages.json"), ...loadOptionalJson("data/seo-pages-extra.json")];
const legalPages = loadJson("data/legal-pages.json");
const BUILD_DATE = new Date().toISOString().slice(0, 10);
const SPONSORED_REL = "noopener noreferrer sponsored";

const primaryDownload = apps[0]?.downloadUrl || "#download";

const menuSections = [
  {
    title: "Main",
    items: [
      ["/", "Home"],
      ["/guides/", "All guides"],
      ["/apps/", "App guides"],
      ["/best-rummy-apps-india/", "Best rummy apps"],
    ],
  },
  {
    title: "Download",
    items: [
      ["/download-apk/", "APK install guide"],
      ["/rummy-apk-download/", "Rummy APK"],
      ["/#apps", "Compare apps"],
      ["/junglee-rummy/", "Junglee Rummy"],
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
      ["/earn-money-rummy-guide/", "Earn money guide"],
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

prepareOutput();
writeRuntimeAssets();
copyStaticAssets();
writeHomePage();
const builtSeo = writeSeoPages();
const builtApps = writeMissingAppPages();
writeGuidesHub();
writeAppsHub();
const builtLegal = writeLegalPages();
writeSeoFiles();

const totalPages = 1 + builtSeo.length + builtApps.length + builtLegal.length + 2;
console.log(
  `Built ${totalPages} pages (home + ${builtSeo.length + builtApps.length} guides + ${builtLegal.length} legal + hubs) → ${OUT}`
);

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
  --bg:#ffffff;--surface:#faf8f5;--surface-elevated:#ffffff;
  --panel:#ffffff;--panel-border:rgba(212,175,55,.22);
  --text:#1a1a1a;--muted:#555555;
  --burgundy:#5c1010;--felt:#05301b;
  --gold:#d4af37;--gold-hover:#c19b2e;--gold-dark:#9a7b1a;
  --gold-light:#fbf6e8;--gold-soft:rgba(212,175,55,.14);
  --brand:var(--burgundy);
  --red:#c41e2a;--red-hover:#a81822;
  --accent:var(--gold);--accent-light:var(--gold);--accent-dark:var(--gold-dark);--accent-muted:var(--gold-soft);
  --dark:#1a1a1a;
  --grad-btn:linear-gradient(180deg,#e8c547 0%,#d4af37 48%,#b8941f 100%);
  --grad-cta:linear-gradient(180deg,#e53945 0%,#c41e2a 100%);
  --shadow-panel:0 4px 24px rgba(92,16,16,.06);
  --shadow-card:0 12px 40px rgba(212,175,55,.15);
  --header:64px;--dock:72px;--safe-b:env(safe-area-inset-bottom,0px);
  --radius:12px;--radius-sm:10px;--radius-pill:999px;
  --font-sans:"Inter",system-ui,-apple-system,sans-serif;
  --font-display:var(--font-sans);
  --font-body:var(--font-sans);
}
*,*::before,*::after{box-sizing:border-box}
html{scroll-behavior:smooth;scroll-padding-top:calc(var(--header) + 16px)}
body{
  margin:0;font-family:var(--font-body);font-weight:400;
  background:var(--bg);color:var(--text);line-height:1.7;
  -webkit-font-smoothing:antialiased;
  padding-bottom:calc(var(--dock) + var(--safe-b));
  min-height:100dvh;
}
body::before{
  content:"";position:fixed;inset:0;z-index:-3;pointer-events:none;
  background:var(--bg);
}
.bg-motion{
  position:fixed;inset:0;z-index:-2;overflow:hidden;pointer-events:none;
}
.bg-orb{
  position:absolute;border-radius:50%;filter:blur(72px);will-change:transform;
  animation:bg-drift 22s ease-in-out infinite;
}
.bg-orb--1{
  width:min(420px,70vw);height:min(420px,70vw);
  top:-12%;right:-8%;
  background:rgba(212,175,55,.22);
  animation-duration:24s;
}
.bg-orb--2{
  width:min(360px,60vw);height:min(360px,60vw);
  bottom:8%;left:-12%;
  background:rgba(92,16,16,.07);
  animation-duration:28s;animation-delay:-6s;
}
.bg-orb--3{
  width:min(280px,50vw);height:min(280px,50vw);
  top:38%;left:42%;
  background:rgba(212,175,55,.14);
  animation-duration:20s;animation-delay:-12s;
}
.bg-shimmer{
  position:absolute;inset:0;
  background:linear-gradient(115deg,transparent 40%,rgba(212,175,55,.04) 50%,transparent 60%);
  background-size:200% 200%;
  animation:bg-shimmer 14s ease-in-out infinite;
}
@keyframes bg-drift{
  0%,100%{transform:translate(0,0) scale(1)}
  33%{transform:translate(28px,-24px) scale(1.06)}
  66%{transform:translate(-22px,20px) scale(.94)}
}
@keyframes bg-shimmer{
  0%,100%{background-position:0% 50%}
  50%{background-position:100% 50%}
}
main{position:relative;z-index:1}
img{max-width:100%;height:auto;display:block}
a{color:inherit;text-decoration:none}
.wrap{width:min(100% - 1.5rem,440px);margin-inline:auto}
.block{padding:3.5rem 0;position:relative}
.block:nth-child(even){background:var(--surface)}
.block-head{margin-bottom:1.5rem}
.eyebrow{
  display:inline-flex;align-items:center;gap:.5rem;font-size:.68rem;font-weight:600;
  letter-spacing:.12em;text-transform:uppercase;color:var(--gold-dark);margin-bottom:.6rem;
}
.eyebrow::before{content:"";width:20px;height:2px;background:var(--gold);border-radius:2px}
.block-title{font-size:clamp(1.55rem,5vw,2rem);font-weight:800;margin:0;letter-spacing:-.03em;line-height:1.2;color:var(--text)}
.block-desc{margin:.5rem 0 0;font-size:.95rem;color:var(--muted);max-width:42ch}
.block-desc a{color:var(--gold-dark);font-weight:600}
.block-desc a:hover{color:var(--burgundy)}

.shell{
  position:fixed;top:0;left:0;right:0;z-index:100;height:var(--header);
  border-bottom:1px solid var(--panel-border);
  background:rgba(255,255,255,.92);backdrop-filter:blur(12px);
  box-shadow:0 1px 0 rgba(212,175,55,.12);
}
.shell-inner{height:100%;display:flex;align-items:center;justify-content:space-between;padding:0 1rem;max-width:1100px;margin:0 auto;gap:.75rem}
.brand{display:flex;align-items:center;gap:.55rem;font-weight:700;font-size:1rem;color:var(--burgundy);flex-shrink:0}
.brand-text{letter-spacing:.02em}
.brand-mark{width:36px;height:36px;border-radius:var(--radius-sm);padding:3px;background:var(--gold-light);border:1px solid var(--panel-border)}
.shell-actions{display:flex;align-items:center;gap:.5rem;margin-left:auto}
.shell-link{display:none;font-size:.88rem;font-weight:500;color:var(--muted);padding:.4rem .65rem}
.shell-link:hover{color:var(--burgundy)}
.shell-cta.fx-btn{
  display:none;min-height:30px;padding:0 .65rem;font-size:.7rem;font-weight:600;
  width:auto;white-space:nowrap;border-radius:8px;
  box-shadow:0 2px 8px rgba(196,30,42,.22);
}
.nav-toggle{
  width:42px;height:42px;border-radius:var(--radius-sm);border:1px solid var(--panel-border);
  background:var(--bg);color:var(--text);cursor:pointer;
  display:grid;place-items:center;font-size:1.1rem;flex-shrink:0;
}
.drawer{position:fixed;inset:0;z-index:110;pointer-events:none;display:flex;flex-direction:column;align-items:center}
.drawer.is-open{pointer-events:auto}
.drawer-bg{position:absolute;inset:0;background:rgba(26,26,26,.35);backdrop-filter:blur(4px);opacity:0;transition:opacity .3s}
.drawer.is-open .drawer-bg{opacity:1}
.drawer-panel{
  position:relative;z-index:1;width:min(92vw,420px);max-height:min(78vh,560px);overflow-y:auto;
  margin-top:calc(var(--header) + .5rem);
  background:var(--bg);border:1px solid var(--panel-border);
  border-radius:var(--radius);
  padding:1rem 1.15rem 1.25rem;
  box-shadow:var(--shadow-card);
  transform:translateY(calc(-100% - var(--header) - 1rem));opacity:0;
  transition:transform .35s cubic-bezier(.16,1,.3,1),opacity .3s;
  display:flex;flex-direction:column;gap:.5rem;
}
.drawer.is-open .drawer-panel{transform:translateY(0);opacity:1}
.menu-panel-title{
  margin:0 0 .25rem;font-size:.7rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;
  color:var(--muted);text-align:center;
}
.menu-group{padding:.35rem 0;border-bottom:1px solid rgba(212,175,55,.12)}
.menu-group:last-of-type{border-bottom:none}
.menu-group-title{
  margin:0 0 .4rem;font-size:.65rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;
  color:var(--gold-dark);
}
.menu-group-links{display:grid;grid-template-columns:1fr 1fr;gap:.25rem .5rem}
.menu-group-links a{
  padding:.55rem .65rem;border-radius:var(--radius-sm);font-weight:500;font-size:.82rem;
  color:var(--text);border:1px solid transparent;transition:border-color .2s,background .2s;
}
.menu-group-links a:hover,.menu-group-links a:focus{border-color:var(--panel-border);background:var(--gold-soft)}
.drawer-foot{margin-top:.5rem;display:grid;gap:.5rem;padding-top:.75rem;border-top:1px solid var(--panel-border)}

.fx-hero{
  padding-top:calc(var(--header) + 1.5rem);padding-bottom:3rem;position:relative;overflow:hidden;
  background:var(--bg);
}
.fx-hero-wave{
  position:absolute;top:0;right:-20%;width:70%;height:100%;z-index:0;pointer-events:none;
  background:radial-gradient(ellipse 80% 70% at 70% 30%,rgba(212,175,55,.14),transparent 65%),
    radial-gradient(ellipse 60% 50% at 100% 80%,rgba(92,16,16,.06),transparent 55%);
}
.fx-hero-grid{position:relative;z-index:1}
.fx-hero-copy{position:relative}
.fx-pill{
  display:inline-flex;padding:.35rem .85rem;border-radius:var(--radius-pill);font-size:.65rem;font-weight:600;
  letter-spacing:.08em;text-transform:uppercase;color:var(--gold-dark);
  background:var(--gold-light);border:1px solid rgba(212,175,55,.35);
  margin-bottom:1rem;
}
.fx-hero h1{
  font-size:clamp(1.85rem,7vw,2.65rem);font-weight:800;
  line-height:1.15;margin:0 0 1rem;letter-spacing:-.03em;color:var(--text);
}
.fx-highlight{
  display:inline;color:var(--gold-dark);background:var(--gold-light);
  padding:.08em .35em;border-radius:var(--radius-sm);box-decoration-break:clone;
  border:1px solid rgba(212,175,55,.3);
}
.fx-lead{font-size:1rem;font-weight:500;color:var(--muted);margin:0 0 1.25rem;max-width:40ch;line-height:1.75}
.fx-chip{
  display:flex;gap:.75rem;padding:1rem 1.1rem;border-radius:var(--radius);
  background:var(--surface);border:1px solid var(--panel-border);margin-bottom:1.25rem;
  font-size:.88rem;box-shadow:var(--shadow-panel);
}
.fx-chip-dot{width:8px;height:8px;border-radius:50%;background:var(--gold);flex-shrink:0;margin-top:.45rem}
.fx-chip strong{display:block;color:var(--text);font-weight:600;margin-bottom:.15rem}
.fx-actions{display:grid;gap:.65rem}
.fx-hero-hint{display:flex;align-items:center;gap:.4rem;margin:1rem 0 0;font-size:.8rem;color:var(--muted)}
.fx-hero-hint-icon{font-size:.9rem}
.fx-hero-visual{position:relative;margin-top:1.5rem}
.fx-float-card{
  position:absolute;z-index:2;padding:.65rem .85rem;border-radius:var(--radius);
  background:var(--bg);border:1px solid var(--panel-border);box-shadow:var(--shadow-card);
  font-size:.72rem;max-width:140px;
}
.fx-float-card strong{display:block;font-size:.78rem;color:var(--text);margin-bottom:.15rem}
.fx-float-card span{color:var(--muted);line-height:1.35}
.fx-float-card--mint{top:-.5rem;left:-.25rem;background:var(--gold-light);border-color:rgba(212,175,55,.35)}
.fx-float-card--mint strong{color:var(--gold-dark)}
.fx-float-card--gold{bottom:1rem;right:-.25rem;background:var(--bg);border-color:var(--panel-border)}
.fx-float-card--gold strong{color:var(--burgundy)}
.fx-frame{
  border-radius:var(--radius);overflow:hidden;
  border:1px solid var(--panel-border);box-shadow:var(--shadow-card);
  position:relative;background:var(--surface);
}
.fx-frame::after{display:none}

.fx-btn{
  display:inline-flex;align-items:center;justify-content:center;gap:.5rem;
  min-height:52px;padding:0 1.35rem;border-radius:var(--radius-sm);font-family:var(--font-body);
  font-weight:600;font-size:.92rem;border:none;cursor:pointer;width:100%;
  transition:background .15s,transform .12s,box-shadow .15s;
}
.fx-btn:active{transform:translateY(1px)}
.fx-btn--primary{
  background:var(--grad-btn);color:#1a1408;
  box-shadow:0 4px 16px rgba(212,175,55,.35);
  border:1px solid var(--gold-dark);
}
.fx-btn--primary:hover{filter:brightness(1.05)}
.fx-btn--dark{
  background:var(--grad-cta);color:#fff;
  box-shadow:0 4px 14px rgba(196,30,42,.3);
  border:1px solid #a81822;
}
.fx-btn--dark:hover{filter:brightness(1.06)}
.fx-btn--ghost{
  background:var(--bg);color:var(--burgundy);
  border:1px solid var(--panel-border);
}
.fx-btn--ghost:hover{border-color:var(--gold);background:var(--gold-soft);color:var(--gold-dark)}

.fx-stats{display:grid;grid-template-columns:repeat(2,1fr);gap:.65rem}
.fx-stat{
  padding:1rem;border-radius:var(--radius);text-align:center;
  background:var(--panel);border:1px solid var(--panel-border);box-shadow:var(--shadow-panel);
}
.fx-stat b{
  display:block;font-size:1.5rem;font-weight:800;
  color:var(--gold-dark);letter-spacing:-.02em;
}
.fx-stat span{font-size:.72rem;color:var(--muted);font-weight:500}

.fx-apps{display:flex;flex-direction:column;gap:.85rem}
.fx-app{
  padding:1.25rem;border-radius:var(--radius);
  background:var(--panel);
  border:1px solid var(--panel-border);
  display:grid;gap:.75rem;transition:border-color .2s,box-shadow .2s;box-shadow:var(--shadow-panel);
}
.fx-app:hover{border-color:rgba(212,175,55,.45);box-shadow:var(--shadow-card)}
.fx-app-top{display:flex;justify-content:space-between;align-items:flex-start;gap:.5rem}
.fx-app h3{margin:0;font-size:1.05rem;font-weight:700;color:var(--text)}
.fx-score{font-size:.68rem;font-weight:600;padding:.25rem .5rem;border-radius:var(--radius-pill);background:var(--gold-light);color:var(--gold-dark);border:1px solid rgba(212,175,55,.35);font-family:var(--font-body)}
.fx-app p{margin:0;font-size:.88rem;color:var(--muted);line-height:1.55}
.fx-tags{display:flex;flex-wrap:wrap;gap:.4rem}
.fx-tag{font-size:.62rem;padding:.28rem .55rem;border-radius:var(--radius-pill);background:var(--surface);color:var(--muted);border:1px solid var(--panel-border)}

.fx-timeline{display:flex;flex-direction:column;gap:0;position:relative;padding-left:1.5rem}
.fx-timeline::before{
  content:"";position:absolute;left:.45rem;top:.5rem;bottom:.5rem;width:2px;
  background:linear-gradient(180deg,var(--gold),rgba(212,175,55,.25),transparent);
  border-radius:2px;
}
.fx-step{position:relative;padding:0 0 1.25rem}
.fx-step::before{
  content:"";position:absolute;left:-1.55rem;top:.45rem;width:10px;height:10px;border-radius:50%;
  background:var(--gold);border:2px solid var(--bg);box-shadow:0 0 0 2px var(--gold-soft);
}
.fx-step h3{margin:0 0 .25rem;font-size:.95rem;font-weight:700}
.fx-step p{margin:0;font-size:.85rem;color:var(--muted)}

.fx-stream{
  border-radius:var(--radius);border:1px solid var(--panel-border);
  background:var(--panel);overflow:hidden;padding:.6rem 0;box-shadow:var(--shadow-panel);
}
.fx-stream-track{display:flex;gap:.5rem;width:max-content;animation:stream 35s linear infinite}
.fx-stream-item{
  flex:0 0 auto;padding:.45rem .9rem;border-radius:var(--radius-pill);font-size:.76rem;white-space:nowrap;
  background:var(--bg);border:1px solid var(--panel-border);box-shadow:var(--shadow-panel);
}
.fx-stream-item b{color:var(--burgundy);font-weight:600}
@keyframes stream{to{transform:translateX(-50%)}}

.fx-grid{display:grid;gap:.65rem}
.fx-tile{
  padding:1rem;border-radius:var(--radius);background:var(--panel);
  border:1px solid var(--panel-border);box-shadow:var(--shadow-panel);
}
.fx-tile h3{margin:0 0 .35rem;font-size:.9rem;font-weight:700}
.fx-tile p{margin:0;font-size:.82rem;color:var(--muted)}

.fx-scroll{display:flex;gap:.75rem;overflow-x:auto;padding:.25rem 0 1rem;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch}
.fx-scroll::-webkit-scrollbar{height:4px}
.fx-scroll::-webkit-scrollbar-thumb{background:var(--accent-dark);border-radius:4px}
.fx-quote{
  flex:0 0 min(88%,320px);scroll-snap-align:center;padding:1.15rem;border-radius:var(--radius);
  background:var(--panel);border:1px solid var(--panel-border);box-shadow:var(--shadow-panel);
}
.fx-quote p{margin:0 0 .65rem;font-size:.88rem;font-style:italic;color:var(--text)}
.fx-quote cite{font-size:.75rem;color:var(--muted);font-style:normal;font-weight:500}

.fx-faq{display:flex;flex-direction:column;gap:.5rem}
.fx-faq-item{border-radius:var(--radius);border:1px solid var(--panel-border);background:var(--panel);overflow:hidden;box-shadow:var(--shadow-panel)}
.fx-faq-q{
  width:100%;text-align:left;padding:1rem 2.75rem 1rem 1rem;border:0;background:transparent;
  color:var(--text);font-family:var(--font-body);font-weight:500;font-size:.9rem;cursor:pointer;position:relative;
}
.fx-faq-q::after{
  content:"";position:absolute;right:1rem;top:50%;width:10px;height:10px;
  border-right:2px solid var(--accent);border-bottom:2px solid var(--accent);
  transform:translateY(-65%) rotate(45deg);transition:transform .25s;
}
.fx-faq-item.is-open .fx-faq-q::after{transform:translateY(-35%) rotate(-135deg)}
.fx-faq-a{max-height:0;overflow:hidden;transition:max-height .35s ease}
.fx-faq-item.is-open .fx-faq-a{max-height:520px}
.fx-faq-a-inner{padding:0 1rem 1rem;font-size:.85rem;color:var(--muted);line-height:1.55}

.fx-legal{
  padding:1.15rem;border-radius:var(--radius);font-size:.8rem;color:var(--muted);
  border:1px solid var(--panel-border);background:var(--surface);box-shadow:var(--shadow-panel);
}
.fx-legal strong{display:block;color:var(--burgundy);font-weight:700;margin-bottom:.5rem;font-size:.9rem}

.fx-kw{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:1rem}
.fx-kw span{font-size:.65rem;padding:.32rem .65rem;border-radius:var(--radius-pill);background:var(--gold-light);color:var(--gold-dark);border:1px solid rgba(212,175,55,.3);font-weight:500}
.fx-prose{font-size:.88rem;font-weight:500;color:var(--muted);line-height:1.7}
.fx-prose p{margin:0 0 .85rem}
.fx-prose p:last-child{margin-bottom:0}
.fx-mini{display:grid;gap:.6rem}
.fx-mini-card{padding:1rem;border-radius:var(--radius);background:var(--panel);border:1px solid var(--panel-border);box-shadow:var(--shadow-panel)}
.fx-mini-card h3{margin:0 0 .3rem;font-size:1rem;font-weight:700;color:var(--burgundy)}
.fx-mini-card p{margin:0;font-size:.82rem;color:var(--muted)}
.fx-cta-band{
  margin-top:1.25rem;padding:1.25rem;border-radius:var(--radius);text-align:center;
  background:var(--surface);
  border:1px solid var(--panel-border);box-shadow:var(--shadow-panel);
}
.fx-cta-band p{margin:0 0 .85rem;font-size:.88rem;color:var(--muted)}

.fx-crumb{
  display:flex;flex-wrap:wrap;align-items:center;gap:.35rem;
  font-size:.72rem;color:var(--muted);margin-bottom:1rem;padding-top:calc(var(--header) + .5rem);
}
.fx-crumb a{color:var(--gold-dark)}
.fx-crumb span{opacity:.5}
.fx-page-hero{padding:1.25rem 0 1.75rem}
.fx-page-hero h1{font-size:clamp(1.65rem,6vw,2rem);font-weight:800;margin:0 0 .65rem;letter-spacing:-.03em;line-height:1.15}
.fx-page-hero .fx-lead{margin:0;max-width:42ch}
.fx-section{margin-bottom:1.35rem}
.fx-section h2{font-size:1.15rem;font-weight:700;margin:0 0 .45rem;color:var(--burgundy);letter-spacing:-.02em}
.fx-section .fx-prose a{color:var(--gold-dark);text-decoration:underline;text-underline-offset:2px}
.fx-related{display:flex;flex-wrap:wrap;gap:.45rem;margin-top:1.25rem}
.fx-related a{
  font-size:.76rem;padding:.4rem .75rem;border-radius:var(--radius-pill);
  background:var(--gold-light);border:1px solid rgba(212,175,55,.3);color:var(--gold-dark);font-weight:600;
}
.fx-hub-grid{display:grid;gap:.55rem}
.fx-hub-link{
  display:block;padding:.9rem 1rem;border-radius:var(--radius);
  background:var(--panel);border:1px solid var(--panel-border);box-shadow:var(--shadow-panel);
  transition:border-color .2s;
}
.fx-hub-link:hover{border-color:rgba(212,175,55,.45);box-shadow:var(--shadow-panel)}
.fx-hub-link strong{display:block;font-size:.9rem;color:var(--text);margin-bottom:.2rem}
.fx-hub-link span{font-size:.78rem;color:var(--muted)}
body.page-inner{padding-bottom:1.5rem}
.fx-mini-card--link{display:block;text-decoration:none;color:inherit;transition:border-color .2s,transform .15s}
.fx-mini-card--link:hover{border-color:rgba(212,175,55,.5);transform:translateY(-2px);box-shadow:var(--shadow-card)}
.fx-app-actions{display:grid;gap:.5rem}
.fx-app-guide{font-size:.78rem;color:var(--gold-dark);text-align:center;padding:.35rem;font-weight:600}
.fx-app-guide:hover{color:var(--burgundy);text-decoration:underline}
.section-explore{background:var(--surface);border-top:1px solid var(--panel-border);border-bottom:1px solid var(--panel-border)}

.site-foot{
  margin-top:2rem;padding:2.5rem 0 1.5rem;
  border-top:1px solid var(--panel-border);
  background:var(--surface);
}
.site-foot-grid{display:grid;gap:1.75rem}
.site-foot-brand strong{display:block;font-size:1.1rem;font-weight:700;color:var(--burgundy);margin-bottom:.35rem}
.site-foot-brand p{margin:0;font-size:.85rem;color:var(--muted);max-width:32ch}
.site-foot-col h3{
  margin:0 0 .65rem;font-size:.88rem;font-weight:700;
  color:var(--text);
}
.site-foot-col ul{list-style:none;margin:0;padding:0}
.site-foot-col li{margin-bottom:.4rem}
.site-foot-col a{font-size:.82rem;color:var(--muted);line-height:1.4}
.site-foot-col a:hover{color:var(--gold-dark)}
.site-foot-all{margin-top:.5rem}
.site-foot-all a{font-size:.82rem;font-weight:600;color:var(--gold-dark)}
.site-foot-bottom{
  margin-top:1.75rem;padding-top:1rem;border-top:1px solid var(--panel-border);
  text-align:center;font-size:.75rem;color:var(--muted);line-height:1.5;
}
.site-foot-bottom a{color:var(--burgundy)}

.fx-foot{padding:1.5rem 0;text-align:center;font-size:.75rem;color:var(--muted)}
.fx-foot a{color:var(--gold-dark);font-weight:500}

.fx-dock{
  position:fixed;left:0;right:0;bottom:0;z-index:90;
  padding:.55rem 1rem calc(.55rem + var(--safe-b));
  background:rgba(255,255,255,.96);backdrop-filter:blur(10px);
  border-top:1px solid var(--panel-border);
  box-shadow:0 -4px 20px rgba(212,175,55,.12);
}
.fx-dock-inner{max-width:440px;margin:0 auto;display:grid;grid-template-columns:1fr 1.5fr;gap:.55rem}
.fx-dock .fx-btn{min-height:48px;font-size:.88rem}

@media(min-width:640px){
  .wrap{width:min(100% - 2.5rem,720px)}
  .fx-dock-inner{max-width:720px}
  .fx-stats{grid-template-columns:repeat(4,1fr)}
  .fx-apps{display:grid;grid-template-columns:1fr 1fr}
  .fx-hub-grid{grid-template-columns:1fr 1fr}
  .site-foot-grid{grid-template-columns:1.4fr 1fr 1fr}
  .shell-link{display:inline-block}
  .shell-cta.fx-btn{display:inline-flex;min-height:32px;padding:0 .75rem;font-size:.72rem}
  body{padding-bottom:0}
  .fx-dock{display:none}
}
@media(min-width:900px){
  .wrap{width:min(100% - 3rem,1040px)}
  .fx-hero-grid{display:grid;grid-template-columns:1fr 1fr;gap:2.5rem;align-items:center}
  .fx-hero-visual{margin-top:0}
  .fx-actions{grid-template-columns:1fr 1fr}
  .fx-actions .fx-btn--primary{grid-column:1/-1}
  .fx-mini{grid-template-columns:repeat(2,1fr)}
  .fx-grid{grid-template-columns:repeat(2,1fr)}
}
@media(prefers-reduced-motion:reduce){
  .fx-stream-track{animation:none}
  .bg-orb,.bg-shimmer{animation:none}
  html{scroll-behavior:auto}
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
  document.querySelectorAll(".fx-faq-q").forEach(function(btn){
    btn.addEventListener("click",function(){
      var item=btn.closest(".fx-faq-item");
      var was=item.classList.contains("is-open");
      document.querySelectorAll(".fx-faq-item.is-open").forEach(function(el){el.classList.remove("is-open");});
      if(!was)item.classList.add("is-open");
    });
  });
  var track=document.getElementById("winnersTicker");
  if(track&&!matchMedia("(prefers-reduced-motion:reduce)").matches){track.innerHTML=track.innerHTML+track.innerHTML;}
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
  const title = "Best Rummy App India 2026 | Rummy APK Download & Bonus Guide";
  const description =
    "Compare best rummy apps in India — Junglee Rummy APK, Mast179, RVIP, 66 Game & HU777. Official rummy APK download, welcome bonus, referral codes, 13-card rummy tips & safe install guide.";

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
      appsListLd(apps),
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
      body: `<section class="block"><div class="wrap"><h1 class="block-title">Page not found</h1><p class="block-desc">Browse <a href="/guides/">guides</a> or return <a href="/">home</a>.</p><a class="fx-btn fx-btn--primary" href="/" style="margin-top:1rem">Go home</a></div></section>`,
    })
  );
}

function homeBody(h) {
  const streamItems = home.winners
    .map((w) => `<span class="fx-stream-item"><b>${escapeHtml(w.name)}</b> ${escapeHtml(w.amount)} · ${escapeHtml(w.game)}</span>`)
    .join("");

  const appCards = apps
    .map(
      (app, i) => `
    <article class="fx-app">
      <div class="fx-app-top">
        <h3>${escapeHtml(app.name)}</h3>
        <span class="fx-score">${(4.5 + (i % 3) * 0.1).toFixed(1)}</span>
      </div>
      <p>${escapeHtml(app.shortDescription)}</p>
      <div class="fx-tags">${(app.seoKeywords || app.features).slice(0, 3).map((f) => `<span class="fx-tag">${escapeHtml(f)}</span>`).join("")}</div>
      <div class="fx-app-actions">
        <a class="fx-btn fx-btn--primary" href="${escapeHtml(app.downloadUrl)}" target="_blank" rel="${sponsoredRel()}">Download APK</a>
        <a class="fx-app-guide" href="${appGuideHref(app.slug)}">Read ${escapeHtml(app.name)} guide →</a>
      </div>
    </article>`
    )
    .join("");

  const kw = (home.keywords || []).map((k) => `<span>${escapeHtml(k)}</span>`).join("");
  const seoParas = (home.seoIntro?.paragraphs || []).map((p) => `<p>${escapeHtml(p)}</p>`).join("");
  const gameCards = (home.games || [])
    .map(
      (g) =>
        `<a class="fx-mini-card fx-mini-card--link" href="${pagePath(g.slug)}"><h3>${escapeHtml(g.name)}</h3><p>${escapeHtml(g.desc)}</p></a>`
    )
    .join("");
  const bonusCards = (home.bonuses || [])
    .map(
      (b) =>
        `<a class="fx-mini-card fx-mini-card--link" href="${pagePath(b.slug)}"><h3>${escapeHtml(b.title)}</h3><p>${escapeHtml(b.desc)}</p></a>`
    )
    .join("");
  const apkSteps = (home.apkGuide?.steps || [])
    .map((step) => `<article class="fx-step"><h3>${escapeHtml(step.title)}</h3><p>${escapeHtml(step.body)}</p></article>`)
    .join("");

  return `
  <section class="fx-hero" id="top">
    <div class="fx-hero-wave" aria-hidden="true"></div>
    <div class="wrap fx-hero-grid">
      <div class="fx-hero-copy">
        <p class="fx-pill">${escapeHtml(h.badge)}</p>
        <h1>${escapeHtml(h.title)} <span class="fx-highlight">${escapeHtml(h.titleHighlight)}</span></h1>
        <p class="fx-lead">${escapeHtml(h.subtitle)}</p>
        <div class="fx-chip"><span class="fx-chip-dot" aria-hidden></span><div><strong>${escapeHtml(h.bonusLabel)}</strong> ${escapeHtml(h.bonusText)}</div></div>
        <div class="fx-actions">
          <a class="fx-btn fx-btn--primary" href="${escapeHtml(primaryDownload)}" target="_blank" rel="${sponsoredRel()}">${escapeHtml(h.ctaPrimary)}</a>
          <a class="fx-btn fx-btn--ghost" href="#apps">${escapeHtml(h.ctaSecondary)}</a>
        </div>
        <p class="fx-hero-hint"><span class="fx-hero-hint-icon" aria-hidden>⏱</span> Official links · Compare in under 2 minutes</p>
      </div>
      <div class="fx-hero-visual">
        <div class="fx-frame">
          <img src="/images/main.png" alt="Best rummy app India — APK download comparison" width="480" height="360" loading="eager">
        </div>
        <div class="fx-float-card fx-float-card--mint"><strong>5+ apps</strong><span>Compared side by side</span></div>
        <div class="fx-float-card fx-float-card--gold"><strong>Official APK</strong><span>Verified download paths</span></div>
      </div>
    </div>
  </section>

  <section class="block" id="trust">
    <div class="wrap">
      <div class="block-head"><p class="eyebrow">Trust</p><h2 class="block-title">Independent rummy guides</h2><p class="block-desc">Not affiliated with Junglee, Mast179, RVIP, 66 Game or HU777.</p></div>
      <div class="fx-stats">${home.trust.map((t) => `<div class="fx-stat"><b>${escapeHtml(t.value)}</b><span>${escapeHtml(t.label)}</span></div>`).join("")}</div>
    </div>
  </section>

  <section class="block" id="guide">
    <div class="wrap">
      <div class="block-head"><p class="eyebrow">Guide</p><h2 class="block-title">${escapeHtml(home.seoIntro?.title || "Online rummy India")}</h2><p class="block-desc"><a href="/guides/">View all ${getAllPages().length} pages</a> · <a href="/apps/">App guides</a></p></div>
      <div class="fx-prose">${seoParas}</div>
      <div class="fx-kw" aria-label="Topics">${kw}</div>
    </div>
  </section>

  <section class="block" id="apps">
    <div class="wrap">
      <div class="block-head"><p class="eyebrow">Rummy apps</p><h2 class="block-title">Best rummy app download — compared</h2><p class="block-desc"><a href="/best-rummy-apps-india/">Best apps guide</a> · <a href="/apps/">All app pages</a></p></div>
      <div class="fx-apps">${appCards}</div>
      <div class="fx-cta-band">
        <p>Top pick: <strong>${escapeHtml(apps[0]?.name || "Junglee Rummy")}</strong> — official invite link below.</p>
        <a class="fx-btn fx-btn--primary" href="${escapeHtml(primaryDownload)}" target="_blank" rel="${sponsoredRel()}">Download ${escapeHtml(apps[0]?.name || "Rummy")} APK</a>
      </div>
    </div>
  </section>

  <section class="block" id="games">
    <div class="wrap">
      <div class="block-head"><p class="eyebrow">Game types</p><h2 class="block-title">Rummy & skill games</h2><p class="block-desc">Tap a topic for the full guide.</p></div>
      <div class="fx-mini">${gameCards}</div>
    </div>
  </section>

  <section class="block" id="bonuses">
    <div class="wrap">
      <div class="block-head"><p class="eyebrow">Bonuses</p><h2 class="block-title">Welcome bonus & referral codes</h2><p class="block-desc"><a href="/welcome-bonus/">Welcome bonus</a> · <a href="/referral-bonus/">Referral</a> · <a href="/cashback-offer/">Cashback</a></p></div>
      <div class="fx-mini">${bonusCards}</div>
    </div>
  </section>

  <section class="block" id="apk">
    <div class="wrap">
      <div class="block-head"><p class="eyebrow">APK</p><h2 class="block-title">${escapeHtml(home.apkGuide?.title || "Rummy APK download")}</h2><p class="block-desc"><a href="/download-apk/">Full APK guide</a> · <a href="/rummy-apk-download/">Rummy APK page</a></p></div>
      <div class="fx-timeline">${apkSteps}</div>
    </div>
  </section>

  <section class="block" id="how">
    <div class="wrap">
      <div class="block-head"><p class="eyebrow">Quick start</p><h2 class="block-title">How to play real-money rummy</h2></div>
      <div class="fx-timeline">${home.howItWorks.map((s) => `<article class="fx-step"><h3>${escapeHtml(s.title)}</h3><p>${escapeHtml(s.body)}</p></article>`).join("")}</div>
    </div>
  </section>

  <section class="block" id="benefits">
    <div class="wrap">
      <div class="block-head"><p class="eyebrow">Why us</p><h2 class="block-title">Why Best Rummy Hubs</h2></div>
      <div class="fx-grid">${home.whyChoose.map((w) => `<article class="fx-tile"><h3>${escapeHtml(w.title)}</h3><p>${escapeHtml(w.body)}</p></article>`).join("")}</div>
    </div>
  </section>

  <section class="block" id="security">
    <div class="wrap">
      <div class="block-head"><p class="eyebrow">Safety</p><h2 class="block-title">KYC, UPI & responsible play</h2></div>
      <div class="fx-grid">${(home.securityTips || []).map((w) => `<article class="fx-tile"><h3>${escapeHtml(w.title)}</h3><p>${escapeHtml(w.body)}</p></article>`).join("")}</div>
    </div>
  </section>

  <section class="block" id="activity">
    <div class="wrap">
      <div class="block-head"><p class="eyebrow">Activity</p><h2 class="block-title">Recent wins</h2><p class="block-desc">Illustrative — not guaranteed.</p></div>
      <div class="fx-stream"><div class="fx-stream-track" id="winnersTicker">${streamItems}</div></div>
    </div>
  </section>

  <section class="block" id="reviews">
    <div class="wrap">
      <div class="block-head"><p class="eyebrow">Reviews</p><h2 class="block-title">Player feedback</h2></div>
      <div class="fx-scroll">${home.testimonials.map((t) => `<blockquote class="fx-quote"><p>${escapeHtml(t.quote)}</p><cite>${escapeHtml(t.name)} · ${escapeHtml(t.city)}</cite></blockquote>`).join("")}</div>
    </div>
  </section>

  <section class="block" id="faq">
    <div class="wrap">
      <div class="block-head"><p class="eyebrow">FAQ</p><h2 class="block-title">Rummy APK & bonus FAQ</h2><p class="block-desc"><a href="/faqs/">Full FAQ page</a></p></div>
      <div class="fx-faq">${faqs.map((f) => `<div class="fx-faq-item"><button type="button" class="fx-faq-q">${escapeHtml(f.question)}</button><div class="fx-faq-a"><div class="fx-faq-a-inner">${escapeHtml(f.answer)}</div></div></div>`).join("")}</div>
    </div>
  </section>

  <section class="block" id="legal">
    <div class="wrap">
      <div class="fx-legal">
        <strong>Responsible gaming & legality</strong>
        <p>${escapeHtml(home.responsibleGaming)}</p>
        <p style="margin-top:.75rem">${escapeHtml(siteConfig.independentNotice)}</p>
        <p style="margin-top:.75rem">${escapeHtml(siteConfig.disclaimerShort)}</p>
      </div>
    </div>
  </section>

  ${homeExploreSection()}

  <div class="fx-dock">
    <div class="fx-dock-inner">
      <a class="fx-btn fx-btn--ghost" href="#apps">Apps</a>
      <a class="fx-btn fx-btn--primary" href="${escapeHtml(primaryDownload)}" target="_blank" rel="${sponsoredRel()}">Rummy APK</a>
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
</head>
<body${bodyClass}>
  <div class="bg-motion" aria-hidden="true">
    <span class="bg-orb bg-orb--1"></span>
    <span class="bg-orb bg-orb--2"></span>
    <span class="bg-orb bg-orb--3"></span>
    <span class="bg-shimmer"></span>
  </div>
  <header class="shell">
    <div class="shell-inner">
      <a class="brand" href="${brandHref}">
        <img src="/images/logo.svg" alt="${escapeHtml(siteConfig.name)} logo" width="36" height="36" class="brand-mark">
        <span class="brand-text">${escapeHtml(siteConfig.name)}</span>
      </a>
      <div class="shell-actions">
        <a class="shell-link" href="/guides/">Guides</a>
        <a class="fx-btn fx-btn--dark shell-cta" href="${escapeHtml(primaryDownload)}" target="_blank" rel="${sponsoredRel()}">Download</a>
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
        <a class="fx-btn fx-btn--primary" href="${escapeHtml(primaryDownload)}" target="_blank" rel="${sponsoredRel()}">Download APK</a>
        <button type="button" class="fx-btn fx-btn--ghost" id="menuClose">Close menu</button>
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
    h1: `${app.name} — app guide`,
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
        answer: "Tap the official download button on this page. Install only from the operator's verified flow — never random chat APKs.",
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
      ${col("Popular", [seoPages.find((p) => p.slug === "best-rummy-apps-india"), seoPages.find((p) => p.slug === "junglee-rummy"), seoPages.find((p) => p.slug === "download-apk"), seoPages.find((p) => p.slug === "rummy-apk-download"), seoPages.find((p) => p.slug === "faqs")].filter(Boolean), "/guides/", "All pages →")}
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
  const img = `${SITE_URL}/images/main.png`;
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
    <meta property="og:image:alt" content="${escapeHtml(siteConfig.name)} — rummy app guides India">
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
    : `# Staging — do not index\nUser-agent: *\nDisallow: /\n`;
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
      <article class="fx-section">
        <h2>${escapeHtml(s.heading)}</h2>
        <div class="fx-prose"><p>${parseInlineLinks(s.body)}</p></div>
      </article>`
    )
    .join("");

  const faqBlock =
    pageFaqs.length > 0
      ? `
  <section class="block" id="faq">
    <div class="wrap">
      <div class="block-head"><p class="eyebrow">FAQ</p><h2 class="block-title">Common questions</h2></div>
      <div class="fx-faq">${pageFaqs
        .map(
          (f) =>
            `<div class="fx-faq-item"><button type="button" class="fx-faq-q">${escapeHtml(f.question)}</button><div class="fx-faq-a"><div class="fx-faq-a-inner">${escapeHtml(f.answer)}</div></div></div>`
        )
        .join("")}</div>
    </div>
  </section>`
      : "";

  const related = enrichRelated(page)
    .map((href) => `<a href="${href}">${escapeHtml(relatedLabel(href))}</a>`)
    .join("");

  const downloadCta = app
    ? `
      <div class="fx-cta-band">
        <p>Official ${escapeHtml(app.name)} install link — verify terms in-app. <small>Sponsored referral link.</small></p>
        <a class="fx-btn fx-btn--primary" href="${escapeHtml(app.downloadUrl)}" target="_blank" rel="${sponsoredRel()}">Download ${escapeHtml(app.name)}</a>
      </div>`
    : "";

  return `
  <section class="fx-page-hero">
    <div class="wrap">
      <p class="fx-pill">${escapeHtml(CATEGORY_LABELS[page.category] || "Guide")}</p>
      <h1>${escapeHtml(page.h1)}</h1>
      <p class="fx-lead">${escapeHtml(page.intro)}</p>
      ${downloadCta}
    </div>
  </section>
  <section class="block">
    <div class="wrap">${sections}</div>
  </section>
  ${faqBlock}
  <section class="block">
    <div class="wrap">
      <p class="eyebrow">Related</p>
      <div class="fx-related">${related}</div>
      <p class="fx-prose" style="margin-top:1.25rem"><a href="/guides/">All guides</a> · <a href="/apps/">Apps</a> · <a href="/">Homepage</a></p>
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
  <section class="fx-page-hero"><div class="wrap"><h1>Rummy guides library</h1><p class="fx-lead">Professional guides for APK install, bonuses, rules, legality, and app comparisons — ${getAllPages().length} pages for India.</p><a class="fx-btn fx-btn--ghost" href="/" style="margin-top:1rem;max-width:200px">← Homepage</a></div></section>
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
  const cards = apps
    .map((app) => {
      const guideHref = appGuideHref(app.slug);
      return `<a class="fx-hub-link" href="${guideHref}"><strong>${escapeHtml(app.name)}</strong><span>${escapeHtml(app.shortDescription)}</span></a>`;
    })
    .join("");

  const body = `
  <section class="fx-page-hero"><div class="wrap"><h1>Rummy app guides</h1><p class="fx-lead">Independent APK and bonus guides — not official operator sites. Each app has a dedicated page.</p></div></section>
  <section class="block"><div class="wrap"><div class="fx-hub-grid">${cards}</div>
  <div class="fx-cta-band" style="margin-top:1.25rem">
    <p>Compare all apps side-by-side on the homepage.</p>
    <a class="fx-btn fx-btn--primary" href="/#apps">Compare apps</a>
    <a class="fx-btn fx-btn--ghost" href="/best-rummy-apps-india/" style="margin-top:.5rem">Best rummy apps guide</a>
  </div>
  </div></section>`;

  ensure(path.join(OUT, "apps"));
  fs.writeFileSync(
    path.join(OUT, "apps", "index.html"),
    layout({
      pageType: "inner",
      title: "Rummy Apps India | Junglee, Mast179, RVIP & More",
      description: "Independent guides for Junglee Rummy, Mast179, RVIP, 66 Game and HU777 Club — official download links and safety tips.",
      canonicalPath: "/apps/",
      breadcrumbs: [
        { href: "/", label: "Home" },
        { href: "/apps/", label: "Apps" },
      ],
      keywords: "rummy apps India, Junglee Rummy guide, Mast179 APK, RVIP rummy, HU777 Club download",
      published: "2026-01-01",
      modified: BUILD_DATE,
      body,
      jsonLd: [
        breadcrumbLd({ slug: "apps", h1: "Apps", category: "apps", metaDescription: "" }),
        webPageLd({
          slug: "apps",
          h1: "Rummy app guides",
          metaDescription: "Independent guides for Junglee Rummy, Mast179, RVIP, 66 Game and HU777 Club — official download links and safety tips.",
          intro: "Independent APK and bonus guides — not official operator sites.",
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
    name: "Best rummy apps India",
    itemListElement: appList.map((app, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: app.name,
      description: app.shortDescription,
      url: pageUrl(pagePath(app.slug)),
    })),
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
  return `# SEO audit & pending work — ${siteConfig.name}

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
| Auto app guides | ${counts.autoAppPages} | Mast179, RVIP, 66 Game, HU777 stubs |
| 404 | 1 | \`noindex\`, no canonical |

**Site URL:** \`${SITE_URL}\`  
**Deploy env:** \`SITE_URL\` + \`SITE_INDEX=true\`

---

## Implemented in build (code)

- [x] Unique title, description, keywords (where set), canonical, robots
- [x] Open Graph + Twitter + \`article:published_time\` / \`modified_time\`
- [x] \`og:site_name\`, \`og:locale\`, \`og:image:alt\`, author, \`geo.region=IN\`
- [x] JSON-LD: WebSite (+ SearchAction), Organization (+ logo), WebPage, Article, FAQPage, BreadcrumbList, CollectionPage, ItemList
- [x] \`rel="sponsored noopener noreferrer"\` on affiliate download CTAs
- [x] \`robots.txt\`, \`sitemap.xml\` (${counts.totalIndexable} URLs), \`llms.txt\`, \`.well-known/security.txt\`
- [x] Auto-related links (category siblings, fixed broken slugs)
- [x] Legal pages in sitemap + footer
- [x] Logo alt text, 404 noindex without canonical

---

## Pending — you must do manually (**6** items)

| # | Task | Effort |
|---|------|--------|
| 1 | Submit \`${SITE_URL}/sitemap.xml\` in **Google Search Console** & Bing | 15 min |
| 2 | Set \`SITE_URL\` on Vercel to production domain | 5 min |
| 3 | Add **GA4** or Plausible (optional \`site-config.json\` slot) | 30 min |
| 4 | **Rich Results Test** — home, \`/junglee-rummy/\`, \`/faqs/\` | 15 min |
| 5 | Compress \`main.png\` (WebP), Lighthouse mobile SEO 95+ | 1 hr |
| 6 | Add real \`sameAs\` social URLs in \`site-config.json\` (replace placeholders) | 5 min |

---

## Pending — more content (**~10** pages still useful)

| # | Task | Count |
|---|------|------:|
| 7 | Expand auto app stubs (Mast179, RVIP, 66, HU777) in \`seo-pages.json\` | 4 |
| 8 | Add slugs: \`rummy-vs-teen-patti\`, \`rummy-state-laws\`, \`play-rummy-online-free\`, \`junglee-rummy-bonus\` | +4 |
| 9 | Wire \`blog-posts.json\` → build (optional blog hub) | +5–10 |
| 10 | Custom OG images 1200×630 per hub / top apps | 3–5 images |

Add new guides in \`src/data/seo-pages-extra.json\` (merged at build).

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
grep -c "<url>" dist/sitemap.xml
\`\`\`
`;
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
