/**
 * theme.js
 * Pengatur tema: "neon" (bawaan, futuristik) dan "insta" (tampilan profil Instagram).
 * - Pilihan disimpan di localStorage (kp_theme) dan ikut tersinkron antar-tab.
 * - Tombol ganti tema ada di sebelah tombol Bagikan (window.toggleTheme).
 * - Saat tema berganti, daftar link digambar ulang dengan bentuk kartu sesuai tema.
 */

import { showToast } from './utils.js';
import { refreshInstaProfile } from './theme-insta.js';

const STORAGE_KEY = 'kp_theme';
const THEMES = {
    neon:  { label: 'Neon Futuristik', color: '#06070b' },
    insta: { label: 'Instagram',       color: '#05060a' }
};

export function getTheme() {
    return document.documentElement.getAttribute('data-theme') === 'insta' ? 'insta' : 'neon';
}

export function isInsta() {
    return getTheme() === 'insta';
}

function syncButton() {
    const btn = document.getElementById('themeToggleBtn');
    if (!btn) return;
    const next = isInsta() ? 'neon' : 'insta';
    const text = 'Ganti tema ke ' + THEMES[next].label;
    btn.title = text;
    btn.setAttribute('aria-label', text);
    btn.setAttribute('aria-pressed', isInsta() ? 'true' : 'false');
}

function rerenderLinks() {
    // Saat data masih dimuat, biarkan: nanti tergambar otomatis dengan tema yang benar
    const loading = document.getElementById('linksLoading');
    if (loading && !loading.classList.contains('hidden')) return;
    if (typeof window.filterLinks === 'function') window.filterLinks();
}

function applyTheme(theme, { persist = true, announce = false } = {}) {
    const target = theme === 'insta' ? 'insta' : 'neon';
    if (target === getTheme() && !announce) return;

    const run = () => {
        if (target === 'insta') document.documentElement.setAttribute('data-theme', 'insta');
        else document.documentElement.removeAttribute('data-theme');

        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', THEMES[target].color);

        syncButton();
        rerenderLinks();
        refreshInstaProfile();
    };

    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (document.startViewTransition && !reduced) document.startViewTransition(run);
    else run();

    if (persist) {
        try { localStorage.setItem(STORAGE_KEY, target); } catch (e) { /* abaikan */ }
    }
    if (announce) showToast('Tema ' + THEMES[target].label + ' aktif');
}

window.toggleTheme = function () {
    applyTheme(isInsta() ? 'neon' : 'insta', { announce: true });
};

export function initTheme() {
    syncButton();
    refreshInstaProfile();

    // Ikuti perubahan tema dari tab lain
    window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) applyTheme(e.newValue === 'insta' ? 'insta' : 'neon', { persist: false });
    });
}
