// DDL Postgres (dialek PG16 — berjalan di PGlite lokal & Neon/Vercel).
// Idempotent: aman dijalankan berulang.

export const SCHEMA_SQL = `
-- ── Kelas (tenant) ──────────────────────────────────────
-- Satu baris = satu kelas yang dikelola satu Admin Kelas. class_id NULL pada
-- tabel lain berarti "seluruh sekolah" (hanya Super Admin yang boleh akses).
CREATE TABLE IF NOT EXISTS classes (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 grade TEXT NOT NULL,
 academic_year TEXT NOT NULL,
 is_active BOOLEAN NOT NULL DEFAULT true,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_classes_name_year ON classes (name, academic_year);
CREATE INDEX IF NOT EXISTS idx_classes_active ON classes (is_active);

-- Maintenance = pemeliharaan sementara, DISALIHKAN dari is_active.
-- is_active=false berarti kelas ditutup permanen (login ditolak). maintenance=true
-- berarti login tetap boleh, tapi setelah masuk pengguna kelas tersebut hanya
-- boleh melihat halaman /maintenance dan semua API-nya membalas 503.
ALTER TABLE classes ADD COLUMN IF NOT EXISTS maintenance BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY,
 email TEXT UNIQUE,
 nisn TEXT UNIQUE,
 password_hash TEXT NOT NULL,
 name TEXT NOT NULL,
 role TEXT NOT NULL CHECK (role IN ('super_admin','class_admin','treasurer','student')),
 avatar TEXT,
 class_id TEXT REFERENCES classes(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Role lama (admin = administrator, principal = kepala sekolah) disatukan jadi
-- super_admin. WAJIB dijalankan sebelum constraint role yang baru dipasang,
-- karena baris lama masih menyimpan nilai role lama. Idempotent.
UPDATE users SET role = 'super_admin' WHERE role IN ('admin', 'principal');
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
 CHECK (role IN ('super_admin','class_admin','treasurer','student'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS class_id TEXT REFERENCES classes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_class ON users(class_id);

CREATE TABLE IF NOT EXISTS students (
 id TEXT PRIMARY KEY,
 user_id TEXT UNIQUE REFERENCES users(id) ON DELETE SET NULL,
 nis TEXT UNIQUE NOT NULL,
 nisn TEXT UNIQUE NOT NULL,
 name TEXT NOT NULL,
 class_name TEXT NOT NULL DEFAULT '',
 class_id TEXT REFERENCES classes(id) ON DELETE SET NULL,
 gender TEXT CHECK (gender IN ('L','P')),
 phone TEXT,
 email TEXT,
 address TEXT,
 archived BOOLEAN NOT NULL DEFAULT false,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE students ADD COLUMN IF NOT EXISTS class_name TEXT NOT NULL DEFAULT '';
ALTER TABLE students ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS class_id TEXT REFERENCES classes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);

CREATE TABLE IF NOT EXISTS bills (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 category TEXT NOT NULL,
 amount INTEGER NOT NULL,
 period TEXT NOT NULL,
 start_date DATE NOT NULL,
 due_date DATE NOT NULL,
 target_type TEXT NOT NULL CHECK (target_type IN ('all','class','specific')),
 target_ids JSONB NOT NULL DEFAULT '[]',
 status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','expired')),
 class_id TEXT REFERENCES classes(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE bills ADD COLUMN IF NOT EXISTS class_id TEXT REFERENCES classes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_bills_class ON bills(class_id);

CREATE TABLE IF NOT EXISTS transactions (
 id TEXT PRIMARY KEY,
 bill_id TEXT NOT NULL REFERENCES bills(id),
 student_id TEXT NOT NULL REFERENCES students(id),
 amount INTEGER NOT NULL,
 payment_method TEXT NOT NULL CHECK (payment_method IN ('bank_transfer','ewallet','cash','qris')),
 status TEXT NOT NULL CHECK (status IN ('PENDING','PAID','FAILED','EXPIRED','CANCELLED')),
 external_reference TEXT,
 proof_image TEXT NOT NULL DEFAULT '',
 method_id TEXT,
 class_id TEXT REFERENCES classes(id) ON DELETE SET NULL,
 paid_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tx_student ON transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_tx_bill ON transactions(bill_id);
-- Anti double-pay: satu siswa hanya boleh punya satu transaksi aktif per tagihan.
-- Diperiksa aplikasi (SELECT lalu INSERT) tetap raced, jadi DB yang jadi guarantor.
CREATE UNIQUE INDEX IF NOT EXISTS uq_tx_active
 ON transactions (bill_id, student_id)
 WHERE status IN ('PENDING', 'PAID');
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS proof_image TEXT NOT NULL DEFAULT '';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS method_id TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS class_id TEXT REFERENCES classes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tx_class ON transactions(class_id);

CREATE TABLE IF NOT EXISTS incomes (
 id TEXT PRIMARY KEY,
 title TEXT NOT NULL,
 category TEXT NOT NULL,
 amount INTEGER NOT NULL,
 date DATE NOT NULL,
 source TEXT NOT NULL DEFAULT '',
 class_id TEXT REFERENCES classes(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS class_id TEXT REFERENCES classes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_incomes_class ON incomes(class_id);

CREATE TABLE IF NOT EXISTS expenses (
 id TEXT PRIMARY KEY,
 title TEXT NOT NULL,
 category TEXT NOT NULL,
 amount INTEGER NOT NULL,
 date DATE NOT NULL,
 notes TEXT NOT NULL DEFAULT '',
 class_id TEXT REFERENCES classes(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS class_id TEXT REFERENCES classes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_class ON expenses(class_id);

CREATE TABLE IF NOT EXISTS school_settings (
 id INTEGER PRIMARY KEY CHECK (id = 1),
 name TEXT NOT NULL,
 logo_url TEXT,
 email TEXT,
 address TEXT,
 phone TEXT,
 class_name TEXT,
 academic_year TEXT,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS default_amount INTEGER;
ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS default_due_days INTEGER;
ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS invoice_format TEXT;

CREATE TABLE IF NOT EXISTS gateway_settings (
 id INTEGER PRIMARY KEY CHECK (id = 1),
 provider TEXT NOT NULL DEFAULT 'doku',
 environment TEXT NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox','production')),
 active_methods JSONB NOT NULL DEFAULT '["qris"]',
 client_id TEXT NOT NULL DEFAULT '',
 secret_key TEXT NOT NULL DEFAULT '',
 notification_url TEXT NOT NULL DEFAULT '',
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at TIMESTAMPTZ NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS login_attempts (
 id BIGSERIAL PRIMARY KEY,
 identifier TEXT NOT NULL,
 ip TEXT NOT NULL,
 success BOOLEAN NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_login_attempts ON login_attempts(identifier, ip, created_at);
-- Rate limit login juga menghitung kegagalan per IP (anti password
-- spraying: satu IP mencoba satu password baku ke ratusan NISN siswa) dan per
-- akun (anti distributed brute force: botnet ganti-ganti IP). Kedua filter
-- butuh index kolom tunggal; composite (identifier, ip, created_at) tidak bisa
-- melayani filter hanya berdasarkan ip.
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip, created_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ident ON login_attempts(identifier, created_at);

CREATE TABLE IF NOT EXISTS audit_logs (
 id BIGSERIAL PRIMARY KEY,
 user_id TEXT,
 action TEXT NOT NULL,
 entity TEXT NOT NULL,
 detail TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_methods (
 id TEXT PRIMARY KEY,
 type TEXT NOT NULL CHECK (type IN ('qris','bank','ewallet')),
 name TEXT NOT NULL DEFAULT '',
 class_name TEXT NOT NULL DEFAULT '',
 account_number TEXT NOT NULL DEFAULT '',
 account_holder TEXT NOT NULL DEFAULT '',
 qris_image TEXT NOT NULL DEFAULT '',
 active BOOLEAN NOT NULL DEFAULT true,
 class_id TEXT REFERENCES classes(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS class_id TEXT REFERENCES classes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_pm_class ON payment_methods(class_id);

CREATE TABLE IF NOT EXISTS password_reset_requests (
 id TEXT PRIMARY KEY,
 student_id TEXT NOT NULL REFERENCES students(id),
 nisn TEXT NOT NULL,
 student_name TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
 admin_note TEXT,
 resolved_by TEXT REFERENCES users(id),
 resolved_at TIMESTAMPTZ,
 ip TEXT NOT NULL DEFAULT '',
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reset_req_status ON password_reset_requests(status);
CREATE INDEX IF NOT EXISTS idx_reset_req_student ON password_reset_requests(student_id);
ALTER TABLE password_reset_requests ADD COLUMN IF NOT EXISTS ip TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS reminders (
 id TEXT PRIMARY KEY,
 title TEXT NOT NULL,
 message TEXT NOT NULL,
 target_type TEXT NOT NULL CHECK (target_type IN ('all', 'unpaid', 'specific')),
 target_count INTEGER NOT NULL DEFAULT 0,
 channels JSONB NOT NULL DEFAULT '[]',
 status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'partial_failed', 'failed')),
 created_by TEXT REFERENCES users(id),
 class_id TEXT REFERENCES classes(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS class_id TEXT REFERENCES classes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_reminders_created ON reminders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reminders_class ON reminders(class_id);

CREATE TABLE IF NOT EXISTS notifications (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 reminder_id TEXT REFERENCES reminders(id) ON DELETE SET NULL,
 title TEXT NOT NULL,
 message TEXT NOT NULL,
 is_read BOOLEAN NOT NULL DEFAULT false,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
`;