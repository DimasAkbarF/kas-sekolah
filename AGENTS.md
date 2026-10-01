<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Kas Sekolah

SPP/tagihan sekolah: Next.js 16 App Router, React 19, Tailwind v4, zod, postgres.js + PGlite. Bahasa UI/komentar: **Indonesia**.

## Commands

- `npm run dev` — dev server
- `npm run lint` — eslint (tanpa argumen)
- `npx tsc --noEmit` — typecheck (tidak ada script npm untuk ini)
- `npm run db:migrate` — apply `SCHEMA_SQL` ke `DATABASE_URL`
- `npm run db:seed` — seed idempotent (ON CONFLICT DO NOTHING)
- Tidak ada test suite, tidak ada CI.

## Database: dual-mode kunci

`src/lib/db.ts:getDb()` memilih koneksi per proses:

- `DATABASE_URL` ter-set (`.env.local` saat ini) → postgres.js query ke Neoni/remote. **Semua query pakai `sql.unsafe`, jangan pakai parameter `$1` dengan driver yang salah — postgres.js ekuivalen** (`db.query` bungkus).
- Kosong → PGlite lokal WASM di `.data/pglite/`, schema di-apply otomatis saat koneksi dibuka.

Tidak ada file migration. **Schema = code** di `src/db/schema.ts` (`SCHEMA_SQL`), idempotent `CREATE TABLE IF NOT EXISTS`. Ubah schema → ubah `SCHEMA_SQL` → jalankan `db:migrate` ke DB target.

`tsx src/scripts/*.ts` (node) **tidak load `.env.local` otomatis** — panggil `loadEnvFile()` dari `src/scripts/env.ts`.

## Arsitektur

- **Maintenance per kelas** (flag `classes.maintenance`, dinyalakan manual Super
  Admin di Kelola Kelas, biasanya sebelum update). Tidak ada trigger otomatis.
  - Sumber kebenaran: `getSessionUser()` menyertakan `classMaintenance` dari
    `LEFT JOIN classes` yang sudah ada — nol query tambahan. `Super Admin` dan
    bendahara punya `class_id NULL` jadi otomatis `false` tanpa cek role.
  - Empat lapis, jangan dihapus salah satu: (1) `guard()` di `src/lib/api.ts`
    membalas **503** + `reason: "maintenance"` untuk semua route (tidak bisa
    dilewati, karena semua route manggil `guard()`), (2)
    `requireClassNotInMaintenance()` di `src/lib/maintenance.ts` dipanggil dari
    `admin/layout.tsx` + `student/layout.tsx` untuk hard refresh/URL langsung,
    (3) `RoleGuard` (client) untuk navigasi antar halaman karena layout tidak
    re-run saat navigasi klien, (4) `MaintenanceWatcher` di
    `src/app/maintenance/` poll `/api/auth/me` tiap 15 detik lalu masuk sendiri.
  - `/api/auth/me` SENGAJA tidak ikut diblokir — itu yang membuat pemulihan
    otomatis dan deteksi sesi bisa jalan.
  - `is_active=false` ≠ `maintenance=true`: yang pertama kelas ditutup permanen
    (login ditolak 403), yang kedua jeda sementara (login boleh, lalu kena
    halaman maintenance). Jangan gabungkan keduanya.
  - Mengubah `classes` butuh `npm run db:migrate`; tanpa itu `getSessionUser()`
    error dan SELURUH app 500, bukan cuma fitur ini.
- Auth: session cookie `ks_session` (30 hari) disimpan hashed di tabel `sessions`. `src/proxy.ts` (Next 16 mengganti `middleware.ts`) hanya cek keberadaan cookie di edge; **akses role diverifikasi server-side lewat `guard()` di `src/lib/api.ts`** — route handler baru wajib `guard([...roles])`.
- Roles: `super_admin`, `class_admin`, `treasurer`, `student` (`src/types/index.ts`).
  `super_admin` = seluruh sekolah, `class_admin` = ter-scope satu kelas. Route `/principal/*`
  hanya alias lama: `RoleGuard allowedRoles="super_admin"`, bukan role tersendiri.
  Seed login: `admin@school.test/admin123`, `siti@sma-n1.sch.id/siti123`,
  `rizki@sma-n1.sch.id/rizki123`, siswa `ahmad.suryadi@gmail.com/siswa123`.
- Uang: **INTEGER rupiah** di semua tabel (bukan float).
- Service layer di `src/services/*.ts` untuk query server. Di sisi klien, `src/mock/*`
  bukan fixture buang: `src/lib/sync.ts` mengisi array-array itu dari API saat
  hidrasi, jadi halaman lama membaca store yang sama. Hapus salah satu sisi dan
  halaman相应 akan kosong.

## UI/UX (interaktif, jangan polos)

Otoritas visual: `DESIGN.md` (Clean Modern FinTech, ENERGY 2, MOTION 1). Halaman tidak boleh cuma kartu/tabel statis; tiap aksi wajib ada feedback dan mikro-interaksi 150-200ms.

- Tombol: state loading (`Loader2 animate-spin` + disabled), hasil sukses/gagal lewat `Alert`/feedback. Jangan `await` tanpa indikator.
- Halaman yang memuat data wajib skeleton/spinner, tidak boleh kosong berkedip.
- Daftar kosong wajib `EmptyState` atau kartu kosong berisi langkah berikutnya.
- Hover/focus mikro: kartu klikable `hover:border-primary/30 hover:shadow-md transition-colors`, baris tabel `hover:bg-muted/30`, tombol ikon bernavigasi `title`+`aria-label`. Bukan animasi bounce/float.
- Nominal pakai `AnimatedMoney` + `tabular-nums`; status pakai `StatusBadge`.
- Konfirmasi destruktif pakai `Dialog` + tombol `destructive`; **dilarang `window.confirm`**.
- Hal yang dihindari: halaman polos, tombol tanpa umpan balik, pesan error mentah (`Gagal menyimpan` tanpa konteks), `placeholder` menyesatkan, animasi berlebihan.

## DOKU payment (gotcha mahal)

- Konfigurasi di tabel `gateway_settings` id=1 (provider/environment/client_id/secret_key/notification_url), bukan env var. Env fallback (`DOKU_CLIENT_ID`, dst) ada tapi jarang dipakai.
- Kredensial saat ini **production**; `environment='production'` di DB → URL `https://api.doku.com`. Jangan ubah ke sandbox kecuali dapat kredensial sandbox asli.
- **Digest di signature: pakai raw base64, TANPA prefix `SHA256=`** — baik di string `signatureBase` maupun header `Digest`. Prefix akan gagal dengan `invalid_signature`.
- Channel e-wallet (DANA/OVO/ShopeePay/GoPay/QRIS) **non-aktif di merchant ini** sehingga **tidak muncul di halaman checkout DOKU** — itu konfigurasi portal DOKU, bukan kode. Kalau dimasukkan ke `payment_method_types` dapat 400 `PAYMENT CHANNEL IS INACTIVE`. Biarkan kosong (semua channel aktif ditampilkan). Jangan menambahkannya. UI jangan menjanjikan QRIS (`payment/page.tsx` kini label "DOKU Payment Gateway / Multi Kanal").
- `create/route.ts` membuat transaksi PENDING dengan `payment_method='qris'` sebagai placeholder; **kanal aktual di-overwrite saat notifikasi** — `notification/route.ts` memetakan `channel.id` DOKU (mis. `VIRTUAL_ACCOUNT_DOKU`→`bank_transfer`, `OVO`→`ewallet`, `QRIS`→`qris`) via `mapDokuChannel`.
- Notification: `src/app/api/payment/doku/notification/route.ts` verifikasi signature, klaim PAID (plus kanal aktual), trigger GAS webhook (`GAS_WEB_APP_URL`).

<!-- antislop:start -->
## antislop
Untuk pekerjaan UI, copy, orang, layout mobile, atau komentar kode, baca `DESIGN.md` dulu untuk arah, lalu `antislop.md` (core) dan skill yang relevan:
- UI / visual: `skills/antislop-ui/SKILL.md`
- Copy & text: `skills/antislop-copywriting/SKILL.md`
- Orang: `skills/antislop-human/SKILL.md`
- Mobile / responsif: `skills/antislop-layoutmobile/SKILL.md`
- Komentar kode: `skills/antislop-code/SKILL.md`
Sebelum mulai, tanyakan ke user: antislop dipakai selama proyek atau setelah selesai.
Untuk memperbarui antislop: unduh `antislop.md` lagi, atau `npx antislop-ai --update` bila terpasang sebagai skill folder.
<!-- antislop:end -->
