// Peladen SASI-QR: satu proses, satu porta.
// Vite dipasang sebagai middleware supaya ponsel cukup membuka satu alamat dan
// antarmuka serta API berada pada asal yang sama. Tanpa proxy, tanpa CORS.

import { createServer } from 'node:http';
import { createServer as createServerAman } from 'node:https';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { networkInterfaces } from 'node:os';

import { Rantai } from './src/lib/chain.js';
import { hitungSkor, pita } from './src/lib/score.js';
import { bacaQris } from './src/lib/emv.js';

const PORTA = Number(process.env.PORT) || 5173;
const PRODUKSI = process.env.NODE_ENV === 'production' || process.argv.includes('--produksi');
const DATA = process.env.DATA_DIR || './data'; // uji integrasi memakai folder sendiri

mkdirSync(DATA, { recursive: true });
const rantai = new Rantai(join(DATA, 'rantai.json'));

// ---------------------------------------------------------------- penyimpanan

const muatJson = (nama, bawaan) => {
  const p = join(DATA, nama);
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : bawaan;
};
const simpanJson = (nama, isi) => writeFileSync(join(DATA, nama), JSON.stringify(isi, null, 2));

let akun = muatJson('akun.json', null);
let aduan = muatJson('aduan.json', []);
const sesi = new Map(); // keadaan meja kasir per segel, hanya di memori

if (!akun) {
  const { seedAkun, seedAduan } = await import('./seed.js');
  akun = seedAkun(rantai);
  aduan = seedAduan();
  simpanJson('akun.json', akun);
  simpanJson('aduan.json', aduan);
}

// ------------------------------------------------------------------- bantuan

const cariAkun = (id) => akun.find((a) => a.id === id);

const nmidDiadukan = () =>
  aduan.filter((a) => a.status === 'terkonfirmasi').map((a) => a.nmid).filter(Boolean);

/** Profil publik sebuah akun, lengkap dengan skor hasil putar ulang rantai. */
function profil(id) {
  const a = cariAkun(id);
  if (!a) return null;
  const { skor, rincian, karantinaSampai, penipuanTerkonfirmasi } = hitungSkor(rantai.peristiwaAkun(id));
  return {
    ...a,
    skor,
    pita: pita(skor),
    rincian,
    karantinaSampai,
    penipuanTerkonfirmasi,
    aduanTerbuka: aduan.filter((x) => x.terlapor === id && x.status === 'baru').length,
  };
}

function catat(peristiwa) {
  const blok = rantai.tambah({ ...peristiwa, ts: peristiwa.ts ?? Date.now() });
  siarkan({ jenis: 'blok', blok });
  return blok;
}

// ------------------------------------------------------------- aliran langsung

const pendengar = new Set();
function siarkan(pesan) {
  const baris = `data: ${JSON.stringify(pesan)}\n\n`;
  for (const res of pendengar) res.write(baris);
}

// ----------------------------------------------------------------------- API

const badanJson = (req) =>
  new Promise((selesai, gagal) => {
    let s = '';
    req.on('data', (c) => {
      s += c;
      if (s.length > 1e6) gagal(new Error('badan permintaan terlalu besar'));
    });
    req.on('end', () => {
      try {
        selesai(s ? JSON.parse(s) : {});
      } catch (e) {
        gagal(e);
      }
    });
  });

const kirim = (res, kode, isi) => {
  res.writeHead(kode, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(isi));
};

async function api(req, res, url) {
  const jalur = url.pathname.replace(/^\/api/, '');
  const metode = req.method;

  if (metode === 'GET' && jalur === '/aliran') {
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    });
    res.write(': tersambung\n\n');
    pendengar.add(res);
    req.on('close', () => pendengar.delete(res));
    return;
  }

  if (metode === 'GET' && jalur === '/keadaan') {
    return kirim(res, 200, {
      akun: akun.map((a) => profil(a.id)),
      aduan,
      rantai: rantai.verifikasi(),
    });
  }

  if (metode === 'GET' && jalur.startsWith('/akun/')) {
    const p = profil(decodeURIComponent(jalur.slice(6)));
    return p ? kirim(res, 200, p) : kirim(res, 404, { galat: 'akun tidak ditemukan' });
  }

  if (metode === 'GET' && jalur === '/rantai') {
    return kirim(res, 200, { blok: rantai.blok, verifikasi: rantai.verifikasi() });
  }

  // ------------------------------------------------------ sesi meja kasir
  //
  // Keadaan sementara satu lapak selama satu pembeli melayani dirinya sendiri.
  // Disimpan di memori saja, tidak ke berkas: ini keadaan meja kasir yang
  // hidupnya hitungan detik, bukan catatan yang perlu bertahan.
  //
  // Perangkat pedagang berlangganan aliran dan berpindah layar sendiri ketika
  // segelnya dipindai. Bila jaringan mati, pedagang tetap bisa menampilkan
  // kodenya secara manual; yang hilang hanya perpindahan otomatisnya.
  if (metode === 'POST' && jalur === '/sesi') {
    const { segelId, tahap, ...sisa } = await badanJson(req);
    if (!segelId || !tahap) return kirim(res, 400, { galat: 'perlu segelId dan tahap' });
    sesi.set(segelId, { segelId, tahap, ...sisa, pada: Date.now() });
    siarkan({ jenis: 'sesi', segelId, tahap, ...sisa });
    return kirim(res, 200, { ok: true });
  }

  if (metode === 'GET' && jalur.startsWith('/sesi/')) {
    const segelId = decodeURIComponent(jalur.slice(6));
    return kirim(res, 200, sesi.get(segelId) ?? { segelId, tahap: 'menunggu' });
  }

  // Pembayaran simulasi.
  //
  // SASI-QR tidak memindahkan uang siapa pun. Titik akhir ini meniru
  // pemberitahuan yang biasanya datang dari aplikasi pembayaran, supaya alur
  // demo terasa utuh dari pindai sampai pedagang menerima kabar.
  if (metode === 'POST' && jalur === '/pembayaran') {
    const { segelId, nominal, kodeAturan = '', nmid = '', pembeli = 'Pembeli' } = await badanJson(req);
    const lapak = akun.find((a) => a.segelId === segelId);
    if (!lapak) return kirim(res, 404, { galat: 'lapak tidak dikenal' });
    if (!Number.isFinite(nominal) || nominal <= 0) return kirim(res, 400, { galat: 'nominal tidak sah' });

    const blok = catat({
      type: 'PEMBAYARAN', akun: lapak.id, nominal, kodeAturan, nmid, pembeli, simulasi: true,
    });
    // Hanya pembayaran yang lolos verifikasi penuh yang menambah skor.
    if (kodeAturan === 'A01') catat({ type: 'TRANSAKSI_BERSIH', akun: lapak.id, sumber: blok.indeks });

    const bukti = {
      ref: `TRX${String(blok.indeks).padStart(5, '0')}`,
      nominal, kodeAturan, pembeli,
      waktu: blok.waktu, blok: blok.indeks, hash: blok.hash,
    };
    sesi.set(segelId, { segelId, tahap: 'dibayar', ...bukti, pada: Date.now() });
    siarkan({ jenis: 'sesi', segelId, tahap: 'dibayar', ...bukti });
    return kirim(res, 200, bukti);
  }

  // Salinan pangkalan untuk perangkat. Inilah satu-satunya yang dibutuhkan
  // klien agar verifikasi berjalan tanpa jaringan. Peladen tidak pernah
  // mengambil putusan apa pun, sesuai Laporan Subbab 4.3.1.
  if (metode === 'GET' && jalur === '/salinan') {
    return kirim(res, 200, {
      dibuat: Date.now(),
      lapak: akun
        .filter((a) => a.tipe === 'pedagang')
        .map(({ id, nama, namaQr, nmid, kota, segelId, muatan, alamat }) => ({
          id, nama, namaTampil: nama, namaQr, nmid, kota, segelId, muatan, alamat,
        })),
      nmidDiadukan: nmidDiadukan(),
    });
  }

  // Aduan pengguna.
  //
  // NMID yang diadukan sering kali BUKAN milik akun terdaftar, karena justru
  // itulah kasus penukaran stiker yang paling umum. Aduan tetap diterima dan
  // NMID-nya tetap masuk daftar aturan R3 setelah petugas mengonfirmasi.
  if (metode === 'POST' && jalur === '/aduan') {
    const b = await badanJson(req);
    const nmid = (b.nmid || '').trim();
    const capMuatan = (b.capMuatan || '').trim();
    // Kode yang rusak (aturan R1) tidak punya NMID yang bisa diurai, padahal
    // justru kode seperti itu yang paling perlu dilaporkan. Cap muatan dipakai
    // sebagai pengenal penggantinya.
    if (!nmid && !capMuatan) {
      return kirim(res, 400, { galat: 'aduan harus menyebut NMID atau cap muatan' });
    }

    // Aturan R1 dan R2 berarti muatannya rusak atau bukan QRIS, sehingga
    // tidak ada atribut di dalamnya yang boleh dipakai menuding sebuah akun.
    const muatanTakSah = b.kodeAturan === 'E01' || b.kodeAturan === 'E02';
    const terlapor = muatanTakSah
      ? null
      : b.terlapor && cariAkun(b.terlapor)
        ? b.terlapor
        : (nmid ? akun.find((a) => a.nmid === nmid)?.id ?? null : null);

    const id = `ADU-${String(aduan.length + 1).padStart(4, '0')}`;
    aduan.push({
      id, nmid, terlapor,
      pelapor: b.pelapor ?? null,
      namaPadaKode: b.namaPadaKode ?? '',
      kodeAturan: b.kodeAturan ?? '',
      segelId: b.segelId ?? null,
      capMuatan,
      kronologi: b.kronologi ?? '',
      dipindaiPada: b.dipindaiPada ?? Date.now(),
      status: 'baru',
      dibuat: Date.now(),
    });
    simpanJson('aduan.json', aduan);
    // Peristiwa skor hanya dicatat bila NMID-nya memang milik akun terdaftar.
    if (terlapor) catat({ type: 'ADUAN_MASUK', akun: terlapor, pelapor: b.pelapor ?? null, aduanId: id });
    siarkan({ jenis: 'keadaan' });
    return kirim(res, 200, { id });
  }

  // Pendaftaran lapak baru, tahap Peduli.
  if (metode === 'POST' && jalur === '/lapak') {
    const b = await badanJson(req);
    const qr = bacaQris(b.muatan || '');
    if (!qr.crcSah) return kirim(res, 400, { galat: 'CRC kode tidak sah, kode mungkin rusak' });
    if (!qr.nmid) return kirim(res, 400, { galat: 'NMID tidak terbaca pada kode ini' });
    if (!b.segelId) return kirim(res, 400, { galat: 'segel belum dipindai' });
    if (akun.some((a) => a.segelId === b.segelId))
      return kirim(res, 409, { galat: 'segel ini sudah dipakai lapak lain' });

    const id = `LPK-${String(akun.length + 1).padStart(3, '0')}`;
    const baru = {
      id, tipe: 'pedagang',
      nama: b.nama || qr.namaMerchant,
      namaQr: qr.namaMerchant,
      nmid: qr.nmid,
      kota: qr.kota,
      segelId: b.segelId,
      alamat: b.alamat || '',
      telepon: b.telepon || '',
      terdaftar: Date.now(),
      muatan: qr.muatan, // pembanding untuk aturan R4 dan W01
    };
    akun.push(baru);
    simpanJson('akun.json', akun);
    catat({ type: 'AKUN_DIBUAT', akun: id });
    catat({ type: 'SEGEL_TERPASANG', akun: id });
    siarkan({ jenis: 'keadaan' });
    return kirim(res, 200, baru);
  }

  // Status satu aduan. Dipakai perangkat pembeli untuk menunggu putusan
  // petugas tanpa perlu memuat ulang halaman.
  if (metode === 'GET' && jalur.startsWith('/aduan/')) {
    const id = jalur.split('/')[2];
    const a = aduan.find((x) => x.id === id);
    return a ? kirim(res, 200, a) : kirim(res, 404, { galat: 'aduan tidak ditemukan' });
  }

  // Putusan petugas layanan pelanggan.
  if (metode === 'POST' && jalur.startsWith('/aduan/')) {
    // jalur = /aduan/<id>/<aksi>, jadi pecahannya: ['', 'aduan', id, aksi]
    const [, , id, aksi] = jalur.split('/');
    const a = aduan.find((x) => x.id === id);
    if (!a) return kirim(res, 404, { galat: 'aduan tidak ditemukan' });
    if (a.status !== 'baru') return kirim(res, 409, { galat: 'aduan sudah diputus' });
    const { petugas = 'CS-01', catatan = '' } = await badanJson(req);

    if (aksi === 'konfirmasi') {
      const sudahPernah = rantai
        .peristiwaAkun(a.terlapor)
        .some((p) => p.type === 'PENIPUAN_TERKONFIRMASI' && Date.now() - p.ts < 180 * 86400000);
      a.status = 'terkonfirmasi';
      catat({
        type: sudahPernah ? 'PENIPUAN_BERULANG' : 'PENIPUAN_TERKONFIRMASI',
        akun: a.terlapor, aduanId: id, petugas, catatan,
      });
    } else if (aksi === 'tolak') {
      a.status = 'ditolak';
      catat({ type: 'ADUAN_DITOLAK', akun: a.terlapor, aduanId: id, petugas, catatan });
    } else {
      return kirim(res, 404, { galat: 'aksi tidak dikenal' });
    }
    a.diputus = Date.now();
    a.petugas = petugas;
    simpanJson('aduan.json', aduan);
    siarkan({ jenis: 'keadaan' });
    return kirim(res, 200, a);
  }

  // Suntik peristiwa manual, untuk demo dan pengujian tabel poin.
  if (metode === 'POST' && jalur === '/peristiwa') {
    const p = await badanJson(req);
    if (!p.type || !p.akun) return kirim(res, 400, { galat: 'perlu type dan akun' });
    catat(p);
    siarkan({ jenis: 'keadaan' });
    return kirim(res, 200, { ok: true });
  }

  kirim(res, 404, { galat: 'rute tidak dikenal' });
}

// -------------------------------------------------------------------- peladen

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};

let vite = null;
if (!PRODUKSI) {
  const { createServer: createVite } = await import('vite');
  vite = await createVite({ server: { middlewareMode: true }, appType: 'spa' });
}

const tanganiPermintaan = async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
  } catch (e) {
    return kirim(res, 500, { galat: String(e.message || e) });
  }

  if (vite) return vite.middlewares(req, res);

  // Produksi: sajikan hasil build, selain itu kembalikan index.html (SPA).
  let berkas = join('dist', url.pathname === '/' ? 'index.html' : url.pathname.slice(1));
  if (!existsSync(berkas) || !extname(berkas)) berkas = join('dist', 'index.html');
  res.writeHead(200, { 'content-type': MIME[extname(berkas)] || 'application/octet-stream' });
  res.end(readFileSync(berkas));
};

/**
 * Sertifikat mandiri untuk mode HTTPS.
 *
 * Kamera ponsel hanya diizinkan peramban pada konteks aman. Di jaringan lokal
 * tidak ada otoritas sertifikat, jadi kita terbitkan sendiri. Peramban akan
 * memperingatkan bahwa sertifikatnya tidak dikenal, dan itu wajar.
 *
 * ponytail: sertifikat dibuat sekali lalu disimpan, supaya peringatan
 * peramban tidak muncul lagi setiap peladen dijalankan ulang.
 */
async function sertifikat(alamatLan) {
  const berkas = join(DATA, 'sertifikat.json');
  if (existsSync(berkas)) {
    const tersimpan = JSON.parse(readFileSync(berkas, 'utf8'));
    if (tersimpan.untuk === alamatLan.join(',')) return tersimpan;
  }
  // Dimuat hanya saat mode HTTPS dipakai, dan generate() asinkron sejak v5.
  const { generate } = await import('selfsigned');
  const hasil = await generate([{ name: 'commonName', value: 'sasi-qr.local' }], {
    days: 365,
    keySize: 2048,
    extensions: [{
      name: 'subjectAltName',
      altNames: [
        { type: 2, value: 'localhost' },
        { type: 7, ip: '127.0.0.1' },
        ...alamatLan.map((ip) => ({ type: 7, ip })),
      ],
    }],
  });
  if (!hasil?.private || !hasil?.cert) throw new Error('pembuatan sertifikat gagal');
  const isi = { untuk: alamatLan.join(','), key: hasil.private, cert: hasil.cert };
  writeFileSync(berkas, JSON.stringify(isi));
  return isi;
}

const lan = Object.values(networkInterfaces())
  .flat()
  .filter((n) => n && n.family === 'IPv4' && !n.internal)
  .map((n) => n.address);

const AMAN = process.argv.includes('--https');
const skema = AMAN ? 'https' : 'http';
const peladen = AMAN
  ? createServerAman(await sertifikat(lan), tanganiPermintaan)
  : createServer(tanganiPermintaan);

peladen.listen(PORTA, '0.0.0.0', () => {
  console.log('');
  console.log('  SASI-QR siap.');
  console.log('');
  console.log(`  Perangkat ini   ${skema}://localhost:${PORTA}`);
  for (const ip of lan) console.log(`  Perangkat lain  ${skema}://${ip}:${PORTA}`);
  console.log('');
  if (AMAN) {
    console.log('  Kamera ponsel AKTIF.');
    console.log('  Peramban akan bilang sambungan tidak aman: pilih Lanjutkan.');
    console.log('  Itu wajar, sertifikatnya memang diterbitkan sendiri.');
  } else {
    console.log('  Kamera ponsel TIDAK akan jalan di alamat http.');
    console.log('  Hentikan ini, lalu jalankan:  npm run dev:https');
  }
  console.log('');
});
