/**
 * link-light.js
 * Cahaya neon yang berputar di tepi kartu link, folder, dan banner.
 *
 * Mesin LAMA: sudut gradasi diubah lewat JavaScript puluhan kali per detik pada setiap kartu, lalu dipotong
 * dengan mask-composite. Pada GPU / browser tertentu ini memaksa gambar ulang terus-menerus -> tampilan kedip & hilang.
 *
 * Mesin BARU: file ini hanya menyisipkan elemen hiasan ke setiap kartu:
 *   - kartu & banner : <span class="ll-ring"><i></i></span>  (bingkai diam, lapisan <i> yang berputar)
 *   - kepala folder  : <i class="ll-spin"></i>
 * Putarannya dikerjakan CSS (transform, di GPU) - lihat css/link-cards.css. Tidak ada lagi requestAnimationFrame / setProperty per frame.
 * File ini juga menjeda putaran kartu yang berada di luar layar.
 */

const linkLightHues = new Map();
let nextLinkLightHue = Math.random() * 360;

export function getLinkLightHue(linkId) {
    const key = String(linkId);
    if (!linkLightHues.has(key)) {
        linkLightHues.set(key, nextLinkLightHue);
        nextLinkLightHue = (nextLinkLightHue + 137.508) % 360;
    }
    return linkLightHues.get(key);
}

const DURATION_MS = 10000;   // 10 detik per putaran

// Mode paling ringan (manual ?lite=1): cahaya dimatikan sepenuhnya
const linkLightStrict = () => document.documentElement.classList.contains('perf-strict');

// Kartu di luar layar: putaran dijeda
const linkLightObserver = ('IntersectionObserver' in window)
    ? new IntersectionObserver((entries) => {
        entries.forEach((e) => e.target.classList.toggle('ll-off', !e.isIntersecting));
    }, { rootMargin: '80px' })
    : null;

function attachDecor(host) {
    if (!host.isConnected && !host.parentNode) { /* belum dipasang ke halaman: tetap boleh disisipi */ }
    if (host.querySelector(':scope > .ll-ring, :scope > .ll-spin')) return;   // sudah ada

    const isFolderHead = host.classList.contains('nf-head');
    let decor;
    if (isFolderHead) {
        decor = document.createElement('i');
        decor.className = 'll-spin';
    } else {
        decor = document.createElement('span');
        decor.className = 'll-ring';
        decor.appendChild(document.createElement('i'));
    }
    decor.setAttribute('aria-hidden', 'true');
    host.appendChild(decor);
}

export function registerLinkLightAnimation(host) {
    if (!host || linkLightStrict()) return;

    // Fase acak: setiap kartu mulai dari sudut berbeda (sama seperti sebelumnya)
    host.style.setProperty('--ll-dur', (DURATION_MS / 1000) + 's');
    host.style.setProperty('--ll-delay', '-' + (Math.random() * DURATION_MS / 1000).toFixed(2) + 's');

    // Pemanggil kadang mengisi ulang isi kartu (innerHTML) SETELAH fungsi ini dipanggil, sehingga elemen hiasan
    // baru disisipkan sesudah pemanggil selesai (microtask).
    queueMicrotask(() => {
        attachDecor(host);
        if (linkLightObserver) linkLightObserver.observe(host);
    });
}
