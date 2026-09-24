import "server-only";
// The rulebook the pipeline uses, read from the repo's config at build time so this page cannot drift from it.
import policy from "../../config/policy.json";
import radar from "../../config/radar.json";
import fx from "../../config/fx.json";
import { label, money } from "./views";

export type Outcome = "fail" | "concern" | "na" | "setaside";
export type Rule = { what: string; limit: string; ifBroken: Outcome; note?: string; key: string };

const pct = (x: number) => `${(x * 100).toFixed(2).replace(/\.?0+$/, "")}%`;
const fields = (fs: string[]) => fs.map((f) => label(f).toLowerCase()).join(", ");

export function getPolicy() {
  const c = policy.compliance, f = policy.finance, a = policy.analyst, s = policy.suitability, q = policy.data_quality;
  const reviewers: { name: string; job: string; rules: Rule[] }[] = [
    {
      name: "Compliance", job: "Hard rules on what the fund is allowed to be. A compliance fail always means rejection.",
      rules: [
        { key: "compliance.prohibited_category_keywords", what: "Banned product types", ifBroken: "fail",
          limit: `Category or name contains: ${c.prohibited_category_keywords.map((k) => `"${k}"`).join(", ")}`,
          note: `"trading--" matches Morningstar's Trading-- categories (for example Trading--Leveraged Equity), not ordinary "Options Trading" or "Macro Trading" funds. The Compliance agent also reads the category and name itself and raises a concern for look-alikes the keywords miss.` },
        { key: "compliance.min_total_net_assets_usd", what: "Minimum fund size", ifBroken: "fail",
          limit: `At least ${money(c.min_total_net_assets_usd)}`,
          note: `Other currencies are converted with fixed demo exchange rates (config/fx.json, as of ${fx.as_of}).` },
        { key: "compliance.min_track_record_years", what: "Minimum age", ifBroken: "fail",
          limit: `At least ${c.min_track_record_years} year${c.min_track_record_years === 1 ? "" : "s"} since launch` },
        { key: "compliance.required_fields", what: "Required data present", ifBroken: "na",
          limit: `Needs ${fields(c.required_fields)}` },
      ],
    },
    {
      name: "Finance", job: "What the fund costs investors each year.",
      rules: [
        { key: "finance.max_expense_ratio", what: "Fee cap", ifBroken: "fail", limit: `Annual fee (expense ratio) at most ${pct(f.max_expense_ratio)}`,
          note: "A round demo limit, chosen so the test funds split cleanly (0.60% passes, 1.10% fails)." },
        { key: "finance.max_premium_over_category", what: "Fee compared with similar funds", ifBroken: "concern",
          limit: `At most ${pct(f.max_premium_over_category)} above the category's average fee` },
      ],
    },
    {
      name: "Analyst", job: "Performance and history, compared with similar funds.",
      rules: [
        { key: "analyst.min_history_years", what: "Enough history to judge", ifBroken: "concern", limit: `At least ${a.min_history_years} years of history` },
        { key: "analyst.max_underperformance_vs_category_5y", what: "5-year return compared with similar funds", ifBroken: "concern",
          limit: `No more than ${pct(a.max_underperformance_vs_category_5y).replace("%", "")} points behind the category` },
        { key: "analyst.implausible_return_1y", what: "Believable returns", ifBroken: "fail",
          limit: `1-year return below ${pct(a.implausible_return_1y)}`, note: "A higher figure is treated as a data problem, not good performance." },
      ],
    },
    {
      name: "Suitability", job: "Who the fund is right for.",
      rules: [
        { key: "suitability.general_investor_max_risk", what: "Risk for general investors", ifBroken: "concern",
          limit: `Risk score at most ${s.general_investor_max_risk} of 5`,
          note: `A risk ${s.general_investor_max_risk + 1} fund can only be approved with conditions (restricted to experienced investors).` },
      ],
    },
    {
      name: "Data quality", job: "Checked before any reviewer sees the fund.",
      rules: [
        { key: "data_quality.quarantine_if_missing", what: "Can the fund be judged at all?", ifBroken: "setaside",
          limit: `Must have ${fields(q.quarantine_if_missing)}`, note: "Other missing fields are flagged, and the reviewer that needs them answers \"can't assess\"." },
      ],
    },
  ];

  const safeguards = [
    { what: "A compliance fail always means rejection", detail: "Applied by code before the AI Decision owner runs; the AI cannot override it." },
    { what: "Every verdict needs evidence", detail: "A verdict with no evidence is sent back to the reviewer for proof." },
    { what: "A verdict that can't be proven goes to a person", detail: "If the Evidence checker still can't match the reviewer's claims to the fund's numbers after a send-back, no automatic decision is made." },
    { what: "A data repair can never help a fund pass", detail: "SelfHeal may fix obvious data errors, but any fix that would turn a policy fail into a pass is blocked, and the fund is flagged instead." },
    { what: "A change that crosses a limit always reopens its reviewers", detail: "In an update run, the AI decides which other changes matter, but it cannot skip one that crosses a policy limit." },
  ];

  const decisions = [
    { outcome: "rejected", when: "Compliance failed (fixed rule), or another reviewer failed a policy rule (the Decision owner is instructed to reject)." },
    { outcome: "conditions", when: "No fails, but concerns that a clear condition can address, for example \"restrict to experienced investors\"." },
    { outcome: "person", when: "Key areas couldn't be assessed, or the evidence couldn't be verified." },
    { outcome: "quarantined", when: "The data was too broken to judge fairly." },
    { outcome: "approved", when: "Every reviewer passed." },
  ];

  const byReviewer: Record<string, string[]> = {};
  Object.entries(radar.field_reviewers).forEach(([field, rs]) =>
    (rs as string[]).forEach((r) => (byReviewer[r] ??= []).push(label(field).toLowerCase())));
  const rereview = Object.entries(byReviewer).map(([r, fs]) => ({
    reviewer: r.charAt(0).toUpperCase() + r.slice(1), fields: Array.from(new Set(fs)).join(", "),
  }));

  return { version: policy.version, disclaimer: policy.disclaimer, reviewers, safeguards, decisions, rereview };
}
