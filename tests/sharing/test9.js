/* My work's red notification dots: a mention, a new comment in a conversation I'm part of, and a task given to me. */
const { chromium } = require('playwright');
const { D, serve, person } = require('./mock');
const { assert, sleep, until, H } = require('./lib');
(async () => {
  const srv = await serve(), base = `http://localhost:${srv.address().port}/`;
  const browser = await chromium.launch();
  const A = await person(browser, base, 'alice@example.com', 'Alice Adams'), B = await person(browser, base, 'bob@example.com', 'Bob Brown');
  global.__U = [A, B]; const step = s => console.log('• ' + s);
  const me = u => u.page.evaluate(() => { const b = document.querySelector('#meBtn'), g = b.querySelector('.badge'); return {n: g.hidden ? '' : g.textContent, red: b.classList.contains('notify') && getComputedStyle(g).backgroundColor, title: b.title}; });
  const post = async (u, tool, text, tag) => {
    await H.open(u, tool); await u.page.click('[data-act=conv]'); await u.page.waitForSelector('#convPanel:not([hidden])');
    if (tag) await u.page.click(`#cvTo .cv-chip[data-cvto="${tag}"]`);
    await u.page.fill('#cvText', text); await u.page.press('#cvText', 'Enter');
    await u.page.click('#convPanel [data-cv=close]');
  };
  await A.page.goto(base); await H.signIn(A);
  await H.open(A, 'shotlist'); await H.set(A, 'shotlist', 'sl', 'x'); await H.save(A);
  const pf = [...D.files.values()].find(f => f.appProperties.fth === 'project');
  await A.page.click('#shareBtn'); await A.page.waitForSelector('#f-emails');
  await A.page.fill('#crewRows .crewrow .cn', 'Bobby'); await A.page.fill('#f-emails', 'bob@example.com');
  await A.page.click('[data-sa=add]'); await until(async () => /Shared with 1 person/.test(await H.toast(A)), 'shared');
  await A.page.click('#dlg button[value=cancel]');
  await B.page.goto(base + '#/join/' + pf.id); await B.page.click('#dlg button[value=ok]');
  await until(async () => /Shared by Alice Adams/.test(await B.page.textContent('#projStrip')), 'Bob in');
  await A.page.click('#tabs [data-close=shotlist]');
  assert.equal((await me(A)).n, '', 'nothing to start with');

  step('Mentioned: Bob tags Alice in the Call Sheet: a red dot on My work');
  await post(B, 'callsheet', 'Can you check the call time?', 'alice@example.com');
  await until(async () => (await me(A)).n === '1', 'Alice badge 1');
  const r = await me(A); assert.equal(r.red, 'rgb(229, 72, 77)', 'the badge is red'); assert(/1 mention/.test(r.title), r.title);

  step('A conversation Alice is part of: she wrote in the Shot List one; Bob adds a comment that doesn’t tag her');
  await post(A, 'shotlist', 'Lens list, anyone?');
  await post(B, 'shotlist', 'I’ll do it tonight', '');
  await until(async () => (await me(A)).n === '2', 'Alice badge 2');
  assert(/1 new comment in your conversations/.test((await me(A)).title));
  await until(async () => /added a comment to .*a conversation you’re in/.test(await H.toast(A)), 'toast');

  step('A conversation Alice isn’t part of doesn’t count: Bob writes in the Risk Assessment one');
  await post(B, 'risk', 'Note to self: ladders', '');
  await sleep(2500); assert.equal((await me(A)).n, '2', 'still 2');

  step('A task: Bob gives Alice a task on the Task Board');
  await H.open(B, 'tasks'); await H.act(B, 'tasks'); await H.editing(B, 'tasks');
  const f = await H.frame(B, 'tasks'); await f.evaluate(() => openTask());
  await f.fill('#fTitle', 'Scout the car park'); await f.click('#whoBtn');
  await f.evaluate(() => [...document.querySelectorAll('#whoList .tb-who-row')].find(r => /Alice/.test(r.textContent)).querySelector('input').click());
  await f.evaluate(() => document.querySelector('#taskForm').requestSubmit());
  await until(async () => (await f.evaluate(() => JSON.stringify(data.tasks.map(t => t.who)))) === '[["Alice Adams"]]', 'task given to Alice');
  await sleep(1500); await H.save(B);
  await until(async () => (await me(A)).n === '3', 'Alice badge 3');
  assert(/1 new task for you/.test((await me(A)).title));
  assert.equal((await me(B)).n, '', 'Bob gave the task, so nothing for him');

  step('On My work every one has its red dot; the task is seen at once, the comments when their conversation is opened');
  await A.page.evaluate(() => { location.hash = '#/me'; }); await A.page.waitForSelector('#meWrap .mrow.new');
  const rows = await A.page.$$eval('#meWrap .mrow.new', l => l.map(r => r.textContent.replace(/\s+/g, ' ')));
  assert.equal(rows.length, 3, JSON.stringify(rows));
  assert(rows.some(t => /Scout the car park/.test(t)) && rows.some(t => /For you.*call time/.test(t)) && rows.some(t => /tonight/.test(t)), JSON.stringify(rows));
  assert(!rows.some(t => /ladders/.test(t)), 'no dot on a conversation she isn’t in');
  await until(async () => (await me(A)).n === '2', 'task counted as seen');
  await A.page.click('#meWrap .mconv.new >> text=tonight'); await A.page.waitForSelector('#convPanel:not([hidden])');
  await until(async () => (await me(A)).n === '1', 'reply seen');
  await A.page.click('#convPanel [data-cv=close]');
  await A.page.evaluate(() => { location.hash = '#/me'; }); await A.page.waitForSelector('#meWrap .mrow');
  const left = await A.page.$$eval('#meWrap .mrow.new', l => l.map(r => r.textContent));
  assert(left.length === 1 && /call time/.test(left[0]), 'only the mention is still new: ' + JSON.stringify(left));

  for (const u of [A, B]) assert.deepEqual(u.page.errors.filter(e => !/pdfjsLib/.test(e)), [], u.email + ' page errors');
  console.log('TEST 9 PASSED'); await browser.close(); srv.close();
})().catch(async e => { try { for (const u of (global.__U || [])) console.error(u.email, 'toast:', await H.toast(u), '| bar:', await H.bar(u), '| errors:', u.page.errors); } catch (x) {} console.error('FAILED:', e.message, '\n', e.stack.split('\n').slice(1, 4).join('\n')); process.exit(1); });
