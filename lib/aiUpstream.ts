function truncate(value: string, max = 500): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

export interface UpstreamError {
  status: number;
  message: string;
}

export async function extractUpstreamError(
  res: Response,
  endpoint: string,
  hint: string
): Promise<UpstreamError> {
  const text = await res.text();
  let message = text.trim();
  try {
    const json = JSON.parse(text) as {
      error?: { message?: unknown; type?: unknown; code?: unknown };
      message?: unknown;
    } | null;
    if (typeof json?.error?.message === "string") {
      message = json.error.message;
    } else if (typeof json?.message === "string") {
      message = json.message;
    }
  } catch {
    // Not JSON — keep the raw body below.
  }

  if (!message || /^<(!doctype|html)/i.test(message) || message.startsWith("{")) {
    message = `The endpoint returned ${res.status} ${res.statusText}${text ? ` with body: ${truncate(text)}` : ""}.`;
  }

  if (res.status === 404) {
    message = `${hint} (received 404 Not Found).`;
  }

  return { status: res.status, message: truncate(message) };
}

export function buildEndpointHint(
  endpoint: string,
  kind: "chat" | "models"
): string {
  if (kind === "chat") {
    return `The chat endpoint "${endpoint}" was not found. Check the Base URL in Settings — it should point to an OpenAI-compatible chat completions route, e.g. https://host/v1/chat/completions or https://api.deepseek.com/v1/chat/completions`;
  }
  return `The models endpoint "${endpoint}" was not found. Check the Base URL in Settings — it should point to an OpenAI-compatible base (e.g. https://host/v1 or https://api.deepseek.com)`;
}
