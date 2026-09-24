'use client';
import * as React from 'react';
import {PageHeader, SectionTitle, NumberTile, TileRow, DataTable, Mono, StatusChip, KindBadge, CoverageBar, Sheet, FactList, SourceRecord, EmptyState, Button, Disclosure } from '../ds';

const DID = {
  fixed: { tone: 'good', label: 'Fixed' }, flagged: { tone: 'person', label: 'Flagged for a person' }, setaside: { tone: 'neutral', label: 'Set aside' },
  dup: { tone: 'neutral', label: 'Removed duplicate' }, blocked: { tone: 'person', label: 'Flagged for a person' }, ok: { tone: 'neutral', label: 'Not a problem' },
};

export default function DataScreen({ run, go, data }) {
  const [open, setOpen] = React.useState(null);
  const PROBLEMS = data ? data.problems : [];
  const COLUMNS = data ? data.columns : [];
  const MAPPING = data ? data.mapping : [];
  if (!data || !data.hasReport) {
    return (
      <div>
        <PageHeader title="Data" subtitle="Can we trust this file?" meta={<>file: <Mono chip strong={false}>{run.file}</Mono></>} />
        <EmptyState style={{ marginTop: 32 }} icon="database" title="No data report for this run">
          This run was recorded before the data checks were added, or it is an update run that reuses an earlier run's checks.
        </EmptyState>
      </div>
    );
  }
  const p = open ? PROBLEMS.find((x) => x.id === open) : null;
  return (
    <div>
      <PageHeader title="Data" subtitle="Can we trust this file?" meta={<>file: <Mono chip strong={false}>{run.file}</Mono> · checked before the committee sees any fund</>} />
      <p style={{ margin: '14px 0 0', maxWidth: 860, font: 'var(--type-small)', color: 'var(--text-2)', textWrap: 'pretty' }}>
        Five AI agents prepare the file, and code checks their work: the <b>column reader</b> (Profiler) works out which column is which, the <b>quality inspector</b> finds problems, the <b>data repairer</b> (SelfHeal) fixes what it safely can, the <b>data organiser</b> (Transform) puts units in one format and proposes useful new columns, and the <b>data describer</b> (Metadata) explains each column.
      </p>
      <div style={{ marginTop: 24 }}>
        <TileRow>
          <NumberTile label="Quality score" sub="The quality inspector's rating; 100 = no problems" value={data.tiles.score === null ? '—' : <>{data.tiles.score}<span style={{ fontSize: 20, fontWeight: 400, color: 'var(--text-2)' }}>/100</span></>} />
          <NumberTile label="Problems found" value={Number(data.tiles.problems).toLocaleString('en-US')} />
          <NumberTile label="Funds with warnings" tone="person" value={Number(data.tiles.warnings).toLocaleString('en-US')} />
          <NumberTile label="Funds set aside" tone="neutral" value={Number(data.tiles.setAside).toLocaleString('en-US')} />
        </TileRow>
      </div>
      <section style={{ marginTop: 28, padding: '20px 24px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)', gap: 28 }}>
        <div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}><span style={{ fontWeight: 600 }}>Quality inspector’s summary</span><KindBadge kind="ai" /></div>
          <p style={{ margin: 0, textWrap: 'pretty' }}>{data.summary || 'No summary for this run.'}</p>
        </div>
        <div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Top problems</div>
          <ol style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4, font: 'var(--type-small)' }}>
            {data.top.map((t, i) => <li key={i}>{t}</li>)}
          </ol>
        </div>
      </section>

      <section style={{ marginTop: 44 }}>
        <SectionTitle aside={PROBLEMS.length < data.problemsListed
          ? `Showing the ${PROBLEMS.length} most important of ${data.problemsListed.toLocaleString('en-US')} · set aside, fixed and AI findings first`
          : (data.checksOnly ? 'Every problem in the file' : 'Problems in the funds reviewed · ' + data.tiles.problems.toLocaleString('en-US') + ' found in the whole file')}>Problems and what we did</SectionTitle>
        <DataTable rowKey="id" rows={PROBLEMS} selectedKey={open} onRowClick={(r) => setOpen(r.id)}
          columns={[
            { key: 'fund', label: 'Fund', width: 80, render: (r) => <Mono>{r.fund}</Mono> },
            { key: 'problem', label: 'Problem' },
            { key: 'did', label: 'What we did', width: 200, render: (r) => <StatusChip tone={DID[r.did].tone} size="sm" label={DID[r.did].label} /> },
            { key: 'who', label: 'Who decided', width: 190, small: true, render: (r) => <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><KindBadge kind={r.who} label={r.who === 'safety' ? 'Safety rule' : r.who === 'rule' ? 'Rule' : 'AI'} />{r.whoLabel.replace(/^AI · /, '').replace(/^(Rule|Safety rule)$/, '')}</span> },
            { key: 'conf', label: 'Sure', width: 64, align: 'right', small: true, muted: true },
            { key: 'why', label: 'Why', small: true, muted: true },
          ]} />
      </section>

      <section style={{ marginTop: 44, display: 'grid', gap: 14 }}>
        <SectionTitle>What each column means</SectionTitle>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <KindBadge kind="ai" label="AI · Data describer" />
          <p style={{ margin: 0, color: 'var(--text-2)', maxWidth: 820, textWrap: 'pretty' }}>{data.description || 'No dataset description for this run.'}</p>
        </div>
        <DataTable dense rowKey="col" rows={COLUMNS}
          columns={[
            { key: 'col', label: 'Column', render: (c) => <span style={{ fontWeight: 500 }}>{c.col}{c.calc ? <span style={{ marginLeft: 8, font: '500 12px/1 var(--font-sans)', color: 'var(--text-3)' }}>Calculated</span> : null}{c.ai ? <KindBadge kind="ai" label="AI proposed" style={{ marginLeft: 8 }} /> : null}</span> },
            { key: 'meaning', label: 'Meaning', small: true },
            { key: 'unit', label: 'Written as', small: true, muted: true, width: 120 },
            { key: 'cov', label: 'Filled in', width: 130, render: (c) => <CoverageBar value={c.cov} width={56} /> },
            { key: 'from', label: 'Where it came from', small: true, render: (c) => c.calc || c.ai || c.from.startsWith('Same for every fund') ? <span style={{ color: 'var(--text-2)' }}>{c.from}</span> : <Mono chip strong={false}>{c.from}</Mono> },
            { key: 'caveat', label: 'Watch out for', small: true, muted: true },
          ]} />
        <div style={{ padding: '14px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Columns the AI proposed</div>
          <div style={{ display: 'grid', gap: 8, font: 'var(--type-small)' }}>
            {data.proposed.length === 0 ? <span style={{ color: 'var(--text-2)' }}>None proposed for this run.</span> : null}
            {data.proposed.map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>{p.accepted ? <StatusChip tone="good" size="sm" label="Accepted" /> : <StatusChip tone="stop" size="sm" label="Rejected" />}<b style={{ fontWeight: 500 }}>{p.name}</b><span style={{ color: 'var(--text-2)' }}>{p.why}</span></div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ marginTop: 44, display: 'grid', gap: 14 }}>
        <SectionTitle aside={<span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>Found by <KindBadge kind="ai" label="AI · Column reader" /> checked by <KindBadge kind="rule" /></span>}>How the file was understood</SectionTitle>
        <DataTable dense rowKey="ours" rows={MAPPING}
          columns={[
            { key: 'ours', label: 'Our name ← column in the file', render: (m) => <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span style={{ fontWeight: 500 }}>{m.ours}</span><span style={{ color: 'var(--text-3)' }}>←</span><Mono chip strong={false}>{m.theirs}</Mono></span> },
            { key: 'unit', label: 'Written as', small: true },
            { key: 'conf', label: 'Sure', width: 64, align: 'right', small: true, muted: true },
            { key: 'ok', label: 'Code check', width: 220, render: (m) => m.ok ? <StatusChip tone="good" size="sm" label="Accepted" /> : <StatusChip tone="stop" size="sm" label="Rejected" suffix={'· ' + (m.reject || '').toLowerCase()} /> },
            { key: 'why', label: 'AI’s reasoning', small: true, muted: true },
          ]} />
        <div style={{ font: 'var(--type-small)', color: 'var(--text-2)', display: 'grid', gap: 4 }}>
          {data.rounds.length ? data.rounds.map((r) => <span key={r.round}>Round {r.round}: {r.accepted} of {r.proposed} accepted{r.rejected.length ? ', rejected ' + r.rejected.join('; ') : ''}.</span>) : <span>A saved column layout was used, so the column reader didn't run.</span>}
          {data.notMapped.length ? <span>Not found: {data.notMapped.join(' · ')}</span> : null}
        </div>
      </section>

      {p ? (
        <Sheet title={p.problem} subtitle={(p.fund === '—' ? 'Fund with no ticker' : p.fund) + ' · Row ' + p.row + ' of the file'} onClose={() => setOpen(null)}>
          <StatusChip tone={DID[p.did].tone} size="lg" label={DID[p.did].label} />
          <FactList facts={[
            { label: 'Problem', value: p.problem },
            { label: 'What we did', value: p.did === 'blocked' ? 'Repair blocked; flagged for a person' : DID[p.did].label },
            { label: 'Who decided', value: <><KindBadge kind={p.who} label={p.who === 'safety' ? 'Safety rule' : p.who === 'rule' ? 'Rule' : 'AI'} /><span>{p.whoLabel}</span></> },
            { label: 'How sure', value: p.conf },
            { label: 'Why', value: p.why },
          ]} />
          <SourceRecord rowLabel={'Row ' + p.row + ' of the file'} file={data.file} activeColumn={p.col}
            cells={[{ column: 'fund', value: p.fund === '—' ? '' : p.fund }, { column: p.col, value: p.val }].concat(p.newValue ? [{ column: 'suggested', value: String(p.newValue) }] : [])} />
        </Sheet>
      ) : null}
    </div>
  );
}


