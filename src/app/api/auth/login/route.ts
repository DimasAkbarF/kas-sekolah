import { z } from "zod";
import { getDb } from "@/lib/db";
import { createSession, getSessionUser } from "@/lib/session";
import { verifyPassword } from "@/lib/password";
import { clientIp, dashboardPathFor, error, json, parseBody, withRouteErrors } from "@/lib/api";
import type { UserRole } from "@/types";

export const dynamic = "force-dynamic";

const LOGIN_SCHEMA = z.object({
 identifier: z.string().trim().min(1).max(255),
 password: z.string().min(1).max(200),
 role: z.enum(["super_admin", "class_admin", "treasurer", "student"]).optional(),
});

// Tiga lapis, semua dihitung dalam satu query:
//   MAX_FAILS         per kombinasi akun + IP (limit lama)
//   MAX_FAILS_IP      per IP, lintas akun — menahan password spraying, yaitu
//                     satu IP mencoba satu password baku ke ratusan NISN siswa.
//                     Tanpa ini tiap NISN punya hitungan 0 dan tidak pernah kena limit.
//   MAX_FAILS_ACCOUNT per akun, lintas IP — menahan distributed brute force
//                     dengan botnet yang berganti-ganti IP.
const MAX_FAILS = 5;
const MAX_FAILS_IP = 20;
const MAX_FAILS_ACCOUNT = 10;
const WINDOW_MINUTES = 15;
// Hash bcrypt tetap untuk pemerataan waktu respon akun tak dikenal
// (mencegah timing oracle mengetahui akun mana yang terdaftar).
// ROUNDS-nya harus sama dengan hashPassword(), kalau tidak akun tak dikenal
// jauh lebih cepat dijawab daripada akun terdaftar — justru membuka timing
// oracle yang komentar ini mau tutup.
const DUMMY_HASH =
  "$2b$12$Wgrk148KPmrHiJGazv9MOe0wF68inem2buwfzuXO1no64Hz1zCMQ2";

async function rateBlocked(identifier: string, ip: string): Promise<boolean> {
  const db = await getDb();
  // WHERE hanya mengambil baris yang relevan untuk salah satu dari dua dimensi
  // (ip ATAU identifier); tiap hitungan lalu dipisah dengan FILTER supaya tidak
  // saling tercampur.
  const { rows } = await db.query<{ pair: number; perIp: number; perAccount: number }>(
    `SELECT
      (count(*) FILTER (WHERE identifier = $1 AND ip = $2))::int AS pair,
      (count(*) FILTER (WHERE ip = $2))::int AS "perIp",
      (count(*) FILTER (WHERE identifier = $1))::int AS "perAccount"
    FROM login_attempts
    WHERE success = false
      AND created_at > now() - ($3 || ' minutes')::interval
      AND (ip = $2 OR identifier = $1)`,
    [identifier, ip, WINDOW_MINUTES],
  );
  if (rows.length === 0) return false;
  const r = rows[0];
  return r.pair >= MAX_FAILS || r.perIp >= MAX_FAILS_IP || r.perAccount >= MAX_FAILS_ACCOUNT;
}

async function flagAttempt(identifier: string, ip: string, success: boolean): Promise<void> {
 const db = await getDb();
 await db.query(
 "INSERT INTO login_attempts (identifier, ip, success) VALUES ($1, $2, $3)",
 [identifier, ip, success],
 );
}

interface LoginRow {
 id: string;
 password_hash: string;
 name: string;
 email: string | null;
 userRole: UserRole;
 avatar: string | null;
 /** null = user tidak terikat kelas (super_admin/treasurer/siswa). */
 classActive: boolean | null;
}

// Pencarian akun: siswa = NISN, staff = email. Bila role disematkan, hanya
// role itu yang dicocokkan — menjaga admin tak bisa login lewat jalur umum.
// Login memakai satu jalur untuk staff (email) dan siswa (NISN). Parameter role
// hanya memilih kolom pencarian; role ASLI dicek ulang di bawah supaya akun
// tidak bisa masuk lewat form yang salah.
const STAFF_ROLES: UserRole[] = ["super_admin", "class_admin", "treasurer"];

async function findUser(
 identifier: string,
 role: UserRole | undefined,
): Promise<LoginRow | null> {
 const db = await getDb();
 const { rows } = await db.query<LoginRow>(
 `SELECT u.id, u.password_hash, u.name, u.email, u.role AS "userRole", u.avatar,
 c.is_active AS "classActive"
 FROM users u
 LEFT JOIN classes c ON c.id = u.class_id
 WHERE (${role === "student" ? "u.nisn = $1 OR u.email = $1" : "u.email = $1"})
 ${role === undefined ? " OR u.nisn = $1" : ""}
 LIMIT 1`,
 [identifier],
 );
 return rows[0] ?? null;
}

export const POST = withRouteErrors(async (request: Request) => {
 const body = await parseBody(request, LOGIN_SCHEMA);
 if (!body.ok) return body.response;
 const { identifier, password, role } = body.value;

 const ip = clientIp(request);

 if (await rateBlocked(identifier, ip)) {
 return json(
 { error: "Terlalu banyak percobaan. Coba lagi beberapa saat.", locked: true },
 429,
 );
 }

 const user = await findUser(identifier, role);
 // Form staff tidak boleh dipakai akun siswa, dan sebaliknya.
 const roleAllowed =
 !user ||
 (role === "student"
 ? user.userRole === "student"
 : STAFF_ROLES.includes(user.userRole));
 if (!user || !roleAllowed) {
 // Waktu bcrypt disetarakan agar akun tak dikenal tak bisa dideteksi lewat
 // selisih waktu respons.
 await verifyPassword(password, DUMMY_HASH);
 await flagAttempt(identifier, ip, false);
 return error("Email/NIS atau password tidak valid.", 401);
 }
 if (!(await verifyPassword(password, user.password_hash))) {
 await flagAttempt(identifier, ip, false);
 return error("Email/NIS atau password tidak valid.", 401);
 }

 // Admin Kelas dari kelas yang dinonaktifkan tidak boleh masuk sama sekali.
 if (user.userRole === "class_admin" && user.classActive === false) {
 await flagAttempt(identifier, ip, true);
 return error("Kelas Anda sedang dinonaktifkan. Hubungi administrator sekolah.", 403);
 }

 await flagAttempt(identifier, ip, true);
 await createSession(user.id);

 // Ambil dari session supaya identik dengan /api/auth/me (sumber kebenaran).
 const session = await getSessionUser();

 return json({
 user: session ?? {
 id: user.id,
 name: user.name,
 email: user.email,
 role: user.userRole,
 avatar: user.avatar,
 classId: null,
 className: null,
 classActive: true,
 },
 redirect: dashboardPathFor(user.userRole),
 });
});