import { faker } from '@faker-js/faker';
import { hash } from '@node-rs/argon2';
import { db, pool } from './index.js';
import { budgets, categories, transactions, users } from './schema.js';
import { createDefaultCategories } from '../modules/categories/categories.service.js';

/**
 * One demo account with six months of believable money: a salary on the 25th,
 * rent on the 1st, weekly groceries, and the everyday spending in between.
 */
const iso = (d: Date) => d.toISOString().slice(0, 10);
const day = (y: number, m: number, d: number) => iso(new Date(Date.UTC(y, m, d)));
const cents = (min: number, max: number) => Math.round(faker.number.float({ min, max }) * 100);

async function main() {
  faker.seed(7);
  const email = process.env.SEED_DEMO_EMAIL ?? 'demo@ledgerline.dev';
  const password = process.env.SEED_DEMO_PASSWORD ?? 'Ledger!2026';

  await db.delete(transactions);
  await db.delete(budgets);
  await db.delete(categories);
  await db.delete(users);

  const [user] = await db
    .insert(users)
    .values({ name: 'Mazin', email, passwordHash: await hash(password), currency: 'USD' })
    .returning();
  const cats = await createDefaultCategories(user.id);
  const cat = (name: string) => cats.find((c) => c.name === name)!.id;

  const today = new Date();
  const rows: (typeof transactions.$inferInsert)[] = [];
  const add = (name: string, type: 'INCOME' | 'EXPENSE', amountCents: number, occurredOn: string, note?: string) => {
    if (occurredOn <= iso(today)) rows.push({ userId: user.id, categoryId: cat(name), type, amountCents, occurredOn, note: note ?? null });
  };

  for (let back = 5; back >= 0; back--) {
    const first = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - back, 1));
    const y = first.getUTCFullYear();
    const m = first.getUTCMonth();
    const daysIn = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

    add('Salary', 'INCOME', 420000, day(y, m, 25), 'Monthly salary');
    if (faker.datatype.boolean(0.6)) add('Freelance', 'INCOME', cents(250, 900), day(y, m, faker.number.int({ min: 5, max: 20 })), 'Automation project');
    add('Housing', 'EXPENSE', 135000, day(y, m, 1), 'Rent');
    add('Utilities', 'EXPENSE', cents(70, 110), day(y, m, 6), 'Electricity and water');
    add('Utilities', 'EXPENSE', 3500, day(y, m, 12), 'Internet');
    add('Transport', 'EXPENSE', 4500, day(y, m, 2), 'Metro pass');

    for (let d = 3; d <= daysIn; d += 7) add('Groceries', 'EXPENSE', cents(45, 95), day(y, m, d), faker.helpers.arrayElement(['Supermarket', 'Market', 'Weekly shop']));
    for (let i = 0; i < faker.number.int({ min: 4, max: 8 }); i++)
      add('Dining out', 'EXPENSE', cents(8, 42), day(y, m, faker.number.int({ min: 1, max: daysIn })), faker.helpers.arrayElement(['Lunch', 'Coffee', 'Dinner with friends', 'Pho']));
    for (let i = 0; i < faker.number.int({ min: 2, max: 5 }); i++)
      add('Transport', 'EXPENSE', cents(4, 18), day(y, m, faker.number.int({ min: 1, max: daysIn })), 'Grab');
    for (let i = 0; i < faker.number.int({ min: 1, max: 3 }); i++)
      add('Shopping', 'EXPENSE', cents(20, 140), day(y, m, faker.number.int({ min: 1, max: daysIn })), faker.helpers.arrayElement(['Clothes', 'Headphones', 'Books', 'Home goods']));
    add('Entertainment', 'EXPENSE', 1599, day(y, m, 15), 'Streaming');
    if (faker.datatype.boolean(0.5)) add('Health', 'EXPENSE', cents(25, 80), day(y, m, faker.number.int({ min: 1, max: daysIn })), 'Pharmacy');
    if (back === 2) add('Travel', 'EXPENSE', 48000, day(y, m, 18), 'Flights to Hanoi');
    if (back === 3) add('Gifts', 'INCOME', 15000, day(y, m, 9), 'Birthday');
  }

  await db.insert(transactions).values(rows);

  const month = iso(today).slice(0, 7);
  await db.insert(budgets).values(
    [
      ['Groceries', 38000],
      ['Dining out', 15000],
      ['Transport', 9000],
      ['Shopping', 12000],
      ['Entertainment', 3000],
    ].map(([name, limitCents]) => ({ userId: user.id, categoryId: cat(name as string), month, limitCents: limitCents as number })),
  );

  console.log(`Seeded demo account ${email} with ${rows.length} transactions over 6 months.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
