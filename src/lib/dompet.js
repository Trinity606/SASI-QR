// Dompet simulasi milik perangkat pembeli.
//
// Saldo dan riwayat sengaja disimpan di perangkat, bukan di peladen. Dua
// alasannya. Pertama, ini memang angka fiktif untuk peragaan, bukan catatan
// keuangan yang perlu diaudit. Kedua, layar beranda karena itu tetap terisi
// penuh saat jaringan mati, sejalan dengan sisa aplikasi.
//
// Catatan rantai atas pembayaran tetap ditulis di peladen. Yang di sini hanya
// tampilan dompet, bukan sumber kebenaran.

const KUNCI = 'sasi.dompet.v1';
const SALDO_AWAL = 750_000;

const baca = () => {
  try {
    return JSON.parse(localStorage.getItem(KUNCI) || 'null');
  } catch {
    return null;
  }
};

const tulis = (isi) => {
  try {
    localStorage.setItem(KUNCI, JSON.stringify(isi));
  } catch {
    // Penyimpanan diblokir. Dompet kembali ke nilai awal saat halaman dimuat.
  }
  kabarkan(isi);
};

const pendengar = new Set();
const kabarkan = (isi) => pendengar.forEach((f) => f(isi));

export function muatDompet() {
  return baca() ?? { saldo: SALDO_AWAL, riwayat: [] };
}

/** Berlangganan perubahan dompet. Mengembalikan fungsi berhenti. */
export function pantauDompet(fn) {
  pendengar.add(fn);
  fn(muatDompet());
  return () => pendengar.delete(fn);
}

/** Catat satu pembayaran simulasi dan kurangi saldo. */
export function catatPembayaran({ nominal, kepada, kodeAturan, ref, waktu }) {
  const d = muatDompet();
  tulis({
    saldo: Math.max(0, d.saldo - nominal),
    riwayat: [{ nominal, kepada, kodeAturan, ref, waktu: waktu ?? Date.now() }, ...d.riwayat].slice(0, 50),
  });
}

/** Kembalikan dompet ke keadaan awal, dipakai sebelum demo diulang. */
export function setelUlangDompet() {
  tulis({ saldo: SALDO_AWAL, riwayat: [] });
}

export const cukup = (nominal) => muatDompet().saldo >= nominal;
