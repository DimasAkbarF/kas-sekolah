
# Product Requirements Document (PRD)
**Proyek:** Automasi Notifikasi & Sinkronisasi Kas Kelas 03TPLP006
**Komponen Utama:** Next.js Backend (Webhook), Google Apps Script (GAS), Google Sheets, MailApp
**Target Pengguna:** Mahasiswa Kelas 03TPLP006 (Koordinator: Dimas, Timothy, Elisabeth)

---

## 1. Aturan Wajib Eksekusi AI (Strict AI Behavior Rules)
**DILARANG MENULIS ATAU MENGUBAH KODE SEBELUM MELAKUKAN ANALISIS BERIKUT:**
1. **Pindai Root Direktori:** Temukan direktori utama API (apakah menggunakan `app/api/` untuk App Router atau `pages/api/` untuk Pages Router).
2. **Pindai Webhook Eksisting:** Cari *file* yang menangani respon *callback/webhook* dari *Payment Gateway* saat ini.
3. **Pindai Skema Database:** Analisis skema ORM (misal: `schema.prisma` atau model Mongoose) untuk memahami bagaimana entitas transaksi dan status pembayaran disimpan.
4. **Validasi Konteks:** Laporkan kepada *developer* daftar *file* yang akan dimodifikasi dan minta persetujuan (Y/N) sebelum melakukan implementasi penambahan fungsi *fetch* ke URL GAS.

---

## 2. Latar Belakang & Objektif Sistem
Sistem web kas kelas saat ini sudah memiliki fungsionalitas CRUD dan terintegrasi dengan *Payment Gateway*. Objektif pembaruan ini adalah mengimplementasikan sistem *shadow-database* berbasis *cloud* tanpa membebani *server* utama. Saat *payment gateway* mengonfirmasi pembayaran lunas, web akan memerintahkan Google Apps Script untuk:
1. Menandai lunas pada baris Google Sheets secara *real-time* (sebagai *dashboard* transparan bagi koordinator dan anggota kelas).
2. Mengirimkan e-Kuitansi profesional ke email pembayar.

---

## 3. Spesifikasi Arsitektur Webhook Next.js ke GAS

### 3.1. Skenario Pemanggilan (Trigger)
- Eksekusi *fetch* ke URL Web App GAS HANYA dilakukan jika validasi *signature key* dari *Payment Gateway* berhasil DAN status transaksi adalah `settlement` atau `capture`.
- Pemanggilan ke GAS harus bersifat *Asynchronous Non-Blocking*. Jangan membuat respon *webhook* ke *Payment Gateway* menunggu proses GAS selesai (mencegah isu *timeout*).

### 3.2. Struktur Payload (JSON Request)
Buat fungsi utilitas di Next.js untuk mengirim POST *request* dengan tipe konten `application/json`.
```json
{
  "transaction_id": "string (opsional, unik)",
  "nama_mahasiswa": "string (huruf kapital di awal kata)",
  "email": "string (format email valid)",
  "nominal": "number (integer, tanpa desimal/titik)",
  "tanggal_bayar": "string (format ISO 8601)",
  "bulan_tagihan": "string (contoh: 'September 2026')"
}

4. Spesifikasi Google Apps Script (GAS) Code.gs
4.1. Fungsi Penerima (doPost)
 * Buat fungsi doPost(e) untuk menangkap payload JSON.
 * Implementasikan try...catch block. Kembalikan HTTP 200 JSON {"status": "success"} jika berhasil, dan {"status": "error", "message": "..."} jika gagal.
4.2. Logika Pembaruan Google Sheets
 * Konfigurasi: Gunakan SpreadsheetApp.openById("ID_DOKUMEN_SHEETS").
 * Struktur Kolom Harapan:
   * [A] Nama Mahasiswa
   * [B] Email
   * [C] Status Pembayaran (Default: "Belum Bayar")
   * [D] Tanggal Bayar Terakhir
   * [E] Bulan Tagihan
 * Algoritma Pencarian:
   * Ambil semua data (getDataRange().getValues()).
   * Lakukan looping untuk mencocokkan parameter nama_mahasiswa (inklusif case-insensitive jika memungkinkan).
   * Jika ditemukan: Update nilai di kolom C (Sudah Bayar), kolom D (Tanggal), dan kolom E (Bulan).
   * Jika tidak ditemukan: Gunakan appendRow() untuk membuat data anggota baru di baris terbawah.
4.3. Logika Pengiriman Notifikasi (MailApp)
 * Gunakan MailApp.sendEmail().
 * Subjek: Bukti Pembayaran Kas Kelas 03TPLP006 - LUNAS.
 * Body HTML (Opsional tapi disarankan): Buat template pesan HTML responsif sederhana yang menampilkan rincian: Nama, Nominal, Bulan Tagihan, dan ucapan terima kasih dari tim koordinator.
5. Penanganan Edge Cases (Skenario Kegagalan)
 * GAS Timeout: Jika GAS butuh lebih dari 5 detik untuk merespon, Next.js harus tetap mengirim 200 OK ke Payment Gateway agar tagihan tidak ditandai gagal oleh sistem gateway. Letakkan proses fetch GAS di dalam blok try/catch mandiri tanpa menggunakan await yang memblokir return utama webhook.
 * Duplikasi Data: Jika payment gateway mengirim webhook ganda untuk transaksi yang sama, GAS harus memastikan baris hanya diperbarui, bukan diduplikasi (teratasi oleh algoritma pencarian nama/ID di poin 4.2).
6. Kriteria Penerimaan Akhir (Definition of Done)
 * [ ] AI telah membuat dan menambahkan blok kode fetch POST ke GAS di dalam handler webhook payment eksisting.
 * [ ] AI telah men- generate kode Code.gs yang siap disalin secara utuh.
 * [ ] Kode web lokal berhasil dikompilasi tanpa error linting atau type mismatch (khususnya jika menggunakan TypeScript).


