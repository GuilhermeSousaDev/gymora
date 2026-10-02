/** Gymora wordmark: a plate seen edge-on (the "o") set in the condensed face. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-display text-2xl font-bold leading-none ${className ?? ""}`}>
      <svg viewBox="0 0 20 20" className="size-5" aria-hidden>
        <circle cx="10" cy="10" r="9" fill="var(--iron)" />
        <circle cx="10" cy="10" r="5.5" fill="none" stroke="var(--chalk)" strokeWidth="1.5" />
        <circle cx="10" cy="10" r="2" fill="var(--chalk)" />
      </svg>
      Gymora
    </span>
  );
}
