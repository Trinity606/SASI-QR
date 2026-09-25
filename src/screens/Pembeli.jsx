import { useEffect, useState } from 'react';
import Cangkang from '../components/Cangkang.jsx';
import BerandaPembeli from './BerandaPembeli.jsx';
import Kenali from './Kenali.jsx';
import Adukan from './Adukan.jsx';
import { rupiah, waktu } from '../api.js';
import { pantauDompet } from '../lib/dompet.js';
import { IkonBeranda, IkonPindai, IkonRiwayat, IkonMata } from '../components/Ikon.jsx';

// Perangkat pembeli. Memakai cangkang yang sama persis dengan pedagang dan
// petugas; yang berbeda hanya angka di kepala, isi kisi ikon, dan isi layar.
//
// Alur aduan tetap lurus: Adukan hanya berangkat dari layar putusan, jadi
// tidak punya tab sendiri di navigasi.

export default function Pembeli({ salinan, luring, onGantiPihak }) {
  const [tab, setTab] = useState('beranda');
  const [hasil, setHasil] = useState(null); // hasil yang sedang diadukan
  const [dompet, setDompet] = useState({ saldo: 0, riwayat: [] });
  const [tampil, setTampil] = useState(true);

  useEffect(() => pantauDompet(setDompet), []);

  function keAdukan(h) {
    setHasil(h);
    setTab('adukan');
  }

  const isi = () => {
    if (tab === 'adukan' && hasil) {
      return (
        <Bingkai tahap="3" nama="Adukan">
          <Adukan hasil={hasil} onSelesai={() => { setHasil(null); setTab('beranda'); }} />
        </Bingkai>
      );
    }
    if (tab === 'pindai') {
      return (
        <Bingkai tahap="2" nama="Kenali">
          <Kenali salinan={salinan} onAdukan={keAdukan} />
        </Bingkai>
      );
    }
    if (tab === 'riwayat') return <Riwayat dompet={dompet} />;
    return <BerandaPembeli salinan={salinan} dompet={dompet} />;
  };

  const beranda = tab === 'beranda';

  return (
    <Cangkang
      satuan={beranda ? 'Rp' : undefined}
      angka={beranda ? (tampil ? dompet.saldo.toLocaleString('id-ID') : '••••••') : undefined}
      keterangan="Saldo simulasi, bukan dana nyata."
      aksiKepala={beranda && (
        <button
          className="tombol-bulat ikon-saja"
          aria-label={tampil ? 'Sembunyikan saldo' : 'Tampilkan saldo'}
          onClick={() => setTampil((v) => !v)}
        >
          <IkonMata tertutup={!tampil} width={18} height={18} />
        </button>
      )}
      cip={luring ? ['LURING · TETAP BISA MEMERIKSA'] : []}
      nav={[
        { kunci: 'beranda', judul: 'Beranda', ikon: <IkonBeranda width={21} height={21} /> },
        { kunci: 'pindai', judul: 'Periksa', ikon: <IkonPindai width={26} height={26} />, utama: true },
        { kunci: 'riwayat', judul: 'Riwayat', ikon: <IkonRiwayat width={21} height={21} /> },
      ]}
      pihak="Pembeli"
      onGantiPihak={onGantiPihak}
      tab={tab}
      onTab={setTab}
    >
      {isi()}
    </Cangkang>
  );
}

/** Kepala ringkas untuk layar di luar beranda, tetap menyebut tahap PeKA. */
function Bingkai({ tahap, nama, children }) {
  return (
    <main className="lembar-isi" style={{ paddingTop: 'var(--s-base)' }}>
      <div className="jejak-tahap">
        <span className="label">Tahap {tahap}</span>
        <span className="nama-tahap">{nama}</span>
      </div>
      {children}
    </main>
  );
}

function Riwayat({ dompet }) {
  return (
    <Bingkai tahap="Dompet" nama="Riwayat">
      <div className="kartu">
        <span className="label">Saldo simulasi</span>
        <div className="nominal-besar" style={{ marginTop: 4 }}>{rupiah(dompet.saldo)}</div>
      </div>

      <div className="kartu">
        <span className="label">Transaksi</span>
        {dompet.riwayat.length === 0 ? (
          <p className="kecil redup" style={{ margin: '8px 0 0' }}>Belum ada transaksi.</p>
        ) : (
          dompet.riwayat.map((t) => (
            <div className="riwayat-baris" key={t.ref}>
              <div style={{ minWidth: 0 }}>
                <div className="tegas" style={{ fontWeight: 600 }}>{t.kepada}</div>
                <div className="mono kecil redup">{waktu(t.waktu)} · {t.ref} · {t.kodeAturan}</div>
              </div>
              <div className="mono tegas" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                {rupiah(t.nominal)}
              </div>
            </div>
          ))
        )}
      </div>
    </Bingkai>
  );
}
