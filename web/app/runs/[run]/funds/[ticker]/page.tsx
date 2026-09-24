import { notFound } from "next/navigation";
import { connection } from "next/server";
import { FundClient } from "@/components/screens/Client";
import { getFund, getRun } from "@/lib/views";

export default async function FundPage({ params, searchParams }: {
  params: Promise<{ run: string; ticker: string }>; searchParams: Promise<{ src?: string }>;
}) {
  await connection();
  const { run: r, ticker: t } = await params;
  const { src } = await searchParams;
  const runId = decodeURIComponent(r), ticker = decodeURIComponent(t);
  const [run, detail] = await Promise.all([getRun(runId), getFund(runId, ticker)]);
  if (!run || !detail) notFound();
  return <FundClient run={run} ticker={ticker} src={src ?? null} detail={detail} />;
}
