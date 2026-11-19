import type { RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env, isProd } from '../lib/env.js';
import { AppError } from '../lib/errors.js';

export const AUTH_COOKIE = 'ledgerline_session';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface SessionUser {
  id: number;
}

const cookieOptions = () => ({
  httpOnly: true,
  secure: isProd || env.COOKIE_SAMESITE === 'none',
  sameSite: env.COOKIE_SAMESITE,
  path: '/',
});

export function setSessionCookie(res: Response, user: SessionUser) {
  const token = jwt.sign({ sub: String(user.id) }, env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie(AUTH_COOKIE, token, { ...cookieOptions(), maxAge: MAX_AGE_MS });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(AUTH_COOKIE, cookieOptions());
}

/** Rejects with 401 unless the request carries a valid session; sets res.locals.user. */
export const requireAuth: RequestHandler = (req, res, next) => {
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) return next(AppError.unauthorized());
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as jwt.JwtPayload;
    res.locals.user = { id: Number(payload.sub) } satisfies SessionUser;
    next();
  } catch {
    next(AppError.unauthorized('Your session has expired. Sign in again.'));
  }
};

/** The signed-in user's id. Every data query is scoped by it. */
export const userId = (res: Response) => (res.locals.user as SessionUser).id;
