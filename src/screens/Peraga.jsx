// Halaman peraga, dibuka di /peraga?layar=<nama>.
//
// Gunanya satu: menghasilkan tangkapan layar untuk deck presentasi. Setiap
// layar dirender dalam keadaan tetap, tanpa perlu kamera, jaringan, maupun
// satu pun ketukan, supaya bisa ditangkap otomatis oleh peramban headless.
//
// Komponen yang dipakai di sini adalah komponen yang sama dengan yang dipakai
// di lapangan. Jadi begitu tampilannya berubah, tangkapan layarnya ikut
// berubah, dan slide tidak pernah memperlihatkan versi yang sudah tidak ada.

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import Cangkang from '../components/Cangkang.jsx';
import LayarVerifikasi from '../components/LayarVerifikasi.jsx';
import { bacaQris, bangunQris, evaluasiAturan } from '../lib/emv.js';
import {
  IkonBeranda, IkonPindai, IkonRiwayat, IkonAduan, IkonSegel, IkonMata,
} from '../components/Ikon.jsx';

// ------------------------------------------------------------- data contoh

const LAPAK = {
  id: 'WRG-001', nama: 'Warung Mama Ani', namaTampil: 'Warung Mama Ani',
  namaQr: 'WARUNG MAMA ANI', nmid: 'ID1024567890123', kota: 'AMBON', segelId: 'SL7K2M9Q',
};
LAPAK.muatan = bangunQris({ nmid: LAPAK.nmid, nama: LAPAK.namaQr, kota: LAPAK.kota, akunSasi: LAPAK.id });

const KODE_PENGGANTI = bangunQris({
  nmid: 'ID1024567890456', nama: 'TOKO SINAR JAYA', kota: 'AMBON', akunSasi: 'TOK-002',
});

const SALINAN = {
  lapak: [
    LAPAK,
    { id: 'TOK-002', nama: 'Toko Sinar Jaya', nmid: 'ID1024567890456', segelId: 'SL3F8P1R' },
    { id: 'LAP-004', nama: 'Lapak Bu Tini', nmid: 'ID1024567890789', segelId: 'SL9X4B6T' },
  ],
};

const NAV_PEMBELI = [
  { kunci: 'beranda', judul: 'Beranda', ikon: <IkonBeranda width={21} height={21} /> },
  { kunci: 'pindai', judul: 'Periksa', ikon: <IkonPindai width={26} height={26} />, utama: true },
  { kunci: 'riwayat', judul: 'Riwayat', ikon: <IkonRiwayat width={21} height={21} /> },
];

const inisial = (n) => n.split(' ').slice(0, 2).map((w) => w[0]).join('');
const kosong = () => {};

// -------------------------------------------------------------- tiap layar

function PembeliBeranda() {
  return (
    <Cangkang
      satuan="Rp" angka="750.000"
      keterangan="Saldo simulasi, bukan dana nyata."
      aksiKepala={<span className="tombol-bulat ikon-saja"><IkonMata width={18} height={18} /></span>}
      nav={NAV_PEMBELI} tab="beranda" onTab={kosong}
    >
      <main className="lembar-isi" style={{ paddingTop: 'var(--s-base)' }}>
        <div className="kartu">
          <div className="kepala-bagian">
            <span className="label">Lapak tersegel di sekitar</span>
            <span className="kecil redup">3</span>
          </div>
          {SALINAN.lapak.map((l) => (
            <div className="baris-lapak" key={l.id}>
              <div className="awal">{inisial(l.nama)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="nama">{l.nama}</div>
                <div className="mono kecil redup">Segel {l.segelId}</div>
              </div>
              <span className="cip">Tersegel</span>
            </div>
          ))}
        </div>
      </main>
    </Cangkang>
  );
}

function PembeliPindai() {
  return (
    <Cangkang nav={NAV_PEMBELI} tab="pindai" onTab={kosong}>
      <main className="lembar-isi" style={{ paddingTop: 'var(--s-base)' }}>
        <div className="jejak-tahap">
          <span className="label">Tahap 2</span>
          <span className="nama-tahap">Kenali</span>
        </div>
        <div className="tumpuk">
          <span className="jejak-langkah">Langkah 1 dari 2 · pindai segel</span>
          <p className="kecil redup" style={{ margin: 0 }}>
            Arahkan kamera ke kode pada segel yang tertempel di lapak.
          </p>
          <div className="kamera-penuh">
            <div className="bidik"><div className="bidik-kotak"><i /><i /><i /><i /></div></div>
          </div>
        </div>
      </main>
    </Cangkang>
  );
}

function Verifikasi({ muatan, lapak }) {
  const qr = bacaQris(muatan);
  const aturan = evaluasiAturan({ qr, lapak, segelDipindai: true });
  return (
    <Cangkang nav={NAV_PEMBELI} tab="pindai" onTab={kosong}>
      <main className="lembar-isi" style={{ paddingTop: 'var(--s-base)', minHeight: 120 }}>
        <div className="jejak-tahap">
          <span className="label">Tahap 2</span>
          <span className="nama-tahap">Kenali</span>
        </div>
      </main>
      <LayarVerifikasi
        qr={qr} aturan={aturan} lapak={lapak} segelId={LAPAK.segelId}
        onTutup={kosong} onAdukan={kosong}
        onBayar={aturan.warna === 'merah' ? undefined : kosong}
      />
    </Cangkang>
  );
}

function PembeliMenunggu({ diputus }) {
  return (
    <Cangkang nav={NAV_PEMBELI} tab="adukan" onTab={kosong}>
      <main className="lembar-isi" style={{ paddingTop: 'var(--s-base)' }}>
        <div className="jejak-tahap">
          <span className="label">Tahap 3</span>
          <span className="nama-tahap">Adukan</span>
        </div>
        <div className="tumpuk">
          <div className={`keadaan ${diputus ? 'galat' : 'peringatan'}`}>
            <div className="baris antara">
              <strong className="tegas">
                {diputus ? 'Petugas mengonfirmasi penipuan' : 'Terkirim ke meja petugas'}
              </strong>
              <span className="mono kecil">ADU-0003</span>
            </div>
            <div className="kecil" style={{ marginTop: 6 }}>
              {diputus
                ? 'Diputus oleh CS-01. Kode ini kini merah bagi setiap pemindai berikutnya.'
                : 'Menunggu putusan petugas di perangkat terpisah.'}
            </div>
          </div>
          <div className="kartu">
            <span className="label">Perjalanan aduan</span>
            <ol className="langkah-aduan">
              <li className="jadi"><strong className="tegas">Pembeli</strong> mengirim aduan</li>
              <li className={diputus ? 'jadi' : 'menunggu'}>
                <strong className="tegas">Petugas</strong> memeriksa di perangkat terpisah
              </li>
              <li className={diputus ? 'jadi' : ''}>
                NMID masuk aturan <span className="mono">R3</span>, pemindai berikutnya melihat merah
              </li>
            </ol>
          </div>
        </div>
      </main>
    </Cangkang>
  );
}

function Pedagang({ mode }) {
  const [qrSegel, setQrSegel] = useState(null);
  useEffect(() => {
    QRCode.toDataURL(`SASI1:${LAPAK.segelId}`, { margin: 1, width: 620 })
      .then(setQrSegel).catch(() => {});
  }, []);

  return (
    <Cangkang>
      <main className="lembar-isi" style={{ paddingTop: 'var(--s-base)' }}>
        <div className="jejak-tahap">
          <span className="label">Tahap 1</span>
          <span className="nama-tahap">Peduli</span>
        </div>

        {mode === 'notifikasi' ? (
          <div className="tumpuk">
            <div className="notifikasi">
              <div className="notifikasi-kepala">
                <span className="label">Pembayaran masuk</span>
                <span className="mono kecil redup">24 Sep, 10.14</span>
              </div>
              <div className="notifikasi-nominal">Rp20.000</div>
              <div className="kecil" style={{ color: 'var(--body)' }}>
                dari Budi Santoso · Warung Mama Ani
              </div>
            </div>
            <div className="kartu">
              <table className="atribut">
                <tbody>
                  <tr><td>Nomor transaksi</td><td>TRX00041</td></tr>
                  <tr><td>Hasil verifikasi</td><td>A01</td></tr>
                  <tr><td>Blok rantai</td><td>#41</td></tr>
                </tbody>
              </table>
            </div>
            <button className="utama penuh">Siap melayani pembeli berikutnya</button>
          </div>
        ) : (
          <div className="tumpuk">
            <div className="keadaan peringatan baris">
              <span className="denyut" />
              <span>Menunggu pembeli memindai segel.</span>
            </div>
            <div className="kartu">
              <div className="baris antara" style={{ marginBottom: 'var(--s-sm)' }}>
                <span className="label">Kode segel</span>
                <span className="mono kecil tegas">SL7K2M9Q</span>
              </div>
              {qrSegel && <img src={qrSegel} alt="Kode segel" style={{ width: '100%', display: 'block' }} />}
            </div>
          </div>
        )}
      </main>
    </Cangkang>
  );
}

function Petugas() {
  return (
    <Cangkang
      angka="1" keterangan="aduan menunggu putusan Anda"
      nav={[
        { kunci: 'akun', judul: 'Skor', ikon: <IkonSegel width={21} height={21} /> },
        { kunci: 'aduan', judul: 'Aduan', ikon: <IkonAduan width={26} height={26} />, utama: true },
        { kunci: 'rantai', judul: 'Rantai', ikon: <IkonRiwayat width={21} height={21} /> },
      ]}
      tab="aduan" onTab={kosong}
    >
      <main className="lembar-isi" style={{ paddingTop: 'var(--s-base)' }}>
        <div className="jejak-tahap">
          <span className="label">Tahap 3</span>
          <span className="nama-tahap">Adukan · meja petugas</span>
        </div>
        <div className="notifikasi bahaya">
          <div className="notifikasi-kepala"><span className="label">Aduan baru masuk</span></div>
          <div className="notifikasi-nominal">1</div>
          <div className="kecil" style={{ color: 'var(--body)' }}>
            ADU-0003 dikirim pembeli dari perangkat lain. Periksa dan putuskan di bawah.
          </div>
        </div>
        <div className="kartu">
          <div className="baris antara">
            <span className="mono kecil tegas" style={{ fontWeight: 600 }}>ADU-0003</span>
            <span className="lencana peringatan">baru</span>
          </div>
          <hr className="pisah" />
          <table>
            <tbody>
              <tr><td className="redup" style={{ width: '40%' }}>NMID diadukan</td><td className="mono tegas">ID1024567890456</td></tr>
              <tr><td className="redup">Lapak terdaftar</td><td className="tegas">Toko Sinar Jaya</td></tr>
              <tr><td className="redup">Kode aturan</td><td className="mono">E04</td></tr>
              <tr><td className="redup">Segel dipindai</td><td className="mono">SL7K2M9Q</td></tr>
              <tr><td className="redup">Pelapor</td><td>Budi Santoso</td></tr>
              <tr><td className="redup">Kronologi</td><td>Stiker baru menutupi stiker lama.</td></tr>
            </tbody>
          </table>
          <div className="baris" style={{ marginTop: 'var(--s-sm)', alignItems: 'stretch' }}>
            <button className="penuh">Tolak, kembalikan skor</button>
            <button className="bahaya penuh">Konfirmasi penipuan</button>
          </div>
        </div>
      </main>
    </Cangkang>
  );
}

// ------------------------------------------------------------------- daftar

export const LAYAR = {
  'pembeli-beranda': { judul: 'Pembeli · beranda', render: () => <PembeliBeranda /> },
  'pembeli-pindai': { judul: 'Pembeli · pindai segel', render: () => <PembeliPindai /> },
  'verifikasi-hijau': {
    judul: 'Putusan A01 · aman',
    render: () => <Verifikasi muatan={LAPAK.muatan} lapak={LAPAK} />,
  },
  'verifikasi-merah': {
    judul: 'Putusan E04 · kode ditukar',
    render: () => <Verifikasi muatan={KODE_PENGGANTI} lapak={LAPAK} />,
  },
  'pembeli-menunggu': { judul: 'Pembeli · menunggu petugas', render: () => <PembeliMenunggu /> },
  'pembeli-diputus': { judul: 'Pembeli · petugas memutus', render: () => <PembeliMenunggu diputus /> },
  'pedagang-segel': { judul: 'Pedagang · kode segel', render: () => <Pedagang mode="segel" /> },
  'pedagang-notifikasi': { judul: 'Pedagang · pembayaran masuk', render: () => <Pedagang mode="notifikasi" /> },
  'petugas-aduan': { judul: 'Petugas · aduan masuk', render: () => <Petugas /> },
};

export default function Peraga() {
  const nama = new URLSearchParams(location.search).get('layar');
  const pilihan = LAYAR[nama];
  if (!pilihan) {
    return (
      <div className="app">
        <main className="lembar-isi" style={{ paddingTop: 'var(--s-lg)' }}>
          <h2>Halaman peraga</h2>
          <p className="kecil redup">Tambahkan ?layar= pada alamat. Pilihan yang tersedia:</p>
          <div className="tumpuk">
            {Object.entries(LAYAR).map(([k, v]) => (
              <a key={k} className="kartu" href={`/peraga?layar=${k}`} style={{ textDecoration: 'none' }}>
                <div className="tegas" style={{ fontWeight: 600 }}>{v.judul}</div>
                <div className="mono kecil redup">?layar={k}</div>
              </a>
            ))}
          </div>
        </main>
      </div>
    );
  }
  return <div className="app">{pilihan.render()}</div>;
}
