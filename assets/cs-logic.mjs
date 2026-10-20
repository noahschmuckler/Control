// Contract assembly rules, shared by the build (presentation pages, Word
// export) and the in-browser contract builder. Ported from the original
// builder: risk-tier suggestion, naloxone auto-logic, clause selection.

export function makeLogic(lib) {
  const sections = [...lib.sections].sort((a, b) => a.order - b.order);
  const versionStamp = `v${lib.schema_version} (${lib.change_log[0]?.date ?? ''})`;

  function suggestTier(inp) {
    const high = [];
    if (inp.sud_history === 'active' && !inp.specialist_involved) high.push('active SUD without specialist involvement');
    if (inp.combo_opioid_benzo) high.push('concurrent opioid + benzodiazepine');
    if (inp.concurrent_cs === 'cross-class') high.push('cross-class concurrent controlled substances');
    if (inp.prior_lost_medication) high.push('prior lost-medication report');
    if (inp.indication_status === 'none-pending-assessment' && inp.dose_above_threshold) high.push('no indication at high dose');
    if (high.length > 0) return { tier: 'high-risk', reasons: high };

    const enh = [];
    if ((inp.sud_history === 'past' || inp.sud_history === 'active') && !inp.specialist_involved) enh.push('SUD history without specialist involvement');
    if (inp.early_fill_history) enh.push('early-fill history');
    if (inp.dose_above_threshold) enh.push('dose at or above threshold');
    if (inp.age_65_plus) enh.push('age ≥ 65');
    if (inp.indication_status === 'inherited-presumptive') enh.push('inherited-presumptive indication');
    if (inp.concurrent_cs === 'same-class') enh.push('concurrent same-class controlled substance');
    if (enh.length > 0) return { tier: 'enhanced', reasons: enh };
    return { tier: 'standard', reasons: [] };
  }

  function autoNaloxone(cls, t) {
    if (t.combo_opioid_benzo) return true;
    const opioidInvolving = cls === 'opioid' || cls === 'multi-class';
    return opioidInvolving && (t.dose_above_threshold || t.sud_history !== 'none');
  }

  function matches(clause, inp) {
    const c = clause.condition;
    if (!c) return true;
    const v = inp[c.field];
    if (c.in) return c.in.includes(String(v));
    if (c.eq !== undefined) return v === c.eq;
    return false;
  }

  function substitute(text, cls) {
    return text
      .replace(/\[MEDICATION CLASS\]/g, cls ? lib.class_labels[cls] : '[MEDICATION CLASS]')
      .replace(/\[VERSION STAMP\]/g, versionStamp);
  }

  function assemble(raw) {
    const suggestion = suggestTier(raw);
    const risk_tier = raw.tier_override ?? suggestion.tier;
    const naloxone_indicated = raw.naloxone_override ?? autoNaloxone(raw.substance_class, raw);
    const inp = { ...raw, risk_tier, naloxone_indicated };
    const out = [];
    for (const sec of sections) {
      const clauses = sec.clauses.filter((cl) => matches(cl, inp)).map((cl) => ({
        ...cl, rendered: substitute(cl.text, inp.substance_class),
      }));
      if (clauses.length) out.push({ ...sec, clauses });
    }
    const trigger = `.CSAGREE-${lib.class_codes[inp.substance_class]}-${inp.state}-${lib.tier_codes[risk_tier]}`;
    const included = new Set(out.flatMap((s) => s.clauses.map((c) => c.clause_id)));
    const words = out.flatMap((s) => s.clauses).reduce((n, c) => n + c.rendered.split(/\s+/).length, 0);
    return { inp, suggestion, sections: out, trigger, included, words, reviewMonths: lib.next_review_offset_months[risk_tier] };
  }

  return { sections, versionStamp, suggestTier, autoNaloxone, substitute, assemble };
}
