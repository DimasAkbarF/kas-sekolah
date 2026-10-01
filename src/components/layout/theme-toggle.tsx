"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import {
 applyTheme,
 getServerTheme,
 getStoredTheme,
 resolveTheme,
 setTheme,
 subscribeTheme,
 watchSystemTheme,
 type Theme,
} from "@/lib/theme";

const OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
 { value: "light", label: "Terang", Icon: Sun },
 { value: "dark", label: "Gelap", Icon: Moon },
 { value: "system", label: "Ikuti sistem", Icon: Monitor },
];

function useTheme(): Theme {
 return useSyncExternalStore(subscribeTheme, getStoredTheme, getServerTheme);
}

export function ThemeToggle() {
 const theme = useTheme();
 const resolved = resolveTheme(theme);

 return (
 <div
 role="group"
 aria-label="Tema tampilan"
 className="flex items-center gap-0.5 rounded-lg border border-border bg-card p-0.5 shadow-2xs"
 >
 {OPTIONS.map(({ value, label, Icon }) => (
 <button
 key={value}
 type="button"
 onClick={() => setTheme(value)}
 aria-pressed={theme === value}
 title={label}
 className={cn(
 "rounded-md px-2 py-1 transition-colors",
 theme === value
 ? "bg-primary text-primary-foreground shadow-teal-sm"
 : "text-muted-foreground hover:text-foreground hover:bg-secondary/40",
 )}
 >
 <Icon className="h-3.5 w-3.5" aria-hidden="true" />
 <span className="sr-only">{label}</span>
 </button>
 ))}
 <SystemThemeWatcher />
 <span className="sr-only" aria-live="polite">
 {`Tema aktif: ${resolved === "dark" ? "gelap" : "terang"}`}
 </span>
 </div>
 );
}

/**
 * Memantau preferensi sistem dan menerapkan tema ke `<html>`.
 *
 * Sengaja tanpa output: tugasnya hanya menyinkronkan sistem eksternal.
 * Berlangganan lewat `useSyncExternalStore` (bukan `useState` + effect) supaya
 * tidak ada setState di dalam effect.
 */
function SystemThemeWatcher() {
 useSyncExternalStore(
 () => {
 // Dipanggil setelah mount: tempat yang tepat untuk menyinkronkan `<html>`.
 applyTheme(getStoredTheme());
 return watchSystemTheme();
 },
 () => true,
 () => true,
 );
 return null;
}
