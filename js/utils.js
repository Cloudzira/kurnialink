/**
 * utils.js
 * Fungsi bantu umum yang dipakai banyak file: ambil elemen (bEl), notifikasi toast, dan pengaman teks HTML (escapeHtml).
 */


export function bEl(id) { return document.getElementById(id); }

export function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    const toastIcon = document.getElementById('toastIcon');

    toastMsg.innerText = message;
    toastIcon.className = type === 'error' 
        ? 'fa-solid fa-circle-exclamation text-neon-pink text-xs' 
        : 'fa-solid fa-circle-check text-neon-cyan text-xs';

    toast.classList.remove('opacity-0', 'pointer-events-none');
    toast.classList.add('opacity-100');

    setTimeout(() => {
        toast.classList.remove('opacity-100');
        toast.classList.add('opacity-0', 'pointer-events-none');
    }, 2600);
}

export function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Hanya izinkan alamat http/https (menolak javascript:, data:, dll.). Mengembalikan '#' bila tidak aman.
export function safeUrl(u) {
    try {
        const p = new URL(String(u || '').trim(), location.href);
        return (p.protocol === 'https:' || p.protocol === 'http:') ? p.href : '#';
    } catch (e) { return '#'; }
}
