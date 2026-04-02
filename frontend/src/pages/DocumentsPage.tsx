import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { api } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { Spinner } from "../components/Spinner";
import { useToast } from "../context/ToastContext";
import type { DocumentDetail, DocumentSummary } from "../types";

function statusStyles(status: string) {
  switch (status) {
    case "ready":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-100";
    case "processing":
    case "pending":
      return "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100";
    case "error":
      return "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
  }
}

export function DocumentsPage() {
  const { showToast } = useToast();
  const [list, setList] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<DocumentDetail | null>(null);
  const prevStatusRef = useRef<Map<number, string>>(new Map());
  const initializedRef = useRef(false);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const { data } = await api.get<DocumentSummary[]>("/documents");
      setList(data);

      if (initializedRef.current) {
        for (const d of data) {
          const prev = prevStatusRef.current.get(d.id);
          if (
            prev &&
            (prev === "pending" || prev === "processing") &&
            d.status === "ready"
          ) {
            showToast({
              variant: "success",
              message: `Document ready: “${d.filename}”. You can search it now.`,
            });
          }
          if (
            prev &&
            (prev === "pending" || prev === "processing") &&
            d.status === "error"
          ) {
            showToast({
              variant: "error",
              message: `Processing failed for “${d.filename}”. ${d.error_message || "See details in the document preview."}`,
            });
          }
        }
      }

      const next = new Map<number, string>();
      for (const d of data) next.set(d.id, d.status);
      prevStatusRef.current = next;
      initializedRef.current = true;
    } catch (e: unknown) {
      let msg = "Could not load documents.";
      if (axios.isAxiosError(e) && (e.code === "ERR_NETWORK" || !e.response)) {
        msg = "Backend offline — start the API or launch the full desktop app.";
      }
      setErr(msg);
      showToast({ variant: "error", message: msg });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

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
      showToast({
        variant: "error",
        message: "Could not load document details.",
      });
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
            Status refreshes automatically while files are processing.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Refresh
        </button>
      </header>

      {needsPoll && (
        <div
          className="mb-4 flex items-center gap-3 rounded-lg border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100"
          role="status"
        >
          <Spinner label="Processing" />
          <span>
            <span className="font-semibold">Processing…</span> OCR, chunking,
            and embeddings are running locally. This can take a minute for large
            files.
          </span>
        </div>
      )}

      {loading && list.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-600 dark:text-slate-400">
          <Spinner label="Loading documents" />
          <span className="text-sm">Loading library…</span>
        </div>
      )}

      {err && !loading && (
        <div
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100"
          role="alert"
        >
          {err}
        </div>
      )}

      {!loading && !err && list.length === 0 && (
        <EmptyState
          title="No documents uploaded yet"
          description="Upload a PDF or image from the Upload tab. Once status shows “ready”, semantic search can find content in that file."
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          }
        />
      )}

      {list.length > 0 && (
        <ul className="mt-2 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white shadow-sm dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-900/40">
          {list.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => void openDetail(d.id)}
                className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
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
                  {d.status === "pending" || d.status === "processing"
                    ? "Processing…"
                    : d.status}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px] transition-opacity duration-300"
          role="dialog"
          aria-modal="true"
          aria-labelledby="doc-detail-title"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-600 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
              <div>
                <h3
                  id="doc-detail-title"
                  className="text-lg font-semibold text-brand-950 dark:text-slate-50"
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
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-5 py-4 text-sm">
              {selected.error_message && (
                <p className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 dark:border-red-800/50 dark:bg-red-950/50 dark:text-red-100">
                  {selected.error_message}
                </p>
              )}
              {selected.extracted_text_preview ? (
                <pre className="whitespace-pre-wrap font-sans leading-relaxed text-slate-700 dark:text-slate-200">
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
