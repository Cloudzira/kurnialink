/**
 * link-light.js
 * Animasi cahaya neon yang berputar di tepi kartu link (jalan di laptop & HP, hanya menganimasikan kartu yang terlihat).
 */


const linkLightHues = new Map();
let nextLinkLightHue = Math.random() * 360;

// --- CROSS-BROWSER ANIMATION ENGINE (Jalan di Laptop & HP) ---
const linkLightCards = new Map();
let linkLightAnimFrame = null;
let linkLightStartTime = 0;

export function getLinkLightHue(linkId) {
    const key = String(linkId);
    if (!linkLightHues.has(key)) {
        linkLightHues.set(key, nextLinkLightHue);
        nextLinkLightHue = (nextLinkLightHue + 137.508) % 360;
    }
    return linkLightHues.get(key);
}

let linkLightLastDraw = 0;

// Saat halaman sedang di-scroll, animasi cahaya dijeda sebentar supaya scroll tetap mulus (terutama di HP)
let linkLightScrolling = false;
let linkLightScrollTimer = null;
window.addEventListener('scroll', () => {
    linkLightScrolling = true;
    clearTimeout(linkLightScrollTimer);
    linkLightScrollTimer = setTimeout(() => { linkLightScrolling = false; }, 140);
}, { passive: true });
// Kartu di luar layar tidak dianimasikan (hemat CPU/baterai)
const linkLightObserver = ('IntersectionObserver' in window)
    ? new IntersectionObserver((entries) => {
        entries.forEach(e => { e.target.__lightInView = e.isIntersecting; });
    }, { rootMargin: '80px' })
    : null;

function updateLinkLights(now) {
    linkLightAnimFrame = null;

    // batasi ~20 fps (putaran 10 detik, jadi tetap terlihat mulus) dan jeda saat scroll / tab tidak terlihat
    if (!linkLightScrolling && !document.hidden && now - linkLightLastDraw >= 50) {
        linkLightLastDraw = now;
        const elapsed = now - linkLightStartTime;
        linkLightCards.forEach((anim, card) => {
            if (!card.isConnected) {
                if (linkLightObserver) linkLightObserver.unobserve(card);
                linkLightCards.delete(card);
                return;
            }
            if (card.__lightInView === false) return;
            const progress = ((elapsed + anim.phase) % anim.duration) / anim.duration;
            card.style.setProperty('--link-light-angle', `${progress * 360}deg`);
        });
    }

    if (linkLightCards.size > 0) {
        linkLightAnimFrame = requestAnimationFrame(updateLinkLights);
    }
}

export function registerLinkLightAnimation(card) {
    const duration = 10000; // 10 detik per putaran
    const phase = Math.random() * duration;

    if (linkLightCards.size === 0) linkLightStartTime = performance.now();
    linkLightCards.set(card, { duration, phase });
    card.__lightInView = true;
    if (linkLightObserver) linkLightObserver.observe(card);
    if (linkLightAnimFrame === null) {
        linkLightAnimFrame = requestAnimationFrame(updateLinkLights);
    }
}
