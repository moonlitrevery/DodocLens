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
    <div className="card-glass rounded-xl border border-dashed border-dl-border px-8 py-14 text-center">
      {icon && (
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-dl-border bg-dl-bg-deep/60 text-dl-purple">
          {icon}
        </div>
      )}
      <h3 className="text-xl font-medium leading-tight text-white">{title}</h3>
      <p className="mx-auto mt-3 max-w-md text-base font-normal leading-relaxed text-dl-muted">
        {description}
      </p>
    </div>
  );
}
