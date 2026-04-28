import { Fragment, type ReactNode } from "react";

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Split query into meaningful tokens (length ≥ 2) and wrap matches in <mark>.
 * Uses purple-tinted highlight (DESIGN.md — avoid mixing lime with coral in one control).
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
              className="rounded-sm bg-dl-purple/35 px-0.5 font-medium text-white"
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
