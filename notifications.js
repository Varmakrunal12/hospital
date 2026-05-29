// ============================================================
// notifications.js  —  E-SHR Notification & Allergy Alert System
// ============================================================
// Features:
//   1. In-app notification panel
//   2. Toast messages (success / error / info / warning)
//   3. ⚠️  ALLERGY ALERT: instant popup + email when a prescribed
//          medicine matches or is related to a known patient allergy
// ============================================================

// ── In-app notifications store ───────────────────────────────
let _notifications = JSON.parse(localStorage.getItem("eshr_notifications") || "[]");

function saveNotifications() {
  // Keep last 50
  _notifications = _notifications.slice(0, 50);
  localStorage.setItem("eshr_notifications", JSON.stringify(_notifications));
}

function addNotification(title, body, type = "info") {
  const notif = {
    id   : Date.now(),
    title,
    body,
    type,            // "info" | "warning" | "danger" | "success"
    read : false,
    time : new Date().toISOString(),
  };
  _notifications.unshift(notif);
  saveNotifications();
  renderNotifPanel();
  updateNotifDot();
}

function markAllRead() {
  _notifications.forEach(n => n.read = true);
  saveNotifications();
  renderNotifPanel();
  updateNotifDot();
}

function updateNotifDot() {
  const unread = _notifications.filter(n => !n.read).length;
  const dot    = document.getElementById("notifDot");
  if (dot) dot.style.display = unread > 0 ? "block" : "none";
}

function renderNotifPanel() {
  const list = document.getElementById("notifList");
  if (!list) return;

  if (!_notifications.length) {
    list.innerHTML = `<div class="empty-state" style="padding:24px">
      <i class="fas fa-bell-slash"></i><p>No notifications</p></div>`;
    return;
  }

  const colors = { info:"var(--accent)", warning:"var(--yellow)",
                   danger:"var(--red)", success:"var(--green)" };
  const icons  = { info:"fa-info-circle", warning:"fa-exclamation-triangle",
                   danger:"fa-exclamation-circle", success:"fa-check-circle" };

  list.innerHTML = _notifications.map(n => `
    <div class="notif-item${n.read ? "" : " unread"}" onclick="markRead(${n.id})">
      <div class="notif-icon" style="color:${colors[n.type]||colors.info}">
        <i class="fas ${icons[n.type]||icons.info}"></i>
      </div>
      <div class="notif-body">
        <div class="notif-title">${n.title}</div>
        <div class="notif-msg">${n.body}</div>
        <div class="notif-time">${formatRelativeTime(n.time)}</div>
      </div>
    </div>`).join("");
}

function markRead(id) {
  const n = _notifications.find(x => x.id === id);
  if (n) n.read = true;
  saveNotifications();
  renderNotifPanel();
  updateNotifDot();
}

function toggleNotifPanel() {
  const panel = document.getElementById("notifPanel");
  if (panel) panel.classList.toggle("open");
  renderNotifPanel();
  updateNotifDot();
}

function formatRelativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m    = Math.floor(diff / 60000);
  if (m < 1)  return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ============================================================
// TOAST SYSTEM
// ============================================================
function showToast(message, type = "info", duration = 3500) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const icons = {
    success : "fa-check-circle",
    error   : "fa-times-circle",
    warning : "fa-exclamation-triangle",
    info    : "fa-info-circle",
  };

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="fas ${icons[type]||icons.info}"></i>
    <span>${message}</span>
    <button onclick="this.parentElement.remove()" style="background:none;border:none;color:inherit;cursor:pointer;margin-left:8px;font-size:14px">&times;</button>`;

  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ============================================================
// ⚠️  ALLERGY ALERT SYSTEM
// ============================================================
// Known medicine-allergy cross-reactions database
// Each entry: { medicine keywords, allergy keywords, severity }
const ALLERGY_CROSS_REACTIONS = [
  // Penicillin family
  { med: ["amoxicillin","amoxil","ampicillin","penicillin","augmentin","piperacillin","oxacillin","flucloxacillin"],
    allergy: ["penicillin","amoxicillin","ampicillin"],
    severity: "CRITICAL", note: "Direct penicillin allergy match" },

  // Cephalosporins (cross-react with penicillin ~1–10%)
  { med: ["cephalexin","cefuroxime","ceftriaxone","cefazolin","cefalexin","cefixime","cefpodoxime"],
    allergy: ["penicillin","cephalosporin"],
    severity: "HIGH", note: "Cephalosporin — cross-reactivity with penicillin allergy" },

  // Sulfa drugs
  { med: ["sulfamethoxazole","trimethoprim","bactrim","septran","cotrimoxazole","sulfadiazine"],
    allergy: ["sulfa","sulfamethoxazole","sulfonamide"],
    severity: "CRITICAL", note: "Sulfa drug allergy match" },

  // Aspirin / NSAIDs
  { med: ["aspirin","ibuprofen","naproxen","diclofenac","ketoprofen","indomethacin","piroxicam","mefenamic"],
    allergy: ["aspirin","nsaid","ibuprofen","naproxen"],
    severity: "HIGH", note: "NSAID allergy — possible cross-reactivity" },

  // ACE Inhibitors
  { med: ["enalapril","lisinopril","ramipril","captopril","perindopril","quinapril"],
    allergy: ["ace inhibitor","enalapril","lisinopril"],
    severity: "HIGH", note: "ACE inhibitor allergy match" },

  // Statins
  { med: ["atorvastatin","rosuvastatin","simvastatin","lovastatin","pravastatin"],
    allergy: ["statin","atorvastatin","rosuvastatin"],
    severity: "MEDIUM", note: "Statin allergy — monitor for myopathy" },

  // Opioids
  { med: ["morphine","codeine","tramadol","oxycodone","hydrocodone","fentanyl","pethidine","meperidine"],
    allergy: ["morphine","codeine","opioid","opiate"],
    severity: "HIGH", note: "Opioid allergy match" },

  // Contrast dye (for imaging)
  { med: ["iodine","iodixanol","iohexol","contrast","omnipaque"],
    allergy: ["iodine","contrast","shellfish"],
    severity: "HIGH", note: "Iodine/contrast allergy — potential anaphylaxis risk" },

  // Latex (in some medical equipment / medications)
  { med: ["latex"],
    allergy: ["latex","rubber"],
    severity: "MEDIUM", note: "Latex allergy — check equipment" },

  // Antihistamines (rare allergy but documented)
  { med: ["diphenhydramine","cetirizine","loratadine","fexofenadine","chlorphenamine"],
    allergy: ["antihistamine","diphenhydramine"],
    severity: "MEDIUM", note: "Antihistamine allergy match" },
];

/**
 * checkAllergyAlert
 * Call this whenever a medicine is added to a prescription.
 *
 * @param {string}   medicineName  — name of the prescribed medicine
 * @param {string[]} patientAllergies — array of patient's known allergies
 * @param {string}   patientEmail  — email to send alert to (optional)
 * @param {string}   patientName   — patient name (for email)
 * @returns {object|null} — reaction object if found, null if safe
 */
async function checkAllergyAlert(medicineName, patientAllergies, patientEmail, patientName) {
  if (!medicineName || !patientAllergies || !patientAllergies.length) return null;

  const medLower      = medicineName.toLowerCase();
  const allergyLower  = patientAllergies.map(a => a.toLowerCase());

  let matchedReaction = null;

  // 1) Direct allergy name match against medicine name
  for (const allergy of allergyLower) {
    if (medLower.includes(allergy) || allergy.includes(medLower)) {
      matchedReaction = {
        medicine : medicineName,
        allergy  : allergy,
        severity : "CRITICAL",
        note     : "Direct allergy match",
      };
      break;
    }
  }

  // 2) Cross-reaction database check
  if (!matchedReaction) {
    for (const rule of ALLERGY_CROSS_REACTIONS) {
      const medMatches     = rule.med.some(m => medLower.includes(m) || m.includes(medLower.split(" ")[0]));
      const allergyMatches = rule.allergy.some(a => allergyLower.some(pa => pa.includes(a) || a.includes(pa)));

      if (medMatches && allergyMatches) {
        matchedReaction = {
          medicine : medicineName,
          allergy  : allergyLower.find(pa => rule.allergy.some(a => pa.includes(a) || a.includes(pa))),
          severity : rule.severity,
          note     : rule.note,
        };
        break;
      }
    }
  }

  if (!matchedReaction) return null;

  // ── TRIGGER ALERTS ──────────────────────────────────────
  triggerAllergyAlertUI(matchedReaction, patientName);
  addNotification(
    `⚠️ Allergy Alert: ${matchedReaction.medicine}`,
    `${matchedReaction.note}. Patient allergy: ${matchedReaction.allergy}. Severity: ${matchedReaction.severity}`,
    matchedReaction.severity === "CRITICAL" ? "danger" : "warning"
  );

  // Send email alert if email provided
  if (patientEmail) {
    await sendAllergyAlertEmail(patientEmail, patientName, matchedReaction);
  }

  return matchedReaction;
}

// ── Show allergy alert popup in UI ──────────────────────────
function triggerAllergyAlertUI(reaction, patientName) {
  const sevColor  = reaction.severity === "CRITICAL" ? "#ff4757" :
                    reaction.severity === "HIGH"     ? "#ff6b35" : "#ffa94d";
  const sevIcon   = reaction.severity === "CRITICAL" ? "🚨" :
                    reaction.severity === "HIGH"     ? "⚠️" : "⚡";

  // Remove existing alert if any
  const existing = document.getElementById("allergyAlertOverlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "allergyAlertOverlay";
  overlay.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;
    background:rgba(0,0,0,0.75);z-index:99999;
    display:flex;align-items:center;justify-content:center;
    animation:fadeIn 0.2s ease;
  `;

  overlay.innerHTML = `
    <div style="
      background:#1a1d2e;border:2px solid ${sevColor};border-radius:20px;
      padding:32px;max-width:460px;width:90%;text-align:center;
      box-shadow:0 0 40px ${sevColor}55;
      animation:slideUp 0.3s ease;
    ">
      <div style="font-size:52px;margin-bottom:12px">${sevIcon}</div>
      <div style="color:${sevColor};font-size:22px;font-weight:800;margin-bottom:6px;letter-spacing:0.5px">
        ALLERGY ALERT
      </div>
      <div style="color:#fff;font-size:16px;font-weight:600;margin-bottom:16px">
        ${reaction.severity} RISK DETECTED
      </div>
      <div style="background:rgba(255,255,255,0.06);border-radius:12px;padding:16px;margin-bottom:16px;text-align:left">
        <div style="margin-bottom:8px;font-size:13px;color:#aaa">PRESCRIBED MEDICINE</div>
        <div style="color:#fff;font-size:15px;font-weight:700">💊 ${reaction.medicine}</div>
        <div style="margin-top:12px;margin-bottom:8px;font-size:13px;color:#aaa">PATIENT ALLERGY</div>
        <div style="color:${sevColor};font-size:15px;font-weight:700">🚫 ${reaction.allergy}</div>
        <div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.1);
             font-size:12px;color:#ccc;line-height:1.6">
          ${reaction.note}
        </div>
      </div>
      ${patientName ? `<div style="font-size:13px;color:#aaa;margin-bottom:16px">Patient: <strong style="color:#fff">${patientName}</strong></div>` : ""}
      <div style="display:flex;gap:10px;justify-content:center">
        <button onclick="document.getElementById('allergyAlertOverlay').remove()"
          style="background:${sevColor};color:#fff;border:none;border-radius:10px;
                 padding:12px 24px;font-weight:700;cursor:pointer;font-size:14px">
          Acknowledged — Remove Medicine
        </button>
        <button onclick="document.getElementById('allergyAlertOverlay').remove()"
          style="background:rgba(255,255,255,0.1);color:#fff;border:1px solid rgba(255,255,255,0.2);
                 border-radius:10px;padding:12px 24px;font-weight:600;cursor:pointer;font-size:14px">
          Override (High Risk)
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Auto-close on overlay click
  overlay.addEventListener("click", e => {
    if (e.target === overlay) overlay.remove();
  });

  // Also trigger toast
  showToast(
    `⚠️ ALLERGY ALERT: ${reaction.medicine} conflicts with ${reaction.allergy} allergy!`,
    "warning",
    8000
  );
}

// ── Send email alert via EmailJS ─────────────────────────────
async function sendAllergyAlertEmail(email, patientName, reaction) {
  // Reuse EmailJS config from auth.js
  const isConfigured = typeof EMAILJS_SERVICE_ID  !== "undefined" &&
                       EMAILJS_SERVICE_ID          !== "YOUR_SERVICE_ID";

  if (!isConfigured) {
    console.warn("EmailJS not configured — allergy alert email not sent");
    return;
  }

  try {
    emailjs.init(EMAILJS_PUBLIC_KEY);
    // Use a separate template for allergy alerts, or reuse with different params
    await emailjs.send(EMAILJS_SERVICE_ID, "template_allergy_alert", {
      to_email       : email,
      patient_name   : patientName || "Patient",
      medicine_name  : reaction.medicine,
      allergy_name   : reaction.allergy,
      severity       : reaction.severity,
      alert_note     : reaction.note,
      timestamp      : new Date().toLocaleString(),
    });
    console.log("Allergy alert email sent to", email);
  } catch (e) {
    console.error("Failed to send allergy alert email:", e);
  }
}

// ============================================================
// Render allergy check in Doctor's prescription UI
// ============================================================
function renderAllergyCheckResult(results) {
  const el = document.getElementById("allergyCheckResult");
  if (!el) return;

  if (!results || !results.length) {
    el.innerHTML = `<div style="display:flex;align-items:center;gap:10px;
      padding:12px;background:rgba(0,229,160,0.08);border-radius:10px;
      border:1px solid rgba(0,229,160,0.2)">
      <i class="fas fa-check-circle" style="color:var(--green);font-size:20px"></i>
      <div>
        <div style="font-weight:700;color:var(--green)">No Allergy Conflicts</div>
        <div style="font-size:12px;color:var(--text2)">All prescribed medicines appear safe for this patient.</div>
      </div>
    </div>`;
    return;
  }

  el.innerHTML = results.map(r => {
    const color = r.severity === "CRITICAL" ? "var(--red)" :
                  r.severity === "HIGH"     ? "var(--orange)" : "var(--yellow)";
    return `<div style="display:flex;align-items:flex-start;gap:10px;
      padding:12px;background:rgba(255,71,87,0.08);border-radius:10px;
      border:1px solid rgba(255,71,87,0.2);margin-bottom:10px">
      <i class="fas fa-exclamation-triangle" style="color:${color};font-size:18px;margin-top:2px"></i>
      <div>
        <div style="font-weight:700;color:${color}">${r.severity} RISK: ${r.medicine}</div>
        <div style="font-size:12px;color:var(--text2);margin-top:3px">Allergy: ${r.allergy}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:3px">${r.note}</div>
      </div>
    </div>`;
  }).join("");
}

// ============================================================
// Init on DOMContentLoaded
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  renderNotifPanel();
  updateNotifDot();

  // Add CSS for typing indicator and animations if not present
  if (!document.getElementById("notifExtraCSS")) {
    const style = document.createElement("style");
    style.id = "notifExtraCSS";
    style.textContent = `
      @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
      @keyframes slideUp { from { transform:translateY(30px);opacity:0 } to { transform:translateY(0);opacity:1 } }

      .ai-typing { display:flex;gap:5px;align-items:center;padding:4px 0 }
      .ai-typing span {
        width:8px;height:8px;border-radius:50%;
        background:var(--accent);display:inline-block;
        animation:bounce 1.2s infinite;
      }
      .ai-typing span:nth-child(2) { animation-delay:0.2s }
      .ai-typing span:nth-child(3) { animation-delay:0.4s }
      @keyframes bounce {
        0%,80%,100% { transform:translateY(0);opacity:0.6 }
        40% { transform:translateY(-6px);opacity:1 }
      }

      .toast {
        display:flex;align-items:center;gap:10px;
        padding:12px 18px;border-radius:12px;
        font-size:13px;font-weight:600;
        color:#fff;box-shadow:0 4px 20px rgba(0,0,0,0.3);
        margin-top:8px;opacity:0;transform:translateX(60px);
        transition:all 0.3s ease;min-width:240px;max-width:400px;
        backdrop-filter:blur(10px);
      }
      .toast.show { opacity:1;transform:translateX(0) }
      .toast-success { background:rgba(0,229,160,0.9);border:1px solid var(--green) }
      .toast-error   { background:rgba(255,71,87,0.9);border:1px solid var(--red) }
      .toast-warning { background:rgba(255,169,77,0.9);border:1px solid var(--orange);color:#000 }
      .toast-info    { background:rgba(0,212,255,0.9);border:1px solid var(--accent);color:#000 }

      #toast-container {
        position:fixed;bottom:20px;right:20px;z-index:99998;
        display:flex;flex-direction:column-reverse;gap:8px;
      }

      .notif-panel { position:fixed;top:60px;right:16px;width:320px;
        background:var(--card);border:1px solid var(--border);
        border-radius:16px;z-index:9999;box-shadow:0 8px 32px rgba(0,0,0,0.4);
        display:none;max-height:480px;overflow:hidden;flex-direction:column }
      .notif-panel.open { display:flex }
      .notif-header { padding:14px 16px;border-bottom:1px solid var(--border);
        display:flex;justify-content:space-between;align-items:center }
      .notif-list { overflow-y:auto;flex:1 }
      .notif-item { display:flex;gap:12px;padding:12px 16px;
        border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.2s }
      .notif-item:hover { background:rgba(255,255,255,0.04) }
      .notif-item.unread { background:rgba(0,212,255,0.05) }
      .notif-icon { font-size:18px;margin-top:2px }
      .notif-title { font-size:13px;font-weight:700;margin-bottom:3px }
      .notif-msg { font-size:12px;color:var(--text2);line-height:1.5 }
      .notif-time { font-size:11px;color:var(--text3);margin-top:4px }
      .notif-dot { width:8px;height:8px;background:var(--red);
        border-radius:50%;position:absolute;top:6px;right:6px }
    `;
    document.head.appendChild(style);
  }
});
