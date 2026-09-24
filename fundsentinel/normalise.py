"""Unit and date normalisation. Pure code, no AI: every conversion returns the value plus a note of what changed."""

import re
from datetime import date, datetime

_NUM = r"[-+]?\d*\.?\d+"


def parse_rate(raw, unit: str = "auto", max_plausible: float | None = None):
    value, note = _parse_rate(raw, unit, max_plausible)
    return (None if value is None else round(value, 10)), note


def _parse_rate(raw, unit: str = "auto", max_plausible: float | None = None):
    """Convert a rate to a fraction. Returns (value, note).

    unit: "fraction" (0.0075), "percent" (0.75), "bps" (75), or "auto" (detect from text / magnitude).
    note is None when nothing needed changing, otherwise a short human-readable explanation.
    """
    if raw is None or (isinstance(raw, float) and raw != raw):
        return None, None
    text = str(raw).strip().lower().replace(",", "")
    if text in ("", "nan", "none", "null", "-", "n/a", "na"):
        return None, None

    m = re.fullmatch(rf"({_NUM})\s*(%|bps|bp|basis points?)?", text)
    if not m:
        raise ValueError(f"not a number: {raw!r}")
    num, suffix = float(m.group(1)), m.group(2)

    if suffix == "%":
        return num / 100, f"{raw} percent -> {num / 100:g}"
    if suffix in ("bps", "bp", "basis point", "basis points"):
        return num / 10000, f"{raw} basis points -> {num / 10000:g}"
    if unit == "fraction":
        return num, None
    if unit == "percent":
        return num / 100, f"{raw} percent -> {num / 100:g}"
    if unit == "bps":
        return num / 10000, f"{raw} basis points -> {num / 10000:g}"

    # auto: bare number. Fractions are the default; values too big to be a fraction are read as percent.
    if max_plausible is not None and abs(num) > max_plausible:
        return num / 100, f"{raw} too large for a fraction, read as percent -> {num / 100:g}"
    return num, None


_SUFFIX = {"k": 1e3, "m": 1e6, "mn": 1e6, "b": 1e9, "bn": 1e9, "t": 1e12}


def parse_number(raw):
    """Plain numbers plus money text: '$1.2B' -> 1.2e9, '350.4M' -> 3.504e8, '12,500' -> 12500."""
    if raw is None or (isinstance(raw, float) and raw != raw):
        return None
    if isinstance(raw, (int, float)):
        return float(raw)
    text = str(raw).strip().replace(",", "").replace(" ", "")
    if text.lower() in ("", "nan", "none", "null", "-", "n/a", "na"):
        return None
    text = text.lstrip("$€£₹¥")
    m = re.fullmatch(rf"({_NUM})([a-zA-Z]{{1,2}})?", text)
    if not m:
        raise ValueError(f"not a number: {raw!r}")
    num, suffix = float(m.group(1)), (m.group(2) or "").lower()
    if suffix and suffix not in _SUFFIX:
        raise ValueError(f"unknown number suffix in {raw!r}")
    return num * _SUFFIX.get(suffix, 1)


def parse_int(raw):
    v = parse_number(raw)
    return None if v is None else int(round(v))


def rescale(value: float, lo: float, hi: float, new_lo: int = 1, new_hi: int = 5) -> int:
    """Map a score from [lo, hi] onto [new_lo, new_hi], e.g. a 1-7 risk level onto 1-5."""
    return int(round(new_lo + (value - lo) * (new_hi - new_lo) / (hi - lo)))


_DATE_FORMATS = ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d.%m.%Y", "%Y/%m/%d", "%d-%m-%Y", "%b %d, %Y", "%d %b %Y")


def parse_date(raw, fmt: str | None = None) -> str | None:
    """Return ISO date string or None. Raises ValueError for unparseable non-empty input.
    fmt: explicit strptime format; needed for ambiguous dates like 03/10/2021."""
    if raw is None or (isinstance(raw, float) and raw != raw):
        return None
    if isinstance(raw, (date, datetime)):
        return raw.strftime("%Y-%m-%d")
    text = str(raw).strip()
    if text.lower() in ("", "nan", "none", "null", "-", "n/a"):
        return None
    text = text.split("T")[0].split(" ")[0] if re.match(r"\d{4}-\d{2}-\d{2}[T ]", text) else text
    for f in ([fmt] if fmt else _DATE_FORMATS):
        try:
            return datetime.strptime(text, f).strftime("%Y-%m-%d")
        except ValueError:
            continue
    raise ValueError(f"not a date: {raw!r}")


def years_between(start_iso: str | None, end_iso: str | None) -> float | None:
    if not start_iso or not end_iso:
        return None
    return (date.fromisoformat(end_iso) - date.fromisoformat(start_iso)).days / 365.25
