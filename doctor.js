// ================================================================
// doctor.js — Doctor: Dashboard, Prescriptions, Patient Reports
// ================================================================

// ---------------------------------------------------------------
// DASHBOARD & STATS
// ---------------------------------------------------------------
function docLoadStats() {
  const u   = STATE.userData;
  const rxs = u?.prescriptions || [];
  const allPrescriptions = STATE.allPatients.reduce((acc, p) => acc + (p.prescriptions?.length || 0), 0);

  document.getElementById('docStatPrescriptions').textContent = rxs.length + allPrescriptions;
  document.getElementById('docStatPatients').textContent      = STATE.allPatients.length || (rxs.length > 0 ? 1 : 0);
  document.getElementById('docStatDate').textContent = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  const alertCount = STATE.allPatients.reduce((acc, p) => acc + (p.allergies || []).length, 0);
  document.getElementById('docStatAlerts').textContent = alertCount;

  renderDocRecentPrescriptions();
}

function renderDocRecentPrescriptions() {
  const allRx = [];
  STATE.allPatients.forEach(p => {
    (p.prescriptions || []).forEach(rx => {
      allRx.push({ ...rx, patientName: `${p.firstName} ${p.lastName}`, patientId: p.uid });
    });
  });
  allRx.sort((a, b) => new Date(b.date) - new Date(a.date));

  const el = document.getElementById('docRecentPrescriptions');
  if (!allRx.length) {
    el.innerHTML = '<div class="empty-state"><i class="fas fa-prescription"></i><p>No prescriptions yet</p></div>';
    return;
  }

  el.innerHTML = allRx.slice(0, 5).map(rx => `
    <div class="report-item" style="cursor:default">
      <div class="report-icon lab"><i class="fas fa-prescription"></i></div>
      <div class="report-info">
        <div class="report-name">${rx.patientName || 'Patient'}</div>
        <div class="report-meta">${(rx.medicines || []).map(m => m.name).join(', ')} • ${formatDate(rx.date)}</div>
      </div>
      <span class="tag tag-green">Rx</span>
    </div>
  `).join('');
}

async function loadAllPatients() {
  STATE.allPatients = Object.values(DEMO_USERS).filter(u => u.role === 'patient');

  if (window._dbReady) {
    const patients = await dbQuery('users', 'role', '==', 'patient');
    if (patients.length) {
      patients.forEach(p => {
        if (!STATE.allPatients.find(d => d.uid === p.uid)) STATE.allPatients.push(p);
      });
    }
  }
}

// ---------------------------------------------------------------
// PATIENT SEARCH (Doctor Dashboard)
// ---------------------------------------------------------------
function docSearchPatient(query) {
  const el = document.getElementById('docSearchResults');
  if (!query || query.length < 2) {
    el.innerHTML = '';
    document.getElementById('docCurrentPatientCard').style.display = 'none';
    return;
  }

  const matches = STATE.allPatients.filter(p =>
    (p.firstName + ' ' + p.lastName).toLowerCase().includes(query.toLowerCase()) ||
    (p.aadhaar || '').includes(query) ||
    generateESHRId(p.uid).toLowerCase().includes(query.toLowerCase())
  );

  el.innerHTML = matches.map(p => `
    <div class="patient-card" onclick="selectDocPatient('${p.uid}')">
      <div class="patient-avatar">${getInitials(p.firstName, p.lastName)}</div>
      <div class="patient-info">
        <div class="patient-name">${p.firstName} ${p.lastName}</div>
        <div class="patient-meta">Blood: ${p.bloodGroup || '--'} | Age: ${p.age || '--'} | ${generateESHRId(p.uid)}</div>
        ${(p.allergies || []).length ? `<div class="patient-alert"><i class="fas fa-exclamation-triangle"></i> ${(p.allergies || []).join(', ')}</div>` : ''}
      </div>
    </div>
  `).join('') || '<div style="padding:12px;color:var(--text3);font-size:13px">No patients found</div>';
}

function selectDocPatient(uid) {
  const p = STATE.allPatients.find(pt => pt.uid === uid);
  if (!p) return;

  document.getElementById('docSearchResults').innerHTML = '';
  document.getElementById('docSearchInput').value       = '';
  document.getElementById('docPatientAvatar').textContent = getInitials(p.firstName, p.lastName);
  document.getElementById('docPatientName').textContent   = p.firstName + ' ' + p.lastName;
  document.getElementById('docPatientMeta').textContent   = `ID: ${generateESHRId(p.uid)} | Age: ${p.age || '--'} | Blood: ${p.bloodGroup || '--'}`;
  document.getElementById('docPatientAllergies').innerHTML = (p.allergies || []).length
    ? (p.allergies || []).map(a => `<span class="tag tag-red"><i class="fas fa-exclamation-triangle"></i> ${a}</span>`).join(' ')
    : '<span class="tag tag-green">No known allergies</span>';
  document.getElementById('docCurrentPatientCard').style.display = 'block';
  STATE.rxSelectedPatient = p;
}

function docScanQR() {
  const patients = STATE.allPatients;
  if (!patients.length) { toast('No patients found', 'info'); return; }
  const p = patients[0]; // Demo: show first patient
  selectDocPatient(p.uid);
  toast('QR scanned: ' + p.firstName + ' ' + p.lastName, 'success');
}

// ---------------------------------------------------------------
// ADD PRESCRIPTION
// ---------------------------------------------------------------
function rxSearchPatient(query) {
  const el = document.getElementById('rxPatientResults');
  if (!query || query.length < 2) { el.innerHTML = ''; return; }

  const matches = STATE.allPatients.filter(p =>
    (p.firstName + ' ' + p.lastName).toLowerCase().includes(query.toLowerCase()) ||
    (p.aadhaar || '').includes(query)
  );

  el.innerHTML = matches.map(p => `
    <div class="patient-card" onclick="selectRxPatient('${p.uid}')">
      <div class="patient-avatar" style="width:36px;height:36px;font-size:14px">${getInitials(p.firstName, p.lastName)}</div>
      <div class="patient-info">
        <div class="patient-name" style="font-size:14px">${p.firstName} ${p.lastName}</div>
        <div class="patient-meta">${generateESHRId(p.uid)} | ${p.bloodGroup || '--'}</div>
      </div>
    </div>
  `).join('') || '<div style="padding:10px;color:var(--text3);font-size:13px">No patients found</div>';
}

function selectRxPatient(uid) {
  const p = STATE.allPatients.find(pt => pt.uid === uid);
  if (!p) return;

  STATE.rxSelectedPatient = p;
  document.getElementById('rxPatientResults').innerHTML = '';
  document.getElementById('rxPatientSearch').value      = '';
  document.getElementById('rxPatientAvatar').textContent = getInitials(p.firstName, p.lastName);
  document.getElementById('rxPatientName').textContent   = p.firstName + ' ' + p.lastName;
  document.getElementById('rxPatientMeta').textContent   = `${generateESHRId(p.uid)} | Blood: ${p.bloodGroup || '--'} | Age: ${p.age || '--'}`;
  document.getElementById('rxSelectedPatient').style.display = 'block';

  if ((p.allergies || []).length) {
    document.getElementById('allergyCheckResult').innerHTML = `
      <div style="padding:12px;background:rgba(255,71,87,0.08);border:1px solid rgba(255,71,87,0.3);border-radius:10px">
        <div style="font-weight:700;color:var(--red);margin-bottom:8px"><i class="fas fa-exclamation-triangle"></i> Patient has known allergies:</div>
        ${p.allergies.map(a => `<span class="tag tag-red">${a}</span>`).join(' ')}
        <div style="font-size:12px;color:var(--text2);margin-top:8px">Check all medicines for conflicts before prescribing.</div>
      </div>`;
    // FIX: Fire notification in the bell icon panel too
    addNotification({
      title: '⚠️ Allergy Alert — ' + p.firstName + ' ' + p.lastName,
      text: 'Known allergies: ' + p.allergies.join(', ') + '. Check medicines carefully.',
      type: 'allergy',
      time: new Date().toISOString(),
    });
  } else {
    document.getElementById('allergyCheckResult').innerHTML = `
      <div style="padding:12px;background:rgba(0,229,160,0.08);border:1px solid rgba(0,229,160,0.2);border-radius:10px;text-align:center">
        <i class="fas fa-check-circle" style="color:var(--green);font-size:24px;display:block;margin-bottom:6px"></i>
        <div style="font-weight:700;color:var(--green)">No known allergies</div>
        <div style="font-size:12px;color:var(--text2);margin-top:4px">Proceed with caution — patient may have unrecorded allergies.</div>
      </div>`;
  }
}

function addRxMedicine() {
  const name = document.getElementById('rxMedName').value.trim();
  if (!name) { toast('Enter medicine name', 'error'); return; }

  const dosage    = document.getElementById('rxDosage').value.trim();
  const frequency = document.getElementById('rxFrequency').value;
  const duration  = document.getElementById('rxDuration').value.trim();
  const timing    = document.getElementById('rxTiming').value;

  // FIX: Use ALLERGY_MEDICINE_MAP for proper conflict detection
  const patAlg = STATE.rxSelectedPatient?.allergies || [];
  let conflict = null;

  for (const alg of patAlg) {
    // Check in ALLERGY_MEDICINE_MAP first (comprehensive list)
    const mappedDrugs = ALLERGY_MEDICINE_MAP[alg] || [];
    const medLower = name.toLowerCase();
    const inMap = mappedDrugs.some(drug => medLower.includes(drug) || drug.includes(medLower.split(' ')[0]));
    // Also check direct name match as fallback
    const directMatch = medLower.includes(alg.toLowerCase()) || alg.toLowerCase().includes(medLower.split(' ')[0]);
    if (inMap || directMatch) { conflict = alg; break; }
  }

  if (conflict) {
    document.getElementById('allergyCheckResult').innerHTML = `
      <div class="allergy-alert">
        <div class="allergy-alert-icon"><i class="fas fa-exclamation-triangle"></i></div>
        <div class="allergy-alert-title">⚠️ Allergy Conflict!</div>
        <div class="allergy-alert-text">${name} may conflict with patient's allergy: <strong>${conflict}</strong>. Consult before prescribing.</div>
      </div>`;
    toast('Allergy conflict detected! Check carefully.', 'warning', 5000);
    // FIX: Fire a notification so doctor sees it in the bell icon too
    addNotification({
      title: '⚠️ Allergy Alert',
      text: `${name} conflicts with ${STATE.rxSelectedPatient?.firstName || 'patient'}'s ${conflict} allergy.`,
      type: 'allergy',
      time: new Date().toISOString(),
    });
    return;
  }

  STATE.rxMedicines.push({ name, dosage, frequency, duration, timing });
  renderRxList();
  document.getElementById('rxMedName').value  = '';
  document.getElementById('rxDosage').value   = '';

  // Mark allergy check as passed
  document.getElementById('allergyCheckResult').innerHTML = `
    <div style="padding:12px;background:rgba(0,229,160,0.1);border:1px solid var(--green);border-radius:10px;text-align:center">
      <i class="fas fa-check-circle" style="color:var(--green);font-size:24px;display:block;margin-bottom:6px"></i>
      <div style="font-weight:700;color:var(--green)">Allergy Check Passed ✓</div>
      <div style="font-size:12px;color:var(--text2);margin-top:4px">${name} — No conflicts detected</div>
    </div>`;
  toast('Medicine added', 'success');
}

function renderRxList() {
  const el = document.getElementById('rxMedicineList');
  el.innerHTML = STATE.rxMedicines.map((m, i) => `
    <div class="rx-item">
      <div class="rx-num">${i + 1}</div>
      <div class="rx-info">
        <div class="rx-name">${m.name}${m.dosage ? ' — ' + m.dosage : ''}</div>
        <div class="rx-detail">${m.frequency} • ${m.duration} • ${m.timing}</div>
      </div>
      <div class="rx-delete" onclick="removeRxMed(${i})"><i class="fas fa-times"></i></div>
    </div>
  `).join('');
}

function removeRxMed(i) {
  STATE.rxMedicines.splice(i, 1);
  renderRxList();
}

function scanMed() {
  const med = MEDICINE_LIST[Math.floor(Math.random() * MEDICINE_LIST.length)];
  document.getElementById('rxMedName').value = med;
  toast('Scanned: ' + med, 'success');
}

async function savePrescription() {
  if (!STATE.rxSelectedPatient) { toast('Select a patient first', 'error'); return; }
  if (!STATE.rxMedicines.length) { toast('Add at least one medicine', 'error'); return; }

  const rx = {
    id: 'rx' + Date.now(),
    date: new Date().toISOString().split('T')[0],
    doctor: 'Dr. ' + (STATE.userData?.firstName || 'Doctor') + ' ' + (STATE.userData?.lastName || ''),
    doctorId: STATE.currentUser?.uid,
    indication: '',
    medicines: [...STATE.rxMedicines],
    notes: document.getElementById('rxNotes').value,
  };

  // Add to patient's record
  const pt = STATE.allPatients.find(p => p.uid === STATE.rxSelectedPatient.uid);
  if (pt) {
    if (!pt.prescriptions) pt.prescriptions = [];
    pt.prescriptions.push(rx);
    await dbSet('users', pt.uid, { prescriptions: pt.prescriptions });
  }

  // Update stats counter
  const prev = parseInt(document.getElementById('docStatPrescriptions').textContent) || 0;
  document.getElementById('docStatPrescriptions').textContent = prev + 1;

  toast('Prescription saved for ' + STATE.rxSelectedPatient.firstName + '!', 'success');

  // Reset form
  STATE.rxMedicines       = [];
  STATE.rxSelectedPatient = null;
  document.getElementById('rxMedicineList').innerHTML    = '';
  document.getElementById('rxSelectedPatient').style.display = 'none';
  document.getElementById('rxNotes').value              = '';
  document.getElementById('rxPatientSearch').value      = '';
  document.getElementById('allergyCheckResult').innerHTML =
    '<div class="empty-state" style="padding:20px"><i class="fas fa-search"></i><p>Add patient and medicines to run allergy check</p></div>';

  renderDocRecentPrescriptions();
}

// ---------------------------------------------------------------
// PATIENT REPORTS (Doctor view)
// ---------------------------------------------------------------
function docSearchPatientReports(query) {
  const el = document.getElementById('docReportSearchResults');
  if (!query || query.length < 2) { el.innerHTML = ''; return; }

  const matches = STATE.allPatients.filter(p =>
    (p.firstName + ' ' + p.lastName).toLowerCase().includes(query.toLowerCase()) ||
    (p.aadhaar || '').includes(query)
  );

  el.innerHTML = matches.map(p => `
    <div class="patient-card" onclick="docLoadPatientReports('${p.uid}')">
      <div class="patient-avatar">${getInitials(p.firstName, p.lastName)}</div>
      <div class="patient-info">
        <div class="patient-name">${p.firstName} ${p.lastName}</div>
        <div class="patient-meta">Blood: ${p.bloodGroup || '--'} | Age: ${p.age || '--'}</div>
        ${(p.allergies || []).length ? `<div class="patient-alert"><i class="fas fa-exclamation-triangle"></i>${p.allergies.join(', ')}</div>` : ''}
      </div>
    </div>
  `).join('') || '<div style="padding:12px;color:var(--text3);font-size:13px">No patients found</div>';
}

function docLoadPatientReports(uid) {
  const p = STATE.allPatients.find(pt => pt.uid === uid);
  if (!p) return;

  document.getElementById('docReportSearchResults').innerHTML = '';
  document.getElementById('docReportSearch').value = '';

  const reps   = p.reports || [];
  const icons  = { lab: 'vial', imaging: 'x-ray', other: 'file-medical' };
  const colors = { lab: 'lab', imaging: 'imaging', other: 'other' };

  document.getElementById('docPatientReportsDisplay').innerHTML = `
    <div class="card">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
        <div class="patient-avatar">${getInitials(p.firstName, p.lastName)}</div>
        <div>
          <div style="font-size:16px;font-weight:700">${p.firstName} ${p.lastName}</div>
          <div style="font-size:12px;color:var(--text2)">${generateESHRId(p.uid)} | Blood: ${p.bloodGroup || '--'} | Age: ${p.age || '--'}</div>
        </div>
        ${(p.allergies || []).length ? `<div style="margin-left:auto">${p.allergies.map(a => `<span class="tag tag-red">${a}</span>`).join(' ')}</div>` : ''}
      </div>
      <div class="divider"></div>
      <div class="card-title"><i class="fas fa-file-medical"></i> Reports (${reps.length})</div>
      ${reps.length ? reps.map(r => `
        <div class="report-item">
          <div class="report-icon ${colors[r.category] || 'lab'}"><i class="fas fa-${icons[r.category] || 'vial'}"></i></div>
          <div class="report-info">
            <div class="report-name">${r.name}</div>
            <div class="report-meta">${r.hospital || ''} • ${formatDate(r.date)}</div>
            <div class="report-notes">${r.notes || ''}</div>
          </div>
          ${r.imageUrl ? `<a href="${r.imageUrl}" target="_blank" class="btn btn-secondary btn-xs"><i class="fas fa-eye"></i></a>` : ''}
          <span class="tag tag-blue">${r.category || 'lab'}</span>
        </div>
      `).join('') : '<div class="empty-state" style="padding:20px"><i class="fas fa-file-medical"></i><p>No reports on record</p></div>'}

      <div class="divider"></div>
      <div class="card-title"><i class="fas fa-pills"></i> Prescriptions (${(p.prescriptions || []).length})</div>
      ${(p.prescriptions || []).length ? (p.prescriptions || []).map(rx => `
        <div class="rx-card" style="margin-bottom:10px">
          <div class="rx-card-header">
            <div>
              <div class="rx-doctor-name">${rx.doctor || 'Doctor'}</div>
              <div class="rx-doctor-date">${formatDate(rx.date)}</div>
            </div>
            <span class="tag tag-green">Rx</span>
          </div>
          ${(rx.medicines || []).map((m, i) => `
            <div class="rx-med-item">
              <div class="rx-med-num">${i + 1}</div>
              <div>
                <div class="rx-med-name">${m.name}${m.dosage ? ' — ' + m.dosage : ''}</div>
                <div class="rx-med-detail">${m.frequency || ''} • ${m.duration || ''} • ${m.timing || ''}</div>
              </div>
            </div>
          `).join('')}
        </div>
      `).join('') : '<div class="empty-state" style="padding:20px"><i class="fas fa-prescription"></i><p>No prescriptions</p></div>'}
    </div>`;
}
