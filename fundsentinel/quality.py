"""Quality checks (pure code) and applying SelfHeal decisions with guardrails.

Every problem becomes an Issue. Unambiguous ones get an automatic action here (decided_by="rule"):
  exact duplicate row -> drop; missing identifier or required field -> quarantine;
  duplicate identifier -> rename + flag; unreadable / impossible dates / shared names / unknown tickers -> flag.
Ambiguous ones (likely typos, out-of-range or implausible numbers) are left for the SelfHeal agent.
"""

import difflib
import json
import re
from dataclasses import asdict, dataclass, field
from datetime import date
from functools import lru_cache
from pathlib import Path

import pandas as pd

from . import settings
from .mapping import FieldValue, Record, _in_range

# In range but suspicious enough to ask SelfHeal about.
IMPLAUSIBLE = {"expense_ratio": ("above", 0.03), "return_1y": ("above", 1.0),
               "return_3y": ("above", 0.5), "return_5y": ("above", 0.4)}
AMBIGUOUS_KINDS = {"category_typo", "out_of_range", "implausible_value"}


@dataclass
class Issue:
    issue_id: str
    fund_id: str | None
    row: int
    field: str
    kind: str
    detail: str
    raw: object = None
    value: object = None
    candidates: list = field(default_factory=list)
    action: str | None = None        # drop | fix | flag | quarantine
    new_value: object = None
    confidence: float | None = None
    decided_by: str | None = None    # rule | selfheal | guardrail
    reason: str | None = None


# ---------- reference data ----------

@lru_cache
def category_vocab() -> tuple[set[str], set[str]]:
    cats = set(json.loads((settings.CONFIG / "reference" / "categories.json").read_text())["categories"])
    words = {w.lower() for c in cats for w in re.findall(r"[A-Za-z]+", c) if len(w) > 2}
    return cats, words


@lru_cache
def sec_tickers() -> set[str] | None:
    """SEC mutual fund ticker list, from the local copy or S3. None if unavailable (check is skipped)."""
    local = settings.ROOT / "data" / "raw" / "sec" / "company_tickers_mf.json"
    try:
        if not local.exists():
            local = Path("/tmp/fundsentinel/company_tickers_mf.json")
            if not local.exists():
                local.parent.mkdir(parents=True, exist_ok=True)
                settings.session().client("s3").download_file(settings.aws()["bucket"], "raw/sec/company_tickers_mf.json", str(local))
        data = json.loads(local.read_text())
        return {row[3].upper() for row in data["data"] if row[3]}
    except Exception:
        return None


def category_candidates(value: str) -> list[str]:
    """Word-level spelling check against the reference vocabulary: 'World Alloction' -> ['World Allocation']."""
    cats, words = category_vocab()
    if not value or value in cats:
        return []
    fixed, changed = [], False
    for tok in re.split(r"(\W+)", value):
        if re.fullmatch(r"[A-Za-z]{3,}", tok) and tok.lower() not in words:
            m = difflib.get_close_matches(tok.lower(), words, n=1, cutoff=0.8)
            if m:
                tok, changed = m[0].title() if tok[0].isupper() else m[0], True
        fixed.append(tok)
    out = []
    if changed:
        guess = "".join(fixed)
        exact = [c for c in cats if c.lower() == guess.lower()]
        out.append(exact[0] if exact else guess)
    out += [c for c in difflib.get_close_matches(value, cats, n=2, cutoff=0.85) if c not in out]
    return out


# ---------- detection ----------

def detect(df: pd.DataFrame, records: list[Record]) -> list[Issue]:
    schema = settings.schema()
    issues: list[Issue] = []

    def add(rec, rownum, fname, kind, detail, **kw):
        issues.append(Issue(f"Q{len(issues) + 1:04d}", rec.fund_id if rec else None, rownum, fname, kind, detail, **kw))

    critical = set(settings.policy().get("data_quality", {}).get("quarantine_if_missing", ["fund_id", "expense_ratio"]))
    dup_rows = df.duplicated(keep="first").tolist()
    seen_ids: dict[str, int] = {}
    names: dict[str, set] = {}
    tickers = sec_tickers()
    today = date.today().isoformat()

    for i, rec in enumerate(records):
        rownum = i + 2
        if dup_rows[i]:
            add(rec, rownum, "*", "duplicate_row", "Exact copy of an earlier row", action="drop", decided_by="rule",
                confidence=1.0, reason="Identical row already loaded; keeping the first copy.")
            continue
        if rec.fund_id is None:
            rec.fund_id = f"row{rownum}"
            add(rec, rownum, "fund_id", "missing_required", "No fund identifier", action="quarantine",
                decided_by="rule", confidence=1.0, reason="Cannot check a fund we cannot identify.")
            continue
        if rec.fund_id in seen_ids:
            old = rec.fund_id
            rec.fund_id = f"{old}~row{rownum}"
            rec.fields["fund_id"].value = rec.fund_id
            add(rec, rownum, "fund_id", "duplicate_id",
                f"Identifier '{old}' also used on row {seen_ids[old]} with different data; renamed to '{rec.fund_id}'",
                raw=old, action="flag", decided_by="rule", confidence=1.0,
                reason="Two different rows share an identifier; both kept and flagged.")
        seen_ids.setdefault(rec.fund_id.split("~")[0], rownum)

        for fname, ftype in schema.items():
            fv = rec.fields.get(fname)
            if fv is None:
                if ftype.get("required") and fname != "source_ref":
                    act = "quarantine" if fname in critical else "flag"
                    add(rec, rownum, fname, "missing_required", f"{fname} is not in the file", action=act,
                        decided_by="rule", confidence=1.0, reason=f"Cannot check: {fname} missing.")
                continue
            raw_empty = fv.raw is None or str(fv.raw).strip() == "" or fv.raw != fv.raw
            if fv.value is None and not raw_empty:
                act = "quarantine" if fname in critical else "flag"
                add(rec, rownum, fname, "unreadable", f"{fname} value {fv.raw!r} could not be read", raw=fv.raw,
                    action=act, decided_by="rule", confidence=1.0,
                    reason=f"Unreadable {'required ' if act == 'quarantine' else ''}value.")
            elif fv.value is None and ftype.get("required"):
                act = "quarantine" if fname in critical else "flag"
                add(rec, rownum, fname, "missing_required", f"{fname} is empty", action=act,
                    decided_by="rule", confidence=1.0, reason=f"Cannot check: {fname} missing.")
            elif fv.value is not None and not _in_range(ftype, fv.value):
                cands = []
                if ftype["type"] == "rate":
                    cands = [round(fv.value / d, 6) for d in (10, 100) if _in_range(ftype, fv.value / d)]
                add(rec, rownum, fname, "out_of_range",
                    f"{fname} = {fv.value!r} (from {fv.raw!r}) is outside {ftype.get('min')}..{ftype.get('max')}",
                    raw=fv.raw, value=fv.value, candidates=cands)
            elif fname in IMPLAUSIBLE and fv.value is not None:
                _, limit = IMPLAUSIBLE[fname]
                if fv.value > limit:
                    add(rec, rownum, fname, "implausible_value", f"{fname} = {fv.value!r} (from {fv.raw!r}) is unusually high",
                        raw=fv.raw, value=fv.value, candidates=[round(fv.value / 10, 6)] if fname == "expense_ratio" else [])

        cat = rec.get("category")
        if cat:
            cands = category_candidates(cat)
            if cands:
                add(rec, rownum, "category", "category_typo", f"Category '{cat}' looks misspelled",
                    raw=cat, value=cat, candidates=cands)

        inc, asof = rec.get("inception_date"), rec.get("as_of_date")
        if inc and (inc > today or (asof and inc > asof)):
            add(rec, rownum, "inception_date", "impossible_date", f"Launch date {inc} is after the as-of date {asof}",
                raw=inc, action="flag", decided_by="rule", confidence=1.0, reason="A fund cannot launch after its data date.")

        name = rec.get("fund_name")
        if name:
            names.setdefault(name, {})[rec.fund_id] = (rec, rownum)

        tk = rec.get("ticker")
        if tickers and tk and (rec.get("currency") or "USD") == "USD" and str(tk).upper() not in tickers:
            add(rec, rownum, "ticker", "ticker_unknown", f"Ticker {tk} is not in the SEC mutual fund ticker list",
                raw=tk, action="flag", decided_by="rule", confidence=0.6,
                reason="Could be an ETF, a closed share class, or a wrong ticker.")

    for name, owners in names.items():
        if len(owners) > 1:
            for fid, (rec, rownum) in sorted(owners.items()):
                others = sorted(set(owners) - {fid})
                add(rec, rownum, "fund_name", "shared_name",
                    f"Name '{name}' is also used by {len(others)} other identifier(s): {', '.join(others)[:120]}",
                    raw=name, action="flag", decided_by="rule", confidence=0.5,
                    reason="A share-class name should belong to one fund, so at least one of these rows is probably "
                           "mislabelled; this row may be the correct one.")
    return issues


# ---------- applying decisions ----------

def validate_fix(issue: Issue, value) -> str | None:
    """Guardrail: returns an error string if SelfHeal's proposed value is not allowed."""
    ftype = settings.schema().get(issue.field, {})
    if issue.kind == "category_typo":
        return None if value in issue.candidates else f"{value!r} is not one of the code-suggested candidates"
    try:
        v = float(value)
    except (TypeError, ValueError):
        return f"{value!r} is not a number"
    if not _in_range(ftype, v):
        return f"{v} is still outside {ftype.get('min')}..{ftype.get('max')}"
    if issue.candidates and not any(abs(v - c) < 1e-9 for c in issue.candidates):
        return f"{v} is not one of the code-computed candidates {issue.candidates}"
    return None


def apply(records: list[Record], issues: list[Issue]) -> list[Record]:
    """Apply decided actions to records. Returns the records that remain (drops removed)."""
    by_row = {i + 2: r for i, r in enumerate(records)}
    dropped = set()
    for iss in issues:
        rec = by_row.get(iss.row)
        if rec is None or iss.action is None:
            continue
        if iss.action == "drop":
            dropped.add(id(rec))
            continue
        if iss.action == "fix" and iss.new_value is None:
            if len(iss.candidates) == 1:
                iss.new_value = iss.candidates[0]
            else:
                iss.action, iss.decided_by = "flag", "guardrail"
                iss.reason = f"Fix proposed without a value; flagged instead. {iss.reason or ''}".strip()
        if iss.action == "fix" and iss.new_value is not None:
            err = validate_fix(iss, iss.new_value)
            if err:
                iss.action, iss.decided_by = "flag", "guardrail"
                iss.reason = f"Proposed fix rejected by code ({err}); flagged instead. {iss.reason or ''}".strip()
            else:
                fv = rec.fields[iss.field]
                old = fv.value
                fv.value = iss.new_value if iss.kind == "category_typo" else float(iss.new_value)
                fv.transform = f"SelfHeal fix {old!r} -> {fv.value!r} ({iss.confidence:.0%} sure): {iss.reason}"
                continue
        if iss.action == "flag":
            if iss.new_value is not None and iss.field in rec.fields and not validate_fix(iss, iss.new_value):
                fv = rec.fields[iss.field]
                old = fv.value
                fv.value = iss.new_value if iss.kind == "category_typo" else float(iss.new_value)
                fv.transform = f"SelfHeal best guess {old!r} -> {fv.value!r} ({iss.confidence:.0%} sure), needs review"
            rec.flags.append({"field": iss.field, "kind": iss.kind, "detail": f"{iss.detail}. {iss.reason or ''}".strip(),
                              "issue_id": iss.issue_id})
            if rec.status == "ok":
                rec.status = "flagged"
        elif iss.action == "quarantine":
            rec.status = "quarantined"
            rec.quarantine_reason = "; ".join(filter(None, [rec.quarantine_reason, iss.reason]))
    return [r for r in records if id(r) not in dropped]


def summary(issues: list[Issue], records: list[Record]) -> dict:
    kinds = pd.Series([i.kind for i in issues]).value_counts().to_dict() if issues else {}
    actions = pd.Series([i.action or "undecided" for i in issues]).value_counts().to_dict() if issues else {}
    return {"records": len(records), "issues": len(issues), "by_kind": kinds, "by_action": actions,
            "quarantined": sum(r.status == "quarantined" for r in records),
            "flagged": sum(r.status == "flagged" for r in records)}


def to_rows(issues: list[Issue]) -> list[dict]:
    return [asdict(i) for i in issues]
