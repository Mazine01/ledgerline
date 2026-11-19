import type { ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ListOrdered, LogOut, Plus, Settings, Target } from 'lucide-react';
import { useLogout, useMe } from '../lib/queries';
import { useTransactionEditor } from '../features/transactions/TransactionEditor';
import { Logo } from './Logo';

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', icon: ListOrdered },
  { to: '/budgets', label: 'Budgets', icon: Target },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { data: me } = useMe();
  const logout = useLogout();
  const navigate = useNavigate();
  const openEditor = useTransactionEditor();
  const { search } = useLocation();
  // Keep the chosen month when moving between pages.
  const month = new URLSearchParams(search).get('month');
  const withMonth = (to: string) => (month && to !== '/settings' ? `${to}?month=${month}` : to);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[232px_1fr]">
      <a href="#main" className="sr-only z-50 rounded-control bg-surface px-3 py-2 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-rule bg-surface px-4 py-6 lg:flex">
        <Logo className="px-2" />
        <button
          type="button"
          onClick={() => openEditor()}
          className="mt-8 flex h-11 items-center justify-center gap-2 rounded-control bg-brand text-sm font-semibold text-brand-ink hover:bg-brand/90"
        >
          <Plus size={18} aria-hidden="true" />
          Add transaction
        </button>
        <nav aria-label="Main" className="mt-6 flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={withMonth(to)}
              end={to === '/'}
              className={({ isActive }) =>
                `flex h-10 items-center gap-3 rounded-control px-3 text-sm font-medium transition-colors ${
                  isActive ? 'bg-sunken text-ink' : 'text-ink-muted hover:bg-sunken/60 hover:text-ink'
                }`
              }
            >
              <Icon size={18} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-rule pt-4">
          <p className="truncate px-3 text-sm font-semibold">{me?.name}</p>
          <p className="truncate px-3 text-xs text-ink-muted">{me?.email}</p>
          <button
            type="button"
            onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/login') })}
            className="mt-3 flex h-9 w-full items-center gap-3 rounded-control px-3 text-sm text-ink-muted hover:bg-sunken hover:text-ink"
          >
            <LogOut size={16} aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-rule bg-surface/95 px-4 backdrop-blur lg:hidden">
        <Logo />
        <button
          type="button"
          onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/login') })}
          aria-label="Sign out"
          className="grid h-10 w-10 place-items-center rounded-control text-ink-muted hover:bg-sunken"
        >
          <LogOut size={18} />
        </button>
      </header>

      <main id="main" className="mx-auto w-full max-w-[1120px] px-4 pb-28 pt-6 sm:px-8 lg:pb-16 lg:pt-10">
        {children}
      </main>

      {/* Mobile bottom nav with the add button in the middle of reach */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-rule bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {NAV.slice(0, 2).map((item) => (
          <MobileLink key={item.to} {...item} to={withMonth(item.to)} end={item.to === '/'} />
        ))}
        <div className="grid place-items-center">
          <button
            type="button"
            onClick={() => openEditor()}
            aria-label="Add transaction"
            className="-mt-5 grid h-14 w-14 place-items-center rounded-full bg-brand text-brand-ink shadow-panel"
          >
            <Plus size={24} />
          </button>
        </div>
        {NAV.slice(2).map((item) => (
          <MobileLink key={item.to} {...item} to={withMonth(item.to)} />
        ))}
      </nav>
    </div>
  );
}

function MobileLink({ to, label, icon: Icon, end }: { to: string; label: string; icon: typeof Plus; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium ${isActive ? 'text-ink' : 'text-ink-muted'}`
      }
    >
      <Icon size={20} aria-hidden="true" />
      {label}
    </NavLink>
  );
}
