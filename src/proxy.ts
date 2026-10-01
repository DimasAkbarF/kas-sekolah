import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Proxy: penjaga tepi jaringan — hanya memeriksa keberadaan cookie session.
// Role & validitas session diverifikasi di API guard (server) karena proxy
// berjalan di edge tanpa akses DB.
//
// Aktif hanya saat backend terpasang (DATABASE_URL ada). Selama masa migrasi
// UI masih memakai mock localStorage, proxy dibiarkan nonaktif agar demo lama
// tidak rusak.
const SESSION_COOKIE = "ks_session";

export function proxy(request: NextRequest) {
 if (!process.env.DATABASE_URL) return NextResponse.next();
 if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
 const url = new URL("/login", request.url);
 url.searchParams.set("redirect", request.nextUrl.pathname);
 return NextResponse.redirect(url);
}

export const config = {
 matcher: ["/admin/:path*", "/student/:path*", "/treasurer/:path*", "/principal/:path*"],
};