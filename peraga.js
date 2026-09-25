// Tangkap tiap layar peraga menjadi berkas PNG untuk deck presentasi.
//
// Jalankan peladen lebih dulu, lalu:  npm run peraga
//
// Memakai Chrome atau Edge yang sudah ada di komputer, dikemudikan lewat
// protokol DevTools. Tanpa pustaka tambahan: Node 22 ke atas sudah membawa
// klien WebSocket sendiri.
//
// Mode --screenshot bawaan Chrome sempat dicoba dan selalu menghasilkan gambar
// kosong, karena gambarnya diambil sebelum React selesai merender. Di sini
// penangkapan baru dilakukan setelah elemen yang ditunggu benar-benar ada di
// halaman.

import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, writeFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const LAYAR = [
  'pembeli-beranda',
  'pembeli-pindai',
  'verifikasi-hijau',
  'verifikasi-merah',
  'pembeli-menunggu',
  'pembeli-diputus',
  'pedagang-segel',
  'pedagang-notifikasi',
  'petugas-aduan',
];

const KANDIDAT = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];

const PORTA = process.env.PORT || 5173;
const ASAL = `http://localhost:${PORTA}`;
const KELUAR = resolve('peraga');
const LEBAR = 390;
const TINGGI = 844;
const SKALA = 2;
const PORTA_DEBUG = 9333;

const tidur = (ms) => new Promise((r) => setTimeout(r, ms));

const peramban = KANDIDAT.find((p) => existsSync(p));
if (!peramban) {
  console.error('Tidak menemukan Chrome maupun Edge.');
  process.exit(1);
}

try {
  const r = await fetch(`${ASAL}/api/salinan`);
  if (!r.ok) throw new Error(String(r.status));
} catch {
  console.error(`Peladen di ${ASAL} tidak menjawab. Jalankan "npm run dev" lebih dulu.`);
  process.exit(1);
}

mkdirSync(KELUAR, { recursive: true });

const anak = spawn(peramban, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--no-first-run',
  '--no-default-browser-check',
  `--remote-debugging-port=${PORTA_DEBUG}`,
  // Tanpa izin ini, Chrome menolak sambungan WebSocket yang membawa header
  // Origin, dan klien bawaan Node selalu mengirimnya.
  '--remote-allow-origins=*',
  '--user-data-dir=' + join(KELUAR, '.profil'),
  'about:blank',
], { stdio: 'ignore' });

// Tunggu peramban siap menerima perintah.
let siap = false;
for (let i = 0; i < 60 && !siap; i++) {
  try {
    const r = await fetch(`http://127.0.0.1:${PORTA_DEBUG}/json/version`);
    siap = r.ok;
  } catch {
    await tidur(250);
  }
}
if (!siap) {
  anak.kill();
  console.error('Peramban tidak kunjung siap menerima perintah.');
  process.exit(1);
}

console.log(`\n  Memakai ${peramban.split('/').pop()}`);
console.log(`  Menangkap ${LAYAR.length} layar, ${LEBAR}x${TINGGI} skala ${SKALA}x\n`);

let nomor = 0;
let berhasil = 0;

for (const nama of LAYAR) {
  try {
    await tangkap(nama);
    const kb = Math.round(statSync(join(KELUAR, `${nama}.png`)).size / 1024);
    console.log(`  OK  ${nama}.png  ${kb} KB`);
    berhasil += 1;
  } catch (e) {
    console.error(`  --  ${nama}: ${e.message}`);
  }
}

anak.kill();
console.log(`\n  ${berhasil} dari ${LAYAR.length} berkas tersimpan di ${KELUAR}\n`);

// ---------------------------------------------------------------- penangkap

async function tangkap(nama) {
  const res = await fetch(`http://127.0.0.1:${PORTA_DEBUG}/json/new?about:blank`, { method: 'PUT' });
  const target = await res.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  const menunggu = new Map();

  ws.addEventListener('message', (e) => {
    const pesan = JSON.parse(e.data);
    if (pesan.id && menunggu.has(pesan.id)) {
      const { selesai, gagal } = menunggu.get(pesan.id);
      menunggu.delete(pesan.id);
      pesan.error ? gagal(new Error(pesan.error.message)) : selesai(pesan.result);
    }
  });

  // Batas waktu wajib: sambungan yang tidak pernah terbuka dan tidak pernah
  // bergalat akan menggantung skrip ini selamanya.
  await new Promise((r, x) => {
    const jam = setTimeout(() => x(new Error('sambungan ke peramban kehabisan waktu')), 10000);
    ws.addEventListener('open', () => { clearTimeout(jam); r(); }, { once: true });
    ws.addEventListener('error', () => { clearTimeout(jam); x(new Error('gagal menyambung ke peramban')); }, { once: true });
  });

  const kirim = (method, params = {}) =>
    new Promise((selesai, gagal) => {
      const id = ++nomor;
      const jam = setTimeout(() => {
        menunggu.delete(id);
        gagal(new Error(`${method} kehabisan waktu`));
      }, 20000);
      menunggu.set(id, {
        selesai: (v) => { clearTimeout(jam); selesai(v); },
        gagal: (e) => { clearTimeout(jam); gagal(e); },
      });
      ws.send(JSON.stringify({ id, method, params }));
    });

  try {
    await kirim('Emulation.setDeviceMetricsOverride', {
      width: LEBAR, height: TINGGI, deviceScaleFactor: SKALA, mobile: true,
    });
    await kirim('Page.enable');
    await kirim('Page.navigate', { url: `${ASAL}/peraga?layar=${nama}` });

    // Tunggu sampai cangkang benar-benar terpasang, bukan sekadar sampai
    // halaman selesai dimuat. Inilah yang gagal pada mode --screenshot.
    let ada = false;
    for (let i = 0; i < 80 && !ada; i++) {
      await tidur(150);
      const { result } = await kirim('Runtime.evaluate', {
        expression: "!!document.querySelector('.kepala-dompet, .nav-dompet')",
        returnByValue: true,
      });
      ada = result?.value === true;
    }
    if (!ada) throw new Error('layar tidak kunjung muncul');

    // Beri waktu huruf dan kode QR selesai dilukis.
    await kirim('Runtime.evaluate', {
      expression: 'document.fonts ? document.fonts.ready.then(() => true) : true',
      awaitPromise: true, returnByValue: true,
    });
    await tidur(600);

    const { data } = await kirim('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    writeFileSync(join(KELUAR, `${nama}.png`), Buffer.from(data, 'base64'));
  } finally {
    ws.close();
    await fetch(`http://127.0.0.1:${PORTA_DEBUG}/json/close/${target.id}`).catch(() => {});
  }
}
