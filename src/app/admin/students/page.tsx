"use client";

import { useEffect, useMemo, useState } from "react";
import { PASSWORD_MIN_LENGTH } from "@/lib/password-policy";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { tableSurface } from "@/components/layout/data-table";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Pagination, PAGE_SIZE } from "@/components/layout/pagination";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogFooter,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
 Plus,
 Search,
 Pencil,
 Archive,
 RotateCcw,
 Loader2,
 KeyRound,
 GraduationCap,
} from "lucide-react";
import type { Student } from "@/types";
import { useStudents } from "@/hooks/use-students";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api-client";
import type { ClassRoom } from "@/types";
import { useStudentAccounts } from "@/hooks/use-student-accounts";
import { useI18n } from "@/hooks/use-i18n";
import type { TKey, TParams } from "@/lib/i18n";
import { getActiveAcademicYear } from "@/lib/school";
import { useWorkspaceClass } from "@/hooks/use-workspace-class";
import {
 addStudent,
 updateStudent,
 archiveStudent,
 restoreStudent,
 createStudentLoginAccount,
 resetStudentLoginPassword,
 type StudentInput,
 type StudentMutationResult,
} from "@/mock/students";

interface FormState {
 name: string;
 nis: string;
 nisn: string;
 className: string;
 classId: string;
 gender: "L" | "P" | "";
 phone: string;
 email: string;
}

const EMPTY_FORM: FormState = {
 name: "",
 nis: "",
 nisn: "",
 className: "",
 classId: "",
 gender: "",
 phone: "",
 email: "",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const INITIAL_LOAD_DELAY = 500;

function mutationError(
 t: (key: TKey, params?: TParams) => string,
 result: Extract<StudentMutationResult, { ok: false }>,
): string {
 return t(result.error, result.errorParams);
}

export default function StudentsPage() {
 const { active, archived } = useStudents();
 const { user } = useAuth();
 const className = useWorkspaceClass();
 // Hanya Super Admin yang boleh menaruh siswa di kelas lain.
 const canPickClass = user?.role === "super_admin";
 const [classes, setClasses] = useState<ClassRoom[]>([]);

 useEffect(() => {
 if (!canPickClass) return;
 apiFetch<{ classes: ClassRoom[] }>("/api/classes")
 .then((res) => setClasses(res.classes ?? []))
 .catch(() => setClasses([]));
 }, [canPickClass]);
 const { hasAccount } = useStudentAccounts();
 const { t } = useI18n();

 const [tab, setTab] = useState<"active" | "archived">("active");
 const [search, setSearch] = useState("");
 const [initialLoading, setInitialLoading] = useState(true);
 const [feedback, setFeedback] = useState<string | null>(null);
 const [page, setPage] = useState(1);

 const [formOpen, setFormOpen] = useState(false);
 const [editing, setEditing] = useState<Student | null>(null);
 const [form, setForm] = useState<FormState>(EMPTY_FORM);
 const [formError, setFormError] = useState<string | null>(null);
 const [saving, setSaving] = useState(false);

 const [archiveTarget, setArchiveTarget] = useState<Student | null>(null);
 const [archiving, setArchiving] = useState(false);
 const [archiveError, setArchiveError] = useState<string | null>(null);

 const [accountTarget, setAccountTarget] = useState<Student | null>(null);
 const [accountPassword, setAccountPassword] = useState("");
 const [accountError, setAccountError] = useState<string | null>(null);
 const [accountSaving, setAccountSaving] = useState(false);

 useEffect(() => {
 const id = setTimeout(() => setInitialLoading(false), INITIAL_LOAD_DELAY);
 return () => clearTimeout(id);
 }, []);

 useEffect(() => {
 if (!feedback) return;
 const id = setTimeout(() => setFeedback(null), 4000);
 return () => clearTimeout(id);
 }, [feedback]);

 const filtered = useMemo(() => {
 const list = tab === "active" ? active : archived;
 const q = search.trim().toLowerCase();
 if (!q) return list;
 return list.filter(
 (s) =>
 s.name.toLowerCase().includes(q) ||
 s.nis.toLowerCase().includes(q) ||
 s.nisn.toLowerCase().includes(q) ||
 (s.email ?? "").toLowerCase().includes(q),
 );
 }, [tab, active, archived, search]);

 const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
 const safePage = Math.min(page, pageCount);
 const paged = useMemo(
 () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
 [filtered, safePage],
 );

 function openCreate() {
 setEditing(null);
 setForm(EMPTY_FORM);
 setFormError(null);
 setFormOpen(true);
 }

 function openEdit(student: Student) {
 setEditing(student);
 setForm({
 name: student.name,
 nis: student.nis,
 nisn: student.nisn,
 className: student.className ?? "",
 gender: student.gender ?? "",
 phone: student.phone ?? "",
 email: student.email ?? "",
 classId: student.classId ?? "",
 });
 setFormError(null);
 setFormOpen(true);
 }

 function closeForm() {
 if (saving) return;
 setFormOpen(false);
 setEditing(null);
 }

 async function handleSubmit() {
 const payload: StudentInput = {
 name: form.name,
 nis: form.nis,
 nisn: form.nisn,
 className: form.className,
 gender: form.gender || undefined,
 phone: form.phone,
 email: form.email,
 classId: form.classId,
 };

 if (!form.name.trim()) return setFormError(t("students.errNameRequired"));
 if (!form.nis.trim()) return setFormError(t("students.errNisRequired"));
 if (!form.nisn.trim()) return setFormError(t("students.errNisnRequired"));
 if (!/^\d{10}$/.test(form.nisn.trim())) {
 return setFormError(t("students.errNisnInvalid"));
 }
 if (!form.email.trim()) return setFormError(t("students.errEmailRequired"));
 if (!EMAIL_PATTERN.test(form.email.trim())) {
 return setFormError(t("students.errEmailInvalid"));
 }

 setFormError(null);
 setSaving(true);
 const result = editing ? await updateStudent(editing.id, payload) : await addStudent(payload);
 setSaving(false);

 if (!result.ok) {
 setFormError(mutationError(t, result));
 return;
 }

 setFormOpen(false);
 setEditing(null);
 setFeedback(
 editing
 ? t("students.feedbackUpdated", { name: result.student.name })
 : t("students.feedbackCreated", { name: result.student.name }),
 );
 }

 async function handleArchive() {
 if (!archiveTarget) return;
 setArchiveError(null);
 setArchiving(true);
 const result = await archiveStudent(archiveTarget.id);
 setArchiving(false);
 if (!result.ok) {
 setArchiveError(mutationError(t, result));
 return;
 }
 setArchiveTarget(null);
 setFeedback(t("students.feedbackArchived", { name: result.student.name }));
 }

 async function handleRestore(student: Student) {
 const result = await restoreStudent(student.id);
 if (!result.ok) {
 setFeedback(mutationError(t, result));
 return;
 }
 setFeedback(t("students.feedbackRestored", { name: result.student.name }));
 }

 function openAccount(student: Student) {
 setAccountPassword("");
 setAccountError(null);
 setAccountTarget(student);
 }

 async function handleAccountSubmit() {
 if (!accountTarget) return;
 const student = accountTarget;
 if (accountPassword.length < PASSWORD_MIN_LENGTH) {
 setAccountError(t("students.errPasswordTooShort", { min: PASSWORD_MIN_LENGTH }));
 return;
 }
 setAccountError(null);
 setAccountSaving(true);
 const existed = hasAccount(student.id);
 const result = existed
 ? await resetStudentLoginPassword(student.id, accountPassword)
 : await createStudentLoginAccount(student.id, accountPassword);
 setAccountSaving(false);
 if (!result.ok) {
 setAccountError(t(result.error));
 return;
 }
 setAccountTarget(null);
 setAccountPassword("");
 setFeedback(
 existed
 ? t("students.feedbackAccountUpdated", { name: student.name })
 : t("students.feedbackAccountCreated", { name: student.name }),
 );
 }

 return (
 <AppShell
 role="super_admin"
 breadcrumbs={[
 { label: t("role.super_admin"), href: "/admin/dashboard" },
 { label: t("students.title") },
 ]}
 >
 <div className="space-y-6">
 <PageHeader
 title={t("students.title")}
 subtitle={t("students.subtitle", {
 className,
 year: getActiveAcademicYear(),
 })}
 accent="violet"
 icon={<GraduationCap className="h-5 w-5" />}
 badge={
 <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-md bg-neutral-soft text-neutral-ink border-neutral-line">
 {active.length} Siswa Aktif
 </span>
 }
 action={
 <Button size="sm" onClick={openCreate} disabled={initialLoading}>
 <Plus className="mr-2 h-4 w-4" />
 {t("students.add")}
 </Button>
 }
 />

 {feedback && (
 <Alert className="border-success/30">
 <AlertDescription className="text-success">{feedback}</AlertDescription>
 </Alert>
 )}

 <Tabs value={tab} onValueChange={(v) => setTab((v as "active" | "archived") ?? "active")}>
 <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
 <TabsList>
 <TabsTrigger value="active">{t("students.tabActive", { n: active.length })}</TabsTrigger>
 <TabsTrigger value="archived">
 {t("students.tabArchived", { n: archived.length })}
 </TabsTrigger>
 </TabsList>
 <div className="relative w-full max-w-sm">
 <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
 <Input
 placeholder={t("students.search")}
 aria-label={t("students.search")}
 className="pl-8"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 />
 </div>
 </div>

 <TabsContent value="active" className="mt-4 space-y-4">
 {initialLoading ? (
 <TableSkeleton rows={4} cols={6} />
 ) : filtered.length === 0 ? (
 <Card className="border-border/70 shadow-xs">
 <CardContent className="pt-0">
 <EmptyState
 title={search ? t("students.emptyNoResult") : t("students.emptyNoStudents")}
 description={search ? t("students.emptyNoResultDesc") : t("students.emptyNoStudentsDesc")}
 action={
 !search ? (
 <Button size="sm" onClick={openCreate}>
 <Plus className="mr-2 h-4 w-4" />
 {t("students.add")}
 </Button>
 ) : undefined
 }
 />
 </CardContent>
 </Card>
 ) : (
 <Card className="border-border/70 shadow-xs">
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium">{t("students.listActive")}</CardTitle>
 </CardHeader>
 <CardContent className="pt-0">
 <div className={cn(tableSurface, "hidden md:block")}>
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b bg-muted/50">
 <th scope="col" className="text-left px-4 py-2 text-xs font-medium">
 {t("students.fieldNis")}
 </th>
 <th scope="col" className="text-left px-4 py-2 text-xs font-medium">
 {t("students.fieldNisn")}
 </th>
 <th scope="col" className="text-left px-4 py-2 text-xs font-medium">
 {t("students.columnClass")}
 </th>
 <th scope="col" className="text-left px-4 py-2 text-xs font-medium">
 {t("students.columnName")}
 </th>
 <th scope="col" className="text-left px-4 py-2 text-xs font-medium">
 {t("students.columnGender")}
 </th>
 <th scope="col" className="text-left px-4 py-2 text-xs font-medium">
 {t("students.columnPhone")}
 </th>
 <th scope="col" className="text-left px-4 py-2 text-xs font-medium">
 {t("students.columnGmail")}
 </th>
 <th scope="col" className="text-left px-4 py-2 text-xs font-medium">
 {t("students.columnAccount")}
 </th>
 <th scope="col" className="text-right px-4 py-2 text-xs font-medium w-[118px]">
 {t("students.columnActions")}
 </th>
 </tr>
 </thead>
 <tbody>
 {paged.map((student) => (
 <tr key={student.id} className="border-b last:border-0 hover:bg-muted/30">
 <td className="px-4 py-2.5 font-mono text-xs">{student.nis}</td>
 <td className="px-4 py-2.5 font-mono text-xs tabular-nums">{student.nisn}</td>
 <td className="px-4 py-2.5">{student.className ?? "-"}</td>
 <td className="px-4 py-2.5 font-medium">
 <Link
 href={`/admin/students/${student.id}`}
 className="hover:text-primary hover:underline underline-offset-2"
 >
 {student.name}
 </Link>
 </td>
 <td className="px-4 py-2.5">{student.gender ?? "-"}</td>
 <td className="px-4 py-2.5 text-muted-foreground">{student.phone ?? "-"}</td>
 <td className="px-4 py-2.5 text-muted-foreground">
 <span className="block max-w-[190px] truncate" title={student.email || undefined}>
 {student.email || "-"}
 </span>
 </td>
 <td className="px-4 py-2.5">
 {hasAccount(student.id) ? (
 <Badge variant="secondary">{t("students.accountCreated")}</Badge>
 ) : (
 <Badge variant="outline">{t("students.accountNone")}</Badge>
 )}
 </td>
 <td className="px-4 py-2.5">
 <div className="flex items-center justify-end gap-1">
 <Button
 variant="ghost"
 size="sm"
 className="h-10 sm:h-8 w-10 sm:w-8"
 onClick={() => openAccount(student)}
 aria-label={`${t("students.accountManage")} ${student.name}`}
 >
 <KeyRound className="h-4 w-4" />
 </Button>
 <Button
 variant="ghost"
 size="sm"
 className="h-10 sm:h-8 w-10 sm:w-8"
 onClick={() => openEdit(student)}
 aria-label={`${t("common.edit")} ${student.name}`}
 >
 <Pencil className="h-4 w-4" />
 </Button>
 <Button
 variant="ghost"
 size="sm"
 className="h-10 sm:h-8 w-10 sm:w-8 text-destructive hover:text-destructive"
 onClick={() => {
 setArchiveError(null);
 setArchiveTarget(student);
 }}
 aria-label={`${t("students.archive")} ${student.name}`}
 >
 <Archive className="h-4 w-4" />
 </Button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {/* Mobile: 9 kolom tidak muat, jadi daftar kartu (pola sama
 dengan recent-transactions-section). */}
 <ul className="space-y-2 md:hidden">
 {paged.map((student) => (
 <li key={student.id} className="rounded-lg border border-border bg-card p-3 text-sm">
 <div className="flex items-start justify-between gap-2">
 <Link
 href={`/admin/students/${student.id}`}
 className="min-w-0 font-medium hover:text-primary hover:underline underline-offset-2"
 >
 {student.name}
 </Link>
 <Badge variant={hasAccount(student.id) ? "secondary" : "outline"} className="shrink-0">
 {hasAccount(student.id) ? t("students.accountCreated") : t("students.accountNone")}
 </Badge>
 </div>
 <p className="mt-1 font-mono text-xs text-muted-foreground tabular-nums">
 {student.nis} · {student.nisn}
 </p>
 <p
 className="mt-1 text-xs text-muted-foreground truncate"
 title={student.email || undefined}
 >
 {student.email || "-"}
 </p>
 <div className="mt-2 flex flex-wrap gap-1.5">
 <Button
 variant="ghost"
 size="sm"
 className="h-10 w-10"
 onClick={() => openAccount(student)}
 aria-label={`${t("students.accountManage")} ${student.name}`}
 >
 <KeyRound className="h-4 w-4" />
 </Button>
 <Button
 variant="ghost"
 size="sm"
 className="h-10 w-10"
 onClick={() => openEdit(student)}
 aria-label={`${t("common.edit")} ${student.name}`}
 >
 <Pencil className="h-4 w-4" />
 </Button>
 <Button
 variant="ghost"
 size="sm"
 className="h-10 w-10 text-destructive hover:text-destructive"
 onClick={() => {
 setArchiveError(null);
 setArchiveTarget(student);
 }}
 aria-label={`${t("students.archive")} ${student.name}`}
 >
 <Archive className="h-4 w-4" />
 </Button>
 </div>
 </li>
 ))}
 </ul>

 <Pagination
 page={safePage}
 pageCount={pageCount}
 total={filtered.length}
 onPageChange={setPage}
 label="siswa"
 />
 </CardContent>
 </Card>
 )}
 </TabsContent>

 <TabsContent value="archived" className="mt-4 space-y-4">
 {initialLoading ? (
 <TableSkeleton rows={3} cols={5} />
 ) : filtered.length === 0 ? (
 <Card className="border-border/70 shadow-xs">
 <CardContent className="pt-0">
 <EmptyState
 title={search ? t("students.emptyNoResult") : t("students.emptyArchived")}
 description={search ? t("students.emptyNoResultDesc") : t("students.emptyArchivedDesc")}
 />
 </CardContent>
 </Card>
 ) : (
 <Card className="border-border/70 shadow-xs">
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium">{t("students.listArchived")}</CardTitle>
 </CardHeader>
 <CardContent className="pt-0">
 <div className={cn(tableSurface, "hidden md:block")}>
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b bg-muted/50">
 <th scope="col" className="text-left px-4 py-2 text-xs font-medium">
 {t("students.fieldNis")}
 </th>
 <th scope="col" className="text-left px-4 py-2 text-xs font-medium">
 {t("students.fieldNisn")}
 </th>
 <th scope="col" className="text-left px-4 py-2 text-xs font-medium">
 {t("students.columnName")}
 </th>
 <th scope="col" className="text-left px-4 py-2 text-xs font-medium">
 {t("students.columnGender")}
 </th>
 <th scope="col" className="text-right px-4 py-2 text-xs font-medium w-[110px]">
 {t("students.columnActions")}
 </th>
 </tr>
 </thead>
 <tbody>
 {paged.map((student) => (
 <tr key={student.id} className="border-b last:border-0 hover:bg-muted/30">
 <td className="px-4 py-2.5 font-mono text-xs">{student.nis}</td>
 <td className="px-4 py-2.5 font-mono text-xs tabular-nums">{student.nisn}</td>
 <td className="px-4 py-2.5 font-medium">{student.name}</td>
 <td className="px-4 py-2.5">{student.gender ?? "-"}</td>
 <td className="px-4 py-2.5">
 <div className="flex items-center justify-end">
 <Button size="sm" variant="outline" onClick={() => handleRestore(student)}>
 <RotateCcw className="mr-2 h-3.5 w-3.5" />
 {t("students.restore")}
 </Button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </CardContent>
 </Card>
 )}
 </TabsContent>
 </Tabs>

 <Dialog open={formOpen} onOpenChange={(open) => !open && closeForm()}>
 <DialogContent className="sm:max-w-md">
 <DialogHeader>
 <DialogTitle>
 {editing ? t("students.dialogEditTitle") : t("students.dialogAddTitle")}
 </DialogTitle>
 <DialogDescription>
 {editing
 ? t("students.dialogEditDesc", { name: editing.name })
 : t("students.dialogAddDesc")}
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-4">
 <div className="space-y-1.5">
 <label htmlFor="student-name" className="text-sm font-medium">
 {t("students.fieldName")} <span className="text-destructive">*</span>
 </label>
 <Input
 id="student-name"
 value={form.name}
 onChange={(e) => setForm({ ...form, name: e.target.value })}
 placeholder={t("students.placeholderName")}
 />
 </div>

 <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
 <div className="space-y-1.5">
 <label htmlFor="student-nis" className="text-sm font-medium">
 {t("students.fieldNis")} <span className="text-destructive">*</span>
 </label>
 <Input
 id="student-nis"
 value={form.nis}
 onChange={(e) => setForm({ ...form, nis: e.target.value })}
 placeholder={t("students.placeholderNis")}
 inputMode="numeric"
 />
 </div>
 <div className="space-y-1.5">
 <label htmlFor="student-nisn" className="text-sm font-medium">
 {t("students.fieldNisn")} <span className="text-destructive">*</span>
 </label>
 <Input
 id="student-nisn"
 value={form.nisn}
 onChange={(e) => setForm({ ...form, nisn: e.target.value })}
 placeholder={t("students.placeholderNisn")}
 inputMode="numeric"
 maxLength={10}
 />
 </div>
 </div>

 <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
 <div className="space-y-1.5">
 <label htmlFor="student-class" className="text-sm font-medium">
 {t("students.fieldClass")}
 </label>
 {canPickClass ? (
 <Select
 value={form.classId || null}
 onValueChange={(v) => {
 const cls = classes.find((c) => c.id === v);
 setForm({
 ...form,
 classId: v ?? "",
 className: cls?.name ?? "",
 });
 }}
 >
 <SelectTrigger id="student-class" className="w-full">
 <SelectValue placeholder={t("classes.filterAll")} />
 </SelectTrigger>
 <SelectContent>
 {classes.map((c) => (
 <SelectItem key={c.id} value={c.id}>
 {c.name} ({c.grade})
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 ) : (
 // Admin Kelas: kelasnya sudah pasti dari session, tidak bisa diganti.
 <Input id="student-class" value={user?.className ?? form.className} readOnly disabled />
 )}
 </div>
 <div className="space-y-1.5">
 <label className="text-sm font-medium">{t("students.fieldGender")}</label>
 <Select
 value={form.gender || null}
 onValueChange={(v) => setForm({ ...form, gender: (v as "L" | "P") || "" })}
 >
 <SelectTrigger className="w-full">
 <SelectValue placeholder={t("students.genderSelect")} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="L">{t("students.genderMale")}</SelectItem>
 <SelectItem value="P">{t("students.genderFemale")}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-1.5">
 <label htmlFor="student-phone" className="text-sm font-medium">
 {t("students.fieldPhone")}
 </label>
 <Input
 id="student-phone"
 value={form.phone}
 onChange={(e) => setForm({ ...form, phone: e.target.value })}
 placeholder={t("students.placeholderPhone")}
 />
 </div>
 </div>

 <div className="space-y-1.5">
 <label htmlFor="student-email" className="text-sm font-medium">
 {t("students.fieldGmail")} <span className="text-destructive">*</span>
 </label>
 <Input
 id="student-email"
 type="email"
 inputMode="email"
 autoComplete="email"
 value={form.email}
 onChange={(e) => setForm({ ...form, email: e.target.value })}
 placeholder={t("students.placeholderGmail")}
 />
 </div>

 {formError && (
 <Alert variant="destructive">
 <AlertDescription>{formError}</AlertDescription>
 </Alert>
 )}
 </div>

 <DialogFooter className="mt-2">
 <Button variant="outline" onClick={closeForm} disabled={saving}>
 {t("common.cancel")}
 </Button>
 <Button onClick={handleSubmit} disabled={saving}>
 {saving ? (
 <>
 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
 {t("students.saving")}
 </>
 ) : editing ? (
 t("students.saveChanges")
 ) : (
 t("students.add")
 )}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 <Dialog open={accountTarget !== null} onOpenChange={(open) => !open && setAccountTarget(null)}>
 <DialogContent className="sm:max-w-sm">
 <DialogHeader>
 <DialogTitle>
 {hasAccount(accountTarget?.id ?? "")
 ? t("students.accountDialogManageTitle")
 : t("students.accountDialogCreateTitle")}
 </DialogTitle>
 <DialogDescription>
 {t("students.accountDialogDesc", { name: accountTarget?.name ?? "" })}
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-1.5">
 <label htmlFor="account-password" className="text-sm font-medium">
 {t("students.accountFieldPassword")} <span className="text-destructive">*</span>
 </label>
 <Input
 id="account-password"
 value={accountPassword}
 onChange={(e) => setAccountPassword(e.target.value)}
 placeholder={t("login.passwordPlaceholder")}
 autoComplete="off"
 disabled={accountSaving}
 />
 <p className="text-xs text-muted-foreground">
 {t("students.accountPasswordHint", { min: PASSWORD_MIN_LENGTH })}
 </p>
 </div>

 {accountError && (
 <Alert variant="destructive">
 <AlertDescription>{accountError}</AlertDescription>
 </Alert>
 )}

 <DialogFooter className="mt-2">
 <Button variant="outline" onClick={() => setAccountTarget(null)} disabled={accountSaving}>
 {t("common.cancel")}
 </Button>
 <Button onClick={handleAccountSubmit} disabled={accountSaving}>
 {accountSaving ? (
 <>
 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
 {t("students.saving")}
 </>
 ) : hasAccount(accountTarget?.id ?? "") ? (
 t("students.accountReset")
 ) : (
 t("students.accountCreate")
 )}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 <Dialog open={archiveTarget !== null} onOpenChange={(open) => !open && setArchiveTarget(null)}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>{t("students.archiveDialogTitle")}</DialogTitle>
 <DialogDescription>
 {t("students.archiveConfirmPrefix")}
 {""}
 <span className="font-medium text-foreground">{archiveTarget?.name}</span>?{""}
 {t("students.archiveConfirmSuffix")}
 </DialogDescription>
 </DialogHeader>

 {archiveError && (
 <Alert variant="destructive">
 <AlertDescription>{archiveError}</AlertDescription>
 </Alert>
 )}

 <DialogFooter>
 <Button variant="outline" onClick={() => setArchiveTarget(null)} disabled={archiving}>
 {t("common.cancel")}
 </Button>
 <Button variant="destructive" onClick={handleArchive} disabled={archiving}>
 {archiving ? (
 <>
 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
 {t("students.archiving")}
 </>
 ) : (
 t("students.yesArchive")
 )}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 </AppShell>
 );
}

function TableSkeleton({ rows, cols }: { rows: number; cols: number }) {
 return (
 <Card className="border-border/70 shadow-xs">
 <CardHeader className="pb-2">
 <Skeleton className="h-4 w-32" />
 </CardHeader>
 <CardContent className="pt-0">
 <div className="rounded-md border overflow-hidden">
 <div className="border-b bg-muted/50 px-4 py-2">
 <Skeleton className="h-3 w-full max-w-[200px]" />
 </div>
 {Array.from({ length: rows }).map((_, i) => (
 <div
 key={i}
 className="flex items-center gap-4 border-b last:border-0 px-4 py-3"
 style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
 >
 {Array.from({ length: cols }).map((__, j) => (
 <Skeleton key={j} className="h-3.5 flex-1" />
 ))}
 </div>
 ))}
 </div>
 </CardContent>
 </Card>
 );
}
