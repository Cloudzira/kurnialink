# Kurniapedia (KurniaLink)

Halaman link/folder dengan pengaturan admin ("Cloudzone"), banner slider, pemutar murottal,
dan PWA yang bisa di-install. Data disimpan di Firebase (Firestore + Auth).

> Versi ini: keamanan diperketat (rules hanya untuk UID admin, header keamanan), lebih cepat (Tailwind statis, ikon dikompres,
> Cloudz AI tidak lagi menunggu pembacaan halaman) dan ditambah lapisan efek futuristik (`css/futuristic.css`, `js/futuristic.js`).

## Struktur folder

```
kurnialink-main/
├── _headers            ← header keamanan & cache Cloudflare Pages (CSP masih mode Report-Only)
├── tailwind.config.js  ← pengaturan Tailwind (warna neon & font) untuk build CSS
├── src/tailwind.input.css
├── index.html          ← kerangka halaman (HTML saja, tanpa CSS/JS di dalamnya)
├── manifest.json       ← pengaturan PWA (nama, ikon, warna)
├── sw.js               ← Service Worker (cache supaya cepat & bisa offline)
├── firestore.rules     ← aturan keamanan database Firestore
├── functions/
│   └── api/
│       └── chat.js     ← SERVER perantara ke Google Gemini (Cloudflare Pages Function; tempat API key dipakai)
├── *.png               ← ikon & favicon
│
├── css/                ← semua gaya tampilan (urutan dimuat diatur di index.html)
│   ├── base.css            dasar: panel kaca, kartu, folder, input, scrollbar
│   ├── profile-admin.css   bingkai neon foto profil & panel admin
│   ├── link-cards.css      kartu link, cahaya neon, link terkunci
│   ├── murottal.css        pemutar murottal
│   ├── banner.css          banner slider
│   ├── splash.css          splash screen
│   ├── background.css      latar futuristik (bintang, aurora, grid)
│   ├── tailwind.css        HASIL BUILD Tailwind (jangan diedit tangan)
│   └── futuristic.css      efek tambahan: cahaya kursor, grain, denyut klik, boot splash
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
    ├── ai-chat.js          Cloudz AI: tombol & popup chat (kirim ke /api/chat)
    │
    ├── pwa.js              tombol Install & pendaftaran Service Worker
    ├── pwa-early.js        menangkap event install lebih awal (script biasa)
    ├── splash.js           splash screen
    └── futuristic.js       teks boot splash, cahaya kursor, pintasan Ctrl+K
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
| Warna neon / font                       | `tailwind.config.js` lalu `npm run build:css` |
| Lama tampil splash screen               | `js/splash.js`                 |
| Ikon medsos & footer                    | `index.html`                   |
| Aturan siapa boleh menulis ke database  | `firestore.rules`              |
| Kepribadian / aturan Cloudz AI          | `functions/api/chat.js` (SYSTEM_PROMPT) |
| Model AI yang dipakai                   | Variabel Cloudflare `GEMINI_MODEL` |
| Tampilan popup Cloudz AI                | `css/ai-chat.css`              |

## Deploy (GitHub + Cloudflare Pages)

Unggah seluruh isi folder ke GitHub, Cloudflare Pages akan otomatis menayangkan (tanpa build; folder `functions/` otomatis dikenali).

**Penting:** setiap kali mengubah `sw.js` (misalnya menambah file baru di daftar `SHELL_ASSETS`),
naikkan angka `VERSION` di bagian atas `sw.js` supaya cache lama di HP pengunjung diganti.
File di folder `js/` dan `css/` selalu diambil versi terbaru saat online, jadi untuk perubahan
kode biasa tidak perlu menaikkan `VERSION`.

## Cloudz AI (Google Gemini) — aman

API key **tidak boleh** ditulis di file mana pun di proyek ini. Key disimpan di Cloudflare:
Workers & Pages → project → Settings → Variables and Secrets → tambah `GEMINI_API_KEY` bertipe **Secret**,
lalu deploy ulang. Browser hanya bicara ke `/api/chat`; fungsi di `functions/api/chat.js` yang memakai key di server.

### Cloudz AI membaca isi tiap web
Server membaca daftar link dari Firestore, lalu membuka halaman tiap link untuk mengambil ringkasan
(`<meta name="description">` dan judul bagian `h1`-`h3`). Supaya AI paham aplikasi Anda, isi **meta description**
yang jelas di tiap aplikasi dan isi kolom **deskripsi** link. Link terkunci/tersembunyi dan media sosial tidak dibuka.
Ringkasan terisi bertahap beberapa menit setelah deploy dan disimpan 12 jam.

## Tailwind (build statis)

`css/tailwind.css` adalah hasil build dan sudah disertakan, jadi **Cloudflare Pages tidak perlu build command**.
Bangun ulang hanya jika Anda menambah class Tailwind baru di `index.html` atau `js/`:

```
npm install
npm run build:css
```
lalu commit `css/tailwind.css` yang baru.

## Keamanan

- `firestore.rules`: hanya UID admin yang boleh menulis; pengunjung hanya boleh menambah `clicks` sebanyak 1. Salin isinya ke Firebase Console → Firestore → Rules → Publish.
- Matikan pendaftaran akun baru: Authentication → Settings → User actions → nonaktifkan "Enable create (sign-up)".
- Batasi API key Firebase ke domain Anda di Google Cloud Console → Credentials.
- `_headers`: CSP saat ini `Report-Only`. Buka web, cek Console browser; bila tidak ada pelanggaran, ubah nama header menjadi `Content-Security-Policy` agar dipaksakan.
- Kode link terkunci tetap kunci "ringan" (terbaca publik di Firestore); jangan dipakai untuk rahasia penting.
- Di Cloudflare: matikan Rocket Loader, dan buat aturan Rate Limiting untuk `/api/chat`.
