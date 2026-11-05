# Kurniapedia (KurniaLink)

Halaman link/folder dengan pengaturan admin ("Cloudzone"), banner slider, pemutar murottal,
dan PWA yang bisa di-install. Data disimpan di Firebase (Firestore + Auth).

> Kode ini **hanya dirapikan** (dipecah per fitur). Fitur dan tampilan sama persis dengan versi sebelumnya.

## Struktur folder

```
kurnialink-main/
├── index.html          ← kerangka halaman (HTML saja, tanpa CSS/JS di dalamnya)
├── manifest.json       ← pengaturan PWA (nama, ikon, warna)
├── sw.js               ← Service Worker (cache supaya cepat & bisa offline)
├── firestore.rules     ← aturan keamanan database Firestore
├── *.png               ← ikon & favicon
│
├── css/                ← semua gaya tampilan (urutan dimuat diatur di index.html)
│   ├── base.css            dasar: panel kaca, kartu, folder, input, scrollbar
│   ├── profile-admin.css   bingkai neon foto profil & panel admin
│   ├── link-cards.css      kartu link, cahaya neon, link terkunci
│   ├── murottal.css        pemutar murottal
│   ├── banner.css          banner slider
│   ├── splash.css          splash screen
│   └── background.css      latar futuristik (bintang, aurora, grid)
│
└── js/                 ← semua logika program, satu file = satu tugas
    ├── main.js             TITIK MASUK: memuat semua file lalu menjalankan aplikasi
    ├── config.js           konfigurasi Firebase & avatar bawaan  ← edit di sini untuk ganti project
    ├── state.js            data bersama (user login, daftar link, profil, dll.)
    ├── utils.js            fungsi bantu: toast, escapeHtml, ambil elemen
    │
    ├── firebase.js         koneksi & langganan data Firestore (real-time)
    ├── auth.js             login / logout admin
    ├── admin-ui.js         tampilan mode admin & data cadangan lokal
    ├── admin-form.js       form tambah item: pemilih ikon, jenis link/folder
    │
    ├── profile.js          tampilan profil + olah foto profil
    ├── profile-edit.js     edit profil oleh admin
    │
    ├── links-render.js     menampilkan link & folder, drag & drop urutan
    ├── links-actions.js    tambah / edit / hapus / sembunyikan link, hitung klik
    ├── link-lock.js        kunci link & jendela info
    ├── link-light.js       animasi cahaya neon di tepi kartu
    ├── search.js           pencarian link
    ├── share.js            tombol bagikan
    │
    ├── banner.js           banner slider (tampilan)
    ├── banner-admin.js     pengaturan banner oleh admin
    ├── murottal-data.js    daftar 114 surat & sumber audio
    ├── murottal.js         pemutar murottal
    │
    ├── pwa.js              tombol Install & pendaftaran Service Worker
    ├── pwa-early.js        menangkap event install lebih awal (script biasa)
    ├── splash.js           splash screen
    └── tailwind-config.js  warna & font Tailwind (script biasa)
```

## Cara kerja singkat

- `index.html` memuat `js/main.js`. File itu meng-**import** semua file lain, lalu menjalankan `startApp()`.
- Setiap file JS menulis `import { ... } from './nama.js'` untuk memakai fungsi dari file lain,
  dan `export` untuk fungsi yang boleh dipakai file lain.
- Data yang dipakai banyak file disimpan di satu objek: `state` (lihat `js/state.js`).
  Contoh: `state.currentUser` berisi admin yang sedang login (atau `null` jika pengunjung biasa).
- Fungsi yang dipanggil dari HTML (misalnya `onclick="shareProfile()"`) dipasang ke `window`,
  contoh: `window.shareProfile = function() { ... }`. Jangan hapus awalan `window.` itu.

## "Mau ubah X, buka file mana?"

| Ingin mengubah…                         | Buka file                      |
|-----------------------------------------|--------------------------------|
| Project Firebase                        | `js/config.js`                 |
| Qari / daftar surat / sumber audio      | `js/murottal-data.js`          |
| Tampilan kartu link atau folder         | `css/link-cards.css`, `css/base.css` |
| Tampilan banner                         | `css/banner.css`               |
| Warna neon / font                       | `js/tailwind-config.js`        |
| Lama tampil splash screen               | `js/splash.js`                 |
| Ikon medsos & footer                    | `index.html`                   |
| Aturan siapa boleh menulis ke database  | `firestore.rules`              |

## Deploy (GitHub + Vercel)

Tidak ada langkah baru: unggah seluruh isi folder ke GitHub, Vercel akan otomatis menayangkan.
Tidak butuh proses build.

**Penting:** setiap kali mengubah `sw.js` (misalnya menambah file baru di daftar `SHELL_ASSETS`),
naikkan angka `VERSION` di bagian atas `sw.js` supaya cache lama di HP pengunjung diganti.
File di folder `js/` dan `css/` selalu diambil versi terbaru saat online, jadi untuk perubahan
kode biasa tidak perlu menaikkan `VERSION`.
