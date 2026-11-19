import { Router } from 'express';
import { and, asc, eq, gte, inArray, lt, sum } from 'drizzle-orm';
import { z } from 'zod';
import { budgetsPutSchema, monthSchema, type BudgetRow, type CategoryIcon } from '@ledgerline/shared';
import { db } from '../../db/index.js';
import { budgets, categories, transactions } from '../../db/schema.js';
import { AppError } from '../../lib/errors.js';
import { userId } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { monthRange } from '../transactions/transactions.service.js';

export const budgetsRouter = Router();

async function budgetRows(uid: number, month: string): Promise<BudgetRow[]> {
  const { start, end } = monthRange(month);
  const [cats, limits, spent] = await Promise.all([
    db
      .select()
      .from(categories)
      .where(and(eq(categories.userId, uid), eq(categories.type, 'EXPENSE')))
      .orderBy(asc(categories.name)),
    db.select().from(budgets).where(and(eq(budgets.userId, uid), eq(budgets.month, month))),
    db
      .select({ categoryId: transactions.categoryId, total: sum(transactions.amountCents) })
      .from(transactions)
      .where(
        and(eq(transactions.userId, uid), eq(transactions.type, 'EXPENSE'), gte(transactions.occurredOn, start), lt(transactions.occurredOn, end)),
      )
      .groupBy(transactions.categoryId),
  ]);
  const limitBy = new Map(limits.map((l) => [l.categoryId, l.limitCents]));
  const spentBy = new Map(spent.map((s) => [s.categoryId, Number(s.total ?? 0)]));
  return cats.map((c) => ({
    categoryId: c.id,
    name: c.name,
    color: c.color,
    icon: c.icon as CategoryIcon,
    limitCents: limitBy.get(c.id) ?? null,
    spentCents: spentBy.get(c.id) ?? 0,
  }));
}

budgetsRouter.get('/', validate(z.object({ month: monthSchema }), 'query'), async (_req, res) => {
  res.json({ data: await budgetRows(userId(res), res.locals.query.month) });
});

/** Sets (or clears, with null) the limit for each category listed, in one transaction. */
budgetsRouter.put('/', validate(budgetsPutSchema), async (_req, res) => {
  const uid = userId(res);
  const { month, items } = res.locals.body as z.output<typeof budgetsPutSchema>;

  const ids = [...new Set(items.map((i) => i.categoryId))];
  if (ids.length) {
    const own = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.userId, uid), eq(categories.type, 'EXPENSE'), inArray(categories.id, ids)));
    if (own.length !== ids.length) throw AppError.badRequest('Budgets can only be set on your own expense categories');
  }

  await db.transaction(async (tx) => {
    for (const item of items) {
      if (item.limit === null) {
        await tx
          .delete(budgets)
          .where(and(eq(budgets.userId, uid), eq(budgets.categoryId, item.categoryId), eq(budgets.month, month)));
      } else {
        await tx
          .insert(budgets)
          .values({ userId: uid, categoryId: item.categoryId, month, limitCents: item.limit })
          .onConflictDoUpdate({
            target: [budgets.userId, budgets.categoryId, budgets.month],
            set: { limitCents: item.limit },
          });
      }
    }
  });

  res.json({ data: await budgetRows(uid, month) });
});
