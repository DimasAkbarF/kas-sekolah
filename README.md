# Kas Sekolah

Aplikasi administrasi kas dan SPP sekolah. Bendahara mencatat tagihan, siswa
melihat tagihannya dan membayar lewat DOKU, lalu status pembayaran dan kwitansi
terbarui otomatis.

Next.js 16 App Router · React 19 · Tailwind v4 · PostgreSQL

## Isi repo

| Path | Isi |
|---|---|
| `src/app` | Halaman + route handler API |
| `src/services` | Query sisi server, dipanggil dari route handler |
| `src/db/schema.ts` | `SCHEMA_SQL`, sumber kebenaran skema |
| `src/lib` | Auth, session, perhitungan, format, sinkronisasi klien |
| `src/mock` | Store array sisi klien, diisi `src/lib/sync.ts` saat hidrasi |
| `src/scripts` | Migrasi, seed, dan check yang bisa dijalankan |
| `Code.gs` | Google Apps Script: sinkronkan Sheets + kirim email bukti bayar |

## Menjalankan

```bash
npm install
cp .env.example .env.local   # opsional, lihat di bawah
npm run dev
```

`DATABASE_URL` kosongkan dan aplikasi langsung jalan memakai PGlite lokal
(Postgres WASM) di `.data/pglite/`. Skema otomatis dibuat saat koneksi
pertama dibuka, jadi tidak perlu setup apa pun untuk mencoba.

Isi `DATABASE_URL` (Neon atau Postgres mana pun) untuk memakai database
server, lalu jalankan:

```bash
npm run db:migrate   # terapkan SCHEMA_SQL ke DATABASE_URL
npm run db:seed      # akun + data contoh, idempotent
```

Seed memasukkan password default (`admin123` dan sejenisnya), jadi **dilarang**
jalankan di production.

## Perintah

| Perintah | Guna |
|---|---|
| `npm run dev` | Server pengembangan |
| `npm run build` | Build produksi |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Typecheck |
| `npm run db:migrate` | Terapkan skema ke `DATABASE_URL` |
| `npm run db:seed` | Data contoh (idempotent) |

Tidak ada test suite dan tidak ada CI. Perhitungan uang dan jalur keamanan
punya gantinya: check yang bisa dijalankan sendiri lewat `npx tsx`:

| Check | Yang dijaga |
|---|---|
| `src/scripts/verify-security-scoping.ts` | Isolasi role siswa di `/api/bills`, scoping class di mutasi transaksi |
| `src/scripts/check-maintenance-sync.ts` | Kelas maintenance tidak memicu pemuatan data |
| `src/scripts/check-class-breakdown.ts` | `calculateClassBreakdown` |
| `src/scripts/check-breakdown-api.ts` | Jalur data breakdown ujung ke ujung |
| `src/scripts/verify-origin-gate.ts` | `guard()` memblokir role yang salah |
| `src/scripts/terbilang-check.ts` | `terbilang()` |
| `src/scripts/check-switch.tsx` | API komponen `switch` |
| `src/scripts/backfill-class.ts` | Backfill `class_id` untuk mode multi-kelas |

## Login

Halaman login terpisah per peran: `/login/admin` (Super Admin, Admin Kelas,
Bendahara) dan `/login/student` (Siswa). Staff masuk dengan email, siswa dengan
NISN atau email. Akun hasil `npm run db:seed`:

| Peran | Identifier | Password |
|---|---|---|
| Super Admin | `admin@school.test` | `admin123` |
| Super Admin | `rizki@sma-n1.sch.id` | `rizki123` |
| Bendahara | `siti@sma-n1.sch.id` | `siti123` |
| Siswa | `0065678901` (NISN) atau `ahmad.suryadi@gmail.com` | `siswa123` |

Peran: `super_admin` (seluruh sekolah), `class_admin` (ter-scope satu kelas),
`treasurer`, `student`. Route `/principal/*` hanya alias lama untuk
`super_admin`, bukan peran tersendiri.

## Konfigurasi

Semua ada di `.env.example`. Credential DOKU **tidak** dibaca dari env sebagai
nilai utama: default-nya ada di tabel `gateway_settings`, env hanya fallback
saat tabel kosong.

| Env | Guna |
|---|---|
| `DATABASE_URL` | Koneksi Postgres. Kosong = PGlite lokal |
| `NEXT_PUBLIC_SITE_URL` | Dipakai metadataBase, Open Graph, sitemap, robots |
| `BASE_URL` | `notification_url` yang didaftarkan ke DOKU |
| `DOKU_CLIENT_ID` / `DOKU_SECRET_KEY` / `DOKU_ENV` | Fallback kredensial DOKU |
| `RESEND_API_KEY` / `EMAIL_FROM` | Email pengingat tagihan |
| `GAS_WEB_APP_URL` | Webhook Google Apps Script, kosongkan untuk mematikan integrasi |

## Arsitektur singkat

**Skema = kode.** Tidak ada file migration. `SCHEMA_SQL` di `src/db/schema.ts`
idempotent (`CREATE TABLE IF NOT EXISTS`). Mengubah skema berarti mengubah
`SCHEMA_SQL` lalu menjalankan `npm run db:migrate`.

**Uang integer rupiah** di semua tabel, bukan float.

**Route handler wajib `guard()`.** `src/proxy.ts` (pengganti `middleware.ts`
di Next 16) hanya memeriksa keberadaan cookie di edge. Otoritas role ada di
`src/lib/api.ts`:

```ts
const auth = await guard(["super_admin", "class_admin"]);
if (!auth.ok) return unauthorized(auth);
```

`guard()` mengembalikan 401 tanpa sesi, 403 untuk role atau kelas yang salah,
dan 503 dengan `reason: "maintenance"` selama kelas dirawat. Semua route
handler memanggilnya, jadi tidak ada jalan melewati lapisan ini.

**`src/mock/*` bukan data palsu.** Array di sana adalah store sisi klien;
`src/lib/sync.ts` mengisinya dari API sesuai peran pengguna saat hidrasi.
Halaman yang membacanya langsung dari sana. Menghapus salah satu sisi membuat
halaman kosong.

**Mode rawat per kelas.** `classes.maintenance` dijalankan manual Super Admin
sebelum update. Saat aktif, semua route API membalas 503 dan halaman admin serta
siswa diganti layar rawat. Layout bendahara hanya punya role guard, tanpa
pemeriksaan rawat, jadi API-nya tetap 503 dan halamannya kosong, bukan layar
rawat. `/api/auth/me` sengaja tidak diblokir supaya pemulihan dan deteksi sesi
tetap jalan. Berbeda dari `classes.is_active=false`, yang menutup kelas secara
permanen dan menolak login dengan 403.

**DOKU.** `create` membuat transaksi PENDING dengan `payment_method='qris'`
sebagai placeholder; kanal sebenarnya ditulis ulang saat notifikasi masuk.
Channel e-wallet non-aktif di merchant ini sehingga tidak muncul di halaman
checkout, itu konfigurasi portal DOKU, bukan kode.

## Dokumentasi lain

| Berkas | Isi |
|---|---|
| `AGENTS.md` | Acuan kerja untuk coding agent: aturan auth, maintenance, DOKU |
| `DESIGN.md` | Arah visual, token warna, tipografi, komponen |