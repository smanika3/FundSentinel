// Non-secret resource names. Override with environment variables on Amplify if they ever change.
export const REGION = process.env.FS_REGION ?? "us-east-1";
export const DB = {
  resourceArn: process.env.FS_DB_CLUSTER_ARN ?? "arn:aws:rds:us-east-1:736265634398:cluster:fundsentinel-db",
  secretArn:
    process.env.FS_DB_SECRET_ARN ??
    "arn:aws:secretsmanager:us-east-1:736265634398:secret:rds!cluster-b6ba5a23-8c1b-4e30-890b-4ce7350f250e-pJtxGx",
  database: process.env.FS_DB_NAME ?? "fundsentinel",
};
export const BUCKET = process.env.FS_BUCKET ?? "fundsentinel-736265634398-us-east-1";
export const RUNTIME_ARN =
  process.env.FS_RUNTIME_ARN ?? "arn:aws:bedrock-agentcore:us-east-1:736265634398:runtime/FundSentinel_pipeline-QBY1kv5VHa";
export const SAVED_MAPPINGS = ["yahoo_us_mutualfunds", "test_versions"];
