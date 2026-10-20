# Modular Controlled-Substance Agreement — committee presentation

A static, scroll-down presentation of the modular controlled-substance
prescribing agreement builder (NY / NJ; opioids, benzodiazepines, stimulants),
plus a downloadable Word clause library.

- `index.html` — classic scroll-down page; `story.html` — animated, scroll-driven version of the same material (each links to the other)
- `assets/style.css` (shared), `assets/story.css` (animation layer; honours reduced-motion)
- Both pages carry a fixed QR code linking to their own published URL (set in `build/qr.mjs`)
- `downloads/Controlled-Substance-Agreement-Clause-Library.docx` — every section, explainer, inclusion rule, authority and exact block text
- `data/clause-library.json` — the clause library the builder uses (single source of truth)
- `build/` — generators. `fragments.mjs` holds HTML shared by both pages; `story.mjs` the animated page; `model.mjs` ports the builder's tier-suggestion, naloxone and assembly logic

## Rebuild

```sh
npm install
npm run build   # writes index.html, story.html and the .docx
```

## Publish on GitHub Pages

Settings → Pages → Build and deployment → Source: **Deploy from a branch**,
pick the branch holding these files and folder **/ (root)**. `.nojekyll` is
included so files are served as-is.
