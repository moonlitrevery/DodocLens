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
    <div className="flex flex-1 flex-col">
      <header className="mb-8 md:mb-10">
        <p className="section-kicker">Retrieve</p>
        <h2 className="section-title">Semantic search</h2>
        <p className="section-desc">
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
          className="input-field min-h-11 w-full flex-1 sm:min-h-[3rem]"
        />
        <button
          type="button"
          disabled={loading || !query.trim()}
          onClick={() => void runSearch()}
          className="btn-primary inline-flex min-h-11 shrink-0 items-center justify-center gap-2 sm:min-h-[3rem] sm:px-8"
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
          className="mt-4 rounded-xl border border-dl-pink/40 bg-dl-pink/10 px-4 py-3 text-sm text-dl-coral"
          role="alert"
        >
          {error}
        </div>
      )}

      <section className="mt-12 space-y-6 md:mt-16">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2px] text-dl-muted">
            Results
          </h3>
          {hasSearched && !loading && results.length > 0 && (
            <span className="text-xs font-medium uppercase tracking-[0.2px] text-dl-muted">
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
            title="No results for this query"
            description="Try different wording, upload more documents, or wait until processing finishes."
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
          <div className="card-glass flex items-center gap-4 border border-dl-border px-5 py-4 text-sm text-dl-muted">
            <Spinner label="Searching" />
            <span className="uppercase tracking-[0.2px]">
              Searching the index…
            </span>
          </div>
        )}

        <ol className="space-y-5">
          {results.map((r, i) => (
            <li
              key={`${r.chunk_id}-${i}`}
              className="card-elevated border border-dl-border p-5 md:p-6"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="font-display text-lg font-medium text-white">
                    {r.filename}
                  </div>
                  <div className="mt-1 font-mono text-xs text-dl-code">
                    #{r.document_id} · chunk {r.chunk_index}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setChunkModal(r)}
                  className="btn-glass shrink-0 text-xs"
                >
                  Full text
                </button>
              </div>

              <div className="mt-4">
                <RelevanceBar score={r.score} />
              </div>

              <div className="mt-5 border-t border-dl-border pt-5 text-sm leading-relaxed text-dl-muted">
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
