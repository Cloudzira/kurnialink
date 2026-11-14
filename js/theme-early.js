/**
 * theme-early.js
 * Skrip biasa (bukan modul) yang dimuat sinkron di <head>:
 *  1) menerapkan tema tersimpan sebelum halaman digambar (tanpa kedipan)
 *  2) menyediakan window.toggleTheme() SEGERA, tanpa menunggu modul lain,
 *     sehingga tombol tema selalu berfungsi (juga di HP / browser lama).
 * Tema bawaan = "neon" (tanpa atribut). Tema kedua = "insta".
 * Modul js/theme.js mendengarkan event "kp-themechange" untuk toast & statistik profil.
 */
(function () {
    var KEY = 'kp_theme';
    var root = document.documentElement;
    var LABEL = { neon: 'Neon Futuristik', insta: 'Instagram' };
    var COLOR = { neon: '#06070b', insta: '#05060a' };

    function current() { return root.getAttribute('data-theme') === 'insta' ? 'insta' : 'neon'; }

    try {
        if (localStorage.getItem(KEY) === 'insta') root.setAttribute('data-theme', 'insta');
    } catch (e) { /* localStorage diblokir: pakai tema bawaan */ }

    function syncButton() {
        var btn = document.getElementById('themeToggleBtn');
        if (!btn) return;
        var next = current() === 'insta' ? 'neon' : 'insta';
        var text = 'Ganti tema ke ' + LABEL[next];
        btn.title = text;
        btn.setAttribute('aria-label', text);
        btn.setAttribute('aria-pressed', current() === 'insta' ? 'true' : 'false');
    }

    function rerender() {
        // Saat data masih dimuat, biarkan: nanti tergambar otomatis dengan tema yang benar
        var loading = document.getElementById('linksLoading');
        if (loading && !loading.classList.contains('hidden')) return;
        if (typeof window.filterLinks === 'function') window.filterLinks();
    }

    function apply(target, persist, announce) {
        if (target === 'insta') root.setAttribute('data-theme', 'insta');
        else root.removeAttribute('data-theme');

        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', COLOR[target]);
        syncButton();

        if (persist) { try { localStorage.setItem(KEY, target); } catch (e) { /* abaikan */ } }

        try { rerender(); } catch (e) { console.warn('Tema: gagal menggambar ulang daftar', e); }
        try {
            document.dispatchEvent(new CustomEvent('kp-themechange', { detail: { theme: target, label: LABEL[target], announce: !!announce } }));
        } catch (e) { /* abaikan */ }
    }

    window.toggleTheme = function () {
        apply(current() === 'insta' ? 'neon' : 'insta', true, true);
    };

    // Ikuti perubahan tema dari tab lain
    window.addEventListener('storage', function (e) {
        if (e.key === KEY) apply(e.newValue === 'insta' ? 'insta' : 'neon', false, false);
    });

    document.addEventListener('DOMContentLoaded', syncButton);
})();
