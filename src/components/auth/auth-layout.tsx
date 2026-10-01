"use client";

import { SchoolLogo } from "@/components/school-logo";
import { useSchool } from "@/hooks/use-school";
import { SCHOOL_FACTS } from "@/lib/school";
import { cn } from "@/lib/utils";

interface AuthLayoutProps {
 title: string;
 subtitle: string;
 children: React.ReactNode;
 /** Set to false for role selector without the extra white card wrapper on desktop */
 boxed?: boolean;
}

export function AuthLayout({ title, subtitle, children, boxed = true }: AuthLayoutProps) {
 const school = useSchool();
 const currentYear = new Date().getFullYear();

 return (
 <div className="light-scope min-h-screen w-full bg-background flex flex-col lg:grid lg:grid-cols-[45%_55%] text-foreground antialiased">
 {/* ── Desktop Brand Panel (Left: ~45%) ── */}
 <aside
 aria-label="Identitas dan Informasi Sekolah"
 className="hidden lg:flex relative flex-col justify-between h-full min-h-screen bg-brand-panel text-brand-panel-ink p-10 lg:p-12 xl:p-16 select-none overflow-hidden"
 >
 <div className="relative w-full max-w-[440px] mx-auto flex flex-col justify-between h-full">
 {/* Top: School Brand Lockup */}
 <div className="flex items-center gap-3.5">
 <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-card shadow-xs p-1.5">
 <SchoolLogo
 className="h-8 w-8"
 iconClassName="h-5 w-5 text-teal"
 imageClassName="h-full w-full object-contain"
 />
 </span>
 <div className="min-w-0">
 <p className="text-[16px] font-semibold leading-tight text-white tracking-tight">
 {school.name}
 </p>
 <p className="mt-1 text-[10.5px] font-semibold tracking-[0.14em] text-white/75">
 {SCHOOL_FACTS.motto}
 </p>
 </div>
 </div>

 {/* Middle: Headline & School Information */}
 <div className="my-auto py-10">
 <h2 className="text-2xl xl:text-[30px] font-semibold leading-snug tracking-tight text-white">
 Kelola kas sekolah secara rapi dan transparan.
 </h2>
 <p className="mt-3 text-[14px] leading-relaxed text-white/80">
 Sistem informasi kas resmi terintegrasi untuk pencatatan iuran, administrasi tagihan SPP, dan
 pelaporan keuangan sekolah yang akuntabel.
 </p>

 {/* School fact sheet */}
 <div className="mt-8 border-t border-white/20 pt-5">
 <dl className="grid grid-cols-1 divide-y divide-white/10 text-sm">
 <Fact label="Akreditasi" value={SCHOOL_FACTS.accreditation} />
 <Fact label="Kurikulum" value={SCHOOL_FACTS.kurikulum} />
 <Fact label="Kepala Sekolah" value={SCHOOL_FACTS.principal} />
 <Fact label="Program" value="Reguler · Bilingual · Olahraga" />
 </dl>
 </div>
 </div>

 {/* Bottom: Institutional Copyright */}
 <div className="text-[11.5px] text-white/60">
 © {currentYear} {school.name}
 </div>
 </div>
 </aside>

 {/* ── Right Panel (Content & Form) ── */}
 <main className="flex-1 flex flex-col justify-between min-h-screen px-4 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-10 xl:px-16 bg-background">
 {/* Content Area */}
 <div className="my-auto w-full max-w-[430px] mx-auto pt-10 sm:pt-12 lg:pt-0">
 {/* Desktop Heading (hidden on mobile, rendered above container) */}
 <div className="hidden lg:block mb-6">
 <h1 className="text-2xl sm:text-[26px] font-semibold tracking-tight text-foreground">
 {title}
 </h1>
 <p className="mt-2 text-sm sm:text-[14.5px] leading-relaxed text-muted-foreground">{subtitle}</p>
 </div>

 {/* Login Container with Enlarged Overlapping School Logo on Mobile */}
 <div
 className={cn(
 "relative w-full rounded-xl border border-border bg-card shadow-card",
 "px-5 pt-13 pb-6 sm:px-6 sm:pt-14", // mobile padding for enlarged overlapping logo
 boxed
 ? "lg:p-6 lg:rounded-xl" // desktop boxed form
 : "lg:bg-transparent lg:border-0 lg:p-0 lg:shadow-none", // desktop unboxed (role cards)
 )}
 >
 {/* Enlarged Overlapping School Logo on Mobile (< lg) */}
 <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex h-20 w-20 items-center justify-center rounded-full border border-border bg-card p-3 shadow-card lg:hidden">
 <SchoolLogo
 className="h-12 w-12"
 iconClassName="h-8 w-8 text-teal"
 imageClassName="h-full w-full object-contain"
 />
 </div>

 {/* Mobile Heading (inside container beneath the overlapping logo) */}
 <div className="text-center mb-6 lg:hidden">
 <h1 className="text-xl sm:text-[22px] font-semibold tracking-tight text-foreground">
 {title}
 </h1>
 <p className="mt-1.5 text-xs sm:text-[13px] leading-relaxed text-muted-foreground">{subtitle}</p>
 </div>

 {children}
 </div>
 </div>

 {/* Mobile Footer */}
 <footer className="w-full max-w-[420px] mx-auto mt-8 text-center lg:hidden">
 <p className="text-[11.5px] text-muted-foreground">
 © {currentYear} {school.name}
 </p>
 </footer>
 </main>
 </div>
 );
}

function Fact({ label, value }: { label: string; value: string }) {
 return (
 <div className="flex items-baseline justify-between py-2.5">
 <dt className="shrink-0 text-xs font-medium text-white/65">{label}</dt>
 <dd className="text-right text-sm font-semibold text-white">{value}</dd>
 </div>
 );
}
