# PRD V2 — Update Authentication, Role Access & Student Dashboard

## Kas Sekolah — Frontend

**Version:** 2.0  
**Status:** Feature Update / Frontend Implementation  
**Framework:** Next.js App Router + TypeScript  
**UI:** Tailwind CSS + shadcn/ui + Lucide React  
**Existing PRD:** Kas-Sekolah-Frontend.prd v1.0  
**Scope:** Authentication UI, Role Selection, Admin Login, Student Login, Student Dashboard, Role-Based Routing

---

# 1. OBJECTIVE

Update aplikasi Kas Sekolah yang sudah memiliki struktur frontend dengan menambahkan dan memperbaiki sistem:

1. Login Admin
2. Login Siswa
3. Role-based authentication flow
4. Dashboard khusus siswa
5. Navigation berdasarkan role
6. Protected route
7. Logout
8. Student profile
9. Student billing/payment overview
10. Mock authentication yang siap diganti dengan backend authentication

Fitur yang dibuat harus terintegrasi dengan struktur aplikasi yang sudah ada.

**Jangan membuat ulang aplikasi dari nol jika komponen atau halaman existing masih dapat digunakan.**

Lakukan audit terhadap codebase terlebih dahulu sebelum melakukan perubahan.

---

# 2. CURRENT PROBLEM

Saat ini terdapat beberapa kekurangan:

### Authentication
- Belum ada login page yang menjadi entry point utama.
- Belum ada pilihan login Admin atau Siswa.
- Belum ada pemisahan flow berdasarkan role.
- Belum ada protected route yang jelas.
- Belum ada logout flow yang terstruktur.

### Student
- Dashboard siswa belum tersedia/belum lengkap.
- Belum ada halaman utama siswa setelah login.
- Belum ada ringkasan tagihan siswa.
- Belum ada status pembayaran personal.
- Belum ada shortcut pembayaran.
- Belum ada riwayat pembayaran yang terintegrasi dengan dashboard.

### UX
- User belum memiliki entry point authentication yang jelas.
- Admin dan siswa berpotensi masuk ke interface yang salah.
- Navigation harus mengikuti role user.

---

# 3. PRODUCT PRINCIPLE

Authentication bukan sekadar halaman form.

Flow yang diinginkan:

Login
→ pilih role
→ masukkan credentials
→ validasi
→ menentukan role
→ redirect ke dashboard sesuai role
→ tampilkan navigation sesuai role

Contoh:

Admin Login
→ `/admin/dashboard`

Student Login
→ `/student/dashboard`

User tidak boleh diarahkan ke dashboard role lain.

---

# 4. USER ROLES

## 4.1 Admin

Admin memiliki akses:

- Admin Dashboard
- Siswa
- Guru
- Kelas
- Tagihan
- Transaksi
- Pemasukan
- Pengeluaran
- Laporan
- Payment Gateway
- Settings

Default redirect:

`/admin/dashboard`

---

## 4.2 Student

Student memiliki akses:

- Student Dashboard
- Tagihan Saya
- Pembayaran
- Riwayat Pembayaran
- Profil

Default redirect:

`/student/dashboard`

Student tidak boleh melihat navigation admin.

---

# 5. INFORMATION ARCHITECTURE

Gunakan struktur route:

```text
/app

  /(auth)
    /login
    /forgot-password

  /admin
    /dashboard
    /students
    /teachers
    /classes
    /bills
    /transactions
    /income
    /expenses
    /reports
    /payment-gateway
    /settings

  /student
    /dashboard
    /bills
    /payment
    /history
    /profile
```

Jika project existing memiliki struktur berbeda, lakukan adaptasi tanpa merusak route yang sudah berjalan.

---

# 6. LOGIN PAGE

## Route

```text
/login
```

Login page menjadi satu entry point utama.

User harus dapat memilih:

```text
Masuk sebagai:

[ Admin ]
[ Siswa ]
```

Setelah memilih role, form menyesuaikan role tersebut.

---

# 7. LOGIN UI

Design harus mengikuti design system existing.

Gunakan visual:

- clean
- professional
- institutional
- modern
- simple
- trustworthy

Hindari:

- gradient berlebihan
- glassmorphism
- neon
- ilustrasi random
- terlalu banyak decorative elements
- excessive shadows
- AI-generated looking UI
- terlalu banyak card
- animasi berlebihan

Login page harus terasa seperti aplikasi administrasi sekolah sungguhan.

---

# 8. LOGIN LAYOUT

Desktop:

```text
--------------------------------------------------
|                                                |
|              LOGO / SCHOOL NAME                |
|                                                |
|          Selamat Datang                        |
|          Masuk ke Kas Sekolah                  |
|                                                |
|        [ Admin ]      [ Siswa ]                |
|                                                |
|        Email / NIS                               |
|        [________________________]               |
|                                                |
|        Password                                 |
|        [________________________]               |
|                                                |
|        [          Masuk          ]              |
|                                                |
|        Lupa password?                           |
|                                                |
--------------------------------------------------
```

Mobile harus tetap compact dan tidak membutuhkan scrolling berlebihan.

---

# 9. ROLE SELECTOR

Role selector harus terlihat jelas.

Contoh:

```text
Masuk sebagai

[ Administrator ] [ Siswa ]
```

Role yang aktif harus memiliki visual state yang jelas.

Jangan menggunakan warna berbeda secara random.

Gunakan primary color dari design system aplikasi.

---

# 10. ADMIN LOGIN

Ketika user memilih Admin:

Field:

```text
Email
Password
```

CTA:

```text
Masuk sebagai Admin
```

Optional:

```text
Lupa password?
```

Setelah login berhasil:

```text
/login
      ↓
role = admin
      ↓
/admin/dashboard
```

---

# 11. STUDENT LOGIN

Ketika user memilih Siswa:

Field:

```text
NIS / Email
Password
```

CTA:

```text
Masuk sebagai Siswa
```

Setelah login berhasil:

```text
/login
      ↓
role = student
      ↓
/student/dashboard
```

Student tidak perlu memasukkan role setelah authentication jika role sudah ditentukan oleh account.

Role selector pada login digunakan sebagai UX entry point, sedangkan validasi final harus tetap berdasarkan data user/authentication.

---

# 12. LOGIN VALIDATION

Frontend harus memiliki state:

### Default

```text
Form siap digunakan
```

### Loading

```text
Memproses login...
```

Button disabled selama request.

### Error

Contoh:

```text
Email atau password tidak valid.
```

Jangan menampilkan error teknis seperti:

```text
TypeError: undefined...
```

### Success

Redirect ke dashboard berdasarkan role.

---

# 13. MOCK AUTHENTICATION

Karena backend belum tersedia, gunakan mock authentication layer.

Jangan melakukan authentication langsung di component.

Gunakan struktur:

```text
mock/
  users.ts

services/
  auth.service.ts

lib/
  auth.ts
```

Flow:

```text
Login UI
   ↓
auth.service
   ↓
mock users
   ↓
authenticated user
   ↓
role
   ↓
redirect
```

Architecture harus mudah diubah menjadi:

```text
Login UI
   ↓
auth.service
   ↓
API
   ↓
Database/Auth Provider
```

tanpa mengubah UI secara besar-besaran.

---

# 14. MOCK USER

Sediakan minimal:

### Admin

```text
role: admin
name: Administrator
email: admin@school.test
```

### Student

```text
role: student
name: Student Example
email: student@school.test
nis: 20260001
```

Credentials mock harus centralized.

Jangan menyebarkan username/password ke banyak component.

---

# 15. AUTH SESSION

Buat abstraction sederhana untuk authenticated user.

Contoh konsep:

```text
getCurrentUser()
login()
logout()
isAuthenticated()
hasRole()
```

Jangan mengikat UI langsung kepada localStorage implementation.

Authentication layer harus menjadi abstraction.

---

# 16. PROTECTED ROUTES

Route admin:

```text
/admin/*
```

hanya dapat diakses admin.

Route student:

```text
/student/*
```

hanya dapat diakses student.

Jika student mencoba:

```text
/admin/dashboard
```

redirect:

```text
/student/dashboard
```

Jika user belum login:

```text
/admin/*
/student/*
```

redirect:

```text
/login
```

---

# 17. LOGOUT

Logout tersedia melalui profile/user menu.

Flow:

```text
User menu
   ↓
Logout
   ↓
clear session
   ↓
/login
```

Setelah logout, protected route tidak boleh dapat diakses kembali hanya dengan browser back.

---

# 18. STUDENT APP SHELL

Student memiliki app shell sendiri.

Desktop:

```text
Sidebar

Kas Sekolah

Dashboard
Tagihan Saya
Pembayaran
Riwayat
Profil

----------------
Student Name
Kelas
Logout
```

Header:

```text
Breadcrumb / Page Context
Notification
Profile
```

Mobile:

- sidebar menjadi drawer
- navigation tetap mudah digunakan
- tidak ada horizontal overflow

---

# 19. STUDENT DASHBOARD

## Route

```text
/student/dashboard
```

Dashboard adalah halaman utama setelah student login.

Tujuan dashboard:

Student harus dapat mengetahui kondisi kasnya dalam beberapa detik.

Prioritas:

1. Siapa user
2. Total kewajiban
3. Tagihan aktif
4. Status pembayaran
5. Action bayar
6. Riwayat terbaru

---

# 20. STUDENT DASHBOARD HEADER

Tampilkan:

```text
Halo, [Nama Siswa]

Kelas [Nama Kelas]
```

Jangan menggunakan copy marketing.

Contoh yang baik:

```text
Halo, Dimas

Kelas XII RPL 1
```

---

# 21. STUDENT SUMMARY

Gunakan maksimal 3–4 summary.

### Total Tagihan

Total seluruh bill yang menjadi kewajiban siswa.

### Sudah Dibayar

Total nominal yang sudah dibayar.

### Belum Dibayar

Outstanding payment.

### Status

Contoh:

```text
2 dari 3 tagihan lunas
```

Jangan membuat 8–10 statistic cards.

---

# 22. ACTIVE BILLING

Section:

```text
Tagihan Saya
```

Tampilkan tagihan aktif yang berlaku untuk student tersebut.

Setiap item menampilkan:

- nama tagihan
- kategori
- periode
- nominal
- jatuh tempo
- status
- action

Contoh:

```text
Kas September 2026

Kas Bulanan
Rp10.000
Jatuh tempo 30 September 2026

Belum Dibayar

[ Bayar Sekarang ]
```

---

# 23. BILL STATUS

Gunakan semantic status:

### Unpaid

```text
Belum Dibayar
```

### Pending

```text
Menunggu Pembayaran
```

### Paid

```text
Lunas
```

### Failed

```text
Pembayaran Gagal
```

### Expired

```text
Kedaluwarsa
```

Status harus berasal dari data.

Jangan menentukan status hanya berdasarkan styling.

---

# 24. STUDENT PAYMENT ACTION

Jika bill:

```text
UNPAID
```

tampilkan:

```text
Bayar Sekarang
```

Jika:

```text
PAID
```

tampilkan:

```text
Lihat Detail
```

Jika:

```text
PENDING
```

tampilkan:

```text
Lihat Pembayaran
```

---

# 25. PAYMENT FLOW

Student:

```text
Dashboard
    ↓
Bayar Sekarang
    ↓
Bill Detail
    ↓
Payment Review
    ↓
Pilih Metode
    ↓
Lanjutkan Pembayaran
    ↓
Processing
    ↓
Success / Pending / Failed
```

Jangan menganggap payment berhasil hanya karena user kembali dari checkout.

Status final payment nantinya berasal dari backend/payment gateway.

---

# 26. STUDENT RECENT TRANSACTIONS

Dashboard menampilkan transaksi terbaru.

Table/list:

```text
Tanggal
Tagihan
Nominal
Metode
Status
```

Tampilkan maksimal beberapa transaksi terbaru.

CTA:

```text
Lihat Semua Riwayat
```

mengarah ke:

```text
/student/history
```

---

# 27. STUDENT EMPTY STATE

Jika tidak memiliki tagihan:

```text
Tidak ada tagihan

Saat ini tidak ada tagihan yang perlu dibayar.
```

Jangan membuat dashboard terlihat rusak atau kosong.

Jika belum ada transaksi:

```text
Belum ada riwayat pembayaran.
```

---

# 28. STUDENT BILL PAGE

Route:

```text
/student/bills
```

Menampilkan semua tagihan student.

Filter:

- Semua
- Belum Dibayar
- Menunggu
- Lunas
- Kedaluwarsa

Search bila jumlah data cukup banyak.

---

# 29. STUDENT BILL DETAIL

Route:

```text
/student/bills/[id]
```

Tampilkan:

- nama tagihan
- kategori
- periode
- nominal
- tanggal dibuat
- jatuh tempo
- status
- payment information

Primary action berdasarkan status.

---

# 30. STUDENT PAYMENT PAGE

Route:

```text
/student/payment
```

Halaman payment review.

Tampilkan:

```text
Tagihan
Rp10.000

Biaya
Rp0

Total
Rp10.000

Metode Pembayaran
[ ... ]

[ Lanjutkan Pembayaran ]
```

Nominal harus berasal dari bill/payment service.

Jangan hardcode:

```text
const amount = 10000
```

di UI.

---

# 31. STUDENT PAYMENT HISTORY

Route:

```text
/student/history
```

Tampilkan:

- transaction ID
- tagihan
- nominal
- payment method
- status
- tanggal

Filter:

- status
- periode

Student hanya dapat melihat transaksi miliknya sendiri.

---

# 32. STUDENT PROFILE

Route:

```text
/student/profile
```

Tampilkan:

```text
Nama
NIS
Email
Kelas
Wali Kelas
```

Untuk frontend phase:

- profile display
- edit UI jika diperlukan
- validation state

Jangan mengizinkan student mengubah:

- kelas
- NIS
- role
- data administratif

melalui UI biasa.

---

# 33. STUDENT DATA RELATION

Student dashboard tidak boleh mengambil semua bills lalu menampilkan semuanya.

Logic:

```text
Current Student
      ↓
Student ID
      ↓
Applicable Bills
      ↓
Student Dashboard
```

Bill eligibility ditentukan berdasarkan:

```text
targetType
targetIds
```

Contoh:

```text
ALL
CLASS
STUDENT
```

---

# 34. CALCULATION LAYER

Gunakan calculation/service layer.

Required:

```text
calculateStudentTotalBills()
calculateStudentTotalPaid()
calculateStudentOutstanding()
calculateStudentPaymentRate()
getStudentActiveBills()
getStudentRecentTransactions()
```

UI hanya menerima hasil calculation.

Flow:

```text
Student Dashboard
       ↓
student.service
       ↓
billing.service
       ↓
transaction.service
       ↓
calculations
       ↓
UI
```

---

# 35. ADMIN DASHBOARD PRESERVATION

Existing Admin Dashboard harus tetap berfungsi.

Jangan menghapus fitur existing:

- Total Tagihan
- Total Dibayar
- Belum Dibayar
- Tingkat Pembayaran
- Payment Trend
- Payment Status
- Class Overview
- Recent Transactions

Update authentication harus mengarah ke dashboard tersebut setelah admin login.

---

# 36. NAVIGATION RULE

## Admin

```text
Dashboard
Siswa
Guru
Kelas
Tagihan
Transaksi
Pemasukan
Pengeluaran
Laporan
Payment Gateway
Pengaturan
```

## Student

```text
Dashboard
Tagihan Saya
Pembayaran
Riwayat
Profil
```

Student tidak boleh melihat:

```text
Siswa
Guru
Kelas
Pemasukan
Pengeluaran
Payment Gateway
Pengaturan Admin
```

---

# 37. RESPONSIVE REQUIREMENT

Semua fitur authentication dan student dashboard harus responsive.

### Desktop

Sidebar + content.

### Tablet

Sidebar dapat collapse.

### Mobile

Drawer navigation.

Pastikan:

- tidak ada horizontal overflow
- table memiliki responsive behavior
- button tidak terlalu kecil
- form nyaman digunakan
- card tidak terlalu padat
- typography tetap terbaca

---

# 38. ACCESSIBILITY

Login dan dashboard wajib memiliki:

- semantic HTML
- proper label
- keyboard navigation
- visible focus state
- accessible buttons
- accessible form error
- sufficient contrast
- aria-label jika diperlukan

Jangan menggunakan icon sebagai satu-satunya informasi.

---

# 39. UI STATE

Semua halaman harus memiliki state:

### Loading

Skeleton atau loading state yang proporsional.

### Empty

Informasi yang menjelaskan kondisi.

### Error

Pesan yang jelas + retry jika relevan.

### Success

Feedback setelah action berhasil.

### Disabled

Button disabled ketika action sedang diproses.

---

# 40. DESIGN CONSISTENCY

Login, Admin Dashboard, dan Student Dashboard harus terasa sebagai satu aplikasi.

Gunakan konsisten:

- typography
- spacing
- radius
- buttons
- inputs
- table
- badge
- modal
- dropdown
- colors
- icon style

Jangan membuat student dashboard dengan design system berbeda dari admin.

---

# 41. UI/UX QUALITY REQUIREMENT

Gunakan pendekatan UI/UX profesional.

Jika project menggunakan:

```text
ui-ux-pro-max-skill
```

WAJIB gunakan skill tersebut untuk:

- layout
- typography
- color system
- component hierarchy
- responsive design
- UX consistency

Jangan membuat UI berdasarkan pola AI generik.

Setiap component harus memiliki alasan UX yang jelas.

---

# 42. AVOID AI SLOP

JANGAN membuat:

- gradient background berlebihan
- glass cards
- floating decorative blobs
- random icons
- excessive rounded cards
- oversized headings
- excessive animation
- fake analytics
- random statistics
- unnecessary illustrations
- excessive badges
- dashboard penuh card
- copywriting marketing
- warna berbeda untuk setiap metric

Prioritaskan:

```text
clarity
hierarchy
consistency
usability
data readability
institutional credibility
```

---

# 43. COMPONENT ARCHITECTURE

Gunakan reusable components.

Contoh:

```text
components/
  auth/
    login-form.tsx
    role-selector.tsx
    auth-layout.tsx

  student/
    student-summary.tsx
    student-bill-list.tsx
    student-bill-item.tsx
    student-recent-transactions.tsx
    student-profile.tsx

  shared/
    app-sidebar.tsx
    app-header.tsx
    status-badge.tsx
    empty-state.tsx
    loading-state.tsx
    error-state.tsx
```

Jangan duplicate component hanya karena digunakan di route berbeda.

---

# 44. SERVICE ARCHITECTURE

Gunakan:

```text
services/
  auth.service.ts
  student.service.ts
  billing.service.ts
  transaction.service.ts
  payment.service.ts
  dashboard.service.ts
```

UI:

```text
Page
 ↓
Service
 ↓
Data / API
```

Bukan:

```text
Page
 ↓
langsung membaca mock array
```

---

# 45. MOCK DATA

Minimal data:

```text
users
students
classes
bills
transactions
```

Contoh hubungan:

```text
User
 ↓
Student
 ↓
Class

Student
 ↓
Bill eligibility
 ↓
Transaction
```

Data harus realistis dan konsisten.

Jangan menggunakan data random yang membuat dashboard tidak masuk akal.

---

# 46. AUTH FLOW ACCEPTANCE CRITERIA

### AC-01

User membuka:

```text
/login
```

dan melihat pilihan:

```text
Admin
Siswa
```

### AC-02

Admin berhasil login dan diarahkan ke:

```text
/admin/dashboard
```

### AC-03

Student berhasil login dan diarahkan ke:

```text
/student/dashboard
```

### AC-04

Student tidak dapat membuka:

```text
/admin/dashboard
```

### AC-05

Admin tidak diarahkan ke student dashboard.

### AC-06

User yang belum login tidak dapat membuka protected route.

### AC-07

Logout menghapus session dan mengembalikan user ke:

```text
/login
```

---

# 47. STUDENT DASHBOARD ACCEPTANCE CRITERIA

### AC-08

Student dashboard menampilkan nama student.

### AC-09

Student dashboard menampilkan kelas student.

### AC-10

Dashboard menampilkan total tagihan student.

### AC-11

Dashboard menampilkan total pembayaran student.

### AC-12

Dashboard menampilkan outstanding student.

### AC-13

Dashboard menampilkan tagihan aktif.

### AC-14

Tagihan unpaid memiliki CTA:

```text
Bayar Sekarang
```

### AC-15

Tagihan paid memiliki status:

```text
Lunas
```

### AC-16

Dashboard menampilkan transaksi terbaru.

### AC-17

Student hanya melihat data miliknya.

### AC-18

Jika tidak ada tagihan, tampilkan proper empty state.

---

# 48. PAYMENT ACCEPTANCE CRITERIA

### AC-19

Student dapat membuka detail tagihan.

### AC-20

Student dapat masuk ke payment review.

### AC-21

Nominal payment berasal dari bill/service layer.

### AC-22

Payment memiliki loading state.

### AC-23

Payment memiliki success state.

### AC-24

Payment memiliki failed state.

### AC-25

Payment memiliki pending state.

### AC-26

Frontend tidak menyimpan payment gateway secret.

---

# 49. ROUTING ACCEPTANCE CRITERIA

Test minimal:

```text
Unauthenticated
→ /admin/dashboard
→ /login

Unauthenticated
→ /student/dashboard
→ /login

Student
→ /admin/dashboard
→ /student/dashboard

Admin
→ /student/dashboard
→ /admin/dashboard
```

---

# 50. IMPLEMENTATION PLAN

Implementasikan secara bertahap.

## Phase 1 — Audit

Sebelum coding:

- inspect existing routes
- inspect existing components
- inspect existing layout
- inspect existing mock data
- inspect existing navigation
- inspect existing design tokens
- inspect current admin dashboard

Jangan langsung membuat duplicate component.

---

## Phase 2 — Authentication

Implement:

```text
/login
role selector
login form
auth service
mock users
session abstraction
logout
protected route
role redirect
```

---

## Phase 3 — Student Shell

Implement:

```text
/student/layout
/student/dashboard
student navigation
student profile menu
logout
```

---

## Phase 4 — Student Dashboard

Implement:

```text
student summary
active bills
payment status
recent transactions
empty state
loading state
error state
```

---

## Phase 5 — Student Billing

Implement:

```text
/student/bills
/student/bills/[id]
```

---

## Phase 6 — Payment

Implement frontend payment flow:

```text
bill detail
→ payment review
→ processing
→ result
```

Backend payment gateway tetap menjadi integration boundary.

---

## Phase 7 — Student History & Profile

Implement:

```text
/student/history
/student/profile
```

---

## Phase 8 — QA

Test:

- login admin
- login student
- logout
- protected routes
- wrong role access
- responsive
- loading
- empty state
- error state
- navigation
- payment flow
- data consistency

---

# 51. IMPORTANT DEVELOPMENT RULES

1. Jangan menghapus fitur existing yang masih valid.
2. Jangan membuat duplicate page jika page existing dapat diperbaiki.
3. Jangan hardcode financial values pada component.
4. Jangan hardcode student dashboard statistics.
5. Jangan mencampur admin dan student navigation.
6. Jangan membuat authentication logic di banyak component.
7. Jangan menyimpan secret payment gateway pada frontend.
8. Jangan membuat fake payment success sebagai final payment state.
9. Jangan menggunakan random mock data yang tidak berhubungan.
10. Jangan menggunakan excessive animation.
11. Jangan membuat UI terlihat seperti template AI.
12. Jangan mengubah design system existing tanpa alasan.
13. Reuse component yang sudah tersedia.
14. Gunakan Server Components secara default.
15. Gunakan Client Components hanya ketika memang diperlukan.
16. Setelah implementasi, jalankan lint/typecheck/build dan perbaiki error yang ditemukan.

---

# 52. EXPECTED FINAL RESULT

Setelah implementasi selesai, aplikasi harus memiliki flow:

```text
                    /login
                       |
              +--------+--------+
              |                 |
            Admin             Siswa
              |                 |
              ↓                 ↓
     /admin/dashboard    /student/dashboard
              |                 |
       Admin Navigation    Student Navigation
              |                 |
       Admin Features      Student Features
```

Student flow:

```text
Login
 ↓
Student Dashboard
 ↓
Lihat Tagihan
 ↓
Detail Tagihan
 ↓
Bayar
 ↓
Payment Status
 ↓
Riwayat
```

Admin flow:

```text
Login
 ↓
Admin Dashboard
 ↓
Kelola Siswa
Kelola Kelas
Kelola Tagihan
Kelola Transaksi
Laporan
Settings
```

---

# 53. DEFINITION OF DONE

Feature dianggap selesai jika:

- `/login` tersedia
- Login Admin tersedia
- Login Siswa tersedia
- Role selection tersedia
- Mock authentication berfungsi
- Role redirect berfungsi
- Protected routes berfungsi
- Logout berfungsi
- Admin dashboard tetap berfungsi
- Student dashboard tersedia
- Student navigation tersedia
- Student billing tersedia
- Student payment flow tersedia
- Student payment history tersedia
- Student profile tersedia
- Student hanya dapat melihat datanya sendiri
- Responsive desktop/tablet/mobile
- Loading state tersedia
- Empty state tersedia
- Error state tersedia
- UI konsisten dengan existing design system
- Tidak ada AI-slop UI
- Tidak ada hardcoded financial statistics
- Tidak ada TypeScript error
- Tidak ada lint error
- Production build berhasil

---

# 54. FINAL INSTRUCTION FOR CODING AGENT

**Jangan hanya membuat halaman secara visual.**

Implementasikan feature ini sebagai bagian dari architecture aplikasi Kas Sekolah yang sudah ada.

Prioritas:

```text
Existing Codebase
      ↓
Audit
      ↓
Reuse
      ↓
Extend Architecture
      ↓
Authentication
      ↓
Role Routing
      ↓
Student Dashboard
      ↓
Student Billing
      ↓
Payment
      ↓
QA
```

Hasil akhir harus terasa seperti satu produk yang utuh, bukan kumpulan halaman yang dibuat terpisah.

**Jangan melakukan redesign besar pada halaman existing kecuali diperlukan untuk integrasi authentication dan role-based navigation.**

Fokus utama update ini adalah:

**LOGIN ADMIN + LOGIN SISWA + ROLE-BASED ACCESS + STUDENT DASHBOARD + STUDENT BILLING/PAYMENT FLOW.**