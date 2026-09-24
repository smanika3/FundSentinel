"""RedTeam agent: designs realistic trick funds to plant among real ones. What counts as caught is fixed in config/redteam.json."""

import json

from pydantic import BaseModel, Field
from strands import Agent
from strands.models import BedrockModel

from .. import settings


class Trick(BaseModel):
    trick: str = Field(description="one of the catalogue keys")
    base_row: int = Field(description="index of the sample row to copy as a realistic starting point")
    changes: dict[str, str | float | int | None] = Field(description="column -> new value (use the file's exact column names; "
                                                                     "null to blank a cell)")
    disguise: str = Field(description="one sentence: why this would fool a careless reviewer")


class TrickSet(BaseModel):
    tricks: list[Trick]


SYSTEM_PROMPT = """You are the RedTeam agent. Your job is to test a fund-approval pipeline by designing realistic trick funds
that will be planted among real funds. For each trick, copy a sample row and change as few cells as needed.
Make every trick realistic: plausible names (change fund_long_name so each trick fund looks like a distinct real product),
plausible numbers, nothing cartoonish. Do not reveal the trick in the name unless the trick requires it.
Use the file's exact column names. Numbers must be in the same units as the sample rows (fractions stay fractions).
Produce exactly one trick per catalogue entry you are given."""


def build() -> Agent:
    model = BedrockModel(model_id=settings.models()["sonnet"], boto_session=settings.session(), max_tokens=8000)
    return Agent(model=model, system_prompt=SYSTEM_PROMPT, structured_output_model=TrickSet,
                 callback_handler=None, name="redteam")


def design(catalogue: dict, columns: list[str], sample_rows: list[dict]) -> list[dict]:
    pol = settings.policy()
    prompt = (f"The pipeline's mock approval policy (aim your tricks at these exact limits): "
              f"{json.dumps({k: v for k, v in pol.items() if k not in ('disclaimer', 'version')})}\n\n"
              f"File columns: {columns}\n\nTrick catalogue:\n"
              + "\n".join(f"- {k}: {v['description']}" for k, v in catalogue.items())
              + "\n\nSample rows (index: row):\n"
              + "\n".join(f"{i}: {json.dumps(r, default=str)}" for i, r in enumerate(sample_rows)))
    return [t.model_dump() for t in build()(prompt).structured_output.tricks]
