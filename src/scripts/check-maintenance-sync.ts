/**
 * Check: kelas dalam maintenance tidak boleh memicu pemuatan data.
 *
 * Meniru browser secukupnya (window.localStorage + fetch), lalu memanggil
 * hydrate() sungguhan. Kalau guard `classMaintenance` di `loadFor` dihapus,
 * script ini menghitung 6 permintaan dan gagal.
 *
 * Jalankan: npx tsx src/scripts/check-maintenance-sync.ts
 */
class FakeStorage {
 private map = new Map<string, string>();
 getItem(k: string): string | null {
 return this.map.get(k) ?? null;
 }
 setItem(k: string, v: string): void {
 this.map.set(k, v);
 }
 removeItem(k: string): void {
 this.map.delete(k);
 }
 clear(): void {
 this.map.clear();
 }
 key(i: number): string | null {
 return [...this.map.keys()][i] ?? null;
 }
 get length(): number {
 return this.map.size;
 }
}

const store = new FakeStorage();
const paths: string[] = [];

(globalThis as unknown as { window: unknown }).window = {
 localStorage: store,
 addEventListener() {},
 removeEventListener() {},
 location: { origin: "http://localhost:3000" },
 navigator: { language: "id-ID" },
};

const DATA_PATHS = new Set([
 "/api/students",
 "/api/bills",
 "/api/transactions",
 "/api/settings",
 "/api/incomes",
 "/api/expenses",
]);

const BASE_USER = {
 id: "u-test",
 name: "Admin 7A",
 email: "mtest-7a@sch.test",
 role: "class_admin",
 avatar: null,
 classId: "mtest-7a",
 className: "7A",
 classActive: true,
 classMaintenance: true,
};

function json(body: unknown, status = 200): Response {
 return new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json" },
 });
}

globalThis.fetch = (async (input: RequestInfo | URL) => {
 const url = typeof input === "string" ? input : String(input);
 const path = url.replace("http://localhost:3000", "").split("?")[0];
 paths.push(path);
 if (path === "/api/auth/me") return json({ user: { ...BASE_USER } });
 // Semua endpoint data membalas 503 di mode maintenance, persis guard().
 return json({ error: "Kelas ini sedang dalam pemeliharaan." }, 503);
}) as typeof fetch;

async function main(): Promise<void> {
 // `SESSION_KEY` sengaja tidak diekspor dari lib/auth, jadi kuncinya ditulis
 // langsung di sini. Kalau nama kuncinya berubah, test ini gagal loudly.
 store.setItem("kas-sekolah.session", JSON.stringify(BASE_USER));

 const { hydrate } = await import("../lib/sync");
 await hydrate();

 const meCalls = paths.filter((p) => p === "/api/auth/me").length;
 const dataCalls = paths.filter((p) => DATA_PATHS.has(p));

 const checks: [string, boolean][] = [
  [`/api/auth/me dipanggil tepat 1x (dapat ${meCalls})`, meCalls === 1],
  [
   `tidak ada endpoint data yang dipanggil (dapat ${dataCalls.length})`,
   dataCalls.length === 0,
  ],
 ];

 let failed = 0;
 for (const [label, ok] of checks) {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
 }
 console.log(`\npermintaan: ${JSON.stringify(paths)}`);

 if (failed > 0) {
  console.error(`\n${failed} pemeriksaan gagal`);
  process.exit(1);
 }
 console.log("\nsemua pemeriksaan lulus");
}

void main();
