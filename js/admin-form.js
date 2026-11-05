/**
 * admin-form.js
 * Form admin: dropdown folder, pemilih ikon (bawaan / unggah gambar), dan pengalih jenis item (Single Link / Folder).
 */

import { state } from './state.js';
import { escapeHtml, showToast } from './utils.js';
import { compressAvatarFile } from './profile.js';

let linkIconPreviewObjectUrl = null;
let editIconPreviewObjectUrl = null;

export function updateFolderDropdownOptions() {
    const addSelect = document.getElementById('linkFolderParent');
    const editSelect = document.getElementById('editLinkFolderParent');
    const folders = state.linksList.filter(item => item.isFolder === true && (state.currentUser || item.visible !== false));
    
    let optionsHtml = '<option value="">-- Halaman Utama (Tanpa Folder) --</option>';
    folders.forEach(f => {
        optionsHtml += `<option value="${f.id}">📁 Folder: ${escapeHtml(f.title)}</option>`;
    });

    if (addSelect) addSelect.innerHTML = optionsHtml;
    if (editSelect) editSelect.innerHTML = optionsHtml;
}

window.handleIconSelectChange = function(val) {
    const fileInput = document.getElementById('linkIconLocalFile');
    const iconFa = document.getElementById('linkIconPreviewFa');
    const iconImg = document.getElementById('linkIconPreviewImg');
    const hiddenValue = document.getElementById('linkIconValue');

    if (val === 'CUSTOM_FILE') {
        fileInput.classList.remove('hidden');
        fileInput.click();
    } else {
        fileInput.classList.add('hidden');
        fileInput.value = '';
        if (linkIconPreviewObjectUrl) {
            URL.revokeObjectURL(linkIconPreviewObjectUrl);
            linkIconPreviewObjectUrl = null;
        }
        iconFa.className = val;
        iconFa.classList.remove('hidden');
        iconImg.classList.add('hidden');
        hiddenValue.value = val;
    }
};

window.handleLinkLocalFileSelected = async function(event) {
    const file = event.target.files?.[0];
    const iconFa = document.getElementById('linkIconPreviewFa');
    const iconImg = document.getElementById('linkIconPreviewImg');
    const hiddenValue = document.getElementById('linkIconValue');
    const selectEl = document.getElementById('linkIconSelect');

    if (!file) return;
    if (!file.type.startsWith('image/')) {
        showToast('Pilih file gambar ikon yang valid.', 'error');
        event.target.value = '';
        return;
    }

    try {
        showToast('Memproses gambar ikon...');
        const compressedDataUrl = await compressAvatarFile(file, 200, 200);
        
        if (linkIconPreviewObjectUrl) URL.revokeObjectURL(linkIconPreviewObjectUrl);
        linkIconPreviewObjectUrl = URL.createObjectURL(file);

        iconFa.classList.add('hidden');
        iconImg.src = compressedDataUrl;
        iconImg.classList.remove('hidden');
        hiddenValue.value = compressedDataUrl;
        showToast('Ikon lokal berhasil dimuat!');
    } catch (err) {
        console.error("Icon compression error:", err);
        showToast('Gagal memproses gambar ikon.', 'error');
        selectEl.value = "fa-solid fa-globe";
        window.handleIconSelectChange("fa-solid fa-globe");
    }
};

window.handleEditIconSelectChange = function(val) {
    const fileInput = document.getElementById('editLinkIconLocalFile');
    const iconFa = document.getElementById('editIconPreviewFa');
    const iconImg = document.getElementById('editIconPreviewImg');
    const hiddenValue = document.getElementById('editLinkIconValue');

    if (val === 'CUSTOM_FILE') {
        fileInput.classList.remove('hidden');
        fileInput.click();
    } else {
        fileInput.classList.add('hidden');
        fileInput.value = '';
        if (editIconPreviewObjectUrl) {
            URL.revokeObjectURL(editIconPreviewObjectUrl);
            editIconPreviewObjectUrl = null;
        }
        iconFa.className = val;
        iconFa.classList.remove('hidden');
        iconImg.classList.add('hidden');
        hiddenValue.value = val;
    }
};

window.handleEditLinkLocalFileSelected = async function(event) {
    const file = event.target.files?.[0];
    const iconFa = document.getElementById('editIconPreviewFa');
    const iconImg = document.getElementById('editIconPreviewImg');
    const hiddenValue = document.getElementById('editLinkIconValue');
    const selectEl = document.getElementById('editLinkIconSelect');

    if (!file) return;
    if (!file.type.startsWith('image/')) {
        showToast('Pilih file gambar ikon yang valid.', 'error');
        event.target.value = '';
        return;
    }

    try {
        showToast('Memproses gambar ikon...');
        const compressedDataUrl = await compressAvatarFile(file, 200, 200);
        
        if (editIconPreviewObjectUrl) URL.revokeObjectURL(editIconPreviewObjectUrl);
        editIconPreviewObjectUrl = URL.createObjectURL(file);

        iconFa.classList.add('hidden');
        iconImg.src = compressedDataUrl;
        iconImg.classList.remove('hidden');
        hiddenValue.value = compressedDataUrl;
        showToast('Ikon lokal berhasil dimuat!');
    } catch (err) {
        console.error("Edit Icon compression error:", err);
        showToast('Gagal memproses gambar ikon.', 'error');
        selectEl.value = "fa-solid fa-globe";
        window.handleEditIconSelectChange("fa-solid fa-globe");
    }
};

window.switchItemType = function(type) {
    const itemTypeInput = document.getElementById('itemType');
    const typeLinkBtn = document.getElementById('typeLinkBtn');
    const typeFolderBtn = document.getElementById('typeFolderBtn');
    const urlContainer = document.getElementById('urlInputContainer');
    const folderParentContainer = document.getElementById('folderParentContainer');
    const titleLabel = document.getElementById('titleLabel');
    const linkUrlInput = document.getElementById('linkUrl');
    const linkTitleInput = document.getElementById('linkTitle');
    const linkIconSelect = document.getElementById('linkIconSelect');
    const lockOption = document.getElementById('lockOptionContainer');

    itemTypeInput.value = type;
    if (lockOption) lockOption.classList.toggle('hidden', type === 'folder');

    if (type === 'folder') {
        typeFolderBtn.className = "py-1.5 rounded-md text-[11px] font-semibold transition-all bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm";
        typeLinkBtn.className = "py-1.5 rounded-md text-[11px] font-semibold transition-all text-slate-400 hover:text-white";
        
        urlContainer.classList.add('hidden');
        folderParentContainer.classList.add('hidden');
        linkUrlInput.removeAttribute('required');
        
        titleLabel.innerText = "Nama Folder / Kategori";
        linkTitleInput.placeholder = "Contoh: Koleksi Aplikasi";
        linkIconSelect.value = "fa-solid fa-folder";
        window.handleIconSelectChange("fa-solid fa-folder");
    } else {
        typeLinkBtn.className = "py-1.5 rounded-md text-[11px] font-semibold transition-all bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm";
        typeFolderBtn.className = "py-1.5 rounded-md text-[11px] font-semibold transition-all text-slate-400 hover:text-white";
        
        urlContainer.classList.remove('hidden');
        folderParentContainer.classList.remove('hidden');
        linkUrlInput.setAttribute('required', 'true');
        
        titleLabel.innerText = "Judul Link";
        linkTitleInput.placeholder = "Judul Link (contoh: TARTILIKU)";
        linkIconSelect.value = "fa-solid fa-globe";
        window.handleIconSelectChange("fa-solid fa-globe");
    }
};
