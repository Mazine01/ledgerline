import type { Currency, TrendPoint } from '@ledgerline/shared';
import { money, monthLabel } from '../../lib/format';

export function Trend({ points, currency, selected, onSelect }: { points: TrendPoint[]; currency: Currency; selected: string; onSelect: (m: string) => void }) {
  const max = Math.max(...points.flatMap((p) => [p.incomeCents, p.expenseCents]), 1);

  return (
    <figure className="rounded-panel border border-rule bg-surface p-5 sm:p-6">
      <figcaption className="flex items-baseline justify-between gap-4">
        <h2 className="font-semibold">Last 6 months</h2>
        <span className="text-xs text-ink-muted">Select a month to open it</span>
      </figcaption>
      <div className="mt-5 grid h-[188px] grid-cols-6 items-end gap-2 border-b border-rule-strong sm:gap-4">
        {points.map((p) => {
          const isSel = p.month === selected;
          return (
            <button
              key={p.month}
              type="button"
              onClick={() => onSelect(p.month)}
              aria-pressed={isSel}
              aria-label={`${monthLabel(p.month)}: in ${money(p.incomeCents, currency)}, out ${money(p.expenseCents, currency)}`}
              className={`group flex h-full items-end justify-center gap-1 rounded-t-md px-1 pt-2 transition-colors ${isSel ? 'bg-sunken' : 'hover:bg-sunken/60'}`}
            >
              <span className="w-1/2 max-w-[22px] rounded-t-[3px] bg-income" style={{ height: `${(p.incomeCents / max) * 100}%` }} />
              <span className="w-1/2 max-w-[22px] rounded-t-[3px] bg-expense" style={{ height: `${(p.expenseCents / max) * 100}%` }} />
            </button>
          );
        })}
      </div>
      <div className="mt-2 grid grid-cols-6 gap-2 text-center sm:gap-4">
        {points.map((p) => {
          const net = p.incomeCents - p.expenseCents;
          return (
            <div key={p.month}>
              <p className={`text-xs ${p.month === selected ? 'font-semibold text-ink' : 'text-ink-muted'}`}>{monthLabel(p.month, 'short')}</p>
              <p className={`tabular mt-0.5 text-[11px] font-semibold sm:text-xs ${net >= 0 ? 'text-income' : 'text-expense'}`}>
                {money(net, currency, { compact: true, signed: true })}
              </p>
            </div>
          );
        })}
      </div>
    </figure>
  );
}
