/* Paperwork made outside the hub (added 20 November 2026):
   • Documentation: the Other paperwork folder, and "Your own versions" inside a tool's folder: upload files
     (several at once, dropped, or pasted) or paste a link; uploading the same name again adds a draft;
   • Task Board: a task's Paperwork (upload a file or paste a link), kept in Documentation too;
   • signed in: uploads go to Drive like exports (links don't make a file); shared: the crew get both. */
const { chromium } = require('playwright');
const { D, serve, person } = require('../sharing/mock');
const { assert, until, H, sleep } = require('../sharing/lib');
const step = s => console.log('• ' + s);
const go = (u, h) => u.page.evaluate(h => { location.hash = h; }, h);
const rows = u => u.page.$$eval('#docsPage .drow:not(.dcols)', els => els.map(r => [r.querySelector('.dkind').textContent, r.querySelector('.dname b').textContent, r.querySelector('.dtype').textContent, r.querySelector('.ddraft').textContent.replace('Latest', ' Latest')].join(' | ')));
const metas = u => u.page.$$eval('#docsPage .drow:not(.dcols) .dname small', els => els.map(e => e.textContent));
const fileOf = f => { const out = []; let x = f; while (x) { out.unshift(x.name); x = D.files.get((x.parents || [])[0]); } return out.join(' / '); };
const driveDocs = () => [...D.files.values()].filter(f => f.appProperties.fth === 'doc' && !f.trashed).map(fileOf).sort();
const file = (name, text, mimeType) => ({name, mimeType: mimeType || 'application/pdf', buffer: Buffer.from(text)});
(async () => {
  const srv = await serve(), base = `http://localhost:${srv.address().port}/`;
  const browser = await chromium.launch();
  const A = await person(browser, base, 'alice@example.com', 'Alice Adams'), B = await person(browser, base, 'bob@example.com', 'Bob Brown');
  await A.page.goto(base); await H.signIn(A);
  await A.page.evaluate(() => { window.__opened = []; window.open = (u) => { window.__opened.push(u); return null; }; });
  const ok = () => A.page.click('#dlg button[value=ok]');
  const all = async () => A.page.evaluate(async () => { const r = await new Promise(res => { const q = indexedDB.open('film-tool-hub'); q.onsuccess = () => { const t = q.result.transaction('docs').objectStore('docs').getAll(); t.onsuccess = () => res(t.result); }; }); return r.filter(d => !d.deleted); });

  step('The overview ends with an Other section: the Other paperwork folder and a place to add paperwork');
  await go(A, '#/docs'); await A.page.waitForSelector('#docsPage .dother');
  assert.match(await A.page.textContent('#docsPage .dother h2'), /^Other$/);
  assert.equal(await A.page.$eval('#docsPage .dother .dfold[href="#/docs/other"]', a => a.classList.contains('none')), true, 'faded while empty');
  assert.match(await A.page.textContent('#docsPage .dsum'), /^0\s*of 17 tools/, 'Other isn’t counted as a tool');

  step('Upload two files at once into Other paperwork, as release forms');
  await A.page.click('#docsPage .dother [data-da=upload]'); await A.page.waitForSelector('#upFiles', {state: 'attached'});
  await A.page.setInputFiles('#upFiles', [file('Release - Sam.pdf', '%PDF-1 sam'), file('Release - Jo.pdf', '%PDF-1 jo')]);
  await until(async () => (await A.page.$$('#upPick .dupf')).length === 2, 'both listed');
  assert.equal(await A.page.$eval('#upNameF', e => e.hidden), true, 'no single name for several files');
  assert.equal(await A.page.textContent('#upGo'), 'Upload 2 files');
  await A.page.fill('#f-ukind', 'Release form'); await ok();
  await until(async () => (await all()).length === 2, 'two saved');
  await go(A, '#/docs/other'); await until(async () => (await rows(A)).length === 2, 'two rows');
  assert.deepEqual((await rows(A)).sort(), ['PDF | Release - Jo | Release form | Draft 1 Latest', 'PDF | Release - Sam | Release form | Draft 1 Latest']);
  assert(( await metas(A)).every(m => /uploaded/.test(m)), 'marked as uploaded');

  step('Uploading the same name and kind again adds Draft 2; leaving one out of a pick works');
  await A.page.click('#docsPage [data-da=upload]'); await A.page.waitForSelector('#upFiles', {state: 'attached'});
  await A.page.setInputFiles('#upFiles', [file('Release - Sam.pdf', '%PDF-1 sam v2'), file('notes.txt', 'x', 'text/plain')]);
  await until(async () => (await A.page.$$('#upPick .dupf')).length === 2, 'two picked');
  await A.page.click('#upPick .dupf:nth-child(2) [data-rm]');
  await until(async () => (await A.page.$$('#upPick .dupf')).length === 1, 'one left');
  assert.equal(await A.page.$eval('#upNameF', e => e.hidden), false, 'one file: a name can be given');
  await A.page.fill('#f-ukind', 'Release form'); await ok();
  await until(async () => (await rows(A)).some(r => /Release - Sam .* Draft 2 Latest/.test(r)), 'Draft 2');
  assert.equal((await rows(A)).length, 2, 'drafts fold together');

  step('Paste a link: https:// is added, it shows as LINK and opens in a new tab; a bad one is refused');
  await A.page.click('#docsPage [data-da=addlink]'); await A.page.waitForSelector('#f-ulink');
  await A.page.fill('#f-ulink', 'not a link'); await ok();
  assert.equal(await A.page.$eval('#dlg', d => d.open), true, 'stays open for a bad link');
  await A.page.fill('#f-ulink', 'drive.google.com/file/d/abc123/view'); await A.page.fill('#f-uname', 'Insurance certificate'); await A.page.fill('#f-ukind', 'Insurance'); await ok();
  await until(async () => (await rows(A)).some(r => r === 'LINK | Insurance certificate | Insurance | Draft 1 Latest'), 'the link row');
  const lrow = '#docsPage .drow[data-doc]:has(.dkind.lk)';
  assert.match(await A.page.$eval(lrow + ' .dname small', e => e.textContent), /drive\.google\.com · link/);
  assert.equal(await A.page.$$eval(lrow + ' [data-da=down]', a => a.length), 0, 'no Download for a link');
  await A.page.click(lrow + ' [data-da=open]');
  await until(() => A.page.evaluate(() => window.__opened[0] === 'https://drive.google.com/file/d/abc123/view'), 'opened in a new tab');

  step('Pasting a link on the page (outside a text box) opens the link box with it filled in');
  await A.page.evaluate(() => { const dt = new DataTransfer(); dt.setData('text/plain', 'https://example.com/permit.pdf'); document.body.dispatchEvent(new ClipboardEvent('paste', {clipboardData: dt, bubbles: true})); });
  await until(async () => (await A.page.$eval('#f-ulink', i => i.value).catch(() => '')) === 'https://example.com/permit.pdf', 'prefilled');
  await A.page.click('#dlg button[value=cancel]');

  step('A tool’s folder has “Your own versions” below its exports; dropping a file there opens the upload box');
  await go(A, '#/docs/callsheet'); await A.page.waitForSelector('#docsPage .dsub');
  assert.match(await A.page.textContent('#docsPage .dfolder'), /No exports from Call Sheet Builder yet/);
  assert.match(await A.page.textContent('#docsPage .dup b'), /Upload your own call sheet/i);
  await A.page.evaluate(() => { const dt = new DataTransfer(); dt.items.add(new File(['%PDF day1'], 'My call sheet.pdf', {type: 'application/pdf'})); const z = document.querySelector('#docsPage .dup'); z.dispatchEvent(new DragEvent('dragover', {dataTransfer: dt, bubbles: true, cancelable: true})); z.dispatchEvent(new DragEvent('drop', {dataTransfer: dt, bubbles: true, cancelable: true})); });
  await until(async () => (await A.page.$$('#upPick .dupf')).length === 1, 'dropped file listed');
  assert.equal(await A.page.inputValue('#f-ukind'), 'Call Sheet', 'kind defaults to what the tool makes');
  await ok();
  await until(async () => (await rows(A)).length === 1, 'own version listed');
  assert.deepEqual(await rows(A), ['PDF | My call sheet | Call Sheet | Draft 1 Latest']);
  await go(A, '#/docs');
  assert.match(await A.page.$eval('#docsPage .dfold[href="#/docs/callsheet"]', e => e.textContent), /All your own versions.*1 document/s);
  assert.match(await A.page.textContent('#docsPage .dsum'), /^1\s*of 17 tools/);

  step('Signed in: uploaded files go to Drive in their folder (Other paperwork too); links make no file');
  await until(() => driveDocs().length === 4, 'four files in Drive', 20000);
  const dd = driveDocs();
  assert(dd.includes('Film Tool Hub / Documentation / My first project / Other paperwork / Release - Sam (Draft 2).pdf'), dd.join('\n'));
  assert(dd.includes('Film Tool Hub / Documentation / My first project / Call Sheet Builder / My call sheet (Draft 1).pdf'), dd.join('\n'));
  assert(!dd.some(n => /Insurance/.test(n)), 'the link stays a link');

  step('Task Board: a task gets a file and a link, filed in the Call Sheet folder');
  await H.open(A, 'tasks'); let f = await H.frame(A, 'tasks');
  await f.evaluate(() => openTask());
  await f.fill('#fTitle', 'Do the call sheet');
  assert.match(await f.textContent('#fileList'), /Nothing attached yet/);
  await f.setInputFiles('#fileIn', file('Day 2 call sheet.pdf', '%PDF day2'));
  await f.click('#linkBtn'); await f.fill('#linkNew', 'https://www.dropbox.com/s/xyz/map.pdf'); await f.press('#linkNew', 'Enter');
  await until(async () => (await f.$$('#fileList .tb-file')).length === 2, 'two waiting');
  assert.match(await f.textContent('#fileList'), /added when you save the task/);
  assert.equal(await f.$eval('#fileWhere', e => e.hidden), false, 'folder picker shown');
  const opts = await f.$$eval('#fileFolder option', o => o.map(x => x.textContent));
  assert.equal(opts[0], 'Other paperwork'); assert(opts.includes('Call Sheet Builder'), opts.join(', '));
  await f.selectOption('#fileFolder', 'callsheet');
  const before = (await all()).length;
  await f.click('#taskForm button[type=submit]');
  await until(() => f.evaluate(() => data.tasks[0] && data.tasks[0].files.length === 2), 'both attached');
  const tf = await f.evaluate(() => data.tasks[0].files);
  assert.equal(tf[0].name, 'Day 2 call sheet'); assert.equal(tf[0].ext, 'pdf'); assert(tf[0].doc);
  assert.equal(tf[1].link, 'https://www.dropbox.com/s/xyz/map.pdf'); assert(tf[1].doc, 'the link is in Documentation too');
  assert.equal((await all()).length, before + 2);
  assert.equal(await f.evaluate(() => data.docFolder), 'callsheet', 'the folder is remembered');
  assert.match(await f.$eval('.tb-item .tb-chip.clip', e => e.textContent), /^2$/, 'the card shows a paperclip and a count');

  step('In Documentation they say which task they’re on');
  await go(A, '#/docs/callsheet'); await until(async () => (await rows(A)).length === 3, 'three own versions');
  assert((await metas(A)).filter(m => /on the task “Do the call sheet”/.test(m)).length === 2);

  step('Opening a task’s file shows it in the hub’s viewer; one deleted from Documentation is marked');
  await H.open(A, 'tasks'); f = await H.frame(A, 'tasks');
  await f.click('.tb-item'); await until(async () => (await f.$$('#fileList .tb-file')).length === 2, 'listed');
  await f.click('#fileList .tb-file:first-child .tb-file-name');
  await until(() => A.page.evaluate(() => document.querySelector('#docView').open), 'viewer open');
  assert.match(await A.page.textContent('#dvTitle'), /Day 2 call sheet/);
  await A.page.click('#dvClose'); await f.click('#btnCancel');
  await go(A, '#/docs/callsheet'); await A.page.waitForSelector('#docsPage .drow[data-doc]');
  await A.page.click('#docsPage .drow[data-doc]:has(b[title="Day 2 call sheet"]) [data-da=delete]'); await ok();
  await H.open(A, 'tasks'); f = await H.frame(A, 'tasks'); await f.click('.tb-item');
  await until(async () => /deleted from Documentation/.test(await f.textContent('#fileList')), 'marked as deleted');

  step('Cancel leaves nothing behind; taking paperwork off a task leaves it in Documentation');
  await f.setInputFiles('#fileIn', file('scrap.pdf', 'x')); await f.click('#btnCancel');
  await sleep(600); assert.equal((await all()).length, before + 1, 'nothing new from a cancelled task');
  await f.click('.tb-item'); await until(async () => (await f.$$('#fileList .tb-file')).length === 2, 'listed again');
  await f.click('#fileList .tb-file:last-child .x'); await f.click('#taskForm button[type=submit]');
  await until(() => f.evaluate(() => data.tasks[0].files.length === 1), 'one left on the task');
  assert.equal((await all()).length, before + 1, 'the link is still in Documentation');

  step('Shared: Bob gets the uploaded files and links, and can open them');
  await go(A, '#/');
  await A.page.click('#shareBtn'); await A.page.waitForSelector('#f-emails');
  await A.page.fill('#f-emails', 'bob@example.com'); await A.page.click('[data-sa=add]');
  await until(async () => /Shared with 1 person/.test(await H.toast(A)), 'shared');
  const link = await A.page.inputValue('#f-link'); await A.page.click('#dlg button[value=cancel]');
  await B.page.goto(link); await B.page.waitForSelector('#dlg[open]'); await B.page.click('#dlg button[value=ok]');
  await until(async () => /Shared by Alice Adams/.test(await B.page.textContent('#projStrip')), 'Bob has the project');
  await go(B, '#/docs/other');
  await until(async () => (await rows(B)).length === 3, 'Bob sees Other paperwork', 30000);
  await B.page.click('#docsPage .drow[data-doc]:has(b[title="Release - Sam"]) [data-da=open]');
  await until(async () => { const h = await B.page.$('#dvBody iframe'); return !!h; }, 'Bob opens the uploaded PDF');
  await B.page.click('#dvClose');
  assert(( await rows(B)).includes('LINK | Insurance certificate | Insurance | Draft 1 Latest'));

  step('Bob adds a link of his own: it reaches Alice');
  await B.page.click('#docsPage [data-da=addlink]'); await B.page.waitForSelector('#f-ulink');
  await B.page.fill('#f-ulink', 'https://example.com/risk-signed.pdf'); await B.page.click('#dlg button[value=ok]');
  await go(A, '#/docs/other');
  await until(async () => (await rows(A)).length === 4, 'Alice sees Bob’s link', 30000);
  assert((await metas(A)).some(m => /link by Bob/.test(m)), (await metas(A)).join('\n'));

  assert.deepEqual(A.page.errors, [], 'no page errors (Alice)'); assert.deepEqual(B.page.errors, [], 'no page errors (Bob)');
  await browser.close(); srv.close();
  console.log('test4 passed');
})().catch(e => { console.error(e); process.exit(1); });
