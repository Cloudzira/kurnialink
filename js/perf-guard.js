/**
 * perf-guard.js
 * Skrip biasa (bukan modul), dimuat sinkron di <head> supaya keputusan diambil SEBELUM halaman digambar.
 * Menyalakan "mode ringan" (class "perf-lite" di <html>, gayanya di css/perf-lite.css) bila perangkat tersendat.
 *
 * Urutan keputusan:
 *  1) Pilihan manual: buka halaman dengan  ?lite=1 (paksa ringan)  atau  ?lite=0 (paksa penuh). Tersimpan di perangkat itu.
 *  2) Hasil deteksi sebelumnya (tersimpan) -> dipakai langsung, tidak kedip dulu baru berubah.
 *  3) Pantau kelancaran setelah halaman tampil; bila SANGAT banyak frame tersendat -> mode ringan & diingat.
 *     Mode ringan otomatis tetap menampilkan cahaya kartu/folder (hanya lebih hemat). Hanya ?lite=1 yang mematikannya.
 */
(function () {
    var KEY = 'kp_perf';          // 'lite' | 'full'   (pilihan manual lewat ?lite=)
    var AUTO_KEY = 'kp_perf_auto2'; // 'lite'           (hasil deteksi otomatis; nama baru agar keputusan lama yang terlalu agresif ter-reset)
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
    if (manual === 'lite') { lite(true); root.classList.add('perf-strict'); return; }
    if (manual === 'full') { return; }

    // 2) Hasil deteksi otomatis sebelumnya
    if (get(AUTO_KEY) === 'lite') { lite(true); return; }

    // 3) Pantau kelancaran setelah splash selesai
    function monitor() {
        var last = 0, frames = 0, slow = 0, TOTAL = 150;
        function tick(t) {
            if (document.hidden) { last = 0; requestAnimationFrame(tick); return; }   // tab di latar: jangan dihitung
            if (last) {
                var dt = t - last;
                if (dt < 1000) {                 // abaikan jeda besar (ganti tab dll.)
                    frames++;
                    if (dt > 66) slow++;         // < ~15 fps
                }
            }
            last = t;
            if (frames < TOTAL) { requestAnimationFrame(tick); return; }
            if (slow / frames >= 0.4) { lite(true); put(AUTO_KEY, 'lite'); }
        }
        requestAnimationFrame(tick);
    }
    window.addEventListener('load', function () { setTimeout(monitor, 5000); }, { once: true });
})();
