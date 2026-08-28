# -*- coding: utf-8 -*-
"""Baut index.html um:
   - Ladescreen mit freigestelltem Logo
   - Nav mit Unterseiten-Links, freigestelltes Logo (ohne clip-path)
   - Hero = zwei Ladenvideos (Front + Innenraum) im Wechsel
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

N_RING = len(glob.glob(os.path.join(DIR, 'assets', 'ring', 'frame-*.webp')))
assert N_RING > 0, 'Ring-Frames fehlen'

# Hero: zwei Clips im Wechsel. SLOT_MS ist die Standzeit je Clip — beide
# Quellen sind gut 5 s lang und werden per playbackRate darauf gerafft,
# ein kompletter Durchlauf dauert also SLOT_MS * 2.
HERO_CLIPS = ['assets/video/hero-front.mp4', 'assets/video/hero-innen.mp4']
N_CLIPS = len(HERO_CLIPS)
SLOT_MS = 4000
for c in HERO_CLIPS:
    assert os.path.exists(os.path.join(DIR, c)), 'Hero-Video fehlt: ' + c


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
    /* Bestand: `.reveal-img img` startet mit scale(1.14) und ragt dadurch
       seitlich heraus, solange es noch nicht eingeblendet wurde (auf 390px
       rund 7px, also ein waagerechter Scrollbalken). `clip` schneidet das ab,
       ohne — anders als `hidden` — einen Scroll-Container zu erzeugen, der die
       sticky-Bereiche von Hero und Ring brechen wuerde.
       Nicht auf .reveal-img selbst, weil dort der Zierrahmen
       `.about-figure::after` bewusst 16px nach aussen ragt — und NICHT auf
       html/body: dort bricht jedes overflow ausser `visible` die sticky-Heros
       von #hero und #ring. Deshalb genau auf die Sektion mit dem Bild. */
    #about { overflow-x: clip; }

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
       HERO — zwei Ladenvideos im Wechsel
    ═══════════════════════════════════════════ */
    /* padding: 0 hebt die Basisregel `section { padding: var(--pad-section) 0 }`
       auf — sonst schiebt sie das Video unter der Navbar nach unten. */
    #hero { height: 100svh; position: relative; padding: 0; }

    .hero__stage {
      position: relative;
      height: 100%;
      overflow: hidden;
      background: #F4F1EB;
    }

    /* Beide Clips sind 2196x940 (2.34:1). Auf breiten Schirmen bekommt das
       Video genau dieses Seitenverhaeltnis und sitzt mittig — so bleibt die
       komplette Ladenfront samt Schriftzug im Bild, oben und unten laeuft es
       in die Seitenfarbe aus. Schmale Schirme fuellen stattdessen die ganze
       Flaeche, weil ein duennes Band dort verloren wirkt.
       Die Clips liegen uebereinander; der einblendende bekommt per JS das
       hoehere z-index und deckt den laufenden waehrend der Blende ab —
       so entsteht eine echte Ueberblendung statt eines Durchblicks auf den
       Seitenhintergrund. */
    .hero__video {
      position: absolute;
      top: 50%;
      left: 0;
      z-index: 1;
      width: 100%;
      height: auto;
      aspect-ratio: 2196 / 940;
      transform: translateY(-50%);
      display: block;
      object-fit: cover;
      opacity: 0;
      transition: opacity 0.8s ease;
    }
    .hero__video.is-on { opacity: 1; }
    @media (max-width: 900px) {
      .hero__video {
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
      z-index: 3;
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
      z-index: 4;
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
    '            <li><a href="verlobungsringe.html">Verlobungsringe</a></li>\n'
    '            <li><a href="reparaturen.html">Reparaturen</a></li>\n',
    src, 0, 'Footer-Navigation')


# ══════════════════════════════════════════════════════════
# 5) Hero ersetzen: Video-Hero + Intro + Ring
# ══════════════════════════════════════════════════════════
NEW_SECTIONS = """  <!-- ═══════════════════════════════════
       HERO — Ladenfront und Ladenraum im Wechsel
  ═══════════════════════════════════ -->
  <section id="hero" aria-label="Juwelier Damla, Ladengeschäft in der Wellritzstraße">
    <div class="hero__stage">
      <video class="hero__video" src="assets/video/hero-front.mp4"
             poster="assets/hero-front.webp" width="2196" height="940"
             muted playsinline preload="auto" aria-hidden="true"></video>
      <video class="hero__video" src="assets/video/hero-innen.mp4"
             poster="assets/hero-innen.webp" width="2196" height="940"
             muted playsinline preload="auto" aria-hidden="true"></video>
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
        Schmuck, Uhren und Trauringe – ausgewählt mit Sinn für Qualität,
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
    // Blendet ab, sobald die Hero-Videos das erste Bild haben.
    (function () {
      const el  = document.getElementById('loader');
      const bar = document.getElementById('loaderBar');
      if (!el) return;
      document.body.classList.add('is-loading');

      const WARM = %(warm)d;              // so viele Clips vor dem Start
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

    // ── Hero: zwei Ladenvideos im Wechsel ─────────────
    // Ladenfront und Ladenraum laufen abwechselnd, je %(slot).1f s
    // (leicht beschleunigt, damit ein Durchlauf ~%(cycle).0f s dauert).
    (function () {
      const sec  = document.getElementById('hero');
      const cue  = document.getElementById('heroCue');
      const vids = sec ? [].slice.call(sec.querySelectorAll('.hero__video')) : [];
      if (!sec || !vids.length) return;

      const SLOT = %(slot_ms)d;   // Standzeit je Clip
      const FADE = 800;      // muss zur CSS-Transition passen

      // Fortschritt fuer den Ladescreen: jeder Clip meldet sich einmal.
      vids.forEach(function (v) {
        let told = false;
        function ready() {
          if (told) return;
          told = true;
          if (window.__heroWarm) window.__heroWarm();
        }
        if (v.readyState >= 2) ready();
        else {
          v.addEventListener('loadeddata', ready, { once: true });
          v.addEventListener('error', ready, { once: true });
        }
      });

      // Wer weniger Bewegung moechte, bekommt nur das Standbild.
      const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (still) { vids[0].classList.add('is-on'); return; }

      let idx = 0, timer = 0, running = false;

      function play(v) {
        // Clip in SLOT ms durchspielen — die Quellen sind gut 5 s lang.
        const d = v.duration;
        if (d && isFinite(d)) v.playbackRate = Math.min(2, Math.max(1, d / (SLOT / 1000)));
        const pr = v.play();
        if (pr && pr.catch) pr.catch(function () {});   // Autoplay abgelehnt
      }

      function show(i, prev) {
        idx = i;
        const next = vids[i];
        if (prev && prev !== next) {
          // Der neue Clip legt sich waehrend der Blende ueber den alten,
          // der erst danach ausgeblendet und angehalten wird.
          prev.style.zIndex = '1';
          next.style.zIndex = '2';
          setTimeout(function () {
            if (vids[idx] !== prev) { prev.classList.remove('is-on'); prev.pause(); }
          }, FADE);
        }
        try { next.currentTime = 0; } catch (e) {}
        next.classList.add('is-on');
        play(next);
        clearTimeout(timer);
        timer = setTimeout(function () { show((i + 1) %% vids.length, next); }, SLOT);
      }

      function start() {
        if (running) return;
        running = true;
        show(idx, null);
      }
      function stop() {
        if (!running) return;
        running = false;
        clearTimeout(timer);
        vids.forEach(function (v) { v.pause(); });
      }

      // Nur laufen lassen, solange der Hero sichtbar und der Tab aktiv ist.
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) {
          es.forEach(function (e) {
            if (e.isIntersecting && !document.hidden) start(); else stop();
          });
        }, { threshold: 0.05 }).observe(sec);
      } else {
        start();
      }
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) stop();
        else if (sec.getBoundingClientRect().bottom > 0) start();
      });
      start();

      // Scroll-Hinweis verblasst, sobald es losgeht.
      if (cue) {
        let ticking = false;
        const fade = function () {
          ticking = false;
          const p = Math.min(1, window.scrollY / (window.innerHeight * 0.35));
          cue.style.opacity = (1 - p).toFixed(2);
        };
        window.addEventListener('scroll', function () {
          if (!ticking) { ticking = true; requestAnimationFrame(fade); }
        }, { passive: true });
        fade();
      }
    })();
"""% {'warm': N_CLIPS, 'slot_ms': SLOT_MS, 'slot': SLOT_MS / 1000.0,
        'cycle': SLOT_MS * N_CLIPS / 1000.0}

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
print('index.html gebaut: %.0f KB | Hero-Clips %d a %.1f s | Ring-Frames %d'
      % (len(src.encode('utf-8')) / 1024.0, N_CLIPS, SLOT_MS / 1000.0, N_RING))
