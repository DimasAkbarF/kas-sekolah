"use client";

import { useEffect } from "react";
import { hydrate } from "@/lib/sync";

// Dipasang di root layout: sekali saat mount, tarik session + data dari API
// (kalau cookie session aktif) lalu isi store lokal yang dipakai seluruh UI.
export function HydrateOnMount() {
 useEffect(() => {
 void hydrate();
 }, []);
 return null;
}
