import { SCHEMA_SQL } from "@/db/schema";

export interface DbQuery {
 query<T = Record<string, unknown>>(
 sql: string,
 params?: unknown[],
 ): Promise<{ rows: T[] }>;
}

interface PgliteLike extends DbQuery {
 exec(sql: string): Promise<unknown>;
}

let cached: DbQuery | undefined;
let pglite: PgliteLike | undefined;

// Membuka koneksi DB. Saat DATABASE_URL ada (Vercel/Neon) memakai driver
// postgres.js; selain itu PGlite (Postgres WASM) untuk development lokal tanpa
// setup apa pun. Dibuka sekali per proses (memoized).
export async function getDb(): Promise<DbQuery> {
 if (cached) return cached;

 const url = process.env.DATABASE_URL;
 if (url) {
 const postgres = (await import("postgres")).default;
 const sql = postgres(url, { max: 5 });
 cached = {
 async query<T>(text: string, params: unknown[] = []) {
 const rows = (await sql.unsafe(text, params as never[])) as T[];
 return { rows };
 },
 };
 return cached;
 }

 const { PGlite } = await import("@electric-sql/pglite");
 const { mkdirSync } = await import("node:fs");
 const dataDir = ".data/pglite";
 mkdirSync(dataDir, { recursive: true });
 pglite = new PGlite(dataDir) as unknown as PgliteLike;
 await pglite.exec(SCHEMA_SQL);
 cached = {
 query<T>(text: string, params: unknown[] = []) {
 return pglite!.query<T>(text, params);
 },
 };
 return cached;
}