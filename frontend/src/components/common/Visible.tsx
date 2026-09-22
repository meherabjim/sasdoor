"use client";

import { useLanguage } from "@/context/LanguageContext";

/** Hides a section when admin turned it off in Website Management */
export default function Visible({ id, children }: { id: string; children: React.ReactNode }) {
  const { isHidden } = useLanguage();
  if (isHidden(id)) return null;
  return <>{children}</>;
}
