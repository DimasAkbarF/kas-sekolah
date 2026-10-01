// Backfill data awal untuk mode multi-kelas. Idempotent — aman dijalankan
// berulang.
//
// Yang dilakukan:
// 1. Membuat satu kelas "default" dari school_settings yang sudah ada
// (class_name + academic_year), bukan dari asumsi.
// 2. Memetakan role lama: admin & principal -> super_admin.
// 3. Mengisi class_id pada tabel yang punya kolom class_id untuk baris lama.
//
// Tidak menghapus, tidak mengubah, dan tidak mengarang assignment: baris yang
// tidak punya class_name hanya diletakkan di kelas default hasil baca data
// sekolah, dan Super Admin bisa memindahkannya lewat UI.
import { getDb } from "../lib/db";
import { loadEnvFile } from "./env";

loadEnvFile();

const DEFAULT_CLASS_ID = "cls-default";

async function main() {
 const db = await getDb();

 // 1. Kelas default dari school_settings
 const settings = await db.query<{ class_name: string | null; academic_year: string | null }>(
 "SELECT class_name, academic_year FROM school_settings WHERE id = 1",
 );
 const className = settings.rows[0]?.class_name?.trim() || "Kelas Utama";
 const academicYear = settings.rows[0]?.academic_year?.trim() || "-";
 console.log(`[1] kelas default: "${className}" tahun ajaran ${academicYear}`);

 await db.query(
 `INSERT INTO classes (id, name, grade, academic_year)
 VALUES ($1, $2, $3, $4)
 ON CONFLICT (id) DO NOTHING`,
 [DEFAULT_CLASS_ID, className, className, academicYear],
 );

 // 2. Role lama -> super_admin (role 'admin'/'principal' tidak lagi ada di CHECK)
 const roleMap = await db.query(
 "UPDATE users SET role = 'super_admin' WHERE role IN ('admin', 'principal') RETURNING id",
 );
 console.log(`[2] user di-map ke super_admin: ${roleMap.rows.length}`);

 // 3. Isi class_id untuk data lama. students lebih dulu karena tagihan dan
 // transaksi diturunkan dari kelas siswanya.
 const students = await db.query(
 "UPDATE students SET class_id = $1 WHERE class_id IS NULL RETURNING id",
 [DEFAULT_CLASS_ID],
 );
 console.log(`[3] students -> ${students.rows.length}`);

 for (const table of ["bills", "transactions", "incomes", "expenses", "payment_methods", "reminders"]) {
 const res = await db.query(
 `UPDATE ${table} SET class_id = $1 WHERE class_id IS NULL RETURNING id`,
 [DEFAULT_CLASS_ID],
 );
 console.log(`[3] ${table} -> ${res.rows.length}`);
 }

 // 4. Samakan class_name (label di UI) dengan nama kelas. Kolom ini tetap
 // dipertahankan karena dipakai sebagai teks tampilan, bukan sumber scope.
 const labels = await db.query(
 `UPDATE students s SET class_name = c.name
 FROM classes c WHERE c.id = s.class_id AND (s.class_name IS NULL OR s.class_name = '')`,
 );
 console.log(`[4] class_name siswa disinkronkan: ${labels.rows.length}`);

 // 5. Admin kelas: staff lama tanpa kelas tetap global supaya tidak kehilangan akses.
 const staff = await db.query(
 "SELECT id, role FROM users WHERE role IN ('super_admin', 'treasurer')",
 );
 console.log(`[5] staff global (class_id null): ${staff.rows.length} akun`);

 // Ringkasan akhir
 const classes = await db.query("SELECT id, name, grade, academic_year, is_active FROM classes");
 const orphanStudents = await db.query(
 "SELECT count(*)::int AS n FROM students WHERE class_id IS NULL",
 );
 console.log("\n=== RINGKASAN ===");
 console.log("classes:", JSON.stringify(classes.rows));
 console.log("siswa tanpa kelas:", JSON.stringify(orphanStudents.rows));
}

main().catch((err) => {
 console.error("Backfill gagal:", err instanceof Error ? err.message : err);
 process.exit(1);
});
