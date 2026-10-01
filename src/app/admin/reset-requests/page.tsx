"use client";

import { useEffect, useMemo, useState } from "react";
import { PASSWORD_MIN_LENGTH } from "@/lib/password-policy";
import { AppShell } from "@/components/layout/app-shell";
import { cn } from "@/lib/utils";
import { tableSurface } from "@/components/layout/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogFooter,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, KeyRound, Check, X, Loader2, Clock } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/formatters";
import { useI18n } from "@/hooks/use-i18n";
import type { PasswordResetRequest, ResetRequestStatus } from "@/types";

interface ExtendedResetRequest extends PasswordResetRequest {
 resolvedByName?: string | null;
}

export default function AdminResetRequestsPage() {
 const { t } = useI18n();
 const [requests, setRequests] = useState<ExtendedResetRequest[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [tab, setTab] = useState<"pending" | "all" | "approved" | "rejected">("pending");
 const [search, setSearch] = useState("");
 const [feedback, setFeedback] = useState<string | null>(null);
 const [loadError, setLoadError] = useState<string | null>(null);

 // Approve dialog state
 const [approveTarget, setApproveTarget] = useState<ExtendedResetRequest | null>(null);
 const [newPassword, setNewPassword] = useState("");
 const [confirmPassword, setConfirmPassword] = useState("");
 const [approveError, setApproveError] = useState<string | null>(null);
 const [isApproving, setIsApproving] = useState(false);

 // Reject dialog state
 const [rejectTarget, setRejectTarget] = useState<ExtendedResetRequest | null>(null);
 const [rejectNote, setRejectNote] = useState("");
 const [rejectError, setRejectError] = useState<string | null>(null);
 const [isRejecting, setIsRejecting] = useState(false);

 const refreshRequests = () => {
 apiFetch<{ requests: ExtendedResetRequest[] }>("/api/admin/reset-requests")
 .then((res) => {
 setRequests(res.requests ?? []);
 setLoadError(null);
 })
 .catch((err: unknown) => {
 setLoadError(err instanceof Error && err.message ? err.message : t("resetReq.loadFailed"));
 })
 .finally(() => setIsLoading(false));
 };

 useEffect(() => {
 let active = true;
 apiFetch<{ requests: ExtendedResetRequest[] }>("/api/admin/reset-requests")
 .then((res) => {
 if (active) setRequests(res.requests ?? []);
 })
 .catch((err: unknown) => {
 if (active) {
 setLoadError(err instanceof Error && err.message ? err.message : t("resetReq.loadFailed"));
 }
 })
 .finally(() => {
 if (active) setIsLoading(false);
 });
 return () => {
 active = false;
 };
 }, [t]);

 useEffect(() => {
 if (!feedback) return;
 const id = setTimeout(() => setFeedback(null), 4000);
 return () => clearTimeout(id);
 }, [feedback]);

 const pendingList = useMemo(() => requests.filter((r) => r.status === "pending"), [requests]);
 const approvedList = useMemo(() => requests.filter((r) => r.status === "approved"), [requests]);
 const rejectedList = useMemo(() => requests.filter((r) => r.status === "rejected"), [requests]);

 const filtered = useMemo(() => {
 let list: ExtendedResetRequest[] = requests;
 if (tab === "pending") list = pendingList;
 else if (tab === "approved") list = approvedList;
 else if (tab === "rejected") list = rejectedList;

 const q = search.trim().toLowerCase();
 if (!q) return list;
 return list.filter(
 (r) => r.nisn.toLowerCase().includes(q) || r.studentName.toLowerCase().includes(q),
 );
 }, [requests, tab, pendingList, approvedList, rejectedList, search]);

 function openApprove(req: ExtendedResetRequest) {
 setApproveTarget(req);
 setNewPassword("");
 setConfirmPassword("");
 setApproveError(null);
 }

 async function handleApprove() {
 if (!approveTarget) return;
 if (newPassword.length < PASSWORD_MIN_LENGTH) {
 setApproveError(`Password baru minimal ${PASSWORD_MIN_LENGTH} karakter.`);
 return;
 }
 if (newPassword !== confirmPassword) {
 setApproveError("Konfirmasi password tidak cocok.");
 return;
 }

 setApproveError(null);
 setIsApproving(true);
 try {
 await apiFetch<{ ok: boolean }>(`/api/admin/reset-requests/${approveTarget.id}/approve`, {
 method: "POST",
 body: JSON.stringify({ newPassword }),
 });
 setFeedback(`Password untuk ${approveTarget.studentName} berhasil diatur ulang!`);
 setApproveTarget(null);
 refreshRequests();
 } catch (err) {
 setApproveError(
 err instanceof ApiError && err.message ? err.message : "Gagal menyetujui permintaan reset.",
 );
 } finally {
 setIsApproving(false);
 }
 }

 function openReject(req: ExtendedResetRequest) {
 setRejectTarget(req);
 setRejectNote("");
 setRejectError(null);
 }

 async function handleReject() {
 if (!rejectTarget) return;

 setRejectError(null);
 setIsRejecting(true);
 try {
 await apiFetch<{ ok: boolean }>(`/api/admin/reset-requests/${rejectTarget.id}/reject`, {
 method: "POST",
 body: JSON.stringify({ note: rejectNote }),
 });
 setFeedback(`Permintaan reset dari ${rejectTarget.studentName} ditolak.`);
 setRejectTarget(null);
 refreshRequests();
 } catch (err) {
 setRejectError(
 err instanceof ApiError && err.message ? err.message : "Gagal menolak permintaan reset.",
 );
 } finally {
 setIsRejecting(false);
 }
 }

 function renderStatusBadge(status: ResetRequestStatus) {
 switch (status) {
 case "pending":
 return (
 <Badge
 variant="outline"
 className="border-warning-line bg-warning-soft text-warning-ink text-xs font-medium"
 >
 <Clock className="mr-1 h-3.5 w-3.5" />
 {t("resetReq.statusPending")}
 </Badge>
 );
 case "approved":
 return (
 <Badge
 variant="outline"
 className="border-success-line bg-success-soft text-success-ink text-xs font-medium"
 >
 <Check className="mr-1 h-3.5 w-3.5" />
 {t("resetReq.statusApproved")}
 </Badge>
 );
 case "rejected":
 return (
 <Badge
 variant="outline"
 className="border-destructive/30 bg-destructive/10 text-destructive text-xs font-medium"
 >
 <X className="mr-1 h-3.5 w-3.5" />
 {t("resetReq.statusRejected")}
 </Badge>
 );
 }
 }

 return (
 <AppShell
 role="super_admin"
 breadcrumbs={[
 { label: t("role.super_admin"), href: "/admin/dashboard" },
 { label: t("resetReq.title") },
 ]}
 >
 <div className="space-y-6">
 <PageHeader
 title={t("resetReq.title")}
 subtitle={t("resetReq.subtitle")}
 accent="slate"
 icon={<KeyRound className="h-5 w-5" />}
 badge={
 <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-md bg-neutral-soft text-neutral-ink border-neutral-line">
 {pendingList.length} Menunggu
 </span>
 }
 />

 {loadError && (
 <Alert variant="destructive">
 <AlertDescription>
 {t("resetReq.loadFailed")} {loadError}
 </AlertDescription>
 </Alert>
 )}

 {feedback && (
 <Alert className="border-success-line bg-success-soft text-success-ink">
 <AlertDescription>{feedback}</AlertDescription>
 </Alert>
 )}

 <Tabs
 value={tab}
 onValueChange={(v) => setTab(v as "pending" | "all" | "approved" | "rejected")}
 >
 <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
 <TabsList>
 <TabsTrigger value="pending">
 {t("resetReq.tabPending", { n: pendingList.length })}
 </TabsTrigger>
 <TabsTrigger value="approved">
 {t("resetReq.tabApproved", { n: approvedList.length })}
 </TabsTrigger>
 <TabsTrigger value="rejected">
 {t("resetReq.tabRejected", { n: rejectedList.length })}
 </TabsTrigger>
 <TabsTrigger value="all">{t("resetReq.tabAll", { n: requests.length })}</TabsTrigger>
 </TabsList>

 <div className="relative w-full max-w-xs">
 <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
 <Input
 placeholder={t("accounts.searchPlaceholder")}
 aria-label={t("accounts.searchPlaceholder")}
 className="pl-8 h-9 text-xs"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 />
 </div>
 </div>

 <TabsContent value={tab} className="mt-4">
 <Card className="border-border/70 shadow-xs">
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium">
 {tab === "pending"
 ? "Permintaan Menunggu Persetujuan"
 : tab === "approved"
 ? "Permintaan Disetujui"
 : tab === "rejected"
 ? "Permintaan Ditolak"
 : "Semua Permintaan Reset"}
 </CardTitle>
 </CardHeader>
 <CardContent className="pt-0">
 {isLoading ? (
 <div className="py-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
 <Loader2 className="h-4 w-4 animate-spin" />
 Memuat data permintaan...
 </div>
 ) : filtered.length === 0 ? (
 <EmptyState
 title={
 search
 ? "Tidak ada hasil pencarian"
 : tab === "pending"
 ? t("resetReq.emptyPending")
 : "Tidak ada data riwayat reset"
 }
 description={
 search
 ? "Coba gunakan kata kunci pencarian yang lain."
 : "Permintaan reset password dari siswa akan tampil di sini."
 }
 />
 ) : (
 <div className={cn(tableSurface)}>
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b bg-muted/50">
 <th scope="col" className="text-left px-4 py-2 text-xs font-medium">
 {t("resetReq.colNisn")}
 </th>
 <th scope="col" className="text-left px-4 py-2 text-xs font-medium">
 {t("resetReq.colName")}
 </th>
 <th scope="col" className="text-left px-4 py-2 text-xs font-medium">
 {t("resetReq.colDate")}
 </th>
 <th scope="col" className="text-left px-4 py-2 text-xs font-medium">
 {t("resetReq.colStatus")}
 </th>
 <th scope="col" className="text-left px-4 py-2 text-xs font-medium">
 Keterangan
 </th>
 <th scope="col" className="text-right px-4 py-2 text-xs font-medium">
 {t("resetReq.colAction")}
 </th>
 </tr>
 </thead>
 <tbody>
 {filtered.map((req) => (
 <tr key={req.id} className="border-b last:border-0 hover:bg-muted/30">
 <td className="px-4 py-2.5 font-mono text-xs">{req.nisn}</td>
 <td className="px-4 py-2.5 font-medium">{req.studentName}</td>
 <td className="px-4 py-2.5 text-xs text-muted-foreground">
 {formatDateTime(req.createdAt)}
 </td>
 <td className="px-4 py-2.5">{renderStatusBadge(req.status)}</td>
 <td className="px-4 py-2.5 text-xs text-muted-foreground">
 {req.status === "approved" && req.resolvedAt
 ? `Disetujui ${formatDateTime(req.resolvedAt)}`
 : req.status === "rejected"
 ? req.adminNote || "Ditolak oleh admin"
 : "Menunggu tindakan admin"}
 </td>
 <td className="px-4 py-2.5 text-right">
 {req.status === "pending" ? (
 <div className="flex items-center justify-end gap-1.5">
 <Button
 size="sm"
 onClick={() => openApprove(req)}
 className="h-8 text-xs" variant="success"
 >
 <KeyRound className="mr-1.5 h-3.5 w-3.5" />
 {t("resetReq.approveBtn")}
 </Button>
 <Button
 size="sm"
 variant="outline"
 onClick={() => openReject(req)}
 className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
 >
 <X className="mr-1 h-3.5 w-3.5" />
 {t("resetReq.rejectBtn")}
 </Button>
 </div>
 ) : (
 <span className="text-xs text-muted-foreground font-mono">Selesai</span>
 )}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </CardContent>
 </Card>
 </TabsContent>
 </Tabs>

 {/* Dialog Approve / Set New Password */}
 <Dialog open={approveTarget !== null} onOpenChange={(open) => !open && setApproveTarget(null)}>
 <DialogContent className="sm:max-w-md">
 <DialogHeader>
 <DialogTitle>{t("resetReq.dialogApproveTitle")}</DialogTitle>
 <DialogDescription>
 {t("resetReq.dialogApproveDesc", {
 name: approveTarget?.studentName ?? "",
 nisn: approveTarget?.nisn ?? "",
 })}
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-4 py-2">
 <div className="space-y-1.5">
 <label htmlFor="req-new-password" className="text-sm font-medium">
 {t("resetReq.newPasswordLabel")}
 {""}
 <span className="text-destructive">*</span>
 </label>
 <Input
 id="req-new-password"
 type="text"
 value={newPassword}
 onChange={(e) => setNewPassword(e.target.value)}
 placeholder={t("resetReq.newPasswordPlaceholder")}
 disabled={isApproving}
 autoComplete="off"
 />
 <p className="text-xs text-muted-foreground">
 Minimal 6 karakter. Password ini yang akan digunakan siswa untuk login.
 </p>
 </div>

 <div className="space-y-1.5">
 <label htmlFor="req-confirm-password" className="text-sm font-medium">
 {t("resetReq.confirmPasswordLabel")}
 {""}
 <span className="text-destructive">*</span>
 </label>
 <Input
 id="req-confirm-password"
 type="text"
 value={confirmPassword}
 onChange={(e) => setConfirmPassword(e.target.value)}
 placeholder={t("resetReq.confirmPasswordPlaceholder")}
 disabled={isApproving}
 autoComplete="off"
 />
 </div>

 {approveError && (
 <Alert variant="destructive">
 <AlertDescription className="text-xs">{approveError}</AlertDescription>
 </Alert>
 )}
 </div>

 <DialogFooter>
 <Button variant="outline" onClick={() => setApproveTarget(null)} disabled={isApproving}>
 {t("common.cancel")}
 </Button>
 <Button
 onClick={handleApprove}
 disabled={isApproving}
 variant="success"
 >
 {isApproving ? (
 <>
 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
 Menyimpan...
 </>
 ) : (
 "Setujui & Simpan Password"
 )}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Dialog Reject Request */}
 <Dialog open={rejectTarget !== null} onOpenChange={(open) => !open && setRejectTarget(null)}>
 <DialogContent className="sm:max-w-md">
 <DialogHeader>
 <DialogTitle>{t("resetReq.dialogRejectTitle")}</DialogTitle>
 <DialogDescription>
 {t("resetReq.dialogRejectDesc", {
 name: rejectTarget?.studentName ?? "",
 })}
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-3 py-2">
 <div className="space-y-1.5">
 <label htmlFor="req-note" className="text-sm font-medium">
 {t("resetReq.rejectNoteLabel")}
 </label>
 <Input
 id="req-note"
 value={rejectNote}
 onChange={(e) => setRejectNote(e.target.value)}
 placeholder={t("resetReq.rejectNotePlaceholder")}
 disabled={isRejecting}
 />
 </div>

 {rejectError && (
 <Alert variant="destructive">
 <AlertDescription className="text-xs">{rejectError}</AlertDescription>
 </Alert>
 )}
 </div>

 <DialogFooter>
 <Button variant="outline" onClick={() => setRejectTarget(null)} disabled={isRejecting}>
 {t("common.cancel")}
 </Button>
 <Button variant="destructive" onClick={handleReject} disabled={isRejecting}>
 {isRejecting ? (
 <>
 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
 Menolak...
 </>
 ) : (
 "Tolak Permintaan"
 )}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 </AppShell>
 );
}
