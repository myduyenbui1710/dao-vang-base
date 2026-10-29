// Lớp đồng bộ dữ liệu: Firebase Realtime Database, hoặc chế độ thử (localStorage + BroadcastChannel).
const DB = (() => {
  let mode = 'local', fb = null, offset = 0;
  const KEY = 'daovang_local_db';
  const listeners = [];
  let bc = null;

  const clone = v => (v == null ? null : JSON.parse(JSON.stringify(v)));
  const keys = p => p.split('/').filter(Boolean);
  const loadTree = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const saveTree = t => localStorage.setItem(KEY, JSON.stringify(t));
  const getAt = (t, p) => keys(p).reduce((o, k) => (o == null ? undefined : o[k]), t);
  function setAt(t, p, v) {
    const ks = keys(p); let o = t;
    for (let i = 0; i < ks.length - 1; i++) {
      if (typeof o[ks[i]] !== 'object' || o[ks[i]] === null) o[ks[i]] = {};
      o = o[ks[i]];
    }
    if (v === null || v === undefined) delete o[ks[ks.length - 1]];
    else o[ks[ks.length - 1]] = clone(v);
  }
  function notify() {
    const t = loadTree();
    listeners.forEach(l => {
      const v = getAt(t, l.path);
      const s = JSON.stringify(v === undefined ? null : v);
      if (s !== l.last) { l.last = s; l.cb(clone(v === undefined ? null : v)); }
    });
  }
  function localWrite(fn) { const t = loadTree(); fn(t); saveTree(t); bc && bc.postMessage(1); notify(); return Promise.resolve(); }

  function init() {
    const c = window.FIREBASE_CONFIG;
    if (c && c.databaseURL && window.firebase) {
      firebase.initializeApp(c);
      fb = firebase.database();
      mode = 'firebase';
      fb.ref('.info/serverTimeOffset').on('value', s => { offset = s.val() || 0; });
    } else {
      mode = 'local';
      bc = new BroadcastChannel('daovang');
      bc.onmessage = notify;
      window.addEventListener('storage', e => { if (e.key === KEY) notify(); });
    }
  }

  return {
    init,
    mode: () => mode,
    now: () => Date.now() + offset,
    set(path, v) { return mode === 'firebase' ? fb.ref(path).set(v) : localWrite(t => setAt(t, path, v)); },
    update(path, obj) {
      if (mode === 'firebase') return fb.ref(path).update(obj);
      return localWrite(t => Object.keys(obj).forEach(k => setAt(t, path + '/' + k, obj[k])));
    },
    get(path) {
      if (mode === 'firebase') return fb.ref(path).once('value').then(s => s.val());
      const v = getAt(loadTree(), path); return Promise.resolve(clone(v === undefined ? null : v));
    },
    on(path, cb) {
      if (mode === 'firebase') {
        const ref = fb.ref(path); const h = ref.on('value', s => cb(s.val()));
        return () => ref.off('value', h);
      }
      const l = { path, cb, last: undefined }; listeners.push(l);
      const v = getAt(loadTree(), path); l.last = JSON.stringify(v === undefined ? null : v); cb(clone(v === undefined ? null : v));
      return () => { const i = listeners.indexOf(l); if (i >= 0) listeners.splice(i, 1); };
    },
  };
})();
