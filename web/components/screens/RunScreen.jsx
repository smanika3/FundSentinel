'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, Field, Select, TextInput, RadioGroup, Switch, Disclosure, Button, Callout, RunSteps, FundProgressLine, RunTypeTag, Mono, Icon } from '../ds';

const STEPS = ['Understanding the columns', 'Checking data quality', 'Repairing and flagging data', 'Documenting the data', 'Committee reviewing funds', 'Checking the evidence', 'Final decisions'];
const UPDATE_STEPS = ['Reading the new file', 'Finding what changed', 'Deciding which changes matter', 'Marking old evidence out of date', 'Reopening only the affected reviews', 'Checking the evidence', 'Final decisions'];
const OUTCOME = { approved: 'approved', approved_with_conditions: 'conditions', rejected: 'rejected', flagged_for_review: 'person', sent_back: 'person', quarantined: 'quarantined' };
const fmt = (s) => Math.floor(s / 60) + ':' + String(Math.max(0, s) % 60).padStart(2, '0');
const JOB_KEY = 'fs-live-job';

function readJob() { try { return JSON.parse(localStorage.getItem(JOB_KEY) || 'null'); } catch { return null; } }
function writeJob(j) { try { if (j) localStorage.setItem(JOB_KEY, JSON.stringify(j)); else localStorage.removeItem(JOB_KEY); } catch {} }

function RunForm({ runs, onStart, starting }) {
  const [files, setFiles] = React.useState([]);
  const [file, setFile] = React.useState('');
  const [note, setNote] = React.useState('');
  const [type, setType] = React.useState('review');
  const [baseline, setBaseline] = React.useState('');
  const [mapping, setMapping] = React.useState('auto');
  const [scope, setScope] = React.useState('first');
  const [first, setFirst] = React.useState('3');
  const [tickers, setTickers] = React.useState('');
  const [routing, setRouting] = React.useState(true);
  const [par, setPar] = React.useState('3');
  const [uploading, setUploading] = React.useState(false);
  const [err, setErr] = React.useState(null);
  const upload = React.useRef(null);
  const reviewRuns = runs.filter((r) => r.type !== 'update');

  React.useEffect(() => {
    fetch('/api/files').then((r) => r.json()).then((d) => {
      if (d.files) { setFiles(d.files.map((f) => f.key)); setFile((cur) => cur || (d.files.find((f) => /yahoo_us\/MutualFunds/.test(f.key)) || d.files[0] || {}).key || ''); }
      else setErr(d.error === 'login' ? 'login' : d.error);
    }).catch((e) => setErr(String(e)));
    if (reviewRuns[0]) setBaseline(reviewRuns[0].id);
  }, []);

  const onUpload = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setUploading(true); setErr(null);
    const fd = new FormData(); fd.append('file', f);
    const r = await fetch('/api/upload', { method: 'POST', body: fd }).then((x) => x.json()).catch((x) => ({ error: String(x) }));
    setUploading(false);
    if (r.key) { setFiles((fs) => Array.from(new Set([...fs, r.key])).sort()); setFile(r.key); } else setErr(r.error);
  };

  const start = () => {
    const body = { source: file, type, workers: Number(par), supervisor: routing, context: note || undefined };
    if (type === 'update') body.baseline = baseline;
    if (type !== 'update' && mapping !== 'auto') body.mapping = mapping;
    if (scope === 'first') body.limit = Number(first) || 3;
    if (scope === 'tickers') body.fund_ids = tickers.split(/[\s,]+/).filter(Boolean);
    onStart(body);
  };

  return (
    <div style={{ marginTop: 32, maxWidth: 760, padding: '28px 28px 24px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)', display: 'grid', gap: 26 }}>
      {err && err !== 'login' ? <Callout kind="error" title="Something went wrong">{err}</Callout> : null}
      <Field label="File" hint="Fund files already uploaded, or upload your own CSV. Column names don't need to match ours.">
        <div style={{ display: 'flex', gap: 8 }}>
          <Select mono value={file} onChange={setFile} options={files.length ? files : [file || 'Loading files…']} style={{ flex: 1 }} />
          <input ref={upload} type="file" accept=".csv" onChange={onUpload} style={{ display: 'none' }} />
          <Button icon="upload" loading={uploading} onClick={() => upload.current && upload.current.click()}>Upload a CSV</Button>
        </div>
      </Field>
      <Field label="Note from the uploader" optional><TextInput placeholder="Data snapshot date 2023-04-26" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <Field label="Run type">
        <RadioGroup name="type" value={type} onChange={(v) => v !== 'redteam' && setType(v)} options={[
          { value: 'review', label: 'Review', description: 'The committee reviews the funds in the file.' },
          { value: 'update', label: 'Update: compare with an earlier run', description: 'Only reviews affected by the changes are reopened.',
            children: <Select value={baseline} onChange={setBaseline} options={reviewRuns.map((r) => ({ value: r.id, label: r.file + ' · ' + r.when + ' · ' + r.funds + ' funds' }))} /> },
          { value: 'redteam', label: 'RedTeam test (started from the command line)', description: 'Plants trick funds among genuine ones. It takes about 20 minutes for 21 funds, so it runs from scripts/redteam.py; its scorecard appears under Results.' },
        ]} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <Field label="Reading the columns" hint={type === 'update' ? 'An update reads the columns the same way as the earlier run.' : undefined}>
          <Select value={type === 'update' ? 'auto' : mapping} onChange={setMapping} disabled={type === 'update'} options={[
            { value: 'auto', label: type === 'update' ? 'Same as the earlier run' : 'Work it out automatically' },
            { value: 'yahoo_us_mutualfunds', label: 'Saved layout: Yahoo US funds' },
            { value: 'test_versions', label: 'Saved layout: test files' },
          ]} />
        </Field>
        <Field label="Funds" hint="A typical fund takes 1–3 minutes; 3 run at a time.">
          <div style={{ display: 'flex', gap: 8 }}>
            <Select value={scope} onChange={setScope} options={[{ value: 'first', label: 'First N funds' }, { value: 'tickers', label: 'Specific tickers' }, { value: 'all', label: 'All funds' }]} style={{ flex: 1 }} />
            {scope === 'first' ? <TextInput value={first} onChange={(e) => setFirst(e.target.value)} style={{ width: 80 }} /> : null}
          </div>
          {scope === 'tickers' ? <TextInput mono placeholder="DODGX, KDHAX, VFIAX" value={tickers} onChange={(e) => setTickers(e.target.value)} /> : null}
        </Field>
      </div>
      <Disclosure label="Advanced">
        <div style={{ display: 'grid', gap: 18, paddingLeft: 20 }}>
          <Switch id="routing" checked={routing} onChange={setRouting} label="Let the Supervisor choose reviewers" description="The Supervisor decides which reviewers to call and in what order. Off: every reviewer runs on every fund." />
          <Field label="Funds reviewed at the same time" style={{ maxWidth: 240 }}><Select value={par} onChange={setPar} options={['1', '2', '3', '4', '5']} /></Field>
        </div>
      </Disclosure>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingTop: 4, borderTop: '1px solid var(--border)', marginTop: -4 }}>
        <Button variant="primary" size="lg" icon="play" loading={starting} disabled={starting || !file || err === 'login'} onClick={start} style={{ marginTop: 18 }}>{type === 'update' ? 'Start update' : 'Start review'}</Button>
        <span style={{ marginTop: 18, font: 'var(--type-small)', color: 'var(--text-2)' }}>Runs in the cloud on AWS AgentCore. You can leave this page.</span>
      </div>
    </div>
  );
}

function Progress({ job, p, onDone, onClear }) {
  const type = job.type || (p && p.run_type) || 'review';
  const file = job.file || (p && p.file) || '';
  const steps = type === 'update' ? UPDATE_STEPS : STEPS;
  const [marks, setMarks] = React.useState({});
  const status = p ? p.status : 'running';
  const step = p ? p.step : 0;
  // A step's time and detail are recorded when we see the NEXT step start, so only steps finished while this page watched get them.
  const first = React.useRef(null);
  React.useEffect(() => {
    if (!p || p.step == null) return;
    if (first.current == null) { first.current = p.step; return; }
    if (p.step > first.current) setMarks((m) => (m[p.step] ? m : { ...m, [p.step]: { t: p.elapsed, detail: p.step !== 4 && /^\d/.test(p.detail || '') ? p.detail : null } }));
  }, [p && p.step]);
  const total = p ? p.total : 0, done = p ? p.done : 0;
  const lines = p && p.lines ? p.lines : [];
  const perFund = lines.length ? lines.reduce((a, l) => a + (l.seconds || 0), 0) / lines.length : 90;
  const left = status === 'done' ? 0 : Math.max(60, Math.round(((total - done) * perFund) / (job.workers || 3)) + (total ? 40 : 240));
  const stepData = steps.map((label, i) => {
    let state = status === 'done' ? 'done' : i < step ? 'done' : i === step ? (status === 'failed' ? 'error' : 'running') : 'pending';
    const m = marks[i + 1];
    let detail;
    if (i === 4 && step >= 4) detail = done + ' of ' + total + ' funds · ' + (job.workers || 3) + ' at a time';
    else if (i < step && marks[i + 1] && marks[i + 1].detail) detail = marks[i + 1].detail;
    return { label, state, detail, time: (i < step || status === 'done') && m ? fmt(m.t) : undefined };
  });
  return (
    <div style={{ marginTop: 28, display: 'grid', gap: 20, maxWidth: 820 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', font: 'var(--type-small)', color: 'var(--text-2)', fontVariantNumeric: 'tabular-nums' }}>
        <Mono chip strong={false}>{file}</Mono><RunTypeTag type={type} />
        <span>·</span><span>Elapsed {fmt(p ? p.elapsed : 0)}</span><span>·</span><span>{job.workers || 3} funds at a time</span>
        {status === 'running' ? <><span>·</span><span>About {Math.max(1, Math.round(left / 60))} min left</span></> : null}
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center', color: 'var(--text-3)' }}><Icon name="refresh-cw" size={13} />Updates every few seconds</span>
      </div>
      {status === 'done' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 18px', background: 'var(--status-good-bg)', borderRadius: 'var(--radius-lg)' }}>
          <span style={{ color: 'var(--status-good-fg)' }}><Icon name="circle-check" strokeWidth={2} /></span>
          <span style={{ flex: 1 }}><b style={{ fontWeight: 600 }}>Review finished.</b> {total} funds decided in {fmt(p.elapsed)}.</span>
          <Button variant="primary" iconRight="arrow-right" onClick={onDone}>See results</Button>
        </div>
      ) : null}
      {status === 'unknown' ? (
        <Callout kind="info" title="No progress recorded for this run" action={<Button icon="refresh-cw" onClick={onClear}>Start a run</Button>}>
          It may still be starting in the cloud, or it was run from the command line (those runs appear under Results when they finish).
        </Callout>
      ) : null}
      {status === 'failed' ? (
        <Callout kind="error" title="The run failed" action={<Button icon="refresh-cw" onClick={onClear}>Start another run</Button>}>
          {p.error || 'The cloud pipeline stopped.'} Funds already decided are kept.
        </Callout>
      ) : null}
      <div style={{ padding: '6px 20px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)' }}>
        <RunSteps steps={stepData} />
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ font: '600 var(--text-body)/1.3 var(--font-sans)' }}>Funds finished</span>
          <span style={{ font: 'var(--type-small)', color: 'var(--text-2)', fontVariantNumeric: 'tabular-nums' }}>{done} of {total || '…'}</span>
        </div>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {lines.length === 0 ? <div style={{ padding: '14px 16px', color: 'var(--text-2)', font: 'var(--type-small)' }}>Funds appear here one at a time as the committee finishes them.</div> : null}
          <div style={{ marginTop: -1 }}>
            {lines.slice().reverse().map((l, i) => (
              <FundProgressLine key={l.ticker + i} fresh={i === 0} ticker={l.ticker} name={l.name} outcome={OUTCOME[l.decision] || 'person'}
                time={(l.seconds || 0) + ' s'} sendbacks={l.sendbacks || 0} />
            ))}
          </div>
        </div>
      </div>
      {status !== 'running' ? null : <div style={{ font: 'var(--type-small)', color: 'var(--text-3)' }}>Run ID <Mono>{job.runId}</Mono></div>}
    </div>
  );
}

export default function RunScreen({ runs }) {
  const router = useRouter();
  const [job, setJob] = React.useState(null);
  const [p, setP] = React.useState(null);
  const [starting, setStarting] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    const watch = new URLSearchParams(location.search).get('watch');
    setJob(watch ? { runId: watch } : readJob());
  }, []);
  React.useEffect(() => {
    if (!job) return;
    let stop = false;
    const tick = async () => {
      const r = await fetch('/api/progress?run=' + encodeURIComponent(job.runId), { cache: 'no-store' }).then((x) => x.json()).catch(() => null);
      if (stop || !r) return;
      if (r.error === 'login') setError('login'); else setP(r);
    };
    tick(); const id = setInterval(tick, 3000);
    return () => { stop = true; clearInterval(id); };
  }, [job && job.runId]);

  const start = async (body) => {
    setStarting(true); setError(null);
    const r = await fetch('/api/runs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      .then((x) => x.json()).catch((x) => ({ error: String(x) }));
    setStarting(false);
    if (r.run_id) { const j = { runId: r.run_id, file: body.source.replace(/^raw\//, ''), type: body.type, workers: body.workers, started: Date.now() }; writeJob(j); setP(null); setJob(j); }
    else setError(r.error || 'The run could not start.');
  };
  const clear = () => { writeJob(null); setJob(null); setP(null); };

  return (
    <div>
      <PageHeader title="Run a file" subtitle="Check a new fund file" />
      {error === 'login' ? (
        <Callout kind="error" title="The app's AWS login has expired" style={{ marginTop: 24, maxWidth: 820 }} action={<Button icon="refresh-cw" onClick={() => location.reload()}>Retry</Button>}>
          Run <Mono chip strong={false}>aws login --profile fundsentinel</Mono>, restart the app, and press Retry.
        </Callout>
      ) : error ? <Callout kind="error" title="The run could not start" style={{ marginTop: 24, maxWidth: 820 }}>{error}</Callout> : null}
      {job ? (
        <Progress job={job} p={p} onDone={() => { const id = job.runId; clear(); router.push('/runs/' + encodeURIComponent(id)); router.refresh(); }} onClear={clear} />
      ) : <RunForm runs={runs} onStart={start} starting={starting} />}
    </div>
  );
}
