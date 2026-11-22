/**
 * theme-early.js
 * Skrip biasa (bukan modul) yang dimuat sinkron di <head>:
 *  1) menerapkan tema tersimpan sebelum halaman digambar (tanpa kedipan)
 *  2) menyediakan window.toggleTheme() SEGERA, tanpa menunggu modul lain,
 *     sehingga tombol tema selalu berfungsi (juga di HP / browser lama).
 * Ada 3 tema, berganti berurutan tiap tombol ditekan: Instagram -> Neon -> Jarvis -> Instagram ...
 *  - "insta"  (bawaan)  = data-theme="insta" di <html>
 *  - "neon"             = tanpa atribut data-theme
 *  - "jarvis"           = data-theme="jarvis" (font Orbitron & Rajdhani dimuat hanya saat tema ini dipakai)
 * Pilihan disimpan di localStorage (kunci "kp_theme").
 * Modul js/theme.js mendengarkan event "kp-themechange" untuk toast & statistik profil.
 */
(function () {
    var KEY = 'kp_theme';
    var root = document.documentElement;
    var ORDER = ['insta', 'neon', 'jarvis'];
    var LABEL = { neon: 'Neon Futuristik', insta: 'Instagram', jarvis: 'Jarvis Futuristik' };
    var COLOR = { neon: '#06070b', insta: '#05060a', jarvis: '#020a10' };
    var ICON = { neon: 'fa-solid fa-star', insta: 'fa-solid fa-star', jarvis: 'fa-solid fa-atom' };
    var FONT_URL = 'https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;800&family=Rajdhani:wght@500;600;700&display=swap';

    function normalize(v) { return (v === 'neon' || v === 'jarvis') ? v : 'insta'; }
    function current() { return normalize(root.getAttribute('data-theme') === null ? 'neon' : root.getAttribute('data-theme')); }
    function setAttr(target) {
        if (target === 'neon') root.removeAttribute('data-theme');
        else root.setAttribute('data-theme', target);
    }

    // Font tema Jarvis: hanya diunduh bila tema ini dipakai
    function ensureFonts(target) {
        if (target !== 'jarvis' || document.getElementById('jvFonts')) return;
        var link = document.createElement('link');
        link.id = 'jvFonts';
        link.rel = 'stylesheet';
        link.href = FONT_URL;
        (document.head || root).appendChild(link);
    }

    // Bawaan = Instagram. Hanya bila pengunjung pernah memilih neon / jarvis, tema itu yang dipakai.
    var saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) { /* abaikan */ }
    var start = normalize(saved);
    setAttr(start);
    ensureFonts(start);

    function nextTheme() { return ORDER[(ORDER.indexOf(current()) + 1) % ORDER.length]; }

    function syncButton() {
        var btn = document.getElementById('themeToggleBtn');
        if (!btn) return;
        var text = 'Ganti tema ke ' + LABEL[nextTheme()];
        btn.title = text;
        btn.setAttribute('aria-label', text);
        btn.removeAttribute('aria-pressed');
        var icon = document.getElementById('themeToggleIcon');
        if (icon) icon.className = ICON[current()] + ' text-neon-cyan';
    }

    function rerender() {
        // Saat data masih dimuat, biarkan: nanti tergambar otomatis dengan tema yang benar
        var loading = document.getElementById('linksLoading');
        if (loading && !loading.classList.contains('hidden')) return;
        if (typeof window.filterLinks === 'function') window.filterLinks();
    }

    function apply(target, persist, announce) {
        setAttr(target);
        ensureFonts(target);

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
        apply(nextTheme(), true, true);
    };

    // Ikuti perubahan tema dari tab lain
    window.addEventListener('storage', function (e) {
        if (e.key === KEY) apply(normalize(e.newValue), false, false);
    });

    document.addEventListener('DOMContentLoaded', function () {
        syncButton();
        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', COLOR[current()]);
    });
})();
