/**
 * auth.js
 * Login & logout admin (Firebase Auth), tombol gembok di pojok atas, dan jendela login.
 */

import { signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { state } from './state.js';
import { showToast } from './utils.js';

window.handleLoginSubmit = async function(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const errorMsg = document.getElementById('loginErrorMsg');
    const submitBtn = document.getElementById('loginSubmitBtn');

    errorMsg.classList.add('hidden');
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> Memproses...';

    try {
        await signInWithEmailAndPassword(state.auth, email, password);
        closeLoginModal();
        showToast('Berhasil masuk sebagai Admin!');
    } catch (err) {
        errorMsg.classList.remove('hidden');
        errorMsg.innerText = 'Gagal Login: Email atau password salah.';
    } finally {
        submitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Masuk Sekarang';
    }
};

window.handleLogout = async function() {
    try {
        await signOut(state.auth);
        showToast('Berhasil logout admin.');
    } catch(e) {
        showToast('Logout gagal', 'error');
    }
};

window.handleAdminBtnClick = function() {
    if (state.currentUser) {
        document.getElementById('adminPanel').scrollIntoView({ behavior: 'smooth' });
    } else {
        document.getElementById('loginModal').classList.remove('hidden');
    }
};

window.closeLoginModal = function() {
    document.getElementById('loginModal').classList.add('hidden');
};
