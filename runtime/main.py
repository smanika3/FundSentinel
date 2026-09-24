"""AgentCore Runtime entry point for the FundSentinel pipeline.

Invoke with a JSON payload (or a JSON string in "prompt", which is what `agentcore invoke` sends):
  {"source": "raw/india/comprehensive_mutual_funds_data.csv",   # S3 key in the FundSentinel bucket, or s3://bucket/key
   "mapping": "config/mappings/yahoo_us_mutualfunds.json",      # optional; omit to let the Profiler map the file
   "context": "Data snapshot date 2023-04-26",                   # optional uploader facts
   "limit": 5, "fund_ids": ["VFIAX"]}                            # optional
Returns the run summary. Full results are in S3 (reports/<run_id>/) and the Aurora record book.
"""

import json
from pathlib import Path

from bedrock_agentcore.runtime import BedrockAgentCoreApp

from fundsentinel import pipeline, settings

app = BedrockAgentCoreApp()
log = app.logger
WORK = Path("/tmp/fundsentinel")


def _payload(raw) -> dict:
    if isinstance(raw, dict) and "source" in raw:
        return raw
    prompt = raw.get("prompt") if isinstance(raw, dict) else raw
    try:
        body = json.loads(prompt)
    except (TypeError, json.JSONDecodeError):
        raise ValueError('Send JSON like {"source": "raw/india/comprehensive_mutual_funds_data.csv", "limit": 5}')
    if "source" not in body:
        raise ValueError('"source" (an S3 key in the FundSentinel bucket) is required')
    return body


def _download(source: str) -> Path:
    bucket = settings.aws()["bucket"]
    if source.startswith("s3://"):
        bucket, _, source = source[5:].partition("/")
    local = WORK / "input" / source
    local.parent.mkdir(parents=True, exist_ok=True)
    settings.session().client("s3").download_file(bucket, source, str(local))
    return local


@app.entrypoint
def invoke(payload, context):
    try:
        req = _payload(payload)
    except ValueError as e:
        return {"error": str(e)}
    log.info(f"FundSentinel run request: {req}")
    local = _download(req["source"])
    mapping = req.get("mapping")
    mapping_path = str(settings.ROOT / mapping) if mapping else None
    out = pipeline.run(str(local), mapping_path, limit=req.get("limit", 5), fund_ids=req.get("fund_ids"),
                       context=req.get("context", ""), out_dir=str(WORK / "runs"))
    s = out["summary"]
    return {"run_id": s["run_id"], "source": s["source"], "funds": s["funds"], "seconds": s["seconds"],
            "decisions": s["decisions"], "profiler_rounds": s.get("profiler_rounds"),
            "results": [{"fund_id": r["fund_id"], "decision": r["decision"]["decision"],
                         "reason": r["decision"]["reason"]} for r in out["results"]],
            "where": {"s3": f"s3://{settings.aws()['bucket']}/reports/{s['run_id']}/",
                      "database": "runs / funds / verdicts / decisions tables"}}


if __name__ == "__main__":
    app.run()
