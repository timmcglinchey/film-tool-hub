/* My Research: the Specialist Research Hub is personal. It is the same in every project, is never put in a
   project file or shared with a crew, and follows its owner between computers through a private Drive file. */
const { chromium } = require('playwright');
const { D, serve, person } = require('./mock');
const { assert, until, H } = require('./lib');
(async () => {
  const srv = await serve(), base = `http://localhost:${srv.address().port}/`;
  const browser = await chromium.launch();
  const A1 = await person(browser, base, 'alice@example.com', 'Alice Adams'), A2 = await person(browser, base, 'alice@example.com', 'Alice Adams');
  const B = await person(browser, base, 'bob@example.com', 'Bob Brown');
  global.__U = [A1, A2, B]; const step = s => console.log('• ' + s);
  const rfile = () => [...D.files.values()].find(f => f.appProperties.fth === 'research' && !f.trashed);
  const rdata = () => { const f = rfile(); if (!f) return null; const o = JSON.parse(f.revs.at(-1).content); return JSON.parse(o.data.hub_v2 || '{}'); };
  const S = async u => { const f = await H.frame(u, 'research'); return f.evaluate(() => S); };
  /* in the research hub: choose a role, then write a note on the first concept of the first domain */
  const note = async (u, text) => {
    const f = await H.frame(u, 'research');
    await f.evaluate(() => { setRole('cin'); location.hash = '#/0'; });
    await f.waitForSelector('.pri .item'); await f.click('.pri .item');
    await f.waitForSelector('textarea[placeholder^="In your own words. What clicked"]');
    await f.fill('textarea[placeholder^="In your own words. What clicked"]', text);
  };
  const noteOf = s => Object.values(s.n || {})[0] || '';

  step('Signed in, Alice opens My Research from its button beside My work; opening it changes nothing');
  await A1.page.goto(base); await H.signIn(A1);
  assert.equal(await A1.page.$$eval('.cardw[data-id=research]', l => l.length), 0, 'not a card on the home page');
  assert.equal(await A1.page.$eval('#meBtn', (m, r) => m.nextElementSibling === r, await A1.page.$('#researchBtn')), true, 'beside My work');
  await A1.page.click('#researchBtn'); await until(async () => !!(await H.frame(A1, 'research')), 'research opens');
  assert.equal(await A1.page.evaluate(() => location.hash), '#/tool/research');
  assert.equal(await A1.page.$eval('#researchBtn', b => b.getAttribute('aria-pressed')), 'true');
  assert.equal(await A1.page.$$eval('#tabs [data-tab=research]', l => l.length), 0, 'a page, not a tab');
  await new Promise(r => setTimeout(r, 5000));
  assert.equal(rfile(), undefined, 'just opening it sends nothing to Drive');

  step('She writes a note: it goes to a private research file in her Drive, not into the project');
  await note(A1, 'Inverse square: double the distance, quarter the light');
  await until(() => noteOf(rdata() || {}) === 'Inverse square: double the distance, quarter the light', 'research file on Drive');
  const rf = rfile();
  assert.equal(rf.owner, 'alice@example.com'); assert.deepEqual(rf.perms, [], 'nobody else can open it');
  assert(!Object.keys(await A1.page.evaluate(() => localStorage)).some(k => k.startsWith('fth:p:') && k.endsWith('hub_v2')), 'not filed under a project');

  step('She shares her project with Bob: the project file holds none of her research, and research is never locked');
  await H.open(A1, 'callsheet'); await H.save(A1);
  await A1.page.click('#shareBtn'); await A1.page.waitForSelector('#f-emails'); await A1.page.fill('#f-emails', 'bob@example.com'); await A1.page.click('[data-sa=add]');
  await until(async () => /Shared with 1 person/.test(await H.toast(A1)), 'shared');
  await A1.page.click('#dlg button[value=cancel]');
  const pf = [...D.files.values()].find(f => f.appProperties.fth === 'project');
  await A1.page.evaluate(() => { location.hash = '#/tool/research'; }); await H.act(A1, 'research');
  await H.open(A1, 'callsheet'); await H.act(A1, 'callsheet');
  await until(() => (pf.appProperties['lk.callsheet'] || '').includes('alice@'), 'Alice holds the call sheet');
  assert.equal(pf.appProperties['lk.research'], undefined, 'research is never locked');
  await A1.page.evaluate(() => { location.hash = '#/tool/research'; });
  assert.equal(await A1.page.evaluate(() => document.querySelector('#lockBar').hidden), true, 'no lock bar on research');
  assert.equal(await A1.page.$$eval('#barActions [data-act=conv]', b => b.length), 0, 'no crew Conversation on research');
  await H.save(A1);
  assert(!pf.revs.some(r => String(r.content).includes('quarter the light')), 'her note is not in the project file');

  step('Bob joins the shared project: his research is his own, and empty');
  await B.page.goto(base + '#/join/' + pf.id); await B.page.click('#dlg button[value=ok]');
  await until(async () => /Shared by Alice Adams/.test(await B.page.textContent('#projStrip')), 'Bob in');
  await H.open(B, 'research');
  assert.equal(noteOf(await S(B)), '', 'Bob does not see Alice’s note');

  step('On a second computer, Alice signs in and her research is there');
  await A2.page.goto(base); await H.signIn(A2);
  await H.open(A2, 'research');
  await until(async () => noteOf(await S(A2)) === 'Inverse square: double the distance, quarter the light', 'research on computer 2');

  step('A change on computer 2 reaches computer 1; the research is the same whichever project is open');
  await note(A2, 'Inverse square, checked with a meter');
  await until(() => noteOf(rdata() || {}) === 'Inverse square, checked with a meter', 'newer copy on Drive');
  await A1.page.click('#acctBtn'); await A1.page.click('#amenu [data-am=sync]');
  await until(async () => noteOf(await S(A1)) === 'Inverse square, checked with a meter', 'computer 1 caught up');
  await A1.page.evaluate(() => { location.hash = '#/'; });
  await A1.page.click('[data-pact=new]'); await A1.page.fill('#f-pname', 'Second film'); await A1.page.click('#dlg button[value=ok]');
  await until(async () => /Second film/.test(await A1.page.textContent('#projName')), 'second project');
  await H.open(A1, 'research');
  assert.equal(noteOf(await S(A1)), 'Inverse square, checked with a meter', 'same research in another project');

  step('Signing out and removing her work from computer 2 leaves an empty research space there; Drive keeps it');
  await A2.page.click('#acctBtn'); await A2.page.click('#amenu [data-am=signout]');
  await A2.page.click('#dlg button[value=ok]');
  await until(async () => !(await A2.page.evaluate(() => Object.keys(localStorage).some(k => k.startsWith('fth:me:alice@')))), 'removed from computer 2');
  assert.equal(noteOf(rdata()), 'Inverse square, checked with a meter', 'still on Drive');

  console.log('TEST 8 PASSED'); await browser.close(); srv.close();
})().catch(async e => { try { for (const u of (global.__U || [])) console.error(u.email, 'toast:', await H.toast(u), '| bar:', await H.bar(u), '| errors:', u.page.errors); } catch (x) {} console.error('FAILED:', e.message, '\n', e.stack.split('\n').slice(1, 4).join('\n')); process.exit(1); });
