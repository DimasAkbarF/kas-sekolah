// Seed data awal. Idempotent — aman dijalankan berulang (ON CONFLICT DO NOTHING).
// DILARANG dijalankan di production: password default (admin123, dsb.) yang
// ter-commit hanya untuk development/demo.
import { hashPassword } from "../lib/password";
import { getDb } from "../lib/db";
import { loadEnvFile } from "./env";

loadEnvFile();

if (process.env.NODE_ENV === "production") {
 throw new Error(
 "Seed tidak boleh dijalankan di production (mengandung password default). " +
 "Buat akun staff lewat UI dan rotasi semua password.",
 );
}

const STAFF = [
 { id: "u1", email: "admin@school.test", name: "Administrator", role: "super_admin", password: "admin123" },
 { id: "u2", email: "siti@sma-n1.sch.id", name: "Siti Rahayu", role: "treasurer", password: "siti123" },
 { id: "u5", email: "rizki@sma-n1.sch.id", name: "Rizki Pratama", role: "super_admin", password: "rizki123" },
];

const STUDENT = {
 id: "s1",
 nis: "10201101",
 nisn: "0065678901",
 name: "Ahmad Suryadi",
 email: "ahmad.suryadi@gmail.com",
 gender: "L",
 phone: "081234567890",
 address: "Jl. Merdeka No. 5, Bandung",
 password: "siswa123",
};

async function main() {
 const db = await getDb();

 for (const s of STAFF) {
 await db.query(
 `INSERT INTO users (id, email, password_hash, name, role)
 VALUES ($1, $2, $3, $4, $5)
 ON CONFLICT (id) DO NOTHING`,
 [s.id, s.email, await hashPassword(s.password), s.name, s.role],
 );
 console.log(`user staff: ${s.email} (${s.role})`);
 }

 const studentHash = await hashPassword(STUDENT.password);
 await db.query(
 `INSERT INTO users (id, nisn, email, password_hash, name, role)
 VALUES ('su-s1', $1, $2, $3, $4, 'student')
 ON CONFLICT (id) DO NOTHING`,
 [STUDENT.nisn, STUDENT.email, studentHash, STUDENT.name],
 );

 // Kelas default — data seed harus konsisten dengan schema multi-kelas
 // (tanpa baris ini, seed segar meninggalkan siswa tanpa kelas).
 await db.query(
 `INSERT INTO classes (id, name, grade, academic_year)
 VALUES ('cls-default', 'Regular', 'Regular', '2026/2027')
 ON CONFLICT (name, academic_year) DO NOTHING`,
 );
 await db.query(
 `INSERT INTO students (id, user_id, nis, nisn, name, class_id, class_name, gender, phone, email, address)
 VALUES ($1, 'su-s1', $2, $3, $4, 'cls-default', 'Regular', $5, $6, $7, $8)
 ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email`,
 [STUDENT.id, STUDENT.nis, STUDENT.nisn, STUDENT.name, STUDENT.gender, STUDENT.phone, STUDENT.email, STUDENT.address],
 );
 console.log(`siswa: ${STUDENT.name} (NISN ${STUDENT.nisn})`);

 // Selaraskan baris siswa lama yang belum punya kelas.
 await db.query(
 `UPDATE students SET class_id = 'cls-default', class_name = 'Regular'
 WHERE class_id IS NULL`,
 );

 await db.query(
 `INSERT INTO school_settings (id, name, class_name, academic_year)
 VALUES (1, 'SMP Negeri 17 Tangerang Selatan', 'Regular', '2026/2027')
 ON CONFLICT (id) DO NOTHING`,
 );
 await db.query(
 `INSERT INTO gateway_settings (id, provider, environment, active_methods)
 VALUES (1, 'doku', 'sandbox', '["qris"]')
 ON CONFLICT (id) DO NOTHING`,
 );

 console.log("seed selesai.");
}

main().catch((err) => {
 console.error(err);
 process.exit(1);
});