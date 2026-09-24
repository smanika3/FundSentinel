import { BedrockAgentCoreClient, InvokeAgentRuntimeCommand } from "@aws-sdk/client-bedrock-agentcore";
import { NextResponse } from "next/server";
import { REGION, RUNTIME_ARN, SAVED_MAPPINGS } from "@/lib/config";
import { describe } from "@/lib/errors";
import { sql } from "@/lib/db";

export const maxDuration = 60;
const client = new BedrockAgentCoreClient({ region: REGION });
// Runs started from the web are capped: a full review of a large file (the Yahoo file has 23,783 funds) would take days.
// Bigger runs go through the command line on purpose.
const MAX_FUNDS = 100;

/** Start a run on the AgentCore pipeline. It returns the run_id straight away and keeps working in the background. */
export async function POST(req: Request) {
  const b = await req.json();
  if (!b.source || typeof b.source !== "string") return NextResponse.json({ error: "Choose a file." }, { status: 400 });
  const payload: Record<string, unknown> = { source: b.source, async: true, workers: Number(b.workers ?? 3), supervisor: b.supervisor !== false };
  if (b.type === "update") {
    if (!b.baseline) return NextResponse.json({ error: "Choose the earlier run to compare with." }, { status: 400 });
    Object.assign(payload, { type: "update", baseline: b.baseline });
  }
  if (b.mapping && SAVED_MAPPINGS.includes(b.mapping)) payload.mapping = `config/mappings/${b.mapping}.json`;
  if (b.context) payload.context = String(b.context).slice(0, 500);
  if (Array.isArray(b.fund_ids) && b.fund_ids.length) payload.fund_ids = b.fund_ids.map(String).slice(0, MAX_FUNDS);
  else payload.limit = Math.min(MAX_FUNDS, Math.max(1, Number(b.limit) || MAX_FUNDS));
  try {
    const sessionId = `fundsentinel-web-${crypto.randomUUID()}`;
    const res = await client.send(new InvokeAgentRuntimeCommand({
      agentRuntimeArn: RUNTIME_ARN, runtimeSessionId: sessionId,
      payload: new TextEncoder().encode(JSON.stringify(payload)), contentType: "application/json", accept: "application/json",
    }));
    const text = await (res.response as any).transformToString();
    const out = JSON.parse(text);
    if (out.error) return NextResponse.json({ error: out.error }, { status: 400 });
    // Remember the cloud session so the run can be stopped from the app.
    await sql(`UPDATE run_progress SET session_id = :s WHERE run_id = :r`, { s: sessionId, r: out.run_id });
    return NextResponse.json(out);
  } catch (e) {
    const d = describe(e);
    return NextResponse.json({ error: d === "login" ? "login" : d }, { status: d === "login" ? 401 : 500 });
  }
}
