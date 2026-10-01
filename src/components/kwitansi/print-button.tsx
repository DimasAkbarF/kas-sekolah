"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

// Dipisah dari page.tsx karena halaman kwitansi kini Server Component: sesi dan
// data kwitansi diverifikasi di server. Hanya aksi cetak yang butuh
// window.print(), jadi hanya bagian ini yang masuk ke bundel klien.
export function PrintButton() {
  return (
    <Button onClick={() => window.print()} className="mr-2">
      <Printer className="mr-2 h-4 w-4" />
      Cetak Kwitansi
    </Button>
  );
}
