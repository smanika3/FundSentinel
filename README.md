# FundSentinel

Getting a new mutual fund or ETF approved at a large company usually means weeks of emails between analysts, compliance, finance and managers. And once a fund is approved, a later change, such as a fee going up, can easily slip past everyone.

FundSentinel is our attempt to do that job with a team of AI agents, without cutting corners on proof. You give it a spreadsheet of funds in whatever format you have. It works out what the columns mean, cleans up the data, and then a small AI "committee" reviews every fund against the company's rules. Each fund comes out **approved**, **approved with conditions**, **rejected**, **sent to a person**, or **set aside because the data is too broken to judge**, always with a short reason a non-expert can read. Every number behind a decision can be traced back to the exact row of the original file.

When an updated spreadsheet arrives a month later, FundSentinel doesn't start over. It works out what changed, decides which changes matter, and reopens only the reviews those changes affect.

Built by Team Vitality for the TIAA x ASU AI Investment Spark Challenge (September 2026). Everything here uses public or synthetic data and a made-up approval policy. It is a decision-support prototype, **not investment advice**.

## How it works

Think of it as two teams.

**The data team** gets the spreadsheet ready:
- The **Profiler** reads the columns and works out their meaning and units. It knows, for example, that "52 bps", "0.52%" and "0.0052" are the same fee, and that an Indian file lists fund sizes in crore. Code checks every guess before it's accepted.
- **Quality** and **SelfHeal** find problems (typos, impossible values, duplicates, missing fees) and either fix them, flag them for a person, or set the fund aside. One firm rule: a repair can never make a fund look better than its original data.
- **Transform** and **Metadata** add useful columns and write a plain-English description of every column.

**The approval committee** then reviews each fund:
- A **Supervisor** decides who looks at what. It always asks **Compliance** first, because a banned product (a leveraged fund, say) is rejected no matter how good its returns are, so there's no point spending time on the rest.
- **Analyst** (performance), **Compliance** (hard rules), **Finance** (fees) and **Suitability** (who the fund suits) each give a verdict with the exact numbers they relied on.
- An **Evidence checker** throws out any verdict whose numbers didn't actually come from the data. No proof, no pass.
- A **Decision owner** makes the final call: fixed rules first, then judgement.

Two extras:
- **Radar-lite** handles updated files. It reopens only the reviewers a change affects and marks old evidence as out of date.
- **RedTeam** is our self-test. An AI plants realistic trick funds among genuine ones, and we score how many get caught, misses included.

A rule we kept throughout: **code does the maths and the hard rules, AI does the judgement, and code checks whatever the AI produces.** Nothing ever stops the line. If the system isn't sure, it sends the fund to a person instead of guessing.

## What we measured

We built test files with answer keys, so these numbers are scored rather than eyeballed:

| Test | Result |
| --- | --- |
| Understanding a file where every column was renamed and the units were mixed | 15 of 15 fields mapped correctly |
| Finding 13 planted data problems (typos, a 45% fee, missing values, duplicates…) | 13 of 13 caught and handled |
| An updated file with 5 meaningful changes plus routine noise | 5 of 5 handled; routine-only funds reopened nothing; 6 of 32 possible reviews redone |
| 13 trick funds hidden among 8 genuine ones | 11 of 13 caught, 0 genuine funds rejected |

The two tricks we missed:
- **A leveraged fund named "Ultra 2x"**: it was noticed and sent to a person, but not rejected outright.
- **Data that was two years out of date**: we have no rule for that yet.

We left both as honest misses rather than add rules after seeing the test.

A teammate also ran it on three new datasets:
- **Brazilian regulator files** (a different encoding, semicolon-separated): read automatically. With no fee column, every fund was set aside rather than guessed at.
- **Leveraged and inverse ETFs** (TQQQ, SQQQ, AGQ): all rejected.
- **A small set of real SEC fund changes:** a fee cut, a benchmark switch and an expired fee waiver were each handled by reopening only the affected reviewers.

Along the way, the agents found something real that nobody planted. In the public Yahoo fund dataset, fund names are attached to the wrong tickers across most of the file. For example, Vanguard's S&P 500 fund is labelled as a BNY Mellon technology fund.

## Built with

All of it runs on AWS in us-east-1:
- **Amazon Bedrock** with Claude Sonnet 5 and Claude Opus 5 (Opus for the hardest calls: routing, compliance, evidence and final decisions)
- **Bedrock AgentCore Runtime**, where the whole pipeline runs in the cloud under its own narrowly scoped role
- **Strands Agents** for the agents themselves
- **S3** for files
- **Aurora PostgreSQL** (via the RDS Data API) as the record book
- **CloudFormation** for the infrastructure
- **CodeCommit** for the code

The dashboard is built with Streamlit today. A cleaner web app on AWS Amplify is designed and next in line.

## Running it

Setting up AWS access and tools for the first time: see [SETUP.md](SETUP.md).

```bash
uv sync

# Review a few funds (results are saved to S3 and the database)
uv run python -m fundsentinel.pipeline \
  --source data/raw/yahoo_us/MutualFunds.csv \
  --mapping config/mappings/yahoo_us_mutualfunds.json \
  --funds DODGX AAAAX ACEKX AFBIX

# Or let FundSentinel work out an unfamiliar file on its own
uv run python -m fundsentinel.pipeline \
  --source data/raw/india/comprehensive_mutual_funds_data.csv \
  --context "Data snapshot date 2023-04-26" --limit 5

# Compare an updated file with an earlier run (Radar-lite)
uv run python -m fundsentinel.radar --baseline <earlier_run_id> --source data/test/funds_v2.csv

# Look at the results
uv run streamlit run app/dashboard.py
```

Running the same file twice updates the results in place instead of duplicating them.

**In the cloud:** `./scripts/deploy_runtime.sh` packages the pipeline and deploys it to AgentCore. `uv run python scripts/invoke_runtime.py '{"source": "raw/india/comprehensive_mutual_funds_data.csv", "limit": 3}'` runs it there. We deploy with our own CloudFormation template (`infra/runtime.yaml`) rather than `agentcore deploy`, because the latter needs an admin-level setup step that the hackathon account doesn't allow.

**Scoring the tests:** `scripts/score_quality.py`, `scripts/score_radar.py` and `scripts/redteam.py score` compare a run with its answer key. `scripts/make_test_files.py` rebuilds the test files.

## Where things are

| | |
| --- | --- |
| The rules (made-up policy) | [config/policy.json](config/policy.json) |
| The standard fields every file is mapped onto | [config/schema.json](config/schema.json) |
| The agents | [fundsentinel/agents/](fundsentinel/agents/) |
| The pipeline, checks and storage | [fundsentinel/](fundsentinel/) |
| The dashboard | [app/dashboard.py](app/dashboard.py) |
| Cloud setup | [infra/](infra/), [runtime/](runtime/) |
| Test files and answer keys | [data/test/](data/test/) |
| Where the data came from | [data/SOURCES.md](data/SOURCES.md) |

## Team

Team Vitality: Debaleena Chakraborty, Saisrivathsan Manikandan and Shrey Bishnoi.
