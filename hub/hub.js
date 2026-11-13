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
  moodboard: P('<rect x="3" y="3" width="8" height="10" rx="1.4"/><rect x="13" y="3" width="8" height="7" rx="1.4"/><rect x="13" y="12" width="8" height="9" rx="1.4"/><rect x="3" y="15" width="8" height="6" rx="1.4"/>'),
  coverage: P('<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5"/><path d="M9 12.5h6M9 16h3.5"/><path d="M15.2 15.6l1.4 1.4 2.6-2.8"/>'),
  casting:  P('<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M17.5 4.2l1 2 2.2.3-1.6 1.6.4 2.2-2-1-2 1 .4-2.2-1.6-1.6 2.2-.3z"/>'),
  recce:    P('<path d="M12 21s-6.5-5.6-6.5-10.4a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z"/><circle cx="12" cy="10.4" r="2.4"/>'),
  tasks:    P('<rect x="3.5" y="4" width="4.6" height="16" rx="1.2"/><rect x="9.7" y="4" width="4.6" height="10" rx="1.2"/><rect x="15.9" y="4" width="4.6" height="13" rx="1.2"/>'),
  schedule: P('<rect x="3" y="4" width="18" height="16" rx="1.6"/><path d="M3 9.3h18M3 14.6h18M8.5 4v16"/>'),
  shotlist: P('<rect x="2.8" y="9" width="12.5" height="10" rx="1.6"/><path d="M15.3 12.5l5.4-3v9.1l-5.4-3"/><circle cx="6.3" cy="5.6" r="2.2"/><circle cx="12" cy="5.6" r="2.2"/>'),
  blocking: P('<rect x="3" y="3" width="18" height="18" rx="1.4"/><path d="M3 13h5M13 3v5"/><circle cx="8.5" cy="17.5" r="1.6"/><path d="M10.2 16.2c2.6-1.4 4.4-3.4 5.2-6.4"/><path d="M13.6 10.4l1.8-1.3 1 2"/>'),
  lighting: P('<path d="M3.5 8.2l6.5-2.6v12.8l-6.5-2.6z"/><path d="M10 9h2.6v6H10"/><path d="M15.5 7.6l4.5-2M16 12h5M15.5 16.4l4.5 2"/>'),
  callsheet:P('<rect x="5" y="4.5" width="14" height="16.5" rx="1.6"/><path d="M9 4.5V3h6v1.5"/><path d="M8.5 10h7M8.5 13.5h7M8.5 17h4.5"/>'),
  risk:     P('<path d="M12 3.2l9.3 16.6H2.7z"/><path d="M12 10v4.6"/><circle cx="12" cy="17.2" r=".5" fill="currentColor"/>'),
  portrait: P('<circle cx="10" cy="12" r="6.2"/><path d="M10 5.8a6.2 6.2 0 0 1 0 12.4z" fill="currentColor" stroke="none" opacity=".35"/><path d="M18 6.5l2.6-1.8M18.8 12h2.8M18 17.5l2.6 1.8"/>'),
  palette:  P('<path d="M12 3.2a8.8 8.8 0 1 0 0 17.6c1.3 0 2-1 1.6-2.1-.5-1.2.3-2.4 1.6-2.4h1.9a3.7 3.7 0 0 0 3.7-3.7c0-5.2-4-9.4-8.8-9.4z"/><circle cx="7.6" cy="11.2" r="1.3"/><circle cx="10.2" cy="7.3" r="1.3"/><circle cx="14.8" cy="7.6" r="1.3"/>'),
  coverage: P('<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="M9 12.6l1.6 1.6 3.2-3.4"/><path d="M9 17.4h6"/>'),
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
  file:   P('<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5"/><path d="M9 14l-1.5 1.5L9 17M13 14l1.5 1.5L13 17"/>'),
  pin:    P('<path d="M9 3.5h6l-.8 6 3.3 4H6.5l3.3-4z"/><path d="M12 13.5V21"/>'),
  share:  P('<circle cx="9" cy="8.5" r="3.2"/><path d="M3 19.5c0-3.2 2.7-5.6 6-5.6s6 2.4 6 5.6"/><path d="M18.5 8v6M15.5 11h6"/>')
};

/* ───────── storage (IndexedDB, per browser) ───────── */
const store = (() => {
  const mem = new Map(); let db = null, ok = false;
  const ready = new Promise(res => {
    try {
      const r = indexedDB.open('film-tool-hub', 4);
      r.onupgradeneeded = () => {
        const d = r.result, have = n => d.objectStoreNames.contains(n);
        if (!have('tools')) d.createObjectStore('tools', {keyPath: 'id'});
        if (!have('projects')) d.createObjectStore('projects', {keyPath: 'id'});
        if (!have('saves')) d.createObjectStore('saves', {keyPath: 'id'});
        if (!have('backups')) d.createObjectStore('backups', {keyPath: 'id', autoIncrement: true}).createIndex('projectId', 'projectId');
        if (!have('docs')) d.createObjectStore('docs', {keyPath: 'id'}).createIndex('projectId', 'projectId');   /* Documentation: one entry per saved document */
        if (!have('msgs')) d.createObjectStore('msgs', {keyPath: 'id'}).createIndex('projectId', 'projectId');   /* Conversations: one entry per comment */
        if (!have('docfiles')) d.createObjectStore('docfiles');                                                    /* …and the file itself, by the same id */
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
const activeProjects = () => projects.filter(p => !p.archived && !p.hiddenShared && mine(p)).sort((a, b) => (b.openedAt || 0) - (a.openedAt || 0));
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
  snap.msgs = (await msgsAll(pid)).map(msgPublic);   /* Conversations */
  snap.docs = (await docsAll(pid)).map(docPublic);   /* the Documentation list (the files themselves are kept once, not in every snapshot) */
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
  } catch (e) { toast('Couldn’t save in this browser: ' + (e.message || e)); return false; }
  if (!tp) { if (!quiet) toast(driveOn() ? `Saved “${p.name}” in this browser. Sign in to save it to Google Drive.` : `Saved “${p.name}”`); return; }
  if (!(await tp)) { renderAccount(); toast(`Saved “${p.name}” in this browser only. Reconnect Google Drive to save it there too.`); return; }
  try { if (!quiet) toast('Saving to Google Drive…'); const how = await driveSave(p, snap); await putProject(p); renderAccount(); renderProjUI(); renderShare(); if (!quiet) toast(how === 'nothing' ? `“${p.name}” is up to date. You have no new changes to send.` : p.shared ? `Saved “${p.name}”. Your crew will get your changes.` : `Saved “${p.name}” to Google Drive`); }
  catch (e) { renderAccount(); toast('Saved in this browser, but Google Drive didn’t accept it: ' + e.message); }
  docsSendSoon(p, 400);
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
  await docsRestore(p, snap.docs);
  p.changedAt = Date.now(); await putProject(p);
  reloadFrames(); renderProjUI(); toast(`Restored ${label}`);
}

async function switchProject(id) {
  const next = projById(id); if (!next || id === curId) return;
  const tp = (next.needsDownload || next.remoteNewer) && account ? getToken(true).catch(() => null) : null;
  if (next.needsDownload && !(tp && await tp)) { toast('Connect Google Drive to open this project'); renderAccount(); return; }
  await leaveShared();
  const old = cur(); if (needsBackup(old)) backupProject(old, 'auto');
  curId = id; next.openedAt = Date.now(); next.hiddenShared = false; putProject(next);
  try { localStorage.setItem(CUR_KEY, id); } catch (e) {}
  window.__fthHub.project = id;
  if (tp && await tp) { await offerPull(next); }
  reloadFrames(); renderProjUI(); render(); toast(`Project: ${next.name}`);
  resetShare(); kickTick(); docsRefresh();
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
async function deleteProject(id, keepMarker) {
  const p = projById(id); if (!p) return;
  if (id === curId) await leaveShared();
  if (p.driveFileId && account && !p.sharedBy && !keepMarker) { if (await getToken(true).catch(() => null)) await driveTrash(p); }
  if (id === curId) await unloadFrames();
  await wipeProjectData(id); await docsWipe(id); await msgsWipe(id);
  await store.gtx('saves', 'readwrite', s => s.delete(id)).catch(() => {});
  for (const b of await backupsFor(id)) await store.gtx('backups', 'readwrite', s => s.delete(b.id)).catch(() => {});
  if (keepMarker) { Object.assign(p, {hiddenShared: true, dirty: null, tools: {}, needsDownload: true, driveRev: null, savedAt: 0, changedAt: 0, backupAt: 0}); await putProject(p); }
  else { await store.gtx('projects', 'readwrite', s => s.delete(id)).catch(() => {}); projects = projects.filter(x => x.id !== id); }
  if (id === curId) { curId = null; const other = activeProjects()[0]; if (other) { curId = other.id; localStorage.setItem(CUR_KEY, other.id); window.__fthHub.project = other.id; reloadFrames(); } else await createProject('Untitled project'); resetShare(); kickTick(); docsRefresh(); }
  renderProjUI(); render();
}

/* called by tools (through the shim) whenever their work changes */
window.__fthHub = {
  project: null,
  touched(tool, pid) {
    const p = projById(pid); if (!p) return;
    const now = Date.now(); p.changedAt = now; p.tools = p.tools || {}; p.tools[tool] = now;
    persistProjectSoon(p); if (pid === curId) { renderProjUI(); if (tool === 'tasks') setTimeout(() => { renderBar(); renderMe(); }, 600); }
  },
  /* shared projects: note exactly which saved item a tool changed, so Save only sends this person's changes */
  dirty(tool, pid, kind, name) {
    const p = projById(pid); if (!p || !p.shared || !name) return;
    const d = p.dirty || (p.dirty = {ls: {}, idb: {}}), now = Date.now();
    const isNew = kind === 'ls' ? !d.ls[name] : !(d.idb[name] && d.idb[name][tool]);
    if (kind === 'ls') d.ls[name] = [tool, now]; else (d.idb[name] || (d.idb[name] = {}))[tool] = now;
    if (isNew) { p.changedAt = now; putProject(p); }   /* remembered straight away, so it survives the page being closed */
  },
  /* shared projects: a tool can only be changed by the one person holding it */
  readOnly(tool, pid) { const p = projById(pid); return !!(p && p.shared) && !(pid === curId && held.has(tool)); },
  activity(tool, pid) {
    if (pid !== curId || !sharedCur()) return;
    lastAct[tool] = Date.now();
    if (!held.has(tool)) { viewTouched.add(tool); if (!lockOf(tool)) kickTick(); }
  },
  /* tools can wait on this: it resolves once the project is saved, and rejects if it couldn't be */
  save() { return saveProject().then(ok => { if (ok === false) throw new Error('not saved'); }); },
  /* save, and also keep a dated backup (used before a tool replaces a lot of work at once) */
  async saveWithBackup(why) { await this.save(); await backupProject(cur(), why || 'before a big change'); },
  projectInfo() { const p = cur(); return p ? {id: p.id, name: p.name} : null; },
  /* shared projects: everyone on the project, owner first, as {name, email, role, me}. [] when it isn't shared */
  people() { return projectPeople(cur()); },
  /* Documentation: every tool hands its exports to this one helper (through window.fthDocs in the tool) */
  saveDoc(tool, pid, o) { return saveDoc(tool, pid, o || {}); }
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
          if (!driveOk) { token = null; w.rej(new Error('Google Drive access wasn’t allowed, so your projects can’t be saved to your Drive. Click Sign in again and tick the Google Drive box.')); return; }
          /* with two Google accounts in one browser, Google can connect the other one: its Drive doesn't hold this person's projects */
          tokenIsFor(r.access_token, w.want).then(other => {
            if (other) {
              pickAcct = true; token = null; tokenExp = 0; renderAccount();
              setTimeout(() => toastLong(`Google connected ${other}, but you’re signed in here as ${w.want}. Reconnect and choose ${w.want}, or sign out here to switch accounts.`), 80);
              w.rej(new Error('wrong account')); return;
            }
            pickAcct = false;
            token = r.access_token; tokenExp = Date.now() + (r.expires_in || 3600) * 1000;
            w.res(token);
            setTimeout(syncPins, 0);   /* pinned tools follow the person between devices */
          });
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
let pickAcct = false;
/* whose Drive did Google connect? Returns the email when it isn't the person signed in here */
async function tokenIsFor(t, want) {
  if (!want) return '';
  try {
    const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {headers: {Authorization: 'Bearer ' + t}});
    const me = r.ok ? await r.json() : null;
    return me && me.email && me.email.toLowerCase() !== want.toLowerCase() ? me.email : '';
  } catch (e) { return ''; }
}
function getToken(interactive, renew) {
  if (hasToken() && !renew) return Promise.resolve(token);
  if (!interactive || !tokenClient) return Promise.reject(new Error('not connected'));
  if (tokenWait) tokenWait.rej(new Error('superseded'));
  return new Promise((res, rej) => {
    tokenWait = {res, rej, want: account && account.email};
    try { tokenClient.requestAccessToken(account ? {prompt: pickAcct ? 'select_account' : '', login_hint: account.email} : {prompt: 'consent'}); }
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
    const err = new Error('Google Drive error ' + r.status + (why ? ': ' + why : '')); err.status = r.status; throw err;
  }
  return r;
}
const gjson = async (url, opts) => (await gapi(url, opts)).json();
const qs = o => Object.entries(o).map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&');
const qEsc = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
async function findFiles(q, fields) {
  const out = []; let pageToken = '';
  do {
    const r = await gjson(`${DRIVE_API}/files?` + qs({q: q + ' and trashed=false', spaces: 'drive', pageSize: 200, fields: `nextPageToken,files(${fields || 'id,name,modifiedTime,appProperties,headRevisionId,ownedByMe,owners(displayName,emailAddress)'})`, ...(pageToken ? {pageToken} : {})}));
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
let foldersBusy = null;
function ensureFolders() {
  if (folders) return Promise.resolve(folders);
  if (!foldersBusy) foldersBusy = (async () => {   /* one lookup at a time, so two callers can't both create the folders */
    try {
      const root = await folder('Film Tool Hub', {fth: 'root'});
      const [projectsF, backupsF] = await Promise.all([folder('Projects', {fth: 'projects'}, root), folder('Backups', {fth: 'backups'}, root)]);
      return (folders = {root, projects: projectsF, backups: backupsF});
    } finally { foldersBusy = null; }
  })();
  return foldersBusy;
}
/* upload (create when no fileId) with a resumable session, so big projects (script PDFs, stills) fit */
async function uploadFile(meta, text, fileId) {
  const type = meta.mimeType || 'application/json';
  const start = await gapi(`${DRIVE_UP}/files${fileId ? '/' + fileId : ''}?uploadType=resumable&fields=id,modifiedTime,headRevisionId`, {
    method: fileId ? 'PATCH' : 'POST', headers: {'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': type}, body: JSON.stringify(meta)});
  const loc = start.headers.get('Location'); if (!loc) throw new Error('upload not started');
  const r = await fetch(loc, {method: 'PUT', headers: {'Content-Type': type}, body: new Blob([text], {type})});
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
const projectMeta = p => ({id: p.id, name: p.name, created: p.created, archived: !!p.archived, tools: p.tools || {}, ...(p.crew && p.crew.length || p.crewAt ? {crew: p.crew || [], crewAt: p.crewAt || 0} : {})});
/* the crew list (who a shared project is shared with, and the name the owner gave each person) travels in
   the project file. Only the owner changes it; everyone takes the newest one they see. */
const cleanCrew = l => (Array.isArray(l) ? l : []).filter(c => c && c.email).map(c => ({email: String(c.email).toLowerCase(), name: String(c.name || '').trim().slice(0, 60), ...(c.role ? {role: String(c.role).trim().slice(0, 40)} : {}), ...(Array.isArray(c.aka) && c.aka.length ? {aka: c.aka.map(String).slice(-5)} : {})}));
function takeCrew(p, proj) {
  if (!proj || !((proj.crewAt || 0) > (p.crewAt || 0))) return;
  p.crew = cleanCrew(proj.crew); p.crewAt = proj.crewAt;
}
const fileName = p => `${p.name}.filmtoolhub.json`;

async function driveSave(p, snap) {
  if (p.shared && p.driveFileId) return sharedSave(p, snap);
  const f = await ensureFolders();
  const body = JSON.stringify({app: 'film-tool-hub', v: 1, savedAt: snap.at, savedBy: whoAmI(), project: projectMeta(p), snap: await packValue(snap)});
  const meta = {name: fileName(p), mimeType: 'application/json', appProperties: {fth: 'project', fthId: p.id, archived: p.archived ? '1' : '0'}};
  let r;
  try { r = await uploadFile(p.driveFileId ? meta : {...meta, parents: [f.projects]}, body, p.driveFileId); }
  catch (e) { if (!p.driveFileId) throw e; p.driveFileId = null; r = await uploadFile({...meta, parents: [f.projects]}, body); }
  p.driveFileId = r.id; p.driveSyncedAt = Date.parse(r.modifiedTime) || Date.now(); p.owner = account && account.email;
  p.remoteNewer = 0; p.needsDownload = false; p.driveRev = r.headRevisionId || null;
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
    const df = (docDirs.get(p.id) || {}).root;
    if (df) await gapi(`${DRIVE_API}/files/${df}?fields=id`, {method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name: p.name})});
  } catch (e) {}
}
async function driveTrash(p) {
  if (!hasToken()) return;
  const ids = [];
  if (p.driveFileId) ids.push(p.driveFileId);
  try { (await findFiles(byProp('fth', 'pbackups') + ' and ' + byProp('fthId', p.id))).forEach(f => ids.push(f.id)); } catch (e) {}
  try { (await findFiles(byProp('fth', 'docs') + ' and ' + byProp('fthId', p.id))).forEach(f => ids.push(f.id)); } catch (e) {}
  for (const id of ids) await gapi(`${DRIVE_API}/files/${id}?fields=id`, {method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({trashed: true})}).catch(() => {});
}

/* bring a project's Drive copy into this browser */
async function pullProject(p, fileId) {
  const whole = !fileId || fileId === p.driveFileId;
  const meta = whole ? await fileMeta(p).catch(() => null) : null;
  const data = await driveRead(fileId || p.driveFileId);
  const here = p.id === curId;
  if (here) await unloadFrames();
  await restoreSnapshot(p.id, data.snap);
  await docsMergeIn(p, data.snap.docs, data.snap.docFiles); await msgsMergeIn(p, data.snap.msgs);
  Object.assign(p, {name: data.project.name || p.name, tools: data.project.tools || p.tools || {}, archived: !!data.project.archived,
    savedAt: data.savedAt, changedAt: data.savedAt, backupAt: data.savedAt, needsDownload: false, remoteNewer: 0, owner: account && account.email});
  if (whole) takeCrew(p, data.project);
  if (whole) { p.driveSyncedAt = Math.max(p.driveSyncedAt || 0, data.savedAt || 0); if (meta) { p.driveRev = meta.rev; noteMeta(p, meta.f); } p.dirty = null; }
  await putProject(p);
  if (here) reloadFrames();
}
/* compare this browser with Drive: new projects from other computers appear, newer saves are offered */
async function driveSync(askAboutCurrent) {
  if (!hasToken() || driveSyncing) return;
  driveSyncing = true; renderAccount();
  try {
    await ensureFolders();
    syncPins();
    const files = await findFiles(byProp('fth', 'project'));
    for (const f of files) {
      const id = (f.appProperties || {}).fthId; if (!id) continue;
      const mod = Date.parse(f.modifiedTime) || 0;
      let p = projById(id);
      if (!p) {
        p = {id, name: f.name.replace(/\.filmtoolhub\.json$/i, ''), created: mod, openedAt: 0, tools: {}, archived: f.ownedByMe !== false && (f.appProperties || {}).archived === '1',
          owner: account.email, driveFileId: f.id, driveSyncedAt: 0, needsDownload: true, savedAt: mod};
        noteMeta(p, f);
        projects.push(p); await putProject(p); continue;
      }
      if (p.hiddenShared) continue;
      if (p.owner && p.owner !== account.email) {
        /* a shared project last opened here by someone else: load this person's copy from Drive, unless unsaved work would be lost */
        if (f.ownedByMe !== false && p.driveFileId !== f.id) continue;
        if (dirtyTools(p).size || (p.changedAt || 0) > (p.driveSyncedAt || 0) + 3000) continue;
        Object.assign(p, {needsDownload: true, driveRev: null, dirty: null});
      }
      /* two files can carry the same project (a copy made in Drive): keep to the one already in use */
      if (p.driveFileId && p.driveFileId !== f.id && files.some(x => x.id === p.driveFileId)) continue;
      p.owner = account.email; p.driveFileId = f.id;
      const wasShared = !!p.shared; noteMeta(p, f);
      if (p.shared && wasShared && p.driveRev) { /* shared projects keep themselves up to date while open */ }
      else if (mod > (p.driveSyncedAt || 0) + 3000) p.remoteNewer = mod;
      await putProject(p);
    }
    const c = cur();
    if (c && (c.needsDownload || c.remoteNewer) && askAboutCurrent !== false) await offerPull(c);
  } catch (e) { if (e.message !== 'not connected') toastLong('Couldn’t reach Google Drive. ' + e.message); }
  driveSyncing = false;
  if (!mine(cur() || {})) { const m = activeProjects()[0]; if (m) await switchProject(m.id); }
  renderAccount(); renderProjUI(); render(); kickTick(); docsSendSoon(cur(), 200);
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
    adoptPins();
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
  } catch (e) { if (!/cancel|closed|superseded|wrong account/i.test(e.message)) toastLong('Couldn’t sign in. ' + e.message); renderAccount(); }
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
  if (clear) { delete pinStore[email]; savePins(); }
  renderBar();
  if (clear) {
    await unloadFrames();
    for (const p of projects.filter(p => p.owner === email || !p.owner)) {
      await wipeProjectData(p.id); await docsWipe(p.id); await msgsWipe(p.id);
      await store.gtx('saves', 'readwrite', s => s.delete(p.id)).catch(() => {});
      for (const b of await backupsFor(p.id)) await store.gtx('backups', 'readwrite', s => s.delete(b.id)).catch(() => {});
      await store.gtx('projects', 'readwrite', s => s.delete(p.id)).catch(() => {});
    }
    projects = projects.filter(p => p.owner && p.owner !== email);
  }
  if (!activeProjects().length) { curId = null; await createProject('My first project'); }
  else if (!mine(cur() || {})) { curId = null; await switchProject(activeProjects()[0].id); }
  reloadFrames(); renderAccount(); renderProjUI(); render(); docsRefresh();
  toast('Signed out');
}

/* ───────── pinned tools ─────────
   A pinned tool keeps its tab at the left of the top bar, whether or not it's open, so the tools a
   person uses most are always one click away. Pins belong to the person, not the project. They're
   kept in this browser and, once signed in, in a small "Settings" file in their Film Tool Hub folder
   on Google Drive, so the same pins appear on every device. The most recent change wins. */
const PINS_KEY = 'filmtoolhub-pins';
let pinStore = {};
try { const v = JSON.parse(localStorage.getItem(PINS_KEY) || '{}'); if (v && typeof v === 'object' && !Array.isArray(v)) pinStore = v; } catch (e) {}
const pinWho = () => (account && account.email) || '';
const pinRec = () => { const k = pinWho(); let r = pinStore[k]; if (!r || !Array.isArray(r.ids)) r = pinStore[k] = {ids: [], at: 0}; return r; };
const pins = () => pinRec().ids.filter(id => byId(id));
const isPinned = id => pinRec().ids.includes(id);
const savePins = () => { try { localStorage.setItem(PINS_KEY, JSON.stringify(pinStore)); } catch (e) {} };
let pinPushT;
function togglePin(id) {
  const t = byId(id); if (!t) return;
  const r = pinRec(), i = r.ids.indexOf(id);
  if (i < 0) r.ids.push(id); else r.ids.splice(i, 1);
  r.at = Date.now(); savePins();
  renderBar(); render();
  toast(i < 0 ? `${t.name} pinned to the top bar` : `${t.name} unpinned`);
  clearTimeout(pinPushT); pinPushT = setTimeout(syncPins, 1200);
}
/* pins made before signing in on this device join the person's own, rather than replacing them */
function adoptPins() {
  const anon = pinStore[''];
  if (!account || !anon || !Array.isArray(anon.ids) || !anon.ids.length) return;
  const r = pinRec();
  r.ids = [...new Set([...r.ids, ...anon.ids])]; r.join = true;
  delete pinStore['']; savePins(); renderBar(); render();
}
let pinSyncBusy = null, pinSyncAgain = false, pinSyncAt = 0;
async function syncPins() {
  if (!driveOn() || !account || !hasToken()) return;
  if (pinSyncBusy) { pinSyncAgain = true; return pinSyncBusy; }
  pinSyncBusy = (async () => {
    try {
      const who = account.email, r = pinRec();
      const f = await ensureFolders();
      const hit = (await findFiles(byProp('fth', 'settings'), 'id,modifiedTime')).sort((a, b) => Date.parse(b.modifiedTime) - Date.parse(a.modifiedTime))[0];
      let remote = hit ? await gjson(`${DRIVE_API}/files/${hit.id}?alt=media`).catch(() => null) : null;
      if (!remote || !Array.isArray(remote.pins)) remote = null;
      if (pinWho() !== who) return;
      const rIds = remote ? remote.pins.filter(x => typeof x === 'string') : [], rAt = remote ? +remote.pinsAt || 0 : 0;
      let send = false;
      if (r.join) { r.ids = [...new Set([...rIds, ...r.ids])]; r.at = Date.now(); delete r.join; send = r.ids.length !== rIds.length; if (!send) r.at = rAt; }
      else if (rAt > (r.at || 0)) { r.ids = rIds; r.at = rAt; }
      else if ((r.at || 0) > rAt && (remote || r.ids.length)) send = true;
      savePins(); renderBar(); render();
      if (send) {
        const body = JSON.stringify({app: 'film-tool-hub', kind: 'settings', v: 1, pins: r.ids, pinsAt: r.at});
        const meta = {name: 'Settings.filmtoolhub.json', mimeType: 'application/json', appProperties: {fth: 'settings'}};
        await uploadFile(hit ? meta : {...meta, parents: [f.root]}, body, hit && hit.id);
      }
      pinSyncAt = Date.now();
    } catch (e) {}
  })();
  await pinSyncBusy; pinSyncBusy = null;
  if (pinSyncAgain) { pinSyncAgain = false; return syncPins(); }
}
/* coming back to the page: pick up pins changed on another device */
document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - pinSyncAt > 60e3) syncPins(); });
window.addEventListener('focus', () => { if (Date.now() - pinSyncAt > 60e3) syncPins(); });

/* ───────── shared projects ─────────
   The owner shares a project's Drive file with the crew (they get edit access to that one file).
   There's no server, so everything is co-ordinated through that file:
   • Save fetches the latest copy first and lays only this person's changes on top (p.dirty lists them),
     so nobody's work is overwritten. Other people's saves are picked up automatically every few seconds.
   • One editor per tool. Whoever opens a tool first holds it: a small note on the Drive file
     ("lk.<tool>" = time|email|session|name). Everyone else sees that tool view-only, with Request to edit
     ("rq.<tool>"). A hold lapses after a few minutes without activity; the owner can always take over. */
const API_KEY = String(CONFIG.googleApiKey || '').trim();
const APP_ID = String(CONFIG.googleAppId || GOOGLE_ID.split('-')[0] || '').trim();
const KV_DB = 'fth-tool-data';
const HOLD_MS = 5 * 60e3, IDLE_MS = 4 * 60e3, BEAT_MS = 60e3, REQ_MS = 2 * 60e3, TICK_MS = 8000, FAST_MS = 1500;
let SID = '';
try { SID = sessionStorage.getItem('filmtoolhub-sid') || ''; } catch (e) {}
if (!SID) { SID = Math.random().toString(36).slice(2, 8); try { sessionStorage.setItem('filmtoolhub-sid', SID); } catch (e) {} }
const held = new Set(), pending = new Map(), viewTouched = new Set(), lastAct = {};
let sh = {props: {}, at: 0, lost: false}, myReq = null, reqShown = null, tickBusy = null, tickT = null, saveBusy = null, inTick = false;

const whoAmI = () => account ? {email: account.email, name: account.name || account.email} : null;
const sharedCur = () => { const p = cur(); return p && p.shared && p.driveFileId && !p.needsDownload ? p : null; };
const isOwner = p => !!p && !p.sharedBy;
const toolName = id => (byId(id) || {}).name || id;
const firstName = l => String((l && (l.name || l.email)) || 'Someone').split(/[\s@]/)[0];
function dirtyTools(p) {
  const out = new Set(), d = p && p.dirty; if (!d) return out;
  Object.values(d.ls || {}).forEach(v => out.add(v[0]));
  Object.values(d.idb || {}).forEach(m => Object.keys(m).forEach(t => out.add(t)));
  return out;
}
function dropDirty(p, toolIds) {
  const d = p.dirty; if (!d) return;
  for (const k of Object.keys(d.ls || {})) if (toolIds.includes(d.ls[k][0])) delete d.ls[k];
  for (const n of Object.keys(d.idb || {})) { toolIds.forEach(t => delete d.idb[n][t]); if (!Object.keys(d.idb[n]).length) delete d.idb[n]; }
}
/* what Drive says about a project's file: who owns it and whether it's shared */
function noteMeta(p, f) {
  const ap = f.appProperties || {};
  if (f.ownedByMe === false) { const o = (f.owners || [])[0] || {}; p.sharedBy = {email: o.emailAddress || '', name: o.displayName || o.emailAddress || 'the owner'}; p.shared = true; p.archived = false; }
  else if (f.ownedByMe === true) { p.sharedBy = null; p.shared = ap.shared === '1'; }
  if (!p.shared) p.dirty = null;
}
async function fileMeta(p) {
  const f = await gjson(`${DRIVE_API}/files/${p.driveFileId}?fields=id,name,headRevisionId,modifiedTime,appProperties,ownedByMe,trashed,owners(displayName,emailAddress),capabilities(canEdit)`);
  return {rev: f.headRevisionId || f.modifiedTime, props: f.appProperties || {}, f};
}
async function patchProps(p, props) {
  const f = await gjson(`${DRIVE_API}/files/${p.driveFileId}?fields=appProperties`, {method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({appProperties: props})});
  if (p.id === curId) sh.props = f.appProperties || {};
}
async function rawRead(fileId, revId) {
  const data = await gjson(`${DRIVE_API}/files/${fileId}${revId ? '/revisions/' + revId : ''}?alt=media`);
  if (!data || data.app !== 'film-tool-hub' || !data.snap) throw new Error('not a Film Tool Hub file');
  return data;
}
/* the save just before mine: if it isn't the one I built on, someone saved at the same moment */
async function prevRev(fileId, myRev) {
  const list = []; let pageToken = '';
  do {
    const r = await gjson(`${DRIVE_API}/files/${fileId}/revisions?` + qs({pageSize: 200, fields: 'nextPageToken,revisions(id,modifiedTime)', ...(pageToken ? {pageToken} : {})}));
    list.push(...(r.revisions || [])); pageToken = r.nextPageToken || '';
  } while (pageToken);
  list.sort((a, b) => Date.parse(a.modifiedTime) - Date.parse(b.modifiedTime));
  const i = list.findIndex(r => r.id === myRev);
  return i > 0 ? list[i - 1].id : null;
}

/* ── merging: the Drive copy, with only my own changes laid on top ── */
const packedSnapshot = async pid => packValue(await snapshot(pid));
const kvOk = d => d && d.stores && d.stores.kv && Array.isArray(d.stores.kv.records);
const kvMine = toolsMap => { const pf = Object.keys(toolsMap || {}).map(t => t + ':'); return k => typeof k === 'string' && pf.some(x => k.startsWith(x)); };
function mergeSnap(remote, local, dirty) {
  const out = {...local, ls: {...(remote.ls || {})}, idb: {...(remote.idb || {})}}, d = dirty || {};
  for (const k of Object.keys(d.ls || {})) { if (k in local.ls) out.ls[k] = local.ls[k]; else delete out.ls[k]; }
  for (const [n, toolsMap] of Object.entries(d.idb || {})) {
    const mineDb = local.idb[n], theirs = out.idb[n];
    if (n === KV_DB && kvOk(mineDb) && kvOk(theirs)) {
      /* the small shared store holds every tool's entries, named "<tool>:<key>": swap in only my tools' entries */
      const isMine = kvMine(toolsMap);
      const recs = theirs.stores.kv.records.filter(r => !isMine(r[0])).concat(mineDb.stores.kv.records.filter(r => isMine(r[0])));
      out.idb[n] = {...theirs, stores: {...theirs.stores, kv: {...theirs.stores.kv, records: recs}}};
    } else if (mineDb) out.idb[n] = mineDb; else delete out.idb[n];
  }
  return out;
}
const dumpCount = d => Object.values((d && d.stores) || {}).reduce((n, s) => n + ((s.records || []).length), 0);
/* refill an open tool database in place (no need to close the tools using it) */
async function fillDB(name, dump, keep) {
  let d; try { d = await openDB(name); } catch (e) { return false; }
  try {
    const names = Object.keys(dump.stores || {});
    if (d.version !== (dump.version || 1) || names.length !== d.objectStoreNames.length || names.some(n => !d.objectStoreNames.contains(n))) return false;
    if (!names.length) return true;
    await new Promise((res, rej) => {
      const t = d.transaction(names, 'readwrite');
      for (const sn of names) {
        const s = t.objectStore(sn), m = dump.stores[sn];
        const put = () => { for (const [k, v] of m.records) { if (keep && keep(k)) continue; if (s.keyPath == null) s.put(v, k); else s.put(v); } };
        if (!keep) { s.clear(); put(); }
        else s.openCursor().onsuccess = e => { const c = e.target.result; if (c) { if (!keep(c.primaryKey)) c.delete(); c.continue(); } else put(); };
      }
      t.oncomplete = res; t.onerror = t.onabort = () => rej(t.error);
    });
    return true;
  } catch (e) { return false; } finally { d.close(); }
}
/* make this browser match the merged copy, leaving alone anything I've changed in the meantime */
async function applyLocal(p, merged, local) {
  const pre = PFX(p.id), d = () => p.dirty || {ls: {}, idb: {}}, rebuild = []; let changed = false;
  for (const k of new Set([...Object.keys(merged.ls), ...Object.keys(local.ls)])) {
    if (d().ls[k] || merged.ls[k] === local.ls[k]) continue;
    changed = true;
    try { if (k in merged.ls) localStorage.setItem(pre + k, merged.ls[k]); else localStorage.removeItem(pre + k); } catch (e) {}
  }
  for (const n of new Set([...Object.keys(merged.idb), ...Object.keys(local.idb)])) {
    const a = merged.idb[n], b = local.idb[n], mineNow = d().idb[n];
    if (mineNow && n !== KV_DB) continue;
    if (!a) { if (b && dumpCount(b)) rebuild.push([n, null]); continue; }
    if (b && JSON.stringify(a) === JSON.stringify(b)) continue;
    changed = true;
    const dump = unpackValue(a);
    if (!b && !(await listDBs(pre)).includes(pre + n)) { try { await loadDB(pre + n, dump); } catch (e) {} continue; }
    if (!(b && await fillDB(pre + n, dump, mineNow ? kvMine(mineNow) : null))) rebuild.push([n, dump]);
  }
  if (!rebuild.length) return {changed};
  await unloadFrames();
  for (const [n, dump] of rebuild) { try { if (dump) await loadDB(pre + n, dump); else await delDB(pre + n); } catch (e) {} }
  return {changed: true, all: true};
}
function afterApply(r) {
  if (r.all) reloadFrames();
  else if (r.changed) frames.forEach((f, id) => { if (!held.has(id)) reloadTool(id); });
}
const mergeTools = (a, b) => { const out = {...(a || {})}; for (const [k, v] of Object.entries(b || {})) out[k] = Math.max(out[k] || 0, v || 0); return out; };

/* unsaved changes in a tool someone else now holds can't be sent: keep them in a backup and take the shared version */
async function strand(p, toolIds) {
  await backupProject(p, 'before taking the shared version');
  dropDirty(p, toolIds);
  toastLong(`${toolIds.map(toolName).join(', ')}: someone else has been editing, so your unsaved changes there were set aside. They’re kept under Manage projects → Backups.`);
}
/* which of my unsaved changes are still safe to send? Returns the tools that aren't. */
function strandedTools(p, meta, props) {
  const out = [];
  for (const t of dirtyTools(p)) {
    if (held.has(t)) continue;
    const l = lockOf(t, props);
    if (mineL(l)) { held.add(t); continue; }
    if (!l && meta.rev === p.driveRev) continue;   /* nobody holds it and nobody has saved since: still mine to send */
    out.push(t);
  }
  return out;
}
/* bring other people's saved work into this browser */
async function syncDown(p, meta, quiet) {
  const remote = await rawRead(p.driveFileId);
  await docsMergeIn(p, remote.snap.docs, remote.snap.docFiles); await msgsMergeIn(p, remote.snap.msgs);
  const local = await packedSnapshot(p.id);
  const r = await applyLocal(p, mergeSnap(remote.snap, local, p.dirty), local);
  p.tools = mergeTools(p.tools, (remote.project || {}).tools);
  if (p.sharedBy && remote.project && remote.project.name) p.name = remote.project.name;
  takeCrew(p, remote.project);
  p.driveRev = meta.rev; p.driveSyncedAt = Date.now(); p.remoteNewer = 0;
  if (!dirtyTools(p).size && !p.docsDirty) { p.savedAt = p.changedAt = p.backupAt = Math.max(p.savedAt || 0, remote.savedAt || 0, p.changedAt || 0); }
  await putProject(p);
  afterApply(r);
  const by = remote.savedBy;
  if (!quiet && r.changed && by && account && by.email !== account.email) toast(`Updated with ${firstName(by)}’s saved changes`);
  renderProjUI();
}
/* Save for a shared project */
function sharedSave(p, snap) {
  const run = async () => {
    if (tickBusy && !inTick) await tickBusy.catch(() => {});
    let meta = await fileMeta(p); noteMeta(p, meta.f);
    if (p.id === curId) { sh.props = meta.props; sh.lost = false; }
    for (const t of [...held]) if (p.id === curId && !mineL(lockOf(t))) held.delete(t);
    const lostNow = strandedTools(p, meta, meta.props);
    if (lostNow.length) await strand(p, lostNow);
    if (!dirtyTools(p).size && !p.docsDirty) {
      if (meta.rev !== p.driveRev || lostNow.length) await syncDown(p, meta, lostNow.length);
      return 'nothing';
    }
    const docsWere = p.docsDirty;
    let baseRev = meta.rev, base = (meta.rev !== p.driveRev || lostNow.length) ? await rawRead(p.driveFileId) : null;
    const mineAll = {ls: {}, idb: {}};
    for (let pass = 0; pass < 3; pass++) {
      const local = pass === 0 && !lostNow.length ? await packValue(snap) : await packedSnapshot(p.id);
      const now = JSON.parse(JSON.stringify(p.dirty || {}));
      Object.assign(mineAll.ls, now.ls || {});
      for (const [n, m] of Object.entries(now.idb || {})) mineAll.idb[n] = {...(mineAll.idb[n] || {}), ...m};
      let out = local;
      if (base) {
        out = mergeSnap(base.snap, local, mineAll);
        p.tools = mergeTools(p.tools, (base.project || {}).tools);
        takeCrew(p, base.project);
        afterApply(await applyLocal(p, out, local));
      }
      /* Documentation travels inside the shared file too (list and files), because it's the one file the whole crew can open */
      out = await docsIntoSnap(p, out, base && base.snap);
      if (base) await msgsMergeIn(p, base.snap.msgs);   /* comments are kept one by one, so nobody's is lost */
      out.msgs = (await msgsAll(p.id)).map(msgPublic);
      const body = JSON.stringify({app: 'film-tool-hub', v: 1, savedAt: local.at, savedBy: whoAmI(), project: projectMeta(p), snap: out});
      const fmeta = {mimeType: 'application/json', appProperties: {fth: 'project', fthId: p.id, shared: '1'}, ...(isOwner(p) ? {name: fileName(p)} : {})};
      const r = await uploadFile(fmeta, body, p.driveFileId);
      const myRev = r.headRevisionId || r.modifiedTime;
      /* what went up is no longer "my unsent change" (anything changed since the copy was taken still is) */
      const d = p.dirty || {ls: {}, idb: {}};
      for (const k of Object.keys(now.ls || {})) if (d.ls[k] && d.ls[k][1] < local.at) delete d.ls[k];
      for (const [n, m] of Object.entries(now.idb || {})) { for (const t of Object.keys(m)) if (d.idb[n] && d.idb[n][t] < local.at) delete d.idb[n][t]; if (d.idb[n] && !Object.keys(d.idb[n]).length) delete d.idb[n]; }
      p.driveRev = myRev; p.driveSyncedAt = Date.now(); p.remoteNewer = 0; p.needsDownload = false; p.owner = account && account.email;
      if (p.docsDirty === docsWere) p.docsDirty = 0;
      const prev = r.headRevisionId ? await prevRev(p.driveFileId, myRev).catch(() => null) : null;
      if (!prev || prev === baseRev || pass === 2) break;
      base = await rawRead(p.driveFileId, prev).catch(() => null); if (!base) break;   /* someone saved at the same moment: add their work in and save again */
      baseRev = myRev;
    }
    return 'saved';
  };
  const job = run();
  saveBusy = job.catch(() => {}).then(() => { saveBusy = null; });
  return job;
}

/* ── who is editing what ── */
const utf8len = s => new TextEncoder().encode(s).length;
function lockVal(key, lead, who) {
  let name = String(who.name || '').replace(/\|/g, ' ');
  const head = `${lead}${Date.now().toString(36)}|${who.email}|${who.sid || ''}|`;
  while (name && utf8len(key + head + name) > 120) name = name.slice(0, -1);
  return head + name;
}
const myLock = t => lockVal('lk.' + t, '', {email: account.email, sid: SID, name: account.name});
function parseLock(v) {
  const a = String(v || '').split('|'); if (a.length < 3) return null;
  const ts = parseInt(a[0], 36); if (!ts) return null;
  return {ts, email: a[1], sid: a[2], name: a.slice(3).join(' ') || a[1]};
}
function lockOf(t, props) { const l = parseLock((props || sh.props)['lk.' + t]); return l && Date.now() - l.ts <= HOLD_MS ? l : null; }
const mineL = l => !!l && !!account && l.email === account.email && l.sid === SID;
function reqOf(t) {
  const raw = sh.props['rq.' + t]; if (!raw) return null;
  const i = raw.indexOf('|'), l = parseLock(raw.slice(i + 1)); if (!l) return null;
  return {...l, state: raw.slice(0, i), raw, fresh: Date.now() - l.ts < REQ_MS};
}
function resetShare() {
  if (convTool != null && !convOn()) closeConv();
  held.clear(); pending.clear(); viewTouched.clear(); sh = {props: {}, at: 0, lost: false}; myReq = null; hideReq();
  for (const k of Object.keys(lastAct)) delete lastAct[k];
  if (active) lastAct[active] = Date.now();
  renderShare();
}
/* leaving a shared project (switching, deleting): send unsaved work and let go of my tools */
async function leaveShared() {
  const p = sharedCur(); if (!p || !hasToken()) return;
  try {
    if (dirtyTools(p).size) await saveProject(true);
    const patch = {}; held.forEach(t => { patch['lk.' + t] = null; });
    if (Object.keys(patch).length) await patchProps(p, patch);
  } catch (e) {}
  held.clear();
}
function kickTick(ms) { clearTimeout(tickT); tickT = setTimeout(tick, ms == null ? 60 : ms); }
function tick() {
  if (tickBusy) return tickBusy;
  if (saveBusy) { kickTick(700); return Promise.resolve(); }
  clearTimeout(tickT);
  tickBusy = (async () => {
    inTick = true;
    try { await tick1(); sh.err = ''; }
    catch (e) { const m = String((e && e.message) || e); sh.err = /not connected|Failed to fetch|NetworkError|Load failed/i.test(m) ? '' : m; }   /* shown in the bar, so a refusal from Google isn't a mystery */
    inTick = false; tickBusy = null; renderShare();
    if (sharedCur() && !document.hidden) kickTick(pending.size || myReq || reqShown ? FAST_MS : TICK_MS);
  })();
  return tickBusy;
}
async function tick1() {
  const p = sharedCur(); if (!p) return;
  if (!account || !hasToken()) { held.clear(); pending.clear(); return; }
  let meta;
  try { meta = await fileMeta(p); }
  catch (e) {
    /* Drive won't show this sign-in the file: deleted, no longer shared with them, or (for crew) not chosen yet */
    if (p.id === curId && e && (e.status === 404 || (e.status === 403 && !/quota|rate/i.test(e.message)))) { sh.lost = 'gone'; sh.why = e.message; held.clear(); return; }
    throw e;
  }
  if (p.id !== curId) return;
  if (meta.f.trashed || (meta.f.capabilities && meta.f.capabilities.canEdit === false)) { sh.lost = meta.f.trashed ? 'binned' : 'readonly'; sh.why = ''; held.clear(); return; }
  sh.lost = false; sh.props = meta.props; sh.at = Date.now();
  noteMeta(p, meta.f);
  if (!p.shared) { resetShare(); await putProject(p); renderProjUI(); return; }   /* the owner stopped sharing it */
  /* holds I've lost (taken over, or lapsed while this computer was asleep) */
  for (const t of [...held]) if (!mineL(lockOf(t))) { held.delete(t); viewTouched.delete(t); }
  const lostNow = strandedTools(p, meta);
  if (lostNow.length) await strand(p, lostNow);
  if (meta.rev !== p.driveRev || lostNow.length) await syncDown(p, meta, lostNow.length);
  if (p.id !== curId) return;

  const now = Date.now(), patch = {}, isActive = t => openTabs.includes(t) && now - (lastAct[t] || 0) < IDLE_MS;
  /* let go of tools I've closed or left untouched (my work is saved first); keep the rest alive */
  const letGo = [...held].filter(t => !isActive(t));
  if (letGo.length && letGo.some(t => dirtyTools(p).has(t))) await saveProject(true);
  for (const t of [...held]) {
    if (letGo.includes(t) && !dirtyTools(p).has(t)) { patch['lk.' + t] = null; held.delete(t); }
    else if (now - (lockOf(t) || {ts: 0}).ts > BEAT_MS) patch['lk.' + t] = myLock(t);
  }
  /* take the tools I'm using, if nobody else has them */
  const wanted = new Set([...openTabs.filter(isActive), ...dirtyTools(p)]);
  for (const t of new Set([...openTabs, ...wanted])) {
    if (held.has(t)) continue;
    const l = lockOf(t);
    if (mineL(l)) {   /* I asked for it and got it, or it was handed to me */
      held.add(t); pending.delete(t);
      if (myReq && myReq.tool === t) { myReq = null; toast(`You’re now editing ${toolName(t)}`); }
      if (viewTouched.delete(t)) reloadTool(t);
      continue;
    }
    if (l) { pending.delete(t); continue; }
    if (wanted.has(t) && !(pending.has(t) && now - pending.get(t) < 5000)) { patch['lk.' + t] = myLock(t); pending.set(t, now); }
  }
  /* requests for a tool I hold */
  for (const t of held) {
    const r = reqOf(t);
    if (r && (!r.fresh || r.state !== 'ask')) { if (!r.fresh) patch['rq.' + t] = null; continue; }
    if (r && (!reqShown || reqShown.raw !== r.raw)) showReq(t, r);
  }
  if (reqShown && (!held.has(reqShown.tool) || sh.props['rq.' + reqShown.tool] !== reqShown.raw)) hideReq();
  /* the answer to my own request */
  if (myReq && !held.has(myReq.tool)) {
    const r = reqOf(myReq.tool), l = lockOf(myReq.tool);
    if (r && r.email === account.email && r.state === 'no') { toastLong(`${firstName(l)} is still working on ${toolName(myReq.tool)}. Try again in a little while.`); patch['rq.' + myReq.tool] = null; myReq = null; }
    else if (now - myReq.at > REQ_MS) { toastLong('No answer yet. A hold ends on its own after a few minutes without activity.'); patch['rq.' + myReq.tool] = null; myReq = null; }
  }
  /* tidy away long-dead notes left by closed laptops, so the file never fills up with them */
  for (const k of Object.keys(sh.props)) {
    if (!/^(lk|rq)\./.test(k) || k in patch) continue;
    const l = parseLock(k[0] === 'r' ? sh.props[k].slice(sh.props[k].indexOf('|') + 1) : sh.props[k]);
    if (!l || now - l.ts > 3 * HOLD_MS) patch[k] = null;
  }
  if (Object.keys(patch).length) await patchProps(p, patch);
  if (p.docsDirty) docsSendSoon(p, 300);   /* documents saved while Drive was out of reach go to the crew now */
}
async function requestEdit(t) {
  const p = sharedCur(), l = lockOf(t); if (!p || !l) { kickTick(); return; }
  try {
    await patchProps(p, {['rq.' + t]: lockVal('rq.' + t, 'ask|', {email: account.email, sid: SID, name: account.name})});
    myReq = {tool: t, at: Date.now()}; toast(`Asked ${firstName(l)} to hand over ${toolName(t)}`);
  } catch (e) { toast('Couldn’t send the request: ' + e.message); }
  renderShare(); kickTick(FAST_MS);
}
/* the owner (or the same person on another computer) takes a tool straight away */
async function takeOver(t) {
  const p = sharedCur(), l = lockOf(t); if (!p) return;
  const same = l && account && l.email === account.email;
  if (l && !same && !(await confirmDlg('Take over?', `${l.name} is editing ${toolName(t)}. If you take over, anything they haven’t saved yet won’t be included (it stays in a backup on their computer).`, 'Take over'))) return;
  try { await patchProps(p, {['lk.' + t]: myLock(t), ['rq.' + t]: null}); pending.set(t, Date.now()); viewTouched.add(t); lastAct[t] = Date.now(); } catch (e) { toast('Couldn’t take over: ' + e.message); }
  kickTick(FAST_MS);
}
function showReq(t, r) {
  reqShown = {tool: t, raw: r.raw, req: r};
  const el = $('#reqCard');
  el.innerHTML = `<b>${esc(r.name)} would like to edit ${esc(toolName(t))}</b><p>Handing over saves your work first, then ${esc(firstName(r))} can edit and you can view.</p>
    <div class="ra"><button class="btn sm ghost" data-rq="no">Not now</button><button class="btn sm primary" data-rq="yes">Hand over</button></div>`;
  el.hidden = false;
}
function hideReq() { reqShown = null; const el = $('#reqCard'); if (el) el.hidden = true; }
async function answerReq(yes) {
  const q = reqShown, p = sharedCur(); if (!q || !p) return;
  $('#reqCard').hidden = true;
  const t = q.tool, r = q.req;
  try {
    if (!yes) { await patchProps(p, {['rq.' + t]: lockVal('rq.' + t, 'no|', {email: r.email, sid: r.sid, name: r.name})}); reqShown = {...q, raw: sh.props['rq.' + t]}; return; }
    if (dirtyTools(p).size) { await saveProject(true); if (dirtyTools(p).has(t)) { toastLong('Couldn’t save your work, so nothing was handed over. Check your connection and try again.'); reqShown = null; return; } }
    await patchProps(p, {['lk.' + t]: lockVal('lk.' + t, '', {email: r.email, sid: r.sid, name: r.name}), ['rq.' + t]: null});
    held.delete(t); viewTouched.delete(t); reqShown = null;
    toast(`${firstName(r)} is now editing ${toolName(t)}`);
  } catch (e) { reqShown = null; toast('That didn’t go through: ' + e.message); }
  renderShare(); kickTick(FAST_MS);
}
/* the bar above a tool, and the Share button */
function renderShare() {
  const p = sharedCur(), bar = $('#lockBar'), sb = $('#shareBtn');
  if (sb) {
    const c = cur();
    sb.hidden = !(driveOn() && account && c && !c.sharedBy);
    sb.classList.toggle('on', !!(c && c.shared));
    $('#shareLbl').textContent = c && c.shared ? 'Shared' : 'Share';
    sb.title = c && c.shared ? 'This project is shared. Click to see or change who it’s shared with' : 'Share this project with your crew';
  }
  if (!bar) return;
  const show = !!(p && active);
  document.body.classList.toggle('has-lockbar', show);
  bar.hidden = !show; if (!show) return;
  const t = active, l = lockOf(t), nm = esc(toolName(t));
  let cls = 'view', msg = '', btn = '';
  if (!hasToken()) { msg = 'Reconnect Google Drive to edit this shared project. Until then it’s view-only.'; btn = `<button class="btn sm primary" data-lk="reconnect">${GLOGO}Reconnect</button>`; }
  else if (sh.lost && isOwner(p)) {
    /* the owner can't "lose access": their file is in the bin, deleted, or out of this sign-in's reach */
    if (sh.lost === 'binned') msg = 'This project’s file is in the bin in your Google Drive, so it’s view-only here. Restore it in Google Drive to carry on.';
    else { msg = `Film Tool Hub can’t open this project’s file in the Google Drive of ${esc((account || {}).email || 'this account')}, so it’s view-only for now. Check Google is connected as you, and that the file hasn’t been deleted from Drive.${sh.why ? ' <small>(' + esc(sh.why) + ')</small>' : ''}`; btn = '<button class="btn sm primary" data-lk="retry">Reconnect and check again</button>'; }
  }
  else if (sh.lost) {
    msg = `You no longer have access to this shared project, so it’s view-only here. Ask ${esc((p.sharedBy || {}).name || 'the owner')} to share it with you again.`;
    if (sh.lost === 'gone') btn = '<button class="btn sm" data-lk="reopen" title="If it’s still shared with you, choose it again in Google’s file chooser">Open it again</button>';
  }
  else if (held.has(t)) {
    cls = 'edit'; msg = `<b>You’re editing ${nm}.</b> Your crew can view it. Press Save to send them your changes.`;
    if (tokenExp - Date.now() < 8 * 60e3) btn = '<button class="btn sm" data-lk="renew" title="Google signs this site out of Drive every hour. Click to stay connected.">Stay connected</button>';
  }
  else if (l && l.email === account.email) { msg = `You have ${nm} open for editing in another tab or on another computer.`; btn = '<button class="btn sm" data-lk="take">Edit here instead</button>'; }
  else if (l) {
    msg = `<b>${esc(l.name)} is editing ${nm}.</b> You can look, but changes you make here won’t be kept.`;
    btn = myReq && myReq.tool === t ? `<span class="wait">Asked ${esc(firstName(l))}. Waiting for an answer…</span>` : '<button class="btn sm primary" data-lk="request">Request to edit</button>';
    if (isOwner(p)) btn += '<button class="btn sm ghost" data-lk="take">Take over</button>';
  }
  else if (sh.err) msg = `Google Drive didn’t accept the check on who’s editing, so ${nm} is view-only for now. <small>(${esc(sh.err)})</small>`;
  else if (!sh.at || pending.has(t) || Date.now() - (lastAct[t] || 0) < IDLE_MS) msg = 'Checking who’s editing…';
  else { msg = `Nobody is editing ${nm} right now.`; btn = '<button class="btn sm primary" data-lk="start">Start editing</button>'; }
  const html = `<i class="dot"></i><span class="m"${sh.lost && sh.why ? ` title="${esc(sh.why)}"` : ''}>${msg}</span><span class="b">${btn}</span>`;
  bar.className = cls;
  if (bar.dataset.h !== html) { bar.innerHTML = html; bar.dataset.h = html; }
}

/* ── the crew list: names for the people a project is shared with ── */
const mailName = e => String(e || '').split('@')[0];
function projectPeople(p) {
  if (!p || !p.shared) return [];
  const mineE = account ? account.email.toLowerCase() : '', out = [], seen = new Set();
  const add = (email, name, role, owner) => {
    const e = String(email || '').toLowerCase(); if (!e || seen.has(e)) return;
    seen.add(e); out.push({name: name || mailName(e), email: e, role: role || '', me: e === mineE, owner: !!owner, aka: rec(e).aka || []});
  };
  const rec = e => (p.crew || []).find(c => c.email === String(e || '').toLowerCase()) || {};
  if (p.sharedBy) add(p.sharedBy.email, rec(p.sharedBy.email).name || p.sharedBy.name, rec(p.sharedBy.email).role, true);
  else if (account) add(account.email, rec(account.email).name || account.name, rec(account.email).role, true);
  (p.crew || []).forEach(c => add(c.email, c.name, c.role));
  return out;
}
/* the owner changed the list: remember it and send it to the crew with a save */
async function crewChanged(p) {
  p.crewAt = Date.now(); p.changedAt = p.crewAt;
  if (p.shared && p.driveFileId) { p.docsDirty = p.crewAt; docsSendSoon(p, 300); }   /* docsDirty makes Save send the project file even when no tool has changed */
  await putProject(p);
}
/* keep the list in step with who Drive says can open the file. A typed name stays; otherwise Google's name is used */
async function crewFromDrive(p, people) {
  const old = cleanCrew(p.crew), by = new Map(old.map(c => [c.email, c]));
  const next = people.filter(x => x.emailAddress).map(x => { const e = x.emailAddress.toLowerCase(), c = by.get(e); return {email: e, name: (c && c.name) || (x.displayName && x.displayName.toLowerCase() !== e ? x.displayName : '') || mailName(e), ...(c && c.role ? {role: c.role} : {}), ...(c && c.aka ? {aka: c.aka} : {})}; });
  const me = account && by.get(account.email.toLowerCase()); if (me) next.unshift(me);   /* the owner's own name and role */
  if (JSON.stringify(next) === JSON.stringify(old)) return;
  p.crew = next; await crewChanged(p);
}

/* ── sharing: the owner adds crew by email ── */
const joinUrl = p => location.origin + location.pathname + '#/join/' + encodeURIComponent(p.driveFileId);
const parseEmails = s => [...new Set(String(s || '').split(/[\s,;]+/).map(x => x.trim().toLowerCase()).filter(Boolean))];
async function shareList(p) {
  const r = await gjson(`${DRIVE_API}/files/${p.driveFileId}/permissions?` + qs({pageSize: 100, fields: 'permissions(id,type,role,emailAddress,displayName)'}));
  return (r.permissions || []).filter(x => x.role !== 'owner');
}
async function shareDialog() {
  const p = cur(); if (!p || p.sharedBy) return;
  if (!account) { signInFlow(); return; }
  const tp = getToken(true).catch(() => null);   /* while the click still counts */
  if (!(await tp)) { renderAccount(); toast('Connect Google Drive to share this project'); return; }
  if (!p.driveFileId || (!p.shared && changed(p))) { await saveProject(true); if (!p.driveFileId) { toast('Save the project to Google Drive first, then share it'); return; } }
  let people;
  try { people = await shareList(p); } catch (e) { toastLong('Couldn’t read who this project is shared with. ' + e.message); return; }
  if (p.shared || people.length) await crewFromDrive(p, people);
  const crewOf = e => (p.crew || []).find(c => c.email === String(e || '').toLowerCase()) || {};
  const nameOf = x => crewOf(x.emailAddress).name || x.displayName || x.emailAddress || 'Someone';
  const roleIn = e => `<input class="crewrl" data-crewrole="${esc(e)}" value="${esc(crewOf(e).role || '')}" maxlength="40" list="roleList" placeholder="Role" aria-label="Role for ${esc(e)}" title="Their job on this film, e.g. Director. Click to change it">`;
  const meE = account.email.toLowerCase();
  const meRow = p.shared || people.length ? `<div class="prow"><div class="pi crewpi"><input class="crewnm" data-crew="${esc(meE)}" value="${esc(crewOf(meE).name || account.name || mailName(meE))}" maxlength="60" aria-label="Your name" title="The name your crew see for you. Click to change it">${roleIn(meE)}<small>${esc(meE)} · you (owner)</small></div></div>` : '';
  const rows = people.length ? meRow + people.map(x => `<div class="prow"><div class="pi crewpi">${x.emailAddress ? `<input class="crewnm" data-crew="${esc(x.emailAddress.toLowerCase())}" value="${esc(nameOf(x))}" maxlength="60" aria-label="Name for ${esc(x.emailAddress)}" title="The name your crew see for this person. Click to change it">${roleIn(x.emailAddress.toLowerCase())}` : `<b>${esc(nameOf(x))}</b>`}<small>${esc(x.emailAddress || '')} · can edit</small></div><div class="pb"><button type="button" class="btn sm ghost danger" data-sa="remove" data-id="${esc(x.id)}" data-email="${esc((x.emailAddress || '').toLowerCase())}" data-who="${esc(nameOf(x))}">Remove</button></div></div>`).join('')
    : '<div class="pnone" style="padding:14px 12px">Not shared with anyone yet.</div>';
  showDlg(`<h3>Share project</h3><p class="sub">“${esc(p.name)}”: add your crew by email. Each person can open the project and edit it. Only one person edits a tool at a time, and everyone’s saved work is kept.</p>
    <div class="field"><label for="f-emails">Add crew <span style="text-transform:none;letter-spacing:0">(their name, their role if you like, and the Google account email they sign in with)</span></label>
      <datalist id="roleList">${ROLES.map(r => `<option value="${esc(r)}">`).join('')}</datalist>
      <div id="crewRows">${crewRow(true)}</div>
      <button type="button" class="btn sm ghost" data-sa="row" style="align-self:flex-start;margin-top:8px">+ Add another person</button></div>
    ${(p.tools || {}).casting ? '<div class="warn">This project uses the Casting Tracker, which holds actors’ names, contact details and photos. Everyone you share with will be able to see them.</div>' : ''}
    <div class="dlg-actions" style="margin-top:0"><button type="button" class="btn primary" data-sa="add">Share with these people</button></div>
    <div class="psec">Who can open this project${people.some(x => x.emailAddress) ? ' <span style="text-transform:none;letter-spacing:0">(click a name or role to change it)</span>' : ''}</div><div class="plist">${rows}</div>
    ${p.shared ? `<div class="psec">Link for your crew</div><div class="field" style="margin:0"><div class="linkrow"><input id="f-link" readonly value="${esc(joinUrl(p))}"><button type="button" class="btn sm" data-sa="copy">Copy link</button></div></div>
    <p class="sub" style="margin:10px 0 0;font-size:13px">Google emails each person this link. They click it, sign in with the address you typed, and choose the project when Google asks. While the site is in testing, each person also has to be on the test-user list in Google Cloud.</p>` : ''}
    <div class="dlg-actions"><button class="btn primary" value="cancel">Done</button></div>`);
  dlg.classList.add('wide');
}
const ROLES = ['Director', 'Producer', 'Writer', '1st AD', 'Director of Photography', 'Camera Operator', 'Camera Assistant', 'Gaffer', 'Sound Recordist', 'Boom Operator', 'Production Designer', 'Costume & Make-up', 'Script Supervisor', 'Editor', 'Runner', 'Tutor'];
const crewRow = first => `<div class="crewrow"><input class="cn" maxlength="60" placeholder="Name, e.g. Sam Lee" aria-label="Name" autocomplete="off"><input class="cr" maxlength="40" list="roleList" placeholder="Role" aria-label="Role" autocomplete="off"><input class="ce"${first ? ' id="f-emails"' : ''} placeholder="sam@gmail.com" aria-label="Email address" autocomplete="off" inputmode="email"></div>`;
async function crewRole(input) {
  const p = cur(); if (!p || p.sharedBy) return;
  const e = input.dataset.crewrole, role = input.value.trim().slice(0, 40);
  p.crew = cleanCrew(p.crew); let c = p.crew.find(x => x.email === e);
  if (!c) { const nm = input.closest('.prow').querySelector('[data-crew]'); p.crew.push(c = {email: e, name: (nm && nm.value.trim()) || mailName(e)}); }
  if ((c.role || '') === role) return;
  if (role) c.role = role; else delete c.role;
  await crewChanged(p); toast(role ? `${c.name}: ${role}` : `${c.name} has no role now`);
}
async function crewRename(input) {
  const p = cur(); if (!p || p.sharedBy) return;
  const e = input.dataset.crew, name = input.value.trim().slice(0, 60), c = (p.crew || []).find(x => x.email === e);
  if (!name) { input.value = (c && c.name) || mailName(e); return; }
  if (c && c.name === name) return;
  if (!c && account && e === account.email.toLowerCase() && name === account.name) return;
  /* tasks and the like are filed under a person's name, so their earlier names are remembered and still count as them */
  if (c) { if (c.name) c.aka = [...(c.aka || []).filter(n => n !== name), c.name].slice(-5); c.name = name; } else (p.crew || (p.crew = [])).push({email: e, name});
  const rm = input.closest('.prow').querySelector('[data-sa=remove]'); if (rm) rm.dataset.who = name;
  await crewChanged(p); toast(`Your crew will see this person as ${name}`);
}
async function shareAction(a, b) {
  const p = cur(); if (!p) return;
  if (a === 'row') { $('#crewRows').insertAdjacentHTML('beforeend', crewRow()); $('#crewRows').lastElementChild.querySelector('.cn').focus(); return; }
  if (a === 'copy') { const i = $('#f-link'); try { await navigator.clipboard.writeText(i.value); toast('Link copied'); } catch (e) { i.select(); toast('Press Ctrl/⌘+C to copy the link'); } return; }
  if (a === 'remove') {
    try {
      await gapi(`${DRIVE_API}/files/${p.driveFileId}/permissions/${encodeURIComponent(b.dataset.id)}`, {method: 'DELETE'});
      if (!(await shareList(p)).length) {   /* nobody left: it's an ordinary project again */
        if (dirtyTools(p).size) await saveProject(true);
        const patch = {shared: '0'}; Object.keys((await fileMeta(p)).props).forEach(k => { if (/^(lk|rq)\./.test(k)) patch[k] = null; });
        await patchProps(p, patch); p.shared = false; p.dirty = null; p.crew = []; p.crewAt = Date.now(); await putProject(p); resetShare(); renderProjUI();
      }
      else if (b.dataset.email && (p.crew || []).some(c => c.email === b.dataset.email)) { p.crew = p.crew.filter(c => c.email !== b.dataset.email); await crewChanged(p); }
      toast(`${b.dataset.who || 'They'} can no longer open this project`);
    } catch (e) { toastLong('Couldn’t remove them. ' + e.message); }
    dlg.close(); shareDialog(); return;
  }
  if (a === 'add') {
    /* one person per row; a row may also hold several addresses pasted together (then Google's names are used) */
    const typed = new Map(), roles = new Map(), emails = [];
    document.querySelectorAll('#crewRows .crewrow').forEach(r => {
      const list = parseEmails(r.querySelector('.ce').value), nm = r.querySelector('.cn').value.trim().slice(0, 60);
      list.forEach(e => { if (!emails.includes(e)) emails.push(e); });
      if (nm && list.length === 1) typed.set(list[0], nm);
      const rl = r.querySelector('.cr').value.trim().slice(0, 40); if (rl && list.length === 1) roles.set(list[0], rl);
    });
    const bad = emails.filter(e => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
    if (!emails.length) { toast('Type at least one email address'); return; }
    if (bad.length) { toast(`This doesn’t look like an email address: ${bad[0]}`); return; }
    b.disabled = true; b.textContent = 'Sharing…';
    const failed = []; let done = 0;
    try {
      if (!p.shared) {
        /* everything in the project is on Drive (saved just before this dialog opened), so tracking starts clean */
        await gapi(`${DRIVE_API}/files/${p.driveFileId}?fields=id`, {method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({writersCanShare: false, appProperties: {shared: '1'}})});
        const meta = await fileMeta(p);
        p.shared = true; p.sharedBy = null; p.dirty = {ls: {}, idb: {}}; p.driveRev = meta.rev; await putProject(p);
      }
      const msg = `${account.name} has shared the Film Tool Hub project “${p.name}” with you. To open it, go to ${joinUrl(p)} and sign in with this email address.`;
      for (const e of emails) {
        if (e === account.email.toLowerCase()) continue;
        try { await gapi(`${DRIVE_API}/files/${p.driveFileId}/permissions?` + qs({sendNotificationEmail: 'true', emailMessage: msg, fields: 'id'}), {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({type: 'user', role: 'writer', emailAddress: e})}); done++; }
        catch (er) { failed.push(e + ' (' + er.message.replace(/^Google Drive error \d+:?\s*/, '') + ')'); typed.delete(e); roles.delete(e); }
      }
      if (typed.size || roles.size) {
        p.crew = cleanCrew(p.crew);
        new Set([...typed.keys(), ...roles.keys()]).forEach(e => {
          let c = p.crew.find(x => x.email === e); if (!c) p.crew.push(c = {email: e, name: ''});
          if (typed.has(e)) c.name = typed.get(e); if (roles.has(e)) c.role = roles.get(e);
        });
        await crewChanged(p);
      }
    } catch (e) { toastLong('Couldn’t share. ' + e.message); dlg.close(); return; }
    dlg.close(); renderProjUI(); resetShare(); kickTick();
    if ((await docsAll(p.id)).some(d => !d.deleted)) { p.docsDirty = Date.now(); await putProject(p); docsSendSoon(p, 300); }   /* the crew need the documents saved so far */
    await shareDialog();
    if (failed.length) toastLong('Couldn’t share with: ' + failed.join(', '));
    else if (done) toast(`Shared with ${done} ${done === 1 ? 'person' : 'people'}. Google has emailed them the link.`);
  }
}

/* ── shared with me: the crew choose the project once, through Google's own file chooser ── */
let pickerReady = null;
function loadPicker() {
  return pickerReady || (pickerReady = new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = 'https://apis.google.com/js/api.js'; s.async = true;
    s.onload = () => { try { window.gapi.load('picker', {callback: () => res(), onerror: () => rej(new Error('Google’s file chooser didn’t load'))}); } catch (e) { rej(e); } };
    s.onerror = () => rej(new Error('Google’s file chooser didn’t load'));
    document.head.appendChild(s);
  }).catch(e => { pickerReady = null; throw e; }));
}
async function pickShared(fileId) {
  await loadPicker();
  const gp = window.google.picker;
  const view = new gp.DocsView(gp.ViewId.DOCS).setMimeTypes('application/json');
  try { view.setMode(gp.DocsViewMode.LIST); } catch (e) {}
  if (fileId && typeof view.setFileIds === 'function') view.setFileIds(fileId);
  else { try { view.setOwnedByMe(false); } catch (e) {} }
  return new Promise(res => {
    const b = new gp.PickerBuilder().addView(view).setOAuthToken(token).setTitle(fileId ? 'Choose the shared project to open it' : 'Choose a project that’s been shared with you')
      .setCallback(d => { if (d.action === gp.Action.PICKED) res((d.docs || []).map(x => x.id)); else if (d.action === gp.Action.CANCEL) res([]); });
    if (APP_ID) b.setAppId(APP_ID);
    if (API_KEY) b.setDeveloperKey(API_KEY);
    b.build().setVisible(true);
  });
}
async function addShared(fileId) {
  const f = await gjson(`${DRIVE_API}/files/${fileId}?fields=id,name,modifiedTime,appProperties,ownedByMe,trashed,owners(displayName,emailAddress)`);
  const id = (f.appProperties || {}).fthId;
  if ((f.appProperties || {}).fth !== 'project' || !id || f.trashed) throw new Error('That file isn’t a Film Tool Hub project');
  let p = projById(id);
  if (p && p.owner && p.owner !== account.email && (dirtyTools(p).size || (p.changedAt || 0) > (p.driveSyncedAt || 0) + 3000)) throw new Error('Someone else’s unsaved copy of this project is on this computer. Ask them to sign in and save it first');
  if (!p) { p = {id, name: f.name.replace(/\.filmtoolhub\.json$/i, ''), created: Date.parse(f.modifiedTime) || Date.now(), openedAt: 0, tools: {}, archived: false, needsDownload: true}; projects.push(p); }
  else if (p.hiddenShared || p.owner !== account.email || p.driveFileId !== f.id) Object.assign(p, {needsDownload: true, driveRev: null, dirty: null});
  Object.assign(p, {owner: account.email, driveFileId: f.id, hiddenShared: false, archived: f.ownedByMe === false ? false : p.archived});
  noteMeta(p, f);
  await putProject(p);
  return p;
}
/* from a click: connect, let the person choose the file if the site can't open it yet, then open it */
async function openShared(fileId) {
  const tp = account ? getToken(true) : signIn().then(() => { if (!hasToken()) throw new Error('cancel'); });
  try { await tp; } catch (e) { renderAccount(); if (!/cancel|closed|superseded|wrong account/i.test(e.message)) toast('Sign in with Google to open a shared project'); return; }
  try {
    let ids = [];
    if (fileId) { try { await gjson(`${DRIVE_API}/files/${fileId}?fields=id`); ids = [fileId]; } catch (e) {} }
    if (!ids.length) ids = await pickShared(fileId);
    if (!ids.length) return;
    let last = null;
    for (const id of ids) last = await addShared(id);
    if (location.hash.startsWith('#/join/')) history.replaceState(null, '', '#/');
    if (last.id === curId) { if (last.needsDownload) await offerPull(last); resetShare(); kickTick(); } else await switchProject(last.id);
    renderProjUI(); render();
  } catch (e) {
    const why = /403|404/.test(e.message) ? 'Google wouldn’t open that file. Check you’re signed in with the email address it was shared with.' : e.message;
    toastLong('Couldn’t open the shared project. ' + why);
  }
}
function joinDialog(fileId) {
  showDlg(`<h3>Open a shared project</h3>
    <p class="sub">Someone has shared a Film Tool Hub project with you. ${account ? `You’re signed in as <b>${esc(account.email)}</b>.` : 'Sign in with the Google account (email address) it was shared with.'}</p>
    <p class="sub">Google will then show you the project file. <b>Click it, then click Select.</b> That’s how you let Film Tool Hub open it; it can’t see anything else in your Drive. You only do this once.</p>
    ${account ? '' : '<div class="gtick" aria-hidden="true"><span class="cb">✓</span><span>When Google asks, tick the Google Drive box: “See, edit, create and delete only the specific Google Drive files that you use with this app”</span></div>'}
    <div class="dlg-actions"><button class="btn ghost" value="cancel">Cancel</button><button class="btn primary" value="ok">${GLOGO}${account ? 'Open the project' : 'Sign in and open'}</button></div>`,
    () => { openShared(fileId); });
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && sharedCur()) kickTick(); });
window.addEventListener('beforeunload', e => { const p = sharedCur(); if (p && dirtyTools(p).size) { e.preventDefault(); e.returnValue = ''; } });
window.addEventListener('pagehide', () => {
  /* let go of my tools on the way out, except any with unsent changes (those stay mine for a few minutes) */
  const p = sharedCur(); if (!p || !hasToken() || !held.size) return;
  const patch = {}, d = dirtyTools(p); held.forEach(t => { if (!d.has(t)) patch['lk.' + t] = null; });
  if (Object.keys(patch).length) try { fetch(`${DRIVE_API}/files/${p.driveFileId}?fields=id`, {method: 'PATCH', keepalive: true, headers: {'Content-Type': 'application/json', Authorization: 'Bearer ' + token}, body: JSON.stringify({appProperties: patch})}); } catch (e) {}
});
setInterval(() => { if (sharedCur()) renderShare(); }, 20 * 1000);

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
  renderStrip(); renderShare();
}
function renderStrip() {
  const el = $('#projStrip'), p = cur(); if (!el || !p) return;
  const used = Object.entries(p.tools || {}).map(([id, at]) => ({t: byId(id), at})).filter(x => x.t).sort((a, b) => b.at - a.at);
  el.innerHTML = `<div class="pstrip">
    <div class="pmain"><span class="plbl">Current project</span><h2>${esc(p.name)}</h2>
      <span class="pmeta">${changed(p) ? '<b class="un">Unsaved changes</b> · ' : ''}Saved ${esc(fmtWhen(p.savedAt))}${p.backupAt ? ' · Backup ' + esc(fmtWhen(p.backupAt)) : ''}${p.driveFileId ? ' · On Google Drive' : ''}${p.sharedBy ? ' · <b class="shr">Shared by ' + esc(p.sharedBy.name) + '</b>' : p.shared ? ' · <b class="shr">Shared with your crew</b>' : ''}</span></div>
    <div class="pused">${used.length ? used.map(x => `<a class="pchip" href="#/tool/${encodeURIComponent(x.t.id)}" style="--cat:${catOf(x.t.category).color}" title="Last changed ${esc(fmtWhen(x.at))}"><span class="sw"></span>${esc(x.t.name)}<small>${esc(fmtWhen(x.at))}</small></a>`).join('') : '<span class="pnone">No tools used in this project yet. Open any tool to start; its work is filed under this project.</span>'}</div>
    <div class="pacts">${driveOn() && account && !p.sharedBy ? `<button class="btn ghost" data-pact="share">${UI.share}${p.shared ? 'Sharing' : 'Share'}</button>` : ''}<button class="btn ghost" data-pact="manage">Manage projects</button><button class="btn" data-pact="new">New project</button></div>
    ${driveOn() && !account ? `<div class="psignin">${GLOGO}<span><b>Sign in with Google</b> to keep your projects in your own Google Drive and carry on from any computer. <a href="privacy.html">Privacy</a></span><button class="btn primary" data-pact="signin">Sign in</button></div>` : ''}
  </div>`;
}
const pmenu = () => $('#pmenu');
function openProjMenu(btn) {
  const m = pmenu();
  const row = p => `<button data-pm="open" data-id="${esc(p.id)}" class="${p.id === curId ? 'on' : ''}"><span class="ck">${p.id === curId ? '✓' : ''}</span><span class="nm">${esc(p.name)}</span><small>${esc(p.sharedBy ? 'from ' + firstName(p.sharedBy) : fmtWhen(p.changedAt || p.created))}</small></button>`;
  const all = activeProjects(), own = all.filter(p => !p.sharedBy), theirs = all.filter(p => p.sharedBy);
  m.innerHTML = `<div class="hint">Projects</div>` + own.map(row).join('')
    + (driveOn() && account ? `<hr><div class="hint">Shared with me</div>` + (theirs.length ? theirs.map(row).join('') : '<div class="none">Nothing yet. Projects your crew share with you appear here.</div>') + `<button data-pm="shared">${UI.share}Open a shared project…</button>` : '')
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
  if (p.sharedBy) return `<div class="prow${p.id === curId ? ' cur' : ''}">
    <div class="pi"><b>${esc(p.name)}</b>${p.id === curId ? '<span class="tag">Open</span>' : ''}<small>Shared by ${esc(p.sharedBy.name)}${p.sharedBy.email && p.sharedBy.email !== p.sharedBy.name ? ' (' + esc(p.sharedBy.email) + ')' : ''}</small></div>
    <div class="pb">${p.id === curId ? '' : `<button type="button" class="btn sm" data-pa="open" data-id="${esc(p.id)}">Open</button>`}<button type="button" class="btn sm ghost" data-pa="backups" data-id="${esc(p.id)}">Backups</button><button type="button" class="btn sm ghost" data-pa="unlist" data-id="${esc(p.id)}">Remove from my list</button></div></div>`;
  return `<div class="prow${p.id === curId ? ' cur' : ''}">
    <div class="pi"><b>${esc(p.name)}</b>${p.id === curId ? '<span class="tag">Open</span>' : ''}${p.shared ? '<span class="tag">Shared</span>' : ''}<small>${n} tool${n === 1 ? '' : 's'} used · changed ${esc(fmtWhen(p.changedAt || p.created))} · saved ${esc(fmtWhen(p.savedAt))}</small></div>
    <div class="pb">
      ${p.archived ? `<button type="button" class="btn sm" data-pa="unarchive" data-id="${esc(p.id)}">Restore</button><button type="button" class="btn sm danger" data-pa="delete" data-id="${esc(p.id)}">Delete…</button>`
      : `${p.id === curId ? '' : `<button type="button" class="btn sm" data-pa="open" data-id="${esc(p.id)}">Open</button>`}<button type="button" class="btn sm ghost" data-pa="rename" data-id="${esc(p.id)}">Rename</button><button type="button" class="btn sm ghost" data-pa="backups" data-id="${esc(p.id)}">Backups</button><button type="button" class="btn sm ghost" data-pa="archive" data-id="${esc(p.id)}">Archive</button>`}
    </div></div>`;
}
function manageDialog() {
  const all = activeProjects(), act = all.filter(p => !p.sharedBy), theirs = all.filter(p => p.sharedBy), arch = projects.filter(p => p.archived && mine(p) && !p.hiddenShared);
  showDlg(`<h3>Projects</h3><p class="sub">Archive projects you've finished with to tidy the list. Archived projects keep all their work and can be restored.</p>
    <div class="plist">${act.map(projRow).join('') || '<div class="pnone" style="padding:14px 12px">No projects of your own yet.</div>'}</div>
    ${driveOn() && account ? `<div class="psec">Shared with me</div><div class="plist">${theirs.map(projRow).join('') || '<div class="pnone" style="padding:14px 12px">Nothing yet. When someone shares a project with you, click the link in Google’s email, or use “Open a shared project”.</div>'}</div>` : ''}
    ${arch.length ? `<div class="psec">Archived</div><div class="plist">${arch.map(projRow).join('')}</div>` : ''}
    <div class="dlg-actions"><button type="button" class="btn left" data-pa="new">New project</button>${driveOn() && account ? '<button type="button" class="btn" data-pa="shared">Open a shared project…</button>' : ''}<button class="btn primary" value="cancel">Done</button></div>`);
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
    case 'shared': dlg.close(); openShared(); break;
    case 'unlist': {
      const p = projById(id); dlg.close();
      if (await confirmDlg('Remove from your list?', `“${p.name}” will be taken off this computer. It stays safe with ${p.sharedBy.name}, and you can open it again from the link they sent. Anything you haven’t saved would be lost.`, 'Remove', true)) {
        if (!activeProjects().some(x => x.id !== id)) await createProject('My first project');
        await deleteProject(id, true); toast('Removed from your list');
      }
      break;
    }
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
  /* shared projects: only the person holding this tool can change it; everyone else has it view-only */
  function ro() { try { if (hub && hub.readOnly) return !!hub.readOnly(tool, P); } catch (e) {} return !!cfg.ro; }
  function dirty(kind, name) { try { if (hub && hub.dirty) hub.dirty(tool, P, kind, name); } catch (e) {} }
  function own() { var out = []; for (var i = 0; i < realLS.length; i++) { var k = realLS.key(i); if (k && k.indexOf(pre) === 0) out.push(k.slice(pre.length)); } return out; }
  var api = {
    getItem: function (k) { k = String(k); return GLOBAL.test(k) ? realLS.getItem(k) : realLS.getItem(pre + k); },
    setItem: function (k, v) { k = String(k); if (GLOBAL.test(k)) return realLS.setItem(k, v); if (ro()) return; dirty('ls', k); realLS.setItem(pre + k, String(v)); touched(); },
    removeItem: function (k) { k = String(k); if (GLOBAL.test(k)) return realLS.removeItem(k); if (ro()) return; dirty('ls', k); realLS.removeItem(pre + k); touched(); },
    clear: function () { if (ro()) return; own().forEach(function (k) { dirty('ls', k); realLS.removeItem(pre + k); }); touched(); },
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
    idb.deleteDatabase = function (name) { if (ro()) return del('fth:none:' + name); dirty('idb', String(name)); touched(); return del(pre + name); };
    var OS = W.IDBObjectStore.prototype, count = OS.count;
    var short = function (os) { try { var n = os.transaction.db.name; return n.indexOf(pre) === 0 ? n.slice(pre.length) : n; } catch (e) { return ''; } };
    /* view-only: a write is swapped for a harmless read, so the tool carries on but nothing is changed */
    ['put', 'add', 'delete', 'clear'].forEach(function (m) { var f = OS[m]; OS[m] = function () { if (ro()) return count.call(this); dirty('idb', short(this)); touched(); return f.apply(this, arguments); }; });
    var CU = W.IDBCursor.prototype;
    ['update', 'delete'].forEach(function (m) { var f = CU[m]; CU[m] = function () { var s = this.source && this.source.objectStore ? this.source.objectStore : this.source; if (ro()) return count.call(s); dirty('idb', short(s)); touched(); return f.apply(this, arguments); }; });
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
  /* People: in a shared project, tools can ask who is on it (window.fthPeople() gives [{name, email, role, me}]),
     and the name fields listed for this tool (cfg.people) offer those names while still taking any text. */
  W.fthPeople = function () { try { return (hub && hub.people && hub.people()) || []; } catch (e) { return []; } };
  if (hub && cfg.people) (function () {
    var pt = 0;
    function sync() {
      var d = document; if (!d.body) return;
      var list = W.fthPeople(), dl = d.getElementById('fth-people'), i;
      if (!list.length) { if (dl) dl.parentNode.removeChild(dl); return; }
      if (!dl) { dl = d.createElement('datalist'); dl.id = 'fth-people'; d.body.appendChild(dl); }
      var sig = list.map(function (p) { return p.name + '|' + p.role; }).join('\n');
      if (dl.getAttribute('data-sig') !== sig) {
        dl.textContent = '';
        for (i = 0; i < list.length; i++) { var o = d.createElement('option'); o.value = list[i].name; if (list[i].role) o.textContent = list[i].role; dl.appendChild(o); }
        dl.setAttribute('data-sig', sig);
      }
      var els = d.querySelectorAll(cfg.people);
      for (i = 0; i < els.length; i++) if (els[i].getAttribute('list') !== 'fth-people') { els[i].setAttribute('list', 'fth-people'); els[i].setAttribute('autocomplete', 'off'); }
    }
    function soon() { clearTimeout(pt); pt = setTimeout(sync, 150); }
    document.addEventListener('DOMContentLoaded', function () { sync(); try { new MutationObserver(soon).observe(document.body, {childList: true, subtree: true}); } catch (e) {} });
    W.addEventListener('focusin', soon, true);
  })();

  /* Documentation: a tool hands each export to the hub with window.fthDocs, and the hub files it under
     the current project. It only exists inside the hub: a tool opened on its own never sees it.
       fthDocs.save({type, filename, blob})   a real file (PDF, CSV, Excel, image…)
       fthDocs.page({type, name})             the page exactly as it would print (for tools that use the print window)
     Both return true when the person chose "Save to Documentation", meaning: skip the download / print window. */
  if (hub && hub.saveDoc) (function () {
    var D, onlyT = 0, busy = false;
    function off() { clearTimeout(onlyT); D.only = false; busy = false; }
    /* any fresh click means the person has moved on: the next export is an ordinary one again */
    W.addEventListener('pointerdown', function (e) { if (D && D.only && !busy && e.isTrusted) off(); }, true);
    function send(o) { try { return Promise.resolve(hub.saveDoc(tool, P, o)); } catch (e) { return Promise.resolve(false); } }
    /* the page as it prints: print-only styles made permanent, screen-only styles and scripts left out */
    function sheet(list) {
      var out = '';
      for (var i = 0; i < list.length; i++) {
        var r = list[i];
        if (r.media && r.cssRules && typeof r.media.mediaText === 'string' && r.type === 4) {
          var mt = r.media.mediaText.toLowerCase();
          if (/not\s+(print|all)/.test(mt)) continue;
          if (/\bprint\b/.test(mt)) out += sheet(r.cssRules);
          else if (/\bscreen\b/.test(mt)) continue;
          else out += '@media ' + r.media.mediaText + '{' + sheet(r.cssRules) + '}\n';
        } else out += r.cssText + '\n';
      }
      return out;
    }
    function capture() {
      var d = document, mode = W.__fthMode, flip = mode === 'dark' && typeof W.__fthApply === 'function', i;
      if (flip) { try { W.__fthApply('light'); } catch (e) {} }
      var css = '', links = '', root;
      try {
        for (i = 0; i < d.styleSheets.length; i++) {
          var sh = d.styleSheets[i];
          try { css += sheet(sh.cssRules); } catch (e) { if (sh.href) links += '<link rel="stylesheet" href="' + String(sh.href).replace(/"/g, '&quot;') + '">'; }
        }
        root = d.documentElement.cloneNode(true);
      } finally { if (flip) { try { W.__fthApply(mode); } catch (e) {} } }
      var src = d.querySelectorAll('input,textarea,select'), dst = root.querySelectorAll('input,textarea,select');
      for (i = 0; i < src.length && i < dst.length; i++) {
        var s = src[i], t = dst[i];
        if (s.tagName === 'TEXTAREA') t.textContent = s.value;
        else if (s.tagName === 'SELECT') { for (var j = 0; j < s.options.length && j < t.options.length; j++) { if (s.options[j].selected) t.options[j].setAttribute('selected', ''); else t.options[j].removeAttribute('selected'); } }
        else if (s.type === 'checkbox' || s.type === 'radio') { if (s.checked) t.setAttribute('checked', ''); else t.removeAttribute('checked'); }
        else if (s.type !== 'file' && s.type !== 'password') t.setAttribute('value', s.value);
      }
      var sc = d.querySelectorAll('canvas'), dc = root.querySelectorAll('canvas');
      for (i = 0; i < sc.length && i < dc.length; i++) {
        try {
          if (!sc[i].width || !sc[i].height || sc[i].width * sc[i].height > 6e6) continue;
          var im = d.createElement('img'); im.src = sc[i].toDataURL('image/png');
          ['id', 'class', 'style', 'width', 'height'].forEach(function (a) { if (sc[i].hasAttribute(a)) im.setAttribute(a, sc[i].getAttribute(a)); });
          dc[i].parentNode.replaceChild(im, dc[i]);
        } catch (e) {}
      }
      var junk = root.querySelectorAll('script,noscript,iframe,template,style,link[rel~="stylesheet"],link[rel="preconnect"],[data-fth-docmenu]');
      for (i = 0; i < junk.length; i++) junk[i].parentNode.removeChild(junk[i]);
      var all = root.querySelectorAll('*');
      for (i = 0; i < all.length; i++) { var at = all[i].attributes; for (var k = at.length - 1; k >= 0; k--) if (/^on/i.test(at[k].name) || /^\s*javascript:/i.test(at[k].value)) all[i].removeAttribute(at[k].name); }
      root.classList.remove('fth-invert');
      var head = root.querySelector('head');
      if (!head) { head = d.createElement('head'); root.insertBefore(head, root.firstChild); }
      head.insertAdjacentHTML('afterbegin', '<meta charset="utf-8">' + links + '<style>' + css.replace(/<\/style/gi, '<\\/style') + '</style>');
      return '<!doctype html>' + root.outerHTML;
    }
    /* pictures held in memory (blob: addresses) are written into the page, so it still shows them later */
    function inlineBlobs(html) {
      var urls = html.match(/blob:[^"'()\s<>&]+/g) || [], seen = {}, jobs = [];
      urls.forEach(function (u) {
        if (seen[u]) return; seen[u] = 1;
        jobs.push(fetch(u).then(function (r) { return r.blob(); }).then(function (b) {
          return new Promise(function (res) { var fr = new FileReader(); fr.onload = function () { html = html.split(u).join(fr.result); res(); }; fr.onerror = function () { res(); }; fr.readAsDataURL(b); });
        }).catch(function () {}));
      });
      return Promise.all(jobs).then(function () { return html; });
    }
    var ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.2h7a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/><path d="M12 11v5.2M9.6 13.8 12 16.2l2.4-2.4"/></svg>';
    var pop = null;
    function closeMenu() { if (pop) { pop.remove(); pop = null; document.removeEventListener('pointerdown', away, true); document.removeEventListener('keydown', esc, true); } }
    function away(e) { if (pop && !pop.contains(e.target)) closeMenu(); }
    function esc(e) { if (e.key === 'Escape') { e.stopPropagation(); closeMenu(); } }
    function menu(btn, list) {
      closeMenu();
      pop = document.createElement('div'); pop.setAttribute('data-fth-docmenu', ''); pop.setAttribute('role', 'menu');
      pop.style.cssText = 'position:fixed;z-index:2147483600;min-width:230px;max-width:calc(100vw - 16px);padding:6px;border-radius:12px;border:1px solid var(--fth-line2,#333a45);background:var(--fth-surface,#15181d);color:var(--fth-text,#f0ece5);box-shadow:0 18px 50px -12px rgba(0,0,0,.6);font:500 13.5px/1.3 var(--fth-display,system-ui,sans-serif)';
      var h = document.createElement('div'); h.textContent = 'Save to Documentation';
      h.style.cssText = 'padding:6px 10px 7px;font:500 10.5px var(--fth-mono,ui-monospace,monospace);letter-spacing:.1em;text-transform:uppercase;color:var(--fth-muted,#9aa0aa)';
      pop.appendChild(h);
      list.forEach(function (it) {
        var b = document.createElement('button'); b.type = 'button'; b.textContent = it.label; b.setAttribute('role', 'menuitem');
        b.style.cssText = 'all:unset;box-sizing:border-box;display:block;width:100%;padding:9px 10px;border-radius:8px;cursor:pointer;font:inherit;color:inherit';
        b.onmouseenter = b.onfocus = function () { b.style.background = 'var(--fth-surface3,#232831)'; };
        b.onmouseleave = b.onblur = function () { b.style.background = ''; };
        b.onclick = function () { closeMenu(); D.run(it.fn); };
        pop.appendChild(b);
      });
      document.body.appendChild(pop);
      var r = btn.getBoundingClientRect(), w = pop.offsetWidth, ht = pop.offsetHeight;
      pop.style.left = Math.max(8, Math.min(r.right - w, innerWidth - w - 8)) + 'px';
      pop.style.top = (r.bottom + 6 + ht > innerHeight - 8 ? Math.max(8, r.top - ht - 6) : r.bottom + 6) + 'px';
      setTimeout(function () { document.addEventListener('pointerdown', away, true); document.addEventListener('keydown', esc, true); }, 0);
    }
    D = W.fthDocs = {
      only: false, icon: ICON,
      save: function (o) { var skip = D.only; send(o); return skip; },
      page: function (o) {
        var skip = D.only, html;
        try { html = capture(); } catch (e) { return skip; }
        inlineBlobs(html).then(function (h) { send({type: o.type, name: o.name, group: o.group, page: h}); });
        return skip;
      },
      /* run an export with the download / print window switched off */
      run: function (fn) {
        off(); D.only = true;
        var r; try { r = fn(); } catch (e) { off(); throw e; }
        /* an export that reports when it's finished stays switched off until then; otherwise allow a moment for it to run */
        if (r && typeof r.then === 'function') { busy = true; onlyT = setTimeout(off, 120000); r.then(off, off); } else onlyT = setTimeout(off, 1500);
        return r;
      },
      /* turn a (hidden) button into "Save to Documentation": one export saves straight away, several open a small menu */
      attach: function (btn, items, label) {
        if (!btn || !items) return;
        if (!btn.innerHTML.trim()) btn.innerHTML = ICON + '<span>' + (label || 'Save to Documentation') + '</span>';
        if (!btn.title) btn.title = 'Save a draft to this project’s Documentation, without downloading it';
        btn.hidden = false;
        btn.addEventListener('click', function (e) {
          e.preventDefault(); e.stopPropagation();
          var list = typeof items === 'function' ? items() : items;
          if (!list || !list.length) return;
          if (list.length === 1) D.run(list[0].fn); else if (pop) closeMenu(); else menu(btn, list);
        });
      }
    };
  })();
  var aT = 0;
  function act() { var n = Date.now(); if (n - aT < 3000) return; aT = n; try { if (hub && hub.activity) hub.activity(tool, P); } catch (e) {} }
  ['pointerdown', 'keydown', 'wheel'].forEach(function (ev) { W.addEventListener(ev, act, true); });
  ['beforeinput', 'paste', 'cut', 'drop'].forEach(function (ev) { W.addEventListener(ev, function (e) { if (!ro()) return; e.preventDefault(); if (ev !== 'beforeinput') e.stopImmediatePropagation(); }, true); });
  if (cfg.ro && !hub) document.addEventListener('DOMContentLoaded', function () {
    var n = document.createElement('div');
    n.textContent = 'Shared project: this separate tab is view-only. To edit, open the tool inside Film Tool Hub.';
    n.style.cssText = 'position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:2147483647;background:#1b1f26;color:#f0ece5;border:1px solid #46505e;border-radius:10px;padding:9px 14px;font:500 13px system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.5);max-width:calc(100vw - 24px)';
    document.body.appendChild(n);
  });
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
  recce:     {kit: true},
  casting:   {kit: true},
  tasks:     {kit: true},
  coverage:  {kit: true},
  moodboard: {kit: true},
  preprod:       {kit: true},
  production:    {kit: true},
  postprod:      {kit: true},
  'pattern-lab': {kit: true, after: 'drawPlan'},
  exposure:      {kit: true, after: ['drawPlan', 'drawProfile']},
  palette:       {kit: true},
  blocking:      {kit: true},
  'script-dev':  {kit: true},
  breakdown:     {kit: true},
  coverage:      {kit: true},
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

/* fields in each tool that hold a person's name: in a shared project they offer the crew list, and still take any typed text */
const PEOPLE_FIELDS = {
  callsheet: '[data-k="producer"],[data-k="director"],[data-a="crew"][data-k="name"]',
  risk: '[data-k="assessor"],[data-k="act"],[data-k="sup"],[data-k="fa"],[data-k="fbox"],[data-k="hod"],[data-k="sn"]',
  recce: '[data-f="by"],[data-f="aid"]'
};
function themed(t, ro) {
  const cfg = TOOL_THEME[t.id] || {};
  const c = catOf(t.category);
  const cat = JSON.stringify({num:c.num, name:c.name, color:c.color}).replace(/</g, '\\u003c');
  const boot = (cfg.kit ? kitHead(t) : '') + '<script data-fth>window.__fthCat=' + cat + ';(' + fthEngine.toString() + ')(' + JSON.stringify(cfg).replace(/</g, '\\u003c') + ');'
    + '(' + fthProjectShim.toString() + ')(' + JSON.stringify({tool: t.id, ...(ro ? {ro: true} : {}), ...(PEOPLE_FIELDS[t.id] ? {people: PEOPLE_FIELDS[t.id]} : {})}).replace(/</g, '\\u003c') + ');<\/script>';
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
    <button class="pinb${isPinned(t.id) ? ' on' : ''}" data-pin="${esc(t.id)}" aria-pressed="${isPinned(t.id)}" aria-label="${isPinned(t.id) ? 'Unpin' : 'Pin'} ${esc(t.name)}" title="${isPinned(t.id) ? 'Pinned to the top bar. Click to unpin' : 'Pin to the top bar'}">${UI.pin}</button>
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
    active = id; lastAct[id] = Date.now();
  } else active = null;
  frames.forEach((f, k) => f.classList.toggle('active', k === active));
  ws.hidden = !active;
  document.body.classList.toggle('tool-open', !!active);
  document.title = active ? `${t.name} · Film Tool Hub` : 'Film Tool Hub';
  if (convTool != null && active && convTool !== active && convOn()) openConv(active);
  else if (convTool != null && !active && convTool !== '*') closeConv();
  renderBar(); renderShare();
  if (active && sharedCur() && !held.has(active)) kickTick();
}

function renderBar() {
  const pinned = pins();
  const tabs = [...pinned, ...openTabs.filter(id => !pinned.includes(id))].map(id => byId(id)).filter(Boolean);
  const X = UI.close.replace('stroke-width="1.6"', 'stroke-width="2"').replace('<svg', '<svg width="13" height="13"');
  const due = tasksDue(cur());
  $('#tabs').innerHTML = tabs.length
    ? tabs.map(t => {
        const pin = pinned.includes(t.id), n = esc(t.name);
        return `<button class="tab${t.id === active ? ' active' : ''}${pin ? ' pinned' : ''}${openTabs.includes(t.id) ? '' : ' idle'}" data-tab="${esc(t.id)}" style="--cat:${catOf(t.category).color}" title="${n}"><span class="dot"></span><span class="lbl">${n}</span>${t.id === 'tasks' && due ? `<b class="badge" title="${due} of your tasks ${due === 1 ? 'is' : 'are'} due">${due}</b>` : ''}`
          + `<span class="pin" data-pin="${esc(t.id)}" role="button" aria-label="${pin ? 'Unpin' : 'Pin'} ${n}" title="${pin ? 'Pinned. Click to unpin' : 'Pin this tab so it stays here'}">${UI.pin}</span>`
          + (pin ? '' : `<span class="x" data-close="${esc(t.id)}" role="button" aria-label="Close ${n}" title="Close">${X}</span>`) + `</button>`;
      }).join('')
    : `<span class="tabs-hint">Open tools appear here as tabs</span>`;
  $('#barActions').innerHTML = active ? `
    ${convOn() ? `<button class="ibtn convbtn${convTool === active ? ' on' : ''}" data-act="conv" aria-pressed="${convTool === active}" title="Conversation: comments about ${esc(toolName(active))} for your crew">${CONVI}<span class="t">Conversation</span>${unreadIn(active).length ? `<b class="badge">${unreadIn(active).length}</b>` : ''}</button>` : ''}
    <button class="ibtn" data-act="reload" title="Reload this tool">${UI.reload}</button>
    <button class="ibtn" data-act="newtab" title="Open in a new browser tab">${UI.newtab}<span class="t">New tab</span></button>
    <button class="ibtn" data-act="menu" data-menu="${esc(active)}" title="More options">${UI.dots}</button>` : '';
  const at = $('#tabs .tab.active'); if (at) at.scrollIntoView({block:'nearest', inline:'nearest'});
  renderMeBtn();
}

const go = id => { location.hash = id ? '#/tool/' + encodeURIComponent(id) : '#/'; };
function route() {
  const j = location.hash.match(/^#\/join\/(.+)$/);
  if (j && driveOn()) { activate(null); joinDialog(decodeURIComponent(j[1])); return; }
  const m = location.hash.match(/^#\/tool\/(.+)$/);
  const dm = location.hash.match(/^#\/docs(?:\/(.+))?$/);
  activate(m ? decodeURIComponent(m[1]) : null);
  showDocs(!!dm, dm && dm[1] ? decodeURIComponent(dm[1]) : null);
  showMe(location.hash === '#/me');
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
  if (sharedCur() && held.has(id)) kickTick();   /* closing a tool saves my work in it and frees it for the crew */
}
function reloadTool(id) { const t = byId(id), f = frames.get(id); if (!t || !f) return; if (t.html != null) f.srcdoc = themed(t); else loadHtml(t).then(() => { f.srcdoc = themed(byId(id)); }).catch(() => toast('Couldn’t load this tool')); }
function newTab(id) { const t = byId(id); if (!t) return; if (sharedCur()) toastLong('In a shared project, a tool in a separate tab is view-only. Edit it here.'); window.open(soloUrl(id), '_blank'); }
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
    <button data-m="pin">${UI.pin}${isPinned(id) ? 'Unpin from the top bar' : 'Pin to the top bar'}</button>
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
    case 'pin': togglePin(id); break;
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
  const admin = isAdmin() ? `<div class="help-admin"><div class="psec">For the site admin (only you see this)</div>
    <ul>
      <li><b>Add a tool:</b> press <b>Add tool</b>, or drag an HTML file onto the page.</li>
      <li><b>Update a tool:</b> the ⋯ menu on its card → <b>Upload new version</b>, or drag the new file onto its card. If a dropped file’s name matches an existing tool, the hub offers to update that one.</li>
      <li><b>These are try-outs.</b> Uploads and edits are kept in this browser only, so nobody else sees them. To publish a tool for everyone, its file goes into the tools folder on GitHub.</li>
      <li><b>Restore:</b> a tool you removed comes back with <b>Restore removed tools</b> at the bottom of the page. The ⋯ menu → <b>Undo my changes to this tool</b> puts one tool back to the published version.</li>
      <li><b>Reset:</b> <b>Discard all changes made in this browser</b>, at the bottom of the page, removes every try-out at once.</li>
    </ul></div>` : '';
  showDlg(`<div class="help"><h3>How it works</h3><p class="sub">Everything you need to plan a film, in one place.</p>
    <ol>
      <li><b>Open a tool</b> by clicking its card. It opens here as a tab, and your other open tools keep their place when you switch.</li>
      <li><b>Open in a new browser tab</b> by right-clicking a card and choosing “Open link in new tab”, or with Ctrl/⌘-click.</li>
      <li><b>Pin the tools you use most.</b> Click the pin on a tool’s card or on its tab. Pinned tools stay at the left of the top bar, so you can jump between them in one click. Click the pin again to unpin${driveOn() ? '. When you’re signed in, your pins follow you to any computer' : ''}.</li>
      <li><b>Light or dark.</b> The sun/moon button in the top bar switches the hub and every tool at once.</li>
      <li><b>Projects.</b> Pick a project in the top bar and every tool files its work under it, so you can move between tools on the same film. Archive projects you’ve finished with.</li>
      <li><b>Documentation.</b> The <b>Documentation</b> button in the top bar opens a folder for each tool. Whenever you export from a tool (a PDF, spreadsheet or picture), a copy is filed there as a new draft, so the whole project’s paperwork is in one place. Each tool also has a <b>Save to Documentation</b> button, for saving a draft without downloading it.</li>
      <li><b>Saving and backups.</b> Your work saves in this browser as you go. Press <b>Save</b> (or Ctrl/⌘+S) to store the project’s main copy${driveOn() ? '; sign in with Google to keep it in your own Google Drive and carry on from any computer' : ''}. Backups are taken every few minutes while you work. Bring one back from Manage projects → Backups.</li>
      ${driveOn() ? `<li><b>Sharing with your crew.</b> Sign in, press <b>Share</b> and type your crew’s email addresses. They open the link Google emails them, and the project appears under “Shared with me”. One person edits a tool at a time; everyone else can view it and press <b>Request to edit</b>. Press Save to send your changes to the crew.</li>` : ''}
    </ol>${admin}</div>
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

/* ───────── Documentation ─────────
   A bank of folders, one per tool, holding the exports and drafts made in the current project.
   Tools never store these themselves: each export goes to window.__fthHub.saveDoc (tools reach it as
   window.fthDocs, see the shim). Saving again never overwrites: it adds the next draft of that kind.
   Where it lives:
   • always in this browser (the "docs" list and the "docfiles" store), filed under the project;
   • signed in, your own project: each file is also uploaded to Film Tool Hub → Documentation →
     <project> → <tool> in your Google Drive (docsPush), and files found there appear here (docsPull);
   • shared project: the list AND the files travel inside the shared project file (snap.docs,
     snap.docFiles), because that is the one file every crew member's sign-in can open;
   • the list (not the files) is part of every save and backup; a deleted document's file is kept for
     30 days so restoring a backup can bring it back. */
const DOC_TYPES = {
  'script-dev': ['Script PDF', 'Develop PDF', 'Outline PDF', 'Script (Fountain)', 'Script (Final Draft)'],
  coverage: ['Coverage Report PDF', 'Feedback PDF', 'Timeline PDF'],
  'script-lining': ['Lined Script PDF'],
  breakdown: ['Breakdown PDF', 'Advanced Breakdown PDF', 'Breakdown CSV'],
  schedule: ['Schedule PDF', 'Schedule Excel'],
  recce: ['Recce Field Sheet PDF', 'Recce Report PDF', 'Recce Comparison PDF', 'Recce CSV'],
  casting: ['Casting Breakdowns PDF', 'Contact Sheet PDF', 'Auditionees CSV'],
  tasks: ['Task List PDF'],
  moodboard: ['Mood Board PDF'],
  shotlist: ['Shot List PDF', 'Shot List CSV'],
  blocking: ['Blocking Plan JPG'],
  lighting: ['Lighting Plan PDF', 'Lighting Plan PNG', 'Lighting Plan SVG', 'Kit List CSV'],
  falsecolour: ['False Colour PDF', 'Comparison PDF', 'Ratios PDF'],
  palette: ['Palette PDF', 'Palette Deck PDF'],
  callsheet: ['Call Sheet PDF', 'Call Sheet Excel'],
  risk: ['Risk Assessment PDF', 'Risk Assessment Excel']
};
const DOC_KEEP_MS = 30 * 864e5, SHARED_DOC_CAP = 200 * 1024 * 1024;
const DOC_PUBLIC = ['id', 'tool', 'type', 'group', 'name', 'ext', 'mime', 'size', 'at', 'mod', 'draft', 'page', 'by', 'deleted', 'signed'];
const docPublic = d => { const o = {}; DOC_PUBLIC.forEach(k => { if (d[k] !== undefined) o[k] = d[k]; }); return o; };
let docCache = [], docsOpen = false, docsTool = null, docDirs = new Map();
const docsOlder = new Set();

const docsAll = async pid => (pid && await store.gtx('docs', 'readonly', s => s.index('projectId').getAll(pid)).catch(() => [])) || [];
const putDoc = rec => store.gtx('docs', 'readwrite', s => s.put(rec));
/* change one entry in a single step, so two things changing it at once can't undo each other */
const patchDoc = (id, patch) => store.gtx('docs', 'readwrite', s => { const q = s.get(id); q.onsuccess = () => { if (q.result) s.put(Object.assign(q.result, patch)); }; return q; }).catch(() => null);
const getBytes = id => store.gtx('docfiles', 'readonly', s => s.get(id)).catch(() => null);
const hasBytes = async id => !!(await store.gtx('docfiles', 'readonly', s => s.count(id)).catch(() => 0));
const putBytes = (id, blob) => store.gtx('docfiles', 'readwrite', s => s.put(blob, id));
const delBytes = id => store.gtx('docfiles', 'readwrite', s => s.delete(id)).catch(() => {});
const liveDocs = () => docCache.filter(d => !d.deleted);
async function docsLoad() {
  const pid = curId, list = await docsAll(pid);
  if (pid !== curId) return docCache;
  /* a deleted document's file is dropped after 30 days (its entry stays, so it can't creep back from an old copy) */
  for (const d of list) if (d.deleted && !d.purged && Date.now() - d.deleted > DOC_KEEP_MS) { await delBytes(d.id); d.purged = true; await patchDoc(d.id, {purged: true}); }
  return (docCache = list);
}
async function docsRefresh() { docsOlder.clear(); await msgsLoad(); renderConv(); renderMe(); await docsLoad(); if (docsOpen) { if (docsTool && !byId(docsTool)) docsTool = null; renderDocs(); docsSendSoon(cur(), 200, true); } }
async function docsWipe(pid) { for (const d of await docsAll(pid)) { await delBytes(d.id); await store.gtx('docs', 'readwrite', s => s.delete(d.id)).catch(() => {}); } docDirs.delete(pid); }
const fmtSize = n => n >= 1048576 ? (n / 1048576).toFixed(n >= 10485760 ? 0 : 1) + ' MB' : n >= 1024 ? Math.round(n / 1024) + ' KB' : (n || 0) + ' B';
const fmtStamp = t => new Date(t).toLocaleDateString(undefined, {day: 'numeric', month: 'short', year: 'numeric'}) + ', ' + new Date(t).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
const isBlob = b => !!b && typeof b === 'object' && typeof b.arrayBuffer === 'function' && typeof b.size === 'number';
const DOC_MIME = {pdf: 'application/pdf', csv: 'text/csv', json: 'application/json', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', svg: 'image/svg+xml', html: 'text/html', txt: 'text/plain', fountain: 'text/plain', fdx: 'application/xml',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'};

/* a print-ready page arrives with the whole tool in it; keep only what actually prints */
function prunePage(html) {
  return new Promise(res => {
    const f = document.createElement('iframe'); let done = false;
    const finish = out => { if (done) return; done = true; f.remove(); res(out); };
    f.setAttribute('sandbox', 'allow-same-origin'); f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1;
    f.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0;visibility:hidden';
    f.onload = () => {
      try {
        const d = f.contentDocument, w = f.contentWindow;
        if (!d || !d.body || !d.body.children.length) return finish(html);
        const kill = [], walk = el => { for (const c of [...el.children]) { if (w.getComputedStyle(c).display === 'none') kill.push(c); else walk(c); } };
        walk(d.body);
        if (kill.length) { kill.forEach(c => c.remove()); if (d.body.children.length) return finish('<!doctype html>' + d.documentElement.outerHTML); }
        finish(html);
      } catch (e) { finish(html); }
    };
    setTimeout(() => finish(html), 5000);
    f.srcdoc = html; document.body.appendChild(f);
  });
}

let persistAsked = false;
async function storageUse() { try { const e = await navigator.storage.estimate(); return e && e.quota ? {used: e.usage || 0, quota: e.quota, pct: (e.usage || 0) / e.quota} : null; } catch (e) { return null; } }
async function saveDoc(tool, pid, o) {
  const p = projById(pid) || cur();
  if (!p || !byId(tool)) return false;
  try {
    if (!store.persistent) throw new Error('This browser is blocking storage, so documents can’t be kept');
    let blob, page = false;
    if (o.page != null) { blob = new Blob([await prunePage(String(o.page))], {type: 'text/html'}); page = true; }
    else if (isBlob(o.blob)) blob = new Blob([await o.blob.arrayBuffer()], {type: o.blob.type || o.mime || ''});   /* a copy of our own: the tool that made it may close */
    else if (o.data != null) blob = new Blob([o.data], {type: o.mime || ''});
    else throw new Error('There was nothing to save');
    const fn = String(o.filename || ''), m = fn.match(/\.([a-z0-9]{1,8})$/i);
    const ext = page ? 'html' : String(o.ext || (m ? m[1] : '')).toLowerCase();
    const name = String(o.name || (m ? fn.slice(0, -m[0].length) : fn) || toolName(tool)).replace(/\s+/g, ' ').trim().slice(0, 120) || toolName(tool);
    const type = String(o.type || 'Document').slice(0, 60), group = String(o.group || type).slice(0, 140);
    const mime = page ? 'text/html' : (DOC_MIME[ext] || blob.type || o.mime || 'application/octet-stream');
    const all = await docsAll(p.id);
    if (p.shared) {
      const total = all.filter(d => !d.deleted).reduce((n, d) => n + (d.size || 0), 0);
      if (total + blob.size > SHARED_DOC_CAP) throw new Error('This shared project’s Documentation is full (about 200 MB, so saving stays quick for your crew). Delete some older drafts, then save again');
    }
    const draft = 1 + all.filter(d => d.tool === tool && d.group === group).reduce((n, d) => Math.max(n, d.draft || 0), 0), now = Date.now();
    const rec = {id: 'd' + now.toString(36) + Math.random().toString(36).slice(2, 7), projectId: p.id, tool, type, group, name, ext, mime, size: blob.size, at: now, mod: now, draft, page, by: whoAmI(), deleted: 0};
    await putBytes(rec.id, blob); await putDoc(rec);
    if (!persistAsked) { persistAsked = true; try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) {} }
    await docsChanged(p);
    if (!o.quiet) toast('Saved to Documentation');
    storageUse().then(u => { if (u && u.pct > .8 && !(driveOn() && account)) toastLong(`Saved to Documentation, but this browser’s storage is ${Math.round(u.pct * 100)}% full. Open Documentation, download what you need to keep and delete older drafts.`); });
    return true;
  } catch (e) {
    const full = e && (e.name === 'QuotaExceededError' || /quota/i.test(e.message || ''));
    toastLong(full ? 'Couldn’t save to Documentation: this browser’s storage is full. Open Documentation and delete older drafts to make room.' : 'Couldn’t save to Documentation. ' + ((e && e.message) || e) + '.');
    return false;
  }
}
/* after any change to the documents: refresh the page, mark the project changed, and send it where it's kept */
async function docsChanged(p) {
  p.changedAt = Date.now(); if (p.shared) p.docsDirty = p.changedAt;
  await putProject(p);
  if (p.id === curId) { await docsLoad(); renderDocs(); renderProjUI(); renderMe(); }
  docsSendSoon(p, 1200);
}

/* ── Google Drive: your own projects keep each document as a real file in a Documentation folder ── */
const driveDocName = d => `${d.name} (Draft ${d.draft})${d.ext ? '.' + d.ext : ''}`;
async function docFolder(p, tool) {
  let c = docDirs.get(p.id); if (!c) docDirs.set(p.id, c = {root: null, tools: {}});
  if (!c.root) { const f = await ensureFolders(); if (!f.docs) f.docs = await folder('Documentation', {fth: 'docsroot'}, f.root); c.root = await folder(p.name, {fth: 'docs', fthId: p.id}, f.docs); }
  if (!tool) return c.root;
  return c.tools[tool] || (c.tools[tool] = await folder(toolName(tool), {fth: 'doctool', fthId: p.id, tool}, c.root));
}
const drivePatch = (id, body) => gapi(`${DRIVE_API}/files/${id}?fields=id`, {method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
async function docsPush(p) {
  for (const d of await docsAll(p.id)) {
    try {
      if (d.deleted) { if (d.driveId && !d.driveTrashed) { await drivePatch(d.driveId, {trashed: true}).catch(e => { if (e.status !== 404) throw e; }); await patchDoc(d.id, {driveTrashed: true}); } continue; }
      if (d.driveId && d.driveTrashed) { await drivePatch(d.driveId, {trashed: false}); await patchDoc(d.id, {driveTrashed: false}); }
      if (d.driveId) { const n = driveDocName(d); if (d.driveName !== n) { await drivePatch(d.driveId, {name: n, description: JSON.stringify(docPublic(d))}); await patchDoc(d.id, {driveName: n}); } continue; }
      const blob = await getBytes(d.id); if (!blob) continue;
      const dir = await docFolder(p, d.tool), n = driveDocName(d);
      const r = await uploadFile({name: n, parents: [dir], mimeType: d.mime || 'application/octet-stream', description: JSON.stringify(docPublic(d)), appProperties: {fth: 'doc', fthId: p.id, doc: d.id}}, blob);
      await patchDoc(d.id, {driveId: r.id, driveName: n, driveAt: Date.now()});
    } catch (e) { if (e.message === 'not connected') throw e; if (e.status === 404 && d.driveId) await patchDoc(d.id, {driveId: null, driveName: null, driveTrashed: false}); }
  }
}
/* documents saved from another computer: they're in the Drive folder, so list them here */
async function docsPull(p) {
  const files = await findFiles(byProp('fth', 'doc') + ' and ' + byProp('fthId', p.id), 'id,name,size,mimeType,description,appProperties,modifiedTime');
  const list = await docsAll(p.id), by = new Map(list.map(d => [d.id, d])), seen = new Set(files.map(f => f.id)), now = Date.now();
  for (const f of files) {
    const id = (f.appProperties || {}).doc; if (!id) continue;
    const d = by.get(id);
    if (d) { if (!d.driveId) await patchDoc(id, {driveId: f.id, driveName: f.name, driveAt: now}); continue; }
    let m = {}; try { m = JSON.parse(f.description || '{}') || {}; } catch (e) {}
    const ext = (f.name.match(/\.([a-z0-9]{1,8})$/i) || [])[1] || '', at = Date.parse(f.modifiedTime) || now;
    await putDoc({tool: 'other', type: 'Document', group: 'Document', name: f.name, ext: ext.toLowerCase(), mime: f.mimeType, at, mod: at, draft: 1, page: false, by: null, ...docPublic(m),
      id, projectId: p.id, size: +f.size || m.size || 0, deleted: 0, driveId: f.id, driveName: f.name, driveAt: now});
  }
  /* gone from Drive (deleted on another computer, or binned in Drive itself)? Ask about each one before believing it */
  for (const d of list) {
    if (!d.driveId || d.deleted || d.driveTrashed || seen.has(d.driveId) || now - (d.driveAt || 0) < 120e3) continue;
    try { const f = await gjson(`${DRIVE_API}/files/${d.driveId}?fields=id,trashed`); if (f.trashed) await patchDoc(d.id, {deleted: now, mod: now, driveTrashed: true}); else await patchDoc(d.id, {driveAt: now}); }
    catch (e) { if (e.status === 404) await patchDoc(d.id, (await hasBytes(d.id)) ? {driveId: null, driveName: null} : {deleted: now, mod: now, driveTrashed: true}); }
  }
}
/* a document's file: from this browser, or fetched from the Drive folder the first time it's opened here */
async function docBytes(d) {
  let b = await getBytes(d.id); if (b) return b;
  if (!d.driveId && hasToken() && !(projById(d.projectId) || {}).sharedBy) {   /* listed from a save made elsewhere: find its file in the Drive folder */
    try { const f = (await findFiles(byProp('fth', 'doc') + ' and ' + byProp('doc', d.id), 'id,name'))[0]; if (f) { d.driveId = f.id; await patchDoc(d.id, {driveId: f.id, driveName: f.name, driveAt: Date.now()}); } } catch (e) {}
  }
  if (d.driveId && hasToken()) {
    try { b = await (await gapi(`${DRIVE_API}/files/${d.driveId}?alt=media`)).blob(); b = new Blob([b], {type: d.mime || b.type}); await putBytes(d.id, b).catch(() => {}); return b; } catch (e) {}
  }
  return null;
}
let docsSendT = null, docsSendBusy = null;
function docsSendSoon(p, ms, pull) { if (!p) return; clearTimeout(docsSendT); docsSendT = setTimeout(() => docsSend(p, pull), ms == null ? 800 : ms); }
async function docsSend(p, pull) {
  if (!driveOn() || !account || !hasToken() || !mine(p) || !projById(p.id)) return;
  if (docsSendBusy) { await docsSendBusy; }
  docsSendBusy = (async () => {
    try {
      if (p.shared && p.driveFileId && p.docsDirty && p.id === curId && !p.needsDownload) await saveProject(true);   /* shared: the crew get documents through the project file */
      if (!p.sharedBy) { if (pull) await docsPull(p); await docsPush(p); }
      if (p.id === curId) { await docsLoad(); renderDocs(); }
    } catch (e) {}
  })();
  await docsSendBusy; docsSendBusy = null;
}

/* ── shared projects and saves: the list (and, when shared, the files) inside the project file ── */
async function docsMergeIn(p, list, files) {
  if (!Array.isArray(list)) return;
  const have = new Map((await docsAll(p.id)).map(d => [d.id, d])); let ch = false;
  for (const r of list) {
    if (!r || !r.id) continue;
    const d = have.get(r.id);
    if (!d || (r.mod || 0) > (d.mod || 0)) { await putDoc({...(d || {}), ...docPublic(r), projectId: p.id}); ch = true; }
    const f = files && files[r.id];
    if (f && !r.deleted && !(await hasBytes(r.id))) { try { await putBytes(r.id, f.__fth ? unpackValue(f) : f); ch = true; } catch (e) {} }
  }
  if (ch && p.id === curId) { await docsLoad(); renderDocs(); renderMe(); }
}
async function docsIntoSnap(p, out, remote) {
  const list = await docsAll(p.id), files = {}, theirs = (remote && remote.docFiles) || {};
  for (const d of list) {
    if (d.deleted) continue;
    const b = await docBytes(d);
    if (b) files[d.id] = await packValue(b); else if (theirs[d.id]) files[d.id] = theirs[d.id];
  }
  return {...out, docs: list.map(docPublic), docFiles: files};
}
/* restoring a backup puts the Documentation list back as it was then */
async function docsRestore(p, list) {
  if (!Array.isArray(list)) return;   /* a backup from before Documentation existed: leave the documents alone */
  const then = new Map(list.map(d => [d.id, d])), now = Date.now();
  for (const d of await docsAll(p.id)) {
    const s = then.get(d.id);
    if (!s) { if (!d.deleted) await patchDoc(d.id, {deleted: now, mod: now}); continue; }
    if (!!s.deleted === !!d.deleted && s.name === d.name) continue;
    if (!s.deleted && d.deleted && !(await hasBytes(d.id)) && !d.driveId) continue;   /* its file is long gone */
    await patchDoc(d.id, {deleted: s.deleted ? now : 0, name: s.name, mod: now});
  }
  if (p.shared) p.docsDirty = now;
  if (p.id === curId) { await docsLoad(); renderDocs(); }
  docsSendSoon(p, 1500);
}

/* ── the Documentation page ── */
const DOCI = {
  folder: P('<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.2h7a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>'),
  back: P('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
  eye: P('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>'),
  print: P('<path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M7 14h10v6H7z"/>')
};
const docTools = () => tools().filter(t => DOC_TYPES[t.id] || liveDocs().some(d => d.tool === t.id));
const docCount = n => `${n} document${n === 1 ? '' : 's'}`;
function showDocs(on, tool) {
  docsOpen = on; docsTool = on && tool && byId(tool) ? tool : null;
  document.body.classList.toggle('docs-open', on);
  $('#docsPage').hidden = !on; $('#docsBtn').classList.toggle('on', on); $('#docsBtn').setAttribute('aria-pressed', on);
  if (!on) return;
  document.title = 'Documentation · Film Tool Hub'; window.scrollTo(0, 0);
  renderDocs(); docsLoad().then(() => { renderDocs(); docsSendSoon(cur(), 100, true); });
}
function docRow(d, latest, older) {
  const p = cur(), kind = d.page ? 'PRINT' : (d.ext || 'file').toUpperCase().slice(0, 5);
  const waiting = driveOn() && account && p && !p.sharedBy && !d.driveId;
  return `<div class="drow${older ? ' old' : ''}" data-doc="${esc(d.id)}">
    <span class="dkind${d.page ? ' pg' : ''}" title="${d.page ? 'Print-ready page: open it here, or use Save as PDF' : esc((d.ext || 'file').toUpperCase() + ' file')}">${esc(kind)}</span>
    <div class="dname"><b title="${esc(d.name)}">${esc(d.name)}</b><small><span class="dx">${esc(d.type)} · ${esc(fmtStamp(d.at))} · </span>${esc(fmtSize(d.size))}${d.by && d.by.name && p && p.shared ? ' · saved by ' + esc(whoName(d.by)) : ''}${d.signed ? ` · <b class="dsigned">signed off${d.signed.name ? ' by ' + esc(whoName(d.signed)) : ''}, ${esc(fmtStamp(d.signed.at))}</b>` : ''}${waiting ? ' · <i title="It will be sent to your Google Drive once Drive is connected">not in Drive yet</i>' : ''}</small></div>
    <span class="dtype">${esc(d.type)}</span>
    <span class="dwhen">${esc(fmtStamp(d.at))}</span>
    <span class="ddraft">Draft ${d.draft}${latest ? '<em>Latest</em>' : ''}</span>
    <div class="dacts">
      <button type="button" class="btn sm" data-da="open">${DOCI.eye}Open</button>
      <button type="button" class="btn sm" data-da="down" title="${d.page ? 'Opens the print window: choose “Save as PDF”' : 'Download a copy to this computer'}">${d.page ? DOCI.print + 'Save as PDF' : UI.down + 'Download'}</button>
      <button type="button" class="btn sm${d.signed ? ' signed' : ' ghost'}" data-da="sign" aria-pressed="${!!d.signed}" title="${d.signed ? 'Signed off. Click to take the sign-off back' : 'Sign off this draft: it’s checked and ready'}">${UI.check || ''}${d.signed ? 'Signed off' : 'Sign off'}</button>
      <button type="button" class="btn sm ghost" data-da="rename" title="Rename">${UI.edit}<span class="sr">Rename</span></button>
      <button type="button" class="btn sm ghost danger" data-da="delete" title="Delete">${UI.trash}<span class="sr">Delete</span></button>
    </div></div>`;
}
function renderDocs() {
  if (!docsOpen) return;
  const p = cur(), el = $('#docsWrap'); if (!p) return;
  const live = liveDocs(), tl = docTools(), of = id => live.filter(d => d.tool === id);
  const done = tl.filter(t => of(t.id).length).length, last = live.reduce((m, d) => Math.max(m, d.at), 0), bytes = live.reduce((n, d) => n + (d.size || 0), 0);
  const dir = (docDirs.get(p.id) || {}).root;
  let where;
  if (p.sharedBy) where = `Shared project: everyone on the crew sees the same documents. New ones arrive a few seconds after they’re saved.`;
  else if (driveOn() && account) where = (hasToken() ? `Kept in your Google Drive: Film Tool Hub → Documentation → ${esc(p.name)}.` : `Kept in your Google Drive, in Film Tool Hub → Documentation. <b>Reconnect Google Drive</b> (account button, top right) to send new documents there.`)
    + (dir && hasToken() ? ` <a href="https://drive.google.com/drive/folders/${esc(dir)}" target="_blank" rel="noopener">Open the folder</a>` : '') + (p.shared ? ' Your crew see the same documents here.' : '');
  else where = `Kept in this browser, with this project (${esc(fmtSize(bytes))} so far).` + (driveOn() ? ' Sign in with Google to keep them in your own Google Drive.' : '') + '<span id="docsQuota"></span>';
  const strip = `<div class="dstrip">
      <div class="dsum"><b>${done}</b><span>of ${tl.length} tools have documents</span></div>
      <div class="dbar" role="img" aria-label="${done} of ${tl.length} tools have documents">${tl.map(t => `<i class="${of(t.id).length ? 'on' : ''}" style="--cat:${catOf(t.category).color}" title="${esc(t.name)}: ${of(t.id).length ? docCount(of(t.id).length) : 'nothing saved yet'}"></i>`).join('')}</div>
      <div class="dmeta">${docCount(live.length)}${last ? ' · last updated ' + esc(fmtWhen(last)) : ''}</div>
      <p class="dwhere">${where}</p></div>`;
  const head = `<section class="dhero"><p class="eyebrow"><span>Project</span><span>${esc(p.name)}</span></p><h1>Documen<em>tation</em></h1>
      <p class="lede">Every export and draft saved from the tools in this project, one folder per tool. Faded folders are still empty.</p></section>`;
  let body = '';
  if (docsTool) {
    const t = byId(docsTool), c = catOf(t.category), mine = of(t.id), groups = new Map();
    mine.forEach(d => { if (!groups.has(d.group)) groups.set(d.group, []); groups.get(d.group).push(d); });
    const gs = [...groups.values()].map(g => g.sort((a, b) => b.draft - a.draft || b.at - a.at)).sort((a, b) => b[0].at - a[0].at);
    const tlast = mine.reduce((m, d) => Math.max(m, d.at), 0);
    body = `<a class="dback" href="#/docs">${DOCI.back}All folders</a>
      <section class="section dfolder" style="--cat:${c.color}">
        <div class="sec-head"><div class="sec-num">${esc(c.num)}</div><h2>${esc(t.name)}</h2>
          <p>${mine.length ? docCount(mine.length) + ' · last updated ' + esc(fmtWhen(tlast)) : 'Nothing saved here yet.'}</p></div>
        <div class="dtop"><a class="btn" href="#/tool/${encodeURIComponent(t.id)}">${UI.open}Open ${esc(t.name)}</a></div>
        ${gs.length ? `<div class="dlist"><div class="drow dcols" aria-hidden="true"><span></span><span>Name</span><span>Type</span><span>Saved</span><span>Draft</span><span></span></div>${gs.map(g => {
            const key = t.id + '|' + g[0].group, open = docsOlder.has(key), rest = g.slice(1);
            return `<div class="dgroup">${docRow(g[0], true)}${rest.length ? `<button type="button" class="dmore" data-da="older" data-key="${esc(key)}" aria-expanded="${open}">${open ? 'Hide' : 'Show'} ${rest.length} older draft${rest.length === 1 ? '' : 's'}</button>${open ? rest.map(d => docRow(d, false, true)).join('') : ''}` : ''}</div>`;
          }).join('')}</div>`
        : `<div class="empty">No documents in this folder yet.<br>Export from ${esc(t.name)}, or use its <b>Save to Documentation</b> button, and they appear here${DOC_TYPES[t.id] ? ':<br><span class="dcan">' + DOC_TYPES[t.id].map(esc).join(' · ') + '</span>' : '.'}</div>`}
      </section>`;
  } else {
    for (const c of CATS) {
      const list = tl.filter(t => catOf(t.category).id === c.id); if (!list.length) continue;
      body += `<section class="section" style="--cat:${c.color}"><div class="sec-head"><div class="sec-num">${esc(c.num)}</div><h2>${esc(c.name)}</h2><p>${list.filter(t => of(t.id).length).length} of ${list.length} folders have documents</p></div>
        <div class="grid dgrid">${list.map(t => {
          const m = of(t.id), at = m.reduce((x, d) => Math.max(x, d.at), 0);
          return `<a class="dfold${m.length ? '' : ' none'}" href="#/docs/${encodeURIComponent(t.id)}" style="--cat:${c.color}" title="${esc(t.name)}: ${m.length ? docCount(m.length) : 'nothing saved yet'}">
            <span class="dtab"></span><div class="dfi">${ICONS[t.icon] || ICONS.generic}</div><h3>${esc(t.name)}</h3>
            <div class="dfm">${m.length ? `<b>${docCount(m.length)}</b><span>Updated ${esc(fmtWhen(at))}</span>` : '<b>Empty</b><span>Nothing saved yet</span>'}</div></a>`;
        }).join('')}</div></section>`;
    }
  }
  el.innerHTML = head + strip + body;
  if ($('#docsQuota')) storageUse().then(u => { const q = $('#docsQuota'); if (!q || !u) return; q.innerHTML = u.pct > .8 ? ` <b class="dfull">This browser’s storage is ${Math.round(u.pct * 100)}% full.</b> Download what you need to keep and delete older drafts.` : ` This browser’s storage is ${Math.max(1, Math.round(u.pct * 100))}% full.`; });
}
const docFileName = d => (d.name.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'document') + (d.ext ? '.' + d.ext : '');
function saveBlob(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 30000); }
/* print-ready pages go through the browser's print window, where "Save as PDF" makes the PDF */
function printPage(html) {
  const f = document.createElement('iframe');
  f.setAttribute('sandbox', 'allow-same-origin allow-modals'); f.setAttribute('aria-hidden', 'true');
  f.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0';
  f.onload = () => setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { toast('Couldn’t open the print window'); } setTimeout(() => f.remove(), 60000); }, 250);
  f.srcdoc = html; document.body.appendChild(f);
}
async function docDownload(d) {
  const b = await docBytes(d);
  if (!b) { toastLong(driveOn() && account && !hasToken() ? 'Reconnect Google Drive (account button, top right) to fetch this document.' : 'This document’s file isn’t on this computer.'); return; }
  if (d.page) { toast('In the print window, choose “Save as PDF”'); printPage(await b.text()); } else saveBlob(b, docFileName(d));
}
function csvRows(text, max) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length && rows.length < max; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"') q = true; else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
let viewUrl = null;
async function docOpen(d) {
  const b = await docBytes(d);
  if (!b) { toastLong(driveOn() && account && !hasToken() ? 'Reconnect Google Drive (account button, top right) to open this document.' : 'This document’s file isn’t on this computer.'); return; }
  const v = $('#docView'), body = $('#dvBody');
  $('#dvTitle').textContent = d.name; $('#dvSub').textContent = `${d.type} · Draft ${d.draft} · ${fmtStamp(d.at)}`;
  $('#dvDown').innerHTML = d.page ? DOCI.print + 'Save as PDF' : UI.down + 'Download'; $('#dvDown').onclick = () => docDownload(d);
  body.className = 'dv-body'; body.innerHTML = '';
  if (viewUrl) { URL.revokeObjectURL(viewUrl); viewUrl = null; }
  const ext = d.ext, url = () => (viewUrl = URL.createObjectURL(b));
  if (d.page) {
    const html = await b.text(), wide = /@page[^}]*landscape/i.test(html), big = /@page[^}]*\bA3\b/i.test(html);
    const w = Math.round((wide ? 1123 : 794) * (big ? 1.414 : 1));
    body.classList.add('paper');
    const f = document.createElement('iframe'); f.setAttribute('sandbox', 'allow-same-origin'); f.title = d.name; f.style.width = w + 'px'; f.srcdoc = html;
    body.appendChild(f);
    const fit = () => { const z = Math.min(1, (body.clientWidth - 32) / w); f.style.zoom = z; f.style.height = Math.max(200, (body.clientHeight - 32) / z) + 'px'; };
    v.showModal(); fit(); v._fit = fit;
    return;
  }
  if (ext === 'pdf') { const f = document.createElement('iframe'); f.title = d.name; f.src = url(); body.classList.add('fill'); body.appendChild(f); }
  else if (/^(png|jpe?g|gif|webp|svg)$/.test(ext)) { const im = document.createElement('img'); im.alt = d.name; im.src = url(); body.classList.add('pic'); body.appendChild(im); }
  else if (ext === 'csv') {
    const rows = csvRows((await b.text()).replace(/^﻿/, ''), 501);
    body.classList.add('sheet');
    body.innerHTML = `<table>${rows.slice(0, 500).map((r, i) => `<tr>${r.map(c => i ? `<td>${esc(c)}</td>` : `<th>${esc(c)}</th>`).join('')}</tr>`).join('')}</table>${rows.length > 500 ? '<p class="dv-note">Showing the first 500 rows. Download the file to see them all.</p>' : ''}`;
  }
  else if (/^(txt|fountain|fdx|json|xml|md)$/.test(ext) || /^text\//.test(d.mime || '')) { const pre = document.createElement('pre'); pre.textContent = (await b.text()).slice(0, 400000); body.classList.add('text'); body.appendChild(pre); }
  else body.innerHTML = `<div class="dv-none">${UI.file}<p><b>${esc((ext || 'This').toUpperCase())} files can’t be previewed here.</b><br>Download it to open it${ext === 'xlsx' ? ' in Excel, Numbers or Google Sheets' : ''}.</p></div>`;
  v._fit = null; v.showModal();
}
$('#docView').addEventListener('close', () => { $('#dvBody').innerHTML = ''; if (viewUrl) { URL.revokeObjectURL(viewUrl); viewUrl = null; } });
$('#dvClose').onclick = () => $('#docView').close();
window.addEventListener('resize', () => { const v = $('#docView'); if (v.open && v._fit) v._fit(); });
$('#docsPage').addEventListener('click', async e => {
  const b = e.target.closest('[data-da]'); if (!b) return;
  const a = b.dataset.da;
  if (a === 'older') { const k = b.dataset.key; if (docsOlder.has(k)) docsOlder.delete(k); else docsOlder.add(k); renderDocs(); return; }
  const row = b.closest('[data-doc]'), d = row && docCache.find(x => x.id === row.dataset.doc), p = cur(); if (!d || !p) return;
  if (a === 'open') docOpen(d);
  if (a === 'down') docDownload(d);
  if (a === 'sign') {
    const now = Date.now();
    await patchDoc(d.id, {signed: d.signed ? null : {...(whoAmI() || {}), at: now}, mod: now}); await docsChanged(p);
    toast(d.signed ? 'Sign-off taken back' : `Signed off “${d.name}” (Draft ${d.draft})`);
  }
  if (a === 'rename') {
    showDlg(`<h3>Rename document</h3><p class="sub">${esc(d.type)} · Draft ${d.draft}</p>
      <div class="field"><label for="f-dname">Name</label><input id="f-dname" name="name" required value="${esc(d.name)}" maxlength="120"></div>
      <div class="dlg-actions"><button class="btn ghost" value="cancel">Cancel</button><button class="btn primary" value="ok">Rename</button></div>`,
      fd => { const n = String(fd.get('name') || '').replace(/\s+/g, ' ').trim(); if (!n) return false; if (n !== d.name) patchDoc(d.id, {name: n, mod: Date.now()}).then(() => docsChanged(p)).then(() => toast('Renamed')); });
    const i = $('#f-dname'); if (i) i.select();
  }
  if (a === 'delete') {
    if (await confirmDlg('Delete this document?', `“${d.name}” (${d.type}, Draft ${d.draft}) will be removed from Documentation${p.shared ? ' for everyone on this project' : ''}. Are you sure?`, 'Delete', true)) {
      await patchDoc(d.id, {deleted: Date.now(), mod: Date.now()}); await docsChanged(p); toast('Document deleted');
    }
  }
});

/* ───────── Conversations ─────────
   In a shared project every tool has a conversation: anyone on the project can leave a comment and
   tag the people it's for. Comments belong to the hub, not the tool, so you don't need to be the one
   editing the tool to write one. They travel inside the project file (snap.msgs) and are merged one
   by one, so two people writing at once both keep their comment. "*" is the whole-project conversation. */
const MSG_PUBLIC = ['id', 'tool', 'text', 'to', 'by', 'at', 'mod', 'deleted'];
const msgPublic = m => { const o = {}; MSG_PUBLIC.forEach(k => { if (m[k] !== undefined) o[k] = m[k]; }); return o; };
let msgCache = [], convTool = null, meOpen = false;
const convTo = new Set();
const msgsAll = async pid => (pid && await store.gtx('msgs', 'readonly', s => s.index('projectId').getAll(pid)).catch(() => [])) || [];
const putMsg = rec => store.gtx('msgs', 'readwrite', s => s.put(rec));
async function msgsLoad() { const pid = curId, l = await msgsAll(pid); if (pid !== curId) return msgCache; return (msgCache = l.sort((a, b) => a.at - b.at)); }
async function msgsWipe(pid) { for (const m of await msgsAll(pid)) await store.gtx('msgs', 'readwrite', s => s.delete(m.id)).catch(() => {}); }
const meMail = () => account ? account.email.toLowerCase() : '';
const convOn = () => { const p = cur(); return !!(p && p.shared && account); };
const byMe = m => !!(m.by && m.by.email && m.by.email.toLowerCase() === meMail());
const forMe = m => (m.to || []).includes(meMail());
const liveMsgs = tool => msgCache.filter(m => !m.deleted && (tool == null || m.tool === tool));
const msgSeen = tool => ((cur() || {}).msgSeen || {})[tool] || 0;
const unreadIn = tool => liveMsgs(tool).filter(m => !byMe(m) && m.at > msgSeen(tool));
const unreadForMe = () => liveMsgs().filter(m => !byMe(m) && forMe(m) && m.at > msgSeen(m.tool));
const convName = tool => tool === '*' ? 'Whole project' : toolName(tool);
/* the name the crew list gives someone, falling back to the name saved with their comment or document */
function whoName(by) {
  if (!by) return 'Someone';
  const e = String(by.email || '').toLowerCase(), hit = projectPeople(cur()).find(x => x.email === e);
  return (hit && hit.name) || by.name || by.email || 'Someone';
}
async function msgsMergeIn(p, list) {
  if (!Array.isArray(list)) return;
  const have = new Map((await msgsAll(p.id)).map(m => [m.id, m])), fresh = []; let ch = false;
  for (const r of list) {
    if (!r || !r.id) continue;
    const m = have.get(r.id);
    if (!m || (r.mod || 0) > (m.mod || 0)) { await putMsg({...msgPublic(r), projectId: p.id}); ch = true; if (!m && !r.deleted) fresh.push(r); }
  }
  if (!ch || p.id !== curId) return;
  await msgsLoad(); renderConv(); renderBar(); renderMe();
  const mine = fresh.filter(m => !byMe(m) && forMe(m) && Date.now() - m.at < 3 * 60e3 && m.tool !== convTool);
  if (mine.length) toastLong(`${whoName(mine[0].by)} left you a comment in ${convName(mine[0].tool)}. Open My work to read it.`);
}
async function markSeen(tool) {
  const p = cur(); if (!p || !unreadIn(tool).length) return;
  (p.msgSeen || (p.msgSeen = {}))[tool] = Date.now(); await putProject(p); renderBar(); renderMe();
}
async function msgsChanged(p) {
  p.changedAt = Date.now(); if (p.shared) p.docsDirty = p.changedAt;   /* docsDirty makes Save send the project file */
  await putProject(p); await msgsLoad(); renderConv(); renderBar(); renderMe(); renderProjUI();
  docsSendSoon(p, 300);
}
async function postMsg(tool, text, to) {
  const p = cur(); text = String(text || '').trim().slice(0, 2000);
  if (!p || !convOn() || !text) return false;
  const now = Date.now();
  await putMsg({id: 'm' + now.toString(36) + Math.random().toString(36).slice(2, 7), projectId: p.id, tool, text, to: [...to], by: whoAmI(), at: now, mod: now, deleted: 0});
  (p.msgSeen || (p.msgSeen = {}))[tool] = now;
  await msgsChanged(p);
  return true;
}
const CONVI = P('<path d="M4.5 5.5h15a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H12l-4.5 3.5v-3.5h-3a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z"/>');
function openConv(tool) {
  if (!convOn()) return;
  if (convTool !== tool) { convTo.clear(); $('#cvText').value = ''; }
  convTool = tool; document.body.classList.add('conv-open'); $('#convPanel').hidden = false;
  renderConv(true); markSeen(tool); renderBar();
  setTimeout(() => $('#cvText').focus(), 30);
}
function closeConv() { convTool = null; document.body.classList.remove('conv-open'); $('#convPanel').hidden = true; renderBar(); }
function renderConv(jump) {
  if (convTool == null) return;
  if (!convOn() || (convTool !== '*' && !byId(convTool))) { closeConv(); return; }
  const list = liveMsgs(convTool), ppl = projectPeople(cur()), el = $('#cvList');
  const nameOf = e => (ppl.find(x => x.email === e) || {}).name || mailName(e);
  $('#cvTitle').textContent = convName(convTool);
  const atEnd = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  const html = list.length ? list.map(m => {
    const who = ppl.find(x => x.email === String((m.by || {}).email || '').toLowerCase());
    return `<div class="cv-msg${byMe(m) ? ' mine' : ''}${forMe(m) ? ' forme' : ''}" data-msg="${esc(m.id)}">
      <div class="cv-by"><b>${esc(whoName(m.by))}</b>${who && who.role ? `<span>${esc(who.role)}</span>` : ''}<time title="${esc(fmtStamp(m.at))}">${esc(fmtWhen(m.at))}</time>${byMe(m) ? `<button type="button" class="cv-del" data-cv="del" title="Delete this comment" aria-label="Delete this comment">${UI.trash}</button>` : ''}</div>
      <p>${esc(m.text).replace(/\n/g, '<br>')}</p>
      ${(m.to || []).length ? `<div class="cv-for">For ${m.to.map(e => `<b${e === meMail() ? ' class="me"' : ''}>${esc(e === meMail() ? 'you' : nameOf(e))}</b>`).join(', ')}</div>` : ''}</div>`;
  }).join('') : `<div class="cv-none">No comments yet. Write the first one below. Tag the people it’s for and it shows up in their <b>My work</b>.</div>`;
  if (el.dataset.h !== html) { el.innerHTML = html; el.dataset.h = html; if (jump || atEnd) el.scrollTop = el.scrollHeight; }
  else if (jump) el.scrollTop = el.scrollHeight;
  const others = ppl.filter(x => !x.me);
  [...convTo].forEach(e => { if (!others.some(x => x.email === e)) convTo.delete(e); });
  $('#cvTo').innerHTML = others.length ? '<span>For</span>' + others.map(x => `<button type="button" class="cv-chip${convTo.has(x.email) ? ' on' : ''}" data-cvto="${esc(x.email)}" aria-pressed="${convTo.has(x.email)}" title="${esc(x.role || x.email)}">${esc(x.name)}</button>`).join('')
    : '<span>Nobody else is on this project yet.</span>';
  if (!document.hidden && convTool != null) markSeen(convTool);
}
async function sendConv() {
  const t = $('#cvText'); if (!t.value.trim() || convTool == null) return;
  const text = t.value; t.value = '';
  if (await postMsg(convTool, text, convTo)) { convTo.clear(); renderConv(true); } else t.value = text;
}

/* ───────── My work ─────────
   One page for the person signed in: tasks with their name on, comments left for them, and the
   documents they've saved. */
const sameName = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
const today = () => { const d = new Date(), pad = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
function myNames(p) {
  const out = [], me = projectPeople(p).find(x => x.me);
  if (me) out.push(me.name, ...me.aka); if (account && account.name) out.push(account.name);
  return out;
}
/* the Task Board keeps its tasks under this name (see tools/tasks.html) */
function boardTasks(p) {
  try { const d = JSON.parse(localStorage.getItem(PFX(p.id) + 'fth-tasks-v1') || 'null'); return d && Array.isArray(d.tasks) ? d.tasks.filter(t => t && t.title) : []; } catch (e) { return []; }
}
function myTasks(p) {
  const names = myNames(p), all = boardTasks(p).filter(t => t.status !== 'done');
  const mineOnly = p.shared && names.length;
  return {mineOnly, list: (mineOnly ? all.filter(t => (t.who || []).some(w => names.some(n => sameName(n, w)))) : all).sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'))};
}
const tasksDue = p => { if (!p || !p.shared) return 0; const t = today(), m = myTasks(p); return m.mineOnly ? m.list.filter(x => x.due && x.due <= t).length : 0; };
const fmtDue = d => { const t = today(); if (!d) return ''; if (d === t) return 'Due today'; const x = new Date(d + 'T12:00:00'); return (d < t ? 'Overdue · ' : 'Due ') + x.toLocaleDateString(undefined, {weekday: 'short', day: 'numeric', month: 'short'}); };
function showMe(on) {
  meOpen = on; document.body.classList.toggle('me-open', on);
  $('#mePage').hidden = !on; $('#meBtn').classList.toggle('on', on); $('#meBtn').setAttribute('aria-pressed', on);
  if (!on) return;
  document.title = 'My work · Film Tool Hub'; window.scrollTo(0, 0); renderMe();
}
function renderMeBtn() {
  const b = $('#meBtn'); if (!b) return;
  const p = cur(), n = convOn() ? unreadForMe().length : 0, due = tasksDue(p), tot = n + due;
  const badge = b.querySelector('.badge'); badge.hidden = !tot; badge.textContent = tot;
  b.title = 'My work: your tasks, comments left for you and your documents' + (tot ? ` (${[n ? n + ' new comment' + (n === 1 ? '' : 's') : '', due ? due + ' task' + (due === 1 ? '' : 's') + ' due' : ''].filter(Boolean).join(', ')})` : '');
}
function renderMe() {
  renderMeBtn();
  if (!meOpen) return;
  const p = cur(), el = $('#meWrap'); if (!p) return;
  const me = projectPeople(p).find(x => x.me), t = today();
  const head = `<section class="dhero"><p class="eyebrow"><span>Project</span><span>${esc(p.name)}</span></p><h1>My <em>work</em></h1>
    <p class="lede">${me ? `${esc(me.name)}${me.role ? ', ' + esc(me.role) : ''}: your` : 'Your'} tasks, the comments left for you and the documents you’ve saved in this project.</p></section>`;
  /* tasks */
  const mt = myTasks(p), tc = catOf((byId('tasks') || {}).category);
  const taskRows = mt.list.map(x => `<a class="mrow${x.due && x.due < t ? ' late' : ''}" href="#/tool/tasks">
      <span class="mst ${esc(x.status)}">${x.status === 'doing' ? 'Doing' : 'To do'}</span>
      <div class="mmain"><b>${esc(x.title)}</b><small>${esc([(x.depts || []).join(', '), !mt.mineOnly && (x.who || []).length ? x.who.join(', ') : ''].filter(Boolean).join(' · '))}</small></div>
      <span class="mdue">${esc(fmtDue(x.due))}</span></a>`).join('');
  const tasks = byId('tasks') ? `<section class="section" style="--cat:${tc.color}"><div class="sec-head"><div class="sec-num">01</div><h2>${mt.mineOnly ? 'My tasks' : 'Open tasks'}</h2>
      <p>${mt.list.length ? `${mt.list.length} still to do` + (mt.list.some(x => x.due && x.due <= t) ? ` · ${mt.list.filter(x => x.due && x.due <= t).length} due now` : '') : mt.mineOnly ? 'Nothing waiting on you.' : 'No open tasks.'}${mt.mineOnly ? '' : p.shared ? '' : ' In a shared project this shows only the tasks with your name on.'}</p></div>
      ${taskRows ? `<div class="mlist">${taskRows}</div>` : `<div class="empty msmall">Tasks ${mt.mineOnly ? 'given to you' : ''} on the <a href="#/tool/tasks">Task Board</a> appear here.</div>`}</section>` : '';
  /* conversations */
  let conv;
  if (convOn()) {
    const list = liveMsgs().filter(m => !byMe(m) && (forMe(m) || !(m.to || []).length)).sort((a, b) => b.at - a.at).slice(0, 40), nNew = unreadForMe().length;
    conv = `<section class="section" style="--cat:var(--accent)"><div class="sec-head"><div class="sec-num">02</div><h2>My conversations</h2>
      <p>${list.length ? (nNew ? `${nNew} new for you` : 'Nothing new') + ' · comments that tag you, or are for everyone' : 'Comments that tag you appear here.'}</p></div>
      <div class="dtop"><button type="button" class="btn" data-mc="*">${CONVI}Whole-project conversation${unreadIn('*').length ? ` <b class="badge">${unreadIn('*').length}</b>` : ''}</button></div>
      ${list.length ? `<div class="mlist">${list.map(m => `<button type="button" class="mrow mconv${m.at > msgSeen(m.tool) ? ' new' : ''}" data-mc="${esc(m.tool)}">
        <span class="mst ${forMe(m) ? 'you' : ''}">${forMe(m) ? 'For you' : 'Everyone'}</span>
        <div class="mmain"><b>${esc(whoName(m.by))} <i>in ${esc(convName(m.tool))}</i></b><small>${esc(m.text.length > 180 ? m.text.slice(0, 180) + '…' : m.text)}</small></div>
        <span class="mdue">${esc(fmtWhen(m.at))}</span></button>`).join('')}</div>`
      : `<div class="empty msmall">Open any tool and press <b>Conversation</b> in the top bar to leave a comment for your crew.</div>`}</section>`;
  } else conv = `<section class="section" style="--cat:var(--accent)"><div class="sec-head"><div class="sec-num">02</div><h2>My conversations</h2><p>Conversations are for shared projects.</p></div>
      <div class="empty msmall">Share this project with your crew and every tool gets a conversation, where you can leave comments and tag the person they’re for.</div></section>`;
  /* documents */
  const docs = liveDocs().filter(d => !account || (d.by && String(d.by.email || '').toLowerCase() === meMail())).sort((a, b) => b.at - a.at).slice(0, 8);
  const dsec = `<section class="section" style="--cat:var(--muted)"><div class="sec-head"><div class="sec-num">03</div><h2>My documents</h2><p>${docs.length ? 'The latest documents you saved.' : 'Documents you save appear here.'}</p></div>
      ${docs.length ? `<div class="mlist">${docs.map(d => `<a class="mrow" href="#/docs/${encodeURIComponent(d.tool)}">
        <span class="mst ${d.signed ? 'done' : ''}">${d.signed ? 'Signed off' : 'Draft ' + d.draft}</span>
        <div class="mmain"><b>${esc(d.name)}</b><small>${esc(d.type)} · ${esc(toolName(d.tool))}${d.signed ? ' · signed off by ' + esc(whoName(d.signed)) : ''}</small></div>
        <span class="mdue">${esc(fmtWhen(d.at))}</span></a>`).join('')}</div>`
      : `<div class="empty msmall">Export from a tool, or use its <b>Save to Documentation</b> button. Everything is kept in <a href="#/docs">Documentation</a>.</div>`}</section>`;
  el.innerHTML = head + tasks + conv + dsec;
}

/* ───────── toast ───────── */
let toastT;
function toastLong(msg) { toast(msg); clearTimeout(toastT); toastT = setTimeout(() => $('#toast').classList.remove('show'), 12000); }
function toast(msg) { const el = $('#toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 3200); }

/* ───────── events ───────── */
document.addEventListener('click', e => {
  const pn = e.target.closest('[data-pin]');
  if (pn) { e.preventDefault(); e.stopPropagation(); togglePin(pn.dataset.pin); return; }
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
    if (act.dataset.act === 'conv') { if (convTool === active) closeConv(); else openConv(active); }
    if (act.dataset.act === 'reload') reloadTool(active);
    if (act.dataset.act === 'newtab') newTab(active);
  }
});
document.addEventListener('auxclick', e => { const x = e.target.closest('[data-tab]'); if (e.button === 1 && x) { e.preventDefault(); closeTab(x.dataset.tab); } });
$('#homeBtn').onclick = () => go(null);
$('#docsBtn').onclick = () => { location.hash = location.hash.startsWith('#/docs') ? '#/' : '#/docs'; };
$('#meBtn').onclick = () => { location.hash = location.hash === '#/me' ? '#/' : '#/me'; };
$('#mePage').addEventListener('click', e => { const b = e.target.closest('[data-mc]'); if (!b) return; const t = b.dataset.mc; if (t === '*') openConv('*'); else if (byId(t)) { go(t); setTimeout(() => openConv(t), 0); } });
$('#convPanel').addEventListener('click', async e => {
  const b = e.target.closest('[data-cv], [data-cvto]'); if (!b) return;
  if (b.dataset.cvto) { const m = b.dataset.cvto; if (convTo.has(m)) convTo.delete(m); else convTo.add(m); renderConv(); $('#cvText').focus(); return; }
  if (b.dataset.cv === 'close') closeConv();
  if (b.dataset.cv === 'send') sendConv();
  if (b.dataset.cv === 'del') {
    const row = b.closest('[data-msg]'), m = row && msgCache.find(x => x.id === row.dataset.msg), p = cur(); if (!m || !p || !byMe(m)) return;
    if (await confirmDlg('Delete this comment?', 'It will be removed for everyone on this project.', 'Delete', true)) { await putMsg({...m, text: '', deleted: Date.now(), mod: Date.now()}); await msgsChanged(p); }
  }
});
$('#cvText').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); sendConv(); } });
$('#projBtn').onclick = e => { e.stopPropagation(); if (!pmenu().hidden) closeProjMenu(); else { closeMenu(); openProjMenu($('#projBtn')); } };
pmenu().addEventListener('click', e => {
  const b = e.target.closest('[data-pm]'); if (!b) return; closeProjMenu();
  if (b.dataset.pm === 'open') switchProject(b.dataset.id);
  if (b.dataset.pm === 'new') newProjectDialog();
  if (b.dataset.pm === 'manage') manageDialog();
  if (b.dataset.pm === 'shared') openShared();
});
document.addEventListener('click', e => { if (!pmenu().hidden && !e.target.closest('#pmenu,#projBtn')) closeProjMenu(); });
$('#saveBtn').onclick = () => saveProject();
document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 's' || e.key === 'S')) { e.preventDefault(); saveProject(); } });
form.addEventListener('change', e => { if (!e.target.matches) return; if (e.target.matches('[data-crew]')) crewRename(e.target); if (e.target.matches('[data-crewrole]')) crewRole(e.target); });
form.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches && e.target.matches('[data-crew], [data-crewrole], .crewrow input')) { e.preventDefault(); e.target.blur(); } });
form.addEventListener('click', e => { const b = e.target.closest('[data-sa]'); if (!b) return; e.preventDefault(); shareAction(b.dataset.sa, b); });
$('#shareBtn').onclick = () => shareDialog();
$('#reqCard').addEventListener('click', e => { const b = e.target.closest('[data-rq]'); if (b) answerReq(b.dataset.rq === 'yes'); });
$('#lockBar').addEventListener('click', e => {
  const b = e.target.closest('[data-lk]'); if (!b || !active) return;
  const a = b.dataset.lk;
  if (a === 'reconnect') reconnect().then(() => kickTick());
  if (a === 'retry') getToken(true, true).then(() => { resetShare(); kickTick(); }).catch(() => renderAccount());
  if (a === 'reopen') { const p = sharedCur(); if (p) openShared(p.driveFileId); }
  if (a === 'renew') getToken(true, true).then(() => { toast('Connected for another hour'); renderShare(); }).catch(() => {});
  if (a === 'request') requestEdit(active);
  if (a === 'take' || a === 'start') takeOver(active);
});
form.addEventListener('click', e => { const b = e.target.closest('[data-pa]'); if (!b) return; e.preventDefault(); projAction(b.dataset.pa, b.dataset.id, b.dataset.bid); });
document.addEventListener('click', e => { const b = e.target.closest('[data-pact]'); if (!b) return; if (b.dataset.pact === 'signin') signInFlow(); if (b.dataset.pact === 'manage') manageDialog(); if (b.dataset.pact === 'share') shareDialog(); if (b.dataset.pact === 'new') newProjectDialog(); });
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
  if (e.key === 'Escape' && convTool != null && !dlg.open) { closeConv(); return; }
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
  if (st) { try { await loadHtml(st); } catch (e) {} const s2 = byId(st.id); if (s2 && s2.html != null) { setTimeout(() => { document.open(); document.write(themed(s2, !!(cur() && cur().shared))); document.close(); }, 0); return; } }
  renderAccount(); gisReady.then(renderAccount);
  await docsLoad(); await msgsLoad();
  render(); route(); renderProjUI(); resetShare(); kickTick(500);
  setInterval(renderProjUI, 60 * 1000);
})();
})();
