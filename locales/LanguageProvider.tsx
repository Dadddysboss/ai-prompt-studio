"use client";

import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { translations, type Dictionary, type Locale } from "./index";

interface LanguageContextValue {
  locale: Locale;
  setLocale: (value: Locale | ((prev: Locale) => Locale)) => void;
  dir: "ltr" | "rtl";
  t: Dictionary;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useLocalStorage<Locale>("locale", "en");

  const value = useMemo<LanguageContextValue>(() => {
    const resolved: Locale = translations[locale] ? locale : "en";
    return {
      locale: resolved,
      setLocale,
      dir: resolved === "ur" ? "rtl" : "ltr",
      t: translations[resolved],
    };
  }, [locale, setLocale]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
