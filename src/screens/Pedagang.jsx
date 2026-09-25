import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import Pemindai from '../components/Pemindai.jsx';
import { bacaQris } from '../lib/emv.js';
import { pantauAliran } from '../lib/aliran.js';
import { lihatSesi, rupiah, waktu } from '../api.js';
import Cangkang from '../components/Cangkang.jsx';

// Perangkat pedagang, tahap Peduli.
//
// Layar ini mengikuti sendiri apa yang sedang dilakukan pembeli:
//
//   menunggu  --segel dipindai-->  kode pembayaran
//             --kode dipindai-->   pembeli sedang memeriksa
//             --dibayar-->         pemberitahuan pembayaran masuk
//
// Perpindahannya dipicu kabar dari peladen, bukan oleh pedagang menekan
// tombol. Itulah yang membuat demo terbaca sebagai percakapan antar perangkat.
//
// Bila jaringan mati, layar tetap bisa dipindahkan manual. Yang hilang hanya
// perpindahan otomatisnya, bukan kemampuan menampilkan kode.

export default function Pedagang({ salinan, luring, onSalinanBerubah, onGantiPihak }) {
  const [tab, setTab] = useState('beranda');

  // Tanpa angka besar dan tanpa navigasi: pekerjaan pedagang hanya satu,
  // menunjukkan kode. Pindah ke pendaftaran lewat tombol di dalam isi.
  return (
    <Cangkang
      cip={luring ? ['LURING · KODE TETAP TAMPIL'] : []}
      pihak="Pedagang"
      onGantiPihak={onGantiPihak}
    >
      <main className="lembar-isi" style={{ paddingTop: 'var(--s-base)' }}>
        <div className="jejak-tahap">
          <span className="label">Tahap 1</span>
          <span className="nama-tahap">{tab === 'daftar' ? 'Peduli - daftarkan lapak' : 'Peduli'}</span>
        </div>
        {tab === 'daftar' ? (
          <>
            <DaftarkanLapak onSelesai={onSalinanBerubah} />
            <button className="sunyi penuh" style={{ marginTop: 'var(--s-sm)' }} onClick={() => setTab('beranda')}>
              Kembali ke meja kasir
            </button>
          </>
        ) : (
          <MejaKasir salinan={salinan} onDaftarkan={() => setTab('daftar')} />
        )}
      </main>
    </Cangkang>
  );
}

// ------------------------------------------------------------- meja kasir

function MejaKasir({ salinan, onDaftarkan }) {
  const lapak = salinan?.lapak ?? [];
  const [id, setId] = useState('');
  const [tahap, setTahap] = useState('menunggu');
  const [bukti, setBukti] = useState(null);
  const [kodeAturan, setKodeAturan] = useState(null);
  const [penipu, setPenipu] = useState('');
  const [gambar, setGambar] = useState({ segel: null, bayar: null });

  const dipilih = lapak.find((l) => l.id === id) ?? lapak[0];
  const segelId = dipilih?.segelId ?? null;
  // Mode uji lawan: kode milik lapak lain ditempel di atas segel ini.
  const sumberKode = penipu ? lapak.find((l) => l.id === penipu) : dipilih;

  // Bangkitkan kedua gambar kode sekali, supaya perpindahan layar terasa
  // seketika saat segel dipindai.
  useEffect(() => {
    let batal = false;
    const buat = async () => {
      const segel = segelId
        ? await QRCode.toDataURL(`SASI1:${segelId}`, { margin: 1, width: 620 }).catch(() => null)
        : null;
      const bayarQr = sumberKode?.muatan
        ? await QRCode.toDataURL(sumberKode.muatan, { margin: 1, width: 620 }).catch(() => null)
        : null;
      if (!batal) setGambar({ segel, bayar: bayarQr });
    };
    buat();
    return () => { batal = true; };
  }, [segelId, sumberKode?.muatan]);

  // Ikuti kabar untuk segel milik lapak ini saja.
  useEffect(() => {
    if (!segelId) return;
    setTahap('menunggu');
    setBukti(null);
    setKodeAturan(null);

    // Ambil keadaan terakhir, kalau-kalau pembeli sudah memindai sebelum
    // layar ini dibuka.
    lihatSesi(segelId).then((s) => {
      if (s?.tahap && s.tahap !== 'selesai') {
        setTahap(s.tahap);
        if (s.kodeAturan) setKodeAturan(s.kodeAturan);
        if (s.ref) setBukti(s);
      }
    }).catch(() => {});

    return pantauAliran((pesan) => {
      if (pesan.jenis !== 'sesi' || pesan.segelId !== segelId) return;
      if (pesan.tahap === 'selesai') {
        setTahap('menunggu');
        setBukti(null);
        setKodeAturan(null);
        return;
      }
      setTahap(pesan.tahap);
      if (pesan.kodeAturan) setKodeAturan(pesan.kodeAturan);
      if (pesan.tahap === 'dibayar') setBukti(pesan);
    });
  }, [segelId]);

  if (!dipilih) return <p className="redup">Salinan lapak belum tersedia.</p>;

  const pilihLapak = (
    <label>
      <span className="label">Lapak</span>
      <select value={dipilih.id} onChange={(e) => { setId(e.target.value); setPenipu(''); }}>
        {lapak.map((l) => <option key={l.id} value={l.id}>{l.nama}</option>)}
      </select>
    </label>
  );

  // -------------------------------------------------- pemberitahuan masuk

  if (tahap === 'dibayar' && bukti) {
    return (
      <div className="tumpuk">
        <div className="notifikasi">
          <div className="notifikasi-kepala">
            <span className="label">Pembayaran masuk</span>
            <span className="mono kecil redup">{waktu(bukti.waktu)}</span>
          </div>
          <div className="notifikasi-nominal">{rupiah(bukti.nominal)}</div>
          <div className="kecil" style={{ color: 'var(--body)' }}>
            dari {bukti.pembeli} · {dipilih.nama}
          </div>
        </div>

        <div className="kartu">
          <table className="atribut">
            <tbody>
              <tr><td>Nomor transaksi</td><td>{bukti.ref}</td></tr>
              <tr><td>Hasil verifikasi</td><td>{bukti.kodeAturan}</td></tr>
              <tr><td>Blok rantai</td><td>#{bukti.blok}</td></tr>
            </tbody>
          </table>
        </div>

        <button className="utama penuh" onClick={() => { setTahap('menunggu'); setBukti(null); }}>
          Siap melayani pembeli berikutnya
        </button>
        <p className="sumber">
          Pemberitahuan simulasi. SASI-QR tidak memindahkan uang dan tidak
          terhubung ke penyelenggara pembayaran mana pun.
        </p>
      </div>
    );
  }

  // ------------------------------------------- halaman kode pembayaran

  if (tahap === 'segel-dipindai' || tahap === 'kode-dipindai') {
    const diperiksa = tahap === 'kode-dipindai';
    return (
      <div className="tumpuk">
        <div className={`keadaan ${diperiksa ? 'peringatan' : 'sukses'}`}>
          <div className="baris">
            <span className="denyut" />
            <strong className="tegas">
              {diperiksa ? 'Pembeli sedang memeriksa kode Anda' : 'Segel Anda sudah dipindai'}
            </strong>
          </div>
          <div className="kecil" style={{ marginTop: 4 }}>
            {diperiksa
              ? kodeAturan
                ? `Hasilnya ${kodeAturan}. Tunggu pembeli menyelesaikan pembayaran.`
                : 'Tunggu sebentar.'
              : 'Tunjukkan kode pembayaran di bawah ini kepada pembeli.'}
          </div>
        </div>

        <div className="kartu">
          <div className="baris antara" style={{ marginBottom: 'var(--s-sm)' }}>
            <span className="label">Kode pembayaran</span>
            <span className="mono kecil tegas">{sumberKode?.nmid}</span>
          </div>
          {gambar.bayar
            ? <img src={gambar.bayar} alt="Kode pembayaran QRIS" style={{ width: '100%', display: 'block' }} />
            : <p className="kecil redup" style={{ margin: 0 }}>Menyiapkan kode...</p>}
        </div>

        <button className="sunyi penuh" onClick={() => setTahap('menunggu')}>
          Kembali ke kode segel
        </button>
      </div>
    );
  }

  // ------------------------------------------------- halaman kode segel

  return (
    <div className="tumpuk">
      {pilihLapak}

      <div className="keadaan peringatan baris">
        <span className="denyut" />
        <span>Menunggu pembeli memindai segel.</span>
      </div>

      <div className="kartu">
        <div className="baris antara" style={{ marginBottom: 'var(--s-sm)' }}>
          <span className="label">Kode segel</span>
          <span className="mono kecil tegas">{segelId ?? 'belum tersegel'}</span>
        </div>
        {gambar.segel
          ? <img src={gambar.segel} alt={`Kode segel ${segelId}`} style={{ width: '100%', display: 'block' }} />
          : <p className="kecil redup" style={{ margin: 0 }}>Lapak ini belum memiliki segel.</p>}
      </div>

      <button className="sunyi penuh" onClick={() => setTahap('segel-dipindai')}>
        Tampilkan kode pembayaran sekarang
      </button>

      <details className="kartu">
        <summary className="label" style={{ cursor: 'pointer' }}>Mode uji lawan</summary>
        <p className="kecil redup" style={{ marginTop: 'var(--s-sm)' }}>
          Menempelkan kode milik lapak lain di atas segel {segelId ?? 'lapak ini'}.
          Pembeli yang memindai segel lalu kode ini seharusnya melihat layar merah E04.
        </p>
        <select value={penipu} onChange={(e) => setPenipu(e.target.value)}>
          <option value="">Mati, tampilkan kode asli lapak ini</option>
          {lapak.filter((l) => l.id !== dipilih.id).map((l) => (
            <option key={l.id} value={l.id}>Tempel kode {l.nama}</option>
          ))}
        </select>
        {penipu && (
          <div className="keadaan galat" style={{ marginTop: 'var(--s-sm)' }}>
            Kode yang ditampilkan bukan milik lapak ini.
          </div>
        )}
      </details>

      <button className="sunyi penuh" onClick={onDaftarkan}>Daftarkan lapak baru</button>
    </div>
  );
}

// ------------------------------------------------------------ daftarkan lapak

const KOSONG = { nama: '', alamat: '', telepon: '' };

function DaftarkanLapak({ onSelesai }) {
  const [langkah, setLangkah] = useState(1); // 1 pindai qris, 2 data, 3 segel
  const [qr, setQr] = useState(null);
  const [data, setData] = useState(KOSONG);
  const [segelId, setSegelId] = useState(null);
  const [galat, setGalat] = useState(null);
  const [sibuk, setSibuk] = useState(false);
  const [jadi, setJadi] = useState(null);

  function terimaQris(teks) {
    const hasil = bacaQris(teks);
    if (!hasil.crcSah) return setGalat('CRC kode tidak sah. Kode mungkin rusak atau bukan QRIS.');
    if (!hasil.nmid) return setGalat('NMID tidak terbaca pada kode ini.');
    setGalat(null);
    setQr(hasil);
    setData({ ...KOSONG, nama: hasil.namaMerchant });
    setLangkah(2);
  }

  function terimaSegel(teks) {
    if (!teks.startsWith('SASI1:')) return setGalat('Itu bukan kode segel SASI-QR.');
    setGalat(null);
    setSegelId(teks.slice(6));
  }

  async function daftar() {
    setSibuk(true);
    setGalat(null);
    try {
      const res = await fetch('/api/lapak', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ muatan: qr.muatan, segelId, ...data }),
      });
      const isi = await res.json();
      if (!res.ok) throw new Error(isi.galat || 'gagal mendaftar');
      setJadi(isi);
      onSelesai?.(); // segarkan salinan supaya lapak baru langsung bisa diverifikasi
    } catch (e) {
      setGalat(
        e.message === 'Failed to fetch'
          ? 'Pendaftaran memerlukan jaringan. Verifikasi tetap bisa dijalankan tanpa jaringan.'
          : e.message,
      );
    } finally {
      setSibuk(false);
    }
  }

  if (jadi) {
    return (
      <>
        <div className="keadaan sukses">
          <strong className="tegas">{jadi.nama} terdaftar.</strong>
          <div className="kecil" style={{ marginTop: 4 }}>
            Sejak sekarang, kode apa pun yang berbeda dari kode ini akan memicu
            aturan R4 di atas segel {jadi.segelId}.
          </div>
        </div>
        <div className="kartu">
          <table className="atribut">
            <tbody>
              <tr><td>NMID terikat</td><td>{jadi.nmid}</td></tr>
              <tr><td>Segel</td><td>{jadi.segelId}</td></tr>
              <tr><td>Cap muatan</td><td>{jadi.muatan.slice(-8)}</td></tr>
            </tbody>
          </table>
        </div>
        <button className="utama penuh" onClick={() => { setJadi(null); setQr(null); setSegelId(null); setLangkah(1); }}>
          Daftarkan lapak berikutnya
        </button>
      </>
    );
  }

  return (
    <>
      <span className="jejak-langkah">Langkah {langkah} dari 3</span>
      {galat && <div className="keadaan galat">{galat}</div>}

      {langkah === 1 && (
        <Pemindai
          key="daftar-qris"
          onKode={terimaQris}
          petunjuk="Pindai kode QRIS milik pedagang. Inilah kode yang akan menjadi pembanding."
        />
      )}

      {langkah === 2 && qr && (
        <>
          <div className="kartu rapat">
            <table className="atribut">
              <tbody>
                <tr><td>Nama pada kode</td><td>{qr.namaMerchant || '-'}</td></tr>
                <tr><td>NMID</td><td>{qr.nmid}</td></tr>
                <tr><td>Kota</td><td>{qr.kota || '-'}</td></tr>
              </tbody>
            </table>
          </div>
          <label>
            <span className="label">Nama yang dikenal pembeli</span>
            <input value={data.nama} onChange={(e) => setData({ ...data, nama: e.target.value })} />
          </label>
          <label>
            <span className="label">Alamat lapak</span>
            <input value={data.alamat} onChange={(e) => setData({ ...data, alamat: e.target.value })}
              placeholder="Blok C, Pasar Mardika" />
          </label>
          <label>
            <span className="label">Telepon pedagang</span>
            <input value={data.telepon} onChange={(e) => setData({ ...data, telepon: e.target.value })}
              placeholder="08xx" inputMode="tel" />
          </label>
          <button className="utama penuh" disabled={!data.nama} onClick={() => setLangkah(3)}>
            Lanjut pasang segel
          </button>
          <button className="sunyi penuh" onClick={() => { setQr(null); setLangkah(1); }}>Pindai ulang kode</button>
        </>
      )}

      {langkah === 3 && (
        <>
          {segelId ? (
            <div className="kartu">
              <span className="label">Segel terpindai</span>
              <div className="mono tegas" style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>{segelId}</div>
            </div>
          ) : (
            <Pemindai
              key="daftar-segel"
              onKode={terimaSegel}
              petunjuk="Pindai kode pada segel yang akan ditempel di lapak ini."
            />
          )}
          <button className="utama penuh" disabled={!segelId || sibuk} onClick={daftar}>
            {sibuk ? 'Menyimpan...' : 'Ikat kode ini ke segel'}
          </button>
          <button className="sunyi penuh" onClick={() => { setSegelId(null); setLangkah(2); }}>Kembali</button>
        </>
      )}
    </>
  );
}
