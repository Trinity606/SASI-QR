import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

// Dua halaman ini tidak pernah dibuka pembeli maupun pedagang, jadi tidak ikut
// diunduh sampai alamatnya benar-benar dikunjungi.
const ContohVerifikasi = lazy(() => import('./screens/ContohVerifikasi.jsx'));
const Peraga = lazy(() => import('./screens/Peraga.jsx'));

// Satu alamat per pihak. Simpan alamatnya sebagai penanda di tiap perangkat,
// supaya saat demo tidak ada yang perlu memilih menu apa pun.
function pilih() {
  const p = location.pathname.replace(/\/+$/, '');
  if (p === '/verifikasi/contoh') return <ContohVerifikasi />;
  if (p === '/petugas') return <App pihakAwal="petugas" />;
  if (p === '/peraga') return <Peraga />;
  if (p === '/pedagang') return <App pihakAwal="pedagang" />;
  if (p === '/pembeli') return <App pihakAwal="pembeli" />;
  return <App />;
}

// Service Worker hanya didaftarkan pada HTTPS, yaitu keadaan yang dipakai di
// ponsel. Pada localhost ia justru berbahaya: pernah menyajikan modul basi
// setelah peladen dinyalakan ulang, sehingga perubahan kode tidak muncul dan
// yang terlihat adalah versi lama tanpa satu pun tanda peringatan.
//
// Kalau pernah terlanjur terdaftar di localhost, cabut sekarang juga.
if ('serviceWorker' in navigator) {
  if (location.protocol === 'https:') {
    navigator.serviceWorker
      .register('/sw.js')
      .then((r) => console.info('[SASI-QR] Service Worker aktif, cakupan', r.scope))
      .catch((e) => console.warn('[SASI-QR] Service Worker gagal didaftarkan:', e.message));
  } else {
    navigator.serviceWorker.getRegistrations().then((daftar) => {
      daftar.forEach((r) => r.unregister());
      if (daftar.length) {
        caches.keys().then((k) => k.forEach((n) => caches.delete(n)));
        console.info('[SASI-QR] Service Worker dicabut di localhost agar kode selalu segar.');
      }
    });
  }
}

createRoot(document.getElementById('akar')).render(
  <StrictMode>
    <Suspense fallback={<div className="app"><main className="lembar-isi"><p className="redup">Memuat...</p></main></div>}>
      {pilih()}
    </Suspense>
  </StrictMode>,
);
