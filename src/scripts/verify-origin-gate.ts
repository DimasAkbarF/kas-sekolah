import { withRouteErrors } from "@/lib/api";

let failures = 0;
function check(label: string, ok: boolean, detail = ""): void {
  if (ok) console.log(`  PASS  ${label}`);
  else {
    failures++;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

const BASE = "http://localhost:3000";
let reached = 0;
let lastMethod = "";
const handler = withRouteErrors(async (request: Request) => {
  reached++;
  lastMethod = request.method;
  return new Response("ok", { status: 200 }) as never;
});

async function call(url: string, method: string, headers: Record<string, string>) {
  reached = 0;
  lastMethod = "";
  const res = await handler(new Request(url, { method, headers }));
  return { status: res.status, reached, method: lastMethod };
}

async function main(): Promise<void> {
  console.log("\n[5] Gerbang Origin/Referer untuk request mutasi");

  // Skenario yang paling merusak kalau salah: POST login tanpa header Origin
  // sama sekali. Kalau ini diblokir, tidak ada yang bisa masuk.
  let r = await call(`${BASE}/api/auth/login`, "POST", {});
  check("POST tanpa Origin/Referer ditolak", r.status === 403, `status ${r.status}`);
  check("  handler tidak dijalankan", r.reached === 0);

  r = await call(`${BASE}/api/auth/login`, "POST", { origin: "http://evil.test" });
  check("POST lintas domain ditolak", r.status === 403, `status ${r.status}`);

  r = await call(`${BASE}/api/auth/login`, "POST", {
    referer: "https://evil.test/form",
  });
  check("Referer lintas domain ditolak", r.status === 403, `status ${r.status}`);

  // Origin dari browser pada domain yang sama harus LOLOS, kalau tidak semua
  // request mutate dari UI jadi mati.
  r = await call(`${BASE}/api/payments`, "POST", { origin: BASE });
  check("POST same-origin (Origin) diteruskan", r.reached === 1, `status ${r.status}`);
  check("  method sampai ke handler apa adanya", r.method === "POST", r.method);

  r = await call(`${BASE}/api/payments`, "PATCH", { origin: BASE });
  check("PATCH same-origin diteruskan", r.reached === 1, `status ${r.status}`);

  r = await call(`${BASE}/api/transactions/x`, "DELETE", { origin: BASE });
  check("DELETE same-origin diteruskan", r.reached === 1, `status ${r.status}`);

  r = await call(`${BASE}/api/transactions`, "GET", {});
  check("GET tanpa Origin tetap boleh (bukan mutasi)", r.reached === 1, `status ${r.status}`);

  // Webhook DOKU: server-to-server, tidak punya Origin, harus tetap diterima
  // atau pembayaran tidak pernah tercatat lunas.
  r = await call(`${BASE}/api/payment/doku/notification`, "POST", {});
  check("webhook DOKU dikecualikan dari cek Origin", r.reached === 1, `status ${r.status}`);

  r = await call(`${BASE}/api/payment/doku/notification`, "POST", {
    origin: "https://api.doku.com",
  });
  check("webhook DOKU tetap jalan walau punya Origin", r.reached === 1, `status ${r.status}`);

  console.log(failures === 0 ? "\nSemua check lolos.\n" : `\n${failures} check gagal.\n`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
