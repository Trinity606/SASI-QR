// Service Worker SASI-QR.
//
// Tugasnya satu: menyimpan cangkang aplikasi supaya /kenali tetap terbuka
// ketika tidak ada jaringan sama sekali. Data lapak TIDAK disimpan di sini,
// melainkan di localStorage lewat src/lib/salinan.js, karena data itu perlu
// dibaca dan diperbarui oleh kode aplikasi, bukan sekadar disajikan ulang.

const CACHE = 'sasi-cangkang-v1';

// Jaringan dulu, simpanan sebagai cadangan. Dipilih supaya pembaruan aplikasi
// langsung terpakai saat daring, dan aplikasi tetap terbuka saat luring.
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((k) => Promise.all(k.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Permintaan API tidak pernah disimpan. Data basi lebih berbahaya daripada
  // tidak ada data, karena daftar NMID yang diadukan harus selalu mutakhir.
  if (url.pathname.startsWith('/api/')) return;

  e.respondWith(
    fetch(request)
      .then((res) => {
        const salinan = res.clone();
        caches.open(CACHE).then((c) => c.put(request, salinan)).catch(() => {});
        return res;
      })
      .catch(async () => {
        const tersimpan = await caches.match(request);
        if (tersimpan) return tersimpan;
        // Navigasi ke alamat mana pun jatuh ke cangkang, karena perutean
        // ditangani di sisi klien.
        if (request.mode === 'navigate') return caches.match('/');
        return Response.error();
      }),
  );
});
