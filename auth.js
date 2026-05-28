// ================================================================
// auth.js — Authentication: Register, Login, OTP, Logout
// ================================================================

// ---------------------------------------------------------------
// EMAIL OTP (via EmailJS)
// ---------------------------------------------------------------
async function sendEmailOTP(email, name, otp) {
  // Check EmailJS is loaded
  if (typeof emailjs === 'undefined') {
    console.error('EmailJS library not loaded!');
    toast(`OTP (demo): ${otp}`, 'warning', 8000);
    return false;
  }

  // Validate config keys are set
  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY ||
      EMAILJS_SERVICE_ID.startsWith('YOUR_') || EMAILJS_TEMPLATE_ID.startsWith('YOUR_')) {
    console.warn('EmailJS keys not configured in config.js');
    toast(`OTP (demo mode): ${otp}`, 'warning', 8000);
    return false;
  }

  try {
    // Re-init EmailJS just before sending to ensure it's ready
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

    const result = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      {
        to_email:  email,
        to_name:   name || 'User',
        otp:       otp,
        app_name:  'E-SHR',
        message:   `Your E-SHR login OTP is: ${otp}. Valid for 10 minutes. Do not share this with anyone.`,
      }
    );

    console.log('EmailJS send result:', result);
    toast(`OTP sent to ${email}`, 'success');
    return true;

  } catch (e) {
    console.error('EmailJS send error:', e);

    // Show specific error to help debug
    let errMsg = 'OTP email failed';
    if (e.status === 400) errMsg = 'EmailJS: Bad request — check template variable names';
    else if (e.status === 401) errMsg = 'EmailJS: Invalid public key in config.js';
    else if (e.status === 403) errMsg = 'EmailJS: Service not found or blocked';
    else if (e.status === 422) errMsg = 'EmailJS: Template not found — check TEMPLATE_ID';
    else if (e.text) errMsg = 'EmailJS: ' + e.text;

    toast(`${errMsg}. Demo OTP: ${otp}`, 'warning', 8000);
    return false;
  }
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ---------------------------------------------------------------
// IMGBB IMAGE UPLOAD
// ---------------------------------------------------------------
async function uploadToImgBB(file) {
  if (!file) return '';
  const fd = new FormData();
  fd.append('image', file);
  fd.append('key', IMGBB_API_KEY);
  try {
    const r = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: fd });
    const d = await r.json();
    if (d.success) return d.data.url;
    throw new Error(d.error?.message || 'Upload failed');
  } catch (e) {
    console.warn('ImgBB error:', e);
    toast('Image upload failed (check ImgBB key). Using placeholder.', 'warning');
    return '';
  }
}

function previewCertFile(inp) {
  const f = inp.files[0];
  if (!f) return;
  document.getElementById('certFileName').textContent = f.name;
  const reader = new FileReader();
  reader.onload = e => {
    const img = document.getElementById('certPreview');
    img.src = e.target.result;
    img.style.display = 'block';
  };
  reader.readAsDataURL(f);
}

function previewRepImg(inp) {
  const f = inp.files[0];
  if (!f) return;
  document.getElementById('repImgName').textContent = f.name;
  const reader = new FileReader();
  reader.onload = e => {
    const img = document.getElementById('repImgPreview');
    img.src = e.target.result;
    img.style.display = 'block';
  };
  reader.readAsDataURL(f);
}

// ---------------------------------------------------------------
// REGISTER
// ---------------------------------------------------------------
let regRole = 'patient';

function setRegRole(role) {
  regRole = role;
  document.getElementById('rolePatientCard').classList.toggle('active', role === 'patient');
  document.getElementById('roleDoctorCard').classList.toggle('active', role === 'doctor');
  document.getElementById('doctorRegFields').style.display = role === 'doctor' ? 'block' : 'none';
  document.getElementById('regRoleTitle').textContent = role === 'doctor' ? 'Doctor Registration' : 'Patient Registration';
}

async function registerSendOTP() {
  const aadhar = document.getElementById('regAadhar').value.trim();
  const email  = document.getElementById('regEmail').value.trim();
  const first  = document.getElementById('regFirst').value.trim();
  const last   = document.getElementById('regLast').value.trim();

  if (!aadhar || aadhar.replace(/\s/g, '').length < 12) { toast('Enter valid 12-digit Aadhar number', 'error'); return; }
  if (!email)  { toast('Email is required', 'error'); return; }
  if (!first)  { toast('First name is required', 'error'); return; }
  if (!last)   { toast('Last name is required', 'error'); return; }

  if (regRole === 'doctor') {
    const lic = document.getElementById('regLicense').value.trim();
    if (!lic) { toast('License number is required for doctors', 'error'); return; }
  }

  // Check if Aadhar already registered in demo
  const demoUser = Object.values(DEMO_USERS).find(u => u.aadhaar.replace(/\s/g, '') === aadhar.replace(/\s/g, ''));
  if (demoUser) { toast('This Aadhar is already registered. Please login.', 'warning'); return; }

  // FIX: wrap setLoading so any error below still unblocks the button

  setLoading('regSendOtpBtn', true, 'Sending OTP...');

  const otp = generateOTP();
  STATE.currentOTP = otp;
  STATE.pendingRegData = { aadhar, email, first, last, role: regRole };

  await sendEmailOTP(email, first, otp);
  setLoading('regSendOtpBtn', false);

  document.getElementById('regEmailDisplay').textContent = email;
  document.getElementById('regStep1').style.display = 'none';
  document.getElementById('regStep2').style.display = 'block';
  clearOTP('r');
}

async function registerVerifyOTP() {
  const otp = getOTPValue('r');
  if (otp.length < 6) { toast('Enter complete 6-digit OTP', 'error'); return; }
  if (otp !== STATE.currentOTP && otp !== DEMO_OTP) { toast('Invalid OTP. Try again.', 'error'); return; }

  setLoading('regVerifyBtn', true, 'Registering...');

  try {
    const d = STATE.pendingRegData;
    let certUrl = '';

    if (d.role === 'doctor') {
      const certFile = document.getElementById('regCert').files[0];
      if (certFile) certUrl = await uploadToImgBB(certFile);
    }

    const uid = 'user-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);

    const newUser = {
      uid, role: d.role,
      firstName: d.first, lastName: d.last,
      email: d.email, aadhaar: d.aadhar,
      bloodGroup: 'A+', age: 0, weight: 0, height: 0,
      phone: '', allergies: [], emergencyName: '', emergencyPhone: '',
      specialization: d.role === 'doctor' ? (document.getElementById('regLicense')?.value || '') : '',
      license: d.role === 'doctor' ? document.getElementById('regLicense').value : '',
      certificateUrl: certUrl,
      reports: [], prescriptions: [],
      createdAt: new Date().toISOString(),
    };

    await dbSet('users', uid, newUser);

    STATE.currentUser = { uid, email: d.email, aadhaar: d.aadhar, role: d.role };
    STATE.userData    = newUser;
    STATE.userRole    = d.role;

    toast('Account created successfully!', 'success');
    bootApp();
  } catch (e) {
    toast('Registration failed: ' + e.message, 'error');
    console.error(e);
  }

  setLoading('regVerifyBtn', false);
}

function goBackRegStep() {
  document.getElementById('regStep1').style.display = 'block';
  document.getElementById('regStep2').style.display = 'none';
}

// ---------------------------------------------------------------
// LOGIN
// ---------------------------------------------------------------
async function loginSendOTP() {
  const aadhar = document.getElementById('loginAadhar').value.trim();
  const email  = document.getElementById('loginEmail').value.trim();

  if (!aadhar || aadhar.replace(/\s/g, '').length < 12) { toast('Enter valid 12-digit Aadhar number', 'error'); return; }
  if (!email) { toast('Email is required', 'error'); return; }

  setLoading('loginSendOtpBtn', true, 'Sending...');

  // Check demo users first
  const demoUser = DEMO_USERS[email];
  if (demoUser && demoUser.aadhaar.replace(/\s/g, '') === aadhar.replace(/\s/g, '')) {
    const otp = generateOTP();
    STATE.currentOTP      = otp;
    STATE.pendingLoginData = { email, aadhar, uid: demoUser.uid };
    // FIX: sendEmailOTP failure should NOT block showing OTP step
    await sendEmailOTP(email, demoUser.firstName, otp);
    setLoading('loginSendOtpBtn', false);
    document.getElementById('loginEmailDisplay').textContent = email;
    document.getElementById('loginStep1').style.display = 'none';
    document.getElementById('loginStep2').style.display = 'block';
    clearOTP('l');
    return;
  }

  // Try Firebase
  let users = [];
  try { users = await dbQuery('users', 'aadhaar', '==', aadhar); } catch(e) { users = []; }
  const user = users.find(u => u.email === email);
  if (user) {
    const otp = generateOTP();
    STATE.currentOTP      = otp;
    STATE.pendingLoginData = { email, aadhar, uid: user.uid };
    // FIX: sendEmailOTP failure should NOT block showing OTP step
    await sendEmailOTP(email, user.firstName, otp);
    setLoading('loginSendOtpBtn', false);
    document.getElementById('loginEmailDisplay').textContent = email;
    document.getElementById('loginStep1').style.display = 'none';
    document.getElementById('loginStep2').style.display = 'block';
    clearOTP('l');
    return;
  }

  setLoading('loginSendOtpBtn', false);
  toast('No account found with this Aadhar & Email combination', 'error');
}

async function loginVerifyOTP() {
  const otp = getOTPValue('l');
  if (otp.length < 6) { toast('Enter complete 6-digit OTP', 'error'); return; }
  if (otp !== STATE.currentOTP && otp !== DEMO_OTP) { toast('Invalid OTP. Try again.', 'error'); return; }

  setLoading('loginVerifyBtn', true, 'Logging in...');

  try {
    const d = STATE.pendingLoginData;

    // Demo user
    if (DEMO_USERS[d.email]) {
      const demoU = DEMO_USERS[d.email];
      STATE.currentUser = { uid: demoU.uid, email: d.email, aadhaar: d.aadhar, role: demoU.role };
      STATE.userData    = { ...demoU };
      STATE.userRole    = demoU.role;

      if (demoU.role === 'doctor') {
        STATE.allPatients = Object.values(DEMO_USERS).filter(u => u.role === 'patient');
      }

      toast(`Welcome back, ${demoU.role === 'doctor' ? 'Dr. ' : ''}${demoU.firstName}!`, 'success');
      bootApp();
      return;
    }

    // Firebase user
    const userData = await dbGet('users', d.uid);
    if (!userData) throw new Error('User data not found');

    STATE.currentUser = { uid: d.uid, email: d.email, aadhaar: d.aadhar, role: userData.role };
    STATE.userData    = userData;
    STATE.userRole    = userData.role;

    toast('Login successful!', 'success');
    bootApp();
  } catch (e) {
    toast('Login error: ' + e.message, 'error');
    console.error(e);
  }

  setLoading('loginVerifyBtn', false);
}

function goBackLoginStep() {
  document.getElementById('loginStep1').style.display = 'block';
  document.getElementById('loginStep2').style.display = 'none';
}

// ---------------------------------------------------------------
// AUTH SCREEN SWITCHING
// ---------------------------------------------------------------
function showLoginCard() {
  document.getElementById('registerCard').style.display = 'none';
  document.getElementById('loginCard').style.display    = 'block';
  document.getElementById('loginStep1').style.display   = 'block';
  document.getElementById('loginStep2').style.display   = 'none';
}

function showRegisterCard() {
  document.getElementById('loginCard').style.display    = 'none';
  document.getElementById('registerCard').style.display = 'block';
  document.getElementById('regStep1').style.display     = 'block';
  document.getElementById('regStep2').style.display     = 'none';
}

function handleLogout() {
  STATE.currentUser  = null;
  STATE.userData     = null;
  STATE.userRole     = 'patient';
  STATE.notifications = [];
  STATE.unreadNotif  = 0;
  document.getElementById('appScreen').style.display = 'none';
  document.getElementById('authScreen').classList.add('active');
  showRegisterCard();
  toast('Logged out successfully', 'info');
}
