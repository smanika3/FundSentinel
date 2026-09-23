# Data sources

Raw files live in `s3://fundsentinel-736265634398-us-east-1/raw/` (local copies in `data/raw/`, gitignored). All data is treated as mock data for internal decision support, not live or investment advice.

| Folder | Source | Files used | Size | Role in the pipeline |
| --- | --- | --- | --- | --- |
| `raw/yahoo_us/` | [US Funds dataset from Yahoo Finance](https://www.kaggle.com/datasets/stefanoleone992/mutual-funds-and-etfs) (Kaggle, Nov 2021 values) | `MutualFunds.csv` (23,783 × 298), `ETFs.csv` (2,310 × 142) | 77 MB | Main build dataset |
| `raw/india/` | [Mutual Funds India – Detailed](https://www.kaggle.com/datasets/ravibarnawal/mutual-funds-india-detailed) (Kaggle) | `comprehensive_mutual_funds_data.csv` (814 × 20) | 125 KB | "Very different dataset" test: scheme / AMC / SIP vocabulary |
| `raw/tefas/` | [TEFAS Fund Dataset](https://www.kaggle.com/datasets/serifcolakel/tefas-fund-dataset) (Kaggle, Turkish funds, Aug 2026) | Fund info: `funds.csv`, `fund_details.csv`, `fund_returns.csv`, `category_returns.csv`, `benchmark_returns.csv`. History: `fund_snapshots.csv` (daily price, size, investors since 2021), `fund_prices.csv`, `asset_allocations.csv` (daily % in stocks/bonds/etc.) | 299 MB | Multi-table, Turkish-language test; history files can show real day-to-day changes |
| `raw/sec/` | [SEC mutual fund ticker file](https://www.sec.gov/files/company_tickers_mf.json) | `company_tickers_mf.json` (28,551 rows: cik, seriesId, classId, symbol) | 1.2 MB | Identity checks (ticker ↔ fund) and RedTeam wrong-ticker trick |
| `raw/sec_rr/<quarter>/` | [SEC Mutual Fund Prospectus Risk/Return Summary](https://www.sec.gov/data-research/sec-markets-data/mutual-fund-prospectus-riskreturn-summary-data-sets), quarters **2025q3, 2025q4, 2026q1, 2026q2** | Per quarter: `sub.tsv` (one row per filing: fund company, form, dates), `num.tsv` (the numbers: fees, returns, keyed by `adsh` + `tag` + `series`/`class`), `txt.tsv` (prospectus text: objectives, strategies, risks; the huge file), `lab.tsv`/`tag.tsv`/`cal.tsv` (tag labels and definitions), `readme.htm` | 1.2 GB | Official fee tables for provenance; compare quarters for **real** fee changes (Radar-lite); real messy data for Quality |

Skipped on purpose: the price-history files in the Yahoo bundle (2 GB).

### SEC Risk/Return cheat sheet

Useful `num.tsv` tags: `ExpensesOverAssets` (total expense ratio), `ManagementFeesOverAssets`, `DistributionAndService12b1FeesOverAssets`, `OtherExpensesOverAssets`, `AverageAnnualTotalReturns1YearPercent` / `5YearsPercent` / `10YearsPercent`, `ExpenseExampleYear01..10` (dollar cost on $10k). Values are fractions (0.1517 = 15.17%). Join to `sub.tsv` on `adsh`; `series`/`class` link to `seriesId`/`classId` in the SEC ticker file. Filing counts: 1,395 / 1,506 / 1,622 / 2,313 per quarter.

## Not downloaded yet

- **European Funds from Morningstar** (Kaggle): download returns 403 without a Kaggle login. Download manually from the Kaggle page or add a Kaggle API token to `~/.kaggle/kaggle.json`.
- **SDV synthetic funds** (scale test), **FRED DTB3** (optional)

## Quirks worth knowing (good material for Quality / SelfHeal)

- **TEFAS:** no expense ratio (only `entry_commission` / `exit_commission`), so Finance can't check fees for these funds; Turkish text; `risk_level` is 1–7; fund returns are in **percent** (e.g. 3.79) while `category_returns` look like **fractions** (e.g. 0.025); fund data is split across three tables joined on `fund_code`.
- **Yahoo:** expense ratio is `fund_annual_report_net_expense_ratio`, with a category average in `category_annual_report_net_expense_ratio`, which is handy for "fee vs category" in Transform.
- **India:** `expense_ratio` is in percent; fund size is in crore (`fund_size_cr`).

Check each Kaggle dataset's licence on its page before submission and credit all sources in the README.
