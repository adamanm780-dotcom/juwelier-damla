# -*- coding: utf-8 -*-
"""Baut index.html um:
   - Ladescreen mit freigestelltem Logo
   - Nav mit Unterseiten-Links, freigestelltes Logo (ohne clip-path)
   - Hero = zwei Ladenvideos (Front + Innenraum) im Wechsel,
     abgedunkelt, davor das freigestellte Logo
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

    /* Dunkelt die Clips ab. Zwei Lagen: ein gleichmaessiger Schleier ueber
       das ganze Bild und ein weicher Schatten in der Mitte, damit das weisse
       Logo auch vor der hell beleuchteten Auslage steht. */
    .hero__shade {
      position: absolute;
      inset: 0;
      z-index: 3;
      pointer-events: none;
      background:
        radial-gradient(52% 48% at 50% 47%,
          rgba(18,14,11,0.42) 0%,
          rgba(18,14,11,0.24) 58%,
          rgba(18,14,11,0)   100%),
        linear-gradient(180deg,
          rgba(18,14,11,0.30) 0%,
          rgba(18,14,11,0.36) 100%);
    }

    /* das freigestellte Logo steht mittig vor dem Video */
    .hero__mark {
      position: absolute;
      top: 50%;
      left: 50%;
      z-index: 5;
      width: clamp(190px, 22vw, 340px);
      height: auto;
      transform: translate(-50%, -50%);
      pointer-events: none;
      filter: drop-shadow(0 6px 22px rgba(0,0,0,0.5));
      opacity: 0;
      animation: fadeIn 1.6s ease 0.35s forwards;
    }

    /* haelt die Navbar oben lesbar und blendet unten in die Seite ueber */
    .hero__veil {
      position: absolute;
      inset: 0;
      z-index: 4;
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
      z-index: 6;
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
      .hero__mark { width: clamp(180px, 52vw, 260px); }
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
      <div class="hero__shade" aria-hidden="true"></div>
      <div class="hero__veil" aria-hidden="true"></div>
      <img src="assets/logo-mark.webp" alt="Juwelier Damla"
           class="hero__mark" width="900" height="917" fetchpriority="high">
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
    // Blendet ab, sobald die Hero-Videos das erste Bild haben.
    (function () {
      const el  = document.getElementById('loader');
      const bar = document.getElementById('loaderBar');
      if (!el) return;
      document.body.classList.add('is-loading');

      // Nur der erste Clip wird abgewartet. Frueher waren es beide — dann
      // haengt der Ladescreen an 1,1 MB Video, obwohl die Seite laengst
      // steht und die Poster den Hero ohnehin korrekt zeigen.
      // (Beide Clips behalten preload="auto": mit "metadata" verliert der
      // zweite nach dem Abspielen seine Puffer und zeigt bei jedem
      // Durchlauf kurz sein Poster.)
      const WARM = 1;              // so viele Clips vor dem Start
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
      // Der Ladescreen ist Schmuck; das Markup steht mit dem Inline-CSS
      // sofort. Laenger als gut zwei Sekunden darf er niemanden aufhalten.
      setTimeout(finish, 2500);           // Notausstieg, falls Bilder haengen
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

      let idx = 0, timer = 0, guard = 0, nextAt = 0, running = false;

      function play(v) {
        // Clip in SLOT ms durchspielen — die Quellen sind gut 5 s lang.
        const d = v.duration;
        if (d && isFinite(d)) v.playbackRate = Math.min(2, Math.max(1, d / (SLOT / 1000)));
        v.muted = true;                 // iOS startet nur stumme Videos selbst
        const pr = v.play();
        if (pr && pr.catch) pr.catch(function () {});   // Autoplay abgelehnt
      }

      function show(i, prev) {
        idx = i;
        const next = vids[i];
        if (prev && prev !== next) {
          // Der neue Clip legt sich waehrend der Blende ueber den alten. Der
          // alte wird dabei sofort angehalten — er steht durch die angepasste
          // Geschwindigkeit ohnehin schon auf seinem letzten Bild, und iOS
          // bricht die Wiedergabe gern ab, wenn zwei Videos gleichzeitig
          // laufen. Sichtbar bleibt er bis zum Ende der Blende.
          prev.pause();
          prev.style.zIndex = '1';
          next.style.zIndex = '2';
          clearTimeout(prev.__fade);
          prev.__fade = setTimeout(function () {
            if (vids[idx] !== prev) prev.classList.remove('is-on');
          }, FADE);
        }
        try { next.currentTime = 0; } catch (e) {}
        next.classList.add('is-on');
        play(next);
        clearTimeout(timer);
        nextAt = Date.now() + SLOT;
        timer = setTimeout(function () { show((i + 1) %% vids.length, next); }, SLOT);
      }

      // Sicherheitsnetz, damit die Schleife wirklich nie endet: iOS haelt
      // Videos bei Energiesparmodus oder Speicherdruck von sich aus an, und
      // gedrosselte Timer koennen einen Wechsel verschlafen. Der Waechter
      // schiebt beides wieder an.
      function watch() {
        if (!running) return;
        const v = vids[idx];
        if (Date.now() > nextAt + 900) { show((idx + 1) %% vids.length, v); return; }
        if (v.paused && !v.ended) play(v);
      }

      function start() {
        if (running) return;
        running = true;
        show(idx, null);
        clearInterval(guard);
        guard = setInterval(watch, 1000);
      }
      function stop() {
        if (!running) return;
        running = false;
        clearTimeout(timer);
        clearInterval(guard);
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


# ══════════════════════════════════════════════════════════
# 9) Trauring-Popup beim ersten Besuch
# ──────────────────────────────────────────────────────────
# Gestalterisch an einer Referenz orientiert: ein mattierter
# Glasbogen liegt ueber einem Produktfoto, die Ringe schimmern
# unscharf hindurch. Serifen-Display in Roman + Kursiv, Pillen-
# Knopf mit wanderndem Pfeil.
# ══════════════════════════════════════════════════════════
POPUP_CSS = """
    /* ═══════════════════════════════════════════
       TRAURING-POPUP
    ═══════════════════════════════════════════ */
    /* `display: grid` wuerde das hidden-Attribut aushebeln (die
       Browserregel [hidden]{display:none} ist schwaecher als eine
       Klasse) — deshalb ausdruecklich zuruecknehmen. */
    .jd-pop[hidden] { display: none; }

    .jd-pop {
      position: fixed;
      inset: 0;
      z-index: 950;
      display: grid;
      place-items: center;
      padding: clamp(16px, 4vw, 40px);
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.5s ease, visibility 0.5s ease;
    }
    .jd-pop.is-auf { opacity: 1; visibility: visible; }

    .jd-pop__grund {
      position: absolute;
      inset: 0;
      background: rgba(24, 21, 17, 0.52);
      -webkit-backdrop-filter: blur(7px);
      backdrop-filter: blur(7px);
      border: 0;
      padding: 0;
      cursor: pointer;
    }

    /* Die Karte traegt die Bogenform, die auf der Seite ohnehin
       das wiederkehrende Motiv ist. */
    .jd-pop__karte {
      position: relative;
      width: min(92vw, 440px);
      max-height: calc(100vh - 32px);
      overflow-x: hidden;
      overflow-y: auto;
      border-radius: 220px 220px 14px 14px;
      background: var(--marble-warm);
      box-shadow: 0 30px 90px rgba(24, 21, 17, 0.32);
      padding-top: clamp(104px, 27vw, 172px);
      padding-bottom: clamp(46px, 12vw, 76px);
      transform: translateY(26px) scale(0.965);
      opacity: 0;
      transition: transform 0.75s var(--ease-out), opacity 0.6s ease;
      scrollbar-width: none;
    }
    .jd-pop__karte::-webkit-scrollbar { display: none; }
    .jd-pop.is-auf .jd-pop__karte { transform: none; opacity: 1; }

    /* Der Schatten liegt auf dem Wrapper, nicht auf dem geclippten
       Element — so folgt er der Bogenkante statt dem Rechteck. */
    .jd-pop__glashuelle {
      position: relative;
      z-index: 1;
      filter: drop-shadow(0 10px 26px rgba(24, 21, 17, 0.16));
    }

    .jd-pop__bild {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      z-index: 0;
    }

    /* Mattierter Glasbogen. Die Ringe liegen im Foto darunter und
       schimmern unscharf durch — das ist der eigentliche Effekt. */
    .jd-pop__glas {
      position: relative;
      z-index: 1;
      margin: 0 clamp(18px, 5vw, 30px);
      padding: clamp(38px, 8vw, 58px) clamp(20px, 4.6vw, 30px) clamp(24px, 5vw, 34px);
      text-align: center;
      background: rgba(255, 253, 250, 0.86);
      -webkit-clip-path: url(#jdBogen);
      clip-path: url(#jdBogen);
    }
    @supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
      /* Bewusst durchlaessig: die Ringe im Foto sollen als warmer
         Schimmer hinter dem Glas stehen bleiben, nicht verschwinden. */
      .jd-pop__glas {
        background: rgba(255, 253, 250, 0.42);
        -webkit-backdrop-filter: blur(12px) saturate(1.25);
        backdrop-filter: blur(12px) saturate(1.25);
      }
    }

    /* Ruhigeres Bett fuer den Text, ohne die Bogenkanten milchig zu
       machen: oben und unten bleibt das Glas klar. */
    .jd-pop__glas::before {
      content: '';
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: linear-gradient(180deg,
        rgba(255,253,250,0)    0%,
        rgba(255,253,250,0.34) 30%,
        rgba(255,253,250,0.34) 76%,
        rgba(255,253,250,0)    100%);
    }

    /* Einmaliger Lichtstreifen ueber das Glas, sobald es steht. */
    .jd-pop__glas::after {
      content: '';
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: linear-gradient(105deg,
        rgba(255,255,255,0) 38%,
        rgba(255,255,255,0.55) 50%,
        rgba(255,255,255,0) 62%);
      transform: translateX(-120%);
    }
    .jd-pop.is-auf .jd-pop__glas::after {
      animation: jdSchimmer 1.5s var(--ease-out) 0.55s 1;
    }
    @keyframes jdSchimmer {
      to { transform: translateX(120%); }
    }

    /* Inhalt staffelt sich ein */
    .jd-pop__stufe {
      position: relative;   /* ueber dem Verlauf im Glas */
      z-index: 1;
      opacity: 0;
      transform: translateY(12px);
      transition: opacity 0.6s ease, transform 0.7s var(--ease-out);
    }
    .jd-pop.is-auf .jd-pop__stufe { opacity: 1; transform: none; }
    .jd-pop.is-auf .jd-pop__stufe:nth-child(1) { transition-delay: 0.26s; }
    .jd-pop.is-auf .jd-pop__stufe:nth-child(2) { transition-delay: 0.34s; }
    .jd-pop.is-auf .jd-pop__stufe:nth-child(3) { transition-delay: 0.42s; }
    .jd-pop.is-auf .jd-pop__stufe:nth-child(4) { transition-delay: 0.50s; }
    .jd-pop.is-auf .jd-pop__stufe:nth-child(5) { transition-delay: 0.58s; }

    .jd-pop__eyebrow {
      display: block;
      font-size: 0.55rem;
      font-weight: 600;
      letter-spacing: 0.34em;
      text-transform: uppercase;
      color: var(--gold-dark);
      margin-bottom: 14px;
    }
    .jd-pop__titel {
      font-family: var(--font-serif);
      font-size: clamp(1.75rem, 6.4vw, 2.3rem);
      font-weight: 300;
      line-height: 1.14;
      color: var(--ink);
      margin-bottom: 14px;
    }
    .jd-pop__titel em { font-style: italic; color: var(--gold-dark); }
    .jd-pop__text {
      font-family: var(--font-serif);
      font-size: clamp(0.95rem, 3.4vw, 1.04rem);
      font-weight: 300;
      line-height: 1.75;
      color: var(--ink-soft);
      margin-bottom: 22px;
    }

    /* Pillen-Knopf, der Pfeil wandert beim Zeigen */
    .jd-pop__cta {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: var(--gold);
      color: #fff;
      border-radius: 999px;
      padding: 13px 26px;
      font-size: 0.62rem;
      font-weight: 600;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      transition: background 0.35s ease, box-shadow 0.35s ease;
      box-shadow: 0 6px 22px rgba(160, 120, 56, 0.28);
    }
    .jd-pop__cta:hover { background: var(--gold-dark); }
    .jd-pop__cta svg { width: 15px; height: 9px; transition: transform 0.35s var(--ease-out); }
    .jd-pop__cta:hover svg { transform: translateX(5px); }

    .jd-pop__spaeter {
      display: block;
      margin: 15px auto 0;
      background: none;
      border: 0;
      cursor: pointer;
      font-family: var(--font-sans);
      font-size: 0.66rem;
      color: var(--ink-muted);
      text-decoration: underline;
      text-underline-offset: 3px;
      transition: color 0.3s ease;
    }
    .jd-pop__spaeter:hover { color: var(--gold-dark); }

    /* Am Overlay, nicht an der Karte: der Bogenradius schneidet die
       obere Ecke weg, dort waere der Knopf unsichtbar. */
    .jd-pop__zu {
      position: absolute;
      top: clamp(12px, 3vw, 26px);
      right: clamp(12px, 3vw, 26px);
      z-index: 3;
      width: 40px; height: 40px;
      display: grid;
      place-items: center;
      border: 0;
      border-radius: 50%;
      cursor: pointer;
      background: rgba(255, 253, 250, 0.82);
      color: var(--ink-soft);
      font-size: 1.15rem;
      line-height: 1;
      box-shadow: 0 2px 12px rgba(24, 21, 17, 0.24);
      transition: background 0.3s ease, color 0.3s ease, transform 0.3s ease;
    }
    .jd-pop__zu:hover { background: #fff; color: var(--gold-dark); transform: rotate(90deg); }

    @media (prefers-reduced-motion: reduce) {
      .jd-pop__karte { transform: none; transition: opacity 0.3s ease; }
      .jd-pop__stufe { transform: none; }
      .jd-pop.is-auf .jd-pop__glas::after { animation: none; }
    }
"""
src = sub1(r'\n  </style>', POPUP_CSS + '\n  </style>', src, 0, 'Popup-CSS')


POPUP_HTML = """
  <!-- Bogen-Maske fuer das Glas; objectBoundingBox skaliert mit -->
  <svg width="0" height="0" aria-hidden="true" focusable="false" style="position:absolute">
    <defs>
      <clipPath id="jdBogen" clipPathUnits="objectBoundingBox">
        <path d="M0.5,0 C0.60,0.020 0.70,0.052 0.79,0.079 C0.91,0.113 1,0.128 1,0.176 L1,0.965 Q1,1 0.955,1 L0.045,1 Q0,1 0,0.965 L0,0.176 C0,0.128 0.09,0.113 0.21,0.079 C0.30,0.052 0.40,0.020 0.5,0 Z"/>
      </clipPath>
    </defs>
  </svg>

  <div class="jd-pop" id="jdPop" role="dialog" aria-modal="true"
       aria-labelledby="jdPopTitel" aria-describedby="jdPopText" hidden>
    <button type="button" class="jd-pop__grund" id="jdPopGrund" tabindex="-1" aria-label="Hinweis schließen"></button>
    <button type="button" class="jd-pop__zu" id="jdPopZu" aria-label="Schließen">&#215;</button>

    <div class="jd-pop__karte" id="jdPopKarte">
      <img class="jd-pop__bild" src="assets/popup-trauringe.webp"
           alt="Zwei goldene Trauringe auf champagnerfarbener Seide"
           width="900" height="1200" decoding="async">

      <div class="jd-pop__glashuelle">
      <div class="jd-pop__glas">
        <span class="jd-pop__eyebrow jd-pop__stufe">Neu bei Juwelier Damla</span>
        <h2 class="jd-pop__titel jd-pop__stufe" id="jdPopTitel">Ihre Trauringe,<br><em>Zug um Zug</em></h2>
        <p class="jd-pop__text jd-pop__stufe" id="jdPopText">
          Legierung, Profil, Breite, Oberfläche – stellen Sie Ihr Paar
          selbst zusammen und sehen Sie jede Entscheidung sofort am Ring.
        </p>
        <a class="jd-pop__cta jd-pop__stufe" href="trauringe.html" id="jdPopCta">
          Konfigurator öffnen
          <svg viewBox="0 0 15 9" fill="none" aria-hidden="true">
            <path d="M0 4.5h13M9.5 1l3.5 3.5L9.5 8" stroke="currentColor" stroke-width="1.2"/>
          </svg>
        </a>
        <button type="button" class="jd-pop__spaeter jd-pop__stufe" id="jdPopSpaeter">Vielleicht später</button>
      </div>
      </div>
    </div>
  </div>
"""
# Vor den Skriptblock, nicht vor </body>: das Seitenskript laeuft waehrend
# des Parsens, und ein Popup, das danach im Dokument steht, existiert dort
# noch nicht — getElementById kaeme leer zurueck und die Funktion stiege
# still aus.
src = sub1(r'\n  <script>\n', POPUP_HTML + '\n  <script>\n', src, 0, 'Popup-Markup')


POPUP_JS = """
    /* ── Trauring-Popup ───────────────────────────────────────
       Zeigt sich einmal je Besucher, nachdem der Ladescreen weg
       ist. Wer es wegklickt, sieht es 30 Tage nicht wieder — ein
       Hinweis, der bei jedem Aufruf wiederkommt, aergert nur. */
    (function () {
      var pop = document.getElementById('jdPop');
      if (!pop) return;

      var SCHLUESSEL = 'jd-trauring-popup';
      var RUHE_TAGE = 30;

      var gesehen = null;
      try { gesehen = localStorage.getItem(SCHLUESSEL); } catch (e) { gesehen = null; }
      if (gesehen && Date.now() - Number(gesehen) < RUHE_TAGE * 864e5) return;

      var karte = document.getElementById('jdPopKarte');
      var cta = document.getElementById('jdPopCta');
      var zu = document.getElementById('jdPopZu');
      var spaeter = document.getElementById('jdPopSpaeter');
      var vorherFokus = null;

      function merken() {
        try { localStorage.setItem(SCHLUESSEL, String(Date.now())); } catch (e) {}
      }

      function schliessen() {
        pop.classList.remove('is-auf');
        document.body.style.overflow = '';
        merken();
        setTimeout(function () { pop.hidden = true; }, 520);
        if (vorherFokus && vorherFokus.focus) vorherFokus.focus();
        document.removeEventListener('keydown', taste);
      }

      /* Escape schliesst, Tab bleibt im Dialog gefangen. */
      function taste(e) {
        if (e.key === 'Escape') { schliessen(); return; }
        if (e.key !== 'Tab') return;
        var ziele = [zu, cta, spaeter];
        var i = ziele.indexOf(document.activeElement);
        e.preventDefault();
        var naechster = e.shiftKey
          ? ziele[(i <= 0 ? ziele.length : i) - 1]
          : ziele[(i + 1) % ziele.length];
        naechster.focus();
      }

      function oeffnen() {
        vorherFokus = document.activeElement;
        pop.hidden = false;
        document.body.style.overflow = 'hidden';
        /* Reflow erzwingen statt requestAnimationFrame: in einem Hintergrund-
           Tab laeuft rAF nicht, dann bliebe das Popup unsichtbar — waehrend
           der Seiten-Scroll schon gesperrt waere. */
        void pop.offsetWidth;
        pop.classList.add('is-auf');
        setTimeout(function () { cta.focus({ preventScroll: true }); }, 620);
        document.addEventListener('keydown', taste);
      }

      zu.addEventListener('click', schliessen);
      document.getElementById('jdPopGrund').addEventListener('click', schliessen);
      spaeter.addEventListener('click', schliessen);
      /* Wer den Konfigurator oeffnet, hat den Hinweis erledigt. */
      cta.addEventListener('click', merken);
      karte.addEventListener('click', function (e) { e.stopPropagation(); });

      /* Erst zeigen, wenn der Ladescreen fertig ist — sonst liegen
         zwei Overlays uebereinander. */
      var start = function () { setTimeout(oeffnen, 900); };
      var loader = document.getElementById('loader');
      if (loader && !loader.classList.contains('is-done')) {
        var schonGestartet = false;
        var einmalStarten = function () {
          if (schonGestartet) return;
          schonGestartet = true;
          beobachter.disconnect();
          start();
        };
        var beobachter = new MutationObserver(function () {
          if (loader.classList.contains('is-done')) einmalStarten();
        });
        beobachter.observe(loader, { attributes: true, attributeFilter: ['class'] });
        /* Notbremse: bei langsamer Verbindung braucht der Ladescreen laenger.
           Dann trotzdem zeigen — vorher hat der Abbruch nach 9 s das Popup
           still verschluckt, statt es spaeter nachzuholen. */
        setTimeout(einmalStarten, 9000);
      } else {
        start();
      }
    })();
"""
# Achtung: das erste `</script>` im Dokument schliesst den JSON-LD-Block.
# Deshalb gezielt an das LETZTE anhaengen — das ist das Seitenskript.
ENDE = '\n  </script>'
i = src.rfind(ENDE)
assert i > 0, 'Seitenskript-Ende nicht gefunden'
src = src[:i] + POPUP_JS + src[i:]

io.open(OUT, 'w', encoding='utf-8').write(src)
print('Popup eingebaut')
