"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { translations } from "./translations";

interface LanguageContextType {
  lang: string;
  toggleLang: () => void;
  setLang: (lang: string) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  toggleLang: () => {},
  setLang: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState("en");

  useEffect(() => {
    const stored = localStorage.getItem("lang") || "en";
    setLangState(stored);
    document.documentElement.lang = stored;
    document.documentElement.dir = stored === "ar" ? "rtl" : "ltr";
  }, []);

  const setLang = (l: string) => {
    localStorage.setItem("lang", l);
    setLangState(l);
    document.documentElement.lang = l;
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
  };

  const toggleLang = () => {
    setLang(lang === "en" ? "ar" : "en");
  };

  const t = useCallback((key: string, vars?: Record<string, string | number>): string => {
    const dict = lang === "ar" ? translations.ar : translations.en;
    let val = dict[key];
    if (!val) {
      val = translations.en[key] || key;
    }
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        val = val.replace(`{${k}}`, String(v));
      }
    }
    return val;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
