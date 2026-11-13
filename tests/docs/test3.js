/* Documentation with Google Drive (the pretend one in ../sharing/mock.js):
   • signed in: each document becomes a real file in Film Tool Hub → Documentation → <project> → <tool>,
     and a second computer lists and opens them;
   • shared project: the crew see each other's documents without doing anything extra. */
const { chromium } = require('playwright');
const { D, serve, person } = require('../sharing/mock');
const { assert, until, H, sleep } = require('../sharing/lib');
const step = s => console.log('• ' + s);
const go = (u, h) => u.page.evaluate(h => { location.hash = h; }, h);
const rows = u => u.page.$$eval('#docsPage .drow:not(.dcols)', els => els.map(r => [r.querySelector('.dname b').textContent, r.querySelector('.dtype').textContent, r.querySelector('.ddraft').textContent.replace('Latest', ' Latest')].join(' | ')));
const sum = u => u.page.$eval('#docsPage .dsum', e => e.querySelector('b').textContent + ' ' + e.querySelector('span').textContent);
const fileOf = f => { const out = []; let x = f; while (x) { out.unshift(x.name); x = D.files.get((x.parents || [])[0]); } return out.join(' / '); };
const driveDocs = () => [...D.files.values()].filter(f => f.appProperties.fth === 'doc' && !f.trashed).map(fileOf).sort();
async function saveDoc(u, tool, sel, label) {
  await H.open(u, tool); const f = await H.frame(u, tool); await f.evaluate(() => { window.print = () => {}; });
  await f.click(sel); if (label) await f.click(`[data-fth-docmenu] button:has-text("${label}")`);
}
(async () => {
  const srv = await serve(), base = `http://localhost:${srv.address().port}/`;
  const browser = await chromium.launch();
  const A = await person(browser, base, 'alice@example.com', 'Alice Adams'), A2 = await person(browser, base, 'alice@example.com', 'Alice Adams');
  const B = await person(browser, base, 'bob@example.com', 'Bob Brown');
  await A.page.goto(base); await H.signIn(A);

  step('Signed in: a saved document is uploaded as a real file, in a folder for its tool');
  await saveDoc(A, 'recce', '#docBtn', 'Comparison spreadsheet');
  await until(() => driveDocs().length === 1, 'the CSV on Drive');
  assert.match(driveDocs()[0], /^Film Tool Hub \/ Documentation \/ My first project \/ Location Recce \/ Location_Recces \(Draft 1\)\.csv$/);
  const csv = [...D.files.values()].find(f => f.appProperties.fth === 'doc');
  assert.equal(csv.mimeType, 'text/csv'); assert.match(csv.revs[0].content.toString(), /Setting/, 'the file itself, not a wrapper');
  await saveDoc(A, 'callsheet', '#docBtn', 'Call Sheet PDF');
  await until(() => driveDocs().length === 2, 'the print-ready page on Drive');
  assert.ok(driveDocs().some(n => /\/ Call Sheet Builder \/ Call Sheet .*\(Draft 1\)\.html$/.test(n)));

  step('Rename and delete follow through to Drive');
  await go(A, '#/docs/recce'); await until(async () => (await rows(A)).length === 1, 'row');
  await A.page.click('.drow:not(.dcols) [data-da=rename]'); await A.page.fill('#f-dname', 'Locations compared'); await A.page.click('#dlg button[value=ok]');
  await until(() => driveDocs().some(n => /Locations compared \(Draft 1\)\.csv$/.test(n)), 'renamed on Drive');
  await H.save(A);

  step('On a second computer the documents are listed and open (fetched from Drive)');
  await A2.page.goto(base); await H.signIn(A2);
  await until(async () => /My first project/.test(await A2.page.$eval('#projName', e => e.textContent)), 'project on device 2');
  await go(A2, '#/docs');
  await until(async () => await sum(A2) === '2 of 16 tools have documents', 'both folders filled on device 2');
  await go(A2, '#/docs/recce'); await until(async () => (await rows(A2)).length === 1, 'row on device 2');
  assert.match((await rows(A2))[0], /^Locations compared \| Recce CSV \| Draft 1 Latest$/);
  await A2.page.click('.drow:not(.dcols) [data-da=open]');
  await until(() => A2.page.evaluate(() => !!document.querySelector('#dvBody table th')), 'opened on device 2');
  await A2.page.click('#dvClose');
  step('A document saved on the second computer gets the next draft number and reaches the first');
  await saveDoc(A2, 'recce', '#docBtn', 'Comparison spreadsheet');
  await until(() => driveDocs().length === 3, 'draft 2 on Drive');
  assert.ok(driveDocs().some(n => /\(Draft 2\)\.csv$/.test(n)));
  await go(A, '#/'); await go(A, '#/docs/recce');
  await until(async () => /Draft 2 Latest$/.test((await rows(A))[0] || ''), 'draft 2 appears on the first computer');
  await A.page.click('.drow:not(.dcols) [data-da=delete]'); await A.page.click('#dlg button[value=ok]');
  await until(() => driveDocs().length === 2, 'the deleted document went to the Drive bin');
  await A2.ctx.close();

  step('Alice shares the project: Bob sees her documents with no extra step, and can open them');
  await A.page.click('#shareBtn'); await A.page.waitForSelector('#f-emails');
  await A.page.fill('#f-emails', 'bob@example.com'); await A.page.click('[data-sa=add]');
  await until(async () => /Shared with 1 person/.test(await H.toast(A)), 'shared');
  const link = await A.page.inputValue('#f-link'); await A.page.click('#dlg button[value=cancel]');
  const pf = [...D.files.values()].find(f => f.appProperties.fth === 'project');
  await until(() => Object.keys(JSON.parse(pf.revs.at(-1).content).snap.docFiles || {}).length === 2, 'the shared file now carries the documents');
  await B.page.goto(link); await B.page.waitForSelector('#dlg[open]'); await B.page.click('#dlg button[value=ok]');
  await until(async () => /Shared by Alice Adams/.test(await B.page.textContent('#projStrip')), 'Bob has the project');
  assert.equal(D.log.filter(l => l[0] === 'pick' && l[1] === 'bob@example.com').length, 1, 'Bob chose one file once: the project');
  await go(B, '#/docs');
  await until(async () => await sum(B) === '2 of 16 tools have documents', 'Bob sees both folders');
  await go(B, '#/docs/callsheet'); await until(async () => (await rows(B)).length === 1, 'Bob sees the call sheet');
  await B.page.click('.drow:not(.dcols) [data-da=open]');
  await until(async () => { const h = await B.page.$('#dvBody iframe'); const fr = h && await h.contentFrame(); return fr && fr.evaluate(() => /CALL TIME/i.test(document.body.innerText)); }, 'Bob opens Alice’s call sheet');
  await B.page.click('#dvClose');

  step('Bob saves a document: it reaches Alice by itself, and lands in her Drive folder too');
  await saveDoc(B, 'risk', '#docBtn', 'Risk Assessment PDF');
  await go(A, '#/docs');
  await until(async () => await sum(A) === '3 of 16 tools have documents', 'Alice sees Bob’s document', 30000);
  await go(A, '#/docs/risk'); await until(async () => (await rows(A)).length === 1, 'row');
  assert.match(await A.page.$eval('.drow:not(.dcols) .dname small', e => e.textContent), /saved by Bob/);
  await until(() => driveDocs().some(n => /\/ Risk Assessment Builder \//.test(n)), 'Bob’s document is in Alice’s Drive folder');
  assert.equal([...D.files.values()].filter(f => f.appProperties.fth === 'doc' && f.owner === 'bob@example.com').length, 0, 'nothing is scattered into Bob’s own Drive');

  step('Alice deletes it: it disappears for Bob as well');
  await A.page.click('.drow:not(.dcols) [data-da=delete]'); await A.page.click('#dlg button[value=ok]');
  await go(B, '#/docs');
  await until(async () => await sum(B) === '2 of 16 tools have documents', 'gone for Bob', 30000);
  await until(() => !Object.keys(JSON.parse(pf.revs.at(-1).content).snap.docFiles).some(k => JSON.parse(pf.revs.at(-1).content).snap.docs.find(d => d.id === k).tool === 'risk'), 'its file left the shared project file');
  assert.deepEqual(A.page.errors, [], 'no page errors (Alice)'); assert.deepEqual(B.page.errors, [], 'no page errors (Bob)');
  await browser.close(); srv.close();
  console.log('test3 passed');
})().catch(e => { console.error(e); process.exit(1); });
