/**
 * icon-catalog.js
 * Daftar ikon bawaan untuk link & folder (Font Awesome Free 6). Dipakai oleh dropdown "Ikon" di form tambah & edit.
 * Cara menambah ikon: tambahkan satu baris ['kelas-ikon', 'Nama tampil'] pada grup yang cocok.
 * Cari nama ikon di https://fontawesome.com/icons (pilih filter "Free"). Ikon merek memakai awalan "fa-brands fa-".
 */

const S = 'fa-solid fa-';
const B = 'fa-brands fa-';

export const ICON_GROUPS = [
    { label: 'Umum', icons: [
        [S + 'globe', 'Web / Umum'],
        [S + 'folder', 'Folder Umum'],
        [S + 'box-archive', 'Koleksi Aplikasi'],
        [S + 'layer-group', 'Kategori Produk'],
        [S + 'link', 'Tautan'],
        [S + 'house', 'Beranda'],
        [S + 'briefcase', 'Portfolio'],
        [S + 'store', 'Toko Online'],
        [S + 'cart-shopping', 'Belanja'],
        [S + 'gift', 'Hadiah'],
        [S + 'newspaper', 'Berita / Artikel'],
        [S + 'star', 'Favorit'],
        [S + 'heart', 'Suka'],
        [S + 'lightbulb', 'Ide'],
        [S + 'rocket', 'Peluncuran'],
        [S + 'bolt', 'Cepat / Energi'],
        [S + 'shield-halved', 'Keamanan'],
        [S + 'gear', 'Pengaturan'],
        [S + 'robot', 'AI / Robot'],
        [S + 'wand-magic-sparkles', 'Asisten AI'],
    ]},
    { label: 'Produktivitas', icons: [
        [S + 'calendar-days', 'Kalender / Agenda'],
        [S + 'clock', 'Jam / Waktu'],
        [S + 'list-check', 'Daftar Tugas'],
        [S + 'clipboard-list', 'Catatan'],
        [S + 'file-lines', 'Dokumen'],
        [S + 'file-pdf', 'PDF'],
        [S + 'cloud-arrow-down', 'Unduhan'],
        [S + 'chart-line', 'Statistik'],
        [S + 'wallet', 'Keuangan'],
        [S + 'bell', 'Pengingat'],
        [S + 'envelope', 'Email'],
        [S + 'phone', 'Telepon'],
        [S + 'comments', 'Diskusi / Chat'],
        [S + 'location-dot', 'Lokasi'],
        [S + 'map', 'Peta'],
    ]},
    { label: 'Belajar & Edukasi', icons: [
        [S + 'book', 'Buku'],
        [S + 'book-open', 'Baca'],
        [S + 'graduation-cap', 'Pendidikan'],
        [S + 'chalkboard-user', 'Guru / Kelas'],
        [S + 'school', 'Sekolah'],
        [S + 'user-graduate', 'Siswa'],
        [S + 'child', 'Anak'],
        [S + 'flask', 'Laboratorium'],
        [S + 'code', 'Kode'],
        [S + 'laptop-code', 'Pemrograman'],
    ]},
    { label: 'Media & Aplikasi', icons: [
        [S + 'mobile-screen-button', 'Aplikasi HP'],
        [S + 'gamepad', 'Game'],
        [S + 'music', 'Musik'],
        [S + 'headphones', 'Audio'],
        [S + 'microphone-lines', 'Kajian / Podcast'],
        [S + 'video', 'Video'],
        [S + 'film', 'Film'],
        [S + 'camera', 'Kamera'],
        [S + 'image', 'Galeri'],
        [S + 'users', 'Komunitas'],
        [S + 'handshake', 'Kerja Sama'],
    ]},
    { label: 'Islami', icons: [
        [S + 'mosque', 'Masjid'],
        [S + 'book-quran', "Al-Qur'an"],
        [S + 'book-open-reader', 'Tadarus / Belajar Baca'],
        [S + 'person-praying', 'Sholat'],
        [S + 'hands-praying', 'Doa'],
        [S + 'sun', 'Dzikir Pagi'],
        [S + 'cloud-moon', 'Dzikir Petang'],
        [S + 'moon', 'Bulan / Malam'],
        [S + 'star-and-crescent', 'Bintang & Bulan Sabit'],
        [S + 'kaaba', "Ka'bah / Haji & Umrah"],
        [S + 'compass', 'Arah Kiblat'],
        [S + 'calendar-check', 'Jadwal Sholat / Hijriah'],
        [S + 'scroll', 'Hadits / Kitab'],
        [S + 'hand-holding-heart', 'Sedekah'],
        [S + 'hand-holding-dollar', 'Zakat / Infaq'],
        [S + 'sack-dollar', 'Kas Masjid'],
        [S + 'coins', 'Donasi'],
        [S + 'people-group', 'Majelis / Halaqah'],
        [S + 'hands-holding-child', 'Keluarga & Anak'],
        [S + 'bowl-food', 'Ramadhan / Buka Puasa'],
        [S + 'droplet', 'Wudhu / Thaharah'],
        [S + 'seedling', 'Tarbiyah / Akhlak'],
        [S + 'dove', 'Damai / Salam'],
        [S + 'tents', 'Mina / Perkemahan'],
    ]},
    { label: 'Media Sosial & Merek', icons: [
        [B + 'github', 'GitHub'],
        [B + 'instagram', 'Instagram'],
        [B + 'threads', 'Threads'],
        [B + 'tiktok', 'TikTok'],
        [B + 'youtube', 'YouTube'],
        [B + 'facebook', 'Facebook'],
        [B + 'x-twitter', 'X (Twitter)'],
        [B + 'linkedin', 'LinkedIn'],
        [B + 'whatsapp', 'WhatsApp'],
        [B + 'telegram', 'Telegram'],
        [B + 'discord', 'Discord'],
        [B + 'spotify', 'Spotify'],
        [B + 'google-drive', 'Google Drive'],
        [B + 'google-play', 'Google Play'],
        [B + 'app-store-ios', 'App Store'],
        [B + 'android', 'Android'],
        [B + 'chrome', 'Chrome'],
    ]},
];

function buildOptionsHtml() {
    const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    const groups = ICON_GROUPS.map(g =>
        `<optgroup label="${esc(g.label)}">` +
        g.icons.map(([value, label]) => `<option value="${esc(value)}">${esc(label)}</option>`).join('') +
        '</optgroup>'
    ).join('');
    return groups + '<optgroup label="Lainnya"><option value="CUSTOM_FILE">Unggah gambar sendiri…</option></optgroup>';
}

// Isi kedua dropdown ikon (form tambah & form edit)
export function fillIconSelects() {
    const html = buildOptionsHtml();
    ['linkIconSelect', 'editLinkIconSelect'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = html;
    });
}
