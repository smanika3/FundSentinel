"""Score a Radar-lite run against data/test/changes_answer_key.json.

  uv run python scripts/score_radar.py runs/<radar_run_id>
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FIELD = {"risk_rating": "risk_score", "fund_long_name": "fund_name"}


def main(run_dir: str):
    summary = json.loads((Path(run_dir) / "summary.json").read_text())
    results = {r["fund_id"]: r for r in json.loads((Path(run_dir) / "results.json").read_text())}
    changes = summary["radar"]["changes"]
    key = json.loads((ROOT / "data/test/changes_answer_key.json").read_text())
    ok_all, lines = 0, []
    specific = [k for k in key if k["fund_id"] != "*"]
    for k in specific:
        field = FIELD.get(k["field"], k["field"])
        got = next((c for c in changes if c["fund_id"] == k["fund_id"] and c["field"] == field), None)
        if not got:
            lines.append(f"✗ {k['fund_id']} {field}: NOT DETECTED")
            continue
        want = {r.rstrip("?") for r in k["reopen"] if r != "decision_owner"}
        reopened = set(results.get(k["fund_id"], {}).get("radar", {}).get("reopened", []))
        mat_ok = got["materiality"] == k["materiality"] or (k["materiality"] == "ambiguous" and got["materiality"] == "material")
        reopen_ok = want <= reopened if k["materiality"] != "ambiguous" else bool(reopened)
        good = mat_ok and reopen_ok
        ok_all += good
        lines.append(f"{'✓' if good else '✗'} {k['fund_id']} {field}: {k['old']} -> {k['new']}\n"
                     f"     expected {k['materiality']}, reopen {sorted(want) or '-'} | got {got['materiality']} "
                     f"({got['decided_by']}), reopened {sorted(reopened) or '-'}\n     reason: {got['reason'][:150]}")
    changed_funds = {k["fund_id"] for k in specific}
    routine = [f for f in results if f not in changed_funds]
    quiet = [f for f in routine if not results[f]["radar"]["reopened"]]
    print(f"Specific changes handled correctly: {ok_all}/{len(specific)}")
    print(f"Routine-only funds with nothing reopened: {len(quiet)}/{len(routine)}"
          + (f" (reopened anyway: {sorted(set(routine) - set(quiet))})" if len(quiet) < len(routine) else ""))
    total = sum(len(r["radar"]["reopened"]) for r in results.values())
    print(f"Reviews reopened: {total} of {4 * len(results)} possible ({total / max(4 * len(results), 1):.0%})")
    stale = sum(len(r["radar"]["stale_evidence"]) for r in results.values())
    print(f"Evidence items marked stale: {stale}\n")
    print("\n".join(lines))


if __name__ == "__main__":
    main(sys.argv[1])
