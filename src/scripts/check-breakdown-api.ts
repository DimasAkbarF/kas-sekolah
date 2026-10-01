/**
 * Menjalankan `calculateClassBreakdown` terhadap data yang benar-benar
 * dikembalikan API (bukan fixture), supaya jalur datanya terverifikasi dari
 * ujung ke ujung tanpa harus melihat layar.
 *
 * Jalankan: npx tsx src/scripts/check-breakdown-api.ts
 */
import { calculateClassBreakdown } from "../lib/calculations";
import { formatCurrency } from "../lib/formatters";
import type { Bill, Student, Transaction } from "../types";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

async function authedFetch<T>(path: string): Promise<T> {
 const login = await fetch(`${BASE}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
   identifier: "admin@school.test",
   password: "admin123",
   role: "super_admin",
  }),
 });
 if (!login.ok) throw new Error(`login gagal: ${login.status}`);

 const cookie = login.headers.get("set-cookie")?.split(";")[0];
 const res = await fetch(`${BASE}${path}`, {
  headers: { cookie: cookie ?? "" },
 });
 if (!res.ok) throw new Error(`${path} gagal: ${res.status}`);
 return (await res.json()) as T;
}

async function main() {
 const [{ bills }, { students }, { transactions }] = await Promise.all([
  authedFetch<{ bills: Bill[] }>("/api/bills"),
  authedFetch<{ students: Student[] }>("/api/students"),
  authedFetch<{ transactions: Transaction[] }>("/api/transactions"),
 ]);

 console.log(`data: ${bills.length} tagihan, ${students.length} siswa, ${transactions.length} transaksi\n`);

 const rows = calculateClassBreakdown(bills, transactions, students);
 if (rows.length === 0) {
  console.log("breakdown kosong (belum ada tagihan)");
  return;
 }

 console.log("urutan | kelas        | tunggakan    | lunas        | persen | siswa");
 for (const [i, r] of rows.entries()) {
  console.log(
   `  ${i + 1}    | ${r.className.padEnd(12)} | ${formatCurrency(r.outstanding).padEnd(12)} | ` +
    `${formatCurrency(r.paid).padEnd(12)} | ${String(r.rate).padStart(5)}% | ${r.studentCount}`,
  );
 }

 const sorted = rows.every(
  (r, i) => i === 0 || rows[i - 1].outstanding >= r.outstanding,
 );
 console.log(`\n${sorted ? "PASS" : "FAIL"}  urut dari tunggakan terbesar`);
 console.log(`${rows.length > 1 ? "PASS" : "FAIL"}  lebih dari satu kelas (layout multi-bar teruji)`);
 if (!sorted || rows.length < 2) process.exit(1);
}

void main();
