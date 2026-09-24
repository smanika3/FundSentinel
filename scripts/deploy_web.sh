#!/usr/bin/env bash
# Deploy the web app to Amplify Hosting via CloudFormation (stack: fundsentinel-web), then start a build of main.
# Usage: ./scripts/deploy_web.sh     (needs a fresh `aws login --profile fundsentinel`; push to CodeCommit first)
# The site password is kept outside the repo in ~/.fundsentinel-web-password (created on first deploy).
set -euo pipefail
cd "$(dirname "$0")/.."
PROFILE="${AWS_PROFILE:-fundsentinel}"
PWFILE="$HOME/.fundsentinel-web-password"

if [ ! -s "$PWFILE" ]; then
  (umask 077; openssl rand -base64 18 | tr -d '/+=' > "$PWFILE")
  echo "created a site password in $PWFILE"
fi

aws cloudformation deploy --stack-name fundsentinel-web --template-file infra/web.yaml \
  --parameter-overrides "BasicAuthPassword=$(cat "$PWFILE")" --capabilities CAPABILITY_NAMED_IAM --no-fail-on-empty-changeset \
  --tags project=fundsentinel --profile "$PROFILE" --region us-east-1

APP_ID=$(aws cloudformation describe-stacks --stack-name fundsentinel-web --profile "$PROFILE" --region us-east-1 \
  --query "Stacks[0].Outputs[?OutputKey=='AppId'].OutputValue" --output text)
aws amplify start-job --app-id "$APP_ID" --branch-name main --job-type RELEASE --profile "$PROFILE" --region us-east-1 \
  --query "jobSummary.[jobId,status]" --output text
aws cloudformation describe-stacks --stack-name fundsentinel-web --profile "$PROFILE" --region us-east-1 \
  --query "Stacks[0].Outputs" --output table
echo "Sign in as user 'fundsentinel' with the password in $PWFILE"
