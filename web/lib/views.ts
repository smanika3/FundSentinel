import "server-only";
import { json, s3Json, sql } from "./db";

// ---------------------------------------------------------------- plain-language formatting

const REVIEWERS = ["analyst", "compliance", "finance", "suitability"] as const;
const TITLE: Record<string, string> = {
  analyst: "Analyst", compliance: "Compliance", finance: "Finance", suitability: "Suitability",
  supervisor: "Supervisor", evidence_checker: "Evidence checker", guardrail: "Safety rule", orchestrator: "Pipeline",
  radar: "Change checker", decision_owner: "Decision owner",
};

const FIELD_LABEL: Record<string, string> = {
  fund_id: "Fund ID", ticker: "Ticker", fund_name: "Fund name", fund_family: "Fund family", category: "Category",
  benchmark: "Benchmark", currency: "Currency", expense_ratio: "Fee", category_expense_ratio: "Category average fee",
  risk_score: "Risk score", return_1y: "1-year return", return_3y: "3-year return", return_5y: "5-year return",
  category_return_5y: "Category 5-year return", total_net_assets: "Fund size", inception_date: "Launch date",
  fund_age_years: "Fund age", as_of_date: "As-of date", source_ref: "Source row",
  x_fee_vs_category: "Fee vs category average", x_return_5y_vs_category: "5-year return vs category",
  x_history_years: "Track record", x_total_net_assets_usd: "Size in USD", x_risk_band: "Risk band",
  premium_over_category: "Fee vs category average", return_5y_minus_category: "5-year return vs category",
  history_years: "Track record", total_net_assets_usd: "Size in USD", data_quality_flag: "Data warning",
};
// Which reviewer checks which field (copied from config/radar.json) — used to say why each reviewer was reopened.
const FIELD_REVIEWERS: Record<string, string[]> = {"expense_ratio": ["finance"], "category_expense_ratio": ["finance"], "return_1y": ["analyst"], "return_3y": ["analyst"], "return_5y": ["analyst"], "category_return_5y": ["analyst"], "benchmark": ["analyst", "suitability"], "inception_date": ["analyst", "compliance"], "fund_age_years": ["analyst", "compliance"], "risk_score": ["suitability"], "category": ["compliance", "analyst", "suitability"], "total_net_assets": ["compliance"], "currency": ["compliance", "finance"], "fund_name": ["compliance"], "fund_family": ["compliance"], "ticker": ["compliance"], "as_of_date": []};

const RATE = new Set(["expense_ratio", "category_expense_ratio", "return_1y", "return_3y", "return_5y", "category_return_5y"]);
const POINTS = new Set(["return_5y_minus_category", "x_return_5y_vs_category"]);
const RELATIVE = new Set(["premium_over_category", "x_fee_vs_category"]);
const MONEY = new Set(["total_net_assets", "total_net_assets_usd", "x_total_net_assets_usd"]);

export const label = (f: string) =>
  FIELD_LABEL[f] ?? (f.startsWith("x_") ? f.slice(2).replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()) : f.replace(/_/g, " "));

function num(v: unknown): number | null {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v))) return Number(v);
  return null;
}

export function money(v: number, ccy = "USD"): string {
  const sym = ccy === "USD" ? "$" : ccy === "INR" ? "₹" : ccy + " ";
  const a = Math.abs(v), s = v < 0 ? "−" : "";
  if (a >= 1e9) return `${s}${sym}${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${s}${sym}${(a / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${s}${sym}${Math.round(a / 1e3).toLocaleString("en-US")}K`;
  return `${s}${sym}${a.toLocaleString("en-US")}`;
}

export function fmt(field: string, v: unknown, ccy?: string): string {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "none";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return dateText(v)!;
  const n = num(v);
  if (n === null) return String(v);
  if (RATE.has(field)) return `${(n * 100).toFixed(2)}%`;
  if (POINTS.has(field)) return `${n >= 0 ? "+" : "−"}${Math.abs(n * 100).toFixed(2)} pts`;
  if (RELATIVE.has(field)) return `${n >= 0 ? "+" : "−"}${Math.abs(n * 100).toFixed(0)}% vs peers`;
  if (MONEY.has(field)) return money(n, field === "total_net_assets" ? ccy : "USD");
  if (field === "risk_score") return `${n} of 5`;
  if (field === "history_years" || field === "x_history_years" || field === "fund_age_years") return `${n.toFixed(1)} years`;
  return Number.isInteger(n) ? n.toLocaleString("en-US") : String(Math.round(n * 10000) / 10000);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2021-10-29" -> "29 Oct 2021"; anything else is returned as-is. */
export function dateText(d?: string | null): string | null {
  if (!d) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d));
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : String(d);
}

/** One line for a run's data dates: "data as of 29 Oct 2021", or the range when funds differ. */
function asOfSummary(dates: (string | null)[]): string | null {
  const ds = Array.from(new Set(dates.filter(Boolean) as string[])).sort();
  if (!ds.length) return null;
  const missing = dates.length - dates.filter(Boolean).length;
  const base = ds.length === 1 ? `data as of ${dateText(ds[0])}` : `data as of ${dateText(ds[0])} to ${dateText(ds[ds.length - 1])}`;
  return missing ? `${base} (${missing} fund${missing === 1 ? "" : "s"} undated)` : base;
}

export function ruleText(rule?: string | null): string {
  if (!rule) return "—";
  const [key, raw] = rule.split("=");
  const x = raw !== undefined ? Number(raw) : NaN;
  switch (key) {
    case "finance.max_expense_ratio": return `Fee ≤ ${(x * 100).toFixed(2)}%`;
    case "finance.max_premium_over_category": return `Fee at most ${(x * 100).toFixed(0)}% above peers`;
    case "analyst.min_history_years": return `At least ${x} years of history`;
    case "analyst.implausible_return_1y": return `1-year return below ${(x * 100).toFixed(0)}%`;
    case "analyst.max_underperformance_vs_category_5y": return `Within ${(x * 100).toFixed(0)} pts of category over 5 years`;
    case "compliance.prohibited_category_keywords": return "No banned product types";
    case "compliance.min_total_net_assets_usd": return `Size ≥ ${money(x)}`;
    case "compliance.min_track_record_years": return `At least ${x} year${x === 1 ? "" : "s"} old`;
    case "compliance.required_fields": return "Required data present";
    case "suitability.general_investor_max_risk": return `Risk ≤ ${x} for general investors`;
    default: return rule;
  }
}

const RULE_APPLIED: Record<string, string> = {
  compliance_fail_rejects: "Compliance fail always means rejection",
  evidence_unverified: "A verdict that can't be proven goes to a person",
  evidence_required: "A verdict needs evidence",
  selfheal_quarantine: "A fund that can't be checked is set aside",
  radar_carried_forward: "Routine update: the previous decision stands",
  decision_owner_error: "The Decision owner couldn't run",
};

export const OUTCOME: Record<string, string> = {
  approved: "approved", approved_with_conditions: "conditions", rejected: "rejected",
  flagged_for_review: "person", sent_back: "person", quarantined: "quarantined",
};
const VERDICT: Record<string, string> = { pass: "pass", concern: "concern", fail: "fail", cannot_assess: "na" };

/** Replace snake_case field names in rule-written text with plain words ("expense_ratio missing" -> "fee missing"). */
const KIND_LABEL: Record<string, string> = {
  out_of_range: "out-of-range value", ticker_unknown: "ticker not in the SEC list", category_typo: "category typo",
  missing_required: "missing required value", impossible_date: "impossible date", shared_name: "name used by another fund",
  implausible_value: "unusually high value", duplicate_row: "duplicate row", duplicate_id: "duplicate fund ID",
  ai_inconsistency: "contradiction spotted by the Quality inspector", unreadable: "unreadable value",
  // tool-output keys and labels the agents sometimes quote
  missing_required_fields: "missing required fields", data_quality_flags: "data warnings", fund_flags: "fund warnings",
  cannot_assess: "can't assess", approved_with_conditions: "approved with conditions", flagged_for_review: "needs a person",
  prohibited_category_keywords: "banned product types", min_total_net_assets_usd: "minimum fund size",
  min_track_record_years: "minimum age", max_expense_ratio: "fee cap", max_premium_over_category: "fee limit versus similar funds",
  general_investor_max_risk: "risk limit for general investors", min_history_years: "minimum history",
};
// Code words the agents and the pipeline write, and what a non-expert would say instead.
const WORDS: [RegExp, string][] = [
  [/\bSelfHeal fix\b/g, "Repaired by AI"], [/\bSelfHeal best guess\b/g, "AI best guess"],
  [/\bSelfHeal\b/g, "the data repairer"], [/\bthe Profiler\b/g, "the column reader"], [/\bProfiler\b/g, "column reader"],
  [/\bQuality agent\b/g, "Quality inspector"], [/\bRadar-lite agent\b/g, "change checker"],
  [/'x_' derived fields/g, "calculated fields"], [/\ba constant value\b/g, "the same value for every fund"], [/\bis null\b/g, "is empty"], [/\bnull\b/g, "empty"],
  [/\bISO[- ]formatted\b/gi, "standard-format"], [/\bISO 8601\b/g, "standard"], [/\bISO currency code\b/g, "currency code"],
  [/\bISO dates?\b/g, "standard dates"],
  [/\bparsed\b/g, "read"], [/\bparses\b/g, "reads"], [/\bparsing\b/g, "reading"], [/\bparse\b/g, "read"],
  [/\bfractions\b/g, "decimals"], [/\bfraction\b/g, "decimal"],
  [/\bnormali[sz]ed\b/g, "converted"], [/\bnormali[sz]ation\b/g, "conversion"],
  [/\bcanonical (schema|field|column)s?\b/g, "standard $1"], [/\bcanonical\b/g, "standard"],
  [/\bordinal\b/g, "ranked"], [/\bsimplistic proxy\b/g, "rough stand-in"], [/\bproxy\b/g, "stand-in"],
  [/\bvia value_map\b/g, "(word turned into a number)"], [/\bvalue_map\b/g, "word-to-number table"],
  [/\bmock fx\b/g, "demo exchange rate"], [/\bbps basis points\b/g, "basis points"],
  [/\s?->\s?/g, " → "],
];

/** Plain words for agent- and pipeline-written text: field codes become labels ("expense_ratio" -> "fee"). */
export function plain(text?: string | null): string {
  let t = (text ?? "").replace(/\b[a-z]+(?:_[a-z0-9]+)+\b/g, (w) =>
    FIELD_LABEL[w] ? FIELD_LABEL[w].toLowerCase() : KIND_LABEL[w] ?? (w.startsWith("x_") ? label(w).toLowerCase() : w));
  for (const [re, to] of WORDS) t = t.replace(re, to);
  return t;
}

/** How a value was produced, from the pipeline's transform note ("derived: a / b - 1", "constant", "generated"). */
function howText(t: string | null): string {
  if (!t) return "Copied as-is";
  if (t === "constant") return "Same for every fund";
  if (t === "generated") return "Added by FundSentinel";
  if (t.startsWith("derived: ")) return "Calculated: " + plain(t.slice(9)).replace(/ \/ /g, " ÷ ").replace(/ x /g, " × ");
  return plain(t);
}

/** Units written by the pipeline and the data describer, in plain words. */
function unitText(u?: string | null): string {
  if (!u) return "—";
  if (/^date\b/i.test(u)) return "date";
  if (/^constant /.test(u)) return `same for every fund (${u.slice(9)})`;
  if (u === "fraction") return "decimal (0.0075)";
  if (u === "percent") return "percent (0.75)";
  if (u === "bps") return "basis points (75)";
  if (u === "auto") return "worked out per value";
  return plain(u).replace(/\btext \(currency code\)/, "currency code");
}

/** "finance=fail", "implausible_value", "quarantine: …" -> plain words for the RedTeam "What caught it" column. */
function caughtBy(code: string): string {
  const m = /^(analyst|compliance|finance|suitability)=(fail|concern|cannot_assess)$/.exec(code);
  if (m) return `${TITLE[m[1]]} ${m[2] === "fail" ? "failed it" : m[2] === "concern" ? "raised a concern" : "couldn't assess it"}`;
  if (code.startsWith("quarantine:")) return "Set aside: " + plain(code.slice(11).trim()).replace(/^Cannot check: /, "");
  const k = KIND_LABEL[code];
  return k ? k.charAt(0).toUpperCase() + k.slice(1) : code;
}

/** First sentence, for one-line table cells; the full reason is on the Fund page. */
export function firstSentence(text?: string | null, max = 160): string {
  const t = plain(text).trim();
  const m = /^(.+?[.!?])(\s|$)/.exec(t);
  const s = m ? m[1] : t;
  return s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s;
}

const rowOf = (ref?: string | null) => {
  const m = /#row(\d+)$/.exec(ref ?? "");
  return m ? `Row ${m[1]} of the file` : ref === "computed" ? "Calculated" : ref ?? "—";
};

function when(ts?: string | null): string {
  if (!ts) return "";
  const d = new Date(ts.replace(" ", "T") + (ts.endsWith("Z") ? "" : "Z"));
  const today = new Date();
  const t = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "America/Phoenix" });
  if (d.toDateString() === today.toDateString()) return `Today, ${t}`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "America/Phoenix" }) + `, ${t}`;
}

export const SAVED_LAYOUTS: Record<string, string> = { yahoo_us_mutualfunds: "Yahoo US funds", test_versions: "test files" };
function mappingText(m?: string | null): string {
  if (!m || m === "profiler-agent") return "columns read automatically";
  if (m.startsWith("radar vs ")) return "same column layout as the earlier run";
  const name = m.split("/").pop()!.replace(/\.json$/, "");
  return "saved column layout: " + (SAVED_LAYOUTS[name] ?? name);
}

// ---------------------------------------------------------------- runs

export type RunSummary = {
  id: string; file: string; funds: number; seconds: number; duration: string; type: "review" | "update" | "redteam";
  when: string; mapping: string; baseline: string | null;
};

export async function listRuns(): Promise<RunSummary[]> {
  const rows = await sql(`SELECT run_id, source, mapping, funds, seconds, updated_at, baseline_run_id,
                                 (redteam IS NOT NULL) AS is_redteam FROM runs ORDER BY updated_at DESC`);
  return rows.map((r) => ({
    id: r.run_id, file: r.source, funds: r.funds ?? 0, seconds: Math.round(r.seconds ?? 0),
    duration: `${Math.round(r.seconds ?? 0)} s`,
    type: r.baseline_run_id ? "update" : r.is_redteam ? "redteam" : "review",
    when: when(r.updated_at), mapping: mappingText(r.mapping), baseline: r.baseline_run_id ?? null,
  }));
}

type FundRow = {
  ticker: string; name: string; category: string | null; outcome: string; reason: string; v: string[];
  time: string; rule?: string; conditions?: string[]; setAside?: string; sendbacks?: number;
};

export async function getRun(runId: string) {
  const [meta] = await sql(`SELECT run_id, source, mapping, funds, seconds, updated_at, baseline_run_id, redteam
                            FROM runs WHERE run_id = :r`, { r: runId });
  if (!meta) return null;
  const [decisions, verdicts, events] = await Promise.all([
    sql(`SELECT d.fund_id, f.fund_name, f.category, d.decision, d.decided_by, d.rule_applied, d.reason, d.conditions,
                f.record->>'quarantine_reason' AS quarantine_reason, f.record->'fields'->'as_of_date'->>'value' AS as_of
         FROM decisions d JOIN funds f USING (run_id, fund_id) WHERE d.run_id = :r ORDER BY d.fund_id`, { r: runId }),
    sql(`SELECT fund_id, reviewer, verdict FROM verdicts WHERE run_id = :r`, { r: runId }),
    sql(`SELECT fund_id, actor, event, min(t) AS t0, max(t) AS t1, count(*) AS n FROM review_events
         WHERE run_id = :r GROUP BY fund_id, actor, event`, { r: runId }),
  ]);
  const vmap: Record<string, Record<string, string>> = {};
  verdicts.forEach((v) => ((vmap[v.fund_id] ??= {})[v.reviewer] = v.verdict));
  const span: Record<string, { t0: number; t1: number }> = {};
  let supSends = 0, evSends = 0;
  const sendsByFund: Record<string, number> = {};
  events.forEach((e) => {
    const s = (span[e.fund_id] ??= { t0: Infinity, t1: 0 });
    s.t0 = Math.min(s.t0, e.t0); s.t1 = Math.max(s.t1, e.t1);
    if (e.event === "sent_back") {
      sendsByFund[e.fund_id] = (sendsByFund[e.fund_id] ?? 0) + Number(e.n);
      if (e.actor === "supervisor") supSends += Number(e.n);
      if (e.actor === "evidence_checker") evSends += Number(e.n);
    }
  });
  const isRadar = !!meta.baseline_run_id;
  const funds: FundRow[] = decisions.map((d) => {
    const vs = vmap[d.fund_id] ?? {};
    const compFail = vs.compliance === "fail";
    const outcome = OUTCOME[d.decision] ?? "person";
    const v = REVIEWERS.map((n) => {
      if (vs[n]) return VERDICT[vs[n]] ?? "na";
      if (outcome === "quarantined") return "na";
      if (compFail) return "skipped";
      return isRadar ? "carried" : "na";
    });
    const s = span[d.fund_id];
    return {
      ticker: d.fund_id, name: d.fund_name ?? d.fund_id, category: d.category, outcome,
      reason: firstSentence(d.reason), v, time: s && isFinite(s.t0) ? `${Math.max(1, Math.round(s.t1 - s.t0))} s` : "—",
      rule: d.decided_by === "rule" ? RULE_APPLIED[d.rule_applied] ?? d.rule_applied : undefined,
      conditions: json<string[]>(d.conditions, []).map(plain),
      setAside: outcome === "quarantined" ? plain(d.quarantine_reason ?? d.reason) : undefined,
      sendbacks: sendsByFund[d.fund_id] ?? 0,
    };
  });
  const run = {
    id: meta.run_id, file: meta.source, funds: meta.funds ?? funds.length, seconds: Math.round(meta.seconds ?? 0),
    duration: `${Math.round(meta.seconds ?? 0)} s`, when: when(meta.updated_at),
    type: isRadar ? "update" : meta.redteam ? "redteam" : "review", mapping: mappingText(meta.mapping),
    funds_: funds, sendbacks: { supervisor: supSends, evidence: evSends }, asOf: asOfSummary(decisions.map((d) => d.as_of)),
    update: isRadar ? await updateView(runId, meta.baseline_run_id, funds) : null,
    redteam: meta.redteam ? redteamView(json(meta.redteam, {} as any)) : null,
  };
  return run;
}

async function updateView(runId: string, baselineId: string, funds: FundRow[]) {
  const [changes, before, stale, baseRun] = await Promise.all([
    sql(`SELECT change_id, fund_id, field, old_value, new_value, materiality, reason, decided_by, crosses_threshold, reopened
         FROM radar_changes WHERE run_id = :r ORDER BY fund_id, change_id`, { r: runId }),
    sql(`SELECT fund_id, decision FROM decisions WHERE run_id = :b`, { b: baselineId }),
    sql(`SELECT fund_id, reviewer, field, old_value, rule FROM stale_evidence WHERE run_id = :r ORDER BY fund_id`, { r: runId }),
    sql(`SELECT source, updated_at FROM runs WHERE run_id = :b`, { b: baselineId }),
  ]);
  const beforeMap = Object.fromEntries(before.map((b) => [b.fund_id, OUTCOME[b.decision] ?? "person"]));
  const reopenedByFund: Record<string, string[]> = {};
  changes.forEach((c) => (reopenedByFund[c.fund_id] = json<string[]>(c.reopened, [])));
  const reopenCount = Object.values(reopenedByFund).reduce((a, r) => a + r.length, 0);
  const changed = funds.filter((f) => beforeMap[f.ticker] && beforeMap[f.ticker] !== f.outcome)
    .map((f) => ({ ticker: f.ticker, name: f.name, from: beforeMap[f.ticker], to: f.outcome, reason: f.reason }));
  const ccy = (f: string, v: string | null) => (v === null ? "—" : fmt(f, v));
  return {
    compareWith: baseRun[0]?.source ?? baselineId, compareDate: when(baseRun[0]?.updated_at), baselineId,
    tiles: { changes: changes.length, matter: changes.filter((c) => c.materiality !== "routine").length,
             reopened: reopenCount, possible: 4 * funds.length, changed: changed.length },
    decisionChanges: changed,
    changes: changes.map((c) => {
      const thr = json<string[]>(c.crosses_threshold, []);
      const reopened = (reopenedByFund[c.fund_id] ?? []).map((r) => TITLE[r] ?? r);
      return {
        id: c.change_id, ticker: c.fund_id, field: label(c.field), from: ccy(c.field, c.old_value), to: ccy(c.field, c.new_value),
        type: c.materiality, kind: c.decided_by === "guardrail" ? "rule" : "ai",
        judged: c.decided_by === "guardrail" ? "Rule: crossed a policy limit" : "AI: Change checker",
        reason: plain(c.reason), reopened, carried: REVIEWERS.map((r) => TITLE[r]).filter((r) => !reopened.includes(r)),
      };
    }),
    stale: stale.map((s) => ({ ticker: s.fund_id, what: `${label(s.field)} ${fmt(s.field, s.old_value)} (${TITLE[s.reviewer] ?? s.reviewer})`,
                               why: s.rule ? `Checked against ${ruleText(s.rule)}; the value has changed.` : "The value has changed." })),
  };
}

const TRICK_NAMES: Record<string, string> = {
  hidden_high_fee: "Hidden high fee", fee_as_bps_text: 'Fee written as "60 bps"', fake_returns: "Too-good-to-be-true returns",
  leveraged_disguised: "Leveraged fund in disguise", low_risk_label: "Aggressive fund labelled low risk",
  tiny_fund: "Fund far below minimum size", too_new: "Fund launched weeks ago", wrong_ticker: "Ticker that doesn't exist",
  clone_fund: "Copy of another fund", cheap_vs_cap_expensive_vs_peers: "Fee just under the cap but far above peers",
  category_mismatch: "Name contradicts category", missing_fee: "Fee left blank", stale_data: "Data two years out of date",
};

function redteamView(rt: any) {
  const rows = (rt.rows ?? []).map((r: any, i: number) => {
    const by: string[] = r.caught_by ?? [];
    const rule = by.some((b) => /=fail|quarantine/.test(b)) && !by.some((b) => /ai_inconsistency/.test(b));
    return {
      n: i + 1, trick: TRICK_NAMES[r.trick] ?? r.trick, fund: r.fund_id,
      result: r.result === "handled" ? "read" : r.result === "missed_other_reason" ? "other" : r.result,
      outcome: OUTCOME[r.outcome] ?? r.outcome,
      by: by.length ? by.map(caughtBy).join(" · ") : r.result === "handled" ? "Fee read correctly as 0.60%" : "Nothing caught it",
      byKind: rule ? "rule" : "ai", disguise: plain(r.disguise), reason: plain(r.decision_reason),
    };
  });
  const genuine = (rt.genuine ?? []).map((g: any) => ({ ticker: g.fund_id, name: g.fund_id, outcome: OUTCOME[g.outcome] ?? g.outcome, reason: firstSentence(g.reason) }));
  const missed = rows.filter((r: any) => r.result === "missed" || r.result === "other").length;
  return {
    tiles: { caught: rt.caught, planted: rt.planted, missed, wrongly: (rt.false_positives ?? []).length,
             person: (rt.sent_to_person ?? []).length, real: rt.real_funds },
    tricks: rows, genuine,
  };
}

// ---------------------------------------------------------------- one fund

export async function getFund(runId: string, fundId: string) {
  const [[fund], [dec], verdicts, events, [meta]] = await Promise.all([
    sql(`SELECT record, status FROM funds WHERE run_id = :r AND fund_id = :f`, { r: runId, f: fundId }),
    sql(`SELECT decision, decided_by, rule_applied, reason, conditions FROM decisions WHERE run_id = :r AND fund_id = :f`, { r: runId, f: fundId }),
    sql(`SELECT reviewer, verdict, reason, evidence, confidence, evidence_ok FROM verdicts WHERE run_id = :r AND fund_id = :f`, { r: runId, f: fundId }),
    sql(`SELECT seq, actor, event, reviewer, detail, t FROM review_events WHERE run_id = :r AND fund_id = :f ORDER BY seq`, { r: runId, f: fundId }),
    sql(`SELECT source, baseline_run_id, updated_at FROM runs WHERE run_id = :r`, { r: runId }),
  ]);
  if (!fund || !dec) return null;
  const rec = json<any>(fund.record, { fields: {}, flags: [] });
  const fields: Record<string, any> = rec.fields ?? {};
  const ccy = fields.currency?.value ?? "USD";
  const outcome = OUTCOME[dec.decision] ?? "person";
  const file = meta?.source ?? "the file";
  const srcRow = fields.source_ref?.value as string | undefined;

  // source records shown in the side panel: every mapped column of this fund's row
  const cells: [string, string][] = Object.entries(fields)
    .filter(([, fv]: any) => fv.column && fv.raw !== null && fv.raw !== undefined)
    .map(([, fv]: any) => [fv.column, String(fv.raw)] as [string, string])
    .filter((c, i, all) => all.findIndex((x) => x[0] === c[0]) === i);

  const sources: Record<string, any> = {};
  const addSource = (key: string, field: string, value: unknown, verified: boolean | null, rule?: string | null) => {
    if (sources[key]) return;
    const fv = fields[field] ?? fields["x_" + field];
    const computed = !fields[field];
    const facts: [string, string][] = [];
    if (fv?.raw !== undefined && fv?.raw !== null) facts.push(["Original text", String(fv.raw)]);
    facts.push(["Value used", fmt(field, value ?? fv?.value, ccy)]);
    if (fv?.transform) facts.push([fv.transform.startsWith("derived") ? "How" : "Converted", howText(fv.transform).replace(/^Calculated: /, "")]);
    if (rule) facts.push(["Checked against", ruleText(rule)]);
    const flag = (rec.flags ?? []).find((f: any) => f.field === field);
    if (flag) facts.push(["Repair", plain(flag.detail)]);
    if (verified !== null) facts.push(["Evidence checker", verified ? "verified" : "not verified"]);
    sources[key] = {
      title: label(field), row: computed ? "Calculated" : rowOf(srcRow), file,
      col: fv?.column ?? null, cells, facts,
    };
  };

  const byReviewer = Object.fromEntries(verdicts.map((v) => [v.reviewer, v]));
  const compFail = byReviewer.compliance?.verdict === "fail";
  const isRadar = !!meta?.baseline_run_id;
  let radar: any = null;
  if (isRadar) {
    const [changes, stale, [before]] = await Promise.all([
      sql(`SELECT field, old_value, new_value, materiality, reason, decided_by, reopened FROM radar_changes
           WHERE run_id = :r AND fund_id = :f ORDER BY change_id`, { r: runId, f: fundId }),
      sql(`SELECT reviewer, field, old_value, rule FROM stale_evidence WHERE run_id = :r AND fund_id = :f`, { r: runId, f: fundId }),
      sql(`SELECT decision FROM decisions WHERE run_id = :b AND fund_id = :f`, { b: meta.baseline_run_id, f: fundId }),
    ]);
    const reopened = changes.length ? json<string[]>(changes[0].reopened, []) : [];
    const material = changes.filter((c) => c.materiality !== "routine");
    const whyFor = (r: string) => {
      const fields = material.filter((c) => (FIELD_REVIEWERS[c.field] ?? []).includes(r)).map((c) => label(c.field).toLowerCase());
      return fields.length ? `the ${fields.join(" and the ")} changed` : "chosen by the change checker";
    };
    const [baseRun] = await sql(`SELECT source, updated_at FROM runs WHERE run_id = :b`, { b: meta.baseline_run_id });
    radar = {
      previously: before ? OUTCOME[before.decision] : null,
      changes: changes.map((c) => ({
        field: label(c.field), from: fmt(c.field, c.old_value, ccy), to: fmt(c.field, c.new_value, ccy), type: c.materiality,
        kind: c.decided_by === "guardrail" ? "rule" : "ai", judged: c.decided_by === "guardrail" ? "Rule: crossed a policy limit" : "AI: Change checker",
      })),
      reopened: reopened.map((r) => ({ who: TITLE[r] ?? r, why: whyFor(r) })),
      compare: baseRun ? `${baseRun.source} (${when(baseRun.updated_at)})` : meta.baseline_run_id,
      whyFor,
      carried: REVIEWERS.filter((r) => !reopened.includes(r)).map((r) => ({ who: TITLE[r], why: "nothing it checks changed" })),
      stale: stale.map((s) => `${label(s.field)} ${fmt(s.field, s.old_value, ccy)} from the earlier run (${TITLE[s.reviewer] ?? s.reviewer})`),
      reopenedSet: new Set(reopened),
    };
  }

  const reviewers = REVIEWERS.map((n) => {
    const v = byReviewer[n];
    if (!v) {
      const verdict = outcome === "quarantined" ? "na" : compFail ? "skipped" : isRadar ? "carried" : "na";
      const reason = verdict === "skipped" ? "Skipped: Compliance failed, so the fund is rejected regardless."
        : verdict === "carried" ? "Carried forward: nothing it checks changed."
        : outcome === "quarantined" ? "Can't assess: the fund was set aside before review." : "Did not run.";
      return { name: TITLE[n], verdict, reason };
    }
    const ev = json<any[]>(v.evidence, []);
    const verified = v.evidence_ok === null || v.evidence_ok === undefined ? null : !!v.evidence_ok;
    const rows = ev.map((e, i) => {
      const key = `${n}-${e.field}`;
      addSource(key, e.field, e.value, verified, e.rule);
      return {
        id: key, hlKey: e.field, what: label(e.field), value: e.field === "data_quality_flag" ? String(e.value).slice(0, 90) + (String(e.value).length > 90 ? "…" : "") : fmt(e.field, e.value, ccy),
        source: rowOf(e.source_ref), rule: ruleText(e.rule), verified: verified ?? undefined, key: i,
      };
    });
    const verdict = VERDICT[v.verdict] ?? "na";
    const reopenedWhy = radar?.reopenedSet?.has(n) ? radar.whyFor(n) : undefined;
    return {
      name: TITLE[n], verdict, reason: plain(v.reason), rows,
      confidence: verdict === "na" ? null : `${Math.round((v.confidence ?? 0) * 100)}%`,
      evidence: verified === null ? undefined : verified ? "verified" : "unverified", reopened: reopenedWhy,
    };
  });

  // review trail
  const t0 = events.length ? Number(events[0].t) : 0;
  const clock = (t: number) => { const s = Math.max(0, Math.round(t - t0)); return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };
  const strip = (d?: string) => (d ?? "").replace(/^The Supervisor (says|asks): /, "").trim();
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const trim = (raw: string, n = 220) => { const s = plain(raw); return s.length > n ? s.slice(0, n - 1) + "…" : s; };
  const timeline: any[] = [];
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    const who = TITLE[e.actor] ?? cap(e.actor);
    const target = e.reviewer ? TITLE[e.reviewer] ?? e.reviewer : "";
    if (e.event === "called") {
      // group calls made at the same moment into one parallel step
      const group = [e];
      while (i + 1 < events.length && events[i + 1].event === "called" && events[i + 1].actor === e.actor
             && Math.abs(Number(events[i + 1].t) - Number(e.t)) < 1.5) group.push(events[++i]);
      const kind = e.actor === "guardrail" ? "rule" : "ai";
      const variant = e.actor === "guardrail" ? "guardrail" : e.actor === "radar" ? "radar" : undefined;
      if (group.length > 1) {
        timeline.push({ actor: who, kind, variant, time: clock(e.t),
          text: `Calls ${group.map((g) => TITLE[g.reviewer]).join(", ")} at the same time.`,
          parallel: group.map((g) => ({ actor: TITLE[g.reviewer], text: trim(strip(g.detail), 110) || "Review this fund." })) });
      } else {
        timeline.push({ actor: who, kind, variant, time: clock(e.t),
          text: e.actor === "guardrail" ? `Rule: ${target} must run.` : `Calls ${target}${strip(e.detail) ? ": " + trim(strip(e.detail), 180) : "."}` });
      }
      continue;
    }
    let kind = "ai", variant: string | undefined, text = "";
    switch (e.event) {
      case "verdict": { const [vd, ...rest] = (e.detail ?? "").split(": "); text = `${cap(vd === "cannot_assess" ? "can't assess" : vd)}: ${trim(rest.join(": "), 200)}`; break; }
      case "sent_back": {
        variant = "sendback";
        kind = e.actor === "evidence_checker" && !/reasoning is not supported/.test(e.detail ?? "") ? "rule" : "ai";
        text = `Sent ${target} back: ${trim(strip(e.detail).replace(/^The Evidence checker says your reasoning is not supported: /, ""), 200)}`; break;
      }
      case "skipped": kind = "rule"; variant = "guardrail"; text = `Skipped ${target}: ${plain(e.detail)}`; break;
      case "unverified": kind = "rule"; variant = "sendback"; text = `Could not verify ${target}'s evidence: ${trim(e.detail ?? "", 160)}`; break;
      case "report": text = `Routing: ${trim(e.detail ?? "", 240)}`; break;
      case "decided": kind = dec.decided_by === "rule" ? "rule" : "ai"; variant = "final"; text = trim(e.detail ?? "", 260); break;
      case "reopened": variant = "radar"; text = trim(e.detail ?? "", 220); break;
      case "carried_forward": kind = "rule"; variant = "radar"; text = target ? `${target} kept from last review: ${plain(e.detail)}` : plain(e.detail); break;
      case "stale_evidence": kind = "rule"; variant = "radar"; text = `${target}: ${plain(e.detail)}`; break;
      default: text = trim(e.detail ?? e.event, 220);
    }
    timeline.push({ actor: who, kind, variant, time: clock(e.t), text });
  }

  // provenance
  const provenance = Object.entries(fields)
    .filter(([k]) => k !== "source_ref")
    .map(([k, fv]: any) => {
      const t: string | null = fv.transform ?? null;
      const calc = k.startsWith("x_");
      const kindOf = !t ? "rule" : t.startsWith("SelfHeal") ? "ai" : "rule";
      if (!sources[k] && fv.value !== null && fv.value !== undefined) addSource(k, k, fv.value, null, null);
      return {
        field: label(k), file: fv.raw === null || fv.raw === undefined || calc ? "—" : String(fv.raw),
        used: fmt(k, fv.value, ccy), by: howText(t), kind: kindOf, n: sources[k] ? k : undefined, calc,
      };
    });

  const warnings = (rec.flags ?? []).map((f: any) => plain(f.detail));
  const status = rec.status === "quarantined" ? "setaside" : warnings.length ? "warnings" : "ok";
  return {
    status, reason: [plain(dec.reason)],
    decidedBy: dec.decided_by === "rule" ? { kind: "rule", text: RULE_APPLIED[dec.rule_applied] ?? dec.rule_applied }
      : { kind: "ai", text: "Decision owner" },
    previously: radar?.previously && radar.previously !== outcome ? radar.previously : null,
    conditions: json<string[]>(dec.conditions, []).map(plain),
    setAside: status === "setaside" ? plain(rec.quarantine_reason ?? dec.reason) : null,
    warnings: warnings.length ? warnings : null,
    changes: radar?.changes?.length ? radar.changes : null,
    reopened: radar?.reopened ?? [], carried: radar?.carried ?? [], stale: radar?.stale ?? [],
    compareWith: radar?.compare ?? null,
    asOf: dateText(fields.as_of_date?.value), decidedOn: when(meta?.updated_at),
    reviewers, timeline, provenance, sources,
    fund: { ticker: fundId, name: fields.fund_name?.value ?? fundId, category: fields.category?.value ?? null, outcome },
  };
}

// ---------------------------------------------------------------- data page

const DID: Record<string, string> = { fix: "fixed", flag: "flagged", quarantine: "setaside", drop: "dup", dismiss: "ok" };

export async function getData(runId: string) {
  const [[meta], issues, columns] = await Promise.all([
    sql(`SELECT source, mapping, quality, transform, dataset_description FROM runs WHERE run_id = :r`, { r: runId }),
    sql(`SELECT issue_id, fund_id, row_num, field, kind, detail, raw, action, new_value, confidence, decided_by, reason
         FROM quality_issues WHERE run_id = :r ORDER BY issue_id`, { r: runId }),
    sql(`SELECT name, kind, source_column, how, coverage, description, unit, caveats FROM column_metadata WHERE run_id = :r`, { r: runId }),
  ]);
  if (!meta) return null;
  const quality = json<any>(meta.quality, null);
  const transform = json<any>(meta.transform, null);
  const summary = await s3Json<any>(`reports/${runId}/summary.json`);
  const checks: any[] = summary?.mapping_checks ?? (await sql(`SELECT field, column_name AS column, confidence, accepted, reason
                                                                FROM mapping_checks WHERE run_id = :r`, { r: runId }));
  const used = summary?.mapping_used?.fields ?? {};
  const unitOf = (spec: any) => spec?.unit ? unitText(spec.unit) : spec?.scale ? `risk ${spec.scale[0]}–${spec.scale[1]} rescaled to 1–5`
    : spec?.multiplier ? `× ${Number(spec.multiplier).toLocaleString("en-US")}` : spec?.value_map ? "words → numbers"
    : spec?.date_format ? "date" : spec?.constant ? `same for every fund (${spec.constant})` : "—";
  return {
    file: meta.source,
    hasReport: !!quality,
    tiles: quality ? { score: quality.report?.score ?? null, problems: quality.stats?.issues ?? issues.length,
                       warnings: quality.stats?.flagged ?? 0, setAside: quality.stats?.quarantined ?? 0 } : null,
    summary: quality?.report?.summary ? plain(quality.report.summary) : null,
    top: (quality?.report?.top_problems ?? []).map((t: string) => plain(t)),
    problems: issues.map((i, n) => {
      const blocked = i.decided_by === "guardrail" && /Guardrail:/.test(i.reason ?? "");
      const who = i.decided_by === "guardrail" ? "safety" : i.decided_by === "rule" ? "rule" : "ai";
      return {
        id: n + 1, fund: i.fund_id ?? "—", problem: plain((i.detail ?? "").replace(/ is outside [-0-9.]+\.\.[-0-9.None]+$/, " is outside the allowed range")), did: blocked ? "blocked" : DID[i.action] ?? "flagged", who,
        whoLabel: i.decided_by === "selfheal" ? "AI · Data repairer" : i.decided_by === "quality" ? "AI · Quality inspector"
          : i.decided_by === "guardrail" ? "Safety rule" : "Rule",
        conf: i.confidence === null ? "—" : `${Math.round(i.confidence * 100)}%`, why: plain(i.reason),
        row: i.row_num, col: i.field, val: i.raw ?? "", newValue: i.new_value,
      };
    }),
    description: meta.dataset_description ? plain(meta.dataset_description) : null,
    columns: columns.map((c) => ({
      col: label(c.name), meaning: plain(c.description), unit: unitText(c.unit), cov: Math.round((c.coverage ?? 0) * 100),
      from: c.kind === "derived" ? (c.name.startsWith("x_") && transform?.suggested?.some((s: any) => s.name === c.name && s.accepted) ? "Proposed by AI" : "Calculated")
        : /^constant /.test(c.source_column ?? "") ? `Same for every fund (${c.source_column.slice(9)})` : c.source_column ?? "—",
      caveat: plain(c.caveats), calc: c.kind === "derived" && !transform?.suggested?.some((s: any) => s.name === c.name),
      ai: !!transform?.suggested?.some((s: any) => s.name === c.name && s.accepted),
    })),
    proposed: (transform?.suggested ?? []).map((s: any) => ({ name: label(s.name ?? ""), accepted: !!s.accepted,
      why: plain(s.accepted ? (s.why_useful ?? s.description) : s.reason) })),
    mapping: checks.map((c: any) => ({
      ours: label(c.field), theirs: c.column ?? (used[c.field]?.constant !== undefined ? "none: same for every fund" : "—"),
      unit: unitOf(used[c.field]), conf: c.confidence === null || c.confidence === undefined ? "—" : `${Math.round(c.confidence * 100)}%`,
      ok: !!c.accepted, reject: c.accepted ? "" : plain(c.reason), why: plain(used[c.field]?.rationale ?? (c.accepted ? "" : c.reason)),
    })),
    rounds: (summary?.profiler_rounds ?? []).map((r: any) => ({ round: r.round, accepted: r.accepted, proposed: r.proposed,
      rejected: (r.rejected ?? []).map((x: any) => `${label(x.field)} (${plain(x.reason)})`) })),
    notMapped: (summary?.mapping_used?.not_mapped ?? []).map((x: string) => plain(x)),
  };
}
