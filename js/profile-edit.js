/**
 * profile-edit.js
 * Edit profil oleh admin: buka/tutup jendela edit dan simpan nama, bio, foto, serta centang biru.
 */

import { doc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { state } from './state.js';
import { DEFAULT_AVATAR } from './config.js';
import { showToast } from './utils.js';
import { compressAvatarFile, getSafeAvatarUrl, releaseAvatarPreviewUrl } from './profile.js';

window.openEditProfileModal = function() {
    document.getElementById('editProfileName').value = state.profileData.name || '';
    document.getElementById('editProfileBio').value = state.profileData.bio || '';
    releaseAvatarPreviewUrl();
    const savedAvatar = state.profileData.avatar || '';
    const safeAvatar = getSafeAvatarUrl(savedAvatar);
    document.getElementById('editProfileAvatar').value = savedAvatar.startsWith('data:image/') || safeAvatar === DEFAULT_AVATAR ? '' : savedAvatar;
    document.getElementById('editProfileAvatarFile').value = '';
    document.getElementById('editProfileAvatarPreview').src = safeAvatar;
    document.getElementById('avatarUploadStatus').innerText = savedAvatar ? 'Foto profil saat ini.' : 'Pilih foto dari galeri.';
    document.getElementById('editProfileVerified').checked = !!state.profileData.verified;

    document.getElementById('profileModal').classList.remove('hidden');
};

window.closeEditProfileModal = function() {
    releaseAvatarPreviewUrl();
    document.getElementById('editProfileAvatarFile').value = '';
    document.getElementById('editProfileAvatarPreview').src = getSafeAvatarUrl(state.profileData.avatar);
    document.getElementById('profileModal').classList.add('hidden');
};

window.handleSaveProfile = async function(e) {
    e.preventDefault();
    const name = document.getElementById('editProfileName').value.trim();
    const bio = document.getElementById('editProfileBio').value.trim();
    const avatarUrl = document.getElementById('editProfileAvatar').value.trim();
    const avatarFile = document.getElementById('editProfileAvatarFile').files?.[0];
    const verified = document.getElementById('editProfileVerified').checked;
    const saveButton = document.getElementById('saveProfileBtn');

    saveButton.disabled = true;
    saveButton.innerText = avatarFile ? 'Mengompres foto...' : 'Menyimpan...';

    try {
        let avatar = getSafeAvatarUrl(state.profileData.avatar);
        if (avatarFile) {
            avatar = await compressAvatarFile(avatarFile);
        } else if (avatarUrl) {
            avatar = getSafeAvatarUrl(avatarUrl);
        }

        await setDoc(doc(state.db, 'biolink', 'public', 'profile', 'header'), { name, bio, avatar, verified }, { merge: true });
        closeEditProfileModal();
        showToast('Profil header berhasil diperbarui!');
    } catch (err) {
        showToast(err.message || 'Gagal memperbarui profil', 'error');
    } finally {
        saveButton.disabled = false;
        saveButton.innerText = 'Simpan Profil';
    }
};
