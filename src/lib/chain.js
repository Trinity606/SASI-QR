// Rantai blok sederhana untuk jejak transaksi SASI-QR.
//
// Yang diberikan: urutan yang tidak bisa disunting diam-diam. Setiap blok
// mengunci hash blok sebelumnya, jadi mengubah satu catatan lama memaksa
// perhitungan ulang seluruh blok sesudahnya, dan itu langsung ketahuan oleh
// verifikasi().
//
// ponytail: satu simpul, tanpa proof-of-work, tanpa konsensus. Ini cukup untuk
// mendeteksi penyuntingan, bukan untuk menahan operator yang jahat, karena
// operator dapat menulis ulang seluruh berkas. Naikkan ke beberapa simpul atau
// ke penambatan hash harian ke rantai publik bila model ancamannya memang
// mencakup operator.

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const sha256 = (s) => createHash('sha256').update(s).digest('hex');

export const hashBlok = (b) =>
  sha256(`${b.indeks}|${b.waktu}|${b.prevHash}|${JSON.stringify(b.peristiwa)}`);

const BLOK_ASAL = {
  indeks: 0,
  waktu: 0,
  prevHash: '0'.repeat(64),
  peristiwa: [{ type: 'ASAL', catatan: 'Blok asal SASI-QR' }],
};
BLOK_ASAL.hash = hashBlok(BLOK_ASAL);

export class Rantai {
  constructor(berkas) {
    this.berkas = berkas;
    if (existsSync(berkas)) {
      this.blok = JSON.parse(readFileSync(berkas, 'utf8'));
    } else {
      this.blok = [BLOK_ASAL];
      this.simpan();
    }
  }

  simpan() {
    mkdirSync(dirname(this.berkas), { recursive: true });
    writeFileSync(this.berkas, JSON.stringify(this.blok, null, 2));
  }

  /** Tambahkan satu peristiwa sebagai blok baru. Mengembalikan blok itu. */
  tambah(peristiwa) {
    const sebelum = this.blok[this.blok.length - 1];
    const blok = {
      indeks: sebelum.indeks + 1,
      waktu: peristiwa.ts ?? Date.now(),
      prevHash: sebelum.hash,
      peristiwa: [peristiwa],
    };
    blok.hash = hashBlok(blok);
    this.blok.push(blok);
    this.simpan();
    return blok;
  }

  /** Telusuri ulang seluruh rantai. Mengembalikan indeks blok pertama yang rusak. */
  verifikasi() {
    for (let i = 0; i < this.blok.length; i++) {
      const b = this.blok[i];
      if (hashBlok(b) !== b.hash) return { sah: false, rusakPada: i, sebab: 'hash blok tidak cocok' };
      if (i > 0 && b.prevHash !== this.blok[i - 1].hash)
        return { sah: false, rusakPada: i, sebab: 'tautan ke blok sebelumnya putus' };
      if (i > 0 && b.indeks !== this.blok[i - 1].indeks + 1)
        return { sah: false, rusakPada: i, sebab: 'nomor blok melompat' };
    }
    return { sah: true, panjang: this.blok.length, kepala: this.blok[this.blok.length - 1].hash };
  }

  /** Seluruh peristiwa, terurut menaik. */
  peristiwa() {
    return this.blok.flatMap((b) => b.peristiwa.map((p) => ({ ...p, ts: p.ts ?? b.waktu, blok: b.indeks })));
  }

  /** Peristiwa milik satu akun, untuk diputar ulang oleh mesin skor. */
  peristiwaAkun(akun) {
    return this.peristiwa().filter((p) => p.akun === akun);
  }
}
