// Cangkang bersama untuk ketiga pihak.
//
// Struktur, warna, dan huruf identik di perangkat pedagang, pembeli, dan
// petugas: kepala bergradasi biru, lalu isi, lalu navigasi bawah.
//
// Kepala besar yang membawa satu angka hanya muncul bila `angka` diberikan,
// yaitu di layar beranda. Di layar kerja (pindai, kode, aduan) kepala menyusut
// menjadi satu baris, supaya pemindai atau kode QR langsung terlihat tanpa
// menggulir.

export default function Cangkang({
  angka,          // angka besar di kepala, sudah dalam bentuk teks; kosong = kepala ringkas
  satuan,         // teks kecil di kiri angka, misalnya "Rp"
  keterangan,     // baris di bawah angka
  aksiKepala,     // tombol bulat di kanan atas
  cip = [],       // pita status, hanya untuk keadaan yang perlu diketahui
  nav = [],       // slot navigasi, salah satunya boleh bertanda utama
  tab,
  onTab,
  pihak,          // nama pihak yang sedang dipegang perangkat ini
  onGantiPihak,   // tanpa ini, perangkat terkunci selamanya pada satu pihak
  children,
}) {
  const besar = angka != null;
  return (
    <>
      <header className={besar ? 'kepala-dompet' : 'kepala-dompet ringkas'}>
        <div className="merek-baris">
          <div className="wordmark">SASI<span>-QR</span></div>
          {aksiKepala}
        </div>

        {besar && (
          <>
            <div className="saldo-baris">
              {satuan && <span className="saldo-mata-uang">{satuan}</span>}
              <span className="saldo-angka">{angka}</span>
            </div>
            {keterangan && <div className="kepala-keterangan">{keterangan}</div>}
          </>
        )}

        {cip.length > 0 && (
          <div className="cip-gulir">
            {cip.map((c, i) => <span className="cip-terang" key={i}>{c}</span>)}
          </div>
        )}
      </header>

      {children}

      {/* Perangkat sengaja terkunci pada satu pihak supaya demo tidak kacau,
          tetapi harus tetap ada jalan keluarnya. Diletakkan di ujung bawah isi
          agar tidak terpencet saat demo berjalan. */}
      {onGantiPihak && (
        <div className="kaki-ganti">
          <span className="sumber">Perangkat ini: {pihak}</span>
          <button className="sunyi kecil" onClick={onGantiPihak}>Ganti pihak</button>
        </div>
      )}

      {nav.length > 0 && (
        <nav className="nav-dompet">
          {nav.map((n) =>
            n.utama ? (
              <button
                key={n.kunci}
                className="tombol-pindai"
                aria-current={tab === n.kunci}
                aria-label={n.judul}
                onClick={() => onTab(n.kunci)}
              >
                <span className="lingkar">{n.ikon}</span>
                <span className="tulisan">{n.judul}</span>
              </button>
            ) : (
              <button key={n.kunci} aria-current={tab === n.kunci} onClick={() => onTab(n.kunci)}>
                {n.ikon}
                {n.judul}
              </button>
            ),
          )}
        </nav>
      )}
    </>
  );
}
