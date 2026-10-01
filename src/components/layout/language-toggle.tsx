"use client";

import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";
import { Languages } from "lucide-react";

export function LanguageToggle() {
 const { locale, setLocale } = useI18n();

 return (
 <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card p-0.5 shadow-2xs">
 <Languages className="ml-1.5 h-4 w-4 text-muted-foreground" />
 {(["id", "en"] as const).map((lang) => (
 <button
 key={lang}
 type="button"
 onClick={() => setLocale(lang)}
 aria-pressed={locale === lang}
 className={cn(
 "rounded-md px-2 py-0.5 text-xs font-medium transition-all active:scale-[0.97]",
 locale === lang
 ? "bg-primary text-primary-foreground font-semibold shadow-teal-sm"
 : "text-muted-foreground hover:text-foreground hover:bg-secondary/40",
 )}
 >
 {lang === "id" ? "ID" : "EN"}
 </button>
 ))}
 </div>
 );
}
