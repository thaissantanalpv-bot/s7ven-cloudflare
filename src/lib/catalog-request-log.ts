// Record only operation names, durations, HTTP status and safe network error codes.
export function logCatalogFetch(
  input: RequestInfo | URL,
  init: RequestInit,
  operation: string,
): Promise<Response> {
  const started = Date.now();
  console.info("[S7VEN]", operation, "inicio");
  return fetch(input, init).then(
    (response) => {
      const logger = response.ok ? console.info : console.error;
      logger("[S7VEN]", operation, "HTTP", response.status, Date.now() - started, "ms");
      return response;
    },
    (error: unknown) => {
      const code = (error as { cause?: { code?: unknown } } | null)?.cause?.code;
      const reason = typeof code === "string" && /^[A-Z0-9_]{1,40}$/.test(code) ? code : "FETCH_ERROR";
      console.error("[S7VEN]", operation, reason, Date.now() - started, "ms");
      throw error;
    },
  );
}
