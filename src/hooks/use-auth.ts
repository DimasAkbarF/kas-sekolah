"use client";

import { useSyncExternalStore } from "react";
import {
 getStoredSession,
 subscribeAuth,
} from "@/lib/auth";
import {
 getDataVersion,
 getServerDataVersion,
 subscribeData,
} from "@/lib/data-version";
import { logout as clearSession } from "@/services/auth.service";
import type { User } from "@/types";

const serverSnapshot = (): User | null => null;

export function useAuth(): { user: User | null; signOut: () => Promise<void> } {
 // Versi data dikonsumsi sebagai "pesan" agar re-render terjadi setiap kali
 // sinkronisasi API selesai (page yang sudah ter-mount membaca array terbaru).
 useSyncExternalStore(subscribeData, getDataVersion, getServerDataVersion);
 const user = useSyncExternalStore(subscribeAuth, getStoredSession, serverSnapshot);
 return { user, signOut: clearSession };
}