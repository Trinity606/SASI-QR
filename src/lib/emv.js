// Pengurai muatan EMVCo QR (format yang dipakai QRIS) dan pemeriksa CRC.
// Implementasi ulang dari pseudokode Subbab 4.3.3 laporan riset.
// Tanpa pustaka pihak ketiga: seluruhnya operasi untai sederhana.

/** Urai untai TLV menjadi peta penanda -> nilai. Satu tingkat saja. */
export function urai(s) {
  const hasil = {};
  let i = 0;
  while (i + 4 <= s.length) {
    const penanda = s.slice(i, i + 2);
    const panjang = Number(s.slice(i + 2, i + 4));
    if (!Number.isInteger(panjang) || panjang < 0) return hasil; // muatan cacat
    const nilai = s.slice(i + 4, i + 4 + panjang);
    if (nilai.length < panjang) return hasil; // panjang tidak konsisten
    hasil[penanda] = nilai;
    i += 4 + panjang;
  }
  return hasil;
}

/** CRC-16/CCITT-FALSE atas seluruh untai termasuk "6304". */
export function crc16(s) {
  let reg = 0xffff;
  for (const c of s) {
    reg ^= c.charCodeAt(0) << 8;
    for (let b = 0; b < 8; b++) {
      reg = reg & 0x8000 ? ((reg << 1) ^ 0x1021) & 0xffff : (reg << 1) & 0xffff;
    }
  }
  return reg.toString(16).toUpperCase().padStart(4, '0');
}

export function crcSah(s) {
  const pos = s.lastIndexOf('6304');
  if (pos < 0 || pos + 8 !== s.length) return false;
  return crc16(s.slice(0, pos + 4)) === s.slice(pos + 4).toUpperCase();
}

/** Cari NMID dan golongan usaha pada penanda gabungan 26..51. */
export function ambilNmid(peta) {
  for (let t = 26; t <= 51; t++) {
    const penanda = String(t).padStart(2, '0');
    if (!(penanda in peta)) continue;
    const dalam = urai(peta[penanda]);
    if ((dalam['00'] || '').startsWith('ID.CO.QRIS')) {
      return { nmid: dalam['02'] || '', golongan: dalam['03'] || '' };
    }
  }
  return { nmid: '', golongan: '' };
}

/** Ringkas sebuah muatan QRIS menjadi atribut yang dipakai mesin aturan. */
export function bacaQris(muatan) {
  const peta = urai(muatan);
  const { nmid, golongan } = ambilNmid(peta);
  return {
    muatan,
    crcSah: crcSah(muatan),
    jenisKode: peta['01'] || '', // 11 statis, 12 dinamis
    mataUang: peta['53'] || '',
    negara: peta['58'] || '',
    namaMerchant: peta['59'] || '',
    kota: peta['60'] || '',
    nominal: peta['54'] ? Number(peta['54']) : null,
    nmid,
    golongan,
    akunSasi: peta['80'] || '', // penanda privat milik SASI-QR
  };
}

const tlv = (penanda, nilai) => penanda + String(nilai.length).padStart(2, '0') + nilai;

/**
 * Bangun muatan QRIS tiruan untuk simulasi. Bukan QRIS sungguhan: penanda 80
 * adalah tambahan milik SASI-QR dan tidak akan dikenali aplikasi bank.
 */
export function bangunQris({ nmid, nama, kota, akunSasi, nominal = null, golongan = 'UMI', dinamis = false, ref = '' }) {
  const merchantInfo = tlv('00', 'ID.CO.QRIS.WWW') + tlv('02', nmid) + tlv('03', golongan);
  let s =
    tlv('00', '01') +
    tlv('01', dinamis ? '12' : '11') +
    tlv('26', merchantInfo) +
    tlv('52', '5499') +
    tlv('53', '360') +
    (nominal != null ? tlv('54', String(nominal)) : '') +
    tlv('58', 'ID') +
    tlv('59', nama.slice(0, 25)) +
    tlv('60', kota.slice(0, 15)) +
    (ref ? tlv('62', tlv('01', ref)) : '') +
    tlv('80', akunSasi);
  s += '6304';
  return s + crc16(s);
}

/**
 * Tabel keputusan R1..R9 dari Tabel 7 laporan riset.
 * Aturan dievaluasi berurutan; aturan pertama yang terpenuhi menang.
 */
export function evaluasiAturan({ qr, lapak, nmidDiadukan = [], segelDipindai = false }) {
  if (!qr.crcSah) return { kode: 'E01', warna: 'merah', pesan: 'Kode rusak atau telah diubah. Jangan bayar.' };
  if (qr.mataUang !== '360' || qr.negara !== 'ID')
    return { kode: 'E02', warna: 'merah', pesan: 'Ini bukan QRIS Indonesia.' };
  if (qr.nmid && nmidDiadukan.includes(qr.nmid))
    return { kode: 'E03', warna: 'merah', pesan: 'Kode ini pernah dilaporkan sebagai penipuan.' };

  if (lapak) {
    if (qr.nmid !== lapak.nmid)
      return { kode: 'E04', warna: 'merah', pesan: 'Kode ini bukan milik lapak yang tersegel. Uang akan masuk ke rekening lain.' };
    if (qr.muatan !== lapak.muatan)
      return { kode: 'W01', warna: 'kuning', pesan: 'Kode berubah sejak didaftarkan. Minta pedagang mendaftar ulang.' };
    return { kode: 'A01', warna: 'hijau', pesan: 'Cocok. Aman dibayar.' };
  }

  // Pengguna memindai sebuah segel, tetapi pengenalnya tidak ada di pangkalan.
  // Inilah segel cetakan pelaku. Harus merah, bukan abu-abu: lapak ini justru
  // lebih mencurigakan daripada lapak yang memang tidak bersegel.
  if (segelDipindai)
    return { kode: 'E05', warna: 'merah', pesan: 'Segel tidak terdaftar. Perlakukan lapak ini sebagai belum terverifikasi.' };

  // Segel memang dilewati pengguna.
  if (qr.jenisKode === '12')
    return { kode: 'N01', warna: 'abu', pesan: 'Kode dinamis. Risiko penukaran rendah, tetapi tidak diverifikasi.' };
  return { kode: 'N02', warna: 'abu', pesan: `Belum terdaftar. Periksa nama merchant secara manual: ${qr.namaMerchant || '(kosong)'}.` };
}
