# SASI-QR

Alat verifikasi QRIS dua pindai untuk pedagang mikro, disusun mengikuti kerangka
**PeKA** Bank Indonesia: Peduli, Kenali, Adukan.

Pembeli memindai segel yang tertempel di lapak, lalu memindai kode pembayaran.
Aplikasi membandingkan keduanya dan menerbitkan putusan dari tabel sembilan
aturan yang deterministik. Kalau kode itu bukan milik lapak yang tersegel, layar
merah muncul **sebelum** uang berpindah.

Seluruh putusan dihitung di dalam ponsel, jadi verifikasi tetap bekerja tanpa
internet.

Bukan aplikasi pembayaran. Tidak memindahkan uang, tidak terhubung ke bank mana
pun, dan tidak memakai nama, logo, atau aset milik penyedia dompet digital mana
pun.

Rancangan lengkap ada di [RENCANA-WEB.md](RENCANA-WEB.md). Parameter skor dan
protokol layanan pelanggan ada di [SPEC.md](SPEC.md).

---

## Menjalankan

```bash
npm install
npm run dev
```

Untuk memakai **kamera ponsel**, jalankan mode HTTPS:

```bash
npm run dev:https
```

Peladen menampilkan dua alamat:

```
Perangkat ini   http://localhost:5173
Perangkat lain  http://192.168.x.x:5173
```

Buka alamat pertama di laptop dan alamat kedua di ponsel yang berada pada Wi-Fi yang sama.

### Demo daring lewat GitHub Codespaces

Di halaman repo: **Code → Codespaces → Create codespace on main**. Codespace
memasang dependensi, membangun, lalu menjalankan peladen produksi sendiri di
porta 5173. Buka tab **Ports**, klik kanan porta 5173, pilih
**Port Visibility → Public**, lalu bagikan alamat `https://…-5173.app.github.dev`
ke ketiga perangkat. Alamat itu HTTPS asli, jadi kamera ponsel langsung jalan.

Codespace tidur setelah menganggur (bawaan 30 menit) dan data demo ikut
tersimpan di dalamnya. Log peladen ada di `/tmp/sasi.log`.

Uji otomatis:

```bash
npm test
```

---

## Satu perangkat, satu pihak

Setiap perangkat memilih pihaknya sekali, lalu terkunci. Tidak ada menu yang
mencampur pekerjaan pedagang, pembeli, dan petugas, supaya prosedur demo
terbaca jelas oleh penonton.

| Perangkat | Alamat | Pekerjaannya | Tahap PeKA |
|---|---|---|---|
| **Pedagang** | `/pedagang` | meja kasir: tampilkan kode, terima pemberitahuan pembayaran | Peduli |
| **Pembeli** | `/pembeli` | pindai segel, pindai kode, baca putusan, bayar atau adukan | Kenali, Adukan |
| **Petugas** | `/petugas` | terima aduan dari pembeli, periksa bukti, putuskan | Adukan |

Ketiganya adalah perangkat setara. Masing-masing memilih pihaknya sekali di
layar pembuka, lalu terkunci di situ sampai tombol **Ganti pihak** ditekan.
Pilihan itu tersimpan di perangkat, jadi setelah disiapkan sekali, membuka
aplikasi langsung masuk ke pekerjaannya.

Simpan alamat itu sebagai penanda di masing-masing perangkat. Saat demo, tidak
ada satu pun menu yang perlu ditekan sebelum mulai.

### Cara berganti pihak

Dua cara, keduanya sah.

1. **Gulir ke paling bawah**, di atas navigasi ada baris *"Perangkat ini: X"*
   dengan tombol **Ganti pihak**. Menekannya mengosongkan pilihan dan kembali
   ke layar pemilih. Letaknya sengaja di ujung bawah supaya tidak terpencet
   saat demo berjalan.
2. **Buka alamatnya langsung**, misalnya `/pedagang`. Alamat selalu menang atas
   pilihan yang tersimpan, jadi ini cara tercepat saat menyiapkan perangkat.

Pilihan pihak disimpan di perangkat. Setelah disetel sekali, membuka `/` akan
langsung masuk ke pekerjaannya tanpa bertanya lagi.

**Siapkan tiga perangkat sebelum naik panggung.** Dua ponsel untuk pedagang dan
pembeli, satu laptop untuk petugas. Laptop petugas boleh menghadap juri, karena
layarnya justru yang memperlihatkan bahwa penipuan diputus pihak ketiga.

Alamat tambahan: `/verifikasi/contoh` menampilkan empat keadaan berdampingan
untuk ditangkap layarnya dan dipasang di deck presentasi.

### Tampilan: satu cangkang untuk tiga pihak

Ketiga perangkat memakai struktur yang sama persis, disusun mengikuti
tangkapan layar aplikasi dompet digital yang dijadikan acuan tim. Yang berbeda
antar pihak hanya isinya, bukan bentuknya. Itulah yang membuat ketiganya
terbaca sebagai satu sistem saat berdiri berdampingan di meja demo.

| Bagian | Pedagang | Pembeli | Petugas |
|---|---|---|---|
| Angka besar di kepala | jumlah lapak tersegel | saldo simulasi | jumlah aduan menunggu |
| Pita status | daring, meja kasir | daring, lapak tersegel | meja petugas, panjang rantai |
| Kisi empat ikon | kode, daftar, bayaran, bantuan | periksa, riwayat, aduan, bantuan | aduan, skor, rantai, bantuan |
| Tombol bundar di tengah | Kode | **Periksa** | Putuskan |

Seluruhnya diatur satu berkas, `src/components/Cangkang.jsx`.

**Warna dan huruf.** Tema gelap kebiruan dengan kepala bergradasi
`#2FB3E8` ke `#0E58BE`, bidang isi `#0E1217`, kartu `#191F26`, dan aksen biru
`#2AA9E0`. Huruf antarmuka Plus Jakarta Sans. `JetBrains Mono` hanya disisakan
untuk data teknis yang harus berbaris lurus, yaitu NMID, cap muatan, dan kode
aturan.

**Satu hal yang tetap tidak diambil:** nama, logo, dan wordmark penyedia dompet
digital mana pun. Wordmark di kepala tetap **SASI-QR**.

Alasannya bukan kehati-hatian berlebih. Karya ini dinilai juri Bank Indonesia
yang mengawasi penyelenggara jasa pembayaran, dan memasang logo salah satu
penyelenggara pada karya sendiri akan terbaca sebagai peniruan, bukan sebagai
simulasi. Struktur, warna, dan hurufnya sudah mengikuti acuan; yang membedakan
tinggal namanya, dan nama itu memang harus namamu.

**Catatan terhadap `DESIGN.md`.** Sistem desain deck presentasi bertema terang
dengan kanvas krem dan aksen oranye. Purwarupa kini bertema gelap biru, jadi
keduanya **tidak lagi satu keluarga warna**. Tangkapan layar purwarupa yang
dipasang di slide sebaiknya diletakkan di dalam bingkai ponsel, supaya
perbedaan itu terbaca sebagai layar aplikasi, bukan sebagai slide yang
menyimpang dari sistem.

**Saldo dan riwayat adalah simulasi**, tersimpan di perangkat, bukan di
peladen. Keduanya berkurang saat pembayaran simulasi dilakukan, dan dapat
dikembalikan ke nilai awal lewat tombol **Setel ulang dompet simulasi** di
bawah beranda. Jalankan itu sebelum demo diulang.

Catatan pembayaran yang sebenarnya tetap ditulis sebagai blok pada rantai di
peladen. Yang di perangkat hanya tampilan dompetnya.

### Kenapa aduan dipisah

Yang **mengadu** adalah pembeli, satu ketuk langsung dari layar merah. Yang
**memutuskan** adalah petugas, di perangkat yang sama sekali terpisah.

Pemisahan ini bukan sekadar kerapian tampilan. Saat demo, penonton harus
melihat bahwa yang menyatakan sebuah kode itu menipu adalah pihak ketiga,
bukan orang yang sama yang memindai. Kalau keduanya ada di satu perangkat,
prosedurnya terbaca seperti orang menuduh lalu membenarkan dirinya sendiri.

### Petugas tahu ada aduan baru tanpa menatap layar

Ketika aduan masuk, perangkat petugas menampilkan spanduk merah berisi nomor
aduannya, dan penghitung pada tab **Aduan masuk** ikut naik. Spanduk hanya
menghitung aduan yang datang **sejak layar itu dibuka**, jadi tumpukan lama
tidak ikut berbunyi.

Pelacakannya memakai nomor aduan, bukan selisih jumlah yang menunggu. Selisih
bisa menipu: bila petugas memutus satu aduan tepat saat aduan lain masuk,
jumlahnya tidak berubah dan aduan baru itu lolos tanpa terlihat.

### Kode rusak juga bisa diadukan

Kode yang gagal pemeriksaan CRC (aturan **R1**, `E01`) tidak punya NMID yang
bisa diurai. Aduannya tetap bisa dikirim, memakai **cap muatan** sebagai
pengenal, yaitu delapan karakter terakhir muatan yang terbaca.

Dua aturan penting berlaku di sini.

**Muatan yang gagal CRC tidak boleh menuding siapa pun.** Kode rusak sering
masih memuat penanda yang menyebut pemiliknya, tetapi penanda itu berada di
dalam muatan yang sudah terbukti tidak utuh. Aduan atas kode `E01` dan `E02`
karena itu tidak dilekatkan ke akun mana pun, sehingga pedagang jujur yang
stikernya tercoret tidak kehilangan skor.

**Tombol yang mati selalu menyebutkan alasannya.** Bila kronologi belum diisi,
tulisan di bawah tombol mengatakannya. Bila kodenya memang tidak terbaca sama
sekali, tulisannya berbeda lagi dan menyarankan pindai ulang.

### Aduan berpindah perangkat secara langsung

Setelah pembeli mengirim aduan, layarnya **tidak berhenti** di "aduan
terkirim". Layar itu menampilkan perjalanan aduan dalam tiga langkah, dan
menunggu.

Begitu petugas menekan **Konfirmasi penipuan** di perangkatnya, layar pembeli
berubah sendiri menjadi *"Petugas mengonfirmasi penipuan, diputus oleh CS-01"*,
tanpa siapa pun memuat ulang halaman. Pemindaian berikutnya di perangkat itu
langsung menghasilkan **E03**.

Inilah yang membuat pemisahan tiga perangkat terlihat nyata saat demo. Arahkan
kamera proyektor ke perangkat pembeli sambil petugas menekan tombol di
perangkat lain.

Secara teknis, ketiga perangkat berlangganan satu aliran kabar dari peladen.
Kalau aliran itu putus, verifikasi tetap berjalan dari salinan yang sudah ada
di perangkat; aliran hanya mempercepat pembaruan, bukan syarat untuk bekerja.

### Pedagang berpindah halaman sendiri

Perangkat pedagang mengikuti apa yang sedang dilakukan pembeli, tanpa pedagang
menekan tombol apa pun:

```
        menunggu pembeli
               |
    segel dipindai oleh pembeli
               v
        KODE PEMBAYARAN          <- berpindah sendiri
               |
    kode dipindai oleh pembeli
               v
   "Pembeli sedang memeriksa, hasilnya A01"
               |
        pembeli membayar
               v
   PEMBERITAHUAN: Rp20.000 masuk  <- berpindah sendiri
```

Kalau jaringan mati, layar tetap bisa dipindahkan manual lewat tombol
**Tampilkan kode pembayaran sekarang**. Yang hilang hanya perpindahan
otomatisnya, bukan kemampuan menampilkan kode.

### Pembayaran adalah simulasi

Setelah putusan hijau atau kuning, pembeli dapat menekan **Bayar sekarang**,
memilih nominal, dan pedagang langsung menerima pemberitahuan.

Ini **tiruan pemberitahuan aplikasi pembayaran**, bukan pemindahan uang.
SASI-QR tidak terhubung ke penyelenggara jasa pembayaran mana pun dan tidak
memindahkan dana siapa pun. Simulasi ini ada supaya alur demo terasa utuh dari
pindai sampai pedagang menerima kabar.

Kalimat itu tercetak di layar pembeli maupun layar pedagang, jadi juri tidak
perlu bertanya.

Pembayaran yang lolos verifikasi penuh (`A01`) tercatat sebagai blok pada
rantai dan menambah satu poin skor pedagang. Pembayaran pada kode yang belum
terverifikasi tetap dicatat, tetapi tidak menambah skor.

## Prosedur demo

| Urutan | Perangkat | Tindakan | Yang terlihat |
|---|---|---|---|
| 1 | Pedagang | buka `/pedagang`, pilih Warung Mama Ani | kode segel tampil, "menunggu pembeli" |
| 2 | Pembeli | buka `/pembeli`, ketuk **tombol Periksa bundar** di tengah, pindai kode segel | Pedagang **berpindah sendiri** ke kode pembayaran |
| 3 | Pembeli | pindai kode pembayaran | hijau **A01**. Pedagang: "pembeli sedang memeriksa, hasilnya A01" |
| 4 | Pembeli | tekan **Bayar sekarang**, pilih Rp20.000 | Pedagang: **pemberitahuan Rp20.000 masuk** |
| 5 | Pedagang | buka **Mode uji lawan**, tempel kode Toko Sinar Jaya | kode pembayaran berganti |
| 6 | Pembeli | pindai segel lalu kode itu lagi | merah **E04**, tombol bayar hilang |
| 7 | Pembeli | ketuk **Adukan kode ini**, isi kronologi, kirim | Petugas: **spanduk merah "aduan baru masuk"** muncul sendiri |
| 8 | Petugas | tekan **Konfirmasi penipuan** | status jadi terkonfirmasi |
| 9 | Pembeli | **jangan sentuh apa pun** | layar berubah sendiri: "Petugas mengonfirmasi penipuan" |
| 10 | Pembeli | pindai kode itu sekali lagi | merah **E03**, sudah pernah diadukan |

Perangkat petugas sudah terbuka di `/petugas` sejak sebelum demo dimulai, jadi
pada langkah 7 aduan itu mendarat di layarnya tanpa siapa pun menyentuhnya.

Langkah 1 sampai 6 adalah demo panggung. Langkah 7 sampai 10 dipakai
bila ada waktu tanya jawab, karena itulah yang memperlihatkan lingkar PeKA
tertutup penuh.

**Perhatikan langkah 6.** Pada layar merah, tombol bayar memang tidak ada.
Verifikasi gagal berarti tidak ada jalan membayar, bukan sekadar peringatan
yang bisa diabaikan.

**Langkah 9 adalah momen terbaiknya.** Biarkan perangkat pembeli tergeletak dan
tidak disentuh sementara petugas menekan tombol. Layar pembeli akan berubah
sendiri di depan juri.

Sebut kode aturan `A01` dan `E04` dengan suara. Menyebut kode aturan
membuktikan bahwa putusan berasal dari tabel yang tertulis, bukan dari tampilan
yang dibuat-buat.

### Keadaan lain yang bisa diperagakan

| Peragaan | Cara | Hasil |
|---|---|---|
| Kode berubah | segel Mama Ani, lalu kode yang sudah didaftar ulang | kuning **W01** |
| Pernah diadukan | pindai kode Kios Cepat Untung | merah **E03** |
| Segel palsu | pindai segel yang tidak terdaftar | merah **E05** |
| Belum terdaftar | lewati segel, pindai kode mana pun | abu **N02** |

**Jangan memakai Kios Cepat Untung untuk peragaan E04.** NMID-nya sudah masuk
daftar aduan terkonfirmasi, jadi aturan R3 akan lebih dulu terpenuhi dan yang
terbukti bukan R4 melainkan daftar hitam biasa. Pakai Toko Sinar Jaya, yang
bersih tanpa catatan penipuan. Justru itu intinya: kodenya tetap merah semata
karena berada di atas segel yang bukan miliknya.

## Mendaftarkan lapak

Buka `/peduli`, pilih tab **Daftarkan lapak**, lalu tiga langkah:

1. Pindai kode QRIS milik pedagang. Inilah kode yang menjadi pembanding.
2. Isi nama yang dikenal pembeli, alamat lapak, dan telepon.
3. Pindai kode segel yang akan ditempel, lalu tekan **Ikat kode ini ke segel**.

Sejak saat itu, kode apa pun yang berbeda di atas segel tersebut memicu **E04**.
Tidak ada masa belajar dan tidak perlu basis data pelaku.

## Luring

Salinan lapak disimpan di perangkat saat aplikasi pertama dibuka. Setelah itu,
jalur Kenali tidak melakukan satu pun permintaan jaringan, jadi verifikasi tetap
menghasilkan putusan dengan Wi-Fi dimatikan.

Aduan yang dibuat tanpa jaringan masuk antrean di perangkat, dan terkirim
sendiri begitu jaringan kembali. Jumlah antrean tampil di kartu atas.

Ada `public/sw.js` yang menyimpan cangkang aplikasi supaya `/kenali` tetap bisa
dibuka dari keadaan tertutup tanpa jaringan. **Pendaftarannya belum terbukti**,
karena peramban tersemat yang dipakai menguji memblokir Service Worker. Uji di
ponsel lewat HTTPS dan periksa konsol: pendaftaran yang berhasil mencetak
`[SASI-QR] Service Worker aktif`. Demo panggung tidak bergantung padanya.

## Kamera di ponsel

Kalau kamera tidak mau menyala di ponsel, **itu bukan aplikasinya**. Peramban
memang melarang kamera di alamat `http://` biasa. Hanya `https://` dan
`localhost` yang diizinkan.

### Cara memperbaikinya

Hentikan peladen, lalu jalankan:

```bash
npm run dev:https
```

Terminal akan menampilkan alamat `https://`:

```
Perangkat ini   https://localhost:5173
Perangkat lain  https://192.168.0.103:5173
```

Buka alamat kedua di ponsel. Peramban akan memperingatkan bahwa sambungannya
tidak aman. **Itu wajar.** Sertifikatnya diterbitkan sendiri oleh peladen ini,
bukan oleh otoritas resmi, karena di jaringan lokal memang tidak ada otoritas
yang bisa menandatanganinya.

- Chrome Android: ketuk **Lanjutkan** atau **Advanced**, lalu **Proceed to ... (unsafe)**
- Safari iOS: ketuk **Show Details**, lalu **visit this website**

Setelah itu izinkan kamera saat peramban bertanya. Sertifikatnya disimpan di
`data/sertifikat.json`, jadi peringatan ini hanya muncul sekali per perangkat.

### Kalau alamat IP-nya berubah

Sertifikat terikat ke alamat IP saat dibuat. Kalau kamu pindah Wi-Fi dan IP
berubah, hapus sertifikat lama supaya dibuat ulang:

```bash
rm data/sertifikat.json
```

### Kalau masih tidak mau

Aplikasi akan menampilkan pesan yang menyebut sebabnya, bukan sekadar "kamera
tidak tersedia". Tiga sebab yang mungkin:

| Pesan | Artinya |
|---|---|
| Kamera diblokir oleh peramban | masih di alamat `http`, pakai `npm run dev:https` |
| Izin kamera ditolak | buka pengaturan situs di peramban, izinkan kamera, muat ulang |
| Perangkat ini tidak punya kamera | biasanya laptop tanpa webcam |

### Jeda antar pindai

Setelah kode segel terbaca, pemindai menahan diri **1,5 detik** sebelum mau
membaca kode berikutnya, dan menampilkan tulisan *"Bersiap, arahkan ke kode
berikutnya"*. Tanpa jeda ini, kamera yang masih mengarah ke segel langsung
membacanya lagi sebagai kode pembayaran.

Sebagai pengaman kedua, kode segel yang terbaca pada langkah kedua ditolak
dengan pesan *"Itu kode segel, bukan kode pembayaran"*, baik dari kamera maupun
dari tempelan manual.

### Cadangan yang selalu jalan

Setiap layar pemindai punya tombol **Pintasan demo** yang memilih kode langsung
dari daftar, tanpa kamera sama sekali. Untuk presentasi ini sudah cukup dan
tidak pernah gagal. Ada juga kotak tempel manual untuk menempelkan muatan QRIS
sebagai teks.

## Menyetel ulang data

```bash
rm data/*.json
```

Data awal dibangkitkan ulang saat peladen berikutnya dijalankan, lengkap dengan empat pita skor dan dua aduan.

---

## Struktur

```
server.js                 peladen: menyajikan salinan, menerima aduan, rantai
seed.js                   data awal
src/lib/emv.js            pengurai QRIS, CRC-16, tabel keputusan R1..R9
src/lib/salinan.js        salinan luring dan mesin putusan sisi klien
src/lib/score.js          tabel poin dan pita, dipakai konsol petugas
src/lib/chain.js          rantai blok dan verifikasinya
src/screens/Peduli.jsx    tahap 1
src/screens/Kenali.jsx    tahap 2, dua pindai
src/screens/Adukan.jsx    tahap 3
src/components/LayarVerifikasi.jsx   DESIGN.md 6.5
test/sasi.test.js         20 uji satuan
test/peka.test.js         5 uji integrasi lingkar PeKA
```

Seluruh putusan dihitung di perangkat. Peladen tidak pernah memutuskan apa pun,
sesuai Laporan Subbab 4.3.1. Jalur Kenali tidak melakukan satu pun permintaan
jaringan, jadi verifikasi tetap bekerja tanpa internet.

Logika keputusan berada di `src/lib/`, tidak menyentuh React, dan dapat dibaca
tanpa memahami kerangka kerja apa pun.

## Ukuran

| Berkas | Mentah | Gzip |
|---|---|---|
| Bundel utama | 190 KB | 63 KB |
| Gaya | 12 KB | 3 KB |
| `jsQR`, hanya bila peramban tanpa `BarcodeDetector` | 131 KB | 47 KB |

Pada Android Chrome modern, `jsQR` tidak pernah diunduh.

---

SMA Laboratorium Universitas Pattimura · purwarupa riset GenZ-ThinkUp 2026
