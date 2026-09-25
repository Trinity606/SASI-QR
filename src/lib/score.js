// Mesin Skor Kepercayaan SASI-QR.
//
// Skor TIDAK disimpan sebagai angka di basis data. Skor dihitung ulang dengan
// memutar ulang (replay) seluruh peristiwa pada rantai. Konsekuensinya: tidak
// ada kolom skor yang bisa diubah diam-diam, dan setiap angka skor selalu bisa
// ditelusuri ke daftar peristiwa yang membentuknya.

export const SKOR_AWAL = 60; // akun baru terdaftar, belum tersegel
export const SKOR_MIN = 0;
export const SKOR_MAKS = 100;

// Ambang batas. Dua angka ini adalah satu-satunya tuas kebijakan.
export const AMBANG_PERINGATAN = 50; // < 50 -> peringatan, transfer ditahan
export const AMBANG_BLOKIR = 25; // < 25 -> transfer diblokir penuh

// Karantina: setelah satu penipuan terkonfirmasi, skor tidak boleh naik
// melewati 49 selama 90 hari, seberapa pun banyak transaksi bersih sesudahnya.
export const KARANTINA_HARI = 90;
export const KARANTINA_PLAFON = 49;

const HARI = 86400000;

// Tabel poin. Satu baris per jenis peristiwa, inilah dokumen kebijakannya.
export const TABEL_POIN = {
  AKUN_DIBUAT: { poin: 0, label: 'Akun dibuat' },
  KYC_TERVERIFIKASI: { poin: +5, sekali: true, label: 'Identitas terverifikasi' },
  SEGEL_TERPASANG: { poin: +10, sekali: true, label: 'Segel fisik terdaftar dan cocok' },
  TRANSAKSI_BERSIH: { poin: +1, batasHarian: 5, batasBulanan: 20, label: 'Transaksi selesai tanpa sengketa' },
  RENTET_30_HARI: { poin: +5, label: '30 hari berturut tanpa insiden' },
  ADUAN_DITOLAK: { poin: +8, label: 'Aduan terhadap akun ini ditolak petugas' },
  REHABILITASI: { poin: +15, label: 'Rehabilitasi selesai bersama layanan pelanggan' },

  ADUAN_MASUK: { poin: -10, label: 'Aduan masuk, menunggu pemeriksaan' },
  ADUAN_DICABUT: { poin: +10, label: 'Aduan dicabut pelapor' },
  REKONSILIASI_TERLEWAT: { poin: -2, batasBulanan: -10, label: 'Rekonsiliasi harian tidak dijawab' },
  SEGEL_HILANG: { poin: -5, label: 'Segel dilaporkan hilang atau rusak' },
  PENIPUAN_TERKONFIRMASI: { poin: -40, label: 'Penipuan terkonfirmasi petugas' },
  PENIPUAN_BERULANG: { poin: -70, label: 'Penipuan kedua dalam 180 hari' },
  MUATAN_TIDAK_COCOK: { poin: -50, label: 'Kode QRIS berbeda dari yang terdaftar (R4)' },
};

// ponytail: peluruhan pemulihan dihitung dari peristiwa terakhir, bukan dari
// pekerjaan latar. Tidak ada penjadwal, tidak ada kolom yang perlu disegarkan.
const PEMULIHAN_POIN = 1;
const PEMULIHAN_INTERVAL_HARI = 14;
const PEMULIHAN_PLAFON = SKOR_AWAL; // pemulihan pasif berhenti di sini

const kunciHari = (ts) => new Date(ts).toISOString().slice(0, 10);
const kunciBulan = (ts) => new Date(ts).toISOString().slice(0, 7);

/**
 * Hitung skor sebuah akun dengan memutar ulang peristiwanya.
 * @param {Array<{type:string, ts:number, meta?:object}>} peristiwa - sudah terurut menaik
 * @param {number} sekarang - waktu acuan, untuk peluruhan pemulihan
 * @returns {{skor:number, rincian:Array, karantinaSampai:number|null, penipuanTerkonfirmasi:number}}
 */
export function hitungSkor(peristiwa, sekarang = Date.now()) {
  let skor = SKOR_AWAL;
  const rincian = [];
  const sudahDipakai = new Set(); // untuk peristiwa yang hanya dihitung sekali
  const jatahHarian = new Map();
  const jatahBulanan = new Map();
  let karantinaSampai = null;
  let penipuanTerkonfirmasi = 0;
  let tsTerakhir = peristiwa.length ? peristiwa[0].ts : sekarang;

  const terapkan = (delta, tipe, ts, catatan) => {
    const sebelum = skor;
    skor = Math.max(SKOR_MIN, Math.min(SKOR_MAKS, skor + delta));
    // Plafon karantina berlaku setelah penjepitan rentang normal.
    if (karantinaSampai && ts < karantinaSampai && skor > KARANTINA_PLAFON) {
      skor = KARANTINA_PLAFON;
    }
    if (skor !== sebelum || delta !== 0) {
      rincian.push({ tipe, ts, delta: skor - sebelum, diminta: delta, skor, catatan });
    }
  };

  for (const ev of peristiwa) {
    // Pemulihan pasif untuk jeda tanpa peristiwa sama sekali.
    terapkanPemulihan(ev.ts);

    const aturan = TABEL_POIN[ev.type];
    if (!aturan) continue;

    if (aturan.sekali) {
      if (sudahDipakai.has(ev.type)) {
        rincian.push({ tipe: ev.type, ts: ev.ts, delta: 0, diminta: aturan.poin, skor, catatan: 'diabaikan, hanya dihitung sekali' });
        continue;
      }
      sudahDipakai.add(ev.type);
    }

    let delta = aturan.poin;
    let catatan = aturan.label;

    if (aturan.batasHarian != null) {
      const k = `${ev.type}:${kunciHari(ev.ts)}`;
      const terpakai = jatahHarian.get(k) ?? 0;
      const sisa = Math.max(0, aturan.batasHarian - terpakai);
      if (delta > sisa) {
        catatan += ` (dibatasi jatah harian ${aturan.batasHarian})`;
        delta = sisa;
      }
      jatahHarian.set(k, terpakai + delta);
    }

    if (aturan.batasBulanan != null) {
      const k = `${ev.type}:${kunciBulan(ev.ts)}`;
      const terpakai = jatahBulanan.get(k) ?? 0;
      const batas = Math.abs(aturan.batasBulanan);
      const sisa = Math.max(0, batas - Math.abs(terpakai));
      if (Math.abs(delta) > sisa) {
        catatan += ` (dibatasi jatah bulanan ${aturan.batasBulanan})`;
        delta = Math.sign(delta) * sisa;
      }
      jatahBulanan.set(k, terpakai + delta);
    }

    if (ev.type === 'PENIPUAN_TERKONFIRMASI' || ev.type === 'PENIPUAN_BERULANG') {
      penipuanTerkonfirmasi += 1;
      karantinaSampai = ev.ts + KARANTINA_HARI * HARI;
    }
    if (ev.type === 'MUATAN_TIDAK_COCOK') {
      karantinaSampai = ev.ts + KARANTINA_HARI * HARI;
    }

    terapkan(delta, ev.type, ev.ts, catatan);
    tsTerakhir = ev.ts;
  }

  terapkanPemulihan(sekarang);

  return { skor, rincian, karantinaSampai, penipuanTerkonfirmasi };

  function terapkanPemulihan(sampai) {
    const jeda = sampai - tsTerakhir;
    if (jeda < PEMULIHAN_INTERVAL_HARI * HARI) return;
    const langkah = Math.floor(jeda / (PEMULIHAN_INTERVAL_HARI * HARI));
    tsTerakhir += langkah * PEMULIHAN_INTERVAL_HARI * HARI;
    // Diam tidak membangun kepercayaan, hanya memulihkannya. Pemulihan pasif
    // berhenti di skor awal, sehingga akun yang menganggur bertahun-tahun tidak
    // pernah naik ke pita Terpercaya tanpa satu pun transaksi bersih.
    if (skor >= PEMULIHAN_PLAFON) return;
    const delta = Math.min(langkah * PEMULIHAN_POIN, PEMULIHAN_PLAFON - skor);
    terapkan(delta, 'PEMULIHAN_PASIF', tsTerakhir, `${langkah} x ${PEMULIHAN_INTERVAL_HARI} hari tanpa insiden`);
  }
}

/** Pita kepercayaan dan konsekuensinya terhadap transfer. */
export function pita(skor) {
  if (skor >= 80) {
    return {
      kode: 'TERPERCAYA', label: 'Terpercaya', warna: 'sukses', tindakan: 'lanjut',
      pesan: 'Riwayat bersih. Transaksi dapat dilanjutkan.',
      batasNominal: null,
    };
  }
  if (skor >= AMBANG_PERINGATAN) {
    return {
      kode: 'AMAN', label: 'Aman', warna: 'sukses', tindakan: 'lanjut',
      pesan: 'Tidak ada catatan penipuan. Transaksi dapat dilanjutkan.',
      batasNominal: null,
    };
  }
  if (skor >= AMBANG_BLOKIR) {
    return {
      kode: 'WASPADA', label: 'Waspada', warna: 'peringatan', tindakan: 'konfirmasi',
      pesan: 'Akun ini memiliki catatan buruk. Pastikan Anda benar-benar mengenal penerima sebelum melanjutkan.',
      batasNominal: 100000,
    };
  }
  return {
    kode: 'DIBLOKIR', label: 'Diblokir', warna: 'galat', tindakan: 'blokir',
    pesan: 'Akun ini diblokir karena penipuan terkonfirmasi. Transfer tidak dapat dilanjutkan.',
    batasNominal: 0,
  };
}

/**
 * Putusan akhir untuk satu percobaan transfer. Menggabungkan hasil verifikasi
 * kode (tabel R1..R9 pada laporan riset) dengan pita skor.
 */
export function putusan({ skor, kodeAturan, nominal }) {
  const p = pita(skor);

  // Kegagalan pada kode selalu mengalahkan skor bagus. Kode rusak tetap kode
  // rusak walaupun pemiliknya berskor 100.
  const merah = ['E01', 'E02', 'E03', 'E04', 'E05'];
  if (merah.includes(kodeAturan)) {
    return { tindakan: 'blokir', pita: p, alasan: `Verifikasi kode gagal (${kodeAturan}).` };
  }
  if (p.tindakan === 'blokir') {
    return { tindakan: 'blokir', pita: p, alasan: p.pesan };
  }
  if (p.tindakan === 'konfirmasi') {
    if (p.batasNominal != null && nominal > p.batasNominal) {
      return {
        tindakan: 'blokir', pita: p,
        alasan: `Akun berskor ${skor} dibatasi maksimal Rp${p.batasNominal.toLocaleString('id-ID')} per transaksi.`,
      };
    }
    return { tindakan: 'konfirmasi', pita: p, alasan: p.pesan };
  }
  if (kodeAturan === 'W01') {
    return { tindakan: 'konfirmasi', pita: p, alasan: 'Kode berubah sejak didaftarkan. Minta pedagang mendaftar ulang.' };
  }
  return { tindakan: 'lanjut', pita: p, alasan: p.pesan };
}
