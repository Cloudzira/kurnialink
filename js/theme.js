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

// Tema Instagram: ikon medsos di bawah judul (kiri) dan murottal di bawah tombol (kanan).
// Tema neon: kembali ke susunan semula (murottal di tengah di bawah judul, ikon medsos di bawah bio).
function placeMurottal() {
    const row = document.getElementById('murottalRow');
    const social = document.getElementById('socialMediaRow');
    const line = document.getElementById('igSocialLine');
    const home = document.getElementById('murottalHome');
    const left = document.getElementById('headerSubLeft');
    const right = document.getElementById('headerSubRight');
    if (!row || !social || !line || !home || !left || !right) return;
    if (isInsta()) {
        if (social.parentElement !== left) left.appendChild(social);
        if (row.parentElement !== right) right.appendChild(row);
    } else {
        if (social.parentElement !== line) line.appendChild(social);
        if (row.previousElementSibling !== home) home.after(row);
    }
}

export function initTheme() {
    placeMurottal();
    refreshInstaProfile();

    document.addEventListener('kp-themechange', (e) => {
        placeMurottal();
        refreshInstaProfile();
        if (e.detail && e.detail.announce) showToast('Tema ' + e.detail.label + ' aktif');
    });
}
