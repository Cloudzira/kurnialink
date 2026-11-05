/**
 * links-render.js
 * Menampilkan daftar link & folder ke layar, membuat kartu link/folder, buka-tutup folder, dan drag & drop urutan (SortableJS).
 */

import { doc, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { state } from './state.js';
import { escapeHtml, showToast } from './utils.js';
import { getLinkLightHue, registerLinkLightAnimation } from './link-light.js';

let sortableInstances = [];

export function renderLinks(linksToRender) {
    const container = document.getElementById('linksContainer');
    const emptyState = document.getElementById('emptyState');
    const searchInput = document.getElementById('searchInput');
    const isSearching = searchInput && searchInput.value.trim().length > 0;

    container.innerHTML = '';
    const visibleItems = linksToRender.filter(item => state.currentUser || item.visible !== false);

    if (visibleItems.length === 0) {
        emptyState.classList.remove('hidden');
        const emptyText = document.getElementById('emptyStateText');
        if (emptyText) {
            emptyText.innerText = isSearching 
                ? 'Tidak ada link atau folder yang cocok dengan pencarian.' 
                : 'Belum ada link atau folder yang tersedia.';
        }
        return;
    } else {
        emptyState.classList.add('hidden');
    }

    const rootItems = visibleItems.filter(item => !item.parentId);
    rootItems.forEach(item => {
        if (item.isFolder) {
            container.appendChild(createFolderElement(item, visibleItems));
        } else {
            container.appendChild(createSingleLinkElement(item));
        }
    });

    initSortable();
}

function renderIconMarkup(iconValue, defaultFa = 'fa-solid fa-globe', customClass = '') {
    if (iconValue && iconValue.startsWith('data:image/')) {
        return `<img src="${iconValue}" alt="Icon" class="w-full h-full object-cover rounded-md ${customClass}">`;
    }
    return `<i class="${escapeHtml(iconValue || defaultFa)} ${customClass}"></i>`;
}

function createFolderElement(folder, allVisibleItems) {
    const folderWrapper = document.createElement('div');
    const isHidden = folder.visible === false;
    const isOpen = state.openFolders.has(folder.id);
    const childLinks = allVisibleItems.filter(item => item.parentId === folder.id);

    folderWrapper.setAttribute('data-id', folder.id);
    folderWrapper.className = `glass-folder rounded-xl overflow-hidden transition-all duration-300 ${isHidden ? 'opacity-50 border-dashed border-slate-600' : ''}`;

    folderWrapper.innerHTML = `
        <div class="folder-header p-2.5 sm:p-3 flex items-center justify-between cursor-pointer group select-none hover:bg-white/5 transition-colors" onclick="window.toggleFolderOpen('${folder.id}', event)">
            <div class="flex items-center gap-2.5 flex-1 min-w-0 pr-1.5">
                ${state.currentUser ? `
                    <div class="drag-handle text-slate-500 hover:text-neon-cyan px-0.5 py-1 cursor-grab flex items-center" onclick="event.stopPropagation()" title="Tarik untuk merubah urutan">
                        <i class="fa-solid fa-grip-vertical text-xs"></i>
                    </div>
                ` : ''}

                <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-lg glass-panel flex items-center justify-center text-neon-purple text-sm flex-shrink-0 group-hover:scale-105 transition-transform overflow-hidden">
                    ${renderIconMarkup(folder.icon, 'fa-solid fa-folder')}
                </div>

                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1.5">
                        <h3 class="font-bold text-xs sm:text-[13px] text-white group-hover:text-neon-cyan transition-colors truncate">
                            ${escapeHtml(folder.title)}
                        </h3>
                        <span class="text-[9px] bg-purple-950/60 text-purple-300 px-1.5 py-0.2 rounded border border-purple-500/30">
                            ${childLinks.length} Item
                        </span>
                        ${isHidden ? '<span class="text-[8px] bg-slate-800 text-slate-400 px-1 py-0.2 rounded border border-slate-700">Hidden</span>' : ''}
                    </div>
                    ${folder.desc ? `<p class="text-[10px] sm:text-[11px] text-slate-400 truncate mt-0.5 font-light">${escapeHtml(folder.desc)}</p>` : ''}
                </div>
            </div>

            <div class="flex items-center gap-2 flex-shrink-0" onclick="event.stopPropagation()">
                ${state.currentUser ? `
                    <div class="flex items-center gap-0.5 border-r border-white/10 pr-1.5 mr-1">
                        <button onclick="window.toggleLinkVisibility('${folder.id}',${!isHidden})" class="p-1 text-slate-400 hover:text-neon-cyan transition-colors text-[11px]" title="${isHidden ? 'Tampilkan' : 'Sembunyikan'}">
                            <i class="fa-solid ${isHidden ? 'fa-eye-slash' : 'fa-eye'}"></i>
                        </button>
                        <button onclick="window.openEditModal('${folder.id}')" class="p-1 text-slate-400 hover:text-neon-purple transition-colors text-[11px]" title="Edit Folder">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button onclick="window.deleteLink('${folder.id}')" class="p-1 text-slate-400 hover:text-neon-pink transition-colors text-[11px]" title="Hapus Folder">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                ` : ''}

                <div class="w-6 h-6 flex items-center justify-center text-slate-400 group-hover:text-neon-cyan">
                    <i class="fa-solid fa-chevron-down text-xs chevron-icon ${isOpen ? 'rotate-180' : ''}"></i>
                </div>
            </div>
        </div>

        <div id="folderContent-${folder.id}" class="folder-content ${isOpen ? 'open' : ''} border-t border-cyan-500/10 bg-black/30 pt-2 pb-2.5 pr-2 pl-5 sm:pl-6 space-y-2 relative">
            <div class="absolute left-3.5 top-2 bottom-3.5 w-0.5 bg-gradient-to-b from-cyan-500/40 via-purple-500/20 to-transparent rounded-full pointer-events-none"></div>

            ${childLinks.length === 0 ? `
                <p class="text-[10px] text-slate-500 italic text-center py-2">Folder ini masih kosong.</p>
            ` : ''}
        </div>
    `;

    const folderContentDiv = folderWrapper.querySelector(`#folderContent-${folder.id}`);
    childLinks.forEach(child => {
        folderContentDiv.appendChild(createSingleLinkElement(child, true));
    });

    return folderWrapper;
}

function createSingleLinkElement(link, isInsideFolder = false) {
    const card = document.createElement('div');
    const isHidden = link.visible === false;
    const isLocked = link.locked === true;
    const lightHue = getLinkLightHue(link.id);
    const highlightHue = (lightHue + 48) % 360;
    
    card.setAttribute('data-id', link.id);
    card.className = `glass-card rounded-xl p-2 sm:p-2.5 flex items-center justify-between group relative overflow-hidden ${isInsideFolder ? 'bg-slate-900/60 border-slate-700/60 shadow-inner' : ''} ${isHidden ? 'opacity-50 border-dashed border-slate-600' : ''} ${isLocked ? 'link-locked' : ''}`;
    card.style.setProperty('--link-light-color', `hsl(${lightHue} 92% 64%)`);
    card.style.setProperty('--link-light-highlight', `hsl(${highlightHue} 96% 68%)`);
    card.style.setProperty('--link-light-glow', `hsla(${lightHue} 92% 64% / 0.16)`);
    
    // Daftarkan ke animasi JavaScript agar berjalan sempurna di laptop & HP
    registerLinkLightAnimation(card);
    
    card.innerHTML = `
        <div class="flex items-center gap-2 flex-1 min-w-0 pr-1">
            ${state.currentUser ? `
                <div class="drag-handle text-slate-500 hover:text-neon-cyan px-0.5 py-1 cursor-grab flex items-center" title="Tarik untuk mengubah urutan">
                    <i class="fa-solid fa-grip-vertical text-xs"></i>
                </div>
            ` : ''}

            <a href="${isLocked ? '#' : escapeHtml(link.url)}" ${isLocked ? '' : 'target="_blank" rel="noopener"'} onclick="window.handleLinkClick('${link.id}', event)" class="flex items-center gap-2 flex-1 min-w-0">
                <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg glass-panel flex items-center justify-center text-neon-cyan text-xs flex-shrink-0 group-hover:scale-105 transition-transform overflow-hidden">
                    ${renderIconMarkup(link.icon, 'fa-solid fa-globe')}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1.5">
                        <h3 class="font-semibold text-xs text-slate-100 group-hover:text-neon-cyan transition-colors truncate">
                            ${escapeHtml(link.title)}
                        </h3>
                        ${isHidden ? '<span class="text-[8px] bg-slate-800 text-slate-400 px-1 py-0.2 rounded border border-slate-700">Hidden</span>' : ''}
                        ${isLocked ? '<span class="text-[8px] bg-amber-950/60 text-amber-300 px-1 py-0.2 rounded border border-amber-500/30 flex-shrink-0"><i class="fa-solid fa-lock mr-0.5"></i>Dikunci</span>' : ''}
                    </div>
                    ${link.desc ? `<p class="text-[10px] text-slate-400 truncate mt-0.5 font-light">${escapeHtml(link.desc)}</p>` : ''}
                </div>
            </a>
        </div>

        <div class="flex items-center gap-1.5 flex-shrink-0">
            <span class="text-[9px] text-slate-400 glass-panel px-1.5 py-0.5 rounded-full flex items-center gap-1 font-mono" title="Jumlah Klik">
                <i class="fa-solid fa-arrow-pointer text-[8px] text-neon-cyan"></i> ${link.clicks || 0}
            </span>

            ${state.currentUser ? `
                <div class="flex items-center gap-0.5 border-l border-white/10 pl-1.5">
                    <button onclick="window.toggleLinkLock('${link.id}',${!isLocked})" class="p-1 ${isLocked ? 'text-amber-400' : 'text-slate-400 hover:text-amber-300'} transition-colors text-[11px]" title="${isLocked ? 'Buka Kunci' : 'Kunci Link'}">
                        <i class="fa-solid ${isLocked ? 'fa-lock' : 'fa-lock-open'}"></i>
                    </button>
                    <button onclick="window.toggleLinkVisibility('${link.id}',${!isHidden})" class="p-1 text-slate-400 hover:text-neon-cyan transition-colors text-[11px]" title="${isHidden ? 'Tampilkan' : 'Sembunyikan'}">
                        <i class="fa-solid ${isHidden ? 'fa-eye-slash' : 'fa-eye'}"></i>
                    </button>
                    <button onclick="window.openEditModal('${link.id}')" class="p-1 text-slate-400 hover:text-neon-purple transition-colors text-[11px]" title="Edit Link">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button onclick="window.deleteLink('${link.id}')" class="p-1 text-slate-400 hover:text-neon-pink transition-colors text-[11px]" title="Hapus Link">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            ` : ''}
        </div>
    `;

    return card;
}

window.toggleFolderOpen = function(folderId, event) {
    const folderContentDiv = document.getElementById(`folderContent-${folderId}`);
    if (!folderContentDiv) return;

    const chevron = event.currentTarget.querySelector('.chevron-icon');
    if (state.openFolders.has(folderId)) {
        state.openFolders.delete(folderId);
        folderContentDiv.classList.remove('open');
        if (chevron) chevron.classList.remove('rotate-180');
    } else {
        state.openFolders.add(folderId);
        folderContentDiv.classList.add('open');
        if (chevron) chevron.classList.add('rotate-180');
    }
};

function initSortable() {
    sortableInstances.forEach(inst => inst.destroy());
    sortableInstances = [];

    if (!state.currentUser || typeof Sortable === 'undefined') return;

    const rootContainer = document.getElementById('linksContainer');
    if (rootContainer) {
        const rootInst = new Sortable(rootContainer, {
            animation: 200,
            handle: '.drag-handle',
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            onStart: () => { state.isDraggingActive = true; },
            onEnd: async () => {
                state.isDraggingActive = false;
                await updateOrderFromDOM(rootContainer);
            }
        });
        sortableInstances.push(rootInst);
    }

    document.querySelectorAll('.folder-content').forEach(folderEl => {
        const folderInst = new Sortable(folderEl, {
            animation: 200,
            handle: '.drag-handle',
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            onStart: () => { state.isDraggingActive = true; },
            onEnd: async () => {
                state.isDraggingActive = false;
                await updateOrderFromDOM(folderEl);
            }
        });
        sortableInstances.push(folderInst);
    });
}

async function updateOrderFromDOM(containerEl) {
    const orderedIds = Array.from(containerEl.children).map(el => el.getAttribute('data-id')).filter(Boolean);
    try {
        const batch = writeBatch(state.db);
        orderedIds.forEach((id, index) => {
            batch.update(doc(state.db, 'biolink', 'public', 'links', id), { order: index });
        });
        await batch.commit();
        showToast('Urutan baru tersimpan!');
    } catch (err) {
        showToast('Gagal menyimpan urutan', 'error');
    }
}
