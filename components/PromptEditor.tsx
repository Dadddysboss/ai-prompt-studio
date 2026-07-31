"use client";

import { Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useLanguage } from "@/locales/LanguageProvider";
import { format } from "@/locales/index";
import type { PromptTemplate, PromptTemplateInput } from "@/types/prompt";

interface PromptEditorProps {
  open: boolean;
  initial: PromptTemplate | null;
  onClose: () => void;
  onSave: (input: PromptTemplateInput) => void;
}

const EMPTY_FORM: PromptTemplateInput = {
  title: "",
  description: "",
  systemPrompt: "",
  tags: [],
};

const inputClasses =
  "w-full rounded-2xl border border-edge bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";

const labelClasses = "text-xs font-medium uppercase tracking-wider text-muted";

function EditorForm({
  initial,
  onClose,
  onSave,
}: {
  initial: PromptTemplate | null;
  onClose: () => void;
  onSave: (input: PromptTemplateInput) => void;
}) {
  const [form, setForm] = useState<PromptTemplateInput>(
    initial
      ? {
          title: initial.title,
          description: initial.description,
          systemPrompt: initial.systemPrompt,
          tags: initial.tags,
        }
      : EMPTY_FORM
  );
  const [tagInput, setTagInput] = useState("");
  const { t } = useLanguage();

  const addTag = (raw: string) => {
    const tag = raw.trim().replace(/^#/, "");
    if (!tag || form.tags.includes(tag)) return;
    setForm((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
  };

  const removeTag = (tag: string) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.filter((existing) => existing !== tag),
    }));
  };

  const handleTagInputChange = (value: string) => {
    if (value.endsWith(",")) {
      addTag(value.slice(0, -1));
      setTagInput("");
      return;
    }
    setTagInput(value);
  };

  const handleTagInputKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addTag(tagInput);
      setTagInput("");
    }
  };

  const handleSave = () => {
    if (!form.title.trim()) return;
    onSave({
      ...form,
      title: form.title.trim(),
      systemPrompt: form.systemPrompt.trim(),
    });
  };

  const canSave = form.title.trim().length > 0;

  return (
    <>
      <div className="flex items-center justify-between border-b border-edge px-8 py-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Sparkles size={18} className="text-accent" />
          {initial ? t.editPrompt : t.newPrompt}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t.closeEditor}
          className="rounded-full border border-edge p-2.5 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-8 py-6">
        <div className="flex flex-col gap-2">
          <label htmlFor="prompt-title" className={labelClasses}>
            {t.title}
          </label>
          <input
            id="prompt-title"
            type="text"
            value={form.title}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, title: event.target.value }))
            }
            placeholder={t.titlePlaceholder}
            className={inputClasses}
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="prompt-description" className={labelClasses}>
            {t.description}
          </label>
          <input
            id="prompt-description"
            type="text"
            value={form.description}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                description: event.target.value,
              }))
            }
            placeholder={t.descriptionPlaceholder}
            className={inputClasses}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="prompt-tags" className={labelClasses}>
            {t.tags}
          </label>
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-edge bg-background px-3 py-2 transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
            {form.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 rounded-full border border-edge bg-surface px-3 py-1 text-xs font-medium text-foreground"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  aria-label={format(t.removeTag, { tag })}
                  className="text-muted transition-colors hover:text-red-400"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            <input
              id="prompt-tags"
              type="text"
              value={tagInput}
              onChange={(event) => handleTagInputChange(event.target.value)}
              onKeyDown={handleTagInputKeyDown}
              placeholder={
                form.tags.length === 0 ? t.tagsPlaceholder : ""
              }
              className="min-w-24 flex-1 bg-transparent py-1 text-sm text-foreground placeholder:text-muted focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2">
          <label htmlFor="prompt-system" className={labelClasses}>
            {t.systemPrompt}
          </label>
          <textarea
            id="prompt-system"
            value={form.systemPrompt}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                systemPrompt: event.target.value,
              }))
            }
            placeholder={t.systemPromptPlaceholder}
            className={`${inputClasses} flex-1 resize-none font-mono leading-6`}
            rows={10}
          />
        </div>
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
            onClick={handleSave}
            disabled={!canSave}
            className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white transition-all duration-300 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            {initial ? t.saveChanges : t.createPrompt}
          </button>
      </div>
    </>
  );
}

export default function PromptEditor({
  open,
  initial,
  onClose,
  onSave,
}: PromptEditorProps) {
  const { t } = useLanguage();

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
        className={`absolute right-0 top-0 flex h-full w-full max-w-xl flex-col rounded-l-[28px] border-l border-edge bg-surface shadow-2xl shadow-black/60 transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={initial ? t.editPrompt : t.newPrompt}
      >
        <EditorForm
          key={initial ? `edit:${initial.id}:${open}` : `new:${open}`}
          initial={initial}
          onClose={onClose}
          onSave={onSave}
        />
      </aside>
    </div>
  );
}
