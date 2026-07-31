import { getProviderMeta, type AIProvider } from "@/types/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

interface AiRequestBody {
  prompt: string;
  provider: AIProvider;
  model: string;
  apiKey: string;
  baseUrl?: string;
  system?: string;
}

function isAIProvider(value: unknown): value is AIProvider {
  return (
    value === "openai" ||
    value === "anthropic" ||
    value === "groq" ||
    value === "custom"
  );
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function resolveEndpoint(
  provider: AIProvider,
  baseUrl: string | undefined
): string {
  const meta = getProviderMeta(provider);
  if (!baseUrl?.trim()) return meta.endpoint;
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  if (trimmed.endsWith("/chat/completions")) return trimmed;
  return `${trimmed}/v1/chat/completions`;
}

export async function POST(request: Request) {
  let body: AiRequestBody;
  try {
    body = (await request.json()) as AiRequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { prompt, provider, model, apiKey, baseUrl, system } = body;

  if (typeof prompt !== "string" || !prompt.trim()) {
    return Response.json({ error: "Prompt is required." }, { status: 400 });
  }
  if (!isAIProvider(provider)) {
    return Response.json({ error: "Unknown provider." }, { status: 400 });
  }
  if (typeof model !== "string" || !model.trim()) {
    return Response.json({ error: "Model is required." }, { status: 400 });
  }
  if (typeof apiKey !== "string" || !apiKey.trim()) {
    return Response.json({ error: "API key is required." }, { status: 400 });
  }
  if (
    baseUrl !== undefined &&
    typeof baseUrl === "string" &&
    !isHttpUrl(baseUrl.trim())
  ) {
    return Response.json({ error: "Invalid base URL." }, { status: 400 });
  }
  if (system !== undefined && typeof system !== "string") {
    return Response.json({ error: "Invalid system prompt." }, { status: 400 });
  }

  const providerMeta = getProviderMeta(provider);
  const endpoint = resolveEndpoint(provider, baseUrl);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (providerMeta.id === "anthropic") {
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
  } else {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const trimmedSystem = system?.trim();
  const payload =
    providerMeta.id === "anthropic"
      ? {
          model,
          max_tokens: 1024,
          ...(trimmedSystem ? { system: trimmedSystem } : {}),
          messages: [{ role: "user", content: prompt }],
          stream: true,
        }
      : {
          model,
          messages: trimmedSystem
            ? [
                { role: "system", content: trimmedSystem },
                { role: "user", content: prompt },
              ]
            : [{ role: "user", content: prompt }],
          stream: true,
        };

  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!upstream.ok || !upstream.body) {
      let message = `${upstream.status} ${upstream.statusText}`;
      try {
        const errorJson = (await upstream.json()) as {
          error?: { message?: unknown };
        } | null;
        if (typeof errorJson?.error?.message === "string") {
          message = errorJson.error.message;
        }
      } catch {
        // Upstream error body is not JSON.
      }
      return Response.json({ error: message }, { status: upstream.status });
    }

    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch {
    return Response.json(
      {
        error:
          "Could not reach the AI provider. Check your API key and try again.",
      },
      { status: 502 }
    );
  }
}
