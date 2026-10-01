"use client";

import { useSyncExternalStore } from "react";
import {
 DEFAULT_SCHOOL,
 getSchoolProfile,
 subscribeSchool,
 type SchoolProfile,
} from "@/lib/school";

export function useSchool(): SchoolProfile {
 return useSyncExternalStore(subscribeSchool, getSchoolProfile, () => DEFAULT_SCHOOL);
}