/**
 * links-actions.js
 * Aksi admin untuk link & folder: hitung klik, tambah, hapus, tampil/sembunyikan, edit, dan simpan perubahan.
 */

import { addDoc, collection, deleteDoc, doc, increment, updateDoc, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { state } from './state.js';
import { showToast } from './utils.js';

// Catat klik dari SIAPA PUN yang membuka link (pengunjung maupun admin).
// increment(1) dijalankan atomik di server Firestore, jadi aman walau banyak orang klik bersamaan.
const lastClickAt = {};
window.trackClick = async function(id) {
    const link = state.linksList.find(l => l.id === id);
    if (!link || link.isFolder) return;
    const now = Date.now();
    if (now - (lastClickAt[id] || 0) < 1500) return; // abaikan ketukan ganda beruntun
    lastClickAt[id] = now;
    try {
        await updateDoc(doc(state.db, 'biolink', 'public', 'links', id), { clicks: increment(1) });
    } catch (e) {
        if (!state.db) {
            // mode demo/lokal (Firebase gagal dimuat)
            link.clicks = (link.clicks || 0) + 1;
            localStorage.setItem('fallback_lynk_links', JSON.stringify(state.linksList));
        } else {
            console.warn('Klik gagal dicatat (cek Firestore Rules):', e && e.code ? e.code : e);
        }
    }
};

window.handleAddLink = async function(e) {
    e.preventDefault();
    if (!state.currentUser) {
        showToast('Anda harus login sebagai Admin!', 'error');
        return;
    }

    const itemType = document.getElementById('itemType').value;
    const title = document.getElementById('linkTitle').value.trim();
    const url = document.getElementById('linkUrl').value.trim();
    const desc = document.getElementById('linkDesc').value.trim();
    const aiNote = document.getElementById('linkAiNote').value.trim().slice(0, 1500);
    const icon = document.getElementById('linkIconValue').value;
    const parentId = document.getElementById('linkFolderParent').value;
    const locked = document.getElementById('linkLocked').checked;
    const lockMessage = document.getElementById('linkLockMsg').value.trim();
    const btn = document.getElementById('submitAddLinkBtn');

    btn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> Menyimpan...';
    const isFolder = itemType === 'folder';

    try {
        await addDoc(collection(state.db, 'biolink', 'public', 'links'), {
            title,
            url: isFolder ? '' : url,
            desc,
            aiNote,
            icon,
            isFolder,
            parentId: isFolder ? '' : (parentId || ''),
            clicks: 0,
            visible: true,
            locked: isFolder ? false : locked,
            lockMessage: isFolder ? '' : lockMessage,
            order: state.linksList.length,
            createdAt: Date.now()
        });

        document.getElementById('addLinkForm').reset();
        toggleLockFields('add');
        switchItemType('link');
        showToast(isFolder ? 'Folder baru dibuat!' : 'Link baru ditambahkan!');
    } catch (err) {
        showToast('Gagal menyimpan data ke cloud', 'error');
    } finally {
        btn.innerHTML = '<i class="fa-solid fa-save"></i> Simpan Item';
    }
};

window.deleteLink = async function(id) {
    if (!state.currentUser) return;
    const target = state.linksList.find(i => i.id === id);
    if (target && target.isFolder) {
        if (state.linksList.some(i => i.parentId === id) && !confirm("Folder berisi link. Lanjutkan menghapus?")) return;
    }

    try {
        await deleteDoc(doc(state.db, 'biolink', 'public', 'links', id));
        if (target && target.isFolder) {
            const batch = writeBatch(state.db);
            state.linksList.filter(i => i.parentId === id).forEach(c => {
                batch.update(doc(state.db, 'biolink', 'public', 'links', c.id), { parentId: '' });
            });
            await batch.commit();
        }
        showToast('Item berhasil dihapus.');
    } catch (err) {
        showToast('Gagal menghapus item', 'error');
    }
};

window.toggleLinkVisibility = async function(id, newVisibility) {
    if (!state.currentUser) return;
    try {
        await updateDoc(doc(state.db, 'biolink', 'public', 'links', id), { visible: newVisibility });
        showToast(newVisibility ? 'Item ditampilkan' : 'Item disembunyikan');
    } catch(e) {
        showToast('Gagal mengubah status', 'error');
    }
};

window.openEditModal = function(id) {
    const item = state.linksList.find(l => l.id === id);
    if (!item) return;

    document.getElementById('editLinkId').value = item.id;
    document.getElementById('editIsFolder').value = item.isFolder ? 'true' : 'false';
    document.getElementById('editLinkTitle').value = item.title || '';
    document.getElementById('editLinkUrl').value = item.url || '';
    document.getElementById('editLinkDesc').value = item.desc || '';
    document.getElementById('editLinkAiNote').value = item.aiNote || '';
    document.getElementById('editLinkFolderParent').value = item.parentId || '';

    const iconVal = item.icon || (item.isFolder ? 'fa-solid fa-folder' : 'fa-solid fa-globe');
    document.getElementById('editLinkIconValue').value = iconVal;

    const editIconFa = document.getElementById('editIconPreviewFa');
    const editIconImg = document.getElementById('editIconPreviewImg');
    const editSelect = document.getElementById('editLinkIconSelect');

    if (iconVal.startsWith('data:image/')) {
        editIconFa.classList.add('hidden');
        editIconImg.src = iconVal;
        editIconImg.classList.remove('hidden');
        editSelect.value = "CUSTOM_FILE";
    } else {
        editIconImg.classList.add('hidden');
        editIconFa.className = iconVal;
        editIconFa.classList.remove('hidden');
        editSelect.value = iconVal;
    }

    const editUrlContainer = document.getElementById('editUrlContainer');
    const editFolderParentContainer = document.getElementById('editFolderParentContainer');
    const editTitleLabel = document.getElementById('editTitleLabel');

    const editLockOption = document.getElementById('editLockOptionContainer');
    document.getElementById('editLinkLocked').checked = item.locked === true;
    document.getElementById('editLockMsg').value = item.lockMessage || '';
    toggleLockFields('edit');

    if (item.isFolder) {
        editUrlContainer.classList.add('hidden');
        editFolderParentContainer.classList.add('hidden');
        editLockOption.classList.add('hidden');
        editTitleLabel.innerText = "Nama Folder";
    } else {
        editUrlContainer.classList.remove('hidden');
        editFolderParentContainer.classList.remove('hidden');
        editLockOption.classList.remove('hidden');
        editTitleLabel.innerText = "Judul Link";
    }

    document.getElementById('editModal').classList.remove('hidden');
};

window.closeEditModal = function() {
    document.getElementById('editModal').classList.add('hidden');
};

window.handleSaveEdit = async function(e) {
    e.preventDefault();
    const id = document.getElementById('editLinkId').value;
    const isFolder = document.getElementById('editIsFolder').value === 'true';
    const title = document.getElementById('editLinkTitle').value.trim();
    const url = document.getElementById('editLinkUrl').value.trim();
    const desc = document.getElementById('editLinkDesc').value.trim();
    const aiNote = document.getElementById('editLinkAiNote').value.trim().slice(0, 1500);
    const icon = document.getElementById('editLinkIconValue').value;
    const parentId = document.getElementById('editLinkFolderParent').value;
    const locked = document.getElementById('editLinkLocked').checked;
    const lockMessage = document.getElementById('editLockMsg').value.trim();

    try {
        await updateDoc(doc(state.db, 'biolink', 'public', 'links', id), {
            title,
            desc,
            aiNote,
            icon,
            url: isFolder ? '' : url,
            parentId: isFolder ? '' : parentId,
            locked: isFolder ? false : locked,
            lockMessage: isFolder ? '' : lockMessage
        });

        closeEditModal();
        showToast('Perubahan berhasil disimpan!');
    } catch (err) {
        showToast('Gagal memperbarui item', 'error');
    }
};
