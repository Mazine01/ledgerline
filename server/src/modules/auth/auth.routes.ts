import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { randomBytes } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';
import { eq } from 'drizzle-orm';
import { loginSchema, profileSchema, registerSchema, type User } from '@ledgerline/shared';
import { db } from '../../db/index.js';
import { users } from '../../db/schema.js';
import { AppError } from '../../lib/errors.js';
import { env } from '../../lib/env.js';
import { validate } from '../../middleware/validate.js';
import { clearSessionCookie, requireAuth, setSessionCookie, userId } from '../../middleware/auth.js';
import { createDefaultCategories } from '../categories/categories.service.js';

export const authRouter = Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.NODE_ENV === 'test' ? 1000 : 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, _res, next) =>
    next(new AppError(429, 'TOO_MANY_ATTEMPTS', 'Too many attempts. Wait 15 minutes and try again.')),
});

// Checked when the email is unknown, so unknown emails take as long as wrong passwords.
const dummyHash = hash(randomBytes(16).toString('hex'));

const publicUser = (u: typeof users.$inferSelect): User => ({ id: u.id, name: u.name, email: u.email, currency: u.currency });

authRouter.post('/register', limiter, validate(registerSchema), async (_req, res) => {
  const { name, email, password, currency } = res.locals.body;
  const [user] = await db
    .insert(users)
    .values({ name, email, currency, passwordHash: await hash(password) })
    .returning();
  await createDefaultCategories(user.id);
  setSessionCookie(res, { id: user.id });
  res.status(201).json({ user: publicUser(user) });
});

authRouter.post('/login', limiter, validate(loginSchema), async (_req, res) => {
  const { email, password } = res.locals.body;
  const [user] = await db.select().from(users).where(eq(users.email, email));
  const ok = await verify(user?.passwordHash ?? (await dummyHash), password).catch(() => false);
  if (!user || !ok) throw AppError.unauthorized('Email or password is incorrect');
  setSessionCookie(res, { id: user.id });
  res.json({ user: publicUser(user) });
});

authRouter.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  res.status(204).end();
});

authRouter.get('/me', requireAuth, async (_req, res) => {
  const [user] = await db.select().from(users).where(eq(users.id, userId(res)));
  if (!user) throw AppError.unauthorized();
  res.json({ user: publicUser(user) });
});

authRouter.patch('/me', requireAuth, validate(profileSchema), async (_req, res) => {
  const [user] = await db.update(users).set(res.locals.body).where(eq(users.id, userId(res))).returning();
  res.json({ user: publicUser(user) });
});
