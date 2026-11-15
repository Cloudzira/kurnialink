/**
 * theme.js
 * Pendamping modul untuk tema ("neon" bawaan dan "insta").
 * Logika ganti tema ada di js/theme-early.js (window.toggleTheme) agar tombol selalu bekerja.
 * Di sini: pembaca tema untuk modul lain, toast, dan pembaruan statistik profil saat tema berganti.
 */

import { showToast } from './utils.js';
import { refreshInstaProfile } from './theme-insta.js';

export function getTheme() {
    return document.documentElement.getAttribute('data-theme') === 'insta' ? 'insta' : 'neon';
}

export function isInsta() {
    return getTheme() === 'insta';
}

// Tema Instagram: pemutar murottal ada di sebelah kanan ikon medsos. Tema neon: kembali ke posisi tengah di bawah judul.
function placeMurottal() {
    const row = document.getElementById('murottalRow');
    const line = document.getElementById('igSocialLine');
    const home = document.getElementById('murottalHome');
    if (!row || !line || !home) return;
    if (isInsta()) {
        if (row.parentElement !== line) line.appendChild(row);
    } else if (row.parentElement === line) {
        home.after(row);
    }
}

export function initTheme() {
    placeMurottal();
    refreshInstaProfile();

    // Bilah atas (tema Instagram): transparan di puncak halaman, berubah jadi kaca saat di-scroll
    const bar = document.getElementById('topBar');
    const sentinel = document.getElementById('topBarSentinel');
    if (bar && sentinel && 'IntersectionObserver' in window) {
        new IntersectionObserver(([entry]) => {
            bar.classList.toggle('is-stuck', !entry.isIntersecting);
        }).observe(sentinel);
    }

    document.addEventListener('kp-themechange', (e) => {
        placeMurottal();
        refreshInstaProfile();
        if (e.detail && e.detail.announce) showToast('Tema ' + e.detail.label + ' aktif');
    });
}
