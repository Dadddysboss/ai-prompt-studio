import { en, type Dictionary } from "./en";
import { es } from "./es";
import { ur } from "./ur";

export type Locale = "en" | "ur" | "es";
export type { Dictionary } from "./en";

export const translations: Record<Locale, Dictionary> = { en, ur, es };

export interface LocaleMeta {
  code: Locale;
  label: string;
  dir: "ltr" | "rtl";
}

export const LOCALES: LocaleMeta[] = [
  { code: "en", label: "EN", dir: "ltr" },
  { code: "ur", label: "اردو", dir: "rtl" },
  { code: "es", label: "ES", dir: "ltr" },
];

export function format(
  template: string,
  values: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match
  );
}
