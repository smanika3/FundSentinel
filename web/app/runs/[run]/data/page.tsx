import { notFound } from "next/navigation";
import { connection } from "next/server";
import { DataClient } from "@/components/screens/Client";
import { getData, getRun } from "@/lib/views";

export default async function DataPage({ params }: { params: Promise<{ run: string }> }) {
  await connection();
  const { run: r } = await params;
  const runId = decodeURIComponent(r);
  const [run, data] = await Promise.all([getRun(runId), getData(runId)]);
  if (!run) notFound();
  return <DataClient run={run} data={data} />;
}
