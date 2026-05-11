// ================================================================
// utils.js — Helper / Utility Functions
// ================================================================

// ---------------------------------------------------------------
// TOAST NOTIFICATIONS
// ---------------------------------------------------------------
function toast(msg, type = 'info', duration = 3500) {
  const icons = { success:'fa-check-circle', error:'fa-times-circle', info:'fa-info-circle', warning:'fa-exclamation-triangle' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<i class="fas ${icons[type]||icons.info}"></i><span>${msg}</span>`;
  document.getElementById('toast-container').appendChild(t);
  setTimeout(() => t.remove(), duration);
}

// ---------------------------------------------------------------
// MODAL HELPERS
// ---------------------------------------------------------------
function openModal(id)  { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// Close modal on overlay click
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.modal-overlay').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) m.classList.remove('active'); });
  });
});

// ---------------------------------------------------------------
// BUTTON LOADING STATE
// ---------------------------------------------------------------
function setLoading(btnId, loading, label = '') {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  if (loading && label) btn.innerHTML = `<span class="spinner"></span> ${label}`;
}

// ---------------------------------------------------------------
// SIDEBAR TOGGLE (mobile)
// ---------------------------------------------------------------
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('active');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('active');
}

// ---------------------------------------------------------------
// PAGE NAVIGATION
// ---------------------------------------------------------------
const PAGE_TITLES = {
  dashboard: 'Dashboard', timeline: 'Health Timeline', reports: 'My Reports',
  prescriptions: 'Prescriptions', shareRecord: 'Share Record',
  allergies: 'My Allergies', emergencyQR: 'Emergency QR', aiAssistant: 'Health AI',
  profile: 'Profile & Settings', docDashboard: 'Doctor Dashboard',
  addPrescription: 'Add Prescription', patientReports: 'Patient Reports',
};

function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pg = document.getElementById('page-' + name);
  if (pg) pg.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.page === name);
  });

  document.getElementById('topbarTitle').textContent = PAGE_TITLES[name] || name;
  closeSidebar();

  // Trigger page-specific render
  if (name === 'timeline')       renderTimeline();
  if (name === 'reports')        renderReports();
  if (name === 'prescriptions')  renderPrescriptions();
  if (name === 'allergies')      renderAllergies();
  if (name === 'emergencyQR')    renderEmergencyQR();
  if (name === 'shareRecord')    renderRecentShares();
  if (name === 'aiAssistant')    initAI();
  if (name === 'docDashboard')   docLoadStats();
  if (name === 'addPrescription') setupMedSuggestions();
}

// ---------------------------------------------------------------
// FORMAT HELPERS
// ---------------------------------------------------------------
function formatDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt) ? d : dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatRelTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getInitials(first, last) {
  return ((first?.[0]||'') + (last?.[0]||'')).toUpperCase() || 'U';
}

function generateESHRId(uid) {
  if (!uid) return 'ESHR-0000';
  return 'ESHR-' + uid.slice(-4).toUpperCase();
}

function formatAadhar(inp) {
  let v = inp.value.replace(/\D/g, '').slice(0, 12);
  inp.value = v.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

// ---------------------------------------------------------------
// CONFIRM DIALOG
// ---------------------------------------------------------------
function showConfirm(title, text, onYes) {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmText').textContent  = text;
  document.getElementById('confirmYesBtn').onclick = () => { closeModal('confirmModal'); onYes(); };
  openModal('confirmModal');
}

// ---------------------------------------------------------------
// OTP INPUT HELPERS
// ---------------------------------------------------------------
function otpNext(inp, idx, prefix) {
  inp.value = inp.value.replace(/\D/g, '').slice(0, 1);
  if (inp.value && idx < 5) {
    const next = document.getElementById(prefix + 'otp' + (idx + 1));
    if (next) next.focus();
  }
}

function otpBack(e, idx, prefix) {
  if (e.key === 'Backspace' && !e.target.value && idx > 0) {
    const prev = document.getElementById(prefix + 'otp' + (idx - 1));
    if (prev) { prev.value = ''; prev.focus(); }
  }
}

function getOTPValue(prefix) {
  return [0,1,2,3,4,5].map(i => {
    const el = document.getElementById(prefix + 'otp' + i);
    return el ? el.value : '';
  }).join('');
}

function clearOTP(prefix) {
  [0,1,2,3,4,5].forEach(i => {
    const el = document.getElementById(prefix + 'otp' + i);
    if (el) el.value = '';
  });
  const first = document.getElementById(prefix + 'otp0');
  if (first) first.focus();
}

// ---------------------------------------------------------------
// MEDICINE AUTOCOMPLETE SETUP
// ---------------------------------------------------------------
function setupMedSuggestions() {
  const inp  = document.getElementById('rxMedName');
  const list = document.getElementById('rxMedSuggestions');
  if (!inp || !list) return;

  inp.addEventListener('input', () => {
    const q = inp.value.trim().toLowerCase();
    if (!q || q.length < 2) { list.innerHTML = ''; return; }
    const matches = MEDICINE_LIST.filter(m => m.toLowerCase().includes(q)).slice(0, 6);
    list.innerHTML = matches.map(m =>
      `<div onclick="selectMed('${m}')" style="padding:8px 14px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--border);transition:background 0.15s" onmouseover="this.style.background='rgba(0,212,255,0.08)'" onmouseout="this.style.background=''">${m}</div>`
    ).join('');
  });

  document.addEventListener('click', e => {
    if (!inp.contains(e.target) && !list.contains(e.target)) list.innerHTML = '';
  });
}

function selectMed(name) {
  const inp  = document.getElementById('rxMedName');
  const list = document.getElementById('rxMedSuggestions');
  if (inp)  inp.value = name;
  if (list) list.innerHTML = '';
}

// Set default date on report modal open
window.addEventListener('load', () => {
  const d = document.getElementById('addRepDate');
  if (d) d.value = new Date().toISOString().split('T')[0];
  showRegisterCard();
});
