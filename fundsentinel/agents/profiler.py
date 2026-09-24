"""Profiler agent: reads a column profile of an unfamiliar file and proposes a mapping onto the canonical schema.

Every proposal is code-checked (mapping.validate_mapping). Rejected fields go back to the agent with the reason,
for up to MAX_ROUNDS attempts. Only accepted fields are ever used.
"""

import json
from typing import Literal

import pandas as pd
from pydantic import BaseModel, Field
from strands import Agent
from strands.models import BedrockModel

from .. import mapping as mp
from .. import profile, settings

MAX_ROUNDS = 3


class FieldMap(BaseModel):
    field: str = Field(description="Canonical field name")
    column: str | None = Field(default=None, description="Exact source column name, or null if using a constant")
    constant: str | None = Field(default=None, description="Fixed value when the file has no column for it but the "
                                                           "value is certain from context (e.g. currency for a single-country file)")
    unit: Literal["fraction", "percent", "bps"] | None = Field(
        default=None, description="For rate fields: how the SOURCE stores it. fraction: 0.0075 = 0.75%. percent: 0.75 = 0.75%.")
    scale: list[float] | None = Field(default=None, description="For risk_score: the source scale [min, max], e.g. [1, 7]")
    multiplier: float | None = Field(default=None, description="For money fields in scaled units, e.g. 1e7 for crore, 1e6 for millions. "
                                                             "Not needed for text like '$1.2B' (code reads K/M/B suffixes)")
    value_map: dict[str, float] | None = Field(default=None, description="For risk_score given as words: every distinct word -> number, "
                                                                        "e.g. {'Low': 1, 'Average': 3, 'High': 5}")
    date_format: str | None = Field(default=None, description="strptime format for date columns, e.g. '%m/%d/%Y'. "
                                                              "Required when day/month order is ambiguous")
    confidence: float = Field(ge=0, le=1)
    rationale: str = Field(description="One short sentence: why this column, and why this unit")


class ProposedMapping(BaseModel):
    fields: list[FieldMap]
    not_mapped: list[str] = Field(default_factory=list,
                                  description="Canonical fields with no suitable column, each with a short reason")


SYSTEM_PROMPT = """You are the Profiler in a fund-data pipeline. You map the columns of an unfamiliar fund file onto a fixed canonical schema.
You see a profile of each column (name, type, fill rate, range, sample values), never the whole file.

Rules:
- Map a canonical field only when a column genuinely holds that meaning. Leave it out (and list it in not_mapped) rather than guess.
- Units matter more than names. Decide from the value ranges: an expense ratio column with median 0.9 is percent; with median 0.009 it is a fraction.
  Returns: median 12 means percent, median 0.12 means fraction.
- risk_score must be 1-5. If the source uses another scale, give it in `scale` so code can rescale.
- Money in crore, lakh, millions or thousands needs a `multiplier`. Text like "$1.2B" or "350M" is read by code; no multiplier.
- Rate columns may mix formats ("75 bps", "0.75%"); code reads explicit suffixes per value. Set `unit` for bare numbers.
- risk_score given as words needs a `value_map` covering every distinct word (e.g. {"Low": 1, ..., "High": 5}).
- Dates like 03/10/2021 are ambiguous: look at samples for a value above 12 to tell day from month, and set `date_format`.
- fund_id must identify a fund: prefer a ticker or code column; if there is none, use the name column.
- Use `constant` only when the value is certain from context (e.g. currency INR for a file of Indian funds). Never invent dates or numbers.
- confidence reflects how sure you are of BOTH the column and the unit.
Code will check every mapping (column exists, values parse, values fall inside the field's range). If a field is rejected you will be told why; fix it or drop it."""


def _schema_text() -> str:
    lines = []
    for name, f in settings.schema().items():
        if name == "source_ref":
            continue
        rng = f" range {f.get('min')}..{f.get('max')}" if "min" in f else ""
        lines.append(f"- {name} ({f['type']}{', required' if f.get('required') else ''}{rng}): {f['description']}")
    return "\n".join(lines)


def _to_mapping(p: ProposedMapping, source: str) -> dict:
    fields = {}
    for f in p.fields:
        spec = {k: v for k, v in f.model_dump().items() if k not in ("field",) and v is not None}
        fields[f.field] = spec
    return {"source": source, "author": "profiler-agent", "fields": fields, "not_mapped": p.not_mapped}


def build() -> Agent:
    model = BedrockModel(model_id=settings.models()["sonnet"], boto_session=settings.session())
    return Agent(model=model, system_prompt=SYSTEM_PROMPT, structured_output_model=ProposedMapping,
                 callback_handler=None, name="profiler")


def propose(df: pd.DataFrame, source: str, context: str = "", agent: Agent | None = None) -> dict:
    """Returns {"mapping": accepted-only mapping, "checks": final checks, "rounds": [...history...]}."""
    agent = agent or build()
    agent.messages.clear()
    prompt = (f"File: {source}\nRows: {len(df)}\n{context}\n\nCanonical schema:\n{_schema_text()}\n\n"
              f"Column profile:\n{profile.as_text(profile.profile_columns(df))}\n\nPropose the mapping.")
    rounds, accepted = [], {}
    for rnd in range(1, MAX_ROUNDS + 1):
        proposal = agent(prompt).structured_output
        mapping = _to_mapping(proposal, source)
        checks = mp.validate_mapping(mapping, df)
        rejected = [c for c in checks if not c.accepted]
        accepted.update({c.field: mapping["fields"][c.field] for c in checks if c.accepted})
        rounds.append({"round": rnd, "proposed": len(checks), "accepted": len(checks) - len(rejected),
                       "rejected": [{"field": c.field, "column": c.column, "reason": c.reason} for c in rejected],
                       "not_mapped": proposal.not_mapped})
        if not rejected:
            break
        prompt = ("The code check rejected these fields:\n"
                  + "\n".join(f"- {c.field} -> column {c.column!r}: {c.reason}" for c in rejected)
                  + "\nPropose corrected mappings for ONLY these fields (fix the column, unit, scale or multiplier), "
                    "or leave a field out if nothing in the file fits.")
    final = {"source": source, "author": "profiler-agent", "fields": accepted,
             "not_mapped": rounds[-1]["not_mapped"]}
    return {"mapping": final, "checks": mp.validate_mapping(final, df), "rounds": rounds}


def score_against(proposed: dict, answer_key: dict) -> dict:
    """Compare a proposed mapping with a hand-written answer key (column + unit per field)."""
    key, got = answer_key["fields"], proposed["fields"]
    rows = []
    for f, spec in key.items():
        g = got.get(f)
        ok = g is not None and g.get("column") == spec.get("column") and \
            (spec.get("unit") in (None, "auto") or g.get("unit") == spec.get("unit"))
        rows.append({"field": f, "expected": spec.get("column"), "got": None if g is None else g.get("column"),
                     "correct": ok})
    extra = [f for f in got if f not in key]
    return {"correct": sum(r["correct"] for r in rows), "total": len(rows), "extra_fields": extra,
            "wrong": [r for r in rows if not r["correct"]]}


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", required=True)
    ap.add_argument("--out", help="write the accepted mapping JSON here")
    ap.add_argument("--answer-key", help="hand-written mapping to score against")
    ap.add_argument("--context", default="")
    a = ap.parse_args()
    df = pd.read_csv(a.source, low_memory=False)
    res = propose(df, "/".join(a.source.split("/")[-2:]), a.context)
    for r in res["rounds"]:
        print(f"round {r['round']}: {r['accepted']}/{r['proposed']} accepted; rejected: {r['rejected']}")
    for f, s in res["mapping"]["fields"].items():
        print(f"  {f:24s} <- {s.get('column') or 'const ' + str(s.get('constant')):40s} "
              f"unit={s.get('unit')} scale={s.get('scale')} x{s.get('multiplier') or ''} conf={s['confidence']}  {s['rationale']}")
    print("not mapped:", res["mapping"]["not_mapped"])
    if a.answer_key:
        print("score:", json.dumps(score_against(res["mapping"], json.load(open(a.answer_key))), indent=1))
    if a.out:
        from pathlib import Path
        Path(a.out).write_text(json.dumps(res["mapping"], indent=2))
        print("wrote", a.out)
