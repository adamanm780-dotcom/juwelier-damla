# Blender wedding ring quality ? 21 September 2026

The public configurator uses the editable Blender meshes in `tools/damla-jewelry.blend`, rebuilt by `tools/build-jewelry.py`. The browser loads the actual `assets/models/jewelry.glb`, not a still image.

## Geometry
- Five continuous ring profiles, mathematically tangent-matched rounded shoulders, comfort-fit interior and analytical normals. The former angle-limited bevel modifier was replaced to avoid clamping/distorted edges.
- 320 circumferential segments; maximum circumference chord error below 0.000516 mm. Flach/bombiert/oval/konkav each 31,360 vertices; kantig 37,760 vertices.
- Seam-safe cylindrical U / profile arc-length V. Exported duplicate seam vertices retain identical normals.
- Materials partition one continuous body into colored zones. Outer surface follows the selected finish; interior and edge faces stay polished.
- Grooves transform both positions and normals; stone heights and cross-section diagrams derive from actual Blender mesh contours.

## Light and surface
- Original scene-linear 2048 ? 1024 HDR studio authored in Blender/Cycles, `tools/wedding-studio.blend`; generator `tools/build-wedding-studio.py`. No third-party reference assets copied.
- Neutral tone mapping, warm alloy colors, broad light cards and narrow gray reflection cards. PMREM for metals, unblurred cube environment for gemstone facet reflections/refraction.
- Deterministic micro-normal / roughness maps, directional anisotropy for brushed surfaces; polished inner surfaces. Diamond shader material reused across option changes.
- Supersampled antialiasing; actual mesh bounds used to place both rings on the studio floor. Existing shared links, ring coupling and rotating zoom remain supported.

## Validation
- Blender topology: 10 meshes manifold, no degenerate faces/edges; five closed, non-self-intersecting torus profiles, correct dimensions and smooth normals.
- GLB seam normals match exactly.
- Three.js: five profiles ? 27 size/width/thickness combinations = 135 checked combinations. All three diamonds have valid convex facets and both baskets remain present.
- Material-zone test: three two-metal layouts on all five profiles, triangle counts preserved, four material groups (two finishes + two polished interiors), surface sampling and symmetry valid.
- Browser: Blender HDR loaded, WebGL shaders without errors; bicolor, grooves, engraving, alternate profiles and maximum width/thickness work. No overflow at 390 ? 844, 844 ? 390 or 3440 ? 1440. Other configurator still loads.

## Reference comparison
The Schwarz reference is visible through its closed shadow DOM and was compared by rendered screenshots. Earlier plain DOM inspection had misleadingly returned an empty loader. This revision follows its bright cream-gold studio look, rounded edges and standing tilted product arrangement; complete option/catalog equivalence is not claimed. Browser rendering is an interactive approximation, not a Cycles path-traced manufacturing proof.
