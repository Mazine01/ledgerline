import { Router } from 'express';
import { and, asc, eq, gte, lt, sql, sum } from 'drizzle-orm';
import { z } from 'zod';
import { monthSchema, type CategoryIcon, type MonthSummary, type TrendPoint } from '@ledgerline/shared';
import { db } from '../../db/index.js';
import { budgets, categories, transactions } from '../../db/schema.js';
import { userId } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { monthRange } from '../transactions/transactions.service.js';

export const reportsRouter = Router();

const currentMonth = () => new Date().toISOString().slice(0, 7);
const toInt = (v: string | number | null | undefined) => Number(v ?? 0);

/** Totals, a day-by-day series and spending per category for one month. */
reportsRouter.get('/summary', validate(z.object({ month: monthSchema.default(currentMonth) }), 'query'), async (_req, res) => {
  const uid = userId(res);
  const month: string = res.locals.query.month;
  const { start, end, days } = monthRange(month);
  const inMonth = and(eq(transactions.userId, uid), gte(transactions.occurredOn, start), lt(transactions.occurredOn, end));

  const [dailyRows, catRows, budgetRows] = await Promise.all([
    db
      .select({
        day: sql<number>`extract(day from ${transactions.occurredOn})::int`,
        type: transactions.type,
        total: sum(transactions.amountCents),
        n: sql<number>`count(*)::int`,
      })
      .from(transactions)
      .where(inMonth)
      .groupBy(sql`1`, transactions.type),
    db
      .select({
        categoryId: categories.id,
        name: categories.name,
        color: categories.color,
        icon: categories.icon,
        total: sum(transactions.amountCents),
      })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(inMonth, eq(transactions.type, 'EXPENSE')))
      .groupBy(categories.id),
    db
      .select({ categoryId: budgets.categoryId, limitCents: budgets.limitCents, name: categories.name, color: categories.color, icon: categories.icon })
      .from(budgets)
      .innerJoin(categories, eq(budgets.categoryId, categories.id))
      .where(and(eq(budgets.userId, uid), eq(budgets.month, month))),
  ]);

  const daily = Array.from({ length: days }, (_, i) => ({ day: i + 1, incomeCents: 0, expenseCents: 0 }));
  let incomeCents = 0;
  let expenseCents = 0;
  let transactionCount = 0;
  for (const r of dailyRows) {
    const total = toInt(r.total);
    const slot = daily[r.day - 1];
    if (r.type === 'INCOME') {
      slot.incomeCents += total;
      incomeCents += total;
    } else {
      slot.expenseCents += total;
      expenseCents += total;
    }
    transactionCount += r.n;
  }

  // Categories with spending, plus budgeted categories with no spending yet.
  const byId = new Map<number, MonthSummary['byCategory'][number]>();
  for (const r of catRows) {
    byId.set(r.categoryId, { categoryId: r.categoryId, name: r.name, color: r.color, icon: r.icon as CategoryIcon, expenseCents: toInt(r.total), budgetCents: null });
  }
  for (const b of budgetRows) {
    const row = byId.get(b.categoryId) ?? { categoryId: b.categoryId, name: b.name, color: b.color, icon: b.icon as CategoryIcon, expenseCents: 0, budgetCents: null };
    row.budgetCents = b.limitCents;
    byId.set(b.categoryId, row);
  }
  const byCategory = [...byId.values()].sort((a, b) => b.expenseCents - a.expenseCents || a.name.localeCompare(b.name));

  const body: MonthSummary = { month, incomeCents, expenseCents, netCents: incomeCents - expenseCents, daily, byCategory, transactionCount };
  res.json({ data: body });
});

/** Income vs spending for the last N months, ending with `end` (default this month). */
reportsRouter.get(
  '/trend',
  validate(z.object({ months: z.coerce.number().int().min(2).max(24).default(6), end: monthSchema.default(currentMonth) }), 'query'),
  async (_req, res) => {
    const { months, end } = res.locals.query as { months: number; end: string };
    const [y, m] = end.split('-').map(Number);
    const list = Array.from({ length: months }, (_, i) => new Date(Date.UTC(y, m - months + i, 1)).toISOString().slice(0, 7));
    const from = `${list[0]}-01`;
    const to = monthRange(end).end;

    const rows = await db
      .select({
        month: sql<string>`to_char(${transactions.occurredOn}, 'YYYY-MM')`,
        type: transactions.type,
        total: sum(transactions.amountCents),
      })
      .from(transactions)
      .where(and(eq(transactions.userId, userId(res)), gte(transactions.occurredOn, from), lt(transactions.occurredOn, to)))
      .groupBy(sql`1`, transactions.type)
      .orderBy(asc(sql`1`));

    const points: TrendPoint[] = list.map((month) => ({ month, incomeCents: 0, expenseCents: 0 }));
    for (const r of rows) {
      const p = points.find((x) => x.month === r.month);
      if (p) p[r.type === 'INCOME' ? 'incomeCents' : 'expenseCents'] = toInt(r.total);
    }
    res.json({ data: points });
  },
);
