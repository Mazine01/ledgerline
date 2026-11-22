import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { Trash2 } from 'lucide-react';
import type { Transaction, TxType } from '@ledgerline/shared';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog, Drawer } from '../../components/ui/Dialogs';
import { TextField } from '../../components/ui/Field';
import { useToast } from '../../components/ui/Toast';
import { CategoryIcon } from '../../components/CategoryIcon';
import { ApiError } from '../../lib/api';
import { centsToInput, money, today } from '../../lib/format';
import { useCategories, useDeleteTransaction, useMe, useSaveTransaction, type TxBody } from '../../lib/queries';

type Open = (opts?: { type?: TxType; transaction?: Transaction }) => void;
const EditorContext = createContext<Open | null>(null);

export function useTransactionEditor() {
  const open = useContext(EditorContext);
  if (!open) throw new Error('useTransactionEditor needs <TransactionEditorProvider>');
  return open;
}

export function TransactionEditorProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ open: boolean; type: TxType; transaction?: Transaction; key: number }>({
    open: false,
    type: 'EXPENSE',
    key: 0,
  });
  const open = useCallback<Open>(
    (opts = {}) =>
      setState((s) => ({ open: true, type: opts.transaction?.type ?? opts.type ?? 'EXPENSE', transaction: opts.transaction, key: s.key + 1 })),
    [],
  );
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), []);

  return (
    <EditorContext.Provider value={open}>
      {children}
      <TransactionDrawer key={state.key} open={state.open} type={state.type} transaction={state.transaction} onClose={close} />
    </EditorContext.Provider>
  );
}

interface FormValues {
  type: TxType;
  amount: string;
  categoryId: string;
  occurredOn: string;
  note: string;
}

const FORM_ID = 'transaction-form';

function TransactionDrawer({ open, type, transaction, onClose }: { open: boolean; type: TxType; transaction?: Transaction; onClose: () => void }) {
  const toast = useToast();
  const { data: me } = useMe();
  const { data: categories = [] } = useCategories();
  const save = useSaveTransaction();
  const remove = useDeleteTransaction();
  const [confirm, setConfirm] = useState(false);
  const editing = Boolean(transaction);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: transaction
      ? {
          type: transaction.type,
          amount: centsToInput(transaction.amountCents),
          categoryId: String(transaction.category.id),
          occurredOn: transaction.occurredOn,
          note: transaction.note ?? '',
        }
      : { type, amount: '', categoryId: '', occurredOn: today(), note: '' },
  });

  const currentType = watch('type');
  const categoryId = watch('categoryId');
  const options = useMemo(() => categories.filter((c) => c.type === currentType), [categories, currentType]);

  // Switching between expense and income clears a category of the other type.
  useEffect(() => {
    if (categoryId && !options.some((c) => String(c.id) === categoryId)) setValue('categoryId', '');
  }, [options, categoryId, setValue]);

  useEffect(() => {
    if (open) setTimeout(() => setFocus('amount'), 50);
  }, [open, setFocus]);

  const onSubmit = handleSubmit(async (v) => {
    if (!v.categoryId) {
      setError('categoryId', { message: 'Choose a category' });
      return;
    }
    const body: TxBody = { type: v.type, amount: v.amount, categoryId: Number(v.categoryId), occurredOn: v.occurredOn, note: v.note };
    try {
      const saved = await save.mutateAsync({ id: transaction?.id, body });
      toast(
        editing
          ? 'Transaction updated.'
          : `${saved.type === 'INCOME' ? 'Income' : 'Expense'} of ${money(saved.amountCents, me?.currency ?? 'USD')} added.`,
      );
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.fields) {
        for (const [field, message] of Object.entries(e.fields)) setError(field as keyof FormValues, { message });
      } else toast((e as Error).message, { tone: 'error' });
    }
  });

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={(o) => !o && onClose()}
        title={editing ? 'Edit transaction' : currentType === 'INCOME' ? 'Add income' : 'Add expense'}
        footer={
          <div className="flex w-full items-center justify-between gap-2">
            {editing ? (
              <Button variant="ghost" onClick={() => setConfirm(true)} className="-ml-2 !text-danger hover:!bg-danger-soft">
                <Trash2 size={16} aria-hidden="true" />
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button onClick={onClose}>Cancel</Button>
              <Button type="submit" form={FORM_ID} variant="primary" loading={save.isPending}>
                {editing ? 'Save changes' : currentType === 'INCOME' ? 'Add income' : 'Add expense'}
              </Button>
            </div>
          </div>
        }
      >
        <form id={FORM_ID} onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
          <fieldset>
            <legend className="sr-only">Type</legend>
            <div className="grid grid-cols-2 gap-1 rounded-control bg-sunken p-1">
              {(['EXPENSE', 'INCOME'] as const).map((t) => (
                <label
                  key={t}
                  className={`flex h-10 cursor-pointer items-center justify-center rounded-[6px] text-sm font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink ${
                    currentType === t
                      ? t === 'EXPENSE'
                        ? 'bg-surface text-expense shadow-sm'
                        : 'bg-surface text-income shadow-sm'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  <input type="radio" value={t} className="sr-only" {...register('type')} />
                  {t === 'EXPENSE' ? 'Money out' : 'Money in'}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="amount" className="text-sm font-medium">
              Amount <span className="text-ink-muted">({me?.currency ?? 'USD'})</span>
            </label>
            <input
              id="amount"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              aria-invalid={errors.amount ? true : undefined}
              aria-describedby={errors.amount ? 'amount-error' : undefined}
              className={`tabular mt-1.5 h-16 w-full rounded-control border bg-surface px-4 text-[32px] font-bold tracking-tight placeholder:text-rule-strong focus:outline-none focus:ring-2 ${
                currentType === 'INCOME' ? 'text-income focus:ring-income/30' : 'text-expense focus:ring-expense/30'
              } ${errors.amount ? 'border-danger' : 'border-rule-strong focus:border-ink'}`}
              {...register('amount', {
                required: 'Enter an amount',
                validate: (v) => {
                  const n = Number(v.replace(/,/g, ''));
                  if (!Number.isFinite(n) || n <= 0) return 'Enter an amount above 0, like 12.50';
                  if (!/^\d[\d,]*(\.\d{1,2})?$/.test(v.trim())) return 'Use at most 2 decimal places';
                  return true;
                },
              })}
            />
            {errors.amount && (
              <p id="amount-error" role="alert" className="mt-1.5 text-sm text-danger">
                {errors.amount.message}
              </p>
            )}
          </div>

          <fieldset>
            <legend className="text-sm font-medium">Category</legend>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {options.map((c) => (
                <label
                  key={c.id}
                  className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-control border px-1 py-2.5 text-center text-xs font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink ${
                    categoryId === String(c.id) ? 'border-ink bg-sunken' : 'border-rule hover:border-rule-strong'
                  }`}
                >
                  <input type="radio" value={c.id} className="sr-only" {...register('categoryId')} />
                  <CategoryIcon icon={c.icon} color={c.color} size={32} />
                  <span className="line-clamp-1">{c.name}</span>
                </label>
              ))}
            </div>
            {errors.categoryId && (
              <p role="alert" className="mt-1.5 text-sm text-danger">
                {errors.categoryId.message}
              </p>
            )}
          </fieldset>

          <div className="grid grid-cols-2 gap-4">
            <TextField label="Date" type="date" max={today()} error={errors.occurredOn?.message} {...register('occurredOn', { required: 'Pick a date' })} />
            <TextField label="Note (optional)" placeholder="e.g. Lunch" maxLength={200} error={errors.note?.message} {...register('note')} />
          </div>
        </form>
      </Drawer>

      {transaction && (
        <ConfirmDialog
          open={confirm}
          onOpenChange={setConfirm}
          title="Delete this transaction?"
          body={`${money(transaction.amountCents, me?.currency ?? 'USD')} in ${transaction.category.name} on ${transaction.occurredOn}. This can’t be undone.`}
          confirmLabel="Delete transaction"
          loading={remove.isPending}
          onConfirm={() =>
            remove.mutate(transaction.id, {
              onSuccess: () => {
                setConfirm(false);
                onClose();
                toast('Transaction deleted.');
              },
              onError: (e) => toast(e.message, { tone: 'error' }),
            })
          }
        />
      )}
    </>
  );
}
