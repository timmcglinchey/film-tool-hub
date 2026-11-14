const { chromium } = require('playwright');
const { D, serve, person } = require('./mock');
const { assert, sleep, until, H } = require('./lib');
const fs = require('fs');
(async () => {
  const srv = await serve(), base = `http://localhost:${srv.address().port}/`;
  const browser = await chromium.launch();
  const A = await person(browser, base, 'alice@example.com', 'Alice Adams'), B = await person(browser, base, 'bob@example.com', 'Bob Brown');
  global.__U = [A, B];
  const ids = JSON.parse(fs.readFileSync(require('path').resolve(__dirname, '..', '..', 'tools', 'tools.json'))).tools.map(t => t.id);
  await A.page.goto(base); await H.signIn(A);
  // baseline: every tool in an ordinary project
  const errs = {};
  for (const id of ids) { A.page.errors.length = 0; await H.open(A, id); await sleep(500); errs[id] = [...A.page.errors]; }
  console.log('• ordinary project, tools with errors:', JSON.stringify(Object.fromEntries(Object.entries(errs).filter(e => e[1].length))));
  await H.save(A);
  const pf = [...D.files.values()].find(f => f.appProperties.fth === 'project');
  // an ordinary project on a second computer still loads, and a newer save is still picked up the old way
  const A2 = await person(browser, base, 'alice@example.com', 'Alice Adams'); await A2.page.goto(base); await H.signIn(A2);
  /* wait for the project to finish arriving from Drive: it reloads the tools when it lands */
  await until(async () => /On Google Drive/.test(await A2.page.textContent('#projStrip')) && !(await A2.page.evaluate(() => document.querySelector('#acctBtn').classList.contains('busy'))), 'second computer has the project');
  await H.open(A2, 'callsheet'); await H.set(A2, 'callsheet', 'cs', 'from-second'); await sleep(3500); await H.save(A2);
  await A.page.click('#acctBtn'); await A.page.click('[data-am=sync]');
  await until(async () => { const b = await A.page.$('#dlg[open] button[value=ok]'); if (b) await b.click(); return (await H.get(A, 'callsheet', 'cs')) === 'from-second'; }, 'ordinary sync between two computers');
  console.log('• ordinary (unshared) project still syncs between two computers');
  await A2.ctx.close();
  await A.page.evaluate(() => { location.hash = '#/'; });
  await A.page.click('[data-pact=share]'); await A.page.waitForSelector('#f-emails'); await A.page.fill('#f-emails', 'bob@example.com'); await A.page.click('[data-sa=add]');
  await until(async () => /Shared with 1 person/.test(await H.toast(A)), 'shared');
  await A.page.screenshot({ path: require('path').join(require('os').tmpdir(), 'fth-shot-') + 'share-dialog.png' });
  await A.page.click('#dlg button[value=cancel]');
  // Alice holds everything (all tabs are open and recently used)
  await A.page.evaluate(() => { location.hash = '#/tool/callsheet'; });
  /* the Task Board is a page, not a tab: it closes when she moves on, so she holds every other tool */
  const kept = ids.filter(id => id !== 'tasks');
  for (const id of kept) await H.act(A, id);
  await until(() => kept.every(id => (pf.appProperties['lk.' + id] || '').includes('alice@')), 'Alice holds every tool but the Task Board');
  console.log('• one person can hold all 21 tools at once (within Drive’s note limits):', Object.keys(pf.appProperties).length, 'notes');
  await B.page.goto(base + '#/join/' + pf.id); await B.page.waitForSelector('#dlg[open]');
  await B.page.screenshot({ path: require('path').join(require('os').tmpdir(), 'fth-shot-') + 'join.png' });
  await B.page.click('#dlg button[value=ok]');
  await until(async () => /Shared by Alice Adams/.test(await B.page.textContent('#projStrip')), 'Bob in');
  const bad = {};
  for (const id of ids) {
    B.page.errors.length = 0; await H.open(B, id); await sleep(500);
    const f = await H.frame(B, id);
    const ro = await f.evaluate(() => { localStorage.setItem('__probe', '1'); return localStorage.getItem('__probe') === null; });
    assert(ro, id + ' is view-only for Bob');
    const extra = B.page.errors.filter(e => !errs[id].includes(e)); if (extra.length) bad[id] = extra;
  }
  console.log('• all 21 tools open view-only; tools with NEW errors when view-only:', JSON.stringify(bad));
  await until(async () => /Alice Adams is editing/.test(await H.bar(B)), 'bar');
  await B.page.screenshot({ path: require('path').join(require('os').tmpdir(), 'fth-shot-') + 'viewonly.png' });
  await B.page.click('[data-lk=request]'); await A.page.waitForSelector('#reqCard:not([hidden])');
  await A.page.screenshot({ path: require('path').join(require('os').tmpdir(), 'fth-shot-') + 'request.png' });
  await A.page.click('#themeBtn'); await sleep(300); await A.page.screenshot({ path: require('path').join(require('os').tmpdir(), 'fth-shot-') + 'request-light.png' });
  await A.page.click('[data-rq=yes]');
  await H.editing(B, ids.at(-1));
  await B.page.evaluate(() => { location.hash = '#/'; }); await sleep(300);
  await B.page.click('#projBtn'); await B.page.screenshot({ path: require('path').join(require('os').tmpdir(), 'fth-shot-') + 'menu.png' }); await B.page.keyboard.press('Escape');
  await B.page.click('[data-pact=manage]'); await B.page.screenshot({ path: require('path').join(require('os').tmpdir(), 'fth-shot-') + 'manage.png' }); await B.page.click('#dlg button[value=cancel]');
  // a tool in a separate tab is view-only in a shared project
  const solo = await B.ctx.newPage(); await solo.goto(base + '#/solo/callsheet'); await solo.waitForFunction(() => !!window.fthStore && document.body && /view-only/.test(document.body.textContent));
  assert(await solo.evaluate(() => { localStorage.setItem('__p', '1'); return localStorage.getItem('__p') === null && /view-only/.test(document.body.textContent); }), 'separate tab is view-only with a notice');
  console.log('• a tool opened in its own browser tab is view-only in a shared project');
  // narrow screen
  await B.page.setViewportSize({ width: 700, height: 800 }); await H.open(B, 'callsheet'); await sleep(400); await B.page.screenshot({ path: require('path').join(require('os').tmpdir(), 'fth-shot-') + 'narrow.png' });
  for (const u of [A]) assert.deepEqual(u.page.errors.filter(e => !Object.values(errs).flat().includes(e)), [], u.email + ' page errors');
  console.log('TEST 3 PASSED'); await browser.close(); srv.close();
})().catch(async e => { try { for (const u of (global.__U || [])) console.error(u.email, 'toast:', await H.toast(u), '| bar:', await H.bar(u), '| errors:', u.page.errors); } catch (x) {} console.error('FAILED:', e.message, '\n', e.stack.split('\n').slice(1, 4).join('\n')); process.exit(1); });
