"""Radar-lite materiality agent (Opus): decides which data changes matter and which reviewers to reopen."""

import json
from typing import Literal

from pydantic import BaseModel, Field
from strands import Agent
from strands.models import BedrockModel

from .. import settings
from .common import PLAIN_WRITING

Reviewer = Literal["analyst", "compliance", "finance", "suitability"]


class ChangeCall(BaseModel):
    change_id: str
    materiality: Literal["routine", "material", "ambiguous"]
    reason: str = Field(description="One short sentence")


class FundRouting(BaseModel):
    fund_id: str
    reopen: list[Reviewer] = Field(description="Reviewers whose verdict must be redone; empty if nothing material changed")
    why: str = Field(description="One sentence: why these reviewers and not the others")


class MaterialityPlan(BaseModel):
    changes: list[ChangeCall]
    routing: list[FundRouting]


SYSTEM_PROMPT = """You are Radar-lite on a mock fund-approval committee. A fund file was updated after funds were already decided.
For every detected change decide:
- routine: expected refresh that cannot change any verdict (e.g. a new as-of date, small return drift of well under a point).
- material: could change a reviewer's verdict (fee moves, risk level changes, size moves toward or across a limit,
  benchmark or category changes, anything that crosses a policy threshold).
- ambiguous: might matter, e.g. a fund renamed (could be cosmetic, could signal a merger or a different product).
  Ambiguous changes should reopen the reviewer best placed to judge them, and say what they should check.
Then, per fund, choose which reviewers to reopen. The routing map says who normally checks each field; follow it unless you
have a reason, and explain. Reopen as few reviewers as correctness allows: re-reviewing everything defeats the purpose.
Changes flagged `crosses_policy_threshold` are always material.""" + PLAIN_WRITING


def build() -> Agent:
    model = BedrockModel(model_id=settings.models()["opus"], boto_session=settings.session(), max_tokens=12000)
    return Agent(model=model, system_prompt=SYSTEM_PROMPT, structured_output_model=MaterialityPlan,
                 callback_handler=None, name="radar_materiality")


def classify(changes: list[dict], routing_map: dict, baseline: dict) -> MaterialityPlan:
    prompt = (f"Routing map (field -> reviewers): {json.dumps(routing_map)}\n"
              f"Baseline decisions: {json.dumps(baseline, default=str)}\n\nChanges:\n"
              + "\n".join(json.dumps(c, default=str) for c in changes))
    return build()(prompt).structured_output
