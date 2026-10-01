"use client";

import { useState } from "react";
import { PASSWORD_MIN_LENGTH } from "@/lib/password-policy";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { tableSurface } from "@/components/layout/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogFooter,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog";
import { useAccounts } from "@/hooks/use-accounts";
import { resetAccountPassword, roleLabelKey } from "@/lib/accounts";
import { KeyRound, Search } from "lucide-react";
import type { Account } from "@/lib/accounts";
import { useI18n } from "@/hooks/use-i18n";

export function AccountPasswordManager() {
 const { t } = useI18n();
 const accounts = useAccounts();
 const [search, setSearch] = useState("");
 const [target, setTarget] = useState<Account | null>(null);
 const [password, setPassword] = useState("");
 const [confirm, setConfirm] = useState("");
 const [localError, setLocalError] = useState<string | null>(null);
 const [saving, setSaving] = useState(false);

 const filtered = accounts.filter((a) => {
 if (!search.trim()) return true;
 const q = search.toLowerCase();
 const roleLabel = t(roleLabelKey[a.role]).toLowerCase();
 return (
 a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || roleLabel.includes(q)
 );
 });

 function openDialog(account: Account) {
 setTarget(account);
 setPassword("");
 setConfirm("");
 setLocalError(null);
 }

 async function handleSave() {
 if (!target) return;
 if (password.length < PASSWORD_MIN_LENGTH) {
 setLocalError(t("account.pwTooShort"));
 return;
 }
 if (password !== confirm) {
 setLocalError(t("account.pwMismatch"));
 return;
 }
 setSaving(true);
 setLocalError(null);
 try {
 await resetAccountPassword(target.id, password);
 setTarget(null);
 setPassword("");
 setConfirm("");
 } catch (err) {
 setLocalError(err instanceof Error && err.message ? err.message : t("account.pwFailed"));
 } finally {
 setSaving(false);
 }
 }

 return (
 <Card className="border-border/70 shadow-xs">
 <CardHeader className="pb-3">
 <CardTitle className="text-sm font-medium">{t("account.managerTitle")}</CardTitle>
 <p className="text-sm text-muted-foreground">{t("account.managerDesc")}</p>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="relative max-w-sm">
 <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
 <Input
 placeholder={t("account.search")}
 aria-label={t("account.search")}
 className="pl-8"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 />
 </div>

 <div className={cn(tableSurface)}>
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b bg-muted/50">
 <th scope="col" className="text-left px-4 py-2 text-xs font-medium">
 {t("student.profileName")}
 </th>
 <th scope="col" className="text-left px-4 py-2 text-xs font-medium">
 {t("student.profileEmail")}
 </th>
 <th scope="col" className="text-left px-4 py-2 text-xs font-medium">
 {t("account.role")}
 </th>
 <th scope="col" className="text-right px-4 py-2 text-xs font-medium w-[110px]">
 {t("account.action")}
 </th>
 </tr>
 </thead>
 <tbody>
 {filtered.map((account) => (
 <tr key={account.id} className="border-b last:border-0 hover:bg-muted/30">
 <td className="px-4 py-2.5 font-medium">{account.name}</td>
 <td className="px-4 py-2.5 text-muted-foreground">{account.email}</td>
 <td className="px-4 py-2.5">{t(roleLabelKey[account.role])}</td>
 <td className="px-4 py-2.5 text-right">
 <Button size="sm" variant="outline" onClick={() => openDialog(account)}>
 <KeyRound className="mr-2 h-3.5 w-3.5" />
 {t("account.reset")}
 </Button>
 </td>
 </tr>
 ))}
 {filtered.length === 0 && (
 <tr>
 <td colSpan={4} className="px-4 py-6 text-center text-sm text-muted-foreground">
 {t("account.noMatch")}
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>

 <Dialog open={target !== null} onOpenChange={(open) => !open && setTarget(null)}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>{t("account.resetPassword")}</DialogTitle>
 <DialogDescription>
 {t("account.resetFor")}
 {""}
 <span className="font-medium text-foreground">{target?.name}</span> (
 {target ? t(roleLabelKey[target.role]) : ""}).
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-4">
 <div className="space-y-1.5">
 <label htmlFor="new-password" className="text-sm font-medium">
 {t("account.newPassword")}
 </label>
 <Input
 id="new-password"
 type="password"
 autoComplete="new-password"
 placeholder={t("account.newPasswordPlaceholder")}
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 />
 </div>
 <div className="space-y-1.5">
 <label htmlFor="confirm-password" className="text-sm font-medium">
 {t("account.confirmPassword")}
 </label>
 <Input
 id="confirm-password"
 type="password"
 autoComplete="new-password"
 placeholder={t("account.confirmPasswordPlaceholder")}
 value={confirm}
 onChange={(e) => setConfirm(e.target.value)}
 />
 </div>
 {localError && (
 <p className="text-sm text-destructive" role="alert">
 {localError}
 </p>
 )}
 </div>

 <DialogFooter>
 <Button variant="outline" onClick={() => setTarget(null)}>
 {t("common.cancel")}
 </Button>
 <Button onClick={() => void handleSave()} disabled={saving}>
 {saving ? t("students.saving") : t("account.savePassword")}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </CardContent>
 </Card>
 );
}
