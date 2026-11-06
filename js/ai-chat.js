/**
 * ai-chat.js
 * Cloudz AI: tombol melayang + popup chat. Pertanyaan dikirim ke /api/chat (server Cloudflare),
 * BUKAN langsung ke Google, jadi API key tidak pernah ada di sisi browser.
 */

import { escapeHtml } from './utils.js';

const API_URL = '/api/chat';
const STORAGE_KEY = 'czai_history_v1';
const MAX_HISTORY = 16;
const MAX_INPUT = 1000;
const REQUEST_TIMEOUT_MS = 35000;

const WELCOME = 'Halo! Saya **Cloudz AI** ✨\nSilakan tanya apa saja, saya siap membantu.';
const SUGGESTIONS = [
    'Kamu bisa bantu apa saja?',
    'Beri saya motivasi hari ini',
    'Tips belajar yang efektif',
    'Buatkan caption untuk postingan'
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

/* ---------- Mengubah teks AI menjadi HTML aman (bold, kode, daftar) ---------- */
function renderMarkdown(text) {
    const blocks = [];
    let s = String(text || '').replace(/```(?:[\w-]+)?\n?([\s\S]*?)```/g, (_, code) => {
        blocks.push(code.replace(/\n$/, ''));
        return '\u0000B' + (blocks.length - 1) + '\u0000';
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

    return out.replace(/\u0000B(\d+)\u0000/g, (_, i) => '<pre><code>' + escapeHtml(blocks[Number(i)]) + '</code></pre>');
}

/* ---------- Membangun tampilan ---------- */
function buildUI() {
    const wrap = document.createElement('div');
    wrap.id = 'czRoot';
    wrap.innerHTML = `
        <button id="czFab" class="cz-fab" type="button" aria-label="Buka Cloudz AI" aria-haspopup="dialog" aria-expanded="false" aria-controls="czPanel">
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
    addMessage('model', WELCOME);
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

/* ---------- Buka / tutup ---------- */
function openPanel() {
    isOpen = true;
    els.panel.inert = false;
    els.panel.setAttribute('aria-hidden', 'false');
    els.panel.classList.add('open');
    els.fab.classList.add('is-hidden');
    els.fab.setAttribute('aria-expanded', 'true');
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
            body: JSON.stringify({ messages: history.slice(-MAX_HISTORY) }),
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

/* ---------- Dipanggil dari main.js ---------- */
export function initAiChat() {
    if (document.getElementById('czRoot')) return;
    loadHistory();
    buildUI();
    renderAll();

    els.fab.addEventListener('click', openPanel);
    els.close.addEventListener('click', closePanel);
    els.clear.addEventListener('click', clearChat);
    els.form.addEventListener('submit', (e) => { e.preventDefault(); sendMessage(els.input.value); });
    els.input.addEventListener('input', autoGrow);
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
