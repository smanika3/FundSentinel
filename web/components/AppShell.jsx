'use client';
import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar, Button, Callout, Mono } from './ds';

function parse(pathname) {
  const p = pathname.split('/').filter(Boolean);
  if (p[0] === 'run') return { page: 'run' };
  if (p[0] === 'policy') return { page: 'policy' };
  if (p[0] === 'runs' && p[1]) {
    const run = decodeURIComponent(p[1]);
    if (p[2] === 'funds') return { page: 'fund', run, ticker: p[3] ? decodeURIComponent(p[3]) : null };
    if (p[2] === 'data') return { page: 'data', run };
    return { page: 'results', run };
  }
  return { page: 'results' };
}

export default function AppShell({ runs, error, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const route = parse(pathname);
  const [theme, setTheme] = React.useState('light');
  const [collapsed, setCollapsed] = React.useState(false);
  const [lastRun, setLastRun] = React.useState(null);
  const [progress, setProgress] = React.useState(null);

  React.useEffect(() => {
    try { const t = localStorage.getItem('fs-theme'); if (t) setTheme(t); setLastRun(localStorage.getItem('fs-last-run')); } catch {}
    const r = () => setCollapsed(window.innerWidth < 1200);
    r(); window.addEventListener('resize', r);
    return () => window.removeEventListener('resize', r);
  }, []);
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('fs-theme', theme); } catch {}
  }, [theme]);
  React.useEffect(() => {
    if (route.run) { setLastRun(route.run); try { localStorage.setItem('fs-last-run', route.run); } catch {} }
  }, [route.run]);
  // Live-run pill: the Run page stores the active job; poll its progress so the pill works on every page.
  React.useEffect(() => {
    let stop = false;
    const tick = async () => {
      let job = null;
      try { job = JSON.parse(localStorage.getItem('fs-live-job') || 'null'); } catch {}
      if (!job) { setProgress(null); return; }
      try {
        const r = await fetch('/api/progress?run=' + encodeURIComponent(job.runId), { cache: 'no-store' });
        const p = await r.json();
        if (!stop) setProgress(p && p.status === 'running' ? { done: p.done || 0, total: p.total || 0 } : null);
      } catch {}
    };
    tick(); const id = setInterval(tick, 5000);
    return () => { stop = true; clearInterval(id); };
  }, []);

  const runId = route.run || (runs.some((r) => r.id === lastRun) ? lastRun : runs[0] && runs[0].id);
  const nav = (id) => {
    if (id === 'run') router.push('/run');
    else if (id === 'policy') router.push('/policy');
    else if (!runId) router.push('/run');
    else if (id === 'results') router.push('/runs/' + encodeURIComponent(runId));
    else if (id === 'fund') router.push('/runs/' + encodeURIComponent(runId) + '/funds' + (route.page === 'fund' && route.ticker ? '/' + encodeURIComponent(route.ticker) : ''));
    else if (id === 'data') router.push('/runs/' + encodeURIComponent(runId) + '/data');
  };
  const onRunChange = (id) => router.push('/runs/' + encodeURIComponent(id) + (route.page === 'data' ? '/data' : ''));

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-page)', color: 'var(--text)' }}>
      <Sidebar active={route.page} onNavigate={nav} runs={runs.length ? runs : [{ id: '-', file: 'No runs yet', funds: 0, duration: '', type: 'review' }]}
        runId={runId || '-'} onRunChange={onRunChange} collapsed={collapsed} login={error === 'login' ? 'expired' : 'active'}
        progress={progress && route.page !== 'run' ? progress : null} onProgressClick={() => router.push('/run')} />
      <main style={{ flex: 1, minWidth: 0, overflow: 'auto', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 20, right: 24, zIndex: 5 }}>
          <Button variant="ghost" size="sm" icon={theme === 'dark' ? 'sun' : 'moon'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle dark mode">{theme === 'dark' ? 'Light' : 'Dark'}</Button>
        </div>
        <div style={{ maxWidth: 'var(--content-max)', padding: collapsed ? '40px 36px 80px' : '44px 56px 96px' }}>
          {error === 'login' ? (
            <Callout kind="error" title="The app's AWS login has expired" style={{ marginBottom: 24, maxWidth: 820 }}>
              Run <Mono chip strong={false}>aws login --profile fundsentinel</Mono>, restart the app with <Mono chip strong={false}>npm run dev:aws</Mono>, and reload.
            </Callout>
          ) : error ? (
            <Callout kind="error" title="Couldn't reach the database" style={{ marginBottom: 24, maxWidth: 820 }}>{error}</Callout>
          ) : null}
          {children}
        </div>
      </main>
    </div>
  );
}
