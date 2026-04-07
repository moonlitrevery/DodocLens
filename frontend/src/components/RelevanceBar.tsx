export function RelevanceBar({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(1, score));
  const pct = Math.round(clamped * 100);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
        <span className="font-medium text-slate-700 dark:text-slate-300">
          Relevance
        </span>
        <span
          className="font-medium tabular-nums text-slate-800 dark:text-slate-200"
          title={`Similarity ${clamped.toFixed(3)}`}
        >
          {pct}%
        </span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`Relevance ${pct} percent`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-800 to-accent transition-all duration-500 dark:from-teal-700 dark:to-accent-muted"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
