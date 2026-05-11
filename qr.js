// ================================================================
// qr.js — QR Code Generation & Download
// ================================================================

function generateQR() {
  const uid = STATE.currentUser?.uid || 'DEMO';
  document.getElementById('qrPatientId').textContent = 'ID: ' + generateESHRId(uid);

  ['qrCanvas', 'qrCanvas2'].forEach(id => {
    const cv = document.getElementById(id);
    if (!cv) return;
    const size = parseInt(cv.getAttribute('width')) || 180;
    drawQRCanvas(cv, uid, size);
  });
}

function drawQRCanvas(canvas, seed, size) {
  const ctx = canvas.getContext('2d');
  const cells = 21, cell = size / cells;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, size, size);
  const data = pseudoQRData(seed, cells * cells);
  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      if (isFinderZone(r, c, cells)) continue;
      if (data[r * cells + c]) {
        ctx.fillStyle = '#000';
        ctx.fillRect(c * cell, r * cell, cell, cell);
      }
    }
  }
  drawFinder(ctx, 0, 0, cell);
  drawFinder(ctx, (cells - 7) * cell, 0, cell);
  drawFinder(ctx, 0, (cells - 7) * cell, cell);
}

function pseudoQRData(seed, len) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) & 0xFFFFFF;
  return Array.from({ length: len }, () => { s = (s * 1103515245 + 12345) & 0xFFFFFF; return s % 3 === 0; });
}

function isFinderZone(r, c, n) {
  return (r < 8 && c < 8) || (r < 8 && c >= n - 8) || (r >= n - 8 && c < 8);
}

function drawFinder(ctx, x, y, cell) {
  ctx.fillStyle = '#000'; ctx.fillRect(x, y, 7 * cell, 7 * cell);
  ctx.fillStyle = '#fff'; ctx.fillRect(x + cell, y + cell, 5 * cell, 5 * cell);
  ctx.fillStyle = '#000'; ctx.fillRect(x + 2 * cell, y + 2 * cell, 3 * cell, 3 * cell);
}

function downloadQR() {
  const cv = document.getElementById('qrCanvas');
  const a  = document.createElement('a');
  a.download = 'ESHR-QR-' + generateESHRId(STATE.currentUser?.uid) + '.png';
  a.href = cv.toDataURL();
  a.click();
  toast('QR Code downloaded!', 'success');
}
