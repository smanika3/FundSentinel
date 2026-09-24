"""Pipeline: CSV -> Profiler mapping (or a given mapping) -> canonical records -> Quality checks -> SelfHeal
-> Quality report -> Supervisor routes 4 reviewers -> Evidence checker (code + AI) -> Decision owner -> S3 + database.
Quarantined funds skip the committee; flagged funds carry their flags into it. Nothing pauses the pipeline.

Run:  uv run python -m fundsentinel.pipeline --source data/raw/india/comprehensive_mutual_funds_data.csv \
          --context "Data snapshot date: 2023-04-26" --limit 5
      (add --mapping config/mappings/<file>.json to skip the Profiler and use a fixed mapping)
"""

import argparse
import json
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import asdict
from pathlib import Path

import pandas as pd

from . import mapping as mp
from . import settings
from . import committee, normalise, profile, quality, store, transform
from .agents import analyst, common, compliance, decision, finance, profiler, selfheal, suitability
from .agents import metadata as metadata_agent
from .agents import quality as quality_agent
from .agents import transform as transform_agent

REVIEWERS = {"analyst": analyst, "compliance": compliance, "finance": finance, "suitability": suitability}


def _column_facts(mapping: dict, records: list, transform_info: dict) -> list[dict]:
    """Facts about every column, computed in code, for the Metadata agent and the data dictionary."""
    schema = settings.schema()
    derived = {d["name"]: d for d in transform_info["standard"] + [s for s in transform_info["suggested"] if s.get("accepted")]}
    names = [n for n in schema if any(n in r.fields for r in records)] + list(derived)
    facts = []
    for n in names:
        vals = [r.fields[n].value for r in records if n in r.fields]
        present = [v for v in vals if v is not None]
        notes = pd.Series([r.fields[n].transform for r in records if n in r.fields and r.fields[n].transform]).value_counts()
        spec = mapping["fields"].get(n, {})
        facts.append({
            "name": n, "kind": "derived" if n in derived else "canonical",
            "source_column": spec.get("column") or (("constant " + str(spec["constant"])) if "constant" in spec else None)
                             or derived.get(n, {}).get("column"),
            "how": derived[n].get("formula") if n in derived else (notes.index[0] if len(notes) else "copied as-is"),
            "schema_description": schema.get(n, {}).get("description") or derived.get(n, {}).get("description"),
            "coverage": round(len(present) / max(len(records), 1), 3),
            "examples": [str(v) for v in pd.Series(present, dtype=object).drop_duplicates().head(3)],
            "flagged_records": sum(1 for r in records for f in r.flags if f.get("field") == n),
        })
    return facts


def stage1_transform_and_metadata(df, mapping, kept, source_name, context, stats, qreport):
    standard = transform.add_standard(kept)
    used = {spec.get("column") for spec in mapping["fields"].values()}
    unused = [c for c in df.columns if c not in used]
    suggested = []
    try:
        prof_text = profile.as_text(profile.profile_columns(df[unused], samples=3)) if unused else ""
        ideas = transform_agent.suggest(sorted(settings.schema()), [d["name"] for d in standard], prof_text)
        suggested = transform.apply_suggestions(ideas, kept, df)
    except Exception as e:
        if common.is_auth_error(e):
            raise common.LoginExpired("AWS login expired. Run: aws login --profile fundsentinel") from e
        suggested = [{"name": "(transform agent)", "accepted": False, "reason": f"{type(e).__name__}"}]
    info = {"standard": standard, "suggested": suggested}
    print(f"Transform: {len(standard)} standard columns; agent proposed {len(suggested)}, "
          f"accepted {sum(1 for x in suggested if x.get('accepted'))}")
    facts = _column_facts(mapping, kept, info)
    try:
        doc = metadata_agent.document(source_name, context, facts,
                                      (qreport or {}).get("summary") or json.dumps(stats, default=str))
        docs = {c["name"]: c for c in doc["columns"]}
        dictionary = {"dataset_description": doc["dataset_description"],
                      "columns": [{**f, **{k: docs.get(f["name"], {}).get(k) for k in ("description", "unit", "caveats")}}
                                  for f in facts]}
    except Exception as e:
        if common.is_auth_error(e):
            raise common.LoginExpired("AWS login expired. Run: aws login --profile fundsentinel") from e
        dictionary = {"dataset_description": f"Metadata agent unavailable ({type(e).__name__}).", "columns": facts}
    print(f"Metadata: documented {len(dictionary['columns'])} columns")
    return info, dictionary


def run(source: str, mapping_path: str | None = None, limit: int | None = None, fund_ids: list[str] | None = None,
        run_id: str | None = None, out_dir: str = "runs", persist: bool = True, context: str = "",
        stage1_only: bool = False, use_supervisor: bool = True, workers: int = 3, progress=None) -> dict:
    started = time.time()
    df = normalise.load_csv(source)
    source_name = "/".join(Path(source).parts[-2:])
    profiler_rounds = None
    if mapping_path:
        mapping = json.loads(Path(mapping_path).read_text())
    else:
        prof = profiler.propose(df, source_name, context)
        mapping, profiler_rounds = prof["mapping"], prof["rounds"]
        print(f"Profiler: {len(mapping['fields'])} fields mapped in {len(profiler_rounds)} round(s); "
              f"not mapped: {mapping['not_mapped']}")
    run_id = run_id or store.run_id_for(source, {"mapping": mapping_path or "profiler", "context": context})

    checks = mp.validate_mapping(mapping, df)
    all_records = mp.apply_mapping(mapping, df, checks, source_name)
    if progress:
        progress.step(1, f"{sum(c.accepted for c in checks)} columns understood")

    # ---- Stage 1: Quality -> SelfHeal -> apply -> Quality report ----
    issues = quality.detect(df, all_records)
    dropped_rows = {i.row for i in issues if i.action == "drop"}
    candidates = [r for n, r in enumerate(all_records) if n + 2 not in dropped_rows]
    if fund_ids:
        wanted = set(fund_ids)
        scope = [r for r in candidates if r.fund_id in wanted or r.fund_id.split("~")[0] in wanted]
    else:
        scope = candidates[: limit or len(candidates)]
    scope_ids = {r.fund_id for r in scope}
    if progress:
        progress.step(2, f"{len(issues)} problems found")
    healed = selfheal.heal(issues, scope_ids)
    kept = quality.apply(all_records, issues)
    stats = quality.summary(issues, kept)
    try:
        qreport = quality_agent.report(stats, scope, source_name)
        for f in qreport.extra_findings:
            rec = next((r for r in scope if r.fund_id == f.fund_id), None)
            if rec is None:
                continue
            iss = quality.Issue(f"A{len(issues) + 1:04d}", rec.fund_id, all_records.index(rec) + 2, f.field,
                                "ai_inconsistency", f.finding, action="flag", decided_by="quality",
                                confidence=0.8 if f.severity == "high" else 0.6, reason="Found by the Quality agent.")
            issues.append(iss)
            quality.apply(all_records, [iss])
        qreport = qreport.model_dump()
    except Exception as e:
        if common.is_auth_error(e):
            raise common.LoginExpired("AWS login expired. Run: aws login --profile fundsentinel") from e
        qreport = {"score": None, "summary": f"Quality report unavailable ({type(e).__name__}).", "top_problems": [],
                   "extra_findings": []}
    print(f"Quality: {stats['issues']} issues in file, {len(healed)} sent to SelfHeal; in scope: "
          f"{sum(r.status == 'quarantined' for r in scope)} quarantined, {sum(r.status == 'flagged' for r in scope)} flagged")

    if progress:
        progress.step(3, f"{len(healed)} problems judged by SelfHeal")
    # ---- Stage 1 continued: Transform -> Metadata ----
    transform_info, dictionary = stage1_transform_and_metadata(df, mapping, kept, source_name, context, stats, qreport)

    records = {r.fund_id: r for r in scope}
    ids = [] if stage1_only else [r.fund_id for r in scope if r.status != "quarantined"]
    if stage1_only:
        print("Stage 1 only: committee skipped.")
    results = [{"fund_id": r.fund_id, "record": r.to_dict(), "verdicts": [],
                "decision": {"fund_id": r.fund_id, "decision": "quarantined", "decided_by": "rule",
                             "rule_applied": "selfheal_quarantine", "reason": r.quarantine_reason, "conditions": []},
                "seconds": 0} for r in scope if r.status == "quarantined"]

    local = threading.local()  # each worker thread gets its own reviewer agents (agents are not thread-safe)

    def review_one(fid):
        if not hasattr(local, "agents"):
            local.agents = {name: mod.build(records) for name, mod in REVIEWERS.items()}
            local.owner = decision.build()
        t = time.time()
        out = committee.review_fund(fid, records[fid], local.agents, local.owner, use_supervisor=use_supervisor)
        dec, verdicts = out["decision"], out["verdicts"]
        sends = sum(1 for e in out["events"] if e["event"] == "sent_back")
        print(f"{fid[:30]:30s} {dec.decision:26s} ({dec.decided_by}) "
              + " ".join(f"{v.reviewer[:4]}={v.verdict}" for v in verdicts)
              + (f"  [{sends} send-back(s)]" if sends else "") + f"  {time.time() - t:.0f}s", flush=True)
        if progress:
            progress.fund({"ticker": fid, "name": records[fid].get("fund_name") or fid,
                           "decision": dec.decision, "seconds": round(time.time() - t), "sendbacks": sends})
        return {"fund_id": fid, "record": records[fid].to_dict(),
                "verdicts": [v.model_dump() for v in verdicts], "decision": dec.model_dump(),
                "events": out["events"], "evidence_status": out["evidence_status"],
                "supervisor": out["supervisor"], "seconds": round(time.time() - t, 1)}

    if progress:
        progress.step(4, f"{len(ids)} funds to review · {workers} at a time", total=len(ids) + len(results))
        for r in results:  # funds set aside before the committee still count as finished
            progress.fund({"ticker": r["fund_id"], "name": r["record"]["fields"].get("fund_name", {}).get("value") or r["fund_id"],
                           "decision": "quarantined", "seconds": 0, "sendbacks": 0})
    with ThreadPoolExecutor(max_workers=max(1, min(workers, len(ids) or 1))) as pool:
        results.extend(pool.map(review_one, ids))
    if progress:
        progress.step(5)

    summary = {"run_id": run_id, "source": source_name, "mapping": mapping_path or "profiler-agent",
               "mapping_checks": [asdict(c) for c in checks], "mapping_used": mapping,
               "profiler_rounds": profiler_rounds, "context": context, "funds": len(results),
               "quality": {"stats": stats, "report": qreport},
               "transform": transform_info, "data_dictionary": dictionary,
               "quality_issues": [i for i in quality.to_rows(issues) if i["fund_id"] in scope_ids or i["action"] == "drop"],
               "seconds": round(time.time() - started, 1),
               "decisions": pd.Series([r["decision"]["decision"] for r in results]).value_counts().to_dict()}
    out = Path(out_dir) / run_id
    out.mkdir(parents=True, exist_ok=True)
    (out / "summary.json").write_text(json.dumps(summary, indent=2, default=str))
    (out / "results.json").write_text(json.dumps(results, indent=2, default=str))
    if progress:
        progress.step(6, "Saving decisions")
    if persist:
        store.init_db()
        store.save_s3(summary, results)
        store.save_run(summary, results)
    if progress:
        progress.finish()
    for r in results:
        if r["decision"]["decision"] == "quarantined":
            print(f"{r['fund_id'][:30]:30s} quarantined                (rule) {r['decision']['reason']}")
    print(json.dumps({k: summary[k] for k in ("run_id", "funds", "seconds", "decisions")}))
    return {"summary": summary, "results": results}


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", required=True)
    ap.add_argument("--mapping", help="fixed mapping JSON; omit to let the Profiler agent map the file")
    ap.add_argument("--context", default="", help="facts from the uploader, e.g. 'Data snapshot date: 2023-04-26'")
    ap.add_argument("--limit", type=int, default=5)
    ap.add_argument("--funds", nargs="*")
    ap.add_argument("--run-id", help="override the deterministic run ID (file + mapping fingerprint)")
    ap.add_argument("--no-store", action="store_true", help="skip S3 and database writes")
    ap.add_argument("--stage1-only", action="store_true", help="run the data team only (Profiler, Quality, SelfHeal)")
    ap.add_argument("--no-supervisor", action="store_true", help="fixed routing: all four reviewers in parallel")
    ap.add_argument("--workers", type=int, default=3, help="funds reviewed at the same time")
    a = ap.parse_args()
    run(a.source, a.mapping, limit=a.limit, fund_ids=a.funds, run_id=a.run_id, persist=not a.no_store,
        context=a.context, stage1_only=a.stage1_only, use_supervisor=not a.no_supervisor,
        workers=a.workers)
