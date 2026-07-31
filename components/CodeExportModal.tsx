"use client";

import { Check, Code2, Copy, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/locales/LanguageProvider";
import { format } from "@/locales/index";
import {
  getProviderMeta,
  resolveChatEndpoint,
  type AIProvider,
} from "@/types/ai";

type ExportTab = "requests" | "sdk" | "fetch" | "curl";

interface CodeExportModalProps {
  open: boolean;
  onClose: () => void;
  provider: AIProvider;
  model: string;
  apiKey: string;
  baseUrl: string;
  system?: string;
  prompt: string;
}

function escapeShell(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "'\\''");
}

function buildPayload(
  provider: AIProvider,
  model: string,
  system: string | undefined,
  prompt: string
): Record<string, unknown> {
  const trimmedSystem = system?.trim();
  if (provider === "anthropic") {
    return {
      model,
      max_tokens: 1024,
      ...(trimmedSystem ? { system: trimmedSystem } : {}),
      messages: [{ role: "user", content: prompt }],
      stream: true,
    };
  }
  return {
    model,
    messages: trimmedSystem
      ? [
          { role: "system", content: trimmedSystem },
          { role: "user", content: prompt },
        ]
      : [{ role: "user", content: prompt }],
    stream: true,
  };
}

function buildRequestsCode(
  endpoint: string,
  apiKey: string,
  payload: Record<string, unknown>,
  anthropic: boolean
): string {
  const headers = anthropic
    ? {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      }
    : { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` };
  return `import requests

url = ${JSON.stringify(endpoint)}
headers = ${JSON.stringify(headers, null, 2)}
payload = ${JSON.stringify(payload, null, 2)}

response = requests.post(url, headers=headers, json=payload, stream=True)

if response.status_code != 200:
    print(response.text)
    raise SystemExit(1)

for line in response.iter_lines(decode_unicode=True):
    if line:
        print(line)
`;
}

function buildSdkCode(
  endpoint: string,
  apiKey: string,
  model: string,
  payload: Record<string, unknown>
): string {
  const baseUrl = endpoint.replace(/\/chat\/completions$/, "");
  const messages = payload.messages as { role: string; content: string }[];
  const messagesLiteral = JSON.stringify(messages, null, 2)
    .split("\n")
    .map((line, index, lines) =>
      index === 0 ? line : index === lines.length - 1 ? line : `    ${line}`
    )
    .join("\n");
  return `from openai import OpenAI

client = OpenAI(
    api_key=${JSON.stringify(apiKey)},
    base_url=${JSON.stringify(baseUrl)},
)

response = client.chat.completions.create(
    model=${JSON.stringify(model)},
    messages=${messagesLiteral},
    stream=True,
)

for chunk in response:
    if chunk.choices:
        print(chunk.choices[0].delta.content or "", end="")
`;
}

function buildFetchCode(
  endpoint: string,
  apiKey: string,
  payload: Record<string, unknown>,
  anthropic: boolean
): string {
  const headers = anthropic
    ? {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      }
    : { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` };
  return `const response = await fetch(${JSON.stringify(endpoint)}, {
  method: "POST",
  headers: ${JSON.stringify(headers, null, 2)},
  body: JSON.stringify(${JSON.stringify(payload, null, 2)}),
});

if (!response.ok || !response.body) {
  throw new Error(\`API error: \${response.status} \${response.statusText}\`);
}

const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });

  const lines = buffer.split("\\n");
  buffer = lines.pop() ?? "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const payloadLine = trimmed.slice(5).trim();
    if (!payloadLine || payloadLine === "[DONE]") continue;

    const json = JSON.parse(payloadLine);
    const delta =
      json.choices?.[0]?.delta?.content ??
      json.choices?.[0]?.message?.content ??
      "";
    if (delta) console.log(delta);
  }
}
`;
}

function buildCurlCode(
  endpoint: string,
  apiKey: string,
  payload: Record<string, unknown>,
  anthropic: boolean
): string {
  const headers = anthropic
    ? [
        "-H \"Content-Type: application/json\"",
        `-H "x-api-key: ${apiKey}"`,
        `-H "anthropic-version: 2023-06-01"`,
      ]
    : [
        "-H \"Content-Type: application/json\"",
        `-H "Authorization: Bearer ${apiKey}"`,
      ];
  return `curl -N ${JSON.stringify(endpoint)} \\
${headers.join(" \\\n")} \\
  -d '${escapeShell(JSON.stringify(payload, null, 2))}'
`;
}

export default function CodeExportModal({
  open,
  onClose,
  provider,
  model,
  apiKey,
  baseUrl,
  system,
  prompt,
}: CodeExportModalProps) {
  const { t } = useLanguage();
  const [tab, setTab] = useState<ExportTab>("requests");
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | null>(null);

  const anthropic = provider === "anthropic";

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    };
  }, []);

  const resolvedKey = apiKey.trim() || "YOUR_API_KEY";
  const payload = useMemo(
    () => buildPayload(provider, model, system, prompt),
    [provider, model, system, prompt]
  );
  const endpoint = useMemo(
    () => resolveChatEndpoint(provider, baseUrl),
    [provider, baseUrl]
  );

  const code = useMemo(() => {
    switch (tab) {
      case "requests":
        return buildRequestsCode(endpoint, resolvedKey, payload, anthropic);
      case "sdk":
        return buildSdkCode(endpoint, resolvedKey, model, payload);
      case "fetch":
        return buildFetchCode(endpoint, resolvedKey, payload, anthropic);
      case "curl":
        return buildCurlCode(endpoint, resolvedKey, payload, anthropic);
    }
  }, [tab, endpoint, resolvedKey, payload, model, anthropic]);

  const tabs: { id: ExportTab; label: string }[] = [
    { id: "requests", label: t.codeTabRequests },
    { id: "sdk", label: t.codeTabSdk },
    { id: "fetch", label: t.codeTabFetch },
    { id: "curl", label: t.codeTabCurl },
  ];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (copyTimer.current !== null) {
        window.clearTimeout(copyTimer.current);
      }
      copyTimer.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable — do nothing.
    }
  };

  const providerLabel =
    getProviderMeta(provider).id === "custom"
      ? "DeepSeek / Custom"
      : getProviderMeta(provider).id;

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.exportCode}
        className={`absolute inset-x-0 top-1/2 mx-auto flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-card border border-edge bg-surface shadow-2xl shadow-black/60 transition-all duration-300 ${
          open ? "translate-y-[-50%] opacity-100" : "translate-y-[-46%] opacity-0"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-edge px-5 py-5 sm:px-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Code2 size={18} className="text-accent" />
            {t.exportCode}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeSettings}
            className="rounded-full border border-edge p-2.5 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-5 sm:px-6">
          <p className="text-xs leading-5 text-muted">
            {format(t.exportMeta, {
              provider: providerLabel,
              model,
            })}
          </p>

          <div className="flex flex-wrap gap-1 rounded-full border border-edge bg-background p-1">
            {tabs
              .filter((item) => !(anthropic && item.id === "sdk"))
              .map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setTab(item.id);
                    setCopied(false);
                  }}
                  aria-pressed={tab === item.id}
                  className={`truncate rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-300 ${
                    tab === item.id
                      ? "bg-accent text-white"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {item.label}
                </button>
              ))}
          </div>

          <pre className="max-h-72 max-w-full overflow-auto break-words whitespace-pre-wrap rounded-card-sm border border-edge bg-black/50 p-5 font-mono text-xs leading-6 text-zinc-200">
            <code>{code}</code>
          </pre>

          <p className="text-xs leading-5 text-muted">{t.codeHint}</p>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-edge px-5 py-5 sm:px-6">
          <span className="truncate font-mono text-xs text-muted">
            {providerLabel} · {model}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-300 ${
              copied
                ? "bg-accent text-white"
                : "border border-edge text-foreground hover:bg-surface-hover"
            }`}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? t.copied : t.copyCode}
          </button>
        </div>
      </div>
    </div>
  );
}
