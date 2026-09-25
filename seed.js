// Data awal simulasi. Dijalankan sekali saat data/akun.json belum ada.
// Peristiwa sengaja diberi tanggal mundur supaya keempat pita skor
// (Terpercaya, Aman, Waspada, Diblokir) terwakili sejak demo pertama dibuka.

import { bangunQris } from './src/lib/emv.js';

const HARI = 86400000;
const lalu = (n) => Date.now() - n * HARI;

const DAFTAR = [
  {
    id: 'WRG-001', nama: 'Warung Mama Ani', namaQr: 'WARUNG MAMA ANI', tipe: 'pedagang',
    nmid: 'ID1024567890123', kota: 'AMBON', segelId: 'SL7K2M9Q',
    telepon: '0812****4471', terdaftar: lalu(120), alamat: 'Blok C, Pasar Mardika',
  },
  {
    id: 'TOK-002', nama: 'Toko Sinar Jaya', namaQr: 'TOKO SINAR JAYA', tipe: 'pedagang',
    nmid: 'ID1024567890456', kota: 'AMBON', segelId: 'SL3F8P1R',
    telepon: '0813****2290', terdaftar: lalu(6), alamat: 'Blok A, Pasar Mardika',
  },
  {
    id: 'LAP-004', nama: 'Lapak Bu Tini', namaQr: 'LAPAK BU TINI', tipe: 'pedagang',
    nmid: 'ID1024567890789', kota: 'AMBON', segelId: 'SL9X4B6T',
    telepon: '0852****7714', terdaftar: lalu(75), alamat: 'Blok D, Pasar Mardika',
  },
  {
    id: 'KIO-003', nama: 'Kios Cepat Untung', namaQr: 'KIOS CEPAT UNTUNG', tipe: 'pedagang',
    nmid: 'ID9988776655443', kota: 'AMBON', segelId: null,
    telepon: '0857****0031', terdaftar: lalu(41), alamat: 'tidak diketahui',
  },
  {
    id: 'PEM-100', nama: 'Budi Santoso', namaQr: 'BUDI SANTOSO', tipe: 'pembeli',
    nmid: 'ID1024500000100', kota: 'AMBON', segelId: null,
    telepon: '0811****8802', terdaftar: lalu(300), alamat: 'Kota Ambon',
  },
];

// Peristiwa per akun. Inilah yang menentukan skor; tidak ada angka skor yang
// ditulis langsung ke mana pun.
const PERISTIWA = [
  // Terpercaya: identitas dan segel lengkap, transaksi bersih berbulan-bulan.
  { akun: 'WRG-001', type: 'AKUN_DIBUAT', ts: lalu(120) },
  { akun: 'WRG-001', type: 'KYC_TERVERIFIKASI', ts: lalu(119) },
  { akun: 'WRG-001', type: 'SEGEL_TERPASANG', ts: lalu(118) },
  ...Array.from({ length: 18 }, (_, i) => ({ akun: 'WRG-001', type: 'TRANSAKSI_BERSIH', ts: lalu(110 - i * 6) })),
  { akun: 'WRG-001', type: 'RENTET_30_HARI', ts: lalu(88) },
  { akun: 'WRG-001', type: 'RENTET_30_HARI', ts: lalu(58) },

  // Aman: akun baru, belum punya riwayat apa pun.
  { akun: 'TOK-002', type: 'AKUN_DIBUAT', ts: lalu(6) },

  // Waspada: aduan belum diputus dan rekonsiliasi berkali-kali terlewat.
  { akun: 'LAP-004', type: 'AKUN_DIBUAT', ts: lalu(75) },
  { akun: 'LAP-004', type: 'KYC_TERVERIFIKASI', ts: lalu(74) },
  ...Array.from({ length: 5 }, (_, i) => ({ akun: 'LAP-004', type: 'REKONSILIASI_TERLEWAT', ts: lalu(20 - i * 2) })),
  { akun: 'LAP-004', type: 'ADUAN_MASUK', ts: lalu(9) },

  // Diblokir: satu penipuan sudah terkonfirmasi petugas.
  { akun: 'KIO-003', type: 'AKUN_DIBUAT', ts: lalu(41) },
  { akun: 'KIO-003', type: 'ADUAN_MASUK', ts: lalu(14) },
  { akun: 'KIO-003', type: 'PENIPUAN_TERKONFIRMASI', ts: lalu(11), petugas: 'CS-01', catatan: 'Kode ditempel menutupi segel lapak lain.' },

  { akun: 'PEM-100', type: 'AKUN_DIBUAT', ts: lalu(300) },
  { akun: 'PEM-100', type: 'KYC_TERVERIFIKASI', ts: lalu(299) },
];

export function seedAkun(rantai) {
  const akun = DAFTAR.map((a) => ({
    ...a,
    // Muatan yang terdaftar saat penyegelan. Inilah pembanding untuk aturan
    // R4 (NMID berbeda) dan W01 (muatan berubah).
    muatan: bangunQris({ nmid: a.nmid, nama: a.namaQr, kota: a.kota, akunSasi: a.id }),
  }));

  for (const p of PERISTIWA.sort((x, y) => x.ts - y.ts)) rantai.tambah(p);
  return akun;
}

/** Aduan awal supaya konsol petugas punya satu perkara yang menunggu putusan.
 *  Harus sejalan dengan peristiwa ADUAN_MASUK di atas, kalau tidak skor akan
 *  menunjukkan aduan yang tidak ada barisnya. */
export function seedAduan() {
  return [
    {
      id: 'ADU-0001', terlapor: 'KIO-003', pelapor: 'PEM-100', nmid: 'ID9988776655443',
      namaPadaKode: 'KIOS CEPAT UNTUNG', kodeAturan: 'E04', segelId: 'SL7K2M9Q', capMuatan: '6304A1B2',
      kronologi: 'Kode ditempel menutupi segel lapak sebelah. Uang masuk ke nama lain.',
      status: 'terkonfirmasi', dibuat: lalu(14), diputus: lalu(11), petugas: 'CS-01',
    },
    {
      id: 'ADU-0002', terlapor: 'LAP-004', pelapor: 'PEM-100', nmid: 'ID1024567890789',
      namaPadaKode: 'LAPAK BU TINI', kodeAturan: 'A01', segelId: 'SL9X4B6T', capMuatan: '6304C3D4',
      kronologi: 'Barang tidak diberikan setelah pembayaran.',
      status: 'baru', dibuat: lalu(9),
    },
  ];
}
