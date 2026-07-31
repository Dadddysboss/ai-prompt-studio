export interface PromptTemplate {
  id: string;
  title: string;
  description: string;
  systemPrompt: string;
  tags: string[];
  updatedAt: string;
}

export type PromptTemplateInput = Omit<PromptTemplate, "id" | "updatedAt">;
