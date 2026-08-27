# -*- coding: utf-8 -*-
"""Screenshots an definierten Scroll-Positionen.

Der Ladescreen und die Scroll-Animationen lassen sich mit einem einfachen
Edge-Screenshot nicht pruefen (der schiesst immer bei scrollY 0 und waehrend
der Loader noch liegt). Playwright wartet den Loader ab und scrollt gezielt.

Aufruf:  shots.py <url> <outdir> [breite] [hoehe]
"""
import sys, os, time
from playwright.sync_api import sync_playwright

url = sys.argv[1]
outdir = sys.argv[2]
W = int(sys.argv[3]) if len(sys.argv) > 3 else 1440
H = int(sys.argv[4]) if len(sys.argv) > 4 else 900
os.makedirs(outdir, exist_ok=True)

# Anteil der Gesamt-Scrollhoehe -> Dateiname
STOPS = [
    (0.00, '00-hero-start'),
    (0.06, '01-hero-mitte'),
    (0.13, '02-hero-ende'),
    (0.17, '03-intro'),
    (0.24, '04-ring'),
    (0.33, '05-about'),
]

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': W, 'height': H}, device_scale_factor=1)
    errors = []
    pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errors.append('PAGEERROR: ' + str(e)))

    pg.goto(url, wait_until='load')
    # Ladescreen abwarten
    try:
        pg.wait_for_selector('.loader.is-done', timeout=12000)
    except Exception:
        print('  (kein Loader oder Timeout)')
    pg.wait_for_timeout(900)

    total = pg.evaluate('document.body.scrollHeight - window.innerHeight')
    print('  Scrollhoehe:', total)

    for frac, name in STOPS:
        y = int(total * frac)
        pg.evaluate('window.scrollTo(0, %d)' % y)
        pg.wait_for_timeout(650)          # Frame-Scrub + reveal nachziehen lassen
        pg.screenshot(path=os.path.join(outdir, name + '.png'))
        print('  %-18s y=%d' % (name, y))

    # Overflow-Check
    ov = pg.evaluate('({sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth})')
    print('  scrollWidth %d / clientWidth %d %s'
          % (ov['sw'], ov['cw'], 'OVERFLOW!' if ov['sw'] > ov['cw'] else 'ok'))
    if errors:
        print('  JS-FEHLER:', errors[:5])
    else:
        print('  keine JS-Fehler')
    b.close()
