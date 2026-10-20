// Contract builder: reads the form, assembles with the shared rules, and
// updates the overview graphic, summary and full text in place.
import { makeLogic } from './cs-logic.mjs';

const D = JSON.parse(document.getElementById('cs-data').textContent);
const L = makeLogic(D.lib);
const form = document.getElementById('cb-form');
const $ = (id) => document.getElementById(id);
const FLAGS = ['combo_opioid_benzo', 'age_65_plus', 'driving_or_safety_sensitive', 'dose_above_threshold', 'early_fill_history', 'prior_lost_medication', 'specialist_involved'];
const TIER_LABEL = { standard: 'Standard', enhanced: 'Enhanced', 'high-risk': 'High-risk' };
const CLASS_LABEL = { opioid: 'Opioid', benzo: 'Benzodiazepine', stimulant: 'Stimulant', 'multi-class': 'Multi-class' };

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const textHtml = (t) => esc(t)
  .replace(/\[([A-Z][^\]]*)\]/g, '<span class="tok">[$1]</span>')
  .split(/\n\n+/).map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');

// ── form state <-> inputs object <-> URL hash ──────────────────────────
function read() {
  const f = new FormData(form);
  const inp = {
    substance_class: f.get('substance_class'),
    state: f.get('state'),
    indication_status: f.get('indication_status'),
    sud_history: f.get('sud_history'),
    concurrent_cs: f.get('concurrent_cs'),
    tier_override: f.get('tier') === 'auto' ? null : f.get('tier'),
    naloxone_override: f.get('naloxone') === 'auto' ? null : f.get('naloxone') === 'yes',
  };
  FLAGS.forEach((k) => { inp[k] = f.has(k); });
  return inp;
}
function write(inp) {
  const set = (name, value) => { const el = form.querySelector(`input[name="${name}"][value="${value}"]`); if (el) el.checked = true; };
  ['substance_class', 'state', 'indication_status', 'sud_history', 'concurrent_cs'].forEach((k) => set(k, inp[k]));
  FLAGS.forEach((k) => { form.querySelector(`input[name="${k}"]`).checked = !!inp[k]; });
  set('tier', inp.tier_override ?? 'auto');
  set('naloxone', inp.naloxone_override == null ? 'auto' : inp.naloxone_override ? 'yes' : 'no');
}
function toHash(inp) {
  const p = new URLSearchParams({
    c: inp.substance_class, s: inp.state, i: inp.indication_status, sud: inp.sud_history, cc: inp.concurrent_cs,
    f: FLAGS.filter((k) => inp[k]).join(','), t: inp.tier_override ?? 'auto',
    n: inp.naloxone_override == null ? 'auto' : inp.naloxone_override ? 'yes' : 'no',
  });
  return `#${p}`;
}
function fromHash() {
  if (!location.hash.includes('c=')) return null;
  const p = new URLSearchParams(location.hash.slice(1));
  const flags = (p.get('f') || '').split(',');
  const inp = {
    ...D.presets.reset,
    substance_class: p.get('c'), state: p.get('s'), indication_status: p.get('i'), sud_history: p.get('sud'), concurrent_cs: p.get('cc'),
    tier_override: p.get('t') && p.get('t') !== 'auto' ? p.get('t') : null,
    naloxone_override: p.get('n') === 'yes' ? true : p.get('n') === 'no' ? false : null,
  };
  FLAGS.forEach((k) => { inp[k] = flags.includes(k); });
  return inp;
}

// ── rendering ──────────────────────────────────────────────────────────
const chips = [...document.querySelectorAll('.bgraphic .blk')];
const cards = [...document.querySelectorAll('.doc .clause')];
const showX = $('show-excluded');
let last = null;
let current = null;

function flagsSummary(inp) {
  const bits = [];
  if (inp.sud_history !== 'none') bits.push(`SUD-${inp.sud_history}`);
  if (inp.combo_opioid_benzo) bits.push('opioid+benzo');
  if (inp.concurrent_cs !== 'none') bits.push(inp.concurrent_cs);
  if (inp.dose_above_threshold) bits.push('dose≥threshold');
  if (inp.age_65_plus) bits.push('age≥65');
  if (inp.early_fill_history) bits.push('early-fills');
  if (inp.prior_lost_medication) bits.push('lost-med');
  if (inp.driving_or_safety_sensitive) bits.push('driving');
  if (inp.naloxone_indicated) bits.push('naloxone');
  if (inp.specialist_involved) bits.push('specialist');
  return [CLASS_LABEL[inp.substance_class], inp.state, TIER_LABEL[inp.risk_tier], ...bits].join(' | ');
}

function flash(el) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }

function render() {
  const raw = read();
  const a = L.assemble(raw);
  current = a;
  const inp = a.inp;
  const rendered = new Map(a.sections.flatMap((s) => s.clauses).map((c) => [c.clause_id, c.rendered]));

  chips.forEach((el) => {
    const on = a.included.has(el.dataset.id);
    if (on && last && !last.has(el.dataset.id)) flash(el);
    el.classList.toggle('inc', on);
  });
  cards.forEach((el) => {
    const id = el.dataset.id;
    const on = a.included.has(id);
    const text = rendered.get(id) ?? L.substitute(D.lib.sections.flatMap((s) => s.clauses).find((c) => c.clause_id === id).text, inp.substance_class);
    const body = el.querySelector('.ctext');
    if (body.dataset.text !== text) { body.innerHTML = textHtml(text); body.dataset.text = text; }
    el.classList.toggle('excluded', !on);
    el.hidden = !on && !showX.checked;
    if (on && last && !last.has(id)) flash(el);
  });
  last = a.included;

  // summary
  const tierEl = $('s-tier');
  tierEl.textContent = TIER_LABEL[inp.risk_tier];
  tierEl.className = `t-${inp.risk_tier}`;
  $('s-tier-src').textContent = raw.tier_override ? (raw.tier_override === a.suggestion.tier ? 'confirmed' : `override — suggested ${TIER_LABEL[a.suggestion.tier]}`) : 'suggested';
  $('s-blocks').textContent = a.included.size;
  const prop = a.sections.flatMap((s) => s.clauses).filter((c) => c.proposed_institutional_standard).length;
  $('s-prop').textContent = `${prop} proposed institutional standard${prop === 1 ? '' : 's'}`;
  $('s-words').textContent = a.words.toLocaleString();
  $('s-review').textContent = a.reviewMonths;
  const d = new Date(); d.setMonth(d.getMonth() + a.reviewMonths);
  $('s-date').textContent = `due ${d.toISOString().slice(0, 10)}`;
  $('s-nal').textContent = inp.naloxone_indicated ? 'Offered' : 'Not offered';
  $('s-trigger').textContent = a.trigger;
  $('s-flags').textContent = flagsSummary(inp);

  // control hints
  $('tier-why').innerHTML = `<b>Suggested: ${TIER_LABEL[a.suggestion.tier]}</b> — ${a.suggestion.reasons.length ? esc(a.suggestion.reasons.join('; ')) : 'no elevated-risk inputs'}.${raw.tier_override && raw.tier_override !== a.suggestion.tier ? ' <em>Manual override (flagged).</em>' : ''}`;
  const autoNal = L.autoNaloxone(inp.substance_class, inp);
  $('nal-why').innerHTML = `<b>Suggested: ${autoNal ? 'offered' : 'not indicated'}</b>${raw.naloxone_override != null && raw.naloxone_override !== autoNal ? ' — <em>manual override.</em>' : '.'}`;
  form.querySelector('input[name="tier"][value="auto"] + span').textContent = `Suggested · ${TIER_LABEL[a.suggestion.tier]}`;

  history.replaceState(null, '', toHash(raw));
}

function plainText(a) {
  return a.sections.map((s, i) => `SECTION ${i + 1} — ${s.title.toUpperCase()}\n\n${s.clauses.map((c) => c.rendered).join('\n\n')}`).join('\n\n');
}
function feedback(btn, msg) {
  const old = btn.textContent;
  btn.textContent = msg;
  btn.disabled = true;
  setTimeout(() => { btn.textContent = old; btn.disabled = false; }, 1400);
}
async function copy(text, btn) {
  try { await navigator.clipboard.writeText(text); feedback(btn, 'Copied'); } catch { feedback(btn, 'Copy blocked — select the text instead'); }
}

form.addEventListener('change', render);
form.querySelectorAll('[data-preset]').forEach((b) => b.addEventListener('click', () => { write(D.presets[b.dataset.preset]); render(); }));
showX.addEventListener('change', render);
$('copy-text').addEventListener('click', (e) => copy(plainText(current), e.currentTarget));
$('copy-link').addEventListener('click', (e) => copy(location.href, e.currentTarget));
$('dl-txt').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([`${plainText(current)}\n`], { type: 'text/plain' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: `${current.trigger.slice(1)}.txt` });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

write(fromHash() ?? D.presets.reset);
render();
document.body.classList.add('ready');
