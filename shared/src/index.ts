import { z } from 'zod';

// ---------- Constants ----------

export const CURRENCIES = ['USD', 'EUR', 'MAD', 'VND', 'CNY', 'GBP'] as const;
export type Currency = (typeof CURRENCIES)[number];

export const TX_TYPES = ['INCOME', 'EXPENSE'] as const;
export type TxType = (typeof TX_TYPES)[number];

/** Category colors people can pick. Chosen to stay distinct from each other and readable on light and dark. */
export const CATEGORY_COLORS = [
  '#0E8A6E', '#2E6FD8', '#7A5AE0', '#C8364B', '#E3A23A',
  '#D2602A', '#1F8FA8', '#8A6D3B', '#B04C9C', '#5E6B78',
] as const;

/** Icon names the client knows how to draw (lucide). */
export const CATEGORY_ICONS = [
  'home', 'shopping-cart', 'utensils', 'car', 'zap', 'heart-pulse', 'shopping-bag', 'film', 'plane',
  'briefcase', 'laptop', 'gift', 'piggy-bank', 'graduation-cap', 'dumbbell', 'smartphone', 'coffee', 'circle',
] as const;
export type CategoryIcon = (typeof CATEGORY_ICONS)[number];

/** Every new account starts with these, so the first expense takes one tap. */
export const DEFAULT_CATEGORIES: { name: string; type: TxType; color: string; icon: CategoryIcon }[] = [
  { name: 'Housing', type: 'EXPENSE', color: '#2E6FD8', icon: 'home' },
  { name: 'Groceries', type: 'EXPENSE', color: '#0E8A6E', icon: 'shopping-cart' },
  { name: 'Dining out', type: 'EXPENSE', color: '#D2602A', icon: 'utensils' },
  { name: 'Transport', type: 'EXPENSE', color: '#1F8FA8', icon: 'car' },
  { name: 'Utilities', type: 'EXPENSE', color: '#E3A23A', icon: 'zap' },
  { name: 'Health', type: 'EXPENSE', color: '#C8364B', icon: 'heart-pulse' },
  { name: 'Shopping', type: 'EXPENSE', color: '#B04C9C', icon: 'shopping-bag' },
  { name: 'Entertainment', type: 'EXPENSE', color: '#7A5AE0', icon: 'film' },
  { name: 'Travel', type: 'EXPENSE', color: '#8A6D3B', icon: 'plane' },
  { name: 'Other', type: 'EXPENSE', color: '#5E6B78', icon: 'circle' },
  { name: 'Salary', type: 'INCOME', color: '#0E8A6E', icon: 'briefcase' },
  { name: 'Freelance', type: 'INCOME', color: '#2E6FD8', icon: 'laptop' },
  { name: 'Gifts', type: 'INCOME', color: '#B04C9C', icon: 'gift' },
  { name: 'Other income', type: 'INCOME', color: '#5E6B78', icon: 'piggy-bank' },
];

// ---------- Helpers ----------

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD').refine(
  (v) => !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime()),
  'Enter a real date',
);
export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use the format YYYY-MM');

/** "12.5", 12.5 or "1,250.00" → 1250 (minor units). Rejects zero, negatives and more than 2 decimals. */
export const amountSchema = z
  .union([z.number(), z.string().trim().min(1, 'Enter an amount')])
  .transform((v, ctx) => {
    const n = typeof v === 'number' ? v : Number(v.replace(/,/g, ''));
    if (!Number.isFinite(n)) {
      ctx.addIssue({ code: 'custom', message: 'Enter a number, like 12.50' });
      return z.NEVER;
    }
    const cents = Math.round(n * 100);
    if (Math.abs(n * 100 - cents) > 1e-6) {
      ctx.addIssue({ code: 'custom', message: 'Use at most 2 decimal places' });
      return z.NEVER;
    }
    if (cents <= 0) {
      ctx.addIssue({ code: 'custom', message: 'Amount must be more than 0' });
      return z.NEVER;
    }
    if (cents > 100_000_000_00) {
      ctx.addIssue({ code: 'custom', message: 'Amount is too large' });
      return z.NEVER;
    }
    return cents;
  });

// ---------- Auth ----------

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60, 'Name must be 60 characters or fewer'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'Use at least 8 characters')
    .max(128, 'Use 128 characters or fewer'),
  currency: z.enum(CURRENCIES).default('USD'),
});
export type RegisterInput = z.input<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const profileSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60).optional(),
  currency: z.enum(CURRENCIES).optional(),
});

// ---------- Categories ----------

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(40, 'Name must be 40 characters or fewer'),
  type: z.enum(TX_TYPES),
  color: z.enum(CATEGORY_COLORS, { errorMap: () => ({ message: 'Pick a color from the list' }) }),
  icon: z.enum(CATEGORY_ICONS, { errorMap: () => ({ message: 'Pick an icon from the list' }) }),
});
export const categoryUpdateSchema = categoryInputSchema.omit({ type: true }).partial();
export type CategoryInput = z.infer<typeof categoryInputSchema>;

// ---------- Transactions ----------

export const transactionInputSchema = z.object({
  type: z.enum(TX_TYPES),
  amount: amountSchema,
  categoryId: z.coerce.number({ invalid_type_error: 'Choose a category' }).int().positive('Choose a category'),
  occurredOn: isoDate,
  note: z.string().trim().max(200, 'Keep the note under 200 characters').optional().or(z.literal('')),
});
export const transactionUpdateSchema = transactionInputSchema.partial();
export type TransactionInput = z.input<typeof transactionInputSchema>;
export type TransactionPayload = z.output<typeof transactionInputSchema>;

export const transactionQuerySchema = z.object({
  month: monthSchema.optional(),
  type: z.enum(TX_TYPES).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type TransactionQuery = z.input<typeof transactionQuerySchema>;

// ---------- Budgets ----------

export const budgetsPutSchema = z.object({
  month: monthSchema,
  items: z
    .array(
      z.object({
        categoryId: z.number().int().positive(),
        /** null or '' removes the budget for that category */
        limit: z.union([amountSchema, z.null(), z.literal('').transform(() => null)]),
      }),
    )
    .max(100),
});

// ---------- API shapes ----------

export interface User {
  id: number;
  name: string;
  email: string;
  currency: Currency;
}

export interface Category {
  id: number;
  name: string;
  type: TxType;
  color: string;
  icon: CategoryIcon;
  transactionCount: number;
}

export interface Transaction {
  id: number;
  type: TxType;
  amountCents: number;
  occurredOn: string;
  note: string | null;
  category: { id: number; name: string; color: string; icon: CategoryIcon };
  createdAt: string;
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; pages: number };
}

export interface MonthSummary {
  month: string;
  incomeCents: number;
  expenseCents: number;
  netCents: number;
  /** One entry per day of the month (1..n), zeros included. */
  daily: { day: number; incomeCents: number; expenseCents: number }[];
  /** Spending per expense category, largest first, with the month's budget if one is set. */
  byCategory: { categoryId: number; name: string; color: string; icon: CategoryIcon; expenseCents: number; budgetCents: number | null }[];
  transactionCount: number;
}

export interface TrendPoint {
  month: string;
  incomeCents: number;
  expenseCents: number;
}

export interface BudgetRow {
  categoryId: number;
  name: string;
  color: string;
  icon: CategoryIcon;
  limitCents: number | null;
  spentCents: number;
}

export interface ApiErrorBody {
  error: { code: string; message: string; fields?: Record<string, string> };
}
