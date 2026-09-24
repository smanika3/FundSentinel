"""Evidence checker, code half: every number a reviewer cites must come from its own tool output, and every
source reference must be the fund's real source row (or 'computed'). No proof, no pass."""

import json
import re

from .mapping import Record
from .verdict import Verdict


def tool_values(messages: list) -> set:
    """All scalar values the reviewer's tools returned during its last run."""
    vals = set()

    def walk(o):
        if isinstance(o, dict):
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            vals.add(json.dumps(o, sort_keys=True).lower())
            vals.add(str(o).lower())
            for v in o:
                walk(v)
        elif isinstance(o, bool) or o is None:
            return
        elif isinstance(o, (int, float)):
            vals.add(round(float(o), 6))
        else:
            vals.add(str(o).strip().lower())

    for msg in messages:
        for block in msg.get("content", []):
            res = block.get("toolResult")
            if not res:
                continue
            for c in res.get("content", []):
                if "json" in c:
                    walk(c["json"])
                elif "text" in c:
                    try:
                        walk(json.loads(c["text"]))
                    except (json.JSONDecodeError, TypeError):
                        for n in re.findall(r"-?\d+\.?\d*", c["text"]):
                            vals.add(round(float(n), 6))
    return vals


def _as_list(value):
    if isinstance(value, list):
        return value
    if isinstance(value, str) and value.strip().startswith("["):
        try:
            return json.loads(value.replace("'", '"'))
        except json.JSONDecodeError:
            return None
    return None


def _grounded(value, vals: set) -> bool:
    if value is None:
        return True
    items = _as_list(value)
    if items is not None:  # a list: empty lists match any empty list returned; otherwise every item must be grounded
        return ("[]" in vals) if not items else all(_grounded(i, vals) for i in items)
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return round(float(value), 6) in vals
    s = str(value).strip().lower()
    if s in vals:
        return True
    try:  # a number sent as a string
        return round(float(s.rstrip("%")), 6) in vals
    except ValueError:
        return False


def check(verdict: Verdict, vals: set, record: Record) -> list[str]:
    """Returns a list of problems; empty list means the evidence is grounded."""
    problems = []
    if len((verdict.reason or "").strip()) < 25:
        problems.append("the reason is not an explanation; say in plain sentences why you reached this verdict")
    if verdict.verdict in ("pass", "concern", "fail") and not verdict.evidence:
        problems.append("the verdict cites no evidence")
    src = record.get("source_ref")
    for e in verdict.evidence:
        if not _grounded(e.value, vals):
            problems.append(f"evidence {e.field}={e.value!r} does not appear in your tool output")
        if e.source_ref not in (src, "computed") and e.value is not None:
            problems.append(f"evidence {e.field} cites source_ref {e.source_ref!r}, but this fund's source is {src!r}")
    return problems
