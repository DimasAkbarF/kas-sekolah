import type { User, UserRole } from "@/types";
import { ApiError, apiFetch } from "@/lib/api-client";
import {
 clearStoredSession,
 getStoredSession,
 setStoredSession,
} from "@/lib/auth";
import { refreshAll } from "@/lib/sync";

export interface LoginCredentials {
 identifier: string;
 password: string;
}

export class AuthenticationError extends Error {
 constructor(message: string) {
 super(message);
 this.name = "AuthenticationError";
 }
}

// Login via API (session httpOnly cookie ditangani browser).
export async function login(
 role: UserRole | undefined,
 credentials: LoginCredentials,
): Promise<User> {
 const { identifier, password } = credentials;

 if (!identifier.trim() || !password) {
 throw new AuthenticationError("Email/NIS dan password wajib diisi.");
 }

 let user: User;
 try {
 const res = await apiFetch<{ user: User }>("/api/auth/login", {
 method: "POST",
 body: JSON.stringify({ identifier: identifier.trim(), password, role }),
 });
 user = res.user;
 } catch (err) {
 throw new AuthenticationError(
 err instanceof ApiError && err.message
 ? err.message
 : "Tidak dapat terhubung ke server.",
 );
 }

 setStoredSession(user);
 await refreshAll();
 return user;
}

export function getCurrentUser(): User | null {
 return getStoredSession();
}

export async function logout(): Promise<void> {
 try {
 await apiFetch<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
 } catch {
 // abaikan; session lokal tetap dibersihkan
 }
 clearStoredSession();
}

export function roleDashboardPath(role: UserRole): string {
 const map: Record<UserRole, string> = {
 super_admin: "/admin/dashboard",
 class_admin: "/admin/dashboard",
 treasurer: "/treasurer/dashboard",
 student: "/student/dashboard",
 };
 return map[role];
}