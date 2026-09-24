"""Decision owner. Layer 1: fixed rules in code. Layer 2: Opus weighs the verdicts and decides."""

from typing import Literal

from pydantic import BaseModel, Field
from strands import Agent
from strands.models import BedrockModel

from .. import settings
from ..verdict import Verdict

DecisionLabel = Literal["approved", "approved_with_conditions", "rejected", "flagged_for_review", "sent_back"]


class Decision(BaseModel):
    fund_id: str
    decision: DecisionLabel
    reason: str = Field(description="Two or three plain-English sentences citing the reviewers' key findings.")
    conditions: list[str] = Field(default_factory=list, description="Conditions attached to an approval, if any.")
    decided_by: Literal["rule", "ai"] = "ai"
    rule_applied: str | None = None


SYSTEM_PROMPT = """You are the Decision owner of a mock fund-approval committee (internal decision support, never investment advice).
You receive four reviewer verdicts (analyst, compliance, finance, suitability). Choose exactly one decision:
- approved: every reviewer passed.
- approved_with_conditions: no fails, but one or more concerns that a clear condition can address
  (e.g. "restrict to experienced investors", "re-review fees in 6 months"). List the conditions.
- rejected: a reviewer failed on a policy rule.
- flagged_for_review: reviewers could not assess key areas, or the evidence conflicts in a way you cannot resolve.
  This is only a label; the pipeline keeps moving.
Base the decision only on the verdicts given. Write the reason so a non-expert understands it."""


def layer1(fund_id: str, verdicts: list[Verdict]) -> Decision | None:
    """Fixed rules that the AI cannot override."""
    for v in verdicts:
        if v.verdict in ("pass", "concern", "fail") and not v.evidence:
            return Decision(fund_id=fund_id, decision="sent_back", decided_by="rule", rule_applied="evidence_required",
                            reason=f"The {v.reviewer} verdict gave no evidence, so it is sent back for proof.")
    comp = next((v for v in verdicts if v.reviewer == "compliance"), None)
    if comp and comp.verdict == "fail":
        return Decision(fund_id=fund_id, decision="rejected", decided_by="rule", rule_applied="compliance_fail_rejects",
                        reason=f"Compliance failed, which always means rejection. {comp.reason}")
    return None


def build() -> Agent:
    model = BedrockModel(model_id=settings.models()["opus"], boto_session=settings.session())
    return Agent(model=model, system_prompt=SYSTEM_PROMPT, structured_output_model=Decision,
                 callback_handler=None, name="decision_owner")


def decide(agent: Agent, fund_id: str, verdicts: list[Verdict]) -> Decision:
    fixed = layer1(fund_id, verdicts)
    if fixed:
        return fixed
    agent.messages.clear()
    payload = "\n".join(v.model_dump_json() for v in verdicts)
    d = agent(f"Decide fund_id={fund_id}. Reviewer verdicts (JSON, one per line):\n{payload}").structured_output
    d.fund_id, d.decided_by = fund_id, "ai"
    return d
