import { relations } from 'drizzle-orm';
import { date, index, integer, pgEnum, pgTable, serial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { CURRENCIES, TX_TYPES } from '@ledgerline/shared';

export const currencyEnum = pgEnum('currency', CURRENCIES);
export const txTypeEnum = pgEnum('tx_type', TX_TYPES);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique('users_email_unique'),
  passwordHash: text('password_hash').notNull(),
  currency: currencyEnum('currency').notNull().default('USD'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const categories = pgTable(
  'categories',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: txTypeEnum('type').notNull(),
    color: text('color').notNull(),
    icon: text('icon').notNull(),
  },
  (t) => [uniqueIndex('categories_user_name_type_unique').on(t.userId, t.name, t.type)],
);

export const transactions = pgTable(
  'transactions',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    type: txTypeEnum('type').notNull(),
    /** Always positive, in minor units (cents). `type` gives the direction. */
    amountCents: integer('amount_cents').notNull(),
    occurredOn: date('occurred_on').notNull(),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  // Nearly every query filters by user and date range.
  (t) => [index('transactions_user_date_idx').on(t.userId, t.occurredOn), index('transactions_category_idx').on(t.categoryId)],
);

export const budgets = pgTable(
  'budgets',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    month: text('month').notNull(), // YYYY-MM
    limitCents: integer('limit_cents').notNull(),
  },
  (t) => [uniqueIndex('budgets_user_category_month_unique').on(t.userId, t.categoryId, t.month)],
);

export const transactionsRelations = relations(transactions, ({ one }) => ({
  category: one(categories, { fields: [transactions.categoryId], references: [categories.id] }),
}));

/** Maps a unique constraint name to the form field it belongs to. */
export const UNIQUE_CONSTRAINT_FIELDS: Record<string, { field: string; message: string }> = {
  users_email_unique: { field: 'email', message: 'An account with this email already exists' },
  categories_user_name_type_unique: { field: 'name', message: 'You already have a category with this name' },
};
