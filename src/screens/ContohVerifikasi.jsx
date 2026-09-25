// Halaman contoh keadaan verifikasi, dibuka di /verifikasi/contoh.
//
// Gunanya satu: menghasilkan tangkapan layar untuk Blok 4 Halaman 3 deck
// presentasi, yaitu dua layar verifikasi berdampingan. Karena halaman ini
// memakai komponen yang sama persis dengan yang dipakai di lapangan, slide
// dan aplikasi dijamin tidak pernah berbeda.
//
// Seluruh putusan di halaman ini dihitung di peramban, tanpa satu pun
// permintaan ke peladen. Itu sekaligus membuktikan bahwa mesin aturan memang
// berjalan di sisi klien, sesuai Laporan Subbab 4.3.1.

import { bacaQris, bangunQris, evaluasiAturan } from '../lib/emv.js';
import LayarVerifikasi from '../components/LayarVerifikasi.jsx';

const LAPAK = {
  nmid: 'ID1024567890123',
  nama: 'Warung Mama Ani',
  namaTampil: 'Warung Mama Ani',
  namaQr: 'WARUNG MAMA ANI',
  kota: 'AMBON',
  segelId: 'SL7K2M9Q',
};
LAPAK.muatan = bangunQris({
  nmid: LAPAK.nmid, nama: LAPAK.namaQr, kota: LAPAK.kota, akunSasi: 'WRG-001',
});

// Kode milik pedagang lain yang ditempel menutupi segel Warung Mama Ani.
const KODE_PENGGANTI = bangunQris({
  nmid: 'ID1024567890456', nama: 'TOKO SINAR JAYA', kota: 'AMBON', akunSasi: 'TOK-002',
});

// Kode yang NMID-nya masih cocok tetapi muatannya berubah sejak didaftarkan.
const KODE_BERUBAH = bangunQris({
  nmid: LAPAK.nmid, nama: LAPAK.namaQr, kota: LAPAK.kota, akunSasi: 'WRG-001', ref: 'A7',
});

const CONTOH = [
  {
    kunci: 'hijau',
    judul: 'Keadaan aman',
    catatan: 'Segel dipindai, NMID cocok, cap muatan cocok.',
    muatan: LAPAK.muatan, lapak: LAPAK, segelId: LAPAK.segelId,
  },
  {
    kunci: 'merah',
    judul: 'Keadaan peringatan',
    catatan: 'Kode pengganti ditempel di atas segel. Aturan R4.',
    muatan: KODE_PENGGANTI, lapak: LAPAK, segelId: LAPAK.segelId,
  },
  {
    kunci: 'kuning',
    judul: 'Kode berubah',
    catatan: 'NMID cocok, muatan berbeda. Aturan R5.',
    muatan: KODE_BERUBAH, lapak: LAPAK, segelId: LAPAK.segelId,
  },
  {
    kunci: 'abu',
    judul: 'Belum terdaftar',
    catatan: 'Segel dilewati, kode statis. Aturan R9.',
    muatan: KODE_PENGGANTI, lapak: null, segelId: null,
  },
];

export default function ContohVerifikasi() {
  return (
    <div className="papan-contoh">
      <div style={{ maxWidth: 980, margin: '0 auto var(--s-lg)' }}>
        <span className="label">SASI-QR · contoh keadaan</span>
        <h2 style={{ marginTop: 4 }}>Layar verifikasi</h2>
        <p className="kecil redup" style={{ marginTop: 6, maxWidth: 560 }}>
          Halaman ini dibuat untuk ditangkap layarnya dan dipasang di deck presentasi.
          Seluruh putusan dihitung di peramban, tanpa jaringan.
        </p>
      </div>

      <div className="dua-bingkai">
        {CONTOH.map((c) => {
          const qr = bacaQris(c.muatan);
          const aturan = evaluasiAturan({
            qr, lapak: c.lapak, segelDipindai: Boolean(c.segelId),
          });
          return (
            <div key={c.kunci}>
              <div className="baris antara" style={{ marginBottom: 'var(--s-xs)' }}>
                <span className="label">{c.judul}</span>
                <span className="mono kecil redup">{aturan.kode}</span>
              </div>
              <LayarVerifikasi
                qr={qr}
                aturan={aturan}
                lapak={c.lapak}
                segelId={c.segelId}
                sematkan
              />
              <p className="sumber" style={{ marginTop: 'var(--s-xs)' }}>{c.catatan}</p>
            </div>
          );
        })}
      </div>

      <p className="sumber" style={{ maxWidth: 980, margin: 'var(--s-lg) auto 0' }}>
        Susunan mengikuti DESIGN.md Bagian 6.5. Keadaan aman di kiri, keadaan peringatan di kanan.
      </p>
    </div>
  );
}
