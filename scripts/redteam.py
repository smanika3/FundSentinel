"""RedTeam: plant realistic trick funds among real ones, run the pipeline, and score honestly (misses included).

  uv run python scripts/redteam.py generate            # agent designs tricks -> data/test/funds_redteam.csv + hidden key
  uv run python -m fundsentinel.pipeline --source data/test/funds_redteam.csv --mapping config/mappings/test_versions.json --limit 40
  uv run python scripts/redteam.py score runs/<run_id>
"""

import json
import random
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from fundsentinel import quality, settings  # noqa: E402
from fundsentinel.agents import redteam  # noqa: E402

OUT = ROOT / "data" / "test"
SEED = 11
N_REAL = 8


def clean_real_funds(n: int) -> pd.DataFrame:
    """Real Yahoo funds that pass every policy rule on their own, in the v1 file format with scenario names.
    Rejecting one of these is a genuine false alarm, and a trick built on one is only rejectable because of the trick."""
    sys.path.insert(0, str(ROOT / "scripts"))
    from make_test_files import BENCHMARKS  # noqa: E402
    df = pd.read_csv(ROOT / "data/raw/yahoo_us/MutualFunds.csv", low_memory=False)
    # Names are replaced with scenario names: only 267 of 23,783 Yahoo names are unique, so they can't be trusted.
    ok = (df.fund_category.isin(BENCHMARKS)
          & (df.fund_annual_report_net_expense_ratio <= 0.0065)
          & (df.fund_annual_report_net_expense_ratio <= df.category_annual_report_net_expense_ratio)
          & (df.total_net_assets > 1e9) & df.morningstar_risk_rating.between(1, 4)
          & (df.fund_return_5years >= df.category_return_5years - 0.01) & (df.fund_return_1year < 0.9)
          & (df.inception_date < "2015-01-01") & df.fund_return_1year.notna())
    rows = df[ok].sample(n, random_state=SEED).reset_index(drop=True)
    styles = ["Granite", "Evergreen", "Northstar", "Bayview", "Cedar", "Ironwood", "Lakeside", "Silverline"]
    return pd.DataFrame({
        "fund_symbol": rows.fund_symbol,
        "fund_long_name": [f"{' '.join(str(f).split()[:2])} {styles[i]} {c} Fund"
                           for i, (f, c) in enumerate(zip(rows.fund_family, rows.fund_category))],
        "fund_category": rows.fund_category, "benchmark": rows.fund_category.map(BENCHMARKS),
        "expense_ratio": rows.fund_annual_report_net_expense_ratio,
        "category_expense_ratio": rows.category_annual_report_net_expense_ratio,
        "risk_rating": rows.morningstar_risk_rating.astype(int), "return_1y": rows.fund_return_1year,
        "return_5y": rows.fund_return_5years, "category_return_5y": rows.category_return_5years,
        "total_net_assets": rows.total_net_assets.round(0), "inception_date": rows.inception_date,
        "as_of_date": "2021-10-29"})


def generate():
    catalogue = json.loads((settings.CONFIG / "redteam.json").read_text())["tricks"]
    real = clean_real_funds(N_REAL)
    columns = list(real.columns)
    tricks = redteam.design(catalogue, columns, real.to_dict("records"))

    rng = random.Random(SEED)
    sec = sorted(quality.sec_tickers() - set(real.fund_symbol))
    rows, key = [], []
    for t in tricks:
        if t["trick"] not in catalogue:
            print("skipping unknown trick", t["trick"])
            continue
        row = real.iloc[min(max(t["base_row"], 0), len(real) - 1)].to_dict()
        for col, val in t["changes"].items():
            if col in row and col != "fund_symbol":
                row[col] = val
        if t["trick"] == "wrong_ticker":
            row["fund_symbol"] = "QZ" + "".join(rng.choice("ABCDEFGHJKLMNPRSTUVWXYZ") for _ in range(2)) + "X"
        else:
            row["fund_symbol"] = sec.pop(rng.randrange(len(sec)))
        if t["trick"] == "clone_fund":
            row["fund_long_name"] = real.iloc[min(max(t["base_row"], 0), len(real) - 1)]["fund_long_name"]
        if t["trick"] == "missing_fee":
            row["expense_ratio"] = None
        rows.append(row)
        key.append({"fund_id": row["fund_symbol"], "trick": t["trick"], "disguise": t["disguise"],
                    "changes": t["changes"], "caught_if": catalogue[t["trick"]]["caught_if"],
                    "right_reason": catalogue[t["trick"]].get("right_reason", []),
                    "benign": catalogue[t["trick"]].get("benign", False)})
    mixed = pd.concat([real, pd.DataFrame(rows)], ignore_index=True).sample(frac=1, random_state=SEED)
    mixed.to_csv(OUT / "funds_redteam.csv", index=False)
    (OUT / "redteam_answer_key.json").write_text(json.dumps(key, indent=2, default=str))
    print(f"Planted {len(rows)} tricks among {len(real)} real funds -> data/test/funds_redteam.csv")
    for k in key:
        print(f"  {k['fund_id']:6s} {k['trick']:32s} {k['disguise'][:90]}")


def score(run_dir: str):
    key = json.loads((OUT / "redteam_answer_key.json").read_text())
    results = {r["fund_id"]: r for r in json.loads((Path(run_dir) / "results.json").read_text())}
    summary = json.loads((Path(run_dir) / "summary.json").read_text())
    dropped = {i["fund_id"] for i in summary.get("quality_issues", []) if i["action"] == "drop"}
    caught, lines = 0, []
    for k in key:
        r = results.get(k["fund_id"])
        outcome = "dropped" if k["fund_id"] in dropped and not r else (r["decision"]["decision"] if r else "not reviewed")
        how, text = [], ""
        if r:
            if r["record"].get("quarantine_reason"):
                how.append("quarantine: " + r["record"]["quarantine_reason"][:60])
            how += sorted({f["kind"] for f in r["record"].get("flags", [])})
            how += [f"{v['reviewer']}={v['verdict']}" for v in r["verdicts"] if v["verdict"] in ("fail", "concern", "cannot_assess")]
            text = " ".join([r["decision"]["reason"] or ""] + [v["reason"] for v in r["verdicts"]]).lower()
        signals = k.get("right_reason", [])
        right = (not signals) or any(sig in how or any(h.startswith(sig) for h in how) or sig in text for sig in signals)
        ok = outcome in k["caught_if"] and right
        caught += ok
        label = "handled correctly" if k["benign"] else "caught"
        verdict = f"({label})" if ok else ("(MISSED: rejected for another reason)" if outcome in k["caught_if"] else "(MISSED)")
        lines.append(f"{'✓' if ok else '✗'} {k['fund_id']:6s} {k['trick']:32s} -> {outcome:26s} "
                     f"{verdict}  {', '.join(how)[:110]}")
    real = [f for f in results if f not in {k["fund_id"] for k in key}]
    fp = [f for f in real if results[f]["decision"]["decision"] in ("rejected", "quarantined")]
    print(f"RedTeam score: caught {caught} of {len(key)} planted tricks ({caught / max(len(key), 1):.0%})")
    print(f"Real funds wrongly rejected or quarantined: {len(fp)} of {len(real)}"
          + (f" ({', '.join(fp)})" if fp else ""))
    print("\n".join(lines))
    out = {"caught": caught, "planted": len(key), "false_positives": fp, "real_funds": len(real),
           "detail": [l for l in lines]}
    (Path(run_dir) / "redteam_score.json").write_text(json.dumps(out, indent=2))
    from fundsentinel import store
    store.init_db()
    store.sql("UPDATE runs SET redteam = :r WHERE run_id = :id", {"r": {**out, "key": key}, "id": summary["run_id"]})
    print("Scorecard saved to the database (runs.redteam).")


if __name__ == "__main__":
    {"generate": lambda: generate(), "score": lambda: score(sys.argv[2])}[sys.argv[1]]()
