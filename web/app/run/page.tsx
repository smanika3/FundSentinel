import { connection } from "next/server";
import RunScreen from "@/components/screens/RunScreen";
import { listRuns, type RunSummary } from "@/lib/views";

export default async function RunPage() {
  await connection();
  let runs: RunSummary[] = [];
  try { runs = await listRuns(); } catch { /* the layout shows the error */ }
  return <RunScreen runs={runs} />;
}
