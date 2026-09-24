import type { Metadata } from "next";
import { connection } from "next/server";
import AppShell from "@/components/AppShell";
import { listRuns, type RunSummary } from "@/lib/views";
import { describe } from "@/lib/errors";
import "./globals.css";

export const metadata: Metadata = {
  title: "FundSentinel",
  description: "Agentic fund approval · mock scenario · internal decision support · not investment advice",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await connection(); // always read live data; never prerender at build time
  let runs: RunSummary[] = [];
  let error: string | null = null;
  try { runs = await listRuns(); } catch (e) { error = describe(e); }
  return (
    <html lang="en" data-theme="light">
      <body>
        <AppShell runs={runs} error={error}>{children}</AppShell>
      </body>
    </html>
  );
}
