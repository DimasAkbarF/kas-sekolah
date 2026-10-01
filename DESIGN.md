# Kas Sekolah — Design Direction

Sistem desain untuk aplikasi kas sekolah (Next.js + Tailwind v4). Dokumen ini adalah
acuan visual: kalau sebuah keputusan visual tidak bisa dijelaskan dari sini, jangan
dibuat. Semua token di bawah benar-benar dipakai di `src/app/globals.css`.

## Identity

Aplikasi administrasi keuangan untuk sekolah. harus dipakai, tenang, dan bisa
dipercaya orang tua saat melihat nominal. Bukan produk consumer yang butuh \"kesonan\",
dan bukan game. Arahnya: **Clean Modern FinTech**.

- Terasa tenang dan tepercaya, bukan ramai
- Angka nominal adalah informasi terpenting, harus mudah dipindai
- Informatif, tidak dekoratif: tidak ada gradien dekoratif, glow, atau animasi loop
- Bahasa UI dan komentar: **Bahasa Indonesia**

Dials: **ENERGY 1 / RHYTHM 1 / MOTION 1**. Satu dial per layar (stat/angka utama),
pola komponen seragam antar halaman admin, dan animasi hanya untuk umpan balik aksi.

## Colors

Dark mode adalah sistem visual tersendiri, bukan "light digelapkan". Aturannya:
permukaan (background/card/secondary/muted/accent/neutral) **netral**, teal hanya
aksen. Kalau sebuah permukaan gelap ikut bernuansa teal, itu bug, bukan gaya.

| Token | Light | Dark | Dipakai untuk |
|---|---|---|---|
| `--background` | `#EFF8F7` | `#0F1413` | Latar halaman |
| `--card` | `#FFFFFF` | `#151C1A` | Permukaan kartu/dialog |
| `--popover` | `#FFFFFF` | `#1D2724` | Dropdown, dialog, tooltip (satu tingkat di atas card) |
| `--foreground` | `#153331` | `#F2F4F3` | Teks utama (16.8:1) |
| `--muted-foreground` | `#4E7370` | `#A7B2AE` | Teks sekunder (8.5:1) |
| `--primary` | `#177A75` | `#3CC4BD` | Aksi utama, link, aktif, chart highlight |
| `--primary-foreground` | `#FFFFFF` | `#0F1413` | Teks di atas primary (8.7:1) |
| `--destructive` | `#C4441F` | `#FF8A6A` | Hapus, error |
| `--success` | `#1B7F4B` | `#4ADE80` | Lunas, terkirim |
| `--border` | `#D4EAE7` | `#26332F` | Pemisah tipis |
| `--input` | `#5E9A96` | `#5A6A65` | Batas input saja (3.04:1, WCAG 1.4.11) |

Chrome di luar komponen juga bertoken, supaya ikut tema: `--chart-grid`,
`--scrollbar-thumb`, `--selection-bg/fg`, `--shadow-card`.

Aturan warna:

- Maksimal 2 warna inti (teal + coral/merah) + 1 aksen (hijau sukses). Abu-abu tidak
  dihitung sebagai warna.
- Dark: tidak ada kartu besar berwarna. Kartu semantic (`success`, `warning`,
  `info`, `coral`, `gold`, `teal`) tetap `bg-card` + `border-border`, dan warna
  hanya pindah ke icon box, label, dan angka. Warna terang tidak pernah jadi
  latar kartu; di dark hanya tinted surface (`*-soft`) untuk chip/baris kecil.
- Dark: featured card tetap focal point lewat hierarki (angka besar, surface
  netral, aksen teal), bukan lewat panel teal solid.
- **Warna hex hanya lewat token Tailwind** (`bg-primary`, `text-muted-foreground`).
  Jangan tulis `text-[#...]` atau `bg-[#...]` untuk warna yang sudah punya token;
  nilai hardcode hanya untuk hal yang benar-benar tidak bertoken (nilai RGB
  shadow, yang sudah lewat `--shadow-card`).
- Semua teks wajib ≥4.5:1 (3:1 untuk ukuran besar). Kalau ragu, ukur dengan
  WCAG formula; mata tidak bisa menilai kontras abu-abu dengan tepat.
- Warna tidak pernah jadi satu-satunya penanda status: selalu disertai teks atau ikon.

## Typography

- **IBM Plex Sans** untuk semua teks (self-hosted via `next/font`), Geist Mono untuk angka/NIS.
- Skala: `h1` `text-xl sm:text-2xl` bold · `h2` `text-lg sm:text-xl` semibold ·
  label `text-xs` · body `text-sm` · angka tabular `tabular-nums`.
- Judul seksi dalam kartu: `text-sm font-medium`. Bukan `text-[10px] uppercase`
  dengan tracking lebar.
- Ukuran minimum 11px, dan 12px untuk label yang hanya dibaca di layar kecil.
- Nomor uang selalu `tabular-nums` supaya kolom sejajar dan mudah dibandingkan.

## Spacing & Radius

- Skala: `1` = 4px, `1.5` = 6px, `2` = 8px, `3` = 12px, `4` = 16px, `6` = 24px, `8` = 32px.
- Padding halaman: `p-4 sm:p-6 lg:p-8`. Jarak antar seksi: `space-y-6`. Jarak dalam
  form: `space-y-4`.
- Radius: input/tombol `rounded-lg` (0.75rem), kartu/dialog/tabel `rounded-xl`,
  chip `rounded-md`. Tidak ada bentuk pil penuh kecuali badge status. Radius ikut
  ukuran dan peran: jangan pakai radius input untuk permukaan sebesar kartu.
- Lebar konten maksimum `max-w-7xl`; tabel boleh `overflow-x-auto`, bukan keluar halaman.

## Border

- **Warna hanya dari token.** Dilarang nama warna mentah Tailwind
  (`border-slate-200`, `bg-indigo-50`, `text-emerald-600`, ...). Kalau butuh
  warna semantik, pakai family tokennya: `--info-*`, `--success-*`, `--warning-*`,
  `--danger-*`, `--neutral-*`. Aturan ini berlaku untuk border, background, dan
  teks, bukan hanya border.
- **Lebar: 1px default, 2px maksimum** dan hanya untuk satu hal: strip status di
  sisi awal (`border-s-2`, sudah logicalproperties, ikut RTL). Jangan pakai 4px.
- **Radius border mengikuti radius permukaannya.** Permukaan `rounded-xl` tidak
  boleh punya isi `rounded-lg` yang terlihat, dan sebaliknya.
- **Tidak ada kartu di dalam kartu.** Kalau sebuah daftar hidup di dalam kartu
  (`CashInfoCard`, daftar kelas/staff), baris di dalamnya **tidak** punya border
  dan **tidak** punya latar sendiri; pemisah tugasnya `divide-y divide-border`.
  Border di dalam dan di luar=on screen yang sama menghasilkan frame di dalam
  frame, dan di light mode kedua permukaannya warna yang sama sehingga yang
  terlihat cuma garisnya.
- **Setiap permukaan menyebut warnanya.** Tulis `border-border`, jangan andalkan
  aturan global `* { @apply border-border }` — kalau tidak, urutan kelas bisa
  membuat border-colored diam-diam menang.
- Permukaan tabel punya satu definisi (`tableSurface` di
  `src/components/layout/data-table.tsx`). Halaman yang isi header-nya berbeda
  tetap memakai definisi yang sama, bukan menggulirkan class sendiri.

## Elevation

- Hampir datar. Kartu utama `shadow-xs`, kartu elevated `shadow-card`
  (nilai lewat `--shadow-card`, bukan hex di utility).
- Dark: `--shadow-card` bernilai `none` dan utilitas `shadow-teal/gold/coral-sm`
  dimatikan. Di latar hampir-hitam, elevasi datang dari perbedaan surface
  (`background` → `card` → `popover`) dan border tipis, bukan bayangan hitam.
  Shadow di dark hanya boleh untuk elemen melayang: dropdown, dialog, popover,
  tooltip.

## Components

- **Tombol**: `h-9` (default), `h-8` (sm), `h-10` (lg). Target sentuh minimal
  `h-10` di layar sentuh. `active:scale-[0.98]`. Semua tombol punya
  `focus-visible:ring`.
- **Input**: `h-9`, selalu punya `<label htmlFor>` atau `aria-label`. Error
  ditampilkan lewat `Alert` di bawah form, bukan hanya border merah.
- **Kartu**: `rounded-xl border bg-card`, tanpa gradien. Kartu statistik memakai
  `StatSummary` (label kecil + angka besar), bukan empat kartu identik tanpa
  hierarki.
- **Tabel**: `<table>` di dalam `tableSurface`, `<th>` dengan `scope="col"`.
  Di mobile, tabel lebar (6 kolom atau lebih) harus punya versi daftar kartu, seperti
  pola di `recent-transactions-section.tsx`.
- **Badge**: hanya untuk status nyata (Lunas/Menunggu/Gagal/Aktif). Capsule dekoratif,
  titik berwarna, dan glow untuk gaya bukan gaya yang dipakai. Chip penghitung
  ("12 Transaksi") bukan status: pakainya netral (`neutral-*`) di semua halaman,
  bukan warna berbeda per halaman.
- **Dialog**: selalu punya title + description, footer dengan tombol, dan
  `max-h` + scroll agar tidak terpotong di layar pendek.
- **Feedback**: `Alert` (otomatis `role="alert"`) untuk hasil aksi, `role="status"`
  untuk informasi yang muncul setelah aksi. Setiap `await` punya indikator
  (spinner + `disabled`), tidak pernah `await` diam-diam.
- **Ikon**: Lucide. Dipilih karena stem-nya satu-dua piksel dan tidak berebut
  perhatian dari nominal, serta karena cakupan glyph-nya lengkap untuk
  administrasi (kwitansi, bank, kelas, arsip) tanpa perlu ikon buatan sendiri.
  Yang membuat set ini milik produk, bukan default, adalah tiga keputusan ini:
  - **Ketebalan `1.75`, bukan default `2`** (satu aturan di `globals.css` lewat
    `svg.lucide`). Pada 16px default 2 berarti 12.5% lebar stem; pada 14px jadi
    14.3% dan ikon menggumpal di badge 11px. 1.75 menjaga rasionya di 12.5%
    untuk tier 14/16px dan terbaca di layar terang maupun gelap.
  - **Hanya tiga ukuran**: `h-3.5` (di dalam badge 11px), `h-4` (di dalam teks,
    tombol, nav), `h-5` (PageHeader). Tier `h-3` dihapus karena tidak terbaca;
    `h-4.5` dihapus karena hanya dipakai satu kali dan tidak proporsional.
  - **Satu konsep satu glyph.** Lucide punya glyph kembar (`Clock`/`Clock4`,
    `CheckCircle2`/`CircleCheckBig`) yang tampil nyaris identik. Pakai yang
    namanya paling umum; jangan campur dua nama untuk satu makna.
- Ikon selalu _xy_ label teks atau `aria-label`; tombol ikon wajib punya nama
  aksesibel. Ikon tanpa padanan yang relevan lebih baik tidak dipakai.
- **Dilarang** ikon generik AI (Sparkle, Star, Magic, Zap, Diamond, Cube,
  Robot, Orb): glyph itu tidak mengatakan apa pun tentang isi layar.

## Motion

- 150–200ms untuk hover/focus, `ease-out`.
- Animasi hanya: spinner saat memproses, skeleton saat memuat, angka ber animasi
  (sudah hormati reduced motion), feedback masuk/keluar.
- Dilarang: loop tak berakhir (pulse, bounce, float), dekoratif, atau >300ms.
- Semua animasi hormati `prefers-reduced-motion` (lihat blok global di globals.css).

## Do's and Don'ts

1. Do pakai token warna, jangan hex hardcode.
2. Do tampilkan angka rupiah dengan `tabular-nums` dan presisi yang jelas.
3. Do beri umpan balik untuk setiap aksi: loading, sukses, dan error.
4. Do sediakan empty state yang menjelaskan penyebab dan langkah berikutnya.
5. Do konfirmasi tindakan destruktif dengan `Dialog` + tombol `destructive`. Jangan `window.confirm`.
6. Don't menambah statistik, testimoni, atau klaim yang tidak punya sumber nyata.
7. Don't memakai warna/ikon/badge dekoratif yang tidak membawa informasi.
8. Don't membuat halaman tanpa loading, empty, dan error state.
9. Don't menaikkan kompleksitas tanpa alasan yang bisa ditulis satu kalimat.
