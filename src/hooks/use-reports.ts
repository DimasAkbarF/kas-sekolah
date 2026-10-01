"use client";

import { useCallback, useState } from "react";
import {
 computeReportData,
 type ReportPeriodKey,
} from "@/services/reports.service";

export function useReportData() {
 const [period, setPeriod] = useState<ReportPeriodKey>("all");
 const data = computeReportData(period);

 const changePeriod = useCallback((next: ReportPeriodKey) => {
 if (next === period) return;
 setPeriod(next);
 }, [period]);

 return { period, data, changePeriod };
}