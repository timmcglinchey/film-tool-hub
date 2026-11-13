/* Shared-project tests: two pretend people against a pretend Google Drive (mock.js).
   Needs Playwright with Chromium. Run from the site folder:  node tests/sharing/run.js */
const { spawnSync } = require('child_process'), path = require('path');
let failed = 0;
for (const [file, ...args] of [['test1.js'], ['test2.js'], ['test2.js', 'bump'], ['test3.js'], ['test4.js']]) {
  const r = spawnSync(process.execPath, [path.join(__dirname, file), ...args], { stdio: 'inherit' });
  if (r.status !== 0) failed++;
}
console.log(failed ? `\n${failed} test file(s) FAILED` : '\nAll shared-project tests passed');
process.exit(failed ? 1 : 0);
