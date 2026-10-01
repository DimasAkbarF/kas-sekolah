"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/dashboard/empty-state";
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
import { Plus, Pencil, Users, Loader2 } from "lucide-react";
import { useI18n } from "@/hooks/use-i18n";
import { apiFetch } from "@/lib/api-client";
import { PASSWORD_MIN_LENGTH } from "@/lib/password-policy";
import type { ClassRoom, UserRole } from "@/types";
import { RoleGuard } from "@/components/auth/role-guard";
import { useAuth } from "@/hooks/use-auth";

interface StaffMember {
 id: string;
 name: string;
 email: string;
 role: UserRole;
 classId: string | null;
 className: string | null;
 classActive: boolean | null;
 createdAt: string;
}

interface FormState {
 name: string;
 email: string;
 role: "super_admin" | "class_admin";
 classId: string;
 password: string;
}

const EMPTY_FORM: FormState = {
 name: "",
 email: "",
 role: "class_admin",
 classId: "",
 password: "",
};

export default function StaffPage() {
 const { user } = useAuth();
 const { t } = useI18n();
 const [list, setList] = useState<StaffMember[]>([]);
 const [classes, setClasses] = useState<ClassRoom[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [feedback, setFeedback] = useState<string | null>(null);
 const [error, setError] = useState<string | null>(null);

 const [formOpen, setFormOpen] = useState(false);
 const [editing, setEditing] = useState<StaffMember | null>(null);
 const [form, setForm] = useState<FormState>(EMPTY_FORM);
 const [formError, setFormError] = useState<string | null>(null);
 const [saving, setSaving] = useState(false);

 const load = useCallback(() => {
 apiFetch<{ staff: StaffMember[] }>("/api/staff")
 .then((res) => setList(res.staff ?? []))
 .catch((err: unknown) => setError(err instanceof Error ? err.message : t("staff.loadFailed")))
 .finally(() => setIsLoading(false));
 apiFetch<{ classes: ClassRoom[] }>("/api/classes")
 .then((res) => setClasses(res.classes ?? []))
 .catch(() => setClasses([]));
 }, [t]);

 // Halaman khusus Super Admin: jangan panggil API bila role belum cocok
 // (guard me-redirect, tapi effect tetap jalan dan memicu 403 di konsol).
 useEffect(() => {
 if (user?.role !== "super_admin") return;
 load();
 }, [load, user?.role]);

 useEffect(() => {
 if (!feedback) return;
 const id = setTimeout(() => setFeedback(null), 4000);
 return () => clearTimeout(id);
 }, [feedback]);

 function openCreate() {
 setEditing(null);
 setForm(EMPTY_FORM);
 setFormError(null);
 setFormOpen(true);
 }

 function openEdit(member: StaffMember) {
 setEditing(member);
 setForm({
 name: member.name,
 email: member.email,
 role: member.role === "super_admin" ? "super_admin" : "class_admin",
 classId: member.classId ?? "",
 password: "",
 });
 setFormError(null);
 setFormOpen(true);
 }

 async function handleSubmit() {
 if (!form.name.trim()) return setFormError(t("staff.errNameRequired"));
 if (!form.email.trim()) return setFormError(t("staff.errEmailRequired"));
 if (form.role === "class_admin" && !form.classId) {
 return setFormError(t("staff.errClassRequired"));
 }
 if (!editing && form.password.length < PASSWORD_MIN_LENGTH) {
 return setFormError(t("staff.errPasswordTooShort", { min: PASSWORD_MIN_LENGTH }));
 }
 if (editing && form.password && form.password.length < PASSWORD_MIN_LENGTH) {
 return setFormError(t("staff.errPasswordTooShort", { min: PASSWORD_MIN_LENGTH }));
 }

 setSaving(true);
 setFormError(null);
 try {
 if (editing) {
 const payload: Record<string, unknown> = {
 name: form.name.trim(),
 role: form.role,
 classId: form.role === "class_admin" ? form.classId : null,
 };
 if (form.password) payload.password = form.password;
 await apiFetch(`/api/staff/${encodeURIComponent(editing.id)}`, {
 method: "PATCH",
 body: JSON.stringify(payload),
 });
 setFeedback(t("staff.feedbackUpdated", { name: form.name.trim() }));
 } else {
 await apiFetch("/api/staff", {
 method: "POST",
 body: JSON.stringify({
 name: form.name.trim(),
 email: form.email.trim(),
 role: form.role,
 classId: form.role === "class_admin" ? form.classId : null,
 password: form.password,
 }),
 });
 setFeedback(t("staff.feedbackCreated", { name: form.name.trim() }));
 }
 setFormOpen(false);
 setEditing(null);
 load();
 } catch (err) {
 setFormError(err instanceof Error ? err.message : t("staff.loadFailed"));
 } finally {
 setSaving(false);
 }
 }

 return (
 <RoleGuard allowedRoles={["super_admin"]}>
 <AppShell
 role="super_admin"
 breadcrumbs={[
 { label: t("role.super_admin"), href: "/admin/dashboard" },
 { label: t("staff.title") },
 ]}
 >
 <div className="space-y-6">
 <PageHeader
 title={t("staff.title")}
 subtitle={t("staff.subtitle")}
 accent="teal"
 icon={<Users className="h-5 w-5" />}
 action={
 <Button size="sm" onClick={openCreate} disabled={isLoading}>
 <Plus className="mr-2 h-4 w-4" />
 {t("staff.add")}
 </Button>
 }
 />

 {error && (
 <Alert variant="destructive">
 <AlertDescription>{error}</AlertDescription>
 </Alert>
 )}
 {feedback && (
 <Alert className="border-success/30">
 <AlertDescription className="text-success">{feedback}</AlertDescription>
 </Alert>
 )}

 {isLoading ? (
 <Card className="border-border/70 shadow-xs">
 <CardContent className="space-y-3 pt-0">
 {Array.from({ length: 3 }).map((_, i) => (
 <Skeleton key={i} className="h-12 w-full" />
 ))}
 </CardContent>
 </Card>
 ) : list.length === 0 ? (
 <Card className="border-border/70 shadow-xs">
 <CardContent className="pt-0">
 <EmptyState
 title={t("staff.empty")}
 description={t("staff.emptyDesc")}
 action={
 <Button size="sm" onClick={openCreate}>
 <Plus className="mr-2 h-4 w-4" />
 {t("staff.add")}
 </Button>
 }
 />
 </CardContent>
 </Card>
 ) : (
 <Card className="border-border/70 shadow-xs">
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium">{t("staff.title")}</CardTitle>
 </CardHeader>
 <CardContent className="pt-0">
 {/* Baris di dalam Card: tanpa border sendiri, lihat catatan di classes/page.tsx. */}
              <ul className="divide-y divide-border">
 {list.map((member) => (
 <li
 key={member.id}
 className="flex flex-wrap items-center justify-between gap-3 py-3 transition-colors"
 >
 <div className="min-w-0">
 <div className="flex items-center gap-2">
 <p className="font-medium">{member.name}</p>
 <Badge variant="outline">
 {member.role === "super_admin" ? t("staff.superAdmin") : t("staff.classAdmin")}
 </Badge>
 {member.classId && member.classActive === false && (
 <Badge variant="outline" className="border-destructive/40 text-destructive">
 {t("classes.inactive")}
 </Badge>
 )}
 </div>
 <p className="text-xs text-muted-foreground mt-0.5 truncate">{member.email}</p>
 <p className="text-xs text-muted-foreground">
 {t("staff.class")}:{""}
 {member.className ?? t("classes.scopeSchool")}
 </p>
 </div>
 <Button
 variant="ghost"
 size="sm"
 className="h-10 w-10 sm:h-8 sm:w-8"
 onClick={() => openEdit(member)}
 aria-label={`${t("staff.edit")} ${member.name}`}
 title={t("staff.edit")}
 >
 <Pencil className="h-4 w-4" />
 </Button>
 </li>
 ))}
 </ul>
 </CardContent>
 </Card>
 )}
 </div>

 <Dialog open={formOpen} onOpenChange={(open) => !open && !saving && setFormOpen(false)}>
 <DialogContent className="sm:max-w-md">
 <DialogHeader>
 <DialogTitle>{editing ? t("staff.edit") : t("staff.add")}</DialogTitle>
 <DialogDescription>{t("staff.subtitle")}</DialogDescription>
 </DialogHeader>

 <div className="space-y-4">
 <div className="space-y-1.5">
 <label htmlFor="staff-name" className="text-sm font-medium">
 {t("staff.name")} <span className="text-destructive">*</span>
 </label>
 <Input
 id="staff-name"
 value={form.name}
 onChange={(e) => setForm({ ...form, name: e.target.value })}
 disabled={saving}
 />
 </div>

 <div className="space-y-1.5">
 <label htmlFor="staff-email" className="text-sm font-medium">
 {t("staff.email")} <span className="text-destructive">*</span>
 </label>
 <Input
 id="staff-email"
 type="email"
 inputMode="email"
 value={form.email}
 onChange={(e) => setForm({ ...form, email: e.target.value })}
 disabled={saving || !!editing}
 />
 {editing && <p className="text-xs text-muted-foreground">{t("staff.emailLocked")}</p>}
 </div>

 <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
 <div className="space-y-1.5">
 <label htmlFor="staff-role" className="text-sm font-medium">
 {t("staff.role")}
 </label>
 <Select
 value={form.role}
 onValueChange={(v) =>
 setForm({
 ...form,
 role: (v as "super_admin" | "class_admin") || "class_admin",
 })
 }
 >
 <SelectTrigger id="staff-role" className="w-full">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="class_admin">{t("staff.classAdmin")}</SelectItem>
 <SelectItem value="super_admin">{t("staff.superAdmin")}</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1.5">
 <label htmlFor="staff-class" className="text-sm font-medium">
 {t("staff.class")}
 {form.role === "class_admin" && <span className="text-destructive"> *</span>}
 </label>
 <Select
 value={form.classId || null}
 onValueChange={(v) => setForm({ ...form, classId: v ?? "" })}
 disabled={form.role === "super_admin"}
 >
 <SelectTrigger id="staff-class" className="w-full">
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
 </div>
 </div>

 <div className="space-y-1.5">
 <label htmlFor="staff-password" className="text-sm font-medium">
 {t("staff.password")}
 {!editing && <span className="text-destructive"> *</span>}
 </label>
 <Input
 id="staff-password"
 type="password"
 autoComplete="new-password"
 value={form.password}
 onChange={(e) => setForm({ ...form, password: e.target.value })}
 disabled={saving}
 />
 <p className="text-xs text-muted-foreground">
 {editing
 ? t("staff.passwordHint")
 : t("staff.errPasswordTooShort", { min: PASSWORD_MIN_LENGTH })}
 </p>
 </div>

 {formError && (
 <Alert variant="destructive">
 <AlertDescription>{formError}</AlertDescription>
 </Alert>
 )}
 </div>

 <DialogFooter className="mt-2">
 <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
 {t("common.cancel")}
 </Button>
 <Button onClick={() => void handleSubmit()} disabled={saving}>
 {saving ? (
 <>
 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
 {t("students.saving")}
 </>
 ) : (
 t("common.save")
 )}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </AppShell>
 </RoleGuard>
 );
}
