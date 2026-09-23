# FundSentinel — teammate setup

About 20 minutes. Do the steps in order. If a step fails, post the exact error in the team chat.

Everything we use lives in **one shared AWS account (736265634398) in us-east-1**. Shrey has already created the code repo, the S3 bucket, and the database. You only need to get access on your laptop.

## 1. Log in to the AWS portal (browser)

1. Open the **SSO portal link** from the `no-reply@login.awsapps.com` invite email. Sign in with your ASU email, password, and MFA.
2. Click the account, then **ExternalHackathonUser** to open the AWS console.
3. Top-right region must say **N. Virginia (us-east-1)**.
4. Bedrock → Model catalog → **Claude Sonnet 5** → *Open in playground* → send "hi". If it answers, your model access works.

## 2. Install tools

| Tool | Check | Install (macOS / Linux) | Install (Windows PowerShell) |
| --- | --- | --- | --- |
| AWS CLI v2 | `aws --version` | `curl -fsSL https://awscli.amazonaws.com/v2/install.sh \| bash` then open a new terminal | `irm https://awscli.amazonaws.com/v2/install.ps1 \| iex` |
| uv | `uv --version` | `curl -LsSf https://astral.sh/uv/install.sh \| sh` | `irm https://astral.sh/uv/install.ps1 \| iex` |
| Python 3.12 | `uv python list --only-installed` | `uv python install 3.12` | same |
| Node.js 20+ | `node --version` | [nodejs.org](https://nodejs.org) LTS | same |
| Git | `git --version` | preinstalled on macOS | [git-scm.com](https://git-scm.com) |

If `aws` is "command not found" after installing on macOS/Linux, run `export PATH="$HOME/.local/bin:$PATH"` and add that line to `~/.zshrc` (or `~/.bashrc`).

## 3. Connect the AWS CLI to your account

We all use the profile name **`fundsentinel`** so the same commands work on every laptop.

```bash
aws configure set region us-east-1 --profile fundsentinel
aws login --region us-east-1 --profile fundsentinel
```

A browser opens. If it asks, sign in through the SSO portal first and choose `ExternalHackathonUser`, then approve. Credentials last 12 hours and renew automatically for up to 90 days; when commands start failing, run `aws login --profile fundsentinel` again.

Check it worked:

```bash
aws sts get-caller-identity --profile fundsentinel
```

You should see `"Account": "736265634398"` and `ExternalHackathonUser` with your ASU email.

> **If `aws login` doesn't work for you:** in the SSO portal click **Access keys** next to ExternalHackathonUser, copy the commands for your OS, paste them in the terminal, and leave off `--profile fundsentinel` in the commands below. These keys expire after a few hours; re-copy them when commands fail.

Optional but handy, so Python code finds the profile without extra flags:

```bash
echo 'export AWS_PROFILE=fundsentinel' >> ~/.zshrc   # Windows: setx AWS_PROFILE fundsentinel
```

## 4. Test the models from your laptop

```bash
aws bedrock-runtime converse --region us-east-1 --profile fundsentinel \
  --model-id us.anthropic.claude-sonnet-5 \
  --messages '[{"role":"user","content":[{"text":"Reply with OK"}]}]'
```

You should get a JSON reply containing "OK".

**Important:** only these model IDs work. The `global.` versions are blocked, and the AgentCore template uses a `global.` ID by default, so always change it.

| Model | ID |
| --- | --- |
| Claude Sonnet 5 | `us.anthropic.claude-sonnet-5` |
| Claude Opus 5 | `us.anthropic.claude-opus-5` |
| Titan Embeddings V2 | `amazon.titan-embed-text-v2:0` |

## 5. Clone the code (CodeCommit, not GitHub)

Tell git to use your AWS login for CodeCommit only (this won't touch your GitHub setup):

**macOS / Linux**
```bash
git config --global --add credential.https://git-codecommit.us-east-1.amazonaws.com.helper ''
git config --global --add credential.https://git-codecommit.us-east-1.amazonaws.com.helper '!aws codecommit credential-helper --profile fundsentinel $@'
git config --global credential.https://git-codecommit.us-east-1.amazonaws.com.UseHttpPath true
git clone https://git-codecommit.us-east-1.amazonaws.com/v1/repos/fundsentinel
cd fundsentinel
```

**Windows**: run `git config --global --edit`, paste this section at the end of the file, save, and close:
```ini
[credential "https://git-codecommit.us-east-1.amazonaws.com"]
	helper =
	helper = !aws codecommit credential-helper --profile fundsentinel $@
	UseHttpPath = true
```
Then:
```powershell
git clone https://git-codecommit.us-east-1.amazonaws.com/v1/repos/fundsentinel
cd fundsentinel
```

If a password popup appears, click **Cancel**; the clone should still work.

(If you used access keys in step 3, drop `--profile fundsentinel` from the helper line.) The empty `helper` line stops your system password store from saving CodeCommit's short-lived password, which would otherwise break pushes a few hours later.

## 6. Get the data

The datasets are in S3, not in git. Download the ones we build with (~80 MB):

```bash
aws s3 sync s3://fundsentinel-736265634398-us-east-1/raw/ data/raw/ --profile fundsentinel --exclude "sec_rr/*" --exclude "tefas/fund_prices.csv" --exclude "tefas/fund_snapshots.csv" --exclude "tefas/asset_allocations.csv"
```

This skips the large SEC quarters (1.2 GB) and the Turkish price history (300 MB). Only grab those if you're working on Radar-lite or the SEC data. What each dataset is: [data/SOURCES.md](data/SOURCES.md).

## 7. Check the AgentCore CLI

```bash
npx @aws/agentcore --version
```

The first run downloads it and takes a minute.

## 8. Optional: AI coding assistant with AWS tools

If you use Claude Code, Kiro, Cursor, or similar, you can give it AWS skills and live AWS access:

```bash
aws configure agent-toolkit --yes --region us-east-1 --profile fundsentinel
```

Then in each MCP config file it updated, find the `aws-mcp` entry and add:

```json
"env": { "AWS_MCP_PROXY_PROFILES": "fundsentinel" }
```

(OpenCode uses `"environment"` instead of `"env"`.) Restart the tool. Project rules for AI tools are already in `CLAUDE.md` / `AGENTS.md` in the repo.

## Where things are

| Thing | Name |
| --- | --- |
| Code repo | CodeCommit `fundsentinel` |
| Data bucket | `s3://fundsentinel-736265634398-us-east-1/` (`raw/` = source datasets) |
| Database | Aurora Postgres `fundsentinel-db`, database `fundsentinel`, used through the RDS Data API. ARNs in [config/aws.json](config/aws.json). No password needed; your AWS login is enough. |
| Model IDs | [config/models.json](config/models.json) |
| Infra definition | [infra/phase0.yaml](infra/phase0.yaml) (CloudFormation stack `fundsentinel-phase0`). Don't create resources by clicking in the console; change this file. |
| What we're building | `FundSentinel Full Plan.md` |
| Who's doing what, what's next | [plan.md](plan.md) |

## Team rules

- Always **us-east-1**. Only the three model IDs above.
- Code goes to **CodeCommit only**. GitHub is not allowed.
- **Never commit** access keys, passwords, `.env` files, or data files. `.gitignore` covers the common ones; check `git status` before committing.
- `git pull` before you start, push small commits often.
- Mock data and policies only. Our output is internal decision support, never investment advice.
