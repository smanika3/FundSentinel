"""Finance reviewer: judges a fund's fees. Numbers come only from the code tools below."""

from strands import Agent, tool
from strands.models import BedrockModel

from .. import settings
from ..mapping import Record
from ..verdict import Verdict

SYSTEM_PROMPT = """You are the Finance reviewer on a mock fund-approval committee (internal decision support, not investment advice).
Your only job is fees. For the fund you are given:
1. Call get_fee_facts, then check_fee_rules.
2. Decide: fail if any rule failed; concern if a rule raised a concern; cannot_assess if the expense ratio is missing; otherwise pass.
3. Explain in one or two plain sentences, stating fees as percentages (0.0075 = 0.75%).
4. List every number you relied on as evidence, copying value and source_ref exactly from the tool output. Never invent or recompute numbers."""


def _fact(rec: Record, name: str) -> dict:
    fv = rec.fields.get(name)
    if fv is None or fv.value is None:
        return {"value": None, "source_ref": rec.get("source_ref"), "note": "missing"}
    return {"value": fv.value, "raw": fv.raw, "column": fv.column,
            "source_ref": rec.get("source_ref"), "transform": fv.transform}


def build(records: dict[str, Record]) -> Agent:
    rules = settings.policy()["finance"]

    @tool
    def get_fee_facts(fund_id: str) -> dict:
        """Get the fund's expense ratio and its category's average expense ratio, with provenance."""
        rec = records.get(fund_id)
        if rec is None:
            return {"error": f"unknown fund_id {fund_id}"}
        return {"fund_id": fund_id, "fund_name": rec.get("fund_name"), "category": rec.get("category"),
                "expense_ratio": _fact(rec, "expense_ratio"),
                "category_expense_ratio": _fact(rec, "category_expense_ratio")}

    @tool
    def check_fee_rules(fund_id: str) -> dict:
        """Apply the fee policy rules in code and return each rule's outcome."""
        rec = records.get(fund_id)
        if rec is None:
            return {"error": f"unknown fund_id {fund_id}"}
        fee, cat = rec.get("expense_ratio"), rec.get("category_expense_ratio")
        out = []
        if fee is None:
            return {"results": [{"rule": "finance.expense_ratio_present", "outcome": "cannot_assess"}]}
        out.append({"rule": f"finance.max_expense_ratio={rules['max_expense_ratio']}", "value": fee,
                    "outcome": "fail" if fee > rules["max_expense_ratio"] else "pass"})
        if cat:
            premium = round(fee / cat - 1, 4)
            out.append({"rule": f"finance.max_premium_over_category={rules['max_premium_over_category']}",
                        "value": premium, "field": "premium_over_category", "source_ref": "computed",
                        "outcome": "concern" if premium > rules["max_premium_over_category"] else "pass"})
        return {"results": out}

    model = BedrockModel(model_id=settings.models()["sonnet"], boto_session=settings.session())
    return Agent(model=model, system_prompt=SYSTEM_PROMPT, tools=[get_fee_facts, check_fee_rules],
                 structured_output_model=Verdict, callback_handler=None, name="finance")


def review(agent: Agent, fund_id: str) -> Verdict:
    agent.messages.clear()  # each fund is judged on its own, with no memory of earlier funds
    return agent(f"Review fund_id={fund_id}.").structured_output
