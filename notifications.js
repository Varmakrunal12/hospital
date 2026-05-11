// ================================================================
// notifications.js — In-App Notifications
// ================================================================

function setupNotifListener() {
  if (!STATE.notifications.length) {
    addNotification({
      title: 'Welcome to E-SHR',
      text: 'Your health records are secure.',
      type: 'system',
      time: new Date().toISOString(),
    });
    if (STATE.userRole === 'patient' && (STATE.userData?.prescriptions || []).length) {
      addNotification({
        title: 'Prescription Alert',
        text: 'You have ' + STATE.userData.prescriptions.length + ' active prescription(s).',
        type: 'prescription',
        time: new Date().toISOString(),
      });
    }
  }
}

function addNotification(notif) {
  STATE.notifications.unshift({ ...notif, id: 'n' + Date.now(), read: false });
  STATE.unreadNotif++;
  updateNotifBadge();
  renderNotifications();
}

function updateNotifBadge() {
  const dot = document.getElementById('notifDot');
  if (dot) dot.style.display = STATE.unreadNotif > 0 ? 'block' : 'none';
}

function toggleNotifPanel() {
  const p = document.getElementById('notifPanel');
  p.classList.toggle('open');
  if (p.classList.contains('open')) renderNotifications();
}

function closeNotifPanel() {
  document.getElementById('notifPanel').classList.remove('open');
}

function renderNotifications() {
  const el = document.getElementById('notifList');
  if (!STATE.notifications.length) {
    el.innerHTML = '<div class="empty-state" style="padding:24px"><i class="fas fa-bell-slash"></i><p>No notifications</p></div>';
    return;
  }

  const icons  = { prescription: 'fas fa-prescription', report: 'fas fa-file-medical', system: 'fas fa-info-circle', allergy: 'fas fa-exclamation-triangle' };
  const colors = { prescription: 'var(--green)', report: 'var(--accent)', system: 'var(--text2)', allergy: 'var(--red)' };

  el.innerHTML = STATE.notifications.map(n => `
    <div class="notif-item ${n.read ? '' : 'unread'}" onclick="readNotif('${n.id}')">
      <div style="display:flex;gap:10px;align-items:flex-start">
        <i class="${icons[n.type] || icons.system}" style="color:${colors[n.type] || colors.system};margin-top:2px;flex-shrink:0"></i>
        <div>
          <div class="notif-item-title">${n.title}</div>
          <div class="notif-item-sub">${n.text}</div>
          <div class="notif-item-time">${formatRelTime(n.time)}</div>
        </div>
      </div>
    </div>
  `).join('');
}

function readNotif(id) {
  const n = STATE.notifications.find(n => n.id === id);
  if (n && !n.read) {
    n.read = true;
    STATE.unreadNotif = Math.max(0, STATE.unreadNotif - 1);
    updateNotifBadge();
    renderNotifications();
  }
}

function markAllRead() {
  STATE.notifications.forEach(n => n.read = true);
  STATE.unreadNotif = 0;
  updateNotifBadge();
  renderNotifications();
}

// Close notif panel on outside click
document.addEventListener('click', e => {
  const panel = document.getElementById('notifPanel');
  const btn   = document.getElementById('notifBtn');
  if (panel && btn && !panel.contains(e.target) && !btn.contains(e.target)) {
    closeNotifPanel();
  }
});
