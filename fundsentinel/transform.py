"""Transform, code half: standard derived columns, plus a safe evaluator for columns the Transform agent proposes.

Derived values are stored on each record as fields named "x_<name>", with a transform note saying how they were made,
so provenance covers them like any other field. Formulas may only use + - * / on known field names and numbers.
"""

import ast
import math

import pandas as pd

from . import normalise, settings
from .agents.common import history_years
from .mapping import FieldValue, Record

STANDARD = {
    "x_fee_vs_category": ("Fee relative to the category average: 0.25 means 25% more expensive than peers.",
                          "expense_ratio / category_expense_ratio - 1"),
    "x_return_5y_vs_category": ("5-year annualised return minus the category's, as a fraction (0.01 = 1 point ahead).",
                                "return_5y - category_return_5y"),
    "x_history_years": ("Length of track record in years (from inception and as-of dates, or stated fund age).", None),
    "x_total_net_assets_usd": ("Fund size converted to USD with the mock exchange rates in config/fx.json.", None),
    "x_risk_band": ("Plain-language risk band from risk_score: 1-2 Low, 3 Medium, 4-5 High.", None),
}

_ALLOWED = (ast.Expression, ast.BinOp, ast.UnaryOp, ast.Add, ast.Sub, ast.Mult, ast.Div, ast.USub, ast.UAdd,
            ast.Name, ast.Load, ast.Constant)


def parse_formula(formula: str, known: set[str]) -> ast.Expression:
    """Parse and whitelist a formula. Raises ValueError with a readable reason."""
    try:
        tree = ast.parse(formula, mode="eval")
    except SyntaxError as e:
        raise ValueError(f"not a valid formula: {e.msg}")
    for node in ast.walk(tree):
        if not isinstance(node, _ALLOWED):
            raise ValueError(f"'{type(node).__name__}' is not allowed; only + - * / on field names and numbers")
        if isinstance(node, ast.Name) and node.id not in known:
            raise ValueError(f"unknown field '{node.id}'")
        if isinstance(node, ast.Constant) and not isinstance(node.value, (int, float)):
            raise ValueError("only numeric constants are allowed")
    return tree


def evaluate(tree: ast.Expression, values: dict):
    def ev(n):
        if isinstance(n, ast.Expression):
            return ev(n.body)
        if isinstance(n, ast.Constant):
            return float(n.value)
        if isinstance(n, ast.Name):
            v = values.get(n.id)
            if v is None or isinstance(v, str):
                raise ZeroDivisionError  # treated as "no value"
            return float(v)
        if isinstance(n, ast.UnaryOp):
            return -ev(n.operand) if isinstance(n.op, ast.USub) else ev(n.operand)
        a, b = ev(n.left), ev(n.right)
        return {ast.Add: a + b, ast.Sub: a - b, ast.Mult: a * b}.get(type(n.op)) if not isinstance(n.op, ast.Div) else a / b
    try:
        out = ev(tree)
        return None if out is None or math.isnan(out) or math.isinf(out) else round(out, 6)
    except (ZeroDivisionError, OverflowError):
        return None


def _values(rec: Record) -> dict:
    return {k: fv.value for k, fv in rec.fields.items()}


def add_standard(records: list[Record]) -> list[dict]:
    """Compute the standard derived columns on every record. Returns their definitions."""
    fx = settings.fx()
    ratio_tree = parse_formula(STANDARD["x_fee_vs_category"][1], {"expense_ratio", "category_expense_ratio"})
    gap_tree = parse_formula(STANDARD["x_return_5y_vs_category"][1], {"return_5y", "category_return_5y"})
    for rec in records:
        vals = _values(rec)
        derived = {
            "x_fee_vs_category": (evaluate(ratio_tree, vals), STANDARD["x_fee_vs_category"][1]),
            "x_return_5y_vs_category": (evaluate(gap_tree, vals), STANDARD["x_return_5y_vs_category"][1]),
        }
        hy = history_years(rec)
        derived["x_history_years"] = (None if hy is None else round(hy, 2), "inception_date..as_of_date, else fund_age_years")
        tna, ccy = rec.get("total_net_assets"), rec.get("currency") or "USD"
        rate = fx.get(ccy)
        derived["x_total_net_assets_usd"] = (None if tna is None or rate is None else round(tna * rate),
                                             f"total_net_assets x {rate} ({ccy}->USD, mock fx)")
        risk = rec.get("risk_score")
        derived["x_risk_band"] = (None if risk is None else ("Low" if risk <= 2 else "Medium" if risk == 3 else "High"),
                                  "risk_score 1-2 Low, 3 Medium, 4-5 High")
        for name, (value, how) in derived.items():
            rec.fields[name] = FieldValue(value, None, None, rec.fields["source_ref"].row, f"derived: {how}")
    return [{"name": n, "description": d, "formula": f or "code", "origin": "standard"} for n, (d, f) in STANDARD.items()]


def apply_suggestions(suggestions: list[dict], records: list[Record], df: pd.DataFrame, min_coverage: float = 0.5) -> list[dict]:
    """Validate and compute agent-proposed columns. Each result says accepted or why not."""
    known = set(settings.schema()) | set(STANDARD)
    out = []
    for s in suggestions:
        name = "x_" + "".join(c if c.isalnum() else "_" for c in s["name"].lower()).strip("_")
        res = {**s, "name": name, "origin": "transform-agent"}
        try:
            if name in known or name in {o["name"] for o in out if o.get("accepted")}:
                raise ValueError("a column with this name already exists")
            if s["kind"] == "source_column":
                col = s.get("column")
                if col not in df.columns:
                    raise ValueError(f"column {col!r} not in file")
                series = df[col].tolist()
                values = []
                for i in range(len(records)):
                    raw = series[records[i].fields["source_ref"].row - 2]
                    try:
                        v = (normalise.parse_rate(raw, s.get("unit") or "fraction")[0] if s.get("unit")
                             else normalise.parse_number(raw))
                    except (ValueError, TypeError):
                        v = None
                    values.append(v)
                how = f"source column '{col}'" + (f" ({s['unit']} -> fraction)" if s.get("unit") else "")
            else:
                tree = parse_formula(s["formula"], known | {o["name"] for o in out if o.get("accepted")})
                values = [evaluate(tree, _values(r)) for r in records]
                how = s["formula"]
            coverage = sum(v is not None for v in values) / max(len(values), 1)
            if coverage < min_coverage:
                raise ValueError(f"only {coverage:.0%} of funds get a value (need {min_coverage:.0%})")
            for rec, v in zip(records, values):
                rec.fields[name] = FieldValue(v, None, s.get("column"), rec.fields["source_ref"].row, f"derived: {how}")
            res.update(accepted=True, coverage=round(coverage, 3), formula=how)
        except ValueError as e:
            res.update(accepted=False, reason=str(e))
        out.append(res)
    return out
