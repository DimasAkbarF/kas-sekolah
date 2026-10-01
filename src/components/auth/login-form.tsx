"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { login, roleDashboardPath } from "@/services/auth.service";
import { useI18n } from "@/hooks/use-i18n";
import type { TKey } from "@/lib/i18n";
import { ArrowRight, Loader2 } from "lucide-react";

export type LoginRole = "super_admin" | "student";

function demoHintKey(role?: LoginRole): TKey {
 if (role === "super_admin") return "login.demoAdmin";
 if (role === "student") return "login.demoStudent";
 return "login.demoDefault";
}

interface LoginFormProps {
 /** When set, credentials are validated against this role only. */
 role?: LoginRole;
}

export function LoginForm({ role }: LoginFormProps) {
 const router = useRouter();
 const { t } = useI18n();

 const [identifier, setIdentifier] = useState("");
 const [password, setPassword] = useState("");
 const [error, setError] = useState<string | null>(null);
 const [isSubmitting, setIsSubmitting] = useState(false);

 async function handleSubmit(e: React.FormEvent) {
 e.preventDefault();
 setError(null);

 if (!identifier.trim() || !password) {
 setError(t("login.errorRequired"));
 return;
 }

 setIsSubmitting(true);
 try {
 const user = await login(role, { identifier, password });
 router.replace(roleDashboardPath(user.role));
 } catch (err) {
 setError(err instanceof Error && err.message ? err.message : t("login.errorRequired"));
 } finally {
 setIsSubmitting(false);
 }
 }

 const isStudent = role === "student";
 const fieldLabelKey: TKey =
 role === undefined
 ? "login.identifier"
 : isStudent
 ? "login.identifierStudent"
 : "login.identifierAdmin";
 const fieldPlaceholderKey: TKey =
 role === undefined
 ? "login.identifierPlaceholder"
 : isStudent
 ? "login.identifierPlaceholderStudent"
 : "login.identifierPlaceholderAdmin";
 const ctaKey: TKey =
 role === undefined ? "login.submit" : isStudent ? "login.submitStudent" : "login.submitAdmin";

 return (
 <form onSubmit={handleSubmit} className="space-y-5" noValidate>
 <div className="space-y-1.5">
 <label htmlFor="identifier" className="block text-sm font-medium">
 {t(fieldLabelKey)}
 </label>
 <Input
 id="identifier"
 type={role === "super_admin" ? "email" : "text"}
 autoComplete="username"
 placeholder={t(fieldPlaceholderKey)}
 value={identifier}
 onChange={(e) => setIdentifier(e.target.value)}
 aria-invalid={!!error}
 disabled={isSubmitting}
 className="h-9"
 />
 </div>

 <div className="space-y-1.5">
 <label htmlFor="password" className="block text-sm font-medium">
 {t("login.password")}
 </label>
 <Input
 id="password"
 type="password"
 autoComplete="current-password"
 placeholder={t("login.passwordPlaceholder")}
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 aria-invalid={!!error}
 disabled={isSubmitting}
 className="h-9"
 />
 </div>

 {error && (
 <Alert variant="destructive">
 <AlertDescription className="text-sm">{error}</AlertDescription>
 </Alert>
 )}

 <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
 {isSubmitting ? (
 <>
 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
 {t("login.processing")}
 </>
 ) : (
 <>
 {t(ctaKey)}
 <ArrowRight className="ml-2 h-4 w-4" />
 </>
 )}
 </Button>

 <p className="text-center text-xs leading-relaxed text-muted-foreground/80">
 {t(demoHintKey(role))}
 </p>

 {role === "super_admin" ? (
 <p className="text-center text-xs text-muted-foreground">{t("login.forgot")}</p>
 ) : (
 <div className="text-center">
 <Link
 href="/forgot-password"
 className="text-xs text-muted-foreground hover:text-primary transition-colors underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded"
 >
 {t("login.forgotLink")}
 </Link>
 </div>
 )}
 </form>
 );
}
