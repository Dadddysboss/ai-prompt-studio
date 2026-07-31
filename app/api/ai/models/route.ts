import {
  getProviderMeta,
  resolveModelsUrl,
  type AIProvider,
} from "@/types/ai";

export const runtime = "nodejs";
export const maxDuration = 30;

interface ModelsRequestBody {
  provider: AIProvider;
  apiKey: string;
  baseUrl?: string;
}

function isAIProvider(value: unknown): value is AIProvider {
  return (
    value === "openai" ||
    value === "anthropic" ||
    value === "groq" ||
    value === "deepseek" ||
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

export async function POST(request: Request) {
  let body: ModelsRequestBody;
  try {
    body = (await request.json()) as ModelsRequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { provider, apiKey, baseUrl } = body;

  if (!isAIProvider(provider)) {
    return Response.json({ error: "Unknown provider." }, { status: 400 });
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

  if (provider === "anthropic") {
    return Response.json(
      {
        error: "Anthropic does not expose a public models endpoint.",
      },
      { status: 400 }
    );
  }

  const modelsUrl = resolveModelsUrl(provider, baseUrl);

  const fallback = () =>
    Response.json({
      models: getProviderMeta(provider).models,
      fallback: true,
    });

  try {
    const res = await fetch(modelsUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });

    if (!res.ok) {
      return fallback();
    }

    const json = (await res.json()) as { data?: { id?: unknown }[] } | null;
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const entry of json?.data ?? []) {
      if (typeof entry.id !== "string" || seen.has(entry.id)) continue;
      seen.add(entry.id);
      ids.push(entry.id);
    }
    ids.sort();

    if (ids.length === 0) return fallback();

    return Response.json({
      models: ids.map((id) => ({ id, label: id })),
    });
  } catch {
    return fallback();
  }
}
