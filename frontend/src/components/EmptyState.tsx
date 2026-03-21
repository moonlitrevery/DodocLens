import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-8 py-12 text-center dark:border-slate-600 dark:bg-brand-900/20">
      {icon && (
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-200/80 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
        {title}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        {description}
      </p>
    </div>
  );
}
