import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ResultsClient } from "@/components/screens/Client";
import { getRun } from "@/lib/views";

export default async function ResultsPage({ params }: { params: Promise<{ run: string }> }) {
  await connection();
  const { run: runId } = await params;
  const run = await getRun(decodeURIComponent(runId));
  if (!run) notFound();
  return <ResultsClient run={run} />;
}
