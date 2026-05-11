// ================================================================
// share.js — Share Medical Record (Time-Limited Links)
// ================================================================

let shareExpireInterval = null;

function generateShareLink() {
  const dur = parseInt(document.getElementById('shareDuration').value);
  const acc = document.getElementById('shareAccess').value;
  const token = Math.random().toString(36).slice(2, 10).toUpperCase();
  const link  = `${window.location.origin}${window.location.pathname}?share=${token}&access=${acc}`;

  document.getElementById('generatedLink').textContent = link;
  document.getElementById('shareLinkResult').style.display = 'block';

  // Start countdown timer
  if (shareExpireInterval) clearInterval(shareExpireInterval);
  let secs = dur * 60;

  const updateTimer = () => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    document.getElementById('shareTimer').textContent =
      `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    if (secs <= 0) {
      clearInterval(shareExpireInterval);
      document.getElementById('shareTimer').textContent = 'Expired';
    }
    secs--;
  };

  updateTimer();
  shareExpireInterval = setInterval(updateTimer, 1000);

  // Save to recent shares
  const share = {
    id: 'sh' + Date.now(),
    link, access: acc, duration: dur,
    createdAt: new Date().toISOString(),
  };
  if (!STATE.userData.shares) STATE.userData.shares = [];
  STATE.userData.shares.unshift(share);
  saveUserData();
  renderRecentShares();
  toast('Secure link generated!', 'success');
}

function renderRecentShares() {
  const shares = (STATE.userData?.shares || []).slice(0, 5);
  const el = document.getElementById('recentSharesList');
  if (!shares.length) {
    el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text3);font-size:13px">No recent shares</div>';
    return;
  }
  el.innerHTML = shares.map(s => `
    <div style="padding:12px;border:1px solid var(--border);border-radius:10px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:12px;font-weight:600">${s.access} access</div>
        <div style="font-size:11px;color:var(--text3)">${formatDate(s.createdAt)}</div>
      </div>
      <div style="font-size:11px;color:var(--text3);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.link}</div>
    </div>
  `).join('');
}

function copyShareLink() {
  const link = document.getElementById('generatedLink').textContent;
  navigator.clipboard.writeText(link)
    .then(() => toast('Link copied!', 'success'))
    .catch(() => toast('Copy failed', 'error'));
}

function shareViaWhatsApp() {
  const link = document.getElementById('generatedLink').textContent;
  window.open('https://wa.me/?text=' + encodeURIComponent('E-SHR Health Record Access: ' + link), '_blank');
}
