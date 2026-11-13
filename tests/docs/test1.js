/* Documentation: exports from the tools are filed in the right folders, drafts number up, and
   open / download / rename / delete / switching projects / restoring a backup all work.
   Run from the site folder:  node tests/docs/run.js
   The PDF and Excel libraries can't be fetched in a test, so give a folder holding local copies
   (jspdf.umd.min.js, pdf-lib.min.js, exceljs.min.js, xlsx.full.min.js, pdf.min.js, pdf.worker.min.js)
   in FTH_TEST_LIBS. Without it, the steps that need them are skipped. */
const { chromium } = require('playwright');
const { serve, person } = require('../sharing/mock');
const { assert, until, H, sleep } = require('../sharing/lib');
const LIBS = process.env.FTH_TEST_LIBS || '';
const step = s => console.log('• ' + s);
const docs = u => u.page.evaluate(async () => {
  const pid = window.__fthHub.project;
  const db = await new Promise(r => { const q = indexedDB.open('film-tool-hub'); q.onsuccess = () => r(q.result); });
  const all = await new Promise(r => { const q = db.transaction('docs').objectStore('docs').getAll(); q.onsuccess = () => r(q.result); }); db.close();
  return all.filter(d => d.projectId === pid && !d.deleted).sort((a, b) => a.at - b.at).map(d => ({tool: d.tool, type: d.type, name: d.name, ext: d.ext, draft: d.draft, page: !!d.page, size: d.size, group: d.group}));
});
const of = (list, tool) => list.filter(d => d.tool === tool).map(d => `${d.type} #${d.draft}`).sort().join(', ');   /* sorted: two saved at the same instant can come in either order */
/* press a tool's "Save to Documentation" button; with several kinds of export it opens a small menu */
async function docBtn(f, sel, label) {
  await f.click(sel);
  if (label) await f.click(`[data-fth-docmenu] button:has-text("${label}")`);
}
const count = async (u, n, what) => until(async () => (await docs(u)).length === n, `${n} documents after ${what}`);
(async () => {
  const srv = await serve(), base = `http://localhost:${srv.address().port}/`;
  const browser = await chromium.launch();
  const A = await person(browser, base, 'alice@example.com', 'Alice Adams', {libs: LIBS});
  A.page.on('dialog', d => d.accept());
  await A.page.goto(base);
  /* tools open the print window; in a test, count the calls instead */
  const prints = f => f.evaluate(() => window.__prints || 0);
  const stubPrint = f => f.evaluate(() => { window.__prints = 0; window.print = () => { window.__prints++; }; });
  let n = 0;

  step('Call Sheet: "Save as PDF" still opens the print window AND files a print-ready page');
  await H.open(A, 'callsheet'); let f = await H.frame(A, 'callsheet'); await stubPrint(f);
  assert.equal(await f.isHidden('#docBtn'), false, 'the Save to Documentation button shows inside the hub');
  await f.click('button:has-text("Save as PDF")');
  await count(A, ++n, 'call sheet PDF');
  assert.equal(await prints(f), 1);
  await until(async () => /Saved to Documentation/.test(await H.toast(A)), 'the "Saved to Documentation" message');

  step('"Save to Documentation" files a second draft without opening the print window');
  await docBtn(f, '#docBtn', 'Call Sheet PDF');
  await count(A, ++n, 'call sheet draft 2');
  assert.equal(await prints(f), 1, 'no print window for Save to Documentation');
  assert.equal(of(await docs(A), 'callsheet'), 'Call Sheet PDF #1, Call Sheet PDF #2');
 
  await f.click('button:has-text("Save as PDF")'); await count(A, ++n, 'call sheet draft 3');
  assert.equal(await prints(f), 2, 'a normal export afterwards prints again');
  let d = await docs(A); assert.ok(d.every(x => x.page && x.ext === 'html' && x.size > 2000), 'print-ready pages');

  if (LIBS) {
    step('Call Sheet Excel: downloads as before and is filed; Save to Documentation files it without a download');
    const dl = A.page.waitForEvent('download');
    await f.click('button:has-text("Download Excel")');
    assert.match((await dl).suggestedFilename(), /^Call_Sheet_.*\.xlsx$/);
    await count(A, ++n, 'call sheet Excel');
    let got = false; const on = () => { got = true; }; A.page.on('download', on);
    await docBtn(f, '#docBtn', 'Call Sheet Excel'); await count(A, ++n, 'call sheet Excel draft 2');
    await sleep(600); A.page.off('download', on); assert.equal(got, false, 'no download for Save to Documentation');
    assert.match(of(await docs(A), 'callsheet'), /^Call Sheet Excel #1, Call Sheet Excel #2/);
  }

  step('Risk Assessment, Schedule, Recce, Coverage and Task Board each file into their own folder');
  for (const [tool, sel, label, type] of [['risk', '#docBtn', 'Risk Assessment PDF', 'Risk Assessment PDF'], ['schedule', '#docBtn', 'Schedule PDF', 'Schedule PDF'],
    ['recce', '#docBtn', 'Field Sheet PDF', 'Recce Field Sheet PDF'], ['coverage', '#docBtn', 'Feedback PDF', 'Feedback PDF']]) {
    await H.open(A, tool); f = await H.frame(A, tool); await stubPrint(f);
    await docBtn(f, sel, label); await count(A, ++n, tool);
    assert.equal(of(await docs(A), tool), type + ' #1'); assert.equal(await prints(f), 0);
  }
  await H.open(A, 'recce'); f = await H.frame(A, 'recce');
  await docBtn(f, '#docBtn', 'Comparison spreadsheet'); await count(A, ++n, 'recce CSV');
  if (LIBS) for (const [tool, label] of [['schedule', 'Schedule Excel']]) {
    await H.open(A, tool); f = await H.frame(A, tool);
    await docBtn(f, '#docBtn', label); await count(A, ++n, label);
  }
  await H.open(A, 'tasks'); f = await H.frame(A, 'tasks'); await stubPrint(f);
  await f.click('#btnNew'); await f.fill('#fTitle', 'Book the van'); await f.press('#fTitle', 'Enter');
  await sleep(300);
  await f.click('#btnDoc'); await count(A, ++n, 'task list');
  assert.equal(of(await docs(A), 'tasks'), 'Task List PDF #1');

  step('Script Development: script PDF, Develop and Outline (filed separately), Fountain and Final Draft');
  await H.open(A, 'script-dev'); f = await H.frame(A, 'script-dev'); await stubPrint(f);
  const more = async item => { await f.click('button[title=More]'); await f.click(`text="${item}"`); };
  await more('Save to Documentation…'); await f.click('.modal button:has-text("Script PDF")');
  await count(A, ++n, 'script PDF');
 
  await more('Export Develop & Outline as PDF…'); await f.click('.modal button:has-text("Print / save as PDF")');
  n += 2; await count(A, n, 'develop + outline');
  await until(async () => await prints(f) === 1, 'the normal export still prints');
  await more('Save to Documentation…'); await f.click('.modal button:has-text("Script as Fountain")'); await count(A, ++n, 'fountain');
 
  await more('Save to Documentation…'); await f.click('.modal button:has-text("Script for Final Draft")'); await count(A, ++n, 'fdx');
  assert.equal(of(await docs(A), 'script-dev'), 'Develop PDF #1, Outline PDF #1, Script (Final Draft) #1, Script (Fountain) #1, Script PDF #1');

  step('Shot List: PDF and CSV; Casting: breakdowns, contact sheet and CSV from its menu');
  await H.open(A, 'shotlist'); f = await H.frame(A, 'shotlist'); await stubPrint(f);
  await docBtn(f, '#btnDoc', 'Shot List PDF'); await count(A, ++n, 'shot list PDF');
 
  await docBtn(f, '#btnDoc', 'Shot List CSV'); await count(A, ++n, 'shot list CSV');
  assert.equal(await prints(f), 0);
  await H.open(A, 'casting'); f = await H.frame(A, 'casting'); await stubPrint(f);
  await f.click('[data-act=menu]'); await f.click('[data-act=example]');
  await sleep(600); if (await f.$('dialog[open] button[value=ok], dialog[open] .primary')) await f.click('dialog[open] button[value=ok], dialog[open] .primary');
  await until(() => f.evaluate(() => S.roles.length > 0), 'casting example loaded');
  for (const a of ['docBreakdowns', 'docSheet', 'docCsv']) { await f.click('[data-act=menu]'); await f.click(`[data-act=${a}]`); await count(A, ++n, a); }
  assert.equal(of(await docs(A), 'casting'), 'Auditionees CSV #1, Casting Breakdowns PDF #1, Contact Sheet PDF #1');
  assert.equal(await prints(f), 0);

  step('Blocking Planner: the JPG is filed' + (LIBS ? '; Lighting Plan: PDF, PNG and kit list' : ''));
  await H.open(A, 'blocking'); f = await H.frame(A, 'blocking');
  await f.click('#btnDoc'); await count(A, ++n, 'blocking JPG');
  assert.equal(of(await docs(A), 'blocking'), 'Blocking Plan JPG #1');
  if (LIBS) {
    await H.open(A, 'lighting'); f = await H.frame(A, 'lighting');
    await until(() => f.evaluate(() => !!document.querySelector('#bExport') && !!window.jspdf), 'lighting ready');
    for (const fmt of ['pdf', 'png', 'csv']) {
      await f.click('#bExport'); await f.click(`input[name=fmt][value=${fmt}], [data-fmt=${fmt}]`); await f.click('#exDoc');
      await count(A, ++n, 'lighting ' + fmt); await sleep(500);
    }
    assert.equal(of(await docs(A), 'lighting'), 'Kit List CSV #1, Lighting Plan PDF #1, Lighting Plan PNG #1');
  }
  assert.deepEqual(A.page.errors, [], 'no page errors');
  console.log('  ' + n + ' documents filed');
  await browser.close(); srv.close();
  console.log('test1 passed');
})().catch(e => { console.error(e); process.exit(1); });
