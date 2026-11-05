/**
 * link-lock.js
 * Fitur kunci link & jendela info: klik link, kunci/buka kunci oleh admin, dan jendela informasi (Dikunci / Bantuan Install).
 */

import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { state } from './state.js';
import { showToast } from './utils.js';

// --- INFO MODAL (dikunci / bantuan install) ---
export function showInfoModal({ icon = 'fa-solid fa-lock', title = '', name = '', message = '', tone = 'amber' }) {
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
    document.getElementById('infoModal').classList.remove('hidden');
}

window.closeInfoModal = function() {
    document.getElementById('infoModal').classList.add('hidden');
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
            message: (link.lockMessage && link.lockMessage.trim()) || DEFAULT_LOCK_MESSAGE
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
});
