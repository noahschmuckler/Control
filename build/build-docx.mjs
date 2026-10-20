// Generates the Word clause library. Run: node build/build-docx.mjs

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import {
  LIB, SECTIONS, CLAUSES, CLAUSE_TITLES, SECTION_BLURBS, CONTROLS, REFERENCES, refsFor, VERSION_STAMP,
} from './model.mjs';

const require = createRequire(import.meta.url);
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType,
  ShadingType, BorderStyle, AlignmentType, LevelFormat, Footer, PageNumber, ExternalHyperlink,
} = require('docx');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'downloads', 'Controlled-Substance-Agreement-Clause-Library.docx');
const refIndex = Object.fromEntries(REFERENCES.map((r, i) => [r.key, i + 1]));
const FONT = 'Calibri';
const CONTENT_W = 9360; // 6.5" in DXA

const p = (text, opts = {}) => new Paragraph({ spacing: { after: 120 }, ...opts, children: [new TextRun({ text, ...(opts.run ?? {}) })] });
const bullet = (children) => new Paragraph({ numbering: { reference: 'bullets', level: 0 }, spacing: { after: 60 }, children });

function ruleText(c) {
  if (!c.condition) return 'Always included';
  const { field, eq, in: inn } = c.condition;
  const label = {
    indication_status: 'Indication status', state: 'State', risk_tier: 'Risk tier', sud_history: 'SUD history',
    naloxone_indicated: 'Naloxone', driving_or_safety_sensitive: 'Driving / safety-sensitive',
    age_65_plus: 'Age ≥ 65', combo_opioid_benzo: 'Opioid + benzodiazepine',
  }[field] ?? field;
  return `Included when ${label} = ${inn ? inn.join(' or ') : eq === true ? 'on' : eq}`;
}

const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: 'D0CCC2' };
const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
function cell(text, width, { bold, fill } = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA }, borders,
    shading: fill ? { fill, type: ShadingType.CLEAR, color: 'auto' } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({ children: [new TextRun({ text, bold, size: 19 })] })],
  });
}
function table(widths, rows, header) {
  return new Table({
    width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, children: header.map((h, i) => cell(h, widths[i], { bold: true, fill: 'EDEAE3' })) }),
      ...rows.map((r) => new TableRow({ children: r.map((t, i) => cell(t, widths[i])) })),
    ],
  });
}

// Exact clause text as a shaded, left-ruled block; one paragraph per line.
function clauseTextBlock(text) {
  return text.split('\n').filter((l, i, a) => l.trim() || (i > 0 && a[i - 1].trim())).map((line, i, arr) => new Paragraph({
    shading: { fill: 'F5F3EE', type: ShadingType.CLEAR, color: 'auto' },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color: '1F4E79', space: 8 } },
    indent: { left: 160, right: 160 },
    spacing: { before: i === 0 ? 80 : 0, after: i === arr.length - 1 ? 160 : 0, line: 288 },
    children: [new TextRun({ text: line || ' ', font: 'Cambria', size: 21 })],
  }));
}

function meta(label, value, extra = []) {
  return new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: `${label}: `, bold: true, size: 18, color: '555B63' }), new TextRun({ text: value, size: 18, color: '555B63' }), ...extra] });
}

const children = [];
children.push(new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun('Modular Controlled-Substance Prescribing Agreement')] }));
children.push(p(`Clause library ${VERSION_STAMP} · Scope: ${LIB.scope} · Opioids, benzodiazepines and stimulants`, { run: { color: '555B63' } }));

children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('How the agreement is assembled')] }));
children.push(p(`Every agreement uses the same five sections. ${CLAUSES.filter((c) => !c.condition).length} of the ${CLAUSES.length} text blocks appear in every agreement; the rest are included or excluded by the controls the prescriber sets. Bracketed fields such as [MEDICATION] are completed at signing; [MEDICATION CLASS] is filled from the substance class.`));
children.push(table([2000, 2860, 4500], CONTROLS.map((c) => [c.name, c.options.join(' / '), c.blurb]), ['Control', 'Options', 'What it changes']));
children.push(p(''));

children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('How the risk tier is suggested')] }));
children.push(p('High-risk if any of: active SUD without specialist involvement; concurrent opioid + benzodiazepine; cross-class concurrent controlled substances; prior lost-medication report; no indication at a dose at or above threshold.'));
children.push(p('Otherwise Enhanced if any of: past or active SUD without specialist involvement; early-fill history; dose at or above threshold; age ≥ 65; inherited / presumptive indication; same-class concurrent controlled substance.'));
children.push(p('Otherwise Standard.'));
children.push(p(`The prescriber confirms or overrides the suggested tier; overrides are flagged. Next review: Standard ${LIB.next_review_offset_months.standard} months, Enhanced ${LIB.next_review_offset_months.enhanced} months, High-risk ${LIB.next_review_offset_months['high-risk']} months. Naloxone is offered automatically for any opioid + benzodiazepine combination, or for an opioid-involving class (opioid, multi-class) with dose at or above threshold or any SUD history; this is also overridable.`));
children.push(table([2340, 2340, 2340, 2340], Object.keys(LIB.class_labels).map((k) => [
  { opioid: 'Opioid', benzo: 'Benzodiazepine', stimulant: 'Stimulant', 'multi-class': 'Multi-class' }[k], `“${LIB.class_labels[k]}”`, LIB.class_codes[k], `.CSAGREE-${LIB.class_codes[k]}-[NY|NJ]-[STD|ENH|HR]`,
]), ['Substance class', '[MEDICATION CLASS] becomes', 'Code', 'SmartPhrase name']));

SECTIONS.forEach((s, i) => {
  children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: i === 0, keepNext: true, children: [new TextRun(`Section ${i + 1} — ${s.title}`)] }));
  children.push(p(SECTION_BLURBS[s.section_id], { run: { italics: true } }));
  for (const c of s.clauses) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, keepNext: true, children: [new TextRun(CLAUSE_TITLES[c.clause_id])] }));
    const refs = refsFor(c);
    children.push(meta('Block ID', c.clause_id));
    children.push(meta('Inclusion rule', ruleText(c)));
    children.push(meta('Authority', c.authority, refs.length ? [new TextRun({ text: `  [${refs.map((r) => refIndex[r.key]).join(', ')}]`, size: 18, color: '1F4E79' })] : []));
    children.push(meta('Status', c.proposed_institutional_standard ? 'Proposed institutional standard — no national mandate' : 'Grounded in statute / guideline'));
    children.push(...clauseTextBlock(c.text.replace(/\[VERSION STAMP\]/g, VERSION_STAMP)));
  }
});

children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new TextRun('References')] }));
REFERENCES.forEach((r, i) => {
  children.push(new Paragraph({
    spacing: { after: 100 }, indent: { left: 440, hanging: 440 },
    children: [
      new TextRun({ text: `${i + 1}.\t${r.cite}`, size: 20 }),
      ...(r.url ? [new TextRun({ text: ' ', size: 20 }), new ExternalHyperlink({ link: r.url, children: [new TextRun({ text: r.url, style: 'Hyperlink', size: 18 })] })] : []),
    ],
  }));
});

const doc = new Document({
  creator: 'CS Agreement Builder',
  title: 'Modular Controlled-Substance Prescribing Agreement — Clause Library',
  styles: {
    default: { document: { run: { font: FONT, size: 21 } } },
    paragraphStyles: [
      { id: 'Title', name: 'Title', basedOn: 'Normal', run: { size: 44, bold: true, font: 'Cambria', color: '1D232B' }, paragraph: { spacing: { after: 120 } } },
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 32, bold: true, font: 'Cambria', color: '1F4E79' }, paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 24, bold: true, color: '1D232B' }, paragraph: { spacing: { before: 240, after: 60 }, outlineLevel: 1 } },
    ],
  },
  numbering: { config: [{ reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }] },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `Clause library ${VERSION_STAMP} · page `, size: 16, color: '888888' }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '888888' })] })] }) },
    children,
  }],
});

writeFileSync(OUT, await Packer.toBuffer(doc));
console.log('wrote', OUT, CONTENT_W && '');
