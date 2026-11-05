/**
 * murottal.js
 * Pemutar murottal: tombol play/pause, pilih surat, pencarian, media session, dan pemutaran otomatis setelah interaksi pertama.
 */

import { bEl, escapeHtml, showToast } from './utils.js';
import { MUROTTAL_QARI, MUROTTAL_SOURCES, SURAH_ARABIC, SURAH_NAMES } from './murottal-data.js';

let murottalAudio = null;
let murottalSurah = 1;
let murottalSource = 0;
let murottalWantPlay = true;       // true = ingin memutar (autoplay awal / pilihan tamu)
let murottalUserTouched = false;   // tamu sudah memakai kontrol murottal
let murottalGestureHandler = null;
let murottalPanelOpen = false;
const MUROTTAL_GESTURE_EVENTS = ['pointerdown', 'touchend', 'keydown', 'click'];

function murottalNorm(str) {
    return String(str).toLowerCase().replace(/['’‘`\-\s]/g, '');
}

// Pencarian: angka -> cocok awalan nomor; teks -> cocok sebagian nama (Latin/Arab)
function murottalMatches(query, n) {
    const q = murottalNorm(query);
    if (!q) return true;
    if (/^\d+$/.test(q)) return String(n).startsWith(q);
    return murottalNorm(SURAH_NAMES[n - 1]).includes(q) || SURAH_ARABIC[n - 1].replace(/\s/g, '').includes(q);
}

function murottalSetUi(playing) {
    const wrap = bEl('murottalWrap');
    if (!wrap) return;
    wrap.classList.toggle('is-playing', playing);
    bEl('murottalToggleIcon').className = playing ? 'fa-solid fa-pause' : 'fa-solid fa-play';
    bEl('murottalToggle').setAttribute('aria-label', playing ? 'Jeda murottal' : 'Putar murottal');
    if (playing) bEl('murottalToggle').classList.remove('pulse');
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
}

function murottalUpdateMediaSession() {
    if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
    try {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: 'Surah ' + SURAH_NAMES[murottalSurah - 1],
            artist: MUROTTAL_QARI,
            album: 'Kurniapedia',
            artwork: [
                { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
                { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
            ]
        });
    } catch (e) {}
}

function murottalMarkActive() {
    const list = bEl('murottalList');
    if (!list) return;
    const prev = list.querySelector('.murottal-item.active');
    if (prev) { prev.classList.remove('active'); prev.setAttribute('aria-selected', 'false'); }
    const cur = list.querySelector(`.murottal-item[data-n="${murottalSurah}"]`);
    if (cur) { cur.classList.add('active'); cur.setAttribute('aria-selected', 'true'); }
}

function murottalLoad(n, sourceIdx = 0) {
    murottalSurah = n;
    murottalSource = sourceIdx;
    murottalAudio.src = MUROTTAL_SOURCES[sourceIdx](n);
    murottalAudio.load();
    bEl('murottalName').innerText = `${n}. ${SURAH_NAMES[n - 1]}`;
    bEl('murottalProgress').style.transform = 'scaleX(0)';
    murottalMarkActive();
    murottalUpdateMediaSession();
}

function murottalDisarmGesture() {
    if (!murottalGestureHandler) return;
    MUROTTAL_GESTURE_EVENTS.forEach(t => document.removeEventListener(t, murottalGestureHandler, true));
    murottalGestureHandler = null;
}

// Browser memblokir suara otomatis sebelum ada interaksi: mulai di sentuhan/klik pertama tamu
function murottalArmGesture() {
    bEl('murottalToggle').classList.add('pulse');
    if (murottalGestureHandler) return;
    murottalGestureHandler = (e) => {
        if (e.target && e.target.closest && e.target.closest('#murottalWrap')) return; // kontrol murottal menangani sendiri
        if (e.type === 'keydown' && ['Shift', 'Control', 'Alt', 'Meta', 'Tab', 'CapsLock'].includes(e.key)) return;
        murottalDisarmGesture();
        if (murottalWantPlay) murottalPlay();
    };
    MUROTTAL_GESTURE_EVENTS.forEach(t => document.addEventListener(t, murottalGestureHandler, true));
}

async function murottalPlay() {
    try {
        await murottalAudio.play();
        murottalDisarmGesture();
        return true;
    } catch (e) {
        if (e && e.name === 'NotAllowedError') {
            if (murottalWantPlay) murottalArmGesture();
        } else if (!e || e.name !== 'AbortError') {
            console.warn('Murottal play error:', e);
        }
        return false;
    }
}

function murottalJump(delta) {
    const n = murottalSurah + delta;
    if (n < 1 || n > 114) return;
    murottalWantPlay = true;
    murottalLoad(n, 0);
    murottalPlay();
}

// Tamu memilih surat sendiri -> putar surat itu (dan lanjut berurutan sesudahnya)
function murottalChoose(n) {
    murottalUserTouched = true;
    murottalWantPlay = true;
    murottalDisarmGesture();
    murottalLoad(n, 0);
    murottalPlay();
    murottalClosePanel();
}

function murottalFilter(query) {
    const list = bEl('murottalList');
    let visible = 0;
    list.querySelectorAll('.murottal-item').forEach(item => {
        const show = murottalMatches(query, Number(item.dataset.n));
        item.style.display = show ? '' : 'none';
        if (show) visible++;
    });
    bEl('murottalEmpty').style.display = visible ? 'none' : 'block';
}

function murottalOpenPanel() {
    const panel = bEl('murottalPanel');
    const list = bEl('murottalList');
    const search = bEl('murottalSearch');
    search.value = '';
    murottalFilter('');
    panel.classList.add('open');
    murottalPanelOpen = true;
    bEl('murottalTrigger').setAttribute('aria-expanded', 'true');
    const active = list.querySelector('.murottal-item.active');
    if (active) list.scrollTop = Math.max(0, active.offsetTop - list.clientHeight / 2 + active.clientHeight / 2);
    // fokus otomatis hanya di perangkat dengan mouse (agar keyboard HP tidak langsung muncul)
    if (window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches) search.focus();
}

function murottalClosePanel() {
    if (!murottalPanelOpen) return;
    bEl('murottalPanel').classList.remove('open');
    murottalPanelOpen = false;
    bEl('murottalTrigger').setAttribute('aria-expanded', 'false');
}

export function initMurottal() {
    const toggle = bEl('murottalToggle');
    const trigger = bEl('murottalTrigger');
    const list = bEl('murottalList');
    const search = bEl('murottalSearch');
    const panel = bEl('murottalPanel');
    if (!toggle || !trigger || !list || !search || !panel) return;

    list.innerHTML = SURAH_NAMES.map((name, i) => `
        <button type="button" class="murottal-item" role="option" aria-selected="false" data-n="${i + 1}">
            <span class="murottal-num">${i + 1}</span>
            <span class="murottal-iname">${escapeHtml(name)}</span>
            <span class="murottal-mini-eq" aria-hidden="true"><span></span><span></span><span></span></span>
            <span class="murottal-ar" lang="ar">${SURAH_ARABIC[i]}</span>
        </button>`).join('') + '<div class="murottal-empty" id="murottalEmpty" style="display:none">Surat tidak ditemukan</div>';

    murottalAudio = new Audio();
    murottalAudio.preload = 'metadata';

    murottalAudio.addEventListener('play', () => murottalSetUi(true));
    murottalAudio.addEventListener('pause', () => murottalSetUi(false));
    murottalAudio.addEventListener('timeupdate', () => {
        const d = murottalAudio.duration;
        if (d && isFinite(d)) bEl('murottalProgress').style.transform = `scaleX(${Math.min(1, murottalAudio.currentTime / d)})`;
    });
    murottalAudio.addEventListener('ended', () => {
        // lanjut otomatis ke surat berikutnya (dst)
        if (murottalSurah < 114) {
            murottalLoad(murottalSurah + 1, 0);
            murottalPlay();
        } else {
            murottalWantPlay = false;
            murottalSetUi(false);
        }
    });
    murottalAudio.addEventListener('error', () => {
        if (murottalSource < MUROTTAL_SOURCES.length - 1) {
            const keepPlaying = murottalWantPlay;
            murottalLoad(murottalSurah, murottalSource + 1);
            if (keepPlaying) murottalPlay();
        } else {
            murottalSetUi(false);
            if (murottalUserTouched) showToast('Murottal gagal dimuat. Periksa koneksi internet.', 'error');
        }
    });

    toggle.addEventListener('click', () => {
        murottalUserTouched = true;
        if (murottalAudio.paused) {
            murottalWantPlay = true;
            murottalDisarmGesture();
            if (murottalAudio.error || !murottalAudio.src) murottalLoad(murottalSurah, 0);
            murottalPlay();
        } else {
            murottalWantPlay = false;
            murottalDisarmGesture();
            murottalAudio.pause();
        }
    });

    trigger.addEventListener('click', () => {
        if (murottalPanelOpen) murottalClosePanel(); else murottalOpenPanel();
    });

    list.addEventListener('click', (e) => {
        const item = e.target && e.target.closest ? e.target.closest('.murottal-item') : null;
        if (item) murottalChoose(Number(item.dataset.n));
    });

    search.addEventListener('input', () => murottalFilter(search.value));
    search.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const first = [...list.querySelectorAll('.murottal-item')].find(it => it.style.display !== 'none');
        if (first) murottalChoose(Number(first.dataset.n));
    });

    panel.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            murottalClosePanel();
            trigger.focus();
            return;
        }
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        const items = [...list.querySelectorAll('.murottal-item')].filter(it => it.style.display !== 'none');
        if (!items.length) return;
        e.preventDefault();
        const idx = items.indexOf(document.activeElement);
        const next = e.key === 'ArrowDown' ? idx + 1 : idx - 1;
        if (next < 0) { search.focus(); return; }
        items[Math.min(next, items.length - 1)].focus();
    });

    // Tutup panel saat klik di luar
    document.addEventListener('pointerdown', (e) => {
        if (murottalPanelOpen && !(e.target && e.target.closest && e.target.closest('#murottalWrap'))) murottalClosePanel();
    }, true);

    if ('mediaSession' in navigator) {
        const handlers = {
            play: () => { murottalWantPlay = true; murottalPlay(); },
            pause: () => { murottalWantPlay = false; murottalAudio.pause(); },
            previoustrack: () => murottalJump(-1),
            nexttrack: () => murottalJump(1)
        };
        Object.keys(handlers).forEach(a => { try { navigator.mediaSession.setActionHandler(a, handlers[a]); } catch (e) {} });
    }

    // Otomatis mulai dari Al-Fatihah
    murottalLoad(1, 0);
    murottalPlay();
}
