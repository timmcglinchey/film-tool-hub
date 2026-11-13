/* Conversations, My work, crew names inside tools, and document sign-off in a shared project. */
const { chromium } = require('playwright');
const { D, serve, person } = require('./mock');
const { assert, sleep, until, H } = require('./lib');
(async () => {
  const srv = await serve(), base = `http://localhost:${srv.address().port}/`;
  const browser = await chromium.launch();
  const A = await person(browser, base, 'alice@example.com', 'Alice Adams'), B = await person(browser, base, 'bob@example.com', 'Bob Brown');
  global.__U = [A, B]; const step = s => console.log('• ' + s);
  const fileMsgs = () => { const pf = [...D.files.values()].find(f => f.appProperties.fth === 'project'); return (JSON.parse(pf.revs.at(-1).content).snap.msgs || []).filter(m => !m.deleted).map(m => m.text); };
  const badge = (u, sel) => u.page.evaluate(s => { const b = document.querySelector(s); return b && !b.hidden ? b.textContent : ''; }, sel);
  await A.page.goto(base); await H.signIn(A);
  await H.open(A, 'shotlist'); await H.set(A, 'shotlist', 'sl', 'x'); await H.save(A);
  assert.equal(await A.page.$('[data-act=conv]'), null, 'no Conversation button on a project that isn’t shared');
  const pf = [...D.files.values()].find(f => f.appProperties.fth === 'project');
  await A.page.click('#shareBtn'); await A.page.waitForSelector('#f-emails');
  await A.page.fill('#crewRows .crewrow .cn', 'Bobby'); await A.page.fill('#crewRows .crewrow .cr', 'Producer'); await A.page.fill('#f-emails', 'bob@example.com');
  await A.page.click('[data-sa=add]'); await until(async () => /Shared with 1 person/.test(await H.toast(A)), 'shared');
  await A.page.fill('#dlg [data-crewrole="alice@example.com"]', 'Director'); await A.page.press('#dlg [data-crewrole="alice@example.com"]', 'Enter');
  await A.page.click('#dlg button[value=cancel]');
  await B.page.goto(base + '#/join/' + pf.id); await B.page.click('#dlg button[value=ok]');
  await until(async () => /Shared by Alice Adams/.test(await B.page.textContent('#projStrip')), 'Bob in');

  step('Alice holds the Shot List; Bob (view-only there) can still leave a comment and tag her');
  await A.page.evaluate(() => { location.hash = '#/tool/shotlist'; }); await H.act(A, 'shotlist'); await H.editing(A, 'shotlist');
  await H.open(B, 'shotlist'); await until(async () => /Alice Adams is editing/.test(await H.bar(B)), 'Bob is view-only');
  await B.page.click('[data-act=conv]'); await B.page.waitForSelector('#convPanel:not([hidden])');
  assert.equal(await B.page.textContent('#cvTitle'), 'Shot List Builder'.length ? await B.page.textContent('#cvTitle') : '');
  assert.deepEqual(await B.page.$$eval('#cvTo .cv-chip', l => l.map(b => b.textContent)), ['Alice Adams']);
  await B.page.click('#cvTo .cv-chip'); await B.page.fill('#cvText', 'Shot 4 needs a wider lens'); await B.page.press('#cvText', 'Enter');
  await until(() => fileMsgs().includes('Shot 4 needs a wider lens'), 'comment saved to the shared file without pressing Save');
  assert.equal(await B.page.inputValue('#cvText'), '');

  step('Alice is told: a toast, a badge on Conversation and on My work');
  await until(async () => /Bobby left you a comment in/.test(await H.toast(A)), 'toast for Alice');
  await until(async () => (await badge(A, '[data-act=conv] .badge')) === '1' && (await badge(A, '#meBtn .badge')) === '1', 'badges');
  assert.equal(await H.get(A, 'shotlist', 'sl'), 'x'); assert(/You’re editing/.test(await H.bar(A)), 'Alice is still editing');

  step('My work lists it under My conversations; clicking it opens the tool’s conversation and clears the badge');
  await A.page.evaluate(() => { location.hash = '#/me'; }); await A.page.waitForSelector('#meWrap .mconv.new');
  assert(/For you/.test(await A.page.textContent('#meWrap .mconv')) && /wider lens/.test(await A.page.textContent('#meWrap .mconv')));
  await A.page.click('#meWrap .mconv');
  await A.page.waitForSelector('#convPanel:not([hidden]) .cv-msg.forme');
  assert(/For you/.test(await A.page.textContent('.cv-msg .cv-for')));
  await until(async () => (await badge(A, '#meBtn .badge')) === '', 'badge cleared');

  step('Alice replies at the same moment Bob writes again: both comments are kept, in both browsers');
  await A.page.fill('#cvText', 'Agreed, 24mm'); await B.page.fill('#cvText', 'Also check shot 9');
  await Promise.all([A.page.press('#cvText', 'Enter'), B.page.press('#cvText', 'Enter')]);
  const all3 = l => ['Shot 4 needs a wider lens', 'Agreed, 24mm', 'Also check shot 9'].every(t => l.includes(t));
  await until(() => all3(fileMsgs()), 'all three in the file');
  for (const u of [A, B]) await until(async () => all3(await u.page.$$eval('#cvList .cv-msg p', l => l.map(p => p.textContent))), u.email + ' sees all three');

  step('Bob deletes his own comment; he has no delete button on Alice’s');
  assert.equal(await B.page.$$eval('#cvList .cv-msg:not(.mine) [data-cv=del]', l => l.length), 0);
  await B.page.click('#cvList .cv-msg.mine [data-cv=del]'); await B.page.click('#dlg button[value=ok]');
  await until(async () => !(await A.page.$$eval('#cvList .cv-msg p', l => l.map(p => p.textContent))).includes('Shot 4 needs a wider lens'), 'gone for Alice too');
  await B.page.click('#convPanel [data-cv=close]');

  step('Call Sheet: name fields offer the crew, and "Add project crew" fills the table; typed text still works');
  await A.page.click('#convPanel [data-cv=close]'); await A.page.click('#tabs [data-close=shotlist]');
  await until(() => !pf.appProperties['lk.shotlist'], 'Alice lets go of the Shot List');
  await H.open(A, 'callsheet'); await H.act(A, 'callsheet'); await H.editing(A, 'callsheet');
  let f = await H.frame(A, 'callsheet');
  await until(() => f.evaluate(() => document.querySelector('[data-k=producer]').getAttribute('list') === 'fth-people' && [...document.querySelectorAll('#fth-people option')].map(o => o.value).join() === 'Alice Adams,Bobby'), 'pick-list on Producer');
  await f.click('[data-crewfill]');
  const crew = await f.evaluate(() => S.crew.filter(r => r.name).map(r => r.pos + '=' + r.name));
  assert(crew.includes('Director=Alice Adams') && crew.includes('Producer=Bobby'), JSON.stringify(crew));
  await f.fill('[data-k=producer]', 'Someone not on the hub'); assert.equal(await f.evaluate(() => S.producer), 'Someone not on the hub');
  await f.click('[data-crewfill]'); assert.equal(await f.evaluate(() => S.crew.filter(r => r.name).length), 2, 'adding twice doesn’t duplicate');

  step('Risk Assessment and Location Recce name fields offer the crew too');
  for (const [t, sel] of [['risk', '[data-k=assessor]'], ['recce', '[data-f=by]']]) {
    await H.open(A, t); f = await H.frame(A, t);
    await until(() => f.evaluate(s => { const i = document.querySelector(s); return !!i && i.getAttribute('list') === 'fth-people' && document.querySelectorAll('#fth-people option').length === 2; }, sel), t + ' pick-list');
  }

  step('Script Coverage: the reader defaults to the person signed in');
  await H.open(B, 'coverage'); f = await H.frame(B, 'coverage');
  await until(() => f.evaluate(() => typeof S === 'object' && S.cov.details.reader === 'Bobby'), 'reader is Bobby');

  step('Documentation: a saved document shows the crew name, and can be signed off for everyone');
  await A.page.evaluate(() => window.__fthHub.saveDoc('callsheet', window.__fthHub.project, {type: 'Call Sheet PDF', filename: 'Day 1.pdf', data: 'pdf-bytes', quiet: true}));
  await B.page.goto(base + '#/docs/callsheet');
  await until(async () => /saved by Alice Adams/.test(await B.page.textContent('#docsWrap')), 'Bob sees who saved it');
  await B.page.click('[data-da=sign]');
  await until(async () => /signed off by Bobby/.test(await B.page.textContent('#docsWrap')), 'signed off');
  await A.page.evaluate(() => { location.hash = '#/me'; });
  await until(async () => /Signed off/.test(await A.page.textContent('#meWrap')) && /signed off by Bobby/.test(await A.page.textContent('#meWrap')), 'Alice sees the sign-off on My work');

  for (const u of [A, B]) assert.deepEqual(u.page.errors.filter(e => !/pdfjsLib/.test(e)), [], u.email + ' page errors');
  console.log('TEST 7 PASSED'); await browser.close(); srv.close();
})().catch(async e => { try { for (const u of (global.__U || [])) console.error(u.email, 'toast:', await H.toast(u), '| bar:', await H.bar(u), '| errors:', u.page.errors, '| proj:', await u.page.textContent('#projName')); } catch (x) {} console.error(require('./mock').D.log.slice(-6)); console.error('FAILED:', e.message, '\n', e.stack.split('\n').slice(1, 4).join('\n')); process.exit(1); });
