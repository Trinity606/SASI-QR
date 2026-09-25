import { rupiah, waktu } from '../api.js';
import { setelUlangDompet } from '../lib/dompet.js';

// Isi beranda pembeli, di bawah kepala saldo yang disediakan Cangkang.

export default function BerandaPembeli({ salinan, dompet }) {
  const tersegel = (salinan?.lapak ?? []).filter((l) => l.segelId);
  const terakhir = dompet.riwayat[0];

  return (
    <main className="lembar-isi" style={{ paddingTop: 'var(--s-base)' }}>
      {terakhir && (
        <div className="kartu">
          <div className="kepala-bagian">
            <span className="label">Transaksi terakhir</span>
            <span className="mono kecil redup">{terakhir.kodeAturan}</span>
          </div>
          <div className="baris antara">
            <div>
              <div className="tegas" style={{ fontWeight: 600 }}>{terakhir.kepada}</div>
              <div className="kecil redup">{waktu(terakhir.waktu)}</div>
            </div>
            <div className="mono tegas" style={{ fontWeight: 600 }}>{rupiah(terakhir.nominal)}</div>
          </div>
        </div>
      )}

      <div className="kartu">
        <div className="kepala-bagian">
          <span className="label">Lapak tersegel di sekitar</span>
          <span className="kecil redup">{tersegel.length}</span>
        </div>
        {tersegel.length === 0 && (
          <p className="kecil redup" style={{ margin: 0 }}>
            Salinan lapak belum tersedia. Sambungkan jaringan sekali untuk mengunduhnya.
          </p>
        )}
        {tersegel.map((l) => (
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

      <button className="sunyi penuh kecil" onClick={setelUlangDompet}>
        Setel ulang dompet simulasi
      </button>
    </main>
  );
}

const inisial = (nama) =>
  (nama || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
