"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/formatters";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { UserNotification } from "@/types";

export function NotificationBell() {
 const [open, setOpen] = useState(false);
 const [notifications, setNotifications] = useState<UserNotification[]>([]);
 const [unreadCount, setUnreadCount] = useState(0);
 const [loading, setLoading] = useState(false);
 const containerRef = useRef<HTMLDivElement>(null);
 const panelRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
 let mounted = true;
 // Poll hanya saat tab terlihat: interval 25 detik di tab latar belakang
 // adalah request sia-sia untuk setiap pengguna yang membiarkan tab terbuka.
 const load = () => {
 if (document.visibilityState !== "visible") return;
 void apiFetch<{
 notifications: UserNotification[];
 unreadCount: number;
 }>("/api/notifications")
 .then((res) => {
 if (mounted) {
 setNotifications(res.notifications || []);
 setUnreadCount(res.unreadCount || 0);
 }
 })
 .catch((err) => console.error("[notifications] gagal memuat", err));
 };

 load();

 const timer = setInterval(load, 25000);
 window.addEventListener("kas:reminder-sent", load);

 return () => {
 mounted = false;
 clearInterval(timer);
 window.removeEventListener("kas:reminder-sent", load);
 };
 }, []);

 // Click outside, Escape & fokus awal
 useEffect(() => {
 if (!open) return;

 panelRef.current?.focus();

 function handleClickOutside(event: MouseEvent) {
 if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
 setOpen(false);
 }
 }

 function handleKeyDown(event: KeyboardEvent) {
 if (event.key === "Escape") {
 setOpen(false);
 }
 }

 document.addEventListener("mousedown", handleClickOutside);
 document.addEventListener("keydown", handleKeyDown);
 return () => {
 document.removeEventListener("mousedown", handleClickOutside);
 document.removeEventListener("keydown", handleKeyDown);
 };
 }, [open]);

 const handleMarkAllRead = async () => {
 setLoading(true);
 try {
 await apiFetch("/api/notifications/mark-read", {
 method: "POST",
 body: JSON.stringify({ all: true }),
 });
 setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
 setUnreadCount(0);
 } catch (err) {
 console.error("Gagal menandai notifikasi:", err);
 } finally {
 setLoading(false);
 }
 };

 const handleMarkItemRead = async (item: UserNotification) => {
 if (item.isRead) return;
 try {
 await apiFetch("/api/notifications/mark-read", {
 method: "POST",
 body: JSON.stringify({ id: item.id }),
 });
 setNotifications((prev) => prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)));
 setUnreadCount((c) => Math.max(0, c - 1));
 } catch (err) {
 console.error("Gagal menandai notifikasi:", err);
 }
 };

 return (
 <div className="relative inline-block" ref={containerRef}>
 <Button
 variant="ghost"
 size="icon-sm"
 onClick={() => {
 setOpen((v) => !v);
 // Sumber tunggal: effect di atas sudah mendengarkan event ini, jadi
 // tidak perlu salinan logika fetch kedua yang bisa melenceng.
 if (!open) window.dispatchEvent(new Event("kas:reminder-sent"));
 }}
 aria-label="Buka notifikasi"
 aria-expanded={open}
 className={cn(
 "relative h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors",
 open && "bg-secondary text-primary",
 )}
 >
 <Bell className="h-4 w-4" />
 {unreadCount > 0 && (
 <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-xs font-extrabold text-destructive-foreground shadow-xs animate-in fade-in-0 zoom-in-75">
 {unreadCount > 9 ? "9+" : unreadCount}
 </span>
 )}
 </Button>

 {open && (
 <div
 role="dialog"
 aria-label="Daftar Notifikasi" // Fokus dipindah ke panel saat terbuka: tanpa itu Tab berjalan ke konten di
 // belakang dan pembaca layar tidak tahu panel ini muncul. `w-[min(...)]`
 // juga mencegah panel meluber di viewport 320px.
 ref={panelRef}
 tabIndex={-1}
 className="absolute right-0 mt-2 z-50 w-[min(22rem,calc(100vw-2rem))] sm:w-96 rounded-xl border border-border bg-popover p-0 shadow-lg text-popover-foreground outline-none animate-in fade-in-0 zoom-in-95"
 >
 {/* Header Popover */}
 <div className="flex items-center justify-between px-4 py-3 border-b border-border/70 bg-card/60">
 <div className="flex items-center gap-2">
 <span className="text-xs font-bold text-foreground">Notifikasi</span>
 {unreadCount > 0 && (
 <span className="px-1.5 py-0.5 text-xs font-bold rounded-full bg-secondary text-primary border border-border">
 {unreadCount} Baru
 </span>
 )}
 </div>

 {unreadCount > 0 && (
 <button
 type="button"
 onClick={handleMarkAllRead}
 disabled={loading}
 className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline disabled:opacity-50"
 >
 {loading ? (
 <Loader2 className="h-3.5 w-3.5 animate-spin" />
 ) : (
 <CheckCheck className="h-3.5 w-3.5" />
 )}
 Tandai dibaca
 </button>
 )}
 </div>

 {/* List Notifikasi */}
 <div className="max-h-80 overflow-y-auto divide-y divide-border/50">
 {notifications.length === 0 ? (
 <div className="py-10 px-4 text-center">
 <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground border border-border/80 mb-2">
 <BellOff className="h-4 w-4" />
 </span>
 <p className="text-xs font-semibold text-foreground">Belum ada notifikasi</p>
 <p className="text-[11px] text-muted-foreground mt-0.5">
 Pengingat tagihan dan informasi sekolah akan ditampilkan di sini.
 </p>
 </div>
 ) : (
 notifications.map((item) => (
 <button
 key={item.id}
 type="button"
 onClick={() => handleMarkItemRead(item)}
 className={cn(
 "w-full p-3.5 flex items-start gap-3 transition-colors cursor-pointer text-left hover:bg-secondary/20 focus-visible:ring-2 focus-visible:ring-ring",
 !item.isRead && "bg-secondary/35",
 )}
 >
 <span
 className={cn(
 "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs mt-0.5",
 !item.isRead
 ? "bg-teal-soft border-teal-line"
 : "bg-muted text-muted-foreground border-border",
 )}
 >
 <Bell className="h-3.5 w-3.5" />
 </span>

 <div className="flex-1 min-w-0">
 <div className="flex items-center justify-between gap-1.5">
 <p
 className={cn(
 "text-xs truncate",
 !item.isRead ? "font-bold text-foreground" : "font-semibold text-foreground/80",
 )}
 >
 {item.title}
 </p>
 {!item.isRead && (
 <span
 className="h-2 w-2 shrink-0 rounded-full bg-destructive"
 role="img"
 aria-label="Belum dibaca"
 />
 )}
 </div>

 <p className="text-[11.5px] text-muted-foreground mt-1 line-clamp-3 leading-relaxed">
 {item.message}
 </p>

 <p className="text-xs text-muted-foreground/75 mt-1.5 tabular-nums">
 {formatDateTime(item.createdAt)}
 </p>
 </div>
 </button>
 ))
 )}
 </div>

 {/* Footer Popover */}
 <div className="px-4 py-2 border-t border-border/60 bg-muted/20 text-center">
 <span className="text-[10.5px] text-muted-foreground font-medium">
 SMP Negeri 17 Tangerang Selatan • Kas Sekolah
 </span>
 </div>
 </div>
 )}
 </div>
 );
}
