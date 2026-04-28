import type { RequestConfig } from "../features/scan/types";

export interface FetchContext {
  request: Required<RequestConfig>;
  fetchText: (url: string, init?: RequestInit) => Promise<string>;
  fetchJson: <T>(url: string, init?: RequestInit) => Promise<T>;
}
