import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { SiteFooter } from '../components/SiteFooter';
import { Logo } from './Logo';

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-rule bg-surface">
        <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between px-4 sm:px-8">
          <Link to="/" aria-label="Ledgerline home"><Logo /></Link>
          <Link to="/" className="text-sm font-medium text-ink-muted hover:text-ink">Back to Ledgerline</Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1120px] flex-1 px-4 py-10 sm:px-8">{children}</main>
      <SiteFooter />
    </div>
  );
}
