"""Durable storage: S3 for files, Aurora Postgres (via the RDS Data API) as the record book.

Every write is keyed by run_id and upserted, so re-running the same file never creates duplicates.
"""

import hashlib
import json
from pathlib import Path

from . import settings

SCHEMA_SQL = [
    """CREATE TABLE IF NOT EXISTS runs (
        run_id text PRIMARY KEY, source text, mapping text, funds int, seconds real,
        decisions jsonb, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now())""",
    """CREATE TABLE IF NOT EXISTS mapping_checks (
        run_id text, field text, column_name text, confidence real, accepted boolean, reason text,
        parse_rate real, in_range_rate real, PRIMARY KEY (run_id, field))""",
    """CREATE TABLE IF NOT EXISTS funds (
        run_id text, fund_id text, fund_name text, category text, source_ref text, issues jsonb, record jsonb,
        PRIMARY KEY (run_id, fund_id))""",
    """CREATE TABLE IF NOT EXISTS verdicts (
        run_id text, fund_id text, reviewer text, verdict text, reason text, evidence jsonb, confidence real,
        created_at timestamptz DEFAULT now(), PRIMARY KEY (run_id, fund_id, reviewer))""",
    """CREATE TABLE IF NOT EXISTS decisions (
        run_id text, fund_id text, decision text, decided_by text, rule_applied text, reason text,
        conditions jsonb, created_at timestamptz DEFAULT now(), PRIMARY KEY (run_id, fund_id))""",
    """CREATE TABLE IF NOT EXISTS quality_issues (
        run_id text, issue_id text, fund_id text, row_num int, field text, kind text, detail text, raw text,
        candidates jsonb, action text, new_value text, confidence real, decided_by text, reason text,
        PRIMARY KEY (run_id, issue_id))""",
    "ALTER TABLE funds ADD COLUMN IF NOT EXISTS status text",
    "ALTER TABLE runs ADD COLUMN IF NOT EXISTS quality jsonb",
]


def run_id_for(source_path: str, mapping: dict) -> str:
    """Deterministic run ID: same file + same mapping -> same run_id -> upserts, not duplicates."""
    h = hashlib.sha256(Path(source_path).read_bytes())
    h.update(json.dumps(mapping, sort_keys=True).encode())
    return f"{Path(source_path).stem.lower().replace(' ', '_')}-{h.hexdigest()[:10]}"


# ---------- Aurora via Data API ----------

def _rds():
    return settings.session().client("rds-data")


def _db():
    d = settings.aws()["db"]
    return {"resourceArn": d["cluster_arn"], "secretArn": d["secret_arn"], "database": d["database"]}


def sql(statement: str, params: dict | None = None) -> list[dict]:
    """Run one statement; returns rows as dicts."""
    kwargs = {**_db(), "sql": statement, "formatRecordsAs": "JSON"}
    if params:
        kwargs["parameters"] = _params(params)
    resp = _rds().execute_statement(**kwargs)
    return json.loads(resp.get("formattedRecords", "[]"))


def _param(name, value):
    if value is None:
        return {"name": name, "value": {"isNull": True}}
    if isinstance(value, bool):
        return {"name": name, "value": {"booleanValue": value}}
    if isinstance(value, int):
        return {"name": name, "value": {"longValue": value}}
    if isinstance(value, float):
        return {"name": name, "value": {"doubleValue": value}}
    if isinstance(value, (dict, list)):
        return {"name": name, "value": {"stringValue": json.dumps(value, default=str)}, "typeHint": "JSON"}
    return {"name": name, "value": {"stringValue": str(value)}}


def _params(d: dict) -> list:
    return [_param(k, v) for k, v in d.items()]


def _batch(statement: str, rows: list[dict], chunk: int = 200):
    for i in range(0, len(rows), chunk):
        _rds().batch_execute_statement(**_db(), sql=statement,
                                       parameterSets=[_params(r) for r in rows[i:i + chunk]])


def init_db():
    for s in SCHEMA_SQL:
        sql(s)


def save_run(summary: dict, results: list[dict]):
    run_id = summary["run_id"]
    sql("""INSERT INTO runs (run_id, source, mapping, funds, seconds, decisions)
           VALUES (:run_id, :source, :mapping, :funds, :seconds, :decisions)
           ON CONFLICT (run_id) DO UPDATE SET funds=EXCLUDED.funds, seconds=EXCLUDED.seconds,
             decisions=EXCLUDED.decisions, updated_at=now()""",
        {k: summary[k] for k in ("run_id", "source", "mapping", "funds", "seconds", "decisions")})
    _batch("""INSERT INTO mapping_checks VALUES (:run_id, :field, :column_name, :confidence, :accepted, :reason,
                :parse_rate, :in_range_rate)
              ON CONFLICT (run_id, field) DO UPDATE SET column_name=EXCLUDED.column_name,
                confidence=EXCLUDED.confidence, accepted=EXCLUDED.accepted, reason=EXCLUDED.reason,
                parse_rate=EXCLUDED.parse_rate, in_range_rate=EXCLUDED.in_range_rate""",
           [{"run_id": run_id, "field": c["field"], "column_name": c["column"],
             "confidence": None if c["confidence"] is None else float(c["confidence"]), "accepted": c["accepted"],
             "reason": c["reason"], "parse_rate": c["parse_rate"], "in_range_rate": c["in_range_rate"]}
            for c in summary["mapping_checks"]])
    _batch("""INSERT INTO funds (run_id, fund_id, fund_name, category, source_ref, issues, record, status)
              VALUES (:run_id, :fund_id, :fund_name, :category, :source_ref, :issues, :record, :status)
              ON CONFLICT (run_id, fund_id) DO UPDATE SET fund_name=EXCLUDED.fund_name, category=EXCLUDED.category,
                source_ref=EXCLUDED.source_ref, issues=EXCLUDED.issues, record=EXCLUDED.record, status=EXCLUDED.status""",
           [{"run_id": run_id, "fund_id": r["fund_id"],
             "fund_name": r["record"]["fields"].get("fund_name", {}).get("value"),
             "category": r["record"]["fields"].get("category", {}).get("value"),
             "source_ref": r["record"]["fields"]["source_ref"]["value"],
             "issues": r["record"]["issues"], "record": r["record"], "status": r["record"].get("status", "ok")}
            for r in results])
    if summary.get("quality"):
        sql("UPDATE runs SET quality = :q WHERE run_id = :run_id", {"q": summary["quality"], "run_id": run_id})
    if summary.get("quality_issues"):
        _batch("""INSERT INTO quality_issues VALUES (:run_id, :issue_id, :fund_id, :row_num, :field, :kind, :detail, :raw,
                    :candidates, :action, :new_value, :confidence, :decided_by, :reason)
                  ON CONFLICT (run_id, issue_id) DO UPDATE SET fund_id=EXCLUDED.fund_id, detail=EXCLUDED.detail,
                    candidates=EXCLUDED.candidates, action=EXCLUDED.action, new_value=EXCLUDED.new_value,
                    confidence=EXCLUDED.confidence, decided_by=EXCLUDED.decided_by, reason=EXCLUDED.reason""",
               [{"run_id": run_id, "issue_id": i["issue_id"], "fund_id": i["fund_id"], "row_num": i["row"],
                 "field": i["field"], "kind": i["kind"], "detail": i["detail"],
                 "raw": None if i["raw"] is None else str(i["raw"]), "candidates": i["candidates"],
                 "action": i["action"], "new_value": None if i["new_value"] is None else str(i["new_value"]),
                 "confidence": None if i["confidence"] is None else float(i["confidence"]),
                 "decided_by": i["decided_by"], "reason": i["reason"]} for i in summary["quality_issues"]])
    _batch("""INSERT INTO verdicts (run_id, fund_id, reviewer, verdict, reason, evidence, confidence)
              VALUES (:run_id, :fund_id, :reviewer, :verdict, :reason, :evidence, :confidence)
              ON CONFLICT (run_id, fund_id, reviewer) DO UPDATE SET verdict=EXCLUDED.verdict, reason=EXCLUDED.reason,
                evidence=EXCLUDED.evidence, confidence=EXCLUDED.confidence, created_at=now()""",
           [{"run_id": run_id, "fund_id": r["fund_id"], "reviewer": v["reviewer"], "verdict": v["verdict"],
             "reason": v["reason"], "evidence": v["evidence"], "confidence": float(v["confidence"])}
            for r in results for v in r["verdicts"]])
    _batch("""INSERT INTO decisions (run_id, fund_id, decision, decided_by, rule_applied, reason, conditions)
              VALUES (:run_id, :fund_id, :decision, :decided_by, :rule_applied, :reason, :conditions)
              ON CONFLICT (run_id, fund_id) DO UPDATE SET decision=EXCLUDED.decision, decided_by=EXCLUDED.decided_by,
                rule_applied=EXCLUDED.rule_applied, reason=EXCLUDED.reason, conditions=EXCLUDED.conditions,
                created_at=now()""",
           [{"run_id": run_id, "fund_id": r["fund_id"], **{k: r["decision"][k] for k in
             ("decision", "decided_by", "rule_applied", "reason", "conditions")}} for r in results])
    # A partial re-run (e.g. one fund) must not shrink the run's totals: recount from the tables.
    sql("""UPDATE runs SET funds = (SELECT count(*) FROM decisions WHERE run_id = :run_id),
             decisions = (SELECT jsonb_object_agg(decision, n) FROM
                          (SELECT decision, count(*) n FROM decisions WHERE run_id = :run_id GROUP BY decision) t)
           WHERE run_id = :run_id""", {"run_id": run_id})


# ---------- S3 ----------

def save_s3(summary: dict, results: list[dict]):
    s3, bucket, run_id = settings.session().client("s3"), settings.aws()["bucket"], summary["run_id"]

    def put(key, body):
        s3.put_object(Bucket=bucket, Key=key, Body=body.encode(), ContentType="application/json")

    jsonl = lambda rows: "\n".join(json.dumps(r, default=str) for r in rows)
    put(f"clean/{run_id}/records.jsonl", jsonl([r["record"] for r in results]))
    put(f"provenance/{run_id}/fields.jsonl", jsonl(
        [{"fund_id": r["fund_id"], "field": k, **v} for r in results for k, v in r["record"]["fields"].items()]))
    put(f"metadata/{run_id}/mapping_checks.json", json.dumps(summary["mapping_checks"], indent=2, default=str))
    put(f"evidence/{run_id}/verdicts.jsonl", jsonl(
        [{"fund_id": r["fund_id"], **v} for r in results for v in r["verdicts"]]))
    put(f"reports/{run_id}/decisions.jsonl", jsonl([r["decision"] for r in results]))
    put(f"reports/{run_id}/summary.json", json.dumps(summary, indent=2, default=str))
    put(f"metadata/{run_id}/quality_report.json", json.dumps(summary.get("quality"), indent=2, default=str))
    put(f"metadata/{run_id}/quality_issues.jsonl", jsonl(summary.get("quality_issues") or []))
    quarantined = [r["record"] for r in results if r["decision"]["decision"] == "quarantined"]
    if quarantined:
        put(f"quarantine/{run_id}/records.jsonl", jsonl(quarantined))
