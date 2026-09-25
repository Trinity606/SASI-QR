// Aliran kabar dari peladen, satu sambungan untuk seluruh halaman.
//
// Inilah yang membuat demo tiga perangkat terasa hidup: petugas menekan
// konfirmasi di perangkatnya, dan perangkat pembeli memperbarui dirinya sendiri
// dalam hitungan detik, tanpa siapa pun memuat ulang halaman.
//
// PENTING: verifikasi tidak boleh bergantung pada sambungan ini. Kalau aliran
// putus, putusan tetap dihitung dari salinan yang sudah ada di perangkat.
// Aliran hanya mempercepat pembaruan, bukan syarat untuk bekerja.

let sumber = null;
const pendengar = new Set();

function pastikanTersambung() {
  if (sumber || typeof EventSource === 'undefined') return;
  sumber = new EventSource('/api/aliran');
  sumber.onmessage = (e) => {
    let pesan = {};
    try {
      pesan = JSON.parse(e.data);
    } catch {
      // Baris komentar keep-alive. Abaikan.
      return;
    }
    for (const fn of pendengar) fn(pesan);
  };
  // EventSource menyambung ulang sendiri. Galat sengaja tidak dianggap fatal,
  // karena luring adalah keadaan yang wajar di pasar.
  sumber.onerror = () => {};
}

/** Berlangganan kabar peladen. Mengembalikan fungsi berhenti. */
export function pantauAliran(fn) {
  pendengar.add(fn);
  pastikanTersambung();
  return () => {
    pendengar.delete(fn);
    if (pendengar.size === 0 && sumber) {
      sumber.close();
      sumber = null;
    }
  };
}
