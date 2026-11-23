/* Projects: archiving, restoring and deleting from "Manage projects", plus the confirm boxes that open
   straight after another box closes (they used to give up on their own, so "Delete for good" did nothing).
   Needs Playwright with Chromium. Run from the site folder:  node tests/projects/test1.js */
const { chromium } = require('playwright');
const { serve, person } = require('../sharing/mock');
const { assert, until, H } = require('../sharing/lib');
const step = s => console.log('• ' + s);
/* what's in the "Projects" box: [name, archived?] for each row */
const rows = u => u.page.evaluate(() => {
  let arch = false; const out = [];
  document.querySelectorAll('#dlg .psec, #dlg .prow').forEach(el => {
    if (el.classList.contains('psec')) { arch = /Archived/.test(el.textContent); return; }
    const b = el.querySelector('.pi b'); if (b) out.push([b.textContent.trim(), arch]);
  });
  return out;
});
const stored = u => u.page.evaluate(async () => {
  const db = await new Promise(r => { const q = indexedDB.open('film-tool-hub'); q.onsuccess = () => r(q.result); });
  const all = await new Promise(r => { const q = db.transaction('projects').objectStore('projects').getAll(); q.onsuccess = () => r(q.result); }); db.close();
  return all.map(p => p.name).sort();
});
const openManage = async u => { await u.page.evaluate(() => document.querySelector('[data-pact="manage"]').click()); await until(() => u.page.isVisible('#dlg h3:has-text("Projects")'), 'Projects box'); };
const rowBtn = (u, name, pa) => u.page.click(`#dlg .prow:has(.pi b:text-is("${name}")) [data-pa="${pa}"]`);
const confirmBox = async (u, title, button) => {
  await until(() => u.page.isVisible(`#dlg h3:has-text("${title}")`), title + ' box');
  await u.page.waitForTimeout(300);   /* long enough for a stray close from the box before to arrive */
  assert.ok(await u.page.isVisible(`#dlg h3:has-text("${title}")`), `"${title}" stays open until answered`);
  await u.page.click(`#dlg button:has-text("${button}")`);
};
(async () => {
  const srv = await serve(), base = `http://localhost:${srv.address().port}/`;
  const browser = await chromium.launch();
  const A = await person(browser, base, 'alice@example.com', 'Alice Adams');
  await A.page.goto(base);
  await until(() => A.page.evaluate(() => !!window.__fthHub.project), 'hub ready');

  step('make two projects');
  for (const name of ['Short Film', 'Old Advert']) {
    await openManage(A); await A.page.click('#dlg [data-pa="new"]');
    await A.page.fill('#dlg input[name="name"]', name); await A.page.click('#dlg button[value="ok"]');
    await until(async () => /Project: /.test(await H.toast(A)), 'switched to ' + name);
  }
  await openManage(A);
  assert.ok((await rows(A)).some(r => r[0] === 'Old Advert' && !r[1]));

  step('archive one: it moves to Archived');
  await rowBtn(A, 'Old Advert', 'archive');
  await until(async () => (await rows(A)).some(r => r[0] === 'Old Advert' && r[1]), 'Old Advert under Archived');

  step('Cancel on "Delete project?" keeps it');
  await rowBtn(A, 'Old Advert', 'delete'); await confirmBox(A, 'Delete project?', 'Cancel');
  assert.ok((await stored(A)).includes('Old Advert'));

  step('"Delete for good" removes it from the list and from the browser');
  await openManage(A); await rowBtn(A, 'Old Advert', 'delete'); await confirmBox(A, 'Delete project?', 'Delete for good');
  await until(async () => /Project deleted/.test(await H.toast(A)), '"Project deleted" message');
  assert.ok(!(await stored(A)).includes('Old Advert'), 'gone from storage');
  await openManage(A);
  assert.ok(!(await rows(A)).some(r => r[0] === 'Old Advert'), 'gone from the Projects box');
  assert.ok((await rows(A)).some(r => r[0] === 'Short Film'), 'the other project is untouched');

  assert.deepEqual(A.page.errors, []);
  await browser.close(); srv.close();
  console.log('Projects tests passed');
})().catch(e => { console.error(e); process.exit(1); });
