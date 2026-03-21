import { useCallback, useRef, useState } from "react";
import { api } from "../api/client";
import type { DocumentSummary } from "../types";

export function UploadPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<DocumentSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = useCallback(async (file: File) => {
    setError(null);
    setMessage(null);
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
      setMessage(
        "Upload received. Text extraction and embedding run in the background.",
      );
      setProgress(100);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? String(
              (e as { response?: { data?: { detail?: string } } }).response
                ?.data?.detail ?? "Upload failed.",
            )
          : "Upload failed.";
      setError(msg);
    } finally {
      setUploading(false);
    }
  }, []);

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
        className={`flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 transition-colors ${
          dragOver
            ? "border-accent bg-teal-50/50 dark:bg-brand-900/40"
            : "border-slate-300 bg-white dark:border-slate-600 dark:bg-brand-900/20"
        }`}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,image/png,image/jpeg,application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void uploadFile(f);
            e.target.value = "";
          }}
        />
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
            <span>Uploading…</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className="h-full rounded-full bg-brand-800 transition-all duration-300 dark:bg-accent"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {message && (
        <p className="mt-4 text-sm text-accent dark:text-accent-muted">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {lastDoc && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 text-sm dark:border-slate-700 dark:bg-brand-900/30">
          <div className="font-medium text-brand-950 dark:text-slate-100">
            {lastDoc.filename}
          </div>
          <div className="mt-1 text-slate-600 dark:text-slate-400">
            Status:{" "}
            <span className="capitalize text-brand-800 dark:text-slate-200">
              {lastDoc.status}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
