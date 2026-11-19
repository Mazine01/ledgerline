import { and, asc, count, eq } from 'drizzle-orm';
import { DEFAULT_CATEGORIES, type Category, type CategoryIcon, type TxType } from '@ledgerline/shared';
import { db } from '../../db/index.js';
import { categories, transactions } from '../../db/schema.js';
import { AppError } from '../../lib/errors.js';

export async function createDefaultCategories(userId: number) {
  return db
    .insert(categories)
    .values(DEFAULT_CATEGORIES.map((c) => ({ ...c, userId })))
    .returning();
}

export async function listCategories(userId: number): Promise<Category[]> {
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      type: categories.type,
      color: categories.color,
      icon: categories.icon,
      transactionCount: count(transactions.id),
    })
    .from(categories)
    .leftJoin(transactions, eq(transactions.categoryId, categories.id))
    .where(eq(categories.userId, userId))
    .groupBy(categories.id)
    .orderBy(asc(categories.type), asc(categories.name));
  return rows.map((r) => ({ ...r, icon: r.icon as CategoryIcon }));
}

/**
 * Returns the category only if it belongs to this user. Anything else is reported
 * as a field error, never as "exists but not yours", so ids can't be probed.
 */
export async function assertOwnCategory(userId: number, categoryId: number, type?: TxType) {
  const [c] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)));
  if (!c) throw AppError.badRequest('Some fields need fixing', { categoryId: 'Choose one of your categories' });
  if (type && c.type !== type) {
    throw AppError.badRequest('Some fields need fixing', {
      categoryId: type === 'INCOME' ? 'Choose an income category' : 'Choose an expense category',
    });
  }
  return c;
}

export async function deleteCategory(userId: number, id: number) {
  const [{ n }] = await db
    .select({ n: count() })
    .from(transactions)
    .where(and(eq(transactions.categoryId, id), eq(transactions.userId, userId)));
  if (n > 0) {
    throw AppError.conflict(`This category has ${n} transaction${n === 1 ? '' : 's'}. Move them to another category first.`);
  }
  const deleted = await db
    .delete(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .returning({ id: categories.id });
  if (!deleted.length) throw AppError.notFound('Category');
}
