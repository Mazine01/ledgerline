import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  BudgetRow,
  Category,
  CategoryInput,
  LoginInput,
  MonthSummary,
  Paginated,
  RegisterInput,
  Transaction,
  TransactionQuery,
  TrendPoint,
  User,
} from '@ledgerline/shared';
import { api, ApiError } from './api';

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        return (await api<{ user: User }>('/api/auth/me')).user;
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => api<{ user: User }>('/api/auth/login', { method: 'POST', body: input }),
    onSuccess: ({ user }) => qc.setQueryData(['me'], user),
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterInput) => api<{ user: User }>('/api/auth/register', { method: 'POST', body: input }),
    onSuccess: ({ user }) => qc.setQueryData(['me'], user),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>('/api/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      qc.clear();
      qc.setQueryData(['me'], null);
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<Pick<User, 'name' | 'currency'>>) =>
      api<{ user: User }>('/api/auth/me', { method: 'PATCH', body: input }),
    onSuccess: ({ user }) => qc.setQueryData(['me'], user),
  });
}

export function useSummary(month: string) {
  return useQuery({
    queryKey: ['summary', month],
    queryFn: async () => (await api<{ data: MonthSummary }>('/api/reports/summary', { query: { month } })).data,
    placeholderData: keepPreviousData,
  });
}

export function useTrend(end: string, months = 6) {
  return useQuery({
    queryKey: ['trend', end, months],
    queryFn: async () => (await api<{ data: TrendPoint[] }>('/api/reports/trend', { query: { end, months } })).data,
    placeholderData: keepPreviousData,
  });
}

export function useTransactions(query: TransactionQuery) {
  return useQuery({
    queryKey: ['transactions', query],
    queryFn: () => api<Paginated<Transaction>>('/api/transactions', { query: query as Record<string, unknown> }),
    placeholderData: keepPreviousData,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api<{ data: Category[] }>('/api/categories')).data,
    staleTime: 5 * 60 * 1000,
  });
}

export function useBudgets(month: string) {
  return useQuery({
    queryKey: ['budgets', month],
    queryFn: async () => (await api<{ data: BudgetRow[] }>('/api/budgets', { query: { month } })).data,
  });
}

/** Any money change can move every total, so refresh everything derived from transactions. */
function useRefreshMoney() {
  const qc = useQueryClient();
  return () =>
    Promise.all(
      ['transactions', 'summary', 'trend', 'budgets', 'categories'].map((k) => qc.invalidateQueries({ queryKey: [k] })),
    );
}

export interface TxBody {
  type: 'INCOME' | 'EXPENSE';
  amount: string;
  categoryId: number;
  occurredOn: string;
  note?: string;
}

export function useSaveTransaction() {
  const refresh = useRefreshMoney();
  return useMutation({
    mutationFn: async ({ id, body }: { id?: number; body: TxBody }) =>
      (
        await api<{ data: Transaction }>(id ? `/api/transactions/${id}` : '/api/transactions', {
          method: id ? 'PATCH' : 'POST',
          body,
        })
      ).data,
    onSuccess: refresh,
  });
}

export function useDeleteTransaction() {
  const refresh = useRefreshMoney();
  return useMutation({
    mutationFn: (id: number) => api<void>(`/api/transactions/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
  });
}

export function useSaveBudgets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { month: string; items: { categoryId: number; limit: string | null }[] }) =>
      (await api<{ data: BudgetRow[] }>('/api/budgets', { method: 'PUT', body })).data,
    onSuccess: (rows, { month }) => {
      qc.setQueryData(['budgets', month], rows);
      return qc.invalidateQueries({ queryKey: ['summary'] });
    },
  });
}

export function useSaveCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id?: number; body: Partial<CategoryInput> }) =>
      (await api<{ data: Category }>(id ? `/api/categories/${id}` : '/api/categories', { method: id ? 'PATCH' : 'POST', body })).data,
    onSuccess: () => Promise.all(['categories', 'transactions', 'summary', 'budgets'].map((k) => qc.invalidateQueries({ queryKey: [k] }))),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api<void>(`/api/categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => Promise.all(['categories', 'budgets'].map((k) => qc.invalidateQueries({ queryKey: [k] }))),
  });
}
