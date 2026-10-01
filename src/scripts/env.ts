import { existsSync, readFileSync } from "node:fs";

// tsx (node) tidak memuat .env.local otomatis seperti Next.js. Load manual
// hanya bila DATABASE_URL belum tersedia di environment.
export function loadEnvFile(path = ".env.local"): void {
 if (process.env.DATABASE_URL || !existsSync(path)) return;
 for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
 const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
 if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
 }
}