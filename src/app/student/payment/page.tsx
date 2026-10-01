"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { getCurrentStudent, getStudentBillById } from "@/services/student.service";
import {
 createDokuPayment,
 getPaymentMethods,
 submitManualPayment,
} from "@/services/payment.service";
import { AnimatedMoney } from "@/components/dashboard/animated-money";
import {
 QrCode,
 Loader2,
 ShieldCheck,
 Landmark,
 Wallet,
 CheckCircle2,
 CreditCard,
 Upload,
} from "lucide-react";
import { useI18n } from "@/hooks/use-i18n";
import type { ManualMethodType, PaymentMethodInfo } from "@/types";

const MAX_DIM = 1200;

type PaymentStep = "review" | "processing" | "sent";

const methodIcon: Record<ManualMethodType, React.ReactNode> = {
 qris: <QrCode className="h-4 w-4" />,
 bank: <Landmark className="h-4 w-4" />,
 ewallet: <Wallet className="h-4 w-4" />,
};

function PaymentContent() {
 const { t } = useI18n();
 const searchParams = useSearchParams();
 const billId = searchParams.get("bill");

 const [step, setStep] = useState<PaymentStep>("review");
 const [paymentError, setPaymentError] = useState<string | null>(null);
 const [methods, setMethods] = useState<PaymentMethodInfo[]>([]);
 const [selected, setSelected] = useState<PaymentMethodInfo | null>(null);
 const [proof, setProof] = useState("");
 const [proofName, setProofName] = useState("");
 const [proofError, setProofError] = useState("");
 const [methodsError, setMethodsError] = useState(false);

 const student = getCurrentStudent();
 const bill = useMemo(
 () => (student && billId ? getStudentBillById(billId, student) : undefined),
 [student, billId],
 );

 // Kelas siswa (dari server, lewat store tersinkron), bukan lagi nama kelas global.
 const studentClassId = student?.classId ?? null;

 useEffect(() => {
 let alive = true;
 getPaymentMethods()
 .then((list) => {
 if (!alive) return;
 // Metode milik kelas siswa + metode sekolah (classId null). Server sudah
 // menyaring, pemangkasan ini hanya jaga-jaga bila data lama belum punya classId.
 setMethods(list.filter((m) => m.type !== "qris" || !m.classId || m.classId === studentClassId));
 })
 .catch((err) => {
 // Jangan ditelan: tanpa ini `methods` tetap [] dan siswa melihat
 //"tidak ada metode"tanpa tahu itu error.
 console.error("[payment] gagal memuat metode pembayaran", err);
 if (alive) setMethodsError(true);
 });
 return () => {
 alive = false;
 };
 }, [studentClassId]);

 async function handleDoku() {
 if (!bill || !student) return;
 setPaymentError(null);
 setStep("processing");

 const response = await createDokuPayment(bill.id);
 if (response.ok && response.paymentUrl) {
 window.location.href = response.paymentUrl;
 return;
 }

 setPaymentError(response.message || t("student.paymentErrorDoku"));
 setStep("review");
 }

 function handleProofFile(e: React.ChangeEvent<HTMLInputElement>) {
 const file = e.target.files?.[0];
 e.target.value = "";
 if (!file) return;
 if (!file.type.startsWith("image/")) {
 setProofError(t("student.proofTypeError"));
 return;
 }
 setProofError("");
 setProofName(file.name);

 const reader = new FileReader();
 reader.onload = () => {
 const dataUrl = String(reader.result);
 if (!dataUrl.startsWith("data:image")) {
 setProofError(t("student.proofReadError"));
 return;
 }
 const img = new Image();
 img.onload = () => {
 const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
 const canvas = document.createElement("canvas");
 canvas.width = Math.round(img.width * scale);
 canvas.height = Math.round(img.height * scale);
 const ctx = canvas.getContext("2d");
 if (!ctx) {
 setProof(dataUrl);
 return;
 }
 ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
 // JPEG ringan agar muat disimpan ke DB.
 setProof(canvas.toDataURL("image/jpeg", 0.8));
 };
 img.onerror = () => {
 setProof(dataUrl);
 };
 img.src = dataUrl;
 };
 reader.readAsDataURL(file);
 }

 async function handleManualSubmit() {
 if (!bill || !student || !selected) return;
 if (!proof) {
 setProofError(t("student.proofRequired"));
 return;
 }
 setPaymentError(null);
 setStep("processing");

 const paymentMethod =
 selected.type === "bank" ? "bank_transfer" : selected.type === "ewallet" ? "ewallet" : "qris";

 const result = await submitManualPayment({
 billId: bill.id,
 amount: bill.amount,
 paymentMethod,
 methodId: selected.id,
 proofImage: proof,
 });

 if (result.ok) {
 setStep("sent");
 return;
 }
 setPaymentError(result.message || t("student.paymentErrorSubmit"));
 setStep("review");
 }

 if (!student) return null;

 if (!bill) {
 return (
 <AppShell
 role="student"
 breadcrumbs={[
 { label: t("role.student"), href: "/student/dashboard" },
 { label: t("nav.payment") },
 ]}
 >
 <EmptyState
 title={t("student.billNotFound")}
 description={t("student.billNotFoundDesc")}
 action={
 <Button nativeButton={false} render={<Link href="/student/bills" />}>
 {t("student.backToBills")}
 </Button>
 }
 />
 </AppShell>
 );
 }

 if (step === "sent") {
 return (
 <AppShell
 role="student"
 breadcrumbs={[
 { label: t("role.student"), href: "/student/dashboard" },
 { label: t("nav.payment") },
 ]}
 >
 <div className="space-y-6 max-w-lg mx-auto">
 <Card className="border-border/70 shadow-xs">
 <CardContent className="p-8 text-center space-y-4">
 <div className="flex justify-center">
 <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
 <CheckCircle2 className="h-6 w-6 text-success" />
 </div>
 </div>
 <div>
 <h3 className="font-medium text-base">{t("student.resultPending")}</h3>
 <p className="text-sm text-muted-foreground mt-1">
 {t("student.resultPendingBody", {
 name: proofName || t("student.you"),
 })}
 </p>
 </div>
 <div className="flex justify-center gap-2 pt-2">
 <Button nativeButton={false} render={<Link href="/student/bills" />}>
 {t("student.backToBills")}
 </Button>
 <Button variant="outline" nativeButton={false} render={<Link href="/student/history" />}>
 {t("student.viewHistory")}
 </Button>
 </div>
 </CardContent>
 </Card>
 </div>
 </AppShell>
 );
 }

 return (
 <AppShell
 role="student"
 breadcrumbs={[
 { label: t("role.student"), href: "/student/dashboard" },
 { label: t("student.myBills"), href: "/student/bills" },
 { label: t("nav.payment") },
 ]}
 >
 <div className="space-y-6 max-w-lg">
 <PageHeader
 title={t("student.paymentTitle")}
 subtitle={t("student.paymentSubtitle")}
 accent="teal"
 icon={<CreditCard className="h-5 w-5" />}
 />

 {paymentError && (
 <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{paymentError}</div>
 )}

 {step === "review" && (
 <>
 <Card className="shadow-card border-border">
 <CardContent className="space-y-4 p-5">
 <div className="space-y-2.5">
 <div className="flex justify-between text-sm">
 <span className="text-muted-foreground">{t("student.billName")}</span>
 <span className="font-medium text-right">{bill.name}</span>
 </div>
 <div className="flex justify-between text-sm">
 <span className="text-muted-foreground">{t("th.amount")}</span>
 <span className="font-medium tabular-nums">
 <AnimatedMoney value={bill.amount} />
 </span>
 </div>
 <div className="border-t pt-2 flex justify-between text-sm">
 <span className="font-medium">{t("common.total")}</span>
 <span className="font-semibold tabular-nums">
 <AnimatedMoney value={bill.amount} />
 </span>
 </div>
 </div>

 <div className="space-y-2">
 <span className="text-sm font-medium">{t("student.paymentMethod")}</span>

 <div className="flex items-center justify-between p-3 rounded-lg border border-primary/40 bg-secondary/35">
 <div className="flex items-center gap-3">
 <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center">
 <QrCode className="h-5 w-5" />
 </div>
 <div>
 <p className="text-sm font-medium">{t("student.dokuGatewayName")}</p>
 <p className="text-[11px] text-muted-foreground">{t("student.dokuGatewayDesc")}</p>
 </div>
 </div>
 <Badge variant="outline" className="border-primary/40 text-primary text-xs font-medium">
 {t("student.multiKanal")}
 </Badge>
 </div>
 </div>

 <Button variant="gold" size="lg" className="w-full" onClick={handleDoku}>
 {t("student.payDoku")}
 </Button>
 <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
 <ShieldCheck className="h-3.5 w-3.5 text-success" />
 <span>{t("student.dokuSecure")}</span>
 </div>
 </CardContent>
 </Card>

 <Card className="shadow-card border-border">
 <CardContent className="space-y-4 p-5">
 <div>
 <h3 className="text-sm font-semibold">{t("student.manualTitle")}</h3>
 <p className="text-xs text-muted-foreground">{t("student.manualDesc")}</p>
 </div>

 {methodsError ? (
 <p role="alert" className="text-sm text-destructive py-2">
 {t("common.errorDesc")}
 </p>
 ) : methods.length === 0 ? (
 <p className="text-sm text-muted-foreground py-2">{t("student.noManualMethod")}</p>
 ) : (
 <div className="space-y-2">
 {methods.map((m) => (
 <button
 key={m.id}
 type="button" // Status terpilih tidak boleh hanya lewat warna (DESIGN.md): norak, dan
 // pembaca layar tidak punya cara tahu mana yang aktif.
 aria-pressed={selected?.id === m.id}
 onClick={() => setSelected(m)}
 className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
 selected?.id === m.id
 ? "border-primary bg-secondary/50 shadow-teal-sm"
 : "border-border bg-card hover:border-primary/40 hover:bg-secondary/20"
 }`}
 >
 <div className="h-9 w-9 shrink-0 rounded-md bg-muted text-muted-foreground flex items-center justify-center">
 {methodIcon[m.type]}
 </div>
 <div className="min-w-0 flex-1">
 <p className="text-sm font-medium">{m.name}</p>
 <p className="text-[11px] text-muted-foreground truncate">
 {m.type === "qris"
 ? t("student.qrisScanHint")
 : m.accountNumber
 ? `${m.accountNumber}${m.accountHolder ? ` a.n. ${m.accountHolder}` : ""}`
 : ""}
 </p>
 </div>
 <Badge variant="outline" className="shrink-0 text-xs">
 {m.type === "qris"
 ? t("student.methodQris")
 : m.type === "bank"
 ? t("student.methodBank")
 : t("student.methodEwallet")}
 </Badge>
 </button>
 ))}
 </div>
 )}

 {selected && (
 <div className="space-y-3 rounded-lg border p-3">
 {selected.type === "qris" && selected.qrisImage && (
 <div className="flex flex-col sm:flex-row items-center gap-3">
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img
 src={selected.qrisImage}
 alt={`QRIS ${selected.name}`}
 className="h-40 w-40 rounded-lg border bg-white p-1 object-contain"
 />
 <p className="text-[11px] text-muted-foreground">{t("student.qrisScanDesc")}</p>
 </div>
 )}
 {selected.type !== "qris" && (
 <div className="space-y-1 text-sm">
 <div className="flex justify-between">
 <span className="text-muted-foreground">{t("student.transferDestination")}</span>
 <span className="font-medium">{selected.name}</span>
 </div>
 {selected.accountNumber && (
 <div className="flex justify-between">
 <span className="text-muted-foreground">{t("student.accountNumber")}</span>
 <span className="font-medium font-mono">{selected.accountNumber}</span>
 </div>
 )}
 {selected.accountHolder && (
 <div className="flex justify-between">
 <span className="text-muted-foreground">{t("student.accountHolder")}</span>
 <span className="font-medium">{selected.accountHolder}</span>
 </div>
 )}
 </div>
 )}

 <div className="space-y-2">
 <span className="text-sm font-medium">{t("student.proofTitle")}</span>
 {proof ? (
 <div className="flex items-center gap-3">
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img
 src={proof}
 alt="Bukti pembayaran"
 className="h-20 w-20 rounded-md border object-cover"
 />
 <div className="space-y-1">
 <p className="text-xs text-muted-foreground truncate max-w-[180px]">{proofName}</p>
 <Button size="sm" variant="outline" onClick={() => setProof("")}>
 {t("student.changeProof")}
 </Button>
 </div>
 </div>
 ) : (
 <label className="group flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-muted/40 px-4 py-5 text-center cursor-pointer transition-colors hover:border-primary/40 hover:bg-primary/5">
 <span className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground group-hover:text-primary transition-colors">
 <Upload className="h-4 w-4" />
 </span>
 <span className="text-xs font-medium text-foreground">{t("student.proofInput")}</span>
 <span className="text-[11px] text-muted-foreground">{t("student.proofFormat")}</span>
 <input
 type="file"
 accept="image/*"
 onChange={handleProofFile}
 className="sr-only"
 aria-label={t("student.proofInput")}
 />
 </label>
 )}
 {proofError && <p className="text-xs text-destructive">{proofError}</p>}
 </div>

 <Button
 className="w-full"
 variant="outline"
 disabled={!proof}
 title={proof ? "" : t("student.proofRequired")}
 onClick={() => void handleManualSubmit()}
 >
 {t("student.submitProof")}
 </Button>
 <p className="text-[11px] text-muted-foreground text-center">
 {t("student.pendingNote")}
 </p>
 </div>
 )}
 </CardContent>
 </Card>
 </>
 )}

 {step === "processing" && (
 <Card className="shadow-card border-border">
 <CardContent className="p-8 text-center space-y-4">
 <div className="flex justify-center">
 <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
 <Loader2 className="h-6 w-6 text-warning animate-spin" />
 </div>
 </div>
 <div>
 <h3 className="font-medium">{t("student.processingTitle")}</h3>
 <p className="text-sm text-muted-foreground mt-1">{t("student.processingDesc")}</p>
 </div>
 </CardContent>
 </Card>
 )}
 </div>
 </AppShell>
 );
}

export default function StudentPaymentPage() {
 const { t } = useI18n();
 return (
 <Suspense
 fallback={<div className="p-6 text-sm text-muted-foreground">{t("common.loading")}</div>}
 >
 <PaymentContent />
 </Suspense>
 );
}
