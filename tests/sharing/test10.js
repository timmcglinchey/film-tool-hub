/* Script Breakdown comments in a shared project: cards beside the script, labels, filtering, replies and resolving.
   Needs local copies of the PDF libraries (the site loads them from cdnjs): set FTH_TEST_LIBS to a folder holding
   pdf.min.js, pdf.worker.min.js and pdf-lib.min.js, with pdf-lib also installed in that folder's ../node_modules.
   Without it the test is skipped. */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), os = require('os');
const { D, serve, person } = require('./mock');
const { assert, until, H } = require('./lib');
const LIBS = process.env.FTH_TEST_LIBS || '';
if (!LIBS) { console.log('TEST 10 SKIPPED (set FTH_TEST_LIBS to run the Script Breakdown comment test)'); process.exit(0); }
(async () => {
  const srv = await serve(), base = `http://localhost:${srv.address().port}/`;
  const browser = await chromium.launch();
  const A = await person(browser, base, 'alice@example.com', 'Alice Adams', {libs: LIBS}), B = await person(browser, base, 'bob@example.com', 'Bob Brown', {libs: LIBS});
  global.__U = [A, B]; const step = s => console.log('• ' + s);
  const notes = () => { const pf = [...D.files.values()].find(f => f.appProperties.fth === 'project'); return (JSON.parse(pf.revs.at(-1).content).snap.msgs || []).filter(m => m.kind === 'note' && !m.deleted); };
  const cards = f => f.$$eval('#rail .cmc .cmt', l => l.map(x => x.textContent));
  /* drag across words on the script with the real mouse (the tool is in a frame, so add the frame's position) */
  async function drag(u, f, w1, w2) {
    const fb = await (await u.page.$('#workspace iframe[data-tool="breakdown"]')).boundingBox();
    const box = t => f.evaluate(t => { const i = S.words.findIndex(w => w.s.replace(/[^\w]/g, '') === t), w = S.words[i], P = S.pages[w.p]; P.el.scrollIntoView({block: 'nearest'}); const r = wordRect(P, w, w), b = P.el.getBoundingClientRect(); return {x: b.left + r.l + 3, x2: b.left + r.l + r.w - 3, y: b.top + r.t + r.h / 2}; }, t);
    await f.evaluate(t => { const i = S.words.findIndex(w => w.s.replace(/[^\w]/g, '') === t), w = S.words[i], P = S.pages[w.p]; viewer.scrollTop = P.el.offsetTop + wordRect(P, w, w).t - 200; }, w1);
    await u.page.waitForTimeout(250);
    const a = await box(w1), z = await box(w2);
    await u.page.mouse.move(fb.x + a.x, fb.y + a.y); await u.page.mouse.down();
    await u.page.mouse.move(fb.x + (a.x + z.x2) / 2, fb.y + a.y + 2, {steps: 4}); await u.page.mouse.move(fb.x + z.x2, fb.y + z.y, {steps: 4}); await u.page.mouse.up();
  }

  /* a two-page script */
  const { PDFDocument, StandardFonts } = require(path.join(LIBS, '..', 'node_modules', 'pdf-lib'));
  const pdf = await PDFDocument.create(), font = await pdf.embedFont(StandardFonts.Courier);
  [['INT. KITCHEN - DAY', '', 'SAM stands at the sink holding a red MUG. A DOG barks outside.', '', '                    SAM', '          Not again.', '', 'EXT. GARDEN - NIGHT', '', 'ALEX digs a hole with a rusty SPADE while the dog watches.', 'Alex wipes mud from a silver LOCKET and holds it up to the light.'],
   ['INT. SHED - CONTINUOUS', '', 'A single bulb swings over a workbench and a broken RADIO.']].forEach(lines => { const pg = pdf.addPage([612, 792]); lines.forEach((l, i) => pg.drawText(l, {x: 108, y: 700 - i * 14, size: 12, font})); });
  const file = path.join(os.tmpdir(), 'fth-test10-script.pdf'); fs.writeFileSync(file, await pdf.save());

  step('Alice shares the project (she is the Director, Bob the Cinematographer) and loads a script into Script Breakdown');
  await A.page.goto(base); await H.signIn(A);
  await H.open(A, 'breakdown'); let fa = await H.frame(A, 'breakdown');
  await fa.setInputFiles('#fileIn', file); await until(() => fa.evaluate(() => !document.querySelector('#pdfBtn').disabled), 'script loaded');
  await until(() => fa.evaluate(async () => !!(await DB.get('last'))), 'breakdown kept in the project');
  await H.save(A);
  const pf = [...D.files.values()].find(f => f.appProperties.fth === 'project');
  await A.page.click('#shareBtn'); await A.page.waitForSelector('#f-emails');
  await A.page.fill('#crewRows .crewrow .cn', 'Bobby'); await A.page.fill('#crewRows .crewrow .cr', 'Cinematographer'); await A.page.fill('#f-emails', 'bob@example.com');
  await A.page.click('[data-sa=add]'); await until(async () => /Shared with 1 person/.test(await H.toast(A)), 'shared');
  await A.page.fill('#dlg [data-crewrole="alice@example.com"]', 'Director'); await A.page.press('#dlg [data-crewrole="alice@example.com"]', 'Enter');
  await A.page.click('#dlg button[value=cancel]');
  await B.page.goto(base + '#/join/' + pf.id); await B.page.click('#dlg button[value=ok]');
  await until(async () => /Shared by Alice Adams/.test(await B.page.textContent('#projStrip')), 'Bob in');

  step('Alice holds the breakdown; Bob has it view-only but can still comment, and his role is the label');
  await A.page.evaluate(() => { location.hash = '#/tool/breakdown'; }); fa = await H.frame(A, 'breakdown');
  await H.act(A, 'breakdown'); await H.editing(A, 'breakdown');
  if (await fa.$('[data-resume]')) await fa.click('[data-resume]');
  await until(() => fa.evaluate(() => !!S.pdf), 'Alice has the script open');
  await H.open(B, 'breakdown'); const fb = await H.frame(B, 'breakdown');
  await until(async () => /Alice Adams is editing/.test(await H.bar(B)), 'Bob is view-only');
  await fb.click('[data-resume]'); await until(() => fb.evaluate(() => !document.querySelector('#pdfBtn').disabled), 'Bob has the script');
  assert.equal(await fb.isVisible('#rail'), true, 'the comment column shows beside the script');
  await drag(B, fb, 'silver', 'LOCKET');
  await fb.waitForSelector('#cmFab:not([hidden])'); await fb.click('#cmAdd');
  assert.deepEqual(await fb.$$eval('#rail .draft .cmlbls .cml', l => l.map(x => x.textContent.replace('×', '').trim())), ['Cinematographer'], 'Bob’s role is picked for him');
  assert.equal(await fb.$('#rail [data-k=name]'), null, 'signed in, so no name box');
  await fb.fill('#rail [data-k=draft]', 'Rack focus from the mud to the locket'); await fb.press('#rail [data-k=draft]', 'Control+Enter');
  await until(async () => (await cards(fb)).includes('Rack focus from the mud to the locket'), 'Bob sees his card');
  await until(() => notes().some(n => n.text === 'Rack focus from the mud to the locket' && n.labels.join() === 'Cinematographer' && /^silver LOCKET/.test(n.anchor.text)), 'saved to the shared file without pressing Save');
  assert.equal(await fb.evaluate(() => S.tags.length), 0, 'no tag was made');

  step('Alice sees Bob’s card level with the words, labelled, with his name and role');
  await until(async () => (await cards(fa)).includes('Rack focus from the mud to the locket'), 'card reaches Alice', 30000);
  const card = await fa.evaluate(() => { const c = document.querySelector('#rail .cmc'); return {who: c.querySelector('.who b').textContent, sub: c.querySelector('.who small').textContent, lbl: [...c.querySelectorAll('.cml')].map(x => x.textContent.trim()), q: c.querySelector('.cmq').textContent}; });
  assert.equal(card.who, 'Bobby'); assert.match(card.sub, /^Cinematographer · /); assert.deepEqual(card.lbl, ['Cinematographer']); assert.match(card.q, /Sc\. 2 · p\. 1 · silver LOCKET/);
  const level = await fa.evaluate(() => { const c = document.querySelector('#rail .cmc'), h = document.querySelector('.page .cm i'); return Math.abs((c.getBoundingClientRect().top) - h.getBoundingClientRect().top); });
  assert(level < 30, 'card is level with its words (' + level + 'px apart)');
  assert.equal(await fa.$$eval('.page .cm i', l => l.length), 1, 'the words are marked on Alice’s script');
  assert.equal(await A.page.evaluate(() => { const b = document.querySelector('[data-act=conv] .badge'); return b && !b.hidden ? b.textContent : ''; }), '', 'script comments stay out of the Conversation badge');

  step('Alice comments on a tag with her role plus a label she makes up (“Props buyer”)');
  await fa.click('[data-cat=props]'); await drag(A, fa, 'rusty', 'SPADE'); await until(() => fa.evaluate(() => S.tags.length === 1), 'tagged');
  await fa.evaluate(() => setActive(null));
  await fa.evaluate(() => openPop(S.tags[0].id, 200, 200));
  await fa.click('#pCm');
  await fa.click('#rail .draft [data-cm=pick]'); await fa.fill('#rail [data-k=newlbl]', 'Props buyer'); await fa.press('#rail [data-k=newlbl]', 'Enter');
  await fa.fill('#rail [data-k=draft]', 'Need a hero spade and a stunt spade'); await fa.press('#rail [data-k=draft]', 'Control+Enter');
  await until(async () => (await cards(fa)).length === 2, 'two cards');
  await until(() => notes().some(n => n.text === 'Need a hero spade and a stunt spade' && n.labels.join() === 'Director,Props buyer'), 'Alice’s labels saved');
  await until(async () => (await cards(fb)).length === 2, 'Bob sees both (his view is reloaded with Alice’s tag, and carries straight on)', 30000);
  step('Alice saves: Bob’s view reloads with her tag and carries straight on, script open, cards in place');
  await H.save(A);
  await until(() => fb.evaluate(() => S.tags.length === 1 && !!S.pdf).catch(() => false), 'Bob’s view reloads with Alice’s tag and carries straight on', 30000);
  assert.equal((await cards(fb)).length, 2, 'cards still there after the reload');

  step('A comment Bob is writing survives the hub reloading his view');
  await drag(B, fb, 'broken', 'RADIO'); await fb.click('#cmAdd'); await fb.fill('#rail [data-k=draft]', 'Half-written idea');
  await B.page.click('[data-act=reload]');
  await until(async () => { const f = await H.frame(B, 'breakdown'); return f && await f.evaluate(() => !!S.pdf && !!CM.draft && document.querySelector('#rail [data-k=draft]')?.value === 'Half-written idea').catch(() => false); }, 'draft back after reload');
  const fb2 = await H.frame(B, 'breakdown'); await fb2.click('#rail [data-cm=canceldraft]');
  step('Filter: tick only “Props buyer”, then add “Cinematographer”, then back to All');
  await fb.click('[data-cm=menu]');
  const menu = await fb.$$eval('.cmmenu label', l => l.map(x => x.textContent.trim()));
  assert(menu.includes('Props buyer1') && menu.includes('Cinematographer1') && menu.includes('Director1') && menu.includes('Producer'), JSON.stringify(menu));
  await fb.check('[data-fl="props buyer"]');
  assert.deepEqual(await cards(fb), ['Need a hero spade and a stunt spade']);
  assert.equal(await fb.$$eval('.page .cm i', l => l.length), 1, 'only the shown comment is marked on the script');
  await fb.check('[data-fl="cinematographer"]');
  assert.equal((await cards(fb)).length, 2);
  await fb.check('[data-fl="*"]'); assert.equal(await fb.evaluate(() => CM.filter), null);
  await fb.click('#rail .cmhead .t');

  step('Bob replies to Alice; she sees it. Bob can’t edit or delete her comment, but can resolve it');
  await fb.click('#rail .cmc:has-text("hero spade")');
  await fb.fill('#rail .cmc.on [data-k=reply]', 'Art dept has two'); await fb.press('#rail .cmc.on [data-k=reply]', 'Control+Enter');
  await until(async () => (await fa.$$eval('#rail .cmr .cmt', l => l.map(x => x.textContent))).includes('Art dept has two'), 'reply reaches Alice', 30000);
  assert.equal(await fb.$$eval('#rail .cmc:has-text("hero spade") > .cmh [data-cm=del], #rail .cmc:has-text("hero spade") > .cmh [data-cm=edit]', l => l.length), 0);
  await fb.click('#rail .cmc:has-text("hero spade") > .cmh [data-cm=resolve]');
  await until(async () => (await cards(fa)).length === 1 && !(await cards(fa)).includes('Need a hero spade and a stunt spade'), 'resolved for Alice too', 30000);
  await fa.click('[data-cm=menu]'); await fa.check('[data-fdone]'); await fa.click('#rail .cmhead .t');
  assert(/Resolved by Bobby/.test(await fa.textContent('#rail .cmc.done')), 'shows who resolved it');
  await fa.click('#rail .cmc.done [data-cm=reopen]'); await until(async () => !(await fa.$('#rail .cmc.done')), 'reopened');

  step('Bob deletes his own comment (two clicks); it goes for Alice too');
  await fb.click('#rail .cmc:has-text("Rack focus") > .cmh [data-cm=del]'); await fb.click('#rail .cmc:has-text("Rack focus") > .cmh [data-cm=del]');
  await until(async () => !(await cards(fa)).includes('Rack focus from the mud to the locket'), 'gone for Alice', 30000);

  step('The comments travel in the breakdown’s .json, and come back when it is opened in another project');
  const [dl] = await Promise.all([A.page.waitForEvent('download'), fa.click('#saveBtn')]);
  const saved = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
  assert.deepEqual(saved.comments.map(c => c.text).sort(), ['Art dept has two', 'Need a hero spade and a stunt spade']);
  await A.page.click('#projBtn'); await A.page.click('#pmenu [data-pm=new]'); await A.page.fill('#f-pname', 'Second'); await A.page.click('#dlg button[value=ok]');
  await until(async () => /Second/.test(await A.page.$eval('#projName', e => e.textContent)), 'second project');
  await H.open(A, 'breakdown'); fa = await H.frame(A, 'breakdown');
  const jf = path.join(os.tmpdir(), 'fth-test10.json'); fs.writeFileSync(jf, JSON.stringify(saved));
  await fa.setInputFiles('#fileIn', jf);
  await until(async () => (await fa.$$eval('#rail .cmc', l => l.length)) === 1 && (await fa.$$eval('#rail .cmr', l => l.length)) === 1, 'comment and reply brought back');
  assert.equal(await fa.textContent('#rail .cmr .who b'), 'Bobby', 'the reply keeps its author');
  step('…and the first project still has its own comments (a copy was made, not moved)');
  await A.page.click('#projBtn'); await A.page.click('#pmenu [data-pm=open]:not(.on)');
  await until(async () => /My first project/.test(await A.page.$eval('#projName', e => e.textContent)), 'back to the first project');
  await H.open(A, 'breakdown'); fa = await H.frame(A, 'breakdown');
  if (await fa.$('[data-resume]')) await fa.click('[data-resume]');
  await until(async () => (await fa.$$eval('#rail .cmc', l => l.length).catch(() => 0)) === 1 && (await fa.$$eval('#rail .cmr', l => l.length)) === 1, 'still in the first project');

  console.log('TEST 10 PASSED');
  await browser.close(); srv.close(); process.exit(0);
})().catch(async e => { console.error('TEST 10 FAILED:', e); for (const u of global.__U || []) { try { await u.page.screenshot({path: path.join(os.tmpdir(), 'fth-test10-' + u.email + '.png')}); } catch (x) {} } process.exit(1); });
