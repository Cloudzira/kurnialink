/**
 * profile.js
 * Profil di bagian atas halaman: tampilkan nama, bio, foto, centang biru, serta pengolahan foto profil (pratinjau & kompres).
 */

import { DEFAULT_AVATAR } from './config.js';
import { showToast } from './utils.js';

const MAX_AVATAR_UPLOAD_BYTES = 12 * 1024 * 1024;
const MAX_AVATAR_DATA_URL_LENGTH = 650000;
let avatarPreviewObjectUrl = null;

export function renderProfile(data) {
    document.getElementById('profileName').childNodes[0].nodeValue = (data.name || 'User Name') + ' ';
    document.getElementById('profileBio').innerText = data.bio || '';
    const avatar = document.getElementById('profileAvatar');
    avatar.src = getSafeAvatarUrl(data.avatar);
    avatar.onerror = () => {
        avatar.onerror = null;
        avatar.src = DEFAULT_AVATAR;
    };
    
    const verifiedBadge = document.getElementById('profileVerified');
    if (data.verified) {
        verifiedBadge.classList.remove('hidden');
    } else {
        verifiedBadge.classList.add('hidden');
    }
}

export function getSafeAvatarUrl(value) {
    if (!value) return DEFAULT_AVATAR;
    if (value.startsWith('data:image/')) return value;
    try {
        const host = new URL(value, window.location.href).hostname.toLowerCase();
        return host === 'cdninstagram.com' || host.endsWith('.cdninstagram.com')
            ? DEFAULT_AVATAR
            : value;
    } catch {
        return DEFAULT_AVATAR;
    }
}

export function releaseAvatarPreviewUrl() {
    if (!avatarPreviewObjectUrl) return;
    URL.revokeObjectURL(avatarPreviewObjectUrl);
    avatarPreviewObjectUrl = null;
}

function previewSelectedAvatar(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        event.target.value = '';
        showToast('Pilih file gambar yang valid.', 'error');
        return;
    }
    if (file.size > MAX_AVATAR_UPLOAD_BYTES) {
        event.target.value = '';
        showToast('Ukuran foto maksimal 12 MB.', 'error');
        return;
    }

    releaseAvatarPreviewUrl();
    document.getElementById('editProfileAvatar').value = '';
    avatarPreviewObjectUrl = URL.createObjectURL(file);
    document.getElementById('editProfileAvatarPreview').src = avatarPreviewObjectUrl;
    document.getElementById('avatarUploadStatus').innerText = `Foto dipilih: ${file.name}`;
}

function previewAvatarUrl(value) {
    if (!value.trim()) return;
    releaseAvatarPreviewUrl();
    document.getElementById('editProfileAvatarFile').value = '';
    document.getElementById('editProfileAvatarPreview').src = getSafeAvatarUrl(value.trim());
    document.getElementById('avatarUploadStatus').innerText = 'Pratinjau dari URL foto.';
}

export async function compressAvatarFile(file, maxDim = 512, maxByteLen = MAX_AVATAR_DATA_URL_LENGTH) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const sourceSize = Math.max(img.naturalWidth, img.naturalHeight);
                let currentMaxDim = maxDim;
                let quality = 0.8;
                let compressed = '';

                for (let i = 0; i < 3; i++) {
                    const scale = Math.min(1, currentMaxDim / sourceSize);
                    const canvas = document.createElement('canvas');
                    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
                    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('Canvas context tidak didukung.'));
                        return;
                    }
                    ctx.fillStyle = '#06070b';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    compressed = canvas.toDataURL('image/jpeg', quality);
                    if (compressed.length <= maxByteLen) {
                        resolve(compressed);
                        return;
                    }
                    currentMaxDim = Math.round(currentMaxDim * 0.75);
                    quality -= 0.15;
                }
                resolve(compressed);
            };
            img.onerror = () => reject(new Error('Gagal memuat gambar dari file.'));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('Gagal membaca file.'));
        reader.readAsDataURL(file);
    });
}
