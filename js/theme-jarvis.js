/**
 * theme-jarvis.js
 * Semua yang khusus tema "Jarvis Futuristik":
 *  - panel HUD (#jvHud): jam cincin, tanggal, penanda hari, sapaan sesuai jam
 *  - chip status yang terhubung ke isi app: jaringan, jumlah link, Cloudz AI, murottal (aktif / standby)
 *  - kolom pencarian berubah jadi "baris perintah"
 * Daftar link & folder memakai susunan tema Neon (js/links-render.js), hanya gayanya saja yang beda (css/theme-jarvis.css).
 * Jam hanya berjalan saat tema Jarvis aktif dan tab terlihat, jadi tidak membebani tema lain.
 */

import { state } from './state.js';

const DAYS_SHORT = ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'];
const DAYS_FULL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const RADIUS = 44;
const CIRC = 2 * Math.PI * RADIUS;
const FINE_POINTER = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

let built = false;
let timer = null;
let lastDayKey = '';
let lastGreet = '';
const els = {};

const pad = (n) => String(n).padStart(2, '0');
const isJarvis = () => document.documentElement.getAttribute('data-theme') === 'jarvis';

function setText(el, text) {
    if (el && el.textContent !== text) el.textContent = text;
}

function greetingFor(hour) {
    if (hour >= 4 && hour < 11) return 'SELAMAT PAGI';
    if (hour >= 11 && hour < 15) return 'SELAMAT SIANG';
    if (hour >= 15 && hour < 18) return 'SELAMAT SORE';
    return 'SELAMAT MALAM';
}

function ticksMarkup() {
    let out = '';
    for (let i = 0; i < 60; i++) {
        const major = i % 5 === 0;
        const r1 = major ? 38.5 : 40;
        const r2 = 42;
        const a = (i * 6 - 90) * Math.PI / 180;
        const x1 = (50 + r1 * Math.cos(a)).toFixed(2);
        const y1 = (50 + r1 * Math.sin(a)).toFixed(2);
        const x2 = (50 + r2 * Math.cos(a)).toFixed(2);
        const y2 = (50 + r2 * Math.sin(a)).toFixed(2);
        out += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${major ? ' class="is-major"' : ''}/>`;
    }
    return out;
}

function build() {
    const host = document.getElementById('jvHud');
    if (!host || built) return;
    built = true;
    host.classList.add('jv-hud');
    host.innerHTML = `
        <div class="jv-ring" aria-hidden="true">
            <svg viewBox="0 0 100 100" focusable="false">
                <circle class="jv-ring-track" cx="50" cy="50" r="${RADIUS}"/>
                <circle class="jv-ring-inner" cx="50" cy="50" r="34"/>
                <g class="jv-ring-ticks">${ticksMarkup()}</g>
                <circle class="jv-ring-arc" id="jvArc" cx="50" cy="50" r="${RADIUS}" transform="rotate(-90 50 50)"
                        stroke-dasharray="${CIRC.toFixed(2)}" stroke-dashoffset="${CIRC.toFixed(2)}"/>
                <text class="jv-time" id="jvTime" x="50" y="53">--:--</text>
                <text class="jv-sec" id="jvSec" x="50" y="65">--</text>
            </svg>
        </div>
        <div class="jv-hud-info">
            <div class="jv-kicker">J.A.R.V.I.S &middot; KURNIAPEDIA</div>
            <div class="jv-greet" id="jvGreet">SELAMAT DATANG</div>
            <div class="jv-date" id="jvDate">&nbsp;</div>
            <div class="jv-days" id="jvDays">${DAYS_SHORT.map((d, i) => `<span data-d="${i}">${d}</span>`).join('')}</div>
        </div>
        <div class="jv-status" aria-label="Status sistem">
            <span class="jv-chip" id="jvNet"><i class="fa-solid fa-wifi" aria-hidden="true"></i> JARINGAN <b id="jvNetVal">--</b></span>
            <span class="jv-chip"><i class="fa-solid fa-link" aria-hidden="true"></i> MODUL <b id="jvModules">0</b></span>
            <span class="jv-chip is-ok"><i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> CLOUDZ AI <b>SIAGA</b></span>
            <span class="jv-chip" id="jvAudio"><i class="fa-solid fa-headphones" aria-hidden="true"></i> MUROTTAL <b id="jvAudioVal">STANDBY</b></span>
        </div>`;

    els.arc = host.querySelector('#jvArc');
    els.time = host.querySelector('#jvTime');
    els.sec = host.querySelector('#jvSec');
    els.greet = host.querySelector('#jvGreet');
    els.date = host.querySelector('#jvDate');
    els.days = host.querySelectorAll('#jvDays span');
    els.net = host.querySelector('#jvNet');
    els.netVal = host.querySelector('#jvNetVal');
    els.modules = host.querySelector('#jvModules');
    els.audio = host.querySelector('#jvAudio');
    els.audioVal = host.querySelector('#jvAudioVal');
}

function updateStatus() {
    // jaringan
    const online = navigator.onLine !== false;
    setText(els.netVal, online ? 'ONLINE' : 'OFFLINE');
    els.net.classList.toggle('is-ok', online);
    els.net.classList.toggle('is-warn', !online);

    // jumlah link yang terlihat (admin melihat semuanya, pengunjung hanya yang tidak disembunyikan)
    const list = Array.isArray(state.linksList) ? state.linksList : [];
    const count = list.filter(i => !i.isFolder && (state.currentUser || i.visible !== false)).length;
    setText(els.modules, String(count));

    // murottal: ikut status pemutar
    const playing = !!document.querySelector('.murottal-wrap.is-playing');
    setText(els.audioVal, playing ? 'AKTIF' : 'STANDBY');
    els.audio.classList.toggle('is-live', playing);
}

function tick() {
    if (!built || !isJarvis() || document.hidden) return;
    const d = new Date();
    const sec = d.getSeconds();

    setText(els.time, pad(d.getHours()) + ':' + pad(d.getMinutes()));
    setText(els.sec, pad(sec));

    // busur detik: tiap detik maju 1/60. Saat kembali ke 0, lompat tanpa animasi supaya tidak menyapu mundur.
    if (sec === 0) {
        els.arc.style.transition = 'none';
        els.arc.style.strokeDashoffset = String(CIRC);
        void els.arc.getBoundingClientRect();
        els.arc.style.transition = '';
    }
    els.arc.style.strokeDashoffset = String((CIRC * (1 - (sec + 1) / 60)).toFixed(2));

    const greet = greetingFor(d.getHours());
    if (greet !== lastGreet) { lastGreet = greet; setText(els.greet, greet); }

    const dayKey = d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
    if (dayKey !== lastDayKey) {
        lastDayKey = dayKey;
        setText(els.date, DAYS_FULL[d.getDay()] + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear());
        els.days.forEach((el) => el.classList.toggle('is-today', Number(el.getAttribute('data-d')) === d.getDay()));
    }

    updateStatus();
}

// Kolom pencarian jadi "baris perintah" di tema Jarvis; dikembalikan seperti semula di tema lain
function syncSearchPlaceholder(on) {
    const input = document.getElementById('searchInput');
    if (!input) return;
    if (on) {
        if (input.dataset.kpPh === undefined) input.dataset.kpPh = input.getAttribute('placeholder') || '';
        input.setAttribute('placeholder', 'Cari modul atau ketik perintah...' + (FINE_POINTER ? '  (Ctrl K)' : ''));
    } else if (input.dataset.kpPh !== undefined) {
        input.setAttribute('placeholder', input.dataset.kpPh);
        delete input.dataset.kpPh;
    }
}

function sync() {
    const on = isJarvis();
    syncSearchPlaceholder(on);
    if (on) {
        build();
        tick();
        if (!timer) timer = setInterval(tick, 1000);
    } else if (timer) {
        clearInterval(timer);
        timer = null;
    }
}

export function initJarvis() {
    sync();
    document.addEventListener('kp-themechange', sync);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
    window.addEventListener('online', tick);
    window.addEventListener('offline', tick);
}
