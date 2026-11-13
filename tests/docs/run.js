/* Documentation tests. Needs Playwright with Chromium. Run from the site folder:  node tests/docs/run.js
   Set FTH_TEST_LIBS to a folder holding local copies of the PDF/Excel libraries to include those steps (see test1.js). */
const { spawnSync } = require('child_process'), path = require('path');
let failed = 0;
for (const file of ['test1.js', 'test2.js', 'test3.js']) {
  const r = spawnSync(process.execPath, [path.join(__dirname, file)], { stdio: 'inherit' });
  if (r.status !== 0) failed++;
}
console.log(failed ? `\n${failed} test file(s) FAILED` : '\nAll Documentation tests passed');
process.exit(failed ? 1 : 0);
