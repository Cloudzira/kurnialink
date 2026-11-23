/**
 * perf-guard.js
 * Skrip biasa (bukan modul), dimuat sinkron di <head> supaya keputusan diambil SEBELUM halaman digambar.
 * Menyalakan "mode ringan" (class "perf-lite" di <html>, gayanya di css/perf-lite.css) bila perangkat tersendat.
 *
 * Urutan keputusan:
 *  1) Pilihan manual: buka halaman dengan  ?lite=1 (paksa ringan)  atau  ?lite=0 (paksa penuh). Tersimpan di perangkat itu.
 *  2) Hasil deteksi sebelumnya (tersimpan) -> dipakai langsung, tidak kedip dulu baru berubah.
 *  3) Perangkat lemah (RAM <= 4 GB atau CPU <= 2 inti) -> langsung ringan.
 *  4) Selain itu: pantau kelancaran ~3 detik setelah halaman tampil; bila banyak frame tersendat -> ringan & diingat.
 */
(function () {
    var KEY = 'kp_perf';          // 'lite' | 'full'   (pilihan manual lewat ?lite=)
    var AUTO_KEY = 'kp_perf_auto'; // 'lite'            (hasil deteksi otomatis)
    var root = document.documentElement;

    function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function put(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
    function lite(on) { root.classList.toggle('perf-lite', !!on); }

    // 1) Pilihan manual lewat URL
    var m = /[?&]lite=([01])\b/.exec(location.search);
    if (m) {
        put(KEY, m[1] === '1' ? 'lite' : 'full');
        if (m[1] === '0') { try { localStorage.removeItem(AUTO_KEY); } catch (e) {} }
    }
    var manual = get(KEY);
    if (manual === 'lite') { lite(true); return; }
    if (manual === 'full') { return; }

    // 2) Hasil deteksi otomatis sebelumnya
    if (get(AUTO_KEY) === 'lite') { lite(true); return; }

    // 3) Perangkat lemah
    var mem = navigator.deviceMemory, cores = navigator.hardwareConcurrency;
    if ((mem && mem <= 4) || (cores && cores <= 2)) { lite(true); put(AUTO_KEY, 'lite'); return; }

    // 4) Pantau kelancaran setelah splash selesai
    function monitor() {
        var last = 0, frames = 0, slow = 0, TOTAL = 150;
        function tick(t) {
            if (document.hidden) { last = 0; requestAnimationFrame(tick); return; }   // tab di latar: jangan dihitung
            if (last) {
                var dt = t - last;
                if (dt < 1000) {                 // abaikan jeda besar (ganti tab dll.)
                    frames++;
                    if (dt > 45) slow++;         // < ~22 fps
                }
            }
            last = t;
            if (frames < TOTAL) { requestAnimationFrame(tick); return; }
            if (slow / frames >= 0.2) { lite(true); put(AUTO_KEY, 'lite'); }
        }
        requestAnimationFrame(tick);
    }
    window.addEventListener('load', function () { setTimeout(monitor, 2500); }, { once: true });
})();
