# RENCANA WEBSITE DEMO SASI-QR
## Penyusunan ulang mengikuti rancangan awal

**Versi** 1.8, 25 September 2026

> **Perubahan 1.8.** Cangkang dirampingkan. Kepala besar dengan angka hanya
> muncul di beranda; di layar kerja kepala menyusut satu baris, sehingga
> pemindai dan kode QR pedagang terlihat tanpa menggulir. Kisi empat ikon
> dihapus karena mengulang navigasi bawah, dan tombol yang tidak menuju ke
> mana pun ikut dibuang: pembeli tiga tab (Beranda, Periksa, Riwayat), petugas
> tiga tab (Skor, Aduan, Rantai), pedagang tanpa navigasi. Pita status hanya
> tampil saat luring. Penafian simulasi cukup sekali per alur. Rincian teknis
> pada layar putusan kini terlipat. Warna kuning pada kode W01 dan lencana
> diganti ke `--warn` (kontras 2,75:1 menjadi 8,81:1). Mono kini benar-benar
> hanya untuk data.

> **Perubahan 1.7.** Seluruh antarmuka dipindahkan ke tema gelap dengan kepala
> bergradasi biru, mengikuti tangkapan layar referensi yang diberikan tim.
> Ketiga pihak kini memakai satu cangkang yang sama persis, yaitu
> `components/Cangkang.jsx`: kepala bergradasi dengan satu angka besar, pita
> status, panel membulat berisi kisi empat ikon, dan navigasi bawah dengan
> tombol bundar menonjol di tengah. Huruf antarmuka diganti ke Plus Jakarta
> Sans; mono hanya disisakan untuk data teknis yang harus berbaris lurus.
> Yang tetap tidak diambil adalah nama, logo, dan wordmark penyedia dompet
> digital mana pun; wordmark tetap SASI-QR.

> **Perubahan 1.6.** Perangkat pembeli memakai cangkangnya sendiri bergaya
> aplikasi dompet digital: kepala bergradasi dengan saldo, panel isi membulat,
> kisi empat ikon, dan navigasi bawah dengan tombol pindai bundar di tengah.
> Ditambahkan dompet simulasi yang tersimpan di perangkat, beserta halaman
> riwayat. Batas Bagian 3.2 tetap berlaku: yang diadopsi adalah konvensi
> antarmukanya, bukan identitas penyedia dompet digital mana pun. Tab Aduan
> yang dibuka tanpa hasil pemindaian kini memandu ke pemindai, bukan buntu.

> **Perubahan 1.5, tiga cacat pada jalur aduan.** Pertama, tombol Kirim aduan
> mati permanen pada kode `E01` karena syaratnya menuntut NMID, padahal kode
> rusak memang tidak punya NMID; cap muatan kini dipakai sebagai pengenal
> pengganti. Kedua, penolakan 400 dari peladen diperlakukan sebagai jaringan
> putus, sehingga aduan tak sah masuk antrean dan dicoba ulang selamanya;
> kegagalan jaringan dan penolakan peladen kini dibedakan. Ketiga, aduan atas
> muatan yang gagal CRC sempat dilekatkan ke akun berdasarkan penanda di dalam
> muatan rusak itu sendiri, yang berarti menghukum pedagang jujur; aturan `E01`
> dan `E02` kini tidak pernah menuding akun mana pun.

> **Perubahan 1.4.** Petugas menjadi perangkat setara, bukan lagi tautan yang
> tidak pernah mengunci. Memilih Petugas di layar pembuka kini mengunci
> perangkat seperti dua pihak lain, dengan cangkang, penanda tahap, dan tombol
> Ganti pihak yang sama. Ditambahkan spanduk aduan baru yang melacak nomor
> aduan, bukan selisih jumlah, karena selisih gagal menghitung ketika satu
> aduan diputus bersamaan dengan aduan lain yang masuk.

> **Perubahan 1.3.** Perangkat pedagang kini berlangganan sesi meja kasir dan
> berpindah halaman sendiri ketika segelnya dipindai, lalu menerima
> pemberitahuan saat pembeli membayar. Simulasi pembayaran yang dihapus pada
> Bagian 5.4 **dihidupkan kembali atas permintaan tim**, tetapi dengan batas
> yang tegas: yang ditiru adalah pemberitahuan aplikasi pembayaran, bukan
> pemindahan dana, dan kalimat itu tercetak di layar pembeli maupun pedagang.
> Tombol bayar tidak pernah muncul pada putusan merah.

> **Perubahan 1.2, atas masukan demo kedua.** Tiga perbaikan. Pertama,
> pemindai diberi jeda 1,5 detik antar langkah karena kode segel terbaca dua
> kali oleh kamera yang belum sempat dipindahkan. Kedua, perangkat pembeli
> ternyata **tidak pernah menyegarkan salinannya** kecuali saat dimuat, sehingga
> putusan petugas tidak pernah sampai dan aturan R3 tidak pernah aktif selama
> demo; ketiga perangkat kini berlangganan aliran kabar peladen. Ketiga, layar
> pembeli sesudah mengadu tidak lagi berhenti di "terkirim", melainkan
> menampilkan perjalanan aduan dan berubah sendiri saat petugas memutuskan.

> **Perubahan 1.1, atas masukan demo.** Struktur tiga tab PeKA dalam satu
> aplikasi ternyata membingungkan saat diperagakan: pembicara harus melompat
> antar tab di perangkat yang sama, dan penonton tidak bisa melihat pihak mana
> yang sedang bekerja. Navigasi diganti menjadi **satu perangkat, satu pihak**:
> `/pedagang`, `/pembeli`, `/petugas`. Kerangka PeKA tetap terlihat sebagai
> nama tahap pada tiap layar, bukan sebagai menu. Sistem aduan dipisah tegas:
> pembeli mengadu, petugas memutus, di perangkat berbeda. Tab Adukan yang
> kosong sampai ada hasil pemindaian dihapus karena merupakan jalan buntu.
**Menggantikan** struktur tiga peran pada purwarupa 0.1
**Acuan mengikat** `Draf_Presentasi_SASI-QR.md` baris 106 sampai 167, `Laporan_Riset_Inovasi_SASI-QR.md` Subbab 4.3.1 dan 4.3.2, `DESIGN.md` Bagian 6.4 dan 6.5

---

## 1. Mengapa disusun ulang

Purwarupa 0.1 menyimpang dari rancangan awal pada empat titik. Keempatnya dicatat di sini agar tidak terulang.

| No | Rancangan awal | Purwarupa 0.1 | Akibatnya |
|---|---|---|---|
| 1 | Struktur **PeKA**: Peduli, Kenali, Adukan | Struktur peran: Bayar, Terima, Petugas | Naskah pembicara 3 menyebut PeKA, tetapi aplikasinya tidak memperlihatkannya. Juri Bank Indonesia menilai keselarasan dengan kerangka PeKA. |
| 2 | Putusan di **sisi klien**, jalan tanpa internet | Putusan di peladen | Janji "verifikasi tidak butuh internet" pada naskah panggung dan tanya jawab tidak terpenuhi. |
| 3 | Layar verifikasi per **DESIGN.md 6.5** | Kartu skor bergaya dompet digital | Purwarupa dan deck presentasi terlihat seperti dua karya berbeda. |
| 4 | Demo panggung **di bawah 30 detik**, satu alur | Aplikasi bercabang dengan pemilihan peran | Setiap percabangan adalah peluang tersesat di atas panggung. |

**Titik nomor 2 adalah yang paling serius.** Subbab 4.3.1 laporan riset menyatakan bahwa seluruh pengambilan keputusan terjadi di lapis klien, sehingga putusan tetap dihasilkan meskipun jaringan tidak tersedia. Ini bukan detail teknis, melainkan salah satu jawaban tanya jawab yang sudah disiapkan. Rencana ini mengembalikannya.

---

## 2. Prinsip yang mengikat rancangan ulang

Lima prinsip berikut diturunkan dari dokumen yang sudah ada, bukan dibuat baru. Setiap keputusan rancangan pada bagian selanjutnya harus dapat ditelusuri ke salah satunya.

**P1. Tabel keputusan adalah inti, dan tetap deterministik.** R1 sampai R9 yang memutuskan. Tidak ada model statistik, tidak ada pembobotan, tidak ada ambang batas yang perlu dikalibrasi di jalur utama. Setiap putusan dapat ditunjuk ke satu aturan tunggal.

**P2. Verifikasi berjalan tanpa jaringan.** Salinan pangkalan lapak berada di perangkat. Peladen hanya menyimpan dan menyajikan, tidak pernah memutuskan.

**P3. Tiga tahap PeKA, bukan tiga peran.** Peduli, Kenali, Adukan. Urutan ini yang disebut di naskah panggung dan yang dinilai juri.

**P4. Satu voltase per layar.** Warna `primary` muncul paling banyak sekali per layar. Diwarisi dari `DESIGN.md` Bagian 1.

**P5. Demo panggung harus selesai di bawah 30 detik.** Jalur demo tidak boleh melewati satu pun menu, pemilihan, atau layar pengantar.

---

## 3. Peta situs

```
                        ┌─────────────────┐
                        │  BERANDA        │
                        │  tiga kartu     │
                        │  PeKA           │
                        └────────┬────────┘
             ┌───────────────────┼───────────────────┐
             ▼                   ▼                   ▼
      ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
      │ 1. PEDULI   │     │ 2. KENALI   │     │ 3. ADUKAN   │
      │ pita #9fbbe0│     │ pita #c0a8dd│     │ pita #c08532│
      ├─────────────┤     ├─────────────┤     ├─────────────┤
      │ daftarkan   │     │ pindai segel│     │ satu ketuk  │
      │ lapak       │     │ pindai QRIS │     │ aduan       │
      │ pasang segel│     │ PUTUSAN     │     │ teks resmi  │
      │ tampilkan   │     │             │     │ skor akibat │
      │ kode        │     │             │     │ aduan       │
      └─────────────┘     └──────┬──────┘     └─────────────┘
                                 │
                                 │  ← JALUR DEMO PANGGUNG
                                 │     masuk langsung ke sini
                                 ▼
                        ┌─────────────────┐
                        │ LAYAR VERIFIKASI│
                        │ DESIGN.md 6.5   │
                        └─────────────────┘

      ┌──────────────────────────────────────────────┐
      │  KONSOL PETUGAS   (di luar alur PeKA)        │
      │  tidak ditampilkan di beranda                │
      │  dibuka lewat alamat /petugas                │
      └──────────────────────────────────────────────┘
```

**Konsol petugas sengaja dikeluarkan dari beranda.** Konsol bukan bagian dari kerangka PeKA dan bukan sesuatu yang dipakai pembeli maupun pedagang. Menempatkannya sebagai kartu keempat akan merusak triad yang justru ingin ditunjukkan kepada juri. Konsol tetap ada, tetapi diakses lewat alamat langsung.

### 3.1 Pemetaan warna tahap

| Tahap | Token `DESIGN.md` | Nilai | Dasar |
|---|---|---|---|
| Peduli | `stage-solusi` | `#9fbbe0` | pendaftaran adalah bagian dari solusi yang ditawarkan |
| Kenali | `stage-hasil` | `#c0a8dd` | verifikasi adalah hasil kerja yang diperlihatkan |
| Adukan | `stage-dampak` | `#c08532` | aduan menghasilkan dampak bagi pemindai berikutnya |

Ketiga warna hanya dipakai sebagai pita setinggi 3 pt di tepi atas kartu, tidak pernah sebagai warna teks maupun latar besar, sesuai `DESIGN.md` Bagian 4.2.

---

## 3.2 Bahasa visual: dompet digital

Keputusan tim: purwarupa harus terasa seperti aplikasi dompet digital sungguhan, bukan seperti halaman dokumen. Alasannya kuat dan perlu dicatat, yaitu seluruh gagasan SASI-QR bertumpu pada verifikasi yang terjadi **di dalam momen pembayaran**. Bila purwarupa terlihat seperti aplikasi pembayaran, juri langsung memahami di mana alat ini bekerja tanpa perlu dijelaskan.

### Yang diadopsi

Konvensi antarmuka dompet digital bersifat umum dan dipakai hampir seluruh aplikasi sejenis.

| Unsur | Bentuk |
|---|---|
| Kepala aplikasi | bidang berwarna gelap, membawa nama dan saldo |
| Kartu saldo | kartu membulat yang menumpuk di atas batas kepala |
| Lembar isi | permukaan putih membulat besar di bagian bawah |
| Pemindai | kamera layar penuh, lapisan gelap, lubang persegi dengan bingkai sudut |
| Lembar konfirmasi | naik dari bawah, foto bulat penerima, nominal besar |
| Tombol utama | tinggi 52 pt, radius besar, satu per layar |
| Navigasi bawah | tiga tab PeKA |

### Yang tidak diadopsi

Nama, logo, wordmark, ikon aplikasi, susunan warna merek, dan aset milik penyedia dompet digital mana pun. Identitas tetap SASI-QR.

Alasannya bukan sekadar kehati-hatian. Karya ini dinilai juri Bank Indonesia, yang mengawasi penyelenggara jasa pembayaran. Purwarupa yang memakai identitas salah satu penyelenggara akan terbaca sebagai peniruan, dan itu merugikan tim tanpa memberi keuntungan apa pun. Tampilan yang meyakinkan berasal dari konvensi antarmukanya, bukan dari logonya.

### Warna

| Peran | Token | Nilai | Catatan |
|---|---|---|---|
| Kepala aplikasi | `ink` | `#26251e` | bidang gelap, memberi kesan aplikasi finansial |
| Aksen dan tombol utama | `primary-active` | `#d04200` | sudah menjadi milik SASI-QR di `DESIGN.md` |
| Permukaan isi | `surface-card` | `#ffffff` | |
| Latar | `canvas` | `#f7f7f4` | |
| Keadaan | `semantic-*` | tidak berubah | hijau, kuning, merah, abu |

Seluruh nilai diambil dari `DESIGN.md` Bagian 4.1. Tidak ada warna baru yang diperkenalkan, sehingga purwarupa dan deck presentasi tetap satu keluarga.

### Penyesuaian terhadap DESIGN.md

Dua aturan sistem desain dilonggarkan khusus untuk purwarupa, dan hanya untuk purwarupa.

| Aturan | Di deck | Di purwarupa | Alasan |
|---|---|---|---|
| Tanpa bayangan | tetap berlaku | bayangan halus diizinkan pada lembar dan kartu saldo | tanpa kedalaman, lembar yang naik dari bawah tidak terbaca sebagai lembar |
| Radius `lg` dan `xl` tidak dipakai | tetap berlaku | diizinkan pada lembar dan tombol utama | radius kecil pada antarmuka sentuh terbaca sebagai halaman web, bukan aplikasi |

Kedua pelonggaran ini **tidak berlaku pada slide**. Deck presentasi tetap mengikuti `DESIGN.md` sepenuhnya. Tangkapan layar purwarupa masuk ke slide di dalam bingkai ponsel, sehingga bayangan dan radius besar berada di dalam bingkai itu, bukan di bidang slide.

### Layar verifikasi tetap mengikuti 6.5

Gaya dompet digital mengubah **cangkang** aplikasi, bukan isi layar verifikasi. Susunan informasi pada Bagian 4.4 tetap berlaku apa adanya, yaitu pita keadaan di atas, nama merchant, NMID mono, jenis kode, lalu kode aturan berdampingan dengan status. Kode aturan `A01` dan `E04` tetap wajib terbaca dari jarak delapan meter.

Yang berubah hanya wadahnya: layar verifikasi kini muncul sebagai lembar yang naik dari bawah, bukan sebagai kartu di tengah halaman.

---

## 4. Rincian tiap layar

### 4.1 Beranda

**Tujuan.** Memperlihatkan kerangka PeKA dalam satu pandangan, lalu menyingkir.

| Unsur | Isi | Komponen |
|---|---|---|
| Eyebrow | `SISTEM VERIFIKASI QRIS` | `label` 10 pt mono |
| Judul | SASI-QR | `display` |
| Kalimat pembuka | satu kalimat, maksimal dua baris | `body` |
| Triad | tiga kartu Peduli, Kenali, Adukan | `DESIGN.md` 6.4 |
| Kaki | penanda luring, jumlah lapak dalam salinan | `source` 9 pt mono |

**Yang tidak ada di beranda.** Tidak ada pemilihan peran, tidak ada pemilihan akun, tidak ada statistik sistem. Ketiganya ada di purwarupa 0.1 dan ketiganya menambah langkah sebelum juri melihat gagasan utama.

**Penanda luring di kaki halaman.** Menampilkan `SALINAN 30 LAPAK · LURING SIAP` ketika salinan pangkalan sudah tersimpan di perangkat. Ini bukti visual atas klaim tanpa internet, dan dapat ditunjuk saat tanya jawab.

### 4.2 Tahap 1, Peduli

**Tujuan.** Mendaftarkan lapak dan mengikatnya ke segel fisik.

Tiga layar berurutan.

| Layar | Isi | Keluaran |
|---|---|---|
| 1.1 Pindai QRIS lapak | pemindai, atau tempel manual | muatan terurai, atribut tampil untuk diperiksa pedagang |
| 1.2 Lengkapi data | nama tampilan, alamat lapak, telepon | rekaman lapak |
| 1.3 Pasang segel | pindai kode segel, atau masukkan enam karakter cadangan | ikatan `seal_id` ke NMID dan cap muatan |

**Layar 1.3 menampilkan ringkasan pengikatan**, yaitu NMID, cap muatan delapan karakter terakhir, dan nomor segel, ketiganya dalam `JetBrains Mono`. Ringkasan ini yang membuat pedagang mengerti apa yang baru saja didaftarkan atas namanya.

**Mode tampilkan kode.** Di dalam Peduli, bukan sebagai tahap terpisah, tersedia tombol untuk menampilkan kode segel dan kode pembayaran di layar. Inilah pengganti peran Terima pada purwarupa 0.1. Alasan pemindahannya: menampilkan kode adalah pekerjaan lapak yang sudah didaftarkan, jadi tempatnya di Peduli, bukan menjadi cabang sendiri di beranda.

### 4.3 Tahap 2, Kenali

**Tujuan.** Alur dua pindai dan putusan. Inilah layar yang dipakai di panggung.

```
2.1 PINDAI SEGEL          2.2 PINDAI QRIS           2.3 PUTUSAN
    ambil NMID dan            urai TLV,                 tabel keputusan
    cap muatan yang           periksa CRC,              9 aturan,
    benar untuk lapak         ambil NMID                deterministik
```

Ketiga kotak ini adalah komponen yang sama dengan Blok 2 pada Halaman 3 deck presentasi, sehingga slide dan aplikasi memperlihatkan bentuk yang identik. Juri yang baru melihat slide akan langsung mengenalinya.

**Indikator langkah.** Satu baris `label` 10 pt mono di atas pemindai: `LANGKAH 1 DARI 2 · PINDAI SEGEL`. Tanpa indikator ini, pengguna tidak tahu masih ada pindai kedua.

**Tombol lewati segel.** Tetap disediakan, karena lapak yang belum tersegel harus tetap dapat diperiksa dan jatuh ke aturan N01 atau N02. Ditempatkan di bawah pemindai dengan bobot visual rendah, bukan sebagai tombol utama.

### 4.4 Layar verifikasi, mengikuti DESIGN.md 6.5

Inilah layar yang paling menentukan dan yang paling menyimpang pada purwarupa 0.1. Spesifikasinya diambil apa adanya dari sistem desain.

```
┌──────────────────────────┐
│ ██████████████████████   │ ← pita atas 6 pt
│                          │    semantic-success #1f8a65
│  WARUNG MAMA ANI         │    atau semantic-error #cf2d56
│  subhead 18 pt, ink      │
│                          │
│  ID1024567890123         │ ← data 12 pt mono
│  NMID TERDAFTAR          │ ← label 10 pt mono, muted
│                          │
│  KODE STATIS  ·  TAG 01  │ ← label 10 pt mono
│                          │
│  ─────────────────────   │ ← hairline 0,75 pt
│                          │
│  A01   AMAN DIBAYAR      │ ← subhead berwarna semantik
│                          │
│  Cocok. Aman dibayar.    │ ← body-sm 13 pt
└──────────────────────────┘
   Isian surface-card #ffffff
   Garis 0,75 pt hairline-strong
   Radius sm 6 pt, tanpa bayangan
```

**Kode aturan wajib tampil besar dan berdampingan dengan status.** Catatan panggung memerintahkan pembicara menyebut `A01` dan `E04` dengan suara saat demo berjalan. Kode itu harus terbaca dari kursi juri, bukan tersembunyi di sudut seperti pada purwarupa 0.1.

**Dua keadaan berdampingan untuk slide.** Tersedia alamat `/verifikasi/contoh` yang menampilkan keadaan aman di kiri dan keadaan peringatan di kanan, persis Blok 4 Halaman 3 deck. Tangkapan layar dari alamat ini dipakai langsung di slide, sehingga slide dan aplikasi dijamin tidak pernah berbeda.

**Empat keadaan yang harus dirancang.**

| Keadaan | Pita atas | Kode | Tindakan yang tersedia |
|---|---|---|---|
| Hijau | `semantic-success` | A01 | kembali, lanjutkan pembayaran di aplikasi bank |
| Kuning | `timeline-done` `#c08532` | W01 | minta pedagang daftar ulang, tetap bisa lanjut |
| Merah | `semantic-error` | E01 sampai E05 | jangan bayar, **ketuk untuk mengadu** |
| Abu | `hairline-strong` | N01, N02 | periksa nama merchant secara manual |

**Keadaan merah adalah jembatan ke tahap Adukan.** Tombol adu berada langsung di layar merah, satu ketuk, sesuai janji naskah panggung.

### 4.5 Tahap 3, Adukan

**Tujuan.** Satu ketuk yang menghasilkan dua akibat sekaligus.

| Akibat | Penerima manfaat | Mekanisme |
|---|---|---|
| Peringatan bagi pemindai berikutnya | pembeli lain di lapak yang sama | NMID masuk daftar aturan R3, layar merah `E03` |
| Teks aduan siap kirim ke kanal resmi | pelapor sendiri | teks terbentuk otomatis, dapat disalin |

**Teks aduan yang terbentuk otomatis** memuat NMID, cap muatan, nomor segel, kode aturan yang aktif, waktu, dan jendela kejadian dari rekonsiliasi terakhir. Inilah nilai operasional yang dibahas Subbab 4.3.7 laporan riset, yaitu jendela waktu yang sempit.

**Antrean luring.** Aduan yang dibuat tanpa jaringan masuk antrean di perangkat dan terkirim sendiri saat jaringan tersedia. Layar menampilkan `1 ADUAN MENUNGGU KIRIM`. Tanpa antrean, klaim luring hanya berlaku separuh.

### 4.6 Posisi skor kepercayaan

Sesuai keputusan tim, skor **bukan gerbang transfer** dan **tidak muncul di jalur utama Kenali**.

```
KENALI   →  R1..R9 deterministik  →  putusan
                                          │
                                          │ bila merah
                                          ▼
ADUKAN   →  aduan masuk  →  petugas memeriksa  →  terkonfirmasi
                                                        │
                                                        ▼
                                          skor turun, NMID masuk daftar R3
                                                        │
                                                        ▼
                                   pemindai berikutnya melihat E03 merah
```

**Di mana skor terlihat.**

| Tempat | Bentuk | Alasan |
|---|---|---|
| Layar verifikasi | **tidak tampil sama sekali** bila putusan hijau | agar P1 tidak terganggu, putusan tetap berasal dari satu aturan |
| Layar verifikasi merah `E03` | satu baris `Pernah diadukan, N aduan terkonfirmasi` | menjelaskan mengapa merah |
| Tahap Adukan | riwayat aduan terhadap NMID ini | konteks bagi pelapor |
| Konsol petugas | skor penuh beserta rincian asal-usulnya | alat kerja petugas |

**Akibat bagi kode yang sudah ada.** `src/lib/score.js` tetap dipakai utuh, tetapi tidak lagi dipanggil pada jalur `periksa`. Fungsi `putusan()` yang menggabungkan skor dengan kode aturan **dihapus**, karena penggabungan itulah yang menjadikan skor sebagai gerbang. Yang tersisa adalah `hitungSkor()` dan `pita()`, dipakai di konsol petugas dan sebagai sumber daftar R3.

---

## 5. Arsitektur teknis

### 5.1 Tiga lapis, sesuai Laporan Subbab 4.3.1

| Lapis | Isi | Berubah dari 0.1 |
|---|---|---|
| **1. Klien** | pemindai, pengurai TLV, pemeriksa CRC, **mesin aturan R1 sampai R9**, salinan pangkalan lapak | **ya, ini perubahan utama.** Mesin aturan pindah dari peladen ke klien. |
| **2. Peladen** | menyimpan dan menyajikan salinan, menerima aduan, rantai catatan, konsol petugas | tidak lagi mengambil putusan apa pun |
| **3. Artefak fisik** | segel cetak bernomor | tidak berubah |

### 5.2 Salinan luring

```
Saat pertama dibuka, online:
  GET /api/salinan  →  30 lapak, di bawah 8 KB
                    →  simpan ke IndexedDB
                    →  Service Worker menyimpan cangkang aplikasi

Saat dipakai, dengan atau tanpa jaringan:
  seluruh putusan dihitung dari salinan di perangkat
  tidak ada permintaan jaringan pada jalur Kenali

Saat online kembali:
  salinan disegarkan di latar belakang
  antrean aduan dikirim
```

**Penanda luring wajib terlihat.** Kaki beranda menampilkan status salinan. Saat demo panggung, pembicara dapat mematikan Wi-Fi dan menunjukkan aplikasi tetap bekerja. Ini peragaan yang murah dan sangat meyakinkan.

### 5.3 Peladen

Tetap satu proses Node dengan Vite sebagai middleware. Yang berubah hanya tanggung jawabnya.

| Titik akhir | Dipertahankan | Catatan |
|---|---|---|
| `GET /api/salinan` | **baru** | mengganti peran `/api/keadaan` untuk klien |
| `POST /api/periksa` | **dihapus** | putusan pindah ke klien |
| `POST /api/transfer` | **dihapus** | SASI-QR tidak memindahkan uang, lihat 5.4 |
| `POST /api/aduan` | ya | menerima antrean dari klien |
| `POST /api/aduan/:id/:aksi` | ya | putusan petugas |
| `GET /api/rantai` | ya | konsol petugas |
| `GET /api/aliran` | ya | penyegaran konsol petugas |

### 5.4 Keputusan: simulasi pemindahan saldo dihapus

Purwarupa 0.1 memindahkan saldo antar akun. Rancangan awal tidak pernah meminta itu.

Alasan penghapusan ada tiga. Pertama, SASI-QR memeriksa **sebelum** uang berpindah, dan pemindahan itu sendiri terjadi di aplikasi bank pengguna, bukan di sini. Menirukan pemindahan saldo justru mengaburkan batas itu. Kedua, ini menghilangkan seluruh permukaan yang menyerupai kloning aplikasi pembayaran. Ketiga, ini memangkas satu layar dari jalur demo panggung.

Penggantinya di layar hijau adalah kalimat penutup: `Aman dibayar. Lanjutkan di aplikasi pembayaran Anda.`

---

## 6. Alur demo panggung

**Sasaran: di bawah 30 detik, tanpa satu pun menu.**

| Detik | Tindakan | Yang terlihat di layar |
|---|---|---|
| 0 | buka `/kenali` langsung dari penanda tersimpan | pemindai, `LANGKAH 1 DARI 2` |
| 0 sampai 5 | pindai segel lapak uji | `SEGEL SL7K2M9Q`, `LANGKAH 2 DARI 2` |
| 5 sampai 10 | pindai kode QRIS asli | layar hijau, **`A01`** besar |
| 10 sampai 13 | pembicara menyebut `A01` dengan suara | |
| 13 sampai 15 | tempelkan kode pengganti di atas kode asli | |
| 15 sampai 20 | ketuk ulang, pindai segel lagi | |
| 20 sampai 27 | pindai kode pengganti | layar merah, **`E04`** besar |
| 27 sampai 30 | pembicara menyebut `E04` dan kalimat bahwa kode itu bukan milik lapak yang tersegel | |

**Tiga syarat yang harus dipenuhi rancangan agar ini muat 30 detik.**

1. `/kenali` dapat dibuka langsung sebagai alamat, tanpa melewati beranda.
2. Setelah putusan tampil, tombol pindai ulang berada di posisi yang sama dan berukuran besar.
3. Tidak ada animasi transisi. `DESIGN.md` Bagian 9 sudah melarangnya.

**Cadangan.** Rekaman layar kedua alur disimpan di dua perangkat, sesuai catatan panggung.

---

## 7. Pemetaan berkas

### 7.1 Dipertahankan tanpa perubahan

| Berkas | Alasan |
|---|---|
| `src/lib/emv.js` | pengurai, CRC, dan tabel R1 sampai R9 sudah benar dan sudah teruji |
| `src/lib/chain.js` | rantai catatan tetap di peladen |
| `src/components/Pemindai.jsx` | sudah menangani `BarcodeDetector`, `jsQR`, manual, dan pintasan demo |
| `src/styles.css` | token `DESIGN.md` sudah lengkap |

### 7.2 Diubah

| Berkas | Perubahan |
|---|---|
| `src/lib/score.js` | hapus `putusan()`. Sisanya tetap, dipakai konsol petugas dan daftar R3. |
| `src/App.jsx` | ganti pemilihan peran menjadi beranda triad PeKA, tambahkan perutean alamat sederhana |
| `server.js` | hapus `/periksa` dan `/transfer`, tambah `/salinan` |
| `seed.js` | hapus kolom `saldo`, tambah lapak uji khusus demo panggung |

### 7.3 Dibuat baru

| Berkas | Isi |
|---|---|
| `src/lib/salinan.js` | pengambilan, penyimpanan, penyegaran salinan, **dan** mesin putusan sisi klien |
| `src/screens/Peduli.jsx` | pendaftaran lapak, pemasangan segel, tampilkan kode |
| `src/screens/Kenali.jsx` | alur dua pindai |
| `src/screens/Adukan.jsx` | satu ketuk aduan, teks resmi, antrean luring |
| `src/components/LayarVerifikasi.jsx` | komponen `DESIGN.md` 6.5, empat keadaan |
| `src/screens/ContohVerifikasi.jsx` | dua keadaan berdampingan untuk tangkapan layar slide |
| `public/sw.js` | Service Worker untuk cangkang luring |

### 7.4 Dihapus

| Berkas | Alasan |
|---|---|
| `src/screens/Pembayar.jsx` | digantikan `Kenali.jsx` dan `Adukan.jsx` |
| `src/screens/Penerima.jsx` | dilebur ke dalam `Peduli.jsx` sebagai mode tampilkan kode |
| `src/components/KartuSkor.jsx` | digantikan `LayarVerifikasi.jsx`. Bagian `RincianSkor` dipindahkan ke konsol petugas. |

`src/screens/Konsol.jsx` dipertahankan, tetapi dipindahkan ke alamat `/petugas` dan dikeluarkan dari beranda.

---

## 8. Urutan pengerjaan

Disusun agar setiap tahap menghasilkan sesuatu yang dapat diperagakan, dan agar jalur demo panggung selesai lebih dulu.

| Tahap | Isi | Hasil yang dapat diperagakan |
|---|---|---|
| **A** ✅ | `LayarVerifikasi.jsx` dan `ContohVerifikasi.jsx` | selesai. Empat keadaan berdampingan di `/verifikasi/contoh`, siap ditangkap layarnya. |
| **B** ✅ | `salinan.js`, `Kenali.jsx`, cangkang PeKA | selesai. `/kenali` sudah jalan, nol permintaan jaringan, A01 dan E04 terbukti. |
| **C** ⚠️ | Service Worker, penanda luring | berkas ditulis dan tersaji benar, **pendaftarannya belum terbukti**. Lihat catatan di bawah. |
| **D** ✅ | `Adukan.jsx`, antrean luring | selesai. Aduan gagal kirim masuk antrean, terkirim sendiri saat jaringan kembali. |
| **E** ✅ | `Peduli.jsx` | selesai. Pendaftaran tiga langkah, lapak baru langsung terverifikasi A01. |
| **F** ✅ | pembersihan peladen, konsol ke `/petugas` | selesai. `/periksa`, `/transfer`, `/tagihan`, dan kolom saldo dihapus. |
| **G** ✅ | penyesuaian `SPEC.md` dan `README.md` | selesai. |

**Catatan Tahap C.** `public/sw.js` sudah ditulis dan disajikan peladen dengan
tipe `text/javascript` dan kode 200, tetapi pendaftarannya **gagal di peramban
internal yang dipakai menguji**, dengan galat "unknown error when fetching the
script". Peramban tersemat memang lazim memblokir Service Worker, jadi
kemungkinan besar kodenya benar, namun hal itu belum dibuktikan. Uji di ponsel
sungguhan lewat HTTPS, lalu periksa konsol peramban: pendaftaran yang berhasil
mencetak `[SASI-QR] Service Worker aktif`.

**Yang tidak bergantung pada Service Worker.** Demo panggung mematikan Wi-Fi
setelah aplikasi terbuka. Pada keadaan itu, verifikasi tetap berjalan karena
salinan lapak sudah ada di `localStorage` dan jalur Kenali memang tidak
melakukan permintaan jaringan sama sekali. Service Worker hanya diperlukan bila
aplikasi ditutup lalu dibuka kembali dalam keadaan luring.

**Tahap A dan B adalah yang wajib selesai.** Bila waktu habis, tiga tahap sisanya dapat ditunda tanpa mengorbankan presentasi, karena demo panggung hanya menyentuh Kenali.

---

## 9. Daftar periksa sebelum lomba

Diturunkan dari catatan panggung dan `DESIGN.md` Bagian 10.3.

- [ ] `/kenali` dapat dibuka langsung tanpa melewati beranda
- [ ] Demo dua pindai selesai di bawah 30 detik, sudah dilatih
- [ ] Kode aturan `A01` dan `E04` terbaca dari jarak delapan meter
- [ ] Aplikasi diuji dengan Wi-Fi dimatikan, putusan tetap keluar
- [ ] Rekaman layar cadangan tersimpan di dua perangkat
- [ ] Tangkapan layar `/verifikasi/contoh` sudah dipasang di Halaman 3 deck
- [ ] Tidak ada bayangan pada objek mana pun
- [ ] Setiap layar memiliki paling banyak satu elemen `primary`
- [ ] Tidak ada teks di bawah 12 pt selain baris sumber
- [ ] Kode segel lapak uji sudah dicetak dan ditempel
- [ ] Kode QRIS pengganti untuk peragaan sudah dicetak terpisah
- [ ] Diuji sekali di proyektor sungguhan

---

## 10. Yang sengaja tidak dikerjakan

Dicatat agar tidak menjadi pertanyaan berulang.

| Tidak dikerjakan | Alasan |
|---|---|
| Pemindahan saldo | lihat Bagian 5.4 |
| Skor sebagai gerbang transfer | keputusan tim, skor hanya akibat di tahap Adukan |
| Pemilihan peran di beranda | merusak triad PeKA yang dinilai juri |
| Animasi transisi | dilarang `DESIGN.md` Bagian 9, dan memakan waktu panggung |
| Basis data sungguhan | berkas JSON cukup untuk rintisan 30 lapak |
| Rantai banyak simpul | lihat `SPEC.md` Bagian 8.4, penambatan hash harian lebih masuk akal |

---

## 11. Pertanyaan tersisa untuk Miss Sandi

1. **Apakah tahap Peduli perlu selesai sebelum lomba, atau cukup Kenali dan Adukan?** Pendaftaran lapak baru berguna saat rintisan lapangan, bukan saat presentasi. Menundanya menghemat waktu pengerjaan yang cukup besar.
2. **Siapa yang mencetak segel lapak uji, dan kapan?** Demo panggung memerlukan segel fisik yang sudah tertempel, bukan kode di layar laptop kedua.
3. **Apakah tim sudah memiliki muatan QRIS asli dari lapak yang bersedia?** Subbab 4.3.10 laporan riset menjanjikan pengujian terhadap tiga muatan asli. Sampai sekarang purwarupa hanya diuji dengan muatan buatan sendiri.
