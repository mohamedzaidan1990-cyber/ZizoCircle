const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function readAccessToken(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|; )propiq_access=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export interface StreamHandlers {
  onDelta: (text: string) => void;
  onDone?: (data: unknown) => void;
  onError?: (message: string) => void;
}

/**
 * Reads an SSE stream from a POST endpoint.
 *
 * The server emits `event: delta` lines with a JSON `{text}` payload, optional
 * `event: error` lines, and a terminal `event: done` line. The connection is
 * closed by the server when complete or aborted.
 */
export async function postStream(
  path: string,
  body: unknown,
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const token = readAccessToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    handlers.onError?.(`Stream failed (${res.status}): ${text.slice(0, 200)}`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  // SSE messages are separated by a blank line. Each message can have multiple
  // lines (event:, data:). We accumulate lines until the blank line, then dispatch.
  const flushMessage = (msg: string) => {
    let event = "message";
    let data = "";
    for (const line of msg.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) data += line.slice(5).trimStart();
    }
    if (!data) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      return;
    }
    if (event === "delta") {
      const t = (parsed as { text?: string }).text;
      if (typeof t === "string") handlers.onDelta(t);
    } else if (event === "done") {
      handlers.onDone?.(parsed);
    } else if (event === "error") {
      const m = (parsed as { message?: string }).message ?? "Stream error";
      handlers.onError?.(m);
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const msg = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      if (msg.trim()) flushMessage(msg);
    }
  }
  if (buffer.trim()) flushMessage(buffer);
}
