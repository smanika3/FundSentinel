"""Build the pipeline's test files from real Yahoo rows. Deterministic (fixed seed) so everyone gets the same files.

Outputs in data/test/:
  funds_alt_columns.csv   renamed columns + messy formats (Profiler test, "works on any dataset")
  funds_broken.csv        planted data problems (Quality / SelfHeal test) + broken_answer_key.json
  funds_v1.csv, funds_v2.csv   same funds a month apart with known changes (Radar-lite) + changes_answer_key.json
  alt_columns_answer_key.json  the correct mapping for funds_alt_columns.csv (to score the Profiler)

Run: uv run python scripts/make_test_files.py
"""

import json
import random
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "test"
SEED = 7

RISK_WORDS = {1: "Low", 2: "Below Average", 3: "Average", 4: "Above Average", 5: "High"}
BENCHMARKS = {"Large Blend": "S&P 500 TR USD", "Large Growth": "Russell 1000 Growth TR USD",
              "Large Value": "Russell 1000 Value TR USD", "Intermediate Core Bond": "Bloomberg US Agg Bond TR USD",
              "Mid-Cap Blend": "Russell Mid Cap TR USD", "Small Blend": "Russell 2000 TR USD",
              "Foreign Large Blend": "MSCI ACWI Ex USA NR USD"}


def load_pool() -> pd.DataFrame:
    df = pd.read_csv(ROOT / "data/raw/yahoo_us/MutualFunds.csv", low_memory=False)
    ok = (df.fund_annual_report_net_expense_ratio.notna() & df.morningstar_risk_rating.notna()
          & (df.total_net_assets > 1e8) & df.fund_category.notna() & df.fund_return_5years.notna()
          & df.category_annual_report_net_expense_ratio.notna() & (df.fund_symbol != "VFIAX"))
    return df[ok].reset_index(drop=True)


def money(v: float) -> str:
    return f"${v / 1e9:.2f}B" if v >= 1e9 else f"${v / 1e6:.1f}M"


def fee_text(v: float, i: int) -> str:
    return f"{v * 10000:.0f} bps" if i % 2 == 0 else f"{v * 100:.2f}%"


def us_date(iso: str) -> str:
    return pd.Timestamp(iso).strftime("%m/%d/%Y")


def alt_columns(pool: pd.DataFrame, rng: random.Random) -> None:
    rows = pool.sample(40, random_state=SEED).reset_index(drop=True)
    extra = pool[pool.fund_symbol.isin(["DODGX", "AAAAX", "ACEKX"])]
    rows = pd.concat([extra, rows]).drop_duplicates("fund_symbol").reset_index(drop=True)
    out = pd.DataFrame({
        "Ticker Symbol": rows.fund_symbol,
        "Fund Title": rows.fund_long_name,
        "Sponsor": rows.fund_family,
        "Peer Group": rows.fund_category,
        "Annual Expense": [fee_text(v, i) for i, v in enumerate(rows.fund_annual_report_net_expense_ratio)],
        "Peer Avg Expense %": (rows.category_annual_report_net_expense_ratio * 100).round(2),
        "Risk Band": rows.morningstar_risk_rating.astype(int).map(RISK_WORDS),
        "1Y %": (rows.fund_return_1year * 100).round(2),
        "3Y Ann %": (rows.fund_return_3years * 100).round(2),
        "5Y Ann %": (rows.fund_return_5years * 100).round(2),
        "Peer 5Y %": (rows.category_return_5years * 100).round(2),
        "AUM": rows.total_net_assets.map(money),
        "Launch": rows.inception_date.map(us_date),
        "Data Date": pd.to_datetime(rows.returns_as_of_date).dt.strftime("%b %d, %Y"),
        "Morningstar Stars": rows.morningstar_overall_rating,
        "Turnover %": (rows.annual_holdings_turnover * 100).round(1),
    })
    out.to_csv(OUT / "funds_alt_columns.csv", index=False)
    key = {"source": "test/funds_alt_columns.csv", "author": "answer key", "fields": {
        "fund_id": {"column": "Ticker Symbol"}, "ticker": {"column": "Ticker Symbol"},
        "fund_name": {"column": "Fund Title"}, "fund_family": {"column": "Sponsor"},
        "category": {"column": "Peer Group"}, "expense_ratio": {"column": "Annual Expense"},
        "category_expense_ratio": {"column": "Peer Avg Expense %", "unit": "percent"},
        "risk_score": {"column": "Risk Band"}, "return_1y": {"column": "1Y %", "unit": "percent"},
        "return_3y": {"column": "3Y Ann %", "unit": "percent"}, "return_5y": {"column": "5Y Ann %", "unit": "percent"},
        "category_return_5y": {"column": "Peer 5Y %", "unit": "percent"}, "total_net_assets": {"column": "AUM"},
        "inception_date": {"column": "Launch"}, "as_of_date": {"column": "Data Date"}}}
    (OUT / "alt_columns_answer_key.json").write_text(json.dumps(key, indent=2))


def broken(pool: pd.DataFrame, rng: random.Random) -> None:
    rows = pool.sample(30, random_state=SEED + 1).reset_index(drop=True)
    df = pd.DataFrame({
        "fund_symbol": rows.fund_symbol, "fund_long_name": rows.fund_long_name, "fund_family": rows.fund_family,
        "fund_category": rows.fund_category,
        "expense_ratio": (rows.fund_annual_report_net_expense_ratio * 100).round(2).astype(str) + "%",
        "risk_rating": rows.morningstar_risk_rating.astype(int), "return_5y_pct": (rows.fund_return_5years * 100).round(2),
        "total_net_assets": rows.total_net_assets.round(0), "inception_date": rows.inception_date,
        "as_of_date": rows.returns_as_of_date})
    planted = []

    def plant(i, col, value, kind, expect):
        planted.append({"row": i + 2, "fund_id": df.at[i, "fund_symbol"], "column": col,
                        "original": None if pd.isna(df.at[i, col]) else str(df.at[i, col]),
                        "planted": None if value is None else str(value), "kind": kind, "expected_handling": expect})
        df.at[i, col] = value

    plant(0, "fund_category", df.at[0, "fund_category"].replace("a", "", 1) if "a" in df.at[0, "fund_category"] else "Equty",
          "typo", "fix: nearest known category (high confidence)")
    plant(1, "fund_category", "Equty", "typo", "fix: 'Equity' or flag (no exact category)")
    plant(2, "expense_ratio", "45%", "impossible_value", "flag or quarantine: fee far above any real fund")
    plant(3, "expense_ratio", None, "missing_required", "quarantine: 'Cannot check: fee missing'")
    plant(4, "expense_ratio", "7.5", "ambiguous_unit", "flag: bare 7.5 most likely 0.75% typed without %")
    plant(5, "expense_ratio", "75 bps", "unit_variant", "fix: 75 bps -> 0.0075")
    plant(6, "risk_rating", 9, "out_of_range", "flag: risk rating outside 1-5")
    plant(7, "inception_date", "2021-13-45", "bad_date", "flag: unparseable date")
    plant(8, "total_net_assets", -250000000, "impossible_value", "flag: negative fund size")
    plant(9, "return_5y_pct", 90.0, "implausible_value", "flag: 90% annualised 5-year return")
    plant(10, "fund_symbol", None, "missing_required", "quarantine: no fund identifier")
    plant(11, "inception_date", "2031-01-15", "future_date", "flag: launch date after as-of date")
    df = pd.concat([df, df.iloc[[12]]], ignore_index=True)  # exact duplicate row
    planted.append({"row": len(df) + 1, "fund_id": df.at[12, "fund_symbol"], "column": "*", "kind": "duplicate_row",
                    "expected_handling": "drop duplicate, keep first"})
    df.to_csv(OUT / "funds_broken.csv", index=False)
    (OUT / "broken_answer_key.json").write_text(json.dumps(planted, indent=2))


def versions(pool: pd.DataFrame, rng: random.Random) -> None:
    # Radar-lite story needs clean identities: unique names whose first word matches the fund family's first word.
    full = pd.read_csv(ROOT / "data/raw/yahoo_us/MutualFunds.csv", usecols=["fund_long_name"], low_memory=False)
    shared = set(full.fund_long_name.value_counts()[lambda c: c > 1].index)
    clean = pool[~pool.fund_long_name.isin(shared)
                 & pool.apply(lambda r: str(r.fund_family).split()[0].lower() in str(r.fund_long_name).lower(), axis=1)]
    rows = clean[clean.fund_category.isin(BENCHMARKS)].sample(20, random_state=SEED + 2).reset_index(drop=True)
    # Scenario names: Yahoo's own names are often attached to the wrong ticker, which would muddy the Radar-lite story.
    styles = ["Select", "Core", "Focus", "Premier", "Heritage", "Dynamic", "Summit", "Pioneer", "Horizon", "Keystone",
              "Meridian", "Beacon", "Anchor", "Compass", "Keel", "Crest", "Harbor Point", "Sterling", "Atlas", "Liberty"]
    scenario_names = [f"{' '.join(str(f).split()[:2])} {styles[i]} {c} Fund"
                      for i, (f, c) in enumerate(zip(rows.fund_family, rows.fund_category))]
    v1 = pd.DataFrame({
        "fund_symbol": rows.fund_symbol, "fund_long_name": scenario_names, "fund_category": rows.fund_category,
        "benchmark": rows.fund_category.map(BENCHMARKS),
        "expense_ratio": rows.fund_annual_report_net_expense_ratio,
        "category_expense_ratio": rows.category_annual_report_net_expense_ratio,
        "risk_rating": rows.morningstar_risk_rating.astype(int), "return_1y": rows.fund_return_1year,
        "return_5y": rows.fund_return_5years, "category_return_5y": rows.category_return_5years,
        "total_net_assets": rows.total_net_assets.round(0), "inception_date": rows.inception_date,
        "as_of_date": "2021-10-29"})
    v1.loc[0, "expense_ratio"] = 0.0060  # scenario: Radar-lite headline fund starts at 0.60%
    v2 = v1.copy()
    v2["as_of_date"] = "2021-11-30"  # routine: every fund's date moves
    v2["return_1y"] = (v2.return_1y + [rng.uniform(-0.01, 0.01) for _ in range(len(v2))]).round(5)  # routine drift
    changes = [{"fund_id": v1.at[i, "fund_symbol"], **c} for i, c in [
        (0, {"field": "expense_ratio", "old": 0.0060, "new": 0.0110, "materiality": "material",
             "reopen": ["finance", "decision_owner"]}),
        (0, {"field": "benchmark", "old": v1.at[0, "benchmark"],
             "new": "S&P 500 TR USD" if v1.at[0, "benchmark"] != "S&P 500 TR USD" else "Russell 1000 Growth TR USD",
             "materiality": "material", "reopen": ["analyst", "suitability", "decision_owner"]}),
        (1, {"field": "risk_rating", "old": int(v1.at[1, "risk_rating"]), "new": 5, "materiality": "material",
             "reopen": ["suitability", "decision_owner"]}),
        (2, {"field": "total_net_assets", "old": float(v1.at[2, "total_net_assets"]), "new": 40000000.0,
             "materiality": "material", "reopen": ["compliance", "decision_owner"]}),
        (3, {"field": "fund_long_name", "old": v1.at[3, "fund_long_name"],
             "new": v1.at[3, "fund_long_name"] + " (Renamed)", "materiality": "ambiguous",
             "reopen": ["compliance?"]}),
    ]]
    col = {"risk_rating": "risk_rating"}
    for c in changes:
        idx = v2.index[v2.fund_symbol == c["fund_id"]][0]
        v2.at[idx, col.get(c["field"], c["field"])] = c["new"]
    changes.append({"fund_id": "*", "field": "as_of_date", "old": "2021-10-29", "new": "2021-11-30",
                    "materiality": "routine", "reopen": []})
    changes.append({"fund_id": "*", "field": "return_1y", "old": "various", "new": "small drift (<1 point)",
                    "materiality": "routine", "reopen": []})
    v1.to_csv(OUT / "funds_v1.csv", index=False)
    v2.to_csv(OUT / "funds_v2.csv", index=False)
    (OUT / "changes_answer_key.json").write_text(json.dumps(changes, indent=2, default=str))


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    pool, rng = load_pool(), random.Random(SEED)
    alt_columns(pool, rng)
    broken(pool, rng)
    versions(pool, rng)
    for f in sorted(OUT.iterdir()):
        print(f"{f.name:32s} {f.stat().st_size:>7,} bytes")
