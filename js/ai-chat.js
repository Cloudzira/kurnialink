/**
 * ai-chat.js
 * Cloudz AI: tombol melayang + popup chat. Pertanyaan dikirim ke /api/chat (server Cloudflare),
 * BUKAN langsung ke Google, jadi API key tidak pernah ada di sisi browser.
 */

import { escapeHtml } from './utils.js';
import { state } from './state.js';

const API_URL = '/api/chat';
const STORAGE_KEY = 'czai_history_v1';
const MAX_HISTORY = 16;
const MAX_INPUT = 1000;
const REQUEST_TIMEOUT_MS = 35000;

// Sapaan menyesuaikan jam di perangkat pengguna
function getWelcome() {
    const h = new Date().getHours();
    const greet = h >= 4 && h < 11 ? 'Selamat pagi' : h >= 11 && h < 15 ? 'Selamat siang' : h >= 15 && h < 18 ? 'Selamat sore' : 'Selamat malam';
    return greet + '! Saya **Cloudz AI** ✨\nSilakan tanya apa saja, saya siap membantu.';
}
const SUGGESTIONS = [
    'Motivasi islami hari ini',
    'Tips semangat belajar dan bertumbuh'
];

let history = [];
let busy = false;
let isOpen = false;
let els = {};

/* ---------- Riwayat (disimpan sementara di tab ini saja) ---------- */
function loadHistory() {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        if (Array.isArray(arr)) {
            history = arr
                .filter((m) => m && (m.role === 'user' || m.role === 'model') && typeof m.text === 'string')
                .slice(-MAX_HISTORY);
        }
    } catch (e) { history = []; }
}
function saveHistory() {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-MAX_HISTORY))); } catch (e) { /* abaikan */ }
}

/* ---------- Alamat dari AI menjadi tombol yang bisa diklik ---------- */
// Hanya alamat yang benar-benar ada di daftar link halaman ini yang dijadikan tombol.
// Alamat lain (misalnya hasil karangan AI) tetap tampil sebagai teks biasa, demi keamanan.
function normalizeUrl(u) {
    try {
        const x = new URL(u);
        if (x.protocol !== 'https:' && x.protocol !== 'http:') return '';
        return x.host.toLowerCase() + x.pathname.replace(/\/+$/, '') + x.search;
    } catch (e) { return ''; }
}

function findKnownLink(url) {
    const key = normalizeUrl(url);
    if (!key) return null;
    const list = Array.isArray(state.linksList) ? state.linksList : [];
    return list.find((l) => l && !l.isFolder && l.url && normalizeUrl(l.url) === key) || null;
}

function linkButtonHtml(item, link) {
    const label = escapeHtml(link.title || 'aplikasi');
    return '<a class="cz-linkbtn" href="' + escapeHtml(link.url) + '" target="_blank" rel="noopener noreferrer"' +
        ' data-link-id="' + escapeHtml(link.id || '') + '">' +
        '<i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i><span>Buka ' + label + '</span></a>';
}

// Tombol untuk aplikasi terkunci: tidak membuka alamat, tetapi menampilkan jendela "Aplikasi Dikunci"
function lockedButtonHtml(link) {
    const label = escapeHtml(link.title || 'aplikasi');
    return '<a class="cz-linkbtn cz-locked" href="#" role="button"' +
        ' data-link-id="' + escapeHtml(link.id || '') + '">' +
        '<i class="fa-solid fa-lock" aria-hidden="true"></i><span>Buka ' + label + '</span></a>';
}

function findLinkById(id) {
    const list = Array.isArray(state.linksList) ? state.linksList : [];
    return list.find((l) => l && l.id === id && !l.isFolder) || null;
}

/* ---------- Mengubah teks AI menjadi HTML aman (bold, kode, daftar) ---------- */
function renderMarkdown(text) {
    const blocks = [];
    let s = String(text || '').replace(/```(?:[\w-]+)?\n?([\s\S]*?)```/g, (_, code) => {
        blocks.push(code.replace(/\n$/, ''));
        return '\u0000B' + (blocks.length - 1) + '\u0000';
    });

    // Ambil alamat (format [teks](alamat) atau alamat polos) sebelum teks di-escape
    const buttons = [];
    const takeLink = (url, rawText) => {
        const link = findKnownLink(url);
        if (!link) return rawText;   // bukan alamat dari daftar link: biarkan teks biasa
        buttons.push(linkButtonHtml(url, link));
        return '\u0000K' + (buttons.length - 1) + '\u0000';
    };
    // Kode tombol [[LINK:id]] dari AI (dipakai untuk aplikasi terkunci yang alamatnya disembunyikan)
    s = s.replace(/\[\[LINK:([A-Za-z0-9_-]{1,64})\]\]/g, (m, id) => {
        const link = findLinkById(id);
        if (!link) return '';   // kode tidak dikenal: buang
        // Kalau ternyata sudah tidak terkunci, jadikan tombol biasa menuju alamatnya
        buttons.push(link.locked === true ? lockedButtonHtml(link) : (link.url ? linkButtonHtml(link.url, link) : ''));
        return '\u0000K' + (buttons.length - 1) + '\u0000';
    });
    s = s.replace(/\[([^\]\n]{1,100})\]\((https?:\/\/[^\s)]+)\)/g, (m, label, url) => takeLink(url, label));
    s = s.replace(/https?:\/\/[^\s<>"'()\[\]]+/g, (m) => {
        const trail = (m.match(/[.,;:!?]+$/) || [''])[0];
        const url = trail ? m.slice(0, -trail.length) : m;
        return takeLink(url, m) + (findKnownLink(url) ? trail : '');
    });

    s = escapeHtml(s);
    s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*([^\s*][^*\n]*?[^\s*]|[^\s*])\*/g, '<em>$1</em>');

    let out = '';
    let list = null;
    const closeList = () => { if (list) { out += '</' + list + '>'; list = null; } };

    for (const line of s.split('\n')) {
        let m;
        if (/^\u0000B\d+\u0000$/.test(line.trim())) {
            closeList(); out += line.trim();
        } else if ((m = line.match(/^\s*[-*•]\s+(.*)$/))) {
            if (list !== 'ul') { closeList(); out += '<ul>'; list = 'ul'; }
            out += '<li>' + m[1] + '</li>';
        } else if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) {
            if (list !== 'ol') { closeList(); out += '<ol>'; list = 'ol'; }
            out += '<li>' + m[1] + '</li>';
        } else if ((m = line.match(/^#{1,4}\s+(.*)$/))) {
            closeList(); out += '<p><strong>' + m[1] + '</strong></p>';
        } else if (line.trim() === '') {
            closeList();
        } else {
            closeList(); out += '<p>' + line + '</p>';
        }
    }
    closeList();

    out = out.replace(/\u0000K(\d+)\u0000/g, (_, i) => buttons[Number(i)] || '');
    return out.replace(/\u0000B(\d+)\u0000/g, (_, i) => '<pre><code>' + escapeHtml(blocks[Number(i)]) + '</code></pre>');
}

/* ---------- Membangun tampilan ---------- */
function buildUI() {
    const wrap = document.createElement('div');
    wrap.id = 'czRoot';
    wrap.innerHTML = `
        <button id="czFab" class="cz-fab" type="button" aria-label="Buka Cloudz AI" aria-haspopup="dialog" aria-expanded="false" aria-controls="czPanel" title="Klik untuk buka, geser untuk memindahkan">
            <i class="fa-solid fa-wand-magic-sparkles cz-fab-icon" aria-hidden="true"></i>
            <span class="cz-fab-text">Cloudz AI</span>
        </button>

        <section id="czPanel" class="cz-panel" role="dialog" aria-label="Cloudz AI" aria-hidden="true" inert>
            <header class="cz-head">
                <div class="cz-avatar" aria-hidden="true"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
                <div class="cz-title">
                    <strong>Cloudz AI</strong>
                    <span><i class="cz-dot"></i> Asisten pintar Kurniapedia</span>
                </div>
                <button id="czClear" class="cz-iconbtn" type="button" title="Hapus percakapan" aria-label="Hapus percakapan">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
                <button id="czClose" class="cz-iconbtn" type="button" title="Tutup" aria-label="Tutup">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </header>

            <div id="czMessages" class="cz-messages" aria-live="polite"></div>

            <form id="czForm" class="cz-form" autocomplete="off">
                <textarea id="czInput" class="cz-input" rows="1" maxlength="${MAX_INPUT}" placeholder="Tulis pertanyaan..." aria-label="Pertanyaan untuk Cloudz AI"></textarea>
                <button id="czSend" class="cz-send" type="submit" aria-label="Kirim">
                    <i class="fa-solid fa-paper-plane"></i>
                </button>
            </form>
            <p class="cz-note">AI bisa keliru. Jangan kirim data pribadi atau rahasia.</p>
        </section>
    `;
    document.body.appendChild(wrap);

    els = {
        fab: document.getElementById('czFab'),
        panel: document.getElementById('czPanel'),
        messages: document.getElementById('czMessages'),
        form: document.getElementById('czForm'),
        input: document.getElementById('czInput'),
        send: document.getElementById('czSend'),
        clear: document.getElementById('czClear'),
        close: document.getElementById('czClose')
    };
}

function scrollToBottom() {
    requestAnimationFrame(() => { els.messages.scrollTop = els.messages.scrollHeight; });
}

function addMessage(role, text) {
    const row = document.createElement('div');
    row.className = 'cz-row ' + (role === 'user' ? 'cz-user' : 'cz-bot');
    const bubble = document.createElement('div');
    bubble.className = 'cz-bubble';
    if (role === 'user') bubble.textContent = text;   // pesan pengguna: teks polos (aman)
    else bubble.innerHTML = renderMarkdown(text);      // jawaban AI: sudah di-escape dulu
    row.appendChild(bubble);
    els.messages.appendChild(row);
    scrollToBottom();
    return row;
}

function addError(text) {
    const row = document.createElement('div');
    row.className = 'cz-row cz-bot';
    const bubble = document.createElement('div');
    bubble.className = 'cz-bubble cz-error';
    bubble.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> ';
    bubble.appendChild(document.createTextNode(text));
    row.appendChild(bubble);
    els.messages.appendChild(row);
    scrollToBottom();
}

function addTyping() {
    const row = document.createElement('div');
    row.className = 'cz-row cz-bot';
    row.innerHTML = '<div class="cz-bubble cz-typing" aria-label="Cloudz AI sedang mengetik"><i></i><i></i><i></i></div>';
    els.messages.appendChild(row);
    scrollToBottom();
    return row;
}

function renderAll() {
    els.messages.innerHTML = '';
    addMessage('model', getWelcome());
    if (!history.length) {
        const chips = document.createElement('div');
        chips.className = 'cz-chips';
        SUGGESTIONS.forEach((q) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'cz-chip';
            b.textContent = q;
            b.addEventListener('click', () => { chips.remove(); sendMessage(q); });
            chips.appendChild(b);
        });
        els.messages.appendChild(chips);
    }
    history.forEach((m) => addMessage(m.role, m.text));
}

function setBusy(v) {
    busy = v;
    els.send.disabled = v;
    els.panel.classList.toggle('is-busy', v);
}

function autoGrow() {
    els.input.style.height = 'auto';
    els.input.style.height = Math.min(els.input.scrollHeight, 110) + 'px';
}


/* ---------- Menyesuaikan popup dengan keyboard HP ---------- */
// Di HP, keyboard tidak mengecilkan halaman, jadi popup yang menempel di bawah layar ikut tertutup.
// visualViewport memberi tahu area layar yang benar-benar terlihat; popup kita naikkan & pendekkan agar pas di atas keyboard.
function resetPanelFit() {
    if (!els.panel) return;
    els.panel.style.bottom = '';
    els.panel.style.height = '';
}

function fitPanel() {
    const vv = window.visualViewport;
    if (!vv || !isOpen) { resetPanelFit(); return; }

    // Tinggi keyboard = bagian layar yang tertutup di bawah area terlihat
    const keyboard = Math.round(window.innerHeight - vv.height - vv.offsetTop);
    if (keyboard < 80) { resetPanelFit(); return; }   // keyboard tidak tampil

    resetPanelFit();                                   // ukur dulu tinggi bawaan dari CSS
    const baseHeight = els.panel.offsetHeight;
    els.panel.style.bottom = (keyboard + 8) + 'px';
    els.panel.style.height = Math.max(220, Math.min(baseHeight, Math.floor(vv.height) - 16)) + 'px';
    scrollToBottom();
}

/* ---------- Buka / tutup ---------- */
function openPanel() {
    isOpen = true;
    els.panel.inert = false;
    els.panel.setAttribute('aria-hidden', 'false');
    els.panel.classList.add('open');
    els.fab.classList.add('is-hidden');
    els.fab.setAttribute('aria-expanded', 'true');
    fitPanel();
    scrollToBottom();
    setTimeout(() => { if (isOpen) els.input.focus({ preventScroll: true }); }, 220);
}
function closePanel() {
    isOpen = false;
    els.panel.classList.remove('open');
    els.panel.setAttribute('aria-hidden', 'true');
    els.panel.inert = true;
    els.fab.classList.remove('is-hidden');
    els.fab.setAttribute('aria-expanded', 'false');
    resetPanelFit();
    els.fab.focus({ preventScroll: true });
}

/* ---------- Kirim pertanyaan ---------- */
async function sendMessage(text) {
    text = String(text || '').trim().slice(0, MAX_INPUT);
    if (!text || busy) return;

    if (!navigator.onLine) {
        addError('Kamu sedang offline. Sambungkan internet lalu coba lagi.');
        return;
    }

    const chips = els.messages.querySelector('.cz-chips');
    if (chips) chips.remove();

    history.push({ role: 'user', text });
    addMessage('user', text);
    els.input.value = '';
    autoGrow();
    setBusy(true);
    const typing = addTyping();

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: history.slice(-MAX_HISTORY),
                clientTime: { hour: new Date().getHours(), minute: new Date().getMinutes() }   // agar jawaban sesuai waktu pengguna
            }),
            signal: ctrl.signal
        });

        let data = null;
        try { data = await res.json(); } catch (e) { /* bukan JSON */ }

        if (!res.ok || !data || !data.reply) {
            const notDeployed = res.status === 404 || (res.ok && !data);
            throw new Error(
                (data && data.error) ||
                (notDeployed ? 'Layanan Cloudz AI belum tersedia di alamat ini.' : 'Gagal mendapat jawaban. Coba lagi.')
            );
        }

        typing.remove();
        history.push({ role: 'model', text: data.reply });
        history = history.slice(-MAX_HISTORY);
        addMessage('model', data.reply);
        saveHistory();
    } catch (e) {
        typing.remove();
        // Batalkan pesan yang gagal agar urutan percakapan tetap rapi, lalu kembalikan teksnya ke kotak input
        history.pop();
        els.input.value = text;
        autoGrow();
        addError(e.name === 'AbortError' ? 'Jawaban terlalu lama. Coba lagi.' : e.message);
    } finally {
        clearTimeout(timer);
        setBusy(false);
        if (isOpen) els.input.focus({ preventScroll: true });
    }
}

function clearChat() {
    if (busy) return;
    history = [];
    saveHistory();
    renderAll();
}


/* ---------- Tombol bisa digeser ---------- */
const POS_KEY = 'czai_fab_pos_v1';
const EDGE = 8;            // jarak minimal tombol dari tepi layar (px)
const DRAG_THRESHOLD = 6;  // geseran lebih kecil dari ini dianggap klik biasa
let fabPos = null;         // { side: 'left' | 'right', y: 0..1 }  (posisi disimpan secara relatif)
let justDragged = false;

function clamp(v, min, max) { return Math.min(Math.max(v, min), Math.max(min, max)); }

function loadFabPos() {
    try {
        const p = JSON.parse(localStorage.getItem(POS_KEY) || 'null');
        if (p && (p.side === 'left' || p.side === 'right') && typeof p.y === 'number') {
            fabPos = { side: p.side, y: clamp(p.y, 0, 1) };
        }
    } catch (e) { fabPos = null; }
}
function saveFabPos() {
    try { localStorage.setItem(POS_KEY, JSON.stringify(fabPos)); } catch (e) { /* abaikan */ }
}

// Menempatkan tombol sesuai posisi tersimpan (dipanggil juga saat layar berubah ukuran)
function placeFab() {
    if (!fabPos || !els.fab) return;
    const w = els.fab.offsetWidth, h = els.fab.offsetHeight;
    const vw = window.innerWidth, vh = window.innerHeight;
    const left = fabPos.side === 'left' ? EDGE : vw - w - EDGE;
    const top = clamp(fabPos.y * (vh - h), EDGE, vh - h - EDGE);
    els.fab.style.left = left + 'px';
    els.fab.style.top = top + 'px';
    els.fab.style.right = 'auto';
    els.fab.style.bottom = 'auto';
}

function initFabDrag() {
    const fab = els.fab;
    let pid = null, moved = false, startX = 0, startY = 0, originLeft = 0, originTop = 0;

    fab.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        const r = fab.getBoundingClientRect();
        pid = e.pointerId;
        moved = false;
        justDragged = false;
        startX = e.clientX; startY = e.clientY;
        originLeft = r.left; originTop = r.top;
        try { fab.setPointerCapture(pid); } catch (err) { /* abaikan */ }
    });

    fab.addEventListener('pointermove', (e) => {
        if (e.pointerId !== pid) return;
        const dx = e.clientX - startX, dy = e.clientY - startY;
        if (!moved) {
            if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
            moved = true;
            fab.classList.remove('is-snapping');
            fab.classList.add('is-dragging');
        }
        const w = fab.offsetWidth, h = fab.offsetHeight;
        fab.style.left = clamp(originLeft + dx, EDGE, window.innerWidth - w - EDGE) + 'px';
        fab.style.top = clamp(originTop + dy, EDGE, window.innerHeight - h - EDGE) + 'px';
        fab.style.right = 'auto';
        fab.style.bottom = 'auto';
    });

    const endDrag = (e) => {
        if (e.pointerId !== pid) return;
        try { fab.releasePointerCapture(pid); } catch (err) { /* abaikan */ }
        pid = null;
        fab.classList.remove('is-dragging');
        if (!moved) return;

        // Setelah digeser: jangan dianggap klik, lalu "menempel" ke tepi kiri/kanan terdekat
        justDragged = true;
        setTimeout(() => { justDragged = false; }, 350);
        const r = fab.getBoundingClientRect();
        const range = window.innerHeight - r.height;
        fabPos = {
            side: r.left + r.width / 2 < window.innerWidth / 2 ? 'left' : 'right',
            y: range > 0 ? clamp(r.top / range, 0, 1) : 0
        };
        fab.classList.add('is-snapping');
        placeFab();
        saveFabPos();
    };
    fab.addEventListener('pointerup', endDrag);
    fab.addEventListener('pointercancel', endDrag);

    window.addEventListener('resize', placeFab);
    window.addEventListener('orientationchange', placeFab);
    window.addEventListener('load', placeFab);
    placeFab();
}

function onFabClick(e) {
    if (justDragged) { e.preventDefault(); justDragged = false; return; }
    openPanel();
}

/* ---------- Dipanggil dari main.js ---------- */
export function initAiChat() {
    if (document.getElementById('czRoot')) return;
    loadHistory();
    buildUI();
    renderAll();

    els.fab.addEventListener('click', onFabClick);
    loadFabPos();
    initFabDrag();
    // Klik tombol link di jawaban AI: ikut dihitung sebagai klik, sama seperti di daftar link
    els.messages.addEventListener('click', (e) => {
        const a = e.target.closest ? e.target.closest('a.cz-linkbtn') : null;
        if (!a) return;
        const id = a.getAttribute('data-link-id');
        if (id && typeof window.handleLinkClick === 'function') window.handleLinkClick(id, e);
    });
    els.close.addEventListener('click', closePanel);
    els.clear.addEventListener('click', clearChat);
    els.form.addEventListener('submit', (e) => { e.preventDefault(); sendMessage(els.input.value); });
    els.input.addEventListener('input', autoGrow);
    els.input.addEventListener('focus', () => { setTimeout(fitPanel, 150); setTimeout(fitPanel, 450); });
    els.input.addEventListener('blur', () => setTimeout(fitPanel, 150));
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', fitPanel);
        window.visualViewport.addEventListener('scroll', fitPanel);
    }
    els.input.addEventListener('keydown', (e) => {
        // Enter = kirim, Shift+Enter = baris baru
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
            e.preventDefault();
            sendMessage(els.input.value);
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isOpen) closePanel();
    });
}
