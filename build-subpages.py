# -*- coding: utf-8 -*-
"""Baut verlobungsringe.html und reparaturen.html aus index.html.

Style-Block, Marmor-Hintergrund, Ladescreen, Nav, Footer und das komplette
Script werden aus index.html geerbt, damit die Seiten nicht auseinanderlaufen.
Die Hero-/Ring-Skripte steigen auf den Unterseiten von selbst aus, weil ihre
Elemente dort fehlen.

Reihenfolge: erst build-index.py, dann dieses Skript.
"""
import io, os, re

DIR = os.path.dirname(os.path.abspath(__file__))
src = io.open(os.path.join(DIR, 'index.html'), encoding='utf-8').read()


def grab(pattern, what, flags=re.S):
    m = re.search(pattern, src, flags)
    assert m, 'nicht gefunden: ' + what
    return m.group(0)


font_links = '\n'.join(re.findall(r'^\s*<link [^>]*fonts\.[^>]*>$', src, re.M))
style_block = grab(r'  <style>.*?</style>', 'Style-Block')
loader      = grab(r'  <div class="loader" id="loader".*?</div>\n  </div>', 'Ladescreen')
marble      = grab(r'  <div class="marble-bg" aria-hidden="true">.*?</div>\n', 'Marmor-BG')
footer      = grab(r'  <footer class="site-footer">.*?</footer>', 'Footer')
script      = grab(r'  <script>.*?</script>', 'Script')
skip        = grab(r'  <a class="skip-link".*?</a>', 'Skip-Link')

# Sprungmarken im Footer auf die Startseite umbiegen
footer_sub = footer.replace('<a href="#', '<a href="index.html#')

NAV_ITEMS = [
    ('index.html#about',       'Über uns'),
    ('index.html#collections', 'Kollektionen'),
    ('verlobungsringe.html',   'Verlobungsringe'),
    ('reparaturen.html',       'Reparaturen'),
    ('index.html#services',    'Leistungen'),
    ('index.html#reviews',     'Bewertungen'),
    ('index.html#contact',     'Öffnungszeiten'),
]


def build_nav(active):
    items = []
    for href, label in NAV_ITEMS:
        cls = ' class="is-active" aria-current="page"' if href == active else ''
        items.append('      <li><a href="%s"%s>%s</a></li>' % (href, cls, label))
    items.append('      <li><a href="tel:+496115807830" class="nav__cta">Anrufen</a></li>')
    return """  <nav class="nav" id="mainNav" aria-label="Hauptnavigation">
    <a href="index.html" class="nav__brand" aria-label="Juwelier Damla – Startseite">
      <img src="assets/logo-cut.webp" alt="Juwelier Damla Logo" class="nav__logo-img" width="566" height="593">
    </a>

    <ul class="nav__links" id="navLinks">
%s
    </ul>

    <button class="nav__burger" id="navBurger" aria-label="Menü öffnen" aria-expanded="false" aria-controls="navLinks">
      <span></span><span></span><span></span>
    </button>
  </nav>""" % '\n'.join(items)


# ══════════════════════════════════════════════════════════
#  CSS, das beide Unterseiten teilen
# ══════════════════════════════════════════════════════════
SUB_CSS = """
    /* ═══════════════════════════════════════════
       UNTERSEITEN
    ═══════════════════════════════════════════ */
    .sub-hero { position: relative; z-index: 2; padding: 0 0 clamp(48px, 6vw, 84px); }

    /* Videoband unter der Navbar */
    .sub-band {
      position: relative;
      width: 100%;
      height: clamp(230px, 48vh, 470px);
      margin-top: var(--nav-h);
      overflow: hidden;
      background: #F4F1EB;
      border-bottom: 1px solid var(--border-gold);
    }
    .sub-band video {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    /* haelt die Kanten ruhig und blendet unten in die Seitenfarbe */
    .sub-band__veil {
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: linear-gradient(180deg,
        rgba(255,255,255,0.30) 0%,
        rgba(255,255,255,0)    26%,
        rgba(255,255,255,0)    58%,
        rgba(248,245,239,0.90) 100%);
    }
    .sub-band__cap {
      position: absolute;
      bottom: 14px; left: 0; right: 0;
      z-index: 2;
      text-align: center;
      font-size: 0.5rem;
      font-weight: 600;
      letter-spacing: 0.42em;
      text-transform: uppercase;
      color: var(--gold-dark);
      pointer-events: none;
    }

    .sub-crumb {
      font-size: 0.56rem;
      letter-spacing: 0.28em;
      text-transform: uppercase;
      color: var(--ink-muted);
      padding-top: 26px;
    }
    .sub-crumb a { color: var(--ink-muted); transition: color 0.3s; }
    .sub-crumb a:hover { color: var(--gold); }
    .sub-crumb span { color: var(--gold); }

    .sub-hero__text {
      text-align: center;
      padding-top: clamp(38px, 5vw, 66px);
    }
    .sub-hero__text .gold-bar { margin: 0 auto; }
    .sub-hero__title {
      font-family: var(--font-serif);
      font-size: clamp(2.3rem, 5.6vw, 4.2rem);
      font-weight: 300;
      line-height: 1.1;
      color: var(--ink);
      margin-bottom: 24px;
    }
    .sub-hero__title em { font-style: italic; color: var(--gold-dark); }
    .sub-hero__sub {
      max-width: 570px;
      margin: 28px auto 0;
      font-family: var(--font-serif);
      font-size: clamp(1rem, 1.5vw, 1.16rem);
      font-weight: 300;
      line-height: 1.8;
      color: var(--ink-soft);
    }
    .sub-actions {
      display: flex;
      gap: 14px;
      justify-content: center;
      flex-wrap: wrap;
      margin-top: 36px;
    }

    .sub-head { text-align: center; margin-bottom: clamp(46px, 6vw, 72px); }
    .sub-head .gold-bar { margin: 0 auto; }
    .sub-intro {
      max-width: 560px;
      margin: 26px auto 0;
      font-size: 0.84rem;
      font-weight: 300;
      line-height: 1.9;
      color: var(--ink-soft);
    }

    /* — Editorial-Reihen (Bild + Text) — */
    .ed-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: clamp(32px, 6vw, 78px);
      align-items: center;
      margin-bottom: clamp(56px, 7vw, 96px);
    }
    .ed-row:last-child { margin-bottom: 0; }
    .ed-row--flip .ed-media { order: 2; }
    .ed-media {
      position: relative;
      overflow: hidden;
      background: var(--gold-pale);
      width: 100%;
      max-width: 440px;
      justify-self: end;
    }
    .ed-row--flip .ed-media { justify-self: start; }
    .ed-media img {
      width: 100%;
      height: auto;
      aspect-ratio: 4 / 3;
      object-fit: cover;
      display: block;
      transition: transform 1.4s var(--ease-out);
    }
    .ed-row:hover .ed-media img { transform: scale(1.035); }
    .ed-media::after {
      content: '';
      position: absolute;
      inset: 14px;
      border: 1px solid rgba(255,255,255,0.30);
      pointer-events: none;
    }
    .ed-text { max-width: 440px; justify-self: start; }
    .ed-row--flip .ed-text { justify-self: end; }
    .ed-num {
      display: block;
      font-size: 0.56rem;
      font-weight: 600;
      letter-spacing: 0.4em;
      color: var(--gold);
      margin-bottom: 16px;
    }
    .ed-title {
      font-family: var(--font-serif);
      font-size: clamp(1.5rem, 2.8vw, 2.2rem);
      font-weight: 400;
      font-style: italic;
      line-height: 1.2;
      margin-bottom: 18px;
    }
    .ed-text .gold-bar { margin-bottom: 22px; }
    .ed-text p {
      font-size: 0.84rem;
      font-weight: 300;
      line-height: 1.95;
      color: var(--ink-soft);
    }

    /* — Ablauf-Schritte — */
    .flow-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: clamp(30px, 5vw, 74px);
      align-items: start;
    }
    .flow-step { position: relative; }
    .flow-step + .flow-step::before {
      content: '';
      position: absolute;
      top: 20px;
      left: calc(-1 * clamp(30px, 5vw, 74px) / 2 - 14px);
      width: 28px; height: 1px;
      background: var(--border-gold);
    }
    .flow-step__num {
      display: block;
      font-family: var(--font-serif);
      font-size: 2.3rem;
      font-weight: 300;
      font-style: italic;
      line-height: 1;
      color: var(--gold);
      margin-bottom: 18px;
    }
    .flow-step__title {
      font-family: var(--font-serif);
      font-size: 1.2rem;
      font-weight: 400;
      font-style: italic;
      margin-bottom: 12px;
    }
    .flow-step p {
      font-size: 0.78rem;
      font-weight: 300;
      line-height: 1.85;
      color: var(--ink-soft);
    }

    .sub-note {
      margin: clamp(44px, 6vw, 72px) auto 0;
      max-width: 620px;
      text-align: center;
      font-size: 0.76rem;
      font-weight: 300;
      line-height: 1.9;
      color: var(--ink-muted);
    }

    .sub-alt {
      position: relative;
      background: rgba(244, 241, 235, 0.5);
    }
    .sub-alt::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent 0%, var(--border-gold) 50%, transparent 100%);
    }

    /* — Ring-Modelle (freigestellte Stücke) — */
    /* — Freigestellte Ringe: gepinnter Horizontal-Scroll — */
    .ring-scroll { position: relative; height: 340vh; padding: 0; }
    .ring-scroll__pin {
      position: sticky; top: 0;
      height: 100vh; overflow: hidden;
      display: flex; flex-direction: column;
    }
    .ring-scroll__head {
      text-align: center; z-index: 3;
      padding: clamp(60px, 10vh, 116px) var(--pad-x) 0;
    }
    .ring-scroll__head .eyebrow { display: block; }
    .ring-scroll__head .section-title { margin-top: 10px; }
    .ring-scroll__head .gold-bar { margin: 16px auto 0; }
    .ring-scroll__viewport {
      flex: 1 1 auto;
      display: flex; align-items: stretch;
      overflow: hidden;
    }
    .ring-scroll__track {
      display: flex; align-items: center;
      will-change: transform;
    }
    .ring-panel {
      flex: 0 0 100vw;
      display: grid; place-items: center;
      padding: 0 var(--pad-x);
    }
    .ring-panel__inner {
      position: relative;
      display: grid; justify-items: center; text-align: center;
      width: min(720px, 86vw);
    }
    .ring-panel__num {
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -64%);
      font-family: var(--font-serif); font-style: italic;
      font-size: clamp(10rem, 30vh, 22rem); line-height: 1;
      color: var(--gold-pale); opacity: 0.85; z-index: 0;
      pointer-events: none; user-select: none;
    }
    .ring-panel__img {
      position: relative; z-index: 1; display: block;
      width: auto; max-width: min(540px, 76vw); max-height: 44vh;
      object-fit: contain;
      filter: drop-shadow(0 30px 48px rgba(150, 116, 42, 0.24));
    }
    .ring-panel__body { position: relative; z-index: 2; margin-top: clamp(16px, 3vh, 36px); }
    .ring-panel__name {
      font-family: var(--font-serif); font-style: italic; font-weight: 400;
      font-size: clamp(1.5rem, 3vw, 2.35rem); color: var(--ink);
    }
    .ring-panel__body .gold-bar { margin: 13px auto 15px; }
    .ring-panel__desc {
      max-width: 44ch; margin: 0 auto;
      font-size: 0.9rem; font-weight: 300; line-height: 1.85; color: var(--ink-soft);
    }
    .ring-scroll__nav {
      display: flex; align-items: center; justify-content: center; gap: 12px;
      padding: 0 0 clamp(30px, 6vh, 56px); z-index: 3;
    }
    .ring-scroll__dot {
      width: 8px; height: 8px; border-radius: 50%;
      border: 1px solid var(--gold); background: transparent;
      transition: background 0.4s var(--ease-out), transform 0.4s var(--ease-out);
    }
    .ring-scroll__dot.is-active { background: var(--gold); transform: scale(1.4); }

    @media (prefers-reduced-motion: reduce) {
      .ring-scroll { height: auto; }
      .ring-scroll__pin { position: static; height: auto; overflow: visible; padding-bottom: clamp(40px, 6vh, 60px); }
      .ring-scroll__viewport { overflow-x: auto; scroll-snap-type: x mandatory; }
      .ring-scroll__track { transform: none !important; }
      .ring-panel { flex-basis: 88vw; scroll-snap-align: center; }
      .ring-panel__num { font-size: 9rem; }
      .ring-panel__img { max-height: 50vh; }
    }

    /* — Portrait-Variante der Editorial-Reihen — */
    .ed-media--portrait { max-width: 400px; }
    .ed-media--portrait img { aspect-ratio: 3 / 4; }

    @media (max-width: 900px) {
      .ed-row { grid-template-columns: 1fr; gap: 28px; }
      .ed-row--flip .ed-media { order: 0; justify-self: start; }
      .ed-row--flip .ed-text  { justify-self: start; }
      .ed-media { max-width: 100%; justify-self: start; }
      .ed-media--portrait { max-width: 100%; }
      .ed-text  { max-width: none; }
      .ring-scroll { height: auto; }
      .ring-scroll__pin { position: static; height: auto; overflow: visible; padding-bottom: 34px; }
      .ring-scroll__head { padding-top: 0; }
      .ring-scroll__viewport { overflow-x: auto; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; }
      .ring-scroll__track { transform: none !important; }
      .ring-panel { flex-basis: 86vw; scroll-snap-align: center; padding: 22px 14px; }
      .ring-panel__num { font-size: 8.5rem; }
      .ring-panel__img { max-height: 46vh; max-width: 72vw; }
      .flow-grid { grid-template-columns: 1fr; gap: 36px; }
      .flow-step + .flow-step::before { display: none; }
      .sub-actions a { width: 100%; text-align: center; }
      .sub-band { height: clamp(190px, 32vh, 260px); }
    }
"""


def band(video, poster_alt, caption):
    return """    <div class="sub-band">
      <video autoplay muted loop playsinline preload="metadata"
             aria-label="%s">
        <source src="assets/video/%s" type="video/mp4">
      </video>
      <div class="sub-band__veil" aria-hidden="true"></div>
      <div class="sub-band__cap">%s</div>
    </div>""" % (poster_alt, video, caption)


def crumb(label):
    return """    <div class="wrap">
      <div class="sub-crumb">
        <a href="index.html">Startseite</a> — <span>%s</span>
      </div>
    </div>""" % label


VISIT = """  <section id="visit" aria-labelledby="visitTitle">
    <span class="eyebrow reveal">%s</span>
    <h2 class="visit-title reveal d1" id="visitTitle">%s</h2>
    <p class="visit-sub reveal d2">%s</p>
    <div class="visit-actions reveal d3">
      <a href="tel:+496115807830" class="btn-gold-inv">+49 611 5807830</a>
      <a href="https://maps.google.com/?q=Wellritzstraße+3,+65183+Wiesbaden"
         target="_blank" rel="noopener noreferrer"
         class="btn-line-light">Standort ansehen</a>
    </div>
  </section>"""


# ══════════════════════════════════════════════════════════
#  VERLOBUNGSRINGE
# ══════════════════════════════════════════════════════════
VR_POINTS = [
    ("Der Stein",
     """<polygon points="24,8 36,20 24,40 12,20"/>
              <polyline points="12,20 24,8 36,20"/>
              <line x1="12" y1="20" x2="36" y2="20"/>""",
     "Ob Brillant, Oval oder Smaragdschliff: Größe, Schliff und Farbe verändern die "
     "Wirkung eines Rings völlig. Wir zeigen Ihnen die Unterschiede nebeneinander."),
    ("Die Fassung",
     """<circle cx="24" cy="28" r="11"/>
              <path d="M 17,20 L 20,13 L 28,13 L 31,20"/>
              <line x1="20" y1="13" x2="28" y2="13"/>""",
     "Solitär, Trilogie oder Halo – die Fassung entscheidet, wie viel Licht der Stein "
     "bekommt und wie kräftig der Ring an der Hand wirkt."),
    ("Das Gold",
     """<circle cx="17" cy="26" r="9"/>
              <circle cx="31" cy="26" r="9"/>""",
     "Gelb-, Weiß- oder Rotgold in 585 oder 750. Der Ton sollte zu Ihrem übrigen "
     "Schmuck passen – und zu dem, was Sie täglich tragen."),
    ("Die Gravur",
     """<path d="M 31,7 L 41,17 L 21,37 L 11,39 L 13,29 Z"/>
              <line x1="28" y1="10" x2="38" y2="20"/>
              <line x1="7" y1="43" x2="35" y2="43"/>""",
     "Ein Datum, zwei Namen, ein kurzes Wort im Ringinneren. Auch später noch, wenn "
     "der Ring längst getragen wird."),
]
vr_cards = '\n\n'.join("""        <article class="service-card reveal%s">
          <div class="service-icon" aria-hidden="true">
            <svg viewBox="0 0 48 48">
              %s
            </svg>
          </div>
          <h3 class="service-title">%s</h3>
          <p class="service-text">%s</p>
        </article>""" % ('' if i == 0 else ' d%d' % min(i, 3), icon, name, txt)
    for i, (name, icon, txt) in enumerate(VR_POINTS))

# — Freigestellte Ring-Modelle (echte Transparenz via rembg, ohne Rahmen) —
VR_MODELLE = [
    ("vr-modell-1-cut.webp", 587, 397,
     "Verlobungsring mit Tropfenschliff und seitlichen Diamanten, Gelbgold, freigestellt",
     "Der Tropfen",
     "Ein Diamant im Tropfenschliff, flankiert von zwei feinen Beisteinen. Klassisch "
     "in der Linie, unverwechselbar in der Wirkung."),
    ("vr-modell-2-cut.webp", 576, 482,
     "Verlobungsring mit Smaragdschliff als Solitär in Gelbgold, freigestellt",
     "Der Smaragdschliff",
     "Ruhige, klare Facetten auf einer schlichten Schiene. Der Solitär für alle, "
     "die es reduziert und zeitlos mögen."),
    ("vr-modell-3-cut.webp", 618, 571,
     "Verlobungsring mit Ovalschliff als Solitär in Gelbgold, freigestellt",
     "Der Ovale",
     "Der ovale Solitär streckt den Finger und fängt das Licht aus jedem Winkel – "
     "ein wenig Glanz mehr als beim runden Brillanten."),
]
RING_NUM = ['I', 'II', 'III']
vr_panels = '\n\n'.join("""          <article class="ring-panel">
            <div class="ring-panel__inner">
              <span class="ring-panel__num" aria-hidden="true">%s</span>
              <img class="ring-panel__img" src="assets/%s" alt="%s" loading="lazy" width="%d" height="%d">
              <div class="ring-panel__body">
                <h3 class="ring-panel__name">%s</h3>
                <div class="gold-bar" role="presentation"></div>
                <p class="ring-panel__desc">%s</p>
              </div>
            </div>
          </article>""" % (RING_NUM[i], img, alt, w, h, cut, desc)
    for i, (img, w, h, alt, cut, desc) in enumerate(VR_MODELLE))

# — Editorial-Reihen „an der Hand" (flip = Bild rechts) —
VR_WEAR = [
    ("vr-getragen-1.webp", "Verlobungsring mit Halo-Fassung an der Hand einer Frau",
     "01", "So sieht er morgen aus",
     "Ein Ring lebt am Finger, nicht in der Vitrine. Erst an der Hand zeigt sich, "
     "ob Fassung, Höhe und Goldton wirklich zu Ihnen passen.", True),
    ("vr-getragen-2.webp", "Ovaler Verlobungsring an einer Hand, die auf hellem Stoff ruht",
     "02", "Aus jedem Winkel",
     "Oval- und Tropfenschliff fangen das Licht anders als ein runder Brillant. "
     "Bei uns drehen Sie den Ring in Ruhe, bis er sitzt.", False),
    ("vr-getragen-3.webp", "Verlobungsring mit Radiantschliff und seitlichen Steinen an der Hand",
     "03", "Für jeden Tag gemacht",
     "Der schönste Ring ist der, den Sie nicht mehr abnehmen möchten. Wir achten "
     "mit Ihnen darauf, dass er auch im Alltag angenehm zu tragen bleibt.", True),
]
vr_wear = '\n\n'.join("""        <div class="ed-row%s reveal">
          <figure class="ed-media ed-media--portrait">
            <img src="assets/%s" alt="%s" loading="lazy">
          </figure>
          <div class="ed-text">
            <span class="ed-num">%s</span>
            <h3 class="ed-title">%s</h3>
            <div class="gold-bar" role="presentation"></div>
            <p>%s</p>
          </div>
        </div>""" % (' ed-row--flip' if flip else '', img, alt, num, title, txt)
    for img, alt, num, title, txt, flip in VR_WEAR)

vr_dots = '\n'.join('        <span class="ring-scroll__dot%s"></span>'
                    % (' is-active' if i == 0 else '') for i in range(len(VR_MODELLE)))

VR_MODELLE_SECTION = """  <section id="modelle" class="ring-scroll" aria-labelledby="modelleTitle">
    <div class="ring-scroll__pin">
      <div class="ring-scroll__head">
        <span class="eyebrow">Unsere Verlobungsringe</span>
        <h2 class="section-title" id="modelleTitle">Drei Schliffe, ein Versprechen</h2>
        <div class="gold-bar" role="presentation"></div>
      </div>

      <div class="ring-scroll__viewport">
        <div class="ring-scroll__track">

%s

        </div>
      </div>

      <div class="ring-scroll__nav" aria-hidden="true">
%s
      </div>
    </div>
    <script>
    (function () {
      var root = document.querySelector('.ring-scroll');
      if (!root) return;
      var pin   = root.querySelector('.ring-scroll__pin');
      var track = root.querySelector('.ring-scroll__track');
      var view  = root.querySelector('.ring-scroll__viewport');
      var panels = root.querySelectorAll('.ring-panel');
      var dots  = root.querySelectorAll('.ring-scroll__dot');
      if (!pin || !track || !view || !panels.length) return;

      var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
      var small  = window.matchMedia('(max-width: 900px)');
      var pinned = false, raf = 0, maxShift = 0;

      function setActive(i) {
        for (var d = 0; d < dots.length; d++) {
          dots[d].classList.toggle('is-active', d === i);
        }
      }
      function measure() {
        maxShift = Math.max(0, track.scrollWidth - pin.clientWidth);
      }
      function pinnedUpdate() {
        var total = root.offsetHeight - window.innerHeight;
        if (total <= 0) return;
        var p = -root.getBoundingClientRect().top / total;
        p = Math.min(1, Math.max(0, p));
        track.style.transform = 'translate3d(' + (-p * maxShift) + 'px,0,0)';
        setActive(Math.round(p * (panels.length - 1)));
      }
      function nativeUpdate() {
        var c = view.scrollLeft + view.clientWidth / 2;
        var best = 0, bestD = Infinity;
        for (var i = 0; i < panels.length; i++) {
          var pc = panels[i].offsetLeft + panels[i].offsetWidth / 2;
          var dist = Math.abs(pc - c);
          if (dist < bestD) { bestD = dist; best = i; }
        }
        setActive(best);
      }
      function decide() {
        if (small.matches || reduce.matches) {
          pinned = false;
          track.style.transform = '';
          nativeUpdate();
        } else {
          pinned = true;
          track.style.transform = '';
          measure();
          pinnedUpdate();
        }
      }

      window.addEventListener('scroll', function () {
        if (!pinned || raf) return;
        raf = requestAnimationFrame(function () { pinnedUpdate(); raf = 0; });
      }, { passive: true });
      view.addEventListener('scroll', function () {
        if (pinned || raf) return;
        raf = requestAnimationFrame(function () { nativeUpdate(); raf = 0; });
      }, { passive: true });
      window.addEventListener('resize', function () {
        measure();
        if (pinned) pinnedUpdate(); else nativeUpdate();
      }, { passive: true });
      window.addEventListener('load', function () {
        measure();
        if (pinned) pinnedUpdate();
      });
      if (small.addEventListener) {
        small.addEventListener('change', decide);
        reduce.addEventListener('change', decide);
      } else if (small.addListener) {
        small.addListener(decide);
        reduce.addListener(decide);
      }

      decide();
    })();
    </script>
  </section>""" % (vr_panels, vr_dots)

VR_WEAR_SECTION = """  <section id="getragen" class="sub-alt" aria-labelledby="getragenTitle">
    <div class="wrap">
      <div class="sub-head">
        <span class="eyebrow reveal">An der Hand</span>
        <h2 class="section-title reveal d1" id="getragenTitle">Erst getragen<br>zeigt sich der Ring</h2>
        <div class="gold-bar reveal d2" role="presentation"></div>
      </div>

%s

    </div>
  </section>""" % vr_wear

VR_BODY = """  <section class="sub-hero">

%s

%s

    <div class="wrap sub-hero__text">
      <span class="eyebrow reveal">Verlobungsringe</span>
      <h1 class="sub-hero__title reveal d1">Ein Ring<br><em>für das Ja</em></h1>
      <div class="gold-bar reveal d2" role="presentation"></div>
      <p class="sub-hero__sub reveal d3">
        Der wichtigste Ring Ihres Lebens sollte nicht zwischen Tür und Angel entstehen.
        In der Wellritzstraße nehmen wir uns die Zeit, die dieser Moment verdient.
      </p>
      <div class="sub-actions reveal d3">
        <a href="tel:+496115807830" class="btn-solid">Termin vereinbaren</a>
        <a href="#modelle" class="btn-ghost">Unsere Ringe ansehen</a>
      </div>
    </div>
  </section>


%s


%s


  <section id="worauf" class="sub-alt" aria-labelledby="wraufTitle">
    <div class="wrap">
      <div class="sub-head">
        <span class="eyebrow reveal">Worauf es ankommt</span>
        <h2 class="section-title reveal d1" id="wraufTitle">Vier Fragen,<br>die den Ring bestimmen</h2>
        <div class="gold-bar reveal d2" role="presentation"></div>
        <p class="sub-intro reveal d3">
          Keine davon müssen Sie vorher beantworten – wir gehen sie gemeinsam durch,
          wenn Sie bei uns sind.
        </p>
      </div>

      <div class="services-grid">

%s

      </div>

      <p class="sub-note reveal">
        Alle Fassungen sind in 585er und 750er Gelb-, Weiß- und Rotgold möglich –
        mit dem Stein Ihrer Wahl. Sprechen Sie uns an, wir stellen Ihren Ring zusammen.
      </p>
    </div>
  </section>


%s""" % (band('vr-band.mp4', 'Verlobungsring auf einem cremefarbenen Kissen', 'Juwelier Damla · Wiesbaden'),
         crumb('Verlobungsringe'), VR_MODELLE_SECTION, VR_WEAR_SECTION, vr_cards,
         VISIT % ('Beratung',
                  'Kommen Sie<br><em>einfach vorbei</em>',
                  'Ohne Termin, ohne Verpflichtung. Wenn Sie es diskret möchten, rufen Sie kurz an – '
                  'dann halten wir Ihnen eine ruhige Ecke frei.'))


# ══════════════════════════════════════════════════════════
#  REPARATUREN
# ══════════════════════════════════════════════════════════
RP_SERVICES = [
    ("Rhodinieren",
     """<circle cx="20" cy="28" r="12"/>
              <circle cx="20" cy="28" r="7.5"/>
              <path d="M 36,6 L 38.6,11.4 L 44,14 L 38.6,16.6 L 36,22 L 33.4,16.6 L 28,14 L 33.4,11.4 Z"/>""",
     "Weißgold und Silber verlieren mit den Jahren ihren hellen Ton und wirken gelblich "
     "oder stumpf. Eine neue Rhodinierung gibt der Oberfläche ihr kühles, klares Weiß zurück."),
    ("Vergolden",
     """<path d="M 24,5 C 20,11.5 17.5,14.5 17.5,17 a 6.5,6.5 0 0 0 13,0 C 30.5,14.5 28,11.5 24,5 Z"/>
              <line x1="7" y1="29" x2="41" y2="29"/>
              <path d="M 10,29 Q 11.5,41 24,41 Q 36.5,41 38,29"/>""",
     "Eine Goldauflage nützt sich mit der Zeit ab – an Kettengliedern, Ringschienen und "
     "Verschlüssen zuerst. Wir kümmern uns um eine neue Vergoldung, im Farbton, der zu "
     "Ihrem Stück passt."),
    ("Lötarbeiten",
     """<rect x="7" y="21" width="19" height="12" rx="6"/>
              <rect x="22" y="21" width="19" height="12" rx="6"/>
              <line x1="24" y1="7" x2="24" y2="13"/>
              <line x1="16.5" y1="10" x2="19.5" y2="14.5"/>
              <line x1="31.5" y1="10" x2="28.5" y2="14.5"/>""",
     "Eine gerissene Kette, eine gebrochene Öse, ein Verschluss, der nicht mehr hält: "
     "Solche Schäden lassen sich meist sauber löten – oft sieht man später nichts mehr davon."),
    ("Ringweitenänderungen",
     """<circle cx="24" cy="24" r="10"/>
              <circle cx="24" cy="24" r="5.5"/>
              <line x1="4" y1="24" x2="11" y2="24"/>
              <polyline points="7,21 4,24 7,27"/>
              <line x1="37" y1="24" x2="44" y2="24"/>
              <polyline points="41,21 44,24 41,27"/>""",
     "Finger verändern sich – im Sommer, über die Jahre, manchmal schon kurz nach dem "
     "Kauf. Wir messen Ihre Weite und passen die Schiene an, enger oder weiter."),
    ("Gravuren",
     """<path d="M 31,7 L 41,17 L 21,37 L 11,39 L 13,29 Z"/>
              <line x1="28" y1="10" x2="38" y2="20"/>
              <line x1="13" y1="29" x2="21" y2="37"/>
              <line x1="7" y1="43" x2="35" y2="43"/>""",
     "Ein Name, ein Datum, ein kurzes Wort: innen im Ring, auf der Rückseite eines "
     "Anhängers oder auf dem Gehäuseboden einer Uhr. Auch nachträglich, an einem Stück, "
     "das Sie längst tragen."),
    ("Schmuckaufbereitung",
     """<path d="M 19,8 L 21.6,18.4 L 32,21 L 21.6,23.6 L 19,34 L 16.4,23.6 L 6,21 L 16.4,18.4 Z"/>
              <path d="M 35,27 L 36.6,33.4 L 43,35 L 36.6,36.6 L 35,43 L 33.4,36.6 L 27,35 L 33.4,33.4 Z"/>""",
     "Reinigen, polieren, Fassungen prüfen, lockere Steine nachfassen. Nach einer "
     "Aufbereitung wirkt ein Schmuckstück oft wieder so, wie Sie es in Erinnerung haben."),
]
DELAYS = ['', ' d1', ' d2', '', ' d1', ' d2']
rp_cards = '\n\n'.join("""        <article class="service-card reveal%s">
          <div class="service-icon" aria-hidden="true">
            <svg viewBox="0 0 48 48">
              %s
            </svg>
          </div>
          <h3 class="service-title">%s</h3>
          <p class="service-text">%s</p>
        </article>""" % (DELAYS[i], icon, name, txt)
    for i, (name, icon, txt) in enumerate(RP_SERVICES))

RP_FLOW = [
    ("I", "Vorbeibringen",
     "Bringen Sie Ihr Schmuckstück in die Wellritzstraße 3. Wir schauen es uns gemeinsam "
     "an und besprechen, was sich machen lässt."),
    ("II", "Kostenvoranschlag",
     "Sie erfahren vorab, was die Arbeit kostet und wie lange sie dauert. Erst wenn Sie "
     "einverstanden sind, geht Ihr Stück in Arbeit."),
    ("III", "Abholen",
     "Wir melden uns, sobald alles fertig ist. Sie holen Ihr Stück bei uns ab und sehen "
     "es sich in Ruhe vor Ort an."),
]
rp_flow = '\n\n'.join("""        <div class="flow-step reveal%s">
          <span class="flow-step__num">%s</span>
          <h3 class="flow-step__title">%s</h3>
          <p>%s</p>
        </div>""" % ('' if i == 0 else ' d%d' % i, num, title, txt)
    for i, (num, title, txt) in enumerate(RP_FLOW))

RP_BODY = """  <section class="sub-hero">

%s

%s

    <div class="wrap sub-hero__text">
      <span class="eyebrow reveal">Reparaturen &amp; Service</span>
      <h1 class="sub-hero__title reveal d1">Wieder so,<br><em>wie Sie es kennen</em></h1>
      <div class="gold-bar reveal d2" role="presentation"></div>
      <p class="sub-hero__sub reveal d3">
        Eine Kette, die gerissen ist. Ein Ring, der nicht mehr passt. Weißgold, das seinen
        hellen Ton verloren hat. Bringen Sie Ihr Stück vorbei – wir sehen es uns an und
        sagen Ihnen offen, was sich machen lässt.
      </p>
      <div class="sub-actions reveal d3">
        <a href="tel:+496115807830" class="btn-solid">Anrufen</a>
        <a href="#ablauf" class="btn-ghost">So läuft es ab</a>
      </div>
    </div>
  </section>


  <section id="leistungen" aria-labelledby="leistungenTitle">
    <div class="wrap">
      <div class="sub-head">
        <span class="eyebrow reveal">Leistungen</span>
        <h2 class="section-title reveal d1" id="leistungenTitle">Was wir für<br>Ihren Schmuck tun</h2>
        <div class="gold-bar reveal d2" role="presentation"></div>
        <p class="sub-intro reveal d3">
          Vom kurzen Handgriff bis zur gründlichen Aufbereitung – sechs Arbeiten, nach
          denen bei uns am häufigsten gefragt wird.
        </p>
      </div>

      <div class="services-grid">

%s

      </div>
    </div>
  </section>


  <section id="ablauf" class="sub-alt" aria-labelledby="ablaufTitle">
    <div class="wrap">
      <div class="sub-head">
        <span class="eyebrow reveal">Ablauf</span>
        <h2 class="section-title reveal d1" id="ablaufTitle">In drei Schritten</h2>
        <div class="gold-bar reveal d2" role="presentation"></div>
      </div>

      <div class="flow-grid">

%s

      </div>

      <p class="sub-note reveal">
        Sie sind nicht sicher, ob sich eine Reparatur lohnt? Kommen Sie damit vorbei.
        Wir sagen Ihnen ehrlich, was wir davon halten – auch dann, wenn die Antwort
        einmal Nein lautet.
      </p>
    </div>
  </section>


%s""" % (band('rp-band.mp4', 'Goldring auf einem weißen Tuch auf der Werkbank', 'Juwelier Damla · Wiesbaden'),
         crumb('Reparaturen'), rp_cards, rp_flow,
         VISIT % ('Reparaturannahme',
                  'Bringen Sie es<br><em>einfach vorbei</em>',
                  'Wellritzstraße 3, mitten in Wiesbaden. Ohne Termin – oder rufen Sie kurz an, '
                  'wenn Sie vorher wissen möchten, ob es sich lohnt.'))


# ══════════════════════════════════════════════════════════
#  Template
# ══════════════════════════════════════════════════════════
TEMPLATE = """<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>%(title)s</title>
  <meta name="description" content="%(desc)s">
  <link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
  <link rel="canonical" href="https://adamanm780-dotcom.github.io/juwelier-damla/%(slug)s">
%(fonts)s

  <script type="application/ld+json">
  %(ld)s
  </script>

%(style)s
  <style>%(subcss)s  </style>
</head>

<body>

%(loader)s

%(skip)s

%(marble)s

%(nav)s

  <main id="main">

%(body)s

  </main>

%(footer)s

%(script)s

</body>
</html>
"""

import json

PAGES = [
    dict(slug='verlobungsringe.html',
         title='Verlobungsringe – Juwelier Damla Wiesbaden',
         desc='Verlobungsringe bei Juwelier Damla in Wiesbaden: Solitäre, Trilogien und '
              'Halo-Fassungen in Gelb-, Weiß- und Rotgold. Persönliche Beratung in der '
              'Wellritzstraße 3.',
         name='Verlobungsringe', active='verlobungsringe.html', body=VR_BODY,
         services=None),
    dict(slug='reparaturen.html',
         title='Reparaturen & Schmuckservice – Juwelier Damla Wiesbaden',
         desc='Schmuckreparaturen bei Juwelier Damla in Wiesbaden: Rhodinieren, Vergolden, '
              'Lötarbeiten, Ringweitenänderungen, Gravuren und Schmuckaufbereitung. '
              'Wellritzstraße 3, ohne Termin.',
         name='Reparaturen & Schmuckservice', active='reparaturen.html', body=RP_BODY,
         services=[s[0] for s in RP_SERVICES]),
]

BASE = 'https://adamanm780-dotcom.github.io/juwelier-damla'

for page in PAGES:
    store = {
        "@type": "JewelryStore",
        "name": "Juwelier Damla",
        "telephone": "+49 611 5807830",
        "address": {"@type": "PostalAddress", "streetAddress": "Wellritzstraße 3",
                    "postalCode": "65183", "addressLocality": "Wiesbaden",
                    "addressCountry": "DE"},
    }
    if page['services']:
        store["hasOfferCatalog"] = {
            "@type": "OfferCatalog", "name": "Reparaturen & Schmuckservice",
            "itemListElement": [{"@type": "Offer",
                                 "itemOffered": {"@type": "Service", "name": s}}
                                for s in page['services']]}
    ld = {
        "@context": "https://schema.org", "@type": "WebPage", "name": page['name'],
        "description": page['desc'],
        "isPartOf": {"@type": "WebSite", "name": "Juwelier Damla", "url": BASE + '/'},
        "about": store,
        "breadcrumb": {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Startseite", "item": BASE + '/'},
            {"@type": "ListItem", "position": 2, "name": page['name'],
             "item": BASE + '/' + page['slug']}]},
    }

    assert footer_sub.count(page['slug']) == 1, 'Footer-Link doppelt/fehlt: ' + page['slug']

    html = TEMPLATE % dict(
        title=page['title'], desc=page['desc'], slug=page['slug'], fonts=font_links,
        ld=json.dumps(ld, ensure_ascii=False, indent=2).replace('\n', '\n  '),
        style=style_block, subcss=SUB_CSS, loader=loader, skip=skip, marble=marble,
        nav=build_nav(page['active']), body=page['body'], footer=footer_sub, script=script)

    out = os.path.join(DIR, page['slug'])
    io.open(out, 'w', encoding='utf-8').write(html)
    print('geschrieben: %-24s %.0f KB' % (page['slug'], len(html.encode('utf-8')) / 1024.0))
