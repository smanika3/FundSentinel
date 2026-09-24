import { NextResponse } from "next/server";
import { json, sql } from "@/lib/db";
import { describe } from "@/lib/errors";

export async function GET(req: Request) {
  const run = new URL(req.url).searchParams.get("run");
  if (!run) return NextResponse.json({ error: "run is required" }, { status: 400 });
  try {
    const [p] = await sql(`SELECT status, step, done, total, lines, file, run_type, detail, error,
                                  extract(epoch from ((CASE WHEN status = 'running' THEN now() ELSE updated_at END) - started_at)) AS elapsed FROM run_progress WHERE run_id = :r`, { r: run });
    if (!p) return NextResponse.json({ status: "unknown" });
    return NextResponse.json({ ...p, lines: json(p.lines, []), elapsed: Math.round(Number(p.elapsed)) });
  } catch (e) {
    const d = describe(e);
    return NextResponse.json({ error: d }, { status: d === "login" ? 401 : 500 });
  }
}
