"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Save, Loader2, Copy, CheckCircle2, CreditCard } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { useI18n } from "@/hooks/use-i18n";
import { RoleGuard } from "@/components/auth/role-guard";

interface GatewaySettings {
 provider: string;
 environment: string;
 activeMethods: string[];
 clientId: string;
 secretKeyConfigured: boolean;
 notificationUrl: string;
}

function buildDefaultNotificationUrl(): string {
 if (typeof window !== "undefined" && window.location.origin) {
 return `${window.location.origin}/api/payment/doku/notification`;
 }
 return "/api/payment/doku/notification";
}

export default function PaymentGatewayPage() {
 const { t } = useI18n();
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [copied, setCopied] = useState(false);
 const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

 const [environment, setEnvironment] = useState("sandbox");
 const [clientId, setClientId] = useState("");
 const [secretKey, setSecretKey] = useState("");
 const [secretKeyConfigured, setSecretKeyConfigured] = useState(false);
 const [notificationUrl, setNotificationUrl] = useState("");

 useEffect(() => {
 apiFetch<{ settings: GatewaySettings | null }>("/api/settings/gateway")
 .then((data) => {
 if (data.settings) {
 setEnvironment(data.settings.environment || "sandbox");
 setClientId(data.settings.clientId || "");
 setSecretKeyConfigured(data.settings.secretKeyConfigured ?? false);
 setSecretKey(""); // Never prefill secret key

 // Use saved notificationUrl, or fall back to default
 const savedUrl = data.settings.notificationUrl;
 if (savedUrl && savedUrl.length > 0) {
 setNotificationUrl(savedUrl);
 } else {
 setNotificationUrl(buildDefaultNotificationUrl());
 }
 } else {
 // No settings row yet — use defaults
 setNotificationUrl(buildDefaultNotificationUrl());
 }
 })
 .catch((err) => console.error("Failed to load gateway settings:", err))
 .finally(() => setLoading(false));
 }, []);

 const isConfigured = secretKeyConfigured && clientId.length > 0;

 async function handleSave() {
 setSaving(true);
 setFeedback(null);
 try {
 await apiFetch<{ ok: boolean }>("/api/settings/gateway", {
 method: "PATCH",
 body: JSON.stringify({
 provider: "doku",
 environment,
 activeMethods: ["qris"],
 clientId,
 // Only send secretKey if user typed a new one
 secretKey: secretKey.length > 0 ? secretKey : "",
 notificationUrl,
 }),
 });
 if (secretKey.length > 0) {
 setSecretKeyConfigured(true);
 }
 setSecretKey(""); // Clear input after save
 setFeedback({ type: "success", text: t("gateway.saveSuccess") });
 } catch (err: unknown) {
 const message = err instanceof Error ? err.message : t("gateway.saveErrorGeneric");
 setFeedback({ type: "error", text: message });
 } finally {
 setSaving(false);
 }
 }

 function handleCopy() {
 navigator.clipboard.writeText(notificationUrl);
 setCopied(true);
 setTimeout(() => setCopied(false), 2000);
 }

 if (loading) {
 return (
 <AppShell role="super_admin" breadcrumbs={[]}>
 <div className="p-10 text-center">
 <Loader2 className="animate-spin inline" />
 </div>
 </AppShell>
 );
 }

 return (
 <RoleGuard allowedRoles={["super_admin"]}>
 <AppShell
 role="super_admin"
 breadcrumbs={[
 { label: t("role.super_admin"), href: "/admin/dashboard" },
 { label: t("gateway.title"), href: "/admin/payment-gateway" },
 ]}
 >
 <div className="space-y-6 max-w-3xl">
 <PageHeader
 title={t("gateway.title")}
 subtitle={t("gateway.subtitle")}
 accent="violet"
 icon={<CreditCard className="h-5 w-5" />}
 badge={
 <span
 className={cn(
 "inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-md border",
 isConfigured
 ? "bg-success-soft text-success-ink border-success-line"
 : "bg-warning-soft text-warning-ink border-warning-line",
 )}
 >
 {isConfigured ? t("gateway.ready") : t("gateway.incomplete")}
 </span>
 }
 />

 <Card className="border-border/70 shadow-xs">
 <CardHeader className="pb-3">
 <div className="flex items-center gap-2">
 <CardTitle className="text-sm font-medium">{t("gateway.provider")}</CardTitle>
 <Badge variant="outline" className="font-semibold">
 DOKU
 </Badge>
 </div>
 </CardHeader>

 <CardContent className="space-y-5">
 {/* Environment */}
 <div className="space-y-1">
 <label htmlFor="gateway-environment" className="text-sm font-medium">
 {t("gateway.environment")}
 </label>
 <Select
 value={environment}
 onValueChange={(v) => {
 if (v) setEnvironment(v);
 }}
 >
 <SelectTrigger id="gateway-environment" className="w-48">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="sandbox">{t("gateway.sandbox")}</SelectItem>
 <SelectItem value="production">{t("gateway.production")}</SelectItem>
 </SelectContent>
 </Select>
 </div>

 {/* Credential DOKU */}
 <div className="space-y-3">
 <h3 className="text-sm font-semibold">{t("gateway.credentials")}</h3>

 <div className="space-y-1">
 <label htmlFor="gateway-client-id" className="text-sm font-medium">
 {t("gateway.clientId")}
 </label>
 <Input
 id="gateway-client-id"
 value={clientId}
 onChange={(e) => setClientId(e.target.value)}
 placeholder={t("gateway.clientIdPlaceholder")}
 />
 </div>

 <div className="space-y-1">
 <label htmlFor="gateway-secret-key" className="text-sm font-medium">
 {t("gateway.secretKey")}
 </label>
 <Input
 id="gateway-secret-key"
 type="password"
 value={secretKey}
 onChange={(e) => setSecretKey(e.target.value)}
 placeholder={
 secretKeyConfigured ? "••••••••••••••••••••••••" : t("gateway.secretKeyPlaceholder")
 }
 />
 {secretKeyConfigured && secretKey.length === 0 && (
 <p className="text-xs text-muted-foreground">{t("gateway.secretKeyHint")}</p>
 )}
 </div>
 </div>

 {/* Payment Methods */}
 <div className="space-y-1">
 <h3 className="text-sm font-semibold">{t("gateway.methods")}</h3>
 <div className="flex items-center gap-2 p-3 border rounded-md">
 <input
 type="checkbox"
 checked
 readOnly
 className="h-4 w-4"
 aria-label={t("gateway.qris")}
 />
 <span className="text-sm font-medium">{t("gateway.qris")}</span>
 </div>
 <p className="text-xs text-muted-foreground">{t("gateway.methodsDesc")}</p>
 </div>

 {/* Notification URL */}
 <div className="space-y-1">
 <label htmlFor="gateway-notification-url" className="text-sm font-medium">
 {t("gateway.notificationUrl")}
 </label>
 <div className="flex gap-2">
 <Input
 id="gateway-notification-url"
 value={notificationUrl}
 onChange={(e) => setNotificationUrl(e.target.value)}
 placeholder={t("gateway.notificationUrlPlaceholder")}
 />
 <Button
 variant="outline"
 size="icon"
 onClick={handleCopy}
 title={t("gateway.copyNotification")}
 aria-label={t("gateway.copyNotification")}
 >
 {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
 </Button>
 </div>
 </div>

 {/* Save */}
 <Button onClick={handleSave} disabled={saving}>
 {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
 {t("gateway.saveConfig")}
 </Button>

 {feedback && (
 <p
 className={cn(
 "text-sm",
 feedback.type === "success" ? "text-success" : "text-destructive",
 )}
 >
 {feedback.text}
 </p>
 )}
 </CardContent>
 </Card>
 </div>
 </AppShell>
 </RoleGuard>
 );
}
