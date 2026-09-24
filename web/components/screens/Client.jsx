'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import ResultsScreen from './ResultsScreen';
import FundScreen from './FundScreen';
import DataScreen from './DataScreen';

function useGo() {
  const router = useRouter();
  return React.useCallback((p) => router.push(p), [router]);
}
export function ResultsClient({ run }) { return <ResultsScreen run={run} go={useGo()} />; }
export function FundClient({ run, ticker, src, detail }) {
  return <FundScreen run={run} detail={detail} route={{ ticker, q: src ? { src } : {} }} go={useGo()} />;
}
export function DataClient({ run, data }) { return <DataScreen run={run} data={data} go={useGo()} />; }
