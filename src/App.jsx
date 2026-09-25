import { Suspense, lazy, useEffect, useState } from 'react';
import { segarkanSalinan, salinanTersimpan } from './lib/salinan.js';
import { pasangPengirimUlang } from './lib/antrean.js';
import { pantauAliran } from './lib/aliran.js';
import Pedagang from './screens/Pedagang.jsx';
import Pembeli from './screens/Pembeli.jsx';

// Meja petugas tidak pernah dibuka pedagang maupun pembeli, jadi kodenya baru
// diunduh saat perangkat memang berperan sebagai petugas.
const Petugas = lazy(() => import('./screens/Petugas.jsx'));

// Satu perangkat, satu pihak.
//
// Versi sebelumnya menaruh pekerjaan pedagang, pembeli, dan petugas dalam satu
// aplikasi bernavigasi tiga tab. Saat demo, pembicara harus melompat antar tab
// di perangkat yang sama, dan prosedurnya jadi tidak terbaca oleh penonton.
//
// Sekarang perangkat memilih pihaknya sekali, lalu terkunci. Setiap perangkat
// hanya memperlihatkan satu pekerjaan, sehingga alur demo terlihat sebagai
// percakapan antar perangkat, bukan sebagai orang yang menekan menu.
//
// Kerangka PeKA tetap terlihat, tetapi sebagai nama tahap pada tiap layar,
// bukan sebagai menu navigasi.

const PIHAK = {
  pedagang: {
    judul: 'Pedagang',
    tahap: 'Peduli',
    tugas: 'Daftarkan lapak, tampilkan kode segel dan kode pembayaran.',
    warna: 'var(--stage-peduli)',
  },
  pembeli: {
    judul: 'Pembeli',
    tahap: 'Kenali dan Adukan',
    tugas: 'Pindai segel, pindai kode pembayaran, baca putusan.',
    warna: 'var(--stage-kenali)',
  },
  petugas: {
    judul: 'Petugas',
    tahap: 'Adukan',
    tugas: 'Terima aduan dari pembeli, periksa buktinya, lalu putuskan.',
    warna: 'var(--stage-adukan)',
  },
};

const KUNCI_PIHAK = 'sasi.pihak.v1';
const bacaPihak = () => {
  try {
    return localStorage.getItem(KUNCI_PIHAK);
  } catch {
    return null;
  }
};

export default function App({ pihakAwal = null }) {
  const [pihak, setPihak] = useState(pihakAwal ?? bacaPihak);
  const [salinan, setSalinan] = useState(salinanTersimpan);
  const [luring, setLuring] = useState(!navigator.onLine);

  useEffect(() => {
    segarkanSalinan().then(setSalinan);
    pasangPengirimUlang();
    const naik = () => { setLuring(false); segarkanSalinan().then(setSalinan); };
    const turun = () => setLuring(true);
    addEventListener('online', naik);
    addEventListener('offline', turun);

    // Petugas memutus di perangkatnya, perangkat ini menyegarkan dirinya.
    // Tanpa ini, daftar NMID yang diadukan tidak pernah sampai ke pemindai,
    // dan aturan R3 tidak akan pernah aktif selama demo berlangsung.
    const lepasAliran = pantauAliran(() => segarkanSalinan().then(setSalinan));

    return () => {
      removeEventListener('online', naik);
      removeEventListener('offline', turun);
      lepasAliran();
    };
  }, []);

  function kunci(k) {
    try { localStorage.setItem(KUNCI_PIHAK, k); } catch { /* penyimpanan diblokir */ }
    setPihak(k);
  }

  function lepas() {
    try { localStorage.removeItem(KUNCI_PIHAK); } catch { /* penyimpanan diblokir */ }
    setPihak(null);
  }

  if (!pihak) return <PilihPihak onPilih={kunci} />;

  const p = PIHAK[pihak];

  // Ketiga pihak memakai cangkang yang sama persis. Yang berbeda hanya
  // isinya, bukan bentuknya.
  return (
    <div className="app">
      {pihak === 'pedagang' && (
        <Pedagang
          salinan={salinan}
          luring={luring}
          onGantiPihak={lepas}
          onSalinanBerubah={() => segarkanSalinan().then(setSalinan)}
        />
      )}
      {pihak === 'pembeli' && <Pembeli salinan={salinan} luring={luring} onGantiPihak={lepas} />}
      {pihak === 'petugas' && (
        <Suspense fallback={<main className="lembar-isi"><p className="redup">Memuat meja petugas...</p></main>}>
          <Petugas onGantiPihak={lepas} />
        </Suspense>
      )}
    </div>
  );
}

// -------------------------------------------------------------- pilih pihak

function PilihPihak({ onPilih }) {
  return (
    <div className="app">
      <header className="kepala-app">
        <div className="merek">Verifikasi QRIS</div>
        <h1>SASI-QR</h1>
        <div className="sapaan">Periksa sebelum uang berpindah.</div>
      </header>

      <main className="lembar-isi" style={{ paddingTop: 'var(--s-lg)' }}>
        <span className="label">Perangkat ini dipakai oleh</span>
        <div className="tumpuk" style={{ marginTop: 'var(--s-xs)' }}>
          {Object.entries(PIHAK).map(([k, v]) => (
            <button key={k} className="kartu-tahap" onClick={() => onPilih(k)}>
              <div className="pita-tahap" style={{ background: v.warna }} />
              <div className="isi">
                <div className="judul">{v.judul}</div>
                <div className="ket">{v.tugas}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="kartu" style={{ marginTop: 'var(--s-lg)' }}>
          <span className="label">Prosedur demo · tiga perangkat</span>
          <ol className="prosedur">
            <li><strong className="tegas">Pedagang</strong> menampilkan kode segel.</li>
            <li><strong className="tegas">Pembeli</strong> memindai segel. Layar pedagang berpindah sendiri ke kode pembayaran.</li>
            <li><strong className="tegas">Pembeli</strong> memindai kode itu. Putusan <span className="mono">A01</span> hijau atau <span className="mono">E04</span> merah.</li>
            <li>Bila hijau, pembeli membayar dan <strong className="tegas">Pedagang</strong> menerima pemberitahuan.</li>
            <li>Bila merah, <strong className="tegas">Pembeli</strong> mengadu dengan satu ketuk.</li>
            <li><strong className="tegas">Petugas</strong> menerima aduan itu di perangkat ketiga, lalu memutuskan.</li>
            <li>Layar pembeli berubah sendiri, dan pemindai berikutnya melihat <span className="mono">E03</span>.</li>
          </ol>
        </div>

        <p className="sumber" style={{ marginTop: 'var(--s-base)' }}>
          SASI-QR · purwarupa riset · SMA Laboratorium Universitas Pattimura
        </p>
      </main>
    </div>
  );
}
