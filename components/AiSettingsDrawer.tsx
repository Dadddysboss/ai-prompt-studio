"use client";

import { ChevronDown, Eye, EyeOff, KeyRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useLanguage } from "@/locales/LanguageProvider";
import { AI_PROVIDERS, getProviderMeta, type AIProvider } from "@/types/ai";

interface AiSettingsDrawerProps {
  open: boolean;
  provider: AIProvider;
  onProviderChange: (provider: AIProvider) => void;
  keys: Record<AIProvider, string>;
  models: Record<AIProvider, string>;
  onKeysChange: (keys: Record<AIProvider, string>) => void;
  onModelsChange: (models: Record<AIProvider, string>) => void;
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
  onKeysChange,
  onModelsChange,
  onClose,
  onSaved,
}: AiSettingsDrawerProps) {
  const { t } = useLanguage();
  const [showKey, setShowKey] = useState(false);

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

  const meta = getProviderMeta(provider);
  const key = keys[provider] ?? "";
  const model = models[provider] ?? meta.defaultModel;

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
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col rounded-l-[28px] border-l border-edge bg-surface shadow-2xl shadow-black/60 transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={t.aiSettings}
      >
        <div className="flex items-center justify-between border-b border-edge px-8 py-6">
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

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-8 py-6">
          <div className="flex flex-col gap-2">
            <span className={labelClasses}>{t.provider}</span>
            <div className="grid grid-cols-3 gap-1 rounded-full border border-edge bg-background p-1">
              {AI_PROVIDERS.map((providerMeta) => (
                <button
                  key={providerMeta.id}
                  type="button"
                  onClick={() => onProviderChange(providerMeta.id)}
                  aria-pressed={provider === providerMeta.id}
                  className={`rounded-full px-3 py-2 text-xs font-medium transition-all duration-300 ${
                    provider === providerMeta.id
                      ? "bg-accent text-white"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {providerMeta.id === "openai"
                    ? "OpenAI"
                    : providerMeta.id === "anthropic"
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
            <label htmlFor="ai-model" className={labelClasses}>
              {t.model}
            </label>
            <div className="relative">
              <select
                id="ai-model"
                value={model}
                onChange={(event) =>
                  onModelsChange({
                    ...models,
                    [provider]: event.target.value,
                  })
                }
                className={`${inputClasses} appearance-none cursor-pointer pe-10`}
              >
                {meta.models.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-muted"
              />
            </div>
          </div>

          <p className="rounded-card-sm border border-edge bg-black/30 p-4 text-xs leading-5 text-muted">
            {t.keyNote}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-edge px-8 py-6">
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
