# FundSentinel web app

The reviewer-facing app. Four pages:

- **Run a file**: pick a fund file from S3 (or upload a CSV), start a review or an update run on AgentCore, and watch it progress.
- **Results**: every fund in a run with its decision and a one-line reason. Update runs show what changed; RedTeam runs show the scorecard.
- **Fund**: one fund's reviewers, the evidence behind each verdict, the timeline of send-backs and guardrails, and where each number came from.
- **Data**: what the pipeline did to the file: column mapping, quality problems, repairs and what was blocked.

Everything is read live from the Aurora record book (RDS Data API) and S3. Runs are started on the AgentCore runtime, which writes progress to the `run_progress` table as it goes.

## Run locally

```bash
aws login --profile fundsentinel
npm install
npm run dev:aws        # dev server with the profile's credentials
# or: npx next build && npx next start
```

Settings default to the hackathon account and can be overridden with `FS_*` environment variables (see `lib/config.ts`).

## Design system

`components/ds.js` is the Claude Design export converted to an ES module by `scripts_convert_ds.py`. The screens in `components/screens/` are the design's UI kit with its mock data replaced by real data from `lib/views.ts`.

Internal decision support on mock data. Not investment advice.
