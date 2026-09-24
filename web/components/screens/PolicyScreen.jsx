'use client';
import * as React from 'react';
import { PageHeader, SectionTitle, DataTable, StatusChip, OutcomeChip, KindBadge, Callout, Mono } from '../ds';

const IF_BROKEN = {
  fail: { tone: 'stop', label: 'Fail' },
  concern: { tone: 'person', label: 'Concern' },
  na: { tone: 'neutral', label: "Can't assess" },
  setaside: { tone: 'neutral', label: 'Set aside' },
};
const card = { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)' };

export default function PolicyScreen({ policy }) {
  return (
    <div>
      <PageHeader title="Policy" subtitle="Which rules does the committee check, and what happens when one is broken?"
        meta={<>Mock policy version {policy.version} · from <Mono chip strong={false}>config/policy.json</Mono> · changing a limit needs no code change</>} />

      <Callout kind="info" title="A demo policy, not a real firm's rules" style={{ marginTop: 24, maxWidth: 820 }}>
        {policy.disclaimer} Every reviewer verdict records the exact limit it was checked against, so a decision can always be traced back to the rule that drove it.
      </Callout>

      <div style={{ marginTop: 36, display: 'grid', gap: 32 }}>
        {policy.reviewers.map((r) => (
          <section key={r.name}>
            <SectionTitle aside={<span style={{ color: 'var(--text-2)', font: 'var(--type-small)' }}>{r.job}</span>}>{r.name}</SectionTitle>
            <DataTable rowKey="key" rows={r.rules}
              columns={[
                { key: 'what', label: 'Rule', width: 230, render: (x) => <span style={{ fontWeight: 500 }}>{x.what}</span> },
                { key: 'limit', label: 'Limit', render: (x) => (
                  <div style={{ padding: '10px 0' }}>
                    <div>{x.limit}</div>
                    {x.note ? <div style={{ marginTop: 4, font: 'var(--type-small)', color: 'var(--text-2)', textWrap: 'pretty' }}>{x.note}</div> : null}
                  </div>) },
                { key: 'ifBroken', label: 'If broken', width: 140, render: (x) => <StatusChip tone={IF_BROKEN[x.ifBroken].tone} label={IF_BROKEN[x.ifBroken].label} size="sm" /> },
              ]} />
          </section>
        ))}
      </div>

      <section style={{ marginTop: 44 }}>
        <SectionTitle>How the verdicts become a decision</SectionTitle>
        <div style={{ ...card, padding: '6px 20px' }}>
          {policy.decisions.map((d, i) => (
            <div key={d.outcome} style={{ display: 'grid', gridTemplateColumns: '220px minmax(0,1fr)', gap: 16, alignItems: 'center', padding: '12px 0', borderTop: i ? '1px solid var(--border)' : 'none' }}>
              <span><OutcomeChip outcome={d.outcome} /></span>
              <span style={{ textWrap: 'pretty' }}>{d.when}</span>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 44 }}>
        <SectionTitle aside={<KindBadge kind="rule" />}>Fixed safeguards in code</SectionTitle>
        <div style={{ ...card, padding: '6px 20px' }}>
          {policy.safeguards.map((s, i) => (
            <div key={s.what} style={{ padding: '12px 0', borderTop: i ? '1px solid var(--border)' : 'none' }}>
              <div style={{ fontWeight: 500 }}>{s.what}</div>
              <div style={{ marginTop: 2, font: 'var(--type-small)', color: 'var(--text-2)', textWrap: 'pretty' }}>{s.detail}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 44, maxWidth: 900 }}>
        <SectionTitle>When a fund is reviewed again</SectionTitle>
        <p style={{ margin: '0 0 14px', color: 'var(--text-2)', textWrap: 'pretty' }}>
          An approval has no expiry date. Each decision shows the date of the data it was based on. When a newer file arrives, an update run compares it with the earlier run and reopens only the reviewers whose fields changed; everything else is carried forward, labelled as such.
        </p>
        <DataTable dense rowKey="reviewer" rows={policy.rereview}
          columns={[
            { key: 'reviewer', label: 'Reviewer reopened', width: 200, render: (x) => <span style={{ fontWeight: 500 }}>{x.reviewer}</span> },
            { key: 'fields', label: 'When any of these change', small: true },
          ]} />
      </section>
    </div>
  );
}
