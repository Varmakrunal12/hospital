// ================================================================
// config.js — API Keys & SDK Initialization
// ================================================================

// ============================================================
// EMAILJS KEYS — Replace with your keys from emailjs.com
// ============================================================
const EMAILJS_PUBLIC_KEY  = "E4Cf1HxduXx0oVQwI";
const EMAILJS_SERVICE_ID  = "service_3pvyu62";
const EMAILJS_TEMPLATE_ID = "template_bcugzps";

// ============================================================
// IMGBB KEY — Replace with your key from api.imgbb.com
// ============================================================
const IMGBB_API_KEY = "87973612bbce381e78cef86c50cc233b";

// ============================================================
// FIREBASE CONFIG — Replace with your Firebase project config
// ============================================================
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBpBQfMoLuKPMhd0vAut4kVjlQ0GoexJuc",
  authDomain: "e-shr-9a369.firebaseapp.com",
  databaseURL: "https://e-shr-9a369-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "e-shr-9a369",
  storageBucket: "e-shr-9a369.firebasestorage.app",
  messagingSenderId: "678099663686",
  appId: "1:678099663686:web:1b430ed2ef90b67a7ac347"
};

// Initialize EmailJS on page load
window.addEventListener('load', function () {
  try {
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
    console.log("EmailJS initialized successfully!");
  } catch (e) {
    console.error('EmailJS init error:', e);
  }
});
