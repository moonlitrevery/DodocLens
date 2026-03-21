import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
  "http://127.0.0.1:8000";

export const api = axios.create({
  baseURL,
  timeout: 120_000,
});

export function getHealthUrl(): string {
  return `${baseURL}/health`;
}
