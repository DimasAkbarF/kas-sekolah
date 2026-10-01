import { cn } from "@/lib/utils";

/**
 * Ilustrasi garis untuk halaman pemeliharaan.
 *
 * Tiga elemen, semuanya mereferensikan benda nyata aplikasi ini: buku kas
 * (baris-baris entri), roda gigi (sedang dikerjakan), dan garis putus-putus
 * (pekerjaan yang belum selesai). Bukan ilustrasi library, bukan figur
 * karikatur, bukan blob: kalau logo dan nama produk diganti, gambar ini masih
 * harus masuk akal untuk "sistem kas sedang diservis".
 *
 * Digambar tangan sebagai SVG inline, bukan file gambar, supaya warnanya
 * mengikuti token tema dan tidak menambah request. `aria-hidden` karena
 * sudah dijelaskan oleh teksnya.
 *
 * Gerakannya finitely: roda gigi berputar tiga kali, baris buku kas tergambar
 * berurutan, garis konektor bergerak maju. Setelah tiga putaran ilustrasi diam.
 * Kunci animasinya ada di `globals.css` (`ks-maint-*`) supaya blok
 * `prefers-reduced-motion` yang sudah ada ikut mematikannya semua.
 */
export function MaintenanceIllustration({ className }: { className?: string }) {
 return (
 <svg
 viewBox="0 0 96 96"
 fill="none"
 aria-hidden="true"
 focusable="false"
 className={cn("h-24 w-24 text-muted-foreground", className)}
 >
 {/*
 Buku kas terbuka. Persegi membulat 6px, dua halaman yang dipisah garis tengah.
 */}
 <rect
 x="14"
 y="26"
 width="52"
 height="44"
 rx="6"
 className="stroke-current"
 strokeWidth="1.75"
 />
 <path
 d="M40 26v44"
 className="stroke-current"
 strokeWidth="1.75"
 strokeLinecap="round"
 />
 {/*
 Baris entri. Semuanya satu `<path>` supaya satu animasi cukup; perlambat
 0.12s per pasangan baris supaya membaca seperti sedang mengetik, bukan
 menyala serentak.
 */}
 <path
 d="M21 38h12M47 38h12M21 48h12M47 48h12M21 58h8M47 58h8"
 className="ks-maint-ledger stroke-current"
 strokeWidth="1.75"
 strokeLinecap="round"
 opacity="0.45"
 style={{ animationDelay: "0s" }}
 />
 <path
 d="M21 38h12M47 38h12M21 48h12M47 48h12M21 58h8M47 58h8"
 className="ks-maint-ledger stroke-current"
 strokeWidth="1.75"
 strokeLinecap="round"
 opacity="0.45"
 style={{ animationDelay: "0.12s" }}
 />
 <path
 d="M21 38h12M47 38h12M21 48h12M47 48h12M21 58h8M47 58h8"
 className="ks-maint-ledger stroke-current"
 strokeWidth="1.75"
 strokeLinecap="round"
 opacity="0.45"
 style={{ animationDelay: "0.24s" }}
 />

 {/*
 Garis putus-putus: menyambungkan buku kas dengan roda gigi, sekaligus memberi
 tanda "pekerjaan sedang berjalan" tanpa memakai teks atau ikon tambahan.
 */}
 <path
 d="M62 58h4"
 className="ks-maint-connector stroke-current"
 strokeWidth="1.75"
 strokeLinecap="round"
 strokeDasharray="1 4"
 opacity="0.5"
 />

 {/*
 Roda gigi: lingkaran luar + lubang poros + delapan gigi persegi. Gigi digambar
 sebagai satu kelompok lalu diputar 45° berurutan, jadi bentuknya simetris.
 `transform-box: fill-box` membuat putaran berpusat pada roda gigi, bukan pada
 asal koordinat SVG.
 */}
 <g transform="translate(70 66)" className="text-primary">
 <g className="ks-maint-gear">
 <circle r="9" className="stroke-current" strokeWidth="1.75" />
 <circle r="3.25" className="stroke-current" strokeWidth="1.75" />
 <g className="stroke-current" strokeWidth="2.5" strokeLinecap="round">
 <path d="M0-12.5v3" transform="rotate(0)" />
 <path d="M0-12.5v3" transform="rotate(45)" />
 <path d="M0-12.5v3" transform="rotate(90)" />
 <path d="M0-12.5v3" transform="rotate(135)" />
 <path d="M0-12.5v3" transform="rotate(180)" />
 <path d="M0-12.5v3" transform="rotate(225)" />
 <path d="M0-12.5v3" transform="rotate(270)" />
 <path d="M0-12.5v3" transform="rotate(315)" />
 </g>
 </g>
 </g>
 </svg>
 );
}
