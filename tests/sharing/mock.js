// A pretend Google (sign-in, Drive with the drive.file rule, Picker) shared by several browser contexts.
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
let seq = 1, clock = Date.now();
const tick = () => new Date(clock = Math.max(clock + 1, Date.now())).toISOString();
const D = { files: new Map(), access: new Map(), sessions: new Map(), log: [], delayPut: null, names: {} };
const acc = e => { if (!D.access.has(e)) D.access.set(e, new Set()); return D.access.get(e); };
const can = (e, f) => f && acc(e).has(f.id) && (f.owner === e || f.perms.some(p => p.emailAddress === e));
const isJson = f => !f.mimeType || /json/.test(f.mimeType);
const view = (f, e) => ({ id: f.id, name: f.name, mimeType: f.mimeType, description: f.description, size: f.revs && f.revs.length ? String(Buffer.byteLength(f.revs[f.revs.length - 1].content)) : undefined, parents: f.parents, appProperties: { ...f.appProperties }, modifiedTime: f.modifiedTime, trashed: !!f.trashed,
  headRevisionId: f.revs.length ? f.revs[f.revs.length - 1].id : undefined, ownedByMe: f.owner === e, owners: [{ emailAddress: f.owner, displayName: D.names[f.owner] || f.owner }],
  capabilities: { canEdit: f.owner === e || f.perms.some(p => p.emailAddress === e && p.role === 'writer') } });
function matchQ(f, q) {
  for (const m of q.matchAll(/appProperties has \{ key='([^']*)' and value='([^']*)' \}/g)) if ((f.appProperties || {})[m[1]] !== m[2]) return false;
  if (/mimeType='application\/vnd.google-apps.folder'/.test(q) && f.mimeType !== 'application/vnd.google-apps.folder') return false;
  const par = q.match(/'([^']+)' in parents/); if (par && !(f.parents || []).includes(par[1])) return false;
  if (/trashed=false/.test(q) && f.trashed) return false;
  return true;
}
function setProps(f, ap) { for (const [k, v] of Object.entries(ap || {})) {
  /* real Drive refuses other characters in a note's name (a colon, for one) */
  if (!/^[A-Za-z0-9.!@$%^&*()\-_\/]+$/.test(k)) throw Object.assign(new Error('Property and app property keys may contain only the letters a-z and A-Z, the numbers 0-9, and the characters .!@$%^&*()-_/'), { code: 403 });
  if (v === null) delete f.appProperties[k]; else { if (Buffer.byteLength(k + v) > 124) throw Object.assign(new Error('property too long'), { code: 400 }); f.appProperties[k] = String(v); } }
  if (Object.keys(f.appProperties).length > 30) throw Object.assign(new Error('too many properties'), { code: 400 }); }
async function handle(route) {
  const req = route.request(), u = new URL(req.url()), m = req.method();
  const json = (o, code = 200, headers = {}) => route.fulfill({ status: code, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'Location', ...headers }, body: JSON.stringify(o) });
  const fail = (code, message) => json({ error: { code, message } }, code);
  if (m === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': 'Location' } });
  const auth = (req.headers()['authorization'] || '').replace('Bearer ', '');
  let e = auth.startsWith('tok:') ? auth.slice(4) : null;
  const P = u.pathname;
  try {
    if (P.startsWith('/mockput/')) {   // resumable upload body
      const s = D.sessions.get(P.slice(9)); if (!s) return fail(404, 'no session');
      if (D.delayPut) await D.delayPut(s);
      const raw = req.postDataBuffer() || Buffer.alloc(0); let f;
      if (s.fileId) { f = D.files.get(s.fileId); if (!can(s.email, f) || f.trashed) return fail(404, 'File not found'); }
      else { f = { id: 'f' + seq++, owner: s.email, perms: [], revs: [], appProperties: {}, parents: [], mimeType: 'application/json' }; D.files.set(f.id, f); acc(s.email).add(f.id); }
      const { appProperties, ...rest } = s.meta; if (f.owner !== s.email) delete rest.name;
      Object.assign(f, rest); setProps(f, appProperties);
      /* project files are kept as text; documents (PDFs, pictures…) as the bytes that were sent */
      f.modifiedTime = tick(); f.revs.push({ id: 'r' + seq++, modifiedTime: f.modifiedTime, content: isJson(f) ? raw.toString('utf8') : raw, by: s.email });
      D.log.push(['upload', s.email, f.id]);
      return json(view(f, s.email));
    }
    if (P === '/oauth2/v3/userinfo') return json({ email: e, name: D.names[e] || e });
    if (!e) return fail(401, 'no token');
    if (P.startsWith('/upload/drive/v3/files')) {
      const id = P.split('/')[5] || null; const sid = 's' + seq++;
      D.sessions.set(sid, { email: e, fileId: id, meta: JSON.parse(req.postData() || '{}') });
      if (id && !can(e, D.files.get(id))) return fail(404, 'File not found');
      return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'Location', Location: 'https://www.googleapis.com/mockput/' + sid }, body: '' });
    }
    const parts = P.replace('/drive/v3/files', '').split('/').filter(Boolean);
    if (!parts.length && m === 'GET') {
      const q = u.searchParams.get('q') || '';
      return json({ files: [...D.files.values()].filter(f => can(e, f) && matchQ(f, q)).map(f => view(f, e)) });
    }
    if (!parts.length && m === 'POST') {
      const meta = JSON.parse(req.postData());
      const f = { id: 'f' + seq++, owner: e, perms: [], revs: [], appProperties: {}, parents: meta.parents || [], mimeType: meta.mimeType, name: meta.name, description: meta.description, modifiedTime: tick() };
      setProps(f, meta.appProperties); D.files.set(f.id, f); acc(e).add(f.id); return json(view(f, e));
    }
    const f = D.files.get(parts[0]);
    if (!can(e, f)) return fail(404, 'File not found: ' + parts[0]);
    if (parts[1] === 'permissions') {
      if (m === 'GET') return json({ permissions: [{ id: 'own', type: 'user', role: 'owner', emailAddress: f.owner }, ...f.perms] });
      if (f.owner !== e && f.writersCanShare === false) return fail(403, 'insufficient permissions to share');
      if (m === 'POST') { const b = JSON.parse(req.postData()); if (/nogoogle/.test(b.emailAddress)) return fail(400, 'no Google account for that address');
        const p = { id: 'perm' + seq++, type: 'user', role: b.role, emailAddress: b.emailAddress, displayName: D.names[b.emailAddress] || b.emailAddress }; f.perms = f.perms.filter(x => x.emailAddress !== b.emailAddress).concat(p);
        D.log.push(['share', e, b.emailAddress, u.searchParams.get('emailMessage')]); return json(p); }
      if (m === 'DELETE') { f.perms = f.perms.filter(x => x.id !== parts[2]); return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' }, body: '' }); }
    }
    if (parts[1] === 'revisions') {
      if (parts[2]) { const r = f.revs.find(x => x.id === parts[2]); return r ? route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: r.content }) : fail(404, 'no revision'); }
      return json({ revisions: f.revs.map(r => ({ id: r.id, modifiedTime: r.modifiedTime })) });
    }
    if (m === 'GET') {
      if (u.searchParams.get('alt') === 'media') { if (f.trashed) return fail(404, 'gone'); return route.fulfill({ status: 200, contentType: isJson(f) ? 'application/json' : f.mimeType, headers: { 'access-control-allow-origin': '*' }, body: f.revs[f.revs.length - 1].content }); }
      return json(view(f, e));
    }
    if (m === 'PATCH') {
      const b = JSON.parse(req.postData() || '{}');
      if ('writersCanShare' in b || 'trashed' in b) { if (f.owner !== e) return fail(403, 'owner only'); }
      setProps(f, b.appProperties); if (b.name && f.owner === e) f.name = b.name; if ('description' in b) f.description = b.description; if ('trashed' in b) f.trashed = b.trashed; if ('writersCanShare' in b) f.writersCanShare = b.writersCanShare;
      if (D.bumpOnMeta) f.modifiedTime = tick();
      D.log.push(['patch', e, f.id, b.appProperties || {}]);
      return json(view(f, e));
    }
    if (m === 'DELETE') { D.files.delete(f.id); return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' }, body: '' }); }
    return fail(400, 'unhandled ' + m + ' ' + P);
  } catch (err) { return fail(err.code || 500, err.message); }
}
const GIS = `window.google=window.google||{};google.accounts={oauth2:{initTokenClient:function(c){return{requestAccessToken:function(){if(window.__MOCK_DENY){setTimeout(function(){c.error_callback&&c.error_callback({type:'popup_closed'})},5);return}setTimeout(function(){c.callback({access_token:'tok:'+window.__MOCK_EMAIL,expires_in:window.__MOCK_EXP||3600})},5)}}},hasGrantedAllScopes:function(){return true},revoke:function(t,cb){cb&&cb()}}};`;
const PICKER = `window.gapi={load:function(n,o){setTimeout(function(){(o.callback||o)()},5)}};window.google=window.google||{};(function(){
function V(){this.o={}} ['setMimeTypes','setMode','setOwnedByMe','setFileIds','setQuery'].forEach(function(k){V.prototype[k]=function(v){this.o[k]=v;return this}});
function B(){this.o={views:[]}} ['setOAuthToken','setTitle','setCallback','setAppId','setDeveloperKey'].forEach(function(k){B.prototype[k]=function(v){this.o[k]=v;return this}});
B.prototype.addView=function(v){this.o.views.push(v.o);return this};
B.prototype.build=function(){var o=this.o;return{setVisible:function(){window.__mockPick({token:o.setOAuthToken,appId:o.setAppId,key:o.setDeveloperKey||null,view:o.views[0]}).then(function(ids){o.setCallback(ids.length?{action:'picked',docs:ids.map(function(i){return{id:i}})}:{action:'cancel'})})}}};
google.picker={DocsView:V,PickerBuilder:B,ViewId:{DOCS:'docs'},DocsViewMode:{LIST:'list'},Action:{PICKED:'picked',CANCEL:'cancel'}};})();`;
function serve() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
  return new Promise(res => { const s = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html'; const f = path.join(ROOT, p);
    fs.readFile(f, (er, d) => { if (er) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain', 'cache-control': 'no-store' }); r.end(d); }); }).listen(0, () => res(s)); });
}
async function person(browser, base, email, name, opts = {}) {
  D.names[email] = name;
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  await ctx.addInitScript(([e, exp]) => { window.__MOCK_EMAIL = e; if (exp) window.__MOCK_EXP = exp; }, [email, opts.exp || 0]);
  await ctx.exposeBinding('__mockPick', async (_s, o) => {
    D.log.push(['pick', email, o]);
    const want = o.view.setFileIds;
    const ids = [...D.files.values()].filter(f => !f.trashed && f.perms.some(p => p.emailAddress === email) && (!want || f.id === want) && f.mimeType === 'application/json').map(f => f.id);
    if (opts.pickNone) return [];
    ids.forEach(i => acc(email).add(i)); return ids;
  });
  await ctx.route('**/*', route => {
    const u = route.request().url();
    if (u.startsWith(base)) return route.continue();
    if (u.startsWith('https://accounts.google.com/gsi/client')) return route.fulfill({ contentType: 'text/javascript', body: GIS });
    if (u.startsWith('https://apis.google.com/js/api.js')) return route.fulfill({ contentType: 'text/javascript', body: PICKER });
    if (u.startsWith('https://www.googleapis.com/')) return handle(route);
    /* the PDF and Excel libraries the tools load: served from a local folder when a test gives one (opts.libs) */
    if (opts.libs && u.startsWith('https://cdnjs.cloudflare.com/')) { const f = path.join(opts.libs, path.basename(new URL(u).pathname)); if (fs.existsSync(f)) return route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(f) }); }
    return route.abort();
  });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', e => page.errors.push(String(e)));
  page.on('console', m => { if (/TICKERR/.test(m.text()) && !/Failed to fetch/.test(m.text())) console.log(email, m.text()); if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED|net::/.test(m.text())) page.errors.push('console: ' + m.text()); });
  return { ctx, page, email, name };
}
module.exports = { D, serve, person };
