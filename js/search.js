/**
 * search.js
 * Pencarian link (filter saat mengetik) dan tombol hapus pencarian.
 */

import { state } from './state.js';
import { renderLinks } from './links-render.js';

window.filterLinks = function() {
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearchBtn');
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

    if (clearBtn) {
        clearBtn.classList.toggle('hidden', query.length === 0);
    }

    if (!query) {
        renderLinks(state.linksList);
        return;
    }

    const matchedIds = new Set();
    state.linksList.filter(item => 
        (item.title && item.title.toLowerCase().includes(query)) || 
        (item.desc && item.desc.toLowerCase().includes(query))
    ).forEach(item => {
        matchedIds.add(item.id);
        if (item.parentId) {
            matchedIds.add(item.parentId);
            state.openFolders.add(item.parentId);
        }
        if (item.isFolder) {
            state.openFolders.add(item.id);
            state.linksList.forEach(child => {
                if (child.parentId === item.id) matchedIds.add(child.id);
            });
        }
    });

    renderLinks(state.linksList.filter(item => matchedIds.has(item.id)));
};

window.clearSearch = function() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
        filterLinks();
    }
};

// Dipakai kolom pencarian: tunggu sebentar setelah berhenti mengetik, baru menyaring (tidak berat di setiap ketukan)
let searchTimer = null;
window.filterLinksDebounced = function() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => window.filterLinks(), 140);
};
