import { useState } from "react";
import { api } from "../api/client";
import type { SearchResultItem } from "../types";

interface SearchResponse {
  results: SearchResultItem[];
}

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const runSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post<SearchResponse>("/search", { query: q });
      setResults(data.results);
    } catch {
      setError("Search failed. Ensure documents are processed and backend is running.");
      setResults([]);
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
          Ask in natural language. Results rank by cosine similarity over local
          embeddings (top 5).
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void runSearch()}
          placeholder="e.g. summary of diagnosis, contract termination clause…"
          className="min-h-11 flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 shadow-sm outline-none ring-brand-800 placeholder:text-slate-400 focus:ring-2 dark:border-slate-600 dark:bg-brand-900 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        <button
          type="button"
          disabled={loading || !query.trim()}
          onClick={() => void runSearch()}
          className="rounded-lg bg-brand-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-accent dark:text-brand-950 dark:hover:bg-accent-muted"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <section className="mt-8 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Results
        </h3>
        {results.length === 0 && !loading && !error && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No results yet. Upload documents and wait until status is “ready”.
          </p>
        )}
        <ol className="space-y-3">
          {results.map((r, i) => (
            <li
              key={`${r.document_id}-${r.chunk_index}-${i}`}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-brand-900/25"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="font-medium text-brand-950 dark:text-slate-100">
                  {r.filename}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Doc #{r.document_id} · Chunk {r.chunk_index} · Similarity{" "}
                  <span className="font-mono text-accent dark:text-accent-muted">
                    {(r.score * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {r.snippet}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
