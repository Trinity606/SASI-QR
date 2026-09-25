# SPESIFIKASI SISTEM SASI-QR
## Simulasi transaksi QRIS dengan penahanan transfer berbasis skor kepercayaan

**Versi** 0.1, 22 September 2026
**Berkas terkait** `Laporan_Riset_Inovasi_SASI-QR.md`, `DESIGN.md`, `Draf_Rancangan_Topik_SASI-QR.md`
**Status** purwarupa berjalan, sudah diuji pada 20 kasus uji otomatis

> **Sebagian digantikan `RENCANA-WEB.md` sejak 22 September 2026.** Struktur
> aplikasi berubah dari tiga peran menjadi tiga tahap PeKA, putusan pindah ke
> sisi klien, simulasi pemindahan saldo dihapus, dan skor kepercayaan turun
> dari gerbang transfer menjadi akibat di tahap Adukan. Bagian 2, 3, 5, dan 10
> dokumen ini sudah tidak menggambarkan kode yang berjalan. Bagian 4 tabel
> poin, Bagian 7 protokol layanan pelanggan, dan Bagian 8 rantai tetap berlaku.

---

## 0. Ruang lingkup dan batas kejujuran

Dokumen ini menjelaskan purwarupa yang sudah dapat dijalankan, bukan rencana. Empat hal perlu dinyatakan lebih dulu agar tidak ada klaim yang melebihi kenyataan.

**Pertama, ini simulasi, bukan kloning aplikasi GoPay.** Sistem tidak menyalin kode, aset, merek, maupun protokol milik GoPay. Yang ditiru adalah *alur kerja* pembayaran QRIS dua perangkat, yaitu satu perangkat menampilkan kode dan satu perangkat memindai. Seluruh saldo, akun, dan transaksi bersifat fiktif dan tersimpan di berkas lokal. Tidak ada sambungan ke bank, penyelenggara jasa pembayaran, atau dana nyata. Menyalin aplikasi pembayaran sungguhan akan bermasalah dari sisi hukum maupun etika, dan tidak diperlukan untuk membuktikan gagasan penelitian ini.

**Kedua, skor kepercayaan adalah rancangan penelitian, bukan produk yang siap dipakai.** Angka poin pada Bagian 4 ditetapkan secara argumentatif, belum dikalibrasi dengan data lapangan. Kalibrasi memerlukan data rintisan yang belum dimiliki.

**Ketiga, rantai blok yang dipakai adalah rantai hash satu simpul.** Yang dijamin adalah deteksi penyuntingan, bukan ketahanan terhadap operator yang jahat. Penjelasan lengkap pada Bagian 8.

**Keempat, ada ketegangan dengan laporan riset yang perlu diputuskan tim.** Laporan riset menyatakan bahwa sistem sengaja tidak memakai model statistik dan tidak memakai kerangka kerja, dengan alasan setiap putusan harus dapat dijelaskan dan seluruh logika harus muat dalam satu berkas yang dapat diaudit. Penambahan skor kepercayaan dan kerangka kerja React mengubah dua hal itu. Pembahasannya ada pada Bagian 10, beserta cara mempertahankan sifat dapat dijelaskan tersebut.

---

## 1. Arsitektur simulasi dua perangkat

### 1.1 Peran perangkat

Aplikasi yang sama dibuka pada dua perangkat, lalu masing-masing memilih perannya di layar pertama.

| Peran | Perangkat | Tugas |
|---|---|---|
| **Terima** | ponsel atau laptop pedagang | menampilkan kode segel dan kode pembayaran QRIS |
| **Bayar** | ponsel pembeli | memindai kedua kode, membaca putusan, menyetujui atau membatalkan |
| **Petugas** | laptop pengawas | memutus aduan, menelusuri asal-usul skor, memverifikasi rantai |

Ketiga peran berbagi satu keadaan melalui peladen. Perubahan pada satu perangkat langsung terlihat di perangkat lain melalui *server-sent events*, tanpa perlu memuat ulang halaman.

### 1.2 Lapisan

```
Perangkat A  ──┐
(Terima)       │
               ├── satu peladen Node.js, satu porta
Perangkat B  ──┤   ├── REST untuk periksa, transfer, aduan
(Bayar)        │   ├── SSE untuk penyegaran langsung
               │   ├── rantai blok  data/rantai.json
Perangkat C  ──┘   └── keadaan akun data/akun.json
(Petugas)
```

Antarmuka dan API berada pada asal yang sama, sehingga tidak ada konfigurasi proksi maupun CORS. Ponsel cukup membuka satu alamat.

### 1.3 Kode yang ditampilkan

Perangkat penerima menampilkan dua kode yang berbeda peran.

**Kode segel.** Berisi untai `SASI1:<pengenal segel>`. Di lapangan kode ini tercetak pada segel fisik yang ditempel di lapak dan tidak pernah berubah. Pengenal dibangkitkan acak dari ruang 32 pangkat 8, sekitar 1,1 kali 10 pangkat 12 kemungkinan.

**Kode pembayaran.** Muatan bergaya EMVCo, format yang sama dengan QRIS sungguhan, dibangun oleh peladen dengan penanda berikut.

| Penanda | Isi | Keterangan |
|---|---|---|
| `00` | `01` | versi muatan |
| `01` | `11` atau `12` | `11` statis, `12` dinamis |
| `26` | `ID.CO.QRIS.WWW`, NMID, golongan | penanda gabungan penyelenggara |
| `52` | `5499` | kode kategori pedagang |
| `53` | `360` | mata uang rupiah |
| `54` | nominal | hanya pada kode dinamis |
| `58` | `ID` | kode negara |
| `59` | nama merchant | dibandingkan dengan papan nama lapak |
| `60` | kota | |
| `62` | nomor rujukan | |
| `80` | pengenal akun SASI | **penanda privat milik sistem ini** |
| `63` | CRC-16/CCITT-FALSE | pemeriksa keutuhan |

Penanda `80` adalah tambahan dan tidak akan dikenali aplikasi bank mana pun. Konsekuensinya jelas dan perlu diingat: kode yang dibangkitkan purwarupa ini **tidak dapat dipakai untuk pembayaran sungguhan**, dan sebaliknya purwarupa ini **tetap dapat mengurai QRIS asli** karena penguraiannya mengikuti aturan EMVCo.

---

## 2. Alur transaksi dengan penahanan

Inti permintaan adalah menahan transfer setelah pemindaian berhasil. Urutannya disusun agar tidak ada jalur yang memindahkan saldo tanpa melewati layar penahanan.

```
1. Pembeli memindai KODE SEGEL
       │  sistem mengambil rekaman lapak yang terdaftar
       ▼
2. Pembeli memindai KODE PEMBAYARAN
       │  sistem mengurai TLV, memeriksa CRC, mengekstrak NMID
       ▼
3. ══ TRANSFER DITAHAN ══   (POST /api/periksa)
       │  tidak ada saldo yang berpindah pada langkah ini
       │  yang ditampilkan:
       │    a. identitas penerima: nama, NMID, lokasi, telepon tersamar
       │    b. skor kepercayaan 0 sampai 100 beserta pitanya
       │    c. kode aturan verifikasi R1 sampai R9
       │    d. jumlah aduan terbuka dan penipuan terkonfirmasi
       ▼
4. Pengguna memutuskan
       ├── pita Aman atau Terpercaya  → tombol bayar aktif
       ├── pita Waspada               → wajib mengetik kata LANJUT
       └── pita Diblokir              → tombol bayar mati, tersedia tombol adukan
       ▼
5. POST /api/transfer   ← baru di sini saldo berpindah
       │  peladen mengevaluasi ulang seluruh aturan, tidak mempercayai klien
       ▼
6. Struk berisi nomor blok dan hash, tercatat permanen pada rantai
```

**Evaluasi ulang di peladen bersifat wajib.** Klien boleh menampilkan apa pun, tetapi peladen menghitung ulang aturan dan skor pada langkah 5. Permintaan transfer untuk akun berpita Diblokir dijawab galat 403 walaupun klien mengirim tanda paksa.

---

## 3. Parameter skor kepercayaan

### 3.1 Rentang dan nilai awal

| Besaran | Nilai | Alasan |
|---|---|---|
| Rentang | 0 sampai 100 | mudah dibaca pedagang, tidak perlu penjelasan |
| Skor awal akun baru | **60** | berada di pita aman, tetapi di bawah Terpercaya. Akun baru belum pantas disebut terpercaya, dan juga belum pantas dicurigai. |
| Ambang peringatan | **50** | di bawah nilai ini transfer ditahan dan perlu konfirmasi |
| Ambang blokir | **25** | di bawah nilai ini transfer tidak dapat dilanjutkan |

### 3.2 Pita kepercayaan

| Skor | Pita | Tindakan sistem | Batas nominal |
|---|---|---|---|
| **80 sampai 100** | Terpercaya | lanjut langsung | tanpa batas |
| **50 sampai 79** | Aman | lanjut langsung | tanpa batas |
| **25 sampai 49** | Waspada | peringatan, pengguna wajib mengetik `LANJUT` | Rp100.000 per transaksi |
| **0 sampai 24** | Diblokir | transfer ditolak peladen | Rp0 |

Rentang 50 sampai 100 karena itu merupakan wilayah skor baik sebagaimana diminta, dan dibagi dua agar pedagang yang benar-benar berdisiplin memperoleh penanda yang membedakan dirinya dari akun yang sekadar baru.

### 3.3 Dua tuas kebijakan

Hanya dua angka yang perlu dinegosiasikan bila kebijakan berubah, yaitu ambang 50 dan ambang 25. Seluruh perilaku sistem mengikuti keduanya. Keduanya berada pada satu tempat di berkas `src/lib/score.js` sebagai `AMBANG_PERINGATAN` dan `AMBANG_BLOKIR`.

---

## 4. Aturan naik dan turun

### 4.1 Tabel poin

| Peristiwa | Poin | Batas | Keterangan |
|---|---|---|---|
| Identitas terverifikasi | **+5** | sekali seumur akun | KYC dasar |
| Segel fisik terdaftar dan cocok | **+10** | sekali seumur akun | mengikat akun ke lapak fisik |
| Transaksi selesai tanpa sengketa | **+1** | maksimum +5 per hari, +20 per bulan | akumulasi utama |
| 30 hari berturut tanpa insiden | **+5** | | penghargaan atas ketekunan, bukan atas volume |
| Aduan terhadap akun ini ditolak petugas | **+8** | | mengembalikan penurunan sementara, ditambah ganti rugi reputasi |
| Aduan dicabut pelapor | **+10** | | mengembalikan penuh penurunan sementara |
| Rehabilitasi selesai bersama petugas | **+15** | | lihat Bagian 7.4 |
| Pemulihan pasif | **+1 per 14 hari** | **berhenti di skor 60** | |
| | | | |
| Aduan masuk, menunggu pemeriksaan | **-10** | | penurunan sementara, dikembalikan bila aduan ditolak |
| Rekonsiliasi harian tidak dijawab | **-2** | maksimum -10 per bulan | |
| Segel dilaporkan hilang atau rusak | **-5** | | |
| Penipuan terkonfirmasi petugas | **-40** | memicu karantina | |
| Penipuan kedua dalam 180 hari | **-70** | memicu karantina | praktis langsung ke pita Diblokir |
| Kode QRIS berbeda dari yang terdaftar | **-50** | memicu karantina | aturan R4, penukaran stiker |

### 4.2 Tiga prinsip di balik angka-angka itu

**Naik lambat, turun cepat.** Membangun skor dari 60 ke 80 memerlukan sekitar satu bulan transaksi bersih. Menjatuhkannya dari 80 ke pita Diblokir memerlukan satu penipuan terkonfirmasi. Asimetri ini disengaja: biaya kesalahan menahan transaksi jujur jauh lebih kecil daripada biaya meloloskan satu penipuan.

**Jatah harian dan bulanan mencegah pemompaan skor.** Tanpa batas, pelaku dapat menaikkan skor dengan mengirim seratus transaksi kecil ke dirinya sendiri dalam satu malam. Dengan batas +5 per hari dan +20 per bulan, menaikkan skor ke pita Terpercaya menuntut waktu nyata yang tidak dapat dipercepat, yaitu minimal satu bulan.

**Diam memulihkan, tetapi tidak membangun kepercayaan.** Pemulihan pasif mengangkat akun yang pernah terhukum kembali ke arah netral, tetapi berhenti tepat di skor awal 60. Akun yang menganggur bertahun-tahun tidak akan pernah mencapai pita Terpercaya tanpa satu pun transaksi bersih. Sifat ini diuji pada berkas uji.

### 4.3 Karantina

Setelah satu penipuan terkonfirmasi, skor tidak boleh naik melewati **49** selama **90 hari**, seberapa pun banyak transaksi bersih sesudahnya. Tanpa aturan ini, pelaku dapat memulihkan diri ke pita aman dalam dua minggu dengan transaksi palsu ke dirinya sendiri, dan hukuman -40 menjadi tidak berarti. Karantina adalah penalti yang sebenarnya, sedangkan angka -40 hanya pemicunya.

### 4.4 Cara skor dihitung

Skor **tidak disimpan** sebagai angka di basis data. Setiap kali dibutuhkan, skor dihitung ulang dengan memutar ulang seluruh peristiwa milik akun tersebut dari rantai.

Konsekuensinya ada tiga, dan ketiganya menguntungkan.

1. Tidak ada kolom skor yang dapat diubah diam-diam. Untuk mengubah skor, seseorang harus mengubah rantai, dan perubahan rantai langsung terdeteksi.
2. Setiap angka dapat ditelusuri. Konsol petugas menampilkan rincian baris per baris: peristiwa apa, kapan, berapa poin, dan skor menjadi berapa. Inilah yang membuat sistem dapat dipertanggungjawabkan di hadapan pedagang yang protes.
3. Mengubah kebijakan poin tidak memerlukan migrasi data. Tabel poin diubah, seluruh skor terhitung ulang dengan sendirinya.

---

## 5. Penggabungan dengan tabel keputusan R1 sampai R9

Skor kepercayaan **tidak menggantikan** tabel keputusan pada laporan riset, melainkan menjadi lapis kedua di atasnya.

| Lapis | Pertanyaan | Sumber |
|---|---|---|
| 1. Verifikasi kode | Apakah kode ini milik lapak yang tersegel? | tabel R1 sampai R9, deterministik |
| 2. Reputasi penerima | Apakah pemilik kode ini pernah bermasalah? | skor kepercayaan |

**Aturan penggabungan: kode merah selalu mengalahkan skor bagus.** Akun berskor 100 yang kodenya tidak cocok dengan segel tetap menghasilkan layar merah. Verifikasi kode menjawab pertanyaan "uang ini akan ke mana", sedangkan skor menjawab "siapa yang menerimanya". Pertanyaan pertama lebih penting, dan jawabannya pasti, bukan probabilistik.

| Kode | Kondisi | Putusan akhir |
|---|---|---|
| E01 | CRC tidak cocok | blokir, apa pun skornya |
| E02 | bukan QRIS Indonesia | blokir, apa pun skornya |
| E03 | NMID pernah diadukan dan terkonfirmasi | blokir, apa pun skornya |
| E04 | segel dikenal, NMID berbeda | blokir, apa pun skornya |
| E05 | segel tidak terdaftar | blokir, apa pun skornya |
| W01 | muatan berubah sejak didaftarkan | konfirmasi |
| A01 | seluruhnya cocok | mengikuti pita skor |
| N01 | kode dinamis, tanpa segel | mengikuti pita skor |
| N02 | kode statis, tanpa segel | mengikuti pita skor |

---

## 6. Log dan metadata

### 6.1 Peristiwa yang dicatat

Setiap peristiwa berikut menjadi satu blok pada rantai.

| Jenis | Kapan | Isi metadata |
|---|---|---|
| `PEMERIKSAAN` | setiap pemindaian, berhasil maupun ditolak | akun penerima, pemindai, kode aturan, tindakan, nominal, NMID, cap muatan |
| `TRANSFER` | saldo berpindah | penerima, pengirim, nominal, kode aturan, penanda apakah pengguna menembus peringatan |
| `TRANSFER_DITOLAK` | percobaan pada akun terblokir | penerima, pemindai, nominal, alasan |
| `ADUAN_MASUK` | pengguna mengadu | terlapor, pelapor, nomor aduan, nominal |
| `PENIPUAN_TERKONFIRMASI` | petugas memutus | terlapor, nomor aduan, petugas, catatan |
| `ADUAN_DITOLAK` | petugas memutus | terlapor, nomor aduan, petugas, catatan |
| seluruh peristiwa poin | saat terjadi | akun, jenis |

**Penanda `diteruskanMeskiPeringatan` penting dan perlu disorot.** Ketika pengguna menembus layar peringatan dengan mengetik `LANJUT`, hal itu tercatat permanen. Bila kemudian terjadi sengketa, petugas dapat menunjukkan bahwa sistem sudah memperingatkan dan pengguna memilih melanjutkan. Inilah yang membedakan penanganan sengketa yang berdasar bukti dari penanganan yang berdasar saling menuduh.

### 6.2 Data yang sengaja tidak disimpan

Nomor telepon disimpan dalam bentuk tersamar, misalnya `0812****4471`. Koordinat lokasi tidak dicatat sama sekali pada purwarupa ini. Laporan riset sebelumnya mencatat koordinat sebagai metadata, tetapi karena koordinat tidak dipakai untuk mengambil putusan apa pun, menyimpannya hanya menambah risiko kebocoran data pribadi tanpa menambah manfaat.

---

## 7. Protokol layanan pelanggan

### 7.1 Kasus yang harus ditangani

Kasus paling sulit adalah yang disebutkan langsung dalam permintaan: **pengguna tetap mengirim uang meskipun sistem sudah memberi peringatan skor buruk**. Sistem tidak dapat mencegah hal itu tanpa memblokir seluruh transaksi berpita Waspada, dan pemblokiran menyeluruh akan mematikan pedagang jujur yang skornya turun karena aduan palsu.

### 7.2 Alur penanganan

| Tahap | Pelaku | Tindakan | Batas waktu |
|---|---|---|---|
| 1 | pengguna | menekan tombol adukan, mengisi kronologi | segera |
| 2 | sistem | mencatat `ADUAN_MASUK`, skor terlapor turun **-10 sementara** | otomatis |
| 3 | petugas | memeriksa rantai: apakah ada `TRANSFER` yang cocok, apakah peringatan ditembus, berapa aduan lain terhadap akun yang sama | **1 x 24 jam** |
| 4a | petugas | **konfirmasi**: skor turun -40, karantina 90 hari, NMID masuk daftar E03 | |
| 4b | petugas | **tolak**: skor naik +8, aduan ditutup, pelapor tercatat | |
| 5 | sistem | seluruh putusan tercatat sebagai blok, lengkap dengan nama petugas | otomatis |

### 7.3 Tiga aturan yang mengikat petugas

**Petugas tidak dapat mengubah skor secara langsung.** Tidak ada tombol untuk menetapkan skor menjadi angka tertentu. Petugas hanya dapat mencatat peristiwa, dan skor mengikuti dari tabel poin. Ini menutup jalur penyalahgunaan wewenang yang paling umum pada sistem serupa.

**Setiap putusan membawa nama petugas dan tercatat permanen.** Putusan yang salah tidak dapat dihapus, hanya dapat dikoreksi dengan peristiwa baru. Rantai menyimpan keduanya.

**Aduan palsu juga tercatat permanen.** Layar pengaduan menyatakan hal ini secara terbuka sebelum pengguna mengirim. Pada tahap lanjutan, pola pelapor yang aduannya berulang kali ditolak dapat dijadikan dasar penurunan skor pelapor. Fitur itu belum diterapkan pada purwarupa ini.

### 7.4 Rehabilitasi

Akun yang terlanjur diblokir memerlukan jalan kembali, kalau tidak sistem hanya menghukum tanpa memperbaiki. Syaratnya tiga, yaitu karantina 90 hari terlewati, kerugian pengadu diganti, dan segel baru dipasang dengan pendaftaran ulang kode. Setelah ketiganya terpenuhi, petugas mencatat peristiwa `REHABILITASI` senilai +15. Akun kembali ke pita Waspada, bukan langsung ke pita Aman.

### 7.5 Yang berada di luar kemampuan sistem

Sistem tidak dapat menarik kembali uang yang sudah berpindah. Purwarupa ini tidak memiliki akses ke data penyelesaian transaksi bank mana pun. Yang dapat diberikan kepada pengadu adalah berkas bukti berisi nomor blok, hash, waktu, NMID, dan cap muatan, yang dapat dilampirkan pada laporan ke kanal resmi seperti IASC OJK. Nilai berkas itu terletak pada jendela waktunya yang sempit, sebagaimana dibahas pada laporan riset.

---

## 8. Rantai blok: yang dijamin dan yang tidak

### 8.1 Bentuk yang dipakai

Rantai hash sederhana. Setiap blok memuat nomor urut, waktu, hash blok sebelumnya, daftar peristiwa, dan hash dirinya sendiri yang dihitung dengan SHA-256 atas keempat isian pertama.

```
blok[n].hash = SHA256( n | waktu | blok[n-1].hash | JSON(peristiwa) )
```

Mengubah satu peristiwa lama mengubah hash bloknya, yang memutus tautan ke seluruh blok sesudahnya. Fungsi verifikasi menelusuri ulang seluruh rantai dan menunjuk blok pertama yang rusak. Sifat ini diuji pada berkas uji dengan cara menyunting sebuah blok dan memastikan verifikasi gagal pada indeks yang tepat.

### 8.2 Yang dijamin

Penyuntingan catatan lama **terdeteksi**. Siapa pun dapat memverifikasi sendiri lewat konsol petugas, termasuk pedagang yang tidak percaya kepada pengelola sistem.

### 8.3 Yang tidak dijamin, dan ini harus dinyatakan di hadapan juri

Rantai ini berjalan pada **satu simpul**. Tidak ada proof-of-work, tidak ada konsensus, tidak ada jaringan. Operator yang jahat dapat menulis ulang seluruh berkas dari awal, menghitung ulang semua hash, dan menghasilkan rantai baru yang lolos verifikasi.

Dengan kata lain, rantai ini melindungi dari **penyuntingan diam-diam**, bukan dari **operator yang tidak jujur**.

Menyebut hal ini blockchain tanpa penjelasan tersebut akan terbaca sebagai berlebihan oleh juri yang paham, dan itu merugikan tim. Menyebutnya dengan jujur sebagai rantai hash beserta batasnya justru menunjukkan tim memahami apa yang dibangunnya.

### 8.4 Jalur peningkatan bila memang diperlukan

| Tingkat | Cara | Biaya |
|---|---|---|
| Sekarang | rantai hash satu simpul | nol |
| Menengah | **penambatan harian**: hash kepala rantai setiap hari dikirim ke kanal publik, misalnya diumumkan di media sosial resmi atau dicatat pada layanan penanda waktu | nol sampai sangat murah |
| Penuh | beberapa simpul independen, misalnya pengelola pasar, sekolah, dan GenBI, masing-masing menyimpan salinan | perlu koordinasi kelembagaan |

**Tingkat menengah adalah yang paling masuk akal untuk rintisan ini.** Sekali hash harian diumumkan ke publik, operator tidak lagi dapat menulis ulang sejarah tanpa bertentangan dengan pengumuman yang sudah tersebar. Ini memberikan sebagian besar manfaat blockchain dengan biaya mendekati nol dan tanpa satu baris kode rantai tambahan.

---

## 9. Model data

| Berkas | Isi | Sifat |
|---|---|---|
| `data/rantai.json` | seluruh blok peristiwa | hanya bertambah, tidak pernah disunting |
| `data/akun.json` | identitas, NMID, pengenal segel, saldo, muatan terdaftar | berubah |
| `data/aduan.json` | aduan dan statusnya | berubah |
| `data/tagihan.json` | tagihan yang dibuat pedagang | berubah |

Skor **tidak ada** di daftar ini, karena skor bukan data yang disimpan melainkan hasil perhitungan atas rantai.

---

## 10. Tumpukan teknologi

| Lapis | Pilihan | Alasan |
|---|---|---|
| Antarmuka | **React 18** dengan Vite | memenuhi permintaan memakai kerangka kerja JavaScript |
| Gaya | CSS biasa dengan token dari `DESIGN.md` | purwarupa dan deck presentasi terbaca sebagai satu sistem, tanpa menambah pustaka gaya |
| Pemindaian | `BarcodeDetector` bawaan peramban, `jsQR` sebagai cadangan | perangkat yang sudah mendukung pemindaian bawaan tidak perlu memuat pustaka besar |
| Pembangkit kode | `qrcode` | |
| Pengurai dan CRC | fungsi sendiri, sekitar 70 baris | operasi untai sederhana, pustaka pihak ketiga menambah risiko tanpa menambah kemampuan |
| Peladen | Node.js `node:http` dengan Vite sebagai middleware | satu proses, satu porta, tanpa proksi |
| Rantai dan hash | `node:crypto` bawaan | tanpa pustaka blockchain |
| Penyimpanan | berkas JSON | cukup untuk rintisan 30 lapak, tidak perlu basis data |
| Pengujian | `node --test` bawaan | tanpa kerangka kerja pengujian |

**Pergeseran dari laporan riset perlu dijelaskan.** Laporan menyebut HTML, CSS, dan JavaScript murni tanpa kerangka kerja, dengan alasan seluruh logika harus dapat diaudit anggota tim mana pun. Alasan itu tetap dipenuhi walaupun React dipakai, karena seluruh logika keputusan berada di tiga berkas yang tidak menyentuh React sama sekali:

- `src/lib/emv.js`, pengurai dan tabel R1 sampai R9, sekitar 130 baris
- `src/lib/score.js`, mesin skor dan pita, sekitar 200 baris
- `src/lib/chain.js`, rantai dan verifikasi, sekitar 90 baris

React hanya menangani tampilan. Ketiga berkas di atas berjalan di peladen maupun di peramban, dan diuji secara terpisah tanpa memerlukan peramban.

---

## 11. Pengujian

20 kasus uji otomatis, dijalankan dengan `npm test`.

| Kelompok | Yang diuji |
|---|---|
| Pengurai | muatan terbangun dapat diurai kembali, CRC sah; satu karakter berubah memicu R1; panjang tidak konsisten tidak melempar galat |
| Tabel keputusan | R4 menangkap kode yang ditukar; W01 muncul saat muatan berubah; A01 saat seluruhnya cocok |
| Skor | skor awal; jatah harian +5; jatah bulanan +20; peristiwa sekali pakai; penipuan menjatuhkan ke pita Diblokir; karantina menahan pemulihan; batas pita tepat pada 50 dan 25; kode merah mengalahkan skor bagus; batas nominal pita Waspada |
| Pemulihan pasif | menganggur bertahun-tahun berhenti di skor awal; akun terhukum pulih sampai batas itu |
| Segel palsu | segel dipindai tetapi tidak terdaftar memicu E05 merah, sedangkan segel yang sengaja dilewati tetap N02 |
| Rantai | rantai utuh lolos verifikasi; penyuntingan blok lama terdeteksi pada indeks yang tepat; skor dihitung ulang dari rantai |

**Uji lawan** dijalankan dari antarmuka melalui menu Mode uji lawan pada peran Terima, yang menempelkan kode milik akun lain di atas segel sebuah lapak. Hasil yang diharapkan adalah layar merah E04 tanpa intervensi manusia, dan hasil itu sudah diverifikasi.

Pemilihan akun penyerang pada uji ini penting. Akun yang dipakai adalah Toko Sinar Jaya, yang berskor 60 dan berpita Aman tanpa catatan penipuan sama sekali. Kodenya tetap menghasilkan E04 semata karena berada di atas segel yang bukan miliknya. Inilah bukti bahwa R4 bekerja tanpa pengetahuan apa pun tentang kode palsu. Bila uji ini dijalankan dengan Kios Cepat Untung, yang NMID-nya sudah masuk daftar aduan terkonfirmasi, aturan R3 akan lebih dulu terpenuhi dan yang terbukti hanyalah daftar hitam biasa.

---

## 12. Batasan yang diketahui

1. **Kamera memerlukan konteks aman.** `getUserMedia` hanya bekerja pada `localhost` atau HTTPS. Pada ponsel yang membuka alamat IP biasa, kamera akan ditolak peramban. Cara mengatasinya ada pada `README.md`, dan tersedia jalur masukan manual serta pintasan demo sebagai cadangan.
2. **Angka poin belum dikalibrasi.** Seluruh nilai pada Bagian 4 ditetapkan secara argumentatif.
3. **Rantai satu simpul.** Lihat Bagian 8.3.
4. **Skor hanya dihitung untuk penerima.** Skor pengirim belum dipakai dalam putusan apa pun.
5. **Aduan palsu belum dihukum.** Pola pelapor bermasalah tercatat tetapi belum memengaruhi skor pelapor.
6. **Penyimpanan berkas JSON.** Cukup untuk rintisan, akan menjadi hambatan pada skala kota.
7. **Anggaran ukuran aplikasi terlampaui.** Tabel 9 laporan riset menetapkan target di bawah 150 KB untuk seluruh aplikasi. Hasil build purwarupa ini adalah 330 KB, atau 112 KB setelah dimampatkan gzip. Penyebabnya React beserta `jsQR`. Angka setelah gzip masih berada di bawah target, tetapi angka mentahnya tidak, dan hal ini perlu dinyatakan apa adanya bila Tabel 9 dikutip saat presentasi. Dua jalur penurunan tersedia bila tim menganggapnya penting, yaitu memuat `jsQR` hanya ketika `BarcodeDetector` tidak tersedia, dan mengganti React dengan Preact yang antarmukanya sama.

---

## 13. Yang perlu diputuskan bersama Miss Sandi

1. **Apakah skor kepercayaan memperkuat atau melemahkan argumen penelitian?** Laporan riset sebelumnya justru menjadikan ketiadaan model statistik sebagai keunggulan, karena setiap putusan dapat dijelaskan dan tidak ada ambang batas yang perlu dikalibrasi. Skor kepercayaan memasukkan ambang batas yang memang perlu dikalibrasi. Keduanya dapat dipertahankan bersama sebagaimana pada Bagian 5, tetapi tim perlu sepakat mana yang menjadi gagasan utama saat presentasi.
2. **Seberapa jauh kata blockchain boleh dipakai?** Usulan dokumen ini adalah memakai istilah rantai hash beserta batasnya, lalu menyebutkan penambatan harian sebagai jalur peningkatan. Pilihan ini lebih aman di hadapan juri Bank Indonesia daripada klaim blockchain penuh.
3. **Ambang 50 dan 25, apakah sudah tepat?** Keduanya adalah tebakan terdidik. Bila tim memiliki pertimbangan lain, hanya dua angka yang perlu diubah.
4. **Apakah batas Rp100.000 pada pita Waspada masuk akal untuk pasar Kota Ambon?** Angka ini perlu disesuaikan dengan nilai transaksi sehari-hari yang sebenarnya di lapangan.

---

## Lampiran. Berkas dan tanggung jawabnya

| Berkas | Isi |
|---|---|
| `src/lib/emv.js` | pengurai TLV, CRC-16, pembangun muatan, tabel R1 sampai R9 |
| `src/lib/score.js` | tabel poin, mesin pemutar ulang, pita, penggabungan putusan |
| `src/lib/chain.js` | rantai blok, penambahan, verifikasi |
| `server.js` | REST, SSE, penyimpanan, penegakan aturan di sisi peladen |
| `seed.js` | data awal, empat pita skor terwakili |
| `src/screens/Pembayar.jsx` | alur pindai, tahan, putuskan, bayar |
| `src/screens/Penerima.jsx` | tampilan kode segel dan kode pembayaran, mode uji lawan |
| `src/screens/Konsol.jsx` | aduan, akun, penelusuran rantai |
| `test/sasi.test.js` | 20 kasus uji |
