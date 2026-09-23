# FundSentinel — TIAA x ASU AI Investment Spark Challenge

Full plan: `FundSentinel Full Plan.md`. Organisers' setup guide: `TIAA Hackathon DocumentationV2.pdf`.

## Hackathon hard rules (take precedence over the AWS rules below)

- Region is always **us-east-1**. Nothing deploys anywhere else.
- Only three models are allowed: **Claude Opus 5, Claude Sonnet 5, Titan Text Embeddings V2**. Anything else returns "explicit deny". Verified model IDs (2026-09-23):
  - Sonnet 5: `us.anthropic.claude-sonnet-5`
  - Opus 5: `us.anthropic.claude-opus-5`
  - Titan Embeddings V2: `amazon.titan-embed-text-v2:0`
  - **`global.*` inference profiles are explicitly denied** — the AgentCore template defaults to `global.…`, so always replace it with the `us.` ID. Opus 5.5 appears in the catalog but is not an allowed model.
- Agents are built with **Strands** and deployed with **AgentCore** (`npx @aws/agentcore ...`), not Bedrock Agents.
- Code lives in **CodeCommit**. GitHub is prohibited. Never commit credentials, keys, or passwords.
- AWS CLI profile: `fundsentinel` (`ExternalHackathonUser` via SSO, account 736265634398). If commands fail with expired credentials, run `aws login --profile fundsentinel`.
- Mock or synthetic data only; label output as internal decision support, never investment advice.

<!-- BEGIN AWS Agent Toolkit rules -->
# AWS Guidance

- Where these AWS rules conflict with the project's own instructions, the
  project's instructions take precedence.
- Prefer the AWS MCP Server for AWS interactions — it provides sandboxed
  execution, observability, and audit logging. If unavailable, use the
  AWS CLI directly.
- Before starting a task, check whether a relevant AWS skill is available.
  Load the skill with `retrieve_skill` and prefer its guidance over
  general knowledge.
- When uncertain about specific AWS details (API parameters, permissions,
  limits, error codes), verify against documentation rather than guessing.
  State uncertainty explicitly if you cannot confirm.
- When creating infrastructure, prefer infrastructure-as-code (AWS CDK or
  CloudFormation) over direct CLI commands.
- When working with infrastructure, follow AWS Well-Architected Framework
  principles.
- Do not use em dashes in AWS resource names or descriptions. Use
  hyphens instead.

## Secret Safety

- MUST load the `aws-secrets-manager` skill first for any secret,
  credential, API key, token, or password task. MUST NOT call
  `secretsmanager get-secret-value` or `batch-get-secret-value`, and MUST
  NOT hit the Secrets Manager Agent daemon directly. MUST use
  `{{resolve:secretsmanager:secret-id:SecretString:json-key}}` with
  `asm-exec` so the secret resolves at runtime without entering context.
<!-- END AWS Agent Toolkit rules -->
