"""Invoke the deployed FundSentinel AgentCore Runtime.

Usage:
  uv run python scripts/invoke_runtime.py '{"source": "raw/yahoo_us/MutualFunds.csv", "mapping": "config/mappings/yahoo_us_mutualfunds.json", "fund_ids": ["DODGX"]}'
"""

import json
import sys
import uuid
from pathlib import Path

from botocore.config import Config

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from fundsentinel import settings  # noqa: E402


def runtime_arn() -> str:
    cf = settings.session().client("cloudformation")
    outs = cf.describe_stacks(StackName="fundsentinel-runtime")["Stacks"][0]["Outputs"]
    return next(o["OutputValue"] for o in outs if o["OutputKey"] == "RuntimeArn")


def invoke(payload: dict) -> dict:
    client = settings.session().client("bedrock-agentcore", config=Config(read_timeout=900, retries={"max_attempts": 1}))
    resp = client.invoke_agent_runtime(agentRuntimeArn=runtime_arn(), runtimeSessionId=f"fundsentinel-{uuid.uuid4()}",
                                       payload=json.dumps(payload).encode(), contentType="application/json",
                                       accept="application/json")
    body = resp["response"].read().decode()
    return json.loads(body) if body.strip().startswith("{") else {"raw": body}


if __name__ == "__main__":
    print(json.dumps(invoke(json.loads(sys.argv[1])), indent=2))
