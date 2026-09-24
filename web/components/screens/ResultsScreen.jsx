'use client';
import * as React from 'react';
import {PageHeader, SectionTitle, NumberTile, TileRow, DataTable, Mono, OutcomeChip, VerdictDots, Disclosure, HBarChart, DecisionChange, StatusChip, KindBadge, Sheet, FactList, TextInput, Select, Callout, Icon as RIcon, Button as RButton } from '../ds';

const OUT_LABEL = { approved: 'Approved', conditions: 'Approved with conditions', rejected: 'Rejected', person: 'Needs a person', quarantined: "Couldn't judge" };
const CHANGE_TONE = { routine: 'neutral', material: 'stop', ambiguous: 'person' };
const TRICK_RESULT = { caught: { tone: 'good', label: 'Caught' }, read: { tone: 'good', label: 'Read correctly' }, missed: { tone: 'stop', label: 'Missed' }, other: { tone: 'stop', label: 'Missed: rejected for another reason' } };

function counts(funds) {
  const c = { approved: 0, conditions: 0, rejected: 0, person: 0, quarantined: 0 };
  funds.forEach((f) => { c[f.outcome] = (c[f.outcome] || 0) + 1; });
  return c;
}

function Block({ children, gap = 16, style }) { return <section style={{ marginTop: 44, display: 'grid', gap, ...style }}>{children}</section>; }

function FundsTable({ run, go, filter, setFilter }) {
  const [q, setQ] = React.useState('');
  const rows = run.funds_.filter((f) => (filter === 'all' || (filter === 'approved' ? (f.outcome === 'approved' || f.outcome === 'conditions') : f.outcome === filter)) && (!q || (f.ticker + ' ' + f.name).toLowerCase().includes(q.toLowerCase())));
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <TextInput icon="search" placeholder="Search by ticker or name" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 300 }} />
        <Select value={filter} onChange={setFilter} style={{ width: 220 }} options={[{ value: 'all', label: 'All decisions' }, { value: 'approved', label: 'Approved (incl. conditions)' }, { value: 'rejected', label: 'Rejected' }, { value: 'person', label: 'Needs a person' }, { value: 'quarantined', label: "Couldn't judge" }]} />
      </div>
      <DataTable
        rowKey="ticker" rows={rows} onRowClick={(r) => go('/runs/' + run.id + '/funds/' + encodeURIComponent(r.ticker))}
        footer={'Showing ' + rows.length + ' of ' + run.funds_.length + ' funds'}
        columns={[
          { key: 'fund', label: 'Fund', width: '30%', render: (r) => <div style={{ display: 'grid', gap: 2 }}><Mono>{r.ticker}</Mono><span style={{ font: 'var(--type-small)', color: 'var(--text-2)' }}>{r.name}</span></div> },
          { key: 'd', label: 'Decision', nowrap: true, width: 230, render: (r) => <OutcomeChip outcome={r.outcome} size="sm" /> },
          { key: 'reason', label: 'Reason', render: (r) => <span style={{ textWrap: 'pretty' }}>{r.reason}</span> },
          { key: 'v', label: 'Reviewers', width: 120, render: (r) => <VerdictDots verdicts={r.v} /> },
        ]}
      />
    </div>
  );
}

function CommitteeTiles({ run, filter, setFilter }) {
  const c = counts(run.funds_);
  const t = (k) => ({ onClick: () => setFilter(filter === k ? 'all' : k), active: filter === k });
  return (
    <TileRow>
      <NumberTile label="Approved" tone="good" value={c.approved + c.conditions} sub={'incl. ' + c.conditions + ' with conditions'} {...t('approved')} />
      <NumberTile label="Rejected" tone="stop" value={c.rejected} {...t('rejected')} />
      <NumberTile label="Needs a person" tone="person" value={c.person} {...t('person')} />
      <NumberTile label="Couldn't judge" tone="neutral" value={c.quarantined} {...t('quarantined')} />
    </TileRow>
  );
}

function CommitteeLine({ run }) {
  const c = counts(run.funds_);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', color: 'var(--text-2)', font: 'var(--type-small)' }}>
      <StatusChip tone="good" size="sm" label={c.approved + c.conditions + ' approved'} suffix={'incl. ' + c.conditions + ' with conditions'} />
      <StatusChip tone="stop" size="sm" label={c.rejected + ' rejected'} />
      <StatusChip tone="person" size="sm" label={c.person + ' need a person'} />
      <StatusChip tone="neutral" size="sm" label={c.quarantined + " couldn't judge"} />
    </div>
  );
}

function StuckDetails({ run }) {
  const names = ['Analyst', 'Compliance', 'Finance', 'Suitability'];
  const data = names.map((n, i) => ({ label: n, value: run.funds_.filter((f) => f.v[i] === 'fail' || f.v[i] === 'na').length })).sort((a, b) => b.value - a.value);
  const top = data[0];
  if (!run.funds_.length) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: 24, padding: 20, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
      <div>
        <div style={{ font: '600 var(--text-body)/1.3 var(--font-sans)', marginBottom: 14 }}>Where funds get stuck</div>
        <HBarChart data={data} max={run.funds_.length} valueLabel={(d) => d.value + ' of ' + run.funds_.length}
          reading={top.value ? 'Most problems come from ' + top.label + ': ' + top.value + ' of ' + run.funds_.length + ' funds failed or couldn’t be assessed.' : 'No reviewer failed or was unable to assess any fund.'} />
      </div>
      <div style={{ display: 'grid', alignContent: 'start', gap: 14 }}>
        <div style={{ font: '600 var(--text-body)/1.3 var(--font-sans)' }}>Send-backs</div>
        {[['Supervisor', run.sendbacks.supervisor, 'ai', 'Sent a reviewer back because facts conflicted'], ['Evidence checker', run.sendbacks.evidence, 'rule', 'Rejected a verdict whose numbers weren’t in the data']].map(([who, n, k, d]) => (
          <div key={who} style={{ display: 'grid', gridTemplateColumns: '44px 1fr', gap: 10 }}>
            <span style={{ font: '600 28px/1 var(--font-sans)', fontVariantNumeric: 'tabular-nums' }}>{n}</span>
            <span><span style={{ display: 'flex', gap: 8, alignItems: 'center', font: '500 var(--text-small)/1.3 var(--font-sans)' }}>{who} <KindBadge kind={k} /></span><span style={{ font: 'var(--type-small)', color: 'var(--text-2)' }}>{d}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function UpdateSection({ run, go, openSheet }) {
  const U = run.update;
  return (
    <section style={{ display: 'grid', gap: 16, marginTop: 36 }}>
      <SectionTitle aside={<span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><RIcon name="git-compare" size={14} />Only reviews affected by changes were reopened</span>}>Update compared with {U.compareWith} ({U.compareDate})</SectionTitle>
      <TileRow>
        <NumberTile label="Changes found" value={U.tiles.changes} />
        <NumberTile label="Changes that matter" value={U.tiles.matter} />
        <NumberTile label="Reviews reopened" value={U.tiles.reopened} of={U.tiles.possible} />
        <NumberTile label="Decisions changed" value={U.tiles.changed} />
      </TileRow>
      {U.decisionChanges.length ? (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {U.decisionChanges.map((c) => (
            <DecisionChange key={c.ticker} ticker={c.ticker} name={c.name} from={c.from} to={c.to} reason={c.reason} onClick={() => go('/runs/' + encodeURIComponent(run.id) + '/funds/' + encodeURIComponent(c.ticker))} />
          ))}
        </div>
      ) : <div style={{ font: 'var(--type-small)', color: 'var(--text-2)' }}>No decision changed.</div>}
      <Disclosure label="Show details">
        <div style={{ display: 'grid', gap: 16 }}>
          <DataTable dense rowKey="id" rows={U.changes} onRowClick={(c) => openSheet({ kind: 'change', c, compareWith: U.compareWith })}
            footer={'Showing ' + U.changes.length + ' changes'}
            columns={[
              { key: 't', label: 'Fund', width: 80, render: (c) => <Mono>{c.ticker}</Mono> },
              { key: 'f', label: 'Change', render: (c) => <span>{c.field}: <span style={{ color: 'var(--text-2)', textDecoration: 'line-through' }}>{c.from}</span> → {c.to}</span> },
              { key: 'type', label: 'Type', width: 120, render: (c) => <StatusChip tone={CHANGE_TONE[c.type]} size="sm" label={c.type[0].toUpperCase() + c.type.slice(1)} /> },
              { key: 'j', label: 'Judged by', width: 230, small: true, render: (c) => <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><KindBadge kind={c.kind} />{c.judged.replace(/^(AI|Rule)( ·|:)? ?/, '') || ''}</span> },
              { key: 'r', label: 'Reviewers', small: true, render: (c) => <span>{c.type === 'routine' ? 'None reopened for this change' : c.reopened.length ? 'Reopened ' + c.reopened.join(', ') : 'None reopened'}</span> },
            ]} />
          {U.stale.length ? (
            <div style={{ padding: '14px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ font: '600 var(--text-small)/1.3 var(--font-sans)', marginBottom: 8 }}>Old evidence marked out of date</div>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4, font: 'var(--type-small)', color: 'var(--text-2)' }}>
                {U.stale.map((x, i) => <li key={i}><Mono>{x.ticker}</Mono> {x.what}: {x.why}</li>)}
              </ul>
            </div>
          ) : null}
        </div>
      </Disclosure>
    </section>
  );
}

function RedTeamSection({ run, go, openSheet }) {
  const R = run.redteam;
  const T = R.tricks, G = R.genuine;
  return (
    <section style={{ display: 'grid', gap: 16, marginTop: 36 }}>
      <SectionTitle aside={R.tiles.planted + ' planted tricks among ' + R.tiles.real + ' genuine funds'}>RedTeam test</SectionTitle>
      <TileRow>
        <NumberTile label="Tricks caught" tone="good" value={R.tiles.caught} of={R.tiles.planted} />
        <NumberTile label="Tricks missed" tone="stop" value={R.tiles.missed} of={R.tiles.planted} />
        <NumberTile label="Genuine funds wrongly rejected" value={R.tiles.wrongly} of={R.tiles.real} />
        <NumberTile label="Genuine funds sent to a person" value={R.tiles.person} of={R.tiles.real} />
      </TileRow>
      <DataTable rowKey="n" rows={T} onRowClick={(t) => openSheet({ kind: 'trick', t, total: R.tiles.planted })}
        columns={[
          { key: 'r', label: 'Result', width: 170, render: (t) => <StatusChip tone={TRICK_RESULT[t.result].tone} size="md" label={TRICK_RESULT[t.result].label} /> },
          { key: 'trick', label: 'Trick', render: (t) => <span style={{ fontWeight: 500 }}>{t.trick}</span> },
          { key: 'fund', label: 'Fund', width: 90, small: true, render: (t) => <Mono>{t.fund}</Mono> },
          { key: 'o', label: 'Outcome', width: 200, render: (t) => <OutcomeChip outcome={t.outcome} size="sm" /> },
          { key: 'by', label: 'What caught it', small: true, render: (t) => <span style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}><KindBadge kind={t.byKind} />{t.by}</span> },
        ]} />
      <Disclosure label="How this test was made fair">
        <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
          <li>The RedTeam agent was given the policy and designed a realistic disguise for each trick by editing a copy of a genuine fund.</li>
          <li>The genuine funds pass every rule on their own, so a trick can only be caught because of the trick.</li>
          <li>What counts as caught is fixed in advance, not decided by the AI, and it must be caught for the right reason.</li>
          <li>One trick is harmless (a normal fee written as "60 bps"): it must be read correctly, not punished.</li>
        </ul>
      </Disclosure>
      <div style={{ display: 'grid', gap: 10 }}>
        <div style={{ font: '600 var(--text-body)/1.3 var(--font-sans)' }}>Genuine funds</div>
        <DataTable dense rowKey="ticker" rows={G} onRowClick={(r) => go('/runs/' + encodeURIComponent(run.id) + '/funds/' + encodeURIComponent(r.ticker))}
          columns={[
            { key: 't', label: 'Fund', width: 90, render: (r) => <Mono>{r.ticker}</Mono> },
            { key: 'o', label: 'Outcome', width: 240, render: (r) => <OutcomeChip outcome={r.outcome} size="sm" /> },
            { key: 'reason', label: 'Reason', small: true, muted: true },
          ]} />
      </div>
      <Callout kind="info" title="A real fix this test led to">This test found that the repair step could “fix” a 4.5% fee down to 0.45%; a safety rule now stops any repair that would make a fund look better.</Callout>
    </section>
  );
}

function ResultsSheet({ sheet, onClose }) {
  if (!sheet) return null;
  if (sheet.kind === 'trick') {
    const t = sheet.t;
    return (
      <Sheet title={t.trick} subtitle={'Trick ' + t.n + ' of ' + sheet.total + ' · ' + t.fund} onClose={onClose}>
        <StatusChip tone={TRICK_RESULT[t.result].tone} size="lg" label={TRICK_RESULT[t.result].label} />
        <FactList facts={[
          { label: 'Outcome', value: <OutcomeChip outcome={t.outcome} size="sm" /> },
          { label: 'What caught it', value: <><KindBadge kind={t.byKind} /><span>{t.by}</span></> },
          { label: 'How it was disguised', value: t.disguise },
          { label: 'Decision reason', value: t.reason || '—' },
        ]} />
      </Sheet>
    );
  }
  const c = sheet.c;
  return (
    <Sheet title={c.field + ' changed'} subtitle={c.ticker + ' · compared with ' + sheet.compareWith} onClose={onClose}>
      <div style={{ font: 'var(--type-lead)' }}><span style={{ color: 'var(--text-2)', textDecoration: 'line-through' }}>{c.from}</span> → {c.to}</div>
      <FactList facts={[
        { label: 'Type', value: <StatusChip tone={CHANGE_TONE[c.type]} size="sm" label={c.type[0].toUpperCase() + c.type.slice(1)} /> },
        { label: 'Judged by', value: <><KindBadge kind={c.kind} /><span>{c.judged}</span></> },
        { label: 'Reason', value: c.reason },
        { label: 'Reopened', value: c.reopened.join(', ') || 'None' },
        { label: 'Carried forward', value: c.carried.join(', ') || 'None' },
      ]} />
    </Sheet>
  );
}

export default function ResultsScreen({ run, go }) {
  const [filter, setFilter] = React.useState('all');
  const [sheet, setSheet] = React.useState(null);
  React.useEffect(() => { setFilter('all'); setSheet(null); }, [run.id]);
  const special = run.type !== 'review';
  return (
    <div>
      <PageHeader title="Results" subtitle="What did the committee decide?"
        meta={<>{run.funds} funds · {run.seconds} seconds · file: <Mono chip strong={false}>{run.file}</Mono> · {run.mapping}</>} />
      {run.type === 'update' ? <UpdateSection run={run} go={go} openSheet={setSheet} /> : null}
      {run.type === 'redteam' ? <RedTeamSection run={run} go={go} openSheet={setSheet} /> : null}
      <Block>
        {special ? <><SectionTitle>All funds</SectionTitle><CommitteeLine run={run} /></> : <CommitteeTiles run={run} filter={filter} setFilter={setFilter} />}
        <FundsTable run={run} go={go} filter={filter} setFilter={setFilter} />
        <Disclosure label="Show details"><StuckDetails run={run} /></Disclosure>
      </Block>
      <ResultsSheet sheet={sheet} onClose={() => setSheet(null)} />
    </div>
  );
}


