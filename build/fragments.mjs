// HTML fragments shared by the classic page and the animated (story) page.

import {
  LIB, SECTIONS, CLAUSES, byId, CLAUSE_TITLES, SECTION_BLURBS, CONTROLS, controlForClause,
  PATIENTS, REFERENCES, refsFor, assemble, substitute, VERSION_STAMP,
} from './model.mjs';

export const DOCX = 'downloads/Controlled-Substance-Agreement-Clause-Library.docx';

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const refIndex = Object.fromEntries(REFERENCES.map((r, i) => [r.key, i + 1]));

// Word-level diff: returns HTML of `a` with tokens absent from the LCS with `b` marked.
function diffMark(a, b) {
  const ta = a.split(/(\s+)/), tb = b.split(/(\s+)/);
  const wa = ta.filter((_, i) => i % 2 === 0), wb = tb.filter((_, i) => i % 2 === 0);
  const n = wa.length, m = wb.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    dp[i][j] = wa[i] === wb[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const keep = new Array(n).fill(false);
  for (let i = 0, j = 0; i < n && j < m;) {
    if (wa[i] === wb[j]) { keep[i] = true; i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
  }
  let out = '', open = false;
  for (let k = 0; k < ta.length; k++) {
    if (k % 2 === 1) { out += esc(ta[k]); continue; }
    const w = k / 2, changed = !keep[w];
    if (changed && !open) { out += '<mark class="diff">'; open = true; }
    if (!changed && open) { out = out.replace(/(\s*)$/, '</mark>$1'); open = false; }
    out += esc(ta[k]);
  }
  if (open) out += '</mark>';
  return out;
}

export const tokenize = (html) => html.replace(/\[([A-Z][^\]]*)\]/g, '<span class="tok">[$1]</span>');
export const paras = (html) => html.split(/\n\n+/).map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
const textHtml = (text, against) => paras(tokenize(against ? diffMark(text, against) : esc(text)));

function refLinks(clause) {
  const refs = refsFor(clause);
  if (!refs.length) return '';
  return `<span class="refnums">${refs.map((r) => `<a href="#ref-${refIndex[r.key]}">${refIndex[r.key]}</a>`).join('')}</span>`;
}

function ruleText(c) {
  if (!c.condition) return 'Always included';
  const { field, eq, in: inn } = c.condition;
  const label = {
    indication_status: 'Indication', state: 'State', risk_tier: 'Risk tier', sud_history: 'SUD history',
    naloxone_indicated: 'Naloxone', driving_or_safety_sensitive: 'Driving / safety-sensitive',
    age_65_plus: 'Age ≥ 65', combo_opioid_benzo: 'Opioid + benzo',
  }[field] ?? field;
  const v = inn ? inn.join(' or ') : eq === true ? 'on' : String(eq);
  return `Included when ${label} = ${v}`;
}

export function clauseCard(c, { against, cls, compact } = {}) {
  const text = substitute(c.text, cls);
  const ctl = controlForClause[c.clause_id];
  return `<article class="clause${compact ? ' compact' : ''}" style="--c:${ctl?.color ?? 'var(--fixed)'}">
  <header><h4>${esc(CLAUSE_TITLES[c.clause_id])}</h4><code>${c.clause_id}</code></header>
  <div class="ctext">${textHtml(text, against && substitute(against, cls))}</div>
  <footer>
    <div class="rule">${esc(ruleText(c))}</div>
    <div class="auth"><span>Authority:</span> ${esc(c.authority)} ${refLinks(c)}</div>
    ${c.proposed_institutional_standard ? '<div class="badge prop">Proposed institutional standard — no national mandate</div>' : '<div class="badge std">Grounded in statute / guideline</div>'}
  </footer>
</article>`;
}

// ─── Anatomy graphic ───────────────────────────────────────────────────
export const anatomy = `<div class="anatomy" role="img" aria-label="The five contract sections with each text block coloured by the control that includes it">
${SECTIONS.map((s, i) => `<div class="sec">
  <div class="sechead"><span class="secnum">${i + 1}</span>${esc(s.title)}</div>
  ${s.clauses.map((c) => {
    const ctl = controlForClause[c.clause_id];
    return `<div class="blk${ctl ? ' mod' : ''}" style="--c:${ctl?.color ?? 'var(--fixed)'}"><span>${esc(CLAUSE_TITLES[c.clause_id])}</span>${ctl ? `<em>${esc(ctl.name)}</em>` : ''}</div>`;
  }).join('')}
</div>`).join('')}
</div>
<div class="legend">
  <span style="--c:var(--fixed)">Always present</span>
  ${CONTROLS.filter((c) => c.clauses.length).map((c) => `<span style="--c:${c.color}">${esc(c.name)}</span>`).join('')}
</div>`;

// ─── Controls panel ────────────────────────────────────────────────────
export const controlCards = CONTROLS.map((c) => `<div class="ctl" style="--c:${c.color}">
  <h3>${esc(c.name)}</h3>
  <div class="opts">${c.options.map((o) => `<span>${esc(o)}</span>`).join('')}</div>
  <p>${esc(c.blurb)}</p>
  <div class="drives">${c.clauses.length
    ? `<b>Blocks:</b> ${c.clauses.map((id) => esc(CLAUSE_TITLES[id])).join(' · ')}`
    : c.key === 'class' ? '<b>Fills:</b> [MEDICATION CLASS] wording · SmartPhrase code · naloxone logic' : '<b>Feeds:</b> risk-tier suggestion'}</div>
</div>`).join('');

export const tierLogic = `<div class="logic">
  <div class="lcol hr"><h4>High-risk if any</h4><ul>
    <li>Active SUD without specialist involvement</li><li>Opioid + benzodiazepine</li>
    <li>Cross-class concurrent controlled substances</li><li>Prior lost-medication report</li>
    <li>No indication at dose ≥ threshold</li></ul></div>
  <div class="lcol en"><h4>otherwise Enhanced if any</h4><ul>
    <li>Past or active SUD without specialist</li><li>Early-fill history</li><li>Dose ≥ threshold</li>
    <li>Age ≥ 65</li><li>Inherited / presumptive indication</li><li>Same-class concurrent CS</li></ul></div>
  <div class="lcol st"><h4>otherwise Standard</h4><ul><li>No elevated-risk inputs set</li></ul></div>
</div>
<p class="note">The tier is a <b>suggestion with its rationale shown</b>. The prescriber confirms or overrides it; overrides are flagged. Next review: Standard ${LIB.next_review_offset_months.standard} months · Enhanced ${LIB.next_review_offset_months.enhanced} months · High-risk ${LIB.next_review_offset_months['high-risk']} months.</p>
<p class="note"><b>Naloxone auto-logic:</b> on for any opioid + benzodiazepine combination, or for an opioid-involving class (opioid, multi-class) with dose ≥ threshold or any SUD history. Overridable.</p>`;

// ─── Patients ──────────────────────────────────────────────────────────
export const TIER_LABEL = { standard: 'Standard', enhanced: 'Enhanced', 'high-risk': 'High-risk' };
export const assembled = PATIENTS.map((p) => ({ ...p, a: assemble(p.inputs) }));

export function strip(a) {
  return `<div class="strip" aria-label="${a.included.size} of ${CLAUSES.length} blocks included">${SECTIONS.map((s) =>
    `<div class="sgrp" style="flex:${s.clauses.length}">${s.clauses.map((c) => {
      const on = a.included.has(c.clause_id);
      const ctl = controlForClause[c.clause_id];
      return `<i class="${on ? 'on' : ''}" style="--c:${ctl?.color ?? 'var(--fixed)'}" title="${esc(CLAUSE_TITLES[c.clause_id])}"></i>`;
    }).join('')}</div>`).join('')}</div>`;
}

export function patientCard(p) {
  const a = p.a;
  const modular = [...a.included].filter((id) => byId[id].condition);
  const full = a.sections.map((s, i) => `<h5>SECTION ${i + 1} — ${esc(s.title.toUpperCase())}</h5>${s.clauses.map((c) => `<div class="pc" style="--c:${controlForClause[c.clause_id]?.color ?? 'transparent'}">${paras(tokenize(esc(c.rendered)))}</div>`).join('')}`).join('');
  return `<div class="patient">
  <div class="plabel">${esc(p.label)}</div>
  <p class="sketch">${esc(p.sketch)}</p>
  <div class="chips">${p.settings.map((s) => `<span>${esc(s)}</span>`).join('')}</div>
  <div class="tier t-${a.inp.risk_tier}"><b>${TIER_LABEL[a.inp.risk_tier]}</b> suggested — ${a.suggestion.reasons.length ? esc(a.suggestion.reasons.join('; ')) : 'no elevated-risk inputs'}</div>
  <dl class="facts">
    <div><dt>Blocks</dt><dd>${a.included.size} <small>of ${CLAUSES.length}</small></dd></div>
    <div><dt>Words</dt><dd>${a.words.toLocaleString()}</dd></div>
    <div><dt>Review</dt><dd>${a.reviewMonths} <small>mo</small></dd></div>
    <div><dt>Naloxone</dt><dd>${a.inp.naloxone_indicated ? 'Yes' : 'No'}</dd></div>
  </dl>
  ${strip(a)}
  <div class="smart"><code>${a.trigger}</code></div>
  <div class="modlist"><b>Modular blocks included:</b><ul>${modular.map((id) => `<li style="--c:${controlForClause[id]?.color}">${esc(CLAUSE_TITLES[id])}</li>`).join('')}</ul></div>
  <details><summary>Read Patient ${p.id.toUpperCase()}'s assembled agreement</summary><div class="fulltext">${full}</div></details>
</div>`;
}

// ─── Segment deep dives ────────────────────────────────────────────────
const C = (id) => byId[id];

const segState = `<p class="lede">New York requires a PDMP check before <em>every</em> Schedule II–IV prescription; New Jersey requires it at the first visit and quarterly during ongoing therapy. The builder swaps both the patient-consent and the provider-duty blocks. Highlighted words differ between states.</p>
<div class="cols2"><div><h4 class="colh">New York</h4>${clauseCard(C('S2-VAR-PDMP-NY'), { against: C('S2-VAR-PDMP-NJ').text })}${clauseCard(C('S3-FIXED-PDMP-NY'), { against: C('S3-FIXED-PDMP-NJ').text })}</div>
<div><h4 class="colh">New Jersey</h4>${clauseCard(C('S2-VAR-PDMP-NJ'), { against: C('S2-VAR-PDMP-NY').text })}${clauseCard(C('S3-FIXED-PDMP-NJ'), { against: C('S3-FIXED-PDMP-NY').text })}</div></div>`;

const classRows = Object.keys(LIB.class_labels).map((k) => `<tr><td>${esc({ opioid: 'Opioid', benzo: 'Benzodiazepine', stimulant: 'Stimulant', 'multi-class': 'Multi-class' }[k])}</td><td>“${esc(LIB.class_labels[k])}”</td><td><code>${LIB.class_codes[k]}</code></td><td>${k === 'opioid' || k === 'multi-class' ? 'With dose ≥ threshold or SUD history' : 'Only via opioid + benzo'}</td></tr>`).join('');
const segClass = `<p class="lede">Substance class adds no block of its own. It fills the <span class="tok">[MEDICATION CLASS]</span> token wherever it appears, sets the SmartPhrase code <code>.CSAGREE-[CLASS]-[STATE]-[TIER]</code>, and decides whether naloxone logic applies. When the builder is opened from the ADHD, opiate or benzodiazepine module, the class is pre-selected.</p>
<div class="tablewrap"><table><thead><tr><th>Class</th><th>[MEDICATION CLASS] becomes</th><th>Code</th><th>Naloxone logic</th></tr></thead><tbody>${classRows}</tbody></table></div>
<p class="lede">Blocks that carry the token (shown with the token unfilled):</p>
<div class="cols2">${clauseCard(C('S2-FIXED-SINGLE-PRESCRIBER'), { compact: true })}${clauseCard(C('S4-VAR-DRIVING'), { compact: true })}</div>`;

const segIndication = `<p class="lede">Exactly one indication statement is used. An inherited prescription is continued explicitly to avoid withdrawal harm — without endorsing the prior prescriber — and a prescription with no documented indication is framed as a time-limited bridge.</p>
<div class="cols3">${['ESTABLISHED', 'INHERITED', 'NONE'].map((k, i) => `<div><h4 class="colh">${['Established', 'Inherited / presumptive', 'None — pending assessment'][i]}</h4>${clauseCard(C('S1-VAR-INDICATION-' + k))}</div>`).join('')}</div>`;

const tierRow = (label, ids, base) => `<tr><th scope="row">${label}</th>${ids.map((id, i) => `<td>${id ? clauseCard(C(id), { against: base && base[i] ? C(base[i]).text : null, compact: true }) : '<div class="absent">Not included</div>'}</td>`).join('')}</tr>`;
const segTier = `<p class="lede">The tier is where the patient populations diverge most. Highlighted words show what changes from the neighbouring tier.</p>
<div class="tablewrap tiers"><table><colgroup><col style="width:120px"><col><col><col></colgroup><thead><tr><th></th><th class="t-standard">Standard</th><th class="t-enhanced">Enhanced</th><th class="t-high-risk">High-risk</th></tr></thead><tbody>
${tierRow('Drug screening', ['S2-VAR-UDS-STANDARD', 'S2-VAR-UDS-ENHANCED', 'S2-VAR-UDS-HIGHRISK'], ['S2-VAR-UDS-ENHANCED', 'S2-VAR-UDS-STANDARD', 'S2-VAR-UDS-ENHANCED'])}
${tierRow('Pill counts', [null, 'S2-VAR-PILL-COUNT-ENHANCED', 'S2-VAR-PILL-COUNT-ENHANCED'])}
${tierRow('Reassessment', ['S3-VAR-REASSESSMENT-STANDARD', 'S3-VAR-REASSESSMENT-ENHANCED', 'S3-VAR-REASSESSMENT-HIGHRISK'], ['S3-VAR-REASSESSMENT-ENHANCED', 'S3-VAR-REASSESSMENT-STANDARD', 'S3-VAR-REASSESSMENT-ENHANCED'])}
${tierRow('Specialist', [null, null, 'S3-VAR-SPECIALIST-HIGHRISK'])}
<tr><th scope="row">Next review</th><td class="big">${LIB.next_review_offset_months.standard} months</td><td class="big">${LIB.next_review_offset_months.enhanced} months</td><td class="big">${LIB.next_review_offset_months['high-risk']} months</td></tr>
</tbody></table></div>
<h4 class="subh">How the tier is suggested</h4>${tierLogic}`;

const onOff = (id, lede) => `<p class="lede">${lede}</p><div class="cols2 onoff"><div><h4 class="colh">Off</h4><div class="absent big">Block not included — the agreement carries no ${esc(CLAUSE_TITLES[id].toLowerCase())} language.</div></div><div><h4 class="colh">On</h4>${clauseCard(C(id))}</div></div>`;

const segSud = `<p class="lede">With no SUD history neither block appears. Past or active SUD adds both — the same text for either — and changes the tier suggestion: past SUD suggests Enhanced, active SUD suggests High-risk, unless a specialist is involved. SUD history also turns on naloxone for opioid-involving classes.</p>
<div class="cols2"><div><h4 class="colh">Patient obligation</h4>${clauseCard(C('S2-VAR-ER-FORMULATION'))}</div><div><h4 class="colh">Monitoring section</h4>${clauseCard(C('S4-VAR-SUD-AWARE'))}</div></div>`;

const otherRows = [
  ['Concurrent CS — same class', 'Enhanced'], ['Concurrent CS — cross class', 'High-risk'], ['Dose ≥ threshold', 'Enhanced (High-risk if no indication)'],
  ['Early-fill history', 'Enhanced'], ['Prior lost meds', 'High-risk'], ['Specialist involved', 'Removes the SUD-based escalation'],
].map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('');
const segOther = `<p class="lede">These inputs add no text of their own. They exist so the tier suggestion reflects the real risk picture — and so the PDMP findings that worry us most (early fills, lost-medication reports, multiple prescribers) translate directly into monitoring intensity.</p>
<div class="tablewrap"><table><thead><tr><th>Input</th><th>Effect on suggested tier</th></tr></thead><tbody>${otherRows}</tbody></table></div>`;

export const SEGMENTS = [
  ['seg-state', 'State', '#2f6fb3', segState],
  ['seg-class', 'Substance class', '#6a4fb3', segClass],
  ['seg-indication', 'Indication status', '#0f7f7a', segIndication],
  ['seg-tier', 'Risk tier', '#c2410c', segTier],
  ['seg-sud', 'SUD history', '#a21caf', segSud],
  ['seg-combo', 'Opioid + benzodiazepine', '#b91c1c', onOff('S4-VAR-COMBO-OPIOID-BENZO', 'The combination carries an FDA boxed warning. Turning this on adds the acknowledgment below, forces naloxone on, and suggests High-risk — which in turn adds visit-level screening, pill counts, specialist involvement and 3-month review.')],
  ['seg-age', 'Age ≥ 65', '#b45309', onOff('S4-VAR-AGE-65', 'Adds documented Beers-criteria counseling about falls, fractures and cognition, and suggests at least Enhanced. The tier remains overridable for a low-dose, stable older patient.')],
  ['seg-driving', 'Driving / safety-sensitive', '#4d7c0f', onOff('S4-VAR-DRIVING', 'Adds documented impairment counseling; the bracketed occupational sentence is completed only for safety-sensitive jobs. Does not change the tier.')],
  ['seg-naloxone', 'Naloxone', '#0369a1', onOff('S3-VAR-NALOXONE', 'Set automatically from class, dose, SUD and combination inputs; the prescriber can override it either way.')],
  ['seg-other', 'Other risk inputs', '#64748b', segOther],
];

export const segmentsHtml = SEGMENTS.map(([id, name, color, body], i) => `<section class="seg" id="${id}" style="--c:${color}">
  <div class="seghead"><span class="segn">${String(i + 1).padStart(2, '0')}</span><h3>${esc(name)}</h3></div>
  ${body}
</section>`).join('');

// ─── Core (always-present) ─────────────────────────────────────────────
export const coreHtml = SECTIONS.map((s, i) => {
  const fixed = s.clauses.filter((c) => !c.condition);
  return `<div class="coresec"><h3><span class="secnum">${i + 1}</span>${esc(s.title)}</h3><p class="lede">${esc(SECTION_BLURBS[s.section_id])}</p>${fixed.map((c) => clauseCard(c)).join('')}</div>`;
}).join('');

// ─── Governance ────────────────────────────────────────────────────────
export const proposed = CLAUSES.filter((c) => c.proposed_institutional_standard);
export const fixedCount = CLAUSES.filter((c) => !c.condition).length;
export const govHtml = `<div class="gov">
  <div><h4>Clinician stays in charge</h4><p>Tier and naloxone are suggestions with visible rationale. Overrides are allowed and flagged. The header and acknowledgment state the agreement is advisory and preserves clinical discretion.</p></div>
  <div><h4>Non-punitive by design</h4><p>Every agreement includes the monitoring-framing and graduated-response blocks: no dismissal on a single result, conversation before decisions, and a referral or bridge plan rather than abandonment.</p></div>
  <div><h4>Honest about authority</h4><p>${proposed.length} of ${CLAUSES.length} blocks are flagged <b>proposed institutional standard</b> — they rest on convention or institutional policy rather than a national mandate. These are the blocks that need this committee's endorsement.</p></div>
  <div><h4>Versioned &amp; Epic-ready</h4><p>Signatures carry the library version (${esc(VERSION_STAMP)}). Each configuration maps to a SmartPhrase name such as <code>.CSAGREE-OPT-NY-STD</code>; bracketed fields are completed at signing.</p></div>
</div>
<h4 class="subh">Blocks flagged for committee endorsement</h4>
<ul class="proplist">${proposed.map((c) => `<li style="--c:${controlForClause[c.clause_id]?.color ?? 'var(--fixed)'}"><span>${esc(CLAUSE_TITLES[c.clause_id])}</span><code>${c.clause_id}</code></li>`).join('')}</ul>`;

export const refsHtml = `<ol class="refs">${REFERENCES.map((r, i) => `<li id="ref-${i + 1}">${esc(r.cite)}${r.url ? ` <a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.url.replace(/^https?:\/\//, ''))}</a>` : ''}</li>`).join('')}</ol>`;

// Distinct clause sets: indication(3) × state(2) × tier(3) × SUD(2) × combo × age × driving × naloxone
export const combos = 3 * 2 * 3 * 2 * 2 * 2 * 2 * 2;
export { LIB, SECTIONS, CLAUSES, byId, CLAUSE_TITLES, CONTROLS, controlForClause, PATIENTS, VERSION_STAMP };
