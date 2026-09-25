// Antrean aduan luring.
//
// Tanpa ini, klaim "berjalan tanpa jaringan" hanya berlaku separuh: verifikasi
// memang tetap jalan, tetapi aduan akan hilang. Padahal justru di pasar, saat
// sinyal buruk, seseorang menemukan stiker yang ditukar.
//
// ponytail: antrean disimpan di localStorage dan dikirim ulang saat peramban
// mengabarkan dirinya daring. Tidak ada Background Sync, karena dukungannya
// belum merata dan jendela demo tidak memerlukannya.

const KUNCI = 'sasi.antrean.v1';

const baca = () => {
  try {
    return JSON.parse(localStorage.getItem(KUNCI) || '[]');
  } catch {
    return [];
  }
};

const tulis = (daftar) => {
  try {
    localStorage.setItem(KUNCI, JSON.stringify(daftar));
  } catch {
    // Penyimpanan penuh atau diblokir. Aduan yang sedang dikirim tetap jalan.
  }
  kabarkan(daftar.length);
};

const pendengar = new Set();
const kabarkan = (n) => pendengar.forEach((f) => f(n));

/** Berlangganan perubahan jumlah antrean. Mengembalikan fungsi berhenti. */
export function pantauAntrean(fn) {
  pendengar.add(fn);
  fn(baca().length);
  return () => pendengar.delete(fn);
}

export const jumlahAntre = () => baca().length;

/**
 * Kirim satu aduan. Bila jaringan gagal, aduan masuk antrean dan akan
 * dikirim ulang sendiri. Mengembalikan nomor aduan, atau null bila diantrekan.
 */
export async function kirimAduan(isi) {
  let res;
  try {
    res = await fetch('/api/aduan', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(isi),
    });
  } catch {
    // Jaringan memang tidak ada. Aduan disimpan dan dikirim ulang nanti.
    tulis([...baca(), { ...isi, diantrekanPada: Date.now() }]);
    return { antre: true };
  }

  // Peladen menjawab, tetapi menolak. Mengantrekan aduan yang ditolak hanya
  // akan mengulang penolakan yang sama selamanya, dan pengguna terlanjur
  // diberi tahu bahwa jaringannya bermasalah padahal bukan.
  if (!res.ok) {
    const isiJawab = await res.json().catch(() => ({}));
    return { galat: isiJawab.galat || `Peladen menolak aduan (${res.status}).` };
  }

  const { id } = await res.json();
  return { id };
}

/** Coba kirim seluruh antrean. Yang gagal tetap tinggal di antrean. */
export async function kirimAntrean() {
  const daftar = baca();
  if (!daftar.length) return { terkirim: 0, sisa: 0 };

  const sisa = [];
  let terkirim = 0;
  for (const isi of daftar) {
    try {
      const res = await fetch('/api/aduan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(isi),
      });
      if (!res.ok) throw new Error(String(res.status));
      terkirim += 1;
    } catch {
      sisa.push(isi);
    }
  }
  tulis(sisa);
  return { terkirim, sisa: sisa.length };
}

/** Pasang sekali saat aplikasi mulai. */
export function pasangPengirimUlang() {
  addEventListener('online', () => { kirimAntrean(); });
  if (navigator.onLine) kirimAntrean();
}
