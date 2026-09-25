// Salinan pangkalan lapak di perangkat, dan mesin putusan sisi klien.
//
// Inilah yang memenuhi Laporan Subbab 4.3.1: seluruh pengambilan keputusan
// terjadi di lapis klien, sehingga putusan tetap dihasilkan meskipun jaringan
// tidak tersedia. Peladen hanya menyimpan dan menyajikan.
//
// ponytail: salinan 30 lapak berukuran di bawah 8 KB, jadi localStorage sudah
// cukup dan tidak perlu IndexedDB. Pindahkan ke IndexedDB bila cakupan naik ke
// ribuan lapak dan ukurannya melewati kuota 5 MB.

import { bacaQris, evaluasiAturan } from './emv.js';

const KUNCI = 'sasi.salinan.v1';

/** Baca salinan dari perangkat. Mengembalikan null bila belum pernah ada. */
export function salinanTersimpan() {
  try {
    const s = localStorage.getItem(KUNCI);
    return s ? JSON.parse(s) : null;
  } catch {
    return null; // mode penyamaran atau penyimpanan diblokir
  }
}

function simpan(salinan) {
  try {
    localStorage.setItem(KUNCI, JSON.stringify(salinan));
  } catch {
    // Penyimpanan penuh atau diblokir. Verifikasi tetap jalan selama sesi ini.
  }
}

/**
 * Ambil salinan terbaru dari peladen lalu simpan. Bila jaringan tidak ada,
 * kembalikan salinan lama. Verifikasi tidak pernah menunggu fungsi ini.
 */
export async function segarkanSalinan() {
  const lama = salinanTersimpan();
  try {
    const res = await fetch('/api/salinan');
    if (!res.ok) throw new Error(String(res.status));
    const baru = await res.json();
    simpan(baru);
    return baru;
  } catch {
    return lama;
  }
}

export const cariLapakSegel = (salinan, segelId) =>
  segelId ? (salinan?.lapak ?? []).find((l) => l.segelId === segelId) ?? null : null;

/**
 * Putusan lengkap untuk satu pemindaian, dihitung sepenuhnya di perangkat.
 * Tidak ada permintaan jaringan di dalam fungsi ini, dan itu disengaja.
 */
export function periksaLokal(salinan, { muatan, segelId = null }) {
  const qr = bacaQris(muatan || '');
  const lapak = cariLapakSegel(salinan, segelId);
  const aturan = evaluasiAturan({
    qr,
    lapak,
    nmidDiadukan: salinan?.nmidDiadukan ?? [],
    segelDipindai: Boolean(segelId),
  });
  return { qr, lapak, aturan, segelId };
}
