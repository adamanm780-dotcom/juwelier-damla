/* Vitrine im Shop: Filter nach Metall und Form, Detailansicht mit drei
   Ansichten, Blaettern per Pfeil/Tastatur und eine vorbereitete
   WhatsApp-Anfrage. Daten kommen aus #vitrineDaten (gebaut aus vitrine.json). */
(function () {
  const raster = document.getElementById('vtRaster');
  const datenEl = document.getElementById('vitrineDaten');
  const dialog = document.getElementById('vtDialog');
  if (!raster || !datenEl || !dialog) return;

  const daten = JSON.parse(datenEl.textContent);
  const karten = [...raster.querySelectorAll('.vt-karte')];
  const leer = document.getElementById('vtLeer');
  const wahl = { metall: 'alle', form: 'alle' };

  // ── Filter ───────────────────────────────────────────
  document.querySelectorAll('.vt-filter__reihe').forEach((reihe) => {
    const art = reihe.dataset.filter;
    reihe.addEventListener('click', (e) => {
      const k = e.target.closest('.sh-chip');
      if (!k) return;
      reihe.querySelectorAll('.sh-chip').forEach((x) => {
        x.classList.toggle('is-on', x === k);
        x.setAttribute('aria-pressed', x === k ? 'true' : 'false');
      });
      wahl[art] = k.dataset.wert;
      let n = 0;
      karten.forEach((karte) => {
        const passt = (wahl.metall === 'alle' || karte.dataset.metall === wahl.metall) &&
                      (wahl.form === 'alle' || karte.dataset.form === wahl.form);
        karte.hidden = !passt;
        if (passt) { n++; karte.style.animation = 'none'; void karte.offsetWidth; karte.style.animation = ''; }
      });
      if (leer) leer.hidden = n > 0;
    });
  });

  // ── Detailansicht ────────────────────────────────────
  const bild = document.getElementById('vtdBild');
  const daumen = document.getElementById('vtdDaumen');
  const nrEl = document.getElementById('vtdNr');
  const titelEl = document.getElementById('vtdTitel');
  const preisEl = document.getElementById('vtdPreis');
  const datenListe = document.getElementById('vtdDaten');
  const wa = document.getElementById('vtdWa');
  const ANSICHTEN = [['a', 'von vorn'], ['b', 'schräg links'], ['c', 'schräg rechts']];
  let aktuell = -1;

  function quelle(nr, k, klein) {
    return 'assets/vitrine/ring-' + nr + '-' + k + (klein ? '-s' : '') + '.webp';
  }

  function zeigeAnsicht(nr, k, titel) {
    bild.classList.add('is-wechsel');
    const neu = new Image();
    neu.onload = neu.onerror = () => {
      bild.src = neu.src;
      bild.classList.remove('is-wechsel');
    };
    neu.src = quelle(nr, k);
    bild.alt = 'Ring Nº ' + nr + ', ' + titel + ', ' + ANSICHTEN.find((a) => a[0] === k)[1];
    daumen.querySelectorAll('button').forEach((b) => b.classList.toggle('is-on', b.dataset.k === k));
  }

  function sichtbare() {
    return karten.filter((k) => !k.hidden).map((k) => karten.indexOf(k));
  }

  function oeffne(i) {
    const r = daten[i];
    aktuell = i;
    nrEl.textContent = 'Aus der Vitrine · Nº ' + r.nr + ' · Einzelstück';
    titelEl.textContent = r.titel;
    preisEl.innerHTML = r.preis;
    preisEl.classList.toggle('is-anfrage', !r.hatPreis);
    datenListe.innerHTML = r.zeilen.map((z) => '<dt>' + z[0] + '</dt><dd>' + z[1] + '</dd>').join('');
    daumen.innerHTML = ANSICHTEN.map((a) =>
      '<button type="button" data-k="' + a[0] + '" aria-label="Ansicht ' + a[1] + '">' +
      '<img src="' + quelle(r.nr, a[0], true) + '" alt="" width="58" height="58"></button>').join('');
    zeigeAnsicht(r.nr, 'a', r.titel);
    const text = 'Hallo Juwelier Damla, ich interessiere mich für den Ring Nº ' + r.nr +
      ' aus der Vitrine (' + r.titel + ', Etikett ' + r.kennung + '). Ist er noch verfügbar?';
    wa.href = 'https://wa.me/496115807830?text=' + encodeURIComponent(text);
    if (!dialog.open) {
      dialog.showModal();
      document.documentElement.classList.add('vt-offen');
    }
  }

  function blaettere(schritt) {
    const liste = sichtbare();
    const pos = liste.indexOf(aktuell);
    if (!liste.length) return;
    oeffne(liste[(pos + schritt + liste.length) % liste.length]);
  }

  raster.addEventListener('click', (e) => {
    const bett = e.target.closest('.vt-bett');
    if (bett) oeffne(karten.indexOf(bett.closest('.vt-karte')));
  });

  daumen.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-k]');
    if (b) zeigeAnsicht(daten[aktuell].nr, b.dataset.k, daten[aktuell].titel);
  });

  dialog.addEventListener('click', (e) => {
    const was = e.target.closest('[data-vt]');
    if (was) {
      if (was.dataset.vt === 'zu') dialog.close();
      else blaettere(was.dataset.vt === 'vor' ? 1 : -1);
      return;
    }
    if (e.target === dialog) dialog.close();   // Klick auf den Hintergrund
  });

  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') blaettere(1);
    if (e.key === 'ArrowLeft') blaettere(-1);
  });

  // Wischen auf dem Bild blaettert ebenfalls
  let startX = null;
  bild.parentElement.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
  bild.parentElement.addEventListener('touchend', (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) blaettere(dx < 0 ? 1 : -1);
    startX = null;
  });

  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('vt-offen');
    const karte = karten[aktuell];
    if (karte) karte.querySelector('.vt-bett').focus({ preventScroll: true });
  });
})();
