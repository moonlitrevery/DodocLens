import axios from "axios";
import { useState } from "react";
import { api } from "../api/client";
import { ChunkTextModal } from "../components/ChunkTextModal";
import { EmptyState } from "../components/EmptyState";
import { RelevanceBar } from "../components/RelevanceBar";
import { Spinner } from "../components/Spinner";
import { useToast } from "../context/ToastContext";
import type { SearchResultItem } from "../types";
import { highlightQueryTerms } from "../utils/highlightQuery";

interface SearchResponse {
  results: SearchResultItem[];
}

export function SearchPage() {
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [chunkModal, setChunkModal] = useState<SearchResultItem | null>(null);
  /** Query text used for the current result set (stable while editing the input). */
  const [activeQuery, setActiveQuery] = useState("");

  const runSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setHasSearched(true);
    setResults([]);
    try {
      const { data } = await api.post<SearchResponse>("/search", { query: q });
      setResults(data.results);
      setActiveQuery(q);
    } catch (e: unknown) {
      setResults([]);
      let msg =
        "Search failed. Try again when documents are indexed and the backend is running.";
      if (axios.isAxiosError(e)) {
        if (e.code === "ERR_NETWORK" || !e.response) {
          msg = "Cannot reach the backend. Is the API running on port 8000?";
        } else if (typeof e.response?.data === "object" && e.response.data) {
          const d = e.response.data as { detail?: string };
          if (d.detail) msg = String(d.detail);
        }
      }
      setError(msg);
      showToast({ variant: "error", message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col p-8">
      <header className="mb-6">
        <h2 className="text-2xl font-semibold text-brand-950 dark:text-slate-100">
          Semantic search
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
          Natural-language queries over your local library. Results are ranked
          by embedding similarity (top 5).
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void runSearch()}
          placeholder="e.g. patient follow-up plan, limitation of liability…"
          disabled={loading}
          className="min-h-11 w-full flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 shadow-sm outline-none ring-brand-800 placeholder:text-slate-400 focus:ring-2 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        <button
          type="button"
          disabled={loading || !query.trim()}
          onClick={() => void runSearch()}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-900 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-600 dark:text-white dark:hover:bg-teal-500"
        >
          {loading ? (
            <>
              <Spinner onDark label="Searching" />
              Searching…
            </>
          ) : (
            "Search"
          )}
        </button>
      </div>

      {error && (
        <div
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-200"
          role="alert"
        >
          {error}
        </div>
      )}

      <section className="mt-10 space-y-5">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Results
          </h3>
          {hasSearched && !loading && results.length > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {results.length} match{results.length === 1 ? "" : "es"}
            </span>
          )}
        </div>

        {!hasSearched && (
          <EmptyState
            title="Search your documents"
            description="Enter a question or keywords. We match meaning—not just exact words—using locally computed embeddings."
            icon={
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            }
          />
        )}

        {hasSearched && !loading && !error && results.length === 0 && (
          <EmptyState
            title="No results found for this query"
            description="Try different wording, upload more documents, or wait until processing finishes. Semantic search works best when chunks exist for your files."
            icon={
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
        )}

        {loading && (
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
            <Spinner label="Searching" />
            Searching the index…
          </div>
        )}

        <ol className="space-y-5">
          {results.map((r, i) => (
            <li
              key={`${r.chunk_id}-${i}`}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/50"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="font-semibold text-brand-950 dark:text-slate-50">
                    {r.filename}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Document #{r.document_id} · Chunk {r.chunk_index}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setChunkModal(r)}
                  className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  View full text
                </button>
              </div>

              <div className="mt-4">
                <RelevanceBar score={r.score} />
              </div>

              <div className="mt-4 border-t border-slate-100 pt-4 text-sm leading-[1.75] text-slate-700 dark:border-slate-700/80 dark:text-slate-300">
                {highlightQueryTerms(r.snippet, activeQuery)}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {chunkModal && (
        <ChunkTextModal
          result={chunkModal}
          query={activeQuery}
          onClose={() => setChunkModal(null)}
        />
      )}
    </div>
  );
}
