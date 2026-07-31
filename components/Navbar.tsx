"use client";

import { Download, Search, Upload } from "lucide-react";
import { useRef } from "react";
import { useLanguage } from "@/locales/LanguageProvider";
import { LOCALES } from "@/locales/index";
import type { PromptTemplate } from "@/types/prompt";

interface NavbarProps {
  prompts: PromptTemplate[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  availableTags: string[];
  activeTags: string[];
  onTagToggle: (tag: string) => void;
  onImport: (prompts: PromptTemplate[]) => void;
}

function isPromptTemplate(value: unknown): value is PromptTemplate {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.description === "string" &&
    typeof candidate.systemPrompt === "string" &&
    Array.isArray(candidate.tags) &&
    candidate.tags.every((tag) => typeof tag === "string") &&
    typeof candidate.updatedAt === "string"
  );
}

export default function Navbar({
  prompts,
  searchQuery,
  onSearchChange,
  availableTags,
  activeTags,
  onTagToggle,
  onImport,
}: NavbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { locale, setLocale, t } = useLanguage();

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(prompts, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `prompts-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed: unknown = JSON.parse(String(reader.result));
        if (!Array.isArray(parsed)) return;
        const valid = parsed.filter(isPromptTemplate);
        if (valid.length > 0) onImport(valid);
      } catch {
        // Invalid JSON — ignore the file.
      }
    };
    reader.readAsText(file);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-edge bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 sm:px-6">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h1 className="me-auto min-w-0 truncate text-xl font-semibold tracking-tight text-foreground">
            {t.appTitle}
          </h1>

          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search
              size={16}
              className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full rounded-full border border-edge bg-surface py-2.5 ps-11 pe-4 text-sm text-foreground placeholder:text-muted transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          <div
            className="flex items-center gap-1 rounded-full border border-edge bg-surface p-1"
            role="group"
            aria-label="Language"
          >
            {LOCALES.map(({ code, label }) => (
              <button
                key={code}
                type="button"
                onClick={() => setLocale(code)}
                aria-pressed={locale === code}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-300 ${
                  locale === code
                    ? "bg-accent text-white"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded-full border border-edge px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
            >
              <Download size={14} />
              {t.export}
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
            >
              <Upload size={14} />
              {t.import}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) handleImport(file);
                event.target.value = "";
              }}
            />
          </div>
        </div>

        {availableTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {availableTags.map((tag) => {
              const active = activeTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onTagToggle(tag)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-300 ${
                    active
                      ? "border-accent bg-accent text-white"
                      : "border-edge bg-surface text-muted hover:bg-surface-hover hover:text-foreground"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}
