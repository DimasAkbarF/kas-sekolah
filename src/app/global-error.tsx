"use client";

// Penangkap terakhir: juga mencakup error di root layout, sehingga harus
// merender <html>/<body> sendiri dan tidak boleh memakai komponen yang butuh
// konteks aplikasi.
export default function GlobalError({
 reset,
}: {
 error: Error & { digest?: string };
 reset: () => void;
}) {
 return (
 <html lang="id">
 <body
 style={{
 display: "flex",
 minHeight: "100svh",
 flexDirection: "column",
 alignItems: "center",
 justifyContent: "center",
 gap: "1rem",
 padding: "1.5rem",
 textAlign: "center",
 fontFamily: "system-ui, sans-serif",
 }}
 >
 <h1 style={{ fontSize: "1.125rem", fontWeight: 600 }}>Aplikasi tidak dapat dimuat</h1>
 <p style={{ maxWidth: "24rem", fontSize: "0.875rem", color: "#5A6B6A" }}>
 Terjadi kesalahan yang tidak terduga. Muat ulang halaman, atau hubungi admin sekolah bila terus
 berulang.
 </p>
 <button
 type="button"
 onClick={reset}
 style={{
 cursor: "pointer",
 borderRadius: "0.5rem",
 background: "#0E7C7B",
 padding: "0.5rem 1rem",
 fontSize: "0.875rem",
 color: "#fff",
 }}
 >
 Muat ulang
 </button>
 </body>
 </html>
 );
}
