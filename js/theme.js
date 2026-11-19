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

// Semua tema (neon & Instagram): ikon medsos + murottal di bawah bio, bersebelahan dan rata tengah.
function placeMurottal() {
    const row = document.getElementById('murottalRow');
    const social = document.getElementById('socialMediaRow');
    const line = document.getElementById('igSocialLine');
    if (!row || !social || !line) return;
    if (social.parentElement !== line) line.appendChild(social);
    if (row.parentElement !== line) line.appendChild(row);
}

export function initTheme() {
    placeMurottal();
    refreshInstaProfile();

    // Header tetap di tempat; hanya latarnya yang berubah: transparan di puncak halaman, kaca agak transparan saat digulir
    const header = document.getElementById('appHeader');
    if (header) {
        let ticking = false;
        const sync = () => { ticking = false; header.classList.toggle('is-stuck', window.scrollY > 4); };
        window.addEventListener('scroll', () => {
            if (!ticking) { ticking = true; requestAnimationFrame(sync); }
        }, { passive: true });
        sync();
    }

    document.addEventListener('kp-themechange', (e) => {
        placeMurottal();
        refreshInstaProfile();
        if (e.detail && e.detail.announce) showToast('Tema ' + e.detail.label + ' aktif');
    });
}
