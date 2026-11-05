/**
 * pwa.js
 * PWA: tombol Install aplikasi (Android, laptop, iOS) dan pendaftaran Service Worker (cache offline).
 */

import { showToast } from './utils.js';
import { showInfoModal } from './link-lock.js';

// --- PWA: INSTALL APLIKASI (HP & LAPTOP) ---
function isStandaloneMode() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}
function isIOSDevice() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
export function refreshInstallButton() {
    const btn = document.getElementById('installBtn');
    if (!btn) return;
    const canShow = !isStandaloneMode() && (window.__bip || isIOSDevice());
    btn.classList.toggle('hidden', !canShow);
}
window.addEventListener('pwa-installable', refreshInstallButton);
window.addEventListener('appinstalled', () => {
    window.__bip = null;
    refreshInstallButton();
    showToast('Aplikasi berhasil diinstal!');
});

window.handleInstallClick = async function() {
    if (window.__bip) {
        const promptEvent = window.__bip;
        promptEvent.prompt();
        try { await promptEvent.userChoice; } catch (e) {}
        window.__bip = null;
        refreshInstallButton();
        return;
    }
    if (isIOSDevice()) {
        showInfoModal({
            icon: 'fa-solid fa-download',
            tone: 'cyan',
            title: 'Install di iPhone / iPad',
            message: '1. Buka halaman ini di Safari\n2. Ketuk tombol Bagikan (kotak dengan panah ke atas)\n3. Pilih "Tambahkan ke Layar Utama"'
        });
    } else {
        showInfoModal({
            icon: 'fa-solid fa-download',
            tone: 'cyan',
            title: 'Install Aplikasi',
            message: 'Buka menu browser, lalu pilih "Install app" atau "Tambahkan ke layar utama".'
        });
    }
};

export function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (!(location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) return;

    const hadController = !!navigator.serviceWorker.controller;
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hadController || reloading) return; // jangan reload pada install pertama
        reloading = true;
        window.location.reload();
    });

    navigator.serviceWorker.register('sw.js').catch(err => {
        console.warn('Service worker gagal didaftarkan:', err);
    });
}
