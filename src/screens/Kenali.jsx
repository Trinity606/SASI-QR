import { useState, useCallback } from 'react';
import Pemindai from '../components/Pemindai.jsx';
import LayarVerifikasi from '../components/LayarVerifikasi.jsx';
import { periksaLokal } from '../lib/salinan.js';
import { kabarkanSesi, bayar, rupiah, waktu } from '../api.js';
import { catatPembayaran, muatDompet } from '../lib/dompet.js';

// Tahap 2, Kenali. Alur dua pindai, putusan, lalu pembayaran simulasi.
//
// Dua hal dijaga ketat di layar ini:
//   1. Putusan dihitung sepenuhnya di perangkat, tanpa permintaan jaringan.
//   2. Kabar ke perangkat pedagang dikirim sebagai tembakan sekali jalan yang
//      boleh gagal. Kalau jaringan mati, verifikasi tetap utuh dan yang hilang
//      hanya perpindahan layar otomatis di meja pedagang.

export default function Kenali({ salinan, onAdukan }) {
  const [langkah, setLangkah] = useState('segel');
  const [segelId, setSegelId] = useState(null);
  const [hasil, setHasil] = useState(null);
  const [bayarkan, setBayarkan] = useState(false);
  const [struk, setStruk] = useState(null);

  const ulang = useCallback(() => {
    if (segelId) kabarkanSesi({ segelId, tahap: 'selesai' });
    setHasil(null);
    setBayarkan(false);
    setStruk(null);
    setSegelId(null);
    setLangkah('segel');
  }, [segelId]);

  const periksa = useCallback(
    (muatan, segel) => {
      const h = periksaLokal(salinan, { muatan, segelId: segel });
      setHasil(h);
      if (segel) {
        kabarkanSesi({
          segelId: segel,
          tahap: 'kode-dipindai',
          kodeAturan: h.aturan.kode,
          warna: h.aturan.warna,
        });
      }
    },
    [salinan],
  );

  function terimaSegel(teks) {
    if (teks.startsWith('SASI1:')) {
      const id = teks.slice(6);
      setSegelId(id);
      setLangkah('kode');
      // Pedagang berpindah sendiri ke halaman kode pembayaran.
      kabarkanSesi({ segelId: id, tahap: 'segel-dipindai' });
      return;
    }
    // Pengguna langsung mengarahkan kamera ke kode pembayaran. Jangan paksa
    // mundur, perlakukan sebagai pemindaian tanpa segel.
    setSegelId(null);
    periksa(teks, null);
  }

  const pedagang = salinan?.lapak ?? [];

  if (struk) return <Struk struk={struk} hasil={hasil} onSelesai={ulang} />;

  if (bayarkan && hasil) {
    return (
      <FormBayar
        hasil={hasil}
        segelId={segelId}
        onBatal={() => setBayarkan(false)}
        onSelesai={setStruk}
      />
    );
  }

  return (
    <>
      <div className="tumpuk">
        <div className="baris antara">
          <span className="jejak-langkah">
            {langkah === 'segel' ? 'Langkah 1 dari 2 · pindai segel' : 'Langkah 2 dari 2 · pindai kode'}
          </span>
          {segelId && <span className="cip">Segel {segelId}</span>}
        </div>

        {langkah === 'segel' ? (
          <>
            <Pemindai
              key="segel"
              onKode={terimaSegel}
              petunjuk="Arahkan kamera ke kode pada segel yang tertempel di lapak."
              contoh={pedagang
                .filter((l) => l.segelId)
                .map((l) => ({ label: `Segel ${l.nama}`, nilai: `SASI1:${l.segelId}` }))}
            />
            <button className="sunyi penuh" onClick={() => { setSegelId(null); setLangkah('kode'); }}>
              Lapak ini tidak punya segel, lewati
            </button>
          </>
        ) : (
          <>
            <Pemindai
              key="kode"
              onKode={(t) => periksa(t, segelId)}
              petunjuk="Arahkan kamera ke kode pembayaran QRIS."
              // Kamera masih mengarah ke segel saat layar ini muncul. Tanpa
              // penolakan ini, segel terbaca lagi sebagai kode pembayaran.
              tolak={(t) =>
                t.startsWith('SASI1:')
                  ? 'Itu kode segel, bukan kode pembayaran. Arahkan kamera ke stiker QRIS.'
                  : null
              }
              contoh={pedagang.map((l) => ({ label: `Kode terdaftar ${l.nama}`, nilai: l.muatan }))}
            />
            <button className="sunyi penuh" onClick={ulang}>
              Kembali ke pindai segel
            </button>
          </>
        )}
      </div>

      {hasil && (
        <LayarVerifikasi
          qr={hasil.qr}
          aturan={hasil.aturan}
          lapak={hasil.lapak}
          segelId={hasil.segelId}
          onTutup={ulang}
          onAdukan={() => onAdukan(hasil)}
          // Membayar hanya ditawarkan bila kodenya tidak merah.
          onBayar={hasil.aturan.warna === 'merah' ? undefined : () => setBayarkan(true)}
        />
      )}
    </>
  );
}

// ------------------------------------------------------------------- bayar

const CEPAT = [5000, 10000, 20000, 50000];

function FormBayar({ hasil, segelId, onBatal, onSelesai }) {
  const [nominal, setNominal] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState(null);
  const nama = hasil.lapak?.nama || hasil.qr.namaMerchant || 'Penerima';
  const n = Number(nominal || 0);
  const saldo = muatDompet().saldo;
  const kurang = n > saldo;

  async function kirim() {
    setSibuk(true);
    setGalat(null);
    try {
      const bukti = await bayar({
        segelId,
        nominal: n,
        kodeAturan: hasil.aturan.kode,
        nmid: hasil.qr.nmid,
        pembeli: 'Budi Santoso',
      });
      catatPembayaran({
        nominal: n, kepada: nama, kodeAturan: hasil.aturan.kode,
        ref: bukti.ref, waktu: bukti.waktu,
      });
      onSelesai(bukti);
    } catch (e) {
      setGalat(
        e.message === 'Failed to fetch'
          ? 'Pembayaran simulasi memerlukan jaringan. Verifikasi tadi tetap sah.'
          : e.message,
      );
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div className="tumpuk">
      <div className="kartu">
        <span className="label">Membayar kepada</span>
        <div className="nama-merchant" style={{ marginTop: 4 }}>{nama}</div>
        <div className="mono kecil redup">{hasil.qr.nmid}</div>
        <hr className="pisah" />
        <div className="baris antara">
          <span className="label">Hasil verifikasi</span>
          <span className={`lencana ${hasil.aturan.warna === 'hijau' ? 'sukses' : hasil.aturan.warna === 'kuning' ? 'peringatan' : 'abu'}`}>
            {hasil.aturan.kode}
          </span>
        </div>
      </div>

      <label>
        <span className="label">Nominal</span>
        <input
          type="number" inputMode="numeric" min="0" placeholder="0"
          value={nominal} onChange={(e) => setNominal(e.target.value)} autoFocus
        />
      </label>

      <div className="baris" style={{ flexWrap: 'wrap', gap: 'var(--s-xs)' }}>
        {CEPAT.map((v) => (
          <button key={v} className="kecil" onClick={() => setNominal(String(v))}>
            {rupiah(v)}
          </button>
        ))}
      </div>

      <div className="baris antara kecil redup">
        <span>Saldo simulasi</span>
        <span className="mono">{rupiah(saldo)}</span>
      </div>

      {galat && <div className="keadaan galat kecil">{galat}</div>}
      {kurang && <div className="keadaan peringatan kecil">Saldo simulasi tidak cukup.</div>}

      <button className="utama penuh" disabled={!(n > 0) || kurang || sibuk} onClick={kirim}>
        {sibuk ? 'Memproses...' : `Bayar ${rupiah(n)}`}
      </button>
      <button className="sunyi penuh" onClick={onBatal}>Batal</button>

      <p className="sumber" style={{ marginTop: 'var(--s-xs)' }}>
        Pembayaran ini simulasi. Tidak ada uang sungguhan yang berpindah, dan
        SASI-QR tidak terhubung ke penyelenggara pembayaran mana pun.
      </p>
    </div>
  );
}

function Struk({ struk, hasil, onSelesai }) {
  return (
    <div className="tumpuk">
      <div className="keadaan sukses">
        <strong className="tegas">Pembayaran terkirim</strong>
        <div className="kecil" style={{ marginTop: 4 }}>
          {rupiah(struk.nominal)} ke {hasil.lapak?.nama || hasil.qr.namaMerchant}.
          Pedagang menerima pemberitahuan di perangkatnya.
        </div>
      </div>

      <div className="kartu">
        <span className="label">Bukti</span>
        <table className="atribut" style={{ marginTop: 'var(--s-xs)' }}>
          <tbody>
            <tr><td>Nomor</td><td>{struk.ref}</td></tr>
            <tr><td>Waktu</td><td>{waktu(struk.waktu)}</td></tr>
            <tr><td>Aturan</td><td>{struk.kodeAturan}</td></tr>
            <tr><td>Blok rantai</td><td>#{struk.blok}</td></tr>
          </tbody>
        </table>
      </div>

      <button className="utama penuh" onClick={onSelesai}>Transaksi baru</button>
    </div>
  );
}
