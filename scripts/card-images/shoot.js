/* Takes the screenshots the card pictures are made from (see make.py).
   Run a local web server from the site's folder first (python3 -m http.server 8000), then:
     node scripts/card-images/shoot.js                 every tool
     node scripts/card-images/shoot.js dof palette     just these
   Some tools get example content first (a sample script, sample stills, their own "Load example"),
   so the card shows the tool in use rather than empty. */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const BASE = process.env.FTH_URL || 'http://localhost:8000';
const SAMPLES = path.join(__dirname, 'samples');
const OUT = path.join(__dirname, 'shots');
const S = f => path.join(SAMPLES, f);

const IDS = ['storydev','script-dev','coverage','moodboard','palette','preprod','breakdown','script-lining','budget','casting','release','recce',
  'loc-agree','shotlist','blocking','lighting','falsecolour','schedule','risk','callsheet','production','script-log','camera-report',
  'postprod','pattern-lab','ratio-lab','exposure','dof','colour-temp','mic-placement','spectrum'];

const STEPS = {
  casting: p => p.click('[data-act="example"]'),
  schedule: p => p.click('text=Load example'),
  lighting: p => p.click('text=Sample interview'),
  palette: p => p.setInputFiles('#fileImg', S('still2.jpg')),
  falsecolour: p => p.setInputFiles('#fileImg', S('still1.jpg')),
  moodboard: p => p.setInputFiles('#vFile', ['still1.jpg', 'still2.jpg', 'still3.jpg', 'still4.jpg'].map(S)),
  breakdown: p => p.setInputFiles('#fileIn', S('script.pdf')),
  'script-lining': p => p.setInputFiles('#fileInput', S('script.pdf')),
  coverage: p => p.setInputFiles('#fileIn', S('script.pdf')),
  blocking: async p => {
    const drop = async (label, x, y) => {
      const b = await (await p.$('text=' + label)).boundingBox();
      await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await p.mouse.down();
      await p.mouse.move(x - 50, y - 20, { steps: 6 }); await p.mouse.move(x, y, { steps: 6 }); await p.mouse.up();
      await p.waitForTimeout(250);
    };
    for (const [l, x, y] of [['Table', 820, 430], ['Chair', 760, 400], ['Chair', 880, 460], ['Sofa', 1050, 260], ['Lead Actor', 760, 380],
      ['Supporting', 900, 470], ['A-Camera', 640, 620], ['B-Camera', 1120, 560], ['Dolly Track', 600, 250]]) await drop(l, x, y);
    await p.click('text=Select'); await p.mouse.click(1300, 800);
  },
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const ids = process.argv.slice(2).length ? process.argv.slice(2) : IDS;
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  for (const id of ids) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
    if (process.env.PDFJS_DIR) await ctx.route('**/pdf.js/3.11.174/*', r =>
      r.fulfill({ path: path.join(process.env.PDFJS_DIR, r.request().url().split('/').pop()), contentType: 'application/javascript' }));
    const p = await ctx.newPage();
    p.on('dialog', d => d.accept());
    await p.goto(`${BASE}/tools/${id}.html`, { waitUntil: 'networkidle' }).catch(() => {});
    await p.waitForTimeout(1500);
    if (STEPS[id]) { try { await STEPS[id](p); } catch (e) { console.log(id, 'example step failed:', e.message.split('\n')[0]); } }
    await p.waitForTimeout(3500);
    await p.screenshot({ path: path.join(OUT, id + '.png') });
    console.log('shot', id);
    await ctx.close();
  }
  await browser.close();
})();
