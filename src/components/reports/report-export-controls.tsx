"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { buildReportCsv, type ReportData, type ReportPeriodKey } from "@/services/reports.service";
import { useI18n } from "@/hooks/use-i18n";
import type { TKey } from "@/lib/i18n";
import { Download, FileText } from "lucide-react";

const PERIOD_OPTIONS: { value: ReportPeriodKey; labelKey: TKey }[] = [
 { value: "all", labelKey: "reportPeriod.all" },
 { value: "thisMonth", labelKey: "reportPeriod.thisMonth" },
 { value: "lastMonth", labelKey: "reportPeriod.lastMonth" },
 { value: "thisYear", labelKey: "reportPeriod.thisYear" },
];

export function ReportExportControls({
 period,
 data,
 changePeriod,
}: {
 period: ReportPeriodKey;
 data: ReportData;
 changePeriod: (p: ReportPeriodKey) => void;
}) {
 const { t } = useI18n();
 const [feedback, setFeedback] = useState<string | null>(null);

 function handleExportExcel() {
 const blob = new Blob(["\uFEFF" + buildReportCsv(data)], {
 type: "text/csv;charset=utf-8;",
 });
 const url = URL.createObjectURL(blob);
 const anchor = document.createElement("a");
 anchor.href = url;
 anchor.download = `laporan-kas-${period}.csv`;
 document.body.appendChild(anchor);
 anchor.click();
 document.body.removeChild(anchor);
 URL.revokeObjectURL(url);
 setFeedback(t("reports.exportedFeedback"));
 }

 return (
 <div className="flex flex-wrap items-center gap-3 print:hidden">
 <Select value={period} onValueChange={(v) => changePeriod(v ?? "all")}>
 <SelectTrigger className="w-full sm:w-[200px]">
 <SelectValue placeholder={t("reports.period")} />
 </SelectTrigger>
 <SelectContent>
 {PERIOD_OPTIONS.map((option) => (
 <SelectItem key={option.value} value={option.value}>
 {t(option.labelKey)}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 <div className="flex flex-wrap gap-2">
 <Button variant="outline" size="sm" onClick={handleExportExcel}>
 <Download className="mr-2 h-4 w-4" />
 {t("reports.exportExcel")}
 </Button>
 <Button variant="outline" size="sm" onClick={() => window.print()}>
 <FileText className="mr-2 h-4 w-4" />
 {t("reports.exportPdf")}
 </Button>
 </div>
 {feedback && <p className="text-xs text-muted-foreground">{feedback}</p>}
 </div>
 );
}
