/* The crew list: the owner names each person in the Share box, and the names reach the Task Board for everyone. */
const { chromium } = require('playwright');
const { D, serve, person } = require('./mock');
const { assert, sleep, until, H } = require('./lib');
(async () => {
  const srv = await serve(), base = `http://localhost:${srv.address().port}/`;
  const browser = await chromium.launch();
  const A = await person(browser, base, 'alice@example.com', 'Alice Adams'), B = await person(browser, base, 'bob@example.com', 'Robert Brown');
  D.names['cara@example.com'] = 'Cara Cole';
  global.__U = [A, B]; const step = s => console.log('• ' + s);
  const people = u => u.page.evaluate(() => window.__fthHub.people());
  const fileCrew = () => { const pf = [...D.files.values()].find(f => f.appProperties.fth === 'project'); return (JSON.parse(pf.revs.at(-1).content).project.crew || []).map(c => c.email + '=' + c.name).sort().join(', '); };
  await A.page.goto(base); await H.signIn(A);
  await H.open(A, 'tasks'); await H.save(A);
  assert.deepEqual(await people(A), [], 'no crew on an unshared project');
  const pf = [...D.files.values()].find(f => f.appProperties.fth === 'project');

  step('Alice shares with Bob (named "Bobby") and Cara (no name typed: Google’s name is used)');
  await A.page.click('#shareBtn'); await A.page.waitForSelector('#f-emails');
  await A.page.fill('#crewRows .crewrow .cn', 'Bobby'); await A.page.fill('#crewRows .crewrow .cr', '1st AD'); await A.page.fill('#f-emails', 'Bob@Example.com');
  await A.page.click('[data-sa=row]'); await A.page.fill('#crewRows .crewrow:nth-child(2) .ce', 'cara@example.com');
  await A.page.click('[data-sa=add]');
  await until(async () => /Shared with 2 people/.test(await H.toast(A)), 'shared');
  assert.deepEqual(await A.page.$$eval('#dlg [data-crew]', l => l.map(i => i.value)), ['Alice Adams', 'Bobby', 'Cara Cole']);
  assert.deepEqual(await A.page.$$eval('#dlg [data-crewrole]', l => l.map(i => i.value)), ['', '1st AD', '']);
  step('Alice gives herself a role (Director) in the list');
  await A.page.fill('#dlg [data-crewrole="alice@example.com"]', 'Director'); await A.page.press('#dlg [data-crewrole="alice@example.com"]', 'Enter');
  await until(async () => (await people(A))[0].role === 'Director', 'Alice is the Director');
  await A.page.click('#dlg button[value=cancel]');
  assert.deepEqual((await people(A)).map(p => [p.name, p.email, p.role, p.me, p.owner]), [['Alice Adams', 'alice@example.com', 'Director', true, true], ['Bobby', 'bob@example.com', '1st AD', false, false], ['Cara Cole', 'cara@example.com', '', false, false]]);
  await until(() => fileCrew() === 'alice@example.com=Alice Adams, bob@example.com=Bobby, cara@example.com=Cara Cole', 'the list is in the shared file');

  step('The Task Board offers those names when assigning a task');
  const names = async u => { const f = await H.frame(u, 'tasks'); await f.click('#whoBtn'); return f.$$eval('#whoList .tb-who-row', l => l.map(r => r.textContent.replace(/×$/, '').trim())); };
  await H.act(A, 'tasks'); await H.editing(A, 'tasks');
  let f = await H.frame(A, 'tasks');
  await f.evaluate(() => openTask());
  assert.deepEqual(await names(A), ['Alice AdamsDirector', 'Bobby1st AD', 'Cara Cole']);
  await f.fill('#fTitle', 'Book the van'); await f.click('#whoList .tb-who-row:nth-child(2) input'); await f.evaluate(() => document.querySelector('#taskForm').requestSubmit());
  await until(async () => (await f.evaluate(() => JSON.stringify(data.tasks.map(t => t.who)))) === '[["Bobby"]]', 'task assigned to Bobby');
  await H.save(A);
  await A.page.click('#tasksBtn');   /* leaving the Task Board closes it */ await until(() => !pf.appProperties['lk.tasks'], 'Alice lets go');

  step('Bob joins: he sees the same names (and himself marked as "me")');
  await B.page.goto(base + '#/join/' + pf.id); await B.page.click('#dlg button[value=ok]');
  await until(async () => /Shared by Alice Adams/.test(await B.page.textContent('#projStrip')), 'Bob in');
  await until(async () => (await people(B)).length === 3, 'Bob has the list');
  assert.deepEqual((await people(B)).map(p => [p.name, p.role, p.me]), [['Alice Adams', 'Director', false], ['Bobby', '1st AD', true], ['Cara Cole', '', false]]);
  step('Bob’s Task Board opens on his own tasks, its tab shows nothing due, and My work lists the task');
  await B.page.goto(base + '#/me'); await B.page.waitForSelector('#meWrap .mrow');
  assert(/My tasks/.test(await B.page.textContent('#meWrap')) && /Book the van/.test(await B.page.textContent('#meWrap .mlist')), 'task on My work');
  await H.open(B, 'tasks'); await H.act(B, 'tasks'); await H.editing(B, 'tasks');
  f = await H.frame(B, 'tasks'); await f.evaluate(() => openTask());
  assert.equal(await f.evaluate(() => filter), 'Bobby', 'the board is filtered to Bob');
  assert.deepEqual(await names(B), ['Alice AdamsDirector', 'Bobby1st AD', 'Cara Cole']);

  step('Alice renames Bob in the Share box: it reaches Bob without anyone pressing Save');
  await A.page.click('#shareBtn'); await A.page.waitForSelector('#dlg [data-crew]');
  await A.page.fill('#dlg [data-crew="bob@example.com"]', 'Bob (1st AD)'); await A.page.press('#dlg [data-crew="bob@example.com"]', 'Enter');
  await until(() => fileCrew().includes('bob@example.com=Bob (1st AD)'), 'rename saved to the file');
  await until(async () => ((await people(B))[1] || {}).name === 'Bob (1st AD)', 'Bob sees his new name');
  assert.equal(await A.page.evaluate(() => document.querySelector('#dlg').open), true, 'the Share box stays open after Enter');

  await B.page.evaluate(() => { location.hash = '#/me'; });
  await until(async () => /Book the van/.test(await B.page.textContent('#meWrap')), 'the task given to "Bobby" is still Bob’s after the rename');
  assert.equal(await B.page.evaluate(() => document.querySelector('#meBtn .badge').hidden), true, 'nothing due, so no badge');

  step('Removing Cara takes her off the list');
  await A.page.click('#dlg [data-sa=remove][data-email="cara@example.com"]');
  await until(async () => /Cara Cole can no longer open/.test(await H.toast(A)), 'removed');
  await until(async () => (await people(B)).length === 2, 'Bob’s list updates');
  assert.deepEqual((await people(A)).map(p => p.name), ['Alice Adams', 'Bob (1st AD)']);

  for (const u of [A, B]) assert.deepEqual(u.page.errors, [], u.email + ' page errors');
  console.log('TEST 6 PASSED'); await browser.close(); srv.close();
})().catch(async e => { try { for (const u of (global.__U || [])) console.error(u.email, 'toast:', await H.toast(u), '| bar:', await H.bar(u), '| errors:', u.page.errors, '| proj:', await u.page.textContent('#projName')); } catch (x) {} console.error(require('./mock').D.log.slice(-8)); console.error('FAILED:', e.message, '\n', e.stack.split('\n').slice(1, 4).join('\n')); process.exit(1); });
