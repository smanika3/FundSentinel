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
                  "rejected": "Rejected", "flagged_for_review": "Flagged for review", "sent_back": "Sent back"}
VERDICT_ICON = {"pass": "✅ pass", "concern": "⚠️ concern", "fail": "❌ fail", "cannot_assess": "❔ cannot assess"}


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

tab_decisions, tab_fund, tab_mapping = st.tabs(["Decisions", "Fund story", "Column mapping"])

with tab_decisions:
    counts = decisions.decision.value_counts()
    cols = st.columns(len(DECISION_LABEL))
    for col, (key, label) in zip(cols, DECISION_LABEL.items()):
        col.metric(label, int(counts.get(key, 0)))

    grid = verdicts.pivot(index="fund_id", columns="reviewer", values="verdict").map(lambda v: VERDICT_ICON.get(v, v))
    table = decisions.set_index("fund_id")[["fund_name", "category", "decision", "decided_by"]].join(grid)
    table["decision"] = table.decision.map(DECISION_LABEL)
    st.dataframe(table, width="stretch")

    stuck = verdicts[verdicts.verdict.isin(["fail", "cannot_assess"])].reviewer.value_counts()
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

    st.markdown("#### Reviewers")
    for _, v in verdicts[verdicts.fund_id == fund_id].sort_values("reviewer").iterrows():
        with st.expander(f"{v.reviewer.title()}: {VERDICT_ICON.get(v.verdict, v.verdict)}  (confidence {v.confidence:.2f})",
                         expanded=v.verdict != "pass"):
            st.write(v.reason)
            ev = pd.DataFrame(_json(v.evidence))
            if "value" in ev:
                ev["value"] = ev["value"].map(lambda x: "" if x is None else str(x))
            if not ev.empty:
                st.dataframe(ev, width="stretch", hide_index=True)

    st.markdown("#### Provenance (every field: raw value, cleaned value, source)")
    rec = _json(q("SELECT record FROM funds WHERE run_id = :r AND fund_id = :f", r=run_id, f=fund_id).record.iloc[0])
    prov = pd.DataFrame([{"field": k, **v} for k, v in rec["fields"].items()])
    prov[["value", "raw"]] = prov[["value", "raw"]].map(lambda x: "" if x is None else str(x))
    st.dataframe(prov, width="stretch", hide_index=True)
    if rec["issues"]:
        st.warning("Data issues: " + "; ".join(rec["issues"]))

with tab_mapping:
    st.markdown("How each source column was mapped onto the standard schema, and whether the code check accepted it.")
    checks = q("""SELECT field, column_name, confidence, accepted, parse_rate, in_range_rate, reason
                  FROM mapping_checks WHERE run_id = :r ORDER BY accepted, field""", r=run_id)
    st.dataframe(checks, width="stretch", hide_index=True)
