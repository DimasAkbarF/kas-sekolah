# Kas Sekolah

Aplikasi administrasi kas dan SPP sekolah. Bendahara mencatat tagihan dan
mencatat pemasukan serta pengeluaran, siswa melihat tagihannya dan membayar
lewat DOKU, lalu status pembayaran dan kwitansi diperbarui otomatis saat DOKU
mengirim notifikasi.

Stack: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 ·
PostgreSQL · DOKU Payment Gateway · Resend · Google Apps Script

## Daftar isi

- [Kemampuan](#kemampuan)
- [Prasyarat](#prasyarat)
- [Menjalankan](#menjalankan)
- [Database](#database)
- [Perintah](#perintah)
- [Verifikasi](#verifikasi)
- [Akun development](#akun-development)
- [Konfigurasi](#konfigurasi)
- [Arsitektur](#arsitektur)
- [Keamanan](#keamanan)
- [API](#api)
- [Data model](#data-model)
- [Sebelum deploy](#sebelum-deploy)
- [Masalah yang sering muncul](#masalah-yang-sering-muncul)
- [Struktur repo](#struktur-repo)
- [Dokumentasi lain](#dokumentasi-lain)

## Kemampuan

**Super Admin** (akses seluruh sekolah)

Kelola kelas dan user, data siswa, tagihan, transaksi, pemasukan, pengeluaran,
laporan, metode pembayaran, gateway DOKU, permintaan reset password, pengingat,
notifikasi, profil sekolah, plus layar statistik lintas kelas.

**Admin Kelas** (ter-scope satu kelas)

Kelola data siswa, tagihan, transaksi, pemasukan, pengeluaran, laporan, dan
pengingat untuk kelasnya saja.

**Bendahara**

Catat tagihan, transaksi, pemasukan, pengeluaran, laporan, dan cetak kwitansi.

**Siswa**

Lihat tagihan beserta rinciannya, bayar lewat DOKU, lihat riwayat pembayaran,
dan lihat profil. Halaman profil siswa hanya baca, tidak ada form ubah data.

Kwitansi di `/kwitansi/[id]` hanya untuk staff. Halaman itu memanggil
`isStaffRole` lalu mengarahkan siswa ke login, dan scoping kelasnya sama
dengan `GET /api/transactions/[id]`, jadi Admin Kelas tidak bisa membuka
kwitansi kelas lain.

## Prasyarat

| | |
|---|---|
| Node.js | 20.9 atau lebih baru, syarat Next.js 16 |

Tidak perlu PostgreSQL untuk mencoba. Lihat [Database](#database).

## Menjalankan

```bash
npm install
npm run dev
```

Buka http://localhost:3000. Skema tabel dibuat sendiri saat koneksi database
pertama dibuka, jadi tidak ada langkah migrate untuk memulai.

## Database

Aplikasi memilih koneksi database per proses lewat `getDb()` di
`src/lib/db.ts`, dengan dua mode:

**Lokal, tanpa setup.** Kalau `DATABASE_URL` kosong, aplikasi memakai PGlite,
yaitu PostgreSQL versi WASM, dan menyimpan data di `.data/pglite/`. Skema
dijalankan otomatis saat koneksi dibuka.

**Server.** Isi `DATABASE_URL` dengan connection string PostgreSQL, lalu
jalankan migrate sekali:

```bash
npm run db:migrate   # terapkan SCHEMA_SQL ke DATABASE_URL
npm run db:seed      # akun dan data contoh
```

`db:seed` idempotent (semua insert memakai `ON CONFLICT DO NOTHING`) dan
menolak berjalan di production karena password default ikut ter-commit. Buat
akun staff lewat UI dan rotasi semua password default setelah migrate.

Skema adalah kode, bukan file migration. Sumber kebenaran ada di
`SCHEMA_SQL` (`src/db/schema.ts`) dan ditulis idempotent, memakai
`CREATE TABLE IF NOT EXISTS` untuk tabel dan
`ALTER TABLE ... ADD COLUMN IF NOT EXISTS` untuk kolom baru. Artinya
menambah kolom cukup dengan menambah satu baris `ALTER TABLE`, lalu
`db:migrate` lagi. Tidak ada nomor versi migration yang harus dipantau.

## Perintah

| Perintah | Guna |
|---|---|
| `npm run dev` | Server pengembangan |
| `npm run build` | Build produksi |
| `npm start` | Menjalankan hasil build |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Typecheck. Tidak ada npm script untuk ini |
| `npm run db:migrate` | Terapkan skema ke `DATABASE_URL` |
| `npm run db:seed` | Akun dan data contoh |

## Verifikasi

Tidak ada test suite dan tidak ada CI. Sebagai gantinya, logika yang berisiko
rugi besar (perhitungan uang, isolasi role, jalur signature) punya check yang
dijalankan sendiri lewat `npx tsx`. Semua check keluar dengan `assert`, jadi
exit code bukan nol berarti gagal.

| Check | Yang dijaga |
|---|---|
| `src/scripts/verify-security-scoping.ts` | Isolasi role siswa di `/api/bills`, scoping kelas di mutasi transaksi |
| `src/scripts/check-maintenance-sync.ts` | Kelas yang sedang rawat tidak memicu pemuatan data |
| `src/scripts/verify-origin-gate.ts` | Penolakan Origin dan Izin role di `guard()` |
| `src/scripts/check-class-breakdown.ts` | Perhitungan `calculateClassBreakdown` |
| `src/scripts/check-breakdown-api.ts` | Jalur data breakdown dari API sampai ke perhitungan |
| `src/scripts/terbilang-check.ts` | `terbilang()` untuk nominal rupiah |
| `src/scripts/check-switch.tsx` | API komponen `switch` yang dipakai |
| `src/scripts/backfill-class.ts` | Backfill `class_id` untuk mode multi-kelas, idempotent |

Contoh menjalankan semuanya:

```bash
for f in src/scripts/check-*.ts* src/scripts/verify-*.ts*; do
  echo "== $f" && npx tsx "$f" || break
done
```

## Akun development

Hasil `npm run db:seed`. Halaman login terpisah per peran: `/login/admin` untuk
staff dan `/login/student` untuk siswa. Staff masuk memakai email, siswa memakai
NISN atau email.

| Peran | Identifier | Password |
|---|---|---|
| Super Admin | `admin@school.test` | `admin123` |
| Super Admin | `rizki@sma-n1.sch.id` | `rizki123` |
| Bendahara | `siti@sma-n1.sch.id` | `siti123` |
| Siswa | `0065678901` (NISN) atau `ahmad.suryadi@gmail.com` | `siswa123` |

## Konfigurasi

Semua variabel ada di `.env.example`. Credential DOKU dibaca dari tabel
`gateway_settings`, bukan env. Env hanya dipakai sebagai fallback saat tabel
kosong.

| Variabel | Guna |
|---|---|
| `DATABASE_URL` | Connection string PostgreSQL. Kosong berarti PGlite lokal |
| `NEXT_PUBLIC_SITE_URL` | Dipakai metadataBase, Open Graph, sitemap, dan robots. Wajib diisi di produksi |
| `BASE_URL` | `notification_url` yang didaftarkan ke DOKU |
| `DOKU_CLIENT_ID` | Fallback client id DOKU |
| `DOKU_SECRET_KEY` | Fallback secret key DOKU |
| `DOKU_ENV` | `sandbox` atau `production`. Nilai di tabel menang |
| `RESEND_API_KEY` | Kunci API Resend untuk email pengingat |
| `EMAIL_FROM` | Sender berformat `Kas Sekolah <nama@domain-verifikasi>` |
| `GAS_WEB_APP_URL` | URL deploy Google Apps Script. Kosongkan untuk mematikan integrasi Sheets |

Tanpa `RESEND_API_KEY` permintaan pengingat tetap membuat notifikasi web, tetapi
setiap pengiriman email dilaporkan gagal, bukan sukses.

## Arsitektur

### Route handler wajib `guard()`

`src/proxy.ts` adalah pengganti `middleware.ts` di Next 16. Yang ia lakukan
hanya memeriksa keberadaan cookie di edge, karena proxy tidak punya akses
database. Otoritas role ada di server, di `guard()` dalam `src/lib/api.ts`:

```ts
const auth = await guard(["super_admin", "class_admin"]);
if (!auth.ok) return unauthorized(auth);
```

`guard()` mengembalikan 401 tanpa sesi, 403 untuk role atau kelas yang salah,
dan 503 dengan `reason: "maintenance"` selama kelas dirawat. Semua route
handler memanggilnya, jadi lapisan ini tidak bisa dilewati dari halaman.
`guard()` tanpa daftar role berarti semua pengguna yang sudah login.

### Bentuk request dan response

`withRouteErrors` membungkus handler sehingga tiga hal terjadi di satu tempat:
error yang tidak tertangkap menjadi JSON 500, pelanggaran unique dari database
menjadi 409, dan request dari Origin atau Referer yang tidak cocok ditolak 403.
`parseBody` memvalidasi body dengan zod dan membalas 400 sambil menyebut field
mana yang gagal. Webhook DOKU dikecualikan dari cek Origin karena datang dari
server, bukan browser.

### Skoping data

Super Admin dan bendahara melihat seluruh sekolah. Admin kelas dan siswa
dibatasi ke `class_id` miliknya, dan batas itu ditegakkan di query lewat
`applyScope`, bukan hanya disembunyikan di UI. Untuk siswa, `applyScope` juga
membatasi ke baris miliknya sendiri.

### `src/mock` adalah store, bukan data palsu

Array di `src/mock/` adalah tempat penyimpanan sisi klien. `src/lib/sync.ts`
mengisinya dari API sesuai role pengguna saat hidrasi, jadi halaman lama yang
membaca array itu ikut memakai data asli. Menghapus salah satu sisi membuat
halaman kosong, jadi keduanya harus utuh.

### Mode rawat per kelas

`classes.maintenance` dinyalakan manual Super Admin di halaman Kelola Kelas,
biasanya sebelum update yang mengubah skema. Saat aktif, semua route API
membalas 503 dan halaman admin serta siswa diganti layar rawat.

Pola ini punya empat lapis dan keempatnya perlu bertahan:

1. `guard()` membalas 503 untuk semua route.
2. `requireClassNotInMaintenance()` dipanggil dari `admin/layout.tsx` dan
   `student/layout.tsx` untuk menutup URL langsung dan hard refresh.
3. `RoleGuard` di sisi klien menutup navigasi antar halaman, karena layout tidak
   dijalankan ulang saat navigasi klien.
4. `MaintenanceRecovery` di `src/app/maintenance/maintenance-recovery.tsx`
   melakukan polling `/api/auth/me` tiap 15 detik lalu mengarahkan pengguna
   ke layar rawat sendiri.

`/api/auth/me` sengaja tidak ikut diblokir, justru itu yang membuat pemulihan
otomatis dan deteksi sesi tetap berjalan.

`classes.is_active=false` berbeda dan tidak boleh disamakan dengan maintenance.
`is_active=false` menutup kelas secara permanen dan menolak login dengan 403.
Maintenance hanya menjeda sementara: login tetap boleh, lalu pengguna
mendarat di layar rawat.

Layout bendahara (`src/app/treasurer/layout.tsx`) hanya punya role guard tanpa
pemeriksaan rawat. API-nya tetap membalas 503, jadi halaman bendahara kosong
selama rawat, bukan menampilkan layar rawat. Kalau ini perlu disamakan,
tambahkan satu baris pemanggilan yang sama dengan `admin/layout.tsx`.

### Integrasi DOKU

`/api/payment/doku/create` membuat transaksi dengan status PENDING dan
`payment_method='qris'` sebagai placeholder. Kanal yang sebenarnya ditulis
ulang saat notifikasi masuk, dipetakan dari `channel.id` DOKU, misalnya
`VIRTUAL_ACCOUNT_DOKU` jadi `bank_transfer` dan `OVO` jadi `ewallet`.

Channel e-wallet (DANA, OVO, ShopeePay, GoPay, QRIS) tidak aktif di merchant ini
sehingga tidak muncul di halaman checkout DOKU. Itu konfigurasi portal DOKU,
bukan kode, dan menambahkan channel tersebut lewat `payment_method_types`
memberi respons 400 `PAYMENT CHANNEL IS INACTIVE`.

`Code.gs` di root repo adalah sisi penerima Google Apps Script. Setelah DOKU
memberi tahu pembayaran berhasil, route notifikasi memanggil script itu lewat
`GAS_WEB_APP_URL` untuk menyinkronkan Google Sheets dan mengirim email bukti
bayar ke siswa.

## Keamanan

| Lapisan | Cara kerja |
|---|---|
| Password | Hash bcrypt lewat `src/lib/password.ts`, divalidasi ulang memakai `src/lib/password-policy.ts` |
| Sesi | Cookie `ks_session` valid 30 hari, disimpan hashed di tabel `sessions`, `sameSite=lax` |
| Rate limit login | Tiga lapis di `src/app/api/auth/login/route.ts`: 5 percobaan per akun dan IP, 20 per IP lintas akun (menahan password spraying), 10 per akun lintas IP (menahan distributed brute force). Melewati batas membalas 429 |
| Otoritas role | `guard()` di server. Proxy hanya memeriksa keberadaan cookie |
| Otoritas data | `applyScope` membatasi query, bukan sekadar menyembunyikan UI |
| Input | Validasi zod di `parseBody`, menolak dengan 400 dan menyebut field yang gagal |
| Duplikat | Pelanggaran unique di database ditangkap `withRouteErrors` dan dibalas 409, bukan 500 |
| CSRF | Penolakan Origin dan Referer di `withRouteErrors` |
| Webhook DOKU | Verifikasi Digest dan HMAC-SHA256, cek anti-replay timestamp 30 menit, dan string signature disusun persis seperti DOKU |
| Jejak audit | Mutasi tagihan dan transaksi menulis ke tabel `audit_logs` |
| Header | CSP, `X-Content-Type-Options`, `X-Frame-Options`, HSTS, `Permissions-Policy` di `next.config.ts` |

Dua detail DOKU yang mudah salah dan sudah ditangani di kode:

- Digest memakai base64 mentah tanpa prefiks `SHA256=`, baik di header `Digest`
  maupun di string `signatureBase`. Prefiks membuat DOKU menolak dengan
  `invalid_signature`.
- `process.env.DOKU_ENV` hanya dipakai kalau `gateway_settings` kosong. Nilai
  default di database adalah production, jadi jangan diubah ke sandbox tanpa
  kredensial sandbox yang asli.

## API

Semua endpoint di `/api`. Kolom role menuliskan daftar yang diizinkan oleh
`guard()`.

| Endpoint | Method | Role |
|---|---|---|
| `/api/auth/login` | POST | publik |
| `/api/auth/logout` | POST | publik |
| `/api/auth/me` | GET | publik, sengaja tidak diblokir |
| `/api/auth/forgot-password` | POST | publik |
| `/api/notifications` | GET | semua login |
| `/api/notifications/mark-read` | POST | semua login |
| `/api/payment/doku/notification` | POST | webhook DOKU, tanpa token, signature HMAC |
| `/api/bills` | GET, POST | semua role |
| `/api/bills/[id]` | PATCH, DELETE | staff |
| `/api/transactions` | GET, POST | semua role |
| `/api/transactions/[id]` | GET, PATCH, DELETE | staff |
| `/api/transactions/bulk-delete` | POST | admin |
| `/api/students` | GET, POST | semua role |
| `/api/students/[id]` | GET, PATCH | admin |
| `/api/students/[id]/account` | POST | admin |
| `/api/staff` | GET, POST | super admin |
| `/api/staff/[id]` | PATCH | super admin |
| `/api/classes` | GET, POST | super admin |
| `/api/classes/[id]` | PATCH | super admin |
| `/api/incomes` | GET, POST | staff |
| `/api/expenses` | GET, POST | staff |
| `/api/payment-methods` | GET, POST | semua role |
| `/api/payment-methods/[id]` | PATCH, DELETE | super admin |
| `/api/payments` | POST | semua role |
| `/api/payment/doku/create` | POST | semua role |
| `/api/settings` | GET, PATCH | semua role |
| `/api/settings/gateway` | GET, PATCH | super admin |
| `/api/admin/reminders` | GET, POST | admin |
| `/api/admin/reset-requests` | GET | admin |
| `/api/admin/reset-requests/[id]/approve` | POST | admin |
| `/api/admin/reset-requests/[id]/reject` | POST | admin |

## Data model

Uang disimpan sebagai integer rupiah di semua tabel, bukan float.

| Tabel | Isi |
|---|---|
| `classes` | Kelas dengan tahun ajaran, status aktif, dan flag maintenance |
| `users` | Akun staff dan siswa, role, hash password, `class_id` |
| `students` | Data siswa, NIS dan NISN, kontak, arsip |
| `bills` | Tagihan, kategori, nominal, periode, jatuh tempo, target |
| `transactions` | Pembayaran, metode, status, referensi eksternal, bukti bayar |
| `incomes` | Pemasukan di luar tagihan |
| `expenses` | Pengeluaran |
| `school_settings` | Profil sekolah, tahun ajaran, nominal dan jatuh tempo default |
| `gateway_settings` | Kredensial DOKU dan environment, satu baris id 1 |
| `payment_methods` | Metode pembayaran manual per kelas |
| `sessions` | Sesi aktif, token disimpan hashed |
| `login_attempts` | Riwayat percobaan login untuk rate limit |
| `audit_logs` | Jejak perubahan data |
| `password_reset_requests` | Permintaan reset yang menunggu persetujuan admin |
| `reminders` | Pengingat, target, kanal, status |
| `notifications` | Notifikasi per pengguna |

## Sebelum deploy

- Isi `DATABASE_URL` dan `NEXT_PUBLIC_SITE_URL`. Tanpa `NEXT_PUBLIC_SITE_URL`
  semua URL metadata jatuh ke `localhost:3000`.
- Jalankan `npm run db:migrate` terhadap database target.
- Jangan jalankan `npm run db:seed` di production. Buat akun lewat UI, lalu
  rotasi semua password default.
- Verifikasi `gateway_settings` menunjuk ke environment dan `notification_url`
  yang benar, dan pastikan URL itu sama dengan `BASE_URL`.
- Arahkan `notification_url` DOKU ke `https://domain-anda/api/payment/doku/notification`.
- Kalau memakai integrasi Sheets, deploy `Code.gs` sebagai web app Google Apps
  Script dan isi `GAS_WEB_APP_URL`.
- Arahkan kredensial Resend ke domain yang sudah diverifikasi.

## Masalah yang sering muncul

**Seluruh halaman 500 setelah mengubah skema.** `getSessionUser()` query ke
tabel `classes`, jadi kolom yang belum ada di database target bikin semua
request gagal, bukan cuma fitur yang baru berubah. Jalankan `db:migrate`.

**Pengguna lokal tidak bisa masuk.** `DATABASE_URL` kosong berarti aplikasi
pakai PGlite di `.data/pglite/`, dan database itu terpisah dari server. Data
seed di server tidak muncul di lokal. Jalankan `db:seed` untuk database lokal,
atau hapus `.data/pglite` untuk mulai dari nol.

**Pembayaran DOKU ditolak dengan `invalid_signature`.** Digest harus base64
mentah tanpa prefiks `SHA256=`, baik di header `Digest` maupun di string
`signatureBase`. Periksa blok verifikasi signature di
`src/app/api/payment/doku/notification/route.ts`.

**Kanal pembayaran tidak muncul di checkout.** Channel e-wallet non-aktif di
merchant DOKU. Ini pengaturan portal, bukan kode.

**`tsx` tidak membaca `.env.local`.** Node tidak memuat file env seperti
Next.js. Semua script memanggil `loadEnvFile()` dari `src/scripts/env.ts` untuk
menutup itu.

## Struktur repo

| Path | Isi |
|---|---|
| `src/app` | Halaman, layout, dan route handler API |
| `src/services` | Query sisi server yang dipanggil route handler |
| `src/db/schema.ts` | `SCHEMA_SQL`, sumber kebenaran skema |
| `src/lib` | Auth, sesi, perhitungan, format, konfigurasi |
| `src/hooks` | Hook klien untuk auth, data, dan laporan |
| `src/components/ui` | Komponen dasar, shadcn di atas Base UI |
| `src/components` | Komponen per domain |
| `src/mock` | Store array sisi klien, diisi `src/lib/sync.ts` |
| `src/scripts` | Migrasi, seed, dan check yang bisa dijalankan |
| `Code.gs` | Google Apps Script: sinkronkan Sheets dan kirim email bukti bayar |

## Dokumentasi lain

| Berkas | Isi |
|---|---|
| `AGENTS.md` | Aturan kerja untuk coding agent: auth, mode rawat, gotcha DOKU |
| `DESIGN.md` | Arah visual, token warna, tipografi, spacing, komponen |

## Lisensi

Belum ada lisensi. `package.json` menandai proyek ini `private`, jadi belum
ditujukan untuk distribusi. Tambahkan berkas lisensi sebelum repository ini
dibuat publik atau dipakai di luar sekolah.

## Verifikasi sebelum rilis

```bash
npm run lint
npx tsc --noEmit
npm run build
```