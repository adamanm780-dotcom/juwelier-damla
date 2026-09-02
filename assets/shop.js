/* ══════════════════════════════════════════════════════════════
   Shop — Seitenlogik
   ──────────────────────────────────────────────────────────────
   1) Auftakt: ein Ring in 3D, der sich mit dem Scrollen dreht und
      dabei die Legierung wechselt.
   2) Karten: beim Zeigen springt ein gemeinsames 3D-Fenster in die
      Karte und zeigt das Modell als echte Geometrie — ziehen zum Drehen.
   3) Werkstatt: die echte Aufnahme wird mit dem Scrollen durchgeblaettert.
   4) Produktseite: Legierung umschalten am 3D-Ring.
   ══════════════════════════════════════════════════════════════ */

import { Ansicht, ringSpec, webglVerfuegbar } from './shop3d.js';

const reduziert = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const webgl = webglVerfuegbar();
const feinzeiger = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

function spec(el) {
  try { return ringSpec(JSON.parse(el.dataset.spec || '{}')); }
  catch (e) { return ringSpec({}); }
}

function fortschritt(section) {
  const r = section.getBoundingClientRect();
  const weg = section.offsetHeight - window.innerHeight;
  if (weg <= 0) return 0;
  return Math.min(1, Math.max(0, -r.top / weg));
}

/* ── 1) Auftakt ─────────────────────────────────────────────── */
(function auftakt() {
  const sektion = document.getElementById('shAuftakt');
  const buehne = document.getElementById('heroRing');
  if (!sektion || !buehne) return;
  if (!webgl) { sektion.classList.add('ohne-webgl'); return; }

  const ansicht = new Ansicht(buehne, { interaktiv: false, luft: 1.3 });
  ansicht.zeige(spec(buehne));

  const stufen = [...sektion.querySelectorAll('[data-legierung]')];
  let aktiv = -1;

  function setzen() {
    const p = reduziert ? 0 : fortschritt(sektion);
    ansicht.drehung(p);
    const i = Math.min(stufen.length - 1, Math.floor(p * stufen.length * 0.999));
    if (i !== aktiv) {
      aktiv = i;
      stufen.forEach((s, k) => s.classList.toggle('is-aktiv', k === i));
      ansicht.legierung(stufen[i].dataset.legierung);
    }
  }
  let offen = false;
  window.addEventListener('scroll', () => {
    if (offen) return;
    offen = true;
    requestAnimationFrame(() => { offen = false; setzen(); });
  }, { passive: true });
  setzen();
})();

/* ── 2) Karten mit Live-Ansicht ─────────────────────────────── */
(function karten() {
  const betten = [...document.querySelectorAll('.sh-karte[data-spec] .sh-bett')];
  if (!betten.length || !webgl) return;

  // Ein einziges Fenster fuer alle Karten: WebGL-Kontexte sind knapp,
  // und sichtbar ist ohnehin immer nur die Karte unter dem Zeiger.
  const fenster = document.createElement('div');
  fenster.className = 'sh-live';
  fenster.innerHTML = '<span class="sh-live__hinweis">Live · ziehen zum Drehen</span>';
  const ansicht = new Ansicht(fenster, { interaktiv: true, autoRotate: true, luft: 1.45 });
  let aktuell = null;

  function zeigen(bett) {
    if (aktuell === bett) return;
    aktuell = bett;
    bett.appendChild(fenster);
    ansicht.groesse();
    ansicht.zeige(spec(bett.closest('.sh-karte')));
    // Im Dreiviertelblick starten: frontal liest sich eine Steinreihe
    // als gezackter Rand, erst schraeg sieht man, dass sie gefasst ist.
    ansicht.wurzel.rotation.y = -0.55;
    ansicht.wurzel.rotation.x = 0.1;
    bett.classList.add('is-live');
  }
  function verstecken() {
    if (!aktuell) return;
    aktuell.classList.remove('is-live');
    aktuell = null;
  }

  betten.forEach((bett) => {
    if (feinzeiger) {
      bett.addEventListener('mouseenter', () => zeigen(bett));
      bett.addEventListener('mouseleave', verstecken);
    } else {
      // Ohne Maus: antippen schaltet um, ein zweites Tippen laesst den
      // Link der Karte durch.
      bett.addEventListener('click', (e) => {
        if (aktuell === bett) return;
        e.preventDefault();
        zeigen(bett);
      });
    }
  });
})();

/* ── 3) Werkstatt: Aufnahme mit dem Scrollen durchblaettern ── */
(function werkstatt() {
  const sektion = document.getElementById('shWerk');
  const canvas = document.getElementById('werkCanvas');
  if (!sektion || !canvas) return;
  const ctx = canvas.getContext('2d');
  const N = parseInt(canvas.dataset.frames, 10) || 48;
  const SRC = (i) => 'assets/shop/werk/w-' + String(i + 1).padStart(3, '0') + '.webp';
  const bilder = new Array(N);
  const caps = [...sektion.querySelectorAll('.sh-werk__cap')];
  let aktuell = -1;

  const bereit = (i) => bilder[i] && bilder[i].complete && bilder[i].naturalWidth;
  function laden(i, cb) {
    if (bilder[i]) return;
    const im = new Image();
    im.decoding = 'async';
    if (cb) im.onload = cb;
    im.src = SRC(i);
    bilder[i] = im;
  }
  function malen(i) {
    if (!bereit(i)) return;
    ctx.drawImage(bilder[i], 0, 0, canvas.width, canvas.height);
    aktuell = i;
  }

  if (reduziert) { laden(N - 1, () => malen(N - 1)); return; }
  laden(0, () => malen(0));
  const rest = () => { for (let i = 1; i < N; i++) laden(i); };
  if (document.readyState === 'complete') rest();
  else window.addEventListener('load', rest, { once: true });

  function setzen() {
    const p = fortschritt(sektion);
    const idx = Math.min(N - 1, Math.round(p * (N - 1)));
    if (idx !== aktuell) {
      let j = idx;
      while (j >= 0 && !bereit(j)) j--;
      if (j >= 0 && j !== aktuell) malen(j);
    }
    caps.forEach((c) => {
      const von = parseFloat(c.dataset.von), bis = parseFloat(c.dataset.bis);
      c.classList.toggle('is-aktiv', p >= von && p < bis);
    });
  }
  let offen = false;
  window.addEventListener('scroll', () => {
    if (offen) return;
    offen = true;
    requestAnimationFrame(() => { offen = false; setzen(); });
  }, { passive: true });
  setzen();
})();

/* ── 4) Produktseite ────────────────────────────────────────── */
(function produkt() {
  const buehne = document.getElementById('pAnsicht');
  if (!buehne) return;
  const bild = buehne.querySelector('img');

  if (webgl) {
    const ansicht = new Ansicht(buehne, { interaktiv: true, autoRotate: true, luft: 1.4 });
    ansicht.zeige(spec(buehne));
    ansicht.wurzel.rotation.y = -0.55;
    ansicht.wurzel.rotation.x = 0.1;
    if (bild) bild.hidden = true;
    document.querySelectorAll('#pLegierung .sh-chip[data-legierung]').forEach((k) => {
      k.addEventListener('click', () => ansicht.legierung(k.dataset.legierung));
    });
  }

  // Auswahlknoepfe: in jeder Reihe genau einer an
  document.querySelectorAll('.sh-wahl__reihe').forEach((reihe) => {
    reihe.addEventListener('click', (e) => {
      const k = e.target.closest('.sh-chip');
      if (!k || !reihe.contains(k)) return;
      reihe.querySelectorAll('.sh-chip').forEach((x) => x.classList.remove('is-on'));
      k.classList.add('is-on');
      anfrage();
    });
  });

  // Der Entwurf hat keine Kasse: die Anfrage traegt die Auswahl so
  // zusammen, wie es der Warenkorb spaeter taete.
  const knopf = document.getElementById('pAnfrage');
  const wert = (id) => {
    const an = document.querySelector('#' + id + ' .sh-chip.is-on');
    return an ? an.textContent.trim() : '—';
  };
  function anfrage() {
    if (!knopf) return;
    const t = document.getElementById('pTitel');
    const text = 'Guten Tag, ich interessiere mich für den Trauring '
      + (t ? t.textContent.trim() : '') + '.\n'
      + 'Legierung: ' + wert('pLegierung') + '\n'
      + 'Breite: ' + wert('pBreite') + '\n'
      + 'Ringgröße: ' + wert('pGroesse');
    knopf.href = 'https://wa.me/496115807830?text=' + encodeURIComponent(text);
  }
  anfrage();
})();
