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
// Kartu di luar layar tidak dianimasikan (hemat CPU/baterai)
const linkLightObserver = ('IntersectionObserver' in window)
    ? new IntersectionObserver((entries) => {
        entries.forEach(e => { e.target.__lightInView = e.isIntersecting; });
    }, { rootMargin: '80px' })
    : null;

function updateLinkLights(now) {
    linkLightAnimFrame = null;

    // batasi ~30 fps: cahaya tetap mulus namun beban jauh lebih ringan
    if (now - linkLightLastDraw >= 32) {
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
