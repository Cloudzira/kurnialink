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
 * Notifikasi pembaruan.
 * Cara kerja:
 *  - Saat aplikasi dibuka, browser mengecek SEKALI apakah ada versi baru (file sw.js). Jika ada, versi baru
 *    diunduh diam-diam di latar belakang. TIDAK ada notifikasi pada saat itu.
 *  - Pada pembukaan aplikasi BERIKUTNYA, jika versinya sudah berganti, muncul kartu "Aplikasi sudah diperbarui"
 *    (setelah splash selesai, hilang otomatis).
 *  - Jika aplikasi sudah memakai versi terakhir, tidak ada notifikasi sama sekali.
 *  - Tidak ada pengecekan berulang selama aplikasi terbuka.
 * Penting: setiap kali memperbarui aplikasi, naikkan angka VERSION di sw.js (mis. v37 menjadi v38).
 */
const VERSION_KEY = 'kp_app_version'; // versi terakhir yang sudah dipakai/dilihat pengunjung

function whenSplashDone(fn) {
    if (window.__splashDone || !document.getElementById('splashScreen')) { fn(); return; }
    window.addEventListener('kp-splash-done', () => setTimeout(fn, 350), { once: true });
}

function showUpdatedBanner(version) {
    whenSplashDone(() => {
        if (document.getElementById('updateBanner')) return;
        const banner = document.createElement('div');
        banner.id = 'updateBanner';
        banner.className = 'kp-update';
        banner.setAttribute('role', 'status');
        banner.setAttribute('aria-live', 'polite');
        banner.innerHTML = `
            <span class="kp-update-ico" aria-hidden="true"><i class="fa-solid fa-circle-arrow-up"></i></span>
            <div class="kp-update-text">
                <b>Aplikasi sudah diperbarui</b>
                <span>Kamu sekarang memakai versi terbaru (${version}).</span>
            </div>
            <button type="button" class="kp-update-x" id="updateLaterBtn" aria-label="Tutup">
                <i class="fa-solid fa-xmark" aria-hidden="true"></i>
            </button>
        `;
        document.body.appendChild(banner);
        const close = () => {
            banner.classList.add('is-leaving');
            setTimeout(() => banner.remove(), 300);
        };
        banner.querySelector('#updateLaterBtn').addEventListener('click', close);
        setTimeout(close, 6000);
    });
}

// Tanya service worker "versi berapa?"
function askWorkerVersion(worker) {
    return new Promise((resolve) => {
        if (!worker) { resolve(null); return; }
        const ch = new MessageChannel();
        const timer = setTimeout(() => resolve(null), 1500);
        ch.port1.onmessage = (e) => { clearTimeout(timer); resolve(e.data || null); };
        try { worker.postMessage('GET_VERSION', [ch.port2]); } catch (e) { clearTimeout(timer); resolve(null); }
    });
}

// Bandingkan versi yang sedang dipakai dengan versi terakhir yang tersimpan di HP.
// Pemakaian pertama kali (belum ada versi tersimpan) tidak diberi notifikasi.
async function announceIfUpdated(worker) {
    const version = await askWorkerVersion(worker);
    if (!version) return;
    let last = null;
    try { last = localStorage.getItem(VERSION_KEY); } catch (e) {}
    try { localStorage.setItem(VERSION_KEY, version); } catch (e) {}
    if (last && last !== version) showUpdatedBanner(version);
}

export function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (!(location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) return;

    // Versi yang sedang berjalan SAAT aplikasi dibuka (dicatat sebelum pengecekan versi baru di bawah)
    const runningWorker = navigator.serviceWorker.controller;

    navigator.serviceWorker.register('sw.js').then(async (reg) => {
        if (runningWorker) {
            announceIfUpdated(runningWorker);
        } else {
            // Pemasangan pertama kali: cukup catat versi, tanpa notifikasi
            const ready = await navigator.serviceWorker.ready;
            announceIfUpdated(ready.active);
        }
        // Cek versi baru SEKALI saat aplikasi dibuka. Bila ada, diunduh diam-diam dan diumumkan di pembukaan berikutnya.
        reg.update().catch(() => {});
    }).catch(err => {
        console.warn('Service worker gagal didaftarkan:', err);
    });
}
