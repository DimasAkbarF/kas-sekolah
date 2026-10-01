// Self-check terbilang: `tsx src/scripts/terbilang-check.ts`
import assert from "node:assert";
import { terbilang } from "@/lib/terbilang";

const cases: Array<[number, string]> = [
 [0, "nol rupiah"],
 [1, "satu rupiah"],
 [11, "sebelas rupiah"],
 [18, "delapan belas rupiah"],
 [73, "tujuh puluh tiga rupiah"],
 [100, "seratus rupiah"],
 [140, "seratus empat puluh rupiah"],
 [1000, "seribu rupiah"],
 [2000, "dua ribu rupiah"],
 [67500, "enam puluh tujuh ribu lima ratus rupiah"],
 [150000, "seratus lima puluh ribu rupiah"],
 [1000000, "satu juta rupiah"],
 [2500000, "dua juta lima ratus ribu rupiah"],
 [123456789, "seratus dua puluh tiga juta empat ratus lima puluh enam ribu tujuh ratus delapan puluh sembilan rupiah"],
];

for (const [input, expected] of cases) {
 assert.strictEqual(terbilang(input), expected, `terbilang(${input})`);
}
assert.strictEqual(terbilang(-1), "");
assert.strictEqual(terbilang(Number.NaN), "");
console.log(`terbilang: ${cases.length} kasus OK`);