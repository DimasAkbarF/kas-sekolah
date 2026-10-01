import { THEME_INIT_SCRIPT } from "@/lib/theme";

/**
 * Memasang kelas `.dark` (dan `color-scheme`) pada `<html>` sebelum React
 * hydrates.
 *
 * Script-inline di awal `<body>` — bukan `next/script` — karena
 * `beforeInteractive` hanya dibaca dari `_document` (App Router tidak punya
 * file itu), sementara `next/script` menunda eksekusi sampai React siap dan
 * halaman terang akan berkedip pada tema gelap.
 *
 * Isinya statis dan tanpa input pengguna, jadi aman di-inline; CSP di
 * `next.config.ts` sudah mengizinkan 'unsafe-inline' untuk script.
 */
export function ThemeScript() {
 return <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />;
}
