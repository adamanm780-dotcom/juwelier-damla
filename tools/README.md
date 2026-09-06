# Damla ring atelier

The production site remains on GitHub Pages. `.openai/hosting.json` identifies the separate private Sites review deployment. `tools/build-static.py` stages that private site's public files and adjusts its canonical metadata; it does not modify the GitHub Pages source URLs.

## Build

```powershell
python build-index.py
python build-subpages.py
python check.py
node tools/check-config.mjs
node --experimental-loader ./tools/node-loader.mjs tools/check-models.mjs
python tools/build-static.py
```

## Blender assets

`damla-jewelry.blend` contains five band profiles, round/oval brilliant cuts, an emerald step cut, and four/six-prong baskets. Rebuild with Blender 5.1:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.1\blender.exe' --background --python tools/build-jewelry.py
& 'C:\Program Files\Blender Foundation\Blender 5.1\blender.exe' --background tools/damla-jewelry.blend --python tools/check-jewelry.py
```

The second command validates manifold topology and convex, planar gemstone facets, then renders an inspection image using Cycles. This is an asset check; it does not represent a browser render. Browser visual/interaction QA has not been performed.

`assets/models/jewelry.glb` uses millimetre-scale geometry. Runtime radial deformation preserves the specified inner circumference independently of width and thickness, with inverse-Jacobian normals. Gemstone geometry remains flat shaded and uses actual facet-plane intersection, five internal reflection bounces and three refractive indices for subtle dispersion. This is a real-time approximation, not an optical or manufacturing simulation.

The linked configuration is validated before use. Engagement price and availability require a consultation; wedding price assumptions are preserved from the existing project. Inquiry buttons prepare a message only after the visitor chooses that action.

The pre-existing, untracked `assets/katalog/` directory is unrelated and excluded from the private build.
