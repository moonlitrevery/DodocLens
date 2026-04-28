export function Spinner({
  className = "",
  label,
  /** High-contrast ring on purple / CTA backgrounds. */
  onDark = false,
}: {
  className?: string;
  label?: string;
  onDark?: boolean;
}) {
  const ring = onDark
    ? "border-white/35 border-t-dl-lime"
    : "border-dl-border border-t-dl-purple";

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
