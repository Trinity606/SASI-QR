// Layar verifikasi, komponen paling menentukan di seluruh purwarupa.
//
// Susunan informasinya mengikuti DESIGN.md 6.5 apa adanya: pita keadaan di
// tepi atas, nama merchant, NMID mono, jenis kode, lalu kode aturan
// berdampingan dengan status. Yang berbeda dari spesifikasi hanya wadahnya,
// yaitu lembar yang naik dari bawah, bukan kartu di tengah halaman.
//
// Kode aturan sengaja dibuat 30 px. Catatan panggung memerintahkan pembicara
// menyebut A01 dan E04 dengan suara saat demo berjalan, jadi kodenya harus
// terbaca dari kursi juri, bukan sekadar ada.

const WARNA = { hijau: 'hijau', kuning: 'kuning', merah: 'merah', abu: 'abu' };

const STATUS = {
  A01: 'Aman dibayar',
  W01: 'Periksa dulu',
  E01: 'Jangan bayar',
  E02: 'Jangan bayar',
  E03: 'Jangan bayar',
  E04: 'Jangan bayar',
  E05: 'Belum terverifikasi',
  N01: 'Tidak diverifikasi',
  N02: 'Belum terdaftar',
};

const inisial = (nama) =>
  (nama || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export default function LayarVerifikasi({ qr, aturan, lapak, segelId, onTutup, onAdukan, onBayar, sematkan = false }) {
  const w = WARNA[aturan.warna] ?? 'abu';

  // Nama yang ditampilkan besar harus selalu menjawab "uang ini ke siapa",
  // yaitu pemilik kode yang BARU SAJA dipindai. Memakai nama lapak tersegel di
  // sini akan berbahaya pada aturan R4: kode milik orang lain akan tampil
  // dengan nama pedagang yang jujur, dan pengguna justru merasa aman.
  const nmidCocok = Boolean(lapak) && qr.nmid === lapak.nmid;
  const nama = nmidCocok
    ? lapak.namaTampil || lapak.nama
    : qr.namaMerchant || 'Penerima tidak dikenal';

  const isi = (
    <>
      <div className={`pita-keadaan ${w}`} />
      {!sematkan && <div className="pegangan" />}

      <div className="verif-isi">
        <div className="baris" style={{ marginBottom: 'var(--s-base)' }}>
          <div className={`awal ${w}`}>{inisial(nama)}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="nama-merchant">{nama}</div>
            <div className="mono kecil redup" style={{ marginTop: 2 }}>
              {qr.nmid || 'NMID tidak terbaca'}
            </div>
          </div>
        </div>

        {/* Blok putusan. Kode aturan dan status berdampingan, sesuai 6.5. */}
        <div className={`blok-putusan ${w}`}>
          <div className={`kode-aturan ${w}`}>{aturan.kode}</div>
          <div style={{ minWidth: 0 }}>
            <div className="status-putusan">{STATUS[aturan.kode] ?? 'Diperiksa'}</div>
            <div className="kecil" style={{ color: 'var(--body)', marginTop: 2 }}>{aturan.pesan}</div>
          </div>
        </div>

        {lapak && !nmidCocok && (
          <div className="pembanding">
            <div className="pembanding-baris">
              <span className="label">Segel di lapak ini</span>
              <span className="tegas">{lapak.namaTampil || lapak.nama}</span>
              <span className="mono kecil redup">{lapak.nmid}</span>
            </div>
            <div className="pembanding-panah">berbeda dari</div>
            <div className="pembanding-baris bahaya">
              <span className="label">Kode yang Anda pindai</span>
              <span className="tegas">{qr.namaMerchant || 'tidak terbaca'}</span>
              <span className="mono kecil redup">{qr.nmid || '-'}</span>
            </div>
          </div>
        )}

        {/* Pembeli cukup tahu boleh bayar atau tidak. Data teknis tetap ada
            untuk yang ingin memeriksa, tetapi terlipat. Versi tersemat
            (tangkapan slide) dibiarkan terbuka. */}
        <details className="rincian" open={sematkan}>
          <summary>Rincian teknis</summary>
          <div className="baris" style={{ gap: 'var(--s-xs)', margin: 'var(--s-xs) 0', flexWrap: 'wrap' }}>
            <span className="cip">
              {qr.jenisKode === '11' ? 'Kode statis' : qr.jenisKode === '12' ? 'Kode dinamis' : 'Jenis tidak terbaca'}
            </span>
            <span className="cip">{segelId ? `Segel ${segelId}` : 'Tanpa segel'}</span>
            <span className="cip">{qr.crcSah ? 'CRC sah' : 'CRC gagal'}</span>
          </div>
          <table className="atribut">
            <tbody>
              <Baris k="Nama pada kode" v={qr.namaMerchant || '-'} />
              <Baris k="Kota" v={qr.kota || '-'} />
              {nmidCocok && <Baris k="NMID terdaftar" v={lapak.nmid} />}
              {nmidCocok && (
                <Baris k="Cap muatan" v={qr.muatan === lapak.muatan ? 'cocok' : 'berbeda'} />
              )}
              <Baris k="Cap kode dipindai" v={qr.muatan ? qr.muatan.slice(-8) : '-'} />
            </tbody>
          </table>
        </details>

        {!sematkan && (
          <div className="tumpuk" style={{ marginTop: 'var(--s-base)' }}>
            {w === 'merah' ? (
              <>
                <button className="bahaya penuh" onClick={onAdukan}>
                  Adukan kode ini
                </button>
                <button className="sunyi penuh" onClick={onTutup}>
                  Tutup
                </button>
              </>
            ) : (
              <>
                {onBayar ? (
                  <button className="utama penuh" onClick={onBayar}>
                    {w === 'hijau' ? 'Bayar sekarang' : 'Tetap bayar'}
                  </button>
                ) : (
                  <button className="utama penuh" onClick={onTutup}>Mengerti</button>
                )}
                {w !== 'hijau' && (
                  <button className="sunyi penuh" onClick={onAdukan}>
                    Ada yang mencurigakan, adukan
                  </button>
                )}
                {onBayar && <button className="sunyi penuh" onClick={onTutup}>Batal</button>}
              </>
            )}
          </div>
        )}
      </div>
    </>
  );

  if (sematkan) return <div className="bingkai-ponsel">{isi}</div>;

  return (
    <div className="tirai" onClick={(e) => e.target === e.currentTarget && onTutup()}>
      <div className="lembar" role="dialog" aria-label={`Hasil verifikasi ${aturan.kode}`}>
        {isi}
      </div>
    </div>
  );
}

const Baris = ({ k, v }) => (
  <tr>
    <td>{k}</td>
    <td>{v}</td>
  </tr>
);
