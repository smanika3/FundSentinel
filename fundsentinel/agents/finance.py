"""Finance reviewer: judges a fund's fees. Numbers come only from the code tools below."""

from strands import Agent, tool

from .. import settings
from ..mapping import Record
from .common import build_reviewer, fact, fund_flags, unknown

ROLE = "You are the Finance reviewer on a mock fund-approval committee. Your only job is the fund's fees."


def build(records: dict[str, Record]) -> Agent:
    rules = settings.policy()["finance"]

    @tool
    def get_fee_facts(fund_id: str) -> dict:
        """Get the fund's expense ratio and its category's average expense ratio, with provenance."""
        rec = records.get(fund_id)
        if rec is None:
            return unknown(fund_id)
        return {"fund_id": fund_id, "fund_flags": fund_flags(rec), "fund_name": rec.get("fund_name"), "category": rec.get("category"),
                "expense_ratio": fact(rec, "expense_ratio"),
                "category_expense_ratio": fact(rec, "category_expense_ratio")}

    @tool
    def check_fee_rules(fund_id: str) -> dict:
        """Apply the fee policy rules in code and return each rule's outcome."""
        rec = records.get(fund_id)
        if rec is None:
            return unknown(fund_id)
        fee, cat = rec.get("expense_ratio"), rec.get("category_expense_ratio")
        if fee is None:
            return {"results": [{"rule": "finance.expense_ratio_present", "outcome": "cannot_assess"}]}
        out = [{"rule": f"finance.max_expense_ratio={rules['max_expense_ratio']}", "value": fee,
                "outcome": "fail" if fee > rules["max_expense_ratio"] else "pass"}]
        if cat:
            premium = round(fee / cat - 1, 4)
            out.append({"rule": f"finance.max_premium_over_category={rules['max_premium_over_category']}",
                        "value": premium, "field": "premium_over_category", "source_ref": "computed",
                        "outcome": "concern" if premium > rules["max_premium_over_category"] else "pass"})
        return {"results": out}

    return build_reviewer("finance", ROLE, [get_fee_facts, check_fee_rules])
