# FundSentinel — everything explained in plain English

This document explains what FundSentinel is, every tool and service it uses and why, how each part works step by step, what data it uses, what every file in the repository does, what has been tested and with what results, how to run it, and what is still rough. It assumes no background in AWS or AI agents.

Status as of Wednesday 23 September 2026, evening.

---

## 1. What FundSentinel is, in one paragraph

Today, approving a mutual fund or ETF for a company's investment menu takes weeks of emails between analysts, compliance officers, finance people and managers, and when a fund's details change later, the change can slip through unnoticed. FundSentinel replaces that with a team of AI agents. You give it a spreadsheet of funds in any format. AI agents figure out what the columns mean, clean the data, and document it. Then an AI "committee" judges each fund on performance, rules, fees and investor fit, every judgement must point to real numbers in the file, and a final decision comes out with a plain-English reason. When an updated spreadsheet arrives later, only the reviews affected by the change are redone. Nothing ever stops to wait for a human: anything uncertain is labelled "needs human review" and the line keeps moving.

It is our entry for the **TIAA x ASU AI Investment Spark Challenge** (22–25 September 2026). Everything uses mock policies and public or synthetic data. It is internal decision support, never investment advice.

---

## 2. The hackathon: rules we must follow

| Rule | What it means for us |
| --- | --- |
| Region **us-east-1** only | Every AWS resource lives in N. Virginia. Anything elsewhere is blocked. |
| Only 3 AI models: **Claude Opus 5, Claude Sonnet 5, Titan Text Embeddings V2** | Any other model returns "explicit deny". We use Sonnet for most agents and Opus for the hardest judgements. |
| Code goes in **AWS CodeCommit**, never GitHub | Our repo is CodeCommit `fundsentinel`. |
| No credentials in commits | `.gitignore` blocks keys, `.env` files and data. |
| Teams of 3–5 | Team Vitality: Debaleena Chakraborty, Saisrivathsan Manikandan, Shrey Bishnoi. |
| Mandatory code review | **Thursday 24 Sept, 9:00–12:15 MT**, by appointment. |
| Final pitch | **Friday 25 Sept**: 5 min demo + 3 min jury questions. Only working features are scored. |

**How we're scored (100 points, 10 each):** code runs with no manual fixes · agents route themselves (not a script) · data quality checks · agentic AI for metadata · business insights · functionality and integration with AWS · innovation · scalability · business value · user experience. Section 14 maps each rubric line to what we built.

---

## 3. The whole flow at a glance

```
Fund file (CSV, any column names)
   │
   ▼  STAGE 1 — the data team
 Profiler agent ──► works out what each column means (with confidence scores)
   │                 code checks every mapping; rejected ones go back to the agent
   ▼
 Canonical records ─► every value keeps its raw form, cleaned form, source column and row ("provenance")
   │
 Quality ──────────► code detectors scan the whole file; Quality agent writes a report and spots contradictions
 SelfHeal agent ───► fix / flag / quarantine / dismiss each ambiguous problem; code re-checks every fix
 Transform ────────► standard extra columns in code + new columns the agent proposes (validated in code)
 Metadata agent ───► plain-English data dictionary for every column
   │
   ▼  STAGE 2 — the approval committee (per fund, 3 funds at a time)
 Supervisor agent ─► decides who reviews what and in which order; sends reviewers back on real conflicts
   ├── Analyst (performance)      ├── Compliance (hard rules)
   ├── Finance (fees)             └── Suitability (investor fit)
 Evidence checker ─► code: every cited number must come from the reviewer's own tools
                     AI: does the reasoning actually follow from the evidence?
 Decision owner ──► layer 1 fixed rules in code, layer 2 AI decision
   │
   ▼
 S3 (files) + Aurora database (record book) ──► Streamlit dashboard

 Later: updated file ──► Radar-lite ──► reopens only the affected reviewers, marks old evidence stale
 Testing: RedTeam agent ──► plants trick funds, scored honestly (misses shown)
```

---

## 4. The tools and services, and why each one

### 4.1 On your laptop

| Tool | What it is | Why we use it |
| --- | --- | --- |
| **AWS CLI** (v2.37) | The command-line program for talking to AWS. | Logging in, uploading data, deploying. The organisers' guide requires it. |
| **`aws login`** with profile **`fundsentinel`** | Signs the CLI in through your browser using your hackathon SSO account; a "profile" is a named set of credentials. | Everyone on the team uses the same profile name, so every command in our docs works on every laptop. **Catch:** the login only lasts about an hour in practice (tied to the SSO portal session), not the 90 days AWS advertises. When anything says "session expired" or `ExpiredToken`, run `aws login --profile fundsentinel` again. |
| **uv** | A fast Python package manager. | Installs our Python libraries and runs our code in an isolated environment (`uv run …`). AgentCore also uses it. |
| **Python 3.12** | The language all our code is in. | The organisers' guide asks for 3.10–3.12; AgentCore runs 3.12. |
| **Node.js + npx** | JavaScript runtime; `npx` runs a tool without installing it. | Only needed for the AgentCore CLI (`npx @aws/agentcore …`). |
| **Git** | Version control. | Pushes to CodeCommit. We set Git to use your AWS login for CodeCommit only, so your GitHub setup is untouched, and turned off macOS's password store for CodeCommit because it caches the short-lived password and breaks pushes later. |
| **Claude Code + Agent Toolkit for AWS** | The AI coding assistant, plus AWS's add-on that gives it AWS skills and a live "AWS MCP server" connection. | Lets the assistant read AWS docs, run AWS calls safely and check the account while building. It is a development tool only; FundSentinel itself doesn't depend on it. |

### 4.2 In AWS (all in account 736265634398, us-east-1)

| Service | What it is | Why we use it | Our resource |
| --- | --- | --- | --- |
| **IAM Identity Center (SSO)** | How the organisers give each student access. | Your login. Role `ExternalHackathonUser`. It's nearly admin, but blocks deleting anything in IAM and attaching AWS's built-in "Admin" policies (this matters for deployment, section 10). | — |
| **CodeCommit** | AWS's Git hosting. | Required by the rules (GitHub is banned). | Repo `fundsentinel` |
| **S3** | File storage ("buckets" of files). | The shared cupboard: raw data, cleaned data, provenance, evidence, reports, quarantined records, deployment packages. | Bucket `fundsentinel-736265634398-us-east-1` (encrypted, versioned, private, HTTPS only) |
| **Aurora Serverless v2 (PostgreSQL 16)** | A managed database that scales itself. | The permanent **record book**: every run, fund, verdict, decision, data problem, routing step, change and stale evidence. The plan calls it "RDS"; Aurora is part of RDS. | Cluster `fundsentinel-db`, database `fundsentinel` |
| **RDS Data API** | Lets you query the database over HTTPS with your AWS login. | No network setup, no database password in our code. Your laptop, the cloud agents and the dashboard all reach it the same way. | Enabled on the cluster |
| **Secrets Manager** | Stores passwords. | Holds the database password, created automatically; we never see or type it. | Secret attached to the cluster |
| **CloudFormation** | Infrastructure as code: a text file describes resources and AWS creates them. | Everything is reproducible, reviewable, in the repo. AWS recommends it over clicking in the console. | Stacks `fundsentinel-phase0` (repo, bucket, database) and `fundsentinel-runtime` (the cloud agents) |
| **Amazon Bedrock** | AWS's service for calling AI models. | Every AI agent calls Claude through it. | Model IDs in `config/models.json` |
| **Bedrock AgentCore Runtime** | AWS's managed hosting for AI agents. | The organisers deploy agents with it. Our whole pipeline runs there under its own role, so it doesn't stop when your laptop login expires, which protects the live demo. | Runtime `FundSentinel_pipeline`, role `fundsentinel-agentcore-runtime` |

**Cost:** the database runs at a minimum of 0.5 capacity units (about $0.06/hour, a few dollars total). We chose not to let it pause itself when idle because waking up takes seconds, which is bad in a live demo.

### 4.3 The AI models, and which agent uses which

| Model | ID we use | Used by | Why |
| --- | --- | --- | --- |
| **Claude Sonnet 5** | `us.anthropic.claude-sonnet-5` | Profiler, Quality, SelfHeal, Transform, Metadata, Analyst, Finance, Suitability, RedTeam | Fast and strong enough for focused jobs. |
| **Claude Opus 5** | `us.anthropic.claude-opus-5` | Supervisor, Compliance, Evidence checker, Decision owner, Radar-lite materiality | The hardest thinking: routing, conflicts, what counts as material, final calls, strict rule-checking. |
| **Titan Text Embeddings V2** | `amazon.titan-embed-text-v2:0` | Not used yet (optional in the plan) | Would help match unknown column names. The Profiler already scores 15/15 without it. |

**Important:** only the `us.` versions work. The `global.` versions are blocked for our account, and the AgentCore template defaults to a `global.` one. "Opus 5.5" appears in the model list but is not an allowed model.

### 4.4 The code libraries

| Library | Why |
| --- | --- |
| **Strands Agents** (v1.57) | Amazon's Python library for building agents. An agent = a model + a system prompt (its job description) + tools (Python functions it may call). We chose it over LangGraph because the organisers' AgentCore walkthrough uses it and it makes "agents as tools of other agents" (our Supervisor) simple. |
| **Pydantic** | Defines the exact "answer forms" agents must fill in (a verdict, a decision, a mapping…), so AI output is structured and checkable, never free text we have to parse. |
| **pandas** | Reads CSVs and does table maths. |
| **boto3 / botocore[crt]** | Python's AWS library. The `crt` extra is needed for `aws login` credentials. |
| **Streamlit** | Turns a Python script into a web dashboard. Fast to build; enough for the demo. |
| **bedrock-agentcore** | The small wrapper that turns our pipeline into an AgentCore Runtime endpoint. |

---

## 5. The data

All raw data lives in S3 under `raw/` and locally in `data/raw/` (not in git, it's 1.6 GB). Full details: `data/SOURCES.md`.

| Dataset | What it is (plain English) | What we use it for |
| --- | --- | --- |
| **Yahoo US funds** (Kaggle) | 23,783 mutual funds + 2,310 ETFs: names, fees, returns, risk ratings, sizes. Values from Nov 2021, treated as mock. | Main build dataset. |
| **India mutual funds** (Kaggle) | 814 Indian funds with different vocabulary ("scheme", "AMC"), percents instead of fractions, sizes in crore rupees, a 1–6 risk scale. | Proves the Profiler works on an unfamiliar file with no code changes. |
| **TEFAS** (Kaggle) | ~3,600 Turkish funds split across several files, Turkish text, no expense ratio. Plus large daily history files. | A future harder test (multi-table). Not used in a run yet. |
| **SEC ticker list** | Official US list of 28,551 mutual fund tickers and their IDs. | Quality flags tickers the SEC doesn't know. |
| **SEC risk/return summaries**, 4 quarters (2025Q3–2026Q2) | Official numbers from fund prospectuses: fees, returns, and text. 1.2 GB. | Planned: real fee changes between quarters for Radar-lite. Not used yet. |
| **Morningstar Europe** (Kaggle) | Needs a Kaggle login; not downloaded. | — |

### Known problem in the Yahoo data (found by our agents)
Many rows carry a **fund name that belongs to a different fund**: only **267 of 23,783** fund names in the file are unique, and the same share-class name appears under several tickers (e.g. "DWS RREEF Real Assets Fund - Class A" on 4 tickers), and VFIAX (really Vanguard's S&P 500 fund) is labelled "BNY Mellon Technology Growth Fund Class A". Nobody planted this. The Decision owner and Quality agent found it on their own. It's a great demo moment, but it also means Yahoo fund names can't be trusted, and funds sharing a name get a cautious "approved with conditions" or a flag.

### Test files we built (in `data/test/`, committed, each with an answer key so agents are **scored, not eyeballed**)
Built by `scripts/make_test_files.py` from real Yahoo rows with a fixed random seed, so everyone gets identical files.

| File | What's in it | Tests |
| --- | --- | --- |
| `funds_alt_columns.csv` | 43 funds, every column renamed ("Ticker Symbol", "Annual Expense"…), fees mixing "52 bps" and "0.48%", risk as words ("Below Average"), sizes like "$2.98B", US-style dates | The Profiler on an unfamiliar format |
| `funds_broken.csv` | 30 funds with **13 planted problems**: typos ("Equty"), a 45% fee, missing fee, "7.5" as a fee, risk 9, bad date "2021-13-45", negative size, 90% returns, missing ticker, launch date in 2031, a duplicate row | Quality + SelfHeal |
| `funds_v1.csv` / `funds_v2.csv` | The same 20 funds a month apart. Changes: headline fund's fee 0.60% → 1.10% and benchmark switch, one fund's risk 4 → 5, one fund shrinks below $50M, one fund renamed (deliberately ambiguous), every date moves, returns drift slightly. Names are scenario names ("Franklin Templeton Select Large Value Fund") because the real Yahoo names are unreliable. | Radar-lite |
| `funds_redteam.csv` | 13 trick funds designed by the RedTeam agent, shuffled among 8 real funds | RedTeam |

---

## 6. The configuration files (rules live here, not in code)

| File | What it controls |
| --- | --- |
| `config/schema.json` | The **canonical schema**: the 19 standard fields every file is mapped onto (fund_id, fund_name, ticker, fund_family, category, benchmark, currency, expense_ratio, category_expense_ratio, risk_score 1–5, return_1y/3y/5y, category_return_5y, total_net_assets, inception_date, fund_age_years, as_of_date, source_ref), with type, allowed range and description. All rates are fractions (0.0075 = 0.75%). |
| `config/policy.json` | The **mock approval policy**: max fee 0.75%; fee more than 25% above category = concern; 3+ years history; 5-year return may trail the category by at most 2 points; a 1-year return over 100% is treated as a data problem; prohibited keywords (leveraged, inverse, trading--, bear market); minimum size $50M (in USD); minimum 1-year track record; required fields; risk above 4 only for experienced investors; quarantine only if fee or ID is missing. |
| `config/fx.json` | Fixed mock exchange rates to USD (INR, TRY, EUR, GBP), so fund sizes in other currencies can be compared to the $50M rule. Added after we caught a ₹10 crore fund (~$1.2M) passing a $50M minimum. |
| `config/models.json` | The three model IDs. Every agent reads them from here. |
| `config/aws.json` | Bucket name, database addresses, repo URL. Not secrets. |
| `config/mappings/*.json` | Saved column mappings: the hand-written Yahoo "answer key", the fixed mapping for the v1/v2 files, and mappings the Profiler produced. |
| `config/reference/categories.json` | 123 fund categories from Yahoo, used to spot likely typos. A category not in the list is not an error by itself. |
| `config/radar.json` | Which reviewer checks which field (e.g. fee → Finance) and which computed evidence depends on which fields (e.g. "premium over category" depends on the fee). |
| `config/redteam.json` | The 13 trick types and, for each, which outcomes count as "caught". Fixed in config so the score can't be gamed by the agents. |

---

## 7. How each part works, step by step

A guiding principle everywhere: **numbers and hard rules are computed in code; judgement is done by AI; AI output is always checked by code.** AI never invents a number that decides anything.

### 7.1 Profiler (Sonnet): "what does each column mean?"
1. Code builds a **profile** of every column: name, type, how full it is, number of distinct values, 5 sample values, min/max/median.
2. The Profiler agent reads the profile plus the canonical schema and proposes a mapping: for each standard field, the source column (or a constant like "INR"), the **unit** (fraction / percent / basis points), a risk **scale** if not 1–5, a **multiplier** (e.g. 10,000,000 for crore), a **word list** for risk given as words ("Low" → 1), a **date format** when day/month order is ambiguous, a **confidence** score and a one-line rationale.
3. **Code checks every field** (`mapping.validate_mapping`): the column exists, at least 80% of values can be read, at least 90% fall inside the field's allowed range. A wrong unit shows up as values out of range. Special rule: if 90%+ of risk values are already 1–5, a different scale is rejected. (We added this after the Profiler once saw a single planted "9" and declared a 1–9 scale, which would have silently rescaled every fund.)
4. Rejected fields go back to the Profiler with the reason; up to 3 rounds. Only accepted fields are used.

Results: Yahoo 298 columns → 15/16 correct vs the answer key on the first try (the 16th was an equivalent answer). Renamed-columns file → **15/15**, and the fix-and-retry loop fired for real (round 1 misspelled a column name, code rejected it, round 2 fixed it). India → percents, crore and 1–6 scale all worked out from the values alone; it refused to invent missing dates.

When you give a saved mapping (`--mapping`), the Profiler is skipped. `--context` passes facts from the uploader (e.g. "data snapshot date 2023-04-26") which the Profiler may use as constants.

### 7.2 Canonical records and provenance
`mapping.apply_mapping` turns every row into a record of standard fields. **Every value** stores: the cleaned value, the raw value from the file, the source column, the row number, and a note of what changed it (e.g. "52 bps basis points → 0.0052", "'Above Average' → 4 via value_map", "SelfHeal fix 'Equty' → 'Equity' (97% sure)"). Each record also has a `source_ref` like `yahoo_us/MutualFunds.csv#row2`. This is **field-level provenance**: any number in any decision can be traced to its exact cell.

Unit conversion (`normalise.py`) is pure code: "75 bps", "0.75%", "0.0075" all → 0.0075; "$1.2B" → 1,200,000,000; dates in many formats → ISO dates.

### 7.3 Quality (code + Sonnet): "what's wrong with this data?"
**Code detectors** (`quality.py`) scan the whole file for: missing required fields, unreadable values, out-of-range values, suspicious values that are in range (a 3%+ fee, a 40%+ 5-year return), duplicate rows, duplicate IDs, likely category typos (word-by-word spell check against the reference list), impossible dates (launch after the data date), the same fund name under several tickers, and tickers not in the SEC list.

Obvious cases are decided **by rule**, instantly: exact duplicate row → drop; missing fee or ID → quarantine; other missing required fields → flag; impossible date → flag; shared name → flag.

The **Quality agent** then writes a plain-English report with a 0–100 score and top problems, and reads the funds under review looking for contradictions code can't see (e.g. "a municipal bond fund is filed as Large Blend"). Its findings become flags.

### 7.4 SelfHeal (Sonnet): "fix what we safely can, flag the rest"
For each ambiguous problem (likely typo, out-of-range or implausible value), the agent picks one of: **fix** (only if ≥90% sure, and the new value must be one of the candidates code computed), **flag** (plausible but unsure; may set a best guess, marked "needs review"), **quarantine** (can't be judged fairly), or **dismiss** (not actually a problem, e.g. "Sectoral / Thematic" is a real category name, not a typo).

**Code re-checks every fix** (`quality.validate_fix`): the value must be a code-computed candidate and inside the allowed range. Otherwise the fix is overruled and becomes a flag ("decided by: guardrail"). Flags travel with the fund into the committee, so reviewers see them. Quarantined funds skip the committee and are saved to S3 `quarantine/` with the reason.

Score on the broken file (`scripts/score_quality.py`): **13 of 13 planted problems caught and handled as expected.**

### 7.5 Transform: "add useful columns"
Code adds 5 **standard derived columns** to every fund: fee vs category average, 5-year return vs category, track-record length, size in USD, and a Low/Medium/High risk band.

The **Transform agent** (Sonnet) sees the columns the mapping didn't use (Yahoo has ~280) and proposes up to 6 new ones, either "bring in this column" or a formula. **Code validates** every proposal: formulas may only use + − × ÷ and known field names (no other code can run), and at least 50% of funds must get a value. On Yahoo it proposed 6 and 5 were accepted (3-year Sharpe ratio, Morningstar rating, turnover, ESG score, return per risk point); "front-end sales load" was rejected (16% coverage).

### 7.6 Metadata (Sonnet): "document every column"
Code computes facts for every column (source, conversion, coverage, example values, how many funds were flagged). The Metadata agent turns these into a **data dictionary**: meaning, unit and honest caveats for every column, plus a paragraph describing the dataset. Saved to S3 `metadata/<run>/data_dictionary.json` and the `column_metadata` table. This is how the metadata "plugs into a larger company system": it's a structured, machine-readable catalogue.

### 7.7 The four reviewers (Analyst, Finance, Suitability on Sonnet; Compliance on Opus)
Each reviewer has two **code tools**: one returns the facts it needs **with provenance** (and any data-quality flags), the other **applies the policy rules in code** and returns each rule's outcome (pass / concern / fail / can't assess). The AI reads these, decides a verdict, writes a 1–3 sentence reason, and must list **every number it relied on as evidence**, copied exactly from its tool output with the source reference.

| Reviewer | Checks |
| --- | --- |
| **Analyst** | Track record length, 1-year return plausibility, 5-year return vs category |
| **Compliance** | Prohibited product types (keywords + its own reading of name/category), minimum size in USD, minimum track record, required data present |
| **Finance** | Fee vs 0.75% cap; fee vs category average |
| **Suitability** | Risk 1–5 vs the general-investor limit of 4; whether the risk level fits the category |

### 7.8 Supervisor (Opus): "the panel chair"
The Supervisor is an agent whose **tools are the reviewers**. For each fund it decides the order: it always calls Compliance first and alone (a Compliance fail means certain rejection, so it can skip the others and save time; AFBIX, an inverse fund, was rejected in 39 seconds this way), then the others in parallel. It briefs reviewers on data flags, reads their answers, and when two reviewers rely on **conflicting facts** it sends one back with a specific question (max 2 per fund). **Code guardrail:** Compliance must always run, and others may only be skipped after a Compliance fail; otherwise code runs any reviewer the Supervisor skipped.

### 7.9 Evidence checker: "no proof, no pass"
1. **Code half** (`evidence.py`), on every verdict as it arrives: every cited value must appear in what that reviewer's own tools returned; every source reference must be the fund's real row (or "computed"); a pass/concern/fail must cite evidence; the reason must be an actual explanation (≥25 characters). Failure → sent straight back once with the exact problem.
2. **AI half** (Opus), once per fund: does each verdict's reasoning actually follow from its evidence? Unsupported → sent back once.
3. Still unproven → the Decision owner is **not allowed to decide**; the fund is flagged for human review.

It has caught a reviewer citing a sentence it wrote itself as "evidence", and a verdict whose reason was literally "test".

### 7.10 Decision owner (Opus)
- **Layer 1, fixed rules in code:** a Compliance fail (with verified evidence) always means **Rejected**; any verdict still unproven means **Flagged for review**; a verdict with no evidence means **Sent back**.
- **Layer 2, AI:** otherwise it chooses **Approved** (all pass), **Approved with conditions** (no fails, concerns that a condition can address, e.g. "restrict to experienced investors"), **Rejected** (a policy fail), or **Flagged for review** (key areas can't be assessed or evidence conflicts). The reason is written for a non-expert.

Plus **Quarantined** (from SelfHeal: fee or ID missing) and a flag if the Decision owner itself errors. Every fund always ends with a label; nothing stops the line.

### 7.11 Storage, run IDs and "no duplicates"
Each run's **run ID** is a fingerprint of the file + mapping + context. Re-running the same file gives the same run ID and every database write is an **upsert** (update if it exists), so re-runs never duplicate anything (verified). Partial re-runs (one fund) recount the run's totals from the tables so they don't shrink.

**Database tables:** `runs`, `mapping_checks`, `funds` (with full record and status), `verdicts` (with evidence and whether it was verified), `decisions` (with the Supervisor's report), `quality_issues`, `review_events` (the routing trail), `column_metadata`, `radar_changes`, `stale_evidence`.

**S3 folders:** `raw/` (source data), `clean/<run>/records.jsonl`, `provenance/<run>/fields.jsonl`, `evidence/<run>/verdicts.jsonl`, `metadata/<run>/` (mapping checks, quality report, data dictionary, transform), `quarantine/<run>/`, `reports/<run>/` (decisions + summary), `artifacts/runtime/` (deployment packages).

### 7.12 Reliability
- **Nothing pauses the pipeline.** A reviewer that errors becomes "can't assess — needs a re-run"; the Decision owner then flags the fund.
- **Brief Bedrock outages** ("service unavailable", throttling) are retried twice with a short wait.
- **Expired login** stops the run immediately with a clear message ("run `aws login --profile fundsentinel`"), instead of turning every fund into a failure. Re-running is safe (same run ID).
- **Speed:** funds are reviewed 3 at a time (`--workers`), each worker with its own agents. 6 funds took about 6.5 minutes. A typical fund takes 60–150 s; a fund with several send-backs can take ~5 minutes.

### 7.13 Radar-lite: "only reopen what the change affects"
1. The updated file is mapped with the **same mapping** as the earlier (baseline) run, and the code-only data steps run.
2. **Code diff:** every standard field that changed, per fund, plus code-computed facts on whether a change **crosses a policy line** (fee over the cap, size under $50M, risk over 4, a prohibited keyword appearing).
3. The **Radar-lite materiality agent** (Opus) labels each change **routine** (e.g. new date, small return drift), **material**, or **ambiguous** (e.g. a rename: cosmetic or a merger?), and picks which reviewers to reopen, starting from `config/radar.json` but deciding itself, with a reason. **Guardrail:** a change crossing a policy line is always material and always reopens its mapped reviewers.
4. Old evidence that cites a changed field (directly, or through a computed metric) is marked **stale**.
5. Reopened reviewers re-run, told exactly what changed; others are **carried forward**; the Evidence checker applies; the Decision owner re-decides. Funds with only routine changes keep their decision without any AI review.

Score (`scripts/score_radar.py`, v1 → v2): **5 of 5** planted changes handled correctly; **4 of 4** routine-only funds reopened nothing; **6 of 32** possible reviews reopened (19%); 5 evidence items marked stale. Headline fund KDHAX: fee 0.60% → 1.10% → **Approved with conditions → Rejected**; Compliance carried forward because nothing it checks changed. This is exactly the plan's story.

### 7.14 RedTeam: "try to fool the system, score it honestly"
The RedTeam agent (Sonnet) is given the mock policy and a catalogue of 13 trick types, and designs a realistic disguise for each by editing a copy of a real fund (e.g. a 0.74% fee just under the 0.75% cap but far above its peers; a leveraged fund whose category looks ordinary; a clean-looking fund whose data is 2 years stale). Code gives each a real but unused SEC ticker (so a fake ticker doesn't give it away, except in the "wrong ticker" trick), shuffles them among 8 real funds, and keeps a hidden answer key. What counts as "caught" is fixed in `config/redteam.json`. One trick is **benign** ("60 bps" must be read correctly, not punished) and one has **no rule in our system** (stale data), so misses are possible and shown. The scorecard also counts real funds wrongly rejected.

**Lesson from the first attempt (kept here on purpose):** the first RedTeam run scored "13 of 13", but that was inflated. The real funds used as starting points charged more than the 0.75% cap, so every trick inherited a failing fee and was rejected for the wrong reason (the stale-data fund was rejected for its fee, not its stale date). We fixed the test instead of claiming the score:
- The real funds and trick bases are now funds that pass **every** rule on their own (fee under the cap and below the category average, over $1B, 5+ years old, risk ≤ 4). So a trick fund can only be rejected because of its trick, and rejecting a real fund is a genuine false alarm.
- A trick only counts as caught if the outcome is right **and** a matching reason is present (e.g. `compliance=fail` for the tiny fund, an `ai_inconsistency` flag for the category mismatch, the words "stale" or "as_of_date" for stale data). Otherwise it's scored "MISSED: rejected for another reason".

Status: the fair run is in progress at the time of writing; the result goes in the dashboard's RedTeam tab.

---

## 8. Running in the cloud (AgentCore)

The whole pipeline runs as one AgentCore Runtime, `FundSentinel_pipeline`. You send it a small JSON request (which S3 file, optional mapping, context, how many funds); it downloads the file, runs everything, writes to S3 and the database, and returns a summary.

**Why we didn't use the organisers' `agentcore deploy`:** it first runs a one-time "CDK bootstrap" that gives a deployment role AWS's AdministratorAccess policy, which our account explicitly denies. Rather than work around a guardrail, we deploy the same two resources (a narrowly scoped execution role and the AgentCore Runtime) with our own CloudFormation template, `infra/runtime.yaml`. The AgentCore CLI is still used to package the code. The failed first attempt left 4 empty roles named `cdk-hnb659fds-*` that nobody on the account can delete (IAM deletes are denied); they have no permissions and nothing uses them. Other teams following the guide will likely hit the same error.

The runtime's role can only: call the three approved models, read/write our bucket, use the database Data API and its secret, and write its own logs.

---

## 9. The dashboard (`app/dashboard.py`)

Run with `uv run streamlit run app/dashboard.py`. Everything is read from the database. Pick a run in the sidebar.

| Tab | Shows |
| --- | --- |
| **Decisions** | Counts per decision, a table of every fund with its decision and the four reviewer verdicts, and "where funds get stuck" (which reviewer fails or can't assess most). |
| **Changes (Radar-lite)** | Only for update runs: changes detected, material/ambiguous, reviews reopened, decisions changed; before → after per fund; every change with its materiality and reason; stale evidence. |
| **RedTeam scorecard** | Only for RedTeam runs: caught X of 13, real funds wrongly rejected, every trick with ✓/✗ and what caught it. |
| **Fund story** | One fund: decision and reason, conditions, data-quality flags, **how it was routed** (every Supervisor call, send-back, skip), each reviewer's reason and evidence table, and the full provenance table. |
| **Data quality** | Quality score, report, and every issue with the action taken and who decided it (rule / SelfHeal / guardrail / Quality agent). |
| **Data dictionary** | The Metadata agent's description of every column, and the Transform agent's proposals with why each was accepted or rejected. |
| **Column mapping** | How each column was mapped and whether the code check accepted it. |


---

## 10. How to run things

Setup for a new teammate: `SETUP.md`. Then:

```bash
aws login --profile fundsentinel                 # whenever anything says "expired"
uv sync                                          # install libraries

# Full pipeline on a file (Profiler maps it; results to S3 + database)
uv run python -m fundsentinel.pipeline --source data/raw/india/comprehensive_mutual_funds_data.csv \
    --context "Data snapshot date 2023-04-26" --limit 5
# with a saved mapping instead of the Profiler, and specific funds
uv run python -m fundsentinel.pipeline --source data/raw/yahoo_us/MutualFunds.csv \
    --mapping config/mappings/yahoo_us_mutualfunds.json --funds DODGX VFIAX AFBIX
# useful options: --stage1-only (data team only)  --no-store  --no-supervisor  --workers 3

# Radar-lite: compare an updated file with an earlier run
uv run python -m fundsentinel.radar --baseline funds_v1-036184c34a --source data/test/funds_v2.csv

# Scoring
uv run python scripts/score_quality.py runs/<run_id>      # vs broken-file answer key
uv run python scripts/score_radar.py runs/<radar_run_id>  # vs changes answer key
uv run python scripts/redteam.py generate                 # design new tricks
uv run python scripts/redteam.py score runs/<run_id>      # RedTeam scorecard

# Test files
uv run python scripts/make_test_files.py

# Cloud
./scripts/deploy_runtime.sh                               # package + deploy to AgentCore
uv run python scripts/invoke_runtime.py '{"source": "raw/test/funds_broken.csv", "fund_ids": ["FFFPX"]}'

# Dashboard
uv run streamlit run app/dashboard.py
```

---

## 11. Every file in the repository

**Top level:** `README.md` (overview for judges), `SETUP.md` (teammate setup), `pyproject.toml` / `uv.lock` (Python dependencies), `.gitignore`.

**`fundsentinel/` — the pipeline**

| File | Does |
| --- | --- |
| `settings.py` | Loads config files; creates the AWS session (your profile locally, the runtime's role in the cloud). |
| `normalise.py` | Unit, number, money-text and date conversion. |
| `profile.py` | Column profiling for the Profiler. |
| `mapping.py` | Code checks on mappings; builds canonical records with provenance; the Record structure (status, flags). |
| `quality.py` | Quality detectors, rule decisions, applying SelfHeal decisions with guardrails. |
| `transform.py` | Standard derived columns; safe formula evaluator for agent proposals. |
| `verdict.py` | The reviewer answer form (verdict, reason, evidence, confidence). |
| `evidence.py` | Evidence checker, code half. |
| `committee.py` | Supervisor, per-fund review flow, Evidence checker AI half, guardrails, event log. |
| `pipeline.py` | Runs everything end to end; 3 funds at a time; command-line options. |
| `radar.py` | Radar-lite. |
| `store.py` | All database and S3 writes; table definitions. |

**`fundsentinel/agents/` — one file per agent:** `profiler.py`, `quality.py`, `selfheal.py`, `transform.py`, `metadata.py`, `analyst.py`, `compliance.py`, `finance.py`, `suitability.py`, `decision.py` (Decision owner), `materiality.py` (Radar-lite), `redteam.py`, and `common.py` (shared reviewer plumbing: fact-with-provenance helper, retries, login-expiry handling).

**`app/dashboard.py`** — the Streamlit dashboard.

**`runtime/`** — the AgentCore entry point (`main.py`), its dependencies, and a permission policy file. `fundsentinel/` and `config/` are copied in by `scripts/sync_runtime.sh` before packaging (never the data folder).

**`agentcore/`** — AgentCore project config (`agentcore.json`, `aws-targets.json`) used for packaging; the CDK folder inside is unused because CDK bootstrap is denied.

**`infra/`** — `phase0.yaml` (repo, bucket, database) and `runtime.yaml` (AgentCore Runtime + role), both CloudFormation.

**`scripts/`** — `make_test_files.py`, `score_quality.py`, `score_radar.py`, `redteam.py`, `deploy_runtime.sh`, `invoke_runtime.py`, `sync_runtime.sh`.

**`data/`** — `SOURCES.md` (data sources and quirks), `test/` (test files and answer keys), `raw/` (not in git).

**`docs/`** — this file.

---

## 12. Why we made the key design choices

| Choice | Why |
| --- | --- |
| Numbers and rules in code, judgement in AI | AI can misremember or invent numbers. Code can't. Every decision-relevant number comes from a code tool, and every AI output is checked by code. |
| Nothing pauses the pipeline | The brief is an automated pipeline; a human-in-the-loop stop would break "runs with no manual fixes". Uncertainty becomes a label, not a stop. |
| Canonical schema + Profiler | Lets any fund file (US, India, renamed columns) flow through the same committee with no code changes: the "scalability / any dataset" story. |
| Answer keys for every test | So we can say "13/13", "15/15", "5/5" with evidence instead of "it seems to work". Judges trust measured claims. |
| Supervisor with agents-as-tools | The rubric asks "do agents route themselves or follow a script?" The Supervisor genuinely chooses order, skips, and send-backs, and we log every step to prove it. |
| Guardrails around every agent | Keeps autonomy without risk: agents decide, code enforces the non-negotiables (Compliance always runs; fixes must be valid; threshold-crossing changes are always material). |
| Aurora + Data API | A real database (the plan's "RDS") with zero network setup and no password in code. |
| CloudFormation | Reproducible, reviewable infrastructure; works within the account's guardrails where CDK doesn't. |
| AgentCore Runtime | Required by the organisers' approach, counts toward integration, and the cloud run doesn't depend on a laptop login that expires hourly. |
| Deterministic run IDs + upserts | "Re-running the same file creates no duplicates" is on our acceptance checklist. |

---

## 13. Honest caveats (know these before the code review and pitch)

1. **The 0.75% fee cap is very strict.** Many real funds charge ~1%, so most real funds get rejected on fees (6 of 8 in the v1 baseline). It's mock policy; be ready to say so.
2. **Yahoo names are unreliable** (name–ticker mix-ups across many rows). Funds sharing a name get cautious outcomes, even genuine ones like DODGX.
3. **Speed:** 60–150 s per fund typical, up to ~5 min with several send-backs. Demo live on 2–3 funds; show bigger runs pre-computed.
4. **The Quality agent can be wrong:** it flagged "Timber Point fund in the Crow Point family" as inconsistent, but Crow Point Partners does run Timber Point funds. It's only a flag.
5. **The Metadata agent occasionally adds a detail not in its facts** (it once claimed Yahoo risk scores were rescaled). Its descriptions are good but not guaranteed perfect.
6. **The SEC ticker check** flags tickers not in today's SEC list; some are simply closed share classes, so these are low-confidence flags.
7. **Login expires about hourly.** Log in fresh before the demo and keep a backup screen recording.
8. **Not used yet:** TEFAS, the SEC risk/return quarters (real-world Radar-lite), Titan embeddings, Morningstar Europe.
9. **Account housekeeping:** 4 leftover empty `cdk-hnb659fds-*` roles from the failed CDK bootstrap; they can't be deleted by anyone on the account.

---

## 14. How we cover the rubric

| Rubric item | What covers it |
| --- | --- |
| Code runs, no manual fixes | One command CSV → decisions; nothing pauses; retries; safe re-runs; runs in the cloud on AgentCore. |
| Agents route themselves | Supervisor chooses order, skips, send-backs; Radar-lite agent chooses what to reopen; all logged in `review_events`. |
| Data quality checks | Code detectors + Quality agent + SelfHeal; 13/13 on planted problems; real Yahoo problems found unprompted. |
| Agentic AI for metadata | Metadata agent's data dictionary; Transform agent's proposed columns; field-level provenance. |
| Business insights | Dashboard: where funds get stuck, quality score, decision reasons, before/after changes, stale evidence, RedTeam score. |
| Functionality & integration | S3 + Bedrock + AgentCore + Aurora (RDS) + CodeCommit + CloudFormation, all connected and verified. |
| Innovation | Evidence checker ("no proof, no pass"), Radar-lite, RedTeam with an honest scorecard. |
| Scalability | Any dataset via the Profiler (Yahoo, India, renamed columns); rules and fields in config; parallel reviews; swappable agents. |
| Business value | Weeks of email approvals → minutes per fund; changes never pass silently. |
| User experience | Dashboard with click-through fund stories (redesign in progress). |

---

## 15. What's left (Phase 4)

- Finish and review the RedTeam scorecard.
- Dashboard: launch runs on AgentCore from the UI and show live progress; apply the Claude Design redesign.
- Code freeze, then the acceptance checklist (plan section 11).
- Documentation for submission, pitch deck, rehearsals, backup recording.
- Submit on Airtable (opens Thursday; confirm the deadline in Slack).

---

## 16. Troubleshooting

| Symptom | Fix |
| --- | --- |
| "session has expired", `ExpiredToken`, `LoginRefreshRequired` | `aws login --profile fundsentinel`, then re-run (same run ID, no duplicates). |
| A reviewer says "could not run (…); needs a re-run" | A temporary Bedrock problem after retries. Re-run that fund with `--funds <id>`. |
| `AccessDeniedException … explicit deny` on a model | You used a `global.` model ID or a non-approved model. Use `config/models.json`. |
| Dashboard error about a missing column | Restart the dashboard; it updates the database schema on load. |
| `git push` asks for a password or returns 403 | Log in again; check the CodeCommit credential helper in `SETUP.md`. |
| `agentcore deploy` fails at bootstrap | Expected in this account. Use `./scripts/deploy_runtime.sh`. |

---

## 17. Glossary

- **Agent:** an AI model with a job description (system prompt) and tools (functions) it can call.
- **Canonical schema:** our fixed list of standard fields that every file is mapped onto.
- **Provenance:** where a value came from (file, column, row) and what changed it.
- **Verdict:** a reviewer's answer: pass, concern, fail, or can't assess, with a reason and evidence.
- **Evidence:** the exact values (with sources) a verdict relies on.
- **Send-back:** asking a reviewer to redo its verdict, with a specific reason.
- **Guardrail:** a code rule that overrides or constrains an agent.
- **Flag:** a "needs human review" label; the fund keeps moving.
- **Quarantine:** the fund is set aside with a reason because it can't be judged fairly (fee or ID missing).
- **Materiality:** whether a data change could change a verdict (routine / material / ambiguous).
- **Stale evidence:** evidence from an earlier review that cites a value that has since changed.
- **Run ID:** a fingerprint of the input; the same input gives the same run ID, so re-runs update instead of duplicating.
- **Upsert:** insert a row, or update it if it already exists.
- **Inference profile:** the model ID form Bedrock uses (`us.anthropic.claude-sonnet-5`).
- **CloudFormation stack:** a set of AWS resources created from one template file.
- **Data API:** querying the database over HTTPS with your AWS login instead of a network connection.
