import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import type { Currency, MonthSummary } from '@ledgerline/shared';
import { Button } from '../../components/ui/Button';
import { CategoryIcon } from '../../components/CategoryIcon';
import { MonthPicker } from '../../components/MonthPicker';
import { TransactionList } from '../../components/TransactionList';
import { money, monthLabel } from '../../lib/format';
import { useMe, useSummary, useTransactions, useTrend } from '../../lib/queries';
import { useMonth } from '../../lib/useMonth';
import { useTransactionEditor } from '../transactions/TransactionEditor';
import { CashFlowRibbon } from './CashFlowRibbon';
import { Trend } from './Trend';

export function OverviewPage() {
  const { data: me } = useMe();
  const currency = me?.currency ?? 'USD';
  const { month, setMonth, isCurrent } = useMonth();
  const summary = useSummary(month);
  const trend = useTrend(month);
  const recent = useTransactions({ month, limit: 6 });
  const openEditor = useTransactionEditor();

  const s = summary.data;
  const empty = s && s.transactionCount === 0;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">{isCurrent ? 'This month' : monthLabel(month)}</h1>
        <MonthPicker month={month} onChange={setMonth} />
      </div>

      {/* The answer first: what's left. */}
      <section aria-label="Month totals" className="mt-6 grid gap-6 rounded-panel bg-[rgb(20_33_43)] p-6 text-white sm:grid-cols-[1.4fr_1fr_1fr] sm:items-end sm:p-8 dark:bg-surface dark:ring-1 dark:ring-rule">
        <div>
          <p className="text-sm text-white/65 dark:text-ink-muted">
            {isCurrent ? 'Net so far this month' : s && s.netCents < 0 ? 'Overspent' : 'Left over'}
          </p>
          <p className={`tabular mt-1 text-[40px] font-bold leading-none tracking-tight sm:text-[44px] ${s && s.netCents < 0 && !isCurrent ? 'text-[#FF8A9A]' : ''}`}>
            {s ? money(s.netCents, currency, { signed: true }) : '—'}
          </p>
        </div>
        <Total label="Money in" value={s?.incomeCents} currency={currency} tone="in" />
        <Total label="Money out" value={s?.expenseCents} currency={currency} tone="out" />
      </section>

      {empty ? (
        <div className="mt-6 flex flex-col items-center rounded-panel border border-dashed border-rule-strong bg-surface px-6 py-16 text-center">
          <p className="font-semibold">Nothing recorded for {monthLabel(month)} yet.</p>
          <p className="mt-1 text-sm text-ink-muted">Add an expense or your income, and this page fills in.</p>
          <Button variant="primary" className="mt-5" onClick={() => openEditor()}>
            <Plus size={16} aria-hidden="true" />
            Add transaction
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-6">{s ? <CashFlowRibbon summary={s} currency={currency} /> : <Skeleton h={340} />}</div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_1fr]">
            {s ? <WhereItWent summary={s} currency={currency} /> : <Skeleton h={360} />}
            {trend.data ? <Trend points={trend.data} currency={currency} selected={month} onSelect={setMonth} /> : <Skeleton h={300} />}
          </div>

          <section className="mt-8" aria-labelledby="recent-heading">
            <div className="flex items-baseline justify-between">
              <h2 id="recent-heading" className="font-semibold">Latest</h2>
              <Link to={`/transactions${isCurrent ? '' : `?month=${month}`}`} className="text-sm font-semibold underline underline-offset-2">
                All {s?.transactionCount ?? ''} transactions
              </Link>
            </div>
            <div className="mt-3">{recent.data && <TransactionList items={recent.data.data} currency={currency} />}</div>
          </section>
        </>
      )}
    </>
  );
}

function Total({ label, value, currency, tone }: { label: string; value?: number; currency: Currency; tone: 'in' | 'out' }) {
  return (
    <div className="border-t border-white/15 pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0 dark:border-rule">
      <p className="flex items-center gap-2 text-sm text-white/65 dark:text-ink-muted">
        <span className={`h-2 w-2 rounded-full ${tone === 'in' ? 'bg-[#2BB58F]' : 'bg-[#E0566B]'}`} aria-hidden="true" />
        {label}
      </p>
      <p className="tabular mt-1 text-xl font-semibold">{value === undefined ? '—' : money(value, currency)}</p>
    </div>
  );
}

/** Spending per category, ranked, with budget status inline where a budget exists. */
function WhereItWent({ summary, currency }: { summary: MonthSummary; currency: Currency }) {
  const rows = summary.byCategory;
  const max = Math.max(...rows.map((r) => Math.max(r.expenseCents, r.budgetCents ?? 0)), 1);

  return (
    <section className="rounded-panel border border-rule bg-surface p-5 sm:p-6" aria-labelledby="where-heading">
      <div className="flex items-baseline justify-between">
        <h2 id="where-heading" className="font-semibold">Where it went</h2>
        <Link to={`/budgets${summary.month ? `?month=${summary.month}` : ''}`} className="text-sm font-semibold underline underline-offset-2">
          Budgets
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-ink-muted">No spending this month.</p>
      ) : (
        <ul className="mt-5 flex flex-col gap-4">
          {rows.map((r) => {
            const pct = r.budgetCents ? r.expenseCents / r.budgetCents : null;
            const status = pct === null ? null : pct > 1 ? 'over' : pct >= 0.8 ? 'close' : 'ok';
            return (
              <li key={r.categoryId} className="flex items-center gap-3">
                <CategoryIcon icon={r.icon} color={r.color} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate font-medium">{r.name}</span>
                    <span className="tabular shrink-0 font-semibold">{money(r.expenseCents, currency)}</span>
                  </div>
                  <div className="relative mt-1.5 h-2 rounded-full bg-sunken">
                    <div
                      className={`absolute inset-y-0 left-0 rounded-full ${status === 'over' ? 'bg-expense' : status === 'close' ? 'bg-budget' : 'bg-ink/70'}`}
                      style={{ width: `${(r.expenseCents / max) * 100}%` }}
                    />
                    {r.budgetCents !== null && (
                      <span className="absolute -inset-y-1 w-0.5 rounded bg-ink" style={{ left: `calc(${(r.budgetCents / max) * 100}% - 1px)` }} aria-hidden="true" />
                    )}
                  </div>
                  {r.budgetCents !== null && (
                    <p className={`tabular mt-1 text-xs ${status === 'over' ? 'font-semibold text-expense' : status === 'close' ? 'font-semibold text-budget-ink' : 'text-ink-muted'}`}>
                      {status === 'over'
                        ? `${money(r.expenseCents - r.budgetCents, currency)} over the ${money(r.budgetCents, currency)} budget`
                        : `${money(r.budgetCents - r.expenseCents, currency)} left of ${money(r.budgetCents, currency)}`}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-5 text-xs text-ink-muted">The black tick marks each budget.</p>
    </section>
  );
}

function Skeleton({ h }: { h: number }) {
  return <div className="animate-pulse rounded-panel bg-sunken" style={{ height: h }} aria-hidden="true" />;
}
