// ================================================================
// patient.js — Patient: Dashboard, Reports, Prescriptions,
//              Allergies, Emergency QR
// ================================================================

// ---------------------------------------------------------------
// DASHBOARD
// ---------------------------------------------------------------
function populateDashboard() {
  const u = STATE.userData;
  if (!u) return;

  document.getElementById('dashWelcomeName').textContent = u.firstName || 'User';

  const reps = u.reports       || [];
  const rxs  = u.prescriptions || [];
  const algs = u.allergies     || [];

  document.getElementById('statReports').textContent       = reps.length;
  document.getElementById('statPrescriptions').textContent = rxs.length;
  document.getElementById('statVisits').textContent        = rxs.length;
  document.getElementById('statAllergies').textContent     = algs.length;

  document.getElementById('dashBloodGroup').textContent = u.bloodGroup || '--';
  document.getElementById('dashAge').textContent        = u.age        || '--';
  document.getElementById('dashWeight').textContent     = u.weight     || '--';
  document.getElementById('dashHeight').textContent     = u.height     || '--';

  // Allergies
  const algDiv = document.getElementById('dashAllergies');
  algDiv.innerHTML = algs.length
    ? algs.map(a => `<span class="tag tag-red"><i class="fas fa-exclamation-triangle"></i> ${a}</span>`).join(' ')
    : '<span class="tag tag-green">No allergies on record</span>';

  // Emergency contacts
  const emgDiv = document.getElementById('dashEmergencyContacts');
  emgDiv.innerHTML = u.emergencyName
    ? `<i class="fas fa-phone" style="color:var(--green);margin-right:6px"></i>${u.emergencyName}: ${u.emergencyPhone || '—'}`
    : 'Not set — <a href="#" onclick="showPage(\'profile\')" style="color:var(--accent)">Add in Profile</a>';

  // Recent activity
  const all = [
    ...reps.map(r => ({ ...r, type: 'report',       sortDate: r.date })),
    ...rxs.map(r  => ({ ...r, type: 'prescription', sortDate: r.date })),
  ].sort((a, b) => new Date(b.sortDate) - new Date(a.sortDate)).slice(0, 6);

  const actDiv = document.getElementById('dashRecentActivity');
  if (!all.length) {
    actDiv.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>No recent activity</p></div>';
    return;
  }

  const icons  = { lab: 'vial', imaging: 'x-ray', other: 'file-medical' };
  const colors = { lab: 'lab', imaging: 'imaging', other: 'other' };

  actDiv.innerHTML = all.map(item => {
    if (item.type === 'prescription') {
      return `<div class="report-item" onclick="viewRx('${item.id}')">
        <div class="report-icon lab"><i class="fas fa-prescription"></i></div>
        <div class="report-info">
          <div class="report-name">Prescription by ${item.doctor || 'Doctor'}</div>
          <div class="report-meta">${item.doctor || ''} • ${formatDate(item.date)}</div>
        </div>
        <span class="tag tag-green">Rx</span>
      </div>`;
    } else {
      return `<div class="report-item" onclick="viewReport('${item.id}')">
        <div class="report-icon ${colors[item.category] || 'lab'}"><i class="fas fa-${icons[item.category] || 'vial'}"></i></div>
        <div class="report-info">
          <div class="report-name">${item.name || 'Report'}</div>
          <div class="report-meta">${item.hospital || ''} • ${formatDate(item.date)}</div>
          <div class="report-notes">${item.notes || ''}</div>
        </div>
        <span class="tag tag-blue">${item.category || 'lab'}</span>
      </div>`;
    }
  }).join('');
}

// ---------------------------------------------------------------
// HEALTH TIMELINE
// ---------------------------------------------------------------
function renderTimeline() {
  const u = STATE.userData;
  if (!u) return;
  const f = STATE.timelineFilter;

  let all = [
    ...(u.reports       || []).map(r => ({ ...r, type: 'report' })),
    ...(u.prescriptions || []).map(r => ({ ...r, type: 'prescription' })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (f !== 'all') all = all.filter(i =>
    (f === 'prescription' && i.type === 'prescription') ||
    (f === 'report'       && i.type === 'report')
  );

  const el = document.getElementById('timelineContainer');
  if (!all.length) {
    el.innerHTML = '<div class="empty-state"><i class="fas fa-stream"></i><p>No records for this filter</p></div>';
    return;
  }

  const colors = { lab: 'var(--accent)', imaging: 'var(--purple)', other: 'var(--orange)' };
  const icons  = { lab: 'vial', imaging: 'x-ray', other: 'file-medical' };

  el.innerHTML = all.map(item => {
    if (item.type === 'prescription') {
      return `<div class="timeline-item">
        <div class="timeline-dot rx"></div>
        <div class="timeline-date">${formatDate(item.date)}</div>
        <div class="timeline-card" onclick="viewRx('${item.id}')">
          <div class="timeline-type" style="color:var(--green)"><i class="fas fa-prescription"></i> PRESCRIPTION</div>
          <div class="timeline-title">Prescription by ${item.doctor || 'Doctor'}</div>
          <div class="timeline-detail">${item.doctor || ''} • ${item.indication || ''}</div>
        </div>
      </div>`;
    } else {
      return `<div class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="timeline-date">${formatDate(item.date)}</div>
        <div class="timeline-card" onclick="viewReport('${item.id}')">
          <div class="timeline-type" style="color:${colors[item.category] || colors.lab}">
            <i class="fas fa-${icons[item.category] || 'vial'}"></i> REPORT
          </div>
          <div class="timeline-title">${item.name}</div>
          <div class="timeline-detail">${item.hospital || ''} • ${item.notes || ''}</div>
          ${item.category ? `<span class="tag tag-blue" style="margin-top:6px">${item.category}</span>` : ''}
        </div>
      </div>`;
    }
  }).join('');
}

function filterTimeline(f) {
  STATE.timelineFilter = f;
  // Update button active states
  document.querySelectorAll('#tlFilterBar .btn').forEach(btn => {
    btn.className = btn.dataset.filter === f ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
  });
  renderTimeline();
}

// ---------------------------------------------------------------
// REPORTS
// ---------------------------------------------------------------
function renderReports() {
  const u = STATE.userData;
  if (!u) return;
  const f   = STATE.filterCategory;
  const reps = (u.reports || []).filter(r => f === 'all' || r.category === f)
                                .sort((a, b) => new Date(b.date) - new Date(a.date));

  const el = document.getElementById('reportsList');
  if (!reps.length) {
    el.innerHTML = '<div class="empty-state"><i class="fas fa-file-medical"></i><p>No reports found</p></div>';
    return;
  }

  const icons  = { lab: 'vial', imaging: 'x-ray', other: 'file-medical' };
  const colors = { lab: 'lab', imaging: 'imaging', other: 'other' };
  const tagCls = { lab: 'tag-blue', imaging: 'tag-purple', other: 'tag-orange' };

  el.innerHTML = reps.map(r => `
    <div class="report-item" onclick="viewReport('${r.id}')">
      <div class="report-icon ${colors[r.category] || 'lab'}"><i class="fas fa-${icons[r.category] || 'vial'}"></i></div>
      <div class="report-info">
        <div class="report-name">${r.name}</div>
        <div class="report-meta">${r.hospital || ''} • ${formatDate(r.date)}</div>
        <div class="report-notes">${r.notes || ''}</div>
      </div>
      <div class="report-actions">
        <span class="tag ${tagCls[r.category] || 'tag-blue'}">${r.category || 'lab'}</span>
      </div>
    </div>
  `).join('');
}

function filterReports(cat, el) {
  STATE.filterCategory = cat;
  document.querySelectorAll('#reportFilterPills .pill-option').forEach(p => p.classList.remove('active'));
  if (el) el.classList.add('active');
  renderReports();
}

function openAddReportModal() {
  document.getElementById('addRepDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('addRepName').value     = '';
  document.getElementById('addRepHospital').value = '';
  document.getElementById('addRepNotes').value    = '';
  document.getElementById('repImgPreview').style.display = 'none';
  document.getElementById('repImgName').textContent = 'Choose Image File';
  openModal('addReportModal');
}

async function saveReport() {
  const name     = document.getElementById('addRepName').value.trim();
  const category = document.getElementById('addRepCategory').value;
  const date     = document.getElementById('addRepDate').value;
  const hospital = document.getElementById('addRepHospital').value.trim();
  const notes    = document.getElementById('addRepNotes').value.trim();
  const imgFile  = document.getElementById('addRepImage').files[0];

  if (!name) { toast('Report name is required', 'error'); return; }
  if (!date) { toast('Date is required', 'error'); return; }

  setLoading('addRepSaveBtn', true, 'Saving...');

  let imageUrl = '';
  if (imgFile) imageUrl = await uploadToImgBB(imgFile);

  const report = {
    id: 'r' + Date.now(),
    name, category, date, hospital, notes, imageUrl,
    addedBy: 'patient',
    addedAt: new Date().toISOString(),
  };

  if (!STATE.userData.reports) STATE.userData.reports = [];
  STATE.userData.reports.push(report);

  await saveUserData();
  closeModal('addReportModal');
  renderReports();
  populateDashboard();

  addNotification({ title: 'Report Added', text: `${name} uploaded`, type: 'report', time: new Date().toISOString() });

  setLoading('addRepSaveBtn', false);
  toast('Report saved successfully!', 'success');
}

function viewReport(id) {
  const rep = (STATE.userData?.reports || []).find(r => r.id === id);
  if (!rep) { toast('Report not found', 'error'); return; }

  const icons = { lab: 'vial', imaging: 'x-ray', other: 'file-medical' };
  document.getElementById('viewReportContent').innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
      <div class="report-icon ${rep.category || 'lab'}" style="width:56px;height:56px;font-size:24px">
        <i class="fas fa-${icons[rep.category] || 'vial'}"></i>
      </div>
      <div>
        <div style="font-size:18px;font-weight:800">${rep.name}</div>
        <div style="font-size:13px;color:var(--text2)">${rep.hospital || ''} • ${formatDate(rep.date)}</div>
      </div>
      <span class="tag tag-blue" style="margin-left:auto">${rep.category || 'lab'}</span>
    </div>
    ${rep.notes ? `<div style="background:var(--bg2);border-radius:10px;padding:16px;margin-bottom:16px">
      <div style="font-size:11px;font-weight:700;color:var(--text2);margin-bottom:6px">DOCTOR NOTES</div>
      <div style="font-size:14px;line-height:1.6">${rep.notes}</div>
    </div>` : ''}
    ${rep.imageUrl ? `<div style="margin-bottom:16px">
      <div style="font-size:11px;font-weight:700;color:var(--text2);margin-bottom:8px">REPORT IMAGE</div>
      <img src="${rep.imageUrl}" style="width:100%;border-radius:10px;border:1px solid var(--border)" alt="Report">
    </div>` : ''}
    <div style="font-size:11px;color:var(--text3)">Added: ${formatDate(rep.addedAt)}</div>
  `;
  openModal('viewReportModal');
}

// ---------------------------------------------------------------
// PRESCRIPTIONS
// ---------------------------------------------------------------
function renderPrescriptions() {
  const rxs = (STATE.userData?.prescriptions || []).sort((a, b) => new Date(b.date) - new Date(a.date));
  const el  = document.getElementById('prescriptionsList');

  if (!rxs.length) {
    el.innerHTML = '<div class="empty-state"><i class="fas fa-pills"></i><p>No prescriptions yet</p></div>';
    return;
  }

  el.innerHTML = rxs.map(rx => `
    <div class="rx-card" onclick="viewRx('${rx.id}')">
      <div class="rx-card-header">
        <div>
          <div class="rx-doctor-name">${rx.doctor || 'Doctor'}</div>
          <div class="rx-doctor-date">${formatDate(rx.date)}</div>
        </div>
        <span class="tag tag-green"><i class="fas fa-prescription"></i> Rx</span>
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
      ${rx.indication ? `<div style="font-size:13px;color:var(--text2);margin-top:10px"><i class="fas fa-info-circle" style="color:var(--accent);margin-right:4px"></i>${rx.indication}</div>` : ''}
    </div>
  `).join('');
}

function viewRx(id) {
  const rx = (STATE.userData?.prescriptions || []).find(r => r.id === id);
  if (!rx) { toast('Prescription not found', 'error'); return; }

  document.getElementById('viewRxContent').innerHTML = `
    <div style="margin-bottom:20px">
      <div style="font-size:18px;font-weight:800;margin-bottom:4px">Prescription</div>
      <div style="font-size:14px;color:var(--text2)">${rx.doctor || ''} • ${formatDate(rx.date)}</div>
    </div>
    ${(rx.medicines || []).map((m, i) => `
      <div class="rx-med-item" style="margin-bottom:10px">
        <div class="rx-med-num">${i + 1}</div>
        <div>
          <div class="rx-med-name">${m.name}${m.dosage ? ' — ' + m.dosage : ''}</div>
          <div class="rx-med-detail">${m.frequency || ''} • ${m.duration || ''} • ${m.timing || ''}</div>
        </div>
      </div>
    `).join('')}
    ${rx.indication ? `<div style="background:var(--bg2);border-radius:10px;padding:14px;margin-top:14px">
      <div style="font-size:11px;font-weight:700;color:var(--text2);margin-bottom:4px">INDICATION</div>
      <div style="font-size:14px">${rx.indication}</div>
    </div>` : ''}
    ${rx.notes ? `<div style="background:var(--bg2);border-radius:10px;padding:14px;margin-top:10px">
      <div style="font-size:11px;font-weight:700;color:var(--text2);margin-bottom:4px">ADDITIONAL NOTES</div>
      <div style="font-size:14px">${rx.notes}</div>
    </div>` : ''}
  `;
  openModal('viewRxModal');
}

// ---------------------------------------------------------------
// ALLERGIES
// ---------------------------------------------------------------
function renderAllergies() {
  const algs = STATE.userData?.allergies || [];
  const el   = document.getElementById('allergiesList');

  if (!algs.length) {
    el.innerHTML = '<div class="empty-state"><i class="fas fa-allergies"></i><p>No allergies on record</p></div>';
    return;
  }

  el.innerHTML = algs.map((a, i) => `
    <div style="display:flex;align-items:center;gap:12px;padding:14px;background:rgba(255,71,87,0.06);border:1px solid rgba(255,71,87,0.15);border-radius:12px;margin-bottom:8px">
      <i class="fas fa-exclamation-triangle" style="color:var(--red);font-size:20px"></i>
      <div style="flex:1;font-weight:600;font-size:14px">${a}</div>
      <button class="btn btn-danger btn-xs" onclick="deleteAllergy(${i})"><i class="fas fa-trash"></i></button>
    </div>
  `).join('');
}

function openAllergyModal() { openModal('allergyModal'); }

function saveAllergy() {
  const name = document.getElementById('newAllergyName').value.trim();
  if (!name) { toast('Enter allergy name', 'error'); return; }
  if (!STATE.userData.allergies) STATE.userData.allergies = [];
  if (STATE.userData.allergies.includes(name)) { toast('Allergy already exists', 'warning'); return; }
  STATE.userData.allergies.push(name);
  saveUserData();
  renderAllergies();
  populateDashboard();
  closeModal('allergyModal');
  document.getElementById('newAllergyName').value = '';
  toast('Allergy added', 'success');
}

// Bug fix: delete allergy was missing in original
function deleteAllergy(idx) {
  showConfirm('Remove Allergy', 'Are you sure you want to remove this allergy?', () => {
    STATE.userData.allergies.splice(idx, 1);
    saveUserData();
    renderAllergies();
    populateDashboard();
    toast('Allergy removed', 'info');
  });
}

// ---------------------------------------------------------------
// EMERGENCY QR VIEW
// ---------------------------------------------------------------
function renderEmergencyQR() {
  const u = STATE.userData;
  if (!u) return;

  document.getElementById('emergencyBloodGroup').textContent = u.bloodGroup || '--';
  document.getElementById('emergencyAge').textContent        = u.age        || '--';

  const algs = u.allergies || [];
  document.getElementById('emergencyAllergies').innerHTML = algs.length
    ? algs.map(a => `<span class="tag tag-red"><i class="fas fa-exclamation-triangle"></i> ${a}</span>`).join(' ')
    : '<span class="tag tag-green"><i class="fas fa-check"></i> No known allergies</span>';

  const rxs = u.prescriptions || [];
  if (rxs.length) {
    const latest = rxs[rxs.length - 1];
    document.getElementById('emergencyMeds').innerHTML =
      (latest.medicines || []).map(m => `<span class="tag tag-blue">${m.name}</span>`).join(' ');
  }

  const emgDiv = document.getElementById('emergencyContacts');
  if (u.emergencyName) {
    emgDiv.innerHTML = `
      <div style="display:flex;align-items:center;gap:14px;padding:14px;background:rgba(0,229,160,0.08);border:1px solid rgba(0,229,160,0.2);border-radius:12px">
        <i class="fas fa-user" style="font-size:20px;color:var(--green)"></i>
        <div style="flex:1">
          <div style="font-weight:700">${u.emergencyName}</div>
          <div style="font-size:13px;color:var(--text2)">${u.emergencyPhone || ''}</div>
        </div>
        <a href="tel:${u.emergencyPhone}" class="btn btn-success btn-sm"><i class="fas fa-phone"></i> Call</a>
      </div>`;
  } else {
    emgDiv.innerHTML = '<div style="text-align:center;padding:16px;color:var(--text3);font-size:13px">No emergency contacts added</div>';
  }

  // Redraw QR on canvas2
  const cv = document.getElementById('qrCanvas2');
  if (cv) drawQRCanvas(cv, STATE.currentUser?.uid || 'DEMO', parseInt(cv.getAttribute('width')) || 200);
}
