// ============================================================
// auth.js  —  E-SHR Authentication (OTP via EmailJS)
// ============================================================
// SETUP INSTRUCTIONS:
//   1. Go to https://www.emailjs.com and create a free account
//   2. Create a Service (Gmail / Outlook / etc.)
//   3. Create an Email Template with these variables:
//        {{to_email}}  — recipient email
//        {{otp_code}}  — the 6-digit OTP
//        {{user_name}} — user's name
//   4. Replace the three constants below with your real IDs
// ============================================================

const EMAILJS_SERVICE_ID  = "service_3pvyu62";   // e.g. "service_abc123"
const EMAILJS_TEMPLATE_ID = "template_bcugzps";  // e.g. "template_xyz789"
const EMAILJS_PUBLIC_KEY  = "E4Cf1HxduXx0oVQwI";   // e.g. "abc123XYZ..."

// In-memory OTP store  { email -> { code, expiresAt } }
const _otpStore = {};

// ── Generate a 6-digit OTP ──────────────────────────────────
function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ── Send OTP to email using EmailJS ────────────────────────
async function sendOTPEmail(email, otp, userName = "User") {
  // Check if EmailJS is properly configured
  const isConfigured = EMAILJS_SERVICE_ID  !== "YOUR_SERVICE_ID" &&
                       EMAILJS_TEMPLATE_ID !== "YOUR_TEMPLATE_ID" &&
                       EMAILJS_PUBLIC_KEY  !== "YOUR_PUBLIC_KEY";

  if (!isConfigured) {
    // ── DEMO MODE: show OTP in a toast so developer can test ──
    console.warn("EmailJS not configured – running in demo mode");
    showToast(`📧 DEMO OTP for ${email}: ${otp}`, "info", 10000);
    return true;
  }

  try {
    emailjs.init(EMAILJS_PUBLIC_KEY);
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_email  : email,
      otp_code  : otp,
      user_name : userName,
    });
    return true;
  } catch (err) {
    console.error("EmailJS error:", err);
    showToast("Failed to send OTP email. Please try again.", "error");
    return false;
  }
}

// ── Store OTP (expires in 10 minutes) ─────────────────────
function storeOTP(email, otp) {
  _otpStore[email] = {
    code      : otp,
    expiresAt : Date.now() + 10 * 60 * 1000,
  };
}

// ── Verify OTP ────────────────────────────────────────────
function verifyOTP(email, enteredCode) {
  const entry = _otpStore[email];
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    delete _otpStore[email];
    return false;
  }
  // Also accept demo code "123456" if EmailJS not configured
  const isDemoMode = EMAILJS_SERVICE_ID === "YOUR_SERVICE_ID";
  if (isDemoMode && enteredCode === "123456") return true;
  return entry.code === enteredCode;
}

// ── Clear OTP after use ────────────────────────────────────
function clearOTP(email) {
  delete _otpStore[email];
}

// ============================================================
// REGISTER FLOW
// ============================================================
let _regRole = "patient";

function setRegRole(role) {
  _regRole = role;
  document.getElementById("rolePatientCard").classList.toggle("active", role === "patient");
  document.getElementById("roleDoctorCard").classList.toggle("active", role === "doctor");
  document.getElementById("regRoleTitle").textContent =
    role === "doctor" ? "Doctor Registration" : "Patient Registration";
  document.getElementById("doctorRegFields").style.display =
    role === "doctor" ? "block" : "none";
}

async function registerSendOTP() {
  const aadhar = document.getElementById("regAadhar").value.replace(/\s/g, "");
  const email  = document.getElementById("regEmail").value.trim();
  const first  = document.getElementById("regFirst").value.trim();
  const last   = document.getElementById("regLast").value.trim();

  if (aadhar.length !== 12) return showToast("Enter valid 12-digit Aadhar", "error");
  if (!email.includes("@"))  return showToast("Enter valid email address", "error");
  if (!first || !last)       return showToast("Enter your full name", "error");

  if (_regRole === "doctor") {
    const license = document.getElementById("regLicense").value.trim();
    if (!license) return showToast("Enter medical license number", "error");
  }

  // Show email in OTP step
  document.getElementById("regEmailDisplay").textContent = email;

  const btn = document.getElementById("regSendOtpBtn");
  btn.disabled    = true;
  btn.innerHTML   = '<i class="fas fa-spinner fa-spin"></i> Sending OTP...';

  const otp = generateOTP();
  storeOTP(email, otp);

  const sent = await sendOTPEmail(email, otp, first);

  btn.disabled  = false;
  btn.innerHTML = '<i class="fas fa-key"></i> Verify Aadhar &amp; Send OTP';

  if (sent) {
    document.getElementById("regStep1").style.display = "none";
    document.getElementById("regStep2").style.display = "block";
    showToast(`OTP sent to ${email}`, "success");
  }
}

async function registerVerifyOTP() {
  const email = document.getElementById("regEmail").value.trim();
  const otp   = [0,1,2,3,4,5].map(i => document.getElementById(`rotp${i}`).value).join("");

  if (otp.length !== 6) return showToast("Enter complete 6-digit OTP", "error");

  if (!verifyOTP(email, otp)) {
    showToast("Invalid or expired OTP. Please try again.", "error");
    return;
  }
  clearOTP(email);

  const btn = document.getElementById("regVerifyBtn");
  btn.disabled  = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';

  try {
    await completeRegistration();
  } catch (e) {
    showToast("Registration failed: " + e.message, "error");
  }

  btn.disabled  = false;
  btn.innerHTML = '<i class="fas fa-shield-alt"></i> Verify &amp; Register';
}

async function completeRegistration() {
  const aadhar = document.getElementById("regAadhar").value.replace(/\s/g, "");
  const email  = document.getElementById("regEmail").value.trim();
  const first  = document.getElementById("regFirst").value.trim();
  const last   = document.getElementById("regLast").value.trim();

  const eshrId = "ESHR-" + Math.random().toString(36).substr(2,6).toUpperCase();

  const userData = {
    aadhar   : aadhar,
    email    : email,
    firstName: first,
    lastName : last,
    role     : _regRole,
    eshrId   : eshrId,
    createdAt: new Date().toISOString(),
  };

  if (_regRole === "doctor") {
    userData.license        = document.getElementById("regLicense").value.trim();
    userData.specialization = "";
  }

  // Save to Firebase if available, else localStorage demo
  if (window._dbReady && window._db) {
    const { doc, setDoc } = window._fs;
    await setDoc(doc(window._db, "users", aadhar), userData);
  } else {
    // Demo mode: persist in localStorage
    const users = JSON.parse(localStorage.getItem("eshr_users") || "{}");
    users[aadhar] = userData;
    localStorage.setItem("eshr_users", JSON.stringify(users));
  }

  localStorage.setItem("eshr_current_user", JSON.stringify(userData));
  showToast("Registration successful! Welcome to E-SHR 🎉", "success");
  setTimeout(() => initApp(userData), 800);
}

function goBackRegStep() {
  document.getElementById("regStep1").style.display = "block";
  document.getElementById("regStep2").style.display = "none";
  // Clear OTP inputs
  for (let i = 0; i < 6; i++) document.getElementById(`rotp${i}`).value = "";
}

// ============================================================
// LOGIN FLOW
// ============================================================
async function loginSendOTP() {
  const aadhar = document.getElementById("loginAadhar").value.replace(/\s/g, "");
  const email  = document.getElementById("loginEmail").value.trim();

  if (aadhar.length !== 12) return showToast("Enter valid 12-digit Aadhar", "error");
  if (!email.includes("@"))  return showToast("Enter valid email address", "error");

  // Verify user exists
  let userData = null;
  if (window._dbReady && window._db) {
    try {
      const { doc, getDoc } = window._fs;
      const snap = await getDoc(doc(window._db, "users", aadhar));
      if (snap.exists()) userData = snap.data();
    } catch (e) { /* ignore */ }
  } else {
    const users = JSON.parse(localStorage.getItem("eshr_users") || "{}");
    userData = users[aadhar] || null;
  }

  if (!userData) {
    showToast("No account found with this Aadhar. Please register first.", "error");
    return;
  }
  if (userData.email.toLowerCase() !== email.toLowerCase()) {
    showToast("Email does not match records. Please try again.", "error");
    return;
  }

  document.getElementById("loginEmailDisplay").textContent = email;

  const btn = document.getElementById("loginSendOtpBtn");
  btn.disabled  = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending OTP...';

  const otp = generateOTP();
  storeOTP(email, otp);

  const sent = await sendOTPEmail(email, otp, userData.firstName || "User");

  btn.disabled  = false;
  btn.innerHTML = '<i class="fas fa-key"></i> Send OTP';

  if (sent) {
    // Store user temporarily for post-OTP login
    window._pendingLoginUser = userData;
    document.getElementById("loginStep1").style.display = "none";
    document.getElementById("loginStep2").style.display = "block";
    showToast(`OTP sent to ${email}`, "success");
  }
}

async function loginVerifyOTP() {
  const email = document.getElementById("loginEmail").value.trim();
  const otp   = [0,1,2,3,4,5].map(i => document.getElementById(`lotp${i}`).value).join("");

  if (otp.length !== 6) return showToast("Enter complete 6-digit OTP", "error");

  if (!verifyOTP(email, otp)) {
    showToast("Invalid or expired OTP. Please try again.", "error");
    return;
  }
  clearOTP(email);

  const userData = window._pendingLoginUser;
  if (!userData) {
    showToast("Session expired. Please try login again.", "error");
    goBackLoginStep();
    return;
  }

  localStorage.setItem("eshr_current_user", JSON.stringify(userData));
  showToast(`Welcome back, ${userData.firstName}! 👋`, "success");
  setTimeout(() => initApp(userData), 600);
}

function goBackLoginStep() {
  document.getElementById("loginStep1").style.display = "block";
  document.getElementById("loginStep2").style.display = "none";
  for (let i = 0; i < 6; i++) document.getElementById(`lotp${i}`).value = "";
  window._pendingLoginUser = null;
}

// ============================================================
// OTP INPUT HELPERS
// ============================================================
function otpNext(el, idx, prefix) {
  el.value = el.value.replace(/\D/g, "").slice(-1);
  if (el.value && idx < 5) {
    document.getElementById(`${prefix}otp${idx + 1}`).focus();
  }
}

function otpBack(e, idx, prefix) {
  if (e.key === "Backspace" && !e.target.value && idx > 0) {
    document.getElementById(`${prefix}otp${idx - 1}`).focus();
  }
}

// ============================================================
// CARD SWITCHING
// ============================================================
function showLoginCard() {
  document.getElementById("registerCard").style.display = "none";
  document.getElementById("loginCard").style.display    = "block";
}

function showRegisterCard() {
  document.getElementById("loginCard").style.display    = "none";
  document.getElementById("registerCard").style.display = "block";
}

// ============================================================
// LOGOUT
// ============================================================
function handleLogout() {
  localStorage.removeItem("eshr_current_user");
  window._pendingLoginUser = null;
  location.reload();
}

// ============================================================
// AUTO-LOGIN on page load
// ============================================================
window.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("eshr_current_user");
  if (saved) {
    try {
      const user = JSON.parse(saved);
      if (user && user.aadhar) {
        initApp(user);
        return;
      }
    } catch (e) { /* ignore */ }
  }
  // Show auth screen
  document.getElementById("authScreen").classList.add("active");
});

// ============================================================
// UTILITY: Aadhar format (XXXX XXXX XXXX)
// ============================================================
function formatAadhar(el) {
  let v = el.value.replace(/\D/g, "").slice(0, 12);
  el.value = v.replace(/(.{4})(.{4})?(.{4})?/, (_, a, b, c) =>
    [a, b, c].filter(Boolean).join(" ")
  );
}
