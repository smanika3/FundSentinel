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

- [ ] Every teammate: log in via SSO portal, confirm **us-east-1**, open Sonnet 5 + Opus 5 in the Bedrock Playground
- [x] Model IDs verified by live test call: `us.anthropic.claude-sonnet-5`, `us.anthropic.claude-opus-5`, `amazon.titan-embed-text-v2:0`. **`global.*` IDs are denied** — fix the AgentCore template default.
- [ ] Put those IDs in `config/models.json` so every agent reads them from one place
- [ ] Check local tools: `node --version` (20+), `python3 --version` (3.10–3.12), `uv --version`, `npx @aws/agentcore --version`
- [ ] Create CodeCommit repo `fundsentinel`, set the credential helper, clone it, push this folder's docs
      ```
      git config --global credential.helper '!aws codecommit credential-helper $@'
      git config --global credential.UseHttpPath true
      ```
- [ ] Create S3 bucket `fundsentinel-<account>-us-east-1` with prefixes `raw/ clean/ metadata/ provenance/ evidence/ snapshots/ quarantine/ reports/`
- [ ] Create RDS (smallest Postgres instance) — or confirm with organisers it's allowed; fallback is SQLite for the demo
- [ ] Get the Kaggle fund dataset, upload to `s3://…/raw/`
- [ ] Make test files: `funds_alt_columns.csv` (renamed columns), `funds_broken.csv`, `funds_v1.csv` + `funds_v2.csv` (Radar-lite: fee 0.60→1.10%, benchmark change, date change)

## Phase 1 — Basic pipeline end to end (today → Thu morning) ⭐ most important

- [ ] `config/schema.json` — canonical fields: fund_id, fund_name, ticker, category, benchmark, expense_ratio, risk_score, returns, as_of_date, source_ref
- [ ] `config/policy.json` — mock rules (max fee 0.75%, etc.)
- [ ] Code tools (plain Python, no AI): unit/date normalisation, mapping validator (type/unit/range), fee/return calculators, S3 + RDS writers with run IDs
- [ ] AgentCore project: `npx @aws/agentcore create` (Python, Direct Code Deploy, Strands, Bedrock, no memory)
- [ ] First agent: **Finance reviewer** with tools + JSON verdict form — prove the pattern works
- [ ] Stage 1 agents: Profiler → Quality → Transform → Metadata (SelfHeal can start as a stub)
- [ ] Other reviewers: Analyst, Compliance, Suitability
- [ ] Simple orchestrator + Decision owner (Layer 1 rules in code, Layer 2 AI)
- [ ] Results saved to S3 + RDS; basic Streamlit dashboard reading RDS
- [ ] **Milestone:** one command, CSV → decisions, no manual fixes. Push to CodeCommit. **Demo this at the code review.**

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
