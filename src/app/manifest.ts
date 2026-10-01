import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
 return {
 name: "Kas Sekolah SMP Negeri 17 Tangerang Selatan",
 short_name: "Kas Sekolah",
 description:
 "Sistem pengelolaan uang kas sekolah: tagihan SPP, pembayaran online & manual, laporan kas.",
 start_url: "/login",
 display: "standalone",
 background_color: "#EFF8F7",
 theme_color: "#177A75",
 icons: [
 {
 src: "/favicon.ico",
 sizes: "any",
 type: "image/x-icon",
 },
 ],
 lang: "id",
 };
}