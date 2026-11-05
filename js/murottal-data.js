/**
 * murottal-data.js
 * Data murottal: daftar 114 surat (nama Latin & Arab) dan sumber audio. Ubah di sini bila ingin mengganti qari / server audio.
 */


// ================= MUROTTAL: Syaikh Misyari Rasyid Alafasy =================
export const MUROTTAL_QARI = 'Syaikh Misyari Rasyid Alafasy';
export const SURAH_NAMES = [
    'Al-Fatihah', 'Al-Baqarah', "Ali 'Imran", "An-Nisa'", "Al-Ma'idah", "Al-An'am", "Al-A'raf", 'Al-Anfal', 'At-Taubah', 'Yunus',
    'Hud', 'Yusuf', "Ar-Ra'd", 'Ibrahim', 'Al-Hijr', 'An-Nahl', "Al-Isra'", 'Al-Kahfi', 'Maryam', 'Thaha',
    "Al-Anbiya'", 'Al-Hajj', "Al-Mu'minun", 'An-Nur', 'Al-Furqan', "Asy-Syu'ara'", 'An-Naml', 'Al-Qashash', "Al-'Ankabut", 'Ar-Rum',
    'Luqman', 'As-Sajdah', 'Al-Ahzab', "Saba'", 'Fathir', 'Yasin', 'Ash-Shaffat', 'Shad', 'Az-Zumar', 'Ghafir',
    'Fushshilat', 'Asy-Syura', 'Az-Zukhruf', 'Ad-Dukhan', 'Al-Jatsiyah', 'Al-Ahqaf', 'Muhammad', 'Al-Fath', 'Al-Hujurat', 'Qaf',
    'Adz-Dzariyat', 'Ath-Thur', 'An-Najm', 'Al-Qamar', 'Ar-Rahman', "Al-Waqi'ah", 'Al-Hadid', 'Al-Mujadilah', 'Al-Hasyr', 'Al-Mumtahanah',
    'Ash-Shaff', "Al-Jumu'ah", 'Al-Munafiqun', 'At-Taghabun', 'Ath-Thalaq', 'At-Tahrim', 'Al-Mulk', 'Al-Qalam', 'Al-Haqqah', "Al-Ma'arij",
    'Nuh', 'Al-Jinn', 'Al-Muzzammil', 'Al-Muddatstsir', 'Al-Qiyamah', 'Al-Insan', 'Al-Mursalat', "An-Naba'", "An-Nazi'at", "'Abasa",
    'At-Takwir', 'Al-Infithar', 'Al-Muthaffifin', 'Al-Insyiqaq', 'Al-Buruj', 'Ath-Thariq', "Al-A'la", 'Al-Ghasyiyah', 'Al-Fajr', 'Al-Balad',
    'Asy-Syams', 'Al-Lail', 'Adh-Dhuha', 'Al-Insyirah', 'At-Tin', "Al-'Alaq", 'Al-Qadr', 'Al-Bayyinah', 'Az-Zalzalah', "Al-'Adiyat",
    "Al-Qari'ah", 'At-Takatsur', "Al-'Ashr", 'Al-Humazah', 'Al-Fil', 'Quraisy', "Al-Ma'un", 'Al-Kautsar', 'Al-Kafirun', 'An-Nashr',
    'Al-Lahab', 'Al-Ikhlash', 'Al-Falaq', 'An-Nas'
];
export const SURAH_ARABIC = [
    'الفاتحة', 'البقرة', 'آل عمران', 'النساء', 'المائدة', 'الأنعام', 'الأعراف', 'الأنفال', 'التوبة', 'يونس',
    'هود', 'يوسف', 'الرعد', 'إبراهيم', 'الحجر', 'النحل', 'الإسراء', 'الكهف', 'مريم', 'طه',
    'الأنبياء', 'الحج', 'المؤمنون', 'النور', 'الفرقان', 'الشعراء', 'النمل', 'القصص', 'العنكبوت', 'الروم',
    'لقمان', 'السجدة', 'الأحزاب', 'سبأ', 'فاطر', 'يس', 'الصافات', 'ص', 'الزمر', 'غافر',
    'فصلت', 'الشورى', 'الزخرف', 'الدخان', 'الجاثية', 'الأحقاف', 'محمد', 'الفتح', 'الحجرات', 'ق',
    'الذاريات', 'الطور', 'النجم', 'القمر', 'الرحمن', 'الواقعة', 'الحديد', 'المجادلة', 'الحشر', 'الممتحنة',
    'الصف', 'الجمعة', 'المنافقون', 'التغابن', 'الطلاق', 'التحريم', 'الملك', 'القلم', 'الحاقة', 'المعارج',
    'نوح', 'الجن', 'المزمل', 'المدثر', 'القيامة', 'الإنسان', 'المرسلات', 'النبأ', 'النازعات', 'عبس',
    'التكوير', 'الانفطار', 'المطففين', 'الانشقاق', 'البروج', 'الطارق', 'الأعلى', 'الغاشية', 'الفجر', 'البلد',
    'الشمس', 'الليل', 'الضحى', 'الشرح', 'التين', 'العلق', 'القدر', 'البينة', 'الزلزلة', 'العاديات',
    'القارعة', 'التكاثر', 'العصر', 'الهمزة', 'الفيل', 'قريش', 'الماعون', 'الكوثر', 'الكافرون', 'النصر',
    'المسد', 'الإخلاص', 'الفلق', 'الناس'
];
// Daftar sumber audio (dicoba berurutan; jika gagal otomatis pindah ke sumber berikutnya)
export const MUROTTAL_SOURCES = [
    (n) => `https://server8.mp3quran.net/afs/${String(n).padStart(3, '0')}.mp3`,
    (n) => `https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/${n}.mp3`,
    (n) => `https://download.quranicaudio.com/quran/mishaari_raashid_al_3afaasee/${String(n).padStart(3, '0')}.mp3`
];
