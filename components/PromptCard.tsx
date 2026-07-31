"use client";

import { Check, Copy, Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/locales/LanguageProvider";
import { format } from "@/locales/index";
import type { PromptTemplate } from "@/types/prompt";

interface PromptCardProps {
  prompt: PromptTemplate;
  active?: boolean;
  onSelect?: (prompt: PromptTemplate) => void;
  onEdit: (prompt: PromptTemplate) => void;
  onDelete: (id: string) => void;
}

export default function PromptCard({
  prompt,
  active = false,
  onSelect,
  onEdit,
  onDelete,
}: PromptCardProps) {
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | null>(null);
  const { locale, t } = useLanguage();

  useEffect(() => {
    return () => {
      if (copyTimer.current !== null) {
        window.clearTimeout(copyTimer.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt.systemPrompt);
      setCopied(true);
      if (copyTimer.current !== null) {
        window.clearTimeout(copyTimer.current);
      }
      copyTimer.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable — do nothing.
    }
  };

  return (
    <article
      onClick={() => onSelect?.(prompt)}
      className={`group flex flex-col gap-4 rounded-card border bg-surface/90 p-6 shadow-2xl shadow-black/40 backdrop-blur-sm transition-all duration-300 ${
        active
          ? "border-accent/70 ring-1 ring-accent/50"
          : "border-edge hover:border-zinc-700 hover:bg-surface"
      } ${onSelect ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-base font-semibold text-foreground">
          {prompt.title}
        </h3>
        <span className="shrink-0 text-xs text-muted">
          {new Date(prompt.updatedAt).toLocaleDateString(
            locale === "ur" ? "ur-PK" : locale,
            {
              year: "numeric",
              month: "short",
              day: "numeric",
            }
          )}
        </span>
      </div>

      <p className="text-sm leading-6 text-muted">{prompt.description}</p>

      <pre className="line-clamp-3 rounded-card-sm border border-edge bg-black/50 p-4 text-xs leading-5 text-zinc-400">
        <code>{prompt.systemPrompt}</code>
      </pre>

      <div className="flex flex-wrap items-center gap-2">
        {prompt.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-edge bg-surface px-3 py-1 text-xs font-medium text-muted"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-edge pt-4">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            handleCopy();
          }}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
            copied
              ? "bg-accent text-white"
              : "border border-edge text-foreground hover:bg-surface-hover"
          }`}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? t.copied : t.copy}
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onEdit(prompt);
            }}
            aria-label={format(t.editLabel, { title: prompt.title })}
            className="rounded-full border border-edge p-2.5 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(prompt.id);
            }}
            aria-label={format(t.deleteLabel, { title: prompt.title })}
            className="rounded-full border border-edge p-2.5 text-muted transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </article>
  );
}
