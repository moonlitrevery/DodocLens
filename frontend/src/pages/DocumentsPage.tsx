import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { DocumentDetail, DocumentSummary } from "../types";

function statusStyles(status: string) {
  switch (status) {
    case "ready":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200";
    case "processing":
    case "pending":
      return "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100";
    case "error":
      return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
  }
}

export function DocumentsPage() {
  const [list, setList] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<DocumentDetail | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const { data } = await api.get<DocumentSummary[]>("/documents");
      setList(data);
    } catch {
      setErr("Could not load documents. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const needsPoll = list.some(
    (d) => d.status === "pending" || d.status === "processing",
  );

  useEffect(() => {
    if (!needsPoll) return;
    const id = window.setInterval(() => void load(), 2500);
    return () => window.clearInterval(id);
  }, [needsPoll, load]);

  const openDetail = async (id: number) => {
    try {
      const { data } = await api.get<DocumentDetail>(`/documents/${id}`);
      setSelected(data);
    } catch {
      setSelected(null);
    }
  };

  return (
    <div className="flex flex-1 flex-col p-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-brand-950 dark:text-slate-100">
            Documents
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Processing status updates automatically.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-brand-900 dark:text-slate-200 dark:hover:bg-brand-800"
        >
          Refresh
        </button>
      </header>

      {loading && (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
      )}
      {err && (
        <p className="text-sm text-red-600 dark:text-red-400">{err}</p>
      )}

      {!loading && !err && list.length === 0 && (
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No documents yet. Upload a file from the Upload tab.
        </p>
      )}

      <ul className="mt-2 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-700 dark:border-slate-700 dark:bg-brand-900/20">
        {list.map((d) => (
          <li key={d.id}>
            <button
              type="button"
              onClick={() => void openDetail(d.id)}
              className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-brand-900/40"
            >
              <div className="min-w-0">
                <div className="truncate font-medium text-slate-900 dark:text-slate-100">
                  {d.filename}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {new Date(d.created_at).toLocaleString()}
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyles(d.status)}`}
              >
                {d.status}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="doc-detail-title"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-brand-950"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
              <div>
                <h3
                  id="doc-detail-title"
                  className="text-lg font-semibold text-brand-950 dark:text-slate-100"
                >
                  {selected.filename}
                </h3>
                <span
                  className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyles(selected.status)}`}
                >
                  {selected.status}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-brand-900"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-5 py-4 text-sm">
              {selected.error_message && (
                <p className="mb-3 rounded-lg bg-red-50 p-3 text-red-800 dark:bg-red-900/30 dark:text-red-200">
                  {selected.error_message}
                </p>
              )}
              {selected.extracted_text_preview ? (
                <pre className="whitespace-pre-wrap font-sans leading-relaxed text-slate-700 dark:text-slate-300">
                  {selected.extracted_text_preview}
                </pre>
              ) : (
                <p className="text-slate-500 dark:text-slate-400">
                  {selected.status === "ready"
                    ? "No preview text stored for this document."
                    : "Preview will appear when processing completes."}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
