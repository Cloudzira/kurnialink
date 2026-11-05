/**
 * admin-ui.js
 * Mengatur tampilan mode admin (panel, badge, tombol gembok) dan data cadangan lokal bila Firebase tidak tersedia.
 */

import { state } from './state.js';
import { renderProfile } from './profile.js';
import { updateFolderDropdownOptions } from './admin-form.js';
import { renderBanner } from './banner.js';
import { markAppReady } from './splash.js';

export function loadFallbackLocalData() {
    markAppReady();
    document.getElementById('linksLoading').classList.add('hidden');
    document.getElementById('linksContainer').classList.remove('hidden');
    
    const savedLocal = localStorage.getItem('fallback_lynk_links');
    if (savedLocal) {
        state.linksList = JSON.parse(savedLocal);
    } else {
        state.linksList = [
            { id: 'f1', title: 'TARTILI', desc: 'Tartili Jilid 1 - 6', icon: 'fa-solid fa-layer-group', isFolder: true, clicks: 0, visible: true, order: 0 },
            { id: '1', title: 'TARTILIKU', url: 'https://example.com', desc: 'Tartili 1 - 6', icon: 'fa-solid fa-globe', clicks: 12, visible: true, parentId: 'f1', order: 0 }
        ];
    }
    updateFolderDropdownOptions();
    filterLinks();
    renderProfile(state.profileData);
}

export function updateAdminUI(user) {
    const adminBadge = document.getElementById('adminBadge');
    const adminPanel = document.getElementById('adminPanel');
    const adminStatusText = document.getElementById('adminStatusText');
    const adminStatusIcon = document.getElementById('adminStatusIcon');

    if (user) {
        adminBadge.classList.remove('hidden');
        adminPanel.classList.remove('hidden');
        adminStatusText.innerText = 'Admin Active';
        adminStatusIcon.className = 'fa-solid fa-user-check text-red-500 text-[12px]';
    } else {
        adminBadge.classList.add('hidden');
        adminPanel.classList.add('hidden');
        adminStatusText.innerText = 'Cloudzone';
        adminStatusIcon.className = 'fa-solid fa-lock text-red-500 text-[12px]';
    }
    filterLinks();
    renderBanner();
}
