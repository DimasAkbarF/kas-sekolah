import { ImageResponse } from "next/og";
import { DEFAULT_SCHOOL, SCHOOL_FACTS } from "@/lib/school";

export const alt = `${DEFAULT_SCHOOL.name}, platform kas sekolah`;
export const size = {
 width: 1200,
 height: 630,
};
export const contentType = "image/png";

export default async function Image() {
 const primary = "#0b3c78";
 const onPrimary = "#ffffff";

 return new ImageResponse(
 <div
 style={{
 background: primary,
 width: "100%",
 height: "100%",
 display: "flex",
 flexDirection: "column",
 justifyContent: "space-between",
 padding: "72px 80px",
 fontFamily: "system-ui, sans-serif",
 }}
 >
 <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
 <div
 style={{
 width: 96,
 height: 96,
 borderRadius: 24,
 background: onPrimary,
 display: "flex",
 alignItems: "center",
 justifyContent: "center",
 }}
 >
 <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
 <path
 d="M14 22c-.7-3-3.5-5.4-7-6.7V9.7h-.1V7.4l15-3.3 1.1 5.8-1.9.4c.3 1.4.2 2.9-.3 4.2l1 .2-.7 3.9-1.9-.3c-1 1.4-2.4 2.5-3.9 3.2V22h-1.3z"
 fill={primary}
 />
 <path d="M7 22H4v-9h3v9zm-3-4.5h3" stroke={primary} strokeWidth="1.5" strokeLinecap="round" />
 </svg>
 </div>
 <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
 <div
 style={{
 fontSize: 44,
 fontWeight: 700,
 color: onPrimary,
 letterSpacing: "-0.02em",
 }}
 >
 {DEFAULT_SCHOOL.name}
 </div>
 <div
 style={{
 fontSize: 18,
 fontWeight: 600,
 letterSpacing: "0.28em",
 color: "rgba(255,255,255,0.75)",
 }}
 >
 {SCHOOL_FACTS.motto}
 </div>
 </div>
 </div>

 <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
 <div
 style={{
 fontSize: 56,
 fontWeight: 700,
 color: onPrimary,
 lineHeight: 1.15,
 letterSpacing: "-0.02em",
 }}
 >
 Platform kas sekolah SMP Negeri 17 Tangsel
 </div>
 <div
 style={{
 width: 160,
 height: 6,
 background: "rgba(255,255,255,0.85)",
 }}
 />
 <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
 {["Tagihan SPP", "Pembayaran online", "Laporan kas", "Akreditasi A"].map((item) => (
 <div
 key={item}
 style={{
 padding: "12px 22px",
 borderRadius: 999,
 border: "1px solid rgba(255,255,255,0.35)",
 color: onPrimary,
 fontSize: 18,
 fontWeight: 500,
 }}
 >
 {item}
 </div>
 ))}
 </div>
 </div>
 </div>,
 {
 ...size,
 },
 );
}
