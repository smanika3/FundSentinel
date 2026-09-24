import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { getRun } from "@/lib/views";

export default async function FirstFund({ params }: { params: Promise<{ run: string }> }) {
  await connection();
  const { run: runId } = await params;
  const run = await getRun(decodeURIComponent(runId));
  if (!run || !run.funds_.length) notFound();
  redirect(`/runs/${runId}/funds/${encodeURIComponent(run.funds_[0].ticker)}`);
}
