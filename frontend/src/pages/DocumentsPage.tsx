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
      return "border-dl-purple/50 bg-dl-purple/20 text-dl-lime";
    case "processing":
    case "pending":
      return "border-dl-border bg-dl-btn-muted/30 text-dl-coral";
    case "error":
      return "border-dl-pink/40 bg-dl-pink/10 text-dl-coral";
    default:
      return "border-dl-border bg-dl-bg-deep text-dl-muted";
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
    <div className="flex flex-1 flex-col">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 md:mb-10">
        <div>
          <p className="section-kicker">Library</p>
          <h2 className="section-title">Documents</h2>
          <p className="section-desc">
            Status refreshes automatically while files are processing.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="btn-glass disabled:opacity-45"
        >
          Refresh
        </button>
      </header>

      {needsPoll && (
        <div
          className="card-glass mb-6 flex items-center gap-4 border border-dl-border px-4 py-3"
          role="status"
        >
          <Spinner label="Processing" />
          <span className="text-sm leading-relaxed text-dl-muted">
            <span className="font-semibold uppercase tracking-[0.2px] text-dl-coral">
              Processing…
            </span>{" "}
            OCR, chunking, and embeddings are running locally. Large files can
            take a minute.
          </span>
        </div>
      )}

      {loading && list.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-dl-muted">
          <Spinner label="Loading documents" />
          <span className="text-sm uppercase tracking-[0.2px]">
            Loading library…
          </span>
        </div>
      )}

      {err && !loading && (
        <div
          className="mb-6 rounded-xl border border-dl-pink/40 bg-dl-pink/10 px-4 py-3 text-sm text-dl-coral"
          role="alert"
        >
          {err}
        </div>
      )}

      {!loading && !err && list.length === 0 && (
        <EmptyState
          title="No documents uploaded yet"
          description="Upload a PDF or image from the Upload tab. When status shows ready, semantic search can use that file."
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
        <ul className="card-elevated divide-y divide-dl-border overflow-hidden rounded-xl border border-dl-border">
          {list.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => void openDetail(d.id)}
                className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors duration-theme hover:bg-white/[0.04]"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium text-white">
                    {d.filename}
                  </div>
                  <div className="mt-1 font-mono text-xs text-dl-code">
                    {new Date(d.created_at).toLocaleString()}
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.2px] ${statusStyles(d.status)}`}
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-dl-bg-deep/75 p-4 backdrop-blur-glass backdrop-saturate-[180%]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="doc-detail-title"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-xl border border-dl-border bg-dl-bg-deep/95 shadow-btn-hover backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-dl-border px-5 py-4">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.25px] text-dl-muted">
                  Document
                </p>
                <h3
                  id="doc-detail-title"
                  className="mt-1 truncate font-display text-xl font-semibold text-white"
                >
                  {selected.filename}
                </h3>
                <span
                  className={`mt-3 inline-block rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.2px] ${statusStyles(selected.status)}`}
                >
                  {selected.status}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="btn-glass shrink-0 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-[0.2px]"
                aria-label="Close"
              >
                Close
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-5 py-4 text-sm">
              {selected.error_message && (
                <p className="mb-4 rounded-lg border border-dl-pink/40 bg-dl-pink/10 p-3 text-dl-coral">
                  {selected.error_message}
                </p>
              )}
              {selected.extracted_text_preview ? (
                <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-dl-muted">
                  {selected.extracted_text_preview}
                </pre>
              ) : (
                <p className="text-dl-muted">
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
