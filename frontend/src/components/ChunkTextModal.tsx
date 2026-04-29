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
      className="fixed inset-0 z-[110] flex items-center justify-center bg-dl-bg-deep/75 p-4 backdrop-blur-glass backdrop-saturate-[180%]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chunk-modal-title"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-xl border border-dl-border bg-dl-bg-deep/95 shadow-btn-hover backdrop-blur-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-dl-border px-6 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.25px] text-dl-muted">
              Visualizacao do trecho
            </p>
            <h2
              id="chunk-modal-title"
              className="mt-1 truncate font-display text-xl font-semibold tracking-tight text-white"
            >
              {result.filename}
            </h2>
            <p className="mt-1 font-mono text-xs text-dl-code">
              doc #{result.document_id} · ind {result.chunk_index} · id{" "}
              {result.chunk_id}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-glass shrink-0 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-[0.2px]"
            aria-label="Fechar"
          >
            Fechar
          </button>
        </div>
        <div className="max-h-[calc(88vh-5rem)] overflow-y-auto px-6 py-5">
          <p className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-dl-muted">
            {highlightQueryTerms(result.full_text, query)}
          </p>
        </div>
      </div>
    </div>
  );
}
