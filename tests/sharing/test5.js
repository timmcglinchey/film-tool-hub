/* The bar above a tool when Drive won't show the project file: what the owner is told, what crew are told,
   and what happens when Google connects a different account from the one signed in here. */
const { chromium } = require('playwright');
const { D, serve, person } = require('./mock');
const { assert, sleep, until, H } = require('./lib');
(async () => {
  const srv = await serve(), base = `http://localhost:${srv.address().port}/`;
  const browser = await chromium.launch();
  const A = await person(browser, base, 'alice@example.com', 'Alice Adams'), B = await person(browser, base, 'bob@example.com', 'Bob Brown');
  global.__U = [A, B]; const step = s => console.log('• ' + s);
  const acc = e => D.access.get(e);
  await A.page.goto(base); await H.signIn(A);
  await H.open(A, 'shotlist'); await H.set(A, 'shotlist', 'sl', 'alice-1'); await H.save(A);
  const pf = [...D.files.values()].find(f => f.appProperties.fth === 'project');
  await A.page.click('#shareBtn'); await A.page.waitForSelector('#f-emails');
  await A.page.fill('#f-emails', 'bob@example.com'); await A.page.click('[data-sa=add]');
  await until(async () => /Shared with 1 person/.test(await H.toast(A)), 'shared');
  await A.page.click('#dlg button[value=cancel]');
  await H.act(A, 'shotlist'); await H.editing(A, 'shotlist');

  step('Owner: Drive stops showing the file. The bar doesn’t say "ask the owner"; it offers to reconnect');
  acc(A.email).delete(pf.id);
  await until(async () => /can’t open this project’s file in the Google Drive of alice@example.com/.test(await H.bar(A)), 'owner told the file can’t be opened');
  assert(!/no longer have access|Ask /.test(await H.bar(A)), await H.bar(A));
  assert(await A.page.$('#lockBar [data-lk=retry]'), 'reconnect button');

  step('Owner: Google connects someone else’s account. It’s refused and explained, and nothing is sent with it');
  const calls = D.log.length;
  await A.page.evaluate(() => { window.__MOCK_EMAIL = 'carol@example.com'; });
  await A.page.click('#lockBar [data-lk=retry]');
  await until(async () => /Google connected carol@example.com, but you’re signed in here as alice@example.com/.test(await H.toast(A)), 'wrong account explained');
  await until(async () => /Reconnect Google Drive to edit/.test(await H.bar(A)), 'bar asks to reconnect');
  assert(!D.log.slice(calls).some(l => l[1] === 'carol@example.com'), 'nothing done as Carol');
  assert.equal(await A.page.evaluate(() => JSON.parse(localStorage.getItem('filmtoolhub-account')).email), 'alice@example.com');

  step('Owner: reconnecting as herself, with the file back, carries on editing');
  acc(A.email).add(pf.id);
  await A.page.evaluate(() => { window.__MOCK_EMAIL = 'alice@example.com'; });
  await A.page.click('#lockBar [data-lk=reconnect]');
  await H.act(A, 'shotlist'); await H.editing(A, 'shotlist');

  step('Owner: the file is in the bin in Drive');
  pf.trashed = true;
  await until(async () => /is in the bin in your Google Drive/.test(await H.bar(A)), 'owner told it’s in the bin');
  pf.trashed = false;
  await H.act(A, 'shotlist'); await H.editing(A, 'shotlist');
  await A.page.click('#tabs [data-close=shotlist]');
  await until(() => !pf.appProperties['lk.shotlist'], 'Alice lets go');

  step('Crew: Bob joins; when his sign-in can no longer see the file he can choose it again');
  await B.page.goto(base + '#/join/' + pf.id);
  await B.page.click('#dlg button[value=ok]');
  await until(async () => (await B.page.textContent('#projName')).length && acc(B.email) && acc(B.email).has(pf.id), 'Bob opened it');
  await H.open(B, 'shotlist'); await H.act(B, 'shotlist'); await H.editing(B, 'shotlist');
  acc(B.email).delete(pf.id);
  await until(async () => /no longer have access.*Ask Alice Adams/.test(await H.bar(B)), 'Bob told he lost access');
  await B.page.click('#lockBar [data-lk=reopen]');
  await until(() => acc(B.email).has(pf.id), 'Bob chose the file again');
  await H.act(B, 'shotlist'); await H.editing(B, 'shotlist');

  for (const u of [A, B]) assert.deepEqual(u.page.errors, [], u.email + ' page errors');
  console.log('TEST 5 PASSED'); await browser.close(); srv.close();
})().catch(async e => { try { for (const u of (global.__U || [])) console.error(u.email, 'toast:', await H.toast(u), '| bar:', await H.bar(u), '| errors:', u.page.errors, '| proj:', await u.page.textContent('#projName')); } catch (x) {} console.error(require('./mock').D.log.slice(-8)); console.error('FAILED:', e.message, '\n', e.stack.split('\n').slice(1, 4).join('\n')); process.exit(1); });
