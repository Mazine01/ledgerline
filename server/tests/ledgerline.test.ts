import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { db, pool } from '../src/db/index.js';
import { budgets, categories, transactions, users } from '../src/db/schema.js';

const app = createApp();

interface Account {
  cookie: string[];
  cats: { id: number; name: string; type: string }[];
}

async function signUp(email: string): Promise<Account> {
  const res = await request(app).post('/api/auth/register').send({ name: 'Test', email, password: 'long-enough-pw', currency: 'USD' });
  expect(res.status).toBe(201);
  const cookie = res.get('Set-Cookie') ?? [];
  const cats = (await request(app).get('/api/categories').set('Cookie', cookie)).body.data;
  return { cookie, cats };
}

const catId = (a: Account, name: string) => a.cats.find((c) => c.name === name)!.id;

let alice: Account;
let bob: Account;

beforeAll(async () => {
  await db.delete(transactions);
  await db.delete(budgets);
  await db.delete(categories);
  await db.delete(users);
  alice = await signUp('alice@test.dev');
  bob = await signUp('bob@test.dev');
});

afterAll(async () => {
  await pool.end();
});

describe('accounts', () => {
  it('gives every new account the default categories', () => {
    expect(alice.cats.length).toBe(14);
    expect(alice.cats.some((c) => c.name === 'Groceries' && c.type === 'EXPENSE')).toBe(true);
  });

  it('refuses a second account with the same email', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'X', email: 'ALICE@test.dev', password: 'long-enough-pw' });
    expect(res.status).toBe(409);
    expect(res.body.error.fields).toHaveProperty('email');
  });

  it('rejects short passwords', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'X', email: 'x@test.dev', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toHaveProperty('password');
  });

  it('logs in and reads the profile', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: 'alice@test.dev', password: 'long-enough-pw' });
    expect(login.status).toBe(200);
    const me = await request(app).get('/api/auth/me').set('Cookie', login.get('Set-Cookie') ?? []);
    expect(me.body.user).toMatchObject({ email: 'alice@test.dev', currency: 'USD' });
  });

  it('requires a session for data routes', async () => {
    expect((await request(app).get('/api/transactions')).status).toBe(401);
  });
});

describe('transactions', () => {
  it('stores money as exact cents', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .set('Cookie', alice.cookie)
      .send({ type: 'EXPENSE', amount: '0.10', categoryId: catId(alice, 'Groceries'), occurredOn: '2026-03-04' });
    const res2 = await request(app)
      .post('/api/transactions')
      .set('Cookie', alice.cookie)
      .send({ type: 'EXPENSE', amount: 0.2, categoryId: catId(alice, 'Groceries'), occurredOn: '2026-03-05', note: 'milk' });
    expect(res.status).toBe(201);
    expect(res.body.data.amountCents).toBe(10);
    expect(res2.body.data.amountCents).toBe(20);

    const summary = await request(app).get('/api/reports/summary?month=2026-03').set('Cookie', alice.cookie);
    expect(summary.body.data.expenseCents).toBe(30); // 0.1 + 0.2 is exactly 0.30 here
    expect(summary.body.data.daily).toHaveLength(31);
  });

  it('rejects invalid amounts', async () => {
    for (const amount of ['0', '-5', '1.234', 'abc']) {
      const res = await request(app)
        .post('/api/transactions')
        .set('Cookie', alice.cookie)
        .send({ type: 'EXPENSE', amount, categoryId: catId(alice, 'Groceries'), occurredOn: '2026-03-04' });
      expect(res.status, `amount ${amount}`).toBe(400);
      expect(res.body.error.fields).toHaveProperty('amount');
    }
  });

  it('refuses a category of the wrong type', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .set('Cookie', alice.cookie)
      .send({ type: 'INCOME', amount: 100, categoryId: catId(alice, 'Groceries'), occurredOn: '2026-03-04' });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.categoryId).toMatch(/income/i);
  });

  it('filters by month, type and note search', async () => {
    await request(app)
      .post('/api/transactions')
      .set('Cookie', alice.cookie)
      .send({ type: 'INCOME', amount: 2500, categoryId: catId(alice, 'Salary'), occurredOn: '2026-03-25', note: 'March salary' });
    const march = await request(app).get('/api/transactions?month=2026-03').set('Cookie', alice.cookie);
    expect(march.body.meta.total).toBe(3);
    const income = await request(app).get('/api/transactions?month=2026-03&type=INCOME').set('Cookie', alice.cookie);
    expect(income.body.data).toHaveLength(1);
    const search = await request(app).get('/api/transactions?search=milk').set('Cookie', alice.cookie);
    expect(search.body.data.map((t: { note: string }) => t.note)).toEqual(['milk']);
  });
});

describe('isolation between users', () => {
  let aliceTx: number;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/transactions')
      .set('Cookie', alice.cookie)
      .send({ type: 'EXPENSE', amount: 99, categoryId: catId(alice, 'Health'), occurredOn: '2026-04-02', note: 'private' });
    aliceTx = res.body.data.id;
  });

  it("hides Alice's transactions from Bob's list and reports", async () => {
    const list = await request(app).get('/api/transactions').set('Cookie', bob.cookie);
    expect(list.body.meta.total).toBe(0);
    const summary = await request(app).get('/api/reports/summary?month=2026-04').set('Cookie', bob.cookie);
    expect(summary.body.data.expenseCents).toBe(0);
  });

  it("gives Bob a 404 (not 403) for Alice's transaction id", async () => {
    expect((await request(app).get(`/api/transactions/${aliceTx}`).set('Cookie', bob.cookie)).status).toBe(404);
    expect((await request(app).patch(`/api/transactions/${aliceTx}`).set('Cookie', bob.cookie).send({ amount: 1 })).status).toBe(404);
    expect((await request(app).delete(`/api/transactions/${aliceTx}`).set('Cookie', bob.cookie)).status).toBe(404);
    // Still there for Alice.
    expect((await request(app).get(`/api/transactions/${aliceTx}`).set('Cookie', alice.cookie)).body.data.amountCents).toBe(9900);
  });

  it("won't let Bob file a transaction under Alice's category", async () => {
    const res = await request(app)
      .post('/api/transactions')
      .set('Cookie', bob.cookie)
      .send({ type: 'EXPENSE', amount: 5, categoryId: catId(alice, 'Health'), occurredOn: '2026-04-02' });
    expect(res.status).toBe(400);
  });

  it("won't let Bob budget or delete Alice's category", async () => {
    const put = await request(app)
      .put('/api/budgets')
      .set('Cookie', bob.cookie)
      .send({ month: '2026-04', items: [{ categoryId: catId(alice, 'Health'), limit: 100 }] });
    expect(put.status).toBe(400);
    expect((await request(app).delete(`/api/categories/${catId(alice, 'Travel')}`).set('Cookie', bob.cookie)).status).toBe(404);
  });
});

describe('budgets and categories', () => {
  it('sets, updates and clears budgets, reporting spent against limit', async () => {
    const groceries = catId(alice, 'Groceries');
    let res = await request(app)
      .put('/api/budgets')
      .set('Cookie', alice.cookie)
      .send({ month: '2026-03', items: [{ categoryId: groceries, limit: '50' }] });
    expect(res.status).toBe(200);
    let row = res.body.data.find((r: { categoryId: number }) => r.categoryId === groceries);
    expect(row).toMatchObject({ limitCents: 5000, spentCents: 30 });

    res = await request(app).put('/api/budgets').set('Cookie', alice.cookie).send({ month: '2026-03', items: [{ categoryId: groceries, limit: 80 }] });
    row = res.body.data.find((r: { categoryId: number }) => r.categoryId === groceries);
    expect(row.limitCents).toBe(8000);

    res = await request(app).put('/api/budgets').set('Cookie', alice.cookie).send({ month: '2026-03', items: [{ categoryId: groceries, limit: null }] });
    row = res.body.data.find((r: { categoryId: number }) => r.categoryId === groceries);
    expect(row.limitCents).toBeNull();
  });

  it('will not delete a category that still has transactions', async () => {
    const res = await request(app).delete(`/api/categories/${catId(alice, 'Groceries')}`).set('Cookie', alice.cookie);
    expect(res.status).toBe(409);
  });

  it('creates and deletes a custom category, refusing duplicates', async () => {
    const body = { name: 'Pets', type: 'EXPENSE', color: '#0E8A6E', icon: 'circle' };
    const created = await request(app).post('/api/categories').set('Cookie', alice.cookie).send(body);
    expect(created.status).toBe(201);
    expect((await request(app).post('/api/categories').set('Cookie', alice.cookie).send(body)).status).toBe(409);
    expect((await request(app).delete(`/api/categories/${created.body.data.id}`).set('Cookie', alice.cookie)).status).toBe(204);
  });

  it('reports a 6-month trend with empty months as zeros', async () => {
    const res = await request(app).get('/api/reports/trend?months=6&end=2026-04').set('Cookie', alice.cookie);
    expect(res.body.data.map((p: { month: string }) => p.month)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04']);
    expect(res.body.data[4]).toMatchObject({ incomeCents: 250000, expenseCents: 30 });
    expect(res.body.data[0]).toMatchObject({ incomeCents: 0, expenseCents: 0 });
  });
});
