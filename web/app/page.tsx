import { redirect } from "next/navigation";
import { connection } from "next/server";
import { listRuns } from "@/lib/views";

export default async function Home() {
  await connection();
  let first: string | undefined;
  try { first = (await listRuns())[0]?.id; } catch { /* the layout shows the error */ }
  redirect(first ? `/runs/${encodeURIComponent(first)}` : "/run");
}
