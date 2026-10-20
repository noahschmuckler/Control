// Interactive contract builder (builder.html): a plain form version of the
// original builder. Assembly runs in the browser with the same rules the
// presentation uses (assets/cs-logic.mjs); client code is assets/builder.js.

import {
  DOCX, esc, clauseCard, refsHtml, LIB, SECTIONS, CLAUSES, CLAUSE_TITLES, CONTROLS, controlForClause, PATIENTS,
} from './fragments.mjs';
import { qrWidget, QR_SCRIPT, PAGES_URL } from './qr.mjs';

const ctl = Object.fromEntries(CONTROLS.map((c) => [c.key, c]));

// Embedded data for the client: the clause library plus display metadata.
const data = {
  lib: LIB,
  titles: CLAUSE_TITLES,
  tags: Object.fromEntries(CLAUSES.map((c) => {
    const k = controlForClause[c.clause_id];
    return [c.clause_id, k ? { name: k.name, color: k.color } : { name: 'Always included', color: null }];
  })),
  presets: {
    a: PATIENTS[0].inputs,
    b: PATIENTS[1].inputs,
    reset: {
      substance_class: 'opioid', state: 'NY', sud_history: 'none', concurrent_cs: 'none', indication_status: 'established',
      combo_opioid_benzo: false, age_65_plus: false, dose_above_threshold: false, early_fill_history: false,
      driving_or_safety_sensitive: false, prior_lost_medication: false, specialist_involved: false, tier_override: null, naloxone_override: null,
    },
  },
};

// ─── Form controls ─────────────────────────────────────────────────────
const group = (key, label, name, options, hint = '') => `<div class="cg" role="group" aria-labelledby="g-${name}" style="--c:${ctl[key].color}">
  <div class="cgl" id="g-${name}"><i></i>${esc(label)}</div>
  <div class="opts-r">${options.map(([value, text]) => `<label><input type="radio" name="${name}" value="${value}"><span>${esc(text)}</span></label>`).join('')}</div>
  ${hint}
</div>`;
const flag = (key, name, text) => `<label class="flag" style="--c:${ctl[key].color}"><input type="checkbox" name="${name}"><span>${esc(text)}</span></label>`;

const form = `<form id="cb-form" class="panel" autocomplete="off">
  <div class="presets"><span>Start from</span><button type="button" data-preset="a">Patient A</button><button type="button" data-preset="b">Patient B</button><button type="button" data-preset="reset">Blank</button></div>
  ${group('class', 'Substance class', 'substance_class', [['opioid', 'Opioid'], ['benzo', 'Benzodiazepine'], ['stimulant', 'Stimulant'], ['multi-class', 'Multi-class']])}
  ${group('state', 'State', 'state', [['NY', 'New York'], ['NJ', 'New Jersey']])}
  ${group('indication', 'Indication status', 'indication_status', [['established', 'Established'], ['inherited-presumptive', 'Inherited'], ['none-pending-assessment', 'None / pending']])}
  ${group('sud', 'SUD history', 'sud_history', [['none', 'None'], ['past', 'Past'], ['active', 'Active']])}
  ${group('tierInputs', 'Concurrent controlled substance', 'concurrent_cs', [['none', 'None'], ['same-class', 'Same class'], ['cross-class', 'Cross class']])}
  <div class="cg flags" role="group" aria-labelledby="g-flags"><div class="cgl" id="g-flags">Situational flags</div><div class="flagset">
    ${flag('combo', 'combo_opioid_benzo', 'Opioid + benzo')}
    ${flag('age', 'age_65_plus', 'Age ≥ 65')}
    ${flag('driving', 'driving_or_safety_sensitive', 'Driving / safety-sensitive')}
    ${flag('tierInputs', 'dose_above_threshold', 'Dose ≥ threshold')}
    ${flag('tierInputs', 'early_fill_history', 'Early-fill history')}
    ${flag('tierInputs', 'prior_lost_medication', 'Prior lost meds')}
    ${flag('tierInputs', 'specialist_involved', 'Specialist involved')}
  </div></div>
  ${group('tier', 'Risk tier', 'tier', [['auto', 'Suggested'], ['standard', 'Standard'], ['enhanced', 'Enhanced'], ['high-risk', 'High-risk']], '<p class="why" id="tier-why"></p>')}
  ${group('naloxone', 'Naloxone', 'naloxone', [['auto', 'Suggested'], ['yes', 'Offered'], ['no', 'Not offered']], '<p class="why" id="nal-why"></p>')}
</form>`;

// ─── Abstract graphic: every block, lit when included ──────────────────
const graphic = `<div class="bgraphic" aria-label="Which of the ${CLAUSES.length} blocks this agreement includes">
${SECTIONS.map((s, i) => `<div class="row">
  <div class="rowh"><span class="secnum">${i + 1}</span><span class="rowt">${esc(s.title)}</span></div>
  <div class="rchips">${s.clauses.map((c) => {
    const k = controlForClause[c.clause_id];
    return `<a class="blk${k ? ' mod' : ''}" href="#c-${c.clause_id}" data-id="${c.clause_id}" style="--c:${k?.color ?? 'var(--fixed)'}" title="${esc(k ? k.name : 'Always included')}">${esc(CLAUSE_TITLES[c.clause_id])}</a>`;
  }).join('')}</div>
</div>`).join('')}
  <div class="legend">${CONTROLS.filter((c) => c.clauses.length).map((c) => `<span style="--c:${c.color}">${esc(c.name)}</span>`).join('')}<span style="--c:var(--fixed)">Always included</span></div>
</div>`;

const summary = `<div class="summary">
  <div class="tile tier-tile"><span>Risk tier</span><b id="s-tier">—</b><small id="s-tier-src"></small></div>
  <div class="tile"><span>Blocks</span><b><em id="s-blocks">0</em><small> / ${CLAUSES.length}</small></b><small id="s-prop"></small></div>
  <div class="tile"><span>Words</span><b id="s-words">0</b></div>
  <div class="tile"><span>Next review</span><b><em id="s-review">0</em><small> months</small></b><small id="s-date"></small></div>
  <div class="tile"><span>Naloxone</span><b id="s-nal">—</b></div>
  <div class="tile wide"><span>SmartPhrase</span><code id="s-trigger"></code><small id="s-flags"></small></div>
</div>`;

// Full text: every clause is pre-rendered; the client shows the included ones.
const doc = SECTIONS.map((s, i) => `<section class="dsec"><h3><span class="secnum">${i + 1}</span>Section ${i + 1} — ${esc(s.title)}</h3>
${s.clauses.map((c) => clauseCard(c, { compact: true }).replace('<article class="clause', `<article id="c-${c.clause_id}" data-id="${c.clause_id}" class="clause`)).join('')}
</section>`).join('');

export function builderHtml() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>CS Contract Builder</title>
<meta name="description" content="Assemble a controlled-substance prescribing agreement for NY or NJ from modular, referenced clause blocks; the agreement updates live as you change the selections.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,500;8..60,600;8..60,700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/style.css">
<link rel="stylesheet" href="assets/builder.css">
</head>
<body class="builder">
<nav class="topnav"><div class="navin">
  <a href="#top" class="brand">CS Agreement Builder</a>
  <a href="#graphic">Overview</a><a href="#agreement">Agreement text</a><a href="#references">References</a>
  <a href="index.html" class="alt-link">Classic presentation</a>
  <a href="story.html" class="alt-link">Animated presentation</a>
  <a href="${DOCX}" class="dl" download>Word doc ↓</a>
</div></nav>
${qrWidget(`${PAGES_URL}builder.html`)}

<header class="bhead" id="top"><div class="wrap">
  <p class="eyebrow">Contract builder · New York / New Jersey</p>
  <h1>Build an agreement</h1>
  <p class="sub">Set the patient's situation on the left. The agreement re-assembles as you go — the overview shows which blocks are in, and the full text below is ready to copy. Colours match the presentation.</p>
</div></header>

<main class="wrap bmain">
  ${form}
  <div class="out">
    ${summary}
    <section id="graphic" class="card"><div class="cardh"><h2>Overview</h2><p>Lit blocks are in this agreement. Select one to jump to its text.</p></div>${graphic}</section>
    <section id="agreement" class="card">
      <div class="cardh"><h2>Agreement text</h2>
        <div class="tools">
          <label class="showx"><input type="checkbox" id="show-excluded"> Show excluded blocks</label>
          <button type="button" id="copy-link" class="tbtn">Copy link to this setup</button>
          <button type="button" id="dl-txt" class="tbtn">Download .txt</button>
          <button type="button" id="copy-text" class="tbtn primary">Copy agreement text</button>
        </div>
      </div>
      <p class="note">Bracketed fields such as <span class="tok">[MEDICATION]</span> are SmartPhrase fill-ins completed at signing. Each block is tagged with the control that brought it in.</p>
      <div class="doc">${doc}</div>
    </section>
  </div>
</main>

<section id="references" class="band alt"><div class="wrap">
  <p class="kicker">References</p>
  <h2>Cited authorities</h2>
  ${refsHtml}
  <p class="foot">Clause library v${LIB.schema_version} · Scope: New York and New Jersey · <a href="index.html">Classic presentation</a> · <a href="story.html">Animated presentation</a></p>
</div></section>
<script type="application/json" id="cs-data">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>
<script type="module" src="assets/builder.js"></script>
${QR_SCRIPT}
</body>
</html>
`;
}
