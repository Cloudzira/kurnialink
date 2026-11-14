/**
 * main.js
 * Titik masuk aplikasi (entry point). File ini memuat semua modul lalu menjalankan startApp().
 */

import { initFirebase } from './firebase.js';
import { initBanner } from './banner.js';
import { refreshInstallButton, registerServiceWorker } from './pwa.js';
import { startSplashTimers } from './splash.js';
import { initAiChat } from './ai-chat.js';
import './config.js';
import './utils.js';
import './link-light.js';
import './auth.js';
import './profile.js';
import './profile-edit.js';
import './admin-form.js';
import './admin-ui.js';
import './links-render.js';
import './links-actions.js';
import './link-lock.js';
import './search.js';
import './share.js';
import './murottal-data.js';
import './murottal.js';
import './banner-admin.js';

// Dijalankan langsung (modul sudah tertunda sampai HTML selesai dibaca),
// tanpa menunggu semua gambar/font selesai seperti window.onload.
function startApp() {
    initFirebase();
    refreshInstallButton();
    initBanner();
    initAiChat();

    startSplashTimers();

    // Service worker didaftarkan setelah halaman selesai dimuat agar tidak mengganggu pemuatan awal
    if (document.readyState === 'complete') registerServiceWorker();
    else window.addEventListener('load', registerServiceWorker);
}

startApp();
