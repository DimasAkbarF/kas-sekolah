"use client";

import { useSyncExternalStore } from "react";
import {
 getDataVersion,
 getServerDataVersion,
 subscribeData,
} from "@/lib/data-version";

// Memaksa halaman yang sudah ter-mount (mis. dashboard) untuk re-render setiap
// kali sinkronisasi API selesai, agar membaca array mock yang baru terisi.
// Mengembalikan versi data agar pemanggil bisa memflag dependensi useMemo
// agregat render-scope.
export function useDataVersion(): number {
 return useSyncExternalStore(subscribeData, getDataVersion, getServerDataVersion);
}