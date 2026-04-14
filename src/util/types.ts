import type { RequestConfig } from "../types";

export interface FetchContext {
  request: Required<RequestConfig>;
  fetchText: (url: string, init?: RequestInit) => Promise<string>;
  fetchJson: <T>(url: string, init?: RequestInit) => Promise<T>;
}
