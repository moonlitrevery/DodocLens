import { Fragment, type ReactNode } from "react";

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Split query into meaningful tokens (length ≥ 2) and wrap matches in <mark>.
 */
export function highlightQueryTerms(text: string, query: string): ReactNode {
  const terms = [
    ...new Set(
      query
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter((t) => t.length >= 2),
    ),
  ];
  if (!terms.length || !text) return text;

  const pattern = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "giu");
  const parts = text.split(pattern);

  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;
        const isHit = terms.some((t) => part.toLowerCase() === t);
        if (isHit) {
          return (
            <mark
              key={i}
              className="rounded-sm bg-amber-200/90 px-0.5 font-medium text-slate-900 dark:bg-amber-500/35 dark:text-amber-50"
            >
              {part}
            </mark>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}
