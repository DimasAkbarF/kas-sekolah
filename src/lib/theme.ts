// Tema tampilan (light / dark / system).
//
// Sumber kebenaran ada di `localStorage`, bukan di state React: `ThemeScript`
// membacanya sebelum React hydrates, jadi tidak ada kedipan terang→gelap di
// awal muat. Semua komponen berlangganan via `useSyncExternalStore` supaya
// tidak perlu setState di dalam effect.

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "kas-sekolah.theme";
const listeners = new Set<() => void>();

/** Kode ini juga di-inline-kan oleh ThemeScript — jangan diubah tanpa ikut menyalin. */
export const THEME_INIT_SCRIPT = `(function(){try{var k="kas-sekolah.theme";var s=localStorage.getItem(k);var d=window.matchMedia("(prefers-color-scheme: dark)").matches;var t=(s==="light"||s==="dark")?s:(d?"dark":"light");var r=document.documentElement;r.classList.toggle("dark",t==="dark");r.style.colorScheme=t;}catch(e){}})();`;

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw === "light" || raw === "dark" || raw === "system" ? raw : "system";
}

export function getServerTheme(): Theme {
  return "light";
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") return systemPrefersDark() ? "dark" : "light";
  return theme;
}

/** Terapkan tema ke <html>. Dipanggil script pra-hydrasi maupun saat toggle. */
export function applyTheme(theme: Theme): "light" | "dark" {
  const resolved = resolveTheme(theme);
  if (typeof document !== "undefined") {
    const root = document.documentElement;
    root.classList.toggle("dark", resolved === "dark");
    // Membuat kontrol native (scrollbar, input date, select) ikut gelap.
    root.style.colorScheme = resolved;
  }
  return resolved;
}

export function setTheme(theme: Theme): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, theme);
  }
  applyTheme(theme);
  listeners.forEach((listener) => listener());
}

/** Ikuti perubahan preferensi OS selama mode "system" aktif. */
export function watchSystemTheme(): () => void {
  if (typeof window === "undefined") return () => {};
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => {
    if (getStoredTheme() !== "system") return;
    applyTheme("system");
    listeners.forEach((listener) => listener());
  };
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}
