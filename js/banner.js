/**
 * banner.js
 * Banner slider di bawah ikon medsos: langganan data banner, render slide, geser (swipe), tombol, titik, dan putar otomatis.
 */

import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { state } from './state.js';
import { bEl, escapeHtml } from './utils.js';
import { registerLinkLightAnimation } from './link-light.js';

// ================= BANNER SLIDER =================
export const BANNER_MAX = 5;
export const BANNER_W = 960;
export const BANNER_H = 216;
export const BANNER_MAX_IMAGE_LENGTH = 300000; // karakter data-URL per gambar (aman di bawah batas 1 MB dokumen Firestore)
export let bannerConfig = { enabled: true, interval: 5 };
export let bannerDocs = {};
let bannerSlides = [];
let bannerPos = 0;
let bannerElapsed = 0;
let bannerLastTs = 0;
let bannerAnimating = false;
let bannerAnimTimer = null;
let bannerRaf = null;
let bannerHover = false;
let bannerDragging = false;
let bannerDrag = null;
let bannerSuppressClick = false;
let bannerUnsubs = [];
let bannerRenderTimer = null;

function normalizeBannerConfig(d) {
    const iv = (d && d.interval != null) ? Number(d.interval) : NaN;
    return {
        enabled: d ? d.enabled !== false : true,
        interval: Number.isFinite(iv) ? Math.min(15, Math.max(2, iv)) : 5
    };
}

export function subscribeToBanner() {
    bannerUnsubs.forEach(fn => { try { fn(); } catch (e) {} });
    bannerUnsubs = [];

    const watch = (id, apply) => {
        const ref = doc(state.db, 'biolink', 'public', 'profile', id);
        bannerUnsubs.push(onSnapshot(ref, (snap) => {
            apply(snap.exists() ? snap.data() : null);
            scheduleBannerRender();
        }, (err) => {
            console.warn('Banner snapshot error (' + id + '):', err && err.code ? err.code : err);
        }));
    };

    watch('banner_config', (d) => { bannerConfig = normalizeBannerConfig(d); });
    for (let i = 1; i <= BANNER_MAX; i++) {
        watch('banner_' + i, (d) => { bannerDocs[i] = d; });
    }
}

function scheduleBannerRender() {
    clearTimeout(bannerRenderTimer);
    bannerRenderTimer = setTimeout(renderBanner, 60);
}

export function getSafeBannerImage(v) {
    if (!v) return '';
    if (/^data:image\/(jpeg|png|webp|gif|avif);base64,/i.test(v)) return v;
    try {
        const u = new URL(v);
        return (u.protocol === 'https:' || u.protocol === 'http:') ? u.href : '';
    } catch (e) {
        return '';
    }
}

function getSafeBannerHref(v) {
    if (!v) return '';
    try {
        const u = new URL(v, window.location.href);
        return ['http:', 'https:', 'mailto:', 'tel:'].includes(u.protocol) ? u.href : '';
    } catch (e) {
        return '';
    }
}

// Kembalikan '' (kosong), string link valid, atau null (tidak valid)
export function normalizeBannerLink(v) {
    v = (v || '').trim();
    if (!v) return '';
    if (/^(https?:|mailto:|tel:)/i.test(v)) return v;
    if (/^[a-z][a-z0-9+.\-]*:/i.test(v)) return null;
    return 'https://' + v.replace(/^\/+/, '');
}

function bannerSlideHtml(slide, isClone) {
    const href = getSafeBannerHref(slide.link);
    const img = getSafeBannerImage(slide.image);
    const hasText = slide.title || slide.text;
    const tag = href ? 'a' : 'div';
    const openNewTab = slide.newTab !== false && /^https?:/i.test(href);
    const attrs = href
        ? `href="${escapeHtml(href)}"${openNewTab ? ' target="_blank" rel="noopener noreferrer"' : ''}`
        : '';
    const cloneAttrs = isClone ? ' aria-hidden="true" tabindex="-1"' : '';
    const dataAttrs = href ? ` data-href="${escapeHtml(href)}" data-newtab="${openNewTab ? '1' : '0'}"` : '';
    const ctaText = (slide.cta && String(slide.cta).trim()) || 'Buka Link';
    return `<${tag} class="banner-slide${href ? ' is-link' : ''}" ${attrs}${dataAttrs}${cloneAttrs} draggable="false">
        ${img
            ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(slide.title || 'Banner')}" class="banner-img" draggable="false">`
            : '<div class="banner-bg"></div>'}
        <div class="banner-shade"></div>
        ${href ? `<span class="banner-cta"><span>${escapeHtml(ctaText)}</span><i class="fa-solid fa-arrow-right"></i></span>` : ''}
        ${hasText ? `<div class="banner-caption${href ? ' has-cta' : ''}">
            ${slide.title ? `<div class="banner-title">${escapeHtml(slide.title)}</div>` : ''}
            ${slide.text ? `<div class="banner-text">${escapeHtml(slide.text)}</div>` : ''}
        </div>` : ''}
    </${tag}>`;
}

export function renderBanner() {
    const section = bEl('bannerSection');
    if (!section) return;
    const frame = bEl('bannerFrame');
    const track = bEl('bannerTrack');
    const dotsEl = bEl('bannerDots');
    const empty = bEl('bannerEmpty');

    const prevCount = bannerSlides.length;
    const prevIdx = prevCount ? bannerPos % prevCount : 0;

    const active = [];
    for (let i = 1; i <= BANNER_MAX; i++) {
        const s = bannerDocs[i];
        if (s && s.active !== false && (s.image || s.title || s.text)) active.push(s);
    }
    const hasContent = active.length > 0;
    bannerSlides = bannerConfig.enabled ? active : [];
    const n = bannerSlides.length;

    if (n === 0) {
        stopBannerLoop();
        frame.classList.add('hidden');
        dotsEl.style.display = 'none';
        track.innerHTML = '';
        if (state.currentUser) {
            section.classList.remove('hidden');
            empty.classList.remove('hidden');
            bEl('bannerEmptyText').innerText = (!bannerConfig.enabled && hasContent)
                ? 'Banner sedang dinonaktifkan, jadi tidak tampil untuk pengunjung.'
                : 'Belum ada slide banner yang aktif. Tambahkan sampai 5 slide dengan gambar, teks, dan link.';
        } else {
            section.classList.add('hidden');
            empty.classList.add('hidden');
        }
        return;
    }

    section.classList.remove('hidden');
    empty.classList.add('hidden');
    frame.classList.remove('hidden');

    track.innerHTML = bannerSlides.map(s => bannerSlideHtml(s, false)).join('')
        + (n > 1 ? bannerSlideHtml(bannerSlides[0], true) : '');

    clearTimeout(bannerAnimTimer);
    bannerAnimating = false;
    bannerElapsed = 0;
    bannerPos = Math.min(prevIdx, n - 1);
    setBannerTrack(bannerPos, false);

    ['bannerPrev', 'bannerNext'].forEach(id => bEl(id).classList.toggle('is-on', n > 1));

    if (n > 1) {
        dotsEl.innerHTML = bannerSlides.map((_, i) =>
            `<button type="button" class="banner-dot" onclick="bannerGoTo(${i})" aria-label="Slide ${i + 1}"><span></span></button>`
        ).join('');
        dotsEl.style.display = 'flex';
        updateBannerDots();
        startBannerLoop();
    } else {
        dotsEl.innerHTML = '';
        dotsEl.style.display = 'none';
        stopBannerLoop();
    }
    bEl('bannerProgressBar').style.transform = 'scaleX(0)';
}

function setBannerTrack(pos, animate, dragPx = 0) {
    const track = bEl('bannerTrack');
    if (!track) return;
    track.style.transition = animate ? '' : 'none';
    track.style.transform = dragPx
        ? `translate3d(calc(${-pos * 100}% + ${dragPx}px), 0, 0)`
        : `translate3d(${-pos * 100}%, 0, 0)`;
}

function updateBannerDots() {
    const n = bannerSlides.length;
    if (n < 2) return;
    const idx = bannerPos % n;
    bEl('bannerDots').querySelectorAll('.banner-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
}

function startBannerTransition(pos) {
    bannerPos = pos;
    bannerAnimating = true;
    bannerElapsed = 0;
    setBannerTrack(pos, true);
    updateBannerDots();
    clearTimeout(bannerAnimTimer);
    bannerAnimTimer = setTimeout(finishBannerTransition, 900);
}

function finishBannerTransition() {
    clearTimeout(bannerAnimTimer);
    bannerAnimating = false;
    const n = bannerSlides.length;
    if (n > 1 && bannerPos >= n) {
        bannerPos = 0;
        setBannerTrack(0, false);
        updateBannerDots();
    }
}

window.bannerStep = function(dir) {
    const n = bannerSlides.length;
    if (n < 2 || bannerAnimating) return;
    if (dir > 0) {
        startBannerTransition(bannerPos + 1);
    } else {
        if (bannerPos === 0) {
            // lompat tak terlihat ke salinan slide pertama, lalu geser mundur
            bannerPos = n;
            setBannerTrack(n, false);
            void bEl('bannerTrack').offsetWidth;
        }
        startBannerTransition(bannerPos - 1);
    }
};

window.bannerGoTo = function(i) {
    const n = bannerSlides.length;
    if (n < 2 || bannerAnimating || i === bannerPos % n) return;
    startBannerTransition(i);
};

let bannerInView = true;

function bannerTick(ts) {
    bannerRaf = requestAnimationFrame(bannerTick);
    if (!bannerLastTs) bannerLastTs = ts;
    let dt = ts - bannerLastTs;
    bannerLastTs = ts;
    if (dt > 250) dt = 0; // setelah tab tersembunyi, jangan loncat

    if (bannerSlides.length < 2 || !bannerInView) return;
    if (!(bannerHover || bannerDragging || bannerAnimating)) bannerElapsed += dt;

    const interval = bannerConfig.interval * 1000;
    bEl('bannerProgressBar').style.transform = `scaleX(${Math.min(1, bannerElapsed / interval)})`;
    if (bannerElapsed >= interval) window.bannerStep(1);
}

function startBannerLoop() {
    if (bannerRaf !== null) return;
    bannerLastTs = 0;
    bannerRaf = requestAnimationFrame(bannerTick);
}

function stopBannerLoop() {
    if (bannerRaf !== null) cancelAnimationFrame(bannerRaf);
    bannerRaf = null;
}

export function initBanner() {
    const viewport = bEl('bannerViewport');
    const track = bEl('bannerTrack');
    const frame = bEl('bannerFrame');
    if (!viewport || !track || !frame) return;

    // Cahaya neon yang berputar di bingkai (mesin animasi yang sama dengan kartu link)
    registerLinkLightAnimation(frame);

    // Hemat tenaga: geser otomatis berhenti saat banner tidak terlihat di layar
    if ('IntersectionObserver' in window) {
        new IntersectionObserver((entries) => {
            bannerInView = entries[entries.length - 1].isIntersecting;
        }).observe(viewport);
    }

    track.addEventListener('transitionend', (e) => {
        if (e.target === track && e.propertyName === 'transform') finishBannerTransition();
    });

    viewport.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') bannerHover = true; });
    viewport.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') bannerHover = false; });

    viewport.addEventListener('pointerdown', (e) => {
        if (bannerSlides.length < 2 || bannerAnimating) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        bannerDrag = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, axis: null };
        bannerDragging = true;
    });

    viewport.addEventListener('pointermove', (e) => {
        const d = bannerDrag;
        if (!d || e.pointerId !== d.id) return;
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        if (!d.axis) {
            if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
            d.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
            if (d.axis === 'x') { try { viewport.setPointerCapture(e.pointerId); } catch (err) {} }
        }
        if (d.axis !== 'x') return;
        d.dx = dx;
        const n = bannerSlides.length;
        // tukar ke salinan slide agar tidak ada ruang kosong saat menarik di ujung
        if (dx > 0 && bannerPos === 0) bannerPos = n;
        else if (dx < 0 && bannerPos === n) bannerPos = 0;
        setBannerTrack(bannerPos, false, dx);
    });

    const endDrag = (e) => {
        const d = bannerDrag;
        if (!d || e.pointerId !== d.id) return;
        bannerDrag = null;
        bannerDragging = false;
        if (d.axis !== 'x') return;

        // hanya blokir klik jika benar-benar menggeser; ketukan dengan jari sedikit bergeser tetap membuka link
        if (Math.abs(d.dx) > 10) {
            bannerSuppressClick = true;
            setTimeout(() => { bannerSuppressClick = false; }, 80);
        }

        const threshold = Math.max(40, viewport.clientWidth * 0.18);
        if (e.type !== 'pointercancel' && d.dx <= -threshold) {
            window.bannerStep(1);
        } else if (e.type !== 'pointercancel' && d.dx >= threshold) {
            window.bannerStep(-1);
        } else {
            startBannerTransition(bannerPos); // kembali ke posisi semula
        }
    };
    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointercancel', endDrag);

    // Cegah klik link setelah menggeser
    viewport.addEventListener('click', (e) => {
        if (bannerSuppressClick) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, true);

    // Banner = tombol link: klik di bagian mana pun membuka link slide
    viewport.addEventListener('click', (e) => {
        if (e.defaultPrevented) return;
        if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
        const slideEl = e.target && e.target.closest ? e.target.closest('.banner-slide[data-href]') : null;
        if (!slideEl) return;
        const href = slideEl.getAttribute('data-href');
        if (!href) return;
        e.preventDefault();
        if (slideEl.getAttribute('data-newtab') === '1') {
            const w = window.open(href, '_blank');
            if (w) { try { w.opener = null; } catch (err) {} }
            else window.location.href = href; // popup diblokir -> buka di halaman ini
        } else {
            window.location.href = href;
        }
    });
}
