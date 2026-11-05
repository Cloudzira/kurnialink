/**
 * splash.js
 * Splash screen: tampil minimal 1,1 detik, hilang saat data siap (maksimal 3 detik), lalu memulai murottal.
 */

import { initMurottal } from './murottal.js';

// ---- Splash pintar: tampil minimal 1,1 detik, lalu hilang begitu data siap (maks. 3 detik) ----
const SPLASH_MIN_MS = 1100;
const SPLASH_MAX_MS = 3000;
let appReady = false;
let splashMinPassed = false;
let splashDismissed = false;

function dismissSplash() {
    if (splashDismissed) return;
    splashDismissed = true;
    const splash = document.getElementById('splashScreen');
    if (splash) {
        splash.classList.add('fade-out');
        setTimeout(() => splash.remove(), 600);
    }
    // Murottal dimulai setelah halaman tampil, agar tidak berebut unduhan dengan data utama
    setTimeout(initMurottal, 300);
}

export function markAppReady() {
    appReady = true;
    if (splashMinPassed) dismissSplash();
}

// Mengatur waktu tampil splash: minimal 1,1 detik, maksimal 3 detik.
// (Dipisah dari startApp agar variabel splash hanya diubah di file splash.js)
export function startSplashTimers() {
    setTimeout(() => {
        splashMinPassed = true;
        if (appReady) dismissSplash();
    }, SPLASH_MIN_MS);
    setTimeout(dismissSplash, SPLASH_MAX_MS);
}
