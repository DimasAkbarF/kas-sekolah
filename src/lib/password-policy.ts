// Panjang minimum password. Sengaja dipisah dari lib/password.ts: file itu
// mengimpor bcryptjs, dan 常 konstanta ini dipakai juga di komponen client
// (validasi form) sehingga bcrypt tidak boleh masuk ke client bundle.
export const PASSWORD_MIN_LENGTH = 8;
