"""Analyst reviewer: judges performance and track record."""

from strands import Agent, tool

from .. import normalise, settings
from ..mapping import Record
from .common import build_reviewer, fact, unknown

ROLE = ("You are the Analyst on a mock fund-approval committee. Your only job is performance: returns, "
        "returns versus the category, length of track record, and whether the returns look believable.")


def build(records: dict[str, Record]) -> Agent:
    rules = settings.policy()["analyst"]

    @tool
    def get_performance_facts(fund_id: str) -> dict:
        """Get the fund's 1/3/5-year returns, category 5-year return, inception and as-of dates, with provenance."""
        rec = records.get(fund_id)
        if rec is None:
            return unknown(fund_id)
        names = ["return_1y", "return_3y", "return_5y", "category_return_5y", "inception_date", "as_of_date"]
        return {"fund_id": fund_id, "fund_name": rec.get("fund_name"), "category": rec.get("category"),
                **{n: fact(rec, n) for n in names}}

    @tool
    def check_performance_rules(fund_id: str) -> dict:
        """Apply the performance policy rules in code and return each rule's outcome."""
        rec = records.get(fund_id)
        if rec is None:
            return unknown(fund_id)
        out = []
        years = normalise.years_between(rec.get("inception_date"), rec.get("as_of_date"))
        if years is None:
            out.append({"rule": "analyst.history_known", "outcome": "cannot_assess"})
        else:
            out.append({"rule": f"analyst.min_history_years={rules['min_history_years']}", "field": "history_years",
                        "value": round(years, 2), "source_ref": "computed",
                        "outcome": "concern" if years < rules["min_history_years"] else "pass"})
        r1 = rec.get("return_1y")
        if r1 is not None:
            out.append({"rule": f"analyst.implausible_return_1y={rules['implausible_return_1y']}", "value": r1,
                        "outcome": "fail" if r1 > rules["implausible_return_1y"] else "pass"})
        r5, c5 = rec.get("return_5y"), rec.get("category_return_5y")
        if r5 is not None and c5 is not None:
            gap = round(r5 - c5, 4)
            out.append({"rule": f"analyst.max_underperformance_vs_category_5y={rules['max_underperformance_vs_category_5y']}",
                        "field": "return_5y_minus_category", "value": gap, "source_ref": "computed",
                        "outcome": "concern" if gap < -rules["max_underperformance_vs_category_5y"] else "pass"})
        elif all(rec.get(n) is None for n in ("return_1y", "return_3y", "return_5y")):
            out.append({"rule": "analyst.returns_present", "outcome": "cannot_assess"})
        return {"results": out}

    return build_reviewer("analyst", ROLE, [get_performance_facts, check_performance_rules])
