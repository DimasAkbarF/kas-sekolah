"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useI18n } from "@/hooks/use-i18n";
import { apiFetch, ApiError } from "@/lib/api-client";
import { ArrowLeft, CheckCircle2, Loader2, Send } from "lucide-react";

export default function ForgotPasswordPage() {
 const { t } = useI18n();
 const [nisn, setNisn] = useState("");
 const [error, setError] = useState<string | null>(null);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [submittedName, setSubmittedName] = useState<string | null>(null);

 async function handleSubmit(e: React.FormEvent) {
 e.preventDefault();
 setError(null);

 const cleanNisn = nisn.trim();
 if (!cleanNisn) {
 setError(t("forgot.errNisnRequired"));
 return;
 }

 if (!/^\d{10}$/.test(cleanNisn)) {
 setError(t("forgot.errNisnLength"));
 return;
 }

 setIsSubmitting(true);
 try {
 const res = await apiFetch<{ ok: boolean; studentName?: string }>("/api/auth/forgot-password", {
 method: "POST",
 body: JSON.stringify({ nisn: cleanNisn }),
 });
 setSubmittedName(res.studentName || cleanNisn);
 } catch (err) {
 setError(
 err instanceof ApiError && err.message
 ? err.message
 : err instanceof Error
 ? err.message
 : "Terjadi kesalahan saat mengirim permintaan.",
 );
 } finally {
 setIsSubmitting(false);
 }
 }

 return (
 <AuthLayout title={t("forgot.title")} subtitle={t("forgot.subtitle")}>
 {submittedName ? (
 <div className="space-y-5 text-center">
 <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-soft border border-success-line">
 <CheckCircle2 className="h-6 w-6" />
 </div>

 <div className="space-y-1.5">
 <h3 className="text-base font-semibold tracking-tight">{t("forgot.successTitle")}</h3>
 <p className="text-xs font-medium text-primary">Siswa: {submittedName}</p>
 <p className="text-xs leading-relaxed text-muted-foreground">{t("forgot.successDesc")}</p>
 </div>

 <div className="pt-2">
 <Button nativeButton={false} render={<Link href="/login" />} className="w-full">
 <ArrowLeft className="mr-2 h-4 w-4" />
 {t("forgot.backToLogin")}
 </Button>
 </div>
 </div>
 ) : (
 <form onSubmit={handleSubmit} className="space-y-5" noValidate>
 <div className="space-y-1.5">
 <label htmlFor="nisn" className="block text-sm font-medium">
 {t("forgot.nisnLabel")}
 </label>
 <Input
 id="nisn"
 type="text"
 inputMode="numeric"
 maxLength={10}
 autoComplete="off"
 placeholder={t("forgot.nisnPlaceholder")}
 value={nisn}
 onChange={(e) => setNisn(e.target.value)}
 aria-invalid={!!error}
 disabled={isSubmitting}
 className="h-9 font-mono"
 />
 <p className="text-[11px] text-muted-foreground">
 Format: 10 digit angka NISN yang terdaftar di sekolah
 </p>
 </div>

 {error && (
 <Alert variant="destructive">
 <AlertDescription className="text-xs">{error}</AlertDescription>
 </Alert>
 )}

 <Button type="submit" className="w-full" disabled={isSubmitting}>
 {isSubmitting ? (
 <>
 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
 {t("forgot.sending")}
 </>
 ) : (
 <>
 <Send className="mr-2 h-4 w-4" />
 {t("forgot.submit")}
 </>
 )}
 </Button>

 <div className="pt-2 text-center">
 <Link
 href="/login"
 className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
 >
 <ArrowLeft className="h-3.5 w-3.5" />
 {t("forgot.backToLogin")}
 </Link>
 </div>
 </form>
 )}
 </AuthLayout>
 );
}
