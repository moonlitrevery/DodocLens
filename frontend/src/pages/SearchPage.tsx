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
        "Falha na busca. Tente novamente quando os documentos estiverem indexados e o backend estiver em execução.";
      if (axios.isAxiosError(e)) {
        if (e.code === "ERR_NETWORK" || !e.response) {
          msg = "Não foi possível conectar ao backend. A API está rodando na porta 8000?";
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
        <p className="section-kicker">Consulta</p>
        <h2 className="section-title">Busca semântica</h2>
        <p className="section-desc">
          Consultas em linguagem natural sobre sua biblioteca local. Os
          resultados são ordenados por similaridade de embeddings (top 5).
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void runSearch()}
          placeholder="ex.: plano de acompanhamento do paciente, limitação de responsabilidade…"
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
              <Spinner onDark label="Pesquisando" />
              Pesquisando…
            </>
          ) : (
            "Pesquisar"
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
            Resultados
          </h3>
          {hasSearched && !loading && results.length > 0 && (
            <span className="text-xs font-medium uppercase tracking-[0.2px] text-dl-muted">
              {results.length} resultado{results.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {!hasSearched && (
          <EmptyState
            title="Pesquise nos seus documentos"
            description="Digite uma pergunta ou palavras-chave. Encontramos significado — não apenas palavras exatas — usando embeddings calculados localmente."
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
            title="Nenhum resultado para esta consulta"
            description="Tente uma redação diferente, envie mais documentos ou aguarde o fim do processamento."
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
            <Spinner label="Pesquisando" />
            <span className="uppercase tracking-[0.2px]">
              Pesquisando no índice…
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
                    #{r.document_id} · trecho {r.chunk_index}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setChunkModal(r)}
                  className="btn-glass shrink-0 text-xs"
                >
                  Texto completo
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
