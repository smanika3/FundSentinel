"""Column mappings: code-check an (AI-proposed) mapping, then apply it with field-level provenance.

Mapping format (config/mappings/<source>.json, or produced by the Profiler agent):
{
  "source": "yahoo_us/MutualFunds.csv",
  "fields": {
    "expense_ratio": {"column": "fund_annual_report_net_expense_ratio", "unit": "fraction", "confidence": 0.97},
    "risk_score":    {"column": "morningstar_risk_rating", "scale": [1, 5], "confidence": 0.9},
    "currency":      {"constant": "USD", "confidence": 1.0}
  }
}
"""

from dataclasses import asdict, dataclass, field

import pandas as pd

from . import normalise, settings

MIN_PARSE_RATE = 0.8     # at least 80% of non-empty sample values must parse
MIN_IN_RANGE_RATE = 0.9  # at least 90% of parsed values must fall inside the schema range


@dataclass
class FieldCheck:
    field: str
    column: str | None
    confidence: float | None
    accepted: bool
    reason: str
    parse_rate: float | None = None
    in_range_rate: float | None = None


@dataclass
class FieldValue:
    value: object
    raw: object
    column: str | None
    row: int
    transform: str | None = None


@dataclass
class Record:
    fund_id: str | None
    fields: dict[str, FieldValue] = field(default_factory=dict)
    issues: list[str] = field(default_factory=list)

    def get(self, name):
        fv = self.fields.get(name)
        return None if fv is None else fv.value

    def to_dict(self):
        return {"fund_id": self.fund_id, "fields": {k: asdict(v) for k, v in self.fields.items()}, "issues": self.issues}


def _convert(spec: dict, ftype: dict, raw):
    """Returns (value, note). Raises ValueError if the raw value can't be converted."""
    t = ftype["type"]
    if t == "rate":
        return normalise.parse_rate(raw, spec.get("unit", "auto"), max_plausible=ftype.get("max"))
    if t == "int":
        note = None
        if "value_map" in spec and raw is not None and str(raw).strip() != "" and raw == raw:
            key = str(raw).strip()
            lookup = {str(k).strip().lower(): v for k, v in spec["value_map"].items()}
            if key.lower() not in lookup:
                raise ValueError(f"{raw!r} not in value_map")
            v, note = float(lookup[key.lower()]), f"{raw!r} -> {lookup[key.lower()]:g} via value_map"
        else:
            v = normalise.parse_number(raw)
        if v is None:
            return None, None
        if "scale" in spec:
            lo, hi = spec["scale"]
            if (lo, hi) != (ftype.get("min"), ftype.get("max")):
                new = normalise.rescale(v, lo, hi, ftype["min"], ftype["max"])
                return new, f"{raw} on {lo}-{hi} scale -> {new} on {ftype['min']}-{ftype['max']}"
        return int(round(v)), note
    if t == "number":
        v = normalise.parse_number(raw)
        mult = spec.get("multiplier")
        if v is not None and mult:
            return v * mult, f"{raw} x {mult:g}"
        text_input = isinstance(raw, str) and raw.strip() != "" and v is not None
        return v, (f"{raw} -> {v:g}" if text_input and str(raw).strip() != f"{v:g}" else None)
    if t == "date":
        return normalise.parse_date(raw, spec.get("date_format")), None
    if raw is None or (isinstance(raw, float) and raw != raw) or str(raw).strip() == "":
        return None, None
    return str(raw).strip(), None


def _in_range(ftype: dict, v) -> bool:
    if not isinstance(v, (int, float)):
        return True
    return ftype.get("min", float("-inf")) <= v <= ftype.get("max", float("inf"))


def validate_mapping(mapping: dict, df: pd.DataFrame, sample: int = 500) -> list[FieldCheck]:
    """Code check for every proposed field mapping: column exists, values parse, values fall in range."""
    schema = settings.schema()
    rows = df.head(sample)
    checks = []
    for name, spec in mapping["fields"].items():
        conf = spec.get("confidence")
        if name not in schema:
            checks.append(FieldCheck(name, spec.get("column"), conf, False, "not a canonical field"))
            continue
        if "constant" in spec:
            checks.append(FieldCheck(name, None, conf, True, f"constant {spec['constant']!r}"))
            continue
        col = spec.get("column")
        if col not in df.columns:
            checks.append(FieldCheck(name, col, conf, False, f"column {col!r} not in file"))
            continue
        ftype = schema[name]
        values = [v for v in rows[col].tolist() if not (v is None or (isinstance(v, float) and v != v) or str(v).strip() == "")]
        if not values:
            checks.append(FieldCheck(name, col, conf, False, "column is empty in sample"))
            continue
        parsed, failed = [], 0
        for v in values:
            try:
                parsed.append(_convert(spec, ftype, v)[0])
            except (ValueError, TypeError):
                failed += 1
        parse_rate = 1 - failed / len(values)
        in_range = sum(_in_range(ftype, p) for p in parsed) / len(parsed) if parsed else 0.0
        ok = parse_rate >= MIN_PARSE_RATE and in_range >= MIN_IN_RANGE_RATE
        reason = "ok" if ok else (
            f"only {parse_rate:.0%} of values parse as {ftype['type']}" if parse_rate < MIN_PARSE_RATE
            else f"only {in_range:.0%} of values inside {ftype.get('min')}..{ftype.get('max')} (wrong unit?)")
        checks.append(FieldCheck(name, col, conf, ok, reason, round(parse_rate, 3), round(in_range, 3)))
    return checks


def apply_mapping(mapping: dict, df: pd.DataFrame, checks: list[FieldCheck], source_name: str) -> list[Record]:
    """Build canonical records from accepted field mappings, keeping raw + normalised values per field."""
    schema = settings.schema()
    accepted = {c.field for c in checks if c.accepted}
    records = []
    for i, row in enumerate(df.to_dict("records")):
        rownum = i + 2  # +1 for header, +1 for 1-based rows, so it matches the line in a spreadsheet
        rec = Record(fund_id=None)
        for name in accepted:
            spec, ftype = mapping["fields"][name], schema[name]
            if "constant" in spec:
                rec.fields[name] = FieldValue(spec["constant"], None, None, rownum, "constant")
                continue
            raw = row.get(spec["column"])
            try:
                value, note = _convert(spec, ftype, raw)
            except (ValueError, TypeError) as e:
                rec.issues.append(f"{name}: could not read {raw!r} ({e})")
                value, note = None, None
            if value is not None and not _in_range(ftype, value):
                rec.issues.append(f"{name}: {value!r} outside {ftype.get('min')}..{ftype.get('max')}")
            rec.fields[name] = FieldValue(value, None if raw != raw else raw, spec["column"], rownum, note)
        rec.fields["source_ref"] = FieldValue(f"{source_name}#row{rownum}", None, None, rownum, "generated")
        rec.fund_id = rec.get("fund_id")
        for name, ftype in schema.items():
            if ftype.get("required") and rec.get(name) is None:
                rec.issues.append(f"{name}: missing (required)")
        records.append(rec)
    return records
