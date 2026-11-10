(async function(){
'use strict';

/* The tool list (tools/tools.json) and the shared look (hub/kit.css) are separate files. */
/* the single-file (offline) version carries every file inside itself in window.__FTH_EMBED */
const getText = async (url, kind) => {
  const E = window.__FTH_EMBED; if (E && Object.prototype.hasOwnProperty.call(E, url)) return kind === 'json' ? JSON.parse(E[url]) : E[url];
  const r = await fetch(url, {cache: 'no-cache'}); if (!r.ok) throw new Error(url + ' ' + r.status); return kind === 'json' ? r.json() : r.text(); };
let manifest;
const CONFIG = await getText('hub/config.json', 'json').catch(() => ({}));
try { manifest = await getText('tools/tools.json', 'json'); }
catch (e) {
  document.body.innerHTML = '<div style="font:15px/1.5 system-ui;max-width:560px;margin:15vh auto;padding:24px">'
    + '<h2 style="margin:0 0 8px">Film Tool Hub needs to be opened from a website</h2>'
    + '<p>The tool list couldn’t be loaded. This usually means the page was opened straight from a folder on your computer. '
    + 'Open it from its web address (or its preview link) instead.</p></div>';
  return;
}

const $ = (s, el=document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dec = b64 => new TextDecoder().decode(Uint8Array.from(atob(b64), c => c.charCodeAt(0)));
const enc = str => { const b = new TextEncoder().encode(str); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); };
const fmtDate = t => t ? new Date(t).toLocaleDateString(undefined, {day:'numeric', month:'short', year:'numeric'}) : '';
const slug = s => (s || 'tool').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'tool';

/* ───────── icons ───────── */
const P = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICONS = {
  script:   P('<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="M9 11.5h7M9 14.5h5M9 17.5h6.5"/>'),
  lining:   P('<path d="M5 3h14v18H5z"/><path d="M9.5 6v12"/><path d="M14.5 6l1.6 2-1.6 2 1.6 2-1.6 2 1.6 2-1.6 2"/>'),
  timeline: P('<path d="M3 12h18"/><circle cx="6" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="18" cy="12" r="1.8"/><path d="M6 5.5v4.2M12 14.3v4.2M18 5.5v4.2"/>'),
  production: P('<path d="M3.5 10h17v9.5a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5z"/><path d="M3.2 10 2.6 6.6l16.2-2.9.6 3.4z"/><path d="M7.2 5.8l2.3 3.1M11.6 5l2.3 3.1"/>'),
  post:     P('<rect x="2.8" y="5" width="18.4" height="14" rx="1.6"/><path d="M2.8 9h18.4"/><path d="M6.5 13h5.5M6.5 16h3"/><path d="M14.5 12.4v4.2M17.5 11.2v6.6"/>'),
  schedule: P('<rect x="3" y="4" width="18" height="16" rx="1.6"/><path d="M3 9.3h18M3 14.6h18M8.5 4v16"/>'),
  shotlist: P('<rect x="2.8" y="9" width="12.5" height="10" rx="1.6"/><path d="M15.3 12.5l5.4-3v9.1l-5.4-3"/><circle cx="6.3" cy="5.6" r="2.2"/><circle cx="12" cy="5.6" r="2.2"/>'),
  blocking: P('<rect x="3" y="3" width="18" height="18" rx="1.4"/><path d="M3 13h5M13 3v5"/><circle cx="8.5" cy="17.5" r="1.6"/><path d="M10.2 16.2c2.6-1.4 4.4-3.4 5.2-6.4"/><path d="M13.6 10.4l1.8-1.3 1 2"/>'),
  lighting: P('<path d="M3.5 8.2l6.5-2.6v12.8l-6.5-2.6z"/><path d="M10 9h2.6v6H10"/><path d="M15.5 7.6l4.5-2M16 12h5M15.5 16.4l4.5 2"/>'),
  callsheet:P('<rect x="5" y="4.5" width="14" height="16.5" rx="1.6"/><path d="M9 4.5V3h6v1.5"/><path d="M8.5 10h7M8.5 13.5h7M8.5 17h4.5"/>'),
  risk:     P('<path d="M12 3.2l9.3 16.6H2.7z"/><path d="M12 10v4.6"/><circle cx="12" cy="17.2" r=".5" fill="currentColor"/>'),
  portrait: P('<circle cx="10" cy="12" r="6.2"/><path d="M10 5.8a6.2 6.2 0 0 1 0 12.4z" fill="currentColor" stroke="none" opacity=".35"/><path d="M18 6.5l2.6-1.8M18.8 12h2.8M18 17.5l2.6 1.8"/>'),
  palette:  P('<path d="M12 3.2a8.8 8.8 0 1 0 0 17.6c1.3 0 2-1 1.6-2.1-.5-1.2.3-2.4 1.6-2.4h1.9a3.7 3.7 0 0 0 3.7-3.7c0-5.2-4-9.4-8.8-9.4z"/><circle cx="7.6" cy="11.2" r="1.3"/><circle cx="10.2" cy="7.3" r="1.3"/><circle cx="14.8" cy="7.6" r="1.3"/>'),
  breakdown:P('<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><rect x="8.6" y="10.2" width="5" height="2.4" rx=".6" fill="currentColor" stroke="none" opacity=".5"/><path d="M14.8 11.4h1.8M8.6 15h2.6"/><rect x="12" y="13.8" width="4.6" height="2.4" rx=".6" fill="currentColor" stroke="none" opacity=".5"/>'),
  exposure: P('<circle cx="12" cy="12" r="8.8"/><path d="M12 3.2l2.6 6.4M20.4 9.3l-6.8.9M17.4 18.9l-4.2-5.4M6.6 18.9l4.2-5.4M3.6 9.3l6.8.9"/><circle cx="12" cy="12" r="2.6"/>'),
  dof:      P('<circle cx="12" cy="12" r="8.8"/><path d="M3.2 12h17.6"/><path d="M8 7.4v9.2M16 7.4v9.2"/><path d="M12 9.6v4.8" stroke-width="2.4"/>'),
  falsecolour: P('<rect x="3" y="5" width="18" height="14" rx="1.8"/><path d="M3 15l4.5-4.5 3.5 3.5 4-5 6 6"/><path d="M7 5v14M11 5v14M15 5v14" opacity=".35"/>'),
  generic:  P('<rect x="3" y="9" width="18" height="11.5" rx="1.6"/><path d="M3.4 5.6L20 3l.6 3.6L4 9.2z"/><path d="M8 4.8l2 3.4M13 4l2 3.4"/>')
};
const UI = {
  dots:   '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5.5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18.5" cy="12" r="1.6"/></svg>',
  arrow:  P('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  open:   P('<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9h17"/>'),
  newtab: P('<path d="M14 4h6v6M20 4l-8.5 8.5"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'),
  upload: P('<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>'),
  down:   P('<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>'),
  edit:   P('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>'),
  revert: P('<path d="M4 4v5h5"/><path d="M5.2 15a7.5 7.5 0 1 0 1.4-7.6L4 9"/>'),
  trash:  P('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  reload: P('<path d="M20 5v5h-5"/><path d="M18.8 15A7.5 7.5 0 1 1 18 8.5L20 10"/>'),
  close:  P('<path d="M6 6l12 12M18 6L6 18"/>'),
  info:   P('<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><circle cx="12" cy="7.6" r=".5" fill="currentColor"/>'),
  file:   P('<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5"/><path d="M9 14l-1.5 1.5L9 17M13 14l1.5 1.5L13 17"/>')
};

/* ───────── storage (IndexedDB, per browser) ───────── */
const store = (() => {
  const mem = new Map(); let db = null, ok = false;
  const ready = new Promise(res => {
    try {
      const r = indexedDB.open('film-tool-hub', 2);
      r.onupgradeneeded = () => {
        const d = r.result, have = n => d.objectStoreNames.contains(n);
        if (!have('tools')) d.createObjectStore('tools', {keyPath: 'id'});
        if (!have('projects')) d.createObjectStore('projects', {keyPath: 'id'});
        if (!have('saves')) d.createObjectStore('saves', {keyPath: 'id'});
        if (!have('backups')) d.createObjectStore('backups', {keyPath: 'id', autoIncrement: true}).createIndex('projectId', 'projectId');
      };
      r.onsuccess = () => { db = r.result; ok = true; res(); };
      r.onerror = r.onblocked = () => res();
    } catch (e) { res(); }
  });
  const tx = (mode, fn) => new Promise((res, rej) => {
    const t = db.transaction('tools', mode); const req = fn(t.objectStore('tools'));
    t.oncomplete = () => res(req && req.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
  });
  /* generic access to the other stores (projects, saves, backups) */
  const gtx = (name, mode, fn) => ready.then(() => {
    if (!ok) throw new Error('storage unavailable');
    return new Promise((res, rej) => {
      const t = db.transaction(name, mode); const req = fn(t.objectStore(name));
      t.oncomplete = () => res(req && req.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
    });
  });
  return {
    ready, get persistent() { return ok; }, gtx,
    async all() { await ready; if (ok) { try { return await tx('readonly', s => s.getAll()); } catch (e) {} } return [...mem.values()]; },
    async put(rec) { mem.set(rec.id, rec); await ready; if (ok) { try { await tx('readwrite', s => s.put(rec)); } catch (e) { ok = false; } } },
    async del(id) { mem.delete(id); await ready; if (ok) { try { await tx('readwrite', s => s.delete(id)); } catch (e) {} } },
    async clear() { mem.clear(); await ready; if (ok) { try { await tx('readwrite', s => s.clear()); } catch (e) {} } }
  };
})();

/* ───────── data model ───────── */
const CATS = manifest.categories.slice();
if (!CATS.some(c => c.id === 'other')) CATS.push({id:'other', num:String(CATS.length + 1).padStart(2, '0'), name:'Other tools', blurb:'Tools added to the hub that sit outside the main stages.', color:'#b9bec7'});
const catOf = id => CATS.find(c => c.id === id) || CATS.find(c => c.id === 'other');

/* a tool's "rev" in tools.json is when its file last changed: date and time as YYYYMMDDHHMM
   (e.g. 202611091430), a date as YYYYMMDD, or a timestamp. A newer published file replaces any older
   version tried out in this browser. */
function revMs(r) {
  const s = String(r == null ? '' : r).trim(), n = (a, b) => +s.slice(a, b);
  if (/^\d{12}$/.test(s)) return Date.UTC(n(0, 4), n(4, 6) - 1, n(6, 8), n(8, 10), n(10, 12));
  if (/^\d{8}$/.test(s)) return Date.UTC(n(0, 4), n(4, 6) - 1, n(6, 8), 23, 59);
  return Number(s) || 0;
}
const base = manifest.tools.map(t => ({...t, rev: revMs(t.rev), html: null}));
/* each tool's file is fetched the first time it's opened */
const htmlLoads = new Map();
function loadHtml(t) {
  const b = t && base.find(x => x.id === t.id);
  if (!b || b.html != null) return Promise.resolve();
  if (!htmlLoads.has(b.id)) htmlLoads.set(b.id, getText(b.file).then(h => { b.html = h; }).catch(e => { htmlLoads.delete(b.id); throw e; }));
  return htmlLoads.get(b.id);
}
const LOADING = '<!doctype html><meta name="color-scheme" content="dark light"><body style="margin:0;display:grid;place-items:center;height:100vh;font:500 12px ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;color:#888;background:transparent">Loading…</body>';
const baseIds = new Set(base.map(t => t.id));
const overrides = new Map();
const MKEYS = ['name', 'desc', 'category', 'tags'];

function tools() {
  const out = [];
  for (const b of base) {
    const o = overrides.get(b.id);
    if (o && o.hidden && o.hiddenAt > b.rev) continue;
    const t = {...b, local:false, htmlLocal:false};
    if (o) {
      if (o.html && o.htmlAt > b.rev) Object.assign(t, {html:o.html, updated:o.htmlAt, fileName:o.fileName || t.fileName, note:o.note || '', ver:o.ver, local:true, htmlLocal:true});
      if (o.meta && o.metaAt > b.rev) { Object.assign(t, o.meta); t.local = true; }
    }
    out.push(t);
  }
  for (const o of overrides.values()) {
    if (!o.custom || baseIds.has(o.id) || o.hidden) continue;
    out.push({id:o.id, ...o.meta, icon:'generic', html:o.html, updated:o.htmlAt, fileName:o.fileName, note:o.note || '', ver:o.ver || 1, local:true, htmlLocal:true, custom:true});
  }
  return out;
}
const byId = id => tools().find(t => t.id === id);
const hiddenBase = () => base.filter(b => { const o = overrides.get(b.id); return o && o.hidden && o.hiddenAt > b.rev; });
const localCount = () => tools().filter(t => t.local).length + hiddenBase().length;

async function saveRec(id, patch) {
  const rec = {...(overrides.get(id) || {id}), ...patch};
  overrides.set(id, rec); await store.put(rec);
}
async function dropRec(id) { overrides.delete(id); await store.del(id); }

/* ───────── projects ─────────
   A project is a name that every tool's work is filed under. Tool work saves continuously in this
   browser. "Save" writes the project's main copy; backups are taken automatically every few minutes
   while work changes (latest 20 kept, plus one a day for 30 days). Until Google Drive is connected,
   saves and backups live in this browser too. */
const CUR_KEY = 'fth-current-project';
const PFX = id => 'fth:p:' + id + ':';
const BACKUP_EVERY = 5 * 60 * 1000, KEEP_RECENT = 20, KEEP_DAYS = 30;
let projects = [], curId = null;
const cur = () => projects.find(p => p.id === curId) || null;
const projById = id => projects.find(p => p.id === id);
const activeProjects = () => projects.filter(p => !p.archived && mine(p)).sort((a, b) => (b.openedAt || 0) - (a.openedAt || 0));
const newId = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const fmtWhen = t => {
  if (!t) return 'never';
  const d = new Date(t), now = new Date(), s = (now - d) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return Math.round(s / 60) + ' min ago';
  const time = d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
  if (d.toDateString() === now.toDateString()) return 'today ' + time;
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'yesterday ' + time;
  return d.toLocaleDateString(undefined, {day: 'numeric', month: 'short'}) + ' ' + time;
};
const putProject = p => store.gtx('projects', 'readwrite', s => s.put(p)).catch(() => {});
let projSaveT;
const persistProjectSoon = p => { clearTimeout(projSaveT); projSaveT = setTimeout(() => putProject(p), 400); };

/* IndexedDB copy helpers (tool databases are copied whole into snapshots) */
const openDB = (name, version, upgrade) => new Promise((res, rej) => {
  const r = version ? indexedDB.open(name, version) : indexedDB.open(name);
  if (upgrade) r.onupgradeneeded = () => upgrade(r.result);
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); r.onblocked = () => rej(new Error('blocked'));
});
const delDB = name => new Promise(res => { const r = indexedDB.deleteDatabase(name); r.onsuccess = r.onerror = r.onblocked = () => res(); });
async function listDBs(prefix) {
  if (!indexedDB.databases) return [];
  try { return (await indexedDB.databases()).map(d => d.name).filter(n => n && (prefix ? n.startsWith(prefix) : true)); } catch (e) { return []; }
}
async function dumpDB(name) {
  const d = await openDB(name), out = {version: d.version, stores: {}};
  for (const sn of [...d.objectStoreNames]) {
    out.stores[sn] = await new Promise((res, rej) => {
      const t = d.transaction(sn), s = t.objectStore(sn), records = [];
      const meta = {keyPath: s.keyPath, autoIncrement: s.autoIncrement, records,
        indexes: [...s.indexNames].map(n => { const i = s.index(n); return {name: n, keyPath: i.keyPath, unique: i.unique, multiEntry: i.multiEntry}; })};
      s.openCursor().onsuccess = e => { const c = e.target.result; if (c) { records.push([c.primaryKey, c.value]); c.continue(); } };
      t.oncomplete = () => res(meta); t.onerror = () => rej(t.error);
    });
  }
  d.close(); return out;
}
async function loadDB(name, dump) {
  await delDB(name);
  const d = await openDB(name, dump.version || 1, db => {
    for (const [sn, m] of Object.entries(dump.stores)) {
      const s = db.createObjectStore(sn, m.keyPath == null ? {autoIncrement: !!m.autoIncrement} : {keyPath: m.keyPath, autoIncrement: !!m.autoIncrement});
      (m.indexes || []).forEach(i => s.createIndex(i.name, i.keyPath, {unique: i.unique, multiEntry: i.multiEntry}));
    }
  });
  for (const [sn, m] of Object.entries(dump.stores)) {
    await new Promise((res, rej) => {
      const t = d.transaction(sn, 'readwrite'), s = t.objectStore(sn);
      for (const [k, v] of m.records) { if (s.keyPath == null) s.put(v, k); else s.put(v); }
      t.oncomplete = res; t.onerror = () => rej(t.error);
    });
  }
  d.close();
}
const lsKeys = prefix => { const out = []; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(prefix)) out.push(k); } } catch (e) {} return out; };

/* everything a project holds, as one object */
async function snapshot(pid) {
  const pre = PFX(pid), snap = {v: 1, at: Date.now(), project: (projById(pid) || {}).name || '', ls: {}, idb: {}};
  for (const k of lsKeys(pre)) snap.ls[k.slice(pre.length)] = localStorage.getItem(k);
  for (const n of await listDBs(pre)) { try { snap.idb[n.slice(pre.length)] = await dumpDB(n); } catch (e) {} }
  return snap;
}
async function wipeProjectData(pid) {
  const pre = PFX(pid);
  lsKeys(pre).forEach(k => localStorage.removeItem(k));
  for (const n of await listDBs(pre)) await delDB(n);
}
async function restoreSnapshot(pid, snap) {
  const pre = PFX(pid);
  await wipeProjectData(pid);
  for (const [k, v] of Object.entries(snap.ls || {})) { try { localStorage.setItem(pre + k, v); } catch (e) {} }
  for (const [n, d] of Object.entries(snap.idb || {})) { try { await loadDB(pre + n, d); } catch (e) {} }
}
/* tools hold their databases open, so close them while a project's data is swapped */
function unloadFrames() { frames.forEach(f => { f.srcdoc = '<!doctype html><title>.</title>'; }); return new Promise(r => setTimeout(r, 120)); }
function reloadFrames() { frames.forEach((f, id) => { const t = byId(id); if (t && t.html != null) f.srcdoc = themed(t); }); }

const changed = p => p && (p.changedAt || 0) > (p.savedAt || 0);
const needsBackup = p => p && (p.changedAt || 0) > (p.backupAt || 0);

async function saveProject(quiet) {
  const p = cur(); if (!p) return;
  const tp = driveOn() && account ? getToken(true).catch(() => null) : null;   /* ask Google while the click still counts */
  let snap;
  try {
    snap = await snapshot(p.id);
    await store.gtx('saves', 'readwrite', s => s.put({id: p.id, at: snap.at, snap}));
    p.savedAt = snap.at;
    await putProject(p);
    renderProjUI();
  } catch (e) { toast('Couldn’t save in this browser: ' + (e.message || e)); return; }
  if (!tp) { if (!quiet) toast(driveOn() ? `Saved “${p.name}” in this browser. Sign in to save it to Google Drive.` : `Saved “${p.name}”`); return; }
  if (!(await tp)) { renderAccount(); toast(`Saved “${p.name}” in this browser only. Reconnect Google Drive to save it there too.`); return; }
  try { toast('Saving to Google Drive…'); await driveSave(p, snap); await putProject(p); renderAccount(); renderProjUI(); if (!quiet) toast(`Saved “${p.name}” to Google Drive`); }
  catch (e) { renderAccount(); toast('Saved in this browser, but Google Drive didn’t accept it: ' + e.message); }
}
async function backupProject(p, reason) {
  if (!p) return;
  try {
    const snap = await snapshot(p.id);
    await store.gtx('backups', 'readwrite', s => s.add({projectId: p.id, at: snap.at, reason: reason || 'auto', snap}));
    p.backupAt = snap.at; await putProject(p);
    await pruneBackups(p.id);
    if (driveOn() && account && hasToken() && mine(p)) driveBackup(p, snap, reason).catch(() => {});
  } catch (e) {}
}
async function backupsFor(pid) {
  const all = await store.gtx('backups', 'readonly', s => s.index('projectId').getAll(pid)).catch(() => []);
  return (all || []).sort((a, b) => b.at - a.at);
}
async function pruneBackups(pid) {
  const list = await backupsFor(pid), keep = new Set(), days = new Set(), cutoff = Date.now() - KEEP_DAYS * 864e5;
  list.forEach((b, i) => {
    if (i < KEEP_RECENT) { keep.add(b.id); days.add(new Date(b.at).toDateString()); return; }
    const day = new Date(b.at).toDateString();
    if (b.at >= cutoff && !days.has(day)) { keep.add(b.id); days.add(day); }
  });
  const drop = list.filter(b => !keep.has(b.id));
  if (drop.length) await store.gtx('backups', 'readwrite', s => { drop.forEach(b => s.delete(b.id)); return null; }).catch(() => {});
}
setInterval(() => { const p = cur(); if (needsBackup(p) && Date.now() - (p.backupAt || 0) >= BACKUP_EVERY) backupProject(p, 'auto'); }, 60 * 1000);
document.addEventListener('visibilitychange', () => { const p = cur(); if (document.hidden && needsBackup(p)) backupProject(p, 'auto'); });

async function restoreFrom(snap, label) {
  const p = cur(); if (!p) return;
  await backupProject(p, 'before restore');
  await unloadFrames();
  await restoreSnapshot(p.id, snap);
  p.changedAt = Date.now(); await putProject(p);
  reloadFrames(); renderProjUI(); toast(`Restored ${label}`);
}

async function switchProject(id) {
  const next = projById(id); if (!next || id === curId) return;
  const tp = (next.needsDownload || next.remoteNewer) && account ? getToken(true).catch(() => null) : null;
  if (next.needsDownload && !(tp && await tp)) { toast('Connect Google Drive to open this project'); renderAccount(); return; }
  const old = cur(); if (needsBackup(old)) backupProject(old, 'auto');
  curId = id; next.openedAt = Date.now(); putProject(next);
  try { localStorage.setItem(CUR_KEY, id); } catch (e) {}
  window.__fthHub.project = id;
  if (tp && await tp) { await offerPull(next); }
  reloadFrames(); renderProjUI(); render(); toast(`Project: ${next.name}`);
}
async function createProject(name) {
  const p = {id: newId(), name: name || 'Untitled project', created: Date.now(), openedAt: Date.now(), tools: {}, archived: false};
  projects.push(p); await putProject(p);
  if (!curId) { curId = p.id; try { localStorage.setItem(CUR_KEY, p.id); } catch (e) {} window.__fthHub.project = p.id; renderProjUI(); render(); }
  else await switchProject(p.id);
  return p;
}
async function archiveProject(id, on) {
  const p = projById(id); if (!p) return;
  p.archived = !!on; await putProject(p); driveMeta(p);
  if (on && id === curId) { const other = activeProjects().find(x => x.id !== id); if (other) await switchProject(other.id); else await createProject('Untitled project'); }
  renderProjUI(); render();
}
async function deleteProject(id) {
  const p = projById(id); if (!p) return;
  if (p.driveFileId && account) { if (await getToken(true).catch(() => null)) await driveTrash(p); }
  if (id === curId) await unloadFrames();
  await wipeProjectData(id);
  await store.gtx('saves', 'readwrite', s => s.delete(id)).catch(() => {});
  for (const b of await backupsFor(id)) await store.gtx('backups', 'readwrite', s => s.delete(b.id)).catch(() => {});
  await store.gtx('projects', 'readwrite', s => s.delete(id)).catch(() => {});
  projects = projects.filter(x => x.id !== id);
  if (id === curId) { curId = null; const other = activeProjects()[0]; if (other) { curId = other.id; localStorage.setItem(CUR_KEY, other.id); window.__fthHub.project = other.id; reloadFrames(); } else await createProject('Untitled project'); }
  renderProjUI(); render();
}

/* called by tools (through the shim) whenever their work changes */
window.__fthHub = {
  project: null,
  touched(tool, pid) {
    const p = projById(pid); if (!p) return;
    const now = Date.now(); p.changedAt = now; p.tools = p.tools || {}; p.tools[tool] = now;
    persistProjectSoon(p); if (pid === curId) renderProjUI();
  },
  save() { saveProject(); }
};


/* ───────── Google sign-in + Google Drive ─────────
   Each person signs in with Google. Their projects are saved as files in a "Film Tool Hub" folder in
   their own Google Drive (Projects + Backups). The site can only see files it created itself
   (the drive.file permission). Nothing goes through anyone else's server.
   Set hub/config.json → googleClientId to switch this on; adminEmails lists who sees the admin controls. */
const GOOGLE_ID = String(CONFIG.googleClientId || '').trim();
const ADMINS = (CONFIG.adminEmails || []).map(s => String(s).trim().toLowerCase()).filter(Boolean);
const ACCT_KEY = 'filmtoolhub-account';
const DRIVE_API = 'https://www.googleapis.com/drive/v3', DRIVE_UP = 'https://www.googleapis.com/upload/drive/v3';
const SCOPES = 'https://www.googleapis.com/auth/drive.file openid email profile';
const driveOn = () => !!GOOGLE_ID;
let account = null;
try { account = JSON.parse(localStorage.getItem(ACCT_KEY) || 'null'); } catch (e) {}
let token = null, tokenExp = 0, tokenClient = null, tokenWait = null, folders = null, driveSyncing = false;
const hasToken = () => !!token && Date.now() < tokenExp - 60e3;
const isAdmin = () => !driveOn() || (!!account && ADMINS.includes(String(account.email || '').toLowerCase()));
/* a project belongs to whoever saved it to Drive; on a shared computer you only see your own */
const mine = p => !p.owner || (!!account && p.owner === account.email);

const gisReady = !driveOn() ? Promise.resolve(false) : new Promise(res => {
  const s = document.createElement('script');
  s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
  s.onload = () => {
    try {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_ID, scope: SCOPES,
        callback: r => {
          const w = tokenWait; tokenWait = null; if (!w) return;
          if (!r || !r.access_token) { w.rej(new Error((r && r.error) || 'sign-in failed')); return; }
          /* Google lets people untick the Drive permission on the sign-in screen */
          let driveOk = true;
          try { driveOk = google.accounts.oauth2.hasGrantedAllScopes(r, 'https://www.googleapis.com/auth/drive.file'); } catch (e) {}
          token = r.access_token; tokenExp = Date.now() + (r.expires_in || 3600) * 1000;
          if (!driveOk) { token = null; w.rej(new Error('Google Drive access wasn’t allowed, so your projects can’t be saved to your Drive. Click Sign in again and tick the Google Drive box.')); return; }
          w.res(token);
        },
        error_callback: e => { const w = tokenWait; tokenWait = null; if (w) w.rej(new Error((e && e.type) || 'sign-in cancelled')); }
      });
      res(true);
    } catch (e) { res(false); }
  };
  s.onerror = () => res(false);
  document.head.appendChild(s);
});

/* ask Google for access. interactive=true may open Google's sign-in popup, so call it straight from a click */
function getToken(interactive) {
  if (hasToken()) return Promise.resolve(token);
  if (!interactive || !tokenClient) return Promise.reject(new Error('not connected'));
  if (tokenWait) tokenWait.rej(new Error('superseded'));
  return new Promise((res, rej) => {
    tokenWait = {res, rej};
    try { tokenClient.requestAccessToken(account ? {prompt: '', login_hint: account.email} : {prompt: 'consent'}); }
    catch (e) { tokenWait = null; rej(e); }
  });
}
async function gapi(url, opts = {}) {
  if (!hasToken()) throw new Error('not connected');
  const r = await fetch(url, {...opts, headers: {...(opts.headers || {}), Authorization: 'Bearer ' + token}});
  if (r.status === 401) { token = null; renderAccount(); throw new Error('not connected'); }
  if (!r.ok) {
    let why = '';
    try { const j = await r.json(); why = (j.error && (j.error.message || (j.error.errors && j.error.errors[0] && j.error.errors[0].message))) || ''; } catch (e) {}
    if (r.status === 403 && /has not been used|is disabled|accessNotConfigured/i.test(why)) why = 'the Google Drive API isn’t switched on in the Google Cloud project (APIs & Services → Library → Google Drive API → Enable)';
    else if (r.status === 403 && /insufficient|scope/i.test(why)) why = 'Drive access wasn’t allowed at sign-in. Sign out, sign in again and tick the Drive box';
    throw new Error('Google Drive error ' + r.status + (why ? ': ' + why : ''));
  }
  return r;
}
const gjson = async (url, opts) => (await gapi(url, opts)).json();
const qs = o => Object.entries(o).map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&');
const qEsc = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
async function findFiles(q, fields) {
  const out = []; let pageToken = '';
  do {
    const r = await gjson(`${DRIVE_API}/files?` + qs({q: q + ' and trashed=false', spaces: 'drive', pageSize: 200, fields: `nextPageToken,files(${fields || 'id,name,modifiedTime,appProperties'})`, ...(pageToken ? {pageToken} : {})}));
    out.push(...(r.files || [])); pageToken = r.nextPageToken || '';
  } while (pageToken);
  return out;
}
const byProp = (k, v) => `appProperties has { key='${qEsc(k)}' and value='${qEsc(v)}' }`;
async function folder(name, props, parent) {
  const q = Object.entries(props).map(([k, v]) => byProp(k, v)).join(' and ') + (parent ? ` and '${qEsc(parent)}' in parents` : '');
  const hit = (await findFiles(q + " and mimeType='application/vnd.google-apps.folder'"))[0];
  if (hit) return hit.id;
  const meta = {name, mimeType: 'application/vnd.google-apps.folder', appProperties: props, ...(parent ? {parents: [parent]} : {})};
  return (await gjson(`${DRIVE_API}/files?fields=id`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(meta)})).id;
}
async function ensureFolders() {
  if (folders) return folders;
  const root = await folder('Film Tool Hub', {fth: 'root'});
  const [projectsF, backupsF] = await Promise.all([folder('Projects', {fth: 'projects'}, root), folder('Backups', {fth: 'backups'}, root)]);
  return (folders = {root, projects: projectsF, backups: backupsF});
}
/* upload (create when no fileId) with a resumable session, so big projects (script PDFs, stills) fit */
async function uploadFile(meta, text, fileId) {
  const start = await gapi(`${DRIVE_UP}/files${fileId ? '/' + fileId : ''}?uploadType=resumable&fields=id,modifiedTime`, {
    method: fileId ? 'PATCH' : 'POST', headers: {'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': 'application/json'}, body: JSON.stringify(meta)});
  const loc = start.headers.get('Location'); if (!loc) throw new Error('upload not started');
  const r = await fetch(loc, {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: new Blob([text], {type: 'application/json'})});
  if (!r.ok) throw new Error('upload failed ' + r.status);
  return r.json();
}

/* snapshots can hold binary data (script PDFs, stills): turn it into text and back */
const b64of = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const u8of = b64 => Uint8Array.from(atob(b64), c => c.charCodeAt(0));
async function packValue(v) {
  if (v == null || typeof v !== 'object') return v;
  if (v instanceof ArrayBuffer) return {__fth: 'ab', b: b64of(new Uint8Array(v))};
  if (ArrayBuffer.isView(v)) return {__fth: 'ta', t: v.constructor.name, b: b64of(new Uint8Array(v.buffer, v.byteOffset, v.byteLength))};
  if (typeof Blob !== 'undefined' && v instanceof Blob) return {__fth: 'blob', t: v.type, b: b64of(new Uint8Array(await v.arrayBuffer()))};
  if (v instanceof Date) return {__fth: 'date', v: v.getTime()};
  if (Array.isArray(v)) { const a = []; for (const x of v) a.push(await packValue(x)); return a; }
  const o = {}; for (const k of Object.keys(v)) o[k] = await packValue(v[k]); return o;
}
function unpackValue(v) {
  if (v == null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(unpackValue);
  if (v.__fth === 'ab') return u8of(v.b).buffer;
  if (v.__fth === 'ta') { const u = u8of(v.b), T = self[v.t] || Uint8Array; return new T(u.buffer, 0, u.byteLength / (T.BYTES_PER_ELEMENT || 1)); }
  if (v.__fth === 'blob') return new Blob([u8of(v.b)], {type: v.t || ''});
  if (v.__fth === 'date') return new Date(v.v);
  const o = {}; for (const k of Object.keys(v)) o[k] = unpackValue(v[k]); return o;
}
const projectMeta = p => ({id: p.id, name: p.name, created: p.created, archived: !!p.archived, tools: p.tools || {}});
const fileName = p => `${p.name}.filmtoolhub.json`;

async function driveSave(p, snap) {
  const f = await ensureFolders();
  const body = JSON.stringify({app: 'film-tool-hub', v: 1, savedAt: snap.at, project: projectMeta(p), snap: await packValue(snap)});
  const meta = {name: fileName(p), mimeType: 'application/json', appProperties: {fth: 'project', fthId: p.id, archived: p.archived ? '1' : '0'}};
  let r;
  try { r = await uploadFile(p.driveFileId ? meta : {...meta, parents: [f.projects]}, body, p.driveFileId); }
  catch (e) { if (!p.driveFileId) throw e; p.driveFileId = null; r = await uploadFile({...meta, parents: [f.projects]}, body); }
  p.driveFileId = r.id; p.driveSyncedAt = Date.parse(r.modifiedTime) || Date.now(); p.owner = account && account.email;
  p.remoteNewer = 0; p.needsDownload = false;
}
async function driveBackupFolder(p) {
  const f = await ensureFolders();
  return folder(p.name, {fth: 'pbackups', fthId: p.id}, f.backups);
}
async function driveBackup(p, snap, reason) {
  const dir = await driveBackupFolder(p);
  const d = new Date(snap.at), pad = n => String(n).padStart(2, '0');
  const name = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}.${pad(d.getMinutes())} (${reason || 'auto'}).json`;
  const body = JSON.stringify({app: 'film-tool-hub', v: 1, savedAt: snap.at, reason: reason || 'auto', project: projectMeta(p), snap: await packValue(snap)});
  await uploadFile({name, parents: [dir], mimeType: 'application/json', appProperties: {fth: 'backup', fthId: p.id, at: String(snap.at), reason: reason || 'auto'}}, body);
  await pruneDriveBackups(p);
}
async function driveBackupsFor(p) {
  const list = await findFiles(byProp('fth', 'backup') + ' and ' + byProp('fthId', p.id));
  return list.map(f => ({fileId: f.id, at: +((f.appProperties || {}).at) || Date.parse(f.modifiedTime), reason: (f.appProperties || {}).reason || 'auto'})).sort((a, b) => b.at - a.at);
}
async function pruneDriveBackups(p) {
  const list = await driveBackupsFor(p), keep = new Set(), days = new Set(), cutoff = Date.now() - KEEP_DAYS * 864e5;
  list.forEach((b, i) => {
    const day = new Date(b.at).toDateString();
    if (i < KEEP_RECENT) { keep.add(b.fileId); days.add(day); return; }
    if (b.at >= cutoff && !days.has(day)) { keep.add(b.fileId); days.add(day); }
  });
  for (const b of list) if (!keep.has(b.fileId)) await gapi(`${DRIVE_API}/files/${b.fileId}`, {method: 'DELETE'}).catch(() => {});
}
async function driveRead(fileId) {
  const data = await gjson(`${DRIVE_API}/files/${fileId}?alt=media`);
  if (!data || data.app !== 'film-tool-hub' || !data.snap) throw new Error('not a Film Tool Hub file');
  return {...data, snap: unpackValue(data.snap)};
}
async function driveMeta(p) {   /* rename / archive without a full save */
  if (!p.driveFileId || !hasToken()) return;
  try {
    await gapi(`${DRIVE_API}/files/${p.driveFileId}?fields=id`, {method: 'PATCH', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({name: fileName(p), appProperties: {archived: p.archived ? '1' : '0'}})});
  } catch (e) {}
}
async function driveTrash(p) {
  if (!hasToken()) return;
  const ids = [];
  if (p.driveFileId) ids.push(p.driveFileId);
  try { (await findFiles(byProp('fth', 'pbackups') + ' and ' + byProp('fthId', p.id))).forEach(f => ids.push(f.id)); } catch (e) {}
  for (const id of ids) await gapi(`${DRIVE_API}/files/${id}?fields=id`, {method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({trashed: true})}).catch(() => {});
}

/* bring a project's Drive copy into this browser */
async function pullProject(p, fileId) {
  const data = await driveRead(fileId || p.driveFileId);
  const here = p.id === curId;
  if (here) await unloadFrames();
  await restoreSnapshot(p.id, data.snap);
  Object.assign(p, {name: data.project.name || p.name, tools: data.project.tools || p.tools || {}, archived: !!data.project.archived,
    savedAt: data.savedAt, changedAt: data.savedAt, backupAt: data.savedAt, needsDownload: false, remoteNewer: 0, owner: account && account.email});
  if (!fileId || fileId === p.driveFileId) p.driveSyncedAt = Math.max(p.driveSyncedAt || 0, data.savedAt || 0);
  await putProject(p);
  if (here) reloadFrames();
}
/* compare this browser with Drive: new projects from other computers appear, newer saves are offered */
async function driveSync(askAboutCurrent) {
  if (!hasToken() || driveSyncing) return;
  driveSyncing = true; renderAccount();
  try {
    await ensureFolders();
    const files = await findFiles(byProp('fth', 'project'));
    for (const f of files) {
      const id = (f.appProperties || {}).fthId; if (!id) continue;
      const mod = Date.parse(f.modifiedTime) || 0;
      let p = projById(id);
      if (!p) {
        p = {id, name: f.name.replace(/\.filmtoolhub\.json$/i, ''), created: mod, openedAt: 0, tools: {}, archived: (f.appProperties || {}).archived === '1',
          owner: account.email, driveFileId: f.id, driveSyncedAt: 0, needsDownload: true, savedAt: mod};
        projects.push(p); await putProject(p); continue;
      }
      if (p.owner && p.owner !== account.email) continue;
      p.owner = account.email; p.driveFileId = f.id;
      if (mod > (p.driveSyncedAt || 0) + 3000) p.remoteNewer = mod;
      await putProject(p);
    }
    const c = cur();
    if (c && (c.needsDownload || c.remoteNewer) && askAboutCurrent !== false) await offerPull(c);
  } catch (e) { if (e.message !== 'not connected') toastLong('Couldn’t reach Google Drive. ' + e.message); }
  driveSyncing = false;
  if (!mine(cur() || {})) { const m = activeProjects()[0]; if (m) await switchProject(m.id); }
  renderAccount(); renderProjUI(); render();
}
async function offerPull(p) {
  if (p.needsDownload) { try { await pullProject(p); toast(`Loaded “${p.name}” from Google Drive`); } catch (e) { toast('Couldn’t load from Google Drive'); } return; }
  const when = fmtWhen(p.remoteNewer);
  const localEdits = (p.changedAt || 0) > (p.driveSyncedAt || 0) + 3000;
  const ok = !localEdits ? true : await confirmDlg('Newer version on Google Drive', `“${p.name}” was saved on another computer (${when}). Load that version here? What’s on this computer now is backed up first.`, 'Load from Drive');
  if (!ok) { p.remoteNewer = 0; p.driveSyncedAt = Date.now(); putProject(p); return; }
  await backupProject(p, 'before loading from Drive');
  try { await pullProject(p); toast(`Loaded the newer version of “${p.name}”`); } catch (e) { toast('Couldn’t load from Google Drive'); }
}

async function signIn() {
  const tp = getToken(true);   /* first, while the click still counts */
  try {
    await tp;
    const me = await gjson('https://www.googleapis.com/oauth2/v3/userinfo');
    const prev = account && account.email;
    account = {email: me.email, name: me.name || me.email, picture: me.picture || ''};
    try { localStorage.setItem(ACCT_KEY, JSON.stringify(account)); } catch (e) {}
    if (!prev) projects.filter(p => !p.owner).forEach(p => { p.owner = account.email; putProject(p); });
    toast(`Signed in as ${account.email}`);
    renderAccount(); render();
    await driveSync(true);
    /* an untouched starter project on this computer isn't needed once Drive has your projects */
    const empties = projects.filter(p => mine(p) && !p.driveFileId && !p.savedAt && !Object.keys(p.tools || {}).length);
    if (empties.length && projects.some(p => mine(p) && p.driveFileId && !p.archived)) {
      const keep = activeProjects().find(p => p.driveFileId);
      if (keep && empties.some(e => e.id === curId)) await switchProject(keep.id);
      for (const e of empties) await deleteProject(e.id);
    }
  } catch (e) { if (!/cancel|closed|superseded/i.test(e.message)) toastLong('Couldn’t sign in. ' + e.message); renderAccount(); }
}
/* before Google's screen: point out the Drive tick box, because saving depends on it */
function signInFlow() {
  if (account) { signIn(); return; }
  showDlg(`<h3>Before you sign in</h3>
    <p class="sub">Google will ask what Film Tool Hub is allowed to do. <b>Tick the Google Drive box.</b> Saving your projects depends on it.</p>
    <div class="gtick" aria-hidden="true"><span class="cb">✓</span><span>See, edit, create and delete only the specific Google Drive files that you use with this app</span></div>
    <p class="sub">It only lets Film Tool Hub use the files it creates for you, in a Film Tool Hub folder in your Drive. It can't see anything else you keep there.</p>
    <p class="sub">If the box isn't ticked, your projects stay on this computer only: you won't be able to open them anywhere else, and they're lost if this browser's data is cleared. <a href="privacy.html" target="_blank" rel="noopener">Privacy policy</a></p>
    <div class="dlg-actions"><button class="btn ghost" value="cancel">Cancel</button><button class="btn primary" value="ok">${GLOGO}Continue to Google</button></div>`,
    () => { signIn(); });
}
async function reconnect() { try { await getToken(true); renderAccount(); await driveSync(true); } catch (e) { renderAccount(); } }
async function signOut() {
  const clear = await confirmDlg('Sign out',
    'Also remove your projects from this computer? Do this on a shared computer. Anything you’ve saved stays safe in your Google Drive; unsaved changes here would be lost.',
    'Sign out and remove', true, 'Just sign out');
  if (clear === null) return;
  try { if (token && window.google) google.accounts.oauth2.revoke(token, () => {}); } catch (e) {}
  const email = account && account.email;
  token = null; tokenExp = 0; folders = null; account = null;
  try { localStorage.removeItem(ACCT_KEY); } catch (e) {}
  if (clear) {
    await unloadFrames();
    for (const p of projects.filter(p => p.owner === email || !p.owner)) {
      await wipeProjectData(p.id);
      await store.gtx('saves', 'readwrite', s => s.delete(p.id)).catch(() => {});
      for (const b of await backupsFor(p.id)) await store.gtx('backups', 'readwrite', s => s.delete(b.id)).catch(() => {});
      await store.gtx('projects', 'readwrite', s => s.delete(p.id)).catch(() => {});
    }
    projects = projects.filter(p => p.owner && p.owner !== email);
  }
  if (!activeProjects().length) { curId = null; await createProject('My first project'); }
  else if (!mine(cur() || {})) { curId = null; await switchProject(activeProjects()[0].id); }
  reloadFrames(); renderAccount(); renderProjUI(); render();
  toast('Signed out');
}

/* account button + menu */
const GLOGO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"/><path fill="#FBBC05" d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2z"/><path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10c.8-2.4 3-4.1 5.6-4.1z"/></svg>';
function renderAccount() {
  document.body.classList.toggle('admin', isAdmin());
  const b = $('#acctBtn'); if (!b) return;
  b.hidden = !driveOn();
  if (!driveOn()) return;
  if (!account) { b.className = 'ibtn acct signin'; b.innerHTML = GLOGO + '<span class="t">Sign in</span>'; b.title = 'Sign in with Google to keep your projects in your Google Drive'; return; }
  const initial = (account.name || account.email || '?').trim()[0].toUpperCase();
  b.className = 'ibtn acct' + (hasToken() ? '' : ' off') + (driveSyncing ? ' busy' : '');
  b.innerHTML = (account.picture ? `<img src="${esc(account.picture)}" alt="" referrerpolicy="no-referrer">` : `<span class="av">${esc(initial)}</span>`) + '<i class="dot"></i>';
  b.title = account.email + (hasToken() ? ' · saving to Google Drive' : ' · click to reconnect Google Drive');
}
function openAcctMenu() {
  const m = $('#amenu'), b = $('#acctBtn');
  m.innerHTML = `<div class="who"><b>${esc(account.name)}</b><small>${esc(account.email)}</small></div>
    <div class="st ${hasToken() ? 'ok' : 'off'}">${hasToken() ? 'Saving to your Google Drive' : 'Not connected to Google Drive right now'}</div>
    ${hasToken() ? '' : `<button data-am="reconnect">${GLOGO}Reconnect Google Drive</button>`}
    ${hasToken() ? `<button data-am="sync">${UI.reload}Check Drive for changes</button>` : ''}
    ${folders ? `<a data-am="folder" href="https://drive.google.com/drive/folders/${esc(folders.root)}" target="_blank" rel="noopener">${UI.newtab}Open my Film Tool Hub folder</a>` : ''}
    <hr><button data-am="signout">${UI.close}Sign out…</button>`;
  m.hidden = false;
  const r = b.getBoundingClientRect();
  m.style.left = Math.max(8, Math.min(r.right - m.offsetWidth, innerWidth - m.offsetWidth - 8)) + 'px'; m.style.top = (r.bottom + 6) + 'px';
}
const closeAcctMenu = () => { const m = $('#amenu'); if (m) m.hidden = true; };

/* first run with projects: file existing tool work under a starter project (originals are left in place) */
async function migrateIntoProject(p) {
  const pre = PFX(p.id), keep = /^(filmtoolhub-|fth-current-project$|fth:p:)/;
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && !keep.test(k)) localStorage.setItem(pre + k, localStorage.getItem(k)); } } catch (e) {}
  for (const n of await listDBs('')) { if (n === 'film-tool-hub' || n.startsWith('fth:p:')) continue; try { await loadDB(pre + n, await dumpDB(n)); } catch (e) {} }
}
async function initProjects() {
  try { projects = (await store.gtx('projects', 'readonly', s => s.getAll())) || []; } catch (e) { projects = []; }
  if (!projects.length) {
    const p = {id: newId(), name: 'My first project', created: Date.now(), openedAt: Date.now(), tools: {}, archived: false};
    await migrateIntoProject(p);
    projects.push(p); await putProject(p);
  }
  if (!activeProjects().length) { const s0 = {id: newId(), name: 'My first project', created: Date.now(), openedAt: Date.now(), tools: {}, archived: false}; projects.push(s0); await putProject(s0); }
  let want = null; try { want = localStorage.getItem(CUR_KEY); } catch (e) {}
  const p = projById(want);
  curId = p && !p.archived && mine(p) ? p.id : activeProjects()[0].id;
  try { localStorage.setItem(CUR_KEY, curId); } catch (e) {}
  window.__fthHub.project = curId;
}

/* ── project UI ── */
function renderProjUI() {
  const p = cur(); if (!p) return;
  $('#projName').textContent = p.name;
  const sb = $('#saveBtn'), dirty = changed(p);
  sb.classList.toggle('dirty', dirty);
  sb.title = (dirty ? 'Unsaved changes. ' : '') + 'Save “' + p.name + '”' + (account ? ' to your Google Drive' : '') + ' (Ctrl/⌘+S). Last saved: ' + fmtWhen(p.savedAt);
  $('#saveLbl').textContent = dirty ? 'Save' : 'Saved';
  renderStrip();
}
function renderStrip() {
  const el = $('#projStrip'), p = cur(); if (!el || !p) return;
  const used = Object.entries(p.tools || {}).map(([id, at]) => ({t: byId(id), at})).filter(x => x.t).sort((a, b) => b.at - a.at);
  el.innerHTML = `<div class="pstrip">
    <div class="pmain"><span class="plbl">Current project</span><h2>${esc(p.name)}</h2>
      <span class="pmeta">${changed(p) ? '<b class="un">Unsaved changes</b> · ' : ''}Saved ${esc(fmtWhen(p.savedAt))}${p.backupAt ? ' · Backup ' + esc(fmtWhen(p.backupAt)) : ''}${p.driveFileId ? ' · On Google Drive' : ''}</span></div>
    <div class="pused">${used.length ? used.map(x => `<a class="pchip" href="#/tool/${encodeURIComponent(x.t.id)}" style="--cat:${catOf(x.t.category).color}" title="Last changed ${esc(fmtWhen(x.at))}"><span class="sw"></span>${esc(x.t.name)}<small>${esc(fmtWhen(x.at))}</small></a>`).join('') : '<span class="pnone">No tools used in this project yet. Open any tool to start; its work is filed under this project.</span>'}</div>
    <div class="pacts"><button class="btn ghost" data-pact="manage">Manage projects</button><button class="btn" data-pact="new">New project</button></div>
    ${driveOn() && !account ? `<div class="psignin">${GLOGO}<span><b>Sign in with Google</b> to keep your projects in your own Google Drive and carry on from any computer. <a href="privacy.html">Privacy</a></span><button class="btn primary" data-pact="signin">Sign in</button></div>` : ''}
  </div>`;
}
const pmenu = () => $('#pmenu');
function openProjMenu(btn) {
  const m = pmenu();
  m.innerHTML = `<div class="hint">Projects</div>` + activeProjects().map(p => `<button data-pm="open" data-id="${esc(p.id)}" class="${p.id === curId ? 'on' : ''}"><span class="ck">${p.id === curId ? '✓' : ''}</span><span class="nm">${esc(p.name)}</span><small>${esc(fmtWhen(p.changedAt || p.created))}</small></button>`).join('')
    + `<hr><button data-pm="new">${P('<path d="M12 5v14M5 12h14"/>')}New project…</button><button data-pm="manage">${UI.open}Manage projects…</button>`;
  m.hidden = false;
  const r = btn.getBoundingClientRect();
  m.style.left = Math.max(8, Math.min(r.left, innerWidth - m.offsetWidth - 8)) + 'px'; m.style.top = (r.bottom + 6) + 'px';
  btn.setAttribute('aria-expanded', 'true');
}
function closeProjMenu() { pmenu().hidden = true; $('#projBtn').setAttribute('aria-expanded', 'false'); }
function newProjectDialog() {
  showDlg(`<h3>New project</h3><p class="sub">Every tool's work is filed under the current project. Switch projects any time from the top bar.</p>
    <div class="field"><label for="f-pname">Project name</label><input id="f-pname" name="name" required placeholder="e.g. The Bet (short film)" maxlength="80"></div>
    <div class="dlg-actions"><button class="btn ghost" value="cancel">Cancel</button><button class="btn primary" value="ok">Create project</button></div>`,
    fd => { const n = String(fd.get('name') || '').trim(); if (!n) return false; createProject(n); });
}
function renameDialog(id) {
  const p = projById(id); if (!p) return;
  showDlg(`<h3>Rename project</h3><div class="field"><label for="f-pname">Project name</label><input id="f-pname" name="name" required value="${esc(p.name)}" maxlength="80"></div>
    <div class="dlg-actions"><button class="btn ghost" value="cancel">Cancel</button><button class="btn primary" value="ok">Rename</button></div>`,
    fd => { const n = String(fd.get('name') || '').trim(); if (!n) return false; p.name = n; putProject(p).then(() => { renderProjUI(); driveMeta(p); }); });
}
function projRow(p) {
  const n = Object.keys(p.tools || {}).length;
  return `<div class="prow${p.id === curId ? ' cur' : ''}">
    <div class="pi"><b>${esc(p.name)}</b>${p.id === curId ? '<span class="tag">Open</span>' : ''}<small>${n} tool${n === 1 ? '' : 's'} used · changed ${esc(fmtWhen(p.changedAt || p.created))} · saved ${esc(fmtWhen(p.savedAt))}</small></div>
    <div class="pb">
      ${p.archived ? `<button type="button" class="btn sm" data-pa="unarchive" data-id="${esc(p.id)}">Restore</button><button type="button" class="btn sm danger" data-pa="delete" data-id="${esc(p.id)}">Delete…</button>`
      : `${p.id === curId ? '' : `<button type="button" class="btn sm" data-pa="open" data-id="${esc(p.id)}">Open</button>`}<button type="button" class="btn sm ghost" data-pa="rename" data-id="${esc(p.id)}">Rename</button><button type="button" class="btn sm ghost" data-pa="backups" data-id="${esc(p.id)}">Backups</button><button type="button" class="btn sm ghost" data-pa="archive" data-id="${esc(p.id)}">Archive</button>`}
    </div></div>`;
}
function manageDialog() {
  const act = activeProjects(), arch = projects.filter(p => p.archived && mine(p));
  showDlg(`<h3>Projects</h3><p class="sub">Archive projects you've finished with to tidy the list. Archived projects keep all their work and can be restored.</p>
    <div class="plist">${act.map(projRow).join('')}</div>
    ${arch.length ? `<div class="psec">Archived</div><div class="plist">${arch.map(projRow).join('')}</div>` : ''}
    <div class="dlg-actions"><button type="button" class="btn left" data-pa="new">New project</button><button class="btn primary" value="cancel">Done</button></div>`);
  dlg.classList.add('wide');
}
async function backupsDialog(id) {
  const p = projById(id); if (!p) return;
  const list = await backupsFor(id);
  const saved = await store.gtx('saves', 'readonly', s => s.get(id)).catch(() => null);
  if (id !== curId) { toast('Open the project first to restore it'); }
  let onDrive = null;
  if (account && hasToken() && p.owner === account.email) { try { onDrive = await driveBackupsFor(p); } catch (e) {} }
  const driveRows = onDrive === null ? (account ? '<div class="pnone" style="padding:12px 4px">Reconnect Google Drive (account button, top right) to see the backups kept there.</div>' : '')
    : onDrive.length ? onDrive.map(b => `<div class="prow"><div class="pi"><b>${esc(new Date(b.at).toLocaleString())}</b><small>${b.reason === 'auto' ? 'Automatic backup' : esc(b.reason[0].toUpperCase() + b.reason.slice(1))} · Google Drive</small></div><div class="pb">${id === curId ? `<button type="button" class="btn sm" data-pa="restore-drive" data-bid="${esc(b.fileId)}">Restore</button>` : ''}</div></div>`).join('')
    : '<div class="pnone" style="padding:12px 4px">No backups on Google Drive yet.</div>';
  showDlg(`<h3>Backups</h3><p class="sub">“${esc(p.name)}”: a backup is taken every few minutes while work changes. The latest ${KEEP_RECENT} are kept, plus one a day for ${KEEP_DAYS} days. Restoring takes a backup of the current state first, so nothing is lost.</p>
    <div class="plist">
      ${saved ? `<div class="prow"><div class="pi"><b>Last save</b><small>${esc(new Date(saved.at).toLocaleString())}</small></div><div class="pb">${id === curId ? `<button type="button" class="btn sm" data-pa="restore-save" data-id="${esc(id)}">Restore</button>` : ''}</div></div>` : ''}
      ${list.length ? list.map(b => `<div class="prow"><div class="pi"><b>${esc(new Date(b.at).toLocaleString())}</b><small>${b.reason === 'auto' ? 'Automatic backup' : esc(b.reason[0].toUpperCase() + b.reason.slice(1))}</small></div><div class="pb">${id === curId ? `<button type="button" class="btn sm" data-pa="restore" data-bid="${b.id}">Restore</button>` : ''}</div></div>`).join('')
        : '<div class="pnone" style="padding:14px 4px">No backups yet. The first one is taken a few minutes after you change something.</div>'}
    </div>
    ${account ? `<div class="psec">On Google Drive</div><div class="plist">${driveRows}</div>` : ''}
    <div class="dlg-actions"><button type="button" class="btn left" data-pa="manage">All projects</button><button class="btn primary" value="cancel">Done</button></div>`);
  dlg.classList.add('wide');
}
async function projAction(a, id, bid) {
  switch (a) {
    case 'open': dlg.close(); await switchProject(id); break;
    case 'new': dlg.close(); newProjectDialog(); break;
    case 'manage': dlg.close(); manageDialog(); break;
    case 'rename': dlg.close(); renameDialog(id); break;
    case 'backups': dlg.close(); backupsDialog(id); break;
    case 'archive': await archiveProject(id, true); dlg.close(); manageDialog(); break;
    case 'unarchive': await archiveProject(id, false); dlg.close(); manageDialog(); break;
    case 'delete': {
      const p = projById(id); dlg.close();
      if (await confirmDlg('Delete project?', `“${p.name}” and all of its work, saves and backups will be deleted from this browser. This can’t be undone.`, 'Delete for good', true)) { await deleteProject(id); toast('Project deleted'); }
      break;
    }
    case 'restore-save': {
      dlg.close(); const s = await store.gtx('saves', 'readonly', st => st.get(id)).catch(() => null);
      if (s && await confirmDlg('Restore last save?', 'Every tool in this project goes back to how it was at the last save. The current state is backed up first.', 'Restore')) await restoreFrom(s.snap, 'last save');
      break;
    }
    case 'restore-drive': {
      dlg.close();
      if (await confirmDlg('Restore backup from Google Drive?', 'Every tool in this project goes back to that backup. The current state is backed up first.', 'Restore')) {
        try { const d = await driveRead(bid); await restoreFrom(d.snap, 'backup from Google Drive'); } catch (e) { toast('Couldn’t read that backup: ' + e.message); }
      }
      break;
    }
    case 'restore': {
      dlg.close(); const b = await store.gtx('backups', 'readonly', st => st.get(+bid)).catch(() => null);
      if (b && await confirmDlg('Restore backup?', `Every tool in this project goes back to ${new Date(b.at).toLocaleString()}. The current state is backed up first.`, 'Restore')) await restoreFrom(b.snap, 'backup');
      break;
    }
  }
}

/* New-tab links point back at this hub file with #/solo/<id>; the hub then swaps itself for that tool.
   This keeps the tool on the same origin, so its saving (localStorage) works locally and when hosted. */
const soloUrl = id => location.href.split('#')[0] + '#/solo/' + encodeURIComponent(id);


/* ───────── theming for tools ─────────
   Each tool gets a small script injected at the top of its <head>. It:
   • flips the tool's own light/dark CSS (prefers-color-scheme rules) to match the hub,
   • adds hand-written light/dark styles for tools that only have one look (TOOL_THEME),
   • falls back to a colour inversion for any added tool that has no dark/light styles.
   It follows the hub live: via a direct call from the hub, or the storage event in a separate tab. */
const THEME_KEY = 'filmtoolhub-theme';
function fthEngine(CSS) {
  var KEY = 'filmtoolhub-theme', root = document.documentElement, orig = new WeakMap(), native = !!CSS.kit, st = null, prev = null;
  function fillCat() {
    var c = window.__fthCat; if (!c) return;
    var els = document.querySelectorAll('[data-fth-cat]');
    for (var i = 0; i < els.length; i++) els[i].textContent = c.num + ' · ' + c.name;
  }
  document.addEventListener('DOMContentLoaded', fillCat);
  var BASE = 'html.fth-invert{filter:invert(.9) hue-rotate(180deg)}html.fth-invert :is(img,video,canvas,picture,iframe){filter:invert(1) hue-rotate(180deg)}';
  var mmOrig = window.matchMedia ? window.matchMedia.bind(window) : null;
  function cur() {
    var v = window.__fthMode;
    if (!v) { try { v = window.parent !== window && window.parent.__fthTheme; } catch (e) {} }
    if (!v) { try { v = localStorage.getItem(KEY); } catch (e) {} }
    if (v !== 'light' && v !== 'dark') v = 'dark';
    return v;
  }
  function rw(t, mode) { return String(t).replace(/\(\s*prefers-color-scheme\s*:\s*(dark|light)\s*\)/gi, function (_, m) { return m.toLowerCase() === mode ? '(min-width:0px)' : '(min-width:999999px)'; }); }
  if (mmOrig) window.matchMedia = function (q) { return mmOrig(/prefers-color-scheme/i.test(q) ? rw(q, cur()) : q); };
  function walk(rules, mode) {
    for (var i = 0; i < rules.length; i++) {
      var r = rules[i];
      if (r.media && r.cssRules && typeof r.media.mediaText === 'string') {
        var t = orig.has(r) ? orig.get(r) : r.media.mediaText;
        if (/prefers-color-scheme/i.test(t)) { native = true; orig.set(r, t); var n = rw(t, mode); if (r.media.mediaText !== n) r.media.mediaText = n; }
      }
      if (r.cssRules) walk(r.cssRules, mode);
    }
  }
  function lum(c) {
    var m = String(c).match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/);
    if (!m || (m[4] !== undefined && +m[4] < 0.1)) return null;
    return (0.2126 * m[1] + 0.7152 * m[2] + 0.0722 * m[3]) / 255;
  }
  function apply(mode) {
    mode = mode === 'light' || mode === 'dark' ? mode : cur();
    window.__fthMode = mode;
    for (var i = 0; i < document.styleSheets.length; i++) { try { walk(document.styleSheets[i].cssRules, mode); } catch (e) {} }
    if (!st) { st = document.createElement('style'); st.setAttribute('data-fth', ''); }
    var css = BASE + (CSS[mode] || '');
    if (st.textContent !== css) st.textContent = css;
    if (!st.isConnected || st.nextElementSibling) (document.head || root).appendChild(st);
    root.classList.toggle('fth-dark', mode === 'dark'); root.classList.toggle('fth-light', mode === 'light');
    if (native) root.setAttribute('data-theme', mode);
    var inv = false;
    if (!native && !CSS[mode] && document.body) {
      root.classList.remove('fth-invert');
      var l = lum(getComputedStyle(document.body).backgroundColor); if (l == null) l = lum(getComputedStyle(root).backgroundColor); if (l == null) l = 1;
      inv = (mode === 'dark' && l > 0.5) || (mode === 'light' && l < 0.35);
    }
    root.classList.toggle('fth-invert', inv);
    root.style.colorScheme = inv ? '' : mode;
    if (prev && prev !== mode) {
      [].concat(CSS.after || []).forEach(function (fn) { try { if (typeof window[fn] === 'function') window[fn](); } catch (e) {} });
      try { window.dispatchEvent(new Event('resize')); } catch (e) {}
    }
    prev = mode;
  }
  window.__fthApply = apply;
  apply();
  /* Re-apply as each stylesheet arrives during page load, so a tool's own light/dark
     CSS is already switched by the time its scripts run and paint canvases. */
  try {
    var mo = new MutationObserver(function (recs) {
      for (var i = 0; i < recs.length; i++) for (var j = 0; j < recs[i].addedNodes.length; j++) {
        var n = recs[i].addedNodes[j];
        if (n.nodeName === 'STYLE' || n.nodeName === 'LINK' || (n.parentNode && n.parentNode.nodeName === 'STYLE')) { apply(); return; }
      }
    });
    mo.observe(document, {childList: true, subtree: true});
    document.addEventListener('DOMContentLoaded', function () { mo.disconnect(); });
  } catch (e) {}
  document.addEventListener('DOMContentLoaded', function () { apply(); });
  window.addEventListener('load', function () { apply(); });
  window.addEventListener('storage', function (e) { if (e.key === KEY && e.newValue) apply(e.newValue); });
}

/* ───────── projects inside tools ─────────
   Injected into every tool before its own scripts. Each tool keeps using localStorage and IndexedDB
   exactly as it was written, but every key and database is filed under the current project
   ("fth:p:<project>:<key>"), so switching project switches every tool's saved work.
   It also gives tools that never saved a small store (window.fthStore), tells the hub when work
   changes, and sends Ctrl/Cmd+S to the hub's Save. */
function fthProjectShim(cfg) {
  var realLS = window.localStorage, W = window, hub = null;
  try { if (W.parent !== W && W.parent.__fthHub) hub = W.parent.__fthHub; } catch (e) {}
  var P = (hub && hub.project) || (function () { try { return realLS.getItem('fth-current-project'); } catch (e) {} })() || 'default';
  var pre = 'fth:p:' + P + ':';
  var GLOBAL = /^(filmtoolhub-|fth-current-project$)/;
  var tool = cfg.tool;
  W.__fthProjectId = P;
  var tT;
  function touched() { clearTimeout(tT); tT = setTimeout(function () { try { if (hub) hub.touched(tool, P); } catch (e) {} }, 250); }
  function own() { var out = []; for (var i = 0; i < realLS.length; i++) { var k = realLS.key(i); if (k && k.indexOf(pre) === 0) out.push(k.slice(pre.length)); } return out; }
  var api = {
    getItem: function (k) { k = String(k); return GLOBAL.test(k) ? realLS.getItem(k) : realLS.getItem(pre + k); },
    setItem: function (k, v) { k = String(k); if (GLOBAL.test(k)) return realLS.setItem(k, v); realLS.setItem(pre + k, String(v)); touched(); },
    removeItem: function (k) { k = String(k); if (GLOBAL.test(k)) return realLS.removeItem(k); realLS.removeItem(pre + k); touched(); },
    clear: function () { own().forEach(function (k) { realLS.removeItem(pre + k); }); touched(); },
    key: function (i) { var o = own(); return i < o.length ? o[i] : null; }
  };
  var proxy = new Proxy(api, {
    get: function (t, p) { if (p === 'length') return own().length; if (p in t) return t[p]; if (typeof p === 'symbol') return undefined; return t.getItem(p); },
    set: function (t, p, v) { t.setItem(p, v); return true; },
    deleteProperty: function (t, p) { t.removeItem(p); return true; },
    has: function (t, p) { return p in t || t.getItem(p) !== null; },
    ownKeys: function () { return own(); },
    getOwnPropertyDescriptor: function (t, p) { var v = t.getItem(p); return v === null ? undefined : {value: v, enumerable: true, configurable: true, writable: true}; }
  });
  try { Object.defineProperty(W, 'localStorage', {configurable: true, get: function () { return proxy; }}); } catch (e) {}
  try {
    var idb = W.indexedDB, open = idb.open.bind(idb), del = idb.deleteDatabase.bind(idb);
    idb.open = function (name, v) { return v === undefined ? open(pre + name) : open(pre + name, v); };
    idb.deleteDatabase = function (name) { return del(pre + name); };
    var OS = W.IDBObjectStore.prototype;
    ['put', 'add', 'delete', 'clear'].forEach(function (m) { var f = OS[m]; OS[m] = function () { touched(); return f.apply(this, arguments); }; });
  } catch (e) {}
  /* small key/value store for tools whose work wasn't saved before */
  var dbp = null;
  function db() {
    return dbp || (dbp = new Promise(function (res, rej) {
      var r = W.indexedDB.open('fth-tool-data', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('kv'); };
      r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); };
    }));
  }
  function tx(mode, fn) { return db().then(function (d) { return new Promise(function (res, rej) { var t = d.transaction('kv', mode), q = fn(t.objectStore('kv')); t.oncomplete = function () { res(q && q.result); }; t.onerror = t.onabort = function () { rej(t.error); }; }); }); }
  W.fthStore = {
    get: function (k) { return tx('readonly', function (s) { return s.get(tool + ':' + k); }).catch(function () { return undefined; }); },
    set: function (k, v) { return tx('readwrite', function (s) { return s.put(v, tool + ':' + k); }).catch(function () {}); },
    del: function (k) { return tx('readwrite', function (s) { return s.delete(tool + ':' + k); }).catch(function () {}); }
  };
  /* save on change: call fthAutosave(fn) and fn runs (debounced) after the user changes something */
  W.fthAutosave = function (fn, ms) {
    var t; function go() { clearTimeout(t); t = setTimeout(function () { try { fn(); } catch (e) {} }, ms || 1200); }
    ['input', 'change', 'pointerup', 'keyup', 'drop', 'paste', 'wheel'].forEach(function (ev) { W.addEventListener(ev, go, true); });
    W.addEventListener('pagehide', function () { clearTimeout(t); try { fn(); } catch (e) {} });
    return go;
  };
  W.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 's' || e.key === 'S')) {
      e.preventDefault(); e.stopImmediatePropagation();
      try { if (hub) hub.save(); } catch (er) {}
    }
  }, true);
}

const FORM_DARK = `
html.fth-dark body{background:#15171b;color:#e7e5e0}
html.fth-dark .ed{border-right-color:#353a42}
html.fth-dark .pvw{background:#0c0e11}
html.fth-dark .ed h2{border-bottom-color:#e7e5e0}
html.fth-dark .ed h3{color:#c4c8ce}
html.fth-dark .sub,html.fth-dark .empty{color:#a3a8af}
html.fth-dark :is(input,select,textarea):not(#pv *){background:#1f2228;color:#e7e5e0;border-color:#575d66}
html.fth-dark :is(input,select,textarea):not(#pv *):focus{border-color:#8fb8f0;outline:none}
html.fth-dark button:not(#pv *){background:#1f2228;color:#e7e5e0;border-color:#5d636c}
html.fth-dark button:not(#pv *):hover:not(:disabled){background:#e7e5e0;color:#111;border-color:#e7e5e0}
html.fth-dark button.p:not(#pv *){background:#e7e5e0;color:#111;border-color:#e7e5e0}
html.fth-dark button.p:not(#pv *):hover{background:#fff}
html.fth-dark button:disabled{color:#6a6f76;border-color:#3a3f46}
html.fth-dark .i{border-color:#7ab0f2;color:#7ab0f2}
html.fth-dark .tip{background:#152335;border-left-color:#7ab0f2;color:#d4e3f6}
html.fth-dark .warn{background:#2b240f;border-color:#8a6d12;color:#f1e3b6}
html.fth-dark .warn.ok{background:#152335;border-color:#3d79c2;color:#d4e3f6}
html.fth-dark .cc{background:#1b1e23;border-color:#4b5058}
html.fth-dark .chip{color:#111}
html.fth-dark canvas{border-color:#8a8f96}
html.fth-dark .day{background:#1b1e23;border-color:#4b5058}
html.fth-dark .st{background:#202329;border-top-color:#4b5058;border-right-color:#4b5058;border-bottom-color:#4b5058}
html.fth-dark .st label{color:#a9aeb5}
html.fth-dark .stt{color:#7ab0f2}
html.fth-dark .inh{color:#8d939b!important;background:#272b31!important}
html.fth-dark .sw{border-color:#5d636c}
html.fth-dark table.ds tr.cur td:first-child{color:#7ab0f2}
html.fth-dark .cp{background:#1f2228;border-color:#5d636c;box-shadow:0 8px 30px #000a}
html.fth-dark .cp h4{color:#a3a8af}
html.fth-dark .cp .c.on{outline-color:#fff}
html.fth-dark .fkey span{border-color:#ffffff30}
html.fth-dark #pv{box-shadow:0 2px 18px #000c}
html.fth-dark ::-webkit-scrollbar{width:11px;height:11px}html.fth-dark ::-webkit-scrollbar-thumb{background:#3a3f47;border-radius:6px;border:2px solid #15171b}html.fth-dark ::-webkit-scrollbar-track{background:transparent}
`;

const TOOL_THEME = {
  callsheet: {kit: true},
  shotlist:  {kit: true},
  risk:      {kit: true},
  schedule:  {kit: true},
  preprod:       {kit: true},
  production:    {kit: true},
  postprod:      {kit: true},
  'pattern-lab': {kit: true, after: 'drawPlan'},
  exposure:      {kit: true, after: ['drawPlan', 'drawProfile']},
  palette:       {kit: true},
  blocking:      {kit: true},
  'script-dev':  {kit: true},
  breakdown:     {kit: true},
  'script-lining': {kit: true},
  lighting:      {kit: true},
  falsecolour:   {kit: true, after: 'drawHist'},
  dof:           {kit: true},
};

/* Shared kit (fonts, colours, buttons, fields, tool header). Tools marked kit:true in TOOL_THEME
   are built on it: the hub injects it first in <head> with the tool's category colour, and the
   tool's light/dark follows the hub through data-theme on its <html>. */
const FTH_KIT = await getText('hub/kit.css');
const KIT_FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
  + '<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..800&family=JetBrains+Mono:wght@400;500;600&family=Courier+Prime:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">';
function kitAccent(hex) {
  const n = parseInt(String(hex).replace('#', ''), 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
  const rgba = a => `rgba(${r},${g},${b},${a})`;
  const ink = '#' + [r, g, b].map(v => Math.round(v * 0.58).toString(16).padStart(2, '0')).join('');
  return `:root{--fth-cat:${hex};--fth-accent:${hex};--fth-accent-ink:${hex};--fth-accent-soft:${rgba(.14)};--fth-accent-line:${rgba(.45)};--fth-on-accent:#14110b}`
    + `:root[data-theme="light"]{--fth-accent:${ink};--fth-accent-ink:${ink};--fth-accent-soft:${rgba(.16)};--fth-accent-line:${rgba(.6)};--fth-on-accent:#ffffff}`;
}
function kitHead(t) {
  return KIT_FONTS + '<style data-fth-kit>' + FTH_KIT + kitAccent(catOf(t.category).color) + '</style>';
}

function themed(t) {
  const cfg = TOOL_THEME[t.id] || {};
  const c = catOf(t.category);
  const cat = JSON.stringify({num:c.num, name:c.name, color:c.color}).replace(/</g, '\\u003c');
  const boot = (cfg.kit ? kitHead(t) : '') + '<script data-fth>window.__fthCat=' + cat + ';(' + fthEngine.toString() + ')(' + JSON.stringify(cfg).replace(/</g, '\\u003c') + ');'
    + '(' + fthProjectShim.toString() + ')(' + JSON.stringify({tool: t.id}).replace(/</g, '\\u003c') + ');<\/script>';
  /* a tool file carries its own copy of the look for when it's opened on its own; inside the hub that copy is removed */
  let h = t.html.replace(/<!--fth-standalone-->[\s\S]*?<!--\/fth-standalone-->\s*/g, '');
  if (/<head[^>]*>/i.test(h)) h = h.replace(/<head[^>]*>/i, m => m + boot);
  else if (/<!doctype[^>]*>/i.test(h)) h = h.replace(/<!doctype[^>]*>/i, m => m + boot);
  else h = boot + h;
  return h + '<script data-fth>window.__fthApply&&window.__fthApply();<\/script>';
}

function getTheme() { return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'; }
function setTheme(mode) {
  document.documentElement.setAttribute('data-theme', mode);
  window.__fthTheme = mode;
  try { localStorage.setItem(THEME_KEY, mode); } catch (e) {}
  frames.forEach(f => { try { f.contentWindow.__fthApply && f.contentWindow.__fthApply(mode); } catch (e) {} });
  syncThemeBtn();
}
function syncThemeBtn() {
  const m = getTheme();
  $('#themeLbl').textContent = m === 'light' ? 'Light' : 'Dark';
  $('#themeBtn').title = `Theme: ${m}. Click to switch to ${m === 'light' ? 'dark' : 'light'} (applies to every tool)`;
}

/* ───────── home rendering ───────── */
let filter = 'all';
const qEl = $('#q');

function render() {
  const all = tools();
  const q = qEl.value.trim().toLowerCase();
  const match = t => !q || [t.name, t.desc, (t.tags || []).join(' '), catOf(t.category).name].join(' ').toLowerCase().includes(q);
  const visibleCats = CATS.filter(c => all.some(t => catOf(t.category).id === c.id));

  $('#counter').innerHTML = `<b>${all.length}</b> TOOLS &nbsp;·&nbsp; <b>${visibleCats.length}</b> STAGES<br>WRITE → PLAN → SHOOT`;

  $('#chips').innerHTML = [`<button class="chip" data-f="all" aria-pressed="${filter === 'all'}">All <span class="n">${all.length}</span></button>`]
    .concat(visibleCats.map(c => `<button class="chip" data-f="${c.id}" style="--cat:${c.color}" aria-pressed="${filter === c.id}"><span class="sw"></span>${esc(c.short || c.name)} <span class="n">${all.filter(t => catOf(t.category).id === c.id).length}</span></button>`)).join('');

  const n = localCount();
  $('#banner').innerHTML = n ? `<div class="banner">${UI.info}<p><b>${n} change${n > 1 ? 's' : ''}</b> are only in this browser, for trying things out. To publish ${n > 1 ? 'them' : 'it'} for everyone, the tool file${n > 1 ? 's go' : ' goes'} into the tools folder on GitHub.</p></div>` : '';

  let html = '';
  for (const c of visibleCats) {
    if (filter !== 'all' && filter !== c.id) continue;
    const list = all.filter(t => catOf(t.category).id === c.id && match(t));
    if (!list.length) continue;
    html += `<section class="section" style="--cat:${c.color}">
      <div class="sec-head"><div class="sec-num">${esc(c.num)}</div><h2>${esc(c.name)}</h2><p>${esc(c.blurb)}</p></div>
      <div class="grid">${list.map(card).join('')}</div></section>`;
  }
  $('#sections').innerHTML = html || `<div class="empty">No tools match “${esc(qEl.value)}”.</div>`;

  const h = hiddenBase();
  const rb = $('#restoreBtn'); rb.hidden = !h.length; rb.textContent = `Restore removed tools (${h.length})`;
  $('#resetBtn').hidden = !overrides.size;
  $('#storeNote').textContent = store.persistent
    ? 'Updates you upload here are only for trying out, in this browser. Publish them through GitHub.'
    : 'This browser is blocking storage, so uploaded updates last until you close the page.';
}

function card(t) {
  const c = catOf(t.category);
  const ver = `<span class="ver${t.htmlLocal ? ' local' : ''}" title="${t.updated ? 'Updated ' + esc(fmtDate(t.updated)) : 'Original version'}">v${t.ver || 1}${t.updated ? ' · ' + esc(fmtDate(t.updated)) : ''}</span>`;
  return `<div class="cardw" data-id="${esc(t.id)}" style="--cat:${c.color}">
    <a class="card" href="#/solo/${encodeURIComponent(t.id)}" target="_blank" rel="noopener" data-open="${esc(t.id)}" title="Click to open here · right-click to open in a new tab">
      <div class="ico">${ICONS[t.icon] || ICONS.generic}</div>
      <h3>${esc(t.name)}</h3>
      <p>${esc(t.desc || '')}</p>
      ${t.note ? `<div class="note">${esc(t.note)}</div>` : ''}
      <div class="meta"><span class="tags">${esc((t.tags || []).join(' · '))}</span>${cur() && (cur().tools || {})[t.id] ? '<span class="inproj" title="Used in the current project">● In project</span>' : ''}${ver}<span class="go">Open ${UI.arrow}</span></div>
    </a>
    <button class="more" data-menu="${esc(t.id)}" aria-label="Options for ${esc(t.name)}" aria-haspopup="menu" aria-expanded="false">${UI.dots}</button>
  </div>`;
}

/* ───────── tabs & workspace ───────── */
const ws = $('#workspace');
const frames = new Map();
let openTabs = [], active = null;

function frameFor(t) {
  let f = frames.get(t.id);
  if (!f) {
    f = document.createElement('iframe');
    f.title = t.name;
    f.setAttribute('allow', 'fullscreen; clipboard-read; clipboard-write; geolocation; camera; microphone; autoplay');
    if (t.html != null) f.srcdoc = themed(t);
    else {
      f.srcdoc = LOADING;
      loadHtml(t).then(() => { const n = byId(t.id); if (n && frames.get(t.id) === f) f.srcdoc = themed(n); })
        .catch(() => { f.srcdoc = LOADING.replace('Loading…', 'Couldn’t load this tool. Check your connection and press reload.'); });
    }
    ws.appendChild(f); frames.set(t.id, f);
  }
  return f;
}

function activate(id) {
  const t = id && byId(id);
  if (t) {
    if (!openTabs.includes(id)) openTabs.push(id);
    frameFor(t);
    active = id;
  } else active = null;
  frames.forEach((f, k) => f.classList.toggle('active', k === active));
  ws.hidden = !active;
  document.body.classList.toggle('tool-open', !!active);
  document.title = active ? `${t.name} · Film Tool Hub` : 'Film Tool Hub';
  renderBar();
}

function renderBar() {
  const tabs = openTabs.map(id => byId(id)).filter(Boolean);
  $('#tabs').innerHTML = tabs.length
    ? tabs.map(t => `<button class="tab${t.id === active ? ' active' : ''}" data-tab="${esc(t.id)}" style="--cat:${catOf(t.category).color}" title="${esc(t.name)}"><span class="dot"></span><span class="lbl">${esc(t.name)}</span><span class="x" data-close="${esc(t.id)}" role="button" aria-label="Close ${esc(t.name)}">${UI.close.replace('stroke-width="1.6"', 'stroke-width="2"').replace('<svg', '<svg width="13" height="13"')}</span></button>`).join('')
    : `<span class="tabs-hint">Open tools appear here as tabs</span>`;
  $('#barActions').innerHTML = active ? `
    <button class="ibtn" data-act="reload" title="Reload this tool">${UI.reload}</button>
    <button class="ibtn" data-act="newtab" title="Open in a new browser tab">${UI.newtab}<span class="t">New tab</span></button>
    <button class="ibtn" data-act="menu" data-menu="${esc(active)}" title="More options">${UI.dots}</button>` : '';
  const at = $('#tabs .tab.active'); if (at) at.scrollIntoView({block:'nearest', inline:'nearest'});
}

const go = id => { location.hash = id ? '#/tool/' + encodeURIComponent(id) : '#/'; };
function route() {
  const m = location.hash.match(/^#\/tool\/(.+)$/);
  activate(m ? decodeURIComponent(m[1]) : null);
}
function closeTab(id) {
  const i = openTabs.indexOf(id); if (i < 0) return;
  openTabs.splice(i, 1);
  const f = frames.get(id); if (f) { f.remove(); frames.delete(id); }
  if (active === id) {
    const next = openTabs[i] || openTabs[i - 1];
    history.replaceState(null, '', next ? '#/tool/' + encodeURIComponent(next) : '#/');
    activate(next || null);
  } else renderBar();
}
function reloadTool(id) { const t = byId(id), f = frames.get(id); if (!t || !f) return; if (t.html != null) f.srcdoc = themed(t); else loadHtml(t).then(() => { f.srcdoc = themed(byId(id)); }).catch(() => toast('Couldn’t load this tool')); }
function newTab(id) { const t = byId(id); if (t) window.open(soloUrl(id), '_blank'); }
function download(name, text, type='text/html') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], {type}));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 30000);
}

/* ───────── menu ───────── */
const menu = $('#menu');
let menuBtn = null;
function openMenu(btn, id) {
  const t = byId(id); if (!t) return;
  closeMenu(); menuBtn = btn; btn.setAttribute('aria-expanded', 'true');
  const isBase = baseIds.has(id);
  menu.innerHTML = `
    <div class="hint">${esc(t.name)}</div>
    ${active === id ? '' : `<button data-m="open">${UI.open}Open here</button>`}
    <button data-m="newtab">${UI.newtab}Open in new tab</button>
    <hr>
    <button data-m="update">${UI.upload}Upload new version…</button>
    <button data-m="edit">${UI.edit}Edit name, description &amp; stage</button>
    <button data-m="download">${UI.down}Download this tool’s HTML</button>
    ${isBase && t.local ? `<button data-m="revert">${UI.revert}Undo my changes to this tool</button>` : ''}
    <hr>
    <button data-m="remove" class="danger">${UI.trash}Remove from hub</button>`;
  menu.dataset.id = id; menu.hidden = false;
  const r = btn.getBoundingClientRect(), mw = menu.offsetWidth, mh = menu.offsetHeight;
  let left = Math.min(r.right - mw, innerWidth - mw - 8); left = Math.max(8, left);
  let top = r.bottom + 6; if (top + mh > innerHeight - 8) top = Math.max(8, r.top - mh - 6);
  menu.style.left = left + 'px'; menu.style.top = top + 'px';
  menu.querySelector('button').focus();
}
function closeMenu() { menu.hidden = true; if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false'); menuBtn = null; }

menu.addEventListener('click', async e => {
  const b = e.target.closest('[data-m]'); if (!b) return;
  const id = menu.dataset.id, t = byId(id); closeMenu(); if (!t) return;
  switch (b.dataset.m) {
    case 'open': go(id); break;
    case 'newtab': newTab(id); break;
    case 'update': pickFile(f => startUpdate(id, f)); break;
    case 'edit': editDialog(id); break;
    case 'download': await loadHtml(t); download(t.fileName || slug(t.name) + '.html', byId(id).html); break;
    case 'revert':
      if (await confirmDlg('Undo changes?', `${t.name} will go back to the version built into this hub file. Uploaded versions and edits for it will be discarded from this browser.`, 'Undo changes')) {
        await dropRec(id); refreshAfterChange(id); toast(`${t.name} restored to the built-in version`);
      } break;
    case 'remove':
      if (await confirmDlg('Remove tool?', baseIds.has(id) ? `${t.name} will be hidden from this hub. You can restore it from the link at the bottom of the page.` : `${t.name} was added in this browser and will be deleted from the hub.`, 'Remove', true)) {
        if (baseIds.has(id)) await saveRec(id, {hidden:true, hiddenAt:Date.now()}); else await dropRec(id);
        closeTab(id); render(); toast(`${t.name} removed`);
      } break;
  }
});

/* ───────── dialogs ───────── */
const dlg = $('#dlg'), form = $('#dlgForm');
function showDlg(html, onSubmit) {
  dlg.classList.remove('wide');
  form.innerHTML = html;
  form.onsubmit = e => { const v = e.submitter && e.submitter.value; if (v === 'ok' && onSubmit) { const r = onSubmit(new FormData(form)); if (r === false) e.preventDefault(); } };
  dlg.showModal();
  const first = form.querySelector('input:not([type=hidden]),select,textarea'); if (first) first.focus();
}
function confirmDlg(title, msg, okLabel, danger, altLabel) {
  return new Promise(res => {
    showDlg(`<h3>${esc(title)}</h3><p class="sub">${esc(msg)}</p><div class="dlg-actions"><button class="btn ghost" value="cancel">Cancel</button>${altLabel ? `<button class="btn" value="alt">${esc(altLabel)}</button>` : ''}<button class="btn ${danger ? 'danger' : 'primary'}" value="ok">${esc(okLabel)}</button></div>`);
    dlg.addEventListener('close', () => res(dlg.returnValue === 'ok' ? true : dlg.returnValue === 'alt' ? false : (altLabel ? null : false)), {once:true});
  });
}
const catOptions = sel => CATS.map(c => `<option value="${c.id}"${c.id === sel ? ' selected' : ''}>${esc(c.num + ' · ' + c.name)}</option>`).join('');
const fileBox = (f, title) => `<div class="filebox">${UI.file}<div><div class="fn">${esc(f.name)}</div><div class="ft">${title ? 'Page title: ' + esc(title) + ' · ' : ''}${(f.size / 1024).toFixed(0)} KB</div></div></div>`;

function editDialog(id) {
  const t = byId(id);
  showDlg(`<h3>Edit tool</h3><p class="sub">Change how ${esc(t.name)} appears in the hub.</p>
    <div class="field"><label for="f-name">Name</label><input id="f-name" name="name" required value="${esc(t.name)}"></div>
    <div class="field"><label for="f-desc">Description</label><textarea id="f-desc" name="desc">${esc(t.desc || '')}</textarea></div>
    <div class="field"><label for="f-cat">Stage</label><select id="f-cat" name="category">${catOptions(catOf(t.category).id)}</select></div>
    <div class="field"><label for="f-tags">Tags <span style="text-transform:none;letter-spacing:0">(comma separated)</span></label><input id="f-tags" name="tags" value="${esc((t.tags || []).join(', '))}"></div>
    <div class="dlg-actions"><button class="btn ghost" value="cancel">Cancel</button><button class="btn primary" value="ok">Save</button></div>`,
  fd => {
    const meta = {name:fd.get('name').trim() || t.name, desc:fd.get('desc').trim(), category:fd.get('category'), tags:fd.get('tags').split(',').map(s => s.trim()).filter(Boolean)};
    (t.custom ? saveRec(id, {meta}) : saveRec(id, {meta, metaAt:Date.now()})).then(() => { refreshAfterChange(id); toast('Saved'); });
  });
}

async function readHtml(file) {
  if (!/\.html?$/i.test(file.name) && !/html/.test(file.type)) { toast('That isn’t an HTML file'); return null; }
  const text = await file.text();
  if (!/<(!doctype|html|head|body|script|div|style)\b/i.test(text)) { toast('That file doesn’t look like an HTML page'); return null; }
  const m = text.match(/<title[^>]*>([^<]*)<\/title>/i);
  return {text, title: m ? m[1].trim() : ''};
}

const norm = s => (s || '').toLowerCase().replace(/\.html?$/, '').replace(/\(\d+\)/g, ' ')
  .replace(/\b(v ?\d+([._]\d+)*|copy|final|new|updated|latest|draft|\d{1,4})\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
function findMatch(file, title) {
  const keys = [norm(file.name), norm(title)].filter(Boolean);
  return tools().find(t => [t.name, t.fileName, t.origTitle].some(k => k && keys.includes(norm(k))));
}

async function startUpdate(id, file) {
  const t = byId(id); const r = await readHtml(file); if (!t || !r) return;
  const different = r.title && norm(r.title) !== norm(t.name) && norm(r.title) !== norm(t.origTitle) && norm(file.name) !== norm(t.fileName) && norm(file.name) !== norm(t.name);
  showDlg(`<h3>New version</h3><p class="sub">Replace <b>${esc(t.name)}</b> (currently v${t.ver || 1}) with this file.</p>
    ${fileBox(file, r.title)}
    ${different ? `<div class="warn">This file’s title doesn’t match ${esc(t.name)}. Check it’s the right tool before installing.</div>` : ''}
    <div class="field"><label for="f-note">What changed? <span style="text-transform:none;letter-spacing:0">(optional, shown on the card)</span></label><input id="f-note" name="note" placeholder="e.g. Added PDF export" maxlength="140"></div>
    <div class="dlg-actions"><button class="btn ghost left" value="asnew">Add as a separate tool</button><button class="btn ghost" value="cancel">Cancel</button><button class="btn primary" value="ok">Install v${(t.ver || 1) + 1}</button></div>`,
  fd => {
    saveRec(id, {html:r.text, htmlAt:Date.now(), fileName:file.name, note:fd.get('note').trim(), ver:(t.ver || 1) + 1}).then(() => {
      refreshAfterChange(id, true); toast(`${t.name} updated to v${(t.ver || 1) + 1}`);
    });
  });
  dlg.addEventListener('close', () => { if (dlg.returnValue === 'asnew') addDialog(file, r); }, {once:true});
}

async function handleNewFile(file) {
  const r = await readHtml(file); if (!r) return;
  const m = findMatch(file, r.title);
  if (m) startUpdate(m.id, file); else addDialog(file, r);
}

function addDialog(file, r) {
  const guess = r.title || file.name.replace(/\.html?$/i, '');
  showDlg(`<h3>Add tool</h3><p class="sub">Add a new HTML tool to the hub.</p>
    ${fileBox(file, r.title)}
    <div class="field"><label for="f-name">Name</label><input id="f-name" name="name" required value="${esc(guess)}"></div>
    <div class="field"><label for="f-desc">Description</label><textarea id="f-desc" name="desc" placeholder="What does it help students do?"></textarea></div>
    <div class="field"><label for="f-cat">Stage</label><select id="f-cat" name="category">${catOptions('other')}</select></div>
    <div class="field"><label for="f-tags">Tags <span style="text-transform:none;letter-spacing:0">(comma separated)</span></label><input id="f-tags" name="tags" placeholder="e.g. Director, Exports PDF"></div>
    <div class="dlg-actions"><button class="btn ghost" value="cancel">Cancel</button><button class="btn primary" value="ok">Add to hub</button></div>`,
  fd => {
    let id = slug(fd.get('name')); while (byId(id) || baseIds.has(id)) id += '-2';
    const now = Date.now();
    saveRec(id, {custom:true, meta:{name:fd.get('name').trim(), desc:fd.get('desc').trim(), category:fd.get('category'), tags:fd.get('tags').split(',').map(s => s.trim()).filter(Boolean)}, html:r.text, htmlAt:now, fileName:file.name, ver:1})
      .then(() => { render(); toast(`${fd.get('name').trim()} added`); });
  });
}

function addFromButton() {
  pickFile(handleNewFile);
}

function helpDialog() {
  showDlg(`<div class="help"><h3>How it works</h3><p class="sub">Each tool is its own file in the site’s tools folder. The hub opens them here.</p>
    <ol>
      <li><b>Open a tool</b> by clicking its card. It opens here as a tab, and other open tools keep their place when you switch.</li>
      <li><b>Open in a new browser tab</b> by right-clicking a card and choosing “Open link in new tab”, or with Ctrl/⌘-click.</li>
      <li><b>Update a tool</b> with the ⋯ menu → Upload new version, or drag the new HTML file onto its card. Drop a file anywhere else on the page to add a new tool; if its name matches an existing tool, the hub offers to update that one.</li>
      <li><b>Try a change.</b> Uploads here are kept in this browser only, so you can try a new version before anyone else sees it. To publish it, the tool file goes into the tools folder on GitHub.</li>
      <li><b>Light or dark.</b> The sun/moon button in the top bar switches the hub and every tool at once, including tools open in other tabs. Each browser remembers its own choice.</li>
      <li><b>Projects.</b> Pick a project in the top bar and every tool files its work under it, so you can move between tools on the same film. Archive projects you’ve finished with.</li>
      <li><b>Saving.</b> Work saves in this browser as you go. <b>Save</b> (or Ctrl/⌘+S) stores the project’s main copy, and backups are taken automatically every few minutes while you work. Restore either from Manage projects → Backups.</li>
    </ol></div>
    <div class="dlg-actions"><button class="btn primary" value="cancel">Got it</button></div>`);
}

function pickFile(cb) {
  const inp = $('#filePick'); inp.value = '';
  inp.onchange = () => { if (inp.files[0]) cb(inp.files[0]); };
  inp.click();
}

function refreshAfterChange(id, reloadFrame) {
  render(); renderBar();
  const t = byId(id), f = frames.get(id);
  if (t && f) { f.title = t.name; if (reloadFrame && t.html != null) f.srcdoc = themed(t); }
  if (active === id && t) document.title = `${t.name} · Film Tool Hub`;
}

/* ───────── export ───────── */

/* ───────── toast ───────── */
let toastT;
function toastLong(msg) { toast(msg); clearTimeout(toastT); toastT = setTimeout(() => $('#toast').classList.remove('show'), 12000); }
function toast(msg) { const el = $('#toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 3200); }

/* ───────── events ───────── */
document.addEventListener('click', e => {
  const open = e.target.closest('[data-open]');
  if (open) {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return; // let the browser open a new tab/window
    e.preventDefault(); go(open.dataset.open); return;
  }
  const mb = e.target.closest('[data-menu]');
  if (mb) { e.preventDefault(); if (menuBtn === mb) closeMenu(); else openMenu(mb, mb.dataset.menu); return; }
  if (!e.target.closest('#menu')) closeMenu();
  const x = e.target.closest('[data-close]'); if (x) { e.stopPropagation(); closeTab(x.dataset.close); return; }
  const tab = e.target.closest('[data-tab]'); if (tab) { go(tab.dataset.tab); return; }
  const chip = e.target.closest('[data-f]'); if (chip) { filter = chip.dataset.f; render(); return; }
  const act = e.target.closest('[data-act]');
  if (act) {
    if (act.dataset.act === 'reload') reloadTool(active);
    if (act.dataset.act === 'newtab') newTab(active);
  }
});
document.addEventListener('auxclick', e => { const x = e.target.closest('[data-tab]'); if (e.button === 1 && x) { e.preventDefault(); closeTab(x.dataset.tab); } });
$('#homeBtn').onclick = () => go(null);
$('#projBtn').onclick = e => { e.stopPropagation(); if (!pmenu().hidden) closeProjMenu(); else { closeMenu(); openProjMenu($('#projBtn')); } };
pmenu().addEventListener('click', e => {
  const b = e.target.closest('[data-pm]'); if (!b) return; closeProjMenu();
  if (b.dataset.pm === 'open') switchProject(b.dataset.id);
  if (b.dataset.pm === 'new') newProjectDialog();
  if (b.dataset.pm === 'manage') manageDialog();
});
document.addEventListener('click', e => { if (!pmenu().hidden && !e.target.closest('#pmenu,#projBtn')) closeProjMenu(); });
$('#saveBtn').onclick = () => saveProject();
document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 's' || e.key === 'S')) { e.preventDefault(); saveProject(); } });
form.addEventListener('click', e => { const b = e.target.closest('[data-pa]'); if (!b) return; e.preventDefault(); projAction(b.dataset.pa, b.dataset.id, b.dataset.bid); });
document.addEventListener('click', e => { const b = e.target.closest('[data-pact]'); if (!b) return; if (b.dataset.pact === 'signin') signInFlow(); if (b.dataset.pact === 'manage') manageDialog(); if (b.dataset.pact === 'new') newProjectDialog(); });
$('#acctBtn').onclick = e => { e.stopPropagation(); if (!account) { signInFlow(); return; } const m = $('#amenu'); if (!m.hidden) closeAcctMenu(); else { closeProjMenu(); closeMenu(); openAcctMenu(); } };
$('#amenu').addEventListener('click', e => {
  const b = e.target.closest('[data-am]'); if (!b) return;
  if (b.dataset.am === 'folder') { closeAcctMenu(); return; }
  closeAcctMenu();
  if (b.dataset.am === 'reconnect') reconnect();
  if (b.dataset.am === 'sync') driveSync(true);
  if (b.dataset.am === 'signout') signOut();
});
document.addEventListener('click', e => { if (!$('#amenu').hidden && !e.target.closest('#amenu,#acctBtn')) closeAcctMenu(); });
window.addEventListener('pagehide', () => { const p = cur(); if (p) putProject(p); });
$('#addBtn').onclick = addFromButton;
$('#helpBtn').onclick = helpDialog;
$('#themeBtn').onclick = () => setTheme(getTheme() === 'light' ? 'dark' : 'light');
syncThemeBtn();
window.addEventListener('storage', e => { if (e.key === THEME_KEY && (e.newValue === 'light' || e.newValue === 'dark') && e.newValue !== getTheme()) setTheme(e.newValue); });
$('#restoreBtn').onclick = async () => { for (const b of hiddenBase()) { const o = overrides.get(b.id); const {hidden, hiddenAt, ...rest} = o; if (rest.html || rest.meta) await saveRec(b.id, {hidden:false}); else await dropRec(b.id); } render(); toast('Removed tools restored'); };
$('#resetBtn').onclick = async () => {
  if (await confirmDlg('Discard all changes?', 'Every uploaded version, added tool and edit saved in this browser will be removed, and the hub will show the tools built into this file.', 'Discard everything', true)) {
    await store.clear(); overrides.clear(); openTabs.slice().forEach(closeTab); render(); toast('Back to the built-in tools');
  }
};
qEl.addEventListener('input', () => { if (filter !== 'all' && qEl.value) filter = 'all'; render(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !menu.hidden) { closeMenu(); return; }
  if (e.key === 'Escape' && !pmenu().hidden) { closeProjMenu(); return; }
  if (e.key === 'Escape' && !$('#amenu').hidden) { closeAcctMenu(); return; }
  if (e.key === '/' && !active && !dlg.open && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); qEl.focus(); }
});
window.addEventListener('resize', () => { closeMenu(); closeProjMenu(); closeAcctMenu(); });
window.addEventListener('scroll', () => { closeMenu(); closeProjMenu(); }, {passive:true});
window.addEventListener('hashchange', route);

/* drag & drop */
const drop = $('#drop'); let depth = 0, overCard = null;
const hasFiles = e => e.dataTransfer && [...e.dataTransfer.types].includes('Files');
const setOver = el => { if (overCard === el) return; if (overCard) overCard.classList.remove('drop'); overCard = el; if (el) el.classList.add('drop'); };
window.addEventListener('dragenter', e => { if (!hasFiles(e) || active || !isAdmin()) return; depth++; drop.hidden = false; });
window.addEventListener('dragleave', () => { if (--depth <= 0) { depth = 0; drop.hidden = true; setOver(null); } });
window.addEventListener('dragover', e => { if (!hasFiles(e) || active || !isAdmin()) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setOver(e.target.closest && e.target.closest('.cardw')); });
window.addEventListener('drop', e => {
  if (!hasFiles(e)) return; e.preventDefault();
  const cw = e.target.closest && e.target.closest('.cardw'); depth = 0; drop.hidden = true; setOver(null);
  if (active || !isAdmin()) return;
  const f = e.dataTransfer.files[0]; if (!f) return;
  if (cw) startUpdate(cw.dataset.id, f); else handleNewFile(f);
});

/* ───────── boot ───────── */
(async () => {
  const recs = await store.all();
  for (const r of recs) {
    const b = base.find(x => x.id === r.id);
    if (b) {
      const live = (r.html && r.htmlAt > b.rev) || (r.meta && r.metaAt > b.rev) || (r.hidden && r.hiddenAt > b.rev);
      if (!live) { store.del(r.id); continue; }   // this hub file already contains something newer
    } else if (!r.custom) { store.del(r.id); continue; }
    overrides.set(r.id, r);
  }
  await initProjects();
  const solo = location.hash.match(/^#\/solo\/(.+)$/);
  const st = solo && byId(decodeURIComponent(solo[1]));
  if (st) { try { await loadHtml(st); } catch (e) {} const s2 = byId(st.id); if (s2 && s2.html != null) { setTimeout(() => { document.open(); document.write(themed(s2)); document.close(); }, 0); return; } }
  renderAccount(); gisReady.then(renderAccount);
  render(); route(); renderProjUI();
  setInterval(renderProjUI, 60 * 1000);
})();
})();
