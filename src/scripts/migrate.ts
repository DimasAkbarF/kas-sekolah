// Menerapkan schema ke database yang dikonfigurasi (Neon/Vercel pada umumnya).
// Jalankan sekali setelah DATABASE_URL di-set: npm run db:migrate
import postgres from "postgres";
import { SCHEMA_SQL } from "../db/schema";
import { loadEnvFile } from "./env";

loadEnvFile();

async function main() {
 const url = process.env.DATABASE_URL;
 if (!url) throw new Error("DATABASE_URL belum di-set. Lihat .env.example.");

 const sql = postgres(url, { max: 5 });
 const statements = SCHEMA_SQL.split(/;\s*(?:\r?\n|$)/)
 .map((s) => s.trim())
 .filter(Boolean);
 for (const stmt of statements) await sql.unsafe(stmt);
 console.log(`schema diterapkan ke database (${statements.length} statement).`);
 await sql.end();
}

main().catch((err) => {
 console.error(err);
 process.exit(1);
});