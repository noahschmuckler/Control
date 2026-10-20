# Modular Controlled-Substance Agreement — committee presentation

A static, scroll-down presentation of the modular controlled-substance
prescribing agreement builder (NY / NJ; opioids, benzodiazepines, stimulants),
plus a downloadable Word clause library.

- `index.html`, `assets/style.css` — the page (generated; no runtime JS)
- `downloads/Controlled-Substance-Agreement-Clause-Library.docx` — every section, explainer, inclusion rule, authority and exact block text
- `data/clause-library.json` — the clause library the builder uses (single source of truth)
- `build/` — generators. `model.mjs` ports the builder's tier-suggestion, naloxone and assembly logic

## Rebuild

```sh
node build/build-page.mjs
node build/build-docx.mjs   # needs the `docx` npm package
```

## Publish on GitHub Pages

Settings → Pages → Build and deployment → Source: **Deploy from a branch**,
pick the branch holding these files and folder **/ (root)**. `.nojekyll` is
included so files are served as-is.
