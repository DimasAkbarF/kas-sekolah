/**
 * Pengiriman email Kas Sekolah.
 *
 * Dua lapis dengan sengaja:
 *   - `EmailProvider` = kontrak ke vendor (Resend sekarang, SMTP/bulk lain nanti).
 *   - `sendReminderEmails` = isi email pengingat, tidak tahu vendor apa pun.
 * Ganti provider berarti mengganti satu kelas, bukan logika fitur.
 *
 * Lapis ini tidak pernah melempar error. Kegagalan provider harus jadi angka
 * yang dilaporkan ke admin, bukan exception yang membatalkan notifikasi web.
 */

import { Resend } from "resend";

const SCHOOL_NAME = "SMP Negeri 17 Tangerang Selatan";
const PRODUCT_NAME = "Kas Sekolah";

/** Batas recipients per panggilan batch Resend. */
const RESEND_BATCH_LIMIT = 100;

export interface EmailRecipient {
  /** Alamat dari `students.email`. Null/ kosong berarti siswa tidak punya email. */
  email: string | null;
  name: string;
}

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface SendOutcome {
  to: string;
  ok: boolean;
  /** Alasan singkat, aman ditampilkan (tidak pernah memuat kredensial). */
  error?: string;
}

export interface EmailProvider {
  /**
   * Kirim sekaligus. Mengembalikan satu hasil per pesan, urutan sama dengan
   * input, supaya pemanggil bisa mencocokkan nomor siswa dengan status email.
   * `idempotencyKey` opsional: provider yang mendukungnya memakai agar retry
   * permintaan yang sama tidak mengirim ulang.
   */
  sendBatch(messages: OutgoingEmail[], idempotencyKey?: string): Promise<SendOutcome[]>;
}

export interface SendReminderEmailOptions {
  recipients: EmailRecipient[];
  title: string;
  message: string;
  /** Kunci idempotensi provider; retry permintaan yang sama tidak kirim dua kali. */
  idempotencyKey?: string;
}

export interface SendEmailResult {
  sent: number;
  failed: number;
  /** Siswa yang tidak punya email atau email-nya tidak valid. Bukan kegagalan provider. */
  skipped: number;
  errors: string[];
  /** Yang tidak terkirim, untuk logging server. */
  failures: { to: string; name: string; reason: string }[];
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Template HTML pengingat. Warna diambil dari token DESIGN.md
 * (`--primary` #177A75, `--foreground` #153331, `--background` #EFF8F7) supaya
 * email memakai identitas visual yang sama dengan aplikasi.
 */
export function buildReminderEmailHtml(
  recipientName: string,
  title: string,
  message: string,
): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:24px 12px;background-color:#EFF8F7;font-family:'IBM Plex Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:#153331;">
  <div style="max-width:560px;margin:0 auto;background-color:#FFFFFF;border:1px solid #D4EAE7;border-radius:12px;overflow:hidden;">
    <div style="background-color:#177A75;padding:20px 24px;">
      <p style="margin:0;font-size:17px;font-weight:700;letter-spacing:-0.01em;color:#FFFFFF;">${escapeHtml(PRODUCT_NAME)}</p>
      <p style="margin:4px 0 0;font-size:12px;color:#D4F2EF;">${escapeHtml(SCHOOL_NAME)}</p>
    </div>
    <div style="padding:24px;">
      <p style="margin:0 0 16px;font-size:14px;">Halo, <strong>${escapeHtml(recipientName)}</strong>,</p>
      <div style="background-color:#F0FDFA;border-left:3px solid #177A75;border-radius:0 4px 4px 0;padding:14px 16px;margin-bottom:20px;">
        <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#134E4A;">${escapeHtml(title)}</p>
        <p style="margin:0;font-size:14px;white-space:pre-line;">${escapeHtml(message)}</p>
      </div>
      <p style="margin:0;font-size:13px;color:#4E7370;">Pesan ini dikirim melalui ${escapeHtml(PRODUCT_NAME)} ${escapeHtml(SCHOOL_NAME)}.</p>
    </div>
    <div style="border-top:1px solid #D4EAE7;padding:16px 24px;background-color:#F7FCFB;">
      <p style="margin:0;font-size:12px;font-weight:600;">${escapeHtml(SCHOOL_NAME)}</p>
      <p style="margin:3px 0 0;font-size:12px;color:#4E7370;">Pengingat administratif. Bukan tagihan baru.</p>
    </div>
  </div>
</body>
</html>`;
}

function buildReminderEmailText(
  recipientName: string,
  title: string,
  message: string,
): string {
  return [
    `Halo, ${recipientName},`,
    "",
    title,
    "",
    message,
    "",
    `Pesan ini dikirim melalui ${PRODUCT_NAME} ${SCHOOL_NAME}.`,
  ].join("\n");
}

/**
 * Provider Resend. Satu panggilan HTTP per 100 email (batas batch API Resend),
 * bukan satu panggilan per siswa.
 */
class ResendProvider implements EmailProvider {
  private readonly client: Resend | null;
  private readonly from: string | undefined;

  constructor(apiKey = process.env.RESEND_API_KEY, from = process.env.EMAIL_FROM) {
    this.client = apiKey?.trim() ? new Resend(apiKey.trim()) : null;
    this.from = from?.trim() || undefined;
  }

  async sendBatch(messages: OutgoingEmail[], idempotencyKey?: string): Promise<SendOutcome[]> {
    if (messages.length === 0) return [];

    if (!this.client || !this.from) {
      const reason = this.client
        ? "EMAIL_FROM belum dikonfigurasi"
        : "RESEND_API_KEY belum dikonfigurasi";
      console.error("[email] Pengiriman dilewati:", reason);
      return messages.map((m) => ({ to: m.to, ok: false, error: reason }));
    }

    const outcomes: SendOutcome[] = [];

    for (let i = 0; i < messages.length; i += RESEND_BATCH_LIMIT) {
      const chunk = messages.slice(i, i + RESEND_BATCH_LIMIT);
      try {
        const { data, error } = await this.client.batch.send(
          chunk.map((m) => ({
            from: this.from as string,
            to: m.to,
            subject: m.subject,
            html: m.html,
            text: m.text,
          })),
          idempotencyKey ? { idempotencyKey: `${idempotencyKey}:${i}` } : undefined,
        );

        if (error) {
          // Error provider tidak pernah diteruskan mentah ke klien: `message`
          // bisa memuat detail akun. Yang tampil ke admin cukup kode status.
          console.error(
            `[email] Resend menolak batch (${error.name ?? "unknown"}): ${error.message}`,
          );
          outcomes.push(
            ...chunk.map((m) => ({
              to: m.to,
              ok: false,
              error: `Provider menolak (${error.statusCode ?? "tidak diketahui"})`,
            })),
          );
          continue;
        }

        // Batch yang diterima = terkirim. Kegagalan per-email ( bounce, alamat
        // ditolak) muncul belakangan lewat event/webhook Resend, bukan di respons.
        outcomes.push(...chunk.map((m) => ({ to: m.to, ok: true })));
        void data;
      } catch (err) {
        console.error("[email] Gagal menghubungi Resend:", err);
        outcomes.push(
          ...chunk.map((m) => ({ to: m.to, ok: false, error: "Gagal menghubungi provider" })),
        );
      }
    }

    return outcomes;
  }
}

let provider: EmailProvider | null = null;

function getProvider(): EmailProvider {
  if (!provider) provider = new ResendProvider();
  return provider;
}

/**
 * Kirim pengingat ke daftar penerima.
 *
 * Tidak pernah melempar error: hasilnya selalu angka, bukan exception. Pemanggil
 * tetap bisa membuat notifikasi web meski provider mati.
 */
export async function sendReminderEmails({
  recipients,
  title,
  message,
  idempotencyKey,
}: SendReminderEmailOptions): Promise<SendEmailResult> {
  const result: SendEmailResult = { sent: 0, failed: 0, skipped: 0, errors: [], failures: [] };
  const deliverable: { recipient: EmailRecipient; email: OutgoingEmail }[] = [];

  for (const r of recipients) {
    const address = (r.email ?? "").trim();
    if (!address) {
      result.skipped++;
      continue;
    }
    if (!isValidEmail(address)) {
      result.skipped++;
      result.errors.push(`Email tidak valid untuk ${r.name}`);
      continue;
    }
    deliverable.push({
      recipient: r,
      email: {
        to: address,
        subject: title,
        html: buildReminderEmailHtml(r.name, title, message),
        text: buildReminderEmailText(r.name, title, message),
      },
    });
  }

  if (deliverable.length === 0) return result;

  const outcomes = await getProvider().sendBatch(
    deliverable.map((d) => d.email),
    idempotencyKey,
  );

  outcomes.forEach((outcome, index) => {
    const { recipient, email } = deliverable[index];
    if (outcome.ok) {
      result.sent++;
    } else {
      result.failed++;
      result.errors.push(`Gagal terkirim ke ${recipient.name} (${outcome.error ?? "tidak diketahui"})`);
      result.failures.push({ to: email.to, name: recipient.name, reason: outcome.error ?? "tidak diketahui" });
    }
  });

  return result;
}
