// Generates index.html (classic scroll) and story.html (animated scroll)
// from the clause library. Run: node build/build-page.mjs

import { writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  DOCX, esc, PATIENTS, CLAUSES, CONTROLS, anatomy, controlCards, assembled, patientCard,
  segmentsHtml, coreHtml, fixedCount, govHtml, refsHtml, combos, VERSION_STAMP,
} from './fragments.mjs';
import { qrWidget, QR_SCRIPT, PAGES_URL } from './qr.mjs';
import { storyHtml } from './story.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Vendored smooth-scroll library for the animated page (MIT, see LENIS-LICENSE.txt).
const vendor = join(root, 'assets', 'vendor');
mkdirSync(vendor, { recursive: true });
for (const [from, to] of [['dist/lenis.min.js', 'lenis.min.js'], ['dist/lenis.css', 'lenis.css'], ['LICENSE', 'LENIS-LICENSE.txt']]) {
  copyFileSync(join(root, 'node_modules', 'lenis', from), join(vendor, to));
}

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Modular Controlled-Substance Agreement</title>
<meta name="description" content="A single regional controlled-substance agreement assembled from modular, referenced clause blocks — NY and NJ, opioids, benzodiazepines and stimulants, scaled to patient risk.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,500;8..60,600;8..60,700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/style.css">
</head>
<body>
<nav class="topnav"><div class="navin">
  <a href="#top" class="brand">CS Agreement Builder</a>
  <a href="#problem">Problem</a><a href="#blocks">Blocks</a><a href="#controls">Controls</a><a href="#patients">Two patients</a><a href="#segments">Segments</a><a href="#core">Core text</a><a href="#governance">Governance</a><a href="#references">References</a>
  <a href="story.html" class="alt-link">Animated version →</a>
  <a href="${DOCX}" class="dl" download>Word doc ↓</a>
</div></nav>
${qrWidget(PAGES_URL)}

<header class="hero" id="top"><div class="wrap">
  <p class="eyebrow">QI / Controlled Substances Committee</p>
  <h1>One agreement.<br>Every patient.</h1>
  <p class="sub">A modular controlled-substance prescribing agreement for New York and New Jersey — opioids, benzodiazepines and stimulants — that scales to each patient's actual risk.</p>
  <div class="herostats">
    <div><b>${CLAUSES.length}</b><span>referenced text blocks</span></div>
    <div><b>${CONTROLS.length}</b><span>controls</span></div>
    <div><b>${combos}</b><span>distinct clause combinations</span></div>
    <div><b>1</b><span>document</span></div>
  </div>
  <div class="ctarow"><a class="cta" href="${DOCX}" download>Download the clause library (Word)</a><a class="cta ghost" href="story.html">View the animated version →</a></div>
</div></header>

<main>
<section id="problem" class="band"><div class="wrap">
  <p class="kicker">The problem</p>
  <h2>How can one regional contract fit two states, three drug classes, and patients at opposite ends of the risk spectrum?</h2>
  <div class="dims">
    <div class="dim"><h3>2 states</h3><p>New York and New Jersey impose different PDMP duties — before every prescription versus first visit and quarterly.</p><div class="pills"><span>NY · I-STOP</span><span>NJ · PMP</span></div></div>
    <div class="dim"><h3>3 drug classes</h3><p>Opioids, benzodiazepines and ADHD stimulants carry different risks — and some patients take all three.</p><div class="pills"><span>Opioids</span><span>Benzodiazepines</span><span>Stimulants</span></div></div>
    <div class="dim"><h3>A wide risk spectrum</h3><p>Age, SUD history, concurrent controlled substances and PDMP findings vary enormously across a panel.</p><div class="spectrum"><span>Low</span><i></i><span>High</span></div></div>
  </div>
  <div class="vs">
    <div class="vcard low"><div class="plabel">Patient A</div><p>${esc(PATIENTS[0].sketch)}</p></div>
    <div class="vsmark">≠</div>
    <div class="vcard high"><div class="plabel">Patient B</div><p>${esc(PATIENTS[1].sketch)}</p></div>
  </div>
  <p class="bigq">These two patients should not sign the same contract. A single one-size document is either too heavy for Patient A — eroding trust and adherence — or too light for Patient B. Separate documents for every combination are unmaintainable.</p>
</div></section>

<section id="blocks" class="band alt"><div class="wrap">
  <p class="kicker">The answer</p>
  <h2>One document, assembled from referenced blocks</h2>
  <p class="lede">Every agreement has the same five sections. ${fixedCount} blocks appear in every agreement. The remaining ${CLAUSES.length - fixedCount} are switched in by the controls the prescriber sets — each colour below is one control.</p>
  ${anatomy}
</div></section>

<section id="controls" class="band"><div class="wrap">
  <p class="kicker">The controls</p>
  <h2>What the prescriber sets — and what each setting brings in</h2>
  <div class="ctlgrid">${controlCards}</div>
</div></section>

<section id="patients" class="band alt"><div class="wrap">
  <p class="kicker">Same builder, two patients</p>
  <h2>The agreement each patient actually signs</h2>
  <p class="lede">Each strip below is all ${CLAUSES.length} blocks in contract order, grouped by section. Lit blocks are included.</p>
  <div class="patients">${assembled.map(patientCard).join('')}</div>
  <p class="note">Patient A's tier is suggested as Enhanced solely because of age ≥ 65. For an older patient on occasional low-dose tramadol, the prescriber can override to Standard — screening relaxes to every 6–12 months, pill counts drop out, and review moves to 12 months. The override is flagged.</p>
</div></section>

<section id="segments" class="band"><div class="wrap">
  <p class="kicker">Segment by segment</p>
  <h2>Each control, each option, the exact text</h2>
  <p class="lede">Text appears exactly as the builder inserts it. <span class="tok">[BRACKETED]</span> fields are completed at signing. <mark class="diff">Highlighted</mark> words differ between options. Small numbered tags link to the references.</p>
  ${segmentsHtml}
</div></section>

<section id="core" class="band alt"><div class="wrap">
  <p class="kicker">The common core</p>
  <h2>The ${fixedCount} blocks every patient signs</h2>
  ${coreHtml}
</div></section>

<section id="governance" class="band"><div class="wrap">
  <p class="kicker">Governance</p>
  <h2>Safeguards built into the design</h2>
  ${govHtml}
</div></section>

<section id="references" class="band alt"><div class="wrap">
  <p class="kicker">References</p>
  <h2>Cited authorities</h2>
  <p class="lede">The authorities each block cites. Links are given where a stable public source exists.</p>
  ${refsHtml}
</div></section>

<section id="download" class="band"><div class="wrap center">
  <h2>Take it with you</h2>
  <p class="lede">The Word document contains every section with a short explainer, the inclusion rule for each block, and its exact text and authority.</p>
  <a class="cta" href="${DOCX}" download>Download the clause library (.docx)</a>
  <p class="foot">Clause library ${esc(VERSION_STAMP)} · Scope: New York and New Jersey</p>
</div></section>
</main>
${QR_SCRIPT}
</body>
</html>
`;

writeFileSync(join(root, 'index.html'), html);
writeFileSync(join(root, 'story.html'), storyHtml());
console.log(`index.html + story.html written — patients: ${assembled.map((p) => `${p.label} ${p.a.inp.risk_tier} ${p.a.included.size} blocks ${p.a.words} words ${p.a.trigger}`).join(' | ')}`);
