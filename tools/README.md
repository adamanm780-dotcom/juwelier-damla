# Damla ring atelier

The production site remains on GitHub Pages. `.openai/hosting.json` identifies the separate private Sites review deployment. `tools/build-static.py` stages that private site's public files and adjusts its canonical metadata; it does not modify the GitHub Pages source URLs.

## Build

```powershell
python build-index.py
python build-subpages.py
python check.py
node --experimental-loader ./tools/node-loader.mjs tools/check-config.mjs
node --experimental-loader ./tools/node-loader.mjs tools/check-models.mjs
python tools/build-static.py
```

## Blender assets

`damla-jewelry.blend` contains five band profiles, round/oval brilliant cuts, an emerald step cut, and four/six-prong baskets. Rebuild with Blender 5.1:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.1\blender.exe' --background --python tools/build-jewelry.py
& 'C:\Program Files\Blender Foundation\Blender 5.1\blender.exe' --background tools/damla-jewelry.blend --python tools/check-jewelry.py
```

The second command validates manifold topology and convex, planar gemstone facets, then renders an inspection image using Cycles. This is an asset check; it does not represent a browser render. Both configurators have also been checked in Chromium with rendered WebGL models and changes to metal, profile, setting and cut.

`assets/models/jewelry.glb` uses millimetre-scale geometry. Runtime radial deformation preserves the specified inner circumference independently of width and thickness, with inverse-Jacobian normals. Gemstone geometry remains flat shaded and uses actual facet-plane intersection, five internal reflection bounces and three refractive indices for subtle dispersion. This is a real-time approximation, not an optical or manufacturing simulation.

The linked configuration is validated before use. Engagement price and availability require a consultation; wedding price assumptions are preserved from the existing project. Inquiry buttons prepare a message only after the visitor chooses that action.

The pre-existing, untracked `assets/katalog/` directory is unrelated and excluded from the private build.

## Site design and photography

Read `../MEMORY.md` before design work. The user prefers the original homepage: its video hero, opening text and scroll-driven jewelry box are restored in `build-index.py`. The homepage uses its original inline styling with the new `contact.css`; `site-design.css` applies to subpages. `trauringe.body.html` contains large sticky image cards, enhanced by `assets/site-design.js`. The engagement models use the restored horizontal scroll sequence with native horizontal scrolling on mobile and for reduced motion.

`assets/editorial/` contains three AI-edited photographs of the shop and two generated editorial ring images, plus responsive WebP sizes. The chair/interior photograph has been removed at the user's request; do not reintroduce it. Sources and image-generation prompts are recorded in `generation-notes.md`, `ring-generation-notes.md` and the asset manifest. Small merchandise details in enhanced photographs are not inventory references. These assets are not Instagram downloads. The older project memory identifies `juwelierdamla_wi` for future Instagram research.

The bespoke contact form is in `contact.body.html`, `contact.css` and `assets/contact-form.js`. The user has no recipient email yet. It validates and prepares an inquiry for copying, sends no requests and makes no delivery claim. It retains no submitted data in browser storage. Wire and verify actual delivery once the user supplies a recipient and delivery service.

The redesign was visually checked at 390, 1440 and 3440 pixels. All ten pages were checked in Chromium for loading images, script errors and mobile overflow. The mobile navigation and both ring configurators were exercised. The existing business identity/contact placeholders in the imprint still require verified information from the owner.
