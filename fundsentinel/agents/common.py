"""Shared plumbing for reviewer agents: provenance-carrying facts and a standard agent builder."""

import time

from strands import Agent
from strands.models import BedrockModel

from .. import normalise, settings
from ..mapping import Record
from ..verdict import Verdict

RULES_OF_ENGAGEMENT = """
How to work:
1. Call the facts tool, then the rules tool, for the fund you are given.
2. Decide from the rule outcomes: fail if any rule failed; concern if any rule raised a concern and none failed;
   cannot_assess if the data you need is missing; otherwise pass.
3. Explain in one or two plain sentences a non-expert can follow. Show rates as percentages (0.0075 = 0.75%).
   The limits come from FundSentinel's mock demo policy. Call them "the mock policy's fee cap (0.75%)" and so on;
   never describe them as a firm's, TIAA's or a regulator's rule.
4. List every number you relied on as evidence, copying value and source_ref exactly from tool output.
   Never invent, round differently, or recompute numbers.
5. If a fact carries data_quality_flags (the value was repaired or is suspect), mention it in your reason and lower
   your confidence; if the flag makes the value unusable for your judgement, answer cannot_assess.
   If your verdict relies on a flag, cite it as evidence: field "data_quality_flag", value = the flag text exactly as
   returned, source_ref = the fund's source_ref.
This is a mock scenario and internal decision support, never investment advice."""


def fact(rec: Record, name: str) -> dict:
    """One field's value with its provenance (raw value, source column, transform, source_ref)."""
    fv = rec.fields.get(name)
    flags = [f for f in rec.flags if f.get("field") in (name, "*")]
    if fv is None or fv.value is None:
        out = {"value": None, "source_ref": rec.get("source_ref"), "note": "missing"}
    else:
        out = {"value": fv.value, "raw": fv.raw, "column": fv.column,
               "source_ref": rec.get("source_ref"), "transform": fv.transform}
    if flags:
        out["data_quality_flags"] = [f["detail"] for f in flags]
    return out


IDENTITY_FIELDS = {"fund_id", "fund_name", "ticker", "category", "fund_family", "*"}


def fund_flags(rec: Record) -> list[str]:
    """Data-quality flags about the fund's identity: relevant to every reviewer."""
    return [f["detail"] for f in rec.flags if f.get("field") in IDENTITY_FIELDS]


def history_years(rec: Record) -> float | None:
    """Track record length: from inception and as-of dates, else from a stated fund age."""
    years = normalise.years_between(rec.get("inception_date"), rec.get("as_of_date"))
    return years if years is not None else rec.get("fund_age_years")


def unknown(fund_id: str) -> dict:
    return {"error": f"unknown fund_id {fund_id}"}


def build_reviewer(name: str, role: str, tools: list, model: str = "sonnet") -> Agent:
    bedrock = BedrockModel(model_id=settings.models()[model], boto_session=settings.session())
    return Agent(model=bedrock, system_prompt=role + "\n" + RULES_OF_ENGAGEMENT, tools=tools,
                 structured_output_model=Verdict, callback_handler=None, name=name)


def review(agent: Agent, fund_id: str, note: str = "") -> Verdict:
    agent.messages.clear()  # each fund is judged on its own, with no memory of earlier funds
    prompt = f"Review fund_id={fund_id}."
    if note:
        prompt += f"\nYou are being asked again. {note}"
    return agent(prompt).structured_output


def review_traced(agent: Agent, fund_id: str, note: str = "") -> tuple[Verdict, set]:
    """Review, and return every value the reviewer's tools produced (for the Evidence checker)."""
    from ..evidence import tool_values
    v = review(agent, fund_id, note)
    return v, tool_values(agent.messages)


AUTH_ERRORS = ("ExpiredToken", "LoginRefreshRequired", "UnrecognizedClient", "InvalidSignature", "session has expired")


class LoginExpired(RuntimeError):
    pass


def is_auth_error(e: Exception) -> bool:
    return any(k in f"{type(e).__name__} {e}" for k in AUTH_ERRORS)


TRANSIENT_ERRORS = ("ServiceUnavailable", "Throttling", "TooManyRequests", "ModelNotReady", "InternalServer")


def safe_review(agent: Agent, fund_id: str, retries: int = 2, note: str = "", traced: bool = False):
    """Never let one reviewer crash the pipeline: brief outages are retried, other errors become cannot_assess.
    Expired logins stop the run. traced=True returns (verdict, tool_values)."""
    for attempt in range(retries + 1):
        try:
            return review_traced(agent, fund_id, note) if traced else review(agent, fund_id, note)
        except Exception as e:
            if is_auth_error(e):
                raise LoginExpired("AWS login expired. Run: aws login --profile fundsentinel, then re-run "
                                   "(same file + mapping reuses the run ID, so nothing is duplicated).") from e
            transient = any(k in f"{type(e).__name__} {e}" for k in TRANSIENT_ERRORS)
            if transient and attempt < retries:
                time.sleep(5 * (attempt + 1))
                continue
            v = Verdict(reviewer=agent.name, fund_id=fund_id, verdict="cannot_assess", evidence=[], confidence=0,
                        reason=f"The {agent.name} reviewer could not run ({type(e).__name__}); needs a re-run.")
            return (v, set()) if traced else v
