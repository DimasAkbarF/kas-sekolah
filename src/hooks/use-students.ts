"use client";

import { useSyncExternalStore } from "react";
import {
 SERVER_STUDENT_SNAPSHOT,
 getStudentsSnapshot,
 subscribeStudents,
} from "@/mock/students";
import type { Student } from "@/types";

export function useStudents(): { active: Student[]; archived: Student[] } {
 return useSyncExternalStore(subscribeStudents, getStudentsSnapshot, () => SERVER_STUDENT_SNAPSHOT);
}