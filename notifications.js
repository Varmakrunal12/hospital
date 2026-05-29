// ============================================================
// doctor.js  —  Doctor-side logic  (Prescriptions + Allergy Check)
// ============================================================

let _rxMedicines       = [];         // medicines in current prescription draft
let _selectedRxPatient = null;       // currently selected patient for prescription
let _allergyCheckResults = [];       // accumulate alerts for current prescription

// ── Medicine suggestions (common medicines) ─────────────────
const MEDICINE_SUGGESTIONS = [
  "Amoxicillin 500mg", "Augmentin 625mg", "Azithromycin 500mg",
  "Ciprofloxacin 500mg", "Doxycycline 100mg", "Metronidazole 400mg",
  "Cephalexin 500mg", "Cefuroxime 500mg", "Ceftriaxone 1g Injection",
  "Paracetamol 500mg", "Ibuprofen 400mg", "Aspirin 75mg",
  "Diclofenac 50mg", "Naproxen 500mg", "Tramadol 50mg",
  "Omeprazole 20mg", "Pantoprazole 40mg", "Ranitidine 150mg",
  "Atorvastatin 10mg", "Rosuvastatin 10mg", "Metformin 500mg",
  "Amlodipine 5mg", "Lisinopril 5mg", "Enalapril 5mg",
  "Losartan 50mg", "Telmisartan 40mg", "Ramipril 5mg",
  "Salbutamol Inhaler", "Montelukast 10mg", "Cetirizine 10mg",
  "Loratadine 10mg", "Fexofenadine 120mg", "Diphenhydramine 25mg",
  "Amoxicillin + Clavulanate 625mg", "Sulfamethoxazole + Trimethoprim",
  "Morphine 10mg", "Codeine 30mg", "Tramadol 100mg",
  "Gabapentin 300mg", "Pregabalin 75mg", "Sertraline 50mg",
  "Fluoxetine 20mg", "Amitriptyline 25mg", "Clonazepam 0.5mg",
];

// ── Patient search for doctor dashboard ─────────────────────
async function docSearchPatient(val) {
  const out = document.getElementById("docSearchResults");
  if (!out) return;
  if (val.trim().length < 2) { out.innerHTML = ""; return; }

  const results = await searchPatients(val.trim().toLowerCase());
  if (!results.length) {
    out.innerHTML = `<div style="padding:10px;color:var(--text3);font-size:13px">No patients found</div>`;
    return;
  }
  out.innerHTML = results.map(p => `
    <div class="search-result-item" onclick="selectDocPatient('${p.aadhar}')">
      <div style="font-weight:700">${p.firstName} ${p.lastName}</div>
      <div style="font-size:12px;color:var(--text2)">${p.eshrId} | Aadhar: ****${p.aadhar.slice(-4)}</div>
    </div>`).join("");
}

async function selectDocPatient(aadhar) {
  const patient = await getPatientByAadhar(aadhar);
  if (!patient) return;

  window._docSelectedPatient = patient;

  document.getElementById("docSearchResults").innerHTML = "";
  document.getElementById("docSearchInput").value =
    `${patient.firstName} ${patient.lastName}`;

  document.getElementById("docCurrentPatientCard").style.display = "block";
  document.getElementById("docPatientAvatar").textContent =
    (patient.firstName || "?")[0].toUpperCase();
  document.getElementById("docPatientName").textContent =
    `${patient.firstName} ${patient.lastName}`;
  document.getElementById("docPatientMeta").textContent =
    `ID: ${patient.eshrId} | Age: ${patient.age || "N/A"} | Blood: ${patient.bloodGroup || "N/A"}`;

  // Show allergies
  const allergyEl = document.getElementById("docPatientAllergies");
  const allergies  = getAllergiesArray(patient);
  allergyEl.innerHTML = allergies.length
    ? allergies.map(a => `<span class="tag tag-red">🚫 ${a}</span>`).join(" ")
    : `<span class="tag tag-green">No known allergies</span>`;
}

// ── Patient search for prescription page ────────────────────
async function rxSearchPatient(val) {
  const out = document.getElementById("rxPatientResults");
  if (!out) return;
  if (val.trim().length < 2) { out.innerHTML = ""; return; }

  const results = await searchPatients(val.trim().toLowerCase());
  out.innerHTML = results.map(p => `
    <div class="search-result-item" onclick="selectRxPatient('${p.aadhar}')">
      <div style="font-weight:700">${p.firstName} ${p.lastName}</div>
      <div style="font-size:12px;color:var(--text2)">${p.eshrId}</div>
    </div>`).join("");
}

async function selectRxPatient(aadhar) {
  const patient = await getPatientByAadhar(aadhar);
  if (!patient) return;

  _selectedRxPatient = patient;
  document.getElementById("rxPatientResults").innerHTML = "";
  document.getElementById("rxPatientSearch").value =
    `${patient.firstName} ${patient.lastName}`;

  document.getElementById("rxSelectedPatient").style.display = "block";
  document.getElementById("rxPatientAvatar").textContent =
    (patient.firstName || "?")[0].toUpperCase();
  document.getElementById("rxPatientName").textContent =
    `${patient.firstName} ${patient.lastName}`;
  document.getElementById("rxPatientMeta").textContent =
    `${patient.eshrId} | Blood: ${patient.bloodGroup || "N/A"} | Age: ${patient.age || "N/A"}`;

  // Reset allergy check results
  _allergyCheckResults = [];
  renderAllergyCheckResult([]);
}

// ── Add medicine to prescription (with allergy check) ───────
async function addRxMedicine() {
  const name = document.getElementById("rxMedName").value.trim();
  if (!name) return showToast("Enter medicine name", "error");

  const dosage    = document.getElementById("rxDosage").value.trim()    || "—";
  const frequency = document.getElementById("rxFrequency").value         || "Once daily";
  const duration  = document.getElementById("rxDuration").value.trim()  || "—";
  const timing    = document.getElementById("rxTiming").value            || "After meals";

  const med = { name, dosage, frequency, duration, timing };
  _rxMedicines.push(med);

  // ── ⚠️  ALLERGY CHECK ───────────────────────────────────
  if (_selectedRxPatient) {
    const allergies = getAllergiesArray(_selectedRxPatient);
    if (allergies.length) {
      const reaction = await checkAllergyAlert(
        name,
        allergies,
        _selectedRxPatient.email,
        `${_selectedRxPatient.firstName} ${_selectedRxPatient.lastName}`
      );
      if (reaction) _allergyCheckResults.push(reaction);
      renderAllergyCheckResult(_allergyCheckResults);
    }
  }

  renderRxMedicineList();
  clearMedForm();
}

function clearMedForm() {
  document.getElementById("rxMedName").value     = "";
  document.getElementById("rxDosage").value      = "";
  document.getElementById("rxDuration").value    = "";
  document.getElementById("rxMedSuggestions").innerHTML = "";
}

function removeRxMedicine(idx) {
  _rxMedicines.splice(idx, 1);
  // Rerun allergy check for remaining medicines
  _allergyCheckResults = [];
  renderAllergyCheckResult([]);
  renderRxMedicineList();
  if (_selectedRxPatient && _rxMedicines.length) {
    (async () => {
      const allergies = getAllergiesArray(_selectedRxPatient);
      for (const m of _rxMedicines) {
        const r = await checkAllergyAlert(m.name, allergies, null, null); // silent (no email)
        if (r) _allergyCheckResults.push(r);
      }
      renderAllergyCheckResult(_allergyCheckResults);
    })();
  }
}

function renderRxMedicineList() {
  const el = document.getElementById("rxMedicineList");
  if (!el) return;
  if (!_rxMedicines.length) { el.innerHTML = ""; return; }

  el.innerHTML = `<div style="margin-bottom:12px">` +
    _rxMedicines.map((m, i) => `
      <div class="rx-med-item" style="
        display:flex;align-items:center;justify-content:space-between;
        background:rgba(0,212,255,0.06);border:1px solid rgba(0,212,255,0.15);
        border-radius:10px;padding:10px 14px;margin-bottom:8px">
        <div>
          <div style="font-weight:700;font-size:14px">💊 ${m.name}</div>
          <div style="font-size:12px;color:var(--text2);margin-top:3px">
            ${m.dosage} · ${m.frequency} · ${m.duration} · ${m.timing}
          </div>
        </div>
        <button onclick="removeRxMedicine(${i})"
          style="background:rgba(255,71,87,0.15);color:var(--red);border:none;
                 border-radius:8px;padding:6px 10px;cursor:pointer;font-size:12px">
          <i class="fas fa-trash"></i>
        </button>
      </div>`).join("") + `</div>`;
}

// ── Medicine name autocomplete ───────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const inp = document.getElementById("rxMedName");
  const sug = document.getElementById("rxMedSuggestions");
  if (!inp || !sug) return;

  inp.addEventListener("input", () => {
    const val = inp.value.toLowerCase().trim();
    if (!val) { sug.innerHTML = ""; return; }
    const matches = MEDICINE_SUGGESTIONS.filter(m => m.toLowerCase().includes(val)).slice(0, 6);
    sug.innerHTML = matches.map(m => `
      <div onclick="selectMedSuggestion('${m}')"
        style="padding:8px 12px;cursor:pointer;font-size:13px;
               border-bottom:1px solid var(--border);transition:background 0.15s"
        onmouseover="this.style.background='rgba(255,255,255,0.05)'"
        onmouseout="this.style.background='transparent'">
        💊 ${m}
      </div>`).join("");
  });

  document.addEventListener("click", e => {
    if (!inp.contains(e.target) && !sug.contains(e.target)) sug.innerHTML = "";
  });
});

function selectMedSuggestion(name) {
  document.getElementById("rxMedName").value = name;
  document.getElementById("rxMedSuggestions").innerHTML = "";
}

// ── Scan medicine (demo) ────────────────────────────────────
function scanMed() {
  const demo = MEDICINE_SUGGESTIONS[Math.floor(Math.random() * 5)];
  document.getElementById("rxMedName").value = demo;
  showToast(`Scanned: ${demo}`, "success");
}

// ── Save prescription ────────────────────────────────────────
async function savePrescription() {
  if (!_selectedRxPatient) return showToast("Please select a patient first", "error");
  if (!_rxMedicines.length) return showToast("Add at least one medicine", "error");

  const doctor  = window._currentUser;
  const patient = _selectedRxPatient;
  const notes   = document.getElementById("rxNotes").value.trim();

  const prescription = {
    patientAadhar : patient.aadhar,
    patientName   : `${patient.firstName} ${patient.lastName}`,
    patientId     : patient.eshrId,
    doctorAadhar  : doctor.aadhar,
    doctorName    : `Dr. ${doctor.firstName} ${doctor.lastName}`,
    medicines     : _rxMedicines,
    notes,
    allergyAlerts : _allergyCheckResults,
    date          : new Date().toISOString(),
    id            : "RX-" + Date.now(),
  };

  try {
    if (window._dbReady && window._db) {
      const { collection, addDoc, serverTimestamp } = window._fs;
      await addDoc(window._db && collection(window._db, "prescriptions"), {
        ...prescription,
        createdAt: serverTimestamp(),
      });
    } else {
      const rxList = JSON.parse(localStorage.getItem("eshr_prescriptions") || "[]");
      rxList.unshift(prescription);
      localStorage.setItem("eshr_prescriptions", JSON.stringify(rxList));
    }

    showToast("Prescription saved successfully ✓", "success");
    addNotification(
      "Prescription Added",
      `Prescription for ${patient.firstName} ${patient.lastName} saved with ${_rxMedicines.length} medicine(s).`,
      "success"
    );

    // Reset form
    _rxMedicines         = [];
    _allergyCheckResults = [];
    _selectedRxPatient   = null;
    renderRxMedicineList();
    renderAllergyCheckResult([]);
    document.getElementById("rxSelectedPatient").style.display = "none";
    document.getElementById("rxPatientSearch").value           = "";
    document.getElementById("rxNotes").value                   = "";

  } catch (e) {
    showToast("Failed to save prescription: " + e.message, "error");
  }
}

// ── Load doctor dashboard stats ──────────────────────────────
async function loadDocDashboard() {
  const doctor = window._currentUser;
  if (!doctor) return;

  document.getElementById("doctorWelcomeSub").textContent =
    `Welcome, Dr. ${doctor.firstName} ${doctor.lastName}`;
  document.getElementById("docStatDate").textContent = new Date().toLocaleDateString("en-IN", {
    weekday:"short", day:"numeric", month:"short"
  });

  // Count prescriptions issued by this doctor
  let allPrescriptions = [];
  try {
    if (window._dbReady && window._db) {
      const { collection, getDocs, query, where, orderBy, limit } = window._fs;
      const q    = query(
        collection(window._db, "prescriptions"),
        where("doctorAadhar", "==", doctor.aadhar),
        orderBy("date", "desc"), limit(10)
      );
      const snap = await getDocs(q);
      allPrescriptions = snap.docs.map(d => d.data());
    } else {
      const all = JSON.parse(localStorage.getItem("eshr_prescriptions") || "[]");
      allPrescriptions = all.filter(p => p.doctorAadhar === doctor.aadhar);
    }
  } catch (e) { /* ignore */ }

  const uniquePatients = [...new Set(allPrescriptions.map(p => p.patientAadhar))];
  const allergyAlerts  = allPrescriptions.filter(p => p.allergyAlerts && p.allergyAlerts.length).length;

  document.getElementById("docStatPatients").textContent     = uniquePatients.length;
  document.getElementById("docStatPrescriptions").textContent = allPrescriptions.length;
  document.getElementById("docStatAlerts").textContent       = allergyAlerts;

  // Recent prescriptions
  const el = document.getElementById("docRecentPrescriptions");
  if (el) {
    el.innerHTML = allPrescriptions.slice(0, 5).map(p => `
      <div class="rx-item" style="padding:12px;border-bottom:1px solid var(--border);display:flex;
           justify-content:space-between;align-items:center">
        <div>
          <div style="font-weight:700;font-size:13px">${p.patientName}</div>
          <div style="font-size:12px;color:var(--text2);margin-top:3px">
            ${(p.medicines||[]).map(m=>m.name).join(", ").slice(0,60)}
            ${p.allergyAlerts&&p.allergyAlerts.length ? ' <span class="tag tag-red">⚠️ Allergy Alert</span>' : ''}
          </div>
        </div>
        <div style="font-size:11px;color:var(--text3)">${formatDate(p.date)}</div>
      </div>`).join("") ||
    `<div class="empty-state"><i class="fas fa-prescription"></i><p>No prescriptions yet</p></div>`;
  }
}

// ── Search patient reports (doctor view) ─────────────────────
async function docSearchPatientReports(val) {
  const out = document.getElementById("docReportSearchResults");
  if (!out || val.trim().length < 2) { if(out) out.innerHTML=""; return; }

  const results = await searchPatients(val.trim().toLowerCase());
  out.innerHTML = results.map(p => `
    <div class="search-result-item" onclick="loadPatientReports('${p.aadhar}')">
      <div style="font-weight:700">${p.firstName} ${p.lastName}</div>
      <div style="font-size:12px;color:var(--text2)">${p.eshrId}</div>
    </div>`).join("");
}

async function loadPatientReports(aadhar) {
  const patient = await getPatientByAadhar(aadhar);
  if (!patient) return;

  document.getElementById("docReportSearchResults").innerHTML = "";
  document.getElementById("docReportSearch").value =
    `${patient.firstName} ${patient.lastName}`;

  // Load reports
  let reports = [];
  try {
    if (window._dbReady && window._db) {
      const { collection, getDocs, query, where, orderBy } = window._fs;
      const q    = query(
        collection(window._db, "reports"),
        where("patientAadhar", "==", aadhar),
        orderBy("date", "desc")
      );
      const snap = await getDocs(q);
      reports    = snap.docs.map(d => ({ id:d.id, ...d.data() }));
    } else {
      const all = JSON.parse(localStorage.getItem("eshr_reports") || "[]");
      reports   = all.filter(r => r.patientAadhar === aadhar);
    }
  } catch (e) { /* ignore */ }

  const el = document.getElementById("docPatientReportsDisplay");
  if (!el) return;
  el.innerHTML = `<div class="card">
    <div class="card-title"><i class="fas fa-user"></i> ${patient.firstName} ${patient.lastName}
      <span class="tag tag-blue" style="margin-left:8px">${patient.eshrId}</span>
    </div>` +
    (reports.length
      ? reports.map(r => `
          <div style="padding:12px;border-bottom:1px solid var(--border)">
            <div style="font-weight:700">${r.name || "Report"}</div>
            <div style="font-size:12px;color:var(--text2);margin-top:4px">${r.hospital||""} · ${formatDate(r.date)}</div>
            ${r.notes ? `<div style="font-size:12px;margin-top:6px;color:var(--text)">${r.notes}</div>` : ""}
          </div>`).join("")
      : `<div class="empty-state"><i class="fas fa-file-medical"></i><p>No reports found</p></div>`)
    + `</div>`;
}

// ── Helpers ─────────────────────────────────────────────────
function getAllergiesArray(patient) {
  if (!patient) return [];
  // Allergies can be stored as array or comma-separated string
  if (Array.isArray(patient.allergies)) return patient.allergies.filter(Boolean);
  if (typeof patient.allergies === "string" && patient.allergies.trim())
    return patient.allergies.split(",").map(a => a.trim()).filter(Boolean);
  return [];
}

async function searchPatients(query) {
  let results = [];
  try {
    if (window._dbReady && window._db) {
      const { collection, getDocs } = window._fs;
      const snap = await getDocs(collection(window._db, "users"));
      results = snap.docs
        .map(d => d.data())
        .filter(u => u.role === "patient" &&
          (`${u.firstName} ${u.lastName} ${u.eshrId} ${u.aadhar}`.toLowerCase().includes(query)));
    } else {
      const users = JSON.parse(localStorage.getItem("eshr_users") || "{}");
      results = Object.values(users).filter(u =>
        u.role === "patient" &&
        (`${u.firstName} ${u.lastName} ${u.eshrId} ${u.aadhar}`.toLowerCase().includes(query)));
    }
  } catch (e) { /* ignore */ }
  return results.slice(0, 8);
}

async function getPatientByAadhar(aadhar) {
  try {
    if (window._dbReady && window._db) {
      const { doc, getDoc } = window._fs;
      const snap = await getDoc(doc(window._db, "users", aadhar));
      return snap.exists() ? snap.data() : null;
    } else {
      const users = JSON.parse(localStorage.getItem("eshr_users") || "{}");
      return users[aadhar] || null;
    }
  } catch (e) { return null; }
}

function formatDate(iso) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" }); }
  catch (e) { return iso; }
}

function docScanQR() {
  showToast("QR scan feature requires camera permission. Use patient search for now.", "info");
}
