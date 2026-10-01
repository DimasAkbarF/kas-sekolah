"use client";

import { BillsPage } from "@/components/finance/bills-page";

// Admin dan bendahara memakai halaman yang sama; berbeda hanya pada role
// (sidebar, breadcrumb, dan hak akses API).
export default function AdminBillsPage() {
 return <BillsPage role="super_admin" />;
}
