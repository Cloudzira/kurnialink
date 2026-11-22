/**
 * theme-orbit.js
 * Semua yang khusus tema "Orbit":
 *  - panel #obHud: reticle jam analog dengan inti oranye, jam digital, sapaan, tanggal, penanda hari
 * Daftar link & folder memakai susunan tema Neon (js/links-render.js), hanya gayanya yang beda (css/theme-orbit.css).
 * Jam hanya berjalan saat tema Orbit aktif dan tab terlihat, jadi tidak membebani tema lain.
 */


const DAYS_SHORT = ['Ahd', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const DAYS_FULL = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const ARC_R = 37;
const ARC_C = 2 * Math.PI * ARC_R;

let built = false;
let timer = null;
let lastDayKey = '';
let lastGreet = '';
const els = {};

const pad = (n) => String(n).padStart(2, '0');
const isOrbit = () => document.documentElement.getAttribute('data-theme') === 'orbit';

function setText(el, text) {
    if (el && el.textContent !== text) el.textContent = text;
}

function greetingFor(hour) {
    if (hour >= 4 && hour < 11) return 'Selamat pagi';
    if (hour >= 11 && hour < 15) return 'Selamat siang';
    if (hour >= 15 && hour < 18) return 'Selamat sore';
    return 'Selamat malam';
}

function ticksMarkup() {
    let out = '';
    for (let i = 0; i < 60; i++) {
        const major = i % 5 === 0;
        const r1 = major ? 40.2 : 41.4;
        const r2 = 43;
        const a = (i * 6 - 90) * Math.PI / 180;
        out += `<line x1="${(50 + r1 * Math.cos(a)).toFixed(2)}" y1="${(50 + r1 * Math.sin(a)).toFixed(2)}" x2="${(50 + r2 * Math.cos(a)).toFixed(2)}" y2="${(50 + r2 * Math.sin(a)).toFixed(2)}"${major ? ' class="is-major"' : ''}/>`;
    }
    return out;
}

function build() {
    const host = document.getElementById('obHud');
    if (!host || built) return;
    built = true;
    host.classList.add('ob-hud');
    host.innerHTML = `
        <div class="ob-reticle" aria-hidden="true">
            <svg viewBox="0 0 100 100" focusable="false">
                <defs>
                    <radialGradient id="obCoreGrad" cx="38%" cy="34%" r="75%">
                        <stop offset="0" stop-color="#ffe3b0"/>
                        <stop offset="0.35" stop-color="#ff8a2a"/>
                        <stop offset="0.8" stop-color="#b03a08"/>
                        <stop offset="1" stop-color="#4a1500"/>
                    </radialGradient>
                    <clipPath id="obCoreClip"><circle cx="50" cy="50" r="22"/></clipPath>
                </defs>
                <circle class="ob-r-gap" cx="50" cy="50" r="47"/>
                <circle class="ob-r-faint" cx="50" cy="50" r="44.5"/>
                <g class="ob-r-ticks">${ticksMarkup()}</g>
                <circle class="ob-r-faint" cx="50" cy="50" r="33"/>
                <circle class="ob-r-arc" id="obArc" cx="50" cy="50" r="${ARC_R}" transform="rotate(-90 50 50)"
                        stroke-dasharray="${ARC_C.toFixed(2)}" stroke-dashoffset="${ARC_C.toFixed(2)}"/>
                <g class="ob-r-core">
                    <circle cx="50" cy="50" r="22" fill="url(#obCoreGrad)"/>
                    <path d="M28 50 A22 22 0 0 1 50 28 L72 50 A22 22 0 0 1 50 72 Z" fill="#000" opacity="0.28" clip-path="url(#obCoreClip)"/>
                </g>
                <line class="ob-r-hand h" id="obHour" x1="50" y1="50" x2="50" y2="34"/>
                <line class="ob-r-hand m" id="obMin" x1="50" y1="50" x2="50" y2="25"/>
                <circle class="ob-r-pin" cx="50" cy="50" r="1.8"/>
            </svg>
        </div>
        <div class="ob-hud-info">
            <div class="ob-time" id="obTime">--:--<small id="obSec">--</small></div>
            <div class="ob-greet" id="obGreet">Selamat datang</div>
            <div class="ob-date" id="obDate">&nbsp;</div>
            <div class="ob-days" id="obDays">${DAYS_SHORT.map((d, i) => `<span data-d="${i}">${d}</span>`).join('')}</div>
        </div>`;

    els.arc = host.querySelector('#obArc');
    els.hour = host.querySelector('#obHour');
    els.min = host.querySelector('#obMin');
    els.time = host.querySelector('#obTime');
    els.sec = host.querySelector('#obSec');
    els.greet = host.querySelector('#obGreet');
    els.date = host.querySelector('#obDate');
    els.days = host.querySelectorAll('#obDays span');
}

function tick() {
    if (!built || !isOrbit() || document.hidden) return;
    const d = new Date();
    const h = d.getHours();
    const m = d.getMinutes();
    const s = d.getSeconds();

    // jam digital: teks "HH:MM" + detik kecil. Hanya simpul teks pertama yang diganti, <small> tetap.
    const hm = pad(h) + ':' + pad(m);
    if (els.time.firstChild && els.time.firstChild.nodeType === 3) {
        if (els.time.firstChild.nodeValue !== hm) els.time.firstChild.nodeValue = hm;
    }
    setText(els.sec, pad(s));

    // jarum jam & menit
    els.hour.setAttribute('transform', 'rotate(' + (((h % 12) + m / 60) * 30).toFixed(1) + ' 50 50)');
    els.min.setAttribute('transform', 'rotate(' + ((m + s / 60) * 6).toFixed(1) + ' 50 50)');

    // busur detik oranye: maju 1/60 tiap detik; saat kembali ke 0 lompat tanpa animasi
    if (s === 0) {
        els.arc.style.transition = 'none';
        els.arc.style.strokeDashoffset = String(ARC_C);
        void els.arc.getBoundingClientRect();
        els.arc.style.transition = '';
    }
    els.arc.style.strokeDashoffset = String((ARC_C * (1 - (s + 1) / 60)).toFixed(2));

    const greet = greetingFor(h);
    if (greet !== lastGreet) { lastGreet = greet; setText(els.greet, greet); }

    const dayKey = d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
    if (dayKey !== lastDayKey) {
        lastDayKey = dayKey;
        setText(els.date, DAYS_FULL[d.getDay()] + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear());
        els.days.forEach((el) => el.classList.toggle('is-today', Number(el.getAttribute('data-d')) === d.getDay()));
    }

}

function sync() {
    if (isOrbit()) {
        build();
        tick();
        if (!timer) timer = setInterval(tick, 1000);
    } else if (timer) {
        clearInterval(timer);
        timer = null;
    }
}

export function initOrbit() {
    sync();
    document.addEventListener('kp-themechange', sync);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
}
