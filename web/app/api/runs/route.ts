import { BedrockAgentCoreClient, InvokeAgentRuntimeCommand } from "@aws-sdk/client-bedrock-agentcore";
import { NextResponse } from "next/server";
import { REGION, RUNTIME_ARN, SAVED_MAPPINGS } from "@/lib/config";
import { describe } from "@/lib/errors";

export const maxDuration = 60;
const client = new BedrockAgentCoreClient({ region: REGION });

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
  if (b.limit) payload.limit = Math.max(1, Number(b.limit));
  if (Array.isArray(b.fund_ids) && b.fund_ids.length) payload.fund_ids = b.fund_ids.map(String).slice(0, 200);
  try {
    const res = await client.send(new InvokeAgentRuntimeCommand({
      agentRuntimeArn: RUNTIME_ARN, runtimeSessionId: `fundsentinel-web-${crypto.randomUUID()}`,
      payload: new TextEncoder().encode(JSON.stringify(payload)), contentType: "application/json", accept: "application/json",
    }));
    const text = await (res.response as any).transformToString();
    const out = JSON.parse(text);
    if (out.error) return NextResponse.json({ error: out.error }, { status: 400 });
    return NextResponse.json(out);
  } catch (e) {
    const d = describe(e);
    return NextResponse.json({ error: d === "login" ? "login" : d }, { status: d === "login" ? 401 : 500 });
  }
}
