// Animated version of the presentation (story.html). Same material as
// index.html, told through pinned "decks": scrolling chooses the active step,
// and each step's card and stage change with eased, time-based transitions
// (so stepwise mouse wheels don't drag the cards). Client code: assets/story.js.

import {
  DOCX, esc, paras, tokenize, LIB, SECTIONS, CLAUSES, byId, CLAUSE_TITLES, CONTROLS, controlForClause,
  PATIENTS, assembled, tierLogic, TIER_LABEL, segmentsHtml, SEGMENTS, coreHtml, govHtml, refsHtml, combos, fixedCount,
} from './fragments.mjs';
import { assemble } from './model.mjs';
import { qrWidget, QR_SCRIPT, PAGES_URL } from './qr.mjs';

const STORY_URL = `${PAGES_URL}story.html`;
const ctl = Object.fromEntries(CONTROLS.map((c) => [c.key, c]));
const months = LIB.next_review_offset_months;
const pad2 = (n) => String(n).padStart(2, '0');
const optPills = (opts) => `<div class="opts">${opts.map((o) => `<span>${esc(o)}</span>`).join('')}</div>`;
const chipList = (ids) => `<ul class="chiplist">${ids.map((id) => `<li style="--c:${controlForClause[id]?.color ?? 'var(--fixed)'}">${esc(CLAUSE_TITLES[id])}</li>`).join('')}</ul>`;

// ─── Hero: a document that re-assembles itself for different patients ──
const HERO_CONFIGS = [
  { label: 'Stimulant · New York · Standard', inputs: { substance_class: 'stimulant', state: 'NY' } },
  { label: 'Patient A · Opioid · New York', inputs: PATIENTS[0].inputs },
  { label: 'Benzodiazepine · New Jersey · Inherited', inputs: { substance_class: 'benzo', state: 'NJ', indication_status: 'inherited-presumptive', driving_or_safety_sensitive: true } },
  { label: 'Patient B · Multi-class · New Jersey', inputs: PATIENTS[1].inputs },
].map((c) => {
  const a = assemble({ ...PATIENTS[0].inputs, age_65_plus: false, ...c.inputs });
  return { ...c, a };
});

function heroDoc() {
  let idx = 0;
  const secs = SECTIONS.map((s, si) => `<div class="psec"><span class="psh">${si + 1}</span>${s.clauses.map((c) => {
    const words = c.text.split(/\s+/).length;
    const lines = Math.max(1, Math.min(3, Math.ceil(words / 32)));
    const inCfg = HERO_CONFIGS.map((cfg, k) => (cfg.a.included.has(c.clause_id) ? k : null)).filter((k) => k !== null).join(' ');
    const color = controlForClause[c.clause_id]?.color;
    return `<div class="pb${color ? ' mod' : ''}" data-in="${inCfg}" style="--lines:${lines};--d:${idx++};${color ? `--c:${color}` : ''}"></div>`;
  }).join('')}</div>`).join('');
  const caps = HERO_CONFIGS.map((cfg, k) => `<div class="cap" data-k="${k}"><b>${esc(cfg.label)}</b><span class="tierpill t-${cfg.a.inp.risk_tier}">${TIER_LABEL[cfg.a.inp.risk_tier]}</span><code>${cfg.a.trigger}</code><small>${cfg.a.included.size} of ${CLAUSES.length} blocks</small></div>`).join('');
  return `<div class="herodoc" data-cfg="1" aria-hidden="true">
  <div class="paper"><div class="ptitle"><i></i><i></i></div>${secs}</div>
  <div class="caps">${caps}</div>
</div>`;
}
// One rule per configuration: blocks not in it collapse.
const heroCss = HERO_CONFIGS.map((_, k) => `.herodoc[data-cfg="${k}"] .pb:not([data-in~="${k}"]){height:0;margin-bottom:0;opacity:0}.herodoc[data-cfg="${k}"] .cap[data-k="${k}"]{opacity:1;transform:none}`).join('');

// ─── Shared deck builder ───────────────────────────────────────────────
// steps: [{ title, body, color?, hl? }]. Stage elements opt in with
// data-from="n" (on from step n), data-at="n m" (current at those steps).
function deck(id, stage, steps, { stageClass = '' } = {}) {
  const n = steps.length;
  const cards = steps.map((s, i) => `<article class="scard" data-i="${i}"${s.hl ? ` data-hl="${s.hl}"` : ''} style="--c:${s.color ?? 'var(--accent)'}">
    <span class="sn">${pad2(i + 1)} <em>/ ${pad2(n)}</em></span>
    <h3>${s.title}</h3>
    ${s.body}
  </article>`).join('');
  return `<div class="scrolly" id="${id}" data-n="${n}">
  <div class="pin"><div class="wrap pinwrap">
    <div class="deck">
      <ol class="rail" aria-hidden="true">${steps.map(() => '<li></li>').join('')}</ol>
      <div class="cards">${cards}</div>
      <div class="deckhint" aria-hidden="true">Scroll to continue <span>↓</span></div>
    </div>
    <div class="stage ${stageClass}" data-step="0"><div class="stage-fit">${stage}</div></div>
  </div></div>
</div>`;
}

const chapter = ({ id, num, kicker, title, lede = '', cls = '', before = '', after = '' }) => `<section id="${id}" class="chapter ${cls}">
  <div class="wrap"><header class="chead reveal"><span class="cnum">${num}</span><p class="kicker">${kicker}</p><h2>${title}</h2>${lede ? `<p class="lede">${lede}</p>` : ''}</header></div>
  ${before}
  ${after}
</section>`;

// ─── 01 The problem ────────────────────────────────────────────────────
const problemStage = `<div class="pstage">
  <div class="ptiles">
    <div class="ptile" data-from="1" data-at="1"><b>2</b><span>states</span><div class="pills"><span>NY · I-STOP</span><span>NJ · PMP</span></div></div>
    <div class="ptile" data-from="2" data-at="2"><b>3</b><span>drug classes</span><div class="pills"><span>Opioids</span><span>Benzos</span><span>Stimulants</span></div></div>
    <div class="ptile" data-from="3" data-at="3"><b>∞</b><span>risk profiles</span><div class="spectrum"><span>Low</span><i></i><span>High</span></div></div>
  </div>
  <div class="pvs">
    <div class="vcard low" data-from="4" data-at="4"><div class="plabel">Patient A</div><p>82 · back pain · ½ tramadol occasionally · NY</p></div>
    <div class="vsmark" data-from="5">≠</div>
    <div class="vcard high" data-from="5" data-at="5"><div class="plabel">Patient B</div><p>44 · pain + anxiety + ADHD · past SUD · early fills · NJ</p></div>
  </div>
  <div class="pq" data-from="6" data-at="6">One contract?</div>
</div>`;
const problemSteps = [
  { title: 'Two states', body: '<p>New York and New Jersey impose different PDMP duties — New York before <em>every</em> Schedule II–IV prescription, New Jersey at the first visit and quarterly.</p>' },
  { title: 'Three drug classes', body: '<p>Opioids, benzodiazepines and ADHD stimulants each carry different risks — and some patients take all three.</p>' },
  { title: 'A wide risk spectrum', body: '<p>Age, SUD history, concurrent controlled substances and PDMP findings vary enormously across a panel.</p>' },
  { title: 'Patient A', color: 'var(--std)', body: `<p>${esc(PATIENTS[0].sketch)}</p>` },
  { title: 'Patient B', color: 'var(--hr)', body: `<p>${esc(PATIENTS[1].sketch)}</p>` },
  { title: 'Should they sign the same contract?', body: '<p>A single one-size document is too heavy for Patient A — eroding trust — or too light for Patient B. Separate documents for every combination are unmaintainable.</p>' },
];

// ─── 02 The blocks and the controls ────────────────────────────────────
const blocksStage = `<div class="rows">
${SECTIONS.map((s, i) => `<div class="row">
  <div class="rowh"><span class="secnum">${i + 1}</span><span class="rowt">${esc(s.title)}</span></div>
  <div class="rchips">${s.clauses.map((c) => {
    const k = controlForClause[c.clause_id];
    return `<span class="blk" data-tags="${k ? k.key : 'fixed'}" style="--c:${k?.color ?? 'var(--fixed)'}">${esc(CLAUSE_TITLES[c.clause_id])}</span>`;
  }).join('')}</div>
</div>`).join('')}
  <div class="legend" data-from="13">${CONTROLS.filter((c) => c.clauses.length).map((c) => `<span style="--c:${c.color}">${esc(c.name)}</span>`).join('')}<span style="--c:var(--fixed)">Always present</span></div>
  <div class="overlay classpanel" data-at="4" style="--c:${ctl.class.color}">
    <p class="ovk">Substance class changes the wording — not which blocks appear</p>
    <p class="ovq">“I agree to obtain <span class="cycle"><span>opioid</span><span>benzodiazepine</span><span>stimulant</span><span>controlled substance</span></span> prescriptions from a single prescriber…”</p>
    <p class="ovs">SmartPhrase <code>.CSAGREE-<span class="cycle"><span>OPT</span><span>BNZ</span><span>STM</span><span>MULTI</span></span>-NY-STD</code></p>
    <p class="ovn">Opioid-involving classes (opioid, multi-class) also feed the naloxone suggestion.</p>
  </div>
</div>`;
const ctlStep = (key) => {
  const c = ctl[key];
  return { hl: key, color: c.color, title: c.name, body: `${optPills(c.options)}<p>${esc(c.blurb)}</p>${chipList(c.clauses)}` };
};
const blockSteps = [
  { hl: 'none', title: 'Five sections, every time', body: `<p>Every agreement uses the same five sections, drawn from one library of <b>${CLAUSES.length}</b> referenced text blocks.</p>` },
  { hl: 'fixed', title: `${fixedCount} blocks every patient signs`, body: '<p>Scope and clinical discretion, the core patient obligations, functional assessment, non-punitive monitoring with a graduated response, and the acknowledgment.</p>' },
  ctlStep('state'),
  { hl: 'class', color: ctl.class.color, title: 'Substance class', body: `${optPills(ctl.class.options)}<p>Adds and removes nothing. It fills in the drug-class wording wherever the agreement names it, sets the SmartPhrase code, and tells the builder whether naloxone logic applies.</p>` },
  ctlStep('indication'), ctlStep('tier'), ctlStep('sud'), ctlStep('combo'), ctlStep('age'), ctlStep('driving'), ctlStep('naloxone'),
  { hl: 'tier', color: ctl.tierInputs.color, title: 'Other risk inputs', body: `${optPills(ctl.tierInputs.options)}<p>These add no text of their own. They move the <b>risk tier</b> — and the tier swaps the highlighted blocks.</p>` },
  { hl: 'all', title: `${CLAUSES.length - fixedCount} modular blocks · ${combos} combinations`, body: `<p>The prescriber sets ${CONTROLS.length} controls; the builder assembles one agreement — and names it with a SmartPhrase such as <code>.CSAGREE-OPT-NY-STD</code>.</p>` },
];

// ─── 03 The risk tier ──────────────────────────────────────────────────
const tierStage = `<div class="cascade">
  <div class="gate t-high-risk" data-from="1" data-at="1">
    <div class="q"><span class="qn">1</span>Any high-risk trigger?</div><div class="yes">yes →</div>
    <div class="tbox"><b>High-risk</b><ul><li>Drug screen every visit</li><li>Pill counts</li><li>Specialist involvement</li><li>Reassess every visit</li></ul><span class="rev">Review ${months['high-risk']} mo</span></div>
  </div>
  <div class="no" data-from="2">no ↓</div>
  <div class="gate t-enhanced" data-from="2" data-at="2">
    <div class="q"><span class="qn">2</span>Any enhanced trigger?</div><div class="yes">yes →</div>
    <div class="tbox"><b>Enhanced</b><ul><li>Drug screen ~ every 3 mo</li><li>Pill counts</li><li>Reassess every 6 mo</li></ul><span class="rev">Review ${months.enhanced} mo</span></div>
  </div>
  <div class="no" data-from="3">no ↓</div>
  <div class="gate t-standard" data-from="3" data-at="3">
    <div class="q"><span class="qn">3</span>Otherwise</div><div class="yes">→</div>
    <div class="tbox"><b>Standard</b><ul><li>Drug screen every 6–12 mo</li><li>Reassess annually</li></ul><span class="rev">Review ${months.standard} mo</span></div>
  </div>
  <div class="override" data-from="3" data-at="3">✎ The prescriber sees the reasons and confirms or overrides — overrides are flagged</div>
  <div class="nalrow" data-from="4" data-at="4"><b>Naloxone</b><span>opioid + benzo</span><em>or</em><span>opioid-involving class + (dose ≥ threshold or SUD)</span><i>→ offered</i></div>
</div>`;
const li = (items) => `<ul class="tlist">${items.map((t) => `<li>${t}</li>`).join('')}</ul>`;
const tierSteps = [
  { title: 'First: any high-risk trigger?', color: 'var(--hr)', body: li(['Active SUD without specialist involvement', 'Opioid + benzodiazepine', 'Cross-class concurrent controlled substances', 'Prior lost-medication report', 'No indication at a dose ≥ threshold']) },
  { title: 'Otherwise: any enhanced trigger?', color: 'var(--enh)', body: li(['Past or active SUD without specialist', 'Early-fill history', 'Dose ≥ threshold', 'Age ≥ 65', 'Inherited / presumptive indication', 'Same-class concurrent CS']) },
  { title: 'Otherwise: Standard — and the prescriber decides', color: 'var(--std)', body: '<p>The tier is a <b>suggestion with its reasons shown</b>, never a verdict. The prescriber confirms or overrides it, and overrides are flagged.</p>' },
  { title: 'Naloxone is suggested the same way', color: ctl.naloxone.color, body: '<p>Offered automatically for any opioid + benzodiazepine combination, or for an opioid-involving class with a dose at or above threshold or any SUD history. The prescriber can override it either way.</p>' },
];

// ─── 04 Two patients ───────────────────────────────────────────────────
const [A, B] = assembled;
function pcard(p, other, from, focusAt, markExtra) {
  const a = p.a;
  let idx = 0;
  const cells = SECTIONS.map((s) => `<div class="sgrp" style="flex:${s.clauses.length}">${s.clauses.map((c) => {
    const inc = a.included.has(c.clause_id);
    const cls = [inc ? 'inc' : '', inc && byId[c.clause_id].condition ? 'mod' : '', markExtra && inc && !other.a.included.has(c.clause_id) ? 'extra' : ''].join(' ').trim();
    return `<i class="${cls}" style="--c:${controlForClause[c.clause_id]?.color ?? 'var(--fixed)'};--i:${idx++}" title="${esc(CLAUSE_TITLES[c.clause_id])}"></i>`;
  }).join('')}</div>`).join('');
  return `<div class="pcard" data-from="${from}" data-at="${focusAt}">
  <div class="pchead"><span class="plabel">${esc(p.label)}</span><span class="tierpill t-${a.inp.risk_tier}">${TIER_LABEL[a.inp.risk_tier]}</span></div>
  <dl class="facts">
    <div><dt>Blocks</dt><dd><span data-count="${a.included.size}">0</span><small> / ${CLAUSES.length}</small></dd></div>
    <div><dt>Words</dt><dd><span data-count="${a.words}">0</span></dd></div>
    <div><dt>Review</dt><dd><span data-count="${a.reviewMonths}">0</span><small> mo</small></dd></div>
    <div><dt>Naloxone</dt><dd>${a.inp.naloxone_indicated ? 'Yes' : 'No'}</dd></div>
  </dl>
  <div class="strip big">${cells}</div>
  <code class="trig">${a.trigger}</code>
</div>`;
}
const patientStage = `<div class="patstage">${pcard(A, B, 1, '2', false)}${pcard(B, A, 3, '4', true)}<p class="stagecap" data-from="5">Outlined: blocks Patient B's agreement adds</p></div>`;
const modIds = (p) => [...p.a.included].filter((id) => byId[id].condition);
const chips = (p) => `<div class="chips">${p.settings.map((s) => `<span>${esc(s)}</span>`).join('')}</div>`;
const patientSteps = [
  { title: 'Patient A', color: 'var(--std)', body: `<p>${esc(A.sketch)}</p>${chips(A)}` },
  { title: `Patient A → ${TIER_LABEL[A.a.inp.risk_tier]}`, color: 'var(--enh)', body: `<p>Suggested because: ${esc(A.a.suggestion.reasons.join('; ') || 'no elevated-risk inputs')}. Modular blocks:</p>${chipList(modIds(A))}<p class="small">For occasional low-dose tramadol the prescriber can override to Standard — screening every 6–12 months, no pill counts, 12-month review. The override is flagged.</p>` },
  { title: 'Patient B', color: 'var(--hr)', body: `<p>${esc(B.sketch)}</p>${chips(B)}` },
  { title: `Patient B → ${TIER_LABEL[B.a.inp.risk_tier]}`, color: 'var(--hr)', body: `<p>Suggested because: ${esc(B.a.suggestion.reasons.join('; '))}. Modular blocks:</p>${chipList(modIds(B))}` },
  { title: 'Same builder, different agreements', body: `<p>Patient A signs ${A.a.included.size} blocks; Patient B signs ${B.a.included.size}. B's agreement adds visit-level screening, specialist involvement, naloxone, SUD-aware formulation language, combination-risk and driving counseling — and a ${B.a.reviewMonths}-month review instead of ${A.a.reviewMonths}.</p>` },
];
const fullAgreement = (p) => `<details class="reveal"><summary>Read ${esc(p.label)}'s assembled agreement</summary><div class="fulltext" data-lenis-prevent>${p.a.sections.map((s, i) => `<h5>SECTION ${i + 1} — ${esc(s.title.toUpperCase())}</h5>${s.clauses.map((c) => `<div class="pc" style="--c:${controlForClause[c.clause_id]?.color ?? 'transparent'}">${paras(tokenize(esc(c.rendered)))}</div>`).join('')}`).join('')}</div></details>`;

// ─── 05 onward: reveal-on-scroll content ───────────────────────────────
const revealify = (html) => html
  .replace(/<article class="clause/g, '<article class="reveal clause')
  .replace(/<div class="absent/g, '<div class="reveal absent')
  .replace(/<div class="tablewrap/g, '<div class="reveal tablewrap')
  .replace(/<p class="lede">/g, '<p class="lede reveal">')
  .replace(/<div class="seghead">/g, '<div class="seghead reveal-u">');
const storySegments = revealify(segmentsHtml.replace(`<h4 class="subh">How the tier is suggested</h4>${tierLogic}`, '<p class="note reveal">How the tier is suggested is walked through in <a href="#tier">chapter 03</a>.</p>'));
const segIndex = `<nav class="segindex reveal" aria-label="Segments">${SEGMENTS.map(([id, name, color], i) => `<a href="#${id}" style="--c:${color}"><b>${pad2(i + 1)}</b>${esc(name)}</a>`).join('')}</nav>`;

export function storyHtml() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Modular CS Agreement — Animated</title>
<meta name="description" content="Animated, scroll-driven walkthrough of a single regional controlled-substance agreement assembled from modular, referenced clause blocks.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,500;8..60,600;8..60,700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/style.css">
<link rel="stylesheet" href="assets/vendor/lenis.css">
<link rel="stylesheet" href="assets/story.css">
<style>${heroCss}</style>
<script>document.documentElement.classList.add('js');</script>
</head>
<body class="story">
<nav class="topnav"><div class="navin">
  <a href="#top" class="brand">CS Agreement Builder</a>
  <a href="#problem">Problem</a><a href="#blocks">Blocks</a><a href="#tier">Risk tier</a><a href="#patients">Two patients</a><a href="#segments">Segments</a><a href="#core">Core text</a><a href="#governance">Governance</a><a href="#references">References</a>
  <a href="builder.html" class="alt-link">Contract builder</a>
  <a href="index.html" class="alt-link">← Classic version</a>
  <a href="${DOCX}" class="dl" download>Word doc ↓</a>
</div><div class="progress"><i></i></div></nav>
${qrWidget(STORY_URL)}

<header class="hero shero" id="top"><div class="wrap herogrid">
  <div class="herotext">
    <p class="eyebrow">QI / Controlled Substances Committee</p>
    <h1><span class="ln">One agreement.</span><span class="ln">Every patient.</span></h1>
    <p class="sub">A modular controlled-substance prescribing agreement for New York and New Jersey — opioids, benzodiazepines and stimulants — that scales to each patient's actual risk.</p>
    <div class="ctarow"><a class="cta" href="${DOCX}" download>Download the clause library (Word)</a><a class="cta ghost" href="builder.html">Open the contract builder →</a><a class="cta ghost" href="index.html">View the classic version</a></div>
    <p class="keyhint">Scroll to advance — or use <kbd>→</kbd> / <kbd>PgDn</kbd> to step through, <kbd>←</kbd> / <kbd>PgUp</kbd> to go back.</p>
  </div>
  ${heroDoc()}
</div>
<a class="scrollcue" href="#problem" aria-label="Scroll to begin">Scroll<span>↓</span></a>
</header>

<main>
${chapter({ id: 'problem', num: '01', kicker: 'The problem', title: 'One region. One document. Very different patients.', before: deck('problem-deck', problemStage, problemSteps) })}

${chapter({ id: 'blocks', num: '02', kicker: 'The answer', title: 'One document, assembled from referenced blocks', lede: 'Each control the prescriber sets switches specific blocks in or out. Watch the blocks light up as each control is introduced.', cls: 'alt', before: deck('blocks-deck', blocksStage, blockSteps, { stageClass: 'stage-blocks' }) })}

${chapter({ id: 'tier', num: '03', kicker: 'The risk tier', title: 'How the risk tier is suggested', lede: 'Three questions, asked in order. The answer sets drug-screen frequency, pill counts, reassessment, specialist involvement and the review date.', cls: 'tierch', before: deck('tier-deck', tierStage, tierSteps) })}

${chapter({ id: 'patients', num: '04', kicker: 'Same builder, two patients', title: 'The agreement each patient actually signs', lede: `Each strip is all ${CLAUSES.length} blocks in contract order. Lit blocks are included.`, cls: 'alt', before: deck('patients-deck', patientStage, patientSteps), after: `<div class="wrap"><div class="cols2 fullagreements">${fullAgreement(A)}${fullAgreement(B)}</div></div>` })}

${chapter({ id: 'segments', num: '05', kicker: 'Segment by segment', title: 'Each control, each option, the exact text', lede: 'Text appears exactly as the builder inserts it. <span class="tok">[BRACKETED]</span> fields are completed at signing. <mark class="diff">Highlighted</mark> words differ between options. Small numbered tags link to the references.', after: `<div class="wrap">${segIndex}${storySegments}</div>` })}

${chapter({ id: 'core', num: '06', kicker: 'The common core', title: `The ${fixedCount} blocks every patient signs`, cls: 'alt', after: `<div class="wrap">${revealify(coreHtml)}</div>` })}

${chapter({ id: 'governance', num: '07', kicker: 'Governance', title: 'Safeguards built into the design', after: `<div class="wrap reveal">${govHtml}</div>` })}

${chapter({ id: 'references', num: '08', kicker: 'References', title: 'Cited authorities', lede: 'The authorities each block cites. Links are given where a stable public source exists.', cls: 'alt', after: `<div class="wrap">${refsHtml}</div>` })}

<section id="download" class="chapter"><div class="wrap center reveal dlbox">
  <h2>Take it with you</h2>
  <p class="lede">The Word document contains every section with a short explainer, the inclusion rule for each block, and its exact text and authority.</p>
  <a class="cta" href="${DOCX}" download>Download the clause library (.docx)</a>
  <p><a href="builder.html">Or build an agreement live in the contract builder →</a></p>
  <p class="foot">Clause library v${LIB.schema_version} · Scope: New York and New Jersey · <a href="index.html">Classic version</a></p>
</div></section>
</main>
<script src="assets/vendor/lenis.min.js"></script>
<script src="assets/story.js"></script>
${QR_SCRIPT}
</body>
</html>
`;
}
