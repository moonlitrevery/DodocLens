import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { Spinner } from "../components/Spinner";
import { useToast } from "../context/ToastContext";
import type { DocumentSummary } from "../types";

const ALLOWED_EXT = /\.(pdf|png|jpe?g)$/i;

function isAllowedFile(file: File) {
  if (ALLOWED_EXT.test(file.name)) return true;
  const t = file.type.toLowerCase();
  return (
    t === "application/pdf" ||
    t === "image/png" ||
    t === "image/jpeg" ||
    t === "image/jpg"
  );
}

export function UploadPage() {
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastDoc, setLastDoc] = useState<DocumentSummary | null>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!isAllowedFile(file)) {
        showToast({
          variant: "error",
          message: "Invalid file type. Use PDF, PNG, or JPG only.",
        });
        return;
      }

      setLastDoc(null);
      setUploading(true);
      setProgress(0);
      const form = new FormData();
      form.append("file", file);
      try {
        const { data } = await api.post<DocumentSummary>("/upload", form, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (ev) => {
            if (ev.total) {
              setProgress(Math.round((ev.loaded / ev.total) * 100));
            }
          },
        });
        setLastDoc(data);
        setProgress(100);
        showToast({
          variant: "success",
          message: `Uploaded “${data.filename}”. Processing in the background.`,
        });
      } catch (e: unknown) {
        let msg = "Upload failed.";
        if (axios.isAxiosError(e)) {
          if (e.code === "ERR_NETWORK" || !e.response) {
            msg = "Cannot reach the backend. Is the API running?";
          } else {
            const d = e.response?.data as { detail?: string } | undefined;
            if (d?.detail) msg = String(d.detail);
          }
        }
        showToast({ variant: "error", message: msg });
      } finally {
        setUploading(false);
      }
    },
    [showToast],
  );

  useEffect(() => {
    if (
      !lastDoc ||
      (lastDoc.status !== "pending" && lastDoc.status !== "processing")
    ) {
      return;
    }
    const docId = lastDoc.id;
    const intervalId = window.setInterval(async () => {
      try {
        const { data } = await api.get<DocumentSummary>(`/documents/${docId}`);
        setLastDoc(data);
        if (data.status === "ready") {
          showToast({
            variant: "success",
            message: `Processing finished: “${data.filename}” is ready to search.`,
          });
          window.clearInterval(intervalId);
        } else if (data.status === "error") {
          showToast({
            variant: "error",
            message: `Processing failed for “${data.filename}”.`,
          });
          window.clearInterval(intervalId);
        }
      } catch {
        /* ignore transient errors while polling */
      }
    }, 2500);
    return () => window.clearInterval(intervalId);
  }, [lastDoc?.id, lastDoc?.status, showToast]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f) void uploadFile(f);
    },
    [uploadFile],
  );

  return (
    <div className="flex flex-1 flex-col p-8">
      <header className="mb-8">
        <h2 className="text-2xl font-semibold text-brand-950 dark:text-slate-100">
          Upload documents
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
          PDF, PNG, or JPG. Files stay on this machine; OCR and embeddings run
          locally.
        </p>
      </header>

      <div
        role="button"
        tabIndex={0}
        aria-busy={uploading}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className={`relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 transition-colors duration-300 ${
          dragOver
            ? "border-teal-500 bg-teal-50/60 dark:border-teal-500/60 dark:bg-teal-950/30"
            : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900/40"
        } ${uploading ? "pointer-events-none opacity-90" : ""}`}
        onClick={() => !uploading && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,image/png,image/jpeg,application/pdf"
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void uploadFile(f);
            e.target.value = "";
          }}
        />

        {uploading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-[inherit] bg-white/85 dark:bg-slate-950/80">
            <Spinner label="Uploading file" />
            <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">
              Uploading…
            </p>
          </div>
        )}

        <div className="text-center">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
            Drag and drop a file here
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            or click to choose · PDF, PNG, JPG
          </p>
        </div>
      </div>

      {uploading && (
        <div className="mt-6">
          <div className="mb-1 flex justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Transfer progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className="h-full rounded-full bg-brand-800 transition-all duration-300 dark:bg-teal-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {lastDoc && !uploading && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900/50">
          <div className="font-medium text-brand-950 dark:text-slate-100">
            {lastDoc.filename}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-slate-600 dark:text-slate-400">
            <span>Status:</span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                lastDoc.status === "ready"
                  ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100"
                  : lastDoc.status === "error"
                    ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-100"
                    : "bg-amber-100 text-amber-900 dark:bg-amber-900/35 dark:text-amber-100"
              }`}
            >
              {lastDoc.status === "pending" || lastDoc.status === "processing"
                ? "Processing…"
                : lastDoc.status}
            </span>
          </div>
          {lastDoc.status === "pending" || lastDoc.status === "processing" ? (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Processing runs in the background. We will notify you here when
              it finishes, or open Documents for the full library view.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
