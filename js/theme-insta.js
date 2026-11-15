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
import { getLinkLightHue, registerLinkLightAnimation } from './link-light.js';

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
    card.style.setProperty('--link-light-color', `hsl(${hue} 92% 64%)`);
    card.style.setProperty('--link-light-highlight', `hsl(${(hue + 48) % 360} 96% 68%)`);
    registerLinkLightAnimation(card);   // cahaya berputar di tepi kartu, sama seperti tema neon

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

    renderHighlights(folders, items);
    startHighlightTicker();
}

function renderHighlights(folders, items) {
    const box = document.getElementById('igHighlights');
    if (!box) return;

    // Lapisan ikon tiap sorotan: [ikon folder (posisi diam), ikon aplikasi 1, ikon aplikasi 2, ...]
    const data = folders.map(f => {
        const kids = items.filter(i => !i.isFolder && i.parentId === f.id).slice(0, 8);
        return { f, icons: [f.icon, ...kids.map(k => k.icon)], kids: kids.length };
    });

    const iconSig = (v) => (isImageIcon(v) ? 'img' + v.length : String(v || ''));
    const sig = data.map(d => [d.f.id, d.f.title, d.f.visible, d.icons.map(iconSig).join(',')].join('|')).join('~');
    if (sig === lastHighlightSig && box.childElementCount === folders.length) return;
    lastHighlightSig = sig;

    box.innerHTML = data.map(({ f, icons }) => `
        <button type="button" role="listitem" class="ig-hl ${f.visible === false ? 'is-hidden' : ''}" onclick="window.igJumpFolder('${f.id}')" title="${escapeHtml(f.title)}">
            <span class="ig-ring"><span class="ig-ring-in">${icons.map((ic, i) =>
                `<span class="ig-hl-ico${i === 0 ? ' is-active' : ''}">${iconMarkup(ic, i === 0 ? 'fa-solid fa-folder' : 'fa-solid fa-globe')}</span>`).join('')}</span></span>
            <span class="ig-hl-label">${escapeHtml(f.title)}</span>
        </button>
    `).join('');
}

/**
 * Animasi sorotan, SATU PER SATU:
 * giliran sorotan pertama -> ikon aplikasi di dalam foldernya tampil bergantian, lalu kembali ke ikon folder;
 * setelah itu baru giliran sorotan berikutnya. Sorotan lain tetap diam dengan ikon foldernya masing-masing.
 */
const STEP_MS = 1300;   // lama tiap ikon aplikasi tampil
const GAP_MS = 900;     // jeda sebelum giliran sorotan berikutnya
let hlRunning = false;
let hlIndex = 0;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function waitUntilVisible() {
    while (document.hidden || document.documentElement.getAttribute('data-theme') !== 'insta') {
        await sleep(600);
    }
}

function showLayer(hl, k) {
    const layers = hl.querySelectorAll('.ig-hl-ico');
    if (!layers[k]) return;
    layers.forEach((l, i) => {
        if (i === k) {
            l.classList.remove('is-leaving');
            l.classList.add('is-active');
        } else if (l.classList.contains('is-active')) {
            l.classList.remove('is-active');
            l.classList.add('is-leaving');
            setTimeout(() => l.classList.remove('is-leaving'), 700);
        }
    });
    hl.classList.add('is-pulse');
    setTimeout(() => hl.classList.remove('is-pulse'), 900);
}

async function highlightLoop() {
    while (true) {
        await waitUntilVisible();
        const list = document.querySelectorAll('#igHighlights .ig-hl');
        if (!list.length) { await sleep(1500); continue; }

        const hl = list[hlIndex % list.length];
        hlIndex++;
        const count = hl.querySelectorAll('.ig-hl-ico').length - 1;   // jumlah ikon aplikasi
        if (count < 1) { await sleep(150); continue; }                 // folder kosong: lewati

        hl.classList.add('is-playing');
        for (let k = 1; k <= count; k++) {
            await waitUntilVisible();
            if (!hl.isConnected) break;
            showLayer(hl, k);
            await sleep(STEP_MS);
        }
        if (hl.isConnected) {
            showLayer(hl, 0);              // kembali ke ikon folder
            await sleep(600);
            hl.classList.remove('is-playing');
        }
        await sleep(GAP_MS);
    }
}

function startHighlightTicker() {
    if (hlRunning || REDUCED) return;
    hlRunning = true;
    highlightLoop();
}

// Ketuk sorotan: buka folder, tunggu sampai isinya selesai mengembang, lalu geser layar tepat ke folder & isinya
let focusTimer = null;

window.igJumpFolder = function (id) {
    const content = document.getElementById('folderContent-' + id);
    if (!content) return;
    const wrap = content.closest('[data-id]');
    if (!wrap) return;

    const wasOpen = content.classList.contains('open');
    state.openFolders.add(id);
    content.classList.add('open');
    const chev = wrap.querySelector('.chevron-icon');
    if (chev) chev.classList.add('rotate-180');
    const head = wrap.querySelector('.folder-header');
    if (head) head.setAttribute('aria-expanded', 'true');

    let done = false;
    const go = () => {
        if (done) return;
        done = true;
        content.removeEventListener('transitionend', onEnd);
        // Posisi dihitung SETELAH folder terbuka penuh, jadi folder + isinya pas di layar
        wrap.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
        wrap.classList.add('is-focus');
        clearTimeout(focusTimer);
        focusTimer = setTimeout(() => wrap.classList.remove('is-focus'), 2200);
    };
    const onEnd = (e) => { if (e.target === content && e.propertyName === 'max-height') go(); };

    if (wasOpen || REDUCED) {
        go();
    } else {
        content.addEventListener('transitionend', onEnd);
        setTimeout(go, 700);   // cadangan bila transisi tidak terpicu
    }
};
