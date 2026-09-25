import { waktu } from '../api.js';
import { TABEL_POIN } from '../lib/score.js';

/** Rincian poin. Ini yang membuat skor bisa dipertanggungjawabkan ke pedagang:
 *  setiap angka dapat ditunjuk asal-usulnya. */
export default function RincianSkor({ rincian = [] }) {
  if (!rincian.length) return <p className="kecil redup">Belum ada peristiwa.</p>;
  return (
    <table>
      <thead>
        <tr><th>Waktu</th><th>Peristiwa</th><th style={{ textAlign: 'right' }}>Poin</th><th style={{ textAlign: 'right' }}>Skor</th></tr>
      </thead>
      <tbody>
        {[...rincian].reverse().map((r, i) => (
          <tr key={i}>
            <td className="mono redup" style={{ whiteSpace: 'nowrap' }}>{waktu(r.ts)}</td>
            <td>
              {TABEL_POIN[r.tipe]?.label ?? r.tipe}
              {r.delta !== r.diminta && <div className="kecil redup">{r.catatan}</div>}
            </td>
            <td className="angka" style={{ color: r.delta < 0 ? 'var(--error)' : r.delta > 0 ? 'var(--success)' : 'var(--muted)' }}>
              {r.delta > 0 ? `+${r.delta}` : r.delta}
            </td>
            <td className="angka" style={{ color: 'var(--ink)' }}>{r.skor}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
