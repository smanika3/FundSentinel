import { BedrockAgentCoreClient, StopRuntimeSessionCommand } from "@aws-sdk/client-bedrock-agentcore";
import { NextResponse } from "next/server";
import { REGION, RUNTIME_ARN } from "@/lib/config";
import { sql } from "@/lib/db";
import { describe } from "@/lib/errors";

const client = new BedrockAgentCoreClient({ region: REGION });

/** Stop a run started from the web app: end its AgentCore session and mark it stopped. */
export async function POST(req: Request) {
  const { run } = await req.json().catch(() => ({}));
  if (!run || typeof run !== "string") return NextResponse.json({ error: "run is required" }, { status: 400 });
  try {
    const [p] = await sql(`SELECT status, session_id, done FROM run_progress WHERE run_id = :r`, { r: run });
    if (!p) return NextResponse.json({ error: "No progress recorded for this run." }, { status: 404 });
    if (p.status !== "running") return NextResponse.json({ status: p.status });
    if (!p.session_id) return NextResponse.json({ error: "This run wasn't started from the app, so it can't be stopped here." }, { status: 409 });
    await client.send(new StopRuntimeSessionCommand({ agentRuntimeArn: RUNTIME_ARN, runtimeSessionId: p.session_id }));
    await sql(`UPDATE run_progress SET status = 'stopped', error = :e, updated_at = now() WHERE run_id = :r AND status = 'running'`,
      { r: run, e: `Stopped from the app after ${p.done ?? 0} fund(s) had finished.` });
    return NextResponse.json({ status: "stopped" });
  } catch (e) {
    const d = describe(e);
    return NextResponse.json({ error: d }, { status: d === "login" ? 401 : 500 });
  }
}
