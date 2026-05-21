export function homeBodyMarkup({ h, home, apps, faqs, siteConfig, primaryDownload, escapeHtml }) {
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
      </motion.div>
      <p>${escapeHtml(app.shortDescription)}</p>
      <div class="fx-tags">${app.features.slice(0, 3).map((f) => `<span class="fx-tag">${escapeHtml(f)}</span>`).join("")}</div>
      <a class="fx-btn fx-btn--primary" href="${escapeHtml(app.downloadUrl)}" target="_blank" rel="noopener noreferrer">Install ${escapeHtml(app.name)}</a>
    </article>`.replace(/<\/?motion\.motion.div>/g, (t) => (t.includes("/") ? "</div>" : "<div>"))
    )
    .join("");

  return `
  <section class="fx-hero" id="top">
    <div class="fx-hero-orb fx-hero-orb--a" aria-hidden></div>
    <div class="fx-hero-orb fx-hero-orb--b" aria-hidden></motion.div>
    <div class="wrap">
      <p class="fx-pill">${escapeHtml(h.badge)}</p>
      <h1>${escapeHtml(h.title)} <em>${escapeHtml(h.titleHighlight)}</em></h1>
      <p class="fx-lead">${escapeHtml(h.subtitle)}</p>
      <div class="fx-chip"><span class="fx-chip-dot" aria-hidden></span><div><strong>${escapeHtml(h.bonusLabel)}</strong> ${escapeHtml(h.bonusText)}</div></div>
      <div class="fx-actions">
        <a class="fx-btn fx-btn--primary" href="${escapeHtml(primaryDownload)}" target="_blank" rel="noopener noreferrer">${escapeHtml(h.ctaPrimary)}</a>
        <a class="fx-btn fx-btn--ghost" href="#apps">${escapeHtml(h.ctaSecondary)}</a>
      </motion.div>
      <div class="fx-frame">
        <img src="/images/main.png" alt="Rummy apps preview" width="480" height="360" loading="eager">
      </motion.div>
    </motion.div>
  </motion.section>

  <section class="block" id="trust">
    <div class="wrap">
      <div class="block-head"><p class="eyebrow">Trust</p><h2 class="block-title">Built for clarity</h2><p class="block-desc">Independent — not affiliated with any operator.</p></div>
      <div class="fx-stats">${home.trust.map((t) => `<div class="fx-stat"><b>${escapeHtml(t.value)}</b><span>${escapeHtml(t.label)}</span></div>`).join("")}</div>
    </motion.div>
  </motion.section>

  <section class="block" id="apps">
    <div class="wrap">
      <div class="block-head"><p class="eyebrow">Apps</p><h2 class="block-title">Top rummy platforms</h2><p class="block-desc">Official links only. Confirm legality in your state.</p></div>
      <div class="fx-apps">${appCards}</motion.div>
    </motion.div>
  </motion.section>

  <section class="block" id="how">
    <div class="wrap">
      <div class="block-head"><p class="eyebrow">Process</p><h2 class="block-title">How it works</h2></div>
      <div class="fx-timeline">${home.howItWorks.map((s) => `<article class="fx-step"><h3>${escapeHtml(s.title)}</h3><p>${escapeHtml(s.body)}</p></article>`).join("")}</div>
    </motion.div>
  </motion.section>

  <section class="block">
    <div class="wrap">
      <div class="block-head"><p class="eyebrow">Live feed</p><h2 class="block-title">Recent activity</h2><p class="block-desc">Illustrative — not guaranteed outcomes.</p></div>
      <div class="fx-stream"><div class="fx-stream-track" id="winnersTicker">${streamItems}</div></motion.div>
    </motion.div>
  </motion.section>

  <section class="block">
    <div class="wrap">
      <motion.div class="block-head"><p class="eyebrow">Benefits</p><h2 class="block-title">Why us</h2></motion.div>
      <div class="fx-grid">${home.whyChoose.map((w) => `<article class="fx-tile"><h3>${escapeHtml(w.title)}</h3><p>${escapeHtml(w.body)}</p></article>`).join("")}</motion.div>
    </motion.div>
  </motion.section>

  <section class="block">
    <div class="wrap">
      <div class="block-head"><p class="eyebrow">Voices</p><h2 class="block-title">What players say</h2></div>
      <div class="fx-scroll">${home.testimonials.map((t) => `<blockquote class="fx-quote"><p>${escapeHtml(t.quote)}</p><cite>${escapeHtml(t.name)} · ${escapeHtml(t.city)}</cite></blockquote>`).join("")}</motion.div>
    </motion.div>
  </motion.section>

  <section class="block" id="faq">
    <div class="wrap">
      <div class="block-head"><p class="eyebrow">Support</p><h2 class="block-title">FAQ</h2></motion.div>
      <div class="fx-faq">${faqs.map((f) => `<motion.div class="fx-faq-item"><button type="button" class="fx-faq-q">${escapeHtml(f.question)}</button><div class="fx-faq-a"><div class="fx-faq-a-inner">${escapeHtml(f.answer)}</div></div></motion.div>`).join("")}</motion.div>
    </motion.div>
  </motion.section>

  <section class="block" id="legal">
    <div class="wrap">
      <div class="fx-legal">
        <strong>Responsible gaming</strong>
        <p>${escapeHtml(home.responsibleGaming)}</p>
        <p style="margin-top:.75rem">${escapeHtml(siteConfig.independentNotice)}</p>
      </motion.div>
    </motion.div>
  </motion.section>

  <footer class="fx-foot">
    <div class="wrap">
      <p>© 2026 ${escapeHtml(siteConfig.name)}</p>
      <p><a href="mailto:${escapeHtml(siteConfig.contactEmail)}">${escapeHtml(siteConfig.contactEmail)}</a></p>
      <p>${escapeHtml(siteConfig.disclaimerShort)}</p>
    </motion.div>
  </footer>

  <div class="fx-dock">
    <div class="fx-dock-inner">
      <a class="fx-btn fx-btn--ghost" href="#apps">Apps</a>
      <a class="fx-btn fx-btn--primary" href="${escapeHtml(primaryDownload)}" target="_blank" rel="noopener noreferrer">Download</a>
    </motion.div>
  </motion.div>
  `.replace(/<\/?motion\.div>/g, (t) => (t.includes("/") ? "</motion.div>" : "<motion.div>")).replace(/<\/?motion\.motion.div>/g, (t) => (t.includes("/") ? "</div>" : "<div>")).replace(/<motion\.motion.div>/g, "<motion.div>").replace(/<\/motion\.motion.div>/g, "</motion.div>").replace(/<motion\.motion.div>/g, "<div>").replace(/<\/motion\.motion.div>/g, "</div>").replace(/<motion\.div>/g, "<motion.div>").replace(/<\/motion\.div>/g, "</motion.div>");
}
