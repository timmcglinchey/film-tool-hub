const assert = require('assert');
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, what, ms = 15000) { const t = Date.now(); let last; while (Date.now() - t < ms) { try { last = await fn(); if (last) return last; } catch (e) { last = e.message; } await sleep(150); } throw new Error('timed out waiting for: ' + what + ' (last: ' + JSON.stringify(last) + ')'); }
const H = {
  async signIn(u) { await u.page.click('#acctBtn'); await u.page.click('#dlg button[value=ok]'); await until(() => u.page.evaluate(() => /saving to Google Drive/.test(document.querySelector('#acctBtn').title)), 'signed in ' + u.email); },
  async open(u, tool) { await u.page.evaluate(t => { location.hash = '#/tool/' + t; }, tool); await until(async () => { const f = await H.frame(u, tool); return f && await f.evaluate(() => document.readyState === 'complete' && !!window.fthStore); }, 'tool loaded ' + tool); },
  async frame(u, tool) { const h = await u.page.$(`#workspace iframe[data-tool="${tool}"]`); return h && h.contentFrame(); },
  async set(u, tool, k, v) { const f = await H.frame(u, tool); return f.evaluate(([k, v]) => { localStorage.setItem(k, v); return localStorage.getItem(k); }, [k, v]); },
  async get(u, tool, k) { const f = await H.frame(u, tool); return f.evaluate(k => localStorage.getItem(k), k); },
  async kvSet(u, tool, k, v) { const f = await H.frame(u, tool); return f.evaluate(([k, v]) => window.fthStore.set(k, v), [k, v]); },
  async kvGet(u, tool, k) { const f = await H.frame(u, tool); return f.evaluate(k => window.fthStore.get(k), k); },
  bar: u => u.page.evaluate(() => { const b = document.querySelector('#lockBar'); return b.hidden ? '' : b.textContent.trim(); }),
  toast: u => u.page.evaluate(() => document.querySelector('#toast').textContent),
  async save(u) { await u.page.evaluate(() => { document.querySelector('#toast').textContent = ''; }); await u.page.click('#saveBtn'); await until(async () => /Saved “|up to date/.test(await H.toast(u)), 'save toast ' + u.email); },
  editing: (u, tool) => until(async () => /You’re editing/.test(await H.bar(u)), u.email + ' editing ' + tool),
  act: async (u, tool) => { const f = await H.frame(u, tool); await f.evaluate(() => document.body.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}))); },
};
module.exports = { assert, sleep, until, H };
