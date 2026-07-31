"use client";

import { Plus, SearchX, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Playground from "@/components/Playground";
import PromptCard from "@/components/PromptCard";
import PromptEditor from "@/components/PromptEditor";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { LanguageProvider, useLanguage } from "@/locales/LanguageProvider";
import type { PromptTemplate, PromptTemplateInput } from "@/types/prompt";

function HomeContent() {
  const { dir, t } = useLanguage();
  const [prompts, setPrompts] = useLocalStorage<PromptTemplate[]>("prompts", []);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<PromptTemplate | null>(
    null
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    for (const prompt of prompts) {
      for (const tag of prompt.tags) tags.add(tag);
    }
    return [...tags].sort();
  }, [prompts]);

  const filteredPrompts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return prompts.filter((prompt) => {
      const matchesSearch =
        !query ||
        prompt.title.toLowerCase().includes(query) ||
        prompt.description.toLowerCase().includes(query) ||
        prompt.systemPrompt.toLowerCase().includes(query);
      const matchesTags =
        activeTags.length === 0 ||
        activeTags.every((tag) => prompt.tags.includes(tag));
      return matchesSearch && matchesTags;
    });
  }, [prompts, searchQuery, activeTags]);

  const activePrompt = useMemo(() => {
    if (filteredPrompts.length === 0) return null;
    return (
      filteredPrompts.find((prompt) => prompt.id === selectedId) ??
      filteredPrompts[0]
    );
  }, [filteredPrompts, selectedId]);

  const openNewPrompt = () => {
    setEditingPrompt(null);
    setEditorOpen(true);
  };

  const openEditPrompt = (prompt: PromptTemplate) => {
    setEditingPrompt(prompt);
    setEditorOpen(true);
  };

  const handleSave = (input: PromptTemplateInput) => {
    if (editingPrompt) {
      setPrompts((prev) =>
        prev.map((prompt) =>
          prompt.id === editingPrompt.id
            ? { ...input, id: prompt.id, updatedAt: new Date().toISOString() }
            : prompt
        )
      );
    } else {
      setPrompts((prev) => [
        {
          ...input,
          id: crypto.randomUUID(),
          updatedAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    }
    setEditorOpen(false);
    setEditingPrompt(null);
  };

  const handleDelete = (id: string) => {
    setPrompts((prev) => prev.filter((prompt) => prompt.id !== id));
    setSelectedId((prev) => (prev === id ? null : prev));
  };

  const handleImport = (imported: PromptTemplate[]) => {
    setPrompts((prev) => {
      const merged = new Map<string, PromptTemplate>();
      for (const prompt of imported) merged.set(prompt.id, prompt);
      for (const prompt of prev) {
        if (!merged.has(prompt.id)) merged.set(prompt.id, prompt);
      }
      return [...merged.values()];
    });
  };

  const handleTagToggle = (tag: string) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSearchQuery("");
    setActiveTags([]);
  };

  return (
    <div dir={dir} className="flex min-h-screen flex-col bg-background">
      <Navbar
        prompts={prompts}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        availableTags={availableTags}
        activeTags={activeTags}
        onTagToggle={handleTagToggle}
        onImport={handleImport}
      />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-8">
        {prompts.length === 0 ? (
          <section className="flex flex-1 flex-col items-center justify-center gap-6 rounded-card border border-edge bg-surface/90 p-12 text-center shadow-2xl shadow-black/40">
            <span className="flex h-16 w-16 items-center justify-center rounded-full border border-edge bg-surface">
              <Sparkles size={28} className="text-accent" />
            </span>
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                {t.noPromptsTitle}
              </h2>
              <p className="max-w-sm text-sm leading-6 text-muted">
                {t.noPromptsBody}
              </p>
            </div>
            <button
              type="button"
              onClick={openNewPrompt}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
            >
              <Plus size={16} />
              {t.createFirstPrompt}
            </button>
          </section>
        ) : filteredPrompts.length === 0 ? (
          <section className="flex flex-1 flex-col items-center justify-center gap-6 rounded-card border border-edge bg-surface/90 p-12 text-center shadow-2xl shadow-black/40">
            <span className="flex h-16 w-16 items-center justify-center rounded-full border border-edge bg-surface">
              <SearchX size={28} className="text-muted" />
            </span>
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                {t.noMatchTitle}
              </h2>
              <p className="max-w-sm text-sm leading-6 text-muted">
                {t.noMatchBody}
              </p>
            </div>
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-2 rounded-full border border-edge px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
            >
              {t.clearFilters}
            </button>
          </section>
        ) : (
          <>
            <section className="grid gap-6 md:grid-cols-2">
              {filteredPrompts.map((prompt) => (
                <PromptCard
                  key={prompt.id}
                  prompt={prompt}
                  active={prompt.id === activePrompt?.id}
                  onSelect={(selected) =>
                    setSelectedId((prev) =>
                      prev === selected.id ? null : selected.id
                    )
                  }
                  onEdit={openEditPrompt}
                  onDelete={handleDelete}
                />
              ))}
            </section>

            {activePrompt && (
              <Playground
                key={activePrompt.id}
                prompt={activePrompt.systemPrompt}
              />
            )}
          </>
        )}
      </main>

      <PromptEditor
        open={editorOpen}
        initial={editingPrompt}
        onClose={() => {
          setEditorOpen(false);
          setEditingPrompt(null);
        }}
        onSave={handleSave}
      />
    </div>
  );
}

export default function Home() {
  return (
    <LanguageProvider>
      <HomeContent />
    </LanguageProvider>
  );
}
