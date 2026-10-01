/**
 * Google Apps Script (GAS) Code.gs
 * Target: Automasi Notifikasi & Sinkronisasi Kas Kelas 03TPLP006
 */

// TODO: replace <INSERT_SPREADSHEET_ID_HERE> with actual Sheet ID
const SPREADSHEET_ID = "<INSERT_SPREADSHEET_ID_HERE>";

/**
 * Cegah formula injection di Spreadsheet.
 *
 * Nilai yang diawali =, +, -, @ (juga tab/CR) diperlakukan sebagai formula
 * oleh Sheets/Excel. Nama siswa atau nama tagihan bisa berisi string seperti
 * `=IMPORTXML(...)`, yang akan dieksekusi spreadsheet begitu bendahara
 * membukanya. Awalan kutip satu memaksa sel dibaca sebagai teks.
 */
function sanitizeForSheet(val) {
  const s = String(val == null ? "" : val);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

/** Escape untuk disisipkan ke htmlBody email. Tanpa ini, nama siswa berisi tag
 * HTML bisa menyisipkan tautan phishing ke email resmi sekolah. */
function escapeHtml(val) {
  return String(val == null ? "" : val)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function doPost(e) {
  try {
    if (!e?.postData?.contents) throw new Error("Missing payload");
    const data = JSON.parse(e.postData.contents);
    const required = ["transaction_id", "nama_mahasiswa", "email", "nominal", "tanggal_bayar", "bulan_tagihan"];
    for (const key of required) {
      if (data[key] === undefined || data[key] === null) throw new Error(`missing ${key}`);
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheets()[0]; // first sheet
    const { nama_mahasiswa, email, nominal, tanggal_bayar, bulan_tagihan, transaction_id } = data;
    const values = sheet.getDataRange().getValues();
    let rowIdx = -1;
    // Column F (index 5) holds transaction_id if present
    for (let i = 1; i < values.length; i++) {
      if (values[i][5] && String(values[i][5]) === String(transaction_id)) {
        rowIdx = i; break;
      }
    }
    // fallback: match by email to avoid duplicate student rows
    if (rowIdx === -1) {
      for (let i = 1; i < values.length; i++) {
        if (values[i][1] && String(values[i][1]).toLowerCase() === email.toLowerCase()) {
          rowIdx = i; break;
        }
      }
    }
    if (rowIdx !== -1) {
      sheet.getRange(rowIdx + 1, 3).setValue("Sudah Bayar"); // C status
      sheet.getRange(rowIdx + 1, 4).setValue(sanitizeForSheet(tanggal_bayar));   // D tanggal
      sheet.getRange(rowIdx + 1, 5).setValue(sanitizeForSheet(bulan_tagihan));   // E bulan
      sheet.getRange(rowIdx + 1, 6).setValue(transaction_id); // F id
    } else {
      sheet.appendRow([
        sanitizeForSheet(nama_mahasiswa),
        sanitizeForSheet(email),
        "Sudah Bayar",
        sanitizeForSheet(tanggal_bayar),
        sanitizeForSheet(bulan_tagihan),
        transaction_id,
      ]);
    }

    sendReceipt(email, nama_mahasiswa, nominal, bulan_tagihan);
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    console.error("GAS doPost error:", err);
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function sendReceipt(email, nama, nominal, bulan) {
  const subject = "Bukti Pembayaran Kas Kelas 03TPLP006 - LUNAS";
  const formattedNominal = typeof nominal === "number" ? "Rp " + nominal.toLocaleString('id-ID') : String(nominal);
  // Semua nilai dari sheet/db masuk lewat escapeHtml: nama siswa dan nama
  // tagihan adalah data bebas, dan tanpa ini email resmi sekolah bisa
  // disisipi tautan phishing.
  const safeNama = escapeHtml(nama);
  const safeBulan = escapeHtml(bulan);
  const safeNominal = escapeHtml(formattedNominal);
  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 600px; border: 1px solid #eee; padding: 20px;">
      <h2 style="color: #2e7d32;">E‑Kuitansi Pembayaran Lunas</h2>
      <p>Halo <b>${safeNama}</b>,</p>
      <p>Terima kasih! Pembayaran kas Anda telah kami terima.</p>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding:8px; border-bottom:1px solid #eee;"><b>Bulan Tagihan</b></td><td style="padding:8px; border-bottom:1px solid #eee;">${safeBulan}</td></tr>
        <tr><td style="padding:8px; border-bottom:1px solid #eee;"><b>Nominal</b></td><td style="padding:8px; border-bottom:1px solid #eee;">${safeNominal}</td></tr>
        <tr><td style="padding:8px; border-bottom:1px solid #eee;"><b>Status</b></td><td style="padding:8px; border-bottom:1px solid #eee;"><span style="background:#e8f5e9;color:#2e7d32;padding:4px 8px;border-radius:4px;">LUNAS</span></td></tr>
      </table>
      <p style="margin-top:20px;font-size:12px;color:#666;">Dicetak otomatis pada ${new Date().toLocaleString('id-ID')}.</p>
    </div>`;
  try {
    MailApp.sendEmail({ to: email, subject, htmlBody });
  } catch (e) {
    console.error("Email send failed:", e);
  }
}
