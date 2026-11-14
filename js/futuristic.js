/**
 * futuristic.js
 * Efek futuristik tambahan yang ringan:
 *  1) teks boot bergaya terminal di splash screen
 *  2) cahaya latar yang mengikuti kursor (hanya perangkat dengan mouse)
 *  3) pintasan keyboard: Ctrl+K atau "/" untuk fokus ke pencarian
 * Semua bagian aman: bila elemen tidak ada, fungsi diam-diam berhenti.
 */

const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE_POINTER = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

// 1) Teks boot di splash
function bootText() {
    const el = document.getElementById('splashStatusText');
    if (!el) return;
    const lines = ['> memuat modul...', '> menyambung ke cloud...', '> sinkron data link...', '> sistem siap'];
    let i = 0;
    el.textContent = lines[0];
    const timer = setInterval(() => {
        if (!document.getElementById('splashStatusText')) { clearInterval(timer); return; }
        i = Math.min(i + 1, lines.length - 1);
        el.textContent = lines[i];
        if (i === lines.length - 1) clearInterval(timer);
    }, 380);
}

// 2) Cahaya mengikuti kursor
function cursorGlow() {
    if (REDUCED || !FINE_POINTER) return;
    const bg = document.querySelector('.fx-bg');
    if (!bg) return;
    const glow = document.createElement('div');
    glow.className = 'fx-cursor';
    bg.appendChild(glow);

    let x = innerWidth / 2, y = innerHeight / 3, cx = x, cy = y, raf = null;
    function tick() {
        cx += (x - cx) * 0.14;
        cy += (y - cy) * 0.14;
        glow.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
        raf = (Math.abs(x - cx) > 0.5 || Math.abs(y - cy) > 0.5) ? requestAnimationFrame(tick) : null;
    }
    window.addEventListener('pointermove', (e) => {
        if (e.pointerType && e.pointerType !== 'mouse') return;
        x = e.clientX; y = e.clientY;
        glow.classList.add('on');
        if (raf === null) raf = requestAnimationFrame(tick);
    }, { passive: true });
    document.addEventListener('mouseleave', () => glow.classList.remove('on'));
}

// 3) Pintasan pencarian
function searchShortcut() {
    const input = document.getElementById('searchInput');
    if (!input) return;
    if (FINE_POINTER) {
        input.setAttribute('placeholder', 'Search..  (Ctrl K)');
    }
    document.addEventListener('keydown', (e) => {
        const tag = (e.target && e.target.tagName) || '';
        const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(tag) || (e.target && e.target.isContentEditable);
        const combo = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k';
        if (combo || (!typing && e.key === '/')) {
            e.preventDefault();
            input.focus({ preventScroll: false });
            input.scrollIntoView({ block: 'center', behavior: REDUCED ? 'auto' : 'smooth' });
            input.select();
        }
    });
}

export function initFuturistic() {
    try { bootText(); } catch (e) { /* abaikan */ }
    try { cursorGlow(); } catch (e) { /* abaikan */ }
    try { searchShortcut(); } catch (e) { /* abaikan */ }
}
