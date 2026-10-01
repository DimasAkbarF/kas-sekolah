export type UserRole = "super_admin" | "class_admin" | "treasurer" | "student";

/** Role yang boleh masuk ke workspace /admin/*. */
export const STAFF_ROLES: UserRole[] = ["super_admin", "class_admin", "treasurer"];
/** Role dengan akses seluruh sekolah (classId null = tidak ter-scope). */
export const GLOBAL_ROLES: UserRole[] = ["super_admin", "treasurer"];

export interface ClassRoom {
 id: string;
 name: string;
 grade: string;
 academicYear: string;
 isActive: boolean;
 /** Kelas sedang dalam pemeliharaan, dinyalakan manual oleh Super Admin. */
 maintenance: boolean;
}

export type BillStatus = "active" | "inactive" | "expired";
export type TransactionStatus = "PENDING" | "PAID" | "FAILED" | "EXPIRED" | "CANCELLED";
export type BillTargetType = "all" | "class" | "specific";
export type PaymentMethod = "bank_transfer" | "ewallet" | "cash" | "qris";

export type ManualMethodType = "qris" | "bank" | "ewallet";

export interface PaymentMethodInfo {
 id: string;
 type: ManualMethodType;
 name: string;
 /** null = metode berlaku untuk seluruh sekolah. */
 classId?: string | null;
 className?: string;
 accountNumber?: string;
 accountHolder?: string;
 qrisImage?: string;
 active: boolean;
}

export interface User {
 id: string;
 name: string;
 email: string;
 role: UserRole;
 avatar?: string;
 password?: string;
 /** Kelas yang dipegang Admin Kelas. null = Super Admin (seluruh sekolah). */
 classId?: string | null;
 className?: string | null;
 /**
  * true = kelas sedang dalam pemeliharaan; pengguna hanya boleh melihat
  * halaman /maintenance. Selalu falsy untuk Super Admin/bendahara global.
  */
 classMaintenance?: boolean;
}

export interface Student {
 id: string;
 userId: string;
 nis: string;
 nisn: string;
 name: string;
 classId?: string | null;
 email?: string;
 className?: string;
 gender?: "L" | "P";
 phone?: string;
 address?: string;
 archived?: boolean;
}

export interface Bill {
 id: string;
 classId?: string | null;
 name: string;
 category: string;
 amount: number;
 period: string;
 startDate: string;
 dueDate: string;
 targetType: BillTargetType;
 targetIds: string[];
 status: BillStatus;
 createdAt: string;
}

export interface Transaction {
 id: string;
 billId: string;
 studentId: string;
 amount: number;
 paymentMethod: PaymentMethod;
 status: TransactionStatus;
 externalReference?: string;
 classId?: string | null;
 // Daftar transaksi hanya membawa penanda bukti; gambarnya diambil terpisah
 // lewat GET /api/transactions/[id] (bisa 1 MB per baris).
 hasProof?: boolean;
 proofImage?: string;
 methodId?: string;
 paidAt?: string;
 createdAt: string;
}

export interface Expense {
 id: string;
 classId?: string | null;
 title: string;
 category: string;
 amount: number;
 date: string;
 notes: string;
}

export interface Income {
 id: string;
 classId?: string | null;
 title: string;
 category: string;
 amount: number;
 date: string;
 source: string;
}

export interface BillWithStudent extends Bill {
 student: Student;
 className: string;
}

export interface TransactionWithDetails extends Transaction {
 studentName: string;
 className: string;
 billName: string;
 billAmount: number;
 methodName?: string;
}

export interface DashboardSummary {
 totalBills: number;
 totalPaid: number;
 outstanding: number;
 collectionRate: number;
}

export interface PaymentOverview {
 className: string;
 totalStudents: number;
 paidStudents: number;
 unpaidStudents: number;
 paymentRate: number;
}

export interface PaymentTrend {
 period: string;
 paid: number;
 unpaid: number;
}

export interface MonthlyBalance {
 month: string;
 income: number;
 expense: number;
 balance: number;
}

export type ResetRequestStatus = "pending" | "approved" | "rejected";

export interface PasswordResetRequest {
 id: string;
 studentId: string;
 nisn: string;
 studentName: string;
 status: ResetRequestStatus;
 adminNote?: string | null;
 resolvedBy?: string | null;
 resolvedAt?: string | null;
 createdAt: string;
}

export type ReminderTargetType = "all" | "unpaid" | "specific";
export type ReminderChannel = "web" | "email";
export type ReminderStatus = "sent" | "partial_failed" | "failed";

export interface Reminder {
 id: string;
 title: string;
 message: string;
 targetType: ReminderTargetType;
 targetCount: number;
 channels: ReminderChannel[];
 status: ReminderStatus;
 createdBy?: string | null;
 createdAt: string;
}

export interface UserNotification {
 id: string;
 userId: string;
 reminderId?: string | null;
 title: string;
 message: string;
 isRead: boolean;
 createdAt: string;
}
