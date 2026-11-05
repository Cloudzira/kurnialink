/**
 * banner-admin.js
 * Pengaturan banner untuk admin: editor 5 slide, unggah/kompres gambar, pratinjau, dan penyimpanan ke Firestore.
 */

import { doc, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { state } from './state.js';
import { bEl, showToast } from './utils.js';
import { BANNER_H, BANNER_MAX, BANNER_MAX_IMAGE_LENGTH, BANNER_W, bannerConfig, bannerDocs, getSafeBannerImage, normalizeBannerLink } from './banner.js';

let bannerDraft = {};

// ---------- Admin: pengaturan banner ----------
function compressBannerFile(file, maxLen = BANNER_MAX_IMAGE_LENGTH) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
        reader.onload = (ev) => {
            const img = new Image();
            img.onerror = () => reject(new Error('Gagal memuat gambar.'));
            img.onload = () => {
                const dstRatio = BANNER_W / BANNER_H;
                const srcRatio = img.naturalWidth / img.naturalHeight;
                let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
                if (srcRatio > dstRatio) {
                    sw = sh * dstRatio;
                    sx = (img.naturalWidth - sw) / 2;
                } else {
                    sh = sw / dstRatio;
                    sy = (img.naturalHeight - sh) / 2;
                }
                let w = BANNER_W, h = BANNER_H, q = 0.85, out = '';
                for (let i = 0; i < 6; i++) {
                    const canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) { reject(new Error('Canvas tidak didukung browser ini.')); return; }
                    ctx.fillStyle = '#06070b';
                    ctx.fillRect(0, 0, w, h);
                    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
                    out = canvas.toDataURL('image/jpeg', q);
                    if (out.length <= maxLen) break;
                    q = Math.max(0.5, q - 0.1);
                    if (i >= 2) { w = Math.round(w * 0.85); h = Math.round(h * 0.85); }
                }
                resolve(out);
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function buildBannerEditor() {
    let html = '';
    for (let i = 1; i <= BANNER_MAX; i++) {
        html += `
        <details class="banner-editor-item rounded-xl border border-white/10 bg-slate-900/40" ${i === 1 ? 'open' : ''}>
            <summary class="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none">
                <span class="w-5 h-5 rounded-md bg-gradient-to-br from-cyan-500 to-purple-600 text-[10px] font-bold flex items-center justify-center text-white flex-shrink-0">${i}</span>
                <span id="bnSummary${i}" class="flex-1 min-w-0 truncate text-[11px] text-slate-200">Slide ${i}</span>
                <span id="bnDot${i}" class="w-1.5 h-1.5 rounded-full bg-slate-600 flex-shrink-0"></span>
                <i class="fa-solid fa-chevron-down text-[9px] text-slate-500 bn-chev transition-transform"></i>
            </summary>
            <div class="px-3 pb-3 pt-1 space-y-2.5">
                <div class="flex items-center gap-2">
                    <input type="checkbox" id="bnActive${i}" onchange="bannerRefreshSummary(${i})" class="rounded accent-cyan-400">
                    <label for="bnActive${i}" class="text-[11px] text-slate-300">Tampilkan slide ini</label>
                </div>

                <div class="flex items-center gap-2.5">
                    <div class="w-28 flex-shrink-0 rounded-lg overflow-hidden border border-white/10 bg-slate-950 relative" style="aspect-ratio:40/9">
                        <img id="bnPreview${i}" alt="Pratinjau slide ${i}" class="w-full h-full object-cover hidden">
                        <span id="bnPreviewEmpty${i}" class="absolute inset-0 flex items-center justify-center text-[9px] text-slate-500">Tanpa gambar</span>
                    </div>
                    <div class="flex-1 min-w-0 space-y-1.5">
                        <input type="file" id="bnFile${i}" accept="image/*" onchange="bannerFileSelected(${i}, event)" class="w-full glass-input text-[10px] p-1.5 rounded-lg file:mr-2 file:px-2 file:py-1 file:rounded-md file:border-0 file:bg-cyan-500/20 file:text-cyan-200">
                        <button type="button" onclick="bannerClearImage(${i})" class="text-[10px] text-red-300 hover:text-red-200"><i class="fa-solid fa-trash-can mr-1"></i>Hapus gambar</button>
                    </div>
                </div>

                <div>
                    <label class="text-[9px] uppercase text-slate-400 mb-0.5 block font-semibold">Atau URL Gambar</label>
                    <input type="url" id="bnImageUrl${i}" oninput="bannerImageUrlInput(${i}, this.value)" placeholder="https://..." class="w-full glass-input text-xs p-2 rounded-lg">
                </div>
                <div>
                    <label class="text-[9px] uppercase text-slate-400 mb-0.5 block font-semibold">Judul</label>
                    <input type="text" id="bnTitle${i}" maxlength="60" oninput="bannerRefreshSummary(${i})" placeholder="Judul slide" class="w-full glass-input text-xs p-2 rounded-lg">
                </div>
                <div>
                    <label class="text-[9px] uppercase text-slate-400 mb-0.5 block font-semibold">Teks</label>
                    <textarea id="bnText${i}" rows="2" maxlength="140" placeholder="Keterangan singkat" class="w-full glass-input text-xs p-2 rounded-lg resize-none"></textarea>
                </div>
                <div>
                    <label class="text-[9px] uppercase text-slate-400 mb-0.5 block font-semibold">Link Tujuan (saat diklik)</label>
                    <input type="text" id="bnLink${i}" placeholder="https://..." class="w-full glass-input text-xs p-2 rounded-lg">
                    <label class="text-[9px] uppercase text-slate-400 mt-2 mb-0.5 block font-semibold">Teks Tombol (opsional)</label>
                    <input type="text" id="bnCta${i}" maxlength="18" placeholder="Buka Link" class="w-full glass-input text-xs p-2 rounded-lg">
                    <div class="flex items-center gap-2 mt-1.5">
                        <input type="checkbox" id="bnNewTab${i}" class="rounded accent-cyan-400">
                        <label for="bnNewTab${i}" class="text-[10px] text-slate-400">Buka di tab baru (hilangkan centang untuk membuka di halaman yang sama)</label>
                    </div>
                </div>
            </div>
        </details>`;
    }
    bEl('bannerSlidesEditor').innerHTML = html;
}

window.bannerRefreshSummary = function(i) {
    const title = bEl('bnTitle' + i).value.trim();
    bEl('bnSummary' + i).innerText = title || ('Slide ' + i);
    bEl('bnDot' + i).className = 'w-1.5 h-1.5 rounded-full flex-shrink-0 ' +
        (bEl('bnActive' + i).checked ? 'bg-emerald-400' : 'bg-slate-600');
};

function bannerUpdatePreview(i) {
    const img = bEl('bnPreview' + i);
    const empty = bEl('bnPreviewEmpty' + i);
    const src = getSafeBannerImage(bannerDraft[i] ? bannerDraft[i].image : '');
    if (src) {
        img.src = src;
        img.classList.remove('hidden');
        empty.classList.add('hidden');
    } else {
        img.removeAttribute('src');
        img.classList.add('hidden');
        empty.classList.remove('hidden');
    }
}

window.bannerFileSelected = async function(i, event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        showToast('Pilih file gambar yang valid.', 'error');
        event.target.value = '';
        return;
    }
    if (file.size > 12 * 1024 * 1024) {
        showToast('Ukuran gambar maksimal 12 MB.', 'error');
        event.target.value = '';
        return;
    }
    try {
        showToast('Memproses gambar...');
        const data = await compressBannerFile(file);
        bannerDraft[i] = { image: data, source: 'file' };
        bEl('bnImageUrl' + i).value = '';
        bannerUpdatePreview(i);
        showToast('Gambar slide ' + i + ' siap disimpan.');
    } catch (err) {
        showToast(err.message || 'Gagal memproses gambar', 'error');
    }
};

window.bannerImageUrlInput = function(i, value) {
    const v = value.trim();
    if (v) {
        bannerDraft[i] = { image: v, source: 'url' };
        bEl('bnFile' + i).value = '';
    } else if (bannerDraft[i] && bannerDraft[i].source === 'url') {
        bannerDraft[i] = { image: '', source: '' };
    }
    bannerUpdatePreview(i);
};

window.bannerClearImage = function(i) {
    bannerDraft[i] = { image: '', source: '' };
    bEl('bnFile' + i).value = '';
    bEl('bnImageUrl' + i).value = '';
    bannerUpdatePreview(i);
};

window.openBannerModal = function() {
    if (!state.currentUser) return;
    buildBannerEditor();
    bEl('bnEnabled').checked = bannerConfig.enabled;
    const ivSelect = bEl('bnInterval');
    if (![...ivSelect.options].some(o => Number(o.value) === bannerConfig.interval)) {
        const opt = document.createElement('option');
        opt.value = String(bannerConfig.interval);
        opt.textContent = bannerConfig.interval + ' detik';
        ivSelect.appendChild(opt);
    }
    ivSelect.value = String(bannerConfig.interval);

    for (let i = 1; i <= BANNER_MAX; i++) {
        const d = bannerDocs[i] || {};
        const image = d.image || '';
        bannerDraft[i] = { image, source: image ? (image.startsWith('data:') ? 'file' : 'url') : '' };
        bEl('bnActive' + i).checked = d.active !== false;
        bEl('bnTitle' + i).value = d.title || '';
        bEl('bnText' + i).value = d.text || '';
        bEl('bnLink' + i).value = d.link || '';
        bEl('bnNewTab' + i).checked = d.newTab !== false;
        bEl('bnCta' + i).value = d.cta || '';
        bEl('bnImageUrl' + i).value = (image && !image.startsWith('data:')) ? image : '';
        bannerUpdatePreview(i);
        window.bannerRefreshSummary(i);
    }
    bEl('bannerModal').classList.remove('hidden');
};

window.closeBannerModal = function() {
    bEl('bannerModal').classList.add('hidden');
};

window.handleSaveBanner = async function(e) {
    e.preventDefault();
    if (!state.currentUser) return;

    const slides = [];
    for (let i = 1; i <= BANNER_MAX; i++) {
        const title = bEl('bnTitle' + i).value.trim();
        const text = bEl('bnText' + i).value.trim();
        const active = bEl('bnActive' + i).checked;
        const image = (bannerDraft[i] && bannerDraft[i].image) || '';

        const link = normalizeBannerLink(bEl('bnLink' + i).value);
        if (link === null) {
            showToast(`Slide ${i}: link harus diawali http(s)://, mailto: atau tel:`, 'error');
            return;
        }
        if (image && !getSafeBannerImage(image)) {
            showToast(`Slide ${i}: URL gambar harus diawali http:// atau https://`, 'error');
            return;
        }
        if (image.length > 900000) {
            showToast(`Slide ${i}: gambar terlalu besar, pilih gambar lain.`, 'error');
            return;
        }
        slides.push({ order: i, active, title, text, link, newTab: bEl('bnNewTab' + i).checked, cta: bEl('bnCta' + i).value.trim(), image });
    }

    const interval = Math.min(15, Math.max(2, Number(bEl('bnInterval').value) || 5));
    const enabled = bEl('bnEnabled').checked;
    const btn = bEl('saveBannerBtn');
    btn.disabled = true;
    btn.innerText = 'Menyimpan...';

    try {
        const batch = writeBatch(state.db);
        batch.set(doc(state.db, 'biolink', 'public', 'profile', 'banner_config'), { enabled, interval });
        slides.forEach((s, idx) => {
            batch.set(doc(state.db, 'biolink', 'public', 'profile', 'banner_' + (idx + 1)), s);
        });
        await batch.commit();
        closeBannerModal();
        showToast('Banner berhasil disimpan!');
    } catch (err) {
        console.error('Save banner error:', err);
        const denied = err && (err.code === 'permission-denied' || /permission/i.test(err.message || ''));
        showToast(denied ? 'Ditolak Firestore: perbarui Rules (lihat petunjuk)' : (err.message || 'Gagal menyimpan banner'), 'error');
    } finally {
        btn.disabled = false;
        btn.innerText = 'Simpan Banner';
    }
};
