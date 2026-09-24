"""AgentCore Runtime entry point for the FundSentinel pipeline.

Invoke with a JSON payload (or a JSON string in "prompt", which is what `agentcore invoke` sends):
  {"source": "raw/india/comprehensive_mutual_funds_data.csv",   # S3 key in the FundSentinel bucket, or s3://bucket/key
   "type": "review" | "update",                                  # optional; "update" needs "baseline" (an earlier run_id)
   "mapping": "config/mappings/yahoo_us_mutualfunds.json",      # optional; omit to let the Profiler map the file
   "context": "Data snapshot date 2023-04-26",                   # optional uploader facts
   "limit": 5, "fund_ids": ["VFIAX"], "workers": 3, "supervisor": true,
   "async": true}                                                # return the run_id at once and keep working
Synchronous calls return the run summary. Async calls return {"run_id", "status": "started"}; progress is written to
the run_progress table (read by the web app) and results land in S3 and the Aurora record book as usual.
"""

import json
import threading
import traceback
from pathlib import Path

from bedrock_agentcore.runtime import BedrockAgentCoreApp

from fundsentinel import pipeline, radar, settings, store

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


def _plan(req: dict):
    """Work out the run_id up front (so the caller can follow progress) and a function that does the run."""
    local = _download(req["source"])
    source_name = "/".join(local.parts[-2:])
    if req.get("type") == "update":
        baseline = req.get("baseline")
        if not baseline:
            raise ValueError('"baseline" (the run_id of the earlier run) is required for an update run')
        run_id = radar.radar_run_id(str(local), baseline)
        progress = lambda: store.Progress(run_id, source_name, "update")
        do = lambda p: radar.run(baseline, str(local), fund_ids=req.get("fund_ids"), out_dir=str(WORK / "runs"),
                                 workers=int(req.get("workers", 3)), progress=p)
        return run_id, progress, do
    mapping = req.get("mapping")
    mapping_path = str(settings.ROOT / mapping) if mapping else None
    context = req.get("context", "")
    run_id = req.get("run_id") or store.run_id_for(str(local), {"mapping": mapping_path or "profiler", "context": context})
    progress = lambda: store.Progress(run_id, source_name, "review")
    do = lambda p: pipeline.run(str(local), mapping_path, limit=req.get("limit"), fund_ids=req.get("fund_ids"),
                                context=context, out_dir=str(WORK / "runs"), run_id=run_id,
                                use_supervisor=bool(req.get("supervisor", True)), workers=int(req.get("workers", 3)),
                                progress=p)
    return run_id, progress, do


def _summary(out: dict) -> dict:
    s = out["summary"]
    return {"run_id": s["run_id"], "source": s["source"], "funds": s["funds"], "seconds": s["seconds"],
            "decisions": s["decisions"], "profiler_rounds": s.get("profiler_rounds"),
            "results": [{"fund_id": r["fund_id"], "decision": r["decision"]["decision"],
                         "reason": r["decision"]["reason"]} for r in out["results"]],
            "where": {"s3": f"s3://{settings.aws()['bucket']}/reports/{s['run_id']}/",
                      "database": "runs / funds / verdicts / decisions tables"}}


@app.entrypoint
def invoke(payload, context):
    try:
        req = _payload(payload)
        run_id, make_progress, do = _plan(req)
    except ValueError as e:
        return {"error": str(e)}
    log.info(f"FundSentinel run request: {req} -> {run_id}")

    if not req.get("async"):
        return _summary(do(None))

    progress = make_progress()
    task_id = app.add_async_task("fundsentinel_run", {"run_id": run_id})

    def work():
        try:
            do(progress)
        except Exception as e:  # never leave the web app waiting on a dead run
            log.error(f"run {run_id} failed: {traceback.format_exc()}")
            progress.fail(f"{type(e).__name__}: {e}")
        finally:
            app.complete_async_task(task_id)

    threading.Thread(target=work, daemon=True).start()
    return {"run_id": run_id, "status": "started"}


if __name__ == "__main__":
    app.run()
