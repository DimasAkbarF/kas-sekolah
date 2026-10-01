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
import { Plus, Pencil, Power, School, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/hooks/use-i18n";
import { apiFetch } from "@/lib/api-client";
import type { ClassRoom } from "@/types";
import { RoleGuard } from "@/components/auth/role-guard";
import { useAuth } from "@/hooks/use-auth";

interface ClassWithMeta extends ClassRoom {
 adminName: string | null;
 adminEmail: string | null;
 studentCount: number;
}

interface FormState {
 name: string;
 grade: string;
 academicYear: string;
}

const EMPTY_FORM: FormState = { name: "", grade: "", academicYear: "" };

export default function ClassesPage() {
 const { user } = useAuth();
 const { t } = useI18n();
 const [list, setList] = useState<ClassWithMeta[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [feedback, setFeedback] = useState<string | null>(null);
 const [error, setError] = useState<string | null>(null);

 const [formOpen, setFormOpen] = useState(false);
 const [editing, setEditing] = useState<ClassWithMeta | null>(null);
 const [form, setForm] = useState<FormState>(EMPTY_FORM);
 const [formError, setFormError] = useState<string | null>(null);
 const [saving, setSaving] = useState(false);

 const [toggleTarget, setToggleTarget] = useState<ClassWithMeta | null>(null);
 const [toggling, setToggling] = useState(false);

 // Maintenance:Super Admin menyalakannya manual sebelum melakukan update, lalu
 // mematikannya setelah selesai. `null` = tidak ada dialog konfirmasi yang
 // terbuka. Menyala perlu konfirmasi karena langsung memutus akses semua user
 // kelas itu; mematikan tidak perlu karena hanya mengembalikan akses.
 const [maintenanceTarget, setMaintenanceTarget] = useState<{
 cls: ClassWithMeta;
 next: boolean;
 } | null>(null);
 const [savingMaintenance, setSavingMaintenance] = useState(false);

 const load = useCallback(() => {
 apiFetch<{ classes: ClassWithMeta[] }>("/api/classes?all=1")
 .then((res) => setList(res.classes ?? []))
 .catch((err: unknown) => setError(err instanceof Error ? err.message : t("classes.loadFailed")))
 .finally(() => setIsLoading(false));
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

 function openEdit(cls: ClassWithMeta) {
 setEditing(cls);
 setForm({ name: cls.name, grade: cls.grade, academicYear: cls.academicYear });
 setFormError(null);
 setFormOpen(true);
 }

 async function handleSubmit() {
 if (!form.name.trim()) return setFormError(t("classes.errNameRequired"));
 if (!form.grade.trim()) return setFormError(t("classes.errGradeRequired"));
 if (!form.academicYear.trim()) return setFormError(t("classes.errYearRequired"));

 setSaving(true);
 setFormError(null);
 try {
 if (editing) {
 const res = await apiFetch<{ class: ClassRoom }>(
 `/api/classes/${encodeURIComponent(editing.id)}`,
 { method: "PATCH", body: JSON.stringify(form) },
 );
 setFeedback(t("classes.feedbackUpdated", { name: res.class.name }));
 } else {
 const res = await apiFetch<{ class: ClassRoom }>("/api/classes", {
 method: "POST",
 body: JSON.stringify(form),
 });
 setFeedback(t("classes.feedbackCreated", { name: res.class.name }));
 }
 setFormOpen(false);
 setEditing(null);
 load();
 } catch (err) {
 setFormError(err instanceof Error ? err.message : t("classes.loadFailed"));
 } finally {
 setSaving(false);
 }
 }

 async function handleToggle() {
 if (!toggleTarget) return;
 setToggling(true);
 try {
 const res = await apiFetch<{ class: ClassRoom }>(
 `/api/classes/${encodeURIComponent(toggleTarget.id)}`,
 { method: "PATCH", body: JSON.stringify({ isActive: !toggleTarget.isActive }) },
 );
 setFeedback(
 res.class.isActive
 ? t("classes.feedbackActivated", { name: res.class.name })
 : t("classes.feedbackDeactivated", { name: res.class.name }),
 );
 setToggleTarget(null);
 load();
 } catch (err) {
 setError(err instanceof Error ? err.message : t("classes.loadFailed"));
 setToggleTarget(null);
 } finally {
 setToggling(false);
 }
 }

 function requestMaintenance(cls: ClassWithMeta, next: boolean) {
 setMaintenanceTarget({ cls, next });
 }

 async function handleMaintenance() {
 if (!maintenanceTarget) return;
 const { cls, next } = maintenanceTarget;
 setSavingMaintenance(true);
 try {
 const res = await apiFetch<{ class: ClassRoom }>(
 `/api/classes/${encodeURIComponent(cls.id)}`,
 { method: "PATCH", body: JSON.stringify({ maintenance: next }) },
 );
 setFeedback(
 next
 ? t("classes.feedbackMaintenanceOn", { name: res.class.name })
 : t("classes.feedbackMaintenanceOff", { name: res.class.name }),
 );
 setMaintenanceTarget(null);
 load();
 } catch (err) {
 setError(err instanceof Error ? err.message : t("classes.loadFailed"));
 setMaintenanceTarget(null);
 } finally {
 setSavingMaintenance(false);
 }
 }

 return (
 <RoleGuard allowedRoles={["super_admin"]}>
 <AppShell
 role="super_admin"
 breadcrumbs={[
 { label: t("role.super_admin"), href: "/admin/dashboard" },
 { label: t("classes.title") },
 ]}
 >
 <div className="space-y-6">
 <PageHeader
 title={t("classes.title")}
 subtitle={t("classes.subtitle")}
 accent="teal"
 icon={<School className="h-5 w-5" />}
 badge={
 <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-md bg-secondary text-primary border border-border">
 {list.length} {t("classes.title")}
 </span>
 }
 action={
 <Button size="sm" onClick={openCreate} disabled={isLoading}>
 <Plus className="mr-2 h-4 w-4" />
 {t("classes.add")}
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
 title={t("classes.empty")}
 description={t("classes.emptyDesc")}
 action={
 <Button size="sm" onClick={openCreate}>
 <Plus className="mr-2 h-4 w-4" />
 {t("classes.add")}
 </Button>
 }
 />
 </CardContent>
 </Card>
 ) : (
 <Card className="border-border/70 shadow-xs">
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium">{t("classes.title")}</CardTitle>
 </CardHeader>
 <CardContent className="pt-0">
 {/* Baris di dalam Card: tanpa border sendiri. Pemisah tugasnya divide-y;
          tiap item `border` + `bg-card` membuat frame di dalam frame. */}
              <ul className="divide-y divide-border">
 {list.map((cls) => (
 <li
 key={cls.id}
 className="flex flex-wrap items-center justify-between gap-3 py-3 transition-colors"
 >
 <div className="min-w-0">
 <div className="flex items-center gap-2">
 <p className="font-medium">{cls.name}</p>
 <Badge variant={cls.isActive ? "secondary" : "outline"}>
 {cls.isActive ? t("classes.active") : t("classes.inactive")}
 </Badge>
 {/* Status maintenance sebagai badge, bukan cuma posisi switch: kalau
 Super Admin sedang menggulir jauh dari baris ini, dia tetap tahu kelas
 mana yang sedang ditutup. */}
 {cls.maintenance && (
 <Badge variant="gold" className="font-semibold">
 {t("classes.maintenanceBadge")}
 </Badge>
 )}
 </div>
 <p className="text-xs text-muted-foreground mt-0.5">
 {cls.grade} · {cls.academicYear} · {cls.studentCount}
 {""}
 {t("classes.studentCount")}
 </p>
 <p className="text-xs text-muted-foreground">
 {t("classes.adminAssigned")}:{""}
 {cls.adminName ?? t("classes.adminNone")}
 </p>
 </div>
 <div className="flex items-center gap-3">
 {/* Label teks, bukan hanya aria-label: sakelar tanpa label yang terlihat
 tidak bisa, dan pembaca cepat tahu apa yang sedang di-toggle. */}
 <label className="flex items-center gap-2">
 <span className="text-xs text-muted-foreground">
 {cls.maintenance ? t("classes.maintenanceOn") : t("classes.maintenanceOff")}
 </span>
 <Switch
 checked={cls.maintenance}
 disabled={savingMaintenance}
 onCheckedChange={(next: boolean) => requestMaintenance(cls, next)}
 aria-label={`${t("classes.maintenance")} ${cls.name}`}
 />
 </label>
 <Button
 variant="ghost"
 size="sm"
 className="h-10 w-10 sm:h-8 sm:w-8"
 onClick={() => openEdit(cls)}
 aria-label={`${t("classes.edit")} ${cls.name}`}
 title={t("classes.edit")}
 >
 <Pencil className="h-4 w-4" />
 </Button>
 <Button
 variant="ghost"
 size="sm"
 className="h-10 w-10 sm:h-8 sm:w-8"
 onClick={() => setToggleTarget(cls)}
 aria-label={`${cls.isActive ? t("classes.inactive") : t("classes.active")} ${cls.name}`}
 title={cls.isActive ? t("classes.inactive") : t("classes.active")}
 >
 <Power className="h-4 w-4" />
 </Button>
 </div>
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
 <DialogTitle>{editing ? t("classes.edit") : t("classes.add")}</DialogTitle>
 <DialogDescription>{t("classes.subtitle")}</DialogDescription>
 </DialogHeader>

 <div className="space-y-4">
 <div className="space-y-1.5">
 <label htmlFor="class-name" className="text-sm font-medium">
 {t("classes.name")} <span className="text-destructive">*</span>
 </label>
 <Input
 id="class-name"
 value={form.name}
 onChange={(e) => setForm({ ...form, name: e.target.value })}
 placeholder={t("classes.namePlaceholder")}
 disabled={saving}
 />
 </div>
 <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
 <div className="space-y-1.5">
 <label htmlFor="class-grade" className="text-sm font-medium">
 {t("classes.grade")} <span className="text-destructive">*</span>
 </label>
 <Input
 id="class-grade"
 value={form.grade}
 onChange={(e) => setForm({ ...form, grade: e.target.value })}
 placeholder={t("classes.gradePlaceholder")}
 disabled={saving}
 />
 </div>
 <div className="space-y-1.5">
 <label htmlFor="class-year" className="text-sm font-medium">
 {t("classes.year")} <span className="text-destructive">*</span>
 </label>
 <Input
 id="class-year"
 value={form.academicYear}
 onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
 placeholder={t("classes.yearPlaceholder")}
 disabled={saving}
 />
 </div>
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

 <Dialog open={toggleTarget !== null} onOpenChange={(open) => !open && setToggleTarget(null)}>
 <DialogContent className="sm:max-w-md">
 <DialogHeader>
 <DialogTitle>
 {toggleTarget?.isActive ? t("classes.inactive") : t("classes.active")}
 </DialogTitle>
 <DialogDescription>
 {toggleTarget && t("classes.confirmDeactivate", { name: toggleTarget.name })}
 </DialogDescription>
 </DialogHeader>
 <DialogFooter>
 <Button variant="outline" onClick={() => setToggleTarget(null)} disabled={toggling}>
 {t("common.cancel")}
 </Button>
 <Button
 variant={toggleTarget?.isActive ? "destructive" : "default"}
 onClick={() => void handleToggle()}
 disabled={toggling}
 >
 {toggling ? (
 <>
 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
 {t("students.saving")}
 </>
 ) : toggleTarget?.isActive ? (
 t("classes.inactive")
 ) : (
 t("classes.active")
 )}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/*
 Konfirmasi maintenance. Menyala memakai `variant="destructive"` karena
 langsung memutus akses Admin Kelas dan siswa kelas itu; mematikan mengembalikan
 akses sehingga cukup tombol biasa.
 */}
 <Dialog
 open={maintenanceTarget !== null}
 onOpenChange={(open) => !open && !savingMaintenance && setMaintenanceTarget(null)}
 >
 <DialogContent className="sm:max-w-md">
 <DialogHeader>
 <DialogTitle>
 {maintenanceTarget?.next
 ? t("classes.maintenanceOn")
 : t("classes.maintenanceOff")}
 </DialogTitle>
 <DialogDescription>
 {maintenanceTarget &&
 (maintenanceTarget.next
 ? t("classes.confirmMaintenanceOn", { name: maintenanceTarget.cls.name })
 : t("classes.confirmMaintenanceOff", { name: maintenanceTarget.cls.name }))}
 </DialogDescription>
 </DialogHeader>
 <DialogFooter>
 <Button
 variant="outline"
 onClick={() => setMaintenanceTarget(null)}
 disabled={savingMaintenance}
 >
 {t("common.cancel")}
 </Button>
 <Button
 variant={maintenanceTarget?.next ? "destructive" : "default"}
 onClick={() => void handleMaintenance()}
 disabled={savingMaintenance}
 >
 {savingMaintenance && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
 {maintenanceTarget?.next
 ? t("classes.maintenanceOn")
 : t("classes.maintenanceOff")}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </AppShell>
 </RoleGuard>
 );
}
