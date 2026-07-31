export type AIProvider = "openai" | "anthropic" | "groq";

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

export const AI_PROVIDERS: AIProviderMeta[] = [
  {
    id: "openai",
    endpoint: "https://api.openai.com/v1/chat/completions",
    defaultModel: "gpt-4o",
    models: [
      { id: "gpt-4o", label: "GPT-4o" },
      { id: "gpt-4o-mini", label: "GPT-4o mini" },
    ],
  },
  {
    id: "anthropic",
    endpoint: "https://api.anthropic.com/v1/messages",
    defaultModel: "claude-3-5-sonnet-latest",
    models: [
      { id: "claude-3-5-sonnet-latest", label: "Claude 3.5 Sonnet" },
      { id: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku" },
    ],
  },
  {
    id: "groq",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    defaultModel: "llama-3.3-70b-versatile",
    models: [
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
      { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B" },
    ],
  },
];

export function getProviderMeta(provider: AIProvider): AIProviderMeta {
  return (
    AI_PROVIDERS.find((meta) => meta.id === provider) ?? AI_PROVIDERS[0]
  );
}
