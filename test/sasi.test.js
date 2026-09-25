// Satu berkas uji untuk tiga hal yang kalau rusak, sistemnya bohong:
// pengurai kode, mesin skor, dan keutuhan rantai.
// Jalankan: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rmSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

import { bacaQris, bangunQris, crcSah, urai, evaluasiAturan } from '../src/lib/emv.js';
import { hitungSkor, pita, putusan, SKOR_AWAL, KARANTINA_PLAFON } from '../src/lib/score.js';
import { Rantai } from '../src/lib/chain.js';

const HARI = 86400000;
const berkasSementara = () => join(tmpdir(), `sasi-${randomUUID()}.json`);

// --------------------------------------------------------------- pengurai QR

test('muatan yang dibangun dapat diurai kembali dan CRC-nya sah', () => {
  const m = bangunQris({ nmid: 'ID1024567890123', nama: 'WARUNG MAMA ANI', kota: 'AMBON', akunSasi: 'WRG-001' });
  assert.ok(crcSah(m), 'CRC harus sah');
  const qr = bacaQris(m);
  assert.equal(qr.nmid, 'ID1024567890123');
  assert.equal(qr.namaMerchant, 'WARUNG MAMA ANI');
  assert.equal(qr.akunSasi, 'WRG-001');
  assert.equal(qr.jenisKode, '11');
  assert.equal(qr.negara, 'ID');
  assert.equal(qr.mataUang, '360');
});

test('satu karakter berubah membuat CRC gagal, dan aturan R1 menangkapnya', () => {
  const m = bangunQris({ nmid: 'ID1024567890123', nama: 'WARUNG MAMA ANI', kota: 'AMBON', akunSasi: 'WRG-001' });
  const rusak = m.slice(0, 20) + (m[20] === '9' ? '8' : '9') + m.slice(21);
  assert.equal(crcSah(rusak), false);
  assert.equal(evaluasiAturan({ qr: bacaQris(rusak), lapak: null }).kode, 'E01');
});

test('panjang nilai yang tidak konsisten berhenti dengan aman, bukan melempar galat', () => {
  assert.doesNotThrow(() => urai('0002010102119926TERPOTONG'));
});

test('R4 menangkap kode yang ditukar tanpa perlu mengenal kode palsunya', () => {
  const asli = bangunQris({ nmid: 'ID1024567890123', nama: 'WARUNG MAMA ANI', kota: 'AMBON', akunSasi: 'WRG-001' });
  const palsu = bangunQris({ nmid: 'ID9988776655443', nama: 'KIOS CEPAT UNTUNG', kota: 'AMBON', akunSasi: 'KIO-003' });
  const lapak = { nmid: 'ID1024567890123', muatan: asli };

  assert.equal(evaluasiAturan({ qr: bacaQris(asli), lapak }).kode, 'A01');
  assert.equal(evaluasiAturan({ qr: bacaQris(palsu), lapak }).kode, 'E04');
});

test('W01 muncul saat NMID cocok tetapi muatan berubah', () => {
  const lama = bangunQris({ nmid: 'ID1024567890123', nama: 'WARUNG MAMA ANI', kota: 'AMBON', akunSasi: 'WRG-001' });
  const baru = bangunQris({ nmid: 'ID1024567890123', nama: 'WARUNG MAMA ANI', kota: 'AMBON', akunSasi: 'WRG-001', ref: 'X1' });
  assert.equal(evaluasiAturan({ qr: bacaQris(baru), lapak: { nmid: 'ID1024567890123', muatan: lama } }).kode, 'W01');
});

// ------------------------------------------------------------------ skor

test('akun tanpa peristiwa memakai skor awal dan masuk pita Aman', () => {
  const { skor } = hitungSkor([], Date.now());
  assert.equal(skor, SKOR_AWAL);
  assert.equal(pita(skor).kode, 'AMAN');
});

test('jatah harian membatasi transaksi bersih pada +5 per hari', () => {
  const t = Date.UTC(2026, 0, 15, 3);
  const ev = Array.from({ length: 12 }, (_, i) => ({ type: 'TRANSAKSI_BERSIH', ts: t + i * 1000 }));
  const { skor } = hitungSkor(ev, t + 60_000);
  assert.equal(skor, SKOR_AWAL + 5, '12 transaksi dalam satu hari tetap hanya bernilai +5');
});

test('jatah bulanan membatasi transaksi bersih pada +20 per bulan', () => {
  const ev = [];
  for (let h = 0; h < 20; h++) {
    for (let n = 0; n < 4; n++) ev.push({ type: 'TRANSAKSI_BERSIH', ts: Date.UTC(2026, 0, 1 + h, 3, n) });
  }
  const { skor } = hitungSkor(ev, Date.UTC(2026, 0, 21));
  assert.equal(skor, SKOR_AWAL + 20);
});

test('peristiwa sekali pakai tidak bisa dihitung dua kali', () => {
  const t = Date.now() - HARI;
  const sekali = hitungSkor([{ type: 'SEGEL_TERPASANG', ts: t }], t + 1000).skor;
  const dua = hitungSkor(
    [{ type: 'SEGEL_TERPASANG', ts: t }, { type: 'SEGEL_TERPASANG', ts: t + 500 }],
    t + 1000,
  ).skor;
  assert.equal(sekali, SKOR_AWAL + 10);
  assert.equal(dua, sekali);
});

test('penipuan terkonfirmasi menjatuhkan skor ke pita Diblokir', () => {
  const t = Date.now() - 5 * HARI;
  const { skor } = hitungSkor([{ type: 'PENIPUAN_TERKONFIRMASI', ts: t }], t + HARI);
  assert.equal(skor, 20);
  assert.equal(pita(skor).kode, 'DIBLOKIR');
  assert.equal(pita(skor).tindakan, 'blokir');
});

test('karantina menahan pemulihan di bawah 50 walau transaksi bersih menumpuk', () => {
  const mulai = Date.UTC(2026, 0, 1);
  const ev = [{ type: 'PENIPUAN_TERKONFIRMASI', ts: mulai }];
  for (let h = 1; h <= 60; h++) {
    for (let n = 0; n < 5; n++) ev.push({ type: 'TRANSAKSI_BERSIH', ts: mulai + h * HARI + n * 1000 });
  }
  const { skor, karantinaSampai } = hitungSkor(ev, mulai + 61 * HARI);
  assert.ok(skor <= KARANTINA_PLAFON, `skor ${skor} harus tertahan di ${KARANTINA_PLAFON} selama karantina`);
  assert.ok(karantinaSampai > mulai);
});

test('kode merah mengalahkan skor bagus', () => {
  const p = putusan({ skor: 100, kodeAturan: 'E04', nominal: 50_000 });
  assert.equal(p.tindakan, 'blokir');
});

test('pita Waspada meminta konfirmasi, dan memblokir nominal di atas batas', () => {
  assert.equal(putusan({ skor: 40, kodeAturan: 'A01', nominal: 50_000 }).tindakan, 'konfirmasi');
  assert.equal(putusan({ skor: 40, kodeAturan: 'A01', nominal: 250_000 }).tindakan, 'blokir');
});

test('batas pita tepat pada 50 dan 25', () => {
  assert.equal(pita(50).tindakan, 'lanjut');
  assert.equal(pita(49).tindakan, 'konfirmasi');
  assert.equal(pita(25).tindakan, 'konfirmasi');
  assert.equal(pita(24).tindakan, 'blokir');
});

// ------------------------------------------------------------------ rantai

test('rantai yang utuh lolos verifikasi', () => {
  const f = berkasSementara();
  try {
    const r = new Rantai(f);
    r.tambah({ type: 'TRANSFER', akun: 'WRG-001', nominal: 15_000 });
    r.tambah({ type: 'TRANSAKSI_BERSIH', akun: 'WRG-001' });
    assert.equal(r.verifikasi().sah, true);
    assert.equal(r.blok.length, 3); // termasuk blok asal
  } finally {
    rmSync(f, { force: true });
  }
});

test('menyunting catatan lama langsung ketahuan', () => {
  const f = berkasSementara();
  try {
    const r = new Rantai(f);
    r.tambah({ type: 'PENIPUAN_TERKONFIRMASI', akun: 'KIO-003' });
    r.tambah({ type: 'TRANSFER', akun: 'WRG-001', nominal: 10_000 });

    // Pelaku menghapus catatan penipuannya dari berkas.
    const isi = JSON.parse(JSON.stringify(r.blok));
    isi[1].peristiwa[0].type = 'TRANSAKSI_BERSIH';
    writeFileSync(f, JSON.stringify(isi));

    const hasil = new Rantai(f).verifikasi();
    assert.equal(hasil.sah, false);
    assert.equal(hasil.rusakPada, 1);
  } finally {
    rmSync(f, { force: true });
  }
});

test('skor dihitung ulang dari rantai, bukan dari kolom yang bisa diubah', () => {
  const f = berkasSementara();
  try {
    const r = new Rantai(f);
    r.tambah({ type: 'AKUN_DIBUAT', akun: 'X', ts: Date.now() - 3 * HARI });
    r.tambah({ type: 'PENIPUAN_TERKONFIRMASI', akun: 'X', ts: Date.now() - 2 * HARI });
    const { skor } = hitungSkor(r.peristiwaAkun('X'));
    assert.equal(pita(skor).kode, 'DIBLOKIR');
  } finally {
    rmSync(f, { force: true });
  }
});

test('menganggur bertahun-tahun tidak menaikkan skor melewati skor awal', () => {
  const t = Date.now() - 900 * HARI;
  const { skor } = hitungSkor([{ type: 'AKUN_DIBUAT', ts: t }], Date.now());
  assert.equal(skor, SKOR_AWAL, 'diam memulihkan, bukan membangun kepercayaan');
});

test('pemulihan pasif mengangkat akun yang terhukum, sampai batas skor awal', () => {
  const t = Date.UTC(2026, 0, 1);
  const { skor } = hitungSkor([{ type: 'SEGEL_HILANG', ts: t }], t + 400 * HARI);
  assert.equal(skor, SKOR_AWAL);
});

test('E05 aktif saat segel dipindai tetapi pengenalnya tidak terdaftar', () => {
  const m = bangunQris({ nmid: 'ID1024567890123', nama: 'WARUNG MAMA ANI', kota: 'AMBON', akunSasi: 'WRG-001' });
  // Segel cetakan pelaku: dipindai, tetapi tidak ada rekamannya.
  assert.equal(evaluasiAturan({ qr: bacaQris(m), lapak: null, segelDipindai: true }).kode, 'E05');
  // Pengguna yang sengaja melewati langkah segel tidak boleh kena E05.
  assert.equal(evaluasiAturan({ qr: bacaQris(m), lapak: null, segelDipindai: false }).kode, 'N02');
});
