"""Pipeline: CSV -> Profiler mapping (or a given mapping) -> canonical records -> 4 reviewers (in parallel)
-> Decision owner -> S3 + database.

Run:  uv run python -m fundsentinel.pipeline --source data/raw/india/comprehensive_mutual_funds_data.csv \
          --context "Data snapshot date: 2023-04-26" --limit 5
      (add --mapping config/mappings/<file>.json to skip the Profiler and use a fixed mapping)
"""

import argparse
import json
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import asdict
from pathlib import Path

import pandas as pd

from . import mapping as mp
from . import store
from .agents import analyst, common, compliance, decision, finance, profiler, suitability

REVIEWERS = {"analyst": analyst, "compliance": compliance, "finance": finance, "suitability": suitability}


def run(source: str, mapping_path: str | None = None, limit: int | None = None, fund_ids: list[str] | None = None,
        run_id: str | None = None, out_dir: str = "runs", persist: bool = True, context: str = "") -> dict:
    started = time.time()
    df = pd.read_csv(source, low_memory=False)
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
    records = {r.fund_id: r for r in mp.apply_mapping(mapping, df, checks, source_name) if r.fund_id}
    ids = fund_ids or list(records)[: limit or len(records)]

    agents = {name: mod.build(records) for name, mod in REVIEWERS.items()}
    owner = decision.build()
    results = []
    with ThreadPoolExecutor(max_workers=len(agents)) as pool:
        for fid in ids:
            t = time.time()
            futures = {name: pool.submit(common.safe_review, agent, fid) for name, agent in agents.items()}
            verdicts = [f.result() for f in futures.values()]
            try:
                dec = decision.decide(owner, fid, verdicts)
            except Exception as e:
                if common.is_auth_error(e):
                    raise common.LoginExpired("AWS login expired. Run: aws login --profile fundsentinel") from e
                dec = decision.Decision(fund_id=fid, decision="flagged_for_review", decided_by="rule",
                                        rule_applied="decision_owner_error",
                                        reason=f"The Decision owner could not run ({type(e).__name__}); flagged for a re-run.")
            results.append({"fund_id": fid, "record": records[fid].to_dict(),
                            "verdicts": [v.model_dump() for v in verdicts], "decision": dec.model_dump(),
                            "seconds": round(time.time() - t, 1)})
            print(f"{fid:8s} {dec.decision:26s} ({dec.decided_by}) "
                  + " ".join(f"{v.reviewer[:4]}={v.verdict}" for v in verdicts))

    summary = {"run_id": run_id, "source": source_name, "mapping": mapping_path or "profiler-agent",
               "mapping_checks": [asdict(c) for c in checks], "mapping_used": mapping,
               "profiler_rounds": profiler_rounds, "context": context, "funds": len(results),
               "seconds": round(time.time() - started, 1),
               "decisions": pd.Series([r["decision"]["decision"] for r in results]).value_counts().to_dict()}
    out = Path(out_dir) / run_id
    out.mkdir(parents=True, exist_ok=True)
    (out / "summary.json").write_text(json.dumps(summary, indent=2, default=str))
    (out / "results.json").write_text(json.dumps(results, indent=2, default=str))
    if persist:
        store.init_db()
        store.save_s3(summary, results)
        store.save_run(summary, results)
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
    a = ap.parse_args()
    run(a.source, a.mapping, limit=a.limit, fund_ids=a.funds, run_id=a.run_id, persist=not a.no_store,
        context=a.context)
