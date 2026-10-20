# Modular Controlled-Substance Agreement — committee presentation

A static, scroll-down presentation of the modular controlled-substance
prescribing agreement builder (NY / NJ; opioids, benzodiazepines, stimulants),
plus a downloadable Word clause library.

- `index.html` — classic scroll-down page; `story.html` — animated version of the same material (each links to the other)
  - pinned "decks": scrolling picks the active step; cards and graphics change with eased transitions, and replay when you scroll back
  - smooth wheel scrolling via [Lenis](https://github.com/darkroomengineering/lenis) 1.3.26, vendored to `assets/vendor/` by the build (MIT)
  - presenter keys: `→` / `PgDn` / `Space` step forward, `←` / `PgUp` step back
  - honours `prefers-reduced-motion`; readable without JavaScript
- `builder.html` — interactive contract builder: pick class, state, indication, SUD history, flags, tier and naloxone; the overview graphic, summary and full agreement text update live (copy, download .txt, shareable link). Linked from both presentations
- `assets/cs-logic.mjs` — the assembly rules (tier suggestion, naloxone logic, clause selection), shared by the build and the builder page
- `assets/style.css` (shared), `assets/story.css` + `assets/story.js` (animated page)
- Both pages carry a fixed QR code linking to their own published URL (set in `build/qr.mjs`)
- `downloads/Controlled-Substance-Agreement-Clause-Library.docx` — every section, explainer, inclusion rule, authority and exact block text
- `data/clause-library.json` — the clause library the builder uses (single source of truth)
- `build/` — generators. `fragments.mjs` holds HTML shared by both pages; `story.mjs` the animated page; `model.mjs` ports the builder's tier-suggestion, naloxone and assembly logic

## Rebuild

```sh
npm install
npm run build   # writes index.html, story.html, builder.html and the .docx
```

## Publish on GitHub Pages

Settings → Pages → Build and deployment → Source: **Deploy from a branch**,
pick the branch holding these files and folder **/ (root)**. `.nojekyll` is
included so files are served as-is.
