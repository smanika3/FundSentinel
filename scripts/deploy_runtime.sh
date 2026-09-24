#!/usr/bin/env bash
# Package the pipeline and deploy it to AgentCore Runtime via CloudFormation (stack: fundsentinel-runtime).
# Usage: ./scripts/deploy_runtime.sh     (needs a fresh `aws login --profile fundsentinel`)
set -euo pipefail
cd "$(dirname "$0")/.."
PROFILE="${AWS_PROFILE:-fundsentinel}"
BUCKET="fundsentinel-736265634398-us-east-1"

./scripts/sync_runtime.sh
npx -y @aws/agentcore package -r pipeline >/dev/null
HASH=$(shasum -a 256 agentcore/pipeline.zip | cut -c1-16)
KEY="artifacts/runtime/pipeline-${HASH}.zip"
aws s3 cp agentcore/pipeline.zip "s3://${BUCKET}/${KEY}" --profile "$PROFILE" --only-show-errors
echo "uploaded s3://${BUCKET}/${KEY}"

aws cloudformation deploy --stack-name fundsentinel-runtime --template-file infra/runtime.yaml \
  --parameter-overrides "CodeKey=${KEY}" --capabilities CAPABILITY_NAMED_IAM \
  --tags project=fundsentinel --profile "$PROFILE" --region us-east-1
aws cloudformation describe-stacks --stack-name fundsentinel-runtime --profile "$PROFILE" --region us-east-1 \
  --query "Stacks[0].Outputs" --output table
