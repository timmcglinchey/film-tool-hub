/* Pinned tools: pins stay in the top bar and follow the person between devices through Drive. */
const { chromium } = require('playwright');
const { D, serve, person } = require('./mock');
const { assert, until, H } = require('./lib');
(async () => {
  const srv = await serve(), base = `http://localhost:${srv.address().port}/`;
  const browser = await chromium.launch();
  const A1 = await person(browser, base, 'alice@example.com', 'Alice Adams'), A2 = await person(browser, base, 'alice@example.com', 'Alice Adams');
  const B = await person(browser, base, 'bob@example.com', 'Bob Brown');
  const step = s => console.log('• ' + s);
  const tabs = u => u.page.evaluate(() => [...document.querySelectorAll('#tabs .tab')].map(b => b.dataset.tab + (b.classList.contains('pinned') ? '*' : '') + (b.classList.contains('idle') ? '-' : '')).join(' '));
  const settings = () => { const f = [...D.files.values()].find(f => f.appProperties.fth === 'settings' && !f.trashed); return f ? JSON.parse(f.revs[f.revs.length - 1].content).pins.join(' ') : null; };
  const sync = async u => { await u.page.click('#acctBtn'); await u.page.click('#amenu [data-am=sync]'); };

  step('Before signing in, Alice pins a tool from its card: it sits in the bar without being opened');
  await A1.page.goto(base);
  await A1.page.click('.cardw[data-id=shotlist] .pinb');
  assert.equal(await tabs(A1), 'shotlist*-');
  assert.equal(await A1.page.getAttribute('.cardw[data-id=shotlist] .pinb', 'aria-pressed'), 'true');
  assert.equal(await A1.page.$$eval('#workspace iframe', f => f.length), 0, 'a pinned tool is not loaded until it is clicked');

  step('She signs in: the pin goes to her Drive');
  await H.signIn(A1);
  await until(() => settings() === 'shotlist', 'settings file on Drive');
  assert.equal(await tabs(A1), 'shotlist*-');

  step('She opens another tool and pins its tab; pinned tabs come first, open ones after');
  await H.open(A1, 'risk'); await H.open(A1, 'callsheet');
  assert.equal(await tabs(A1), 'shotlist*- risk callsheet');
  await A1.page.click('#tabs [data-tab=callsheet] .pin');
  assert.equal(await tabs(A1), 'shotlist*- callsheet* risk');
  assert.equal(await A1.page.$$eval('#tabs [data-tab=callsheet] .x', x => x.length), 0, 'a pinned tab has no close button');
  await until(() => settings() === 'shotlist callsheet', 'both pins on Drive');

  step('On a second device her pins appear after sign-in, and a pinned tab opens its tool');
  await A2.page.goto(base);
  assert.equal(await tabs(A2), '');
  await H.signIn(A2);
  await until(async () => await tabs(A2) === 'shotlist*- callsheet*-', 'pins on device 2');
  await A2.page.click('#tabs [data-tab=shotlist]');
  await until(async () => await tabs(A2) === 'shotlist* callsheet*-', 'pinned tool opened');
  await until(async () => { const f = await H.frame(A2, 'shotlist'); return f && f.evaluate(() => !!window.fthStore); }, 'shot list loaded');

  step('Unpinning on device 2 reaches device 1; the open tool stays open as a normal tab');
  await A2.page.click('#tabs [data-tab=shotlist] .pin');
  assert.equal(await tabs(A2), 'callsheet*- shotlist');
  await until(() => settings() === 'callsheet', 'unpin on Drive');
  await sync(A1);
  await until(async () => await tabs(A1) === 'callsheet* risk', 'device 1 caught up');

  step('A pin made on device 2 before signing in there would have been added, not replaced (join)');
  await A2.page.evaluate(() => { const s = JSON.parse(localStorage.getItem('filmtoolhub-pins')); s[''] = {ids: ['risk'], at: 1}; localStorage.setItem('filmtoolhub-pins', JSON.stringify(s)); localStorage.removeItem('filmtoolhub-account'); });
  await A2.page.evaluate(() => { location.hash = '#/'; }); await A2.page.reload(); await until(async () => await tabs(A2) === 'risk*-', 'signed-out pin shown');
  await H.signIn(A2);
  await until(() => settings() === 'callsheet risk', 'joined pins on Drive');
  assert.equal(await tabs(A2), 'callsheet*- risk*-');

  step('Pins are remembered on reload, before Drive is reconnected');
  await A2.page.reload(); await A2.page.waitForSelector('#tabs .tab');
  assert.equal(await tabs(A2), 'callsheet*- risk*-');

  step('Someone else has their own pins');
  await B.page.goto(base); await H.signIn(B);
  assert.equal(await tabs(B), '');
  assert.equal([...D.files.values()].filter(f => f.appProperties.fth === 'settings').length, 1, 'no settings file until there is something to keep');
  assert.equal([...D.files.values()].filter(f => f.appProperties.fth === 'root').length, 2, 'one Film Tool Hub folder each');

  for (const u of [A1, A2, B]) assert.deepEqual(u.page.errors, [], u.email + ' page errors');
  console.log('test4 passed'); await browser.close(); srv.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
