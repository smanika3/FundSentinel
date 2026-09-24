"""Transform agent: proposes useful new columns. Code (transform.apply_suggestions) validates and computes them."""

from typing import Literal

from pydantic import BaseModel, Field
from strands import Agent
from strands.models import BedrockModel

from .. import settings
from .common import PLAIN_WRITING


class Suggestion(BaseModel):
    name: str = Field(description="short snake_case name, e.g. sharpe_3y")
    kind: Literal["source_column", "formula"]
    column: str | None = Field(default=None, description="for source_column: the exact unused source column")
    unit: Literal["fraction", "percent", "bps"] | None = Field(default=None, description="for rate source columns only")
    formula: str | None = Field(default=None, description="for formula: + - * / over canonical or derived field names")
    description: str = Field(description="one plain sentence: what it means")
    why_useful: str = Field(description="one sentence: which reviewer or insight it helps")


class Suggestions(BaseModel):
    suggestions: list[Suggestion]


SYSTEM_PROMPT = """You are the Transform agent in a fund-approval data pipeline. The file is already mapped onto a canonical schema
and some standard derived columns exist. Propose up to 6 NEW columns that would genuinely help the approval committee
(performance, fees, risk, suitability, compliance) or the business-insight dashboard.
Two kinds:
- source_column: bring in a useful column the mapping did not use (e.g. a Sharpe ratio, turnover, a rating). Give its unit if it is a rate.
- formula: combine existing fields with + - * / only (e.g. "return_5y / expense_ratio"). Only use field names you were given.
Prefer columns with good coverage. Do not duplicate existing fields. Code will validate every suggestion and reject bad ones.""" + PLAIN_WRITING


def build() -> Agent:
    model = BedrockModel(model_id=settings.models()["sonnet"], boto_session=settings.session(), max_tokens=4000)
    return Agent(model=model, system_prompt=SYSTEM_PROMPT, structured_output_model=Suggestions,
                 callback_handler=None, name="transform")


def suggest(canonical: list[str], derived: list[str], unused_profile: str) -> list[dict]:
    prompt = (f"Canonical fields available: {canonical}\nDerived fields available: {derived}\n\n"
              f"Unused source columns (profile):\n{unused_profile or '(none)'}\n\nPropose new columns.")
    return [s.model_dump() for s in build()(prompt).structured_output.suggestions]
