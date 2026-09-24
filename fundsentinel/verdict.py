"""The answer form every reviewer fills in. The Evidence checker verifies each evidence item against the data."""

from typing import Literal

from pydantic import BaseModel, Field


class Evidence(BaseModel):
    field: str = Field(description="Canonical field or computed metric the claim relies on, e.g. expense_ratio")
    value: float | int | str | None = Field(description="The exact value returned by a tool; never typed from memory")
    source_ref: str = Field(description="source_ref returned by the tool, e.g. yahoo_us/MutualFunds.csv#row2, or 'computed'")
    rule: str | None = Field(default=None, description="Policy rule this evidence was checked against, e.g. finance.max_expense_ratio=0.0075")


class Verdict(BaseModel):
    reviewer: Literal["analyst", "compliance", "finance", "suitability"]
    fund_id: str
    verdict: Literal["pass", "concern", "fail", "cannot_assess"] = Field(
        description="pass: meets policy. concern: meets hard rules but has a weakness worth a condition. "
                    "fail: breaks a policy rule. cannot_assess: required data is missing or unreadable.")
    reason: str = Field(description="One or two plain-English sentences a non-expert can follow.")
    evidence: list[Evidence] = Field(description="Every number the reason relies on, copied from tool output.")
    confidence: float = Field(ge=0, le=1)
