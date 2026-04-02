import { highlightQueryTerms } from "../utils/highlightQuery";
import type { SearchResultItem } from "../types";

export function ChunkTextModal({
  result,
  query,
  onClose,
}: {
  result: SearchResultItem;
  query: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px] transition-opacity duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chunk-modal-title"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-600 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <div className="min-w-0">
            <h2
              id="chunk-modal-title"
              className="truncate text-lg font-semibold text-brand-950 dark:text-slate-50"
            >
              {result.filename}
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Document #{result.document_id} · Chunk index {result.chunk_index} ·
              Chunk id {result.chunk_id}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[calc(88vh-5rem)] overflow-y-auto px-6 py-5">
          <p className="whitespace-pre-wrap text-sm leading-[1.7] text-slate-800 dark:text-slate-200">
            {highlightQueryTerms(result.full_text, query)}
          </p>
        </div>
      </div>
    </div>
  );
}
