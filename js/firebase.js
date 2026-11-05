/**
 * firebase.js
 * Koneksi Firebase: inisialisasi, pemantau login admin, dan langganan data link & profil dari Firestore (real-time).
 */

import { collection, doc, getFirestore, initializeFirestore, onSnapshot, persistentLocalCache, persistentMultipleTabManager, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getApps, initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { state } from './state.js';
import { firebaseConfig } from './config.js';
import { showToast } from './utils.js';
import { renderProfile } from './profile.js';
import { updateFolderDropdownOptions } from './admin-form.js';
import { loadFallbackLocalData, updateAdminUI } from './admin-ui.js';
import { subscribeToBanner } from './banner.js';
import { markAppReady } from './splash.js';

let app; // instance aplikasi Firebase (hanya dipakai di file ini)

let linksUnsubscribe = null;
let profileUnsubscribe = null;

export function initFirebase() {
    try {
        if (!getApps().length) {
            app = initializeApp(firebaseConfig);
        } else {
            app = getApps()[0];
        }
        state.auth = getAuth(app);
        try {
            // Cache data di perangkat: kunjungan berikutnya tampil instan & tetap bisa dibuka offline
            state.db = initializeFirestore(app, {
                localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
            });
        } catch (cacheErr) {
            state.db = getFirestore(app);
        }
        // Ambil data langsung, tanpa menunggu status login selesai
        subscribeToFirestoreData();
        setupAuthListeners();
    } catch (err) {
        console.warn("Firebase Init Notice:", err);
        showToast("Firebase menggunakan mode demo/lokal", "info");
        loadFallbackLocalData();
    }
}

async function setupAuthListeners() {
    onAuthStateChanged(state.auth, (user) => {
        state.currentUser = user;
        updateAdminUI(user);
        // Data sudah berjalan; langganan ulang hanya jika sebelumnya gagal (misal Rules butuh login)
        if (!dataSubscribed || dataHadError) subscribeToFirestoreData();
    });
}

let dataSubscribed = false;
let dataHadError = false;

function subscribeToFirestoreData() {
    dataSubscribed = true;
    dataHadError = false;
    const linksCollectionRef = collection(state.db, 'biolink', 'public', 'links');
    const profileDocRef = doc(state.db, 'biolink', 'public', 'profile', 'header');

    document.getElementById('linksLoading').classList.remove('hidden');
    document.getElementById('linksContainer').classList.add('hidden');

    if (linksUnsubscribe) linksUnsubscribe();
    if (profileUnsubscribe) profileUnsubscribe();
    subscribeToBanner();

    linksUnsubscribe = onSnapshot(linksCollectionRef, (snapshot) => {
        if (state.isDraggingActive) return;

        const fetchedLinks = [];
        snapshot.forEach((docItem) => {
            fetchedLinks.push({ id: docItem.id, ...docItem.data() });
        });

        fetchedLinks.sort((a, b) => {
            const orderA = typeof a.order === 'number' ? a.order : 0;
            const orderB = typeof b.order === 'number' ? b.order : 0;
            if (orderA !== orderB) return orderA - orderB;
            return (b.createdAt || 0) - (a.createdAt || 0);
        });

        state.linksList = fetchedLinks;
        updateFolderDropdownOptions();
        filterLinks();
        
        dataHadError = false;
        document.getElementById('linksLoading').classList.add('hidden');
        document.getElementById('linksContainer').classList.remove('hidden');
        markAppReady();
    }, (error) => {
        console.error("Firestore snapshot error:", error);
        dataHadError = true;
        loadFallbackLocalData();
    });

    profileUnsubscribe = onSnapshot(profileDocRef, (docSnap) => {
        if (docSnap.exists()) {
            state.profileData = docSnap.data();
            renderProfile(state.profileData);
        } else {
            setDoc(profileDocRef, state.profileData).catch(() => {});
            renderProfile(state.profileData);
        }
    }, (error) => {
        console.error("Profile snapshot error:", error);
        renderProfile(state.profileData);
    });
}
