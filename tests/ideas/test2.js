/* Ideas follow their owner: signed-out ideas become the person's on sign-in, they travel in the private Drive file
   with My Research, and a second computer sees them. Run: node tests/ideas/test2.js */
const { chromium } = require('playwright');
const { D, serve, person } = require('../sharing/mock');
const { assert, until, sleep, H } = require('../sharing/lib');
(async () => {
  const srv = await serve(), base = `http://localhost:${srv.address().port}/`;
  const browser = await chromium.launch();
  const A1 = await person(browser, base, 'alice@example.com', 'Alice Adams'), A2 = await person(browser, base, 'alice@example.com', 'Alice Adams');
  global.__U = [A1, A2]; const step = s => console.log('• ' + s);
  const rfile = () => [...D.files.values()].find(f => f.appProperties.fth === 'research' && !f.trashed);
  const rdata = () => { const f = rfile(); return f ? JSON.parse(f.revs.at(-1).content).data : null; };
  const ideasF = u => H.frame(u, 'ideas');
  const capture = async (u, text) => { const f = await ideasF(u); await f.fill('#cap', text); await f.click('#saveBtn'); await f.waitForSelector('#parkBtn'); await f.click('#parkBtn'); };

  step('Signed out, Alice catches an idea; signing in makes it hers, and it goes to her private Drive file');
  await A1.page.goto(base); await until(() => A1.page.evaluate(() => !document.querySelector('#ideasBtn').hidden), 'button');
  await A1.page.click('#ideasBtn'); await until(async () => { const f = await ideasF(A1); return f && f.$('#cap'); }, 'page');
  await capture(A1, 'A ghost who haunts a self-storage unit');
  await H.signIn(A1);
  await until(() => A1.page.evaluate(() => Object.keys(localStorage).some(k => k === 'fth:me:alice@example.com:fth-ideas-v1')), 'adopted');
  await until(() => { const d = rdata(); return d && /self-storage/.test(d['fth-ideas-v1'] || ''); }, 'ideas on Drive');

  step('She develops it: the workspace’s saved work travels in the same file');
  const id = JSON.parse(rdata()['fth-ideas-v1']).ideas[0].id;
  await A1.page.evaluate(id => window.__fthHub.ideas.open(id, 'logline'), id);
  await until(async () => { const d = await H.frame(A1, 'idea-dev'); return d && d.$('#dev-logline textarea'); }, 'workspace');
  const d = await H.frame(A1, 'idea-dev');
  await d.evaluate(() => { const t = [...document.querySelectorAll('#dev-synopsis textarea')][0]; t.value = 'The ghost wants to be evicted.'; t.dispatchEvent(new Event('input', {bubbles: true})); });
  await until(() => { const r = rdata(); return r && Object.entries(r).some(([k, v]) => k.startsWith('idea:' + id + ':scaffold-script:p:') && /wants to be evicted/.test(v)); }, 'synopsis on Drive');

  step('On a second computer the idea and its work are there');
  await A2.page.goto(base); await H.signIn(A2);
  await A2.page.click('#ideasBtn');
  await until(async () => { const f = await ideasF(A2); return f && await f.evaluate(() => /self-storage/.test(document.body.innerText)); }, 'idea on computer 2');
  const f2 = await ideasF(A2);
  await f2.click('.recent .card'); await f2.waitForSelector('.drawer');
  assert.match(await f2.$eval('.drawer textarea', t => t.value), /self-storage/);
  assert.deepEqual([...A1.page.errors, ...A2.page.errors], []);
  console.log('TEST IDEAS 2 PASSED');
  await browser.close(); srv.close(); process.exit(0);
})().catch(async e => { console.error(e); for (const u of global.__U || []) if (u.page.errors.length) console.error(u.email, u.page.errors); process.exit(1); });
