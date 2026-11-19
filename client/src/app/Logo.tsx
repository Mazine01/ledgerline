/** Money in above the line, money out below it: the product in one mark. */
export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="8" className="fill-ink" />
        <rect x="7" y="7" width="4" height="9" rx="1" fill="#0E8A6E" />
        <rect x="14" y="10" width="4" height="6" rx="1" fill="#0E8A6E" />
        <rect x="21" y="5" width="4" height="11" rx="1" fill="#0E8A6E" />
        <rect x="7" y="17" width="4" height="5" rx="1" fill="#C8364B" />
        <rect x="14" y="17" width="4" height="9" rx="1" fill="#C8364B" />
        <rect x="21" y="17" width="4" height="4" rx="1" fill="#C8364B" />
      </svg>
      <span className="text-lg font-bold tracking-tight">Ledgerline</span>
    </span>
  );
}
