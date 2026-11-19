# Security notes

Ledgerline holds people's financial history, so the main promise is simple: **nobody can see or change anyone else's money.**

| Risk | What Roster does | Where |
| --- | --- | --- |
| Stolen passwords | Passwords are hashed with **argon2id** (minimum 8 characters), never stored or logged in plain text. | `auth.routes.ts` |
| Password guessing | Login is **rate-limited** to 10 attempts per 15 minutes per IP. | `auth.routes.ts` |
| Account discovery | Wrong password and unknown email return the **same message and take the same time**, because a dummy hash is checked when the email does not exist. | `auth.routes.ts` |
| Token theft via XSS | The session JWT lives in an **httpOnly** cookie that JavaScript cannot read. It is Secure in production and expires after 7 days. | `middleware/auth.ts` |
| CSRF | The cookie is **SameSite=Lax** locally. In production (cross-site) it is SameSite=None + Secure, combined with a strict **CORS allowlist** and JSON-only bodies. | `app.ts` |
| Forged tokens | Tokens are verified with a 32+ character secret and only HS256 is accepted, so a forged or `alg: none` token is rejected. | `middleware/auth.ts`, `tests/` |
| One user reading another's data (IDOR) | Every query includes `user_id = <session user>`. Another user's id returns **404, not 403**, so ids can't be probed. Categories used in a transaction or budget must belong to the same user. Covered by 4 isolation tests with two accounts. | `*.service.ts`, `tests/` |
| Money errors | Amounts are integer cents, validated for at most 2 decimals, above 0 and below a sane maximum. Category type must match transaction type. | `shared/src/index.ts` |
| SQL injection | All queries go through Drizzle's parameterized builder. Search text has LIKE wildcards escaped. | `transactions.service.ts` |
| Bad input | Every body, query and URL parameter is validated by **Zod** before a handler runs. JSON bodies are capped at 100 kB. | `middleware/validate.ts` |
| CSV formula injection | Exported cells starting with `=`, `+`, `-` or `@` are prefixed, so Excel will not execute them. | `transactions.service.ts` |
| Information leaks | Errors return a fixed shape with no stack traces. `x-powered-by` is disabled and **Helmet** sets security headers. | `errorHandler.ts`, `app.ts` |
| Secrets in git | Secrets come only from environment variables. `.env` is git-ignored and `.env.example` documents each one. | `lib/env.ts` |

The app also validates its own environment on startup (`lib/env.ts`): it refuses to boot with a missing database URL or a short JWT secret.

## Reporting

Found something? Open an issue or email the maintainer.
