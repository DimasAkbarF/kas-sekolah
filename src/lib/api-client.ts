import { clearStoredSession } from "@/lib/auth";

export class ApiError extends Error {
 status: number;
 locked: boolean;

 constructor(message: string, status: number, locked = false) {
 super(message);
 this.name = "ApiError";
 this.status = status;
 this.locked = locked;
 }
}

interface ApiBody {
 error?: string;
 locked?: boolean;
}

// Fetch wrapper untuk route handler lokal. Cookie session (httpOnly) dikirim
// otomatis oleh browser untuk origin yang sama.
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
 let res: Response;
 try {
 res = await fetch(path, {
 credentials: "same-origin",
 headers: init?.body ? { "Content-Type": "application/json", ...init?.headers } : init?.headers,
 ...init,
 });
 } catch {
 throw new ApiError("Tidak dapat terhubung ke server.", 0);
 }

 const data = (await res.json().catch(() => ({}))) as T & ApiBody;
 if (res.status === 401) {
 // Sesi habis/dicabut (mis. password direset) → kembali ke login.
 // Sesi lokal ikut dibersihkan: kalau tidak, AuthGate di layout login masih
 // melihat user basi dan melempar balik ke dashboard → loop tak berujung.
 if (typeof window !== "undefined") {
 clearStoredSession();
 // Jangan redirect saat path itu sendiri adalah endpoint auth.
 if (!path.startsWith("/api/auth")) {
 // Navigasi keras di luar render/event-handler komponen (plain module) —
 // useRouter tidak tersedia di sini.
 // eslint-disable-next-line @next/next/no-location-assign-relative-destination
 window.location.href = "/login?reason=expired";
 }
 }
 throw new ApiError(data.error ?? "Sesi berakhir. Silakan masuk kembali.", 401, !!data.locked);
 }
 if (!res.ok) {
 throw new ApiError(data.error ?? `Permintaan gagal (${res.status}).`, res.status, !!data.locked);
 }
 return data;
}