"""FundSentinel dashboard (Phase 1). Reads everything from the Aurora record book.

Run:  uv run streamlit run app/dashboard.py
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pandas as pd
import streamlit as st

from fundsentinel import store

st.set_page_config(page_title="FundSentinel", layout="wide")

DECISION_LABEL = {"approved": "Approved", "approved_with_conditions": "Approved with conditions",
                  "rejected": "Rejected", "flagged_for_review": "Flagged for review", "sent_back": "Sent back",
                  "quarantined": "Quarantined"}
VERDICT_ICON = {"pass": "✅ pass", "concern": "⚠️ concern", "fail": "❌ fail", "cannot_assess": "❔ cannot assess"}


@st.cache_resource
def _schema_ready() -> bool:
    store.init_db()  # idempotent: adds any tables/columns newer code expects
    return True


_schema_ready()


@st.cache_data(ttl=30)
def q(sql: str, **params) -> pd.DataFrame:
    return pd.DataFrame(store.sql(sql, params or None))


def _json(v):
    return json.loads(v) if isinstance(v, str) else (v or [])


st.title("FundSentinel")
st.caption("Agentic fund approval pipeline · mock scenario, internal decision support only, not investment advice")

runs = q("SELECT run_id, source, funds, seconds, updated_at FROM runs ORDER BY updated_at DESC")
if runs.empty:
    st.info("No runs yet. Run the pipeline first: `uv run python -m fundsentinel.pipeline --source ... --mapping ...`")
    st.stop()

run_id = st.sidebar.selectbox("Run", runs.run_id, format_func=lambda r: f"{r}  ({runs.set_index('run_id').source[r]})")
run = runs.set_index("run_id").loc[run_id]
st.sidebar.metric("Funds reviewed", int(run.funds))
st.sidebar.metric("Pipeline time", f"{run.seconds:.0f} s")

decisions = q("""SELECT d.fund_id, f.fund_name, f.category, d.decision, d.decided_by, d.rule_applied, d.reason, d.conditions
                 FROM decisions d JOIN funds f USING (run_id, fund_id) WHERE d.run_id = :r ORDER BY d.fund_id""", r=run_id)
verdicts = q("SELECT fund_id, reviewer, verdict, reason, evidence, confidence FROM verdicts WHERE run_id = :r", r=run_id)
if verdicts.empty:
    verdicts = pd.DataFrame(columns=["fund_id", "reviewer", "verdict", "reason", "evidence", "confidence"])

extra = q("SELECT baseline_run_id, redteam FROM runs WHERE run_id = :r", r=run_id)
baseline_id = extra["baseline_run_id"].iloc[0] if not extra.empty else None
redteam = _json(extra["redteam"].iloc[0]) if not extra.empty and extra["redteam"].iloc[0] else None
tab_names = ["Decisions", "Fund story", "Data quality", "Data dictionary", "Column mapping"]
if baseline_id:
    tab_names.insert(1, "Changes (Radar-lite)")
if redteam:
    tab_names.insert(1, "RedTeam scorecard")
tabs = dict(zip(tab_names, st.tabs(tab_names)))
tab_decisions, tab_fund, tab_quality, tab_dict, tab_mapping = (tabs[n] for n in
    ["Decisions", "Fund story", "Data quality", "Data dictionary", "Column mapping"])

if baseline_id:
    with tabs["Changes (Radar-lite)"]:
        st.markdown(f"Updated file compared with baseline run `{baseline_id}`. Only reviews affected by a change are reopened.")
        ch = q("""SELECT fund_id, field, old_value, new_value, materiality, decided_by, reason, reopened
                  FROM radar_changes WHERE run_id = :r ORDER BY fund_id, change_id""", r=run_id)
        before = q("SELECT fund_id, decision AS before FROM decisions WHERE run_id = :b", b=baseline_id)
        after = q("SELECT fund_id, decision AS after FROM decisions WHERE run_id = :r", r=run_id)
        ba = after.merge(before, on="fund_id", how="left")
        reopened = ch.groupby("fund_id").reopened.first().map(lambda v: ", ".join(_json(v)) or "none")
        ba["reopened"] = ba.fund_id.map(reopened).fillna("none")
        ba["changed"] = ba.before != ba.after
        n_reopen = sum(len(_json(v)) for v in ch.groupby("fund_id").reopened.first())
        c1, c2, c3, c4 = st.columns(4)
        c1.metric("Changes detected", len(ch))
        c2.metric("Material / ambiguous", int((ch.materiality != "routine").sum()))
        c3.metric("Reviews reopened", f"{n_reopen} of {4 * len(ba)}")
        c4.metric("Decisions changed", int(ba.changed.sum()))
        st.markdown("#### Before and after")
        st.dataframe(ba[["fund_id", "before", "after", "reopened"]], width="stretch", hide_index=True)
        st.markdown("#### Every change and how it was judged")
        st.dataframe(ch.drop(columns=["reopened"]), width="stretch", hide_index=True)
        stale = q("SELECT fund_id, reviewer, field, old_value, rule FROM stale_evidence WHERE run_id = :r ORDER BY fund_id", r=run_id)
        if not stale.empty:
            st.markdown("#### Evidence marked stale")
            st.dataframe(stale, width="stretch", hide_index=True)

TRICK_NAMES = {
    "hidden_high_fee": "Hidden high fee", "fee_as_bps_text": "Fee written as '60 bps' (harmless)",
    "fake_returns": "Too-good-to-be-true returns", "leveraged_disguised": "Leveraged fund in disguise",
    "low_risk_label": "Aggressive fund labelled low risk", "tiny_fund": "Fund far below minimum size",
    "too_new": "Fund launched weeks ago", "wrong_ticker": "Ticker that doesn't exist",
    "clone_fund": "Copy of another fund", "cheap_vs_cap_expensive_vs_peers": "Fee just under the cap, far above peers",
    "category_mismatch": "Name contradicts category", "missing_fee": "Fee left blank",
    "stale_data": "Data two years out of date"}
RESULT_LABEL = {"caught": "✅ Caught", "handled": "✅ Read correctly", "missed": "❌ Missed",
                "missed_other_reason": "❌ Missed (rejected for another reason)"}

if redteam:
    with tabs["RedTeam scorecard"]:
        rows = redteam.get("rows")
        missed = [r for r in rows if r["result"].startswith("missed")] if rows else []
        c1, c2, c3, c4 = st.columns(4)
        c1.metric("Tricks caught", f"{redteam['caught']} of {redteam['planted']}")
        c2.metric("Tricks missed", len(missed) if rows else redteam["planted"] - redteam["caught"])
        c3.metric("Genuine funds wrongly rejected", f"{len(redteam['false_positives'])} of {redteam['real_funds']}")
        if "sent_to_person" in redteam:
            c4.metric("Genuine funds sent to a person", f"{len(redteam['sent_to_person'])} of {redteam['real_funds']}")
        with st.expander("How this test works", expanded=False):
            st.markdown(
                "- The **RedTeam agent** was given the mock policy and a list of trick types, and designed a realistic "
                "disguise for each by editing a copy of a genuine fund.\n"
                "- The genuine funds used (and copied) pass **every** policy rule on their own, so a trick fund can only be "
                "rejected because of its trick, and a rejected genuine fund is a real false alarm.\n"
                "- What counts as *caught* is fixed in `config/redteam.json`, not decided by any agent. A trick only counts "
                "if the outcome is right **and** it was caught for the right reason; otherwise it shows as "
                "*missed (rejected for another reason)*.\n"
                "- One trick is **harmless** (a normal fee written as '60 bps'): the system must read it correctly, not punish it.\n"
                "- One trick (**data two years out of date**) has no rule in FundSentinel, so a miss there is expected and shown.")
        if rows:
            table = pd.DataFrame([{
                "result": RESULT_LABEL.get(r["result"], r["result"]),
                "trick": TRICK_NAMES.get(r["trick"], r["trick"]),
                "fund": r["fund_id"],
                "outcome": DECISION_LABEL.get(r["outcome"], r["outcome"]),
                "what caught it": ", ".join(r["caught_by"]) or "nothing",
                "how the RedTeam agent disguised it": r["disguise"],
            } for r in rows])
            st.markdown("#### Every planted trick")
            st.dataframe(table, width="stretch", hide_index=True)
            with st.expander("What the RedTeam agent changed in each fund"):
                for r in rows:
                    st.markdown(f"**{r['fund_id']}** · {TRICK_NAMES.get(r['trick'], r['trick'])}: "
                                + ", ".join(f"`{k}` → `{v}`" for k, v in (r.get("changes") or {}).items()))
        else:
            for line in redteam["detail"]:
                st.markdown(("✅ " if line.startswith("✓") else "❌ ") + line[1:].strip())
        if redteam.get("genuine"):
            st.markdown("#### Genuine funds (these pass every rule, so anything but approval is a false alarm)")
            st.dataframe(pd.DataFrame([{"fund": g["fund_id"],
                                        "outcome": DECISION_LABEL.get(g["outcome"], g["outcome"]),
                                        "reason": g["reason"]} for g in redteam["genuine"]]),
                         width="stretch", hide_index=True)
        st.caption("Open any fund in the Fund story tab to see its full review.")

with tab_decisions:
    counts = decisions.decision.value_counts()
    cols = st.columns(len(DECISION_LABEL))
    for col, (key, label) in zip(cols, DECISION_LABEL.items()):
        col.metric(label, int(counts.get(key, 0)))

    table = decisions.set_index("fund_id")[["fund_name", "category", "decision", "decided_by"]]
    if not verdicts.empty:
        grid = verdicts.pivot(index="fund_id", columns="reviewer", values="verdict").map(lambda v: VERDICT_ICON.get(v, v))
        table = table.join(grid)
    table["decision"] = table.decision.map(DECISION_LABEL)
    st.dataframe(table, width="stretch")

    stuck = (verdicts[verdicts.verdict.isin(["fail", "cannot_assess"])].reviewer.value_counts()
             if not verdicts.empty else pd.Series(dtype=int))
    if not stuck.empty:
        st.markdown(f"**Where funds get stuck:** most fails / unassessable results come from "
                    f"**{stuck.index[0]}** ({stuck.iloc[0]} of {len(decisions)} funds).")
        st.bar_chart(stuck)

with tab_fund:
    fund_id = st.selectbox("Fund", decisions.fund_id,
                           format_func=lambda f: f"{f} · {decisions.set_index('fund_id').fund_name.get(f) or ''}")
    d = decisions.set_index("fund_id").loc[fund_id]
    st.subheader(f"{fund_id} · {d.fund_name}")
    st.markdown(f"### {DECISION_LABEL.get(d.decision, d.decision)}")
    st.write(d.reason)
    if d.decided_by == "rule":
        st.caption(f"Decided by fixed rule: `{d.rule_applied}`")
    for c in _json(d.conditions):
        st.markdown(f"- Condition: {c}")

    trail = q("""SELECT seq, actor, event, reviewer, detail FROM review_events
                 WHERE run_id = :r AND fund_id = :f ORDER BY seq""", r=run_id, f=fund_id)
    if not trail.empty:
        sends = int((trail.event == "sent_back").sum())
        with st.expander(f"How this fund was routed ({len(trail)} steps, {sends} send-back(s))", expanded=sends > 0):
            icons = {"called": "➡️", "verdict": "📝", "sent_back": "↩️", "skipped": "⏭️", "unverified": "⚠️",
                     "report": "🧭", "decided": "✅", "error": "❗"}
            for _, e in trail.iterrows():
                who = e.actor.replace("_", " ").title()
                target = f" → **{e.reviewer}**" if e.reviewer and e.reviewer != e.actor else ""
                st.markdown(f"{icons.get(e.event, '•')} **{who}** {e.event.replace('_', ' ')}{target}"
                            + (f": {e.detail[:400]}" if e.detail else ""))

    st.markdown("#### Reviewers")
    fund_verdicts = verdicts[verdicts.fund_id == fund_id] if "fund_id" in verdicts.columns else pd.DataFrame()
    if not fund_verdicts.empty:
        for _, v in fund_verdicts.sort_values("reviewer").iterrows():
            with st.expander(f"{v.reviewer.title()}: {VERDICT_ICON.get(v.verdict, v.verdict)}  (confidence {v.confidence:.2f})",
                             expanded=v.verdict != "pass"):
                st.write(v.reason)
                ev = pd.DataFrame(_json(v.evidence))
                if "value" in ev:
                    ev["value"] = ev["value"].map(lambda x: "" if x is None else str(x))
                if not ev.empty:
                    st.dataframe(ev, width="stretch", hide_index=True)
    else:
        st.info("No reviewer verdicts (fund was quarantined in Stage 1 or run with --stage1-only).")

    st.markdown("#### Provenance (every field: raw value, cleaned value, source)")
    rec = _json(q("SELECT record FROM funds WHERE run_id = :r AND fund_id = :f", r=run_id, f=fund_id).record.iloc[0])
    prov = pd.DataFrame([{"field": k, **v} for k, v in rec["fields"].items()])
    prov[["value", "raw"]] = prov[["value", "raw"]].map(lambda x: "" if x is None else str(x))
    st.dataframe(prov, width="stretch", hide_index=True)
    if rec.get("flags"):
        st.warning("Data-quality flags: " + " · ".join(f["detail"] for f in rec["flags"]))
    if rec.get("quarantine_reason"):
        st.error("Quarantined: " + rec["quarantine_reason"])

with tab_quality:
    qrow = q("SELECT quality FROM runs WHERE run_id = :r", r=run_id)
    qual = _json(qrow.quality.iloc[0]) if not qrow.empty and qrow.quality.iloc[0] else None
    if not qual:
        st.info("No data-quality report for this run (it predates the Quality and SelfHeal agents).")
    else:
        rep, stats = qual.get("report") or {}, qual.get("stats") or {}
        c1, c2, c3, c4 = st.columns(4)
        c1.metric("Quality score", f"{rep.get('score')}/100" if rep.get("score") is not None else "n/a")
        c2.metric("Issues found (whole file)", stats.get("issues", 0))
        c3.metric("Quarantined", stats.get("quarantined", 0))
        c4.metric("Flagged", stats.get("flagged", 0))
        st.write(rep.get("summary", ""))
        for t in rep.get("top_problems", []):
            st.markdown(f"- {t}")
        issues = q("""SELECT fund_id, field, kind, action, decided_by, confidence, new_value, reason, detail
                      FROM quality_issues WHERE run_id = :r ORDER BY action, fund_id""", r=run_id)
        if not issues.empty:
            st.markdown("#### What was found and what was done")
            st.caption("decided_by: **rule** = fixed code rule · **selfheal** = SelfHeal agent · "
                       "**guardrail** = code overruled the agent · **quality** = found by the Quality agent")
            st.dataframe(issues, width="stretch", hide_index=True)

with tab_dict:
    meta = q("SELECT dataset_description, transform FROM runs WHERE run_id = :r", r=run_id)
    cols = q("""SELECT name, kind, description, unit, coverage, source_column, how, caveats, flagged_records
                FROM column_metadata WHERE run_id = :r ORDER BY kind DESC, name""", r=run_id)
    if cols.empty:
        st.info("No data dictionary for this run (it predates the Metadata agent).")
    else:
        st.write(meta["dataset_description"].iloc[0])
        st.caption("Written by the Metadata agent from facts computed in code (coverage, source column, conversions, flags).")
        st.dataframe(cols, width="stretch", hide_index=True,
                     column_config={"coverage": st.column_config.ProgressColumn("coverage", min_value=0, max_value=1, format="%.0f%%")})
        tr = _json(meta["transform"].iloc[0]) or {}
        sugg = tr.get("suggested") or []
        if sugg:
            st.markdown("#### New columns proposed by the Transform agent")
            st.caption("Every proposal is validated in code (known fields only, + - * / only, at least 50% coverage).")
            st.dataframe(pd.DataFrame([{"column": x["name"], "accepted": bool(x.get("accepted")),
                                        "how": x.get("formula") or x.get("column"), "coverage": x.get("coverage"),
                                        "why / why not": x.get("reason") or x.get("why_useful")} for x in sugg]),
                         width="stretch", hide_index=True)

with tab_mapping:
    st.markdown("How each source column was mapped onto the standard schema, and whether the code check accepted it.")
    checks = q("""SELECT field, column_name, confidence, accepted, parse_rate, in_range_rate, reason
                  FROM mapping_checks WHERE run_id = :r ORDER BY accepted, field""", r=run_id)
    st.dataframe(checks, width="stretch", hide_index=True)
