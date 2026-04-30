import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
  "/api";

export const api = axios.create({
  baseURL,
  timeout: 120_000,
});

export const deleteDocument = (id: number): Promise<void> =>
  api.delete(`/documents/${id}`).then(() => undefined);

export function getHealthUrl(): string {
  return `${baseURL}/health`;
}
