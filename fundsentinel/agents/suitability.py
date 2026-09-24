"""Suitability reviewer: judges which investors the fund fits."""

from strands import Agent, tool

from .. import settings
from ..mapping import Record
from .common import build_reviewer, fact, fund_flags, unknown

ROLE = ("You are the Suitability reviewer on a mock fund-approval committee. Your only job is investor fit: "
        "whether the fund's risk level is suitable for a general investor, or only for experienced investors. "
        "If the risk score looks inconsistent with the category (e.g. 'low risk' on an aggressive or leveraged "
        "category), say so as a concern.")


def build(records: dict[str, Record]) -> Agent:
    rules = settings.policy()["suitability"]

    @tool
    def get_suitability_facts(fund_id: str) -> dict:
        """Get the fund's risk score (1 lowest to 5 highest) and category, with provenance."""
        rec = records.get(fund_id)
        if rec is None:
            return unknown(fund_id)
        return {"fund_id": fund_id, "fund_flags": fund_flags(rec), "fund_name": rec.get("fund_name"),
                "risk_score": fact(rec, "risk_score"), "category": fact(rec, "category")}

    @tool
    def check_suitability_rules(fund_id: str) -> dict:
        """Apply the suitability policy rules in code and return each rule's outcome."""
        rec = records.get(fund_id)
        if rec is None:
            return unknown(fund_id)
        risk = rec.get("risk_score")
        if risk is None:
            return {"results": [{"rule": "suitability.risk_score_present", "outcome": "cannot_assess"}]}
        return {"results": [{"rule": f"suitability.general_investor_max_risk={rules['general_investor_max_risk']}",
                             "value": risk,
                             "outcome": "concern" if risk > rules["general_investor_max_risk"] else "pass"}]}

    return build_reviewer("suitability", ROLE, [get_suitability_facts, check_suitability_rules])
