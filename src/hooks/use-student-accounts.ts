"use client";

import { useSyncExternalStore } from "react";
import {
 getStudentAccountsSnapshot,
 getStudentAccountsServerSnapshot,
 subscribeStudentAccounts,
} from "@/mock/student-accounts";
import type { StudentAccount } from "@/mock/student-accounts";

export function useStudentAccounts(): { hasAccount: (studentId: string) => boolean } {
 const accounts = useSyncExternalStore(
 subscribeStudentAccounts,
 getStudentAccountsSnapshot,
 getStudentAccountsServerSnapshot,
 );

 return {
 hasAccount: (studentId: string) =>
 accounts.some((a: StudentAccount) => a.studentId === studentId),
 };
}