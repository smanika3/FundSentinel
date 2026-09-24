# FundSentinel

An agent-run approval pipeline for mutual funds and ETFs, built for the TIAA x ASU AI Investment Spark Challenge. Messy fund data goes in; AI agents map and check it; a committee of AI reviewers judges each fund against a mock policy with evidence; a Decision owner makes the call with a plain-English reason. Nothing pauses the pipeline: uncertain items are flagged, never blocked.

Mock scenario and synthetic or public data only. Output is internal decision support, not investment advice.

## How it works (Phase 1)

```
CSV (any column names)
  → mapping, checked by code (type, unit, range) → canonical records with field-level provenance
  → 4 reviewers in parallel: Analyst · Compliance · Finance · Suitability   (each: code tools for facts + rules, AI writes the verdict with evidence)
  → Decision owner: layer 1 fixed rules in code, layer 2 Claude Opus 5
  → S3 (clean data, provenance, evidence, reports) + Aurora Postgres record book
  → Streamlit dashboard
```

| Piece | Where |
| --- | --- |
| Canonical schema | [config/schema.json](config/schema.json) |
| Mock approval policy | [config/policy.json](config/policy.json) |
| Unit / date normalisation | [fundsentinel/normalise.py](fundsentinel/normalise.py) |
| Mapping code checks + provenance | [fundsentinel/mapping.py](fundsentinel/mapping.py) |
| Reviewer agents | [fundsentinel/agents/](fundsentinel/agents/) |
| Pipeline runner | [fundsentinel/pipeline.py](fundsentinel/pipeline.py) |
| S3 + database writes | [fundsentinel/store.py](fundsentinel/store.py) |
| Dashboard | [app/dashboard.py](app/dashboard.py) |
| AWS infrastructure (CloudFormation) | [infra/phase0.yaml](infra/phase0.yaml) |

Built with Strands Agents on Amazon Bedrock (Claude Sonnet 5, Claude Opus 5) in us-east-1.

## Run it

Setup (AWS access, tools, data): see [SETUP.md](SETUP.md).

```bash
uv sync

# Review a few funds end to end (results go to S3 and the database)
uv run python -m fundsentinel.pipeline \
  --source data/raw/yahoo_us/MutualFunds.csv \
  --mapping config/mappings/yahoo_us_mutualfunds.json \
  --funds VFIAX DODGX AAAAX ACEKX AFBIX

# Dashboard
uv run streamlit run app/dashboard.py
```

Re-running the same file with the same mapping reuses the same run ID and updates rows in place, so there are no duplicates.

## Team

Team Vitality: Debaleena Chakraborty · Saisrivathsan Manikandan · Shrey Bishnoi

## Data sources

See [data/SOURCES.md](data/SOURCES.md).
