# Juwelier Damla – bestätigte Designvorlieben

Stand: 6. September 2026. Diese direkte Rückmeldung des Nutzers hat Vorrang vor früheren Designannahmen.

- Die komplette Hauptseite vor dem Redesign `e71bfd4` gefiel dem Nutzer besser. Referenz: `b75f7fd`. Den ursprünglichen Video-Einstieg mit großem Logo, die separate Einleitung, das scrollgesteuerte Schmuckkästchen, die Bogenformen, Goldakzente und die bisherigen Abschnittslayouts erhalten. Nicht erneut durch einen geteilten Text/Bild-Hero mit flachen Karten ersetzen.
- Große, bildbetonte Scroll-Präsentationen sind ausdrücklich erwünscht. Die horizontale Verlobungsring-Sektion erhalten, statt alle drei Modelle in ein statisches Raster zu stellen.
- Die Faltbilder auf der Trauringseite sollen deutlich größer sein und die Bildschirmbreite nutzen. Besonders bei 3440 × 1440 prüfen. Ringe vollständig zeigen, Faltbewegung erhalten und auf dem Handy gut lesbar darstellen.
- Präzisierung: Die Trauringbilder müssen in jedem Bildschirmformat falten, ausdrücklich auch auf Handys und im Querformat. Hohe Karten erst vollständig durchscrollen lassen, bevor sie anhaften. Keine statische mobile Ersatzansicht.
- „Drei Schliffe“: Alle drei Ringe vollständig einpassen, ohne Abschneiden bei verschiedenen Seitenverhältnissen. Die dekorativen römischen Zahlen I/II/III hinter den Ringen entfernen. Text muss in Karten und Bedienelementen vollständig Platz finden, auch bei vergrößerter Schrift.
- In beiden Konfiguratoren soll die automatische Drehung während des Zoomens weiterlaufen. Mausrad, Touch-Zoom und Plus/Minus dürfen die gewählte Drehung nicht abschalten.
- Bei echten 3D-Ringen zählt die Materialqualität: warmes, überzeugendes Gold, weiche Studioreflexe und erkennbare Metalltiefe. Dunkles Braun mit harten weißen Flecken vermeiden. Die vorhandenen Blender-Geometrien weiterverwenden.
- Das Innenraumfoto mit den Stühlen darf nirgendwo auf der Website erscheinen. Ausgeschlossene Dateien: `assets/laden-innen-1.jpg`, `assets/editorial/interior.webp`, `assets/editorial/interior-640.webp`. Auch keine neuen Zuschnitte oder KI-Varianten dieses Motivs verwenden. Eine Sicherung liegt außerhalb des Projekts unter `.cache/damla-excluded-photos`.
- Gewünscht ist ein eigens gestaltetes Kontaktformular, passend zum Schmuckauftritt. Aktuell ist ausdrücklich noch keine Empfänger-E-Mail vorhanden; sie folgt später. Bis dahin bereitet das Formular den Text zum Kopieren vor und meldet keinen Versand. Später echte Zustellung anschließen und verifizieren.

## Projekt und Pflege

Aktives Projekt: `C:\Users\Adria\damla-pages`. Öffentlich: https://adamanm780-dotcom.github.io/juwelier-damla/ . Das andere Vercel-Projekt nicht bearbeiten.

Build-Reihenfolge: `python build-index.py`, `python build-subpages.py`, `python build-shop.py`, `python check.py`. Generierte HTML-Seiten nicht direkt bearbeiten. Die Hauptseite verwendet die ursprünglichen Inline-Stile plus `contact.css`; `site-design.css` gestaltet die Unterseiten. Das Kontaktformular liegt in `contact.body.html` und `assets/contact-form.js`.

`assets/katalog/` ist bestehende, unabhängige Arbeit; nicht beiläufig hinzufügen, verändern oder veröffentlichen. Für die private Sites-Vorschau existiert `.openai/hosting.json`; keine neue Site anlegen.

Die ältere projektübergreifende Memory liegt in `C:\Users\Adria\.claude\projects\C--Users-Adria\memory\project_juwelier_damla.md`. Dort ist als Instagram-Profil `https://www.instagram.com/juwelierdamla_wi/` hinterlegt; vor neuer Bildrecherche diese Quelle berücksichtigen.

## Ergänzung vom 22. September 2026

- Korrektur: Nur das echte Original-Logo verwenden. Das generierte `assets/logo-gold-clean.png` wurde abgelehnt, weil es das JD verändert. In Hero und Kontaktbereich die unveränderte Kontur von `assets/logo-mark.webp` per CSS-Alpha-Maske gold färben. Buchstaben, Schriftzug, Kreisbögen und Proportionen exakt erhalten; nicht generativ neu zeichnen. Keine hellen Freistellungsränder.
- In den drei Kollektionenkarten stehen die Trauringe groß in der Mitte, Schmuck links und Verlobungsringe rechts.

## Ergänzung vom 29. September 2026 – fotorealistische 3D-Ringe

Auftrag: 3D-Ringe in den Konfiguratoren „ultra realistisch“. Beide Konfiguratoren nutzen jetzt dasselbe System:
- `assets/ring-studio.js`: prozedurales Fotostudio auf der GPU (Softboxen + weiche Abschatter, `METAL_STUDIO`), eigenes kontrastreiches `DIAMOND_STUDIO` (an die Kamera gekoppelt wie ein Drehteller, Objektiv-Abschatter vorne) und die Kamera-Tonkurve `applyCameraResponse`. Die Blender-HDRs `models/wedding-studio*.hdr` werden nicht mehr geladen.
- `assets/ring-optics.js`: gemessene Legierungsfarben (F0) je Metall und Feingehalt, F82-Kantenfresnel (Weißmetalle dunkler am Rand), analytische Zweitreflexion in der Ringbohrung (nur innerhalb des Bohrungszylinders).
- `assets/contact-shadow.js`: zweistufige Kontaktschatten (scharfe Auflagelinie + weicher Schatten), beim Schwenken nur jedes 4. Bild neu.
- Diamant-Shader (`jewelry-studio.js`): ein Strahlengang, Dispersion nur beim Austritt, 2-fach-Supersampling; kein RGB-Rauschen.
- Einpassung (`wedding-viewer.js` `fit`/`fitDistanceFor`): exakt über alle Ringpunkte inkl. Schwenkbewegung, pro Ansicht; nichts wird abgeschnitten (geprüft: 6 Viewports × 4 Ansichten × Ruhe/Schwenk-Extreme).
- Materialzonen werden pro Viereck bestimmt (sonst Sägezahn an Kanten), Texturwiederholungen ganzzahlig (sonst Naht).
- Tonwert-Leitplanken für Gelbgold 585 in der Standardansicht: dunkle Pixel (L<0,30) ca. 5 %, keine ausgebrannten Stellen. Nicht deutlich dunkler machen (Nutzerwunsch: kein dominantes Braun).
- Achtung Build: `trauringe.html`, `verlobungsringe.html`, `reparaturen.html` haben Template-Drift aus der Logo-Session (index.html-Styles). Ein kompletter `build-subpages.py`-Lauf ändert diese Seiten mit; vorher prüfen.
