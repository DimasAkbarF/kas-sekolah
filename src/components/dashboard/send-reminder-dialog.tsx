"use client";

import { useMemo, useState } from "react";
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogFooter,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
 Bell,
 BellRing,
 CheckCircle2,
 Loader2,
 Mail,
 Search,
 Send,
 Users,
 AlertTriangle,
 X,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { Student } from "@/types";

export interface SendReminderDialogProps {
 students: Student[];
 unpaidStudentIds: string[];
 onSuccess?: () => void;
 className?: string;
}

export function SendReminderDialog({
 students,
 unpaidStudentIds,
 onSuccess,
 className,
}: SendReminderDialogProps) {
 const [formOpen, setFormOpen] = useState(false);
 const [confirmOpen, setConfirmOpen] = useState(false);

 // Form states dengan default value sesuai spesifikasi
 const [title, setTitle] = useState("Pengingat Pembayaran");
 const [message, setMessage] = useState("Jangan lupa melakukan pembayaran tagihan bulan ini.");
 const [targetType, setTargetType] = useState<"all" | "unpaid" | "specific">("unpaid");
 const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
 const [channelWeb, setChannelWeb] = useState(true);
 const [channelEmail, setChannelEmail] = useState(true);

 // Search filter untuk target spesifik
 const [searchQuery, setSearchQuery] = useState("");

 // Loading & feedback states
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [errorMessage, setErrorMessage] = useState<string | null>(null);
 const [toastMessage, setToastMessage] = useState<{
 text: string;
 type: "success" | "warning";
 } | null>(null);

 const activeStudents = useMemo(() => students.filter((s) => !s.archived), [students]);

 // Hitung jumlah target siswa aktif
 const targetCount = useMemo(() => {
 if (targetType === "all") return activeStudents.length;
 if (targetType === "unpaid") return unpaidStudentIds.length;
 return selectedStudentIds.length;
 }, [targetType, activeStudents.length, unpaidStudentIds.length, selectedStudentIds.length]);

 // Daftar siswa terfilter untuk mode specific
 const filteredStudents = useMemo(() => {
 if (!searchQuery.trim()) return activeStudents;
 const q = searchQuery.toLowerCase();
 return activeStudents.filter(
 (s) =>
 s.name.toLowerCase().includes(q) ||
 s.nisn.toLowerCase().includes(q) ||
 s.nis.toLowerCase().includes(q) ||
 (s.className && s.className.toLowerCase().includes(q)),
 );
 }, [activeStudents, searchQuery]);

 const handleOpenForm = () => {
 setErrorMessage(null);
 setFormOpen(true);
 };

 const handleCloseForm = () => {
 if (isSubmitting) return;
 setFormOpen(false);
 };

 // Validasi sebelum membuka modal konfirmasi anti-spam
 const handleProceedToConfirm = (e: React.FormEvent) => {
 e.preventDefault();
 setErrorMessage(null);

 if (!title.trim()) {
 setErrorMessage("Judul pengingat tidak boleh kosong.");
 return;
 }
 if (!message.trim()) {
 setErrorMessage("Pesan pengingat tidak boleh kosong.");
 return;
 }
 if (!channelWeb && !channelEmail) {
 setErrorMessage("Pilih minimal satu saluran pengiriman (Notifikasi Web atau Email).");
 return;
 }
 if (targetType === "specific" && selectedStudentIds.length === 0) {
 setErrorMessage("Pilih minimal satu siswa untuk target spesifik.");
 return;
 }
 if (targetCount === 0) {
 setErrorMessage("Target pengingat tidak memiliki siswa aktif.");
 return;
 }

 setConfirmOpen(true);
 };

 // Eksekusi pengiriman ke backend
 const handleSendReminder = async () => {
 if (isSubmitting) return;
 setIsSubmitting(true);
 setErrorMessage(null);

 const channels: ("web" | "email")[] = [];
 if (channelWeb) channels.push("web");
 if (channelEmail) channels.push("email");

  try {
  const res = await apiFetch<{
  ok: boolean;
  targetCount: number;
  webCount: number;
  emailSentCount: number;
  emailFailedCount: number;
  emailSkippedCount: number;
  }>("/api/admin/reminders", {
  method: "POST",
  body: JSON.stringify({
  title: title.trim(),
  message: message.trim(),
  targetType,
  targetStudentIds: targetType === "specific" ? selectedStudentIds : [],
  channels,
  }),
  });

  // Ringkasan jujur: angka berasal dari response server (hasil provider),
  // bukan dari asumsi "tidak ada error = semua terkirim".
  const web = channels.includes("web");
  const email = channels.includes("email");
  const parts: string[] = [
  `${res.targetCount} siswa targeted`,
  ];
  if (web) parts.push(`${res.webCount} notifikasi web dibuat`);
  if (email) {
  if (res.emailSentCount > 0) parts.push(`${res.emailSentCount} email terkirim`);
  if (res.emailFailedCount > 0) parts.push(`${res.emailFailedCount} email gagal`);
  if (res.emailSkippedCount > 0) {
  parts.push(`${res.emailSkippedCount} siswa tanpa email valid`);
  }
  }

  // "Gagal" bukan hanya saat provider error: email yang dipilih tapi nol
  // terkirim (semua alamat kosong/invalid) juga bukan keberhasilan.
  const hasFailure =
 res.emailFailedCount > 0 || (email && res.emailSentCount === 0);
  setToastMessage({
  text: parts.join(". ") + ".",
  type: hasFailure ? "warning" : "success",
  });


 // Trigger event agar notification bell di header terupdate
 window.dispatchEvent(new CustomEvent("kas:reminder-sent"));

 // Tutup kedua modal
 setConfirmOpen(false);
 setFormOpen(false);

 // Callback refresh riwayat pengingat
 onSuccess?.();

 // Reset auto-dismiss toast setelah 5 detik
 setTimeout(() => {
 setToastMessage(null);
 }, 5000);
 } catch (err: unknown) {
 console.error("Gagal mengirim pengingat:", err);
 const msg = err instanceof Error ? err.message : "Terjadi kendala saat mengirim pengingat.";
 setErrorMessage(msg);
 setConfirmOpen(false);
 } finally {
 setIsSubmitting(false);
 }
 };

 const toggleSelectStudent = (id: string) => {
 setSelectedStudentIds((prev) =>
 prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
 );
 };

 const handleSelectAllFiltered = () => {
 const ids = filteredStudents.map((s) => s.id);
 setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...ids])));
 };

 const handleDeselectAll = () => {
 setSelectedStudentIds([]);
 };

 return (
 <>
 {/* ── Action Button: Kirim Pengingat (Primary Color DESIGN.md) ── */}
 <Button
 type="button"
 onClick={handleOpenForm}
 className={cn(
 "h-9 px-3.5 rounded-lg font-semibold text-xs sm:text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow-teal-sm active:scale-[0.98] transition-all flex items-center gap-1.5",
 className,
 )}
 >
 <Send className="h-3.5 w-3.5 shrink-0" />
 <span>Kirim Pengingat</span>
 </Button>

 {/* ── Toast Feedback Notification ── */}
 {toastMessage && (
 <div
 role="status"
 aria-live="polite"
 className={cn(
 "fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-xs sm:text-sm font-medium animate-in fade-in-0 slide-in-from-bottom-4 duration-200",
 toastMessage.type === "success"
 ? "bg-success-soft text-success-ink"
 : "bg-warning-soft border-warning-line text-warning-ink",
 )}
 >
 {toastMessage.type === "success" ? (
 <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
 ) : (
 <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
 )}
 <span className="flex-1">{toastMessage.text}</span>
 <button
 type="button"
 onClick={() => setToastMessage(null)}
 className="text-muted-foreground hover:text-foreground p-0.5 rounded-md"
 aria-label="Tutup notifikasi"
 >
 <X className="h-3.5 w-3.5" />
 </button>
 </div>
 )}

 {/* ── Modal Form Pengingat ── */}
 <Dialog open={formOpen} onOpenChange={(open) => !open && handleCloseForm()}>
 <DialogContent className="sm:max-w-lg max-h-[92vh] flex flex-col p-0 overflow-hidden bg-card border-border shadow-lg">
 <DialogHeader className="px-5 py-4 border-b border-border/80 bg-secondary/20">
 <div className="flex items-center gap-2">
 <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-primary border border-border">
 <BellRing className="h-4 w-4" />
 </span>
 <div>
 <DialogTitle className="text-base font-bold text-foreground">Kirim Pengingat</DialogTitle>
 <DialogDescription className="text-xs text-muted-foreground">
 Kirim notifikasi atau pengingat tagihan kepada siswa secara manual.
 </DialogDescription>
 </div>
 </div>
 </DialogHeader>

 <form
 onSubmit={handleProceedToConfirm}
 className="flex-1 overflow-y-auto p-5 space-y-4 text-xs"
 >
 {errorMessage && (
 <div className="p-3 rounded-lg border border-danger-line bg-danger-soft flex items-center gap-2">
 <AlertTriangle className="h-4 w-4 shrink-0" />
 <span className="text-xs">{errorMessage}</span>
 </div>
 )}

 {/* Field: Judul */}
 <div className="space-y-1.5">
 <label htmlFor="reminder-title" className="font-bold text-foreground block">
 Judul
 </label>
 <Input
 id="reminder-title"
 value={title}
 onChange={(e) => setTitle(e.target.value)}
 placeholder="Pengingat Pembayaran"
 maxLength={120}
 required
 className="h-9 text-xs"
 />
 </div>

 {/* Field: Pesan */}
 <div className="space-y-1.5">
 <label htmlFor="reminder-message" className="font-bold text-foreground block">
 Pesan
 </label>
 <textarea
 id="reminder-message"
 value={message}
 onChange={(e) => setMessage(e.target.value)}
 placeholder="Jangan lupa melakukan pembayaran tagihan bulan ini."
 rows={3}
 maxLength={1000}
 required
 className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring resize-none text-foreground placeholder:text-muted-foreground"
 />
 </div>

 {/* Field: Target */}
 <div className="space-y-2">
 <label className="font-bold text-foreground block">Target Penerima</label>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
 {/* 1. Semua Siswa */}
 <label
 className={cn(
 "flex flex-col p-3 rounded-xl border cursor-pointer transition-all text-left",
 targetType === "all"
 ? "border-primary bg-secondary/40 text-foreground ring-1 ring-primary"
 : "border-border bg-card hover:bg-secondary/15 text-muted-foreground",
 )}
 >
 <div className="flex items-center gap-2">
 <input
 type="radio"
 name="reminder-target"
 value="all"
 checked={targetType === "all"}
 onChange={() => setTargetType("all")}
 className="accent-primary h-3.5 w-3.5"
 />
 <span className="font-bold text-foreground text-xs">Semua Siswa</span>
 </div>
 <span className="text-[11px] text-muted-foreground mt-1 ml-5">
 {activeStudents.length} siswa aktif
 </span>
 </label>

 {/* 2. Siswa Belum Bayar */}
 <label
 className={cn(
 "flex flex-col p-3 rounded-xl border cursor-pointer transition-all text-left",
 targetType === "unpaid"
 ? "border-primary bg-secondary/40 text-foreground ring-1 ring-primary"
 : "border-border bg-card hover:bg-secondary/15 text-muted-foreground",
 )}
 >
 <div className="flex items-center gap-2">
 <input
 type="radio"
 name="reminder-target"
 value="unpaid"
 checked={targetType === "unpaid"}
 onChange={() => setTargetType("unpaid")}
 className="accent-primary h-3.5 w-3.5"
 />
 <span className="font-bold text-foreground text-xs">Siswa Belum Bayar</span>
 </div>
 <span className="text-[11px] text-muted-foreground mt-1 ml-5">
 {unpaidStudentIds.length} siswa tertunggak
 </span>
 </label>

 {/* 3. Siswa Tertentu */}
 <label
 className={cn(
 "flex flex-col p-3 rounded-xl border cursor-pointer transition-all text-left",
 targetType === "specific"
 ? "border-primary bg-secondary/40 text-foreground ring-1 ring-primary"
 : "border-border bg-card hover:bg-secondary/15 text-muted-foreground",
 )}
 >
 <div className="flex items-center gap-2">
 <input
 type="radio"
 name="reminder-target"
 value="specific"
 checked={targetType === "specific"}
 onChange={() => setTargetType("specific")}
 className="accent-primary h-3.5 w-3.5"
 />
 <span className="font-bold text-foreground text-xs">Siswa Tertentu</span>
 </div>
 <span className="text-[11px] text-muted-foreground mt-1 ml-5">Pilih daftar siswa</span>
 </label>
 </div>

 {/* Sub-panel untuk Siswa Tertentu (Searchable List) */}
 {targetType === "specific" && (
 <div className="mt-2.5 p-3 rounded-xl border border-border bg-secondary/20 space-y-2.5 animate-in fade-in-0 duration-150">
 <div className="flex items-center justify-between gap-2">
 <div className="relative flex-1">
 <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
 <Input
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="Cari nama siswa atau NISN..."
 className="pl-8 h-8 text-xs bg-card"
 />
 </div>
 <div className="flex items-center gap-1.5 shrink-0">
 <button
 type="button"
 onClick={handleSelectAllFiltered}
 className="text-[11px] font-semibold text-primary hover:underline px-1.5 py-0.5"
 >
 Pilih Semua
 </button>
 <span className="text-muted-foreground text-xs">•</span>
 <button
 type="button"
 onClick={handleDeselectAll}
 className="text-[11px] font-semibold text-muted-foreground hover:text-foreground px-1.5 py-0.5"
 >
 Kosongkan
 </button>
 </div>
 </div>

 <div className="text-[11px] text-muted-foreground flex justify-between">
 <span>Daftar Siswa ({filteredStudents.length})</span>
 <span className="font-bold text-primary">{selectedStudentIds.length} Siswa Dipilih</span>
 </div>

      {/* Daftar siswa yang bisa discroll: `bg-muted/40` supaya jelas area
          menggulir tanpa perlu border sendiri (DialogContent sudah berborder,
          border kedua di dalamnya akan terbaca sebagai frame di dalam frame). */}
      <div className="max-h-40 overflow-y-auto rounded-lg bg-muted/40 divide-y divide-border">
 {filteredStudents.length === 0 ? (
 <div className="py-4 text-center text-muted-foreground text-xs">
 Tidak ada siswa yang sesuai pencarian.
 </div>
 ) : (
 filteredStudents.map((s) => {
 const checked = selectedStudentIds.includes(s.id);
 return (
 <label
 key={s.id}
 className={cn(
 "flex items-center gap-2.5 p-2 px-3 cursor-pointer hover:bg-secondary/30 transition-colors text-xs",
 checked && "bg-secondary/40 font-medium",
 )}
 >
 <input
 type="checkbox"
 checked={checked}
 onChange={() => toggleSelectStudent(s.id)}
 className="accent-primary h-3.5 w-3.5 rounded"
 />
 <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
 <span className="truncate text-foreground font-medium">{s.name}</span>
 <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
 NISN: {s.nisn}
 </span>
 </div>
 </label>
 );
 })
 )}
 </div>
 </div>
 )}
 </div>

 {/* Field: Saluran Pengiriman (Channel) */}
 <div className="space-y-1.5 pt-1">
 <label className="font-bold text-foreground block">Saluran Pengiriman</label>
 <div className="flex flex-wrap items-center gap-4 pt-1">
 <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground select-none">
 <input
 type="checkbox"
 checked={channelWeb}
 onChange={(e) => setChannelWeb(e.target.checked)}
 className="accent-primary h-4 w-4 rounded"
 />
 <span className="flex items-center gap-1.5">
 <Bell className="h-3.5 w-3.5 text-primary" />
 Notifikasi Web
 </span>
 </label>

 <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground select-none">
 <input
 type="checkbox"
 checked={channelEmail}
 onChange={(e) => setChannelEmail(e.target.checked)}
 className="accent-primary h-4 w-4 rounded"
 />
 <span className="flex items-center gap-1.5">
 <Mail className="h-3.5 w-3.5 text-primary" />
 Email
 </span>
 </label>
 </div>
 </div>

 <div className="pt-2">
 <DialogFooter className="gap-2 sm:gap-0">
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={handleCloseForm}
 disabled={isSubmitting}
 className="text-xs"
 >
 Batal
 </Button>
 <Button
 type="submit"
 size="sm"
 disabled={isSubmitting || targetCount === 0 || (!channelWeb && !channelEmail)}
 className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold gap-1.5 shadow-teal-sm"
 >
 <Send className="h-3.5 w-3.5" />
 Kirim Pengingat
 </Button>
 </DialogFooter>
 </div>
 </form>
 </DialogContent>
 </Dialog>

 {/* ── Dialog Konfirmasi Anti-Spam ── */}
 <Dialog
 open={confirmOpen}
 onOpenChange={(open) => !open && !isSubmitting && setConfirmOpen(false)}
 >
 <DialogContent className="sm:max-w-md bg-card border-border shadow-xl">
 <DialogHeader>
 <div className="flex items-center gap-2.5">
 <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-primary border border-border">
 <Users className="h-5 w-5" />
 </span>
 <div>
 <DialogTitle className="text-base font-bold text-foreground">Kirim pengingat?</DialogTitle>
 <DialogDescription className="text-xs text-muted-foreground">
 Pengingat ini akan dikirim kepada{" "}
 <strong className="text-foreground">{targetCount} siswa</strong>.
 </DialogDescription>
 </div>
 </div>
 </DialogHeader>

 <div className="space-y-2 py-2 text-xs">
 <div className="p-3 rounded-lg border border-border bg-secondary/30 space-y-1.5">
 <div className="flex items-center justify-between text-[11px] text-muted-foreground">
 <span>Judul Pesan:</span>
 <span className="font-bold text-foreground truncate max-w-[200px]">{title}</span>
 </div>
 <div className="flex items-center justify-between text-[11px] text-muted-foreground">
 <span>Target:</span>
 <span className="font-semibold text-foreground">
 {targetType === "all"
 ? "Semua Siswa"
 : targetType === "unpaid"
 ? "Siswa Belum Bayar"
 : "Siswa Tertentu"}
 </span>
 </div>
 <div className="flex items-center justify-between text-[11px] text-muted-foreground">
 <span>Saluran:</span>
 <span className="font-semibold text-primary">
 {[channelWeb && "Notifikasi Web", channelEmail && "Email"].filter(Boolean).join("+")}
 </span>
 </div>
 </div>
 <p className="text-[11px] text-muted-foreground">
 Pastikan isi pesan telah sesuai dengan informasi resmi SMP Negeri 17 Tangerang Selatan
 sebelum melanjutkan.
 </p>
 </div>

 <DialogFooter className="gap-2 sm:gap-0">
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => setConfirmOpen(false)}
 disabled={isSubmitting}
 className="text-xs"
 >
 Batal
 </Button>
 <Button
 type="button"
 size="sm"
 onClick={handleSendReminder}
 disabled={isSubmitting}
 className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold gap-1.5 shadow-teal-sm"
 >
 {isSubmitting ? (
 <>
 <Loader2 className="h-3.5 w-3.5 animate-spin" />
 Mengirim...
 </>
 ) : (
 "Kirim Sekarang"
 )}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </>
 );
}
