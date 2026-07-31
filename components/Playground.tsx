"use client";

import {
  Braces,
  Check,
  Coins,
  Copy,
  Play,
  Settings,
  Square,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import AiSettingsDrawer from "@/components/AiSettingsDrawer";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useLanguage } from "@/locales/LanguageProvider";
import { format } from "@/locales/index";
import { getProviderMeta, type AIProvider } from "@/types/ai";

interface PlaygroundProps {
  prompt: string;
}

interface Model {
  name: string;
  inputRatePerMillion: number;
}

interface ToastState {
  message: string;
  tone: "error" | "success";
}

const VARIABLE_REGEX = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

const MODELS: Model[] = [
  { name: "GPT-4o", inputRatePerMillion: 2.5 },
  { name: "Claude 3.5 Sonnet", inputRatePerMillion: 3 },
];

const labelClasses = "text-xs font-medium uppercase tracking-wider text-muted";

function formatCost(usd: number): string {
  return `$${usd.toFixed(usd >= 0.01 ? 2 : 4)}`;
}

class ApiRequestError extends Error {}

function extractDelta(json: Record<string, unknown>): string | null {
  const choices = json.choices as
    | { delta?: { content?: string }; message?: { content?: string } }[]
    | undefined;
  if (choices?.[0]) {
    const delta = choices[0].delta?.content;
    const message = choices[0].message?.content;
    if (typeof delta === "string") return delta;
    if (typeof message === "string") return message;
    return null;
  }
  if (json.type === "content_block_delta") {
    const delta = json.delta as { type?: string; text?: string } | undefined;
    if (delta?.type === "text_delta" && typeof delta.text === "string") {
      return delta.text;
    }
  }
  return null;
}

export default function Playground({ prompt }: PlaygroundProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | null>(null);
  const { t } = useLanguage();

  const [provider, setProvider] = useState<AIProvider>("openai");
  const [keys, setKeys] = useLocalStorage<Record<AIProvider, string>>(
    "aiKeys",
    { openai: "", anthropic: "", groq: "" }
  );
  const [models, setModels] = useLocalStorage<Record<AIProvider, string>>(
    "aiModels",
    {
      openai: "gpt-4o",
      anthropic: "claude-3-5-sonnet-latest",
      groq: "llama-3.3-70b-versatile",
    }
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [response, setResponse] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const variables = useMemo(() => {
    const found: string[] = [];
    for (const match of prompt.matchAll(VARIABLE_REGEX)) {
      if (!found.includes(match[1])) found.push(match[1]);
    }
    return found;
  }, [prompt]);

  const compiled = useMemo(() => {
    if (variables.length === 0) return prompt;
    return prompt.replace(
      VARIABLE_REGEX,
      (placeholder, name: string) =>
        (values[name] ?? "").trim() || placeholder
    );
  }, [prompt, variables, values]);

  const stats = useMemo(() => {
    const chars = compiled.length;
    const words = compiled.trim().split(/\s+/).filter(Boolean).length;
    const tokens = Math.max(1, Math.round(chars / 4));
    return { chars, words, tokens };
  }, [compiled]);

  useEffect(() => {
    return () => {
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
      abortRef.current?.abort();
    };
  }, []);

  const showToast = (message: string, tone: ToastState["tone"]) => {
    setToast({ message, tone });
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4000);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(compiled);
      setCopied(true);
      if (copyTimer.current !== null) {
        window.clearTimeout(copyTimer.current);
      }
      copyTimer.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable — do nothing.
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const handleRun = async () => {
    const key = (keys[provider] ?? "").trim();
    if (!key) {
      showToast(t.missingKey, "error");
      return;
    }
    if (!compiled.trim()) return;

    const model = models[provider] ?? getProviderMeta(provider).defaultModel;
    const controller = new AbortController();
    abortRef.current = controller;

    setRunning(true);
    setResponse("");

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: compiled,
          provider,
          model,
          apiKey: key,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        let message = `${res.status} ${res.statusText}`;
        try {
          const errorJson = (await res.json()) as { error?: string };
          if (errorJson?.error) {
            message = errorJson.error;
          }
        } catch {
          // Response body is not JSON.
        }
        throw new ApiRequestError(message);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;

          let json: Record<string, unknown>;
          try {
            json = JSON.parse(payload) as Record<string, unknown>;
          } catch {
            continue;
          }

          if (json.error) {
            const message =
              (json.error as { message?: string }).message ??
              "Unknown API error";
            throw new ApiRequestError(message);
          }

          const delta = extractDelta(json);
          if (delta) setResponse((prev) => prev + delta);
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      const message =
        error instanceof ApiRequestError ? error.message : t.networkError;
      showToast(format(t.apiError, { message }), "error");
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  };

  return (
    <section className="flex flex-col gap-6 rounded-card border border-edge bg-surface/90 p-8 shadow-2xl shadow-black/40 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Braces size={18} className="text-accent" />
          {t.playground}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={running ? handleStop : handleRun}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-300 ${
              running
                ? "border border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                : "bg-accent text-white hover:bg-accent-hover"
            }`}
          >
            {running ? <Square size={14} /> : <Play size={14} />}
            {running ? t.stop : t.runLive}
          </button>
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
            {copied ? t.copied : t.copyPrompt}
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label={t.settings}
            className="rounded-full border border-edge p-2.5 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {variables.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-card-sm border border-dashed border-edge bg-black/30 p-6">
          <p className="text-sm leading-6 text-muted">{t.noVarsBody}</p>
          <code className="rounded-full border border-edge bg-surface px-4 py-1.5 font-mono text-sm text-accent">
            {"You are a {{role}} expert writing for {{audience}}."}
          </code>
          <p className="text-xs leading-5 text-muted">{t.noVarsHint}</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {variables.map((name) => (
              <label key={name} className="flex flex-col gap-2">
                <span className={`font-mono ${labelClasses} text-accent`}>
                  {`{{${name}}}`}
                </span>
                <input
                  type="text"
                  value={values[name] ?? ""}
                  onChange={(event) =>
                    setValues((prev) => ({
                      ...prev,
                      [name]: event.target.value,
                    }))
                  }
                  placeholder={`${t.enterVariable} ${name}...`}
                  className="w-full rounded-2xl border border-edge bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </label>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <span className={labelClasses}>{t.compiledOutput}</span>
            <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-card-sm border border-edge bg-black/50 p-6 font-mono text-sm leading-6 text-zinc-300">
              <code>{compiled}</code>
            </pre>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className={labelClasses}>{t.aiResponse}</span>
              {response && !running && (
                <button
                  type="button"
                  onClick={() => setResponse("")}
                  className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                >
                  <X size={12} />
                  {t.clear}
                </button>
              )}
            </div>
            <pre className="min-h-32 max-h-96 overflow-y-auto whitespace-pre-wrap rounded-card-sm border border-edge bg-black/50 p-6 text-sm leading-6 text-zinc-200">
              <code>
                {response
                  ? response
                  : running
                    ? t.thinking
                    : t.emptyResponse}
                {running && response && (
                  <span className="animate-pulse text-accent">{" ▌"}</span>
                )}
              </code>
            </pre>
          </div>

          <div className="flex flex-col gap-3 border-t border-edge pt-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-4 py-1.5 text-sm font-semibold text-accent">
                <Coins size={14} />
                {format(t.estimatedTokens, { count: stats.tokens })}
              </span>
              <span className="text-xs text-muted">
                {format(t.charsWords, {
                  chars: stats.chars,
                  words: stats.words,
                })}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={labelClasses}>{t.estimatedCost}</span>
              {MODELS.map((model) => (
                <span
                  key={model.name}
                  className="rounded-full border border-edge bg-surface px-3 py-1.5 text-xs font-medium text-muted"
                >
                  {model.name} ·{" "}
                  {formatCost(
                    (stats.tokens / 1_000_000) * model.inputRatePerMillion
                  )}
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      <AiSettingsDrawer
        open={settingsOpen}
        provider={provider}
        onProviderChange={setProvider}
        keys={keys}
        models={models}
        onKeysChange={setKeys}
        onModelsChange={setModels}
        onClose={() => setSettingsOpen(false)}
        onSaved={() => showToast(t.keySaved, "success")}
      />

      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full border px-5 py-3 text-sm font-medium shadow-2xl shadow-black/60 backdrop-blur-xl ${
            toast.tone === "error"
              ? "border-red-500/40 bg-red-500/10 text-red-300"
              : "border-edge bg-surface/95 text-foreground"
          }`}
        >
          {toast.message}
        </div>
      )}
    </section>
  );
}
