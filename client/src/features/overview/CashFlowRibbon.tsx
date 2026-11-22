import { useState } from 'react';
import type { Currency, MonthSummary } from '@ledgerline/shared';
import { money, monthLabel, thisMonth } from '../../lib/format';

const W = 1000;
const H = 240;
const MID = 120;
const PAD_TOP = 18;
const PAD_BOTTOM = 18;
const HALF = MID - PAD_TOP;

export function CashFlowRibbon({ summary, currency }: { summary: MonthSummary; currency: Currency }) {
  const [active, setActive] = useState<number | null>(null);
  const days = summary.daily;
  const n = days.length;
  const slot = W / n;
  const bar = Math.max(4, Math.min(18, slot * 0.62));
  const maxIn = Math.max(...days.map((d) => d.incomeCents), 1);
  const maxOut = Math.max(...days.map((d) => d.expenseCents), 1);
  const todayDay = summary.month === thisMonth() ? new Date().getUTCDate() : null;

  const runningNet = (day: number) =>
    days.slice(0, day).reduce((acc, d) => acc + d.incomeCents - d.expenseCents, 0);

  const shown = active ?? (todayDay ? todayDay : n);
  const d = days[shown - 1];
  const [y, m] = summary.month.split('-').map(Number);
  const dateText = new Date(Date.UTC(y, m - 1, shown)).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });

  return (
    <figure className="rounded-panel border border-rule bg-surface p-5 sm:p-6">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 className="font-semibold">Cash flow, day by day</h2>
        <p className="tabular text-sm text-ink-muted" aria-live="polite">
          <span className="font-semibold text-ink">{dateText}</span>
          <span className="mx-2 text-rule-strong">|</span>
          <span className="text-income">in {money(d.incomeCents, currency)}</span>
          <span className="mx-2 text-rule-strong">|</span>
          <span className="text-expense">out {money(d.expenseCents, currency)}</span>
          <span className="mx-2 text-rule-strong">|</span>
          net so far <span className="font-semibold text-ink">{money(runningNet(shown), currency, { signed: true })}</span>
        </p>
      </figcaption>

      <div className="relative mt-5">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-[200px] w-full sm:h-[240px]" preserveAspectRatio="none" role="img"
          aria-label={`Daily money in and out for ${monthLabel(summary.month)}`}
          onMouseLeave={() => setActive(null)}>
          {days.map((_, i) =>
            Math.floor(i / 7) % 2 === 1 ? <rect key={`w${i}`} x={i * slot} y={0} width={slot} height={H} className="fill-sunken/60" /> : null,
          )}
          <line x1={0} x2={W} y1={MID} y2={MID} className="stroke-rule-strong" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
          {todayDay && (
            <line x1={(todayDay - 0.5) * slot} x2={(todayDay - 0.5) * slot} y1={4} y2={H - 4} className="stroke-ink-muted" strokeDasharray="3 4" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          )}
          {days.map((day, i) => {
            const cx = i * slot + slot / 2;
            const hIn = (day.incomeCents / maxIn) * HALF;
            const hOut = (day.expenseCents / maxOut) * (H - MID - PAD_BOTTOM);
            const dim = active !== null && active !== day.day;
            const future = todayDay !== null && day.day > todayDay;
            return (
              <g key={day.day} opacity={dim ? 0.35 : future ? 0.3 : 1}>
                {day.incomeCents > 0 && (
                  <rect x={cx - bar / 2} y={MID - 2 - Math.max(hIn, 2)} width={bar} height={Math.max(hIn, 2)} rx={2} className="fill-income" />
                )}
                {day.expenseCents > 0 && (
                  <rect x={cx - bar / 2} y={MID + 2} width={bar} height={Math.max(hOut, 2)} rx={2} className="fill-expense" />
                )}
                <rect x={i * slot} y={0} width={slot} height={H} fill="transparent" onMouseEnter={() => setActive(day.day)} onClick={() => setActive(day.day)} />
              </g>
            );
          })}
        </svg>
        <span className="tabular pointer-events-none absolute left-1 top-0 rounded bg-surface/85 px-1 text-[11px] text-income">
          max {money(maxIn === 1 ? 0 : maxIn, currency, { compact: true })}
        </span>
        <span className="tabular pointer-events-none absolute bottom-0 left-1 rounded bg-surface/85 px-1 text-[11px] text-expense">
          max {money(maxOut === 1 ? 0 : maxOut, currency, { compact: true })}
        </span>
      </div>

      <div className="tabular mt-2 flex justify-between text-xs text-ink-muted" aria-hidden="true">
        {[1, 8, 15, 22, n].map((dd) => (
          <span key={dd}>{dd}</span>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-muted">
        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-income" aria-hidden="true" />Money in (above the line)</span>
        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-expense" aria-hidden="true" />Money out (below)</span>
        <span>Each half has its own scale.</span>
      </div>

      {/* Same numbers as a table, for screen readers. */}
      <table className="sr-only">
        <caption>Daily totals, {monthLabel(summary.month)}</caption>
        <thead><tr><th>Day</th><th>Money in</th><th>Money out</th></tr></thead>
        <tbody>
          {days.filter((x) => x.incomeCents || x.expenseCents).map((x) => (
            <tr key={x.day}><td>{x.day}</td><td>{money(x.incomeCents, currency)}</td><td>{money(x.expenseCents, currency)}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
