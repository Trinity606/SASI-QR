import { useEffect, useRef, useState } from 'react';

// Pemindai kode. Memakai BarcodeDetector bawaan peramban bila tersedia, dan
// jatuh ke jsQR bila tidak. Selalu menyediakan jalur manual, karena demo di
// laptop tanpa kamera harus tetap bisa dijalankan.
//
// Catatan lapangan: getUserMedia hanya bekerja pada localhost atau HTTPS.
// Di ponsel lewat alamat IP biasa, kamera akan ditolak peramban.

export default function Pemindai({ onKode, petunjuk, contoh = [], jeda = 1500, tolak = null }) {
  const videoRef = useRef(null);
  const [galat, setGalat] = useState(null);
  const [manual, setManual] = useState('');
  const [aktif, setAktif] = useState(true);
  // Jeda setelah pemindai dipasang. Tanpa ini, kamera yang masih mengarah ke
  // kode sebelumnya langsung membacanya lagi, dan pengguna tidak pernah sempat
  // memindahkan ponsel ke kode berikutnya.
  const [siap, setSiap] = useState(jeda === 0);
  const [salahKode, setSalahKode] = useState(null);

  useEffect(() => {
    if (jeda === 0) return setSiap(true);
    setSiap(false);
    const t = setTimeout(() => setSiap(true), jeda);
    return () => clearTimeout(t);
  }, [jeda, aktif]);

  const siapRef = useRef(siap);
  const tolakRef = useRef(tolak);
  useEffect(() => { siapRef.current = siap; }, [siap]);
  useEffect(() => { tolakRef.current = tolak; }, [tolak]);

  useEffect(() => {
    if (!aktif) return;
    let arus = null;
    let berhenti = false;
    let rafId = null;

    (async () => {
      try {
        // Peramban hanya mengizinkan kamera pada konteks aman. Di alamat
        // http:// biasa, navigator.mediaDevices bahkan tidak ada, sehingga
        // galatnya menyesatkan bila tidak diperiksa lebih dulu.
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
          setGalat('KONTEKS_TIDAK_AMAN');
          return;
        }
        arus = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (berhenti) return arus.getTracks().forEach((t) => t.stop());
        const v = videoRef.current;
        if (!v) return;
        v.srcObject = arus;
        await v.play();

        const detector =
          'BarcodeDetector' in window ? new window.BarcodeDetector({ formats: ['qr_code'] }) : null;
        // jsQR hanya diunduh pada peramban yang belum punya BarcodeDetector.
        // Pada Android Chrome modern, berkas ini tidak pernah diambil.
        const jsQR = detector ? null : (await import('jsqr')).default;
        const kanvas = document.createElement('canvas');
        const ctx = kanvas.getContext('2d', { willReadFrequently: true });

        const putar = async () => {
          if (berhenti || !v.videoWidth) {
            rafId = requestAnimationFrame(putar);
            return;
          }
          let teks = null;
          try {
            if (detector) {
              const hasil = await detector.detect(v);
              teks = hasil[0]?.rawValue ?? null;
            } else {
              kanvas.width = v.videoWidth;
              kanvas.height = v.videoHeight;
              ctx.drawImage(v, 0, 0);
              const data = ctx.getImageData(0, 0, kanvas.width, kanvas.height);
              teks = jsQR(data.data, data.width, data.height)?.data ?? null;
            }
          } catch {
            // Bingkai gagal dibaca. Lanjut ke bingkai berikutnya.
          }
          if (teks) {
            // Selama jeda, kode diabaikan diam-diam. Kamera tetap menyala
            // supaya pengguna melihat bahwa alat ini sedang bersiap.
            if (!siapRef.current) {
              rafId = requestAnimationFrame(putar);
              return;
            }
            const alasan = tolakRef.current?.(teks);
            if (alasan) {
              setSalahKode(alasan);
              rafId = requestAnimationFrame(putar);
              return;
            }
            berhenti = true;
            arus.getTracks().forEach((t) => t.stop());
            onKode(teks);
            return;
          }
          rafId = requestAnimationFrame(putar);
        };
        putar();
      } catch (e) {
        if (e.name === 'NotAllowedError') setGalat('DITOLAK');
        else if (e.name === 'NotFoundError') setGalat('TIDAK_ADA_KAMERA');
        else setGalat('LAIN');
      }
    })();

    return () => {
      berhenti = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (arus) arus.getTracks().forEach((t) => t.stop());
    };
  }, [aktif, onKode]);

  return (
    <div className="tumpuk">
      {petunjuk && <p className="kecil redup">{petunjuk}</p>}

      {!galat && (
        <div className="kamera-penuh">
          <video ref={videoRef} playsInline muted />
          <div className="bidik">
            <div className={`bidik-kotak ${siap ? '' : 'bersiap'}`}><i /><i /><i /><i /></div>
          </div>
          {!siap && <div className="lapis-bersiap">Bersiap... arahkan ke kode berikutnya</div>}
        </div>
      )}

      {galat && <PesanGalat sebab={galat} />}
      {/* Tampil juga saat kamera bergalat, karena justru pada keadaan itu
          pengguna memakai masukan manual dan tetap perlu tahu kodenya salah. */}
      {salahKode && <div className="keadaan galat kecil">{salahKode}</div>}

      <hr className="pisah" />

      <label>
        <span className="label">Masukan manual</span>
        <textarea
          rows={3}
          value={manual}
          placeholder="Tempel muatan QRIS atau kode segel di sini"
          onChange={(e) => setManual(e.target.value.trim())}
        />
      </label>
      <button
        className="penuh"
        disabled={!manual}
        onClick={() => {
          // Masukan manual diperiksa dengan aturan yang sama dengan kamera,
          // supaya pesan salahnya konsisten dari jalur mana pun.
          const alasan = tolak?.(manual);
          if (alasan) return setSalahKode(alasan);
          setSalahKode(null);
          onKode(manual);
        }}
      >
        Gunakan kode ini
      </button>

      {contoh.length > 0 && (
        <>
          <hr className="pisah" />
          <span className="label">Pintasan demo</span>
          {contoh.map((c) => (
            <button key={c.label} className="penuh kecil" onClick={() => onKode(c.nilai)}>
              {c.label}
            </button>
          ))}
        </>
      )}

      {galat && (
        <button className="kecil" onClick={() => { setGalat(null); setAktif(false); setTimeout(() => setAktif(true), 50); }}>
          Coba nyalakan kamera lagi
        </button>
      )}
    </div>
  );
}


/** Pesan galat kamera yang menyebut sebabnya, bukan sekadar "tidak tersedia".
 *  Pengguna harus tahu apakah ini masalah izin, alamat, atau perangkat. */
function PesanGalat({ sebab }) {
  if (sebab === 'KONTEKS_TIDAK_AMAN') {
    return (
      <div className="keadaan peringatan kecil">
        <strong className="tegas">Kamera diblokir oleh peramban, bukan oleh aplikasi ini.</strong>
        <p style={{ margin: '6px 0 0' }}>
          Alamat <span className="mono">{location.origin}</span> memakai <span className="mono">http</span>,
          dan peramban hanya mengizinkan kamera pada <span className="mono">https</span> atau
          <span className="mono"> localhost</span>.
        </p>
        <p style={{ margin: '6px 0 0' }}>
          Jalankan peladen dengan <span className="mono">npm run dev:https</span>, lalu buka alamat
          <span className="mono"> https://</span> yang muncul di terminal. Atau pakai pintasan demo di bawah.
        </p>
      </div>
    );
  }
  if (sebab === 'DITOLAK') {
    return (
      <div className="keadaan peringatan kecil">
        <strong className="tegas">Izin kamera ditolak.</strong>
        <p style={{ margin: '6px 0 0' }}>
          Buka pengaturan situs di peramban, izinkan kamera untuk alamat ini, lalu muat ulang halaman.
        </p>
      </div>
    );
  }
  if (sebab === 'TIDAK_ADA_KAMERA') {
    return <div className="keadaan peringatan kecil">Perangkat ini tidak punya kamera. Pakai masukan manual di bawah.</div>;
  }
  return <div className="keadaan peringatan kecil">Kamera gagal dinyalakan. Pakai masukan manual di bawah.</div>;
}
