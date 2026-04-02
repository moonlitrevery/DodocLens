export function Spinner({
  className = "",
  label,
  /** High-contrast ring on dark backgrounds (e.g. primary buttons). */
  onDark = false,
}: {
  className?: string;
  label?: string;
  onDark?: boolean;
}) {
  const ring = onDark
    ? "border-white/30 border-t-white"
    : "border-slate-300 border-t-brand-800 dark:border-slate-600 dark:border-t-teal-400";

  return (
    <span
      className={`inline-flex items-center gap-2 ${className}`}
      role="status"
      aria-live="polite"
    >
      <span
        className={`h-5 w-5 shrink-0 animate-spin rounded-full border-2 ${ring}`}
        aria-hidden
      />
      {label ? (
        <span className="sr-only">{label}</span>
      ) : (
        <span className="sr-only">Loading</span>
      )}
    </span>
  );
}
