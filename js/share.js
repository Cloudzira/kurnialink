/**
 * share.js
 * Tombol Bagikan: memakai Web Share bila tersedia, atau menyalin tautan ke papan klip.
 */

import { showToast } from './utils.js';

window.shareProfile = function() {
    const profileUrl = window.location.href;
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(profileUrl).then(() => {
            showToast('Link profil berhasil disalin!');
        }).catch(() => fallbackCopy(profileUrl));
    } else {
        fallbackCopy(profileUrl);
    }
};

function fallbackCopy(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        document.execCommand('copy');
        showToast('Link profil disalin!');
    } catch (err) {
        showToast('Gagal menyalin link');
    }
    document.body.removeChild(textArea);
}
