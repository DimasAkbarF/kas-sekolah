"use client";

import { useRef, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SchoolLogo } from "@/components/school-logo";
import { AccountPasswordManager } from "@/components/admin/account-password-manager";
import { useSchool } from "@/hooks/use-school";
import { useI18n } from "@/hooks/use-i18n";
import { updateSchoolProfile, type SchoolProfile } from "@/lib/school";
import { Save, Upload, RotateCcw, GraduationCap, Settings } from "lucide-react";
import { RoleGuard } from "@/components/auth/role-guard";

const MAX_LOGO_SIZE = 256 * 1024;

type Feedback = { type: "success" | "error"; text: string } | null;

function SchoolInfoForm({
 school,
 onFeedback,
}: {
 school: SchoolProfile;
 onFeedback: (f: Feedback) => void;
}) {
 const { t } = useI18n();
 const fileInputRef = useRef<HTMLInputElement>(null);
 const [name, setName] = useState(school.name);
 const [email, setEmail] = useState(school.email ?? "");
 const [address, setAddress] = useState(school.address ?? "");
 const [phone, setPhone] = useState(school.phone ?? "");
 const [saving, setSaving] = useState(false);
 const [logoDraft, setLogoDraft] = useState<string | null | undefined>(undefined);

 async function handleSaveInfo() {
 if (saving) return;
 setSaving(true);
 const patch: {
 name: string;
 email: string;
 address: string;
 phone: string;
 logoUrl?: string | null;
 } = {
 name: name.trim() || "SMP Negeri 17 Tangerang Selatan",
 email: email.trim(),
 address: address.trim(),
 phone: phone.trim(),
 };
 if (logoDraft !== undefined) patch.logoUrl = logoDraft;
 try {
 await updateSchoolProfile(patch);
 onFeedback({ type: "success", text: t("settings.feedbackSaved") });
 } catch (err) {
 console.error("[settings] gagal menyimpan profil", err);
 onFeedback({ type: "error", text: t("settings.feedbackSaveFailed") });
 } finally {
 setSaving(false);
 }
 }

 function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
 const file = e.target.files?.[0];
 e.target.value = "";
 if (!file) return;

 if (!file.type.startsWith("image/")) {
 onFeedback({ type: "error", text: t("settings.feedbackNotImage") });
 return;
 }
 if (file.size > MAX_LOGO_SIZE) {
 onFeedback({ type: "error", text: t("settings.feedbackLogoSize") });
 return;
 }

 const reader = new FileReader();
 reader.onload = () => {
 setLogoDraft(String(reader.result));
 onFeedback({ type: "success", text: t("settings.feedbackLogoDraft") });
 };
 reader.readAsDataURL(file);
 }

 function handleResetLogo() {
 setLogoDraft(null);
 onFeedback({ type: "success", text: t("settings.feedbackLogoDraft") });
 }

 const effectiveLogo = logoDraft !== undefined ? logoDraft : school.logoUrl;

 return (
 <Card className="border-border/70 shadow-xs">
 <CardHeader className="pb-3">
 <CardTitle className="text-sm font-medium">{t("settings.schoolInfo")}</CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="flex items-center gap-4">
 <SchoolLogo
 logoUrl={logoDraft}
 className="h-16 w-16 shrink-0 rounded-2xl bg-primary text-primary-foreground"
 iconClassName="h-8 w-8"
 imageClassName="h-full w-full"
 />
 <div className="space-y-2">
 <div className="flex flex-wrap gap-2">
 <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
 <Upload className="mr-2 h-4 w-4" />
 {t("settings.chooseLogo")}
 </Button>
 {effectiveLogo && (
 <Button variant="ghost" size="sm" onClick={handleResetLogo}>
 <RotateCcw className="mr-2 h-4 w-4" />
 {t("common.reset")}
 </Button>
 )}
 </div>
 <input
 ref={fileInputRef}
 type="file"
 accept="image/*"
 className="hidden"
 onChange={handleLogoFile}
 aria-label={t("settings.uploadLogoAria")}
 />
 <p className="text-xs text-muted-foreground">{t("settings.logoHint")}</p>
 </div>
 </div>

 <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
 <div className="space-y-2">
 <label htmlFor="school-name" className="text-sm font-medium">
 {t("settings.schoolName")}
 </label>
 <Input id="school-name" value={name} onChange={(e) => setName(e.target.value)} />
 </div>
 <div className="space-y-2">
 <label htmlFor="school-email" className="text-sm font-medium">
 {t("settings.email")}
 </label>
 <Input
 id="school-email"
 value={email}
 type="email"
 onChange={(e) => setEmail(e.target.value)}
 />
 </div>
 </div>
 <div className="space-y-2">
 <label htmlFor="school-address" className="text-sm font-medium">
 {t("settings.address")}
 </label>
 <Input id="school-address" value={address} onChange={(e) => setAddress(e.target.value)} />
 </div>
 <div className="space-y-2">
 <label htmlFor="school-phone" className="text-sm font-medium">
 {t("settings.phone")}
 </label>
 <Input id="school-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
 </div>

 <Button size="sm" onClick={() => void handleSaveInfo()} disabled={saving}>
 <Save className="mr-2 h-4 w-4" />
 {t("common.save")}
 </Button>
 </CardContent>
 </Card>
 );
}

function AcademicYearForm({
 school,
 onFeedback,
}: {
 school: SchoolProfile;
 onFeedback: (f: Feedback) => void;
}) {
 const { t } = useI18n();
 const [academicYear, setAcademicYear] = useState(school.academicYear ?? "");
 const [saving, setSaving] = useState(false);

 async function handleSave() {
 if (saving) return;
 setSaving(true);
 try {
 await updateSchoolProfile({ academicYear: academicYear.trim() || undefined });
 onFeedback({ type: "success", text: t("settings.feedbackSaved") });
 } catch (err) {
 console.error("[settings] gagal menyimpan tahun ajaran", err);
 onFeedback({ type: "error", text: t("settings.feedbackSaveFailed") });
 } finally {
 setSaving(false);
 }
 }

 return (
 <Card className="border-border/70 shadow-xs">
 <CardHeader className="pb-3">
 <CardTitle className="text-sm font-medium flex items-center gap-2">
 <GraduationCap className="h-4 w-4" />
 {t("settings.academicYear")}
 </CardTitle>
 <p className="text-sm text-muted-foreground">{t("settings.classManagedElsewhere")}</p>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
 <div className="space-y-2">
 <label htmlFor="academic-year" className="text-sm font-medium">
 {t("settings.academicYear")}
 </label>
 <Input
 id="academic-year"
 value={academicYear}
 onChange={(e) => setAcademicYear(e.target.value)}
 placeholder="cth: 2026/2027"
 />
 </div>
 </div>
 <Button size="sm" onClick={handleSave} disabled={saving}>
 <Save className="mr-2 h-4 w-4" />
 {t("common.save")}
 </Button>
 </CardContent>
 </Card>
 );
}

function BillingSettingsForm({
 school,
 onFeedback,
}: {
 school: SchoolProfile;
 onFeedback: (f: Feedback) => void;
}) {
 const { t } = useI18n();
 const [defaultAmount, setDefaultAmount] = useState(
 school.defaultAmount ? String(school.defaultAmount) : "",
 );
 const [defaultDueDays, setDefaultDueDays] = useState(
 school.defaultDueDays ? String(school.defaultDueDays) : "",
 );
 const [invoiceFormat, setInvoiceFormat] = useState(school.invoiceFormat ?? "");
 const [saving, setSaving] = useState(false);

 async function handleSave() {
 if (saving) return;
 const amount = parseInt(defaultAmount, 10);
 const dueDays = parseInt(defaultDueDays, 10);
 if (Number.isFinite(amount) && amount <= 0) {
 onFeedback({ type: "error", text: t("settings.feedbackAmountPositive") });
 return;
 }
 if (Number.isFinite(dueDays) && dueDays <= 0) {
 onFeedback({ type: "error", text: t("settings.feedbackDueDaysPositive") });
 return;
 }
 setSaving(true);
 try {
 await updateSchoolProfile({
 defaultAmount: amount > 0 ? amount : undefined,
 defaultDueDays: dueDays > 0 ? dueDays : undefined,
 invoiceFormat: invoiceFormat.trim() || undefined,
 });
 onFeedback({ type: "success", text: t("settings.feedbackSaved") });
 } catch (err) {
 console.error("[settings] gagal menyimpan default tagihan", err);
 onFeedback({ type: "error", text: t("settings.feedbackSaveFailed") });
 } finally {
 setSaving(false);
 }
 }

 return (
 <Card className="border-border/70 shadow-xs">
 <CardHeader className="pb-3">
 <CardTitle className="text-sm font-medium">{t("settings.billing")}</CardTitle>
 <p className="text-sm text-muted-foreground">{t("settings.billingDesc")}</p>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
 <div className="space-y-2">
 <label htmlFor="billing-amount" className="text-sm font-medium">
 {t("settings.defaultAmount")}
 </label>
 <Input
 id="billing-amount"
 value={defaultAmount}
 onChange={(e) => setDefaultAmount(e.target.value)}
 type="number"
 min={1}
 placeholder="50000"
 />
 </div>
 <div className="space-y-2">
 <label htmlFor="billing-due-days" className="text-sm font-medium">
 {t("settings.defaultDueDays")}
 </label>
 <Input
 id="billing-due-days"
 value={defaultDueDays}
 onChange={(e) => setDefaultDueDays(e.target.value)}
 type="number"
 min={1}
 max={365}
 placeholder="30"
 />
 </div>
 </div>
 <div className="space-y-2">
 <label htmlFor="billing-invoice-format" className="text-sm font-medium">
 {t("settings.invoiceFormat")}
 </label>
 <Input
 id="billing-invoice-format"
 value={invoiceFormat}
 onChange={(e) => setInvoiceFormat(e.target.value)}
 placeholder="INV-{YEAR}-{SEQ}"
 />
 </div>
 <Button size="sm" onClick={handleSave} disabled={saving}>
 <Save className="mr-2 h-4 w-4" />
 {t("common.save")}
 </Button>
 </CardContent>
 </Card>
 );
}

export default function SettingsPage() {
 const school = useSchool();
 const { t } = useI18n();
 const [feedback, setFeedback] = useState<Feedback>(null);

 return (
 <RoleGuard allowedRoles={["super_admin"]}>
 <AppShell
 role="super_admin"
 breadcrumbs={[
 { label: t("role.super_admin"), href: "/admin/dashboard" },
 { label: t("settings.title") },
 ]}
 >
 <div className="space-y-6 max-w-6xl">
 <PageHeader
 title={t("settings.title")}
 subtitle={t("settings.subtitle")}
 accent="slate"
 icon={<Settings className="h-5 w-5" />}
 />

 <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 items-start">
 <SchoolInfoForm key={`school-${school.updatedAt}`} school={school} onFeedback={setFeedback} />

 <AcademicYearForm key={`year-${school.updatedAt}`} school={school} onFeedback={setFeedback} />
 </div>

 {feedback && (
 <p
 role="status"
 className={feedback.type === "success" ? "text-sm text-success" : "text-sm text-destructive"}
 >
 {feedback.text}
 </p>
 )}

 <AccountPasswordManager />

 <Separator />

 <BillingSettingsForm
 key={`billing-${school.updatedAt}`}
 school={school}
 onFeedback={setFeedback}
 />
 </div>
 </AppShell>
 </RoleGuard>
 );
}
