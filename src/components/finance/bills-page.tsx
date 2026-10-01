"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { tableSurface } from "@/components/layout/data-table";
import { cn } from "@/lib/utils";
import { Pagination, PAGE_SIZE } from "@/components/layout/pagination";
import { getAllBills } from "@/services/billing.service";
import { formatDate } from "@/lib/formatters";
import { AnimatedMoney } from "@/components/dashboard/animated-money";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, Plus, MoreHorizontal, Pencil, Trash2, Loader2, Receipt } from "lucide-react";
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogFooter,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/hooks/use-i18n";
import { useStudents } from "@/hooks/use-students";
import { useSchool } from "@/hooks/use-school";
import { useDataVersion } from "@/hooks/use-data-version";
import { createBill, deleteBill, updateBill, type NewBill } from "@/lib/sync";
import type { Bill, BillTargetType, UserRole } from "@/types";

interface FormState {
 name: string;
 category: string;
 amount: string;
 period: string;
 startDate: string;
 dueDate: string;
 targetType: BillTargetType;
 targetIds: string[];
}

function defaultDate(offsetDays: number): string {
 const d = new Date();
 d.setDate(d.getDate() + offsetDays);
 return d.toISOString().slice(0, 10);
}

export function BillsPage({ role }: { role: UserRole }) {
 const { t } = useI18n();
 useDataVersion();
 const { active } = useStudents();
 const school = useSchool();
 const [search, setSearch] = useState("");
 const [statusFilter, setStatusFilter] = useState("all");
 const [categoryFilter, setCategoryFilter] = useState("all");
 const [feedback, setFeedback] = useState<string | null>(null);
 const [deleteTarget, setDeleteTarget] = useState<Bill | null>(null);
 const [page, setPage] = useState(1);
 const [deleting, setDeleting] = useState(false);

 const [dialogOpen, setDialogOpen] = useState(false);
 const [editing, setEditing] = useState<Bill | null>(null);
 const [saving, setSaving] = useState(false);
 const [formError, setFormError] = useState<string | null>(null);
 const [form, setForm] = useState<FormState>(() => ({
 name: "",
 category: "",
 amount: school.defaultAmount ? String(school.defaultAmount) : "",
 period: school.academicYear ?? "",
 startDate: defaultDate(5),
 dueDate: defaultDate(school.defaultDueDays ?? 30),
 targetType: "all",
 targetIds: [],
 }));

 const bills = getAllBills();

 const filtered = useMemo(
 () =>
 bills.filter((b) => {
 const matchSearch = b.name.toLowerCase().includes(search.toLowerCase());
 const matchStatus = statusFilter === "all" || b.status === statusFilter;
 const matchCategory = categoryFilter === "all" || b.category === categoryFilter;
 return matchSearch && matchStatus && matchCategory;
 }),
 [bills, search, statusFilter, categoryFilter],
 );

 const categories = [...new Set(bills.map((b) => b.category))];

 function openCreate() {
 setEditing(null);
 setForm({
 name: "",
 category: "",
 amount: school.defaultAmount ? String(school.defaultAmount) : "",
 period: school.academicYear ?? "",
 startDate: defaultDate(5),
 dueDate: defaultDate(school.defaultDueDays ?? 30),
 targetType: "all",
 targetIds: [],
 });
 setFormError(null);
 setDialogOpen(true);
 }

 function openEdit(bill: Bill) {
 setEditing(bill);
 setForm({
 name: bill.name,
 category: bill.category,
 amount: String(bill.amount),
 period: bill.period,
 startDate: bill.startDate.slice(0, 10),
 dueDate: bill.dueDate.slice(0, 10),
 targetType: bill.targetType,
 targetIds: bill.targetIds,
 });
 setFormError(null);
 setDialogOpen(true);
 }

 function toggleTarget(id: string) {
 setForm((f) => ({
 ...f,
 targetIds: f.targetIds.includes(id) ? f.targetIds.filter((x) => x !== id) : [...f.targetIds, id],
 }));
 }

 async function handleSave() {
 const amount = parseInt(form.amount, 10);
 if (!form.name.trim()) {
 setFormError(t("bills.errNameRequired"));
 return;
 }
 if (!Number.isFinite(amount) || amount <= 0) {
 setFormError(t("bills.errAmountPositive"));
 return;
 }
 if (form.targetType === "specific" && form.targetIds.length === 0) {
 setFormError(t("bills.targetChooseStudents"));
 return;
 }

 const payload: NewBill = {
 name: form.name.trim(),
 category: form.category.trim() || "Umum",
 amount,
 period: form.period.trim() || "2026/2027",
 startDate: form.startDate,
 dueDate: form.dueDate,
 targetType: form.targetType,
 targetIds: form.targetIds,
 };

 setFormError(null);
 setSaving(true);
 try {
 if (editing) {
 await updateBill(editing.id, payload);
 setFeedback(t("bills.feedbackUpdated"));
 } else {
 await createBill(payload);
 setFeedback(t("bills.feedbackCreated"));
 }
 setDialogOpen(false);
 setEditing(null);
 } catch (err) {
 setFormError(err instanceof Error && err.message ? err.message : t("students.errorUnknown"));
 } finally {
 setSaving(false);
 }
 }

 const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
 const safePage = Math.min(page, pageCount);
 const paged = useMemo(
 () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
 [filtered, safePage],
 );

 async function handleDelete() {
 if (!deleteTarget) return;
 setDeleting(true);
 try {
 await deleteBill(deleteTarget.id);
 setFeedback(t("bills.feedbackDeleted"));
 } catch (err) {
 setFeedback(err instanceof Error && err.message ? err.message : t("students.errorUnknown"));
 } finally {
 setDeleting(false);
 setDeleteTarget(null);
 }
 }

 return (
 <AppShell
 role={role}
 breadcrumbs={[
 { label: t(`role.${role}`), href: `/${role}/dashboard` },
 { label: t("bills.title") },
 ]}
 >
 <div className="space-y-4">
 <PageHeader
 title={t("bills.title")}
 subtitle={t("bills.subtitle")}
 accent="indigo"
 icon={<Receipt className="h-5 w-5" />}
 badge={
 <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-md bg-neutral-soft text-neutral-ink border-neutral-line">
 {bills.length} Tagihan
 </span>
 }
 action={
 <Button size="sm" onClick={openCreate}>
 <Plus className="mr-2 h-4 w-4" />
 {t("bills.create")}
 </Button>
 }
 />

 {feedback && (
 <Alert className="border-success/30">
 <AlertDescription className="text-success">{feedback}</AlertDescription>
 </Alert>
 )}

 <div className="flex flex-col sm:flex-row gap-3">
 <div className="relative flex-1 max-w-sm">
 <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
 <Input
 placeholder={t("bills.search")}
 aria-label={t("bills.search")}
 className="pl-8"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 />
 </div>
 <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
 <SelectTrigger className="w-full sm:w-[150px]">
 <SelectValue placeholder={t("common.status")} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">{t("bills.allStatus")}</SelectItem>
 <SelectItem value="active">{t("status.active")}</SelectItem>
 <SelectItem value="inactive">{t("status.inactive")}</SelectItem>
 <SelectItem value="expired">{t("status.expired")}</SelectItem>
 </SelectContent>
 </Select>
 <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "all")}>
 <SelectTrigger className="w-full sm:w-[150px]">
 <SelectValue placeholder={t("th.category")} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">{t("bills.allCategories")}</SelectItem>
 {categories.map((cat) => (
 <SelectItem key={cat} value={cat}>
 {cat}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 {filtered.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-12 text-center">
 <p className="text-sm text-muted-foreground">{t("bills.noResult")}</p>
 </div>
 ) : (
 <>
 <div className={cn(tableSurface, "hidden md:block")}>
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b bg-muted/40">
 <th
 scope="col"
 className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground"
 >
 {t("th.billName")}
 </th>
 <th
 scope="col"
 className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground"
 >
 {t("th.category")}
 </th>
 <th
 scope="col"
 className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground"
 >
 {t("th.period")}
 </th>
 <th
 scope="col"
 className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground"
 >
 {t("th.amount")}
 </th>
 <th
 scope="col"
 className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground"
 >
 {t("th.target")}
 </th>
 <th
 scope="col"
 className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground"
 >
 {t("th.dueDate")}
 </th>
 <th
 scope="col"
 className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground"
 >
 {t("th.status")}
 </th>
 <th
 scope="col"
 className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-12"
 ></th>
 </tr>
 </thead>
 <tbody>
 {paged.map((bill) => (
 <tr key={bill.id} className="border-b last:border-0 transition-colors hover:bg-muted/30">
 <td className="px-4 py-3 font-medium">{bill.name}</td>
 <td className="px-4 py-3">{bill.category}</td>
 <td className="px-4 py-3">{bill.period}</td>
 <td className="px-4 py-3 text-right font-medium tabular-nums">
 <AnimatedMoney value={bill.amount} />
 </td>
 <td className="px-4 py-3 capitalize">
 {bill.targetType === "all"
 ? t("bills.targetAll")
 : bill.targetType === "class"
 ? t("bills.targetClass")
 : t("bills.targetSpecific")}
 </td>
 <td className="px-4 py-3">{formatDate(bill.dueDate)}</td>
 <td className="px-4 py-3">
 <StatusBadge status={bill.status} />
 </td>
 <td className="px-4 py-3">
 <DropdownMenu>
 <DropdownMenuTrigger
 render={
 <Button
 variant="ghost"
 size="icon"
 className="h-8 w-8"
 aria-label={`${t("common.actions")} ${bill.name}`}
 />
 }
 >
 <MoreHorizontal className="h-4 w-4" />
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end">
 <DropdownMenuItem onClick={() => openEdit(bill)}>
 <Pencil className="mr-2 h-4 w-4" />
 {t("common.edit")}
 </DropdownMenuItem>
 <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(bill)}>
 <Trash2 className="mr-2 h-4 w-4" />
 {t("bills.delete")}
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {/* Mobile: 8 kolom tidak muat di 375px, jadi daftar kartu. */}
 <ul className="space-y-2 md:hidden">
 {paged.map((bill) => (
 <li key={bill.id} className="rounded-lg border border-border bg-card p-3 text-sm">
 <div className="flex items-start justify-between gap-2">
 <p className="min-w-0 font-medium truncate">{bill.name}</p>
 <StatusBadge status={bill.status} />
 </div>
 <p className="mt-1 text-xs text-muted-foreground truncate">
 {bill.category} · {bill.period}
 </p>
 <div className="mt-2 flex items-center justify-between gap-2">
 <span className="font-semibold tabular-nums">
 <AnimatedMoney value={bill.amount} />
 </span>
 <span className="text-xs text-muted-foreground">{formatDate(bill.dueDate)}</span>
 </div>
 <div className="mt-2 flex flex-wrap gap-1.5">
 <Button
 size="sm"
 variant="outline"
 className="h-10 text-xs"
 onClick={() => openEdit(bill)}
 >
 <Pencil className="mr-1 h-3.5 w-3.5" />
 {t("common.edit")}
 </Button>
 <Button
 size="sm"
 variant="outline"
 className="h-10 text-xs"
 onClick={() => setDeleteTarget(bill)}
 >
 <Trash2 className="mr-1 h-3.5 w-3.5" />
 {t("common.delete")}
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
 label="tagihan"
 />
 </>
 )}
 </div>

 <Dialog open={dialogOpen} onOpenChange={(open) => !open && !saving && setDialogOpen(false)}>
 <DialogContent className="sm:max-w-md">
 <DialogHeader>
 <DialogTitle>{editing ? t("bills.edit") : t("bills.create")}</DialogTitle>
 <DialogDescription>{editing ? t("bills.editDesc") : t("bills.createDesc")}</DialogDescription>
 </DialogHeader>

 <div className="space-y-4">
 <div className="space-y-1.5">
 <label htmlFor="bill-name" className="text-sm font-medium">
 {t("bills.fieldName")} <span className="text-destructive">*</span>
 </label>
 <Input
 id="bill-name"
 value={form.name}
 onChange={(e) => setForm({ ...form, name: e.target.value })}
 placeholder={t("bills.placeholderName")}
 />
 </div>
 <div className="grid gap-4 grid-cols-2">
 <div className="space-y-1.5">
 <label htmlFor="bill-category" className="text-sm font-medium">
 {t("bills.fieldCategory")}
 </label>
 <Input
 id="bill-category"
 value={form.category}
 onChange={(e) => setForm({ ...form, category: e.target.value })}
 placeholder={t("bills.placeholderCategory")}
 />
 </div>
 <div className="space-y-1.5">
 <label htmlFor="bill-amount" className="text-sm font-medium">
 {t("bills.fieldAmount")} <span className="text-destructive">*</span>
 </label>
 <Input
 id="bill-amount"
 type="number"
 min={1}
 value={form.amount}
 onChange={(e) => setForm({ ...form, amount: e.target.value })}
 placeholder="50000"
 />
 </div>
 </div>
 <div className="grid gap-4 grid-cols-2">
 <div className="space-y-1.5">
 <label htmlFor="bill-period" className="text-sm font-medium">
 {t("bills.fieldPeriod")}
 </label>
 <Input
 id="bill-period"
 value={form.period}
 onChange={(e) => setForm({ ...form, period: e.target.value })}
 placeholder="2026/2027"
 />
 </div>
 <div className="space-y-1.5">
 <label className="text-sm font-medium">{t("bills.fieldTarget")}</label>
 <Select
 value={form.targetType}
 onValueChange={(v) =>
 setForm({ ...form, targetType: (v ?? "all") as BillTargetType, targetIds: [] })
 }
 >
 <SelectTrigger className="w-full">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">{t("bills.targetAll")}</SelectItem>
 <SelectItem value="class">{t("bills.targetClass")}</SelectItem>
 <SelectItem value="specific">{t("bills.targetSpecific")}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 <div className="grid gap-4 grid-cols-2">
 <div className="space-y-1.5">
 <label htmlFor="bill-start" className="text-sm font-medium">
 {t("bills.fieldStartDate")}
 </label>
 <Input
 id="bill-start"
 type="date"
 value={form.startDate}
 onChange={(e) => setForm({ ...form, startDate: e.target.value })}
 />
 </div>
 <div className="space-y-1.5">
 <label htmlFor="bill-due" className="text-sm font-medium">
 {t("bills.fieldDueDate")}
 </label>
 <Input
 id="bill-due"
 type="date"
 value={form.dueDate}
 onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
 />
 </div>
 </div>

 {form.targetType === "specific" && (
 <div className="space-y-1.5">
 <label className="text-sm font-medium">{t("bills.chooseStudents")}</label>
 <div className="flex flex-wrap gap-2">
 {active.map((student) => {
 const selected = form.targetIds.includes(student.id);
 return (
 <Button
 key={student.id}
 type="button"
 variant="outline"
 size="sm"
 aria-pressed={selected}
 onClick={() => toggleTarget(student.id)}
 className={
 selected
 ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/10"
 : "border-border"
 }
 >
 {student.name}
 </Button>
 );
 })}
 {active.length === 0 && (
 <p className="text-xs text-muted-foreground">{t("bills.noStudents")}</p>
 )}
 </div>
 </div>
 )}

 {formError && (
 <Alert variant="destructive">
 <AlertDescription>{formError}</AlertDescription>
 </Alert>
 )}
 </div>

 <DialogFooter className="mt-2">
 <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
 {t("common.cancel")}
 </Button>
 <Button onClick={handleSave} disabled={saving}>
 {saving ? (
 <>
 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
 {t("bills.saving")}
 </>
 ) : (
 t("common.save")
 )}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 <Dialog
 open={deleteTarget !== null}
 onOpenChange={(open) => {
 if (!open) setDeleteTarget(null);
 }}
 >
 <DialogContent className="sm:max-w-md">
 <DialogHeader>
 <DialogTitle>{t("bills.deleteConfirmTitle")}</DialogTitle>
 <DialogDescription>
 {deleteTarget && t("bills.confirmDelete", { name: deleteTarget.name })}
 </DialogDescription>
 </DialogHeader>
 <DialogFooter>
 <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
 {t("common.cancel")}
 </Button>
 <Button variant="destructive" onClick={() => void handleDelete()} disabled={deleting}>
 {deleting ? (
 <>
 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
 {t("bills.saving")}
 </>
 ) : (
 t("common.delete")
 )}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </AppShell>
 );
}
