import { ChevronLeft, ChevronRight } from 'lucide-react';
import { monthLabel, shiftMonth, thisMonth } from '../lib/format';

export function MonthPicker({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const atCurrent = month >= thisMonth();
  return (
    <div className="inline-flex items-center rounded-control border border-rule-strong bg-surface">
      <button type="button" onClick={() => onChange(shiftMonth(month, -1))} aria-label="Previous month" className="grid h-10 w-10 place-items-center rounded-l-control text-ink-muted hover:bg-sunken hover:text-ink">
        <ChevronLeft size={18} />
      </button>
      <span className="min-w-[132px] text-center text-sm font-semibold" aria-live="polite">{monthLabel(month)}</span>
      <button
        type="button"
        onClick={() => onChange(shiftMonth(month, 1))}
        disabled={atCurrent}
        aria-label="Next month"
        className="grid h-10 w-10 place-items-center rounded-r-control text-ink-muted hover:bg-sunken hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
