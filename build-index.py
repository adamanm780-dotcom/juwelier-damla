# -*- coding: utf-8 -*-
"""Baut index.html um:
   - Ladescreen mit freigestelltem Logo
   - Nav mit Unterseiten-Links, freigestelltes Logo (ohne clip-path)
   - Hero = NUR das Ladenfront-Video, automatischer Ping-Pong-Loop
   - darunter: Textblock, darunter: Ring-Scroll-Animation

Arbeitet auf index.src.html (Original) und schreibt index.html,
damit ein erneuter Lauf nicht auf sich selbst aufsetzt.
"""
import io, os, re, glob

DIR = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(DIR, 'index.src.html')
OUT = os.path.join(DIR, 'index.html')

# Beim ersten Lauf das Original sichern.
if not os.path.exists(SRC):
    import shutil
    shutil.copy(OUT, SRC)
    print('Original gesichert -> index.src.html')

src = io.open(SRC, encoding='utf-8').read()

N_HERO = len(glob.glob(os.path.join(DIR, 'assets', 'hero', 'f-*.webp')))
N_RING = len(glob.glob(os.path.join(DIR, 'assets', 'ring', 'frame-*.webp')))
assert N_HERO > 0 and N_RING > 0, 'Frames fehlen'


def sub1(pattern, repl, text, flags=0, what=''):
    """Ersetzt genau ein Vorkommen durch LITERALEN Text, sonst Abbruch.

    Die Ersetzung laeuft ueber ein Lambda, damit Backslashes im Ersatztext
    nicht als Escape gelesen werden. Rueckverweise (\\1, \\g<1>) funktionieren
    dadurch NICHT — sie landen woertlich im Output. Deshalb hier abfangen:
    """
    assert '\\g<' not in repl and not re.search(r'\\[1-9]', repl), \
        'Rueckverweis im Ersatztext, wird nicht expandiert: ' + (what or pattern[:40])
    new, n = re.subn(pattern, lambda m: repl, text, count=1, flags=flags)
    assert n == 1, 'nicht gefunden/mehrdeutig: ' + (what or pattern[:60])
    return new


# ══════════════════════════════════════════════════════════
# 1) CSS
# ══════════════════════════════════════════════════════════
CSS = """
    /* ═══════════════════════════════════════════
       LADESCREEN
    ═══════════════════════════════════════════ */
    body.is-loading { overflow: hidden; }

    .loader {
      position: fixed;
      inset: 0;
      z-index: 900;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: var(--marble-warm);
      transition: opacity 0.75s ease, visibility 0.75s ease;
    }
    .loader::after {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse 60% 50% at 50% 45%, rgba(201,160,85,0.10) 0%, transparent 70%);
      pointer-events: none;
    }
    .loader.is-done { opacity: 0; visibility: hidden; }

    .loader__logo {
      width: clamp(118px, 17vw, 168px);
      height: auto;
      display: block;
      animation: loaderBreath 2.6s ease-in-out infinite;
    }
    @keyframes loaderBreath {
      0%, 100% { opacity: 0.68; transform: scale(0.982); }
      50%      { opacity: 1;    transform: scale(1); }
    }

    .loader__word {
      margin-top: 22px;
      font-size: 0.58rem;
      font-weight: 500;
      letter-spacing: 0.42em;
      text-transform: uppercase;
      color: var(--gold-dark);
    }
    .loader__bar {
      margin-top: 26px;
      width: min(190px, 44vw);
      height: 1px;
      background: var(--border-gold);
      overflow: hidden;
    }
    .loader__bar span {
      display: block;
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, var(--gold-dark), var(--gold-light));
      transition: width 0.4s ease;
    }
    @media (prefers-reduced-motion: reduce) {
      .loader__logo { animation: none; opacity: 1; }
    }

    /* ═══════════════════════════════════════════
       HERO — nur das Video, automatischer Loop
    ═══════════════════════════════════════════ */
    /* padding: 0 hebt die Basisregel `section { padding: var(--pad-section) 0 }`
       auf — sonst schiebt sie den sticky-Block unter der Navbar nach unten.
       Volle Viewport-Hoehe (kein Scroll-Runway mehr): das Video spielt jetzt
       von selbst als Ping-Pong-Loop, unabhaengig vom Scrollen. */
    #hero { height: 100svh; position: relative; padding: 0; }

    .hero__sticky {
      position: sticky;
      top: 0;
      height: 100svh;
      overflow: hidden;
      display: block;
      padding: 0;
      background: #F4F1EB;
    }

    /* Das Video ist 2196x940 (2.34:1). Auf breiten Schirmen bekommt das Canvas
       genau dieses Seitenverhaeltnis und sitzt mittig — so bleibt die komplette
       Ladenfront samt Schriftzug im Bild, oben und unten laeuft es in die
       Seitenfarbe aus. Schmale Schirme fuellen stattdessen die ganze Flaeche,
       weil ein duennes Band dort verloren wirkt. */
    #heroCanvas {
      position: absolute;
      top: 50%;
      left: 0;
      transform: translateY(-50%);
      width: 100%;
      height: auto;
      aspect-ratio: 2196 / 940;
      display: block;
    }
    @media (max-width: 900px) {
      #heroCanvas {
        top: 0;
        transform: none;
        height: 100%;
        aspect-ratio: auto;
      }
    }

    /* haelt die Navbar oben lesbar und blendet unten in die Seite ueber */
    .hero__veil {
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: linear-gradient(180deg,
        rgba(255,255,255,0.42) 0%,
        rgba(255,255,255,0)    20%,
        rgba(255,255,255,0)    58%,
        rgba(248,245,239,0.55) 82%,
        rgba(248,245,239,1)    100%);
    }

    .hero__cue {
      position: absolute;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 2;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      transition: opacity 0.4s ease;
    }
    .hero__cue span {
      font-size: 0.6rem;
      font-weight: 500;
      letter-spacing: 0.32em;
      text-transform: uppercase;
      color: var(--ink-soft);
    }
    .hero__cue i {
      display: block;
      width: 1px; height: 34px;
      background: linear-gradient(to bottom, var(--gold), transparent);
      animation: pulse 2.2s ease-in-out infinite;
    }

    /* ═══════════════════════════════════════════
       INTRO — Text unter dem Video
    ═══════════════════════════════════════════ */
    #intro {
      position: relative;
      z-index: 2;
      text-align: center;
      padding: clamp(56px, 8vw, 104px) var(--pad-x) clamp(48px, 6vw, 84px);
    }
    .intro__inner { max-width: 720px; margin: 0 auto; }

    .intro__eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 14px;
      font-size: 0.72rem;
      font-weight: 600;
      letter-spacing: 0.32em;
      text-transform: uppercase;
      color: var(--gold);
      margin-bottom: 26px;
    }
    .intro__eyebrow::before {
      content: '';
      width: 40px; height: 1px;
      background: var(--gold);
    }
    .intro__title {
      font-family: var(--font-serif);
      font-size: clamp(2.5rem, 5.2vw, 4.4rem);
      font-weight: 300;
      font-style: italic;
      line-height: 1.1;
      margin-bottom: 26px;
    }
    .intro__title strong {
      font-weight: 500;
      font-style: normal;
      color: var(--gold);
    }
    .intro__text {
      font-family: var(--font-serif);
      font-size: clamp(1.02rem, 1.6vw, 1.22rem);
      font-weight: 300;
      line-height: 1.75;
      color: var(--ink-soft);
      max-width: 520px;
      margin: 0 auto 30px;
    }
    .intro__actions {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      justify-content: center;
    }

    /* ═══════════════════════════════════════════
       RING — eigene Scroll-Sektion
    ═══════════════════════════════════════════ */
    #ring { height: 190vh; position: relative; padding: 0; }
    .ring__sticky {
      position: sticky;
      top: 0;
      height: 100svh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: calc(var(--nav-h) + 20px) var(--pad-x) 0;
    }
    .ring__stage { position: relative; }
    .ring__caption {
      margin-top: clamp(20px, 3vh, 34px);
      font-size: 0.6rem;
      font-weight: 500;
      letter-spacing: 0.36em;
      text-transform: uppercase;
      color: var(--ink-muted);
    }

    @media (max-width: 900px) {
      #hero { height: 100svh; }
      #ring { height: 170vh; }
      .hero__cue { display: none; }
      .intro__title { font-size: clamp(2rem, 8.5vw, 2.7rem); }
      .intro__text { font-size: 0.98rem; margin-bottom: 22px; }
      .intro__actions { flex-direction: column; align-items: stretch; }
      .intro__actions a { text-align: center; }
    }
"""

src = sub1(r'\n  </style>', CSS + '\n  </style>', src, 0, 'Style-Ende')


# ══════════════════════════════════════════════════════════
# 2) Logo freigestellt — clip-path entfernen
# ══════════════════════════════════════════════════════════
src = sub1(
    r'      clip-path: inset\(6% 0 20% 0\);[^\n]*\n',
    '',
    src, 0, 'clip-path am Logo')
src = src.replace('assets/logo.webp', 'assets/logo-cut.webp')
# Das freigestellte Logo ist enger beschnitten → etwas kleinere Hoehe reicht.
src = sub1(r'\.nav__logo-img \{\n      height: 92px',
           '.nav__logo-img {\n      height: 62px', src, 0, 'Logo-Hoehe')


# ══════════════════════════════════════════════════════════
# 3) Ladescreen-Markup
# ══════════════════════════════════════════════════════════
LOADER = """
  <div class="loader" id="loader" role="status" aria-label="Seite wird geladen">
    <img src="assets/logo-cut.webp" alt="" class="loader__logo" width="566" height="593">
    <div class="loader__word">Juwelier Damla</div>
    <div class="loader__bar"><span id="loaderBar"></span></div>
  </div>
"""
src = sub1(r'<body>\n', '<body>\n' + LOADER, src, 0, 'body-Tag')


# ══════════════════════════════════════════════════════════
# 4) Navigation — Unterseiten aufnehmen
# ══════════════════════════════════════════════════════════
NAV_LINKS = """    <ul class="nav__links" id="navLinks">
      <li><a href="#about">Über uns</a></li>
      <li><a href="#collections">Kollektionen</a></li>
      <li><a href="trauringe.html">Trauringe</a></li>
      <li><a href="verlobungsringe.html">Verlobungsringe</a></li>
      <li><a href="reparaturen.html">Reparaturen</a></li>
      <li><a href="#services">Leistungen</a></li>
      <li><a href="#reviews">Bewertungen</a></li>
      <li><a href="#contact">Öffnungszeiten</a></li>
      <li><a href="tel:+496115807830" class="nav__cta">Anrufen</a></li>
    </ul>"""
src = sub1(r'    <ul class="nav__links" id="navLinks">.*?</ul>', NAV_LINKS, src, re.S, 'Nav-Liste')

# Footer-Navigation ebenfalls
src = sub1(
    r'(            <li><a href="#collections">Kollektionen</a></li>\n)',
    '            <li><a href="#collections">Kollektionen</a></li>\n'
    '            <li><a href="trauringe.html">Trauringe</a></li>\n'
    '            <li><a href="verlobungsringe.html">Verlobungsringe</a></li>\n'
    '            <li><a href="reparaturen.html">Reparaturen</a></li>\n',
    src, 0, 'Footer-Navigation')


# ══════════════════════════════════════════════════════════
# 5) Hero ersetzen: Video-Hero + Intro + Ring
# ══════════════════════════════════════════════════════════
NEW_SECTIONS = """  <!-- ═══════════════════════════════════
       HERO — nur das Video, automatischer Loop
  ═══════════════════════════════════ -->
  <section id="hero" aria-label="Juwelier Damla, Ladengeschäft in der Wellritzstraße">
    <div class="hero__sticky">
      <canvas id="heroCanvas" aria-hidden="true"></canvas>
      <div class="hero__veil" aria-hidden="true"></div>
      <div class="hero__cue" id="heroCue" aria-hidden="true">
        <span>Scrollen</span>
        <i></i>
      </div>
    </div>
  </section>

  <!-- ═══════════════════════════════════
       INTRO — Text
  ═══════════════════════════════════ -->
  <section id="intro" aria-labelledby="heroTitle">
    <div class="intro__inner">
      <span class="intro__eyebrow reveal">Juwelier in Wiesbaden</span>
      <h1 class="intro__title reveal d1" id="heroTitle">
        Zeitlose <strong>Eleganz</strong><br>für besondere Momente
      </h1>
      <p class="intro__text reveal d2">
        Schmuck und Trauringe – ausgewählt mit Sinn für Qualität,
        begleitet von einer Beratung, die sich Zeit für Sie nimmt.
      </p>
      <div class="intro__actions reveal d3">
        <a href="#collections" class="btn-solid">Kollektionen entdecken</a>
        <a href="verlobungsringe.html" class="btn-ghost">Verlobungsringe</a>
      </div>

      <div class="hero__badge" id="openBadge" hidden>
        <span class="hero__badge-dot" id="openDot" aria-hidden="true"></span>
        <div class="hero__badge-text">
          <strong id="openState">Jetzt geöffnet</strong>
          <span>Mo–Fr 09:30–19:00 · Sa 09:30–17:00</span>
        </div>
      </div>
    </div>
  </section>

  <!-- ═══════════════════════════════════
       RING — Scroll-Animation
  ═══════════════════════════════════ -->
  <section id="ring" aria-label="Trauring, langsam gedreht">
    <div class="ring__sticky">
      <div class="ring__stage" id="ringStage" aria-hidden="true">
        <div class="hero__ring-glow"></div>
        <canvas id="ringCanvas" width="640" height="640"></canvas>
      </div>
      <div class="ring__caption">Handwerk · Wellritzstraße 3</div>
    </div>
  </section>"""

src = sub1(r'  <section id="hero" aria-labelledby="heroTitle">.*?\n  </section>',
           NEW_SECTIONS, src, re.S, 'Hero-Sektion')

# Der Ring hat jetzt keine Einblend-Animation aus dem Hero mehr — er wird
# sichtbar, sobald das erste Frame gezeichnet ist.
src = sub1(r'      opacity: 0;\n      animation: fadeIn 1\.4s ease 0\.45s forwards;\n    \}',
           '      opacity: 1;\n    }', src, 0, 'Ring-Einblendung')


# ══════════════════════════════════════════════════════════
# 6) JavaScript
# ══════════════════════════════════════════════════════════
JS = """
    // ── Ladescreen ────────────────────────────────────
    // Blendet ab, sobald die ersten Hero-Frames stehen.
    (function () {
      const el  = document.getElementById('loader');
      const bar = document.getElementById('loaderBar');
      if (!el) return;
      document.body.classList.add('is-loading');

      const WARM = %(warm)d;              // so viele Frames vor dem Start
      let seen = 0, finished = false;

      function finish() {
        if (finished) return;
        finished = true;
        if (bar) bar.style.width = '100%%';
        setTimeout(function () {
          el.classList.add('is-done');
          document.body.classList.remove('is-loading');
        }, 280);
      }
      // wird vom Hero-Loader aufgerufen
      window.__heroWarm = function () {
        seen++;
        if (bar) bar.style.width = Math.min(100, seen / WARM * 100).toFixed(0) + '%%';
        if (seen >= WARM) finish();
      };
      window.addEventListener('load', function () { setTimeout(finish, 500); });
      setTimeout(finish, 7000);           // Notausstieg, falls Bilder haengen
    })();

    // ── Hero: Ladenfront-Video, automatischer Loop ───────
    (function () {
      const cnv = document.getElementById('heroCanvas');
      const sec = document.getElementById('hero');
      const cue = document.getElementById('heroCue');
      if (!cnv || !sec) return;

      const ctx = cnv.getContext('2d', { alpha: false });
      const FRAMES = %(hero)d;
      const SRC = i => 'assets/hero/f-' + String(i + 1).padStart(3, '0') + '.webp';
      const imgs = new Array(FRAMES);
      let current = -1;

      const ready = i => imgs[i] && imgs[i].complete && imgs[i].naturalWidth;

      function fit() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = Math.round(cnv.clientWidth * dpr);
        const h = Math.round(cnv.clientHeight * dpr);
        if (w !== cnv.width || h !== cnv.height) {
          cnv.width = w; cnv.height = h;
          const keep = current; current = -1;
          if (keep >= 0) draw(keep);
        }
      }

      // wie object-fit: cover
      function draw(i) {
        if (!ready(i)) return;
        const im = imgs[i], cw = cnv.width, ch = cnv.height;
        if (!cw || !ch) return;
        const s = Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
        const w = im.naturalWidth * s, h = im.naturalHeight * s;
        ctx.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h);
        current = i;
      }

      let warmed = 0;
      function load(i) {
        if (imgs[i]) return;
        const im = new Image();
        im.decoding = 'async';
        im.onload = function () {
          if (i === 0) { fit(); draw(0); }
          if (warmed < %(warm)d) { warmed++; if (window.__heroWarm) window.__heroWarm(); }
        };
        im.onerror = function () {
          if (warmed < %(warm)d) { warmed++; if (window.__heroWarm) window.__heroWarm(); }
        };
        im.src = SRC(i);
        imgs[i] = im;
      }

      for (let i = 0; i < FRAMES; i++) load(i);

      window.addEventListener('resize', function () {
        fit(); if (current >= 0) draw(current);
      });

      // Scroll-Hinweis sanft ausblenden, sobald der Nutzer scrollt.
      if (cue) {
        window.addEventListener('scroll', function () {
          const p = Math.min(1, window.scrollY / (window.innerHeight * 0.5));
          cue.style.opacity = Math.max(0, 1 - p).toFixed(2);
        }, { passive: true });
      }

      // Automatischer Loop: Frames zeitgesteuert vor- und zurueckspielen
      // (Ping-Pong — so faellt der harte Sprung am Schleifenende weg, weil das
      // Ladenfront-Video nicht nahtlos loopt).
      const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (REDUCED) {
        fit(); draw(0);              // Ruhebild, keine Bewegung
      } else {
        const FPS = 24, stepMs = 1000 / FPS;
        let pos = 0, dir = 1, last = 0;
        function tick(t) {
          if (!last) last = t;
          if (t - last >= stepMs) {
            last = t;
            pos += dir;
            if (pos >= FRAMES - 1) { pos = FRAMES - 1; dir = -1; }
            else if (pos <= 0)     { pos = 0;          dir =  1; }
            fit();
            if (ready(pos)) draw(pos);
          }
          requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      }
    })();
"""% {'hero': N_HERO, 'warm': min(10, N_HERO)}

src = sub1(r'\n  <script>\n', '\n  <script>\n' + JS, src, 0, 'Script-Anfang')

# ── Ring-JS auf die eigene Sektion umstellen ──────────────
OLD_RING_HEAD = """      const canvas = document.getElementById('ringCanvas');
      const hero = document.getElementById('hero');
      const content = document.getElementById('heroContent');
      if (!canvas || !hero) return;"""
NEW_RING_HEAD = """      const canvas = document.getElementById('ringCanvas');
      const hero = document.getElementById('ring');
      if (!canvas || !hero) return;"""
assert OLD_RING_HEAD in src, 'Ring-JS-Kopf nicht gefunden'
src = src.replace(OLD_RING_HEAD, NEW_RING_HEAD, 1)

# Fortschritt jetzt relativ zur Ring-Sektion (die steht nicht mehr bei scrollY 0)
OLD_P = """        const runway = hero.offsetHeight - window.innerHeight;
        if (runway <= 0) return;
        const p = Math.min(1, Math.max(0, window.scrollY / runway));"""
NEW_P = """        const runway = hero.offsetHeight - window.innerHeight;
        if (runway <= 0) return;
        const top = hero.getBoundingClientRect().top;
        const p = Math.min(1, Math.max(0, -top / runway));"""
assert OLD_P in src, 'Ring-Fortschritt nicht gefunden'
src = src.replace(OLD_P, NEW_P, 1)

# heroContent gibt es nicht mehr
OLD_CONTENT = """        content.style.opacity = Math.max(0, 1 - Math.max(0, p - 0.55) * 1.8).toFixed(3);
        content.style.transform = 'translateY(' + (-p * 26).toFixed(1) + 'px)';"""
assert OLD_CONTENT in src, 'heroContent-Block nicht gefunden'
src = src.replace(OLD_CONTENT, '', 1)

io.open(OUT, 'w', encoding='utf-8').write(src)
print('index.html gebaut: %.0f KB | Hero-Frames %d | Ring-Frames %d'
      % (len(src.encode('utf-8')) / 1024.0, N_HERO, N_RING))
