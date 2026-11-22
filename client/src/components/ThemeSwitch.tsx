import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type ThemeChoice } from '../lib/theme';

const OPTIONS: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'Auto', icon: Monitor },
];

export function ThemeSwitch() {
  const { choice, setChoice } = useTheme();
  return (
    <fieldset>
      <legend className="sr-only">Theme</legend>
      <div className="inline-grid grid-cols-3 gap-1 rounded-control bg-sunken p-1">
        {OPTIONS.map(({ value, label, icon: Icon }) => (
          <label
            key={value}
            className={`flex h-9 cursor-pointer items-center justify-center gap-2 rounded-[6px] px-4 text-sm font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink ${
              choice === value ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
            }`}
          >
            <input type="radio" name="theme" value={value} checked={choice === value} onChange={() => setChoice(value)} className="sr-only" />
            <Icon size={16} aria-hidden="true" />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ThemeToggle({ withLabel = false, className = '' }: { withLabel?: boolean; className?: string }) {
  const { resolved, setChoice } = useTheme();
  const next = resolved === 'dark' ? 'light' : 'dark';
  const Icon = resolved === 'dark' ? Sun : Moon;
  return (
    <button
      type="button"
      onClick={() => setChoice(next)}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className={className}
    >
      <Icon size={withLabel ? 16 : 18} aria-hidden="true" />
      {withLabel && <span>{next === 'dark' ? 'Dark mode' : 'Light mode'}</span>}
    </button>
  );
}
