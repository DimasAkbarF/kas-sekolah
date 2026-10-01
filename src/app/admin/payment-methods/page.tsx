"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
 Dialog,
 DialogContent,
 DialogFooter,
 DialogHeader,
 DialogTitle,
 DialogDescription,
} from "@/components/ui/dialog";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { getPaymentMethods } from "@/services/payment.service";
import { apiFetch } from "@/lib/api-client";
import { useI18n } from "@/hooks/use-i18n";
import type { TKey, TParams } from "@/lib/i18n";
import { QrCode, Landmark, Wallet, Plus, Loader2, Trash2, Power, PowerOff } from "lucide-react";
import type { ManualMethodType, PaymentMethodInfo } from "@/types";

const MAX_QRIS_DIM = 1000;

const typeIcons: Record<ManualMethodType, React.ReactNode> = {
 qris: <QrCode className="h-5 w-5" />,
 bank: <Landmark className="h-5 w-5" />,
 ewallet: <Wallet className="h-5 w-5" />,
};

type Feedback = { type: "success" | "error"; text: string } | null;

interface MethodForm {
 type: ManualMethodType;
 name: string;
 className: string;
 accountNumber: string;
 accountHolder: string;
 qrisImage: string;
}

const emptyForm: MethodForm = {
 type: "qris",
 name: "",
 className: "",
 accountNumber: "",
 accountHolder: "",
 qrisImage: "",
};

export default function PaymentMethodsPage() {
 const { t } = useI18n();
 const [methods, setMethods] = useState<PaymentMethodInfo[]>([]);
 const [loading, setLoading] = useState(true);
 const [feedback, setFeedback] = useState<Feedback>(null);
 const [open, setOpen] = useState(false);
 const [saving, setSaving] = useState(false);
 const [form, setForm] = useState<MethodForm>(emptyForm);
 const [imgError, setImgError] = useState("");
 const [deleteTarget, setDeleteTarget] = useState<PaymentMethodInfo | null>(null);

 const typeLabel = (type: ManualMethodType) =>
 type === "qris" ? t("pm.typeQris") : type === "bank" ? t("pm.typeBank") : t("pm.typeEwallet");

 const load = useCallback(() => {
 getPaymentMethods(true)
 .then(setMethods)
 .catch(() => {
 setFeedback({ type: "error", text: t("pm.feedbackLoadError") });
 })
 .finally(() => setLoading(false));
 }, [t]);

 useEffect(load, [load]);

 const resetForm = () => {
 setForm(emptyForm);
 setImgError("");
 };

 function handleOpenAdd() {
 resetForm();
 setOpen(true);
 }

 function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
 const file = e.target.files?.[0];
 e.target.value = "";
 if (!file) return;
 if (!file.type.startsWith("image/")) {
 setImgError(t("pm.errorNotImage"));
 return;
 }
 setImgError("");
 const reader = new FileReader();
 reader.onload = () => {
 const dataUrl = String(reader.result);
 if (!dataUrl.startsWith("data:image")) {
 setImgError(t("pm.errorImageRead"));
 return;
 }
 const img = new Image();
 img.onload = () => {
 const scale = Math.min(1, MAX_QRIS_DIM / Math.max(img.width, img.height));
 const canvas = document.createElement("canvas");
 canvas.width = Math.round(img.width * scale);
 canvas.height = Math.round(img.height * scale);
 const ctx = canvas.getContext("2d");
 if (!ctx) {
 setForm((f) => ({ ...f, qrisImage: dataUrl }));
 return;
 }
 ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
 setForm((f) => ({ ...f, qrisImage: canvas.toDataURL("image/png") }));
 };
 img.onerror = () => setForm((f) => ({ ...f, qrisImage: dataUrl }));
 img.src = dataUrl;
 };
 reader.readAsDataURL(file);
 }

 async function handleSave() {
 setSaving(true);
 setFeedback(null);
 try {
 if (form.type === "qris" && !form.qrisImage) {
 setFeedback({ type: "error", text: t("pm.errorQrisRequired") });
 return;
 }
 await apiFetch<{ ok: boolean }>("/api/payment-methods", {
 method: "POST",
 body: JSON.stringify({
 type: form.type,
 name: form.name.trim() || `${typeLabel(form.type)} ${form.className.trim() || ""}`.trim(),
 className: form.className.trim(),
 accountNumber: form.accountNumber.trim(),
 accountHolder: form.accountHolder.trim(),
 qrisImage: form.qrisImage,
 }),
 });
 setFeedback({ type: "success", text: t("pm.feedbackAdded") });
 setOpen(false);
 resetForm();
 load();
 } catch (err) {
 setFeedback({
 type: "error",
 text: err instanceof Error ? err.message : t("pm.errorSaveGeneric"),
 });
 } finally {
 setSaving(false);
 }
 }

 async function handleToggle(m: PaymentMethodInfo) {
 try {
 await apiFetch<{ ok: boolean }>(`/api/payment-methods/${encodeURIComponent(m.id)}`, {
 method: "PATCH",
 body: JSON.stringify({ active: !m.active }),
 });
 load();
 } catch {
 setFeedback({ type: "error", text: t("pm.feedbackToggleError") });
 }
 }

 async function handleDelete() {
 if (!deleteTarget) return;
 try {
 await apiFetch<{ ok: boolean }>(`/api/payment-methods/${encodeURIComponent(deleteTarget.id)}`, {
 method: "DELETE",
 });
 setFeedback({ type: "success", text: t("pm.feedbackDeleted") });
 load();
 } catch {
 setFeedback({ type: "error", text: t("pm.feedbackDeleteError") });
 } finally {
 setDeleteTarget(null);
 }
 }

 return (
 <AppShell
 role="super_admin"
 breadcrumbs={[
 { label: t("role.super_admin"), href: "/admin/dashboard" },
 { label: t("nav.paymentMethods") },
 ]}
 >
 <div className="space-y-4 max-w-4xl">
 <PageHeader
 title={t("pm.title")}
 subtitle={t("pm.subtitle")}
 accent="cyan"
 icon={<Wallet className="h-5 w-5" />}
 badge={
 <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-md bg-neutral-soft text-neutral-ink border-neutral-line">
 {t("pm.count", { count: methods.length })}
 </span>
 }
 action={
 <Button onClick={handleOpenAdd}>
 <Plus className="mr-2 h-4 w-4" />
 {t("pm.add")}
 </Button>
 }
 />

 {feedback && (
 <Alert variant={feedback.type === "error" ? "destructive" : "default"}>
 <AlertDescription>{feedback.text}</AlertDescription>
 </Alert>
 )}

 {loading ? (
 <div className="p-10 text-center">
 <Loader2 className="inline animate-spin text-muted-foreground" />
 </div>
 ) : methods.length === 0 ? (
 <Card className="border-border/70 shadow-xs">
 <CardContent className="p-10 text-center">
 <p className="text-sm font-medium">{t("pm.emptyTitle")}</p>
 <p className="text-sm text-muted-foreground mt-1">{t("pm.emptyDesc")}</p>
 </CardContent>
 </Card>
 ) : (
 <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
 {methods.map((m) => {
 const label = typeLabel(m.type);
 return (
 <Card
 key={m.id}
 className={`border-border/70 shadow-xs transition-shadow hover:shadow-md ${m.active ? "" : "opacity-60"}`}
 >
 <CardContent className="p-4 space-y-3">
 <div className="flex items-start gap-3">
 <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
 {typeIcons[m.type]}
 </div>
 <div className="min-w-0 flex-1">
 <div className="flex items-center gap-2">
 <p className="text-sm font-semibold truncate">{m.name || label}</p>
 <Badge variant="outline" className="shrink-0 text-xs">
 {label}
 </Badge>
 </div>
 {m.className && (
 <p className="text-xs text-muted-foreground">
 {t("pm.classOf", { name: m.className })}
 </p>
 )}
 {m.accountNumber && (
 <p className="text-sm font-mono text-muted-foreground">
 {m.accountNumber}
 {m.accountHolder ? ` a.n. ${m.accountHolder}` : ""}
 </p>
 )}
 </div>
 <Badge
 variant="outline"
 className={
 m.active
 ? "border-success-line text-success-ink"
 : "border-border text-muted-foreground"
 }
 >
 {m.active ? t("pm.active") : t("pm.inactive")}
 </Badge>
 </div>

 {m.qrisImage && (
 <div className="rounded-lg border bg-muted/40 p-2 inline-block">
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img src={m.qrisImage} alt={t("pm.typeQris")} className="h-32 w-32 object-contain" />
 </div>
 )}

 <div className="flex gap-2 pt-1">
 <Button size="sm" variant="outline" onClick={() => void handleToggle(m)}>
 {m.active ? (
 <PowerOff className="mr-2 h-3.5 w-3.5" />
 ) : (
 <Power className="mr-2 h-3.5 w-3.5" />
 )}
 {m.active ? t("pm.toggleOff") : t("pm.toggleOn")}
 </Button>
 <Button
 size="sm"
 variant="outline"
 className="text-destructive border-destructive/40 hover:bg-destructive/10"
 onClick={() => setDeleteTarget(m)}
 >
 <Trash2 className="mr-2 h-3.5 w-3.5" />
 {t("pm.delete")}
 </Button>
 </div>
 </CardContent>
 </Card>
 );
 })}
 </div>
 )}
 </div>

 <Dialog
 open={deleteTarget !== null}
 onOpenChange={(open) => {
 if (!open) setDeleteTarget(null);
 }}
 >
 <DialogContent className="sm:max-w-md">
 <DialogHeader>
 <DialogTitle>{t("pm.deleteConfirmTitle")}</DialogTitle>
 <DialogDescription>
 {deleteTarget && t("pm.deleteConfirmDesc", { name: deleteTarget.name || t("pm.typeQris") })}
 </DialogDescription>
 </DialogHeader>
 <DialogFooter>
 <Button variant="outline" onClick={() => setDeleteTarget(null)}>
 {t("pm.cancel")}
 </Button>
 <Button variant="destructive" onClick={() => void handleDelete()}>
 {t("pm.delete")}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 <Dialog open={open} onOpenChange={setOpen}>
 <DialogContent className="sm:max-w-md">
 <DialogHeader>
 <DialogTitle>{t("pm.dialogTitle")}</DialogTitle>
 <DialogDescription>{t("pm.dialogDesc")}</DialogDescription>
 </DialogHeader>

 <div className="space-y-4">
 <div className="space-y-2">
 <label htmlFor="method-type" className="text-sm font-medium">
 {t("pm.fieldType")}
 </label>
 <Select
 value={form.type}
 onValueChange={(v) => {
 if (v) setForm((f) => ({ ...f, type: v as ManualMethodType }));
 }}
 >
 <SelectTrigger id="method-type">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="qris">{t("pm.typeQris")}</SelectItem>
 <SelectItem value="bank">{t("pm.typeBank")}</SelectItem>
 <SelectItem value="ewallet">{t("pm.typeEwallet")}</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-2">
 <label htmlFor="method-name" className="text-sm font-medium">
 {t("pm.fieldName")}
 </label>
 <Input
 id="method-name"
 value={form.name}
 onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
 placeholder={
 form.type === "bank"
 ? t("pm.namePlaceholderBank")
 : form.type === "ewallet"
 ? t("pm.namePlaceholderEwallet")
 : t("pm.namePlaceholderQris")
 }
 />
 </div>

 <div className="space-y-2">
 <label htmlFor="method-class-name" className="text-sm font-medium">
 {t("pm.fieldClass")}
 </label>
 <Input
 id="method-class-name"
 value={form.className}
 onChange={(e) => setForm((f) => ({ ...f, className: e.target.value }))}
 placeholder={t("pm.classPlaceholder")}
 />
 </div>

 {form.type === "qris" ? (
 <QrisUpload
 t={t}
 image={form.qrisImage}
 error={imgError}
 onFile={handleFile}
 onClear={() => setForm((f) => ({ ...f, qrisImage: "" }))}
 />
 ) : (
 <>
 <div className="space-y-2">
 <label htmlFor="method-account-number" className="text-sm font-medium">
 {form.type === "ewallet" ? t("pm.fieldAccountEwallet") : t("pm.fieldAccount")}
 </label>
 <Input
 id="method-account-number"
 value={form.accountNumber}
 onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
 placeholder={
 form.type === "ewallet"
 ? t("pm.accountPlaceholderEwallet")
 : t("pm.accountPlaceholderBank")
 }
 />
 </div>
 <div className="space-y-2">
 <label htmlFor="method-account-holder" className="text-sm font-medium">
 {t("pm.fieldHolder")}
 </label>
 <Input
 id="method-account-holder"
 value={form.accountHolder}
 onChange={(e) => setForm((f) => ({ ...f, accountHolder: e.target.value }))}
 placeholder={t("pm.holderPlaceholder")}
 />
 </div>
 </>
 )}
 </div>

 <DialogFooter showCloseButton={!saving}>
 <Button variant="outline" disabled={saving} onClick={() => setOpen(false)}>
 {t("pm.cancel")}
 </Button>
 <Button onClick={() => void handleSave()} disabled={saving}>
 {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
 {t("pm.save")}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </AppShell>
 );
}

function QrisUpload({
 t,
 image,
 error,
 onFile,
 onClear,
}: {
 t: (key: TKey, params?: TParams) => string;
 image: string;
 error: string;
 onFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
 onClear: () => void;
}) {
 return (
 <div className="space-y-2">
 <label htmlFor="method-qris-image" className="text-sm font-medium">
 {t("pm.fieldQrisImage")}
 </label>
 {image ? (
 <div className="flex items-center gap-3">
 <div className="rounded-lg border bg-muted/40 p-2">
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img src={image} alt={t("pm.typeQris")} className="h-32 w-32 object-contain" />
 </div>
 <Button size="sm" variant="ghost" onClick={onClear}>
 {t("pm.replace")}
 </Button>
 </div>
 ) : (
 <input
 id="method-qris-image"
 type="file"
 accept="image/*"
 onChange={onFile}
 className="block w-full max-w-full text-xs text-muted-foreground file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
 />
 )}
 <p className="text-xs text-muted-foreground">{t("pm.qrisHint")}</p>
 {error && <p className="text-xs text-destructive">{error}</p>}
 </div>
 );
}
