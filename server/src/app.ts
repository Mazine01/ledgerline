import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { env } from './lib/env.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { categoriesRouter } from './modules/categories/categories.routes.js';
import { transactionsRouter } from './modules/transactions/transactions.routes.js';
import { budgetsRouter } from './modules/budgets/budgets.routes.js';
import { reportsRouter } from './modules/reports/reports.routes.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_ORIGIN.split(',').map((o) => o.trim()), credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  if (env.NODE_ENV !== 'test') {
    app.use(pinoHttp({ autoLogging: { ignore: (req) => req.url === '/api/health' } }));
  }

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api/auth', authRouter);

  // Everything below is per-user data: the session decides whose.
  app.use('/api/categories', requireAuth, categoriesRouter);
  app.use('/api/transactions', requireAuth, transactionsRouter);
  app.use('/api/budgets', requireAuth, budgetsRouter);
  app.use('/api/reports', requireAuth, reportsRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
