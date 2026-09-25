// Rakit video demo (di bawah 2 menit) dari tangkapan layar peraga.
//
// Jalankan "npm run peraga" lebih dulu, lalu:  npm run video
//
// Tanpa ffmpeg dan tanpa pustaka tambahan: adegan dilukis di <canvas> dalam
// Chrome/Edge headless, direkam MediaRecorder, lalu ditarik lewat DevTools.
// Hasilnya peraga/demo-sasi-qr.mp4 (atau .webm bila peramban tak bisa MP4).

import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const KELUAR = resolve('peraga');
const PORTA_DEBUG = 9334;
const KANDIDAT = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];

// Kotak sorot memakai koordinat piksel tangkapan layar (780 x 1688).
const ADEGAN = [
  { jenis: 'pembuka', dur: 6 },
  { jenis: 'masalah', dur: 9 },
  { jenis: 'solusi', dur: 9 },
  {
    img: 'pedagang-segel', tahap: 'TAHAP 1 · PEDULI', warna: '#2FB3E8', dur: 10,
    judul: 'Pedagang memasang segel',
    isi: 'Lapak didaftarkan sekali. Nomor segel fisik diikat ke NMID dan isi kode QRIS milik pedagang.',
    sorot: [{ r: [32, 868, 748, 1560], t: 2.5 }],
  },
  {
    img: 'pembeli-beranda', tahap: 'TAHAP 2 · KENALI', warna: '#8E7BE8', dur: 8,
    judul: 'Data lapak tersalin di ponsel',
    isi: 'Ponsel pembeli menyimpan salinan lapak tersegel, kurang dari 8 KB. Pemeriksaan tetap jalan tanpa internet.',
  },
  {
    img: 'pembeli-pindai', tahap: 'TAHAP 2 · KENALI', warna: '#8E7BE8', dur: 9,
    judul: 'Dua kali pindai',
    isi: 'Pindai 1: segel di lapak. Pindai 2: kode pembayaran. Aplikasi mengurai QRIS dan memeriksa CRC-16.',
  },
  {
    img: 'verifikasi-hijau', tahap: 'PUTUSAN A01', warna: '#3DD68C', dur: 10,
    judul: 'Hijau: cocok, aman dibayar',
    isi: 'Segel dan kode milik lapak yang sama. Putusan diambil dari tabel sembilan aturan, dihitung di ponsel.',
    sorot: [{ r: [32, 794, 748, 926], t: 2 }, { r: [32, 1400, 748, 1504], t: 6 }],
  },
  {
    img: 'pedagang-notifikasi', tahap: 'PEMBAYARAN SIMULASI', warna: '#2FB3E8', dur: 8,
    judul: 'Pedagang langsung menerima kabar',
    isi: 'Pembayaran tiruan tercatat di rantai catatan, dan skor kepercayaan pedagang bertambah.',
  },
  {
    img: 'verifikasi-merah', tahap: 'PUTUSAN E04', warna: '#FF5C7A', dur: 12,
    judul: 'Merah: stiker QR ditukar',
    isi: 'NMID pada kode berbeda dari yang terikat pada segel. Tombol bayar dihilangkan, yang tersisa hanya Adukan.',
    sorot: [{ r: [32, 490, 748, 660], t: 2 }, { r: [32, 692, 748, 1076], t: 5.5 }, { r: [32, 1400, 748, 1504], t: 9 }],
  },
  {
    img: 'petugas-aduan', tahap: 'TAHAP 3 · ADUKAN', warna: '#F5B544', dur: 10,
    judul: 'Aduan masuk ke petugas',
    isi: 'Muncul seketika di perangkat terpisah, lengkap dengan NMID, segel, dan kode aturan. Yang memutus adalah pihak ketiga.',
    sorot: [{ r: [32, 728, 748, 1004], t: 2 }, { r: [32, 1150, 748, 1420], t: 5.5 }],
  },
  {
    img: 'pembeli-menunggu', tahap: 'TAHAP 3 · ADUKAN', warna: '#F5B544', dur: 7,
    judul: 'Pembeli memantau aduannya',
    isi: 'Layar tidak berhenti di "terkirim". Tanpa jaringan, aduan diantrekan dan terkirim sendiri nanti.',
  },
  {
    img: 'pembeli-diputus', tahap: 'TAHAP 3 · ADUKAN', warna: '#F5B544', dur: 10,
    judul: 'Satu aduan melindungi semua',
    isi: 'Setelah petugas mengonfirmasi, NMID masuk aturan R3. Setiap pemindai berikutnya langsung melihat merah.',
    sorot: [{ r: [32, 602, 748, 778], t: 2 }, { r: [32, 804, 748, 1192], t: 5.5 }],
  },
  { jenis: 'penutup', dur: 8 },
];

const peramban = KANDIDAT.find((p) => existsSync(p));
if (!peramban) { console.error('Tidak menemukan Chrome maupun Edge.'); process.exit(1); }

const gambar = {};
for (const a of ADEGAN.filter((a) => a.img)) {
  const p = join(KELUAR, `${a.img}.png`);
  if (!existsSync(p)) { console.error(`${p} belum ada. Jalankan "npm run peraga" lebih dulu.`); process.exit(1); }
  gambar[a.img] = 'data:image/png;base64,' + readFileSync(p).toString('base64');
}

const halaman = join(KELUAR, 'video.html');
writeFileSync(halaman, `<!doctype html><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700;800&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<body style="margin:0;background:#000"><canvas id="c" width="1920" height="1080"></canvas>
<script>
const ADEGAN = ${JSON.stringify(ADEGAN)};
const GAMBAR = ${JSON.stringify(gambar)};
(${lukis.toString()})();
</script>`);

const anak = spawn(peramban, [
  '--headless=new', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
  '--autoplay-policy=no-user-gesture-required', '--window-size=1920,1080',
  `--remote-debugging-port=${PORTA_DEBUG}`, '--remote-allow-origins=*',
  '--user-data-dir=' + join(KELUAR, '.profil-video'), 'about:blank',
], { stdio: 'ignore' });

try {
  await rekam();
} finally {
  anak.kill();
}

async function rekam() {
  let siap = false;
  for (let i = 0; i < 60 && !siap; i++) {
    try { siap = (await fetch(`http://127.0.0.1:${PORTA_DEBUG}/json/version`)).ok; }
    catch { await new Promise((r) => setTimeout(r, 250)); }
  }
  if (!siap) throw new Error('Peramban tidak kunjung siap.');

  const target = await (await fetch(`http://127.0.0.1:${PORTA_DEBUG}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, x) => { ws.onopen = r; ws.onerror = () => x(new Error('gagal menyambung ke peramban')); });
  let nomor = 0;
  const menunggu = new Map();
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (!menunggu.has(m.id)) return;
    const [ok, gagal] = menunggu.get(m.id);
    menunggu.delete(m.id);
    m.error ? gagal(new Error(m.error.message)) : ok(m.result);
  };
  const kirim = (method, params = {}) => new Promise((ok, gagal) => {
    const id = ++nomor;
    menunggu.set(id, [ok, gagal]);
    ws.send(JSON.stringify({ id, method, params }));
  });
  const nilai = async (expression) => {
    const { result, exceptionDetails } = await kirim('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description || exceptionDetails.text);
    return result.value;
  };

  await kirim('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await kirim('Page.navigate', { url: pathToFileURL(halaman).href });

  const total = ADEGAN.reduce((s, a) => s + a.dur, 0);
  console.log(`\n  Merekam ${ADEGAN.length} adegan, ${total} detik, secara waktu nyata...`);
  for (let i = 0; i < 20 && !(await nilai('typeof window.mulai === "function"').catch(() => false)); i++) {
    await new Promise((r) => setTimeout(r, 300));
  }
  const { jenis, panjang } = await nilai('window.mulai()');

  // Base64 ditarik per potongan; satu pesan puluhan MB terlalu rawan.
  let b64 = '';
  for (let i = 0; i < panjang; i += 4_000_000) b64 += await nilai(`window.hasil.slice(${i}, ${i + 4_000_000})`);
  const berkas = join(KELUAR, `demo-sasi-qr.${jenis}`);
  writeFileSync(berkas, Buffer.from(b64, 'base64'));
  ws.close();
  console.log(`  Tersimpan ${berkas}  ${(b64.length * 0.75 / 1e6).toFixed(1)} MB\n`);
}

// ------------------------------------------------ dijalankan di peramban
// Fungsi ini diserialisasi ke halaman, jadi tidak boleh memakai apa pun dari
// lingkup Node di atas selain ADEGAN dan GAMBAR yang disuntikkan.

function lukis() {
  const W = 1920, H = 1080;
  const c = document.getElementById('c');
  const g = c.getContext('2d');
  const SANS = '"Plus Jakarta Sans", system-ui, Arial, sans-serif';
  const MONO = '"JetBrains Mono", Consolas, monospace';
  const K = { kanvas: '#0E1217', kartu: '#191F26', garis: '#313A45', tinta: '#fff', isi: '#A8B2BF', redup: '#7C8896',
    biru: '#2FB3E8', ungu: '#8E7BE8', kuning: '#F5B544', merah: '#FF5C7A', hijau: '#3DD68C' };

  const img = {};
  for (const [k, v] of Object.entries(GAMBAR)) { img[k] = new Image(); img[k].src = v; }

  let t0 = 0;
  const mulaiAdegan = [];
  ADEGAN.reduce((s, a) => (mulaiAdegan.push(s), s + a.dur), 0);
  const TOTAL = ADEGAN.reduce((s, a) => s + a.dur, 0);

  const mudah = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
  const masuk = (t, mulai, lama = 0.6) => mudah((t - mulai) / lama);

  function rr(x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
  function huruf(berat, ukuran, kel = SANS) { g.font = `${berat} ${ukuran}px ${kel}`; }
  function bungkus(teks, lebar) {
    const baris = []; let kini = '';
    for (const kata of teks.split(' ')) {
      const coba = kini ? kini + ' ' + kata : kata;
      if (g.measureText(coba).width > lebar && kini) { baris.push(kini); kini = kata; } else kini = coba;
    }
    return baris.concat(kini);
  }
  function teks(isi, x, y, { berat = 500, ukuran = 34, warna = K.isi, lebar = 820, jarak = 1.45, alfa = 1, kel = SANS, rata = 'left' } = {}) {
    huruf(berat, ukuran, kel); g.fillStyle = warna; g.globalAlpha = alfa; g.textAlign = rata;
    const baris = bungkus(isi, lebar);
    baris.forEach((b, i) => g.fillText(b, x, y + i * ukuran * jarak));
    g.globalAlpha = 1; g.textAlign = 'left';
    return y + baris.length * ukuran * jarak;
  }
  function cip(label, x, y, warna, alfa = 1) {
    huruf(500, 22, MONO); g.letterSpacing = '4px';
    const w = g.measureText(label).width + 44;
    g.globalAlpha = alfa;
    rr(x, y, w, 48, 24); g.strokeStyle = warna; g.lineWidth = 2; g.stroke();
    g.fillStyle = warna; g.fillText(label, x + 22, y + 32);
    g.letterSpacing = '0px'; g.globalAlpha = 1;
  }
  function latar(warna = K.biru) {
    g.fillStyle = K.kanvas; g.fillRect(0, 0, W, H);
    let r = g.createRadialGradient(260, 140, 0, 260, 140, 900);
    r.addColorStop(0, 'rgba(47,179,232,0.16)'); r.addColorStop(1, 'rgba(47,179,232,0)');
    g.fillStyle = r; g.fillRect(0, 0, W, H);
    r = g.createRadialGradient(1400, 560, 0, 1400, 560, 700);
    r.addColorStop(0, warna + '26'); r.addColorStop(1, warna + '00');
    g.fillStyle = r; g.fillRect(0, 0, W, H);
  }
  function logo(x, y, ukuran = 34) {
    huruf(800, ukuran); g.fillStyle = K.tinta; g.fillText('SASI', x, y);
    const w = g.measureText('SASI').width;
    huruf(400, ukuran); g.fillStyle = K.isi; g.fillText('-QR', x + w, y);
  }
  function bingkai() {
    logo(120, 110);
    huruf(500, 20, MONO); g.fillStyle = K.redup; g.textAlign = 'right'; g.letterSpacing = '3px';
    g.fillText('PURWARUPA · SALDO & PEMBAYARAN SIMULASI', W - 120, 1058);
    g.letterSpacing = '0px'; g.textAlign = 'left';
  }
  function kemajuan(t) {
    g.fillStyle = '#232A33'; rr(120, 1016, W - 240, 4, 2); g.fill();
    g.fillStyle = K.biru; rr(120, 1016, (W - 240) * Math.min(1, t / TOTAL), 4, 2); g.fill();
  }
  // Kotak mirip QR, deterministik supaya tidak berkedip antarbingkai.
  function qr(x, y, s, benih, warna = '#fff', dasar = '#0E1217') {
    const n = 21, u = s / n; let a = benih;
    g.fillStyle = warna; rr(x - u, y - u, s + 2 * u, s + 2 * u, 10); g.fill();
    g.fillStyle = dasar;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      a = (a * 1103515245 + 12345) & 0x7fffffff;
      const pojok = (i < 7 && j < 7) || (i < 7 && j > 13) || (i > 13 && j < 7);
      if (pojok) {
        const ii = i % 14 === i ? i : i - 14, jj = j > 13 ? j - 14 : j;
        const cincin = ii === 0 || ii === 6 || jj === 0 || jj === 6 || (ii > 1 && ii < 5 && jj > 1 && jj < 5);
        if (cincin) g.fillRect(x + j * u, y + i * u, u + 0.5, u + 0.5);
      } else if ((a >> 16) & 1) g.fillRect(x + j * u, y + i * u, u + 0.5, u + 0.5);
    }
  }
  function ponsel(nama, t, a) {
    const tinggi = 880, lebar = tinggi * 780 / 1688, x = 1400 - lebar / 2, y = 90 + (1 - masuk(t, 0.1, 0.8)) * 60;
    const skala = lebar / 780;
    g.globalAlpha = masuk(t, 0.1, 0.8);
    rr(x - 14, y - 14, lebar + 28, tinggi + 28, 60); g.fillStyle = '#05070A'; g.fill();
    g.strokeStyle = K.garis; g.lineWidth = 2; g.stroke();
    g.save(); rr(x, y, lebar, tinggi, 46); g.clip();
    g.drawImage(img[nama], x, y, lebar, tinggi);
    // Sorot: redupkan sekeliling, beri garis pada bagian yang dibahas.
    const aktif = (a.sorot || []).filter((s) => t >= s.t).pop();
    if (aktif) {
      const [x0, y0, x1, y1] = aktif.r.map((v) => v * skala);
      const k = masuk(t, aktif.t, 0.5);
      g.fillStyle = `rgba(0,0,0,${0.5 * k})`;
      g.beginPath(); g.rect(x, y, lebar, tinggi); g.roundRect(x + x0 - 6, y + y0 - 6, x1 - x0 + 12, y1 - y0 + 12, 18); g.fill('evenodd');
    }
    g.restore();
    if (aktif) {
      const [x0, y0, x1, y1] = aktif.r.map((v) => v * skala);
      const denyut = 0.65 + 0.35 * Math.sin((t - aktif.t) * 4);
      g.globalAlpha = masuk(t, aktif.t, 0.5) * denyut;
      rr(x + x0 - 6, y + y0 - 6, x1 - x0 + 12, y1 - y0 + 12, 18);
      g.strokeStyle = a.warna; g.lineWidth = 4; g.stroke();
    }
    g.globalAlpha = 1;
  }

  const ADEGAN_KHUSUS = {
    pembuka(t) {
      latar();
      const a = masuk(t, 0.2, 0.9);
      g.globalAlpha = a; huruf(800, 150); g.textAlign = 'center';
      const w1 = g.measureText('SASI').width; huruf(400, 150); const w2 = g.measureText('-QR').width;
      g.textAlign = 'left'; const x = (W - w1 - w2) / 2;
      huruf(800, 150); g.fillStyle = K.tinta; g.fillText('SASI', x, 500 + (1 - a) * 30);
      huruf(400, 150); g.fillStyle = K.biru; g.fillText('-QR', x + w1, 500 + (1 - a) * 30);
      g.globalAlpha = 1;
      teks('Periksa kode QRIS sebelum uang berpindah.', W / 2, 600, { ukuran: 44, berat: 700, warna: K.tinta, rata: 'center', lebar: 1600, alfa: masuk(t, 1.2) });
      teks('Verifikasi dua pindai untuk pedagang mikro · kerangka PeKA Bank Indonesia', W / 2, 670, { ukuran: 30, rata: 'center', lebar: 1600, alfa: masuk(t, 2) });
      [['PEDULI', K.biru], ['KENALI', K.ungu], ['ADUKAN', K.kuning]].forEach(([l, w], i) => cip(l, W / 2 - 330 + i * 230, 760, w, masuk(t, 2.8 + i * 0.3)));
    },
    masalah(t) {
      latar(K.merah); bingkai();
      cip('MASALAHNYA', 120, 220, K.merah, masuk(t, 0.2));
      teks('Stiker QR ditempel di atas kode pedagang', 120, 360, { berat: 800, ukuran: 64, warna: K.tinta, lebar: 760, jarak: 1.2, alfa: masuk(t, 0.4) });
      teks('Kodenya tampak sah. Pembeli memindai dan membayar, tetapi uang masuk ke rekening pelaku.', 120, 560, { lebar: 740, alfa: masuk(t, 1.2) });
      // Kode asli, lalu stiker pelaku meluncur menutupinya.
      const x = 1180, y = 300, s = 420;
      g.globalAlpha = masuk(t, 0.5); qr(x, y, s, 7);
      teks('Kode milik pedagang', x + s / 2, y + s + 70, { ukuran: 28, rata: 'center', lebar: 600 });
      g.globalAlpha = 1;
      const k = mudah((t - 3) / 1.2);
      if (k > 0) {
        const oy = -500 * (1 - k);
        g.save(); g.translate(x + s / 2, y + s / 2 + oy); g.rotate(-0.05 * k); g.translate(-(x + s / 2), -(y + s / 2));
        qr(x + 10, y + 10, s - 20, 99, K.merah, '#2C161C');
        g.restore();
        huruf(800, 30); g.fillStyle = K.merah; g.textAlign = 'center';
        g.globalAlpha = masuk(t, 4.4); g.fillText('STIKER PELAKU', x + s / 2, y - 40); g.globalAlpha = 1; g.textAlign = 'left';
      }
      teks('Uang → rekening lain', x + s / 2, y + s + 120, { ukuran: 34, berat: 700, warna: K.merah, rata: 'center', lebar: 600, alfa: masuk(t, 5.2) });
    },
    solusi(t) {
      latar(); bingkai();
      cip('SATU PRINSIP', 120, 200, K.biru, masuk(t, 0.2));
      teks('Kode bayar sah hanya bila cocok dengan segel fisik lapak, dan diperiksa sebelum membayar.', 120, 330, { berat: 800, ukuran: 58, warna: K.tinta, lebar: 1500, jarak: 1.2, alfa: masuk(t, 0.4) });
      const pihak = [
        ['Pedagang', 'Peduli', 'Mendaftarkan lapak, memasang segel bernomor.', K.biru],
        ['Pembeli', 'Kenali', 'Memindai segel lalu kode bayar, membaca putusan.', K.ungu],
        ['Petugas', 'Adukan', 'Memeriksa aduan di perangkat terpisah dan memutus.', K.kuning],
      ];
      pihak.forEach(([nama, tahap, isi, w], i) => {
        const a = masuk(t, 2 + i * 0.6), x = 120 + i * 570, y = 560 + (1 - a) * 30;
        g.globalAlpha = a; rr(x, y, 530, 300, 28); g.fillStyle = K.kartu; g.fill();
        g.fillStyle = w; rr(x, y, 530, 6, 3); g.fill();
        huruf(500, 22, MONO); g.letterSpacing = '4px'; g.fillStyle = w; g.fillText(tahap.toUpperCase(), x + 40, y + 70); g.letterSpacing = '0px';
        teks(nama, x + 40, y + 130, { berat: 800, ukuran: 46, warna: K.tinta, alfa: a });
        teks(isi, x + 40, y + 195, { ukuran: 28, lebar: 450, alfa: a });
      });
      g.globalAlpha = 1;
    },
    penutup(t) {
      latar(); bingkai();
      teks('Ringkasnya', 120, 260, { berat: 800, ukuran: 72, warna: K.tinta, alfa: masuk(t, 0.2) });
      const poin = [
        ['9 aturan', 'Putusan deterministik R1 sampai R9, tiap putusan bisa ditunjuk ke satu aturan.', K.biru],
        ['Di ponsel', 'Seluruh putusan dihitung di perangkat, tetap jalan tanpa internet.', K.ungu],
        ['Merah = berhenti', 'Kode yang gagal verifikasi tidak punya tombol bayar sama sekali.', K.merah],
        ['Bukan dompet', 'Tidak memindahkan uang dan tidak terhubung ke bank mana pun.', K.hijau],
      ];
      poin.forEach(([j, isi, w], i) => {
        const a = masuk(t, 0.8 + i * 0.5), x = 120 + (i % 2) * 850, y = 340 + Math.floor(i / 2) * 250;
        g.globalAlpha = a; rr(x, y, 810, 210, 24); g.fillStyle = K.kartu; g.fill();
        g.fillStyle = w; rr(x, y + 30, 6, 150, 3); g.fill();
        teks(j, x + 44, y + 75, { berat: 800, ukuran: 40, warna: K.tinta, alfa: a });
        teks(isi, x + 44, y + 130, { ukuran: 28, lebar: 720, alfa: a });
      });
      g.globalAlpha = 1;
    },
  };

  function adeganLayar(a, t) {
    latar(a.warna); bingkai();
    cip(a.tahap, 120, 260, a.warna, masuk(t, 0.2));
    const bawah = teks(a.judul, 120, 410, { berat: 800, ukuran: 66, warna: K.tinta, lebar: 820, jarak: 1.18, alfa: masuk(t, 0.4) });
    teks(a.isi, 120, bawah + 40, { lebar: 800, alfa: masuk(t, 1.1) });
    ponsel(a.img, t, a);
  }

  function bingkaiKe(detik) {
    let i = mulaiAdegan.findLastIndex((m) => detik >= m);
    if (i < 0) i = 0;
    const a = ADEGAN[i], t = detik - mulaiAdegan[i];
    (ADEGAN_KHUSUS[a.jenis] || ((t) => adeganLayar(a, t)))(t);
    kemajuan(detik);
    // Pudar masuk dan keluar tiap adegan.
    const gelap = Math.max(1 - t / 0.4, (t - (a.dur - 0.35)) / 0.35, 0);
    if (gelap > 0) { g.fillStyle = `rgba(14,18,23,${Math.min(1, gelap)})`; g.fillRect(0, 0, W, H); }
  }

  window.bingkaiKe = bingkaiKe; // untuk pratinjau manual di peramban
  window.mulai = async () => {
    await Promise.all([
      document.fonts.load('800 60px "Plus Jakarta Sans"'), document.fonts.load('500 30px "Plus Jakarta Sans"'),
      document.fonts.load('400 30px "Plus Jakarta Sans"'), document.fonts.load('700 30px "Plus Jakarta Sans"'),
      document.fonts.load('500 22px "JetBrains Mono"'),
      ...Object.values(img).map((i) => i.decode()),
    ]).catch(() => {});
    const jenis = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.640028') ? 'mp4' : 'webm';
    const mime = jenis === 'mp4' ? 'video/mp4;codecs=avc1.640028' : 'video/webm;codecs=vp9';
    const arus = c.captureStream(30);
    const perekam = new MediaRecorder(arus, { mimeType: mime, videoBitsPerSecond: 3_500_000 });
    const potong = [];
    perekam.ondataavailable = (e) => e.data.size && potong.push(e.data);
    const selesai = new Promise((r) => (perekam.onstop = r));
    bingkaiKe(0);
    perekam.start(1000);
    t0 = performance.now();
    // Jam dinding, bukan hitungan bingkai: bingkai yang terlambat tidak
    // memanjangkan video.
    await new Promise((r) => {
      const jalan = () => {
        const d = (performance.now() - t0) / 1000;
        if (d >= TOTAL) return r();
        bingkaiKe(d);
        requestAnimationFrame(jalan);
      };
      jalan();
    });
    perekam.stop();
    await selesai;
    const blob = new Blob(potong, { type: mime });
    const url = await new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(blob); });
    window.hasil = url.slice(url.indexOf(',') + 1);
    return { jenis, panjang: window.hasil.length };
  };
}
