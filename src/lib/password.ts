import bcrypt from "bcryptjs";

// 12 = rekomendasi minimum OWASP untuk bcrypt. 10 terlalu murah dipecah offline
// bila salinan database bocor.
//
// Catatan: rounds hanya dipakai saat hash BARU dibuat. Hash lama tetap punya 10
// dan `compare` membaca cost-nya dari hash itu sendiri, jadi login tidak
// ikut lambat. Untuk menaikkan hash yang sudah ada, skor ulang lewat
// `needsRehash` saat password berikutnya diganti.
const ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
 return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
 return bcrypt.compare(plain, hash);
}