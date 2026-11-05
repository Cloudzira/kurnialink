/**
 * state.js
 * "Papan tulis bersama": data yang dipakai dan diubah oleh banyak file.
 * Cara pakai di file lain:  import { state } from './state.js';
 *                           state.currentUser = user;   // mengubah
 *                           if (state.currentUser) ...  // membaca
 */

export const state = {
    auth: null,                 // objek Firebase Auth (diisi saat initFirebase)
    db: null,                   // objek Firestore (diisi saat initFirebase)
    currentUser: null,          // user admin yang sedang login (null = pengunjung biasa)
    linksList: [],              // seluruh link & folder dari Firestore
    isDraggingActive: false,    // true saat admin sedang menggeser urutan (drag & drop)
    openFolders: new Set(),     // id folder yang sedang terbuka
    profileData: {              // data profil di bagian atas halaman
        name: "",
        bio: "",
        avatar: "",
        verified: false
    }
};
