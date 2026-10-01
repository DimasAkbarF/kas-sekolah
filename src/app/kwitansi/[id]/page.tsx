import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { applyScope } from "@/lib/api";
import { isStaffRole } from "@/lib/roles";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { terbilang } from "@/lib/terbilang";
import { PrintButton } from "@/components/kwitansi/print-button";
import { DEFAULT_SCHOOL } from "@/lib/school";

export const dynamic = "force-dynamic";

// Kwitansi adalah dokumen resmi bertanda tangan bendahara, jadi SELURUH
// penentuannya ada di server: sesi cookie + baris transaksi di database.
//
// Versi sebelumnya memverifikasi role lewat localStorage dan membaca transaksi
// dari array mock, sehingga siapa pun bisa membuka halamannya lewat DevTools
// (`localStorage.setItem("kas-sekolah.session", {role:"treasurer"})`) lalu
// mencetak kwitansi fiktif. Data mock juga berarti kwitansi tidak pernah
// mencerminkan pembayaran yang benar-benar tercatat.

interface ReceiptRow {
  id: string;
  amount: number;
  paymentMethod: string;
  status: string;
  externalReference: string | null;
  methodName: string | null;
  paidAt: string | null;
  createdAt: string;
  studentName: string;
  billName: string;
  className: string;
}

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/login?redirect=/kwitansi/${encodeURIComponent(id)}`);
  if (!isStaffRole(user.role)) redirect("/login");
  if (user.classMaintenance) redirect("/maintenance");

  const db = await getDb();

  // Scope kelas yang sama persis dengan GET /api/transactions/[id]: Admin Kelas
  // hanya boleh membuka kwitansi transaksinya sendiri.
  const conds: string[] = ["t.id = $1"];
  const vals: unknown[] = [id];
  applyScope(user, conds, vals, "t");
  const { rows } = await db.query<ReceiptRow>(
    `SELECT t.id, t.amount, t.payment_method AS "paymentMethod", t.status,
    t.external_reference AS "externalReference",
    t.paid_at AS "paidAt", t.created_at AS "createdAt",
    s.name AS "studentName", b.name AS "billName",
    COALESCE(s.class_name, '') AS "className",
    pm.name AS "methodName"
    FROM transactions t
    JOIN students s ON s.id = t.student_id
    JOIN bills b ON b.id = t.bill_id
    LEFT JOIN payment_methods pm ON pm.id = t.method_id
    WHERE ${conds.join(" AND ")}`,
    vals,
  );

  const schoolRes = await db.query<{
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
  }>("SELECT name, address, phone, email FROM school_settings WHERE id = 1");
  const school = { ...DEFAULT_SCHOOL, ...schoolRes.rows[0] };

  const backPath =
    user.role === "treasurer" ? "/treasurer/transactions" : "/admin/transactions";

  // Hanya transaksi lunas yang punya bukti sah untuk dicetak.
  const tx = rows[0];
  if (!tx || tx.status !== "PAID") {
    return (
      <div className="min-h-screen bg-muted/40 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <p className="text-sm">
            Transaksi tidak ditemukan, belum lunas, atau di luar kelas Anda.
          </p>
          <a
            href={backPath}
            className="inline-flex items-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/50"
          >
            Kembali
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background print:bg-white">
      <div className="mx-auto max-w-2xl p-4 sm:p-8 print:max-w-none print:p-0">
        <div className="flex justify-end print:hidden mb-4">
          <PrintButton />
          <a
            href={backPath}
            className="inline-flex items-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/50"
          >
            Kembali
          </a>
        </div>

        <div className="rounded-xl border border-border bg-white shadow-card print:rounded-none print:border-0 print:shadow-none">
          <div className="border-b-2 border-black px-8 py-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-lg font-bold">{school.name}</h1>
              <p className="text-xs text-black/70 mt-1 max-w-sm">{school.address}</p>
              <p className="text-xs text-black/70">
                {[school.phone, school.email].filter(Boolean).join("·")}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xl font-black st">Kwitansi</p>
              <p className="text-xs text-black/70 mt-1">Nomor: {tx.id}</p>
            </div>
          </div>

          <div className="px-8 py-6 space-y-5 text-sm">
            <table className="w-full">
              <tbody>
                <tr>
                  <td className="py-1 w-40 align-top">Sudah diterima dari</td>
                  <td className="py-1">: {tx.studentName}</td>
                </tr>
                <tr>
                  <td className="py-1 align-top">Uang sejumlah</td>
                  <td className="py-1">: {terbilang(tx.amount)}</td>
                </tr>
                <tr>
                  <td className="py-1 align-top" />
                  <td className="py-1">: {formatCurrency(tx.amount)}</td>
                </tr>
                <tr>
                  <td className="py-1 align-top">Untuk pembayaran</td>
                  <td className="py-1">: {tx.billName}</td>
                </tr>
                <tr>
                  <td className="py-1 align-top">Kelas</td>
                  <td className="py-1">: {tx.className}</td>
                </tr>
                <tr>
                  <td className="py-1 align-top">Metode</td>
                  <td className="py-1">: {tx.methodName ?? tx.paymentMethod.replace("_", "")}</td>
                </tr>
                <tr>
                  <td className="py-1 align-top">Tanggal</td>
                  <td className="py-1">: {formatDate(tx.paidAt || tx.createdAt)}</td>
                </tr>
                {tx.externalReference && (
                  <tr>
                    <td className="py-1 align-top">Referensi</td>
                    <td className="py-1">: {tx.externalReference}</td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="flex justify-end pt-8">
              <div className="text-center">
                <p className="mb-14">Bendahara Sekolah</p>
                <p className="underline">(____________________)</p>
                <p className="text-xs mt-1">NIP. / NO. PEGAWAI</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
