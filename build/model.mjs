// Shared model for the page and the Word export: the clause library, the
// contract controls, tier/naloxone logic (ported verbatim from the builder),
// reference catalogue, and the two demonstration patients.

import { readFileSync } from 'node:fs';
import { makeLogic } from '../assets/cs-logic.mjs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
export const LIB = JSON.parse(readFileSync(join(here, '..', 'data', 'clause-library.json'), 'utf8'));

export const SECTIONS = [...LIB.sections].sort((a, b) => a.order - b.order);
export const CLAUSES = SECTIONS.flatMap((s) => s.clauses);
export const byId = Object.fromEntries(CLAUSES.map((c) => [c.clause_id, c]));
export const VERSION_STAMP = `v${LIB.schema_version} (${LIB.change_log[0]?.date ?? ''})`;

// Short human titles for each block (the library stores only IDs).
export const CLAUSE_TITLES = {
  'S1-FIXED-HEADER': 'Agreement header & clinical-discretion statement',
  'S1-VAR-INDICATION-ESTABLISHED': 'Indication — established',
  'S1-VAR-INDICATION-INHERITED': 'Indication — inherited / presumptive',
  'S1-VAR-INDICATION-NONE': 'Indication — none, bridge supply',
  'S2-FIXED-SINGLE-PRESCRIBER': 'Single prescriber',
  'S2-FIXED-SINGLE-PHARMACY': 'Single pharmacy',
  'S2-FIXED-AS-PRESCRIBED': 'Use as prescribed',
  'S2-FIXED-NO-SHARING': 'No sharing or transfer',
  'S2-FIXED-SAFE-STORAGE': 'Safe storage',
  'S2-FIXED-DISCLOSURE': 'Disclosure of other substances',
  'S2-VAR-PDMP-NY': 'PDMP consent — New York (I-STOP)',
  'S2-VAR-PDMP-NJ': 'PDMP consent — New Jersey',
  'S2-VAR-UDS-STANDARD': 'Drug screening — every 6–12 months',
  'S2-VAR-UDS-ENHANCED': 'Drug screening — about every 3 months',
  'S2-VAR-UDS-HIGHRISK': 'Drug screening — every visit',
  'S2-VAR-NO-EARLY-REFILLS': 'Refill timing',
  'S2-VAR-NO-REPLACEMENT': 'Lost or stolen medication',
  'S2-VAR-ER-FORMULATION': 'Extended-release / prodrug formulation',
  'S2-VAR-PILL-COUNT-ENHANCED': 'Pill counts',
  'S2-VAR-FUNCTIONAL-GOAL': 'Treatment goals (function)',
  'S3-FIXED-PDMP-NY': 'Provider PDMP review — New York',
  'S3-FIXED-PDMP-NJ': 'Provider PDMP review — New Jersey',
  'S3-FIXED-FUNCTIONAL-ASSESSMENT': 'Functional assessment each visit',
  'S3-VAR-NALOXONE': 'Naloxone offer & education',
  'S3-VAR-SPECIALIST-HIGHRISK': 'Specialist involvement',
  'S3-VAR-REASSESSMENT-STANDARD': 'Reassessment — at least annually',
  'S3-VAR-REASSESSMENT-ENHANCED': 'Reassessment — at least every 6 months',
  'S3-VAR-REASSESSMENT-HIGHRISK': 'Reassessment — every visit / ≤3 months',
  'S4-FIXED-MONITORING-FRAMING': 'Monitoring is a safety tool, not punishment',
  'S4-FIXED-GRADUATED-RESPONSE': 'Graduated response to concerns',
  'S4-VAR-DRIVING': 'Driving & safety-sensitive work',
  'S4-VAR-AGE-65': 'Age-related risks (65+)',
  'S4-VAR-COMBO-OPIOID-BENZO': 'Opioid + benzodiazepine combination',
  'S4-VAR-SUD-AWARE': 'Substance-use history',
  'S5-FIXED-ACKNOWLEDGMENT': 'Acknowledgment',
  'S5-FIXED-SIGNATURES': 'Signatures & version stamp',
};

export const SECTION_BLURBS = {
  S1: 'Who is agreeing to what, for which medication — and why it is being prescribed. The indication block changes with how well-established the indication is.',
  S2: 'What the patient agrees to. Core obligations are identical for everyone; monitoring intensity, PDMP wording, and SUD-aware formulation language are modular.',
  S3: 'What the prescriber commits to in return: PDMP review, functional assessment, reassessment cadence, and — when indicated — naloxone and specialist involvement.',
  S4: 'How monitoring findings are handled (graduated, non-punitive), plus situation-specific risk counseling that only appears when it applies.',
  S5: 'Acknowledgment that this is a clinical agreement, not a legal contract, and signatures stamped with the library version.',
};

// ─── Controls (the builder's toggleable inputs) ────────────────────────
export const CONTROLS = [
  {
    key: 'state', name: 'State', color: '#2f6fb3',
    options: ['New York', 'New Jersey'],
    blurb: 'Swaps in the correct state PDMP statute — patient consent and provider duty.',
    clauses: ['S2-VAR-PDMP-NY', 'S2-VAR-PDMP-NJ', 'S3-FIXED-PDMP-NY', 'S3-FIXED-PDMP-NJ'],
  },
  {
    key: 'class', name: 'Substance class', color: '#6a4fb3',
    options: ['Opioid', 'Benzodiazepine', 'Stimulant', 'Multi-class'],
    blurb: 'Fills the medication-class wording throughout and sets the SmartPhrase code; opioid-involving classes feed naloxone logic.',
    clauses: [],
  },
  {
    key: 'indication', name: 'Indication status', color: '#0f7f7a',
    options: ['Established', 'Inherited / presumptive', 'None — pending assessment'],
    blurb: 'Chooses one of three indication statements, from a documented diagnosis to a bridge supply.',
    clauses: ['S1-VAR-INDICATION-ESTABLISHED', 'S1-VAR-INDICATION-INHERITED', 'S1-VAR-INDICATION-NONE'],
  },
  {
    key: 'tier', name: 'Risk tier', color: '#c2410c',
    options: ['Standard', 'Enhanced', 'High-risk'],
    blurb: 'Auto-suggested from the risk inputs, always confirmable or overridable. Sets drug-screen frequency, pill counts, reassessment cadence, specialist involvement and review date.',
    clauses: ['S2-VAR-UDS-STANDARD', 'S2-VAR-UDS-ENHANCED', 'S2-VAR-UDS-HIGHRISK', 'S2-VAR-PILL-COUNT-ENHANCED', 'S3-VAR-REASSESSMENT-STANDARD', 'S3-VAR-REASSESSMENT-ENHANCED', 'S3-VAR-REASSESSMENT-HIGHRISK', 'S3-VAR-SPECIALIST-HIGHRISK'],
  },
  {
    key: 'sud', name: 'SUD history', color: '#a21caf',
    options: ['None', 'Past', 'Active'],
    blurb: 'Past or active SUD adds formulation and SUD-aware language, and raises the suggested tier unless a specialist is involved.',
    clauses: ['S2-VAR-ER-FORMULATION', 'S4-VAR-SUD-AWARE'],
  },
  {
    key: 'combo', name: 'Opioid + benzodiazepine', color: '#b91c1c',
    options: ['Off', 'On'],
    blurb: 'Adds the combination-risk acknowledgment, forces naloxone on, and suggests High-risk.',
    clauses: ['S4-VAR-COMBO-OPIOID-BENZO'],
  },
  {
    key: 'age', name: 'Age ≥ 65', color: '#b45309',
    options: ['Off', 'On'],
    blurb: 'Adds Beers-criteria counseling on falls, fractures and cognition; suggests at least Enhanced.',
    clauses: ['S4-VAR-AGE-65'],
  },
  {
    key: 'driving', name: 'Driving / safety-sensitive', color: '#4d7c0f',
    options: ['Off', 'On'],
    blurb: 'Adds documented counseling on impairment and occupational reporting obligations.',
    clauses: ['S4-VAR-DRIVING'],
  },
  {
    key: 'naloxone', name: 'Naloxone', color: '#0369a1',
    options: ['Not indicated', 'Offered'],
    blurb: 'Auto-on for opioid + benzo, or an opioid-involving class with a dose or SUD flag. Overridable.',
    clauses: ['S3-VAR-NALOXONE'],
  },
  {
    key: 'tierInputs', name: 'Other risk inputs', color: '#64748b',
    options: ['Concurrent CS', 'Dose ≥ threshold', 'Early-fill history', 'Prior lost meds', 'Specialist involved'],
    blurb: 'Add no text of their own — they drive the risk-tier suggestion, which then drives the tier blocks.',
    clauses: [],
  },
];

export const controlForClause = Object.fromEntries(
  CONTROLS.flatMap((c) => c.clauses.map((id) => [id, c])),
);

// ─── Logic (shared with the in-browser builder) ────────────────────────
export const { suggestTier, autoNaloxone, substitute, assemble } = makeLogic(LIB);

// ─── Demonstration patients ────────────────────────────────────────────
const base = {
  sud_history: 'none', concurrent_cs: 'none', combo_opioid_benzo: false, age_65_plus: false,
  dose_above_threshold: false, early_fill_history: false, driving_or_safety_sensitive: false,
  prior_lost_medication: false, indication_status: 'established', specialist_involved: false,
  tier_override: null, naloxone_override: null,
};

export const PATIENTS = [
  {
    id: 'a', label: 'Patient A',
    sketch: '82-year-old man, chronic low back pain. Takes half a tramadol a few times a month. Same PCP for 15 years. Clean PDMP. New York.',
    settings: ['Opioid', 'New York', 'Established indication', 'Age ≥ 65'],
    inputs: { ...base, substance_class: 'opioid', state: 'NY', age_65_plus: true },
  },
  {
    id: 'b', label: 'Patient B',
    sketch: '44-year-old with chronic pain, severe anxiety and ADHD — on an opioid, a benzodiazepine and a stimulant. Past SUD; PDMP shows early fills and a lost-medication report. New Jersey; drives for work.',
    settings: ['Multi-class', 'New Jersey', 'Established indication', 'Past SUD', 'Cross-class CS', 'Opioid + benzo', 'Early fills', 'Prior lost meds', 'Driving'],
    inputs: {
      ...base, substance_class: 'multi-class', state: 'NJ', sud_history: 'past', concurrent_cs: 'cross-class',
      combo_opioid_benzo: true, early_fill_history: true, prior_lost_medication: true, driving_or_safety_sensitive: true,
    },
  },
];

// ─── References ────────────────────────────────────────────────────────
// Matched against each clause's `authority` string. Links only where a
// stable public source exists; others are cited as the module cites them.
export const REFERENCES = [
  { key: 'cdc2022', re: /CDC 2022/, cite: 'Dowell D, Ragan KR, Jones CM, Baldwin GT, Chou R. CDC Clinical Practice Guideline for Prescribing Opioids for Pain — United States, 2022. MMWR Recomm Rep 2022;71(No. RR-3):1–95.', url: 'https://www.cdc.gov/mmwr/volumes/71/rr/rr7103a1.htm' },
  { key: 'benzo2025', re: /ASAM\/ACMT 2025/, cite: 'ASAM and partner societies (incl. ACMT). Joint Clinical Practice Guideline on Benzodiazepine Tapering, 2025.', url: 'https://www.asam.org/quality-care/clinical-guidelines' },
  { key: 'stim2024', re: /ASAM\/AAAP 2024/, cite: 'ASAM / AAAP. Clinical Practice Guideline on the Management of Stimulant Use Disorder, 2024.', url: 'https://www.asam.org/quality-care/clinical-guidelines' },
  { key: 'aps2009', re: /AAPM\/APS|APS\/AAPM/, cite: 'Chou R, Fanciullo GJ, Fine PG, et al. Clinical guidelines for the use of chronic opioid therapy in chronic noncancer pain (APS/AAPM). J Pain 2009;10(2):113–130.', url: 'https://doi.org/10.1016/j.jpain.2008.10.008' },
  { key: 'vadod', re: /VA\/DoD 2022/, cite: 'VA/DoD Clinical Practice Guideline for the Use of Opioids in the Management of Chronic Pain, 2022.', url: 'https://www.healthquality.va.gov/guidelines/pain/cot/' },
  { key: 'aafp', re: /AAFP/, cite: 'American Academy of Family Physicians — guidance on chronic opioid therapy and avoiding patient dismissal (as cited in the module).' },
  { key: 'beers', re: /Beers/, cite: '2023 American Geriatrics Society Beers Criteria® Update Expert Panel. American Geriatrics Society 2023 updated AGS Beers Criteria® for potentially inappropriate medication use in older adults. J Am Geriatr Soc 2023;71(7):2052–2081.', url: 'https://doi.org/10.1111/jgs.18372' },
  { key: 'donnelly', re: /Donnelly/, cite: 'Donnelly K, et al. Benzodiazepines, Z-drugs and the risk of hip fracture: a systematic review and meta-analysis. PLoS One 2017.' },
  { key: 'crowe', re: /Crowe/, cite: 'Crowe SF, Stranks EK. The residual medium and long-term cognitive effects of benzodiazepine use: an updated meta-analysis. Arch Clin Neuropsychol 2018;33(7):901–911.' },
  { key: 'fda2016', re: /FDA boxed warning/, cite: 'US FDA Drug Safety Communication (Aug 2016): FDA warns about serious risks and death when combining opioid pain or cough medicines with benzodiazepines; requires its strongest warning.', url: 'https://www.fda.gov/drugs/drug-safety-and-availability/fda-drug-safety-communication-fda-warns-about-serious-risks-and-death-when-combining-opioid-pain-or' },
  { key: 'hernandez', re: /Hernandez/, cite: 'Hernandez I, He M, Brooks MM, Zhang Y. Exposure-response association between concurrent opioid and benzodiazepine use and risk of opioid-related overdose in Medicare Part D beneficiaries. JAMA Netw Open 2018;1(2):e180919.', url: 'https://doi.org/10.1001/jamanetworkopen.2018.0919' },
  { key: 'dassanayake', re: /Dassanayake/, cite: 'Dassanayake T, Michie P, Carter G, Jones A. Effects of benzodiazepines, antidepressants and opioids on driving: a systematic review and meta-analysis of epidemiological and experimental evidence. Drug Saf 2011;34(2):125–156.' },
  { key: 'tran', re: /Tran JAMA/, cite: 'Tran et al. JAMA Network Open 2024 — state-by-state driver medical reporting obligations (as cited in the module).' },
  { key: 'faa', re: /FAA\/FMCSA/, cite: 'FAA (14 CFR Part 67) and FMCSA (49 CFR Part 391) medical standards for safety-sensitive occupations.' },
  { key: 'baweja', re: /Baweja/, cite: 'Baweja et al. J Am Acad Child Adolesc Psychiatry 2025 — outcomes data on stimulant prescribing with SUD history (as cited in the module).' },
  { key: 'acoem', re: /ACOEM/, cite: 'American College of Occupational and Environmental Medicine — Opioid Treatment Agreement template.' },
  { key: 'cfr130604', re: /1306\.04/, cite: '21 CFR §1306.04 — Purpose of issue of prescription (legitimate medical purpose).', url: 'https://www.law.cornell.edu/cfr/text/21/1306.04' },
  { key: 'cfr130612', re: /1306\.12/, cite: '21 CFR §1306.12 — Refilling prescriptions; issuance of multiple prescriptions (up to 90-day supply).', url: 'https://www.law.cornell.edu/cfr/text/21/1306.12' },
  { key: 'usc841', re: /21 USC §841/, cite: '21 USC §841 — Prohibited acts A (unlawful distribution).', url: 'https://www.law.cornell.edu/uscode/text/21/841' },
  { key: 'nyistop', re: /3343-a/, cite: 'New York Public Health Law §3343-a — Prescription Monitoring Program registry; duty to consult (I-STOP).', url: 'https://www.nysenate.gov/legislation/laws/PBH/3343-A' },
  { key: 'njpmp', re: /45:1-46\.1/, cite: 'N.J.S.A. 45:1-46.1 (P.L.2017, c.341) — PMP access requirements for practitioners.', url: 'https://law.justia.com/codes/new-jersey/title-45/section-45-1-46-1/' },
  { key: 'dea', re: /DEA guidance/, cite: 'DEA consumer guidance on safe storage and disposal of controlled-substance medications.' },
];

export function refsFor(clause) {
  return REFERENCES.filter((r) => r.re.test(clause.authority));
}
