const SATUAN = [
 "",
 "satu",
 "dua",
 "tiga",
 "empat",
 "lima",
 "enam",
 "tujuh",
 "delapan",
 "sembilan",
 "sepuluh",
 "sebelas",
];

function bacaBilangan(n: number): string {
 if (n < 12) return SATUAN[n];
 if (n < 20) return `${bacaBilangan(n - 10)} belas`;
 if (n < 100) return `${bacaBilangan(Math.floor(n / 10))} puluh ${bacaBilangan(n % 10)}`.trim();
 if (n < 200) return `seratus ${bacaBilangan(n - 100)}`.trim();
 if (n < 1000) return `${bacaBilangan(Math.floor(n / 100))} ratus ${bacaBilangan(n % 100)}`.trim();
 if (n < 2000) return `seribu ${bacaBilangan(n - 1000)}`.trim();
 if (n < 1000000) return `${bacaBilangan(Math.floor(n / 1000))} ribu ${bacaBilangan(n % 1000)}`.trim();
 if (n < 1000000000) return `${bacaBilangan(Math.floor(n / 1000000))} juta ${bacaBilangan(n % 1000000)}`.trim();
 return `${bacaBilangan(Math.floor(n / 1000000000))} milyar ${bacaBilangan(n % 1000000000)}`.trim();
}

/** Uang rupiah menjadi huruf, mis. 67500 → "enam puluh tujuh ribu lima ratus rupiah". */
export function terbilang(amount: number): string {
 if (!Number.isFinite(amount) || amount < 0) return "";
 if (amount === 0) return "nol rupiah";
 return `${bacaBilangan(amount)} rupiah`;
}