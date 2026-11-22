import { useCallback, useEffect, useSyncExternalStore } from 'react';

export type ThemeChoice = 'light' | 'dark' | 'system';
const KEY = 'ledgerline-theme';
const media = () => window.matchMedia('(prefers-color-scheme: dark)');

function readChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  const mq = media();
  mq.addEventListener('change', fn);
  return () => {
    listeners.delete(fn);
    mq.removeEventListener('change', fn);
  };
};

export function useTheme() {
  const choice = useSyncExternalStore(subscribe, readChoice, () => 'system' as ThemeChoice);
  const systemDark = useSyncExternalStore(subscribe, () => media().matches, () => false);
  const resolved: 'light' | 'dark' = choice === 'system' ? (systemDark ? 'dark' : 'light') : choice;

  const setChoice = useCallback((next: ThemeChoice) => {
    try {
      if (next === 'system') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch {
      /* private browsing: the choice lasts for this page only */
    }
    if (next === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = next;
    listeners.forEach((fn) => fn());
  }, []);

  // Keep the browser's address-bar colour in step with the page.
  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#0E141A' : '#F3F5F7');
  }, [resolved]);

  return { choice, resolved, setChoice };
}
