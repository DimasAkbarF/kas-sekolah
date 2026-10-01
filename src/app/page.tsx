import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { SchoolLogo } from "@/components/school-logo";
import { DEFAULT_SCHOOL, SCHOOL_FACTS } from "@/lib/school";

export const metadata: Metadata = {
  // `absolute`: template dari root layout tidak berlaku untuk segment root,
  // jadi nama sekolah ditulis eksplisit agar tidak hilang dari judul.
  title: {
    absolute: `Kas Sekolah · ${DEFAULT_SCHOOL.name}`,
  },
  description:
    "Sistem kas resmi SMP Negeri 17 Tangerang Selatan untuk mencatat iuran, menerima pembayaran, dan menyusun laporan kas.",
  alternates: {
    canonical: "/",
  },
};

const FUNGSI = [
  {
    title: "Iuran Kas",
    description:
      "Nominal iuran bulanan dicatat untuk setiap siswa, lengkap dengan jatuh tempo pembayarannya.",
  },
  {
    title: "Pembayaran Kas",
    description:
      "Penerimaan pembayaran dicatat bendahara, baik melalui transfer maupun setor langsung.",
  },
  {
    title: "Laporan Kas",
    description:
      "Admin, bendahara, dan kepala sekolah memantau pemasukan serta pengeluaran dalam satu laporan.",
  },
] as const;

const FAKTA = [
  { label: "Akreditasi", value: SCHOOL_FACTS.accreditation },
  { label: "Kurikulum", value: SCHOOL_FACTS.kurikulum },
  { label: "Kepala Sekolah", value: SCHOOL_FACTS.principal },
  { label: "Tahun Ajaran", value: DEFAULT_SCHOOL.academicYear },
] as const;

export default function HomePage() {
  return (
    <div className="light-scope flex min-h-dvh flex-col bg-background text-foreground antialiased">
      <div className="grid flex-1 lg:grid-cols-[7fr_5fr]">
        {/* Kolom dominan: identitas produk. Panel institusional di sebelahnya
            sengaja lebih sempit, jadi hierarchy Institution → Product →
            Action sudah terbaca dari proporsi, tanpa ukuran yang bertengkar. */}
        <main className="flex flex-col justify-between px-5 py-12 sm:px-8 sm:py-16">
          <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center">
            {/* Logo jadi bagian hero, bukan header terpisah: di atas nama
                sekolah, dalam kotak kartu putih seperti cap resmi di kertas. */}
            <SchoolLogo
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-border bg-card p-3.5 text-teal shadow-xs"
              iconClassName="h-7 w-7"
            />

            {/* Identitas institusional: sengaja lebih ringan dari produk. */}
            <p className="mt-8 text-sm font-medium text-muted-foreground">{DEFAULT_SCHOOL.name}</p>

            <h1 className="mt-3 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
              Kas Sekolah
            </h1>

            <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
              Sistem kas resmi {DEFAULT_SCHOOL.name}. Satu tempat untuk mencatat iuran, menerima
              pembayaran, dan menyusun laporan kas.
            </p>

            <div className="mt-9">
              <Link
                href="/login"
                className={buttonVariants({
                  size: "lg",
                  className: "h-11 w-full sm:w-auto",
                })}
              >
                Masuk ke Kas Sekolah
                {/* Satu-satunya arrow di halaman: penanda bahwa ini gerbang
                    masuk, bukan tombol yang menjalankan aksi di tempat. */}
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <p className="mt-4 text-xs text-muted-foreground">
                Pilih masuk sebagai siswa atau pengelola tata usaha.
              </p>
            </div>
          </div>

          <p className="mt-12 text-xs text-muted-foreground">
            © {new Date().getFullYear()} {DEFAULT_SCHOOL.name}
          </p>
        </main>

        {/* Panel institusional. Cermin dari /login yang menaruh panelnya di
            kiri: dua halaman publik jadi satu bahasa visual tanpa jadi layar
            yang sama. Motifnya garis rambut pemisah baris, karena produk ini
            buku kas. */}
        <aside
          aria-label="Identitas sekolah dan fungsi sistem"
          className="flex flex-col justify-between bg-brand-panel px-5 py-10 text-brand-panel-ink sm:px-8 lg:px-10 lg:py-14"
        >
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-10">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.14em] text-white/75">
                {SCHOOL_FACTS.motto}
              </p>
              <dl className="mt-5 divide-y divide-white/20 border-t border-white/20">
                {FAKTA.map((fakta) => (
                  <div key={fakta.label} className="flex items-baseline justify-between gap-4 py-2.5">
                    <dt className="shrink-0 text-xs font-medium text-white/75">{fakta.label}</dt>
                    <dd className="text-right text-sm font-semibold text-white">{fakta.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <section aria-labelledby="fungsi">
              <h2 id="fungsi" className="text-xs font-medium text-white/75">
                Fungsi sistem
              </h2>
              <dl className="mt-3 divide-y divide-white/20 border-t border-white/20">
                {FUNGSI.map((fungsi) => (
                  <div key={fungsi.title} className="py-4">
                    <dt className="text-sm font-semibold text-white">{fungsi.title}</dt>
                    <dd className="mt-1 text-[13px] leading-relaxed text-white/80">
                      {fungsi.description}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}
