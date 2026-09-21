# Wedding configurator implementation

The public option inventory was audited on 2026-09-21 against https://konfigurator.schwarz-trauringe.de/. The Damla implementation uses original code, Blender meshes, shader materials, studio lighting and preview renders; no reference mesh, image, font or shader asset is included.

## Catalog and rendering

- 13 PB profiles, 203 profile/width rows with the observed discrete height choices.
- 9 metals, 13 finishes, 18 standard divisions plus automatic adjustable-material Memoire bands.
- 15 setting choices including no stones, 5 cuts, 10 qualities; 227 observed profile/height setting states and the captured size/quality contexts.
- 7 groove choices including no groove, edge steps, separation grooves, individual segment materials.
- Inner laser/diamond engraving, 41 original motif choices, handwriting/upload and placement editor.
- Pair and individual ring edits, undo, portable URL/file storage, browser-local named drafts, print summary and image export.

The profile/gem sources are the .blend files in tools. Rebuild with Blender --background --python tools/build-wedding-profiles.py, tools/build-wedding-gems.py and tools/build-wedding-studio-v3.py. Browser geometry preserves measured ring dimensions and adds original machining geometry for grooves, channels and closed tension openings. The 13 finish JPGs depict the same viewer materials.

## Validation and remaining limits

Checked: all 203 profile/width height lists; 406 geometric dimension boundaries; 12 material interaction cases and both-way grade synchronization; captured normal-setting size states; convex gem facets; closed tension cuts with and without grooves; pair edits, motif export/reload, shared URLs, local save/load, undo, and mobile controls.

This is an independent configurator, not an integration with the manufacturer's backend. Unobserved cross-combinations use the documented physical fit rules in wedding-state.js. In particular, not every width/height/setting combination or narrow two-sided Memoire repair has been audited. Reference server IDs, live manufacturer quotes, jeweler lookup and GravurKreator app sessions are not reproduced. Prices are explicitly nonbinding local estimates. Engraving font families use available system fonts and consistent fallbacks; licensed reference font files are not bundled. Final production feasibility and price require Damla confirmation.

Preserve .openai/hosting.json and the existing deployment audience. The public-release checkout must not publish unrelated private shop work.
