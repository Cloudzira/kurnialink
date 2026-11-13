/**
 * link-lock.js
 * Fitur kunci link & jendela info: klik link, kunci/buka kunci oleh admin, dan jendela informasi (Dikunci / Bantuan Install).
 * Link terkunci tetap bisa dibuka pengunjung yang punya kode akses (kode per link; kalau kosong memakai LOCK_ACCESS_CODE di config.js).
 */

import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { state } from './state.js';
import { showToast } from './utils.js';
import { LOCK_ACCESS_CODE } from './config.js';

let pendingLockedId = null;   // id link terkunci yang sedang ditampilkan di jendela info

// --- INFO MODAL (dikunci / bantuan install) ---
export function showInfoModal({ icon = 'fa-solid fa-lock', title = '', name = '', message = '', tone = 'amber', unlockId = null }) {
    const wrap = document.getElementById('infoModalIconWrap');
    const nameEl = document.getElementById('infoModalName');
    document.getElementById('infoModalIcon').className = icon;
    wrap.className = 'w-12 h-12 rounded-full glass-panel mx-auto flex items-center justify-center text-xl mb-3 ' +
        (tone === 'cyan' ? 'text-neon-cyan border-cyan-500/30' : 'text-amber-400 border-amber-500/30');
    document.getElementById('infoModalTitle').innerText = title;
    document.getElementById('infoModalMsg').innerText = message;
    if (name) {
        nameEl.innerText = name;
        nameEl.classList.remove('hidden');
    } else {
        nameEl.classList.add('hidden');
    }

    // Bagian "masukkan kode akses": hanya tampil untuk link terkunci
    pendingLockedId = unlockId;
    const codeWrap = document.getElementById('infoModalCodeWrap');
    const codeInput = document.getElementById('infoModalCode');
    const codeErr = document.getElementById('infoModalCodeErr');
    codeInput.value = '';
    codeErr.classList.add('hidden');
    codeInput.classList.remove('code-wrong');
    codeWrap.classList.toggle('hidden', !unlockId);

    document.getElementById('infoModal').classList.remove('hidden');
    if (unlockId) setTimeout(() => codeInput.focus({ preventScroll: true }), 150);
}

window.closeInfoModal = function() {
    document.getElementById('infoModal').classList.add('hidden');
    pendingLockedId = null;
};

// Cek kode akses; kalau benar, link terkunci langsung dibuka
window.submitLockCode = function() {
    const codeInput = document.getElementById('infoModalCode');
    const codeErr = document.getElementById('infoModalCodeErr');
    const typed = codeInput.value.trim().toLowerCase();
    const link = state.linksList.find(l => l.id === pendingLockedId);
    if (!link) return;

    // Kode milik link ini; kalau admin tidak mengisi, pakai kode default (LOCK_ACCESS_CODE = "awan")
    const customCode = String(link.lockCode || '').trim();
    const validCode = (customCode || String(LOCK_ACCESS_CODE).trim()).toLowerCase();

    if (typed && typed === validCode) {
        const url = link.url;
        window.closeInfoModal();
        if (!url) { showToast('Link ini belum punya alamat', 'error'); return; }
        window.trackClick(link.id);
        window.open(url, '_blank', 'noopener');
        showToast('Kode benar, membuka ' + (link.title || 'link'));
    } else {
        codeErr.classList.remove('hidden');
        codeInput.classList.remove('code-wrong');
        void codeInput.offsetWidth;            // memulai ulang animasi getar
        codeInput.classList.add('code-wrong');
        codeInput.select();
    }
};

// --- FITUR LOCK LINK ---
const DEFAULT_LOCK_MESSAGE = 'Aplikasi ini sedang dikunci oleh admin dan belum bisa dibuka. Silakan coba lagi nanti atau hubungi admin.';

window.handleLinkClick = function(id, event) {
    const link = state.linksList.find(l => l.id === id);
    if (!link) return;
    if (link.locked === true) {
        event.preventDefault();
        showInfoModal({
            icon: 'fa-solid fa-lock',
            title: 'Aplikasi Dikunci',
            name: link.title,
            message: (link.lockMessage && link.lockMessage.trim()) || DEFAULT_LOCK_MESSAGE,
            unlockId: link.id
        });
        return;
    }
    window.trackClick(id);
};

window.toggleLinkLock = async function(id, newLocked) {
    if (!state.currentUser) return;
    try {
        await updateDoc(doc(state.db, 'biolink', 'public', 'links', id), { locked: newLocked });
        showToast(newLocked ? 'Link dikunci' : 'Kunci link dibuka');
    } catch (e) {
        showToast('Gagal mengubah status kunci', 'error');
    }
};

window.toggleLockFields = function(prefix) {
    const isEdit = prefix === 'edit';
    const cb = document.getElementById(isEdit ? 'editLinkLocked' : 'linkLocked');
    const wrap = document.getElementById(isEdit ? 'editLockMsgWrap' : 'linkLockMsgWrap');
    wrap.classList.toggle('hidden', !cb.checked);
};

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') window.closeInfoModal();
    // Enter di kolom kode = coba buka
    if (e.key === 'Enter' && e.target && e.target.id === 'infoModalCode') {
        e.preventDefault();
        window.submitLockCode();
    }
});
