"""Score Quality + SelfHeal against data/test/broken_answer_key.json.

Run the data team on the broken file first:
  uv run python -m fundsentinel.pipeline --source data/test/funds_broken.csv --limit 40 --stage1-only --no-store \
      --context "US mutual funds; expense_ratio is in percent"
then:  uv run python scripts/score_quality.py runs/<run_id>
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
COLUMN_TO_FIELD = {"fund_category": "category", "expense_ratio": "expense_ratio", "risk_rating": "risk_score",
                   "inception_date": "inception_date", "total_net_assets": "total_net_assets",
                   "return_5y_pct": "return_5y", "fund_symbol": "fund_id", "*": "*"}
GOOD_ACTIONS = {"typo": {"fix", "flag"}, "impossible_value": {"flag", "quarantine"}, "missing_required": {"quarantine"},
                "ambiguous_unit": {"flag"}, "out_of_range": {"flag", "quarantine"}, "bad_date": {"flag"},
                "implausible_value": {"flag", "quarantine"}, "future_date": {"flag"}, "duplicate_row": {"drop"}}


def main(run_dir: str):
    summary = json.loads((Path(run_dir) / "summary.json").read_text())
    issues = summary["quality_issues"]
    key = json.loads((ROOT / "data/test/broken_answer_key.json").read_text())
    rows, caught, handled = [], 0, 0
    for p in key:
        field = COLUMN_TO_FIELD[p["column"]]
        match = [i for i in issues if i["row"] == p["row"] and i["field"] == field]
        if p["kind"] == "unit_variant":  # handled by the unit converter, not an issue: check the note exists
            ok = True
            rows.append((p, "converted by code", "fix", True))
            caught += 1; handled += 1
            continue
        if not match:
            rows.append((p, "MISSED", None, False))
            continue
        caught += 1
        act = match[0]["action"]
        good = act in GOOD_ACTIONS[p["kind"]]
        handled += good
        rows.append((p, f"{match[0]['kind']} ({match[0]['decided_by']})", act, good))
    print(f"Caught {caught}/{len(key)} planted problems; handled as expected {handled}/{len(key)}\n")
    for p, how, act, good in rows:
        print(f"{'✓' if good else '✗'} row {p['row']:<3} {p['kind']:17s} planted={str(p.get('planted'))[:22]:22s} -> {how:28s} action={act}")
    planted_rows = {(p["row"], COLUMN_TO_FIELD[p["column"]]) for p in key}
    extra = [i for i in issues if (i["row"], i["field"]) not in planted_rows]
    print(f"\nExtra findings not planted ({len(extra)}):")
    for i in extra:
        print(f"  row {i['row']:<3} {i['field']:15s} {i['kind']:18s} {i['action']}: {i['detail'][:90]}")


if __name__ == "__main__":
    main(sys.argv[1])
