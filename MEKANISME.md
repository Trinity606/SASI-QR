# Mekanisme Kerja SASI-QR

Dokumen ini menjelaskan cara SASI-QR bekerja, dari pendaftaran lapak sampai
aduan diputus petugas. Seluruh keterangan diambil dari kode purwarupa versi
**1.8 (25 September 2026)**.

---

## 1. Gagasan inti

Penipuan QRIS di ruang publik umumnya dilakukan dengan **menukar atau menempel
stiker QR** milik pelaku di atas kode milik pedagang. Pembeli memindai kode
yang tampak sah, lalu uang masuk ke rekening pelaku.

SASI-QR menutup celah itu dengan satu prinsip:

> Kode pembayaran baru dianggap sah bila **cocok dengan segel fisik** yang
> terdaftar untuk lapak tersebut, dan pemeriksaan itu terjadi **sebelum** uang
> berpindah.

SASI-QR bukan aplikasi pembayaran. Ia tidak memindahkan uang dan tidak
terhubung ke bank atau penyelenggara jasa pembayaran mana pun. Tugasnya hanya
memeriksa kode sebelum pembeli membayar di aplikasinya sendiri.

---

## 2. Tiga pihak, tiga tahap PeKA

Alurnya mengikuti kerangka **PeKA** Bank Indonesia. Setiap pihak memakai
perangkatnya sendiri.

| Pihak | Tahap PeKA | Pekerjaannya |
|---|---|---|
| **Pedagang** | Peduli | mendaftarkan lapak, memasang segel, menampilkan kode |
| **Pembeli** | Kenali, Adukan | memindai segel dan kode, membaca putusan, mengadu bila merah |
| **Petugas** | Adukan | memeriksa aduan dan memutuskan |

Pemisahan perangkat ini disengaja. Yang menyatakan sebuah kode menipu adalah
pihak ketiga (petugas), bukan pembeli yang memindai.

### 2.1 Cara perangkat memilih pihaknya

Saat pertama dibuka, aplikasi menanyakan perangkat ini dipakai siapa. Setelah
dipilih, perangkat **terkunci** pada pihak itu dan tidak lagi menampilkan
pekerjaan pihak lain. Pilihannya tersimpan di perangkat, sehingga pada
pembukaan berikutnya aplikasi langsung masuk ke pekerjaannya.

Penguncian ini bukan pembatasan teknis, melainkan keputusan rancangan. Versi
sebelumnya menaruh ketiga pekerjaan dalam satu aplikasi bernavigasi, dan saat
diperagakan penonton tidak bisa melihat pihak mana yang sedang bekerja.

Ada dua cara berpindah pihak.

| Cara | Langkah | Kapan dipakai |
|---|---|---|
| Tombol | gulir ke paling bawah, tekan **Ganti pihak** pada baris *Perangkat ini: X* | saat memutuskan di tengah pemakaian |
| Alamat | buka `/pedagang`, `/pembeli`, atau `/petugas` | saat menyiapkan tiga perangkat sebelum demo |

Alamat selalu menang atas pilihan yang tersimpan. Tombolnya sengaja diletakkan
di ujung bawah isi, bukan di kepala, supaya tidak terpencet saat demo berjalan.

---

## 3. Komponen sistem

```
┌────────────────────────────┐      ┌────────────────────────────┐
│ 1. ARTEFAK FISIK           │      │ 2. KLIEN (ponsel)          │
│ segel cetak bernomor,      │─────▶│ pemindai QR                │
│ ditempel di lapak          │      │ pengurai QRIS + CRC-16     │
└────────────────────────────┘      │ tabel keputusan R1..R9     │
                                    │ salinan data lapak         │
                                    │ antrean aduan luring       │
                                    └─────────────┬──────────────┘
                                                  │ hanya untuk menyegarkan
                                                  │ salinan dan mengirim aduan
                                    ┌─────────────▼──────────────┐
                                    │ 3. PELADEN                 │
                                    │ menyimpan data lapak       │
                                    │ menerima aduan             │
                                    │ rantai catatan (hash)      │
                                    │ aliran kabar ke perangkat  │
                                    └────────────────────────────┘
```

**Pembagian tanggung jawab yang paling penting:** seluruh putusan dihitung di
ponsel. Peladen hanya menyimpan dan menyajikan data, tidak pernah memutuskan
apakah sebuah kode aman.

### 3.1 Segel

Segel adalah stiker bernomor unik (contoh `SL7K2M9Q`) yang ditempel di lapak.
Saat pendaftaran, nomor segel diikat ke dua hal milik pedagang:

- **NMID**, nomor identitas merchant yang tertulis di dalam kode QRIS;
- **muatan** lengkap kode QRIS pedagang, yang menjadi pembanding.

Ikatan inilah yang membuat penukaran stiker ketahuan. Pelaku bisa menempel
kode baru, tetapi NMID di kodenya tidak akan cocok dengan NMID yang terikat
pada segel.

### 3.2 Salinan data di perangkat

Saat aplikasi dibuka dan jaringan tersedia, ponsel mengambil salinan data dari
peladen (`GET /api/salinan`) lalu menyimpannya di perangkat. Salinan berisi:

- daftar lapak beserta nomor segel, NMID, dan muatannya;
- daftar NMID yang sudah **terkonfirmasi** menipu oleh petugas.

Satu lapak memakan sekitar **333 byte**, sehingga salinan untuk 30 lapak
berukuran sekitar **9,8 KB**.

Angka ini perlu dinyatakan apa adanya: Tabel 9 laporan riset menetapkan target
di bawah 8 KB, dan purwarupa saat ini sedikit melewatinya. Penyebabnya muatan
QRIS lengkap ikut disalin, dan memang muatan itulah yang dibutuhkan aturan R5
untuk membandingkan kode. Bila batas 8 KB dianggap mengikat, yang bisa dipangkas
adalah menyimpan cap ringkas muatan saja, bukan muatan penuhnya.

---

## 4. Alur kerja langkah demi langkah

### 4.1 Pendaftaran lapak (Peduli)

1. Pedagang memindai kode QRIS miliknya. Aplikasi mengurai isinya dan
   menampilkan NMID serta nama merchant untuk diperiksa.
2. Pedagang mengisi nama lapak yang dikenal pembeli, alamat, dan telepon.
3. Pedagang memindai kode segel yang akan ditempel, lalu mengikatnya.

Peladen mencatat pendaftaran itu sebagai blok pada rantai (`AKUN_DIBUAT` dan
`SEGEL_TERPASANG`). Sejak saat itu, kode apa pun yang berbeda di atas segel
tersebut langsung memicu putusan merah. Tidak ada masa belajar dan tidak perlu
basis data pelaku.

### 4.2 Verifikasi dua pindai (Kenali)

```
  PINDAI 1: SEGEL           PINDAI 2: KODE BAYAR        PUTUSAN
  ambil nomor segel,   ──▶  urai isi QRIS,         ──▶  tabel aturan
  cari lapak yang           periksa CRC-16,             R1..R9,
  terikat di salinan        ambil NMID                  satu kode aturan
```

1. **Pindai segel.** Aplikasi mencari lapak yang terikat pada nomor segel itu
   di salinan lokal.
2. **Jeda 1,5 detik.** Pemindai menahan diri agar kamera yang masih mengarah
   ke segel tidak membacanya lagi sebagai kode bayar. Kode segel yang terbaca
   pada langkah kedua ditolak.
3. **Pindai kode pembayaran.** Aplikasi mengurai struktur QRIS (format EMV TLV),
   memeriksa CRC-16, lalu mengambil NMID, mata uang, negara, dan jenis kode.
4. **Putusan.** Tabel aturan dijalankan berurutan. Aturan pertama yang
   terpenuhi menentukan hasil.

Tidak ada permintaan jaringan di sepanjang langkah ini.

### 4.3 Tabel keputusan R1 sampai R9

| Urutan | Syarat | Kode | Warna | Arti bagi pembeli |
|---|---|---|---|---|
| R1 | CRC-16 tidak sah | **E01** | merah | kode rusak atau telah diubah, jangan bayar |
| R2 | mata uang bukan 360 atau negara bukan ID | **E02** | merah | bukan QRIS Indonesia |
| R3 | NMID ada di daftar aduan terkonfirmasi | **E03** | merah | kode ini pernah dilaporkan sebagai penipuan |
| R4 | segel terdaftar, NMID berbeda | **E04** | merah | kode bukan milik lapak ini, uang akan masuk ke rekening lain |
| R5 | segel terdaftar, NMID sama, muatan berbeda | **W01** | kuning | kode berubah sejak didaftarkan, minta pedagang daftar ulang |
| R6 | segel terdaftar, NMID dan muatan sama | **A01** | hijau | cocok, aman dibayar |
| R7 | segel dipindai tetapi tidak terdaftar | **E05** | merah | segel palsu, perlakukan lapak sebagai belum terverifikasi |
| R8 | segel dilewati, kode dinamis | **N01** | abu | risiko penukaran rendah, tetapi tidak diverifikasi |
| R9 | segel dilewati, kode statis | **N02** | abu | belum terdaftar, periksa nama merchant secara manual |

Tiga hal tentang tabel ini:

- **Deterministik.** Tidak ada model statistik, bobot, atau ambang yang perlu
  dikalibrasi. Setiap putusan bisa ditunjuk ke satu aturan.
- **Urutan menentukan.** Kode rusak (R1) diperiksa sebelum apa pun, dan daftar
  hitam (R3) diperiksa sebelum pencocokan segel (R4).
- **Segel palsu lebih berbahaya daripada tanpa segel.** Karena itu E05 merah,
  sedangkan lapak tanpa segel hanya abu.

### 4.4 Setelah putusan

| Warna | Yang tersedia di layar |
|---|---|
| Hijau (A01) | tombol **Bayar sekarang** (simulasi) |
| Kuning (W01) | tetap bisa lanjut, dengan anjuran agar pedagang mendaftar ulang |
| Merah (E01 sampai E05) | **tidak ada tombol bayar**, hanya tombol **Adukan kode ini** |
| Abu (N01, N02) | anjuran memeriksa nama merchant secara manual |

Pada putusan merah, tombol bayar memang dihilangkan. Verifikasi gagal berarti
tidak ada jalan membayar lewat SASI-QR, bukan sekadar peringatan yang bisa
diabaikan.

### 4.5 Pembayaran simulasi

Pembayaran di purwarupa adalah **tiruan pemberitahuan** aplikasi pembayaran,
bukan pemindahan dana. Saldo dan riwayat di ponsel pembeli hanya simulasi.

Saat pembeli menekan bayar, peladen mencatat blok `PEMBAYARAN` pada rantai dan
perangkat pedagang langsung menerima pemberitahuan. Pembayaran yang lolos
verifikasi penuh (A01) juga menambah satu poin skor pedagang.

### 4.6 Aduan (Adukan)

1. Dari layar merah, pembeli menekan **Adukan kode ini**, mengisi kronologi
   singkat, lalu mengirim.
2. Aduan otomatis memuat NMID, cap muatan (delapan karakter terakhir kode),
   nomor segel, kode aturan yang aktif, dan waktu.
3. Aduan masuk ke perangkat petugas. Spanduk merah **aduan baru masuk** muncul
   sendiri tanpa halaman dimuat ulang.
4. Layar pembeli tidak berhenti di "terkirim", tetapi menampilkan perjalanan
   aduan dan menunggu keputusan petugas.

**Aduan atas kode rusak (E01, E02) tidak dilekatkan ke akun mana pun.** Kode
yang gagal CRC mungkin masih memuat penanda pemilik, tetapi penanda itu berada
di dalam muatan yang sudah terbukti tidak utuh. Aturan ini melindungi pedagang
jujur yang stikernya tercoret atau rusak.

### 4.7 Putusan petugas dan umpan balik

```
petugas menekan "Konfirmasi penipuan"
        │
        ├──▶ blok PENIPUAN_TERKONFIRMASI dicatat, skor pedagang turun
        │
        ├──▶ NMID masuk daftar aduan terkonfirmasi di peladen
        │
        └──▶ peladen menyiarkan kabar ke seluruh perangkat
                    │
                    ├──▶ layar pembeli berubah sendiri:
                    │    "Petugas mengonfirmasi penipuan"
                    │
                    └──▶ semua perangkat menyegarkan salinannya,
                         pemindai berikutnya langsung melihat E03
```

Satu aduan yang dikonfirmasi melindungi setiap pembeli sesudahnya. Bila petugas
menolak aduan, pedagang yang diadukan justru mendapat pemulihan skor.

---

## 5. Bekerja tanpa internet

| Bagian | Dengan jaringan | Tanpa jaringan |
|---|---|---|
| Verifikasi dua pindai | jalan | **tetap jalan**, memakai salinan di perangkat |
| Putusan R1 sampai R9 | dihitung di ponsel | dihitung di ponsel |
| Kirim aduan | langsung terkirim | **masuk antrean**, terkirim sendiri saat jaringan kembali |
| Daftar aduan terkonfirmasi | diperbarui langsung lewat aliran kabar | memakai salinan terakhir |

Aplikasi membedakan dua jenis kegagalan kirim aduan. Jaringan putus berarti
aduan diantrekan. Penolakan dari peladen (misalnya data tidak lengkap)
ditampilkan sebagai pesan, bukan diantrekan, karena mengirim ulang aduan yang
ditolak hanya akan ditolak lagi.

---

## 6. Skor kepercayaan dan rantai catatan

### 6.1 Rantai catatan

Setiap peristiwa penting (pendaftaran, pembayaran, aduan, putusan petugas)
dicatat sebagai blok. Setiap blok memuat hash SHA-256 blok sebelumnya, sehingga
mengubah satu catatan lama diam-diam akan memutus rantai dan langsung ketahuan
saat diverifikasi.

Batasannya: purwarupa memakai satu simpul tanpa konsensus. Rantai ini mampu
mendeteksi penyuntingan, tetapi belum mampu menahan operator yang menulis ulang
seluruh berkas.

### 6.2 Skor pedagang

Skor dihitung dengan memutar ulang seluruh peristiwa akun dari rantai. Akun
baru mulai dari 60, dengan rentang 0 sampai 100.

| Peristiwa | Poin |
|---|---|
| Segel fisik terdaftar | +10 (sekali) |
| Identitas terverifikasi | +5 (sekali) |
| Transaksi bersih (A01) | +1 (paling banyak 5 per hari, 20 per bulan) |
| Aduan ditolak petugas | +8 |
| Aduan masuk, menunggu pemeriksaan | −10 |
| Penipuan terkonfirmasi | −40 |
| Penipuan kedua dalam 180 hari | −70 |

Setelah penipuan terkonfirmasi, skor tidak bisa naik di atas 49 selama 90 hari.

**Skor bukan penentu putusan.** Skor tidak dipakai pada jalur verifikasi dan
tidak tampil pada putusan hijau. Putusan tetap berasal dari satu aturan di
tabel R1 sampai R9. Skor hanya menjadi alat kerja petugas dan menjadi sumber
daftar aduan terkonfirmasi untuk aturan R3.

---

## 7. Batasan purwarupa

- Pembayaran dan saldo adalah simulasi, tidak ada dana yang berpindah.
- Tidak memakai nama, logo, atau aset milik penyedia dompet digital mana pun.
- Rantai catatan masih satu simpul.
- Pendaftaran Service Worker untuk membuka aplikasi dari keadaan tertutup tanpa
  jaringan **belum teruji di ponsel**. Verifikasi luring tidak bergantung
  padanya: salinan data sudah berada di perangkat sebelum jaringan diputus.
- Service Worker hanya didaftarkan pada HTTPS, yaitu keadaan yang dipakai di
  ponsel. Pada `localhost` ia sempat menyajikan modul basi setelah peladen
  dinyalakan ulang, sehingga perubahan kode tidak muncul tanpa satu pun tanda
  peringatan. Sejak versi 1.8, pendaftaran lama di `localhost` justru dicabut
  otomatis saat halaman dibuka.
