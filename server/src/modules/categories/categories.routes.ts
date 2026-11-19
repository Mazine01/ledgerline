import { Router } from 'express';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { categoryInputSchema, categoryUpdateSchema } from '@ledgerline/shared';
import { db } from '../../db/index.js';
import { categories } from '../../db/schema.js';
import { AppError } from '../../lib/errors.js';
import { userId } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { deleteCategory, listCategories } from './categories.service.js';

export const categoriesRouter = Router();
const idParams = z.object({ id: z.coerce.number().int().positive() });

categoriesRouter.get('/', async (_req, res) => {
  res.json({ data: await listCategories(userId(res)) });
});

categoriesRouter.post('/', validate(categoryInputSchema), async (_req, res) => {
  const [c] = await db
    .insert(categories)
    .values({ ...res.locals.body, userId: userId(res) })
    .returning();
  res.status(201).json({ data: { ...c, transactionCount: 0 } });
});

categoriesRouter.patch('/:id', validate(idParams, 'params'), validate(categoryUpdateSchema), async (_req, res) => {
  if (!Object.keys(res.locals.body).length) throw AppError.badRequest('Nothing to update');
  const [c] = await db
    .update(categories)
    .set(res.locals.body)
    .where(and(eq(categories.id, res.locals.params.id), eq(categories.userId, userId(res))))
    .returning();
  if (!c) throw AppError.notFound('Category');
  res.json({ data: c });
});

categoriesRouter.delete('/:id', validate(idParams, 'params'), async (_req, res) => {
  await deleteCategory(userId(res), res.locals.params.id);
  res.status(204).end();
});
