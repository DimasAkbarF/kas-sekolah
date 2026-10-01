"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { StudentBillItem, getStudentBillStatus } from "@/components/student/student-bill-item";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Receipt } from "lucide-react";
import {
 getCurrentStudent,
 getStudentBills,
 getStudentTransactions,
} from "@/services/student.service";
import type { StudentBillStatus } from "@/components/student/student-bill-item";
import { useI18n } from "@/hooks/use-i18n";
import type { TKey } from "@/lib/i18n";
import { useDataVersion } from "@/hooks/use-data-version";

type BillFilter = "all" | StudentBillStatus;

const FILTERS: { value: BillFilter; labelKey: TKey }[] = [
 { value: "all", labelKey: "student.all" },
 { value: "unpaid", labelKey: "student.statusUnpaid" },
 { value: "pending", labelKey: "student.statusPending" },
 { value: "paid", labelKey: "student.statusPaid" },
 { value: "expired", labelKey: "student.statusExpired" },
];

export default function StudentBillsPage() {
 const { t } = useI18n();
 useDataVersion();
 const [filter, setFilter] = useState<BillFilter>("all");
 const [search, setSearch] = useState("");

 const student = getCurrentStudent();

 const filtered = useMemo(() => {
 if (!student) return [];
 const bills = getStudentBills(student);
 const transactions = getStudentTransactions(student);
 return bills.filter((bill) => {
 const status = getStudentBillStatus(bill, transactions);
 const matchFilter = filter === "all" || status === filter;
 const matchSearch =
 search.trim() === "" ||
 bill.name.toLowerCase().includes(search.toLowerCase()) ||
 bill.category.toLowerCase().includes(search.toLowerCase());
 return matchFilter && matchSearch;
 });
 }, [student, filter, search]);

 if (!student) return null;

 const transactions = getStudentTransactions(student);

 return (
 <AppShell
 role="student"
 breadcrumbs={[
 { label: t("role.student"), href: "/student/dashboard" },
 { label: t("student.myBills") },
 ]}
 >
 <div className="space-y-4">
 <PageHeader
 title={t("student.myBills")}
 subtitle={t("student.myBillsSubtitle")}
 accent="teal"
 icon={<Receipt className="h-5 w-5" />}
 badge={
 <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-md bg-secondary text-primary border border-border">
 {filtered.length} Tagihan
 </span>
 }
 />

 <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
 <div className="relative flex-1 max-w-sm">
 <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
 <Input
 placeholder={t("student.searchBills")}
 aria-label={t("student.searchBills")}
 className="pl-8"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 />
 </div>
 {/* Filter status: `role="tablist"` di atas <button> biasa tidak punya
 aria-selected, tabpanel, atau dukungan tombol panah — dan mengimplementasikan
 ulang Tabs secara manual. Pakai komponen Tabs yang sudah ada. */}
 <Tabs value={filter} onValueChange={(v) => setFilter(v as BillFilter)}>
 <TabsList aria-label={t("filter.billStatus")}>
 {FILTERS.map((f) => (
 <TabsTrigger key={f.value} value={f.value}>
 {t(f.labelKey)}
 </TabsTrigger>
 ))}
 </TabsList>
 </Tabs>
 </div>

 {filtered.length === 0 ? (
 <EmptyState title={t("student.noBills")} description={t("student.noBillsDesc")} />
 ) : (
 <div className="space-y-3">
 {filtered.map((bill) => (
 <StudentBillItem key={bill.id} bill={bill} transactions={transactions} />
 ))}
 </div>
 )}
 </div>
 </AppShell>
 );
}
