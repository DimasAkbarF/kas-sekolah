import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, Geist_Mono } from "next/font/google";
import { HydrateOnMount } from "@/components/hydrate-on-mount";
import { ThemeScript } from "@/components/layout/theme-script";
import { DEFAULT_SCHOOL, SCHOOL_FACTS } from "@/lib/school";
import "./globals.css";

// Nama variabelnya `--font-ibm-plex`, bukan `--font-sans`: `@theme inline` di
// globals.css memetakan `--font-sans` ke variabel ini, dan token yang
// self-referential (`--font-sans: var(--font-sans)`) mudah salah baca.
const ibmPlexSans = IBM_Plex_Sans({
 variable: "--font-ibm-plex",
 subsets: ["latin"],
 weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
 variable: "--font-geist-mono",
 subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const SCHOOL_NAME = DEFAULT_SCHOOL.name;

// themeColor wajib di `viewport` sejak Next 14; nilainya dicocokkan dengan
// --background di globals.css dan manifest.ts.
export const viewport: Viewport = {
 width: "device-width",
 initialScale: 1,
 themeColor: [
 { media: "(prefers-color-scheme: light)", color: "#EFF8F7" },
 { media: "(prefers-color-scheme: dark)", color: "#0E1B1A" },
 ],
};

export const metadata: Metadata = {
 metadataBase: new URL(SITE_URL),
 title: {
 default: `${SCHOOL_NAME} · Sistem Kas Sekolah`,
 template: `%s · ${SCHOOL_NAME}`,
 },
 description:
 "Sistem pengelolaan uang kas sekolah terpusat: kelola tagihan SPP, pembayaran online (DOKU) & manual, serta laporan kas transparan untuk siswa, bendahara, kepala sekolah, dan admin.",
 keywords: [
 "kas sekolah",
 "administrasi keuangan sekolah",
 "tagihan SPP",
 "pembayaran online",
 SCHOOL_NAME,
 "SMP negeri",
 "Tangerang Selatan",
 ],
 applicationName: "Kas Sekolah",
 creator: SCHOOL_NAME,
 publisher: SCHOOL_NAME,
 robots: {
 index: true,
 follow: true,
 googleBot: {
 index: true,
 follow: true,
 "max-snippet": -1,
 "max-image-preview": "large",
 "max-video-preview": -1,
 },
 },
 alternates: {
 canonical: "/",
 },
 openGraph: {
 type: "website",
 locale: "id_ID",
 url: SITE_URL,
 siteName: `${SCHOOL_NAME} · Kas Sekolah`,
 title: `${SCHOOL_NAME} · Sistem Kas Sekolah`,
 description:
 "Sistem pengelolaan uang kas sekolah terpusat: tagihan SPP, pembayaran online & manual, serta laporan kas transparan.",
 },
 twitter: {
 card: "summary_large_image",
 title: `${SCHOOL_NAME} · Sistem Kas Sekolah`,
 description:
 "Sistem pengelolaan uang kas sekolah terpusat: tagihan SPP, pembayaran online & manual, serta laporan kas transparan.",
 },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
 return (
  // `ThemeScript` menambahkan kelas `.dark` dan `color-scheme` ke <html> sebelum
  // React hydrates. Itu disengaja (mencegah kilat tema), jadi perbedaan atribut
  // server vs client di sini bukan bug: tanpa suppressHydrationWarning React
  // melempar mismatch pada setiap muat halaman.
  <html
    lang="id"
    suppressHydrationWarning
    className={`${ibmPlexSans.variable} ${geistMono.variable} h-full antialiased`}
  >
 <body className="min-h-full flex flex-col">
 {/* Structured data untuk mesin pencari & AI/GEO */}
 <script
 type="application/ld+json"
 dangerouslySetInnerHTML={{
 __html: JSON.stringify({
 "@context": "https://schema.org",
 "@type": "EducationalOrganization",
 name: SCHOOL_NAME,
 alternateName: "SMPN 17 Tangsel",
 description:
 "Sistem pengelolaan uang kas sekolah terpusat untuk tagihan SPP, pembayaran online dan manual, serta laporan kas transparan.",
 url: SITE_URL,
 logo: `${SITE_URL}/favicon.ico`,
 address: {
 "@type": "PostalAddress",
 streetAddress: DEFAULT_SCHOOL.address,
 addressLocality: "Tangerang Selatan",
 addressRegion: "Banten",
 addressCountry: "ID",
 },
 slogan: SCHOOL_FACTS.motto,
 motto: SCHOOL_FACTS.motto,
 department: SCHOOL_FACTS.programs.map((name) => ({
 "@type": "EducationalOrganization",
 name,
 })),
 }),
 }}
 />
 {/* beforeInteractive: pasang kelas .dark sebelum React hydrates. */}
 <ThemeScript />
 <HydrateOnMount />
 {children}
 </body>
 </html>
 );
}
