export function RelevanceBar({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(1, score));
  const pct = Math.round(clamped * 100);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-xs uppercase tracking-[0.2px] text-dl-muted">
        <span className="font-semibold text-dl-muted">Relevance</span>
        <span
          className="font-bold tabular-nums text-dl-lime"
          title={`Mapped similarity ${clamped.toFixed(3)}`}
        >
          {pct}%
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-dl-border/80"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`Relevance ${pct} percent`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-dl-purple to-dl-lime transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
