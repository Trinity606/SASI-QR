import { useEffect, useRef, useState } from 'react';
import { api, waktu, useKeadaan } from '../api.js';
import RincianSkor from '../components/RincianSkor.jsx';
import { TABEL_POIN } from '../lib/score.js';
import Cangkang from '../components/Cangkang.jsx';
import { IkonAduan, IkonSegel, IkonRiwayat } from '../components/Ikon.jsx';

// Meja petugas. Perangkat terpisah, dipegang pihak ketiga, bukan pedagang
// maupun pembeli.
//
// Satu pekerjaan utama: memutuskan aduan yang masuk. Skor dan rantai ada di
// balik tab sekunder karena keduanya alat telusur, bukan pekerjaan harian.
// Pemisahan ini disengaja supaya saat demo terlihat jelas bahwa yang memutus
// penipuan adalah pihak ketiga, bukan orang yang sama yang memindai.

export default function Petugas({ onGantiPihak }) {
  const { keadaan, segarkan } = useKeadaan();
  const [tab, setTab] = useState('aduan'); // hook harus di atas cabang mana pun
  const [baru, setBaru] = useState([]); // nomor aduan yang datang saat layar terbuka
  const dikenal = useRef(null);

  // Lacak nomor aduannya, bukan selisih hitungan. Selisih bisa menipu: bila
  // petugas memutus satu aduan tepat ketika satu aduan lain masuk, jumlah yang
  // menunggu tidak berubah dan aduan baru itu lolos tanpa terlihat.
  useEffect(() => {
    if (!keadaan) return;
    const menunggu = keadaan.aduan.filter((a) => a.status === 'baru').map((a) => a.id);
    if (dikenal.current === null) {
      dikenal.current = new Set(menunggu); // yang sudah ada saat layar dibuka
      return;
    }
    const masuk = menunggu.filter((id) => !dikenal.current.has(id));
    if (masuk.length) {
      masuk.forEach((id) => dikenal.current.add(id));
      setBaru((lama) => [...lama, ...masuk]);
    }
  }, [keadaan]);

  if (!keadaan) {
    return (
      <main className="lembar-isi" style={{ paddingTop: 'var(--s-lg)' }}>
        <p className="redup">Memuat meja petugas...</p>
      </main>
    );
  }

  const menunggu = keadaan.aduan.filter((a) => a.status === 'baru').length;

  return (
    <Cangkang
      angka={tab === 'aduan' ? String(menunggu) : undefined}
      keterangan="aduan menunggu putusan Anda"
      nav={[
        { kunci: 'akun', judul: 'Skor', ikon: <IkonSegel width={21} height={21} /> },
        { kunci: 'aduan', judul: 'Aduan', ikon: <IkonAduan width={26} height={26} />, utama: true },
        { kunci: 'rantai', judul: 'Rantai', ikon: <IkonRiwayat width={21} height={21} /> },
      ]}
      pihak="Petugas"
      onGantiPihak={onGantiPihak}
      tab={tab}
      onTab={setTab}
    >
      <main className="lembar-isi" style={{ paddingTop: 'var(--s-base)' }}>
        <div className="jejak-tahap">
          <span className="label">Tahap 3</span>
          <span className="nama-tahap">Adukan - meja petugas</span>
        </div>

        {baru.length > 0 && (
          <div className="notifikasi bahaya" role="status">
            <div className="notifikasi-kepala">
              <span className="label">Aduan baru masuk</span>
              <button className="kecil sunyi" onClick={() => setBaru([])}>Tutup</button>
            </div>
            <div className="notifikasi-nominal">{baru.length}</div>
            <div className="kecil" style={{ color: 'var(--body)' }}>
              {baru.join(', ')} dikirim pembeli dari perangkat lain. Periksa dan putuskan di bawah.
            </div>
          </div>
        )}

        {tab === 'aduan' && <Aduan keadaan={keadaan} segarkan={segarkan} />}
        {tab === 'akun' && <Akun keadaan={keadaan} segarkan={segarkan} />}
        {tab === 'rantai' && <RantaiTab />}
      </main>
    </Cangkang>
  );
}

// -------------------------------------------------------------------- aduan

function Aduan({ keadaan, segarkan }) {
  const [sibuk, setSibuk] = useState(null);
  const daftar = [...(keadaan?.aduan ?? [])].sort((a, b) => b.dibuat - a.dibuat);
  const nama = (id) => keadaan?.akun.find((a) => a.id === id)?.nama ?? id;

  async function putus(id, aksi) {
    setSibuk(id);
    try {
      await api.putusAduan(id, aksi, { petugas: 'CS-01' });
      segarkan();
    } finally {
      setSibuk(null);
    }
  }

  if (!daftar.length) return <p className="redup">Belum ada aduan masuk.</p>;

  return (
    <div className="tumpuk">
      {daftar.map((a) => (
        <div className="kartu" key={a.id}>
          <div className="baris antara">
            <span className="mono kecil" style={{ color: 'var(--ink)', fontWeight: 600 }}>{a.id}</span>
            <span className={`lencana ${a.status === 'terkonfirmasi' ? 'galat' : a.status === 'ditolak' ? 'abu' : 'peringatan'}`}>
              {a.status}
            </span>
          </div>
          <hr className="pisah" />
          <table>
            <tbody>
              <tr>
                <td className="redup" style={{ width: '38%' }}>
                  {a.nmid ? 'NMID diadukan' : 'Cap muatan diadukan'}
                </td>
                <td className="mono" style={{ color: 'var(--ink)' }}>
                  {a.nmid || a.capMuatan || '-'}
                </td>
              </tr>
              {!a.nmid && (
                <tr>
                  <td className="redup">Catatan</td>
                  <td style={{ color: 'var(--error)' }}>
                    Muatan kode rusak, NMID tidak dapat diurai.
                  </td>
                </tr>
              )}
              <tr>
                <td className="redup">Lapak terdaftar</td>
                <td style={{ color: a.terlapor ? 'var(--ink)' : 'var(--muted)' }}>
                  {a.terlapor ? nama(a.terlapor) : 'tidak dapat ditentukan'}
                </td>
              </tr>
              {a.namaPadaKode && <tr><td className="redup">Nama pada kode</td><td className="mono">{a.namaPadaKode}</td></tr>}
              {a.kodeAturan && <tr><td className="redup">Kode aturan</td><td className="mono">{a.kodeAturan}</td></tr>}
              {a.segelId && <tr><td className="redup">Segel dipindai</td><td className="mono">{a.segelId}</td></tr>}
              {a.nmid && a.capMuatan && <tr><td className="redup">Cap muatan</td><td className="mono">{a.capMuatan}</td></tr>}
              <tr><td className="redup">Pelapor</td><td>{nama(a.pelapor)}</td></tr>
              <tr><td className="redup">Masuk</td><td className="mono">{waktu(a.dibuat)}</td></tr>
              {a.kronologi && <tr><td className="redup">Kronologi</td><td>{a.kronologi}</td></tr>}
              {a.petugas && <tr><td className="redup">Diputus oleh</td><td className="mono">{a.petugas}</td></tr>}
            </tbody>
          </table>

          {a.status === 'baru' && (
            <div className="baris" style={{ marginTop: 'var(--s-sm)', alignItems: 'stretch' }}>
              <button className="penuh" disabled={sibuk === a.id} onClick={() => putus(a.id, 'tolak')}>
                Tolak, kembalikan skor
              </button>
              <button className="bahaya penuh" disabled={sibuk === a.id} onClick={() => putus(a.id, 'konfirmasi')}>
                Konfirmasi penipuan
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// --------------------------------------------------------------------- akun

function Akun({ keadaan, segarkan }) {
  const [buka, setBuka] = useState(null);
  const [tipePeristiwa, setTipePeristiwa] = useState('TRANSAKSI_BERSIH');

  async function suntik(akun) {
    await api.peristiwa({ type: tipePeristiwa, akun, petugas: 'CS-01' });
    segarkan();
  }

  return (
    <div className="tumpuk">
      {(keadaan?.akun ?? []).map((a) => (
        <div className="kartu" key={a.id}>
          <div className="baris antara">
            <div style={{ minWidth: 0 }}>
              <div style={{ color: 'var(--ink)', fontWeight: 600 }}>{a.nama}</div>
              <div className="mono kecil redup">{a.id} · {a.nmid}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="mono" style={{ fontSize: 22, color: 'var(--ink)' }}>{a.skor}</div>
              <span className={`lencana ${a.pita.warna}`}>{a.pita.label}</span>
            </div>
          </div>
          <div className="skor-bar" style={{ marginTop: 'var(--s-sm)' }}>
            <i className={a.pita.warna} style={{ width: `${a.skor}%` }} />
          </div>

          <button className="kecil penuh" style={{ marginTop: 'var(--s-sm)' }}
            onClick={() => setBuka(buka === a.id ? null : a.id)}>
            {buka === a.id ? 'Tutup rincian' : 'Lihat asal-usul skor'}
          </button>

          {buka === a.id && (
            <>
              <hr className="pisah" />
              <RincianSkor rincian={a.rincian} />
              <hr className="pisah" />
              <span className="label">Suntik peristiwa, untuk demo</span>
              <div className="baris" style={{ marginTop: 'var(--s-xxs)' }}>
                <select value={tipePeristiwa} onChange={(e) => setTipePeristiwa(e.target.value)}>
                  {Object.entries(TABEL_POIN).map(([k, v]) => (
                    <option key={k} value={k}>{v.label} ({v.poin > 0 ? `+${v.poin}` : v.poin})</option>
                  ))}
                </select>
                <button className="kecil" onClick={() => suntik(a.id)}>Catat</button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------- rantai

function RantaiTab() {
  const [data, setData] = useState(null);
  useEffect(() => { api.rantai().then(setData); }, []);

  if (!data) return <p className="redup">Memuat rantai...</p>;
  const v = data.verifikasi;

  return (
    <div className="tumpuk">
      <div className={`keadaan ${v.sah ? 'sukses' : 'galat'}`}>
        <strong style={{ color: 'var(--ink)' }}>{v.sah ? 'Rantai utuh' : 'Rantai rusak'}</strong>
        <div className="kecil" style={{ marginTop: 4 }}>
          {v.sah
            ? `${v.panjang} blok diperiksa ulang, seluruh tautan hash cocok.`
            : `Blok #${v.rusakPada}: ${v.sebab}.`}
        </div>
      </div>
      <button className="penuh kecil" onClick={() => api.rantai().then(setData)}>Verifikasi ulang</button>

      {[...data.blok].reverse().map((b) => (
        <div className="kartu rapat" key={b.indeks}>
          <div className="baris antara">
            <span className="mono kecil" style={{ color: 'var(--ink)', fontWeight: 600 }}>#{b.indeks}</span>
            <span className="mono kecil redup">{b.waktu ? waktu(b.waktu) : 'asal'}</span>
          </div>
          {b.peristiwa.map((p, i) => (
            <div key={i} className="kecil" style={{ marginTop: 6 }}>
              <span className="mono" style={{ color: 'var(--ink)' }}>{p.type}</span>
              {p.akun && <span className="redup"> · {p.akun}</span>}
              {p.kodeAturan && <span className="redup"> · {p.kodeAturan}</span>}
              {p.tindakan && <span className="redup"> · {p.tindakan}</span>}
            </div>
          ))}
          <div className="sumber" style={{ marginTop: 6, wordBreak: 'break-all' }}>
            hash {b.hash.slice(0, 24)}… · prev {b.prevHash.slice(0, 16)}…
          </div>
        </div>
      ))}
    </div>
  );
}
