# Prompt for Claude Design: FundSentinel dashboard

Copy everything below the line into Claude Design.

---

Design the web dashboard for **FundSentinel**, an AI system that approves or rejects mutual funds and ETFs for a fund-approval committee. It will be shown live to a hackathon jury (TIAA x ASU AI Investment Spark Challenge) on a projector for about 5 minutes, then used by the judges to click around. Design for a 1440×900 desktop screen first; it must still read clearly on a projector (large type for key numbers, strong contrast, no tiny grey text for anything important).

## What the product does (so the design tells this story)

A messy fund data file goes in. A team of AI agents cleans it and maps it onto a standard format (Stage 1: Profiler, Quality, SelfHeal, Transform, Metadata). Then an AI committee judges every fund (Stage 2): a Supervisor routes the work to four reviewers (Analyst: performance, Compliance: hard rules, Finance: fees, Suitability: investor fit). An Evidence checker rejects any verdict that isn't backed by real numbers. A Decision owner makes the final call: **Approved**, **Approved with conditions**, **Rejected**, **Flagged for human review**, or **Quarantined** (data too broken to judge). When an updated file arrives, **Radar-lite** reopens only the reviews the changes affect. A **RedTeam** agent plants trick funds to test the system, and we show an honest score, misses included.

The core promise the UI must make visible: **every decision has a plain-English reason, and every number behind it can be traced back to the exact cell in the source file.** Nothing is a black box. Nothing stops the line; uncertain items are flagged, never silently dropped.

Always show this footer or caption somewhere persistent: "Mock scenario · internal decision support · not investment advice".

## Users

1. Committee staff reviewing today's decisions ("what was approved, what needs me?").
2. A judge who wants to click one fund and understand exactly why it was rejected.
3. Data/ops people checking data quality and what the AI changed.

## Screens (all read from one database; each run is one uploaded file)

A left sidebar holds: product name + logo mark, a **run selector** (e.g. "funds_v2-radar-86a42a759b · test/funds_v2.csv · 8 funds · 92 s"), a **New run** button, and navigation. Runs of type "update" (Radar-lite) and "RedTeam" get a small badge.

### 1. New run (upload and launch)
- Pick a file (from S3 or upload a CSV), optional "Uploader note" text box (e.g. "Data snapshot date 2023-04-26"), options: mapping = "Let the Profiler map it" (default) or a saved mapping; which funds (first N / specific IDs); "Compare with an earlier run (Radar-lite)" dropdown.
- A **Launch** button runs it in the cloud (AWS AgentCore).
- **Live progress view**: a horizontal pipeline of stages (Profiler → Quality → SelfHeal → Transform → Metadata → Supervisor → Reviewers → Evidence checker → Decision owner) with each lighting up as it completes, plus a live list of funds as they finish (fund ID, decision chip, time taken). Runs take 1–10 minutes; the screen must feel alive, not frozen.

### 2. Overview / Decisions (the landing page)
- Six big number tiles: Approved, Approved with conditions, Rejected, Flagged for review, Sent back, Quarantined. Example: 1 · 1 · 4 · 1 · 0 · 1.
- Secondary tiles: Funds reviewed (8), Pipeline time (156 s), Data quality score (45/100), Time saved (e.g. "≈ 3 weeks of email approvals → 3 minutes"; leave room for this).
- **"Where funds get stuck"** insight: a small bar chart of which reviewer produced the most fails or "can't assess" (e.g. Compliance 4 of 8), with a one-line sentence above it.
- A **funds table**: fund ID, name, category, decision chip, decided by (rule / AI), and a 4-cell mini-grid of reviewer verdicts (pass ✓ / concern ⚠ / fail ✗ / can't assess ?). Rows are clickable → Fund story.

### 3. Fund story (the most important screen: design this one with the most care)
For one fund, top to bottom:
- Header: ticker, fund name, category, status chip (ok / flagged / quarantined).
- **The decision**, big: e.g. "Rejected", with the 2–3 sentence reason. Example: "The finance reviewer failed the fund on a hard fee rule: its annual expense ratio is 1.10%, well above the 0.75% maximum our policy allows. Compliance and suitability both passed." If decided by a fixed rule, show which (e.g. "Fixed rule: compliance fail always rejects"). Conditions as a list (e.g. "Restrict to experienced investors").
- **Data-quality flags** banner if any (amber), e.g. "Name 'Dodge & Cox Stock Fund' is also used by 3 other tickers: HSDVX, OTCGX, VAESX. At least one of these rows is probably mislabelled."
- **Four reviewer cards** (Analyst, Compliance, Finance, Suitability): verdict chip, confidence (0–1), 1–3 sentence reason, and an evidence table (field, value, source reference, rule checked). Example evidence row: `expense_ratio | 0.0122 | yahoo_us/MutualFunds.csv#row2 | finance.max_expense_ratio=0.0075`. A small tick "evidence verified" or warning "evidence not verified". Cards for reviewers that were skipped or carried forward say so ("Skipped: compliance failed, so the fund is rejected regardless" / "Carried forward: nothing it checks changed").
- **"How this fund was routed"** timeline (collapsible, expanded when there were send-backs): ordered steps with an actor, an action and a short detail, e.g.
  1. Supervisor → called Compliance ("Screen DODGX first; a fail would end the review")
  2. Compliance → verdict: pass
  3. Supervisor → called Analyst, Finance, Suitability (in parallel)
  4. Evidence checker → sent back Analyst ("evidence value not in its tool output")
  5. Analyst → verdict: pass
  6. Decision owner → approved with conditions
  Actors: Supervisor, each reviewer, Evidence checker, Guardrail (code), Radar, Decision owner. Distinguish AI steps from fixed code rules visually.
- **Provenance table** (collapsible): every field with raw value from the file → cleaned value → source column → row → what changed it. Example: `expense_ratio | "52 bps" → 0.0052 | Annual Expense | row 4 | 52 bps basis points → 0.0052`; `category | "Equty" → "Equity" | fund_category | row 3 | SelfHeal fix (97% sure)`. Derived columns (x_fee_vs_category, x_sharpe_ratio_3y…) marked as derived.

### 4. Data quality
- Quality score gauge (0–100) + 3–4 sentence summary written by the Quality agent + up to 5 "top problems" bullets.
- Counts: issues found (whole file), quarantined, flagged, fixed, dismissed.
- Issues table: fund, field, problem kind (typo, out of range, missing required, duplicate row, unknown ticker, shared name, AI-found inconsistency…), action (fix / flag / quarantine / drop / dismiss), **decided by** (rule / SelfHeal agent / guardrail = code overruled the agent / Quality agent), confidence, reason. Example rows: `BBSOX | category | typo | fix | selfheal | 0.97 | 'Equty' → 'Equity'`; `FFFPX | expense_ratio | out of range | flag | selfheal | 0.6 | Bare 7.5 likely means 0.75% typed without the decimal`; `row12 | fund_id | missing | quarantine | rule | 1.0 | Cannot check a fund we cannot identify`.

### 5. Data dictionary
- Dataset description paragraph (written by the Metadata agent).
- Table of every column: name, standard or derived, plain-English description, unit (e.g. "fraction (0.0075 = 0.75%)"), coverage as a progress bar, source column, how it was converted, caveats.
- "New columns proposed by the Transform agent": each with accepted/rejected, formula or source column, coverage, and why/why not (e.g. "✗ front_end_sales_load: only 16% of funds have a value (need 50%)").

### 6. Column mapping (how an unfamiliar file was understood)
- Table: standard field ← source column, unit, confidence, code check result (accepted / rejected + reason), parse rate, in-range rate, and the Profiler's one-line rationale. Show the Profiler's rounds: e.g. "Round 1: 15/16 accepted (rejected: '1Y % ' — column not in file). Round 2: fixed." This is where "works on any dataset" is proven: e.g. India file mapped with percent units, crore ×10,000,000, a 1–6 risk scale rescaled to 1–5.

### 7. Changes (Radar-lite) — only for update runs
- Tiles: changes detected (21), material/ambiguous (5), reviews reopened ("6 of 32"), decisions changed (1).
- **Before → after** table per fund: before decision chip → after decision chip, reviewers reopened, reviewers carried forward. Highlight the changed row (KDHAX: Approved with conditions → Rejected).
- Every change: fund, field, old → new, materiality chip (routine grey / material red / ambiguous amber), decided by (Radar agent / guardrail), reason. Example: `KDHAX | expense_ratio | 0.60% → 1.10% | material | Fee crossed the 0.75% cap`; `JVAIX | fund_name | … → … (Renamed) | ambiguous | Could be cosmetic or a merger; Compliance reopened`; `* | as_of_date | 2021-10-29 → 2021-11-30 | routine`.
- Stale evidence list: reviewer, field, old value, rule (e.g. "finance · expense_ratio = 0.006 · stale").

### 8. RedTeam scorecard — only for RedTeam runs
- Big score: "Caught X of 13 planted tricks" and "Real funds wrongly rejected: Y of 8".
- One row per trick: ✓/✗, trick name (hidden high fee, fake returns, leveraged fund disguised, low-risk label on an aggressive fund, tiny fund, too new, wrong ticker, clone fund, fee just under the cap, category mismatch, missing fee, stale data, fee written as "60 bps" (a harmless trick the system must read correctly, not punish)), the outcome, and what caught it (e.g. "compliance=fail", "implausible_value flag"). **Misses must be as visible as catches**: honesty is the point.

## Visual direction
- Calm, trustworthy, institutional, like a modern internal tool at an asset manager, not a crypto dashboard. Plenty of white space; one accent colour; decision colours: Approved green, Approved with conditions teal, Rejected red, Flagged amber, Quarantined purple/grey, Sent back blue. Always pair colour with an icon or label (colour-blind safe).
- Monospace for tickers, field names and source references (`yahoo_us/MutualFunds.csv#row2`) so provenance feels precise.
- Distinguish **AI judgement** from **code rules** consistently (e.g. a small sparkle icon for AI, a gear/lock icon for rules), since the whole design principle is "numbers and hard rules in code, judgement by AI".
- Light and dark theme.
- Include empty, loading and error states: no runs yet; run in progress; AWS login expired ("Run `aws login --profile fundsentinel`"); a reviewer that could not run ("needs a re-run").

## Build constraints
The first version will be built in **Streamlit** (Python), so prefer components Streamlit can do: sidebar, tabs, metric tiles, tables/dataframes, expanders, simple bar charts, chips via coloured text/badges, progress bars. Please also show how the Fund story screen would look if we later rebuilt it as a custom web app, since that's the screen judges spend time on.

Deliver: the 8 screens above at 1440×900, the Fund story screen for a rejected fund and for a flagged fund with data-quality flags, a component sheet (decision chips, verdict chips, AI-vs-rule markers, evidence row, timeline step), and a short note on the colour tokens.
