# -*- coding: utf-8 -*-
"""Baut shop.html und shop-produkt.html — den Onlineshop-Entwurf.

Erbt Style-Block, Marmor-Hintergrund, Ladescreen, Nav, Footer und Script
aus index.html, genau wie build-subpages.py, und legt shop.css darueber.

Der Shop steht bewusst NICHT in der Hauptnavigation: er ist ein Entwurf
und soll den Besuchern der Website noch nicht als fertiges Angebot
begegnen. Erreichbar ist er ueber die direkte Adresse.

Reihenfolge: erst build-index.py, dann dieses Skript.
"""
import io, os, re

DIR = os.path.dirname(os.path.abspath(__file__))
src = io.open(os.path.join(DIR, 'index.html'), encoding='utf-8').read()


def grab(muster, was, flags=re.S):
    m = re.search(muster, src, flags)
    assert m, 'nicht gefunden: ' + was
    return m.group(0)


font_links  = '\n'.join(re.findall(r'^\s*<link [^>]*fonts\.[^>]*>$', src, re.M))
style_block = grab(r'  <style>.*?</style>', 'Style-Block')
loader      = grab(r'  <div class="loader" id="loader".*?</div>\n  </div>', 'Ladescreen')
marble      = grab(r'  <div class="marble-bg" aria-hidden="true">.*?</div>\n', 'Marmor-BG')
footer      = grab(r'  <footer class="site-footer">.*?</footer>', 'Footer')
script      = grab(r'  <script>.*?</script>', 'Script')
skip        = grab(r'  <a class="skip-link".*?</a>', 'Skip-Link')
nav         = grab(r'  <nav class="nav" id="mainNav".*?</nav>', 'Nav')

footer_sub = footer.replace('<a href="#', '<a href="index.html#')
nav_sub    = nav.replace('href="#', 'href="index.html#')

SHOP_CSS = io.open(os.path.join(DIR, 'shop.css'), encoding='utf-8').read()
# Das Pluszeichen der Aufklapper dreht sich beim Oeffnen zum Kreuz.
KREUZ = ("""
    :root {
      --kreuz: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'"""
    """ viewBox='0 0 11 11'%3E%3Cpath d='M5.5 0v11M0 5.5h11' stroke='%23000'"""
    """ stroke-width='1.3'/%3E%3C/svg%3E");
    }
""")
STIL = style_block.replace('</style>', KREUZ + SHOP_CSS + '  </style>', 1)


# ══════════════════════════════════════════════════════════
#  Katalog — alles aus Bildern, die es auf der Website schon gibt
# ══════════════════════════════════════════════════════════
# Die Preise sind Platzhalter in marktueblicher Groessenordnung, damit
# der Entwurf sich echt anfuehlt. Sie muessen vor einer Veroeffentlichung
# durch die Zahlen des Hauses ersetzt werden — die Seite sagt das auch.
TRAURINGE = [
    ('modell-01', 'Wellritz', '6 mm · Bicolor',  890,  'gelb weiss',
     'Gebürstetes Weißgoldband zwischen polierten Gelbgoldkanten.',
     'Trauring in Gelbgold mit gebürstetem Weißgoldband in der Mitte'),
    ('modell-02', 'Carré',    '6 mm · Bicolor',  920,  'gelb weiss',
     'Flache Schiene mit eingelassenem, poliertem Weißgoldfeld.',
     'Flacher Trauring in Gelbgold mit eingelassenem Weißgoldfeld'),
    ('modell-03', 'Saum',     '5 mm · Brillanten', 1090, 'gelb weiss rose',
     'Mattierte Schiene, eine Brillantreihe läuft an einer Kante entlang.',
     'Mattierter Trauring in Gelbgold mit Brillantreihe an einer Kante'),
    ('modell-04', 'Linie',    '5 mm · Weißgold', 780,  'weiss gelb',
     'Seidenmatte Fläche, eine feine Gelbgoldlinie und eine Rille daneben.',
     'Trauring in Weißgold, seidenmatt, mit feiner Gelbgoldlinie'),
    ('modell-05', 'Klar',     '6 mm · Gelbgold', 690,  'gelb weiss rose',
     'Ganz ohne Zutat: hochglanzpoliert und sanft gewölbt.',
     'Schlichter, polierter Trauring in Gelbgold'),
    ('modell-06', 'Kanal',    '5,5 mm · Brillanten', 1240, 'gelb weiss',
     'Brillantreihe in einem Weißgoldkanal, beidseitig mattiertes Gold.',
     'Trauring in Gelbgold mit Brillantreihe in einem Weißgoldkanal'),
    ('modell-07', 'Tafel',    '6,5 mm · Bicolor', 980, 'gelb weiss',
     'Flach und kantig, mit breitem gebürstetem Weißgoldfeld.',
     'Flacher, kantiger Trauring mit breitem gebürstetem Weißgoldfeld'),
    ('modell-08', 'Pavé',     '4,5 mm · Brillanten', 1390, 'gelb weiss rose',
     'Dichte Brillantreihe über die ganze Mitte der Schiene.',
     'Polierter Trauring in Gelbgold mit dichter Pavé-Brillantreihe'),
    ('modell-09', 'Faden',    '5 mm · Gelbgold', 740,  'gelb weiss rose',
     'Sanft gewölbt und seidenmatt, mit einer feinen Weißgoldlinie.',
     'Gewölbter, seidenmatter Trauring in Gelbgold mit feiner Weißgoldlinie'),
    ('modell-10', 'Zart',     '3,5 mm · Brillanten', 850, 'gelb weiss rose',
     'Schmale polierte Schiene, Brillanten an einer Kante.',
     'Schmaler, polierter Trauring in Gelbgold mit Brillanten an einer Kante'),
]

FASSUNGEN = [
    ('solitaer', 'Solitär',  'Vierkrappen · Fassung', 690, 'gelb weiss rose',
     'Der Klassiker: ein Stein, vier Krappen, nichts drumherum.',
     'Verlobungsring mit Solitär in Vierkrappenfassung'),
    ('zarge',    'Zarge',    'Randfassung',           740, 'gelb weiss rose',
     'Der Stein sitzt in einem Ring aus Gold – ruhig und robust.',
     'Verlobungsring mit Stein in einer Zargenfassung'),
    ('twist',    'Twist',    'Gedrehte Schiene',      820, 'gelb weiss rose',
     'Zwei Stränge laufen um den Finger und treffen sich am Stein.',
     'Verlobungsring mit gedrehter Schiene und Solitär'),
    ('trilogie', 'Trilogie', 'Drei Steine',           980, 'gelb weiss rose',
     'Ein größerer Stein in der Mitte, zwei kleinere daneben.',
     'Verlobungsring mit drei Steinen nebeneinander'),
    ('pave',     'Pavé',     'Besetzte Schiene',     1150, 'gelb weiss rose',
     'Die Schiene ist bis zur Hälfte mit Brillanten belegt.',
     'Verlobungsring mit pavébesetzter Schiene'),
]

ARMBAENDER = [
    ('gliederkette', 'Panzer',  '4 mm · Gelbgold', 590, 'gelb weiss rose',
     'Flache Panzerkette mit Karabiner, klassisch und alltagsfest.',
     'Armband aus flacher Panzerkette in Gelbgold mit Karabinerverschluss'),
    ('tennis', 'Tennis', 'Brillantlinie · Weißgold', 1890, 'weiss gelb',
     'Eine durchgehende Linie kleiner Brillanten, beweglich gefasst.',
     'Tennisarmband in Weißgold mit einer durchgehenden Brillantlinie'),
]

KATEGORIEN = [
    ('#trauringe', 'Trauringe',       'assets/trauringe/modell-05.webp',
     'Schlichter polierter Trauring in Gelbgold'),
    ('#verlobung', 'Verlobungsringe', 'assets/fassung/solitaer-weiss.webp',
     'Verlobungsring mit Solitär in Weißgold'),
    ('#trauringe', 'Ketten',          'assets/trauringe/modell-04.webp',
     'Feiner Ring in Weißgold, stellvertretend für Ketten'),
    ('#trauringe', 'Ohrringe',        'assets/trauringe/modell-10.webp',
     'Schmaler Ring mit Brillanten, stellvertretend für Ohrringe'),
    ('#trauringe', 'Armbänder',       'assets/trauringe/modell-09.webp',
     'Gewölbter Ring in Gelbgold, stellvertretend für Armbänder'),
]


def preis(euro):
    return ('%d' % euro).replace(',', '.') if euro < 1000 else \
           ('%d.%03d' % (euro // 1000, euro % 1000))


def masse(pfad):
    """Echte Datei-Masse. Die zehn Trauringe sind unterschiedlich
       freigestellt (356x760 bis 516x747) — mit einer pauschalen Angabe
       rechnet der Browser mit dem falschen Verhaeltnis, und das
       Bildbett bekommt je Karte eine andere Hoehe."""
    from PIL import Image
    with Image.open(os.path.join(DIR, pfad)) as im:
        return im.size


def karte(bild, name, spec, euro, tone, text, alt, zusatz=''):
    punkte = ''.join('<i class="%s"></i>' % t for t in tone.split())
    bw, bh = masse(bild)
    return """        <article class="sh-karte reveal">
          <div class="sh-karte__bett">
            <img src="%s" alt="%s" width="%d" height="%d" loading="lazy" decoding="async">
          </div>
          <h3 class="sh-karte__name"><a class="sh-karte__link" href="shop-produkt.html">%s</a></h3>
          <span class="sh-karte__spec">%s</span>
          <p class="sh-karte__text">%s</p>
          <div class="sh-karte__fuss">
            <span class="sh-preis">ab %s&nbsp;€<small>%s</small></span>
            <span class="sh-tone" aria-label="Erhältlich in %s">%s</span>
          </div>
        </article>""" % (bild, alt, bw, bh, name, spec, text, preis(euro),
                         zusatz or 'pro Ring', tone.replace(' ', ', '), punkte)


tr_karten = '\n\n'.join(
    karte('assets/trauringe/%s.webp' % d[0], d[1], d[2], d[3], d[4], d[5], d[6])
    for d in TRAURINGE)

fa_karten = '\n\n'.join(
    karte('assets/fassung/%s-weiss.webp' % d[0], d[1], d[2], d[3], d[4], d[5], d[6],
          zusatz='Fassung ohne Stein')
    for d in FASSUNGEN)

# Auf der Produktseite drei verwandte Stuecke
dazu = '\n\n'.join(
    karte('assets/trauringe/%s.webp' % d[0], d[1], d[2], d[3], d[4], d[5], d[6])
    for d in (TRAURINGE[1], TRAURINGE[6], TRAURINGE[4]))

ab_karten = '\n\n'.join(
    karte('assets/armband/%s.webp' % d[0], d[1], d[2], d[3], d[4], d[5], d[6],
          zusatz='Beispielbild')
    for d in ARMBAENDER)

kat_kacheln = '\n'.join(
    '        <a href="%s"><img src="%s" alt="%s" width="%d" height="%d" loading="lazy"><b>%s</b></a>'
    % ((h, b, a) + masse(b) + (n,)) for h, n, b, a in KATEGORIEN)


# ══════════════════════════════════════════════════════════
#  Kleines Skript: Auswahlknoepfe und die WhatsApp-Anfrage
# ══════════════════════════════════════════════════════════
SHOP_JS = """
  <script>
  (function () {
    // Auswahlknoepfe: innerhalb einer Reihe ist immer genau einer an.
    document.querySelectorAll('.sh-wahl__reihe').forEach(function (reihe) {
      reihe.addEventListener('click', function (e) {
        var knopf = e.target.closest('.sh-chip');
        if (!knopf || !reihe.contains(knopf)) return;
        reihe.querySelectorAll('.sh-chip').forEach(function (k) { k.classList.remove('is-on'); });
        knopf.classList.add('is-on');
        anfrageBauen();
      });
    });

    // Der Entwurf hat keine Kasse — die Anfrage traegt die Auswahl
    // genauso zusammen, wie es der Warenkorb spaeter taete.
    var knopf = document.getElementById('pAnfrage');
    function wert(id) {
      var an = document.querySelector('#' + id + ' .sh-chip.is-on');
      return an ? an.textContent.trim() : '—';
    }
    function anfrageBauen() {
      if (!knopf) return;
      var t = document.getElementById('pTitel');
      var text = 'Guten Tag, ich interessiere mich fuer den Trauring '
        + (t ? t.textContent.trim() : '') + '.\\n'
        + 'Legierung: ' + wert('pLegierung') + '\\n'
        + 'Breite: ' + wert('pBreite') + '\\n'
        + 'Ringgroesse: ' + wert('pGroesse');
      knopf.href = 'https://wa.me/496115807830?text=' + encodeURIComponent(text);
    }
    anfrageBauen();
  })();
  </script>"""


TEMPLATE = """<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>%(title)s</title>
  <meta name="description" content="%(desc)s">
  <meta name="robots" content="noindex, nofollow">
  <link rel="icon" href="assets/logo-mark.webp" type="image/webp">
%(fonts)s
%(style)s
</head>
<body>
%(skip)s
%(marble)s
%(loader)s
%(nav)s

  <main id="main">
%(body)s
  </main>

%(footer)s
%(script)s
%(shopjs)s
</body>
</html>
"""

SEITEN = [
    dict(slug='shop.html',
         title='Shop (Entwurf) – Juwelier Damla Wiesbaden',
         desc='Entwurf eines Onlineshops für Juwelier Damla: Trauringe und '
              'Verlobungsringe aus eigener Werkstatt, Wellritzstraße 3 in Wiesbaden.',
         body=io.open(os.path.join(DIR, 'shop.body.html'), encoding='utf-8').read()
              % dict(trauringe=tr_karten, fassungen=fa_karten, armband=ab_karten)),

    dict(slug='shop-produkt.html',
         title='Trauring Wellritz (Entwurf) – Juwelier Damla Wiesbaden',
         desc='Trauring Wellritz: Gelbgold mit gebürstetem Weißgoldband. '
              'Entwurf einer Produktseite für Juwelier Damla in Wiesbaden.',
         body=io.open(os.path.join(DIR, 'shop-produkt.body.html'), encoding='utf-8').read()
              % dict(dazu=dazu)),
]

for seite in SEITEN:
    html = TEMPLATE % dict(
        title=seite['title'], desc=seite['desc'], fonts=font_links, style=STIL,
        skip=skip, marble=marble, loader=loader, nav=nav_sub, body=seite['body'],
        footer=footer_sub, script=script, shopjs=SHOP_JS)
    p = os.path.join(DIR, seite['slug'])
    io.open(p, 'w', encoding='utf-8').write(html)
    print('geschrieben: %-22s %4d KB' % (seite['slug'], len(html.encode('utf-8')) / 1024))
