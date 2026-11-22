import type { Currency } from '@ledgerline/shared';

const formatters = new Map<string, Intl.NumberFormat>();

export function money(cents: number, currency: Currency, opts: { compact?: boolean; signed?: boolean } = {}) {
  const key = `${currency}-${opts.compact ? 'c' : 'f'}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      ...(opts.compact ? { notation: 'compact', maximumFractionDigits: 1 } : {}),
    });
    formatters.set(key, f);
  }
  const s = f.format(Math.abs(cents) / 100);
  if (!opts.signed || cents === 0) return cents < 0 ? `−${s}` : s;
  return cents > 0 ? `+${s}` : `−${s}`;
}

export const centsToInput = (cents: number) => (cents / 100).toFixed(2);

export const thisMonth = () => new Date().toISOString().slice(0, 7);
export const today = () => new Date().toISOString().slice(0, 10);

export function shiftMonth(month: string, by: number) {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + by, 1)).toISOString().slice(0, 7);
}

export function monthLabel(month: string, style: 'long' | 'short' = 'long') {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', {
    month: style,
    year: style === 'long' ? 'numeric' : undefined,
    timeZone: 'UTC',
  });
}

export function dayLabel(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  const t = today();
  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  if (iso === t) return 'Today';
  if (iso === yesterday) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' });
}
