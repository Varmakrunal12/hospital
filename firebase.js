// ================================================================
// firebase.js — Firebase Helpers (db read/write via window._db)
// ================================================================
// Note: Firebase SDK is initialized via ES Module in index.html
// and exposed on window._db / window._fs / window._dbReady

async function dbSet(col, docId, data) {
  if (!window._dbReady || !window._db) return false;
  try {
    await window._fs.setDoc(window._fs.doc(window._db, col, docId), data, { merge: true });
    return true;
  } catch (e) { console.warn('dbSet error:', e); return false; }
}

async function dbGet(col, docId) {
  if (!window._dbReady || !window._db) return null;
  try {
    const snap = await window._fs.getDoc(window._fs.doc(window._db, col, docId));
    return snap.exists() ? snap.data() : null;
  } catch (e) { console.warn('dbGet error:', e); return null; }
}

async function dbQuery(col, field, op, val) {
  if (!window._dbReady || !window._db) return [];
  try {
    const q = window._fs.query(
      window._fs.collection(window._db, col),
      window._fs.where(field, op, val)
    );
    const snap = await window._fs.getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) { console.warn('dbQuery error:', e); return []; }
}

async function saveUserData() {
  if (!STATE.currentUser || !STATE.userData) return;
  const ok = await dbSet('users', STATE.currentUser.uid, STATE.userData);
  if (!ok && window._dbReady) toast('Data sync failed. Check Firebase config.', 'warning');
}
