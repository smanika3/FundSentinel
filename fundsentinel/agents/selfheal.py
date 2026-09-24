"""SelfHeal agent: decides fix / flag / quarantine / dismiss for the ambiguous issues Quality found.

It only ever chooses among code-computed candidates; quality.apply() re-checks every fix and downgrades
anything invalid to a flag. The pipeline never stops.
"""

import json
from typing import Literal

from pydantic import BaseModel, Field
from strands import Agent
from strands.models import BedrockModel

from .. import settings
from ..quality import AMBIGUOUS_KINDS, Issue
from .common import PLAIN_WRITING


class HealDecision(BaseModel):
    issue_id: str
    action: Literal["fix", "flag", "quarantine", "dismiss"]
    new_value: str | float | None = Field(default=None, description="For fix (and optionally flag as a best guess): "
                                                                     "must be one of the issue's candidates")
    confidence: float = Field(ge=0, le=1)
    reason: str = Field(description="One short plain-English sentence")


class HealPlan(BaseModel):
    decisions: list[HealDecision]


SYSTEM_PROMPT = """You are SelfHeal in a fund-data pipeline. For each data problem, choose exactly one action:
- fix: you are very sure (>= 0.9) what the value should be. new_value MUST be one of the candidates.
- flag: plausible but unsure. Optionally give a best-guess new_value from the candidates; the fund continues, marked "needs review".
- quarantine: the fund cannot be judged fairly with this problem (e.g. a fee far outside anything real with no believable correction).
- dismiss: not actually a problem (e.g. a legitimate category name that merely looks similar to another).
Guidance:
- Category typos: fix when the candidate is an obvious misspelling (one or two letters); dismiss when the original is a real, different term.
- A bare fee like 7.5 in a percent column is most likely 0.75% typed without the decimal point: flag with that candidate as a best guess.
- A 45% fee or a risk score of 9 has no safe correction: quarantine or flag, never invent a value.
- Implausible returns (e.g. 90% a year for 5 years) are suspect: flag.
- Negative fund size: flag (sign error or bad data), never guess the size.
Never stop the pipeline. Keep reasons short and concrete.""" + PLAIN_WRITING


def build() -> Agent:
    model = BedrockModel(model_id=settings.models()["sonnet"], boto_session=settings.session(), max_tokens=8000)
    return Agent(model=model, system_prompt=SYSTEM_PROMPT, structured_output_model=HealPlan,
                 callback_handler=None, name="selfheal")


def heal(issues: list[Issue], fund_ids: set[str] | None = None, chunk: int = 40) -> list[Issue]:
    """Decide the ambiguous, undecided issues (optionally only for fund_ids in scope). Mutates and returns them."""
    todo = [i for i in issues if i.action is None and i.kind in AMBIGUOUS_KINDS
            and (fund_ids is None or i.fund_id in fund_ids)]
    if not todo:
        return []
    agent = build()
    for start in range(0, len(todo), chunk):
        batch = todo[start:start + chunk]
        agent.messages.clear()
        payload = [{"issue_id": i.issue_id, "fund_id": i.fund_id, "field": i.field, "kind": i.kind, "detail": i.detail,
                    "raw": None if i.raw is None else str(i.raw), "current_value": i.value, "candidates": i.candidates}
                   for i in batch]
        plan = agent("Decide each issue:\n" + json.dumps(payload, default=str)).structured_output
        decided = {d.issue_id: d for d in plan.decisions}
        for i in batch:
            d = decided.get(i.issue_id)
            if d is None:
                i.action, i.decided_by, i.confidence, i.reason = "flag", "guardrail", 0.0, "SelfHeal gave no decision; flagged."
                continue
            i.action, i.new_value, i.confidence, i.reason, i.decided_by = d.action, d.new_value, d.confidence, d.reason, "selfheal"
            if i.action == "fix" and d.confidence < 0.9:
                i.action = "flag"
                i.reason = f"{d.reason} (confidence {d.confidence:.0%} below 90%, so flagged not fixed)"
    return todo
