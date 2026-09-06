# Damla photo enhancement generation record

Built-in image_gen used, one edit call per source. Original input files unchanged. Output image files copied intact from the tool's generated_images output into this separate asset cache.

## Source to output
- C:/Users/Adria/damla-pages/assets/aussenansicht.jpg → C:/Users/Adria/.cache/damla-design-assets/damla-storefront-enhanced.png
- C:/Users/Adria/damla-pages/assets/laden-innen-2.jpg → C:/Users/Adria/.cache/damla-design-assets/damla-window-perspective-enhanced.png
- C:/Users/Adria/damla-pages/assets/schaufenster.jpg → C:/Users/Adria/.cache/damla-design-assets/damla-display-enhanced.png

## Visual inspection
Storefront: recognizable original facade, sign, open left entrance, two display tiers, two bollards retained. Main sign reads as in source. Cleaner tone, stronger detail. Small merchandise detail is generatively reconstructed and not exact enough for catalog evidence.
Window perspective: source is a shop window exterior with street reflections, not an interior. Macro layout/viewpoint retained. Because the original is only 382x510 pixels, enhanced small jewelry details are reconstructed; never present as exact product evidence.
Display: main bust arrangement, necklace types and bracelet rows remain recognizable, but fine chain, bracelet and tag details change. Useful as an editorial atmosphere image; exact merchandise fidelity is not guaranteed.
Requested aspect ratios were put in prompts but tool outputs do not all match them exactly; no additional raster editing or variants were performed.

## Storefront prompt
Use case: lighting-weather
Asset type: Juwelier Damla website editorial storefront photograph.
Input image: the supplied aussenansicht.jpg is the single edit target, not a loose reference.
Primary request: Enhance this exact real photograph with restrained professional photographic color and exposure correction, cleaner detail and modest sharpening. Output a high-resolution landscape image in 3:2 aspect ratio.
Composition/framing: retain the full existing storefront, left doorway, both display tiers, sign panel and two street bollards. Achieve 3:2 by carefully cropping excess foreground pavement, never by inventing or expanding the scene. Mild lens/perspective correction only, retaining authentic architecture and camera viewpoint.
Lighting/mood: natural editorial daylight, neutral ivory stone with warm gold jewelry and deep espresso-black frames, balanced shadows and highlights, realistic reflective glass.
Text preservation is critical: retain original existing sign and lettering exactly as visible, including stylized SİNA logo and “SİNA”, “PIRLANTA”, “DAMLA”, “JUWELİER” and the existing vertical divider. Preserve their exact layout, letterforms and proportions, including the smaller doorway branding. Do not re-typeset.
Constraints: preserve every existing physical object, the exact number and positions of necklace busts, jewelry, stands, window frames, entrance, pavement and bollards. Keep merchandise faithful at the available resolution. Increase clarity only from existing information.
Avoid: invented jewelry, changed displays, added or removed objects, people, architecture changes, fake text, new logos, watermark, over-sharpening, excessive saturation, exaggerated HDR, synthetic polished rendering.

## Window perspective prompt
Use case: lighting-weather
Asset type: portrait 4:5 editorial website photo for Juwelier Damla.
Input image: supplied laden-innen-2.jpg is the single edit target. It depicts the real shop window seen obliquely from outside, not an interior; preserve the scene.
Primary request: Create a clean high-resolution photographic enhancement of this exact photograph. Output portrait 4:5. Correct exposure and white balance gently, preserve warm gold, ivory velvet stands and deep dark window framing, improve existing detail and sharpness without redesigning the merchandise.
Composition/framing: preserve the same oblique row of necklace busts and jewelry platforms, upper and lower window display, glass reflections of surrounding buildings, black horizontal divider, narrow pavement at right. Use a modest crop of existing pixels for portrait 4:5. No outpainting, no new content.
Lighting/mood: natural premium editorial photography, warm inviting shop illumination balanced against neutral daylight; realistic reflections with only mild glare balancing.
Constraints: keep exact physical display arrangement, number and position of busts, necklaces, rings, bracelets, earrings, trays, window structure and all visible reflected architecture. Preserve all existing branding, labels and lettering as photographed; do not invent legible detail where source resolution does not contain it. Correct mild perspective only if the scene and positions remain faithful.
Avoid: invented jewelry, shifted merchandise, removed or added objects, people, new architecture, replacement lettering, text overlays, fake logos, excessive HDR, oversaturation, oversmoothing, artificial studio scene.

## Display prompt
Use case: lighting-weather
Asset type: portrait 4:5 editorial jewelry display photograph for the real Juwelier Damla website.
Input image: supplied schaufenster.jpg is the sole edit target. Edit the photograph itself with extreme visual fidelity.
Primary request: A restrained, clean, high-resolution editorial enhancement of this exact jewelry display photo. Improve exposure, white balance and subtle sharpness while preserving authentic jewelry and arrangement. Deliver portrait 4:5 by modest crop only, no new content.
Composition/framing: preserve the original diagonal camera angle, all visible necklace busts in their same positions, necklace chains, broad rectangular gold necklace in upper center, bracelets across the foreground, small rings at left, ivory velvet, visible small price labels and dark background. Keep each jewelry design, shape, link pattern and stone placement as captured; do not make up extra detail.
Lighting/mood: balanced natural photographic illumination, subtle warm gold metal, ivory velvet and rich dark background; gentle clarity with recovered highlights, realistic shadows and metal reflections. Preserve original materials and texture.
Constraints: edit only global photographic qualities and minimal perspective/crop. Exact display arrangement and jewelry identity must be maintained. Keep all existing text/labels and branding as photographed, without trying to re-create or invent legible prices or other words. No additions or removals of jewelry, trays, stands or architecture.
Avoid: invented merchandise, changed jewelry designs, new stands, reordered layout, people, text overlay, logo addition, watermarks, artificial render appearance, exaggerated HDR, oversaturation or harsh sharpening.

## Added actual interior enhancement

Source: C:/Users/Adria/damla-pages/assets/laden-innen-1.jpg
Output: C:/Users/Adria/.cache/damla-design-assets/damla-interior-enhanced.png

One built-in imagegen edit call. This is the actual store interior, suitable to replace the duplicate outside-window image in a store gallery. Visual check: original two counters, three framed wall displays, seats, round rug, ceiling lights, floor tiles, entrance and camera perspective remain recognizable and closely aligned with source. Noise is reduced and surfaces clearer. Fine merchandise and tiny sign or paper-notice details are generatively reconstructed, so pixel-exact fidelity and small-letter accuracy are not guaranteed; do not use for product or price verification. Original source untouched.

### Interior prompt
Use case: lighting-weather
Asset type: authentic Juwelier Damla store interior photograph for website gallery.
Input image: laden-innen-1.jpg is the single edit target. Perform conservative photograph restoration only, preserving the real interior.
Primary request: gently reduce visible digital noise and improve modest photographic sharpness and detail in this exact photo, with subtly balanced exposure and white balance. Preserve its original portrait framing, camera position, wide-angle perspective, entire composition and all objects.
Scene invariants: white walls and ceiling with the exact original arrangement of square and round ceiling lights and their reflections; three framed wall displays at left; both white glass jewelry counters meeting in the corner with their bronze bases and illuminated lower edges; wall/window jewelry display shelves at right; the same round dark gray rug on tiled glossy cream floor; the two partially visible cream upholstered chrome stools at left and the same cropped magenta seating at image edges; right-side entrance and dark mat. Keep furniture dimensions, placement, floor tile lines, light reflections and all visible fittings exactly as photographed.
Text invariants: preserve the black upper display fascia and repeated existing script “Juwelier Damla” and diamond icons with the exact original placement and styling. Preserve the paper notice and any small labels as existing photographed shapes; do not invent words, prices or legible detail.
Merchandise invariants: retain the existing visible arrangement of stands and jewelry without changing or inventing pieces. Where original product detail is soft, keep it naturally soft rather than reconstructing designs.
Treatment: subtle natural editorial correction, ivory whites, restrained warm gold, neutral shadows, no overprocessing. Keep realistic original ceiling light intensity.
Avoid: changes to perspective, new architecture, shifted counters or chairs, changed rug shape, removed or added objects, invented jewelry, fake text, changed logo lettering, new people, text overlay, watermark, oversharpening, HDR, dramatic recoloring, CGI look.

