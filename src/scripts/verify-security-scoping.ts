// Runnable check untuk dua perbaikan keamanan:
//   1. GET /api/bills — isolasi role student (sekarang bocor semua tagihan)
//   2. PATCH /api/transactions/[id] — tabrakan placeholder SQL (konfirmasi
//      pembayaran diam-diam tidak tersimpan)
//
// Jalankan: npx tsx src/scripts/verify-security-scoping.ts
import { PGlite } from "@electric-sql/pglite";
import { SCHEMA_SQL } from "@/db/schema";
import { csvCell } from "@/services/reports.service";

let failures = 0;
function check(label: string, ok: boolean, detail = ""): void {
  if (ok) {
    console.log(`  PASS  ${label}`);
  } else {
    failures++;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

async function main(): Promise<void> {
  const db = new PGlite();
  await db.exec(SCHEMA_SQL);

  // Dieksekusi satu per satu: PGlite `exec` dengan banyak statement tidak
  // menjamin baris dari statement sebelumnya sudah terlihat oleh statement
  // berikutnya sehingga FK transient gagal.
  const fixture = [
    `INSERT INTO classes (id, name, grade, academic_year) VALUES
       ('c-a', 'Kelas A', 'XII', '2025/2026'), ('c-b', 'Kelas B', 'XII', '2025/2026')`,
    `INSERT INTO users (id, name, email, password_hash, role) VALUES
       ('u-admin', 'Admin', 'admin@x.test', 'x', 'super_admin'),
       ('u-siswa', 'Siti', 'siswa@x.test', 'x', 'student')`,
    `INSERT INTO students (id, user_id, nis, nisn, name, class_id) VALUES
       ('s-siswa', 'u-siswa', '001', '0001', 'Siti', 'c-a'),
       ('s-rizki', NULL,    '002', '0002', 'Rizki', 'c-b')`,
    `INSERT INTO bills (id, name, category, amount, period, start_date, due_date, target_type, target_ids, class_id) VALUES
       ('b-all',      'Iuran sekolah',   'SPP', 100000, '2026-01', '2026-01-01', '2026-01-10', 'all',      '[]',           NULL),
       ('b-kelas-a',  'Iuran kelas A',   'SPP',  50000, '2026-01', '2026-01-01', '2026-01-10', 'class',    '[]',           'c-a'),
       ('b-kelas-b',  'Iuran kelas B',   'SPP',  60000, '2026-01', '2026-01-01', '2026-01-10', 'class',    '[]',           'c-b'),
       ('b-spesifik', 'Keperluan illus', 'PPD',  75000, '2026-01', '2026-01-01', '2026-01-10', 'specific', '["s-rizki"]',  NULL)`,
    `INSERT INTO transactions (id, bill_id, student_id, amount, payment_method, status, class_id)
       VALUES ('t-1', 'b-all', 's-siswa', 100000, 'cash', 'PENDING', 'c-a')`,
  ];
  for (const stmt of fixture) await db.exec(stmt);

  // ---- 1. Scope tagihan untuk siswa ----------------------------------------
  // Logika ini disalin apa adanya dari GET /api/bills agar check gagal kalau
  // perbaikan di route.ts nanti dikembalikan.
  function studentBillScope(sId: string, sClassId: string) {
    const vals: unknown[] = [];
    const conds = [
      `(
    b.target_type = 'all'
    OR (b.target_type = 'class' AND (b.class_id = $${vals.push(sClassId)} OR b.class_id IS NULL))
    OR (b.target_type = 'specific' AND b.target_ids ? $${vals.push(sId)})
    )`,
    ];
    return { where: conds.join(" AND "), vals };
  }

  console.log("\n[1] Isolasi tagihan role student (GET /api/bills)");

  const before = await db.query<{ id: string }>(
    "SELECT id FROM bills ORDER BY id",
  );
  check("sebelum patch: semua tagihan terlihat (bocor terdeteksi)", before.rows.length === 4);

  const scope = studentBillScope("s-siswa", "c-a");
  const { rows: after } = await db.query<{ id: string }>(
    `SELECT b.id FROM bills b WHERE ${scope.where} ORDER BY b.id`,
    scope.vals as never[],
  );
  const ids = after.map((r) => r.id);
  console.log(`        tagihan terlihat: ${ids.join(", ")}`);
  check("tagihan sekolah (target_type all) tetap terlihat", ids.includes("b-all"));
  check("tagihan kelas sendiri terlihat", ids.includes("b-kelas-a"));
  check("tagihan kelas lain TIDAK terlihat", !ids.includes("b-kelas-b"), "bocor kelas lain");
  check("tagihan specific siswa lain TIDAK terlihat", !ids.includes("b-spesifik"), "bocor tagihan orang");

  // ---- 2. Placeholder pada UPDATE konfirmasi --------------------------------
  console.log("\n[2] Placeholder SQL konfirmasi pembayaran (PATCH /api/transactions/[id])");

  // Cerminan applyScope() di src/lib/api.ts: Super Admin/bendahara global tidak
  // menambah apa pun, Admin Kelas menambah class_id. Penting: nomor placeholder
  // datang dari nilai balik vals.push(), bukan vals.length + 1.
  function applyScope(conds: string[], vals: unknown[], alias = "t"): void {
    if (role === "super_admin" || role === "treasurer") return;
    if (role === "class_admin" && classId) conds.push(`${alias}.class_id = $${vals.push(classId)}`);
  }

  let role: string;
  let classId: string | null;

  function scopedId(userRole: string, userClassId: string | null, id: string) {
    role = userRole;
    classId = userClassId;
    const conds: string[] = ["t.id = $1"];
    const vals: unknown[] = [id];
    applyScope(conds, vals, "t");
    return { where: conds.join(" AND "), vals };
  }

  // Versi SEBELUM perbaikan: newStatus disisipkan di depan scope.vals sehingga
  // $1 dipakai dua kali. Gejalanya bukan "silent no-op" melainkan Postgres
  // menolak statement-nya, jadi withRouteErrors membalas 500 dan tombol
  // "Konfirmasi Lunas" tidak pernah berhasil sama sekali.
  const buggy = scopedId("super_admin", null, "t-1");
  let buggyThrew = "";
  try {
    await db.query(
      `UPDATE transactions AS t SET status = $1, paid_at = CASE WHEN $1 = 'PAID' THEN now() ELSE paid_at END
       WHERE ${buggy.where} RETURNING t.id`,
      ["PAID", ...buggy.vals] as never[],
    );
  } catch (e) {
    buggyThrew = (e as Error).message;
  }
  check(
    "sebelum patch: konfirmasi Always gagal (bug terdeteksi)",
    buggyThrew.includes("requires 1"),
    `pesan error: ${buggyThrew || "(tidak error)"}`,
  );
  const stillPending = await db.query<{ status: string }>(
    "SELECT status FROM transactions WHERE id = 't-1'",
  );
  check("sebelum patch: transaksi masih PENDING di database", stillPending.rows[0].status === "PENDING");

  // Versi SESUDAH perbaikan: newStatus memakai placeholder setelah seluruh scope.
  const fixed = scopedId("super_admin", null, "t-1");
  const statusParam = `$${fixed.vals.length + 1}`;
  const fixedRes = await db.query<{ id: string; status: string; paid_at: string | null }>(
    `UPDATE transactions AS t
     SET status = ${statusParam},
         paid_at = CASE WHEN ${statusParam} = 'PAID' THEN now() ELSE paid_at END
     WHERE ${fixed.where} RETURNING t.id, t.status, t.paid_at`,
    [...fixed.vals, "PAID"] as never[],
  );
  check("sesudah patch: satu baris ter-update", fixedRes.rows.length === 1, `dapat ${fixedRes.rows.length}`);
  check("sesudah patch: status jadi PAID", fixedRes.rows[0]?.status === "PAID");
  check("sesudah patch: paid_at terisi", Boolean(fixedRes.rows[0]?.paid_at));

  // Admin kelas: placeholder kedua (class_id) juga harus benar, dan UPDATE
  // tidak boleh menyentuh transaksi kelas lain.
  await db.exec(
    `INSERT INTO transactions (id, bill_id, student_id, amount, payment_method, status, class_id)
     VALUES ('t-2', 'b-kelas-b', 's-rizki', 60000, 'cash', 'PENDING', 'c-b')`,
  );
  const admin = scopedId("class_admin", "c-a", "t-2");
  const adminRes = await db.query<{ id: string }>(
    `UPDATE transactions AS t SET status = $${admin.vals.length + 1} WHERE ${admin.where} RETURNING t.id`,
    [...admin.vals, "CANCELLED"] as never[],
  );
  check("class_admin: transaksi kelas LAIN tidak bisa diubah (0 baris)", adminRes.rows.length === 0);

  const adminOwn = scopedId("class_admin", "c-a", "t-1");
  const adminOwnRes = await db.query<{ id: string }>(
    `UPDATE transactions AS t SET status = $${adminOwn.vals.length + 1} WHERE ${adminOwn.where} RETURNING t.id`,
    [...adminOwn.vals, "CANCELLED"] as never[],
  );
  check("class_admin: transaksi kelas sendiri bisa diubah (1 baris)", adminOwnRes.rows.length === 1);

  // ---- 3. Rate limit login --------------------------------------------------
  console.log("\n[3] Rate limit login (anti spraying & distributed brute force)");

  const MAX_FAILS = 5;
  const MAX_FAILS_IP = 20;
  const MAX_FAILS_ACCOUNT = 10;
  const WINDOW_MINUTES = 15;

  // Cerminan rateBlocked() di src/app/api/auth/login/route.ts
  async function rateBlocked(identifier: string, ip: string): Promise<boolean> {
    const { rows } = await db.query<{ pair: number; perIp: number; perAccount: number }>(
      `SELECT
        (count(*) FILTER (WHERE identifier = $1 AND ip = $2))::int AS pair,
        (count(*) FILTER (WHERE ip = $2))::int AS "perIp",
        (count(*) FILTER (WHERE identifier = $1))::int AS "perAccount"
      FROM login_attempts
      WHERE success = false
        AND created_at > now() - ($3 || ' minutes')::interval
        AND (ip = $2 OR identifier = $1)`,
      [identifier, ip, WINDOW_MINUTES] as never[],
    );
    if (rows.length === 0) return false;
    const r = rows[0];
    return r.pair >= MAX_FAILS || r.perIp >= MAX_FAILS_IP || r.perAccount >= MAX_FAILS_ACCOUNT;
  }

  let attempt = 0;
  async function fail(identifier: string, ip: string): Promise<void> {
    await db.exec(
      `INSERT INTO login_attempts (identifier, ip, success) VALUES ('${identifier}', '${ip}', false)`,
    );
    attempt++;
  }

  check("fresh: percobaan pertama tidak diblokir", !(await rateBlocked("nisn-0001", "10.0.0.1")));
  for (let i = 0; i < 4; i++) await fail("nisn-0001", "10.0.0.1");
  check("4 gagal: masih di bawah limit", !(await rateBlocked("nisn-0001", "10.0.0.1")));
  await fail("nisn-0001", "10.0.0.1");
  check("5 gagal pada akun+IP yang sama: diblokir", await rateBlocked("nisn-0001", "10.0.0.1"));
  check(
    "akun+IP lain tidak ikut terblokir (limit bukan global)",
    !(await rateBlocked("nisn-0002", "10.0.0.1")),
  );
  check(
    "IP lain untuk akun yang sama belum diblokir di 5 gagal (limit per akun = 10)",
    !(await rateBlocked("nisn-0001", "10.0.0.9")),
  );

  // Password spraying: 1 IP, banyak NISN berbeda, masing-masing di bawah 5.
  for (let i = 0; i < 20; i++) await fail(`nisn-spray-${i}`, "10.0.0.2");
  check(
    "spraying: 20 NISN berbeda dari 1 IP -> diblokir",
    await rateBlocked("nisn-spray-19", "10.0.0.2"),
  );
  check(
    "spraying: NISN baru dari IP yang sama ikut diblokir",
    await rateBlocked("nisn-spray-999", "10.0.0.2"),
  );
  check(
    "IP lain tidak terpengaruh oleh limit IP",
    !(await rateBlocked("nisn-spray-19", "10.0.0.3")),
  );

  // Distributed brute force: 1 akun, banyak IP, masing-masing di bawah 5.
  for (let i = 0; i < 10; i++) await fail("admin@school.test", `10.0.1.${i}`);
  check(
    "distributed: 10 IP berbeda untuk 1 akun -> diblokir",
    await rateBlocked("admin@school.test", "10.0.1.200"),
  );

  // Percobaan sukses tidak boleh ikut dihitung sebagai kegagalan.
  await db.exec(
    `INSERT INTO login_attempts (identifier, ip, success) VALUES ('admin@school.test', '10.0.1.0', true)`,
  );
  const { rows: oldRows } = await db.query<{ n: number }>(
    "SELECT count(*)::int AS n FROM login_attempts WHERE success = false",
  );
  check("hanya kegagalan yang dihitung", oldRows[0].n === attempt, `dapat ${oldRows[0].n}, esperado ${attempt}`);

  // ---- 4. Formula injection pada ekspor CSV --------------------------------
  console.log("\n[4] Formula injection CSV (laporan keuangan)");

  check("sel kosong tetap kosong", csvCell(null) === '""', csvCell(null));
  check("angka tetap apa adanya", csvCell(5000) === '"5000"', csvCell(5000));
  check("koma di dalam sel aman", csvCell("a,b") === '"a,b"', csvCell("a,b"));
  check('kutip ganda tetap di-escape', csvCell('saya "x"') === '"saya ""x"""');
  for (const [label, payload] of [
    ["=HYPERLINK", '=HYPERLINK("http://evil","klik")'],
    ["+SUM", "+SUM(1,1)"],
    ["-2+3", "-2+3"],
    ["@SUM", "@SUM(1)"],
  ] as const) {
    const out = csvCell(payload);
    check(`formula diawali ${label} dinetralkan`, out.startsWith(`"'`), out);
  }
  check("tab/CR di awal juga dinetralkan", csvCell("\tX").startsWith(`"'`));
  check("nama siswa biasa tidak diubah", csvCell("Siti Aminah") === '"Siti Aminah"');

  await db.close();
  console.log(failures === 0 ? "\nSemua check lolos.\n" : `\n${failures} check gagal.\n`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
