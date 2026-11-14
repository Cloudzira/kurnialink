/**
 * theme-early.js
 * Dijalankan sinkron di <head> (sebelum halaman digambar) supaya tema pilihan pengunjung langsung benar,
 * tanpa kedipan. Tema bawaan = "neon" (tanpa atribut). Tema kedua = "insta".
 */
(function () {
    try {
        if (localStorage.getItem('kp_theme') === 'insta') {
            document.documentElement.setAttribute('data-theme', 'insta');
        }
    } catch (e) { /* localStorage diblokir: pakai tema bawaan */ }
})();
