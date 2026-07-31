"use client";

import { Check, ChevronDown, Eye, EyeOff, KeyRound, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/locales/LanguageProvider";
import {
  getProviderMeta,
  type AIModelOption,
  type AIProvider,
} from "@/types/ai";

interface AiSettingsDrawerProps {
  open: boolean;
  provider: AIProvider;
  onProviderChange: (provider: AIProvider) => void;
  keys: Record<AIProvider, string>;
  models: Record<AIProvider, string>;
  customModels: Partial<Record<AIProvider, AIModelOption[]>>;
  onKeysChange: (keys: Record<AIProvider, string>) => void;
  onModelsChange: (models: Record<AIProvider, string>) => void;
  onModelsFetched: (
    provider: AIProvider,
    models: AIModelOption[]
  ) => void;
  onClose: () => void;
  onSaved: () => void;
}

const labelClasses = "text-xs font-medium uppercase tracking-wider text-muted";

const inputClasses =
  "w-full rounded-2xl border border-edge bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";

export default function AiSettingsDrawer({
  open,
  provider,
  onProviderChange,
  keys,
  models,
  customModels,
  onKeysChange,
  onModelsChange,
  onModelsFetched,
  onClose,
  onSaved,
}: AiSettingsDrawerProps) {
  const { t } = useLanguage();
  const [showKey, setShowKey] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (dropdownOpen) {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [dropdownOpen]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (dropdownOpen) {
          setDropdownOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, dropdownOpen]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const key = keys[provider] ?? "";
  const model = models[provider] ?? getProviderMeta(provider).defaultModel;
  const meta = getProviderMeta(provider);
  const modelOptions = customModels[provider] ?? meta.models;

  useEffect(() => {
    const trimmedKey = key.trim();
    if (!open || !trimmedKey || provider === "anthropic") return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setFetching(true);
      setFetchFailed(false);
      fetch("/api/ai/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey: trimmedKey }),
        signal: controller.signal,
      })
        .then(async (res) => {
          const json = (await res.json()) as {
            models?: AIModelOption[];
            error?: string;
          };
          if (!res.ok || json.error || !json.models || json.models.length === 0) {
            throw new Error(json.error ?? "Failed to fetch models");
          }
          onModelsFetched(provider, json.models);
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setFetchFailed(true);
        })
        .finally(() => setFetching(false));
    }, 600);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
      setFetching(false);
    };
  }, [key, provider, open, onModelsFetched]);

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

      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-full flex-col overflow-hidden rounded-l-[28px] border-l border-edge bg-surface shadow-2xl shadow-black/60 transition-transform duration-300 ease-out sm:w-[400px] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={t.aiSettings}
      >
        <div className="flex items-center justify-between gap-4 border-b border-edge px-5 py-6 sm:px-8">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <KeyRound size={18} className="text-accent" />
            {t.aiSettings}
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

        <div
          ref={scrollRef}
          className="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto px-5 py-6 sm:px-8"
        >
          <div className="flex flex-col gap-2">
            <span className={labelClasses}>{t.provider}</span>
            <div className="grid grid-cols-3 gap-1 rounded-full border border-edge bg-background p-1">
              {["openai", "anthropic", "groq"].map((providerId) => (
                <button
                  key={providerId}
                  type="button"
                  onClick={() => onProviderChange(providerId as AIProvider)}
                  aria-pressed={provider === providerId}
                  className={`rounded-full px-3 py-2 text-xs font-medium transition-all duration-300 ${
                    provider === providerId
                      ? "bg-accent text-white"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {providerId === "openai"
                    ? "OpenAI"
                    : providerId === "anthropic"
                      ? "Anthropic"
                      : "Groq"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="api-key" className={labelClasses}>
              {t.apiKey}
            </label>
            <div className="relative">
              <input
                id="api-key"
                type={showKey ? "text" : "password"}
                value={key}
                onChange={(event) =>
                  onKeysChange({
                    ...keys,
                    [provider]: event.target.value,
                  })
                }
                placeholder={t.apiKeyPlaceholder}
                autoComplete="off"
                spellCheck={false}
                className={`${inputClasses} pe-11 font-mono`}
              />
              <button
                type="button"
                onClick={() => setShowKey((prev) => !prev)}
                aria-label={showKey ? t.hideKey : t.showKey}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-foreground"
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="ai-model" className={labelClasses}>
                {t.model}
              </label>
              {fetching && (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                  <Loader2 size={12} className="animate-spin text-accent" />
                  {t.syncingModels}
                </span>
              )}
            </div>
            <div className="relative">
              <button
                id="ai-model"
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
                disabled={fetching}
                aria-haspopup="listbox"
                aria-expanded={dropdownOpen}
                className={`${inputClasses} flex cursor-pointer items-center justify-between gap-2 text-start disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <span className="truncate font-mono text-xs text-foreground">
                  {model}
                </span>
                {fetching ? (
                  <Loader2
                    size={16}
                    className="shrink-0 animate-spin text-accent"
                  />
                ) : (
                  <ChevronDown
                    size={16}
                    className={`shrink-0 text-muted transition-transform duration-300 ${
                      dropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                )}
              </button>

              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div
                    role="listbox"
                    aria-label={t.model}
                    className="absolute start-0 end-0 top-full z-10 mt-2 max-h-56 overflow-y-auto rounded-2xl border border-edge bg-surface p-1.5 shadow-2xl shadow-black/60"
                  >
                    {modelOptions.map((option) => {
                      const selected = option.id === model;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          onClick={() => {
                            onModelsChange({
                              ...models,
                              [provider]: option.id,
                            });
                            setDropdownOpen(false);
                          }}
                          className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-start text-sm transition-colors ${
                            selected
                              ? "bg-accent-soft text-accent"
                              : "text-foreground hover:bg-surface-hover"
                          }`}
                        >
                          <span className="truncate font-mono text-xs">
                            {option.label}
                          </span>
                          {selected && <Check size={14} className="shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            {fetchFailed && (
              <p className="text-xs leading-5 text-red-400/90">
                {t.modelsFetchError}
              </p>
            )}
          </div>

          <p className="rounded-card-sm border border-edge bg-black/30 p-4 text-xs leading-5 text-muted">
            {t.keyNote}
          </p>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-edge px-5 py-6 sm:px-8">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-edge px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onSaved();
            }}
            className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            {t.save}
          </button>
        </div>
      </aside>
    </div>
  );
}
