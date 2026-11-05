/**
 * pwa-early.js
 * Dijalankan SEGERA saat halaman mulai dimuat (bukan modul), supaya event install PWA
 * tidak terlewat sebelum aplikasi utama (js/main.js) siap. Tombol Install ada di js/pwa.js.
 */

// Tangkap event install lebih awal supaya tombol Install tidak terlewat
window.__bip = null;
window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    window.__bip = e;
    window.dispatchEvent(new Event('pwa-installable'));
});
