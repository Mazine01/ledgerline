import { useEffect, useState } from 'react';
import type { BudgetRow, Currency } from '@ledgerline/shared';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { CategoryIcon } from '../../components/CategoryIcon';
import { MonthPicker } from '../../components/MonthPicker';
import { ApiError } from '../../lib/api';
import { centsToInput, money, monthLabel, shiftMonth } from '../../lib/format';
import { api } from '../../lib/api';
import { useBudgets, useMe, useSaveBudgets } from '../../lib/queries';
import { useMonth } from '../../lib/useMonth';

export function BudgetsPage() {
  const { data: me } = useMe();
  const currency = me?.currency ?? 'USD';
  const { month, setMonth } = useMonth();
  const { data: rows, isLoading } = useBudgets(month);
  const save = useSaveBudgets();
  const toast = useToast();

  // Draft limits as typed, keyed by category; saved together.
  const [draft, setDraft] = useState<Record<number, string>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  useEffect(() => {
    if (rows) setDraft(Object.fromEntries(rows.map((r) => [r.categoryId, r.limitCents === null ? '' : centsToInput(r.limitCents)])));
    setErrors({});
  }, [rows]);

  const changed = rows?.filter((r) => (draft[r.categoryId] ?? '') !== (r.limitCents === null ? '' : centsToInput(r.limitCents))) ?? [];
  const budgeted = rows?.filter((r) => r.limitCents !== null) ?? [];
  const totalLimit = budgeted.reduce((a, r) => a + (r.limitCents ?? 0), 0);
  const totalSpent = budgeted.reduce((a, r) => a + r.spentCents, 0);

  const submit = () => {
    const bad: Record<number, string> = {};
    for (const r of changed) {
      const v = (draft[r.categoryId] ?? '').trim();
      if (v && (!/^\d[\d,]*(\.\d{1,2})?$/.test(v) || Number(v.replace(/,/g, '')) <= 0)) bad[r.categoryId] = 'Enter an amount above 0, or leave empty';
    }
    setErrors(bad);
    if (Object.keys(bad).length) return;
    save.mutate(
      { month, items: changed.map((r) => ({ categoryId: r.categoryId, limit: (draft[r.categoryId] ?? '').trim() || null })) },
      {
        onSuccess: () => toast(`Budgets for ${monthLabel(month)} saved.`),
        onError: (e) => toast(e instanceof ApiError ? e.message : 'Saving failed. Try again.', { tone: 'error' }),
      },
    );
  };

  const copyLastMonth = async () => {
    const prev = await api<{ data: BudgetRow[] }>('/api/budgets', { query: { month: shiftMonth(month, -1) } });
    const found = prev.data.filter((r) => r.limitCents !== null);
    if (!found.length) {
      toast(`No budgets were set in ${monthLabel(shiftMonth(month, -1))}.`);
      return;
    }
    setDraft((d) => ({ ...d, ...Object.fromEntries(found.map((r) => [r.categoryId, centsToInput(r.limitCents!)])) }));
    toast(`Copied ${found.length} budgets. Review them, then save.`);
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Budgets</h1>
          <p className="mt-1 text-sm text-ink-muted">Set a monthly limit for the categories you want to watch. Leave the rest empty.</p>
        </div>
        <MonthPicker month={month} onChange={setMonth} />
      </div>

      {budgeted.length > 0 && (
        <section aria-label="Budget total" className="mt-6 rounded-panel border border-rule bg-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm text-ink-muted">Spent across budgeted categories</p>
            <p className="tabular text-sm">
              <span className="text-xl font-bold">{money(totalSpent, currency)}</span>
              <span className="text-ink-muted"> of {money(totalLimit, currency)}</span>
            </p>
          </div>
          <Meter spent={totalSpent} limit={totalLimit} large />
        </section>
      )}

      <div className="mt-6 overflow-hidden rounded-panel border border-rule bg-surface">
        {isLoading && <div className="h-96 animate-pulse bg-sunken" aria-hidden="true" />}
        <ul className="divide-y divide-rule">
          {rows?.map((r) => (
            <BudgetLine
              key={r.categoryId}
              row={r}
              currency={currency}
              value={draft[r.categoryId] ?? ''}
              error={errors[r.categoryId]}
              onChange={(v) => setDraft((d) => ({ ...d, [r.categoryId]: v }))}
            />
          ))}
        </ul>
      </div>

      <div className="sticky bottom-20 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-panel border border-rule bg-surface/95 p-3 shadow-panel backdrop-blur lg:bottom-6">
        <Button variant="ghost" onClick={copyLastMonth}>Copy last month’s budgets</Button>
        <div className="flex items-center gap-3">
          {changed.length > 0 && <span className="text-sm text-ink-muted">{changed.length} unsaved</span>}
          <Button variant="primary" disabled={!changed.length} loading={save.isPending} onClick={submit}>
            Save budgets
          </Button>
        </div>
      </div>
    </>
  );
}

function BudgetLine({ row, currency, value, error, onChange }: { row: BudgetRow; currency: Currency; value: string; error?: string; onChange: (v: string) => void }) {
  const id = `budget-${row.categoryId}`;
  return (
    <li className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 px-4 py-4 sm:grid-cols-[auto_1fr_200px] sm:px-6">
      <CategoryIcon icon={row.icon} color={row.color} />
      <div className="min-w-0">
        <label htmlFor={id} className="font-medium">{row.name}</label>
        <p className="tabular text-sm text-ink-muted">
          {money(row.spentCents, currency)} spent
          {row.limitCents !== null && (row.spentCents > row.limitCents
            ? <span className="font-semibold text-expense">, {money(row.spentCents - row.limitCents, currency)} over</span>
            : <span>, {money(row.limitCents - row.spentCents, currency)} left</span>)}
        </p>
        {row.limitCents !== null && <Meter spent={row.spentCents} limit={row.limitCents} />}
      </div>
      <div className="col-span-2 sm:col-span-1">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">{currency}</span>
          <input
            id={id}
            inputMode="decimal"
            placeholder="No limit"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={error ? true : undefined}
            className={`tabular h-10 w-full rounded-control border bg-surface pl-14 pr-3 text-right text-base font-semibold placeholder:font-normal placeholder:text-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-ink/15 sm:text-sm ${error ? 'border-danger' : 'border-rule-strong focus:border-ink'}`}
          />
        </div>
        {error && <p role="alert" className="mt-1 text-xs text-danger">{error}</p>}
      </div>
    </li>
  );
}

function Meter({ spent, limit, large }: { spent: number; limit: number; large?: boolean }) {
  const pct = limit ? spent / limit : 0;
  const tone = pct > 1 ? 'bg-expense' : pct >= 0.8 ? 'bg-budget' : 'bg-income';
  return (
    <div className={`mt-2 overflow-hidden rounded-full bg-sunken ${large ? 'h-3' : 'h-1.5'}`} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct * 100)} aria-label={`${Math.round(pct * 100)}% of budget used`}>
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(pct, 1) * 100}%` }} />
    </div>
  );
}
