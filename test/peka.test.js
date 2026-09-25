// Uji integrasi lingkar PeKA: Adukan -> petugas -> peringatan bagi pemindai
// berikutnya. Ditulis setelah perutean /aduan/:id/:aksi ternyata salah indeks
// dan mematikan seluruh lingkar ini tanpa satu pun galat muncul.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { bangunQris } from '../src/lib/emv.js';
import { periksaLokal } from '../src/lib/salinan.js';

const PORTA = 5199;
const B = `http://localhost:${PORTA}/api`;
let peladen;
let dataDir;

const go = async (jalur, badan) => {
  const r = await fetch(B + jalur, {
    method: badan ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json' },
    body: badan ? JSON.stringify(badan) : undefined,
  });
  return { status: r.status, isi: await r.json() };
};

before(async () => {
  dataDir = mkdtempSync(join(tmpdir(), 'sasi-uji-'));
  peladen = spawn(process.execPath, ['server.js'], {
    env: { ...process.env, PORT: String(PORTA), DATA_DIR: dataDir, NODE_ENV: 'production' },
    stdio: 'ignore',
  });
  // Tunggu peladen siap menerima permintaan.
  for (let i = 0; i < 60; i++) {
    try {
      await fetch(`${B}/salinan`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  throw new Error('peladen tidak kunjung siap');
});

after(() => {
  peladen?.kill();
  if (dataDir) rmSync(dataDir, { recursive: true, force: true });
});

test('aduan terkonfirmasi membuat pemindai berikutnya melihat E03', async () => {
  const NMID = 'ID5555PENIPU9999';
  const kode = bangunQris({ nmid: NMID, nama: 'KODE PENGGANTI', kota: 'AMBON', akunSasi: '' });

  const sebelum = await go('/salinan');
  assert.equal(periksaLokal(sebelum.isi, { muatan: kode }).aturan.kode, 'N02', 'awalnya belum diadukan');

  const adu = await go('/aduan', {
    nmid: NMID, pelapor: 'PEM-100', kronologi: 'stiker ditimpa', kodeAturan: 'E04',
  });
  assert.equal(adu.status, 200);

  const putus = await go(`/aduan/${adu.isi.id}/konfirmasi`, { petugas: 'CS-01' });
  assert.equal(putus.status, 200, 'perutean /aduan/:id/:aksi harus mengenai aduan yang benar');
  assert.equal(putus.isi.status, 'terkonfirmasi');

  const sesudah = await go('/salinan');
  assert.ok(sesudah.isi.nmidDiadukan.includes(NMID));
  assert.equal(periksaLokal(sesudah.isi, { muatan: kode }).aturan.kode, 'E03');
});

test('petugas dapat menolak aduan, dan NMID tidak masuk daftar', async () => {
  const NMID = 'ID6666JUJUR00000';
  const adu = await go('/aduan', { nmid: NMID, pelapor: 'PEM-100', kronologi: 'salah lihat' });
  const putus = await go(`/aduan/${adu.isi.id}/tolak`, { petugas: 'CS-01' });
  assert.equal(putus.isi.status, 'ditolak');

  const s = await go('/salinan');
  assert.ok(!s.isi.nmidDiadukan.includes(NMID));
});

test('pendaftaran lapak mengikat NMID ke segel, dan segel tidak bisa dipakai dua kali', async () => {
  const muatan = bangunQris({ nmid: 'ID7777000011112', nama: 'KIOS NUSA INDAH', kota: 'AMBON', akunSasi: '' });

  const a = await go('/lapak', { muatan, segelId: 'SLUJI001', nama: 'Kios Nusa Indah' });
  assert.equal(a.status, 200);

  const b = await go('/lapak', { muatan, segelId: 'SLUJI001', nama: 'Duplikat' });
  assert.equal(b.status, 409, 'segel yang sama tidak boleh dipakai lapak lain');

  const s = await go('/salinan');
  assert.equal(periksaLokal(s.isi, { muatan, segelId: 'SLUJI001' }).aturan.kode, 'A01');

  const lain = s.isi.lapak.find((l) => l.segelId === 'SL7K2M9Q');
  assert.equal(periksaLokal(s.isi, { muatan: lain.muatan, segelId: 'SLUJI001' }).aturan.kode, 'E04');
});

test('kode dengan CRC rusak ditolak saat pendaftaran', async () => {
  const r = await go('/lapak', { muatan: 'muatanrusak', segelId: 'SLUJI002' });
  assert.equal(r.status, 400);
});

test('kode rusak tanpa NMID tetap bisa diadukan memakai cap muatan', async () => {
  // Muatan dirusak satu karakter: CRC gagal (R1/E01) dan NMID tidak terurai.
  const asli = bangunQris({ nmid: 'ID1024567890123', nama: 'WARUNG MAMA ANI', kota: 'AMBON', akunSasi: 'WRG-001' });
  const rusak = asli.slice(0, 20) + (asli[20] === '9' ? '8' : '9') + asli.slice(21);

  const s = await go('/salinan');
  const hasil = periksaLokal(s.isi, { muatan: rusak, segelId: 'SL7K2M9Q' });
  assert.equal(hasil.aturan.kode, 'E01');
  assert.equal(hasil.qr.nmid, '', 'NMID memang tidak terbaca pada kode rusak');

  const adu = await go('/aduan', {
    nmid: '',
    capMuatan: rusak.slice(-8),
    pelapor: 'PEM-100',
    kodeAturan: 'E01',
    kronologi: 'stiker tercoret dan tidak terbaca',
  });
  assert.equal(adu.status, 200, 'aduan atas kode rusak harus diterima');
  assert.ok(adu.isi.id);
});

test('aduan tanpa NMID maupun cap muatan ditolak', async () => {
  const r = await go('/aduan', { pelapor: 'PEM-100', kronologi: 'tanpa pengenal apa pun' });
  assert.equal(r.status, 400);
});

test('aduan atas kode gagal CRC tidak dilekatkan ke akun mana pun', async () => {
  // Muatan rusak masih memuat penanda 80 yang menyebut WRG-001, tetapi CRC-nya
  // gagal sehingga penanda itu tidak boleh dipercaya. Pedagang jujur tidak
  // boleh kehilangan skor hanya karena stikernya tercoret.
  const adu = await go('/aduan', {
    nmid: '', capMuatan: 'ABCD1234', terlapor: 'WRG-001',
    kodeAturan: 'E01', pelapor: 'PEM-100', kronologi: 'stiker tercoret',
  });
  assert.equal(adu.status, 200);

  const lihat = await go(`/aduan/${adu.isi.id}`);
  assert.equal(lihat.isi.terlapor, null, 'muatan gagal CRC tidak boleh menuding akun');
});
