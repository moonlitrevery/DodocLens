export type DocumentStatus = "pending" | "processing" | "ready" | "error";

export interface DocumentSummary {
  id: number;
  filename: string;
  mime_type: string;
  status: DocumentStatus;
  error_message: string | null;
  created_at: string;
}

export interface DocumentDetail extends DocumentSummary {
  extracted_text_preview: string | null;
}

export interface SearchResultItem {
  document_id: number;
  filename: string;
  chunk_index: number;
  snippet: string;
  score: number;
}
