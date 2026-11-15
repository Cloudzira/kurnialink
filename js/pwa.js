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

/**
 * Notifikasi pembaruan: saat versi baru aplikasi terpasang (service worker baru mengambil alih),
 * tampilkan kartu kecil dengan tombol "Perbarui". Halaman TIDAK di-reload otomatis,
 * jadi pengunjung yang sedang membaca tidak terganggu: mereka memilih sendiri kapan memuat ulang.
 */
export function showUpdateBanner() {
    if (document.getElementById('updateBanner')) return;

    const banner = document.createElement('div');
    banner.id = 'updateBanner';
    banner.className = 'kp-update';
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-live', 'polite');
    banner.innerHTML = `
        <span class="kp-update-ico" aria-hidden="true"><i class="fa-solid fa-circle-arrow-up"></i></span>
        <div class="kp-update-text">
            <b>Pembaruan tersedia</b>
            <span>Muat ulang untuk memakai versi terbaru.</span>
        </div>
        <button type="button" class="kp-update-btn" id="updateNowBtn">Perbarui</button>
        <button type="button" class="kp-update-x" id="updateLaterBtn" aria-label="Tutup">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
    `;
    document.body.appendChild(banner);
    banner.querySelector('#updateNowBtn').addEventListener('click', () => window.location.reload());
    banner.querySelector('#updateLaterBtn').addEventListener('click', () => {
        banner.classList.add('is-leaving');
        setTimeout(() => banner.remove(), 300);
    });
}
window.showUpdateBanner = showUpdateBanner;

export function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (!(location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) return;

    // Pemasangan pertama kali (belum ada service worker sebelumnya) bukan pembaruan: jangan tampilkan notifikasi
    let hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hadController) { hadController = true; return; }
        showUpdateBanner();
    });

    navigator.serviceWorker.register('sw.js').then(reg => {
        // Cek versi baru saat aplikasi dibuka kembali dan tiap 30 menit selama terbuka
        const check = () => { reg.update().catch(() => {}); };
        document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
        setInterval(check, 30 * 60 * 1000);
    }).catch(err => {
        console.warn('Service worker gagal didaftarkan:', err);
    });
}
