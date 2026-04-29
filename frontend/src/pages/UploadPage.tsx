import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { Spinner } from "../components/Spinner";
import { useToast } from "../context/ToastContext";
import type { DocumentSummary } from "../types";

const ALLOWED_EXT = /\.(pdf|txt|png|jpe?g)$/i;
const BATCH_ALLOWED_EXT = /\.(pdf|txt|png|jpe?g)$/i;
const MAX_BATCH_FILES = 200;

interface BatchUploadResponse {
  queued: number;
  skipped: number;
  documents: DocumentSummary[];
}

function isAllowedFile(file: File) {
  if (ALLOWED_EXT.test(file.name)) return true;
  const t = file.type.toLowerCase();
  return (
    t === "application/pdf" ||
    t === "text/plain" ||
    t === "image/png" ||
    t === "image/jpeg" ||
    t === "image/jpg"
  );
}

export function UploadPage() {
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastDoc, setLastDoc] = useState<DocumentSummary | null>(null);
  const [batchImporting, setBatchImporting] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

  const uploadFile = useCallback(
    async (file: File) => {
      if (!isAllowedFile(file)) {
        showToast({
          variant: "error",
          message: "Tipo de arquivo inválido. Use apenas PDF, TXT, PNG ou JPG.",
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
          message: `Arquivo “${data.filename}” enviado. Processamento em segundo plano.`,
        });
      } catch (e: unknown) {
        let msg = "Falha no envio.";
        if (axios.isAxiosError(e)) {
          if (e.code === "ERR_NETWORK" || !e.response) {
            msg = "Não foi possível conectar ao backend. A API está em execução?";
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
            message: `Processamento concluído: “${data.filename}” pronto para busca.`,
          });
          window.clearInterval(intervalId);
        } else if (data.status === "error") {
          showToast({
            variant: "error",
            message: `Falha no processamento de “${data.filename}”.`,
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

  const importFolder = useCallback(async () => {
    if (!window.electronAPI) return;
    setLastDoc(null);
    setBatchImporting(true);
    setBatchProgress({ current: 0, total: 0 });
    try {
      const selected = await window.electronAPI.selectFolder();
      if (!selected || selected.length === 0) {
        showToast({ variant: "info", message: "Nenhum arquivo encontrado na pasta selecionada." });
        return;
      }
      const allowed = selected.filter((p) => BATCH_ALLOWED_EXT.test(p));
      if (allowed.length === 0) {
        showToast({
          variant: "error",
          message: "A pasta não possui arquivos suportados (.pdf, .txt, .png, .jpg).",
        });
        return;
      }
      let toImport = allowed;
      if (allowed.length > MAX_BATCH_FILES) {
        toImport = allowed.slice(0, MAX_BATCH_FILES);
        showToast({
          variant: "info",
          message: `Limite de ${MAX_BATCH_FILES} arquivos por importação. Serão importados os primeiros ${MAX_BATCH_FILES}.`,
        });
      }
      setBatchProgress({ current: 0, total: toImport.length });
      const { data } = await api.post<BatchUploadResponse>("/upload/batch", {
        paths: toImport,
      });
      setBatchProgress({ current: data.queued + data.skipped, total: toImport.length });
      for (const doc of data.documents) {
        showToast({
          variant: "success",
          message: `Importado: “${doc.filename}”. Processamento em segundo plano.`,
        });
      }
      if (data.skipped > 0) {
        showToast({
          variant: "info",
          message: `${data.skipped} arquivo(s) foram ignorados (duplicados, inválidos ou vazios).`,
        });
      }
      showToast({
        variant: "success",
        message: `${data.queued} arquivos importados com sucesso.`,
      });
    } catch (e: unknown) {
      let msg = "Falha ao importar pasta.";
      if (axios.isAxiosError(e)) {
        const d = e.response?.data as { detail?: string } | undefined;
        if (d?.detail) msg = String(d.detail);
      }
      showToast({ variant: "error", message: msg });
    } finally {
      setBatchImporting(false);
    }
  }, [showToast]);

  const importFolderFromBrowser = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) {
        showToast({ variant: "info", message: "Nenhum arquivo encontrado na pasta selecionada." });
        return;
      }
      const all = Array.from(files);
      const allowed = all.filter((f) => BATCH_ALLOWED_EXT.test(f.name));
      if (allowed.length === 0) {
        showToast({
          variant: "error",
          message: "A pasta não possui arquivos suportados (.pdf, .txt, .png, .jpg).",
        });
        return;
      }

      let toImport = allowed;
      if (allowed.length > MAX_BATCH_FILES) {
        toImport = allowed.slice(0, MAX_BATCH_FILES);
        showToast({
          variant: "info",
          message: `Limite de ${MAX_BATCH_FILES} arquivos por importação. Serão importados os primeiros ${MAX_BATCH_FILES}.`,
        });
      }

      setBatchImporting(true);
      setBatchProgress({ current: 0, total: toImport.length });
      let queued = 0;
      let skipped = 0;
      try {
        for (let i = 0; i < toImport.length; i += 1) {
          const file = toImport[i];
          setBatchProgress({ current: i, total: toImport.length });
          try {
            const form = new FormData();
            form.append("file", file);
            const { data } = await api.post<DocumentSummary>("/upload", form, {
              headers: { "Content-Type": "multipart/form-data" },
            });
            queued += 1;
            showToast({
              variant: "success",
              message: `Importado: “${data.filename}”. Processamento em segundo plano.`,
            });
          } catch {
            skipped += 1;
            showToast({
              variant: "error",
              message: `Falha ao importar “${file.name}”.`,
            });
          }
        }
        setBatchProgress({ current: toImport.length, total: toImport.length });
        if (skipped > 0) {
          showToast({
            variant: "info",
            message: `${skipped} arquivo(s) não foram importados.`,
          });
        }
        showToast({
          variant: "success",
          message: `${queued} arquivos importados com sucesso.`,
        });
      } finally {
        setBatchImporting(false);
      }
    },
    [showToast],
  );

  return (
    <div className="flex flex-1 flex-col">
      <header className="mb-10 md:mb-16">
        <p className="section-kicker">Ingestão</p>
        <h2 className="section-title">Enviar documentos</h2>
        <p className="section-desc">
          PDF, TXT, PNG ou JPG. Os arquivos ficam nesta máquina; OCR e embeddings
          rodam localmente.
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
        className={[
          "relative flex min-h-[240px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 transition-all duration-theme md:min-h-[280px]",
          dragOver
            ? "border-dl-lime bg-dl-lime/10 shadow-ambient"
            : "border-dl-border bg-dl-glass/30 shadow-glass backdrop-blur-glass backdrop-saturate-[180%]",
          uploading ? "pointer-events-none opacity-90" : "",
        ].join(" ")}
        onClick={() => !uploading && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.png,.jpg,.jpeg,text/plain,image/png,image/jpeg,application/pdf"
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void uploadFile(f);
            e.target.value = "";
          }}
        />

        {uploading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-[inherit] bg-dl-bg-deep/90 backdrop-blur-sm">
            <Spinner onDark label="Enviando arquivo" />
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2px] text-dl-muted">
              Enviando…
            </p>
          </div>
        )}

        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2px] text-white">
            Arraste e solte um arquivo aqui
          </p>
          <p className="mt-2 text-sm text-dl-muted">
            ou clique para escolher · PDF, TXT, PNG, JPG
          </p>
          <button
            type="button"
            className="btn-cta mt-8"
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
            disabled={uploading}
          >
            Escolher arquivo
          </button>
        </div>
      </div>

      <input
        ref={folderInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          void importFolderFromBrowser(e.target.files);
          e.target.value = "";
        }}
      />

      <div className="card-elevated mt-6 border border-dl-border p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2px] text-dl-muted">
              Importação em lote
            </p>
            <p className="mt-1 text-sm text-dl-muted">
              Selecione uma pasta para importar automaticamente arquivos PDF, TXT, PNG e JPG.
            </p>
          </div>
          <button
            type="button"
            className="btn-glass"
            onClick={() => {
              if (window.electronAPI) {
                void importFolder();
                return;
              }
              if (folderInputRef.current) {
                folderInputRef.current.setAttribute("webkitdirectory", "");
                folderInputRef.current.setAttribute("directory", "");
                folderInputRef.current.click();
              }
            }}
            disabled={uploading || batchImporting}
          >
            {batchImporting ? "Importando pasta…" : "Importar pasta"}
          </button>
        </div>
        {batchImporting && batchProgress.total > 0 && (
          <p className="mt-4 text-sm text-dl-muted">
            Importando {batchProgress.current} de {batchProgress.total} arquivos...
          </p>
        )}
      </div>

      {uploading && (
        <div className="mt-8">
          <div className="mb-2 flex justify-between text-xs font-semibold uppercase tracking-[0.2px] text-dl-muted">
            <span>Transferência</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-dl-border">
            <div
              className="h-full rounded-full bg-gradient-to-r from-dl-purple to-dl-lime transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {lastDoc && !uploading && (
        <div className="card-elevated mt-8 border border-dl-border p-5">
          <div className="font-display text-lg font-medium text-white">
            {lastDoc.filename}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-dl-muted">
            <span className="uppercase tracking-[0.2px]">Status</span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.2px] ${
                lastDoc.status === "ready"
                  ? "border-dl-purple/50 bg-dl-purple/20 text-dl-lime"
                  : lastDoc.status === "error"
                    ? "border-dl-pink/40 bg-dl-pink/10 text-dl-coral"
                    : "border-dl-border bg-dl-btn-muted/25 text-dl-coral"
              }`}
            >
              {lastDoc.status === "pending" || lastDoc.status === "processing"
                ? "Processando…"
                : lastDoc.status === "ready"
                  ? "Pronto"
                  : lastDoc.status === "error"
                    ? "Erro"
                    : lastDoc.status === "pending"
                      ? "Aguardando"
                      : lastDoc.status}
            </span>
          </div>
          {lastDoc.status === "pending" || lastDoc.status === "processing" ? (
            <p className="mt-3 text-sm leading-relaxed text-dl-muted">
              O processamento roda em segundo plano. Você receberá um toast
              quando terminar, ou abra{" "}
              <span className="font-medium text-dl-purple">Documentos</span>{" "}
              para ver a biblioteca completa.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
