import { createHash, randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { applyScope, error, guard, json, parseBody, parseJsonArray, unauthorized, userClassId, withRouteErrors } from "@/lib/api";
import { sendReminderEmails, type EmailRecipient } from "@/services/email.service";
import { hashPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

// Batas penerima per permintaan (lihat pemeriksaan di bawah).
const MAX_REMINDER_TARGETS = 200;

/**
 * Kunci request yang sedang diproses, untuk menahan klik ganda / tab ganda.
 * Employ: process-local, jadi akan perlu UniqueConstraint di DB kalau aplikasi
 * nanti dijalankan lebih dari satu instance.
 */
const inFlightReminders = new Map<string, number>();

const REMINDER_SCHEMA = z.object({
 title: z
 .string()
 .trim()
 .min(1, "Judul pengingat wajib diisi")
 .max(120, "Judul maksimal 120 karakter"),
 message: z
 .string()
 .trim()
 .min(1, "Pesan pengingat wajib diisi")
 .max(1000, "Pesan maksimal 1000 karakter"),
 targetType: z.enum(["all", "unpaid", "specific"]),
 targetStudentIds: z.array(z.string().max(64)).optional().default([]),
 channels: z
 .array(z.enum(["web", "email"]))
 .min(1, "Pilih minimal satu saluran pengiriman (Notifikasi Web atau Email)"),
});

interface StudentDbRow {
 id: string;
 userId: string | null;
 nis: string;
 nisn: string;
 name: string;
 classId: string | null;
  className: string;
  /** Sumber penerima email: `students.email` (bukan `users.email`). */
  email: string | null;
  /** Hanya untuk penyambungan akun, bukan untuk pengiriman email. */
  userEmail: string | null;
}


interface BillDbRow {
 id: string;
 targetType: string;
 targetIds: string | string[];
 status: string;
}

interface PaidTxRow {
 billId: string;
 studentId: string;
}

/**
 * GET /api/admin/reminders
 * Mengambil daftar riwayat pengingat yang telah dikirim oleh administrator.
 */
export const GET = withRouteErrors(async () => {
 const auth = await guard(["super_admin", "class_admin"]);
 if (!auth.ok) return unauthorized(auth);

 const db = await getDb();
 // Admin Kelas hanya boleh melihat pengingat yang dikirim ke kelasnya —
 // judul + isi pesan adalah data siswa lintas kelas.
 const conds: string[] = [];
 const vals: unknown[] = [];
 applyScope(auth.user, conds, vals, "r");
 const { rows } = await db.query<{
 id: string;
 title: string;
 message: string;
 targetType: string;
 targetCount: number;
 channels: unknown;
 status: string;
 createdBy: string | null;
 createdAt: string;
 }>(
 `SELECT r.id, r.title, r.message,
 r.target_type AS "targetType",
 r.target_count AS "targetCount",
 r.channels,
 r.status,
 r.created_by AS "createdBy",
 r.created_at AS "createdAt"
 FROM reminders r
 ${conds.length ? `WHERE ${conds.join(" AND ")}` : ""}
 ORDER BY r.created_at DESC
 LIMIT 100`,
 vals,
 );

 const reminders = rows.map((r) => ({
 ...r,
 channels: parseJsonArray(r.channels),
 }));

 return json({ reminders });
});

/**
 * POST /api/admin/reminders
 * Mengirim pengingat ke siswa (Web Notification dan/atau Email).
 * Validasi target dilakukan di server-side.
 */
export const POST = withRouteErrors(async (request: Request) => {
 const auth = await guard(["super_admin", "class_admin"]);
 if (!auth.ok) return unauthorized(auth);

 const body = await parseBody(request, REMINDER_SCHEMA);
 if (!body.ok) return body.response;

 const { title, message, targetType, targetStudentIds, channels } = body.value;

 const db = await getDb();

  // 1. Ambil siswa aktif yang berada di kelas user. Satu filter ini yang
  // membatasi SEMUA mode target (all / unpaid / specific), jadi tidak ada
  // jalur yang bisa mengirim pengingat ke siswa kelas lain.
  const studentConds: string[] = ["s.archived = false"];
  const studentVals: unknown[] = [];
  applyScope(auth.user, studentConds, studentVals, "s");
  const studentsRes = await db.query<StudentDbRow>(
  `SELECT s.id,
  s.user_id AS "userId",
  s.nis,
  s.nisn,
  s.name,
  s.class_id AS "classId",
  s.class_name AS "className",
  s.email,
  u.email AS "userEmail"
  FROM students s
  LEFT JOIN users u ON s.user_id = u.id
  WHERE ${studentConds.join(" AND ")}
  ORDER BY s.name ASC`,
    studentVals,
  );


 const allActiveStudents = studentsRes.rows;

 if (allActiveStudents.length === 0) {
 return error("Tidak ada data siswa aktif yang ditemukan.", 400);
 }

 // 2. Evaluasi target di sisi server
 let targetStudents: StudentDbRow[] = [];

 if (targetType === "all") {
 targetStudents = allActiveStudents;
 } else if (targetType === "specific") {
 if (!targetStudentIds || targetStudentIds.length === 0) {
 return error("Pilih minimal satu siswa untuk target spesifik.", 400);
 }
 const idSet = new Set(targetStudentIds);
 targetStudents = allActiveStudents.filter((s) => idSet.has(s.id));
    if (targetStudents.length === 0) {
      return error("Tidak ada data siswa aktif yang ditemukan.", 400);
    }
  } else if (targetType === "unpaid") {
 // Cari tagihan aktif
 const billConds: string[] = ["b.status = 'active'"];
 const billVals: unknown[] = [];
 applyScope(auth.user, billConds, billVals, "b");
 const billsRes = await db.query<BillDbRow>(
 `SELECT b.id, b.target_type AS "targetType", b.target_ids AS "targetIds", b.status
 FROM bills b
 WHERE ${billConds.join(" AND ")}`,
 billVals,
 );

 const activeBills = billsRes.rows.map((b) => ({
 id: b.id,
 targetType: b.targetType,
 targetIds: parseJsonArray(b.targetIds),
 }));

 if (activeBills.length === 0) {
 return error(
 "Tidak ada tagihan aktif saat ini. Seluruh siswa tidak memiliki kewajiban tertunggak.",
 400,
 );
 }

 // Cari transaksi lunas
 const paidConds: string[] = ["t.status = 'PAID'"];
 const paidVals: unknown[] = [];
 applyScope(auth.user, paidConds, paidVals, "t");
 const paidRes = await db.query<PaidTxRow>(
 `SELECT t.bill_id AS "billId", t.student_id AS "studentId"
 FROM transactions t
 WHERE ${paidConds.join(" AND ")}`,
 paidVals,
 );

 const paidKeySet = new Set(paidRes.rows.map((tx) => `${tx.studentId}:${tx.billId}`));

 // Cari siswa yang memiliki minimal 1 tagihan aktif yang belum berstatus PAID
 targetStudents = allActiveStudents.filter((student) => {
 return activeBills.some((bill) => {
 // Apakah tagihan berlaku untuk siswa ini?
 const applies =
 bill.targetType === "all" ||
 bill.targetType === "class" ||
 bill.targetIds.includes(student.id);

 if (!applies) return false;

 // Apakah sudah dibayar lunas?
 const isPaid = paidKeySet.has(`${student.id}:${bill.id}`);
 return !isPaid;
 });
 });

    if (targetStudents.length === 0) {
    return error("Seluruh siswa telah menyelesaikan pembayaran tagihan aktif.", 400);
  }
  }

  // Batas ini berlaku untuk SEMUA mode target, bukan hanya `specific`.
  // Tiap siswa butuh satu INSERT notifikasi, dan tiap email satu pesan dalam
  // batch provider; tanpa batas, "Semua Siswa" pada sekolah besar memproses
  // ratusan baris dalam satu request.
  if (targetStudents.length > MAX_REMINDER_TARGETS) {
    return error(
      `Terlalu banyak penerima dalam satu waktu (maksimal ${MAX_REMINDER_TARGETS} siswa). Pilih sebagian siswa atau kirim bertahap.`,
      400,
    );
  }

  // 3. Anti duplikat. Kunci berasal dari isi + target yang sudah ditentukan
  // server, jadi tidak bisa dipalsukan klien, dan dua request identik dari tab
  // atau tombol yang terdouble-klik menghasilkan satu pengiriman saja.
  const requestKey = [
    auth.user.id,
    title,
    message,
    targetType,
    targetStudents.map((s) => s.id).sort().join(","),
  ].join("|");
  const requestHash = createHash("sha256").update(requestKey).digest("hex");

  if (inFlightReminders.has(requestHash)) {
    return error(
      "Pengingat yang sama sedang diproses. Tunggu sebentar sebelum mengirim ulang.",
      409,
    );
  }
  inFlightReminders.set(requestHash, Date.now());
  // Batasnya process-local: repo ini jalan sebagai satu proses Next, jadi
  // peta in-memory cukup. Kalau nanti multi-instance, pindahkan ke tabel
  // dengan unique constraint di DB.
  try {
  const reminderId = randomUUID();
  let emailSentCount = 0;
  let emailFailedCount = 0;
  let emailSkippedCount = 0;
  let webNotificationCount = 0;

  // 4. Saluran Email. Penerima hanya `students.email`; tidak ada alamat
  // cadangan sintetis karena itu akan dilaporkan "terkirim" padahal tidak
  // pernah sampai ke siapa pun.
  if (channels.includes("email")) {
  const recipients: EmailRecipient[] = targetStudents.map((s) => ({
    name: s.name,
    email: s.email,
  }));

  const emailResult = await sendReminderEmails({
    recipients,
    title,
    message,
    // Provider memakai kunci ini: request identik yang terulang tidak
    // mengirim ulang email yang sama.
    idempotencyKey: requestHash,
  });

  emailSentCount = emailResult.sent;
  emailFailedCount = emailResult.failed;
  emailSkippedCount = emailResult.skipped;

  console.info(
    `[reminders] Email: terkirim=${emailSentCount} gagal=${emailFailedCount} tanpa-email=${emailSkippedCount} target=${targetStudents.length}`,
  );
  if (emailResult.failures.length) {
    console.error("[reminders] Email gagal:", JSON.stringify(emailResult.failures));
  }
  }

 // 5. Hitung status pengiriman. Status mencerminkan-email, bukan sekadar
 // "ada satu kanal yang sukses": web yang berhasil tidak menutupi email yang
 // gagal total, dan alamat kosong/invalid bukan pengiriman.
 let status: "sent" | "partial_failed" | "failed" = "sent";
 if (channels.includes("email") && emailSentCount === 0) {
 status = channels.includes("web") ? "partial_failed" : "failed";
 } else if (emailFailedCount > 0) {
 status = "partial_failed";
 }

 // 6. Simpan riwayat pengingat (harus sebelum notifikasi web, lihat di bawah)
 await db.query(
 `INSERT INTO reminders (id, title, message, target_type, target_count, channels, status, created_by, class_id)
 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
 [
 reminderId,
 title,
 message,
 targetType,
 targetStudents.length,
 JSON.stringify(channels),
 status,
 auth.user.id,
 userClassId(auth.user),
 ],
 );

 // 7. Notifikasi web (setelah baris reminders tersimpan: notifications.reminder_id
 // memakai FK ke reminders, jadi urutannya tidak boleh dibalik)
 if (channels.includes("web")) {
 for (const student of targetStudents) {
 let targetUserId = student.userId;

 // Jika siswa belum memiliki user account di tabel users, sinkronkan atau buat akun siswa
 if (!targetUserId) {
 const studentEmail =
 student.email || `nisn-${student.nisn}@student.sma-n1.sch.id`;
 const existingUser = await db.query<{ id: string }>(
 "SELECT id FROM users WHERE nisn = $1 OR email = $2 LIMIT 1",
 [student.nisn, studentEmail],
 );

 if (existingUser.rows.length > 0) {
 targetUserId = existingUser.rows[0].id;
 } else {
 // Akun dibuat dengan password acak yang tidak diketahui siapa pun: akun
 // hanya bisa dipakai setelah admin mengatur password lewat
 // "Kelola Akun". DULU dipakai hashPassword("siswa123") — password
 // default yang tertulis di dokumentasi, bisa dipakai siapa saja yang
 // tahu NISN. Jangan kembalikan.
 targetUserId = `su-${student.id}`;
 const unusablePasswordHash = await hashPassword(
 randomBytes(32).toString("hex"),
 );
 await db.query(
 `INSERT INTO users (id, nisn, email, password_hash, name, role, class_id)
 VALUES ($1, $2, $3, $4, $5, 'student', $6)
 ON CONFLICT (id) DO NOTHING`,
 [targetUserId, student.nisn, studentEmail, unusablePasswordHash, student.name, student.classId ?? null],
 );
 }

 // Tautkan kembali ke students
 await db.query("UPDATE students SET user_id = $1 WHERE id = $2", [
 targetUserId,
 student.id,
 ]);
 }

 if (targetUserId) {
 const notifId = randomUUID();
 await db.query(
 `INSERT INTO notifications (id, user_id, reminder_id, title, message, is_read)
 VALUES ($1, $2, $3, $4, $5, false)`,
 [notifId, targetUserId, reminderId, title, message],
 );
 webNotificationCount++;
 }
 }
 }

 // 8. Audit log
 await db.query(
 `INSERT INTO audit_logs (user_id, action, entity, detail)
 VALUES ($1, 'reminder_send', 'reminder', $2)`,
 [
 auth.user.id,
 JSON.stringify({
 reminderId,
 targetType,
 targetCount: targetStudents.length,
 channels,
 webCount: webNotificationCount,
 emailSentCount,
 emailFailedCount,
 }),
 ],
 );

  return json(
  {
  ok: true,
  reminderId,
  targetCount: targetStudents.length,
  webCount: webNotificationCount,
  emailSentCount,
  emailFailedCount,
  emailSkippedCount,
  status,
  },
  201,
  );
  } finally {
  inFlightReminders.delete(requestHash);
  }
});
