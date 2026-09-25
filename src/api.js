import { useEffect, useState, useCallback } from 'react';
import { pantauAliran } from './lib/aliran.js';

async function panggil(jalur, opsi = {}) {
  const res = await fetch(`/api${jalur}`, {
    headers: { 'content-type': 'application/json' },
    ...opsi,
    body: opsi.body ? JSON.stringify(opsi.body) : undefined,
  });
  const isi = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(isi.galat || `Galat ${res.status}`), { status: res.status, isi });
  return isi;
}

export const api = {
  keadaan: () => panggil('/keadaan'),
  rantai: () => panggil('/rantai'),
  aduan: (body) => panggil('/aduan', { method: 'POST', body }),
  lihatAduan: (id) => panggil(`/aduan/${encodeURIComponent(id)}`),
  putusAduan: (id, aksi, body) => panggil(`/aduan/${id}/${aksi}`, { method: 'POST', body }),
  peristiwa: (body) => panggil('/peristiwa', { method: 'POST', body }),
};

/** Keadaan bersama, disegarkan lewat server-sent events supaya kedua
 *  perangkat melihat skor dan aduan yang sama tanpa perlu memuat ulang. */
export function useKeadaan() {
  const [keadaan, setKeadaan] = useState(null);
  const [galat, setGalat] = useState(null);

  const segarkan = useCallback(() => {
    api.keadaan().then(setKeadaan).catch((e) => setGalat(e.message));
  }, []);

  useEffect(() => {
    segarkan();
    return pantauAliran(() => segarkan());
  }, [segarkan]);

  return { keadaan, galat, segarkan };
}

export const rupiah = (n) => 'Rp' + Number(n || 0).toLocaleString('id-ID');

export const waktu = (ts) =>
  new Date(ts).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Kabar meja kasir dari perangkat pembeli ke perangkat pedagang.
 *  Sengaja dibiarkan gagal diam-diam: bila jaringan mati, verifikasi tetap
 *  berjalan dan yang hilang hanya perpindahan layar otomatis di sisi pedagang. */
export const kabarkanSesi = (isi) => {
  fetch('/api/sesi', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(isi),
  }).catch(() => {});
};

export const bayar = (isi) => panggil('/pembayaran', { method: 'POST', body: isi });
export const lihatSesi = (segelId) => panggil(`/sesi/${encodeURIComponent(segelId)}`);
