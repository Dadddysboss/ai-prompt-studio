import { getProviderMeta, type AIProvider } from "@/types/ai";

export const runtime = "nodejs";
export const maxDuration = 30;

interface ModelsRequestBody {
  provider: AIProvider;
  apiKey: string;
}

function isAIProvider(value: unknown): value is AIProvider {
  return value === "openai" || value === "anthropic" || value === "groq";
}

function shouldInclude(provider: AIProvider, id: string): boolean {
  if (provider === "openai") {
    return /^(gpt-|o1|o3|o4)/.test(id);
  }
  return (
    !id.includes("whisper") &&
    !id.includes("embedding") &&
    !id.includes("rerank") &&
    !id.includes("tts") &&
    !id.includes("image") &&
    !id.includes("stt")
  );
}

export async function POST(request: Request) {
  let body: ModelsRequestBody;
  try {
    body = (await request.json()) as ModelsRequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { provider, apiKey } = body;

  if (!isAIProvider(provider)) {
    return Response.json({ error: "Unknown provider." }, { status: 400 });
  }
  if (typeof apiKey !== "string" || !apiKey.trim()) {
    return Response.json({ error: "API key is required." }, { status: 400 });
  }

  if (provider === "anthropic") {
    return Response.json(
      {
        error: "Anthropic does not expose a public models endpoint.",
      },
      { status: 400 }
    );
  }

  const providerMeta = getProviderMeta(provider);
  const modelsUrl = `${providerMeta.endpoint.replace(/\/chat\/completions$/, "")}/models`;

  try {
    const res = await fetch(modelsUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });

    if (!res.ok) {
      let message = `${res.status} ${res.statusText}`;
      try {
        const errorJson = (await res.json()) as {
          error?: { message?: unknown };
        } | null;
        if (typeof errorJson?.error?.message === "string") {
          message = errorJson.error.message;
        }
      } catch {
        // Upstream error body is not JSON.
      }
      return Response.json({ error: message }, { status: res.status });
    }

    const json = (await res.json()) as { data?: { id?: unknown }[] } | null;
    const ids = (json?.data ?? [])
      .map((entry) => entry.id)
      .filter((id): id is string => typeof id === "string")
      .filter((id) => shouldInclude(provider, id))
      .sort();

    return Response.json({
      models: ids.slice(0, 30).map((id) => ({ id, label: id })),
    });
  } catch {
    return Response.json(
      {
        error: "Could not reach the provider's models endpoint.",
      },
      { status: 502 }
    );
  }
}
