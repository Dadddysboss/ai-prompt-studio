export type AIProvider =
  | "openai"
  | "anthropic"
  | "groq"
  | "deepseek"
  | "custom";

export interface AIModelOption {
  id: string;
  label: string;
}

export interface AIProviderMeta {
  id: AIProvider;
  endpoint: string;
  defaultModel: string;
  models: AIModelOption[];
}

export const CUSTOM_BASE_URL =
  "https://api.deepseek.com/v1/chat/completions";

export const AI_PROVIDERS: AIProviderMeta[] = [
  {
    id: "openai",
    endpoint: "https://api.openai.com/v1/chat/completions",
    defaultModel: "gpt-4o",
    models: [
      { id: "gpt-4o", label: "GPT-4o" },
      { id: "gpt-4o-mini", label: "GPT-4o mini" },
      { id: "gpt-4.1", label: "GPT-4.1" },
      { id: "gpt-4.1-mini", label: "GPT-4.1 mini" },
      { id: "gpt-4.1-nano", label: "GPT-4.1 nano" },
      { id: "o3", label: "o3" },
      { id: "o4-mini", label: "o4-mini" },
      { id: "gpt-oss-120b", label: "GPT-OSS 120B" },
      { id: "gpt-oss-20b", label: "GPT-OSS 20B" },
    ],
  },
  {
    id: "anthropic",
    endpoint: "https://api.anthropic.com/v1/messages",
    defaultModel: "claude-3-5-sonnet-latest",
    models: [
      { id: "claude-3-5-sonnet-latest", label: "Claude 3.5 Sonnet" },
      { id: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku" },
      { id: "claude-3-7-sonnet-latest", label: "Claude 3.7 Sonnet" },
      { id: "claude-3-opus-latest", label: "Claude 3 Opus" },
      { id: "claude-3-haiku-latest", label: "Claude 3 Haiku" },
    ],
  },
  {
    id: "groq",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    defaultModel: "llama-3.3-70b-versatile",
    models: [
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile" },
      { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant" },
      { id: "llama-3.1-70b-versatile", label: "Llama 3.1 70B Versatile" },
      { id: "deepseek-r1-distill-llama-70b", label: "DeepSeek R1 Distill Llama 70B" },
      { id: "qwen-2.5-coder-32b", label: "Qwen 2.5 Coder 32B" },
      { id: "gemma2-9b-it", label: "Gemma 2 9B" },
      { id: "llama-3.2-3b-preview", label: "Llama 3.2 3B" },
      { id: "llama-3.2-1b-preview", label: "Llama 3.2 1B" },
    ],
  },
  {
    id: "deepseek",
    endpoint: "https://api.deepseek.com/chat/completions",
    defaultModel: "deepseek-chat",
    models: [
      { id: "deepseek-chat", label: "DeepSeek Chat (V3)" },
      { id: "deepseek-reasoner", label: "DeepSeek Reasoner (R1)" },
    ],
  },
  {
    id: "custom",
    endpoint: CUSTOM_BASE_URL,
    defaultModel: "deepseek-chat",
    models: [
      { id: "deepseek-chat", label: "DeepSeek Chat (V3)" },
      { id: "deepseek-reasoner", label: "DeepSeek Reasoner (R1)" },
    ],
  },
];

export function getProviderMeta(provider: AIProvider): AIProviderMeta {
  return (
    AI_PROVIDERS.find((meta) => meta.id === provider) ?? AI_PROVIDERS[0]
  );
}

export type ModelTier = "free" | "paid";

export function classifyModel(
  id: string,
  provider: AIProvider
): ModelTier {
  if (/free/i.test(id)) return "free";
  if (provider === "groq") return "free";
  if (provider === "openai" && /^gpt-oss/i.test(id)) return "free";
  return "paid";
}

function stripTrailingSlashes(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function urlHasPathSegments(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.pathname !== "" && parsed.pathname !== "/";
  } catch {
    return false;
  }
}

export function resolveChatEndpoint(
  provider: AIProvider,
  baseUrl: string | undefined
): string {
  const meta = getProviderMeta(provider);
  if (!baseUrl?.trim()) return meta.endpoint;
  const trimmed = stripTrailingSlashes(baseUrl);
  if (trimmed.endsWith("/chat/completions")) return trimmed;
  if (urlHasPathSegments(trimmed)) return `${trimmed}/chat/completions`;
  return `${trimmed}/v1/chat/completions`;
}

export function resolveModelsUrl(
  provider: AIProvider,
  baseUrl: string | undefined
): string {
  if (provider === "deepseek" && !baseUrl?.trim()) {
    return "https://api.deepseek.com/models";
  }
  const meta = getProviderMeta(provider);
  const base = baseUrl?.trim()
    ? stripTrailingSlashes(baseUrl).replace(/\/chat\/completions$/, "")
    : meta.endpoint.replace(/\/chat\/completions$/, "");
  if (urlHasPathSegments(base)) return `${base}/models`;
  return `${base}/v1/models`;
}
