import { useEffect, useState } from 'react';
import { kirimAduan, kirimAntrean, pantauAntrean } from '../lib/antrean.js';
import { pantauAliran } from '../lib/aliran.js';
import { api } from '../api.js';

// Tahap 3, Adukan.
//
// Satu ketuk yang menghasilkan dua akibat sekaligus, sesuai naskah panggung:
// peringatan bagi pemindai berikutnya lewat aturan R3, dan teks laporan siap
// kirim ke kanal resmi.

function teksResmi(hasil) {
  if (!hasil) return '';
  const { qr, aturan, lapak, segelId } = hasil;
  return [
    'LAPORAN DUGAAN PENYALAHGUNAAN KODE QRIS',
    '',
    `Waktu pemindaian : ${new Date().toLocaleString('id-ID')}`,
    `Kode aturan      : ${aturan.kode}`,
    `Keterangan       : ${aturan.pesan}`,
    '',
    `NMID pada kode   : ${qr.nmid || 'tidak terbaca'}`,
    `Nama pada kode   : ${qr.namaMerchant || 'tidak terbaca'}`,
    `Kota pada kode   : ${qr.kota || 'tidak terbaca'}`,
    `Jenis kode       : ${qr.jenisKode === '11' ? 'statis' : qr.jenisKode === '12' ? 'dinamis' : 'tidak terbaca'}`,
    `Cap muatan       : ${qr.muatan ? qr.muatan.slice(-8) : '-'}`,
    '',
    `Segel dipindai   : ${segelId || 'tidak ada'}`,
    `Lapak terdaftar  : ${lapak ? lapak.nama : 'tidak terdaftar'}`,
    `NMID terdaftar   : ${lapak ? lapak.nmid : '-'}`,
    '',
    'Dilaporkan melalui SASI-QR, purwarupa riset verifikasi QRIS.',
  ].join('\n');
}

export default function Adukan({ hasil, onSelesai }) {
  const [kronologi, setKronologi] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const [nomor, setNomor] = useState(null);
  const [diantre, setDiantre] = useState(false);
  const [galat, setGalat] = useState(null);
  const [disalin, setDisalin] = useState(false);
  const [antre, setAntre] = useState(0);

  useEffect(() => pantauAntrean(setAntre), []);

  const teks = teksResmi(hasil);

  // Kode yang rusak tidak punya NMID yang bisa diurai. Cap muatan, yaitu
  // delapan karakter terakhir muatannya, tetap menjadi pengenal yang sah dan
  // cukup bagi petugas untuk mencocokkan laporan ini dengan kode fisiknya.
  const capMuatan = hasil.qr.muatan ? hasil.qr.muatan.slice(-8) : '';
  const adaPengenal = Boolean(hasil.qr.nmid || capMuatan);

  async function kirim() {
    setSibuk(true);
    setGalat(null);
    const hasilKirim = await kirimAduan({
      nmid: hasil.qr.nmid,
      // Muatan yang gagal CRC tidak boleh dipercaya sama sekali, termasuk
      // penanda yang menyebut pemiliknya. Melekatkan aduan ke akun berdasarkan
      // muatan rusak berarti menghukum pedagang jujur yang stikernya tercoret.
      terlapor: hasil.qr.crcSah ? hasil.qr.akunSasi || null : null,
      pelapor: 'PEM-100',
      namaPadaKode: hasil.qr.namaMerchant,
      kodeAturan: hasil.aturan.kode,
      segelId: hasil.segelId,
      capMuatan,
      kronologi,
      dipindaiPada: Date.now(),
    });
    if (hasilKirim.galat) setGalat(hasilKirim.galat);
    else if (hasilKirim.antre) setDiantre(true);
    else setNomor(hasilKirim.id);
    setSibuk(false);
  }

  if (nomor || diantre) {
    return <MenungguPetugas nomor={nomor} diantre={diantre} onSelesai={onSelesai} />;
  }

  return (
    <div className="tumpuk">
      {antre > 0 && <AntreanKotak antre={antre} />}

      <div className="kartu rapat">
        <div className="baris antara">
          <span className="label">Kode aturan</span>
          <span className="mono tegas" style={{ fontWeight: 600, fontSize: 17 }}>{hasil.aturan.kode}</span>
        </div>
        <div className="baris antara" style={{ marginTop: 6 }}>
          <span className="label">{hasil.qr.nmid ? 'NMID diadukan' : 'Cap muatan diadukan'}</span>
          <span className="mono kecil tegas">{hasil.qr.nmid || capMuatan || 'tidak ada'}</span>
        </div>
        {!hasil.qr.nmid && capMuatan && (
          <p className="kecil redup" style={{ margin: '8px 0 0' }}>
            NMID tidak terbaca karena muatan kodenya rusak. Aduan tetap bisa
            dikirim memakai cap muatan sebagai pengenal.
          </p>
        )}
      </div>

      <label>
        <span className="label">Kronologi</span>
        <textarea
          rows={4}
          value={kronologi}
          onChange={(e) => setKronologi(e.target.value)}
          placeholder="Contoh: stiker terlihat baru dan menutupi stiker lama."
        />
      </label>
      <p className="kecil redup" style={{ margin: 0 }}>
        Aduan palsu juga tercatat permanen. Isi hanya bila Anda memang menemukan kejanggalan.
      </p>

      {galat && <div className="keadaan galat kecil">{galat}</div>}

      <button className="bahaya penuh" disabled={!kronologi || sibuk || !adaPengenal} onClick={kirim}>
        {sibuk ? 'Mengirim...' : 'Kirim aduan'}
      </button>
      {/* Tombol mati tanpa alasan adalah jalan buntu. Sebutkan syaratnya. */}
      {!sibuk && !kronologi && (
        <p className="kecil redup" style={{ margin: 0, textAlign: 'center' }}>
          Isi kronologi lebih dulu untuk mengaktifkan tombol.
        </p>
      )}
      {!sibuk && kronologi && !adaPengenal && (
        <p className="kecil" style={{ margin: 0, textAlign: 'center', color: 'var(--error)' }}>
          Kode ini tidak terbaca sama sekali, sehingga tidak ada pengenal yang
          bisa dilaporkan. Pindai ulang kodenya.
        </p>
      )}

      <hr className="pisah" />

      <span className="label">Teks untuk kanal resmi</span>
      <code className="muatan" style={{ whiteSpace: 'pre-wrap' }}>{teks}</code>
      <button
        className="penuh"
        onClick={() =>
          navigator.clipboard?.writeText(teks).then(
            () => { setDisalin(true); setTimeout(() => setDisalin(false), 2000); },
            () => {},
          )
        }
      >
        {disalin ? 'Tersalin' : 'Salin teks laporan'}
      </button>
    </div>
  );
}

function AntreanKotak({ antre }) {
  const [sibuk, setSibuk] = useState(false);
  return (
    <div className="keadaan peringatan baris antara">
      <span>{antre} aduan menunggu kirim.</span>
      <button
        className="kecil"
        disabled={sibuk}
        onClick={async () => { setSibuk(true); await kirimAntrean(); setSibuk(false); }}
      >
        {sibuk ? 'Mengirim...' : 'Kirim sekarang'}
      </button>
    </div>
  );
}


/**
 * Layar tunggu pembeli setelah mengadu.
 *
 * Inilah yang membuat pemisahan perangkat terlihat saat demo. Pembeli tidak
 * sekadar diberi tahu "aduan terkirim", melainkan melihat putusan petugas
 * mendarat di layarnya sendiri, dari perangkat lain, tanpa memuat ulang.
 */
function MenungguPetugas({ nomor, diantre, onSelesai }) {
  const [status, setStatus] = useState(diantre ? 'antre' : 'baru');
  const [petugas, setPetugas] = useState(null);

  useEffect(() => {
    if (!nomor) return;
    let hidup = true;

    const periksa = async () => {
      try {
        const a = await api.lihatAduan(nomor);
        if (!hidup) return;
        setStatus(a.status);
        setPetugas(a.petugas ?? null);
      } catch {
        // Jaringan putus. Status terakhir tetap ditampilkan.
      }
    };

    periksa();
    return pantauAliran(periksa);
  }, [nomor]);

  if (diantre) {
    return (
      <div className="tumpuk">
        <div className="keadaan peringatan">
          Jaringan tidak tersedia. Aduan tersimpan di perangkat dan akan dikirim
          sendiri begitu jaringan kembali.
        </div>
        <button className="utama penuh" onClick={onSelesai}>Selesai</button>
      </div>
    );
  }

  const selesai = status === 'terkonfirmasi' || status === 'ditolak';

  return (
    <div className="tumpuk">
      <div className={`keadaan ${status === 'terkonfirmasi' ? 'galat' : status === 'ditolak' ? 'sukses' : 'peringatan'}`}>
        <div className="baris antara">
          <strong className="tegas">
            {status === 'terkonfirmasi' ? 'Petugas mengonfirmasi penipuan'
              : status === 'ditolak' ? 'Petugas menolak aduan'
              : 'Terkirim ke meja petugas'}
          </strong>
          <span className="mono kecil">{nomor}</span>
        </div>
        <div className="kecil" style={{ marginTop: 6 }}>
          {status === 'terkonfirmasi'
            ? `Diputus oleh ${petugas ?? 'petugas'}. Kode ini kini merah bagi setiap pemindai berikutnya.`
            : status === 'ditolak'
            ? `Diputus oleh ${petugas ?? 'petugas'}. Tidak ditemukan bukti penipuan.`
            : 'Menunggu putusan petugas di perangkat terpisah.'}
        </div>
      </div>

      {/* Jejak tiga langkah, supaya penonton demo melihat aduan berpindah
          perangkat, bukan sekadar hilang setelah tombol ditekan. */}
      <div className="kartu">
        <span className="label">Perjalanan aduan</span>
        <ol className="langkah-aduan">
          <li className="jadi">
            <strong className="tegas">Pembeli</strong> mengirim aduan
          </li>
          <li className={selesai ? 'jadi' : 'menunggu'}>
            <strong className="tegas">Petugas</strong> memeriksa di perangkat terpisah
            {!selesai && <span className="denyut" />}
          </li>
          <li className={status === 'terkonfirmasi' ? 'jadi' : ''}>
            NMID masuk aturan <span className="mono">R3</span>, pemindai berikutnya melihat merah
          </li>
        </ol>
      </div>

      <button className="utama penuh" onClick={onSelesai}>
        {selesai ? 'Selesai' : 'Tutup, biarkan petugas memeriksa'}
      </button>
    </div>
  );
}
