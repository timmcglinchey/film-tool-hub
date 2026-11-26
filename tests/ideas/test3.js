/* Ideas: Free Outlining in an idea's workspace. Beats typed in Outline › Free Outlining, copied into a structure by drag,
   count as outline work on the Ideas page. Run: node tests/ideas/test3.js (needs Playwright, like tests/sharing). */
const { chromium } = require('playwright');
const { serve, person } = require('../sharing/mock');
const { assert, until, sleep, H } = require('../sharing/lib');
(async () => {
  const srv = await serve(), base = `http://localhost:${srv.address().port}/`;
  const browser = await chromium.launch();
  const A = await person(browser, base, 'alice@example.com', 'Alice Adams'); global.__U = [A];
  const pg = A.page; await pg.setViewportSize({width:1400, height:1000});
  const ideasF = () => H.frame(A, 'ideas'), devF = () => H.frame(A, 'idea-dev');
  await pg.goto(base); await until(() => pg.evaluate(() => !document.querySelector('#ideasBtn').hidden), 'ideas button');
  await pg.click('#ideasBtn');
  await until(async () => { const f = await ideasF(); return f && await f.$('#cap'); }, 'capture');
  let f = await ideasF();
  await f.fill('#cap', 'A lighthouse keeper who is scared of the dark'); await f.press('#cap', 'Control+Enter');
  await f.waitForSelector('.next .way');
  await f.click('.way[data-way=outline]');
  let d; await until(async () => { d = await devF(); return d && await d.evaluate(() => document.querySelector('.tab.on') && document.querySelector('.tab.on').dataset.tab === 'outline' && !!document.querySelector('[data-struct=free]')); }, 'outline open');
  await d.click('[data-struct=free]'); await d.waitForSelector('.fb-add textarea');
  await d.click('.fb-add textarea'); await pg.keyboard.type('Mara finds the lamp dark'); await pg.keyboard.press('Enter');
  await pg.keyboard.type('She climbs alone'); await pg.keyboard.press('Enter');
  await d.click('[data-target=three]');
  await d.locator('.fb-grip[draggable]').nth(0).dragTo(d.locator('.fz[data-beat=inc]'));
  await until(() => d.$$eval('.fb-chip', l => l.length === 1), 'placed');
  await sleep(800);
  await d.click('.idea-back'); await until(() => pg.evaluate(() => location.hash === '#/tool/ideas'), 'back');
  f = await ideasF(); await f.waitForSelector('.recent .card');
  const marks = await f.$eval('.recent .card', e => e.textContent);
  console.log('marks:', marks);
  assert.match(marks, /Outline/);
  console.log('IDEAS FREE OUTLINE PASSED');
  await browser.close(); srv.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
