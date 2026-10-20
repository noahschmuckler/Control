// Animated (scroll-driven) version of the presentation: same material as
// index.html, told through sticky "stages" that change as step cards scroll past.

import {
  DOCX, esc, paras, tokenize, LIB, SECTIONS, CLAUSES, byId, CLAUSE_TITLES, CONTROLS, controlForClause,
  PATIENTS, assembled, tierLogic, TIER_LABEL, segmentsHtml, coreHtml, govHtml, refsHtml, combos, fixedCount,
} from './fragments.mjs';
import { qrWidget, QR_SCRIPT, PAGES_URL } from './qr.mjs';

const STORY_URL = `${PAGES_URL}story.html`;
const TOKEN_BLOCKS = new Set(CLAUSES.filter((c) => c.text.includes('[MEDICATION CLASS]')).map((c) => c.clause_id));
const optPills = (opts) => `<div class="opts">${opts.map((o) => `<span>${esc(o)}</span>`).join('')}</div>`;

// ─── Chapter 1: the problem ────────────────────────────────────────────
const problemStage = `<div class="pstage">
  <div class="ptiles">
    <div class="ptile" data-from="1"><b>2</b><span>states</span><div class="pills"><span>NY · I-STOP</span><span>NJ · PMP</span></div></div>
    <div class="ptile" data-from="2"><b>3</b><span>drug classes</span><div class="pills"><span>Opioids</span><span>Benzos</span><span>Stimulants</span></div></div>
    <div class="ptile" data-from="3"><b>∞</b><span>risk profiles</span><div class="spectrum"><span>Low</span><i></i><span>High</span></div></div>
  </div>
  <div class="pvs">
    <div class="vcard low" data-from="4"><div class="plabel">Patient A</div><p>82 · back pain · ½ tramadol occasionally · NY</p></div>
    <div class="vsmark" data-from="5">≠</div>
    <div class="vcard high" data-from="5"><div class="plabel">Patient B</div><p>44 · pain + anxiety + ADHD · past SUD · early fills · NJ</p></div>
  </div>
  <div class="pq" data-from="6">One contract?</div>
</div>`;

const problemSteps = [
  ['Two states', 'New York and New Jersey impose different PDMP duties — New York before <em>every</em> Schedule II–IV prescription, New Jersey at the first visit and quarterly.'],
  ['Three drug classes', 'Opioids, benzodiazepines and ADHD stimulants each carry different risks — and some patients take all three.'],
  ['A wide risk spectrum', 'Age, SUD history, concurrent controlled substances and PDMP findings vary enormously across a panel.'],
  ['Patient A', esc(PATIENTS[0].sketch)],
  ['Patient B', esc(PATIENTS[1].sketch)],
  ['The question', 'How can one regional contract fit two states, three drug classes, and both of these patients? A single one-size document is too heavy for Patient A or too light for Patient B. Separate documents for every combination are unmaintainable.'],
];

// ─── Chapter 2: the blocks and the controls ────────────────────────────
const anatomyStage = `<div class="anatomy story-anatomy">
${SECTIONS.map((s, i) => `<div class="sec">
  <div class="sechead"><span class="secnum">${i + 1}</span><span class="sectitle">${esc(s.title)}</span></div>
  ${s.clauses.map((c) => {
    const ctl = controlForClause[c.clause_id];
    const tags = [ctl ? ctl.key : 'fixed', TOKEN_BLOCKS.has(c.clause_id) ? 'token' : ''].join(' ').trim();
    return `<div class="blk${ctl ? ' mod' : ''}" data-tags="${tags}" style="--c:${ctl?.color ?? 'var(--fixed)'}"><span>${esc(CLAUSE_TITLES[c.clause_id])}</span></div>`;
  }).join('')}
</div>`).join('')}
</div>`;

const ctl = Object.fromEntries(CONTROLS.map((c) => [c.key, c]));
const ctlStep = (key) => {
  const c = ctl[key];
  return {
    hl: key, color: c.color, title: c.name,
    body: `${optPills(c.options)}<p>${esc(c.blurb)}</p><p class="small"><b>Blocks:</b> ${c.clauses.map((id) => esc(CLAUSE_TITLES[id])).join(' · ')}</p>`,
  };
};
const blockSteps = [
  { hl: 'none', title: 'Five sections, every time', body: `<p>Every agreement uses the same five sections, drawn from one library of ${CLAUSES.length} referenced text blocks.</p>` },
  { hl: 'fixed', title: `${fixedCount} blocks every patient signs`, body: '<p>Scope and clinical discretion, the core patient obligations, functional assessment, non-punitive monitoring and graduated response, and the acknowledgment.</p>' },
  ctlStep('state'), ctlStep('indication'), ctlStep('tier'), ctlStep('sud'), ctlStep('combo'), ctlStep('age'), ctlStep('driving'), ctlStep('naloxone'),
  {
    hl: 'token', color: ctl.class.color, title: 'Substance class',
    body: `${optPills(ctl.class.options)}<p>Adds no block of its own. It fills the <span class="tok">[MEDICATION CLASS]</span> wording in the highlighted blocks, sets the SmartPhrase code (<code>OPT</code> · <code>BNZ</code> · <code>STM</code> · <code>MULTI</code>), and decides whether naloxone logic applies.</p>`,
  },
  {
    hl: 'tier', color: ctl.tierInputs.color, title: 'Other risk inputs',
    body: `${optPills(ctl.tierInputs.options)}<p>${esc(ctl.tierInputs.blurb)}</p>`,
  },
  { hl: 'all', title: `${CLAUSES.length - fixedCount} modular blocks, ${combos} combinations`, body: `<p>The prescriber sets ${CONTROLS.length} controls; the builder assembles one agreement — and a SmartPhrase name such as <code>.CSAGREE-OPT-NY-STD</code>.</p>` },
];

// ─── Chapter 3: two patients ───────────────────────────────────────────
const [A, B] = assembled;
function pcard(p, other, from, markExtra) {
  const a = p.a;
  let idx = 0;
  const cells = SECTIONS.map((s) => `<div class="sgrp" style="flex:${s.clauses.length}">${s.clauses.map((c) => {
    const inc = a.included.has(c.clause_id);
    const extra = markExtra && inc && !other.a.included.has(c.clause_id);
    const cls = [inc ? 'inc' : '', extra ? 'extra' : ''].join(' ').trim();
    return `<i class="${cls}" style="--c:${controlForClause[c.clause_id]?.color ?? 'var(--fixed)'};--i:${idx++}" title="${esc(CLAUSE_TITLES[c.clause_id])}"></i>`;
  }).join('')}</div>`).join('');
  return `<div class="pcard" data-from="${from}">
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
const patientStage = `<div class="patstage">${pcard(A, B, 1, false)}${pcard(B, A, 3, true)}<p class="stagecap" data-from="5">Outlined blocks: what Patient B's agreement adds</p></div>`;

const modList = (p) => `<ul class="modlist2">${[...p.a.included].filter((id) => byId[id].condition).map((id) => `<li style="--c:${controlForClause[id]?.color}">${esc(CLAUSE_TITLES[id])}</li>`).join('')}</ul>`;
const chips = (p) => `<div class="chips">${p.settings.map((s) => `<span>${esc(s)}</span>`).join('')}</div>`;
const patientSteps = [
  { title: 'Patient A', body: `<p>${esc(A.sketch)}</p>${chips(A)}` },
  { title: `Patient A → ${TIER_LABEL[A.a.inp.risk_tier]}`, body: `<p>Suggested because: ${esc(A.a.suggestion.reasons.join('; ') || 'no elevated-risk inputs')}.</p>${modList(A)}<p class="small">The prescriber can override to Standard for occasional low-dose tramadol — screening every 6–12 months, no pill counts, 12-month review. The override is flagged.</p>` },
  { title: 'Patient B', body: `<p>${esc(B.sketch)}</p>${chips(B)}` },
  { title: `Patient B → ${TIER_LABEL[B.a.inp.risk_tier]}`, body: `<p>Suggested because: ${esc(B.a.suggestion.reasons.join('; '))}.</p>${modList(B)}` },
  { title: 'Same builder, different agreements', body: `<p>Patient A signs ${A.a.included.size} blocks; Patient B signs ${B.a.included.size}. B's agreement adds visit-level screening, specialist involvement, naloxone, SUD-aware formulation language, combination-risk and driving counseling — and a 3-month review instead of 6.</p>` },
];

const fullAgreement = (p) => `<details class="reveal"><summary>Read ${esc(p.label)}'s assembled agreement</summary><div class="fulltext">${p.a.sections.map((s, i) => `<h5>SECTION ${i + 1} — ${esc(s.title.toUpperCase())}</h5>${s.clauses.map((c) => `<div class="pc" style="--c:${controlForClause[c.clause_id]?.color ?? 'transparent'}">${paras(tokenize(esc(c.rendered)))}</div>`).join('')}`).join('')}</div></details>`;

// ─── Assembly ──────────────────────────────────────────────────────────
function scrolly(id, stage, steps, { stepHtml }) {
  return `<div class="scrolly" id="${id}">
  <div class="stage" data-step="0">${stage}</div>
  <div class="steps">${steps.map((s, i) => `<div class="step" data-step="${i + 1}"${s.hl ? ` data-hl="${s.hl}"` : ''}>${stepHtml(s, i)}</div>`).join('')}</div>
</div>`;
}
const card = (s, i, n) => `<div class="scard" style="--c:${s.color ?? 'var(--accent)'}"><span class="sn">${String(i + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}</span><h3>${s.title}</h3>${s.body}</div>`;

const reveal = (html) => html.replace(/<article class="clause/g, '<article class="reveal clause');

const SCRIPT = `<script>
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Count-up numbers.
  function count(el) {
    if (el.dataset.done) return; el.dataset.done = 1;
    var end = +el.dataset.count, t0 = null, dur = reduce ? 0 : 900;
    function f(t) { t0 = t0 || t; var k = dur ? Math.min(1, (t - t0) / dur) : 1;
      el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3))).toLocaleString(); if (k < 1) requestAnimationFrame(f); }
    requestAnimationFrame(f);
  }

  // Scrollytelling: the step crossing mid-screen drives its stage.
  document.querySelectorAll('.scrolly').forEach(function (sc) {
    var stage = sc.querySelector('.stage');
    var steps = sc.querySelectorAll('.step');
    function activate(step) {
      var n = +step.dataset.step;
      steps.forEach(function (s) { s.classList.toggle('active', s === step); });
      stage.dataset.step = n;
      stage.querySelectorAll('[data-from]').forEach(function (el) {
        var on = n >= +el.dataset.from; el.classList.toggle('on', on);
        if (on) el.querySelectorAll('[data-count]').forEach(count);
      });
      var hl = step.dataset.hl;
      if (hl) stage.querySelectorAll('.blk').forEach(function (b) {
        var tags = b.dataset.tags.split(' ');
        b.classList.toggle('dim', hl !== 'none' && hl !== 'all' && tags.indexOf(hl) < 0);
        b.classList.toggle('lit', hl === 'all' || tags.indexOf(hl) >= 0);
      });
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) activate(e.target); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach(function (s) { io.observe(s); });
  });

  // Reveal-on-scroll for everything else.
  var ro = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); e.target.querySelectorAll('[data-count]').forEach(count); ro.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -12% 0px' });
  document.querySelectorAll('.reveal').forEach(function (el) { ro.observe(el); });

  // Reading-progress bar.
  var bar = document.querySelector('.progress i');
  function prog() { var h = document.documentElement; bar.style.transform = 'scaleX(' + (h.scrollTop / (h.scrollHeight - h.clientHeight || 1)) + ')'; }
  document.addEventListener('scroll', prog, { passive: true }); prog();
})();
</script>`;

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
<link rel="stylesheet" href="assets/story.css">
<script>document.documentElement.classList.add('js');</script>
</head>
<body class="story">
<nav class="topnav"><div class="navin">
  <a href="#top" class="brand">CS Agreement Builder</a>
  <a href="#problem">Problem</a><a href="#blocks">Blocks &amp; controls</a><a href="#patients">Two patients</a><a href="#segments">Segments</a><a href="#core">Core text</a><a href="#governance">Governance</a><a href="#references">References</a>
  <a href="index.html" class="alt-link">← Classic version</a>
  <a href="${DOCX}" class="dl" download>Word doc ↓</a>
</div><div class="progress"><i></i></div></nav>
${qrWidget(STORY_URL)}

<header class="hero shero" id="top"><div class="wrap">
  <p class="eyebrow">QI / Controlled Substances Committee</p>
  <h1><span class="ln">One agreement.</span><span class="ln">Every patient.</span></h1>
  <p class="sub">A modular controlled-substance prescribing agreement for New York and New Jersey — opioids, benzodiazepines and stimulants — that scales to each patient's actual risk.</p>
  <div class="ctarow"><a class="cta" href="${DOCX}" download>Download the clause library (Word)</a><a class="cta ghost" href="index.html">View the classic version</a></div>
  <a class="scrollcue" href="#problem" aria-label="Scroll to begin">Scroll<span>↓</span></a>
</div></header>

<main>
<section id="problem" class="chapter"><div class="wrap">
  <p class="kicker">The problem</p>
  ${scrolly('problem-scrolly', problemStage, problemSteps.map(([title, body]) => ({ title, body: `<p>${body}</p>` })), { stepHtml: (s, i) => card(s, i, problemSteps.length) })}
</div></section>

<section id="blocks" class="chapter alt"><div class="wrap">
  <p class="kicker">The answer</p>
  <h2 class="reveal">One document, assembled from referenced blocks</h2>
  ${scrolly('blocks-scrolly', anatomyStage, blockSteps, { stepHtml: (s, i) => card(s, i, blockSteps.length) })}
  <div class="reveal"><h4 class="subh">How the risk tier is suggested</h4>${tierLogic}</div>
</div></section>

<section id="patients" class="chapter"><div class="wrap">
  <p class="kicker">Same builder, two patients</p>
  <h2 class="reveal">The agreement each patient actually signs</h2>
  ${scrolly('patients-scrolly', patientStage, patientSteps, { stepHtml: (s, i) => card(s, i, patientSteps.length) })}
  <div class="cols2">${fullAgreement(A)}${fullAgreement(B)}</div>
</div></section>

<section id="segments" class="chapter alt"><div class="wrap">
  <p class="kicker">Segment by segment</p>
  <h2 class="reveal">Each control, each option, the exact text</h2>
  <p class="lede reveal">Text appears exactly as the builder inserts it. <span class="tok">[BRACKETED]</span> fields are completed at signing. <mark class="diff">Highlighted</mark> words differ between options. Small numbered tags link to the references.</p>
  ${reveal(segmentsHtml)}
</div></section>

<section id="core" class="chapter"><div class="wrap">
  <p class="kicker">The common core</p>
  <h2 class="reveal">The ${fixedCount} blocks every patient signs</h2>
  ${reveal(coreHtml)}
</div></section>

<section id="governance" class="chapter alt"><div class="wrap">
  <p class="kicker">Governance</p>
  <h2 class="reveal">Safeguards built into the design</h2>
  <div class="reveal">${govHtml}</div>
</div></section>

<section id="references" class="chapter"><div class="wrap">
  <p class="kicker">References</p>
  <h2 class="reveal">Cited authorities</h2>
  <p class="lede">The authorities each block cites. Links are given where a stable public source exists.</p>
  ${refsHtml}
</div></section>

<section id="download" class="chapter alt"><div class="wrap center reveal">
  <h2>Take it with you</h2>
  <p class="lede">The Word document contains every section with a short explainer, the inclusion rule for each block, and its exact text and authority.</p>
  <a class="cta" href="${DOCX}" download>Download the clause library (.docx)</a>
  <p class="foot">Clause library v${LIB.schema_version} · Scope: New York and New Jersey · <a href="index.html">Classic version</a></p>
</div></section>
</main>
${SCRIPT}
${QR_SCRIPT}
</body>
</html>
`;
}
