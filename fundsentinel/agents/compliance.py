"""Compliance reviewer: checks hard policy rules. A compliance fail always means reject (Decision owner layer 1)."""

from strands import Agent, tool

from .. import normalise, settings
from ..mapping import Record
from .common import build_reviewer, fact, unknown

ROLE = ("You are the Compliance reviewer on a mock fund-approval committee. Your only job is hard policy rules: "
        "prohibited fund types, minimum fund size, minimum track record, and required data being present. "
        "Also read the category and name yourself: if they describe a leveraged, inverse or trading product "
        "that the keyword rule missed, report it as a concern.")


def build(records: dict[str, Record]) -> Agent:
    rules = settings.policy()["compliance"]

    @tool
    def get_compliance_facts(fund_id: str) -> dict:
        """Get the fund's name, category, size, inception and as-of dates, with provenance, plus any missing required fields."""
        rec = records.get(fund_id)
        if rec is None:
            return unknown(fund_id)
        names = ["fund_name", "category", "total_net_assets", "inception_date", "as_of_date"]
        return {"fund_id": fund_id, **{n: fact(rec, n) for n in names},
                "missing_required_fields": [f for f in rules["required_fields"] if rec.get(f) is None]}

    @tool
    def check_compliance_rules(fund_id: str) -> dict:
        """Apply the compliance policy rules in code and return each rule's outcome."""
        rec = records.get(fund_id)
        if rec is None:
            return unknown(fund_id)
        out = []
        text = f"{rec.get('category') or ''} {rec.get('fund_name') or ''}".lower()
        hits = [k for k in rules["prohibited_category_keywords"] if k in text]
        out.append({"rule": "compliance.prohibited_category_keywords", "field": "category",
                    "value": rec.get("category"), "matched": hits, "outcome": "fail" if hits else "pass"})
        tna = rec.get("total_net_assets")
        out.append({"rule": f"compliance.min_total_net_assets={rules['min_total_net_assets']}", "value": tna,
                    "outcome": "cannot_assess" if tna is None else ("fail" if tna < rules["min_total_net_assets"] else "pass")})
        years = normalise.years_between(rec.get("inception_date"), rec.get("as_of_date"))
        out.append({"rule": f"compliance.min_track_record_years={rules['min_track_record_years']}",
                    "field": "history_years", "value": None if years is None else round(years, 2), "source_ref": "computed",
                    "outcome": "cannot_assess" if years is None else ("fail" if years < rules["min_track_record_years"] else "pass")})
        missing = [f for f in rules["required_fields"] if rec.get(f) is None]
        out.append({"rule": "compliance.required_fields", "value": missing,
                    "outcome": "cannot_assess" if missing else "pass"})
        return {"results": out}

    return build_reviewer("compliance", ROLE, [get_compliance_facts, check_compliance_rules], model="opus")
