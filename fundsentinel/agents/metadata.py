"""Metadata agent: writes a plain-English data dictionary for every column, from facts computed in code."""

import json

from pydantic import BaseModel, Field
from strands import Agent
from strands.models import BedrockModel

from .. import settings


class ColumnDoc(BaseModel):
    name: str
    description: str = Field(description="Two sentences max, plain English, for a business reader")
    unit: str = Field(description="e.g. 'fraction (0.0075 = 0.75%)', 'USD', 'years', 'text', 'score 1-5'")
    caveats: str = Field(default="", description="Anything a reader must know: gaps, conversions, known data problems")


class DataDictionary(BaseModel):
    dataset_description: str = Field(description="Three sentences: what this dataset is, where it came from, how usable it is")
    columns: list[ColumnDoc]


SYSTEM_PROMPT = """You are the Metadata agent in a fund-data pipeline. Write a data dictionary a business analyst can trust.
For every column you are given facts computed by code: source column, how it was converted, coverage, examples, data-quality flags.
Describe what each column means in plain English, its unit, and honest caveats (low coverage, conversions, known problems).
Never invent facts beyond what you are given."""


def build() -> Agent:
    model = BedrockModel(model_id=settings.models()["sonnet"], boto_session=settings.session(), max_tokens=12000)
    return Agent(model=model, system_prompt=SYSTEM_PROMPT, structured_output_model=DataDictionary,
                 callback_handler=None, name="metadata")


def document(source: str, context: str, column_facts: list[dict], quality_summary: str) -> dict:
    prompt = (f"Dataset: {source}\nUploader context: {context or '(none)'}\nQuality summary: {quality_summary}\n\n"
              "Columns (facts from code):\n" + "\n".join(json.dumps(c, default=str) for c in column_facts))
    return build()(prompt).structured_output.model_dump()
