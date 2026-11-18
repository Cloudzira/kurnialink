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
 * Notifikasi pembaruan (dibuat tahan banting untuk HP).
 * Cara kerja:
 *  1) Aplikasi mengecek versi baru (file sw.js) saat dibuka, SETIAP kali aplikasi kembali dari latar belakang
 *     (penting di HP: aplikasi sering hanya "tidur", bukan dimuat ulang), saat internet kembali, dan tiap 10 menit.
 *  2) Begitu versi baru terunduh, langsung muncul kartu "Pembaruan tersedia" dengan tombol [Perbarui].
 *     Kartu ini TIDAK hilang sendiri sampai ditutup/diketuk, supaya tidak terlewat.
 *  3) Ketuk [Perbarui] -> halaman dimuat ulang memakai versi terbaru.
 *  4) Setelah dimuat ulang muncul kartu kecil "Aplikasi sudah diperbarui" (hilang otomatis).
 * Penting: setiap kali memperbarui aplikasi, naikkan angka VERSION di sw.js (mis. v42 menjadi v43).
 */
const VERSION_KEY = 'kp_app_version';   // versi terakhir yang sudah dipakai/dilihat pengunjung
const CHECK_GAP_MS = 30 * 1000;         // jarak minimum antar pengecekan (hemat baterai/kuota)
const CHECK_EVERY_MS = 10 * 60 * 1000;  // pengecekan berkala saat aplikasi terbuka

let loadedVersion = null;     // versi yang dipakai halaman ini sejak dibuka
let hadController = false;    // true bila halaman ini sudah dikendalikan service worker saat dibuka
let promptedVersion = null;   // versi yang sudah ditawarkan (agar tidak muncul dobel)
let lastCheckAt = 0;

function whenSplashDone(fn) {
    if (window.__splashDone || !document.getElementById('splashScreen')) { fn(); return; }
    window.addEventListener('kp-splash-done', () => setTimeout(fn, 350), { once: true });
}

function removeBanner() {
    const old = document.getElementById('updateBanner');
    if (old) old.remove();
}

function buildBanner(html) {
    removeBanner();
    const banner = document.createElement('div');
    banner.id = 'updateBanner';
    banner.className = 'kp-update';
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-live', 'polite');
    banner.innerHTML = html;
    document.body.appendChild(banner);
    return banner;
}

function closeBanner(banner) {
    banner.classList.add('is-leaving');
    setTimeout(() => banner.remove(), 300);
}

// Kartu kecil setelah aplikasi berhasil diperbarui (hilang otomatis)
function showUpdatedBanner(version) {
    whenSplashDone(() => {
        if (document.getElementById('updateBanner')) return;
        const banner = buildBanner(`
            <span class="kp-update-ico" aria-hidden="true"><i class="fa-solid fa-circle-check"></i></span>
            <div class="kp-update-text">
                <b>Aplikasi sudah diperbarui</b>
                <span>Kamu sekarang memakai versi terbaru (${version}).</span>
            </div>
            <button type="button" class="kp-update-x" id="updateLaterBtn" aria-label="Tutup">
                <i class="fa-solid fa-xmark" aria-hidden="true"></i>
            </button>
        `);
        banner.querySelector('#updateLaterBtn').addEventListener('click', () => closeBanner(banner));
        setTimeout(() => closeBanner(banner), 8000);
    });
}

// Kartu "Pembaruan tersedia" + tombol Perbarui (tetap tampil sampai ditutup/diketuk)
function showUpdateAvailable(version) {
    const key = version || 'baru';
    if (promptedVersion === key) return;
    promptedVersion = key;
    whenSplashDone(() => {
        const banner = buildBanner(`
            <span class="kp-update-ico" aria-hidden="true"><i class="fa-solid fa-circle-arrow-up"></i></span>
            <div class="kp-update-text">
                <b>Pembaruan tersedia</b>
                <span>${version ? 'Versi ' + version + ' siap dipakai. ' : ''}Ketuk Perbarui untuk memuat ulang.</span>
            </div>
            <button type="button" class="kp-update-btn" id="updateNowBtn">Perbarui</button>
            <button type="button" class="kp-update-x" id="updateLaterBtn" aria-label="Nanti saja">
                <i class="fa-solid fa-xmark" aria-hidden="true"></i>
            </button>
        `);
        banner.querySelector('#updateNowBtn').addEventListener('click', applyUpdate);
        // "Nanti saja": tidak muncul lagi selama aplikasi tetap di layar; akan ditawarkan lagi saat aplikasi kembali dibuka
        banner.querySelector('#updateLaterBtn').addEventListener('click', () => closeBanner(banner));
    });
}

// Muat ulang halaman agar memakai versi terbaru
function applyUpdate() {
    const btn = document.getElementById('updateNowBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Memuat...'; }
    navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg && reg.waiting) reg.waiting.postMessage('SKIP_WAITING');
    }).catch(() => {}).finally(() => {
        setTimeout(() => window.location.reload(), 120);
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
function announceIfUpdated(version) {
    if (!version) return;
    let last = null;
    try { last = localStorage.getItem(VERSION_KEY); } catch (e) {}
    try { localStorage.setItem(VERSION_KEY, version); } catch (e) {}
    if (last && last !== version) showUpdatedBanner(version);
}

// Versi baru ditemukan (sudah terunduh): tawarkan ke pengunjung
async function onNewWorker(worker) {
    const version = await askWorkerVersion(worker);
    if (version && loadedVersion && version === loadedVersion) return;   // sama dengan yang sedang dipakai
    showUpdateAvailable(version);
}

function watchForUpdates(reg) {
    reg.addEventListener('updatefound', () => {
        const incoming = reg.installing;
        if (!incoming) return;
        incoming.addEventListener('statechange', () => {
            if ((incoming.state === 'installed' || incoming.state === 'activated') && navigator.serviceWorker.controller) {
                onNewWorker(incoming);
            }
        });
    });
    // Service worker baru mengambil alih saat halaman ini sudah terbuka -> halaman masih memakai kode lama
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (hadController) onNewWorker(navigator.serviceWorker.controller);
    });

    const check = (force) => {
        const now = Date.now();
        if (!force && now - lastCheckAt < CHECK_GAP_MS) return;
        lastCheckAt = now;
        reg.update().catch(() => {});
        // Bisa jadi versi baru sudah terpasang saat aplikasi di latar belakang: bandingkan dengan versi halaman ini
        askWorkerVersion(navigator.serviceWorker.controller).then((v) => {
            if (v && loadedVersion && v !== loadedVersion) showUpdateAvailable(v);
        });
    };
    // HP: aplikasi kembali ke layar depan (bukan dimuat ulang)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) return;
        if (!document.getElementById('updateBanner')) promptedVersion = null;   // sempat ditutup: tawarkan lagi
        check(false);
    });
    window.addEventListener('pageshow', (e) => {
        if (!e.persisted) return;
        if (!document.getElementById('updateBanner')) promptedVersion = null;
        check(true);
    });
    window.addEventListener('online', () => check(true));
    setInterval(() => { if (!document.hidden) check(true); }, CHECK_EVERY_MS);
    check(true);
}

export function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (!(location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) return;

    // Versi yang menjalankan halaman ini SAAT dibuka (dicatat sebelum ada pengecekan versi baru)
    const runningWorker = navigator.serviceWorker.controller;
    hadController = !!runningWorker;

    navigator.serviceWorker.register('sw.js').then(async (reg) => {
        const base = runningWorker || (await navigator.serviceWorker.ready).active;
        loadedVersion = await askWorkerVersion(base);
        announceIfUpdated(loadedVersion);
        watchForUpdates(reg);
    }).catch(err => {
        console.warn('Service worker gagal didaftarkan:', err);
    });
}
