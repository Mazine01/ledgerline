import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, Plus, Search } from 'lucide-react';
import type { TxType } from '@ledgerline/shared';
import { Button } from '../../components/ui/Button';
import { FilterSelect } from '../../components/ui/Field';
import { MonthPicker } from '../../components/MonthPicker';
import { TransactionList } from '../../components/TransactionList';
import { apiUrl } from '../../lib/api';
import { money, monthLabel } from '../../lib/format';
import { useCategories, useMe, useSummary, useTransactions } from '../../lib/queries';
import { useMonth } from '../../lib/useMonth';
import { useTransactionEditor } from './TransactionEditor';

export function TransactionsPage() {
  const { data: me } = useMe();
  const currency = me?.currency ?? 'USD';
  const { month, setMonth } = useMonth();
  const [params, setParams] = useSearchParams();
  const openEditor = useTransactionEditor();
  const { data: categories = [] } = useCategories();
  const summary = useSummary(month);

  const type = (params.get('type') as TxType | null) ?? undefined;
  const categoryId = Number(params.get('category')) || undefined;
  const search = params.get('q') ?? '';
  const page = Number(params.get('page')) || 1;

  const set = (patch: Record<string, string | undefined>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
        if (!('page' in patch)) next.delete('page');
        return next;
      },
      { replace: true },
    );

  const [searchText, setSearchText] = useState(search);
  useEffect(() => {
    if (searchText === search) return;
    const t = setTimeout(() => set({ q: searchText.trim() || undefined }), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  const query = { month, type, categoryId, search: search || undefined, page, limit: 50 };
  const list = useTransactions(query);
  const filtered = Boolean(type || categoryId || search);
  const meta = list.data?.meta;
  const visibleCats = categories.filter((c) => !type || c.type === type);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
        <div className="flex flex-wrap gap-2">
          <MonthPicker month={month} onChange={setMonth} />
          <a
            href={apiUrl('/api/transactions/export.csv', { month, type, categoryId, search: search || undefined })}
            download
            className="inline-flex h-10 items-center gap-2 rounded-control border border-rule-strong bg-surface px-3 text-sm font-semibold hover:bg-sunken"
          >
            <Download size={16} aria-hidden="true" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sr-only sm:hidden">Export CSV</span>
          </a>
        </div>
      </div>

      {summary.data && (
        <p className="tabular mt-2 text-sm text-ink-muted">
          {monthLabel(month)}: <span className="font-semibold text-income">{money(summary.data.incomeCents, currency)}</span> in,{' '}
          <span className="font-semibold text-expense">{money(summary.data.expenseCents, currency)}</span> out
        </p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-2 sm:flex">
        <div className="relative col-span-2 sm:w-72">
          <label htmlFor="tx-search" className="sr-only">Search notes</label>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
          <input
            id="tx-search"
            type="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search notes"
            className="h-10 w-full rounded-control border border-rule-strong bg-surface pl-9 pr-3 text-base placeholder:text-ink-muted/70 focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/15 sm:text-sm"
          />
        </div>
        <FilterSelect label="Type" className="sm:w-40" value={type ?? ''} onChange={(e) => set({ type: e.target.value || undefined, category: undefined })}>
          <option value="">In and out</option>
          <option value="EXPENSE">Money out</option>
          <option value="INCOME">Money in</option>
        </FilterSelect>
        <FilterSelect label="Category" className="sm:w-48" value={categoryId ?? ''} onChange={(e) => set({ category: e.target.value || undefined })}>
          <option value="">All categories</option>
          {visibleCats.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </FilterSelect>
      </div>

      <div className="mt-6" aria-busy={list.isFetching}>
        {list.isLoading ? (
          <div className="h-80 animate-pulse rounded-panel bg-sunken" aria-hidden="true" />
        ) : list.error ? (
          <p className="rounded-panel bg-danger-soft p-5 text-danger">Transactions didn’t load. {list.error.message}</p>
        ) : list.data && list.data.data.length > 0 ? (
          <div className={list.isPlaceholderData ? 'opacity-60' : ''}>
            <TransactionList items={list.data.data} currency={currency} />
          </div>
        ) : (
          <div className="flex flex-col items-center rounded-panel border border-dashed border-rule-strong bg-surface px-6 py-14 text-center">
            <p className="font-semibold">{filtered ? 'Nothing matches these filters.' : `No transactions in ${monthLabel(month)}.`}</p>
            <p className="mt-1 text-sm text-ink-muted">{filtered ? 'Try another category or clear the search.' : 'Add one and it shows up here.'}</p>
            {filtered ? (
              <Button className="mt-5" onClick={() => { setSearchText(''); set({ type: undefined, category: undefined, q: undefined }); }}>
                Clear filters
              </Button>
            ) : (
              <Button variant="primary" className="mt-5" onClick={() => openEditor()}>
                <Plus size={16} aria-hidden="true" />
                Add transaction
              </Button>
            )}
          </div>
        )}
      </div>

      {meta && meta.pages > 1 && (
        <nav aria-label="Pagination" className="mt-6 flex items-center justify-between text-sm">
          <span className="text-ink-muted">Page {meta.page} of {meta.pages}</span>
          <div className="flex gap-2">
            <Button size="sm" disabled={meta.page <= 1} onClick={() => set({ page: String(meta.page - 1) })}>Previous</Button>
            <Button size="sm" disabled={meta.page >= meta.pages} onClick={() => set({ page: String(meta.page + 1) })}>Next</Button>
          </div>
        </nav>
      )}
    </>
  );
}
