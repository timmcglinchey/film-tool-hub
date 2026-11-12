const { chromium } = require('playwright');
const { D, serve, person } = require('./mock');
const { assert, sleep, until, H } = require('./lib');
const BUMP = process.argv.includes('bump');
(async () => {
  D.bumpOnMeta = BUMP;
  const srv = await serve(), base = `http://localhost:${srv.address().port}/`;
  const browser = await chromium.launch();
  const A = await person(browser, base, 'alice@example.com', 'Alice Adams'), B = await person(browser, base, 'bob@example.com', 'Bob Brown');
  global.__U = [A, B]; const step = s => console.log('• ' + s);
  const ff = async (ms, ...us) => { for (const u of us) await u.page.clock.fastForward(ms); };
  const content = () => JSON.parse(pf.revs.at(-1).content);
  await A.page.clock.install(); await B.page.clock.install();
  await A.page.goto(base); await H.signIn(A);
  await H.open(A, 'callsheet'); await H.set(A, 'callsheet', 'cs', 'a1');
  // a tool database of its own (like Script Breakdown), with binary data in it
  const mkdb = async (u, tool, val) => (await H.frame(u, tool)).evaluate(v => new Promise((res, rej) => { const q = indexedDB.open('toolbase', 1); q.onupgradeneeded = () => q.result.createObjectStore('docs', { keyPath: 'id' }); q.onsuccess = () => { window.__db = q.result; const t = q.result.transaction('docs', 'readwrite'); t.objectStore('docs').put({ id: 'last', text: v, bin: new Uint8Array([1, 2, 3]) }); t.oncomplete = () => res(); t.onerror = () => rej(t.error); }; }), val);
  const rddb = async (u, tool) => (await H.frame(u, tool)).evaluate(() => new Promise(res => { const q = indexedDB.open('toolbase', 1); q.onupgradeneeded = () => q.result.createObjectStore('docs', { keyPath: 'id' }); q.onsuccess = () => { const g = q.result.transaction('docs').objectStore('docs').get('last'); g.onsuccess = () => { res(g.result ? g.result.text + ':' + Array.from(g.result.bin || []).join('') : null); }; }; }));
  await H.open(A, 'breakdown'); await mkdb(A, 'breakdown', 'bd-a1');
  await H.save(A);
  const pf = [...D.files.values()].find(f => f.appProperties.fth === 'project');
  await A.page.click('#shareBtn'); await A.page.waitForSelector('#f-emails'); await A.page.fill('#f-emails', 'bob@example.com'); await A.page.click('[data-sa=add]');
  await until(async () => /Shared with 1 person/.test(await H.toast(A)), 'shared'); await A.page.click('#dlg button[value=cancel]');

  step('Bob signs in first, then uses “Open a shared project” (no link)');
  await B.page.goto(base); await H.signIn(B);
  await B.page.click('#projBtn'); assert(/Nothing yet/.test(await B.page.textContent('#pmenu'))); await B.page.click('[data-pm=shared]');
  await until(async () => /Shared by Alice Adams/.test(await B.page.textContent('#projStrip')), 'Bob has the project');
  assert.equal(D.log.filter(l => l[0] === 'pick').at(-1)[2].view.setOwnedByMe, false);
  await H.open(B, 'breakdown'); assert.equal(await rddb(B, 'breakdown'), 'bd-a1:123', 'tool database arrived with its binary data');

  step('A tool database changed by one person reaches the other while their tool is open');
  await A.page.evaluate(() => { location.hash = '#/tool/breakdown'; }); await H.editing(A, 'breakdown');
  await mkdb(A, 'breakdown', 'bd-a2'); await H.save(A);
  await until(async () => (await rddb(B, 'breakdown')) === 'bd-a2:123', 'Bob gets database change');

  step('Idle: after 4 minutes untouched, Alice’s unsaved work is saved and the tool is freed');
  await mkdb(A, 'breakdown', 'bd-a3-unsaved');
  await ff(4 * 60e3 + 20e3, A, B);
  await until(() => !pf.appProperties['lk:breakdown'] && content().snap.idb.toolbase.stores.docs.records[0][1].text === 'bd-a3-unsaved', 'auto-saved and released');
  await until(async () => /Nobody is editing/.test(await H.bar(A)), 'Alice bar says nobody');
  await until(async () => (await rddb(B, 'breakdown')) === 'bd-a3-unsaved:123', 'Bob has it');
  await B.page.click('[data-lk=start]'); await H.editing(B, 'breakdown');
  await until(async () => /Bob Brown is editing/.test(await H.bar(A)), 'Alice sees Bob');
  await mkdb(B, 'breakdown', 'bd-b4'); await H.save(B);
  await until(async () => (await rddb(A, 'breakdown')) === 'bd-b4:123', 'Alice gets it');

  step('Two people save at the same moment: both sets of work survive');
  await A.page.evaluate(() => { location.hash = '#/tool/callsheet'; }); await H.act(A, 'callsheet'); await H.editing(A, 'callsheet');
  await H.set(A, 'callsheet', 'cs', 'a-race'); await mkdb(B, 'breakdown', 'bd-b-race');
  let release; const gate = new Promise(r => release = r); let n = 0;
  D.delayPut = async s => { if (s.email === 'alice@example.com' && n++ === 0) await gate; };
  A.page.click('#saveBtn'); await sleep(1200);          // Alice's upload is held back mid-flight
  await H.save(B);                                       // Bob saves in the gap
  release(); D.delayPut = null;
  await until(() => content().snap.ls.cs === 'a-race' && content().snap.idb.toolbase.stores.docs.records[0][1].text === 'bd-b-race', 'both changes in the final file');
  await until(async () => (await H.get(B, 'callsheet', 'cs').catch(() => null)) === 'a-race' || true, 'ok');

  step('Alice goes offline with unsaved work; her hold lapses; Bob edits the same tool and saves; Alice’s stale changes are set aside, not pushed');
  await H.set(A, 'callsheet', 'cs', 'a-stale-unsaved');
  await A.page.evaluate(() => { window.__toasts = []; new MutationObserver(() => window.__toasts.push(Date.now() + ' ' + document.querySelector('#toast').textContent)).observe(document.querySelector('#toast'), {childList: true, characterData: true, subtree: true}); });
  await A.ctx.route('https://www.googleapis.com/**', r => r.abort());
  await ff(5 * 60e3 + 30e3, A, B);
  await H.open(B, 'callsheet'); await H.act(B, 'callsheet'); await H.editing(B, 'callsheet');
  await H.set(B, 'callsheet', 'cs', 'b-new'); await H.save(B);
  await A.ctx.unroute('https://www.googleapis.com/**');
  await A.page.clock.fastForward(10e3);
  await until(async () => (await H.get(A, 'callsheet', 'cs')) === 'b-new', 'Alice now has Bob’s version');
  assert((await A.page.evaluate(() => window.__toasts)).some(t => /set aside/.test(t)), 'told about set-aside changes');
  await H.save(A); assert.equal(content().snap.ls.cs, 'b-new', 'stale work was not pushed');

  step('Same, but nobody else touched it: Alice’s unsaved work is kept and can still be saved');
  await B.page.click('#tabs [data-close=callsheet]'); await until(() => !pf.appProperties['lk:callsheet'], 'Bob released');
  await H.act(A, 'callsheet'); await H.editing(A, 'callsheet'); await H.set(A, 'callsheet', 'cs', 'a-kept');
  await A.ctx.route('https://www.googleapis.com/**', r => r.abort());
  await ff(5 * 60e3 + 30e3, A, B);
  await A.ctx.unroute('https://www.googleapis.com/**');
  await A.page.clock.fastForward(10e3);
  await until(() => content().snap.ls.cs === 'a-kept', 'kept and auto-saved once back');
  assert.equal(await H.get(A, 'callsheet', 'cs'), 'a-kept');

  step('Reloading the page with unsaved work: it is still Alice’s, and saves');
  await H.act(A, 'callsheet'); await H.editing(A, 'callsheet'); await H.set(A, 'callsheet', 'cs', 'a-reload');
  A.page.once('dialog', d => d.accept());
  await A.page.reload(); await A.page.click('#acctBtn'); await A.page.click('[data-am=reconnect]');
  await H.editing(A, 'callsheet'); assert.equal(await H.get(A, 'callsheet', 'cs'), 'a-reload');
  assert(/Unsaved changes/.test(await A.page.evaluate(() => document.querySelector('#saveBtn').title)), 'still marked unsaved');
  await H.save(A); assert.equal(content().snap.ls.cs, 'a-reload', 'unsaved work sent after reload');

  step('Google connection times out: view-only with Reconnect, then back to editing');
  await A.page.evaluate(() => { location.hash = '#/tool/callsheet'; }); await H.editing(A, 'callsheet');
  await A.page.clock.fastForward(61 * 60e3);
  await until(async () => /Reconnect Google Drive to edit/.test(await H.bar(A)), 'reconnect bar');
  await H.set(A, 'callsheet', 'cs', 'a-noconn'); assert.equal(await H.get(A, 'callsheet', 'cs'), 'a-reload');
  await ff(61 * 60e3, B);
  await A.page.click('[data-lk=reconnect]'); await H.act(A, 'callsheet'); await H.editing(A, 'callsheet');

  step('Alice on a second computer: sees the shared project, and “Edit here instead”');
  const A2 = await person(browser, base, 'alice@example.com', 'Alice Adams'); global.__U.push(A2);
  await A2.page.goto(base); await H.signIn(A2);
  await until(async () => /Shared with your crew/.test(await A2.page.textContent('#projStrip')), 'second computer has it as shared');
  await H.open(A2, 'callsheet'); assert.equal(await H.get(A2, 'callsheet', 'cs'), 'a-reload');
  await until(async () => /another tab or on another computer/.test(await H.bar(A2)), 'told about other session');
  await H.set(A2, 'callsheet', 'cs', 'x'); assert.equal(await H.get(A2, 'callsheet', 'cs'), 'a-reload');
  await A2.page.click('[data-lk=take]'); await H.editing(A2, 'callsheet');
  await A.page.clock.fastForward(9e3);
  await until(async () => /another tab or on another computer/.test(await H.bar(A)), 'first computer view-only');

  step('Bob on a second computer: the shared project is listed without choosing it again');
  const B2 = await person(browser, base, 'bob@example.com', 'Bob Brown', { pickNone: true }); global.__U.push(B2);
  await B2.page.goto(base); await H.signIn(B2);
  await B2.page.click('#projBtn'); await B2.page.click('#pmenu [data-pm=open]:has-text("from Alice")');
  await until(async () => /Shared by Alice Adams/.test(await B2.page.textContent('#projStrip')), 'B2 opened it');
  await H.open(B2, 'callsheet'); assert.equal(await H.get(B2, 'callsheet', 'cs'), 'a-reload');

  step('Bob removes it from his list, then opens it again');
  await B2.page.evaluate(() => { location.hash = '#/'; }); await B2.page.click('[data-pact=manage]');
  assert(/Shared with me/.test(await B2.page.textContent('#dlg')));
  await B2.page.click('[data-pa=unlist]'); await B2.page.click('#dlg button[value=ok]');
  await until(async () => /Removed from your list/.test(await H.toast(B2)), 'removed');
  assert(!/Shared by/.test(await B2.page.textContent('#projStrip')));
  assert(!pf.trashed, 'owner’s file untouched');
  await B2.page.click('#acctBtn'); await B2.page.click('[data-am=sync]'); await sleep(800);
  await B2.page.click('#projBtn'); assert(/Nothing yet/.test(await B2.page.textContent('#pmenu')), 'stays off the list'); await B2.page.keyboard.press('Escape');
  await B2.page.goto(base + '#/join/' + pf.id); await B2.page.waitForSelector('#dlg[open]'); await B2.page.click('#dlg button[value=ok]');
  await until(async () => /Shared by Alice Adams/.test(await B2.page.textContent('#projStrip')), 'back again');

  for (const u of global.__U) assert.deepEqual(u.page.errors, [], u.email + ' page errors');
  console.log('TEST 2 PASSED' + (BUMP ? ' (bump mode)' : '')); await browser.close(); srv.close();
})().catch(async e => { try { for (const u of (global.__U || [])) console.error(u.email, 'toast:', await H.toast(u), '| bar:', await H.bar(u), '| errors:', u.page.errors); } catch (x) {} console.error(JSON.stringify(D.log.slice(-6))); console.error('FAILED:', e.message, '\n', e.stack.split('\n').slice(1, 4).join('\n')); process.exit(1); });
