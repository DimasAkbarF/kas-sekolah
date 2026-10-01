"use client";

import { useSyncExternalStore } from "react";
import {
 getAccounts,
 subscribeAccounts,
 type Account,
} from "@/lib/accounts";

const EMPTY: Account[] = [];

export function useAccounts(): Account[] {
 return useSyncExternalStore(subscribeAccounts, getAccounts, () => EMPTY);
}