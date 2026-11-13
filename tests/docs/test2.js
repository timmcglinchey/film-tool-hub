/* Documentation page: the overview, folders, drafts and "Latest", open / download / rename / delete,
   switching projects, and backup / restore. Then the tools that build real PDFs (needs FTH_TEST_LIBS, see test1.js). */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const { serve, person } = require('../sharing/mock');
const { assert, until, H, sleep } = require('../sharing/lib');
const LIBS = process.env.FTH_TEST_LIBS || '';
const step = s => console.log('• ' + s);
const go = (u, h) => u.page.evaluate(h => { location.hash = h; }, h);
const rows = u => u.page.$$eval('#docsPage .drow:not(.dcols)', els => els.map(r => [r.querySelector('.dname b').textContent, r.querySelector('.dtype').textContent, r.querySelector('.ddraft').textContent.replace('Latest', ' Latest'), r.classList.contains('old') ? 'old' : ''].filter(Boolean).join(' | ')));
const folder = (u, id) => u.page.$eval(`#docsPage .dfold[href="#/docs/${id}"]`, a => (a.classList.contains('none') ? 'faded: ' : '') + a.querySelector('.dfm').textContent.replace(/Updated.*/, ''));
const sum = u => u.page.$eval('#docsPage .dsum', e => e.querySelector('b').textContent + ' ' + e.querySelector('span').textContent);
async function docBtn(f, sel, label) { await f.click(sel); if (label) await f.click(`[data-fth-docmenu] button:has-text("${label}")`); }
(async () => {
  const srv = await serve(), base = `http://localhost:${srv.address().port}/`;
  const browser = await chromium.launch();
  const A = await person(browser, base, 'alice@example.com', 'Alice Adams', {libs: LIBS});
  await A.page.goto(base);
  const dlgOk = () => A.page.click('#dlg button[value=ok]');

  step('An empty project: every folder is faded and the strip says 0 of 16');
  await A.page.click('#docsBtn');
  await until(async () => await sum(A) === '0 of 16 tools have documents', 'the empty strip');
  assert.equal(await A.page.$$eval('#docsPage .dfold', a => a.length), 16);
  assert.equal(await A.page.$$eval('#docsPage .dfold.none', a => a.length), 16);
  assert.equal(await A.page.$$eval('#docsPage .section', a => a.length), 4, 'grouped by the four categories that have exports');

  step('Three call sheet drafts and a recce spreadsheet');
  await H.open(A, 'callsheet'); let f = await H.frame(A, 'callsheet');
  await f.evaluate(() => { window.print = () => {}; });
  for (let i = 0; i < 3; i++) { await docBtn(f, '#docBtn', 'Call Sheet PDF'); await sleep(500); }
  await H.open(A, 'recce'); f = await H.frame(A, 'recce'); await docBtn(f, '#docBtn', 'Comparison spreadsheet'); await sleep(600);
  await go(A, '#/docs');
  await until(async () => await sum(A) === '2 of 16 tools have documents', 'the strip counts two tools');
  assert.equal(await folder(A, 'callsheet'), '3 documents');
  assert.equal(await folder(A, 'recce'), '1 document');
  assert.match(await folder(A, 'breakdown'), /^faded: Empty/);

  step('Inside a folder: newest draft is marked Latest, older drafts can be shown and hidden');
  await A.page.click('#docsPage .dfold[href="#/docs/callsheet"]');
  await until(async () => (await rows(A)).length === 1, 'one row (the latest)');
  assert.match((await rows(A))[0], /^Call Sheet .* \| Call Sheet PDF \| Draft 3 Latest$/);
  await A.page.click('[data-da=older]');
  let r = await rows(A); assert.equal(r.length, 3); assert.match(r[1], /Draft 2 \| old$/); assert.match(r[2], /Draft 1 \| old$/);
  assert.match(await A.page.$eval('.drow:not(.dcols) .dwhen', e => e.textContent), /\d{4}.*\d\d?:\d\d/, 'date and time shown');
  await A.page.click('[data-da=older]'); assert.equal((await rows(A)).length, 1);

  step('Open shows the print-ready page; "Save as PDF" opens the print window');
  await A.page.click('.drow:not(.dcols) [data-da=open]');
  await until(() => A.page.evaluate(() => document.querySelector('#docView').open), 'viewer open');
  const inner = await (await A.page.$('#dvBody iframe')).contentFrame();
  await until(() => inner.evaluate(() => /CALL TIME/i.test(document.body.innerText)), 'the call sheet is shown');
  assert.equal(await inner.evaluate(() => document.querySelectorAll('script,button,input').length), 0, 'only what prints is kept');
  await A.page.click('#dvClose');
  await A.page.evaluate(() => { window.__p = 0; const o = HTMLIFrameElement.prototype; const d = Object.getOwnPropertyDescriptor(o, 'contentWindow'); Object.defineProperty(o, 'contentWindow', {get() { const w = d.get.call(this); if (w && this.getAttribute('sandbox') === 'allow-same-origin allow-modals') w.print = () => { window.__p++; }; return w; }}); });
  await A.page.click('.drow:not(.dcols) [data-da=down]');
  await until(() => A.page.evaluate(() => window.__p === 1), 'print window opened for the page');

  step('Rename, then delete (with an "are you sure?"): the draft before becomes Latest');
  await A.page.click('.drow:not(.dcols) [data-da=rename]'); await A.page.fill('#f-dname', 'Day 1 call sheet'); await dlgOk();
  await until(async () => /^Day 1 call sheet \|/.test((await rows(A))[0]), 'renamed');
  await A.page.click('.drow:not(.dcols) [data-da=delete]');
  assert.match(await A.page.$eval('#dlg', e => e.textContent), /Are you sure\?/);
  await A.page.click('#dlg button[value=cancel]'); assert.equal((await rows(A)).length, 1);
  await A.page.click('.drow:not(.dcols) [data-da=delete]'); await dlgOk();
  await until(async () => / Draft 2 Latest$/.test((await rows(A))[0]), 'draft 2 is now the latest');
  await H.open(A, 'callsheet'); f = await H.frame(A, 'callsheet'); await docBtn(f, '#docBtn', 'Call Sheet PDF'); await sleep(700);
  await go(A, '#/docs/callsheet');
  await until(async () => / Draft 4 Latest$/.test((await rows(A))[0]), 'a deleted draft’s number is not reused');

  step('A real file downloads with its own name, and a spreadsheet opens as a table');
  await go(A, '#/docs/recce');
  await until(async () => (await rows(A)).length === 1, 'recce row');
  const dl = A.page.waitForEvent('download'); await A.page.click('.drow:not(.dcols) [data-da=down]');
  assert.match((await dl).suggestedFilename(), /^Location_Recces.*\.csv$/);
  await A.page.click('.drow:not(.dcols) [data-da=open]');
  await until(() => A.page.evaluate(() => !!document.querySelector('#dvBody table th')), 'CSV shown as a table');
  await A.page.click('#dvClose');

  step('A backup remembers the list: restoring brings back a deleted document and removes later ones');
  await A.page.evaluate(() => window.__fthHub.saveWithBackup('test'));
  await A.page.click('.drow:not(.dcols) [data-da=delete]'); await dlgOk();
  await until(async () => (await rows(A)).length === 0, 'recce doc deleted');
  await H.open(A, 'risk'); f = await H.frame(A, 'risk'); await f.evaluate(() => { window.print = () => {}; }); await docBtn(f, '#docBtn', 'Risk Assessment PDF'); await sleep(700);
  await go(A, '#/docs'); await until(async () => await sum(A) === '2 of 16 tools have documents', 'callsheet + risk');
  await A.page.click('#projBtn'); await A.page.click('#pmenu [data-pm=manage]'); await A.page.click('#dlg [data-pa=backups]');
  await A.page.click('#dlg [data-pa=restore]:not([data-pa=restore-save])'); await dlgOk();
  await until(async () => /Restored/.test(await H.toast(A)), 'restored');
  await go(A, '#/docs');
  await until(async () => await folder(A, 'recce') === '1 document', 'the deleted recce document is back');
  assert.match(await folder(A, 'risk'), /^faded/, 'the document saved after the backup is gone');
  assert.equal(await folder(A, 'callsheet'), '3 documents');

  step('Switching projects shows that project’s documents only');
  await A.page.click('#projBtn'); await A.page.click('#pmenu [data-pm=new]'); await A.page.fill('#f-pname', 'Second film'); await dlgOk();
  await until(async () => /Second film/.test(await A.page.$eval('#projName', e => e.textContent)), 'new project');
  await go(A, '#/docs');
  await until(async () => await sum(A) === '0 of 16 tools have documents', 'the new project has no documents');
  await H.open(A, 'schedule'); f = await H.frame(A, 'schedule'); await f.evaluate(() => { window.print = () => {}; }); await docBtn(f, '#docBtn', 'Schedule PDF'); await sleep(700);
  await go(A, '#/docs'); await until(async () => await sum(A) === '1 of 16 tools have documents', 'one in the new project');
  await A.page.click('#projBtn'); await A.page.click('#pmenu [data-pm=open]:not(.on)');
  await until(async () => /My first project/.test(await A.page.$eval('#projName', e => e.textContent)), 'back to the first project');
  await go(A, '#/docs');
  await until(async () => await sum(A) === '2 of 16 tools have documents', 'the first project’s documents again');
  assert.match(await folder(A, 'schedule'), /^faded/);

  if (LIBS) {
    step('Script Breakdown and Script Lining: real PDFs are filed (and still download on a normal export)');
    const { PDFDocument, StandardFonts } = require(path.join(LIBS, '..', 'node_modules', 'pdf-lib'));
    const pdf = await PDFDocument.create(), font = await pdf.embedFont(StandardFonts.Courier), pg = pdf.addPage([612, 792]);
    ['INT. KITCHEN - DAY', '', 'SAM stands at the sink holding a red MUG. A DOG barks outside.', '', '                    SAM', '          Not again.', '', 'EXT. GARDEN - NIGHT', '', 'ALEX digs a hole with a rusty SPADE while the dog watches.',
      'Rain starts to fall on the garden and the old shed at the back.', 'Alex wipes mud from a silver LOCKET and holds it up to the light.'].forEach((l, i) => pg.drawText(l, {x: 108, y: 700 - i * 14, size: 12, font}));
    const file = path.join(require('os').tmpdir(), 'fth-test-script.pdf'); fs.writeFileSync(file, await pdf.save());
    await H.open(A, 'breakdown'); f = await H.frame(A, 'breakdown');
    await f.setInputFiles('#fileIn', file);
    await until(() => f.evaluate(() => !document.querySelector('#pdfBtn').disabled), 'script loaded in the breakdown');
    await f.evaluate(() => { document.querySelector('#advT').click(); });
    await docBtn(f, '#docBtn', 'Breakdown PDF'); await f.click('#mGo');
    await go(A, '#/docs/breakdown');
    await until(async () => (await rows(A)).length === 1, 'breakdown PDF filed', 30000);
    assert.match((await rows(A))[0], /Advanced Breakdown PDF \| Draft 1 Latest$/);
    await go(A, '#/tool/breakdown');
    const d2 = A.page.waitForEvent('download'); await f.click('#pdfBtn'); await f.click('#mGo');
    assert.match((await d2).suggestedFilename(), /-breakdown\.pdf$/);
    await go(A, '#/docs/breakdown');
    await until(async () => / Draft 2 Latest$/.test((await rows(A))[0]), 'the normal export is filed as draft 2', 30000);
    const head = await A.page.evaluate(async () => { const db = await new Promise(r => { const q = indexedDB.open('film-tool-hub'); q.onsuccess = () => r(q.result); });
      const recs = await new Promise(r => { const q = db.transaction('docs').objectStore('docs').getAll(); q.onsuccess = () => r(q.result); });
      const d = recs.find(x => x.tool === 'breakdown'); const b = await new Promise(r => { const q = db.transaction('docfiles').objectStore('docfiles').get(d.id); q.onsuccess = () => r(q.result); }); db.close();
      return (await b.slice(0, 5).text()) + ' ' + b.type + ' ' + (b.size > 1000); });
    assert.equal(head, '%PDF- application/pdf true', 'a real PDF is stored');

    await H.open(A, 'script-lining'); f = await H.frame(A, 'script-lining');
    f.page().on('dialog', d => d.accept());
    await f.setInputFiles('#fileInput', file);
    await until(() => f.evaluate(() => typeof pageWrappers !== 'undefined' && pageWrappers.length > 0), 'script loaded in the lining tool', 30000);
    await f.click('#docBtn');
    await go(A, '#/docs/script-lining');
    await until(async () => (await rows(A)).length === 1, 'lined script filed', 30000);
    assert.match((await rows(A))[0], /_Lined \| Lined Script PDF \| Draft 1 Latest$/);
  }
  assert.deepEqual(A.page.errors, [], 'no page errors');
  await browser.close(); srv.close();
  console.log('test2 passed');
})().catch(e => { console.error(e); process.exit(1); });
