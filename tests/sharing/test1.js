const { chromium } = require('playwright');
const { D, serve, person } = require('./mock');
const { assert, sleep, until, H } = require('./lib');
(async () => {
  const srv = await serve(), base = `http://localhost:${srv.address().port}/`;
  const browser = await chromium.launch();
  const A = await person(browser, base, 'alice@example.com', 'Alice Adams'), B = await person(browser, base, 'bob@example.com', 'Bob Brown');
  global.__U = [A, B]; const step = s => console.log('• ' + s);
  await A.page.goto(base); await H.signIn(A);

  step('Alice makes a project with work in three tools, then saves');
  await H.open(A, 'callsheet'); await H.set(A, 'callsheet', 'cs', 'alice-1');
  await H.open(A, 'shotlist'); await H.set(A, 'shotlist', 'sl', 'alice-1'); await H.kvSet(A, 'shotlist', 'k', 'alice-kv');
  await H.open(A, 'risk'); await H.kvSet(A, 'risk', 'k', 'risk-kv-1');
  assert.equal(await H.bar(A), '', 'no bar on an unshared project');
  await H.save(A);
  const pf = [...D.files.values()].find(f => f.appProperties.fth === 'project'); assert(pf, 'project file on Drive');

  step('Alice shares with Bob (and one bad address)');
  await A.page.click('#shareBtn'); await A.page.waitForSelector('#f-emails');
  await A.page.fill('#f-emails', 'bob@example.com, x@nogoogle.com'); await A.page.click('[data-sa=add]');
  await until(async () => /Couldn’t share with: x@nogoogle.com/.test(await H.toast(A)), 'partial failure reported');
  assert.deepEqual(pf.perms.map(p => [p.emailAddress, p.role]), [['bob@example.com', 'writer']]);
  assert.equal(pf.appProperties.shared, '1'); assert.equal(pf.writersCanShare, false);
  const link = await A.page.inputValue('#f-link'); assert(link.endsWith('#/join/' + pf.id), link);
  assert(D.log.find(l => l[0] === 'share')[3].includes(link), 'email message carries the link');
  assert(/Bob Brown/.test(await A.page.textContent('#dlg .plist')));
  await A.page.click('#dlg button[value=cancel]');
  assert.equal(await A.page.textContent('#shareLbl'), 'Shared');

  step('Bob cannot see it until he picks it; join link → sign in → picker → project loads');
  await B.page.goto(link);
  await B.page.waitForSelector('#dlg[open]'); assert(/shared a Film Tool Hub project/.test(await B.page.textContent('#dlg')));
  await B.page.click('#dlg button[value=ok]');
  await until(async () => /Shared by Alice Adams/.test(await B.page.textContent('#projStrip')), 'Bob switched to shared project');
  const pick = D.log.find(l => l[0] === 'pick'); assert.equal(pick[2].view.setFileIds, pf.id); assert.equal(pick[2].appId, '460037954433'); assert.equal(pick[2].token, 'tok:bob@example.com');
  assert(/Shared by Alice Adams/.test(await B.page.textContent('#projStrip')));
  assert.equal(await B.page.evaluate(() => document.querySelector('#shareBtn').hidden), true, 'crew have no Share button');
  await B.page.click('#projBtn'); assert(/Shared with me[\s\S]*My first project|Shared with me/.test(await B.page.textContent('#pmenu'))); await B.page.keyboard.press('Escape');

  step('Alice holds Call Sheet; Bob sees it view-only and cannot change it');
  await A.page.evaluate(() => { location.hash = '#/tool/callsheet'; }); await H.editing(A, 'callsheet');
  await H.open(B, 'callsheet');
  assert.equal(await H.get(B, 'callsheet', 'cs'), 'alice-1', 'Bob sees Alice’s saved work');
  await until(async () => /Alice Adams is editing Call Sheet/.test(await H.bar(B)), 'Bob sees who is editing');
  await H.set(B, 'callsheet', 'cs', 'bob-overwrite'); assert.equal(await H.get(B, 'callsheet', 'cs'), 'alice-1', 'Bob’s write is ignored');
  await H.kvSet(B, 'callsheet', 'z', 'nope'); assert.equal(await H.kvGet(B, 'callsheet', 'z'), undefined, 'Bob’s database write is ignored');
  const typed = await (await H.frame(B, 'callsheet')).evaluate(() => { const i = document.createElement('input'); document.body.appendChild(i); i.focus(); return true; });
  await B.page.keyboard.type('hello'); assert.equal(await (await H.frame(B, 'callsheet')).evaluate(() => document.activeElement.value), '', 'typing is blocked when view-only');
  await (await H.frame(B, 'callsheet')).evaluate(() => document.activeElement.remove());

  step('Bob holds Shot List and edits; both save; nothing is lost');
  await H.open(B, 'shotlist'); await H.editing(B, 'shotlist');
  await H.set(B, 'shotlist', 'sl', 'bob-2'); await H.kvSet(B, 'shotlist', 'k', 'bob-kv');
  await H.set(A, 'callsheet', 'cs', 'alice-2');
  await H.save(B);
  await H.save(A);
  let cur = JSON.parse(pf.revs.at(-1).content);
  assert.equal(cur.snap.ls.cs, 'alice-2'); assert.equal(cur.snap.ls.sl, 'bob-2');
  const kv = Object.fromEntries(cur.snap.idb['fth-tool-data'].stores.kv.records);
  assert.equal(kv['shotlist:k'], 'bob-kv'); assert.equal(kv['risk:k'], 'risk-kv-1', 'another tool’s entry in the shared store survives');
  assert.equal(cur.savedBy.email, 'alice@example.com');
  step('each gets the other’s work without doing anything');
  await until(async () => (await H.get(B, 'callsheet', 'cs')) === 'alice-2', 'Bob receives Alice’s change');
  await A.page.evaluate(() => { location.hash = '#/tool/shotlist'; });
  await until(async () => (await H.get(A, 'shotlist', 'sl')) === 'bob-2' && (await H.kvGet(A, 'shotlist', 'k')) === 'bob-kv', 'Alice receives Bob’s change');
  await until(async () => /Bob Brown is editing Shot List/.test(await H.bar(A)), 'Alice sees Bob holds Shot List');
  const revsBefore = pf.revs.length; await H.save(A); assert.equal(pf.revs.length, revsBefore, 'saving with nothing new uploads nothing');

  step('Request to edit → Not now');
  await A.page.click('[data-lk=request]');
  await B.page.waitForSelector('#reqCard:not([hidden])'); assert(/Alice Adams would like to edit Shot List/.test(await B.page.textContent('#reqCard')));
  await B.page.click('[data-rq=no]');
  await until(async () => /Bob is still working on Shot List/.test(await H.toast(A)), 'Alice told not now');
  assert.equal(await H.get(A, 'shotlist', 'sl'), 'bob-2');

  step('Request to edit → Hand over (Bob’s unsaved work is saved first)');
  await H.set(B, 'shotlist', 'sl', 'bob-3-unsaved');
  await until(async () => /Request to edit/.test(await H.bar(A)), 'request button back');
  await A.page.click('[data-lk=request]');
  await B.page.waitForSelector('#reqCard:not([hidden])'); await B.page.click('[data-rq=yes]');
  await H.editing(A, 'shotlist');
  assert.equal(await H.get(A, 'shotlist', 'sl'), 'bob-3-unsaved', 'Alice starts from Bob’s latest');
  await until(async () => /Alice Adams is editing Shot List/.test(await H.bar(B)), 'Bob now view-only');
  await H.set(B, 'shotlist', 'sl', 'bob-late'); assert.equal(await H.get(B, 'shotlist', 'sl'), 'bob-3-unsaved');
  await H.set(A, 'shotlist', 'sl', 'alice-4'); assert.equal(await H.get(A, 'shotlist', 'sl'), 'alice-4');

  step('Owner take-over: Bob holds Risk with unsaved work; Alice takes over');
  await H.open(B, 'schedule'); await H.editing(B, 'schedule'); await H.kvSet(B, 'schedule', 'k', 'bob-unsaved');
  await A.page.evaluate(() => { location.hash = '#/tool/schedule'; });
  await until(async () => /Bob Brown is editing/.test(await H.bar(A)), 'Alice sees Bob on risk');
  assert.equal(await B.page.evaluate(() => !!document.querySelector('[data-lk=take]')), false, 'crew have no Take over');
  await A.page.click('[data-lk=take]'); await A.page.click('#dlg button[value=ok]');
  await H.editing(A, 'schedule');
  await until(async () => /set aside/.test(await H.toast(B)), 'Bob told his unsaved changes were set aside');
  await until(async () => (await H.kvGet(B, 'schedule', 'k')) === undefined, 'Bob back on the shared version');
  assert(/Alice Adams is editing/.test(await H.bar(B)));
  const backups = await B.page.evaluate(() => new Promise(r => { const q = indexedDB.open('film-tool-hub'); q.onsuccess = () => { const g = q.result.transaction('backups').objectStore('backups').getAll(); g.onsuccess = () => r(g.result.map(b => b.reason)); }; }));
  assert(backups.includes('before taking the shared version'), 'Bob has a backup: ' + backups);

  step('Closing a tool saves it and frees it');
  await A.page.evaluate(() => { location.hash = '#/tool/shotlist'; });
  await A.page.click('#tabs [data-close=shotlist]');
  await until(() => !pf.appProperties['lk.shotlist'] && JSON.parse(pf.revs.at(-1).content).snap.ls.sl === 'alice-4', 'Shot List saved and released');
  await B.page.evaluate(() => { location.hash = '#/tool/shotlist'; });
  await until(async () => (await H.get(B, 'shotlist', 'sl')) === 'alice-4', 'Bob has it');
  await H.act(B, 'shotlist'); await H.editing(B, 'shotlist');

  step('Removing Bob: he loses access; removing the last person ends sharing');
  await A.page.click('#shareBtn'); await A.page.click('[data-sa=remove]');
  await until(async () => /can no longer open/.test(await H.toast(A)), 'removed');
  await A.page.waitForSelector('#dlg[open]'); await A.page.click('#dlg button[value=cancel]');
  assert.equal(pf.appProperties.shared, '0'); assert.equal(Object.keys(pf.appProperties).filter(k => /^(lk|rq)\./.test(k)).length, 0);
  await until(async () => /no longer have access/.test(await H.bar(B)), 'Bob told he lost access');
  await H.set(B, 'shotlist', 'sl', 'bob-after'); assert.equal(await H.get(B, 'shotlist', 'sl'), 'alice-4');
  await A.page.evaluate(() => { location.hash = '#/tool/risk'; }); await sleep(600);
  assert.equal(await H.bar(A), '', 'Alice’s project is ordinary again');
  await H.kvSet(A, 'risk', 'k', 'solo-again'); await H.save(A); assert.equal(Object.fromEntries(JSON.parse(pf.revs.at(-1).content).snap.idb['fth-tool-data'].stores.kv.records)['risk:k'], 'solo-again');

  for (const u of [A, B]) assert.deepEqual(u.page.errors, [], u.email + ' page errors');
  console.log('TEST 1 PASSED'); await browser.close(); srv.close();
})().catch(async e => { try { for (const u of (global.__U || [])) console.error(u.email, 'toast:', await H.toast(u), '| bar:', await H.bar(u), '| errors:', u.page.errors, '| proj:', await u.page.textContent('#projName')); } catch (x) {} console.error(require('./mock').D.log.slice(-8)); console.error('FAILED:', e.message, '\n', e.stack.split('\n').slice(1, 4).join('\n')); process.exit(1); });
