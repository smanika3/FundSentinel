"""Shared plumbing for reviewer agents: provenance-carrying facts and a standard agent builder."""

from strands import Agent
from strands.models import BedrockModel

from .. import settings
from ..mapping import Record
from ..verdict import Verdict

RULES_OF_ENGAGEMENT = """
How to work:
1. Call the facts tool, then the rules tool, for the fund you are given.
2. Decide from the rule outcomes: fail if any rule failed; concern if any rule raised a concern and none failed;
   cannot_assess if the data you need is missing; otherwise pass.
3. Explain in one or two plain sentences a non-expert can follow. Show rates as percentages (0.0075 = 0.75%).
4. List every number you relied on as evidence, copying value and source_ref exactly from tool output.
   Never invent, round differently, or recompute numbers.
This is a mock scenario and internal decision support, never investment advice."""


def fact(rec: Record, name: str) -> dict:
    """One field's value with its provenance (raw value, source column, transform, source_ref)."""
    fv = rec.fields.get(name)
    if fv is None or fv.value is None:
        return {"value": None, "source_ref": rec.get("source_ref"), "note": "missing"}
    return {"value": fv.value, "raw": fv.raw, "column": fv.column,
            "source_ref": rec.get("source_ref"), "transform": fv.transform}


def unknown(fund_id: str) -> dict:
    return {"error": f"unknown fund_id {fund_id}"}


def build_reviewer(name: str, role: str, tools: list, model: str = "sonnet") -> Agent:
    bedrock = BedrockModel(model_id=settings.models()[model], boto_session=settings.session())
    return Agent(model=bedrock, system_prompt=role + "\n" + RULES_OF_ENGAGEMENT, tools=tools,
                 structured_output_model=Verdict, callback_handler=None, name=name)


def review(agent: Agent, fund_id: str) -> Verdict:
    agent.messages.clear()  # each fund is judged on its own, with no memory of earlier funds
    return agent(f"Review fund_id={fund_id}.").structured_output
