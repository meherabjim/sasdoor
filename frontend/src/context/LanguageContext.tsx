"use client";

import { createContext, Fragment, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { applyContent, ContentItem, hiddenSections } from "@/lib/siteContent";

type Language = "en" | "bn";

type LanguageContextType = {
  language: Language;
  setLanguage: (language: Language) => void;
  /** website content from admin (text, images, hidden sections, portfolio) */
  content: ContentItem[];
  isHidden: (sectionKey: string) => boolean;
  reloadContent: () => Promise<void>;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);
const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLang] = useState<Language>("en");
  const [content, setContent] = useState<ContentItem[]>([]);
  const [version, setVersion] = useState(0);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const reloadContent = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/public/content`);
      if (!r.ok) return;
      const items: ContentItem[] = (await r.json()).data ?? [];
      applyContent(items);
      setContent(items);
      setHidden(hiddenSections(items));
      if (items.length) setVersion((v) => v + 1);
    } catch {
      /* backend off: website shows its default text */
    }
  }, []);

  useEffect(() => {
    try { const saved = localStorage.getItem("sas-lang"); if (saved === "en" || saved === "bn") setLang(saved); } catch { /* ignore */ }
    reloadContent();
  }, [reloadContent]);

  const setLanguage = (l: Language) => { setLang(l); try { localStorage.setItem("sas-lang", l); } catch { /* ignore */ } };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, content, isHidden: (k) => hidden.has(k), reloadContent }}>
      <Fragment key={version}>{children}</Fragment>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}
