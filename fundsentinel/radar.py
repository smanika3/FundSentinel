"""Radar-lite: an updated fund file reopens only the reviews its changes affect.

  1. Map the new file exactly like the baseline run (same mapping), run the code-only Stage 1 steps.
  2. Code diff: every canonical field that changed, per fund, with policy-threshold facts.
  3. Materiality agent (Opus) labels each change routine / material / ambiguous and picks reviewers to reopen.
     Guardrail: a change crossing a policy threshold is always material and reopens its mapped reviewers.
  4. Old evidence citing a changed field (directly or through a computed metric) is marked stale.
  5. Reopened reviewers re-run with a note of what changed; other verdicts are carried forward; Decision owner re-decides.

Run:  uv run python -m fundsentinel.radar --baseline <run_id> --source data/test/funds_v2.csv
"""

import argparse
import hashlib
import json
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pandas as pd

from . import committee, quality, settings, store, transform
from . import mapping as mp
from .agents import analyst, common, compliance, decision, finance, suitability
from .agents import materiality as materiality_agent
from .verdict import Evidence, Verdict

REVIEWERS = {"analyst": analyst, "compliance": compliance, "finance": finance, "suitability": suitability}


def radar_config() -> dict:
    return json.loads((settings.CONFIG / "radar.json").read_text())


# ---------- baseline ----------

def load_baseline(run_id: str) -> dict:
    run = store.sql("SELECT run_id, source, mapping FROM runs WHERE run_id = :r", {"r": run_id})
    if not run:
        raise ValueError(f"baseline run {run_id} not found")
    funds = store.sql("SELECT fund_id, record FROM funds WHERE run_id = :r", {"r": run_id})
    verdicts = store.sql("SELECT fund_id, reviewer, verdict, reason, evidence, confidence FROM verdicts WHERE run_id = :r",
                         {"r": run_id})
    decisions = store.sql("SELECT fund_id, decision, reason FROM decisions WHERE run_id = :r", {"r": run_id})
    loads = lambda v: json.loads(v) if isinstance(v, str) else v
    by_fund = {}
    for v in verdicts:
        by_fund.setdefault(v["fund_id"], {})[v["reviewer"]] = Verdict(
            reviewer=v["reviewer"], fund_id=v["fund_id"], verdict=v["verdict"], reason=v["reason"],
            evidence=[Evidence(**e) for e in loads(v["evidence"]) or []], confidence=v["confidence"])
    return {"run": run[0], "records": {f["fund_id"]: loads(f["record"]) for f in funds},
            "verdicts": by_fund, "decisions": {d["fund_id"]: d for d in decisions}}


# ---------- diff ----------

def _same(a, b, tol) -> bool:
    if isinstance(a, (int, float)) and isinstance(b, (int, float)) and not isinstance(a, bool):
        return abs(float(a) - float(b)) <= tol
    return a == b


def threshold_facts(field: str, old, new, rec_new) -> list[str]:
    """Which policy lines this change crosses (computed in code)."""
    pol, out = settings.policy(), []
    if field == "expense_ratio" and old is not None and new is not None:
        cap = pol["finance"]["max_expense_ratio"]
        if (old <= cap) != (new <= cap):
            out.append(f"expense ratio crossed the {cap:.2%} cap ({old:.2%} -> {new:.2%})")
    if field == "total_net_assets" and old is not None and new is not None:
        rate = settings.fx().get(rec_new.get("currency") or "USD", 1)
        floor = pol["compliance"]["min_total_net_assets_usd"]
        if (old * rate >= floor) != (new * rate >= floor):
            out.append(f"fund size crossed the ${floor:,.0f} minimum")
    if field == "risk_score" and old is not None and new is not None:
        lim = pol["suitability"]["general_investor_max_risk"]
        if (old <= lim) != (new <= lim):
            out.append(f"risk score crossed the general-investor limit of {lim} ({old} -> {new})")
    if field in ("category", "fund_name") and new:
        hits = [k for k in pol["compliance"]["prohibited_category_keywords"] if k in str(new).lower()]
        if hits:
            out.append(f"new {field} contains prohibited keyword(s) {hits}")
    return out


def diff(baseline_records: dict, new_records: dict, tol: float) -> tuple[list[dict], list[str], list[str]]:
    changes = []
    for fid, rec in new_records.items():
        old = baseline_records.get(fid)
        if old is None:
            continue
        old_vals = {k: v.get("value") for k, v in old["fields"].items() if not k.startswith("x_") and k != "source_ref"}
        for field, fv in rec.fields.items():
            if field.startswith("x_") or field == "source_ref":
                continue
            if not _same(old_vals.get(field), fv.value, tol):
                changes.append({"change_id": f"C{len(changes) + 1:03d}", "fund_id": fid, "field": field,
                                "old": old_vals.get(field), "new": fv.value,
                                "crosses_policy_threshold": threshold_facts(field, old_vals.get(field), fv.value, rec)})
    added = [f for f in new_records if f not in baseline_records]
    removed = [f for f in baseline_records if f not in new_records]
    return changes, added, removed


def stale_evidence(verdict: Verdict, changed_fields: set, deps: dict) -> list[dict]:
    out = []
    for e in verdict.evidence:
        hit = e.field in changed_fields or any(f in changed_fields for f in deps.get(e.field, []))
        if hit:
            out.append({"reviewer": verdict.reviewer, "field": e.field, "old_value": e.value, "rule": e.rule,
                        "source_ref": e.source_ref})
    return out


# ---------- run ----------

def run(baseline_id: str, source: str, fund_ids: list[str] | None = None, persist: bool = True,
        out_dir: str = "runs", workers: int = 3) -> dict:
    started = time.time()
    cfg = radar_config()
    base = load_baseline(baseline_id)
    mapping_path = base["run"]["mapping"]
    if not mapping_path or mapping_path == "profiler-agent":
        s3 = settings.session().client("s3")
        summ = json.loads(s3.get_object(Bucket=settings.aws()["bucket"],
                                        Key=f"reports/{baseline_id}/summary.json")["Body"].read())
        mapping = summ["mapping_used"]
    else:
        mapping = json.loads((settings.ROOT / mapping_path).read_text()) if not Path(mapping_path).is_absolute() \
            else json.loads(Path(mapping_path).read_text())

    df = pd.read_csv(source, low_memory=False)
    source_name = "/".join(Path(source).parts[-2:])
    checks = mp.validate_mapping(mapping, df)
    all_records = mp.apply_mapping(mapping, df, checks, source_name)
    issues = quality.detect(df, all_records)
    kept = quality.apply(all_records, issues)          # rule-decided actions only; no AI in the Radar path
    transform.add_standard(kept)
    scope = set(fund_ids or base["records"])
    new_records = {r.fund_id: r for r in kept if r.fund_id in scope}

    changes, added, removed = diff(base["records"], new_records, cfg["numeric_tolerance"])
    print(f"Radar: {len(changes)} changes across {len({c['fund_id'] for c in changes})} funds "
          f"({len(added)} new, {len(removed)} missing)")

    # Materiality agent + guardrails
    routing_map = cfg["field_reviewers"]
    baseline_brief = {f: d["decision"] for f, d in base["decisions"].items() if f in new_records}
    plan = materiality_agent.classify(changes, routing_map, baseline_brief) if changes else None
    calls = {c.change_id: c for c in (plan.changes if plan else [])}
    reopen = {r.fund_id: {"reviewers": set(r.reopen), "why": r.why} for r in (plan.routing if plan else [])}
    for c in changes:
        call = calls.get(c["change_id"])
        c["materiality"] = call.materiality if call else "material"
        c["reason"] = call.reason if call else "No call from the materiality agent; treated as material."
        c["decided_by"] = "radar_agent" if call else "guardrail"
        if c["crosses_policy_threshold"] and c["materiality"] != "material":
            c["reason"] = f"Guardrail: {'; '.join(c['crosses_policy_threshold'])}. Agent said {c['materiality']}: {c['reason']}"
            c["materiality"], c["decided_by"] = "material", "guardrail"
        if c["materiality"] == "material" or c["crosses_policy_threshold"]:
            r = reopen.setdefault(c["fund_id"], {"reviewers": set(), "why": ""})
            missing = set(routing_map.get(c["field"], [])) - r["reviewers"]
            if c["crosses_policy_threshold"] and missing:
                r["reviewers"] |= missing
                r["why"] += f" Guardrail added {sorted(missing)} ({c['field']} crossed a policy threshold)."

    # Re-review
    deps = cfg["evidence_depends_on"]
    local = threading.local()

    def process(fid):
        rec = new_records[fid]
        fchanges = [c for c in changes if c["fund_id"] == fid]
        base_v = base["verdicts"].get(fid, {})
        ro = sorted(reopen.get(fid, {}).get("reviewers", set()))
        changed_fields = {c["field"] for c in fchanges if c["materiality"] in ("material", "ambiguous")}
        stale = [s for v in base_v.values() for s in stale_evidence(v, changed_fields, deps)]
        if not ro:
            base_dec = base["decisions"].get(fid, {})
            dec = decision.Decision(fund_id=fid, decision=base_dec.get("decision", "flagged_for_review"),
                                    decided_by="rule", rule_applied="radar_carried_forward",
                                    reason="Routine update only; nothing reopened. Previous decision stands: "
                                           + (base_dec.get("reason") or ""))
            events = [{"seq": 1, "t": round(time.time(), 2), "actor": "radar", "event": "carried_forward", "reviewer": None,
                       "detail": f"{len(fchanges)} routine change(s): " + ", ".join(sorted({c['field'] for c in fchanges}))}]
            return {"fund_id": fid, "record": rec.to_dict(), "verdicts": [v.model_dump() for v in base_v.values()],
                    "decision": dec.model_dump(), "events": events, "evidence_status": {}, "supervisor": None,
                    "radar": {"reopened": [], "carried_forward": sorted(base_v), "stale_evidence": stale,
                              "changes": fchanges}, "seconds": 0}
        if not hasattr(local, "agents"):
            local.agents = {n: m.build(new_records) for n, m in REVIEWERS.items()}
            local.owner = decision.build()
        fr = committee.FundReview(fid, rec, local.agents)
        fr.log("radar", "reopened", None, f"Reopening {ro}: {reopen[fid]['why'].strip()}")
        for n, v in base_v.items():
            if n not in ro:
                fr.verdicts[n] = v
                fr.evidence_status[n] = {"ok": True, "problems": [], "attempts": 0}
                fr.log("radar", "carried_forward", n, f"{v.verdict} (nothing it checks changed)")
        for s in stale:
            fr.log("radar", "stale_evidence", s["reviewer"], f"{s['field']}={s['old_value']} is stale")
        note = ("This is a re-review after a data update. Changes: " + "; ".join(
            f"{c['field']} {c['old']} -> {c['new']} ({c['materiality']}: {c['reason']})" for c in fchanges
            if c["materiality"] != "routine") + ". Your previous evidence on these fields is stale; judge the new values.")
        for n in ro:
            fr.run_reviewer(n, note=note, requested_by="radar")
        committee.ai_evidence_check(fr, only=set(ro))
        verdicts = [fr.verdicts[n] for n in ("analyst", "compliance", "finance", "suitability") if n in fr.verdicts]
        dec = decision.decide(local.owner, fid, verdicts, fr.evidence_status)
        fr.log("decision_owner", "decided", None, f"{dec.decision}: {dec.reason}")
        return {"fund_id": fid, "record": rec.to_dict(), "verdicts": [v.model_dump() for v in verdicts],
                "decision": dec.model_dump(), "events": fr.events, "evidence_status": fr.evidence_status,
                "supervisor": None, "radar": {"reopened": ro, "carried_forward": sorted(set(base_v) - set(ro)),
                                              "stale_evidence": stale, "changes": fchanges},
                "seconds": 0}

    with ThreadPoolExecutor(max_workers=workers) as pool:
        results = list(pool.map(process, list(new_records)))
    for r in results:
        before = base["decisions"].get(r["fund_id"], {}).get("decision")
        rr = r["radar"]
        print(f"{r['fund_id']:8s} {str(before):26s} -> {r['decision']['decision']:26s} reopened={rr['reopened'] or '-'} "
              f"stale={len(rr['stale_evidence'])}")

    h = hashlib.sha256(Path(source).read_bytes() + baseline_id.encode()).hexdigest()[:10]
    run_id = f"{Path(source).stem.lower()}-radar-{h}"
    summary = {"run_id": run_id, "source": source_name, "mapping": f"radar vs {baseline_id}",
               "baseline_run_id": baseline_id, "mapping_checks": [], "funds": len(results),
               "seconds": round(time.time() - started, 1),
               "decisions": pd.Series([r["decision"]["decision"] for r in results]).value_counts().to_dict(),
               "radar": {"changes": changes, "added": added, "removed": removed,
                         "routing": {f: {"reviewers": sorted(v["reviewers"]), "why": v["why"]} for f, v in reopen.items()}}}
    out = Path(out_dir) / run_id
    out.mkdir(parents=True, exist_ok=True)
    (out / "summary.json").write_text(json.dumps(summary, indent=2, default=str))
    (out / "results.json").write_text(json.dumps(results, indent=2, default=str))
    if persist:
        store.init_db()
        store.save_s3(summary, results)
        store.save_run(summary, results)
        store.save_radar(summary, results)
    print(json.dumps({k: summary[k] for k in ("run_id", "funds", "seconds", "decisions")}))
    return {"summary": summary, "results": results}


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--baseline", required=True, help="run_id of the earlier decision run")
    ap.add_argument("--source", required=True, help="the updated fund file")
    ap.add_argument("--funds", nargs="*")
    ap.add_argument("--no-store", action="store_true")
    a = ap.parse_args()
    run(a.baseline, a.source, fund_ids=a.funds, persist=not a.no_store)
