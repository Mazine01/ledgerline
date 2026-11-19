import type { Currency, Transaction } from '@ledgerline/shared';
import { dayLabel, money } from '../lib/format';
import { CategoryIcon } from './CategoryIcon';
import { useTransactionEditor } from '../features/transactions/TransactionEditor';

/** Transactions grouped under a heading per day, like a bank statement. */
export function TransactionList({ items, currency }: { items: Transaction[]; currency: Currency }) {
  const open = useTransactionEditor();
  const groups: { date: string; items: Transaction[] }[] = [];
  for (const t of items) {
    const last = groups.at(-1);
    if (last?.date === t.occurredOn) last.items.push(t);
    else groups.push({ date: t.occurredOn, items: [t] });
  }

  return (
    <div className="flex flex-col gap-5">
      {groups.map((g) => {
        const net = g.items.reduce((a, t) => a + (t.type === 'INCOME' ? t.amountCents : -t.amountCents), 0);
        return (
          <section key={g.date} aria-label={dayLabel(g.date)}>
            <div className="flex items-baseline justify-between px-1 pb-2 text-sm">
              <h3 className="font-semibold text-ink-muted">{dayLabel(g.date)}</h3>
              <span className="tabular text-xs text-ink-muted">{money(net, currency, { signed: true })}</span>
            </div>
            <ul className="divide-y divide-rule overflow-hidden rounded-panel border border-rule bg-surface">
              {g.items.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => open({ transaction: t })}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-sunken/60"
                  >
                    <CategoryIcon icon={t.category.icon} color={t.category.color} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{t.note || t.category.name}</span>
                      <span className="block truncate text-sm text-ink-muted">{t.category.name}</span>
                    </span>
                    <span className={`tabular shrink-0 font-semibold ${t.type === 'INCOME' ? 'text-income' : 'text-ink'}`}>
                      {t.type === 'INCOME' ? '+' : '−'}
                      {money(t.amountCents, currency)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
