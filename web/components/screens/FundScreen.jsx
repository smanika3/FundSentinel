'use client';
import * as React from 'react';
import {PageHeader, SectionTitle, Mono, OutcomeChip, StatusChip, KindBadge, Callout, Disclosure, ReviewerRow, ReviewerList, EvidenceTable, NumberLink, Timeline, TimelineStep, DataTable, Sheet, SourceRecord, FactList, Icon, Button } from '../ds';

const NAMES = ['Analyst', 'Compliance', 'Finance', 'Suitability'];
const CHANGE_TONE = { routine: 'neutral', material: 'stop', ambiguous: 'person' };
const CHANGE_LABEL = { routine: 'Routine', material: 'Matters', ambiguous: 'Unclear' };

function Reason({ parts, hover, setHover, openSrc, active }) {
  return (
    <p style={{ margin: 0, font: 'var(--type-lead)', color: 'var(--text)', textWrap: 'pretty', maxWidth: 820 }}>
      {parts.map((p, i) => typeof p === 'string' ? <React.Fragment key={i}>{p}</React.Fragment>
        : p.stale ? <span key={i} style={{ fontVariantNumeric: 'tabular-nums' }}>{p.v}</span>
        : <NumberLink key={i} id={p.n} hlKey={p.n} value={p.v} hovered={hover === p.n} active={active === p.n} onOpen={openSrc} onHover={setHover} />)}
    </p>
  );
}

function SourcePanel({ src, onClose }) {
  if (!src) return null;
  const facts = src.facts.map(([label, value]) => {
    let v = value;
    if (label === 'Evidence checker') v = value === 'verified' ? <StatusChip tone="good" size="sm" label="Verified" /> : <StatusChip tone="person" size="sm" label="Not verified" />;
    else if (label === 'Repair' && /blocked/i.test(value)) v = <><span>{value}</span><KindBadge kind="safety" /></>;
    else if (label === 'Earlier run') v = <span style={{ color: 'var(--text-2)' }}>{value}</span>;
    return { label, value: v };
  });
  return (
    <Sheet title={src.title} subtitle={src.row + ' · ' + src.file} onClose={onClose} footer="Esc to close · every number on this page opens here">
      <SourceRecord rowLabel={src.row === 'Calculated' ? 'Inputs from the file' : src.row} file={src.file} activeColumn={src.col} cells={src.cells.map(([column, value]) => ({ column, value }))} />
      <FactList facts={facts} />
    </Sheet>
  );
}

export default function FundScreen({ run, route, go, detail }) {
  const funds = run.funds_;
  const idx = Math.max(0, funds.findIndex((f) => f.ticker === route.ticker));
  const f = funds[idx] || detail.fund;
  const d = detail;
  const initial = {};
  const [hover, setHover] = React.useState(null);
  const [srcId, setSrcId] = React.useState(route.q.src || null);
  React.useEffect(() => { setSrcId(route.q.src || null); }, [f.ticker]);
  const move = (dir) => { if (!funds.length) return; const n = funds[(idx + dir + funds.length) % funds.length]; go('/runs/' + encodeURIComponent(run.id) + '/funds/' + encodeURIComponent(n.ticker)); };
  React.useEffect(() => {
    const h = (e) => { if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return; if (e.key === 'ArrowRight') move(1); if (e.key === 'ArrowLeft') move(-1); };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  });
  const status = d.status === 'warnings' ? <StatusChip tone="person" size="sm" label="Has data warnings" /> : d.status === 'setaside' ? <StatusChip tone="neutral" size="sm" label="Set aside" /> : <StatusChip tone="good" size="sm" label="OK" />;
  const src = srcId ? d.sources[srcId] : null;

  return (
    <div>
      <PageHeader
        eyebrow={<>
          <a href={'/runs/' + encodeURIComponent(run.id)} style={{ display: 'inline-flex', gap: 6, alignItems: 'center', color: 'var(--text-2)', textDecoration: 'none' }}><Icon name="arrow-left" size={14} />Results</a>
          <span style={{ color: 'var(--text-3)' }}>·</span>
          <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
            <Button variant="ghost" size="sm" icon="chevron-left" onClick={() => move(-1)} aria-label="Previous fund" style={{ height: 24, padding: '0 4px' }} />
            Fund {idx + 1} of {funds.length}
            <Button variant="ghost" size="sm" icon="chevron-right" onClick={() => move(1)} aria-label="Next fund" style={{ height: 24, padding: '0 4px' }} />
            <span style={{ color: 'var(--text-3)' }}>← → to move</span>
          </span>
        </>}
        title={f.name} subtitle="Why did this fund get this decision?"
        meta={<span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}><Mono style={{ fontSize: 14, color: 'var(--text)' }}>{f.ticker}</Mono><span>·</span><span>{f.category || 'Category not in file'}</span><span>·</span>{status}</span>}
      />

      <section style={{ marginTop: 32, padding: '26px 28px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)', display: 'grid', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <OutcomeChip outcome={f.outcome} size="xl" />
          {d.previously ? <span style={{ display: 'flex', gap: 8, alignItems: 'center', font: 'var(--type-small)', color: 'var(--text-2)' }}>Previously <OutcomeChip outcome={d.previously} size="sm" /></span> : null}
        </div>
        <Reason parts={d.reason} hover={hover} setHover={setHover} openSrc={setSrcId} active={srcId} />
        {d.conditions && d.conditions.length ? (
          <div><div style={{ font: '600 var(--text-small)/1.3 var(--font-sans)', marginBottom: 6 }}>Conditions</div><ul style={{ margin: 0, paddingLeft: 18 }}>{d.conditions.map((c) => <li key={c}>{c}</li>)}</ul></div>
        ) : null}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, font: 'var(--type-small)', color: 'var(--text-2)' }}>
          Decided by: <KindBadge kind={d.decidedBy.kind} /> <span>{d.decidedBy.text}</span>
          <span style={{ color: 'var(--text-3)' }}>·</span><span>Based on data as of {d.asOf || 'an unknown date (not in the file)'}</span>
          {d.decidedOn ? <><span style={{ color: 'var(--text-3)' }}>·</span><span>Decided {d.decidedOn}</span></> : null}
          <span style={{ color: 'var(--text-3)' }}>·</span><a href="/policy" style={{ color: 'inherit' }}>Rules used</a>
        </div>
      </section>

      {d.warnings ? <Callout kind="warning" title="Data warnings" items={d.warnings} style={{ marginTop: 16 }} /> : null}
      {d.setAside ? <Callout kind="setaside" title="Set aside" style={{ marginTop: 16 }}>{d.setAside}</Callout> : null}

      {d.changes ? (
        <section style={{ marginTop: 40 }}>
          <SectionTitle aside={'Compared with ' + d.compareWith}>What changed since last time</SectionTitle>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            {d.changes.map((c, i) => (
              <div key={c.field + i} style={{ display: 'grid', gridTemplateColumns: '120px minmax(0,1fr) 120px 240px', gap: 16, alignItems: 'center', padding: '12px 16px', borderTop: i ? '1px solid var(--border)' : 0 }}>
                <span style={{ fontWeight: 600 }}>{c.field}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}><span style={{ color: 'var(--text-2)', textDecoration: 'line-through' }}>{c.from}</span> → {c.field === 'Fee' && d.sources.expense_ratio ? <NumberLink id="expense_ratio" hlKey="expense_ratio" value={c.to} hovered={hover === 'expense_ratio'} active={srcId === 'expense_ratio'} onOpen={setSrcId} onHover={setHover} /> : c.to}</span>
                <StatusChip tone={CHANGE_TONE[c.type]} size="sm" label={CHANGE_LABEL[c.type] || c.type} />
                <span style={{ display: 'flex', gap: 8, alignItems: 'center', font: 'var(--type-small)', color: 'var(--text-2)' }}><KindBadge kind={c.kind} />{c.judged.replace(/^(AI|Rule): ?/, '') || 'Judged by AI'}</span>
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, padding: '14px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-subtle)', font: 'var(--type-small)' }}>
              <div><div style={{ fontWeight: 600, marginBottom: 6 }}>Reopened</div>{d.reopened.map((r) => <div key={r.who} style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 3 }}><Icon name="history" size={14} /><span><b style={{ fontWeight: 500 }}>{r.who}</b>: {r.why}</span></div>)}</div>
              <div><div style={{ fontWeight: 600, marginBottom: 6 }}>Kept from last review</div>{d.carried.map((r) => <div key={r.who} style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 3 }}><Icon name="corner-down-right" size={14} /><span><b style={{ fontWeight: 500 }}>{r.who}</b>: {r.why}</span></div>)}</div>
              <div><div style={{ fontWeight: 600, marginBottom: 6 }}>Old evidence no longer valid</div>{d.stale.map((s) => <div key={s} style={{ color: 'var(--text-2)', marginTop: 3 }}>{s}</div>)}</div>
            </div>
          </div>
        </section>
      ) : null}

      <section style={{ marginTop: 40 }}>
        <SectionTitle aside="Every verdict needs proof from the data">Reviewers</SectionTitle>
        <ReviewerList>
          {d.reviewers.map((r, i) => (
            <ReviewerRow key={r.name} first={i === 0} name={r.name} kind={r.kind || 'ai'} verdict={r.verdict} confidence={r.confidence} reason={r.reason} evidence={r.evidence} reopened={r.reopened}>
              {r.rows ? <EvidenceTable rows={r.rows} activeId={srcId} hoverKey={hover} onOpen={(id) => setSrcId(d.sources[id] ? id : null)} onHover={setHover} /> : null}
            </ReviewerRow>
          ))}
        </ReviewerList>
      </section>

      <section style={{ marginTop: 32, display: 'grid', gap: 14 }}>
        <Disclosure label="Show how this fund was reviewed" defaultOpen={false}>
          <div style={{ padding: '20px 22px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
            <Timeline>
              {d.timeline.length === 0 ? <div style={{ color: 'var(--text-2)', font: 'var(--type-small)' }}>No committee review: the fund was set aside by the data team.</div> : null}
              {d.timeline.map((s, i) => <TimelineStep key={i} n={i + 1} actor={s.actor} kind={s.kind} variant={s.variant} time={s.time} parallel={s.parallel} last={i === d.timeline.length - 1}>{s.text}</TimelineStep>)}
            </Timeline>
          </div>
        </Disclosure>
        {d.provenance ? (
          <Disclosure label="Show where every number came from">
            <DataTable dense rowKey="field" rows={d.provenance}
              columns={[
                { key: 'field', label: 'Field', render: (p) => <span>{p.field}{p.calc ? <span style={{ marginLeft: 8, font: '500 12px/1 var(--font-sans)', color: 'var(--text-3)' }}>Calculated</span> : null}</span> },
                { key: 'file', label: 'Value in the file', render: (p) => <span style={{ fontFamily: p.file === '—' ? undefined : 'var(--font-mono)', fontSize: 13, color: 'var(--text-2)' }}>{p.file}</span> },
                { key: 'used', label: 'Value used', render: (p) => p.n && d.sources[p.n] ? <NumberLink id={p.n} hlKey={p.n} value={p.used} hovered={hover === p.n} active={srcId === p.n} onOpen={setSrcId} onHover={setHover} /> : <span style={{ fontWeight: 600 }}>{p.used}</span> },
                { key: 'by', label: 'What changed it', small: true, render: (p) => <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><KindBadge kind={p.kind} />{p.by}</span> },
              ]} />
          </Disclosure>
        ) : null}
      </section>
      <SourcePanel src={src} onClose={() => setSrcId(null)} />
    </div>
  );
}


