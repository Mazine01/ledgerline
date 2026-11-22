import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { CURRENCIES, loginSchema, registerSchema, type LoginInput, type RegisterInput } from '@ledgerline/shared';
import { Button } from '../../components/ui/Button';
import { SelectField, TextField } from '../../components/ui/Field';
import { ApiError } from '../../lib/api';
import { useLogin, useMe, useRegister } from '../../lib/queries';
import { Logo } from '../../app/Logo';
import { SiteFooter } from '../../components/SiteFooter';

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { data: me } = useMe();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';
  if (me) return <Navigate to={from} replace />;

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,520px)_1fr]">
      <main className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Logo />
          {mode === 'login' ? <LoginForm from={from} /> : <RegisterForm />}
          <SiteFooter compact className="mt-12" />
        </div>
      </main>
      <StatementPreview />
    </div>
  );
}

function LoginForm({ from }: { from: string }) {
  const login = useLogin();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });
  const error = login.error instanceof ApiError ? login.error.message : null;

  return (
    <>
      <h1 className="mt-10 text-2xl font-bold tracking-tight">Welcome back</h1>
      <p className="mt-2 text-ink-muted">Sign in to see this month’s money.</p>
      <form
        noValidate
        className="mt-8 flex flex-col gap-5"
        onSubmit={handleSubmit((v) => login.mutate(v, { onSuccess: () => navigate(from, { replace: true }) }))}
      >
        {error && <p role="alert" className="rounded-control bg-danger-soft px-3 py-2.5 text-sm text-danger">{error}</p>}
        <TextField label="Email" type="email" autoComplete="username" autoFocus error={errors.email?.message} {...register('email')} />
        <TextField label="Password" type="password" autoComplete="current-password" error={errors.password?.message} {...register('password')} />
        <Button type="submit" variant="primary" loading={login.isPending} className="h-11">
          Sign in
        </Button>
      </form>
      <p className="mt-6 text-sm text-ink-muted">
        New here?{' '}
        <Link to="/register" className="font-semibold text-ink underline underline-offset-2">
          Create an account
        </Link>
      </p>
      <p className="mt-8 rounded-control bg-sunken px-3 py-2.5 text-sm text-ink-muted">
        Demo account: <span className="font-medium text-ink">demo@ledgerline.dev</span> / <span className="font-medium text-ink">Ledger!2026</span>
      </p>
    </>
  );
}

function RegisterForm() {
  const signUp = useRegister();
  const navigate = useNavigate();
  const { register, handleSubmit, setError, formState: { errors } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { currency: 'USD' },
  });

  return (
    <>
      <h1 className="mt-10 text-2xl font-bold tracking-tight">Start tracking in a minute</h1>
      <p className="mt-2 text-ink-muted">Categories are ready for you. Add your first expense right after.</p>
      <form
        noValidate
        className="mt-8 flex flex-col gap-5"
        onSubmit={handleSubmit((v) =>
          signUp.mutate(v, {
            onSuccess: () => navigate('/', { replace: true }),
            onError: (e) => {
              if (e instanceof ApiError && e.fields) for (const [f, m] of Object.entries(e.fields)) setError(f as keyof RegisterInput, { message: m });
            },
          }),
        )}
      >
        {signUp.error instanceof ApiError && !signUp.error.fields && (
          <p role="alert" className="rounded-control bg-danger-soft px-3 py-2.5 text-sm text-danger">{signUp.error.message}</p>
        )}
        <TextField label="Your name" autoComplete="name" autoFocus error={errors.name?.message} {...register('name')} />
        <TextField label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <TextField label="Password" type="password" autoComplete="new-password" hint="At least 8 characters" error={errors.password?.message} {...register('password')} />
        <SelectField label="Currency" error={errors.currency?.message} {...register('currency')}>
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </SelectField>
        <Button type="submit" variant="primary" loading={signUp.isPending} className="h-11">
          Create account
        </Button>
      </form>
      <p className="mt-6 text-sm text-ink-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-ink underline underline-offset-2">Sign in</Link>
      </p>
    </>
  );
}

function StatementPreview() {
  const days = [3, 0, 5, 2, 0, 8, 1, 4, 0, 0, 6, 2, 3, 0, 1, 7, 0, 2, 5, 0, 1, 3, 0, 9, 0, 2, 4, 1, 0, 3];
  return (
    <aside aria-hidden="true" className="relative hidden overflow-hidden bg-[rgb(20_33_43)] lg:block">
      <div className="absolute inset-0 flex flex-col justify-center px-16">
        <p className="text-sm text-white/60">November</p>
        <p className="tabular mt-1 text-[44px] font-bold leading-none tracking-tight text-white">+$1,284.40</p>
        <p className="mt-2 text-white/60">left over this month</p>
        <svg viewBox="0 0 300 160" className="mt-12 w-full max-w-xl">
          <line x1="0" x2="300" y1="80" y2="80" stroke="rgb(255 255 255 / 0.18)" />
          {days.map((v, i) => (
            <rect key={i} x={i * 10 + 2} y={80 + 2} width="6" height={v * 7} rx="1.5" fill="#E0566B" />
          ))}
          {[[0, 62], [24, 74], [12, 22]].map(([i, h]) => (
            <rect key={i} x={i * 10 + 2} y={80 - 2 - h} width="6" height={h} rx="1.5" fill="#2BB58F" />
          ))}
        </svg>
        <div className="mt-6 flex gap-8 text-sm text-white/70">
          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-[#2BB58F]" />Money in</span>
          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-[#E0566B]" />Money out</span>
        </div>
      </div>
    </aside>
  );
}
