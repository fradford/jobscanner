import type { RequestConfig } from "../types";
import type { FetchContext } from "./types";

const DEFAULT_REQUEST: Required<RequestConfig> = {
  timeoutMs: 15_000,
  throttleMs: 300,
  userAgent: "jobscanner/0.1",
  maxPages: 5,
};

export function createFetchContext(
  requestConfig?: RequestConfig,
): FetchContext {
  const request = { ...DEFAULT_REQUEST, requestConfig };
  let lastRequestAt = 0;

  const applyThrottle = async (): Promise<void> => {
    const elapsed = Date.now() - lastRequestAt;
    if (elapsed < request.throttleMs) {
      await new Promise((resolve) =>
        setTimeout(resolve, request.throttleMs - elapsed),
      );
    }

    lastRequestAt = Date.now();
  };

  const fetchText = async (
    url: string,
    init?: RequestInit,
  ): Promise<string> => {
    await applyThrottle();

    const headers = new Headers(init?.headers ?? {});
    if (!headers.has("user-agent")) {
      headers.set("user-agent", request.userAgent);
    }

    const response = await fetch(url, {
      ...init,
      headers,
      signal: AbortSignal.timeout(request.timeoutMs),
    });

    if (!response.ok)
      throw new Error(
        `Request failed: ${response.status} ${response.statusText} (${url})`,
      );

    return response.text();
  };

  const fetchJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
    const text = await fetchText(url, init);

    return JSON.parse(text) as T;
  };

  return {
    request,
    fetchText,
    fetchJson,
  };
}
