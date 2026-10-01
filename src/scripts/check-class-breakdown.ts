/**
 * Check untuk `calculateClassBreakdown`: perhitungannya uang, jadi harus diuji
 * sendiri, bukan cuma dilihat tampilannya.
 *
 * Jalankan: npx tsx src/scripts/check-class-breakdown.ts
 */
import { calculateClassBreakdown } from "../lib/calculations";
import type { Bill, Student, Transaction } from "../types";

const students: Student[] = [
 { id: "s1", userId: "u1", nis: "1", nisn: "n1", name: "A", classId: "7A", className: "7A" },
 { id: "s2", userId: "u2", nis: "2", nisn: "n2", name: "B", classId: "7A", className: "7A" },
 { id: "s3", userId: "u3", nis: "3", nisn: "n3", name: "C", classId: "7B", className: "7B" },
];

function bill(id: string, amount: number, extra: Partial<Bill> = {}): Bill {
 return {
  id,
  classId: "7A",
  name: id,
  category: "iuran",
  amount,
  status: "active",
  startDate: "2026-07-01",
  targetType: "class",
  targetIds: [],
  createdAt: "2026-07-01",
  ...extra,
 } as Bill;
}

function tx(id: string, billId: string, amount: number, status: Transaction["status"]): Transaction {
 return {
  id,
  billId,
  studentId: "s1",
  amount,
  status,
  paymentMethod: "cash",
  createdAt: "2026-07-02",
  paidAt: status === "PAID" ? "2026-07-02" : null,
 } as Transaction;
}

const checks: [string, boolean, string?][] = [
 // 7A: tagihan 100rb × 2 siswa = 200rb kewajiban, 100rb dibayar → 100rb nungguk
 [
  "7A: 2 siswa × 100rb, terbayar 100rb → tunggakan 100rb, rate 50%",
  (() => {
   const r = calculateClassBreakdown(
    [bill("b1", 100_000)],
    [tx("t1", "b1", 100_000, "PAID")],
    students,
   );
   const a = r.find((x) => x.className === "7A");
   return (
    a?.outstanding === 100_000 && a.paid === 100_000 && a.rate === 50 &&
    a.studentCount === 2
   );
  })(),
 ],
 // Transaksi non-PAID tidak boleh mengurangi utang (percobaan bayar gagal)
 [
  "transaksi PENDING/FAILED tidak mengurangi tunggakan",
  (() => {
   const r = calculateClassBreakdown(
    [bill("b1", 100_000)],
    [
     tx("t1", "b1", 100_000, "PENDING"),
     tx("t2", "b1", 100_000, "FAILED"),
     tx("t3", "b1", 100_000, "CANCELLED"),
    ],
    students,
   );
   const a = r.find((x) => x.className === "7A");
   return a?.outstanding === 200_000 && a.paid === 0 && a.rate === 0;
  })(),
 ],
 // Overpay tidak boleh membuat outstanding negatif
 [
  "pembayaran lebih besar tidak menghasilkan tunggakan negatif",
  (() => {
   const r = calculateClassBreakdown(
    [bill("b1", 100_000)],
    [tx("t1", "b1", 250_000, "PAID")],
    students,
   );
   const a = r.find((x) => x.className === "7A");
   return a?.outstanding === 0 && a.rate === 100;
  })(),
 ],
 // Tagihan inactive diabaikan
 [
  "tagihan inactive diabaikan",
  (() => {
   const r = calculateClassBreakdown(
    [bill("b1", 100_000, { status: "inactive" })],
    [],
    students,
   );
   return r.length === 0;
  })(),
 ],
 // Tagihan untuk seluruh sekolah masuk baris "Tanpa kelas"
 [
  "tagihan untuk semua siswa masuk baris 'Tanpa kelas'",
  (() => {
   const r = calculateClassBreakdown(
    [bill("b1", 10_000, { targetType: "all" })],
    [],
    students,
   );
   return r.length === 1 && r[0].className === "Tanpa kelas" &&
    r[0].outstanding === 30_000;
  })(),
 ],
 // Urutan: tunggakan terbesar di atas
 [
  "diurutkan dari tunggakan terbesar",
  (() => {
   const r = calculateClassBreakdown(
    [
     bill("b1", 10_000, { classId: "7A" }), // 2 siswa → 20rb
     bill("b2", 200_000, { classId: "7B" }), // 1 siswa → 200rb
    ],
    [],
    students,
   );
   return r[0].className === "7B" && r[1].className === "7A";
  })(),
 ],
 // Tidak ada data → array kosong, bukan crash
 ["data kosong menghasilkan array kosong", calculateClassBreakdown([], [], []).length === 0],
];

let failed = 0;
for (const [label, ok] of checks) {
 if (!ok) failed++;
 console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
}

const sample = calculateClassBreakdown(
 [bill("b1", 100_000), bill("b2", 200_000, { classId: "7B" })],
 [tx("t1", "b1", 50_000, "PAID")],
 students,
);
console.log(`\ncontoh keluaran:\n${JSON.stringify(sample, null, 2)}`);

if (failed > 0) {
 console.error(`\n${failed} pemeriksaan gagal`);
 process.exit(1);
}
console.log("\nsemua pemeriksaan lulus");
