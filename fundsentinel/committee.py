"""Stage 2 for one fund: Supervisor routes the reviewers, Evidence checker (code + Opus) sends back unproven verdicts,
code guardrails make sure nothing required is skipped, then the Decision owner decides.
Every step is logged as a review event."""

import json
import threading
import time
from typing import Literal

from pydantic import BaseModel, Field
from strands import Agent, tool
from strands.models import BedrockModel

from . import evidence, settings
from .agents import common, decision
from .mapping import Record
from .verdict import Verdict

REVIEWER_NAMES = ["analyst", "compliance", "finance", "suitability"]
MAX_SUPERVISOR_SEND_BACKS = 2


# ---------------- Evidence checker, AI half ----------------

class Support(BaseModel):
    reviewer: Literal["analyst", "compliance", "finance", "suitability"]
    supported: bool = Field(description="True if the verdict and its reason follow from the evidence listed")
    note: str = Field(description="If not supported: exactly what is missing or contradictory, as an instruction to the reviewer")


class SupportCheck(BaseModel):
    checks: list[Support]


EVIDENCE_PROMPT = """You are the Evidence checker on a mock fund-approval committee. "No proof, no pass."
For each reviewer verdict you are given its reason and its evidence list. Decide whether the verdict and the claims in the
reason are supported by the evidence listed (numbers cited in the reason must appear in the evidence; a 'fail' must cite
the rule it breaks; a 'pass' must cite the values that were checked). Code has already confirmed the evidence values are
real, so judge only whether the reasoning follows.
Mark a verdict unsupported ONLY if its outcome or a specific claim in its reason has no backing in the evidence, or the evidence
points the other way. Do NOT send back for missing detail, style, or evidence you would merely have liked to see.
If you would describe the verdict as holding, it is supported. cannot_assess verdicts are supported if they say what is missing.
A concern that rests on a cited data_quality_flag (field "data_quality_flag") is supported by that flag."""


def build_evidence_agent() -> Agent:
    return Agent(model=BedrockModel(model_id=settings.models()["opus"], boto_session=settings.session(), max_tokens=8000),
                 system_prompt=EVIDENCE_PROMPT, structured_output_model=SupportCheck, callback_handler=None,
                 name="evidence_checker")


# ---------------- Supervisor ----------------

class SupervisorReport(BaseModel):
    routing: str = Field(description="One or two sentences: who you called, in what order, and why")
    conflicts: list[str] = Field(default_factory=list, description="Real conflicts between reviewers you found, if any")
    skipped: list[str] = Field(default_factory=list, description="Reviewers you chose not to call, each with the reason")


SUPERVISOR_PROMPT = f"""You are the Supervisor (panel chair) of a mock fund-approval committee (internal decision support).
Reviewers: analyst (performance), compliance (hard policy rules), finance (fees), suitability (investor fit).
Call them with run_reviewer. You decide the order and who to call:
- compliance is mandatory. A compliance fail means certain rejection, so after one you may skip the others to save time.
- Call reviewers in parallel when their work is independent.
- Read the answers. If two reviewers rely on facts that contradict each other (e.g. compliance says the category looks wrong
  but the analyst compared performance against that category; or suitability passes a risk level the analyst calls implausible),
  send the affected reviewer back with run_reviewer and a specific question. At most {MAX_SUPERVISOR_SEND_BACKS} send-backs per fund.
- Only send back on real, conflicting evidence, never to change an answer you merely dislike.
- If the data carries quality flags, make sure the reviewers who depend on those fields have considered them.
You do not decide the outcome; the Decision owner does. Finish with a short report."""


class FundReview:
    """All state for reviewing one fund."""

    def __init__(self, fund_id: str, record: Record, reviewers: dict[str, Agent]):
        self.fund_id, self.record, self.reviewers = fund_id, record, reviewers
        self.verdicts: dict[str, Verdict] = {}
        self.evidence_status: dict[str, dict] = {}
        self.events: list[dict] = []
        self.supervisor_send_backs = 0
        self.locks = {n: threading.Lock() for n in reviewers}

    def log(self, actor: str, event: str, reviewer: str | None = None, detail: str = ""):
        self.events.append({"seq": len(self.events) + 1, "t": round(time.time(), 2), "actor": actor, "event": event,
                            "reviewer": reviewer, "detail": detail})

    def run_reviewer(self, name: str, note: str = "", requested_by: str = "supervisor") -> Verdict:
        """Run one reviewer, then the code evidence check; one automatic send-back if the evidence is not grounded."""
        with self.locks[name]:
            self.log(requested_by, "sent_back" if name in self.verdicts else "called", name, note)
            v, vals = common.safe_review(self.reviewers[name], self.fund_id, note=note, traced=True)
            problems = evidence.check(v, vals, self.record)
            attempts = 1
            if problems:
                self.log("evidence_checker", "sent_back", name, "; ".join(problems))
                fix_note = ("The Evidence checker sent your verdict back: " + "; ".join(problems) +
                            ". Cite only values exactly as your tools returned them, with their source_ref.")
                v, vals = common.safe_review(self.reviewers[name], self.fund_id,
                                             note=(note + " " + fix_note).strip(), traced=True)
                problems = evidence.check(v, vals, self.record)
                attempts = 2
            self.verdicts[name] = v
            self.evidence_status[name] = {"ok": not problems, "problems": problems, "attempts": attempts}
            self.log(name, "verdict", name, f"{v.verdict}: {v.reason}")
            if problems:
                self.log("evidence_checker", "unverified", name, "; ".join(problems))
            return v


def build_supervisor(fr: FundReview) -> Agent:
    @tool
    def get_fund_snapshot() -> dict:
        """Key facts and data-quality flags for the fund under review."""
        r = fr.record
        return {"fund_id": fr.fund_id, "fund_name": r.get("fund_name"), "category": r.get("category"),
                "expense_ratio": r.get("expense_ratio"), "risk_score": r.get("risk_score"),
                "total_net_assets": r.get("total_net_assets"), "currency": r.get("currency"),
                "data_quality_flags": [f["detail"] for f in r.flags]}

    @tool
    def run_reviewer(reviewer: str, question: str = "") -> dict:
        """Run a reviewer (analyst, compliance, finance, suitability) on this fund. On a first call `question` is an
        optional briefing. Calling a reviewer again is a send-back: `question` must say exactly what to reconsider."""
        if reviewer not in fr.reviewers:
            return {"error": f"unknown reviewer {reviewer}; choose from {REVIEWER_NAMES}"}
        if reviewer in fr.verdicts:
            if fr.supervisor_send_backs >= MAX_SUPERVISOR_SEND_BACKS:
                return {"error": "send-back limit reached for this fund; finish your report"}
            if not question:
                return {"error": "a send-back needs a specific question"}
            fr.supervisor_send_backs += 1
        v = fr.run_reviewer(reviewer, note=f"The Supervisor says: {question}" if question else "")
        st = fr.evidence_status[reviewer]
        return {"reviewer": reviewer, "verdict": v.verdict, "reason": v.reason,
                "evidence": [e.model_dump() for e in v.evidence], "evidence_verified": st["ok"],
                "evidence_problems": st["problems"]}

    model = BedrockModel(model_id=settings.models()["opus"], boto_session=settings.session(), max_tokens=4000)
    return Agent(model=model, system_prompt=SUPERVISOR_PROMPT, tools=[get_fund_snapshot, run_reviewer],
                 structured_output_model=SupervisorReport, callback_handler=None, name="supervisor")


def ai_evidence_check(fr: "FundReview", only: set[str] | None = None):
    """Evidence checker, AI half: does each reasoning follow from its evidence? One send-back each."""
    try:
        ev_agent = build_evidence_agent()
        payload = [{"reviewer": v.reviewer, "verdict": v.verdict, "reason": v.reason,
                    "evidence": [e.model_dump() for e in v.evidence]}
                   for n, v in fr.verdicts.items() if only is None or n in only]
        if not payload:
            return
        checks = ev_agent("Check these verdicts:\n" + json.dumps(payload, default=str)).structured_output.checks
        for c in checks:
            if not c.supported and c.reviewer in fr.verdicts and (only is None or c.reviewer in only):
                fr.run_reviewer(c.reviewer, note=f"The Evidence checker says your reasoning is not supported: {c.note}",
                                requested_by="evidence_checker")
    except Exception as e:
        if common.is_auth_error(e):
            raise common.LoginExpired("AWS login expired. Run: aws login --profile fundsentinel") from e
        fr.log("evidence_checker", "error", None, f"{type(e).__name__}: AI evidence check skipped")


# ---------------- One fund, end to end ----------------

def review_fund(fund_id: str, record: Record, reviewers: dict[str, Agent], owner: Agent,
                use_supervisor: bool = True) -> dict:
    fr = FundReview(fund_id, record, reviewers)
    sup_report = None
    if use_supervisor:
        try:
            sup = build_supervisor(fr)
            sup_report = sup(f"Review fund_id={fund_id}. Start with get_fund_snapshot.").structured_output.model_dump()
            fr.log("supervisor", "report", None, sup_report["routing"])
        except Exception as e:
            if common.is_auth_error(e):
                raise common.LoginExpired("AWS login expired. Run: aws login --profile fundsentinel") from e
            fr.log("supervisor", "error", None, f"{type(e).__name__}: falling back to fixed routing")
    else:
        from concurrent.futures import ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=4) as pool:
            list(pool.map(lambda n: fr.run_reviewer(n, requested_by="orchestrator"), REVIEWER_NAMES))

    # Guardrails: compliance is mandatory; others may be skipped only after a compliance fail.
    if "compliance" not in fr.verdicts:
        fr.run_reviewer("compliance", requested_by="guardrail")
    if fr.verdicts["compliance"].verdict != "fail":
        for n in REVIEWER_NAMES:
            if n not in fr.verdicts:
                fr.run_reviewer(n, requested_by="guardrail")
    else:
        for n in REVIEWER_NAMES:
            if n not in fr.verdicts:
                fr.log("supervisor", "skipped", n, "Compliance failed, so the fund is rejected regardless.")

    ai_evidence_check(fr)

    verdicts = [fr.verdicts[n] for n in REVIEWER_NAMES if n in fr.verdicts]
    try:
        dec = decision.decide(owner, fund_id, verdicts, fr.evidence_status)
    except Exception as e:
        if common.is_auth_error(e):
            raise common.LoginExpired("AWS login expired. Run: aws login --profile fundsentinel") from e
        dec = decision.Decision(fund_id=fund_id, decision="flagged_for_review", decided_by="rule",
                                rule_applied="decision_owner_error",
                                reason=f"The Decision owner could not run ({type(e).__name__}); flagged for a re-run.")
    fr.log("decision_owner", "decided", None, f"{dec.decision}: {dec.reason}")
    return {"verdicts": verdicts, "decision": dec, "events": fr.events, "evidence_status": fr.evidence_status,
            "supervisor": sup_report}
