const SEGMENTS = 10;

export function RelevanceBar({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(1, score));
  const filled = Math.round(clamped * SEGMENTS);
  const bar = Array.from({ length: SEGMENTS }, (_, i) =>
    i < filled ? "█" : "░",
  ).join("");

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
        <span className="font-medium text-slate-700 dark:text-slate-300">
          Relevance
        </span>
        <span
          className="font-mono tracking-tight text-brand-900 dark:text-teal-200"
          title={`Similarity ${clamped.toFixed(3)}`}
        >
          {bar}
        </span>
        <span className="font-mono text-slate-800 dark:text-slate-200">
          {clamped.toFixed(2)}
        </span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={clamped}
        aria-label={`Relevance ${Math.round(clamped * 100)} percent`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-800 to-accent transition-all duration-500 dark:from-teal-700 dark:to-accent-muted"
          style={{ width: `${clamped * 100}%` }}
        />
      </div>
    </div>
  );
}
