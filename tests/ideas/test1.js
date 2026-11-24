/* Ideas: catch an idea (typed or spoken), grow it in the Script Development Tool, branch it, and graduate it
   into a project. Run: node tests/ideas/test1.js (needs Playwright, like tests/sharing). */
const { chromium } = require('playwright');
const { D, serve, person } = require('../sharing/mock');
const { assert, until, sleep, H } = require('../sharing/lib');
(async () => {
  const srv = await serve(), base = `http://localhost:${srv.address().port}/`;
  const browser = await chromium.launch({args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']});
  const A = await person(browser, base, 'alice@example.com', 'Alice Adams');
  global.__U = [A]; const step = s => console.log('• ' + s);
  const pg = A.page;
  const ideasF = () => H.frame(A, 'ideas'), devF = () => H.frame(A, 'idea-dev');
  const ideas = async () => (await ideasF()).evaluate(() => JSON.parse(localStorage.getItem('fth-ideas-v1') || '{"ideas":[]}').ideas);
  const meKeys = () => pg.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('fth:me:')));
  /* the Script Development Tool's saved project for an idea (signed out, so the person's space is "fth:me::") */
  const sd = id => pg.evaluate(id => { const pre = 'fth:me::idea:' + id + ':scaffold-script:', l = localStorage.getItem(pre + 'last'); return l ? JSON.parse(localStorage.getItem(pre + 'p:' + l)) : null; }, id);
  const sdEdit = (id, fn) => pg.evaluate(([id, fn]) => { const pre = 'fth:me::idea:' + id + ':scaffold-script:', l = localStorage.getItem(pre + 'last'), o = JSON.parse(localStorage.getItem(pre + 'p:' + l)); new Function('S', fn)(o); localStorage.setItem(pre + 'p:' + l, JSON.stringify(o)); }, [id, fn]);
  const devReady = async () => { const d = await devF(); return d && await d.evaluate(() => !!window.__fthIdea && !!document.querySelector('#dev-idea, .wgrid, .outline, #view > *')); };

  step('The Ideas button sits beside My Research and opens a minimal page: just "Tell me your idea" and the mic');
  await pg.goto(base); await until(() => pg.evaluate(() => !document.querySelector('#ideasBtn').hidden), 'ideas button');
  assert.equal(await pg.$eval('#researchBtn', (r, b) => r.nextElementSibling === b, await pg.$('#ideasBtn')), true);
  assert.equal(await pg.$$eval('.cardw[data-id=ideas], .cardw[data-id=idea-dev]', l => l.length), 0, 'not cards on the home page');
  await pg.click('#ideasBtn');
  await until(async () => { const f = await ideasF(); return f && await f.$('#cap'); }, 'capture box');
  let f = await ideasF();
  assert.match(await f.$eval('.cap h1', e => e.textContent), /Tell me your idea/);
  assert.ok(await f.$('#micBtn'), 'mic button');
  assert.equal((await meKeys()).length, 0, 'opening the page saves nothing');

  step('Typing an idea and pressing Ctrl+Enter saves it and asks what to do with it');
  await f.fill('#cap', 'A lighthouse keeper who is scared of the dark\nShe has to keep the light on through one long winter.');
  await f.press('#cap', 'Control+Enter');
  await f.waitForSelector('.next .way');
  assert.equal(await f.$$eval('.next .ways:not(.more .ways) > .way', l => l.length), 6, 'six ways in');
  let list = await ideas(); assert.equal(list.length, 1); assert.equal(list[0].status, 'seed');
  const id1 = list[0].id;

  step('"Write a character bio" opens the Script Development Tool on Characters, with the idea already in it');
  await f.click('.way[data-way=characters]');
  await until(devReady, 'workspace open');
  assert.equal(await pg.evaluate(() => location.hash), '#/tool/idea-dev');
  let d = await devF();
  assert.equal(await d.$eval('.tab.on', e => e.dataset.tab), 'develop');
  assert.equal(await d.evaluate(() => window.__fthIdea.id), id1);
  await until(async () => /lighthouse keeper/.test(((await sd(id1)) || {develop: {}}).develop.idea || ''), 'idea seeded');
  await until(() => d.evaluate(() => document.activeElement && !!document.activeElement.closest('#dev-characters')), 'focus in characters');
  assert.equal((await ideas())[0].status, 'developing', 'opening a way in makes it Developing');
  assert.equal(await pg.$eval('#ideasBtn', b => b.classList.contains('on')), true, 'Ideas button lit in the workspace');
  assert.equal(await d.$$eval('.idea-back, .grad-btn', l => l.length), 2, 'Back to Ideas and Graduate');
  const nsKey = await pg.evaluate(id => Object.keys(localStorage).find(k => k.startsWith('fth:me::idea:' + id + ':scaffold-script:p:')), id1);
  assert.ok(nsKey, 'filed in the idea’s own space');

  step('Work in the workspace: a character, a logline and a scene');
  await d.fill('#dev-characters .cards input', 'MARA');
  await until(async () => (await sd(id1)).develop.characters[0].name === 'MARA', 'character saved');
  await sleep(500);
  await sdEdit(id1, "S.develop.logline = 'A lighthouse keeper afraid of the dark must keep the light burning all winter.'; S.script.text = 'INT. LIGHTHOUSE - NIGHT\\n\\nMara climbs.';");
  await pg.evaluate(id => window.__fthHub.ideas.open(id, 'write'), id1);
  await until(async () => { d = await devF(); return d && await d.evaluate(() => document.querySelector('.tab.on') && document.querySelector('.tab.on').dataset.tab === 'write'); }, 'opens on Write when asked');
  await d.click('.top-actions .btn:has-text("History")'); await d.waitForSelector('.modal');
  await d.click('.modal .btn.primary:has-text("snapshot")');
  await until(() => d.$$eval('.modal .plist .pi', l => l.length >= 1), 'history has a snapshot');
  await d.click('.modal .mf .btn');
  await d.click('#sideBtn'); await d.waitForSelector('#ideaSide .side-item.cur');
  assert.match(await d.$eval('#ideaSide .side-item.cur', e => e.textContent), /lighthouse keeper/i);

  step('Back on the Ideas page, the card shows its progress');
  await d.click('.idea-back'); await until(() => pg.evaluate(() => location.hash === '#/tool/ideas'), 'back');
  f = await ideasF(); await f.waitForSelector('.recent .card');
  const marks = await f.$eval('.recent .card', e => e.textContent);
  assert.match(marks, /Logline/); assert.match(marks, /1 character/); assert.match(marks, /Scene/); assert.match(marks, /Developing/i);

  step('A second idea, parked; then the full backlog with search, statuses, tags and a group');
  await f.fill('#cap', 'Heist film where the thieves are pensioners'); await f.click('#saveBtn');
  await f.waitForSelector('#parkBtn'); await f.click('#parkBtn'); await f.waitForSelector('#cap');
  await f.click('.rhead .link'); await f.waitForSelector('.grid .card');
  assert.equal(await f.$$eval('.grid .card', l => l.length), 2);
  await f.fill('input[type=search]', 'heist'); await until(() => f.$$eval('.grid .card', l => l.length === 1), 'search');
  await f.fill('input[type=search]', ''); await until(() => f.$$eval('.grid .card', l => l.length === 2), 'search cleared');
  await f.click('.grid .card:has-text("Heist")'); await f.waitForSelector('.drawer .tagin input');
  await f.fill('.tagin input', 'Comedy'); await f.press('.tagin input', 'Enter');
  await until(async () => (await ideas()).find(i => /Heist/.test(i.text)).tags.includes('Comedy'), 'tag saved');
  await f.selectOption('.drawer select[aria-label=Status]', 'shelved');
  await until(async () => (await ideas()).find(i => /Heist/.test(i.text)).status === 'shelved', 'shelved');
  await f.click('.drawer .dhead [aria-label=Close]');
  await until(() => f.$$eval('.grid .card', l => l.length === 1), 'shelved idea hidden from In progress');
  await f.click('.chip:has-text("Shelved")'); await until(() => f.$$eval('.grid .card', l => l.length === 1 && /Heist/.test(l[0].textContent)), 'shelved filter');

  step('Branch the lighthouse idea with only its characters: a new idea, linked, and the original unchanged');
  await f.click('.chip:has-text("Everything")');
  await f.click('.grid .card:has-text("lighthouse")'); await f.waitForSelector('.drawer');
  await f.click('.drawer button:has-text("Branch")'); await f.waitForSelector('.dlg .checks');
  await f.fill('.dlg input.fth-input', 'Mara, but in space');
  for (const v of ['premise', 'theme', 'world', 'notes', 'outline', 'script']) await f.uncheck(`.dlg input[value=${v}]`);
  await f.click('.dlg .primary');
  await until(async () => (await ideas()).length === 3, 'branched');
  list = await ideas(); const br = list.find(i => i.title === 'Mara, but in space');
  assert.equal(br.from.id, id1);
  const brSd = await (await ideasF()).evaluate(id => { const l = localStorage.getItem('idea:' + id + ':scaffold-script:last'); return JSON.parse(localStorage.getItem('idea:' + id + ':scaffold-script:p:' + l)); }, br.id);
  assert.equal(brSd.develop.characters[0].name, 'MARA'); assert.equal(brSd.develop.logline, ''); assert.equal(brSd.develop.idea, ''); assert.ok(!brSd.script);
  f = await ideasF();
  assert.match(await f.$eval('.drawer', e => e.textContent), /Branched from/);
  const orig = await f.evaluate(id => { const l = localStorage.getItem('idea:' + id + ':scaffold-script:last'); return JSON.parse(localStorage.getItem('idea:' + id + ':scaffold-script:p:' + l)); }, id1);
  assert.match(orig.develop.logline, /lighthouse/, 'original unchanged');
  await f.click('.drawer .dhead [aria-label=Close]');

  step('A voice note: one minute at most, with a countdown; stopping saves the idea and its recording');
  await f.click('.fth-head button:has-text("New idea")'); await f.waitForSelector('#micBtn');
  await f.click('#micBtn'); await until(() => f.$eval('#micBtn', b => b.classList.contains('rec')), 'recording');
  await sleep(1500);
  assert.match(await f.$eval('#recLine', e => e.textContent), /0:5\d left/);
  await f.click('#micBtn'); await f.waitForSelector('.next .way', {timeout: 8000});
  list = await ideas(); const v = list.find(i => i.audio);
  assert.ok(v && v.audio.dur > 1, 'voice note kept');
  const clip = await f.evaluate(id => new Promise(r => { const q = indexedDB.open('fth-ideas-audio', 1); q.onsuccess = () => { const g = q.result.transaction('clips').objectStore('clips').get(id); g.onsuccess = () => r(g.result && g.result.blob.size); }; }), v.id);
  assert.ok(clip > 0, 'recording stored');
  await f.click('#parkBtn');

  step('The mood board opens at the foot of Develop, filed with the idea');
  await f.click('.fth-head button:has-text("All ideas")'); await f.click('.chip:has-text("Everything")');
  await f.click(`.grid .card[data-id="${id1}"]`); await f.waitForSelector('.drawer');
  await f.click('.drawer .waysm [data-way=mood]');   /* the "Mood board" way in opens it straight away */
  await until(async () => { d = await devF(); return d && await d.evaluate(id => window.__fthIdea.id === id && document.querySelector('#dev-mood'), id1); }, 'workspace again');
  await until(async () => { const h = await d.$('#dev-mood iframe'); const mf = h && await h.contentFrame(); return mf && await mf.evaluate(() => !!window.fthStore && document.readyState === 'complete'); }, 'mood board loaded');
  const mf = await (await d.$('#dev-mood iframe')).contentFrame();
  await mf.evaluate(() => window.fthStore.set('test-mark', 'moody'));
  const dbs = await pg.evaluate(() => indexedDB.databases().then(l => l.map(x => x.name)));
  assert.ok(dbs.includes('fth:me::idea:' + id1 + ':fth-tool-data'), 'mood board filed in the idea’s space: ' + dbs.join(', '));

  step('Graduate: a new project with the script open on Write; the idea’s space moves into it');
  await d.click('.grad-btn'); await d.waitForSelector('.modal');
  await d.fill('.modal input.inp', 'The Keeper');
  await d.click('.modal .btn.primary');
  await until(() => pg.evaluate(() => location.hash === '#/tool/script-dev'), 'project’s script open');
  await until(async () => { const s = await H.frame(A, 'script-dev'); return s && await s.evaluate(() => document.querySelector('.tab.on') && document.querySelector('.tab.on').dataset.tab === 'write' && /Mara climbs/.test(document.body.innerText)); }, 'script on Write');
  assert.equal(await pg.$eval('#projName', e => e.textContent), 'The Keeper');
  assert.equal((await pg.evaluate(id => Object.keys(localStorage).filter(k => k.startsWith('fth:me::idea:' + id + ':')), id1)).length, 0, 'nothing left in the idea’s space');
  const pdb = await pg.evaluate(() => indexedDB.databases().then(l => l.map(x => x.name)));
  assert.ok(!pdb.includes('fth:me::idea:' + id1 + ':fth-tool-data'), 'mood board moved');
  const sdp = await H.frame(A, 'script-dev');
  const mood = await pg.evaluate(() => new Promise(r => { const p = localStorage.getItem('fth-current-project'); const q = indexedDB.open('fth:p:' + p + ':fth-tool-data'); q.onsuccess = () => { const g = q.result.transaction('kv').objectStore('kv').get('moodboard:test-mark'); g.onsuccess = () => r(g.result); }; }));
  assert.equal(mood, 'moody', 'the mood board came along');
  assert.ok(await pg.evaluate(() => Object.keys(localStorage).some(k => k.startsWith('fth:p:' + localStorage.getItem('fth-current-project') + ':scaffold-script:snaps:'))), 'its history came along');
  assert.equal(await pg.evaluate(() => !!document.querySelector('#workspace iframe[data-tool="idea-dev"]')), false, 'workspace closed');

  step('The idea stays on the Ideas page, marked Graduated; archiving the project shows "Graduated, then archived"');
  await pg.click('#ideasBtn'); f = await ideasF();
  list = await ideas(); const g = list.find(i => i.id === id1);
  assert.equal(g.status, 'graduated'); assert.equal(g.project.name, 'The Keeper');
  await f.click('.fth-head button:has-text("All ideas")'); await f.click('.chip:has-text("Graduated")');
  await until(() => f.$$eval('.grid .card', l => l.length === 1 && /Graduated/.test(l[0].textContent)), 'graduated card');
  const pid = g.project.id;
  assert.deepEqual(await pg.evaluate(pid => window.__fthHub.ideas.project(pid), pid), {name: 'The Keeper', archived: false});
  await pg.click('#projBtn'); await pg.click('[data-pm=manage]');
  await pg.click(`[data-pa="archive"][data-id="${pid}"]`);
  await until(() => pg.evaluate(pid => window.__fthHub.ideas.project(pid).archived, pid), 'archived');
  await until(() => pg.$('#dlg[open] button[value=cancel]'), 'dialog back'); await pg.click('#dlg[open] button[value=cancel]');
  await pg.evaluate(() => { location.hash = '#/tool/ideas'; }); f = await ideasF(); await f.evaluate(() => window.ideasRefresh());
  await until(() => f.$$eval('.card', l => l.some(c => /Graduated, then archived/.test(c.textContent))), 'archived label');
  step('Opening it offers to restore the project, then opens its script');
  await f.click('.card:has-text("Graduated, then archived")'); await f.waitForSelector('.drawer .proj button');
  await f.click('.drawer .proj button'); await f.waitForSelector('.dlg .primary'); await f.click('.dlg .primary');
  await until(() => pg.evaluate(() => location.hash === '#/tool/script-dev'), 'project opened');
  assert.deepEqual(await pg.evaluate(pid => window.__fthHub.ideas.project(pid), pid), {name: 'The Keeper', archived: false});
  assert.deepEqual(A.page.errors, [], 'no page errors');
  console.log('TEST IDEAS 1 PASSED');
  await browser.close(); srv.close(); process.exit(0);
})().catch(async e => { console.error(e); for (const u of global.__U || []) if (u.page.errors.length) console.error(u.email, u.page.errors); process.exit(1); });
