// ================================================================
// app.js — Boot App, Sidebar, Profile
// ================================================================

function bootApp() {
  document.getElementById('authScreen').classList.remove('active');
  document.getElementById('appScreen').style.display = 'block';

  setupSidebar();
  setupMedSuggestions();

  const firstPage = STATE.userRole === 'doctor' ? 'docDashboard' : 'dashboard';
  showPage(firstPage);

  generateQR();
  populateDashboard();

  if (STATE.userRole === 'doctor') {
    loadAllPatients();
    docLoadStats();
  }

  setupNotifListener();

  document.getElementById('dashDate').textContent =
    new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function setupSidebar() {
  const u = STATE.userData;
  if (!u) return;
  const name = (u.firstName || '') + ' ' + (u.lastName || '');
  const init = getInitials(u.firstName, u.lastName);

  document.getElementById('sidebarAvatar').textContent = init;
  document.getElementById('sidebarName').textContent   = name;
  document.getElementById('sidebarRole').textContent   = STATE.userRole === 'doctor' ? 'Doctor' : 'Patient';

  const badge = document.getElementById('sidebarRoleBadge');
  badge.textContent = STATE.userRole === 'doctor' ? 'Doctor' : 'Patient';
  badge.className   = 'role-badge ' + STATE.userRole;

  document.getElementById('patientNav').style.display = STATE.userRole === 'patient' ? 'block' : 'none';
  document.getElementById('doctorNav').style.display  = STATE.userRole === 'doctor'  ? 'block' : 'none';

  // Profile section
  document.getElementById('profileAvatarLarge').textContent = init;
  document.getElementById('profileFullName').textContent    = name;
  document.getElementById('profileEmailDisplay').textContent = u.email || '';
  document.getElementById('profileRoleDisplay').textContent  = STATE.userRole === 'doctor'
    ? `Doctor — ${u.specialization || 'General'}` : 'Patient';
  document.getElementById('profileEshrId').textContent = generateESHRId(STATE.currentUser?.uid);

  // Pre-fill edit form
  const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
  setVal('editFirst',    u.firstName);
  setVal('editLast',     u.lastName);
  setVal('editAge',      u.age);
  setVal('editBloodGroup', u.bloodGroup);
  setVal('editWeight',   u.weight);
  setVal('editHeight',   u.height);
  setVal('editPhone',    u.phone);
  setVal('editAllergies', (u.allergies || []).join(', '));
  setVal('editEmgName',  u.emergencyName);
  setVal('editEmgPhone', u.emergencyPhone);

  const specRow = document.getElementById('editSpecializationRow');
  if (specRow) specRow.style.display = STATE.userRole === 'doctor' ? 'block' : 'none';
  setVal('editSpecialization', u.specialization);
}

// ---------------------------------------------------------------
// PROFILE EDIT
// ---------------------------------------------------------------
function toggleEditProfile() {
  const f = document.getElementById('editProfileForm');
  f.style.display = f.style.display === 'none' ? 'block' : 'none';
}

async function saveProfile() {
  const u = STATE.userData;
  u.firstName      = document.getElementById('editFirst').value.trim();
  u.lastName       = document.getElementById('editLast').value.trim();
  u.age            = parseInt(document.getElementById('editAge').value) || 0;
  u.bloodGroup     = document.getElementById('editBloodGroup').value;
  u.weight         = parseFloat(document.getElementById('editWeight').value) || 0;
  u.height         = parseFloat(document.getElementById('editHeight').value) || 0;
  u.phone          = document.getElementById('editPhone').value.trim();
  u.allergies      = document.getElementById('editAllergies').value.split(',').map(s => s.trim()).filter(Boolean);
  u.emergencyName  = document.getElementById('editEmgName').value.trim();
  u.emergencyPhone = document.getElementById('editEmgPhone').value.trim();
  if (STATE.userRole === 'doctor') u.specialization = document.getElementById('editSpecialization').value.trim();

  await saveUserData();
  setupSidebar();
  populateDashboard();
  toggleEditProfile();
  generateQR();
  toast('Profile updated!', 'success');
}

function toggleSetting(key) {
  toast(`${key.charAt(0).toUpperCase() + key.slice(1)} settings coming soon.`, 'info');
}
