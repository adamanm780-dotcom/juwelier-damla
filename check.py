# -*- coding: utf-8 -*-
"""Prueft die generierten Seiten: Tag-Balance, JSON-LD, JS-Syntax, Links, Assets."""
import io, os, re, json, subprocess, sys

DIR = os.path.dirname(os.path.abspath(__file__))
VOID = set('area base br col embed hr img input link meta param source track wbr'.split())
PAGES = ['index.html', 'verlobungsringe.html', 'reparaturen.html',
         'impressum.html', 'datenschutz.html']
ok = True


def fail(m):
    global ok
    ok = False
    print('  FEHLER: ' + m)


for name in PAGES:
    path = os.path.join(DIR, name)
    if not os.path.exists(path):
        fail('Datei fehlt: ' + name)
        continue
    src = io.open(path, encoding='utf-8').read()
    print('\n== %s ==' % name)

    body = re.sub(r'<script\b.*?</script>', '', src, flags=re.S)
    body = re.sub(r'<style\b.*?</style>', '', body, flags=re.S)
    body = re.sub(r'<svg\b.*?</svg>', '', body, flags=re.S)
    body = re.sub(r'<!--.*?-->', '', body, flags=re.S)

    stack = []
    for m in re.finditer(r'<(/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>', body):
        closing, tag, attrs = m.group(1), m.group(2).lower(), m.group(3)
        if tag in VOID or attrs.rstrip().endswith('/') or tag == '!doctype':
            continue
        if closing:
            if not stack:
                fail('</%s> ohne Gegenstueck' % tag); break
            top = stack.pop()
            if top != tag:
                fail('Mismatch: <%s> geschlossen von </%s>' % (top, tag)); break
        else:
            stack.append(tag)
    if stack:
        fail('nicht geschlossen: ' + ', '.join(stack))
    else:
        print('  Tag-Balance ok')

    for i, b in enumerate(re.findall(r'<script type="application/ld\+json">(.*?)</script>', src, re.S)):
        try:
            print('  JSON-LD %d ok (@type=%s)' % (i + 1, json.loads(b).get('@type')))
        except ValueError as e:
            fail('JSON-LD %d ungueltig: %s' % (i + 1, e))

    for i, js in enumerate(re.findall(r'<script>(.*?)</script>', src, re.S)):
        tmp = os.path.join(DIR, '_c%d.js' % i)
        io.open(tmp, 'w', encoding='utf-8').write(js)
        # ohne shell=True: mit Shell wuerde nur `node` ohne Argumente starten
        # (die Liste landet in $0/$1) — das haengt an der REPL statt zu pruefen.
        p = subprocess.Popen(['node', '--check', tmp], stdout=subprocess.PIPE,
                             stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL)
        out = p.communicate()[0].decode('utf-8', 'replace')
        os.remove(tmp)
        if p.returncode == 0:
            print('  JS-Block %d ok' % (i + 1))
        else:
            fail('JS-Block %d: %s' % (i + 1, out.strip()[:300]))

    for href in sorted(set(re.findall(r'href="([^"#:]+\.html)(?:#[^"]*)?"', src))):
        if not os.path.exists(os.path.join(DIR, href)):
            fail('toter Link: ' + href)
    for a in sorted(set(re.findall(r'(?:src|href)="(assets/[^"]+)"', src))):
        if not os.path.exists(os.path.join(DIR, a)):
            fail('fehlendes Asset: ' + a)
    print('  Links + Assets geprueft')

    nav = re.search(r'<ul class="nav__links".*?</ul>', src, re.S)
    if nav:
        n = len(re.findall(r'<li>', nav.group(0)))
        act = len(re.findall(r'is-active', nav.group(0)))
        print('  Nav: %d Punkte, %d aktiv' % (n, act))
        if n != 8:
            fail('Nav hat %d statt 8 Punkte' % n)

print('\n' + ('ALLES OK' if ok else 'FEHLER GEFUNDEN'))
sys.exit(0 if ok else 1)
