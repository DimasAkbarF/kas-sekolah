"use client";

import { useAuth } from "@/hooks/use-auth";
import { getActiveClassName } from "@/lib/school";

/**
 * Label kelas untuk workspace yang sedang dibuka.
 *
 * Admin Kelas: kelasnya sendiri (dari session). Super Admin/bendahara: tidak
 * terikat satu kelas, jadi memakai nama kelas bawaan sekolah sebagai label
 * umum. Menggantikan pemakaian langsung `getActiveClassName()` di halaman
 * dashboard, yang sebelumnya selalu menampilkan nilai global.
 */
export function useWorkspaceClass(): string {
 const { user } = useAuth();
 if (user?.role === "class_admin") return user.className ?? "";
 return getActiveClassName();
}
