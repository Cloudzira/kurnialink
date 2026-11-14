/**
 * theme-insta.js
 * Semua yang khusus tema "Instagram":
 *  - kartu link bergaya posting feed (2 kolom) dan folder bergaya koleksi
 *  - statistik profil (jumlah link, total klik, jumlah folder)
 *  - baris "sorotan" (story highlight) dari folder
 * Seluruh fitur asli tetap ada: hitung klik, kunci link, sembunyikan, edit, hapus, drag & drop urutan, buka-tutup folder.
 */

import { state } from './state.js';
import { escapeHtml, safeUrl } from './utils.js';
import { getLinkLightHue } from './link-light.js';

const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const numberFmt = new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 });

function isImageIcon(v) {
    return typeof v === 'string' && v.startsWith('data:image/');
}

function iconMarkup(iconValue, fallback) {
    if (isImageIcon(iconValue)) {
        return `<img src="${escapeHtml(iconValue)}" alt="" class="ig-img" loading="lazy" decoding="async">`;
    }
    return `<i class="${escapeHtml(iconValue || fallback)}" aria-hidden="true"></i>`;
}

function hostOf(url) {
    try {
        const u = new URL(safeUrl(url));
        return u.hostname.replace(/^www\./, '');
    } catch (e) { return ''; }
}

// Tombol admin (urutan, kunci, tampil/sembunyi, edit, hapus). Hanya muncul saat admin login.
function adminBar(item, { isFolder }) {
    if (!state.currentUser) return '';
    const isHidden = item.visible === false;
    const isLocked = item.locked === true;
    const id = item.id;
    return `
        <div class="ig-admin" onclick="event.stopPropagation()">
            <span class="drag-handle ig-abtn" title="Tarik untuk mengubah urutan"><i class="fa-solid fa-grip-vertical"></i></span>
            ${isFolder ? '' : `
            <button type="button" class="ig-abtn ${isLocked ? 'is-lock' : ''}" onclick="window.toggleLinkLock('${id}',${!isLocked})" title="${isLocked ? 'Buka Kunci' : 'Kunci Link'}" aria-label="${isLocked ? 'Buka Kunci' : 'Kunci Link'}">
                <i class="fa-solid ${isLocked ? 'fa-lock' : 'fa-lock-open'}"></i>
            </button>`}
            <button type="button" class="ig-abtn" onclick="window.toggleLinkVisibility('${id}',${!isHidden})" title="${isHidden ? 'Tampilkan' : 'Sembunyikan'}" aria-label="${isHidden ? 'Tampilkan' : 'Sembunyikan'}">
                <i class="fa-solid ${isHidden ? 'fa-eye-slash' : 'fa-eye'}"></i>
            </button>
            <button type="button" class="ig-abtn ig-edit" onclick="window.openEditModal('${id}')" title="${isFolder ? 'Edit Folder' : 'Edit Link'}" aria-label="${isFolder ? 'Edit Folder' : 'Edit Link'}">
                <i class="fa-solid fa-pen"></i>
            </button>
            <button type="button" class="ig-abtn ig-del" onclick="window.deleteLink('${id}')" title="${isFolder ? 'Hapus Folder' : 'Hapus Link'}" aria-label="${isFolder ? 'Hapus Folder' : 'Hapus Link'}">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        </div>`;
}

/* ---------- Kartu link = posting feed ---------- */
export function createInstaPost(link, { wide = false } = {}) {
    const card = document.createElement('article');
    const isHidden = link.visible === false;
    const isLocked = link.locked === true;
    const hue = Math.round(getLinkLightHue(link.id));
    const host = isLocked ? '' : hostOf(link.url);
    const href = isLocked ? '#' : escapeHtml(safeUrl(link.url));
    const target = isLocked ? '' : 'target="_blank" rel="noopener"';
    const click = `onclick="window.handleLinkClick('${link.id}', event)"`;
    const title = escapeHtml(link.title);

    card.setAttribute('data-id', link.id);
    card.className = 'ig-post' + (wide ? ' ig-wide' : '') + (isHidden ? ' is-hidden' : '') + (isLocked ? ' is-locked' : '');
    card.style.setProperty('--h', hue);

    card.innerHTML = `
        <a href="${href}" ${target} ${click} class="ig-media-link" aria-label="${title}">
            <div class="ig-media">
                <span class="ig-glyph">${iconMarkup(link.icon, 'fa-solid fa-globe')}</span>
                <div class="ig-badges">
                    ${isLocked ? '<span class="ig-chip ig-chip-lock"><i class="fa-solid fa-lock"></i> Dikunci</span>' : ''}
                    ${isHidden ? '<span class="ig-chip">Hidden</span>' : ''}
                </div>
                <span class="ig-go" aria-hidden="true"><i class="fa-solid fa-arrow-up-right-from-square"></i></span>
            </div>
        </a>
        <div class="ig-body">
            <div class="ig-row">
                <span class="ig-clicks" title="Jumlah Klik"><i class="fa-solid fa-arrow-pointer"></i><span data-click-count="${link.id}">${link.clicks || 0}</span></span>
                ${host ? `<span class="ig-host" title="${escapeHtml(host)}">${escapeHtml(host)}</span>` : ''}
            </div>
            <a href="${href}" ${target} ${click} class="ig-caption">
                <h3 class="ig-title">${title}</h3>
                ${link.desc ? `<p class="ig-desc">${escapeHtml(link.desc)}</p>` : ''}
            </a>
        </div>
        ${adminBar(link, { isFolder: false })}
    `;
    return card;
}

/* ---------- Folder = koleksi (lebar penuh), isinya grid 2 kolom ---------- */
export function createInstaFolder(folder, allVisibleItems) {
    const wrap = document.createElement('section');
    const isHidden = folder.visible === false;
    const isOpen = state.openFolders.has(folder.id);
    const children = allVisibleItems.filter(i => i.parentId === folder.id);

    wrap.setAttribute('data-id', folder.id);
    wrap.className = 'ig-folder' + (isHidden ? ' is-hidden' : '');

    wrap.innerHTML = `
        <div class="folder-header ig-folder-head" onclick="window.toggleFolderOpen('${folder.id}', event)" role="button" tabindex="0" aria-expanded="${isOpen}">
            <span class="ig-ring"><span class="ig-ring-in">${iconMarkup(folder.icon, 'fa-solid fa-folder')}</span></span>
            <div class="ig-folder-info">
                <div class="ig-folder-top">
                    <h3 class="ig-folder-title">${escapeHtml(folder.title)}</h3>
                    <span class="ig-count">${children.length} Item</span>
                    ${isHidden ? '<span class="ig-chip">Hidden</span>' : ''}
                </div>
                ${folder.desc ? `<p class="ig-folder-desc">${escapeHtml(folder.desc)}</p>` : ''}
            </div>
            <i class="fa-solid fa-chevron-down chevron-icon ig-chev ${isOpen ? 'rotate-180' : ''}" aria-hidden="true"></i>
        </div>
        ${adminBar(folder, { isFolder: true })}
        <div id="folderContent-${folder.id}" class="folder-content ig-grid ${isOpen ? 'open' : ''}">
            ${children.length === 0 ? '<p class="ig-empty">Folder ini masih kosong.</p>' : ''}
        </div>
    `;

    const content = wrap.querySelector('.folder-content');
    markWideRuns(children).forEach(({ item, wide }) => {
        if (item.isFolder) return;
        content.appendChild(createInstaPost(item, { wide }));
    });

    // Buka-tutup folder juga bisa dengan keyboard
    const head = wrap.querySelector('.ig-folder-head');
    head.addEventListener('keydown', (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && e.target === head) {
            e.preventDefault();
            head.click();
        }
    });
    return wrap;
}

/**
 * Link terakhir yang "sendirian" di baris sebelum folder (lebar penuh) dibuat melebar
 * supaya tidak ada lubang kosong di grid. Link terakhir di paling bawah tetap setengah lebar.
 */
export function markWideRuns(items) {
    const out = items.map(item => ({ item, wide: false }));
    let run = 0;
    for (let i = 0; i < out.length; i++) {
        if (out[i].item.isFolder) {
            if (run % 2 === 1) out[i - 1].wide = true;
            run = 0;
        } else {
            run++;
        }
    }
    return out;
}

/* ---------- Statistik & sorotan di header profil ---------- */
let lastHighlightSig = '';

function setText(id, text) {
    const el = document.getElementById(id);
    if (el && el.textContent !== text) el.textContent = text;
}

export function refreshInstaProfile() {
    if (document.documentElement.getAttribute('data-theme') !== 'insta') return;

    const items = state.linksList.filter(i => state.currentUser || i.visible !== false);
    const links = items.filter(i => !i.isFolder);
    const folders = items.filter(i => i.isFolder);
    const clicks = links.reduce((sum, i) => sum + (Number(i.clicks) || 0), 0);

    setText('igStatLinks', numberFmt.format(links.length));
    setText('igStatClicks', numberFmt.format(clicks));
    setText('igStatFolders', numberFmt.format(folders.length));

    renderHighlights(folders);
}

function renderHighlights(folders) {
    const box = document.getElementById('igHighlights');
    if (!box) return;
    const sig = folders.map(f => [f.id, f.title, f.icon && f.icon.length > 80 ? f.icon.length : f.icon, f.visible].join('|')).join('~');
    if (sig === lastHighlightSig && box.childElementCount === folders.length) return;
    lastHighlightSig = sig;

    box.innerHTML = folders.map(f => `
        <button type="button" role="listitem" class="ig-hl ${f.visible === false ? 'is-hidden' : ''}" onclick="window.igJumpFolder('${f.id}')" title="${escapeHtml(f.title)}">
            <span class="ig-ring"><span class="ig-ring-in">${iconMarkup(f.icon, 'fa-solid fa-folder')}</span></span>
            <span class="ig-hl-label">${escapeHtml(f.title)}</span>
        </button>
    `).join('');
}

// Ketuk sorotan: buka folder & geser layar ke sana
window.igJumpFolder = function (id) {
    const content = document.getElementById('folderContent-' + id);
    if (!content) return;
    const wrap = content.closest('[data-id]');
    state.openFolders.add(id);
    content.classList.add('open');
    if (wrap) {
        const chev = wrap.querySelector('.chevron-icon');
        if (chev) chev.classList.add('rotate-180');
        const head = wrap.querySelector('.folder-header');
        if (head) head.setAttribute('aria-expanded', 'true');
        wrap.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
    }
};
