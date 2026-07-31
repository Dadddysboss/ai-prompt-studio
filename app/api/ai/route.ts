import { getProviderMeta, type AIProvider } from "@/types/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

interface AiRequestBody {
  prompt: string;
  provider: AIProvider;
  model: string;
  apiKey: string;
}

function isAIProvider(value: unknown): value is AIProvider {
  return value === "openai" || value === "anthropic" || value === "groq";
}

export async function POST(request: Request) {
  let body: AiRequestBody;
  try {
    body = (await request.json()) as AiRequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { prompt, provider, model, apiKey } = body;

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

  const providerMeta = getProviderMeta(provider);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (providerMeta.id === "anthropic") {
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
  } else {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const payload =
    providerMeta.id === "anthropic"
      ? {
          model,
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
          stream: true,
        }
      : {
          model,
          messages: [{ role: "user", content: prompt }],
          stream: true,
        };

  try {
    const upstream = await fetch(providerMeta.endpoint, {
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
