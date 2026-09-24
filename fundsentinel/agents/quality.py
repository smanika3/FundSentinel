"""Quality agent: turns the code checks into a plain-English data-quality report, and reads the funds under review
for inconsistencies code cannot see (e.g. a target-date fund filed under a foreign equity category)."""

import json
from typing import Literal

from pydantic import BaseModel, Field
from strands import Agent
from strands.models import BedrockModel

from .. import settings
from ..mapping import Record
from .common import PLAIN_WRITING


class Finding(BaseModel):
    fund_id: str
    field: str = Field(description="Canonical field the problem is in, e.g. category or fund_name")
    finding: str = Field(description="One sentence: what looks inconsistent and why")
    severity: Literal["low", "high"]


class QualityReport(BaseModel):
    score: int = Field(ge=0, le=100, description="Overall data quality of the file, 100 = clean")
    summary: str = Field(description="Three or four plain-English sentences for a non-technical reader")
    top_problems: list[str] = Field(description="Up to five short bullet points, most important first")
    extra_findings: list[Finding] = Field(default_factory=list,
                                          description="Inconsistencies in the funds you were shown that the code checks did not report")


SYSTEM_PROMPT = """You are the Quality inspector in a fund-data pipeline (mock scenario, internal use).
You receive (1) statistics from deterministic code checks over the whole file and (2) a compact table of the funds under review.
Write a short, honest data-quality report. Then look at the table yourself for inconsistencies code cannot catch:
a fund name that contradicts its category (e.g. a bond fund in an equity category, a target-date fund in a sector category),
a family that does not match the name, or values that are individually valid but make no sense together.
Only report extra findings you are genuinely confident about; do not repeat problems the code already reported.""" + PLAIN_WRITING


def build() -> Agent:
    model = BedrockModel(model_id=settings.models()["sonnet"], boto_session=settings.session(), max_tokens=8000)
    return Agent(model=model, system_prompt=SYSTEM_PROMPT, structured_output_model=QualityReport,
                 callback_handler=None, name="quality")


def report(stats: dict, records: list[Record], source: str, max_rows: int = 60) -> QualityReport:
    cols = ["fund_id", "fund_name", "fund_family", "category", "expense_ratio", "risk_score", "total_net_assets", "currency"]
    table = [{c: r.get(c) for c in cols} for r in records[:max_rows]]
    already = sorted({f["kind"] for r in records for f in r.flags})
    agent = build()
    prompt = (f"File: {source}\nCode check statistics (whole file): {json.dumps(stats, default=str)}\n"
              f"Problem kinds already reported by code: {already}\n"
              f"Funds under review ({len(table)}):\n" + "\n".join(json.dumps(t, default=str) for t in table))
    return agent(prompt).structured_output
