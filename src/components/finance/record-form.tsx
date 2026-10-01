"use client";

import { useState } from "react";
import { Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createExpense, createIncome } from "@/lib/sync";
import { useI18n } from "@/hooks/use-i18n";

export function RecordForm({ type }: { type: "income" | "expense" }) {
 const { t } = useI18n();
 const tk = t as (key: string) => string;
 const k = (key: string) => tk(type === "income" ? `income.${key}` : `expenses.${key}`);
 const [title, setTitle] = useState("");
 const [category, setCategory] = useState("");
 const [amount, setAmount] = useState("");
 const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
 const [extra, setExtra] = useState("");
 const [saving, setSaving] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [feedback, setFeedback] = useState<string | null>(null);

 async function handleSubmit() {
 const amountNum = parseInt(amount, 10);
 if (!title.trim()) return setError(k("errTitleRequired"));
 if (!Number.isFinite(amountNum) || amountNum <= 0) {
 return setError(k("errAmountPositive"));
 }
 setError(null);
 setSaving(true);
 try {
 const base = {
 title: title.trim(),
 category: category.trim() || (type === "income" ? "Kas Siswa" : "Operasional"),
 amount: amountNum,
 date,
 };
 if (type === "income") {
 await createIncome({ ...base, source: extra.trim() || undefined });
 } else {
 await createExpense({ ...base, notes: extra.trim() || undefined });
 }
 setTitle("");
 setCategory("");
 setAmount("");
 setExtra("");
 setFeedback(k("feedbackSaved"));
 } catch (err) {
 setError(err instanceof Error && err.message ? err.message : t("students.errorUnknown"));
 } finally {
 setSaving(false);
 }
 }

 return (
 <Card className="border-border/70 shadow-xs">
 <CardHeader className="pb-3">
 <CardTitle className="text-sm font-medium">{k("addFormTitle")}</CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
 <div className="space-y-2">
 <label htmlFor="record-title" className="text-sm font-medium">
 {k("fieldTitle")}
 </label>
 <Input
 id="record-title"
 value={title}
 onChange={(e) => setTitle(e.target.value)}
 placeholder={k("placeholderTitle")}
 />
 </div>
 <div className="space-y-2">
 <label htmlFor="record-category" className="text-sm font-medium">
 {k("fieldCategory")}
 </label>
 <Input
 id="record-category"
 value={category}
 onChange={(e) => setCategory(e.target.value)}
 placeholder={k("placeholderCategory")}
 />
 </div>
 </div>
 <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
 <div className="space-y-2">
 <label htmlFor="record-amount" className="text-sm font-medium">
 {k("fieldAmount")}
 </label>
 <Input
 id="record-amount"
 type="number"
 min={1}
 placeholder="0"
 value={amount}
 onChange={(e) => setAmount(e.target.value)}
 />
 </div>
 <div className="space-y-2">
 <label htmlFor="record-date" className="text-sm font-medium">
 {k("fieldDate")}
 </label>
 <Input id="record-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
 </div>
 </div>
 <div className="space-y-2">
 <label htmlFor="record-extra" className="text-sm font-medium">
 {type === "income" ? k("fieldSource") : k("fieldNotes")}
 </label>
 <Input
 id="record-extra"
 value={extra}
 onChange={(e) => setExtra(e.target.value)}
 placeholder={type === "income" ? k("placeholderSource") : k("placeholderNotes")}
 />
 </div>

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

 <Button size="sm" onClick={handleSubmit} disabled={saving}>
 {saving ? (
 <>
 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
 {t("common.loading")}
 </>
 ) : (
 <>
 <Save className="mr-2 h-4 w-4" />
 {k("save")}
 </>
 )}
 </Button>
 </CardContent>
 </Card>
 );
}
