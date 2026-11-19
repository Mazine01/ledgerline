import { Router } from 'express';
import { z } from 'zod';
import { transactionInputSchema, transactionQuerySchema, transactionUpdateSchema } from '@ledgerline/shared';
import { userId } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as service from './transactions.service.js';

export const transactionsRouter = Router();
const idParams = z.object({ id: z.coerce.number().int().positive() });

transactionsRouter.get('/', validate(transactionQuerySchema, 'query'), async (_req, res) => {
  res.json(await service.listTransactions(userId(res), res.locals.query));
});

transactionsRouter.get('/export.csv', validate(transactionQuerySchema, 'query'), async (_req, res) => {
  const rows = await service.exportTransactions(userId(res), res.locals.query);
  const label = res.locals.query.month ?? 'all';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="ledgerline-${label}.csv"`);
  res.send('﻿' + service.toCsv(rows));
});

transactionsRouter.get('/:id', validate(idParams, 'params'), async (_req, res) => {
  res.json({ data: await service.getTransaction(userId(res), res.locals.params.id) });
});

transactionsRouter.post('/', validate(transactionInputSchema), async (_req, res) => {
  res.status(201).json({ data: await service.createTransaction(userId(res), res.locals.body) });
});

transactionsRouter.patch('/:id', validate(idParams, 'params'), validate(transactionUpdateSchema), async (_req, res) => {
  res.json({ data: await service.updateTransaction(userId(res), res.locals.params.id, res.locals.body) });
});

transactionsRouter.delete('/:id', validate(idParams, 'params'), async (_req, res) => {
  await service.deleteTransaction(userId(res), res.locals.params.id);
  res.status(204).end();
});
