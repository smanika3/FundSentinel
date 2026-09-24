# FundSentinel — working plan

Team Vitality: Debaleena Chakraborty · Saisrivathsan Manikandan · Shrey Bishnoi
Design doc: `FundSentinel Full Plan.md` (what we're building and why). This file is the **execution tracker**: what's done, what's next, who has it. Update the checkboxes as you go.

## Deadlines

| When | What |
| --- | --- |
| **Thu Sep 24, 9:00 a.m.–12:15 p.m. MT** | **Mandatory TIAA code review** (book a slot). Need a working end-to-end slice by then. |
| Thu Sep 24 | Submission form opens on Airtable |
| **Fri Sep 25** | Live pitch: 5 min demo + 3 min jury Q&A. Confirm the submission deadline in Slack. |

That leaves roughly two working days. Rule: the **basic pipeline running end to end beats every add-on.**

## Status

- [x] AWS CLI + uv installed, profile `fundsentinel` (us-east-1, `ExternalHackathonUser`, account 736265634398)
- [x] AWS Agent Toolkit installed + AWS MCP server connected and verified against the hackathon account
- [x] `CLAUDE.md` / `AGENTS.md` with hackathon rules
- [ ] Everything below

## Phase 0 — Setup (today, ~1–2 h)

- [ ] Every teammate: follow [SETUP.md](SETUP.md) (portal login, tools, CLI profile, model test, clone, data)
- [x] Model IDs verified by live test call: `us.anthropic.claude-sonnet-5`, `us.anthropic.claude-opus-5`, `amazon.titan-embed-text-v2:0`. **`global.*` IDs are denied** — fix the AgentCore template default.
- [x] Model IDs in [config/models.json](config/models.json); bucket + DB ARNs in [config/aws.json](config/aws.json). Every agent reads from these, never hardcode.
- [x] Local tools (Shrey's laptop): Node 26, uv, Python 3.12 via `uv python install 3.12`. Teammates: check `node --version` (20+), `uv --version`, `npx @aws/agentcore --version`
- [x] All infra is one CloudFormation stack, **`fundsentinel-phase0`** ([infra/phase0.yaml](infra/phase0.yaml)). Change the template and update the stack; don't click-create resources.
- [x] CodeCommit repo **`fundsentinel`** created, docs pushed to `main`
      Teammates clone with (scoped to CodeCommit only, won't touch GitHub creds):
      ```
      K='credential.https://git-codecommit.us-east-1.amazonaws.com.helper'
      git config --global --add "$K" ''
      git config --global --add "$K" '!aws codecommit credential-helper $@'
      git config --global credential.https://git-codecommit.us-east-1.amazonaws.com.UseHttpPath true
      git clone https://git-codecommit.us-east-1.amazonaws.com/v1/repos/fundsentinel
      ```
- [x] S3 bucket **`fundsentinel-736265634398-us-east-1`** (encrypted, versioned, private). Prefixes `raw/ clean/ metadata/ provenance/ evidence/ snapshots/ quarantine/ reports/` get created on first write.
- [x] Aurora Serverless v2 Postgres 16.14 (verified with a Data API query) **`fundsentinel-db`** (database `fundsentinel`), accessed through the **RDS Data API** (HTTPS + IAM, no VPC/network setup, password stays in Secrets Manager). Code calls `rds-data` `execute_statement` with the cluster ARN + secret ARN from the stack outputs.
- [x] Datasets in `s3://…/raw/`: Yahoo US, India, TEFAS (Turkey), SEC ticker file. Details + quirks in [data/SOURCES.md](data/SOURCES.md)
- [ ] Morningstar Europe: needs a Kaggle login (403 anonymously). Download manually or add a Kaggle API token
- [ ] Later: SEC Risk/Return (two quarters, for Radar-lite), SDV synthetic funds for the scale test
- [x] Test files via `scripts/make_test_files.py` (deterministic, from real Yahoo rows) in `data/test/`, each with an answer key: `funds_alt_columns.csv` (renamed columns, '75 bps'/'0.75%', risk words, '$1.2B', MM/DD/YYYY), `funds_broken.csv` (13 planted issues), `funds_v1/v2.csv` (fee 0.60→1.10%, benchmark change, risk 3→5, fund shrinks below $50M, ambiguous rename, routine date + return drift)

## Phase 1 — Basic pipeline end to end (today → Thu morning) ⭐ most important

- [x] `config/schema.json` — canonical fields: fund_id, fund_name, ticker, category, benchmark, expense_ratio, risk_score, returns, as_of_date, source_ref
- [x] `config/policy.json` — mock rules (max fee 0.75%, etc.)
- [x] Code tools: unit/date normalisation (`fundsentinel/normalise.py`), mapping validator + apply with provenance (`fundsentinel/mapping.py`), reference Yahoo mapping (`config/mappings/`)
- [x] S3 + database writers (`fundsentinel/store.py`): run ID = fingerprint of file + mapping, all writes upserted, verified no duplicates on re-run
- [ ] AgentCore project: `npx @aws/agentcore create` (Python, Direct Code Deploy, Strands, Bedrock, no memory)
- [x] First agent: **Finance reviewer** (`fundsentinel/agents/finance.py`, verified live: pass / fail / concern / cannot_assess) with tools + JSON verdict form — prove the pattern works
- [x] Profiler agent (`fundsentinel/agents/profiler.py`): code profiles columns, agent proposes mapping with unit + confidence, code checks it, rejected fields go back for up to 3 rounds. Yahoo: 15/16 vs answer key on first try (the 16th was an equivalent constant). India (never seen): percent units, crore multiplier, 1-6 risk rescale, INR, refused to invent dates. Pipeline uses it when `--mapping` is omitted; `--context` carries uploader facts (e.g. snapshot date).
- [x] Reviewer errors become `cannot_assess` instead of crashing; expired login stops the run with a clear message
- [x] Profiler on `funds_alt_columns.csv`: 15/15 vs answer key; **self-correction loop fired** (round 1 typo'd a column name, code rejected it, round 2 fixed it)
- [ ] Stage 1 agents: Quality → Transform → Metadata (SelfHeal can start as a stub)
      Quality must catch: Yahoo has **name/ticker mix-ups** in many rows (same Class-A name under several tickers, e.g. 'DWS RREEF Real Assets Fund - Class A' on 4 tickers; VFIAX named as a BNY Mellon fund). Cross-check with the SEC ticker file.
- [x] India end-to-end through the Profiler (no code changes): 13 fields mapped in 1 round. Fund-size rule now in USD via mock FX (`config/fx.json`); found because a ₹10 crore fund was passing a $50M minimum.
- [x] Brief Bedrock outages retried twice; partial re-runs keep the run's totals correct
- [x] Other reviewers: Analyst, Compliance (Opus), Suitability
- [x] Simple orchestrator (`fundsentinel/pipeline.py`, reviewers in parallel) + Decision owner (Layer 1 rules in code, Layer 2 Opus)
      First run (8 funds, 156 s): all 5 decision types produced. Decision owner caught a **real Kaggle data error**: VFIAX row carries the name "BNY Mellon Technology Growth Fund Class A". Use in the demo; confirm with the SEC ticker file.
- [x] Results saved to S3 + database; Streamlit dashboard (`app/dashboard.py`): decision counts, per-fund story with evidence + provenance, bottleneck, mapping checks
- [x] **Milestone:** one command, CSV → decisions, pushed to CodeCommit (uses the hand-written Yahoo mapping until the Profiler agent exists). **Demo this at the code review.**

## Phase 2 — High-scoring upgrades (Thu afternoon)

- [ ] Supervisor with send-back (replaces the simple orchestrator)
- [ ] SelfHeal: fix / flag / quarantine, tested on `funds_broken.csv`
- [ ] Field-level provenance (raw value, normalised value, source row, what changed it)
- [ ] Evidence checker (verdict without proof → sent back)
- [ ] Dashboard: bottlenecks, flags, decision reasons, click a fund → full story

## Phase 3 — Wow features (Thu night, only if Phase 2 works)

- [ ] Radar-lite: diff in code, materiality by agent, reopen only affected reviewers, mark evidence stale
- [ ] RedTeam: 10–15 realistic trick funds + honest scorecard (misses shown)
- [ ] Optional: Titan embeddings for column matching

## Phase 4 — Freeze and pitch (Fri morning)

- [ ] **Code freeze** — bug fixes only
- [ ] Run the acceptance checklist (section 11 of the full plan)
- [ ] README: what it does, how to run, architecture, team
- [ ] Documentation (agent design, provenance, business use) + pitch deck
- [ ] Record a backup video of a good run
- [ ] Rehearse the 5-minute demo (story in section 9 of the full plan) at least 3 times
- [ ] Submit on Airtable: CodeCommit URL, deck URL, written answers

## Suggested split (fill in names)

| Lane | Owner | Scope |
| --- | --- | --- |
| Data pipeline | _TBD_ | Schema, code tools, Stage 1 agents, SelfHeal, provenance |
| Decision committee | _TBD_ | Reviewers, Supervisor, Evidence checker, Decision owner, Radar-lite |
| Storage + dashboard + pitch | _TBD_ | S3/RDS, Streamlit, RedTeam scorecard, deck, demo script |

## If time runs short

Cut in this order (last cut first): RedTeam → Radar-lite → dashboard polish → Evidence checker → Supervisor send-back. Never cut: CSV → decisions end to end, mappings with confidence, provenance.

## Daily habits

- Push to CodeCommit often; never commit credentials.
- Credentials expire → `aws login --profile fundsentinel`.
- Numbers always come from code tools, never from the model.
- Stuck on AWS access → TIAA support in Slack (Ariana, Priyanka, Sam, Sahiti).
