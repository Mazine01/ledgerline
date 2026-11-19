import { and, count, desc, eq, gte, ilike, lt, type SQL } from 'drizzle-orm';
import type { CategoryIcon, Transaction, TransactionPayload, transactionQuerySchema } from '@ledgerline/shared';
import type { z } from 'zod';
import { db } from '../../db/index.js';
import { categories, transactions } from '../../db/schema.js';
import { AppError } from '../../lib/errors.js';
import { assertOwnCategory } from '../categories/categories.service.js';

type Query = z.output<typeof transactionQuerySchema>;

/** First day of the month and first day of the next one, for half-open date ranges. */
export function monthRange(month: string) {
  const [y, m] = month.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10);
  const end = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
  return { start, end, days: new Date(Date.UTC(y, m, 0)).getUTCDate() };
}

const likeEscape = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

const select = {
  tx: transactions,
  category: { id: categories.id, name: categories.name, color: categories.color, icon: categories.icon },
};

function serialize(r: { tx: typeof transactions.$inferSelect; category: { id: number; name: string; color: string; icon: string } }): Transaction {
  return {
    id: r.tx.id,
    type: r.tx.type,
    amountCents: r.tx.amountCents,
    occurredOn: r.tx.occurredOn,
    note: r.tx.note,
    category: { ...r.category, icon: r.category.icon as CategoryIcon },
    createdAt: r.tx.createdAt.toISOString(),
  };
}

function where(userId: number, q: Partial<Query>): SQL | undefined {
  const parts: (SQL | undefined)[] = [eq(transactions.userId, userId)];
  if (q.month) {
    const { start, end } = monthRange(q.month);
    parts.push(gte(transactions.occurredOn, start), lt(transactions.occurredOn, end));
  }
  if (q.type) parts.push(eq(transactions.type, q.type));
  if (q.categoryId) parts.push(eq(transactions.categoryId, q.categoryId));
  if (q.search) parts.push(ilike(transactions.note, `%${likeEscape(q.search)}%`));
  return and(...parts);
}

const base = () => db.select(select).from(transactions).innerJoin(categories, eq(transactions.categoryId, categories.id));
const newestFirst = [desc(transactions.occurredOn), desc(transactions.id)];

export async function listTransactions(userId: number, q: Query) {
  const w = where(userId, q);
  const [rows, [{ total }]] = await Promise.all([
    base()
      .where(w)
      .orderBy(...newestFirst)
      .limit(q.limit)
      .offset((q.page - 1) * q.limit),
    db.select({ total: count() }).from(transactions).where(w),
  ]);
  return { data: rows.map(serialize), meta: { page: q.page, limit: q.limit, total, pages: Math.max(1, Math.ceil(total / q.limit)) } };
}

export async function exportTransactions(userId: number, q: Partial<Query>) {
  const rows = await base()
    .where(where(userId, q))
    .orderBy(...newestFirst)
    .limit(20000);
  return rows.map(serialize);
}

/** Owner-scoped lookup. Someone else's id gives the same 404 as a missing one. */
export async function getTransaction(userId: number, id: number) {
  const [row] = await base().where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
  if (!row) throw AppError.notFound('Transaction');
  return serialize(row);
}

export async function createTransaction(userId: number, p: TransactionPayload) {
  await assertOwnCategory(userId, p.categoryId, p.type);
  const [{ id }] = await db
    .insert(transactions)
    .values({ userId, type: p.type, amountCents: p.amount, categoryId: p.categoryId, occurredOn: p.occurredOn, note: p.note || null })
    .returning({ id: transactions.id });
  return getTransaction(userId, id);
}

export async function updateTransaction(userId: number, id: number, p: Partial<TransactionPayload>) {
  const current = await getTransaction(userId, id);
  const type = p.type ?? current.type;
  const categoryId = p.categoryId ?? current.category.id;
  // Changing the type alone must still leave a category of the matching type.
  if (p.type !== undefined || p.categoryId !== undefined) await assertOwnCategory(userId, categoryId, type);

  const values: Partial<typeof transactions.$inferInsert> = {};
  if (p.type !== undefined) values.type = p.type;
  if (p.amount !== undefined) values.amountCents = p.amount;
  if (p.categoryId !== undefined) values.categoryId = p.categoryId;
  if (p.occurredOn !== undefined) values.occurredOn = p.occurredOn;
  if (p.note !== undefined) values.note = p.note || null;
  if (Object.keys(values).length) {
    await db
      .update(transactions)
      .set(values)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
  }
  return getTransaction(userId, id);
}

export async function deleteTransaction(userId: number, id: number) {
  const rows = await db
    .delete(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .returning({ id: transactions.id });
  if (!rows.length) throw AppError.notFound('Transaction');
}

function csvCell(v: string | number | null) {
  let s = v === null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function toCsv(rows: Transaction[]) {
  const head = ['Date', 'Type', 'Category', 'Amount', 'Note'].map(csvCell).join(',');
  const body = rows.map((t) =>
    [t.occurredOn, t.type === 'INCOME' ? 'Income' : 'Expense', t.category.name, (t.amountCents / 100).toFixed(2), t.note]
      .map(csvCell)
      .join(','),
  );
  return [head, ...body].join('\r\n') + '\r\n';
}
