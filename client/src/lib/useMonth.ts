import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { monthSchema } from '@ledgerline/shared';
import { thisMonth } from './format';

/** The month being looked at lives in the URL (?month=2026-11), so it survives refresh and links. */
export function useMonth() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('month');
  const month = raw && monthSchema.safeParse(raw).success ? raw : thisMonth();

  const setMonth = useCallback(
    (m: string) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (m === thisMonth()) next.delete('month');
          else next.set('month', m);
          next.delete('page');
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );

  return { month, setMonth, isCurrent: month === thisMonth() };
}
